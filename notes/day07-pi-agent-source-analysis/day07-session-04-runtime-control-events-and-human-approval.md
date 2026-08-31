# Day07：Pi Agent 源码解剖·会话 4——运行时控制、事件协议与人工审批边界

> 本文是《从零实现 Agent Runtime》Day07 / Part VI 的第四份正式学习笔记，覆盖 Part VI-H（Runtime Control，运行时控制）、Part VI-I（Streaming & Event Protocol，流式与事件协议）和 Part VI-J（Human Approval Boundary，人工审批边界）。
>
> 本会话把 Agent Runtime（Agent 运行时）从“LLM 与 Tool 的循环”进一步升级为“受生命周期约束的智能任务调度器”，并厘清 Agent Core（Agent 核心）、Harness（运行壳层 / 生命周期编排层）、Domain Agent（领域 Agent）与硬安全边界之间的职责。

## 术语阅读约定

从本会话开始，英文专有术语和技术名词在至少前三次出现时补充中文括号释义；如果没有稳定、广泛接受的中文译名，则在后续出现时也尽量保留中文语义说明。

---

## 一、本会话学习目标

本会话重点回答：

1. Steering（运行中转向）、Follow-up（后续任务）与 Abort（中止）有何不同？
2. 为什么外部输入先进入 Queue（队列），而不是直接修改正在运行的 Context（上下文）？
3. `QueueMode（队列模式）` 的 `all（全部消费）` 与 `one-at-a-time（逐条消费）` 表达什么调度语义？
4. 为什么同一个 Stateful Agent（有状态 Agent）不能同时运行两个 Loop（循环）？
5. `abort()` 与 `waitForIdle()` 为什么不能混为一谈？
6. Agent Streaming（Agent 流式协议）为什么不只是模型逐 Token 输出？
7. Command（命令 / 意图）与 Event（事件 / 已发生事实）有什么区别？
8. Event（事件）、State（状态）、Transcript（已提交会话记录）、Persistence（持久化）和 UI Projection（界面投影）如何分层？
9. Live Reconnect（在线重连）与 Cold Restore（冷恢复）有什么区别？
10. `beforeToolCall` 为什么不等于完整 Human Approval（人工审批）？
11. Approval Mechanism（审批机制）、Approval Lifecycle（审批生命周期）与 Approval Policy（审批策略）分别属于哪一层？
12. 为什么 Agent Permission（Agent 权限控制）不能替代 Sandbox（沙箱）、系统权限和业务鉴权？

---

## 二、会话 4 总体模型

```text
                         Human / UI
                            │
           ┌────────────────┼────────────────┐
           ↓                ↓                ↓
  Steering（运行中转向） Approval（审批） Abort（中止）
           │                │                │
           ↓                ↓                ↓
     Queue（队列）   Execution Gate     Cancellation
                     （执行门）          （取消）
           │                │                │
           └────────── Agent Runtime ────────┘
                            │
                            ↓
                    AgentEvent（事件）
                            │
                            ↓
                     State / Session
                            │
                            ↓
                     UI Projection
```

三部分的关系是：

```text
Part VI-H：外部如何改变正在运行的 Agent
→ Steering / Follow-up / Abort / Queue / Safe Point

Part VI-I：Runtime 内部变化如何统一暴露
→ Event / State / Transcript / Persistence / UI Projection

Part VI-J：外部如何在 Effect（副作用）发生前参与决策
→ Execution Gate / Human Interaction / Policy / Security Boundary
```

---

## 三、Part VI-H：Runtime Control（运行时控制）

### 3.1 三种不同控制语义

#### Steering（运行中转向）

```text
Agent 正在执行
    ↓
用户补充或改变要求
    ↓
当前工作到达 Safe Point（安全执行点）
    ↓
新消息进入 Context（上下文）
    ↓
LLM 在下一轮重新决策
```

Steering（运行中转向）改变的是当前 Run（运行）的后续 Decision（决策），不直接终止整个 Run。

#### Follow-up（后续任务）

```text
当前目标自然完成
    ↓
Agent 原本准备停止
    ↓
检查 Follow-up Queue（后续任务队列）
    ↓
发现新任务
    ↓
继续同一个 Run
```

Follow-up（后续任务）不是改变当前目标，而是在当前工作完成后追加下一项工作。

#### Abort（中止）

```text
当前 Run
    ↓ AbortSignal（中止信号）
Provider / Tool / Hook 协作式取消
    ↓
Run Lifecycle（运行生命周期）收尾
```

Abort（中止）改变的是当前 Execution Lifecycle（执行生命周期），而不是下一轮的语义方向。

| 操作 | 核心语义 | 是否保留当前 Run | 生效时机 |
|-|-|-|-|
| Steering | 改变当前任务后续方向 | 是 | Safe Point |
| Follow-up | 当前任务结束后追加工作 | 是 | Agent 原本准备停止时 |
| Abort | 请求停止当前执行 | 否 | 运行中的任意阶段，协作式 |

### 3.2 Steering 不是抢占式中断

Pi 当前的 Steering 更接近 Deferred Steering（延迟转向），而不是 Preemptive Interrupt（抢占式中断）。

```text
LLM
 ↓
Assistant(tool A, tool B)
 ↓
Tool A
 ↓
Tool B
 ↓
Turn End（轮次结束）
 ↓
消费 Steering Queue
 ↓
Next LLM Turn
```

它不会在 Tool A 完成后直接跳过同一 Assistant Message 中尚未处理的 Tool B。

