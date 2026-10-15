import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import test from "node:test";
import { validateConversation } from "../src/messages/validate-conversation.ts";
import type { ModelResponse } from "../src/model/model.ts";
import type { ToolCall } from "../src/model/tool.ts";
import type { AgentEvent } from "../src/runtime/agent-event.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import type { BeforeToolCallDecision } from "../src/tools/before-tool-call.ts";
import { ToolExecutionCancelledError, ToolExecutor } from "../src/tools/tool-executor.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import type { Tool, ToolResult } from "../src/tools/tool.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";

const finalResponse: ModelResponse = {
  message: { role: "assistant", content: "Done" },
  finishReason: "stop",
};

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function call(id: string): ToolCall {
  return { id, name: "work", arguments: { value: id } };
}

function toolResponse(...ids: string[]): ModelResponse {
  return {
    message: { role: "assistant", toolCalls: ids.map(call) },
    finishReason: "tool_calls",
  };
}

function workTool(execute: Tool<{ value: string }>["execute"]): Tool<{ value: string }> {
  return {
    definition: {
      name: "work",
      description: "Perform simulated work",
      parameters: {
        type: "object",
        properties: { value: { type: "string" } },
        required: ["value"],
        additionalProperties: false,
      },
    },
    execute,
  };
}

function registryWithExecutions(executions: string[]): ToolRegistry {
  const registry = new ToolRegistry();
  registry.register(workTool(({ value }) => {
    executions.push(value);
    return value;
  }));
  return registry;
}

function results(runtime: AgentRuntime): { id: string; result: ToolResult }[] {
  const messages = runtime.getMessages();
  validateConversation(messages);
  return messages.flatMap((message) => message.type === "tool_result"
    ? [{ id: message.toolCallId, result: JSON.parse(message.content) as ToolResult }]
    : []);
}

function failure(code: "TOOL_CALL_CANCELLED" | "TOOL_PRE_EXECUTION_FAILED" | "TOOL_EXECUTION_DENIED"): ToolResult {
  const messages = {
    TOOL_CALL_CANCELLED: "Tool call did not complete because the run was cancelled.",
    TOOL_PRE_EXECUTION_FAILED: "Pre-execution authorization failed.",
    TOOL_EXECUTION_DENIED: "Tool execution was denied.",
  };
  return { success: false, error: { code, message: messages[code] } };
}

function eventTypes(events: readonly AgentEvent[]): AgentEvent["type"][] {
  return events.map((event) => event.type);
}

const cancelledEventTypes: AgentEvent["type"][] = [
  "run_started", "model_turn_started", "model_turn_completed",
  "tool_execution_started", "run_finished",
];

