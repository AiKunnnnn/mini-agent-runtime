import assert from "node:assert/strict";
import test from "node:test";
import { Ajv, type ValidateFunction } from "ajv";
import type { ModelResponse } from "../src/model/model.ts";
import type { ToolCall } from "../src/model/tool.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import type { BeforeToolCallHook } from "../src/tools/before-tool-call.ts";
import { ToolExecutor } from "../src/tools/tool-executor.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";
import type { Tool, ToolResult } from "../src/tools/tool.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";

interface WorkArguments {
  nested: { value: number };
}

function work(execute: Tool<WorkArguments>["execute"]): Tool<WorkArguments> {
  return {
    definition: {
      name: "work",
      description: "Perform a simulated operation",
      parameters: {
        type: "object",
        properties: {
          nested: {
            type: "object",
            properties: { value: { type: "number" } },
            required: ["value"],
            additionalProperties: false,
          },
        },
        required: ["nested"],
        additionalProperties: false,
      },
    },
    execute,
  };
}

function call(id = "one", args: unknown = { nested: { value: 5 } }): ToolCall {
  return { id, name: "work", arguments: args };
}

function calling(...toolCalls: ToolCall[]): ModelResponse {
  return { message: { role: "assistant", toolCalls }, finishReason: "tool_calls" };
}

const finalResponse: ModelResponse = {
  message: { role: "assistant", content: "Finished." }, finishReason: "stop",
};
const denied: ToolResult = {
  success: false,
  error: { code: "TOOL_EXECUTION_DENIED", message: "Tool execution was denied." },
};
const authorizationFailed: ToolResult = {
  success: false,
  error: { code: "TOOL_PRE_EXECUTION_FAILED", message: "Pre-execution authorization failed." },
};

function toolMessages(runtime: AgentRuntime) {
  return runtime.getMessages().filter((message) => message.type === "tool_result");
}

function results(runtime: AgentRuntime): ToolResult[] {
  return toolMessages(runtime).map((message) => JSON.parse(message.content) as ToolResult);
}

test("H-T01: an omitted hook preserves Model → Tool → Model execution", async () => {
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(({ nested }) => { executions++; return nested.value; }));
  const provider = new MockModelProvider([calling(call()), finalResponse]);
  const runtime = new AgentRuntime(provider, { registry });

  assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
  assert.equal(executions, 1);
  assert.deepEqual(results(runtime), [{ success: true, result: 5 }]);
  assert.deepEqual(provider.requests[1]?.messages[2], {
    role: "tool", toolCallId: "one", content: '{"success":true,"result":5}',
  });
});

for (const asynchronous of [false, true]) {
  test(`H-T02: ${asynchronous ? "async" : "sync"} allow runs the hook once before the tool`, async () => {
    const order: string[] = [];
    const registry = new ToolRegistry();
    registry.register(work(({ nested }) => { order.push("execute"); return nested.value; }));
    const hook: BeforeToolCallHook = (context) => {
      order.push("hook");
      assert.deepEqual(context.toolCall, call());
      assert.equal(context.signal, undefined);
      return asynchronous ? Promise.resolve({ type: "allow" }) : { type: "allow" };
    };
    const runtime = new AgentRuntime(new MockModelProvider([calling(call()), finalResponse]), {
      registry, beforeToolCall: hook,
    });

    assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
    assert.deepEqual(order, ["hook", "execute"]);
    assert.deepEqual(results(runtime), [{ success: true, result: 5 }]);
  });
}

for (const asynchronous of [false, true]) {
  test(`H-T03: ${asynchronous ? "async" : "sync"} deny never executes and lets the model continue`, async () => {
    let hookCalls = 0;
    let executions = 0;
    const registry = new ToolRegistry();
    registry.register(work(() => ++executions));
    const provider = new MockModelProvider([calling(call()), finalResponse]);
    const runtime = new AgentRuntime(provider, {
      registry,
      beforeToolCall: () => {
        hookCalls++;
        return asynchronous ? Promise.resolve({ type: "deny" }) : { type: "deny" };
      },
    });

    assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
    assert.equal(hookCalls, 1);
    assert.equal(executions, 0);
    assert.deepEqual(results(runtime), [denied]);
    assert.deepEqual(provider.requests[1]?.messages[2], {
      role: "tool", toolCallId: "one", content: JSON.stringify(denied),
    });
  });
}

