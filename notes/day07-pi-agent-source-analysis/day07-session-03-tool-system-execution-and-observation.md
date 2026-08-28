# Day07：Pi Agent 源码解剖·会话 3——Tool 系统、执行管线与 Observation

> 本文是《从零实现 Agent Runtime》Day07 / Part VI 的第三份正式学习笔记，覆盖 Part VI-E（Tool Definition / Registry）、Part VI-F（Tool Execution Pipeline）和 Part VI-G（Observation / Multi-Tool Flow）。
>
> 本会话沿着 `AgentTool[] → LLM ToolCall → Preflight → Execute → AgentToolResult → ToolResultMessage → 下一轮 LLM` 追踪 Pi 的完整 Tool Runtime，并把 Day05 的理论模块映射到真实源码职责。

---

## 一、本会话学习目标

本会话重点回答：

1. Pi 为什么没有独立的 `ToolRegistry` 类？
2. `AgentTool` 为什么不只是一个函数？
3. Tool Schema 如何从 Agent State 进入 LLM？
4. LLM 返回 Tool Call 后，Runtime 如何定位和验证 Tool？
5. `prepareArguments`、`beforeToolCall` 和 `afterToolCall` 分别位于哪个阶段？
6. Tool Error 为什么通常应转换为 Observation，而不是导致 Agent Crash？
7. `AgentToolResult`、`ToolResultMessage` 与 Observation 有什么区别？
8. Sequential / Parallel Tool Calls 如何调度？
9. 为什么 Parallel Execution 仍保留串行 Preflight 和确定性结果顺序？
10. Abort、`terminate` 与 Stop Policy 分别表达什么？
11. Tool Runtime 可以约束哪些边界，哪些责任仍属于 Tool Developer 和业务系统？

---

## 二、会话 3 总调用链

```text
AgentState.tools
      ↓ createContextSnapshot()
AgentContext.tools
      ↓ streamAssistantResponse()
LLM Context.tools
      ↓ Provider Adapter
LLM Tool Schema
      ↓
AssistantMessage(toolCall[])
      ↓
executeToolCalls()
      ↓
Preflight
├── Tool Lookup
├── prepareArguments
├── Schema Validation
├── beforeToolCall
└── Abort Check
      ↓
Execution Scheduler
├── Sequential
└── Parallel
      ↓
tool.execute()
      ↓
afterToolCall
      ↓
AgentToolResult
      ↓ createToolResultMessage()
ToolResultMessage / Observation
      ↓
currentContext.messages
      ↓
下一轮 LLM
```

这条链把 Day05 的抽象第一次完整对应到 Pi 源码：

```text
Tool Registry
→ Tool Schema
→ Tool Decision
→ Tool Executor
→ Permission Gate
→ Observation
→ Multi-Tool Loop
```

---

## 三、Part VI-E：Tool Definition 与 Registry

### 3.1 Tool Registry 是职责，不一定是类

Pi Core 没有要求存在：

```ts
class ToolRegistry {
  register() {}
  unregister() {}
  find() {}
  list() {}
}
```

当前可用 Tool Set 由数组承担：

```text
AgentState.tools
      ↓
AgentContext.tools
      ↓
LLM Context.tools
```

当 Tool 数量有限时，`AgentTool[] + find()` 已经足以承担 Registry 的核心职责：

- 维护当前可用能力集合。
- 把 Tool Schema 暴露给模型。
- 按 Tool Name 定位 Runtime Handler。

因此阅读源码时，真正要找的是：

```text
Responsibility
Boundary
Data Flow
Decision Point
```

而不是同名的文件或 Class。

### 3.2 `AgentTool` 是 Runtime Contract

Pi 的 Tool 同时面向 LLM、Runtime 和 UI：

```text
AgentTool
├── 给 LLM 的能力描述
│   ├── name
│   ├── description
│   └── parameters
│
├── 给 Runtime 的执行协议
│   ├── execute
│   ├── prepareArguments
│   └── executionMode
│
└── 给 UI 的信息
    └── label
```

可概括为：

```text
Tool
= LLM Ability Description
+ Input Contract
+ Runtime Handler
+ Lifecycle Semantics
+ Error Semantics
```

所以 Tool 不是普通 callback，而是实现 Runtime Tool Protocol 的能力模块。

### 3.3 Tool 如何进入 LLM

完整路径是：

```text
agent.state.tools
    ↓ createContextSnapshot()
AgentContext.tools
    ↓ LLM Context Assembly
Context.tools
    ↓ Provider Adapter
Provider-specific Tool Schema
    ↓
LLM
```

