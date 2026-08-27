# Day07：Pi Agent 源码解剖·会话 2 ChatGPT 源记录

- 会话链接：https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c-agent-xue-xi/c/6a8faaeb-d528-83ee-9ed1-3739bf9caaff
- 会话标题：剖析 Pi Agent State
- 提取日期：2026-08-27
- 覆盖范围：Part VI-C（Pi Agent State）与 Part VI-D（Context Builder / Message Projection）
- 整理说明：本文件保存对话中的有效学习主线、关键源码结论与讨论修正，不逐字复制重复问答、页面 UI 和引用控件。正式学习笔记见 `../day07-session-02-state-and-context-projection.md`。

---

## Part VI-C：Pi Agent State

### 1. State 结构

会话把 `AgentState` 分为两类：

```text
持续配置与会话状态：
systemPrompt / model / thinkingLevel / tools / messages

当前运行的临时状态：
isStreaming / streamingMessage / pendingToolCalls / errorMessage
```

`AgentState` 是内存中的 Agent 运行状态，不等于持久化 Session。

### 2. State Ownership

```text
Agent owns State.
```

低层 Loop 不拥有 `_state`。Agent 通过 `createContextSnapshot()` 把当前运行所需字段投影为 `AgentContext`：

```text
AgentState
    ↓ snapshot / projection
AgentContext
    ↓
Runtime Loop
```

`messages` 与 `tools` 使用浅复制的新数组，以隔离顶层数组和限制 Loop 的写入范围。

### 3. Event 驱动回写

Loop 通过事件报告执行事实：

```text
Runtime Loop
    ↓ AgentEvent
Agent.processEvents()
    ↓ state reduction
AgentState
```

关键状态变化包括：

```text
message_start / message_update
→ streamingMessage

message_end
→ 清理 streamingMessage，并提交 final message

tool_execution_start / end
→ pendingToolCalls add / delete
```

会话把 `processEvents()` 理解为 Event → State Transition 的 reducer 角色。

### 4. 三个消息集合

```text
_state.messages
= Agent 拥有的完整 Transcript

currentContext.messages
= 当前 Run 的完整工作上下文

newMessages
= 当前 loop invocation 的返回增量
```

`newMessages` 是 Run Result / Delta，不是 State Store。

### 5. Runtime Status 语义

`isStreaming` 覆盖整个 Agent Run，而不只是模型输出 token 的时段，语义更接近 `isRunning`。

`streamingMessage` 表示 working / partial state；`messages` 保存 finalized / committed transcript。

---

## Part VI-D：Context / Message Projection

### 1. 数据链

```text
AgentState
    ↓ createContextSnapshot
AgentContext
    ↓ transformContext
AgentMessage[]
    ↓ convertToLlm
Message[]
    ↓ 与 systemPrompt / tools 组装
LLM Context
    ↓
Provider
```

会话由此确认：State、AgentContext、AgentMessage Context 与 LLM Context 不是同一个对象。

### 2. `transformContext`

```text
AgentMessage[] → AgentMessage[]
```

它是可选的 Context Policy Hook，可承载 pruning、token budget、compaction、RAG / Memory / domain context injection 等策略。

它处理的是本次 Loop 的消息上下文，不是直接格式化整个 Agent State。

### 3. `convertToLlm`

```text
AgentMessage[] → LLM-compatible Message[]
```

它用于过滤 LLM 不应看到的自定义消息，或把自定义 Agent Message 映射成模型支持的消息。

Pi 的默认实现非常轻量：保留 `user`、`assistant` 与 `toolResult`。复杂映射由上层替换。

### 4. 对话中的重要修正

最初讨论容易让人误以为 Pi Core 自带完整 Context Builder。源码核对后修正为：

```text
Pi Core 定义 Context Pipeline
+ 提供轻量默认 Message Conversion
+ 暴露策略扩展点

Pi Core 不替调用方实现完整的
Token Budget / Compaction / Memory Retrieval / Domain Context Policy
```

`transformContext` 与 `convertToLlm` 都是高阶函数 / Callback Strategy：Runtime 决定何时调用，传入函数决定如何处理。

---

## Mechanism 与 Policy

会话最终形成三层模型：

```text
1. Runtime Mechanism
   Loop / State / Events / Lifecycle / Hooks / Abort

2. Reusable Runtime Policy
   Retry / Timeout / Token Budget / Rate Limit / Concurrency

3. Domain Policy
   Coding / Customer Service / Data Agent 的领域规则
```

核心认知：

> Runtime 不一定实现所有策略，但应该在正确的生命周期节点提供策略插入点。

理论学习中列出的各种 Policy，首先是在识别决策点；真实框架可以只提供 Policy Boundary，而不是内置所有 Policy Engine。

---

## 对客服 Agent 的映射

```text
packages/agent
= Pi 通用 Runtime Core

packages/customer-service-agent
= 基于 Core 组装的 Domain Agent
```

客服 Agent 负责 prompts、tools、policies、context、workflows 与 business adapters；订单、CRM、退款系统继续负责真实业务执行与数据一致性。

整体分层：

```text
Runtime Core
    ↓
Customer Service Agent
    ↓
Order / Refund / CRM Services
```

---

## 会话最终收尾

- Part VI-C + VI-D 已完成。
- 已打通 `_state → AgentContext → transformContext → convertToLlm → LLM`。
- 已确认 Event → `processEvents()` → State 的反向链路。
- 下一会话进入 Part VI-E + VI-F + VI-G：Tool Registry、Tool Execution、Observation 与 Multi-Tool Flow。

## 核心源码位置

```text
packages/agent/src/agent.ts
→ Agent._state / defaultConvertToLlm / createContextSnapshot
→ createLoopConfig / processEvents / lifecycle

packages/agent/src/types.ts
→ AgentState / AgentContext / AgentMessage / AgentLoopConfig
→ transformContext / convertToLlm

packages/agent/src/agent-loop.ts
→ runAgentLoop / runLoop / streamAssistantResponse
→ currentContext.messages / newMessages / LLM Context assembly

packages/agent/README.md
→ State、Context Transformation、Custom Message Conversion 的官方说明
```

## 核对资料

- Pi 仓库 Agent Loop：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts
- Pi 仓库 Agent：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent.ts
- Pi 仓库类型定义：https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts
- Pi Agent README：https://github.com/earendil-works/pi/blob/main/packages/agent/README.md
