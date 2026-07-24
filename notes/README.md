# 学习笔记

这里保存《从零实现 Agent Runtime》的每日学习资料。

## 目录

- [Day1：AI Agent 到底是什么？](day01-agent-basics/day01-agent-basics.md)
- [Day2：Agent Runtime —— 谁才是真正的大脑？](day02-runtime/day02-runtime.md)
- [Day3：Runtime Architecture](day03-runtime-architecture/README.md)
  - [Day03-01：Runtime Architecture Design Principles](day03-runtime-architecture/day03-01-runtime-architecture-design-principles.md)
  - [Day03-02：Runtime Core Components](day03-runtime-architecture/day03-02-runtime-core-components.md)
  - [Day03-03：Conversation & Message Data Model](day03-runtime-architecture/day03-03-conversation-message-data-model.md)
- [Day04：Runtime 如何思考（How Runtime Thinks）](day04-how-runtime-thinks/README.md)
  - [Day04 Part A：Prompt 不是 Context](day04-how-runtime-thinks/day04-part-a-prompt-is-not-context.md)
  - [Day04 Part B-01：Runtime State](day04-how-runtime-thinks/day04-part-b-01-runtime-state.md)
  - [Day04 Part B-02：Runtime State Lifecycle](day04-how-runtime-thinks/day04-part-b-02-runtime-state-lifecycle.md)
  - [Day04 Part C：Context Builder Projection](day04-how-runtime-thinks/day04-part-c-context-builder-projection.md)
  - [Day04 Part D：Context Window Management](day04-how-runtime-thinks/day04-part-d-context-window-management.md)
  - [Day04 Part E：Provider Adapter](day04-how-runtime-thinks/day04-part-e-provider-adapter.md)
- [Day04.5：Agent Runtime Industrial Mapping（工业术语映射）](day04-5-agent-runtime-industrial-mapping/README.md)
- [Day05：Tool Calling（Execution Engine）](day05-tool-calling/README.md)

## 学习路线

### Part I：Agent Basics

- [Day01：Agent Basics](day01-agent-basics/day01-agent-basics.md)

### Part II：Runtime Foundation

- [Day02：Runtime Overview](day02-runtime/day02-runtime.md)
- [Day03：Runtime Architecture](day03-runtime-architecture/README.md)

### Part III：Decision Engine

- [Day04：Runtime 如何思考（How Runtime Thinks）](day04-how-runtime-thinks/README.md)
- [Day04.5：Agent Runtime Industrial Mapping（工业术语映射）](day04.5-agent-runtime-industrial-mapping/README.md)

### Part IV：Execution Engine

- [Day05：Tool Calling（Execution Engine）](day05-tool-calling/README.md)

### Part V：Memory System

- Day06：Memory

### Part VI：Advanced Runtime

- Day07：Streaming Event
- Day08：Human Approval
- Day09：Workflow
- Day10：MCP

## 组织规则

每一天一个独立文件夹：

```text
notes/
├── day01-agent-basics/
│   ├── README.md
│   ├── day01-agent-basics.md
│   ├── day01-agent-basics.pdf
│   ├── day01-agent-basics.docx
│   └── source/
│
└── day02-runtime/
    ├── README.md
    ├── day02-runtime.md
    ├── day02-runtime.pdf
    └── day02-runtime.docx

└── day03-runtime-architecture/
    ├── README.md
    ├── day03-01-runtime-architecture-design-principles.md
    ├── day03-01-runtime-architecture-design-principles.pdf
    ├── day03-01-runtime-architecture-design-principles.docx
    ├── day03-02-runtime-core-components.md
    ├── day03-02-runtime-core-components.pdf
    ├── day03-02-runtime-core-components.docx
    ├── day03-03-conversation-message-data-model.md
    ├── day03-03-conversation-message-data-model.pdf
    ├── day03-03-conversation-message-data-model.docx
    └── source/

└── day04-how-runtime-thinks/
    ├── README.md
    ├── day04-part-a-prompt-is-not-context.md
    ├── day04-part-a-prompt-is-not-context.pdf
    ├── day04-part-a-prompt-is-not-context.docx
    ├── day04-part-b-01-runtime-state.md
    ├── day04-part-b-01-runtime-state.pdf
    ├── day04-part-b-01-runtime-state.docx
    ├── day04-part-b-02-runtime-state-lifecycle.md
    ├── day04-part-b-02-runtime-state-lifecycle.pdf
    ├── day04-part-b-02-runtime-state-lifecycle.docx
    ├── day04-part-c-context-builder-projection.md
    ├── day04-part-c-context-builder-projection.pdf
    ├── day04-part-c-context-builder-projection.docx
    ├── day04-part-d-context-window-management.md
    ├── day04-part-d-context-window-management.pdf
    ├── day04-part-d-context-window-management.docx
    ├── day04-part-e-provider-adapter.md
    ├── day04-part-e-provider-adapter.pdf
    ├── day04-part-e-provider-adapter.docx
    └── source/

└── day04-5-agent-runtime-industrial-mapping/
    ├── README.md
    ├── day04-5-agent-runtime-industrial-mapping.md
    ├── day04-5-agent-runtime-industrial-mapping.pdf
    ├── day04-5-agent-runtime-industrial-mapping.docx
    └── source/

└── day05-tool-calling/
    └── README.md
```

规则：

- Markdown 是主版本。
- PDF 是阅读版。
- DOCX 是可编辑版。
- 原始资料放在当天目录的 `source/` 中。
- 后续图示、流程图、代码草稿可以放进当天目录的 `assets/` 或 `examples/`。
- 如果某一天被拆成多个小节，统一放在当天目录下平铺管理，例如 `day03-01-xxx.md`、`day03-02-xxx.md`。
- 如果某一天是插入的桥接章节，可以使用 `day04-5-xxx` 这样的目录名保留学习顺序。