for (const mode of ["throw", "reject"] as const) {
  test(`${mode === "throw" ? "H-T04" : "H-T05"}: hook ${mode} becomes a fixed authorization failure`, async () => {
    let hookCalls = 0;
    let executions = 0;
    const registry = new ToolRegistry();
    registry.register(work(() => ++executions));
    const runtime = new AgentRuntime(new MockModelProvider([calling(call()), finalResponse]), {
      registry,
      beforeToolCall: () => {
        hookCalls++;
        const error = new Error("application approval failed");
        if (mode === "reject") return Promise.reject(error);
        throw error;
      },
    });

    assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
    assert.equal(hookCalls, 1);
    assert.equal(executions, 0);
    assert.deepEqual(results(runtime), [authorizationFailed]);
  });
}

for (const [label, decision] of [
  ["undefined", undefined],
  ["null", null],
  ["boolean", true],
  ["string", "allow"],
  ["empty object", {}],
  ["third decision", { type: "requireApproval" }],
  ["wrong type", { type: 1 }],
  ["throwing type getter", { get type(): never { throw new Error("decision getter failed"); } }],
] as const) {
  test(`H-T06: malformed ${label} decision fails closed`, async () => {
    let executions = 0;
    let hookCalls = 0;
    const registry = new ToolRegistry();
    registry.register(work(() => ++executions));
    // Applications can supply malformed values at runtime despite the TS contract.
    const hook = (() => { hookCalls++; return decision; }) as BeforeToolCallHook;
    const executor = new ToolExecutor(registry, { beforeToolCall: hook });

    assert.deepEqual(await executor.execute(call()), authorizationFailed);
    assert.equal(hookCalls, 1);
    assert.equal(executions, 0);
  });
}

test("H-T06: an asynchronously returned illegal decision also fails closed", async () => {
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(() => ++executions));
  const hook = (() => Promise.resolve({ type: "requireApproval" })) as unknown as BeforeToolCallHook;
  const executor = new ToolExecutor(registry, { beforeToolCall: hook });

  assert.deepEqual(await executor.execute(call()), authorizationFailed);
  assert.equal(executions, 0);
});

test("H-T07: an unknown tool keeps TOOL_NOT_FOUND and bypasses the hook", async () => {
  let hookCalls = 0;
  const executor = new ToolExecutor(new ToolRegistry(), {
    beforeToolCall: () => { hookCalls++; return { type: "allow" }; },
  });

  assert.deepEqual(await executor.execute(call()), {
    success: false, error: { code: "TOOL_NOT_FOUND", message: "Tool not found: work" },
  });
  assert.equal(hookCalls, 0);
});

test("H-T08: invalid arguments keep INVALID_ARGUMENTS and bypass the hook and tool", async () => {
  let hookCalls = 0;
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(() => ++executions));
  const executor = new ToolExecutor(registry, {
    beforeToolCall: () => { hookCalls++; return { type: "allow" }; },
  });

  const result = await executor.execute(call("invalid", { nested: { value: "5" } }));
  assert.ok(!result.success);
  assert.equal(result.error.code, "INVALID_ARGUMENTS");
  assert.ok(result.error.message.length > 0);
  assert.equal(hookCalls, 0);
  assert.equal(executions, 0);
});

test("H-T09: registry lookup bugs still propagate unchanged with a hook configured", async () => {
  const error = new Error("registry bug");
  const registry = new ToolRegistry();
  registry.get = () => { throw error; };
  const executor = new ToolExecutor(registry, {
    beforeToolCall: () => assert.fail("hook must not run after failed lookup"),
  });

  await assert.rejects(executor.execute(call()), (observed: unknown) => observed === error);
});

test("H-T09: schema compilation and unsupported async schemas retain their propagation contract", async () => {
  for (const parameters of [{ type: "not-a-type" }, { $async: true, type: "object" }]) {
    const registry = new ToolRegistry();
    registry.register({
      definition: { name: "work", description: "Invalid configuration", parameters },
      execute: () => assert.fail("tool must not run after failed compilation"),
    });
    const executor = new ToolExecutor(registry, {
      beforeToolCall: () => assert.fail("hook must not run after failed compilation"),
    });

    await assert.rejects(executor.execute(call()));
  }
});

