import assert from "node:assert/strict";
import test from "node:test";
import type { ModelGenerationOptions, ModelProvider } from "../src/model/model-provider.ts";
import type { ModelResponse } from "../src/model/model.ts";
import type { AgentEvent } from "../src/runtime/agent-event.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { ToolExecutor, ToolExecutionCancelledError } from "../src/tools/tool-executor.ts";
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

function eventTypes(events: readonly AgentEvent[]): AgentEvent["type"][] {
  return events.map((event) => event.type);
}

function toolResults(runtime: AgentRuntime): Map<string, ToolResult> {
  return new Map(runtime.getMessages()
    .filter((message) => message.type === "tool_result")
    .map((message) => [message.toolCallId, JSON.parse(message.content) as ToolResult]));
}

function cancellableTool(
  execute: Tool<{ value: string }>["execute"],
): Tool<{ value: string }> {
  return {
    definition: {
      name: "work",
      description: "Do work",
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

test("a concurrent run fails before state, events, or provider work and leaves the first run intact", async () => {
  const pending = deferred<ModelResponse>();
  let calls = 0;
  const runtime = new AgentRuntime({
    generate() {
      calls += 1;
      return pending.promise;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  const first = runtime.run("first");
  const second = runtime.run("second");

  await assert.rejects(second, /already has an active run/);
  assert.equal(calls, 1);
  assert.deepEqual(runtime.getMessages(), [{ type: "user_input", content: "first" }]);
  assert.deepEqual(eventTypes(events), ["run_started", "model_turn_started"]);

  pending.resolve(finalResponse);
  assert.deepEqual(await first, { type: "completed" });
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "first" },
    { type: "model_output", content: "Done" },
  ]);
});

test("a subscriber reentrant run is rejected by the same active-run guard", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([finalResponse]));
  let reentrant: Promise<unknown> | undefined;
  runtime.subscribe((event) => {
    if (event.type === "run_started") reentrant = runtime.run("reentrant");
  });

  assert.deepEqual(await runtime.run("outer"), { type: "completed" });
  assert.ok(reentrant);
  await assert.rejects(reentrant, /already has an active run/);
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "outer" },
    { type: "model_output", content: "Done" },
  ]);
});

test("pre-aborted runs have no state, provider, or event lifecycle", async () => {
  const controller = new AbortController();
  controller.abort();
  const provider = new MockModelProvider([finalResponse]);
  const runtime = new AgentRuntime(provider);
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  assert.deepEqual(await runtime.run("ignored", { signal: controller.signal }), { type: "aborted" });
  assert.deepEqual(runtime.getMessages(), []);
  assert.deepEqual(provider.requests, []);
  assert.deepEqual(events, []);

  assert.deepEqual(await runtime.run("next"), { type: "completed" });
});

test("provider receives the same signal and an aborted returned response is not committed", async () => {
  const controller = new AbortController();
  let receivedOptions: ModelGenerationOptions | undefined;
  const provider: ModelProvider = {
    generate(_request, options) {
      receivedOptions = options;
      return new Promise<ModelResponse>((resolve) => {
        options?.signal?.addEventListener("abort", () => {
          resolve({ message: { role: "assistant", content: "discard me" }, finishReason: "stop" });
        }, { once: true });
      });
    },
  };
  const runtime = new AgentRuntime(provider);
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  const run = runtime.run("hello", { signal: controller.signal });
  controller.abort();

  assert.deepEqual(await run, { type: "aborted" });
  assert.equal(receivedOptions?.signal, controller.signal);
  assert.deepEqual(runtime.getMessages(), [{ type: "user_input", content: "hello" }]);
  assert.deepEqual(eventTypes(events), ["run_started", "model_turn_started", "run_finished"]);
  const finished = events.at(-1);
  assert.ok(finished?.type === "run_finished");
  assert.deepEqual(finished.outcome, { type: "aborted" });
});

test("provider rejection while the current signal is aborted settles the run as aborted", async () => {
  const controller = new AbortController();
  const provider: ModelProvider = {
    generate(_request, options) {
      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      });
    },
  };
  const runtime = new AgentRuntime(provider);
  const run = runtime.run("hello", { signal: controller.signal });
  controller.abort();
  assert.deepEqual(await run, { type: "aborted" });
});

test("an unrelated provider error preserves identity and releases ownership", async () => {
  const error = new Error("provider failed");
  let calls = 0;
  const runtime = new AgentRuntime({
    async generate() {
      if (++calls === 1) throw error;
      return finalResponse;
    },
  });

  await assert.rejects(runtime.run("first"), (actual: unknown) => actual === error);
  assert.deepEqual(await runtime.run("second"), { type: "completed" });
});

test("abort before tool start pairs every call without tool execution events", async () => {
  const controller = new AbortController();
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(cancellableTool(() => { executions += 1; return "unexpected"; }));
  const calls = ["A", "B"].map((id) => ({ id, name: "work", arguments: { value: id } }));
  const runtime = new AgentRuntime(new MockModelProvider([{
    message: { role: "assistant", toolCalls: calls }, finishReason: "tool_calls",
  }]), { registry });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
    if (event.type === "model_turn_completed") controller.abort();
  });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  assert.equal(executions, 0);
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed", "run_finished",
  ]);
  for (const result of toolResults(runtime).values()) {
    assert.ok(!result.success);
    assert.equal(result.error.code, "TOOL_CALL_CANCELLED");
  }
});

