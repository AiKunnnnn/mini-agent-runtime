# Part VII-D：架构讨论与 Implementation Task 源记录

- 来源：[Part VII - D](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6aa26628-b1dc-83ee-b566-4df8c1a0c660)
- 归档日期：2026-09-14。
- 读取方式：此前已登录 Chrome 会话 main 区域的完整可见文本；从本次 Codex 会话的工具返回记录恢复。原始整体文本为 78,340 个 JavaScript UTF-16 字符。
- 本文件按时间顺序保存第 1～7 轮。轮次和 User / ChatGPT 标题为归档添加，不伪造消息 UUID。
- 此为页面文本原文归档，不是概述；页面的代码语言标签、引用文件名、时间和“来源”等文本保留。原始 Markdown 的代码围栏、列表格式未能从 innerText 恢复。
- ZIP / Markdown 附件仅保留页面显示的文件名，附件正文不在此次归档中。“今天”等相对时间沿用读取时页面，不能据此推断实际讨论日期。
- 历史候选与 Review 陈述不作为当前代码规范；最终事实以[主笔记](../day08-part-vii-d-context-builder-turn-snapshot.md)和仓库源码为准。

## 轮次 1

### User

星期四 16:11
README(3).md
文件
day08-part-vii-c-tool-registry-executor-error-contract.md
文件

我们继续 Part VII：Mini Agent Runtime Implementation。

上一阶段 Part VII-C 已完成。

我已经提供：

Part VII 总体规划 / README；
Part VII-C 最终 Milestone Note；
当前 Architecture Decisions（如果存在）。

现在进入：

Part VII-D：ContextBuilder + TurnSnapshot

请先阅读上一阶段已经形成的真实实现、架构边界和设计决策。

后续必须基于现有实现做增量演进，不要重新设计已经确认完成的部分；如果发现前一阶段存在明确架构问题，可以提出，但请说明为什么需要调整。

继续采用固定工程学习流程：

Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure

现在先进入 Architecture Analysis（架构分析）。

请你先根据：

当前已有代码和架构决策；
本节标题与目标；
后续 Part 的整体规划；

帮我识别本节真正需要解决的架构问题、实现边界、关键设计决策和完成标准，然后逐步带我讨论。

不要一开始直接实现代码，也不要提前实现后续 Part。

展开



### ChatGPT

可以。基于你提供的 Part VII 总体规划 和 VII-C 最终 Milestone Note，VII-D 的起点其实非常清楚：目前 Runtime 已经能够完成 Model → Tool → Model 的真实循环，但每次调用模型时仍然直接执行：

TypeScript
getMessages().map(toModelMessage)

也就是说，Runtime State（运行时状态）和 Model Context（模型上下文）目前事实上还是绑在一起的。VII-D 正是第一次正式拆开这两个概念。VII-C 的最终记录也明确把这个问题交给了 VII-D，而没有提前实现 Token Budget、Compaction（上下文压缩）等能力。

day08-part-vii-c-tool-registry-…

 总体规划对 VII-D 的定义同样只有四件事：State/Context 解耦、ContextBuilder、TurnSnapshot（单回合快照）、禁止直接把完整 RuntimeState 喂给模型。

README

所以这一节我们不应该从“ContextBuilder 类怎么写”开始，而应该先回答一个更基础的问题：

Runtime 里保存的事实，和某一次 Model Turn（模型回合）真正应该看到的输入，到底是不是同一个东西？

答案显然会逐渐变成：不是。

先定位 VII-D 在当前架构里的位置

截至 VII-C，真实链路大致是：

RuntimeState.messages
        ↓
getMessages()
        ↓
map(toModelMessage)
        ↓
ModelRequest
        ↓
ModelProvider.generate()

工具定义则走另一条路线：

ToolRegistry
   ↓
listDefinitions()
   ↓
ModelRequest.tools

所以目前 AgentRuntime 同时负责：

1. 保存 Runtime State
2. 决定什么时候调用模型
3. 从 State 构造 ModelRequest
4. 从 Registry 获取 Tool Definitions
5. 调用 Provider
6. 保存 ModelResponse
7. 执行 Tool Loop

VII-D 不应该改变 1、2、5、6、7。

它只应该把第 3～4 步形成一个明确的输入构建边界。

也就是：

Before VII-D

AgentRuntime
  ├─ owns State
  ├─ builds ModelRequest itself
  ├─ calls Provider
  └─ controls Loop

逐渐变成：

After VII-D

AgentRuntime
  ├─ owns State
  ├─ asks ContextBuilder to build a TurnSnapshot
  ├─ calls Provider using that snapshot
  └─ controls Loop

ContextBuilder
  └─ Runtime facts → 当前 Model Turn 输入

注意这里非常重要：

ContextBuilder（上下文构建器）不是新的 Runtime Owner。

AgentRuntime 依然决定：

什么时候调用模型
什么时候继续循环
什么时候执行工具
什么时候终止
什么时候写 State

ContextBuilder 只是回答：

“假设现在准备进入下一次 Model Turn，这一轮模型应该收到什么？”

这和我们前面学习的 Policy（策略）边界 已经开始产生联系，但 VII-D 还不需要建立完整 Policy Framework（策略框架）。

我认为 VII-D 真正有 5 个架构问题

这五个问题基本就是这一 Milestone 应该逐个讨论并收敛的内容。

D-1：RuntimeState 和 Model Context 到底是什么关系？

这是本节最核心的问题。

当前：

RuntimeState.messages
       ≈
ModelRequest.messages

只是经过了一层类型转换。

但设计上应该变成：

RuntimeState
    ↓
ContextBuilder
    ↓
Model Context

也就是说：

State = Runtime 已经发生过什么

Context = 这一轮我选择告诉模型什么

举个我们当前 Runtime 已经真实存在的历史：

user_input
model_output(tool_calls)
tool_result
model_output
user_input
model_output(tool_calls)
tool_result
...

这些都是 Runtime Facts（运行事实）。

State 的职责应该倾向于：

尽可能忠实地保存已经发生的事实。

但未来 ContextBuilder 可以决定：

完整历史
↓
模型真正需要的上下文

例如未来才可能出现：

1000 条历史
        ↓
ContextBuilder
        ↓
summary + 最近 20 条
        ↓
LLM

因此 VII-D 最重要的架构认知是：

State 是事实源，Context 是 State 的投影。

英文上可以把这个理解为：

Projection（投影）

Context = Projection(RuntimeState)

但这里暂时不要实现 Summary、Compaction（上下文压缩）、Token Budget（Token 预算）。

当前第一版甚至完全可以仍然：

所有 messages 都进入 Context

区别在于：

以前是“碰巧全部传进去”；VII-D 后是“ContextBuilder 明确决定全部传进去”。

这个区别看起来代码量很小，但架构意义非常大。

D-2：ContextBuilder 输入什么？

这是第二个必须讨论清楚的问题。

最容易写成：

TypeScript
contextBuilder.build(runtimeState)

但这里马上出现一个危险：

ContextBuilder 是否应该拿到整个 RuntimeState？

你们的总体规划已经明确写着：

禁止直接把完整 RuntimeState 喂给模型。

README

这句话需要稍微精确一点理解。

它不是说：

ContextBuilder 永远不能读取 RuntimeState

而是说：

ModelProvider 不应该直接依赖 RuntimeState。

否则将来 RuntimeState 增加：

TypeScript
{
  messages,
  sessionId,
  status,
  pendingApproval,
  currentRun,
  ...
}

如果 Provider 输入直接来自整个 State：

RuntimeState
     ↓
ModelProvider

模型输入边界就彻底失控了。

更健康的是：

RuntimeState
     ↓
ContextBuilder
     ↓
TurnSnapshot
     ↓
ModelProvider

所以这一节一个关键设计问题是：

ContextBuilder 应该读取整个 State，还是只读取它真正需要的 State View（状态视图）？

第一版我们不一定需要立刻造 StateView 新类型，这正是接下来需要讨论的。

D-3：TurnSnapshot 到底解决什么问题？

我认为这是这一节最容易“为了有个类型而造类型”的地方。

如果只是：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

你可能马上会问：

那不就是 ModelRequest 吗？

这个问题非常关键。

如果我们最终发现：

TurnSnapshot === ModelRequest

那么确实没有必要强行创建两个一模一样的类型。

因此 VII-D 必须回答：

TurnSnapshot（单回合快照）究竟代表 Runtime 概念，还是 Provider Request 概念？

我目前更倾向于把它理解成：

TurnSnapshot
=
“这一 Model Turn 开始时，被 Runtime 冻结下来的完整模型输入事实”

而不是简单理解成：

ModelRequest 的别名

例如：

RuntimeState.messages
ToolRegistry definitions
        ↓
ContextBuilder.build(...)
        ↓
TurnSnapshot
        ├── messages
        └── tools
        ↓
ModelProvider.generate(...)

它真正提供的是一个 Snapshot Boundary（快照边界）：

T0: State = A
        ↓
build snapshot S1
        ↓
State 后续发生变化
        ↓
Provider 当前这一轮仍然看到 S1

所以它的意义是：

某一次模型调用看到的是构建时刻确定下来的输入，而不是一组仍然指向可变 Runtime 数据的引用。

这和 VII-C 已经大量测试过的“引用隔离”是一脉相承的。

VII-C 已经明确保护：

Provider 请求不能修改 Runtime 历史
Tool arguments 不能反向修改 model_output
Schema 副本不能污染 Registry
Tool result 写入 State 后成为独立事实

day08-part-vii-c-tool-registry-…

VII-D 其实是在把这个原则提升到 整个 Model Turn 输入：

这一轮调用必须拿到一个不可被 State 后续 mutation 影响的快照。

D-4：TurnSnapshot 的不可变到底是什么意思？

这里又有两个层次，不能混为一谈。

第一层：

TypeScript
readonly messages

