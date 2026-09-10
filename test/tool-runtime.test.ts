import assert from "node:assert/strict";
import test from "node:test";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { ToolExecutor } from "../src/tools/tool-executor.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import type { Tool, ToolResult } from "../src/tools/tool.ts";
import type { ToolCall } from "../src/model/tool.ts";
import type { ModelResponse } from "../src/model/model.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";

function add(execute: Tool<{ a: number; b: number }>["execute"] = ({ a, b }) => a + b): Tool<{ a: number; b: number }> {
  return {
    definition: {
      name: "add", description: "Add two numbers",
      parameters: {
        type: "object", properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"], additionalProperties: false,
      },
    },
    execute,
  };
}
const call = (id = "one", args: unknown = { a: 2, b: 3 }): ToolCall => ({ id, name: "add", arguments: args });
const calling = (...toolCalls: ToolCall[]): ModelResponse => ({
  message: { role: "assistant", toolCalls }, finishReason: "tool_calls",
});
const final: ModelResponse = { message: { role: "assistant", content: "5" }, finishReason: "stop" };
function results(runtime: AgentRuntime): ToolResult[] {
  return runtime.getMessages().filter((m) => m.type === "tool_result").map((m) => JSON.parse(m.content) as ToolResult);
}

test("happy path uses registry definitions and result in the second turn of one run", async () => {
  const registry = new ToolRegistry();
  registry.register(add());
  const provider = new MockModelProvider([calling(call()), final]);
  const runtime = new AgentRuntime(provider, { registry });
  assert.deepEqual(await runtime.run("2 + 3?"), { type: "completed" });
  assert.equal(provider.requests.length, 2);
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "2 + 3?" },
    { type: "model_output", toolCalls: [call()] },
    { type: "tool_result", toolCallId: "one", content: '{"success":true,"result":5}' },
    { type: "model_output", content: "5" },
  ]);
  for (const request of provider.requests) assert.deepEqual(request.tools, registry.listDefinitions());
  assert.deepEqual(provider.requests[1]?.messages[2], {
    role: "tool", toolCallId: "one", content: '{"success":true,"result":5}',
  });
});

for (const args of [null, [], "bad", { a: "2", b: 3 }, { a: 2 }, { a: 2, b: 3, extra: true }]) {
  test(`invalid arguments ${JSON.stringify(args)} never invoke execute and allow continuation`, async () => {
    const registry = new ToolRegistry();
    registry.register(add(() => { assert.fail("must not execute"); }));
    const provider = new MockModelProvider([calling(call("bad", args)), final]);
    const runtime = new AgentRuntime(provider, { registry });
    assert.deepEqual(await runtime.run("add"), { type: "completed" });
    const result = results(runtime)[0];
    assert.ok(result && !result.success);
    assert.equal(result.error.code, "INVALID_ARGUMENTS");
    assert.ok(result.error.message.length > 0);
    assert.equal(provider.requests.length, 2);
    assert.equal(provider.requests[1]?.messages[2]?.role, "tool");
  });
}

for (const mode of ["throw", "reject", "non-error"] as const) {
  test(`tool ${mode} becomes an execution failure visible to the next model turn`, async () => {
    const registry = new ToolRegistry();
    registry.register(add(() => {
      if (mode === "reject") return Promise.reject(new Error("Tool offline"));
      if (mode === "non-error") throw "Tool offline";
      throw new Error("Tool offline");
    }));
    const provider = new MockModelProvider([calling(call()), final]);
    const runtime = new AgentRuntime(provider, { registry });
    assert.deepEqual(await runtime.run("add"), { type: "completed" });
    assert.deepEqual(results(runtime), [{ success: false, error: {
      code: "TOOL_EXECUTION_FAILED", message: "Tool offline",
    } }]);
    const message = provider.requests[1]?.messages[2];
    assert.ok(message?.role === "tool");
    assert.deepEqual(JSON.parse(message.content), results(runtime)[0]);
  });
}

