# Day08 · Part VII-G Codex Implementation / Verification / Debug Source

> Source type: 工程证据整理，不是逐字 Codex 会话导出。
>
> 归档日期：2026-10-10；最终仓库基线：`9ec37d0 feat: add SQLite-backed conversation recovery`。
>
> 证据来源：当前源码和测试、完整 ChatGPT 记录中第 9 轮的 Codex 实现交付、第 10 轮的 Fix 交付、仍可读取的本轮最终测试日志。历史输出与本次文档校验分开记录；没有重新执行 Runtime 功能开发。

## 1. 实现起点与增量

VII-F 起点 75 项测试通过。先阅读 Runtime、Message、Provider、Tools、Context、Events、Abort、测试及 NodeNext / ESM 配置，再新增以下能力：

- [历史校验](../../../src/messages/validate-conversation.ts)：unknown 数据结构、JSON 数据和 ToolCall batch pairing。
- [构造时恢复](../../../src/runtime/agent-runtime.ts)：initialMessages 验证后 structuredClone；不改变消息唯一 mutation owner。
- [Store 契约](../../../src/session/session-store.ts)、[Memory](../../../src/session/memory-session-store.ts)、[SQLite](../../../src/session/sqlite-session-store.ts)：相同 snapshot、revision CAS、错误与引用隔离。
- [应用编排](../../../src/demo/conversation-workflow.ts)、[恢复 Demo](../../../src/demo/conversation-recovery-demo.ts)：Run 与 Persistence 独立结算，旧连接关闭后从同一 SQLite 文件加载，新 Runtime 继续对话。
- [配置](../../../package.json)、[lockfile](../../../package-lock.json)：固定 better-sqlite3 11.10.0，增加类型依赖、demo:recovery 与严格 typecheck:tests；Node >=20 不变。

依赖选型没有使用 Node 较新版本才有的 node:sqlite 作为唯一方案，也没有 ORM、执行锁、Queue 或 SessionManager。

## 2. 测试发展记录

| 阶段 | 结果 | 证据含义 |
| --- | --- | --- |
| VII-F 起点 | 75 pass | 既有行为基线 |
| VII-G 第一批新增测试 | 174 pass | 两种 Store、恢复、校验与双 Settlement 已覆盖 |
| 增加 symbol / accessor / 自定义数组属性检查 | 175 pass | 覆盖 JSON 会忽略或转换的对象形态 |
| 增加 completed 但含未配对 ToolCall 的历史检查 | 176 pass | Run 正常结束不等于快照可恢复 |
| MF-01 修复后 | 176 pass、0 fail、0 skipped | 修改已有断言，数量没有增加 |

这些阶段数字来自实施交付记录；不据此虚构“先出现失败测试，再修复 Runtime”的过程。后两项是覆盖完善。

关键测试文件：[Store contract](../../../test/session-store.test.ts)、[validation](../../../test/conversation-validation.test.ts)、[recovery](../../../test/runtime-recovery.test.ts)、[SQLite](../../../test/sqlite-persistence.test.ts)、[application settlement](../../../test/application-settlement.test.ts)、[fixtures](../../../test/support/conversation-fixtures.ts)。

## 3. MF-01：保存失败仍返回 reusable true

位置：`src/demo/conversation-workflow.ts` 的保存结算后返回值。

首轮代码在 save fulfilled / rejected 两个分支后均返回：

```ts
return { run, persistence, reusable: true };
```

首轮测试也接受这一结果。因此 176 项通过只能证明实现符合当时的断言，不能证明继续运行资格符合应用层契约。ChatGPT Review #1 从 CAS Conflict 后仍持有旧 expected revision 的场景发现唯一 Must Fix。

最小修复保留 run / persistence 对象和 error identity，仅改变最终布尔值：

```ts
return { run, persistence, reusable: persistence.status === "fulfilled" };
```

同时修改 helper 注释、README 和已有测试断言：

```ts
assert.equal(settlement.reusable, !saveFails);
assert.equal(settled.reusable, false); // CAS Conflict
assert.equal(settled.reusable, true);  // valid pre-aborted / skipped
```

四种 Run × Save 组合保留原始 Provider / Persistence Error；CAS 用例确认 Provider 两次、Tool 一次，原保存 Session 不变，Runtime 四条已提交消息不回滚。预取消用例同时验证新会话未创建、已有会话 revision 未增加。

修复期间曾发生一次编辑脚本编码错误：Python 提示 `SyntaxError: Non-UTF-8 code ... no encoding declared`，当次编辑未生效。补充 UTF-8 声明后重新执行并检查目标代码。这是脚本执行问题，不是 Runtime 逻辑 Bug。

Fix 交付核对了其他源码及 package / lockfile / tsconfig 的 hash 不变，未改变 VII-F 控制契约。最终 Review #2：MF-01 已修复、Must Fix 0、未发现 Scope Expansion。

## 4. 最终实际验证

以下为实现／Fix 阶段实际执行，文档 Closure 不把历史日志冒充本轮重跑结果。

