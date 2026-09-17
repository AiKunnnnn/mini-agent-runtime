# Day 08 · Part VII-E Review, Fix, and Closure — Full ChatGPT Source

> Source type: Full conversation transcript
> Conversation ID: `6aa8fe11-eadc-83e9-951d-26d3f4c62170`
> Conversation title: `Part VII-E`
> Scope: Initial implementation review → synchronous subscriber fix verification → milestone closure
> Retrieval: Codex `read_thread`, 10 turns, chronological reconstruction
> Note: Conversation text is preserved with trailing line whitespace normalized. Uploaded attachment binaries are not embedded; attachment markers and source references remain as returned.

## Turn 1

### User

Codex 已经完成当前 Part 的第一轮实现。

下面是 Codex 的实现总结、修改文件、测试结果以及关键代码 / 文件。

## Codex 的实现总结\修改文件:

已完成 Part VII-E：`AgentEvent + Subscriber`，实现保持为轻量 Observation Channel，没有改变既有 Runtime 执行语义。

## 修改文件

- [agent-event.ts (line 1)]\(/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-event.ts:1)
  - 定义 `AgentEvent` discriminated union。
  - 定义同步 `AgentEventSubscriber`。
- [agent-runtime.ts (line 25)]\(/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts:25)
  - 增加 subscriber collection、`subscribe()`、幂等 unsubscribe。
  - 增加异常隔离的同步 `#emit()`。
  - 接入 Run、Model Turn、Tool Execution 生命周期事件。
  - 每个 subscriber 获得独立的深拷贝 payload。
- [agent-event.test.ts (line 1)]\(/Users/shengq/Desktop/mini-agent-runtime/test/agent-event.test.ts:1)
  - 新增 10 个事件契约和回归测试。

## Architecture Compliance

- **E-AD01**：Event 仅由 Runtime 旁路发出；未写入 `RuntimeState`，subscriber 返回值不参与控制流。
- **E-AD02**：仅包含 Run、Model Turn、Tool Execution 六种 lifecycle event。
- **E-AD03**：`model_turn_completed` 在 `model_output` 写入后发出；`tool_execution_completed` 在 `tool_result` 写入后发出。
- **E-AD04**：Subscriber 类型严格为同步 `(event) => void`；Runtime 不等待 subscriber。
- **E-AD05**：逐 subscriber `try/catch`；一个 subscriber 抛错不会影响 Runtime 或其他 subscriber。
- **E-AD06**：复用 Runtime 领域类型，并对每个 subscriber 单独 `structuredClone`；subscriber 之间及其与 RuntimeState 之间均引用隔离。
- **E-AD07**：未增加 runId、turnId、timestamp、sequence、trace 或 metadata。

## Event Contract

```
type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | {
      type: "model_turn_completed";
      message: RuntimeAssistantMessage;
    }
  | {
      type: "tool_execution_started";
      toolCall: ToolCall;
    }
  | {
      type: "tool_execution_completed";
      message: RuntimeToolMessage;
    }
  | {
      type: "run_finished";
      outcome: RunOutcome;
    };

type AgentEventSubscriber = (event: AgentEvent) => void;
```

任务示意中的 `ModelOutputMessage`、`ToolResultMessage` 映射为仓库现有的精确 subtype：`RuntimeAssistantMessage` 和 `RuntimeToolMessage`。

## Event Ordering

- Normal run：
  `run_started → model_turn_started → model_turn_completed → run_finished`
- Tool run：
  `run_started → model turn completed → tool started → tool completed → model turn completed → run_finished`
- Multiple tools：
  `tool A started → A completed → tool B started → B completed`
- Tool error：
  与成功工具相同，仍发 `tool_execution_started → tool_execution_completed`；错误由现有 Tool Error Contract 表达。
- maxTurns skipped：
  `run_started → model_turn_started → model_turn_completed → run_finished(limit_reached)`；不发任何 tool execution event。
- Provider error：
  `run_started → model_turn_started → 原错误向上传播`；不发 `run_finished`。

## Tests Added

新增测试覆盖：

- Normal run 顺序及 `run_finished.outcome`
- `run_started` 前 user input 已提交
- 完整 tool loop 和 Runtime message history
- Model/Tool completed event 的 commit ordering
- 多工具严格顺序执行
- Tool not found error lifecycle
- maxTurns skipped 不伪装为工具执行
- 嵌套 ToolCall、tool result、outcome 引用隔离
- Subscriber 间 payload 隔离
- Subscriber failure isolation
- 幂等 unsubscribe
- Provider 原始错误传播

## Verification Results

- `npm test`：**60/60 通过**
- `npm run build`：**通过**
- 严格测试 TypeScript type-check：**通过**
  - `strict`
  - `noUncheckedIndexedAccess`
  - `exactOptionalPropertyTypes`
- `npm run demo:runtime`：**通过**
- `npm run demo:tools`：**通过**
- `git diff --check`：**通过**

## Scope Check

- RuntimeState schema：**未修改**
- ModelProvider contract：**未修改**
- Streaming：**未实现**
- Async Subscriber：**未实现**
- Abort / Single Active Run：**未实现**
- beforeToolCall / Approval：**未实现**
- EventBus / Middleware / Telemetry：**未新增**
- VII-C ToolExecutor / Error Contract：**未修改**
- VII-D ContextBuilder / TurnSnapshot：**未修改，既有回归测试全部通过**
- Scope 外修改：**无**
- Git commit：**未创建**

## 测试结果:

➜  mini-agent-runtime git:(main) ✗ npm run demo:runtime

> mini-agent-runtime@0.1.0 demo:runtime
> tsx src/demo/runtime-demo.ts


User: 我叫小明，请简短回复。
RunOutcome: {
  "type": "completed"
}
Runtime history: [
  {
    "type": "user_input",
    "content": "我叫小明，请简短回复。"
  },
  {
    "type": "model_output",
    "content": "你好，小明！"
  }
]

User: 我叫什么名字？请简短回复。
RunOutcome: {
  "type": "completed"
}
Runtime history: [
  {
    "type": "user_input",
    "content": "我叫小明，请简短回复。"
  },
  {
    "type": "model_output",
    "content": "你好，小明！"
  },
  {
    "type": "user_input",
    "content": "我叫什么名字？请简短回复。"
  },
  {
    "type": "model_output",
    "content": "小明。"
  }
]
➜  mini-agent-runtime git:(main) ✗ npm run demo:tools

> mini-agent-runtime@0.1.0 demo:tools
> tsx src/demo/tool-runtime-demo.ts

Provider: deterministic demo (no external LLM)
User: 2 + 3?
Model turn 1: add {"a":2,"b":3}
Tool execute: add(2, 3) = 5
Model turn 2 received tool_result: {"success":true,"result":5}
Final answer: 2 + 3 = 5
RunOutcome: {"type":"completed"}
Model turns: 2
History: user_input -> model_output -> tool_result -> model_output

➜  mini-agent-runtime git:(main) ✗ npm run test

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

