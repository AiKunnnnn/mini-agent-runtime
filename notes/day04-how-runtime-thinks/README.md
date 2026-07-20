# Day04：Runtime 如何思考（How Runtime Thinks）

Day04 解决的是 Runtime 如何把真实世界组织成 LLM 可以理解的 Context。

Day04 不再只按“天”推进，而是拆成多个 Part。Part A 先建立世界观：Prompt 不是 Context，Context 是 Runtime State 的一次 Projection。

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

## Day04 拆分计划

- `day04-part-a-prompt-is-not-context.md`：为什么 Prompt 不是 Context
- `day04-part-b-01-runtime-state.md`：什么是 Runtime State
- `day04-part-b-02-runtime-state-lifecycle.md`：Runtime State Lifecycle
- `day04-part-c-context-builder-projection.md`：Context Builder 如何把 Runtime State 投影成 Prompt
- `day04-part-d-context-window-management.md`：Context Window Management，工业级重点
- `day04-part-e-provider-adapter.md`：Provider Adapter

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
- React 的 Render 根据 State 渲染 UI；Agent Runtime 的 Context Builder 根据 Runtime State 渲染 LLM 所看到的世界
- Agent 的能力不来自拥有所有 Tool，而来自少量通用、可组合的原子 Tool
- 行业能力不等于行业代码，而是 Tool、Workflow、Context Policy 和 Memory Policy
- 模型决定推理能力的上限，Runtime 决定 Agent 在真实世界中的表现
- Agent 的核心不是 Prompt Engineering，而是 Runtime Engineering
