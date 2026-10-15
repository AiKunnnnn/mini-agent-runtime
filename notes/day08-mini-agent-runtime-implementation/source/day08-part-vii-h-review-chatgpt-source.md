# Day08 · Part VII-H Implementation Report / Code Review / Theory Feedback / Closure Task — Full ChatGPT Source

> Source type: Full public conversation transcript（公开分享页可取得的完整当前分支；不是附件二进制）。
> Conversation title: Part VII-H
> Public source: https://chatgpt.com/share/6ad02e16-5f24-83ec-9e49-11cf8b5e6451
> Retrieval date: 2026-10-15
> Retrieval: 优先尝试 Codex read_thread（工具上限 10 turns / 每条 20000 字符）；关联 durable host 不可用，未得到会话正文。web open 返回 Cache miss；随后直接读取用户指定的公开分享页 HTML，仅解析其公开 conversation mapping，没有读取认证、浏览器私有接口或内部网络请求。
> Completeness: mapping 196 节点；current_node 沿 parent 回溯得到 196 节点，节点集合与 mapping 完全相同；linear_conversation 也是 196 节点。共 10 个 user turn。两份 source 合计保留 137 条非空公开消息：10 user、34 assistant text（12 commentary、22 final）、44 assistant code 工具请求、49 tool text。没有分页预览替代完整记录，也没有截断长回复。
> Normalization: 仅规范化每行尾部空白；保留原始正文、分段和完整回复的重复、GenUI / WritingBlock / MemoryCite 标记及候选代码。工具请求是历史材料，不在本次 Closure 重新执行。
> Exclusions: 不归档 system / private reasoning / 登录状态 / HTML 认证数据。公开工具的 redacted 占位按原文保留，不能恢复或冒充真实工具输出。
> Attachments: README(8).md、README(9).md、day08-part-vii-g-session-store-conversation-recovery.md、source-review(20261014-031653).zip、source-review(20261015-012420).zip。仅取得名称及公开正文，未重新取得附件二进制；本地当前仓库不等同于历史 ZIP 内容。
> Evidence boundary: 原文中的 API、候选错误名、学习草图、历史 sandbox 文件链接和执行命令属于当时讨论；最终实现以当前仓库为准。ChatGPT Review 是静态审查，不是独立运行测试。原文中的“npm run typecheck”和三个未限定的 demo 占位，在正式笔记按真实脚本与日志明确纠正。

> Scope: 全局第 9～10 轮。

## Turn 9

### User

> Message ID: `b92e9bfe-f397-407d-b051-dd4415a756cd`; content: `text`; channel: `None`; recipient: `all`

# 实现总结:

## 12.1 Implementation Summary

**Part VII-H Implementation + Runtime Verification 已完成。** 全部指定文件已阅读，真实代码与十项前提一致，未发现需要修改冻结设计的冲突。

已实现可选同步/异步 `beforeToolCall`、allow/deny、审批错误安全归一化、可中断审批等待、引用隔离和最小 CLI Demo。新增 **53 项确定性测试**；完整测试集 **229 通过、0 失败**。

未实现审批持久化、审批服务、动态 Hook、额外事件或状态机；未创建 Git Commit。

## 12.2 Architecture Compliance

以下十项均满足，无设计偏差。测试编号对应后文新增测试。

| 决策     | 具体代码位置与实现                                                                                                                                                                                                                    | 测试证据                           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| H-DD01 | [Executor:99 (line 99)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:99)：Lookup → Validation → Hook → execute                                                                                         | H-T02、07、08、09                 |
| H-DD02 | [Runtime:30 (line 30)](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts:30)、[Executor:45 (line 45)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:45)：构造注入并保存 Hook；RunOptions 未改变 | H-T02、10、15                    |
| H-DD03 | [公共契约 (line 3)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/before-tool-call.ts:3)、[决策检查 (line 31)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:31)：最终仅 allow/deny，非法值拒绝执行                    | H-T01～06                       |
| H-DD04 | [Executor:116 (line 116)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:116)：执行参数与 Hook ToolCall 分别复制，仅校验一次                                                                                            | H-T11～13                       |
| H-DD05 | [Executor:131 (line 131)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:131)：deny 返回 DENIED，Tool 调用为零                                                                                                  | H-T03、30                       |
| H-DD06 | [Executor:65 (line 65)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:65)：仅归一化 Hook 边界错误，返回固定消息                                                                                                        | H-T04～06、09、14                 |
| H-DD07 | [Executor:49 (line 49)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:49)：独立监听原始 Signal，结束时移除 listener                                                                                                 | H-T16、17及监听器清理测试               |
| H-DD08 | [Executor:59 (line 59)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:59)、[执行前检查 (line 144)](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts:144)：复用取消异常，保留先接受的结算归因                | H-T18～25                       |
| H-DD09 | [Runtime:197 (line 197)](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts:197)：沿用六种事件及既有发布路径                                                                                                            | H-T26、27                       |
| H-DD10 | [Runtime 配对 (line 208)](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts:208)与既有 Session 流程复用；消息、State、Snapshot、CAS、双 Settlement 未改                                                                     | H-T28～33及 Memory/SQLite 取消恢复测试 |

## 12.3 Files Changed

共 **5 个修改文件、5 个新增文件**。

| 文件                                                                                                           | 变更与职责                             |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| [agent-runtime.ts](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts)                    | 修改：构造选项接收 Hook，转发给 Executor       |
| [tool-executor.ts](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts)                      | 修改：授权决策、可中断等待、取消检查和错误边界           |
| [tool.ts](/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool.ts)                                        | 修改：增加两个错误码                        |
| [before-tool-call.ts](/Users/shengq/Desktop/mini-agent-runtime/src/tools/before-tool-call.ts)                | 新增：公共 Hook 类型                     |
| [approval-demo.ts](/Users/shengq/Desktop/mini-agent-runtime/src/demo/approval-demo.ts)                       | 新增：Application 异步人工审批与确定性验证       |
| [before-tool-call.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/before-tool-call.test.ts)           | 新增：基础、隔离、安全与内部异常测试                |
| [approval-run-control.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/approval-run-control.test.ts)   | 新增：Abort、竞态、事件、监听器与 Active Run 测试 |
| [approval-session-loop.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/approval-session-loop.test.ts) | 新增：Loop、保存恢复、CAS 测试               |
| [package.json](/Users/shengq/Desktop/mini-agent-runtime/package.json)                                        | 修改：增加 `demo:approval`             |
| [README.md (line 136)](/Users/shengq/Desktop/mini-agent-runtime/README.md:136)                               | 修改：使用方式、行为契约、限制及等待 Review 状态      |

既有测试及其预期未修改，未增加第三方依赖。

## 12.4 Key Implementation Details

- **注入与调用顺序**：Hook 在构造时固定。Executor 找到 Tool、完成 Ajv 校验后才调用；不存在或非法参数调用保持原错误。
- **参数隔离**：先复制并校验执行参数，再复制 Hook 的 ToolCall。修改 Hook 的嵌套参数、ID、名称不会改变历史或执行输入。
- **allow/deny**：allow 在最终取消检查后执行；deny 返回固定 `TOOL_EXECUTION_DENIED`，模型可以继续。
- **错误归一化**：同步 throw、reject、非法决策及抛错 getter 返回固定 `TOOL_PRE_EXECUTION_FAILED`。Lookup、Compile、Validation、复制与序列化内部异常仍传播。
- **等待与竞态**：Executor 注册 Abort listener，用局部结算标记接受第一个结果，随后清理监听。迟到 Promise rejection 有处理器，不产生额外结果。
- **取消归因**：已接受的 deny/普通错误不会因后续 Abort 被改写；Abort 先结束等待时抛出带原始 Signal 的既有取消异常。allow 后仍立即检查取消。
- **配对与兼容**：Runtime 沿用 `#appendCancelledToolCalls()`，保留此前结果，仅补齐当前和剩余调用。审批取消无虚假 completed；Session 只保存既有消息格式，恢复不重放工具或审批。

## 12.5 Runtime Verification

环境：**Node.js v22.18.0**。最终完整验收命令均退出 **0**。

| 实际执行命令                              | 结果                           |
| ----------------------------------- | ---------------------------- |
| `npm test`                          | **229 通过，0 失败，0 取消，0 跳过**    |
| `npm run build`                     | 最终通过                         |
| `npm run typecheck:tests`           | 通过                           |
| `npm run demo:tools`                | completed；实际结果为 5            |
| `npm run demo:recovery`             | 保存、关闭重开、恢复、revision 1 → 2 通过 |
| `npm run demo:approval -- --allow`  | Hook 1、Tool 1、模型 2 回合、唯一结果配对 |
| `npm run demo:approval -- --deny`   | Hook 1、Tool 0、模型 2 回合、唯一结果配对 |
| `npm run demo:approval`，PTY 人工输入并批准 | 通过                           |
| `git diff --check`                  | 通过                           |

另实际执行了定向测试：

| 命令                                                                                                                  | 结果                   |
| ------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `npx tsx --test test/before-tool-call.test.ts`                                                                      | 30 通过，0 失败           |
| `npx tsx --test test/approval-run-control.test.ts`                                                                  | 11 通过，0 失败           |
| `npx tsx --test test/approval-session-loop.test.ts`                                                                 | 补充取消恢复测试前：10 通过，0 失败 |
| `npx tsx --test test/before-tool-call.test.ts test/approval-run-control.test.ts test/approval-session-loop.test.ts` | 最终 53 通过，0 失败        |

开发中曾出现一次新 Demo 的 build 类型错误，已修复，见下一节。

## 12.6 Tests Added

| 测试文件                            | 数量  | H-T 覆盖与行为                                                                         |
| ------------------------------- | --- | --------------------------------------------------------------------------------- |
| `before-tool-call.test.ts`      | 30  | H-T01～10：无 Hook、同步/异步 allow/deny、throw/reject、非法值、未知 Tool、非法参数、内部异常传播、独立 Executor |
| 同上                              | 已计入 | H-T11～15：嵌套参数及 ID/name 隔离、修改后 deny、敏感错误不进入结果/请求、多 Run                             |
| `approval-run-control.test.ts`  | 11  | H-T16～25：永久 pending 取消、原始 Signal、同步 Abort、迟到结果、双向错误竞态、多调用配对、并发拒绝、ownership 释放     |
| 同上                              | 已计入 | H-T26～27：事件顺序、取消无 completed；另验证 listener 清理、allow 后取消、无 Signal 等待                 |
| `approval-session-loop.test.ts` | 12  | H-T28～33：预算跳过、混合决策完整配对、正常最终回答、Memory/SQLite 保存恢复、不重放、CAS 保留 Run settlement        |
| 同上                              | 已计入 | 另验证审批取消后的 Memory/SQLite 保存恢复                                                      |

**H-T01～H-T33 均有覆盖，无未覆盖的必需场景。** 竞态使用 deferred Promise、明确微任务顺序和事件循环检查点，无随机延时。

## 12.7 Bugs / Debugging

新 Demo 初次构建出现决策变量类型缩窄及 `readline.question()` options 类型错误。

根因是回调中赋值不能形成所需类型缩窄，以及可选 Signal 与严格类型配置不兼容。修复为局部明确类型的 `resolvedDecision`，无 Signal 时传 `{}`。修复后 build、typecheck、自动 allow/deny 和人工批准路径均通过。

未发现旧功能回归。

## 12.8 Architecture Deviations

**无冻结设计偏差。**

内部使用 `failed` 区分审批错误结算，未向公共 Hook 增加第三种决策。非法决策 getter 抛错按 H-DD06 安全归一化，未扩大到其他 Executor 异常。

## 12.9 Remaining Risks

- 在途 Approval、Promise、Signal、Handler 不持久化，不能跨进程恢复。
- Abort 结束本地等待，不保证外部审批请求被物理撤销。
- Abort 不能回滚已发生的 Tool 副作用。
- Application Hook 不能替代外部 API 权限控制。
- 无 Signal 且 Hook 永久 pending 时会持续等待；未增加默认超时。

## 12.10 Final Status

- Implementation：**完成**
- 全部测试：**通过，229/229**
- Build / Typecheck：**通过**
- 原有 Demo / Approval Demo：**通过**
- 当前发现的 Must Fix 或未解决实现问题：**无**
- 可以进入 **ChatGPT Code Review + Theory Feedback**

本轮到此停止；**未宣布 Part VII-H Milestone Closure，未进入 VII-I，未生成 Engineering Learning Log，未创建提交。**



# 测试日志

