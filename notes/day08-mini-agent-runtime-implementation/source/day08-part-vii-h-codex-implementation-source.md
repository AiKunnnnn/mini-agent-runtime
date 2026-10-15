# Day08 · Part VII-H Codex Implementation / Verification / Debug Source

> Source type: 工程证据整理，不是逐字 Codex 会话导出。
>
> 归档日期：2026-10-15；VII-G 比较起点：`5929257 docs: Mark Part VII-G conversation recovery complete`；VII-H 功能基线：`600e7ef feat: add pre-execution tool approval hook`。
>
> 证据来源：当前源码、测试与配置、`5929257..600e7ef` 的真实 Git diff、本会话保留的 Codex 实现／验证记录，以及恢复的[Review 原文第 9 轮](day08-part-vii-h-review-chatgpt-source.md)。历史功能验证与本轮文档 Closure 校验分别说明。本文件不代表重新开发 Runtime，也不以实现通过替代静态 Review 的独立证据边界。

## 1. 实现前提与实际增量

实现前按任务要求阅读 Runtime／Tool、Conversation／Session、指定测试、package.json、tsconfig.json 与 README。真实代码与十项前提一致：AgentRuntime 是 RuntimeState 的唯一 mutation owner；State 只有 messages；ToolExecutor 负责查找、Ajv 校验和执行；ToolResult 为 success／error 联合；AgentEvent 只有六种；Abort 使用 Caller Signal 并保留错误归因；未完成 batch 由 `#appendCancelledToolCalls()` 补齐；SessionStore 仅在 Run Boundary 保存；会话验证要求完整配对；`runAndSave()` 保留 Run／Persistence 双 Settlement 和 reusable 语义。

本轮增量集中在以下文件：

| 文件 | 实际职责／位置 |
| --- | --- |
| [before-tool-call.ts](../../../src/tools/before-tool-call.ts) L3–16 | 新增 allow／deny、Context、同步或异步 Hook 公共类型 |
| [agent-runtime.ts](../../../src/runtime/agent-runtime.ts) L18、L30–35、L57–59 | Options 构造注入与转发；RunOptions 和 Loop 控制没有加入 Approval 状态 |
| [tool-executor.ts](../../../src/tools/tool-executor.ts) L24–97、L123–146 | Executor Options、决策归一化、可中断等待、Hook 副本和执行前 Abort 检查 |
| [tool.ts](../../../src/tools/tool.ts) L16–31 | 仅增加 DENIED／PRE_EXECUTION_FAILED 两个错误码；结果格式不变 |
| [approval-demo.ts](../../../src/demo/approval-demo.ts) L12–119 | Application 层 CLI 输入／异步审批、模拟工具、确定性 Provider 与结果断言 |
| [before-tool-call.test.ts](../../../test/before-tool-call.test.ts) | Basic Contract／Isolation／Security，30 项测试 |
| [approval-run-control.test.ts](../../../test/approval-run-control.test.ts) | Abort／Race／Event／listener／无 Signal，11 项测试 |
| [approval-session-loop.test.ts](../../../test/approval-session-loop.test.ts) | Loop／Memory／SQLite／Recovery／CAS，12 项测试 |
| [package.json](../../../package.json) | 只增加 demo:approval；未增加依赖或其他构建工具 |
| [README](../../../README.md) | Hook 用法、错误／取消语义、Demo 命令及非持久审批限制 |

Git diff 还包含既有交付包 `source-review.zip` 的二进制更新；它不是新增运行时模块。这里没有把包名或报告中提到的打包动作当作附件内容已被独立核验的证据。

## 2. 兼容性与范围证据

已读取 `git diff --name-status 5929257 600e7ef` 和 `git diff --numstat 5929257 600e7ef -- test package-lock.json tsconfig.json`。测试目录只有上述三个新增文件，分别为 443、467、240 行；没有修改任何既有测试的预期。package.json 的唯一增量是一行 demo:approval；package-lock.json、tsconfig.json 与依赖版本均无差异。

下列旧契约文件在该功能 diff 中没有变化：RuntimeState、RuntimeMessage、ContextBuilder、AgentEvent、validateConversation、SessionSnapshot／SessionStore、Memory／SQLite 实现和 conversation-workflow。AgentRuntime 的 diff 只涉及 Hook 类型导入、Options 字段和 Executor 构造转发。RunOutcome、现有事件发布位置、恢复流程及 CAS 行为没有改写。

本轮不包含 Durable Approval、审批持久化、审批服务／UI、Policy Engine、默认审批超时、动态 Hook 替换或 VII-I。`AuthorizationSettlement` 的内部 failed 标记只负责将 Hook 边界故障变成既有 ToolResult，不是新增公共审批决策或 Runtime 状态机。

## 3. H-DD01～H-DD10 实现证据

| 决策 | 当前代码证据 | 测试证据 |
| --- | --- | --- |
| H-DD01 Hook Placement | Executor L99–121 先 lookup／compile／clone／validate；L123–130 再 Hook；L152 才执行工具 | H-T02、07、08；H-T09 校验内部故障仍向外传播 |
| H-DD02 Ownership／Injection | Runtime L30–35、57–59；Executor L24–26、43–47；构造时保存 Hook 引用 | H-T02、10、15；直接 new ToolExecutor 也强制决策 |
| H-DD03 Final Decision | 公共类型 L3–16；Executor L31–36 仅接受对象中的 allow／deny | H-T02～06；第三种决策、primitive、缺失字段与非法异步值均失败关闭 |
| H-DD04 Reference Isolation | Executor L116 复制实际参数，L126 再复制 Hook ToolCall；Ajv 只在 L117 校验一次 | H-T11～13；嵌套参数、ID、名称修改不影响执行或历史 |
| H-DD05 Explicit Deny | Executor L131–135 返回 TOOL_EXECUTION_DENIED，固定消息；不调用 Tool.execute | H-T03、10、13、29、30 |
| H-DD06 Hook Error | Executor L65–72、79–95 只捕获 Hook／返回值故障，L136–139 返回固定安全消息 | H-T04～06、09、14；原错误和 stack 不进入 ToolResult／ModelRequest |
| H-DD07 Interruptible Wait | Executor L49–97 主动注册 Caller Signal listener；L56、62 在所有接受的结算路径清理 | H-T16、17；另有 allow／deny／reject／abort listener 清理断言 |
| H-DD08 Attribution／Pairing | Executor L52–64 以 settled 守卫决定首次接受归因；L88 观察迟到 reject；L144–145 执行前再检查；沿用同一个 ToolExecutionCancelledError | H-T18～25；包括 error 已接受后 Abort、Abort 后 error、allow 已接受但执行前 Abort |
| H-DD09 Event Compatibility | Runtime L197 的 started 在 Executor 之前；L219–223 正常提交后 completed；取消分支 L208–215 补配对而不发送 completed | H-T26、27；A success／B pending／C unstarted 的事件与结果断言 |
| H-DD10 Session／Recovery | Runtime L47–50 仅恢复消息；L89–104 沿用取消消息；conversation-workflow L25–49 原样保留双 Settlement | H-T28～33；另增两种 Store 的 Approval Abort 保存与恢复测试 |

所有决策均按冻结语义实现；没有为通过新用例修改旧测试或增加第二种 Approval Cancellation Error。

## 4. 关键执行与结算语义

### 4.1 Hook 看到什么、能决定什么

Registry Lookup 与 Schema Validation 成功后，Executor 用已校验 args 建立新的 ToolCall 副本。Hook 的 Readonly 只表达 TypeScript 约束；真正的运行时隔离来自第二次 structuredClone。实际执行仍使用第一次复制且通过 Ajv 的 args；Hook 无权替换真实名称、ID 或参数。复制故障位于 Hook catch 之外，不被冒充审批失败。

allow／deny 可以直接返回，也可以由异步 Application Handler 等待人工决定后返回。deny 和 Hook Error 都产生正常失败 ToolResult 并回到 Agent Loop；它们不自行将 Run 变成 aborted。错误消息固定为 `Tool execution was denied.` 和 `Pre-execution authorization failed.`，不使用原 Hook Error.message 或 stack。

### 4.2 为什么不能只检查最终 signal.aborted

审批等待用局部 settled 守卫接受第一次结算。普通 Hook Error 已接受后，随后 Abort 只会停止剩余工作，当前结果保持 PRE_EXECUTION_FAILED；Runtime 先提交该失败和 completed，再为余下 ToolCall 补 cancelled。如果 Abort 先终止等待，则抛出持有 Caller 原始 Signal 的既有 ToolExecutionCancelledError，由 Runtime 补当前及剩余调用的 cancelled。

