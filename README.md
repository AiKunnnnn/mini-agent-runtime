# mini-agent-runtime

《从零实现 Agent Runtime》的学习与实现仓库。

这个项目已经进入逐里程碑实现阶段：把 Agent Runtime 学习与源码分析形成的架构认识，逐步转化为可运行的 Node.js + TypeScript 代码。

## 当前内容

```text
mini-agent-runtime/
├── src/        Mini Agent Runtime 源码
├── test/       自动化测试
├── notes/      每日学习资料
├── book/       未来正式书稿
├── scripts/    文档导出脚本
├── AGENT.md    AI 协作规范
├── WORKFLOW.md 学习与产出流程
└── README.md   项目入口
```

## 项目规范

- [AI 协作规范](AGENT.md)
- [学习与产出流程](WORKFLOW.md)

## 学习笔记

完整学习笔记目录见：[notes/README.md](notes/README.md)。

当前已完成：

- [Day08 / Part VII：Mini Agent Runtime 工程实现](notes/day08-mini-agent-runtime-implementation/README.md)
- VII-A～VII-H 已完成；VII-H 的 beforeToolCall + Simple Human Approval 已通过最终 ChatGPT Review（**PASS，Must Fix = 0**），完成 [Engineering Learning Log 与 Milestone Closure](notes/day08-mini-agent-runtime-implementation/day08-part-vii-h-before-tool-call-simple-approval.md)。当前最终测试基线为 **229 项通过、0 项失败**。
- Part VII v1 固定为 VII-A～VII-I 九个 Milestone；VII-I Weather Agent 为 **Next**，尚未开始实现。VII-G 的 [Conversation Persistence & Recovery 归档](notes/day08-mini-agent-runtime-implementation/day08-part-vii-g-session-store-conversation-recovery.md)保留其 176 项历史验收记录。

## 构建与测试

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm test
npm run typecheck:tests
```

## Part VII-C：Tool Registry + Tool Executor + Tool Loop

`AgentRuntime` 接收已有的 `ModelProvider`，在同一个实例中保留对话：

```ts
import { AgentRuntime } from "./src/runtime/agent-runtime.ts";

// provider 是一个实现 ModelProvider 接口的实例。
const runtime = new AgentRuntime(provider);
const outcome = await runtime.run("Hello");
await runtime.run("How are you?");
const history = runtime.getMessages();
```

每次 `run()` 只记录一次 `user_input`，通过已有 `toModelMessage()` 将完整历史转为模型消息，每次 Provider 回答先记录为 `model_output`：

- `stop` → `{ type: "completed" }`。
- `tool_calls` → 顺序执行所有工具，逐个保存 `tool_result`，在同一次 run 内继续调用 Model。
- `length` / `unknown` → `{ type: "unsupported", finishReason }`，保留输出并结束本次运行。
- 最后允许的 Model Turn 返回 `tool_calls` → 保存输出，先验证调用存在且非空；不执行该批工具，为每个调用写入 `TOOL_EXECUTION_SKIPPED` 结果，再返回 `{ type: "limit_reached", maxTurns }`。
- Provider 异常原样向上传播；已记录的用户输入保留，不制造模型输出。

`getMessages()` 返回包含嵌套 tool arguments 的深拷贝，修改它不会改变内部状态。请求和响应中的可变引用也与内部状态隔离。

通过 `new AgentRuntime(provider, { registry, maxTurns: 5 })` 配置工具与回合上限。`registry` 是 `ToolRegistry`，提供 `register(tool)`、`get(name)` 和 `listDefinitions()`；名称重复注册直接抛错。未传入时使用空 Registry，空工具请求省略 `tools`。`maxTurns` 默认为 5，必须为正安全整数，每次 run 重新计数；一次 generate 算一个 Turn，与该次工具数量无关。State 仍然只有 messages。

可执行 `Tool<TArgs>` 包含 `definition` 和 `execute(args)`；Tool 作者负责让 `definition.parameters` 描述 TArgs。Executor 使用同一份 JSON Schema，通过 Ajv（draft-07、严格模式、同步校验）校验 unknown 输入，不进行类型转换、补默认值或删除额外字段。Registry 保存 Schema 副本，对外返回副本，防止 Provider 或调用方更改执行规则。Executor 按名称缓存已编译校验器。

工具返回 JSON 兼容值。既有 `RuntimeToolMessage.content` 保存 JSON：成功为 `{ success: true, result }`；失败为 `{ success: false, error: { code, message } }`，通过 `toolCallId` 对应之前记录的调用，工具名从该调用读取。错误码为 `TOOL_NOT_FOUND`、`INVALID_ARGUMENTS` 和 `TOOL_EXECUTION_FAILED`，均回流给模型。原有工具异常仅在 execute 调用边界内规范化，VII-H 的 Hook 错误使用下文独立契约；无效 Schema、内部不变量或结果序列化错误继续抛出。无需修改 Provider Adapter 或消息类型。

确定性 Tool Loop Demo（不访问网络，不调用真实 LLM）：

```bash
npm run demo:tools
```

Demo Provider 第一回合请求 add(2, 3)，第二回合读取 Runtime 实际写回的 Tool Result 并据此生成回答。自动化测试独立验证成功、失败、顺序执行、预算及引用隔离。

当前工具仅支持顺序调用；Runtime 保持 Single Active Run，Conversation Recovery 见下文。达到上限时，Runtime 为最后一批未执行调用逐个写入失败结果，错误码为 `TOOL_EXECUTION_SKIPPED`，message 为 `Tool execution was skipped because maxTurns was reached.`。正常返回 `limit_reached` 后，调用与结果保持配对，后续 run 的请求会在这些结果之后追加新的用户输入。

配置好下文的 `.env` 后，运行真实 Runtime Demo：

```bash
npm run demo:runtime
```

Demo 使用同一个 Runtime 先输入“我叫小明”，再询问“我叫什么名字？”，每轮打印 outcome 和完整历史。正常情况下，两轮均返回 `completed`，最终历史包含四条消息，第二轮回答引用“小明”。若未返回 `completed`，Demo 打印已保存历史并停止。该命令会调用真实 API。

## Part VII-G：SessionStore + Conversation Recovery

Application 在 Run settle 后读取并验证已提交历史，再保存完整 Snapshot。Runtime 不依赖 Store，State 仍然只有 messages；revision 只属于持久化 Session。

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}
interface SessionStore {
  load(sessionId: string): Promise<SessionSnapshot | null>;
  save(snapshot: SessionSnapshot): Promise<SessionSnapshot>;
}
```