✔ normal run emits the minimal lifecycle and its returned outcome (2.399917ms)
✔ tool loop events follow execution and completed events observe committed facts (11.470583ms)
✔ multiple tools emit sequential started/completed pairs in execution order (5.427875ms)
✔ tool error contract still completes the tool execution lifecycle (0.278166ms)
✔ maxTurns writes skipped results without tool execution events (0.246959ms)
✔ each subscriber receives payloads isolated from runtime facts and other subscribers (32.871959ms)
✔ run_finished outcome payload is detached from the returned outcome (0.40625ms)
✔ subscriber failures do not affect the run or other subscribers (0.245583ms)
✔ unsubscribe is idempotent and stops later notifications (0.412167ms)
✔ provider errors propagate unchanged without run_finished (0.482166ms)
✔ completes a normal answer and records runtime facts (2.458917ms)
✔ retains conversation across two runs on the same runtime (0.359709ms)
✔ records missing tool failure and continues within the same run (0.339584ms)
✔ preserves output for length without retry or continuation (0.177792ms)
✔ preserves output for unknown without retry or continuation (0.300708ms)
✔ propagates the original provider throw without retry (0.313041ms)
✔ propagates the original provider reject without retry (0.189167ms)
✔ history copies protect the array, messages, tool calls and nested arguments (0.307333ms)
✔ provider response and request references cannot mutate runtime facts (0.631708ms)
✔ projects all message kinds in order, preserving optional fields and call/result pairing (1.285542ms)
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.1285ms)
✔ later input mutations and builds leave an earlier snapshot unchanged (0.143958ms)
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.236292ms)
✔ maps provider-neutral model messages to OpenAI chat messages (0.810667ms)
✔ maps provider-neutral tool definitions to OpenAI function tools (0.208834ms)
✔ maps OpenAI assistant text to a Runtime assistant message (0.062042ms)
✔ maps an OpenAI function tool call and parses its arguments (0.107708ms)
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.149083ms)
✔ maps known finish reasons and normalizes provider-specific reasons (0.045083ms)
✔ maps OpenAI usage to the Runtime usage model (0.085917ms)
✔ maps a complete OpenAI response without leaking its raw shape (0.056958ms)
✔ happy path uses registry definitions and result in the second turn of one run (14.217375ms)
✔ each turn gets independent complete context from the latest facts and definitions (5.449708ms)
✔ invalid arguments null never invoke execute and allow continuation (4.19625ms)
✔ invalid arguments [] never invoke execute and allow continuation (3.522292ms)
✔ invalid arguments "bad" never invoke execute and allow continuation (3.544125ms)
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.175167ms)
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.154708ms)
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.522041ms)
✔ tool throw becomes an execution failure visible to the next model turn (3.2425ms)
✔ tool reject becomes an execution failure visible to the next model turn (3.283042ms)
✔ tool non-error becomes an execution failure visible to the next model turn (2.600458ms)
✔ multiple calls finish sequentially before the next turn (mixed=false) (5.880375ms)
✔ multiple calls finish sequentially before the next turn (mixed=true) (3.934708ms)
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.435708ms)
✔ maxTurns=3 counts model turns, skips final tools and resets per run (6.593459ms)
✔ maxTurns=default counts model turns, skips final tools and resets per run (4.292042ms)
✔ a run after limit_reached receives paired skipped results before the new user input (0.307792ms)
✔ stop on the last allowed turn still completes (0.16925ms)
✔ invalid maxTurns fails at construction (0.205416ms)
✔ provider failure after tool execution propagates the same error and preserves facts (4.261042ms)
✔ tool argument and result references cannot mutate history (3.333958ms)
✔ registry rejects duplicates, preserves order and isolates schema references (3.284292ms)
✔ provider cannot change the schema used for tool validation (3.965375ms)
✔ invalid schema and async schema are configuration bugs, not invocation failures (5.971416ms)
✔ lookup bugs propagate unchanged (0.254ms)
✔ result serialization bugs propagate outside the execute catch boundary (3.561583ms)
✔ tool_calls without calls is an invariant violation (0.22075ms)
✔ malformed tool_calls (missing) still throws on the final turn (0.155792ms)
✔ malformed tool_calls (empty) still throws on the final turn (0.132375ms)
ℹ tests 60
ℹ suites 0
ℹ pass 60
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 276.4205

## 关键代码 / 文件:如上传的压缩包

**现在请进入：**

**Runtime Verification + Code Review + Theory Feedback**

请不要默认“测试通过 = 架构正确”。

重点帮我检查：

- 是否真正遵守了我们之前确认的 Design Decisions；
- 是否出现了 Codex 擅自扩大 Scope 或提前实现后续能力；
- State ownership、模块职责和依赖方向是否合理；
- Public Contract 是否出现不必要的设计；
- Error / lifecycle / termination 等边界是否存在问题；
- 测试是否只是覆盖 happy path；
- 是否出现为了未来扩展而过度设计；
- 与我们之前学习的 Agent Runtime 理论及 Pi 源码设计相比，有哪些值得重新理解的点。
  -


如果发现问题，请区分：

1. 必须修复；
2. 建议优化；
3. 当前可以接受、以后再处理。
   1.


最后判断当前 Milestone 是否已经满足 Done 条件；如果没有，请再输出一份最小范围的 Codex Fix Task。

[User attached 1 file; file contents were not included]

### ChatGPT

我基于你上传的 **`source-review(4).zip` 真实源码**重新做了 Review，而不是只看 Codex 的总结。结论先说：

> **整体架构是对的，VII-E 没有跑偏；但我发现 1 个需要修复的 Public Contract 边界。修完之后，我会认为这个 Milestone 可以 Done。**

这个问题不是 Event 设计本身，而是 **“我们说 Subscriber 只支持同步函数，但 TypeScript 当前的类型实际上允许 async Subscriber”**。

---

## 一、整体 Review 结论

我逐项对照了 E-AD01～E-AD07。

| 检查项 | 结论 |
|---|---|
| Event ≠ State | ✅ |
| Subscriber ≠ Controller | ✅ |
| Run / Model / Tool 三层 Event | ✅ |
| completed 在 State commit 后发 | ✅ |
| Tool Call ≠ Tool Execution | ✅ |
| skipped 不伪装成 Tool execution | ✅ |
| payload 引用隔离 | ✅，而且比最低要求更强 |
| Subscriber 之间隔离 | ✅ |
| Subscriber throw 不影响其他 Subscriber | ✅ 同步异常场景 |
| Provider error 原样传播 | ✅ |
| RuntimeState schema | ✅ 未修改 |
| ModelProvider contract | ✅ 未修改 |
| VII-D ContextBuilder | ✅ 未碰 |
| Streaming / Abort / Approval / Session | ✅ 均未提前实现 |
| 复杂 EventBus / Middleware | ✅ 没有 |
| 同步 Subscriber contract | ⚠️ **类型上并没有真正成立** |

所以不是“实现有很多问题”。

真正值得修的只有一个。

---

# 二、必须修复：`(event) => void` 不能禁止 async Subscriber

当前：

```ts
export type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

然后：

```ts
#emit(event: AgentEvent): void {
  for (const subscriber of [...this.#subscribers]) {
    try {
      subscriber(structuredClone(event));
    } catch {
      // ...
    }
  }
}
```

看起来完全符合我们确定的：

```text
Subscriber = synchronous Observer
```

但 TypeScript 有一个比较容易忽略的规则。

下面这个 **合法通过类型检查**：

```ts
const subscriber: AgentEventSubscriber = async (event) => {
  throw new Error("async observer failed");
};
```

我用当前源码同版本 TypeScript 5.8 实际验证了这一点。

原因是 TypeScript 对：

```ts
() => void
```

有特殊的返回值兼容规则。

它表示：

> 调用方忽略返回值。

而不是：

> 这个函数绝对不能返回值。

所以：

```ts
() => Promise<void>
```

仍然能赋给：

```ts
() => void
```

甚至：

```ts
() => number
```

也可以。

---

## 这为什么是实际问题，而不是类型洁癖？

因为如果用户写：

```ts
runtime.subscribe(async () => {
  throw new Error("logger failed");
});
```

这里：

```ts
subscriber(...)
```

不会同步 throw。

它返回的是：

```text
rejected Promise
```

所以当前：

```ts
try {
  subscriber(...)
} catch {}
```

**捕获不到。**

也就是说：

```text
E-AD05
Subscriber Failure 与 Runtime Failure 解耦
```

在同步 Subscriber 情况下成立。

但 Public Contract 实际允许的 async Subscriber 下，并不完整成立。

最坏情况可能产生：

```text
Unhandled Promise Rejection
```

甚至影响 Node 进程。

所以 Codex 总结里：

> “Subscriber 类型严格为同步 `(event) => void`”

这句话严格来说是不成立的。

---

# 三、我建议怎样修

不要因此支持 Async Subscriber。

否则我们会反过来扩 Scope：

```text
Promise handling
fire-and-forget
async scheduling
queue
event ordering
```

这正是我们 VII-E 明确不要的东西。

所以正确方向应该是：

> **真正收紧 Public Contract，让 TypeScript 拒绝 async Subscriber。**

一个很小的方案是：

```ts
export type AgentEventSubscriber =
  (event: AgentEvent) => undefined;
