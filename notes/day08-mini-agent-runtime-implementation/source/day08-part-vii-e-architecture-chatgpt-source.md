# Day 08 · Part VII-E Architecture Discussion — Full ChatGPT Source

> Source type: Full conversation transcript
> Conversation ID: `6aa8fe11-eadc-83e9-951d-26d3f4c62170`
> Conversation title: `Part VII-E`
> Scope: Architecture Analysis → E-1…E-5 → Design Decisions → Codex Implementation Task
> Retrieval: Codex `read_thread`, 10 turns, chronological reconstruction
> Note: Conversation text is preserved with trailing line whitespace normalized. Uploaded attachment binaries are not embedded; attachment markers and source references remain as returned.

## Turn 1

### User

我们继续 **Part VII：Mini Agent Runtime Implementation**。

上一阶段 **Part VII-D** 已完成。

我已经提供：

- Part VII 总体规划 / README；
- Part VII-D 最终 Milestone Note；
- 当前 Architecture Decisions（如果存在）。
  -


现在进入：

**Part VII-E：AgentEvent + Subscriber**

请先阅读上一阶段已经形成的真实实现、架构边界和设计决策。

后续必须基于现有实现做增量演进，不要重新设计已经确认完成的部分；如果发现前一阶段存在明确架构问题，可以提出，但请说明为什么需要调整。

继续采用固定工程学习流程：

**Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure**

现在先进入 **Architecture Analysis（架构分析）**。

请你先根据：

- 当前已有代码和架构决策；
- 本节标题与目标；
- 后续 Part 的整体规划；
  -


帮我识别本节真正需要解决的架构问题、实现边界、关键设计决策和完成标准，然后逐步带我讨论。

不要一开始直接实现代码，也不要提前实现后续 Part。

[User attached 4 files; file contents were not included]

### ChatGPT

可以。基于你上传的 **Part VII 总体规划、VII-D 最终 Milestone Note、上一轮完整架构讨论**，以及这次 `source-review(3).zip` 中的最新源码，我认为 VII-E 的起点很清楚。

VII-D 已经把 Runtime 的几条核心责任分开了：`RuntimeState` 保存事实，`ContextBuilder` 做每个 Model Turn（模型回合）的输入投影，`AgentRuntime` 继续拥有 Control Flow（控制流）和 State Mutation（状态修改），Provider / ToolExecutor 都没有越界。:chatgpt-content-reference{index="0"}

而总体规划对 VII-E 的定义也非常克制：**Runtime Event Model、Subscriber（订阅者）、向 UI 暴露内部执行过程、支持 Logger / Observability（可观测性）消费事件**。Streaming（流式输出）即便 v1 要做，也只能在这一节讨论，不能额外扩出新 Part。:chatgpt-content-reference{index="1"}

所以 VII-E 真正要解决的并不是“写一个 EventEmitter”，而是：

> **Runtime 已经会执行了，现在怎样让 Runtime 外部安全、稳定地观察执行过程，而不夺走 Runtime 的控制权。**

---

# 先定位 VII-E 在当前架构中的位置

现在真实代码里的 `AgentRuntime.run()` 大致是：

```text
run(userInput)
    ↓
写 user_input
    ↓
ContextBuilder.build()
    ↓
Provider.generate()
    ↓
写 model_output
    ↓
根据 finishReason 判断
    ↓
ToolExecutor.execute()
    ↓
写 tool_result
    ↓
下一 Model Turn
    ↓
RunOutcome
```

到 VII-D 为止，这些过程全部发生在 Runtime 内部。

外部目前只能看到两个东西：

```ts
await runtime.run(...)

runtime.getMessages()
```

换句话说：

```text
External App
    ↓
run()
    ↓
[这里发生很多事情，但外部不可见]
    ↓
RunOutcome
```

这对最小 Runtime 没问题。

但一旦上层要做：

- Chat UI 显示“正在调用模型”
- 显示“正在执行 add 工具”
- Logger 记录运行轨迹
- Debugger 观察每个 Turn
- Observability（可观测性）统计 Provider / Tool 行为

就不能等整个 `run()` 完成后再去猜发生过什么。

因此 VII-E 要增加的是一个 **Observation Channel（观察通道）**：

```text
                    ┌───────────────┐
                    │ AgentRuntime  │
                    └───────┬───────┘
                            │
                    Runtime execution
                            │
             ┌──────────────┴──────────────┐
             │                             │
             ▼                             ▼
       RuntimeState                    AgentEvent
        facts                          observations
             │                             │
             │                             ▼
             │                        Subscriber
             │                       /     |      \
             │                      UI   Logger   Debug
             │
             ▼
      source of truth
```

这里最重要的一点是：

> **Event（事件）不是新的 Runtime State。**

---

# 我认为 VII-E 有 6 个真正需要讨论的架构问题

这六个问题基本就是这一节的 Architecture Analysis（架构分析）主体。

---

## E-1：AgentEvent 到底是什么？

这是这一节最核心的问题。

最危险的理解是：

```text
RuntimeState
≈
Event Log
```

或者：

```text
所有内部操作
→ 全部发 Event
```

我认为都不对。

当前 `RuntimeState.messages` 是 Runtime Facts（运行事实）：

```text
user_input
model_output
tool_result
```

这些事实决定后续模型看到什么，也影响后续执行。

而 `AgentEvent` 更应该表示：

> **Runtime 执行过程中，对外有价值的“发生了什么”。**

例如概念上可能存在：

```text
run started
model turn started
model response received
tool execution started
tool execution completed
run completed
```

注意：

```text
tool_result
```

可能既是 Runtime Fact，又会对应一个 Event。

但是二者用途不同。

### State

回答：

> Runtime 以后继续执行时，需要记住什么？

### Event

回答：

> Runtime 外部现在需要知道发生了什么？

所以它们关系应该是：

```text
Runtime execution
   ├── writes State
   └── emits Event
```

而不是：

```text
Event
   ↓
rebuild RuntimeState
```

至少 VII-E v1 绝对不能走 Event Sourcing（事件溯源）方向。

否则会直接把 VII-G 的 Session / Recovery、甚至 Durable Execution 都提前引进来。

---

# E-2：应该发哪些 Event？

这个问题很容易失控。

如果把每一行内部逻辑都事件化，会得到：

```text
context_build_started
context_build_completed
provider_request_created
provider_request_sent
provider_response_received
message_converted
state_append_started
state_append_completed
tool_lookup_started
schema_validate_started
...
```

这不是 VII-E 需要的。

Event Model（事件模型）第一版应该围绕**有外部语义的生命周期节点**，而不是内部函数调用。

目前真实 Runtime 可以明显看出几个候选层级：

### Run Level（运行级）

```text
run started
run completed
run unsupported
run limit reached
```

### Model Turn Level（模型回合级）

```text
model turn started
model response received
```

### Tool Level（工具级）

```text
tool started
tool completed
```

这里我暂时故意不用最终 event type 名称。

因为我们后面必须判断：

> `model_response_received` 是否已经足够，还是应该直接发 `model_output`？

> `tool_completed` payload 应该包含原始 ToolResult，还是 Runtime `tool_result` message？

> `run_completed` 是否应该直接携带 `RunOutcome`？

这些还属于 Design Decision（设计决策），现在不应该抢先定死。

但我认为可以先形成一个原则：

> Event 必须描述 Runtime 的业务级执行事实，而不是暴露内部实现步骤。

这样未来即使：

```text
ContextBuilder
```

从 class 改成 function，或者 ToolExecutor 内部换 validator，都不应该导致 UI Event Contract 跟着变化。

---

# E-3：Event 应该在“什么时候”发？

这其实比“Event 叫什么”更重要。

例如模型调用：

```text
Provider.generate()
```

可以有两个事件：

```text
before generate
after generate
```

但它们语义完全不同。

再比如 Tool：

```text
tool call 已经被模型提出
```

和：

```text
tool 真正开始执行
```

也不是一回事。

当前 Runtime 的真实顺序是：

```text
ModelResponse
    ↓
写 model_output 到 State
    ↓
判断 tool_calls
    ↓
ToolExecutor.execute()
    ↓
写 tool_result
```

因此 VII-E 要确定一个重要原则：

### Event 是描述“意图”，还是描述“已经发生的事实”？

我目前倾向：

大多数 v1 Event 应优先表示**已经成立的事实**。

例如：

```text
model output 已收到并被 Runtime 接受
tool execution 已开始
tool execution 已完成
run 已结束
```

原因很简单：

如果先发：

```text
model_output
```

然后 State 写入失败，那么 UI 看到了一个 Runtime 实际并没有接受的事实。

所以我们后面必须逐个确定：

```text
State mutation
vs
Event emission
```

谁先谁后。

这里其实和你之前学过的：

**Who owns it / Who decides / Who changes state**

是一脉相承的。

VII-E 又多了第四问：

> **Who observes it（谁观察它）？**

---

# E-4：Subscriber 是 Observer，还是 Hook？

这是 VII-E 最重要的边界之一。

我强烈建议我们后面正式讨论时守住：

```text
Subscriber = Observer（观察者）
```

而不是：

```text
Subscriber = Controller（控制器）
```

也就是说 Subscriber 可以：

```ts
event => {
  console.log(event)
}
```

可以：

```ts
event => updateUI(event)
```

但不应该通过返回值决定：

```text
是否继续运行
是否允许 Tool
修改 ModelRequest
修改 State
阻止 Tool 执行
```

因为这些控制能力已经有明确的后续 Part：

```text
VII-F Abort
VII-H beforeToolCall + Approval
```

:chatgpt-content-reference{index="2"}

如果 VII-E 做成：

```ts
subscriber(event) => false
```

就提前把：

```text
Abort
Policy
Approval
Hook
```

混进来了。

这会导致之后非常难拆。

因此我认为 VII-E 的核心边界应该是：

```text
AgentEvent + Subscriber
=
Observation API（观察 API）

not

Control API（控制 API）
```

这一点后面很可能会成为正式 Architecture Decision（架构决策）。

---

# E-5：Subscriber 出错，应该影响 Runtime 吗？

这是本节真正有工程含量的地方之一。

假设：

```ts
runtime.subscribe(event => {
  logger.write(event);
});
```

结果 Logger 抛异常：

```ts
throw new Error("log service unavailable")
```

现在有两个选择。

### 方案 A

Subscriber error 直接让 Runtime fail：

```text
Agent Runtime
    ↓ emit
Subscriber throws
    ↓
run() throws
```

### 方案 B

Subscriber 属于旁路观察：

```text
Agent Runtime
    ↓ emit
Subscriber throws
    ↓
Runtime execution continues
```

这个问题不能靠“EventEmitter 默认怎么做”决定。

它必须从 Runtime ownership 判断。

我们的 Tool / Provider 是主执行链的一部分，所以它们的异常语义已经明确。

但 Logger / UI Subscriber（订阅者）是不是应该拥有让 Agent 执行失败的权力？

从当前 Milestone 目标看，我更倾向：

> Subscriber 不应该悄悄成为 Runtime failure source。

但这里还有细节：

- Subscriber error 是否完全吞掉？
- 是否应该聚合？
- 是否应该交给某个 error callback？
- 多 Subscriber 中一个失败，其他还执行吗？

这些都是这一节应该讨论的。

第一版不需要复杂 Event Bus（事件总线），但错误边界必须明确。

---

# E-6：Subscriber 是同步还是异步？

这个问题会直接影响 Runtime 语义。

假设：

```ts
subscribe(async event => {
  await fetch(...)
})
```

Runtime 是：

```text
emit event
↓
等待 Subscriber
↓
继续执行
```

还是：

```text
emit event
↓
不等 Subscriber
↓
继续执行
```

两种都会带来不同问题。

---

### Await Subscriber

优点：

```text
事件顺序容易保证
```

缺点：

```text
Logger/UI 可以阻塞 Runtime
```

甚至：

```text
Subscriber 卡 10 秒
→ Agent 也卡 10 秒
```

---

### Fire-and-forget（触发后不等待）

优点：

```text
不阻塞 Runtime
```

问题：

```text
错误怎么处理？
顺序怎么保证？
run() 返回时事件是不是还没消费完？
```

而且我们目前没有后台任务系统。

所以 VII-E 第一版到底要不要支持 async Subscriber（异步订阅者），是一个非常实际的设计问题。

我现在还不建议直接定答案。

但这一问一定要收敛，否则 Codex 很容易随手写：

```ts
Promise.all(subscribers.map(...))
```

然后我们无意中改变整个 Runtime latency（运行时延迟）和 failure semantics（失败语义）。

---

# 还有一个必须单独谈的问题：Streaming 要不要这次做？

总体规划里明确写了：

> Streaming 如在 v1 实现，只能在本 Milestone 结合 Event / Subscriber 设计。:chatgpt-content-reference{index="3"}

但根据当前真实源码：

