import "dotenv/config";

import { toModelMessage } from "../messages/to-model-message.ts";
import type { RuntimeMessage } from "../messages/runtime-message.ts";
import type { ModelRequest } from "../model/model.ts";
import { OpenAIModelProvider } from "../model/openai/openai-model-provider.ts";

const apiKey = process.env.OPENAI_API_KEY;
if (apiKey === undefined || apiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required to run the OpenAI demo.");
}

const runtimeMessages: RuntimeMessage[] = [
  {
    type: "user_input",
    content: "Say hello in one short sentence.",
  },
];

const request: ModelRequest = {
  messages: runtimeMessages.map(toModelMessage),
};

const provider = new OpenAIModelProvider({
  apiKey,
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  ...(process.env.OPENAI_BASE_URL === undefined
    ? {}
    : { baseURL: process.env.OPENAI_BASE_URL }),
});

const response = await provider.generate(request);
console.log(JSON.stringify(response, null, 2));
