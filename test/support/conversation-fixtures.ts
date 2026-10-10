import type { RuntimeMessage } from "../../src/messages/runtime-message.ts";
import type { ModelResponse } from "../../src/model/model.ts";

export const finalResponse: ModelResponse = { message: { role: "assistant", content: "Done" }, finishReason: "stop" };
export const call = (id = "A") => ({ id, name: "work", arguments: { nested: { value: 1 } } });
export const calling = (id = "A"): ModelResponse => ({ message: { role: "assistant", toolCalls: [call(id)] }, finishReason: "tool_calls" });
export function paired(ids = ["A"], content = "opaque result"): RuntimeMessage[] {
  return [
    { type: "user_input", content: "work" },
    { type: "model_output", toolCalls: ids.map(call) },
    ...ids.map((toolCallId): RuntimeMessage => ({ type: "tool_result", toolCallId, content })),
  ];
}
