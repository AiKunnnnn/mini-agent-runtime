# Day 08 · Part VII-F Architecture Discussion — Full ChatGPT Source

> Source type: Full conversation transcript
> Public share ID: `6ab0ffa7-4970-83ee-b711-fb31b963e848`
> Backing conversation ID: `6aacda37-701c-83ee-8ba0-0cd01516a01e`
> Conversation title: `Part VII-F`
> Scope: Architecture Analysis → Design Decisions → Codex Implementation Task
> Retrieval: public ChatGPT share page HTML; serialized conversation mapping decoded; current branch reconstructed in chronological order
> Completeness: 117 underlying nodes; 10 user turns on the current branch; all non-empty user and assistant text preserved without per-message truncation
> Note: System messages and redacted tool outputs are omitted. Uploaded attachment binaries are not embedded; attachment names are retained. Trailing line whitespace is normalized.

## Turn 1

### User

我们继续 **Part VII：Mini Agent Runtime Implementation**。

上一阶段 **Part VII-E** 已完成。

我已经提供：

- Part VII 总体规划 / README；
- Part VII-A 最终 Milestone Note；
- 当前 Architecture Decisions（如果存在）。
  -


现在进入：

Part VII-F  [Next]     Abort + Single Active Run

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

[User attached 3 files: README(5).md, day08-part-vii-e-agent-event-subscriber.md, source-review(6).zip; attachment binary contents are not embedded.]

### ChatGPT

我先把 VII-F 的讨论锚在**当前真实源码**上：重点确认现在 `run()` 的并发风险、Provider/Tool 的可取消边界，以及 VII-E Event 在取消场景下应如何保持原有语义。然后我们只讨论 F 的 Architecture Analysis，不碰 VII-G/H。

我已经把你上传的 **Part VII 总体 README、VII-E Milestone Note，以及 `source-review(6).zip` 当前源码**对照检查了一遍。VII-F 的起点很清楚：这一节不是“给 `run()` 加一个 signal 参数”这么简单，而是在第一次真正引入 **Run Control（运行控制）**。

整个 Part VII 的原则仍然是按 Milestone 增量演进，不提前塞工业级能力；VII-F 明确只有 Abort / Cancellation（中止/取消）、Single Active Run（单一活跃运行）、防止同一 Runtime 并发执行和并发写状态。fileciteturn0file0L152-L168 而 VII-E 已经刻意把 Event（事件）限定成 Observation（观察）而不是 Control（控制），所以 VII-F 不能让 Subscriber（订阅者）通过返回值“顺便实现取消”。fileciteturn0file1L89-L95

---

# Part VII-F：Architecture Analysis

我认为这一节真正要解决的不是两个问题，而是下面 **6 个相互关联的架构问题**：

```text
Part VII-F
Abort + Single Active Run

        ┌────────────────────────┐
        │ 1. Run Ownership       │
        │ 谁拥有正在运行的 Run？ │
        └───────────┬────────────┘
                    ↓
        ┌────────────────────────┐
        │ 2. Concurrency Guard   │
        │ 第二个 run() 怎么处理？│
        └───────────┬────────────┘
                    ↓
        ┌────────────────────────┐
        │ 3. Cancellation Model  │
        │ 谁发起取消？怎么传播？ │
        └───────────┬────────────┘
                    ↓
        ┌────────────────────────┐
        │ 4. Cancellation Point  │
        │ 哪些 await 能真正中断？│
        └───────────┬────────────┘
                    ↓
        ┌────────────────────────┐
        │ 5. State Settlement    │
        │ 取消后哪些事实要保留？ │
        └───────────┬────────────┘
                    ↓
        ┌────────────────────────┐
        │ 6. Lifecycle Semantics │
        │ Event / Outcome 怎么表 │
        └────────────────────────┘
```

VII-E 的 Closure 实际上已经把这些问题完整留给了 VII-F：同一个 Runtime 能否同时 `run()` 两次、Subscriber 重入 `run()` 怎么办、谁拥有 active run、Caller 如何取消、Provider / Tool 如何协作取消，以及取消后 committed（已提交）和 uncommitted（未提交）事实如何区分。fileciteturn0file1L691-L706

所以我们的 Architecture Analysis 就沿着这 6 个问题走。

---

## 一、先看当前代码为什么真的存在并发问题

现在 `AgentRuntime.run()` 一进来就：

```ts
this.#state.messages.push({
  type: "user_input",
  content: userInput,
});

this.#emit({ type: "run_started" });
```

然后才开始：

```ts
await this.#provider.generate(...)
```

也就是说，当前没有任何：

```ts
#activeRun
#isRunning
#runController
#runPromise
```

之类的 guard（守卫）。

因此完全可能出现：

```ts
const p1 = runtime.run("A");
const p2 = runtime.run("B");

await Promise.all([p1, p2]);
```

这不是简单的“同时调用两次模型”。

问题在于它们共享的是：

```ts
readonly #state: RuntimeState = {
  messages: []
};
```

于是执行序列可能变成：

```text
Run A
push user A

Run A
build context
await provider...

                Run B
                push user B

                Run B
                build context
                await provider...

Provider B returns
push assistant B

Provider A returns
push assistant A
```

最终 State 可能类似：

```text
user A
user B
assistant B
assistant A
```

但：

```text
assistant B
```

生成时看见的 Context（上下文）和：

```text
assistant A
```

生成时看见的 Context（上下文）并不一定对应这条最终 transcript（对话事实序列）。

这就产生我们之前一直强调的：

> **RuntimeState 已经不再能被解释成一条确定性的 Conversation History（对话历史）。**

这才是 VII-F 要禁止并发 `run()` 的根本原因。

不是因为 JavaScript “多线程不安全”。

Node.js 即便单线程，两个异步 Run 也可以在不同 `await` 之间交错执行。

---

# 二、Architecture Question F-1：谁拥有 Active Run？

这是这一节最先应该定下来的问题。

当前：

```text
AgentRuntime
    │
    ├── owns RuntimeState
    ├── owns Agent Loop
    ├── owns ToolExecutor
    └── owns lifecycle emission
```

VII-B 已经确定：

> `AgentRuntime` 是 Runtime State 的唯一 mutation owner。

README 也保留了这个既有设计。fileciteturn0file0L55-L63

那么 VII-F 最自然的延伸是：

```text
AgentRuntime
    │
    └── owns active Run lifecycle
```

即：

> **一个 AgentRuntime 实例，同一时间最多拥有一个 Active Run（活跃运行）。**

这个概念很重要。

它不是说：

```text
整个系统一次只能跑一个 Agent
```

而是：

```text
runtimeA.run()   ✅
runtimeB.run()   ✅

可以同时进行
```

只禁止：

```text
runtimeA.run("A")
runtimeA.run("B")
```

同时进行。

所以准确术语是：

**Single Active Run per AgentRuntime instance**

即：

**每个 AgentRuntime 实例只允许一个活跃 Run。**

---

## 为什么这一版应该绑定 Runtime，而不是 Session？

你可能注意到 VII-F README 写的是：

> 单会话 Single Active Run

但我们现在还没有 Session（会话）这个实体。

SessionStore（会话存储）是 VII-G 才出现。fileciteturn0file0L161-L168

因此这一版不能提前设计：

```ts
Session {
  activeRun
}
```

也不能设计：

```ts
RunManager
SessionLock
SessionCoordinator
```

当前真实模型是：

```text
AgentRuntime instance
        │
        └── owns one RuntimeState
```

所以 VII-F v1 的 guard（守卫）应该建立在：

```text
AgentRuntime instance
```

这一层。

未来 VII-G 如果出现：

```text
SessionStore
sessionId
Runtime 重建
```

再讨论：

```text
Single Active Run per Session
```

是否需要跨 Runtime instance 保证。

这是两个不同层次的问题。

### VII-F

```text
同一个 Runtime object
不能同时执行两个 run()
```

### 未来如果需要

```text
两个 Runtime object
引用同一个 sessionId
是否也不能并发？
```

后者现在完全不要碰。

---

# 三、Architecture Question F-2：第二次 `run()` 应该怎么办？

确定 Single Active Run（单一活跃运行）之后，第二个问题是：

```ts
runtime.run("A"); // 正在执行

runtime.run("B"); // ?
```

实际上有三个方案。

### 方案 A：自动排队

```text
Run A
 ↓
Run B waits
 ↓
Run A finishes
 ↓
Run B starts
```

看起来用户体验不错，但意味着 Runtime 开始拥有：

```text
queue
scheduler
pending runs
queue cancellation
queue ordering
```

一下子引入了一套调度系统。

明显超出 VII-F。

---

### 方案 B：复用当前 Active Run

例如第二次：

```ts
runtime.run("B")
```

返回 A 的 Promise。

语义明显错误，因为 B 的输入压根没有执行。

淘汰。

---

### 方案 C：Fail Fast（快速失败）

```text
Run A active

run(B)
  ↓
发现已有 active run
  ↓
立即 reject / throw
```

我目前认为这是 Mini Runtime v1 最符合现有架构的方案。

因为它让 Runtime Contract（运行时契约）非常明确：

```text
run()
  │
  ├─ idle   → acquire ownership → execute
  │
  └─ active → reject immediately
```

而不是：

```text
run()
可能现在执行
可能以后执行
可能排队
```

这也与 README 的目标“防止同一 Runtime / Session 并发执行、防止并发状态竞争”完全吻合。fileciteturn0file0L152-L159

所以我先给一个 **候选决策**：

> **F-AD01 候选：AgentRuntime 同一时间只允许一个 Active Run；并发调用 `run()` 时第二个调用 Fail Fast，不排队。**

现在还不正式锁定，等后面的 Abort 生命周期一起看。

---

# 四、一个很容易漏掉的问题：Reentrancy（重入）

Single Active Run（单一活跃运行）不仅是防：

```ts
Promise.all([
  runtime.run("A"),
  runtime.run("B"),
]);
```

还必须防一个更加隐蔽的情况：

```ts
runtime.subscribe((event) => {
  if (event.type === "model_turn_started") {
    runtime.run("B");
  }
});
```

VII-E 的 Subscriber（订阅者）是同步调用：

```ts
subscriber(structuredClone(event));
```

所以这里实际上是在：

```text
Run A
  ↓
emit event
  ↓
Subscriber
  ↓
runtime.run("B")
```

即：

**Reentrant Run（重入运行）**。

VII-E Closure 已经专门把“Subscriber 回调重入 runtime.run() 会发生什么”留给 VII-F。fileciteturn0file1L695-L703

这很好地证明：

> Single Active Run 不能只靠 UI 层“不要同时点按钮”。

必须是 Runtime 自己的 invariant（不变量）。

因为 Runtime Core（运行时核心）必须保护自己的 State Ownership（状态所有权）。

---

# 五、Architecture Question F-3：Abort 到底是什么？

这是这一节第二个核心概念。

Abort（中止）不等于：

```ts
throw new Error("cancelled")
```

它更接近：

> Caller 请求当前 Run 尽快停止继续推进。

关键词是：

**请求**。

这是 Cooperative Cancellation（协作式取消），不是强行 kill。

例如：

```text
Caller
 ↓
AbortController.abort()
 ↓
AbortSignal.aborted = true
 ↓
Runtime / Provider / Tool
在支持的边界感知 signal
 ↓
停止继续工作
```

而不是：

```text
Runtime 从外部强行杀掉 Promise
```

JavaScript 本身也不存在通用：

```ts
promise.kill()
```

这样的机制。

所以 VII-F 本质上会引入：

**Cooperative Cancellation（协作式取消）模型。**

---

# 六、这里出现第一个重要设计岔路：谁创建 AbortController？

有两个可能的 Ownership（所有权）模型。

### 模型 A：Caller 创建

```ts
const controller = new AbortController();

runtime.run("hello", {
  signal: controller.signal,
});

controller.abort();
```

Runtime 只消费：

```ts
AbortSignal
```

不拥有 Controller。

这是 Web API 中非常常见的模式。

---

### 模型 B：Runtime 创建

例如：

```ts
const run = runtime.run("hello");

runtime.abort();
```

内部：

```ts
#activeRunController.abort();
```

这样 Caller 不直接传 `AbortSignal`。

---

### 还有一个混合模型

```ts
runtime.run("hello", {
  signal,
});

runtime.abort();
```

这会立刻产生两个取消来源：

```text
external controller
runtime controller
```

然后你要组合 signal：

```text
AbortSignal.any(...)
```

对于 v1 很可能没必要。

---

# 七、我目前更倾向 Caller owns cancellation request

也就是：

```ts
run(userInput, { signal? })
```

而不是第一版增加：

```ts
runtime.abort()
```

原因不是 API 风格，而是 Ownership（所有权）清晰。

可以形成：

```text
Caller
  │
  └── owns Cancellation Intent
          │
          ↓ AbortSignal
AgentRuntime
  │
  └── owns Run execution
```

即：

```text
Caller decides:
    “我不想让它继续了”

Runtime decides:
    “在哪里安全停止”
```

这和我们之前经常讲的：

```text
Who owns it?
Who decides?
Who changes state?
```

正好对应。

不过这一点后面还需要和 **Single Active Run release（释放 active run）** 一起决定，所以我暂时把它作为：

> **F-AD02 候选：Cancellation 采用 AbortSignal 驱动的 cooperative cancellation；Caller 拥有取消意图，Runtime 负责响应和传播。**

---

# 八、Architecture Question F-4：Signal 要传到哪里？

这是 VII-F 最容易“表面实现 Abort、实际上不能 Abort”的地方。

当前 Agent Loop 有两个真正耗时的 await：

```ts
await this.#provider.generate(request);
```

以及：

```ts
await this.#executor.execute(call);
```

因此如果你只在 Loop 中：

```ts
if (signal.aborted) {
  ...
}
```

那么：

```text
Provider.generate()
正在等 30 秒
```

时 Caller abort：

```text
Runtime 什么也做不了
```

它必须等待 Provider 完成后才能发现：

```ts
signal.aborted === true
```

这只能叫：

```text
Stop before next step
```

不能叫真正的：

```text
Abort propagation
```

---

# 九、因此 Abort 至少有三层

```text
Caller
  │
  │ AbortSignal
  ↓
AgentRuntime
  │
  ├──────────────→ ModelProvider
  │
  └──────────────→ ToolExecutor
                       │
                       ↓
                     Tool
```

这里就出现真正的架构边界。

## 1. Runtime 本身

需要在关键 transition（状态转换）之间检查取消：

```text
before model turn
after model returns
before each tool
after each tool
before next turn
```

---

## 2. ModelProvider

当前接口是：

```ts
interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

没有 Signal。

如果我们要求：

> 正在进行中的 HTTP LLM 请求也能被 Abort

那 Provider contract 必然需要某种取消能力。

可能是：

```ts
generate(
  request: ModelRequest,
  options?: { signal?: AbortSignal },
): Promise<ModelResponse>;
```

或者：

```ts
interface ModelRequest {
  messages: ...
  tools?: ...
  signal?: AbortSignal;
}
```

但这里有一个非常重要的既有边界：

**`ModelRequest` 是模型语义请求。**

目前它只包含：

```ts
messages
tools
```

把：

```ts
AbortSignal
```

塞进去，会让：

```text
Model Context data
```

和：

```text
Execution control
```

混在一起。

VII-D 刚刚辛苦把 ContextBuilder（上下文构建器）负责的模型输入投影定义清楚。README 也明确记录 TurnSnapshot 只覆盖 messages 与 optional tools，没有控制信息。fileciteturn0file0L108-L118

所以我目前明显倾向：

```ts
provider.generate(request, { signal })
```

而不是：

```ts
ModelRequest.signal
```

即：

```text
ModelRequest
= what the model should receive

GenerationOptions
= how this invocation should execute
```

这个区分很重要。

---

# 十、Tool 的 Cancellation 更有意思

当前 Tool contract 最终是类似：

```ts
execute(args): Promise<ToolValue>
```

而 `ToolExecutor`：

```ts
result = await tool.execute(args);
```

现在如果 Runtime Abort：

```text
Runtime
 ↓ abort
Tool 正在：
   fetch()
   sleep()
   query database
   write file
