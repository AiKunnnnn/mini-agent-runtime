# Day06：Memory System

Day06 进入 Agent Runtime 的长期状态系统。

Day05 已经完成 Execution Engine：Runtime 能让 LLM 产生 Tool Call Intent，并由 Tool Registry、Tool Executor、Permission、Observation 和 Multi Tool Loop 完成行动闭环。Day06 开始回答新的问题：

> Runtime 如何让 Agent 跨会话、跨任务、跨时间地保留长期有价值的信息？

Memory 的核心不是“保存聊天记录”，而是：

> Runtime 从 Conversation、Observation 和业务事件中抽取长期有效信息，经过分类、去重、更新、遗忘、检索和排序，再由 Context Builder 投影给 LLM。

## Day06 学习目标

Day06 的目标是理解 Agent 如何具备长期记忆能力，并实现一个工业化 Memory System。

核心问题是：

> Agent 如何从过去经历中提取有价值的信息，并在未来任务中重新利用？

学习完成后，需要能够理解：

- ChatGPT Memory 大概如何设计
- Claude Code 如何维护项目上下文
- 企业 Agent 如何设计用户长期记忆
- Memory 与 Context Builder 的关系
- Memory 与 RAG（Retrieval Augmented Generation，检索增强生成）的区别

## Day06 学习计划

- `day06-part-a-memory-foundation.md`：Memory 基础模型
- `day06-part-b-memory-architecture.md`：Memory Architecture（记忆系统架构）
- `day06-part-c-memory-lifecycle.md`：Memory Lifecycle（记忆生命周期）
- `day06-part-d-memory-context-integration.md`：Memory 与 Context Builder 集成
- `day06-part-e-mini-memory-runtime.md`：Mini Memory Runtime 实现
- `day06-part-f-industrial-mapping.md`：工业 Memory 映射

## 文件

- Day06 Part A：Memory 基础模型
  - [Markdown 主版本](day06-part-a-memory-foundation.md)
  - [PDF 阅读版](day06-part-a-memory-foundation.pdf)
  - [DOCX 可编辑版](day06-part-a-memory-foundation.docx)
  - [ChatGPT 分享会话源记录](source/day06-part-a-chatgpt-share-source.md)

## Day06 Part A 目标

Day06 Part A：Memory 基础模型，重点回答：

1. Day06 为什么应该拆分成多个 Part
2. 什么是 Agent Memory
3. 为什么 Agent 需要 Memory
4. Stateless Agent 与 Stateful Agent 有什么区别
5. Conversation 与 Memory 有什么区别
6. Memory Extractor 为什么是 Memory System 的关键
7. Memory Extractor 是否需要由 LLM 驱动
8. 工业 Memory 为什么常采用 Rule + LLM + Embedding 的混合方案
9. Memory 为什么不是只 Create，还需要 Update、Merge 和 Forget
10. Memory 与 Runtime State、Context Builder 的关系是什么
11. Memory 为什么也需要 Context Budget、Confidence 和 Privacy Filter

## Part A 核心认知

- Memory 保存的不是所有历史，而是未来可能影响 Agent 行为的长期有效信息
- Conversation 是发生过什么，Memory 是值得长期记住什么
- Memory Extractor 是避免 Memory 污染的关键判断层
- Memory Extractor 可以由 LLM 驱动，也可以采用 Rule + LLM Hybrid
- Embedding 和 Similarity 主要帮助去重、相似判断、更新和合并
- Memory 至少需要 create、update、merge、forget，而不是只有 append
- Memory 是 Runtime 的长期 State，Runtime State 是当前任务现场
- Memory 不应直接全部塞给 LLM，而应经过 Retrieval、Ranking 和 Context Builder 的预算管理
- Vector Database 只是 Memory Store 的一种实现，不等于完整 Memory System
- Memory System 也是安全边界，需要 Privacy Filter、Confidence 和治理策略