```ts
interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

现在 Provider 是完整 Response 模型。

也就是说当前没有：

```text
Token Stream
Delta Stream
AsyncIterable
onToken
```

如果 VII-E 现在实现真正的 LLM Streaming（大模型流式输出），实际上要同时修改：

```text
ModelProvider Contract
Provider Adapter
AgentRuntime Loop
Message aggregation
Event Model
Tests
```

这已经不是单纯 Event / Subscriber 了。

所以基于目前代码，我现在的倾向很明确：

> **VII-E 建立 Event / Subscriber，但暂不做 Token Streaming。**

UI 第一版得到的是：

```text
run started
model turn started
model response
tool started
tool completed
run completed
```

而不是：

```text
token
token
token
token
```

这样 VII-E 仍然真实解决“执行过程对 UI 可见”，但不借机重构 VII-A 的 Provider Contract。

这也符合 VII-D 一贯的策略：先建立正确边界，再等真实需求推动能力升级。VII-D 同样没有因为建立 Context Boundary 就顺手实现 Token Budget / Summary / Memory。:chatgpt-content-reference{index="4"}

---

# VII-E 明确不应该做什么

根据当前 A–I 规划，我认为 Architecture Analysis 阶段就应该锁住这些边界：

```text
❌ Abort / Cancellation
❌ Single Active Run
❌ Subscriber 控制 Runtime
❌ beforeToolCall hook
❌ Approval
❌ Session persistence
❌ Event replay
❌ Event sourcing
❌ Durable event log
❌ Retry / Resume
❌ Telemetry framework
❌ OpenTelemetry integration
❌ EventBus framework
❌ Middleware pipeline
❌ Plugin system
❌ Token streaming（当前倾向延期）
```

尤其不要让 Codex 做成：

```ts
EventBus
Middleware
EventStore
EventReplay
EventInterceptor
EventPolicy
```

那会完全偏离 VII-E。

---

# 我建议 VII-E 的完成标准先定义成这样

如果这一 Milestone 最后完成，我认为至少应该证明下面这些事情：

1. `AgentRuntime` 的关键执行过程可以通过 `AgentEvent` 对外观察，而不要求读取或修改 Runtime 私有 State。

2. 外部可以注册 Subscriber（订阅者）消费这些事件，用于 UI、Logger、Debug / Observability（可观测性）。

3. Event 只是 Observation（观察），不拥有 Control Flow（控制流），不能借此实现 Abort、Approval 或 Tool Policy。

4. Event emission（事件发出）不会改变 VII-A～VII-D 已有的 State、Tool、Context、termination 语义。

5. 一次正常 Tool Loop 至少能观察到合理顺序，例如概念上：

```text
run
→ model turn
→ model response
→ tool execution
→ tool result
→ next model turn
→ model response
→ run complete
```

6. Multiple Tool Calls（多个工具调用）事件顺序必须与当前 ToolExecutor 的**顺序执行语义**一致，而不能因为事件系统偷偷变成并发。

7. Subscriber 自身对 Event payload（事件负载）的修改，不能污染 Runtime State、ToolCall 或 ToolResult 的真实事实。

8. Subscriber error semantics（订阅者错误语义）必须有明确契约，不能由 JavaScript 的偶然行为决定。

9. 不修改 `RuntimeState` schema，不把 events 存进 State。

10. 不提前实现 VII-F、VII-G、VII-H。

---

# 当前 VII-E 的架构草图

我认为我们这一节最终大概率会落在类似：

```text
                       AgentRuntime
                           │
                    owns execution
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    RuntimeState     ContextBuilder     ToolExecutor
      facts             projection        execution
          │
          │
          └──────── Runtime events ─────────┐
                                            │
                                            ▼
                                      AgentEvent
                                            │
                                            ▼
                                       Subscriber
                                      /     |      \
                                     UI   Logger   Debug
```

但要特别注意依赖方向：

```text
Subscriber
    ✗ 不写 State
    ✗ 不推进 Loop
    ✗ 不允许 Tool
    ✗ 不终止 Run
```

至少 VII-E v1 应该如此。

---

# 我们先正式进入 E-1

所以这一轮我建议先只收敛第一个问题：

> **AgentEvent 应该描述“Runtime State 中的事实”，还是描述“Runtime 生命周期中发生的动作”？**

我认为答案不是二选一。

更准确地说应该是：

> **AgentEvent 描述对外有观察价值的 Runtime 生命周期事实；它可以携带 State 中产生的事实，但它本身不是 State，也不是 State 的复制品。**

例如：

```text
model_output 写入 State
```

属于 Runtime Fact。

Event 可以表达：

```text
“这一轮模型输出已经被 Runtime 接受”
```

并携带这个 output 的 detached snapshot（隔离副本）。

这样：

```text
RuntimeState = source of truth（事实源）
AgentEvent   = observation（观察记录）
Subscriber   = consumer（消费者）
```

我认为这个基础认知应该先锁住。

如果你认可，我们下一步就进入 **E-2：到底应该定义哪些 AgentEvent，以及哪些内部步骤不应该暴露成 Event**。这一问会直接决定 VII-E 是一个干净的小型 Runtime Event Model，还是不小心演变成复杂 Event Bus。:chatgpt-content-reference{index="5"}

## Turn 2

### User

1. 突然感觉这一节其实就是比如我在使用 GPT 时候，GPT 在输出答案前那一堆思考过程？我记得 pi agent 中这一部分的设计很轻量化
2. 认可。继续

### ChatGPT

对，你这个类比**方向是对的，但要稍微修正一下**。

你在使用 GPT 时，答案出来前看到的“正在分析 / 正在搜索 / 正在使用工具 / 正在处理文件”这一类过程提示，更接近我们 VII-E 现在要做的 **AgentEvent（Agent 事件）+ Subscriber（订阅者）**。

但它**不是模型真正的内部思考过程**。

更准确地说：

```text
真正的 LLM 内部推理
        ≠
Runtime Event
```

我们这一节暴露的是 **Runtime 能客观知道、并且适合展示给外部的执行过程**：

```text
开始运行
↓
准备调用模型
↓
模型返回 tool_calls
↓
开始执行 weather tool
↓
weather tool 执行完成
↓
再次调用模型
↓
得到最终答案
↓
运行完成
```

而不是把模型内部类似：

```text
我先分析一下……
这里可能应该调用天气工具……
让我比较一下……
```

这种 private reasoning（私有推理）暴露出去。

所以你可以把 VII-E 理解成：

> **给 Runtime 安装一个“执行过程直播接口”。**

UI 订阅之后，就能把它渲染成用户看到的：

```text
正在思考...
正在查询天气...
已获取天气信息...
正在整理答案...
```

但这些文案是 UI 根据 Runtime Event 翻译出来的，并不是 Runtime 自己生成“思考文字”。

---

你提到 **Pi Agent 这一块很轻量**，这个理解也很重要。

我们之前分析 Pi 时一直有一个特点：

> Core（核心）尽量只提供最小机制，不把 Logger、UI、Telemetry（遥测）、业务流程全部塞进去。

VII-E 我也建议保持这个方向。

不要搞成：

```text
AgentRuntime
 ↓
EventBus
 ↓
Middleware
 ↓
Telemetry Pipeline
 ↓
Logger Framework
 ↓
UI Framework
```

我们真正需要的可能只是：

```text
AgentRuntime
    ↓ emit(event)
Subscriber[]
```

这就是为什么这一节虽然听起来像“可观测性系统”，实际代码量很可能不会很大。

真正值得学的是：

> **事件到底应该表达什么、什么时候发、订阅者有没有控制权、订阅者失败是否影响 Runtime。**

而不是 EventEmitter 本身怎么写。

这跟 VII-D 很像：

`ContextBuilder` 最终代码很少，但背后的 **State ≠ Context** 才是核心。

VII-E 很可能也是：

```text
代码很轻
架构边界很重要
```

---

## 继续 E-2：到底应该有哪些 AgentEvent？

这里我建议我们先不要从 TypeScript union type 开始，而是直接观察当前 Runtime 里真正存在的生命周期。

现在一次最完整的 Tool Loop 是：

```text
run(userInput)

↓
保存 user_input

↓
Model Turn #1
ContextBuilder
Provider.generate

↓
保存 model_output(tool_calls)

↓
Tool #1 execute
↓
保存 tool_result

↓
Model Turn #2
ContextBuilder
Provider.generate

↓
保存最终 model_output

↓
completed
```

从这里可以列出很多候选 Event。

例如：

```text
run_started
user_message_added

model_turn_started
context_built
model_request_started
model_response_received
model_output_added

tool_call_received
tool_execution_started
tool_execution_completed
tool_result_added

run_completed
```

但我认为这里至少一半都不应该成为 VII-E 的 Public Event Contract（公共事件契约）。

为什么？

因为有一些只是 Runtime 内部实现细节。

比如：

```text
context_built
```

现在 VII-D 有 ContextBuilder。

以后如果 ContextBuilder 内部改掉：

```text
ContextBuilder
→ ContextPipeline
```

难道 UI Event Contract 也跟着变化吗？

不应该。

所以我们需要第一个筛选原则：

> **Event 应该描述 Runtime 生命周期语义，而不是描述内部代码模块。**

---

### 第一类：Run Event

这个基本毫无争议。

```text
run_started
run_finished
```

为什么值得暴露？

因为 UI / Logger 很明显需要知道：

```text
这个 run 从哪里开始
最终为什么结束
```

尤其当前已经存在多个 `RunOutcome`：

```text
completed
unsupported
limit_reached
```

所以最终事件很可能可以直接表达：

```text
run finished
+
RunOutcome
```

而不必造：

```text
run_completed
run_unsupported
run_limit_reached
```

三个独立事件。

也就是说我们可以优先考虑：

```text
run_started

run_finished {
    outcome
}
```

这比把每种 termination 都变成 Event Type 更克制。

---

### 第二类：Model Turn Event

这一类我认为也应该存在。

至少外部需要知道：

```text
现在开始了一次模型调用

模型返回了结果
```

概念上：

```text
model_turn_started
model_turn_completed
```

为什么我现在更喜欢 `model_turn_*`，而不是：

```text
provider_request_started
provider_response_received
```

因为：

`Provider` 是内部实现边界。

UI 并不关心：

```text
OpenAIModelProvider.generate()
```

还是：

```text
AnthropicModelProvider.generate()
```

UI 真正关心的是：

> Agent 正在进行一次 Model Turn（模型回合）。

所以：

```text
model_turn
```

比：

```text
provider request
```

更加 Runtime-level。

这也和 VII-D 的 `TurnSnapshot` 非常匹配：

```text
Model Turn
    ↓
TurnSnapshot
    ↓
ModelProvider
```

---

### 第三类：Tool Event

这个肯定需要。

因为这是 UI 最有价值的过程信息之一：

```text
正在查询天气
正在搜索文件
正在计算
```

因此至少需要表达：

```text
tool_execution_started
tool_execution_finished
```

假设未来 Weather Agent：

```text
Model
↓
get_weather
```

Subscriber 就可以：

```text
tool_execution_started
    ↓
UI: 正在查询天气...
```

然后：

```text
tool_execution_finished
    ↓
UI: 天气查询完成
```

---

这里有一个非常重要的区分：

```text
tool_call_received
```

和：

```text
tool_execution_started
```

不是一回事。

模型输出：

```json
{
  "name": "get_weather",
  "arguments": {}
}
```

只是：

> LLM 提出了一个 Tool Call。

但 Runtime 还可能因为：

```text
maxTurns
tool not found
invalid arguments
未来 Approval
```

最终根本没有真正执行。

所以如果 UI 显示：

```text
正在执行 get_weather
```

最好对应真实：

```text
ToolExecutor.execute()
```

已经开始。

而不是模型刚刚说“我想调用这个工具”。

这个 distinction（区分）非常重要。

---

## 那 `user_input` 和 `model_output` 要不要单独 Event？

这是一个值得讨论的问题。

### `user_input`

其实调用者自己刚刚：

```ts
runtime.run("东京天气")
```

它已经知道输入是什么。

所以再发：

```text
user_input_added
```

价值并不大。

至少 VII-E 第一版我倾向不需要。

否则 Event 很容易退化成：

```text
RuntimeState 每写一条 message
→ emit message_added
```

这基本是在复制 State。

---

### `model_output`

这个不同。

因为 UI 最终当然需要模型答案。

但当前 `run()` 已经会返回 outcome，而答案目前主要存于 Runtime history。

于是有两个可能方向：

```text
model_turn_completed
{
  response / output
}
```

或者：

```text
model_output
{
  message
}
```

我目前更倾向前者：

> Model Turn 的完成事件携带这一轮产生的模型输出。

这样 Event 数量更少，同时语义更完整：

```text
model_turn_started
↓
model_turn_completed(output)
```

而不是：

```text
model_turn_started
provider_completed
model_output_added
```

一轮模型调用拆三个事件。

---

# 因此第一版 Event Model 可以非常小

目前我最倾向的**候选集合**其实只有六种语义：

```text
Run Started

Model Turn Started
Model Turn Completed

Tool Execution Started
Tool Execution Completed

Run Finished
```

你会发现非常轻量。

一个完整流程就是：

```text
run_started

model_turn_started
model_turn_completed
    ↓ tool_calls

tool_execution_started
tool_execution_completed

model_turn_started
model_turn_completed
    ↓ final answer

run_finished
```

这跟你刚才说的“GPT 回答前显示执行过程”已经非常接近了。

例如 UI 可以自己翻译：

```text
run_started
→ 正在处理...

model_turn_started
→ 正在思考...

tool_execution_started(get_weather)
→ 正在查询天气...

tool_execution_completed(get_weather)
→ 已获取天气...

model_turn_started
→ 正在整理答案...

run_finished
→ 完成
```

注意：

`正在思考...`

是 UI 文案。

不是我们真的拿到了 LLM 的 hidden reasoning（隐藏推理）。

---

# 为什么我暂时不想增加 `context_built`

这点值得专门讲。

VII-D 我们刚刚花了一整个 Milestone 建立：

```text
ContextBuilder
TurnSnapshot
```

很容易产生冲动：

> 那 VII-E 要不要 emit `context_built`？

我倾向不要。

因为 `ContextBuilder` 属于 architecture component（架构组件），不一定属于 Public Lifecycle（公共生命周期）。

否则：

```text
ContextBuilder.build()
ToolRegistry.listDefinitions()
RuntimeState.append()
```

全部都可以 Event 化。

最后 Event Contract 会高度耦合 Runtime 内部实现。

我们要的是：

```text
外部需要知道什么
```

而不是：

```text
Runtime 里面有哪些 class
```

这是非常重要的筛选标准。

---

# Multiple Tool Calls 怎么表现？

当前 VII-C 明确是**顺序执行** Multiple Tool Calls（多个工具调用）。:chatgpt-content-reference{index="0"}

假设模型一次返回：

```text
tool A
tool B
tool C
```

当前执行：

```text
A
↓
B
↓
C
```

那么 Event 自然应该：

```text
tool_started(A)
tool_finished(A)

tool_started(B)
tool_finished(B)

