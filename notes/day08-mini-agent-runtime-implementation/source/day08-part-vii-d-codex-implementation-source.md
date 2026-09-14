# Day08 / Part VII-D：Codex 实现、测试与 Debug 源记录

- 来源：本 Codex 实现任务的实际代码、提交 diff、命令输出与归档复验。
- 归档日期：2026-09-14。
- 代码基线：`92dd6d8bebcf0ffabacdba4da56e7d1f870735f7`。
- 正式笔记：[ContextBuilder + TurnSnapshot](../day08-part-vii-d-context-builder-turn-snapshot.md)。
- ChatGPT 学习／Review 过程以[原始完整会话](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6aa26628-b1dc-83ee-b566-4df8c1a0c660)为准；完整页面正文另存架构 source 与 Review source；本文件是工程证据整理，不是逐字 Codex 会话导出。

## 1. 实现任务与真实起点

用户提供 D-AD01～D-AD06、Required Implementation、Acceptance Criteria 与 Scope Guard。Codex 先读取当前目录、消息 mapping、Runtime Loop、Registry clone 行为、测试与 scripts，确认 VII-C 为 45 项测试基线。

起点请求路径为：

```text
getMessages()
→ map(toModelMessage)
→ listDefinitions()
→ ModelRequest
→ generate()
```

RuntimeState 已经是 messages-only，且 AgentRuntime 为唯一 mutation owner。本轮没有重建这些边界。

## 2. 实际实现

新增 `src/runtime/context-builder.ts`，在同一文件定义两个最小类型和一个无状态 class。`build()` 使用既有 `toModelMessage()`，空工具列表时省略 tools，并对完整结果执行 `structuredClone()`。

`AgentRuntime` 新增私有 Builder，在每次 Model Turn 的 for 循环内执行：

```ts
const snapshot = this.#contextBuilder.build({
  messages: this.#state.messages,
  tools: this.#registry.listDefinitions(),
});
const request: ModelRequest = snapshot;
```

Builder 没有接管 generate、State 写入、Tool 执行、maxTurns 或 termination。

## 3. 测试实现

新增四项 ContextBuilder 测试：

1. 三种消息类型、顺序、optional field、Call / Result ID 与空 tools。
2. 修改 Snapshot 数组、消息、call 与嵌套 arguments 不污染输入 history。
3. 修改来源并再次 build 不改变旧 Snapshot。
4. tools／Registry definitions／嵌套 JSON Schema 双向隔离。

Tool Runtime 增加一项集成测试：工具执行时动态注册 `second`；第二 Model Turn 必须看到 Tool Result 和最新两项 definitions。随后修改第一轮 request，第二轮 request 和 Runtime history 保持不变。

## 4. Debug 记录

可取得的交付报告和归档复验没有本地失败记录；这不能证明未留存的开发尝试从未失败。可核对的 Debug 重点是识别浅复制不能满足 Snapshot semantics：单条 mapping 与 tools array copy 仍可能共享嵌套 arguments／Schema。实现因此 clone 整个投影，测试通过主动 mutation 保护该边界。

Review 观察到 Registry 与 Builder 对 definitions 存在双重 clone。当前没有性能证据要求优化，且两层分别保护 Registry API 与 Snapshot API，因此保留。

ChatGPT Review 隔离环境因 ZIP 不含依赖而出现 `tsx: not found`，该结果不属于仓库代码失败。本次归档已在真实工作区独立复验。

## 5. `package.json` 判断

没有修改 `package.json`。现有 `tsx --test test/**/*.test.ts` 已纳入新增测试文件。为了验证功能需要新增测试内容，不需要新增等价 npm script。

项目仍采用显式命令对 test sources 做额外严格 TypeScript 检查；本 Milestone 没有把它新增为 script。

## 6. 2026-09-14 归档复验

### `npm test`

退出码 0：

```text
1..50
# tests 50
# suites 0
# pass 50
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 374.509083
```

### `npm run build`

