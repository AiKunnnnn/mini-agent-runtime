import type OpenAI from "openai";
import type { AssistantMessage, ModelMessage } from "../../messages/model-message.ts";
import type {
  FinishReason,
  ModelRequest,
  ModelResponse,
  ModelUsage,
} from "../model.ts";
import type { ToolCall } from "../tool.ts";

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type OpenAITool = OpenAI.Chat.Completions.ChatCompletionTool;

function serializeArguments(value: unknown): string {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? "null" : serialized;
}

function parseArguments(value: string): unknown {
  return JSON.parse(value) as unknown;
}

export function toOpenAIMessage(message: ModelMessage): OpenAIMessage {
  switch (message.role) {
    case "user":
      return { role: "user", content: message.content };
    case "assistant":
      return {
        role: "assistant",
        content: message.content ?? null,
        ...(message.toolCalls === undefined
          ? {}
          : {
              tool_calls: message.toolCalls.map((toolCall) => ({
                id: toolCall.id,
                type: "function" as const,
                function: {
                  name: toolCall.name,
                  arguments: serializeArguments(toolCall.arguments),
                },
              })),
            }),
      };
    case "tool":
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      };
  }
}

export function toOpenAITools(
  tools: ModelRequest["tools"],
): OpenAITool[] | undefined {
  return tools?.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export function fromOpenAIToolCall(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall,
): ToolCall {
  if (toolCall.type !== "function") {
    throw new Error(`Unsupported OpenAI tool call type: ${toolCall.type}`);
  }

  return {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: parseArguments(toolCall.function.arguments),
  };
}

export function fromOpenAIMessage(
  message: OpenAI.Chat.Completions.ChatCompletionMessage,
): AssistantMessage {
  const content = message.content ?? undefined;
  const toolCalls = message.tool_calls?.map(fromOpenAIToolCall);

  return {
    role: "assistant",
    ...(content === undefined ? {} : { content }),
    ...(toolCalls === undefined ? {} : { toolCalls }),
  };
}

export function fromOpenAIFinishReason(
  reason: OpenAI.Chat.Completions.ChatCompletion.Choice["finish_reason"],
): FinishReason {
  switch (reason) {
    case "stop":
    case "tool_calls":
    case "length":
      return reason;
    default:
      return "unknown";
  }
}

export function fromOpenAIUsage(
  usage: OpenAI.CompletionUsage | undefined,
): ModelUsage | undefined {
  if (usage === undefined) {
    return undefined;
  }

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
  };
}

export function fromOpenAICompletion(
  completion: OpenAI.Chat.Completions.ChatCompletion,
): ModelResponse {
  const choice = completion.choices[0];
  if (choice === undefined) {
    throw new Error("OpenAI returned a completion without any choices.");
  }

  const usage = fromOpenAIUsage(completion.usage);
  return {
    message: fromOpenAIMessage(choice.message),
    finishReason: fromOpenAIFinishReason(choice.finish_reason),
    ...(usage === undefined ? {} : { usage }),
  };
}