tool_started(C)
tool_finished(C)
```

这很好。

Subscriber 根本不需要知道 ToolExecutor 内部用了 `for`。

它只观察到真实 Runtime 顺序。

以后如果真的支持 Parallel Tools（并行工具）：

```text
A started
B started
A finished
C started
...
```

Event Model 甚至仍然可以保持不变。

这就是好的 Event abstraction（事件抽象）：

> 它描述发生了什么，而不是描述 Runtime 怎么实现的。

---

# E-2 我建议先形成三个候选结论

我们现在还没有进入正式 Design Decision，但可以先记录：

**E-AD 候选 1：**

> AgentEvent 暴露 Runtime-level lifecycle（运行时级生命周期），不暴露 ContextBuilder、ToolRegistry、ProviderAdapter 等内部模块调用细节。

**E-AD 候选 2：**

> 第一版 Event Model 保持最小，围绕 Run / Model Turn / Tool Execution 三个层级建立，不复制整个 RuntimeState mutation log。

**E-AD 候选 3：**

> Tool Event 描述真实 Tool Execution，而不是仅仅表示模型产生了 Tool Call；LLM 请求调用工具和 Runtime 真正执行工具是两个不同事实。

我认为这三个边界现在已经比较稳。

---

下一步就是 **E-3：事件究竟在 State mutation 前发还是后发，以及 Event payload 应该拿 Runtime 原对象还是隔离副本。**

这一问其实会直接连接你刚才提到的 Pi 那种“轻量 Event”的设计哲学：

> API 可以非常轻，但 **emit timing（发出时机）和 reference ownership（引用所有权）一定要明确**。

而且这里会出现一个很有意思的例子：`model_turn_completed` 到底应该在 `ModelResponse` 刚回来时发，还是在 `model_output` 已经正式写入 RuntimeState 后再发。这个看似只有一行代码位置的区别，实际上决定 Event 是“尝试发生”还是“事实已经成立”。

## Turn 3

### User

继续

### ChatGPT

继续。现在进入 **E-3：Event（事件）应该在什么时候发，以及 Event payload（事件负载）拿什么对象**。

这一问看起来像实现细节，但其实决定了 Event 到底是不是“可信的 Runtime Observation（运行时观察）”。

---

## 先看最典型的 `model_turn_completed`

当前真实链路是：

```text
ContextBuilder.build()
↓
provider.generate()
↓
得到 ModelResponse
↓
AgentRuntime 写入 model_output
↓
根据 finishReason 继续
```

这里至少有两个可能的 emit 点。

方案 A：

```text
provider.generate()
↓
得到 response
↓
emit(model_turn_completed)
↓
写 RuntimeState
```

方案 B：

```text
provider.generate()
↓
得到 response
↓
写 RuntimeState
↓
emit(model_turn_completed)
```

我更倾向 **方案 B**。

原因是我们刚才已经给 AgentEvent 定义了一个很重要的语义：

> Event 优先描述 Runtime 已经接受并成立的事实，而不是“某个动作刚刚尝试完成”。

如果 Provider 返回了结果，但是 Runtime 还没有把 `model_output` 正式写入 State，那么严格说：

```text
模型响应已经返回
```

是事实，

但：

```text
这一轮 Model Turn 已经被 Runtime 接受
```

还不一定成立。

所以如果 Event 名叫：

```text
model_turn_completed
```

更自然的语义应该是：

> 这一轮输出已经进入 Runtime 的事实链。

这样 Subscriber 收到事件后再去看 `runtime.getMessages()`，理论上应该已经能看到对应结果。

这个一致性很重要。

---

## 这里可以形成一个原则

我建议：

> **对于会形成 Runtime Fact 的完成类 Event，优先在对应 State mutation 成功之后 emit。**

也就是：

```text
Action
↓
Runtime accepts result
↓
State mutation
↓
emit completed event
```

而不是：

```text
Action
↓
emit completed
↓
State mutation
```

这样 Event 就更接近：

**Committed Observation（已提交观察）**

而不是：

**Tentative Observation（暂定观察）**

这个思想跟数据库事务其实很像。

你不会在数据还没 commit 前，就对外宣布：

> “订单已创建”。

同理：

Runtime 也不应该在事实还没进入自己的 source of truth（事实源）之前，就发“完成”。

---

# `tool_execution_started` 就不同

Started Event（开始事件）没有 State mutation 可等。

当前 Tool 流程：

```text
模型产生 tool_call
↓
Runtime 决定执行
↓
ToolExecutor.execute()
↓
ToolResult
↓
写 tool_result
```

`tool_execution_started` 最合理的位置就是：

```text
Runtime 已经决定真的执行这个 Tool
↓
emit(tool_execution_started)
↓
ToolExecutor.execute()
```

这里为什么不能在模型刚返回 tool_call 时发？

因为那只是：

```text
LLM requested tool
```

不等于：

```text
Runtime started executing tool
```

尤其当前已经有：

```text
maxTurns
skipped
```

未来还有：

```text
Approval
Abort
```

所以这个 distinction（区分）必须保留。

---

# `tool_execution_completed` 在哪里发？

同理，我倾向：

```text
ToolExecutor.execute()
↓
得到 ToolResult
↓
AgentRuntime 写 tool_result
↓
emit(tool_execution_completed)
```

这样 Subscriber 收到：

```text
tool_execution_completed
```

时，State 已经包含对应的：

```text
tool_result
```

这个顺序会形成一个非常漂亮的约束：

```text
completed event
⇒
corresponding Runtime fact already exists
```

以后调试非常方便。

比如：

```ts
subscriber(event => {
  if (event.type === "tool_execution_completed") {
    runtime.getMessages();
  }
});
```

它不会看到：

```text
Event 已说完成
但 State 里结果还没进去
```

这种中间态。

---

# 那 `run_started` 呢？

这里也有类似问题。

当前：

```ts
runtime.run(userInput)
```

首先会把：

```text
user_input
```

写进 State。

那：

```text
run_started
```

是在写 user_input 前还是后？

这里我更倾向：

```text
run() entered
↓
写 user_input
↓
emit(run_started)
```

理由还是一致性：

Subscriber 收到：

```text
run_started
```

时，这个 run 的输入事实已经进入 Runtime。

否则 UI 收到：

```text
run_started
```

马上读取 history，却还看不到用户输入，会有一个奇怪的短暂不一致。

不过这里未来还可以讨论：

`run_started` 要不要直接携带 user input。

第一版我倾向**可以不带完整 user message**，因为调用者本来就知道自己传了什么。

---

# `run_finished` 怎么办？

这个相对简单。

当前已经有：

```ts
RunOutcome
```

所以：

```text
最后状态处理完成
↓
生成 outcome
↓
emit(run_finished { outcome })
↓
return outcome
```

我认为非常自然。

这样就有一个非常明确的外部语义：

```text
Subscriber 收到 run_finished
≈
run() 即将以这个 outcome 返回
```

而且不需要为：

```text
completed
unsupported
limit_reached
```

分别造事件类型。

---

# 现在看第二个核心问题：Event payload 能不能直接引用 Runtime 内部对象？

这个问题我认为答案应该比较明确：

> **不应该直接泄露 Runtime 内部可变引用。**

这和 VII-C / VII-D 的 Reference Isolation（引用隔离）是一条连续原则。

VII-D 已经明确：

```text
Snapshot mutation
不能污染 RuntimeState
```

:chatgpt-content-reference{index="0"}

VII-E 也应该保持：

```text
Event payload mutation
不能污染 RuntimeState
```

假设 Event 这样写：

```ts
emit({
  type: "model_turn_completed",
  message: state.messages[state.messages.length - 1]
})
```

如果 Subscriber：

```ts
event.message.content = "hacked"
```

然后 Runtime history 也被改了，那就非常危险。

因为 Subscriber 明明只是 Observer（观察者），却通过引用偷偷获得了 Mutation Power（修改权）。

所以：

```text
Observer
≠
State owner
```

必须落实到对象引用上。

---

# 那是不是所有 Event 都 `structuredClone()`？

第一版我认为很可能这是最简单、最稳的做法。

例如 Event payload 携带：

```text
ModelMessage / RuntimeMessage snapshot
ToolCall
ToolResult
RunOutcome
```

在 emit 前做隔离。

但 Architecture Analysis 现在不用直接规定：

```ts
structuredClone(event)
```

我们只需要先确认 contract：

> Subscriber 获得的 Event 数据必须与 Runtime 的 source of truth 引用隔离。

具体是：

- build event 时 clone payload；
- emit 时整体 clone；
- 每个 Subscriber 再独立 clone；

这是下一层实现决策。

而这里马上引出一个很重要的问题。

---

# 多个 Subscriber 之间要不要彼此隔离？

假设：

```text
Subscriber A
Subscriber B
```

Runtime 发：

```ts
event
```

如果两个人拿的是**同一个 event object**：

```text
A 先执行
A 修改 event.toolName
↓
B 收到被 A 改过的 event
```

虽然 Runtime State 没被污染，但 Subscriber 之间互相污染了。

所以这里其实有两个层次：

### Level 1

```text
Event ↔ Runtime State
```

必须隔离。

### Level 2

```text
Subscriber A ↔ Subscriber B
```

是否也隔离？

这个问题需要权衡。

如果每个 Subscriber 都：

```text
structuredClone(event)
```

隔离最强。

但代价是：

```text
N 个 subscriber
→ N 次 clone
```

第一版通常问题不大，但需要有意识决定。

如果 Event payload 本身设计得很小，而且 subscriber contract 是：

```text
readonly AgentEvent
```

那么也可能只 clone 一次，然后所有 Subscriber 共享同一个 detached Event。

这样：

```text
Runtime
↓ clone
Detached event object
↓
A / B / C
```

Runtime 安全了，但 Subscriber 之间还存在 JS runtime mutation 风险。

所以后面 Design Decision 必须明确：

> 我们保护的是“Runtime 不被污染”，还是进一步保证“Subscriber 彼此隔离”。

我目前倾向 v1 至少必须保证前者。

后者可以通过：

```text
readonly contract + 不鼓励 mutation
```

处理，不一定一开始就 N 次 deep clone。

这跟 VII-D 类似：

我们当时也没有为了“不可变”直接上 deepFreeze。

---

# 这里还有一个很重要的问题：Event payload 应该放多少东西？

假设：

```text
model_turn_completed
```

我们可以把整个：

```ts
ModelResponse
```

塞进去。

也可以只放：

```ts
{
  finishReason,
  message
}
```

甚至只放：

```ts
{
  finishReason
}
```

Event payload 越大：

```text
UI 更方便
```

但也越容易：

```text
Event Contract
=
复制内部对象结构
```

然后未来内部类型一变，Public Event API 也跟着变。

所以我建议一个原则：

> **Event payload 只携带外部观察这个生命周期节点真正需要的数据，不要为了“信息完整”复制整个内部对象图。**

例如：

```text
tool_execution_started
```

外部至少可能需要：

```text
toolCall id
tool name
arguments
```

因为 UI 可能想显示：

```text
正在调用 get_weather("Tokyo")
```

而：

```text
ToolRegistry instance
ToolDefinition object
Validator
Tool implementation
```

完全没必要。

同理：

```text
model_turn_started
```

第一版甚至可能只需要：

```text
turn number?
```

这里我们还没决定是否需要 `turn`。

如果没有真实 UI / Logger 需求，甚至可以没有 payload。

---

# `turn number` 要不要现在就加？

这个其实有点诱惑力。

例如：

```text
model_turn_started { turn: 1 }
model_turn_completed { turn: 1 }
```

Logger 非常舒服。

但 VII-D 明确没有把：

```text
turnId
turn
createdAt
```

塞进 TurnSnapshot，因为没有真实需求。:chatgpt-content-reference{index="1"}

VII-E 这里要重新看一次。

Event 场景里 `turn` 的需求比 Snapshot 更真实，因为：

```text
started
completed
```

需要关联。

不过我们已经有顺序执行，而且 Model Turn 不并发。

所以第一版即使没有 `turnId`：

```text
model_turn_started
model_turn_completed
```

也天然配对。

因此我目前仍然倾向：

> **先不要为了可观测性制造 ID / timestamp / sequence number。**

除非后面发现 Tool Event 的关联确实需要。

Tool 本身已经有：

```text
toolCall.id
```

所以关联机制是现成的。

---

# E-3 可以先收敛成四个候选决策

目前我认为可以先记录成：

**候选 E-AD04**

> Completed 类型的 Event 应在对应 Runtime Fact 已成功写入 State 后发出，使 Event 表示已成立的 Runtime 事实，而不是未提交的中间状态。

**候选 E-AD05**

> Started 类型的 Event 在 Runtime 已真正决定进入该动作时发出；例如 `tool_execution_started` 只在真实进入 Tool execution 前发，不在 LLM 仅产生 Tool Call 时发。

**候选 E-AD06**

> Event payload 必须与 Runtime 内部可变事实引用隔离；Subscriber 不应通过修改 Event 间接修改 Runtime State。

**候选 E-AD07**

> Event payload 保持最小，只暴露观察生命周期所需数据，不复制 Runtime 内部对象图，也不为了可观测性提前加入 turnId、timestamp、metadata 等字段。

---

# 现在其实已经能看出一条非常稳定的事件顺序

正常 Weather Agent 最终可能是：

```text
user_input 写 State
↓
run_started

↓
model_turn_started

↓
Provider.generate

↓
model_output 写 State
↓
model_turn_completed

↓
tool_execution_started

↓
ToolExecutor.execute

↓
tool_result 写 State
↓
tool_execution_completed

↓
model_turn_started

↓
Provider.generate

↓
final model_output 写 State
↓
model_turn_completed

