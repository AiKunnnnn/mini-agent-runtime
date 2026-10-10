# Day08 · Part VII-G Review and Closure — Full ChatGPT Source

> Source type: Full public conversation transcript（公开分享页可用正文）
> Public share / backing conversation ID: `6ac9f5ba-8b58-83ee-84e7-33d63760a502`
> Conversation title: Part VII-G
> Public source: https://chatgpt.com/share/6ac9f5ba-8b58-83ee-84e7-33d63760a502
> Retrieval date: 2026-10-10
> Retrieval: 优先尝试 Codex read_thread；关联会话所在 durable host 不可用。改从用户指定的公开分享页 HTML 解码页面自身的 conversation mapping，并从 current_node 沿 parent 重建完整当前分支。
> Completeness: mapping 146 节点，当前分支 146 节点，14 个 user turn；已核对节点集合相同，无遗漏的旁支。本组两份 source 合计保留全部非空 user / assistant text、公开的 code 工具请求和 tool text；不截断长回复。
> Normalization: 仅规范化行尾空白；保留原始正文、分段输出与完整回复之间的重复、GenUI / WritingBlock 标记及历史候选代码。它们不表示仓库当前接口。
> Exclusions: 不归档 system / private reasoning；redacted tool output 只保留公开的 redacted 占位，不冒充实际检查输出。上传附件名称不等于附件二进制。
> Attachments named in this conversation: source-review(10).zip、README(7).md、day08-part-vii-f-abort-single-active-run(1).md、source-review(20261010-075805).zip、source-review(20261010-081200).zip。分享页不提供这些附件的二进制；本次没有重新取得这些二进制。

> Scope: 全局第 9～14 轮：Implementation Report → Review #1 / MF-01 → Fix Report → Review #2 → 固定 9 项学习收尾 → 固定 17 章文档任务。


## Turn 9


### User

> Message ID: `f10338d7-05c8-4d07-9971-393c14a3d1e9`; content: `text`; channel: `None`; recipient: `all`

Codex 已经完成当前 Part 的第一轮实现。



下面是 Codex 的实现总结、修改文件、测试结果以及关键代码 / 文件。



现在请进入：



**Runtime Verification + Code Review + Theory Feedback**



请不要默认“测试通过 = 架构正确”。



重点帮我检查：



- 是否真正遵守了我们之前确认的 Design Decisions；
- 是否出现了 Codex 擅自扩大 Scope 或提前实现后续能力；
- State ownership、模块职责和依赖方向是否合理；
- Public Contract 是否出现不必要的设计；
- Error / lifecycle / termination 等边界是否存在问题；
- 测试是否只是覆盖 happy path；
- 是否出现为了未来扩展而过度设计；
- 与我们之前学习的 Agent Runtime 理论及 Pi 源码设计相比，有哪些值得重新理解的点。
  - \


如果发现问题，请区分：



1. 必须修复；
2. 建议优化；
3. 当前可以接受、以后再处理。
   1. \


最后判断当前 Milestone 是否已经满足 Done 条件；如果没有，请再输出一份最小范围的 Codex Fix Task。

# 修改总结：

### A. Implementation Summary

已实现 VII-G 的 Conversation Persistence & Recovery：

- Memory / SQLite SessionStore，统一 revision CAS。
- `initialMessages` 构造时恢复，严格校验并深拷贝。
- 共享 Conversation Validator，拒绝结构损坏和不完整 ToolCall 协议。
- 应用层独立记录 Run 与 Persistence settlement。
- 确定性 Recovery Demo，展示 SQLite 关闭重开后的继续对话。

最终 **176 个测试通过，0 失败**；原有 75 个测试全部保留并通过。

### B. Modified Files

| 文件                                                                                                               | 职责与修改原因                                                     |
| ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [agent-runtime.ts](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts)                        | 增加 `initialMessages`，构造时验证并深拷贝；未修改 Run Loop                 |
| [validate-conversation.ts](/Users/shengq/Desktop/mini-agent-runtime/src/messages/validate-conversation.ts)       | 校验 unknown 消息、JSON 参数和完整批次配对；区分 structure / protocol 错误     |
| [session-store.ts](/Users/shengq/Desktop/mini-agent-runtime/src/session/session-store.ts)                        | 定义 Snapshot、Store、Conflict Error，以及 ID、revision、Snapshot 校验 |
| [memory-session-store.ts](/Users/shengq/Desktop/mini-agent-runtime/src/session/memory-session-store.ts)          | 同步临界操作中的 CAS、深拷贝隔离                                          |
| [sqlite-session-store.ts](/Users/shengq/Desktop/mini-agent-runtime/src/session/sqlite-session-store.ts)          | 文件持久化、原子条件写入、读取校验和 `close()`                                |
| [conversation-workflow.ts](/Users/shengq/Desktop/mini-agent-runtime/src/demo/conversation-workflow.ts)           | Demo 层 Run → Validate → Save 编排，保留独立结算结果                    |
| [conversation-recovery-demo.ts](/Users/shengq/Desktop/mini-agent-runtime/src/demo/conversation-recovery-demo.ts) | 确定性模型替代，演示首次保存、关闭重开、恢复和再次保存                                 |
| [session-store.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/session-store.test.ts)                     | 两个 Store 复用核心契约测试                                           |
| [conversation-validation.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/conversation-validation.test.ts) | 合法形态、损坏结构、配对错误及输入不变性                                        |
| [runtime-recovery.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/runtime-recovery.test.ts)               | 恢复隔离、模型上下文、无重放、Abort 和 Single Active Run                    |
| [sqlite-persistence.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/sqlite-persistence.test.ts)           | 关闭重开、独立连接冲突、revision 极值、损坏与数据库错误                            |
| [application-settlement.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/application-settlement.test.ts)   | 双重失败、非法历史停止复用、跳过写入、顺序流程及不重试                                 |
| [conversation-fixtures.ts](/Users/shengq/Desktop/mini-agent-runtime/test/support/conversation-fixtures.ts)       | 新测试共享消息和响应样本                                                |
| [package.json](/Users/shengq/Desktop/mini-agent-runtime/package.json)                                            | SQLite 依赖、Recovery Demo 和严格测试类型检查命令                         |
| [package-lock.json](/Users/shengq/Desktop/mini-agent-runtime/package-lock.json)                                  | 锁定依赖                                                        |
| [README.md](/Users/shengq/Desktop/mini-agent-runtime/README.md)                                                  | 说明真实接口、CAS、恢复流程、错误语义和阶段边界                                   |

### C. Architecture Compliance

| 决策        | 落实与证据                                                 |
| --------- | ----------------------------------------------------- |
| G-AD01    | 仅在 Run settle 后保存完整历史；见应用层示例                          |
| G-AD02    | Application 编排；Runtime 无 Store 依赖，Store 无 Runtime 依赖  |
| G-AD03～06 | Store 仅提供 load/save；不存在返回 null，失败抛错，冲突显式报告            |
| G-AD07    | 仅构造时恢复；先验证再深拷贝，无模型、Tool 或恢复事件                         |
| G-AD08    | revision 0 创建、成功递增、安全整数和溢出检查                          |
| G-AD09    | 两种 Store；SQLite 使用单条条件写入实现原子 CAS                      |
| G-AD10    | 正常结算和 Provider Error 后的合法历史均可保存；无新增消息跳过写入             |
| G-AD11    | 校验真实字段、全局调用 ID 唯一性和完整连续批次；不解析结果业务内容                   |
| G-AD12～13 | 原始 Run Error 与 Persistence Error 分别保留；不转换 outcome 或重跑 |
| G-AD14    | 冲突不覆盖持久化历史、不回滚 Runtime 事实                             |
| G-AD15    | 示例顺序 await 保存结算后再开始下一轮；未扩大 Runtime Active ownership   |
| G-AD16    | 非法历史不保存、不修补，返回 `reusable: false`；再次编排前拒绝复用            |
| G-AD17    | 仅结构、JSON 可持久化性和 Conversation 协议校验                     |
| G-AD18    | 首轮结算后首次保存；恢复时明确要求 Session 存在                          |
| G-AD19    | 共享校验规则、CAS、Conflict Error 和引用隔离测试                     |
| G-AD20    | 非法 Snapshot 在写入前拒绝，最后有效版本保持不变                         |

`RuntimeState` 仍然只有 messages，AgentRuntime 仍是其唯一 mutation owner。ContextBuilder、Provider、Tool Error、Abort 和 AgentEvent 契约未改动。

### D. Public Contract
```
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(sessionId: string): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
}

interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
}
```

另提供：
```
validateConversation(
  messages: unknown
): asserts messages is RuntimeMessage[];

validateSessionSnapshot(
  snapshot: unknown
): asserts snapshot is SessionSnapshot;
```

- `SessionConflictError` 包含 `sessionId`、`expectedRevision`。
- `ConversationValidationError.kind` 为 `"structure" | "protocol"`。
- `SQLiteSessionStore(filename: string)` 提供 `close(): void`。
- save 输入 revision 是 expected revision；load/save 返回 revision 是已提交版本。
- `run()`、`getMessages()` 的既有接口保持原样。

### E. Persistence Semantics

SQLite 使用唯一 `session_id` 主键：

- **创建**：`INSERT … ON CONFLICT(session_id) DO NOTHING RETURNING revision`。
- **更新**：`UPDATE … WHERE session_id = ? AND revision = ? RETURNING revision`。
- 每条写入语句由 SQLite 原子执行，没有独立 SELECT 后无条件 UPDATE 的窗口。
- 无返回行才抛 `SessionConflictError`；其他数据库错误原样传播。
- 成功返回数据库实际生成的 revision。
- load 使用 BigInt 读取 revision，验证范围后才转为 number，防止不安全整数舍入。
- 两个 Store 均隔离输入、保存返回值和加载返回值。

依赖固定为 `better-sqlite3@11.10.0`，未修改 Node engines；该版本的[官方构建配置](https://github.com/WiseLibs/better-sqlite3/blob/v11.10.0/.github/workflows/build.yml)包含 Node 20 测试及预编译构建。

### F. Runtime Verification

实际验证环境：Node.js **v22.18.0**。

| 命令                        | 结果                                     |
| ------------------------- | -------------------------------------- |
| `npm test`                | **176 通过，0 失败、0 skipped**；新增 101 个     |
| `npm run build`           | 通过                                     |
| `npm run typecheck:tests` | 通过；覆盖全部当前测试和 support 文件                |
| `npm run demo:runtime`    | 通过；真实 Provider 两轮均 completed，第二轮回答“小明” |
| `npm run demo:tools`      | 通过；Model → add → Model，结果 5            |
| `npm run demo:recovery`   | 通过；关闭重开数据库，模型收到恢复历史，revision 1 → 2     |
| `git diff --check`        | 通过                                     |

另检查了全部 12 个新增文件的 whitespace，无错误。

### G. Error and Recovery Cases

| 情况                           | 行为                                             |
| ---------------------------- | ---------------------------------------------- |
| Provider Error               | 保留原始错误；合法 user_input 历史仍可保存                    |
| Persistence Error            | 独立保留；不覆盖 Run settlement、不修改 RuntimeState       |
| CAS Conflict                 | 保留原持久化版本；不重跑 Provider/Tool、不合并、不重试             |
| Invalid Snapshot             | 写入前拒绝；构造恢复时在状态注入前拒绝                            |
| Incomplete ToolCall History  | 拒绝保存和恢复；应用层停止复用，不补结果或重放                        |
| Abort / Cancelled ToolResult | 完整 cancelled pairing 可保存；无新增消息的 pre-abort 跳过写入 |

还验证了：即使 Run 返回 completed，若其历史包含未配对调用，仍拒绝保存，同时保留 completed 的原始结算结果。

### H. Scope Review

未引入未确认能力：没有 SessionManager、Queue、执行锁、自动重试、Conversation Merge、Durable Execution、Streaming 或后续 VII-H / VII-I 能力。

未生成 Closure Note，未创建 Git 提交。

### I. Remaining Limitations

- 仅恢复已成功保存的 Conversation；不恢复执行中的 Loop、Promise、Tool 或 HTTP 请求。
- Application 负责同一 Session 的顺序流程；CAS 仅检测保存冲突。
- ToolCall ID 必须在完整历史中唯一；重复 ID 的历史会被拒绝保存，Runtime 事实仍保留。
- SQLite 使用同步原生依赖，需要匹配 Node ABI 的预编译包或本机编译环境。
- 本次实际运行验证使用 Node 22；未在本机另行执行 Node 20 测试。
- Milestone Closure 留待独立 Runtime Verification、Code Review 和 Theory Feedback。



# 测试结果：

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
]

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
&#x20;   "outputTokens": 159,\
&#x20;   "totalTokens": 171\
&#x20; }\
}

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
History: user_input -> model_output -> tool_result -> model_output



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
&#x20;     sessionId: '6c996174-95cd-4623-b68d-a61f36464319',\
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
&#x20;     sessionId: '6c996174-95cd-4623-b68d-a61f36464319',\
&#x20;     revision: 2,\
&#x20;     messages: [Array]\
&#x20;   }\
&#x20; },\
&#x20; reusable: true\
}



➜  mini-agent-runtime git:(main) ✗ npm run test\
\
\> mini-agent-runtime@0.1.0 test\
\> tsx --test test/\*\*/\*.test.ts\
\
✔ normal run emits the minimal lifecycle and its returned outcome (2.891917ms)\
✔ tool loop events follow execution and completed events observe committed facts (24.96975ms)\
✔ multiple tools emit sequential started/completed pairs in execution order (8.615791ms)\
✔ tool error contract still completes the tool execution lifecycle (0.322458ms)\
✔ maxTurns writes skipped results without tool execution events (0.288042ms)\
✔ each subscriber receives payloads isolated from runtime facts and other subscribers (39.315375ms)\
✔ run_finished outcome payload is detached from the returned outcome (0.937042ms)\
✔ subscriber failures do not affect the run or other subscribers (0.512333ms)\
✔ unsubscribe is idempotent and stops later notifications (1.14425ms)\
✔ provider errors propagate unchanged without run_finished (1.339792ms)\
✔ completes a normal answer and records runtime facts (3.213458ms)\
✔ retains conversation across two runs on the same runtime (0.461625ms)\
✔ records missing tool failure and continues within the same run (0.381708ms)\
✔ preserves output for length without retry or continuation (0.184667ms)\
✔ preserves output for unknown without retry or continuation (0.303166ms)\
✔ propagates the original provider throw without retry (0.369166ms)\
✔ propagates the original provider reject without retry (0.210959ms)\
✔ history copies protect the array, messages, tool calls and nested arguments (0.308458ms)\
✔ provider response and request references cannot mutate runtime facts (0.675166ms)\
✔ dual settlement runFails=false, saveFails=false (5.102417ms)\
✔ dual settlement runFails=false, saveFails=true (0.500208ms)\
✔ dual settlement runFails=true, saveFails=false (0.225666ms)\
✔ dual settlement runFails=true, saveFails=true (0.221ms)\
✔ incomplete history after run rejection is neither saved nor reused (11.627167ms)\
✔ abort with complete cancelled results can be saved (0.532125ms)\
✔ pre-aborted run skips save (existing=false) (0.233708ms)\
✔ pre-aborted run skips save (existing=true) (0.357875ms)\
✔ CAS conflict never reruns provider or tool and retains runtime facts (7.053209ms)\
✔ application awaits save settlement before starting the next run (3.126666ms)\
✔ settled length output is saveable when paired (0.496583ms)\
✔ settled unknown output is saveable when paired (0.37625ms)\
✔ settled tool_calls output is saveable when paired (0.223333ms)\
✔ completed outcome is preserved even when its unpaired history cannot be saved (0.212875ms)\
✔ projects all message kinds in order, preserving optional fields and call/result pairing (0.665375ms)\
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.122958ms)\
✔ later input mutations and builds leave an earlier snapshot unchanged (0.141542ms)\
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.227834ms)\
✔ conversation accepts empty without mutation (0.9095ms)\
✔ conversation accepts normal user/model without mutation (0.153584ms)\
✔ conversation accepts provider failure user only without mutation (0.102041ms)\
✔ conversation accepts consecutive users and empty model output without mutation (0.167083ms)\
✔ conversation accepts paired opaque non-JSON result without mutation (0.06825ms)\
✔ conversation accepts multiple sequential calls without mutation (0.049542ms)\
✔ conversation accepts separate complete batches without mutation (0.120958ms)\
✔ conversation accepts TOOL_CALL_CANCELLED without mutation (0.038833ms)\
✔ conversation accepts TOOL_EXECUTION_SKIPPED without mutation (0.149167ms)\
✔ conversation accepts TOOL_EXECUTION_FAILED without mutation (0.239667ms)\
✔ conversation rejects missing result as protocol error (0.194042ms)\
✔ conversation rejects duplicate result as protocol error (0.052583ms)\
✔ conversation rejects orphan result as protocol error (0.035459ms)\
✔ conversation rejects duplicate ID in batch as protocol error (0.084ms)\
✔ conversation rejects duplicate ID across batches as protocol error (0.060833ms)\
✔ conversation rejects interrupted batch as protocol error (0.043083ms)\
✔ conversation rejects cross batch pairing as protocol error (0.083666ms)\
✔ conversation rejects wrong batch result as protocol error (0.059125ms)\
✔ conversation rejects null history as structure error (0.114333ms)\
✔ conversation rejects object history as structure error (0.03325ms)\
✔ conversation rejects null message as structure error (0.02925ms)\
✔ conversation rejects unknown type as structure error (0.03125ms)\
✔ conversation rejects user missing content as structure error (0.027167ms)\
✔ conversation rejects user wrong content as structure error (0.024708ms)\
✔ conversation rejects model wrong content as structure error (0.02625ms)\
✔ conversation rejects model wrong calls as structure error (0.025334ms)\
✔ conversation rejects result wrong id as structure error (0.026667ms)\
✔ conversation rejects result missing content as structure error (0.341583ms)\
✔ conversation rejects bad call 0 as structure error (0.028ms)\
✔ conversation rejects bad call 1 as structure error (0.027333ms)\
✔ conversation rejects bad call 2 as structure error (0.026333ms)\
✔ conversation rejects bad call 3 as structure error (0.027583ms)\
✔ conversation rejects non-JSON arguments 0 as structure error (0.079125ms)\
✔ conversation rejects non-JSON arguments 1 as structure error (0.045625ms)\
✔ conversation rejects non-JSON arguments 2 as structure error (0.037667ms)\
✔ conversation rejects non-JSON arguments 3 as structure error (0.036959ms)\
✔ conversation rejects non-JSON arguments 4 as structure error (0.032542ms)\
✔ conversation rejects non-JSON arguments 5 as structure error (0.033ms)\
✔ conversation rejects non-JSON arguments 6 as structure error (0.160958ms)\
✔ conversation rejects non-JSON arguments 7 as structure error (0.112125ms)\
✔ conversation rejects non-JSON arguments 8 as structure error (0.095959ms)\
✔ conversation rejects non-JSON arguments 9 as structure error (0.07775ms)\
✔ conversation rejects non-JSON arguments 10 as structure error (0.077291ms)\
✔ conversation rejects non-JSON arguments 11 as structure error (0.078125ms)\
✔ conversation rejects symbol properties, accessors and custom array prototypes (0.291416ms)\
✔ maps provider-neutral model messages to OpenAI chat messages (1.2985ms)\
✔ maps provider-neutral tool definitions to OpenAI function tools (0.201791ms)\
✔ maps OpenAI assistant text to a Runtime assistant message (0.065583ms)\
✔ maps an OpenAI function tool call and parses its arguments (0.136917ms)\
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.160959ms)\
✔ maps known finish reasons and normalizes provider-specific reasons (0.0475ms)\
✔ maps OpenAI usage to the Runtime usage model (0.091625ms)\
✔ maps a complete OpenAI response without leaking its raw shape (0.06475ms)\
✔ a concurrent run fails before state, events, or provider work and leaves the first run intact (3.867625ms)\
✔ a subscriber reentrant run is rejected by the same active-run guard (0.507791ms)\
✔ pre-aborted runs have no state, provider, or event lifecycle (0.235ms)\
✔ provider receives the same signal and an aborted returned response is not committed (0.289708ms)\
✔ provider rejection while the current signal is aborted settles the run as aborted (0.271583ms)\
✔ an unrelated provider rejection racing with abort preserves identity and releases ownership (0.352167ms)\
✔ an unrelated provider error preserves identity and releases ownership (0.236208ms)\
✔ abort before tool start pairs every call without tool execution events (0.3085ms)\
✔ ToolExecutor passes the same signal and separates cooperative cancellation from normal failure (23.638041ms)\
✔ an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED (7.873875ms)\
✔ abort during a tool writes cancellation pairing without a completed event (4.906834ms)\
✔ a successful tool result commits before late abort stops the next model turn (3.85875ms)\
✔ multiple tools preserve A, cancel B and C, and never execute C (4.205917ms)\
✔ normal, unsupported, limit and aborted outcomes all release active ownership (0.686792ms)\
✔ cancellation takes priority over maxTurns pairing (0.168708ms)\
✔ constructor recovery is detached and does not call provider, tools or events (2.782084ms)\
✔ next model request includes recovered history and only new tool calls execute (15.682791ms)\
✔ historical tools need not be registered and are never replayed (0.398583ms)\
✔ invalid initialMessages fail during construction before provider work (0.356125ms)\
✔ recovered runtime preserves pre-abort and cooperative provider abort provenance (1.866042ms)\
✔ recovered runtime preserves tool cancellation pairing (0.75225ms)\
✔ recovered runtime still owns exactly one active run (1.0075ms)\
✔ memory: missing session returns null (0.442541ms)\
✔ memory: revision zero creates revision one (0.656125ms)\
✔ memory: duplicate create conflicts without changing history (0.338542ms)\
✔ memory: current revision updates and stale revision conflicts (0.138125ms)\
✔ memory: updating a missing session does not create it (0.635625ms)\
✔ memory: invalid session ids and revisions rejected (0.371666ms)\
✔ memory: invalid structure and pairing cannot overwrite valid snapshot (0.365917ms)\
✔ memory: load and save deeply isolate both directions (0.356333ms)\
✔ memory: safe revision extremes cannot bypass CAS or overflow (0.634208ms)\
✔ memory: simultaneous writers have exactly one winner (0.941959ms)\
✔ sqlite: missing session returns null (8.083291ms)\
✔ sqlite: revision zero creates revision one (2.1825ms)\
✔ sqlite: duplicate create conflicts without changing history (1.46225ms)\
✔ sqlite: current revision updates and stale revision conflicts (2.340167ms)\
✔ sqlite: updating a missing session does not create it (1.103709ms)\
✔ sqlite: invalid session ids and revisions rejected (1.842916ms)\
✔ sqlite: invalid structure and pairing cannot overwrite valid snapshot (4.360917ms)\
✔ sqlite: load and save deeply isolate both directions (4.267875ms)\
✔ sqlite: safe revision extremes cannot bypass CAS or overflow (3.217375ms)\
✔ sqlite: simultaneous writers have exactly one winner (4.63225ms)\
✔ SQLite close/reopen recovers into a new runtime and increments revision (7.657375ms)\
✔ independent SQLite connections cannot overwrite the same old revision (1.748542ms)\
✔ SQLite revisions reach the maximum safely and cannot overflow (1.673375ms)\
✔ SQLite load rejects malformed JSON instead of returning null or conflict (1.067708ms)\
✔ SQLite load rejects bad structure instead of returning null or conflict (1.14425ms)\
✔ SQLite load rejects incomplete batch instead of returning null or conflict (1.384583ms)\
✔ SQLite load rejects wrong JSON root instead of returning null or conflict (1.182708ms)\
✔ SQLite load rejects damaged revision 0 (1.230083ms)\
✔ SQLite load rejects damaged revision -1 (1.295792ms)\
✔ SQLite load rejects damaged revision 9007199254740992 (1.086125ms)\
✔ SQLite load rejects damaged revision 9223372036854775807 (0.987417ms)\
✔ SQLite load rejects damaged revision 1.5 (1.018167ms)\
✔ SQLite load rejects damaged revision bad (0.915959ms)\
✔ SQLite operational and constraint errors retain their own error identity (1.364167ms)\
✔ SQLite cannot-open IO error and corrupt file error are not conflicts (0.371ms)\
✔ happy path uses registry definitions and result in the second turn of one run (14.388959ms)\
✔ each turn gets independent complete context from the latest facts and definitions (7.365417ms)\
✔ invalid arguments null never invoke execute and allow continuation (5.06125ms)\
✔ invalid arguments [] never invoke execute and allow continuation (3.959792ms)\
✔ invalid arguments "bad" never invoke execute and allow continuation (4.201584ms)\
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.519542ms)\
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.624292ms)\
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.424042ms)\
✔ tool throw becomes an execution failure visible to the next model turn (4.195959ms)\
✔ tool reject becomes an execution failure visible to the next model turn (3.213792ms)\
✔ tool non-error becomes an execution failure visible to the next model turn (2.616209ms)\
✔ multiple calls finish sequentially before the next turn (mixed=false) (6.430208ms)\
✔ multiple calls finish sequentially before the next turn (mixed=true) (6.088583ms)\
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.478458ms)\
✔ maxTurns=3 counts model turns, skips final tools and resets per run (3.964916ms)\
✔ maxTurns=default counts model turns, skips final tools and resets per run (4.651916ms)\
✔ a run after limit_reached receives paired skipped results before the new user input (0.33025ms)\
✔ stop on the last allowed turn still completes (0.192875ms)\
✔ invalid maxTurns fails at construction (0.2605ms)\
✔ provider failure after tool execution propagates the same error and preserves facts (4.290875ms)\
✔ tool argument and result references cannot mutate history (4.671291ms)\
✔ registry rejects duplicates, preserves order and isolates schema references (4.124625ms)\
✔ provider cannot change the schema used for tool validation (4.142791ms)\
✔ invalid schema and async schema are configuration bugs, not invocation failures (7.938625ms)\
✔ lookup bugs propagate unchanged (0.300042ms)\
✔ result serialization bugs propagate outside the execute catch boundary (3.653375ms)\
✔ tool_calls without calls is an invariant violation (0.248708ms)\
✔ malformed tool_calls (missing) still throws on the final turn (0.1855ms)\
✔ malformed tool_calls (empty) still throws on the final turn (0.176084ms)\
ℹ tests 176\
ℹ suites 0\
ℹ pass 176\
ℹ fail 0\
ℹ cancelled 0\
ℹ skipped 0\
ℹ todo 0\
ℹ duration_ms 533.208833

