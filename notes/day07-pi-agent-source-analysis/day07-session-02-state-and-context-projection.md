# Day07：Pi Agent 源码解剖·会话 2——State 与 Context / Message Projection

> 本文是《从零实现 Agent Runtime》Day07 / Part VI 的第二份正式学习笔记，覆盖 Part VI-C（Pi Agent State）和 Part VI-D（Context Builder / Message Projection）。
>
> 本会话沿着 `_state → AgentContext → transformContext → convertToLlm → LLM Context` 追踪数据如何从 Agent 的内部状态进入模型，并分析 Runtime Event 如何反向同步 State。

---

## 一、本会话学习目标

本会话重点回答：

1. `AgentState` 保存什么，谁拥有它？
2. `AgentState` 与 `AgentContext` 为什么不能混为一谈？
3. Loop 为什么接收 Context Snapshot，而不是直接持有整个 Agent？
4. Loop 产生的消息如何回到 Agent State？
5. `currentContext.messages`、`newMessages` 与 `_state.messages` 有什么区别？
6. `transformContext` 与 `convertToLlm` 分别负责什么？
7. Pi Core 是否已经实现了完整的 Context Builder？
8. Runtime Mechanism 与 Policy 应该如何分层？
9. 这些设计如何指导后续的 `mini-agent-runtime` 与客服 Agent？

---

## 二、Part VI-C：Pi Agent State

### 2.1 `AgentState` 的两类内容

Pi 的公开 State 可以按语义分为两组：

```text
AgentState
├── 持续配置与会话状态
│   ├── systemPrompt
│   ├── model
│   ├── thinkingLevel
│   ├── tools
│   └── messages
│
└── 当前运行的临时状态
    ├── isStreaming
    ├── streamingMessage
    ├── pendingToolCalls
    └── errorMessage
```

第一组描述 Agent 当前采用的配置和已形成的 Transcript；第二组描述一次 Run 正在发生什么。

这里需要保留一个边界：

> Pi 的 `AgentState` 是内存中的 Agent 运行状态，不等于可跨进程恢复的持久化 Session。

Session、Harness、Compaction 与持久化属于更上层的问题，留到 Part VI-K 继续分析。

### 2.2 谁拥有 State

源码层面的答案很明确：

```text
Agent owns State.
```

`Agent` 内部持有 `_state`；低层 Loop 并不是 State Owner。整体关系是：

```text
Agent
  │ owns
  ↓
AgentState
  │ snapshot / projection
  ↓
AgentContext
  │
  ↓
Runtime Loop
```

这验证了 Day03 的状态所有权原则：状态应由职责明确的组件拥有，执行引擎不应通过拿到整个对象而任意修改所有字段。

### 2.3 `AgentContext` 是一次 Run 的上下文快照

`AgentContext` 的核心字段比 `AgentState` 少得多：

```ts
interface AgentContext {
  systemPrompt: string;
  messages: AgentMessage[];
  tools?: AgentTool<any>[];
}
```

它不包含：

```text
model
thinkingLevel
isStreaming
streamingMessage
pendingToolCalls
errorMessage
```

因此二者的语义是：

```text
AgentState
= Agent 当前持有的完整内存状态

AgentContext
= 低层 Loop 在本次 Run 中需要使用的工作上下文
```

`AgentContext` 可以类比为：

```text
Store
  ↓ selector / projection
View Model
```

但它不是只读 View；进入 Loop 后，副本会作为本次运行的 mutable working context 使用。

### 2.4 为什么不把 `_state` 直接交给 Loop

Pi 通过类似下面的函数建立边界：

```ts
private createContextSnapshot(): AgentContext {
  return {
    systemPrompt: this._state.systemPrompt,
    messages: this._state.messages.slice(),
    tools: this._state.tools.slice(),
  };
}
```

这个设计至少有三层意义。

第一，限制 Loop 的能力范围。Loop 只拿到执行需要的字段，不能顺手修改 model、thinking level 或运行状态。

第二，避免共享顶层数组。`messages.slice()` 和 `tools.slice()` 让 Context 使用新的数组；Loop 对数组进行 `push()` 时，不会直接修改 `_state` 中的顶层数组。

第三，为一次 Run 创建独立工作区：

```text
Run 开始前：
_state.messages       = A B C

创建快照：
context.messages      = A B C

Run 执行中：
context.messages      = A B C D E F G
```