`MemorySessionStore` 用于确定性测试；`SQLiteSessionStore(filename)` 打开或创建真实 SQLite 文件，调用方用 `close()` 关闭连接。SQLite 使用固定版本 `better-sqlite3@11.10.0`，保留 Node.js >=20 要求。该原生依赖需要对应 Node ABI 的预编译包或本机编译工具。

`save()` 输入 revision 是 expected revision：0 仅用于创建，成功返回 1；更新成功递增 1。不匹配或更新不存在的 Session 抛出 `SessionConflictError`，不覆盖、不合并、不自动重试。revision 必须是非负安全整数，到 `Number.MAX_SAFE_INTEGER` 后不能继续保存。SQLite 创建使用唯一主键与 `ON CONFLICT DO NOTHING RETURNING`，更新使用 `WHERE session_id = ? AND revision = ? RETURNING`；单条数据库语句提供原子 CAS，无独立读取版本后的无条件写入。

恢复必须明确要求 Session 存在，load 失败向上传播；不能回退成空会话：

```ts
const saved = await store.load(sessionId);
if (saved === null) throw new Error("Saved session does not exist.");
const runtime = new AgentRuntime(provider, { initialMessages: saved.messages });
```

构造时对 unknown 数据进行结构和协议校验，再深拷贝历史。恢复不调用模型或 Tool、不发事件，不要求历史工具仍注册。`validateConversation()` 同时保护 Store 和恢复入口：允许空历史、连续用户消息、只有用户输入的失败 Run、空模型输出、完整批次，以及 opaque 的 ToolResult 字符串；拒绝非法字段、不可无损 JSON 持久化的参数、重复调用 ID、孤立/重复/跨批次结果及未完成调用。不会解析 ToolResult 业务内容或因失败结果拒绝历史。调用 ID 在整个保存的 Conversation 中必须唯一；如果 Provider 重复使用 ID，该历史会被拒绝保存，不改变已提交 Runtime 事实。

[应用层示例](src/demo/conversation-workflow.ts) 的 `runAndSave()` 分别返回 `run` 和 `persistence` settlement，保留原始错误对象。Provider Error 后的合法 user_input 仍可保存；保存错误不会覆盖 Provider Error、变成 aborted 或重新运行 Tool。`reusable` 表达当前 Application Workflow 是否可以安全继续下一次 Run → Save，不仅表示消息协议是否合法。保存成功时为 true，包括 Run rejected 但合法历史成功保存的情况；保存失败（包括 CAS Conflict）或快照非法时为 false。调用方必须显式处理这些失败，不能根据该流程自动继续下一轮。示例不会自动恢复、重试、加载 Session、回滚内存事实或重放 Tool。非法历史不保存、不修补；调用方应停止复用该 Runtime，可以显式加载最后一次成功保存的 Session 并创建新 Runtime。再次调用示例流程前也会校验历史，防止非法历史继续运行。Pre-aborted 且无新增消息时，persistence 为 skipped，reusable 为 true，不创建或递增 Session。