```

在当前 TypeScript 版本下：

```ts
runtime.subscribe((event) => {
  console.log(event);
});
```

这种正常无返回 callback 可以成立。

但是：

```ts
runtime.subscribe(async (event) => {
  ...
});
```

会报类型错误，因为：

```text
Promise<void>
≠
undefined
```

同样，这种：

```ts
runtime.subscribe(event => events.push(event));
```

因为 `push()` 返回 `number`，也会被拒绝。

要改成：

```ts
runtime.subscribe(event => {
  events.push(event);
});
```

我反而觉得这个约束是合理的：

> Subscriber 是 pure observation callback（纯观察回调），返回值没有语义，所以应该明确不返回东西。

---

# 四、为什么我把它判定为 Must Fix

如果我们从普通项目 Review：

> 其实也可以先不改。

但按照你这套 Agent Runtime 学习方法，我们每个 Milestone 都在练：

```text
Public Contract
是否真的表达 Architecture Decision
```

这里 Architecture Decision 明确是：

```text
只支持同步 Subscriber
不支持 Async Subscriber protocol
```

但代码写成：

```ts
(event) => void
```

实际上没有表达这个约束。

所以这是一个非常典型的：

> **实现能跑，测试全过，但 Public Contract 没有完全兑现 Architecture Decision。**

这恰好就是你为什么要求：

> 不要默认“测试通过 = 架构正确”。

这个例子非常好。

---

# 五、除此之外，没有 Must Fix

这部分我逐项给你确认。

## 1. Event emit 时机是正确的

Model：

```ts
this.#state.messages.push(output);
this.#emit({
  type: "model_turn_completed",
  message: output
});
```

符合：

```text
State commit
↓
completed event
```

Tool 同样：

```ts
this.#state.messages.push(toolMessage);

this.#emit({
  type: "tool_execution_completed",
  message: toolMessage
});
```

非常准确。

因此 Subscriber 收到 completed Event 时：

```text
对应 Runtime Fact 已经存在
```

这条语义真正落地了。

---

# 六、State ownership 没有被破坏

这个部分我认为 Codex 做得很好。

仍然只有：

```text
AgentRuntime
```

修改：

```text
#state.messages
```

Subscriber 没获得：

```text
RuntimeState
ToolRegistry
ContextBuilder
ToolExecutor
```

的直接控制权。

而：

```ts
#subscribers = new Set<AgentEventSubscriber>();
```

也没有塞进：

```ts
RuntimeState
```

非常正确。

这意味着未来 VII-G 做：

```text
SessionStore
Conversation Recovery
```

时不会出现：

> “Subscriber 要不要持久化？”

这种荒谬问题。

---

# 七、Reference Isolation 做得比最低要求还强

我们原本最低要求其实是：

```text
Event ↔ Runtime facts
```

隔离。

当前实现：

```ts
subscriber(structuredClone(event));
```

而且是在：

```ts
for each subscriber
```

内部 clone。

因此实际得到：

```text
Runtime Fact
   │
   ├── clone → Subscriber A
   │
   └── clone → Subscriber B
```

不仅：

```text
Subscriber A
不能污染 Runtime
```

而且：

```text
Subscriber A
不能污染 Subscriber B
```

测试也确实覆盖了 nested arguments。

这个设计我认为 **当前合理，不属于过度设计**。

Event 体量目前非常小：

```text
message
toolCall
outcome
```

所以每 Subscriber 一次 `structuredClone()` 的成本完全可以接受。

没必要现在优化。

---

# 八、Event Model 足够克制

实际只有：

```text
run_started

model_turn_started
model_turn_completed

tool_execution_started
tool_execution_completed

run_finished
```

没有出现：

```text
context_built
provider_called
state_mutated
tool_lookup
validation_started
```

这一点非常重要。

说明 Codex 没把：

> Runtime 里面每个函数调用

都变成 Event。

Event 仍然表达：

> Runtime lifecycle（运行时生命周期）。

这一点是架构正确的。

---

# 九、Tool Call 与 Tool Execution 的区别也守住了

这里非常值得肯定。

正常：

```text
model_turn_completed(tool_calls)
↓
tool_execution_started
↓
tool_execution_completed
```

但是 `maxTurns`：

```text
model_turn_completed(tool_calls)
↓
写 TOOL_EXECUTION_SKIPPED
↓
run_finished(limit_reached)
```

没有：

```text
tool_execution_started
tool_execution_completed
```

这说明 Event Model 真的表达：

```text
Tool Execution
```

而不是：

```text
出现了 Tool Call
```

这对 VII-H Approval（人工审批）特别重要。

以后：

```text
LLM requests tool
↓
Approval
↓
真正允许执行
↓
tool_execution_started
```

当前 VII-E 不需要重构 Event 语义。

这是一个好的前置设计。

---

# 十、Provider Error / termination 也正确

当前：

```text
run_started
↓
model_turn_started
↓
provider.generate throws
↓
原 error propagate
```

不会虚构：

```text
run_finished
```

也没有偷偷新增：

```text
failed RunOutcome
```

正确。

这守住了 VII-C：

```text
Provider error propagation
```

没有借 Event 系统重新设计 termination。

---

# 十一、测试不是只覆盖 Happy Path

这一点可以明确给 Codex 通过。

它覆盖了：

```text
normal run
tool loop
multiple tools
tool error
maxTurns skipped
payload mutation
subscriber mutation
subscriber throw
unsubscribe
provider throw
```

尤其：

```text
completed Event commit ordering
```

不是普通的“事件数组等不等于某几个字符串”，而是真的在 Subscriber 里面：

```ts
runtime.getMessages()
```

确认 State 已经写入。

这个测试质量不错。

---

# 十二、建议优化：`agent-event.ts ↔ agent-runtime.ts` 存在类型级循环依赖

现在：

```ts
agent-event.ts
→ import type RunOutcome from agent-runtime.ts
```

同时：

```ts
agent-runtime.ts
→ import type AgentEvent from agent-event.ts
```

形成：

```text
agent-runtime
      ↓
agent-event
      ↓
agent-runtime
```

不过全部是：

```ts
import type
```

所以不会形成 JavaScript runtime circular dependency（运行时循环依赖）。

因此：

> **不是 Must Fix。**

但从 architecture dependency（架构依赖）角度不是最漂亮。

真正的关系应该更像：

```text
Runtime Contracts
  ├── RunOutcome
  └── AgentEvent

AgentRuntime
   ↓