```

Runtime 无法魔法般停止 Tool。

因此 Tool 也需要 Cooperative Cancellation（协作式取消）。

一种自然的演进是：

```ts
tool.execute(args, {
  signal,
});
```

但这里我们必须非常谨慎。

因为 Tool API 是 VII-C 已经确定的 Public Contract（公共契约）。

如果 VII-F 修改它，必须满足：

> 这是实现当前 Abort 需求真正必需的增量，而不是提前设计 ToolContext 大框架。

所以我们现在绝不能顺手搞成：

```ts
ToolExecutionContext {
  signal,
  logger,
  session,
  runtime,
  eventEmitter,
  user,
  metadata,
  tracing,
  approval,
}
```

这就是经典过度设计。

最多讨论：

```ts
execute(args, { signal })
```

或者：

```ts
execute(args, signal)
```

哪一个满足当前需求。

---

# 十一、ToolExecutor 也必须理解 Abort 吗？

这里有个很值得讨论的细节。

当前 `ToolExecutor` 有：

```ts
try {
  result = await tool.execute(args);
} catch (error) {
  return {
    success: false,
    error: {
      code: "TOOL_EXECUTION_FAILED"
    }
  };
}
```

这意味着：

如果 Tool 因为 Abort 抛：

```text
AbortError
```

当前代码会把它转换成：

```text
TOOL_EXECUTION_FAILED
```

然后 Runtime 会：

```text
append tool_result
继续下一轮 LLM
```

这显然不是我们想要的。

因为：

```text
Cancellation
```

和：

```text
Tool business/execution failure
```

不是同一个语义。

因此 VII-F 必然碰到一个新的关键边界：

> **Abort 必须绕过 Tool Error Contract。**

也就是：

```text
Tool throws normal error
       ↓
TOOL_EXECUTION_FAILED
       ↓
append RuntimeToolMessage
       ↓
LLM 可以看到失败


Tool stops because signal aborted
       ↓
propagate cancellation
       ↓
不要伪装 TOOL_EXECUTION_FAILED
       ↓
Run 停止
```

这一点我认为会成为 VII-F 非常重要的一条 Architecture Decision（架构决策）。

---

# 十二、Architecture Question F-5：Abort 以后 State 怎么办？

这是本节最值得学的部分。

假设：

```text
user_input
    ↓ committed

model call
    ↓

assistant tool_call
    ↓ committed

tool A
    ↓ completed + committed

tool B
    ↓ running

Abort
```

Abort 后不能说：

> 这次 Run 什么都没发生。

因为已经发生并提交：

```text
user_input
assistant output
tool A result
```

VII-E 已经确立一个非常重要的原则：

> completed Event 发生时，对应 Runtime fact 已经 committed（提交）。

fileciteturn0file1L161-L187

VII-F 应继续沿用这个原则：

```text
Committed fact
≠
因为后面 Abort 就回滚掉
```

所以：

> **Abort 不应该 rollback（回滚）已经提交的 Runtime facts。**

这与数据库 transaction（事务）并不一样。

我们的 Agent Run 是逐步提交事实：

```text
append user
append model
append tool
append model
...
```

不是：

```text
begin transaction
...
commit whole run
```

---

# 十三、但是又出现一个 tricky case（棘手情况）

假设：

```text
ModelProvider 已经返回
```

Runtime 此时收到 Abort。

那模型结果算不算 committed？

关键看顺序。

现在是：

```ts
const response = await provider.generate(request);

const output = ...

this.#state.messages.push(output);
```

Abort 可以刚好发生在：

```text
await resolve
        │
        ↓
   JS 恢复执行
```

这一刻。

我们必须定义一个稳定规则：

```text
operation returned
        ↓
check abort?
        ↓
commit?
```

还是：

```text
operation returned
        ↓
commit
        ↓
check abort?
```

这不是细节，是 **Settlement Semantics（结算语义）**。

---

# 十四、我的初步倾向：Commit Boundary（提交边界）必须清楚

我们可以把整个 Run 看成：

```text
External work
    ↓
Runtime accepts result
    ↓
Fact commit
    ↓
Next transition
```

Cancellation 的核心原则可以是：

> 一旦 Runtime 已经接受并 commit 某个事实，就不回滚；Abort 只阻止后续未开始或尚未接受的推进。

例如：

```text
Provider returns successfully
        ↓
Runtime receives response
        ↓
append model_output
        ↓
FACT COMMITTED
        ↓
发现 abort / 不再继续 tool
```

这样有一个优势：

VII-E：

```text
model_turn_completed
```

仍然意味着：

```text
model fact committed
```

不会变。

另一种方案是：

```text
Provider returns
 ↓
signal aborted?
 ↓ yes
discard response
```

这同样有道理，但意味着：

```text
Provider 确实完成了
但 Runtime 不接受这个结果
```

我们后面需要专门讨论这一条。

我现在不提前拍板。

---

# 十五、Architecture Question F-6：Abort 是 Error 还是 RunOutcome？

这是本节另一个必须明确的问题。

当前：

```ts
RunOutcome =
  | completed
  | unsupported
  | limit_reached
```

Provider error 则：

```text
throw / reject
```

并且 VII-E 明确：

```text
Provider Error
    ↓
没有合法 RunOutcome
    ↓
没有 run_finished
    ↓
original error propagates
```

fileciteturn0file1L394-L403

现在 Abort 有两个候选语义。

---

## 方案 A：Abort 是异常

```ts
await runtime.run(...)
```

reject：

```text
AbortError
```

那么：

```text
completed
unsupported
limit_reached
```

仍是正常 Outcome。

Cancellation 则属于：

```text
run did not settle normally
```

---

## 方案 B：Abort 是 RunOutcome

```ts
{
  type: "aborted"
}
```

那么：

```text
run_finished({
  type: "aborted"
})
```

它成为一种正常终止。

---

这两种都可以成立。

这里不能凭习惯选，必须结合现有语义：

```text
Provider Error
        → exceptional failure

Tool Error
        → fact / observation returned to model

maxTurns
        → normal runtime termination

Caller Cancellation
        → ?
```

这会是我们 VII-F 后面重点讨论的 Design Decision（设计决策）。

---

# 十六、Event 也会受影响，但不要提前扩 Event Catalog

VII-E 当前只有：

```text
run_started
model_turn_started
model_turn_completed
tool_execution_started
tool_execution_completed
run_finished
```

并且明确没有：

```text
failed
cancelled
aborted
```

事件。

VII-E 的原则是：

> `run_finished` 只在形成合法 `RunOutcome` 时发。fileciteturn0file1L255-L262

因此 VII-F 不应该一上来就：

```ts
| { type: "run_aborted" }
| { type: "model_turn_aborted" }
| { type: "tool_execution_aborted" }
```

我们先确定：

```text
Abort 是 Outcome？
还是 exceptional settlement？
```

Event Contract 才能自然跟出来。

否则就是 Event API 在反向决定 Runtime semantics（运行时语义）。

这是错误的依赖方向。

---

# 十七、VII-F 我建议明确 **不做** 的东西

这里边界需要提前钉住。

本节不要做：

- Run Queue（运行队列）；
- 多 Run 并发；
- Parallel Tools（工具并行）；
- Session-level distributed lock（会话级分布式锁）；
- Persisted active run（持久化活跃运行）；
- Crash Recovery（崩溃恢复）；
- Durable Cancellation（持久化取消）；
- Durable Tool Execution（持久化工具执行）；
- Timeout Policy（超时策略）；
- Retry Policy（重试策略）；
- Approval（审批）；
- beforeToolCall；
- Middleware（中间件）；
- generic ExecutionContext（通用执行上下文）；
- runId / correlationId / traceId；
- process killing；
- rollback 整个 Run。

README 本身也明确把 Durable Tool Execution、Durable Approval、Session Tree 等能力放在 v1 之外。fileciteturn0file0L240-L251

尤其不要因为：

```text
AbortSignal
```

出现，就顺手做：

```ts
ExecutionContext {
  signal,
  session,
  approval,
  logger,
  trace,
  retry,
  timeout,
  metadata
}
```

那会直接把这个 Milestone 做歪。

---

# 十八、因此 VII-F 的 Architecture Boundary 可以先画成这样

```text
                        Caller
                          │
               run(userInput, ?signal)
                          │
                          ▼
                ┌───────────────────┐
                │   AgentRuntime    │
                │                   │
                │ Active Run Guard  │
                │ Agent Loop        │
                │ State mutation    │
                │ Abort checks      │
                └───────┬───────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
   ModelProvider                ToolExecutor
       │                             │
   signal?                        signal?
       │                             │
       ▼                             ▼
  provider call                    Tool
                              execute(args, ?)
```

同时：

```text
AgentEvent Subscriber
        │
        └──── observe only

不能：
return stop
return cancel
abort run
approve tool
```

这继续遵守 VII-E 建立的 Observation / Control 分离。VII-E 明确规定 Subscriber 是同步 best-effort Observer（尽力型观察者），不是控制 Hook。fileciteturn0file1L141-L153

---

# 十九、这一节的完成标准，我建议最终至少达到这些

现在先作为 Architecture Acceptance Criteria（架构验收标准），后面 Design Decision 完成再收紧。

### ① Single Active Run

同一个 `AgentRuntime`：

```ts
const first = runtime.run("A");

runtime.run("B");
```

第二个立即失败。

且 **B 不能进入 RuntimeState**。

这个点非常重要：

```text
acquire active-run ownership
必须发生在
append user_input
之前
```

否则虽然第二个 run 抛了：

```text
State 已经被 B 污染
```

Single Active Run 就是假实现。

---

### ② Reentrancy Protection（重入保护）

Subscriber 内：

```ts
runtime.run("B")
```

不能污染当前 Run。

---

### ③ Active Run 必须可靠释放

无论：

```text
completed
unsupported
limit_reached
provider throw
runtime invariant throw
abort
```

之后 Runtime 都应该重新变成：

```text
idle
```

否则一次失败后 Runtime 永久锁死。

这几乎肯定意味着实现需要类似：

```ts
try {
  ...
} finally {
  releaseActiveRun();
}
```

但现在只是架构要求，还不是实现方案。

---

### ④ Abort before work

如果 Signal 在 `run()` 前已经：

```ts
aborted === true
```

应该：

```text
不进入真正执行
```

并且要明确：

```text
user_input 是否写入？
run_started 是否发？
```

这个后面必须定。

---

### ⑤ Abort during Provider

Provider 应能收到 Signal。

如果真实 Provider 支持 cancellation（取消），底层网络请求应停止，而不是只能等返回后才停止 Loop。

---

### ⑥ Abort during Tool

Tool execution（工具执行）需要存在 cooperative cancellation path（协作式取消路径）。

Abort 不能被错误转换成：

```text
TOOL_EXECUTION_FAILED
```

---

### ⑦ No fake committed fact

没有真正 commit 的：

```text
model_output
tool_result
```

不能为了“配平消息”伪造出来。

但已经 commit 的事实也不能因为 Abort 被回滚。

---

### ⑧ Existing semantics preserved

VII-A～VII-E：

```text
normal run
tool loop
maxTurns
tool error contract
ContextBuilder
Event ordering
Subscriber isolation
```

全部不得回归。

---

# 二十、我认为 VII-F 最终大概率会形成这些 Design Decisions

现在只是**议题清单，不是最终结论**：

```text
F-AD01
AgentRuntime instance owns at most one Active Run.

F-AD02
Concurrent / reentrant run() fails fast; no queue.

F-AD03
Cancellation uses cooperative AbortSignal propagation.

F-AD04
Control signal is execution metadata, not ModelRequest context data.

F-AD05
Cancellation propagates through Provider and Tool execution boundaries.

F-AD06
Abort must not be normalized into Tool Error Contract.

F-AD07
Committed Runtime facts are never rolled back by cancellation.

F-AD08
Active Run ownership is released on every settlement path.

F-AD09
Abort settlement has one explicit public semantic
        （这里尚未决定：Outcome 还是 exceptional AbortError）

F-AD10
AgentEvent remains Observation-only;
Abort does not flow through Subscriber return values.
```

其中 **F-AD09 是现在最需要真正讨论的核心岔路之一**。

---

# 我们先进入第一轮正式讨论：Run Ownership

先把 Abort 放一边，我建议第一步只锁定 **Single Active Run（单一活跃运行）**。

按照当前代码和整个 Part VII 的设计，我建议：

```text
AgentRuntime instance
        │
        └── owns at most one Active Run

idle
 ↓ run(A)
active(A)
 ↓ settle
idle
```

如果 active 时发生：

```ts
run("B")
```

则：

```text
Fail Fast
```

而且检测必须发生在：

```ts
this.#state.messages.push(userInput)
```

**之前**。

这样才能真正保证：

> 一个 RuntimeState 在任何时刻，只会被一个 Agent Loop（Agent 循环）推进。

我认为这是 VII-F 的第一条核心 Architecture Decision，而且也是后面 Abort、Provider propagation、Tool cancellation 所有设计的前提。它把 VII-B 的“AgentRuntime 是 State 唯一 mutation owner”进一步升级成：

> **AgentRuntime 不仅是 State 的唯一 mutation owner，同一时刻也只允许一个 Run 成为这个 mutation authority（变更权持有者）。**

这个认知我觉得是 Part VII-F 最重要的第一步。memcite

## Turn 2

### User

1. abort 我理解本次的实现其实为了最小化，所以才做了假如 run（A）还没结束就 run(B)了，这个时候 fail(A),其实完整的应该是有队列的，甚至应该 multi-agent
2. signal 在这里到底起了什么作用
3. 继续

### ChatGPT

1. 这里先纠正一个关键点：**不是 `run(B)` 时 fail(A)，而是 fail(B)**。

我们当前讨论的最小实现应该是：

```text
run(A)
  ↓
A 获得 Active Run Ownership（活跃运行所有权）
  ↓
A 正在执行

此时 run(B)
  ↓
发现 Runtime 已经有 Active Run
  ↓
B 立即失败
  ↓
A 不受影响，继续执行
```

也就是：

```ts
const a = runtime.run("A");

// A 还没结束
const b = runtime.run("B"); // B fail fast
```

而不是：

```text
B 来了
→ 把 A 干掉
→ 让 B 执行
```

后者其实是一种完全不同的策略，叫类似 **latest-wins（最新任务优先）/ cancel-previous（取消前一个）**。我们目前没有这样的需求。

### 队列确实是一种更完整的 Run Scheduling（运行调度），但不是 Single Active Run 的“完整版”

这里要稍微修正你第 1 点的理解。

你说：

> 完整的应该是有队列的，甚至 multi-agent

方向上能理解，但严格来说它们是**不同层次的问题**，不是：

```text
Fail Fast
 ↓ 升级
Queue
 ↓ 升级
Multi-Agent
```

更准确是：

```text
                Run Concurrency Policy（运行并发策略）
                          │
          ┌───────────────┼────────────────┐
          ↓               ↓                ↓
      Reject          Queue            Parallel
    立即拒绝        排队执行          并行执行
```

而 **Multi-Agent（多智能体）** 又是更上一层：

```text
Multi-Agent
   │
   ├─ Agent A Runtime
   ├─ Agent B Runtime
   ├─ Agent C Runtime
   │
   └─ Orchestrator / Scheduler
```

多个 Agent 完全可能每一个内部仍然坚持：

```text
Single Active Run per Runtime
```

例如：

```text
AgentRuntime A → run 1
AgentRuntime B → run 2
AgentRuntime C → run 3
```

三者并行没有问题。

但同一个：

```text
AgentRuntime A
```

内部仍不允许：

```text
run1 + run2
```

同时修改同一份 `RuntimeState`。

所以 VII-F 的 Single Active Run（单一活跃运行）真正解决的是：

> **保护一个 Runtime 实例内部 State mutation（状态变更）的串行所有权。**

README 本来也明确把这一节限制为防止同一 Runtime / Session 并发执行和状态竞争，而 Multi-Agent 不属于当前 v1。fileciteturn0file0L152-L159 fileciteturn0file0L240-L251

---

## 2. Signal 到底起什么作用？

这是 Abort（中止）机制里最关键的东西。

你可以先把：

**AbortSignal（中止信号）**

理解成一个：

> **所有参与当前 Run 的组件都可以观察到的“停止请求标志”。**

它本身**不会主动杀掉代码**。

比如：

```ts
const controller = new AbortController();

