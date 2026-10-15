import assert from "node:assert/strict";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { validateConversation } from "../messages/validate-conversation.ts";
import type { ModelProvider } from "../model/model-provider.ts";
import { AgentRuntime } from "../runtime/agent-runtime.ts";
import type { BeforeToolCallDecision, BeforeToolCallHook } from "../tools/before-tool-call.ts";
import { ToolRegistry } from "../tools/tool-registry.ts";
import type { Tool, ToolResult } from "../tools/tool.ts";

const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => arg !== "--allow" && arg !== "--deny")) {
  throw new Error("Usage: npm run demo:approval [-- --allow|--deny]");
}
const mode = args[0];
const terminal = mode === undefined ? createInterface({ input: stdin, output: stdout }) : undefined;

try {
  // All user input and approval interaction belong to this application.
  const input = terminal === undefined
    ? "发布一条演示公告"
    : (await terminal.question("公告标题（直接回车使用演示标题）：")).trim() || "发布一条演示公告";
  let hookCalls = 0;
  let toolCalls = 0;
  let turns = 0;
  let decision: BeforeToolCallDecision | undefined;

  const beforeToolCall: BeforeToolCallHook = async ({ toolCall, signal }) => {
    hookCalls++;
    console.log(`Application approval: ${toolCall.name} ${JSON.stringify(toolCall.arguments)}`);
    let resolvedDecision: BeforeToolCallDecision;
    if (terminal === undefined) {
      resolvedDecision = { type: mode === "--allow" ? "allow" : "deny" };
    } else {
      const answer = await terminal.question(
        "批准模拟发布？输入 y 批准，其他输入拒绝：",
        signal === undefined ? {} : { signal },
      );
      resolvedDecision = { type: answer.trim().toLowerCase() === "y" ? "allow" : "deny" };
    }
    decision = resolvedDecision;
    console.log(`Application decision: ${resolvedDecision.type}`);
    return resolvedDecision;
  };

  const publishNote: Tool<{ title: string }> = {
    definition: {
      name: "publish_note",
      description: "Simulate publishing a note after application approval",
      parameters: {
        type: "object",
        properties: { title: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
    execute({ title }) {
      toolCalls++;
      console.log(`Tool execute: simulated publication of ${title}`);
      return { published: true, title };
    },
  };
  const registry = new ToolRegistry();
  registry.register(publishNote);

  let finalAnswer: string | undefined;
  const provider: ModelProvider = {
    async generate(request) {
      turns++;
      if (turns === 1) {
        assert(request.tools?.some((tool) => tool.name === "publish_note"));
        assert.equal(request.messages.at(-1)?.content, input);
        console.log("Model turn 1: request publish_note");
        return {
          message: {
            role: "assistant",
            toolCalls: [{ id: "call_publish", name: "publish_note", arguments: { title: input } }],
          },
          finishReason: "tool_calls",
        };
      }
      const message = request.messages.at(-1);
      assert.equal(turns, 2);
      assert(message?.role === "tool");
      assert.equal(message.toolCallId, "call_publish");
      const result = JSON.parse(message.content) as ToolResult;
      console.log(`Model turn 2 received tool_result: ${message.content}`);
      if (result.success) {
        assert.deepEqual(result.result, { published: true, title: input });
        finalAnswer = `已模拟发布公告：${input}`;
      } else {
        assert.equal(result.error.code, "TOOL_EXECUTION_DENIED");
        finalAnswer = `公告未发布：${result.error.message}`;
      }
      return { message: { role: "assistant", content: finalAnswer }, finishReason: "stop" };
    },
  };

  console.log("Provider: deterministic demo (no external LLM, API or credentials)");
  console.log(`User: ${input}`);
  const runtime = new AgentRuntime(provider, { registry, beforeToolCall });
  const outcome = await runtime.run(input);
  assert.deepEqual(outcome, { type: "completed" });
  assert.equal(hookCalls, 1);
  assert.equal(toolCalls, decision?.type === "allow" ? 1 : 0);
  assert.equal(turns, 2);
  const history = runtime.getMessages();
  validateConversation(history);
  const results = history.filter((message) => message.type === "tool_result");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.toolCallId, "call_publish");
  assert.equal(history.at(-1)?.content, finalAnswer);
  console.log(`Final answer: ${finalAnswer}`);
  console.log(`RunOutcome: ${JSON.stringify(outcome)}`);
  console.log(`Verification passed: hook=${hookCalls}, tool=${toolCalls}, modelTurns=${turns}, pairedResults=${results.length}`);
} finally {
  terminal?.close();
}
