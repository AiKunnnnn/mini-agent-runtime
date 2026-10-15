import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAndSave } from "../src/demo/conversation-workflow.ts";
import { validateConversation } from "../src/messages/validate-conversation.ts";
import { toModelMessage } from "../src/messages/to-model-message.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { MemorySessionStore } from "../src/session/memory-session-store.ts";
import { SQLiteSessionStore } from "../src/session/sqlite-session-store.ts";
import { SessionConflictError, type SessionStore } from "../src/session/session-store.ts";
import type { BeforeToolCallHook } from "../src/tools/before-tool-call.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import type { ToolResult } from "../src/tools/tool.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";
import { calling, finalResponse } from "./support/conversation-fixtures.ts";

function registry(execute: () => number): ToolRegistry {
  const tools = new ToolRegistry();
  tools.register({
    definition: { name: "work", description: "Simulated work", parameters: { type: "object" } },
    execute,
  });
  return tools;
}

test("H-T28: maxTurns pairs skipped calls without invoking authorization", async () => {
  let hooks = 0;
  let executions = 0;
  const runtime = new AgentRuntime(new MockModelProvider([calling()]), {
    registry: registry(() => ++executions),
    maxTurns: 1,
    beforeToolCall: () => { hooks++; return { type: "allow" }; },
  });
  assert.deepEqual(await runtime.run("work"), { type: "limit_reached", maxTurns: 1 });
  assert.equal(hooks, 0);
  assert.equal(executions, 0);
  const history = runtime.getMessages();
  validateConversation(history);
  const message = history.at(-1);
  assert.ok(message?.type === "tool_result");
  assert.equal(message.toolCallId, "A");
  assert.deepEqual(JSON.parse(message.content), {
    success: false,
    error: {
      code: "TOOL_EXECUTION_SKIPPED",
      message: "Tool execution was skipped because maxTurns was reached.",
    },
  });
});

test("H-T29/H-T30: allow, deny and hook error pair before the next model answer", async () => {
  const calls = ["A", "B", "C"].map((id) => ({ id, name: "work", arguments: {} }));
  const hooks: string[] = [];
  let executions = 0;
  const provider = new MockModelProvider([
    { message: { role: "assistant", toolCalls: calls }, finishReason: "tool_calls" },
    finalResponse,
  ]);
  const runtime = new AgentRuntime(provider, {
    registry: registry(() => ++executions),
    beforeToolCall: ({ toolCall }) => {
      hooks.push(toolCall.id);
      if (toolCall.id === "A") return { type: "allow" };
      if (toolCall.id === "B") return { type: "deny" };
      return Promise.reject(new Error("private authorization details"));
    },
  });
  assert.deepEqual(await runtime.run("work"), { type: "completed" });
  assert.deepEqual(hooks, ["A", "B", "C"]);
  assert.equal(executions, 1);
  const history = runtime.getMessages();
  validateConversation(history);
  const messages = history.filter((message) => message.type === "tool_result");
  assert.deepEqual(messages.map((message) => message.toolCallId), ["A", "B", "C"]);
  const expected: ToolResult[] = [
    { success: true, result: 1 },
    { success: false, error: { code: "TOOL_EXECUTION_DENIED", message: "Tool execution was denied." } },
    { success: false, error: { code: "TOOL_PRE_EXECUTION_FAILED", message: "Pre-execution authorization failed." } },
  ];
  assert.deepEqual(messages.map((message) => JSON.parse(message.content)), expected);
  assert.deepEqual(provider.requests[1]?.messages, history.slice(0, -1).map(toModelMessage));
  assert.deepEqual(history.at(-1), { type: "model_output", content: "Done" });
  assert.equal(provider.requests.length, 2);
});

