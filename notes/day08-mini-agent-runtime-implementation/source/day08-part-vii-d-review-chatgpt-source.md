# Part VII-D：交付、Code Review 与 Closure 源记录

- 来源：[Part VII - D](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6aa26628-b1dc-83ee-b566-4df8c1a0c660)
- 归档日期：2026-09-14。
- 读取方式：此前已登录 Chrome 会话 main 区域的完整可见文本；从本次 Codex 会话的工具返回记录恢复。原始整体文本为 78,340 个 JavaScript UTF-16 字符。
- 本文件按时间顺序保存第 8～9 轮。轮次和 User / ChatGPT 标题为归档添加，不伪造消息 UUID。
- 此为页面文本原文归档，不是概述；页面的代码语言标签、引用文件名、时间和“来源”等文本保留。原始 Markdown 的代码围栏、列表格式未能从 innerText 恢复。
- ZIP / Markdown 附件仅保留页面显示的文件名，附件正文不在此次归档中。“今天”等相对时间沿用读取时页面，不能据此推断实际讨论日期。
- 历史候选与 Review 陈述不作为当前代码规范；最终事实以[主笔记](../day08-part-vii-d-context-builder-turn-snapshot.md)和仓库源码为准。

## 轮次 8

### User


source-review(2).zip
压缩归档
实现总结：

已完成 VII-D：ContextBuilder 已进入真实调用链，每个 Model Turn 都从最新事实生成独立 TurnSnapshot。

修改文件

新增 [context-builder.ts](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/context-builder.ts)：定义 ContextBuildInput、TurnSnapshot 和无状态 ContextBuilder，复用消息映射并深拷贝完整投影。
修改 [agent-runtime.ts](/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts)：每轮调用 Builder，将 Snapshot 作为 ModelRequest 传给 Provider。
新增 [context-builder.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/context-builder.test.ts)：投影与双向引用隔离测试。
修改 [tool-runtime.test.ts](/Users/shengq/Desktop/mini-agent-runtime/test/tool-runtime.test.ts)：新增逐轮完整上下文集成测试，原测试预期未改动。

Architecture Compliance

决策结果	
D-AD01	满足：RuntimeState 保存事实，Builder 独立投影模型上下文。
D-AD02	满足：Builder 无依赖、无状态，不修改输入或控制流程。
D-AD03	满足：每次 generate 前重新构建 Snapshot。
D-AD04	满足：TurnSnapshot 独立定义，保留 ModelRequest，无新增 Mapper。
D-AD05	满足：Snapshot 同时覆盖 messages 和 tools；空工具集合省略 tools。
D-AD06	满足：使用 structuredClone 隔离嵌套引用，未引入冻结机制。

Tests Added

新增 5 个测试，保护：

三种消息类型、字段、顺序和 Tool Call / Result ID 配对。
修改 Snapshot 数组、消息、嵌套 arguments 不污染输入历史。
后续历史修改和再次构建不影响旧 Snapshot。
工具 definitions、嵌套 schema 的双向隔离及 Registry 保护。
第二轮读取最新消息与工具 definitions，且各轮请求相互隔离。

Verification Results

npm test：50/50 通过，包含全部既有回归测试。
npm run build：通过。
额外测试 TypeScript type-check：通过，保持 strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes。
npm run demo:tools：通过，确定性两轮工具流程正常。
git diff --check：通过。

Scope Check

未新增 VII-D 范围外能力或依赖；RuntimeState schema 不变；未新增 Context Policy、Token、Summary、Memory 等能力；未修改 Provider / Tool 架构、VII-C termination 或 skipped 行为。未创建 Git 提交。

测试结果：

➜ mini-agent-runtime git:(main) ✗ npm run test

mini-agent-runtime@0.1.0 test
tsx --test test/**/*.test.ts