Pi Agent Core 只维护当前 Run 可见的 Tool Set，并把通用 Tool 定义交给下游模型层。具体 Provider 如何转换为 OpenAI、Anthropic 或其他模型的 Tool 格式，属于 `pi-ai` / Provider Adapter 的职责。

### 3.4 Tool Lookup

当 Assistant Message 包含 Tool Call，Runtime 使用 Tool Name 查找实现：

```ts
const tool = currentContext.tools?.find(
  candidate => candidate.name === toolCall.name,
);
```

没有找到时，Pi 不直接让 Runtime 崩溃，而是生成错误 Tool Result：

```text
Tool not found
    ↓
Error AgentToolResult
    ↓
ToolResultMessage(isError = true)
    ↓
LLM
```

“Tool 不存在”是模型下一步决策需要看到的执行事实，因此属于可回流的 Observation。

### 3.5 动态 Tool Set 的线索

`AgentToolResult` 中存在 `addedToolNames`：

```text
本次 Tool Result
    ↓
声明从当前 Transcript 节点开始新增的 Tool Names
```

这说明整体设计能够表达 Dynamic Tool Availability / Deferred Tool Loading，但 Pi Core 的 Tool Result 只携带语义标记；真正的 active Tool 管理、加载和恢复仍可能由 Harness / Session 层负责。

因此当前结论应保持克制：

```text
源码确认：Tool Result 可以携带 addedToolNames

架构推导：可用于动态 Tool 可用性

尚未确认：完整 Tool Loader / Session 恢复策略
```

---

## 四、Part VI-F：Tool Execution Pipeline

### 4.1 Executor 不只是 `await tool.execute()`

一个成熟 Tool Executor 的职责是：

```text
Find
Prepare
Validate
Authorize
Execute
Normalize
Observe
```

Pi 把主要阶段拆为：

```text
prepareToolCall()
      ↓
executePreparedToolCall()
      ↓
finalizeExecutedToolCall()
      ↓
createToolResultMessage()
```

这样可以把执行前 Policy、真正 IO 与执行后 Policy 分开。

### 4.2 `tool_execution_start` 先于实际执行

每个 Tool Call 开始处理时，Loop 先发出：

```text
tool_execution_start
```

上一会话已经确认：

```text
Loop emits tool_execution_start
    ↓
Agent.processEvents()
    ↓
pendingToolCalls.add(id)
```

因此 UI 可以在 Tool 真正完成前显示“正在读取文件”“正在查询订单”等状态。

这再次说明：

> Event 不只是日志，而是 Runtime Execution State 的协议。

### 4.3 `prepareToolCall()` 是 Preflight

Preflight 依次处理：

```text
1. Tool Lookup
2. prepareArguments
3. validateToolArguments
4. beforeToolCall
5. Abort Check
```

只有通过 Preflight 的调用才会变成 Prepared Tool Call 并进入真实执行。

### 4.4 `prepareArguments`：Schema Validation 前的兼容层

`prepareArguments` 位于验证之前：

```text
Raw Tool Arguments
    ↓ prepareArguments
Compatible Arguments
    ↓ validateToolArguments
Validated Args
```

典型用途是兼容旧 Session 中保存的历史 Tool Call。例如字段从 `file` 改成 `path`：

```ts
prepareArguments(args) {
  return {
    path: args.file,
  };
}
```

它更接近 Compatibility Adapter，而不是 Tool 的业务执行逻辑。

### 4.5 Runtime 必须再次验证 LLM Arguments

Schema 同时承担两种职责：

```text
给 LLM
→ Generation Guidance

给 Runtime
→ Execution Contract / Safety Boundary
```

完整链是：

```text
Tool Schema
    ↓
LLM 尽量生成正确参数
    ↓
Runtime validateToolArguments()
    ↓
通过后才能执行
```

LLM 看过 Schema，不代表参数天然可信。它和 Web 系统中的前端类型与服务端校验是同样的关系。

### 4.6 截断 Tool Call 的额外防护

当 Assistant Message 因输出 Token 限制以 `stopReason === "length"` 结束时，Pi 不执行其中的 Tool Calls，而是将它们转换为错误 Observation。

原因是流式 Tool Arguments 即使经过 JSON 修复后能够解析，也可能在语义上不完整：

```text
Parse Success
+ Schema Validation Success

不等于

Semantic Input Complete
```

对删除、退款、支付、Shell 或数据库写操作而言，这是关键安全边界。

### 4.7 `beforeToolCall`：Execution Gate

