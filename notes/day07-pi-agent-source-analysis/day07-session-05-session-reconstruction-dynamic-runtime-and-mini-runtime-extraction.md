# Day07：Pi Agent 源码解剖·会话 5——会话重建、动态配置与 Mini Runtime 反推

> 本文是《从零实现 Agent Runtime》Day07 / Part VI 的第五份正式学习笔记，覆盖 Part VI-K（Session Persistence & Context Reconstruction，会话持久化与上下文重建）、Part VI-L（Dynamic Runtime Configuration，动态运行时配置）和 Part VI-M（Pi Agent Runtime Boundary & Mini Runtime Extraction，Pi Agent 运行时边界与 Mini Runtime 反推）。
>
> 本会话完成 Day07 的源码解剖：先研究 Pi 如何把稳定历史保存为 Session（会话），再研究它如何在安全边界刷新 Model（模型）、Tools（工具）与 System Prompt（系统提示词），最后提炼我们自己的 Mini Agent Runtime V1。

## 术语阅读约定

英文专有术语和技术名词在至少前三次出现时补充中文括号释义；没有稳定中文译名时，后续仍尽量保留中文语义说明。

---

## 一、本会话学习目标

本会话重点回答：

1. 为什么 Session（会话）不等于 `messages[]`？
2. Pi 为什么使用 JSONL（逐行 JSON）和 `id / parentId` 保存一棵 Session Tree（会话树）？
3. `buildSessionPath()`、`buildContextEntries()` 与 `buildSessionContext()` 如何完成上下文重建？
4. Compaction（上下文压缩）为什么是 Context Reconstruction Boundary（上下文重建边界），而不是删除历史？
5. Persistent State（持久状态）如何重新进入一个新的 Agent Runtime（Agent 运行时）？
6. Resume（恢复会话）为什么是 New Runtime + Old Stable History（新运行时 + 旧稳定历史）？
7. Session Recovery（会话恢复）、Execution Recovery（执行恢复）和 External Effect Recovery（外部副作用恢复）有何区别？
8. Model、Thinking Level（思考级别）、Tools 和 System Prompt 在运行中改变后，何时真正生效？
9. RuntimeState（运行状态）与 Turn Snapshot（轮次快照）为什么必须分离？
10. Dynamic Tool Availability（动态工具可用性）为什么是一种 Capability Projection（能力投影）？
11. Extension Reload（扩展重载）为什么需要 Invalidation（主动失效）与 Dispose（资源释放）？
12. Pi 的 Agent Core（Agent 核心）、Harness（运行壳层 / 生命周期编排层）、Domain Agent（领域 Agent）和 Hard Security Boundary（硬安全边界）如何分工？
13. Mini Runtime V1 应实现什么，又应明确暂缓什么？

---

## 二、会话 5 总体模型

```text
Persistent Session
        │
        │  Branch + Compaction + Projection
        ↓
Reconstructed Context
        │
        │  Current Environment Validation
        ↓
New Agent Runtime
        │
        │  Safe Point / Next Turn Refresh
        ↓
Turn Snapshot
        │
        ↓
LLM Decision + Tool Execution
```

三部分的关系是：

```text
Part VI-K：保存什么，以及如何重建可用上下文
→ Session Entry / Tree / Branch / Compaction / Restore

Part VI-L：运行中配置变化何时进入执行事实
→ Mutable RuntimeState / Safe Point / Turn Snapshot / Capability Projection

Part VI-M：Pi 的能力边界，以及我们的 V1 应抽取什么
→ Core / Harness / Domain / Hard Boundary / V1 Scope
```

本会话的主线不是“把 Pi 的全部能力复制一遍”，而是：

```text
观察成熟 Runtime
       ↓
识别稳定设计原则
       ↓
区分基础能力与高级能力
       ↓
反推可实现的 Mini Runtime V1
```

---

## 三、Part VI-K：Session Persistence & Context Reconstruction（会话持久化与上下文重建）

### 3.1 Runtime State 不等于 Persistent State

运行中的 Agent 包含很多 Process-local State（进程内状态）：

```text
streamingMessage
pendingToolCalls
AbortController
Promise
activeRun
当前网络连接
JavaScript 调用栈
```

这些对象要么不可序列化，要么即使序列化也无法在进程重启后恢复其真实语义。

Pi 持久化的是另一类事实：

```text
Session
├── message
├── model_change
├── thinking_level_change
├── compaction
├── branch_summary
├── custom
├── custom_message
└── label / metadata ...
```

因此：

```text
Runtime Memory
≠
Persistent Session
```

Pi 保存的不是整个 `AgentState` 快照，而是一系列可以被解释、重建和迁移的 Session Entry（会话条目）。

### 3.2 Session 不等于 `messages[]`

最简单的 Agent 可能这样设计：

```ts
interface Session {
  messages: AgentMessage[];
}
```

但成熟 Agent 的工作历史还包括：

```text
Conversation History
+ Runtime Configuration History
+ Context Transformation History
+ Branching History
+ Extension State
```

例如，只保存 Message（消息）而不保存 Model Change（模型切换），重新打开会话时就无法判断当前分支最后选择了哪个模型。

更准确的定义是：

> Session（会话）是一段 Agent 工作历史的持久化模型；Message（消息）只是其中一种事实。

### 3.3 为什么采用 JSONL

Pi 会话文件采用 JSONL（逐行 JSON）：每一行是一条 Header（头部信息）或 Entry（条目）。

这一形式适合追加型历史：

```text
append entry
append entry
append entry
```

它的工程优点包括：

- 新事实可以追加，不必每次重写完整会话对象。
- 单条 Entry 的边界清晰，便于诊断与迁移。
- 会话可以保留不同类型的事实，而不必强行塞进 Message Schema（消息结构）。
- `id / parentId` 可以表达分支，而不要求磁盘顺序等于当前上下文顺序。

JSONL 不是自动获得一致性或耐久性的魔法。写入时仍需处理原子性、Flush（落盘）、损坏恢复和 Schema Migration（结构迁移）。

### 3.4 Session Tree：持久化的是探索历史

除 Session Header（会话头）外，Entry 具有：

```ts
interface SessionEntryBase {
  id: string;
  parentId: string | null;
  timestamp: string;
}
```

因此历史不是只能线性增长：

```text
A
↓
B
↓
C
├── D1 → E1
└── D2 → E2 ← current leaf
```

磁盘保存完整树：

```text
A B C D1 E1 D2 E2
```

但当前有效分支只有：

```text
A B C D2 E2
```

Session Tree（会话树）可以视为 Agent Exploration History（Agent 探索历史）：失败方案不必删除，返回旧节点后可以创建新分支继续尝试。

### 3.5 Tree 是写模型，Path 是当前读模型

`buildSessionPath()` 从当前 Leaf（叶子节点）沿 `parentId` 回溯到 Root（根节点），再反转顺序：

```text
leaf
 ↓ parentId
parent
 ↓ parentId
root
 ↓ reverse
root → ... → leaf
```

这一步完成第一层 Projection（投影）：

```text
完整 Session Tree
        ↓ leafId
当前 Session Path
```

