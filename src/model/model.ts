import type { AssistantMessage, ModelMessage } from "../messages/model-message.ts";
import type { ToolDefinition } from "./tool.ts";

export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

export type FinishReason = "stop" | "tool_calls" | "length" | "unknown";

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelResponse {
  message: AssistantMessage;
  finishReason: FinishReason;
  usage?: ModelUsage;
}