Hook Promise 在 Abort 后仍有 fulfillment／rejection observer，因此迟到 allow 不启动工具，迟到 reject 不产生额外 Result 或未处理异常。listener 在接受结果或取消时移除。即便 allow 已被接受，真正 Tool.execute 之前仍有连续的 signal.aborted 检查，没有中间 await；它防止已观察到取消后启动新的副作用。没有 Caller Signal 时允许一直等待 Application 决策，不引入默认超时。

### 4.3 Event 与 Session 继续表达已发生的事实

tool_execution_started 表示 Runtime 开始处理执行尝试，可能还在审批中。deny／Hook Error 得到结果后按旧路径提交并发送 completed；等待被 Abort 时只写完整 cancelled 配对，不伪造 completed。Subscriber 不参与执行授权。

已结算的错误和取消仍是 RuntimeToolMessage.content 中的 JSON。完整消息可通过旧 validateConversation 保存；恢复后只是历史事实，不重新触发旧 Hook 或工具。Memory／SQLite 与 CAS 冲突测试继续区分 Run Settlement 和 Persistence Settlement：Run 可以 completed，而保存冲突时 persistence rejected、reusable false；不会回滚历史或重跑模型／工具。

## 5. H-T01～H-T33 覆盖映射

缩写 B／R／S 分别指 [before-tool-call.test.ts](../../../test/before-tool-call.test.ts)、[approval-run-control.test.ts](../../../test/approval-run-control.test.ts)、[approval-session-loop.test.ts](../../../test/approval-session-loop.test.ts)。以下行号定位到测试定义或参数化测试定义；单个定义可能生成多项 Node Test Runner 用例。

| 编号 | 文件与行号 | 关键证据 |
| --- | --- | --- |
| H-T01 | B L68 | 无 Hook 原路径，工具一次、下一轮模型收到结果 |
| H-T02 | B L84 | 同步／异步 allow；Hook→Tool 次序且各一次 |
| H-T03 | B L105 | 同步／异步 deny；工具零次、DENIED、模型继续 |
| H-T04 | B L130 | 同步 throw → 固定 PRE_EXECUTION_FAILED |
| H-T05 | B L130 | Promise reject → 固定 PRE_EXECUTION_FAILED |
| H-T06 | B L162、177 | 多种非法值、throwing type getter、异步非法值均不执行工具 |
| H-T07 | B L188 | 未找到工具，Hook 零次，TOOL_NOT_FOUND 不变 |
| H-T08 | B L200 | 参数非法，Hook／Tool 零次，INVALID_ARGUMENTS 不变 |
| H-T09 | B L217、228、243、266、278 | Lookup、compile、validator、clone、serialization 故障不被 Hook catch 吞掉 |
| H-T10 | B L296 | 独立 Executor 顺序强制 allow 和 deny |
| H-T11 | B L311 | Hook 改 nested arguments，实际参数、原响应和历史仍为原值 |
| H-T12 | B L338 | 改 ID／name／arguments 不重定向工具，Result 仍关联原 ID |
| H-T13 | B L368 | 修改副本后 deny，已提交 ToolCall 和下次请求不变 |
| H-T14 | B L392 | 同步／异步敏感 Error.message／stack 不进入历史或 ModelRequest |
| H-T15 | B L419 | 同一 Runtime 两个 Run 分别调用同一构造 Hook，决策各自生效 |
| H-T16 | R L96 | 永久 pending 后 Abort，Run aborted，listener 清理且 ownership 释放 |
| H-T17 | R L96 | Hook Signal 与 Caller 原对象严格相等 |
| H-T18 | R L144 | Hook 内同步 Abort 再 allow，工具零次 |
| H-T19 | R L195 | Abort 结算后迟到 allow，不执行、不改历史／事件、不重复结果 |
| H-T20 | R L228 | 迟到 reject 已被观察，无 unhandledRejection |
| H-T21 | R L268 | Hook rejection 先被接受，随后 Abort，当前失败归因保留 |
| H-T22 | R L228 | Abort 先结算，后续 Hook Error 不覆盖 cancelled |
| H-T23 | R L338 | A success，B 等待中取消，C 未启动，原结果及唯一配对保留 |
| H-T24 | R L96 | Pending 时并发 run fail fast，State／events／Provider 次数不增加 |
| H-T25 | R L96 | Abort 结算后下一 run 正常 completed |
| H-T26 | R L379 | deny／Hook Error 仍为 started→completed，并完成下一模型回合 |
| H-T27 | R L96、144、195、228 | Approval Abort 没有虚假 completed |
| H-T28 | S L28 | maxTurns final batch skipped，Hook／Tool 零次 |
| H-T29 | S L53 | allow／deny／error 三个结果完整配对，下一请求包含正确事实 |
| H-T30 | B L105；S L53 | deny 后模型正常回答，RunOutcome completed |
| H-T31 | S L158 | Memory／SQLite × deny／error 均可 runAndSave、load、再次保存 |
| H-T32 | S L158 | 恢复含 deny／error 的历史，旧 Hook／Tool 不重放 |
| H-T33 | S L209 | Memory／SQLite × deny／error CAS Conflict；Run 保留、reusable false |

额外覆盖：R L167 的 allow 已接受后执行前取消；R L306 的 deny 已接受后 Abort；R L412 的四类结算 listener 清理；R L444 的无 Signal 等待；S L115 的 Memory／SQLite Approval Abort 保存恢复。H-T01～33 没有未覆盖项，编号总数不等于参数化展开后的测试数量。

validator 故障测试通过临时替换 Ajv.prototype.compile 注入一个抛出原始 Error 的校验函数，finally 恢复原描述符；这证明 catch 边界，不表示曾在真实 Ajv 中发现校验器 Bug。循环结果和非法参数同样是有意构造的契约故障注入，不应写成生产事故。

## 6. 测试数量与实际验证

| 阶段 | 结果 | 证据含义 |
| --- | --- | --- |
| VII-G 已确认基线 | 176 pass | 来自 VII-G 归档和既有测试基线 |
| VII-H Basic／Isolation 文件 | 30 pass、0 fail | 本会话实际执行该文件和严格测试类型检查 |
| VII-H 三个新增文件合跑 | 53 pass、0 fail | 本会话实际执行三个文件；30 + 11 + 12 |
| VII-H 完整功能验收 | 229 pass、0 fail | 176 + 53；本文件第 9 节归档实际完整命令输出，不以单文件验证替代完整验收 |

VII-H 实现阶段命令对应关系如下。`npm run typecheck` 不是本项目脚本；实际有效命令是 npm run typecheck:tests。本轮 Closure 请求中出现的 typecheck 简写和三条未限定的 Demo 占位，应按真实脚本落实；恢复的原始 Closure 第 10 轮实际明确写有 typecheck:tests 与 demo:tools／demo:recovery／demo:approval，不应倒写为原任务命令有误，更不能据占位声称真实 OpenAI Demo 通过。

| 命令 | 历史实现阶段最终结果／应核对内容 |
| --- | --- |
| `npm test` | 229 pass、0 fail、0 skipped、0 cancelled、0 todo |
| `npm run build` | TypeScript 源码构建通过 |
| `npm run typecheck:tests` | strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes 下测试类型检查通过 |
| `npm run demo:tools` | 确定性 Model→add→Model，结果 5 |
| `npm run demo:recovery` | 确定性 Provider；SQLite 关闭／重开，恢复历史并从 revision 1 更新至 2 |
| `npm run demo:approval -- --allow` | Hook 1、Tool 1、Model 2、唯一配对 1、completed |
| `npm run demo:approval -- --deny` | Hook 1、Tool 0、Model 2、唯一配对 1、completed |
| `git diff --check` | 通过 |

这里不声称执行过不存在的 npm run typecheck，也不把需真实 API Key 的 npm run demo 或 demo:runtime 纳入本轮确定性验收。无参数 demo:approval 是交互路径；自动化验收使用显式 --allow／--deny，避免等待人工输入。恢复的第 9 轮实施报告另记了 PTY 人工输入批准通过；本文件保留的可复核执行日志为上表八条命令，不据报告补造 PTY 原始输出。

实施与 Review 记录的环境是 Node.js v22.18.0；尚未独立执行 Node 20 兼容性矩阵。package.json 保留 Node >=20 声明，不能把声明等同于已验证全部受支持版本。

## 7. Debug 记录与证据边界

实现阶段曾在 Approval Demo 中遇到 TypeScript 的决策变量窄化与 readline question options 类型错误。最终 Demo 使用局部 `resolvedDecision: BeforeToolCallDecision` 后再记录 decision；没有 Signal 时向 question 传 `{}`，有 Signal 时传 `{ signal }`。随后构建与严格测试类型检查通过。此问题有当时实施报告与子任务反馈作为证据，但未恢复原始失败编译输出；这里只记录实际观察到的两类问题，不补造完整诊断正文、诊断编号或更多失败经历。