➜  mini-agent-runtime git:(main) ✗ npm run test\
\
\> mini-agent-runtime@0.1.0 test\
\> tsx --test test/\*\*/\*.test.ts\
\
✔ normal run emits the minimal lifecycle and its returned outcome (3.6935ms)\
✔ tool loop events follow execution and completed events observe committed facts (41.529125ms)\
✔ multiple tools emit sequential started/completed pairs in execution order (29.763292ms)\
✔ tool error contract still completes the tool execution lifecycle (0.561625ms)\
✔ maxTurns writes skipped results without tool execution events (0.422709ms)\
✔ each subscriber receives payloads isolated from runtime facts and other subscribers (115.346625ms)\
✔ run_finished outcome payload is detached from the returned outcome (0.906042ms)\
✔ subscriber failures do not affect the run or other subscribers (0.247333ms)\
✔ unsubscribe is idempotent and stops later notifications (2.1875ms)\
✔ provider errors propagate unchanged without run_finished (2.122125ms)\
✔ completes a normal answer and records runtime facts (5.896875ms)\
✔ retains conversation across two runs on the same runtime (0.960291ms)\
✔ records missing tool failure and continues within the same run (1.222417ms)\
✔ preserves output for length without retry or continuation (0.565166ms)\
✔ preserves output for unknown without retry or continuation (0.817125ms)\
✔ propagates the original provider throw without retry (0.971208ms)\
✔ propagates the original provider reject without retry (0.587ms)\
✔ history copies protect the array, messages, tool calls and nested arguments (0.790667ms)\
✔ provider response and request references cannot mutate runtime facts (2.031375ms)\
✔ dual settlement runFails=false, saveFails=false (12.23925ms)\
✔ dual settlement runFails=false, saveFails=true (1.460833ms)\
✔ dual settlement runFails=true, saveFails=false (3.08125ms)\
✔ dual settlement runFails=true, saveFails=true (0.705334ms)\
✔ incomplete history after run rejection is neither saved nor reused (89.885042ms)\
✔ abort with complete cancelled results can be saved (1.448792ms)\
✔ pre-aborted run skips save (existing=false) (0.636333ms)\
✔ pre-aborted run skips save (existing=true) (0.918417ms)\
✔ CAS conflict never reruns provider or tool and retains runtime facts (20.034166ms)\
✔ application awaits save settlement before starting the next run (6.960042ms)\
✔ settled length output is saveable when paired (0.692666ms)\
✔ settled unknown output is saveable when paired (0.653334ms)\
✔ settled tool_calls output is saveable when paired (0.529333ms)\
✔ completed outcome is preserved even when its unpaired history cannot be saved (0.498875ms)\
✔ H-T16/17/24/25/27: pending approval abort releases ownership, preserves signal, and pairs without completed events (38.325417ms)\
✔ H-T18: synchronous hook abort followed by allow cannot start Tool.execute (66.942208ms)\
✔ accepted allow followed by abort before tool invocation still cancels the attempt (7.948791ms)\
✔ H-T19: late allow after approval cancellation cannot execute or append another result (8.65225ms)\
✔ H-T20/22: late hook rejection after abort is handled and cannot rewrite cancelled pairing (10.877583ms)\
✔ H-T21: accepted hook error retains ordinary failure when caller aborts before runtime receives it (32.7915ms)\
✔ accepted deny remains a completed failure when caller aborts before runtime receives it (20.604166ms)\
✔ H-T23: a successful A remains committed while approval abort cancels B and the unstarted C (5.607334ms)\
✔ H-T26: deny and hook error retain the existing started/completed ordering and continue the loop (7.79975ms)\
✔ approval abort listeners are removed after allow, deny, rejection, and cancellation (39.504083ms)\
✔ without a caller signal, approval remains pending until the application settles it (9.3925ms)\
✔ H-T28: maxTurns pairs skipped calls without invoking authorization (5.229584ms)\
✔ H-T29/H-T30: allow, deny and hook error pair before the next model answer (31.039417ms)\
✔ memory saves approval-aborted pairing and recovers without the pending hook (29.563916ms)\
✔ H-T31/H-T32: memory saves and recovers deny without replaying approval (32.275ms)\
✔ H-T33: memory CAS conflict retains deny run settlement and disables reuse (27.048625ms)\
✔ H-T31/H-T32: memory saves and recovers error without replaying approval (28.897959ms)\
✔ H-T33: memory CAS conflict retains error run settlement and disables reuse (11.503209ms)\
✔ sqlite saves approval-aborted pairing and recovers without the pending hook (8.446ms)\
✔ H-T31/H-T32: sqlite saves and recovers deny without replaying approval (25.027333ms)\
✔ H-T33: sqlite CAS conflict retains deny run settlement and disables reuse (9.958125ms)\
✔ H-T31/H-T32: sqlite saves and recovers error without replaying approval (5.943292ms)\
✔ H-T33: sqlite CAS conflict retains error run settlement and disables reuse (19.443167ms)\
✔ H-T01: an omitted hook preserves Model → Tool → Model execution (26.280458ms)\
✔ H-T02: sync allow runs the hook once before the tool (9.876709ms)\
✔ H-T02: async allow runs the hook once before the tool (17.668375ms)\
✔ H-T03: sync deny never executes and lets the model continue (8.887167ms)\
✔ H-T03: async deny never executes and lets the model continue (6.197ms)\
✔ H-T04: hook throw becomes a fixed authorization failure (7.004958ms)\
✔ H-T05: hook reject becomes a fixed authorization failure (6.568ms)\
✔ H-T06: malformed undefined decision fails closed (8.707875ms)\
✔ H-T06: malformed null decision fails closed (72.968083ms)\
✔ H-T06: malformed boolean decision fails closed (16.481041ms)\
✔ H-T06: malformed string decision fails closed (6.921ms)\
✔ H-T06: malformed empty object decision fails closed (4.205792ms)\
✔ H-T06: malformed third decision decision fails closed (6.734875ms)\
✔ H-T06: malformed wrong type decision fails closed (4.827667ms)\
✔ H-T06: malformed throwing type getter decision fails closed (8.891375ms)\
✔ H-T06: an asynchronously returned illegal decision also fails closed (6.530042ms)\
✔ H-T07: an unknown tool keeps TOOL_NOT_FOUND and bypasses the hook (0.27425ms)\
✔ H-T08: invalid arguments keep INVALID_ARGUMENTS and bypass the hook and tool (7.774958ms)\
✔ H-T09: registry lookup bugs still propagate unchanged with a hook configured (0.911416ms)\
✔ H-T09: schema compilation and unsupported async schemas retain their propagation contract (10.549417ms)\
✔ H-T09: a validator internal exception propagates unchanged outside hook normalization (0.269541ms)\
✔ H-T09: non-cloneable arguments remain an executor internal failure (2.512583ms)\
✔ H-T09: circular result serialization still propagates from runtime after authorization (2.977ms)\
✔ H-T10: a standalone executor enforces both allow and deny (9.988709ms)\
✔ H-T11: nested hook arguments are detached from actual execution and recorded history (3.206625ms)\
✔ H-T12: hook changes to id, name and arguments cannot redirect execution or result pairing (3.746375ms)\
✔ H-T13: hook mutation followed by denial preserves the committed ToolCall (3.179208ms)\
✔ H-T14: sensitive hook throw data is absent from ToolResult and ModelRequest (3.615417ms)\
✔ H-T14: sensitive hook reject data is absent from ToolResult and ModelRequest (4.046625ms)\
✔ H-T15: one constructor-injected hook independently authorizes multiple runs (2.531875ms)\
✔ projects all message kinds in order, preserving optional fields and call/result pairing (1.487417ms)\
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.230041ms)\
✔ later input mutations and builds leave an earlier snapshot unchanged (0.350166ms)\
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.261875ms)\
✔ conversation accepts empty without mutation (0.865125ms)\
✔ conversation accepts normal user/model without mutation (0.172458ms)\
✔ conversation accepts provider failure user only without mutation (0.107584ms)\
✔ conversation accepts consecutive users and empty model output without mutation (0.170125ms)\
✔ conversation accepts paired opaque non-JSON result without mutation (0.066541ms)\
✔ conversation accepts multiple sequential calls without mutation (0.186708ms)\
✔ conversation accepts separate complete batches without mutation (0.366ms)\
✔ conversation accepts TOOL_CALL_CANCELLED without mutation (0.128417ms)\
✔ conversation accepts TOOL_EXECUTION_SKIPPED without mutation (0.350583ms)\
✔ conversation accepts TOOL_EXECUTION_FAILED without mutation (0.605625ms)\
✔ conversation rejects missing result as protocol error (0.480208ms)\
✔ conversation rejects duplicate result as protocol error (0.150416ms)\
✔ conversation rejects orphan result as protocol error (0.093667ms)\
✔ conversation rejects duplicate ID in batch as protocol error (0.110792ms)\
✔ conversation rejects duplicate ID across batches as protocol error (1.216667ms)\
✔ conversation rejects interrupted batch as protocol error (0.068625ms)\
✔ conversation rejects cross batch pairing as protocol error (0.103458ms)\
✔ conversation rejects wrong batch result as protocol error (0.0685ms)\
✔ conversation rejects null history as structure error (0.158875ms)\
✔ conversation rejects object history as structure error (0.034875ms)\
✔ conversation rejects null message as structure error (0.030042ms)\
✔ conversation rejects unknown type as structure error (0.095625ms)\
✔ conversation rejects user missing content as structure error (0.040542ms)\
✔ conversation rejects user wrong content as structure error (0.03125ms)\
✔ conversation rejects model wrong content as structure error (0.027417ms)\
✔ conversation rejects model wrong calls as structure error (0.027334ms)\
✔ conversation rejects result wrong id as structure error (0.027791ms)\
✔ conversation rejects result missing content as structure error (0.030041ms)\
✔ conversation rejects bad call 0 as structure error (0.132375ms)\
✔ conversation rejects bad call 1 as structure error (0.037291ms)\
✔ conversation rejects bad call 2 as structure error (0.031125ms)\
✔ conversation rejects bad call 3 as structure error (0.031917ms)\
✔ conversation rejects non-JSON arguments 0 as structure error (0.134375ms)\
✔ conversation rejects non-JSON arguments 1 as structure error (0.166417ms)\
✔ conversation rejects non-JSON arguments 2 as structure error (0.050875ms)\
✔ conversation rejects non-JSON arguments 3 as structure error (0.045791ms)\
✔ conversation rejects non-JSON arguments 4 as structure error (0.034958ms)\
✔ conversation rejects non-JSON arguments 5 as structure error (0.033375ms)\
✔ conversation rejects non-JSON arguments 6 as structure error (0.032417ms)\
✔ conversation rejects non-JSON arguments 7 as structure error (0.03525ms)\
✔ conversation rejects non-JSON arguments 8 as structure error (0.03775ms)\
✔ conversation rejects non-JSON arguments 9 as structure error (0.037292ms)\
✔ conversation rejects non-JSON arguments 10 as structure error (0.036666ms)\
✔ conversation rejects non-JSON arguments 11 as structure error (0.041084ms)\
✔ conversation rejects symbol properties, accessors and custom array prototypes (0.162792ms)\
✔ maps provider-neutral model messages to OpenAI chat messages (1.257416ms)\
✔ maps provider-neutral tool definitions to OpenAI function tools (0.340958ms)\
✔ maps OpenAI assistant text to a Runtime assistant message (0.125875ms)\
✔ maps an OpenAI function tool call and parses its arguments (0.235291ms)\
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.320625ms)\
✔ maps known finish reasons and normalizes provider-specific reasons (0.113917ms)\
✔ maps OpenAI usage to the Runtime usage model (0.194916ms)\
✔ maps a complete OpenAI response without leaking its raw shape (0.130416ms)\
✔ a concurrent run fails before state, events, or provider work and leaves the first run intact (11.186667ms)\
✔ a subscriber reentrant run is rejected by the same active-run guard (1.28225ms)\
✔ pre-aborted runs have no state, provider, or event lifecycle (0.643834ms)\
✔ provider receives the same signal and an aborted returned response is not committed (0.588917ms)\
✔ provider rejection while the current signal is aborted settles the run as aborted (0.339792ms)\
✔ an unrelated provider rejection racing with abort preserves identity and releases ownership (0.387584ms)\
✔ an unrelated provider error preserves identity and releases ownership (0.336459ms)\
✔ abort before tool start pairs every call without tool execution events (0.4335ms)\
✔ ToolExecutor passes the same signal and separates cooperative cancellation from normal failure (89.137292ms)\
✔ an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED (24.557ms)\
✔ abort during a tool writes cancellation pairing without a completed event (8.108041ms)\
✔ a successful tool result commits before late abort stops the next model turn (10.893333ms)\
✔ multiple tools preserve A, cancel B and C, and never execute C (11.873833ms)\
✔ normal, unsupported, limit and aborted outcomes all release active ownership (2.029792ms)\
✔ cancellation takes priority over maxTurns pairing (0.302333ms)\
✔ constructor recovery is detached and does not call provider, tools or events (2.785291ms)\
✔ next model request includes recovered history and only new tool calls execute (45.930667ms)\
✔ historical tools need not be registered and are never replayed (0.671458ms)\
✔ invalid initialMessages fail during construction before provider work (0.415791ms)\
✔ recovered runtime preserves pre-abort and cooperative provider abort provenance (0.550709ms)\
✔ recovered runtime preserves tool cancellation pairing (0.270917ms)\
✔ recovered runtime still owns exactly one active run (0.408625ms)\
✔ memory: missing session returns null (1.450292ms)\
✔ memory: revision zero creates revision one (2.65375ms)\
✔ memory: duplicate create conflicts without changing history (1.661459ms)\
✔ memory: current revision updates and stale revision conflicts (0.217416ms)\
✔ memory: updating a missing session does not create it (0.179584ms)\
✔ memory: invalid session ids and revisions rejected (0.399792ms)\
✔ memory: invalid structure and pairing cannot overwrite valid snapshot (0.279292ms)\
✔ memory: load and save deeply isolate both directions (0.118084ms)\
✔ memory: safe revision extremes cannot bypass CAS or overflow (0.242875ms)\
✔ memory: simultaneous writers have exactly one winner (0.277417ms)\
✔ sqlite: missing session returns null (14.447042ms)\
✔ sqlite: revision zero creates revision one (1.480833ms)\
✔ sqlite: duplicate create conflicts without changing history (1.638708ms)\
✔ sqlite: current revision updates and stale revision conflicts (1.726542ms)\
✔ sqlite: updating a missing session does not create it (1.017416ms)\
✔ sqlite: invalid session ids and revisions rejected (0.915584ms)\
✔ sqlite: invalid structure and pairing cannot overwrite valid snapshot (1.42775ms)\
✔ sqlite: load and save deeply isolate both directions (0.9355ms)\
✔ sqlite: safe revision extremes cannot bypass CAS or overflow (1.602167ms)\
✔ sqlite: simultaneous writers have exactly one winner (1.679334ms)\
✔ SQLite close/reopen recovers into a new runtime and increments revision (8.331916ms)\
✔ independent SQLite connections cannot overwrite the same old revision (2.165333ms)\
✔ SQLite revisions reach the maximum safely and cannot overflow (1.346584ms)\
✔ SQLite load rejects malformed JSON instead of returning null or conflict (1.337166ms)\
✔ SQLite load rejects bad structure instead of returning null or conflict (2.034625ms)\
✔ SQLite load rejects incomplete batch instead of returning null or conflict (3.784417ms)\
✔ SQLite load rejects wrong JSON root instead of returning null or conflict (1.532792ms)\
✔ SQLite load rejects damaged revision 0 (1.396667ms)\
✔ SQLite load rejects damaged revision -1 (1.426416ms)\
✔ SQLite load rejects damaged revision 9007199254740992 (1.737292ms)\
✔ SQLite load rejects damaged revision 9223372036854775807 (1.276833ms)\
✔ SQLite load rejects damaged revision 1.5 (1.009042ms)\
✔ SQLite load rejects damaged revision bad (1.190042ms)\
✔ SQLite operational and constraint errors retain their own error identity (1.555375ms)\
✔ SQLite cannot-open IO error and corrupt file error are not conflicts (0.808625ms)\
✔ happy path uses registry definitions and result in the second turn of one run (17.193125ms)\
✔ each turn gets independent complete context from the latest facts and definitions (6.797375ms)\
✔ invalid arguments null never invoke execute and allow continuation (5.961959ms)\
✔ invalid arguments [] never invoke execute and allow continuation (3.968125ms)\
✔ invalid arguments "bad" never invoke execute and allow continuation (3.475458ms)\
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.658917ms)\
✔ invalid arguments {"a":2} never invoke execute and allow continuation (4.272ms)\
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.222625ms)\
✔ tool throw becomes an execution failure visible to the next model turn (4.164875ms)\
✔ tool reject becomes an execution failure visible to the next model turn (3.947334ms)\
✔ tool non-error becomes an execution failure visible to the next model turn (3.491875ms)\
✔ multiple calls finish sequentially before the next turn (mixed=false) (7.036708ms)\
✔ multiple calls finish sequentially before the next turn (mixed=true) (8.551416ms)\
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.646334ms)\
✔ maxTurns=3 counts model turns, skips final tools and resets per run (4.338541ms)\
✔ maxTurns=default counts model turns, skips final tools and resets per run (3.625791ms)\
✔ a run after limit_reached receives paired skipped results before the new user input (0.306667ms)\
✔ stop on the last allowed turn still completes (0.152125ms)\
✔ invalid maxTurns fails at construction (0.218625ms)\
✔ provider failure after tool execution propagates the same error and preserves facts (3.519416ms)\
✔ tool argument and result references cannot mutate history (2.767584ms)\
✔ registry rejects duplicates, preserves order and isolates schema references (3.643083ms)\
✔ provider cannot change the schema used for tool validation (2.837125ms)\
✔ invalid schema and async schema are configuration bugs, not invocation failures (5.528625ms)\
✔ lookup bugs propagate unchanged (0.28325ms)\
✔ result serialization bugs propagate outside the execute catch boundary (2.378541ms)\
✔ tool_calls without calls is an invariant violation (0.149708ms)\
✔ malformed tool_calls (missing) still throws on the final turn (0.12425ms)\
✔ malformed tool_calls (empty) still throws on the final turn (0.114666ms)\
ℹ tests 229\
ℹ suites 0\
ℹ pass 229\
ℹ fail 0\
ℹ cancelled 0\
ℹ skipped 0\
ℹ todo 0\
ℹ duration_ms 783.615709\
➜  mini-agent-runtime git:(main) ✗ npm run demo\
\
\> mini-agent-runtime@0.1.0 demo\
\> tsx src/demo/openai-demo.ts\
\
{\
&#x20; "message": {\
&#x20;   "role": "assistant",\
&#x20;   "content": "Hello!"\
&#x20; },\
&#x20; "finishReason": "stop",\
&#x20; "usage": {\
&#x20;   "inputTokens": 12,\
&#x20;   "outputTokens": 155,\
&#x20;   "totalTokens": 167\
&#x20; }\
}\
➜  mini-agent-runtime git:(main) ✗ npm run demo:runtime\
\
\> mini-agent-runtime@0.1.0 demo:runtime\
\> tsx src/demo/runtime-demo.ts\
\
\
User: 我叫小明，请简短回复。\
RunOutcome: {\
&#x20; "type": "completed"\
}\
Runtime history: [\
&#x20; {\
&#x20;   "type": "user_input",\
&#x20;   "content": "我叫小明，请简短回复。"\
&#x20; },\
&#x20; {\
&#x20;   "type": "model_output",\
&#x20;   "content": "你好，小明！"\
&#x20; }\
]\
\
User: 我叫什么名字？请简短回复。\
RunOutcome: {\
&#x20; "type": "completed"\
}\
Runtime history: [\
&#x20; {\
&#x20;   "type": "user_input",\
&#x20;   "content": "我叫小明，请简短回复。"\
&#x20; },\
&#x20; {\
&#x20;   "type": "model_output",\
&#x20;   "content": "你好，小明！"\
&#x20; },\
&#x20; {\
&#x20;   "type": "user_input",\
&#x20;   "content": "我叫什么名字？请简短回复。"\
&#x20; },\
&#x20; {\
&#x20;   "type": "model_output",\
&#x20;   "content": "小明。"\
&#x20; }\
]\
➜  mini-agent-runtime git:(main) ✗ npm run demo:tools\
\
\> mini-agent-runtime@0.1.0 demo:tools\
\> tsx src/demo/tool-runtime-demo.ts\
\
Provider: deterministic demo (no external LLM)\
User: 2 + 3?\
Model turn 1: add {"a":2,"b":3}\
Tool execute: add(2, 3) = 5\
Model turn 2 received tool_result: {"success":true,"result":5}\
Final answer: 2 + 3 = 5\
RunOutcome: {"type":"completed"}\
Model turns: 2\
History: user_input -> model_output -> tool_result -> model_output\
➜  mini-agent-runtime git:(main) ✗ npm run demo:approval\
\
\> mini-agent-runtime@0.1.0 demo:approval\
\> tsx src/demo/approval-demo.ts\
\
公告标题（直接回车使用演示标题）：\
Provider: deterministic demo (no external LLM, API or credentials)\
User: 发布一条演示公告\
Model turn 1: request publish_note\
Application approval: publish_note {"title":"发布一条演示公告"}\
批准模拟发布？输入 y 批准，其他输入拒绝：y\
Application decision: allow\
Tool execute: simulated publication of 发布一条演示公告\
Model turn 2 received tool_result: {"success":true,"result":{"published":true,"title":"发布一条演示公告"}}\
Final answer: 已模拟发布公告：发布一条演示公告\
RunOutcome: {"type":"completed"}\
Verification passed: hook=1, tool=1, modelTurns=2, pairedResults=1\
➜  mini-agent-runtime git:(main) ✗ npm run demo:approval\
\
\> mini-agent-runtime@0.1.0 demo:approval\
\> tsx src/demo/approval-demo.ts\
\
公告标题（直接回车使用演示标题）：test-title\
Provider: deterministic demo (no external LLM, API or credentials)\
User: test-title\
Model turn 1: request publish_note\
Application approval: publish_note {"title":"test-title"}\
批准模拟发布？输入 y 批准，其他输入拒绝：n\
Application decision: deny\
Model turn 2 received tool_result: {"success":false,"error":{"code":"TOOL_EXECUTION_DENIED","message":"Tool execution was denied."}}\
Final answer: 公告未发布：Tool execution was denied.\
RunOutcome: {"type":"completed"}\
Verification passed: hook=1, tool=0, modelTurns=2, pairedResults=1\
➜  mini-agent-runtime git:(main) ✗ npm run demo:recovery\
\
\> mini-agent-runtime@0.1.0 demo:recovery\
\> tsx src/demo/conversation-recovery-demo.ts\
\
Run #1: {\
&#x20; run: { status: 'fulfilled', value: { type: 'completed' } },\
&#x20; persistence: {\
&#x20;   status: 'fulfilled',\
&#x20;   value: {\
&#x20;     sessionId: 'dbfed3ac-6e2e-4fad-94c4-718951bf86b3',\
&#x20;     revision: 1,\
&#x20;     messages: [Array]\
&#x20;   }\
&#x20; },\
&#x20; reusable: true\
}\
Recovered model request: {\
&#x20; messages: [\
&#x20;   { role: 'user', content: '我叫小明' },\
&#x20;   { role: 'assistant', content: '你好，小明。' },\
&#x20;   { role: 'user', content: '我叫什么名字？' }\
&#x20; ]\
}\
Run #2: {\
&#x20; run: { status: 'fulfilled', value: { type: 'completed' } },\
&#x20; persistence: {\
&#x20;   status: 'fulfilled',\
&#x20;   value: {\
&#x20;     sessionId: 'dbfed3ac-6e2e-4fad-94c4-718951bf86b3',\
&#x20;     revision: 2,\
&#x20;     messages: [Array]\
&#x20;   }\
&#x20; },\
&#x20; reusable: true\
}\
➜  mini-agent-runtime git:(main) ✗&#x20;