✔ completes a normal answer and records runtime facts (2.274875ms)
✔ retains conversation across two runs on the same runtime (0.344584ms)
✔ records missing tool failure and continues within the same run (0.32275ms)
✔ preserves output for length without retry or continuation (0.59725ms)
✔ preserves output for unknown without retry or continuation (0.328583ms)
✔ propagates the original provider throw without retry (0.348333ms)
✔ propagates the original provider reject without retry (0.185834ms)
✔ history copies protect the array, messages, tool calls and nested arguments (0.250041ms)
✔ provider response and request references cannot mutate runtime facts (0.63525ms)
✔ projects all message kinds in order, preserving optional fields and call/result pairing (1.088917ms)
✔ snapshot array, messages, calls and nested arguments cannot mutate input history (0.141542ms)
✔ later input mutations and builds leave an earlier snapshot unchanged (0.2805ms)
✔ snapshot tools match the registry and isolate definitions and nested schemas in both directions (0.547875ms)
✔ maps provider-neutral model messages to OpenAI chat messages (0.741708ms)
✔ maps provider-neutral tool definitions to OpenAI function tools (0.131ms)
✔ maps OpenAI assistant text to a Runtime assistant message (0.051ms)
✔ maps an OpenAI function tool call and parses its arguments (0.095333ms)
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.136958ms)
✔ maps known finish reasons and normalizes provider-specific reasons (0.041208ms)
✔ maps OpenAI usage to the Runtime usage model (0.078417ms)
✔ maps a complete OpenAI response without leaking its raw shape (0.054833ms)
✔ happy path uses registry definitions and result in the second turn of one run (14.202625ms)
✔ each turn gets independent complete context from the latest facts and definitions (6.130333ms)
✔ invalid arguments null never invoke execute and allow continuation (7.432958ms)
✔ invalid arguments [] never invoke execute and allow continuation (4.348375ms)
✔ invalid arguments "bad" never invoke execute and allow continuation (3.618ms)
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.29925ms)
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.141042ms)
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.19925ms)
✔ tool throw becomes an execution failure visible to the next model turn (3.117709ms)
✔ tool reject becomes an execution failure visible to the next model turn (2.836083ms)
✔ tool non-error becomes an execution failure visible to the next model turn (2.784708ms)
✔ multiple calls finish sequentially before the next turn (mixed=false) (6.13175ms)
✔ multiple calls finish sequentially before the next turn (mixed=true) (5.258625ms)
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.436708ms)
✔ maxTurns=3 counts model turns, skips final tools and resets per run (3.88175ms)
✔ maxTurns=default counts model turns, skips final tools and resets per run (4.625416ms)
✔ a run after limit_reached receives paired skipped results before the new user input (0.296584ms)
✔ stop on the last allowed turn still completes (0.154584ms)
✔ invalid maxTurns fails at construction (0.256416ms)
✔ provider failure after tool execution propagates the same error and preserves facts (3.95675ms)
✔ tool argument and result references cannot mutate history (3.180833ms)
✔ registry rejects duplicates, preserves order and isolates schema references (3.662542ms)
✔ provider cannot change the schema used for tool validation (3.235166ms)
✔ invalid schema and async schema are configuration bugs, not invocation failures (6.651417ms)
✔ lookup bugs propagate unchanged (0.224791ms)
✔ result serialization bugs propagate outside the execute catch boundary (3.066083ms)
✔ tool_calls without calls is an invariant violation (0.204333ms)
✔ malformed tool_calls (missing) still throws on the final turn (0.148667ms)
✔ malformed tool_calls (empty) still throws on the final turn (0.12775ms)
ℹ tests 50
ℹ suites 0
ℹ pass 50
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 274.850958
➜ mini-agent-runtime git:(main) ✗
➜ mini-agent-runtime git:(main) ✗ npm run demo:runtime

mini-agent-runtime@0.1.0 demo:runtime
tsx src/demo/runtime-demo.ts

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
➜ mini-agent-runtime git:(main) ✗ npm run demo:tools

mini-agent-runtime@0.1.0 demo:tools
tsx src/demo/tool-runtime-demo.ts

Provider: deterministic demo (no external LLM)
User: 2 + 3?
Model turn 1: add {"a":2,"b":3}
Tool execute: add(2, 3) = 5
Model turn 2 received tool_result: {"success":true,"result":5}
Final answer: 2 + 3 = 5
RunOutcome: {"type":"completed"}
Model turns: 2
History: user_input -> model_output -> tool_result -> model_output
➜ mini-agent-runtime git:(main) ✗

最新源码 ZIP:如上传的
收起
思考了 40s



### ChatGPT

我已经按你上传的 最新 source-review(2).zip 直接检查了真实源码，而不是只依据 Codex 的实现总结。

先给结论：

VII-D 这一版实现整体通过。当前没有发现需要返工的架构问题，也没有发现 Scope 扩张。

ContextBuilder + TurnSnapshot 已经真正进入 Runtime 调用链，并且基本准确落实了我们在 Architecture Analysis / Design Decision 阶段确认的边界。

不过这里有一个值得讲清楚、但不需要修改代码的点：TurnSnapshot → ModelRequest 当前是通过 TypeScript 的结构兼容直接完成的：

TypeScript
const snapshot = this.#contextBuilder.build(...);
const request: ModelRequest = snapshot;
const response = await this.#provider.generate(request);

这不是 D-AD04 的违规；它恰恰符合我们之前说的“概念分层存在，但不要为了体现分层增加无意义 Mapper”。

1. 先看真实调用链：这是对的

当前 agent-runtime.ts 真实代码是：

TypeScript
const snapshot = this.#contextBuilder.build({
  messages: this.#state.messages,
  tools: this.#registry.listDefinitions(),
});

const request: ModelRequest = snapshot;
const response = await this.#provider.generate(request);

而且这段逻辑就在：

TypeScript
for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1)

内部。

因此每次 Model Turn 都会重新：

最新 RuntimeState
+
最新 ToolRegistry definitions
        ↓
ContextBuilder.build()
        ↓
新的 TurnSnapshot
        ↓
ModelProvider.generate()

这正好落实了 D-AD03：

一个 Model Turn 对应一个独立 TurnSnapshot。

这不是“建了个 ContextBuilder 类但 Runtime 没真正使用”的假实现。

2. D-AD01：State / Context 解耦 —— 通过