# 源码压缩包：如上传


### ChatGPT — commentary / rendered fragment

> Message ID: `901367b3-e142-4ad5-a022-75afe903b7bc`; content: `text`; channel: `commentary`; recipient: `all`

我会以压缩包里的实际实现为准做审查，不仅核对 Codex 的总结。先检查依赖方向、SessionStore 的原子 CAS、验证器和应用层双 Settlement，再对照测试找可能遗漏的错误路径；最后按 Must Fix / 建议优化 / 可接受延期给出结论。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `45321e03-1f01-4969-9a25-ac3e034cdc76`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(20261010-075805).zip' | head -65


### Public tool output

> Message ID: `30e48d17-f171-44a9-a310-1a4355bf7728`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `0d7423d9-db91-42f5-81b0-5f7bab9474e8`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/review_g && unzip -oq '/mnt/data/source-review(20261010-075805).zip' -d /mnt/data/review_g; for f in src/session/*.ts src/messages/validate-conversation.ts src/demo/conversation-workflow.ts; do echo ==== $f; cat /mnt/data/review_g/$f; done


### Public tool output

> Message ID: `c9a86632-6dec-41d2-992c-fffa204157a8`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `0fcec9b5-50c8-4a91-aaa2-269548b537c8`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc cat /mnt/data/review_g/src/runtime/agent-runtime.ts; cat /mnt/data/review_g/src/messages/runtime-message.ts; cat /mnt/data/review_g/src/model/model.ts; cat /mnt/data/review_g/src/demo/conversation-recovery-demo.ts


### Public tool output

> Message ID: `5768ea4c-bca0-4d53-a9e6-560f59898b12`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `334bd848-4957-46b1-9e90-50fb15cc93f8`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc cat /mnt/data/review_g/package.json; sed -n '1,240p' /mnt/data/review_g/test/application-settlement.test.ts; sed -n '1,200p' /mnt/data/review_g/test/session-store.test.ts; ls -la /mnt/data/review_g | head


### Public tool output

> Message ID: `5a05d074-dc2b-4cb7-b5ee-77bee2f674d1`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `2e9e1d57-f697-45cd-967a-7c2c99c2967a`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：Runtime Verification + Code Review + Theory Feedback

<badge color="warning">首轮 Review：暂不关闭 Milestone</badge>

我已经解压并逐文件检查你上传的 `source-review(20261010-075805).zip`，重点核对了 SessionStore、Conversation Validator、AgentRuntime、Application Workflow、Recovery Demo 以及相关测试。

## 一、总体审查结论

**Codex 的主体实现符合我们确认的 VII-G 架构，没有发现需要推翻既有设计或重写核心模块的问题。**

特别值得肯定的是以下几项有实际代码证据的实现：

- `AgentRuntime` 没有直接依赖 `SessionStore`，仍然是 RuntimeState 的唯一修改者。
- SQLite 使用原子条件写入，而不是先查询 revision 再无条件更新。
- `initialMessages` 在构造阶段验证并深拷贝，恢复不会执行历史 Tool。
- Conversation Validator 不仅检查字段类型，也检查 ToolCall 与 ToolResult 的配对关系。
- Run Error 和 Persistence Error 分别保留，没有篡改 VII-F 的 `RunOutcome`。
- 现有 Agent Loop、Abort、AgentEvent、ToolExecutor、ContextBuilder 都没有被重写。

从你提供的测试日志看，176 项测试全部通过，原有 75 项也没有回归。

但这里需要区分三种证据：

| 证据 | 当前结论 |
|---|---|
| 源码静态审查 | 已完成主要模块核对 |
| Codex 提供的执行日志 | 176 pass，build、类型检查和 Demo 通过 |
| 我在独立环境重新运行 | 尚未复现；压缩包没有携带完整安装环境及 lockfile |

因此，我不会直接把 Codex 的测试报告等同于独立验证完成。

## 二、架构决策符合度

| 范围 | 结论 |
|---|---|
| G-AD01～02：持久化粒度和 Owner | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD03～06：Store 契约及 CAS | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD07～09：构造恢复、revision、SQLite/Memory | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD10～11：结算后保存、严格校验 | <icon name="check-circle" color="success" inline/> 核心符合 |
| G-AD12～14：双 Settlement、错误及冲突 | <icon name="check-circle" color="success" inline/> 核心符合 |
| G-AD15～16：顺序编排、失败后不复用 | <icon name="alert-circle" color="warning" inline/> 需要收紧应用层契约 |
| G-AD17～20：验证范围、首次保存、一致性 | <icon name="check-circle" color="success" inline/> 符合 |

整体没有明显的 Scope Expansion（范围膨胀）。新增的 Demo Workflow 是为 G-AD12～G-AD16 提供验证入口，不属于提前实现 SessionManager。

---


### ChatGPT

> Message ID: `15407565-5f02-4213-87bd-2dc8b077445e`; content: `text`; channel: `final`; recipient: `all`

## 三、Must Fix：必须修复的问题

### MF-01：Persistence 失败后，`reusable` 的语义不安全

<badge color="danger">Must Fix</badge>

定位：`src/demo/conversation-workflow.ts`

当前代码：

```ts
try {
  persistence = {
    status: "fulfilled",
    value: await store.save({
      sessionId,
      revision,
      messages,
    }),
  };
} catch (reason) {
  persistence = {
    status: "rejected",
    reason,
  };
}

return {
  run,
  persistence,
  reusable: true,
};
```

问题在于：**只要 Conversation 合法，即使持久化失败，返回的 `reusable` 仍然是 `true`。**

这不是 RuntimeState 内容损坏，而是 Session Workflow 的继续运行资格不明确。

例如：

```text
SQLite Session revision = 5
         ↓
Runtime A 从 revision 5 恢复
         ↓
Runtime A 成功执行一个 Tool
         ↓
Runtime B 先保存 revision 6
         ↓
Runtime A 保存失败：Conflict
         ↓
runAndSave 返回 reusable: true
```

如果调用方仅依赖 `reusable`，就可能继续在一个尚未成功同步持久化历史的 Runtime 上发起新 Run。

这与我们确认的 **G-AD15：同一 Session 按 Run → Save 顺序推进** 的实际意图不一致。

注意这里需要精确区分：

- Runtime 的消息协议仍然可能完全合法。
- 但是当前 Session Workflow 不具备已确认的继续保存基线。
- CAS 防止了覆盖，却没有保证下一轮可以安全继续。

所以不能简单地认为 `validateConversation()` 通过就可以继续。

**最小修复建议：**

保留现有双 Settlement 结构，但明确 `reusable` 表示当前 Workflow 是否允许继续下一轮：

| 场景 | `reusable` |
|---|---|
| Run completed + Save success | `true` |
| Run rejected + 合法历史 + Save success | `true` |
| Run aborted + 合法历史 + Save success | `true` |
| Pre-aborted，没有新增消息 | `true`，前提是原 Workflow 本身有效 |
| Conversation invalid | `false` |
| CAS conflict | `false` |
| 其他 Persistence Error | `false`，直到调用方显式处理或重新建立可靠的持久化基线 |

我建议保持 `reusable: boolean`，不要额外引入 Session 状态机或新的 Result Union。

对应代码的核心修改可以很小：

```ts
return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

这个规则适用于已经尝试保存的路径。无新增消息的合法 skipped 路径应继续单独处理。

同时补两项回归测试：

1. CAS 冲突后 `reusable === false`，不会自动再次调用 Provider/Tool。
2. 普通存储失败后 `reusable === false`，且 Run Error、Persistence Error 对象身份保持不变。

这是本次审查唯一需要修改现有实现逻辑的明确 Must Fix。

---

## 四、建议优化：不阻塞架构通过

### SO-01：明确 `runAndSave()` 不是并发控制器

当前 `runAndSave()` 使用了：

```ts
const before = runtime.getMessages();
```

然后执行 `runtime.run()`、校验历史和 `store.save()`。

但该函数本身没有防止调用方同时执行两次 `runAndSave()`。

例如：

```ts
const a = runAndSave(runtime, store, ...);
const b = runAndSave(runtime, store, ...);
```

VII-F 的 Single Active Run 会拒绝其中一个 `runtime.run()`，但是应用层快照和保存动作并不受 `#active` 保护。

这里我不建议引入锁、队列或者 Scheduler。

因为 G-AD15 已经明确：

**Application / Caller 必须负责串行化同一 Session 的 Run → Save 工作流。**

建议在 README 和 `runAndSave()` 的文档中明确：

- 调用者必须 `await` 整个工作流结算。
- 未完成当前保存前，不能启动同一 Session 的下一轮。
- `reusable: false` 时不能继续复用该工作流。
- 不允许根据保存失败自动重试 Agent Run。

这是调用契约的明确化，而不是要求重新设计。

### SO-02：Validator 存在一定程度的防御性复杂度

定位：`validate-conversation.ts`

目前的 `validateJSON()` 除了处理循环引用、不可序列化值，还检查：

- Symbol 属性；
- getter/setter；
- 自定义数组原型；
- 非枚举属性；
- 稀疏数组；
- 自定义对象原型。

这些检查比普通 JSON 消息验证严格。

例如：

```ts
const descriptor = Object.getOwnPropertyDescriptor(
  value,
  key,
)!;

if (
  !descriptor.enumerable ||
  !Object.hasOwn(descriptor, "value")
) {
  fail(...);
}
```

这种设计确实有合理性：它避免保存时静默忽略属性，或者因为访问器行为使验证和序列化不一致。

但我们的目标是 Mini Runtime，而不是通用安全序列化库。

我的判断是：

**当前可以保留，不必为减少代码量而重写。**

理由是这些逻辑已经集中在一个独立模块内，并未污染 Runtime 或 Store 的职责。

不过不要进一步发展为通用的对象遍历框架。

### SO-03：异常信息可进一步明确

`SessionConflictError` 目前包含：

```ts
sessionId
expectedRevision
```

没有包含实际 revision。

我认为这是合理的最小设计。

因为 CAS 失败后如果还想准确取得当前 revision，需要额外读取；而这一读取又可能观察到更新后的其他版本。

当前错误只承诺“预期版本不满足”，已经足够。

不建议为了错误展示增加额外查询或复杂 Conflict Resolution API。

---

## 五、可以接受、以后再处理

| 项目 | 为什么当前可以接受 |
|---|---|
| SQLite 同步 API | Mini Runtime 的本地存储实现可以接受同步数据库操作；大规模服务性能留待真实需求 |
| 未实现跨实例执行锁 | 已明确排除；CAS 只保护持久化历史 |
| 不恢复正在执行的 Run | G-AD01 已确认 |
| Tool 已执行但尚未落盘的崩溃窗口 | 需要 Durable Execution 与业务幂等，VII-G 不做 |
| SQLite 原生依赖 | 当前 Node 22 验证通过；Node 20 兼容性仍需环境验证 |
| 无 Session 列表和删除接口 | 当前只需要 load/save |
| 不自动修复非法历史 | 保持 committed facts，不伪造执行记录 |
| 不支持 Conversation Merge | 并发保存冲突明确报告，由调用方处理 |
| 历史 ToolCall ID 全局唯一 | 当前恢复协议采用这一保守约束；暂不扩展消息模型 |

这些不应成为要求 Codex 继续扩展功能的理由。

---


### ChatGPT

> Message ID: `88e8bcc4-6e95-4011-b725-2d395c5563b7`; content: `text`; channel: `final`; recipient: `all`

## 六、测试质量评估

这次 176 项测试不是简单堆砌 Happy Path。

特别有价值的是以下覆盖：

| 测试类别 | 审查评价 |
|---|---|
| 共享 SessionStore Contract | 好；Memory 和 SQLite 不会轻易产生语义分叉 |
| SQLite 双连接 CAS | 好；不仅验证顺序保存，也验证旧版本竞争 |
| 损坏 JSON 与非法 revision | 好；避免把损坏数据当作新会话 |
| ToolCall 配对校验 | 好；包括 orphan、duplicate、wrong batch |
| Constructor Recovery | 好；验证引用隔离和没有历史 Tool 重放 |
| Abort / Provider Error 恢复 | 好；延续 VII-F 的边界 |
| 双 Settlement 四种组合 | 好；显式保留两个独立结果 |
| 不合法历史阻止保存 | 好；避免污染持久化 Conversation |
| 保存失败后的继续运行资格 | **缺口；需要补测试** |

其中一个值得特别肯定的测试：

`completed outcome is preserved even when its unpaired history cannot be saved`

这个测试体现了我们之前反复强调的：

**RunOutcome 是执行结果，不是 Conversation 可持久化性的证明。**

模型结束了 Run，不代表它产生的消息历史一定满足后续恢复协议。

### 当前无法独立确认的内容

上传的 ZIP 包含源码、测试、`package.json` 和 `tsconfig.json`，但没有包含 Codex 总结中提及的 `package-lock.json` 和 `README.md`。

因此：

- 我能对本次压缩包中的代码做静态审查。
- 可以依据所提供的日志判断 Codex 报告的测试覆盖和运行结果。
- 但尚不能核对 lockfile 的实际依赖解析，也不能确认 README 最终内容。
- 本轮没有在独立环境重新完成一次 `npm ci && npm test`。

这不是说代码存在依赖错误，而是交付证据仍有缺口。

建议修复后重新打包时一并包含这两个文件。

---

## 七、Theory Feedback：本节值得升级的三个认识

### 1. Conversation Validity 与 Workflow Continuability 是两个概念

这是本轮最重要的代码审查发现。

以前我们主要关心：

```text
Conversation 是否合法？
    ↓
是否可以交给 ContextBuilder？
```

现在还必须关心：

```text
Conversation 合法
    ≠
当前 Session Workflow 可以继续
```

例如：

```text
Conversation Validation：PASS
SQLite Save：Conflict
```

历史消息本身没有损坏，但当前 Runtime 不是最新的已确认持久化版本。

因此至少存在两个独立判断：

- **Conversation Validity（对话有效性）**：历史符合消息协议。
- **Workflow Continuability（工作流可继续性）**：当前应用层的运行和持久化基线允许继续。

两者不能合并成一个简单的消息校验结果。

这也是为什么 MF-01 应当在 Application Workflow 层修复，而不是修改 `AgentRuntime`。

### 2. Persisted Snapshot 是事实的副本，不是执行权

VII-F 中，`#active` 保护的是同一个 Runtime 对象的状态修改权。

VII-G 中，revision 保护的是持久化数据更新不会静默覆盖。

它们解决的是不同问题。

<box border radius="lg" padding={3} gap={2}>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <icon name="lock" size="lg"/>
        **VII-F：Execution Ownership**
        <text size="xs" color="secondary">谁可以推进当前 Runtime 的 Agent Loop？</text>
        <text size="xs" weight="medium">`#active`</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <icon name="database" size="lg"/>
        **VII-G：Persistence Consistency**
        <text size="xs" color="secondary">谁的 Conversation 更新可以成功落盘？</text>
        <text size="xs" weight="medium">`revision CAS`</text>
      </box>
    </grid-item>
  </grid>
</box>

拥有一份 revision 5 的 Snapshot，并不表示 Runtime 已锁定了这个 Session。

它只表示：

> 我可以尝试以 revision 5 为前置条件提交新的历史。

### 3. 与 Pi Agent 的对应关系

结合我们之前 Part VI 对 Pi Agent 的源码学习，这次 Mini Runtime 的设计与 Pi 的部分理念一致，但没有复制其全部能力。

| Mini Runtime VII-G | Pi 学习中对应的理念 |
|---|---|
| RuntimeState 保存稳定消息 | 区分对话事实与运行控制 |
| SessionStore 保存快照 | Session 可持久化与重建 |
| Runtime 构造时恢复 | 恢复历史后重新建立运行上下文 |
| 不保存 `#active`、AbortSignal | 不持久化进程内执行控制 |
| 不自动重放历史 Tool | 恢复对话不等于恢复执行 |
| 最小 SessionStore | 不引入 Session Tree、分支管理等更复杂能力 |

需要特别说明：这里的对比依据是我们已经学习和确认过的 Pi 架构原则，不是本轮对最新版 Pi 官方源码的重新审计。

VII-G 最大的认知升级是：

> **Session 能否继续，不仅由消息本身决定，还取决于持久化版本与当前执行流程是否保持一致。**

---


### ChatGPT

> Message ID: `e2f2c2c0-e987-4264-8131-cf4a25bf69d4`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：Runtime Verification + Code Review + Theory Feedback

<badge color="warning">首轮 Review：暂不关闭 Milestone</badge>

我已经解压并逐文件检查你上传的 `source-review(20261010-075805).zip`，重点核对了 SessionStore、Conversation Validator、AgentRuntime、Application Workflow、Recovery Demo 以及相关测试。

## 一、总体审查结论

**Codex 的主体实现符合我们确认的 VII-G 架构，没有发现需要推翻既有设计或重写核心模块的问题。**

特别值得肯定的是以下几项有实际代码证据的实现：

- `AgentRuntime` 没有直接依赖 `SessionStore`，仍然是 RuntimeState 的唯一修改者。
- SQLite 使用原子条件写入，而不是先查询 revision 再无条件更新。
- `initialMessages` 在构造阶段验证并深拷贝，恢复不会执行历史 Tool。
- Conversation Validator 不仅检查字段类型，也检查 ToolCall 与 ToolResult 的配对关系。
- Run Error 和 Persistence Error 分别保留，没有篡改 VII-F 的 `RunOutcome`。
- 现有 Agent Loop、Abort、AgentEvent、ToolExecutor、ContextBuilder 都没有被重写。

从你提供的测试日志看，176 项测试全部通过，原有 75 项也没有回归。

但这里需要区分三种证据：

| 证据 | 当前结论 |
|---|---|
| 源码静态审查 | 已完成主要模块核对 |
| Codex 提供的执行日志 | 176 pass，build、类型检查和 Demo 通过 |
| 我在独立环境重新运行 | 尚未复现；压缩包没有携带完整安装环境及 lockfile |

因此，我不会直接把 Codex 的测试报告等同于独立验证完成。

## 二、架构决策符合度

| 范围 | 结论 |
|---|---|
| G-AD01～02：持久化粒度和 Owner | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD03～06：Store 契约及 CAS | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD07～09：构造恢复、revision、SQLite/Memory | <icon name="check-circle" color="success" inline/> 符合 |
| G-AD10～11：结算后保存、严格校验 | <icon name="check-circle" color="success" inline/> 核心符合 |
| G-AD12～14：双 Settlement、错误及冲突 | <icon name="check-circle" color="success" inline/> 核心符合 |
| G-AD15～16：顺序编排、失败后不复用 | <icon name="alert-circle" color="warning" inline/> 需要收紧应用层契约 |
| G-AD17～20：验证范围、首次保存、一致性 | <icon name="check-circle" color="success" inline/> 符合 |

整体没有明显的 Scope Expansion（范围膨胀）。新增的 Demo Workflow 是为 G-AD12～G-AD16 提供验证入口，不属于提前实现 SessionManager。

---

## 三、Must Fix：必须修复的问题

### MF-01：Persistence 失败后，`reusable` 的语义不安全

<badge color="danger">Must Fix</badge>

定位：`src/demo/conversation-workflow.ts`

当前代码：

```ts
try {
  persistence = {
    status: "fulfilled",
    value: await store.save({
      sessionId,
      revision,
      messages,
    }),
  };
} catch (reason) {
  persistence = {
    status: "rejected",
    reason,
  };
}

return {
  run,
  persistence,
  reusable: true,
};
```

问题在于：**只要 Conversation 合法，即使持久化失败，返回的 `reusable` 仍然是 `true`。**

这不是 RuntimeState 内容损坏，而是 Session Workflow 的继续运行资格不明确。

例如：

```text
SQLite Session revision = 5
         ↓
Runtime A 从 revision 5 恢复
         ↓
Runtime A 成功执行一个 Tool
         ↓
Runtime B 先保存 revision 6
         ↓
Runtime A 保存失败：Conflict
         ↓
runAndSave 返回 reusable: true
```

如果调用方仅依赖 `reusable`，就可能继续在一个尚未成功同步持久化历史的 Runtime 上发起新 Run。

这与我们确认的 **G-AD15：同一 Session 按 Run → Save 顺序推进** 的实际意图不一致。

注意这里需要精确区分：

- Runtime 的消息协议仍然可能完全合法。
- 但是当前 Session Workflow 不具备已确认的继续保存基线。
- CAS 防止了覆盖，却没有保证下一轮可以安全继续。

所以不能简单地认为 `validateConversation()` 通过就可以继续。

**最小修复建议：**

保留现有双 Settlement 结构，但明确 `reusable` 表示当前 Workflow 是否允许继续下一轮：

| 场景 | `reusable` |
|---|---|
| Run completed + Save success | `true` |
| Run rejected + 合法历史 + Save success | `true` |
| Run aborted + 合法历史 + Save success | `true` |
| Pre-aborted，没有新增消息 | `true`，前提是原 Workflow 本身有效 |
| Conversation invalid | `false` |
| CAS conflict | `false` |
| 其他 Persistence Error | `false`，直到调用方显式处理或重新建立可靠的持久化基线 |

我建议保持 `reusable: boolean`，不要额外引入 Session 状态机或新的 Result Union。

对应代码的核心修改可以很小：

```ts
return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

这个规则适用于已经尝试保存的路径。无新增消息的合法 skipped 路径应继续单独处理。

同时补两项回归测试：

1. CAS 冲突后 `reusable === false`，不会自动再次调用 Provider/Tool。
2. 普通存储失败后 `reusable === false`，且 Run Error、Persistence Error 对象身份保持不变。

这是本次审查唯一需要修改现有实现逻辑的明确 Must Fix。

---

## 四、建议优化：不阻塞架构通过

### SO-01：明确 `runAndSave()` 不是并发控制器

当前 `runAndSave()` 使用了：

```ts
const before = runtime.getMessages();
```

然后执行 `runtime.run()`、校验历史和 `store.save()`。

但该函数本身没有防止调用方同时执行两次 `runAndSave()`。

例如：

```ts
const a = runAndSave(runtime, store, ...);
const b = runAndSave(runtime, store, ...);
```

VII-F 的 Single Active Run 会拒绝其中一个 `runtime.run()`，但是应用层快照和保存动作并不受 `#active` 保护。

这里我不建议引入锁、队列或者 Scheduler。

因为 G-AD15 已经明确：

**Application / Caller 必须负责串行化同一 Session 的 Run → Save 工作流。**

建议在 README 和 `runAndSave()` 的文档中明确：

- 调用者必须 `await` 整个工作流结算。
- 未完成当前保存前，不能启动同一 Session 的下一轮。
- `reusable: false` 时不能继续复用该工作流。
- 不允许根据保存失败自动重试 Agent Run。

这是调用契约的明确化，而不是要求重新设计。

### SO-02：Validator 存在一定程度的防御性复杂度

定位：`validate-conversation.ts`

目前的 `validateJSON()` 除了处理循环引用、不可序列化值，还检查：

- Symbol 属性；
- getter/setter；
- 自定义数组原型；
- 非枚举属性；
- 稀疏数组；
- 自定义对象原型。

这些检查比普通 JSON 消息验证严格。

例如：

```ts
const descriptor = Object.getOwnPropertyDescriptor(
  value,
  key,
)!;

if (
  !descriptor.enumerable ||
  !Object.hasOwn(descriptor, "value")
) {
  fail(...);
}
```

这种设计确实有合理性：它避免保存时静默忽略属性，或者因为访问器行为使验证和序列化不一致。

但我们的目标是 Mini Runtime，而不是通用安全序列化库。

我的判断是：

**当前可以保留，不必为减少代码量而重写。**

理由是这些逻辑已经集中在一个独立模块内，并未污染 Runtime 或 Store 的职责。

不过不要进一步发展为通用的对象遍历框架。

### SO-03：异常信息可进一步明确

`SessionConflictError` 目前包含：

```ts
sessionId
expectedRevision
```

没有包含实际 revision。

我认为这是合理的最小设计。

因为 CAS 失败后如果还想准确取得当前 revision，需要额外读取；而这一读取又可能观察到更新后的其他版本。

当前错误只承诺“预期版本不满足”，已经足够。

不建议为了错误展示增加额外查询或复杂 Conflict Resolution API。

---

## 五、可以接受、以后再处理

| 项目 | 为什么当前可以接受 |
|---|---|
| SQLite 同步 API | Mini Runtime 的本地存储实现可以接受同步数据库操作；大规模服务性能留待真实需求 |
| 未实现跨实例执行锁 | 已明确排除；CAS 只保护持久化历史 |
| 不恢复正在执行的 Run | G-AD01 已确认 |
| Tool 已执行但尚未落盘的崩溃窗口 | 需要 Durable Execution 与业务幂等，VII-G 不做 |
| SQLite 原生依赖 | 当前 Node 22 验证通过；Node 20 兼容性仍需环境验证 |
| 无 Session 列表和删除接口 | 当前只需要 load/save |
| 不自动修复非法历史 | 保持 committed facts，不伪造执行记录 |
| 不支持 Conversation Merge | 并发保存冲突明确报告，由调用方处理 |
| 历史 ToolCall ID 全局唯一 | 当前恢复协议采用这一保守约束；暂不扩展消息模型 |

这些不应成为要求 Codex 继续扩展功能的理由。

---

## 六、测试质量评估

这次 176 项测试不是简单堆砌 Happy Path。

特别有价值的是以下覆盖：

| 测试类别 | 审查评价 |
|---|---|
| 共享 SessionStore Contract | 好；Memory 和 SQLite 不会轻易产生语义分叉 |
| SQLite 双连接 CAS | 好；不仅验证顺序保存，也验证旧版本竞争 |
| 损坏 JSON 与非法 revision | 好；避免把损坏数据当作新会话 |
| ToolCall 配对校验 | 好；包括 orphan、duplicate、wrong batch |
| Constructor Recovery | 好；验证引用隔离和没有历史 Tool 重放 |
| Abort / Provider Error 恢复 | 好；延续 VII-F 的边界 |
| 双 Settlement 四种组合 | 好；显式保留两个独立结果 |
| 不合法历史阻止保存 | 好；避免污染持久化 Conversation |
| 保存失败后的继续运行资格 | **缺口；需要补测试** |

其中一个值得特别肯定的测试：

`completed outcome is preserved even when its unpaired history cannot be saved`

这个测试体现了我们之前反复强调的：

**RunOutcome 是执行结果，不是 Conversation 可持久化性的证明。**

模型结束了 Run，不代表它产生的消息历史一定满足后续恢复协议。

### 当前无法独立确认的内容

上传的 ZIP 包含源码、测试、`package.json` 和 `tsconfig.json`，但没有包含 Codex 总结中提及的 `package-lock.json` 和 `README.md`。

因此：

- 我能对本次压缩包中的代码做静态审查。
- 可以依据所提供的日志判断 Codex 报告的测试覆盖和运行结果。
- 但尚不能核对 lockfile 的实际依赖解析，也不能确认 README 最终内容。
- 本轮没有在独立环境重新完成一次 `npm ci && npm test`。

这不是说代码存在依赖错误，而是交付证据仍有缺口。

建议修复后重新打包时一并包含这两个文件。

---

## 七、Theory Feedback：本节值得升级的三个认识

### 1. Conversation Validity 与 Workflow Continuability 是两个概念

这是本轮最重要的代码审查发现。

以前我们主要关心：

```text
Conversation 是否合法？
    ↓
是否可以交给 ContextBuilder？
```

现在还必须关心：

```text
Conversation 合法
    ≠
当前 Session Workflow 可以继续
```

例如：

```text
Conversation Validation：PASS
SQLite Save：Conflict
```

历史消息本身没有损坏，但当前 Runtime 不是最新的已确认持久化版本。

因此至少存在两个独立判断：

- **Conversation Validity（对话有效性）**：历史符合消息协议。
- **Workflow Continuability（工作流可继续性）**：当前应用层的运行和持久化基线允许继续。

两者不能合并成一个简单的消息校验结果。

这也是为什么 MF-01 应当在 Application Workflow 层修复，而不是修改 `AgentRuntime`。

### 2. Persisted Snapshot 是事实的副本，不是执行权

VII-F 中，`#active` 保护的是同一个 Runtime 对象的状态修改权。

VII-G 中，revision 保护的是持久化数据更新不会静默覆盖。

它们解决的是不同问题。

<box border radius="lg" padding={3} gap={2}>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <icon name="lock" size="lg"/>
        **VII-F：Execution Ownership**
        <text size="xs" color="secondary">谁可以推进当前 Runtime 的 Agent Loop？</text>
        <text size="xs" weight="medium">`#active`</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <icon name="database" size="lg"/>
        **VII-G：Persistence Consistency**
        <text size="xs" color="secondary">谁的 Conversation 更新可以成功落盘？</text>
        <text size="xs" weight="medium">`revision CAS`</text>
      </box>
    </grid-item>
  </grid>
</box>

拥有一份 revision 5 的 Snapshot，并不表示 Runtime 已锁定了这个 Session。

它只表示：

> 我可以尝试以 revision 5 为前置条件提交新的历史。

### 3. 与 Pi Agent 的对应关系

结合我们之前 Part VI 对 Pi Agent 的源码学习，这次 Mini Runtime 的设计与 Pi 的部分理念一致，但没有复制其全部能力。

| Mini Runtime VII-G | Pi 学习中对应的理念 |
|---|---|
| RuntimeState 保存稳定消息 | 区分对话事实与运行控制 |
| SessionStore 保存快照 | Session 可持久化与重建 |
| Runtime 构造时恢复 | 恢复历史后重新建立运行上下文 |
| 不保存 `#active`、AbortSignal | 不持久化进程内执行控制 |
| 不自动重放历史 Tool | 恢复对话不等于恢复执行 |
| 最小 SessionStore | 不引入 Session Tree、分支管理等更复杂能力 |

需要特别说明：这里的对比依据是我们已经学习和确认过的 Pi 架构原则，不是本轮对最新版 Pi 官方源码的重新审计。

VII-G 最大的认知升级是：

> **Session 能否继续，不仅由消息本身决定，还取决于持久化版本与当前执行流程是否保持一致。**

---

## 八、📋 Codex Fix Task — VII-G 第一轮 Review

本次只建议一个最小范围的修复任务，不需要重新进行 Architecture Analysis。

<WritingBlock id="73843" variant="document"># Codex Fix Task — Part VII-G / Review #1

## 1. Fix Goal

修复 VII-G Application Workflow 中保存失败后 `reusable` 仍然为 true 的问题。

本次只调整应用层工作流的继续运行语义及相关测试、文档。

不得修改已确认的 SessionStore CAS 契约、RuntimeState、Agent Loop、Abort、ToolExecutor 或 ContextBuilder。

## 2. Confirmed Architecture

保持 G-AD01～G-AD20 全部设计不变。

尤其：

- Application / Caller owns persistence orchestration。
- RuntimeState 仍然只有 messages。
- AgentRuntime 不依赖 SessionStore。
- Run 与 Persistence 分别 Settlement。
- CAS Conflict 不覆盖、不合并、不重试。
- 不新增 SessionManager、执行锁或队列。

## 3. Must Fix — Persistence Failure Continuability

文件：

`src/demo/conversation-workflow.ts`

当前在 `store.save()` reject 后仍返回：

```ts
reusable: true
```

这会错误表达当前 Session Workflow 可以继续下一轮。

请明确：

`reusable` 代表当前 Application Workflow 可以安全继续下一次 Run → Save，而不只是 RuntimeMessage 协议合法。

调整为：

- Save fulfilled：`reusable: true`。
- Save rejected，包括 CAS Conflict：`reusable: false`。
- Snapshot invalid：`reusable: false`。
- 没有新增消息、合法跳过保存：维持 `reusable: true`。
- Run rejected，但合法历史保存成功：仍允许 `reusable: true`。
- Run 与 Persistence Settlement 必须保持原有对象身份和结果语义。

不要自动执行恢复、重试、重新加载 Session、回滚内存事实或重新运行 Tool。

## 4. Required Tests

修改或增加测试，至少覆盖：

1. CAS Conflict：
   - Persistence rejected。
   - `reusable === false`。
   - 原 Session 不被覆盖。
   - Provider 和 Tool 不重跑。

2. 普通 Persistence Error：
   - `reusable === false`。
   - 原始 Persistence Error identity 保持。
   - 原始 Run Settlement 保持。
   - RuntimeState 已提交消息不被回滚。

3. Run Error + Save Error：
   - 两个错误都保留。
   - `reusable === false`。

4. Run Error + Save Success：
   - Run Error 原样保留。
   - 合法快照成功保存。
   - `reusable === true`。

5. Pre-aborted / No New Messages：
   - Save skipped。
   - `reusable === true`。
   - 不无意义递增 revision。

保持所有原有测试通过。

## 5. Documentation

明确说明：

- `reusable` 表达当前 Workflow 的继续运行资格。
- Persistence Failure 后应由调用方显式处理，不自动继续。
- 同 Session 的 Run → Save 顺序由 Application 保证。
- CAS 不是跨 Runtime 执行锁。
- 非法历史或保存失败不能触发 Tool 自动重放。

同时检查 README 是否与最终真实行为一致。

## 6. Verification

执行：

```bash
npm test
npm run build
npm run typecheck:tests
npm run demo:runtime
npm run demo:tools
npm run demo:recovery
git diff --check
```

重新检查：

- 测试数量及通过数量。
- 是否引入 Scope Expansion。
- 是否改变任何既有 VII-F Contract。
- 是否出现为了 `reusable` 新增不必要的状态机或公共 API。

## 7. Delivery Report

输出：

1. 修改文件。
2. 修复前后的语义差异。
3. 新增／修改测试及运行结果。
4. G-AD12～G-AD16 的符合度。
5. 是否仍存在 Must Fix。
6. 是否存在未确认的 Scope Expansion。

本次不创建额外 Milestone，不生成 Closure Note，不自动提交 Git。

请在本轮交付时同时提供最终 README、package-lock.json，以及本次修复后的完整源码和测试，以便独立复核。</WritingBlock>

---

## 九、Milestone 最终判断

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    <text weight="medium">Part VII-G · Review #1</text>
    <badge color="warning">暂不 Done</badge>
  </row>
  <divider color="subtle"/>
  <row justify="between">
    <text color="secondary" size="sm">Architecture Compliance</text>
    <text size="sm" color="success" weight="medium">主体通过</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Public Contract</text>
    <text size="sm" color="success" weight="medium">基本合理</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Scope Control</text>
    <text size="sm" color="success" weight="medium">未发现明显越界</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Reported Tests</text>
    <text size="sm" weight="medium">176 / 176</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Must Fix</text>
    <text size="sm" color="danger" weight="medium">1 项</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Suggested Optimization</text>
    <text size="sm">3 项（不阻塞）</text>
  </row>
</box>

**我的最终建议：保留 Codex 当前实现，只做这次最小修复。**

不需要重新设计 SessionStore，不需要增加 SessionManager，不需要重写 Validator，也不需要调整 VII-F。

MF-01 修复并通过复核后，VII-G 就具备进入 Milestone Closure 的条件。届时再整理本节的核心知识升级、Architecture Decisions、工业级实现差距、面试视角及下一阶段 VII-H 的衔接。


### ChatGPT

> Message ID: `0ecaeeb0-bd8f-45d3-a40b-eb8bed74398e`; content: `text`; channel: `final`; recipient: `all`

## 八、📋 Codex Fix Task — VII-G 第一轮 Review

本次只建议一个最小范围的修复任务，不需要重新进行 Architecture Analysis。

<WritingBlock id="73843" variant="document"># Codex Fix Task — Part VII-G / Review #1

## 1. Fix Goal

修复 VII-G Application Workflow 中保存失败后 `reusable` 仍然为 true 的问题。

本次只调整应用层工作流的继续运行语义及相关测试、文档。

不得修改已确认的 SessionStore CAS 契约、RuntimeState、Agent Loop、Abort、ToolExecutor 或 ContextBuilder。

## 2. Confirmed Architecture

保持 G-AD01～G-AD20 全部设计不变。

尤其：

- Application / Caller owns persistence orchestration。
- RuntimeState 仍然只有 messages。
- AgentRuntime 不依赖 SessionStore。
- Run 与 Persistence 分别 Settlement。
- CAS Conflict 不覆盖、不合并、不重试。
- 不新增 SessionManager、执行锁或队列。

## 3. Must Fix — Persistence Failure Continuability

文件：

`src/demo/conversation-workflow.ts`

当前在 `store.save()` reject 后仍返回：

```ts
reusable: true
```

这会错误表达当前 Session Workflow 可以继续下一轮。

请明确：

`reusable` 代表当前 Application Workflow 可以安全继续下一次 Run → Save，而不只是 RuntimeMessage 协议合法。

调整为：

- Save fulfilled：`reusable: true`。
- Save rejected，包括 CAS Conflict：`reusable: false`。
- Snapshot invalid：`reusable: false`。
- 没有新增消息、合法跳过保存：维持 `reusable: true`。
- Run rejected，但合法历史保存成功：仍允许 `reusable: true`。
- Run 与 Persistence Settlement 必须保持原有对象身份和结果语义。

不要自动执行恢复、重试、重新加载 Session、回滚内存事实或重新运行 Tool。

## 4. Required Tests

修改或增加测试，至少覆盖：

1. CAS Conflict：
   - Persistence rejected。
   - `reusable === false`。
   - 原 Session 不被覆盖。
   - Provider 和 Tool 不重跑。

2. 普通 Persistence Error：
   - `reusable === false`。
   - 原始 Persistence Error identity 保持。
   - 原始 Run Settlement 保持。
   - RuntimeState 已提交消息不被回滚。

3. Run Error + Save Error：
   - 两个错误都保留。
   - `reusable === false`。

4. Run Error + Save Success：
   - Run Error 原样保留。
   - 合法快照成功保存。
   - `reusable === true`。

5. Pre-aborted / No New Messages：
   - Save skipped。
   - `reusable === true`。
   - 不无意义递增 revision。

保持所有原有测试通过。

## 5. Documentation

明确说明：

- `reusable` 表达当前 Workflow 的继续运行资格。
- Persistence Failure 后应由调用方显式处理，不自动继续。
- 同 Session 的 Run → Save 顺序由 Application 保证。
- CAS 不是跨 Runtime 执行锁。
- 非法历史或保存失败不能触发 Tool 自动重放。

同时检查 README 是否与最终真实行为一致。

## 6. Verification

执行：

```bash
npm test
npm run build
npm run typecheck:tests
npm run demo:runtime
npm run demo:tools
npm run demo:recovery
git diff --check
```

重新检查：

- 测试数量及通过数量。
- 是否引入 Scope Expansion。
- 是否改变任何既有 VII-F Contract。
- 是否出现为了 `reusable` 新增不必要的状态机或公共 API。

## 7. Delivery Report

输出：

1. 修改文件。
2. 修复前后的语义差异。
3. 新增／修改测试及运行结果。
4. G-AD12～G-AD16 的符合度。
5. 是否仍存在 Must Fix。
6. 是否存在未确认的 Scope Expansion。

本次不创建额外 Milestone，不生成 Closure Note，不自动提交 Git。

请在本轮交付时同时提供最终 README、package-lock.json，以及本次修复后的完整源码和测试，以便独立复核。</WritingBlock>

---

## 九、Milestone 最终判断

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    <text weight="medium">Part VII-G · Review #1</text>
    <badge color="warning">暂不 Done</badge>
  </row>
  <divider color="subtle"/>
  <row justify="between">
    <text color="secondary" size="sm">Architecture Compliance</text>
    <text size="sm" color="success" weight="medium">主体通过</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Public Contract</text>
    <text size="sm" color="success" weight="medium">基本合理</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Scope Control</text>
    <text size="sm" color="success" weight="medium">未发现明显越界</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Reported Tests</text>
    <text size="sm" weight="medium">176 / 176</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Must Fix</text>
    <text size="sm" color="danger" weight="medium">1 项</text>
  </row>
  <row justify="between">
    <text color="secondary" size="sm">Suggested Optimization</text>
    <text size="sm">3 项（不阻塞）</text>
  </row>
</box>

**我的最终建议：保留 Codex 当前实现，只做这次最小修复。**

不需要重新设计 SessionStore，不需要增加 SessionManager，不需要重写 Validator，也不需要调整 VII-F。

MF-01 修复并通过复核后，VII-G 就具备进入 Milestone Closure 的条件。届时再整理本节的核心知识升级、Architecture Decisions、工业级实现差距、面试视角及下一阶段 VII-H 的衔接。


## Turn 10


### User

> Message ID: `35431b10-f39a-4df9-8d66-9f8a49161f9c`; content: `text`; channel: `None`; recipient: `all`

# 本次修改总结：

### 1. 修改文件

本轮只修改：

- [conversation-workflow.ts](/Users/shengq/Desktop/mini-agent-runtime/src/demo/conversation-workflow.ts)：保存失败时返回 `reusable: false`，明确标记含义。
- [application-settlement.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/application-settlement.test.ts)：调整双重结算、CAS Conflict 和 pre-abort 的断言。
- [README.md](/Users/shengq/Desktop/mini-agent-runtime/README.md)：同步继续运行语义与调用方责任。

### 2. 修复前后的语义差异

之前：合法历史即使保存失败，也返回 `reusable: true`。

现在：`reusable` 表示**当前 Application Workflow 可以安全继续下一次 Run → Save**。

| 结算情况                 | reusable |
| -------------------- | -------- |
| 保存成功                 | true     |
| 保存失败，包括 CAS Conflict | false    |
| Snapshot 非法          | false    |
| 合法历史无新增消息，跳过保存       | true     |
| Run 失败，但合法历史保存成功     | true     |

Run、Persistence settlement 和原始错误对象保持不变。

### 3. 测试与验证结果

修改现有测试，没有增加测试数量。覆盖保存失败、双重失败、失败 Run 保存成功、CAS 不覆盖与不重跑、pre-abort 不递增 revision。

| 命令                        | 结果                       |
| ------------------------- | ------------------------ |
| `npm test`                | **176 通过，0 失败，0 跳过**     |
| `npm run build`           | 通过                       |
| `npm run typecheck:tests` | 通过                       |
| `npm run demo:runtime`    | 两轮 completed，恢复上下文回答“小明” |
| `npm run demo:tools`      | 通过，工具结果为 5               |
| `npm run demo:recovery`   | 通过，关闭重开后 revision 1 → 2  |
| `git diff --check`        | 通过                       |

### 4. G-AD12～G-AD16 符合度

- **G-AD12～13**：独立保留 Run 与 Persistence 结果，错误身份不变。
- **G-AD14**：Conflict 返回不可继续标记；不覆盖、不合并、不重试、不回滚事实。
- **G-AD15**：Application 保证顺序；CAS 不充当跨 Runtime 执行锁。
- **G-AD16**：非法历史不可继续；保存失败需调用方显式处理，不自动加载、恢复或重放 Tool。

### 5. Must Fix 状态

本轮指定的 Must Fix 已修复。`reusable` 是调用方必须遵守的继续运行标记，没有新增内部锁或状态机。

### 6. Scope Review 与复核材料

未扩大 Scope，未新增公共 API。通过文件哈希检查确认：其他源码、工程配置及依赖文件在本轮保持不变；VII-F 契约未修改。未生成 Closure Note，未提交 Git。

**[下载完整复核包](/Users/shengq/Desktop/mini-agent-runtime/mini-agent-runtime-vii-g-review-1.zip)**

包含最终 README、[package-lock.json](/Users/shengq/Desktop/mini-agent-runtime/package-lock.json)、package.json、tsconfig.json、全部 **24 个源码文件、13 个测试/support 文件**及 SHA256SUMS。已验证压缩包完整且内容与当前文件一致。



# 测试结果：

➜  mini-agent-runtime git:(main) ✗ npm run test\
\
\> mini-agent-runtime@0.1.0 test\
\> tsx --test test/\*\*/\*.test.ts\
\
✔ normal run emits the minimal lifecycle and its returned outcome (2.970791ms)\
✔ tool loop events follow execution and completed events observe committed facts (36.286208ms)\
✔ multiple tools emit sequential started/completed pairs in execution order (10.168084ms)\
✔ tool error contract still completes the tool execution lifecycle (0.673167ms)\
✔ maxTurns writes skipped results without tool execution events (0.653708ms)\
✔ each subscriber receives payloads isolated from runtime facts and other subscribers (58.459292ms)\
✔ run_finished outcome payload is detached from the returned outcome (0.924959ms)\
✔ subscriber failures do not affect the run or other subscribers (0.576958ms)\
✔ unsubscribe is idempotent and stops later notifications (1.160416ms)\
✔ provider errors propagate unchanged without run_finished (0.881ms)\
✔ completes a normal answer and records runtime facts (3.303625ms)\
✔ retains conversation across two runs on the same runtime (0.478084ms)\
✔ records missing tool failure and continues within the same run (0.929167ms)\
✔ preserves output for length without retry or continuation (0.5915ms)\
✔ preserves output for unknown without retry or continuation (0.783125ms)\
✔ propagates the original provider throw without retry (0.758833ms)\
✔ propagates the original provider reject without retry (0.95ms)\
✔ history copies protect the array, messages, tool calls and nested arguments (1.301959ms)\
✔ provider response and request references cannot mutate runtime facts (1.332667ms)\
✔ dual settlement runFails=false, saveFails=false (4.950291ms)\
✔ dual settlement runFails=false, saveFails=true (0.530042ms)\
✔ dual settlement runFails=true, saveFails=false (0.232875ms)\
✔ dual settlement runFails=true, saveFails=true (0.23ms)\
✔ incomplete history after run rejection is neither saved nor reused (32.231084ms)\
✔ abort with complete cancelled results can be saved (1.701583ms)\
✔ pre-aborted run skips save (existing=false) (0.375875ms)\
✔ pre-aborted run skips save (existing=true) (0.787291ms)\
✔ CAS conflict never reruns provider or tool and retains runtime facts (11.668083ms)\
✔ application awaits save settlement before starting the next run (4.15775ms)\
✔ settled length output is saveable when paired (0.337833ms)\
✔ settled unknown output is saveable when paired (0.296084ms)\
✔ settled tool_calls output is saveable when paired (0.408334ms)\
✔ completed outcome is preserved even when its unpaired history cannot be saved (0.347917ms)\
✔ projects all message kinds in order, preserving optional fields and call/result pairing (1.414458ms)\
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.264625ms)\
✔ later input mutations and builds leave an earlier snapshot unchanged (0.227041ms)\
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.276ms)\
✔ conversation accepts empty without mutation (0.794875ms)\
✔ conversation accepts normal user/model without mutation (0.130292ms)\
✔ conversation accepts provider failure user only without mutation (0.10825ms)\
✔ conversation accepts consecutive users and empty model output without mutation (0.165541ms)\
✔ conversation accepts paired opaque non-JSON result without mutation (0.065083ms)\
✔ conversation accepts multiple sequential calls without mutation (0.0545ms)\
✔ conversation accepts separate complete batches without mutation (0.116ms)\
✔ conversation accepts TOOL_CALL_CANCELLED without mutation (0.037875ms)\
✔ conversation accepts TOOL_EXECUTION_SKIPPED without mutation (0.150917ms)\
✔ conversation accepts TOOL_EXECUTION_FAILED without mutation (0.377708ms)\
✔ conversation rejects missing result as protocol error (0.186917ms)\
✔ conversation rejects duplicate result as protocol error (0.054375ms)\
✔ conversation rejects orphan result as protocol error (0.035042ms)\
✔ conversation rejects duplicate ID in batch as protocol error (0.040459ms)\
✔ conversation rejects duplicate ID across batches as protocol error (1.867833ms)\
✔ conversation rejects interrupted batch as protocol error (0.856833ms)\
✔ conversation rejects cross batch pairing as protocol error (0.148ms)\
✔ conversation rejects wrong batch result as protocol error (0.09275ms)\
✔ conversation rejects null history as structure error (0.22675ms)\
✔ conversation rejects object history as structure error (0.071625ms)\
✔ conversation rejects null message as structure error (0.186167ms)\
✔ conversation rejects unknown type as structure error (0.644875ms)\
✔ conversation rejects user missing content as structure error (0.103167ms)\
✔ conversation rejects user wrong content as structure error (0.058834ms)\
✔ conversation rejects model wrong content as structure error (0.058125ms)\
✔ conversation rejects model wrong calls as structure error (0.054583ms)\
✔ conversation rejects result wrong id as structure error (0.064458ms)\
✔ conversation rejects result missing content as structure error (0.065209ms)\
✔ conversation rejects bad call 0 as structure error (0.056917ms)\
✔ conversation rejects bad call 1 as structure error (0.060958ms)\
✔ conversation rejects bad call 2 as structure error (0.057042ms)\
✔ conversation rejects bad call 3 as structure error (0.056083ms)\
✔ conversation rejects non-JSON arguments 0 as structure error (0.064417ms)\
✔ conversation rejects non-JSON arguments 1 as structure error (0.101583ms)\
✔ conversation rejects non-JSON arguments 2 as structure error (0.159583ms)\
✔ conversation rejects non-JSON arguments 3 as structure error (0.066375ms)\
✔ conversation rejects non-JSON arguments 4 as structure error (0.041875ms)\
✔ conversation rejects non-JSON arguments 5 as structure error (0.033709ms)\
✔ conversation rejects non-JSON arguments 6 as structure error (0.035208ms)\
✔ conversation rejects non-JSON arguments 7 as structure error (0.068042ms)\
✔ conversation rejects non-JSON arguments 8 as structure error (0.054458ms)\
✔ conversation rejects non-JSON arguments 9 as structure error (0.052333ms)\
✔ conversation rejects non-JSON arguments 10 as structure error (0.0425ms)\
✔ conversation rejects non-JSON arguments 11 as structure error (0.041917ms)\
✔ conversation rejects symbol properties, accessors and custom array prototypes (0.212834ms)\
✔ maps provider-neutral model messages to OpenAI chat messages (0.594958ms)\
✔ maps provider-neutral tool definitions to OpenAI function tools (0.133709ms)\
✔ maps OpenAI assistant text to a Runtime assistant message (0.049292ms)\
✔ maps an OpenAI function tool call and parses its arguments (0.066583ms)\
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.138333ms)\
✔ maps known finish reasons and normalizes provider-specific reasons (0.044291ms)\
✔ maps OpenAI usage to the Runtime usage model (0.038083ms)\
✔ maps a complete OpenAI response without leaking its raw shape (0.101167ms)\
✔ a concurrent run fails before state, events, or provider work and leaves the first run intact (3.521875ms)\
✔ a subscriber reentrant run is rejected by the same active-run guard (0.488042ms)\
✔ pre-aborted runs have no state, provider, or event lifecycle (0.219875ms)\
✔ provider receives the same signal and an aborted returned response is not committed (0.2765ms)\
✔ provider rejection while the current signal is aborted settles the run as aborted (0.256041ms)\
✔ an unrelated provider rejection racing with abort preserves identity and releases ownership (0.337708ms)\
✔ an unrelated provider error preserves identity and releases ownership (0.478417ms)\
✔ abort before tool start pairs every call without tool execution events (0.353166ms)\
✔ ToolExecutor passes the same signal and separates cooperative cancellation from normal failure (45.794041ms)\
✔ an unrelated tool rejection racing with abort remains TOOL_EXECUTION_FAILED (12.902541ms)\
✔ abort during a tool writes cancellation pairing without a completed event (11.823167ms)\
✔ a successful tool result commits before late abort stops the next model turn (9.996791ms)\
✔ multiple tools preserve A, cancel B and C, and never execute C (7.778375ms)\
✔ normal, unsupported, limit and aborted outcomes all release active ownership (0.704334ms)\
✔ cancellation takes priority over maxTurns pairing (0.34275ms)\
✔ constructor recovery is detached and does not call provider, tools or events (4.217917ms)\
✔ next model request includes recovered history and only new tool calls execute (22.938959ms)\
✔ historical tools need not be registered and are never replayed (0.821542ms)\
✔ invalid initialMessages fail during construction before provider work (1.060916ms)\
✔ recovered runtime preserves pre-abort and cooperative provider abort provenance (3.197375ms)\
✔ recovered runtime preserves tool cancellation pairing (0.345916ms)\
✔ recovered runtime still owns exactly one active run (0.428ms)\
✔ memory: missing session returns null (0.454958ms)\
✔ memory: revision zero creates revision one (0.713459ms)\
✔ memory: duplicate create conflicts without changing history (0.8485ms)\
✔ memory: current revision updates and stale revision conflicts (0.1405ms)\
✔ memory: updating a missing session does not create it (0.11275ms)\
✔ memory: invalid session ids and revisions rejected (0.345334ms)\
✔ memory: invalid structure and pairing cannot overwrite valid snapshot (0.267041ms)\
✔ memory: load and save deeply isolate both directions (0.112167ms)\
✔ memory: safe revision extremes cannot bypass CAS or overflow (0.238292ms)\
✔ memory: simultaneous writers have exactly one winner (0.272209ms)\
✔ sqlite: missing session returns null (6.883375ms)\
✔ sqlite: revision zero creates revision one (1.428708ms)\
✔ sqlite: duplicate create conflicts without changing history (1.438584ms)\
✔ sqlite: current revision updates and stale revision conflicts (2.049083ms)\
✔ sqlite: updating a missing session does not create it (0.900459ms)\
✔ sqlite: invalid session ids and revisions rejected (1.215541ms)\
✔ sqlite: invalid structure and pairing cannot overwrite valid snapshot (1.4565ms)\
✔ sqlite: load and save deeply isolate both directions (1.32475ms)\
✔ sqlite: safe revision extremes cannot bypass CAS or overflow (1.499416ms)\
✔ sqlite: simultaneous writers have exactly one winner (1.841833ms)\
✔ SQLite close/reopen recovers into a new runtime and increments revision (7.173334ms)\
✔ independent SQLite connections cannot overwrite the same old revision (2.593125ms)\
✔ SQLite revisions reach the maximum safely and cannot overflow (1.593292ms)\
✔ SQLite load rejects malformed JSON instead of returning null or conflict (1.093708ms)\
✔ SQLite load rejects bad structure instead of returning null or conflict (1.423708ms)\
✔ SQLite load rejects incomplete batch instead of returning null or conflict (1.946541ms)\
✔ SQLite load rejects wrong JSON root instead of returning null or conflict (1.012125ms)\
✔ SQLite load rejects damaged revision 0 (3.25325ms)\
✔ SQLite load rejects damaged revision -1 (1.213541ms)\
✔ SQLite load rejects damaged revision 9007199254740992 (1.664666ms)\
✔ SQLite load rejects damaged revision 9223372036854775807 (1.181709ms)\
✔ SQLite load rejects damaged revision 1.5 (1.226459ms)\
✔ SQLite load rejects damaged revision bad (0.996625ms)\
✔ SQLite operational and constraint errors retain their own error identity (1.543708ms)\
✔ SQLite cannot-open IO error and corrupt file error are not conflicts (1.00875ms)\
✔ happy path uses registry definitions and result in the second turn of one run (15.37425ms)\
✔ each turn gets independent complete context from the latest facts and definitions (6.046417ms)\
✔ invalid arguments null never invoke execute and allow continuation (4.687916ms)\
✔ invalid arguments [] never invoke execute and allow continuation (4.904416ms)\
✔ invalid arguments "bad" never invoke execute and allow continuation (4.042291ms)\
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.611292ms)\
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.614541ms)\
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.893667ms)\
✔ tool throw becomes an execution failure visible to the next model turn (4.340875ms)\
✔ tool reject becomes an execution failure visible to the next model turn (3.348208ms)\
✔ tool non-error becomes an execution failure visible to the next model turn (2.6305ms)\
✔ multiple calls finish sequentially before the next turn (mixed=false) (7.028625ms)\
✔ multiple calls finish sequentially before the next turn (mixed=true) (6.20875ms)\
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.423208ms)\
✔ maxTurns=3 counts model turns, skips final tools and resets per run (2.929333ms)\
✔ maxTurns=default counts model turns, skips final tools and resets per run (3.913ms)\
✔ a run after limit_reached receives paired skipped results before the new user input (0.343292ms)\
✔ stop on the last allowed turn still completes (0.156ms)\
✔ invalid maxTurns fails at construction (0.238625ms)\
✔ provider failure after tool execution propagates the same error and preserves facts (3.194584ms)\
✔ tool argument and result references cannot mutate history (2.56975ms)\
✔ registry rejects duplicates, preserves order and isolates schema references (2.955292ms)\
✔ provider cannot change the schema used for tool validation (2.436125ms)\
✔ invalid schema and async schema are configuration bugs, not invocation failures (5.154625ms)\
✔ lookup bugs propagate unchanged (0.228791ms)\
✔ result serialization bugs propagate outside the execute catch boundary (2.384375ms)\
✔ tool_calls without calls is an invariant violation (0.160583ms)\
✔ malformed tool_calls (missing) still throws on the final turn (0.138458ms)\
✔ malformed tool_calls (empty) still throws on the final turn (0.106084ms)\
ℹ tests 176\
ℹ suites 0\
ℹ pass 176\
ℹ fail 0\
ℹ cancelled 0\
ℹ skipped 0\
ℹ todo 0\
ℹ duration_ms 499.491041



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
&#x20;   "outputTokens": 170,\
&#x20;   "totalTokens": 182\
&#x20; }\
}



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
]



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
History: user_input -> model_output -> tool_result -> model_output



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
&#x20;     sessionId: '6140c0f8-cc45-43a4-8bd9-c11ef1ae4070',\
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
&#x20;     sessionId: '6140c0f8-cc45-43a4-8bd9-c11ef1ae4070',\
&#x20;     revision: 2,\
&#x20;     messages: [Array]\
&#x20;   }\
&#x20; },\
&#x20; reusable: true\
}