# 最新源码 ZIP:如上传的 zip

### ChatGPT — commentary

> Message ID: `74d6f575-476c-4aae-82a2-564c170cb3d3`; content: `text`; channel: `commentary`; recipient: `all`

收到最新源码 ZIP 和完整测试日志。我会按 VII-H 的正式 Code Review 来做：先检查真实实现与 H-DD01～10 的一致性，再针对审批等待、Abort 竞态、参数隔离和消息配对寻找测试可能遗漏的问题，最后给出 **Must Fix / Should Fix / 可接受限制** 的结论。

229 项通过是很好的验证证据，但我会以实际源码为准，不直接把测试全绿等同于架构验收。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `5ae95680-5c80-40bc-943b-b8c4a74c1aec`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lh '/mnt/data/source-review(20261015-012420).zip'; python - <<'PY'
import zipfile
p='/mnt/data/source-review(20261015-012420).zip'
with zipfile.ZipFile(p) as f:
 for a in f.infolist(): print(a.filename,a.file_size)
PY

### Public tool output

> Message ID: `d3968e22-c5f3-4ed0-b78a-6d627ec80f0e`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `a82d6a0e-9a75-4151-a072-7b5b98b313a0`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/review_vii_h && python - <<'PY'
import zipfile,pathlib
p='/mnt/data/source-review(20261015-012420).zip'; root=pathlib.Path('/mnt/data/review_vii_h').resolve()
with zipfile.ZipFile(p) as z:
 for x in z.infolist():
  dest=(root/x.filename).resolve()
  if root not in dest.parents and dest!=root: raise RuntimeError('bad filename')
  if x.is_dir(): dest.mkdir(parents=True,exist_ok=True)
  else:
   dest.parent.mkdir(parents=True,exist_ok=True)
   dest.write_bytes(z.read(x))
PY
nl -ba src/tools/tool-executor.ts
printf '\n--- Hook ---\n'; nl -ba src/tools/before-tool-call.ts
printf '\n--- Tool ---\n'; nl -ba src/tools/tool.ts

### Public tool output

> Message ID: `04677005-fecc-4dc7-987d-487e30c7c2bd`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `7fa0e681-50c0-48e6-b95d-109bc344994a`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/review_vii_h && python - <<'PY'
import zipfile,pathlib
p='/mnt/data/source-review(20261015-012420).zip'; root=pathlib.Path('/mnt/data/review_vii_h').resolve()
with zipfile.ZipFile(p) as z:
 for x in z.infolist():
  dest=(root/x.filename).resolve()
  if root not in dest.parents and dest!=root: raise RuntimeError('bad filename')
  if x.is_dir(): dest.mkdir(parents=True,exist_ok=True)
  else:
   dest.parent.mkdir(parents=True,exist_ok=True)
   dest.write_bytes(z.read(x))
PY
nl -ba /mnt/data/review_vii_h/src/tools/tool-executor.ts
printf '\n--- Hook ---\n'; nl -ba /mnt/data/review_vii_h/src/tools/before-tool-call.ts
printf '\n--- Tool ---\n'; nl -ba /mnt/data/review_vii_h/src/tools/tool.ts

