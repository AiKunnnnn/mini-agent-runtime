# Day07：Pi Agent 源码解剖·会话 1——架构地图与 Runtime Loop

> 本文是《从零实现 Agent Runtime》Day07 / Part VI 的第一份正式学习笔记，覆盖 Part VI-A（Pi Agent 架构地图）和 Part VI-B（Runtime Loop）。
>
> 本阶段不再只从抽象概念出发，而是把 Day01～Day06 建立的模型放回真实源码中验证，并反推 `mini-agent-runtime` 应保留的职责边界。

---

## 一、本会话学习目标

本会话重点回答：

1. Pi 的通用 Agent Runtime 与 Coding Agent 如何分层？
2. `Agent.prompt()` 如何进入真正的 Runtime Loop？
3. Tool Call、Tool Result 与下一轮 LLM 调用如何形成闭环？
4. 为什么 Loop 必须由 Runtime，而不是 LLM 或 Tool 拥有？
5. Pi 为什么使用两层 `while`？
6. Natural Stop、Tool `terminate`、Graceful Stop 与 Abort 有什么区别？
7. Steering 与 Follow-up 如何进入运行中的 Agent？
8. 哪些设计值得带回 `mini-agent-runtime`？

---

## 二、Part VI-A：Pi Agent 架构地图

### 2.1 通用 Runtime 与 Domain Agent

本会话首先建立了下面的映射：

```text
Pi 世界                         我们自己的世界

pi-agent-core          →       mini-agent-runtime
pi-coding-agent        →       customer-service-agent
```

这里的重点不是包名，而是分层方式：

```text
Model Abstraction
        ↓
Generic Agent Runtime
        ↓
Domain Agent
```

通用 Runtime 承载可复用机制：

- Runtime Loop
- Agent State
- Context 构造与转换
- Tool 执行协调
- Event Streaming
- Abort 与 Stop Condition
- 生命周期控制

Domain Agent 承载领域语义和业务能力：

- Coding Agent 的文件、终端、补丁等工具
- Customer Service Agent 的订单查询、退款流程和客服规则
- Data Agent 的 Schema、SQL、分析和可视化能力

因此自己的目标结构应当是：

```text
mini-agent-runtime
├── customer-service-agent
├── data-agent
├── weather-agent
└── coding-agent
```

### 2.2 最重要的边界

> Runtime 提供通用运行机制，Domain Agent 组合领域能力。

不要把订单查询、退款规则、客服 Prompt 等业务逻辑写死进 Runtime。否则系统会逐渐变成：

```text
Runtime
= Loop
+ Tool Executor
+ 客服逻辑
+ 订单逻辑
+ Data Agent 逻辑
+ Coding Agent 逻辑
```

这样的组件既难以复用，也无法再被称为通用 Runtime。

---

## 三、Part VI-B：Runtime Loop 主调用链

### 3.1 总调用链

```text
agent.prompt()
    ↓
normalizePromptInput()
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
├── no  → 检查停止条件和排队消息
└── yes → executeToolCalls()
              ↓
          ToolResultMessage
              ↓
          currentContext.messages
              ↓
          下一轮 streamAssistantResponse()
```

这条链把 Day02～Day05 的抽象模型第一次映射到了真实源码：

```text
LLM → Tool → Observation → LLM
```

在 Pi 中对应：

```text
AssistantMessage(toolCall)
    ↓
executeToolCalls()
    ↓
ToolResultMessage
    ↓
currentContext.messages
    ↓
streamAssistantResponse()
```

### 3.2 `Agent.prompt()` 只是入口

`prompt()` 的核心职责是：

1. 检查是否已有活动运行。
2. 把外部输入规范化为内部消息。
3. 启动一次带生命周期管理的 Runtime Run。

它不直接实现 LLM 与 Tool 的循环。

```text
Agent
= Runtime Controller / Facade

runLoop
= Execution / Control Flow Engine
```

这比把所有逻辑塞入一个巨大的 `Agent` 类更清晰：外部 API、状态所有权和运行控制可以继续由 Agent 管理，底层循环则保持独立。

