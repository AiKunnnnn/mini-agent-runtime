import type {
  RuntimeAssistantMessage,
  RuntimeMessage,
  RuntimeToolMessage,
} from "../messages/runtime-message.ts";
import type { ModelProvider } from "../model/model-provider.ts";
import type { FinishReason, ModelRequest } from "../model/model.ts";
import type { AgentEvent, AgentEventSubscriber } from "./agent-event.ts";
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
  readonly #subscribers = new Set<AgentEventSubscriber>();

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

  subscribe(subscriber: AgentEventSubscriber): () => void {
    this.#subscribers.add(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
    };
  }

  #emit(event: AgentEvent): void {
    for (const subscriber of [...this.#subscribers]) {
      try {
        subscriber(structuredClone(event));
      } catch {
        // Observation failures do not affect runtime execution or other subscribers.
      }
    }
  }

  #finish(outcome: RunOutcome): RunOutcome {
    this.#emit({ type: "run_finished", outcome });
    return outcome;
  }

  async run(userInput: string): Promise<RunOutcome> {
    this.#state.messages.push({ type: "user_input", content: userInput });
    this.#emit({ type: "run_started" });

    for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1) {
      const snapshot = this.#contextBuilder.build({
        messages: this.#state.messages,
        tools: this.#registry.listDefinitions(),
      });
      const request: ModelRequest = snapshot;
      this.#emit({ type: "model_turn_started" });
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
      this.#emit({ type: "model_turn_completed", message: output });

      switch (response.finishReason) {
        case "stop":
          return this.#finish({ type: "completed" });
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
            return this.#finish({ type: "limit_reached", maxTurns: this.#maxTurns });
          }
          for (const call of output.toolCalls) {
            this.#emit({ type: "tool_execution_started", toolCall: call });
            const result = await this.#executor.execute(call);
            const toolMessage: RuntimeToolMessage = {
              type: "tool_result", toolCallId: call.id, content: JSON.stringify(result),
            };
            this.#state.messages.push(toolMessage);
            this.#emit({ type: "tool_execution_completed", message: toolMessage });
          }
          break;
        case "length":
        case "unknown":
          return this.#finish({ type: "unsupported", finishReason: response.finishReason });
      }
    }
    throw new Error("AgentRuntime exhausted turns without returning an outcome.");
  }
}
