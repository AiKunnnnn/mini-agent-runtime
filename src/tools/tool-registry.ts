import type { ToolDefinition } from "../model/tool.ts";
import type { Tool } from "./tool.ts";

export class ToolRegistry {
  readonly #tools = new Map<string, Tool>();

  register<TArgs>(tool: Tool<TArgs>): void {
    const definition = structuredClone(tool.definition);
    if (this.#tools.has(definition.name)) {
      throw new Error(`Tool already registered: ${definition.name}`);
    }
    const execute = tool.execute.bind(tool);
    this.#tools.set(definition.name, {
      definition,
      // Heterogeneous registry erases TArgs. Only call after validating against
      // this entry's parameters; ToolExecutor owns that boundary.
      execute: (args) => execute(args as TArgs),
    });
  }

  get(name: string): Tool | undefined {
    const tool = this.#tools.get(name);
    return tool === undefined ? undefined : {
      definition: structuredClone(tool.definition),
      execute: tool.execute,
    };
  }

  listDefinitions(): ToolDefinition[] {
    return [...this.#tools.values()].map((tool) => structuredClone(tool.definition));
  }
}