controller.signal.aborted;
// false

controller.abort();

controller.signal.aborted;
// true
```

核心关系是：

```text
AbortController
      │
      │ abort()
      ↓
AbortSignal
      │
      ├─ Runtime 看
      ├─ Provider 看
      └─ Tool 看
```

可以把它类比成：

```text
Controller = 遥控器
Signal     = 广播出去的“停止”状态
```

---

### 为什么不能直接 `runtime.abort()` 就完事？

因为 Runtime 自己并不是所有耗时工作的执行者。

例如：

```ts
await provider.generate(...)
```

这时候真正干活的是：

```text
OpenAI Provider
 ↓
HTTP Request
 ↓
远程模型
```

如果 Runtime 只是：

```ts
this.aborted = true;
```

那么正在执行的：

```ts
fetch(...)
```

根本不知道。

所以 Signal（信号）真正的价值是：

> **把 Cancellation Intent（取消意图）沿调用链传播下去。**

例如：

```text
Caller
  │
  │ signal
  ↓
AgentRuntime
  │
  ├──── signal ───→ ModelProvider
  │
  └──── signal ───→ ToolExecutor
                         │
                         └──── signal ───→ Tool
```

---

## 举个你前端很熟悉的例子

其实你以前大概率已经用过同一套机制：

```ts
const controller = new AbortController();

fetch("/api/data", {
  signal: controller.signal,
});

controller.abort();
```

`abort()` 并不是 JavaScript 把 `fetch Promise` 强行杀死。

而是：

```text
AbortController
      ↓
signal.aborted = true
      ↓
fetch 本身支持 AbortSignal
      ↓
fetch 观察到取消
      ↓
停止网络请求
```

所以这是：

**Cooperative Cancellation（协作式取消）**。

“协作式”三个字特别重要。

---

# 如果 Tool 不理 Signal 呢？

例如：

```ts
async execute(args, { signal }) {
  await someLongRunningJob();
}
```

但 `someLongRunningJob()` 根本不支持 signal。

那即使：

```ts
controller.abort();
```

也不能瞬间把它杀死。

最多是：

```ts
async execute(args, { signal }) {
  await someLongRunningJob();

  if (signal.aborted) {
    // 到这里才知道已经取消
  }
}
```

所以：

```text
Signal
≠
强制终止线程

Signal
=
统一传递“请停止”的协议
```

这也是为什么叫：

**Cooperative Cancellation（协作式取消）**。

---

# Signal 实际有两个作用

你可以把它拆成两层理解。

### 第一层：Runtime 自己检查

例如：

```ts
if (signal.aborted) {
  throw abortError;
}

await provider.generate(...);

if (signal.aborted) {
  throw abortError;
}
```

这样可以阻止：

```text
继续下一个 Turn
继续执行下一个 Tool
继续 Agent Loop
```

但问题是：

```text
provider.generate()
```

正在 await 的时候，它停不了。

---

### 第二层：向真正执行工作的组件传播

例如：

```ts
await provider.generate(request, {
  signal,
});
```

然后 Provider：

```ts
fetch(url, {
  signal,
});
```

这样：

```text
Caller abort
 ↓
Runtime signal
 ↓
Provider signal
 ↓
fetch
 ↓
HTTP request 真正取消
```

所以我们这一节真正需要的不是：

```text
Runtime 有一个 aborted boolean
```

而是：

> **Abort Propagation（中止传播）**。

---

# 3. 继续：我们现在先正式锁定前两个 Design Decisions

到目前为止，其实前两个问题已经比较清楚了。

## F-AD01：Active Run Ownership

我建议正式确定：

> **一个 `AgentRuntime` 实例同一时刻最多只能拥有一个 Active Run（活跃运行）。**

状态模型非常简单：

```text
       run()
idle ───────→ active
 ↑               │
 └───────────────┘
      settle
```

这里的 `settle` 包括：

```text
completed
unsupported
limit_reached
error
abort
```

不管什么路径结束，都必须释放：

```text
active → idle
```

这属于 Runtime invariant（运行时不变量）。

---

## F-AD02：Concurrent / Reentrant Run Fail Fast

第二条我也建议确定：

> 当 Runtime 已经处于 Active Run 时，任何新的 `run()` 调用立即失败，不排队、不取消当前 Run、不进入 State。

尤其顺序应该是：

```text
run(B)
 ↓
check active run
 ↓
发现 active
 ↓
throw/reject
```

而绝对不能：

```text
run(B)
 ↓
append user B
 ↓
check active
 ↓
throw
```

否则：

```text
B 虽然失败了
State 却已经被污染
```

这两条我认为可以正式记为 VII-F 的前两条 Architecture Decisions。

---

# 接下来进入 Abort 的第一个真正决策

我们现在考虑：

```ts
const controller = new AbortController();

const promise = runtime.run("hello", {
  signal: controller.signal,
});

controller.abort();
```

这里第一个问题不是 Provider，不是 Tool。

而是：

> **如果传进来的 Signal 在 `run()` 调用之前就已经 aborted 了，Runtime 应该怎么办？**

例如：

```ts
const controller = new AbortController();

controller.abort();

await runtime.run("hello", {
  signal: controller.signal,
});
```

这里有两个方案。

---

## 方案 A：连 `user_input` 都不写

```text
run()
 ↓
check signal
 ↓ aborted
stop
```

最终：

```text
RuntimeState
没有 "hello"
```

也没有：

```text
run_started
```

语义是：

> 这个 Run 根本没有真正开始。

我目前比较倾向这个。

---

## 方案 B：先保存 User Input，再 Abort

```text
append user_input
 ↓
run_started
 ↓
发现 aborted
 ↓
结束
```

这样：

```text
用户明明取消了一个没有真正启动的 Run
```

但 Conversation History（对话历史）却多了一条：

```text
user: hello
```

下一次运行时模型还能看到它。

这会造成很奇怪的历史：

```text
User: hello
// 没有 assistant

User: next question
Assistant: ...
```

当然现实系统有时会保留“用户已发送但生成取消”的消息，但那涉及 UI transcript（界面对话记录）和 Runtime facts（运行时事实）是否是同一层的问题。

我们目前 Mini Runtime 还没有这么复杂。

---

# 所以我建议形成 F-AD03

> **如果传入的 AbortSignal 在获取 Active Run ownership 时已经是 aborted 状态，则 Run 不开始：不 append `user_input`、不发 `run_started`，直接按 Abort settlement 退出。**

这里的顺序非常重要：

```text
run(input, signal)
        ↓
check Single Active Run
        ↓
acquire ownership
        ↓
check pre-aborted signal
        ↓
append user_input
        ↓
run_started
        ↓
进入 Agent Loop
```

不过这里还有一个细微问题：

究竟是：

```text
check signal
→ acquire run ownership
```

还是：

```text
acquire run ownership
→ check signal
```

我更倾向第二种。

原因是所有 `run()` 都应该先经过统一的：

```text
Run Ownership Gate（运行所有权入口）
```

然后通过 `finally` 统一释放。

逻辑更一致：

```text
run()
 ↓
acquire
 ↓
try
 │
 ├─ pre-abort check
 ├─ append input
 └─ execute
 ↓
finally
 ↓
release
```

---

# 下一步是 VII-F 最关键的 Cancellation Point（取消点）

假设：

```text
Run 开始
 ↓
user_input committed
 ↓
model_turn_started
 ↓
Provider 正在执行
```

此时：

```ts
controller.abort();
```

我们下一轮要决定：

```text
Provider 返回的数据
到底还要不要 commit？
```

两种语义：

```text
方案 1：

Provider 成功返回
 ↓
即使此刻 signal aborted
 ↓
仍 append model_output
 ↓
停止后续步骤
```

或者：

```text
方案 2：

Provider 成功返回
 ↓
检查 signal
 ↓ aborted
 ↓
丢弃 response
 ↓
不 commit model_output
```

这个问题本质上就是我们上一轮提到的：

**Settlement Boundary（结算边界） / Commit Boundary（提交边界）**。

我建议下一步就重点讨论这一条，因为它会直接决定后面的：

- Provider cancellation；
- Tool cancellation；
- `model_turn_completed` 是否发；
- `tool_execution_completed` 是否发；
- Abort 时 State 最终长什么样；
- Abort 最终是 `RunOutcome` 还是 Error。memcite

## Turn 3

### User

1. [如果传入的 AbortSignal 在获取 Active Run ownership 时已经是 aborted 状态，则 Run 不开始：不 append `user_input`、不发 `run_started`，直接按 Abort settlement 退出]，这是不是有点类似，比如在  GPT 中聊天，用户发送了消息，还没响应就点了终止，这时候聊天界面 有这条终止的信息，但是如果刷新下页面就没有了(其实属于没有append `user_input`，只是 UI 上保留了方便用户编辑这条消息然后发送然后开始对话)
2. 继续

### ChatGPT

对，你这个类比在**概念上是成立的**，但我会把它说得更严谨一点：

> **UI 上看得到，不等于已经成为 Runtime 的 committed fact（已提交事实）。**

你举的“GPT 里消息已经出现在界面上，但生成被立即终止；刷新后可能不再保留”这种现象，可以类比成：

```text
UI Layer
┌─────────────────────────┐
│ 用户刚输入的 message     │
│ transient / draft state │
└────────────┬────────────┘
             │
             │ Run 真正开始并接受
             ↓
Runtime Layer
┌─────────────────────────┐
│ RuntimeState.messages   │
│ committed user_input    │
└─────────────────────────┘
```

我不把 ChatGPT 当前具体产品行为当成我们这里的事实依据，因为 UI 的保存策略可能随产品实现变化；但作为架构类比，你抓到的是一个很重要的点：

> **UI transcript（界面对话展示）和 Runtime facts（运行时事实）不一定是同一层。**

我们当前 Mini Runtime 里还没有 UI draft、message persistence（消息持久化）这些层，所以 VII-F 最小实现里更适合采用干净语义：

```text
pre-aborted
→ Run 没真正开始
→ 不 commit user_input
```

这也符合当前 Part VII 的原则：没有真实需求就不提前引入 UI / Persistence 语义。VII-G 才会进入 Conversation 保存和恢复。fileciteturn0file0L161-L168

---

# 继续：现在讨论最关键的 Commit Boundary

假设现在不是 pre-abort，而是 Run 已经真正开始：

```text
run("杭州天气")
 ↓
acquire Active Run
 ↓
append user_input
 ↓
run_started
 ↓
model_turn_started
 ↓
Provider.generate(...)
```

现在 Provider 正在执行。

这时用户点：

```ts
controller.abort();
```

问题来了。

假设 Provider 恰好也在这个时间点返回：

```ts
{
  finishReason: "stop",
  ...
}
```

Runtime 到底应该：

### 方案 A：返回了就 commit

```text
Provider returns
 ↓
append model_output
 ↓
model_turn_completed
 ↓
发现 aborted
 ↓
Run 停止
```

还是：

### 方案 B：先看 signal

```text
Provider returns
 ↓
signal.aborted?
 ↓ yes
discard response
 ↓
不 append model_output
```

我更倾向 **方案 B**。

而且我认为这会成为 VII-F 很重要的一条设计原则。

---

# 为什么我改为更倾向方案 B？

因为这里要区分三个时刻：

```text
1. external operation completed
2. Runtime accepted result
3. Runtime committed fact
```

这三个不是一回事。

比如：

```text
Provider.generate()
```

返回了，只能说明：

> Provider 完成了工作。

还不能说明：

> Runtime 决定接受这个结果作为 Conversation fact。

所以可以画成：

```text
Provider returns
      ↓
Runtime acceptance boundary
      ↓
append RuntimeState
      ↓
fact committed
```

Abort 如果发生在：

```text
Provider returns
      ↓
【这里】
Runtime commit
```

之间，那么 Runtime 可以合理地说：

> Caller 已经取消这个 Run，我不再接受新的事实。

---

# 这和 VII-E 的 completed event 刚好契合

VII-E 已经确定：

```text
model_turn_completed
```

不是：

> Provider 调用返回了。

而是：

> Runtime 已经接受并 commit 对应 `RuntimeAssistantMessage`。

fileciteturn0file1L161-L187

所以 VII-F 可以自然延续：

```text
Provider returns
 ↓
check abort
 ↓

未 abort：
  append model_output
  emit model_turn_completed

已 abort：
  discard response
  no model_turn_completed
```

这样 Event 语义完全不用推翻。

---

# 这里形成一个很漂亮的模型

以后我们可以把外部工作的生命周期理解成：

```text
START
  ↓
external work
  ↓
result produced
  ↓
──────── Acceptance Boundary ────────
  ↓
Runtime accepts
  ↓
commit State
  ↓
completed event
```

Abort 在不同位置的含义：

```text
before START
→ 不开始

during external work
→ 请求底层停止

after external work
before acceptance
→ 丢弃结果

after commit
→ 已提交事实不回滚，只阻止后续推进
```

这个模型非常值得记住。

---

# 举个完整例子

假设当前历史：

```text
User: 帮我查杭州天气
```

Runtime 开始：

```text
1. user_input committed
2. model_turn_started
3. Provider.generate()
```

此时用户 Abort。

---

## 情况一：Provider 支持 Signal，及时取消

```text
Provider
 ↓
AbortError
```

那么：

```text
没有 model_output
没有 model_turn_completed
Run 停止
```

最终 State：

```text
User: 帮我查杭州天气
```

这很合理。

因为 User 的消息已经是一个真实发生的 Run 输入，但 Model 没有形成被 Runtime 接受的结果。

---

## 情况二：Provider 不支持取消，后来还是返回了

```text
Abort
 ↓
Provider 继续跑
 ↓
Provider returns assistant message
```

Runtime 恢复以后第一件事：

```ts
if (signal.aborted) {
  // 不接受这个 response
}
```

所以仍然：

```text
User: 帮我查杭州天气
```

而不是：

```text
User: 帮我查杭州天气
Assistant: ...
```

---

# 那如果已经 commit 之后才 Abort 呢？

例如：

```text
Provider returns
 ↓
signal not aborted
 ↓
append assistant(tool_call)
 ↓
model_turn_completed
 ↓
用户这时 abort
```

那么 assistant message 已经 committed。

不能删掉。

最终可能是：

```text
User
Assistant(tool_call)
```

Tool 没有执行。

这就是我们前面说的：

> **Abort does not rollback committed facts（取消不回滚已提交事实）。**

这里甚至会留下一个 unresolved Tool Call（未完成工具调用）。

乍一看有点“不完整”。

但这反而是真实的执行事实：

```text
模型确实提出了 Tool Call
 ↓
Runtime 已经接受
 ↓
但执行前被用户取消
```

我们不应该为了让 history “看起来漂亮”而伪造：

```text
TOOL_EXECUTION_FAILED
```

或者：

```text
TOOL_EXECUTION_SKIPPED
```

因为那两者都有别的明确语义。

---

# 这里会出现一个非常重要的问题

你可能马上会想到：

> 那下一次 `run()` 时，ContextBuilder 看到一个 assistant tool_call，却没有对应 tool_result，不会有问题吗？

是的。

这就是 VII-F 真正需要处理的一个边界。

当前 VII-C 对 `maxTurns` 的做法是：

```text
assistant tool_call
 ↓
不能执行
 ↓
写 TOOL_EXECUTION_SKIPPED
```

目的是保持消息配对。

但 Abort 不一定能直接复用这个逻辑，因为：

```text
maxTurns
= Runtime 自己决定不执行

