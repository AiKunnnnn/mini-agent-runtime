export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