### 3.3 Loop 接收明确依赖

会话中记录的 `runAgentLoop()` 依赖包括：

```text
prompts   → 本次新增输入
context   → 当前 Runtime Context
config    → Loop 配置与策略
emit      → Event System
signal    → Abort / Cancel
streamFn  → Provider Streaming
```

Pi 没有采用：

```ts
runLoop(this)
```

而是显式传入 Loop 真正需要的依赖。其价值包括：

- 降低执行引擎与 Agent 实例的耦合。
- 明确 Loop 能读写哪些能力。
- 更容易做单元测试和替换实现。
- 避免底层代码通过 `this` 隐式修改任意状态。

---

## 四、从 State 到当前运行上下文

### 4.1 Context Snapshot

会话记录的核心结构是：

```ts
private createContextSnapshot(): AgentContext {
  return {
    systemPrompt: this._state.systemPrompt,
    messages: this._state.messages.slice(),
    tools: this._state.tools.slice(),
  };
}
```

这说明 Agent 持有完整 `_state`，但进入 Loop 的不是整个 Agent 实例，而是当前运行所需的 Context Snapshot：

```text
Agent State
    ↓ projection / snapshot
Agent Context
    ↓
Runtime Loop
```

数组使用浅复制也体现了一个重要意图：Loop 可以维护本次运行的上下文，而不应直接把 Agent 的原始数组当成自己的可变工作区。

> `AgentState`、`AgentContext` 与最终 LLM Context 的精确边界，留到 Part VI-C / VI-D 继续验证。

### 4.2 旧历史与新 Prompt 的合并

`runAgentLoop()` 会把本次输入追加到已有 Context：

```text
Historical Messages
        +
Current Prompt
        ↓
currentContext.messages
```

Prompt 不是脱离历史单独发给模型的字符串，而是当前 Conversation / Runtime State 投影中的新增输入。

### 4.3 为什么同时维护两个消息数组

```text
currentContext.messages
= 历史消息 + 本轮新增消息

newMessages
= 仅本次 Runtime Run 新产生的消息
```

例如：

```text
历史消息：A B C
本轮新增：D E F

currentContext.messages = A B C D E F
newMessages             = D E F
```

这种拆分可以支持：

- 完整上下文供下一轮模型调用。
- 仅返回增量，避免重复回写历史。
- 让事件、持久化和 State 更新围绕本轮变化工作。

---

## 五、LLM Context 的生成入口

Loop 内部通过 `streamAssistantResponse()` 调用模型。会话记录的转换链是：

```text
Runtime Context
    ↓
transformContext
    ↓
convertToLlm
    ↓
LLM Context
    ↓
streamFunction
    ↓
Provider / Model
```

最终 LLM Context 至少包含：

```text
systemPrompt
messages
tools
```

这里再次验证了 Day04 的核心结论：

> Runtime State 不等于 LLM Context；中间必须存在选择、转换和 Provider 适配。

本会话只定位这条链，具体消息投影留到 Part VI-D。

---

## 六、Tool Call 与 Observation 回流

### 6.1 LLM 只产生 Tool Intent

LLM 返回一个 `AssistantMessage`。Runtime 从内容中识别 `toolCall`：

```text
LLM
    ↓
AssistantMessage
    ↓
toolCall(name, arguments)
```

LLM 没有直接执行 Tool。它只负责语义决策：

```text
要不要调用 Tool？
调用哪个 Tool？
参数是什么？
```

真正的验证、调度和执行属于 Runtime。

### 6.2 Tool Result 如何让下一轮 LLM 看见

完整链路是：

```text
toolCall
    ↓
executeToolCalls()
    ↓
ToolResultMessage
    ↓
currentContext.messages.push(result)
newMessages.push(result)
    ↓
内层 while 继续
    ↓
streamAssistantResponse(currentContext)
    ↓
LLM 看见 ToolResultMessage
```

这解释了“Tool 执行完为什么 LLM 会知道结果”：

1. Tool Result 被规范化成 Runtime 可理解的 `ToolResultMessage`。
2. 结果进入 `currentContext.messages`。
3. Runtime 的继续条件仍成立。
4. 下一轮 Provider Request 使用更新后的 Context。