新增测试与只读 sanity check 没有发现需要修改 Runtime 结算协议的失败。没有依据把编译问题改写为“Abort Race 逻辑曾出错”或宣称经过并未发生的架构重构。

ChatGPT 第 9 轮最终 Review 为 PASS、Must Fix 0，但它是静态审查，没有独立执行 npm ci／npm test。其所收 `source-review(20261015-012420).zip` 缺 README 和 package-lock.json；本轮直接读取当前工作区补足工程归档所需内容，不等于回填了当时 ZIP，也不等于 ChatGPT 已审查过缺失附件。公开分享页只取得附件名称与正文，没有重新取得附件二进制。

本轮 Closure 只整理笔记／source 和文档索引。当前文件所引用的实现行号以功能 commit 600e7ef 为准；文档期检查由本轮主交付记录另外列出，不能把上表历史结果冒充新运行。功能源码、测试、依赖与构建配置不应因文档 Closure 改动；本文件没有创建 Git commit。

## 8. 仍然成立的限制

在途 Approval、Promise、Signal 与 Handler 不能保存或跨进程恢复；Executor 终止本地等待不保证远端审批请求被物理撤销；Abort 不回滚已经发生的工具副作用；Application Hook 不能代替真实外部 API 的权限控制。Caller 不提供 Signal 且 Handler 永不结算时，本轮允许持续等待。

这些是当前简单 Human Approval 的范围边界，不是通过添加隐藏超时、Durable Execution 或审批状态机解决的问题。

## 9. 实现阶段实际命令输出归档

以下来自本会话持久保存并于 Closure 恢复的 `/private/tmp/vii-h-implementation-verification.json`。该临时路径只解释来源；正文已随本 Markdown 归档。记录时间属于 2026-10-14 实现阶段，不是 2026-10-15 文档期重新执行。每条 exit code 均来自原工具结果，仅规范化行尾空白。

<details>
<summary>展开完整 229 项 npm test 日志（exit code 0）</summary>