可以类比 Git Commit Graph（Git 提交图）与 HEAD，但只是数据模型类比，并非实现等价。

核心认识是：

> Tree（树）适合保存所有稳定历史，Path（路径）才是当前 Runtime 所关心的历史。

### 3.6 Path 仍然不能直接变成 Context

即使选出了当前分支，它仍可能太长：

```text
M1 → M2 → ... → M100
```

如果前面的历史已被压缩，LLM 不应同时看到原始旧消息和它们的摘要，否则既浪费 Token，又可能引入重复或冲突。

因此需要第二层 Projection：

```text
Session Path
      ↓
Compaction Boundary
      ↓
Context Entries
```

### 3.7 `buildContextEntries()` 与最后一次 Compaction

其核心语义可以浓缩为：

```text
1. 构造当前 Path
2. 找到 Path 中最后一个 CompactionEntry
3. 没有 Compaction：使用整条 Path
4. 存在 Compaction：使用摘要 + 保留尾部 + 压缩后的新条目
```

假设原始 Path：

```text
A B C D E F G Compaction-X H I J
```

其中：

```text
Compaction-X.summary = summary(A-D)
firstKeptEntryId = E
```

那么用于构造 Context 的逻辑内容是：

```text
Compaction-X
E F G
H I J
```

而不是把 A 到 J 全部再次发送。

### 3.8 `firstKeptEntryId` 与 `retainedTail`：两种演进中的表达

阅读 Pi 当前代码时必须保留版本与实现层差异：

#### 旧格式 / `coding-agent` 兼容路径

```text
CompactionEntry
├── summary
└── firstKeptEntryId
        ↓
   回指原 Session History 中需要保留的第一条 Entry
```

它不复制 E/F/G，只记录 E 的 ID，然后复用原历史。

#### 较新的 Harness 生成格式

官方 `session-format.md` 说明，较新的 Harness Compaction（运行壳层生成的压缩条目）可以直接包含：

```text
CompactionEntry
├── summary
└── retainedTail: AgentMessage[]
```

这样 Context 可以从自包含的 Compaction Checkpoint（压缩检查点）恢复，而不必向前遍历旧条目；`firstKeptEntryId` 仍用于向后兼容。

二者解决的是同一个问题：

```text
Summary
+ Recent Tail
```

但数据组织方式不同。学习时应提炼语义，不应把某一时点的字段当成永恒架构。

### 3.9 Compaction 不删除历史

Compaction（上下文压缩）改变的是以后如何读取历史，而不是改写历史本身：

```text
Persistent History
├── 原始 Entry 继续存在
└── Compaction Entry 定义新的读取边界
```

所以它更准确地接近：

```text
Context Reconstruction Checkpoint
（上下文重建检查点）
```

而不是：

```text
Runtime Checkpoint
（完整运行时检查点）
```

真正的 Runtime Checkpoint 还可能需要：

```text
program counter
pending tool
retry count
queue
external operation
active transaction
```

Pi 的会话压缩主要回答的是：下一次 LLM Context（LLM 上下文）应该怎样表示过去。

### 3.10 Session Entry 不等于 Agent Message

第三层 Projection 由 `sessionEntryToContextMessages()` 完成：

```text
SessionEntry
      ↓
选择和转换
      ↓
AgentMessage[]
```

大致关系是：

| Session Entry | 是否进入 LLM Context | 投影结果 |
| --- | --- | --- |
| `message` | 是 | 原 AgentMessage |
| `compaction` | 是 | 压缩摘要 Message |
| `branch_summary` | 是 | 分支摘要 Message |
| `custom_message` | 是 | 扩展注入 Message |
| `model_change` | 否 | 用于重建配置 |
| `thinking_level_change` | 否 | 用于重建配置 |
| `custom` | 否 | 扩展持久状态 |
| `label` / metadata | 否 | 会话管理信息 |

因此：

```text
Persistent
≠
必须让 LLM 看见
```

### 3.11 `CustomEntry` 与 `CustomMessageEntry`

这两个概念体现了存储层与认知层的边界：

```text
CustomEntry
→ 扩展需要持久化
→ 不进入 LLM Context

CustomMessageEntry
→ 扩展需要持久化
→ 也需要投影给 LLM
```

例如：

```text
lastSyncAt
→ 运行组件需要，LLM 不必知道

“当前项目进入发布冻结期”
→ 可能需要进入 LLM 决策上下文
```

### 3.12 `buildSessionContext()` 的完整投影链

最终调用链是：

```text
SessionEntry[]
      ↓
buildSessionPath()
      ↓
Current Branch
      ↓
buildContextEntries()
      ↓
Compaction Projection
      ↓
sessionEntryToContextMessages()
      ↓
AgentMessage[]
```

同时，当前 Branch 上的配置历史会派生出：

```ts
interface SessionContext {
  messages: AgentMessage[];
  model?: ModelRef;
  thinkingLevel?: ThinkingLevel;
}
```

这说明 Session 与 Context 是典型的 Write Model（写模型）与 Read Model（读模型）：

```text
Session Tree
→ 保存完整稳定事实

Session Context
→ 为当前 Runtime 计算出来的读视图
```

### 3.13 Runtime Event 如何反向写回 Session

持久化链路与读取链路方向相反：

```text
Agent Event
    ↓
AgentSession / Harness
    ↓
判断是否到达 Committed Boundary（提交边界）
    ↓
append Message / Entry
    ↓
JSONL Session
```

这里不应把 Streaming Delta（流式增量）逐片直接当成正式历史。更稳定的边界是：

```text
message_start / message_update
→ In-flight State

message_end
→ Committed Message
→ Session Append
```

这与会话 4 的 In-flight State（执行中状态）和 Committed State（已提交状态）分层一致。

### 3.14 Restore Boundary：持久历史在哪里进入 Agent Core

恢复不是在旧 Runtime 上续接，而是在创建新 Runtime 前先解释 Session：

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
      ↓
new AgentSession / Harness
```

真正进入 Agent Core（Agent 核心）的不是：

```text
SessionEntry[]
```

而是已经投影好的：

```text
AgentMessage[]
```

Core 不需要知道 JSONL、`parentId`、`leafId`、Branch、Compaction 文件格式或会话选择 UI。

### 3.15 Persistent Configuration 必须重新校验

Session 中保存的 Model（模型）不是无条件恢复：

```text
Saved Model
    ↓
当前 Provider 是否存在？
当前认证是否可用？
模型是否仍可使用？
    ↓
可用 → Restore
不可用 → Fallback + 可观察提示
```

Thinking Level（思考级别）也要与当前模型能力重新对齐：

```text
Saved Thinking Level
        ↓
Current Model Capability
        ↓
Clamp / Fallback
        ↓
Effective Thinking Level
```

因此：

> Persistent Configuration（持久配置）是恢复输入，不是当前环境必须照单全收的命令。

### 3.16 Resume 是 Reconstruction，不是 Deserialization

普通反序列化暗示：

```text
磁盘是什么
内存就恢复成什么
```

Pi 的恢复更接近：

```text
Read Persistent Facts
       ↓
Reconstruct Stable State
       ↓
Validate Current Environment
       ↓