这里是浅复制，不是深复制。它表达的重点是隔离数组容器与限制写入路径，而不是复制每个 Message 对象。

---

## 三、Event 驱动的 State 同步

### 3.1 Loop 不直接拥有 `_state`

一次运行同时存在两条方向相反的数据链：

```text
正向：
AgentState
    ↓ createContextSnapshot()
AgentContext
    ↓
Runtime Loop

反向：
Runtime Loop
    ↓ emit AgentEvent
Agent.processEvents()
    ↓ reduce
AgentState
```

Pi 没有让 Loop 随意修改 Agent，而是让 Loop 报告执行事实，再由 Agent 把事件归约为状态变化。

### 3.2 `processEvents()` 类似 Reducer

核心生命周期可以抽象为：

```text
message_start
    ↓
streamingMessage = partial

message_update
    ↓
streamingMessage = latest partial

message_end
    ↓
streamingMessage = undefined
messages.push(final message)
```

Tool 生命周期同样进入 State：

```text
tool_execution_start
    ↓
pendingToolCalls.add(id)

tool_execution_end
    ↓
pendingToolCalls.delete(id)
```

所以 `processEvents()` 的角色可以理解为：

```text
AgentEvent → State Transition
```

这与 Redux 的 reducer 思路相近，但 Pi 并没有要求使用纯函数式 reducer。

### 3.3 State 所有权的三个问题

```text
Who owns State?
→ Agent

Who decides State?
→ LLM / Tool 决定部分语义数据；Runtime Lifecycle 决定状态迁移时机和规则

Who changes State?
→ 源码中主要由 Agent.processEvents() 执行实际 mutation
```

更精确地说：

```text
LLM / Tool
决定“产生了什么语义结果”

Runtime / Agent
决定“结果何时、以什么生命周期规则进入 State”
```

### 3.4 先更新内部状态，再通知 Subscriber

Pi 的事件机制同时服务两个方向：

```text
Loop → Agent State synchronization
Loop → UI / logger / external observer
```

`processEvents()` 先使内部 State 与事件一致，再等待外部 listener。由此建立一个重要保证：Subscriber 收到某个事件时，读取到的 Agent State 已经与该事件一致。

### 3.5 `isStreaming` 更接近 `isRunning`

Pi 的 `isStreaming` 不只表示“LLM 正在输出 token”。它会覆盖整个 Agent Run，直到 `agent_end` 及其被等待的 listener 完成，最终由生命周期清理逻辑重置。

因此其语义更接近：

```text
isStreaming ≈ isRunning
```

在自己的 Runtime 中可以考虑使用更明确的状态：

```ts
type RunStatus = "idle" | "running" | "aborting";
```

### 3.6 Finalized Transcript 与 Working State

Streaming 期间的 partial message 不应每次都追加到正式 Transcript：

```text
messages
= 已完成、可提交的 Transcript

streamingMessage
= 当前仍在变化的临时结果
```

这对应：

```text
committed state
vs
working state
```

`pendingToolCalls` 也属于执行期临时状态，而不是 Conversation Transcript。

---

## 四、三个消息集合不能混淆

一次 Run 中至少要区分：

```text
_state.messages
= Agent 持有的完整、已同步 Transcript

currentContext.messages
= 本次 Loop 使用的完整工作上下文

newMessages
= 当前 loop invocation 产生并返回的增量
```

例如运行前已有：

```text
A B C
```

本次产生：

```text
D(user)
E(assistant toolCall)
F(toolResult)
G(assistant)
```

最终可能得到：

```text
currentContext.messages = A B C D E F G
_state.messages         = A B C D E F G
newMessages             =       D E F G
```

虽然前两个最终内容相同，但它们的所有权和更新机制不同；`newMessages` 则是 Run Result / Delta，不是 State Store。

这三个概念的分离会直接影响：

- State 回写。
- Event Stream。
- 增量持久化。
- Retry / Continue。
- 外部调用者获得本次运行结果的方式。

---

## 五、Part VI-D：Context / Message Projection

### 5.1 完整数据链

本会话最终确认了至少四层数据：

```text
1. AgentState
      ↓ createContextSnapshot()
2. AgentContext
      ↓ transformContext（可选）
3. transformed AgentMessage[]
      ↓ convertToLlm
4. LLM-compatible Message[]
      ↓ assemble
5. LLM Context { systemPrompt, messages, tools }
      ↓
   Provider / Model
```

因此：

```text
State ≠ AgentContext ≠ transformed messages ≠ LLM Context
```