```text

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

TAP version 13
# Subtest: normal run emits the minimal lifecycle and its returned outcome
ok 1 - normal run emits the minimal lifecycle and its returned outcome
  ---
  duration_ms: 10.8105
  type: 'test'
  ...
# Subtest: tool loop events follow execution and completed events observe committed facts
ok 2 - tool loop events follow execution and completed events observe committed facts
  ---
  duration_ms: 34.344333
  type: 'test'
  ...
# Subtest: multiple tools emit sequential started/completed pairs in execution order
ok 3 - multiple tools emit sequential started/completed pairs in execution order
  ---
  duration_ms: 39.42175
  type: 'test'
  ...
# Subtest: tool error contract still completes the tool execution lifecycle
ok 4 - tool error contract still completes the tool execution lifecycle
  ---
  duration_ms: 0.314292
  type: 'test'
  ...
# Subtest: maxTurns writes skipped results without tool execution events
ok 5 - maxTurns writes skipped results without tool execution events
  ---
  duration_ms: 0.276542
  type: 'test'
  ...
# Subtest: each subscriber receives payloads isolated from runtime facts and other subscribers
ok 6 - each subscriber receives payloads isolated from runtime facts and other subscribers
  ---
  duration_ms: 137.218208
  type: 'test'
  ...
# Subtest: run_finished outcome payload is detached from the returned outcome
ok 7 - run_finished outcome payload is detached from the returned outcome
  ---
  duration_ms: 1.415209
  type: 'test'
  ...
# Subtest: subscriber failures do not affect the run or other subscribers
ok 8 - subscriber failures do not affect the run or other subscribers
  ---
  duration_ms: 0.637042
  type: 'test'
  ...
# Subtest: unsubscribe is idempotent and stops later notifications
ok 9 - unsubscribe is idempotent and stops later notifications
  ---
  duration_ms: 1.091
  type: 'test'
  ...
# Subtest: provider errors propagate unchanged without run_finished
ok 10 - provider errors propagate unchanged without run_finished
  ---
  duration_ms: 1.11275
  type: 'test'
  ...
# Subtest: completes a normal answer and records runtime facts
ok 11 - completes a normal answer and records runtime facts
  ---
  duration_ms: 2.596709
  type: 'test'
  ...
# Subtest: retains conversation across two runs on the same runtime
ok 12 - retains conversation across two runs on the same runtime
  ---
  duration_ms: 12.671833
  type: 'test'
  ...
# Subtest: records missing tool failure and continues within the same run
ok 13 - records missing tool failure and continues within the same run
  ---
  duration_ms: 10.550333
  type: 'test'
  ...
# Subtest: preserves output for length without retry or continuation
ok 14 - preserves output for length without retry or continuation
  ---
  duration_ms: 0.30925
  type: 'test'
  ...
# Subtest: preserves output for unknown without retry or continuation
ok 15 - preserves output for unknown without retry or continuation
  ---
  duration_ms: 0.350916
  type: 'test'
  ...
# Subtest: propagates the original provider throw without retry
ok 16 - propagates the original provider throw without retry
  ---
  duration_ms: 0.405833
  type: 'test'
  ...
# Subtest: propagates the original provider reject without retry
ok 17 - propagates the original provider reject without retry
  ---
  duration_ms: 0.22375
  type: 'test'
  ...
# Subtest: history copies protect the array, messages, tool calls and nested arguments
ok 18 - history copies protect the array, messages, tool calls and nested arguments
  ---
  duration_ms: 0.321542
  type: 'test'
  ...
# Subtest: provider response and request references cannot mutate runtime facts
ok 19 - provider response and request references cannot mutate runtime facts
  ---
  duration_ms: 0.707417
  type: 'test'
  ...
# Subtest: dual settlement runFails=false, saveFails=false
ok 20 - dual settlement runFails=false, saveFails=false
  ---
  duration_ms: 8.746458
  type: 'test'
  ...
# Subtest: dual settlement runFails=false, saveFails=true
ok 21 - dual settlement runFails=false, saveFails=true
  ---
  duration_ms: 0.591417
  type: 'test'
  ...
# Subtest: dual settlement runFails=true, saveFails=false
ok 22 - dual settlement runFails=true, saveFails=false
  ---
  duration_ms: 0.237042
  type: 'test'
  ...
# Subtest: dual settlement runFails=true, saveFails=true
ok 23 - dual settlement runFails=true, saveFails=true
  ---
  duration_ms: 0.28975
  type: 'test'
  ...
# Subtest: incomplete history after run rejection is neither saved nor reused
ok 24 - incomplete history after run rejection is neither saved nor reused
  ---
  duration_ms: 24.057208
  type: 'test'
  ...
# Subtest: abort with complete cancelled results can be saved
ok 25 - abort with complete cancelled results can be saved
  ---
  duration_ms: 1.201708
  type: 'test'
  ...
# Subtest: pre-aborted run skips save (existing=false)
ok 26 - pre-aborted run skips save (existing=false)
  ---
  duration_ms: 0.298083
  type: 'test'
  ...
# Subtest: pre-aborted run skips save (existing=true)
ok 27 - pre-aborted run skips save (existing=true)
  ---
  duration_ms: 0.406541
  type: 'test'
  ...
# Subtest: CAS conflict never reruns provider or tool and retains runtime facts
ok 28 - CAS conflict never reruns provider or tool and retains runtime facts
  ---
  duration_ms: 7.193833
  type: 'test'
  ...
# Subtest: application awaits save settlement before starting the next run
ok 29 - application awaits save settlement before starting the next run
  ---
  duration_ms: 2.748625
  type: 'test'
  ...
# Subtest: settled length output is saveable when paired
ok 30 - settled length output is saveable when paired
  ---
  duration_ms: 0.250583
  type: 'test'
  ...
# Subtest: settled unknown output is saveable when paired
ok 31 - settled unknown output is saveable when paired
  ---
  duration_ms: 0.23125
  type: 'test'
  ...
# Subtest: settled tool_calls output is saveable when paired
ok 32 - settled tool_calls output is saveable when paired
  ---
  duration_ms: 0.188
  type: 'test'
  ...
# Subtest: completed outcome is preserved even when its unpaired history cannot be saved
ok 33 - completed outcome is preserved even when its unpaired history cannot be saved
  ---
  duration_ms: 0.184709
  type: 'test'
  ...
# Subtest: H-T16/17/24/25/27: pending approval abort releases ownership, preserves signal, and pairs without completed events
ok 34 - H-T16/17/24/25/27: pending approval abort releases ownership, preserves signal, and pairs without completed events
  ---
  duration_ms: 47.375041
  type: 'test'
  ...
# Subtest: H-T18: synchronous hook abort followed by allow cannot start Tool.execute
ok 35 - H-T18: synchronous hook abort followed by allow cannot start Tool.execute
  ---
  duration_ms: 37.372084
  type: 'test'
  ...
# Subtest: accepted allow followed by abort before tool invocation still cancels the attempt
ok 36 - accepted allow followed by abort before tool invocation still cancels the attempt
  ---
  duration_ms: 10.240792
  type: 'test'
  ...
# Subtest: H-T19: late allow after approval cancellation cannot execute or append another result
ok 37 - H-T19: late allow after approval cancellation cannot execute or append another result
  ---
  duration_ms: 57.835041
  type: 'test'
  ...
# Subtest: H-T20/22: late hook rejection after abort is handled and cannot rewrite cancelled pairing
ok 38 - H-T20/22: late hook rejection after abort is handled and cannot rewrite cancelled pairing
  ---
  duration_ms: 28.83125
  type: 'test'
  ...
# Subtest: H-T21: accepted hook error retains ordinary failure when caller aborts before runtime receives it
ok 39 - H-T21: accepted hook error retains ordinary failure when caller aborts before runtime receives it
  ---
  duration_ms: 14.684875
  type: 'test'
  ...
# Subtest: accepted deny remains a completed failure when caller aborts before runtime receives it
ok 40 - accepted deny remains a completed failure when caller aborts before runtime receives it
  ---
  duration_ms: 6.476375
  type: 'test'
  ...
# Subtest: H-T23: a successful A remains committed while approval abort cancels B and the unstarted C
ok 41 - H-T23: a successful A remains committed while approval abort cancels B and the unstarted C
  ---
  duration_ms: 18.020833
  type: 'test'
  ...
# Subtest: H-T26: deny and hook error retain the existing started/completed ordering and continue the loop
ok 42 - H-T26: deny and hook error retain the existing started/completed ordering and continue the loop
  ---
  duration_ms: 33.219666
  type: 'test'
  ...
# Subtest: approval abort listeners are removed after allow, deny, rejection, and cancellation
ok 43 - approval abort listeners are removed after allow, deny, rejection, and cancellation
  ---
  duration_ms: 45.732
  type: 'test'
  ...
# Subtest: without a caller signal, approval remains pending until the application settles it
ok 44 - without a caller signal, approval remains pending until the application settles it
  ---
  duration_ms: 6.279125
  type: 'test'
  ...
# Subtest: H-T28: maxTurns pairs skipped calls without invoking authorization
ok 45 - H-T28: maxTurns pairs skipped calls without invoking authorization
  ---
  duration_ms: 10.344291
  type: 'test'
  ...
# Subtest: H-T29/H-T30: allow, deny and hook error pair before the next model answer
ok 46 - H-T29/H-T30: allow, deny and hook error pair before the next model answer
  ---
  duration_ms: 62.838208
  type: 'test'
  ...
# Subtest: memory saves approval-aborted pairing and recovers without the pending hook
ok 47 - memory saves approval-aborted pairing and recovers without the pending hook
  ---
  duration_ms: 23.083459
  type: 'test'
  ...
# Subtest: H-T31/H-T32: memory saves and recovers deny without replaying approval
ok 48 - H-T31/H-T32: memory saves and recovers deny without replaying approval
  ---
  duration_ms: 6.435458
  type: 'test'
  ...
# Subtest: H-T33: memory CAS conflict retains deny run settlement and disables reuse
ok 49 - H-T33: memory CAS conflict retains deny run settlement and disables reuse
  ---
  duration_ms: 3.54425
  type: 'test'
  ...
# Subtest: H-T31/H-T32: memory saves and recovers error without replaying approval
ok 50 - H-T31/H-T32: memory saves and recovers error without replaying approval
  ---
  duration_ms: 4.788166
  type: 'test'
  ...
# Subtest: H-T33: memory CAS conflict retains error run settlement and disables reuse
ok 51 - H-T33: memory CAS conflict retains error run settlement and disables reuse
  ---
  duration_ms: 11.055917
  type: 'test'
  ...
# Subtest: sqlite saves approval-aborted pairing and recovers without the pending hook
ok 52 - sqlite saves approval-aborted pairing and recovers without the pending hook
  ---
  duration_ms: 15.599083
  type: 'test'
  ...
# Subtest: H-T31/H-T32: sqlite saves and recovers deny without replaying approval
ok 53 - H-T31/H-T32: sqlite saves and recovers deny without replaying approval
  ---
  duration_ms: 50.668166
  type: 'test'
  ...
# Subtest: H-T33: sqlite CAS conflict retains deny run settlement and disables reuse
ok 54 - H-T33: sqlite CAS conflict retains deny run settlement and disables reuse
  ---
  duration_ms: 7.382917
  type: 'test'
  ...
# Subtest: H-T31/H-T32: sqlite saves and recovers error without replaying approval
ok 55 - H-T31/H-T32: sqlite saves and recovers error without replaying approval
  ---
  duration_ms: 28.346625
  type: 'test'
  ...
# Subtest: H-T33: sqlite CAS conflict retains error run settlement and disables reuse
ok 56 - H-T33: sqlite CAS conflict retains error run settlement and disables reuse
  ---
  duration_ms: 8.35475
  type: 'test'
  ...
# Subtest: H-T01: an omitted hook preserves Model → Tool → Model execution
ok 57 - H-T01: an omitted hook preserves Model → Tool → Model execution
  ---
  duration_ms: 47.850916
  type: 'test'
  ...
# Subtest: H-T02: sync allow runs the hook once before the tool
ok 58 - H-T02: sync allow runs the hook once before the tool
  ---
  duration_ms: 22.082041
  type: 'test'
  ...
# Subtest: H-T02: async allow runs the hook once before the tool
ok 59 - H-T02: async allow runs the hook once before the tool
  ---
  duration_ms: 37.696042
  type: 'test'
  ...
# Subtest: H-T03: sync deny never executes and lets the model continue
ok 60 - H-T03: sync deny never executes and lets the model continue
  ---
  duration_ms: 19.381334
  type: 'test'
  ...
# Subtest: H-T03: async deny never executes and lets the model continue
ok 61 - H-T03: async deny never executes and lets the model continue
  ---
  duration_ms: 9.66325
  type: 'test'
  ...
# Subtest: H-T04: hook throw becomes a fixed authorization failure
ok 62 - H-T04: hook throw becomes a fixed authorization failure
  ---
  duration_ms: 51.86175
  type: 'test'
  ...
# Subtest: H-T05: hook reject becomes a fixed authorization failure
ok 63 - H-T05: hook reject becomes a fixed authorization failure
  ---
  duration_ms: 11.812417
  type: 'test'
  ...
# Subtest: H-T06: malformed undefined decision fails closed
ok 64 - H-T06: malformed undefined decision fails closed
  ---
  duration_ms: 6.338625
  type: 'test'
  ...
# Subtest: H-T06: malformed null decision fails closed
ok 65 - H-T06: malformed null decision fails closed
  ---
  duration_ms: 24.653583
  type: 'test'
  ...
# Subtest: H-T06: malformed boolean decision fails closed
ok 66 - H-T06: malformed boolean decision fails closed
  ---
  duration_ms: 23.440834
  type: 'test'
  ...
# Subtest: H-T06: malformed string decision fails closed
ok 67 - H-T06: malformed string decision fails closed
  ---
  duration_ms: 25.112417
  type: 'test'
  ...
# Subtest: H-T06: malformed empty object decision fails closed
ok 68 - H-T06: malformed empty object decision fails closed
  ---
  duration_ms: 4.121708
  type: 'test'
  ...
# Subtest: H-T06: malformed third decision decision fails closed
ok 69 - H-T06: malformed third decision decision fails closed
  ---
  duration_ms: 5.100083
  type: 'test'
  ...
# Subtest: H-T06: malformed wrong type decision fails closed
ok 70 - H-T06: malformed wrong type decision fails closed
  ---
  duration_ms: 4.987083
  type: 'test'
  ...
# Subtest: H-T06: malformed throwing type getter decision fails closed
ok 71 - H-T06: malformed throwing type getter decision fails closed
  ---
  duration_ms: 2.622583
  type: 'test'
  ...
# Subtest: H-T06: an asynchronously returned illegal decision also fails closed
ok 72 - H-T06: an asynchronously returned illegal decision also fails closed
  ---
  duration_ms: 2.453167
  type: 'test'
  ...
# Subtest: H-T07: an unknown tool keeps TOOL_NOT_FOUND and bypasses the hook
ok 73 - H-T07: an unknown tool keeps TOOL_NOT_FOUND and bypasses the hook
  ---
  duration_ms: 0.165875
  type: 'test'
  ...
# Subtest: H-T08: invalid arguments keep INVALID_ARGUMENTS and bypass the hook and tool
ok 74 - H-T08: invalid arguments keep INVALID_ARGUMENTS and bypass the hook and tool
  ---
  duration_ms: 7.159708
  type: 'test'
  ...
# Subtest: H-T09: registry lookup bugs still propagate unchanged with a hook configured
ok 75 - H-T09: registry lookup bugs still propagate unchanged with a hook configured
  ---
  duration_ms: 0.738292
  type: 'test'
  ...
# Subtest: H-T09: schema compilation and unsupported async schemas retain their propagation contract
ok 76 - H-T09: schema compilation and unsupported async schemas retain their propagation contract
  ---
  duration_ms: 10.501792
  type: 'test'
  ...
# Subtest: H-T09: a validator internal exception propagates unchanged outside hook normalization
ok 77 - H-T09: a validator internal exception propagates unchanged outside hook normalization
  ---
  duration_ms: 1.642333
  type: 'test'
  ...
# Subtest: H-T09: non-cloneable arguments remain an executor internal failure
ok 78 - H-T09: non-cloneable arguments remain an executor internal failure
  ---
  duration_ms: 7.334042
  type: 'test'
  ...
# Subtest: H-T09: circular result serialization still propagates from runtime after authorization
ok 79 - H-T09: circular result serialization still propagates from runtime after authorization
  ---
  duration_ms: 4.365834
  type: 'test'
  ...
# Subtest: H-T10: a standalone executor enforces both allow and deny
ok 80 - H-T10: a standalone executor enforces both allow and deny
  ---
  duration_ms: 3.2805
  type: 'test'
  ...
# Subtest: H-T11: nested hook arguments are detached from actual execution and recorded history
ok 81 - H-T11: nested hook arguments are detached from actual execution and recorded history
  ---
  duration_ms: 7.636958
  type: 'test'
  ...
# Subtest: H-T12: hook changes to id, name and arguments cannot redirect execution or result pairing
ok 82 - H-T12: hook changes to id, name and arguments cannot redirect execution or result pairing
  ---
  duration_ms: 9.561458
  type: 'test'
  ...
# Subtest: H-T13: hook mutation followed by denial preserves the committed ToolCall
ok 83 - H-T13: hook mutation followed by denial preserves the committed ToolCall
  ---
  duration_ms: 2.939166
  type: 'test'
  ...
# Subtest: H-T14: sensitive hook throw data is absent from ToolResult and ModelRequest
ok 84 - H-T14: sensitive hook throw data is absent from ToolResult and ModelRequest
  ---
  duration_ms: 2.82675
  type: 'test'
  ...
# Subtest: H-T14: sensitive hook reject data is absent from ToolResult and ModelRequest
ok 85 - H-T14: sensitive hook reject data is absent from ToolResult and ModelRequest
  ---
  duration_ms: 5.119208
  type: 'test'
  ...
# Subtest: H-T15: one constructor-injected hook independently authorizes multiple runs
ok 86 - H-T15: one constructor-injected hook independently authorizes multiple runs
  ---
  duration_ms: 5.799084
  type: 'test'
  ...
# Subtest: projects all message kinds in order, preserving optional fields and call/result pairing
ok 87 - projects all message kinds in order, preserving optional fields and call/result pairing
  ---
  duration_ms: 0.885958
  type: 'test'
  ...
# Subtest: snapshot array, messages, calls and nested arguments cannot mutate input history
ok 88 - snapshot array, messages, calls and nested arguments cannot mutate input history
  ---
  duration_ms: 0.13675
  type: 'test'
  ...
# Subtest: later input mutations and builds leave an earlier snapshot unchanged
ok 89 - later input mutations and builds leave an earlier snapshot unchanged
  ---
  duration_ms: 0.157083
  type: 'test'
  ...
# Subtest: snapshot tools match the registry and isolate definitions and nested schemas in both directions
ok 90 - snapshot tools match the registry and isolate definitions and nested schemas in both directions
  ---
  duration_ms: 0.24225
  type: 'test'
  ...
# Subtest: conversation accepts empty without mutation
ok 91 - conversation accepts empty without mutation
  ---
  duration_ms: 1.310708
  type: 'test'
  ...
# Subtest: conversation accepts normal user/model without mutation
ok 92 - conversation accepts normal user/model without mutation
  ---
  duration_ms: 0.21675
  type: 'test'
  ...
# Subtest: conversation accepts provider failure user only without mutation
ok 93 - conversation accepts provider failure user only without mutation
  ---
  duration_ms: 0.131041
  type: 'test'
  ...
# Subtest: conversation accepts consecutive users and empty model output without mutation
ok 94 - conversation accepts consecutive users and empty model output without mutation
  ---
  duration_ms: 0.180416
  type: 'test'
  ...
# Subtest: conversation accepts paired opaque non-JSON result without mutation
ok 95 - conversation accepts paired opaque non-JSON result without mutation
  ---
  duration_ms: 0.071583
  type: 'test'
  ...
# Subtest: conversation accepts multiple sequential calls without mutation
ok 96 - conversation accepts multiple sequential calls without mutation
  ---
  duration_ms: 0.052833
  type: 'test'
  ...
# Subtest: conversation accepts separate complete batches without mutation
ok 97 - conversation accepts separate complete batches without mutation
  ---
  duration_ms: 0.121208
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_CALL_CANCELLED without mutation
ok 98 - conversation accepts TOOL_CALL_CANCELLED without mutation
  ---
  duration_ms: 0.041208
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_EXECUTION_SKIPPED without mutation
ok 99 - conversation accepts TOOL_EXECUTION_SKIPPED without mutation
  ---
  duration_ms: 0.153083
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_EXECUTION_FAILED without mutation
ok 100 - conversation accepts TOOL_EXECUTION_FAILED without mutation
  ---
  duration_ms: 0.275
  type: 'test'
  ...
# Subtest: conversation rejects missing result as protocol error
ok 101 - conversation rejects missing result as protocol error
  ---
  duration_ms: 0.207458
  type: 'test'
  ...
# Subtest: conversation rejects duplicate result as protocol error
ok 102 - conversation rejects duplicate result as protocol error
  ---
  duration_ms: 0.055917
  type: 'test'
  ...
# Subtest: conversation rejects orphan result as protocol error
ok 103 - conversation rejects orphan result as protocol error
  ---
  duration_ms: 0.036666
  type: 'test'
  ...
# Subtest: conversation rejects duplicate ID in batch as protocol error
ok 104 - conversation rejects duplicate ID in batch as protocol error
  ---
  duration_ms: 0.042791
  type: 'test'
  ...
# Subtest: conversation rejects duplicate ID across batches as protocol error
ok 105 - conversation rejects duplicate ID across batches as protocol error
  ---
  duration_ms: 1.005542
  type: 'test'
  ...
# Subtest: conversation rejects interrupted batch as protocol error
ok 106 - conversation rejects interrupted batch as protocol error
  ---
  duration_ms: 0.177583
  type: 'test'
  ...
# Subtest: conversation rejects cross batch pairing as protocol error
ok 107 - conversation rejects cross batch pairing as protocol error
  ---
  duration_ms: 0.114667
  type: 'test'
  ...
# Subtest: conversation rejects wrong batch result as protocol error
ok 108 - conversation rejects wrong batch result as protocol error
  ---
  duration_ms: 0.088167
  type: 'test'
  ...
# Subtest: conversation rejects null history as structure error
ok 109 - conversation rejects null history as structure error
  ---
  duration_ms: 0.406709
  type: 'test'
  ...
# Subtest: conversation rejects object history as structure error
ok 110 - conversation rejects object history as structure error
  ---
  duration_ms: 0.083
  type: 'test'
  ...
# Subtest: conversation rejects null message as structure error
ok 111 - conversation rejects null message as structure error
  ---
  duration_ms: 0.068125
  type: 'test'
  ...
# Subtest: conversation rejects unknown type as structure error
ok 112 - conversation rejects unknown type as structure error
  ---
  duration_ms: 0.064625
  type: 'test'
  ...
# Subtest: conversation rejects user missing content as structure error
ok 113 - conversation rejects user missing content as structure error
  ---
  duration_ms: 0.057916
  type: 'test'
  ...
# Subtest: conversation rejects user wrong content as structure error
ok 114 - conversation rejects user wrong content as structure error
  ---
  duration_ms: 0.054833
  type: 'test'
  ...
# Subtest: conversation rejects model wrong content as structure error
ok 115 - conversation rejects model wrong content as structure error
  ---
  duration_ms: 0.053917
  type: 'test'
  ...
# Subtest: conversation rejects model wrong calls as structure error
ok 116 - conversation rejects model wrong calls as structure error
  ---
  duration_ms: 0.056042
  type: 'test'
  ...
# Subtest: conversation rejects result wrong id as structure error
ok 117 - conversation rejects result wrong id as structure error
  ---
  duration_ms: 0.05575
  type: 'test'
  ...
# Subtest: conversation rejects result missing content as structure error
ok 118 - conversation rejects result missing content as structure error
  ---
  duration_ms: 0.062292
  type: 'test'
  ...
# Subtest: conversation rejects bad call 0 as structure error
ok 119 - conversation rejects bad call 0 as structure error
  ---
  duration_ms: 0.055083
  type: 'test'
  ...
# Subtest: conversation rejects bad call 1 as structure error
ok 120 - conversation rejects bad call 1 as structure error
  ---
  duration_ms: 0.058667
  type: 'test'
  ...
# Subtest: conversation rejects bad call 2 as structure error
ok 121 - conversation rejects bad call 2 as structure error
  ---
  duration_ms: 0.059417
  type: 'test'
  ...
# Subtest: conversation rejects bad call 3 as structure error
ok 122 - conversation rejects bad call 3 as structure error
  ---
  duration_ms: 0.058834
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 0 as structure error
ok 123 - conversation rejects non-JSON arguments 0 as structure error
  ---
  duration_ms: 0.128917
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 1 as structure error
ok 124 - conversation rejects non-JSON arguments 1 as structure error
  ---
  duration_ms: 0.066375
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 2 as structure error
ok 125 - conversation rejects non-JSON arguments 2 as structure error
  ---
  duration_ms: 0.066
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 3 as structure error
ok 126 - conversation rejects non-JSON arguments 3 as structure error
  ---
  duration_ms: 0.063375
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 4 as structure error
ok 127 - conversation rejects non-JSON arguments 4 as structure error
  ---
  duration_ms: 0.060958
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 5 as structure error
ok 128 - conversation rejects non-JSON arguments 5 as structure error
  ---
  duration_ms: 0.071125
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 6 as structure error
ok 129 - conversation rejects non-JSON arguments 6 as structure error
  ---
  duration_ms: 0.064667
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 7 as structure error
ok 130 - conversation rejects non-JSON arguments 7 as structure error
  ---
  duration_ms: 0.06425
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 8 as structure error
ok 131 - conversation rejects non-JSON arguments 8 as structure error
  ---
  duration_ms: 0.069959
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 9 as structure error
ok 132 - conversation rejects non-JSON arguments 9 as structure error
  ---
  duration_ms: 0.068875
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 10 as structure error
ok 133 - conversation rejects non-JSON arguments 10 as structure error
  ---
  duration_ms: 0.188625
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 11 as structure error
ok 134 - conversation rejects non-JSON arguments 11 as structure error
  ---
  duration_ms: 0.105583
  type: 'test'
  ...
# Subtest: conversation rejects symbol properties, accessors and custom array prototypes
ok 135 - conversation rejects symbol properties, accessors and custom array prototypes
  ---
  duration_ms: 0.359167
  type: 'test'
  ...
# Subtest: maps provider-neutral model messages to OpenAI chat messages
ok 136 - maps provider-neutral model messages to OpenAI chat messages
  ---
  duration_ms: 2.453333
  type: 'test'
  ...
# Subtest: maps provider-neutral tool definitions to OpenAI function tools
ok 137 - maps provider-neutral tool definitions to OpenAI function tools
  ---
  duration_ms: 0.4565
  type: 'test'
  ...
# Subtest: maps OpenAI assistant text to a Runtime assistant message
ok 138 - maps OpenAI assistant text to a Runtime assistant message
  ---
  duration_ms: 0.145084
  type: 'test'
  ...
# Subtest: maps an OpenAI function tool call and parses its arguments
ok 139 - maps an OpenAI function tool call and parses its arguments
  ---
  duration_ms: 0.979958
  type: 'test'
  ...
# Subtest: fails explicitly when OpenAI tool call arguments contain invalid JSON
ok 140 - fails explicitly when OpenAI tool call arguments contain invalid JSON
  ---
  duration_ms: 0.410542
  type: 'test'
  ...
# Subtest: maps known finish reasons and normalizes provider-specific reasons
ok 141 - maps known finish reasons and normalizes provider-specific reasons
  ---
  duration_ms: 0.065833
  type: 'test'
  ...
# Subtest: maps OpenAI usage to the Runtime usage model
ok 142 - maps OpenAI usage to the Runtime usage model
  ---
  duration_ms: 0.116167
  type: 'test'
  ...
# Subtest: maps a complete OpenAI response without leaking its raw shape
ok 143 - maps a complete OpenAI response without leaking its raw shape
  ---
  duration_ms: 0.077083
  type: 'test'
  ...
# Subtest: a concurrent run fails before state, events, or provider work and leaves the first run intact
ok 144 - a concurrent run fails before state, events, or provider work and leaves the first run intact
  ---
  duration_ms: 13.612792
  type: 'test'
  ...
# Subtest: a subscriber reentrant run is rejected by the same active-run guard
ok 145 - a subscriber reentrant run is rejected by the same active-run guard
  ---
  duration_ms: 0.531791
  type: 'test'
  ...
# Subtest: pre-aborted runs have no state, provider, or event lifecycle
ok 146 - pre-aborted runs have no state, provider, or event lifecycle
  ---
  duration_ms: 0.231167
  type: 'test'
  ...
# Subtest: provider receives the same signal and an aborted returned response is not committed
ok 147 - provider receives the same signal and an aborted returned response is not committed
  ---
  duration_ms: 3.045792
  type: 'test'
  ...
# Subtest: provider rejection while the current signal is aborted settles the run as aborted
ok 148 - provider rejection while the current signal is aborted settles the run as aborted
  ---
  duration_ms: 0.369375
  type: 'test'
  ...
# Subtest: an unrelated provider rejection racing with abort preserves identity and releases ownership
ok 149 - an unrelated provider rejection racing with abort preserves identity and releases ownership
  ---
  duration_ms: 2.926625
  type: 'test'
  ...
# Subtest: an unrelated provider error preserves identity and releases ownership
ok 150 - an unrelated provider error preserves identity and releases ownership
  ---
  duration_ms: 0.370959
  type: 'test'
  ...
# Subtest: abort before tool start pairs every call without tool execution events
ok 151 - abort before tool start pairs every call without tool execution events
  ---
  duration_ms: 0.364459
  type: 'test'
  ...
# Subtest: ToolExecutor passes the same signal and separates cooperative cancellation from normal failure
ok 152 - ToolExecutor passes the same signal and separates cooperative cancellation from normal failure
  ---
  duration_ms: 92.073083
  type: 'test'
  ...
# Subtest: an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED
ok 153 - an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED
  ---
  duration_ms: 12.343458
  type: 'test'
  ...
# Subtest: abort during a tool writes cancellation pairing without a completed event
ok 154 - abort during a tool writes cancellation pairing without a completed event
  ---
  duration_ms: 21.315
  type: 'test'
  ...
# Subtest: a successful tool result commits before late abort stops the next model turn
ok 155 - a successful tool result commits before late abort stops the next model turn
  ---
  duration_ms: 8.947625
  type: 'test'
  ...
# Subtest: multiple tools preserve A, cancel B and C, and never execute C
ok 156 - multiple tools preserve A, cancel B and C, and never execute C
  ---
  duration_ms: 7.441292
  type: 'test'
  ...
# Subtest: normal, unsupported, limit and aborted outcomes all release active ownership
ok 157 - normal, unsupported, limit and aborted outcomes all release active ownership
  ---
  duration_ms: 1.955417
  type: 'test'
  ...
# Subtest: cancellation takes priority over maxTurns pairing
ok 158 - cancellation takes priority over maxTurns pairing
  ---
  duration_ms: 0.30175
  type: 'test'
  ...
# Subtest: constructor recovery is detached and does not call provider, tools or events
ok 159 - constructor recovery is detached and does not call provider, tools or events
  ---
  duration_ms: 12.553834
  type: 'test'
  ...
# Subtest: next model request includes recovered history and only new tool calls execute
ok 160 - next model request includes recovered history and only new tool calls execute
  ---
  duration_ms: 45.432375
  type: 'test'
  ...
# Subtest: historical tools need not be registered and are never replayed
ok 161 - historical tools need not be registered and are never replayed
  ---
  duration_ms: 0.397334
  type: 'test'
  ...
# Subtest: invalid initialMessages fail during construction before provider work
ok 162 - invalid initialMessages fail during construction before provider work
  ---
  duration_ms: 0.991125
  type: 'test'
  ...
# Subtest: recovered runtime preserves pre-abort and cooperative provider abort provenance
ok 163 - recovered runtime preserves pre-abort and cooperative provider abort provenance
  ---
  duration_ms: 0.674083
  type: 'test'
  ...
# Subtest: recovered runtime preserves tool cancellation pairing
ok 164 - recovered runtime preserves tool cancellation pairing
  ---
  duration_ms: 0.314083
  type: 'test'
  ...
# Subtest: recovered runtime still owns exactly one active run
ok 165 - recovered runtime still owns exactly one active run
  ---
  duration_ms: 0.447375
  type: 'test'
  ...
# Subtest: memory: missing session returns null
ok 166 - memory: missing session returns null
  ---
  duration_ms: 1.136791
  type: 'test'
  ...
# Subtest: memory: revision zero creates revision one
ok 167 - memory: revision zero creates revision one
  ---
  duration_ms: 5.814959
  type: 'test'
  ...
# Subtest: memory: duplicate create conflicts without changing history
ok 168 - memory: duplicate create conflicts without changing history
  ---
  duration_ms: 0.426416
  type: 'test'
  ...
# Subtest: memory: current revision updates and stale revision conflicts
ok 169 - memory: current revision updates and stale revision conflicts
  ---
  duration_ms: 0.154708
  type: 'test'
  ...
# Subtest: memory: updating a missing session does not create it
ok 170 - memory: updating a missing session does not create it
  ---
  duration_ms: 0.131125
  type: 'test'
  ...
# Subtest: memory: invalid session ids and revisions rejected
ok 171 - memory: invalid session ids and revisions rejected
  ---
  duration_ms: 2.144333
  type: 'test'
  ...
# Subtest: memory: invalid structure and pairing cannot overwrite valid snapshot
ok 172 - memory: invalid structure and pairing cannot overwrite valid snapshot
  ---
  duration_ms: 2.487875
  type: 'test'
  ...
# Subtest: memory: load and save deeply isolate both directions
ok 173 - memory: load and save deeply isolate both directions
  ---
  duration_ms: 0.441708
  type: 'test'
  ...
# Subtest: memory: safe revision extremes cannot bypass CAS or overflow
ok 174 - memory: safe revision extremes cannot bypass CAS or overflow
  ---
  duration_ms: 0.698209
  type: 'test'
  ...
# Subtest: memory: simultaneous writers have exactly one winner
ok 175 - memory: simultaneous writers have exactly one winner
  ---
  duration_ms: 0.740917
  type: 'test'
  ...
# Subtest: sqlite: missing session returns null
ok 176 - sqlite: missing session returns null
  ---
  duration_ms: 3.278625
  type: 'test'
  ...
# Subtest: sqlite: revision zero creates revision one
ok 177 - sqlite: revision zero creates revision one
  ---
  duration_ms: 2.198291
  type: 'test'
  ...
# Subtest: sqlite: duplicate create conflicts without changing history
ok 178 - sqlite: duplicate create conflicts without changing history
  ---
  duration_ms: 1.204083
  type: 'test'
  ...
# Subtest: sqlite: current revision updates and stale revision conflicts
ok 179 - sqlite: current revision updates and stale revision conflicts
  ---
  duration_ms: 1.932459
  type: 'test'
  ...
# Subtest: sqlite: updating a missing session does not create it
ok 180 - sqlite: updating a missing session does not create it
  ---
  duration_ms: 1.046958
  type: 'test'
  ...
# Subtest: sqlite: invalid session ids and revisions rejected
ok 181 - sqlite: invalid session ids and revisions rejected
  ---
  duration_ms: 1.020625
  type: 'test'
  ...
# Subtest: sqlite: invalid structure and pairing cannot overwrite valid snapshot
ok 182 - sqlite: invalid structure and pairing cannot overwrite valid snapshot
  ---
  duration_ms: 1.260083
  type: 'test'
  ...
# Subtest: sqlite: load and save deeply isolate both directions
ok 183 - sqlite: load and save deeply isolate both directions
  ---
  duration_ms: 1.167791
  type: 'test'
  ...
# Subtest: sqlite: safe revision extremes cannot bypass CAS or overflow
ok 184 - sqlite: safe revision extremes cannot bypass CAS or overflow
  ---
  duration_ms: 1.945042
  type: 'test'
  ...
# Subtest: sqlite: simultaneous writers have exactly one winner
ok 185 - sqlite: simultaneous writers have exactly one winner
  ---
  duration_ms: 1.254
  type: 'test'
  ...
# Subtest: SQLite close/reopen recovers into a new runtime and increments revision
ok 186 - SQLite close/reopen recovers into a new runtime and increments revision
  ---
  duration_ms: 8.51225
  type: 'test'
  ...
# Subtest: independent SQLite connections cannot overwrite the same old revision
ok 187 - independent SQLite connections cannot overwrite the same old revision
  ---
  duration_ms: 1.879792
  type: 'test'
  ...
# Subtest: SQLite revisions reach the maximum safely and cannot overflow
ok 188 - SQLite revisions reach the maximum safely and cannot overflow
  ---
  duration_ms: 1.588333
  type: 'test'
  ...
# Subtest: SQLite load rejects malformed JSON instead of returning null or conflict
ok 189 - SQLite load rejects malformed JSON instead of returning null or conflict
  ---
  duration_ms: 1.356792
  type: 'test'
  ...
# Subtest: SQLite load rejects bad structure instead of returning null or conflict
ok 190 - SQLite load rejects bad structure instead of returning null or conflict
  ---
  duration_ms: 1.245667
  type: 'test'
  ...
# Subtest: SQLite load rejects incomplete batch instead of returning null or conflict
ok 191 - SQLite load rejects incomplete batch instead of returning null or conflict
  ---
  duration_ms: 1.243542
  type: 'test'
  ...
# Subtest: SQLite load rejects wrong JSON root instead of returning null or conflict
ok 192 - SQLite load rejects wrong JSON root instead of returning null or conflict
  ---
  duration_ms: 1.122042
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 0
ok 193 - SQLite load rejects damaged revision 0
  ---
  duration_ms: 1.277209
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision -1
ok 194 - SQLite load rejects damaged revision -1
  ---
  duration_ms: 1.35575
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 9007199254740992
ok 195 - SQLite load rejects damaged revision 9007199254740992
  ---
  duration_ms: 1.250959
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 9223372036854775807
ok 196 - SQLite load rejects damaged revision 9223372036854775807
  ---
  duration_ms: 1.064542
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 1.5
ok 197 - SQLite load rejects damaged revision 1.5
  ---
  duration_ms: 1.21475
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision bad
ok 198 - SQLite load rejects damaged revision bad
  ---
  duration_ms: 1.139167
  type: 'test'
  ...
# Subtest: SQLite operational and constraint errors retain their own error identity
ok 199 - SQLite operational and constraint errors retain their own error identity
  ---
  duration_ms: 2.054125
  type: 'test'
  ...
# Subtest: SQLite cannot-open IO error and corrupt file error are not conflicts
ok 200 - SQLite cannot-open IO error and corrupt file error are not conflicts
  ---
  duration_ms: 1.148166
  type: 'test'
  ...
# Subtest: happy path uses registry definitions and result in the second turn of one run
ok 201 - happy path uses registry definitions and result in the second turn of one run
  ---
  duration_ms: 24.105208
  type: 'test'
  ...
# Subtest: each turn gets independent complete context from the latest facts and definitions
ok 202 - each turn gets independent complete context from the latest facts and definitions
  ---
  duration_ms: 9.254208
  type: 'test'
  ...
# Subtest: invalid arguments null never invoke execute and allow continuation
ok 203 - invalid arguments null never invoke execute and allow continuation
  ---
  duration_ms: 8.232459
  type: 'test'
  ...
# Subtest: invalid arguments [] never invoke execute and allow continuation
ok 204 - invalid arguments [] never invoke execute and allow continuation
  ---
  duration_ms: 7.444875
  type: 'test'
  ...
# Subtest: invalid arguments "bad" never invoke execute and allow continuation
ok 205 - invalid arguments "bad" never invoke execute and allow continuation
  ---
  duration_ms: 6.410542
  type: 'test'
  ...
# Subtest: invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
ok 206 - invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
  ---
  duration_ms: 4.767167
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2} never invoke execute and allow continuation
ok 207 - invalid arguments {"a":2} never invoke execute and allow continuation
  ---
  duration_ms: 6.745584
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
ok 208 - invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
  ---
  duration_ms: 4.131167
  type: 'test'
  ...
# Subtest: tool throw becomes an execution failure visible to the next model turn
ok 209 - tool throw becomes an execution failure visible to the next model turn
  ---
  duration_ms: 11.275292
  type: 'test'
  ...
# Subtest: tool reject becomes an execution failure visible to the next model turn
ok 210 - tool reject becomes an execution failure visible to the next model turn
  ---
  duration_ms: 3.14275
  type: 'test'
  ...
# Subtest: tool non-error becomes an execution failure visible to the next model turn
ok 211 - tool non-error becomes an execution failure visible to the next model turn
  ---
  duration_ms: 2.673459
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=false)
ok 212 - multiple calls finish sequentially before the next turn (mixed=false)
  ---
  duration_ms: 11.794042
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=true)
ok 213 - multiple calls finish sequentially before the next turn (mixed=true)
  ---
  duration_ms: 6.031917
  type: 'test'
  ...
# Subtest: maxTurns=1 counts model turns, skips final tools and resets per run
ok 214 - maxTurns=1 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 1.350208
  type: 'test'
  ...
# Subtest: maxTurns=3 counts model turns, skips final tools and resets per run
ok 215 - maxTurns=3 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 5.367292
  type: 'test'
  ...
# Subtest: maxTurns=default counts model turns, skips final tools and resets per run
ok 216 - maxTurns=default counts model turns, skips final tools and resets per run
  ---
  duration_ms: 4.4565
  type: 'test'
  ...
# Subtest: a run after limit_reached receives paired skipped results before the new user input
ok 217 - a run after limit_reached receives paired skipped results before the new user input
  ---
  duration_ms: 0.406417
  type: 'test'
  ...
# Subtest: stop on the last allowed turn still completes
ok 218 - stop on the last allowed turn still completes
  ---
  duration_ms: 0.207833
  type: 'test'
  ...
# Subtest: invalid maxTurns fails at construction
ok 219 - invalid maxTurns fails at construction
  ---
  duration_ms: 0.237125
  type: 'test'
  ...
# Subtest: provider failure after tool execution propagates the same error and preserves facts
ok 220 - provider failure after tool execution propagates the same error and preserves facts
  ---
  duration_ms: 6.578458
  type: 'test'
  ...
# Subtest: tool argument and result references cannot mutate history
ok 221 - tool argument and result references cannot mutate history
  ---
  duration_ms: 3.891083
  type: 'test'
  ...
# Subtest: registry rejects duplicates, preserves order and isolates schema references
ok 222 - registry rejects duplicates, preserves order and isolates schema references
  ---
  duration_ms: 4.845375
  type: 'test'
  ...
# Subtest: provider cannot change the schema used for tool validation
ok 223 - provider cannot change the schema used for tool validation
  ---
  duration_ms: 3.996459
  type: 'test'
  ...
# Subtest: invalid schema and async schema are configuration bugs, not invocation failures
ok 224 - invalid schema and async schema are configuration bugs, not invocation failures
  ---
  duration_ms: 7.154333
  type: 'test'
  ...
# Subtest: lookup bugs propagate unchanged
ok 225 - lookup bugs propagate unchanged
  ---
  duration_ms: 0.264667
  type: 'test'
  ...
# Subtest: result serialization bugs propagate outside the execute catch boundary
ok 226 - result serialization bugs propagate outside the execute catch boundary
  ---
  duration_ms: 3.44975
  type: 'test'
  ...
# Subtest: tool_calls without calls is an invariant violation
ok 227 - tool_calls without calls is an invariant violation
  ---
  duration_ms: 0.229
  type: 'test'
  ...
# Subtest: malformed tool_calls (missing) still throws on the final turn
ok 228 - malformed tool_calls (missing) still throws on the final turn
  ---
  duration_ms: 0.175542
  type: 'test'
  ...
# Subtest: malformed tool_calls (empty) still throws on the final turn
ok 229 - malformed tool_calls (empty) still throws on the final turn
  ---
  duration_ms: 0.13975
  type: 'test'
  ...
1..229
# tests 229
# suites 0
# pass 229
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 985.000541
```

