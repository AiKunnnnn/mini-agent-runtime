import type { ModelRequest, ModelResponse } from "./model.ts";

export interface ModelGenerationOptions {
  signal?: AbortSignal;
}

/** Provider-neutral proof that generation failed because this signal cancelled it. */
export class ModelGenerationCancelledError extends Error {
  constructor(
    readonly signal: AbortSignal,
    options: { cause: unknown },
  ) {
    super("Model generation was cancelled.", options);
    this.name = "ModelGenerationCancelledError";
  }
}

export interface ModelProvider {
  /** Adapters must translate provider-specific abort failures to ModelGenerationCancelledError. */
  generate(request: ModelRequest, options?: ModelGenerationOptions): Promise<ModelResponse>;
}
