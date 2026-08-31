# Day07：Pi Agent 源码解剖·会话 4 ChatGPT 源记录

- 会话链接：https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a91404d-b0c4-83e8-bfee-e5b54a2158f8
- 会话标题：Day07 / 会话 4
- 提取日期：2026-08-31
- 覆盖范围：Part VI-H（Runtime Control，运行时控制）、Part VI-I（Streaming & Event Protocol，流式与事件协议）和 Part VI-J（Human Approval Boundary，人工审批边界）
- 整理说明：本文件保存对话中的有效学习主线、关键源码结论、讨论修正和固定收尾，不逐字复制重复问答、页面 UI 与引用控件。正式学习笔记见 `../day07-session-04-runtime-control-events-and-human-approval.md`。

## 术语约定

会话新增了一项跨学习内容的表达约定：英文专有术语和技术名词至少前三次出现时补充中文括号释义；没有稳定中文译名时，后续也尽量保留中文语义说明。

---

## 会话 4 的三部分

```text
Part VI-H：Runtime Control（运行时控制）
→ Steering / Follow-up / Abort / Queue / Safe Point

Part VI-I：Streaming & Event Protocol（流式与事件协议）
→ AgentEvent / State / Transcript / Persistence / UI

Part VI-J：Human Approval Boundary（人工审批边界）
→ Core Mechanism / Harness Lifecycle / Domain Policy
```

---

## Part VI-H：Runtime Control（运行时控制）

### 三种控制语义

```text
Steering（运行中转向）
→ 当前任务继续，但改变下一轮决策

Follow-up（后续任务）
→ 当前目标完成以后追加工作

Abort（中止）
→ 请求停止当前 Run 的执行生命周期
```

Pi 的 Steering 是 Deferred Steering（延迟转向）：当前 Assistant Message 的 Tool Batch 先完整结束，再在 Turn Boundary（轮次边界）消费 Steering Queue（转向队列）。

### 两层 Loop

```text
Inner Loop（内层循环）
→ Tool Calls + Steering

Outer Loop（外层循环）
→ Agent 原本准备停止时消费 Follow-up
```

Agent Loop 因此更接近 Runtime Scheduler（运行时调度器），而不只是 `while(toolCalls)`。

### Queue 与 Safe Point

```text
External Input
→ Queue
→ Runtime Safe Point
→ Context
→ LLM
```

核心区分：

```text
Message Accepted
≠
Message Consumed
```

Steering 与 Follow-up 使用独立 Queue，消息进入 Context 后仍是普通 `AgentMessage`；区别主要是 Scheduling Semantics（调度语义）。

### QueueMode

```text
all
→ 一次取出全部消息

one-at-a-time
→ 每个 Safe Point 只取最早一条
```

`steeringMode` 与 `followUpMode` 可独立设置，并在下一次 Queue Drain 时读取最新值。

### Active Run 与 Abort

同一 Stateful Agent 同时只允许一个 Active Run。运行中再次 `prompt()` 会被拒绝，新输入应走 Steering / Follow-up Queue。

```text
abort()
→ Cancellation Requested

waitForIdle()
→ Run 和 Awaited Subscribers 均已收尾
```

`agent_end` 是最后一个 Core Event，但不一定是 Idle Boundary；异步 Subscriber 完成后 Agent 才真正 Idle。

---

## Part VI-I：Streaming & Event Protocol（流式与事件协议）

### Agent Streaming

```text
Agent Streaming
= LLM Streaming
+ Tool Streaming
+ Message Lifecycle
+ Turn Lifecycle
+ Runtime Lifecycle
```

统一 Event Protocol：

```text
agent_start / agent_end
turn_start / turn_end
message_start / update / end
tool_execution_start / update / end
```

### Command 与 Event

```text
Command
→ 希望系统做什么

Event
→ 已经发生了什么
```

例如 `steer()` 是 Command，`message_end` 是 Event。

### Event 驱动 State

```text
AgentEvent
→ processEvents()
→ Agent State
→ Subscriber / UI
```

Event 不只是日志，它参与 Runtime State Transition。

### In-flight 与 Committed

```text
streamingMessage
→ In-flight State

messages
→ Committed Transcript
```

`tool_execution_update` 是进度 Event；`ToolResultMessage` 是完成后进入 Transcript 和 LLM Context 的 Observation。

### 五层模型

```text
Event → 发生了什么变化
State → 当前是什么
Transcript → 已提交什么
Persistence → 重启后保留什么
UI Projection → 用户看到什么
```

UI 是 Runtime / Session State 的投影，不是 Source of Truth。

### 恢复

```text
Live Reconnect
→ Runtime 仍活着
→ Snapshot + New Events

Cold Restore
→ Runtime 已死亡
→ Persistent Session → Reconstruct Runtime
```

持久化不能简单保存 AbortController、Promise、pendingToolCalls 和 streamingMessage。

### Core 与 Session 生命周期

