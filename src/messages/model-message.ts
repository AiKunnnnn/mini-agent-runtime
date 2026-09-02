import type { ToolCall } from "../model/tool.ts";

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content?: string;
  toolCalls?: ToolCall[];
}

export interface ToolMessage {
  role: "tool";
  toolCallId: string;
  content: string;
}

export type ModelMessage = UserMessage | AssistantMessage | ToolMessage;