</details>

### `npm run build`

原工具 exit code：0。

```text

> mini-agent-runtime@0.1.0 build
> tsc -p tsconfig.json

```

### `npm run typecheck:tests`

原工具 exit code：0。

```text

> mini-agent-runtime@0.1.0 typecheck:tests
> tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --skipLibCheck test/*.test.ts test/support/*.ts

```

### `npm run demo:tools`

原工具 exit code：0。

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

### `npm run demo:recovery`

原工具 exit code：0。

```text

> mini-agent-runtime@0.1.0 demo:recovery
> tsx src/demo/conversation-recovery-demo.ts

Run #1: {
  run: { status: 'fulfilled', value: { type: 'completed' } },
  persistence: {
    status: 'fulfilled',
    value: {
      sessionId: '6220be51-e87e-43d4-a220-73435e860463',
      revision: 1,
      messages: [Array]
    }
  },
  reusable: true
}
Recovered model request: {
  messages: [
    { role: 'user', content: '我叫小明' },
    { role: 'assistant', content: '你好，小明。' },
    { role: 'user', content: '我叫什么名字？' }
  ]
}
Run #2: {
  run: { status: 'fulfilled', value: { type: 'completed' } },
  persistence: {
    status: 'fulfilled',
    value: {
      sessionId: '6220be51-e87e-43d4-a220-73435e860463',
      revision: 2,
      messages: [Array]
    }
  },
  reusable: true
}
```