这是 TypeScript 层面的 readonly。

第二层：

深层引用隔离

例如：

TypeScript
const snapshot = builder.build(...);

snapshot.messages[0].content = "hacked";

能不能污染 Runtime State？

这是我们真正应该关注的。

VII-C 已经建立了一个很明确的工程风格：

Public Contract 不只靠 readonly 声明，还要考虑对象引用是否真正泄露。

所以 VII-D 很可能需要继续保持：

Runtime State
    ↓ clone / projection
TurnSnapshot

而不是：

Runtime State
    ↓ same object references
TurnSnapshot

但是否需要 Object.freeze()，这是另一件事。

我现在不会直接建议引入 deepFreeze。

因为：

引用隔离
≠
必须运行时冻结所有对象

第一版很可能只需要保证：

snapshot 的 mutation 不会污染 State。

至于调用者自己能不能修改 snapshot，这属于另一个契约层级，需要讨论之后再决定。

D-5：工具 definitions 属不属于 Context？

这是这一节一个很有意思的问题。

目前：

TypeScript
messages = getMessages().map(toModelMessage)
tools = registry.listDefinitions()

它们分别获取。

但是站在模型这一轮看到的东西来看：

messages
+
tools

其实共同组成这一轮的 Model Context（模型上下文）。

模型为什么会决定：

call add

不仅取决于：

conversation messages

还取决于：

当前有哪些 tools

所以 TurnSnapshot 很可能应该描述的是：

TurnSnapshot
├── messages
└── tools

而不是：

ContextBuilder 只管 messages
AgentRuntime 自己再拼 tools

否则所谓“这一轮快照”其实并不完整。

不过这里仍有一个责任边界：

ContextBuilder 要不要直接依赖 ToolRegistry？

例如：

TypeScript
contextBuilder.build(state, registry)

还是：

TypeScript
contextBuilder.build({
  messages: state.messages,
  tools: registry.listDefinitions()
})

这是后面值得仔细讨论的设计点。

我现在不会直接定方案。

明确 VII-D 不应该做什么

这一点非常重要，因为 ContextBuilder 特别容易一口气膨胀成“大上下文系统”。

根据当前总体规划以及 VII-C Closure，下面这些都不是 VII-D：

README

 

day08-part-vii-c-tool-registry-…

❌ Summary
❌ Compaction
❌ Token Budget
❌ Context Window 自动裁剪
❌ RAG
❌ Memory
❌ SessionStore
❌ Conversation Recovery
❌ AgentEvent
❌ Streaming
❌ Abort
❌ Approval
❌ Tool Policy
❌ Retry
❌ Resume

特别需要防止 Codex 后面看到 ContextBuilder 后直接写：

TypeScript
ContextStrategy
TokenCounter
CompactionPolicy
SummaryProvider
MemoryProvider

这些全部属于过度设计。

VII-D 第一版的价值并不是：

“让 Context 变聪明。”

而是：

让 Context 第一次成为一个独立且明确的架构边界。

我建议本节的完成标准

如果最后 VII-D 完成，我认为至少应该能够证明这 6 件事情：

1. AgentRuntime 不再直接 map RuntimeState.messages 构造 ModelRequest。

2. 每个 Model Turn 都通过 ContextBuilder 构建输入。

3. RuntimeState 仍然只是 Runtime Facts 的所有者，
   不因为 ContextBuilder 增加 context / snapshot 等状态字段。

4. TurnSnapshot 是一次模型调用的独立快照，
   对 snapshot 的修改不能反向污染 RuntimeState。

5. Tool call / Tool result 配对经过 ContextBuilder 后不能被破坏。

6. 引入 ContextBuilder 后，
   VII-C 的：
   Model → Tool → Model
   maxTurns
   skipped
   error 回流
   多 Tool 顺序
   跨 run 历史
   都继续成立。

而且：

ContextBuilder 第一版即便只是完整投影历史，也算完成。

因为我们本节验证的是边界，不是上下文优化算法。

先形成一张 VII-D 架构草图

我认为我们这一轮讨论最终大概率会收敛成类似：

                     Runtime owns execution
                            │
                            ▼
                    ┌──────────────┐
                    │ AgentRuntime │
                    └──────┬───────┘
                           │
                    read current facts
                           │
                           ▼
                    ┌──────────────┐
                    │ RuntimeState │
                    │   messages   │
                    └──────┬───────┘
                           │
                           │ input
                           ▼
                  ┌──────────────────┐
                  │  ContextBuilder  │
                  └────────┬─────────┘
                           │
                     build immutable
                           │
                           ▼
                  ┌──────────────────┐
                  │   TurnSnapshot   │
                  │ messages / tools │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ ModelProvider    │
                  │   .generate()    │
                  └────────┬─────────┘
                           │
                           ▼
                     ModelResponse
                           │
                           ▼
                    AgentRuntime
                           │
                       mutate State

这里最重要的依赖方向是：

RuntimeState
      ↓
ContextBuilder
      ↓
TurnSnapshot
      ↓
ModelProvider

不能反过来：

ModelProvider
      ↓
RuntimeState

同时：

ContextBuilder
      ✗ 不写 State
      ✗ 不推进 Loop
      ✗ 不执行 Tool
      ✗ 不决定 termination
我们从 D-1 正式开始

所以现在先不要决定 ContextBuilder 是 class 还是 function，也不要决定具体 interface。

先回答 VII-D 最根本的问题：

D-1：为什么 RuntimeState 不能继续直接作为 LLM Context？

目前你的 Mini Runtime 只有：

TypeScript
interface RuntimeState {
  messages: RuntimeMessage[];
}

于是从“当前代码够不够用”来看：

State → map → ModelRequest

完全能跑。

所以真正的问题不是：

“现在为什么跑不了？”

而是：

如果不在这里建立 State → Context 的投影边界，未来哪一类变化会直接污染 AgentRuntime？

我认为最典型的三个变化是：

A. Context 裁剪
100 条 Runtime Facts
→ 模型只看到最近 20 条

B. Summary / Compaction
100 条 Runtime Facts
→ summary + 最近 10 条

C. Runtime-only State
未来 State 出现：
pendingApproval / session metadata / run status
这些属于 Runtime，却根本不应该进入模型输入

因此：

RuntimeState 回答“系统知道什么”；ContextBuilder 回答“这一轮模型应该知道什么”。

这是我认为 VII-D 最核心的一句话。

如果这个认知你认可，我们下一步就进入 D-2：ContextBuilder 到底应该接收什么输入，以及它能不能直接依赖 RuntimeState / ToolRegistry。这一问会直接决定 VII-D 有没有必要引入额外的 State View，以及怎样避免为了“解耦”反而过度抽象。

来源


## 轮次 2

### User

星期四 17:39
认可



### ChatGPT

好，那 D-1 就可以正式收敛为：

RuntimeState（运行时状态）保存系统事实；Model Context（模型上下文）是针对某一次模型调用，从这些事实中投影出来的输入。

这和上一阶段 VII-C 的边界是连续的：VII-C 已经证明 RuntimeState 只保存消息事实、AgentRuntime 是唯一 mutation owner（状态修改所有者）；VII-D 不改变这个 ownership（所有权），只把“如何从 State 得到本轮模型输入”独立出来。

day08-part-vii-c-tool-registry-…

接下来进入 D-2：ContextBuilder 到底应该接收什么？

这里其实有三个候选方案。

方案 A：ContextBuilder 直接接收整个 RuntimeState
TypeScript
contextBuilder.build(state)

优点很明显，最简单，当前只有：

TypeScript
interface RuntimeState {
  messages: RuntimeMessage[];
}

所以实现起来非常直接。

但它的问题是依赖会逐渐变成：

ContextBuilder
     ↓
knows entire RuntimeState

未来 VII-F、VII-G、VII-H 如果 RuntimeState 增加更多 Runtime-only information（仅运行时信息），例如某些会话状态、执行状态或者审批状态，ContextBuilder 理论上都会自动“看见”。

这并不等于它一定会把这些内容传给模型，但依赖边界开始变宽。

方案 B：AgentRuntime 只把 ContextBuilder 真正需要的数据传进去

例如：

TypeScript
contextBuilder.build({
  messages: this.#state.messages
});

或者：

TypeScript
contextBuilder.build(messages);

依赖就变成：

RuntimeState
    ↓ AgentRuntime picks required facts
ContextBuilder

ContextBuilder 不知道 RuntimeState 长什么样。

它只知道：

“我需要一组 RuntimeMessage，然后把它们构建成模型上下文。”

这个方案的优势是 Dependency Narrowing（依赖收窄）。

未来 RuntimeState 变成：

TypeScript
interface RuntimeState {
  messages: RuntimeMessage[];
  sessionId: string;
  pendingApproval?: ...
  ...
}

ContextBuilder 完全不受影响。

方案 C：专门建立一个 State View（状态视图）

例如：

TypeScript
interface ContextSource {
  messages: RuntimeMessage[];
}

contextBuilder.build(contextSource);

这样从概念上最明确：

RuntimeState
    ↓
ContextSource
    ↓
ContextBuilder

但这里我认为目前存在明显的 Over-design（过度设计） 风险。

因为现在 ContextSource 里只有：

TypeScript
messages

它实际上只是为了“未来可能扩展”而创建一层新抽象。

而我们的 Part VII 原则已经明确：

不为了以后可能需要提前建立复杂抽象。

README

所以我目前不建议方案 C。

我更倾向方案 B

第一版让 ContextBuilder 接收它实际需要的数据，而不是整个 RuntimeState：

TypeScript
contextBuilder.build({
  messages,
  tools
});

这里我故意把 tools 也放进来了，因为这正好引出下一层问题。

从模型视角看，一次 Model Turn 的输入不是只有：

messages

而是：

messages + available tools

所以如果 VII-D 的目标是构建一个完整的 TurnSnapshot（单回合快照），ContextBuilder 理论上需要同时知道：

