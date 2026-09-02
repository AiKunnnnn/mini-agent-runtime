import OpenAI from "openai";
import type { ModelProvider } from "../model-provider.ts";
import type { ModelRequest, ModelResponse } from "../model.ts";
import {
  fromOpenAICompletion,
  toOpenAIMessage,
  toOpenAITools,
} from "./mappings.ts";

export interface OpenAIModelProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export class OpenAIModelProvider implements ModelProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(config: OpenAIModelProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      ...(config.baseURL === undefined ? {} : { baseURL: config.baseURL }),
    });
    this.model = config.model;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const tools = toOpenAITools(request.tools);
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages.map(toOpenAIMessage),
      ...(tools === undefined ? {} : { tools }),
    });

    return fromOpenAICompletion(completion);
  }
}