↓
run_finished
↓
return outcome
```

这个顺序非常容易被 UI、Logger、测试理解。

---

下一步我们就进入 **E-4：Subscriber 的真正契约**。

这一问要解决三个很关键的问题：

```text
1. Subscriber 能不能是 async？
2. Subscriber 抛错是否影响 Runtime？
3. subscribe() / unsubscribe() 应该是什么最小 API？
```

这三个问题一旦定下来，VII-E 的主体架构基本就完成 80% 了。

## Turn 4

### User

继续

### ChatGPT

继续。现在进入 **E-4：Subscriber（订阅者）的真正契约**。

这一节我认为是 VII-E 里最容易把“轻量事件机制”做复杂的地方。因为一旦 Subscriber（订阅者）既能异步、又能抛错影响 Runtime、又能返回值控制执行，它就会迅速变成 Middleware（中间件）/ Hook（钩子）/ Policy（策略）系统。

而我们当前总体规划明确把控制类能力留给 VII-F、VII-H，所以 VII-E 更应该保持“只观察，不控制”。:chatgpt-content-reference{index="0"}

我先给结论倾向，再解释原因：

> **Subscriber 第一版应该是同步、只读语义、无返回值控制权的 Observer（观察者）。Subscriber 的异常不应改变 Agent Runtime 主执行结果。**

这其实非常接近你说的 Pi 那种轻量风格。

---

## 1. Subscriber 能不能是 async？

表面上看，支持 async 很诱人：

```ts
runtime.subscribe(async event => {
  await saveLog(event);
});
```

但是一旦支持，就必须回答：

```text
Runtime 要不要 await 它？
```

如果 await：

```text
emit event
↓
等待 Subscriber
↓
Runtime 才继续
```

那会出现一个很严重的问题：

> **观察系统开始进入 Runtime critical path（主执行路径）。**

例如 UI subscriber：

```ts
await fetch("/analytics")
```

慢了 5 秒。

那么 Agent 本身也会慢 5 秒。

这就不再是：

```text
Subscriber observes Runtime
```

而变成：

```text
Subscriber participates in Runtime scheduling
```

这和我们想守住的边界冲突。

---

如果不 await，而是：

```ts
void subscriber(event);
```

又会出现另外三个问题。

第一：

```text
Promise rejection 谁处理？
```

第二：

```text
run() 已经返回了
但 Subscriber 可能还没消费完
```

第三：

```text
Event 顺序不再等于消费顺序
```

例如：

```text
tool_started
tool_finished
run_finished
```

Runtime 发出顺序是对的。

但 async consumer 可能变成：

```text
run_finished handler 先执行完
tool_started handler 最后才结束
```

这对 Logger / UI 的语义又会变复杂。

所以对 VII-E v1 来说，我认为最合理的选择就是：

```ts
type Subscriber = (event: AgentEvent) => void;
```

也就是：

**同步通知。**

注意同步并不等于 Subscriber 可以做重活。

它的设计意图应该是：

```text
收到事件
↓
快速转发 / 更新内存状态 / console log
↓
return
```

如果未来要把事件异步写到数据库、Telemetry（遥测）服务等，应该由 Subscriber 自己把任务转交给外部异步机制，而不是让 Runtime 为它提供完整任务调度。

这反而更轻量。

---

## 2. Subscriber 的异常应不应该让 Runtime 失败？

这是最关键的问题之一。

假设：

```ts
runtime.subscribe(event => {
  throw new Error("logger failed");
});
```

如果 Runtime 直接 throw：

```text
Model 正常
Tool 正常
State 正常
只是 Logger 挂了
↓
Agent run 失败
```

这非常奇怪。

因为 Logger 本来不是 Agent Runtime 的核心执行依赖。

这里可以用一个很清楚的分类。

### 主链依赖

当前包括：

```text
ModelProvider
ToolExecutor
Runtime invariant
```

它们失败可能让 run 失败，因为它们决定 Agent 是否真的能完成任务。

### 旁路观察者

例如：

```text
UI
Logger
Debug subscriber
Metrics
```

它们失败不应该天然改变 Agent 执行语义。

所以我倾向：

> **Subscriber failure（订阅者失败）不应该成为 Run failure source（运行失败来源）。**

这会形成一条很重要的架构边界：

```text
Core execution failure
≠
Observation failure
```

---

## 那是不是直接吞掉 Subscriber error？

这里不能简单变成：

```ts
try {
  subscriber(event);
} catch {}
```

然后什么都不管。

因为这样 Debug 很痛苦。

所以第一版真正需要决定的不是：

> “吞不吞”

而是：

> **Subscriber error 如何被隔离，同时又不影响 Runtime 主结果？**

目前我认为有三个候选。

### A. 静默忽略

```text
subscriber throws
↓
ignore
```

最简单。

但可调试性最差。

---

### B. `console.error`

```text
subscriber throws
↓
console.error
↓
continue
```

比静默好一点。

但 Runtime Core 开始直接拥有 logging policy（日志策略），不是特别漂亮。

---

### C. 提供第二层 error observer

例如：

```ts
onSubscriberError(error)
```

这样最完整。

但我认为 VII-E 第一版很可能又有点超前。

因为马上会变成：

```text
Subscriber
SubscriberErrorHandler
Logger
ErrorReporter
```

我们又开始搭系统。

所以当前我更倾向：

> **先保证异常隔离；具体错误报告方式保持最小，不为此新建完整错误通道。**

到底是内部 `console.error` 还是完全吞掉，可以等 Design Decision 最后和当前项目编码风格一起定。

架构层真正必须锁定的是：

```text
Subscriber throws
≠
Agent run fails
```

---

## 3. 一个 Subscriber 失败后，后面的 Subscriber 还执行吗？

我认为答案应该是：

**继续。**

假设：

```text
A = Logger
B = UI
C = Metrics
```

A 报错：

```text
A throws
```

不能导致：

```text
B / C 都收不到 event
```

否则 Subscriber 之间产生了非常强的隐式依赖：

```text
A 的健康状态
决定 B 能不能工作
```

这明显不合理。

所以更健康的是：

```text
for subscriber in subscribers
    try notify subscriber
    catch isolate error
```

概念上：

```text
AgentEvent
 ├─ Subscriber A ❌
 ├─ Subscriber B ✅
 └─ Subscriber C ✅
```

这再次说明：

Subscriber 是彼此独立的 Observer（观察者）。

---

# 4. `subscribe()` 最小 API 应该是什么？

这个问题反而可以很轻。

最简单：

```ts
runtime.subscribe(subscriber);
```

但 Subscriber 怎么取消？

有两个常见方案。

### 方案 A

```ts
runtime.subscribe(subscriber);
runtime.unsubscribe(subscriber);
```

### 方案 B

```ts
const unsubscribe = runtime.subscribe(subscriber);

unsubscribe();
```

我更倾向 **方案 B**。

因为调用方天然拥有这次订阅的 lifecycle（生命周期）：

```ts
const unsubscribe = runtime.subscribe(...);

// later
unsubscribe();
```

而且不需要 Runtime 再暴露：

```ts
unsubscribe(subscriber)
```

也避免调用方必须永久保存原函数引用。

所以最小 API 很可能就是：

```ts
type AgentEventSubscriber = (event: AgentEvent) => void;

subscribe(
  subscriber: AgentEventSubscriber
): () => void;
```

这已经足够 UI / Logger 使用。

---

## 那要不要提供 `once()`？

不要。

## `removeAllSubscribers()`？

当前也没需求。

## priority（优先级）？

不要。

## wildcard / event filter？

不要。

## typed per-event subscribe？

例如：

```ts
subscribe("tool_started", handler)
```

当前我也不建议。

因为我们的 Event Model 本身非常小：

```ts
subscriber(event) {
  switch (event.type) {
    ...
  }
}
```

足够。

如果现在引入：

```text
EventEmitter API
event names
listener map
once
off
removeAll
```

就已经开始复制 Node `EventEmitter` 的完整模型了。

而 VII-E 根本不需要。

---

# 5. Subscriber 存在哪里？

这个问题也值得明确。

最自然的是：

```text
AgentRuntime
  owns Subscriber collection
```

因为 Runtime 是 Event producer（事件生产者）。

例如概念上：

```ts
#subscribers = new Set<AgentEventSubscriber>();
```

这不意味着 Subscriber 进入 RuntimeState。

要特别区分：

```text
RuntimeState
= conversation facts
```

和：

```text
AgentRuntime instance
= runtime execution infrastructure
```

Subscriber 属于后者。

因此：

```text
RuntimeState
    ✗ subscribers
    ✗ events
```

这是非常重要的。

尤其 VII-G 未来做 SessionStore / Conversation Recovery 时，不应该尝试持久化：

```text
subscriber functions
```

这显然不是会话事实。

---

# 6. Event 顺序应该有怎样的保证？

因为我们倾向同步 Subscriber，第一版可以得到一个很强而且简单的保证：

> **同一个 Runtime 内，Subscriber 观察到的 Event 顺序与 Runtime emit 顺序一致。**

例如：

```text
run_started
model_turn_started
model_turn_completed
tool_execution_started
tool_execution_completed
model_turn_started
model_turn_completed
run_finished
```

Subscriber 看到的就是这个顺序。

这对 Debug 特别重要。

而且因为当前：

- Model Turn 不并行；
- Tool Calls 顺序执行；
- 同一 Runtime 还没有 Single Active Run（这是 VII-F）；

所以 VII-E 不需要现在解决复杂事件 ordering（排序）问题。

不过这里要注意：

VII-F 之前，同一个 Runtime 是否可能被调用方同时 `run()` 两次？

这是后续明确要解决的问题。总体规划把 Single Active Run 放在 VII-F。:chatgpt-content-reference{index="1"}

所以 VII-E **不要为了保证全局事件顺序，提前加 run lock**。

哪怕我们意识到并发可能导致 Event interleave（事件交错），也应该明确记成：

```text
VII-F responsibility
```

而不是本节偷偷修掉。

这就是 Scope control（范围控制）。

---

# 7. Subscriber 能不能在回调里再次调用 `runtime.run()`？

这是一个很有意思的边界。

例如：

```ts
runtime.subscribe(event => {
  if (...) {
    runtime.run("another task");
  }
});
```

现在没有 Single Active Run 保护。

那可能产生：

```text
run A
  ↓ event
subscriber
  ↓
run B
```

导致重入。

VII-E 要不要阻止？

我的答案是：

> **不要在 VII-E 解决。**

因为这本质上已经是：

```text
reentrancy（重入）
concurrent run（并发运行）
single active run
```

而这正是 VII-F 的 Scope。

VII-E 只需保证：

Subscriber 没有“官方控制接口”。

至于它持有 Runtime reference（引用）然后主动调用 public API，那属于 VII-F 要建立的 Runtime execution guard（执行保护）。

这个边界非常重要。

---

# 到这里 E-4 可以形成 5 个候选决策

我建议先记成：

### 候选 E-AD08

> Subscriber 是同步 Observer（观察者），第一版签名保持 `(event) => void`，不引入 async Subscriber 协议。

### 候选 E-AD09

> Subscriber failure 与 Runtime execution failure 解耦；单个 Subscriber 抛错不得让 Agent run 失败。

### 候选 E-AD10

> 一个 Subscriber 失败不得阻止其他 Subscriber 接收同一 Event。

### 候选 E-AD11

> Runtime 提供最小 `subscribe()` API，并返回 unsubscribe function；不实现 EventEmitter 风格的 once、priority、filter、removeAll 等扩展能力。

### 候选 E-AD12

> Subscriber collection 属于 AgentRuntime execution infrastructure（运行时执行基础设施），不进入 RuntimeState，也不参与 Session persistence。

---

# 你会发现现在 VII-E 已经很像 Pi 那种轻量设计了

到目前为止，我们真正需要的机制可能就是：

```text
AgentEvent union
+
Subscriber function
+
Set<Subscriber>
+
emit(event)
+
几个明确 emit 点
```

代码量可能真的很少。

但是背后已经锁定了：

```text
Event ≠ State
Observer ≠ Controller
Observation failure ≠ Runtime failure
Event payload ≠ mutable Runtime reference
Subscriber ≠ async scheduling system
```

这才是这一节真正值钱的地方。

---

下一步我们进入 **E-5：AgentEvent 的具体数据模型怎么设计**。

也就是开始收敛：

```text
run_started
run_finished
model_turn_started
model_turn_completed
tool_execution_started
tool_execution_completed
```

这些到底：

- 用 discriminated union（可辨识联合类型）还是 class hierarchy（类继承）；
- 每个 Event payload 最小需要什么；
- 要不要 `runId / turn / timestamp / sequence`；
- `tool_execution_completed` 应该携带 `ToolResult` 还是 Runtime `tool_result` message；
- `model_turn_completed` 应该携带 `ModelResponse` 还是已经写入 State 的 `model_output`。

这一轮收敛完，Architecture Analysis 基本就可以结束，进入正式 **Design Decision**。

## Turn 5

### User

继续

### ChatGPT

继续。现在进入 **E-5：AgentEvent 的具体数据模型**。这一轮结束后，VII-E 的 Architecture Analysis（架构分析）基本就完整了。

先给结论倾向：

> 第一版最适合用 **discriminated union（可辨识联合类型）** 表达 Event，而不是 class hierarchy（类继承）；事件种类保持 Run / Model Turn / Tool Execution 三层，payload 只放观察所需的最小数据。

这和你前面说的“Pi 这一块很轻量”是同一个方向。

---

## 1. 为什么我更倾向 discriminated union

概念上类似：

```ts
type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | { type: "model_turn_completed"; ... }
  | { type: "tool_execution_started"; ... }
  | { type: "tool_execution_completed"; ... }
  | { type: "run_finished"; ... };
```

而不是：

```ts
abstract class AgentEvent {}