Abort
= Caller 取消整个 Run
```

语义不同。

---

# 这里有三个候选方案

### A. Abort 时给未执行 Tool Call 写一个 cancelled tool_result

例如：

```text
TOOL_EXECUTION_CANCELLED
```

优点：

```text
消息完整配对
下一次模型上下文稳定
```

但它意味着我们扩展 Tool Error Contract：

```text
CANCELLED
```

而取消本来又不是 Tool Error。

有语义污染风险。

---

### B. 保留 unresolved Tool Call

State：

```text
assistant(tool_call)
```

没有 tool result。

优点：

```text
完全忠实记录已经 commit 的事实
```

缺点：

下一次 Provider 可能不接受不完整的 tool protocol。

尤其 OpenAI-style message protocol（消息协议）通常要求 Tool Call 后有对应 Tool result。

---

### C. Abort 必须只发生在安全点

例如规定：

```text
assistant tool_call 一旦 commit
 ↓
至少必须形成每个 ToolCall 的 terminal result
 ↓
才能真正结束 Run
```

这样 Abort 可能延迟到：

```text
tool boundary
```

才生效。

但这会让“用户点击停止”后 Runtime 仍继续做额外工作，甚至继续执行 Tool。

不理想。

---

# 我当前更倾向一个折中原则

我们要区分：

### Tool 已经开始

```text
tool_execution_started
```

和：

### Tool 还没开始

如果 Abort 发生在：

```text
assistant tool_call committed
 ↓
还没进入 ToolExecutor
```

那么可以为每个尚未执行的 ToolCall 写一个：

```text
cancelled result
```

但是它不应该伪装成：

```text
TOOL_EXECUTION_FAILED
```

而应该有独立的 Runtime-level termination meaning（运行时终止语义）。

这里我们还不能马上定最终形式，因为会影响 Tool Error Contract。

---

# 所以我们现在可以先正式锁两条原则

我建议记录：

### F-AD04 候选：Acceptance-before-commit

> Provider / Tool 返回结果后，在 Runtime 将结果写入 State 之前再次检查 Cancellation（取消状态）。如果 Run 已被取消，该结果不再被接受和 commit。

这保证：

```text
external completion
≠
Runtime fact commitment
```

---

### F-AD05 候选：No rollback after commit

> 已经 commit 到 `RuntimeState` 的事实不会因为后续 Abort 被删除；Abort 只阻止新的执行和新的事实接受。

于是：

```text
              Abort
                │
                ▼

uncommitted result
    → discard

committed fact
    → preserve
```

我认为这两个可以基本确定。

---

# 下一步：Tool Abort 是 VII-F 最难的一块

现在架构走到：

```text
Model returns tool_call
 ↓
Runtime commits assistant message
 ↓
model_turn_completed
 ↓
Tool A started
 ↓
Tool A running
 ↓
Abort
```

这里马上会有三个问题：

```text
1. ToolExecutor 要不要把 signal 继续传给 Tool？

2. Tool 因 Abort 抛 AbortError，
   ToolExecutor 如何避免把它变成
   TOOL_EXECUTION_FAILED？

3. Tool 已经产生副作用怎么办？
   例如：
   sendEmail()
   writeFile()
   createOrder()
```

第三个尤其重要：

> Abort 只能停止“未来尚未完成的执行”，不能自动 undo（撤销）已经发生的副作用。

这会把我们带到 Agent Runtime 里一个很重要的工业概念：

**Cancellation（取消） ≠ Transaction Rollback（事务回滚）**。

下一步我们就沿着 Tool 这一层继续，会把 Signal、ToolExecutor、Side Effect（副作用）和 Error Contract 串起来。

## Turn 4

### User

继续

### ChatGPT

继续。我们现在进入 VII-F 最关键的一块：**Tool Cancellation（工具取消）**。

前面我们已经基本形成了两条原则：未 commit（提交）的结果在取消后可以丢弃；已经 commit 的 Runtime fact（运行时事实）不回滚。接下来要解决的是：**Tool 正在执行时，Abort 到底能做到什么程度。**

---

## 1. Tool cancellation 本质上仍然是 cooperative cancellation（协作式取消）

假设当前流程：

```text
assistant(tool_call)
 ↓ committed

tool_execution_started
 ↓
ToolExecutor.execute()
 ↓
Tool.execute()
 ↓
正在执行...
```

这时用户：

```ts
controller.abort();
```

Runtime 本身不能直接“杀掉 Tool”。

它能做的仍然只是：

```text
把 signal 传下去
        ↓
Tool 自己愿意响应
        ↓
尽快停止
```

所以这里的调用链应该变成：

```text
AgentRuntime
   │
   │ signal
   ▼
ToolExecutor
   │
   │ signal
   ▼
Tool.execute(...)
```

也就是说，`AbortSignal（中止信号）` 要真正穿透到**实际执行副作用的代码**。

---

# 2. 为什么只让 ToolExecutor 看 signal 不够？

比如我们只这么写：

```ts
if (signal.aborted) {
  throw ...
}

const result = await tool.execute(args);

if (signal.aborted) {
  throw ...
}
```

这只能做到：

```text
执行 Tool 前发现取消
→ 不执行

Tool 返回后发现取消
→ 不接受结果
```

但是如果 Tool 内部：

```ts
await fetch("https://weather-api.com/...");
```

这个请求卡 30 秒：

```text
Abort
 ↓
Runtime 知道取消了
 ↓
但 tool.execute() 还在 await
 ↓
Runtime 只能等
```

因此如果我们希望：

> “用户点停止后，正在执行的 Tool 也尽快停下来”

那 Tool 本身必须拿到 signal。

---

# 3. 那 Tool Contract（工具契约）应该怎么演进？

当前 VII-C 形成的 Tool，大致是这种职责：

```ts
execute(args): Promise<...>
```

VII-F 最小增量可以有两个候选。

### 方案 A

```ts
execute(args, signal)
```

简单。

但第二个参数语义有点死：

```text
今天是 signal
以后如果真需要别的 execution metadata 怎么办？
```

---

### 方案 B

```ts
execute(args, {
  signal,
})
```

也就是一个非常小的：

```ts
ToolExecutionOptions
```

例如概念上：

```ts
interface ToolExecutionOptions {
  signal?: AbortSignal;
}
```

我更倾向方案 B。

但注意：

这**不等于**我们现在建立：

```ts
ToolContext {
  session,
  logger,
  runtime,
  approval,
  trace,
  user,
  memory,
  ...
}
```

我们只因为当前真实需求出现了：

```text
Cancellation
```

所以增加：

```text
ToolExecutionOptions
  └─ signal
```

只有这一项。

这符合我们一直坚持的：

> 抽象随着真实需求出现，而不是先造一个万能 Context。

---

# 4. ToolExecutor 的职责也随之发生一个很小但关键的变化

现在 ToolExecutor 本质上负责：

```text
lookup
 ↓
validate args
 ↓
execute
 ↓
normalize success / error
```

VII-F 后它会多一条控制边界：

```text
lookup
 ↓
validate
 ↓
check cancellation
 ↓
execute(args, { signal })
 ↓
区分：
  normal result
  normal execution error
  cancellation
```

这里最关键的是最后一条。

因为目前 VII-C 的 Error Contract 是：

```text
tool throws
 ↓
ToolExecutor catches
 ↓
TOOL_EXECUTION_FAILED
 ↓
RuntimeToolMessage
 ↓
交给 LLM
```

而 Cancellation（取消）绝对不能走这条路径。

---

# 5. 为什么 Abort 不能变成 TOOL_EXECUTION_FAILED？

假设用户主动点击“停止”。

Tool 内部因为 signal 抛：

```text
AbortError
```

如果 ToolExecutor 把它变成：

```json
{
  "error": {
    "code": "TOOL_EXECUTION_FAILED"
  }
}
```

那模型下一轮看到的是：

> 工具执行失败了。

但真实事实其实是：

> 用户取消了整个 Run。

这是两件完全不同的事情。

所以必须区分：

```text
Execution Failure
≠
Cancellation
```

准确一点：

```text
Tool Error Contract
= Tool execution 已完成，但是结果为失败

Cancellation
= 整个 Run 的 execution control 要终止
```

因此 Cancellation 不应该被 ToolExecutor “吃掉”。

---

# 6. 我建议形成一个新的架构原则

### F-AD06 候选

> **Cancellation bypasses Tool Error Contract（取消绕过工具错误契约）。**

也就是：

```text
Tool throws normal error
        ↓
ToolExecutor normalize
        ↓
TOOL_EXECUTION_FAILED
        ↓
RuntimeToolMessage
```

而：

```text
Tool reacts to AbortSignal
        ↓
cancellation propagates upward
        ↓
AgentRuntime stops Run
```

这条原则很重要。

因为你之前在 VII-C 问过类似的问题：

> Tool 自己把 error 吃掉，Runtime 怎么知道？

这里同理。

如果 Tool：

```ts
async execute(args, { signal }) {
  try {
    await fetch(..., { signal });
  } catch {
    return "ok";
  }
}
```

那 Runtime 也没有办法知道它实际上被取消过。

所以 Tool Developer（工具开发者）依然必须遵守 Tool Contract（工具契约）。

---

# 7. Signal 本质上也是 Tool SDK Contract 的一部分

你之前对 Tool Error Contract 的理解可以继续延伸：

```text
Tool 开发者不能随意破坏 Runtime 语义
```

例如：

```ts
execute(args, { signal })
```

Tool 应该：

```text
1. 把 signal 传给支持 signal 的下游 API

2. 在适当位置响应 signal

3. 不要把 cancellation 偷偷转换成普通业务成功

4. 不要把 cancellation 随意包装成普通 Tool Error
```

所以从工业实现来看：

> Agent Runtime 定义的不只是 Tool 输入 Schema，也定义 Tool Execution Contract（工具执行契约）。

这其实是 VII-C 的自然延伸，而不是新系统。

---

# 8. Side Effect（副作用）才是真正棘手的地方

现在假设 Tool 是：

```text
weather lookup
```

这个还比较安全。

Abort 时：

```text
HTTP request cancel
```

就行。

但如果以后 Tool 是：

```text
sendEmail
createOrder
transferMoney
writeFile
deleteRecord
```

事情就不一样了。

例如：

```text
Tool: createOrder()

Step 1: DB insert order        ✅
Step 2: inventory deduction    ✅
Step 3: send notification      ← Abort
```

这时你调用：

```ts
controller.abort();
```

绝对不能理解成：

```text
前面的数据库写入自动消失
```

所以：

> **Cancellation ≠ rollback（取消不等于回滚）。**

---

# 9. Abort 只能控制“未来还没发生的工作”

可以这样理解：

```text
时间 →

A completed
B completed
C running
D not started
E not started
         ↑
       Abort
```

Abort 能做到的理想情况是：

```text
A 保留
B 保留
C 尽量停止
D 不开始
E 不开始
```

但做不到：

```text
自动撤销 A
自动撤销 B
```

如果业务真的要求：

```text
A、B 必须撤销
```

那属于：

- Transaction（事务）
- Compensation（补偿）
- Saga
- Idempotency（幂等）
- Durable Workflow（持久化工作流）

已经远远超出 VII-F。

---

# 10. 这也解释了为什么 AbortSignal 不是“事务控制器”

你可以把 Signal 理解成：

```text
“从现在开始，尽量不要继续做新工作”
```

而不是：

```text
“让这个 Run 从来没有发生过”
```

这个认知非常重要。

Agent 领域尤其如此。

因为一个 Tool Call 可能已经产生了真实世界影响：

```text
发送邮件
创建工单
下订单
写数据库
调用支付系统
```

LLM / Runtime 无法靠删除一条 `RuntimeMessage` 把现实世界恢复。

---

# 11. 那 Tool 已经成功了，但结果还没 commit 时 Abort 呢？

这是刚才 Provider 情况的 Tool 版本。

流程：

```text
Tool.execute()
 ↓
真实副作用已经发生
 ↓
Tool 返回 result
 ↓
【此刻 Abort】
 ↓
Runtime 还没 append RuntimeToolMessage
```

如果我们坚持前面的：

> Abort 后不接受 uncommitted result

那会得到：

```text
现实世界：
    Tool 已经执行成功

RuntimeState：
    没有 Tool Result
```

这会产生一个非常重要的问题：

> **External side effect（外部副作用）和 Runtime fact 可能发生分离。**

这不是 bug，而是分布式系统里非常经典的问题。

---

# 12. 这里不能假装“完美原子性”

理想世界我们可能想：

```text
Tool side effect
+
Runtime State append
```

要么一起成功，要么一起失败。

但实际上：

```text
External API
```

和：

```text
RuntimeState
```

不是一个 transaction。

所以一定存在窗口：

```text
Tool 成功
 ↓
Runtime crash / abort
 ↓
Result 未记录
```

这就是所谓：

**In-doubt state（不确定状态）**

或者从 workflow（工作流）角度看，是：

> effect occurred, acknowledgement not committed
> 副作用发生了，但确认事实没有提交。

---

# 13. 但 VII-F 不能解决这个问题

这点我们一定要克制。

完整工业实现可能需要：

```text
Durable Tool Execution
Idempotency Key
Execution Record
Outbox
Transaction Log
Recovery
Retry
Compensation
```

但 README 已明确：

```text
Durable Tool Execution
```

不属于 Part VII v1。fileciteturn0file0L240-L251

因此 VII-F 的目标不是：

> 保证 Abort 情况下所有副作用严格 exactly-once。

而是：

> 定义清晰、诚实的 cancellation semantics（取消语义）。

---

# 14. 所以 Tool Result 的 commit 规则，我建议和 Provider 略有不同地理解

前面对于 Provider 我们说：

```text
Provider returns
 ↓
signal aborted?
 ↓ yes
discard response
```

因为 Provider 输出本身没有外部副作用。

但 Tool 可能不同。

如果 Tool **已经成功执行并返回**：

```text
external effect completed
 ↓
result available
```

这时候结果其实是一个非常重要的事实：

> Tool 已经发生。

如果我们仅仅因为 signal 在这一微小窗口变成 aborted 就丢弃 Tool Result，反而会让 State 丢失真实世界已经发生的事实。

所以这里我认为应该重新细分。

---

# 15. 我建议 Provider 和 Tool 不要强行使用完全同一套 post-await 规则

### ModelProvider

```text
Provider returns
 ↓
check aborted
 ↓
如果已取消
→ response 可以丢弃
```

因为：

```text
模型生成本身通常没有业务副作用
```

---

### Tool

如果：

```text
ToolExecutor 已经真正完成 Tool execution
并形成 RuntimeToolMessage
```

那么更合理的可能是：

```text
commit Tool Result
 ↓
tool_execution_completed
 ↓
发现 abort
 ↓
不再开始后续 Model Turn
```

也就是说：

> **Tool Execution completed 后，优先把它已经发生的结果记录为事实。**

这比“因为晚了 1ms Abort 就假装 Tool 没执行”更诚实。

---

# 16. 这会形成一个非常重要的区分

```text
Model output
= proposal / reasoning output

Tool result
= potentially real-world observation
```

所以二者的 commit semantics（提交语义）不一定必须完全一致。

这里要非常小心。

我们不能为了代码整齐写成：

```ts
await operation();

if (signal.aborted) throw abort;
commit();
```

然后模型、Tool 全部套用。

架构语义优先于代码对称。

---

# 17. 我现在更推荐以下 Tool cancellation 模型

把 Tool Execution 分成三个阶段：

```text
① Before execution

② Executing

③ Execution returned
```

### ① Abort before execution

```text
signal.aborted
 ↓
不调用 Tool
```

很好理解。

---

### ② Abort during execution

```text
signal propagated to Tool
 ↓
Tool cooperatively aborts
 ↓
没有 Tool Result commit
 ↓
Run terminates
```

注意这里：

```text
Tool 是否已经产生部分副作用
```

Runtime 无法保证。

---

### ③ Abort after Tool successfully returned

```text
Tool returned result
 ↓
Runtime accepts + commits result
 ↓
tool_execution_completed
 ↓