| 命令 | 最终结果 |
| --- | --- |
| npm test | 176 pass、0 fail、0 skipped、0 cancelled、0 todo |
| npm run build | tsc -p tsconfig.json 成功 |
| npm run typecheck:tests | 严格检查 test/*.test.ts 与 test/support/*.ts 成功；新增测试均在这两个路径中 |
| npm run demo:runtime | 两轮 completed；真实 Provider 基于第一轮“我叫小明”回答姓名 |
| npm run demo:tools | deterministic Model → add(2, 3) → Model；结果 5 |
| npm run demo:recovery | deterministic mock Provider；SQLite 关闭／重开，第二次 request 含恢复历史，revision 1 → 2 |
| git diff --check | 通过 |

实际环境为 Node 22；尚未独立运行 Node 20 兼容性矩阵。ChatGPT 做静态 Code Review，没有独立执行 npm ci / npm test；两者的验证强度不可混写。

## 5. Review 材料的交付链边界

Codex Fix 报告提及完整源码／测试、README、package-lock.json、SHA256SUMS 的归档包。ChatGPT 实际收到并检查的 `source-review(20261010-075805).zip` 与 `source-review(20261010-081200).zip`，却未包含报告提及的 README / lockfile（第二份亦缺 SHA256SUMS）。这两个事实必须分别保留，不能把“报告生成完整包”改写成“ChatGPT 已核对全部文件”。

本次 Closure 已直接读取当前仓库 README 和 package-lock.json，并保留真实路径；没有取得分享页附件二进制，也没有补造过去上传包的校验结果。公开工具输出被 redacted 的部分仍只按占位归档。

## 6. 本次文档工作边界

只创建笔记／source 并同步 README。功能源码、测试、package.json、package-lock.json、tsconfig.json 逐文件 hash 与文档开始时一致；不提交 Git。

## 7. MF-01 修复后的完整 npm test 日志

保留可读取的 `/tmp/vii-g-review-1-test.log` 正文（规范化行尾空白），对应 Fix 最终验证。其临时路径仅说明证据来源；以下正文随 Markdown 归档长期保存。

<details>
<summary>展开 176 项测试执行日志</summary>

```text

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

TAP version 13
# Subtest: normal run emits the minimal lifecycle and its returned outcome
ok 1 - normal run emits the minimal lifecycle and its returned outcome
  ---
  duration_ms: 2.953583
  type: 'test'
  ...
# Subtest: tool loop events follow execution and completed events observe committed facts
ok 2 - tool loop events follow execution and completed events observe committed facts
  ---
  duration_ms: 14.053084
  type: 'test'
  ...
# Subtest: multiple tools emit sequential started/completed pairs in execution order
ok 3 - multiple tools emit sequential started/completed pairs in execution order
  ---
  duration_ms: 11.400958
  type: 'test'
  ...
# Subtest: tool error contract still completes the tool execution lifecycle
ok 4 - tool error contract still completes the tool execution lifecycle
  ---
  duration_ms: 1.033375
  type: 'test'
  ...
# Subtest: maxTurns writes skipped results without tool execution events
ok 5 - maxTurns writes skipped results without tool execution events
  ---
  duration_ms: 0.987375
  type: 'test'
  ...
# Subtest: each subscriber receives payloads isolated from runtime facts and other subscribers
ok 6 - each subscriber receives payloads isolated from runtime facts and other subscribers
  ---
  duration_ms: 54.880417
  type: 'test'
  ...
# Subtest: run_finished outcome payload is detached from the returned outcome
ok 7 - run_finished outcome payload is detached from the returned outcome
  ---
  duration_ms: 1.277875
  type: 'test'
  ...
# Subtest: subscriber failures do not affect the run or other subscribers
ok 8 - subscriber failures do not affect the run or other subscribers
  ---
  duration_ms: 0.50575
  type: 'test'
  ...
# Subtest: unsubscribe is idempotent and stops later notifications
ok 9 - unsubscribe is idempotent and stops later notifications
  ---
  duration_ms: 1.065417
  type: 'test'
  ...
# Subtest: provider errors propagate unchanged without run_finished
ok 10 - provider errors propagate unchanged without run_finished
  ---
  duration_ms: 1.224708
  type: 'test'
  ...
# Subtest: completes a normal answer and records runtime facts
ok 11 - completes a normal answer and records runtime facts
  ---
  duration_ms: 5.607791
  type: 'test'
  ...
# Subtest: retains conversation across two runs on the same runtime
ok 12 - retains conversation across two runs on the same runtime
  ---
  duration_ms: 0.893042
  type: 'test'
  ...
# Subtest: records missing tool failure and continues within the same run
ok 13 - records missing tool failure and continues within the same run
  ---
  duration_ms: 0.998583
  type: 'test'
  ...
# Subtest: preserves output for length without retry or continuation
ok 14 - preserves output for length without retry or continuation
  ---
  duration_ms: 0.25925
  type: 'test'
  ...
# Subtest: preserves output for unknown without retry or continuation
ok 15 - preserves output for unknown without retry or continuation
  ---
  duration_ms: 0.336208
  type: 'test'
  ...
# Subtest: propagates the original provider throw without retry
ok 16 - propagates the original provider throw without retry
  ---
  duration_ms: 0.407917
  type: 'test'
  ...
# Subtest: propagates the original provider reject without retry
ok 17 - propagates the original provider reject without retry
  ---
  duration_ms: 0.214375
  type: 'test'
  ...
# Subtest: history copies protect the array, messages, tool calls and nested arguments
ok 18 - history copies protect the array, messages, tool calls and nested arguments
  ---
  duration_ms: 0.325584
  type: 'test'
  ...
# Subtest: provider response and request references cannot mutate runtime facts
ok 19 - provider response and request references cannot mutate runtime facts
  ---
  duration_ms: 0.672375
  type: 'test'
  ...
# Subtest: dual settlement runFails=false, saveFails=false
ok 20 - dual settlement runFails=false, saveFails=false
  ---
  duration_ms: 3.353959
  type: 'test'
  ...
# Subtest: dual settlement runFails=false, saveFails=true
ok 21 - dual settlement runFails=false, saveFails=true
  ---
  duration_ms: 0.483541
  type: 'test'
  ...
# Subtest: dual settlement runFails=true, saveFails=false
ok 22 - dual settlement runFails=true, saveFails=false
  ---
  duration_ms: 0.231292
  type: 'test'
  ...
# Subtest: dual settlement runFails=true, saveFails=true
ok 23 - dual settlement runFails=true, saveFails=true
  ---
  duration_ms: 0.233083
  type: 'test'
  ...
# Subtest: incomplete history after run rejection is neither saved nor reused
ok 24 - incomplete history after run rejection is neither saved nor reused
  ---
  duration_ms: 17.691166
  type: 'test'
  ...
# Subtest: abort with complete cancelled results can be saved
ok 25 - abort with complete cancelled results can be saved
  ---
  duration_ms: 1.376583
  type: 'test'
  ...
# Subtest: pre-aborted run skips save (existing=false)
ok 26 - pre-aborted run skips save (existing=false)
  ---
  duration_ms: 0.320958
  type: 'test'
  ...
# Subtest: pre-aborted run skips save (existing=true)
ok 27 - pre-aborted run skips save (existing=true)
  ---
  duration_ms: 0.435292
  type: 'test'
  ...
# Subtest: CAS conflict never reruns provider or tool and retains runtime facts
ok 28 - CAS conflict never reruns provider or tool and retains runtime facts
  ---
  duration_ms: 10.126292
  type: 'test'
  ...
# Subtest: application awaits save settlement before starting the next run
ok 29 - application awaits save settlement before starting the next run
  ---
  duration_ms: 4.138291
  type: 'test'
  ...
# Subtest: settled length output is saveable when paired
ok 30 - settled length output is saveable when paired
  ---
  duration_ms: 0.287708
  type: 'test'
  ...
# Subtest: settled unknown output is saveable when paired
ok 31 - settled unknown output is saveable when paired
  ---
  duration_ms: 0.264291
  type: 'test'
  ...
# Subtest: settled tool_calls output is saveable when paired
ok 32 - settled tool_calls output is saveable when paired
  ---
  duration_ms: 0.202541
  type: 'test'
  ...
# Subtest: completed outcome is preserved even when its unpaired history cannot be saved
ok 33 - completed outcome is preserved even when its unpaired history cannot be saved
  ---
  duration_ms: 0.215
  type: 'test'
  ...
# Subtest: projects all message kinds in order, preserving optional fields and call/result pairing
ok 34 - projects all message kinds in order, preserving optional fields and call/result pairing
  ---
  duration_ms: 1.401167
  type: 'test'
  ...
# Subtest: snapshot array, messages, calls and nested arguments cannot mutate input history
ok 35 - snapshot array, messages, calls and nested arguments cannot mutate input history
  ---
  duration_ms: 0.19325
  type: 'test'
  ...
# Subtest: later input mutations and builds leave an earlier snapshot unchanged
ok 36 - later input mutations and builds leave an earlier snapshot unchanged
  ---
  duration_ms: 0.282833
  type: 'test'
  ...
# Subtest: snapshot tools match the registry and isolate definitions and nested schemas in both directions
ok 37 - snapshot tools match the registry and isolate definitions and nested schemas in both directions
  ---
  duration_ms: 0.548125
  type: 'test'
  ...
# Subtest: conversation accepts empty without mutation
ok 38 - conversation accepts empty without mutation
  ---
  duration_ms: 0.78325
  type: 'test'
  ...
# Subtest: conversation accepts normal user/model without mutation
ok 39 - conversation accepts normal user/model without mutation
  ---
  duration_ms: 0.294125
  type: 'test'
  ...
# Subtest: conversation accepts provider failure user only without mutation
ok 40 - conversation accepts provider failure user only without mutation
  ---
  duration_ms: 0.287375
  type: 'test'
  ...
# Subtest: conversation accepts consecutive users and empty model output without mutation
ok 41 - conversation accepts consecutive users and empty model output without mutation
  ---
  duration_ms: 0.385291
  type: 'test'
  ...
# Subtest: conversation accepts paired opaque non-JSON result without mutation
ok 42 - conversation accepts paired opaque non-JSON result without mutation
  ---
  duration_ms: 0.120875
  type: 'test'
  ...
# Subtest: conversation accepts multiple sequential calls without mutation
ok 43 - conversation accepts multiple sequential calls without mutation
  ---
  duration_ms: 0.084375
  type: 'test'
  ...
# Subtest: conversation accepts separate complete batches without mutation
ok 44 - conversation accepts separate complete batches without mutation
  ---
  duration_ms: 0.227583
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_CALL_CANCELLED without mutation
ok 45 - conversation accepts TOOL_CALL_CANCELLED without mutation
  ---
  duration_ms: 0.043166
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_EXECUTION_SKIPPED without mutation
ok 46 - conversation accepts TOOL_EXECUTION_SKIPPED without mutation
  ---
  duration_ms: 0.175625
  type: 'test'
  ...
# Subtest: conversation accepts TOOL_EXECUTION_FAILED without mutation
ok 47 - conversation accepts TOOL_EXECUTION_FAILED without mutation
  ---
  duration_ms: 0.611542
  type: 'test'
  ...
# Subtest: conversation rejects missing result as protocol error
ok 48 - conversation rejects missing result as protocol error
  ---
  duration_ms: 0.465208
  type: 'test'
  ...
# Subtest: conversation rejects duplicate result as protocol error
ok 49 - conversation rejects duplicate result as protocol error
  ---
  duration_ms: 0.137708
  type: 'test'
  ...
# Subtest: conversation rejects orphan result as protocol error
ok 50 - conversation rejects orphan result as protocol error
  ---
  duration_ms: 0.084667
  type: 'test'
  ...
# Subtest: conversation rejects duplicate ID in batch as protocol error
ok 51 - conversation rejects duplicate ID in batch as protocol error
  ---
  duration_ms: 0.10325
  type: 'test'
  ...
# Subtest: conversation rejects duplicate ID across batches as protocol error
ok 52 - conversation rejects duplicate ID across batches as protocol error
  ---
  duration_ms: 0.110125
  type: 'test'
  ...
# Subtest: conversation rejects interrupted batch as protocol error
ok 53 - conversation rejects interrupted batch as protocol error
  ---
  duration_ms: 1.78675
  type: 'test'
  ...
# Subtest: conversation rejects cross batch pairing as protocol error
ok 54 - conversation rejects cross batch pairing as protocol error
  ---
  duration_ms: 0.182416
  type: 'test'
  ...
# Subtest: conversation rejects wrong batch result as protocol error
ok 55 - conversation rejects wrong batch result as protocol error
  ---
  duration_ms: 0.100542
  type: 'test'
  ...
# Subtest: conversation rejects null history as structure error
ok 56 - conversation rejects null history as structure error
  ---
  duration_ms: 0.293167
  type: 'test'
  ...
# Subtest: conversation rejects object history as structure error
ok 57 - conversation rejects object history as structure error
  ---
  duration_ms: 0.056084
  type: 'test'
  ...
# Subtest: conversation rejects null message as structure error
ok 58 - conversation rejects null message as structure error
  ---
  duration_ms: 0.11075
  type: 'test'
  ...
# Subtest: conversation rejects unknown type as structure error
ok 59 - conversation rejects unknown type as structure error
  ---
  duration_ms: 0.076167
  type: 'test'
  ...
# Subtest: conversation rejects user missing content as structure error
ok 60 - conversation rejects user missing content as structure error
  ---
  duration_ms: 0.063916
  type: 'test'
  ...
# Subtest: conversation rejects user wrong content as structure error
ok 61 - conversation rejects user wrong content as structure error
  ---
  duration_ms: 0.058334
  type: 'test'
  ...
# Subtest: conversation rejects model wrong content as structure error
ok 62 - conversation rejects model wrong content as structure error
  ---
  duration_ms: 0.057917
  type: 'test'
  ...
# Subtest: conversation rejects model wrong calls as structure error
ok 63 - conversation rejects model wrong calls as structure error
  ---
  duration_ms: 0.056833
  type: 'test'
  ...
# Subtest: conversation rejects result wrong id as structure error
ok 64 - conversation rejects result wrong id as structure error
  ---
  duration_ms: 0.05925
  type: 'test'
  ...
# Subtest: conversation rejects result missing content as structure error
ok 65 - conversation rejects result missing content as structure error
  ---
  duration_ms: 0.063375
  type: 'test'
  ...
# Subtest: conversation rejects bad call 0 as structure error
ok 66 - conversation rejects bad call 0 as structure error
  ---
  duration_ms: 0.056458
  type: 'test'
  ...
# Subtest: conversation rejects bad call 1 as structure error
ok 67 - conversation rejects bad call 1 as structure error
  ---
  duration_ms: 0.0585
  type: 'test'
  ...
# Subtest: conversation rejects bad call 2 as structure error
ok 68 - conversation rejects bad call 2 as structure error
  ---
  duration_ms: 0.059708
  type: 'test'
  ...
# Subtest: conversation rejects bad call 3 as structure error
ok 69 - conversation rejects bad call 3 as structure error
  ---
  duration_ms: 0.06275
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 0 as structure error
ok 70 - conversation rejects non-JSON arguments 0 as structure error
  ---
  duration_ms: 0.068917
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 1 as structure error
ok 71 - conversation rejects non-JSON arguments 1 as structure error
  ---
  duration_ms: 0.066333
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 2 as structure error
ok 72 - conversation rejects non-JSON arguments 2 as structure error
  ---
  duration_ms: 0.067958
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 3 as structure error
ok 73 - conversation rejects non-JSON arguments 3 as structure error
  ---
  duration_ms: 0.064625
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 4 as structure error
ok 74 - conversation rejects non-JSON arguments 4 as structure error
  ---
  duration_ms: 0.125709
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 5 as structure error
ok 75 - conversation rejects non-JSON arguments 5 as structure error
  ---
  duration_ms: 0.07675
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 6 as structure error
ok 76 - conversation rejects non-JSON arguments 6 as structure error
  ---
  duration_ms: 0.068125
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 7 as structure error
ok 77 - conversation rejects non-JSON arguments 7 as structure error
  ---
  duration_ms: 0.067125
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 8 as structure error
ok 78 - conversation rejects non-JSON arguments 8 as structure error
  ---
  duration_ms: 0.085959
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 9 as structure error
ok 79 - conversation rejects non-JSON arguments 9 as structure error
  ---
  duration_ms: 0.092584
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 10 as structure error
ok 80 - conversation rejects non-JSON arguments 10 as structure error
  ---
  duration_ms: 0.086958
  type: 'test'
  ...
# Subtest: conversation rejects non-JSON arguments 11 as structure error
ok 81 - conversation rejects non-JSON arguments 11 as structure error
  ---
  duration_ms: 0.079959
  type: 'test'
  ...
# Subtest: conversation rejects symbol properties, accessors and custom array prototypes
ok 82 - conversation rejects symbol properties, accessors and custom array prototypes
  ---
  duration_ms: 0.433542
  type: 'test'
  ...
# Subtest: maps provider-neutral model messages to OpenAI chat messages
ok 83 - maps provider-neutral model messages to OpenAI chat messages
  ---
  duration_ms: 0.628375
  type: 'test'
  ...
# Subtest: maps provider-neutral tool definitions to OpenAI function tools
ok 84 - maps provider-neutral tool definitions to OpenAI function tools
  ---
  duration_ms: 0.18575
  type: 'test'
  ...
# Subtest: maps OpenAI assistant text to a Runtime assistant message
ok 85 - maps OpenAI assistant text to a Runtime assistant message
  ---
  duration_ms: 0.063666
  type: 'test'
  ...
# Subtest: maps an OpenAI function tool call and parses its arguments
ok 86 - maps an OpenAI function tool call and parses its arguments
  ---
  duration_ms: 0.11525
  type: 'test'
  ...
# Subtest: fails explicitly when OpenAI tool call arguments contain invalid JSON
ok 87 - fails explicitly when OpenAI tool call arguments contain invalid JSON
  ---
  duration_ms: 0.324291
  type: 'test'
  ...
# Subtest: maps known finish reasons and normalizes provider-specific reasons
ok 88 - maps known finish reasons and normalizes provider-specific reasons
  ---
  duration_ms: 0.07875
  type: 'test'
  ...
# Subtest: maps OpenAI usage to the Runtime usage model
ok 89 - maps OpenAI usage to the Runtime usage model
  ---
  duration_ms: 0.117542
  type: 'test'
  ...
# Subtest: maps a complete OpenAI response without leaking its raw shape
ok 90 - maps a complete OpenAI response without leaking its raw shape
  ---
  duration_ms: 0.071
  type: 'test'
  ...
# Subtest: a concurrent run fails before state, events, or provider work and leaves the first run intact
ok 91 - a concurrent run fails before state, events, or provider work and leaves the first run intact
  ---
  duration_ms: 6.005292
  type: 'test'
  ...
# Subtest: a subscriber reentrant run is rejected by the same active-run guard
ok 92 - a subscriber reentrant run is rejected by the same active-run guard
  ---
  duration_ms: 0.615083
  type: 'test'
  ...
# Subtest: pre-aborted runs have no state, provider, or event lifecycle
ok 93 - pre-aborted runs have no state, provider, or event lifecycle
  ---
  duration_ms: 0.253416
  type: 'test'
  ...
# Subtest: provider receives the same signal and an aborted returned response is not committed
ok 94 - provider receives the same signal and an aborted returned response is not committed
  ---
  duration_ms: 0.300458
  type: 'test'
  ...
# Subtest: provider rejection while the current signal is aborted settles the run as aborted
ok 95 - provider rejection while the current signal is aborted settles the run as aborted
  ---
  duration_ms: 0.268541
  type: 'test'
  ...
# Subtest: an unrelated provider rejection racing with abort preserves identity and releases ownership
ok 96 - an unrelated provider rejection racing with abort preserves identity and releases ownership
  ---
  duration_ms: 0.349583
  type: 'test'
  ...
# Subtest: an unrelated provider error preserves identity and releases ownership
ok 97 - an unrelated provider error preserves identity and releases ownership
  ---
  duration_ms: 0.232125
  type: 'test'
  ...
# Subtest: abort before tool start pairs every call without tool execution events
ok 98 - abort before tool start pairs every call without tool execution events
  ---
  duration_ms: 0.310542
  type: 'test'
  ...
# Subtest: ToolExecutor passes the same signal and separates cooperative cancellation from normal failure
ok 99 - ToolExecutor passes the same signal and separates cooperative cancellation from normal failure
  ---
  duration_ms: 30.559167
  type: 'test'
  ...
# Subtest: an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED
ok 100 - an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED
  ---
  duration_ms: 12.257625
  type: 'test'
  ...
# Subtest: abort during a tool writes cancellation pairing without a completed event
ok 101 - abort during a tool writes cancellation pairing without a completed event
  ---
  duration_ms: 10.6655
  type: 'test'
  ...
# Subtest: a successful tool result commits before late abort stops the next model turn
ok 102 - a successful tool result commits before late abort stops the next model turn
  ---
  duration_ms: 4.945708
  type: 'test'
  ...
# Subtest: multiple tools preserve A, cancel B and C, and never execute C
ok 103 - multiple tools preserve A, cancel B and C, and never execute C
  ---
  duration_ms: 3.614333
  type: 'test'
  ...
# Subtest: normal, unsupported, limit and aborted outcomes all release active ownership
ok 104 - normal, unsupported, limit and aborted outcomes all release active ownership
  ---
  duration_ms: 0.849917
  type: 'test'
  ...
# Subtest: cancellation takes priority over maxTurns pairing
ok 105 - cancellation takes priority over maxTurns pairing
  ---
  duration_ms: 0.209375
  type: 'test'
  ...
# Subtest: constructor recovery is detached and does not call provider, tools or events
ok 106 - constructor recovery is detached and does not call provider, tools or events
  ---
  duration_ms: 5.597917
  type: 'test'
  ...
# Subtest: next model request includes recovered history and only new tool calls execute
ok 107 - next model request includes recovered history and only new tool calls execute
  ---
  duration_ms: 19.565
  type: 'test'
  ...
# Subtest: historical tools need not be registered and are never replayed
ok 108 - historical tools need not be registered and are never replayed
  ---
  duration_ms: 0.409542
  type: 'test'
  ...
# Subtest: invalid initialMessages fail during construction before provider work
ok 109 - invalid initialMessages fail during construction before provider work
  ---
  duration_ms: 0.361875
  type: 'test'
  ...
# Subtest: recovered runtime preserves pre-abort and cooperative provider abort provenance
ok 110 - recovered runtime preserves pre-abort and cooperative provider abort provenance
  ---
  duration_ms: 1.679166
  type: 'test'
  ...
# Subtest: recovered runtime preserves tool cancellation pairing
ok 111 - recovered runtime preserves tool cancellation pairing
  ---
  duration_ms: 0.313416
  type: 'test'
  ...
# Subtest: recovered runtime still owns exactly one active run
ok 112 - recovered runtime still owns exactly one active run
  ---
  duration_ms: 0.419417
  type: 'test'
  ...
# Subtest: memory: missing session returns null
ok 113 - memory: missing session returns null
  ---
  duration_ms: 1.160792
  type: 'test'
  ...
# Subtest: memory: revision zero creates revision one
ok 114 - memory: revision zero creates revision one
  ---
  duration_ms: 1.550375
  type: 'test'
  ...
# Subtest: memory: duplicate create conflicts without changing history
ok 115 - memory: duplicate create conflicts without changing history
  ---
  duration_ms: 0.80175
  type: 'test'
  ...
# Subtest: memory: current revision updates and stale revision conflicts
ok 116 - memory: current revision updates and stale revision conflicts
  ---
  duration_ms: 0.44
  type: 'test'
  ...
# Subtest: memory: updating a missing session does not create it
ok 117 - memory: updating a missing session does not create it
  ---
  duration_ms: 1.881667
  type: 'test'
  ...
# Subtest: memory: invalid session ids and revisions rejected
ok 118 - memory: invalid session ids and revisions rejected
  ---
  duration_ms: 0.839917
  type: 'test'
  ...
# Subtest: memory: invalid structure and pairing cannot overwrite valid snapshot
ok 119 - memory: invalid structure and pairing cannot overwrite valid snapshot
  ---
  duration_ms: 0.780334
  type: 'test'
  ...
# Subtest: memory: load and save deeply isolate both directions
ok 120 - memory: load and save deeply isolate both directions
  ---
  duration_ms: 0.485292
  type: 'test'
  ...
# Subtest: memory: safe revision extremes cannot bypass CAS or overflow
ok 121 - memory: safe revision extremes cannot bypass CAS or overflow
  ---
  duration_ms: 0.938
  type: 'test'
  ...
# Subtest: memory: simultaneous writers have exactly one winner
ok 122 - memory: simultaneous writers have exactly one winner
  ---
  duration_ms: 1.05825
  type: 'test'
  ...
# Subtest: sqlite: missing session returns null
ok 123 - sqlite: missing session returns null
  ---
  duration_ms: 7.128083
  type: 'test'
  ...
# Subtest: sqlite: revision zero creates revision one
ok 124 - sqlite: revision zero creates revision one
  ---
  duration_ms: 2.159291
  type: 'test'
  ...
# Subtest: sqlite: duplicate create conflicts without changing history
ok 125 - sqlite: duplicate create conflicts without changing history
  ---
  duration_ms: 1.966875
  type: 'test'
  ...
# Subtest: sqlite: current revision updates and stale revision conflicts
ok 126 - sqlite: current revision updates and stale revision conflicts
  ---
  duration_ms: 2.025833
  type: 'test'
  ...
# Subtest: sqlite: updating a missing session does not create it
ok 127 - sqlite: updating a missing session does not create it
  ---
  duration_ms: 2.042625
  type: 'test'
  ...
# Subtest: sqlite: invalid session ids and revisions rejected
ok 128 - sqlite: invalid session ids and revisions rejected
  ---
  duration_ms: 1.691208
  type: 'test'
  ...
# Subtest: sqlite: invalid structure and pairing cannot overwrite valid snapshot
ok 129 - sqlite: invalid structure and pairing cannot overwrite valid snapshot
  ---
  duration_ms: 1.668583
  type: 'test'
  ...
# Subtest: sqlite: load and save deeply isolate both directions
ok 130 - sqlite: load and save deeply isolate both directions
  ---
  duration_ms: 1.021292
  type: 'test'
  ...
# Subtest: sqlite: safe revision extremes cannot bypass CAS or overflow
ok 131 - sqlite: safe revision extremes cannot bypass CAS or overflow
  ---
  duration_ms: 1.595792
  type: 'test'
  ...
# Subtest: sqlite: simultaneous writers have exactly one winner
ok 132 - sqlite: simultaneous writers have exactly one winner
  ---
  duration_ms: 1.381125
  type: 'test'
  ...
# Subtest: SQLite close/reopen recovers into a new runtime and increments revision
ok 133 - SQLite close/reopen recovers into a new runtime and increments revision
  ---
  duration_ms: 7.361584
  type: 'test'
  ...
# Subtest: independent SQLite connections cannot overwrite the same old revision
ok 134 - independent SQLite connections cannot overwrite the same old revision
  ---
  duration_ms: 1.768958
  type: 'test'
  ...
# Subtest: SQLite revisions reach the maximum safely and cannot overflow
ok 135 - SQLite revisions reach the maximum safely and cannot overflow
  ---
  duration_ms: 1.414
  type: 'test'
  ...
# Subtest: SQLite load rejects malformed JSON instead of returning null or conflict
ok 136 - SQLite load rejects malformed JSON instead of returning null or conflict
  ---
  duration_ms: 1.184875
  type: 'test'
  ...
# Subtest: SQLite load rejects bad structure instead of returning null or conflict
ok 137 - SQLite load rejects bad structure instead of returning null or conflict
  ---
  duration_ms: 1.357084
  type: 'test'
  ...
# Subtest: SQLite load rejects incomplete batch instead of returning null or conflict
ok 138 - SQLite load rejects incomplete batch instead of returning null or conflict
  ---
  duration_ms: 1.175792
  type: 'test'
  ...
# Subtest: SQLite load rejects wrong JSON root instead of returning null or conflict
ok 139 - SQLite load rejects wrong JSON root instead of returning null or conflict
  ---
  duration_ms: 0.933291
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 0
ok 140 - SQLite load rejects damaged revision 0
  ---
  duration_ms: 1.160042
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision -1
ok 141 - SQLite load rejects damaged revision -1
  ---
  duration_ms: 1.170834
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 9007199254740992
ok 142 - SQLite load rejects damaged revision 9007199254740992
  ---
  duration_ms: 1.2505
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 9223372036854775807
ok 143 - SQLite load rejects damaged revision 9223372036854775807
  ---
  duration_ms: 1.1435
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision 1.5
ok 144 - SQLite load rejects damaged revision 1.5
  ---
  duration_ms: 1.464
  type: 'test'
  ...
# Subtest: SQLite load rejects damaged revision bad
ok 145 - SQLite load rejects damaged revision bad
  ---
  duration_ms: 1.114
  type: 'test'
  ...
# Subtest: SQLite operational and constraint errors retain their own error identity
ok 146 - SQLite operational and constraint errors retain their own error identity
  ---
  duration_ms: 1.687833
  type: 'test'
  ...
# Subtest: SQLite cannot-open IO error and corrupt file error are not conflicts
ok 147 - SQLite cannot-open IO error and corrupt file error are not conflicts
  ---
  duration_ms: 0.421208
  type: 'test'
  ...
# Subtest: happy path uses registry definitions and result in the second turn of one run
ok 148 - happy path uses registry definitions and result in the second turn of one run
  ---
  duration_ms: 14.754333
  type: 'test'
  ...
# Subtest: each turn gets independent complete context from the latest facts and definitions
ok 149 - each turn gets independent complete context from the latest facts and definitions
  ---
  duration_ms: 6.834083
  type: 'test'
  ...
# Subtest: invalid arguments null never invoke execute and allow continuation
ok 150 - invalid arguments null never invoke execute and allow continuation
  ---
  duration_ms: 5.9235
  type: 'test'
  ...
# Subtest: invalid arguments [] never invoke execute and allow continuation
ok 151 - invalid arguments [] never invoke execute and allow continuation
  ---
  duration_ms: 8.990583
  type: 'test'
  ...
# Subtest: invalid arguments "bad" never invoke execute and allow continuation
ok 152 - invalid arguments "bad" never invoke execute and allow continuation
  ---
  duration_ms: 22.860375
  type: 'test'
  ...
# Subtest: invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
ok 153 - invalid arguments {"a":"2","b":3} never invoke execute and allow continuation
  ---
  duration_ms: 14.150625
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2} never invoke execute and allow continuation
ok 154 - invalid arguments {"a":2} never invoke execute and allow continuation
  ---
  duration_ms: 9.54875
  type: 'test'
  ...
# Subtest: invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
ok 155 - invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation
  ---
  duration_ms: 8.628875
  type: 'test'
  ...
# Subtest: tool throw becomes an execution failure visible to the next model turn
ok 156 - tool throw becomes an execution failure visible to the next model turn
  ---
  duration_ms: 7.227708
  type: 'test'
  ...
# Subtest: tool reject becomes an execution failure visible to the next model turn
ok 157 - tool reject becomes an execution failure visible to the next model turn
  ---
  duration_ms: 5.213167
  type: 'test'
  ...
# Subtest: tool non-error becomes an execution failure visible to the next model turn
ok 158 - tool non-error becomes an execution failure visible to the next model turn
  ---
  duration_ms: 3.68275
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=false)
ok 159 - multiple calls finish sequentially before the next turn (mixed=false)
  ---
  duration_ms: 8.924292
  type: 'test'
  ...
# Subtest: multiple calls finish sequentially before the next turn (mixed=true)
ok 160 - multiple calls finish sequentially before the next turn (mixed=true)
  ---
  duration_ms: 10.631625
  type: 'test'
  ...
# Subtest: maxTurns=1 counts model turns, skips final tools and resets per run
ok 161 - maxTurns=1 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 1.004416
  type: 'test'
  ...
# Subtest: maxTurns=3 counts model turns, skips final tools and resets per run
ok 162 - maxTurns=3 counts model turns, skips final tools and resets per run
  ---
  duration_ms: 7.7085
  type: 'test'
  ...
# Subtest: maxTurns=default counts model turns, skips final tools and resets per run
ok 163 - maxTurns=default counts model turns, skips final tools and resets per run
  ---
  duration_ms: 5.765542
  type: 'test'
  ...
# Subtest: a run after limit_reached receives paired skipped results before the new user input
ok 164 - a run after limit_reached receives paired skipped results before the new user input
  ---
  duration_ms: 0.327167
  type: 'test'
  ...
# Subtest: stop on the last allowed turn still completes
ok 165 - stop on the last allowed turn still completes
  ---
  duration_ms: 0.191792
  type: 'test'
  ...
# Subtest: invalid maxTurns fails at construction
ok 166 - invalid maxTurns fails at construction
  ---
  duration_ms: 0.488666
  type: 'test'
  ...
# Subtest: provider failure after tool execution propagates the same error and preserves facts
ok 167 - provider failure after tool execution propagates the same error and preserves facts
  ---
  duration_ms: 4.048458
  type: 'test'
  ...
# Subtest: tool argument and result references cannot mutate history
ok 168 - tool argument and result references cannot mutate history
  ---
  duration_ms: 2.625084
  type: 'test'
  ...
# Subtest: registry rejects duplicates, preserves order and isolates schema references
ok 169 - registry rejects duplicates, preserves order and isolates schema references
  ---
  duration_ms: 3.213834
  type: 'test'
  ...
# Subtest: provider cannot change the schema used for tool validation
ok 170 - provider cannot change the schema used for tool validation
  ---
  duration_ms: 2.895125
  type: 'test'
  ...
# Subtest: invalid schema and async schema are configuration bugs, not invocation failures
ok 171 - invalid schema and async schema are configuration bugs, not invocation failures
  ---
  duration_ms: 5.881625
  type: 'test'
  ...
# Subtest: lookup bugs propagate unchanged
ok 172 - lookup bugs propagate unchanged
  ---
  duration_ms: 0.240208
  type: 'test'
  ...
# Subtest: result serialization bugs propagate outside the execute catch boundary
ok 173 - result serialization bugs propagate outside the execute catch boundary
  ---
  duration_ms: 2.6145
  type: 'test'
  ...
# Subtest: tool_calls without calls is an invariant violation
ok 174 - tool_calls without calls is an invariant violation
  ---
  duration_ms: 0.17875
  type: 'test'
  ...
# Subtest: malformed tool_calls (missing) still throws on the final turn
ok 175 - malformed tool_calls (missing) still throws on the final turn
  ---
  duration_ms: 0.173042
  type: 'test'
  ...
# Subtest: malformed tool_calls (empty) still throws on the final turn
ok 176 - malformed tool_calls (empty) still throws on the final turn
  ---
  duration_ms: 0.116083
  type: 'test'
  ...
1..176
# tests 176
# suites 0
# pass 176
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 591.902375
```

</details>