class RunStartedEvent extends AgentEvent {}
class ToolStartedEvent extends AgentEvent {}
...
```

原因很简单。

Event 本质上是**数据**，不是一组拥有复杂行为的对象。

Subscriber 通常就是：

```ts
switch (event.type) {
  case "tool_execution_started":
    ...
}
```

TypeScript 的 discriminated union 对这种模式天然合适：

```text
数据结构简单
+
类型缩窄清晰
+
没有继承层级
+
方便 exhaustive check（穷尽检查）
```

如果现在做 class：

```text
BaseAgentEvent
RunEvent
ModelEvent
ToolEvent
...
```

基本没有带来真实收益。

这会明显违反我们整个 Part VII 的原则：

> 没有真实复杂度，就不要通过抽象制造复杂度。:chatgpt-content-reference{index="0"}

所以这一点我认为已经很稳。

---

# 2. `run_started` 应该携带什么？

最简单：

```ts
{
  type: "run_started"
}
```

是否需要：

```ts
{
  userInput: string
}
```

我倾向**不需要**。

因为调用方本身就是：

```ts
runtime.run(userInput)
```

它已经知道输入。

而且一旦 Event 再复制 user input，就开始有一种倾向：

```text
State 里有什么
Event 就复制什么
```

我们前面已经明确不想这么做。

---

## 那 `runId` 呢？

也先不要。

当前：

- 没有 Single Active Run；
- 没有 Run persistence；
- 没有 Event persistence；
- 没有分布式 trace。

VII-F 才讨论 Single Active Run。

现在为了 Event 提前加：

```ts
runId: string
```

其实没有真实 owner。

问题会马上出现：

```text
谁生成 runId？
是否进入 RuntimeState？
是否跨恢复保持？
SessionStore 是否保存？
```

这会把 VII-G 也拖进来。

所以第一版：

```text
run_started
```

可以极轻。

---

# 3. `run_finished` 应该携带什么？

这个我认为比较明确：

> 直接携带当前已有的 `RunOutcome`。

因为它正好回答：

```text
这次 run 为什么结束？
```

例如当前已有：

```text
completed
unsupported
limit_reached
```

所以：

```ts
{
  type: "run_finished",
  outcome: RunOutcome
}
```

是非常自然的。

这里不需要再定义：

```ts
RunCompletedEvent
RunUnsupportedEvent
RunLimitReachedEvent
```

否则是在重复 `RunOutcome` 已经表达的领域语言。

这也符合增量演进：

> VII-E 应该复用 VII-B / VII-C 已有 Runtime vocabulary（运行时词汇），而不是重新造一套 termination vocabulary（终止词汇）。

---

# 4. `model_turn_started` 应该携带什么？

这里最容易产生一个冲动：

```ts
{
  turn: 1,
  snapshot: TurnSnapshot
}
```

我目前都不建议。

### 不放 Snapshot

因为 Snapshot 可能包含：

```text
完整 conversation
tool definitions
```

既大，又会让 Event Contract 强耦合 VII-D 内部上下文结构。

UI 想显示：

```text
“正在思考”
```

根本不需要知道所有 Context。

Logger 如果未来真的需要 Model Request tracing（模型请求追踪），可以另外讨论 Debug / Telemetry 级能力。

VII-E 第一版没必要。

所以：

```ts
{
  type: "model_turn_started"
}
```

甚至就够了。

---

## `turn` number 要不要？

我们上一轮已经分析过。

目前：

```text
Model Turn 串行
```

所以：

```text
started
completed
started
completed
```

天然可配对。

没有并发 model turn。

因此第一版不必为方便日志而创造：

```ts
turn: number
```

将来如果真的需要 trace / correlation（关联），再加。

---

# 5. `model_turn_completed` 应该携带什么？

这个是第一个真正值得仔细定的 payload。

有两个主要候选。

### 方案 A：携带 `ModelResponse`

```ts
{
  type: "model_turn_completed",
  response: ModelResponse
}
```

### 方案 B：携带写入 State 的 `model_output`

例如：

```ts
{
  type: "model_turn_completed",
  message: ModelOutputMessage
}
```

我更倾向 **方案 B**。

为什么？

因为 `AgentEvent` 是 Runtime Event。

我们前面已经确定：

```text
provider.generate()
↓
Runtime 接受结果
↓
写 model_output
↓
emit completed
```

所以 Event 最自然应该表达 Runtime 接受之后形成的事实。

也就是：

```text
RuntimeMessage
```

而不是 Provider 层的：

```text
ModelResponse
```

这能维持一个很漂亮的分层：

```text
ModelProvider
      ↓ ModelResponse
AgentRuntime
      ↓ normalize / write fact
RuntimeState.model_output
      ↓
AgentEvent
```

换句话说：

> **Event 应优先使用 Runtime language（运行时语言），而不是 Provider language（模型供应层语言）。**

这跟 VII-A 当时把厂商 SDK 类型隔离在 Provider Adapter 后面，本质是同一个设计思想。

---

## 这对 UI 也更自然

比如 final response：

```ts
event.message.content
```

Tool Call：

```ts
event.message.toolCalls
```

外部观察到的是 Runtime 已经接受的 assistant message。

而不是：

```ts
ModelResponse
```

里面可能还有 Provider execution contract（调用契约）相关字段。

---

# 6. `tool_execution_started` 应该携带什么？

这里我认为至少必须知道：

```text
执行的是哪个 Tool Call
```

最自然的现有领域对象就是：

```ts
ToolCall
```

因此候选：

```ts
{
  type: "tool_execution_started",
  toolCall: ToolCall
}
```

这样 Subscriber 可以知道：

```text
id
name
arguments
```

例如 UI：

```text
正在查询 get_weather
```

Debug：

```text
get_weather({"city":"Tokyo"})
```

而不需要：

```text
ToolDefinition
Tool implementation
ToolRegistry
```

所以这是一个非常合适的最小 payload。

---

# 7. `tool_execution_completed` 携带什么？

这里有两个非常重要的候选：

### A. `ToolResult`

来自 ToolExecutor：

```ts
{
  type: "tool_execution_completed",
  result: ToolResult
}
```

### B. Runtime 写入的 `tool_result` message

```ts
{
  type: "tool_execution_completed",
  message: ToolResultMessage
}
```

我仍然倾向 **B**。

理由和 Model Turn 一样。

链路是：

```text
ToolExecutor
↓
ToolResult
↓
AgentRuntime 封装
↓
RuntimeMessage(tool_result)
↓
写 State
↓
emit
```

既然 Event 是 Runtime-level Observation（运行时级观察），它最好携带最终进入 Runtime State 的事实。

这样 UI / Logger 观察到的：

```text
toolCallId
result
error contract
```

与模型下一轮最终会看到的事实保持一致。

这非常重要。

否则可能发生：

```text
ToolExecutor return object
        ↓
Runtime serialize / normalize
        ↓
State 保存另一种 shape
```

如果 Event 发的是前者，Subscriber 看到的和 Agent 后续推理看到的不是同一个语义层。

所以：

> **Event 应尽量观察 Runtime committed fact（运行时已提交事实），而不是中间组件返回值。**

---

# 8. Started / Completed 的 payload 不需要完全对称

这里容易有一种“类型洁癖”：

```ts
tool_started { toolCall }
tool_completed { toolCall, result }
```

或者两个都塞很多东西。

其实没必要追求形式对称。

例如：

```text
tool_execution_started
→ ToolCall
```

因为执行前只有 Call。

而：

```text
tool_execution_completed
→ ToolResultMessage
```

结果事实里本身已经有：

```text
toolCallId
```

如果 `ToolResultMessage` 已经足够关联原 ToolCall，就没必要再把整个 ToolCall 重复放一次。

这要根据当前真实类型最终检查。

原则就是：

> 不重复 Event payload 中已经可以从当前事实表达的信息。

---

# 9. 时间戳 `timestamp` 要不要加？

这也是 Observability（可观测性）系统最常见的诱惑。

例如：

```ts
{
  type: "...",
  timestamp: Date.now()
}
```

看起来成本极低。

但我仍然倾向第一版不要。

因为一旦加入 timestamp，你实际上开始承诺：

```text
它代表开始时间？
结束时间？
emit 时间？
State commit 时间？
wall clock 还是 monotonic clock？
```

以后测试还会多出时间非确定性。

当前 VII-E 目标是：

```text
execution ordering
```

而不是：

```text
performance tracing
```

顺序同步 Event 已经天然提供。

所以：

```text
timestamp
duration
latency
```

都应该先留给真正 Telemetry（遥测）需求。

---

# 10. `sequence` 呢？

同理不要。

当前单 Runtime 同步 emit，本身就是有序流：

```text
event[0]
event[1]
event[2]
```

Subscriber 自己接收的顺序就是 sequence。

没有必要显式再放：

```ts
sequence: 5
```

---

# 11. Error Event 要不要有？

比如：

```text
provider_error
subscriber_error
runtime_error
```

我目前倾向：

> **VII-E 第一版先不要增加通用 `error` Event。**

这个判断可能乍一看有点反直觉。

但原因是当前 Runtime 对 error 已经有非常明确的行为：

```text
Provider error
→ throw

Runtime invariant error
→ throw
```

VII-E 如果现在加入：

```text
error event
```

马上要回答：

```text
emit error 后还 throw 吗？
error event 是 before throw 还是 after？
subscriber 可以处理 error 吗？
handled 意味着不 throw 吗？
```

一下就又和 Control Flow 混在一起。

而 Subscriber 自身 error 我们又已经决定不应该影响 Runtime。

所以第一版可以只观察成功进入生命周期的节点。

对于真正抛出的异常，调用者本来就通过：

```ts
try {
  await runtime.run(...)
} catch (error) {}
```

观察。

等未来 Observability 真要求统一 failure events，再单独设计。

---

# 12. maxTurns skipped 的 Tool Event 怎么处理？

这是一个很重要的边界测试。

当前 VII-C 行为是：

最后一个 Model Turn 返回 Tool Calls，但已经达到上限：

```text
不执行 Tool
↓
写 TOOL_EXECUTION_SKIPPED tool_result
↓
返回 limit_reached
```

:chatgpt-content-reference{index="1"}

这时候应该发：

```text
tool_execution_started
tool_execution_completed
```

吗？

我认为 **不应该**。

因为 Tool 根本没执行。

这是我们 E-2 已经确定的核心语义：

```text
Tool Call
≠
Tool Execution
```

所以 skipped 流程可能是：

```text
model_turn_completed
↓
Runtime 写 skipped tool_result
↓
run_finished(limit_reached)
```

没有：

```text
tool_execution_started
```

这其实非常好。

它证明 Event Model 没有把：

```text
所有 tool_result
```

错误等同成：

```text
tool executed
```

---

## 那 skipped result 外部完全观察不到了吗？

它仍然存在：

```text
RuntimeState
```

而且 `run_finished` 告诉你：

```text
limit_reached
```

第一版我认为够了。

如果以后 UI 明确需要显示：

```text
“工具未执行：达到最大轮数”
```

那时候我们可以讨论：

```text
tool_call_skipped
```

但现在没有真实需求，不应增加 Event。

---

# 13. Tool not found / invalid arguments 呢？

当前 ToolExecutor 会把这些转成 Tool Error Contract，再形成 `tool_result` 回流模型。:chatgpt-content-reference{index="2"}

它们在语义上确实进入了：

```text
ToolExecutor.execute(call)
```

所以：

```text
tool_execution_started
↓
tool_execution_completed
```

仍然成立。

只是 completed 中的 `tool_result` 是失败结果。

这非常漂亮。

我们不需要再造：

```text
tool_execution_failed
```

因为成功 / 失败已经属于：

```text
ToolResultMessage
```

自身的业务语义。

也就是说 Event type 描述 lifecycle：

```text
tool execution completed
```

payload 描述 outcome：

```text
success / error
```

这比：

```text
tool_execution_success
tool_execution_error
```

更克制。

---

# 到这里 Event Model 已经非常清晰了

第一版候选基本可以收敛为：

```text
AgentEvent

├─ run_started
│
├─ model_turn_started
│
├─ model_turn_completed
│    └─ committed model_output
│
├─ tool_execution_started
│    └─ toolCall
│
├─ tool_execution_completed
│    └─ committed tool_result
│
└─ run_finished
     └─ RunOutcome
```

不增加：

```text
runId
turnId
timestamp
sequence
metadata
snapshot
provider request
context event
tool definition
general error event
```

这已经相当轻量了。

---

# E-5 候选 Architecture Decisions

可以再加几条候选：

**E-AD13**

> `AgentEvent` 使用 TypeScript discriminated union（可辨识联合类型）表达，不建立 class hierarchy / EventBus 类型体系。

**E-AD14**

> Event 使用 Runtime-level vocabulary（运行时层语言）：Model completed 携带 Runtime 已接受的 `model_output`，Tool completed 携带 Runtime 已写入的 `tool_result`，而不是直接暴露 Provider / ToolExecutor 中间返回对象。

**E-AD15**

> Event 不默认增加 `runId`、`turnId`、`timestamp`、`sequence`、`metadata` 等 Observability 元数据；第一版依赖同步事件顺序与现有 `toolCallId` 满足关联。

**E-AD16**

> Tool lifecycle Event 只描述真实 Tool execution；达到 `maxTurns` 后产生的 skipped Tool Result 不伪装成 tool execution event。

---

## Architecture Analysis 到这里其实已经完成了

我们从 E-1 到 E-5 已经回答了：

```text
E-1 Event 是什么
E-2 哪些生命周期值得 Event 化
E-3 Event 在什么时候发、引用如何隔离
E-4 Subscriber 的同步/错误/订阅契约
E-5 Event 的具体数据模型
```

而且全过程都没有碰：

```text
Abort
Streaming
Session
Approval
Retry
Event persistence
Telemetry framework
```

符合总体规划的 VII-E 边界。:chatgpt-content-reference{index="3"}

下一步按照我们的固定流程，就应该从：

**Architecture Analysis → Design Decision**

正式把目前散落的 16 条候选结论压缩成少数真正稳定的 **E-ADxx Architecture Decisions（架构决策）**，再确定：

- 最小 Public Contract；
- Scope / Out of Scope；
- Acceptance Criteria；
- 哪些只是实现建议，不值得成为 Architecture Decision。

我建议下一轮就正式做这个收敛，不再继续发散。

## Turn 6

### User

继续

### ChatGPT

好，我们现在正式进入 **Design Decision（设计决策收敛）**。

这一阶段不再继续增加新想法，而是把前面 E-1～E-5 的候选结论压缩成少数真正需要长期稳定下来的 Architecture Decisions（架构决策），并明确：

- 最小 Public Contract（公开契约）
- Scope（范围）
- Out of Scope（范围外）
- Acceptance Criteria（验收标准）
- 哪些只是实现建议，不值得上升成架构决策

基于当前 VII-D 已确认的边界：`AgentRuntime` 仍然拥有 Control Flow（控制流）和 State Mutation（状态修改），`RuntimeState` 仍是 messages-only，VII-E 只是增加 observation（观察）能力，不改变既有执行语义。:chatgpt-content-reference{index="0"}

---

# 一、先把前面的 16 条候选压缩

我不建议真的保留 16 条 E-AD。

太碎了。

真正影响后续实现和未来 Milestone 的，我认为可以压缩成 **7 条正式 Architecture Decisions**。

---

# E-AD01：AgentEvent 是 Observation，不是 State，也不是 Control

这是 VII-E 最核心的决策。

正式定义：

> `AgentEvent` 用来描述 Runtime 中已经发生、并且值得被外部观察的 lifecycle facts（生命周期事实）。Event 不进入 `RuntimeState`，也不作为 Runtime 后续执行的事实源。

因此：

```text
RuntimeState
= source of truth（事实源）

