import assert from "node:assert/strict";
import test from "node:test";
import type OpenAI from "openai";
import {
  fromOpenAICompletion,
  fromOpenAIFinishReason,
  fromOpenAIMessage,
  fromOpenAIUsage,
  toOpenAIMessage,
  toOpenAITools,
} from "../src/model/openai/mappings.ts";

test("maps provider-neutral model messages to OpenAI chat messages", () => {
  assert.deepEqual(
    toOpenAIMessage({
      role: "assistant",
      content: "Checking now.",
      toolCalls: [
        {
          id: "call_weather",
          name: "get_weather",
          arguments: { city: "Shanghai" },
        },
      ],
    }),
    {
      role: "assistant",
      content: "Checking now.",
      tool_calls: [
        {
          id: "call_weather",
          type: "function",
          function: {
            name: "get_weather",
            arguments: '{"city":"Shanghai"}',
          },
        },
      ],
    },
  );
});

test("maps provider-neutral tool definitions to OpenAI function tools", () => {
  assert.deepEqual(
    toOpenAITools([
      {
        name: "get_weather",
        description: "Get the current weather.",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    ]),
    [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather.",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"],
          },
        },
      },
    ],
  );
});

test("maps OpenAI assistant text to a Runtime assistant message", () => {
  const message = {
    role: "assistant",
    content: "Hello!",
    refusal: null,
  } as OpenAI.Chat.Completions.ChatCompletionMessage;

  assert.deepEqual(fromOpenAIMessage(message), {
    role: "assistant",
    content: "Hello!",
  });
});

test("maps an OpenAI function tool call and parses its arguments", () => {
  const message = {
    role: "assistant",
    content: null,
    refusal: null,
    tool_calls: [
      {
        id: "call_weather",
        type: "function",
        function: {
          name: "get_weather",
          arguments: '{"city":"Shanghai"}',
        },
      },
    ],
  } as OpenAI.Chat.Completions.ChatCompletionMessage;

  assert.deepEqual(fromOpenAIMessage(message), {
    role: "assistant",
    toolCalls: [
      {
        id: "call_weather",
        name: "get_weather",
        arguments: { city: "Shanghai" },
      },
    ],
  });
});

test("fails explicitly when OpenAI tool call arguments contain invalid JSON", () => {
  const message = {
    role: "assistant",
    content: null,
    refusal: null,
    tool_calls: [
      {
        id: "call_weather",
        type: "function",
        function: {
          name: "get_weather",
          arguments: '{"city":',
        },
      },
    ],
  } as OpenAI.Chat.Completions.ChatCompletionMessage;

  assert.throws(() => fromOpenAIMessage(message), SyntaxError);
});

test("maps known finish reasons and normalizes provider-specific reasons", () => {
  assert.equal(fromOpenAIFinishReason("stop"), "stop");
  assert.equal(fromOpenAIFinishReason("tool_calls"), "tool_calls");
  assert.equal(fromOpenAIFinishReason("length"), "length");
  assert.equal(fromOpenAIFinishReason("content_filter"), "unknown");
});

test("maps OpenAI usage to the Runtime usage model", () => {
  assert.deepEqual(
    fromOpenAIUsage({
      prompt_tokens: 12,
      completion_tokens: 5,
      total_tokens: 17,
    } as OpenAI.CompletionUsage),
    {
      inputTokens: 12,
      outputTokens: 5,
      totalTokens: 17,
    },
  );
});

test("maps a complete OpenAI response without leaking its raw shape", () => {
  const completion = {
    id: "chatcmpl_test",
    object: "chat.completion",
    created: 0,
    model: "test-model",
    choices: [
      {
        index: 0,
        finish_reason: "stop",
        logprobs: null,
        message: {
          role: "assistant",
          content: "Hello!",
          refusal: null,
        },
      },
    ],
    usage: {
      prompt_tokens: 4,
      completion_tokens: 2,
      total_tokens: 6,
    },
  } as OpenAI.Chat.Completions.ChatCompletion;

  assert.deepEqual(fromOpenAICompletion(completion), {
    message: { role: "assistant", content: "Hello!" },
    finishReason: "stop",
    usage: { inputTokens: 4, outputTokens: 2, totalTokens: 6 },
  });
});