for (const mixed of [false, true]) {
  test(`multiple calls finish sequentially before the next turn (mixed=${mixed})`, async () => {
    const registry = new ToolRegistry();
    const order: string[] = [];
    registry.register(add(async ({ a, b }) => {
      order.push(`start ${a}`);
      await new Promise<void>((resolve) => setImmediate(resolve));
      order.push(`end ${a}`);
      return a + b;
    }));
    const calls = [call("A", { a: 1, b: 1 }), call("B", { a: mixed ? "bad" : 2, b: 1 }), call("C", { a: 3, b: 1 })];
    const expectedOrder = mixed ? ["start 1", "end 1", "start 3", "end 3"] : ["start 1", "end 1", "start 2", "end 2", "start 3", "end 3"];
    let turns = 0;
    const runtime = new AgentRuntime({ async generate(request) {
      if (++turns === 1) return calling(...calls);
      assert.deepEqual(order, expectedOrder);
      assert.deepEqual(request.messages.filter((m) => m.role === "tool").map((m) => m.toolCallId), ["A", "B", "C"]);
      return final;
    } }, { registry, maxTurns: 2 });
    assert.deepEqual(await runtime.run("add"), { type: "completed" });
    assert.equal(turns, 2);
    assert.deepEqual(results(runtime).map((r) => r.success), [true, !mixed, true]);
    if (mixed) {
      const failure = results(runtime)[1];
      assert.ok(failure && !failure.success);
      assert.equal(failure.error.code, "INVALID_ARGUMENTS");
    }
  });
}

for (const maxTurns of [1, 3, undefined]) {
  test(`maxTurns=${maxTurns ?? "default"} counts model turns, skips final tools and resets per run`, async () => {
    const registry = new ToolRegistry();
    let executions = 0;
    registry.register(add(() => ++executions));
    let turns = 0;
    const runtime = new AgentRuntime({ async generate() {
      turns++;
      return calling(call("A"), call("B"));
    } }, { registry, ...(maxTurns === undefined ? {} : { maxTurns }) });
    const budget = maxTurns ?? 5;
    for (let run = 1; run <= 2; run++) {
      assert.deepEqual(await runtime.run("loop"), { type: "limit_reached", maxTurns: budget });
      assert.equal(turns, run * budget);
      assert.equal(executions, run * (budget - 1) * 2);
      assert.deepEqual(runtime.getMessages().slice(-3), [
        { type: "model_output", toolCalls: [call("A"), call("B")] },
        ...["A", "B"].map((toolCallId) => ({
          type: "tool_result", toolCallId,
          content: JSON.stringify({ success: false, error: {
            code: "TOOL_EXECUTION_SKIPPED",
            message: "Tool execution was skipped because maxTurns was reached.",
          } }),
        })),
      ]);
      assert.equal(runtime.getMessages().filter((m) => m.type === "user_input").length, run);
    }
  });
}

test("a run after limit_reached receives paired skipped results before the new user input", async () => {
  const registry = new ToolRegistry();
  let executions = 0;
  registry.register(add(() => ++executions));
  const calls = [call("A"), call("B")];
  const provider = new MockModelProvider([calling(...calls), final]);
  const runtime = new AgentRuntime(provider, { registry, maxTurns: 1 });

  assert.deepEqual(await runtime.run("add"), { type: "limit_reached", maxTurns: 1 });
  assert.equal(executions, 0);
  assert.deepEqual(await runtime.run("continue"), { type: "completed" });
  assert.equal(executions, 0);
  assert.equal(provider.requests.length, 2);
  assert.deepEqual(provider.requests[1]?.messages, [
    { role: "user", content: "add" },
    { role: "assistant", toolCalls: calls },
    ...calls.map(({ id }) => ({
      role: "tool", toolCallId: id,
      content: JSON.stringify({ success: false, error: {
        code: "TOOL_EXECUTION_SKIPPED",
        message: "Tool execution was skipped because maxTurns was reached.",
      } }),
    })),
    { role: "user", content: "continue" },
  ]);
});

test("stop on the last allowed turn still completes", async () => {
  assert.deepEqual(await new AgentRuntime(new MockModelProvider([final]), { maxTurns: 1 }).run("hi"), { type: "completed" });
});

test("invalid maxTurns fails at construction", () => {
  for (const maxTurns of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => new AgentRuntime(new MockModelProvider([]), { maxTurns }), RangeError);
  }
});

test("provider failure after tool execution propagates the same error and preserves facts", async () => {
  const registry = new ToolRegistry(); registry.register(add());
  const error = new Error("provider failed");
  let turns = 0;
  const runtime = new AgentRuntime({ async generate() {
    if (++turns === 1) return calling(call());
    throw error;
  } }, { registry });
  await assert.rejects(runtime.run("add"), (e: unknown) => e === error);
  assert.equal(turns, 2);
  assert.deepEqual(runtime.getMessages().map((m) => m.type), ["user_input", "model_output", "tool_result"]);
});