退出码 0：

```text
> mini-agent-runtime@0.1.0 build
> tsc -p tsconfig.json
```

### 额外严格测试类型检查

命令：

```bash
./node_modules/.bin/tsc --noEmit --target ES2022 \
  --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --strict --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

无输出，退出码 0。

### `npm run demo:tools`

退出码 0：

```text
Provider: deterministic demo (no external LLM)
User: 2 + 3?
Model turn 1: add {"a":2,"b":3}
Tool execute: add(2, 3) = 5
Model turn 2 received tool_result: {"success":true,"result":5}
Final answer: 2 + 3 = 5
RunOutcome: {"type":"completed"}
Model turns: 2
History: user_input -> model_output -> tool_result -> model_output
```

## 7. Scope 结果

- RuntimeState schema 未修改。
- Provider／Adapter／Registry／Executor contract 未重构。
- VII-C Tool Loop、errors、maxTurns、skipped 与 malformed invariant 未改语义。
- 未新增依赖。
- 未实现 trimming、Token、Summary、Compaction、Memory、RAG、Policy、Event、Abort、Store、Approval、Retry 或并行工具。
- 提交中的 `source-review.zip` 更新为交付物变化，不参与 Runtime 功能。


## 8. 可复核的实现 diff

以下为 `git diff 64952ee 92dd6d8 -- src/runtime/context-builder.ts src/runtime/agent-runtime.ts test/context-builder.test.ts test/tool-runtime.test.ts` 的文本输出。它保留最终改动，不能用来推断未记录的中间尝试。二进制交付 ZIP 未嵌入。

```diff
diff --git a/src/runtime/agent-runtime.ts b/src/runtime/agent-runtime.ts
index 3d25807..8fd8f73 100644
--- a/src/runtime/agent-runtime.ts
+++ b/src/runtime/agent-runtime.ts
@@ -1,8 +1,8 @@
 import type { RuntimeAssistantMessage, RuntimeMessage } from "../messages/runtime-message.ts";
-import { toModelMessage } from "../messages/to-model-message.ts";
 import type { ModelProvider } from "../model/model-provider.ts";
 import type { FinishReason, ModelRequest } from "../model/model.ts";
 import type { RuntimeState } from "./runtime-state.ts";
+import { ContextBuilder } from "./context-builder.ts";
 import { ToolRegistry } from "../tools/tool-registry.ts";
 import { ToolExecutor } from "../tools/tool-executor.ts";
 import type { ToolResult } from "../tools/tool.ts";