Resolve Defaults / Fallbacks
       ↓
Build New Runtime
```

一句话总结：

> Resume（恢复会话）= New Runtime（新运行时）+ Old Stable History（旧稳定历史）。

### 3.17 恢复必须分层

“支持恢复”至少要拆成三种语义：

```text
Session Recovery
→ 之前发生和讨论了什么？

Execution Recovery
→ Agent Loop 执行到了哪里？

External Effect Recovery
→ 真实业务动作究竟有没有发生？
```

三者不能混为一谈：

```text
Session Recovery
≠
Execution Recovery
≠
External Effect Recovery
```

Pi 的传统 Session 能力主要解决 Conversation / Session Recovery（对话 / 会话恢复），不自动等于 Durable Tool Execution（持久工具执行）。

### 3.18 外部副作用为什么不能只靠 Session

假设：

```text
Agent → refund(order123)
业务服务退款成功
网络断开 / 进程崩溃
ToolResult 尚未写入 Session
```

恢复后，Session 只能看到 Tool Call（工具调用），无法确认外部世界究竟是：

```text
未执行
已执行但响应丢失
执行失败
部分执行
```

这属于经典的不确定提交问题。工业系统需要业务侧提供：

```text
Authorization（业务鉴权）
Idempotency Key（幂等键）
External Operation ID（外部操作 ID）
Query Status（状态查询）
Transaction（事务）
Audit（审计）
```

Agent Runtime 可以协调这些机制，但不能仅凭会话历史保证 Exactly Once（恰好一次）。

### 3.19 Mini Runtime V1 的恢复边界

第一版只需要实现：

```text
messages / stable facts persistence
        ↓
restart
        ↓
context reconstruction
        ↓
conversation recovery
```

第一版不要试图恢复：

```text
旧 Promise
旧 AbortController
旧网络流
执行到一半的 Tool Stack
未确认的外部副作用
```

这不是功能缺失，而是明确的 Scope Boundary（范围边界）。

---

## 四、Part VI-L：Dynamic Runtime Configuration（动态运行时配置）

### 4.1 “对象已经变了”不等于“当前执行已经采用”

运行中可以修改：

```text
Model
Thinking Level
Tools
System Prompt
Settings
```

但关键问题不是它们能不能修改，而是：

> 修改什么时候成为执行事实？

因此必须区分：

```text
Mutation Time（修改发生时间）
≠
Effective Time（执行生效时间）
```

### 4.2 RuntimeState 与 Turn Snapshot

可以建立两层模型：

```text
Mutable RuntimeState
（希望后续使用的可变状态）
        ↓ Safe Point
Turn Snapshot
（当前轮次采用的稳定快照）
```

例如：

```text
Turn A Snapshot:
model = Claude
tools = [read, edit]

运行中 RuntimeState 被修改：
model = GPT
tools = [read]

当前 Turn A：
仍按旧 Snapshot 完成

Turn B：
在安全边界读取新 RuntimeState
```

这避免一次 Turn（轮次）前后使用不同配置，破坏决策一致性。

### 4.3 Next Turn Refresh（下一轮刷新）

Pi 的 `prepareNextTurnWithContext()` / 下一轮准备逻辑会在新的 Assistant Response（模型响应）开始前重新读取：

```text
agent.state.model
agent.state.thinkingLevel
agent.state.tools
current systemPrompt
```

然后构造下一轮 Loop Snapshot（循环快照）。

完整语义是：

```text
Mutation Accepted
        ↓
RuntimeState 更新
        ↓
当前 Turn 正常结束
        ↓
prepareNextTurnWithContext()
        ↓
读取最新状态
        ↓
Next Turn 使用新配置
```

这与 Steering（运行中转向）的设计哲学一致：外部变化可以随时被接受，但要在 Safe Point（安全执行点）进入执行。

### 4.4 配置生效边界不只有一种

成熟 Runtime 应为不同设置定义 Effective Boundary（生效边界）：

```ts
type EffectiveAt =
  | "use-time"
  | "next-turn"
  | "next-batch"
  | "runtime-restart";
```

- Use-time（使用时）：每次实际使用前读取最新值，例如某些无状态显示或过滤设置。
- Next-turn（下一轮）：Model、Thinking、Tools、Prompt 等轮次输入。
- Next-batch（下一批次）：影响工具批次调度、队列 Drain（排空）或执行策略的设置。
- Runtime-restart（重启后）：需要替换整个 Runtime Component（运行组件）的结构变化。

配置 API 至少要回答：修改已接受了吗？何时生效？是否持久化？失败如何观察？

### 4.5 Visibility 不等于 Applicability

还应区分：

```text
Visibility（新值已经能被读取）
≠
Applicability（新值已应用于当前操作）
```

例如 `agent.state.model` 已显示新模型，只说明 Desired State（期望状态）改变；正在进行的 LLM Request 仍由旧 Turn Snapshot 决定。

### 4.6 Tools 变化为什么要同步重建 System Prompt

Tool Set（工具集合）同时影响两个世界：

```text
Execution World
→ Runtime 真正允许执行什么

Cognitive World
→ LLM 认为自己可以做什么
```

如果只更改 `agent.state.tools`，但 System Prompt 仍宣称可以使用已经关闭的工具，模型认知就与真实能力不一致。

因此：

```text
Active Tool Set Change
        ├── 更新执行侧 Tool Set
        └── 重建认知侧 System Prompt / Tool Schema
```

### 4.7 Registry 与 Active Tools

两者不是同一个概念：

```text
Tool Registry
→ Agent 理论上拥有的 Capability Pool（能力池）

Active Tools
→ 当前 Turn 暴露给 LLM 的 Capability View（能力视图）
```

例如：

```text
Registry:
query_order / query_logistics / refund / send_email / edit_order

订单查询阶段 Active:
query_order / query_logistics

退款申请阶段 Active:
query_order / query_refund_policy / create_refund_request

审批通过后 Active:
refund
```

### 4.8 Dynamic Tool Availability 是 Capability Projection

工具选择与 Message Projection（消息投影）同构：

```text
Session / Memory / State
        ↓
Context Projection
        ↓
messages
```

```text
Tool Registry / Permission / Workflow State
        ↓
Capability Projection
        ↓
active tools
```

每次 LLM Request（模型请求）实际上是一份综合的 Turn Snapshot：

```text
LLM Request
├── systemPrompt
├── messages
├── tools
├── model
└── thinkingLevel
```

### 4.9 隐藏 Tool 不等于撤销权限

Active Tools 控制的是：

```text
LLM 能提出什么动作
```

Execution Gate（执行门）控制的是：

```text
已经提出的具体动作是否仍可执行
```

二者必须同时存在：

```text
Capability Projection
→ 缩小模型决策空间

Execution-time Validation
→ 在真实副作用前重新校验权限与状态
```

因为 Tool Call 可能来自旧 Turn Snapshot，权限也可能在 LLM 生成后、Tool 执行前发生变化。

### 4.10 Model 与 Thinking Level 的动态路由

Model 和 Thinking Level 也可在轮次边界刷新：

```text
复杂规划阶段
→ 强模型 + 高思考级别