### `npm run demo:approval -- --allow`

原工具 exit code：0。

```text

> mini-agent-runtime@0.1.0 demo:approval
> tsx src/demo/approval-demo.ts --allow

Provider: deterministic demo (no external LLM, API or credentials)
User: 发布一条演示公告
Model turn 1: request publish_note
Application approval: publish_note {"title":"发布一条演示公告"}
Application decision: allow
Tool execute: simulated publication of 发布一条演示公告
Model turn 2 received tool_result: {"success":true,"result":{"published":true,"title":"发布一条演示公告"}}
Final answer: 已模拟发布公告：发布一条演示公告
RunOutcome: {"type":"completed"}
Verification passed: hook=1, tool=1, modelTurns=2, pairedResults=1
```

### `npm run demo:approval -- --deny`

原工具 exit code：0。

```text

> mini-agent-runtime@0.1.0 demo:approval
> tsx src/demo/approval-demo.ts --deny

Provider: deterministic demo (no external LLM, API or credentials)
User: 发布一条演示公告
Model turn 1: request publish_note
Application approval: publish_note {"title":"发布一条演示公告"}
Application decision: deny
Model turn 2 received tool_result: {"success":false,"error":{"code":"TOOL_EXECUTION_DENIED","message":"Tool execution was denied."}}
Final answer: 公告未发布：Tool execution was denied.
RunOutcome: {"type":"completed"}
Verification passed: hook=1, tool=0, modelTurns=2, pairedResults=1
```