TypeScript
{
  messages: RuntimeMessage[];
  tools: ToolDefinition[];
}

然后输出：

TypeScript
TurnSnapshot

大概是：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

但这里出现一个很关键的职责问题：

ContextBuilder 应该自己去访问 ToolRegistry，还是 AgentRuntime 先从 Registry 取出 definitions，再作为输入传给 ContextBuilder？

我倾向第二种：

ToolRegistry
     ↓
AgentRuntime
     ↓
ContextBuilder

而不是：

ContextBuilder
   ├─ RuntimeState
   └─ ToolRegistry

原因是 ContextBuilder 如果直接依赖 ToolRegistry，就不再只是一个“输入投影器”，它开始主动访问 Runtime infrastructure（运行时基础设施）。

第一版更干净的关系应该是：

TypeScript
const snapshot = contextBuilder.build({
  messages: this.#state.messages,
  tools: this.#registry.listDefinitions(),
});

于是各层职责非常明确：

AgentRuntime
负责收集“这一轮可用的事实来源”

ContextBuilder
负责把这些事实投影成模型输入

ToolRegistry
仍然只负责工具注册 / 查找 / definitions

RuntimeState
仍然只负责历史事实

ContextBuilder 不需要知道：

这些 messages 从 RuntimeState 来
这些 tools 从 ToolRegistry 来

它只处理输入。

这里其实延续了我们之前反复学习的一个软件工程原则：

依赖数据契约，而不是依赖拥有这些数据的系统对象。

例如不要：

TypeScript
build(runtime, registry)

而更倾向：

TypeScript
build({
  messages,
  tools,
})

这也会让测试非常简单，因为测试 ContextBuilder 不需要创建完整 Runtime 或 Registry。

所以我建议先形成 D-AD01 候选决策：

ContextBuilder 不直接依赖 RuntimeState 或 ToolRegistry。AgentRuntime 作为编排者，从当前 State 与 Registry 取得本轮所需事实，并以最小输入契约交给 ContextBuilder。

当前可以暂定：

TypeScript
interface ContextBuildInput {
  messages: RuntimeMessage[];
  tools: ToolDefinition[];
}

然后：

ContextBuildInput
      ↓
ContextBuilder
      ↓
TurnSnapshot

不过这里我们还没有决定一个非常关键的问题：

tools 应不应该真的属于 ContextBuilder？

有两种理解都说得通：

理解 1：
Context = conversation messages
Tool definitions 属于 ModelRequest 配置

理解 2：
Context = 这一轮模型能看到的全部输入
所以 messages + tools 都属于 Context

这个问题会直接决定 TurnSnapshot 到底是什么。

因此下一步我建议进入 D-3：TurnSnapshot 与 ModelRequest 是否应该是两个不同概念，以及 tools 应该放在哪里。

这是 VII-D 最关键的第二个设计节点。

来源


## 轮次 3

### User

星期四 21:36
继续



### ChatGPT

继续。

现在进入 D-3：TurnSnapshot（单回合快照）和 ModelRequest（模型请求）是不是同一个东西，以及 tools 应该放在哪里。

这个问题很关键，因为如果我们没想清楚，很容易出现一种“为了架构感而多造一层类型”的情况。

你当前已有 ModelRequest。从 VII-A 到 VII-C，它承担的是 Provider 调用契约，大致可以理解成：

TypeScript
interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

而我们现在又准备引入：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

如果最后两个类型完全一样，那你肯定应该质疑：

那 TurnSnapshot 有什么存在价值？

这是 D-3 的核心。

我先给结论倾向：

TurnSnapshot 和 ModelRequest 可以结构相似，甚至第一版字段完全一样，但概念上不应该直接等同。

原因不是“未来扩展方便”这种空泛理由，而是它们的 ownership（所有权）和语义层级不同。

ModelRequest 属于 Model Boundary（模型调用边界）：

“Provider.generate 需要什么参数？”

而 TurnSnapshot 属于 Runtime Boundary（运行时边界）：

“这一轮模型调用开始之前，Runtime 冻结下来的输入是什么？”

两者回答的是不同问题。

先看调用链

我更希望 VII-D 后变成：

RuntimeState + Tool Definitions
            ↓
      ContextBuilder
            ↓
       TurnSnapshot
            ↓
      ModelRequest
            ↓
    ModelProvider.generate

你可能马上会问：

如果 TurnSnapshot 转成 ModelRequest 又只是原样传递，这不是多此一举吗？

第一版确实可能几乎是：

TypeScript
const snapshot = contextBuilder.build(...);

await provider.generate({
  messages: snapshot.messages,
  tools: snapshot.tools,
});

代码变化很小。

但架构上发生了一件非常重要的事：

Provider 调用参数

不再是 AgentRuntime 临时从多个地方拼出来的。

而是：

一个已经完成构建并确定下来的 TurnSnapshot
为什么不能直接让 ContextBuilder 返回 ModelRequest？

这是一个完全合理的候选方案：

TypeScript
const request = contextBuilder.build(...);

provider.generate(request);

甚至：

TypeScript
class ContextBuilder {
  build(...): ModelRequest
}

第一版这样写也能工作。

但问题在于，这会把 ContextBuilder 的概念变成：

“给某个 ModelProvider 构造请求。”

这样它天然站在 Provider 一侧。

而我们实际上希望 ContextBuilder 解决的是：

“从 Runtime Facts（运行事实）中决定这一轮模型看见什么。”

这是 Runtime 侧的问题。

所以：

ContextBuilder → TurnSnapshot

比：

ContextBuilder → ModelRequest

更符合当前学习目标。

这也是为什么总体规划专门写的是：

ContextBuilder + TurnSnapshot

而不是：

ModelRequestBuilder

README

一个更直观的类比

可以把它理解成前端里你很熟悉的：

Domain Model
   ↓
ViewModel
   ↓
UI component props

RuntimeState 类似 Domain Facts（领域事实）。

TurnSnapshot 更接近：

专门为这一轮模型推理准备的 ViewModel（视图模型）

ModelRequest 则更像：

底层组件 / SDK 真正接受的调用参数

所以：

RuntimeState ≠ TurnSnapshot
TurnSnapshot ≠ ModelRequest

哪怕当前字段长得一样。

那 tools 到底属于哪里？

我们刚才留下了这个问题。

我建议先从“模型实际看到了什么”来判断。

一次模型调用实际上看到：

messages
+
tool definitions

模型能不能做出 Tool Decision（工具决策），显然不仅取决于消息，还取决于当前有哪些 Tool。

所以如果 TurnSnapshot 表达的是：

这一 Model Turn 开始时，模型所面对的完整输入快照。

那么我认为：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

是合理的。

也就是说：

tools 应该属于 TurnSnapshot。

但注意，这不意味着：

ToolRegistry 属于 ContextBuilder。

这是两回事。

推荐仍然是：

AgentRuntime
 ├─ 从 RuntimeState 取 messages
 └─ 从 ToolRegistry 取 definitions
             ↓
       ContextBuilder
             ↓
       TurnSnapshot

ContextBuilder 只看到：

TypeScript
{
  messages,
  tools
}

它不知道这些数据从哪里来的。

为什么 tools 放进去很重要？

假设未来出现一个 Policy（策略）：

某个 Agent 当前有 20 个 Tool，但这一轮只允许模型看到：

read_file
search_code

那么真正变化的是：

Tool Registry 中实际存在的工具集合
≠
这一 Turn 暴露给模型的工具集合

这正是 Context 投影的一部分。

虽然 VII-D 绝对不实现 Tool Policy（工具策略），但从概念上：

available executable tools
        ↓
context projection
        ↓
tools visible to this model turn

是完全成立的。

所以将 tools 纳入 TurnSnapshot 是有语义基础的，不是为了未来过度设计。

一个很重要的区分

这里我们可以形成三个集合：

Runtime Tool Set
≠
Turn-visible Tool Set
≠
Model Provider SDK Tool Format

对应：

ToolRegistry
    ↓
ToolDefinition[]
    ↓
TurnSnapshot.tools
    ↓
ModelRequest.tools
    ↓
OpenAI Adapter
    ↓
OpenAI SDK tool schema

这个分层跟 VII-A 建立的 Provider Adapter 思路完全一致。

你之前坚持两层 Provider 的原因就是：

Runtime 不应该直接持有厂商协议。

现在同样：

Runtime 内部的 TurnSnapshot 不应该直接等于 OpenAI Request。

这两个设计其实是同一个架构思想。

那要不要让 TurnSnapshot 比 ModelRequest 更丰富？

例如：

TypeScript
interface TurnSnapshot {
  turn: number;
  messages: ModelMessage[];
  tools?: ToolDefinition[];
  createdAt: number;
}

我现在明确建议：

不要。

因为目前这些字段没有真实需求。

特别是：

turn
createdAt
tokenCount
contextId
snapshotId
metadata

全部属于容易被 Codex 顺手加进去的东西。

VII-D 当前真正需要的只应该是：

这一轮要交给模型的数据

所以第一版很可能就是：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

简单是优点，不是缺点。

那 ModelRequest 还需要吗？

需要。

因为 VII-A 已经把它定义成 ModelProvider 的 Public Contract（公开契约）。

我们不应该为了 VII-D 重新推翻 VII-A：

TypeScript
provider.generate(snapshot)

然后把 ModelRequest 删除。

这就违反你这一阶段的增量演进原则了。

所以更合理的是：

TypeScript
const snapshot = contextBuilder.build(input);

const response = await provider.generate({
  messages: snapshot.messages,
  ...(snapshot.tools?.length ? { tools: snapshot.tools } : {}),
});

或者如果类型完全兼容：

TypeScript
const request: ModelRequest = snapshot;

具体实现方式后面 Codex Implementation 再决定。

Architecture Decision 只需要确定：