### 3.3 为什么当前 Tool Batch 必须完整结束

假设 Assistant Message 已声明：

```text
ToolCall A
ToolCall B
ToolCall C
```

若 Steering 到达后立即跳过 B、C，Transcript（已提交会话记录）可能出现：

```text
Assistant: A, B, C
ToolResult: A
```

由此产生：

- Tool Protocol（工具协议）不完整。
- Provider（模型供应商）可能要求每个 Tool Call 都有结果。
- Parallel Batch（并行批次）的副作用与完成状态难以判断。
- Transcript Determinism（会话记录确定性）被破坏。
- Replay（重放）与恢复变得复杂。

因此 Pi 选择：

> Steering 改变下一轮 Decision（决策），不破坏当前 Tool Batch（工具批次）。

### 3.4 两层 Loop 的完整语义

```ts
while (true) { // Outer Loop：任务续接循环
  while (hasMoreToolCalls || pendingMessages.length > 0) {
    // Inner Loop：当前任务的 Turn / Tool / Steering 循环
  }

  // Agent 原本准备停止时才检查 Follow-up
}
```

现在可以更准确地定义：

```text
Inner Loop（内层循环）
= 当前 Agent Task 的连续决策循环
= Tool Calls + Steering

Outer Loop（外层循环）
= Task Continuation Loop（任务续接循环）
= Follow-up
```

所以 Agent Loop 已经不只是 Tool Loop，而是 Runtime Scheduler（运行时调度器）。

### 3.5 生命周期优先级

当前 Turn（轮次）结束后的大致顺序是：

```text
Turn End
    ↓
prepareNextTurn
    ↓
shouldStopAfterTurn?
├── yes → agent_end
└── no
    ↓
检查 Steering Queue
├── 有 → 下一 Turn
└── 无且 Tool 已完成
    ↓
检查 Follow-up Queue
├── 有 → 下一 Task
└── 无 → agent_end
```

`shouldStopAfterTurn` 位于 Steering Poll（转向轮询）之前，说明 Stop Policy（停止策略）、Steering、Follow-up 不是平级输入源，而是有明确的生命周期次序。

### 3.6 Queue（队列）是时间解耦机制

外部世界可以随时产生输入，但 Runtime 不应在 Provider Request（模型请求）或 Tool Execution（工具执行）中途任意修改 Context。

```text
External Input（外部输入）
      ↓
Queue（队列）
      ↓
Safe Point（安全执行点）
      ↓
Context Injection（上下文注入）
```

Queue 把两件事分开：

```text
Message Accepted（消息已接收）
≠
Message Consumed（消息已消费）
```

这解释了 Agent 产品中“新 Prompt 已发送但仍显示排队”的交互状态。

### 3.7 Steering 与 Follow-up 是独立 Channel

Pi 的 `Agent` 内部维护两个独立 `PendingMessageQueue（待处理消息队列）`：

```text
steeringQueue
followUpQueue
```

入口分别是：

```ts
agent.steer(message);
agent.followUp(message);
```

它们不会直接调用 LLM、修改当前 Context 或创建新 Run，只负责 `enqueue（入队）`。

完整能力来自：

```text
Agent API
+ Queue
+ Runtime Safe Point
+ Context Injection
```

因此 Steering 是 Runtime Protocol（运行时协议），不只是 `steer()` 函数。

### 3.8 特殊性在调度，不在 Message Schema

Steering 或 Follow-up 被 Queue `drain（取出并消费）` 后，进入 Context 的仍是普通 `AgentMessage`。

```text
Steering Queue
      ↓
AgentMessage
      ↓
currentContext.messages
```

所以二者真正不同的是 Scheduling Semantics（调度语义）：

```text
Steering
→ 当前任务的下一个 Safe Point 消费

Follow-up
→ 当前任务本来准备结束时消费
```

### 3.9 QueueMode（队列模式）

Pi 支持：

```text
all（全部消费）
one-at-a-time（逐条消费）
```

#### `all（全部消费）`

```text
Queue: A, B, C
    ↓ drain
Context: A, B, C
Queue: empty
```

适合用户快速补充组成一个完整意图的多条信息。

#### `one-at-a-time（逐条消费）`

```text
Queue: A, B, C
    ↓ first drain
Context: A
Queue: B, C
    ↓ next Safe Point
Context: B
```

适合需要让每条消息分别获得一次 Decision Loop（决策循环）的任务序列。

### 3.10 两个 Queue 可以使用不同模式

Pi 分别暴露：

```text
steeringMode
followUpMode
```

Steering 可能更适合 `all`，因为多条输入常是在补充同一意图；Follow-up 可能更适合 `one-at-a-time`，因为它更像 Task Queue（任务队列）。具体模式应由交互产品和任务语义决定。

### 3.11 QueueMode 是 Live Configuration

QueueMode（队列模式）不是整个 Run 启动时永久冻结的 Snapshot（快照）。运行中修改后，下一次 Queue Drain（队列消费）会读取新的模式。

这与稳定 Context Snapshot 并不矛盾：

```text
In-flight Operation（执行中操作）
→ 依赖的数据不能随意改变

Safe Point（安全执行点）
→ 可以为下一阶段读取最新配置
```

真正原则是：

> 不修改执行中操作正在依赖的数据；在安全边界为下一阶段读取最新状态和配置。

### 3.12 同一 Agent 同时只能有一个 Active Run

当 `activeRun` 存在时再次调用 `prompt()`，Pi 会拒绝并要求使用 `steer()`、`followUp()` 或等待当前 Run 完成。