不是 Tool 自动唤醒 LLM，也不是 LLM 调用自己；是 Runtime Loop 再次发起模型调用。

### 6.3 ReAct 与 Pi 的映射

| ReAct 概念 | Pi 源码概念 |
|-|-|
| Reason | LLM response / `AssistantMessage` |
| Action | `toolCall` |
| Action Executor | `executeToolCalls()` |
| Observation | `ToolResultMessage` |
| Scratch / Context | `currentContext.messages` |
| Execution Loop | `runLoop()` |

因此 ReAct 不一定表现为一个名为 `ReActAgent` 的类，它更常是一种 Runtime execution pattern。

---

## 七、谁拥有控制流

Tool Executor 返回的核心结果可抽象为：

```ts
{
  messages: ToolResultMessage[],
  terminate: boolean,
}
```

Executor 负责执行并报告结果或信号，但它不负责：

- 再次调用 LLM。
- 直接修改整个 Agent Loop。
- 在 Tool 内部偷偷 `break` 外层循环。

是否继续由 `runLoop()` 根据执行结果和 Runtime Policy 决定。

> Execution 与 Control Flow 必须分离。

可以在之前的三个问题之后再加一个 Runtime 设计问题：

```text
Who owns State?
Who decides State?
Who changes State?
Who owns the Loop?
```

Pi 在本会话范围内给出的答案是：

```text
Runtime owns the Loop.
```

---

## 八、为什么有两层 `while`

简化后的结构：

```text
Outer Loop
│
├── Inner Loop
│   ├── turn_start
│   ├── 注入 pending steering
│   ├── 构造 LLM Context
│   ├── 调用 LLM
│   ├── 追加 AssistantMessage
│   ├── 检测 Tool Calls
│   ├── 执行 Tools
│   ├── 追加 ToolResultMessage
│   ├── turn_end
│   ├── prepareNextTurn
│   ├── shouldStopAfterTurn?
│   └── 读取 Steering Queue
│
├── 当前执行链原本准备结束
├── 读取 Follow-up Queue
│   ├── 有 → 再进入 Outer Loop
│   └── 无
└── agent_end
```

两层循环表达了两类不同工作：

- Inner Loop：当前执行链中的 Tool Calls 与 mid-run Steering。
- Outer Loop：Agent 原本结束后追加的 post-run Follow-up。

所以两层 Loop 不是无意义的复杂度，而是 Runtime 对不同消息时机的显式建模。

---

## 九、工业级停止模型

最小 Agent Loop 常写成：

```ts
if (!response.toolCall) break;
```

但真实 Runtime 的继续条件来自多个来源：

```text
Should Continue?
= LLM State
+ Tool State
+ Runtime Policy
+ External Control
+ Queued Messages
```

### 9.1 Natural Stop

当以下条件同时满足时自然结束：

- LLM 不再产生 Tool Call。
- 没有 Steering Message。
- 没有 Follow-up Message。

### 9.2 Tool `terminate`

Tool Executor 可以返回 `terminate`：

```text
Tool
    ↓
terminate signal
    ↓
Runtime 更新 hasMoreToolCalls
```

`terminate` 是 Execution Result Signal。Tool 只提供信号，Loop 仍由 Runtime 控制。

### 9.3 `shouldStopAfterTurn`

`shouldStopAfterTurn` 是 Runtime Policy：当前 Assistant Response 与 Tool 执行完整结束后，再决定是否优雅停止。

适用场景包括：

- Context 接近阈值，需要在下一轮前压缩。
- 业务限制要求完成当前 Turn 后停止。
- 本轮完成后需要把控制权交回上层 Orchestrator。

### 9.4 Abort

Abort 通过 `AbortSignal` 直接中断当前运行，语义是取消，而不是优雅收尾。

### 9.5 四类信号对照