test("tool argument and result references cannot mutate history", async () => {
  const registry = new ToolRegistry();
  const output = { nested: { value: 5 } };
  registry.register(add((args) => { args.a = 99; return output; }));
  const provider = new MockModelProvider([calling(call()), final]);
  const runtime = new AgentRuntime(provider, { registry });
  await runtime.run("add");
  const expected = runtime.getMessages();
  output.nested.value = 99;
  const copy = runtime.getMessages();
  const toolMessage = copy[2];
  assert.ok(toolMessage?.type === "tool_result");
  toolMessage.content = "changed";
  const requestTool = provider.requests[1]?.messages[2];
  assert.ok(requestTool?.role === "tool");
  requestTool.content = "changed request";
  assert.deepEqual(runtime.getMessages(), expected);
  assert.deepEqual(runtime.getMessages()[1], { type: "model_output", toolCalls: [call()] });
  assert.deepEqual(results(runtime), [{ success: true, result: { nested: { value: 5 } } }]);
});

test("registry rejects duplicates, preserves order and isolates schema references", async () => {
  const registry = new ToolRegistry();
  const original = add();
  registry.register(original);
  assert.throws(() => registry.register(add()), /already registered/);
  registry.register({ ...add(), definition: { ...add().definition, name: "second" } });
  assert.deepEqual(registry.listDefinitions().map((d) => d.name), ["add", "second"]);
  assert.equal(registry.get("missing"), undefined);
  original.definition.parameters.required = [];
  const definitions = registry.listDefinitions();
  definitions[0]!.parameters.required = [];
  registry.get("add")!.definition.parameters.required = [];
  const result = await new ToolExecutor(registry).execute(call("bad", {}));
  assert.ok(!result.success);
  assert.equal(result.error.code, "INVALID_ARGUMENTS");
});

test("provider cannot change the schema used for tool validation", async () => {
  const registry = new ToolRegistry(); registry.register(add(() => assert.fail("must not execute")));
  let turns = 0;
  const runtime = new AgentRuntime({ async generate(request) {
    if (++turns === 1) {
      request.tools![0]!.parameters.required = [];
      return calling(call("bad", {}));
    }
    assert.deepEqual(request.tools, registry.listDefinitions());
    return final;
  } }, { registry });
  await runtime.run("add");
  assert.equal(results(runtime)[0]?.success, false);
});

test("invalid schema and async schema are configuration bugs, not invocation failures", async () => {
  for (const parameters of [{ type: "not-a-type" }, { $async: true, type: "object" }]) {
    const registry = new ToolRegistry();
    registry.register({ definition: { name: "add", description: "broken", parameters }, execute: () => assert.fail("must not execute") });
    const runtime = new AgentRuntime(new MockModelProvider([calling(call())]), { registry });
    await assert.rejects(runtime.run("add"));
    assert.deepEqual(results(runtime), []);
  }
});

test("lookup bugs propagate unchanged", async () => {
  const error = new Error("registry bug");
  const registry = new ToolRegistry();
  registry.get = () => { throw error; };
  await assert.rejects(new ToolExecutor(registry).execute(call()), (e: unknown) => e === error);
});

test("result serialization bugs propagate outside the execute catch boundary", async () => {
  const circular: { self?: unknown } = {}; circular.self = circular;
  const registry = new ToolRegistry();
  // Deliberately violate the JSON result contract to exercise an internal bug.
  registry.register(add(() => circular as never));
  const runtime = new AgentRuntime(new MockModelProvider([calling(call())]), { registry });
  await assert.rejects(runtime.run("add"), TypeError);
  assert.deepEqual(results(runtime), []);
});

test("tool_calls without calls is an invariant violation", async () => {
  const runtime = new AgentRuntime(new MockModelProvider([calling()]));
  await assert.rejects(runtime.run("add"), /requires at least one ToolCall/);
  assert.equal(runtime.getMessages().at(-1)?.type, "model_output");
});

for (const toolCalls of [undefined, []] as const) {
  test(`malformed tool_calls (${toolCalls === undefined ? "missing" : "empty"}) still throws on the final turn`, async () => {
    const provider = new MockModelProvider([{
      message: { role: "assistant", ...(toolCalls === undefined ? {} : { toolCalls: [] }) },
      finishReason: "tool_calls",
    }]);
    const runtime = new AgentRuntime(provider, { maxTurns: 1 });
    await assert.rejects(runtime.run("add"), /requires at least one ToolCall/);
    assert.equal(provider.requests.length, 1);
    assert.equal(runtime.getMessages().at(-1)?.type, "model_output");
    assert.deepEqual(results(runtime), []);
  });
}
