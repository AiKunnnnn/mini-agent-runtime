import type { ModelRequest, ModelResponse } from "./model.ts";

export interface ModelGenerationOptions {
  signal?: AbortSignal;
}

export interface ModelProvider {
  generate(request: ModelRequest, options?: ModelGenerationOptions): Promise<ModelResponse>;
}
