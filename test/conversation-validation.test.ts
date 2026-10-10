import assert from "node:assert/strict";
import test from "node:test";
import { ConversationValidationError, validateConversation } from "../src/messages/validate-conversation.ts";
import { paired, call } from "./support/conversation-fixtures.ts";

const valid: [string, unknown][] = [
  ["empty", []],
  ["normal user/model", [{ type: "user_input", content: "hi" }, { type: "model_output", content: "hello" }]],
  ["provider failure user only", [{ type: "user_input", content: "hi" }]],
  ["consecutive users and empty model output", [{ type: "user_input", content: "a" }, { type: "user_input", content: "b" }, { type: "model_output" }, { type: "model_output", toolCalls: [] }]],
  ["paired opaque non-JSON result", paired()],
  ["multiple sequential calls", paired(["A", "B"])],
  ["separate complete batches", [...paired(), ...paired(["B"])]],
  ...["TOOL_CALL_CANCELLED", "TOOL_EXECUTION_SKIPPED", "TOOL_EXECUTION_FAILED"].map((code): [string, unknown] =>
    [code, paired(["A"], JSON.stringify({ success: false, error: { code, message: "failed" } }))]),
];
for (const [name, messages] of valid) test(`conversation accepts ${name} without mutation`, () => {
  const before = structuredClone(messages);
  validateConversation(messages);
  assert.deepEqual(messages, before);
});
const result = { type: "tool_result", toolCallId: "A", content: "opaque" };
const invalidProtocol: [string, unknown][] = [
  ["missing result", paired().slice(0, 2)],
  ["duplicate result", [...paired(), result]],
  ["orphan result", [result]],
  ["duplicate ID in batch", [{ type: "model_output", toolCalls: [call(), call()] }]],
  ["duplicate ID across batches", [...paired(), ...paired()]],
  ["interrupted batch", [...paired().slice(0, 2), { type: "user_input", content: "next" }, result]],
  ["cross batch pairing", [...paired().slice(0, 2), { type: "model_output", toolCalls: [call("B")] }, result]],
  ["wrong batch result", [...paired().slice(0, 2), { ...result, toolCallId: "B" }]],
];
for (const [name, messages] of invalidProtocol) test(`conversation rejects ${name} as protocol error`, () => {
  const before = structuredClone(messages);
  assert.throws(() => validateConversation(messages), (error: unknown) => error instanceof ConversationValidationError && error.kind === "protocol");
  assert.deepEqual(messages, before);
});
const circular: Record<string, unknown> = {}; circular.self = circular;
const invalidStructure: [string, unknown][] = [
  ["null history", null], ["object history", {}], ["null message", [null]],
  ["unknown type", [{ type: "other" }]], ["user missing content", [{ type: "user_input" }]],
  ["user wrong content", [{ type: "user_input", content: 1 }]],
  ["model wrong content", [{ type: "model_output", content: null }]],
  ["model wrong calls", [{ type: "model_output", toolCalls: {} }]],
  ["result wrong id", [{ ...result, toolCallId: 1 }]], ["result missing content", [{ type: "tool_result", toolCallId: "A" }]],
  ...[null, { ...call(), id: "" }, { ...call(), name: 1 }, { id: "A", name: "work" }].map((c, i): [string, unknown] => [`bad call ${i}`, [{ type: "model_output", toolCalls: [c] }]]),
  ...[undefined, NaN, Infinity, 1n, () => 1, Symbol("x"), new Date(), new Map(), circular, { value: undefined }, [, 1], Object.assign([], { extra: 1 })].map((args, i): [string, unknown] => [`non-JSON arguments ${i}`, [{ type: "model_output", toolCalls: [{ ...call(), arguments: args }] }]]),
];
for (const [name, messages] of invalidStructure) test(`conversation rejects ${name} as structure error`, () => {
  assert.throws(() => validateConversation(messages), (error: unknown) => error instanceof ConversationValidationError && error.kind === "structure");
});


test("conversation rejects symbol properties, accessors and custom array prototypes", () => {
  let getterCalls = 0;
  const args = Object.defineProperty({}, "value", { enumerable: true, get() { getterCalls++; return 1; } });
  for (const argumentsValue of [args, { [Symbol("hidden")]: 1 }, new (class extends Array<number> {})()]) {
    assert.throws(() => validateConversation([{ type: "model_output", toolCalls: [{ ...call(), arguments: argumentsValue }] }]), ConversationValidationError);
  }
  assert.equal(getterCalls, 0);
});