function storeFixture(kind: "memory" | "sqlite"): {
  store: SessionStore;
  reopen: () => SessionStore;
  cleanup: () => void;
} {
  if (kind === "memory") {
    const store = new MemorySessionStore();
    return { store, reopen: () => store, cleanup() {} };
  }
  const directory = mkdtempSync(join(tmpdir(), "approval-session-"));
  const filename = join(directory, "sessions.sqlite");
  let store = new SQLiteSessionStore(filename);
  return {
    store,
    reopen() {
      store.close();
      store = new SQLiteSessionStore(filename);
      return store;
    },
    cleanup() {
      store.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

for (const kind of ["memory", "sqlite"] as const) {
  test(`${kind} saves approval-aborted pairing and recovers without the pending hook`, async () => {
    const fixture = storeFixture(kind);
    try {
      let entered!: () => void;
      const hookEntered = new Promise<void>((resolve) => { entered = resolve; });
      const controller = new AbortController();
      const runtime = new AgentRuntime(new MockModelProvider([calling()]), {
        registry: registry(() => assert.fail("cancelled tool executed")),
        beforeToolCall: () => {
          entered();
          return new Promise(() => {});
        },
      });
      const pending = runAndSave(runtime, fixture.store, "s", 0, "work", { signal: controller.signal });
      await hookEntered;
      controller.abort();
      const result = await pending;
      assert.deepEqual(result.run, { status: "fulfilled", value: { type: "aborted" } });
      assert.equal(result.persistence.status, "fulfilled");
      assert.equal(result.reusable, true);
      const store = fixture.reopen();
      const saved = await store.load("s");
      assert.ok(saved);
      validateConversation(saved.messages);
      assert.deepEqual(saved.messages, runtime.getMessages());
      const message = saved.messages.at(-1);
      assert.ok(message?.type === "tool_result");
      assert.equal(JSON.parse(message.content).error.code, "TOOL_CALL_CANCELLED");
      const recovered = new AgentRuntime(new MockModelProvider([finalResponse]), {
        initialMessages: saved.messages,
        beforeToolCall: () => assert.fail("pending approval restored"),
      });
      assert.deepEqual(await recovered.run("next"), { type: "completed" });
    } finally {
      fixture.cleanup();
    }
  });

  for (const mode of ["deny", "error"] as const) {
    const beforeToolCall: BeforeToolCallHook = () => {
      if (mode === "error") throw new Error("secret service failure");
      return { type: "deny" };
    };
    test(`H-T31/H-T32: ${kind} saves and recovers ${mode} without replaying approval`, async () => {
      const fixture = storeFixture(kind);
      try {
        let executions = 0;
        let hooks = 0;
        const tools = registry(() => ++executions);
        const runtime = new AgentRuntime(new MockModelProvider([calling(), finalResponse]), {
          registry: tools,
          beforeToolCall: (context) => { hooks++; return beforeToolCall(context); },
        });
        const result = await runAndSave(runtime, fixture.store, "s", 0, "work");
        assert.deepEqual(result.run, { status: "fulfilled", value: { type: "completed" } });
        assert.equal(result.persistence.status, "fulfilled");
        assert.equal(result.reusable, true);
        assert.equal(hooks, 1);
        assert.equal(executions, 0);
        const store = fixture.reopen();
        const saved = await store.load("s");
        assert.ok(saved);
        assert.equal(saved.revision, 1);
        assert.deepEqual(saved.messages, runtime.getMessages());
        validateConversation(saved.messages);
        const toolMessage = saved.messages.find((message) => message.type === "tool_result");
        assert.ok(toolMessage);
        assert.equal(JSON.parse(toolMessage.content).error.code,
          mode === "deny" ? "TOOL_EXECUTION_DENIED" : "TOOL_PRE_EXECUTION_FAILED");
        const expected = structuredClone(saved.messages);
        const provider = new MockModelProvider([finalResponse]);
        const recovered = new AgentRuntime(provider, {
          initialMessages: saved.messages,
          registry: tools,
          beforeToolCall: () => assert.fail("historical approval replayed"),
        });
        assert.equal(provider.requests.length, 0);
        saved.messages.length = 0;
        assert.deepEqual(recovered.getMessages(), expected);
        const next = await runAndSave(recovered, store, "s", saved.revision, "next");
        assert.deepEqual(next.run, { status: "fulfilled", value: { type: "completed" } });
        assert.equal(next.persistence.status, "fulfilled");
        assert.equal(next.reusable, true);
        assert.equal((await store.load("s"))?.revision, 2);
        assert.deepEqual(provider.requests[0]?.messages, [
          ...expected.map(toModelMessage), { role: "user", content: "next" },
        ]);
        assert.equal(hooks, 1);
        assert.equal(executions, 0);
      } finally {
        fixture.cleanup();
      }
    });

    test(`H-T33: ${kind} CAS conflict retains ${mode} run settlement and disables reuse`, async () => {
      const fixture = storeFixture(kind);
      try {
        await fixture.store.save({ sessionId: "s", revision: 0, messages: [] });
        let hooks = 0;
        let executions = 0;
        const provider = new MockModelProvider([calling(), finalResponse]);
        const runtime = new AgentRuntime(provider, {
          registry: registry(() => ++executions),
          beforeToolCall: (context) => { hooks++; return beforeToolCall(context); },
        });
        const result = await runAndSave(runtime, fixture.store, "s", 0, "work");
        assert.deepEqual(result.run, { status: "fulfilled", value: { type: "completed" } });
        assert.equal(result.persistence.status, "rejected");
        if (result.persistence.status === "rejected") {
          assert.ok(result.persistence.reason instanceof SessionConflictError);
        }
        assert.equal(result.reusable, false);
        assert.equal(hooks, 1);
        assert.equal(executions, 0);
        assert.equal(provider.requests.length, 2);
        const history = runtime.getMessages();
        validateConversation(history);
        assert.equal(history.length, 4);
        assert.deepEqual((await fixture.store.load("s"))?.messages, []);
        assert.equal((await fixture.store.load("s"))?.revision, 1);
      } finally {
        fixture.cleanup();
      }
    });
  }
}