机械执行阶段
→ 更轻模型 + 较低思考级别
```

但动态路由必须保留可观察性，例如记录：

```text
Decision Model
Thinking Level
Turn ID
Tool Calls
```

否则后续无法解释某个动作由什么配置生成。

### 4.11 Settings 的内存状态与持久化状态

设置管理也有两条边界：

```text
Setter 更新 In-memory Effective State
        ↓
Runtime 后续读取新值

flush()
        ↓
Persistent Durability
```

所以还要区分：

```text
Value Visible
Value Effective
Value Durable
```

写文件失败不应被静默吞掉；Runtime 应提供错误 Drain（错误排出）、Event（事件）或显式返回值。

### 4.12 动态配置的三级模型

会话最终形成三类 Dynamic Configuration（动态配置）：

#### Dynamic Value（动态值）

```text
每次使用时读取
不需要重建大的对象图
```

#### Dynamic Turn Configuration（动态轮次配置）

```text
在 Turn Boundary 重新快照
例如 model / thinking / tools / prompt
```

#### Dynamic Runtime Component（动态运行组件）

```text
需要 reload / invalidate / dispose / recreate
例如 extension runner、资源加载器或持有连接的组件
```

这三类不应共享一句模糊的“支持热更新”。

### 4.13 Extension 是生命周期对象

Extension（扩展）不只是 `register()`：

```text
load
activate
run hooks
reload
invalidate
dispose
```

旧 Extension Context（扩展上下文）可能闭包引用：

```text
old session
old tool registry
old event emitter
old permission state
old resource handles
```

Reload 后如果旧引用仍能工作，就可能悄悄操作过期对象图。

### 4.14 Invalidation 是 Fail-fast

主动 `invalidate()` 的目的不是制造错误，而是把隐式的不一致变成显式失败：

```text
Old Context
    ↓ invalidate
后续调用立即报错
```

这比“有时成功、有时操作旧状态”更安全。

因此 Extension Hook（扩展钩子）既是：

```text
Trust Boundary（信任边界）
+ Lifecycle Boundary（生命周期边界）
```

### 4.15 Resume 与 Reload 不同

```text
Resume
→ 从持久事实重建新的 Runtime

Reload
→ 在当前生命周期中替换运行组件
```

Resume 的核心是 Reconstruction（重建）；Reload 的核心是对象失效、资源清理、重新注册和新旧代际隔离。

---

## 五、Part VI-M：Pi Agent Runtime Boundary & Mini Runtime Extraction（Pi Agent 运行时边界与 Mini Runtime 反推）

### 5.1 先校正一个架构判断

Core / Harness / Domain 是职责划分，不一定等于三个独立 Package（软件包）。

Pi 当前把通用 `AgentHarness` 放在 `packages/agent` / Agent Core 包中；它已经包含 Session、Compaction、Queue、Resources、Tools 与 Lifecycle（生命周期）等能力。

这说明：

> Architecture Boundary（架构边界）描述责任，Package Boundary（包边界）描述代码组织；两者相关但不必一一对应。

### 5.2 Agent Runtime 的四层模型

#### 第一层：Loop / Core Mechanism（循环与核心机制）

```text
Agent State
LLM Loop
Tool Calling
Observation
Streaming Event
Abort
Steering / Follow-up
```

回答：一个 Agent 如何完成一次可运行的决策—行动循环？

#### 第二层：Harness（运行壳层 / 生命周期编排层）

```text
Session
Queue
Persistence
Compaction
Recovery
Retry
Resource / Extension Lifecycle
```

回答：如何把 Core 变成可长期使用、可观察、可恢复的通用 Runtime？

#### 第三层：Domain Agent（领域 Agent）

```text
Domain Tools
Domain Prompt
Domain Workflow
Domain Policy
Domain Memory
```

回答：在某个业务领域里，Agent 应该做什么、何时做、遵守什么规则？

#### 第四层：Hard Security Boundary（硬安全边界）

```text
Sandbox
OS Permission
Business Authorization
Idempotency
Transaction
Audit
```

回答：即使 LLM、Prompt、Hook 或 Runtime 出错，真实世界仍如何被保护？

### 5.3 Harness 为什么不是“杂物层”

Harness 解决的不是随意附加功能，而是跨领域重复出现的 Lifecycle Infrastructure（生命周期基础设施）：

```text
Core Mechanism
      ↓
Harness
      ↓
Stable Agent Application
```

但 Harness 也不能吞并业务策略。比如：

```text
beforeToolCall
→ Core / Harness 提供机制

Pending Approval
→ Harness 管理生命周期

退款超过 5000 元需要经理审核
→ Domain Policy
```

### 5.4 当前正式实现与演进文档要分开

阅读快速演进的开源 Runtime 时，资料至少分三类：

```text
Current Code
→ 当前实际行为

Official Stable Docs
→ 对外承诺与格式说明

Working Design / Handoff Docs
→ 未来方向或迁移设计
```

例如 Durable Execution（持久执行）、Operation Recovery（操作恢复）或 Harness V2 State Machine（Harness V2 状态机）的设计资料很有启发，但不能自动当作当前已完成能力。

学习笔记应明确标注“当前实现”“兼容路径”和“演进方向”。

### 5.5 Mini Runtime 不是 Mini Pi

我们的目标不是：

```text
复制 Pi 所有功能
```

而是：

```text
抽取最小正确架构
       ↓
用 Node.js + TypeScript 实现
       ↓
通过一个真实 Agent 验证完整链路
```

判断功能是否进入 V1 的标准是：

1. 是否帮助建立核心 Runtime 心智模型？
2. 是否能用清晰测试验证？
3. 是否是后续扩展的正确基础？
4. 是否会过早引入分布式事务或复杂持久执行问题？

### 5.6 Mini Runtime V1 必要能力

第一版建议包含：

```text
1. Type System
2. ModelProvider
3. RuntimeState
4. Single Active Run
5. Agent Loop
6. ContextBuilder
7. TurnSnapshot
8. Tool Registry
9. Tool Executor
10. Tool Error Contract
11. Observation
12. AgentEvent + Subscriber
13. Abort
14. SessionStore
15. Conversation Recovery
16. beforeToolCall + 简单审批机制
17. Weather Agent 端到端示例
```

如果进一步按实现职责收敛，V1 的主体可以归成六个模块：

```text
1. Agent Loop
2. Runtime State + Turn Snapshot
3. Tool Registry + Tool Executor
4. Event Protocol
5. Session / Persistence
6. Approval Mechanism
```

ModelProvider（模型提供者）和 ContextBuilder（上下文构建器）是贯穿这些模块的明确接口：前者隔离模型调用，后者负责把 RuntimeState 投影成 Turn Snapshot。

### 5.7 Mini Runtime V1 架构图

原会话最终收敛出的 V1 组件关系如下。这张图比单纯的能力清单更重要，因为它同时表达了调用方向、状态所有权以及 Loop（循环）之外的外围能力：

```text
                  Application
                      │
                      ↓
              ┌──────────────┐
              │ Mini Agent   │
              └──────┬───────┘
                     │
        ┌────────────┼────────────┐
        ↓            ↓            ↓
    RuntimeState  ToolRegistry  EventBus
        │            │            │
        └────────────┼────────────┘
                     ↓
              prepareNextTurn
                     ↓
               TurnSnapshot
                     ↓
                  LLM
                     ↓
              AssistantMessage
                     ↓
         ┌───────────┴───────────┐
         ↓                       ↓
    Final Answer              ToolCall
                                 ↓
                          ToolExecutor
                                 ↓
                          ToolResult
                                 ↓
                             State
                                 ↓
                             Loop
