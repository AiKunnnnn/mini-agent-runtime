import { Ajv, type ValidateFunction } from "ajv";
import type { ToolCall } from "../model/tool.ts";
import type { ToolRegistry } from "./tool-registry.ts";
import type { ToolExecutionOptions, ToolResult, ToolValue } from "./tool.ts";
import type {
  BeforeToolCallContext,
  BeforeToolCallDecision,
  BeforeToolCallHook,
} from "./before-tool-call.ts";

/** Marks cancellation observed at pre-execution authorization or Tool invocation,
 * attributed to the caller's original signal rather than an unrelated failure.
 */
export class ToolExecutionCancelledError extends Error {
  constructor(
    readonly signal: AbortSignal,
    options: { cause: unknown },
  ) {
    super("Tool execution was cancelled.", options);
    this.name = "ToolExecutionCancelledError";
  }
}

export interface ToolExecutorOptions {
  beforeToolCall?: BeforeToolCallHook;
}

// Internal settlement only; the application still returns just allow or deny.
type AuthorizationSettlement = BeforeToolCallDecision | { type: "failed" };

function authorizationDecision(value: unknown): AuthorizationSettlement {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const type: unknown = (value as { type?: unknown }).type;
    if (type === "allow" || type === "deny") return { type };
  }
  return { type: "failed" };
}

export class ToolExecutor {
  // draft-07; no coercion, default insertion or removal of extra properties.
  readonly #validator = new Ajv({ strict: true, addUsedSchema: false });
  readonly #compiled = new Map<string, ValidateFunction>();
  readonly #beforeToolCall: BeforeToolCallHook | undefined;

  constructor(private readonly registry: ToolRegistry, options: ToolExecutorOptions = {}) {
    this.#beforeToolCall = options.beforeToolCall;
  }

  #authorize(hook: BeforeToolCallHook, context: BeforeToolCallContext): Promise<AuthorizationSettlement> {
    const signal = context.signal;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (decision: AuthorizationSettlement): void => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        resolve(decision);
      };
      const abort = (): void => {
        if (settled || signal === undefined) return;
        settled = true;
        signal.removeEventListener("abort", abort);
        reject(new ToolExecutionCancelledError(signal, { cause: signal.reason }));
      };
      const accept = (value: unknown): void => {
        if (settled) return;
        try {
          finish(authorizationDecision(value));
        } catch {
          // A malformed decision (including a throwing getter) fails closed.
          finish({ type: "failed" });
        }
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
      try {
        const value = hook(context);
        if (
          value !== null
          && (typeof value === "object" || typeof value === "function")
          && typeof (value as { then?: unknown }).then === "function"
        ) {
          // Always observe rejection, even if the hook synchronously aborted.
          // The first accepted settlement owns attribution; late outcomes do nothing.
          void Promise.resolve(value).then(accept, () => finish({ type: "failed" }));
        } else {
          accept(value);
        }
      } catch {
        // Only the hook boundary is normalized, never lookup/validation internals.
        finish({ type: "failed" });
      }
    });
  }

  async execute(call: ToolCall, options?: ToolExecutionOptions): Promise<ToolResult> {
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

    if (this.#beforeToolCall !== undefined) {
      // A second copy isolates hook mutations from both history and execution.
      // Copy failures remain executor bugs, outside the hook error boundary.
      const toolCall: ToolCall = structuredClone({ id: call.id, name: call.name, arguments: args });
      const decision = await this.#authorize(this.#beforeToolCall, {
        toolCall,
        ...(options?.signal === undefined ? {} : { signal: options.signal }),
      });
      if (decision.type === "deny") {
        return { success: false, error: {
          code: "TOOL_EXECUTION_DENIED", message: "Tool execution was denied.",
        } };
      }
      if (decision.type === "failed") {
        return { success: false, error: {
          code: "TOOL_PRE_EXECUTION_FAILED", message: "Pre-execution authorization failed.",
        } };
      }
    }
    // Allow is authorization, not permission to ignore cancellation. Do this
    // immediately before invocation, without an intervening async boundary.
    if (options?.signal?.aborted) {
      throw new ToolExecutionCancelledError(options.signal, { cause: options.signal.reason });
    }

    let result: ToolValue;
    // Only tool invocation failures are normalized. Lookup, schema compilation,
    // validation and result serialization bugs deliberately propagate.
    try {
      result = await tool.execute(args, options);
    } catch (error) {
      if (options?.signal?.aborted && error === options.signal.reason) {
        throw new ToolExecutionCancelledError(options.signal, { cause: error });
      }
      return { success: false, error: {
        code: "TOOL_EXECUTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      } };
    }
    return { success: true, result };
  }
}