TurnSnapshot 是 Runtime 概念，ModelRequest 保留为 Provider Contract。

这里还有一个更深一点的问题：Snapshot 到底在哪里“冻结”？

假设：

TypeScript
const messages = this.#state.messages;
const tools = this.#registry.listDefinitions();

const snapshot = contextBuilder.build({
  messages,
  tools,
});

如果 ContextBuilder 只是：

TypeScript
return {
  messages: messages.map(toModelMessage),
  tools,
};

但里面还共享对象引用，那这个所谓 Snapshot 就不是真正意义上的 Snapshot。

所以 TurnSnapshot 的存在必须至少保证：

build 完成后
Runtime State 后续发生 mutation
不会影响已经构建的 snapshot

反过来也一样：

snapshot 被 Provider / caller 修改
不能污染 RuntimeState

这就是 VII-C 已经建立的 Reference Isolation（引用隔离） 原则继续向上延伸。VII-C 明确把历史、工具参数、工具返回值、Schema definitions 的引用污染都纳入了测试边界。

day08-part-vii-c-tool-registry-…

因此如果我们引入 TurnSnapshot，它必须名副其实。

否则：

Snapshot

只是一个名字。

D-3 可以先收敛成两个候选 Architecture Decisions

我建议记录为：

D-AD02：TurnSnapshot 是 Runtime-level abstraction（运行时层抽象），表示某次 Model Turn 开始前已经确定下来的完整模型输入；它不取代 VII-A 已有的 ModelRequest Provider Contract。

以及：

D-AD03：TurnSnapshot 第一版包含 messages 与本轮可见 tools；ToolRegistry 本身不进入 Snapshot，也不由 ContextBuilder 直接依赖。

大致关系：

RuntimeState.messages ─────┐
                           │
ToolRegistry ─ definitions ┤
                           ▼
                    ContextBuilder
                           │
                           ▼
                    TurnSnapshot
                    ├ messages
                    └ tools
                           │
                           ▼
                     ModelRequest
                           │
                           ▼
                    ModelProvider

到这里，我认为 VII-D 最重要的“概念层级”已经基本建立了。

接下来进入 D-4：TurnSnapshot 的 Immutable（不可变）契约到底做到什么程度。

这里我们要具体讨论三个完全不同的概念：

TypeScript readonly
Object.freeze / deepFreeze
Reference Isolation

它们经常被混为一谈，但在你的 Mini Runtime 里，我认为真正需要的是第三个，而不是为了“不可变”三个全上。

来源


## 轮次 4

### User

今天 9:54
为何 TurnSnapshot 在 ModelRequest之前为何不是 ModelRequest在前TurnSnapshot在后 。我们之前我记得 ModelRequest 是所有 state，那么 TurnSnapshot 是当前快照，快照再到 ModelRequest 吗
继续



### ChatGPT

你这个问题抓得很准，而且这里确实需要先把 ModelRequest、RuntimeState、TurnSnapshot 三者重新排一下，不然后面很容易概念错位。

先回答第 1 个问题：不是 ModelRequest 在前、TurnSnapshot 在后。当前更合理的顺序仍然是 RuntimeState → TurnSnapshot → ModelRequest。

原因是你对 ModelRequest 的记忆里有一点混淆：ModelRequest 不是“所有 State”。在我们前面的实现里，真正保存长期事实的是 RuntimeState.messages；ModelRequest 是某一次 ModelProvider.generate() 的输入契约，它当前虽然携带了完整消息历史，但它仍然只是“这一轮要发给模型的请求”。VII-C 的记录也明确写的是：当前每轮请求仍然由完整消息历史的深拷贝投影得到，而不是 ModelRequest 本身承担 State。

day08-part-vii-c-tool-registry-…

所以三者最好这样理解：

RuntimeState
= Runtime 已经积累下来的事实

TurnSnapshot
= 当前这一轮从 Runtime Facts 中选出来并冻结的模型可见输入

ModelRequest
= 把这个 snapshot 按 ModelProvider.generate() 的公开契约组织成请求

也就是：

RuntimeState
    ↓
ContextBuilder
    ↓
TurnSnapshot
    ↓
ModelRequest
    ↓
ModelProvider.generate()

你刚才问的“快照再到 ModelRequest 吗”，对，我目前倾向就是这样。

举个具体例子。假设 State 里以后有：

TypeScript
{
  messages: [...100 条...],
  pendingApproval: ...,
  sessionId: ...,
  runStatus: ...
}

ContextBuilder 可能决定当前这一轮只让模型看到：

TypeScript
{
  messages: [summary, ...最近 20 条],
  tools: [...]
}

这就是 TurnSnapshot。

随后再形成：

TypeScript
const request: ModelRequest = {
  messages: snapshot.messages,
  tools: snapshot.tools,
};

所以：

TurnSnapshot 不是从 ModelRequest 里截出来的一小块；恰恰相反，ModelRequest 应该由当前 TurnSnapshot 产生。

你之所以会觉得 ModelRequest 像“所有 State”，主要是因为目前 VII-A～VII-C 阶段：

State 中真正有用的数据
≈
这一轮 ModelRequest.messages

两者暂时高度重合。

但 VII-D 就是在正式打破这个“看起来像同一个东西”的阶段。

这里还有一个容易混淆的点。

你可以把现在的关系理解成：

RuntimeState
      ↓
“我要让这轮模型看到什么？”
      ↓
TurnSnapshot
      ↓
“ModelProvider.generate 接受什么结构？”
      ↓
ModelRequest

前一个问题属于 Runtime / Context 层。

后一个问题属于 Provider Contract（供应商调用契约）层。

因此两者哪怕第一版长这样：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

字段完全一样，也仍然不是同一个概念。

当然，这里必须防止过度设计。如果最终实现只是：

TypeScript
const snapshot = contextBuilder.build(...);

provider.generate(snapshot);

然后仅仅为了“架构漂亮”再复制一遍对象，那我们后面 Code Review 时就应该质疑是否需要单独转换。

但 Architecture Concept（架构概念）上两者还是分开的。

总体规划里 VII-D 专门要求的是“每轮基于当前 State 构建不可变调用快照”，而不是把 ModelRequest 变成新的 State 容器。

README

接着你说“继续”，我们进入 D-4：TurnSnapshot 的不可变到底要做到什么程度。

这里先区分三个概念：

readonly
Object.freeze
Reference Isolation（引用隔离）

这三个不是一回事。

1. TypeScript readonly

例如：

TypeScript
interface TurnSnapshot {
  readonly messages: readonly ModelMessage[];
  readonly tools?: readonly ToolDefinition[];
}

它解决的是：

编译期不希望调用者随意修改。

但它不是 Runtime Protection（运行时保护）。

因为 TypeScript 最后会被擦除。

2. Object.freeze / deepFreeze

例如：

TypeScript
Object.freeze(snapshot);

甚至：

TypeScript
deepFreeze(snapshot);

它解决的是：

运行时阻止别人直接修改这个对象。

但它会引入额外复杂度，而且 Object.freeze() 只冻结第一层，想真正冻结内部 messages、toolCalls、arguments 等，需要 deepFreeze。

VII-D 第一版我不建议为了“Immutable（不可变）”这个词直接引入 deepFreeze。

我们没有真实需求证明需要它。

3. Reference Isolation（引用隔离）

这个才是当前真正重要的。

假设 State 里有：

TypeScript
state.messages[0]

构建 snapshot 后：

TypeScript
snapshot.messages[0]

不能和它共享会导致反向污染的可变引用。

也就是说，要满足：

TypeScript
snapshot.messages[0].content = "changed";

不能导致：

TypeScript
state.messages[0].content

跟着改变。

反方向也一样：

TypeScript
state.messages.push(...)

不能改变一个已经构建完成的 snapshot。

这才是真正的：

Snapshot Semantics（快照语义）

也就是：

T1:

State = A
      ↓
build()
      ↓
Snapshot = S1

T2:

State = A + B

此时：

S1 仍然是当时的 S1

而不是随着 State 变化偷偷变成：

S1 + B

这里刚好和 VII-C 已经做过的很多事情是一条线。

VII-C 已经明确保护了：

Provider 请求修改不能污染历史；

Tool arguments 修改不能污染保存的 model output；

Registry definitions 副本不能污染 Registry；

Tool result 序列化后不能被原返回对象反向修改。

day08-part-vii-c-tool-registry-…

VII-D 只是把这个原则提升到：

整个 Model Turn 输入都应该成为一个独立快照。

所以我建议 D-4 先收敛成：

TurnSnapshot 第一版要求 Reference Isolation，而不是要求 runtime deep freeze。

换句话说：

我们保证：
snapshot 与 State 不互相污染

暂时不保证：
任何拿到 snapshot 的代码都绝对无法修改 snapshot 本身

这是两个不同契约。

我认为第一版前者必须有，后者没必要。

那具体测试应该怎么验证？

后面实现阶段至少应该有这类测试：

TypeScript
const snapshot = builder.build(...);

// 修改 snapshot
snapshot.messages[0]....

// RuntimeState 不能改变

反过来：

TypeScript
const snapshot = builder.build(...);

// 后续 Runtime 写入新消息

// 已有 snapshot 不能跟着变化

还有一个非常重要的：

tool call
   ↓
tool result

经过 ContextBuilder 后，toolCallId 配对必须仍然存在。

因为 VII-C 已经费了很大力气保证：

assistant(tool_calls A)
→ tool_result(A)

如果 ContextBuilder 未来随便裁消息导致：

tool_result(A)

还在，但是：

tool_call(A)

被裁掉，那 Context 就变 malformed（结构不完整）了。

所以 VII-D 可以提前确立一个非常重要的规则：

ContextBuilder 不能破坏 Runtime Message 的协议完整性。

第一版因为我们不裁剪，所以自然满足。

但这个原则本身应该写下来。

到这里，我建议增加两个候选决策：