Abort prevents next step
```

这一条我现在认为比“返回后先查 signal、再决定丢弃”更加合理。

---

# 18. 为什么？

因为 Event 语义已经定义：

```text
tool_execution_completed
```

表示：

> ToolExecutor 已经形成最终 RuntimeToolMessage，并且 Runtime 已经 commit。

VII-E 明确就是这么定义的。fileciteturn0file1L177-L187

所以：

```text
Tool successfully returned
```

与：

```text
Tool execution lifecycle completed
```

其实已经非常接近。

如果 Tool 返回后我们把 result 丢掉：

```text
真实 Tool 执行完成
但是 Runtime history 不记录
```

反而更危险。

---

# 19. 那 Tool 在 Abort 时抛 AbortError 呢？

这就属于第②种：

```text
execution never produced accepted final result
```

此时：

```text
no RuntimeToolMessage
no tool_execution_completed
```

然后 cancellation 向上。

因此：

```text
tool_execution_started
```

可能没有对应：

```text
tool_execution_completed
```

你可能会觉得 Event 不成对。

但这是完全合理的。

因为 VII-E 本来就有：

```text
model_turn_started
```

后 Provider error：

```text
没有 model_turn_completed
```

fileciteturn0file1L394-L403

所以 lifecycle started 并不保证 completed。

---

# 20. 现在再回到 unresolved Tool Call（未配对 Tool Call）

Abort 可能发生：

```text
assistant(tool_calls)
 ↓ committed
 ↓
还没执行 Tool
 ↓
Abort
```

这时 State：

```text
assistant(tool_call)
```

没有对应 `tool_result`。

我们前面列了三个方案。

现在结合 Tool cancellation，我更倾向：

> **VII-F 不应伪造 Tool execution result。**

也就是说不要写：

```text
TOOL_EXECUTION_FAILED
```

也不要因为好看就写：

```text
TOOL_EXECUTION_SKIPPED
```

因为：

```text
skipped
```

在 VII-C 已经有明确语义：

> maxTurns reached，所以 Runtime 有意识地为 unresolved Tool Calls 写 pairing result。

而 Abort 是：

> Run 本身被取消。

两者不是一回事。

---

# 21. 但下一次 Run 怎么办？

这才是真正问题。

如果下一次：

```ts
runtime.run("继续");
```

ContextBuilder 会拿到：

```text
assistant(tool_call)
user_input("继续")
```

但中间缺 tool result。

Provider 可能不接受。

所以我们不能只说：

```text
保留 unresolved Tool Call 就完事了
```

---

# 22. 这里有两种思路

### 方案 A：Abort settlement 时补 cancellation result

例如：

```text
assistant(tool_call)
tool_result {
  success: false,
  error: {
    code: "TOOL_EXECUTION_CANCELLED"
  }
}
```

这样 transcript 是完整的。

但要注意：

它不是说：

```text
Tool 执行失败
```

而是说：

```text
Runtime 明确记录：
这个 Tool Call 因 Run cancellation 没有执行完成
```

这其实是一个**Runtime-generated pairing fact（Runtime 生成的配对事实）**。

---

### 方案 B：下一次 ContextBuilder 遇到 unresolved Tool Call 时修复

也就是：

```text
RuntimeState 保持真实
 ↓
ContextBuilder 投影给 LLM 时
插入 synthetic cancellation result
```

这看起来似乎“更纯”。

但这会让 VII-D 的 ContextBuilder 突然承担：

```text
protocol repair
```

职责。

明显是新的复杂度。

我不太喜欢。

---

# 23. 所以如果 Provider 协议确实要求 tool pairing，我反而更倾向 A

即：

> Abort 导致已 commit 的 ToolCall 无法继续时，Runtime 可以写入明确的 cancellation pairing result。

但是，这个结果必须和：

```text
Tool execution started/completed
```

严格区分。

例如：

```text
assistant(tool_call)
 ↓
Abort before execution
 ↓
Runtime appends cancellation result

BUT:

no tool_execution_started
no tool_execution_completed
```

它描述的是：

```text
ToolCall resolution
```

不是：

```text
Tool Execution lifecycle
```

这与 VII-C maxTurns 非常相似。

VII-C 已经证明：

```text
ToolCall 可以被 resolution
但没有真实 execution event
```

README 当前也记录：

> 最后一轮 Tool Calls 写 skipped result，不执行 Tool。fileciteturn0file0L91-L94

所以这里其实已有先例。

---

# 24. 不过我建议先不要马上创建 `TOOL_EXECUTION_CANCELLED`

因为我们还缺最后一个决定：

> **Abort 最终到底是 RunOutcome，还是 Error？**

如果 Abort 本身是：

```text
RunOutcome: aborted
```

那么 cancellation result 很自然。

如果 Abort 是：

```text
throw AbortError
```

我们还需要决定：

```text
RuntimeState 是否仍做 cleanup / pairing
```

所以这个先 Pending。

---

# 25. 我们现在可以先锁定 Tool 层的几条原则

我建议把下面这些确定下来：

### F-AD06

> Tool execution receives the same AbortSignal through ToolExecutor.

即：

```text
Runtime
 ↓ signal
ToolExecutor
 ↓ signal
Tool
```

---

### F-AD07

> Cancellation bypasses Tool Error Contract.

即：

```text
Abort
≠ TOOL_EXECUTION_FAILED
```

---

### F-AD08

> Abort cannot rollback Tool side effects already performed.

也就是：

```text
Cancellation
≠ Transaction rollback
```

---

### F-AD09

> If a Tool has successfully returned a final result, Runtime should commit that result before stopping further Run progression.

这一条是目前我推荐的语义：

```text
Tool returned
 ↓
commit result
 ↓
tool_execution_completed
 ↓
stop before next model turn
```

而不是：

```text
Tool returned
 ↓
看到 signal.aborted
 ↓
把真实发生的 Tool result 扔掉
```

---

# 26. 到这里你应该能看到 Provider 与 Tool 的一个很有意思的差异

```text
ModelProvider
    │
    └─ primarily produces information

Tool
    │
    └─ may change the external world
```

因此：

```text
Abort after provider returns
→ 可以选择不接受输出

Abort after tool returns
→ 更应该记录 Tool 已发生的结果
```

这是我认为 VII-F 一个挺重要的**核心认知升级**。

Agent Runtime 并不只是：

```text
一个 while loop + 一堆 await
```

不同 await 边界背后的语义不一样。

---

# 27. 现在进入最后一个大问题：Abort 是 Outcome 还是 Error？

我们已经把底层 cancellation 行为基本分析清楚了。

现在回到 public API：

```ts
await runtime.run("...");
```

当用户主动 Abort 时，到底发生：

### A

```ts
throw AbortError
```

还是：

### B

```ts
return {
  type: "aborted"
}
```

这会直接决定：

```text
run_finished 是否发
```

以及：

```text
Caller 怎么区分：
正常完成
达到限制
不支持
用户主动取消
真正异常
```

结合我们现有架构，我下一步更倾向认真比较这两种，而不是直接选。

因为：

```text
Provider crash
```

和：

```text
Caller intentionally aborts
```

其实性质差别非常大。

下一轮我们就专门把：

**Cancellation Settlement（取消结算）**

讲清楚，然后 VII-F 的 Architecture Analysis 基本就可以收束进入 Design Decision 阶段了。

## Turn 5

### User

继续

### ChatGPT

继续。现在我们把 VII-F 最后一个核心岔路讲清楚：**Cancellation Settlement（取消后的结算语义）**。

我先给结论倾向：**我更推荐把 Abort 设计成一种明确的 `RunOutcome`，而不是普通异常。**

原因不是“更好看”，而是它和我们当前 Runtime 的语义更一致。

---

## 1. 先区分三类结束

当前 Runtime 其实已经有三种不同性质的结束：

```text
A. 正常业务终止
completed

B. Runtime 可预期终止
unsupported
limit_reached

C. 非预期异常
Provider throw
Runtime invariant error
```

Abort 更像哪一种？

我认为更接近 B，而不是 C。

因为 Abort 通常是：

```text
Caller 主动请求停止
```

它不是：

```text
系统坏了
Provider 崩了
Runtime 出 bug 了
```

所以：

```text
Cancellation
≠ Failure
```

更准确是：

```text
Cancellation
= intentional run termination
```

---

## 2. 如果 Abort 作为 Error，会有什么问题？

方案 A：

```ts
await runtime.run(...)
```

取消时：

```ts
throw new AbortError()
```

Caller 就要：

```ts
try {
  const outcome = await runtime.run(...)
} catch (error) {
  if (isAbortError(error)) {
    ...
  }
}
```

这会把：

```text
用户主动停止
```

和：

```text
Provider 网络异常
Runtime invariant error
程序 bug
```

全部塞进 Promise rejection。

这不是不能做，很多 API 都这么做。

但对于我们这个 Runtime，问题是：

> `run()` 本身已经有一个显式的 terminal state model（终止状态模型）——`RunOutcome`。

既然：

```text
completed
unsupported
limit_reached
```

都通过 Outcome 表达：

```ts
return outcome;
```

那么 Caller 主动停止其实也很自然属于：

```ts
{
  type: "aborted"
}
```

---

# 3. 所以我倾向：

```ts
type RunOutcome =
  | { type: "completed"; ... }
  | { type: "unsupported"; ... }
  | { type: "limit_reached"; ... }
  | { type: "aborted" };
```

这意味着：

```ts
const outcome = await runtime.run(...);

switch (outcome.type) {
  case "completed":
    break;

  case "aborted":
    break;
}
```

而：

```text
Provider crashed
```

仍然：

```ts
throw originalError;
```

于是 Runtime API 有一个非常清楚的分界：

```text
Expected termination
        ↓
RunOutcome

Unexpected failure
        ↓
throw / reject
```

这个边界我认为非常干净。

---

## 4. 这样 `run_finished` 也自然了

VII-E 已经规定：

```text
run_finished
```

只有形成合法 `RunOutcome` 才会发。fileciteturn0file1L255-L262

如果：

```ts
{ type: "aborted" }
```

属于合法 `RunOutcome`，那么自然：

```text
run_started
...
run_finished({ type: "aborted" })
```

这很好理解。

而：

```text
Provider Error
```

仍然：

```text
run_started
model_turn_started
Provider throws
```

没有：

```text
run_finished
```

现有语义完全不用推翻。fileciteturn0file1L394-L403

---

# 5. 但 pre-aborted signal 是个特殊情况

前面我们讨论过：

```ts
controller.abort();

await runtime.run("hello", {
  signal: controller.signal,
});
```

我们倾向：

```text
Run 没真正开始
```

所以：

```text
no user_input
no run_started
```

那它要不要返回：

```ts
{ type: "aborted" }
```

我认为：**要。**

也就是：

```text
run() 被调用
 ↓
acquire ownership
 ↓
signal already aborted
 ↓
return { type: "aborted" }
```

但是：

```text
不发 run_started
```

因为 Event 是 Runtime lifecycle observation：

```text
run_started
```

应该表达：

> Runtime 真正开始推进这个 Run。

而 pre-aborted：

```text
Run API 被调用了
```

不等于：

```text
Run lifecycle 已启动
```

---

# 6. 这时会出现一个看起来奇怪但其实合理的情况

```ts
const outcome = await runtime.run("hello", {
  signal: preAbortedSignal,
});
```

返回：

```ts
{
  type: "aborted"
}
```

但是 Subscriber：

```text
一个 event 都没收到
```

这是不是矛盾？

不是。

因为：

```text
Public method settlement
```

和：

```text
Runtime lifecycle events
```

不是一回事。

这个调用：

```text
被 Runtime guard 拒绝进入真正生命周期
```

所以可以有结果：

```text
aborted
```

但没有：

```text
run_started / run_finished
```

---

# 7. 但这里有另一个可选语义

也有人会认为：

只要 `run()` 获得 ownership，就算 started：

```text
run_started
 ↓
发现 pre-aborted
 ↓
run_finished(aborted)
```

这样 Event 成对，更整齐。

但是它会导致：

```text
run_started
```

实际含义变成：

> `run()` 入口被调用了。

而不是：

> Runtime 开始处理一个用户输入。

我不建议这么做。

因为 VII-E 已经让 Event 尽量表达稳定的 runtime-level lifecycle，而不是方法调用 tracing。fileciteturn0file1L155-L159

---

# 8. 所以这里可以形成一条更精确的规则

### F-AD10 候选

> Pre-aborted Run 返回 `aborted` outcome，但不进入 Runtime lifecycle：不写 State、不发 `run_started` / `run_finished`。

这里可能你会问：

> 那 `run_finished` 不就不是所有 Outcome 都一定有了吗？

对。

需要把 VII-E 的旧认知稍微收紧成：

```text
run_finished
=
一个已经 started 的 Run
形成了 RunOutcome
```

而不是：

```text
所有 run() Promise 只要 return Outcome
就一定发 run_finished
```

这个调整是合理的，因为 VII-F 第一次出现了：

```text
Run 未真正开始就终止
```

VII-E 当时根本还没有这个状态。

这属于**真实新需求驱动的语义增量**，不是推翻前面的设计。

---

# 9. 再看 mid-run abort

如果已经：

```text
append user_input
run_started
```

之后才 Abort：

```text
run_started
 ↓
model_turn_started
 ↓
Abort
```

那么最后应该：

```text
run_finished({
  type: "aborted"
})
```

所以：

```text
started run
+
intentional cancellation
=
finished with aborted outcome
```

这个生命周期很完整。

---

# 10. 现在我们可以把不同路径画完整

### 正常完成

```text
run_started
 ↓
...
 ↓
run_finished(completed)
```

---

### maxTurns

```text
run_started
 ↓
...
 ↓
run_finished(limit_reached)
```

---

### mid-run Abort

```text
run_started
 ↓
...
 ↓
run_finished(aborted)
```

---

### pre-abort

```text
run()
 ↓
signal already aborted
 ↓
return aborted

(no events)
```

---

### Provider Error

```text
run_started
 ↓
model_turn_started
 ↓
provider throws
 ↓
throw original error

(no run_finished)
```

这样五条语义其实非常统一。

---

# 11. 现在回到 active run 的释放

如果我们采用：

```text
aborted = RunOutcome
```

active run ownership 就更容易统一：

```ts
acquire();

try {
  ...
  return outcome;
} finally {
  release();
}
```

无论：

```text
completed
unsupported
limit_reached
aborted
Provider error
Runtime error
```

最后都：

```text
active → idle
```

这条必须是硬 invariant（强不变量）。

---

# 12. 为什么不能只在正常 return 时 release？

因为：

```text
Run A
 ↓
Provider throws
 ↓
忘了 release
```

之后：

```ts
runtime.run("B")
```

永远得到：

```text
already active
```

Runtime 被永久锁死。

所以：

> **Run Ownership 是 resource ownership（资源所有权），必须在 `finally` 中释放。**

这个思路和：

```text
lock
file handle
db connection
mutex
```

很类似。

---

# 13. 那 AbortController 到底放哪？

现在我们的语义已经清楚很多了。

我仍然倾向：

```ts
runtime.run(input, {
  signal?: AbortSignal
})
```

而不是：

```ts
runtime.abort()
```

原因是：

```text
Caller
owns cancellation intent
```

Runtime 只负责：

```text
observe signal
propagate signal
settle run
```

形成：

```text
Caller
  │
  │ AbortSignal
  ▼
AgentRuntime
  │
  ├─ ModelProvider
  └─ ToolExecutor
       └─ Tool
```

---

# 14. 为什么 v1 不需要 Runtime 自己创建 AbortController？

如果 Runtime 自己：

```ts
#activeRunController = new AbortController();
```

又允许 Caller：

```ts
run(..., { signal })
```

就会出现：

```text
external signal
internal signal
```

然后要合并：

```ts
AbortSignal.any(...)
```

又要决定：

```text
谁 abort 谁
abort reason 怎么合并
哪个 reason 优先
```

没有当前需求。

所以 v1 最小化：

```text
Caller provides optional signal
```

足够了。

---

# 15. 没传 signal 怎么办？

当然完全正常：

```ts
runtime.run("hello");
```

相当于：

```text
不可由 Caller 主动 cancel
```

但 Single Active Run guard 仍然存在。

所以要注意：

```text
Single Active Run
```

和：

```text
Abort
```

是两套独立能力。

即使：

```text
没有 AbortSignal
```

也必须防止：

```text
run(A)
run(B)
```

并发污染 State。

---

# 16. 接下来回到 Tool Call pairing

现在因为我们倾向：

```ts
RunOutcome = aborted
```

那么之前 unresolved ToolCall 的问题也更容易处理。

假设：

```text
assistant(tool_calls)
 ↓ committed
 ↓