AgentEvent
= observation channel（观察通道）
```

不允许变成：

```text
Event → rebuild Runtime
```

也不允许：

```text
Subscriber → return something → 控制 Runtime
```

这同时排除了：

- Event Sourcing（事件溯源）
- Approval
- Abort
- Tool Policy
- Middleware Control

这些都不是 VII-E。

---

# E-AD02：Event Model 只描述 Runtime-level lifecycle

正式采用三层：

```text
Run
Model Turn
Tool Execution
```

也就是第一版候选 Event 只有：

```text
run_started
model_turn_started
model_turn_completed
tool_execution_started
tool_execution_completed
run_finished
```

不暴露：

```text
context_built
registry_lookup
provider_adapter_called
state_append
schema_validation_started
```

因为这些属于 implementation detail（实现细节）。

这样即使未来内部实现变化：

```text
ContextBuilder → ContextPipeline
ToolExecutor 内部换 validator
ProviderAdapter 重构
```

UI Event Contract 都不需要变化。

---

# E-AD03：Completed Event 只在 Runtime Fact 已成立后发

这个非常值得成为正式决策。

例如 Model：

```text
Provider.generate()
↓
得到结果
↓
写 model_output 到 RuntimeState
↓
emit model_turn_completed
```

Tool：

```text
ToolExecutor.execute()
↓
得到结果
↓
写 tool_result 到 RuntimeState
↓
emit tool_execution_completed
```

也就是说：

> completed event 表示 committed runtime fact（已提交运行事实），不是“某个内部函数刚返回”。

因此可以形成一个非常强的语义：

```text
收到 model_turn_completed
⇒ 对应 model_output 已经进入 RuntimeState
```

```text
收到 tool_execution_completed
⇒ 对应 tool_result 已经进入 RuntimeState
```

这个一致性以后 Debug 和 UI 都很有价值。

---

# E-AD04：Subscriber 是同步 Observer，不参与 Runtime Scheduling

第一版正式采用：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

不支持：

```ts
(event) => Promise<void>
```

作为 Runtime 官方契约。

原因不是 async 做不到，而是：

> VII-E 不让观察者进入 Runtime critical path（主执行路径）。

否则：

```text
Logger 慢
→ Agent 慢
```

或者：

```text
Runtime 不 await
→ 顺序 / rejection / 生命周期变复杂
```

都属于额外调度问题。

所以 v1：

```text
emit
↓
同步通知 subscribers
↓
继续 Runtime
```

足够。

---

# E-AD05：Subscriber Failure 与 Runtime Failure 解耦

这个也应该正式锁定。

> 单个 Subscriber 抛错不能导致 Agent run 失败，也不能阻止其他 Subscriber 收到同一个 Event。

所以概念上：

```text
AgentEvent
├─ subscriber A ❌
├─ subscriber B ✅
└─ subscriber C ✅
```

而不是：

```text
A throws
↓
整个 Runtime fail
```

这样：

```text
Observation failure
≠
Execution failure
```

Provider / ToolExecutor 仍然属于主执行链。

Subscriber 不是。

至于具体是：

```text
console.error
```

还是静默隔离，目前我认为不需要升级成 Architecture Decision。

这是 Implementation Detail（实现细节），Codex 可以按项目最小方式处理，但不能让 error 冒泡破坏 Runtime。

---

# E-AD06：Event payload 使用 Runtime language，并保持引用隔离

这条把前面两件事情合起来。

第一：

Event payload 应优先使用 Runtime 已接受的对象语义。

例如：

```text
model_turn_completed
→ committed model_output

tool_execution_completed
→ committed tool_result
```

而不是直接暴露：

```text
ModelResponse
ToolExecutor internal result
```

这样 Event Contract 属于 Runtime，不属于某个 Provider / Executor。

第二：

Subscriber 拿到的 payload 不能直接持有可污染 Runtime State 的 mutable reference（可变引用）。

所以：

```text
Subscriber 修改 event
≠
修改 RuntimeState
```

这和 VII-D 的 Reference Isolation（引用隔离）完全连续。:chatgpt-content-reference{index="1"}

---

# E-AD07：第一版不增加 Observability Metadata

不新增：

```text
runId
turnId
timestamp
sequence
metadata
duration
traceId
```

原因不是这些没用，而是：

> 当前 Runtime 还没有真实需要这些字段的机制。

目前：

- Model Turn 串行
- Tool Call 有自己的 `toolCall.id`
- Subscriber 同步接收事件
- Event 不持久化
- 无分布式 tracing
- 无性能 telemetry

所以自然顺序已经足够。

等未来真正有：

```text
parallelism
event persistence
distributed tracing
performance metrics
```

再引入。

---

# 二、哪些候选结论不需要单独成为 Architecture Decision？

前面有一些结论是对的，但没必要单独编号。

例如：

### Tool skipped 不产生 execution event

这是 E-AD02 的直接结果。

因为：

```text
Tool Call
≠
Tool Execution
```

达到 `maxTurns` 后只是写：

```text
TOOL_EXECUTION_SKIPPED
```

但没有真正调用 ToolExecutor。

因此自然没有：

```text
tool_execution_started
tool_execution_completed
```

不需要单独 AD。

---

### Subscriber collection 不进入 RuntimeState

这是 E-AD01 的直接结果。

Subscriber 属于：

```text
AgentRuntime execution infrastructure
```

不是：

```text
conversation fact
```

无需再单独编号。

---

### 不实现 `once / priority / filter`

属于 Scope Control（范围控制）。

不需要上升成架构原则。

---

# 三、VII-E 最小 Public Contract

现在可以开始谈具体 API shape（形状）了。

仍然不是最终代码，只是在 Design Decision 阶段锁定最小契约。

---

## 1. `AgentEvent`

我建议用 TypeScript discriminated union（可辨识联合类型）。

概念上类似：

```ts
type AgentEvent =
  | RunStartedEvent
  | ModelTurnStartedEvent
  | ModelTurnCompletedEvent
  | ToolExecutionStartedEvent
  | ToolExecutionCompletedEvent
  | RunFinishedEvent;
```

具体可以直接 inline：

```ts
type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | {
      type: "model_turn_completed";
      message: ModelOutputMessage;
    }
  | {
      type: "tool_execution_started";
      toolCall: ToolCall;
    }
  | {
      type: "tool_execution_completed";
      message: ToolResultMessage;
    }
  | {
      type: "run_finished";
      outcome: RunOutcome;
    };
```

这里只是概念示意。

Codex 最终要基于真实类型名调整。

---

# 2. `AgentEventSubscriber`

最小：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

不建立：

```ts
interface Subscriber {}
class Subscriber {}
```

没有行为价值。

---

# 3. `subscribe()`

我建议：

```ts
subscribe(
  subscriber: AgentEventSubscriber
): () => void
```

也就是：

```ts
const unsubscribe = runtime.subscribe(event => {
  ...
});

unsubscribe();
```

不需要：

```ts
unsubscribe(subscriber)
```

不需要：

```text
once
removeAll
priority
event filter
```

这个 API 足够轻。

---

# 4. Event producer 放在哪里？

仍然是：

```text
AgentRuntime
```

因为它拥有 execution lifecycle（执行生命周期）。

不建立：

```text
AgentEventBus
EventDispatcher
EventManager
EventHub
```

第一版完全没有必要。

概念上可能只需要：

```ts
#emit(event: AgentEvent): void
```

一个私有方法。

这就够了。

---

# 四、每个 Event 的最小 payload

我们现在把它再明确一点。

---

## `run_started`

建议：

```ts
{
  type: "run_started"
}
```

不带：

```text
userInput
runId
timestamp
```

---

## `model_turn_started`

建议：

```ts
{
  type: "model_turn_started"
}
```

不带：

```text
TurnSnapshot
ModelRequest
turn number
Provider
```

第一版 UI 只需要知道：

> Runtime 开始一次模型推理。

---

## `model_turn_completed`

建议携带：

```text
Runtime 已写入 State 的 model_output
```

而不是：

```text
raw ModelResponse
```

概念上：

```ts
{
  type: "model_turn_completed",
  message: modelOutputMessage
}
```

---

## `tool_execution_started`

建议携带：

```ts
{
  type: "tool_execution_started",
  toolCall
}
```

这样外部知道：

```text
tool call id
tool name
arguments
```

已经够了。

---

## `tool_execution_completed`

建议携带：

```text
Runtime 已写入 State 的 tool_result message
```

概念上：

```ts
{
  type: "tool_execution_completed",
  message: toolResultMessage
}
```

Tool Error 也继续使用同一个事件。

不新增：

```text
tool_execution_failed
```

因为 success / failure 已经由 tool result 自己表达。

---

## `run_finished`

建议：

```ts
{
  type: "run_finished",
  outcome
}
```

直接复用现有：

```text
RunOutcome
```

不再重复定义 completed / unsupported / limit_reached 三套 event。

---

# 五、一个重要问题：Provider throw 时有没有 `run_finished`？

这个地方我们还需要做一个明确选择。

当前 Provider Error 的 VII-C contract 是：

> 原异常向上传播。:chatgpt-content-reference{index="2"}

假设：

```text
run_started
↓
model_turn_started
↓
Provider throws
↓
run() throws
```

要不要发：

```text
run_finished
```

？

我倾向：

> **不要。**

原因是我们刚才把：

```text
run_finished
```

定义为：

> Runtime 正常形成 `RunOutcome` 并结束。

而 Provider throw 并没有形成：

```ts
RunOutcome
```

如果硬发：

```text
run_finished
```

就要开始给它新增：

```text
outcome = failed
```

但当前根本没有：

```ts
RunOutcome = failed
```

这等于 VII-E 借机修改 VII-B / VII-C termination model。

不应该。

所以第一版：

```text
run_started
model_turn_started
Provider throw
↓
run throws
```

Event stream 会“断在这里”。

调用者通过：

```ts
try {
  await runtime.run(...)
} catch (error) {
  ...
}
```

知道失败。

这符合我们前面不引入通用 Error Event 的结论。

这点我认为应该进入 Acceptance Criteria，但不必新增 AD。

---

# 六、Tool Execution Exception 怎么办？

这里跟 Provider 不一样。

当前 VII-C 已经明确：

```text
Tool execution exception
↓
ToolExecutor 转成 Tool Error Contract
↓
写 tool_result
↓
继续 Agent Loop
```

所以：

```text
tool_execution_started
↓
ToolExecutor catches execution failure
↓
Runtime 写 tool_result(error)
↓
tool_execution_completed
```

完全合理。

也就是说：

```text
tool_execution_completed
```

不是：

> tool 成功了

而是：

> 这次 Tool Execution 已经产生最终 Runtime result。

这可能是：

```text
success
```

也可能：

```text
error
```

这个语义很干净。

---

# 七、VII-E Scope

现在可以正式锁死实现范围。

本节只允许增加：

```text
AgentEvent
AgentEventSubscriber
subscribe / unsubscribe
private event emission
关键 Runtime lifecycle emit points
相关测试
```

可能修改：

```text
src/runtime/agent-runtime.ts
```

可能新增：

```text
src/runtime/agent-event.ts
```

具体路径由当前项目风格决定。

---

# 八、Explicit Out of Scope

这部分我建议后面 Codex Task 里写得非常强。

VII-E 不实现：

```text
❌ Token Streaming
❌ ModelProvider streaming contract
❌ Async Subscriber protocol
❌ Event persistence
❌ Event replay
❌ Event sourcing
❌ EventBus framework
❌ Middleware
❌ Hook system
❌ Subscriber return-value control
❌ Abort
❌ Single Active Run
❌ Reentrancy protection
❌ SessionStore
❌ Conversation Recovery
❌ beforeToolCall
❌ Approval
❌ Retry / Resume
❌ OpenTelemetry
❌ Metrics aggregation
❌ tracing system
❌ timestamp / duration
❌ runId / turnId / traceId
❌ event filtering
❌ subscriber priorities
```

尤其：

> **不为了 Event 修复并发 run。**

因为 Single Active Run 是 VII-F。:chatgpt-content-reference{index="3"}

---

# 九、Acceptance Criteria

我认为 VII-E 最少应该通过以下测试。

### A. 正常无 Tool Run

事件顺序：

```text
run_started
model_turn_started
model_turn_completed
run_finished
```

---

### B. 正常 Tool Loop

例如：

```text
run_started

model_turn_started
model_turn_completed

tool_execution_started
tool_execution_completed

model_turn_started
model_turn_completed

