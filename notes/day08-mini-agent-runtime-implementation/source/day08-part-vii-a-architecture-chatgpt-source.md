# Day08 / Part VII-A 架构讨论 ChatGPT 源记录

- 会话链接：https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a9685e0-477c-83ee-95dc-fcff6a74068a
- 会话标题：Part VII - A
- 提取日期：2026-09-02
- 覆盖范围：项目级上下文、Part VII-A 架构收口、标准 Codex Implementation Task、Part VII-A～VII-I 路线与 Scope Guard
- 整理说明：本文件保存会话中的有效架构主线、最终决策和执行约束，不逐字复制页面 UI、重复问答和引用控件。最终工程学习记录见 `../day08-part-vii-a-foundation-model-provider.md`。

## 会话定位

这是 Part VII 第一个工程实现 Milestone 的架构讨论。讨论首先修正了任务交付格式：不应只给 Codex 一份零散类型清单，而应把架构讨论收口为标准化 Milestone Task。

最终形成的流程是：

```text
GPT 架构讨论
        ↓
Confirmed Design Decisions
        ↓
Milestone Implementation Task
        ↓
Codex 根据真实仓库实现
        ↓
Runtime Verification / Debug
        ↓
Code Review + Theory Feedback
        ↓
Milestone Closure
```

## 标准 Milestone Task 结构

会话确认后续 Part 统一使用：

1. Milestone Goal
2. Current Repository State
3. Confirmed Design Decisions
4. Implementation Scope
5. Out of Scope / Deferred Work
6. Constraints
7. Implementation-level Decisions
8. Acceptance Criteria
9. Tests / Verification
10. Codex Execution Rules
11. Final Report

核心区分是：

```text
Confirmed Design Decision
= Codex 不得自行推翻的架构边界

Implementation-level Decision
= Codex 可根据仓库真实状态做出的最小工程选择
```

例如，RuntimeMessage / ModelMessage 双层、Provider 不泄漏 OpenAI 类型、Streaming 延后属于 Confirmed Decision；具体文件名、mapping 使用私有方法还是纯函数、是否使用 dotenv 属于 Implementation-level Decision。

## Project Context

项目目标不是复刻 Pi Agent，也不是第一版构建完整 Agent Framework，而是把此前理论学习与 Pi 源码分析转化为可运行的 Node.js + TypeScript Mini Agent Runtime。

工程原则：

- 每个 Part 只实现当前需要；
- 目录和抽象随真实需求增长；
- 优先保证职责和边界正确；
- 不提前实现未来 Part；
- 不因为“以后可能需要”建立复杂抽象；
- 如果设计与真实代码冲突，采用最小安全实现并报告，不重新设计整个 Runtime。

## Part VII 路线

```text
VII-A  项目骨架 + 类型体系 + ModelProvider
VII-B  RuntimeState + Agent Loop
VII-C  Tool Registry + Tool Executor + Error Contract
VII-D  ContextBuilder + TurnSnapshot
VII-E  AgentEvent + Subscriber + Streaming
VII-F  Abort + Single Active Run
VII-G  SessionStore + Conversation Recovery
VII-H  beforeToolCall + 简单 Approval
VII-I  Weather Agent 完整链路
```

第一阶段继续延期 Session Tree、Durable Tool Execution、Durable Approval、Hot Extension Reload、复杂 Compaction、Multi-Agent、Sub-Agent、复杂 Memory、复杂 Provider Routing 和复杂 Workflow Engine。

## VII-A 最终目标

```text
手工构造 ModelRequest
        ↓
ModelProvider.generate()
        ↓
OpenAIModelProvider
        ↓
OpenAI SDK
        ↓
Provider 内部转换
        ↓
Runtime ModelResponse
        ↓
Demo 打印
```

需要证明 Runtime Core 不依赖 OpenAI SDK 类型，OpenAI-specific 协议收敛在 Adapter 内，Runtime 拥有自己的基础模型语言，而且尚未进入 Agent Loop 或 Tool Execution。

## Confirmed Design Decisions

### Provider-neutral Runtime Model

Runtime 自己定义 ModelRequest、ModelResponse、Message、ToolCall、FinishReason 和 ModelUsage。OpenAI request/response 只存在于 Provider 边界。

### RuntimeMessage / ModelMessage 双层

```text
RuntimeMessage = Runtime 内部消息事实
ModelMessage   = 准备发送给模型的 Provider-neutral 视图
```

VII-A 不实现复杂 ContextBuilder，只实现 Demo 所需的最薄转换。

### ModelMessage 角色

第一版只有 user、assistant、tool。AssistantMessage 允许 `content` 与 `toolCalls` 同时存在。

### ToolCall

```text
id
name
arguments: unknown
```

不加入 status、provider、metadata、riskLevel 等字段。参数 Schema Validation 延期到 Tool Executor。

### ToolDefinition

只描述给模型看的 name、description、parameters，不包含 execute、timeout、retry、permission 或 approval。

### ModelRequest / ModelResponse

ModelRequest 只有 messages 与可选 tools；model 不进入 request，而由 Provider 实例配置。

ModelResponse 只有 AssistantMessage、Runtime FinishReason 和可选 ModelUsage，不暴露 raw response。

### ModelProvider

第一版只有：

```ts
generate(request: ModelRequest): Promise<ModelResponse>
```

Streaming、listModels、countTokens、healthCheck 和 capability query 都延期。

### Provider 范围

第一版只实现 OpenAIModelProvider，不增加 Anthropic、Gemini、智谱、通用 OpenAI-compatible Provider、Provider Factory 或 Registry。

### Mock Provider

VII-A 不实现。MockModelProvider 留到 VII-B 对 Agent Loop 做确定性测试时引入。

## Acceptance 与 Verification

需要完成 install、build、tests、Demo 启动；mapping 测试优先覆盖 assistant text、tool call、finish reason 和 usage。真实 API 调用只做手动验证，不进入自动化测试。

## 会话最终交付

会话最终产出了一份可直接交给 Codex 的正式 `Codex Implementation Task — Part VII-A`，并在其前增加完整 Project Context 和 Part VII Roadmap，以降低第一个 Milestone 中 Codex 提前实现未来能力的风险。

