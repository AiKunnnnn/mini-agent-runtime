# Day07：Pi Agent 源码解剖·会话 5 ChatGPT 源记录

- 会话链接：https://chatgpt.com/c/6a9526df-0f48-83e8-b203-7a027a554469
- 会话标题：Pi agent Part 5
- 提取日期：2026-09-01
- 覆盖范围：Part VI-K（Session Persistence & Context Reconstruction，会话持久化与上下文重建）、Part VI-L（Dynamic Runtime Configuration，动态运行时配置）和 Part VI-M（Pi Agent Runtime Boundary & Mini Runtime Extraction，Pi Agent 运行时边界与 Mini Runtime 反推）
- 整理说明：本文件保存会话中的有效学习主线、源码结论、重要修正和固定收尾，不逐字复制重复问答、页面 UI 与引用控件。正式学习笔记见 `../day07-session-05-session-reconstruction-dynamic-runtime-and-mini-runtime-extraction.md`。

## 本会话的定位

会话开始时先复核 Day07 会话 4 笔记和 Day07 README，然后确定这是 Day07 最后一个学习会话：

```text
Part VI-K：Session Persistence & Context Reconstruction
Part VI-L：Dynamic Runtime Configuration
Part VI-M：Pi Agent Runtime Boundary & Mini Runtime Extraction
```

会话最初对 VI-M 使用过 `Recovery Boundary & Mini Runtime Extraction` 的描述；正式进入该 Part 时，标题收敛为 `Pi Agent Runtime Boundary & Mini Runtime Extraction`。两种表达指向同一条主线：厘清 Pi 的恢复和架构边界，再反推 Mini Runtime。

---

## Part VI-K：Session Persistence & Context Reconstruction

### 第一条边界

```text
Runtime State
≠
Persistent State
```

不能直接可靠持久化的进程内对象包括：

```text
streamingMessage
pendingToolCalls
AbortController
Promise
activeRun
network connection
JavaScript call stack
```

Pi 保存的主要是 Session Entry：

```text
message
model_change
thinking_level_change
compaction
branch_summary
custom
custom_message
label
```

### Session 不是 `messages[]`

```text
Session
=
Conversation History
+ Runtime Configuration History
+ Context Transformation History
+ Branching History
+ Extension State
```

Session 是 Agent 工作历史的持久化模型，Message 只是其中一种事实。

### Session Tree

Entry 通过 `id / parentId` 形成 Append-only Tree（只追加树），`leafId` 决定当前使用的分支：

```text
A
↓
B
↓
C
├── D1 → E1
└── D2 → E2 ← leaf
```

完整树用于保存探索历史，当前 LLM 只能看到当前 Branch（分支）。

### Session 到 Context 的投影链

```text
SessionEntry[]
      ↓
buildSessionPath()
      ↓
Current Branch
      ↓
buildContextEntries()
      ↓
Compaction Boundary
      ↓
sessionEntryToContextMessages()
      ↓
AgentMessage[]
      ↓
LLM Context
```

三个关键认识：

```text
Tree 是 Persistence Model
Path 是当前历史读视图
Context 是再次计算后的 Projection
```

### Compaction

Compaction 不删除历史，而是定义以后怎样读取历史：

```text
Old Entries
├── 原始历史保留
└── Compaction Boundary
       ├── summary
       └── recent tail
```

因此它更接近 Context Reconstruction Checkpoint，而不是完整 Runtime Checkpoint。

### 会话中的源码修正

会话中先做过一次校正：当时检查 `coding-agent/src/core/session-manager.ts`，发现对应的兼容路径使用：

```text
summary
firstKeptEntryId
```

`firstKeptEntryId` 指回原历史中保留尾部的第一条 Entry。

随后官方格式继续演进。到本笔记整理时，当前 `session-format.md` 已明确写出较新的 Harness Compaction 可以携带：

```text
summary
retainedTail: AgentMessage[]
```

并保留 `firstKeptEntryId` 作为旧格式兼容字段。

最终应保留的结论不是“只存在某一个字段”，而是：

```text
Compaction
→ 保存 Summary + Recent Tail 的重建语义

firstKeptEntryId
→ 回指原历史

retainedTail
→ 自包含物化尾部消息
```

### Entry 到 Message 的转换

会话区分了：

```text
message / compaction / branch_summary / custom_message
→ 可以进入 LLM Context

model_change / thinking_level_change / custom / label
→ 用于配置、扩展状态或会话管理，不直接进入 LLM Context
```

特别是：

```text
CustomEntry
→ 持久化，但不进入 LLM

CustomMessageEntry
→ 持久化，也投影给 LLM
```