否则会出现：

```text
Loop A ─┐
        ├→ 同一个 Agent State
Loop B ─┘
```

进而产生：

- Transcript Race（会话记录竞争）。
- State Race（状态竞争）。
- Tool Race（工具执行竞争）。
- Streaming Race（流式状态竞争）。

`activeRun` 因此也是 Concurrency Guard（并发保护）。

### 3.13 `abort()` 不等于 Run 已结束

```ts
agent.abort();
```

只表示：

```text
Cancellation Requested（已请求取消）
```

Provider、Tool、Hook 和 Event Subscriber（事件订阅者）仍需逐层完成收尾。

真正等待生命周期结束应使用：

```ts
agent.abort();
await agent.waitForIdle();
```

```text
abort()
≠ Lifecycle Settled（生命周期已完全收尾）

waitForIdle()
= Run + Awaited Subscribers 已完成
```

### 3.14 `agent_end` 与 Idle Boundary

`agent_end` 是 Core Run 的最后一个 Event，但 Subscriber（订阅者）可以是异步函数，并被 Agent 顺序等待。

```text
agent_end emitted
    ↓
persist / audit / flush listeners
    ↓
all listeners settle
    ↓
finishRun
    ↓
Idle
```

这避免新 Run 在旧 Session Save（会话保存）尚未结束时启动。

### 3.15 Mini Runtime 的实现顺序

```text
V1
→ Loop / Tool / Observation / Abort

V2
→ Steering / Safe Point

V3
→ Follow-up / QueueMode
```

第一版必须有 Cancellation Boundary（取消边界），但无需一次复制 Pi 的全部交互式调度能力。

---

## 四、Part VI-I：Streaming & Event Protocol（流式与事件协议）

### 4.1 Agent Streaming 不只是 Token Streaming

```text
Agent Streaming（Agent 流式协议）
= LLM Streaming（模型流式输出）
+ Tool Streaming（工具流式更新）
+ Message Lifecycle（消息生命周期）
+ Turn Lifecycle（轮次生命周期）
+ Runtime Lifecycle（运行时生命周期）
```

统一入口是 `AgentEvent（Agent 事件）`，而不是让 UI 分别理解每个 Provider Stream、Tool Callback 和 Runtime 状态。

### 4.2 AgentEvent 的四类生命周期

```text
Agent Lifecycle
├── agent_start
└── agent_end

Turn Lifecycle
├── turn_start
└── turn_end

Message Lifecycle
├── message_start
├── message_update*
└── message_end

Tool Lifecycle
├── tool_execution_start
├── tool_execution_update*
└── tool_execution_end
```

这种统一协议让 UI、Logger（日志器）、Persistence Adapter（持久化适配器）和 Observability（可观测性）不必直接依赖不同 Provider 的流格式。

### 4.3 Command 与 Event

```text
Command（命令 / 意图）
→ 希望系统做什么

Event（事件 / 已发生事实）
→ 系统已经发生了什么
```

例如：

```text
steer(message)
→ Command

message_end
→ Event
```

Command 可能被拒绝、排队或延后；Event 应描述已经成立的生命周期事实。

### 4.4 Event 不是日志

Pi 的 `processEvents()` 会先根据 Event 更新内部 State，再通知 Subscriber：

```text
AgentEvent
    ↓
State Transition（状态迁移）
    ↓
Subscriber
    ↓
UI / Persistence / Audit
```

例如：

```text
tool_execution_start
    ↓
pendingToolCalls.add(id)
```

Event 因此是 Runtime Execution Protocol（运行时执行协议）的一部分。

### 4.5 In-flight State 与 Committed State

```text
streamingMessage
→ In-flight State（执行中状态）

messages
→ Committed Transcript（已提交会话记录）
```

Streaming 期间：

```text
message_start
message_update × N
```

只更新 Working Copy（工作副本）。到 `message_end` 后，最终消息才进入正式 Transcript。

这避免未完成或中途崩溃的消息污染会话历史。

### 4.6 Tool Progress 与 Tool Observation

```text
tool_execution_update
≠
ToolResultMessage
```

前者是执行中的 Progress Event（进度事件），适合 UI 显示；后者是完成后的 Observation（观察结果），会进入 Transcript 和下一轮 LLM Context。

### 4.7 Event Ordering Contract

生命周期必须满足：

```text
start
→ update*
→ end
```

End 之后不能再发 Update，否则 State、UI 和持久化都会出现已结束对象继续变化的问题。

### 4.8 `message_update` 同时提供 Delta 与 Snapshot

Pi 的 `message_update` 同时携带：

```text
assistantMessageEvent
→ Provider / Assistant Stream Delta（增量事件）

message
→ 当前完整 Assistant Message Snapshot（消息快照）
```

两类 Consumer（消费者）由此都能使用：

- Token / Block 级 UI 可以消费 Delta。
- 简单状态同步器可以直接替换 Snapshot。

### 4.9 Awaited Subscriber 与 Backpressure

Subscriber Promise（订阅者异步任务）被顺序等待，意味着消费者可以形成 Backpressure（背压）：

```text
Runtime emits Event
    ↓ await subscriber
slow persistence / audit / UI bridge
    ↓
Runtime 下一步被延后
```

优点：

- 关键持久化和审计能进入生命周期保证。
- Subscriber 收到 Event 时 State 已一致。
- Event Order（事件顺序）更容易保证。

风险：

- 慢 Subscriber 会拖慢 Runtime。
- 长时间网络 IO 会放大流式延迟。
- 非关键消费者不应无界阻塞核心执行。