VII-C 时：

AgentRuntime
→ getMessages / map(toModelMessage)
→ ModelRequest

现在变成：

RuntimeState.messages
        ↓
ContextBuilder
        ↓
TurnSnapshot
        ↓
ModelRequest

而 RuntimeState 仍然：

TypeScript
{
  messages: []
}

没有增加：

context
snapshot
lastSnapshot
turn
currentContext

这一点尤其重要。

说明 Codex 没有误解成：

“既然有 TurnSnapshot，就应该把 Snapshot 存进 RuntimeState。”

所以现在职责真正变成：

RuntimeState
= Source of Truth（事实源）

ContextBuilder
= Projection（投影）

TurnSnapshot
= 某个 Model Turn 的派生输入

D-AD01 通过。

3. D-AD02：ContextBuilder 是否保持纯 —— 通过

真实实现：

TypeScript
export class ContextBuilder {
  build(input: ContextBuildInput): TurnSnapshot {
    return structuredClone({
      messages: input.messages.map(toModelMessage),
      ...(input.tools.length === 0 ? {} : { tools: [...input.tools] }),
    });
  }
}

非常小。

没有：

constructor
RuntimeState
ToolRegistry
Provider
TokenCounter
Memory
Policy
Strategy

也没有内部 state。

因此：

输入 Runtime Facts
        ↓
纯转换
        ↓
TurnSnapshot

没有产生第二个 Runtime owner。

这正是我们希望看到的第一版 ContextBuilder。

D-AD02 通过。

4. ContextBuilder 继续复用了 toModelMessage —— 很好

这里 Codex 没有重新造一套：

RuntimeMessage → ModelMessage

映射。

当前仍然：

TypeScript
input.messages.map(toModelMessage)

所以两个职责保持得很清楚：

toModelMessage
= 一条 RuntimeMessage 如何变成 ModelMessage

ContextBuilder
= 一个 Model Turn 应该拿到怎样的完整上下文

这是增量演进，而不是 VII-D 借机重写 VII-A 的消息体系。

5. D-AD04：你之前问的 TurnSnapshot / ModelRequest 问题

这次实现刚好给了我们一个很好的真实例子。

现在：

TypeScript
export interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

已有：

TypeScript
export interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

所以两个结构当前完全一样。

然后：

TypeScript
const snapshot = this.#contextBuilder.build(...);
const request: ModelRequest = snapshot;

你之前问：

TurnSnapshot 在 ModelRequest 前面，那两个东西不是一样了吗？

现在我们可以更准确地回答。

Runtime 语义
TurnSnapshot
= Runtime 在这一轮确定下来的模型输入
Provider 语义
ModelRequest
= ModelProvider.generate() 接收的调用契约

于是：

RuntimeState
   ↓ projection
TurnSnapshot
   ↓ satisfies provider contract
ModelRequest
   ↓
ModelProvider

当前因为两个结构一致，所以没有：

TypeScript
turnSnapshotToModelRequest(snapshot)

这种无意义转换。

这是好事。

要不要改成这样？

例如：

TypeScript
const request: ModelRequest = {
  messages: snapshot.messages,
  ...(snapshot.tools ? { tools: snapshot.tools } : {}),
};

不需要。

它只会复制一遍字段，但没有增加新的架构保护。

所以：

D-AD04 要求的是概念边界，不是要求一定存在一段数据转换代码。

当前实现是合理的。

6. D-AD05：messages + tools 都进入 Snapshot —— 通过

ContextBuilder 接收：

TypeScript
export interface ContextBuildInput {
  messages: readonly RuntimeMessage[];
  tools: readonly ToolDefinition[];
}

输出：

TypeScript
export interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

而且：

TypeScript
input.tools.length === 0
  ? {}
  : { tools: [...input.tools] }

继续保持了 VII-C 的：

没有 Tool
→ 不发送 tools 字段

而不是变成：

TypeScript
tools: []

所以这次没有因为 ContextBuilder 引入而改变 Provider Request 行为。

D-AD05 通过。

7. D-AD06：Reference Isolation 做得比较完整

这里 Codex 选择：

TypeScript
structuredClone({
  messages: ...,
  tools: ...
})

而不是：

TypeScript
Object.freeze()

或：

deepFreeze library

符合我们的设计。

更重要的是测试确实在测引用污染，不是只检查 readonly 类型。

例如它主动修改：

TypeScript
user.content
assistant.content
call.id
call.arguments.location.city
assistant.toolCalls.pop()
result.toolCallId
snapshot.messages.splice(...)

然后检查原始 RuntimeMessage history 不变。

这证明：

Snapshot mutation
    ✗
Runtime facts

工具定义也测得比较充分。

测试修改：

definition.name
definition.description
parameters.properties.city.type
parameters.required
snapshot.tools 数组

随后验证：

输入 tools 不变
Registry definitions 不变
旧 Snapshot 不变

这里不只是 array copy。

嵌套：

parameters.properties
required[]

也被隔离。

这点符合我们所谓的真正 Snapshot Semantics（快照语义）。