Abort
```

为了下一次 Run 能继续构建合法 Context，我更倾向：

> 对还没有进入真实 execution 的 ToolCall，写 Runtime-generated cancellation result。

例如概念上：

```text
TOOL_EXECUTION_CANCELLED
```

但注意这个名字我还不确定是不是最终最好。

语义应该是：

```text
ToolCall was resolved as not executed
because the Run was cancelled
```

而不是：

```text
Tool ran and failed
```

---

# 17. 为什么需要 pairing？

因为我们的 RuntimeState 不只是日志。

它还会成为下一轮 ContextBuilder 的输入。

VII-D 明确就是：

```text
RuntimeState facts
 ↓
ContextBuilder
 ↓
TurnSnapshot
 ↓
ModelProvider
```

fileciteturn0file0L108-L118

所以如果 State 留下：

```text
assistant(tool_call)
```

没有对应 Tool result，下一次模型调用很可能拿到不完整协议。

这时候：

> State truthfulness（状态真实性）

和：

> Provider protocol completeness（供应商协议完整性）

必须同时满足。

---

# 18. cancellation result 为什么仍然是真实事实？

因为：

```text
ToolCall 被模型提出
```

是真的。

```text
Runtime 因 cancellation 没有执行它
```

也是真的。

所以写：

```text
cancelled
```

并不是伪造。

真正伪造的是：

```text
TOOL_EXECUTION_FAILED
```

因为 Tool 根本没有执行。

或者：

```text
success
```

更不对。

所以这类 Runtime-generated result 和 maxTurns 的 skipped result 属于同一种结构思想：

```text
Tool Call request
 ↓
Runtime decides not to execute
 ↓
Runtime-generated terminal pairing
```

区别只是原因：

```text
maxTurns → skipped
abort    → cancelled
```

---

# 19. 但这里要严格保证 Event 不说谎

如果：

```text
ToolCall
 ↓
Abort before execution
 ↓
append cancelled result
```

那么：

```text
NO tool_execution_started
NO tool_execution_completed
```

因为没有 Tool execution。

这个原则正好延续 VII-E 已经建立的：

> ToolCall ≠ ToolExecution。fileciteturn0file1L189-L199

所以 State 中可以有：

```text
tool_result(cancelled)
```

但 Event 中没有：

```text
tool_execution_completed
```

看起来有点反直觉，但语义是对的。

因为这个 message 表达的是：

```text
ToolCall resolution
```

而 Event 表达的是：

```text
Tool execution lifecycle
```

两层不是同一个概念。

---

# 20. 如果 Tool 已经 started 后 Abort 呢？

这里更复杂：

```text
tool_execution_started
 ↓
Tool running
 ↓
Abort
```

如果 Tool 真正响应 signal，抛 cancellation：

```text
Tool没有成功形成 final result
```

那我们是否也需要写：

```text
cancelled RuntimeToolMessage
```

我倾向：**需要。**

原因仍然是：

```text
assistant(tool_call)
```

需要有 terminal pairing。

但：

```text
tool_execution_started
```

已经发过了。

最终事件可能是：

```text
tool_execution_started
```

没有：

```text
tool_execution_completed
```

而 State：

```text
tool_result(cancelled)
```

仍然存在。

这是不是矛盾？

不是。

因为：

```text
tool_execution_completed
```

按 VII-E 的定义代表：

> ToolExecutor 形成了真实 execution result 并提交。

而：

```text
cancelled pairing
```

是 Runtime settlement fact，不是 Tool 成功完成一次 execution。

这个边界需要在实现时写测试锁死。

---

# 21. 这里可能值得换一个名字

如果我们叫：

```text
TOOL_EXECUTION_CANCELLED
```

容易让人理解成：

> Tool execution completed with cancellation.

也许更准确叫：

```text
TOOL_CALL_CANCELLED
```

因为它描述：

```text
这个 ToolCall 没有正常完成
```

而不强绑定 execution。

我现在更倾向：

```text
TOOL_CALL_CANCELLED
```

但这只是候选命名。

---

# 22. 现在我们的 Architecture Analysis 已经基本收束

我把目前推荐结论压成一版。

### Run ownership

```text
F-AD01
Each AgentRuntime owns at most one Active Run.
```

### Concurrent call

```text
F-AD02
Concurrent / reentrant run() fails fast.
No queue, no cancel-previous.
```

### Pre-abort

```text
F-AD03
Pre-aborted signal prevents the Run from starting:
no user_input, no lifecycle events.
```

### Cancellation model

```text
F-AD04
Cancellation is cooperative and propagates via AbortSignal.
```

### Provider

```text
F-AD05
Provider receives signal as execution control metadata,
not as ModelRequest context data.
```

### Tool

```text
F-AD06
ToolExecutor propagates the same signal to Tool execution.
```

### Error semantics

```text
F-AD07
Cancellation bypasses Tool Error Contract.
```

### Side effects

```text
F-AD08
Cancellation never implies rollback of external side effects.
```

### Commit

```text
F-AD09
Committed Runtime facts are never rolled back.
Successful Tool results are committed before stopping further progression.
```

### Run settlement

```text
F-AD10
Abort is an expected Run termination and returns:
RunOutcome { type: "aborted" }
```

### Lifecycle

```text
F-AD11
A started Run ends with run_finished(aborted).
A pre-aborted Run never starts and emits no lifecycle events.
```

### ToolCall resolution

```text
F-AD12
Committed unresolved ToolCalls must receive an explicit
cancellation pairing result without fabricating Tool execution events.
```

### Ownership release

```text
F-AD13
Active Run ownership is released on every settlement path,
including errors and abort.
```

---

## 一个你现在可以建立的整体心智模型

VII-B 时我们得到：

```text
AgentRuntime
= State mutation owner
```

VII-E：

```text
AgentRuntime
= lifecycle observation producer
```

VII-F 再补：

```text
AgentRuntime
= Active Run ownership boundary
  + cancellation coordination boundary
```

所以现在 Runtime 已经越来越像真正意义上的 **Runtime（运行时）** 了，而不是：

```ts
while (...) {
  await llm();
  await tool();
}
```

它开始负责：

```text
who may execute
when execution may continue
what may be committed
when execution terminates
```

这就是 Control Plane（控制面）的雏形。

接下来已经可以从 Architecture Analysis 逐步切到 **Design Decision**：重点把上面 13 条候选逐条审一遍，尤其确认 `aborted RunOutcome`、`TOOL_CALL_CANCELLED`、Provider/Tool 的 signal contract 三处 Public Contract（公共契约），然后再生成 Codex Implementation Task。

## Turn 6

### User

继续

### ChatGPT

好，我们进入 **Design Decision（设计决策）**，把刚才 Architecture Analysis 里的候选项正式收敛，避免后面 Codex 实现时自己猜。

这一阶段重点不再扩问题，而是决定：**公共 API 怎么长、状态怎么变化、取消如何结算、哪些边界必须测试锁死。**

---

## 先定一条总原则

VII-F 不是做“全功能任务调度器”，而是给当前单实例 Runtime 增加一层最小 Control Plane（控制面）：

```text
AgentRuntime
  = State mutation owner
  + Agent Loop owner
  + lifecycle event producer
  + Active Run owner
  + cancellation coordinator
```

同时继续保持：

```text
不做 queue
不做 parallel run
不做 multi-agent
不做 durable execution
不做 retry / timeout framework
不做 session lock
```

这仍符合整个 Part VII 的渐进式工程原则。fileciteturn0file0L230-L238

---

# Design Decision 1：Single Active Run

这一条我建议正式锁定。

> **F-AD01：每个 `AgentRuntime` 实例同一时刻最多只能有一个 Active Run（活跃运行）。**

也就是：

```text
idle
 ↓ run(A)
active(A)
 ↓ settle
idle
```

如果 active 时：

```ts
runtime.run("B");
```

则 B：

```text
fail fast
```

A 不受影响。

不是：

```text
cancel A
run B
```

也不是：

```text
B 排队
```

---

## 为什么必须在写 State 前检查？

顺序必须是：

```text
run(B)
 ↓
check active
 ↓
reject
```

而不是：

```text
run(B)
 ↓
append user_input
 ↓
check active
```

否则 Single Active Run 虽然 API 上失败了，但 State 已经被 B 污染。

因此我们锁：

> **F-AD02：Active Run guard 必须位于任何 RuntimeState mutation 之前。**

这个测试一定要有。

---

# Design Decision 2：Reentrant Run 也属于并发

我们不单独搞另一套机制。

Subscriber 中：

```ts
runtime.subscribe(() => {
  void runtime.run("B");
});
```

本质仍然是：

```text
当前 Run active
 ↓
第二个 run()
```

所以直接复用相同 guard。

> **F-AD03：Concurrent run 与 reentrant run 使用同一 Active Run invariant，不建立单独的 reentrancy 系统。**

这个决定很重要，因为否则很容易过度设计：

```text
reentrancy flag
subscriber guard
run depth
call stack token
```

都不需要。

---

# Design Decision 3：Abort API

这里我建议正式采用：

```ts
runtime.run(userInput, {
  signal?: AbortSignal,
});
```

而不是：

```ts
runtime.abort();
```

也不做：

```ts
RunHandle.cancel();
```

第一版最小公共 API 就一个 optional signal（可选中止信号）。

> **F-AD04：Caller 通过 `AbortSignal` 表达 Cancellation Intent（取消意图）；AgentRuntime 不提供独立 `abort()` API。**

原因已经比较明确：

```text
Caller owns cancellation intent
Runtime owns execution
```

职责最清楚。

---

# Design Decision 4：Signal 不进入 ModelRequest

这个也建议直接锁。

不要：

```ts
interface ModelRequest {
  messages: ...
  tools: ...
  signal?: AbortSignal;
}
```

因为：

```text
ModelRequest
= 模型语义输入
```

而：

```text
AbortSignal
= execution control metadata
```

所以 Provider 应该类似：

```ts
generate(
  request: ModelRequest,
  options?: {
    signal?: AbortSignal;
  },
): Promise<ModelResponse>;
```

具体类型名实现时可以微调，但职责不能变。

> **F-AD05：Cancellation metadata 与 ModelRequest 分离，不污染 VII-D 已确认的 model-context contract。**

这点是在保护 ContextBuilder / TurnSnapshot 边界。VII-D 已明确 Snapshot 只投影 messages 和 tools。fileciteturn0file0L108-L118

---

# Design Decision 5：Tool 也收到 signal

Tool 不能只靠 Runtime 前后检查。

所以 Tool execution contract 要做最小增量。

我建议：

```ts
interface ToolExecutionOptions {
  signal?: AbortSignal;
}
```

然后：

```ts
tool.execute(args, options)
```

而不是把 signal 直接作为第二个裸参数。

原因只是给当前 execution metadata 一个明确容器，不代表我们要提前构造万能 `ToolContext`。

> **F-AD06：ToolExecutor 将同一 AbortSignal 传给 Tool；只增加最小 ToolExecutionOptions，不扩展通用 ToolContext。**

---

# Design Decision 6：Cancellation 绕过 Tool Error Contract

这一条可以正式锁。

普通 Tool error：

```text
throw
 ↓
ToolExecutor normalize
 ↓
TOOL_EXECUTION_FAILED
 ↓
RuntimeToolMessage
```

Cancellation：

```text
AbortSignal
 ↓
Tool cooperative cancellation
 ↓
向 Runtime 传播 cancellation
```

不能转成：

```text
TOOL_EXECUTION_FAILED
```

因此：

> **F-AD07：Cancellation 不属于 Tool business / execution failure，不能被 ToolExecutor 归一化成现有 Tool Error Contract。**

这正好延续 VII-C 对错误语义的严格区分。

---

# Design Decision 7：Abort 是 Outcome，不是 Error

这一条我建议正式确定：

```ts
type RunOutcome =
  | ...
  | { type: "aborted" };
```

原因是：

```text
Caller intentionally stops
```

属于可预期 Runtime termination（运行终止），不是异常故障。

所以形成：

```text
Expected termination
→ RunOutcome

Unexpected failure
→ throw / reject
```

即：

> **F-AD08：Abort 返回 `RunOutcome { type: "aborted" }`；Provider / Runtime 非预期异常仍保持 throw。**

这是我认为整个 VII-F 最重要的公共语义之一。

---

# Design Decision 8：Pre-abort 不启动生命周期

如果：

```ts
controller.abort();

runtime.run("hello", {
  signal: controller.signal,
});
```

则：

```text
acquire run ownership
 ↓
发现 pre-aborted
 ↓
return aborted
 ↓
release ownership
```

但：

```text
no user_input
no run_started
no run_finished
```

为什么不发 `run_finished`？

因为这个 Run 从 runtime lifecycle（运行生命周期）角度根本没有 started。

所以：

> **F-AD09：Pre-aborted run 返回 `aborted`，但不写 State、不发任何 Run lifecycle event。**

这一条会让 VII-E 的旧语义稍微精确化：

```text
run_finished
= started Run 的合法终止
```

而不是：

```text
所有返回 RunOutcome 的 run() 调用
```

---

# Design Decision 9：Mid-run Abort 有 run_finished

只要：

```text
user_input committed
run_started emitted
```

就说明 Run 已经真正开始。

此后 Abort：

```text
run_started
 ↓
...
 ↓
run_finished(aborted)
```

所以：

> **F-AD10：已启动 Run 被取消时，必须形成 `run_finished({ type: "aborted" })`。**

这保持 Event Contract 的一致性。

---

# Design Decision 10：Committed fact 永不回滚

这一条也正式锁。

Abort 可能发生在任意时刻，但：

```text
RuntimeState 已经 commit 的 message
```

不删除。

即：

```text
Abort
≠ rollback
```

所以：

> **F-AD11：Cancellation 只阻止后续推进；已经 commit 的 Runtime facts 不因 Abort 回滚。**

这包括：

```text
user_input
assistant message
tool result
```

只要已经正式进入 State，就保留。

---

# Design Decision 11：Provider result 与 Tool result 的 post-await 语义不同

这条我认为非常值得保留，而且是这一节的重点学习成果。

## Provider

如果 Provider 返回时：

```text
signal.aborted === true
```

可以不接受结果：

```text
discard provider output
→ aborted
```

因为模型输出一般还没有外部业务副作用。

---

## Tool

如果 Tool 已经正常 return 最终结果：

```text
Tool side effect / observation happened
 ↓
Tool returned final result
```

我们更应该：

```text
commit RuntimeToolMessage
 ↓
tool_execution_completed
 ↓
stop before next Model Turn
```

而不是因为 signal 恰好晚到一点就把 Tool result 丢掉。

所以：

> **F-AD12：Provider output 在 cancellation acceptance boundary 前可被丢弃；Tool 一旦成功返回 final result，则优先 commit 该事实，再阻止后续 Run progression。**

这个差异不要为了“代码统一”抹平。

---

# Design Decision 12：Abort 不回滚 Tool side effects

这一条和上一条相关，但要单独记录。

如果 Tool：

```text
createOrder()
sendEmail()
writeFile()
```

已经发生真实副作用：

```text
Abort
```

不能自动撤销。

> **F-AD13：Cancellation 不提供 transaction rollback / compensation semantics。**

如果未来需要：

```text
幂等
补偿
Saga
Durable Tool Execution
```

另开阶段。

README 已经明确 Durable Tool Execution 不属于当前 v1。fileciteturn0file0L240-L251

---

# Design Decision 13：Unresolved ToolCall 必须被 settlement

这里我建议也定下来，否则下一次 Run 有协议风险。

假设：

```text
assistant(tool_call)
 ↓ committed
 ↓