### `git diff --check`

原工具 exit code：0。

无 stdout／stderr 输出。

## 10. Documentation Closure 校验（2026-10-15）

以下是本次文档期实际执行的静态校验，与第 9 节的历史 Runtime 命令明确分开。没有为了归档重跑 npm test、build、typecheck 或 Demo，没有执行新的业务调用。

| 校验对象 | 实际结果 |
| --- | --- |
| 主笔记章节 | 固定 17 章名称及顺序逐项相等 |
| 固定学习素材 | 16.1～16.9 九项齐全 |
| 决策映射 | 26 条候选、10 条正式决策及原因／替代方案／代码／测试证据齐全 |
| 本地文档链接与行号 | 六份文档共 213 个本地链接有效，109 个源码／测试／已有笔记行号在范围内；内部章节锚点存在 |
| 公开会话保全 | 137 条非空公开消息 ID 顺序和规范化正文全部对应，未丢失正文；196 节点当前分支覆盖完整 mapping |
| 历史日志保全 | 恢复的八条实际命令输出全部归档，逐条规范化后与原工具结果一致 |
| 受保护工程文件 | src、test、package.json、package-lock.json、tsconfig.json 共 45 文件，归档前后 SHA-256 全部相同，0 个变更 |
| 补丁格式 | 文档修改的 git diff --check 退出 0；新增 Markdown 另做行尾空白检查 |

仅新增主笔记和三份 H source，修改根 README 与 Day08 README。当前 HEAD 仍为 600e7ef；没有提交、没有修改历史附件包、没有生成 PDF/DOCX，也没有提前实现 VII-I。历史 ZIP 二进制／redacted 工具输出、首次失败编译诊断与逐字 PTY 日志仍未恢复；Node 20／其他平台仍未独立验证。这些缺口不能因文档校验通过而消失。