```text
agent_end
→ Low-level Run 结束

agent_settled
→ Session-level Retry / Compaction / Continuation 全部结束
```

Pi 是 Event-driven Runtime State Synchronization，不能直接等同于完整 Event Sourcing。

---

## Part VI-J：Human Approval Boundary（人工审批边界）

### 三层模型

```text
Agent Core
→ Mechanism
→ beforeToolCall Execution Gate

Harness
→ Lifecycle Infrastructure
→ UI / Pending State / Session / Persistence / Resume

Domain Agent
→ Policy
→ 哪些操作需要审批、阈值和审批人
```

`beforeToolCall` 是 Approval Mechanism Boundary，不是完整 Human Approval System。

### Interactive 与 Durable Approval

```text
Interactive Approval
→ Runtime / Promise 仍存活

Durable Approval
→ Pending Operation 必须持久化
→ Runtime 可退出
→ 之后重建并恢复
```

### 具体 Effect 与 TOCTOU

审批必须绑定具体 Tool、Validated Arguments、身份、策略版本、过期时间和幂等键，而不能只批准 Tool Name。

恢复后必须 Revalidation，因为审批时和执行时的业务状态可能不同，这就是 TOCTOU 风险。

### Reject 也是 Observation

Human Reject 应转成明确的 Blocked Tool Result，让 LLM 知道 Action 没有发生并重新规划。

### Soft Gate 与 Hard Boundary

```text
Agent Approval / Policy
→ Soft Gate

Sandbox / OS Permission / Business Auth
→ Hard Security Boundary
```

最终业务系统仍负责 Authorization、Idempotency、Transaction 与 Audit。

### Hook Trust Boundary

Hook 可以查看或修改参数、阻止 Tool、修改结果并触发 UI，因此本身也是需要治理的 Trust Boundary。高风险 Preflight Hook 失败时通常应 Fail Closed。

---

## 核心认知

```text
1. Agent Runtime 是受生命周期约束的调度器。
2. Steering / Follow-up / Abort 是不同控制维度。
3. Message Accepted 不等于 Message Consumed。
4. Event 是执行协议，不只是 UI 通知。
5. In-flight State 与 Committed State 必须分离。
6. Persistence 恢复稳定事实，不复活旧执行栈。
7. Human Approval = Mechanism + Lifecycle + Policy。
8. Core、Harness 与 Domain Agent 必须分层。
9. UI 是 State Projection，不是 Runtime Source of Truth。
10. Agent Approval 不能替代硬安全边界。
```

---

## 前置问题回收

- Steering 不会跳过当前 Tool Batch。
- 运行中新增 Prompt 先进入 Queue，在 Safe Point 消费。
- Abort Requested 不等于 Run Finished。
- Agent Streaming 不等于 LLM Token Streaming。
- Event 可以参与 State Transition，不只是日志。
- Human Approval：Core 提供 Mechanism，Harness 管 Lifecycle，Domain Agent 定 Policy。
- Harness 是 Core 与 Domain Agent 之间的通用运行基础设施。

继续延期：

```text
Crash Recovery
Persistent Tool Execution
External Side-effect Recovery
Idempotency
Dynamic Tool Availability
Session Tree / Compaction 与恢复关系
```

---

## 源码定位

```text
packages/agent/src/agent-loop.ts
→ Outer / Inner Loop
→ getSteeringMessages / getFollowUpMessages
→ prepareNextTurn / shouldStopAfterTurn
→ AgentEvent emission

packages/agent/src/agent.ts
→ PendingMessageQueue
→ steer / followUp / QueueMode
→ ActiveRun / abort / waitForIdle
→ subscribe / processEvents

packages/agent/src/types.ts
→ QueueMode / AgentEvent / AgentState

packages/agent/src/harness/agent-harness.ts
→ Queue / Session / Hook Bridge
→ beforeToolCall / afterToolCall bridge
→ prepareNextTurn / pending writes

packages/coding-agent/src/core/agent-session.ts
→ AgentSessionEvent
→ agent_settled / queue_update / compaction / entry_appended
```

## 核对资料

- Pi Agent Loop：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts
- Pi Agent：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent.ts
- Pi Agent Types：https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts
- Pi Agent Harness：https://github.com/earendil-works/pi/blob/main/packages/agent/src/harness/agent-harness.ts
- Pi Coding Agent Session：https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts
- Pi Agent README：https://github.com/earendil-works/pi/blob/main/packages/agent/README.md

---

## 下一会话

Day07 会话 5：Part VI-K + VI-L + VI-M。

当前确认的主线是 Session Persistence、Crash Recovery、State Reconstruction、Persistent Tool Execution、External Side-effect Recovery、Idempotency、Dynamic Tool Availability，以及最终反推 Mini Agent Runtime。

VI-L / VI-M 的精确标题需在下一会话开始时根据 Pi 官方当前源码确定，不提前凭空命名。
