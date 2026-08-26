# mini-agent-runtime

《从零实现 Agent Runtime》的学习与实现仓库。

这个项目目前处在学习阶段：先按天沉淀 Agent Runtime 的学习笔记，再逐步进入代码实现，最后把学习文档整理成正式书稿。

## 当前内容

```text
mini-agent-runtime/
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

当前已进入：

- [Day06：Memory System](notes/day06-memory/README.md)

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

### Part VI：Pi Agent 源码解剖

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
