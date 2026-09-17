import type { RuntimeAssistantMessage, RuntimeToolMessage } from "../messages/runtime-message.ts";
import type { ToolCall } from "../model/tool.ts";
import type { RunOutcome } from "./agent-runtime.ts";

export type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | { type: "model_turn_completed"; message: RuntimeAssistantMessage }
  | { type: "tool_execution_started"; toolCall: ToolCall }
  | { type: "tool_execution_completed"; message: RuntimeToolMessage }
  | { type: "run_finished"; outcome: RunOutcome };

export type AgentEventSubscriber = (event: AgentEvent) => void;
