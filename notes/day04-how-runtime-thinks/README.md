# Day04：Runtime 如何思考（How Runtime Thinks）

Day04 解决的是 Runtime 如何把真实世界组织成 LLM 可以理解的 Context。

Day04 不再只按“天”推进，而是拆成多个 Part。Part A 先建立世界观：Prompt 不是 Context，Context 是 Runtime State 的一次 Projection。Part D 完成 Context Window Management，回答有限上下文空间中的工业级取舍问题。下一节进入 Part E：Provider Adapter，补齐 Context Builder 之后的模型供应商适配层。

## 文件

- Day04 Part A：Prompt 不是 Context
  - [Markdown 主版本](day04-part-a-prompt-is-not-context.md)
  - [PDF 阅读版](day04-part-a-prompt-is-not-context.pdf)
  - [DOCX 可编辑版](day04-part-a-prompt-is-not-context.docx)
  - [ChatGPT 分享会话源记录](source/day04-part-a-chatgpt-share-source.md)
- Day04 Part B-1：Runtime State
  - [Markdown 主版本](day04-part-b-01-runtime-state.md)
  - [PDF 阅读版](day04-part-b-01-runtime-state.pdf)
  - [DOCX 可编辑版](day04-part-b-01-runtime-state.docx)
  - [ChatGPT 分享会话源记录](source/day04-part-b-01-chatgpt-share-source.md)
- Day04 Part B-02：Runtime State Lifecycle
  - [Markdown 主版本](day04-part-b-02-runtime-state-lifecycle.md)
  - [PDF 阅读版](day04-part-b-02-runtime-state-lifecycle.pdf)
  - [DOCX 可编辑版](day04-part-b-02-runtime-state-lifecycle.docx)
  - [ChatGPT 分享会话源记录](source/day04-part-b-02-chatgpt-share-source.md)
- Day04 Part C：Context Builder Projection
  - [Markdown 主版本](day04-part-c-context-builder-projection.md)
  - [PDF 阅读版](day04-part-c-context-builder-projection.pdf)
  - [DOCX 可编辑版](day04-part-c-context-builder-projection.docx)
  - [ChatGPT 分享会话源记录](source/day04-part-c-chatgpt-share-source.md)
- Day04 Part D：Context Window Management
  - [Markdown 主版本](day04-part-d-context-window-management.md)
  - [PDF 阅读版](day04-part-d-context-window-management.pdf)
  - [DOCX 可编辑版](day04-part-d-context-window-management.docx)
  - [ChatGPT 分享会话源记录](source/day04-part-d-chatgpt-share-source.md)

## Day04 拆分计划

- `day04-part-a-prompt-is-not-context.md`：为什么 Prompt 不是 Context
- `day04-part-b-01-runtime-state.md`：什么是 Runtime State
- `day04-part-b-02-runtime-state-lifecycle.md`：Runtime State Lifecycle
- `day04-part-c-context-builder-projection.md`：Context Builder 如何把 Runtime State 投影成 Provider Messages
- `day04-part-d-context-window-management.md`：Context Window Management，工业级重点
- `day04-part-e-provider-adapter.md`：Provider Adapter，补齐 LLM Provider 抽象与模型供应商适配层
- Day04 Part E 完成后进入 Day05 Tool Calling

## 核心内容

