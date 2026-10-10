import assert from "node:assert/strict";
import test from "node:test";
import { runAndSave } from "../src/demo/conversation-workflow.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { MemorySessionStore } from "../src/session/memory-session-store.ts";
import { SessionConflictError, type SessionStore } from "../src/session/session-store.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";
import { finalResponse, calling, paired } from "./support/conversation-fixtures.ts";

for (const runFails of [false, true]) for (const saveFails of [false, true]) {
  test(`dual settlement runFails=${runFails}, saveFails=${saveFails}`, async () => {
    const runError = new Error("provider failed"); const saveError = new Error("disk failed");
    let calls = 0; let saves = 0;
    const runtime = new AgentRuntime({ async generate() { calls++; if (runFails) throw runError; return finalResponse; } });
    const backing = new MemorySessionStore();
    const store: SessionStore = { load: (id) => backing.load(id), async save(snapshot) {
      saves++; if (saveFails) throw saveError; return backing.save(snapshot);
    } };
    const settlement = await runAndSave(runtime, store, "s", 0, "hello");
    if (runFails) { assert.equal(settlement.run.status, "rejected"); if (settlement.run.status === "rejected") assert.equal(settlement.run.reason, runError); }
    else assert.deepEqual(settlement.run, { status: "fulfilled", value: { type: "completed" } });
    if (saveFails) { assert.equal(settlement.persistence.status, "rejected"); if (settlement.persistence.status === "rejected") assert.equal(settlement.persistence.reason, saveError); }
    else { assert.equal(settlement.persistence.status, "fulfilled"); assert.deepEqual((await backing.load("s"))?.messages, runtime.getMessages()); }
    assert.equal(calls, 1); assert.equal(saves, 1); assert.equal(settlement.reusable, !saveFails);
    assert.deepEqual(runtime.getMessages(), runFails ? [{ type: "user_input", content: "hello" }] : [{ type: "user_input", content: "hello" }, { type: "model_output", content: "Done" }]);
  });
}

test("incomplete history after run rejection is neither saved nor reused", async () => {
  let calls = 0; let saves = 0;
  const registry = new ToolRegistry();
  registry.register({ definition: { name: "work", description: "bad schema", parameters: { type: "broken" } }, execute: () => assert.fail("must not execute") });
  const runtime = new AgentRuntime({ async generate() { calls++; return calling(); } }, { registry });
  const store: SessionStore = { async load() { return null; }, async save() { saves++; throw new Error("must not save"); } };
  const first = await runAndSave(runtime, store, "s", 0, "work");
  assert.equal(first.run.status, "rejected"); assert.equal(first.persistence.status, "rejected"); assert.equal(first.reusable, false);
  const facts = runtime.getMessages();
  await assert.rejects(runAndSave(runtime, store, "s", 0, "retry"), /incomplete|missing ToolResult/);
  assert.equal(calls, 1); assert.equal(saves, 0); assert.deepEqual(runtime.getMessages(), facts);
});

test("abort with complete cancelled results can be saved", async () => {
  const controller = new AbortController(); const provider = new MockModelProvider([calling()]);
  const runtime = new AgentRuntime(provider); const store = new MemorySessionStore();
  runtime.subscribe((e) => { if (e.type === "model_turn_completed") controller.abort(); });
  const settled = await runAndSave(runtime, store, "s", 0, "work", { signal: controller.signal });
  assert.deepEqual(settled.run, { status: "fulfilled", value: { type: "aborted" } });
  assert.equal(settled.persistence.status, "fulfilled");
  const saved = await store.load("s"); assert.ok(saved);
  new AgentRuntime(new MockModelProvider([]), { initialMessages: saved.messages });
  const result = saved.messages.at(-1); assert.ok(result?.type === "tool_result");
  assert.equal(JSON.parse(result.content).error.code, "TOOL_CALL_CANCELLED");
});

