# Day08 / Part VII-E：Codex 实现、测试与 Debug 源记录

- 来源：本 Codex 实现任务的实际源码、测试、提交 diff、命令输出与 2026-09-17 归档复验。
- 归档日期：2026-09-17。
- 主体实现提交：`e3efa9b23d3153dd1b38c8f4666ed01ef8127bd6`（短 SHA `e3efa9b`）。
- 同步契约修复提交：`9d068655faa4d445a3cbf0fa591d31debfb148aa`（短 SHA `9d06865`）。
- 正式笔记：[AgentEvent + Subscriber](../day08-part-vii-e-agent-event-subscriber.md)。
- ChatGPT 学习／Review 过程以[原始会话](https://chatgpt.com/c/6aa8fe11-eadc-83e9-951d-26d3f4c62170)为准；本文件是工程证据整理，不是逐字 Codex 会话导出。

## 1. 实现任务与真实起点

Codex 首先读取：

```text
src/runtime/agent-runtime.ts
src/runtime/runtime-state.ts
src/runtime/context-builder.ts
src/messages/runtime-message.ts
src/model/model.ts
src/model/tool.ts
src/tools/tool-executor.ts
src/tools/tool.ts
test/agent-runtime.test.ts
test/tool-runtime.test.ts
test/support/mock-model-provider.ts
package.json
tsconfig.json
```

确认 VII-D 完成态为 50 项测试，真实类型名是：

```text
RuntimeAssistantMessage
RuntimeToolMessage
ToolCall
RunOutcome
```

因此没有根据任务示意发明 `ModelOutputMessage` 或 `ToolResultMessage`。

起点 `AgentRuntime.run()` 已包含：

```text
append user_input
→ per-turn ContextBuilder.build
→ ModelProvider.generate
→ append model_output
→ interpret finishReason
→ sequential ToolExecutor.execute
→ append tool_result
→ next turn / RunOutcome
```

本轮只在这些真实 lifecycle point 接线。

## 2. 主体实现

### `src/runtime/agent-event.ts`

新增六分支 union，复用 Runtime types：

```ts
export type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | { type: "model_turn_completed"; message: RuntimeAssistantMessage }
  | { type: "tool_execution_started"; toolCall: ToolCall }
  | { type: "tool_execution_completed"; message: RuntimeToolMessage }
  | { type: "run_finished"; outcome: RunOutcome };
```

Subscriber 首版为 `(event) => void`，Review 后修复为最终：

```ts
export type AgentEventSubscriber = (event: AgentEvent) => undefined;
```

### `src/runtime/agent-runtime.ts`

新增：

```ts
readonly #subscribers = new Set<AgentEventSubscriber>();
```

订阅／取消：

```ts
subscribe(subscriber: AgentEventSubscriber): () => void {
  this.#subscribers.add(subscriber);
  return () => {
    this.#subscribers.delete(subscriber);
  };
}
```

私有 emission：

```ts
#emit(event: AgentEvent): void {
  for (const subscriber of [...this.#subscribers]) {
    try {
      subscriber(structuredClone(event));
    } catch {
      // Observation failures do not affect runtime execution or other subscribers.
    }
  }
}
```

`[...this.#subscribers]` 形成本次通知的 subscriber snapshot；`structuredClone(event)` 位于循环内，使每个 Subscriber 获得独立 payload。

正常 Outcome 统一经过：

```ts
#finish(outcome: RunOutcome): RunOutcome {
  this.#emit({ type: "run_finished", outcome });
  return outcome;
}
```

Provider／Runtime 异常不会进入 `#finish()`，因此不伪造 `run_finished`。

### emission points

```text
append user_input
→ emit run_started

ContextBuilder.build
→ emit model_turn_started
→ Provider.generate

append RuntimeAssistantMessage
→ emit model_turn_completed

确定本轮真实执行 Tool
→ emit tool_execution_started
→ ToolExecutor.execute

append RuntimeToolMessage
→ emit tool_execution_completed
```

`maxTurns` skipped 分支没有调用 ToolExecutor，因此没有 tool execution event。

## 3. 测试实现

新增 `test/agent-event.test.ts`，使总测试数从 50 增加到 60。

十项 Runtime tests：

1. normal lifecycle、run input commit ordering、finished outcome。
2. 完整 Tool Loop、message history、model／tool completed commit ordering。
3. Multiple Tools started／execute／completed 顺序。
4. TOOL_NOT_FOUND 仍产生完整 Tool execution lifecycle。
5. maxTurns skipped 写 result 但无 execution events。
6. Runtime facts 与不同 Subscriber 之间的嵌套 payload isolation。
7. `run_finished.outcome` clone isolation。
8. Subscriber A throw 不影响 B 和 Runtime。
9. unsubscribe 在首个事件后停止通知，重复调用安全。
10. Provider 原始错误传播且没有 `run_finished`。

同步 Public Contract 增加编译期证据：

```ts
const synchronousSubscriber: AgentEventSubscriber = () => {};

// @ts-expect-error async subscribers are intentionally unsupported
const asynchronousSubscriber: AgentEventSubscriber = async () => {};
```

所有 `events.push(event)` 表达式 callback 改为显式 block，避免 `number` incidental return。

## 4. 实际 Debug 过程

### 4.1 `void` 没有实现同步专属契约

首版全部 Runtime tests 和 build 通过，但 Review 发现：

```text
() => Promise<void>
is assignable to
() => void
```

于是 public type 允许 Runtime 无法正确隔离 rejection 的 callback。修复选择收紧 type，而不是扩大 Runtime：

```diff
- export type AgentEventSubscriber = (event: AgentEvent) => void;
+ export type AgentEventSubscriber = (event: AgentEvent) => undefined;
```

### 4.2 strict test type-check 是必要证据

`npm test` 通过 `tsx --test` 执行 Runtime tests，但不会替代 `tsc` 对 `@ts-expect-error` 的检查。因此每轮最终验证都单独执行 strict test type-check。

### 4.3 引用隔离测试加强

初版嵌套 metadata 测试复用了拒绝额外字段的 add Schema，只走到 `INVALID_ARGUMENTS`。随后改为注册接受 nested metadata 的 inspect Tool，使测试证明：

```text
Subscriber mutates event clone
→ Tool receives original nested arguments
→ successful result preserves original value
→ RuntimeState and Subscriber B remain unchanged
```

### 4.4 测试命令判断

没有修改 `package.json`。现有：

```json
"test": "tsx --test test/**/*.test.ts"
```

自动发现新增文件。需要新增的是测试内容和 compile-time evidence，不是重复 npm script。

## 5. 两次提交

### `e3efa9b` — Add runtime event subscriptions and lifecycle notifications

```text
source-review.zip            binary delivery artifact update
src/runtime/agent-event.ts   13 lines added
src/runtime/agent-runtime.ts 46 lines changed
test/agent-event.test.ts     279 lines added
```

### `9d06865` — Enforce synchronous agent event subscribers

```text
source-review.zip            binary delivery artifact update
src/runtime/agent-event.ts   void → undefined
test/agent-event.test.ts     compile-time evidence + block callbacks
```

`source-review.zip` 是交付物，不参与 Runtime 调用链。

## 6. 2026-09-17 最终归档复验

### `npm test`

退出码 0：

```text
1..60
# tests 60
# suites 0
# pass 60
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### `npm run build`

退出码 0：

```text
> mini-agent-runtime@0.1.0 build
> tsc -p tsconfig.json
```

### 额外严格测试 TypeScript type-check

命令：

```bash
./node_modules/.bin/tsc --noEmit --target ES2022 \
  --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --strict --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

无输出，退出码 0。

### `git diff --check`

无输出，退出码 0。

### deterministic demos

主体实现阶段执行：

```text
npm run demo:runtime → 两次 completed，跨 run history 正常
npm run demo:tools   → 两 Model Turns、add result 5、completed
```

同步 contract fix 未修改 Runtime execution；Fix Task 明确 demos 不要求重跑。最终归档复验重新执行 tests、build、strict type-check 与 diff check。

## 7. Scope 结果

- RuntimeState schema 未修改。
- ModelProvider contract／OpenAI adapter 未修改。
- ContextBuilder／TurnSnapshot 未修改。
- ToolRegistry／ToolExecutor／Tool Error Contract 未修改。
- maxTurns、skipped、Provider error 和 invariant semantics 未修改。
- 未新增 dependency。
- 未实现 Streaming 或 Provider stream。
- 未实现 async Subscriber、Promise handling、queue 或 scheduler。
- 未实现 Abort、Single Active Run 或 reentrancy guard。
- 未实现 beforeToolCall、Approval、SessionStore 或 Recovery。
- 未新增 EventBus、Middleware、Telemetry、Tracing、Event persistence 或 Replay。

## 8. 最终可复核文件

```text
src/runtime/agent-event.ts
src/runtime/agent-runtime.ts
test/agent-event.test.ts
```

完整最终 diff 可由以下命令重建：

```bash
git diff 92dd6d8 9d06865 -- \
  src/runtime/agent-event.ts \
  src/runtime/agent-runtime.ts \
  test/agent-event.test.ts
```

主体实现与 contract fix 被拆成两个提交，因此可以分别复核 Runtime behavior 和 Review 后类型收紧。