@@ -20,6 +20,7 @@ export interface AgentRuntimeOptions {
 export class AgentRuntime {
   readonly #provider: ModelProvider;
   readonly #state: RuntimeState = { messages: [] };
+  readonly #contextBuilder = new ContextBuilder();
   readonly #registry: ToolRegistry;
   readonly #executor: ToolExecutor;
   readonly #maxTurns: number;
@@ -43,12 +44,11 @@ export class AgentRuntime {
     this.#state.messages.push({ type: "user_input", content: userInput });
 
     for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1) {
-      // The provider receives a model view without mutable references to state.
-      const definitions = this.#registry.listDefinitions();
-      const request: ModelRequest = {
-        messages: this.getMessages().map(toModelMessage),
-        ...(definitions.length === 0 ? {} : { tools: definitions }),
-      };
+      const snapshot = this.#contextBuilder.build({
+        messages: this.#state.messages,
+        tools: this.#registry.listDefinitions(),
+      });
+      const request: ModelRequest = snapshot;
       const response = await this.#provider.generate(request);
       const message = response.message;
       const output: RuntimeAssistantMessage = {
diff --git a/src/runtime/context-builder.ts b/src/runtime/context-builder.ts
new file mode 100644
index 0000000..2d95206
--- /dev/null
+++ b/src/runtime/context-builder.ts
@@ -0,0 +1,25 @@
+import type { ModelMessage } from "../messages/model-message.ts";
+import type { RuntimeMessage } from "../messages/runtime-message.ts";
+import { toModelMessage } from "../messages/to-model-message.ts";
+import type { ToolDefinition } from "../model/tool.ts";
+
+export interface ContextBuildInput {
+  messages: readonly RuntimeMessage[];
+  tools: readonly ToolDefinition[];
+}
+
+/** The complete model input determined before one model turn begins. */
+export interface TurnSnapshot {
+  messages: ModelMessage[];
+  tools?: ToolDefinition[];
+}
+
+export class ContextBuilder {
+  build(input: ContextBuildInput): TurnSnapshot {
+    // Mapping may retain nested references; detach the entire projection.
+    return structuredClone({
+      messages: input.messages.map(toModelMessage),
+      ...(input.tools.length === 0 ? {} : { tools: [...input.tools] }),
+    });
+  }
+}
diff --git a/test/context-builder.test.ts b/test/context-builder.test.ts
new file mode 100644
index 0000000..78fb464
--- /dev/null
+++ b/test/context-builder.test.ts
@@ -0,0 +1,109 @@
+import assert from "node:assert/strict";
+import test from "node:test";
+import type { RuntimeMessage } from "../src/messages/runtime-message.ts";
+import { ContextBuilder } from "../src/runtime/context-builder.ts";
+import { ToolRegistry } from "../src/tools/tool-registry.ts";
+
+function history(): RuntimeMessage[] {
+  return [
+    { type: "user_input", content: "Weather?" },
+    { type: "model_output", content: "Checking", toolCalls: [
+      { id: "weather-1", name: "weather", arguments: { location: { city: "Shanghai" } } },
+    ] },
+    { type: "tool_result", toolCallId: "weather-1", content: '{"success":true,"result":"Sunny"}' },
+    { type: "model_output", content: "Sunny" },
+    { type: "model_output", toolCalls: [] },
+  ];
+}
+
+test("projects all message kinds in order, preserving optional fields and call/result pairing", () => {
+  const snapshot = new ContextBuilder().build({ messages: history(), tools: [] });
+  assert.deepEqual(snapshot, { messages: [
+    { role: "user", content: "Weather?" },
+    { role: "assistant", content: "Checking", toolCalls: [
+      { id: "weather-1", name: "weather", arguments: { location: { city: "Shanghai" } } },
+    ] },
+    { role: "tool", toolCallId: "weather-1", content: '{"success":true,"result":"Sunny"}' },
+    { role: "assistant", content: "Sunny" },
+    { role: "assistant", toolCalls: [] },
+  ] });
+  assert.equal(Object.hasOwn(snapshot, "tools"), false);
+});
+
+test("snapshot array, messages, calls and nested arguments cannot mutate input history", () => {
+  const messages = history();
+  const expected = structuredClone(messages);
+  const snapshot = new ContextBuilder().build({ messages, tools: [] });
+  const user = snapshot.messages[0];
+  const assistant = snapshot.messages[1];
+  const result = snapshot.messages[2];
+  assert.ok(user?.role === "user");
+  assert.ok(assistant?.role === "assistant");
+  assert.ok(result?.role === "tool");
+  const call = assistant.toolCalls?.[0];
+  assert.ok(call);
+  user.content = "Changed";
+  assistant.content = "Changed";
+  call.id = "Changed";
+  (call.arguments as { location: { city: string } }).location.city = "Changed";
+  assistant.toolCalls?.pop();
+  result.toolCallId = "Changed";
+  result.content = "Changed";
+  snapshot.messages.splice(0);
+  assert.deepEqual(messages, expected);
+});
+
+test("later input mutations and builds leave an earlier snapshot unchanged", () => {
+  const messages = history();
+  const builder = new ContextBuilder();
+  const snapshot = builder.build({ messages, tools: [] });
+  const expected = structuredClone(snapshot);
+  const assistant = messages[1];
+  assert.ok(assistant?.type === "model_output");
+  const call = assistant.toolCalls?.[0];
+  assert.ok(call);
+  (call.arguments as { location: { city: string } }).location.city = "Beijing";
+  messages.push({ type: "user_input", content: "Again" });
+  const next = builder.build({ messages, tools: [] });
+  assert.equal(next.messages.length, messages.length);
+  assert.notDeepEqual(next, snapshot);
+  next.messages.length = 0;
+  assert.deepEqual(snapshot, expected);
+});
+
+test("snapshot tools match the registry and isolate definitions and nested schemas in both directions", () => {
+  const registry = new ToolRegistry();
+  registry.register({
+    definition: {
+      name: "weather", description: "Get weather",
+      parameters: {
+        type: "object", properties: { city: { type: "string" } }, required: ["city"],
+      },
+    },
+    execute: () => "Sunny",
+  });
+  const tools = registry.listDefinitions();
+  const expected = structuredClone(tools);
+  const builder = new ContextBuilder();
+  const snapshot = builder.build({ messages: [], tools });
+  const earlier = builder.build({ messages: [], tools });
+  assert.deepEqual(snapshot.tools, expected);
+  const definition = snapshot.tools?.[0];
+  assert.ok(definition);
+  definition.name = "Changed";
+  definition.description = "Changed";
+  (definition.parameters.properties as { city: { type: string } }).city.type = "number";
+  (definition.parameters.required as string[]).push("extra");
+  snapshot.tools?.pop();
+  assert.deepEqual(tools, expected);
+  assert.deepEqual(registry.listDefinitions(), expected);
+
+  tools[0]!.description = "Later change";
+  (tools[0]!.parameters.properties as { city: { type: string } }).city.type = "boolean";
+  tools.length = 0;
+  registry.register({
+    definition: { name: "second", description: "Another tool", parameters: { type: "object" } },
+    execute: () => "Done",
+  });
+  assert.deepEqual(earlier.tools, expected);
+});
diff --git a/test/tool-runtime.test.ts b/test/tool-runtime.test.ts
index b5602b3..5a8a429 100644
--- a/test/tool-runtime.test.ts
+++ b/test/tool-runtime.test.ts
@@ -48,6 +48,40 @@ test("happy path uses registry definitions and result in the second turn of one
   });
 });
 
