# Day08 / Part VII：Mini Agent Runtime 工程实现

Day08 正式从理论学习和 Pi Agent 源码解剖进入 `mini-agent-runtime` 工程实现。

这一阶段不以“快速做出完整 Agent”为目标，而是采用 Milestone-by-Milestone 的方式，让类型、状态、循环、工具、上下文、事件和持久化边界随着真实需求逐步出现。

Part VII v1 的目标是：

> 做出一个小而完整、架构边界清晰、能够真实运行的 Mini Agent Runtime v1，而不是一次塞入所有工业级能力。

整个 v1 固定为 **VII-A ～ VII-I，共 9 个 Milestone**。后续能力不得自行扩展成 VII-J～VII-M；如果未来需要，应在 Part VII v1 完成后重新讨论新的阶段规划。

```text
Architecture Analysis
        ↓
Design Decision
        ↓
Codex Implementation
        ↓
Runtime Verification / Debug
        ↓
Code Review + Theory Feedback
        ↓
Milestone Closure
```

## Day08 实现规划

### Part VII-A：项目骨架 + 类型体系 + ModelProvider

- [x] Node.js + TypeScript 工程骨架
- [x] Mini Agent Runtime 最基础类型语言
- [x] RuntimeMessage / ModelMessage 双层消息
- [x] ToolCall / ToolDefinition
- [x] ModelRequest / ModelResponse
- [x] ModelProvider.generate()
- [x] OpenAIModelProvider 与协议映射
- [x] 最小 Hello World 调用链
- [x] 自动化 mapping 测试
- [x] 真实 OpenAI-compatible Provider 调用
- [x] Code Review 与 malformed Tool arguments 错误边界修复

状态：**Done**

学习记录：

- [Day08 / Part VII-A：项目骨架、类型体系与 ModelProvider](day08-part-vii-a-foundation-model-provider.md)

源记录：

- [架构讨论与 Implementation Task](source/day08-part-vii-a-architecture-chatgpt-source.md)
- [Code Review 与 Fix Task](source/day08-part-vii-a-review-chatgpt-source.md)
- [Codex 实现、测试与 Debug 记录](source/day08-part-vii-a-codex-implementation-source.md)

### Part VII-B：RuntimeState + Agent Loop

- [x] RuntimeState 最小事实模型：仅保存 messages
- [x] 同一 Runtime 跨 run 保留历史，每次 run 调用一次模型
- [x] ModelResponse 先写回状态，再解释 finishReason
- [x] AgentRuntime 是 Runtime State 的唯一 mutation owner
- [x] 当前 unsupported flow 结束运行，多步骤循环留给 VII-C
- [x] 区分 Model Turn 的 finishReason 与 RunOutcome
- [x] MockModelProvider 与确定性 Runtime 测试

状态：**Implemented**（实现与自动化验证完成，待 Review / Closure）

实现入口：[`AgentRuntime`](../../src/runtime/agent-runtime.ts)。`stop` 返回 `completed`；`tool_calls`、`length`、`unknown` 保存输出后返回 `unsupported`；Provider 异常继续向上传播。

### Part VII-C：Tool Registry + Tool Executor + Error Contract

- [ ] Tool 注册与查找
- [ ] 参数处理与 Schema Validation
- [ ] Tool 执行与结果回流
- [ ] Tool Error Contract
- [ ] Tool not found
- [ ] Tool arguments invalid
- [ ] Tool execution exception

状态：**Planned**

### Part VII-D：ContextBuilder + TurnSnapshot

- [ ] Runtime State 与 LLM Context 解耦
- [ ] ContextBuilder
- [ ] TurnSnapshot
- [ ] 每轮基于当前 State 构建不可变调用快照
- [ ] 禁止直接把完整 RuntimeState 喂给模型

状态：**Planned**

### Part VII-E：AgentEvent + Subscriber

- [ ] Runtime Event Model
- [ ] Subscriber
- [ ] 将内部执行过程暴露给上层 UI
- [ ] 支持 Logger / Observability 消费事件
- [ ] Streaming 如在 v1 实现，只能在本 Milestone 结合 Event / Subscriber 设计，不单独扩展新 Part

状态：**Planned**

### Part VII-F：Abort + Single Active Run

- [ ] Abort / Cancellation
- [ ] 单会话 Single Active Run
- [ ] 防止同一 Runtime / Session 并发执行
- [ ] 防止并发写入造成状态竞争

状态：**Planned**

### Part VII-G：SessionStore + Conversation Recovery

- [ ] SessionStore
- [ ] Conversation 保存
- [ ] Conversation 恢复
- [ ] Runtime 重建后基于持久化状态继续对话

状态：**Planned**

### Part VII-H：beforeToolCall + 简单 Approval

- [ ] beforeToolCall
- [ ] Tool 执行前 Hook
- [ ] 最小 Human Approval
- [ ] 不实现 Durable Approval

状态：**Planned**

### Part VII-I：Weather Agent 完整链路

- [ ] 基于 VII-A～VII-H 的 Runtime Core 构建真实 Weather Agent
- [ ] User → Agent Loop
- [ ] Runtime → ContextBuilder → ModelProvider
- [ ] LLM → Tool Call
- [ ] beforeToolCall / Approval
- [ ] Tool Execution → Observation
- [ ] Observation → RuntimeState → Agent Loop
- [ ] Agent Loop → Final Answer

状态：**Planned**

最终集成链路：

```text
User
 ↓
Runtime
 ↓
ContextBuilder
 ↓
ModelProvider
 ↓
Tool Call
 ↓
beforeToolCall / Approval
 ↓
Tool Executor
 ↓
RuntimeState
 ↓
Agent Loop
 ↓
Final Answer
```

## 当前进度

```text
Part VII-A  [Done]     项目骨架 + 类型体系 + ModelProvider
Part VII-B  [Implemented] RuntimeState + Agent Loop（待 Review / Closure）
Part VII-C  [Planned]  Tool Registry + Tool Executor + Error Contract
Part VII-D  [Planned]  ContextBuilder + TurnSnapshot
Part VII-E  [Planned]  AgentEvent + Subscriber
Part VII-F  [Planned]  Abort + Single Active Run
Part VII-G  [Planned]  SessionStore + Conversation Recovery
Part VII-H  [Planned]  beforeToolCall + 简单 Approval
Part VII-I  [Planned]  Weather Agent 完整链路
```

## Day08 工程原则

1. 每个 Part 只实现当前 Milestone 真正需要的能力。
2. 不为了“以后可能需要”提前建立复杂抽象。
3. Runtime Core 不依赖供应商 SDK 类型。
4. Pi Agent 用于验证职责边界，不作为复制功能的模板。
5. 每个 Part 必须经过实现、运行、Debug、Review 和 Closure。
6. 讨论方案、最终代码和未采用方案必须在学习记录中明确区分。
7. Markdown 是唯一主版本；不按 Part 日常生成 PDF / DOCX。

## 第一阶段明确延期

```text
Session Tree
Durable Tool Execution
Durable Approval
Hot Extension Reload
复杂 Compaction
Multi-Agent / Sub-Agent
```

这些能力不属于 Part VII v1。当前 A-I 的任何 Milestone 都不能因为“顺手实现会更完整”而把它们加入 Scope。