`beforeToolCall` 在参数验证后、真实执行前运行，可根据：

```text
assistantMessage
toolCall
validated args
current context
AbortSignal
```

返回：

```ts
{
  block: true,
  reason: "...",
  terminate?: true,
}
```

它可以承载：

- Permission Check。
- Safety Check。
- Business Rule。
- Quota / Rate Limit。
- Approval Decision。
- Audit Preflight。

但它只定义 Policy Boundary，不自动提供完整 Human Approval System。

### 4.8 Execution Gate 不等于 Human Approval

完整 Human Approval 至少还需要：

```text
发现高风险操作
    ↓
Suspend / Persist Pending State
    ↓
展示给 Human
    ↓
Approve / Reject
    ↓
Resume Runtime
```

所以：

```text
beforeToolCall
= Approval / Permission Hook

beforeToolCall
≠ 完整的 Suspend / Human Decision / Resume 系统
```

### 4.9 `executePreparedToolCall()`：真正的 Handler Boundary

通过 Preflight 后，Runtime 才调用：

```ts
tool.execute(
  toolCallId,
  validatedArgs,
  signal,
  onUpdate,
);
```

Runtime 不理解 Tool 的业务语义：

```text
read_file       → 文件系统
query_order     → 订单服务
refund_order    → 退款 API
query_database  → 数据库
```

它只负责统一的执行机制：

- 调用 Handler。
- 传递 AbortSignal。
- 接收 Partial Update。
- 捕获异常。
- 等待已触发的更新事件完成。
- 规范化结果。

### 4.10 Tool 也可以 Streaming

Tool 可以通过 `onUpdate(partialResult)` 产生：

```text
tool_execution_update
```

例如 Shell Tool 可以连续报告：

```text
Downloading...
Building...
Running tests...
```

因此 Runtime Streaming 不只是 LLM Token Streaming，而是：

```text
LLM Streaming
+ Tool Streaming
+ Lifecycle Events
+ Approval Events
+ State Updates
```

### 4.11 Tool Error 的规范化

Tool Developer 应在失败时抛出 Error。Runtime 捕获异常并生成：

```text
Error
    ↓ createErrorToolResult()
AgentToolResult
    ↓ isError = true
ToolResultMessage
    ↓
LLM
```

于是模型可以根据失败：

- 修正参数。
- 换 Tool。
- 调整计划。
- 告知用户限制。

这就是：

```text
Exception → Observation
```

而不是：

```text
Exception → Agent Runtime Crash
```

### 4.12 Recoverable Tool Error 与 Fatal Runtime Error

两类错误必须分开：

```text
Recoverable Tool Error
→ 某次行动失败
→ 转成 Observation
→ LLM 可以重新决策

Fatal Runtime Error
→ Loop / State / Provider 生命周期无法继续
→ Run Failure
```

Tool 不存在、参数错误、Permission Block、业务失败通常属于第一类；Runtime 内部状态损坏或无法维持执行协议才更接近第二类。

### 4.13 `afterToolCall`：Post Execution Policy

Tool 执行后、最终 Event 和 ToolResultMessage 产生前，会调用 `afterToolCall`。

它可以覆盖：

```text
content
details
usage
isError
terminate
```

典型用途包括：

- 结果脱敏。
- 审计标记。
- 标准化业务错误。
- 限制结果大小。
- 注入 `terminate`。
- 统一 Observation 格式。

如果 `afterToolCall` 自身抛错，Pi 会把该失败也规范化为 Error Tool Result。

---

## 五、Part VI-G：Result、Observation 与 Multi-Tool Flow

### 5.1 三个概念必须分开

```text
Raw Tool Result
= 业务 Handler 内部产生的原始结果

AgentToolResult
= Tool Executor Boundary 的结构化返回值

ToolResultMessage
= 可进入 Transcript 和 LLM Context 的协议消息

Observation
= Runtime 向模型暴露的执行事实语义
```

通常链路是：

```text
Raw Result
    ↓ normalize / finalize
AgentToolResult
    ↓ createToolResultMessage()
ToolResultMessage
    ↓
Observation seen by LLM
```

Observation 不只是一层文本清洗，而是把执行事实协议化为模型可消费、可关联具体 Tool Call 的消息。

### 5.2 `ToolResultMessage` 的关键字段

```text
role: toolResult
toolCallId
toolName
content
details
usage
addedToolNames
isError
timestamp
```

其中：

