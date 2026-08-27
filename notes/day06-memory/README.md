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

- [x] `day06-part-a-memory-foundation.md`：Memory 基础模型
- [x] `day06-part-b-memory-architecture.md`：Memory Architecture（记忆系统架构）
- [x] `day06-part-c-memory-lifecycle.md`：Memory Lifecycle（记忆生命周期）
- [x] `day06-part-d-memory-context-integration.md`：Memory 与 Context Builder 集成
- [x] `day06-part-e-mini-memory-runtime.md`：Mini Memory Runtime Implementation（Day06 收尾）

Part D 已完成 D-1～D-6，并吸收以下三个工业补充点，不再继续拆分 D-7、D-8：

1. Global Context Budget 到 Memory Budget 的分配职责。
2. Memory Retrieval 可以参与 Runtime Loop，而非只发生一次。
3. Memory Retrieval、Selection、Projection 必须具备 Observability。

Part E 已完成 Mini Memory Runtime 的架构闭环，并补齐并发控制、幂等、异步一致性、降级、可观测性、真实 Agent 映射和 Day06 固定收尾。Day06 至此正式结束。

原计划中的 Part F：Industrial Memory Mapping 不再作为独立章节，其目标并入 [Day07：Pi Agent 源码解剖](../day07-pi-agent-source-analysis/README.md)：直接把 Memory、Context、Tool、State、Execution Loop 映射到真实开源 Runtime。

完成 Part E 后，学习路线进入新的阶段：

```text
Day07：Pi Agent 源码解剖
        ↓
Codex + Mini Agent Runtime
        ↓
RAG 工程实现（在项目中补齐）
        ↓
企业智能客服 Agent
        ↓
Data Agent
        ↓
Planning / Evaluation / Observability / Reliability
        ↓
工业级 Agent
```

这代表学习方式从“继续扩展基础理论”切换为“阅读真实源码、解释设计、对照并构建自己的 Runtime”。

当前 RAG 学习定位：

- RAG Architecture：已理解。
- RAG 在 Agent 中的位置：已理解。
- Context 注入：已理解。
- Parsing、Chunking、Embedding、Retrieval、Reranking 等工程实现：需要在项目中补齐。

因此不单独安排一段长时间的 RAG 理论课，而是在企业智能客服等项目中把 RAG、Context、Tool、Memory 与 Runtime 串起来。

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
- Day06 Part D：Memory × Context Builder
  - [Markdown 主版本](day06-part-d-memory-context-integration.md)
  - [知识学习会话](https://chatgpt.com/share/6a8d563e-a534-83ee-8642-b3ada1dd5ef1)
  - [完整路线调整会话（需登录）](https://chatgpt.com/c/6a8d2e07-5ebc-83e8-98a9-306b4b7eba5a)
  - [学习路线变更的原始讨论](https://chatgpt.com/share/6a8e5b33-a3e8-83e8-b121-5df9580ca33a)
- Day06 Part E：Mini Memory Runtime Implementation
  - [Markdown 主版本](day06-part-e-mini-memory-runtime.md)
  - [ChatGPT 学习会话（需登录）](https://chatgpt.com/c/6a8e5d9f-f66c-83ee-b67e-56a3c5fadc83)

> 日常学习只生成 Markdown；PDF / DOCX 留到阶段性整理时统一批量导出。

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

## Day06 Part D 目标

Day06 Part D：Memory × Context Builder，重点回答：

1. 为什么 Retrieval 不等于 Injection
2. Memory 如何参与全局 Context Budget 竞争
3. Memory Store Representation 如何投影成 LLM Context Representation
4. Scope 与 Priority 的职责边界是什么
5. 怎样识别真正的 Memory Conflict
6. Update、Merge、Coexist、Uncertain 如何选择
7. Confidence、Recency、Source、Scope 和 Lifecycle 如何共同参与一致性判断
8. 为什么不确定性也应该被投影给 LLM
9. 为什么 Memory 已经是 Summary，进入 Context 时仍需再次压缩
10. Retrieval 与 Representation Compression 有什么区别
11. Context Snapshot 为什么是 Runtime World 的 LLM-facing View
12. Memory Retrieval 如何参与 Runtime Loop
13. Memory Selection 与 Projection 为什么必须可观测

## Part D 核心认知

- Retrieval 只产生候选，不等于进入 Prompt
- Memory 是 Context Source 之一，预算由全局 Context Builder / Budget Manager 协调
- Scope 表示适用范围，Priority 表示当前任务下的 Context 价值
- 真正冲突需要 Same Entity、Same Scope、Same Semantic Slot 与 Conflicting Value
- 冲突优先由 Memory Lifecycle / Consistency 层处理
- 无法消除的不确定性应该被诚实投影给 LLM
- Memory Compression 压缩的是当前任务下的 Representation，不是 Memory Store
- Runtime 至少存在 Conversation → Memory、Memory → Memory Context、All Context → Prompt 三次压缩
- Compression 追求 Information Density，而不是最短文本
- Context Snapshot 是 Runtime World 面向 LLM 的认知投影
- Memory Retrieval 可以在 Multi Tool Loop 中被重新触发
- Retrieval、Selection、Eviction、Projection 应保留可解释 Trace

## Day06 Part E 目标

Day06 Part E：Mini Memory Runtime Implementation，重点回答：

1. Retrieval、Context Builder、LLM、Extraction、Reconciliation 与 Store 如何形成完整闭环
2. Memory Candidate 为什么不能直接成为 Canonical Memory
3. CREATE、UPDATE、MERGE、IGNORE 的职责边界是什么
4. Canonical State、Version History 与 Audit Event 如何分层
5. Memory 并发写入为什么会出现 Lost Update，以及如何使用 Optimistic Lock
6. Idempotency 与 Semantic Deduplication 有什么区别
7. Memory Pipeline 应该同步还是异步，以及如何处理 Read-after-write Consistency
8. Memory 故障何时可以 Graceful Degradation，何时必须失败
9. Provenance、False Memory Rate 与保守 Write Policy 为什么重要
10. Mini Runtime 与生产系统之间应如何渐进演进
11. Chat Assistant 与 Coding Agent 的 Memory 有何不同
12. Memory 与 Workspace Index、Checkpoint、Summary、RAG、Knowledge Base、Source of Truth 的边界是什么
13. Day04～Day06 如何汇入同一个 Agent Runtime Loop

## Part E 核心认知

- Memory 是 Runtime State Lifecycle 跨 Run、跨 Session 的延伸
- Candidate 不等于 Canonical Memory，写入前必须经过 Matching 与 Reconciliation
- Similarity 只能回答是否相关，不能单独决定 State Identity
- 乐观锁解决并发 Lost Update，幂等键解决重复执行，语义去重解决不同操作产生的重复状态
- 个性化 Memory 通常是 Best-effort Side Effect，关键业务状态需要更强的持久化保证
- 异步写入可以降低响应延迟，但会引入 Eventual Consistency 与 Read-after-write 问题
- Graceful Degradation 必须服从 Optional / Required Dependency 的业务语义
- Memory Write 的长期污染风险通常高于单次错误 Retrieval，因此 Write Policy 应更保守
- Provenance、Version、Audit、Trace 和 False Memory Monitoring 是生产级 Memory 的重要治理能力
- 真实系统不一定有教学模型中的同名类，源码阅读应寻找职责而不是类名
- Memory 不等于 Chat History、Vector DB、Context、Knowledge Base 或 Source of Truth
- Memory 的本质是一套 Long-term State Lifecycle