因此工业实现需要区分 Critical Subscriber（关键订阅者）与 Best-effort Consumer（尽力型消费者）。

### 4.10 Event、State、Transcript、Persistence 与 UI

```text
Runtime Execution
      ↓
AgentEvent
      ↓ reduce
Agent State
      ↓
 ┌────┴───────────┐
 ↓                ↓
UI Projection   Stable Transcript
                    ↓
                Persistence
```

五层定义：

| 层 | 表达什么 | 典型内容 |
|-|-|-|
| Event（事件） | 发生了什么变化 | `message_update` |
| Runtime State（运行状态） | 当前是什么 | `streamingMessage` |
| Transcript（会话记录） | 已正式提交什么 | User / Assistant / ToolResult |
| Persistence（持久化） | 重启后保留什么 | Session Entries / JSONL |
| UI Projection（界面投影） | 用户看到什么 | Bubble / Spinner / Queue |

一句话概括：

> Event 描述变化，State 描述现在，Transcript 描述已提交事实，Persistence 描述可恢复事实，UI 描述这些事实如何呈现。

### 4.11 Source of Truth 不是一个全局答案

```text
当前 Run 正在发生什么
→ Agent Runtime State

Conversation 已经正式发生过什么
→ Committed Transcript

进程重启后还能知道什么
→ Persistent Session

用户当前看到什么
→ UI Projection，但它不是 Runtime 真相
```

Event 更像 State Transition Protocol（状态迁移协议）。除非永久保存完整 Event Log 并能 Deterministic Replay（确定性重放），否则不能说 Event 永远是唯一 Source of Truth（事实来源）。

### 4.12 Event-driven 不等于 Event Sourcing

```text
Event-driven（事件驱动）
→ Event 推动 Runtime State 更新

Event Sourcing（事件溯源）
→ 持久化完整 Event Log
→ 通过 Replay 重建 State
```

当前能确认 Pi Core 是 Event-driven Runtime State Synchronization（事件驱动的运行状态同步），不能直接等同于完整 Event Sourcing。

### 4.13 Persistence 不能直接序列化整个 AgentState

这些内存对象或临时状态不能简单恢复：

```text
AbortController
Promise
pendingToolCalls
streamingMessage
isStreaming
```

进程死亡后，它们依赖的 HTTP Request、Child Process、Tool Handler Stack 都已不存在。

正确恢复模型是：

```text
Persistent Session
    ↓
Restore Stable State（恢复稳定状态）
    ↓
Reconstruct Runtime（重建运行时）
    ↓
createContextSnapshot()
    ↓
New LLM Context
```

不是复活旧 JavaScript 调用栈。

### 4.14 Live Reconnect 与 Cold Restore

#### Live Reconnect（在线重连）

```text
UI 断线
Runtime 仍在执行
    ↓
重新获取 Snapshot
    ↓
重新订阅后续 Events
```

典型模式是：

```text
Snapshot + Incremental Events（快照 + 增量事件）
```

Snapshot 是 Event Stream（事件流）的恢复锚点。

#### Cold Restore（冷恢复）

```text
Process Crash / Server Restart
    ↓
内存 Runtime 已不存在
    ↓
从 Persistent Session 恢复稳定事实
    ↓
构造新的 Runtime
```

恢复的是 Conversation / Session History，不是旧 Promise、Tool Stack 或 Network Connection。

### 4.15 Core Lifecycle 与 Session Lifecycle

更上层 Session Runtime 可能在一次低层 Run 结束后继续：

```text
agent_end
    ↓
Context Overflow
    ↓
Compaction（上下文压缩）
    ↓
Retry（重试）
    ↓
Another Run
```

因此上层可能需要 `agent_settled（Agent 整体已稳定结束）`：

```text
agent_end
→ Low-level Core Run 已结束

agent_settled
→ Session-level retry / compaction / continuation 全部完成
```

```text
Core Lifecycle
≠ Session Lifecycle
≠ Product Lifecycle
```

### 4.16 分层 Event Protocol

```text
Provider Layer
└── AssistantMessageEvent

Agent Core
├── agent_start / end
├── turn_start / end
├── message_*
└── tool_execution_*

Harness / Session
├── queue_update
├── compaction_*
├── retry_*
├── entry_appended
└── agent_settled

Product UI
└── 自己的展示状态
```

上层可以扩展 Core Event，但不应迫使 Core 理解每个产品界面。

### 4.17 Mini Runtime 的阶段实现

#### V1：Runtime State

```ts
interface RuntimeState {
  messages: AgentMessage[];
  streamingMessage?: AssistantMessage;
  pendingToolCalls: Set<string>;
  isRunning: boolean;
}
```

```text
AgentLoop
→ emit Event
→ Runtime.reduce(event)
→ RuntimeState
→ subscriber(event, state)
```

第一版持久化只保存 `messages` 或稳定 Checkpoint（检查点）。

#### V2：Session Persistence

```text
Session
├── id
├── messages
├── createdAt
├── updatedAt
└── metadata
```

在 `message_end` 等提交边界持久化稳定消息。

#### V3：Persistent Tool Execution

若要恢复未完成 Tool，需要额外保存：

```text
pending action
toolCallId
idempotencyKey
execution status
external transaction id
checkpoint
```

其复杂度远高于普通 Conversation Recovery，不应放入 Mini Runtime 第一版。

---

## 五、Part VI-J：Human Approval Boundary（人工审批边界）

### 5.1 `beforeToolCall` 只是 Approval Mechanism Boundary