Abort
```

我们不应该留下裸：

```text
assistant(tool_call)
```

然后直接下一次：

```text
user_input
```

因为 Provider 协议可能要求 Tool Call / Tool Result 配对。

所以应写一个 Runtime-generated cancellation pairing。

我建议命名：

```text
TOOL_CALL_CANCELLED
```

而不是：

```text
TOOL_EXECUTION_CANCELLED
```

因为它可能发生在 Tool 根本没执行时。

所以：

> **F-AD14：已 commit 但因 Run Abort 未正常完成的 ToolCall，由 Runtime 写入 `TOOL_CALL_CANCELLED` pairing result。**

注意这个 result 是：

```text
Runtime settlement fact
```

不是：

```text
Tool execution failure
```

---

# Design Decision 14：Cancellation pairing 不产生假的 Tool Execution Event

例如：

```text
assistant(tool_call)
 ↓
Abort before Tool start
 ↓
append TOOL_CALL_CANCELLED
```

不能发：

```text
tool_execution_started
tool_execution_completed
```

因为 Tool 没执行。

如果：

```text
tool_execution_started
 ↓
Tool cooperative abort
 ↓
append TOOL_CALL_CANCELLED
```

那么允许只有：

```text
tool_execution_started
```

而没有：

```text
tool_execution_completed
```

这和 Provider error 时：

```text
model_turn_started
```

可能没有 `model_turn_completed` 是一致的。VII-E 当前已经允许这种不成对异常生命周期。fileciteturn0file1L394-L403

所以：

> **F-AD15：Cancellation pairing message 不代表真实 Tool execution completed，因此不得伪造 Tool execution completed event。**

---

# Design Decision 15：Active ownership 永远 finally 释放

最后一条是强 invariant：

```text
completed
unsupported
limit_reached
aborted
provider error
tool/runtime error
```

全部最终：

```text
active → idle
```

所以架构要求是：

> **F-AD16：Active Run ownership 必须在统一 settlement cleanup 中释放，异常路径也不能遗留 active lock。**

实现大概率自然会落到：

```ts
try {
  ...
} finally {
  ...
}
```

但 Design Decision 只要求语义，不要求现在规定具体代码结构。

---

# 至此，VII-F 的最终职责可以压缩成 4 块

```text
Part VII-F
Abort + Single Active Run

1. Ownership
   └─ only one active run

2. Guard
   └─ concurrent / reentrant run fail fast

3. Cancellation propagation
   ├─ Runtime
   ├─ Provider
   └─ ToolExecutor → Tool

4. Settlement
   ├─ aborted RunOutcome
   ├─ committed facts preserved
   ├─ unresolved ToolCalls cancelled
   └─ active ownership released
```

不是 Queue，不是 Scheduler，也不是 Workflow Engine。

---

## 我认为 VII-F 的 Acceptance Criteria 可以正式写成下面这些

后面 Codex 实现和 Review 就按这些验：

1. 同一个 Runtime 两次并发 `run()`，第二次立即失败，并且第二条 `user_input` 不进入 State。
2. Subscriber 中重入 `run()` 同样被拒绝，不污染 State。
3. 第一个 Run 无论 completed、limit、unsupported、aborted 还是 throw，结束后都能再次正常 `run()`。
4. pre-aborted signal 返回 `aborted`，不写 `user_input`，不发 lifecycle events。
5. mid-run abort 返回 `aborted`，并产生 `run_finished(aborted)`。
6. AbortSignal 能传递到 Provider。
7. AbortSignal 能经 ToolExecutor 传递到 Tool。
8. Tool cancellation 不被转换成 `TOOL_EXECUTION_FAILED`。
9. Provider cancellation 后的未接受输出不进入 State。
10. Tool 成功返回后的最终结果会 commit，即使 Abort 阻止了后续 Turn。
11. 已 commit 的事实永不因 Abort 回滚。
12. unresolved ToolCall 在 Abort settlement 时得到 `TOOL_CALL_CANCELLED` pairing。
13. cancellation pairing 不伪造 `tool_execution_completed`。
14. 现有 VII-A～VII-E 测试全部继续通过。

到这里我认为 **Architecture Analysis + Design Decision 已经足够收束**，没有必要继续增加新的 F-AD。

下一步就应该进入我们固定流程的：

**Codex Implementation**

也就是基于这次已经确认的决策，生成一份完整的 **📋 Codex Implementation Task — Part VII-F：Abort + Single Active Run**，让 Codex 只实现这些内容、不重新设计。

## Turn 7

### User

继续

### ChatGPT

我会把这次已经锁定的 VII-F 决策整理成一份可直接交给 Codex 的实现任务，重点约束 Public Contract、取消传播、状态结算和测试，不让它顺手引入 Queue、Session、Approval 或通用 ExecutionContext。

可以。下面这份就可以直接给 Codex。它基于你这次上传的当前源码基线：`AgentRuntime.run()` 目前没有 active-run guard，Provider contract 仍是单参数 `generate(request)`，Tool contract 仍是 `execute(args)`，ToolExecutor 会把所有 Tool invocation throw 统一成 `TOOL_EXECUTION_FAILED`；这些正是 VII-F 要增量演进的真实位置。VII-E 已确认 Event 只是 Observation，不承担 Abort / Control。fileciteturn0file1L643-L653

:::writing{variant="document" id="58341" title="Codex Implementation Task — Part VII-F：Abort + Single Active Run"}
# Codex Implementation Task — Part VII-F：Abort + Single Active Run

我们正在实现一个 Node.js + TypeScript 的 `mini-agent-runtime`。

当前 Part VII 按固定 Milestone 演进：

```text
VII-A  Done  项目骨架 + 类型体系 + ModelProvider
VII-B  Done  RuntimeState + Agent Loop
VII-C  Done  Tool Registry + Tool Executor + Error Contract
VII-D  Done  ContextBuilder + TurnSnapshot
VII-E  Done  AgentEvent + Subscriber
VII-F  Now   Abort + Single Active Run
VII-G        SessionStore + Conversation Recovery
VII-H        beforeToolCall + Approval
VII-I        Weather Agent
```

本次不要重新做架构设计。

下面的 Architecture Decisions 已经由 GPT 讨论确认。请基于当前仓库做**最小增量实现**，不要提前实现 VII-G / VII-H / VII-I，也不要自行扩大 Scope。

---

# 1. Milestone Goal

Part VII-F 要为现有 `AgentRuntime` 增加最小的 Run Control（运行控制）能力：

1. 同一个 `AgentRuntime` 实例同一时刻最多只能有一个 Active Run。
2. 并发或重入调用 `run()` 时，新的 Run 立即失败，不能污染 `RuntimeState`。
3. Caller 可以通过 `AbortSignal` 请求取消正在执行的 Run。
4. AbortSignal 能沿执行链传播到：
   - `AgentRuntime`
   - `ModelProvider`
   - `ToolExecutor`
   - `Tool`
5. Cancellation（取消）与普通 Provider / Tool failure 保持不同语义。
6. 已经 commit 的 Runtime facts 不因 Abort 回滚。
7. Abort 后 unresolved ToolCall 必须形成合法 pairing，保证后续 Conversation 可以继续。
8. 所有 settlement path 都必须释放 Active Run ownership。

完成后，Runtime 应具备：

```text
Caller
  │
  │ run(input, { signal? })
  ▼
AgentRuntime
  │
  ├─ Active Run Guard
  ├─ Cancellation checks
  │
  ├─────────────→ ModelProvider
  │                  signal
  │
  └─────────────→ ToolExecutor
                         │
                         └─→ Tool
                              signal
```

但仍然只有一个 Runtime 内部串行 Agent Loop。

---

# 2. Current Repository State

请先阅读当前仓库，而不是根据本任务描述猜代码。

当前真实实现至少包括：

```text
src/runtime/agent-runtime.ts
src/runtime/agent-event.ts
src/runtime/context-builder.ts
src/runtime/runtime-state.ts

src/model/model-provider.ts
src/model/model.ts
src/model/openai/openai-model-provider.ts

src/tools/tool.ts
src/tools/tool-executor.ts
src/tools/tool-registry.ts

test/agent-runtime.test.ts
test/tool-runtime.test.ts
test/context-builder.test.ts
test/agent-event.test.ts
test/support/mock-model-provider.ts
```

进入 VII-F 前已有能力：

- `RuntimeState` 只保存 `messages`。
- `AgentRuntime` 是 RuntimeState mutation 的唯一 owner。
- 同一 Runtime 跨多次顺序 `run()` 保留 Conversation history。
- Agent Loop 支持 Model → Tool → Model。
- Tool Calls 顺序执行。
- `maxTurns` 限制 Model Turn。
- 达到 `maxTurns` 后：
  - 不执行 Tool；
  - 写 `TOOL_EXECUTION_SKIPPED` pairing result；
  - 返回 `limit_reached`。
- `ContextBuilder` 每个 Model Turn 从最新 Runtime facts 构建独立 Snapshot。
- Event model 当前只有：
  - `run_started`
  - `model_turn_started`
  - `model_turn_completed`
  - `tool_execution_started`
  - `tool_execution_completed`
  - `run_finished`
- Subscriber 是同步 best-effort Observer，不控制 Runtime。
- completed Event 在对应 fact commit 后发出。
- Provider error 保持原错误向上传播，不形成 `run_finished`。

当前关键代码事实：

### `AgentRuntime.run()`

当前签名：

```ts
async run(userInput: string): Promise<RunOutcome>
```

当前进入 `run()` 后会立刻：

```text
append user_input
emit run_started
```

目前没有 Active Run guard。

### `ModelProvider`

当前：

```ts
interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

### `Tool`

当前核心接口类似：

```ts
interface Tool<TArgs = unknown> {
  definition: ToolDefinition;
  execute: (args: TArgs) => ToolValue | Promise<ToolValue>;
}
```

### `ToolExecutor`

当前普通 Tool invocation throw 会被归一化为：

```text
TOOL_EXECUTION_FAILED
```

Cancellation 必须从这一逻辑中明确分离。

---

# 3. Confirmed Design Decisions

以下为本 Milestone 已确认决策。

不要重新选择其他方案。

---

## F-AD01 — Single Active Run

每个 `AgentRuntime` 实例同一时刻最多拥有一个 Active Run。

允许：

```text
runtimeA.run(...)
runtimeB.run(...)
```

不同 Runtime 实例可以独立运行。

禁止：

```text
runtimeA.run(A)
runtimeA.run(B)
```

在 A 尚未 settle 时并发推进同一份 RuntimeState。

---

## F-AD02 — Concurrent Run Fail Fast

如果 Runtime 已有 Active Run：

```ts
runtime.run("B")
```

新的 Run 必须立即失败。

不要：

- 自动排队；
- 等待 A 完成；
- 自动 Abort A；
- latest-wins；
- queue；
- scheduler。

Active Run guard 必须发生在任何新的 RuntimeState mutation 之前。

因此失败的 B：

```text
不得 append user_input
不得 emit run_started
不得调用 Provider
不得调用 Tool
```

---

## F-AD03 — Reentrant Run 使用同一 Guard

Subscriber 或其他同步 callback 中重新调用：

```ts
runtime.run(...)
```

也属于第二个 Active Run。

不要引入单独的：

- reentrancy depth；
- subscriber guard；
- call-stack tracking。

统一使用 Single Active Run invariant。

---

## F-AD04 — Cancellation API 使用 AbortSignal

`AgentRuntime.run()` 应最小增量支持：

```ts
runtime.run(userInput, {
  signal?: AbortSignal,
})
```

Caller owns cancellation intent。

Runtime 不新增：

```ts
runtime.abort()
```

也不实现：

```text
RunHandle
cancelPrevious
internal AbortController
AbortSignal.any
```

除非完成本 Milestone 所必需，否则不要增加。

---

## F-AD05 — AbortSignal 不进入 ModelRequest

`ModelRequest` 继续只表达模型语义输入：

```text
messages
tools
```

AbortSignal 属于 execution control metadata。

不要：

```ts
interface ModelRequest {
  ...
  signal?: AbortSignal;
}
```

而应让 `ModelProvider.generate()` 通过独立 execution options 接收 signal，例如：

```ts
generate(
  request: ModelRequest,
  options?: ModelGenerationOptions,
): Promise<ModelResponse>
```

其中第一版 `ModelGenerationOptions` 只需要：

```ts
signal?: AbortSignal
```

不要提前加入：

```text
timeout
retry
trace
session
metadata
```

---

## F-AD06 — Tool 收到同一个 AbortSignal

ToolExecutor 应把 Runtime 当前 Run 使用的同一个 AbortSignal 传给 Tool。

建议使用一个最小 execution-options contract，例如：

```ts
interface ToolExecutionOptions {
  signal?: AbortSignal;
}
```

Tool 形态可演进为：

```ts
execute(args, options)
```

但不要构造通用：

```ts
ToolContext {
  runtime
  session
  logger
  approval
  trace
  memory
  user
  ...
}
```

本轮只解决 cancellation。

---

## F-AD07 — Cancellation Bypasses Tool Error Contract

Cancellation 不属于普通 Tool execution failure。

普通 Tool throw：

```text
Tool throws normal error
        ↓
TOOL_EXECUTION_FAILED
```

Cancellation：

```text
AbortSignal
 ↓
Tool cooperatively aborts
 ↓
Cancellation 向 AgentRuntime 传播
```

禁止把 cancellation 归一化为：

```text
TOOL_EXECUTION_FAILED
```

需要一种清晰、可靠且最小的方式识别“本次 failure 属于当前 signal 的 cancellation”。

避免通过脆弱的字符串比较错误消息判断。

---

## F-AD08 — Abort 是 RunOutcome

扩展现有：

```ts
RunOutcome
```

增加：

```ts
{ type: "aborted" }
```

语义：

```text
expected runtime termination
→ RunOutcome

unexpected provider/runtime failure
→ throw / reject
```

因此 Caller 主动取消不是普通 Runtime error。

---

## F-AD09 — Pre-aborted Run 不真正开始

例如：

```ts
controller.abort();

await runtime.run("hello", {
  signal: controller.signal,
});
```

结果应为：

```ts
{ type: "aborted" }
```

但：

```text
不 append user_input
不 emit run_started
不 emit run_finished
不调用 Provider
不调用 Tool
```

这里的 `run_finished` 仅描述已经真正 started 的 Run lifecycle。

---

## F-AD10 — Mid-run Abort 形成 run_finished(aborted)

只要 Run 已经：

```text
append user_input
emit run_started
```

之后才发生 Abort，那么最终合法 cancellation settlement 应形成：

```text
run_finished({ type: "aborted" })
```

并返回：

```ts
{ type: "aborted" }
```

不要新增：

```text
run_aborted
model_turn_aborted
tool_execution_aborted
```

等 Event 类型。

继续复用现有 Event Contract。

---

## F-AD11 — Committed Facts Never Roll Back

Cancellation 不回滚已经进入 `RuntimeState.messages` 的事实。

包括已经 commit 的：

```text
user_input
model_output
tool_result
```

Abort 只阻止后续尚未完成的推进。

不要为了“让 transcript 看起来完整”删除已经 commit 的 message。

---

## F-AD12 — Provider 与 Tool 的 Post-await Semantics 不完全相同

### ModelProvider

若 Provider 调用结束后、Runtime 接受 response 前发现当前 Run 已经 cancelled：

```text
Provider returns
 ↓
signal aborted
 ↓
不要 commit model_output
 ↓
settle aborted
```

Provider output 可以被丢弃，因为它尚未成为 Runtime fact。

### Tool

若 Tool 已经成功返回 final result：

```text
Tool returned successfully
 ↓
commit RuntimeToolMessage
 ↓
emit tool_execution_completed
 ↓
若已经 aborted，则停止后续 Run progression
```

不要仅因为 signal 恰好在 Tool return 后已变为 aborted，就丢弃一个已经真实完成的 Tool result。

原因：

Tool 可能已经产生真实外部副作用。

Runtime 应诚实记录已经完成的 Tool execution result。

---

## F-AD13 — Abort 不等于 Rollback

Cancellation 不提供：

```text
transaction rollback
compensation
Saga
idempotent retry
durable recovery
```

Tool 已发生的外部副作用不会由 Runtime 自动撤销。

不要在本 Milestone 实现任何上述机制。

---

## F-AD14 — Unresolved ToolCall 必须形成 Cancellation Pairing

如果一个 assistant `tool_call` 已经 commit，但由于 Run cancellation 没有正常完成，对应 ToolCall 不能永远保持 unresolved。