### 5.2 `AgentMessage` 比 LLM Message 更宽

Runtime / Domain Agent 可能需要保存模型并不认识的消息，例如 UI 状态、业务事件、摘要节点或自定义领域消息。

所以可将关系理解为：

```text
AgentMessage
= Runtime / Application 世界的消息

Message
= LLM Provider 能消费的消息
```

并非所有 Agent Message 都必须进入模型；有些应被过滤，有些需要转换成模型能够理解的 user / assistant / toolResult 消息。

### 5.3 `transformContext`：AgentMessage 层的策略 hook

`transformContext` 的形态是：

```text
AgentMessage[] → AgentMessage[]
```

它位于每次 LLM 调用前，可用于：

- 裁剪旧消息。
- 根据 Token Budget 触发压缩。
- 注入 RAG、Memory 或领域上下文。
- 调整哪些历史信息在本次模型调用中可见。
- 保留原始 Agent Message 类型体系中的业务语义。

要点是：

> `transformContext` 不直接格式化整个 Agent State；它处理的是从 State 投影出来、当前 Loop 正在使用的消息上下文。

它是可选 hook。Pi Core 提供调用时机，却不会自动替用户决定裁剪阈值、压缩算法、Memory 召回规则或信息优先级。

### 5.4 `convertToLlm`：消息转换边界

`convertToLlm` 的形态是：

```text
AgentMessage[] → Message[]
```

它负责：

- 过滤 LLM 不应看到的自定义消息。
- 把需要保留的自定义消息映射为 LLM 支持的角色和内容。
- 在 Runtime Message Model 与 LLM Message Model 之间建立边界。

Pi 的默认实现很轻量：只保留 `user`、`assistant` 与 `toolResult`。复杂自定义转换由上层注入。

因此两者的侧重点是：

```text
transformContext
偏策略：本次给模型哪些信息

convertToLlm
偏适配：这些信息如何变成模型可消费的消息
```

### 5.5 它们不是 Loop 中的固定业务实现

这两个能力首先作为配置 / hook 存在：

```text
AgentOptions
    ↓ Agent 保存
createLoopConfig()
    ↓
AgentLoopConfig
    ↓
streamAssistantResponse()
```

其中：

```text
convertToLlm
→ 有轻量默认实现，也允许替换

transformContext
→ 默认可以不存在，调用方按需注入
```

二者都是高阶函数 / Callback Strategy：Runtime 固定“何时调用”，外部函数决定“具体怎么处理”。

### 5.6 System Prompt 与 Tools 的路径

`transformContext` 和 `convertToLlm` 处理的是 `messages`。Loop 最终会把处理后的消息与 Context 中的另外两个字段重新组装：

```ts
const llmContext = {
  systemPrompt: context.systemPrompt,
  messages: llmMessages,
  tools: context.tools,
};
```

因此不要把整个 LLM Context Pipeline 简化成“消息过滤函数”；最终请求还包含 System Prompt、Tools，以及后续 Provider 层的请求配置。

### 5.7 Pi Core 定义 Pipeline，不等于实现完整 Context Builder

本会话最重要的源码修正是：

```text
不准确：
Pi Core 已经实现了一套完整 Context Builder

更准确：
Pi Core 定义了 Context Pipeline，提供默认消息过滤，并暴露策略扩展点
```

真正的 Token 预算、压缩算法、持久化摘要、Memory 召回和领域上下文注入可以在上层实现。

---

## 六、Mechanism 与 Policy

### 6.1 理论模型中的 Policy，不一定由 Core 内置

之前学习 Runtime 理论时，曾识别出：

```text
State Policy
Context Policy
Tool Policy
Token Budget Policy
Stop Policy
Retry Policy
Approval Policy
Memory Policy
```

这些概念首先是在标记系统中的“决策点”，并不意味着一个轻量 Runtime 必须为每个决策点都内置完整 Policy Engine。

Pi 更接近：

```text
Runtime Core
负责 mechanism、生命周期与 hook 时机

上层调用者
通过 hook 注入具体 policy
```

### 6.2 三层策略结构

策略不应简单全部归为“业务代码”。更准确的分层是：

```text
1. Runtime Mechanism
   Loop / State ownership / Events / Lifecycle / Hooks / Abort

2. Reusable Runtime Policy
   Retry / Timeout / Token Budget / Rate Limit / Concurrency

3. Domain Policy
   Coding / Customer Service / Data Agent 的领域规则
```