Core 的 `beforeToolCall` 位于：

```text
Tool Lookup
→ Argument Validation
→ beforeToolCall
→ Tool Execute
```

它能够：

```text
Allow（允许）
Block（阻止）
Return Reason（返回原因）
```

因此它提供 Execution Gate（执行门）和 Approval Mechanism Boundary（审批机制边界），但没有自动提供：

```text
UI Prompt
Human Decision
Pending Operation
Persistence
Timeout
Resume
Audit
```

### 5.2 Approval 的三层模型

```text
Agent Core
→ Mechanism（机制）
→ 在执行前允许阻止或放行

Harness（运行壳层）
→ Lifecycle Infrastructure（生命周期基础设施）
→ UI 交互、Pending State、Session、Hook Bridge、恢复

Domain Agent
→ Policy（策略）
→ 哪些操作需要审批、谁能审批、阈值是什么
```

一句话：

> Core 提供插槽，Harness 负责接线，Domain 决定规则。

### 5.3 Harness 是什么

Harness（运行壳层 / 生命周期编排层）位于 Core 与 Domain Agent 之间：

```text
Agent Core
≈ Kernel（内核）

Harness
≈ Operating Runtime Services（操作系统运行服务）

Coding / Customer Service Agent
≈ Application（应用程序）
```

它提供通用但不是纯内核的能力：

- Session（会话）。
- Queue（队列）。
- Persistence Glue（持久化衔接）。
- UI Interaction（用户交互）。
- Hook Bridge（钩子桥接）。
- Context Preparation（上下文准备）。
- Retry / Compaction Lifecycle（重试 / 压缩生命周期）。

### 5.4 Interactive Approval 与 Durable Approval

#### Interactive Approval（在线交互式审批）

```text
beforeToolCall
    ↓
await confirm()
    ↓
Runtime / Promise 仍存活
    ↓
Approve / Reject
```

适合短时间在线交互，但依赖当前进程、连接和内存仍存在。

#### Durable Approval（可持久化审批）

```text
发现待审批操作
    ↓
Persist Pending Operation（持久化待处理操作）
    ↓
Runtime 可以退出
    ↓
Human Decision
    ↓
Reconstruct / Resume
```

Durable Approval 需要持久身份、状态机、幂等和恢复协议，不能只靠一个未完成 Promise。

### 5.5 Approval 必须绑定具体 Effect

不能只批准：

```text
允许 refund Tool
```

应批准：

```text
允许本次 refund_order(
  orderId = "order123",
  amount = 500
)
```

审批对象至少应绑定：

- Tool Name。
- Validated Arguments（已验证参数）。
- User / Tenant / Session Identity（用户 / 租户 / 会话身份）。
- Policy Version（策略版本）。
- Expiration（过期时间）。
- Idempotency Key（幂等键）。
- 可选资源版本或业务状态摘要。

### 5.6 TOCTOU 风险

TOCTOU（Time of Check to Time of Use，检查时与使用时状态不一致）描述：

```text
审批时状态
    ↓ 等待
执行时状态已经变化
```

例如审批退款时订单仍可退款，但恢复执行时订单已经关闭或退款过。

因此 Resume（恢复执行）后必须 Revalidation（重新校验）：

- 权限是否仍有效。
- 参数是否被篡改。
- 业务状态是否仍允许操作。
- 额度是否仍满足。
- 审批是否过期。
- 幂等键是否已执行。

### 5.7 Human Reject 也应成为 Observation

拒绝不是“什么都没发生”，而是明确执行事实：

```text
Tool Call Proposed
    ↓
Human Reject
    ↓
Blocked ToolResultMessage / Observation
    ↓
LLM 重新规划或解释
```

模型必须知道 Action 没有发生以及拒绝原因，才能避免假设副作用已经完成。

### 5.8 Hook 本身是 Trust Boundary

Hook（钩子）可以：

- 查看或修改参数。
- 阻止 Tool。
- 修改 Tool Result。
- 触发 UI 交互。
- 写入 Session / Audit。

因此 Extension / Hook（扩展 / 钩子）不是天然可信的普通 callback，而是新的 Trust Boundary（信任边界），需要：

- 权限治理。
- 注册来源控制。
- 超时与错误策略。
- 审计。
- Fail-open / Fail-closed（失败放行 / 失败阻止）规则。

高风险 `before_tool` 通常应 Fail Closed（失败时阻止），避免策略执行失败反而放行危险操作。

### 5.9 Soft Gate 与 Hard Boundary

```text
Agent Approval / Policy
→ Soft Gate（软约束）

Sandbox / OS Permission / Business Auth
→ Hard Security Boundary（硬安全边界）
```

完整安全链可以是：

```text
LLM Proposal
    ↓
Agent Policy
    ↓
Human Approval
    ↓
Sandbox / OS Permission
    ↓
Business Authorization
    ↓
Idempotency / Transaction
    ↓
Effect
    ↓
Audit
```

Agent Approval 永远不能成为安全链路的最后一层。

### 5.10 Customer Service Agent 的审批分层

以退款为例：

```text
Agent Core
→ 提供 beforeToolCall Execution Gate

Harness
→ 创建 Pending Approval
→ 展示审批 UI
→ 保存状态
→ 等待 / 恢复

Customer Service Agent
→ 金额 > 5000 需要经理审批
→ 投诉用户优先转人工
→ 敏感字段脱敏

Refund Service
→ 真实鉴权、状态校验、幂等、事务、审计
```