D-AD04：TurnSnapshot 必须具备 Reference Isolation（引用隔离）；构建完成后的 Snapshot 不应因 RuntimeState 后续修改而变化，修改 Snapshot 也不得反向污染 RuntimeState。第一版不引入 deepFreeze。

D-AD05：ContextBuilder 的投影必须保持模型消息协议完整性，尤其不能破坏 tool_call ↔ tool_result 的对应关系。第一版完整投影全部历史，因此不实现裁剪算法。

接下来最值得讨论的是 D-5：ContextBuilder 本身应该是纯函数风格，还是一个可持有配置/策略的 class。

这个问题会直接决定我们要不要写：

TypeScript
function buildContext(...)

还是：

TypeScript
class ContextBuilder {
  build(...)
}

而且这里非常容易提前做成 Policy Framework，所以我们需要控制边界。

来源


## 轮次 5

### User

今天 14:44
继续



### ChatGPT

继续进入 D-5：ContextBuilder 应该是纯函数风格，还是 class。

我先给倾向：当前 VII-D 第一版更适合“纯构建器”语义，不应该让 ContextBuilder 持有运行状态，也不应该提前做成复杂 Policy 容器。至于是 class 还是 function，可以按现有代码风格选，但职责必须保持纯。

因为这一节真正需要的是：

输入：
当前 Runtime Facts + 当前可见 Tools

输出：
TurnSnapshot

中间：
不修改 State
不执行 Tool
不调用 Model
不决定继续/终止

也就是：

ContextBuilder = Projection Function（投影函数）
为什么“纯”比“class/function”更重要

很多人会先纠结：

TypeScript
class ContextBuilder {}

还是：

TypeScript
function buildContext() {}

但这其实是次要问题。

真正重要的是：

同样的输入，应该得到同样的 Snapshot，并且不产生副作用。

例如：

TypeScript
buildContext({
  messages,
  tools,
})

它不应该偷偷：

修改 messages
注册工具
写 RuntimeState
增加 currentTurn
记录 Event
调用 Provider

否则 ContextBuilder 就开始侵入 Runtime orchestration（运行编排）。

当前最危险的设计

比如做成：

TypeScript
class ContextBuilder {
  constructor(
    private state: RuntimeState,
    private registry: ToolRegistry,
    private tokenCounter: TokenCounter,
    private memory: MemoryStore,
  ) {}
}

然后：

TypeScript
builder.build()

这看起来“工业级”，但对 VII-D 来说反而很危险。

因为 ContextBuilder 开始拥有：

State
Registry
Token 系统
Memory

它会越来越像第二个 Runtime。

这直接违反我们刚刚确定的边界：

AgentRuntime = 编排者
ContextBuilder = 输入投影器
我更推荐的第一版形态

概念上类似：

TypeScript
interface ContextBuildInput {
  messages: RuntimeMessage[];
  tools: ToolDefinition[];
}

interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

然后：

TypeScript
class ContextBuilder {
  build(input: ContextBuildInput): TurnSnapshot {
    ...
  }
}

或者：

TypeScript
function buildContext(
  input: ContextBuildInput,
): TurnSnapshot {
  ...
}

两种都可以。

如果你问我当前项目更倾向哪个，我会稍微倾向 class + build()，但不是因为 class 更高级。

原因只有一个：

VII-D 的 Milestone 名称本身已经明确是 ContextBuilder，作为独立 Runtime component（运行时组件）会更清晰，也方便 AgentRuntime 依赖它。

但这个 class 必须非常薄：

ContextBuilder
    ↓
build()

不能提前变成：

ContextBuilder
├─ strategies
├─ policies
├─ memory
├─ tokenizer
├─ summarizer
└─ plugins
那 ContextBuilder 能不能持有配置？

第一版我建议：尽量不持有。

例如现在不需要：

TypeScript
new ContextBuilder({
  maxTokens: 32000,
  historyWindow: 20,
})

因为这些能力根本没有进入 VII-D Scope。

当前完整历史全部投影即可。

所以：

TypeScript
const builder = new ContextBuilder();

就足够。

以后如果真实出现：

只保留最近 N 条
Summary
Token Budget

再决定是否让 Builder 持有配置。

ContextBuilder 和 toModelMessage 是什么关系？

这是 D-5 里一个很关键的实际问题。

你现在已经有：

TypeScript
toModelMessage(runtimeMessage)

VII-D 不应该把它废掉。

更合理的是：

ContextBuilder
    ↓
复用
toModelMessage

即：

TypeScript
build(input) {
  return {
    messages: input.messages.map(toModelMessage),
    tools: ...
  };
}

这非常符合增量演进。

因为：

toModelMessage

解决的是：

单条 RuntimeMessage 如何映射成 ModelMessage。

而：

ContextBuilder

解决的是：

一整个 Model Turn 应该拿哪些消息和工具。

这两个职责不同。

所以关系应该是：

RuntimeMessage
    ↓
toModelMessage
    ↓
ModelMessage

RuntimeMessage[]
    ↓
ContextBuilder
    ↓
TurnSnapshot

其中 Builder 内部复用 toModelMessage。

一个重要边界：ContextBuilder 不应该知道 Provider

ContextBuilder 输出：

Runtime-level TurnSnapshot

它不应该知道：

OpenAI
Anthropic
智谱
Gemini

更不应该输出：

OpenAI.Chat.Completions...

否则就破坏 VII-A 已经建立的 Provider Adapter 边界。

所以应该保持：

ContextBuilder
     ↓
TurnSnapshot
     ↓
ModelRequest
     ↓
ModelProvider
     ↓
ProviderAdapter
     ↓
Vendor SDK

这条依赖方向非常干净。

到这里可以形成 D-AD06

ContextBuilder 第一版是无状态、无副作用的投影组件；不持有 RuntimeState、ToolRegistry、Provider 或未来 Policy/Memory/Token 组件。它复用现有 RuntimeMessage → ModelMessage 映射，并根据显式输入构造 TurnSnapshot。

这个决策很重要，因为它能防止 Codex 后面“顺手”做出一整套 Context Engine。

接下来我们进入最后一个真正需要 Architecture Analysis 的问题：

D-6：AgentRuntime 与 ContextBuilder 的 ownership（所有权）和调用时机

这里要回答的是：

每一次 Model Turn，到底什么时候构建 Snapshot？

我认为答案应该非常明确：

每次调用 ModelProvider.generate() 之前
都重新 build 一次 TurnSnapshot

而不是：

run 开始时 build 一次，然后整个 Tool Loop 复用

原因很好理解。

例如：

Turn 1

State:
user_input

↓ build snapshot 1
↓ model

model_output(tool_call)
tool_result

到了 Turn 2：

State:
user_input
model_output(tool_call)
tool_result

这时必须：

重新 build snapshot 2

否则模型看不到刚才的 Tool Result。

所以：

一个 Model Turn
对应
一个 TurnSnapshot

而不是：

一个 run
对应
一个 TurnSnapshot

这其实就是 TurnSnapshot 这个名字里 Turn 的真正含义。

调用链应该是这样
run(userInput)

↓
写入 user_input

↓
Model Turn #1
  ContextBuilder.build(...)
  → Snapshot #1
  → ModelProvider.generate()

↓
保存 model_output

↓
执行 tools

↓
保存 tool_result

↓
Model Turn #2
  ContextBuilder.build(...)
  → Snapshot #2
  → ModelProvider.generate()

↓
保存 model_output

↓
completed

这非常重要。

你会发现 Snapshot 本质上是：

State 在某个 Model Turn 开始时的一张照片。

State 会继续演进：

S0 → S1 → S2 → S3

Snapshot 则是：

Snapshot1 = projection(S1)
Snapshot2 = projection(S3)

它们不是共享的。

AgentRuntime 仍然是 owner

因此：

AgentRuntime

负责决定：

什么时候 build
什么时候 generate
什么时候写 response
什么时候 execute tool
什么时候下一轮

ContextBuilder 不能自己：

“发现有 tool_result，所以我再 build 一轮”

它完全不知道 Loop。

这再次保持：

Runtime owns control flow
Builder owns projection
是否需要保存 TurnSnapshot 到 RuntimeState？

我建议明确：不需要。

比如不要：

TypeScript
interface RuntimeState {
  messages: RuntimeMessage[];
  lastSnapshot?: TurnSnapshot;
}

因为 Snapshot 是：

一次调用的临时派生数据

而不是历史事实。

它跟 VII-C 的 currentTurn 类似：

currentTurn

我们当时明确没有放进 State，因为它只是单次 run 的执行局部变量。

day08-part-vii-c-tool-registry-…

TurnSnapshot 也是一样：

derived execution data（派生执行数据）

不是：

conversation fact（会话事实）

除非未来 Event / Observability 真有需求保存它，但那是 VII-E 之后的问题。

VII-D 不做。

所以 D-6 可以收敛为两个决策

D-AD07：一个 Model Turn 对应一个独立 TurnSnapshot；AgentRuntime 必须在每次调用 ModelProvider.generate() 之前，基于最新 Runtime Facts 重新构建 Snapshot。

D-AD08：TurnSnapshot 是临时派生数据，不写入 RuntimeState。AgentRuntime 仍然是 Loop 与 State mutation 的唯一 owner。

到这里，Architecture Analysis 基本完整了

我们现在已经收敛出 VIII-D（应为 VII-D）真正的八个候选决策：

D-AD01
ContextBuilder 不直接依赖 RuntimeState / ToolRegistry，
只接收显式的最小数据输入。

D-AD02
TurnSnapshot 是 Runtime-level abstraction，
不是 ModelRequest 的替代品。

D-AD03
TurnSnapshot 包含 messages + 当前可见 tools。

D-AD04
Snapshot 必须保证 Reference Isolation，
第一版不引入 deepFreeze。