- `toolCallId` 把结果与 Assistant Tool Call 关联起来。
- `content` 是模型主要消费的文本 / 图片内容。
- `details` 为 UI、日志或上层 Runtime 保留结构化数据。
- `isError` 明确表示执行结果语义，不能只靠模型分析文本。
- `addedToolNames` 可以表达后续新增 Tool 可用性。

### 5.3 Tool Result 也进入 Message Lifecycle

Pi 对 ToolResultMessage 发出：

```text
message_start
message_end
```

因此它和 User / Assistant Message 一样，会通过：

```text
AgentEvent
    ↓
processEvents()
    ↓
_state.messages
```

进入正式 Transcript。

### 5.4 Observation 如何触发下一轮 LLM

```text
ToolResultMessage
    ↓
currentContext.messages.push(result)
newMessages.push(result)
    ↓
hasMoreToolCalls = true（除非 batch terminate）
    ↓
Inner Loop 继续
    ↓
streamAssistantResponse(currentContext)
    ↓
LLM 看到 Tool Observation
```

不是 Tool 主动调用 LLM，而是 Runtime Loop 在结果进入 Context 后决定继续。

这构成完整 ReAct Loop：

```text
Decision
→ Action
→ Observation
→ New Decision
```

### 5.5 Sequential Tool Execution

Sequential 模式按 Source Order 对每个 Tool Call 完成完整流水线：

```text
Tool A
→ Start
→ Preflight
→ Execute
→ Finalize
→ End
→ Result Message

Tool B
→ 同样流程
```

它适合：

- Tool 之间有顺序依赖。
- Tool 会修改共享状态。
- 外部副作用不可并发。
- 权限或额度决策需要严格顺序。

### 5.6 Parallel Tool Execution 的真实语义

Pi 的 Parallel 模式不是所有阶段并行，而是：

```text
Sequential Preflight
        ↓
Parallel Execution / Finalization
        ↓
Ordered ToolResultMessage Emission
```

具体表现为：

- 按 Assistant Source Order 发出 `tool_execution_start`。
- 按 Source Order 做 Lookup、Validation 与 `beforeToolCall`。
- 允许通过的 Tool Handler 并发执行。
- `tool_execution_end` 按真实完成顺序发出。
- 最终 ToolResultMessage 按 Assistant Source Order 写入 Transcript。

### 5.7 为什么 Policy 串行、IO 并行

Preflight 可能依赖：

```text
Permission
Quota
Rate Limit
Approval
Audit
Shared Policy State
```

如果这些决策同时运行，可能产生 race condition 或不确定行为。

昂贵 IO 则适合并发，以缩短总体时延。

可浓缩为：

> Policy 串行，IO 并行。

### 5.8 Execution Completion Order 不等于 Conversation Order

假设模型依次请求：

```text
1. query_order
2. query_user
3. query_coupon
```

完成顺序可能是：

```text
coupon → order → user
```

Pi 可以按这个顺序发 `tool_execution_end`，以反映真实状态；但最终 Transcript 仍保持：

```text
order result
user result
coupon result
```

原因是：

```text
Execution Completion Order
≠ Conversation Semantic Order
```

保持 Source Order 可以让下一轮模型输入和持久化结果确定、可复现。

### 5.9 Batch 级执行模式

执行模式可由全局配置控制，也可由单个 Tool 声明：

```text
config.toolExecution
tool.executionMode
```

Pi 使用保守规则：只要 Batch 中任意 Tool 要求 `sequential`，整个 Batch 就串行执行。

这避免了一个 Batch 内同时混合复杂的依赖、权限和副作用语义。

### 5.10 `terminate` 是 Batch Stop Hint

Tool、被阻止的 `beforeToolCall`，或 `afterToolCall` 都可以产生：

```text
terminate: true
```

当前源码的关键语义是：只有 Batch 中每个 finalized Tool Result 都声明 `terminate: true`，Batch 才会提前停止自动的下一轮 LLM Call；Mixed Batch 仍继续。

因此：

```text
terminate
= Tool-directed Stop Hint

terminate
≠ Tool 直接拥有 Loop Control
```

Loop 仍由 Runtime 根据整个 Batch 的结果统一决定。

---

## 六、Abort 与 Cooperative Cancellation

### 6.1 Abort 的传播链

```text
Agent owns AbortController
    ↓
AbortSignal
    ↓
runLoop
    ↓
beforeToolCall / tool.execute / afterToolCall
```

Runtime 可以发出取消信号，也可以在 Preflight 后检查 `signal.aborted`，阻止尚未开始的执行。

### 6.2 Abort 不能强制停止任意 Tool

`AbortSignal` 属于 Cooperative Cancellation：