### Public tool output

> Message ID: `c17aad79-51ae-4d5f-a28b-6d0e2e47ba0b`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `32f88565-4a12-4081-87e2-ea6978d4fa82`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc nl -ba /mnt/data/review_vii_h/src/runtime/agent-runtime.ts; printf '\n--- State/event ---\n'; cat /mnt/data/review_vii_h/src/runtime/agent-event.ts /mnt/data/review_vii_h/src/runtime/runtime-state.ts; printf '\n--- package ---\n'; cat /mnt/data/review_vii_h/package.json

### Public tool output

> Message ID: `eef2ff58-e15b-4888-bba2-20b492fd9153`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `c331e998-c8e4-4df4-9865-3410aea6d5af`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc nl -ba /mnt/data/review_vii_h/test/before-tool-call.test.ts | sed -n '1,420p'

### Public tool output

> Message ID: `f8e91d34-796b-43a5-a755-5deb66c8a4ba`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `ecde555f-c5ce-4930-bb76-9b313cfbe567`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc nl -ba /mnt/data/review_vii_h/test/approval-run-control.test.ts | sed -n '1,470p'

### Public tool output

> Message ID: `40fd96ba-ab65-4adc-9c46-a416b6d0bd89`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `efc3e0c9-520d-4b65-960c-6bf531bfc282`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -la /mnt/data/review_vii_h | head -25; ls -d /mnt/data/review_vii_h/node_modules 2>/dev/null || true; command -v node; node -v; command -v npm; find /mnt/data/review_vii_h -maxdepth 1 -type f -printf '%f\n'

### Public tool output

> Message ID: `45594c1a-9576-4734-98b8-95aece2ae766`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `38c5a429-ee20-4b57-b49a-564419dea20f`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc nl -ba /mnt/data/review_vii_h/src/demo/approval-demo.ts; nl -ba /mnt/data/review_vii_h/src/demo/conversation-workflow.ts; nl -ba /mnt/data/review_vii_h/test/approval-session-loop.test.ts | sed -n '1,330p'

### Public tool output

> Message ID: `2bb64c3b-7f72-4694-a53b-1b4bb08117c8`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — commentary

> Message ID: `8412c507-756a-497c-af14-10cb8d60313e`; content: `text`; channel: `commentary`; recipient: `all`

目前源码与报告的核心对应关系成立：Hook 确实位于 Ajv 校验之后、Tool 调用之前；拒绝和普通 Hook 异常会生成不同的失败结果；Abort 则沿用 VII-F 的取消配对路径。新增测试也覆盖了迟到批准、同步取消、多 Tool 混合结果及 Memory/SQLite 恢复。

我正在做最后一轮反例检查，尤其看“测试覆盖”之外是否还有未被保护的异常入口，以及交付 ZIP 是否足以独立复现全部验证。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `a77fb5cc-ab51-464d-86c9-3bccaf9284f4`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc cd /mnt/data/review_vii_h && npm ls --depth=0 --all 2>&1 | head -45; ls -la /home/oai/share 2>/dev/null | head -10; ls -la /mnt/data | head -15

### Public tool output

> Message ID: `dcbf2013-8c7e-4c2c-82c6-8ea54a3249d3`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `ccabf942-29f6-4a7b-bd4d-eb4ac0242ea2`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc python - <<'PY'
import zipfile,difflib
old='/mnt/data/source-review(20261014-031653).zip'
new='/mnt/data/source-review(20261015-012420).zip'
with zipfile.ZipFile(old) as a,zipfile.ZipFile(new) as b:
 ea,eb=set(a.namelist()),set(b.namelist())
 print('old missing in new:',sorted(ea-eb))
 print('new additions:',sorted(eb-ea))
 for p in sorted(ea & eb):
  if p.endswith('/') or a.read(p)==b.read(p):continue
  la=a.read(p).decode('utf-8').splitlines(); lb=b.read(p).decode('utf-8').splitlines()
  print('\n--- Modified',p,'old',len(la),'new',len(lb),'---')
  if p.startswith('src/') and p not in ['src/demo/approval-demo.ts']:
   lines=list(difflib.unified_diff(la,lb,fromfile='prev/'+p,tofile='new/'+p,lineterm=''))
   print('\n'.join(lines[:220]))
PY

### Public tool output

> Message ID: `864fa1f9-f306-44e6-b076-8f3cfc1791a8`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `0593abf4-ac20-48c1-b633-b7328f564e80`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc npm cache ls 'ajv' 2>/dev/null | head -5; npm cache ls 'tsx' 2>/dev/null | head -5; npm cache ls 'better-sqlite3' 2>/dev/null | head -5; python - <<'PY'
import zipfile
p='/mnt/data/source-review(20261015-012420).zip'
with zipfile.ZipFile(p) as z:
 print('README.md in ZIP?', 'README.md' in z.namelist())
 print('package-lock.json in ZIP?', 'package-lock.json' in z.namelist())
 print('Tests count declaration', len([x for x in z.namelist() if x.startswith('test/') and x.endswith('.test.ts')]))
PY

### Public tool output

> Message ID: `296824a2-7a98-443c-8d48-a07f95bc2b0d`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `a4136c52-77d6-4a1b-a065-7a75ded7da74`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Code Review + Theory Feedback

<badge color="success">Code Review：PASS</badge>

我已经对你上传的最新源码 `source-review(20261015-012420).zip` 做了静态审查，并与 VII-G 基线源码比较，同时核对了新增测试和你提供的运行日志。

**结论：本次 VII-H 实现符合 H-DD01～H-DD10 的设计，未发现 Must Fix，可以进入 Milestone Closure。**

但需要区分两个结论：

- **源码审查：PASS**。实际代码中的执行顺序、取消处理、参数隔离、结果配对均符合冻结决策。
- **运行验证：Codex 报告通过**。你提供的日志显示 229 项测试全部通过；我没有在独立环境重新执行测试，因为本次 ZIP 不含安装依赖和 `package-lock.json`。

## 一、代码变更范围审查

对比上一份 VII-G 源码，实际差异非常集中。

| 变更 | 主要内容 | Review |
|---|---|---|
| `agent-runtime.ts` | Options 新增 Hook，并传给 Executor | PASS |
| `tool-executor.ts` | 新增授权、等待、拒绝、取消逻辑 | PASS |
| `tool.ts` | 新增两个错误码 | PASS |
| `before-tool-call.ts` | 新增公共 Hook 契约 | PASS |
| `approval-demo.ts` | 增加 CLI 人工审批示例 | PASS |
| 3 个新测试文件 | 新增 53 项测试 | PASS |

对比结果也确认：既有 `RuntimeState`、`ContextBuilder`、`AgentEvent`、`SessionStore`、Conversation Validator 等实现没有被修改。

这是非常关键的架构事实：**VII-H 没有为了加入审批而重构已经完成的七个 Milestone。**

## 二、H-DD01～10 逐项审查

| 决策 | 代码证据 | 结论 |
|---|---|---|
| H-DD01 执行门禁 | `tool-executor.ts:99–152` | PASS |
| H-DD02 构造注入 | `agent-runtime.ts:30–59` | PASS |
| H-DD03 allow / deny | `before-tool-call.ts`、Executor 决策检查 | PASS |
| H-DD04 引用隔离 | `tool-executor.ts:115–126` | PASS |
| H-DD05 Deny | `tool-executor.ts:131–135` | PASS |
| H-DD06 Hook Error | `tool-executor.ts:65–95、136–140` | PASS |
| H-DD07 可中断等待 | `tool-executor.ts:49–97` | PASS |
| H-DD08 Abort 归因 | `tool-executor.ts:144–145`，Runtime 取消分支 | PASS |
| H-DD09 Event 兼容 | `agent-runtime.ts:190–227` | PASS |
| H-DD10 Session 兼容 | 消息配对与现有 Store 直接复用 | PASS |

其中有三个重点值得展开。

### 2.1 Hook 没有绕开 Schema Validation

实际执行顺序是：

```text
Registry.get()
     ↓
Ajv compile / validate
     ↓
structuredClone Hook Input
     ↓
await #authorize()
     ↓
allow → Abort Check → Tool.execute()
deny  → Failed ToolResult
error → Failed ToolResult
```

这与 H-DD01 完全一致。

特别是 `#authorize()` 没有承担第二套参数校验，也没有将 Tool Registry 的职责搬进 Runtime。

**Review：通过，不需要调整。**

### 2.2 审批等待采用 First Accepted Settlement

这次实现最值得保留的代码在 `tool-executor.ts:49–97`。

```ts
let settled = false;

const finish = (decision: AuthorizationSettlement): void => {
  if (settled) return;
  settled = true;
  signal?.removeEventListener("abort", abort);
  resolve(decision);
};
```

`settled` 的职责非常明确：只有第一个被接受的决策或取消能够完成这次等待。

实际代码还为 Hook Promise 注册了成功与失败处理器。因此 Abort 后迟到的 Hook rejection 不会生成第二份结果。

对照测试：

- H-T16：永远 pending 的 Hook 被 Abort 中断。
- H-T19：迟到 allow 不执行 Tool。
- H-T20：迟到 reject 不覆盖取消。
- H-T21：先接受 Hook Error 后发生 Abort，保留原失败归因。
- 监听器清理测试：不同结算路径均移除监听器。

**Review：通过。**

这里有一个重要区别：Executor 停止等待并不代表 Hook 内部的异步工作被物理终止。当前代码也没有声称能够撤销外部请求，因此没有越过 Non-Durable Approval 的边界。

### 2.3 Hook Error 没有污染 Runtime Error Contract

`#authorize()` 只把 Hook 边界的异常归一化成内部的 `{ type: "failed" }`。

Executor 随后返回：

```ts
{
  success: false,
  error: {
    code: "TOOL_PRE_EXECUTION_FAILED",
    message: "Pre-execution authorization failed."
  }
}
```

这符合 Fail Closed（授权失败时不放行）。

更重要的是，`Tool.execute()` 原有的异常处理依然独立：

- Tool Error → `TOOL_EXECUTION_FAILED`
- Hook Error → `TOOL_PRE_EXECUTION_FAILED`
- 明确 Deny → `TOOL_EXECUTION_DENIED`
- 带原始 Signal 归因的取消 → `ToolExecutionCancelledError`

测试也验证了 Lookup、Schema Compile、Validator 内部异常没有被错误吞掉。

**Review：通过。**

---

## 三、重点审查：Abort × Approval 竞态

这是本轮风险最高的部分。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">真实代码的取消处理路径</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" padding={3} radius="md" width="100%" align="center">
      **beforeToolCall Pending**
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <grid columns={2} gap={2}>
      <grid-item>
        <box border radius="md" padding={3} gap={1} align="center">
          <icon name="check-circle" color="success"/>
          **Hook 先结算**
          <text size="xs" color="secondary">接收 allow / deny / failed</text>
        </box>
      </grid-item>
      <grid-item>
        <box border radius="md" padding={3} gap={1} align="center">
          <icon name="ban" color="danger"/>
          **Abort 先结算**
          <text size="xs" color="secondary">抛出带 Signal 的取消错误</text>
        </box>
      </grid-item>
    </grid>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" padding={3} radius="md" width="100%" align="center">
      **AgentRuntime**
      <text size="xs" color="secondary">提交结果或补齐 Cancelled → 结束 Run</text>
    </box>
  </box>
</box>

我重点确认了以下三项：

**第一，allow 后的二次 Abort 检查确实存在。**

`tool-executor.ts:144–145` 在进入 `Tool.execute()` 前检查 Signal，并且中间没有额外的异步等待点。

**第二，Runtime 保留了取消归因检查。**

只有 `ToolExecutionCancelledError` 且携带当前 Signal，同时当前 Signal 已经 aborted，才会走取消配对分支。

**第三，已提交结果不会因为 Abort 被重新写入。**

Runtime 对当前及剩余尚未结算的 ToolCall 进行取消配对。此前成功、拒绝或失败的 ToolResult 保留原结果。

结合 H-T18～25 和原有 VII-F 测试，**未发现新的取消竞态 Must Fix**。

---

## 四、Session Recovery 兼容性审查

这次实现没有改变 VII-G 的 `Run → Validate → Save` 工作流。

根据 `approval-session-loop.test.ts`，新增测试覆盖：

| 场景 | Memory | SQLite |
|---|---|---|
| Deny 历史保存 / 恢复 | 通过 | 通过 |
| Hook Error 历史保存 / 恢复 | 通过 | 通过 |
| Approval 等待中 Abort 后保存 | 通过 | 通过 |
| 旧审批 / 工具不重放 | 通过 | 通过 |
| CAS Conflict 保留 Run Settlement | 通过 | 通过 |

尤其重要的是：恢复构造时的 `initialMessages` 仍然是历史事实，而不是待执行命令。

所以包含 `TOOL_EXECUTION_DENIED` 的历史，在下一次运行时不会再次请求批准。

这里不需要修改 `validateConversation()`，也不需要增加审批状态消息。

**Review：通过。**

---

## 五、发现的问题与改进建议