# 代码压缩包：如上传文件


### ChatGPT — commentary / rendered fragment

> Message ID: `e5acd255-0c5c-4313-aa45-75f1caf1a7d9`; content: `text`; channel: `commentary`; recipient: `all`

我会复核这次修复后的完整压缩包，重点确认 `reusable` 修复是否真的覆盖保存失败、双重失败和跳过保存的路径，同时检查 README、依赖锁文件和测试。若没有新的阻断问题，就给出 VII-G 是否可以正式收尾的结论。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `fb14d607-40de-4dcb-ab05-b135880a1ce5`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(20261010-081200).zip' | head -65 && mkdir -p /mnt/data/vii_g_review && unzip -oq '/mnt/data/source-review(20261010-081200).zip' -d /mnt/data/vii_g_review && find /mnt/data/vii_g_review -maxdepth 3 -type f | head -50


### Public tool output

> Message ID: `a48806ca-05ac-4162-83ce-8d086dfc3947`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `cbf0cccb-5b00-4373-8e51-f07cd5a9f67f`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc cat /mnt/data/vii_g_review/src/demo/conversation-workflow.ts; cat /mnt/data/vii_g_review/src/session/{session-store,memory-session-store,sqlite-session-store}.ts


### Public tool output

> Message ID: `51d9beb0-cfb7-4415-8aaf-46b198c7839e`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `86e0a8cc-d336-4bf2-aa12-0b18a3da1de2`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc grep -n -E 'reusable|rejected|skipped|conflict' /mnt/data/vii_g_review/test/application-settlement.test.ts; cat /mnt/data/vii_g_review/src/messages/validate-conversation.ts; cat /mnt/data/vii_g_review/package.json; ls -la /mnt/data/vii_g_review | head