8. 一个值得注意但不用修的地方：这里有“双重 clone”

当前 ToolRegistry：

TypeScript
listDefinitions(): ToolDefinition[] {
  return [...this.#tools.values()].map(
    (tool) => structuredClone(tool.definition)
  );
}

然后 ContextBuilder 又：

TypeScript
structuredClone(...)

所以工具 definitions 实际经历：

Registry internal definition
        ↓ structuredClone
listDefinitions()
        ↓ structuredClone
TurnSnapshot

理论上有两次 clone。

是不是性能问题？

当前完全不是。

你的 Mini Runtime：

Tool 数量很小；

Schema 很小；

Model 网络请求的耗时远高于这点 clone；

VII-D 首要目标是边界正确。

所以不要为了“优化 clone”现在重构 Registry 或 Builder。

这是典型的：

能观察到冗余，但目前没有真实优化需求。

9. 最重要的集成测试写得很好

新增这条：

each turn gets independent complete context from the latest facts and definitions

我认为这是整个 VII-D 最有价值的一条测试。

它做了一件很聪明的事情：

Tool 第一次执行的时候动态：

TypeScript
registry.register(secondTool)

于是：

Turn #1

模型看到：

tools:
add

执行 add 的过程中 Registry 变成：

add
second
Turn #2

模型应该看到：

messages:
user
assistant(tool_call)
tool_result

tools:
add
second

测试恰恰验证了这一点。

这同时证明了三件事情。

① Snapshot 不是 run-level

如果整个 run 只 build 一次：

Turn #2

根本不可能看到新注册的 second tool。

所以它验证：

每个 Model Turn 重新 build。

② Snapshot 使用最新 State

第二轮请求包含：

user_input
assistant(tool_call)
tool_result

所以 Tool Result 确实进入最新 Context。

③ 两轮 Snapshot 相互独立

测试随后修改第一轮：

TypeScript
first.messages[0].content = ...
first.tools[0].parameters.required = []

然后：

TypeScript
assert.deepEqual(second, expectedSecond);

说明：

Snapshot #1 mutation
      ✗
Snapshot #2

这是很扎实的 Snapshot test。

10. tool_call / tool_result 配对没有被 ContextBuilder 搞坏

context-builder.test.ts 明确检查：

assistant:
toolCalls.id = weather-1

tool:
toolCallId = weather-1

而集成测试进一步确认真实 Agent Loop 第二轮 Provider Request 中仍然存在：

assistant(tool_calls)
tool(toolCallId)

因此 VII-C 很重要的消息协议：

Tool Call
   ↕ id
Tool Result

没有在 VII-D 的投影层损坏。

通过。

11. VII-C 没有被偷偷重构

我特意看了 AgentRuntime 后半段。

这些逻辑保持原样：

stop → completed
length / unknown → unsupported
tool_calls invariant
maxTurns
skipped results
顺序 ToolExecutor.execute
Provider exception propagation

尤其最终回合：

TypeScript
if (currentTurn === this.#maxTurns) {
  ...
  TOOL_EXECUTION_SKIPPED
  ...
  return { type: "limit_reached" }
}

没有因为 ContextBuilder 引入而重写。

这是好现象。

说明 VII-D 真的是：

Input construction refactor

而不是：

AgentRuntime second rewrite
12. Scope Check：通过

源码里我没有看到：

ContextPolicy
ContextStrategy
Memory
Summary
Compaction
TokenCounter
RAG
Event
Subscriber
Abort
SessionStore
Approval
Retry

也没有：

IContextBuilder
DefaultContextBuilder
ContextManager
ContextEngine

所以这次 Codex 对 Scope 控制得很好。

13. 有没有我认为应该修改的问题？

目前 没有 Must Fix。

我只记录两个“理解点”，它们都不是修改要求。

非阻塞点 A：TurnSnapshot 当前和 ModelRequest 结构完全相同

这是预期的。

不要因为“两个 interface 一样”就现在合并。

同样也不要反过来为了证明它们不同而添加：

turnId
createdAt
metadata

它们现在：

Structural Shape（结构形状）
相同

Semantic Role（语义角色）
不同

完全可以接受。

非阻塞点 B：ContextBuilder 目前的“Context 策略”就是完整投影

也就是说：

Runtime history
    ↓
全部进入 Snapshot

这不是 ContextBuilder “没发挥作用”。

VII-D 解决的是：

有没有 Context Boundary？

而不是：

Context 是否已经会裁剪和压缩？

这一点要特别记住。

否则很容易产生：

“就 map 一下再 structuredClone，值得单独做一个 Part 吗？”

值得。

因为现在：

State = Facts
Context = Projection

已经成为代码结构，而不是脑子里的约定。

14. 关于验证结果：需要区分两类证据

你提供的实际本机结果是：

50 tests
50 pass
0 fail

并且：

build 通过
额外 type-check 通过
demo:runtime 通过
demo:tools 通过
git diff --check 通过

这些和源码结构、测试数量完全吻合。

我也尝试在当前隔离环境重新执行：

Bash
npm test

但这个 ZIP 中不包含 node_modules，当前环境直接得到：