test("H-T16/17/24/25/27: pending approval abort releases ownership, preserves signal, and pairs without completed events", async () => {
  const entered = deferred<void>();
  const never = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  let hookCalls = 0;
  let receivedSignal: AbortSignal | undefined;
  const provider = new MockModelProvider([toolResponse("A", "B"), finalResponse]);
  const runtime = new AgentRuntime(provider, {
    registry: registryWithExecutions(executions),
    beforeToolCall: ({ signal }) => {
      hookCalls += 1;
      receivedSignal = signal;
      entered.resolve();
      return never.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  const first = runtime.run("first", { signal: controller.signal });
  await entered.promise;
  const pendingMessages = runtime.getMessages();
  const pendingEvents = structuredClone(events);
  await assert.rejects(runtime.run("concurrent"), /already has an active run/);
  assert.deepEqual(runtime.getMessages(), pendingMessages);
  assert.deepEqual(events, pendingEvents);
  assert.equal(provider.requests.length, 1);
  assert.equal(hookCalls, 1);
  assert.equal(receivedSignal, controller.signal);
  assert.deepEqual(executions, []);

  controller.abort();
  assert.deepEqual(await first, { type: "aborted" });
  assert.deepEqual(results(runtime), [
    { id: "A", result: failure("TOOL_CALL_CANCELLED") },
    { id: "B", result: failure("TOOL_CALL_CANCELLED") },
  ]);
  assert.deepEqual(eventTypes(events), cancelledEventTypes);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);

  assert.deepEqual(await runtime.run("next"), { type: "completed" });
  assert.equal(provider.requests.length, 2);
  assert.equal(hookCalls, 1);
  assert.deepEqual(executions, []);
  validateConversation(runtime.getMessages());
});

test("H-T18: synchronous hook abort followed by allow cannot start Tool.execute", async () => {
  const controller = new AbortController();
  const executions: string[] = [];
  let hookCalls = 0;
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: ({ signal }) => {
      hookCalls += 1;
      assert.equal(signal, controller.signal);
      controller.abort();
      return { type: "allow" };
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  assert.equal(hookCalls, 1);
  assert.deepEqual(executions, []);
  assert.deepEqual(results(runtime), [{ id: "A", result: failure("TOOL_CALL_CANCELLED") }]);
  assert.deepEqual(eventTypes(events), cancelledEventTypes);
});

test("accepted allow followed by abort before tool invocation still cancels the attempt", async () => {
  const entered = deferred<void>();
  const approval = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: () => {
      entered.resolve();
      return approval.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });
  const run = runtime.run("work", { signal: controller.signal });
  await entered.promise;
  // Registered after the Executor's decision handler: allow is accepted first,
  // then abort is observed before its await continuation can invoke the Tool.
  const abortAfterDecision = approval.promise.then(() => controller.abort());
  approval.resolve({ type: "allow" });
  await abortAfterDecision;

  assert.deepEqual(await run, { type: "aborted" });
  assert.deepEqual(executions, []);
  assert.deepEqual(results(runtime), [{ id: "A", result: failure("TOOL_CALL_CANCELLED") }]);
  assert.deepEqual(eventTypes(events), cancelledEventTypes);
});

test("H-T19: late allow after approval cancellation cannot execute or append another result", async () => {
  const entered = deferred<void>();
  const approval = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  let hookCalls = 0;
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: () => {
      hookCalls += 1;
      entered.resolve();
      return approval.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });
  const run = runtime.run("work", { signal: controller.signal });
  await entered.promise;
  controller.abort();
  assert.deepEqual(await run, { type: "aborted" });
  const cancelledMessages = runtime.getMessages();
  const cancelledEvents = structuredClone(events);

  approval.resolve({ type: "allow" });
  await approval.promise;
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(hookCalls, 1);
  assert.deepEqual(executions, []);
  assert.deepEqual(runtime.getMessages(), cancelledMessages);
  assert.deepEqual(events, cancelledEvents);
  assert.deepEqual(results(runtime), [{ id: "A", result: failure("TOOL_CALL_CANCELLED") }]);
});

test("H-T20/22: late hook rejection after abort is handled and cannot rewrite cancelled pairing", async () => {
  const entered = deferred<void>();
  const approval = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A", "B")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: () => {
      entered.resolve();
      return approval.promise;
    },
  });
  const events: AgentEvent[] = [];
  const unhandled: unknown[] = [];
  const observeUnhandled = (reason: unknown): void => { unhandled.push(reason); };
  runtime.subscribe((event) => { events.push(event); });
  process.on("unhandledRejection", observeUnhandled);
  try {
    const run = runtime.run("work", { signal: controller.signal });
    await entered.promise;
    controller.abort();
    assert.deepEqual(await run, { type: "aborted" });
    const cancelledMessages = runtime.getMessages();
    approval.reject(new Error("late sensitive authorization error"));
    // Cross the event-loop checkpoint at which an unhandled rejection is reported.
    await new Promise<void>((resolve) => setImmediate(resolve));

    assert.deepEqual(unhandled, []);
    assert.deepEqual(executions, []);
    assert.deepEqual(runtime.getMessages(), cancelledMessages);
    assert.deepEqual(results(runtime), [
      { id: "A", result: failure("TOOL_CALL_CANCELLED") },
      { id: "B", result: failure("TOOL_CALL_CANCELLED") },
    ]);
    assert.deepEqual(eventTypes(events), cancelledEventTypes);
  } finally {
    process.off("unhandledRejection", observeUnhandled);
  }
});

test("H-T21: accepted hook error retains ordinary failure when caller aborts before runtime receives it", async () => {
  const entered = deferred<void>();
  const approval = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  let hookCalls = 0;
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A", "B")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: () => {
      hookCalls += 1;
      entered.resolve();
      return approval.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });
  const run = runtime.run("work", { signal: controller.signal });
  await entered.promise;
  // The Executor attached its rejection handler before this observer. Its first
  // accepted settlement is failure even though this observer aborts immediately.
  const abortAfterError = approval.promise.catch(() => controller.abort());
  approval.reject(new Error("sensitive authorization error"));
  await abortAfterError;

  assert.deepEqual(await run, { type: "aborted" });
  assert.equal(hookCalls, 1);
  assert.deepEqual(executions, []);
  assert.deepEqual(results(runtime), [
    { id: "A", result: failure("TOOL_PRE_EXECUTION_FAILED") },
    { id: "B", result: failure("TOOL_CALL_CANCELLED") },
  ]);
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "tool_execution_completed", "run_finished",
  ]);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
});

test("accepted deny remains a completed failure when caller aborts before runtime receives it", async () => {
  const entered = deferred<void>();
  const approval = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A", "B")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: () => {
      entered.resolve();
      return approval.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });
  const run = runtime.run("work", { signal: controller.signal });
  await entered.promise;
  const abortAfterDecision = approval.promise.then(() => controller.abort());
  approval.resolve({ type: "deny" });
  await abortAfterDecision;

  assert.deepEqual(await run, { type: "aborted" });
  assert.deepEqual(executions, []);
  assert.deepEqual(results(runtime), [
    { id: "A", result: failure("TOOL_EXECUTION_DENIED") },
    { id: "B", result: failure("TOOL_CALL_CANCELLED") },
  ]);
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "tool_execution_completed", "run_finished",
  ]);
});

