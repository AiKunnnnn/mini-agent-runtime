# Day07：Pi Agent 源码解剖·会话 1 ChatGPT 源记录

- 会话链接：https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a8ea61c-e01c-83ee-82a7-3459b7bc3e1e
- 会话标题：Pi Agent 源码解剖
- 提取日期：2026-08-27
- 覆盖范围：Part VI-A（架构地图）与 Part VI-B（Runtime Loop）
- 整理说明：本文件保存会话中的有效学习主线、关键源码映射和最终收尾结论，不逐字复制页面 UI、重复段落和来源按钮。正式学习笔记见 `../day07-session-01-architecture-and-runtime-loop.md`。

---

## Part VI-A：架构地图

会话形成的核心映射：

```text
Pi 世界                         自研世界

pi-agent-core          →       mini-agent-runtime
pi-coding-agent        →       customer-service-agent
```

领域业务能力属于具体 Domain Agent：

```text
订单查询 Tool
退款 Workflow
客服 System Prompt
客服业务规则
```

通用运行机制属于 Agent Runtime：

```text
Runtime Loop
Tool Executor
Agent State
Context Builder
Event Streaming
Stop Condition
```

由此形成的结构：

```text
mini-agent-runtime
├── customer-service-agent
├── data-agent
├── weather-agent
└── coding-agent
```

关键边界：不要把订单、退款等领域逻辑写死进 Runtime，否则 Runtime 会退化为不可复用的巨型业务 Agent。

---

## Part VI-B：Runtime Loop 主调用链

### 1. 主调用链

```text
agent.prompt()
    ↓
runPromptMessages()
    ↓
runWithLifecycle()
    ↓
runAgentLoop()
    ↓
runLoop()
    ↓
streamAssistantResponse()
    ↓
LLM
    ↓
toolCall?
├── no  → 检查 Steering / Follow-up / Stop
└── yes → executeToolCalls()
              ↓
          ToolResultMessage
              ↓
          currentContext.messages
              ↓
          下一轮 LLM
```

### 2. Agent 与 Loop 的职责边界

`Agent.prompt()` 是外部入口。它负责规范化输入并启动一次运行，但不拥有底层执行循环。

```text
Agent
= Runtime Controller / Facade

runLoop
= Execution / Control Flow Engine
```

Loop 接收明确依赖：

```text
prompts
context
config
emit
signal
streamFn
```

会话结论认为，这比 `runLoop(this)` 更容易测试、替换和推理，也能暴露 Runtime 真正依赖的能力。

### 3. State 到 Context Snapshot

会话记录了如下核心结构：

```ts
private createContextSnapshot(): AgentContext {
  return {
    systemPrompt: this._state.systemPrompt,
    messages: this._state.messages.slice(),
    tools: this._state.tools.slice(),
  };
}
```

这建立了一个待后续深入验证的转换链：

```text
Agent State
    ↓
Context Snapshot
    ↓
Runtime Loop
```

### 4. `newMessages` 与 `currentContext.messages`

```text
currentContext.messages
= 历史消息 + 本次输入 + 本次运行中新产生的消息

newMessages
= 本次 Runtime Run 新产生的消息
```

两者分开，为后续 State 回写、事件处理和持久化保留清晰边界。

### 5. Tool Result 回流

LLM 返回的是包含 `toolCall` 的 `AssistantMessage`，而不是直接执行 Tool。Runtime 解析意图并调用 Executor。

Tool 执行结果被包装成 `ToolResultMessage`，追加到：

```text
currentContext.messages
newMessages
```

下一轮 `streamAssistantResponse(currentContext)` 因此能够看到 Observation。

### 6. ReAct 映射

| ReAct 概念 | Pi 实现 |
|-|-|
| Reason | LLM / `AssistantMessage` |
| Action | `toolCall` |
| Action Executor | `executeToolCalls()` |
| Observation | `ToolResultMessage` |
| Scratch / Context | `currentContext.messages` |
| Loop | `runLoop()` |

### 7. 两层循环

```text
Outer Loop
│
├── Inner Loop
│   ├── LLM
│   ├── Tool Call
│   ├── Tool Result
│   ├── Steering
│   └── 下一轮
│
├── Agent 原本准备结束
├── Follow-up?
│   ├── yes → 继续 Outer Loop
│   └── no
└── agent_end
```

会话给出的职责解释：

- Inner Loop：处理当前执行链中的 Tool Calls 和 Steering。
- Outer Loop：处理 Agent 原本结束后才开始的 Follow-up。

### 8. 停止机制

会话区分了三类停止：

1. Natural Stop：没有 Tool、Steering 和 Follow-up。
2. Graceful Stop：`shouldStopAfterTurn()` 在完整 Turn 结束后要求停止。
3. Abort：通过 `AbortSignal` 中断当前运行。

此外，Tool Executor 可以返回 `terminate` 信号，但是否改变循环状态仍由 Runtime 决定。

```text
terminate
→ Execution Result Signal

shouldStopAfterTurn
→ Runtime Policy
```

### 9. Steering 与 Follow-up

| 维度 | Steering | Follow-up |
|-|-|-|
| 插入时机 | 当前执行过程中 | Agent 原本准备结束后 |
| 当前 Tool | 先正常执行完 | 不影响当前执行 |
| 用途 | 修正当前任务方向 | 追加后续任务 |
| Queue | `steeringQueue` | `followUpQueue` |
| Loop | Inner Loop | Outer Loop |

Steering 不是 Abort：

```text
Abort
= 现在取消

Steering
= 当前 Turn 正常收尾，下一轮改变方向
```

### 10. Turn Boundary Hook

`prepareNextTurn` 和 `shouldStopAfterTurn` 把扩展点放在：

```text
Turn End
    ↓
Next Provider Request
```

这个边界适合承载 Context Compression、Checkpoint、Policy Check、Model Switch、Persistence 和 Metrics。

---

## 会话最终结论

```text
LLM
= Semantic Decision Engine

Runtime
= Deterministic Control Engine
```

LLM 决定下一步想做什么；Runtime 决定该意图如何被执行、结果如何进入状态、是否继续下一轮以及何时停止。

Runtime Loop 因而不是单纯的“LLM + Tool 循环”，而是管理 Turn、Tool、Context、干预、停止、异常和取消的控制流状态机。

---

## 下一会话

### Part VI-C：Pi Agent State

- `_state` 保存什么？
- `AgentState` 和 `AgentContext` 有什么区别？
- `messages` 由谁拥有？
- Loop 为什么使用 Context Snapshot？
- 本轮新消息如何回写 Agent State？

### Part VI-D：Context Builder / Message Projection

- `transformContext`
- `convertToLlm`
- `AgentMessage`
- `Message`
- `systemPrompt`
- `tools`

核心问题：Runtime 内部状态经过什么转换，才成为真正发给 LLM 的 Context？
