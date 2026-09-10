import { Ajv, type ValidateFunction } from "ajv";
import type { ToolCall } from "../model/tool.ts";
import type { ToolRegistry } from "./tool-registry.ts";
import type { ToolResult, ToolValue } from "./tool.ts";

export class ToolExecutor {
  // draft-07; no coercion, default insertion or removal of extra properties.
  readonly #validator = new Ajv({ strict: true, addUsedSchema: false });
  readonly #compiled = new Map<string, ValidateFunction>();

  constructor(private readonly registry: ToolRegistry) {}

  async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.registry.get(call.name);
    if (tool === undefined) {
      return { success: false, error: {
        code: "TOOL_NOT_FOUND", message: `Tool not found: ${call.name}`,
      } };
    }

    let validate = this.#compiled.get(call.name);
    if (validate === undefined) {
      validate = this.#validator.compile(tool.definition.parameters);
      if ("$async" in validate && validate.$async) {
        throw new Error("Async tool schemas are not supported.");
      }
      this.#compiled.set(call.name, validate);
    }
    // Detached input prevents tools from mutating the recorded model output.
    const args: unknown = structuredClone(call.arguments);
    if (!validate(args)) {
      return { success: false, error: {
        code: "INVALID_ARGUMENTS", message: this.#validator.errorsText(validate.errors),
      } };
    }

    let result: ToolValue;
    // Only tool invocation failures are normalized. Lookup, schema compilation,
    // validation and result serialization bugs deliberately propagate.
    try {
      result = await tool.execute(args);
    } catch (error) {
      return { success: false, error: {
        code: "TOOL_EXECUTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      } };
    }
    return { success: true, result };
  }
}