D-AD05
Context 投影不能破坏 tool_call ↔ tool_result 协议完整性；
第一版完整投影历史，不做裁剪。

D-AD06
ContextBuilder 是无状态、无副作用的投影组件，
不提前引入 Policy / Token / Memory / Compaction。

D-AD07
每个 Model Turn 都重新构建独立 Snapshot。

D-AD08
TurnSnapshot 不进入 RuntimeState；
AgentRuntime 继续拥有 Loop 与 State mutation。

我认为下一步不应该直接进入 Codex。

按照我们固定流程：

Architecture Analysis
        ↓
Design Decision

我们现在应该进入 Design Decision（设计决策收敛），把上面这些候选决策逐条检查一下：

哪些真正需要成为正式 Architecture Decision；

哪些只是实现建议；

是否存在过度设计；

最终 VII-D 的 Public Contract 到底应该有哪些类型和接口；

本 Milestone 的明确 Scope / Out of Scope / Acceptance Criteria。

收敛完成后，再生成 Codex Implementation Task。

来源

## 轮次 6

### User


继续



### ChatGPT

好，我们现在正式进入 Design Decision（设计决策收敛）。

这一阶段的目标不是继续发散，而是把刚才 D-1～D-6 的分析压缩成：最终要实现什么、公开什么、明确不做什么、怎么判断完成。

结合当前 VII-D 规划，源材料明确要求的只有：Runtime State 与 LLM Context 解耦、ContextBuilder、TurnSnapshot、每轮基于当前 State 构建不可变调用快照、禁止直接把完整 RuntimeState 喂给模型。

README

 而 VII-C 的最终实现基线已经锁定：RuntimeState 仍是 messages-only，AgentRuntime 是唯一 mutation owner，工具配对、maxTurns、skipped 终止和同 run Tool Loop 都已成立，VII-D 只能在这个基础上增量演进。

day08-part-vii-c-tool-registry-…

先把 8 个候选决策分级

我建议不要把刚才所有分析都升级成 Architecture Decision（架构决策）。正式决策只记录那些后续实现不能随意改变的边界。

最终我认为可以收敛为 6 条。

D-AD01：RuntimeState 与 Model Context 正式解耦。

RuntimeState
= Runtime 已发生的事实

TurnSnapshot
= 当前 Model Turn 可见输入的投影

以后不再把：

TypeScript
state.messages.map(toModelMessage)

视为 AgentRuntime 自己天然应该做的事情。

而是：

Runtime Facts
    ↓
ContextBuilder
    ↓
TurnSnapshot

这是 VII-D 最核心的决策。

D-AD02：ContextBuilder 是纯投影组件，不拥有 Runtime 基础设施。

它不直接依赖：

RuntimeState
ToolRegistry
ModelProvider
AgentRuntime
SessionStore
Memory

AgentRuntime 先取出当前需要的数据，再显式传入：

TypeScript
build({
  messages,
  tools,
})

这样 Builder 只关心：

给我这些事实，我构造这一轮模型输入。

而不是：

我自己去 Runtime 里面到处取东西。

这一点值得成为正式决策，因为它决定依赖方向。

D-AD03：一个 Model Turn 对应一个独立 TurnSnapshot。

每一次：

TypeScript
provider.generate(...)

之前，都必须重新基于最新 State 构建 Snapshot。

所以：

Turn #1 → Snapshot #1

tool result 写回 State

Turn #2 → Snapshot #2

不能一个 run 只构建一次。

这条非常关键，因为它直接保证 VII-C 的 Tool Result 能被下一次模型调用看到。

D-AD04：TurnSnapshot 是 Runtime 概念，ModelRequest 继续保留为 Provider Contract。

也就是：

RuntimeState
   ↓
ContextBuilder
   ↓
TurnSnapshot
   ↓
ModelRequest
   ↓
ModelProvider

第一版即使两者字段完全一样，也不把它们概念合并。

但是这里我会加一个限制：

不要为了体现“转换层”而新增无意义的 Mapper class。

如果字段兼容，AgentRuntime 可以非常简单地构造 ModelRequest。

也就是说，概念分层存在，但实现不必复杂化。

D-AD05：TurnSnapshot 第一版包含 messages 和当前 Model Turn 可见的 tools。

我建议正式采用这个结论：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

原因不是“以后可能做策略”，而是当前事实已经成立：

模型一次决策看到的不仅是 conversation messages，也包括本轮向它暴露的 tool definitions。

因此 tools 是“本轮模型输入快照”的组成部分。

但：

ToolRegistry ≠ TurnSnapshot

Snapshot 只保存 definitions，不持有 Registry。

D-AD06：Snapshot 保证 Reference Isolation，不引入 deepFreeze。

这一条可以正式写成：

修改 Snapshot
不能污染 RuntimeState / Registry

Runtime 后续发生 mutation
不能反向改变已经构建完成的 Snapshot

但当前不要求：

Object.freeze
deepFreeze
Immutable.js

我们保护的是 Snapshot Semantics（快照语义），而不是追求一个“彻底不可修改对象系统”。

哪些不需要单独成为 Architecture Decision

刚才的 D-AD05“不能破坏 tool_call ↔ tool_result 配对”，我建议不要单独编号。

因为它本质上是 Acceptance Criterion（验收条件），不是新的架构机制。

第一版完整投影历史，自然必须保持：

assistant(tool_call A)
tool_result(A)

顺序和 ID 不变。

同理：

TurnSnapshot 不写入 RuntimeState

也可以并入 D-AD01/D-AD03，而不用单独造一条架构决策。

因为 Snapshot 已经被定义为“每 Model Turn 的派生数据”，自然不是历史事实。

这样正式 Decision 不会越来越碎。

VII-D 最小 Public Contract

现在我们可以第一次讨论具体 API，但仍然只讨论形状，不写实现。

我建议 VII-D 第一版只新增两个真正的新公开概念。

1. ContextBuildInput

类似：

TypeScript
interface ContextBuildInput {
  messages: RuntimeMessage[];
  tools: ToolDefinition[];
}

它解决的是：

ContextBuilder 输入什么。

这里有一个细节。

是否应该写成：

TypeScript
readonly messages: readonly RuntimeMessage[];
readonly tools: readonly ToolDefinition[];

我认为可以考虑，但是这属于实现层 TypeScript contract，不是架构成败关键。

后面 Codex 实现时可以采用合理的 readonly。

2. TurnSnapshot

第一版：

TypeScript
interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

当前 Registry 为空时，是否：

TypeScript
tools: []

还是：

TypeScript
tools: undefined

我倾向继续继承 VII-C 既有 ModelRequest 语义：

空工具集合时最终请求省略 tools。

所以 ContextBuilder 可以选择直接产生：

TypeScript
{
  messages
}

而不是：

TypeScript
{
  messages,
  tools: []
}

这样不会改变当前 Provider Request 行为。

3. ContextBuilder

最小形式：

TypeScript
class ContextBuilder {
  build(input: ContextBuildInput): TurnSnapshot
}

就够了。

不要新增：

TypeScript
IContextBuilder
DefaultContextBuilder
ContextBuilderStrategy
ContextPolicy
ContextPipeline
ContextPlugin

现在都没有第二种实现。

如果只存在一个实现，再造 interface 是典型的“为了 DI 而 DI”。

ContextBuilder 应该在哪里创建？

这也是一个 Public Contract 问题。

有两个方案：

TypeScript
new AgentRuntime(provider, {
  registry,
  contextBuilder,
})

或者：

TypeScript
new AgentRuntime(provider, {
  registry
})

内部直接：

TypeScript
this.#contextBuilder = new ContextBuilder();

我目前更倾向第二种。

原因是这一阶段没有：

自定义 Context Policy
不同 ContextBuilder 实现
测试需要注入 fake builder

ContextBuilder 本身还是纯确定性组件。

如果现在就注入：

TypeScript
contextBuilder

很容易让 Public API 提前承诺：

用户可以自定义整个 Context 构建策略。

但这其实还没有讨论。

所以第一版更符合现有 Part VII 原则的是：

AgentRuntime 内部拥有默认 ContextBuilder

类似 VII-C：

Runtime 自己创建 ToolExecutor，没有建立 Executor 注入框架。

day08-part-vii-c-tool-registry-…

这体现了相同风格：

真实出现替换需求之前，不提前开放 Extension Point（扩展点）。

ContextBuilder 是 class 还是 function，最后怎么定？

现在可以正式定了。

我建议：

TypeScript
class ContextBuilder {
  build(...)
}

原因不是技术需要，而是这个 Milestone 本身就是在建立一个明确 Runtime component。

但 class 保持：

无状态
无 constructor dependency
只有 build

这样语义上：

ContextBuilder = Component

行为上仍然接近：

Pure Function

这两者并不矛盾。

VII-D 最终 Scope

这一节真正允许修改的范围，我建议控制在：

新增：
ContextBuildInput
TurnSnapshot
ContextBuilder

调整：
AgentRuntime 构造 ModelRequest 的路径

复用：
RuntimeMessage
ModelMessage
ToolDefinition
toModelMessage
ModelRequest
ModelProvider
ToolRegistry

Runtime 每一轮从：

TypeScript
const messages = this.getMessages().map(toModelMessage);
const tools = this.#registry.listDefinitions();

await this.#provider.generate({
  messages,
  tools,
});

演进为概念上的：

TypeScript
const snapshot = this.#contextBuilder.build({
  messages: ...,
  tools: ...,
});

const request: ModelRequest = ...snapshot;

await this.#provider.generate(request);

注意这里只是示意，不是让 Codex照抄。

Explicit Out of Scope

我建议 Implementation Task 里把下面这些写得很强，避免 Codex扩 Scope：