- Prompt 不是 Context，而只是 Runtime 当前状态的一张快照
- Context 不是 Conversation，而是 Runtime 世界的一次投影
- LLM 看到的不是 Runtime 本身，而是 Runtime 投影出来的 Provider Messages
- Context Builder 不是简单拼 Prompt，而是将 Runtime State 组织成适合 LLM 思考的输入
- Runtime 不负责替 LLM 思考，而负责创造一个适合 LLM 思考和行动的环境
- Runtime State 是 Runtime 对当前世界的认知，不是单纯聊天记录
- Conversation 记录发生过什么，Runtime State 描述现在是什么
- Runtime State 是一棵 State Tree，不同 State 之间会互相影响
- Runtime State 并不是每次变化都落库，只有 Conversation、Memory、Summary、Checkpoint 等部分按策略持久化
- Runtime 本质上是 State Machine，Agent Loop 的每一步都在推动 State 迁移
- Runtime State 不是随着程序启动诞生，而是随着 Runtime Session 或 Execution 开始创建
- Runtime State 不是从零开始，而是 Create + Restore：创建运行现场后恢复 Conversation、Memory、Summary、Checkpoint 等持久状态
- Agent Loop 本质上是 State Transition Loop，LLM 和 Tool 都只是推动 State 演化的 Action
- Runtime State 内部不同字段有不同生命周期：Ephemeral State 会随运行释放，Persistent State 会跨 Session 保留
- 不同 State 有不同 Persistence Policy：Conversation 立即追加、Summary 阈值触发、Memory 语义驱动、Checkpoint 里程碑触发
- Context 和 Prompt 通常不持久化；恢复 Execution 时恢复 Runtime State，然后重新生成 Context
- Checkpoint 保存的是可恢复的 Snapshot，不是 Action Replay
- 工业 Runtime 真正复杂的是 State Governance：Owner、Policy、Event Bus、Coordinator 与 Orchestrator
- React 的 Render 根据 State 渲染 UI；Agent Runtime 的 Context Builder 根据 Runtime State 渲染 LLM 所看到的世界
- Context Builder 是 Runtime 的认知调度中心，负责把 Runtime State 投影成 LLM 当前可见的 Provider Messages
- Context Projection 不是复制 Runtime State，而是根据 Goal、Policy 和 Token Budget 生成任务相关视图
- Context Builder 属于 Runtime Core，不属于 Provider Adapter；前者决定发送什么，后者决定如何发送
- Context Builder 内部可以拆成 Collection、Retrieval、Selection、Compression、Token Budget、Message Assembly 等阶段
- Context Selection 决定哪些信息进入 Context，Token Budget Management 决定有限窗口中如何分配空间
- Conversation、Memory、Workspace、Tool Result 都不是直接进入 LLM，而是先进入 Runtime State，再由 Context Builder 投影
- Retriever 负责发现信息，Context Builder 负责决定认知
- Context Engineering 不是 Prompt Engineering；Prompt 是 Context Builder 的产物，不是 Runtime 的起点
- Context Window 是 LLM 本轮可见的世界，不是 Runtime State、Memory 或 Conversation 本身
- 大 Context 不等于强 Agent；成本、延迟、噪声、注意力稀释和输出预留仍然需要治理
- Token Budget Manager 需要同时管理 System、Goal、Conversation、Memory、Workspace、Tool Result 与 Output Reserve
- Context Allocation 根据任务类型、当前步骤、检索结果和历史状态动态分配 token
- Priority Ranking 不能只按时间排序，而要综合相关性、重要性、新鲜度、依赖关系、用户约束、可信度和 token 成本
- Context Eviction 不是删除 Memory，而是让某些信息本轮不进入模型可见窗口
- Context Compression 的目标不是变短，而是保留目标、约束、决策、原因、当前状态和下一步
- Summary Memory 保存的是可继续执行的状态摘要，不是聊天记录的简短复述
- Hierarchical Context 通过分层摘要和按需展开，支撑长期任务中的状态连续性
- Long-running Agent 的连续性来自 Runtime State、Summary、Checkpoint 和每轮 Context Reconstruction
- Agent 的能力不来自拥有所有 Tool，而来自少量通用、可组合的原子 Tool
- 行业能力不等于行业代码，而是 Tool、Workflow、Context Policy 和 Memory Policy
- 模型决定推理能力的上限，Runtime 决定 Agent 在真实世界中的表现
- Agent 的核心不是 Prompt Engineering，而是 Runtime Engineering