+test("each turn gets independent complete context from the latest facts and definitions", async () => {
+  const registry = new ToolRegistry();
+  registry.register(add(() => {
+    registry.register({
+      definition: { name: "second", description: "Added during execution", parameters: { type: "object" } },
+      execute: () => "Done",
+    });
+    return 5;
+  }));
+  const initialDefinitions = registry.listDefinitions();
+  const provider = new MockModelProvider([calling(call()), final]);
+  const runtime = new AgentRuntime(provider, { registry });
+  assert.deepEqual(await runtime.run("add"), { type: "completed" });
+  const first = provider.requests[0];
+  const second = provider.requests[1];
+  assert.ok(first && second);
+  assert.deepEqual(first, {
+    messages: [{ role: "user", content: "add" }], tools: initialDefinitions,
+  });
+  assert.deepEqual(second, {
+    messages: [
+      { role: "user", content: "add" },
+      { role: "assistant", toolCalls: [call()] },
+      { role: "tool", toolCallId: "one", content: '{"success":true,"result":5}' },
+    ],
+    tools: registry.listDefinitions(),
+  });
+  const expectedSecond = structuredClone(second);
+  first.messages[0]!.content = "Changed old snapshot";
+  first.tools![0]!.parameters.required = [];
+  assert.deepEqual(second, expectedSecond);
+  assert.deepEqual(runtime.getMessages()[0], { type: "user_input", content: "add" });
+});
+
 for (const args of [null, [], "bad", { a: "2", b: 3 }, { a: 2 }, { a: 2, b: 3, extra: true }]) {
   test(`invalid arguments ${JSON.stringify(args)} never invoke execute and allow continuation`, async () => {
     const registry = new ToolRegistry();
```
