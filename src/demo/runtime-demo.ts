import "dotenv/config";

import { OpenAIModelProvider } from "../model/openai/openai-model-provider.ts";
import { AgentRuntime } from "../runtime/agent-runtime.ts";

const apiKey = process.env.OPENAI_API_KEY;
if (apiKey === undefined || apiKey.length === 0) {
  throw new Error("OPENAI_API_KEY is required to run the Runtime demo.");
}

const provider = new OpenAIModelProvider({
  apiKey,
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  ...(process.env.OPENAI_BASE_URL === undefined
    ? {}
    : { baseURL: process.env.OPENAI_BASE_URL }),
});
const runtime = new AgentRuntime(provider);

for (const input of ["我叫小明，请简短回复。", "我叫什么名字？请简短回复。"]) {
  console.log(`\nUser: ${input}`);
  const outcome = await runtime.run(input);
  console.log("RunOutcome:", JSON.stringify(outcome, null, 2));
  console.log("Runtime history:", JSON.stringify(runtime.getMessages(), null, 2));
  if (outcome.type !== "completed") {
    console.log("当前运行无法继续，Demo 在此结束。");
    break;
  }
}