| 类型 | 来源 | 时机 | 语义 |
|-|-|-|-|
| Natural Stop | LLM + Queue 状态 | 无后续工作时 | 正常结束 |
| Tool `terminate` | Tool execution result | Tool 执行后 | 当前执行链无需继续 |
| Graceful Stop | Runtime policy | Turn 完整结束后 | 做完本轮再停 |
| Abort | 外部控制 / `AbortSignal` | 运行中 | 立即取消 |

---

## 十、Steering、Follow-up 与 Human Control

### 10.1 Steering

`agent.steer(message)` 把消息放入 `steeringQueue`。它不会粗暴打断正在执行的 Tool，而是在当前 Turn 收尾后注入下一轮 Context，用于改变当前任务方向。

```text
当前 Turn 正常完成
    ↓
getSteeringMessages()
    ↓
pendingMessages
    ↓
currentContext.messages
    ↓
下一轮 LLM 按新方向继续
```

### 10.2 Follow-up

`agent.followUp(message)` 把消息放入 `followUpQueue`。只有 Agent 原本准备结束时，Outer Loop 才取出这些消息并开启后续工作。

```text
当前执行链结束
    ↓
getFollowUpMessages()
    ↓
有新任务？
├── yes → Outer Loop 继续
└── no  → agent_end
```

### 10.3 对照

| 维度 | Steering | Follow-up |
|-|-|-|
| 插入时机 | 当前执行过程中 | Agent 原本准备结束后 |
| 对当前 Tool 的影响 | Tool 先正常执行完 | 不影响当前执行 |
| 主要用途 | 修正当前方向 | 追加后续工作 |
| Queue | `steeringQueue` | `followUpQueue` |
| 所属循环 | Inner Loop | Outer Loop |

### 10.4 Steering 不是 Abort

```text
Abort
= cancellation
= 现在停止

Steering
= mid-run redirection
= 做完手上这一步，下一轮改变方向
```

这也扩展了 Day05 对 Human-in-the-loop 的理解。HITL 不只是 Approval / Reject，还可以包括：

```text
pause
resume
steer
follow-up
cancel
```

---

## 十一、Turn Boundary 是重要扩展点

Pi 在 Turn 边界附近提供：

```text
prepareNextTurn
shouldStopAfterTurn
getSteeringMessages
```

它们集中在：

```text
Current Turn End
        ↓
Next Provider Request
```

很多 Runtime 操作不适合在 Tool 执行到一半时任意发生，更适合放在这个稳定边界：

- Context Compression
- Checkpoint
- Persistence
- Policy Check
- Model Switch
- Thinking Level 调整
- Metrics

因此 Turn Boundary 可以被视为 Runtime 的 Lifecycle Hook。

---

## 十二、从最小 Loop 到工业 Runtime

最小版：

```ts
while (true) {
  const response = await llm(messages);

  if (!response.toolCall) break;

  const result = await executeTool(response.toolCall);
  messages.push(result);
}
```

Pi 展示了一个工业 Runtime 如何在这个核心外逐渐增加：

```text
Streaming
Events
Abort
Steering
Follow-up
Stop Policy
Context Transformation
Tool Lifecycle
Error Handling
Turn Boundary Hooks
```

复杂性并不来自神秘的 Agent 算法，而主要来自外围工程能力、职责边界和生命周期管理。

---

## 十三、本会话核心认知升级

### 13.1 Runtime 不等于 Coding Agent

```text
pi-agent-core
= 通用 Runtime

pi-coding-agent
= Coding Domain Agent
```

### 13.2 Runtime Loop 不只是 Tool Loop

真实 Loop 同时管理：

- Turn lifecycle
- Tool lifecycle
- Context lifecycle
- Streaming / Events
- Steering / Follow-up
- Abort / Stop Policy
- Error handling
- Next-turn preparation

### 13.3 Stop Condition 不是单个 `if`

停止可能来自模型输出、Tool 信号、Runtime Policy、用户取消、Context Budget 和消息队列。

### 13.4 Runtime 是确定性控制引擎

```text
LLM
= Semantic Decision Engine

Runtime
= Deterministic Control Engine
```

LLM 决定“下一步想做什么”；Runtime 决定“这个决定如何被安全、确定地执行，并是否进入下一轮”。