调用方必须顺序 await `Run → Snapshot → Validate → Save → Next Run`，并使用保存返回的新 revision。Runtime 的 Active Run ownership 仅覆盖 run 本身；CAS 不提供跨 Runtime 执行锁。

```bash
npm run demo:recovery
npm run typecheck:tests
```

Recovery Demo 使用确定性 Mock Provider 和临时文件数据库，展示首次运行、保存 revision 1、停用旧 Runtime、关闭重开 SQLite、恢复到新 Runtime、模型收到历史、第二次保存 revision 2；结束后清理临时数据库。`test/application-settlement.test.ts` 包含 Run 和 Save 同时失败的可观察示例。

本阶段是 Conversation Recovery，不恢复 Promise、正在运行的 Loop、Tool 或 HTTP 请求；不提供 checkpoint、自动 retry、合并、队列或 SessionManager。

## Part VII-H：beforeToolCall + Simple Human Approval

状态：**Done**。最终 ChatGPT Review **PASS，Must Fix = 0**；最终基线为 229 项测试通过。设计、代码与验证证据见 [Engineering Learning Log](notes/day08-mini-agent-runtime-implementation/day08-part-vii-h-before-tool-call-simple-approval.md)，对应 [Architecture Source](notes/day08-mini-agent-runtime-implementation/source/day08-part-vii-h-architecture-chatgpt-source.md)、[Review Source](notes/day08-mini-agent-runtime-implementation/source/day08-part-vii-h-review-chatgpt-source.md) 和 [Codex Implementation Source](notes/day08-mini-agent-runtime-implementation/source/day08-part-vii-h-codex-implementation-source.md)。

Application 可以在构造 Runtime 时注入可选的 `beforeToolCall`。Hook 位于 ToolExecutor 的 Registry Lookup 和 Ajv Validation 之后、`Tool.execute()` 之前；不存在的工具、非法参数以及 maxTurns 跳过的调用不会触发 Hook。直接使用 `new ToolExecutor(registry, { beforeToolCall })` 也支持同一契约，已有 `new ToolExecutor(registry)` 保持兼容。

```ts
import type { BeforeToolCallHook } from "./src/tools/before-tool-call.ts";

// applicationApproval 是应用提供的异步人工确认 Handler。
const beforeToolCall: BeforeToolCallHook = async ({ toolCall, signal }) => {
  const approved = await applicationApproval(toolCall, signal);
  return { type: approved ? "allow" : "deny" };
};
const runtime = new AgentRuntime(provider, { registry, beforeToolCall });
const outcome = await runtime.run("执行需要批准的操作", { signal: controller.signal });
```

Hook 可以同步或异步返回最终 `allow` / `deny`；等待人工审批发生在 Application Handler 内部。`allow` 继续执行，`deny` 不调用 Tool 并产生 `TOOL_EXECUTION_DENIED`。同步 throw、Promise reject、非法返回值均不执行 Tool，产生 `TOOL_PRE_EXECUTION_FAILED`，固定消息为 `Pre-execution authorization failed.`，原始 Hook 错误不会回流模型。失败结果仍使用现有 tool_result，模型可以继续回答，拒绝不等于取消整个 Run。未配置 Hook 时保持原有执行行为。

Hook 收到已通过 Schema 校验的 ToolCall 副本，修改其 ID、名称或嵌套 arguments 不会影响已记录历史和实际执行参数。Hook 接收 Caller 原始 AbortSignal；Executor 自己监听该 Signal，因此即使 Handler 永久 pending，Abort 也能结束审批等待并释放当前 Run。allow 后、真正调用 Tool 前仍检查取消。取消保留已提交结果，为当前及剩余调用补齐 `TOOL_CALL_CANCELLED`；迟到的 allow / reject 不会执行工具或增加结果。没有 Signal 时可以一直等待，本轮不设默认超时。

六种 AgentEvent 及其时机保持不变。`tool_execution_started` 表示 Runtime 开始处理一次执行尝试，可能仍在等待审批，并不保证 `Tool.execute()` 已启动。deny / Hook Error 产生结果后发送原有 completed 事件；审批等待被 Abort 时不伪造 completed。Subscriber 只观察事件，不决定授权。

最小 CLI Demo 使用确定性 ModelProvider 和模拟发布工具，依次显示 User → Model ToolCall → Application Approval → ToolResult → Model Final Answer，不访问网络或要求 API Key。人工输入与异步确认都位于 Application 层：

```bash
npm run demo:approval
```

输入公告标题后，用 `y` 批准，其他输入拒绝。自动化验证分别运行以下路径，无需人工输入；Demo 会断言 Hook / Tool 调用次数、完整唯一配对、RunOutcome 和基于实际 ToolResult 生成的最终回答：

```bash
npm run demo:approval -- --allow
npm run demo:approval -- --deny
```

