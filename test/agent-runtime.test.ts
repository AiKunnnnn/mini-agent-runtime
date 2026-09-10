import assert from "node:assert/strict";
import test from "node:test";
import type { ModelProvider } from "../src/model/model-provider.ts";
import type { ModelResponse } from "../src/model/model.ts";
import { AgentRuntime } from "../src/runtime/agent-runtime.ts";
import { MockModelProvider } from "./support/mock-model-provider.ts";

test("completes a normal answer and records runtime facts", async () => {
  const provider = new MockModelProvider([
    { message: { role: "assistant", content: "Hi" }, finishReason: "stop" },
  ]);
  const runtime = new AgentRuntime(provider);
  assert.deepEqual(runtime.getMessages(), []);

  assert.deepEqual(await runtime.run("Hello"), { type: "completed" });
  assert.deepEqual(provider.requests, [
    { messages: [{ role: "user", content: "Hello" }] },
  ]);
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "Hello" },
    { type: "model_output", content: "Hi" },
  ]);
});

test("retains conversation across two runs on the same runtime", async () => {
  const provider = new MockModelProvider([
    { message: { role: "assistant", content: "Hi" }, finishReason: "stop" },
    { message: { role: "assistant", content: "I'm well." }, finishReason: "stop" },
  ]);
  const runtime = new AgentRuntime(provider);

  await runtime.run("Hello");
  assert.deepEqual(await runtime.run("How are you?"), { type: "completed" });
  assert.deepEqual(provider.requests, [
    { messages: [{ role: "user", content: "Hello" }] },
    {
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi" },
        { role: "user", content: "How are you?" },
      ],
    },
  ]);
  assert.deepEqual(runtime.getMessages(), [
    { type: "user_input", content: "Hello" },
    { type: "model_output", content: "Hi" },
    { type: "user_input", content: "How are you?" },
    { type: "model_output", content: "I'm well." },
  ]);
});

test("records missing tool failure and continues within the same run", async () => {
  const toolCalls = [
    { id: "call_weather", name: "get_weather", arguments: { city: "Shanghai" } },
  ];
  const provider = new MockModelProvider([
    { message: { role: "assistant", toolCalls }, finishReason: "tool_calls" },
    { message: { role: "assistant", content: "Unavailable" }, finishReason: "stop" },
  ]);
  const runtime = new AgentRuntime(provider);

  assert.deepEqual(await runtime.run("Weather?"), { type: "completed" });
  assert.equal(provider.requests.length, 2);
  const history = runtime.getMessages();
  assert.deepEqual(history.slice(0, 2), [
    { type: "user_input", content: "Weather?" },
    { type: "model_output", toolCalls },
  ]);
  const result = history[2];
  assert.ok(result?.type === "tool_result");
  assert.equal(result.toolCallId, "call_weather");
  assert.equal(JSON.parse(result.content).error.code, "TOOL_NOT_FOUND");
  assert.deepEqual(provider.requests[1]?.messages[2], {
    role: "tool", toolCallId: result.toolCallId, content: result.content,
  });
});

for (const finishReason of ["length", "unknown"] as const) {
  test(`preserves output for ${finishReason} without retry or continuation`, async () => {
    const provider = new MockModelProvider([
      { message: { role: "assistant", content: "Partial answer" }, finishReason },
    ]);
    const runtime = new AgentRuntime(provider);

    assert.deepEqual(await runtime.run("Hello"), { type: "unsupported", finishReason });
    assert.equal(provider.requests.length, 1);
    assert.deepEqual(runtime.getMessages(), [
      { type: "user_input", content: "Hello" },
      { type: "model_output", content: "Partial answer" },
    ]);
  });
}

for (const failureMode of ["throw", "reject"] as const) {
  test(`propagates the original provider ${failureMode} without retry`, async () => {
    const error = new Error("Provider failed");
    let calls = 0;
    const provider: ModelProvider = {
      generate() {
        calls += 1;
        assert.deepEqual(runtime.getMessages(), [
          { type: "user_input", content: "Hello" },
        ]);
        if (failureMode === "throw") throw error;
        return Promise.reject(error);
      },
    };
    const runtime = new AgentRuntime(provider);

    await assert.rejects(runtime.run("Hello"), (actual: unknown) => actual === error);
    assert.equal(calls, 1);
    assert.deepEqual(runtime.getMessages(), [{ type: "user_input", content: "Hello" }]);
  });
}

test("history copies protect the array, messages, tool calls and nested arguments", async () => {
  const provider = new MockModelProvider([
    {
      message: {
        role: "assistant",
        content: "Checking",
        toolCalls: [
          { id: "call_weather", name: "get_weather", arguments: { location: { city: "Shanghai" } } },
        ],
      },
      finishReason: "tool_calls",
    },
    { message: { role: "assistant", content: "Done" }, finishReason: "stop" },
  ]);
  const runtime = new AgentRuntime(provider);
  await runtime.run("Weather?");
  const expected = runtime.getMessages();
  const history = runtime.getMessages();
  const user = history[0];
  const output = history[1];
  assert.ok(user?.type === "user_input");
  assert.ok(output?.type === "model_output");
  const call = output.toolCalls?.[0];
  assert.ok(call);

  user.content = "Changed";
  output.content = "Changed";
  call.name = "Changed";
  (call.arguments as { location: { city: string } }).location.city = "Changed";
  output.toolCalls?.pop();
  history.splice(0, history.length, { type: "user_input", content: "Injected" });

  assert.deepEqual(runtime.getMessages(), expected);
});

test("provider response and request references cannot mutate runtime facts", async () => {
  const response: ModelResponse = {
    message: {
      role: "assistant",
      toolCalls: [
        { id: "call_weather", name: "get_weather", arguments: { city: "Shanghai" } },
      ],
    },
    finishReason: "tool_calls",
  };
  const provider = new MockModelProvider([
    response,
    { message: { role: "assistant", content: "Done" }, finishReason: "stop" },
    { message: { role: "assistant", content: "Hi" }, finishReason: "stop" },
  ]);
  const runtime = new AgentRuntime(provider);
  await runtime.run("Weather?");
  const expected = runtime.getMessages();
  const responseCall = response.message.toolCalls?.[0];
  assert.ok(responseCall);
  (responseCall.arguments as { city: string }).city = "Changed response";
  assert.deepEqual(runtime.getMessages(), expected);

  // An explicit second run continues checking reference ownership.
  await runtime.run("Hello");
  const afterSecondRun = runtime.getMessages();
  const request = provider.requests[1];
  assert.ok(request);
  const assistant = request.messages[1];
  assert.ok(assistant?.role === "assistant");
  const requestCall = assistant.toolCalls?.[0];
  assert.ok(requestCall);
  assert.deepEqual(requestCall.arguments, { city: "Shanghai" });
  (requestCall.arguments as { city: string }).city = "Changed request";
  request.messages.length = 0;
  assert.deepEqual(runtime.getMessages(), afterSecondRun);
});