<row align="center" gap={3}>
  <box flex="1" gap={1}>
    <title size="xl" color="success">0</title>
    <caption>Must Fix</caption>
  </box>
  <box flex="1" gap={1}>
    <title size="xl">1</title>
    <caption>交付证据建议</caption>
  </box>
  <box flex="1" gap={1}>
    <title size="xl">2</title>
    <caption>可接受限制</caption>
  </box>
</row>

### 建议 1：补齐最终 Review 包的文件证据

当前 ZIP 包含源码、测试、`package.json` 和 `tsconfig.json`，但没有：

- `README.md`
- `package-lock.json`

因此我能够确认核心实现、测试源码和 npm 脚本，却不能直接核对 Codex 报告中所说的 README 修改，也不能基于该 ZIP 完成可重复的依赖安装。

这属于**交付材料完整性问题，不是代码 Must Fix**。

如果下一步让 Codex 生成最终 Milestone Note，应该要求它直接读取工作区中的 README、lockfile 和真实测试日志，不得将这次 ZIP 缺少的材料写成 ChatGPT 已经审查过。

### 可接受限制 1：Hook 仍然是受信任的 Application 代码

`structuredClone` 能防止 Hook 通过参数引用修改执行数据，但不可能阻止受信任的 Application Hook 自己调用外部 API。

所以它是执行前授权扩展点，不是对任意恶意 Hook 代码的安全沙箱。

无需在 VII-H 引入隔离进程或沙箱。

### 可接受限制 2：取消无法中断阻塞事件循环的同步代码

当前实现能中断异步等待中的审批 Promise。

但如果 Hook 在同步函数中执行无限循环，JavaScript 事件循环被阻塞，那么 Abort listener 本身也无法及时运行。

这是当前进程内执行模型的限制，不是这次异步审批设计的缺陷。

也不建议为了处理这种极端场景，提前引入 Worker Thread 或独立审批进程。

---

## 六、Theory Feedback：本节真正获得了哪些架构能力？

### 6.1 Approval 不是 Agent Loop 的新状态

我们最初容易把人工审批理解成：

```text
Agent State = Waiting For Approval
```

但实际实现证明：

**对于 Non-Durable Approval，异步等待可以是 Executor 执行路径中的控制过程，不必进入持久化的 RuntimeState。**

这是一次非常重要的架构认知升级。

只有当我们未来要求跨进程恢复审批、长时间暂停 Run、跨服务继续执行时，才有必要引入更完整的审批状态与执行恢复协议。

### 6.2 工具的执行意图不等于执行授权

LLM 产生的 ToolCall 表达的是：

「我想执行这个操作。」

而 Hook 的 allow 表达的是：

「这个操作现在获得了执行许可。」

真正的 `Tool.execute()` 才可能产生外部副作用。

三者分别属于：

| 层次 | 英文术语 | 当前所有者 |
|---|---|---|
| 调用意图 | Tool Invocation Intent | Model |
| 执行授权 | Execution Authorization | Application Hook / Executor |
| 实际执行 | Tool Execution | ToolExecutor / Tool |

未来做营销 Agent 时，这个区分尤其重要。

### 6.3 Abort 是控制权，不是业务回滚

VII-F 已经建立 Abort 合约，VII-H 进一步证明了：

**取消可以阻止尚未开始的副作用，但不能反向否定已经发生的事实。**

例如一批工具：

```text
A → successfully executed
B → waiting for approval
C → not started
```

B 等待期间 Abort，结果应是：

```text
A: success
B: cancelled
C: cancelled
```

而不是把 A 也标记为 cancelled。

这正是 Agent Runtime 的执行事实与控制状态必须分开的原因。

### 6.4 Approval 拒绝也是模型需要观察的事实

本次采用 Deny → ToolResult → Model 的路径，而不是直接结束整个 Run。

这样模型可以解释操作为什么没有执行。

但它不能因为收到 Deny 而绕过审批重新调用同一工具成功执行；每一次新的工具调用仍然要重新经过 Hook。

这里也体现了 VII-C 工具错误回流模型的设计价值。

### 6.5 First Accepted Settlement 是一个可迁移的并发设计

本轮 `#authorize()` 的局部 `settled` 标记，不仅是为了防止 Promise 重复 resolve。

它表达的是：

> 在多个可能的异步结算来源中，只有一个结果拥有此次等待的最终解释权。

这个思想可以迁移到：

- 网络请求与超时竞争；
- 人工审批与取消竞争；
- 多个异步任务的最终归因；
- Agent Tool Execution 的取消控制。

但是它不能直接等同于 Durable Execution。进程退出后，局部 Promise 和 `settled` 都不再存在。

---

## 七、最终 Review 结论

| 验收维度 | 结果 |
|---|---|
| H-DD01～10 | 全部符合 |
| 新增 53 项测试 | 源码覆盖符合；用户日志显示通过 |
| 原有 176 项回归 | 用户日志显示通过 |
| Build / Typecheck | Codex 日志报告通过 |
| Approval allow / deny Demo | 运行日志证明对应链路 |
| Abort / Single Active Run | 没有发现回归 |
| AgentEvent | 保持既有契约 |
| Session / Recovery | 保持既有契约 |
| Must Fix | **0** |
| 设计偏差 | **0** |
| 独立重新运行测试 | 未执行，Review 为静态审查 |

## 八、下一阶段

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **Architecture Analysis**
    <icon name="check-circle-2" color="success"/>
  </row>
  <row align="center" justify="between">
    **Design Decision**
    <icon name="check-circle-2" color="success"/>
  </row>
  <row align="center" justify="between">
    **Codex Implementation**
    <icon name="check-circle-2" color="success"/>
  </row>
  <row align="center" justify="between">
    **Runtime Verification / Debug**
    <icon name="check-circle-2" color="success"/>
  </row>
  <row align="center" justify="between">
    **Code Review + Theory Feedback**
    <icon name="check-circle-2" color="success"/>
  </row>
  <divider/>
  <row align="center" justify="between">
    **Milestone Closure**
    <badge color="info">下一步</badge>
  </row>
</box>

我建议**不需要再让 Codex 修改功能代码**，直接进入 VII-H 的 Milestone Closure。

下一步我们按照你之前固定的学习流程，完成九项收尾内容：学习计划核对、写书 TODO、工程素材、认知升级、工业级对照、架构知识地图、面试视角、思考题和 Pending 回收。

然后再让 Codex 基于真实仓库、完整讨论记录及本轮实现与测试证据，生成最终的 **Engineering Learning Log + Architecture Record**。

Part VII-H 正式归档后，再进入 **Part VII-I：Weather Agent 完整链路**。<MemoryCite />

## Turn 10

### User

> Message ID: `47503c81-a98a-4cf2-901c-a5fd8aa6979f`; content: `text`; channel: `None`; recipient: `all`

那继续下一步吧

### ChatGPT — commentary

> Message ID: `08be04af-7ebc-436b-bde3-7e024f50e5c3`; content: `text`; channel: `commentary`; recipient: `all`

接下来进入 **Part VII-H · Milestone Closure**。我会按照我们约定的固定九项完成学习收尾，并区分已经由源码和测试证明的结论、工业级系统的延伸能力，以及仍需延期的事项。

收尾后，我会给你一份用于 Codex 生成最终《Engineering Learning Log + Architecture Record》的提示词，不让它重复实现功能。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `906164eb-b6e7-4ca2-9756-9b8258d6f35f`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lah /mnt/data | head -60 && unzip -l '/mnt/data/source-review(20261015-012420).zip' | head -65

### Public tool output

> Message ID: `54af37d6-1b2a-4d69-ba3d-d91e080e5f66`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `1c702be7-5b0f-487f-ba15-04b7e2a0c10b`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc find /mnt/data/review_vii_h -maxdepth 2 -type f | head -25; echo '---'; nl -ba /mnt/data/review_vii_h/src/tools/before-tool-call.ts; echo '--- executor'; nl -ba /mnt/data/review_vii_h/src/tools/tool-executor.ts | sed -n '1,230p'; echo '--- runtime'; nl -ba /mnt/data/review_vii_h/src/runtime/agent-runtime.ts | sed -n '1,275p'

### Public tool output

> Message ID: `df35733b-d689-45a9-9fe4-7390eccdeebb`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `d6ed128e-3914-4648-b422-c25798933a46`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc cat /mnt/data/review_vii_h/package.json; echo '--- test current'; nl -ba /mnt/data/review_vii_h/src/demo/approval-demo.ts | sed -n '1,240p'; echo '--- doc highlights'; grep -n -E 'Part VII-H|Part VII-I|Closure|TODO|9 项|固定|pending' '/mnt/data/README(9).md' | head -35

### Public tool output

> Message ID: `e46aaf6d-e6d7-42ae-a6e1-515f060c9e21`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `d29e649d-a3cc-4c48-a1ab-eb39aa043934`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Milestone Closure

<badge color="success">Code Review PASS · Must Fix 0</badge>

我们正式进入 **Part VII-H：beforeToolCall + Simple Human Approval** 的最后一个阶段：Milestone Closure（里程碑收尾）。

结合真实源码、Codex 的交付报告、229 项测试日志以及上一轮 Code Review，**VII-H 的功能实现和架构验收已经完成，可以进入最终知识归档。**

本轮依旧保持我们此前约定的九项学习收尾结构。

## 1. 学习计划与完成情况

<box border radius="lg" padding={3} gap={3}>
  <row align="center" justify="between">
    <text weight="medium">Part VII-H 验收结果</text>
    <badge color="success">通过</badge>
  </row>
  <grid columns={3} gap={2}>
    <grid-item>
      <title size="2xl" color="default" tabularNums>229</title>
      <caption>累计测试通过</caption>
    </grid-item>
    <grid-item>
      <title size="2xl" color="default" tabularNums>53</title>
      <caption>本轮新增测试</caption>
    </grid-item>
    <grid-item>
      <title size="2xl" color="default" tabularNums>0</title>
      <caption>Must Fix</caption>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  | 学习目标 | 结果 |
  |---|---|
  | 通用 beforeToolCall | <icon name="check" color="success" inline/> 完成 |
  | Allow / Deny | <icon name="check" color="success" inline/> 完成 |
  | 异步人工 Approval | <icon name="check" color="success" inline/> 完成 |
  | Hook Error 安全处理 | <icon name="check" color="success" inline/> 完成 |
  | Abort × Approval 竞态 | <icon name="check" color="success" inline/> 完成 |
  | ToolResult 完整配对 | <icon name="check" color="success" inline/> 完成 |
  | AgentEvent、Session 兼容 | <icon name="check" color="success" inline/> 完成 |
  | CLI Approval Demo | <icon name="check" color="success" inline/> 完成 |
</box>

运行环境是 Node.js v22.18.0。测试、构建和 Demo 通过由你提供的 Codex 执行日志支持；ChatGPT 完成了独立静态 Code Review，没有重新执行完整测试。

**本节的目标不是建设审批平台，而是证明现有 Agent Runtime 已经拥有可靠的执行前控制能力。**

这一目标已经达成。

## 2. 《从零实现 Agent Runtime》写书 TODO

这一节很适合成为你未来书稿中《Agent Tool Execution：权限与人工审批》的实践章节。

建议章节按照下面的学习顺序组织：

| 章节素材 | 要回答的问题 |
|---|---|
| 工具调用与执行授权 | 为什么 LLM 的 ToolCall 不能直接等于执行许可？ |
| beforeToolCall 的责任边界 | 为什么门禁放在 Schema Validation 后面？ |
| Hook 与 Application | 谁决定是否放行，谁真正执行决策？ |
| 最小 Human Approval | 为什么异步 `allow/deny` 足够支撑第一版？ |
| Fail Closed | 审批机制故障为什么不能默认放行？ |
| Approval × Abort | 如何处理等待、迟到批准和重复结果？ |
| ToolResult 与 Conversation | 为什么拒绝也必须成为完整的执行结果？ |
| Non-Durable Approval | 为什么对话恢复不等于审批恢复？ |

书稿最好保留三个真实工程案例：

**案例 A：用户拒绝发布公告。** 模型提出 `publish_note`，Application 返回 deny，工具没有执行，但模型正常给出“公告未发布”的结果。

**案例 B：审批等待期间取消 Run。** Hook 尚未返回，Caller 触发 Abort，Executor 结束等待，Runtime 补齐取消结果并释放 Active Run。

**案例 C：Hook 抛出敏感异常。** 审批失败转换成安全的 ToolResult，模型不会收到原始异常堆栈或内部秘密。

这三个案例都能够对应本次真实代码、测试或 Demo，而不是凭空构造的架构故事。

## 3. 本轮学习素材与工程证据

后续 Codex 生成最终笔记时，应保留以下源码定位清单。

| 文件 | 应记录的工程事实 |
|---|---|
| `src/tools/before-tool-call.ts` | Hook 类型与决策契约 |
| `src/tools/tool-executor.ts` | 门禁、错误归一化、可中断等待、引用隔离 |
| `src/runtime/agent-runtime.ts` | 构造注入、ToolResult 写入与取消配对 |
| `src/tools/tool.ts` | 两个新增错误码 |
| `src/demo/approval-demo.ts` | 最小 Human Approval 实战 |
| `test/before-tool-call.test.ts` | 基础行为、参数隔离和错误安全 |
| `test/approval-run-control.test.ts` | Abort、竞态、Single Active Run |
| `test/approval-session-loop.test.ts` | Tool Loop、Memory/SQLite 保存恢复及 CAS |