test("ToolExecutor passes the same signal and separates cooperative cancellation from normal failure", async () => {
  const controller = new AbortController();
  const registry = new ToolRegistry();
  let receivedSignal: AbortSignal | undefined;
  registry.register(cancellableTool(async (_args, options) => {
    receivedSignal = options?.signal;
    await new Promise<void>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    });
    return "unreachable";
  }));
  const executor = new ToolExecutor(registry);
  const execution = executor.execute(
    { id: "A", name: "work", arguments: { value: "A" } },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(execution, ToolExecutionCancelledError);
  assert.equal(receivedSignal, controller.signal);

  const normalRegistry = new ToolRegistry();
  normalRegistry.register(cancellableTool(() => { throw new Error("ordinary failure"); }));
  assert.deepEqual(await new ToolExecutor(normalRegistry).execute({
    id: "B", name: "work", arguments: { value: "B" },
  }), {
    success: false,
    error: { code: "TOOL_EXECUTION_FAILED", message: "ordinary failure" },
  });
});

test("abort during a tool writes cancellation pairing without a completed event", async () => {
  const controller = new AbortController();
  const registry = new ToolRegistry();
  registry.register(cancellableTool(async (_args, options) => {
    await new Promise<void>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    });
    return "unreachable";
  }));
  const runtime = new AgentRuntime(new MockModelProvider([{
    message: { role: "assistant", toolCalls: [
      { id: "A", name: "work", arguments: { value: "A" } },
    ] },
    finishReason: "tool_calls",
  }]), { registry });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
    if (event.type === "tool_execution_started") queueMicrotask(() => controller.abort());
  });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "run_finished",
  ]);
  const result = toolResults(runtime).get("A");
  assert.ok(result && !result.success);
  assert.equal(result.error.code, "TOOL_CALL_CANCELLED");
});

test("a successful tool result commits before late abort stops the next model turn", async () => {
  const controller = new AbortController();
  const registry = new ToolRegistry();
  registry.register(cancellableTool(() => {
    controller.abort();
    return "completed side effect";
  }));
  const provider = new MockModelProvider([{
    message: { role: "assistant", toolCalls: [
      { id: "A", name: "work", arguments: { value: "A" } },
    ] },
    finishReason: "tool_calls",
  }]);
  const runtime = new AgentRuntime(provider, { registry });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  assert.equal(provider.requests.length, 1);
  assert.deepEqual(toolResults(runtime).get("A"), {
    success: true, result: "completed side effect",
  });
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "tool_execution_completed", "run_finished",
  ]);
});

test("multiple tools preserve A, cancel B and C, and never execute C", async () => {
  const controller = new AbortController();
  const executed: string[] = [];
  const registry = new ToolRegistry();
  registry.register(cancellableTool(async ({ value }, options) => {
    executed.push(value);
    if (value === "A") return "A done";
    if (value === "C") return "C must not run";
    await new Promise<void>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
      queueMicrotask(() => controller.abort());
    });
    return "unreachable";
  }));
  const calls = ["A", "B", "C"].map((id) => ({ id, name: "work", arguments: { value: id } }));
  const runtime = new AgentRuntime(new MockModelProvider([{
    message: { role: "assistant", toolCalls: calls }, finishReason: "tool_calls",
  }]), { registry });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => { events.push(event); });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  assert.deepEqual(executed, ["A", "B"]);
  const results = toolResults(runtime);
  assert.deepEqual(results.get("A"), { success: true, result: "A done" });
  for (const id of ["B", "C"]) {
    const result = results.get(id);
    assert.ok(result && !result.success);
    assert.equal(result.error.code, "TOOL_CALL_CANCELLED");
  }
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed",
    "tool_execution_started", "tool_execution_completed",
    "tool_execution_started", "run_finished",
  ]);
});

test("normal, unsupported, limit and aborted outcomes all release active ownership", async () => {
  const cases: Array<{ first: ModelResponse; options?: { maxTurns: number } }> = [
    { first: finalResponse },
    { first: { message: { role: "assistant", content: "partial" }, finishReason: "length" } },
    { first: {
      message: { role: "assistant", toolCalls: [{ id: "A", name: "missing", arguments: {} }] },
      finishReason: "tool_calls",
    }, options: { maxTurns: 1 } },
  ];
  for (const { first, options } of cases) {
    const runtime = new AgentRuntime(new MockModelProvider([first, finalResponse]), options);
    await runtime.run("first");
    assert.deepEqual(await runtime.run("second"), { type: "completed" });
  }

  const controller = new AbortController();
  controller.abort();
  const abortedRuntime = new AgentRuntime(new MockModelProvider([finalResponse]));
  assert.deepEqual(await abortedRuntime.run("first", { signal: controller.signal }), { type: "aborted" });
  assert.deepEqual(await abortedRuntime.run("second"), { type: "completed" });
});

test("cancellation takes priority over maxTurns pairing", async () => {
  const controller = new AbortController();
  const call = { id: "A", name: "missing", arguments: {} };
  const runtime = new AgentRuntime(new MockModelProvider([{
    message: { role: "assistant", toolCalls: [call] }, finishReason: "tool_calls",
  }]), { maxTurns: 1 });
  runtime.subscribe((event) => {
    if (event.type === "model_turn_completed") controller.abort();
  });

  assert.deepEqual(await runtime.run("work", { signal: controller.signal }), { type: "aborted" });
  const result = toolResults(runtime).get("A");
  assert.ok(result && !result.success);
  assert.equal(result.error.code, "TOOL_CALL_CANCELLED");
});
