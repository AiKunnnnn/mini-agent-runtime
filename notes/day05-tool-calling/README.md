# Day05：Tool Calling（Execution Engine）

Day05 将进入 Agent Runtime 的执行系统。

Day04 已经完成 Runtime 的认知系统：Runtime State、Context Builder、Context Window Management 和 Provider Adapter。Day04.5 又补齐了工业术语映射。Day05 开始回答一个新的问题：

> Runtime 已经知道如何组织上下文让 LLM 思考，那么它如何让 Agent 真正行动？

Tool Calling 的核心不是“LLM 调 API”，而是：

> LLM 生成结构化行动意图，Runtime 负责验证、执行、观察结果，并把结果写回 Runtime State，进入下一轮 Agent Loop。

## Day05 学习计划

- `day05-part-a-tool-calling-basics.md`：Tool Calling 基础模型
- `day05-part-b-tool-decision.md`：LLM 如何决定调用 Tool
- `day05-part-c-tool-schema.md`：Tool Schema 设计
- `day05-part-d-tool-registry.md`：Tool Registry
- `day05-part-e-tool-executor.md`：Tool Executor
- `day05-part-f-permission-human-approval.md`：Permission & Human Approval
- `day05-part-g-tool-result-runtime-feedback.md`：Tool Result 回流 Runtime
- `day05-part-h-multi-tool-loop.md`：Multi Tool Loop
- `day05-part-i-mini-tool-runtime-implementation.md`：Mini Tool Runtime 实现

## 文件

- Day05 Part A：Tool Calling 基础模型
  - [Markdown 主版本](day05-part-a-tool-calling-basics.md)
  - [PDF 阅读版](day05-part-a-tool-calling-basics.pdf)
  - [DOCX 可编辑版](day05-part-a-tool-calling-basics.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-a-chatgpt-share-source.md)
- Day05 Part B：LLM 如何决定调用 Tool
  - [Markdown 主版本](day05-part-b-tool-decision.md)
  - [PDF 阅读版](day05-part-b-tool-decision.pdf)
  - [DOCX 可编辑版](day05-part-b-tool-decision.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-b-chatgpt-share-source.md)
- Day05 Part C：Tool Schema 设计
  - [Markdown 主版本](day05-part-c-tool-schema.md)
  - [PDF 阅读版](day05-part-c-tool-schema.pdf)
  - [DOCX 可编辑版](day05-part-c-tool-schema.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-c-chatgpt-share-source.md)

## Day05 Part A 目标

Day05 Part A：Tool Calling 基础模型，重点回答：

1. Tool Calling 为什么让 LLM 从聊天模型变成 Agent
2. Tool / Function / Action 三者有什么区别
3. Tool Calling 在 Agent Loop 中的位置
4. ReAct 与 Tool Calling 的关系
5. OpenAI Agents SDK / Claude Code / LangGraph 中 Tool 的真实定位
6. mini-agent-runtime 中 Tool 数据模型如何设计

## 预期核心认知

- Tool Calling 不等于 LLM 直接调用 API
- LLM 负责产生 Tool Call Intent，Runtime 才是真正的执行者
- Tool Definition / Tool Schema 是模型和 Runtime 之间的行动契约
- Tool Registry 管理 Runtime 可用能力
- Tool Executor 负责安全执行外部动作
- Tool Result 在 ReAct 语境下就是 Observation
- Tool Result 必须回流 Runtime State，再由 Context Builder 进入下一轮 Context
- Multi Tool Loop 是 Agent 从“会回答”到“会做事”的关键

## Day05 Part B 目标

Day05 Part B：LLM 如何决定调用 Tool，重点回答：

1. Tool Decision 为什么是 Action Selection
2. Tool Calling 为什么不是 if/else Rule
3. Goal Understanding 如何连接到 Tool Decision
4. Tool Schema 如何影响模型决策
5. auto、required、none 三种 Tool Choice 模式有什么区别
6. Context、Tool Definition、Runtime Policy 如何共同影响 Tool Decision
7. 为什么 Tool 存在不代表 Agent 一定会调用
8. 为什么生产 Agent 需要区分 Decision Layer 与 Execution Layer

## Part B 核心认知

- Tool Decision 不是函数匹配，而是 Goal-driven Action Selection
- Tool Schema 会改变 LLM 的行动空间
- LLM 输出的是 Tool Call Intent，Runtime 才控制是否执行
- 模型能力、Context 质量、Tool Schema 设计都会影响 Tool Decision
- 工业 Agent 往往采用 LLM Decision + Runtime Policy + Workflow Constraint 的混合控制

## Day05 Part C 目标

Day05 Part C：Tool Schema 设计，重点回答：

1. Tool Schema 为什么是 LLM 与 Runtime 之间的 Action Contract
2. name、description、parameters 如何影响模型理解与调用质量
3. 为什么万能 Tool 是坏设计
4. Tool 粒度如何影响 Action Space
5. Tool Schema 如何改变 Agent Decision
6. 工业级 Tool Contract 为什么需要 inputSchema、outputSchema、errorSchema 和 metadata
7. Tool Result 中的业务枚举如何通过 Semantic Schema 让 LLM 正确理解
8. mini-agent-runtime 中 Tool 数据模型如何设计

## Part C 核心认知

- Tool Schema 不是普通 API 文档，而是 Agent 的行动空间设计
- Tool Schema 是一种结构化 Prompt，会影响 Tool Selection 和参数生成
- 好的 Tool 设计不是给 Agent 最大能力，而是给 Agent 清晰能力
- 生产级 Tool Contract 需要同时描述输入、输出、错误、权限和 Runtime 控制信息
- Tool Result 也是 Context，Output Schema 和 Semantic Schema 会影响下一轮 LLM 如何理解世界