最有价值的两段实现素材是：

- `ToolExecutor.#authorize()`：展示如何让 Hook Promise 与 AbortSignal 竞争，并且只接受第一个有效的结算结果。
- `ToolExecutor.execute()`：展示如何在 Ajv Validation 后、Tool 真正执行前插入授权控制，同时保持参数隔离。

工程记录需要保留一个真实 Debug：新 Approval Demo 初次构建时出现 TypeScript 类型缩窄和 `readline.question()` 的 Options 类型问题，Codex 随后修复，并重新完成构建验证。

不要把测试中人为模拟的异常写成开发过程中真实遇到的 Bug。

## 4. 核心认知升级

这次最重要的升级可以用一句话概括：

> **Agent 能够调用工具，与 Agent 被允许执行工具，是两个不同层次的能力。**

以前 VII-C 完成后，我们的 Runtime 已经能够执行：

```text
LLM → ToolCall → ToolExecutor → ToolResult → LLM
```

但那时模型生成合法 ToolCall，通常就会进入真实执行。

现在增加了控制层：

```text
LLM
 ↓
ToolCall：模型表达执行意图
 ↓
Schema Validation：调用是否合法
 ↓
beforeToolCall：是否获得执行许可
 ↓
Tool.execute：真正执行
 ↓
ToolResult：记录已经发生的事实
 ↓
LLM：观察结果并继续回答
```

这带来了四个认知变化。

**第一，执行授权不属于 LLM。** 模型可以提出发券请求，但不能依靠自己生成的文字来证明已获得批准。

**第二，Deny 不等于 Error，也不等于 Abort。** 用户明确拒绝、审批系统异常和 Caller 取消 Run，分别有不同的结果语义。

**第三，Abort 是对尚未开始执行的操作进行控制，不是业务回滚。** 一个工具已经完成后，不能因为后来取消 Run，就抹去它已发生的副作用。

**第四，Approval 是执行过程，未必是持久化状态。** 本轮采用 Non-Durable Approval，等待过程不需要进入 RuntimeState；只有结算后的 ToolResult 才成为可保存的 Conversation Fact（对话事实）。

其中 `First Accepted Settlement`（首次有效结算）是本轮最值得反复理解的并发设计：当 Hook 结果与 Abort 竞争时，必须有唯一的结算归因，不能让后到的结果重新触发工具。


### ChatGPT

> Message ID: `1fe41a81-50da-437d-9923-1df5924e4414`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Milestone Closure

<badge color="success">Code Review PASS · Must Fix 0</badge>

我们正式进入 **Part VII-H：beforeToolCall + Simple Human Approval** 的最后一个阶段：Milestone Closure（里程碑收尾）。

结合真实源码、Codex 的交付报告、229 项测试日志以及上一轮 Code Review，**VII-H 的功能实现和架构验收已经完成，可以进入最终知识归档。**

本轮依旧保持我们此前约定的九项学习收尾结构。

## 1. 学习计划与完成情况

<box border radius="lg" padding={3} gap={3}>
  <row align="center" justify="between">
    <text weight="medium">Part VII-H 验收结果</text>
    <badge color="success">通过</badge>
  </row>
  <grid columns={3} gap={2}>
    <grid-item>
      <title size="2xl" color="default" tabularNums>229</title>
      <caption>累计测试通过</caption>
    </grid-item>
    <grid-item>
      <title size="2xl" color="default" tabularNums>53</title>
      <caption>本轮新增测试</caption>
    </grid-item>
    <grid-item>
      <title size="2xl" color="default" tabularNums>0</title>
      <caption>Must Fix</caption>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  | 学习目标 | 结果 |
  |---|---|
  | 通用 beforeToolCall | <icon name="check" color="success" inline/> 完成 |
  | Allow / Deny | <icon name="check" color="success" inline/> 完成 |
  | 异步人工 Approval | <icon name="check" color="success" inline/> 完成 |
  | Hook Error 安全处理 | <icon name="check" color="success" inline/> 完成 |
  | Abort × Approval 竞态 | <icon name="check" color="success" inline/> 完成 |
  | ToolResult 完整配对 | <icon name="check" color="success" inline/> 完成 |
  | AgentEvent、Session 兼容 | <icon name="check" color="success" inline/> 完成 |
  | CLI Approval Demo | <icon name="check" color="success" inline/> 完成 |
</box>

运行环境是 Node.js v22.18.0。测试、构建和 Demo 通过由你提供的 Codex 执行日志支持；ChatGPT 完成了独立静态 Code Review，没有重新执行完整测试。

**本节的目标不是建设审批平台，而是证明现有 Agent Runtime 已经拥有可靠的执行前控制能力。**

这一目标已经达成。

## 2. 《从零实现 Agent Runtime》写书 TODO

这一节很适合成为你未来书稿中《Agent Tool Execution：权限与人工审批》的实践章节。

建议章节按照下面的学习顺序组织：

| 章节素材 | 要回答的问题 |
|---|---|
| 工具调用与执行授权 | 为什么 LLM 的 ToolCall 不能直接等于执行许可？ |
| beforeToolCall 的责任边界 | 为什么门禁放在 Schema Validation 后面？ |
| Hook 与 Application | 谁决定是否放行，谁真正执行决策？ |
| 最小 Human Approval | 为什么异步 `allow/deny` 足够支撑第一版？ |
| Fail Closed | 审批机制故障为什么不能默认放行？ |
| Approval × Abort | 如何处理等待、迟到批准和重复结果？ |
| ToolResult 与 Conversation | 为什么拒绝也必须成为完整的执行结果？ |
| Non-Durable Approval | 为什么对话恢复不等于审批恢复？ |

书稿最好保留三个真实工程案例：

**案例 A：用户拒绝发布公告。** 模型提出 `publish_note`，Application 返回 deny，工具没有执行，但模型正常给出“公告未发布”的结果。

**案例 B：审批等待期间取消 Run。** Hook 尚未返回，Caller 触发 Abort，Executor 结束等待，Runtime 补齐取消结果并释放 Active Run。

**案例 C：Hook 抛出敏感异常。** 审批失败转换成安全的 ToolResult，模型不会收到原始异常堆栈或内部秘密。

这三个案例都能够对应本次真实代码、测试或 Demo，而不是凭空构造的架构故事。

## 3. 本轮学习素材与工程证据

后续 Codex 生成最终笔记时，应保留以下源码定位清单。

| 文件 | 应记录的工程事实 |
|---|---|
| `src/tools/before-tool-call.ts` | Hook 类型与决策契约 |
| `src/tools/tool-executor.ts` | 门禁、错误归一化、可中断等待、引用隔离 |
| `src/runtime/agent-runtime.ts` | 构造注入、ToolResult 写入与取消配对 |
| `src/tools/tool.ts` | 两个新增错误码 |
| `src/demo/approval-demo.ts` | 最小 Human Approval 实战 |
| `test/before-tool-call.test.ts` | 基础行为、参数隔离和错误安全 |
| `test/approval-run-control.test.ts` | Abort、竞态、Single Active Run |
| `test/approval-session-loop.test.ts` | Tool Loop、Memory/SQLite 保存恢复及 CAS |

最有价值的两段实现素材是：

- `ToolExecutor.#authorize()`：展示如何让 Hook Promise 与 AbortSignal 竞争，并且只接受第一个有效的结算结果。
- `ToolExecutor.execute()`：展示如何在 Ajv Validation 后、Tool 真正执行前插入授权控制，同时保持参数隔离。

工程记录需要保留一个真实 Debug：新 Approval Demo 初次构建时出现 TypeScript 类型缩窄和 `readline.question()` 的 Options 类型问题，Codex 随后修复，并重新完成构建验证。

不要把测试中人为模拟的异常写成开发过程中真实遇到的 Bug。

## 4. 核心认知升级

这次最重要的升级可以用一句话概括：

> **Agent 能够调用工具，与 Agent 被允许执行工具，是两个不同层次的能力。**

以前 VII-C 完成后，我们的 Runtime 已经能够执行：

```text
LLM → ToolCall → ToolExecutor → ToolResult → LLM
```

但那时模型生成合法 ToolCall，通常就会进入真实执行。

现在增加了控制层：

```text
LLM
 ↓
ToolCall：模型表达执行意图
 ↓
Schema Validation：调用是否合法
 ↓
beforeToolCall：是否获得执行许可
 ↓
Tool.execute：真正执行
 ↓
ToolResult：记录已经发生的事实
 ↓
LLM：观察结果并继续回答
```

这带来了四个认知变化。

**第一，执行授权不属于 LLM。** 模型可以提出发券请求，但不能依靠自己生成的文字来证明已获得批准。

**第二，Deny 不等于 Error，也不等于 Abort。** 用户明确拒绝、审批系统异常和 Caller 取消 Run，分别有不同的结果语义。

**第三，Abort 是对尚未开始执行的操作进行控制，不是业务回滚。** 一个工具已经完成后，不能因为后来取消 Run，就抹去它已发生的副作用。

**第四，Approval 是执行过程，未必是持久化状态。** 本轮采用 Non-Durable Approval，等待过程不需要进入 RuntimeState；只有结算后的 ToolResult 才成为可保存的 Conversation Fact（对话事实）。

其中 `First Accepted Settlement`（首次有效结算）是本轮最值得反复理解的并发设计：当 Hook 结果与 Abort 竞争时，必须有唯一的结算归因，不能让后到的结果重新触发工具。

## 5. 工业级 Agent 实现对照

本轮实现的是 Mini Runtime 的执行前控制能力。它与真正的企业级 Agent 平台还有一些区别。

| 能力 | VII-H 当前实现 | 工业级可能需要 |
|---|---|---|
| 执行前控制 | 单个可选 Hook | 集中式 Policy Engine（策略引擎） |
| 人工审批 | 异步 Handler | 审批任务、人员角色、审批队列 |
| 审批结果 | allow / deny | 多级审批、超时、撤销 |
| 执行取消 | AbortSignal | 分布式取消和执行状态跟踪 |
| 结果记录 | RuntimeMessage | 审计日志、业务操作记录 |
| 会话恢复 | 保存已结算消息 | 恢复未完成的审批与执行 |
| 业务安全 | Application Hook | API 鉴权、数据权限、幂等和风险控制 |

这里不建议继续给 Mini Runtime 增加功能。

对于以后选择的营销业务 Agent，我们完全可以保留这次的 `beforeToolCall` 机制，在业务 API 层补充服务端权限验证与幂等控制。

**核心原则：Runtime 不应该承担所有企业治理责任。**

## 6. 知识地图：Part VII-A～VII-I

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">Mini Agent Runtime v1 学习进度</text>
  {#each [
    ["A","基础类型与 ModelProvider"],
    ["B","RuntimeState + Agent Loop"],
    ["C","Tool Registry + Executor"],
    ["D","ContextBuilder + TurnSnapshot"],
    ["E","AgentEvent + Subscriber"],
    ["F","Abort + Single Active Run"],
    ["G","SessionStore + Recovery"],
    ["H","beforeToolCall + Approval"]
  ] as item}
    <row align="center" gap={3} key={item[0]}>
      <box background="surface-secondary" radius="md" size="36px" align="center" justify="center">
        <text weight="medium">{item[0]}</text>
      </box>
      <box flex="1">
        <text size="sm">{item[1]}</text>
      </box>
      <icon name="check-circle-2" color="success"/>
    </row>
  {/each}
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="md" size="36px" align="center" justify="center">
      <text weight="medium">I</text>
    </box>
    <box flex="1" gap={1}>
      **Weather Agent 完整链路**
      <caption>下一 Milestone · 未开始</caption>
    </box>
    <icon name="circle" color="tertiary"/>
  </row>
</box>

从架构角度，可以将 A～H 分成五类：

| 架构能力 | 对应 Milestone | 回答的问题 |
|---|---|---|
| 模型交互 | A、D | 模型看到什么，如何生成请求？ |
| 执行引擎 | B、C | 谁管理循环，谁执行工具？ |
| 观察与控制 | E、F、H | 如何观察、取消和授权？ |
| 状态恢复 | G | 哪些事实可以跨进程保留？ |
| 完整业务闭环 | I | 如何将前面能力组合成真实 Agent？ |

现在我们已经有一个基本完整的 Runtime Core，但还缺少基于真实业务场景的端到端集成验证。

因此 VII-I 的目的并不是再补一个复杂抽象，而是验证 A～H 能否真正协同工作。

## 7. 面试视角：如何证明你理解了 Approval 架构？

这次可以沉淀五个很有技术深度的面试问题。

| 面试问题 | 核心回答 |
|---|---|
| 为什么 Agent 需要 beforeToolCall？ | LLM 只拥有调用意图，不能拥有最终执行授权；执行前必须存在可信控制边界 |
| 为什么 Hook 放在参数校验之后？ | 避免审批非法参数，并保持 ToolExecutor 对 Schema Validation 的所有权 |
| 为什么拒绝执行仍然生成 ToolResult？ | ToolCall 已成为历史事实，必须记录其最终结果才能保持消息协议完整 |
| Abort 时如何防止迟到批准触发工具？ | Executor 对等待进行唯一结算，取消后不再接受迟到决策，执行前再次检查 Signal |
| 为什么 SessionStore 不保存审批 Promise？ | Conversation Recovery 只恢复稳定消息，不等于恢复执行中的异步操作 |