test("H-T23: a successful A remains committed while approval abort cancels B and the unstarted C", async () => {
  const enteredB = deferred<void>();
  const approvalB = deferred<BeforeToolCallDecision>();
  const controller = new AbortController();
  const executions: string[] = [];
  const hookCalls: string[] = [];
  const runtime = new AgentRuntime(new MockModelProvider([toolResponse("A", "B", "C")]), {
    registry: registryWithExecutions(executions),
    beforeToolCall: ({ toolCall }) => {
      hookCalls.push(toolCall.id);
      if (toolCall.id === "B") {
        enteredB.resolve();
        return approvalB.promise;
      }
      return { type: "allow" };
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });
  const run = runtime.run("three operations", { signal: controller.signal });
  await enteredB.promise;
  assert.deepEqual(executions, ["A"]);
  assert.deepEqual(hookCalls, ["A", "B"]);
  controller.abort();

  assert.deepEqual(await run, { type: "aborted" });
  assert.deepEqual(executions, ["A"]);
  assert.deepEqual(hookCalls, ["A", "B"]);
  assert.deepEqual(results(runtime), [
    { id: "A", result: { success: true, result: "A" } },
    { id: "B", result: failure("TOOL_CALL_CANCELLED") },
    { id: "C", result: failure("TOOL_CALL_CANCELLED") },
  ]);
  assert.deepEqual(events.flatMap((event) => {
    if (event.type === "tool_execution_started") return [`started ${event.toolCall.id}`];
    if (event.type === "tool_execution_completed") return [`completed ${event.message.toolCallId}`];
    return [];
  }), ["started A", "completed A", "started B"]);
  assert.equal(events.at(-1)?.type, "run_finished");
});

test("H-T26: deny and hook error retain the existing started/completed ordering and continue the loop", async () => {
  const executions: string[] = [];
  const hookCalls: string[] = [];
  const provider = new MockModelProvider([toolResponse("deny", "error"), finalResponse]);
  const runtime = new AgentRuntime(provider, {
    registry: registryWithExecutions(executions),
    beforeToolCall: ({ toolCall }) => {
      hookCalls.push(toolCall.id);
      if (toolCall.id === "deny") return { type: "deny" };
      throw new Error("sensitive hook failure");
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  assert.deepEqual(await runtime.run("authorize work"), { type: "completed" });
  assert.deepEqual(executions, []);
  assert.deepEqual(hookCalls, ["deny", "error"]);
  assert.deepEqual(results(runtime), [
    { id: "deny", result: failure("TOOL_EXECUTION_DENIED") },
    { id: "error", result: failure("TOOL_PRE_EXECUTION_FAILED") },
  ]);
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "tool_execution_completed",
    "tool_execution_started", "tool_execution_completed",
    "model_turn_started", "model_turn_completed", "run_finished",
  ]);
  const next = provider.requests[1];
  assert.ok(next);
  assert.equal(next.messages.filter((message) => message.role === "tool").length, 2);
});

test("approval abort listeners are removed after allow, deny, rejection, and cancellation", async () => {
  for (const settlement of ["allow", "deny", "reject", "abort"] as const) {
    const approval = deferred<BeforeToolCallDecision>();
    const controller = new AbortController();
    const executions: string[] = [];
    const executor = new ToolExecutor(registryWithExecutions(executions), {
      beforeToolCall: () => approval.promise,
    });
    const execution = executor.execute(call(settlement), { signal: controller.signal });
    assert.equal(getEventListeners(controller.signal, "abort").length, 1, settlement);

    if (settlement === "abort") {
      controller.abort();
      await assert.rejects(execution, (error: unknown) => {
        assert.ok(error instanceof ToolExecutionCancelledError);
        assert.equal(error.signal, controller.signal);
        assert.equal(error.cause, controller.signal.reason);
        return true;
      });
    } else {
      if (settlement === "reject") approval.reject(new Error("hook failure"));
      else approval.resolve({ type: settlement });
      const result = await execution;
      assert.deepEqual(result, settlement === "allow"
        ? { success: true, result: "allow" }
        : failure(settlement === "deny" ? "TOOL_EXECUTION_DENIED" : "TOOL_PRE_EXECUTION_FAILED"));
    }
    assert.equal(getEventListeners(controller.signal, "abort").length, 0, settlement);
    assert.deepEqual(executions, settlement === "allow" ? ["allow"] : []);
  }
});

test("without a caller signal, approval remains pending until the application settles it", async () => {
  const approval = deferred<BeforeToolCallDecision>();
  const entered = deferred<void>();
  const executions: string[] = [];
  const executor = new ToolExecutor(registryWithExecutions(executions), {
    beforeToolCall: ({ signal }) => {
      assert.equal(signal, undefined);
      entered.resolve();
      return approval.promise;
    },
  });
  let settled = false;
  const execution = executor.execute(call("A")).then((result) => {
    settled = true;
    return result;
  });
  await entered.promise;
  await Promise.resolve();
  assert.equal(settled, false);
  assert.deepEqual(executions, []);
  approval.resolve({ type: "deny" });
  assert.deepEqual(await execution, failure("TOOL_EXECUTION_DENIED"));
  assert.equal(settled, true);
});