tsx: not found

所以我这边没有独立复跑成功。

因此证据应准确表述为：

你的本地验证：
50/50 + build + type-check + demos 全部通过

我本次 Review：
独立读取并核对了最新 ZIP 中真实源码和测试；
隔离环境因缺少项目依赖，没有独立重新执行测试。

这和 VII-C 最后我们对“代码 Review”和“独立执行验证”的区分是一致的。

15. Theory Feedback：这一节最值得升级的认识

VII-D 代码量其实很少，但它解决的是 Agent Runtime 里非常核心的一层。

以前：

State
≈
Prompt / Context

现在：

State
    ↓ projection
Context

这意味着以后即使出现：

State:
1000 条完整事实

Context:
Summary
+ 最近消息
+ 当前允许的 Tool

AgentRuntime 的核心 Loop 都不需要因为 Context 策略改变而重新设计。

第二个认知是：

Snapshot 的核心不是 readonly，而是时间点。

例如：

T1:
State S1
↓
Snapshot A

T2:
State S2
↓
Snapshot B

所以：

A ≠ B

不是因为 TypeScript 写了：

TypeScript
readonly

而是因为它们代表两个不同 Model Turn 时刻的世界状态投影。

这就是 TurnSnapshot 真正的意义。

第三个认知和你之前 Pi 学习里非常一致：

Context Builder 本质仍然是 Policy Boundary（策略边界），但当前第一版策略只是“全部保留”。

我们这次故意没有写：

Policy interface
Strategy pattern

但是以后：

完整历史
最近 N 条
Summary
Tool filtering
Token budget

都可以发生在：

State → Context

这个边界里。

这体现了一个你前面已经反复观察到的东西：

Agent 很多所谓“新架构”，底层仍然是经典软件工程里的状态所有权、数据投影、依赖隔离和策略边界。

16. 当前 Review Verdict

我会给 VII-D 当前实现：

PASS — 无 Must Fix。

具体：

检查项	结果
State / Context 解耦	✅
ContextBuilder 真实接入	✅
每 Model Turn 重建 Snapshot	✅
messages + tools 完整 Snapshot	✅
TurnSnapshot / ModelRequest 概念边界	✅
Reference Isolation	✅
Tool Call / Result 配对	✅
RuntimeState schema 不变	✅
VII-C Loop 行为不回归	✅
Scope 控制	✅
过度设计	✅ 未发现
必须修复项	0

所以当前不需要再给 Codex Fix Task。

按照固定流程，我们现在已经完成：

Architecture Analysis        ✅
Design Decision             ✅
Codex Implementation        ✅
Runtime Verification / Debug ✅
Code Review + Theory Feedback ✅

下一步就是 Milestone Closure。

我建议下一轮直接正式收尾 Part VII-D：把本次 Architecture Decisions、真实实现、测试证据、Theory Feedback、Industrial Notes、知识地图、面试视角、思考题、Pending 回收，以及 VII-E：AgentEvent + Subscriber 的交接基线统一整理出来。

来源

## 轮次 9

### User


没问题我们就收尾吧



### ChatGPT

那我们正式关闭 Part VII-D：ContextBuilder + TurnSnapshot。

这一节最终没有继续扩展 Context 能力，而是把最重要的架构边界真正落到了代码里：RuntimeState 保存事实，ContextBuilder 负责投影，TurnSnapshot 固化某一次 Model Turn 的可见输入，ModelRequest 继续作为 Provider 调用契约。 这与 Part VII 总体规划中 VII-D 的原始目标一致，也没有提前进入 Token Budget、Compaction、Memory 等后续能力。

README

Part VII-D Milestone Closure
1. 最终交付状态

状态：Done ✅

本节最终真实形成：

RuntimeState
    ↓
ContextBuilder
    ↓
TurnSnapshot
    ↓
ModelRequest
    ↓
ModelProvider

当前实际能力已经从 VII-C 的：

RuntimeState.messages
    ↓
AgentRuntime 直接 map
    ↓
ModelRequest

演进为：

RuntimeState.messages ──────┐
                            │
ToolRegistry definitions ───┤
                            ↓
                    ContextBuilder
                            ↓
                     TurnSnapshot
                 messages + tools
                            ↓
                     ModelRequest
                            ↓
                     ModelProvider

最关键的是：ContextBuilder 已经进入真实 Model Turn 调用链，而不是单独存在但 Runtime 没有使用。

每一次 ModelProvider.generate() 之前都会重新构建 Snapshot，因此：

Turn #1
→ Snapshot #1
→ Tool Call
→ Tool Result 写入 State

Turn #2
→ 基于最新 State 构建 Snapshot #2

VII-C 建立的 Model → Tool → Model 循环没有被破坏。

day08-part-vii-c-tool-registry-…

2. 最终 Architecture Decisions

本节最终正式保留 6 条架构决策。

D-AD01：RuntimeState 与 Model Context 解耦
RuntimeState
= Runtime 已经发生的事实

Model Context
= 某个 Model Turn 真正需要看到的事实投影

因此：

State ≠ Context