更高级的追问可能是：

**既然你已经实现 Approval，为什么不直接增加 `RuntimeState.status = "waiting_approval"`？**

你应该能够回答：

因为当前 Runtime 不支持 Durable Execution，新增一个持久状态字段无法恢复原始 Promise、审批连接或执行上下文。它会带来更多状态同步和恢复问题，却不能解决真实的跨进程审批需求。

这是比“我写了一个审批弹窗”更有价值的架构理解。

## 8. 本节思考题

这三道题建议你先自己思考，不急着让 Codex 提供答案。

<box gap={3}>
  <box gap={1}>
    **思考题一：审批过的参数还能改变吗？**

    用户批准发放 100 元优惠券。审批完成后，系统的业务策略变了，现在最高只能发放 50 元。

    Executor 应该自动将 100 改成 50 再执行，还是拒绝这次操作？

    <text color="secondary" size="sm">考察：参数一致性、Validation、Authorization 的责任边界。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **思考题二：模型能否不断重试被拒绝的操作？**

    模型第一次请求发券，Hook 返回 deny。模型收到结果后，又提出同样的 ToolCall，但换了一个 ID。

    当前 Runtime 能否阻止再次请求人工审批？如果希望限制这种行为，应该由哪一层负责？

    <text color="secondary" size="sm">考察：ToolCall、Policy、Approval 与 Agent Loop 的边界。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **思考题三：用户批准后进程崩溃怎么办？**

    用户批准了发券操作，Tool 已经调用后端 API，但 Runtime 还没把 ToolResult 保存到 SQLite，进程就崩溃。

    下次恢复后，如何判断优惠券有没有真正发放？

    <text color="secondary" size="sm">考察：Conversation Recovery、Durable Execution 与业务幂等。</text>
  </box>
</box>

这三道题也可以作为以后《从零实现 Agent Runtime》的章节练习。

## 9. Pending 回收与下一阶段衔接

### 已经关闭的问题

H-Q01～H-Q06 均已形成架构决策，收敛为 H-DD01～H-DD10，并且完成了实现、测试和 Code Review。

| Pending | 最终处理 |
|---|---|
| Hook 应该放在哪层？ | Executor 校验后、执行前 |
| Hook 返回什么？ | allow / deny |
| Hook 需要知道人工审批流程吗？ | 不需要，由 Application 处理 |
| Hook Error 怎么处理？ | 专用安全失败 ToolResult |
| 等待期间如何 Abort？ | Executor 保证可中断 |
| 是否新增 Approval Event？ | 不新增 |
| 是否修改 SessionStore？ | 不修改 |
| 是否需要重构 VII-A～VII-G？ | 不需要 |

### 仍然延期的事项

Durable Approval、Durable Tool Execution、跨实例执行协调、审批审计、复杂权限策略以及外部副作用恢复，都不属于 VII-H。

此外，Node 20 的独立兼容性验证仍未完成；本轮实测环境为 Node 22。最终源码 ZIP 缺少 README 和 lockfile 的审查证据问题，也需要在归档中如实注明，但不构成功能 Must Fix。

### 收尾结论

**Part VII-H 的工程学习收尾至此完成。**

接下来只剩最后一步：让 Codex 基于本地真实仓库和学习材料，生成最终 Engineering Learning Log，并将 Day08 README 更新为：

- Part VII-H：Done
- Part VII-I：Next

完成文档归档后，我们才进入 VII-I。

---

# 下一步：交给 Codex 生成最终工程学习笔记

沿用 VII-G 的归档规范：**17 个固定章节 + 9 项学习收尾素材**，不要退化成普通课程总结。

下面是可直接交给 Codex 的最终提示词。

<WritingBlock id="74821" variant="document"># Part VII-H — Milestone Closure & Engineering Learning Log

当前 **Part VII-H：beforeToolCall + Simple Human Approval** 的 Architecture Analysis、Design Decision、Codex Implementation、Runtime Verification / Debug、ChatGPT Code Review + Theory Feedback 均已完成。

ChatGPT 最终 Code Review 结果为 **PASS，Must Fix 0**。

现在只执行 **Milestone Closure / Documentation Archiving**。

## 一、证据来源

请基于以下材料生成最终工程学习笔记：

1. 当前 `mini-agent-runtime` 仓库的真实源码、测试、Demo、README、package.json、package-lock.json 和工程配置。
2. 本次 Part VII-H 与 ChatGPT 的完整学习和架构讨论记录，包括 H-Q01～H-Q06、H-AD01～26 候选决策、最终 H-DD01～10 及 Code Review。
3. Codex 本轮实际的 Implementation、Runtime Verification、测试、Debug 和修复过程。
4. Part VII-G 最终 Engineering Learning Log，以及 Day08 的整体 README 与 Milestone 规划。

**证据优先级：真实代码与测试 → 实际运行日志 → 最终确认的架构决策 → 历史讨论。**

如果无法取得 ChatGPT 完整讨论记录，应明确说明缺失范围，不得根据摘要虚构逐轮对话。

不得将 ChatGPT 的静态 Review 记述为独立执行测试。

## 二、Milestone 工程事实

以下为已经报告的验证基线，请重新与工作区真实文件核对：

- VII-G 基线：176 项测试。
- VII-H 新增：53 项测试。
- 最终完整测试：229 passed，0 failed。
- npm run build：通过。
- npm run typecheck:tests：通过。
- demo:tools、demo:recovery、demo:approval：通过。
- Approval Demo 已验证 allow、deny 和人工 CLI 确认。
- 实测环境：Node.js v22.18.0。
- 未增加第三方依赖，未修改既有测试的原始预期。
- 实现阶段存在一次 Approval Demo TypeScript 构建错误，已修复。
- 本轮 ChatGPT Review：Must Fix 0，无需功能代码修复。

如果仓库内容与以上记录不一致，明确报告差异，不得自动改写历史事实。

## 三、固定文档结构

生成一份 **Engineering Learning Log + Architecture Record**。

必须完整保留以下 17 个一级章节：

1. Milestone Goal
2. Starting Point
3. Architecture Questions
4. Design Decisions
5. Why These Decisions
6. Implementation Scope
7. Code Changes
8. Runtime Verification
9. Bugs / Debugging
10. Code Review Findings
11. Theory Feedback
12. Pi Mapping
13. Architecture Decisions Added
14. Deferred Work
15. Final Architecture Snapshot
16. Core Knowledge Upgrade
17. Next Milestone

重点记录：

**设计是如何形成的，为什么选择这种方案，具体由哪段代码落实，又通过什么测试证明。**

不要只罗列概念和文件名。

## 四、Architecture Decisions 记录要求

保留候选 H-AD01～H-AD26 到最终 H-DD01～H-DD10 的收敛过程。

正式决策包括：

- H-DD01：Executor Validation 后的执行前门禁。
- H-DD02：Application 所有权及构造注入。
- H-DD03：异步 Hook + allow / deny 最终决策。
- H-DD04：参数引用隔离。
- H-DD05：Deny 转换成失败 ToolResult。
- H-DD06：Hook Error 安全归一化。
- H-DD07：可中断的 Approval 等待。
- H-DD08：Abort 归因与完整配对。
- H-DD09：原有 AgentEvent Contract 不变。
- H-DD10：Session / Conversation Recovery 不变。

必须说明每条决策的形成原因、替代方案、最终代码位置及测试证据。

不要把早期讨论中没有采纳的方案写成最终设计。

## 五、源码与验证要求

重点检查：

- `src/tools/before-tool-call.ts`
- `src/tools/tool-executor.ts`
- `src/runtime/agent-runtime.ts`
- `src/tools/tool.ts`
- `src/demo/approval-demo.ts`
- `test/before-tool-call.test.ts`
- `test/approval-run-control.test.ts`
- `test/approval-session-loop.test.ts`

同时检查相关的 AgentEvent、SessionStore、Conversation Validator、ContextBuilder。

验证记录必须区分：

- 实际运行过的测试和 Demo；
- 测试源码的静态分析；
- ChatGPT Code Review；
- 尚未验证的环境及限制。

完整解释 Approval 等待中的 First Accepted Settlement、迟到 Hook Result、AbortSignal 归因、参数复制和 ToolResult 完整配对。

## 六、固定九项学习素材

在第 16 章 Core Knowledge Upgrade 中，或者与相应章节建立明确对应，完整保留本轮九项学习收尾：

1. 学习计划与完成情况
2. 《从零实现 Agent Runtime》写书 TODO
3. 学习素材与真实工程证据
4. 核心认知升级
5. 工业级实现对照
6. Part VII-A～VII-H 架构知识地图
7. 面试视角
8. 思考题
9. Pending 回收与下一阶段衔接

不得因 17 章工程记录已经覆盖相关内容，就把九项学习素材省略。

## 七、Pi Mapping 要求

Pi Agent 的对照只允许引用已有 Part VI 源码学习资料中被验证过的事实。

重点对比：

- Tool Execution 控制边界。
- 执行前 Hook 与授权责任。
- Runtime Core 与 Harness / Application 的关系。
- Abort、Event 和工具结果回流。

如果缺少能够证明 Pi 具体机制的源码证据，明确标为未验证，不得推测 Pi 的官方实现。

不能将 Mini Runtime 自己设计的接口误写成 Pi 的原生机制。

## 八、归档任务

先检查现有 notes / Day08 的真实目录与命名规范，沿用 Part VII-G 的文件组织方式。

生成：

`day08-part-vii-h-before-tool-call-simple-approval.md`

并按既有 source/ 规则保存或更新可取得的架构讨论、Review、Codex 实现 / 测试 / Debug 证据记录。

注意：

- 不凭空构造 ChatGPT 消息或测试日志。
- 不保存 API Key、敏感令牌或真实凭证。
- Markdown 是唯一主版本。
- 不生成 PDF、DOCX。
- 不修改功能源码。
- 不新增工程功能。
- 不自动创建 Git Commit。

完成后更新 Day08 README：

- VII-H：Done。
- VII-I：Next。
- 同步 VII-H 学习笔记与 source 文件链接。
- 更新进度总览与最终测试基线。

保留 Part VII v1 固定 A～I 的规划，不扩展 VII-J 及后续 Milestone。

## 九、最终交付报告

完成文档归档后，请报告：

1. 新增与修改的文档文件。
2. 17 章是否全部完整。
3. H-DD01～10 是否有逐项代码和测试证据。
4. 九项学习素材是否完整保留。
5. Day08 README 是否同步。
6. 所有源码定位、相对链接是否有效。
7. 代码、测试、依赖、配置是否保持不变。
8. 仍缺少的资料或未验证事项。
9. 是否可以正式宣布 Part VII-H Closure 完成。

本轮只做 **VII-H Documentation Closure**，不提前实现 VII-I。</WritingBlock>

完成这份归档之后，Part VII 的进度就会来到 **8/9 个 Milestone 已完成**。

下一节 VII-I，我们将从单个 Runtime 能力的实现，转向真正的端到端 Agent 集成验证。这也是进入后续营销业务 Agent 实战之前，最后一次完整检验 Mini Runtime v1 架构的机会。

---

If you want, I can:

- 继续描述下一部分实现细节
- 讲解审批相关的测试设计
- 说明未完成的功能和后续计划

### ChatGPT

> Message ID: `c4a6824a-0286-4519-8260-e4e8c1002ef7`; content: `text`; channel: `final`; recipient: `all`

## 5. 工业级 Agent 实现对照

本轮实现的是 Mini Runtime 的执行前控制能力。它与真正的企业级 Agent 平台还有一些区别。

| 能力 | VII-H 当前实现 | 工业级可能需要 |
|---|---|---|
| 执行前控制 | 单个可选 Hook | 集中式 Policy Engine（策略引擎） |
| 人工审批 | 异步 Handler | 审批任务、人员角色、审批队列 |
| 审批结果 | allow / deny | 多级审批、超时、撤销 |
| 执行取消 | AbortSignal | 分布式取消和执行状态跟踪 |
| 结果记录 | RuntimeMessage | 审计日志、业务操作记录 |
| 会话恢复 | 保存已结算消息 | 恢复未完成的审批与执行 |
| 业务安全 | Application Hook | API 鉴权、数据权限、幂等和风险控制 |

这里不建议继续给 Mini Runtime 增加功能。

对于以后选择的营销业务 Agent，我们完全可以保留这次的 `beforeToolCall` 机制，在业务 API 层补充服务端权限验证与幂等控制。

**核心原则：Runtime 不应该承担所有企业治理责任。**

## 6. 知识地图：Part VII-A～VII-I

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">Mini Agent Runtime v1 学习进度</text>
  {#each [
    ["A","基础类型与 ModelProvider"],
    ["B","RuntimeState + Agent Loop"],
    ["C","Tool Registry + Executor"],
    ["D","ContextBuilder + TurnSnapshot"],
    ["E","AgentEvent + Subscriber"],
    ["F","Abort + Single Active Run"],
    ["G","SessionStore + Recovery"],
    ["H","beforeToolCall + Approval"]
  ] as item}
    <row align="center" gap={3} key={item[0]}>
      <box background="surface-secondary" radius="md" size="36px" align="center" justify="center">
        <text weight="medium">{item[0]}</text>
      </box>
      <box flex="1">
        <text size="sm">{item[1]}</text>
      </box>
      <icon name="check-circle-2" color="success"/>
    </row>
  {/each}
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <box background="surface-secondary" radius="md" size="36px" align="center" justify="center">
      <text weight="medium">I</text>
    </box>
    <box flex="1" gap={1}>
      **Weather Agent 完整链路**
      <caption>下一 Milestone · 未开始</caption>
    </box>
    <icon name="circle" color="tertiary"/>
  </row>