### Public tool output

> Message ID: `8da52b0d-92db-4f8e-8edb-614292c3bd27`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `19f998de-9d3d-4186-8dbe-68b502d29e45`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Fix Review #2

<badge color="success">Must Fix 已修复</badge>

## 一、最终复核结论

**上一轮发现的 MF-01 已正确修复，没有发现新的阻断性架构问题。Part VII-G 的代码和架构已经满足 Done 条件。**

我直接解压并核对了本次上传的 `source-review(20261010-081200).zip`，而不是仅依赖 Codex 的修改总结。

本次核对包括：

- `conversation-workflow.ts` 的真实修复代码；
- `application-settlement.test.ts` 的对应断言；
- Memory / SQLite Store 的 CAS 实现；
- Conversation Validator 的消息协议校验；
- `SessionSnapshot` 和 `SessionStore` 的公共契约；
- 现有工程配置及依赖声明。

### MF-01 修复结果

原来保存失败后，`reusable` 仍然是 `true`。

现在实际代码是：

```ts
try {
  persistence = {
    status: "fulfilled",
    value: await store.save({
      sessionId,
      revision,
      messages,
    }),
  };
} catch (reason) {
  persistence = {
    status: "rejected",
    reason,
  };
}

return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

**这次修复位置正确，而且没有引入不必要的状态管理。**

| 场景 | 实际语义 | 审查 |
|---|---|---|
| Save 成功 | `reusable: true` | <icon name="check-circle" color="success" inline/> |
| Save 失败 | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| CAS Conflict | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| 非法 Conversation | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| Pre-aborted，无新消息 | 跳过保存，保持可继续 | <icon name="check-circle" color="success" inline/> |
| Run 抛错但保存成功 | 保留 Run Error，允许继续 | <icon name="check-circle" color="success" inline/> |

另外，代码在 `run()` 前也会验证现有历史，避免直接复用已经包含不合法 ToolCall 的 Runtime。

这一点与 G-AD16 一致。

### 测试核查

在 `application-settlement.test.ts` 中，我确认了相关断言已经更新，包括：

- 双 Settlement 四种组合；
- Run Error + Save Error 的错误保留；
- CAS Conflict 后 `reusable === false`；
- 不完整历史禁止复用；
- Pre-aborted 跳过保存；
- 保存失败不会触发 Provider / Tool 重跑。

你提供的最终日志显示 **176 pass、0 fail、0 skipped**。本次压缩包没有安装依赖目录，因此这仍属于 Codex 执行并由日志提供的测试证据，而非我在独立环境重新运行的结果。

---

## 二、架构与代码复核

| 检查维度 | 复核结果 |
|---|---|
| G-AD01～G-AD20 | 符合已确认设计 |
| State Ownership | AgentRuntime 保持唯一消息修改权 |
| Dependency Direction | Runtime 与 Store 解耦 |
| SessionStore Public Contract | 简洁，没有额外 SessionManager |
| SQLite CAS | 条件更新原子执行 |
| Error Propagation | Run / Persistence 各自保留 |
| Lifecycle / Abort | 未发现破坏 VII-F 既有行为的修改 |
| Recovery | 构造时恢复，不重放历史 Tool |
| Scope Control | 没有提前实现 VII-H / VII-I |
| Overengineering | 没有新的阻断问题 |

另外，我确认了 SQLite 的更新语句包含：

```sql
UPDATE sessions
SET revision = revision + 1,
    messages = ?