### 13.5 Runtime Loop 是控制流状态机

它管理的不只是 LLM 与 Tool，而是整个 Agent Run 的状态迁移和生命周期。因此 `Agent Runtime`、`Agent Orchestrator`、`Execution Loop` 和 `Control Loop` 都指向相近的工程核心。

---

## 十四、对 `mini-agent-runtime` 的设计启发

### 14.1 Controller 与 Execution Engine 分离

建议保留类似边界：

```ts
class Agent {
  prompt() {
    // 规范化输入、管理状态、启动生命周期
  }
}

async function runAgentLoop(deps) {
  // 执行与控制流
}
```

### 14.2 显式依赖注入

Loop 只接收真正需要的：

```text
context
config
emit
signal
streamFn
```

避免把整个 Agent 实例交给底层执行引擎。

### 14.3 Tool Executor 只负责执行

```text
Tool Executor
= execute + return observation / signal

Runtime Loop
= decide continue / stop
```

### 14.4 把 Turn Boundary 设计成正式扩展点

后续可以在边界上接入：

- Context Compression
- Checkpoint / Persistence
- Policy
- Metrics
- Model Routing
- Human Control

### 14.5 消息增量与完整 Context 分离

Mini Runtime 应区分：

- 当前完整可见上下文。
- 本轮新产生的消息增量。

这会直接影响 State 回写、Event Stream、持久化和恢复。

---

## 十五、与 Day01～Day06 的连接

```text
Day02 / Day03：Runtime Architecture
            ↓
Pi packages/agent
            ↓
Agent → runAgentLoop → runLoop
            ↓
        LLM ↔ Tool
```

后续映射：

| 已学内容 | Pi 源码解剖计划 |
|-|-|
| Day04 State / Context Builder | Part VI-C / VI-D |
| Day05 Tool Calling / Executor / Observation | Part VI-E / VI-F / VI-G |
| Human Approval / Runtime Control | Part VI-J |
| Day06 Memory | Part VI-K |

Day01～Day06 提供了识别源码结构的概念坐标；Pi 源码则用来检验这些抽象是否能解释真实实现。

---

## 十六、面试视角

### Q1：Agent Runtime Loop 是什么？

Agent Runtime Loop 是 Agent 的控制流引擎。LLM 负责语义决策，例如是否调用工具以及调用哪个工具；Runtime 负责执行 Tool、更新上下文、回流 Observation、判断是否继续，并管理 Abort、Stop、Streaming 和 Human Intervention 等生命周期能力。

### Q2：ReAct 在真实 Agent 框架中如何实现？

ReAct 不一定对应一个名为 `ReActAgent` 的类。真实 Runtime 中通常表现为一个循环：LLM 生成 Action / Tool Call，Runtime 执行 Tool，把结果作为 Observation 写回 Context，再次调用 LLM。Pi 的 `runLoop()` 就体现了这种 ReAct-style execution loop。

### Q3：Tool 执行完以后由谁决定继续调用模型？

由 Runtime，而不是 Tool。Tool 只执行并返回结果或控制信号；Runtime Loop 根据 Tool Result、停止策略、队列和外部控制决定是否进入下一轮，从而保持 Control Flow Ownership 清晰。

### Q4：Steering 与 Abort 有什么区别？

Abort 是立即取消当前运行；Steering 是让当前 Turn 正常收尾，然后在下一轮注入新消息以改变方向。

---

## 十七、本章思考题

1. 为什么 Pi 不直接使用 `runLoop(agent)`，而要显式传入 `context`、`config`、`emit`、`signal` 和 `streamFn`？
2. 如果 Tool 内部执行完以后直接调用 LLM，而不是把结果返回 Runtime，会破坏哪些边界？
3. 为什么 Steering 不能简单实现为“Abort + 新 Prompt”？
4. 为什么 Context Compression 更适合发生在 Turn End 与下一次 Provider Request 之间？
5. `newMessages` 与 `currentContext.messages` 分离后，Agent State 应该如何安全回写？

---

## 十八、前置问题回收

本会话确认延期的问题：