</box>

从架构角度，可以将 A～H 分成五类：

| 架构能力 | 对应 Milestone | 回答的问题 |
|---|---|---|
| 模型交互 | A、D | 模型看到什么，如何生成请求？ |
| 执行引擎 | B、C | 谁管理循环，谁执行工具？ |
| 观察与控制 | E、F、H | 如何观察、取消和授权？ |
| 状态恢复 | G | 哪些事实可以跨进程保留？ |
| 完整业务闭环 | I | 如何将前面能力组合成真实 Agent？ |

现在我们已经有一个基本完整的 Runtime Core，但还缺少基于真实业务场景的端到端集成验证。

因此 VII-I 的目的并不是再补一个复杂抽象，而是验证 A～H 能否真正协同工作。

## 7. 面试视角：如何证明你理解了 Approval 架构？

这次可以沉淀五个很有技术深度的面试问题。

| 面试问题 | 核心回答 |
|---|---|
| 为什么 Agent 需要 beforeToolCall？ | LLM 只拥有调用意图，不能拥有最终执行授权；执行前必须存在可信控制边界 |
| 为什么 Hook 放在参数校验之后？ | 避免审批非法参数，并保持 ToolExecutor 对 Schema Validation 的所有权 |
| 为什么拒绝执行仍然生成 ToolResult？ | ToolCall 已成为历史事实，必须记录其最终结果才能保持消息协议完整 |
| Abort 时如何防止迟到批准触发工具？ | Executor 对等待进行唯一结算，取消后不再接受迟到决策，执行前再次检查 Signal |
| 为什么 SessionStore 不保存审批 Promise？ | Conversation Recovery 只恢复稳定消息，不等于恢复执行中的异步操作 |

更高级的追问可能是：

**既然你已经实现 Approval，为什么不直接增加 `RuntimeState.status = "waiting_approval"`？**

你应该能够回答：

因为当前 Runtime 不支持 Durable Execution，新增一个持久状态字段无法恢复原始 Promise、审批连接或执行上下文。它会带来更多状态同步和恢复问题，却不能解决真实的跨进程审批需求。

这是比“我写了一个审批弹窗”更有价值的架构理解。

## 8. 本节思考题

这三道题建议你先自己思考，不急着让 Codex 提供答案。

<box gap={3}>
  <box gap={1}>
    **思考题一：审批过的参数还能改变吗？**

    用户批准发放 100 元优惠券。审批完成后，系统的业务策略变了，现在最高只能发放 50 元。

    Executor 应该自动将 100 改成 50 再执行，还是拒绝这次操作？

    <text color="secondary" size="sm">考察：参数一致性、Validation、Authorization 的责任边界。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **思考题二：模型能否不断重试被拒绝的操作？**

    模型第一次请求发券，Hook 返回 deny。模型收到结果后，又提出同样的 ToolCall，但换了一个 ID。

    当前 Runtime 能否阻止再次请求人工审批？如果希望限制这种行为，应该由哪一层负责？

    <text color="secondary" size="sm">考察：ToolCall、Policy、Approval 与 Agent Loop 的边界。</text>
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **思考题三：用户批准后进程崩溃怎么办？**

    用户批准了发券操作，Tool 已经调用后端 API，但 Runtime 还没把 ToolResult 保存到 SQLite，进程就崩溃。

    下次恢复后，如何判断优惠券有没有真正发放？

    <text color="secondary" size="sm">考察：Conversation Recovery、Durable Execution 与业务幂等。</text>
  </box>
</box>

这三道题也可以作为以后《从零实现 Agent Runtime》的章节练习。

## 9. Pending 回收与下一阶段衔接

### 已经关闭的问题

H-Q01～H-Q06 均已形成架构决策，收敛为 H-DD01～H-DD10，并且完成了实现、测试和 Code Review。

| Pending | 最终处理 |
|---|---|
| Hook 应该放在哪层？ | Executor 校验后、执行前 |
| Hook 返回什么？ | allow / deny |
| Hook 需要知道人工审批流程吗？ | 不需要，由 Application 处理 |
| Hook Error 怎么处理？ | 专用安全失败 ToolResult |
| 等待期间如何 Abort？ | Executor 保证可中断 |
| 是否新增 Approval Event？ | 不新增 |
| 是否修改 SessionStore？ | 不修改 |
| 是否需要重构 VII-A～VII-G？ | 不需要 |

### 仍然延期的事项

Durable Approval、Durable Tool Execution、跨实例执行协调、审批审计、复杂权限策略以及外部副作用恢复，都不属于 VII-H。

此外，Node 20 的独立兼容性验证仍未完成；本轮实测环境为 Node 22。最终源码 ZIP 缺少 README 和 lockfile 的审查证据问题，也需要在归档中如实注明，但不构成功能 Must Fix。

### 收尾结论

**Part VII-H 的工程学习收尾至此完成。**

接下来只剩最后一步：让 Codex 基于本地真实仓库和学习材料，生成最终 Engineering Learning Log，并将 Day08 README 更新为：

- Part VII-H：Done
- Part VII-I：Next

完成文档归档后，我们才进入 VII-I。

---

# 下一步：交给 Codex 生成最终工程学习笔记

沿用 VII-G 的归档规范：**17 个固定章节 + 9 项学习收尾素材**，不要退化成普通课程总结。

下面是可直接交给 Codex 的最终提示词。

<WritingBlock id="74821" variant="document"># Part VII-H — Milestone Closure & Engineering Learning Log

当前 **Part VII-H：beforeToolCall + Simple Human Approval** 的 Architecture Analysis、Design Decision、Codex Implementation、Runtime Verification / Debug、ChatGPT Code Review + Theory Feedback 均已完成。

ChatGPT 最终 Code Review 结果为 **PASS，Must Fix 0**。

现在只执行 **Milestone Closure / Documentation Archiving**。

## 一、证据来源

请基于以下材料生成最终工程学习笔记：

1. 当前 `mini-agent-runtime` 仓库的真实源码、测试、Demo、README、package.json、package-lock.json 和工程配置。
2. 本次 Part VII-H 与 ChatGPT 的完整学习和架构讨论记录，包括 H-Q01～H-Q06、H-AD01～26 候选决策、最终 H-DD01～10 及 Code Review。
3. Codex 本轮实际的 Implementation、Runtime Verification、测试、Debug 和修复过程。
4. Part VII-G 最终 Engineering Learning Log，以及 Day08 的整体 README 与 Milestone 规划。

**证据优先级：真实代码与测试 → 实际运行日志 → 最终确认的架构决策 → 历史讨论。**

如果无法取得 ChatGPT 完整讨论记录，应明确说明缺失范围，不得根据摘要虚构逐轮对话。

不得将 ChatGPT 的静态 Review 记述为独立执行测试。

## 二、Milestone 工程事实

以下为已经报告的验证基线，请重新与工作区真实文件核对：

- VII-G 基线：176 项测试。
- VII-H 新增：53 项测试。
- 最终完整测试：229 passed，0 failed。
- npm run build：通过。
- npm run typecheck:tests：通过。
- demo:tools、demo:recovery、demo:approval：通过。
- Approval Demo 已验证 allow、deny 和人工 CLI 确认。
- 实测环境：Node.js v22.18.0。
- 未增加第三方依赖，未修改既有测试的原始预期。
- 实现阶段存在一次 Approval Demo TypeScript 构建错误，已修复。
- 本轮 ChatGPT Review：Must Fix 0，无需功能代码修复。

如果仓库内容与以上记录不一致，明确报告差异，不得自动改写历史事实。

## 三、固定文档结构

生成一份 **Engineering Learning Log + Architecture Record**。

必须完整保留以下 17 个一级章节：

1. Milestone Goal
2. Starting Point
3. Architecture Questions
4. Design Decisions
5. Why These Decisions
6. Implementation Scope
7. Code Changes
8. Runtime Verification
9. Bugs / Debugging
10. Code Review Findings
11. Theory Feedback
12. Pi Mapping
13. Architecture Decisions Added
14. Deferred Work
15. Final Architecture Snapshot
16. Core Knowledge Upgrade
17. Next Milestone

重点记录：

**设计是如何形成的，为什么选择这种方案，具体由哪段代码落实，又通过什么测试证明。**

不要只罗列概念和文件名。

## 四、Architecture Decisions 记录要求

保留候选 H-AD01～H-AD26 到最终 H-DD01～H-DD10 的收敛过程。

正式决策包括：

- H-DD01：Executor Validation 后的执行前门禁。
- H-DD02：Application 所有权及构造注入。
- H-DD03：异步 Hook + allow / deny 最终决策。
- H-DD04：参数引用隔离。
- H-DD05：Deny 转换成失败 ToolResult。
- H-DD06：Hook Error 安全归一化。
- H-DD07：可中断的 Approval 等待。
- H-DD08：Abort 归因与完整配对。
- H-DD09：原有 AgentEvent Contract 不变。
- H-DD10：Session / Conversation Recovery 不变。

必须说明每条决策的形成原因、替代方案、最终代码位置及测试证据。

不要把早期讨论中没有采纳的方案写成最终设计。

## 五、源码与验证要求

重点检查：

- `src/tools/before-tool-call.ts`
- `src/tools/tool-executor.ts`
- `src/runtime/agent-runtime.ts`
- `src/tools/tool.ts`
- `src/demo/approval-demo.ts`
- `test/before-tool-call.test.ts`
- `test/approval-run-control.test.ts`
- `test/approval-session-loop.test.ts`

同时检查相关的 AgentEvent、SessionStore、Conversation Validator、ContextBuilder。

验证记录必须区分：

- 实际运行过的测试和 Demo；
- 测试源码的静态分析；
- ChatGPT Code Review；
- 尚未验证的环境及限制。

完整解释 Approval 等待中的 First Accepted Settlement、迟到 Hook Result、AbortSignal 归因、参数复制和 ToolResult 完整配对。

## 六、固定九项学习素材

在第 16 章 Core Knowledge Upgrade 中，或者与相应章节建立明确对应，完整保留本轮九项学习收尾：

1. 学习计划与完成情况
2. 《从零实现 Agent Runtime》写书 TODO
3. 学习素材与真实工程证据
4. 核心认知升级
5. 工业级实现对照
6. Part VII-A～VII-H 架构知识地图
7. 面试视角
8. 思考题
9. Pending 回收与下一阶段衔接

不得因 17 章工程记录已经覆盖相关内容，就把九项学习素材省略。

## 七、Pi Mapping 要求

Pi Agent 的对照只允许引用已有 Part VI 源码学习资料中被验证过的事实。

重点对比：

- Tool Execution 控制边界。
- 执行前 Hook 与授权责任。
- Runtime Core 与 Harness / Application 的关系。
- Abort、Event 和工具结果回流。

如果缺少能够证明 Pi 具体机制的源码证据，明确标为未验证，不得推测 Pi 的官方实现。

不能将 Mini Runtime 自己设计的接口误写成 Pi 的原生机制。

## 八、归档任务

先检查现有 notes / Day08 的真实目录与命名规范，沿用 Part VII-G 的文件组织方式。

生成：

`day08-part-vii-h-before-tool-call-simple-approval.md`

并按既有 source/ 规则保存或更新可取得的架构讨论、Review、Codex 实现 / 测试 / Debug 证据记录。

注意：

- 不凭空构造 ChatGPT 消息或测试日志。
- 不保存 API Key、敏感令牌或真实凭证。
- Markdown 是唯一主版本。
- 不生成 PDF、DOCX。
- 不修改功能源码。
- 不新增工程功能。
- 不自动创建 Git Commit。

完成后更新 Day08 README：

- VII-H：Done。
- VII-I：Next。
- 同步 VII-H 学习笔记与 source 文件链接。
- 更新进度总览与最终测试基线。

保留 Part VII v1 固定 A～I 的规划，不扩展 VII-J 及后续 Milestone。

## 九、最终交付报告

完成文档归档后，请报告：

1. 新增与修改的文档文件。
2. 17 章是否全部完整。
3. H-DD01～10 是否有逐项代码和测试证据。
4. 九项学习素材是否完整保留。
5. Day08 README 是否同步。
6. 所有源码定位、相对链接是否有效。
7. 代码、测试、依赖、配置是否保持不变。
8. 仍缺少的资料或未验证事项。
9. 是否可以正式宣布 Part VII-H Closure 完成。

本轮只做 **VII-H Documentation Closure**，不提前实现 VII-I。</WritingBlock>

完成这份归档之后，Part VII 的进度就会来到 **8/9 个 Milestone 已完成**。

下一节 VII-I，我们将从单个 Runtime 能力的实现，转向真正的端到端 Agent 集成验证。这也是进入后续营销业务 Agent 实战之前，最后一次完整检验 Mini Runtime v1 架构的机会。

