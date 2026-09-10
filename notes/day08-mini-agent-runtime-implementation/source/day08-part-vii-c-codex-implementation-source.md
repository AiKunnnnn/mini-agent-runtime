# Day08 / Part VII-C：Codex 实现、测试与 Debug 源记录

- 来源：本 Codex 任务中的用户要求、实际编辑、命令输出与后续 Fix。
- 归档日期：2026-09-10。
- 形式：按真实过程整理的证据摘要，不是逐字完整 Codex 会话导出。
- 代码基线：`41327a8`；主体实现提交为 `d62078d`。
- 正式笔记：[Tool Registry + Tool Executor + Error Contract](../day08-part-vii-c-tool-registry-executor-error-contract.md)。
- 不包含 .env 内容或真实密钥；Demo 使用确定性 Provider，没有调用外部 LLM。

## 1. 起点和任务输入

用户提供正式 VII-C Implementation Task，包含 C-AD01～C-AD12、A～J 验收项与 Scope Guard。要求基于 VII-A／VII-B 增量实现，禁止重新设计 State、Provider 或默认提取 AgentLoop。

Codex 读取已有代码、AGENT.md、测试和 README。确认 RuntimeToolMessage 已有 toolCallId 与字符串 content；ToolCall.arguments 是 unknown；ModelRequest 已允许 tools；State 只有 messages。

## 2. 主体实现

新增 tools/tool.ts、tools/tool-registry.ts、tools/tool-executor.ts，修改 AgentRuntime 为有限 for 循环。安装 Ajv，沿用 parameters JSON Schema，不给每个 Tool 增加重复校验代码。

Registry 保存 definitions 副本；Executor 克隆 arguments 后校验，避免工具修改已保存调用。ToolResult 在 Runtime 内 JSON.stringify 后进入消息；Provider throw 保持原样传播。

最初 C-AD12 的实现是在保存最后一轮 model_output 后直接返回 limit_reached，不执行该批 Tool，也尚未生成 skipped 结果。

## 3. 首次验证暴露的 TypeScript 问题

npm test 首次结果为 42 pass、0 fail；但 npm run build 和额外测试类型检查失败，原始诊断：

```text
src/tools/tool-executor.ts(24,20): error TS2339: Property '$async' does not exist on type 'ValidateFunction<unknown>'.
```

原代码直接访问 validate.$async。修复为属性存在检查：

```ts
if ("$async" in validate && validate.$async) {
  throw new Error("Async tool schemas are not supported.");
}
```

修复后继续执行测试、build 和严格测试类型检查，全部通过。未移除 async Schema 防护或关闭严格类型检查。

## 4. Demo 与复测

新增 demo:tools，实际执行 add(2, 3)。确定性 Provider 第一回合提出调用，第二回合要求最后一条请求消息是匹配的 tool result，并从 JSON result 生成回答。

首轮 Demo 显示 completed、2 个 Model Turn 和四条有序事实。随后用户要求“再测试一遍”，Codex 实际重新运行测试、build、测试类型检查、Demo 和 git diff --check，均通过，当时仍为 42 项测试。

用户询问 tool-runtime-demo.ts 如何测试时，Codex 给出 npm run demo:tools，明确它不需要 API Key、不是外部 LLM 端到端测试。

## 5. 初版已发现但错误延期的 lifecycle 问题

Codex 最初汇报中已指出：最后一轮未执行的 Tool Call 没有对应结果，后续 run 可能向严格 Provider 发送不完整历史；当时将其作为 Deferred Recovery 记录。

后续用户带回 Review，明确这影响 VII-B 已有的跨 run 能力，必须在 VII-C 内修复。该过程应记为原终止设计的补全，而非 Codex 擅自偏离初始 C-AD12。

## 6. 用户限定范围的 Fix

用户只要求两项修改：

1. 最后一批 Tool Call 不真正执行，但每个调用写入 TOOL_EXECUTION_SKIPPED 结果，之后返回 limit_reached。
2. toolCalls 存在且非空的不变量检查先于 maxTurns 判断。

Codex 仅改四个文本文件：agent-runtime.ts、tool.ts、tool-runtime.test.ts、README.md。没有改 Registry、Executor 或引入新的生命周期框架。

结果 message 固定为：

```text
Tool execution was skipped because maxTurns was reached.
```

测试修改：

- 原 maxTurns=1、3、默认值的参数化测试改为断言末尾 assistant + 两条 skipped result，并保留执行次数检查。
- 新增 limit_reached 后再次 run 的完整请求顺序测试，确认 Tool.execute 次数始终为 0。
- 新增末轮 missing 和 empty toolCalls 两项 invariant 测试。

最终为 45 pass、0 fail；build、额外测试类型检查、git diff --check 均通过。Git 提交还带有 source-review.zip 更新，属于交付物，不把它算作 Codex 新增 Runtime 功能。

## 7. 本次归档复验：真实命令输出