### Restore Boundary

完整恢复链：

```text
JSONL Session
       ↓
SessionManager
       ↓
buildSessionContext()
       ↓
messages / model / thinkingLevel
       ↓
Current Environment Validation
       ↓
new Agent(...)
       ↓
agent.state.messages = existingSession.messages
```

Core Runtime 接收的是 `AgentMessage[]`，不需要知道 Session Tree、JSONL、Branch、Compaction Entry 或 Session Picker。

### Persistent Configuration 的重新校验

恢复旧模型时仍要检查：

```text
model 是否存在
provider 是否可用
认证是否可用
当前模型能力是否支持保存的 thinking level
```

无法恢复时，应 Fallback（回退）并提供可观察提示。

### 恢复不是复活

```text
Persistent Facts
→ Reconstruct
→ Validate
→ Resolve
→ New Runtime
```

核心表达：

> Resume = New Runtime + Old Stable History。

### 三种 Recovery

```text
Session Recovery
→ 之前发生和讨论了什么

Execution Recovery
→ Agent Loop 执行到哪里

External Effect Recovery
→ 真实外部动作是否发生
```

Session 本身无法确认网络断开前的退款是否已经在业务系统成功。外部副作用需要业务侧提供 Idempotency Key、Operation ID、Query Status、Transaction 与 Audit。

---

## Part VI-L：Dynamic Runtime Configuration

### Next Turn Refresh

会话通过下一轮准备逻辑说明：Model、Thinking Level、Tools 与 System Prompt 的修改通常不是篡改当前 Turn，而是在下一个安全边界重新读取。

```text
Mutation Accepted
        ↓
RuntimeState 更新
        ↓
当前 Turn 按旧 Snapshot 完成
        ↓
prepareNextTurnWithContext()
        ↓
Next Turn 使用新配置
```

### RuntimeState 与 Turn Snapshot

```text
Mutable RuntimeState
        ↓ Safe Point
Turn Snapshot
        ↓
Current LLM Request / Tool Batch
```

运行中对象已经显示新值，不等于当前 In-flight Operation（执行中操作）已经采用新值。

### Mutation Time 与 Effective Time

会话形成的关键区分：

```text
Mutation Time
≠ Effective Time
≠ Durable Time
```

配置可能在 Use-time、Next Turn、Next Batch 或 Runtime Recreation 时生效。

### Registry 与 Active Tools

```text
Tool Registry
→ Capability Pool

Active Tools
→ Current Capability View
```

Tools 变化还需要同步更新 System Prompt / Tool Schema，因为它同时影响：

```text
Execution World
+ Cognitive World
```

### Capability Projection

```text
Tool Registry / Permission / Workflow State
        ↓
Capability Projection
        ↓
Active Tools
        ↓
LLM Tool Schema
```

这与 Context Projection 同构。

### 隐藏工具与执行授权

```text
Active Tools
→ 控制 LLM 能提出什么

Execution Gate
→ 控制具体动作能不能执行
```

隐藏工具不能替代执行时重新鉴权。

### Dynamic Configuration 的三级模型

```text
Dynamic Value
Dynamic Turn Configuration
Dynamic Runtime Component
```

第三类组件需要处理 Load、Reload、Invalidate 与 Dispose。

### Extension 生命周期

Reload 后，旧 Extension Context 可能引用旧 Session、Tool Registry、Emitter 与 Permission State。主动 `invalidate()` 让旧引用 Fail-fast，避免其悄悄操作 Stale Object Graph（过期对象图）。

Extension Hook 因此既是 Trust Boundary，也是 Lifecycle Boundary。

---

## Part VI-M：Pi Agent Runtime Boundary & Mini Runtime Extraction

### 源码校正

Pi 当前的通用 `AgentHarness` 已位于 `packages/agent` / Agent Core 包内，并包含 Session、Compaction、Queue、Tools、Resources 与 Lifecycle 能力。

因此：

```text
Architecture Boundary
≠
Package Boundary
```

Core / Harness / Domain 是职责划分，不必等于三个独立 npm Package。

### Agent 四层模型

```text
1. Loop / Core Mechanism
2. Harness
3. Domain Agent
4. Hard Security Boundary
```

其中：

```text
Core
→ 基础执行机制

Harness
→ 通用生命周期基础设施

Domain Agent
→ 领域 Tool / Prompt / Workflow / Policy

Hard Boundary
→ Sandbox / Authorization / Idempotency / Transaction / Audit
```

### 当前实现与未来设计

