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

- [Day1：AI Agent 到底是什么？](notes/day01-agent-basics/day01-agent-basics.md)
- [Day2：Agent Runtime —— 谁才是真正的大脑？](notes/day02-runtime/day02-runtime.md)
- [Day3：Runtime Architecture](notes/day03-runtime-architecture/README.md)
  - [Day03-01：Runtime Architecture Design Principles](notes/day03-runtime-architecture/day03-01-runtime-architecture-design-principles.md)
  - [Day03-02：Runtime Core Components](notes/day03-runtime-architecture/day03-02-runtime-core-components.md)
  - [Day03-03：Conversation & Message Data Model](notes/day03-runtime-architecture/day03-03-conversation-message-data-model.md)
- [Day04：Runtime 如何思考（How Runtime Thinks）](notes/day04-how-runtime-thinks/README.md)
  - [Day04 Part A：Prompt 不是 Context](notes/day04-how-runtime-thinks/day04-part-a-prompt-is-not-context.md)
  - [Day04 Part B-01：Runtime State](notes/day04-how-runtime-thinks/day04-part-b-01-runtime-state.md)
  - [Day04 Part B-02：Runtime State Lifecycle](notes/day04-how-runtime-thinks/day04-part-b-02-runtime-state-lifecycle.md)
  - [Day04 Part C：Context Builder Projection](notes/day04-how-runtime-thinks/day04-part-c-context-builder-projection.md)
  - [Day04 Part D：Context Window Management](notes/day04-how-runtime-thinks/day04-part-d-context-window-management.md)
  - [Day04 Part E：Provider Adapter](notes/day04-how-runtime-thinks/day04-part-e-provider-adapter.md)
- [Day04.5：Agent Runtime Industrial Mapping（工业术语映射）](notes/day04.5-agent-runtime-industrial-mapping/README.md)
- [Day05：Tool Calling（Execution Engine）](notes/day05-tool-calling/README.md)
  - [Day05 Part A：Tool Calling 基础模型](notes/day05-tool-calling/day05-part-a-tool-calling-basics.md)
  - [Day05 Part B：LLM 如何决定调用 Tool](notes/day05-tool-calling/day05-part-b-tool-decision.md)
  - [Day05 Part C：Tool Schema 设计](notes/day05-tool-calling/day05-part-c-tool-schema.md)
  - [Day05 Part D：Tool Registry](notes/day05-tool-calling/day05-part-d-tool-registry.md)
  - [Day05 Part E：Tool Executor](notes/day05-tool-calling/day05-part-e-tool-executor.md)
  - [Day05 Part F：Permission & Human Approval（含 Human-in-the-loop）](notes/day05-tool-calling/day05-part-f-permission-human-approval.md)
  - [Day05 Part G：Tool Result 回流 Runtime](notes/day05-tool-calling/day05-part-g-tool-result-runtime-feedback.md)
  - [Day05 Part H：Multi Tool Loop](notes/day05-tool-calling/day05-part-h-multi-tool-loop.md)
  - [Day05 Part I：Mini Tool Runtime 实现](notes/day05-tool-calling/day05-part-i-mini-tool-runtime-implementation.md)

每一天的学习资料独立放在一个文件夹里，包含：

- Markdown：主版本，适合 GitHub 阅读和后续维护。
- PDF：阅读版。
- DOCX：可编辑版。
- source：原始材料，仅在当天有源文件时保留。

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

- Day06：Memory

### Part VI：Advanced Runtime

- Day07：Streaming Event
- Day08：Human Approval
- Day09：Workflow
- Day10：MCP

### 附加章节：AI Assistant + Workflow Practice

- 实践 AI Assistant + Workflow：用于专门验证“很多企业所谓 Agent 其实是 AI Assistant + Workflow”的架构判断。
- 重点区分 AI Assistant、Agentic Workflow 与 Autonomous Agent：能用 Workflow 稳定解决的问题，不强行上 Multi Tool Loop；只有开放任务、不确定路径和需要 Replanning 的场景，才进入真正 Agent Runtime。

后续实现阶段会在 `src/` 中逐步实现一个最小可运行的 `mini-agent-runtime`。

## 导出文档

当前使用 `scripts/export_learning_note.py` 将 Markdown 导出为 DOCX 和 PDF。

示例：

```bash
python3 scripts/export_learning_note.py \
  notes/day02-runtime/day02-runtime.md \
  notes/day02-runtime/day02-runtime.docx \
  notes/day02-runtime/day02-runtime.pdf
```

Markdown 始终作为唯一主版本，DOCX 和 PDF 是派生版本。