```text
Runtime
→ 提供取消机制

Tool
→ 主动检查 signal
→ 或继续传给支持取消的 IO
```

如果 Tool 忽略 Signal 或底层 API 不支持取消，Runtime 无法保证它立即停止。

### 6.3 Tool Cancellation Contract

可靠 Tool 应：

- 在长循环和阶段边界检查 `signal.aborted`。
- 把 Signal 传给 `fetch`、数据库客户端或子进程封装。
- 在 Abort 后停止继续发送 `onUpdate`。
- 明确外部副作用是否已经发生。
- 为恢复和重试提供幂等机制。

### 6.4 Abort 后的副作用问题

取消 Runtime 不等于回滚业务副作用：

```text
Tool 已完成退款
    ↓
Runtime 随后 Abort
    ↓
Session Retry
    ↓
可能再次执行退款
```

因此高风险 Tool 必须由业务服务继续保证：

- Idempotency Key。
- 权限检查。
- 状态机约束。
- 事务一致性。
- Audit Log。

Agent Permission 不能替代业务系统安全。

---

## 七、Tool Contract 与工程治理

### 7.1 Runtime 只能看到 Tool Boundary

Runtime 只能观察：

```text
Promise resolve
Promise reject
AgentToolResult
onUpdate
```

如果 Tool 内部吞掉异常并伪装为成功：

```ts
try {
  await refund();
} catch {
  return successResult;
}
```

Runtime 通常无法知道真实失败。

### 7.2 Tool Authoring Guidelines

Tool Developer 应遵守：

- 失败时抛出异常或明确返回 Error Protocol。
- 不把失败文本包装成 `isError: false` 的成功结果。
- 返回符合 `AgentToolResult` 的结构。
- 响应 AbortSignal。
- 不绕过 Permission / Approval Boundary。
- 对外部副作用实现幂等。
- 对敏感错误信息做脱敏。
- 对大结果做限制、分页或摘要。
- 为关键 Tool 提供 Tests、Review 和 Audit。

### 7.3 Tool Error Classification 的分工

```text
Business Service
→ 定义业务错误与事务语义

Tool Adapter
→ 把服务错误映射为稳定 Tool Contract

Runtime
→ 把 Tool Boundary 的错误规范化为 Observation

LLM
→ 根据可见 Observation 重新决策
```

Runtime 不应依赖解析错误文本来猜测 `isError`，协议字段必须可信且一致。

---

## 八、Stop Condition 的统一模型

本会话后，停止不应再被理解为单个 `shouldStop()`：

```text
Semantic Stop
→ LLM 不再调用 Tool

Tool-directed Stop
→ Batch terminate

Policy Stop
→ shouldStopAfterTurn

Runtime Stop
→ Abort / Fatal Error
```

对照如下：

| 类型 | 来源 | 时机 | 是否完成当前 Tool Batch |
|-|-|-|-|
| Semantic Stop | LLM | 无 Tool Call | 不涉及 |
| Tool-directed Stop | Tool Result / Hook | Batch Finalize 后 | 是 |
| Policy Stop | Runtime Policy | Turn End 后 | 是 |
| Abort | 外部控制 | 任意运行阶段 | 尽力取消 |
| Fatal Error | Runtime | 无法继续时 | 不保证 |

---

## 九、与 Day05 的源码映射

| Day05 理论模块 | Pi 源码职责 |
|-|-|
| Tool Registry | `AgentState.tools` / `AgentContext.tools` |
| Tool Schema | `AgentTool.parameters` |
| Tool Decision | LLM 返回 `toolCall` |
| Tool Lookup | `tools.find()` |
| Argument Compatibility | `prepareArguments` |
| Schema Validation | `validateToolArguments()` |
| Permission / Approval Boundary | `beforeToolCall` |
| Tool Executor | `executePreparedToolCall()` |
| Post Policy | `afterToolCall` / `finalizeExecutedToolCall()` |
| Observation | `AgentToolResult → ToolResultMessage` |
| Multi-Tool Loop | Sequential / Parallel Scheduler |
| Tool Streaming | `onUpdate → tool_execution_update` |
| Runtime Feedback | Result Message 进入 `currentContext.messages` |
| Stop Signal | `terminate` / `shouldStopAfterTurn` / Abort |

这再次证明：理论模块描述的是职责边界，不要求源码中出现同名类。

---

## 十、本会话核心认知升级

### 10.1 Tool 是 Contract，不只是函数

Tool 同时定义能力描述、输入契约、执行 Handler、生命周期和错误语义。

