import type { RuntimeAssistantMessage, RuntimeMessage } from "../messages/runtime-message.ts";
import { toModelMessage } from "../messages/to-model-message.ts";
import type { ModelProvider } from "../model/model-provider.ts";
import type { FinishReason, ModelRequest } from "../model/model.ts";
import type { RuntimeState } from "./runtime-state.ts";

export type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: Exclude<FinishReason, "stop"> };

export class AgentRuntime {
  readonly #provider: ModelProvider;
  readonly #state: RuntimeState = { messages: [] };

  constructor(provider: ModelProvider) {
    this.#provider = provider;
  }

  /** Returns a detached copy, including nested tool call arguments. */
  getMessages(): RuntimeMessage[] {
    return structuredClone(this.#state.messages);
  }

  async run(userInput: string): Promise<RunOutcome> {
    this.#state.messages.push({ type: "user_input", content: userInput });

    // The provider receives a model view without mutable references to state.
    const request: ModelRequest = {
      messages: this.getMessages().map(toModelMessage),
    };
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
      case "length":
      case "unknown":
        return { type: "unsupported", finishReason: response.finishReason };
    }
  }
}