即使当前第一版所有消息仍全部进入 Context，这个架构关系也已经正式成立。

D-AD02：ContextBuilder 是纯投影组件

ContextBuilder 不直接拥有或依赖：

RuntimeState
ToolRegistry
AgentRuntime
ModelProvider
Memory
Policy
Token 系统

而是接收显式输入：

RuntimeMessage[]
ToolDefinition[]

然后输出：

TurnSnapshot

它不修改 State、不执行 Tool、不推进 Loop、不决定终止。

D-AD03：一个 Model Turn 对应一个 TurnSnapshot

不是：

one run
→ one snapshot

而是：

one model turn
→ one snapshot

因此 Tool Result 写入 State 后，下一轮模型会重新取得新的 Snapshot。

D-AD04：TurnSnapshot 与 ModelRequest 保持概念分层

当前二者结构虽然一致：

TypeScript
{
  messages,
  tools?
}

但是语义不同：

TurnSnapshot
= Runtime 层“这一轮确定下来的输入”

ModelRequest
= ModelProvider.generate() 的调用契约

实际代码利用 TypeScript Structural Typing（结构类型）：

TypeScript
const snapshot = contextBuilder.build(...);
const request: ModelRequest = snapshot;

没有为了“体现分层”增加无意义 Mapper。

这是合理的。

D-AD05：TurnSnapshot 表达完整 Model Turn 输入

Snapshot 不只是：

messages

而是：

messages
+
当前模型可见的 tools

因此：

TurnSnapshot ≠ MessageSnapshot

空 Registry 时仍然省略 tools，没有改变 VII-C Provider Request 行为。

D-AD06：Snapshot 保证 Reference Isolation（引用隔离）

最终采用：

Reference Isolation

而没有引入：

Object.freeze
deepFreeze
Immutable framework

保证：

修改 Snapshot
✗ 污染 Runtime Facts

Runtime 后续 mutation
✗ 改变旧 Snapshot

这才是第一版真正需要的 Snapshot Semantics（快照语义）。

3. 真实实现结果

最终新增核心组件：

ContextBuildInput
TurnSnapshot
ContextBuilder

ContextBuilder 保持很薄：

ContextBuilder
    │
    └── build()

内部继续复用已有：

RuntimeMessage
    ↓
toModelMessage()
    ↓
ModelMessage

没有重新造第二套 Message Mapping。

这意味着：

toModelMessage
= 单条消息类型映射

ContextBuilder
= 整个 Model Turn 的上下文投影

职责保持分离。

RuntimeState schema 同样没有发生变化，仍然只是 messages-only 的事实模型。这延续了 VII-B/VII-C 已经确立的 State ownership。

day08-part-vii-c-tool-registry-…

4. Runtime Verification / Code Review 结果

当前本地验证证据：

npm test
→ 50 / 50 passed

npm run build
→ passed

额外 TypeScript type-check
→ passed

npm run demo:runtime
→ passed

npm run demo:tools
→ passed

git diff --check
→ passed

新增的 5 个测试重点保护：

消息完整投影
Tool Call / Result ID 配对
Snapshot → State 引用隔离
State 后续 mutation → 旧 Snapshot 隔离
Tool Definition / Schema 嵌套引用隔离
每个 Model Turn 使用最新 Context

尤其这个集成测试非常重要：

Turn #1:
tools = [add]

Tool 执行阶段 Registry 增加 secondTool

Turn #2:
tools = [add, secondTool]

它真实证明：

Context 不是在 run 开始时构造一次，而是在每一个 Model Turn 前重新构造。

最终 Code Review 结论：

PASS，Must Fix = 0。

5. 🧠 本 Part 核心认知升级

这一节最重要的认知升级不是“学会写 ContextBuilder”。

而是：

① State 不等于 Context

以前非常容易产生：

conversation history
=
LLM context

这种直觉。

现在应该升级成：

Runtime Facts
     ↓ Projection（投影）
Model Context

Runtime 可以知道很多事情，但不代表模型每轮都必须看到所有事情。

② ContextBuilder 的价值不是今天裁剪了多少消息

当前 ContextBuilder 仍然：

全部 Runtime Messages
→ 全部 Model Messages

看起来行为没变。

但架构已经从：

“碰巧全传”

变成：

“ContextBuilder 明确决定全部传”

这两个完全不是一回事。

以后即使变成：

1000 条 Runtime Facts
       ↓
Summary + 最近 20 条 + 当前 Tools

Runtime Loop 也不用重新设计。

③ Snapshot 的核心不是 readonly，而是“时间点”

TurnSnapshot 最重要的语义是：

T1
State S1
→ Snapshot A

T2
State S2
→ Snapshot B

Snapshot A 应该永远代表 T1 那一刻的模型输入。

所以：

Snapshot 首先是一种 Temporal Boundary（时间点边界），其次才是一种对象不可变问题。

④ Derived State（派生数据）不要轻易进入 RuntimeState

TurnSnapshot 是：

derived execution data

不是：

conversation fact

因此不应该存：

TypeScript
state.lastSnapshot
state.currentContext