WHERE session_id = ?
  AND revision = ?
RETURNING revision
```

并且 Memory Store 的版本检查与替换之间没有 `await`。

这符合此前约定的 CAS 原子性要求。

---


### ChatGPT

> Message ID: `c007e71a-767d-468b-936f-783d4fbc9212`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Fix Review #2

<badge color="success">Must Fix 已修复</badge>

## 一、最终复核结论

**上一轮发现的 MF-01 已正确修复，没有发现新的阻断性架构问题。Part VII-G 的代码和架构已经满足 Done 条件。**

我直接解压并核对了本次上传的 `source-review(20261010-081200).zip`，而不是仅依赖 Codex 的修改总结。

本次核对包括：

- `conversation-workflow.ts` 的真实修复代码；
- `application-settlement.test.ts` 的对应断言；
- Memory / SQLite Store 的 CAS 实现；
- Conversation Validator 的消息协议校验；
- `SessionSnapshot` 和 `SessionStore` 的公共契约；
- 现有工程配置及依赖声明。

### MF-01 修复结果

原来保存失败后，`reusable` 仍然是 `true`。

现在实际代码是：

```ts
try {
  persistence = {
    status: "fulfilled",
    value: await store.save({
      sessionId,
      revision,
      messages,
    }),
  };
} catch (reason) {
  persistence = {
    status: "rejected",
    reason,
  };
}

return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

**这次修复位置正确，而且没有引入不必要的状态管理。**

| 场景 | 实际语义 | 审查 |
|---|---|---|
| Save 成功 | `reusable: true` | <icon name="check-circle" color="success" inline/> |
| Save 失败 | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| CAS Conflict | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| 非法 Conversation | `reusable: false` | <icon name="check-circle" color="success" inline/> |
| Pre-aborted，无新消息 | 跳过保存，保持可继续 | <icon name="check-circle" color="success" inline/> |
| Run 抛错但保存成功 | 保留 Run Error，允许继续 | <icon name="check-circle" color="success" inline/> |

另外，代码在 `run()` 前也会验证现有历史，避免直接复用已经包含不合法 ToolCall 的 Runtime。

这一点与 G-AD16 一致。

### 测试核查

在 `application-settlement.test.ts` 中，我确认了相关断言已经更新，包括：

- 双 Settlement 四种组合；
- Run Error + Save Error 的错误保留；
- CAS Conflict 后 `reusable === false`；
- 不完整历史禁止复用；
- Pre-aborted 跳过保存；
- 保存失败不会触发 Provider / Tool 重跑。

你提供的最终日志显示 **176 pass、0 fail、0 skipped**。本次压缩包没有安装依赖目录，因此这仍属于 Codex 执行并由日志提供的测试证据，而非我在独立环境重新运行的结果。

---

## 二、架构与代码复核

| 检查维度 | 复核结果 |
|---|---|
| G-AD01～G-AD20 | 符合已确认设计 |
| State Ownership | AgentRuntime 保持唯一消息修改权 |
| Dependency Direction | Runtime 与 Store 解耦 |
| SessionStore Public Contract | 简洁，没有额外 SessionManager |
| SQLite CAS | 条件更新原子执行 |
| Error Propagation | Run / Persistence 各自保留 |
| Lifecycle / Abort | 未发现破坏 VII-F 既有行为的修改 |
| Recovery | 构造时恢复，不重放历史 Tool |
| Scope Control | 没有提前实现 VII-H / VII-I |
| Overengineering | 没有新的阻断问题 |

另外，我确认了 SQLite 的更新语句包含：

```sql
UPDATE sessions
SET revision = revision + 1,
    messages = ?
WHERE session_id = ?
  AND revision = ?
RETURNING revision
```

并且 Memory Store 的版本检查与替换之间没有 `await`。

这符合此前约定的 CAS 原子性要求。

---

## 三、剩余问题分级

| 分类 | 数量 | 结论 |
|---|---:|---|
| Must Fix | 0 | 无需继续修复 |
| Suggested Optimization | 2 | 非阻断 |
| Accepted / Deferred | 3 | 以后按真实需求处理 |

**建议优化：** 第一，`runAndSave()` 本身不承担跨调用并发保护，调用方必须严格遵守顺序 `await`；第二，Conversation Validator 的 JSON 防御性校验相对严格，但已经模块化，没有必要为了减少代码量而重构。

**可以接受的限制：** 不恢复执行中的 Agent Loop；CAS 不能防止外部 Tool 重复产生副作用；SQLite 的原生驱动兼容性目前只有 Node 22 的实际运行证据。

还有一个交付材料问题：**本次实际上传的 ZIP 中仍然没有 README.md、package-lock.json 和 SHA256SUMS**，尽管 Codex 总结称它们在完整复核包中。因此我无法独立核对这些文件。这不构成已发现的代码 Must Fix，但建议在 Git 提交或正式归档时确认它们已纳入仓库。

## 四、Theory Feedback：这一轮真正学到了什么？

VII-G 让我们把 Agent 的三个状态边界彻底分开：

<box border radius="lg" padding={3} gap={3}>
  <row align="center" gap={3}>
    <icon name="brain-circuit" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Runtime State**
      <text color="secondary" size="sm">Agent 已经提交了哪些消息事实？</text>
    </box>
    <text weight="medium" size="xs">AgentRuntime</text>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <icon name="database" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Persistence State**
      <text color="secondary" size="sm">哪些事实已经通过 revision 检查并保存？</text>
    </box>
    <text weight="medium" size="xs">SessionStore</text>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <icon name="git-branch" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Workflow Continuability**
      <text color="secondary" size="sm">当前应用层工作流是否有资格安全推进下一轮？</text>
    </box>
    <text weight="medium" size="xs">Application</text>
  </row>
</box>

这正是 MF-01 最有价值的理论反馈：

**Conversation 合法，不等于 Session 已成功持久化；Session 尚未成功持久化，也不意味着 Agent 的上一轮执行没有发生。**

这种区分对于后续营销业务 Agent 尤其重要。例如发券 Tool 成功，但对话保存失败时，既不能假装发券失败，也不能随意重新执行发券操作。

## 五、Milestone Closure 判断

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <title size="lg">Part VII-G</title>
    <badge color="success">Done</badge>
  </row>
  <text color="secondary" size="xs">SessionStore + Conversation Recovery</text>
  <divider/>
  <grid columns={2} gap={3}>
    <grid-item>
      <text color="secondary" size="xs">报告测试通过</text>
      <title size="xl" color="default" tabularNums>176 / 176</title>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">剩余 Must Fix</text>
      <title size="xl" color="success" tabularNums>0</title>
    </grid-item>
  </grid>
  <text color="secondary" size="sm">Architecture Review：PASS</text>
  <text color="secondary" size="sm">Scope Review：PASS</text>
  <text color="secondary" size="sm">独立依赖安装与测试复现：未执行</text>
</box>

**我的决定：VII-G 可以正式进行 Milestone Closure，不需要第三轮 Codex Fix Task。**

至此，Part VII 的状态为：

| Milestone | 状态 |
|---|---|
| VII-A：Foundation + ModelProvider | Done |
| VII-B：RuntimeState + Agent Loop | Done |
| VII-C：Tool Registry + Executor | Done |
| VII-D：ContextBuilder + TurnSnapshot | Done |
| VII-E：AgentEvent + Subscriber | Done |
| VII-F：Abort + Single Active Run | Done |
| VII-G：SessionStore + Recovery | **Done** |
| VII-H：beforeToolCall + 简单 Approval | Next |
| VII-I：Weather Agent 完整链路 | Planned |

下一步建议按你一直采用的工程学习流程，生成 **VII-G 正式 Milestone Closure Note**，把 G-AD01～G-AD20、真实实现、调试经验、Pi 理论映射、工业级差距、面试视角，以及留给 VII-H 的问题统一归档。

VII-H 才开始讨论 `beforeToolCall` 和 Human Approval；本节不再扩大实现范围。


### ChatGPT

> Message ID: `3a91d7e9-434c-482d-a0a2-937b1db48b0b`; content: `text`; channel: `final`; recipient: `all`

## 三、剩余问题分级

| 分类 | 数量 | 结论 |
|---|---:|---|
| Must Fix | 0 | 无需继续修复 |
| Suggested Optimization | 2 | 非阻断 |
| Accepted / Deferred | 3 | 以后按真实需求处理 |

**建议优化：** 第一，`runAndSave()` 本身不承担跨调用并发保护，调用方必须严格遵守顺序 `await`；第二，Conversation Validator 的 JSON 防御性校验相对严格，但已经模块化，没有必要为了减少代码量而重构。

**可以接受的限制：** 不恢复执行中的 Agent Loop；CAS 不能防止外部 Tool 重复产生副作用；SQLite 的原生驱动兼容性目前只有 Node 22 的实际运行证据。

还有一个交付材料问题：**本次实际上传的 ZIP 中仍然没有 README.md、package-lock.json 和 SHA256SUMS**，尽管 Codex 总结称它们在完整复核包中。因此我无法独立核对这些文件。这不构成已发现的代码 Must Fix，但建议在 Git 提交或正式归档时确认它们已纳入仓库。

## 四、Theory Feedback：这一轮真正学到了什么？

VII-G 让我们把 Agent 的三个状态边界彻底分开：

<box border radius="lg" padding={3} gap={3}>
  <row align="center" gap={3}>
    <icon name="brain-circuit" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Runtime State**
      <text color="secondary" size="sm">Agent 已经提交了哪些消息事实？</text>
    </box>
    <text weight="medium" size="xs">AgentRuntime</text>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <icon name="database" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Persistence State**
      <text color="secondary" size="sm">哪些事实已经通过 revision 检查并保存？</text>
    </box>
    <text weight="medium" size="xs">SessionStore</text>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={3}>
    <icon name="git-branch" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Workflow Continuability**
      <text color="secondary" size="sm">当前应用层工作流是否有资格安全推进下一轮？</text>
    </box>
    <text weight="medium" size="xs">Application</text>
  </row>
</box>

这正是 MF-01 最有价值的理论反馈：

**Conversation 合法，不等于 Session 已成功持久化；Session 尚未成功持久化，也不意味着 Agent 的上一轮执行没有发生。**

这种区分对于后续营销业务 Agent 尤其重要。例如发券 Tool 成功，但对话保存失败时，既不能假装发券失败，也不能随意重新执行发券操作。

## 五、Milestone Closure 判断

<box border radius="xl" padding={3} gap={2}>
  <row align="center" justify="between">
    <title size="lg">Part VII-G</title>
    <badge color="success">Done</badge>
  </row>
  <text color="secondary" size="xs">SessionStore + Conversation Recovery</text>
  <divider/>
  <grid columns={2} gap={3}>
    <grid-item>
      <text color="secondary" size="xs">报告测试通过</text>
      <title size="xl" color="default" tabularNums>176 / 176</title>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">剩余 Must Fix</text>
      <title size="xl" color="success" tabularNums>0</title>
    </grid-item>
  </grid>
  <text color="secondary" size="sm">Architecture Review：PASS</text>
  <text color="secondary" size="sm">Scope Review：PASS</text>
  <text color="secondary" size="sm">独立依赖安装与测试复现：未执行</text>
</box>

**我的决定：VII-G 可以正式进行 Milestone Closure，不需要第三轮 Codex Fix Task。**

至此，Part VII 的状态为：

| Milestone | 状态 |
|---|---|
| VII-A：Foundation + ModelProvider | Done |
| VII-B：RuntimeState + Agent Loop | Done |
| VII-C：Tool Registry + Executor | Done |
| VII-D：ContextBuilder + TurnSnapshot | Done |
| VII-E：AgentEvent + Subscriber | Done |
| VII-F：Abort + Single Active Run | Done |
| VII-G：SessionStore + Recovery | **Done** |
| VII-H：beforeToolCall + 简单 Approval | Next |
| VII-I：Weather Agent 完整链路 | Planned |

下一步建议按你一直采用的工程学习流程，生成 **VII-G 正式 Milestone Closure Note**，把 G-AD01～G-AD20、真实实现、调试经验、Pi 理论映射、工业级差距、面试视角，以及留给 VII-H 的问题统一归档。

VII-H 才开始讨论 `beforeToolCall` 和 Human Approval；本节不再扩大实现范围。


## Turn 11


### User

> Message ID: `33f2ccff-4e90-42de-88ac-4fc49a511c4a`; content: `text`; channel: `None`; recipient: `all`

还有要补充的吗？还是进入固定章节


### ChatGPT

> Message ID: `e8b28a26-3654-4327-bfaf-df9186325b42`; content: `text`; channel: `final`; recipient: `all`

我的建议是：**不需要再补充架构设计或修改代码，可以直接进入 VII-G 的固定章节收尾。**

经过 Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification → Code Review，VII-G 已经达到了我们预定的 Milestone 目标。

目前的状态：

| 检查项 | 结论 |
|---|---|
| G-AD01～G-AD20 | 已落实 |
| 核心架构与职责边界 | PASS |
| 176 项测试 | Codex 报告全部通过 |
| Must Fix | 0 |
| Scope Expansion | 未发现 |
| Conversation Recovery | 已实现 |
| Milestone Closure Note | 尚未生成 |

不过，我建议在固定章节中**额外强调三个知识点**，不需要再为此开发新功能：

1. **Runtime Commit ≠ Persistence Commit**：消息已经进入 RuntimeState，不代表已经保存到 SQLite。
2. **Conversation Validity ≠ Workflow Continuability**：历史合法，不代表当前 Session Workflow 可以安全继续。这是本次 Code Review 最有价值的发现。
3. **CAS ≠ Execution Lock**：revision 能防止历史覆盖，但不能防止重复执行发券、扣库存等具有副作用的 Tool。

另外，把 Node 20 尚未实际验证、最终归档包部分文件未核对的情况记录为验证限制即可，不必为了这些问题重新打开架构设计。

## 接下来进入固定的 9 项收尾章节

沿用我们之前确定的工程学习模板：

1. **学习计划与完成情况**：回顾 VII-G 的目标、实现成果和验收状态。
2. **《从零实现 Agent Runtime》写书 TODO**：提炼可进入书稿的内容。
3. **学习素材与工程证据**：源码定位、测试、关键实现、Codex 调试记录。
4. **认知升级**：Session、RuntimeState、Persistence、Recovery 的职责差异。
5. **工业级实现对照**：当前 Mini Runtime 与真实业务 Agent 的差距。
6. **知识地图**：把 VII-G 接入 VII-A～VII-F 的完整架构。
7. **面试视角**：如何解释 Session Recovery、CAS、Crash Window 和状态所有权。
8. **思考题**：围绕异常恢复、并发写入、Tool 副作用设计场景题。
9. **Pending 回收**：关闭本节问题，明确 VII-H 与未来阶段的边界。

同时保留我们在 Pi 源码学习阶段形成的 **🔍 源码定位清单**，方便以后直接回到真实代码。

**因此，现在就可以进入 Part VII-G Milestone Closure。** 不需要再给 Codex 发 Fix Task，也不用提前讨论 VII-H。


## Turn 12


### User

> Message ID: `1f48cd5d-66e0-4332-9437-10102cd5906a`; content: `text`; channel: `None`; recipient: `all`

我是先让codex 生成Milestone Closure Note 还是先让你产出固定章节呢


### ChatGPT

> Message ID: `157dc501-37ae-4802-a3ad-392a77ec0c68`; content: `text`; channel: `final`; recipient: `all`

我建议：**先由我产出固定的 9 项收尾章节，再让 Codex 基于这些内容、最终源码和测试证据生成正式的 Milestone Closure Note。**

这也更符合我们之前确立的 **GPT 负责架构与理论、Codex 负责代码实现与工程归档** 的协作模式。

## 推荐流程

<box border radius="lg" padding={3} gap={2}>
  <list marker="number" connector="solid" gap={3}>
    <list-item>
      **ChatGPT：输出固定 9 项章节**

      汇总 VII-G 的学习成果、G-AD01～G-AD20、Code Review 发现、理论升级、工业级差距、面试视角和 Pending 回收。

      <badge color="success">下一步</badge>
    </list-item>
    <list-item>
      **Codex：生成正式 Milestone Closure Note**

      将我的收尾内容作为理论与架构依据，同时核对真实仓库、测试和最终代码。

      形成 `day08-part-vii-g-session-store-conversation-recovery.md`，并更新 Part VII README 中的进度。
    </list-item>
    <list-item>
      **ChatGPT：最终归档复核**

      检查 Codex 有没有遗漏重要决策、把示意方案当成真实代码，或者把尚未验证的能力写成已完成。

      通过后正式归档 VII-G，下一次开始 VII-H。
    </list-item>
  </list>
</box>

## 为什么推荐这个顺序？

因为两份内容的职责不同：

| 内容 | 谁负责更合适 |
|---|---|
| 学习总结与认知升级 | ChatGPT |
| 架构决策及其原因 | ChatGPT |
| Pi Agent 理论映射 | ChatGPT |
| 工业级实现差距 | ChatGPT |
| 真实代码与测试证据 | Codex |
| Markdown 文件落地与 README 更新 | Codex |
| 最终内容一致性审查 | ChatGPT |

如果先让 Codex 直接生成笔记，可能出现一个问题：**它能够准确描述代码做了什么，却不一定完整保留我们多轮架构讨论中为什么这样设计、哪些方案被否决，以及你在学习中需要建立的认知。**

而这些恰恰是《从零实现 Agent Runtime》最有价值的素材。

另外，Codex 生成笔记时应该以当前仓库为代码事实来源。如果我的理论总结与真实代码出现偏差，应明确标出，不允许自行修改历史决策或将未实现能力描述为已实现。

---

**所以我们现在应该先进行：Part VII-G · Milestone Closure（固定 9 项）。**

完成后，我会在最后额外给你一份 **「GPT Closure → Codex Documentation Task」**，让 Codex 一次性完成学习笔记、架构决策归档和 README 更新，避免你还要自己组织提示词。


## Turn 13


### User

> Message ID: `c05e02d9-ef6c-49bc-bde5-e55bc68a6d82`; content: `text`; channel: `None`; recipient: `all`

那你产出固定收尾章节吧


### ChatGPT

> Message ID: `386a4934-f1c0-4616-9631-35c4f7c0d2fa`; content: `text`; channel: `final`; recipient: `all`

# Day08 · Part VII-G：SessionStore + Conversation Recovery

<badge color="success">Milestone Closure · Done</badge>

**《从零实现 Agent Runtime》——固定 9 项学习收尾**

本节是 Part VII 的第七个 Milestone，承接 VII-F 的 Abort + Single Active Run，正式为 Mini Agent Runtime 增加 **Conversation Persistence（对话持久化）与 Conversation Recovery（对话恢复）** 能力。

经过架构讨论、Codex 实现、首轮 Code Review、Must Fix 修复与最终复核，我们已经完成本节预定目标。

<box border radius="xl" padding={3} gap={3}>
  <grid columns={3} gap={2}>
    <grid-item>
      <text color="secondary" size="xs">架构决策</text>
      <title size="xl" color="default" tabularNums>20</title>
      <caption>G-AD01～20</caption>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">测试结果</text>
      <title size="xl" color="default" tabularNums>176</title>
      <caption>Codex 报告全部通过</caption>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">剩余 Must Fix</text>
      <title size="xl" color="success" tabularNums>0</title>
      <caption>最终 Review</caption>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  **一句话总结**

  VII-F 解决“谁可以运行、如何停止”，VII-G 解决“运行过的对话怎样保存，并在新 Runtime 中继续”。
</box>

## 1. 学习计划与完成情况

### 1.1 本节学习目标

