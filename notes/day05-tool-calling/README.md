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