这样可以复用 Harness，又不会把客服 Policy 污染到 Agent Core。

---

## 六、四层工业架构

```text
┌─────────────────────────────────────┐
│ Domain Agent（领域 Agent）           │
│ Coding / Customer Service / Data    │
│ Domain Tools / Policy / Risk Rules  │
└────────────────▲────────────────────┘
                 │
┌────────────────┴────────────────────┐
│ Harness（运行壳层）                  │
│ Session / Queue / Persistence Glue  │
│ UI Interaction / Hook Bridge        │
│ Retry / Compaction / Lifecycle      │
└────────────────▲────────────────────┘
                 │
┌────────────────┴────────────────────┐
│ Agent Core（Agent 核心）             │
│ Loop / State / Context              │
│ Tool Executor / AgentEvent / Abort  │
└────────────────▲────────────────────┘
                 │
┌────────────────┴────────────────────┐
│ Hard Security Boundary（硬安全边界） │
│ Sandbox / OS Permission             │
│ Business Auth / Transaction         │
│ Idempotency / Audit                 │
└─────────────────────────────────────┘
```

三层职责可以浓缩为：

```text
Core：怎么跑？

Harness：怎么把 Core 长期、稳定、可交互、可持久化地运行起来？

Domain Agent：具体做什么，以及遵守什么业务规则？
```

---

## 七、本会话核心认知升级

### 7.1 Agent Runtime 是生命周期调度器

它协调的不只是 LLM 与 Tool，还包括 Steering、Follow-up、Stop Policy、Abort、Event、State 与 Approval。

### 7.2 Steering、Follow-up、Abort 属于三个维度

```text
Steering → 改变后续 Decision
Follow-up → 追加下一个 Goal
Abort → 请求停止当前 Execution
```

### 7.3 Message Accepted 不等于 Message Consumed

Queue 解决外部输入与 Runtime Safe Point 之间的时间解耦。

### 7.4 Event 是执行协议，不只是通知

Event 既驱动内部 State Transition，也服务 UI、Persistence、Audit 与 Observability。

### 7.5 In-flight State 必须与 Committed State 分离

`streamingMessage` 是执行中的 Working State；`messages` 是已提交 Transcript。

### 7.6 Persistence 不能保存整个内存 Runtime

恢复是从 Stable Session State 重建 Runtime 和 Context，而不是复活旧 Promise 或 AbortController。

### 7.7 Human Approval 不是一个 Hook 就结束

```text
Mechanism + Lifecycle + Policy
```

三者分别落在 Core、Harness 与 Domain Agent。

### 7.8 Approval 是软约束，不是最终安全边界

Sandbox、系统权限、业务鉴权、幂等和事务仍必须独立存在。

### 7.9 UI 不是 Source of Truth

UI 是 Runtime / Session State 的 Projection，不应反向决定真实执行状态。

### 7.10 Event-driven 不等于 Event Sourcing

有 Event Protocol 不代表系统已经持久化完整 Event Log 并能由其重建所有状态。

---

## 八、与前面章节的连接

| 已学内容 | 本会话的源码映射 |
|-|-|
| Day03 State Ownership | 一个 Agent 同时只允许一个 Active Run |
| Day04 State Lifecycle | In-flight / Committed / Persistent State 分层 |
| Day04 Context Projection | Queue 消息只在 Safe Point 进入 Context |
| Day04 Context Window | Harness 可能在 Core Run 后触发 Compaction / Retry |
| Day05 Permission | `beforeToolCall` 提供 Execution Gate |
| Day05 Human Approval | Core Mechanism + Harness Lifecycle + Domain Policy |
| Day05 Tool Events | `tool_execution_start/update/end` |
| Day06 Memory / Persistence | Stable Session 恢复后重新投影 Context |

---

## 九、工业级实现建议

### 9.1 Runtime Control

```ts
type QueueMode = "all" | "one-at-a-time";

interface ActiveRun {
  promise: Promise<void>;
  abortController: AbortController;
}
```

至少实现：

- 单 Active Run Guard。
- Abort + Wait for Idle。
- Safe Point Queue Drain。
- Steering / Follow-up 独立 Queue。
- Queue Snapshot 供 UI 展示。

### 9.2 Event Protocol

```text
Command
→ Runtime
→ Event
→ Reducer
→ State
→ Subscriber / UI
```

需要明确：

- Event Ordering。
- Listener Backpressure。
- Listener Error Policy。
- Snapshot / Reconnect。
- Committed Boundary。
- Critical 与 Best-effort Subscriber。

### 9.3 Persistence

第一阶段只持久化稳定 Transcript；第二阶段增加 Session Metadata 与 Tree；最后才考虑 Pending Tool / External Effect Recovery。

### 9.4 Approval

```text
Policy Evaluation
→ Pending Operation
→ Human Decision
→ Revalidation
→ Execute with Idempotency
→ Audit
```

审批记录必须绑定具体参数和身份，恢复后重新校验业务状态。

---

## 十、知识地图

