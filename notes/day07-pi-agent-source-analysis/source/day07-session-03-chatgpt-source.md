# Day07：Pi Agent 源码解剖·会话 3 ChatGPT 源记录

- 会话链接：https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c-agent-xue-xi/c/6a904120-97d4-83ee-91f2-aa94b041aecc
- 会话标题：开启下一会话学习
- 提取日期：2026-08-28
- 覆盖范围：Part VI-E（Tool Definition / Registry）、Part VI-F（Tool Execution Pipeline）与 Part VI-G（Observation / Multi-Tool Flow）
- 整理说明：本文件保留对话中的有效学习主线、关键源码结论、讨论修正和固定收尾，不逐字复制重复问答、页面 UI 与引用控件。正式学习笔记见 `../day07-session-03-tool-system-execution-and-observation.md`。

---

## 会话主线

会话从上一节的输入链继续追踪：

```text
_state
→ AgentContext
→ LLM Context
→ LLM ToolCall
→ Tool Lookup / Validation / Execution
→ AgentToolResult
→ ToolResultMessage
→ currentContext.messages
→ 下一轮 LLM
```

它对应 Day05 的：

```text
Tool Registry
→ Tool Schema
→ Tool Executor
→ Permission
→ Observation
→ Multi-Tool Loop
```

---

## Part VI-E：Tool Definition / Registry

### Tool Registry

Pi 没有独立 `ToolRegistry` 类。当前可用 Tool Set 由：

```text
AgentState.tools
→ AgentContext.tools
→ LLM Context.tools
```

承担 Registry 职责，运行时使用 `tools.find(tool.name)` 完成查找。

会话结论：架构模块描述职责，不要求源码中出现同名 Class。

### AgentTool

```text
AgentTool
= name / description / parameters
+ label
+ prepareArguments
+ execute
+ executionMode
```

因此 Tool 是能力描述、输入契约、Runtime Handler、生命周期和错误语义的组合，不只是函数。

### Dynamic Tool

`AgentToolResult.addedToolNames` 表明 Transcript 可以记录从某个结果开始新增的 Tool Names。完整的加载、active set 管理和恢复属于更上层 Harness / Session 问题。

---

## Part VI-F：Tool Execution Pipeline

会话形成的核心调用链：

```text
ToolCall
→ tool_execution_start
→ prepareToolCall()
   ├── Tool Lookup
   ├── prepareArguments
   ├── validateToolArguments
   ├── beforeToolCall
   └── Abort Check
→ executePreparedToolCall()
   ├── tool.execute
   ├── onUpdate
   └── catch error
→ finalizeExecutedToolCall()
   └── afterToolCall
→ tool_execution_end
→ createToolResultMessage()
→ message_start / message_end
```

### `prepareArguments`

它位于 Schema Validation 之前，主要承担旧 Tool 参数到当前 Schema 的兼容转换。

### `validateToolArguments`

Schema 对 LLM 是 Generation Guidance，对 Runtime 是 Execution Contract。LLM 看过 Schema 不代表参数可信，Runtime 必须再次校验。

### 截断输出保护

当 Assistant Message 因长度限制结束时，Pi 不执行其中可能被截断的 Tool Calls，而是生成错误 Observation。

### `beforeToolCall`

它是参数验证后的 Execution Gate，可以做 Permission、Safety、Quota、Business Rule 或 Approval Decision，并可以 Block Tool。

它不是完整 Human Approval；Suspend、Persist、Human Decision 与 Resume 仍需更上层机制。

### Tool Execution / Streaming

`tool.execute()` 接收 Tool Call ID、已校验参数、AbortSignal 与 `onUpdate`。Tool 可以通过 `tool_execution_update` 流式报告进度。

### Error Boundary

Tool 抛出的异常会被 Runtime 转为 Error Tool Result，再作为 Observation 回流 LLM：

```text
Tool Error
→ Observation
→ LLM Re-plan
```

这与 Runtime 自身不可恢复错误导致的 Run Failure 不同。

### `afterToolCall`

它位于执行完成后、最终 Tool Event 和 Result Message 产生前，可做审计、脱敏、Normalize、错误覆盖和 `terminate` 注入。

---

## Part VI-G：Observation / Multi-Tool

### Result 层次

```text
Raw Tool Result
→ AgentToolResult
→ ToolResultMessage
→ Observation
```

`AgentToolResult` 是 Executor Boundary 的返回值；`ToolResultMessage` 是可进入 Transcript 与 LLM Context 的协议消息；Observation 是模型看到的执行事实语义。

