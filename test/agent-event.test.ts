import assert from "node:assert/strict";
import test from "node:test";
import type { AgentEvent, AgentEventSubscriber } from "../src/runtime/agent-event.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import type { ToolCall } from "../src/model/tool.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import type { Tool } from "../src/tools/tool.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";

const synchronousSubscriber: AgentEventSubscriber = () => {};
// @ts-expect-error async subscribers are intentionally unsupported
const asynchronousSubscriber: AgentEventSubscriber = async () => {};
void synchronousSubscriber;
void asynchronousSubscriber;

const finalResponse = {
  message: { role: "assistant" as const, content: "Done" },
  finishReason: "stop" as const,
};

function eventTypes(events: readonly AgentEvent[]): AgentEvent["type"][] {
  return events.map((event) => event.type);
}

function addTool(execute: Tool<{ a: number; b: number }>["execute"] = ({ a, b }) => a + b): Tool<{ a: number; b: number }> {
  return {
    definition: {
      name: "add",
      description: "Add two numbers",
      parameters: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
        additionalProperties: false,
      },
    },
    execute,
  };
}

test("normal run emits the minimal lifecycle and its returned outcome", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([finalResponse]));
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
    if (event.type === "run_started") {
      assert.deepEqual(runtime.getMessages(), [{ type: "user_input", content: "Hello" }]);
    }
  });

  const outcome = await runtime.run("Hello");

  assert.deepEqual(eventTypes(events), [
    "run_started",
    "model_turn_started",
    "model_turn_completed",
    "run_finished",
  ]);
  const finished = events.at(-1);
  assert.ok(finished?.type === "run_finished");
  assert.deepEqual(finished.outcome, outcome);
});

test("tool loop events follow execution and completed events observe committed facts", async () => {
  const registry = new ToolRegistry();
  registry.register(addTool());
  const toolCall: ToolCall = { id: "sum", name: "add", arguments: { a: 2, b: 3 } };
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: [toolCall] }, finishReason: "tool_calls" },
    finalResponse,
  ]), { registry });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
    if (event.type === "model_turn_completed" || event.type === "tool_execution_completed") {
      assert.deepEqual(runtime.getMessages().at(-1), event.message);
    }
  });

  await runtime.run("Add");

  assert.deepEqual(eventTypes(events), [
    "run_started",
    "model_turn_started",
    "model_turn_completed",
    "tool_execution_started",
    "tool_execution_completed",
    "model_turn_started",
    "model_turn_completed",
    "run_finished",
  ]);
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "Add" },
    { type: "model_output", toolCalls: [toolCall] },
    { type: "tool_result", toolCallId: "sum", content: '{"success":true,"result":5}' },
    { type: "model_output", content: "Done" },
  ]);
});

test("multiple tools emit sequential started/completed pairs in execution order", async () => {
  const registry = new ToolRegistry();
  const order: string[] = [];
  registry.register(addTool(({ a, b }) => {
    order.push(`execute ${a}`);
    return a + b;
  }));
  const calls: ToolCall[] = [
    { id: "A", name: "add", arguments: { a: 1, b: 1 } },
    { id: "B", name: "add", arguments: { a: 2, b: 2 } },
  ];
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: calls }, finishReason: "tool_calls" },
    finalResponse,
  ]), { registry });
  runtime.subscribe((event) => {
    if (event.type === "tool_execution_started") order.push(`started ${event.toolCall.id}`);
    if (event.type === "tool_execution_completed") order.push(`completed ${event.message.toolCallId}`);
  });

  await runtime.run("Add twice");

  assert.deepEqual(order, [
    "started A", "execute 1", "completed A",
    "started B", "execute 2", "completed B",
  ]);
});

test("tool error contract still completes the tool execution lifecycle", async () => {
  const call: ToolCall = { id: "missing", name: "missing_tool", arguments: { value: 1 } };
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: [call] }, finishReason: "tool_calls" },
    finalResponse,
  ]));
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
  });

  await runtime.run("Use missing tool");

  const toolEvents = events.filter((event) => event.type.startsWith("tool_execution_"));
  assert.deepEqual(eventTypes(toolEvents), ["tool_execution_started", "tool_execution_completed"]);
  const completed = toolEvents[1];
  assert.ok(completed?.type === "tool_execution_completed");
  assert.deepEqual(JSON.parse(completed.message.content), {
    success: false,
    error: { code: "TOOL_NOT_FOUND", message: "Tool not found: missing_tool" },
  });
});

