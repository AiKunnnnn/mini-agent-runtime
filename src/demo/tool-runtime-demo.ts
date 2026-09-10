import type { ModelProvider } from "../model/model-provider.ts";
import { AgentRuntime } from "../runtime/agent-runtime.ts";
import { ToolRegistry } from "../tools/tool-registry.ts";
import type { Tool, ToolResult } from "../tools/tool.ts";

const add: Tool<{ a: number; b: number }> = {
  definition: {
    name: "add",
    description: "Add two numbers",
    parameters: {
      type: "object",
      properties: { a: { type: "number" }, b: { type: "number" } },
      required: ["a", "b"],
      additionalProperties: false,
    },
  },
  execute({ a, b }) {
    console.log(`Tool execute: add(${a}, ${b}) = ${a + b}`);
    return a + b;
  },
};
const registry = new ToolRegistry();
registry.register(add);

// Deterministic model substitute: no API, network or credentials. The second
// response is derived from the actual tool result received through the runtime.
let turns = 0;
const provider: ModelProvider = {
  async generate(request) {
    turns++;
    if (turns === 1) {
      if (!request.tools?.some((tool) => tool.name === "add")) {
        throw new Error("Demo expected add in ModelRequest.tools.");
      }
      console.log('Model turn 1: add {"a":2,"b":3}');
      return {
        message: { role: "assistant", toolCalls: [{ id: "call_add", name: "add", arguments: { a: 2, b: 3 } }] },
        finishReason: "tool_calls",
      };
    }
    const message = request.messages.at(-1);
    if (turns !== 2 || message?.role !== "tool" || message.toolCallId !== "call_add") {
      throw new Error("Demo expected the matching tool result on turn 2.");
    }
    const result = JSON.parse(message.content) as ToolResult;
    if (!result.success) throw new Error(result.error.message);
    console.log(`Model turn 2 received tool_result: ${message.content}`);
    const content = `2 + 3 = ${result.result}`;
    console.log(`Final answer: ${content}`);
    return { message: { role: "assistant", content }, finishReason: "stop" };
  },
};

console.log("Provider: deterministic demo (no external LLM)");
const runtime = new AgentRuntime(provider, { registry });
console.log("User: 2 + 3?");
const outcome = await runtime.run("2 + 3?");
console.log(`RunOutcome: ${JSON.stringify(outcome)}`);
console.log(`Model turns: ${turns}`);
console.log(`History: ${runtime.getMessages().map((message) => message.type).join(" -> ")}`);