进入 VII-G 之前，我们的 Runtime 已经具有完整的消息、模型、工具、事件和取消控制能力。

但是它存在一个限制：

```text
Runtime A
    ↓
User → Model → Tool → Model
    ↓
RuntimeState.messages
    ↓
Node.js 进程退出
    ↓
内存中的 Conversation 消失
```

因此本节必须解决：

- 如何持久化已经提交的消息事实。
- 如何根据 Session ID 找回历史。
- 如何基于历史创建一个新的 Runtime。
- 如何在新 Runtime 中继续正常对话。
- 如何防止多个 Runtime 静默覆盖同一个 Session。
- 如何处理 Run 和 Persistence 的独立失败。

### 1.2 完成情况

| 目标 | 实现结果 |
|---|---|
| SessionStore 接口 | 已完成 |
| MemorySessionStore | 已完成 |
| SQLiteSessionStore | 已完成 |
| revision CAS | 已完成 |
| Conversation Validator | 已完成 |
| `initialMessages` 恢复 | 已完成 |
| Run → Validate → Save 编排 | 已完成 |
| 独立 Run / Persistence Settlement | 已完成 |
| SQLite 关闭重开恢复 | 已完成 |
| 恢复后继续 Model → Tool → Model | 已完成 |
| 不重放历史 Tool | 已验证 |
| Abort / Single Active Run 兼容 | 已验证 |

**实际工程验证记录：**

Codex 最终报告 `npm test` 176 通过、0 失败，`npm run build`、`npm run typecheck:tests` 以及 Runtime、Tools、Recovery Demo 均通过。

之前独立 Code Review 确认了核心源码与修复逻辑；但没有在独立环境重新执行完整依赖安装和测试，Node 20 也没有实际运行验证。这些应作为验证限制保留在正式笔记中。

### 1.3 本节不解决什么

以下能力明确不属于 VII-G：

- 正在执行的 Agent Loop 断点恢复。
- 进程崩溃后自动继续未完成 Tool。
- Durable Tool Execution（持久化工具执行）。
- 跨 Runtime 执行锁。
- Conversation Merge（对话历史自动合并）。
- Session Tree（会话树）。
- Session Compaction（上下文压缩）。
- 自动重试或自动补偿外部副作用。

我们恢复的是 **Conversation Facts（对话事实）**，不是过去正在运行的 JavaScript 执行现场。

---

## 2. 《从零实现 Agent Runtime》写书 TODO

建议将本节整理为独立章节：

**第七章：SessionStore 与 Conversation Recovery——让 Agent 拥有可以恢复的对话**

这一章的核心不应该是 SQLite 教程，而是围绕一次 Runtime 重建讲清楚架构边界。

### 建议章节结构