```text
Interactive Agent Runtime（可交互 Agent 运行时）
│
├── Runtime Control（运行时控制）
│   ├── Steering（运行中转向）
│   ├── Follow-up（后续任务）
│   ├── Abort（中止）
│   ├── Queue（队列）
│   ├── QueueMode（队列模式）
│   └── Safe Point（安全执行点）
│
├── Event Protocol（事件协议）
│   ├── Agent Lifecycle（Agent 生命周期）
│   ├── Turn Lifecycle（轮次生命周期）
│   ├── Message Lifecycle（消息生命周期）
│   └── Tool Lifecycle（工具生命周期）
│
├── State Model（状态模型）
│   ├── Runtime State（运行状态）
│   ├── In-flight State（执行中状态）
│   ├── Transcript（已提交会话记录）
│   └── Pending State（待处理状态）
│
├── Persistence（持久化）
│   ├── Live Reconnect（在线重连）
│   ├── Cold Restore（冷恢复）
│   └── Session（会话）
│
├── Human Approval（人工审批）
│   ├── Mechanism（机制）
│   ├── Lifecycle（生命周期）
│   └── Policy（策略）
│
├── Runtime Layers（运行时分层）
│   ├── Agent Core
│   ├── Harness
│   └── Domain Agent
│
└── Safety（安全）
    ├── Soft Gate（软约束）
    ├── Hard Boundary（硬边界）
    ├── TOCTOU（检查/使用时差风险）
    ├── Authorization（鉴权）
    └── Idempotency（幂等）
```

---

## 十一、面试视角

### Q1：Steering 与 Abort 有什么区别？

Steering 修改下一轮 Decision，通常在 Safe Point 进入 Context；Abort 修改当前 Execution Lifecycle，通过 Cancellation 机制请求当前 Run 停止。

### Q2：为什么运行中的 Agent 不直接接受第二个 `prompt()`？

同一 Stateful Agent 同时运行两个 Loop 会产生 Transcript、State、Tool 和 Streaming Race。更可靠的方式是一个 Active Run 配合 Queue。

### Q3：为什么 Agent 需要自己的 Event Protocol？

UI 不应分别适配每个 Provider Stream、Tool Callback 和 Runtime Lifecycle。AgentEvent 将它们统一为稳定的 Runtime Protocol。

### Q4：Event 与 State 有什么区别？

Event 描述发生了什么变化；State 描述当前最终是什么。Event 可以推动 State Transition，但二者不能混为一谈。

### Q5：为什么 `streamingMessage` 与正式 `messages` 要分开？

前者属于 In-flight State，后者属于 Committed Transcript。分离后，未完成消息不会污染正式历史。

### Q6：Pi 使用 Event 是否等于 Event Sourcing？

不是。Event-driven 表示事件推动状态同步；Event Sourcing 通常要求持久化 Event Log 并能通过 Replay 重建状态。

### Q7：`beforeToolCall` 是否就是 Human Approval？

不是。它只是 Execution Gate。完整审批还需要 UI、Human Decision、Pending State、Session、Persistence、Resume 和 Domain Policy。

### Q8：Harness 与 Agent Core 有什么区别？

Agent Core 负责 Loop、Tool、State、Event 等通用机制；Harness 在 Core 上补充 Session、Queue、Persistence、UI Interaction 与 Hook Bridge 等通用运行基础设施，但不应包含具体业务策略。

### Q9：Interactive Approval 与 Durable Approval 有什么区别？

Interactive Approval 依赖当前 Runtime / Promise 仍存活；Durable Approval 允许 Runtime 退出，必须持久化 Pending Operation，并在恢复时重新校验。

### Q10：为什么 Human Approval 不能代替业务鉴权？

Approval 是应用层 Soft Gate，最终业务系统仍需保证 Authorization、Idempotency、Transaction 与 Audit。

---

## 十二、本章思考题

1. Steering Queue 中存在三条相互冲突的消息时，`all` 与 `one-at-a-time` 哪种更合理？
2. Steering 到达时正在执行一个十分钟 Tool，是否应支持强制抢占式 Steering？
3. Event Listener 被等待形成 Backpressure 时，哪些 Consumer 应该同步等待，哪些应该异步化？
4. UI 断线后重连，Snapshot 与 Event Replay 应如何选择？
5. `message_end` 是否总是最合适的持久化边界？
6. Agent Crash 时 Tool 已产生副作用但没有 ToolResult，恢复后如何判断是否重试？
7. Human Approval 如果只批准 Tool Name 而不绑定参数，会产生哪些安全问题？
8. Durable Approval 恢复以后，为什么仍需重新做 Business Validation？
9. Harness 应实现通用 ApprovalManager，还是只提供 Pending Operation 机制？
10. Customer Service Agent 的退款 Policy 如何复用 Harness，又不污染 Agent Core？

---

## 十三、前置问题回收

### 13.1 Steering 会不会跳过当前 Tool Batch？

不会。当前 Pi 在本轮 Tool Calls 完成后再消费 Steering。

### 13.2 用户运行中又输入 Prompt 怎么办？

```text
Message Accepted
→ Queue
→ Runtime Safe Point
→ Message Consumed
```

不是直接启动第二个 Loop。

### 13.3 Abort 是否等于 Run 已结束？

```text
abort()
→ Cancellation Requested

waitForIdle()
→ Lifecycle Settled
```

### 13.4 Streaming 是否等于 LLM Token Streaming？

不是。Agent Streaming 还包含 Tool Streaming 和 Runtime Lifecycle Events。

### 13.5 Event 是否只是日志？

不是。Event 可以直接参与 Runtime State Transition。

### 13.6 Human Approval 属于哪里？

```text
Agent Core → Mechanism
Harness → Lifecycle Infrastructure
Domain Agent → Approval Policy
```

### 13.7 Harness 到底是什么？

Harness 是 Agent Core 与具体 Domain Agent 之间的通用运行基础设施，负责把 Core 长期、稳定、可交互、可持久化地运行起来。

### 13.8 继续延期到会话 5