test("maxTurns writes skipped results without tool execution events", async () => {
  const call: ToolCall = { id: "skipped", name: "missing_tool", arguments: {} };
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: [call] }, finishReason: "tool_calls" },
  ]), { maxTurns: 1 });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
  });

  const outcome = await runtime.run("Stop at limit");

  assert.deepEqual(outcome, { type: "limit_reached", maxTurns: 1 });
  assert.deepEqual(eventTypes(events), [
    "run_started", "model_turn_started", "model_turn_completed", "run_finished",
  ]);
  const result = runtime.getMessages().at(-1);
  assert.ok(result?.type === "tool_result");
  assert.equal(JSON.parse(result.content).error.code, "TOOL_EXECUTION_SKIPPED");
});

test("each subscriber receives payloads isolated from runtime facts and other subscribers", async () => {
  const registry = new ToolRegistry();
  registry.register({
    definition: {
      name: "inspect",
      description: "Inspect nested input",
      parameters: {
        type: "object",
        properties: {
          metadata: {
            type: "object",
            properties: { label: { type: "string" } },
            required: ["label"],
            additionalProperties: false,
          },
        },
        required: ["metadata"],
        additionalProperties: false,
      },
    },
    execute: (args: { metadata: { label: string } }) => ({
      nested: { label: args.metadata.label },
    }),
  });
  const toolCall: ToolCall = {
    id: "nested",
    name: "inspect",
    arguments: { metadata: { label: "original" } },
  };
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: [toolCall] }, finishReason: "tool_calls" },
    finalResponse,
  ]), { registry });
  const observed: AgentEvent[] = [];
  runtime.subscribe((event) => {
    if (event.type === "model_turn_completed") {
      const call = event.message.toolCalls?.[0];
      assert.ok(call);
      (call.arguments as { metadata: { label: string } }).metadata.label = "mutated model event";
      call.name = "mutated";
    }
    if (event.type === "tool_execution_started") {
      (event.toolCall.arguments as { metadata: { label: string } }).metadata.label = "mutated start event";
    }
    if (event.type === "tool_execution_completed") event.message.content = "mutated result event";
  });
  runtime.subscribe((event) => {
    observed.push(event);
  });

  await runtime.run("Add");

  const modelCompleted = observed.find((event) => event.type === "model_turn_completed");
  assert.ok(modelCompleted?.type === "model_turn_completed");
  assert.deepEqual(modelCompleted.message.toolCalls, [toolCall]);
  const started = observed.find((event) => event.type === "tool_execution_started");
  assert.ok(started?.type === "tool_execution_started");
  assert.deepEqual(started.toolCall, toolCall);
  const completed = observed.find((event) => event.type === "tool_execution_completed");
  assert.ok(completed?.type === "tool_execution_completed");
  assert.equal(completed.message.content, '{"success":true,"result":{"nested":{"label":"original"}}}');
  assert.deepEqual(runtime.getMessages()[1], { type: "model_output", toolCalls: [toolCall] });
  assert.deepEqual(runtime.getMessages()[2], completed.message);
});

test("run_finished outcome payload is detached from the returned outcome", async () => {
  const call: ToolCall = { id: "skipped", name: "missing", arguments: {} };
  const runtime = new AgentRuntime(new MockModelProvider([
    { message: { role: "assistant", toolCalls: [call] }, finishReason: "tool_calls" },
  ]), { maxTurns: 1 });
  runtime.subscribe((event) => {
    if (event.type === "run_finished" && event.outcome.type === "limit_reached") {
      event.outcome.maxTurns = 999;
    }
  });

  assert.deepEqual(await runtime.run("Limit"), { type: "limit_reached", maxTurns: 1 });
});

test("subscriber failures do not affect the run or other subscribers", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([finalResponse]));
  const observed: AgentEvent[] = [];
  runtime.subscribe(() => {
    throw new Error("observer failed");
  });
  runtime.subscribe((event) => {
    observed.push(event);
  });

  assert.deepEqual(await runtime.run("Hello"), { type: "completed" });
  assert.deepEqual(eventTypes(observed), [
    "run_started", "model_turn_started", "model_turn_completed", "run_finished",
  ]);
});

test("unsubscribe is idempotent and stops later notifications", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([finalResponse]));
  const observed: AgentEvent[] = [];
  const unsubscribe = runtime.subscribe((event) => {
    observed.push(event);
    unsubscribe();
  });

  await runtime.run("Hello");
  unsubscribe();

  assert.deepEqual(eventTypes(observed), ["run_started"]);
});

test("provider errors propagate unchanged without run_finished", async () => {
  const providerError = new Error("provider failed");
  const runtime = new AgentRuntime({
    async generate() {
      throw providerError;
    },
  });
  const events: AgentEvent[] = [];
  runtime.subscribe((event) => {
    events.push(event);
  });

  await assert.rejects(runtime.run("Hello"), (error: unknown) => error === providerError);
  assert.deepEqual(eventTypes(events), ["run_started", "model_turn_started"]);
});
