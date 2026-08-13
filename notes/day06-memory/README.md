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
- Day06 Part B：Memory Architecture（记忆系统架构）
  - [Markdown 主版本](day06-part-b-memory-architecture.md)
  - [PDF 阅读版](day06-part-b-memory-architecture.pdf)
  - [DOCX 可编辑版](day06-part-b-memory-architecture.docx)
  - [ChatGPT 分享会话源记录](source/day06-part-b-chatgpt-share-source.md)
- Day06 Part C：Memory Lifecycle（记忆生命周期）
  - [Markdown 主版本](day06-part-c-memory-lifecycle.md)
  - [PDF 阅读版](day06-part-c-memory-lifecycle.pdf)
  - [DOCX 可编辑版](day06-part-c-memory-lifecycle.docx)
  - [ChatGPT 会话源记录](source/day06-part-c-chatgpt-share-source.md)

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

## Day06 Part B 目标

Day06 Part B：Memory Architecture，重点回答：

1. Memory System 的整体架构应该如何拆分
2. Memory Write Path 和 Read Path 有什么区别
3. Memory Store 为什么是领域抽象，而不是 Vector DB
4. Memory Entity 应该包含哪些结构化字段
5. Embedding、Vector Search、Vector DB 各自负责什么
6. Retriever 与 Ranker 的职责边界是什么
7. 为什么工业 Memory Retrieval 通常需要 Hybrid Retrieval
8. Memory 为什么需要 Context Budget 和 Projection
9. Memory 如何通过 Context Builder 进入 LLM Context
10. Memory 与 RAG、Knowledge Base、Vector DB 的区别是什么
11. 企业知识库为什么不是简单的 Chunk + Embedding + Top-K
12. Memory Update 为什么不能只依赖 Vector Similarity

## Part B 核心认知

- Memory Architecture 由 Write Path 和 Read Path 组成
- Memory Store 是长期 State Repository，不是简单文本列表
- Vector DB 是 Memory Store 的一种基础设施实现，不等于 Memory System
- Embedding 是语义表示技术，Vector Search 是相似度检索能力
- Retriever 负责召回候选，Ranker 负责排序与选择
- 相似度高不等于一定应该进入当前上下文
- Query similarity 是动态相关性，不是 Memory 自身永久固定的分数
- Hybrid Retrieval 会结合 keyword、semantic、metadata、recency 等信号
- Context Builder 负责把 Memory Record 投影成 LLM 可读的 Context Block
- Memory 和 RAG 可共享 Retrieval 技术，但数据来源、生命周期和语义不同
- 企业知识库的难点在 parsing、chunking、metadata、retrieval、rerank、context assembly 整条链路
- Memory Update 需要 Semantic Similarity + 结构化类型 + 生命周期判断

## Day06 Part C 目标

Day06 Part C：Memory Lifecycle，重点回答：

1. 为什么 Memory 需要 Lifecycle，而不是只 append
2. Memory 为什么是 State，不是 Conversation Event
3. 一条 Observation 什么时候值得被 Create 成 Memory
4. Memory Extraction 和 Memory Create 有什么区别
5. Importance、Confidence、Scope 如何参与 Create Decision
6. Vue 到 React 这种偏好变化如何判断 Update / Merge
7. 为什么 Semantic Similarity 不能决定 State Identity
8. Type、Slot、Entity、Scope、Temporal Signal 各自负责什么
9. Update、Merge、Conflict 的边界是什么
10. Memory 为什么需要 Decay
11. Forget 为什么不等于 Physical Delete
12. LLM、Policy、Runtime 在 Lifecycle Engine 中如何分工
13. Current State + History / Audit Log 为什么有价值
14. Lifecycle、Retrieval、Projection 的职责边界是什么

## Part C 核心认知

- Memory Lifecycle 不是 CRUD，而是 Long-term State Reconciliation
- Memory Create 是 State Promotion，不是简单 save
- Extraction 不等于 Create；Candidate 还要经过 Runtime Decision
- Importance 表示长期价值，Confidence 表示可信度，Scope 表示成立范围
- Similarity 只能判断相关，不能判断两个 Memory 是否属于同一个 State
- 判断 Update 需要 Type、Slot、Entity、Scope、Temporal Signal 和 LLM Judgment
- Update 是同一个 State Slot 的值变化，Merge 是多条信息合成更完整状态
- Conflict 不一定是错误，而是当前信息不足以确定 State Relationship
- Decay 是有效性下降，不是删除
- Forget 是逻辑生命周期变化，不等于 Physical Delete
- Memory Store 可以拆成 Current State 和 History / Audit Log
- LLM 负责语义判断，Policy 负责硬约束，Runtime 负责最终状态变化
- Lifecycle Validity、Retrieval Relevance、Context Projection 是三个不同问题
- Active Memory 不代表一定进入当前 Context