uses contracts
```

而不是：

```text
AgentEvent
↓
depends on concrete AgentRuntime module
```

---

## 要不要现在为了这个拆 `run-outcome.ts`？

我的建议：

**现在不要。**

因为目前只有一个 `RunOutcome`。

如果现在只是为了消除一条 `import type`：

```text
run-outcome.ts
runtime-types.ts
contracts.ts
```

又开始增加文件和抽象。

这和我们一直坚持的：

> 第二个真实需求出现再抽象

冲突。

所以把它记录成：

### 建议优化 / 当前接受

以后如果 VII-F / VII-G 又出现更多：

```text
RunState
RunId
RunStatus
RunHandle
```

再把 Runtime Contract 抽出来。

---

# 十三、当前可以接受，以后再处理

还有几个点我不会让你这轮改。

### Subscriber error 目前静默吞掉

```ts
catch {
}
```

从生产 Observability（可观测性）看，这确实不够。

因为 Logger subscriber 挂了可能没人知道。

但我们 VII-E 明确没有实现：

```text
SubscriberErrorHandler
Telemetry
Logger framework
```

所以现在属于：

> 当前接受。

以后如果真的做工业级 Observability，再讨论：

```text
onSubscriberError
error reporter
metrics
```

不要现在加。

---

### Event clone 每 Subscriber 一次

理论上可能：

```text
100 subscribers
→ clone 100 次
```

但现在：

```text
Subscriber 数量极少
Event payload 极小
```

没必要优化。

接受。

---

### Subscriber callback 中重入 `runtime.run()`

依旧可能出现。

例如：

```ts
runtime.subscribe(() => {
  runtime.run("B");
});
```

但这是：

```text
Reentrancy
Single Active Run
```

明确属于 VII-F。

**不要在 VII-E 修。**

---

# 十四、和我们之前 Agent Runtime 理论的映射

这一节其实再次证明了你前面总结过的那条规律：

> Agent Runtime 很多设计，本质上仍然是传统软件工程，只是作用在 LLM Runtime 上。

VII-E 最典型。

它没有什么“AI 魔法”。

本质上就是经典：

**Observer Pattern（观察者模式）**

```text
Producer
↓
Event
↓
Observers
```

但是 Agent Runtime 带来了新的语义问题：

```text
Tool Call ≠ Tool Execution

Model Response returned
≠
Runtime fact committed

Observation failure
≠
Agent execution failure
```

真正值钱的是这些边界，而不是：

```ts
Set<Subscriber>
```

怎么写。

---

# 十五、和 Pi 学习阶段的关系

这也印证了你一开始说的：

> “我记得 Pi Agent 这部分设计挺轻量。”

我们现在 Mini Runtime 最终也只是：

```text
AgentEvent union
Subscriber function
Set<Subscriber>
emit()
几个 lifecycle point
```

而不是一套复杂 Observability Platform。

这和我们之前分析 Pi 时形成的认知是一致的：

> Core（核心）负责提供事件机制；Logger、UI、展示逻辑属于外部消费者，而不是反向塞回 Core。

因此你可以把这一节形成一句非常重要的认知：

> **Runtime 应该可观察，但“可观察”不等于 Runtime 自己负责所有观察用途。**

Core 只负责：

```text
发生了什么 → Event
```

外面决定：

```text
Event
├─ UI 怎么显示
├─ Logger 怎么记录
└─ Metrics 怎么统计
```

这是一种非常典型的：

**Mechanism（机制）与 Policy（策略）分离。**

---

# 十六、最终分类

## 1. 必须修复

只有 **1 项**：

> **同步 Subscriber Public Contract 没有真正约束 async callback。**

当前：

```ts
(event) => void
```

允许：

```ts
async (event) => {}
```

现有 `try/catch` 无法捕获异步 rejection。

建议收紧 Subscriber 类型，并增加 compile-time contract / 对应测试。

---

## 2. 建议优化

只有一个轻量观察：

> `agent-event.ts` type-import `RunOutcome`，同时 `agent-runtime.ts` type-import `AgentEvent`，形成类型级 circular dependency。

当前完全可接受。

不要为此单独重构。

---

## 3. 当前可以接受、以后再处理

包括：

- Subscriber failure 静默吞掉；
- 每 Subscriber `structuredClone()`；
- Runtime reentrancy；
- Concurrent run 事件交错；
- async observation infrastructure；
- timestamp / tracing / metrics；
- Event persistence。

它们分别属于未来 Observability 或 VII-F 之后的问题。

---

# 十七、Milestone 是否 Done？

我目前判断：

> **VII-E：架构主体已经正确，但暂时还不能正式 Closure。**

原因不是 Runtime Event 本身有问题，而是我们明确确认过的：

```text
Subscriber = synchronous Observer
```

还没有被 Public Contract 真正兑现。

这是一个非常小的 Fix。

修完以后，如果：

```text
原 60 tests
+
新增 sync contract test
+
build/type-check
```

全部通过，我认为 **无需第二轮大 Review，可以直接判 VII-E Done**。

---

下面这份就是最小范围 Codex Fix Task。

:::writing{variant="document" id="24617" title="Codex Fix Task — Part VII-E Subscriber Sync Contract"}
# 📋 Codex Fix Task — Part VII-E：Enforce Synchronous Subscriber Contract

## 1. Fix Goal

当前 Part VII-E 主体实现已经通过 Review。

本次只修复一个 Public Contract 问题：

> Architecture Decision E-AD04 明确规定 `AgentEventSubscriber` 是同步 Observer，但当前 `(event: AgentEvent) => void` 在 TypeScript 中仍允许 `async` callback，因此类型契约并未真正禁止 Promise-returning Subscriber。

不要重新设计 Event / Subscriber 系统。

---

## 2. Confirmed Problem

当前：

```ts
export type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

TypeScript 允许：

```ts
const subscriber: AgentEventSubscriber = async (event) => {
  throw new Error("async subscriber failed");
};
```

因为 Promise-returning callback 可以赋给 void-returning callback。

这意味着当前 Public Contract 并没有真正实现：

```text
Subscriber = synchronous Observer only
```

同时当前：

```ts
try {
  subscriber(event);
} catch {}
```

只能隔离同步 throw，无法捕获 rejected Promise。

---

## 3. Required Fix

收紧 `AgentEventSubscriber` Public Contract，使 Promise-returning / async callback 在 TypeScript 层被拒绝。

优先采用最小实现，不增加：

```text
AsyncSubscriber
Promise handling
background execution
subscriber queue
scheduler
fire-and-forget
```