```

Loop 外围还有两条基础设施链：

```text
SessionStore
    ↑
message_end
```

```text
AbortController
→ Cooperative Cancellation（协作式取消）
```

这张图表达了几个关键边界：

1. `Mini Agent` 是面向 Application（应用层）的公共入口，不是所有实现逻辑的容器。
2. `RuntimeState` 是当前 Runtime 的状态所有者，UI 和 SessionStore 不应各维护一份竞争状态。
3. `prepareNextTurn` 是 RuntimeState → TurnSnapshot 的安全投影边界。
4. `ToolRegistry` 管理能力定义，`ToolExecutor` 管理单次调用执行，两者不能混为一层。
5. `EventBus` 横切 Runtime，但不应把 UI、日志和持久化逻辑写进 Agent Loop。
6. `SessionStore` 在提交边界保存稳定事实，不负责序列化整个运行中的对象图。
7. `AbortController` 通过协作式取消影响 Provider、Tool 与 Hook，不代表同步强杀调用栈。

### 5.8 六个模块如何落到架构中

#### 模块 1：Agent Loop

```text
User Goal
   ↓
LLM
   ↓
Assistant Message
   ↓
├── Final Answer → stop
└── Tool Calls
        ↓
    execute tools
        ↓
    Observation
        ↓
    append messages
        ↓
       LLM
```

Loop 应保持小而清晰，只负责编排 Decision → Tool → Observation → Decision；持久化、UI、日志和领域策略不应直接塞入循环。

#### 模块 2：Runtime State + Turn Snapshot

```text
Runtime Mutable State
        ↓
prepareNextTurn()
        ↓
Turn Snapshot
        ↓
LLM Request
```

这一模块从第一版就建立 `RuntimeState ≠ TurnSnapshot`，为 Dynamic Tools、Context Compaction、Memory Retrieval 与 Model Routing 留下稳定扩展点。

#### 模块 3：Tool Registry + Tool Executor

```text
ToolCall
   ↓
Registry lookup
   ↓
validate arguments
   ↓
beforeToolCall
   ↓
execute
   ↓
normalize result
   ↓
ToolResultMessage
```

Registry 解决“有什么 Tool、怎样找到”，Executor 解决“某一次调用怎样验证、拦截、执行和规范化”。

#### 模块 4：Event Protocol

V1 不需要复制 Pi 的全部事件，但应保留最小协议：

```ts
type AgentEvent =
  | { type: "run_start" }
  | { type: "turn_start" }
  | { type: "message_end"; message: AgentMessage }
  | { type: "tool_start"; toolCallId: string }
  | { type: "tool_end"; toolCallId: string }
  | { type: "run_end" };
```

这样 CLI、Web UI、日志、持久化和 Tracing（链路追踪）都可以订阅 Runtime，而不侵入 `runAgentLoop()`。

#### 模块 5：Session / Persistence

V1 只实现 Stable Conversation Recovery（稳定对话恢复）：

```ts
interface Session {
  id: string;
  messages: AgentMessage[];
  createdAt: number;
  updatedAt: number;
}
```

第一版保持线性 Session 是刻意的范围选择，不妨碍 V2 再演进为 Entry Tree。

#### 模块 6：Approval Mechanism

V1 只提供执行前机制插槽：

```ts
type BeforeToolCall = (
  call: ToolCall
) => Promise<
  | { allow: true }
  | { allow: false; reason: string }
>;
```

```text
validate
   ↓
beforeToolCall
   ↓
├── deny  → ToolResult(blocked)
└── allow → execute
```

它不包含 Durable Approval（持久审批）、经理工作流或 Pending Approval Database（待审批数据库）。

### 5.9 Mini Runtime V1 目录结构

原会话为 Node.js + TypeScript 第一版给出的目录蓝图如下：

```text
mini-agent-runtime/
│
├── src/
│   ├── core/
│   │   ├── agent.ts
│   │   ├── agent-loop.ts
│   │   ├── state.ts
│   │   ├── types.ts
│   │   └── events.ts
│   │
│   ├── context/
│   │   └── context-builder.ts
│   │
│   ├── tools/
│   │   ├── tool.ts
│   │   ├── registry.ts
│   │   └── executor.ts
│   │
│   ├── session/
│   │   ├── session.ts
│   │   └── memory-session-store.ts
│   │
│   ├── approval/
│   │   └── before-tool-call.ts
│   │
│   ├── providers/
│   │   └── model-provider.ts
│   │
│   └── index.ts
│
├── examples/
│   └── weather-agent/
│
└── tests/
```

目录并不是为了提前制造很多文件，而是在代码开始前固定职责边界：

| 目录 | 职责 | 明确不负责 |
| --- | --- | --- |
| `core/` | Agent Facade、Loop、RuntimeState、公共类型、Event Protocol | 领域 Tool、Session 文件格式、UI |
| `context/` | RuntimeState → TurnSnapshot | Tool 的真实副作用执行 |
| `tools/` | Tool Contract、注册、查找、验证与执行 | 业务权限最终裁决 |
| `session/` | 稳定会话数据与 Store 接口 | 恢复旧 Promise、旧网络连接 |
| `approval/` | `beforeToolCall` 机制 | Durable Approval Workflow |
| `providers/` | 隔离不同模型 Provider | Agent Loop 和领域策略 |
| `examples/` | 端到端验证 Runtime 的使用方式 | Runtime 核心实现 |
| `tests/` | 按边界验证行为契约 | 只测试 Weather Agent 的表面结果 |

第一阶段暂不增加 `memory/`。Day06 的 Memory（记忆）能力可在 Runtime 主链跑通以后，作为 Plugin / Adapter（插件 / 适配器）加入。

### 5.10 三个必须从第一天守住的代码边界

#### `Agent` 是 Facade，不是上帝对象

```ts
class Agent {
  readonly state: RuntimeState;

  constructor(
    private model: ModelProvider,
    private toolRegistry: ToolRegistry,
    private sessionStore: SessionStore,
  ) {}

  async prompt(message: string) {}
  abort() {}
  subscribe(listener: AgentEventListener) {}
}
```

`Agent` 负责公共 API 与组件编排；真正的循环由独立的 `runAgentLoop(...)` 承担。

```text
Public Agent API
≠
Loop Implementation
```

#### Context Builder 从第一天独立

即使 V1 只是复制数组，也不应直接把 `state.messages` 传给模型：

```ts
class ContextBuilder {
  build(state: RuntimeState): TurnSnapshot {
    return {
      messages: [...state.messages],
      tools: [...state.tools],
      systemPrompt: state.systemPrompt,
      model: state.model,
    };
  }
}
```

未来的 Memory Retrieval、Compaction、Dynamic Prompt、Tool Projection 与 Token Budget 都应进入 Context Builder / `prepareNextTurn`，而不是污染 Agent Loop。

#### Hard Security Boundary 不进入 Runtime 幻觉

`beforeToolCall` 只是 Agent-level Policy Gate（Agent 层策略门），不能替代 Sandbox、OS Permission 或 Business Authorization。

```text
Agent Policy
      ↓