{@body const todos=["7.1 为什么 RuntimeState 不能天然跨进程保存","7.2 Session、Conversation 与 RuntimeState 的区别","7.3 Application、Runtime、SessionStore 的 Ownership","7.4 SessionSnapshot 与最小 SessionStore Contract","7.5 Memory / SQLite 的 Revision CAS","7.6 Constructor Recovery 与 ContextBuilder 复用","7.7 Conversation Protocol Validation","7.8 Run 和 Persistence 的双 Settlement","7.9 Code Review：reusable Bug 与修复","7.10 Crash Window、Durable Execution 与工程边界"]}
{@body const [checked,setChecked] = DIL.useState([])}
<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **写书 TODO**
    <text color="secondary" size="xs" tabularNums>{checked.length}/{todos.length}</text>
  </row>
  {#each todos as t,i}
    <checkbox key={i} checked={checked.includes(i)} onChange={v=>setChecked(s=>v?[...s,i]:s.filter(x=>x!==i))}>{t}</checkbox>
  {/each}
</box>

### 必须保留的三个案例

**案例一：Runtime 重建后仍然知道用户叫什么。**

第一轮保存历史，关闭 SQLite，重新创建 Store 和 Runtime。第二轮模型请求包含第一次的历史。

这是最小 Recovery Happy Path。

**案例二：两个 Runtime 同时保存一个 Session。**

两个 Runtime 读取 revision 3。A 保存成功变成 revision 4，B 使用旧 revision 保存时得到 Conflict。

这是 CAS 对历史一致性的保护。

**案例三：Agent Run 成功，但 Session 保存失败。**

`RunOutcome.completed` 已经形成，但 SQLite 保存失败。

这时不能把 Run 改成 aborted，也不能自动重新执行 Tool。

这个案例直接引出本章最重要的理论问题：执行状态、持久化状态与工作流可继续性之间的关系。

---

## 3. 学习素材与工程证据

### 3.1 🔍 源码定位清单

以下是 VII-G 最值得反复阅读的真实代码位置。

| 文件 | 建议重点阅读 |
|---|---|
| `src/runtime/agent-runtime.ts` | `initialMessages` 如何注入、验证及深拷贝 |
| `src/messages/validate-conversation.ts` | ToolCall / ToolResult 的协议完整性 |
| `src/session/session-store.ts` | Snapshot、Store 和 Conflict 契约 |
| `src/session/memory-session-store.ts` | 进程内 CAS 与引用隔离 |
| `src/session/sqlite-session-store.ts` | 原子 SQL 条件写入 |
| `src/demo/conversation-workflow.ts` | Run / Persistence 双 Settlement 与 reusable |
| `src/demo/conversation-recovery-demo.ts` | 完整恢复链路 |
| `src/runtime/context-builder.ts` | 为什么历史恢复后不需要重建 ContextBuilder |
| `src/runtime/runtime-state.ts` | 为什么 RuntimeState 仍然只有 messages |

### 3.2 重点测试定位

| 测试文件 | 学习重点 |
|---|---|
| `conversation-validation.test.ts` | 数据结构和协议校验不是一回事 |
| `session-store.test.ts` | 共享 Store Contract |
| `sqlite-persistence.test.ts` | 真实持久化、版本冲突与数据库损坏 |
| `runtime-recovery.test.ts` | 从恢复历史继续 Agent Loop |
| `application-settlement.test.ts` | 双 Settlement 和失败后继续运行资格 |
| `run-control.test.ts` | VII-F Control 语义没有被 VII-G 破坏 |

### 3.3 重点 Debug 案例：MF-01

首轮 Codex 实现中，`runAndSave()` 有一个重要问题：

```ts
return {
  run,
  persistence,
  reusable: true,
};
```

即使 `SessionStore.save()` 失败，也返回 `reusable: true`。

问题不是消息不合法，而是保存失败后应用层不再拥有可靠的 Session 持久化基线。

最终修复：

```ts
return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

同时对无新增消息而跳过保存的合法路径单独保留 `reusable: true` 的语义。

这是一个非常适合放进书稿的案例：

> 单元测试全部通过，Store 和 Runtime 也都正确，但应用层组合两者时，仍可能出现新的架构 Bug。

说明正确的模块组合，并不天然保证正确的工作流。


### ChatGPT

> Message ID: `c404f701-96ae-442e-ab50-7d88a9d5049d`; content: `text`; channel: `final`; recipient: `all`

## 4. 认知升级：从 Runtime State 到可恢复的 Agent

这是本节最重要的理论部分。

### 4.1 Session 不等于 Runtime

在 VII-G 之前，我们容易把一个 `AgentRuntime` 实例理解为一次完整的会话。

但实际上：

**Runtime 是执行载体，Session 是可以持久化并重新定位的对话历史。**

```text
Session #001
    │
    ├── Runtime A
    │      └── Run 1 → Save revision 1
    │
    └── Runtime B
           └── Load revision 1
                 ↓
               Run 2
                 ↓
               Save revision 2
```

Runtime A 消失，并不意味着 Session 必须消失。

同样，一个 Session 能被两个 Runtime 加载，也不意味着它们自动拥有同时修改 Session 的权利。

### 4.2 Runtime Commit ≠ Persistence Commit

假设 Tool 执行完成：

```text
Tool.execute()
      ↓
RuntimeState.messages.push(toolResult)
      ↓
AgentRuntime committed
      ↓
SessionStore.save()
      ↓
SQLite committed
```

这里存在两个不同的提交边界。

- **Runtime Commit**：事实已经进入 AgentRuntime 内部历史。
- **Persistence Commit**：事实已经成功通过 Store 的条件写入。

两个 Commit 之间存在 Crash Window（崩溃窗口）。

如果进程恰好在中间崩溃，SQLite 里就可能没有最新的 Runtime 事实。

而 VII-G 的 Run Boundary Persistence 本来就接受这个限制。

### 4.3 CAS ≠ Execution Lock

CAS（Compare-and-Swap，比较并交换）只负责在保存时确认版本没有过期。

<box border radius="lg" padding={3} gap={2}>
  <svg viewBox="0 0 330 205" width="100%">
    <rect x="110" y="6" width="110" height="36" rx="7" fill="#E6E9ED" stroke="#9199A4"/>
    <text x="165" y="21" fontSize="11" textAnchor="middle" fill="#273444" fontWeight="600">Session</text>
    <text x="165" y="34" fontSize="10" textAnchor="middle" fill="#4D5968">revision 3</text>
    <path d="M135 42 L80 64 M195 42 L250 64" stroke="currentColor" fill="none" strokeWidth="1.5"/>
    {#each [{x:8,t:"Runtime A"},{x:177,t:"Runtime B"}] as n}
      <rect x={n.x} y="66" width="145" height="43" rx="7" fill="#DDEBFA" stroke="#6E95BC"/>
      <text x={n.x+72} y="83" fontSize="11" fontWeight="600" fill="#26496A" textAnchor="middle">{n.t}</text>
      <text x={n.x+72} y="98" fontSize="10" fill="#45637A" textAnchor="middle">可能都已执行 Tool</text>
    {/each}
    <path d="M80 109 V133 M249 109 V133" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="8" y="135" width="145" height="42" rx="7" fill="#DDF3E8" stroke="#63A781"/>
    <text x="80" y="160" fontSize="11" fontWeight="600" fill="#20583A" textAnchor="middle">保存成功 · rev 4</text>
    <rect x="177" y="135" width="145" height="42" rx="7" fill="#FBE3E3" stroke="#D17C7C"/>
    <text x="249" y="160" fontSize="11" fontWeight="600" fill="#8B3535" textAnchor="middle">CAS Conflict</text>
    <text x="165" y="194" fontSize="10" textAnchor="middle" fill="currentColor">拒绝覆盖，不代表 Tool 未执行</text>
  </svg>
</box>

所以对于营销 Agent 的发券、退款、权益变更等操作：

- SessionStore CAS 只能保证历史写入不被静默覆盖。
- 真正的重复业务操作防护，仍需要业务 API 的幂等机制和授权策略。

### 4.4 Conversation Validity ≠ Workflow Continuability

这是 VII-G Review 后最值得牢牢记住的一点。

一个 Runtime 的历史消息可以完全合法，但其最新事实可能尚未保存成功。

因此：

\[
\text{Conversation Validity} \neq \text{Workflow Continuability}
\]

| 判断 | 负责者 |
|---|---|
| 历史是否符合消息协议 | Conversation Validator |
| 当前事实由谁修改 | AgentRuntime |
| 最新历史是否通过版本条件写入 | SessionStore |
| 当前工作流能否继续 | Application |

这也是为什么 MF-01 的修复应该发生在 `conversation-workflow.ts`，而不是 Validator 或 Agent Loop 中。

### 4.5 Recovery 不等于 Replay

恢复一段历史，不意味着重新执行历史 Tool。

例如：

```text
Stored Conversation
├── user_input
├── model_output(toolCall: issueCoupon)
├── tool_result(success)
└── model_output(final answer)
          ↓
  new AgentRuntime
          ↓
     new run()
```

新的 Runtime 只把历史作为上下文，并不会再次执行 `issueCoupon`。

**Replay（重放执行）和 Recovery（恢复对话）必须分开。**

这是避免业务副作用重复发生的重要架构原则。

---

## 5. 工业级实现对照

我们现在的 Mini Runtime 已经具备真实的 Conversation Recovery 能力，但不应该把它当成完整的生产级 Agent 平台。

| 维度 | VII-G 当前实现 | 工业级可能需要 |
|---|---|---|
| 对话持久化 | SQLite + Memory | PostgreSQL、分布式数据库等 |
| 版本一致性 | Revision CAS | 冲突治理、写入协调、审计 |
| 恢复粒度 | 已保存的 Conversation | 执行检查点、断点续跑 |
| Session 结构 | 单份线性历史 | 分支、裁剪、归档 |
| 业务工具 | 历史不重放 | 幂等 Key、执行日志、效果确认 |
| 并发控制 | 实例级 Active Run | Session 级执行权与 Lease |
| 可观测性 | AgentEvent | Trace、指标、执行审计 |
| 数据安全 | 消息结构验证 | 租户隔离、授权、敏感数据治理 |
| 存储失败 | 显式错误、不可继续标记 | 恢复策略、对账、告警 |

这些是**工业级能力对照，不是 VII-G 未完成事项**。

### 与营销业务 Agent 的关系

未来可以考虑这样的职责分配：

```text
营销运营前端
     ↓
Agent Application
     ├── 身份与 Session 权限
     ├── SessionStore
     └── AgentRuntime
           ├── ModelProvider
           ├── Marketing Tools
           └── Approval
                 ↓
            业务 API
                 ↓
        优惠券 / 活动 / 会员权益
```

这里的 `Approval` 属于 VII-H，目前尚未实现。

而 SessionStore 不应该负责决定用户是否允许发券，也不应该判断优惠券 Tool 能否执行。

这些是执行授权和业务边界，不是存储边界。

### Pi Agent 对照

结合我们在 Part VI 中学习的 Pi 源码设计，本节可以建立以下映射：

| 本项目 | Pi 学习中对应的思想 |
|---|---|
| RuntimeState | 稳定的对话事实 |
| SessionSnapshot | 可保存和重新加载的会话数据 |
| Constructor Recovery | 从历史重新建立运行上下文 |
| ContextBuilder | 将历史事实投影为模型请求 |
| 不持久化 `#active` | Process-local Control 不属于 Session 数据 |
| 不重放 Tool | Conversation 恢复与执行恢复分离 |

Pi 的 Session Tree、分支管理等能力不需要在我们的 Mini Runtime 中照搬。

**值得学习的是它的职责分层，而不是它的功能数量。**

以上是基于我们此前完成的 Pi 源码学习记录进行的理论映射，不代表本轮重新验证了 Pi 最新版本源码。

---

## 6. 知识地图：VII-A～VII-G 的完整架构

到目前为止，七个 Milestone 已经形成比较完整的 Runtime 分层。

<box border radius="xl" padding={3} gap={2}>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    U["Application / Caller"] -->|"Run"| R["AgentRuntime"]
    U -->|"load / save"| S["SessionStore · VII-G"]
    S --> M["Memory / SQLite"]
    S -.->|"snapshot 交由 Application 注入"| R
    R --> ST["RuntimeState · VII-B"]
    R --> CB["ContextBuilder · VII-D"]
    CB --> MP["ModelProvider · VII-A"]
    R --> TL["Tool Registry + Executor · VII-C"]
    R --> EV["AgentEvent · VII-E"]
    R --> CT["Abort + Single Active Run · VII-F"]
    ST -->|"最新消息事实"| CB
  </CodeBlock>
</box>

按职责重新分类：

| 架构维度 | 所属 Milestone | 核心问题 |
|---|---|---|
| Model | VII-A | 怎么调用模型？ |
| State | VII-B | 已发生什么？ |
| Execution | VII-C | 工具怎么运行？ |
| Context | VII-D | 模型下一轮看到什么？ |
| Observation | VII-E | 外部如何观察运行？ |
| Control | VII-F | 谁可以运行、如何停止？ |
| Persistence | VII-G | 历史如何保存与恢复？ |

注意：Persistence 没有替代 State，SessionStore 也没有升级成新的 Agent Loop Owner。

这说明此前持续强调的 **Single Responsibility（单一职责）和 Ownership Boundary（所有权边界）** 已经真正落到了代码结构中。


### ChatGPT

> Message ID: `02483b00-56b8-4be1-8cde-c903099a228a`; content: `text`; channel: `final`; recipient: `all`

## 7. 面试视角：如何证明自己理解 Agent Runtime

这一节适合转化成 Agent 应用开发或 Agent 平台工程师的面试素材。

### Q1：Agent 的会话恢复是怎么实现的？

**回答框架：**

我们把 Agent 的执行状态和持久化状态解耦。RuntimeState 只保存已提交的 RuntimeMessage，Application 在 Run 结算后生成快照，通过 SessionStore 保存。恢复时通过 Session ID 加载快照，验证消息协议，再使用 `initialMessages` 初始化新的 Runtime，由 ContextBuilder 生成下一轮模型上下文。

不恢复旧 Promise，也不重放历史 Tool。

### Q2：为什么 SessionStore 不直接放进 AgentRuntime？

因为 Runtime 的主要职责是推进 Agent Loop、维护消息事实和执行控制。

如果 Runtime 还负责数据库读写，它就要处理存储失败、版本冲突和持久化生命周期，增加核心模块的耦合。

当前选择让 Application 编排持久化，使 Runtime 能独立测试和复用。

### Q3：两个 Agent 同时修改同一个 Session 怎么办？

通过 revision CAS 防止静默覆盖。

但必须指出 CAS 只能检测保存冲突，不能防止两个 Agent 在保存之前都已执行 Tool。

对外部业务副作用，需要另外设计执行授权、幂等和必要的 Session 级协调。

### Q4：Provider 失败后，为什么还要保存消息？

因为 Runtime 可能已提交 user_input 或其他合法事实。

Run 失败不等于本轮没有产生任何事实。

Application 应当分别记录 Run settlement 和 Persistence settlement，避免丢失合法历史，也避免把保存成功误认为 Run 成功。

### Q5：如何处理非法的历史 ToolCall？

恢复前验证 ToolCall 与 ToolResult 的完整配对。

若发现缺失、重复或孤立结果，拒绝把它作为可恢复 Conversation 使用。

不自动补造 ToolResult，更不重放历史 Tool，因为这些操作可能错误描述或重复产生外部副作用。

### Q6：你在 Code Review 中实际发现过什么架构问题？

可以讲我们真实遇到的 MF-01：

> 首轮实现中，Run 完成后的历史消息虽然通过协议校验，但 SessionStore 保存失败时，应用层仍返回可继续运行。我们识别出消息合法性与工作流可继续性不是同一个概念，将 `reusable` 的判断放到 Application 层，并新增保存失败、CAS Conflict 的回归断言，没有修改 AgentRuntime 核心。

相比只回答“我实现了 SQLite 会话存储”，这个例子更能体现对 Agent 系统正确性边界的理解。

---

## 8. 思考题

本节不需要继续写代码，但建议用下面几个场景检验是否真正掌握了架构。

{@body const questions=[{q:"场景 1：发券 Tool 已成功，SQLite 保存前进程崩溃。下次恢复后能否直接再次发券？",a:"不能。Session 中缺少最新 ToolResult，并不证明业务动作没有发生。VII-G 不提供执行级恢复或幂等保证，需要通过业务 API 查询、幂等键或未来 Durable Execution 方案处理。"},{q:"场景 2：Run 返回 completed，但 SessionStore.save() 返回 Conflict。是不是应该把 RunOutcome 改成 failed？",a:"不应该。Run 与 Persistence 是独立结算边界。completed 仍然表示 Run 的真实结果；Conflict 表示本轮历史未成功按预期版本保存，当前 Workflow 不可直接继续。"},{q:"场景 3：Provider 发生网络异常，但 RuntimeState 里已经有 user_input。这条消息应当删除吗？",a:"不应该自动删除。它是已经提交的 Runtime 事实。只要整个 Conversation 仍符合恢复协议，可以保存，并保留 Provider 原始错误。"},{q:"场景 4：为什么使用 revision CAS 后，仍然可能重复执行 Tool？",a:"因为 CAS 在保存时检查版本，而 Tool 可能已经在保存前执行。两个 Runtime 能同时读取同一版本并运行，只有提交持久化更新时才会有一个发生冲突。"},{q:"场景 5：为什么不能把 AbortSignal、#active 和 Provider 实例一起序列化？",a:"这些是进程内的执行控制或运行对象，不是稳定的会话事实。新 Runtime 应重新构建它们，而不是尝试复活旧的 JavaScript 执行环境。"}]}
{@body const [openQuestion,setOpenQuestion]=DIL.useState(-1)}
<box border radius="lg" padding={3} gap={2}>
  {#each questions as item,i}
    <box key={i} gap={2}>
      <pressable onClick={()=>setOpenQuestion(openQuestion===i?-1:i)}>
        <row align="start" gap={2}>
          <box flex="1">
            <text weight="medium" size="sm">{item.q}</text>
          </box>
          <icon name={openQuestion===i?"chevron-up":"chevron-down"} color="secondary"/>
        </row>
      </pressable>
      {#if openQuestion===i}
        <box background="surface-secondary" radius="md" padding={3}>
          <text size="sm">{item.a}</text>
        </box>
      {/if}
      {#if i<questions.length-1}<divider color="subtle"/>{/if}
    </box>
  {/each}
</box>

建议你先尝试自己回答，再展开参考思路。

能把这些问题说清楚，说明理解的已经不只是 SessionStore 的 API，而是 Agent 系统的运行边界。

---

## 9. Pending 回收与下一阶段衔接

### 9.1 VII-G 本节已关闭的问题

| Pending | 结果 |
|---|---|
| Conversation 如何持久化 | SessionStore + Snapshot |
| 如何恢复到新的 Runtime | `initialMessages` |
| 恢复时是否重放 Tool | 不重放 |
| 多实例保存如何防覆盖 | Revision CAS |
| 如何处理损坏历史 | 严格验证、显式拒绝 |
| Run Error 是否阻断所有保存 | 不一定；合法事实仍可保存 |
| Run / Save 双重失败 | 双 Settlement |
| 保存失败后能否继续 | `reusable: false` |
| 是否需要 SessionManager | 当前不需要 |
| 是否提前实现 Durable Execution | 不实现 |

### 9.2 有意延期的问题

| Pending | 归属 |
|---|---|
| beforeToolCall 执行前拦截 | VII-H |
| Human Approval（人工审批） | VII-H |
| 拒绝执行后的 ToolResult 语义 | VII-H 决策 |
| Weather Agent 完整链路 | VII-I |
| Durable Tool / Durable Approval | Part VII v1 之后重新规划 |
| Session Tree / Compaction | 未来真实需求 |
| 跨 Runtime 执行协调 | 未来业务架构 |
| Node 20 环境验证 | 工程兼容性补充 |

### 9.3 VII-H 的真正起点

VII-G 完成后，我们已经可以恢复一段对话，并在新的 Runtime 中继续调用模型和工具。

但是目前 Tool 执行路径中，还缺少一个问题：

> **模型提出了 ToolCall，Runtime 已验证参数，但在真正执行 Tool 之前，谁有权决定允许还是拒绝？**

这将是 VII-H 的核心。

它要新增的是 **Execution Authorization（执行授权）**，而不是 SessionStore 的新职责。

本节不要提前实现 Approval，也不要把审批状态塞进 SessionSnapshot。


### ChatGPT

> Message ID: `97909c3b-76c7-46ed-8d36-0626fa2eecb4`; content: `text`; channel: `final`; recipient: `all`

# Day08 · Part VII-G：SessionStore + Conversation Recovery

<badge color="success">Milestone Closure · Done</badge>

**《从零实现 Agent Runtime》——固定 9 项学习收尾**

本节是 Part VII 的第七个 Milestone，承接 VII-F 的 Abort + Single Active Run，正式为 Mini Agent Runtime 增加 **Conversation Persistence（对话持久化）与 Conversation Recovery（对话恢复）** 能力。

经过架构讨论、Codex 实现、首轮 Code Review、Must Fix 修复与最终复核，我们已经完成本节预定目标。

<box border radius="xl" padding={3} gap={3}>
  <grid columns={3} gap={2}>
    <grid-item>
      <text color="secondary" size="xs">架构决策</text>
      <title size="xl" color="default" tabularNums>20</title>
      <caption>G-AD01～20</caption>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">测试结果</text>
      <title size="xl" color="default" tabularNums>176</title>
      <caption>Codex 报告全部通过</caption>
    </grid-item>
    <grid-item>
      <text color="secondary" size="xs">剩余 Must Fix</text>
      <title size="xl" color="success" tabularNums>0</title>
      <caption>最终 Review</caption>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  **一句话总结**

  VII-F 解决“谁可以运行、如何停止”，VII-G 解决“运行过的对话怎样保存，并在新 Runtime 中继续”。
</box>

## 1. 学习计划与完成情况

### 1.1 本节学习目标

进入 VII-G 之前，我们的 Runtime 已经具有完整的消息、模型、工具、事件和取消控制能力。

但是它存在一个限制：

```text
Runtime A
    ↓
User → Model → Tool → Model
    ↓
RuntimeState.messages
    ↓
Node.js 进程退出
    ↓
内存中的 Conversation 消失
```

因此本节必须解决：

- 如何持久化已经提交的消息事实。
- 如何根据 Session ID 找回历史。
- 如何基于历史创建一个新的 Runtime。
- 如何在新 Runtime 中继续正常对话。
- 如何防止多个 Runtime 静默覆盖同一个 Session。
- 如何处理 Run 和 Persistence 的独立失败。

### 1.2 完成情况

| 目标 | 实现结果 |
|---|---|
| SessionStore 接口 | 已完成 |
| MemorySessionStore | 已完成 |
| SQLiteSessionStore | 已完成 |
| revision CAS | 已完成 |
| Conversation Validator | 已完成 |
| `initialMessages` 恢复 | 已完成 |
| Run → Validate → Save 编排 | 已完成 |
| 独立 Run / Persistence Settlement | 已完成 |
| SQLite 关闭重开恢复 | 已完成 |
| 恢复后继续 Model → Tool → Model | 已完成 |
| 不重放历史 Tool | 已验证 |
| Abort / Single Active Run 兼容 | 已验证 |

**实际工程验证记录：**

Codex 最终报告 `npm test` 176 通过、0 失败，`npm run build`、`npm run typecheck:tests` 以及 Runtime、Tools、Recovery Demo 均通过。

之前独立 Code Review 确认了核心源码与修复逻辑；但没有在独立环境重新执行完整依赖安装和测试，Node 20 也没有实际运行验证。这些应作为验证限制保留在正式笔记中。

### 1.3 本节不解决什么

以下能力明确不属于 VII-G：

- 正在执行的 Agent Loop 断点恢复。
- 进程崩溃后自动继续未完成 Tool。
- Durable Tool Execution（持久化工具执行）。
- 跨 Runtime 执行锁。
- Conversation Merge（对话历史自动合并）。
- Session Tree（会话树）。
- Session Compaction（上下文压缩）。
- 自动重试或自动补偿外部副作用。

我们恢复的是 **Conversation Facts（对话事实）**，不是过去正在运行的 JavaScript 执行现场。

---

## 2. 《从零实现 Agent Runtime》写书 TODO

建议将本节整理为独立章节：

**第七章：SessionStore 与 Conversation Recovery——让 Agent 拥有可以恢复的对话**

这一章的核心不应该是 SQLite 教程，而是围绕一次 Runtime 重建讲清楚架构边界。

### 建议章节结构

{@body const todos=["7.1 为什么 RuntimeState 不能天然跨进程保存","7.2 Session、Conversation 与 RuntimeState 的区别","7.3 Application、Runtime、SessionStore 的 Ownership","7.4 SessionSnapshot 与最小 SessionStore Contract","7.5 Memory / SQLite 的 Revision CAS","7.6 Constructor Recovery 与 ContextBuilder 复用","7.7 Conversation Protocol Validation","7.8 Run 和 Persistence 的双 Settlement","7.9 Code Review：reusable Bug 与修复","7.10 Crash Window、Durable Execution 与工程边界"]}
{@body const [checked,setChecked] = DIL.useState([])}
<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **写书 TODO**
    <text color="secondary" size="xs" tabularNums>{checked.length}/{todos.length}</text>
  </row>
  {#each todos as t,i}
    <checkbox key={i} checked={checked.includes(i)} onChange={v=>setChecked(s=>v?[...s,i]:s.filter(x=>x!==i))}>{t}</checkbox>
  {/each}
</box>

### 必须保留的三个案例

**案例一：Runtime 重建后仍然知道用户叫什么。**

第一轮保存历史，关闭 SQLite，重新创建 Store 和 Runtime。第二轮模型请求包含第一次的历史。

这是最小 Recovery Happy Path。

**案例二：两个 Runtime 同时保存一个 Session。**

两个 Runtime 读取 revision 3。A 保存成功变成 revision 4，B 使用旧 revision 保存时得到 Conflict。

这是 CAS 对历史一致性的保护。

**案例三：Agent Run 成功，但 Session 保存失败。**

`RunOutcome.completed` 已经形成，但 SQLite 保存失败。

这时不能把 Run 改成 aborted，也不能自动重新执行 Tool。

这个案例直接引出本章最重要的理论问题：执行状态、持久化状态与工作流可继续性之间的关系。

---

## 3. 学习素材与工程证据

### 3.1 🔍 源码定位清单

以下是 VII-G 最值得反复阅读的真实代码位置。

| 文件 | 建议重点阅读 |
|---|---|
| `src/runtime/agent-runtime.ts` | `initialMessages` 如何注入、验证及深拷贝 |
| `src/messages/validate-conversation.ts` | ToolCall / ToolResult 的协议完整性 |
| `src/session/session-store.ts` | Snapshot、Store 和 Conflict 契约 |
| `src/session/memory-session-store.ts` | 进程内 CAS 与引用隔离 |
| `src/session/sqlite-session-store.ts` | 原子 SQL 条件写入 |
| `src/demo/conversation-workflow.ts` | Run / Persistence 双 Settlement 与 reusable |
| `src/demo/conversation-recovery-demo.ts` | 完整恢复链路 |
| `src/runtime/context-builder.ts` | 为什么历史恢复后不需要重建 ContextBuilder |
| `src/runtime/runtime-state.ts` | 为什么 RuntimeState 仍然只有 messages |

### 3.2 重点测试定位

| 测试文件 | 学习重点 |
|---|---|
| `conversation-validation.test.ts` | 数据结构和协议校验不是一回事 |
| `session-store.test.ts` | 共享 Store Contract |
| `sqlite-persistence.test.ts` | 真实持久化、版本冲突与数据库损坏 |
| `runtime-recovery.test.ts` | 从恢复历史继续 Agent Loop |
| `application-settlement.test.ts` | 双 Settlement 和失败后继续运行资格 |
| `run-control.test.ts` | VII-F Control 语义没有被 VII-G 破坏 |

### 3.3 重点 Debug 案例：MF-01

首轮 Codex 实现中，`runAndSave()` 有一个重要问题：

```ts
return {
  run,
  persistence,
  reusable: true,
};
```

即使 `SessionStore.save()` 失败，也返回 `reusable: true`。

问题不是消息不合法，而是保存失败后应用层不再拥有可靠的 Session 持久化基线。

最终修复：

```ts
return {
  run,
  persistence,
  reusable: persistence.status === "fulfilled",
};
```

同时对无新增消息而跳过保存的合法路径单独保留 `reusable: true` 的语义。

这是一个非常适合放进书稿的案例：

> 单元测试全部通过，Store 和 Runtime 也都正确，但应用层组合两者时，仍可能出现新的架构 Bug。

说明正确的模块组合，并不天然保证正确的工作流。

## 4. 认知升级：从 Runtime State 到可恢复的 Agent

这是本节最重要的理论部分。

### 4.1 Session 不等于 Runtime

在 VII-G 之前，我们容易把一个 `AgentRuntime` 实例理解为一次完整的会话。

但实际上：

**Runtime 是执行载体，Session 是可以持久化并重新定位的对话历史。**

```text
Session #001
    │
    ├── Runtime A
    │      └── Run 1 → Save revision 1
    │
    └── Runtime B
           └── Load revision 1
                 ↓
               Run 2
                 ↓
               Save revision 2
```

Runtime A 消失，并不意味着 Session 必须消失。

同样，一个 Session 能被两个 Runtime 加载，也不意味着它们自动拥有同时修改 Session 的权利。

### 4.2 Runtime Commit ≠ Persistence Commit

假设 Tool 执行完成：

```text
Tool.execute()
      ↓
RuntimeState.messages.push(toolResult)
      ↓
AgentRuntime committed
      ↓
SessionStore.save()
      ↓
SQLite committed
```

这里存在两个不同的提交边界。

- **Runtime Commit**：事实已经进入 AgentRuntime 内部历史。
- **Persistence Commit**：事实已经成功通过 Store 的条件写入。

两个 Commit 之间存在 Crash Window（崩溃窗口）。

如果进程恰好在中间崩溃，SQLite 里就可能没有最新的 Runtime 事实。

而 VII-G 的 Run Boundary Persistence 本来就接受这个限制。

### 4.3 CAS ≠ Execution Lock

CAS（Compare-and-Swap，比较并交换）只负责在保存时确认版本没有过期。

<box border radius="lg" padding={3} gap={2}>
  <svg viewBox="0 0 330 205" width="100%">
    <rect x="110" y="6" width="110" height="36" rx="7" fill="#E6E9ED" stroke="#9199A4"/>
    <text x="165" y="21" fontSize="11" textAnchor="middle" fill="#273444" fontWeight="600">Session</text>
    <text x="165" y="34" fontSize="10" textAnchor="middle" fill="#4D5968">revision 3</text>
    <path d="M135 42 L80 64 M195 42 L250 64" stroke="currentColor" fill="none" strokeWidth="1.5"/>
    {#each [{x:8,t:"Runtime A"},{x:177,t:"Runtime B"}] as n}
      <rect x={n.x} y="66" width="145" height="43" rx="7" fill="#DDEBFA" stroke="#6E95BC"/>
      <text x={n.x+72} y="83" fontSize="11" fontWeight="600" fill="#26496A" textAnchor="middle">{n.t}</text>
      <text x={n.x+72} y="98" fontSize="10" fill="#45637A" textAnchor="middle">可能都已执行 Tool</text>
    {/each}
    <path d="M80 109 V133 M249 109 V133" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="8" y="135" width="145" height="42" rx="7" fill="#DDF3E8" stroke="#63A781"/>
    <text x="80" y="160" fontSize="11" fontWeight="600" fill="#20583A" textAnchor="middle">保存成功 · rev 4</text>
    <rect x="177" y="135" width="145" height="42" rx="7" fill="#FBE3E3" stroke="#D17C7C"/>
    <text x="249" y="160" fontSize="11" fontWeight="600" fill="#8B3535" textAnchor="middle">CAS Conflict</text>
    <text x="165" y="194" fontSize="10" textAnchor="middle" fill="currentColor">拒绝覆盖，不代表 Tool 未执行</text>
  </svg>
</box>

所以对于营销 Agent 的发券、退款、权益变更等操作：

- SessionStore CAS 只能保证历史写入不被静默覆盖。
- 真正的重复业务操作防护，仍需要业务 API 的幂等机制和授权策略。

### 4.4 Conversation Validity ≠ Workflow Continuability

这是 VII-G Review 后最值得牢牢记住的一点。

一个 Runtime 的历史消息可以完全合法，但其最新事实可能尚未保存成功。

因此：

\[
\text{Conversation Validity} \neq \text{Workflow Continuability}
\]

| 判断 | 负责者 |
|---|---|
| 历史是否符合消息协议 | Conversation Validator |
| 当前事实由谁修改 | AgentRuntime |
| 最新历史是否通过版本条件写入 | SessionStore |
| 当前工作流能否继续 | Application |

这也是为什么 MF-01 的修复应该发生在 `conversation-workflow.ts`，而不是 Validator 或 Agent Loop 中。

### 4.5 Recovery 不等于 Replay

恢复一段历史，不意味着重新执行历史 Tool。

例如：

```text
Stored Conversation
├── user_input
├── model_output(toolCall: issueCoupon)
├── tool_result(success)
└── model_output(final answer)
          ↓
  new AgentRuntime
          ↓
     new run()
```

新的 Runtime 只把历史作为上下文，并不会再次执行 `issueCoupon`。

**Replay（重放执行）和 Recovery（恢复对话）必须分开。**

这是避免业务副作用重复发生的重要架构原则。

---

## 5. 工业级实现对照

我们现在的 Mini Runtime 已经具备真实的 Conversation Recovery 能力，但不应该把它当成完整的生产级 Agent 平台。

| 维度 | VII-G 当前实现 | 工业级可能需要 |
|---|---|---|
| 对话持久化 | SQLite + Memory | PostgreSQL、分布式数据库等 |
| 版本一致性 | Revision CAS | 冲突治理、写入协调、审计 |
| 恢复粒度 | 已保存的 Conversation | 执行检查点、断点续跑 |
| Session 结构 | 单份线性历史 | 分支、裁剪、归档 |
| 业务工具 | 历史不重放 | 幂等 Key、执行日志、效果确认 |
| 并发控制 | 实例级 Active Run | Session 级执行权与 Lease |
| 可观测性 | AgentEvent | Trace、指标、执行审计 |
| 数据安全 | 消息结构验证 | 租户隔离、授权、敏感数据治理 |
| 存储失败 | 显式错误、不可继续标记 | 恢复策略、对账、告警 |

这些是**工业级能力对照，不是 VII-G 未完成事项**。

### 与营销业务 Agent 的关系

未来可以考虑这样的职责分配：

```text
营销运营前端
     ↓
Agent Application
     ├── 身份与 Session 权限
     ├── SessionStore
     └── AgentRuntime
           ├── ModelProvider
           ├── Marketing Tools
           └── Approval
                 ↓
            业务 API
                 ↓
        优惠券 / 活动 / 会员权益
```

这里的 `Approval` 属于 VII-H，目前尚未实现。

而 SessionStore 不应该负责决定用户是否允许发券，也不应该判断优惠券 Tool 能否执行。

这些是执行授权和业务边界，不是存储边界。

### Pi Agent 对照

结合我们在 Part VI 中学习的 Pi 源码设计，本节可以建立以下映射：

| 本项目 | Pi 学习中对应的思想 |
|---|---|
| RuntimeState | 稳定的对话事实 |
| SessionSnapshot | 可保存和重新加载的会话数据 |
| Constructor Recovery | 从历史重新建立运行上下文 |
| ContextBuilder | 将历史事实投影为模型请求 |
| 不持久化 `#active` | Process-local Control 不属于 Session 数据 |
| 不重放 Tool | Conversation 恢复与执行恢复分离 |

Pi 的 Session Tree、分支管理等能力不需要在我们的 Mini Runtime 中照搬。

**值得学习的是它的职责分层，而不是它的功能数量。**

以上是基于我们此前完成的 Pi 源码学习记录进行的理论映射，不代表本轮重新验证了 Pi 最新版本源码。

---

## 6. 知识地图：VII-A～VII-G 的完整架构

到目前为止，七个 Milestone 已经形成比较完整的 Runtime 分层。

<box border radius="xl" padding={3} gap={2}>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    U["Application / Caller"] -->|"Run"| R["AgentRuntime"]
    U -->|"load / save"| S["SessionStore · VII-G"]
    S --> M["Memory / SQLite"]
    S -.->|"snapshot 交由 Application 注入"| R
    R --> ST["RuntimeState · VII-B"]
    R --> CB["ContextBuilder · VII-D"]
    CB --> MP["ModelProvider · VII-A"]
    R --> TL["Tool Registry + Executor · VII-C"]
    R --> EV["AgentEvent · VII-E"]
    R --> CT["Abort + Single Active Run · VII-F"]
    ST -->|"最新消息事实"| CB
  </CodeBlock>
</box>

按职责重新分类：

| 架构维度 | 所属 Milestone | 核心问题 |
|---|---|---|
| Model | VII-A | 怎么调用模型？ |
| State | VII-B | 已发生什么？ |
| Execution | VII-C | 工具怎么运行？ |
| Context | VII-D | 模型下一轮看到什么？ |
| Observation | VII-E | 外部如何观察运行？ |
| Control | VII-F | 谁可以运行、如何停止？ |
| Persistence | VII-G | 历史如何保存与恢复？ |

注意：Persistence 没有替代 State，SessionStore 也没有升级成新的 Agent Loop Owner。

这说明此前持续强调的 **Single Responsibility（单一职责）和 Ownership Boundary（所有权边界）** 已经真正落到了代码结构中。

## 7. 面试视角：如何证明自己理解 Agent Runtime

这一节适合转化成 Agent 应用开发或 Agent 平台工程师的面试素材。

### Q1：Agent 的会话恢复是怎么实现的？

**回答框架：**

我们把 Agent 的执行状态和持久化状态解耦。RuntimeState 只保存已提交的 RuntimeMessage，Application 在 Run 结算后生成快照，通过 SessionStore 保存。恢复时通过 Session ID 加载快照，验证消息协议，再使用 `initialMessages` 初始化新的 Runtime，由 ContextBuilder 生成下一轮模型上下文。

不恢复旧 Promise，也不重放历史 Tool。

### Q2：为什么 SessionStore 不直接放进 AgentRuntime？

因为 Runtime 的主要职责是推进 Agent Loop、维护消息事实和执行控制。

如果 Runtime 还负责数据库读写，它就要处理存储失败、版本冲突和持久化生命周期，增加核心模块的耦合。

当前选择让 Application 编排持久化，使 Runtime 能独立测试和复用。

### Q3：两个 Agent 同时修改同一个 Session 怎么办？

通过 revision CAS 防止静默覆盖。

但必须指出 CAS 只能检测保存冲突，不能防止两个 Agent 在保存之前都已执行 Tool。

对外部业务副作用，需要另外设计执行授权、幂等和必要的 Session 级协调。

### Q4：Provider 失败后，为什么还要保存消息？

因为 Runtime 可能已提交 user_input 或其他合法事实。

Run 失败不等于本轮没有产生任何事实。

Application 应当分别记录 Run settlement 和 Persistence settlement，避免丢失合法历史，也避免把保存成功误认为 Run 成功。

### Q5：如何处理非法的历史 ToolCall？

恢复前验证 ToolCall 与 ToolResult 的完整配对。

若发现缺失、重复或孤立结果，拒绝把它作为可恢复 Conversation 使用。

不自动补造 ToolResult，更不重放历史 Tool，因为这些操作可能错误描述或重复产生外部副作用。

### Q6：你在 Code Review 中实际发现过什么架构问题？

可以讲我们真实遇到的 MF-01：

> 首轮实现中，Run 完成后的历史消息虽然通过协议校验，但 SessionStore 保存失败时，应用层仍返回可继续运行。我们识别出消息合法性与工作流可继续性不是同一个概念，将 `reusable` 的判断放到 Application 层，并新增保存失败、CAS Conflict 的回归断言，没有修改 AgentRuntime 核心。

相比只回答“我实现了 SQLite 会话存储”，这个例子更能体现对 Agent 系统正确性边界的理解。

---

## 8. 思考题

本节不需要继续写代码，但建议用下面几个场景检验是否真正掌握了架构。

{@body const questions=[{q:"场景 1：发券 Tool 已成功，SQLite 保存前进程崩溃。下次恢复后能否直接再次发券？",a:"不能。Session 中缺少最新 ToolResult，并不证明业务动作没有发生。VII-G 不提供执行级恢复或幂等保证，需要通过业务 API 查询、幂等键或未来 Durable Execution 方案处理。"},{q:"场景 2：Run 返回 completed，但 SessionStore.save() 返回 Conflict。是不是应该把 RunOutcome 改成 failed？",a:"不应该。Run 与 Persistence 是独立结算边界。completed 仍然表示 Run 的真实结果；Conflict 表示本轮历史未成功按预期版本保存，当前 Workflow 不可直接继续。"},{q:"场景 3：Provider 发生网络异常，但 RuntimeState 里已经有 user_input。这条消息应当删除吗？",a:"不应该自动删除。它是已经提交的 Runtime 事实。只要整个 Conversation 仍符合恢复协议，可以保存，并保留 Provider 原始错误。"},{q:"场景 4：为什么使用 revision CAS 后，仍然可能重复执行 Tool？",a:"因为 CAS 在保存时检查版本，而 Tool 可能已经在保存前执行。两个 Runtime 能同时读取同一版本并运行，只有提交持久化更新时才会有一个发生冲突。"},{q:"场景 5：为什么不能把 AbortSignal、#active 和 Provider 实例一起序列化？",a:"这些是进程内的执行控制或运行对象，不是稳定的会话事实。新 Runtime 应重新构建它们，而不是尝试复活旧的 JavaScript 执行环境。"}]}
{@body const [openQuestion,setOpenQuestion]=DIL.useState(-1)}
<box border radius="lg" padding={3} gap={2}>
  {#each questions as item,i}
    <box key={i} gap={2}>
      <pressable onClick={()=>setOpenQuestion(openQuestion===i?-1:i)}>
        <row align="start" gap={2}>
          <box flex="1">
            <text weight="medium" size="sm">{item.q}</text>
          </box>
          <icon name={openQuestion===i?"chevron-up":"chevron-down"} color="secondary"/>
        </row>
      </pressable>
      {#if openQuestion===i}
        <box background="surface-secondary" radius="md" padding={3}>
          <text size="sm">{item.a}</text>
        </box>
      {/if}
      {#if i<questions.length-1}<divider color="subtle"/>{/if}
    </box>
  {/each}
</box>

建议你先尝试自己回答，再展开参考思路。

能把这些问题说清楚，说明理解的已经不只是 SessionStore 的 API，而是 Agent 系统的运行边界。

---

## 9. Pending 回收与下一阶段衔接

### 9.1 VII-G 本节已关闭的问题

| Pending | 结果 |
|---|---|
| Conversation 如何持久化 | SessionStore + Snapshot |
| 如何恢复到新的 Runtime | `initialMessages` |
| 恢复时是否重放 Tool | 不重放 |
| 多实例保存如何防覆盖 | Revision CAS |
| 如何处理损坏历史 | 严格验证、显式拒绝 |
| Run Error 是否阻断所有保存 | 不一定；合法事实仍可保存 |
| Run / Save 双重失败 | 双 Settlement |
| 保存失败后能否继续 | `reusable: false` |
| 是否需要 SessionManager | 当前不需要 |
| 是否提前实现 Durable Execution | 不实现 |

### 9.2 有意延期的问题

| Pending | 归属 |
|---|---|
| beforeToolCall 执行前拦截 | VII-H |
| Human Approval（人工审批） | VII-H |
| 拒绝执行后的 ToolResult 语义 | VII-H 决策 |
| Weather Agent 完整链路 | VII-I |
| Durable Tool / Durable Approval | Part VII v1 之后重新规划 |
| Session Tree / Compaction | 未来真实需求 |
| 跨 Runtime 执行协调 | 未来业务架构 |
| Node 20 环境验证 | 工程兼容性补充 |

### 9.3 VII-H 的真正起点

VII-G 完成后，我们已经可以恢复一段对话，并在新的 Runtime 中继续调用模型和工具。

但是目前 Tool 执行路径中，还缺少一个问题：

> **模型提出了 ToolCall，Runtime 已验证参数，但在真正执行 Tool 之前，谁有权决定允许还是拒绝？**

这将是 VII-H 的核心。

它要新增的是 **Execution Authorization（执行授权）**，而不是 SessionStore 的新职责。

本节不要提前实现 Approval，也不要把审批状态塞进 SessionSnapshot。

---

## 10. GPT Closure → Codex Documentation Task

固定 9 项章节已经完成。下面这份提示词用于让 Codex 将学习成果落地到仓库，避免它自行重新组织架构结论。

<WritingBlock id="73844" variant="document"># Codex Documentation Task — Part VII-G Milestone Closure

## Goal

Part VII-G：SessionStore + Conversation Recovery 已完成 Implementation、Runtime Verification、Code Review 和 Must Fix 修复。

现在进入正式文档归档阶段。

请基于当前仓库最终源码、测试、README，以及下面提供的 ChatGPT 固定 9 项学习收尾内容，生成正式 Milestone Closure Note。

## Required Files

1. 新增学习笔记：

`day08-part-vii-g-session-store-conversation-recovery.md`

请放入仓库现有 Part VII 学习笔记目录，遵循已有命名规则。

2. 更新 Part VII 总体 README：

- VII-G 改为 Done。
- VII-H 改为 Next。
- VII-I 保持 Planned。
- 添加 VII-G 学习笔记和源码归档链接。

3. 如果现有 source 归档结构支持，按已有约定整理 VII-G 的 Architecture / Implementation / Review 资料。

不要覆盖、修改之前 Milestone 的历史决策。

## Content Requirements

正式笔记需要完整保留：

1. Milestone Goal 和 Starting Point。
2. 本次最重要的 Architecture Questions。
3. G-AD01～G-AD20 最终决策。
4. 讨论过但未采用的方案与原因。
5. 真实代码修改和模块 Ownership。
6. SQLite revision CAS、Conversation Validation 和 Constructor Recovery。
7. Runtime Verification：176 项测试及实际 Demo 证据。
8. MF-01 的发现、原因、修复与测试证据。
9. Code Review 结果及未阻断的问题。
10. Theory Feedback：Runtime Commit、Persistence Commit、Workflow Continuability。
11. Pi Agent 源码学习映射及有意差异。
12. 工业级实现差距。
13. 《从零实现 Agent Runtime》书稿素材、面试视角和思考题。
14. Pending 回收及 VII-H 衔接。
15. 🔍 源码定位清单。

## Accuracy Requirements

- 真实代码事实以当前仓库为准。
- ChatGPT 收尾用于理论、设计原因及知识组织。
- 不要把示意代码当成已实现 API。
- 区分首次实现与 Fix 后的最终实现。
- 明确保留独立测试复现和 Node 20 兼容性验证限制。
- 不得声称实现了 Durable Execution、Approval、Session Tree 或跨进程执行锁。
- 不要在文档归档任务中修改 Runtime 核心代码。

## Verification

完成后：

- 检查 Markdown 链接和相对路径。
- 检查 G-AD01～G-AD20 无遗漏。
- 检查 README 进度与笔记一致。
- 检查所有源码定位真实存在。
- 运行 `git diff --check`。
- 报告修改的文件及其职责。

本任务只做文档归档，不做新功能开发，不自动创建 Git Commit。

最后输出 Documentation Summary，供 ChatGPT 最终复核。</WritingBlock>

## 本节最终学习结论

<box border radius="xl" padding={3} gap={2}>
  <row align="center" gap={2}>
    <icon name="check-circle-2" color="success" size="lg"/>
    **Part VII-G：Milestone Closure 完成**
  </row>
  <divider color="subtle"/>
  <text weight="medium">本节最应该记住的一句话：</text>
  Agent 的对话历史、运行状态和持久化状态，虽然彼此相关，但属于不同的所有权和提交边界。
  <text color="secondary" size="sm">Runtime 负责事实，Store 负责保存，Application 负责协调两者并判断是否能够安全继续。</text>
</box>

接下来把这份固定章节和 Codex Documentation Task 交给 Codex，生成正式的 VII-G 学习笔记。归档复核完成后，我们就进入 **Part VII-H：beforeToolCall + 简单 Human Approval**。


### ChatGPT

> Message ID: `b46711c3-6320-45ec-9c73-5ebeb2e3f4da`; content: `text`; channel: `final`; recipient: `all`

---

## 10. GPT Closure → Codex Documentation Task

固定 9 项章节已经完成。下面这份提示词用于让 Codex 将学习成果落地到仓库，避免它自行重新组织架构结论。

<WritingBlock id="73844" variant="document"># Codex Documentation Task — Part VII-G Milestone Closure

## Goal

Part VII-G：SessionStore + Conversation Recovery 已完成 Implementation、Runtime Verification、Code Review 和 Must Fix 修复。

现在进入正式文档归档阶段。

请基于当前仓库最终源码、测试、README，以及下面提供的 ChatGPT 固定 9 项学习收尾内容，生成正式 Milestone Closure Note。

## Required Files

1. 新增学习笔记：

`day08-part-vii-g-session-store-conversation-recovery.md`

请放入仓库现有 Part VII 学习笔记目录，遵循已有命名规则。

2. 更新 Part VII 总体 README：

- VII-G 改为 Done。
- VII-H 改为 Next。
- VII-I 保持 Planned。
- 添加 VII-G 学习笔记和源码归档链接。

3. 如果现有 source 归档结构支持，按已有约定整理 VII-G 的 Architecture / Implementation / Review 资料。

不要覆盖、修改之前 Milestone 的历史决策。

## Content Requirements

正式笔记需要完整保留：

1. Milestone Goal 和 Starting Point。
2. 本次最重要的 Architecture Questions。
3. G-AD01～G-AD20 最终决策。
4. 讨论过但未采用的方案与原因。
5. 真实代码修改和模块 Ownership。
6. SQLite revision CAS、Conversation Validation 和 Constructor Recovery。
7. Runtime Verification：176 项测试及实际 Demo 证据。
8. MF-01 的发现、原因、修复与测试证据。
9. Code Review 结果及未阻断的问题。
10. Theory Feedback：Runtime Commit、Persistence Commit、Workflow Continuability。
11. Pi Agent 源码学习映射及有意差异。
12. 工业级实现差距。
13. 《从零实现 Agent Runtime》书稿素材、面试视角和思考题。
14. Pending 回收及 VII-H 衔接。
15. 🔍 源码定位清单。

## Accuracy Requirements

- 真实代码事实以当前仓库为准。
- ChatGPT 收尾用于理论、设计原因及知识组织。
- 不要把示意代码当成已实现 API。
- 区分首次实现与 Fix 后的最终实现。
- 明确保留独立测试复现和 Node 20 兼容性验证限制。
- 不得声称实现了 Durable Execution、Approval、Session Tree 或跨进程执行锁。
- 不要在文档归档任务中修改 Runtime 核心代码。

## Verification

完成后：

- 检查 Markdown 链接和相对路径。
- 检查 G-AD01～G-AD20 无遗漏。
- 检查 README 进度与笔记一致。
- 检查所有源码定位真实存在。
- 运行 `git diff --check`。
- 报告修改的文件及其职责。

本任务只做文档归档，不做新功能开发，不自动创建 Git Commit。

最后输出 Documentation Summary，供 ChatGPT 最终复核。</WritingBlock>

## 本节最终学习结论

<box border radius="xl" padding={3} gap={2}>
  <row align="center" gap={2}>
    <icon name="check-circle-2" color="success" size="lg"/>
    **Part VII-G：Milestone Closure 完成**
  </row>
  <divider color="subtle"/>
  <text weight="medium">本节最应该记住的一句话：</text>
  Agent 的对话历史、运行状态和持久化状态，虽然彼此相关，但属于不同的所有权和提交边界。
  <text color="secondary" size="sm">Runtime 负责事实，Store 负责保存，Application 负责协调两者并判断是否能够安全继续。</text>
</box>

接下来把这份固定章节和 Codex Documentation Task 交给 Codex，生成正式的 VII-G 学习笔记。归档复核完成后，我们就进入 **Part VII-H：beforeToolCall + 简单 Human Approval**。


## Turn 14


### User

> Message ID: `49629f5c-265a-4734-b24a-b99b854d4b74`; content: `text`; channel: `None`; recipient: `all`

我原来的提示词是这样的：当前 **Part VII-G** 已完成。



请基于：



1. 当前仓库的真实代码；
2. 本次与 ChatGPT 的完整学习 / 架构讨论记录；
3. Codex 本轮实际实现、测试和 Debug 过程；

生成本 Milestone 的最终工程学习笔记。



这不是传统课程总结，而是一份 **Engineering Learning Log + Architecture Record**。



请重点记录“设计是如何形成并被代码验证的”，不要只总结概念。



固定结构：



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
    1. \


额外要求：



- 所有代码描述必须以当前仓库真实实现为准，禁止根据聊天内容臆测代码。
- 明确区分“最终采用方案”和“讨论过但没有采用的方案”。
- 明确记录本轮故意没有实现的能力，以及它们计划进入哪个后续 Part。
- Architecture Snapshot 应体现当前 Runtime 的真实调用关系。
- Bugs / Debugging 不要省略，这是本阶段非常重要的学习材料。
- Pi Mapping 只记录本次真正涉及的 Pi 对照，不为了完整而强行增加。
- 如果聊天中的早期设计与最终代码不一致，以最终代码为准，并说明设计发生了什么变化。


### ChatGPT

> Message ID: `d444b97b-e12d-4b1f-b732-64557c98b871`; content: `text`; channel: `final`; recipient: `all`

我建议**继续使用你原来的提示词作为主模板**，不要替换成我刚才给出的 `Codex Documentation Task`。

你原来的版本其实更符合我们整个 Part VII 的工程学习体系。

因为我们要产出的不是普通学习笔记，而是：

**Engineering Learning Log + Architecture Record（工程学习日志 + 架构决策记录）**

它不仅记录最终实现，还要完整还原：

**Architecture Analysis → Design Decision → Implementation → Verification → Debug → Review → Closure**

我刚才提供的 Documentation Task 更偏向最终文档的内容清单，虽然覆盖范围广，但没有你原来那套 17 章节那么清晰，也不够强调架构决策的形成过程。

### 两套模板怎么取舍？

| 对比 | 你原来的模板 | 我刚才的模板 |
|---|---|---|
| 17 章节固定结构 | 完整保留 | 没有严格保留 |
| 架构决策形成过程 | 强调 | 有涉及 |
| Debug 历史 | 单独章节 | 有要求，但相对弱 |
| 真实代码证据 | 强调 | 强调 |
| Pi Mapping | 独立章节 | 有涉及 |
| Architecture Snapshot | 独立章节 | 未独立规定 |
| 长期作为写书素材 | 更适合 | 可以作为补充 |
| 与 VII-A～VII-F 笔记保持一致 | **最好** | 不够一致 |

因此，建议：

- **固定 9 项**：由 ChatGPT 负责理论提炼、认知升级、写书素材和学习收尾。
- **固定 17 章节**：由 Codex 基于实际仓库、完整讨论和工程证据形成正式 Markdown 学习笔记。
- 两者相互补充，而不是用 9 项替代 17 章节。

## 推荐你最终使用的 Codex 提示词

我保留你原来的 17 章节结构，仅补充 VII-G 本轮真正需要注意的几个要求。

<WritingBlock id="82641" variant="document"># Part VII-G — Milestone Closure Note Generation

当前 **Part VII-G：SessionStore + Conversation Recovery** 已完成 Implementation、Runtime Verification、Code Review、Must Fix 修复及最终复核。

请基于：

1. 当前仓库的真实代码；
2. 本次与 ChatGPT 的完整学习 / 架构讨论记录；
3. Codex 本轮实际实现、测试和 Debug 过程；
4. ChatGPT 最终输出的固定 9 项学习收尾章节；

生成本 Milestone 的最终工程学习笔记。

这不是传统课程总结，而是一份 **Engineering Learning Log + Architecture Record**。

请重点记录：

**设计是如何形成的、为什么做出这些决策、代码如何实现、测试如何验证、Code Review 如何发现并修复问题。**

不要只总结概念或罗列最终功能。

## 一、固定结构（必须完整保留）

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

不要随意合并、删除或重命名这些一级章节。

## 二、架构与代码准确性

- 所有代码描述必须以当前仓库的真实实现为准，禁止根据聊天内容臆测代码。
- 明确区分“最终采用方案”和“讨论过但没有采用的方案”。
- 明确保留 G-AD01～G-AD20 的最终决策、形成原因与代码证据。
- 如果聊天中的早期设计与最终代码不一致，以最终代码为准，同时记录设计演进和变化原因。
- 如果 ChatGPT 的总结与真实源码冲突，应指出差异，不得默默采用错误描述。
- 当前 `RuntimeState` 仍然只有 messages，不得把 Session 或 revision 描述为 RuntimeState 的内部字段。
- 区分 Runtime Commit、Persistence Commit 与 Workflow Continuability。
- 不要把 revision CAS 描述成跨 Runtime 执行锁。
- 不要把 Conversation Recovery 描述成正在执行的 Agent Loop 恢复。

## 三、本节必须保留的工程证据

### 1. Architecture Decisions

重点记录：

- 为什么选择 Application-level Persistence Orchestration。
- 为什么使用构造时的 `initialMessages` 恢复，而不是运行中的 `restore()`。
- 为什么采用 SQLite + MemorySessionStore。
- 为什么使用 revision CAS。
- 为什么采用 Run Boundary Persistence，而不实现逐消息 checkpoint。
- 为什么非法 Conversation 不允许自动修复。
- 为什么 Run Error 和 Persistence Error 必须分别结算。

### 2. Bugs / Debugging

必须完整记录本次实际发生的 MF-01：

**首轮实现中，SessionStore 保存失败时，Application Workflow 仍然返回 `reusable: true`。**

要求记录：

- Bug 发生的位置。
- 首轮真实代码的行为。
- 为什么已有测试通过仍存在架构错误。
- ChatGPT Code Review 如何发现这一问题。
- Conversation Validity 与 Workflow Continuability 的区别。
- Codex 最小范围修复。
- 修复后的真实代码。
- 对应回归测试和最终 Review 结论。

同时保留 Codex 实现过程中其他有实际证据的 Debug 记录。

禁止虚构没有发生过的 Bug 或排查过程。

### 3. Runtime Verification

记录最终实际执行结果：

- `npm test`：176 pass、0 fail、0 skipped。
- `npm run build`。
- `npm run typecheck:tests`。
- `npm run demo:runtime`。
- `npm run demo:tools`。
- `npm run demo:recovery`。
- `git diff --check`。

区分 Codex 实际执行的验证与 ChatGPT 的静态 Code Review。

保留尚未独立执行 Node 20 兼容性验证等限制。

### 4. Final Architecture Snapshot

必须根据真实代码展示：

- Application / Caller
- AgentRuntime
- RuntimeState
- ContextBuilder
- ModelProvider
- ToolRegistry / ToolExecutor
- AgentEvent / Subscriber
- Abort + Single Active Run
- SessionStore
- MemorySessionStore / SQLiteSessionStore

建议使用 Mermaid 绘制真实调用关系。

不要把逻辑上关联的模块错误绘制为直接代码依赖。

## 四、Theory Feedback 与 Pi Mapping

请重点提炼本轮的认知升级：

1. Session ≠ Runtime。
2. Conversation Recovery ≠ Execution Recovery。
3. Runtime Commit ≠ Persistence Commit。
4. CAS ≠ Execution Lock。
5. Conversation Validity ≠ Workflow Continuability。
6. Recovery ≠ Tool Replay。
7. Run Settlement ≠ Persistence Settlement。

Pi Mapping 只记录我们在既有 Part VI / Day07 Pi 源码学习中真正确认过的对应机制。

如果没有充分的 Pi 源码证据，不要为了完整性强行增加对照，更不能把 Mini Runtime 自己的实现说成 Pi 官方实现。

## 五、Deferred Work

明确记录本轮故意没有实现的能力，以及后续归属：

- VII-H：beforeToolCall + 简单 Human Approval。
- VII-I：Weather Agent 完整链路。
- Part VII v1 之后：Durable Tool Execution、Durable Approval、Session Tree、Compaction、跨实例执行协调等能力。

不要擅自增加 VII-J～VII-M。

## 六、文档与归档要求

1. 按已有 Part VII 笔记目录规范，生成：

   `day08-part-vii-g-session-store-conversation-recovery.md`

2. 更新 Part VII 总体 README：
   - VII-G → Done；
   - VII-H → Next；
   - VII-I → Planned。

3. 保留源码定位清单，确保路径真实存在。

4. 参考 VII-F 最终笔记的写作风格、架构决策密度、工程证据组织和源码链接方式，保持整套 Part VII 笔记一致。

5. Markdown 是唯一主版本，不生成 PDF / Word。

6. 只进行文档创建与更新，不修改 Runtime 功能代码，不自动提交 Git。

## 七、完成后输出

请输出：

1. Documentation Summary。
2. 新增和修改的文件。
3. 17 个固定章节的完整性检查。
4. G-AD01～G-AD20 的覆盖检查。
5. 源码和测试引用的准确性检查。
6. README 状态更新结果。
7. `git diff --check` 结果。
8. 是否发现聊天结论与最终代码不一致的地方，以及如何处理。
9. 是否存在未解决的文档归档问题。

**注意：这次任务是 Milestone Documentation Closure，不是新一轮 Architecture Design 或 Code Implementation。**</WritingBlock>

### 最终建议

以后从 **VII-H、VII-I，一直到你后续开发营销业务 Agent**，都可以沿用这套分工：

**ChatGPT 固定 9 项学习收尾 → Codex 固定 17 章节工程归档 → ChatGPT 最终文档复核。**

这样你的学习成果会同时形成两种资产：

- **个人知识体系**：理解为什么这么设计，能够解释和迁移。
- **可追溯工程记录**：每个架构决定都有真实代码、测试和 Debug 证据支撑。

尤其是你计划写的《从零实现 Agent Runtime》，固定 17 章节能够为未来整理成正式书稿提供比单纯课程总结更可靠的第一手材料。

---

If you want, I can:

- 继续写书章节后续内容
- 详细讲解 'Conversation Validity ≠ Workflow Continuability'
- 展开说明工业级对话恢复与当前实现差异