一个可考虑的最小方向：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => undefined;
```

但请基于当前 TypeScript 5.8 / repository strict settings 验证实际行为后再采用。

目标必须满足：

正常同步无返回 callback：

```ts
runtime.subscribe((event) => {
  // observe
});
```

合法。

Async callback：

```ts
runtime.subscribe(async (event) => {
  // ...
});
```

在 TypeScript contract 上不合法。

如果 callback 使用表达式产生无意义返回值，例如：

```ts
runtime.subscribe(event => events.push(event));
```

需要按新的 contract 改为显式 block：

```ts
runtime.subscribe(event => {
  events.push(event);
});
```

不要为了兼容这种 incidental return 放宽同步约束。

---

## 4. Tests

新增或调整测试，证明：

### Runtime behavior regression

现有 Subscriber：

```text
normal lifecycle
failure isolation
payload isolation
unsubscribe
```

全部继续通过。

### Type contract

增加适合当前项目测试体系的 compile-time evidence，证明 async Subscriber 不符合 Public Contract。

可以使用项目现有的 strict test TypeScript type-check 方式与 `@ts-expect-error`，不要引入新的 type-testing dependency。

示意：

```ts
// @ts-expect-error async subscribers are intentionally unsupported
const subscriber: AgentEventSubscriber = async () => {};
```

或者采用与仓库当前测试风格更合适的等价验证。

---

## 5. Explicit Out of Scope

本次不要：

```text
支持 async Subscriber
await Subscriber
catch Promise rejection
新增 event queue
新增 background task
新增 SubscriberErrorHandler
修改 AgentEvent types
修改 Event ordering
修改 RuntimeState
修改 ModelProvider
修改 ToolExecutor
实现 Abort / Single Active Run
实现 Streaming
```

---

## 6. Verification

完成后执行：

```text
npm test
npm run build
现有 strict test TypeScript type-check
git diff --check
```

已有 deterministic demos 不需要修改，但如果执行应继续通过。

---

## 7. Required Final Report

只需报告：

1. 修改了哪些文件；
2. 最终 `AgentEventSubscriber` contract；
3. 如何证明 async callback 被类型系统拒绝；
4. 原有 Runtime Event tests 是否全部通过；
5. build / strict type-check 结果；
6. 是否存在任何 Scope 外修改。

不要扩展新的架构设计。
:::

这个 Fix 很小，但很有学习价值：**这正是“TypeScript 类型看起来像表达了架构约束，实际上语言规则没有真的保证它”的典型例子。**

## Turn 2

### User

➜  mini-agent-runtime git:(main) ✗ npm test

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

✔ normal run emits the minimal lifecycle and its returned outcome (2.467334ms)
✔ tool loop events follow execution and completed events observe committed facts (11.804208ms)
✔ multiple tools emit sequential started/completed pairs in execution order (5.672833ms)
✔ tool error contract still completes the tool execution lifecycle (0.287666ms)
✔ maxTurns writes skipped results without tool execution events (0.264292ms)
✔ each subscriber receives payloads isolated from runtime facts and other subscribers (31.410666ms)
✔ run_finished outcome payload is detached from the returned outcome (0.4925ms)
✔ subscriber failures do not affect the run or other subscribers (0.322833ms)
✔ unsubscribe is idempotent and stops later notifications (0.457541ms)
✔ provider errors propagate unchanged without run_finished (0.543375ms)
✔ completes a normal answer and records runtime facts (2.391583ms)
✔ retains conversation across two runs on the same runtime (0.347334ms)
✔ records missing tool failure and continues within the same run (0.337917ms)
✔ preserves output for length without retry or continuation (0.606667ms)
✔ preserves output for unknown without retry or continuation (0.298875ms)
✔ propagates the original provider throw without retry (0.306ms)
✔ propagates the original provider reject without retry (0.174041ms)
✔ history copies protect the array, messages, tool calls and nested arguments (0.295458ms)
✔ provider response and request references cannot mutate runtime facts (0.626042ms)
✔ projects all message kinds in order, preserving optional fields and call/result pairing (1.242083ms)
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.14525ms)
✔ later input mutations and builds leave an earlier snapshot unchanged (0.151959ms)
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.23675ms)
✔ maps provider-neutral model messages to OpenAI chat messages (0.595167ms)
✔ maps provider-neutral tool definitions to OpenAI function tools (0.136583ms)
✔ maps OpenAI assistant text to a Runtime assistant message (0.053042ms)
✔ maps an OpenAI function tool call and parses its arguments (0.1ms)
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.141ms)
✔ maps known finish reasons and normalizes provider-specific reasons (0.043375ms)
✔ maps OpenAI usage to the Runtime usage model (0.081166ms)
✔ maps a complete OpenAI response without leaking its raw shape (0.055166ms)
✔ happy path uses registry definitions and result in the second turn of one run (14.199042ms)
✔ each turn gets independent complete context from the latest facts and definitions (5.867042ms)
✔ invalid arguments null never invoke execute and allow continuation (4.629083ms)
✔ invalid arguments [] never invoke execute and allow continuation (3.759209ms)
✔ invalid arguments "bad" never invoke execute and allow continuation (3.568542ms)
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.328167ms)
✔ invalid arguments {"a":2} never invoke execute and allow continuation (4.048959ms)
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (2.976125ms)
✔ tool throw becomes an execution failure visible to the next model turn (3.981125ms)
✔ tool reject becomes an execution failure visible to the next model turn (3.539042ms)
✔ tool non-error becomes an execution failure visible to the next model turn (2.608083ms)
✔ multiple calls finish sequentially before the next turn (mixed=false) (5.977583ms)
✔ multiple calls finish sequentially before the next turn (mixed=true) (6.422459ms)
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.516625ms)
✔ maxTurns=3 counts model turns, skips final tools and resets per run (3.932292ms)
✔ maxTurns=default counts model turns, skips final tools and resets per run (4.014625ms)
✔ a run after limit_reached receives paired skipped results before the new user input (0.273291ms)
✔ stop on the last allowed turn still completes (0.1505ms)
✔ invalid maxTurns fails at construction (0.200958ms)
✔ provider failure after tool execution propagates the same error and preserves facts (3.74975ms)
✔ tool argument and result references cannot mutate history (3.650084ms)
✔ registry rejects duplicates, preserves order and isolates schema references (3.990458ms)
✔ provider cannot change the schema used for tool validation (3.441917ms)
✔ invalid schema and async schema are configuration bugs, not invocation failures (6.603916ms)
✔ lookup bugs propagate unchanged (0.279833ms)
✔ result serialization bugs propagate outside the execute catch boundary (3.527875ms)
✔ tool_calls without calls is an invariant violation (0.186791ms)
✔ malformed tool_calls (missing) still throws on the final turn (0.173292ms)
✔ malformed tool_calls (empty) still throws on the final turn (0.131083ms)
ℹ tests 60
ℹ suites 0
ℹ pass 60
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 289.408667

[User attached 1 file; file contents were not included]

### ChatGPT

这次修复我已经基于你上传的 **`source-review(5).zip` 真实代码**核对过了。

结论很明确：

> **上一轮唯一的 Must Fix 已经正确修复。Part VII-E 现在可以正式判定为 Done。**

而且这次修复没有扩大 Scope。

---

## 1. Must Fix 是否真正修掉了

当前 `agent-event.ts` 已经从：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => void;
```

改成：

```ts
export type AgentEventSubscriber =
  (event: AgentEvent) => undefined;
```

同时测试里增加了：

```ts
const synchronousSubscriber: AgentEventSubscriber = () => {};

// @ts-expect-error async subscribers are intentionally unsupported
const asynchronousSubscriber: AgentEventSubscriber = async () => {};
```

这正好解决我们上一轮指出的问题：

```text
(event) => void
```

在 TypeScript 中并不能真正排除：

```text
async () => {}
```

而现在：

```text
Promise<void>
≠
undefined
```

因此 Async Subscriber（异步订阅者）会被类型系统拒绝。

这个修复与 E-AD04 完全一致：

> Subscriber 是同步 Observer（观察者），VII-E 不提供 Async Subscriber 协议。

---

## 2. 这个修复没有偷偷变成“支持 async”

这点很重要。

Codex 没有去修改：

```ts
#emit()
```

让它：

```text
await subscriber
Promise.resolve
catch rejection
Promise.all
```

也没有增加：

```text
event queue
scheduler
background task
AsyncSubscriber
```

所以它选择的是：

> **收紧契约，而不是扩大能力。**

这是正确方向。

否则本来一个非常小的 Fix，很容易把 VII-E 重新打开成异步 Event 系统。

---

## 3. 现有 `#emit()` 仍然保持我们之前确定的语义

现在还是：

```ts
#emit(event: AgentEvent): void {
  for (const subscriber of [...this.#subscribers]) {
    try {
      subscriber(structuredClone(event));
    } catch {
      // Observation failures do not affect runtime execution or other subscribers.
    }
  }
}
```

这意味着：

```text
Subscriber
= synchronous observer
```

然后：

```text
同步 throw
↓
当前 subscriber 被隔离
↓
其他 subscriber 继续
↓
Runtime 继续
```