Tool
      ↓
Sandbox / OS / Business Authorization
```

### 5.11 V1 明确暂缓的能力

```text
Session Tree
复杂 Compaction
Durable Tool Execution
Durable Approval
Hot Extension Reload
Multi-Agent / Sub-Agent
分布式 Operation Recovery
Exactly-once Effect
```

暂缓原因不是它们不重要，而是这些能力会引入：

```text
Checkpoint Protocol
Idempotency
Transaction
Reconciliation
Distributed Coordination
Extension Generation Management
```

它们会遮蔽 V1 最需要掌握的 Loop / State / Tool / Context / Event 主线。

### 5.12 推荐的 Part VII 实现顺序

```text
Part VII-A
项目骨架 + 类型体系 + ModelProvider

Part VII-B
RuntimeState + Agent Loop

Part VII-C
Tool Registry + Tool Executor + Error Contract

Part VII-D
ContextBuilder + TurnSnapshot

Part VII-E
AgentEvent + Subscriber

Part VII-F
Abort + Single Active Run

Part VII-G
SessionStore + Conversation Recovery

Part VII-H
beforeToolCall + 简单 Approval Mechanism

Part VII-I
Weather Agent 跑通完整链路
```

### 5.13 Mini Runtime 的核心类型草图

```ts
interface RuntimeState {
  messages: AgentMessage[];
  model: ModelRef;
  thinkingLevel?: ThinkingLevel;
  tools: AgentTool[];
  systemPrompt: string;
  status: "idle" | "running" | "aborting";
}

interface TurnSnapshot {
  messages: AgentMessage[];
  model: ModelRef;
  thinkingLevel?: ThinkingLevel;
  tools: AgentTool[];
  systemPrompt: string;
}

interface SessionStore {
  load(sessionId: string): Promise<PersistedSession | null>;
  append(sessionId: string, entry: SessionEntry): Promise<void>;
}
```

V1 可以先让 Persisted Session（持久会话）保持线性，但类型和职责应避免把磁盘数据、RuntimeState 与 TurnSnapshot 混成一个对象。

### 5.14 Tool Error Contract

至少区分：

```text
Framework Failure
├── tool_not_found
├── invalid_arguments
├── timeout
└── execution_exception

Business Failure
├── order_not_found
├── insufficient_balance
├── refund_not_allowed
└── domain-specific failure
```

Tool Developer（工具开发者）不能只吞掉异常并返回模糊的 `"failed"`，否则 Runtime 无法治理 Retry（重试）、Observation（观察结果）、Metrics（指标）和恢复策略。

### 5.15 Event Consumer 应分级

会话持久化与 UI 动画不应拥有相同可靠性语义：

```text
Critical Subscriber
→ Session Persistence
→ Audit

Best-effort Subscriber
→ UI animation
→ analytics
→ debug logging
```

需要明确：关键订阅者失败是否阻止下一轮？非关键订阅者是否允许异步、丢弃或降级？

### 5.16 Agent Runtime 的最终公式

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

它的核心工程矛盾是：

> 用状态机、事件、队列、权限、事务、生命周期和持久化等确定性机制，约束并承载概率性的 LLM Decision Engine（LLM 决策引擎）。

---

## 六、贯穿本会话的四类状态

工业 Agent 最好明确区分：

```text
1. Persistent State
2. Runtime Mutable State
3. Turn Snapshot
4. External Business State
```

| 状态层 | 典型内容 | 生命周期 | 主要所有者 |
| --- | --- | --- | --- |
| Persistent State | messages、配置历史、compaction、checkpoint | 跨进程 | Session / Store |
| Runtime Mutable State | model、tools、queue、active run | 当前 Runtime | Agent / Harness |
| Turn Snapshot | 当前轮 messages、tools、model、prompt | 单个 Turn | Agent Loop |
| External Business State | order、refund、transaction、permission | 外部业务系统 | Domain Service |

不要把四者混成一个宽泛的 `state`。

---

## 七、本会话核心认知升级

### 7.1 Session 是工作历史，不是消息数组

```text
Session
=
Messages
+ Configuration History
+ Context Transformation History
+ Branching
+ Extension State
```

### 7.2 Context 永远是 Projection

```text
Session Tree
      ↓
Current Branch
      ↓
Compaction
      ↓
Entry Conversion
      ↓
AgentMessage[]
      ↓
LLM Context
```

### 7.3 Restore 是 Reconstruction

```text
Persistent Facts
→ Reconstruct
→ Validate
→ Resolve
→ New Runtime
```

### 7.4 Recovery 必须分层

```text
Session Recovery
≠ Execution Recovery
≠ External Effect Recovery
```

### 7.5 RuntimeState 与 Turn Snapshot 必须分开

```text
Mutable RuntimeState
        ↓ Safe Point
Turn Snapshot
        ↓
Current LLM / Tool Batch
```

### 7.6 Tools 是双重投影

```text
Active Tools
→ LLM 能提出什么

Execution Gate
→ 已提出的动作能不能执行
```

### 7.7 Extension 是生命周期对象

Extension 不只有注册，还需要 Load、Invalidate、Dispose 与 Generation Isolation（代际隔离）。

### 7.8 Harness 是职责层，不是固定目录名

架构责任与 Package 布局不能机械等同。

### 7.9 Mini Runtime 的目标从理解转向构建

```text
Understand Agent
      ↓
Extract Principles
      ↓
Build Agent Runtime
```

---

## 八、与 Day01～Day06 的连接

```text
Day01：Agent 基本循环
→ 本会话确定 V1 的 Loop 最小边界

Day02：Planning / Reasoning
→ Model 与 Thinking Level 成为 Turn Snapshot 的配置

Day03：State / Workflow
→ Persistent、Runtime、Turn、Business 四类状态分层

Day04：Context Engineering
→ Session Tree / Compaction / Memory 都通过 Projection 进入 Context

Day05：Tool System
→ Tool Registry 进一步升级为 Capability Pool + Active Projection + Execution Gate