run_finished
```

并且 State 顺序仍然：

```text
user_input
model_output(tool call)
tool_result
model_output
```

---

### C. Multiple Tool Calls

当前顺序执行：

```text
tool A started
tool A completed
tool B started
tool B completed
```

Event 顺序必须与 ToolExecutor 真实执行顺序一致。

---

### D. Tool Error

例如：

```text
tool not found
invalid args
execute throws
```

只要进入 ToolExecutor：

```text
tool_execution_started
tool_execution_completed(error result)
```

不能因为失败结果另造 Event 类型。

---

### E. maxTurns / skipped

达到最后 Turn：

```text
model_turn_completed(tool_calls)
```

然后写 skipped tool results。

但由于 Tool 没真正执行：

```text
不得出现 tool_execution_started / completed
```

最终：

```text
run_finished(limit_reached)
```

---

### F. Subscriber 能收到 detached payload

Subscriber 主动修改：

```text
event.message
event.toolCall
event.outcome
```

不能污染：

```text
RuntimeState
原 ToolCall
原 Runtime facts
```

---

### G. 一个 Subscriber 抛错

例如：

```text
Subscriber A throws
Subscriber B records event
```

结果：

```text
Runtime 正常继续
Subscriber B 仍收到 event
```

---

### H. unsubscribe

```text
subscribe A
emit event 1
unsubscribe
emit event 2
```

A 只能收到：

```text
event 1
```

---

### I. Provider Error

流程：

```text
run_started
model_turn_started
Provider throws
```

必须继续保持：

```text
原 Provider error 向上传播
```

不能因为 Event 系统改造成：

```text
run_finished
unsupported
subscriber error
```

之类新的 termination。

---

### J. VII-D Regression

必须继续保证：

```text
ContextBuilder 每 turn 重建
Snapshot isolation
Tool loop
maxTurns
skipped
cross-run history
Provider Error propagation
```

全部不回归。

---

# 十、Design Decision 收敛后的整体架构

VII-E 后我们大致得到：

```text
                           AgentRuntime
                                │
                      owns control flow
                                │
       ┌────────────────────────┼───────────────────────┐
       │                        │                       │
       ▼                        ▼                       ▼
 RuntimeState             ContextBuilder          ToolExecutor
 runtime facts            context projection      tool execution
       │                        │                       │
       └────────────────────────┴───────────────────────┘
                                │
                        lifecycle observations
                                │
                                ▼
                           AgentEvent
                                │
                                ▼
                    AgentEventSubscriber[]
                        /         |          \
                       UI       Logger       Debug
```

最核心的 ownership：

```text
AgentRuntime
= control flow + State mutation + event production

RuntimeState
= source of truth

ContextBuilder
= model context projection

ToolExecutor
= tool execution boundary

AgentEvent
= runtime observation data

Subscriber
= passive observer
```

而不是：

```text
Subscriber
= Runtime controller
```

---

到这里我认为 **VII-E 的 Design Decision 已经收敛完成**。

下一步按照固定流程就是：

**Codex Implementation**

也就是我基于这次最终结论，为你生成一份：

**📋 Codex Implementation Task — Part VII-E：AgentEvent + Subscriber**

结构继续沿用我们前几个 Milestone 已经固定的：

```text
1. Milestone Goal
2. Current Repository State
3. Confirmed Design Decisions
4. Required Implementation
5. Tests / Acceptance Criteria
6. Explicit Out of Scope
7. Suggested File Scope
8. Implementation Constraints
9. Verification
10. Required Final Report
11. Definition of Done
```

而且不会再让 Codex 自己重新做事件架构设计。

## Turn 7

### User

继续

### ChatGPT

下面这份可以直接交给 Codex 执行。它只基于我们刚刚已经收敛完成的 VII-E Design Decisions，不再让 Codex 重新做事件系统设计。当前基线继续沿用 VII-D：`AgentRuntime` 拥有控制流和状态修改，`RuntimeState` 保持 messages-only，`ContextBuilder` 每个 Model Turn 构建独立 Snapshot。:chatgpt-content-reference{index="0"}

:::writing{variant="document" id="58341" title="Codex Implementation Task — Part VII-E：AgentEvent + Subscriber"}
# 📋 Codex Implementation Task — Part VII-E：AgentEvent + Subscriber

## 1. Milestone Goal

当前进入 **Part VII-E：AgentEvent + Subscriber**。

本 Milestone 的目标不是增加新的 Agent 控制能力，而是在现有 Runtime 上建立一个最小、清晰、稳定的 **Observation Channel（观察通道）**，让 Runtime 外部能够观察执行过程。

目标链路：

```text
AgentRuntime
    ↓ runtime lifecycle
AgentEvent
    ↓
Subscriber
    ↓
UI / Logger / Debug / Observability
```

完成后应满足：

- Runtime 的关键生命周期可以通过 `AgentEvent` 对外观察；
- 外部可以注册 `Subscriber` 消费事件；
- Subscriber 只是 Observer（观察者），不拥有控制 Runtime 的能力；
- Event 不成为新的 Runtime State，也不用于重建 Runtime；
- Event emission 不改变 VII-A ～ VII-D 已有的执行语义；
- 不提前实现 Abort、Approval、Session、Streaming 等后续能力。

第一版保持轻量，不构建复杂 Event Bus、Telemetry Framework 或 Middleware 系统。

---

## 2. Current Repository State

进入 VII-E 前，当前仓库已经完成 VII-A ～ VII-D。

### Runtime Layer

当前 `RuntimeState` 仍保持最小事实模型：

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

`AgentRuntime`：

- 是 Runtime State 的唯一 mutation owner；
- 负责 `run()`；
- 负责 Model Loop；
- 负责调用 `ContextBuilder`；
- 负责调用 `ModelProvider`；
- 负责解释 `finishReason`；
- 负责调用 ToolExecutor；
- 负责写入 `user_input`、`model_output`、`tool_result`；
- 负责返回 `RunOutcome`。

### Context Layer

VII-D 已完成：

```text
RuntimeState
    ↓
ContextBuilder
    ↓
TurnSnapshot
    ↓
ModelRequest
    ↓
ModelProvider
```

每个 Model Turn 都重新基于最新 Runtime facts 构建独立 `TurnSnapshot`。

Snapshot 包含：

```text
messages
tools
```

并保证 Reference Isolation（引用隔离）。

### Tool Layer

当前已经支持：

- Tool Registry；
- Tool Executor；
- Tool Error Contract；
- Tool not found；
- invalid arguments；
- execution exception；
- multiple tool calls 顺序执行；
- mixed success / failure；
- Tool Result 回流 RuntimeState。

### Runtime termination

当前已有：

```text
completed
unsupported
limit_reached
```

Provider error 与 Runtime invariant error 继续向上传播。

达到最后一个 Model Turn 后，如果模型仍返回 tool calls：

- 不执行工具；
- 写入 `TOOL_EXECUTION_SKIPPED` tool results；
- 返回 `limit_reached`。

这些全部属于已确认行为，本 Milestone 不重新设计。

---

## 3. Confirmed Design Decisions

以下为本 Milestone 已确认的最终架构决策，不要重新提出替代架构。

### E-AD01：AgentEvent 是 Observation，不是 State，也不是 Control

`RuntimeState` 是 Runtime source of truth（事实源）。

`AgentEvent` 是 Runtime observation channel（观察通道）。

关系：

```text
Runtime execution
   ├─ writes RuntimeState
   └─ emits AgentEvent
```

不要实现：

```text
Event → rebuild RuntimeState
```

不要让 Subscriber 返回值影响：

- 是否继续 run；
- 是否执行 Tool；
- 是否允许 Tool；
- 是否修改 ModelRequest；
- 是否修改 RuntimeState；
- 是否终止 Runtime。

Event / Subscriber 不是 Abort、Approval、Policy、Middleware 或 Hook 系统。

---

### E-AD02：Event Model 只描述 Runtime-level lifecycle

第一版只围绕以下三个层级：

```text
Run
Model Turn
Tool Execution
```

事件集合保持最小：

```text
run_started
model_turn_started
model_turn_completed
tool_execution_started
tool_execution_completed
run_finished
```

不要暴露内部组件调用细节，例如：

```text
context_built
registry_lookup
provider_adapter_called
state_append
schema_validation_started
```

Event 描述“Runtime 发生了什么”，而不是“内部哪个 class 被调用了”。

---

### E-AD03：Completed Event 在对应 Runtime Fact 已写入 State 后发出

对于会形成 Runtime fact 的 lifecycle：

#### Model Turn

顺序应保持：

```text
provider.generate()
↓
Runtime 接受 response
↓
写入 model_output
↓
emit model_turn_completed
```

#### Tool Execution

顺序应保持：

```text
ToolExecutor.execute()
↓
Runtime 得到最终 Tool Result
↓
写入 tool_result
↓
emit tool_execution_completed
```

因此：

```text
收到 model_turn_completed
⇒ 对应 model_output 已经进入 RuntimeState
```

```text
收到 tool_execution_completed
⇒ 对应 tool_result 已经进入 RuntimeState
```

Started Event 则应在 Runtime 真正决定进入该动作时发出。

例如：

```text
emit tool_execution_started
↓
ToolExecutor.execute()
```

不要在 LLM 仅产生 Tool Call 时误发 execution started。

---

### E-AD04：Subscriber 是同步 Observer

第一版 Subscriber contract 保持同步：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

不要将以下形式作为 Runtime 正式 Subscriber contract：

```ts
(event: AgentEvent) => Promise<void>
```

Runtime 不等待异步 Subscriber。

不要引入 Subscriber scheduler、queue 或 background task system。

---

### E-AD05：Subscriber Failure 与 Runtime Failure 解耦

单个 Subscriber 抛错：

- 不得导致 Agent `run()` 失败；
- 不得改变 `RunOutcome`；
- 不得阻止其他 Subscriber 接收到同一个 Event。

概念上：

```text
AgentEvent
├─ Subscriber A throws
├─ Subscriber B still receives event
└─ Subscriber C still receives event
```

Subscriber observation failure 不等于 Runtime execution failure。

具体错误记录方式保持最小，不要因此引入新的 Error Framework。

---

### E-AD06：Event Payload 使用 Runtime language，并保证引用隔离

Event payload 应优先表达 Runtime 已经接受的领域事实。

例如：

```text
model_turn_completed
→ committed model_output
```

```text
tool_execution_completed
→ committed tool_result
```

不要直接把 Provider / ToolExecutor 的内部中间对象当成 Event public contract。

同时必须保证：

```text
修改 Event payload
≠
修改 RuntimeState
```

Subscriber 不得通过 Event 中的可变引用间接修改：

- Runtime messages；
- ToolCall；
- Tool Result；
- Registry / definitions；
- 其他 Runtime facts。

第一版要求 Reference Isolation，不要求 deepFreeze / immutable library。

---

### E-AD07：第一版不增加 Observability Metadata

不要新增：

```text
runId
turnId
timestamp
sequence
traceId
duration
metadata
```

当前不建立：

- Event persistence；
- distributed tracing；
- performance tracing；
- parallel Model Turn correlation。

Model Turn 当前串行，ToolCall 已有自身 ID，同步 Event 顺序已经足够。

---

## 4. Required Public Contract

### 4.1 AgentEvent

使用 TypeScript discriminated union（可辨识联合类型）。

概念形态：

```ts
type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | {
      type: "model_turn_completed";
      message: ModelOutputMessage;
    }
  | {
      type: "tool_execution_started";
      toolCall: ToolCall;
    }
  | {
      type: "tool_execution_completed";
      message: ToolResultMessage;
    }
  | {
      type: "run_finished";
      outcome: RunOutcome;
    };
```

以上仅为 contract intent。

请先检查当前仓库中的真实类型名称，不要根据任务文本发明不存在的 `ModelOutputMessage` / `ToolResultMessage` 名称。

如果当前 `RuntimeMessage` 是 discriminated union，请尽量复用并精确缩窄已有 runtime message subtype，而不是复制一套消息类型。

不要使用 class hierarchy，例如：

```text
BaseAgentEvent
RunEvent
ModelEvent
ToolEvent
```

---

### 4.2 AgentEventSubscriber

最小类型：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

不要新增：

```text
Subscriber interface
Subscriber class
AsyncSubscriber
SubscriberResult
```

---

### 4.3 subscribe()

在 `AgentRuntime` 上提供最小订阅能力：

```ts
subscribe(
  subscriber: AgentEventSubscriber
): () => void
```

使用方式：

```ts
const unsubscribe = runtime.subscribe(event => {
  // observe
});

