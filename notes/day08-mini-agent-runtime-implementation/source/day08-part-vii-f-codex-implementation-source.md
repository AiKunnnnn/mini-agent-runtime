# Day08 / Part VII-F：Codex 实现、测试与 Debug 源记录

- 来源：本 Codex 任务的实现过程、当前源码、测试、提交差异和实际验证输出；本文件是工程证据整理，不是逐字 Codex 会话导出。
- 归档日期：2026-09-22。
- 主体实现提交：`a94a30c`（`feat: support aborting agent runs and tool execution`）。
- 取消归因修复提交：`df7dad6`（`fix(runtime): preserve error identity during cancellation races`）。
- 正式笔记：[Abort + Single Active Run](../day08-part-vii-f-abort-single-active-run.md)。
- ChatGPT 讨论原文见：[架构讨论](day08-part-vii-f-architecture-chatgpt-source.md)和[Review／Closure](day08-part-vii-f-review-chatgpt-source.md)。公开分享页 backing conversation ID 与原会话 ID 一致。上传的源码 ZIP 二进制内容不在这三份 Markdown 中重复嵌入；以仓库当前代码及提交为实现事实源。

## 1. 真实起点与任务范围

从 VII-E 完成态开始，`RuntimeState` 只有 `messages`，`AgentRuntime` 拥有唯一的 State mutation 权限；`run(userInput)` 一进入即 append user message、发 `run_started`，无 Active Run guard。Provider 和 Tool 都没有 signal 参数。Tool invocation 的普通 throw 会归一化为 `TOOL_EXECUTION_FAILED`。ContextBuilder 每轮根据最新事实重建 snapshot，六分支 Event 仅做同步 best-effort observation。

Implementation Task 固定 F-AD01～F-AD16，不允许提前引入 SessionStore、Approval、Queue、Scheduler、Parallel Tools、Durable Execution、Streaming 或通用 ExecutionContext。

## 2. 主体实现：ownership、signal 和 settlement

`src/runtime/agent-runtime.ts` 新增 `#active`。Public `run()` 先拒绝并发／重入，再 acquire ownership，通过外层 `try/finally` 执行 `#run()` 并释放。Pre-aborted signal 在 append user input 前返回 `{ type: "aborted" }`，没有 lifecycle event。

Runtime 在开始 Model Turn、Provider 返回后、Tool 开始前、Tool 返回后、下一轮之前等安全边界检查 signal。`run_finished(aborted)` 只在已经开始的 Run 形成合法 cancelled outcome 时发出。普通 Provider 或 Runtime invariant error 继续 reject，不发 `run_finished`。

Provider signal 作为第二参数 `ModelGenerationOptions` 传递，不进入 `ModelRequest`。OpenAI SDK v5 的 `chat.completions.create(body, options)` 接受 `options.signal`。Tool signal 通过 `ToolExecutionOptions` 经 ToolRegistry wrapper、ToolExecutor 传给 `Tool.execute(args, options)`；旧版只接收 args 的 Tool 仍可使用。

一旦 model output 中 Tool Calls 已 commit，取消时对尚未得到 Tool Result 的 calls 顺序写 `TOOL_CALL_CANCELLED` pairing。该结果使用既有 `RuntimeToolMessage.content = JSON.stringify(ToolResult)`，不产生新的 Runtime message variant，也不伪造 Tool execution completed event。成功返回的 Tool result 先 commit、发 completed，然后再检查取消状态；Provider 的未接受 response 则可在 commit 前丢弃。

`maxTurns` 最后一轮若未取消继续写 `TOOL_EXECUTION_SKIPPED`，若在其前已取消则写 `TOOL_CALL_CANCELLED`，同一 call 不双重 pairing。

## 3. 首轮验证及 Review 发现的 Must Fix

第一轮实际运行 `npm test` 为 **73 pass／0 fail**；`npm run build`、严格测试类型检查、`git diff --check`、`npm run demo:runtime` 和 `npm run demo:tools` 均通过。测试覆盖并发／重入、pre-abort、Provider／Tool 取消、late Tool success、多 Tool 顺序、ownership release 和 maxTurns 优先级。