for (const existing of [false, true]) test(`pre-aborted run skips save (existing=${existing})`, async () => {
  const controller = new AbortController(); controller.abort(); const store = new MemorySessionStore();
  const saved = existing ? await store.save({ sessionId: "s", revision: 0, messages: paired() }) : null;
  const provider = new MockModelProvider([]); const runtime = new AgentRuntime(provider, { initialMessages: saved?.messages ?? [] });
  const settled = await runAndSave(runtime, store, "s", saved?.revision ?? 0, "ignored", { signal: controller.signal });
  assert.equal(settled.persistence.status, "skipped"); assert.equal(settled.reusable, true); assert.equal(provider.requests.length, 0);
  assert.deepEqual(await store.load("s"), saved);
});

test("CAS conflict never reruns provider or tool and retains runtime facts", async () => {
  const store = new MemorySessionStore(); await store.save({ sessionId: "s", revision: 0, messages: [] });
  const registry = new ToolRegistry(); let executions = 0;
  registry.register({ definition: { name: "work", description: "work", parameters: {} }, execute: () => ++executions });
  const provider = new MockModelProvider([calling(), finalResponse]); const runtime = new AgentRuntime(provider, { registry });
  const settled = await runAndSave(runtime, store, "s", 0, "work");
  assert.deepEqual(settled.run, { status: "fulfilled", value: { type: "completed" } });
  assert.equal(settled.persistence.status, "rejected"); if (settled.persistence.status === "rejected") assert.ok(settled.persistence.reason instanceof SessionConflictError);
  assert.equal(settled.reusable, false);
  assert.equal(executions, 1); assert.equal(provider.requests.length, 2); assert.equal(runtime.getMessages().length, 4);
  assert.deepEqual((await store.load("s"))?.messages, []);
});

test("application awaits save settlement before starting the next run", async () => {
  const backing = new MemorySessionStore(); const provider = new MockModelProvider([finalResponse, finalResponse]);
  const runtime = new AgentRuntime(provider); let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  const store: SessionStore = { load: (id) => backing.load(id), async save(snapshot) { await blocked; return backing.save(snapshot); } };
  const first = runAndSave(runtime, store, "s", 0, "first");
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(provider.requests.length, 1); assert.equal(await backing.load("s"), null);
  release(); const a = await first; assert.equal(a.persistence.status, "fulfilled");
  if (a.persistence.status !== "fulfilled") assert.fail("first save failed");
  const b = await runAndSave(runtime, store, "s", a.persistence.value.revision, "second");
  assert.equal(b.persistence.status, "fulfilled"); assert.equal((await backing.load("s"))?.revision, 2);
  assert.equal(provider.requests.length, 2);
});

for (const finishReason of ["length", "unknown", "tool_calls"] as const) test(`settled ${finishReason} output is saveable when paired`, async () => {
  const provider = new MockModelProvider([finishReason === "tool_calls" ? calling() : { ...finalResponse, finishReason }]);
  const runtime = new AgentRuntime(provider, { maxTurns: 1 }); const store = new MemorySessionStore();
  const result = await runAndSave(runtime, store, "s", 0, "work");
  assert.equal(result.persistence.status, "fulfilled"); assert.deepEqual((await store.load("s"))?.messages, runtime.getMessages());
});

test("completed outcome is preserved even when its unpaired history cannot be saved", async () => {
  const provider = new MockModelProvider([{ ...calling(), finishReason: "stop" }]);
  const runtime = new AgentRuntime(provider); const store = new MemorySessionStore();
  const settled = await runAndSave(runtime, store, "s", 0, "work");
  assert.deepEqual(settled.run, { status: "fulfilled", value: { type: "completed" } });
  assert.equal(settled.persistence.status, "rejected"); assert.equal(settled.reusable, false);
  assert.equal(await store.load("s"), null);
  await assert.rejects(runAndSave(runtime, store, "s", 0, "next"), /missing ToolResult/);
  assert.equal(provider.requests.length, 1);
});
