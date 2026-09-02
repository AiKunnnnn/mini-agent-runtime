import type { ModelRequest, ModelResponse } from "./model.ts";

export interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
