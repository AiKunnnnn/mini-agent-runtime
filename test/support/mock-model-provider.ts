import type { ModelProvider } from "../../src/model/model-provider.ts";
import type { ModelRequest, ModelResponse } from "../../src/model/model.ts";

export class MockModelProvider implements ModelProvider {
  readonly requests: ModelRequest[] = [];

  constructor(private readonly responses: readonly ModelResponse[]) {}

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const index = this.requests.length;
    this.requests.push(request);
    const response = this.responses[index];
    if (response === undefined) {
      throw new Error("MockModelProvider has no response for this call.");
    }
    return response;
  }
}