这次类型收紧后，这段 `try/catch` 和 Public Contract 终于一致了。

上一版的问题恰恰是：

```text
Public type 实际允许 async
但 implementation 只处理 sync error
```

现在：

```text
Public Contract
≈
Implementation capability
```

对齐了。

---

## 4. 我也重新检查了其他 Event 行为，没有被这次 Fix 破坏

`run_started` 仍然在 user input 写入之后：

```ts
this.#state.messages.push({
  type: "user_input",
  content: userInput,
});

this.#emit({ type: "run_started" });
```

所以 Subscriber 收到：

```text
run_started
```

时，Runtime State 已经有本次输入。

正确。

---

`model_turn_completed` 仍然是：

```text
provider response
↓
构造 RuntimeAssistantMessage
↓
push RuntimeState
↓
emit model_turn_completed
```

符合我们的 committed fact（已提交事实）定义。

---

`tool_execution_completed` 仍然是：

```text
ToolExecutor.execute
↓
构造 RuntimeToolMessage
↓
push RuntimeState
↓
emit tool_execution_completed
```

同样正确。

---

`maxTurns` skipped 仍然不会伪装成 Tool Execution：

```text
model_turn_completed
↓
写 TOOL_EXECUTION_SKIPPED
↓
run_finished(limit_reached)
```

没有：

```text
tool_execution_started
tool_execution_completed
```

正确。

---

Provider Error：

```text
run_started
↓
model_turn_started
↓
provider throws
↓
原异常传播
```

仍然没有：

```text
run_finished
```

也没有新增：

```text
failed outcome
error event
```

正确。

---

# 5. 测试结果也符合预期

你这次给出的：

```text
60 pass
0 fail
```

说明原来的全部 runtime behavior tests 没有回归。

而源码里新增的：

```ts
// @ts-expect-error async subscribers are intentionally unsupported
const asynchronousSubscriber:
  AgentEventSubscriber = async () => {};
```

主要依赖你们额外执行的 strict TypeScript type-check 来验证。

这一点要注意：

```text
npm test
```

本身通过 `tsx --test` 跑 runtime tests，它不是这条类型契约最核心的证据。

真正证明这个 Fix 正确的是：

> strict TypeScript type-check 时 `@ts-expect-error` 对应位置确实产生预期类型错误。

所以 Closure 记录里最好把这两类证据区分清楚：

```text
Runtime behavior
→ npm test

Compile-time subscriber contract
→ strict TypeScript type-check
```

不要写成“60 个 runtime tests 证明 async subscriber 被拒绝”。

这是两个不同层面的证据。

---

# 6. 还有 Must Fix 吗？

**没有。**

我目前没有发现新的 Must Fix。

上一轮提到的：

```text
agent-event.ts
↔
agent-runtime.ts
```

type-only circular dependency 还存在：

```ts
agent-event.ts
import type { RunOutcome } from "./agent-runtime.ts";
```

同时：

```ts
agent-runtime.ts
import type { AgentEvent } from "./agent-event.ts";
```

但仍然只是：

```text
type-level dependency cycle
```

不会产生 JS runtime cycle。

所以继续维持原判断：

> **当前接受，不值得为了它单独拆 Runtime contracts。**

不要在 Closure 前再修。

---

# 7. 对这次 Fix 的一个额外学习点

这一轮其实特别适合记进你的 Theory Feedback（理论反馈）。

之前我们讲：

> Public Contract 不只是“类型写出来了”，而是这个类型是否真的表达了我们想承诺的语义。

这里就是一个非常典型的例子。

我们想表达：

```text
Subscriber 必须同步
```

直觉上写：

```ts
(event) => void
```

看起来完全合理。

但 TypeScript 对 `void` callback 有特殊 assignability（可赋值性）规则。

所以：

```text
代码看起来对
≠
类型语义真的对
```

最终换成：

```ts
(event) => undefined
```

才真正落实：

```text
No meaningful return
+
No Promise return
```

这是比较典型的 **Type-level Contract（类型层契约）与 Runtime Contract（运行时契约）对齐**。

---

# 8. Part VII-E 最终 Done 判断

现在逐项看 Definition of Done：

| Done 条件 | 状态 |
|---|---|
| AgentEvent 是 Observation Contract | ✅ |
| Subscriber 可注册 / 取消 | ✅ |
| Run 生命周期可观察 | ✅ |
| Model Turn 可观察 | ✅ |
| Tool Execution 可观察 | ✅ |
| Event 不进入 RuntimeState | ✅ |
| Subscriber 无 Runtime control 权 | ✅ |
| Completed Event 在 State commit 后发 | ✅ |
| Event payload 引用隔离 | ✅ |
| Subscriber failure 不导致 run fail | ✅ |
| 单 Subscriber failure 不阻塞其他 Subscriber | ✅ |
| Async Subscriber 被 Public Contract 拒绝 | ✅ |
| skipped 不伪装 Tool Execution | ✅ |
| Provider Error 原语义保持 | ✅ |
| RuntimeState schema 不变 | ✅ |
| ModelProvider contract 不变 | ✅ |
| ContextBuilder / TurnSnapshot 不回归 | ✅ |
| 未提前实现 VII-F～VII-I | ✅ |
| Runtime tests 通过 | ✅ 60/60 |
| Scope expansion | ✅ 无 |

所以：

> **Part VII-E：AgentEvent + Subscriber — Done。**

不需要再生成 Codex Fix Task。

---

## Theory Feedback：这一 Part 最值得带走的 4 个认知

第一，**AgentEvent（Agent 事件）不是思维链，而是 Runtime 可观察生命周期**。

```text
模型内部 reasoning
≠
Runtime event
```

Runtime Event 表达的是：

```text
model turn started
tool execution started
tool execution completed
run finished
```

这些可验证事实。

第二，**Observation（观察）不能反向获得 Control（控制）**。

```text
Subscriber
→ UI / Logger / Debug
```

而不是：

```text
Subscriber
→ allow / deny / abort
```

否则它就不再是 Event 系统，而开始进入 Hook / Policy / Approval。

第三，**“完成”事件最好建立在 committed fact 之上。**

```text
State mutation
↓
completed event
```

这样 UI 与 Runtime State 不会产生短暂语义分裂。

第四，**轻量 Core 的价值不是代码少，而是职责干净。**

最终 VII-E 真正新增的核心东西其实非常少：

```text
AgentEvent union
AgentEventSubscriber
Set<Subscriber>
subscribe()
#emit()
几个 emit points
```

但已经足够让：

```text
UI
Logger
Debugger
Observability consumer
```

建立在 Runtime 之外。

这也和你之前分析 Pi 时得到的感觉一致：Core（核心）只提供 Mechanism（机制），具体怎么展示、记录、分析属于外部 Policy（策略）/ Consumer（消费者）。

如果按我们的固定工程流程，下一步就可以进入 **Milestone Closure**，把 VII-E 的 Architecture Decisions、最终实现、Review Findings、Theory Feedback、Deferred Work 和 **VII-F：Abort + Single Active Run** 的入口统一收尾。

## Turn 3

### User

继续

### ChatGPT

好，我们正式完成 **Part VII-E：AgentEvent + Subscriber — Milestone Closure**。

这一节可以关闭，不需要继续修改代码。

## 1. Milestone 最终状态

**状态：Done**

VII-E 最终完成的核心链路是：

```text
AgentRuntime
    │
    ├── mutate RuntimeState
    │
    └── emit AgentEvent
              │
              ▼
        Subscriber[]
         /    |    \
        UI  Logger  Debug
```

它解决的问题非常明确：

> Runtime 已经能够执行，现在让外部能够观察执行过程，同时不让观察者获得 Runtime 控制权。