ChatGPT Review 对照源码后仍发现一个 Must Fix：Provider catch 和 Tool invocation catch 把 `signal.aborted` 当作 caught error 的 cancellation 归因依据。这个条件只能证明 Caller 请求取消，不能证明同时发生的普通 Provider／Tool failure 是由该 signal 造成。

误判示例：

```text
ordinary Provider / Tool error
        +
Caller aborts at nearly the same time
        ↓
catch observes signal.aborted === true
        ↓
first implementation wrongly labels the ordinary error as cancellation
```

这是“测试数量不少但缺失因果竞争测试”的 Debug 证据，不应因为首轮 73 项全绿就把该版本视为 VII-F Done。

## 4. 修复后的 cancellation provenance

Provider-neutral contract 在 `src/model/model-provider.ts` 新增携带 signal identity 和 cause 的 `ModelGenerationCancelledError`。OpenAI adapter 只有在当前 signal 已 aborted 且错误是 `OpenAI.APIUserAbortError` 时才转换；其他错误原样 throw。`AgentRuntime` 再验证 signal 已取消、marker 类型和 `error.signal === currentSignal`，否则保留原错误对象向上传播。

Tool contract 在 `src/tools/tool.ts` 文档化：cooperative cancellation 应 reject 当前 `signal.reason`。`ToolExecutor` 的 invocation catch 同时验证 signal 已 aborted 和 `error === signal.reason`，才抛携带该 signal 的 `ToolExecutionCancelledError`；普通 Tool throw/reject 仍形成 `TOOL_EXECUTION_FAILED`。Runtime 再验证 marker 和当前 signal identity。Lookup、Schema compilation、validation 和 result serialization 的既有边界不变。

Provider **正常返回**而 signal 在 Runtime acceptance 前已 aborted 时，response 仍可被丢弃；该路径是提交前检查，不是对 caught failure 的错误归因。

## 5. Regression Tests

新增 `test/run-control.test.ts`：共有 15 个 test case；原套件 60 项，最终共 75 项。`test/support/mock-model-provider.ts` 记录 options，用来证明 signal 对象相同。

新增的两个 race regression 专门保护修复：

1. Provider 在 signal abort 同时 reject unrelated `Error`：`run()` 按同一个原错误对象 reject，而不是返回 aborted；之后能够再次 run，证明 ownership release。
2. Tool 在 signal abort 同时 reject unrelated `Error`：结果为 `TOOL_EXECUTION_FAILED`，不是 `TOOL_CALL_CANCELLED`；该真实 final Tool result 进入 State，发 `tool_execution_completed`。由于 signal 已取消，随后 Run 仍可正常结算为 aborted，二者语义不冲突。

既有 cooperative Provider cancellation 通过 signal-bound neutral marker 继续返回 aborted；cooperative Tool cancellation 通过 reject `signal.reason` 继续写 `TOOL_CALL_CANCELLED` 且不伪造 completed event。

## 6. 最终实际验证

| 命令 | 结果 |
| --- | --- |
| `npm test` | 75 pass、0 fail |
| `npm run build` | 通过 |
| `./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck test/*.test.ts test/support/*.ts` | 通过 |
| `git diff --check` | 通过 |
| `npm run demo:runtime` | 通过；顺序两次 run completed，保留会话历史 |
| `npm run demo:tools` | 通过；add Tool，两个 Model Turn，completed |

真实 OpenAI Demo 不在自动化无网络验收范围；SDK v5 的参数位置以本地安装包类型声明和 TypeScript build 核验。

## 7. 最终 Scope 与遗留边界

最终代码没有 SessionStore、Approval、Queue、Scheduler、Parallel Tools、Multi-Agent、Retry、Timeout、Durable Execution、Streaming 或 Event union expansion。Cancellation 是 cooperative；不响应 signal 且永久 pending 的 Provider／Tool 无法由 Runtime 强制结束。Tool 外部副作用和 Runtime fact commit 之间没有事务保证，这一限制没有在 VII-F 伪装成已解决。
