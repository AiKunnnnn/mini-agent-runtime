import type { ToolCall } from "../model/tool.ts";

export interface RuntimeUserMessage {
  type: "user_input";
  content: string;
}

export interface RuntimeAssistantMessage {
  type: "model_output";
  content?: string;
  toolCalls?: ToolCall[];
}

export interface RuntimeToolMessage {
  type: "tool_result";
  toolCallId: string;
  content: string;
}

export type RuntimeMessage =
  | RuntimeUserMessage
  | RuntimeAssistantMessage
  | RuntimeToolMessage;