test("H-T09: a validator internal exception propagates unchanged outside hook normalization", async () => {
  const error = new Error("validator internal bug");
  const original = Object.getOwnPropertyDescriptor(Ajv.prototype, "compile");
  // Deterministic fault injection at Ajv's validation boundary, restored even if
  // the assertion fails. The per-file test runner executes this test serially.
  Object.defineProperty(Ajv.prototype, "compile", {
    configurable: true,
    writable: true,
    value: () => (() => { throw error; }) as unknown as ValidateFunction,
  });
  try {
    const registry = new ToolRegistry();
    registry.register(work(() => assert.fail("tool must not run after validator failure")));
    const executor = new ToolExecutor(registry, {
      beforeToolCall: () => assert.fail("hook must not run after validator failure"),
    });
    await assert.rejects(executor.execute(call()), (observed: unknown) => observed === error);
  } finally {
    if (original === undefined) delete (Ajv.prototype as unknown as Record<string, unknown>).compile;
    else Object.defineProperty(Ajv.prototype, "compile", original);
  }
});

test("H-T09: non-cloneable arguments remain an executor internal failure", async () => {
  const registry = new ToolRegistry();
  registry.register(work(() => assert.fail("tool must not run after clone failure")));
  const executor = new ToolExecutor(registry, {
    beforeToolCall: () => assert.fail("hook must not run after clone failure"),
  });

  await assert.rejects(executor.execute(call("bad-clone", { nested: { value: () => 5 } })), {
    name: "DataCloneError",
  });
});

test("H-T09: circular result serialization still propagates from runtime after authorization", async () => {
  const circular: { self?: unknown } = {};
  circular.self = circular;
  let hookCalls = 0;
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(() => { executions++; return circular as never; }));
  const runtime = new AgentRuntime(new MockModelProvider([calling(call())]), {
    registry, beforeToolCall: () => { hookCalls++; return { type: "allow" }; },
  });

  await assert.rejects(runtime.run("perform operation"), TypeError);
  assert.equal(hookCalls, 1);
  assert.equal(executions, 1);
  assert.deepEqual(results(runtime), []);
  assert.deepEqual(runtime.getMessages().map((message) => message.type), ["user_input", "model_output"]);
});

test("H-T10: a standalone executor enforces both allow and deny", async () => {
  let hookCalls = 0;
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(({ nested }) => { executions++; return nested.value; }));
  const executor = new ToolExecutor(registry, {
    beforeToolCall: () => ({ type: ++hookCalls === 1 ? "allow" : "deny" }),
  });

  assert.deepEqual(await executor.execute(call("first")), { success: true, result: 5 });
  assert.deepEqual(await executor.execute(call("second")), denied);
  assert.equal(hookCalls, 2);
  assert.equal(executions, 1);
});

test("H-T11: nested hook arguments are detached from actual execution and recorded history", async () => {
  const originalCall = call();
  let executed: WorkArguments | undefined;
  let inspected: WorkArguments | undefined;
  const registry = new ToolRegistry();
  registry.register(work((args) => { executed = args; return args.nested.value; }));
  const provider = new MockModelProvider([calling(originalCall), finalResponse]);
  const runtime = new AgentRuntime(provider, {
    registry,
    beforeToolCall: ({ toolCall }) => {
      inspected = toolCall.arguments as WorkArguments;
      assert.deepEqual(inspected, { nested: { value: 5 } });
      inspected.nested.value = 99;
      return { type: "allow" };
    },
  });

  assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
  assert.deepEqual(executed, { nested: { value: 5 } });
  assert.notEqual(executed, inspected);
  assert.notEqual(executed?.nested, inspected?.nested);
  assert.deepEqual(originalCall, call());
  assert.deepEqual(runtime.getMessages()[1], { type: "model_output", toolCalls: [call()] });
  assert.deepEqual(results(runtime), [{ success: true, result: 5 }]);
  assert.deepEqual(provider.requests[1]?.messages[1], { role: "assistant", toolCalls: [call()] });
});