Pi Core 尽量守住第一层，并向第二、三层开放组合点。

### 6.3 生命周期节点就是 Policy Boundary

可以把可扩展节点设计为：

```text
Before LLM Call
→ Context / Token Budget / Memory Policy

Before Tool Execute
→ Validation / Permission / Approval Policy

After Tool Execute
→ Observation / Retry Policy

Turn End
→ Stop / Compression / Checkpoint Policy

Run End
→ Persistence / Follow-up Policy
```

核心结论：

> Runtime 不一定实现所有策略，但应该在正确的生命周期节点提供策略插入点。

---

## 七、通用 Runtime 与客服 Agent 的边界

后续使用 Pi Core 组装客服 Agent 时，可以形成：

```text
packages/
├── agent/                  # 通用 Runtime Core
│   ├── loop
│   ├── state
│   ├── events
│   ├── tool execution
│   ├── context hooks
│   └── lifecycle
│
└── customer-service-agent/ # Domain Agent
    ├── prompts/
    ├── tools/
    ├── policies/
    ├── context/
    ├── workflows/
    └── adapters/
```

客服 Agent 负责：

- 订单、退款、转人工等 Tool 组合。
- 退款审批、敏感信息过滤等 Domain Policy。
- 客服历史裁剪与业务上下文注入。
- System Prompt 与 Workflow。
- 对订单、CRM、退款服务的 Adapter。

业务系统仍负责真正的数据库查询、退款事务、权限校验和数据一致性。完整分层是：

```text
Generic Runtime
      ↓
Domain Agent
      ↓
Business Services
```

Agent 是业务能力之上的智能编排层，不应取代业务系统。

---

## 八、本会话核心认知升级

### 8.1 Agent 是 State Owner，Loop 是执行引擎

Loop 使用投影后的 Context Snapshot 工作，通过 Event 报告事实；Agent 把事件 reduce 回自己的 State。

### 8.2 State、Context 与 LLM Context 至少是三层对象

```text
State
→ Execution Context
→ LLM Context
```

中间还存在 AgentMessage 层的 transform 与转换成 Provider Message 的边界。

### 8.3 Event 不只是 UI 通知

Event 同时承担 Loop 到 State 的同步协议，以及 Loop 到外部观察者的通知协议。

### 8.4 `newMessages` 是 Delta，不是 State

它描述当前 Loop Invocation 的返回增量；完整 Transcript 的所有权仍在 Agent State。

### 8.5 Pi 更像 Runtime Kernel，而不是 Agent Platform

它提供机制、边界、生命周期和 hook，不追求在 Core 中内置所有 Context、Memory、Token Budget 与业务策略。

### 8.6 理论是在识别决策点，源码是在选择实现边界

理论中的每种 Policy 不一定对应一个具体的 `XxxPolicyManager`。轻量框架可以只提供稳定 hook，由可复用 Policy 或 Domain Agent 完成策略。

---

## 九、对 `mini-agent-runtime` 的设计启发

### 9.1 分离 Durable-ish 与 Ephemeral State

```ts
interface AgentState {
  systemPrompt: string;
  messages: AgentMessage[];
  tools: Tool[];
  model: ModelConfig;

  runStatus: "idle" | "running" | "aborting";
  streamingMessage?: AgentMessage;
  pendingToolCalls: Set<string>;
}
```

后续持久化时只选择真正需要恢复的字段，不把所有运行期临时状态直接写入 Session。

### 9.2 使用投影建立最小权限边界

```ts
class Agent {
  private state: AgentState;

  createRunContext(): AgentContext {
    // 只返回 Loop 需要的字段
  }

  handleEvent(event: AgentEvent): void {
    // 统一维护状态迁移
  }
}
```

避免：

```ts
async function runLoop(agent: Agent) {
  // 任意读取和修改整个 agent
}
```

### 9.3 固定 Pipeline，开放 Policy Hook

第一版 Mini Runtime 不需要一次实现二十种复杂 Policy，但应先设计正确的 hook：

```ts
transformContext?
convertToLlm
beforeToolExecute?
afterToolExecute?
shouldStopAfterTurn?
```

### 9.4 明确转换函数的契约

Context / Message hook 位于主执行链上；如果抛错，会破坏正常事件序列。因此实现时应明确：

- 输入输出类型。
- 是否允许 mutation。
- AbortSignal 语义。
- 失败时的安全回退值。
- 是否每次 LLM Call 都执行。