不实现 history trimming
不实现 context window
不实现 token counting
不实现 token budget
不实现 summary
不实现 compaction
不实现 memory
不实现 RAG
不实现 context policy system
不实现 pluggable strategy
不实现 ContextBuilder injection API
不实现 events / subscriber
不实现 streaming
不实现 session persistence
不实现 approval
不实现 retry / resume
不改变 RuntimeState schema
不重构 Provider Adapter
不改变 ToolExecutor
不改变 maxTurns / skipped termination

尤其这一条：

不改变 RuntimeState schema。

非常重要。

VII-D 是 State / Context 解耦，不是借机给 State 加：

TypeScript
context
snapshot
turns
currentContext
Acceptance Criteria

我认为 VII-D 真正完成，至少要有以下测试或等价证据。

A. 每一个 Model Turn 都经过 ContextBuilder

VII-C Happy Path：

Model Turn #1
→ tool
→ tool_result
→ Model Turn #2

第二次请求必须由最新 State 重新构建。

第二次 ModelRequest 能看到：

user_input
model_output(tool_call)
tool_result
B. Snapshot 与 State 引用隔离

例如构建后：

TypeScript
snapshot.messages...

被修改不能改变 Runtime 历史。

以及 Runtime 后续 append message，旧 Snapshot 长度不能跟着变化。

C. Tool Definitions 引用隔离

修改：

TypeScript
snapshot.tools

不能污染：

ToolRegistry

VII-C 已经有 Registry definition clone 相关保证，这一层不能把它重新破坏。

day08-part-vii-c-tool-registry-…

D. Tool Call / Result 配对保持

通过 ContextBuilder 后：

toolCall.id === toolResult.toolCallId

消息顺序保持。

不能因为 Context 投影重新排序或者遗漏。

E. 空 Registry 行为不回归

当前 VII-C：

Registry empty
→ ModelRequest.tools omitted

VII-D 后应该继续保持。

不能突然变成 Provider 每次都收到：

TypeScript
tools: []

除非当前 ModelRequest 契约本来允许并已有一致行为，但原则上不要产生无必要行为变化。

F. VII-C 所有生命周期行为不回归

尤其：

completed
unsupported
limit_reached
skipped tool_result
malformed tool_calls invariant
Provider error propagation
multiple tool calls
cross-run history

VII-D 不是 Loop 重构，所以这些应该全部继续通过。

一个需要特别防止的“假完成”

假如 Codex 最后只是创建：

TypeScript
class ContextBuilder {
  build(messages) {
    return messages.map(toModelMessage)
  }
}

然后 tools 仍然在 AgentRuntime 自己拼：

TypeScript
const snapshot = builder.build(messages);

provider.generate({
  messages: snapshot,
  tools: registry.listDefinitions(),
});

我会认为这是 部分完成。

因为这样：

TurnSnapshot

还不是“一次完整 Model Turn 的输入快照”。

它只是：

MessageSnapshot

我们既然已经确定 TurnSnapshot 表示本轮模型输入，就应该让：

messages + tools

共同进入它。

最终架构快照

如果按当前 Design Decision 落地，VII-D 后大致应该变成：

                     ┌──────────────────┐
                     │   AgentRuntime   │
                     │  owns the loop   │
                     └────────┬─────────┘
                              │
             ┌────────────────┴────────────────┐
             │                                 │
             ▼                                 ▼
   RuntimeState.messages               ToolRegistry
      Runtime Facts                   Tool Definitions
             │                                 │
             └────────────┬────────────────────┘
                          │
                          ▼
                  ContextBuildInput
                          │
                          ▼
                  ┌──────────────┐
                  │ContextBuilder│
                  └──────┬───────┘
                         │
                         ▼
                   TurnSnapshot
                messages + tools
                         │
                         ▼
                    ModelRequest
                         │
                         ▼
                   ModelProvider
                         │
                         ▼
                   ModelResponse
                         │
                         ▼
                    AgentRuntime
                         │
                   mutate State

最核心的 ownership 没变：

AgentRuntime owns control flow + State mutation
ContextBuilder owns projection
ModelProvider owns model invocation contract
ToolRegistry owns executable tool catalog

到这里，VII-D 的 Design Decision 已经基本可以视为收敛完成。

下一步按照固定流程就该进入：

Codex Implementation

也就是把这套最终决策转成你之前固定格式的 📋 Codex Implementation Task — Part VII-D，明确 Milestone Goal、Current Repository State、Confirmed Design Decisions、Task Breakdown、Acceptance Criteria 和 Constraints，避免 Codex重新做架构设计。

来源

## 轮次 7

### User


继续



### ChatGPT

下面直接给你生成可以交给 Codex 的最终实现任务。内容基于当前 Part VII 总体规划和 VII-C Closure，不让 Codex重新做架构设计。

README

 

day08-part-vii-c-tool-registry-…

Codex Implementation Task — Part VII-D
Codex Implementation Task — Part VII-D：ContextBuilder + TurnSnapshot
1. Milestone Goal

当前进入 Part VII-D：ContextBuilder + TurnSnapshot。

本 Milestone 的目标不是增加新的 Agent 能力，而是正式建立：

RuntimeState
    ↓
ContextBuilder
    ↓
TurnSnapshot
    ↓
ModelRequest
    ↓
ModelProvider

即：

RuntimeState 继续保存 Runtime 已发生的事实；

ContextBuilder 负责从当前事实中构建本轮 Model Turn 可见的上下文；

TurnSnapshot 表示某一次 Model Turn 开始前已经确定下来的完整模型输入；

AgentRuntime 不再直接从 RuntimeState 手工拼 ModelRequest；

每一次 Model Turn 都必须基于最新 Runtime Facts 重新生成独立 Snapshot。

第一版仍然完整投影全部消息历史，不实现任何裁剪、Summary、Compaction 或 Token Budget。

完成后应当满足：

Runtime State 与 Model Context 已建立明确架构边界，但 VII-C 已有 Tool Loop、错误回流、maxTurns、skipped termination 等行为完全不发生语义回归。

2. Current Repository State

进入 VII-D 前，当前仓库已经完成 VII-A ～ VII-C。

当前已具备：

Model Layer

RuntimeMessage

ModelMessage

ToolCall

ToolDefinition

ModelRequest

ModelResponse

ModelProvider.generate()

OpenAI-compatible Provider Adapter

toModelMessage(...)

Provider 只负责模型协议边界，不访问 RuntimeState、ToolRegistry 或 ToolExecutor。

Runtime Layer

当前 RuntimeState 仍保持最小事实模型：

interface RuntimeState {
  messages: RuntimeMessage[];
}

AgentRuntime 是 Runtime State 的唯一 mutation owner。

同一个 Runtime 可以跨多次 run() 保留 conversation history。

当前每一次模型请求仍由 AgentRuntime 直接从历史中构造，大致相当于：

RuntimeState.messages
    ↓
getMessages()
    ↓
map(toModelMessage)
    ↓
ModelRequest.messages

VII-D 就是要替换这条直接拼装路径。

Tool Layer

当前已经有：

Tool<TArgs>

ToolRegistry

ToolExecutor

JSON Schema validation

ToolResult / ToolError contract

Registry 是 executable tools 和 definitions 的唯一来源。

工具 definitions 当前由 AgentRuntime 从 Registry 获取并加入 ModelRequest。

Agent Loop

当前一个 run() 已经支持：

User
→ Model
→ Tool Call
→ Tool Execution
→ Tool Result
→ Model
→ Final Answer

并且支持：

multiple tool calls 顺序执行；

Tool not found；

invalid arguments；

tool execution failure；

Provider Error 原样传播；

maxTurns；

limit_reached；

最后一轮 tool_calls 写入 TOOL_EXECUTION_SKIPPED；

malformed tool_calls invariant；

后续 run 能继续读取完整历史。

这些行为均属于 VII-C 已完成能力，本 Milestone 不应重新设计。

3. Confirmed Design Decisions

以下为本 Milestone 已确认的最终设计，不要重新提出替代架构。

D-AD01：RuntimeState 与 Model Context 解耦

RuntimeState 表达：

Runtime 已发生的事实

TurnSnapshot 表达：

当前 Model Turn 真正可见的输入

Context 是 RuntimeState 的投影，不再默认认为：

RuntimeState.messages == Model Context
D-AD02：ContextBuilder 是纯投影组件

ContextBuilder：

不直接依赖 RuntimeState；

不直接依赖 ToolRegistry；

不依赖 AgentRuntime；

不依赖 ModelProvider；

不修改任何输入；

不执行 Tool；

不推进 Loop；

不决定 termination。

AgentRuntime 负责取得：

messages
tools

再显式交给 ContextBuilder。

建议最小输入契约类似：

interface ContextBuildInput {
  messages: RuntimeMessage[];
  tools: ToolDefinition[];
}

可以根据现有代码风格增加合理的 readonly，但不要扩展额外数据。

D-AD03：一个 Model Turn 对应一个 TurnSnapshot

每一次调用：

ModelProvider.generate(...)

之前，都必须重新基于最新 Runtime Facts 构建 Snapshot。

不能在一次 run() 开始时只构建一次并重复使用。

例如：

Turn 1
State:
user

→ Snapshot 1
→ Model

State:
user
assistant(tool_calls)
tool_result

→ Snapshot 2
→ Model

Snapshot 2 必须看到最新的 Tool Result。

D-AD04：TurnSnapshot 与 ModelRequest 概念分离

TurnSnapshot 是 Runtime-level abstraction。

ModelRequest 继续保留为 VII-A 已建立的 Provider public contract。

调用关系：

RuntimeState
    ↓
ContextBuilder
    ↓
TurnSnapshot
    ↓
ModelRequest
    ↓
ModelProvider.generate()

即使第一版二者结构高度相似，也不要删除 ModelRequest，或重新设计 Provider Contract。

同时不要为了这一层关系新增额外 Mapper class / Adapter class。

保持实现最小即可。

D-AD05：TurnSnapshot 包含完整本轮模型输入

TurnSnapshot 第一版应至少包含：