test("H-T12: hook changes to id, name and arguments cannot redirect execution or result pairing", async () => {
  let executions = 0;
  let redirectedExecutions = 0;
  const registry = new ToolRegistry();
  registry.register(work(() => ++executions));
  const redirected = work(() => ++redirectedExecutions);
  redirected.definition.name = "redirected";
  registry.register(redirected);
  const provider = new MockModelProvider([calling(call()), finalResponse]);
  const runtime = new AgentRuntime(provider, {
    registry,
    beforeToolCall: ({ toolCall }) => {
      const mutable = toolCall as ToolCall;
      mutable.id = "changed-id";
      mutable.name = "redirected";
      mutable.arguments = { nested: { value: 999 } };
      return { type: "allow" };
    },
  });

  assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
  assert.equal(executions, 1);
  assert.equal(redirectedExecutions, 0);
  assert.deepEqual(toolMessages(runtime).map((message) => message.toolCallId), ["one"]);
  assert.deepEqual(runtime.getMessages()[1], { type: "model_output", toolCalls: [call()] });
  assert.deepEqual(provider.requests[1]?.messages[2], {
    role: "tool", toolCallId: "one", content: '{"success":true,"result":1}',
  });
});

test("H-T13: hook mutation followed by denial preserves the committed ToolCall", async () => {
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(() => ++executions));
  const provider = new MockModelProvider([calling(call()), finalResponse]);
  const runtime = new AgentRuntime(provider, {
    registry,
    beforeToolCall: ({ toolCall }) => {
      (toolCall.arguments as WorkArguments).nested.value = 99;
      (toolCall as ToolCall).id = "modified";
      (toolCall as ToolCall).name = "missing";
      return { type: "deny" };
    },
  });

  assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
  assert.equal(executions, 0);
  assert.deepEqual(results(runtime), [denied]);
  assert.deepEqual(toolMessages(runtime).map((message) => message.toolCallId), ["one"]);
  assert.deepEqual(runtime.getMessages()[1], { type: "model_output", toolCalls: [call()] });
  assert.deepEqual(provider.requests[1]?.messages[1], { role: "assistant", toolCalls: [call()] });
});

for (const mode of ["throw", "reject"] as const) {
  test(`H-T14: sensitive hook ${mode} data is absent from ToolResult and ModelRequest`, async () => {
    const sensitive = "approval-service-secret-token-123";
    let executions = 0;
    const registry = new ToolRegistry();
    registry.register(work(() => ++executions));
    const provider = new MockModelProvider([calling(call()), finalResponse]);
    const runtime = new AgentRuntime(provider, {
      registry,
      beforeToolCall: () => {
        const error = new Error(sensitive);
        error.stack = `${sensitive} stack`;
        if (mode === "reject") return Promise.reject(error);
        throw error;
      },
    });

    assert.deepEqual(await runtime.run("perform operation"), { type: "completed" });
    assert.equal(executions, 0);
    assert.deepEqual(results(runtime), [authorizationFailed]);
    assert.equal(JSON.stringify(runtime.getMessages()).includes(sensitive), false);
    assert.equal(JSON.stringify(provider.requests).includes(sensitive), false);
    assert.deepEqual(provider.requests[1]?.messages[2], {
      role: "tool", toolCallId: "one", content: JSON.stringify(authorizationFailed),
    });
  });
}

test("H-T15: one constructor-injected hook independently authorizes multiple runs", async () => {
  const hookIds: string[] = [];
  let executions = 0;
  const registry = new ToolRegistry();
  registry.register(work(({ nested }) => { executions++; return nested.value; }));
  const provider = new MockModelProvider([
    calling(call("first")), finalResponse,
    calling(call("second")), finalResponse,
  ]);
  const runtime = new AgentRuntime(provider, {
    registry,
    beforeToolCall: ({ toolCall }) => {
      hookIds.push(toolCall.id);
      return { type: toolCall.id === "first" ? "allow" : "deny" };
    },
  });

  assert.deepEqual(await runtime.run("first operation"), { type: "completed" });
  assert.deepEqual(await runtime.run("second operation"), { type: "completed" });
  assert.deepEqual(hookIds, ["first", "second"]);
  assert.equal(executions, 1);
  assert.deepEqual(results(runtime), [{ success: true, result: 5 }, denied]);
  assert.deepEqual(toolMessages(runtime).map((message) => message.toolCallId), ["first", "second"]);
  assert.equal(provider.requests.length, 4);
});