Day06：Memory / Production Agent
→ Session Recovery、持久化、审批和外部副作用边界得到真实源码映射
```

---

## 九、工业级实现建议

### 9.1 所有动态设置都写清生效边界

设计文档至少注明：

```text
acceptedAt
visibleAt
effectiveAt
durableAt
```

### 9.2 持久化稳定事实，不持久化进程幻觉

优先保存：

```text
committed messages
configuration facts
operation ids
checkpoints
audit records
```

不要试图保存：

```text
Promise
AbortController
socket
callback closure
active JavaScript stack
```

### 9.3 Restore 必须返回诊断信息

恢复发生 Fallback（回退）时应可观察：

```text
saved model unavailable
thinking level clamped
tool missing
extension state ignored
session entry migrated
```

### 9.4 Tool Effect 使用业务幂等

对退款、付款、发券、删除、发邮件等动作，必须绑定 Operation ID 与 Idempotency Key，并提供查询状态的业务接口。

### 9.5 Context Projection 与 Capability Projection 分离

V1 可以由一个 `ContextBuilder` 编排，但概念上要区分：

```text
Message Projection
Capability Projection
Execution-time Authorization
```

随着系统增长，可拆成 `ContextBuilder`、`CapabilityBuilder` 与 `ToolExecutionGate`。

### 9.6 Compaction 先做简单且可验证的版本

第一版可以只提供：

```text
Summary + Recent Messages
```

并保存可追踪的边界。不要一开始就实现 Session Tree 上的多分支复杂压缩。

### 9.7 测试按边界组织

至少覆盖：

```text
Session append / load
Context reconstruction
Turn snapshot immutability
next-turn configuration refresh
tool registry vs active tools
abort and idle boundary
subscriber failure semantics
restore fallback
idempotency handoff contract
```

---

## 十、知识地图

```text
Pi Agent Runtime
│
├── Agent Core Mechanism
│   ├── Runtime State
│   ├── Agent Loop
│   ├── Tool Execution
│   ├── Observation
│   ├── Event Protocol
│   ├── Abort
│   └── Steering / Follow-up
│
├── Turn Boundary
│   ├── Context Projection
│   ├── Capability Projection
│   ├── System Prompt
│   ├── Model
│   ├── Thinking Level
│   └── Turn Snapshot
│
├── Harness
│   ├── Session
│   ├── Queue
│   ├── Compaction
│   ├── Persistence
│   ├── Recovery
│   ├── Retry
│   └── Extension Lifecycle
│
├── Session Model
│   ├── JSONL Entry
│   ├── Tree
│   ├── Branch / Leaf
│   ├── Compaction Boundary
│   ├── Context Reconstruction
│   └── Current Environment Validation
│
├── Dynamic Configuration
│   ├── Dynamic Value
│   ├── Dynamic Turn Configuration
│   ├── Dynamic Runtime Component
│   ├── Visibility vs Applicability
│   └── Reload / Invalidate / Dispose
│
├── Domain Agent
│   ├── Domain Tools
│   ├── Domain Prompt
│   ├── Domain Workflow
│   └── Domain Policy
│
└── Hard Boundary
    ├── Sandbox
    ├── OS Permission
    ├── Business Authorization
    ├── Idempotency
    ├── Transaction
    └── Audit
```

---

## 十一、面试视角

### Q1：Agent Session 与 Messages 有什么区别？

简单 Agent 可以只保存 `messages[]`；成熟 Session 还可能包含模型变化、思考级别、上下文压缩、分支历史和扩展状态。Message 是 Session 中的一类事实，不是 Session 本身。

### Q2：为什么重启后不能直接恢复整个 RuntimeState？

`Promise`、`AbortController`、网络连接和调用栈属于进程内状态，进程死亡后无法可靠复活。应保存稳定事实，再构建新的 Runtime。

### Q3：Compaction 为什么不是删除旧消息？

成熟实现保留原始历史，并记录摘要与重建边界。Compaction 改变的是 Context 的读取方式，不是历史事实。

### Q4：Session Tree 为什么有价值？

它保存 Agent 的探索分支，使用户可以回到历史节点重试而不删除旧方案；当前 LLM 只读取当前 Leaf 对应的 Branch。

### Q5：`firstKeptEntryId` 与 `retainedTail` 有何区别？

前者回指原历史中保留尾部的起点；后者把保留的 `AgentMessage[]` 直接物化在压缩条目中。两者都表达 Summary + Recent Tail，但恢复路径和自包含程度不同。

### Q6：Session Recovery 与 Effect Recovery 有何区别？

Session Recovery 重建对话与稳定历史；Effect Recovery 必须确认外部系统中的真实动作是否发生，通常依赖 Operation ID、幂等和业务查询。

### Q7：为什么 RuntimeState 与 Turn Snapshot 要分开？

RuntimeState 可以动态变化，已经开始的 Turn 应保持稳定快照，否则同一轮可能前后使用不同模型、工具或提示词。

### Q8：Dynamic Tool Availability 是什么？

Runtime 根据当前状态、权限和流程，从完整 Tool Registry 中投影当前暴露给 LLM 的 Active Tools。

### Q9：隐藏工具是否等于安全授权？

不等于。隐藏工具缩小 LLM 决策空间，真实执行前仍须通过 Execution Gate、业务鉴权与参数重新校验。

### Q10：Resume 与 Reload 有何区别？

Resume 从持久事实重建新 Runtime；Reload 在当前生命周期中替换组件，因此要处理旧引用失效、资源释放与新旧代际隔离。

### Q11：Harness 与 Agent Core 有什么区别？

Core 提供基本执行机制；Harness 提供 Session、Queue、Persistence、Compaction、Recovery 等通用生命周期能力。它们是职责边界，不一定分别对应独立 Package。

### Q12：Mini Runtime V1 为什么不做 Durable Tool Execution？

它会立即引入 Checkpoint、Idempotency、Transaction 与 External Effect Reconciliation 等复杂问题，模糊 V1 最需要掌握的 Loop / State / Tool / Context / Event 主线。

### Q13：Agent Runtime 最大的工程挑战是什么？

用确定性软件工程机制可靠地约束和承载概率性的 LLM 决策。

---

## 十二、本章思考题

1. Tool Set 在下一轮改变后，上一轮已生成但尚未执行的 Tool Call 应遵循旧 Snapshot 还是最新权限？
2. Model 被切换后，是否应在 Tool Call 上记录 Decision Model？
3. Session Tree 应属于基础 Runtime，还是高级 Harness？
4. Compaction Summary 出错时，能否重新生成而不修改原历史？
5. Turn Snapshot 是否应使用不可变对象保证边界？
6. `message_end` 后 Session 写入失败，Runtime 是否应继续下一轮？
7. Critical Subscriber 很慢时，应优先一致性还是流式体验？
8. Capability Projection 应属于 Context Builder，还是独立 Capability Builder？
9. 危险工具被隐藏后，为什么还必须保留 Execution Gate？
10. Tool 执行成功但 Session 写入失败，恢复后怎样避免把真实 Effect 当成未发生？
11. V1 的 SessionStore 应只保存消息，还是同步保存 Model 与 System Prompt？
12. `prepareNextTurn()` 同时承担 Context、Tool、Model 与 Prompt Projection 时，何时应该拆分？
13. `retainedTail` 自包含恢复与 `firstKeptEntryId` 回指历史各有什么一致性和存储权衡？
14. Extension Reload 时，怎样证明旧 Context 已经全部失效？

---

## 十三、前置问题回收

### 13.1 Crash Recovery 到底恢复什么？

```text
Session State
→ 可以恢复很多稳定事实

Runtime Process State
→ 大量丢失，需要新建

External Effect
→ 必须去业务系统确认
```

因此 Crash Recovery 不是单一功能，而是一组分层语义。

### 13.2 `convertToLlm` 与 `transformContext` 属于哪里？

```text
Agent Core
→ 定义策略插槽并在正确生命周期调用