---

## 十、与 Day01～Day06 的连接

| 已学内容 | 本会话的 Pi 源码映射 |
|-|-|
| Day03 State Ownership | `Agent` owns `_state` |
| Day04 State Projection | `createContextSnapshot()` |
| Day04 Runtime State Lifecycle | `processEvents()` 与运行期字段 |
| Day04 Context Builder | `transformContext` hook |
| Day04 Provider Adapter | `convertToLlm` 后再进入 Provider 边界 |
| Day04 Context Window Management | 通过 `transformContext` 接入 pruning / compaction policy |
| Day06 Memory × Context | Memory 召回结果可在 Context Policy 中注入 |

本会话对之前理论的修正是：理论模型帮助识别职责和决策点；实际 Runtime 可以选择只定义 pipeline 与 hook，而把具体策略留给上层。

---

## 十一、工业级实现

一个更完整的 Runtime 数据环可以表达为：

```text
               snapshot / projection
AgentState ───────────────────────────→ AgentContext
   ↑                                      │
   │                                      │ transformContext
   │                                      ↓
   │                              AgentMessage[]
   │                                      │ convertToLlm
   │                                      ↓
processEvents                         Message[]
   │                                      │
   │                                      ↓
   └──────────── AgentEvent ◀──────── Runtime Loop / LLM
```

工业实现需要继续补齐：

- Hook 异常与安全回退。
- Token 估算与 Context Budget。
- Compaction 结果是否写回 Session。
- Event 顺序与幂等性。
- Retry 后如何避免重复提交消息。
- Abort 时 partial message 和 pending tool state 如何收尾。
- Session 恢复时哪些字段重建，哪些字段丢弃。

---

## 十二、知识地图

```text
Agent
├── owns AgentState
│   ├── durable-ish configuration / transcript
│   └── ephemeral runtime status
│
├── projects AgentContext
│   ├── systemPrompt
│   ├── messages
│   └── tools
│
├── injects Loop Config
│   ├── transformContext
│   └── convertToLlm
│
└── reduces AgentEvent
    └── updates AgentState

Runtime Loop
├── works on currentContext
├── maintains newMessages delta
├── calls Context Pipeline before each LLM call
└── emits lifecycle events
```

---

## 十三、面试视角

### Q1：为什么 Agent State 不能直接作为 LLM Context？

Agent State 包含模型不需要或不应看到的运行字段和应用消息。Runtime 应先投影出本次运行需要的 AgentContext，再通过 Context Policy 与消息转换构造 LLM-compatible Context，以控制信息暴露、Token Budget 和 Provider 兼容性。

### Q2：Event System 在 Agent Runtime 中有什么作用？

它不只是 UI Streaming 通知，还可以作为执行引擎与 State Owner 之间的同步协议。Loop 发出执行事实，Agent 根据事件更新 streaming message、final transcript、pending tools 与 error state，再通知外部观察者。

### Q3：`transformContext` 与 `convertToLlm` 有什么区别？

`transformContext` 在 AgentMessage 层决定本次给模型哪些上下文，偏策略；`convertToLlm` 把 AgentMessage 过滤或映射为模型支持的 Message，偏适配。二者都由 Runtime 控制调用时机，并允许上层注入实现。

### Q4：为什么说 Pi Core 没有实现完整 Context Builder？

Pi Core 定义了 `_state → AgentContext → transformContext → convertToLlm → LLM Context` 的 pipeline，并提供轻量默认转换，但裁剪、压缩、Memory 召回和 Token Budget 等具体策略主要由调用方通过 hook 实现。

### Q5：Mechanism 与 Policy 应如何区分？

Mechanism 定义系统能做什么、何时调用；Policy 决定具体如何做。Runtime Core 负责 Loop、State、Event、Lifecycle 与 hook；可复用 Runtime Policy 和 Domain Policy 在这些 hook 上组合。

---

## 十四、本章思考题

1. 如果 `transformContext` 返回的消息与原始 Transcript 不同，哪些结果应该只影响本次 LLM Call，哪些应该写回 Session？
2. 如果 Event Listener 执行很慢，是否应该阻塞 Agent Run settle？哪些 Listener 必须等待？
3. Context hook 失败时应该中止运行，还是退回原始消息？怎样保证不会泄露本应过滤的信息？
4. `AgentContext.messages` 使用浅复制后，Message 对象仍可能被共享；如何约束 mutation？
5. 客服 Agent 的敏感信息过滤应该放在 `transformContext`、`convertToLlm`，还是 Provider Adapter？为什么？
6. Token Budget Policy 是通用 Runtime Policy 还是 Domain Policy？哪些部分可以复用，哪些部分必须由领域决定？