unsubscribe();
```

不要增加：

```text
once()
off()
removeAllSubscribers()
priority
filter
event-specific listener map
```

---

## 5. Required Event Semantics

### 5.1 run_started

最小：

```ts
{
  type: "run_started"
}
```

发出时机：

```text
run() entered
↓
user_input 已写入 RuntimeState
↓
emit run_started
```

不携带：

```text
userInput
runId
timestamp
```

---

### 5.2 model_turn_started

最小：

```ts
{
  type: "model_turn_started"
}
```

应在当前 Turn 已经准备进入模型调用时发出。

建议顺序：

```text
读取最新 Runtime facts
↓
ContextBuilder.build()
↓
emit model_turn_started
↓
ModelProvider.generate()
```

如果根据当前真实代码存在更自然但语义等价的位置，可以调整，但不得在真正进入 Model Turn 之前误发。

不要暴露：

```text
TurnSnapshot
ModelRequest
Provider instance
turn number
```

---

### 5.3 model_turn_completed

必须在对应 `model_output` 已经正式写入 RuntimeState 后发出。

Event payload 携带 Runtime 已接受的 model output fact。

不要直接携带 raw `ModelResponse`，除非当前真实类型本身已经就是写入 State 的同一 Runtime fact；如果不是，应使用写入 State 后的 Runtime-level representation。

---

### 5.4 tool_execution_started

只有 Runtime 真正进入 Tool execution 时才发。

建议顺序：

```text
确定该 Tool Call 本轮应真实执行
↓
emit tool_execution_started
↓
ToolExecutor.execute()
```

payload 至少能够表达当前 ToolCall：

```text
id
name
arguments
```

优先复用当前已有 `ToolCall` 类型。

---

### 5.5 tool_execution_completed

必须在对应最终 `tool_result` 已经写入 RuntimeState 后发出。

Event 携带 Runtime 已接受的 tool result fact。

Tool 执行成功与失败都使用同一个 Event type：

```text
tool_execution_completed
```

不要新增：

```text
tool_execution_succeeded
tool_execution_failed
```

Tool Error Contract 已经负责表达 success / error outcome。

---

### 5.6 run_finished

只有当前 `run()` 正常形成已有 `RunOutcome` 时发出：

```ts
{
  type: "run_finished",
  outcome
}
```

直接复用现有 `RunOutcome`。

不要拆成：

```text
run_completed
run_unsupported
run_limit_reached
```

---

## 6. Important Edge Semantics

### 6.1 Provider Error

当前 Provider error contract 保持不变：

```text
run_started
model_turn_started
Provider throws
↓
original error propagates
```

不要因为 VII-E：

- 转换错误；
- 新增 failed RunOutcome；
- 新增 unsupported；
- 吞掉错误；
- 强制发 `run_finished`。

如果 `run()` 没有形成合法 `RunOutcome`，第一版不要求发 `run_finished`。

不要为此新增 generic error event。

---

### 6.2 Runtime invariant error

继续保持当前行为。

Event 机制不得改变已有 invariant throw semantics。

不要求新增：

```text
runtime_error
run_failed
```

---

### 6.3 Tool not found / invalid args / execution exception

只要当前流程真实进入 `ToolExecutor.execute()`：

```text
tool_execution_started
↓
ToolExecutor produces Tool Error Contract
↓
Runtime writes error tool_result
↓
tool_execution_completed
```

即使 Tool Result 是失败结果，也仍然是一次 completed Tool Execution lifecycle。

---

### 6.4 maxTurns skipped tools

当前已有行为：

```text
最后 Model Turn
↓
model returns tool_calls
↓
达到 maxTurns
↓
不调用 ToolExecutor
↓
写 TOOL_EXECUTION_SKIPPED results
↓
limit_reached
```

由于工具没有真实执行：

```text
不得发 tool_execution_started
不得发 tool_execution_completed
```

正常应能看到：

```text
model_turn_completed
↓
run_finished(limit_reached)
```

不要新增：

```text
tool_execution_skipped event
```

当前没有这个真实需求。

---

## 7. Required Implementation

### 7.1 新增 AgentEvent 类型

按当前项目目录结构新增最小 event model。

建议检查是否适合类似：

```text
src/runtime/agent-event.ts
```

可以在一个文件中同时放：

```text
AgentEvent
AgentEventSubscriber
```

不要为了少量类型拆成大量文件。

---

### 7.2 AgentRuntime 持有 Subscriber collection

Subscriber 属于 `AgentRuntime` execution infrastructure。

概念上可以使用：

```ts
Set<AgentEventSubscriber>
```

但最终实现方式按现有代码风格决定。

不要加入 `RuntimeState`：

```text
subscribers
events
lastEvent
eventHistory
```

不要持久化 Subscriber。

---

### 7.3 subscribe / unsubscribe

实现：

```ts
subscribe(subscriber): () => void
```

unsubscribe 必须：

- 只移除对应 Subscriber；
- 可以安全停止后续事件通知；
- 不改变 Runtime State。

如果重复调用 unsubscribe，建议保持安全 no-op，但不要为了这一点建立复杂 lifecycle 状态。

---

### 7.4 私有 emit 机制

可以在 `AgentRuntime` 内建立最小私有方法，例如概念上的：

```ts
#emit(event: AgentEvent): void
```

要求：

- 同步通知当前 Subscriber；
- 单个 Subscriber error 隔离；
- 继续通知其他 Subscriber；
- Subscriber error 不向 `run()` 冒泡；
- Event payload 与 Runtime facts 引用隔离。

不要新增：

```text
EventBus
EventDispatcher
EventManager
EventEmitter wrapper
```

除非当前仓库已经存在并明确适用；否则保持最小。

---

### 7.5 Runtime lifecycle 接线

在当前 `AgentRuntime.run()` 的真实执行链中插入事件。

不要为了事件系统重写 Agent Loop。

事件只是附加 Observation side channel（观察旁路）。

VII-D 当前链路必须继续保持：

```text
RuntimeState
↓
ContextBuilder
↓
TurnSnapshot
↓
ModelProvider
↓
State mutation
↓
Tool loop
```

Event emission 只在合适的 lifecycle points 增量接入。

---

## 8. Tests / Acceptance Criteria

必须新增自动化测试，不要只验证类型可以编译。

### 8.1 Normal no-tool run

验证事件顺序：

```text
run_started
model_turn_started
model_turn_completed
run_finished
```

并验证：

```text
run_finished.outcome
```

与实际 `run()` 返回值语义一致。

---

### 8.2 Normal tool loop

例如：

```text
Model Turn 1
→ tool call
→ tool execution
→ Tool Result
→ Model Turn 2
→ final answer
```

Event 顺序必须是：

```text
run_started

model_turn_started
model_turn_completed

tool_execution_started
tool_execution_completed

model_turn_started
model_turn_completed

run_finished
```

同时验证 Runtime message history 仍然保持：

```text
user_input
model_output(tool call)
tool_result
model_output
```

---

### 8.3 Completed Event commit ordering

在 `model_turn_completed` Subscriber 中读取当前 Runtime messages。

必须已经能看到对应 `model_output`。

在 `tool_execution_completed` Subscriber 中读取 Runtime messages。

必须已经能看到对应 `tool_result`。

不要只检查 Event 顺序，要证明 State 已经 committed。

---

### 8.4 Multiple Tool Calls

基于当前顺序 Tool execution：

```text
tool A started
tool A completed
tool B started
tool B completed
```

顺序必须与真实 ToolExecutor execution 一致。

不要为了事件系统改变为并行执行。

---

### 8.5 Tool Error Contract

至少覆盖已有一种或多种：

```text
tool not found
invalid arguments
tool execute throws
```

如果真实进入 ToolExecutor，则：

```text
tool_execution_started
tool_execution_completed
```

completed payload 中应包含 Runtime 已接受的 error tool result。

不要新增失败 Event 类型。

---

### 8.6 maxTurns / skipped

达到最后 Turn 且产生 Tool Calls 时：

- Model Turn Event 正常存在；
- skipped Tool Result 仍正常写入 State；
- 不产生 Tool execution started / completed Event；
- 最终产生 `run_finished(limit_reached)`。

---

### 8.7 Event payload reference isolation

Subscriber 主动修改可修改到的 Event payload，例如：

```text
model message
tool call arguments
tool result
outcome nested value（如果存在）
```

不得污染：

```text
RuntimeState
原 model_output
原 tool_result
原 ToolCall
```

重点保护嵌套引用，不要只测试顶层数组。

不要求 deepFreeze。

---

### 8.8 Subscriber failure isolation

注册至少两个 Subscriber。

Subscriber A：

```ts
throw new Error(...)
```

Subscriber B：

记录 Events。

验证：

- Agent Runtime 正常继续；
- `run()` 结果保持原语义；
- Subscriber B 仍收到同一事件及后续事件。

---

### 8.9 unsubscribe

流程：

```text
subscribe A
↓
发生 Event
↓
unsubscribe A
↓
后续 Event
```

验证 A 只收到 unsubscribe 前的 Event。

---

### 8.10 Provider error regression

Mock Provider throw。

验证：

- `run_started` 已按当前设计发出；
- `model_turn_started` 已按当前设计发出；
- Provider 原错误继续向上传播；
- 不转换成新 RunOutcome；
- 不强制发 `run_finished`；
- Subscriber 机制不吞掉 Provider error。

---

### 8.11 Existing regression suite

所有 VII-A ～ VII-D 既有测试必须继续通过。

尤其不得回归：

```text
ContextBuilder per-turn build
TurnSnapshot isolation
Tool Call / Result pairing
multiple tools
Tool Error Contract
maxTurns
TOOL_EXECUTION_SKIPPED
limit_reached
Provider error propagation
cross-run history
Runtime State ownership
```

不要通过修改已有测试预期来适配错误实现，除非测试确实与当前已确认 Design Decision 冲突，并明确说明。

---

## 9. Explicit Out of Scope

本 Milestone 不实现：

```text
Token Streaming
Provider streaming API
delta / token events
Async Subscriber contract
background subscriber execution
event queue
event persistence
event replay
event sourcing
EventStore
EventBus framework
Middleware
Hook system
Subscriber control return value
Abort
Cancellation
Single Active Run
run lock
reentrancy protection
SessionStore
Conversation Recovery
beforeToolCall
Human Approval
Retry
Resume
Telemetry framework
OpenTelemetry
Metrics aggregation
Tracing framework
runId
turnId
traceId
timestamp
duration
sequence number
event metadata
event filter
subscriber priority
once listener
removeAll listeners
parallel Tool execution
MCP
Multi-Agent
Sub-Agent
Workflow
```

特别强调：

### 不实现 Streaming

当前 `ModelProvider.generate()` 仍然是完整 `ModelResponse` 模式。

本 Milestone 不修改：

```text
ModelProvider Contract
Provider Adapter
OpenAI streaming protocol
message aggregation
```

第一版 UI 可以观察 Runtime lifecycle，但不能获得 token-level stream。

---

### 不实现 Single Active Run

如果 Subscriber 回调主动再次调用：

```ts
runtime.run(...)
```

可能涉及 reentrancy / concurrent run。

这是 VII-F：

```text
Abort + Single Active Run
```

负责的问题。

本 Milestone 不提前增加 run lock。

---

### 不实现 beforeToolCall / Approval

Subscriber 是 Observer，不是 Tool Hook。

不要让：

```text
tool_execution_started
```

Subscriber 返回：

```text
allow / deny
```

Approval 属于 VII-H。

---

## 10. Suggested File Scope

请先检查当前仓库目录和类型组织方式。

预计新增文件类似：

```text
src/runtime/agent-event.ts
```

预计修改：

```text
src/runtime/agent-runtime.ts
```

新增 / 修改测试文件可以按当前项目已有 test organization 放置，例如：

```text
test/agent-event.test.ts
test/tool-runtime.test.ts
```

如果现有测试结构更适合直接扩充现有文件，可以遵循现有风格。

不要为了本 Milestone 创建大量新模块。

---

## 11. Implementation Constraints

1. 必须基于当前真实源码做增量修改。
2. 不重新设计 VII-A ～ VII-D。
3. 不修改 `RuntimeState` schema。
4. `AgentRuntime` 继续拥有 control flow 和 State mutation。
5. `ContextBuilder` 职责不变。
6. `ModelProvider` contract 不变。
7. `ToolExecutor` 和 Tool Error Contract 不变。
8. 不修改现有 `maxTurns` / skipped termination semantics。
9. Subscriber 没有 Runtime control 权。
10. Event payload 必须保护 Runtime facts 的引用边界。
11. 不新增第三方 dependency；本 Milestone 不需要。
12. 保持现有 TypeScript strict / exact optional 等工程约束。
13. 优先复用现有 Runtime types，不复制一套 Model / Tool / Outcome 类型。
14. 不为 Event 系统建立未来扩展框架。

---

## 12. Verification

完成实现后至少执行：

```bash
npm test
npm run build
```

并继续执行当前项目已有的严格 test TypeScript type-check 命令。

如果当前 deterministic Tool Demo 已存在且不需要修改，应确保继续正常运行。

本 Milestone 不要求增加真实外部 LLM Demo。

如果需要验证 Event，可使用 Mock Provider / deterministic Tool 保持测试完全可重复。

---

## 13. Required Final Report

完成后请输出以下内容。

### 修改文件

列出实际新增 / 修改文件，以及每个文件职责。

### Architecture Compliance

逐项说明：

```text
E-AD01
E-AD02
E-AD03
E-AD04
E-AD05
E-AD06
E-AD07
```

分别如何落实。

### Event Contract

列出最终实际实现的 Event union 及 payload。

如果真实源码类型名称与本任务示意不同，请说明如何映射。

### Event Ordering

分别说明：

```text
normal run
tool run
multiple tools
tool error
maxTurns skipped
provider error
```

的实际事件顺序。

### Tests Added

列出新增测试以及每个测试保护的 contract。

### Verification Results

给出真实结果：

```text
npm test
npm run build
strict test type-check
demo（如执行）
```

### Scope Check

明确回答：

- 是否修改 RuntimeState schema；
- 是否修改 ModelProvider contract；
- 是否实现 Streaming；
- 是否实现 async Subscriber；
- 是否实现 Abort / Single Active Run；
- 是否实现 beforeToolCall / Approval；
- 是否新增 EventBus / Middleware / Telemetry；
- 是否改变 VII-C / VII-D 行为。

如果存在任何 Scope 外修改，必须单独说明原因，不要静默扩大范围。

---

## 14. Definition of Done

只有同时满足以下条件，VII-E 才算完成：

- AgentEvent 已成为 Runtime-level Observation contract；
- Subscriber 可以注册和取消；
- Run / Model Turn / Tool Execution 生命周期可观察；
- Event 不进入 RuntimeState；
- Subscriber 不拥有 Runtime control 权；
- Completed Event 在对应 State fact committed 后发出；
- Event payload 不泄露可污染 Runtime State 的引用；
- Subscriber 抛错不导致 run 失败；
- 一个 Subscriber 抛错不阻止其他 Subscriber；
- maxTurns skipped 不伪装成 Tool Execution；
- Provider error 原语义保持；
- RuntimeState schema 不变；
- ModelProvider contract 不变；
- ToolExecutor / Error Contract 不变；
- VII-D ContextBuilder / TurnSnapshot 行为不回归；
- 所有新增和既有测试通过；
- build / strict type-check 通过；
- 没有提前实现 VII-F ～ VII-I 或延期能力。

不要仅以“测试通过”判断完成；最终实现必须同时符合上述 Architecture Decisions。
:::

你现在可以直接把这份交给 Codex。等 Codex 完成后，把它的**实现总结 + 测试结果 + 最新源码 ZIP**发回来，我们就进入下一阶段 **Runtime Verification / Debug → Code Review + Theory Feedback**。