已结算的 deny / Hook Error / cancelled 结果可以按既有 Run Boundary 保存和恢复；恢复历史不会重新执行旧 Tool 或触发旧 Hook。在途 Approval、Promise、Signal 和 Handler 不保存，不能跨进程恢复审批。Abort 不保证物理撤销外部审批请求，也不能回滚已发生的 Tool 副作用；Application Hook 不能代替外部 API 自身的权限控制。本轮仅完成简单 Human Approval，未实现 Durable Approval；VII-I Weather Agent 留待下一阶段。

## 运行 Part VII-A Provider Demo

运行真实 OpenAI Demo：

```bash
cp .env.example .env
# 编辑 .env，填写 OPENAI_API_KEY 等配置
npm run demo
```

Demo 会通过 `dotenv` 自动加载项目根目录的 `.env`。也可以继续使用终端环境变量；终端中已经存在的变量优先于 `.env`。可通过 `OPENAI_MODEL` 覆盖默认模型 `gpt-4o-mini`，通过 `OPENAI_BASE_URL` 指定可选 API 地址。Demo 不会在缺少 API Key 时回退到 Mock Provider。

`.env` 已被 Git 忽略，不要提交真实 API Key；可提交的配置模板是 `.env.example`。

每一天的学习资料独立放在 `notes/` 下的独立文件夹里。当前学习阶段的新增内容只生成：

- Markdown：唯一主版本，适合 GitHub 阅读和后续维护。
- source：可选的原始材料记录，仅在当天有源材料时保留。

仓库中已有的 PDF / DOCX 属于此前生成的派生版本；后续不再按天生成，等阶段性学习完成后再统一批量导出。

## 学习路线

### Part I：Agent Basics

- [Day01：Agent Basics](notes/day01-agent-basics/day01-agent-basics.md)

### Part II：Runtime Foundation

- [Day02：Runtime Overview](notes/day02-runtime/day02-runtime.md)
- [Day03：Runtime Architecture](notes/day03-runtime-architecture/README.md)

### Part III：Decision Engine

- [Day04：Runtime 如何思考（How Runtime Thinks）](notes/day04-how-runtime-thinks/README.md)
- [Day04.5：Agent Runtime Industrial Mapping（工业术语映射）](notes/day04.5-agent-runtime-industrial-mapping/README.md)

### Part IV：Execution Engine

- [Day05：Tool Calling（Execution Engine）](notes/day05-tool-calling/README.md)

### Part V：Memory System

- [Day06：Memory System](notes/day06-memory/README.md)

### Part VI：Day07 Pi Agent 源码解剖

- [Day07：Pi Agent 源码解剖](notes/day07-pi-agent-source-analysis/README.md)
- 把 Pi Agent 当作“真实世界 Agent Runtime 的解剖样本”。
- 按 `真实 Runtime → 源码 → 设计原因 → 对照自己的 Mini Runtime` 学习。
- 将 Runtime State、Context、Tool Calling、Memory、Execution Loop 映射到真实代码。

### Part VII：Codex + Mini Agent Runtime

- 使用 Codex 分析架构、实现代码、运行、调试并补齐理论。
- 把 Runtime Loop、State、Context、Tool、Memory、Human Approval 真正组合起来。
- 理解 Agent、Workspace、Tool、Context、Execution 与 Approval 在 Coding Agent 中的协作。

### Part VIII：Agent 项目实战

- RAG 工程实现：不再单独长时间学习理论，在项目中补齐 Parsing、Chunking、Embedding、Retrieval、Reranking 与 Context Assembly。
- 企业智能客服 Agent：组合 LLM、Workflow、Tool、Memory、RAG 与 Human Approval。
- Data Agent：实现自然语言任务理解、Schema / Metadata、Planning、SQL / Tool、Execution、Analysis 与 Visualization。

### Part IX：工业级 Agent 工程能力

- Planning
- Evaluation
- Observability
- Reliability
- Permission / Data Security

Streaming、Workflow、MCP 等能力不再机械地固定为 Day07～Day10 理论章节，而是在源码解剖、Mini Runtime 整合和项目实战中按需要补齐。

后续实现阶段会在 `src/` 中逐步实现一个最小可运行的 `mini-agent-runtime`。

## 导出文档

日常学习只维护 Markdown。阶段性整理或写书前，可使用 `scripts/export_learning_note.py` 将 Markdown 统一导出为 DOCX 和 PDF。

示例：

```bash
python3 scripts/export_learning_note.py \
  notes/day02-runtime/day02-runtime.md \
  notes/day02-runtime/day02-runtime.docx \
  notes/day02-runtime/day02-runtime.pdf
```

Markdown 始终作为唯一主版本，DOCX 和 PDF 是阶段性批量生成的派生版本。