```text
Crash Recovery（崩溃恢复）
Persistent Tool Execution（持久化工具执行）
External Side-effect Recovery（外部副作用恢复）
Idempotency（幂等）
Dynamic Tool Availability（动态工具可用性）
Session Tree / Compaction 与恢复关系
```

---

## 十四、源码定位清单

### `packages/agent/src/agent-loop.ts`

重点：

```text
Outer Loop / Inner Loop
getSteeringMessages()
getFollowUpMessages()
prepareNextTurn()
shouldStopAfterTurn()
AgentEvent emission
agent_end
```

架构映射：

```text
Runtime Scheduler
Safe Point
Steering / Follow-up Scheduling
Stop Priority
Event Lifecycle
```

### `packages/agent/src/agent.ts`

重点：

```text
PendingMessageQueue
steeringQueue / followUpQueue
steer() / followUp()
steeringMode / followUpMode
ActiveRun
prompt()
abort()
waitForIdle()
subscribe()
processEvents()
```

架构映射：

```text
Queue Ownership
Single Active Run Guard
Cooperative Cancellation
Run Settlement
Event → State Reduction
Subscriber Backpressure
```

### `packages/agent/src/types.ts`

重点：

```text
QueueMode
AgentEvent
message_start / update / end
tool_execution_start / update / end
AgentState
```

架构映射：

```text
Queue Consumption Contract
Runtime Event Protocol
In-flight / Committed State
```

### `packages/agent/src/harness/agent-harness.ts`

重点：

```text
getSteeringMessages
getFollowUpMessages
beforeToolCall bridge
afterToolCall bridge
prepareNextTurn
flushPendingSessionWrites
Queue / Session / Hook integration
```

架构映射：

```text
Lifecycle Infrastructure
Session Persistence Glue
Hook Bridge
Context Preparation
```

### `packages/coding-agent/src/core/agent-session.ts`

重点：

```text
AgentSessionEvent
agent_settled
queue_update
compaction_*
entry_appended
Session-level lifecycle
```

架构映射：

```text
Core Event Extension
Session Lifecycle
Product Settlement Boundary
UI Queue Projection
```

### `packages/agent/README.md` 与 Harness 文档

用于确认：

```text
Steering / Follow-up 时机
QueueMode
Awaited Subscriber
Agent Event Sequence
Hook Bridge
Session / Harness Lifecycle
```

原则：当前源码与当前 README 优先于旧版 Changelog 行为。

---

## 十五、写书 TODO

1. 增加 Runtime Control 章节：Steering、Follow-up、Abort、Safe Point 与 Pending Queue。
2. 用“Message Accepted ≠ Message Consumed”解释 Queue。
3. 增加 `all` 与 `one-at-a-time` 两种 QueueMode。
4. 把 Agent Loop 描述为 Runtime Scheduler，而不只是 `while(toolCalls)`。
5. 增加 Agent Streaming：LLM、Tool、Message、Turn 与 Runtime Lifecycle。
6. 单独区分 Command 与 Event。
7. 增加 Event、State、Transcript、Persistence 与 UI Projection 五层模型。
8. 增加 Live Reconnect 与 Cold Restore 对照。
9. 增加 Human Approval 的 Mechanism / Lifecycle / Policy 三层架构。
10. 增加 Interactive Approval 与 Durable Approval 对照。
11. 增加 TOCTOU 风险与 Resume Revalidation。
12. 增加 Soft Gate 与 Hard Security Boundary，说明 Agent Permission 不能替代业务安全。

---

## 十六、写书素材

### 素材 1：Agent Runtime 是调度器

> 一个成熟 Agent Loop 调度的不只是 LLM 与 Tool，而是 LLM、Tool、Steering、Follow-up、Stop Policy、Abort、Event 与 State。

### 素材 2：消息接收不等于消费

```text
User Input
→ Pending Queue
→ Safe Point
→ Context
→ LLM
```

### 素材 3：Event 不是日志

```text
tool_execution_start
→ pendingToolCalls.add(id)
```

Event 可以成为 Runtime State Transition Protocol。

### 素材 4：Agent 状态的五层模型

```text
Event → 怎么变化
State → 现在是什么
Transcript → 已正式提交什么
Persistence → 重启后还能恢复什么
UI Projection → 用户看到什么
```

### 素材 5：审批三层模型

```text
Core → Mechanism
Harness → Lifecycle Infrastructure
Domain Agent → Policy
```

### 素材 6：Harness 类比

```text
Agent Core ≈ Kernel
Harness ≈ Operating Runtime Services
Domain Agent ≈ Application
```

---

## 十七、下一节学习计划

### Day07 / 会话 5：Part VI-K + VI-L + VI-M

会话 5 是 Pi Agent 源码解剖的最后一个会话。当前已经明确需要沿着下面的主线继续：

```text
Agent Run
    ↓
Session Persistence（会话持久化）
    ↓
Crash / Restart（崩溃 / 重启）
    ↓
State Reconstruction（状态重建）
    ↓
Pending Tool / External Effect
    ↓
Idempotency（幂等）
    ↓
Resume（恢复执行）
```

还需回收：

```text
Dynamic Tool Availability（动态工具可用性）
Persistent Tool Execution（持久化工具执行）
External Side-effect Recovery（外部副作用恢复）
Session Tree / Compaction 与恢复关系
最终反推 Mini Agent Runtime 设计
```

当前 Day07 README 尚未给出 VI-L / VI-M 的精确标题，因此下一会话开始时应先根据 Pi 官方当前源码重新定位，不提前凭空命名。
