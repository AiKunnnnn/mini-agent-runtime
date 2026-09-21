import type {
  ModelGenerationOptions,
  ModelProvider,
} from "../../src/model/model-provider.ts";
import type { ModelRequest, ModelResponse } from "../../src/model/model.ts";

export class MockModelProvider implements ModelProvider {
  readonly requests: ModelRequest[] = [];
  readonly options: (ModelGenerationOptions | undefined)[] = [];

  constructor(private readonly responses: readonly ModelResponse[]) {}

  async generate(
    request: ModelRequest,
    options?: ModelGenerationOptions,
  ): Promise<ModelResponse> {
    const index = this.requests.length;
    this.requests.push(request);
    this.options.push(options);
    const response = this.responses[index];
    if (response === undefined) {
      throw new Error("MockModelProvider has no response for this call.");
    }
    return response;
  }
}