以下输出来自归档过程中在当前仓库执行的命令，不是手工模拟。build 初次返回运行 session，后续等待确认退出码 0。其他三条命令均直接退出码 0。

### npm test

命令：

```bash
npm test
```

退出码：0。

```text
> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

TAP version 13
# Subtest: completes a normal answer and records runtime facts
ok 1 - completes a normal answer and records runtime facts
  ---
  duration_ms: 4.546625
  type: 'test'
  ...
# Subtest: retains conversation across two runs on the same runtime
ok 2 - retains conversation across two runs on the same runtime
  ---
  duration_ms: 1.082083
  type: 'test'
  ...
# Subtest: records missing tool failure and continues within the same run
ok 3 - records missing tool failure and continues within the same run
  ---
  duration_ms: 1.089625
  type: 'test'
  ...
# Subtest: preserves output for length without retry or continuation
ok 4 - preserves output for length without retry or continuation
  ---
  duration_ms: 0.693584
  type: 'test'
  ...
# Subtest: preserves output for unknown without retry or continuation
ok 5 - preserves output for unknown without retry or continuation
  ---
  duration_ms: 1.166458
  type: 'test'
  ...
# Subtest: propagates the original provider throw without retry
ok 6 - propagates the original provider throw without retry
  ---
  duration_ms: 0.497208
  type: 'test'
  ...
# Subtest: propagates the original provider reject without retry
ok 7 - propagates the original provider reject without retry
  ---
  duration_ms: 0.931125
  type: 'test'
  ...
# Subtest: history copies protect the array, messages, tool calls and nested arguments
ok 8 - history copies protect the array, messages, tool calls and nested arguments
  ---
  duration_ms: 0.763875
  type: 'test'
  ...
# Subtest: provider response and request references cannot mutate runtime facts
ok 9 - provider response and request references cannot mutate runtime facts
  ---
  duration_ms: 0.883583
  type: 'test'
  ...
# Subtest: maps provider-neutral model messages to OpenAI chat messages
ok 10 - maps provider-neutral model messages to OpenAI chat messages
  ---
  duration_ms: 0.8645
  type: 'test'
  ...
# Subtest: maps provider-neutral tool definitions to OpenAI function tools
ok 11 - maps provider-neutral tool definitions to OpenAI function tools
  ---
  duration_ms: 0.156916
  type: 'test'
  ...
# Subtest: maps OpenAI assistant text to a Runtime assistant message
ok 12 - maps OpenAI assistant text to a Runtime assistant message
  ---
  duration_ms: 0.057084
  type: 'test'
  ...
# Subtest: maps an OpenAI function tool call and parses its arguments
ok 13 - maps an OpenAI function tool call and parses its arguments
  ---
  duration_ms: 0.325166
  type: 'test'
  ...
# Subtest: fails explicitly when OpenAI tool call arguments contain invalid JSON
ok 14 - fails explicitly when OpenAI tool call arguments contain invalid JSON
  ---
  duration_ms: 0.399375
  type: 'test'
  ...
# Subtest: maps known finish reasons and normalizes provider-specific reasons
ok 15 - maps known finish reasons and normalizes provider-specific reasons
  ---
  duration_ms: 0.068542
  type: 'test'
  ...
# Subtest: maps OpenAI usage to the Runtime usage model
ok 16 - maps OpenAI usage to the Runtime usage model
  ---
  duration_ms: 0.155917
  type: 'test'
  ...
# Subtest: maps a complete OpenAI response without leaking its raw shape
ok 17 - maps a complete OpenAI response without leaking its raw shape
  ---
  duration_ms: 0.178709
  type: 'test'
  ...
# Subtest: happy path uses registry definitions and result in the second turn of one run
ok 18 - happy path uses registry definitions and result in the second turn of one run
  ---
  duration_ms: 26.323416
  type: 'test'
  ...
# Subtest: invalid arguments null never invoke execute and allow continuation
ok 19 - invalid arguments null never invoke execute and allow continuation
  ---
  duration_ms: 9.542167
  type: 'test'
  ...
# Subtest: invalid arguments [] never invoke execute and allow continuation
ok 20 - invalid arguments [] never invoke execute and allow continuation
  ---
  duration_ms: 7.876458
  type: 'test'
  ...
# Subtest: invalid arguments "bad" never invoke execute and allow continuation
ok 21 - invalid arguments "bad" never invoke execute and allow continuation
  ---
  duration_ms: 9.073125
  type: 'test'
  ...
# Subtest: invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
ok 22 - invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
  ---
  duration_ms: 6.406792
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2} never invoke execute and allow continuation
ok 23 - invalid arguments {"a":2} never invoke execute and allow continuation
  ---
  duration_ms: 4.125792
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
ok 24 - invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
  ---
  duration_ms: 6.221292
  type: 'test'
  ...
# Subtest: tool throw becomes an execution failure visible to the next model turn
ok 25 - tool throw becomes an execution failure visible to the next model turn
  ---
  duration_ms: 6.919625
  type: 'test'
  ...
# Subtest: tool reject becomes an execution failure visible to the next model turn
ok 26 - tool reject becomes an execution failure visible to the next model turn
  ---
  duration_ms: 6.264375
  type: 'test'
  ...
# Subtest: tool non-error becomes an execution failure visible to the next model turn
ok 27 - tool non-error becomes an execution failure visible to the next model turn
  ---
  duration_ms: 3.938125
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=false)
ok 28 - multiple calls finish sequentially before the next turn (mixed=false)
  ---
  duration_ms: 8.444583
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=true)
ok 29 - multiple calls finish sequentially before the next turn (mixed=true)
  ---
  duration_ms: 7.6375
  type: 'test'
  ...
# Subtest: maxTurns=1 counts model turns, skips final tools and resets per run
ok 30 - maxTurns=1 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 0.41525
  type: 'test'
  ...
# Subtest: maxTurns=3 counts model turns, skips final tools and resets per run
ok 31 - maxTurns=3 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 4.291333
  type: 'test'
  ...
# Subtest: maxTurns=default counts model turns, skips final tools and resets per run
ok 32 - maxTurns=default counts model turns, skips final tools and resets per run
  ---
  duration_ms: 4.270667
  type: 'test'
  ...
# Subtest: a run after limit_reached receives paired skipped results before the new user input
ok 33 - a run after limit_reached receives paired skipped results before the new user input
  ---
  duration_ms: 0.284542
  type: 'test'
  ...
# Subtest: stop on the last allowed turn still completes
ok 34 - stop on the last allowed turn still completes
  ---
  duration_ms: 0.12275
  type: 'test'
  ...
# Subtest: invalid maxTurns fails at construction
ok 35 - invalid maxTurns fails at construction
  ---
  duration_ms: 0.197375
  type: 'test'
  ...
# Subtest: provider failure after tool execution propagates the same error and preserves facts
ok 36 - provider failure after tool execution propagates the same error and preserves facts
  ---
  duration_ms: 4.463458
  type: 'test'
  ...
# Subtest: tool argument and result references cannot mutate history
ok 37 - tool argument and result references cannot mutate history
  ---
  duration_ms: 2.866708
  type: 'test'
  ...
# Subtest: registry rejects duplicates, preserves order and isolates schema references
ok 38 - registry rejects duplicates, preserves order and isolates schema references
  ---
  duration_ms: 4.019583
  type: 'test'
  ...
# Subtest: provider cannot change the schema used for tool validation
ok 39 - provider cannot change the schema used for tool validation
  ---
  duration_ms: 3.722916
  type: 'test'
  ...
# Subtest: invalid schema and async schema are configuration bugs, not invocation failures
ok 40 - invalid schema and async schema are configuration bugs, not invocation failures
  ---
  duration_ms: 7.070042
  type: 'test'
  ...
# Subtest: lookup bugs propagate unchanged
ok 41 - lookup bugs propagate unchanged
  ---
  duration_ms: 0.309417
  type: 'test'
  ...
# Subtest: result serialization bugs propagate outside the execute catch boundary
ok 42 - result serialization bugs propagate outside the execute catch boundary
  ---
  duration_ms: 3.248125
  type: 'test'
  ...
# Subtest: tool_calls without calls is an invariant violation
ok 43 - tool_calls without calls is an invariant violation
  ---
  duration_ms: 0.474541
  type: 'test'
  ...
# Subtest: malformed tool_calls (missing) still throws on the final turn
ok 44 - malformed tool_calls (missing) still throws on the final turn
  ---
  duration_ms: 0.205292
  type: 'test'
  ...
# Subtest: malformed tool_calls (empty) still throws on the final turn
ok 45 - malformed tool_calls (empty) still throws on the final turn
  ---
  duration_ms: 0.115833
  type: 'test'
  ...
1..45
# tests 45
# suites 0
# pass 45
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 408.29625
```

### npm run build

命令：

```bash
npm run build
```

退出码：0。

```text
> mini-agent-runtime@0.1.0 build
> tsc -p tsconfig.json
```

### test typecheck

命令：

```bash
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck test/*.test.ts test/support/*.ts
```

退出码：0。

命令无标准输出。

### npm run demo:tools

命令：

```bash
npm run demo:tools
```

退出码：0。

```text
> mini-agent-runtime@0.1.0 demo:tools
> tsx src/demo/tool-runtime-demo.ts

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

## 8. 证据范围

- 代码描述以当前源码为准。
- 完整 ChatGPT 可读取文本已另存；上传附件正文未返回，不声称本次重新解压历史 ZIP。
- Review 中的旧源码包和 tsx: not found 来自 ChatGPT 历史 Review 陈述；本地复验没有发生同样的依赖缺失。
- 归档只生成 Markdown，不重跑收费 Provider Demo，不修改 src、test、package 或锁文件。

