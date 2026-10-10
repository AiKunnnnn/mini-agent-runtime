import assert from "node:assert/strict";
import test from "node:test";
import type { ModelResponse } from "../src/model/model.ts";
import type { RuntimeMessage } from "../src/messages/runtime-message.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import { ModelGenerationCancelledError } from "../src/model/model-provider.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";
import { paired, calling, finalResponse } from "./support/conversation-fixtures.ts";
import { toModelMessage } from "../src/messages/to-model-message.ts";

test("constructor recovery is detached and does not call provider, tools or events", () => {
  const initialMessages = paired(); const expected = structuredClone(initialMessages);
  const provider = new MockModelProvider([]);
  const registry = new ToolRegistry();
  registry.register({ definition: { name: "work", description: "work", parameters: {} }, execute: () => assert.fail("historical tool replayed") });
  const runtime = new AgentRuntime(provider, { initialMessages, registry });
  let events = 0; runtime.subscribe(() => { events++; });
  assert.deepEqual(runtime.getMessages(), expected);
  const initialCall = initialMessages[1]; assert.ok(initialCall?.type === "model_output");
  (initialCall.toolCalls![0]!.arguments as { nested: { value: number } }).nested.value = 77;
  initialMessages.length = 0;
  const copy = runtime.getMessages(); const output = copy[1]; assert.ok(output?.type === "model_output");
  (output.toolCalls![0]!.arguments as { nested: { value: number } }).nested.value = 99;
  copy.length = 0;
  assert.deepEqual(runtime.getMessages(), expected); assert.equal(provider.requests.length, 0); assert.equal(events, 0);
});

test("next model request includes recovered history and only new tool calls execute", async () => {
  const initialMessages = paired(); const expected = structuredClone(initialMessages);
  const provider = new MockModelProvider([calling("B"), finalResponse]);
  let executions = 0; const registry = new ToolRegistry();
  registry.register({ definition: { name: "work", description: "work", parameters: { type: "object" } }, execute: () => ++executions });
  const runtime = new AgentRuntime(provider, { initialMessages, registry });
  assert.equal(executions, 0);
  assert.deepEqual(await runtime.run("next"), { type: "completed" });
  assert.equal(executions, 1);
  assert.deepEqual(provider.requests[0]?.messages, [...expected.map(toModelMessage), { role: "user", content: "next" }]);
  assert.equal(provider.requests.length, 2);
  assert.deepEqual(runtime.getMessages().slice(0, expected.length), expected);
});

test("historical tools need not be registered and are never replayed", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([finalResponse]), { initialMessages: paired() });
  assert.deepEqual(await runtime.run("next"), { type: "completed" });
});

test("invalid initialMessages fail during construction before provider work", () => {
  const provider = new MockModelProvider([]);
  for (const initialMessages of [null, {}, [{ type: "user_input", content: 1 }], paired().slice(0, 2), [...paired(), ...paired()]]) {
    assert.throws(() => new AgentRuntime(provider, { initialMessages: initialMessages as RuntimeMessage[] }));
  }
  assert.equal(provider.requests.length, 0);
  assert.deepEqual(new AgentRuntime(provider, { initialMessages: [] }).getMessages(), []);
});

test("recovered runtime preserves pre-abort and cooperative provider abort provenance", async () => {
  const controller = new AbortController(); const initialMessages = paired();
  const provider = new MockModelProvider([]);
  const pre = new AgentRuntime(provider, { initialMessages }); controller.abort();
  assert.deepEqual(await pre.run("ignored", { signal: controller.signal }), { type: "aborted" });
  assert.deepEqual(pre.getMessages(), initialMessages); assert.equal(provider.requests.length, 0);
  const active = new AbortController();
  const runtime = new AgentRuntime({ generate(_request, options) {
    assert.equal(options?.signal, active.signal);
    return new Promise((_resolve, reject) => active.signal.addEventListener("abort", () => reject(new ModelGenerationCancelledError(active.signal, { cause: active.signal.reason })), { once: true }));
  } }, { initialMessages });
  const pending = runtime.run("new", { signal: active.signal }); active.abort();
  assert.deepEqual(await pending, { type: "aborted" });
  assert.deepEqual(runtime.getMessages(), [...initialMessages, { type: "user_input", content: "new" }]);
});

test("recovered runtime preserves tool cancellation pairing", async () => {
  const controller = new AbortController();
  const runtime = new AgentRuntime(new MockModelProvider([calling("B")]), { initialMessages: paired() });
  runtime.subscribe((event) => { if (event.type === "model_turn_completed") controller.abort(); });
  assert.deepEqual(await runtime.run("next", { signal: controller.signal }), { type: "aborted" });
  const message = runtime.getMessages().at(-1); assert.ok(message?.type === "tool_result");
  assert.equal(message.toolCallId, "B"); assert.equal(JSON.parse(message.content).error.code, "TOOL_CALL_CANCELLED");
});

test("recovered runtime still owns exactly one active run", async () => {
  let resolve!: (response: ModelResponse) => void;
  let calls = 0;
  const runtime = new AgentRuntime({ generate() { calls++; return new Promise((r) => { resolve = r; }); } }, { initialMessages: paired() });
  const first = runtime.run("first"); const before = runtime.getMessages();
  await assert.rejects(runtime.run("second"), /already has an active run/);
  assert.equal(calls, 1); assert.deepEqual(runtime.getMessages(), before);
  resolve(finalResponse); assert.deepEqual(await first, { type: "completed" });
});