Coding Agent / Harness
→ 注入图片过滤、扩展 Context Hook 等具体策略
```

### 13.3 Tool Developer 自己吞错怎么办？

Runtime 无法恢复 Tool 已经隐藏的信息，必须依靠 Runtime Error Handling + Tool SDK Contract + Tool Development Specification 共同约束。

### 13.4 Policy 到底属于哪里？

```text
Core
→ Mechanism / Extension Point

Harness
→ Lifecycle Infrastructure

Domain Agent
→ Business Policy
```

### 13.5 Parallel Tool 与授权有什么关系？

每个 Tool Call 都必须独立经过 Validation、Permission 与 Approval Gate，通过后才进入 Parallel Execution；同一批次不能绕过单个 Effect 的权限边界。

### 13.6 长时间人工审批怎样恢复？

```text
Interactive Approval
→ 短时间挂起 Runtime / Promise

Durable Approval
→ 持久化 Pending Operation
→ Runtime 可退出
→ 人工完成后 Reconstruction + Resume
```

### 13.7 Context Builder 的最终定义

```text
State
Session
Memory
Tool Registry
Policy
Token Budget
        ↓
Projection
        ↓
Turn Snapshot
```

它本质上回答：下一次 LLM Decision 应该看到哪一份世界？

---

## 十四、源码定位清单

以下链接以 2026-09-01 的 Pi 官方 `main` 分支为准。仓库持续演进，阅读时应结合 Git History（提交历史）判断字段与边界。

### [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts)

重点：

```text
Session Entry
id / parentId / leafId
buildSessionPath()
buildContextEntries()
buildSessionContext()
sessionEntryToContextMessages()
CompactionEntry
firstKeptEntryId
model_change
thinking_level_change
```

架构认知：Persistent History、Session Tree、Branch Selection、Context Reconstruction、Write Model ≠ Read Model。

### [`packages/coding-agent/docs/session-format.md`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/session-format.md)

重点：JSONL Session、Entry Types、Tree、Compaction、Branch Summary、`custom` / `custom_message`，以及新旧 `retainedTail` / `firstKeptEntryId` 兼容格式。

### [`packages/coding-agent/docs/sessions.md`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sessions.md)

重点：Session Resume、会话选择、Tree 与 Branching。

### [`packages/coding-agent/src/core/agent-session-runtime.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session-runtime.ts)

重点：新建、恢复、Fork 与 Session Replacement（会话替换）时怎样把 `buildSessionContext().messages` 注入新 Runtime。

### [`packages/coding-agent/src/core/agent-session.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/agent-session.ts)

重点：Agent Event 持久化、下一轮刷新、Active Tools、System Prompt 重建、Extension Runner 生命周期。

### [`packages/coding-agent/src/core/settings-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/settings-manager.ts)

重点：Global / Project Settings、Merged Settings、Getter / Setter、Flush 与持久化错误边界。

### [`packages/coding-agent/src/server/create-harness.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/server/create-harness.ts)

重点：通用 AgentHarness + Coding Tools + Active Tools + System Prompt 如何装配成 Coding Agent。

### [`packages/agent/src/harness/agent-harness.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/harness/agent-harness.ts)

重点：通用 Harness、Agent Loop、Session、Tools、Active Tools、Queue Mode、Thinking、Compaction 与 Lifecycle。

### [`packages/agent/docs/agent-harness.md`](https://github.com/earendil-works/pi/blob/main/packages/agent/docs/agent-harness.md)

重点：Harness 当前行为、Save Point（保存点）、Abort、Compaction、Tree Navigation 与仍在推进的能力。

### `packages/agent` 中的 Durable Execution 设计资料

Telemetry Schema（遥测结构）、Operation Recovery（操作恢复）与 Harness V2 State Machine 等资料可以观察 Pi 的演进方向，但应标记为 Working Design（工作设计）或迁移资料，不能自动当作当前正式实现规范。

---

## 十五、写书 TODO

1. 增加“Session ≠ `messages[]`”：Session 是持久化工作历史。
2. 增加 Session Tree → Branch → Context Projection 的完整链。
3. 把 Compaction 定义为 Context Reconstruction Boundary，而不是删除旧消息。
4. 区分 `firstKeptEntryId` 与 `retainedTail` 两种兼容表达。
5. 增加 Resume = New Runtime + Old Stable History。
6. 分开 Session Recovery、Execution Recovery 与 External Effect Recovery。
7. 增加 Persistent Configuration 恢复后的 Revalidation。
8. 增加 RuntimeState ≠ Turn Snapshot。
9. 增加 Dynamic Configuration 的三级模型。
10. 增加 Visibility ≠ Applicability ≠ Durability。
11. 增加 Dynamic Tool Availability 作为 Capability Projection。
12. 增加 Extension Reload 的 Stale Context 与 Invalidation。
13. 修订 Harness 定义：职责边界不等于独立 Package。
14. 增加 Agent 四层模型：Core / Harness / Domain / Hard Boundary。
15. 为 Mini Runtime 明确 V1 Scope 与 Non-goals。
16. 把“确定性机制约束概率性决策”作为 Runtime 篇总结。

---

## 十六、写书素材

### 素材 1：恢复不是复活 Runtime

```text
Persistent Session
        ↓
State Reconstruction
        ↓
Current Environment Validation
        ↓
New Runtime
```

### 素材 2：Session 与 Context 是写模型和读模型

```text
Session Tree
→ 完整稳定历史

Context
→ 当前 Branch + Compaction + Projection
```

### 素材 3：Compaction 改变读取方式

```text
Old Entries 保留
        +
Compaction Boundary
        ↓
Summary + Recent Tail
```

### 素材 4：动态配置的关键是生效时间

```text
Mutation Time
≠ Effective Time
≠ Durable Time
```

### 素材 5：Tool 是双重边界

```text
Capability Projection
→ LLM 能提出什么

Execution Gate
→ 真实动作能否执行
```

### 素材 6：Agent Runtime 最终公式

```text
State + Loop + Context Projection + Capability Projection
+ Tool Execution + Event Protocol + Lifecycle Control
+ Persistence Boundary
```

### 素材 7：Agent 的核心矛盾

> Runtime 的难点不是只让 LLM 会调用 Tool，而是用确定性软件工程机制约束概率性的 LLM Decision Engine。

---

## 十七、下一节学习计划

Day07 / Part VI 至此全部完成：

```text
[x] 会话 1：VI-A + VI-B
[x] 会话 2：VI-C + VI-D
[x] 会话 3：VI-E + VI-F + VI-G
[x] 会话 4：VI-H + VI-I + VI-J
[x] 会话 5：VI-K + VI-L + VI-M
```

下一阶段进入：

```text
Part VII：Mini Agent Runtime Implementation
（Mini Agent Runtime 实现）
```

目标是：

```text
理论模型
   ↓
Pi 真实源码验证
   ↓
抽取设计原则
   ↓
Node.js + TypeScript
   ↓
mini-agent-runtime
```

第一阶段优先写出一个架构正确、可以真实运行并有测试保护的 Runtime，而不是一个功能很多的“小 Pi”。