这与 VII-C 中 currentTurn 不进入 State 是同一个原则。

6. 🏗️ 工业级实现 Industrial Notes

这一节虽然实现非常小，但实际上对应真实 Agent Runtime 里的重要边界。

工业系统最终可能出现：

Conversation History
Memory
System Instructions
Retrieved Knowledge
Tool Availability
Permission
Token Budget
Summary
Current Task

模型不应该直接拿：

整个 Runtime 内存对象

而应该经过统一：

Context Assembly（上下文组装）

大致：

Runtime Facts
Memory
Tool Availability
Policy
RAG
        ↓
Context Builder
        ↓
Model Turn Context

你的 Mini Runtime 目前只实现了最小版本：

Messages + Tools
        ↓
ContextBuilder
        ↓
TurnSnapshot

但边界已经正确。

这是比提前加入 Token Counter、Summary Provider 更重要的事情。

另外，目前 Registry 和 ContextBuilder 会各自进行引用隔离，因此 Tool Definition 可能经历多次 clone。当前这是完全合理的：

正确性 > 微小 clone 成本

网络 Model Call 的开销远高于这些对象 clone，现在没有任何必要提前优化。

7. 🧭 知识地图

现在整个 Mini Agent Runtime 已经走到：

VII-A
Model Boundary
│
├─ RuntimeMessage
├─ ModelMessage
├─ ModelRequest / Response
├─ ModelProvider
└─ ProviderAdapter
        │
        ▼
VII-B
Runtime Ownership
│
├─ RuntimeState
├─ AgentRuntime
├─ State Mutation Owner
└─ basic Agent Loop
        │
        ▼
VII-C
Execution Loop
│
├─ Tool
├─ ToolRegistry
├─ ToolExecutor
├─ Error Contract
├─ Model → Tool → Model
└─ maxTurns / termination
        │
        ▼
VII-D
Context Boundary
│
├─ ContextBuildInput
├─ ContextBuilder
├─ TurnSnapshot
├─ State → Context Projection
└─ Per-Turn Snapshot
        │
        ▼
VII-E
Execution Observation
│
├─ AgentEvent
└─ Subscriber

现在 Runtime 已经拥有几个非常清晰的 ownership：

AgentRuntime
→ Control Flow + State Mutation

RuntimeState
→ Runtime Facts

ContextBuilder
→ Context Projection

TurnSnapshot
→ One Model Turn Input

ModelProvider
→ Model Invocation

ToolRegistry
→ Tool Catalog

ToolExecutor
→ One Tool Call Execution Boundary

这个结构已经开始很像一个真正的小型 Runtime Core，而不是单纯的 LLM API Wrapper。

8. 🧑‍💻 面试视角

这一节如果面试官问：

为什么 Agent Runtime 需要 ContextBuilder？直接把历史 messages 全传给 LLM 不行吗？

比较好的回答不是：

因为以后可能超 Token。

而应该先回答架构：

Runtime State 和 Model Context 是不同概念。State 是系统的事实源，Context 是针对某一次模型推理从这些事实中构建出的投影。即使第一版完整传递所有历史，我也会先建立 ContextBuilder 边界，这样以后做 Context Window、Compaction、Memory 或 Tool Visibility 时，不需要修改 Runtime Loop。

如果继续问：

TurnSnapshot 和 ModelRequest 有什么区别？

可以回答：

TurnSnapshot 是 Runtime 层语义，表示某一 Model Turn 开始前已经确定下来的完整输入；ModelRequest 是 ModelProvider 的调用契约。当前结构可能完全一致，因此实现上可以直接结构兼容，不需要增加没有价值的 Mapper，但语义层级保持分开。

再问：

为什么不把 Snapshot 放进 State？

可以回答：

因为 Snapshot 是从当前 State 派生出来的一次 Model Turn 临时数据，不是 conversation fact。把派生数据保存进 State 会形成重复事实源，并引入同步问题。

这里可以映射几个工业术语：

Projection（投影）
Snapshot Semantics（快照语义）
Reference Isolation（引用隔离）
Derived State（派生状态）
Source of Truth（事实源）
Context Assembly（上下文组装）
9. ❓ 本章思考题

这几个问题不用现在实现，可以用来检验你是否真正理解 VII-D。

问题 1：

如果未来 RuntimeState 有 1000 条消息，但 ContextBuilder 只选择最近 20 条，那么：

RuntimeState.messages.length

应该变成 20 吗？

答案显然应该是：不应该。

State 保存事实，ContextBuilder 只改变模型可见投影。

问题 2：

如果 ContextBuilder 删除：

assistant(tool_call id=A)

却留下：

tool_result(toolCallId=A)

会有什么问题？

这意味着 Context Builder 破坏了模型协议完整性。

因此以后实现 trimming / compaction 时：

不能只按照“最后 N 条 Message”机械裁剪。

这其实会成为未来真正实现 Context Window 时非常重要的问题。

问题 3：

如果未来某些 Tool 只允许管理员使用，那么：

Registry 中存在的 Tool

和：

当前 Turn 模型可见的 Tool

还会完全相同吗？

