import type { ModelMessage } from "../messages/model-message.ts";
import type { RuntimeMessage } from "../messages/runtime-message.ts";
import { toModelMessage } from "../messages/to-model-message.ts";
import type { ToolDefinition } from "../model/tool.ts";

export interface ContextBuildInput {
  messages: readonly RuntimeMessage[];
  tools: readonly ToolDefinition[];
}

/** The complete model input determined before one model turn begins. */
export interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

export class ContextBuilder {
  build(input: ContextBuildInput): TurnSnapshot {
    // Mapping may retain nested references; detach the entire projection.
    return structuredClone({
      messages: input.messages.map(toModelMessage),
      ...(input.tools.length === 0 ? {} : { tools: [...input.tools] }),
    });
  }
}