当前最终实现没有修改 VII-D 已经建立的 State / Context 边界，也没有改变 VII-C 的 Tool Loop 与 termination semantics（终止语义）。

---

# 2. 最终 Architecture Decisions

VII-E 最终形成 7 条正式决策。

### E-AD01 — Event 是 Observation，不是 State / Control

```text
RuntimeState = Source of Truth（事实源）
AgentEvent   = Observation（观察）
Subscriber   = Consumer（消费者）
```

Event：

- 不进入 `RuntimeState`
- 不用于恢复 Runtime
- 不决定 Loop
- 不允许 / 拒绝 Tool
- 不终止 Run

---

### E-AD02 — Event 只表达 Runtime-level Lifecycle

第一版只有：

```text
run_started

model_turn_started
model_turn_completed

tool_execution_started
tool_execution_completed

run_finished
```

没有把：

```text
ContextBuilder
ToolRegistry
ProviderAdapter
Schema Validator
State append
```

这些内部实现步骤暴露成 Public Event。

---

### E-AD03 — Completed Event 表示 Committed Fact（已提交事实）

Model：

```text
Provider response
↓
写 model_output
↓
model_turn_completed
```

Tool：

```text
ToolExecutor result
↓
写 tool_result
↓
tool_execution_completed
```

因此：

> 收到 completed Event 时，相应事实已经存在于 RuntimeState。

---

### E-AD04 — Subscriber 是同步 Observer

最终 Public Contract：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => undefined;
```

不是：

```ts
(event: AgentEvent) => void
```

后者在 TypeScript 中实际上仍允许 async callback。

所以这次 Review 最后补上的关键点是：

```text
Architecture intention
        ↓
Type-level Contract
        ↓
Runtime behavior
```

三者必须一致。

---

### E-AD05 — Observation Failure ≠ Runtime Failure

一个 Subscriber 抛异常：

```text
Subscriber A ❌
Subscriber B ✅
Subscriber C ✅
```

不会：

```text
→ Agent run fail
```

也不会阻止其他 Subscriber 收到 Event。

---

### E-AD06 — Event Payload 使用 Runtime Language + Reference Isolation

Completed Event 使用的是 Runtime 已经接受的：

```text
RuntimeAssistantMessage
RuntimeToolMessage
```

而不是直接暴露：

```text
raw ModelResponse
ToolExecutor internal result
```

同时每个 Subscriber 得到独立 clone：

```text
Runtime Fact
   ├─ clone → Subscriber A
   └─ clone → Subscriber B
```

Subscriber 修改 Event：

```text
≠
修改 RuntimeState
```

Subscriber A 修改：

```text
≠
影响 Subscriber B
```

---

### E-AD07 — 不提前增加 Observability Metadata

第一版没有：

```text
runId
turnId
timestamp
sequence
traceId
duration
metadata
```

因为目前没有 Event persistence、并行 Model Turn、distributed tracing（分布式追踪）等真实需求。

---

# 3. 最终 Event Contract

最终事件模型保持得非常小：

```ts
type AgentEvent =
  | {
      type: "run_started";
    }
  | {
      type: "model_turn_started";
    }
  | {
      type: "model_turn_completed";
      message: RuntimeAssistantMessage;
    }
  | {
      type: "tool_execution_started";
      toolCall: ToolCall;
    }
  | {
      type: "tool_execution_completed";
      message: RuntimeToolMessage;
    }
  | {
      type: "run_finished";
      outcome: RunOutcome;
    };
```

Subscriber：

```ts
type AgentEventSubscriber =
  (event: AgentEvent) => undefined;
```

订阅：

```ts
const unsubscribe = runtime.subscribe(event => {
  // observe runtime
});

unsubscribe();
```

没有引入完整的 Node `EventEmitter` 模型。

---

# 4. 最终 Runtime Lifecycle

正常无 Tool：

```text
user_input → State

run_started

model_turn_started

ModelProvider.generate()

model_output → State

model_turn_completed

run_finished(completed)
```

正常 Tool Loop：

```text
user_input → State
run_started

model_turn_started
↓
model_output(tool_calls) → State
model_turn_completed

tool_execution_started
↓
ToolExecutor
↓
tool_result → State
tool_execution_completed

model_turn_started
↓
final model_output → State
model_turn_completed

run_finished
```

Multiple Tools：

```text
tool A started
tool A completed

tool B started
tool B completed
```

保持 VII-C 的顺序执行，没有因为 Event 引入并发。

---

# 5. 几个重要边界最终怎么处理

### Tool Call ≠ Tool Execution

LLM 返回：

```text
tool_call
```

并不意味着：

```text
tool_execution_started
```

只有 Runtime 真正准备执行工具时才发 started Event。

因此 `maxTurns` 场景：

```text
model returns tool_calls
↓
达到 maxTurns
↓
写 TOOL_EXECUTION_SKIPPED
```

没有：

```text
tool_execution_started
tool_execution_completed
```

这是非常重要的语义边界。

---

### Tool Error 仍然属于 completed lifecycle

例如：

```text
tool not found
invalid arguments
tool.execute throws
```

如果已经进入 ToolExecutor：

```text
tool_execution_started
↓
Tool Error Contract
↓
error tool_result → State
↓
tool_execution_completed
```

`completed` 表示：

> 本次 Tool Execution 已经形成最终 Runtime Result。

不是：

> Tool 业务执行成功。

---

### Provider Error 不产生假 `run_finished`

```text
run_started
model_turn_started
↓
Provider throws
↓
原异常传播
```

没有：

```text
run_finished
```

因为当前根本没有形成合法 `RunOutcome`。

VII-E 没有借 Event 系统偷偷增加：

```text
failed RunOutcome
error event
retry
```

---

# 6. Code Review 最终结论

### Must Fix

原本只有一个：

```ts
(event) => void
```

无法真正禁止 async Subscriber。

最终已修正为：

```ts
(event) => undefined
```

并通过 `@ts-expect-error` + strict TypeScript type-check 验证。

**Must Fix：0 remaining**

---

### 建议优化

存在一个 type-only dependency cycle：

```text
agent-runtime.ts
      ↓ type
agent-event.ts
      ↓ type