### 10.2 Tool Registry 是职责，不一定是 Class

`AgentTool[] + name lookup` 足以承担轻量 Registry；真正的问题是“谁维护当前 Tool Set”。

### 10.3 LLM Arguments 永远是不可信输入

Schema 引导生成，Runtime Validation 保证执行边界；二者不能互相替代。

### 10.4 Tool Error 不等于 Agent Crash

可恢复执行错误应转成 Observation，让模型获得重新规划机会。

### 10.5 Tool Result 必须重新进入 Context

只有 `ToolResultMessage → currentContext.messages → LLM` 才能闭合 ReAct Loop。

### 10.6 Parallel Tool 不等于所有阶段并行

Pi 采用串行 Policy Preflight、并行 IO 和确定性 Transcript 顺序。

### 10.7 Abort 是协作式取消

Runtime 提供 Mechanism，Tool 必须遵守 Cancellation Contract。

### 10.8 Permission Hook 不等于完整 Human Approval

Hook 只提供执行门；Suspend、Persist、Human Decision 与 Resume 仍需更上层生命周期支持。

### 10.9 Tool Contract 决定 Ecosystem 可靠性

Core 能约束跨边界行为，但无法自动修复 Tool 内部吞异常、伪造成功或忽略 Abort 的实现。

### 10.10 Agent 是编排层，不是业务安全边界的终点

业务 Service 仍必须独立保证权限、幂等、事务和审计。

---

## 十一、工业级实现

一个更完整的 Tool Runtime 可以画成：

```text
                    LLM
                     │
                     ↓
                 ToolCall[]
                     │
                     ↓
               ┌─ Preflight ─┐
               │ Tool Lookup │
               │ Arg Prepare │
               │ Validation  │
               │ Permission  │
               │ Approval    │
               │ Abort Check │
               └──────┬──────┘
                      ↓
              Execution Scheduler
               ┌──────┴──────┐
               ↓             ↓
             Tool A         Tool B
               │             │
               └──────┬──────┘
                      ↓
                Raw Tool Result
                      ↓
                 Post Policy
                      ↓
              ToolResultMessage
                      ↓
                 Observation
                      ↓
                    LLM
```

工业级还应继续考虑：

```text
Timeout
Retry
Idempotency
Rate Limit
Concurrency Limit
Circuit Breaker
Audit Log
Permission
Human Approval
Sensitive Data Masking
Cancellation
Result Size Limit
Result Compression
Dynamic Tool Loading
Persistent Tool Execution
```

### 11.1 Mini Runtime 第一版建议

第一版先保留最核心机制：

```ts
interface RuntimeConfig {
  transformContext?: TransformContext;
  beforeToolCall?: BeforeToolCall;
  afterToolCall?: AfterToolCall;
  shouldStopAfterTurn?: ShouldStopAfterTurn;
}
```

Loop 保持：

```text
while true
  ↓
call LLM
  ↓
if no tool calls → break
  ↓
lookup + validate
  ↓
beforeToolCall
  ↓
execute
  ↓
afterToolCall + normalize
  ↓
append ToolResultMessage
  ↓
continue
```

之后再逐步增加：

```text
parallel tools
terminate
prepareNextTurn
steering
follow-up
dynamic tools
```

目标不是一次复制 Pi，而是先实现能够完全解释和验证的 Mini Runtime。

---

## 十二、知识地图

```text
Agent Tool System
│
├── Tool Definition
│   ├── name
│   ├── description
│   ├── parameters
│   ├── label
│   ├── execute
│   ├── prepareArguments
│   └── executionMode
│
├── Tool Registry
│   └── AgentContext.tools
│
├── Tool Decision
│   └── LLM ToolCall[]
│
├── Preflight
│   ├── Lookup
│   ├── Compatibility
│   ├── Schema Validation
│   ├── Permission Policy
│   └── Abort Check
│
├── Tool Executor
│   ├── Sequential
│   ├── Parallel
│   └── Streaming Update
│
├── Post Execution
│   └── afterToolCall
│
├── Observation
│   ├── AgentToolResult
│   └── ToolResultMessage
│
├── Error Boundary
│   ├── Tool Error → Observation
│   └── Runtime Fatal → Run Failure
│
├── Cancellation
│   └── Cooperative Cancellation
│
├── Stop
│   ├── no tool call
│   ├── terminate
│   ├── shouldStopAfterTurn
│   └── abort / error
│
└── Advanced
    ├── Dynamic Tool Availability
    ├── Deferred Tool Loading
    └── Persistent Tool Execution
```

---

