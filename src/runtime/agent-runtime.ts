import type { RuntimeAssistantMessage, RuntimeMessage } from "../messages/runtime-message.ts";
import type { ModelProvider } from "../model/model-provider.ts";
import type { FinishReason, ModelRequest } from "../model/model.ts";
import type { RuntimeState } from "./runtime-state.ts";
import { ContextBuilder } from "./context-builder.ts";
import { ToolRegistry } from "../tools/tool-registry.ts";
import { ToolExecutor } from "../tools/tool-executor.ts";
import type { ToolResult } from "../tools/tool.ts";

export type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: Exclude<FinishReason, "stop" | "tool_calls"> }
  | { type: "limit_reached"; maxTurns: number };

export interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
}

export class AgentRuntime {
  readonly #provider: ModelProvider;
  readonly #state: RuntimeState = { messages: [] };
  readonly #contextBuilder = new ContextBuilder();
  readonly #registry: ToolRegistry;
  readonly #executor: ToolExecutor;
  readonly #maxTurns: number;

  constructor(provider: ModelProvider, options: AgentRuntimeOptions = {}) {
    this.#provider = provider;
    this.#maxTurns = options.maxTurns ?? 5;
    if (!Number.isSafeInteger(this.#maxTurns) || this.#maxTurns < 1) {
      throw new RangeError("maxTurns must be a positive safe integer.");
    }
    this.#registry = options.registry ?? new ToolRegistry();
    this.#executor = new ToolExecutor(this.#registry);
  }

  /** Returns a detached copy, including nested tool call arguments. */
  getMessages(): RuntimeMessage[] {
    return structuredClone(this.#state.messages);
  }

  async run(userInput: string): Promise<RunOutcome> {
    this.#state.messages.push({ type: "user_input", content: userInput });

    for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1) {
      const snapshot = this.#contextBuilder.build({
        messages: this.#state.messages,
        tools: this.#registry.listDefinitions(),
      });
      const request: ModelRequest = snapshot;
      const response = await this.#provider.generate(request);
      const message = response.message;
      const output: RuntimeAssistantMessage = {
        type: "model_output",
        ...(message.content === undefined ? {} : { content: message.content }),
        ...(message.toolCalls === undefined
          ? {}
          : { toolCalls: structuredClone(message.toolCalls) }),
      };

      // A successful model output is a fact even when this run cannot continue.
      this.#state.messages.push(output);

      switch (response.finishReason) {
        case "stop":
          return { type: "completed" };
        case "tool_calls":
          if (output.toolCalls === undefined || output.toolCalls.length === 0) {
            throw new Error("tool_calls finish reason requires at least one ToolCall.");
          }
          if (currentTurn === this.#maxTurns) {
            const skipped: ToolResult = {
              success: false,
              error: {
                code: "TOOL_EXECUTION_SKIPPED",
                message: "Tool execution was skipped because maxTurns was reached.",
              },
            };
            for (const call of output.toolCalls) {
              this.#state.messages.push({
                type: "tool_result", toolCallId: call.id, content: JSON.stringify(skipped),
              });
            }
            return { type: "limit_reached", maxTurns: this.#maxTurns };
          }
          for (const call of output.toolCalls) {
            const result = await this.#executor.execute(call);
            this.#state.messages.push({
              type: "tool_result", toolCallId: call.id, content: JSON.stringify(result),
            });
          }
          break;
        case "length":
        case "unknown":
          return { type: "unsupported", finishReason: response.finishReason };
      }
    }
    throw new Error("AgentRuntime exhausted turns without returning an outcome.");
  }
}
