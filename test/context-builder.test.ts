import assert from "node:assert/strict";
import test from "node:test";
import type { RuntimeMessage } from "../src/messages/runtime-message.ts";
import { ContextBuilder } from "../src/runtime/context-builder.ts";
import { ToolRegistry } from "../src/tools/tool-registry.ts";

function history(): RuntimeMessage[] {
  return [
    { type: "user_input", content: "Weather?" },
    { type: "model_output", content: "Checking", toolCalls: [
      { id: "weather-1", name: "weather", arguments: { location: { city: "Shanghai" } } },
    ] },
    { type: "tool_result", toolCallId: "weather-1", content: '{"success":true,"result":"Sunny"}' },
    { type: "model_output", content: "Sunny" },
    { type: "model_output", toolCalls: [] },
  ];
}

test("projects all message kinds in order, preserving optional fields and call/result pairing", () => {
  const snapshot = new ContextBuilder().build({ messages: history(), tools: [] });
  assert.deepEqual(snapshot, { messages: [
    { role: "user", content: "Weather?" },
    { role: "assistant", content: "Checking", toolCalls: [
      { id: "weather-1", name: "weather", arguments: { location: { city: "Shanghai" } } },
    ] },
    { role: "tool", toolCallId: "weather-1", content: '{"success":true,"result":"Sunny"}' },
    { role: "assistant", content: "Sunny" },
    { role: "assistant", toolCalls: [] },
  ] });
  assert.equal(Object.hasOwn(snapshot, "tools"), false);
});

test("snapshot array, messages, calls and nested arguments cannot mutate input history", () => {
  const messages = history();
  const expected = structuredClone(messages);
  const snapshot = new ContextBuilder().build({ messages, tools: [] });
  const user = snapshot.messages[0];
  const assistant = snapshot.messages[1];
  const result = snapshot.messages[2];
  assert.ok(user?.role === "user");
  assert.ok(assistant?.role === "assistant");
  assert.ok(result?.role === "tool");
  const call = assistant.toolCalls?.[0];
  assert.ok(call);
  user.content = "Changed";
  assistant.content = "Changed";
  call.id = "Changed";
  (call.arguments as { location: { city: string } }).location.city = "Changed";
  assistant.toolCalls?.pop();
  result.toolCallId = "Changed";
  result.content = "Changed";
  snapshot.messages.splice(0);
  assert.deepEqual(messages, expected);
});

test("later input mutations and builds leave an earlier snapshot unchanged", () => {
  const messages = history();
  const builder = new ContextBuilder();
  const snapshot = builder.build({ messages, tools: [] });
  const expected = structuredClone(snapshot);
  const assistant = messages[1];
  assert.ok(assistant?.type === "model_output");
  const call = assistant.toolCalls?.[0];
  assert.ok(call);
  (call.arguments as { location: { city: string } }).location.city = "Beijing";
  messages.push({ type: "user_input", content: "Again" });
  const next = builder.build({ messages, tools: [] });
  assert.equal(next.messages.length, messages.length);
  assert.notDeepEqual(next, snapshot);
  next.messages.length = 0;
  assert.deepEqual(snapshot, expected);
});

test("snapshot tools match the registry and isolate definitions and nested schemas in both directions", () => {
  const registry = new ToolRegistry();
  registry.register({
    definition: {
      name: "weather", description: "Get weather",
      parameters: {
        type: "object", properties: { city: { type: "string" } }, required: ["city"],
      },
    },
    execute: () => "Sunny",
  });
  const tools = registry.listDefinitions();
  const expected = structuredClone(tools);
  const builder = new ContextBuilder();
  const snapshot = builder.build({ messages: [], tools });
  const earlier = builder.build({ messages: [], tools });
  assert.deepEqual(snapshot.tools, expected);
  const definition = snapshot.tools?.[0];
  assert.ok(definition);
  definition.name = "Changed";
  definition.description = "Changed";
  (definition.parameters.properties as { city: { type: string } }).city.type = "number";
  (definition.parameters.required as string[]).push("extra");
  snapshot.tools?.pop();
  assert.deepEqual(tools, expected);
  assert.deepEqual(registry.listDefinitions(), expected);

  tools[0]!.description = "Later change";
  (tools[0]!.parameters.properties as { city: { type: string } }).city.type = "boolean";
  tools.length = 0;
  registry.register({
    definition: { name: "second", description: "Another tool", parameters: { type: "object" } },
    execute: () => "Done",
  });
  assert.deepEqual(earlier.tools, expected);
});