不会。

这时：

ToolRegistry
→ available executable tools

TurnSnapshot.tools
→ currently model-visible tools

两者会真正体现出区别。

不过这个 Policy（策略）现在没有实现。

10. 📝 写书 TODO

这一节如果进入《从零实现 Agent Runtime》，建议章节核心不是围绕代码 API 展开，而是围绕：

为什么 Runtime State 不能直接等同于 LLM Context？

展开。

建议写作结构：

1. VII-C 后出现的新问题
2. State 与 Context 为什么不是同一个概念
3. Projection 模型
4. ContextBuilder 的职责边界
5. TurnSnapshot 为什么按 Model Turn 构建
6. Snapshot 与 ModelRequest 的区别
7. Reference Isolation
8. 为什么第一版不做 Token Budget / Compaction
9. 实现与测试
10. 工业级 Context Assembly 演进方向

特别建议保留这句话：

第一版 ContextBuilder 的价值，不是“减少了多少上下文”，而是让“谁决定模型看到什么”第一次拥有了明确的架构边界。

11. 📦 写书素材

这一节最适合作为书中主图的是：

RuntimeState
     │
     │ Runtime Facts
     ▼
ContextBuilder
     │
     │ Projection
     ▼
TurnSnapshot
     │
     │ Provider Contract
     ▼
ModelRequest
     │
     ▼
ModelProvider

以及 Tool Loop 版本：

State S1
   ↓
Snapshot 1
   ↓
Model Turn 1
   ↓
Tool Call
   ↓
Tool Result
   ↓
State S2
   ↓
Snapshot 2
   ↓
Model Turn 2

这个图非常直观地表达：

Snapshot 的生命周期属于 Model Turn，而不是 Run。

还值得保留本次真实测试案例：

Turn 1 visible tools:
[add]

Tool execution registers secondTool

Turn 2 visible tools:
[add, secondTool]

这是一个非常好的工程证据，比单纯讲定义更有说服力。

12. 🔄 前置问题回收 / Pending Questions
VII-B B-P1：Tool Call 如何在同一次 run 内继续？

VII-C 已回收。

现在已经：

Model → Tool → Model

在一次 run() 内完成。

VII-B B-P3：unknown arguments 如何进入具体 Tool 参数契约？

VII-C 已部分回收。

现在：

unknown
→ JSON Schema Validation
→ execute

运行时边界已经建立。

但：

Schema ↔ TypeScript TArgs

的静态一致性仍然由 Tool 作者负责。

当前不继续扩展。

VII-C → VII-D：Runtime State 如何与 LLM Context 解耦？

本节正式回收 ✅

现在已经成为：

RuntimeState
→ ContextBuilder
→ TurnSnapshot
→ ModelRequest
当前继续 Pending：B-P2

Provider failure 之后：

“重试当前 Step”

与：

“用户再次 run()”

仍然是不同语义。

当前 Runtime 没有 Retry / Resume 机制，因此继续 Pending。

等 VII-G Conversation Recovery 或未来真实 Retry 需求出现时再回收，不在 VII-D 强行处理。

新增未来 Pending：Context Integrity

以后真正实现：

History Trimming
Compaction
Summary

时，需要重新回答：

如何裁剪上下文，同时保持 Tool Call / Tool Result、消息协议和语义完整性？

这一点现在只记录问题，不实现方案。

13. 📚 下一节学习计划：Part VII-E

下一阶段正式进入：

Part VII-E：AgentEvent + Subscriber

当前 A～D 已经解决：

模型怎么调用         VII-A
Runtime 谁拥有状态   VII-B
Tool 怎么执行        VII-C
模型每轮看到什么     VII-D

接下来新的问题就是：

Runtime 内部正在发生什么，上层 UI / Logger / Observability 怎么知道？

当前 Runtime 内部已经发生很多事件：

run started
model turn started
model response received
tool call started
tool result produced
run completed
limit reached

但是 caller 目前主要只能在：

await runtime.run(...)

结束后看到：

RunOutcome

和：

getMessages()

所以 VII-E 的核心会从：

State

转向：

Event

并建立：

AgentRuntime
    ↓ emit
AgentEvent
    ↓
Subscriber
    ├─ UI
    ├─ Logger
    └─ Observability

但仍然要特别防止提前做成复杂 Event Bus、Telemetry Framework 或 Streaming Engine。

至此：

Part VII-A  ✅ Foundation + ModelProvider
Part VII-B  ✅ RuntimeState + Agent Loop
Part VII-C  ✅ Tool Registry + Executor + Error Contract
Part VII-D  ✅ ContextBuilder + TurnSnapshot
Part VII-E  → AgentEvent + Subscriber
Part VII-F    Abort + Single Active Run
Part VII-G    SessionStore + Conversation Recovery
Part VII-H    beforeToolCall + Approval
Part VII-I    Weather Agent

Part VII-D 正式关闭。 下一次直接用和这次一样的方式开启 VII-E：先做 Architecture Analysis，不直接写 Event 代码。

来源
ChatGPT 也可能会犯错。请核查重要信息。

中