增加明确的 Runtime-generated cancellation pairing。

当前建议错误码：

```text
TOOL_CALL_CANCELLED
```

其语义是：

> This ToolCall did not complete because the Run was cancelled.

不要使用：

```text
TOOL_EXECUTION_FAILED
```

因为 Tool 可能根本没有执行。

也不要复用：

```text
TOOL_EXECUTION_SKIPPED
```

因为该 code 已明确表示 `maxTurns` termination。

Cancellation pairing 的结构应继续兼容现有 `RuntimeToolMessage` / `ToolResult` 序列化方式，除非当前代码要求极小调整。

---

## F-AD15 — Cancellation Pairing 不伪造 Tool Execution Event

若：

```text
tool_call committed
 ↓
Abort before Tool execution
 ↓
Runtime 写 TOOL_CALL_CANCELLED pairing
```

则：

```text
没有 tool_execution_started
没有 tool_execution_completed
```

若：

```text
tool_execution_started
 ↓
Tool cooperatively aborts
 ↓
Runtime 写 TOOL_CALL_CANCELLED pairing
```

则允许：

```text
有 tool_execution_started
没有 tool_execution_completed
```

`tool_execution_completed` 必须继续表示：

> ToolExecutor 真实形成了 final Tool execution result，并被 Runtime commit。

不要为了让 Event 成对而伪造 completed Event。

---

## F-AD16 — Active Run Ownership Always Releases

无论以下任何路径：

```text
completed
unsupported
limit_reached
aborted
Provider throw
Tool/runtime invariant throw
```

Runtime 最终都必须恢复：

```text
active → idle
```

一个异常 Run 不得永久锁死 Runtime。

实现应有统一 cleanup boundary。

不要依赖每个 return branch 手工清理。

---

# 4. Expected Runtime Semantics

下面这些序列应作为实现语义参考。

---

## Case A — Normal Run

```text
run()
 ↓
acquire Active Run
 ↓
append user_input
 ↓
run_started
 ↓
...
 ↓
run_finished(completed)
 ↓
release Active Run
```

---

## Case B — Concurrent Run

```text
Run A active

Run B run()
 ↓
Active Run guard fails
 ↓
B rejects immediately

A continues normally
```

B 不得进入 State 或 Event lifecycle。

---

## Case C — Pre-aborted

```text
run(input, abortedSignal)
 ↓
acquire ownership
 ↓
detect pre-aborted
 ↓
return aborted
 ↓
release ownership
```

State 与 Event 均无变化。

---

## Case D — Abort During Provider

```text
append user_input
run_started
model_turn_started
Provider.generate(..., { signal })
 ↓
Abort
 ↓
Provider cancellation / return
 ↓
do not commit unaccepted model output
 ↓
run_finished(aborted)
 ↓
return aborted
 ↓
release
```

若 Provider 因其他非-cancellation error 失败：

```text
original error propagates
no run_finished
release ownership
```

保持 VII-E 语义。

---

## Case E — Abort Before Tool Execution

```text
model_output(toolCalls) committed
model_turn_completed
 ↓
Abort before Tool A starts
 ↓
append TOOL_CALL_CANCELLED for every unresolved ToolCall
 ↓
no fake tool execution events
 ↓
run_finished(aborted)
```

---

## Case F — Abort During Tool

```text
tool_execution_started
 ↓
Tool.execute(..., { signal })
 ↓
Abort
 ↓
Tool cooperatively cancels
 ↓
ToolExecutor must not emit TOOL_EXECUTION_FAILED
 ↓
Runtime writes TOOL_CALL_CANCELLED pairing
 ↓
no tool_execution_completed
 ↓
run_finished(aborted)
```

---

## Case G — Abort After Tool Successfully Returns

```text
tool_execution_started
 ↓
Tool returns success
 ↓
commit RuntimeToolMessage
 ↓
tool_execution_completed
 ↓
detect Run is cancelled
 ↓
do not start next Model Turn
 ↓
settle aborted
```

已经完成的 Tool result 不得丢失。

---

# 5. Implementation Boundaries

优先修改当前真实需要的文件。

预计可能涉及：

```text
src/runtime/agent-runtime.ts

src/model/model-provider.ts
src/model/openai/openai-model-provider.ts

src/tools/tool.ts
src/tools/tool-executor.ts

test/support/mock-model-provider.ts

test/agent-runtime.test.ts
test/tool-runtime.test.ts
test/agent-event.test.ts
```

如果为了类型职责清晰需要新增一个极小的 contract 文件，可以做，但必须有当前真实需要。

不要为了整理目录提前拆：

```text
run-manager.ts
scheduler.ts
session-controller.ts
execution-context.ts
cancellation-manager.ts
```

除非代码确实证明必要。

---

# 6. OpenAI Provider Requirement

当前项目使用 OpenAI SDK。

VII-F 应让真实 OpenAI Provider 将收到的 AbortSignal 继续传给 SDK / HTTP invocation 支持的 cancellation boundary。

请先确认当前项目安装的 OpenAI SDK v5 实际调用签名，然后按该版本真实 API 实现。

不要根据旧版本示例猜参数位置。

同时保持：

```text
ModelRequest
```

不包含 signal。

---

# 7. Tool Contract Requirement

修改 Tool contract 时保证现有 Tools 尽量保持低摩擦。

已有：

```ts
execute(args)
```

的测试和 demo 需要同步调整，或者通过合理的 optional options contract 保持兼容。

不要通过 `any`、宽泛 cast 或关闭 strict type 来规避接口演进。

---

# 8. Cancellation Detection Requirement

请实现明确的 cancellation detection。

目标是区分：

```text
1. 当前 signal 导致的 cooperative cancellation

2. Tool 自己真正 throw 的普通 error

3. Provider 自己真正 throw 的普通 error
```

Cancellation 可以被 Runtime 转换为：

```ts
{ type: "aborted" }
```

但普通 Provider error 仍必须保留原对象向上传播。

普通 Tool error 仍必须进入现有：

```text
TOOL_EXECUTION_FAILED
```

不要把所有 `AbortError` 名称字符串无条件当作当前 Run cancellation，除非能证明它与当前 signal 的状态和调用边界一致。

---

# 9. ToolCall Cancellation Pairing

扩展当前 `ToolError.code` 时增加一个 cancellation-specific code。

优先：

```text
TOOL_CALL_CANCELLED
```

保持：

```text
TOOL_EXECUTION_SKIPPED
```

原有含义完全不变。

Cancellation pairing message 应继续采用现有：

```ts
RuntimeToolMessage {
  type: "tool_result";
  toolCallId;
  content: JSON.stringify(...)
}
```

不要增加全新 Runtime message variant，除非当前真实协议无法表达。

---

# 10. Multiple Tool Calls

当前 Tool Calls 是顺序执行。

VII-F 不改变这一点。

例如：

```text
Tool A success
Tool B running → Abort
Tool C not started
```

预期：

```text
Tool A:
  real result committed
  normal started/completed events

Tool B:
  started
  cancellation pairing
  no completed event if cooperatively cancelled before final result

Tool C:
  cancellation pairing
  no execution events
```

已经完成的 A 不回滚。

未执行的 C 不应进入 ToolExecutor。

不要实现 parallel tool execution。

---

# 11. maxTurns Semantics Must Remain Unchanged

当前：

```text
final model turn
 ↓
tool_calls
 ↓
validate tool_calls invariant
 ↓
write TOOL_EXECUTION_SKIPPED for each call
 ↓
limit_reached
```

VII-F 不得破坏此逻辑。

Cancellation 与 maxTurns 应有明确优先级，避免同一个 ToolCall 同时写：

```text
TOOL_EXECUTION_SKIPPED
+
TOOL_CALL_CANCELLED
```

请根据 Run 当前 cancellation 状态和既有 control flow 设计唯一 settlement。

保持：

```text
TOOL_EXECUTION_SKIPPED
```

只表示 maxTurns termination。

---

# 12. Event Semantics Must Remain Stable

不要新增新的 AgentEvent union branch。

现有 completed semantics 必须保持：

```text
model_turn_completed
= accepted model fact committed

tool_execution_completed
= real Tool final result committed

run_finished
= a started Run formed a RunOutcome
```

因此：

### Pre-aborted

```text
no events
```

### Mid-run Abort

```text
run_finished(aborted)
```

### Provider cancellation before model commit

允许：

```text
model_turn_started
```

没有：

```text
model_turn_completed
```

### Tool cancellation after started

允许：

```text
tool_execution_started
```

没有：

```text
tool_execution_completed
```

不要为了 event pair symmetry 改变这些语义。

Subscriber 仍然只能 Observation，不允许它返回 cancel / stop。

---

# 13. Tests Required

不要只写 happy path。

至少覆盖以下场景。

## Active Run

1. 第一 Run pending 时第二个 `run()` 立即失败。
2. 第二个 Run 的 user input 不进入 State。
3. 第二个 Run 不产生 lifecycle events。
4. 第二个 Run 不影响第一 Run 正常完成。
5. Subscriber 内 reentrant `run()` 被同一 guard 拒绝。
6. failed/rejected second run 不改变 Runtime history。

## Ownership Release

7. normal completion 后可以再次 run。
8. limit_reached 后可以再次 run。
9. unsupported 后可以再次 run。
10. Provider throw 后可以再次 run。
11. aborted 后可以再次 run。

## Pre-abort

12. pre-aborted signal 返回 `aborted`。
13. 不写 user message。
14. 不调用 Provider。
15. 不发任何 lifecycle event。

## Provider Cancellation

16. Provider 能收到同一个 AbortSignal。
17. Provider pending 时 abort，最终 Run 为 `aborted`。
18. cancelled Provider response / cancellation 不写 model output。
19. 没有 `model_turn_completed`。
20. started Run 最终发 `run_finished(aborted)`。
21. unrelated Provider error 继续原对象传播。

## Tool Cancellation

22. ToolExecutor 能收到 signal。
23. Tool 能收到同一个 signal。
24. abort before Tool start 时 Tool 不执行。
25. abort during Tool 时 cancellation 不转成 `TOOL_EXECUTION_FAILED`。
26. cooperative Tool cancellation 写 `TOOL_CALL_CANCELLED` pairing。
27. 不伪造 `tool_execution_completed`。
28. Tool 正常 throw 仍是 `TOOL_EXECUTION_FAILED`。

## Successful Tool + Late Abort

29. Tool 已成功 return 时 result 仍 commit。
30. `tool_execution_completed` 正常发出。
31. Abort 阻止后续 model turn。
32. Run 最终为 `aborted`。

## Multiple Tools

33. Tool A success、Tool B cancelled、Tool C 未开始：
    - A result 保留；
    - B cancellation pairing；
    - C cancellation pairing；
    - C 不执行；
    - event 顺序符合真实 execution。

## Existing Semantics

34. maxTurns 原有 skipped pairing 不回归。
35. tool not found / invalid arguments / normal execution failure 不回归。
36. ContextBuilder 每轮使用最新 committed facts。
37. Event payload isolation 不回归。
38. Subscriber failure isolation 不回归。
39. Existing demos / tests 应继续工作，除非 API 必须做最小同步更新。

测试数量不是目标。

重点是每个 Architecture Decision 有对应 executable evidence。

---

# 14. Verification Commands

实现后至少运行：

```bash
npm test
npm run build
```

并运行项目此前使用的严格测试类型检查：

```bash
./node_modules/.bin/tsc --noEmit \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --allowImportingTsExtensions \
  --strict \
  --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes \
  --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

然后：

```bash
git diff --check
```

如果现有 deterministic demos 仍适用：

```bash
npm run demo:runtime
npm run demo:tools
```

真实 OpenAI Demo 不要求依赖网络完成自动化验证。

---

# 15. Explicit Non-Goals

Part VII-F 禁止提前实现：

```text
Run Queue
Scheduler
Parallel Runs
Parallel Tools
Multi-Agent
Sub-Agent

SessionStore
Session ID
cross-runtime session lock
conversation persistence
conversation recovery

beforeToolCall
Human Approval
Durable Approval

Durable Tool Execution
retry framework
timeout framework
compensation / Saga
transaction rollback
idempotency framework

Streaming
token delta
async Subscriber
EventBus expansion

generic ExecutionContext
generic ToolContext
runId / traceId / correlationId
OpenTelemetry
```

不要因为 AbortSignal 出现就顺手扩展这些能力。

---

# 16. Architecture Compatibility Requirements

实现完成后必须仍满足：

```text
RuntimeState
= committed runtime facts only

AgentRuntime
= control flow
+ RuntimeState mutation owner
+ lifecycle emission
+ Active Run ownership
+ cancellation coordination

ContextBuilder
= model context projection only

ModelProvider
= provider-neutral model invocation boundary

ToolExecutor
= one ToolCall execution boundary
+ normal Tool error normalization
+ cancellation pass-through

AgentEvent
= detached observation only

Subscriber
= synchronous best-effort observer
```

不要改变既有 dependency direction。

---

# 17. Implementation Discipline

请遵守：

1. 先阅读当前代码。
2. 基于现有类型和职责增量修改。
3. 不重新设计已经完成的 VII-A～VII-E。
4. 不因为代码更“通用”而增加本轮无需求的抽象。
5. Public Contract 有变化时必须有测试。
6. 不通过 broad `any` 或 unsafe cast 绕过 TypeScript。
7. 普通 Provider / Tool error 的既有 identity / semantics 尽量保持。
8. Cancellation 与 failure 必须明确区分。
9. 测试通过不等于架构完成，要逐条核对 F-AD。
10. 如果实现中发现某条已确认决策与当前真实代码存在无法兼容的明确问题：
   - 不要自行改设计；
   - 在 Implementation Summary 中明确指出；
   - 说明冲突位置和最小替代方案。

---

# 18. Deliverables

完成后请输出：

## A. Implementation Summary

简洁说明本轮实际实现了什么。

## B. Files Changed

逐文件列出修改及职责。

## C. Architecture Compliance

按 F-AD01 ～ F-AD16 逐条说明：

```text
Satisfied / Not Applicable / Conflict
```

并给出代码或测试证据。

## D. Cancellation Semantics

明确说明最终实现中：

```text
pre-abort
provider abort
tool abort
late tool abort
multiple tool abort
```

分别如何 settlement。

## E. Tests Added / Changed

说明每组测试保护的 Architecture Contract。

## F. Verification Results

至少给出：

```text
npm test
npm run build
strict test type-check
git diff --check
```

实际结果。

## G. Scope Check

明确确认没有提前实现：

```text
VII-G SessionStore
VII-H Approval
Queue / Scheduler
Multi-Agent
Durable Execution
Streaming
```

## H. Remaining Concerns

如果存在：

```text
known limitation
ambiguous edge case
future milestone concern
```

只记录，不自行扩展实现。

---

# 19. Milestone Completion Definition

只有同时满足以下条件才视为 VII-F 第一轮实现完成：

```text
Single Active Run guard works
Concurrent / reentrant run cannot mutate State
AbortSignal propagates through execution chain
Abort is represented as aborted RunOutcome
Cancellation does not become normal Tool failure
Committed facts are preserved
Unresolved ToolCalls are validly settled
No fake Tool execution events are emitted
Active ownership always releases
VII-A～VII-E behavior does not regress
All required verification passes
No later-Part functionality is introduced
```

请现在基于当前 repository 开始实现。

不要重新进行架构方案讨论。
:::

这版里我特意把一个容易被 Codex 模糊处理的地方写死了：**Provider cancellation、Tool cooperative cancellation、Tool 已成功返回后的 late abort 是三种不同 settlement**，不能统一成一个 `await → signal.aborted → discard` 模板。另外，当前 README 对 VII-F 的范围本身就是 Abort、Single Active Run、并发保护和状态竞争，后面的 Session persistence 与 Approval 仍分别属于 VII-G / VII-H。fileciteturn0file0L152-L176

你下一步可以直接把这份交给 Codex。等 Codex 返回**实现总结 + diff/源码 + 测试结果**后，我们就进入固定流程下一阶段：**Runtime Verification / Debug → Code Review + Theory Feedback**。
