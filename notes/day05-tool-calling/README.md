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
- Day05 Part D：Tool Registry
  - [Markdown 主版本](day05-part-d-tool-registry.md)
  - [PDF 阅读版](day05-part-d-tool-registry.pdf)
  - [DOCX 可编辑版](day05-part-d-tool-registry.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-d-chatgpt-share-source.md)
- Day05 Part E：Tool Executor
  - [Markdown 主版本](day05-part-e-tool-executor.md)
  - [PDF 阅读版](day05-part-e-tool-executor.pdf)
  - [DOCX 可编辑版](day05-part-e-tool-executor.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-e-chatgpt-share-source.md)
- Day05 Part F：Permission & Human Approval
  - [Markdown 主版本](day05-part-f-permission-human-approval.md)
  - [PDF 阅读版](day05-part-f-permission-human-approval.pdf)
  - [DOCX 可编辑版](day05-part-f-permission-human-approval.docx)
  - [ChatGPT 分享会话源记录](source/day05-part-f-chatgpt-share-source.md)

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

## Day05 Part D 目标

Day05 Part D：Tool Registry，重点回答：

1. Tool Registry 为什么不是简单的 `Map<String, Tool>`
2. Runtime 如何管理所有能力，但每轮只向 LLM 暴露当前能力
3. Tool Definition 与 Tool Implementation 为什么要分离
4. Tool Metadata 如何承载分类、来源、风险、权限和版本信息
5. Tool Routing 如何降低 LLM 的 Action Space
6. Tool Registry 与 Context Builder 如何协同
7. MCP 暴露的外部能力为什么最终仍要进入 Runtime Registry
8. 如何区分内置 Tool 与外部 MCP
9. mini-agent-runtime 中如何实现最小 Tool Registry

## Part D 核心认知

- Tool Registry 不是工具列表，而是 Agent Runtime 的 Capability Management Center
- Registry 管理所有能力，LLM 每轮只看到当前需要、允许、相关的能力
- Tool Registry 管理 Agent 的行动空间，Context Builder 管理 Agent 的信息空间
- Tool Routing 的目标是先缩小候选 Action Space，再交给 LLM 做最终 Tool Decision
- MCP 不是替代 Tool，而是让外部能力以标准方式进入 Tool Registry
- Tool Registry 是 Permission、Lifecycle、Evaluation 和 Tool Executor 的前置基础

## Day05 Part E 目标

Day05 Part E：Tool Executor，重点回答：

1. Tool Executor 为什么不是简单的 `tool.execute()`
2. 为什么 LLM 只能产生 Tool Call Intent，不能直接执行 Tool
3. Tool Call Intent 如何通过 `name` 进入 Tool Registry 查找真实实现
4. Tool Registry、Tool Router、Context Builder、LLM 与 Executor 的职责边界
5. Tool Execution Context 为什么属于 Runtime 内部契约，而不是 LLM 协议标准
6. Executor 如何处理参数校验、业务校验、权限检查、超时、重试、取消和幂等
7. Tool Error 为什么应该转成 Observation 回流 Agent Loop
8. Tool Result 为什么要先进入 Runtime State，再由 Context Builder 投影给 LLM
9. Dynamic Tool / MCP / Plugin 如何进入 Runtime 的执行体系
10. mini-agent-runtime 中如何实现最小 Tool Executor

## Part E 核心认知

- Tool Executor 是 Agent Runtime 的 Execution Kernel，不是普通函数调用器
- LLM 负责 Decision，Executor 负责 Runtime Managed Execution
- LLM 输出的 Tool Call Intent 通常已经包含具体 Tool name，Executor 通过 `registry.get(name)` 找到 Tool Implementation
- ToolExecutionContext 中的 `userId`、`permissions`、`workspace`、`logger` 等字段属于 Runtime 内部契约，不是模型协议标准
- Executor 是安全边界、可靠性边界和可观测性边界，需要集中处理 Validation、Permission、Retry、Timeout、Cancellation、Idempotency 和 Tracing
- Tool Error 不是简单 Exception，而是可以回流 LLM 的 Observation
- Tool Result 不应该总是直接塞给 LLM，而应该先经过 Result Processor 写回 Runtime State
- 工业 Agent 通常采用核心 Tool 静态内置、扩展 Tool 动态发现的混合能力体系

## Day05 Part F 目标

Day05 Part F：Permission & Human Approval，重点回答：

1. 为什么 Agent 需要独立于传统 API 权限之外的 Action Permission
2. Agent Permission 与传统 RBAC / ABAC 的区别
3. Tool Metadata 为什么只是策略输入，而不是安全边界
4. Permission Check 应该放在 Tool Executor Pipeline 的哪个位置
5. Policy Engine、PDP、PEP 在 Agent Runtime 中如何分工
6. 为什么 Permission Decision 需要 `allow` / `deny` / `approval_required` 三态
7. 如何理解伪造 Tool Call Intent、Prompt Injection 与 Runtime Governance 的关系
8. Agent Permission 与 Business Service Authorization 的职责边界
9. 为什么业务系统仍然必须保留最终安全校验
10. Human Approval 为什么是风险管理层，而不是唯一安全兜底

## Part F 核心认知

- Agent Permission 不是限制用户访问 API，而是在限制 Agent 代表用户采取行动
- LLM 输出的 Tool Call Intent 应被视为不可信 Action Proposal，而不是可信执行指令
- Tool Metadata 是 Capability Description 和 Policy Input，不是 Enforcement Boundary
- Runtime Governance Layer 需要在 Decision Layer 和 Execution Layer 之间进行 Validation、Policy、Approval 和 Audit
- Permission Decision 不应只有布尔值，还需要 `approval_required` 来支持 Human-in-the-loop
- Agent Runtime 负责限制 AI 的能力范围，业务系统负责保护核心资产
- Agent Security 采用纵深防御：Intent Validation、Policy Engine、Human Approval、Executor Enforcement、Business API Authorization 和 Data Security 各自承担一层责任
