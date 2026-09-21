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
import { ToolExecutionCancelledError, ToolExecutor } from "../tools/tool-executor.ts";
import type { ToolResult } from "../tools/tool.ts";

export type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: Exclude<FinishReason, "stop" | "tool_calls"> }
  | { type: "limit_reached"; maxTurns: number }
  | { type: "aborted" };

export interface RunOptions {
  signal?: AbortSignal;
}

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
  #active = false;

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

  #appendCancelledToolCalls(calls: readonly { id: string }[]): void {
    const cancelled: ToolResult = {
      success: false,
      error: {
        code: "TOOL_CALL_CANCELLED",
        message: "Tool call did not complete because the run was cancelled.",
      },
    };
    for (const call of calls) {
      this.#state.messages.push({
        type: "tool_result",
        toolCallId: call.id,
        content: JSON.stringify(cancelled),
      });
    }
  }

  async run(userInput: string, options: RunOptions = {}): Promise<RunOutcome> {
    if (this.#active) {
      throw new Error("AgentRuntime already has an active run.");
    }
    this.#active = true;

    try {
      return await this.#run(userInput, options.signal);
    } finally {
      this.#active = false;
    }
  }

  async #run(userInput: string, signal?: AbortSignal): Promise<RunOutcome> {
    if (signal?.aborted) return { type: "aborted" };

    this.#state.messages.push({ type: "user_input", content: userInput });
    this.#emit({ type: "run_started" });

    for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1) {
      if (signal?.aborted) return this.#finish({ type: "aborted" });
      const snapshot = this.#contextBuilder.build({
        messages: this.#state.messages,
        tools: this.#registry.listDefinitions(),
      });
      const request: ModelRequest = snapshot;
      this.#emit({ type: "model_turn_started" });
      if (signal?.aborted) return this.#finish({ type: "aborted" });
      let response;
      try {
        response = await this.#provider.generate(
          request,
          signal === undefined ? undefined : { signal },
        );
      } catch (error) {
        if (signal?.aborted) return this.#finish({ type: "aborted" });
        throw error;
      }
      if (signal?.aborted) return this.#finish({ type: "aborted" });
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
          if (signal?.aborted) {
            this.#appendCancelledToolCalls(output.toolCalls);
            return this.#finish({ type: "aborted" });
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
          for (let index = 0; index < output.toolCalls.length; index += 1) {
            const call = output.toolCalls[index];
            if (call === undefined) throw new Error("ToolCall index is out of bounds.");
            if (signal?.aborted) {
              this.#appendCancelledToolCalls(output.toolCalls.slice(index));
              return this.#finish({ type: "aborted" });
            }
            this.#emit({ type: "tool_execution_started", toolCall: call });
            if (signal?.aborted) {
              this.#appendCancelledToolCalls(output.toolCalls.slice(index));
              return this.#finish({ type: "aborted" });
            }
            let result: ToolResult;
            try {
              result = await this.#executor.execute(
                call,
                signal === undefined ? undefined : { signal },
              );
            } catch (error) {
              if (error instanceof ToolExecutionCancelledError) {
                this.#appendCancelledToolCalls(output.toolCalls.slice(index));
                return this.#finish({ type: "aborted" });
              }
              throw error;
            }
            const toolMessage: RuntimeToolMessage = {
              type: "tool_result", toolCallId: call.id, content: JSON.stringify(result),
            };
            this.#state.messages.push(toolMessage);
            this.#emit({ type: "tool_execution_completed", message: toolMessage });
            if (signal?.aborted) {
              this.#appendCancelledToolCalls(output.toolCalls.slice(index + 1));
              return this.#finish({ type: "aborted" });
            }
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