### ReAct 回流

```text
ToolResultMessage
→ currentContext.messages
→ Inner Loop 继续
→ streamAssistantResponse()
→ LLM 看到结果
```

Tool 不负责再次调用模型，Runtime 拥有 Loop Control。

### Sequential / Parallel

Pi 支持全局和 Per-Tool Execution Mode。任意 Tool 要求 sequential 时，整个 Batch 串行。

Parallel 模式的语义是：

```text
Sequential Preflight
+ Parallel Handler Execution
+ tool_execution_end 按完成顺序
+ ToolResultMessage 按 Assistant Source Order
```

会话将其概括为：

> Policy 串行，IO 并行。

### `terminate`

Tool、被阻止的 `beforeToolCall` 或 `afterToolCall` 可以返回 `terminate: true`。当前源码只有在 Batch 中全部 finalized results 都要求 terminate 时才提前停止自动的下一轮 LLM 调用。

### Abort

AbortSignal 是 Cooperative Cancellation。Runtime 提供 Signal，Tool 必须主动响应或传递给底层 IO；Runtime 不能强制回滚已发生的外部副作用。

---

## 工程边界

### Tool Contract

Runtime 只能观察 Tool Boundary 暴露的 Promise、Result 与 Update。如果 Tool Developer 吞异常、伪造成功或忽略 Abort，Core 通常无法检测。

因此需要：

```text
SDK Contract
+ Schema
+ Result Protocol
+ Tests
+ Review
+ Audit
```

### Business Service

Agent Permission 不能替代业务系统自身的：

```text
Authorization
Idempotency
State Validation
Transaction
Audit
```

Agent 仍是业务能力之上的编排层。

---

## 本会话核心结论

```text
1. Tool 是 Runtime Contract，不只是函数。
2. Tool Registry 是职责，不一定是 Class。
3. LLM Tool Arguments 必须再次验证。
4. Tool Error 通常应转成 Observation。
5. Tool Result 必须回到 Context 才能闭合 ReAct。
6. Parallel Tool 不等于所有阶段都并行。
7. Abort 是 Cooperative Cancellation。
8. Permission Hook 不等于完整 Human Approval。
9. Runtime 能约束 Tool Boundary，无法替 Tool Developer 保证内部正确。
10. Agent 权限不能替代 Business Service 的安全与事务。
```

---

## 前置问题回收

- Tool Registry → `AgentState.tools → AgentContext.tools`。
- Tool 参数验证 → `prepareArguments → validateToolArguments → execute`。
- Permission Policy → `beforeToolCall`。
- Observation → `AgentToolResult → ToolResultMessage`。
- Multi-Tool → Sequential 或 Sequential Preflight + Parallel Execute + Ordered Results。
- Tool Error → Recoverable Observation；Runtime Fatal Error → Run Failure。

继续延期：

- 完整 Human Approval Suspend / Resume → 会话 4 / Harness Lifecycle。
- Session 恢复后的副作用幂等 → Part VI-K。
- Dynamic Tool Availability 完整实现 → Harness / Session。
- Persistent Tool Execution → 后续持久化与恢复。

---

## 源码定位

```text
packages/agent/src/types.ts
→ AgentTool / AgentToolResult / ToolExecutionMode
→ beforeToolCall / afterToolCall / prepareArguments
→ executionMode / terminate / addedToolNames

packages/agent/src/agent-loop.ts
→ executeToolCalls
→ executeToolCallsSequential / Parallel
→ prepareToolCall / executePreparedToolCall
→ finalizeExecutedToolCall
→ createToolResultMessage
→ shouldTerminateToolBatch
→ failToolCallsFromTruncatedMessage

packages/agent/src/agent.ts
→ AbortController / createLoopConfig / processEvents

packages/agent/README.md
→ Tool Contract、Execution Modes、Hooks 与 Batch Termination 语义
```

## 核对资料

- Pi Agent Types：https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts
- Pi Agent Loop：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent-loop.ts
- Pi Agent：https://github.com/earendil-works/pi/blob/main/packages/agent/src/agent.ts
- Pi Agent README：https://github.com/earendil-works/pi/blob/main/packages/agent/README.md

---

## 下一会话

Day07 会话 4：Part VI-H + VI-I + VI-J，继续学习：

```text
Abort / Steering / Follow-up
Streaming Event
Permission / Human Approval
Core、Harness 与 Domain Policy 的边界
```