- Harness 到底是什么？→ Part VI-K / VI-L 附近回收。
- Steering / Follow-up 的完整 Human Control 设计 → Part VI-J。
- Context Compression → Part VI-D 先理解 Context，Part VI-K 再结合 Session / Memory / Compaction。
- Tool sequential / parallel execution → Part VI-E / VI-G。

这些问题当前只定位，不提前展开。

---

## 十九、源码定位清单

### `packages/agent/src/agent.ts`

重点类型与函数：

```text
Agent
prompt()
normalizePromptInput()
runPromptMessages()
runWithLifecycle()
createContextSnapshot()
createLoopConfig()
processEvents()
steer()
followUp()
```

对应架构：

```text
Runtime Facade / Controller
State Owner
Loop 启动入口
Runtime Lifecycle
Human Runtime Control
```

### `packages/agent/src/agent-loop.ts`

重点函数：

```text
runAgentLoop()
runLoop()
streamAssistantResponse()
executeToolCalls()
```

重点控制结构：

```ts
while (true) {
  while (hasMoreToolCalls || pendingMessages.length > 0) {
    // current execution chain
  }

  // follow-up handling
}
```

对应架构：

```text
Agent Loop
ReAct-style Loop
Tool Execution Flow
Observation 回流
Stop Condition
Steering / Follow-up Control Flow
```

### `packages/agent/src/types.ts`

重点：

```text
AgentLoopConfig
shouldStopAfterTurn
prepareNextTurn
```

对应架构：

```text
Runtime Policy
Lifecycle Hooks
Stop Strategy
Next Turn Preparation
```

### `packages/agent/README.md`

用于确认官方能力定义：

```text
Agent Runtime 定位
Event Flow
Steering
Follow-up
Context Transformation
Stop / Turn Hooks
```

原则：README 帮助理解设计意图，源码负责验证真实实现。

---

## 二十、写书 TODO

1. 用 `pi-ai → pi-agent-core → pi-coding-agent` 解释 Model Abstraction、Generic Runtime 与 Domain Agent 的分层。
2. 增加“工业级 Agent Runtime 如何从一个 `while` 长出来”一节。
3. 用 `newMessages` 与 `currentContext.messages` 解释运行增量和完整上下文的区别。
4. 画出 Natural Stop、Tool `terminate`、Graceful Stop、Abort 的统一状态图。
5. 补充 Steering、Follow-up 与 Approval 三种 Human-in-the-loop 机制的对照。

---

## 二十一、写书素材

### 素材 1：Agent 没有魔法

```text
while
  ↓
LLM
  ↓
Tool
  ↓
Tool Result
  ↓
while
```

Agent 的复杂性主要来自外围工程能力，而不是一个神秘的 Agent 算法。

### 素材 2：Tool 不负责继续循环

Tool 返回 `ToolResult` 或 `terminate`，但是否继续下一轮仍由 Runtime Loop 控制。这是 Execution 与 Control Flow 分离的直接例子。

### 素材 3：Runtime Loop 是控制流引擎

> LLM 决定下一步想做什么，Runtime 决定这个决定如何被安全、确定地执行，并是否进入下一轮。

### 素材 4：两层 Loop 表达两种时间语义

Inner Loop 处理正在进行的执行链与 Steering；Outer Loop 处理 Agent 原本结束后的 Follow-up。结构上的两层 `while` 实际是在表达不同的消息时机。

---

## 二十二、下一节学习计划

### Part VI-C：Pi Agent State

重点回答：

```text
_state 到底保存什么？
AgentState 与 AgentContext 有什么区别？
messages 由谁拥有？
Loop 为什么操作 Context Snapshot？
本轮新消息如何回写 Agent State？
```

核心问题继续沿用 Day04：

```text
Who owns State?
Who decides State?
Who changes State?
```

### Part VI-D：Context Builder / Message Projection

重点定位：

```text
transformContext
convertToLlm
AgentMessage
Message
systemPrompt
tools
```

核心问题：

> Agent State、Context Snapshot、Runtime Context 与 LLM Context 是否是同一个东西？Pi 为什么要把它们拆开？
