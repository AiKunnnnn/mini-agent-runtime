import type { ToolDefinition } from "../model/tool.ts";

export type ToolValue = null | boolean | number | string | ToolValue[] | { [key: string]: ToolValue };

export interface ToolExecutionOptions {
  signal?: AbortSignal;
}

/** parameters must describe TArgs; execute receives schema-validated input. */
export interface Tool<TArgs = unknown> {
  definition: ToolDefinition;
  execute: (args: TArgs, options?: ToolExecutionOptions) => ToolValue | Promise<ToolValue>;
}

export interface ToolError {
  code:
    | "TOOL_NOT_FOUND"
    | "INVALID_ARGUMENTS"
    | "TOOL_EXECUTION_FAILED"
    | "TOOL_EXECUTION_SKIPPED"
    | "TOOL_CALL_CANCELLED";
  message: string;
}

/** Serialized as JSON in the existing RuntimeToolMessage.content. */
export type ToolResult =
  | { success: true; result: ToolValue }
  | { success: false; error: ToolError };