会话提醒：Telemetry Schema、Operation Recovery、Harness V2 State Machine 等资料可以用于观察 Durable Execution 的演进方向，但 Working Design 不能当作当前正式实现。

### Mini Runtime V1

建议实现：

```text
Type System + ModelProvider
RuntimeState + Agent Loop
Tool Registry + Tool Executor + Error Contract
ContextBuilder + TurnSnapshot
AgentEvent + Subscriber
Abort + Single Active Run
SessionStore + Conversation Recovery
beforeToolCall + 简单 Approval Mechanism
Weather Agent 端到端链路
```

第一版明确暂缓：

```text
Session Tree
Durable Tool Execution
Durable Approval
Hot Extension Reload
复杂 Compaction
Multi-Agent / Sub-Agent
```

### 最终公式

```text
Agent Runtime
=
State
+ Loop
+ Context Projection
+ Capability Projection
+ Tool Execution
+ Event Protocol
+ Lifecycle Control
+ Persistence Boundary
```

---

## 固定收尾摘要

### 下一节学习计划

下一阶段进入 Part VII：Mini Agent Runtime Implementation（Mini Agent Runtime 实现），使用 Node.js + TypeScript 将 Day01～Day07 的设计原则实现出来。

### 写书 TODO

1. Session ≠ messages。
2. Session Tree → Branch → Context Projection。
3. Compaction 是 Context Reconstruction Boundary。
4. Resume = New Runtime + Old Stable History。
5. 区分三种 Recovery。
6. Persistent Configuration 恢复后重新校验。
7. RuntimeState ≠ Turn Snapshot。
8. Dynamic Configuration 的三级模型。
9. Visibility ≠ Applicability ≠ Durability。
10. Dynamic Tool Availability = Capability Projection。
11. Extension Reload 的 Invalidation / Dispose。
12. Architecture Boundary ≠ Package Boundary。
13. Agent 四层模型。
14. Mini Runtime V1 Scope / Non-goals。
15. 确定性软件工程机制约束概率性 LLM 决策。

### 本会话核心认知升级

```text
Session 是持久化工作历史
Context 永远是 Projection
Restore 是 Reconstruction
Recovery 必须分层
RuntimeState 与 Turn Snapshot 分离
Tools 同时需要 Capability Projection 与 Execution Gate
Extension 是生命周期对象
Harness 是职责层
```

### 工业级实现

状态至少分为：

```text
Persistent State
Runtime Mutable State
Turn Snapshot
External Business State
```

External Effect 必须由业务系统通过鉴权、幂等、事务、状态查询和审计兜底。

### 知识地图

```text
Session Tree
  ↓ Branch / Compaction
Context Projection
  ↓
RuntimeState
  ↓ Safe Point
Turn Snapshot
  ↓
LLM + Tool
  ↓
Event / Persistence
```

### 面试重点

1. Session 与 Messages 的区别。
2. Reconstruction 与 Deserialization 的区别。
3. Compaction 为什么不等于删除历史。
4. Dynamic Tool Availability 的定义。
5. RuntimeState 与 Turn Snapshot 的区别。
6. Resume 与 Reload 的区别。
7. Harness 与 Agent Core 的区别。
8. 为什么 V1 不做 Durable Tool Execution。

### 前置问题回收

会话完成了以下问题的最终回收：

```text
Crash Recovery 的分层
convertToLlm / transformContext 的注入边界
Tool Developer 吞错与 Tool Contract
Mechanism / Lifecycle / Domain Policy
Parallel Tool 与单个 Effect 授权
Interactive / Durable Approval
Context Builder 的最终定义
```

---

## 源码与官方资料

- [Session Manager](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)
- [Session Format](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md)
- [Sessions Guide](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md)
- [Agent Session Runtime](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session-runtime.ts)
- [Agent Session](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts)
- [Settings Manager](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/settings-manager.ts)
- [Coding Agent Harness Assembly](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/server/create-harness.ts)
- [Agent Harness](https://github.com/earendil-works/pi/blob/main/packages/agent/src/harness/agent-harness.ts)
- [Agent Harness Documentation](https://github.com/earendil-works/pi/blob/main/packages/agent/docs/agent-harness.md)

---

## Day07 完成状态

```text
[x] 会话 1：VI-A + VI-B
[x] 会话 2：VI-C + VI-D
[x] 会话 3：VI-E + VI-F + VI-G
[x] 会话 4：VI-H + VI-I + VI-J
[x] 会话 5：VI-K + VI-L + VI-M
```

Day07 / Part VI：Pi Agent 源码解剖至此完成。
