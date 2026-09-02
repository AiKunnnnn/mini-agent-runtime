import type { ModelMessage } from "./model-message.ts";
import type { RuntimeMessage } from "./runtime-message.ts";

export function toModelMessage(message: RuntimeMessage): ModelMessage {
  switch (message.type) {
    case "user_input":
      return { role: "user", content: message.content };
    case "model_output":
      return {
        role: "assistant",
        ...(message.content === undefined ? {} : { content: message.content }),
        ...(message.toolCalls === undefined
          ? {}
          : { toolCalls: message.toolCalls }),
      };
    case "tool_result":
      return {
        role: "tool",
        toolCallId: message.toolCallId,
        content: message.content,
      };
  }
}