## 十三、面试视角

### Q1：Agent Tool 为什么不能只是一个普通函数？

因为它同时承担模型能力描述、输入 Schema、Runtime 执行、错误协议和生命周期语义。LLM 需要知道如何调用，Runtime 需要知道如何验证、调度和观察。

### Q2：为什么 Tool Schema 给了 LLM 后，Runtime 还要校验？

LLM 输出不是可信输入。Schema 对模型承担 Generation Guidance，对 Runtime 承担 Execution Safety，两者职责不同。

### Q3：为什么 Tool Error 通常不应直接终止 Agent？

Tool Failure 本身是环境 Observation。模型可以修正参数、换 Tool 或重新规划；只有 Runtime 无法维持执行协议时才应让整个 Run 失败。

### Q4：Parallel Tool Calling 有哪些工程风险？

共享状态竞争、Quota Race、权限判断冲突、Abort 协调、完成顺序不确定、副作用冲突和 Transcript 顺序。稳健方案之一是 Sequential Preflight、Parallel Execution、Ordered Results。

### Q5：AbortController 能保证 Tool 立即终止吗？

不能。AbortSignal 是 Cooperative Cancellation；Tool 必须主动检查，或把 Signal 传给支持取消的底层 IO。

### Q6：`beforeToolCall` 是 Human Approval 吗？

不是。它是 Execution Gate / Policy Hook；完整 Human Approval 还需要 Suspend、Pending State、Human Decision 和 Resume。

### Q7：如果 Tool Developer 吞掉异常，Runtime 能识别吗？

通常不能。Runtime 只能观察 Tool Boundary 暴露的 resolve、reject、Result 和 Update，因此还需要 SDK Contract、类型、测试、Review 与 Audit。

### Q8：为什么 Tool Result Message 要按 Source Order 写入？

因为执行完成顺序不等于会话语义顺序。保持模型原始 Tool Call 顺序可以让 Context、持久化和重放结果更确定。

---

## 十四、本章思考题

1. Parallel Batch 中只有一个高风险 Tool 需要人工审批时，应等待审批后再执行全部 Tool，还是先执行低风险 Tool？
2. Tool 已产生外部副作用但 Runtime 随后 Abort，Session 恢复后如何防止重复执行？
3. Tool Business Error 是否都应暴露给 LLM？哪些字段必须脱敏？
4. Tool Result 返回几十 MB 数据时，应在 Tool、`afterToolCall`、Context Builder 还是 Provider Adapter 层裁剪？
5. `beforeToolCall` 依赖远程权限服务时，Preflight 是否仍应完全串行？
6. 如果 Tool 返回 `isError: false`，但 Content 写着“退款失败”，Runtime 应相信协议还是文本？
7. Tool Error 分类应由 Business Service、Tool Adapter 还是 Runtime 负责？
8. Dynamic Tool Loading 应修改 Agent State，还是只修改本次 Run Context？
9. Batch 中部分 Tool `terminate: true`、部分为普通结果时，下一轮 LLM 应看到什么？
10. 如果 Parallel Tool 共享外部额度，如何保持 Policy Determinism 又避免过度串行？

---

## 十五、前置问题回收

本会话已经回收：

### 15.1 Tool Registry 在 Pi 中在哪里？

```text
AgentState.tools → AgentContext.tools
```

不需要独立 `ToolRegistry` Class。

### 15.2 Tool 参数在哪里验证？

```text
prepareArguments
    ↓
validateToolArguments
    ↓
execute
```

### 15.3 Tool Permission Policy 在哪里？

```text
beforeToolCall
```

它是 Policy Boundary，不等于完整 Human Approval。

### 15.4 Tool Result 如何成为 Observation？

```text
Tool Execute
→ AgentToolResult
→ ToolResultMessage
→ Transcript / LLM Context
```

### 15.5 Multi-Tool 如何调度？

```text
Sequential
或
Sequential Preflight + Parallel Execute + Ordered Results
```

### 15.6 Tool Error 如何处理？

```text
Recoverable Tool Error
→ Observation → LLM

Fatal Runtime Error
→ Run Failure
```

### 15.7 Tool Developer 吞异常怎么办？

Runtime 无法检测 Tool 内部已吞掉并伪装为成功的异常，需要 Tool Contract、SDK 规范、Review、Tests 和 Audit。

继续延期：

```text
完整 Human Approval Suspend / Resume
→ 会话 4 / 更上层 Harness Lifecycle

Session 恢复后的副作用幂等
→ Part VI-K

Dynamic Tool Availability 完整实现
→ Harness / Session

Persistent Tool Execution
→ 后续持久化与恢复
```

