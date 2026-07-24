# Day04.5：Agent Runtime Industrial Mapping（工业术语映射）

Day04.5 是插在 Day04 和 Day05 之间的桥接章节。

原计划在 Day04 Part E：Provider Adapter 之后直接进入 Day05 Tool Calling，但在进入 Day05 时发现，Day01-Day04 已经形成了完整的 Runtime 工程认知，却还没有系统补齐工业界常用术语、开源框架命名和面试表达。因此先加入 Day04.5，把前四天的核心概念映射到真实 Agent Framework 语境，再继续 Day05。

## 文件

- Day04.5：Agent Runtime Industrial Mapping
  - [Markdown 主版本](day04-5-agent-runtime-industrial-mapping.md)
  - [PDF 阅读版](day04-5-agent-runtime-industrial-mapping.pdf)
  - [DOCX 可编辑版](day04-5-agent-runtime-industrial-mapping.docx)
  - [ChatGPT 分享会话源记录](source/day04-5-chatgpt-share-source.md)

## 核心内容

- Day04.5 不是新的 Runtime 能力，而是 Day01-Day04 的 Terminology Mapping Pass
- Agent 可以表达为 AI Agent / Autonomous Agent / LLM-based Agent
- Runtime 可以表达为 Agent Runtime / Agent Orchestrator / Agent Execution Engine
- Runtime Loop 可以映射到 Agent Loop / ReAct Loop / Execution Loop
- Runtime State 可以映射到 Agent State / Workflow State / State Machine / State Store
- Context Builder 可以映射到 Context Engineering Pipeline
- Context Window Management 可以映射到 Context Management / Context Optimization / Token Budget Management
- Memory Reference 可以映射到 Agent Memory System
- Tool Runtime 可以映射到 Tool Calling System / Action Runtime
- Provider Adapter 可以映射到 LLM Gateway / Model Router / Provider Abstraction Layer
- OpenAI Agents SDK、LangGraph、Claude Code 和 MCP 都可以从 Agent Runtime 抽象反向理解

## 后续规则

从 Day05 开始，每个学习 Part 尽量保留：

```text
正文学习
  |
  v
工业术语映射
  |
  v
框架对应
  |
  v
面试视角
  |
  v
思考题
```

这样最终笔记会从学习记录逐步靠近《从零实现 Agent Runtime：从原理到工业实践》的书稿结构。