---

## 十五、前置问题回收

本会话已经回收：

- State 谁拥有？→ `Agent`。
- Context 是否等于 State？→ 不等于，`AgentContext` 是一次 Run 的投影与工作上下文。
- Loop 结果如何回写 State？→ 主要通过 AgentEvent 与 `processEvents()`。
- Context Compression 放在哪里？→ `transformContext` 是 Core 暴露的入口之一。
- 自定义 Agent Message 如何进入 LLM？→ 通过 `convertToLlm` 过滤或转换。

继续延期：

- Compaction 是否持久化、Session 如何恢复 → Part VI-K。
- Tool Permission / Execution Policy 的具体 hook → Part VI-E～VI-G 与 VI-J。
- Provider-specific 消息转换的更底层细节 → 结合 `pi-ai` / Provider Adapter 再分析。

---

## 十六、源码定位清单

### `packages/agent/src/agent.ts`

重点：

```text
Agent._state
defaultConvertToLlm()
createContextSnapshot()
createLoopConfig()
runWithLifecycle()
processEvents()
convertToLlm
transformContext
```

架构映射：

```text
State Owner
State Projection
Hook Injection
Event → State Reduction
Run Lifecycle
```

### `packages/agent/src/types.ts`

重点：

```text
AgentState
AgentContext
AgentMessage
AgentLoopConfig
transformContext
convertToLlm
```

架构映射：

```text
Public State Contract
Execution Context Contract
Runtime Message Model
Context Policy Boundary
Message Conversion Boundary
```

### `packages/agent/src/agent-loop.ts`

重点：

```text
runAgentLoop()
runLoop()
streamAssistantResponse()
currentContext.messages
newMessages
```

核心链：

```text
context.messages
    ↓ transformContext
AgentMessage[]
    ↓ convertToLlm
Message[]
    ↓ assemble with systemPrompt / tools
LLM Context
    ↓ streamFunction
Provider
```

### `packages/agent/README.md`

用于确认：

```text
Agent State 公共语义
Context Transformation
Custom Message Conversion
Streaming / Event Lifecycle
```

README 用于理解设计意图，源码用于确认真实实现。

---

## 十七、写书 TODO

1. 用“State → Context → Events → State”完整解释 Runtime 的双向数据环。
2. 增加 `currentContext.messages`、`newMessages` 与 `_state.messages` 的对照图。
3. 补充 committed transcript 与 streaming working state 的区别。
4. 用 `transformContext` 与 `convertToLlm` 解释 Policy Hook 和 Adapter Hook。
5. 增加“理论 Policy Model 不等于框架内置 Policy Engine”的修正说明。
6. 用 Coding Agent、客服 Agent、Data Agent 对比 Domain Policy。

---

## 十八、写书素材

### 素材 1：State 与 Context 之间是投影关系

> Agent 持有完整 State，Loop 只拿到执行需要的 Context Snapshot；这是 State Ownership、Least Authority 与可测试性共同作用的结果。

### 素材 2：Event 是反向数据通道

```text
State → Context → Runtime
State ← Event   ← Runtime
```

Context 把运行所需信息送进 Loop，Event 把执行事实送回 State Owner。

### 素材 3：Pipeline 与 Policy 的区别

> Pi Core 定义 Context 处理流水线，但不替所有 Domain Agent 决定裁剪、压缩、召回和信息优先级。

### 素材 4：Runtime Kernel

Pi 的轻量来自边界选择：Core 提供 mechanism 和 hook，上层组合 reusable policy 与 domain policy。

---

## 十九、下一节学习计划

### Part VI-E / VI-F / VI-G：Tool 系统源码解剖

下一会话重点回答：

```text
Tool 如何注册并进入 LLM Context？
Tool Call 参数在哪里验证？
Tool Executor 的职责边界是什么？
Tool Result 如何构造成 Observation？
多个 Tool Calls 如何调度？
Sequential / Parallel 的执行策略如何表达？
Tool Event 如何进入 Agent State 与 UI？
```

这将把 Day05 的 Tool Registry、Schema、Executor、Observation 与 Multi-Tool Loop 映射到 Pi 的真实源码。