---

## 十六、源码定位清单

### `packages/agent/src/types.ts`

重点：

```text
AgentTool
AgentToolResult
AgentToolCall
ToolExecutionMode
BeforeToolCallResult
AfterToolCallResult
AgentLoopConfig
beforeToolCall
afterToolCall
prepareArguments
executionMode
terminate
addedToolNames
```

架构映射：

```text
Tool Contract
Execution Policy Boundary
Result Protocol
Cancellation Contract
Stop Hint
```

### `packages/agent/src/agent-loop.ts`

重点：

```text
executeToolCalls()
executeToolCallsSequential()
executeToolCallsParallel()
prepareToolCall()
prepareToolCallArguments()
executePreparedToolCall()
finalizeExecutedToolCall()
shouldTerminateToolBatch()
createToolResultMessage()
emitToolResultMessage()
failToolCallsFromTruncatedMessage()
```

对应调用链：

```text
LLM ToolCall
→ Preflight
→ Execute
→ Finalize
→ ToolResultMessage
→ Context
→ LLM
```

以及：

```text
Sequential / Parallel Scheduling
Tool Error Normalization
Abort Propagation
Batch Termination
Deterministic Result Ordering
```

### `packages/agent/src/agent.ts`

重点：

```text
AbortController
abort()
createContextSnapshot()
createLoopConfig()
processEvents()
```

架构映射：

```text
Cancellation Ownership
Tool Policy Injection
State Ownership
Event → State Synchronization
```

### `packages/agent/README.md`

用于验证：

```text
Tool Definition
Tool execute contract
beforeToolCall
afterToolCall
Tool Execution Mode
Parallel Execution Semantics
terminate Batch Rule
```

README 用于理解设计意图，源码用于确认真实实现。

---

## 十七、写书 TODO

1. 增加完整 Tool Execution Pipeline：Lookup、Prepare、Validate、Authorize、Execute、Postprocess、Observation。
2. 单独解释 Tool Error 与 Runtime Error。
3. 对比 Raw Result、`AgentToolResult`、`ToolResultMessage` 与 Observation。
4. 增加 Parallel Tool 模型：Sequential Preflight + Parallel IO + Deterministic Result Ordering。
5. 增加 Cooperative Cancellation 与 Tool Cancellation Contract。
6. 把 Tool 描述为 Runtime Protocol，而不是普通函数。
7. 增加 Tool Authoring Guidelines、测试与治理要求。
8. 用“Policy 串行，IO 并行”解释并发 Runtime。
9. 增加截断 LLM Output 禁止执行不完整 Tool Call 的防护案例。
10. 把 Dynamic Tool Availability 作为高级扩展能力，不放入 Mini Runtime 第一版。

---

## 十八、写书素材

### 素材 1：Registry 是职责

> 架构中的 Registry 首先描述“谁维护和查找能力集合”，不代表源码必须存在一个 `ToolRegistry` 类。

### 素材 2：Executor 不只是函数调用

```text
Find → Prepare → Validate → Authorize → Execute → Normalize → Observe
```

### 素材 3：Tool Error 是 Observation

```text
参数错误 / Tool 不存在 / Permission Block / 业务失败
    ↓
Tool Error Observation
    ↓
LLM Re-plan
```

### 素材 4：Policy 串行，IO 并行

并发 Runtime 可以让决策保持确定，让昂贵执行保持高吞吐。

### 素材 5：Tool Boundary 决定可观测性

> Runtime 只能治理跨 Tool Boundary 暴露出来的行为；Tool 内部正确性仍需要 Contract、Tests、Review 和 Audit。

---

## 十九、下一节学习计划

### Day07 / 会话 4：Part VI-H + VI-I + VI-J

下一会话将进入 Tool 系统之后的更高层 Runtime 问题：

```text
一次 Run 如何被外部干预？
Abort、Steering、Follow-up 有什么差异？
Streaming Event 如何贯穿 LLM、Tool、State 与 UI？
Tool Permission / Human Approval
究竟属于 Core Mechanism、Harness，还是 Domain Policy？
```

学习继续沿用：

```text
架构问题
    ↓
官方源码定位
    ↓
调用链验证
    ↓
映射 Day01～Day06
    ↓
抽取 mini-agent-runtime 设计
```

从下一会话开始，源码内容可按重要度标记：

```text
🟥 必须掌握
🟨 理解即可
⬜ 知道存在即可
```

目标是理解职责和边界，而不是背诵实现细节。