agent-runtime.ts
```

当前不会产生 JavaScript Runtime circular dependency。

所以本轮明确：

> 不为了消除一个 type-only cycle 再拆 `runtime-contracts.ts` / `run-outcome.ts`。

等未来真实 Runtime Contract 增多再决定。

---

### 当前接受、以后再处理

这些都不是 VII-E 的问题：

```text
Subscriber error 目前不建立专门错误报告通道
每 Subscriber 一次 structuredClone
Async observation infrastructure
Event persistence
Event replay
Tracing / Metrics
Concurrent Run event ordering
Subscriber 内重入 runtime.run()
```

尤其：

```text
Concurrent Run
Reentrancy
Single Active Run
```

明确留给 **VII-F**。

---

# 7. Runtime Verification

最终：

```text
npm test
→ 60 pass / 0 fail
```

已有能力全部没有回归：

```text
Provider mapping
RuntimeState ownership
cross-run history
Tool Registry
Tool Executor
Tool Error Contract
multiple tools
maxTurns
TOOL_EXECUTION_SKIPPED
ContextBuilder
TurnSnapshot
Reference Isolation
Provider Error propagation
```

并且新增 Event 测试不仅覆盖 Happy Path，还覆盖：

```text
Tool error
maxTurns
multiple tools
Subscriber mutation
Subscriber failure
unsubscribe
Provider throw
State commit ordering
```

所以 VII-E 的测试边界是合格的。

---

# 📚 8. 下一节学习计划

下一阶段：

# Part VII-F：Abort + Single Active Run

这一节会开始处理 VII-E 刻意没有解决的问题：

```text
同一个 Runtime 能不能同时 run 两次？
```

以及：

```text
一个正在运行的 Agent 怎么被停止？
```

核心预计围绕：

```text
Abort / Cancellation（中止 / 取消）
Single Active Run（单活动运行）
Reentrancy（重入）
Concurrent State Mutation（并发状态修改）
Abort ownership（中止所有权）
Provider / Tool cancellation boundary
```

重点仍然不是直接写 `AbortController`。

而是先问：

> 谁拥有一个 Run 的生命周期？

这会是 VII-F 最核心的架构问题。

---

# 📝 9. 写书 TODO

这一节适合写成：

### 《Agent Runtime 的事件系统为什么不应该是控制系统》

可以组织为：

```text
1. 为什么 Agent Runtime 需要 Event
2. Event ≠ Chain of Thought
3. State 与 Event 的区别
4. Observation 与 Control 的区别
5. Run / Model / Tool 三层 Lifecycle
6. Completed Event 与 Committed Fact
7. Subscriber Failure Isolation
8. TypeScript void callback 的隐藏陷阱
9. 一个 30 行事件系统为什么比复杂 EventBus 更合适
```

其中：

> `(event) => void` 不能真正禁止 async callback

是一个非常好的 TypeScript 工程案例。

---

# 📦 10. 写书素材

可以保留下面这张核心图：

```text
                         AgentRuntime
                              │
                    owns control flow
                              │
      ┌───────────────────────┼──────────────────────┐
      │                       │                      │
      ▼                       ▼                      ▼
RuntimeState             ContextBuilder         ToolExecutor
runtime facts            model projection       tool execution
      │
      └───────────────────────┬──────────────────────┘
                              │
                      lifecycle events
                              │
                              ▼
                         AgentEvent
                              │
                              ▼
                        Subscriber[]
                      /       |       \
                     UI     Logger    Debug
```

以及一句非常适合写书的话：

> Runtime 应该可观察，但“可观察”不意味着 Runtime 自己负责所有观察用途。

---

# 🧠 11. 本 Part 核心认知升级

VII-E 之前，我们的 Runtime 主要回答：

```text
如何运行？
```

现在又多回答了：

```text
外部如何知道它正在做什么？
```

但关键升级不是“加 Event”。

而是：

```text
Execution
≠
Observation
```

进一步：

```text
Runtime Facts
≠
Runtime Events

Tool Call
≠
Tool Execution

Model Response Returned
≠
Runtime Fact Committed

Observation Failure
≠
Execution Failure
```

这些是 VII-E 真正建立的语义边界。

---

# 🏗️ 12. 工业级实现 Industrial Notes

真正工业级 Agent 的 Event 系统以后可能继续发展出：

```text
Tracing（追踪）
Metrics（指标）
Structured Logging（结构化日志）
Token Streaming（Token 流）
Run / Turn correlation
Latency measurement
Distributed traces
Event persistence
Replay
```

但这些都不是“事件机制”本身。

当前 Mini Runtime 做的是最低层机制：

```text
发生事实
↓
产生生命周期 Event
↓
通知 Observer
```

以后工业能力应该建立在这层上，而不是倒过来污染 Runtime Core。

---

# 🧭 13. 知识地图

现在 Part VII 的 Runtime 已经逐渐形成：

```text
VII-A
Model Boundary
    │
    ▼
ModelProvider

VII-B
Execution
    │
    ▼
RuntimeState + Agent Loop

VII-C
Capability Execution
    │
    ▼
Tool Registry + Executor

VII-D
Model Visibility
    │
    ▼
ContextBuilder + TurnSnapshot

VII-E
Runtime Visibility
    │
    ▼
AgentEvent + Subscriber

VII-F
Execution Control
    │
    ▼
Abort + Single Active Run
```

你可以发现：

```text
D = 模型看见什么
E = 外部看见什么
F = 谁能停止 / 控制 Run
```

这三个 Part 连起来非常漂亮。

---

# 🧑‍💻 14. 面试视角

如果面试官问：

> Agent Runtime 为什么需要 Event System？

比较好的回答不是：

> “为了打印日志。”

而是：

> Agent Runtime 本身负责执行循环，但 UI、Logger、Tracing 等上层系统需要观察执行进度。如果直接让这些消费者侵入 Runtime control flow，就会造成 Core 与展示、可观测性耦合。所以可以建立 Runtime-level AgentEvent，通过 Subscriber 作为旁路 Observer 消费。Event 表达 Run、Model Turn、Tool Execution 等生命周期事实，但 Subscriber 不参与 Runtime 控制。

如果继续问：

> 为什么 tool call 不能直接等于 tool execution started？

可以回答：

> Tool Call 只是 LLM 的执行请求，Runtime 可能因为 maxTurns、Approval、Abort 等原因最终不执行。因此 Tool Call 和真实 Tool Execution 必须是两个不同状态。

这一点非常有 Agent Runtime 味道。

---

# ❓ 15. 本章思考题

你可以先自己想，不急着回答。

### 问题 1

以后 VII-H 加 Approval：

```text
LLM tool call
↓
等待用户批准
↓
执行 Tool
```

你觉得应该：

```text
tool_execution_started
```

在 Approval 前发还是批准之后发？

---

### 问题 2

假设以后做 Token Streaming：

```text
token
token
token
```

这些 token delta（增量）应该属于：

```text
AgentEvent
```

还是应该建立另一种 Stream Contract（流契约）？

为什么？

---

### 问题 3

如果未来一个 Subscriber 必须保证：

```text
所有事件一定写入审计日志
否则 Runtime 不能继续
```

它还应该继续叫 Subscriber 吗？

还是已经属于 Runtime 主执行依赖？

这个问题实际上是在检验：

```text
Observation
vs
Execution Dependency
```

的边界。

---

# 🔄 16. 前置问题回收 / Pending Questions

VII-E 回收了几个之前留下的问题：

### Runtime 怎样把内部执行状态暴露给 UI？

✅ 已回收。

通过：

```text
AgentEvent + Subscriber
```

而不是 UI 直接访问 Runtime 私有实现。

---

### Logger / Observability 应该塞进 Runtime 吗？

✅ 已回收。

Core 只产生 Event。

Logger 是 Event Consumer。

---

### Streaming 是不是 Event？

⏸ **仍 Pending。**

VII-E 明确没有实现 Token Streaming。

以后出现真实 Streaming 需求时，再判断：

```text
Lifecycle Event
vs
Streaming Delta
```

是否应该使用同一抽象。

---

### 同时两个 run 怎么办？

⏭ **正式交给 VII-F。**

包括：

```text
Single Active Run
Concurrent State Mutation
Reentrancy
Run ownership
```

---

### 怎么取消正在执行的 Run？

⏭ **正式交给 VII-F。**

下一节会和 Single Active Run 一起处理，而不是孤立地加一个 `AbortController`。

---

至此：

```text
Part VII-A  ✅ Foundation + ModelProvider
Part VII-B  ✅ RuntimeState + Agent Loop
Part VII-C  ✅ Tool Registry + Executor + Error Contract
Part VII-D  ✅ ContextBuilder + TurnSnapshot
Part VII-E  ✅ AgentEvent + Subscriber
Part VII-F  → Abort + Single Active Run
Part VII-G    SessionStore + Conversation Recovery
Part VII-H    beforeToolCall + Approval
Part VII-I    Weather Agent
```

**Part VII-E 正式 Closure。** 下一次直接从 **VII-F Architecture Analysis：一个 Run 到底是谁拥有、如何取消、为什么同一个 Runtime 暂时不能并发执行两个 Run** 开始即可。