interface TurnSnapshot {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

messages 与当前 Model Turn 可见的 tools 一起构成 Snapshot。

不要只让 ContextBuilder 构建 messages，然后继续由 AgentRuntime 单独拼 tools。

否则它只是 Message Snapshot，而不是完整 TurnSnapshot。

空 Registry 时应继续保持当前行为：

ModelRequest.tools omitted

不要无必要改变为：

tools: []

如果现有 contract 已有辅助函数处理 optional field，可复用。

D-AD06：TurnSnapshot 保证 Reference Isolation

Snapshot 必须具有真实 Snapshot semantics。

即：

修改 Snapshot
不能污染 RuntimeState / ToolRegistry

Runtime 后续发生 mutation
不能改变已经构建好的 Snapshot

第一版要求的是：

Reference Isolation

不要求：

Object.freeze
deepFreeze
Immutable library

不要引入新的不可变数据框架。

4. Required Implementation
4.1 新增 ContextBuilder

新增一个最小、无状态的 ContextBuilder。

建议 API：

class ContextBuilder {
  build(input: ContextBuildInput): TurnSnapshot
}

ContextBuilder：

无 constructor dependency；

无内部可变 state；

复用现有 toModelMessage(...)；

对 RuntimeMessage 做 ModelMessage 投影；

将本轮 tools 一并加入 Snapshot；

保证 Snapshot 与输入之间不存在可反向污染 Runtime Facts 的可变引用。

不要增加额外 build phase、pipeline 或 strategy。

4.2 新增 TurnSnapshot

新增 Runtime-level TurnSnapshot type。

第一版只表达当前已有真实需求：

messages
tools

不要增加：

turn
turnId
snapshotId
createdAt
tokenCount
metadata
status
sessionId
runId

除非现有代码编译所必需，否则一律不要扩展。

4.3 新增 ContextBuildInput

建立 ContextBuilder 所需最小输入契约。

只包含当前真实输入：

RuntimeMessage[]
ToolDefinition[]

不要新增 RuntimeState View、ContextSource class 或其他中间抽象。

4.4 AgentRuntime 接入 ContextBuilder

AgentRuntime 不再自己执行：

getMessages()
→ map(toModelMessage)
→ 拼 tools
→ generate

而应：

从当前 Runtime Facts 取得 messages
从 Registry 取得 tool definitions
        ↓
ContextBuilder.build(...)
        ↓
TurnSnapshot
        ↓
构造 / 作为 ModelRequest 输入
        ↓
ModelProvider.generate()

每次 Model Turn 都必须重新 build。

AgentRuntime 仍然：

拥有 RuntimeState；

唯一修改 RuntimeState；

控制整个 Agent Loop；

决定什么时候调用模型；

决定什么时候执行工具；

决定什么时候 termination。

ContextBuilder 不接管任何 control flow。

4.5 保留已有消息映射

继续复用已有：

toModelMessage(...)

不要复制一套 RuntimeMessage → ModelMessage mapping。

职责关系应保持：

toModelMessage
= 单条消息映射

ContextBuilder
= 本轮完整上下文投影
5. Tests / Acceptance Criteria

必须新增有意义的自动化测试，而不是只验证类型存在。

5.1 ContextBuilder 基础投影

验证：

RuntimeMessage[]
→ ModelMessage[]

消息类型、顺序、字段保持正确。

至少覆盖当前已有的主要消息类型：

user_input
model_output
tool_result
5.2 Tools 进入 TurnSnapshot

验证 Registry 非空时：

Snapshot
├─ messages
└─ tools

工具 definitions 与当前 Registry 内容一致。

Registry 为空时，最终 ModelRequest 继续省略 tools。

5.3 Snapshot 不污染 Runtime History

构建 Snapshot 后，主动修改：

snapshot.messages

以及其中可以合法修改到的嵌套字段。

Runtime 原历史必须保持不变。

不要通过 deepFreeze 测试来替代这个行为测试。

5.4 Runtime 后续修改不影响旧 Snapshot

流程示例：

State = A
→ build Snapshot 1

State append B

验证：

Snapshot 1

仍然保持构建当时内容，不自动增加 B。

5.5 Tool Definitions 引用隔离

修改 Snapshot 中的 tool definition / parameters，不得污染 ToolRegistry 内部 definitions。

注意：

VII-C 已经存在 Registry definition clone 行为，本轮不能破坏。

5.6 每个 Model Turn 重新构建 Context

基于现有 Tool Loop 测试一个正常流程：

Model Turn 1
→ tool call
→ tool result
→ Model Turn 2

验证第二次 ModelRequest 包含：

user_input
model_output(tool call)
tool_result

不能复用第一轮 Snapshot。

5.7 Tool Call / Tool Result 配对不被破坏

经过 ContextBuilder 后，验证：

assistant.toolCalls[].id

与：

tool_result.toolCallId

保持一致。

消息顺序必须保持。

5.8 VII-C Regression

运行全部既有测试，以下行为必须继续成立：

normal completed；

Tool not found；

invalid arguments；

tool execution failure；

multiple tool calls；

mixed success / failure；

maxTurns；

default maxTurns；

limit_reached；

final turn skipped tool results；

malformed tool_calls invariant；

Provider Error propagation；

cross-run conversation history；

State ownership / reference isolation。

不要通过修改旧测试预期来“适配”新的错误行为，除非确实发现测试本身与已确认 Architecture Decision 冲突，并明确说明原因。

6. Explicit Out of Scope

本 Milestone 不要实现以下能力：

history trimming
context window management
token counting
token budget
summary
compaction
memory
RAG
Context Policy framework
pluggable context strategy
custom ContextBuilder injection
ContextBuilder interface + multiple implementations
Context pipeline
Context plugin
AgentEvent
Subscriber
Streaming
Abort
Single Active Run
SessionStore
Conversation Recovery
beforeToolCall
Approval
Retry
Resume
Tool timeout
parallel tools
MCP
Multi-Agent
Sub-Agent
Workflow

尤其：

不修改 RuntimeState schema

不要新增：

snapshot
context
currentContext
turnSnapshots
currentTurn
status
metadata

RuntimeState 继续保持当前 messages-only 事实模型。

不提前建立扩展点

不要新增：

IContextBuilder
ContextStrategy
DefaultContextBuilder
ContextPolicy
ContextManager
ContextEngine
ContextPipeline

当前只有一个真实实现时，不做抽象层堆叠。

不改 Provider / Tool 架构

不要重构：

ModelProvider；

ProviderAdapter；

ToolRegistry；

ToolExecutor；

Tool Error Contract；

maxTurns termination；

skipped semantics。

仅做 VII-D 所需最小集成。

7. Suggested File Scope

请先检查现有目录结构，再按项目已有组织方式决定最终路径。

预计新增文件只需要类似：

src/runtime/context-builder.ts

其中可以同时定义或引用：

ContextBuildInput
TurnSnapshot
ContextBuilder

如果当前项目习惯 types 单独拆文件，可以遵循既有风格，但不要为了三个简单类型新建大量文件。

预计修改：

src/runtime/agent-runtime.ts

以及相关 test 文件。

除非真实需要，不要修改与本 Milestone 无关的模块。

8. Implementation Constraints

基于当前仓库真实代码做增量修改，不根据任务文本假设不存在的 API。

不重新设计已经完成的 VII-A ～ VII-C。

不为了未来扩展建立抽象。

保持 AgentRuntime 是 State mutation 和 control flow owner。

ContextBuilder 必须保持无状态、无副作用。

Provider 不得直接访问 RuntimeState。

ModelRequest contract 保留。

Runtime Core 不依赖厂商 SDK 类型。

不引入新的第三方 dependency，除非绝对必要；本 Milestone 理论上不需要。

保持现有 TypeScript strict 约束和代码风格。

9. Verification

完成实现后至少执行：

npm test
npm run build

并继续执行当前项目已有的额外 test TypeScript type-check 命令，如果仓库目前仍使用该验证步骤。

如果已有 deterministic Tool Runtime Demo 不需要修改，应确保它仍然正常。

如果为了验证 VII-D 增加 Demo，必须保持最小且确定性，不调用真实外部 LLM；但本 Milestone不要求必须新增 Demo。

10. Required Final Report

完成后请输出：

修改文件

列出实际修改 / 新增文件，以及每个文件承担的职责。

Architecture Compliance

逐项说明：

D-AD01 是否满足；

D-AD02 是否满足；

D-AD03 是否满足；

D-AD04 是否满足；

D-AD05 是否满足；

D-AD06 是否满足。

Tests Added

说明新增了哪些测试，以及它们分别保护哪个契约。

Verification Results

给出：

npm test
npm run build
额外 type-check

实际结果。

Scope Check

明确说明：

是否新增任何 VII-D Scope 外能力；

是否修改 RuntimeState schema；

是否新增 Context Policy / Token / Summary / Memory 等能力；

是否修改 VII-C termination / Tool behavior。

如果存在任何超出本任务设计的修改，必须单独解释原因，不要静默扩大 Scope。

11. Definition of Done

只有同时满足以下条件，本 Milestone 才算完成：

Runtime State 与 Model Context 正式解耦
ContextBuilder 已真实进入 Runtime 调用链
每个 Model Turn 独立构建 TurnSnapshot
TurnSnapshot 同时覆盖 messages + tools
Snapshot 具备引用隔离
ModelRequest Provider Contract 保留
RuntimeState schema 不变
VII-C 全部行为不回归
新增边界测试通过
build / type-check 通过
没有提前实现 VII-E～VII-I 或延期能力

不要仅以“测试通过”作为完成依据；实现必须同时符合以上 Design Decisions。

这份可以直接交给 Codex。Codex 完成后，把它的实现总结、测试结果和最新源码 ZIP 发回来，我们就进入固定流程的 Runtime Verification / Debug → Code Review + Theory Feedback。

来源

