import type { ToolCall } from "../model/tool.ts";

export type BeforeToolCallDecision =
  | Readonly<{ type: "allow" }>
  | Readonly<{ type: "deny" }>;

export interface BeforeToolCallContext {
  /** A detached copy of the schema-validated call, isolated from execution input. */
  readonly toolCall: Readonly<ToolCall>;
  readonly signal?: AbortSignal;
}

/** Application authorization; async handlers may wait for human approval. */
export type BeforeToolCallHook = (
  context: BeforeToolCallContext,
) => BeforeToolCallDecision | Promise<BeforeToolCallDecision>;
