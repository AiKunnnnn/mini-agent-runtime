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
- 当前进度：Part VII-A、VII-B 已完成并归档；VII-C Tool Registry、Executor 和 Tool Loop 已实现。

## 构建与测试

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm test
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
- 最后允许的 Model Turn 返回 `tool_calls` → 保存输出，不执行该批工具，返回 `{ type: "limit_reached", maxTurns }`。
- Provider 异常原样向上传播；已记录的用户输入保留，不制造模型输出。

`getMessages()` 返回包含嵌套 tool arguments 的深拷贝，修改它不会改变内部状态。请求和响应中的可变引用也与内部状态隔离。

通过 `new AgentRuntime(provider, { registry, maxTurns: 5 })` 配置工具与回合上限。`registry` 是 `ToolRegistry`，提供 `register(tool)`、`get(name)` 和 `listDefinitions()`；名称重复注册直接抛错。未传入时使用空 Registry，空工具请求省略 `tools`。`maxTurns` 默认为 5，必须为正安全整数，每次 run 重新计数；一次 generate 算一个 Turn，与该次工具数量无关。State 仍然只有 messages。

可执行 `Tool<TArgs>` 包含 `definition` 和 `execute(args)`；Tool 作者负责让 `definition.parameters` 描述 TArgs。Executor 使用同一份 JSON Schema，通过 Ajv（draft-07、严格模式、同步校验）校验 unknown 输入，不进行类型转换、补默认值或删除额外字段。Registry 保存 Schema 副本，对外返回副本，防止 Provider 或调用方更改执行规则。Executor 按名称缓存已编译校验器。

工具返回 JSON 兼容值。既有 `RuntimeToolMessage.content` 保存 JSON：成功为 `{ success: true, result }`；失败为 `{ success: false, error: { code, message } }`，通过 `toolCallId` 对应之前记录的调用，工具名从该调用读取。错误码为 `TOOL_NOT_FOUND`、`INVALID_ARGUMENTS` 和 `TOOL_EXECUTION_FAILED`，均回流给模型。只有 execute 调用边界内的异常被规范化；无效 Schema、内部不变量或结果序列化错误继续抛出。无需修改 Provider Adapter 或消息类型。

确定性 Tool Loop Demo（不访问网络，不调用真实 LLM）：

```bash
npm run demo:tools
```

Demo Provider 第一回合请求 add(2, 3)，第二回合读取 Runtime 实际写回的 Tool Result 并据此生成回答。自动化测试独立验证成功、失败、顺序执行、预算及引用隔离。

当前仅支持顺序调用；并发控制与恢复策略没有实现。达到上限后保留的最后一批 Tool Call 没有结果；再次 run 会携带这段历史，严格要求调用与结果配对的 Provider 可能拒绝请求。本 Milestone 不修补历史或实现恢复。

配置好下文的 `.env` 后，运行真实 Runtime Demo：

```bash
npm run demo:runtime
```

Demo 使用同一个 Runtime 先输入“我叫小明”，再询问“我叫什么名字？”，每轮打印 outcome 和完整历史。正常情况下，两轮均返回 `completed`，最终历史包含四条消息，第二轮回答引用“小明”。若未返回 `completed`，Demo 打印已保存历史并停止。该命令会调用真实 API。

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
