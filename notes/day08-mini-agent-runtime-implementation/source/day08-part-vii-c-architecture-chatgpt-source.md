# Part VII-C：架构讨论与 Implementation Task源记录

- 来源：[Part VII - C](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a9a7287-0380-83e8-aa16-d99cdc86b75e)
- 归档日期：2026-09-10
- 读取方式：任务读取接口，两页共 16 轮用户／助手文本；本文件保存第 1～9 轮。
- 下面正文按时间顺序保留；它是历史材料，不是当前实现规范。代码事实以主笔记和当前源码为准。
- 接口未提供上传 ZIP 等附件正文；保留原有附件缺失标记。历史 Review 对旧压缩包的判断按会话陈述归档，不声称本次重新解压核验了那些附件。
- 原文中的 filecite 等标记沿用源文本，不是本地文件证据链接。

## 轮次 1 — 26ed9a32-e4a8-49c9-92b3-351e75a63616

### User

我们继续 **Part VII：Mini Agent Runtime Implementation**。

上一阶段 **Part VII-B** 已完成。

我已经提供：

- Part VII 总体规划 / README；当前上传的 readme
- Part VII-B 最终 Milestone Note； 当前上传的 day08-part-vii-b 文件
- 当前 Architecture Decisions（如果存在）。
  - 可查看day08-part-vii-b 文件中是否存在


现在进入：

**Part VII-C：Tool Registry + Tool Executor + Error Contract**

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

[User attached 2 files; file contents were not included]

### ChatGPT

我已经把你这次上传的 **Part VII-B Milestone Note**、**Part VII 总体 README**，以及前一阶段 VII-A 的归档记录重新对齐了一遍。

先确认一点：**VII-C 的起点非常清楚，不需要推翻 VII-A / VII-B。**

VII-A 已经把 `ToolCall.arguments` 的责任分成两层：Provider Adapter（供应商适配层）只保证 JSON 能解析；“解析后的值是否符合具体 Tool Schema（工具参数模式）”明确留给 VII-C。fileciteturn3file0  
VII-B 又明确留下两个必须由 VII-C 回收的问题：**B-P1：tool call 后不能靠 caller 新开一个 run 来恢复；B-P3：`arguments: unknown` 与真正的 Tool 参数契约之间还没解决。** fileciteturn0file0

而总体规划对 VII-C 的 Scope（范围）也已经锁定为：注册与查找、Schema Validation（模式校验）、执行、结果回流，以及 Tool not found / arguments invalid / execution exception 三类错误。fileciteturn0file1

所以我们可以正式进入 **Architecture Analysis（架构分析）**。

---

# 一、VII-C 真正发生了什么架构升级

VII-B 当前实际是：

```text
User
 ↓
AgentRuntime.run()
 ↓
ModelProvider.generate()
 ↓
ModelResponse
 ↓
写入 model_output
 ↓
stop        → completed
tool_calls  → unsupported
```

VII-C 要把 `tool_calls → unsupported` 替换掉：

```text
User
 ↓
AgentRuntime
 ↓
ModelProvider
 ↓
model_output(toolCalls)
 ↓
Tool Registry
 ↓
Tool Executor
 ↓
tool_result
 ↓
RuntimeState
 ↓
再次 ModelProvider
 ↓
...
 ↓
stop
 ↓
completed
```

这一步非常关键：

> **VII-B 建立了 Loop 的所有权；VII-C 才第一次让 Loop 真正循环起来。**

VII-B 没有写 `while` 是合理的，因为当时不存在合法的“继续理由”。Milestone Note 也明确记录了这一点。现在有了 Tool Result（工具结果）之后：

```text
LLM：
“我要查天气。”

Runtime：
“好，我执行 Tool。”

Tool：
“东京 28°C。”

Runtime：
“我把这个结果告诉模型。”

LLM：
“东京现在 28°C。”

Runtime：
completed
```

这里的：

```text
Tool Call → Action（动作）
Tool Result → Observation（观察结果）
再次 Model Turn → Reasoning（继续推理）
```

实际上已经形成最小的 **ReAct（Reason + Act，推理与行动）循环**。

---

# 二、VII-C 不是三个类，而是 7 个真正的架构问题

我认为这次 Architecture Analysis（架构分析）应该围绕下面 **7 个问题**收敛。

---

## 问题 1：Runtime 中的一个 Tool 到底是什么？

VII-A 已经存在：

```ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: ...
}
```

但 `ToolDefinition` 只是告诉 LLM：

> “我有什么工具，你应该怎么调用。”

它本身显然不能执行。

现在第一次需要出现：

```text
Tool Definition
+
Executable Function
=
真正可以被 Runtime 使用的 Tool
```

概念上可能会变成：

```ts
interface Tool {
  definition: ToolDefinition;
  execute(args: ...): Promise<...>;
}
```

注意，现在还不是确认代码形状。

真正需要确认的是职责：

```text
ToolDefinition
    ↓
给 Model 看

Tool
    ↓
给 Runtime 执行
```

也就是说我们不应该把：

```ts
ToolDefinition
```

偷偷改成：

```ts
ToolDefinition {
  ...
  execute()
}
```

否则 **Model Contract（模型契约）和 Execution Contract（执行契约）会重新耦合**。

### 我的初步判断

倾向保持：

```text
ToolDefinition = 描述能力
Tool           = 描述 + 执行能力
```

VII-A 的 `ToolDefinition` 不推翻。

---

# 三、问题 2：Tool Registry 到底负责什么？

这是 VII-C 很容易做胖的地方。

Tool Registry（工具注册表）最核心的问题只有：

```text
我有哪些 Tool？
给我一个 name，我能不能找到它？
```

例如：

```text
get_weather → WeatherTool
search_order → SearchOrderTool
```

所以最小职责应该接近：

```text
register
lookup
list definitions
```

而不是：

```text
ToolRegistry
├── 参数校验
├── 执行 Tool
├── catch exception
├── retry
├── permission
├── timeout
├── approval
└── logging
```

如果后者全进去，Tool Registry 就会变成一个万能工具系统。

因此我建议先坚持：

> **Registry（注册表）回答 Who / Where；Executor（执行器）回答 How。**

即：

```text
ToolRegistry
    ↓
找到 Tool

ToolExecutor
    ↓
校验 + 调用 + 规范化结果
```

这里和你之前学习 Tool Registry 时的认识是一致的：

> Registry 本质上可以看成一个 Map，但工程价值在于统一能力发现和查找边界。

---

# 四、问题 3：Schema Validation（模式校验）到底属于谁？

这个问题其实 VII-A 已经替我们回答了一半。

当前：

```ts
ToolCall {
  arguments: unknown
}
```

VII-A 明确决定：

```text
Provider Adapter

JSON string
 ↓
JSON.parse
 ↓
unknown
```

到这里为止 Provider 的工作结束。

fileciteturn3file0

假设模型返回：

```json
{
  "city": 123
}
```

它当然是合法 JSON。

所以 Provider Adapter 没错。

但 Tool 定义可能要求：

```json
{
  "city": "Tokyo"
}
```

这里才属于：

```text
Tool Schema Validation
```

因此责任边界应该是：

```text
OpenAI:
"{\"city\":123}"
        ↓
Provider Adapter
        ↓
{ city: 123 }          ← JSON 合法
        ↓
Tool Executor
        ↓
Schema Validator
        ↓
INVALID_ARGUMENTS      ← Tool 参数不合法
```

这正好回收 VII-B 的 **B-P3**。fileciteturn0file0

### 一个很重要的点

我暂时**不建议为了这个问题立刻把整个 Runtime 的 `unknown` 改造成巨大的 `JSONValue` 类型体系**。

为什么？

因为 VII-A 的语义本身没有错：

```ts
arguments: unknown
```

表达的是：

> “Provider 已经解析出来，但 Runtime 还没有信任它。”

其实这恰恰很符合 Validation Boundary（校验边界）。

所以这里要讨论的是：

> `unknown → schema validated args`

而不一定是：

> 赶紧推翻 VII-A 的 ToolCall。

---

# 五、问题 4：Tool Executor 应该返回结果，还是抛异常？

这是 VII-C 最核心的问题之一。

我们至少有四种情况：

```text
1. Tool found + arguments valid + execute success
2. Tool not found
3. Tool arguments invalid
4. Tool.execute() throws
```

如果全部直接 throw：

```text
Tool throws
 ↓
AgentRuntime.run() reject
 ↓
整个 Agent 结束
```

那么模型实际上没有机会看到：

> “你调用了不存在的工具。”

或者：

> “city 参数不合法，请重新调用。”

这会削弱 Agent Loop（智能体循环）的恢复能力。

所以我更倾向于：

```text
Tool 层错误
        ↓
Tool Executor
        ↓
规范化 Tool Error
        ↓
RuntimeToolMessage
        ↓
RuntimeState
        ↓
下一轮 Model
```

例如逻辑语义：

```text
LLM:
get_weather({
  city: 123
})

ToolExecutor:
arguments_invalid

Runtime:
把错误作为 tool_result 写回

LLM:
哦，参数错了。
重新调用：
get_weather({
  city: "Tokyo"
})
```

这才是一个真正可以自我修正的 Agent。

---

# 六、但不能因此把所有 Error 都吞成 Tool Result

这里需要建立非常重要的错误边界。

我们现在至少已经存在三种完全不同的 Error Domain（错误域）。

### 第一类：Provider Error（模型供应商错误）

比如：

```text
401
429
网络异常
Provider malformed response
```

VII-B 已经确认：

```text
Provider throw
→ 原样向上传播
```

VII-C **不应该顺手修改这个决策**。fileciteturn0file0

---

### 第二类：Tool Invocation Error（工具调用错误）

例如：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
```

这些是：

> LLM 发起了 Action，但 Runtime 无法成功完成 Action。

它们非常适合进入 Tool Result（工具结果）回流给模型。

---

### 第三类：Runtime Bug（Runtime 自身 Bug）

比如：

```ts
toolExecutor === undefined

registry 内部数据结构损坏

Runtime 自己违反不变量
```

这种不能伪装成：

```text
TOOL_EXECUTION_FAILED
```

否则 Runtime 自己坏了，模型还以为：

> “哦，只是业务工具失败了。”

所以 VII-C 的 Error Contract（错误契约）不能简单理解为：

> catch everything。

而应该是：

```text
Expected Tool Failure
        ↓
normalize
        ↓
Tool Result

Unexpected Runtime Failure
        ↓
throw
```

这一点非常重要。

---

# 七、问题 5：成功和失败是不是都应该进入 RuntimeState？

我的判断是：**是。**

当前 VII-B 有一个非常重要的原则：

> 先保存已经发生的事实，再决定下一步。

因此模型产生：

```text
model_output(toolCall)
```

已经进入 `messages`。

接下来工具执行成功：

```text
tool_result(success)
```

这是事实。

工具执行失败：

```text
tool_result(error)
```

同样也是事实。

所以：

```text
model_output
    ↓
RuntimeState

tool success
    ↓
RuntimeState

tool failure
    ↓
RuntimeState
```

这样才能维持 VII-B 的：

```text
RuntimeState = 已发生的消息事实
```

我们现在**没有理由把 RuntimeState 从**

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

扩展成：

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
  toolCalls: ...
  observations: ...
  errors: ...
  status: ...
}
```

虽然你之前理论学习中讨论过更工业级的 Observation 模型，但 Part VII 当前明确要求增量演进，而且 VII-B 已经确认 messages-only State。VII-C 只要现有 `RuntimeToolMessage` 能表达所需事实，就不应该为了“更像工业 Runtime”重新设计 State。

这也符合整个 Part VII 的工程原则：**能力必须随真实需求出现。** fileciteturn0file1

---

# 八、问题 6：Tool Result 写回后，Agent Loop 应该怎么继续？

这是 B-P1 的正式回收。

VII-B 当前：

```ts
switch (response.finishReason) {
  case "stop":
    return completed;

  case "tool_calls":
    return unsupported;
}
```

VII-C 应该变成概念上的：

```text
Model Turn
   ↓
finishReason = stop
   ↓
return completed
```

或者：

```text
Model Turn
   ↓
finishReason = tool_calls
   ↓
执行工具
   ↓
写入 tool_result
   ↓
继续当前 run
   ↓
下一次 Model Turn
```

最重要的是这句话：

> **不能返回一个中间 RunOutcome，让 caller 再 `run()` 一次。**

因为 VII-B 已经明确：

```text
RunOutcome = 整个 run 的结束结果
```

fileciteturn0file0

所以：

```text
run()
 ├── Model Turn #1
 ├── Tool Execution
 ├── Model Turn #2
 └── completed
```

而不是：

```text
run()
 → tool_calls
 → caller 接管

caller:
run()
 → 第二轮
```

因此 VII-C 完成之后，我们之前说的：

> AgentRuntime owns Loop（AgentRuntime 拥有循环）

才真正能在代码中看出来。

---

# 九、问题 7：现在是否终于需要真正的循环保护？

这个问题在 VII-B 时答案是：

> **不需要。**

因为当时：

```text
一次 Model Turn
→ 必然 return
```

加入：

```ts
while
maxTurns
```

只会变成伪设计。

但 VII-C 后不同了。

理论上模型可以：

```text
Model → Tool
Model → Tool
Model → Tool
Model → Tool
...
```

永远不 `stop`。

所以从 VII-C 开始：

> **“如何防止无限 Tool Loop”已经变成真实问题，而不是未来扩展。**

这里我认为 Architecture Analysis 必须讨论，但我们暂时还不急着决定具体 API。

候选有三种：

```text
A. 不限制
B. Runtime 内固定 hard limit（硬上限）
C. AgentRuntime 构造配置 maxTurns
```

我目前不推荐 A。

但 B / C 哪个更适合我们的 Mini Runtime，需要下一步专门决定。

这个能力虽然 README 没单独写：

```text
maxTurns
```

但它不是 Scope creep（范围膨胀）。

因为**VII-C 一旦真正引入循环，终止保护就是这个循环自身的安全边界。**

---

# 十、还有一个容易被忽略的问题：一次模型返回多个 Tool Calls 怎么办？

现有 `AssistantMessage` 已经是：

```ts
toolCalls?: ToolCall[];
```

也就是说 VII-A 已经允许：

```text
ToolCall A
ToolCall B
ToolCall C
```

所以 VII-C 不能只实现：

```ts
response.message.toolCalls[0]
```

然后忽略剩下的。

但是也不要因此提前实现 Parallel Tool Execution（工具并发执行）。

并发会立即牵涉：

```text
并发池
Abort
错误聚合
执行顺序
部分成功
竞争
```

而 VII-F 才是并发生命周期相关 Milestone。

因此第一版非常自然的边界是：

```text
Model returns:
[A, B, C]

Runtime:
execute A
append A result

execute B
append B result

execute C
append C result

全部 Tool Result 写回后
↓
下一次 Model Turn
```

也就是：

> **支持 Multiple Tool Calls（多工具调用），但第一版 Sequential（顺序执行）。**

这属于我目前非常倾向的方案。

---

# 十一、这样一来，VII-C 的目标架构已经基本浮现

注意，这还是 Architecture Analysis，不是最终 Design Decision。

```text
                           ┌──────────────────┐
                           │   ToolRegistry   │
                           │ register / find  │
                           └────────┬─────────┘
                                    │
                                    ▼
User ──► AgentRuntime ───────► ToolExecutor
          │    ▲                    │
          │    │                    ├─ lookup
          │    │                    ├─ validate
          │    │                    ├─ execute
          │    │                    └─ normalize error
          │    │
          │    └──── tool_result ───┘
          │
          ▼
   RuntimeState.messages
          │
          ▼
 ModelRequest + tools
          │
          ▼
   ModelProvider
          │
          ▼
    ModelResponse
          │
     ┌────┴─────┐
     │          │
    stop    tool_calls
     │          │
 completed      └─────► ToolExecutor
```

注意这里几个非常关键的依赖方向：

```text
AgentRuntime
   │
   ├── ModelProvider interface
   ├── ToolRegistry
   └── ToolExecutor

ToolExecutor
   │
   └── Runtime Tool contract

ToolRegistry
   │
   └── Runtime Tool

OpenAIModelProvider
   X
   └──── 不知道 ToolExecutor
```

也就是说：

> **Provider 继续只负责告诉 Runtime：“模型想调用哪个 Tool”。**

它绝不能开始执行 Tool。

---

# 十二、VII-C 的明确 Scope Boundary（范围边界）

## 本 Part 应该解决

```text
✓ Runtime Tool contract
✓ Tool Registry
✓ Tool lookup
✓ Tool Definition 注入 ModelRequest
✓ Tool arguments Schema Validation
✓ Tool Executor
✓ 成功结果规范化
✓ Tool not found
✓ Arguments invalid
✓ Tool execution exception
✓ Tool Result → RuntimeMessage
✓ 同一 run 内 Model → Tool → Model
✓ 多 Tool Call 最小处理
✓ Tool Loop 最小终止保护
```

---

## 本 Part 不应该解决

```text
✗ ContextBuilder
✗ TurnSnapshot
✗ Token Budget
✗ AgentEvent
✗ Subscriber
✗ Streaming
✗ Abort
✗ Single Active Run
✗ SessionStore
✗ Conversation Recovery
✗ Retry / Resume
✗ beforeToolCall
✗ Approval
✗ Permission
✗ Durable Tool Execution
✗ MCP
✗ Parallel Tool Scheduler
✗ Tool Hot Reload
```

尤其：

### `beforeToolCall / Approval`

不要因为：

```text
ToolExecutor.execute()
```

已经出现，就顺手加：

```text
if (dangerous) ask user...
```

那是 **VII-H**。fileciteturn0file1

---

# 十三、VII-C 的 Completion Standard（完成标准）

我建议未来实现完成后，至少必须证明下面这条真实链路：

```text
User
 ↓
Model Turn #1
 ↓
tool_calls
 ↓
Registry lookup
 ↓
Schema validate
 ↓
Tool execute
 ↓
RuntimeToolMessage 写回
 ↓
Model Turn #2
 ↓
stop
 ↓
RunOutcome { type: "completed" }
```

自动化测试至少应该覆盖语义上的：

```text
① 正常 Tool Call
Model → Tool → Model → completed

② Tool not found
错误被规范化并回流，而不是错误执行一个不存在的函数

③ Arguments invalid
Tool 根本不应 execute

④ Tool execute throws
异常不能泄漏成未定义状态

⑤ 多个 toolCalls
不能漏掉第二个及后续 Tool Call

⑥ Tool result 历史
下一次 ModelRequest 必须包含：
user
assistant(tool_calls)
tool(result)

⑦ 同一个 run
工具调用过程不能先返回 RunOutcome

⑧ completed
最终 stop 后正常结束

⑨ Provider throws
继续保持 VII-B 的既有错误语义

⑩ Loop protection
模型持续 tool_calls 时不能无限运行
```

然后再配一个最小真实 Demo。

不过我建议 **VII-C 暂时不要直接上 Weather Agent 完整业务 Demo**，因为 Weather Agent 是 VII-I 最终验收。

VII-C 可以用非常简单的：

```text
add(a, b)
```

或者：

```text
get_current_time()
```

来证明机制。

---

# 十四、所以这次 Architecture Analysis 的核心可以压缩成一句话

VII-A：

> **模型可以表达 Tool Call。**

VII-B：

> **Runtime 能保存 Tool Call，但暂时不知道怎么办。**

VII-C：

> **Runtime 开始真正理解 Action：找到能力 → 校验参数 → 执行 → 把 Observation 写回 → 在同一个 run 中继续思考。**

这其实是目前 Part VII 第一次真正跨过：

```text
LLM Application
       ↓
Agent Runtime
```

这个门槛。

---

# 十五、接下来我们按顺序讨论，不一次把所有 Design Decision 锁死

我建议 Architecture Analysis（架构分析）的讨论顺序就按这 6 步来：

```text
C-1  Tool Contract
      ToolDefinition 与 executable Tool 怎么分？

C-2  Tool Registry
      注册、重复名称、查找、definitions 暴露怎么定义？

C-3  Arguments Contract
      unknown 如何经过 Schema Validation 变成可信参数？

C-4  Tool Executor + Error Contract
      success / not found / invalid args / throw 如何统一？

C-5  Agent Tool Loop
      tool_result 如何写回，以及同一 run 如何继续？

C-6  Loop Boundary
      multi-tool、顺序执行、最大轮次如何控制？
```

## 我们现在先进入 **C-1：Tool Contract（工具契约）**

这一小步最核心的问题其实只有一个：

```text
现在已有：

ToolDefinition
= 给 LLM 看“这个工具是什么、参数是什么”

那么 VII-C 新增的真正 Tool 应不应该定义为：

Tool
= ToolDefinition + execute
```

我目前倾向 **是**，并且继续保留 VII-A 的 `ToolDefinition` 不动。这样模型协议和实际执行能力仍然是两个层次，而 `ToolRegistry` 注册的是 executable Tool（可执行工具），向 ModelRequest 暴露时才提取其中的 `ToolDefinition`。

这是我们下一步最值得先锁定的第一个 Design Decision。

## 轮次 2 — 94a25cf6-ff46-44e9-8b17-77db052e603d

### User

继续讨论。同时要注意我们之前说过尽量用通俗易懂的话语，避免长篇阔论堆名词，即便出现名词也要加必要的中文解释

### ChatGPT

好，我们继续，而且后面我会把节奏收紧一些：**一次只讨论一个小问题，先用直白的话讲清楚，再补必要术语。**

这次先把 **C-1：Tool Contract（工具契约）** 讨论清楚。

## C-1：一个“真正能执行的 Tool”到底应该长什么样？

我们现在已经有 VII-A 定下来的：

```ts
ToolDefinition
```

你可以先把它理解成：

> **工具说明书。**

它主要告诉模型：

```text
工具叫什么
工具是干什么的
需要哪些参数
```

例如：

```text
get_weather
作用：查询天气
参数：city:string
```

但是它自己不会干活。

就像菜单上写着：

```text
番茄炒蛋
```

菜单只是告诉你“有这道菜”。

真正炒菜的是厨师。

---

所以 VII-C 现在缺的是第二样东西：

> **真正能被 Runtime 调用执行的 Tool。**

最简单可以理解成：

```text
Tool
=
工具说明书
+
真正执行的方法
```

比如概念上：

```ts
{
  definition: {
    name: "get_weather",
    description: "查询天气",
    parameters: ...
  },

  execute(args) {
    // 真正查询天气
  }
}
```

注意我们现在只讨论职责，不锁具体 TypeScript 写法。

---

## 为什么不能直接往 `ToolDefinition` 里加 `execute()`？

比如直接改成：

```ts
interface ToolDefinition {
  name: string;
  description: string;
  parameters: ...;

  execute(): Promise<unknown>;
}
```

乍一看更简单。

但它会把两个本来不同的东西混在一起。

### 第一部分：给模型看的

模型只需要知道：

```text
name
description
parameters
```

它根本不应该知道：

```text
execute()
```

因为模型不会调用 JavaScript 函数。

---

### 第二部分：给 Runtime 用的

Runtime 才需要：

```text
找到工具
校验参数
执行 execute()
```

所以更清楚的关系应该是：

```text
ToolDefinition
    ↓
工具说明书

Tool
    ↓
工具说明书 + 实际执行能力
```

这不会推翻 VII-A，而是在 VII-A 之上补一层。

VII-A 已经把 `ToolDefinition` 定位成模型使用的工具描述，所以这一点继续保留最自然。fileciteturn3file0

---

# 你可以把它类比成前端开发

其实跟你熟悉的前端很像。

比如一个路由定义：

```ts
{
  path: "/order",
  title: "订单"
}
```

只是描述信息。

真正处理请求的是：

```ts
handler()
```

我们不会因为它们都属于“订单功能”，就认为：

```text
路由描述
=
业务执行代码
```

Tool 这里也是同样的道理。

---

# 那 ToolRegistry 注册谁？

这里顺便自然引出下一层。

未来：

```text
ToolRegistry
```

不应该只注册：

```text
ToolDefinition
```

因为 Registry（注册表）最终还要让 Runtime 找到一个**能执行的东西**。

所以更合理的是：

```text
Registry
 ↓
保存 Tool
```

然后模型调用之前：

```text
Registry 中所有 Tool
 ↓
提取 definition
 ↓
放进 ModelRequest.tools
```

而执行时：

```text
模型返回 tool name
 ↓
Registry 找到对应 Tool
 ↓
Executor 调用 execute()
```

完整关系就是：

```text
          Tool
        /      \
       /        \
definition      execute
   ↓               ↓
给 LLM 看       给 Runtime 用
```

---

# 这里有一个很重要的边界

Tool 自己应该负责什么？

我目前建议非常简单：

```text
Tool：
“你给我已经合法的参数，
我负责干活。”
```

而不要让 Tool 自己同时负责：

```text
找自己
解析模型参数
Schema 校验
统一错误转换
Approval
Retry
```

否则每一个 Tool 都会重复写大量公共逻辑。

比如天气工具最好只是：

```ts
execute({ city }) {
  return queryWeather(city);
}
```

而不是：

```ts
execute(rawArgs) {
  // 判断是不是 JSON
  // 判断 city 存不存在
  // 判断 city 是不是 string
  // 转换错误格式
  // 权限判断
  // retry
  // 日志
}
```

这些公共事情应该尽量放在 Runtime 的执行层。

---

# 因此 C-1 我建议锁定 3 个结论

### 1. 保留现有 `ToolDefinition`

它继续表示：

> 给模型看的工具说明。

不修改 VII-A 的职责。

---

### 2. VII-C 新增 executable Tool（可执行工具）

它至少拥有：

```text
definition
execute
```

也就是：

> “我是什么” + “我怎么干活”。

---

### 3. Tool 自身不负责通用执行流程

例如这些暂时不要塞进具体 Tool：

```text
Tool lookup
Schema Validation（参数结构校验）
统一 Error Contract（错误契约）
Approval（人工审批）
Retry（重试）
```

尤其 Approval 是 VII-H，不能提前做。fileciteturn0file1

---

这样一来，几个角色已经能很直观地区分：

```text
ToolDefinition
= 工具说明书

Tool
= 真正的工具

ToolRegistry
= 工具柜 / 工具目录

ToolExecutor
= 拿出工具并负责正确执行的人

AgentRuntime
= 决定什么时候需要使用工具的人
```

我觉得这个类比后面可以一直沿用，会比堆很多英文名词好理解。

## 接下来进入 C-2：Tool Registry（工具注册表）

这里真正需要讨论的其实也不多，主要就 4 个问题：

```text
1. Tool 怎么注册进去？
2. 同名 Tool 怎么办？
3. 模型要求 get_weather 时怎么找到它？
4. 怎么把所有 ToolDefinition 提供给 ModelProvider？
```

其中最值得先讨论的是第 2 个：

> **如果注册两个都叫 `get_weather` 的 Tool，应该覆盖前一个，还是直接报错？**

我目前更倾向于：**直接报错，不允许悄悄覆盖。**

因为 Tool Name（工具名）就是模型调用工具时的唯一标识，一旦同名，Runtime 实际上就不知道模型说的 `get_weather` 指谁。

## 轮次 3 — b2d86988-334a-4342-b0ee-a5c2ef688d74

### User

继续

### ChatGPT

好，继续 **C-2：Tool Registry（工具注册表）**。这一节其实就是把“工具柜”设计清楚。

前面我们已经定下来了：

```text
ToolDefinition = 工具说明书
Tool = 真正可执行的工具
ToolRegistry = 工具柜 / 工具目录
```

现在要回答的是：

> Runtime 怎么把 Tool 放进去、找出来、交给模型看？

## 1. Tool Registry 最小职责

我建议 VII-C 第一版只做 3 件事：

```text
注册 Tool
根据 name 查找 Tool
拿到所有 ToolDefinition
```

也就是：

```text
register(tool)
get(name)
listDefinitions()
```

名字以后可以调整，现在先看职责。

不要让 Registry 做：

```text
参数校验
execute()
错误转换
重试
Approval
```

这些不是“工具柜”的职责。

---

# 2. 为什么用 name 查找？

因为模型返回的 Tool Call（工具调用）大概是这种信息：

```json
{
  "name": "get_weather",
  "arguments": {
    "city": "Tokyo"
  }
}
```

模型不会返回：

```text
“请调用内存地址 0x1234 的 WeatherTool 实例”
```

它只认识：

```text
get_weather
```

所以 Runtime 执行的时候天然就是：

```text
模型返回 name
      ↓
ToolRegistry.get(name)
      ↓
找到 Tool
      ↓
执行
```

因此 Tool Name（工具名）其实承担了一个很重要的角色：

> **它是模型世界和 Runtime 世界之间的工具 ID。**

---

# 3. 那同名 Tool 怎么处理？

例如：

```text
Tool A
name = get_weather

Tool B
name = get_weather
```

有两种常见处理方式。

### 方案 A：后注册覆盖前注册

类似：

```ts
map.set(name, tool)
```

第二个自动把第一个覆盖。

实现简单。

但问题是非常隐蔽。

比如：

```text
系统启动时：

register(WeatherToolV1)
register(WeatherToolV2)
```

最后到底运行谁？

如果开发者没注意到重复：

> Runtime 会悄悄改变行为。

这种问题很难查。

---

### 方案 B：发现重复直接报错

例如：

```text
register get_weather
→ 成功

再次 register get_weather
→ DuplicateToolError
```

这样配置阶段立刻暴露问题。

我更推荐这个。

因为我们的 Mini Runtime 目前没有什么：

```text
Tool Version
Tool Priority
Tool Override Policy
```

这些复杂机制。

既然没有明确的覆盖规则，就不要偷偷覆盖。

所以这里我建议锁定：

> **一个 ToolRegistry 中 Tool Name 必须唯一，重复注册直接失败。**

这和普通后端 Route Registry（路由注册表）也很像。

两个地方同时声明：

```text
GET /users
```

通常都应该尽早发现冲突，而不是随机选一个。

---

# 4. Tool 不存在怎么办？

这里要特别区分两个阶段。

假设模型返回：

```text
get_weather
```

但 Registry 中没有。

查找的时候：

```text
registry.get("get_weather")
```

失败。

这个失败不是 Runtime Bug。

因为模型可能真的“幻觉”出了一个不存在的工具。

因此这属于我们 VII-C 要支持的：

```text
Tool not found
```

也就是说 Registry 本身可以表达：

```text
没找到
```

至于最后转成什么 Error Contract（错误契约），应该由 Executor（执行器）处理。

可以理解成：

```text
Registry：
“柜子里没有这个工具。”

Executor：
“那我把它规范化成 TOOL_NOT_FOUND。”
```

所以不要让 Registry 自己负责构造给模型看的错误结果。

---

# 5. Registry 为什么还要提供 Definitions？

因为现在 AgentRuntime 调模型时，必须告诉模型：

> 你有哪些工具可以使用。

当前 VII-B 构造请求是：

```text
ModelRequest {
  messages
}
```

VII-C 后会变成：

```text
ModelRequest {
  messages,
  tools
}
```

这里的 `tools` 来自哪里？

当然不应该让 caller 再单独维护：

```ts
const toolsForRuntime = [...]
const toolDefinitionsForModel = [...]
```

不然就会出现两份配置：

```text
Runtime 能执行的 Tool
和
模型知道的 Tool
```

可能不一致。

例如：

```text
Registry：
get_weather
get_order

ModelRequest：
只放 get_weather
```

那 `get_order` 永远不会被模型调用。

反过来更危险：

```text
ModelRequest：
get_delete_user

Registry：
不存在
```

模型知道一个实际上执行不了的工具。

所以最自然的是：

```text
Registry 保存真正 Tool
          ↓
需要调用模型时
          ↓
从 Tool 中提取 definitions
          ↓
ModelRequest.tools
```

即：

```text
一个事实来源
Single Source of Truth（单一事实来源）
```

通俗说就是：

> **工具只登记一次。**

Runtime 要执行时从这里找。

模型需要说明书时也从这里拿。

---

# 6. 那 ToolRegistry 是 class 还是 interface？

这个问题现在不用复杂化。

它明显开始有自己的行为：

```text
register
get
list
```

而且内部大概率维护：

```text
Map<string, Tool>
```

所以这里用 class 很自然。

这跟 VII-B 的 `RuntimeState` 不一样。

当时 RuntimeState 只是：

```ts
{
  messages: [...]
}
```

没有什么独立行为，所以 interface 足够。

现在 Registry 是：

> “维护一组工具并保证名字唯一。”

它已经有自己的规则。

所以一个 class 是合理的，而不是为了“面向对象”硬造 class。

---

# 7. 要不要支持运行时随时 register / unregister？

这里要控制 Scope（范围）。

理论上以后可以：

```text
动态添加 Tool
动态删除 Tool
Hot Reload
Plugin
MCP
```

但 README 已经明确：

```text
Hot Extension Reload
```

不属于 Part VII v1。fileciteturn0file1

所以 VII-C 没必要设计完整动态插件系统。

第一版可以简单理解：

```text
Runtime 创建
 ↓
Tool 注册完成
 ↓
开始使用
```

是否公开 `register()` 都可以讨论，但不要顺势出现：

```text
unregister()
reload()
replace()
watch()
namespace()
version()
```

那些目前没有需求。

---

# 8. 这里还有一个值得注意的问题：Tool 顺序

假设：

```text
register A
register B
register C
```

传给模型：

```text
[A.definition, B.definition, C.definition]
```

第一版最好保持注册顺序即可。

不要现在做：

```text
按名称排序
按优先级排序
按分类排序
动态选择
```

因为目前都没有需求。

这样测试也容易理解：

```text
注册顺序
=
模型看到的 tools 顺序
```

---

# C-2 我建议锁定的结论

到这里我认为 Tool Registry（工具注册表）可以定得非常小：

```text
1. Registry 保存 executable Tool（可执行工具）

2. Tool Name 在同一个 Registry 中必须唯一

3. 重复注册直接失败，不静默覆盖

4. 根据 name 查找 Tool

5. Tool 不存在属于正常的“工具调用失败场景”，不是 Runtime Bug

6. Registry 可以从 Tool 中提取全部 ToolDefinition，
   供 AgentRuntime 放进 ModelRequest.tools

7. 不做动态卸载、覆盖、版本、热更新等能力
```

整体就是：

```text
                 ToolRegistry

register(weather) ─────┐
register(order)   ─────┤
                       │
                       ▼
                 Map<name, Tool>
                   /          \
                  /            \
        Runtime 执行           Model 调用
              ↓                  ↓
       get("weather")       listDefinitions()
              ↓                  ↓
          WeatherTool       ModelRequest.tools
```

这一步其实很朴素：

> **Registry 就是一个带“禁止重名”规则的 Map。**

它的价值不在算法复杂，而在于把“系统到底有哪些工具”集中到一个地方。

---

## 下一步：C-3 Arguments Contract（参数契约）

这一步会比 Registry 更重要。

因为现在模型可以返回：

```json
{
  "city": 123
}
```

甚至：

```json
{
  "foo": "bar"
}
```

虽然它们都是合法 JSON，但不代表 `get_weather` 能接受。

所以我们接下来真正要讨论：

```text
ToolCall.arguments: unknown

到底怎么变成：

WeatherArgs {
  city: string
}
```

以及：

> **Schema（参数规则）由谁定义？谁负责真正校验？校验失败以后又应该发生什么？**

这里会直接决定我们的 Tool Executor 和 Error Contract 怎么设计。

## 轮次 4 — 52640e00-9249-4780-bca2-9a8f161377cf

### User

继续

### ChatGPT

继续，我们进入 **C-3：Arguments Contract（参数契约）**。

这一小节核心就一个问题：

> 模型给出来的参数，什么时候才算“真的可以交给 Tool 执行”？

VII-A 已经把 `ToolCall.arguments` 定成 `unknown`，这不是缺陷，反而很符合现在的边界：Provider 只负责把模型返回的 JSON 解析出来，但不保证它一定符合某个具体 Tool 的参数要求。VII-B 也明确把这个问题作为 B-P3 留给 VII-C 回收。fileciteturn0file0

---

## 1. 先用最简单的例子理解

假设我们有一个工具：

```text
get_weather
```

它真正需要的参数是：

```ts
{
  city: string
}
```

模型却可能给你：

```json
{
  "city": 123
}
```

也可能给：

```json
{
  "city": "Tokyo",
  "foo": "bar"
}
```

甚至：

```json
{
  "country": "Japan"
}
```

这些都可能是**合法 JSON**。

但“合法 JSON”不等于“合法 Tool 参数”。

---

## 2. 所以这里有两个完全不同的校验

第一层：

```text
是不是合法 JSON？
```

这个 VII-A 已经解决。

例如 OpenAI 返回：

```text
"{\"city\":\"Tokyo\"}"
```

Provider Adapter（供应商适配层）负责：

```text
string
 ↓
JSON.parse
 ↓
object
```

如果连 JSON 都解析失败，那属于 Provider 响应格式问题。

---

第二层才是 VII-C：

```text
这个 object
是不是 get_weather 真正需要的参数？
```

也就是：

```text
{ city: "Tokyo" }
→ 合法

{ city: 123 }
→ 不合法

{ country: "Japan" }
→ 不合法
```

这就是 Schema Validation（参数结构校验）。

---

# 3. 谁应该定义参数规则？

这里其实答案很自然：

> **Tool 自己应该声明自己的参数规则。**

因为只有 Tool 最清楚自己需要什么。

例如：

```text
get_weather
需要：
city:string
```

而：

```text
search_order
需要：
orderId:string
```

所以不能让 AgentRuntime 里硬编码：

```text
if toolName === "get_weather" ...
if toolName === "search_order" ...
```

否则每加一个 Tool 都要改 Runtime Core（运行时核心）。

这显然不合理。

---

# 4. 那参数规则是不是就是现在的 ToolDefinition.parameters？

这里要小心。

我们现在已经有：

```text
ToolDefinition.parameters
```

它本来就是为了告诉模型：

> 这个 Tool 需要什么参数。

所以直觉上我们会想到：

> 那是不是直接拿这份 Schema 同时做运行时校验？

我认为这个方向是合理的。

也就是：

```text
一份参数 Schema
       ↓
既给模型看
       ↓
也给 Runtime 校验
```

这样避免维护两套：

```text
给模型看的 schema

和

Runtime 自己校验的 schema
```

否则很容易出现：

```text
模型看到：
city 是 string

Runtime 实际校验：
city 是 number
```

那系统自己就矛盾了。

所以这里我比较倾向：

> **Tool 的参数定义应该尽量只有一个事实来源。**

---

# 5. 但是“有 Schema”不等于“已经会校验”

这是一个很重要的区别。

VII-A 里的：

```text
parameters
```

目前更像：

> 一份描述。

VII-C 才需要真正出现：

```text
validate(arguments)
```

也就是说：

```text
Schema
= 规则

Validator
= 按规则检查数据的人
```

不能因为已经有 JSON Schema（JSON 参数模式），就认为系统自动会校验。

---

# 6. Validator 放在哪里？

这里有几个可能位置。

## 方案 A：每个 Tool 自己校验

例如：

```ts
execute(args) {
  if (typeof args.city !== "string") {
    throw ...
  }
}
```

这个方案能用。

但问题是：

每个 Tool 都要重复：

```text
判断对象
判断字段
判断类型
构造错误
```

而且参数错误会和真正执行错误混在一起。

例如：

```text
city 类型错
```

和：

```text
天气 API 500
```

最后可能都只是：

```text
throw Error
```

Runtime 就很难区分。

所以我不太推荐。

---

## 方案 B：ToolExecutor 统一校验

流程变成：

```text
ToolCall
 ↓
找到 Tool
 ↓
根据 Tool 的 Schema 校验 arguments
 ↓
校验通过
 ↓
execute()
```

如果校验失败：

```text
INVALID_ARGUMENTS
```

根本不进入 Tool.execute()。

这个边界就很干净。

---

# 7. 这也是为什么 ToolExecutor 不只是“调用一个函数”

前面我们说：

```text
ToolExecutor
= 负责正确执行工具的人
```

现在这个角色就具体起来了：

```text
ToolExecutor

1. 根据 name 找 Tool
2. 校验 arguments
3. 校验通过后调用 execute()
4. 把结果统一包装
5. 把已知失败统一包装
```

所以：

```text
Tool.execute()
```

可以保持很干净：

> 我只接收已经校验过的参数。

---

# 8. `unknown` 要不要改掉？

我目前仍然建议：

> **不要急着改。**

现在的：

```ts
ToolCall.arguments: unknown
```

其实语义很好：

```text
LLM 给我的东西
↓
我暂时不信任
```

经过 Validator 后才变成：

```text
validated arguments
```

可以理解成：

```text
unknown
 ↓
校验
 ↓
可信参数
```

这是 TypeScript 里很典型的边界处理。

所以 VII-C 不一定需要为了“类型漂亮”去修改 VII-A 已经稳定的模型契约。

---

# 9. 那 Tool.execute() 的参数类型怎么办？

这里开始有一个真正值得讨论的设计点。

假设我们以后希望写：

```ts
execute(args: WeatherArgs)
```

而不是：

```ts
execute(args: unknown)
```

这样开发 Tool 的体验明显更好。

例如：

```ts
type WeatherArgs = {
  city: string;
};

execute(args: WeatherArgs) {
  args.city;
}
```

Tool 内部就不用再做：

```ts
if (
  typeof args === "object" &&
  ...
)
```

---

# 10. 这意味着 Tool Contract 可能需要泛型

概念上可能是：

```ts
Tool<TArgs>
```

例如：

```text
Tool<WeatherArgs>
Tool<SearchOrderArgs>
```

然后：

```text
ToolExecutor
```

面对所有 Tool 时，外层仍然看到：

```text
unknown
```

但具体 Tool 内部可以得到：

```text
WeatherArgs
```

这在 TypeScript 里其实很自然。

但这里我提醒一下：

> 我们现在还在 Architecture Analysis，不需要马上把泛型接口签名写死。

我们只需要先确定语义：

```text
模型参数
= 不可信 unknown

经过校验
= Tool 可安全使用的参数类型
```

---

# 11. 校验失败以后应该发生什么？

这里也先只讲语义。

例如模型调用：

```json
{
  "name": "get_weather",
  "arguments": {
    "city": 123
  }
}
```

Runtime 不应该：

```text
直接让 execute() 崩掉
```

更不应该：

```text
整个 run reject
```

更合理的是：

```text
参数校验失败
 ↓
形成一个明确的 Tool Error
 ↓
写回 tool_result
 ↓
告诉模型：
你的参数不对
 ↓
让模型决定是否重新调用
```

例如模型下一轮可能改成：

```json
{
  "city": "Tokyo"
}
```

这就是 Agent 自我修正的一部分。

---

# 12. 但是错误信息不能无限复杂

VII-C 第一版没必要做一整套：

```text
path
keyword
schemaPath
instancePath
expected
received
allErrors
nested diagnostics
```

这些工业级校验库可能都有。

但我们的 Runtime 第一版只需要让模型知道：

```text
INVALID_ARGUMENTS

以及一个够用的错误说明
```

例如：

```text
city must be a string
```

就够了。

不要把 Validator 本身做成一个大型子系统。

---

# 13. 要不要依赖 AJV / Zod 之类的库？

这个问题我们下一步 Design Decision 时可以正式选。

现在先把候选讲清楚。

## 方案 A：自己手写最小校验

优点：

```text
简单
依赖少
学习过程透明
```

缺点：

```text
很快会开始重复造 JSON Schema 校验器
```

---

## 方案 B：用现成 JSON Schema Validator

例如 AJV。

优点：

```text
ToolDefinition.parameters 本来就是 JSON Schema
可以直接复用
```

这个方向比较符合：

```text
一份 Schema
既给模型看
又给 Runtime 校验
```

---

## 方案 C：Zod 一类 schema

也能做，而且 TypeScript 类型体验很好。

但会出现一个问题：

```text
Zod Schema
 ↓
Runtime 校验

然后还要
 ↓
转成 JSON Schema
 ↓
给模型
```

这样反而多一层转换。

对于我们当前已经存在 `ToolDefinition.parameters` 的项目来说，未必是最小增量。

所以我目前更倾向：

> 如果 VII-A 的 `parameters` 已经是标准 JSON Schema 形状，那么 VII-C 直接用 JSON Schema Validator 会更顺。

但这个我们还没最终拍板。

---

# 14. C-3 我建议先锁定这些结论

到这里可以先确认：

```text
1. ToolCall.arguments 继续视为不可信数据

2. JSON 能解析
   ≠
   Tool 参数合法

3. Tool 自己声明参数 Schema

4. 参数 Schema 尽量保持单一事实来源
   同时给模型和 Runtime 使用

5. 参数校验发生在 execute() 之前

6. 校验失败时 Tool.execute() 不应该被调用

7. 校验失败属于 Tool Invocation Error（工具调用错误）
   不是 Provider Error，也不是 Runtime Bug

8. 校验失败应能够作为 Tool Result 回流给模型

9. 不需要为了 VII-C 推翻现有 arguments: unknown
```

这一步本质上是在建立一个非常重要的边界：

```text
模型产生的数据
        ↓
       unknown
        ↓
   Validation
        ↓
可信数据
        ↓
Tool.execute()
```

这个边界以后不仅 Tool 会遇到。

你以后做 Agent 时，很多地方都会是类似思想：

> **LLM 输出不能因为“看起来像对的”就直接信任；进入业务代码之前必须经过确定性代码校验。**

---

## 下一步进入 C-4：Tool Executor + Error Contract

这会是 VII-C 最核心的一小节。

我们已经有了三种失败：

```text
找不到 Tool
参数不合法
Tool.execute() 自己抛异常
```

下一步真正要决定的是：

> 这三种情况到底应该统一成什么结构？

以及一个更关键的问题：

> **Tool 执行失败后，到底是让整个 `run()` 失败，还是把失败作为 `tool_result` 告诉模型，让 Agent 有机会自己处理？**

我建议下一轮就集中讨论这一件事。

## 轮次 5 — e906bf9c-047d-4c92-8a11-911541f39168

### User

继续讨论

### ChatGPT

好，继续进入 **C-4：Tool Executor + Error Contract（工具执行器 + 错误契约）**。

这一节是 VII-C 里最关键的一块，因为它决定：

> **工具出错以后，Agent 是直接死掉，还是还能继续自己修正。**

我们先用最简单的话讲。

---

# 1. Tool Executor 到底是干什么的？

前面我们已经把角色分清楚了：

```text
ToolRegistry
= 工具柜

Tool
= 真正的工具

ToolExecutor
= 负责把工具正确拿出来并执行的人
```

所以 ToolExecutor（工具执行器）大概负责：

```text
1. 根据 name 找 Tool
2. 校验 arguments
3. 执行 Tool
4. 把执行结果整理成统一格式
5. 把“已知的工具失败”也整理成统一格式
```

重点是第 5 个。

---

# 2. 先看三种失败

VII-C 已经明确要处理三类：

```text
Tool not found
Tool arguments invalid
Tool execution exception
```

也就是：

### 第一种：工具不存在

模型说：

```text
调用 get_weather
```

但 Registry 里根本没有。

---

### 第二种：参数不合法

模型说：

```json
{
  "city": 123
}
```

但 Tool 要求：

```text
city:string
```

---

### 第三种：Tool 自己执行失败

例如：

```text
天气 API 超时
数据库报错
订单服务 500
```

这时候 Tool 已经真正开始执行了，只是执行失败。

---

# 3. 最简单的方案：全部 throw

可以设计成：

```text
没找到 Tool
→ throw

参数错误
→ throw

execute 失败
→ throw
```

然后：

```text
AgentRuntime.run()
→ reject
```

这个方案代码最简单。

但是它有一个很大的问题：

> 模型永远不知道发生了什么。

例如：

```text
LLM：
调用 get_weather(city=123)

Runtime：
参数错误
→ throw
→ 整个 run 结束
```

模型根本没有机会说：

```text
“哦，我参数写错了，那我重新用 city='Tokyo' 调一次。”
```

这会让 Agent 很脆弱。

---

# 4. 所以更合理的是：工具错误也变成“观察结果”

你之前学习 Agent 时应该已经接触过：

```text
Observation（观察结果）
```

它不一定是成功结果。

失败本身也是一种观察结果。

例如：

```text
Action（动作）：
调用 get_weather(city=123)

Observation（观察结果）：
INVALID_ARGUMENTS
city must be a string
```

模型看到后就能继续：

```text
那我修正参数。
```

所以我建议：

> **VII-C 中，预期内的工具失败不要直接结束 Agent Run。**

而是：

```text
Tool error
 ↓
转换成统一 Tool Result
 ↓
写入 RuntimeState
 ↓
下一轮 Model
```

---

# 5. 这里的“预期内”非常重要

不能变成：

```text
catch (everything)
```

然后什么错误都告诉模型。

这会把真正的 Runtime Bug（运行时自身错误）也吞掉。

所以我们要区分两大类。

---

# 6. 第一类：工具调用失败

这是 Runtime 能理解的。

例如：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
```

这些都是：

> “模型请求执行一个 Tool，但这次执行没成功。”

它们可以作为 Tool Result 回流。

---

# 7. 第二类：Runtime 自己坏了

比如：

```text
ToolRegistry 内部状态损坏

ToolExecutor 代码自己出现 null bug

RuntimeState append 逻辑崩了
```

这种不能包装成：

```text
TOOL_EXECUTION_FAILED
```

否则模型会误以为：

> “只是天气工具失败了。”

实际上是 Runtime 自己出 bug 了。

所以原则应该是：

```text
可预期的 Tool Failure
→ 转成 Tool Result

Runtime 自身异常
→ 正常 throw
```

这就是 Error Contract（错误契约）最核心的意义。

---

# 8. 那 Tool.execute() 抛错算哪一种？

这个问题稍微有点微妙。

假设：

```ts
execute() {
  throw new Error("weather api timeout");
}
```

从 ToolExecutor 看：

> 这是 Tool 执行过程中发生的异常。

所以 VII-C 第一版可以把它统一理解成：

```text
TOOL_EXECUTION_FAILED
```

然后把一个安全、可理解的错误信息给模型。

例如：

```text
tool execution failed: weather api timeout
```

但这里要注意一个工程边界：

> 不一定要把原始 Error 的所有细节都暴露给 LLM。

比如：

```text
数据库密码
内部路径
stack trace
SQL
内部服务地址
```

这些以后都可能是敏感信息。

VII-C 第一版可以先简单处理，但理念上要明确：

```text
原始异常
≠
必须完整喂给模型
```

---

# 9. Error Contract 最小需要包含什么？

我不建议现在设计一个很大的错误体系。

VII-C 第一版够用的其实很少。

概念上可以是：

```text
error code
message
```

比如：

```text
TOOL_NOT_FOUND
"Tool get_weather was not found"
```

或者：

```text
INVALID_ARGUMENTS
"city must be a string"
```

或者：

```text
TOOL_EXECUTION_FAILED
"Tool execution failed"
```

重点不是字段名字。

重点是：

> Runtime 能稳定区分是哪一类失败。

---

# 10. 为什么一定要有 code，而不能只写 message？

如果只有：

```text
"tool failed"
```

那上层代码很难判断到底发生了什么。

而有：

```text
code: INVALID_ARGUMENTS
```

以后你要做：

```text
日志统计
UI 展示
测试断言
重试策略
Approval
```

都会容易很多。

所以 Error Contract（错误契约）至少应该有：

```text
稳定机器可读的 code
+
给人/模型看的 message
```

---

# 11. ToolExecutor 最好不要 throw “正常工具失败”

所以从语义上，我更倾向 ToolExecutor 返回两种结果：

```text
成功
或
已规范化的工具失败
```

例如：

```text
ToolExecutionResult

success
  result: ...

failure
  error:
    code
    message
```

注意，这里还没锁具体 TypeScript 类型。

我们只是先锁职责：

> ToolExecutor 对“工具调用层面的失败”做归一化。

---

# 12. 这样 AgentRuntime 会简单很多

AgentRuntime 不需要知道：

```text
AJV 怎么校验
Registry 怎么查 Map
Tool execute 怎么 catch
```

它只需要：

```text
模型说要调用 Tool
 ↓
交给 ToolExecutor
 ↓
拿回执行结果
 ↓
转换成 RuntimeToolMessage
 ↓
写入 State
```

也就是：

```text
AgentRuntime
负责流程

ToolExecutor
负责工具执行细节
```

这和我们之前一直强调的职责分离是一致的。

---

# 13. 成功和失败都应该变成 tool_result

假设成功：

```text
get_weather
→ 28°C
```

写回：

```text
tool_result: success
```

假设失败：

```text
get_weather
→ INVALID_ARGUMENTS
```

也写回：

```text
tool_result: failure
```

这样模型下一轮看到完整事实：

```text
assistant:
我要调用 get_weather

tool:
INVALID_ARGUMENTS: city must be string
```

然后它可以自己决定下一步。

---

# 14. 这里其实第一次体现了“LLM 错了不等于 Runtime 错了”

这是非常重要的认知。

模型可能：

```text
调用不存在的 Tool
参数填错
```

这不应该马上理解成：

> Agent 系统崩了。

因为 LLM 本身就是概率模型。

它会出错。

Runtime 的价值之一，就是：

> 把 LLM 的不确定输出，包在确定性的工程边界里。

所以：

```text
LLM 参数错
→ 正常可处理流程
```

而不是：

```text
系统异常
```

---

# 15. 但 Tool 业务失败，也不代表模型一定能解决

例如：

```text
TOOL_EXECUTION_FAILED
天气服务宕机
```

模型拿到之后可能回答：

```text
“天气服务暂时不可用。”
```

也可能尝试别的方法。

但 Runtime 不负责保证模型一定能恢复。

Runtime 只负责：

> 把事实正确告诉模型，让模型有机会继续判断。

这个边界要保持清楚。

---

# 16. Provider Error 仍然不动

VII-B 已经明确：

```text
Provider throw
→ run reject
```

VII-C 不应该顺手统一成 Tool Error。

因为：

```text
模型 API 挂了
```

和：

```text
天气 Tool 挂了
```

完全不是一回事。

所以继续保持：

```text
Provider Error
→ throw

Tool Invocation Error
→ tool_result

Runtime Bug
→ throw
```

这个三分法我认为非常重要。VII-B 的错误传播边界已经明确记录，不需要在 VII-C 推翻。fileciteturn0file0

---

# 17. 现在可以形成一个非常清楚的流程

```text
ToolCall
   ↓
ToolExecutor
   ↓
查 Registry
   │
   ├─ 没找到
   │   ↓
   │ TOOL_NOT_FOUND
   │
   └─ 找到
       ↓
     校验参数
       │
       ├─ 失败
       │   ↓
       │ INVALID_ARGUMENTS
       │
       └─ 成功
           ↓
        execute()
           │
           ├─ 成功
           │   ↓
           │ SUCCESS
           │
           └─ Tool 抛错
               ↓
          TOOL_EXECUTION_FAILED
```

然后四种结果统一回到：

```text
RuntimeToolMessage
↓
RuntimeState
↓
下一轮模型
```

---

# 18. C-4 我建议锁定这些结论

这一节可以先确认：

1. **ToolExecutor 负责统一 Tool 调用流程**：查找、校验、执行、结果归一化。

2. **Tool not found、arguments invalid、Tool execution exception 都属于可预期的 Tool Failure（工具失败）**。

3. 这三种失败原则上**不直接结束 `AgentRuntime.run()`**。

4. 它们应该转换为稳定的 Error Contract（错误契约），至少有机器可读的 `code` 和可理解的 `message`。

5. Tool 成功与 Tool 失败都应该形成 Tool Result（工具结果），写入 RuntimeState。

6. Provider Error 继续保持 VII-B 的行为：直接向上传播。

7. Runtime 自己的 Bug 不能被 `catch all` 包装成 Tool Error。

---

到这里，Tool Executor 的本质其实可以用一句特别简单的话理解：

> **ToolExecutor 不是“调用函数的人”，而是“把不可靠的模型 Tool Call，安全地变成一个确定执行结果的人”。**

---

下一步我们就可以进入 **C-5：Agent Tool Loop（工具循环）**。

这一步会把前面的东西真正串起来：

```text
模型调用 Tool
→ ToolExecutor 执行
→ tool_result 写回
→ 为什么还要再次调用模型？
→什么时候结束？
```

也就是 VII-B 里那个“现在没有真正 while”的 Agent Loop，到了这里第一次真正开始循环。

## 轮次 6 — 408964a9-5505-4d94-ba07-f6f9f762e042

### User

继续讨论

### ChatGPT

好，继续进入 **C-5：Agent Tool Loop（工具循环）**。

这一节就是把前面几块真正串起来。到这里，VII-C 才开始让 `AgentRuntime.run()` 发生真正的“循环”。

## 1. VII-B 为什么当时不用真正循环？

VII-B 的流程是：

```text
User
 ↓
Model
 ↓
stop
或
tool_calls
```

但当时没有 ToolExecutor（工具执行器），所以模型一旦说：

```text
“我要调用 get_weather”
```

Runtime 只能：

```text
保存这条 model_output
↓
返回 unsupported
```

因为它没有下一步可以做。

所以 VII-B 不写 `while` 是合理的。fileciteturn0file0

---

# 2. VII-C 以后为什么终于有理由继续？

现在有了：

```text
ToolRegistry
ToolExecutor
Tool Result
```

所以模型返回：

```text
tool_calls
```

以后，Runtime 不需要结束。

它可以继续：

```text
模型：
我要调用 get_weather

Runtime：
执行 get_weather

Tool：
Tokyo, 28°C

Runtime：
把结果写回消息

然后再次调用模型
```

所以一次 `run()` 变成：

```text
Model Turn #1
↓
Tool Execution
↓
Model Turn #2
↓
completed
```

这里的 Model Turn（模型轮次）是：

> 调一次 ModelProvider。

而 Agent Run（一次 Agent 执行）可能包含多个 Model Turn。

这两个概念从 VII-C 开始就不能再混用了。

---

# 3. 一个完整例子

用户：

```text
东京现在天气怎么样？
```

第一轮模型看到：

```text
user:
东京现在天气怎么样？

tools:
get_weather
```

模型返回：

```text
assistant:
tool_call get_weather({ city: "Tokyo" })
```

Runtime 先保存：

```text
user_input
model_output(tool_call)
```

然后执行 Tool：

```text
get_weather({ city: "Tokyo" })
```

得到：

```text
28°C, sunny
```

再保存：

```text
tool_result
```

此时 RuntimeState 大概已经是：

```text
user_input:
东京现在天气怎么样？

model_output:
我要调用 get_weather(city=Tokyo)

tool_result:
28°C, sunny
```

然后 Runtime 再调用一次模型。

模型看到完整历史后：

```text
Tokyo is currently 28°C and sunny.
```

Runtime 再保存这条 `model_output`。

最后：

```text
finishReason = stop
```

才真正：

```text
return completed
```

---

# 4. 所以最小 Agent Loop 是什么？

先不用想代码，可以理解成：

```text
问模型
 ↓
模型回答
 ↓
保存回答
 ↓
看模型还要不要工具
    ↓
    要
    ↓
执行工具
 ↓
保存工具结果
 ↓
回到“问模型”
```

直到：

```text
模型说完了
↓
stop
↓
completed
```

这就是 VII-C 最小循环。

---

# 5. 谁负责这个循环？

继续保持 VII-B 已经确定的设计：

> **AgentRuntime 负责。**

不要突然增加：

```text
ToolExecutor.executeAndContinueLoop()
```

更不要让：

```text
ModelProvider
```

负责继续调用。

职责应该非常清楚：

```text
AgentRuntime
= 决定流程往哪里走

ModelProvider
= 调模型

ToolExecutor
= 执行一次 ToolCall

RuntimeState
= 保存已经发生的消息事实
```

所以 ToolExecutor 执行完以后只把结果交回来。

它不应该说：

> “我工具执行完了，我现在自己再调用 LLM。”

这会把整个 Agent 流程拆散。

---

# 6. Tool Result 应该什么时候写入 State？

VII-B 已经形成了一个非常重要的原则：

> **事实先记录，再判断下一步。**

这个原则在 VII-C 继续保持。

例如：

```text
ModelResponse
↓
先保存 model_output
↓
再判断 tool_calls
```

然后 Tool 执行以后也是：

```text
ToolExecutionResult
↓
先保存 tool_result
↓
再进入下一轮 Model
```

也就是说：

```text
执行成功
→ 保存成功结果

执行失败
→ 保存失败结果
```

然后才继续。

这样 RuntimeState 一直表示：

> “到目前为止真实发生过什么。”

而不是只保存“成功的事情”。

---

# 7. 一个 ModelResponse 可能有多个 Tool Calls

这里开始有一个实际问题。

模型可能一次说：

```text
调用 get_weather(Tokyo)
调用 get_weather(Singapore)
```

也就是：

```text
toolCalls = [A, B]
```

第一版怎么做最简单？

我建议：

> **按顺序一个一个执行。**

即：

```text
ToolCall A
↓
执行
↓
写回 result A

ToolCall B
↓
执行
↓
写回 result B

全部完成
↓
再问模型
```

不要：

```text
执行 A
↓
马上问模型
```

然后 B 还没处理。

因为模型这一轮已经明确提出了多个 Tool Call。

更合理的是把这一批都处理完，再进入下一 Model Turn。

---

# 8. 为什么 VII-C 不做并行？

当然以后可以：

```text
A 和 B 同时执行
```

但一做并行，马上出现：

```text
哪个先完成？
一个成功一个失败怎么办？
Abort 怎么处理？
结果顺序怎么保持？
```

这些问题会把 VII-C 拉大很多。

而当前目标只是证明：

> Model → Tool → Model 的闭环成立。

所以第一版顺序执行最合理。

---

# 9. Tool 失败以后还继续下一轮模型吗？

根据我们 C-4 的讨论：

> 是。

例如：

```text
模型：
get_weather(city=123)

ToolExecutor：
INVALID_ARGUMENTS

Runtime：
保存 tool_result(error)

然后再问模型
```

模型可能修正：

```text
get_weather(city="Tokyo")
```

然后：

```text
再执行
再写回
再问模型
```

所以失败并不自动结束 run。

这正是 Agent 相比普通函数调用最大的不同之一。

---

# 10. 那什么时候才 return？

VII-B 已经把 RunOutcome 的含义锁定了：

> 它表示整个 run 已经结束。fileciteturn0file0

所以 VII-C 中：

```text
tool_calls
```

不能 return。

它只是：

```text
继续执行的原因
```

真正 return 的主要情况应该是：

```text
finishReason = stop
↓
completed
```

至于：

```text
length
unknown
```

VII-B 当前是：

```text
unsupported
```

VII-C 没有需求修改它们。

所以仍然可以：

```text
stop
→ completed

tool_calls
→ execute + continue

length
→ unsupported

unknown
→ unsupported
```

这就是最小增量。

---

# 11. 这里会第一次出现真正的 `while`

逻辑上大概已经是：

```text
while 当前 run 还没结束:

    调模型

    保存 model_output

    if stop:
        return completed

    if tool_calls:
        执行工具
        保存 tool_result
        continue

    其他:
        return unsupported
```

这一次 `while` 就不是为了“章节叫 Agent Loop”硬写出来的了。

它有真实业务理由。

这个区别很重要。

---

# 12. 但这里马上出现一个风险：无限循环

假设模型一直：

```text
调用 get_weather
↓
调用 get_weather
↓
调用 get_weather
↓
...
```

Runtime 如果没有任何保护：

```text
while(true)
```

就可能永远跑下去。

所以 VII-C 从这一刻开始第一次必须面对：

> **Agent Loop 怎么防止无限循环？**

这个问题我们下一节 C-6 专门讨论。

---

# 13. C-5 还有一个边界：一次 run 不能再次追加 user_input

这个也很值得注意。

假设：

```text
runtime.run("查东京天气")
```

第一次进入 run 时：

```text
append user_input
```

然后内部循环：

```text
Model
Tool
Model
Tool
Model
```

这些都属于同一次 run。

所以循环里不能每次都：

```text
append user_input
```

否则历史会变成：

```text
user
assistant
tool
user   ← 错了
assistant
```

正确的是：

```text
run 开始
↓
user_input 只 append 一次
↓
内部循环只不断追加：
model_output
tool_result
model_output
tool_result
...
```

这一点也正好回收 VII-B 的 B-P1：

> 不能让 caller 为了继续 Tool Flow 再调用一次 `run(userInput)`。fileciteturn0file0

---

# 14. 现在整个状态变化已经非常清楚了

正常 Tool 成功：

```text
[]
↓
user_input
↓
model_output(tool_call)
↓
tool_result(success)
↓
model_output(final)
```

参数错误后模型修正：

```text
[]
↓
user_input
↓
model_output(tool_call wrong args)
↓
tool_result(INVALID_ARGUMENTS)
↓
model_output(tool_call corrected args)
↓
tool_result(success)
↓
model_output(final)
```

这其实就是我们前面理论课一直画的 Agent Loop，现在终于在自己的 Runtime 中真正落地了。

---

# C-5 我建议锁定的结论

这一节可以基本确定：

1. **`tool_calls` 从“终止原因”变成“继续原因”。**

2. Tool 执行和下一次 Model Turn 必须发生在**同一个 `AgentRuntime.run()` 内部**。

3. `RunOutcome` 仍然只表示整个 run 的最终结果，不表示中间步骤。

4. 每次 ModelResponse 先写入 State，再判断下一步。

5. 每个 Tool Result 也先写入 State，再继续下一轮模型。

6. 一次 ModelResponse 中多个 Tool Calls 第一版顺序执行，全部完成后再进入下一次 Model Turn。

7. Tool Failure（工具失败）写入后，仍允许模型继续处理。

8. 用户输入在一次 run 开始时只追加一次；内部 Tool Loop 不重复追加 user_input。

9. VII-C 开始后，`AgentRuntime.run()` 出现真正有意义的循环。

---

## 下一步 C-6：Loop Boundary（循环边界）

现在最后剩下一个非常现实的问题：

```text
模型如果永远调用 Tool 怎么办？
```

我们需要讨论：

```text
maxTurns 到底限制什么？
限制 Model Turn 还是 Tool Call 数？
达到限制后返回什么？
多个 ToolCall 算一轮还是多轮？
```

这里很容易把 `iteration / maxTurns / status` 又塞回 RuntimeState，所以我们也会顺便判断：

> 这些东西到底是不是 State，还是只应该是一次 `run()` 内的局部控制变量。

## 轮次 7 — af1987d8-ea4c-4351-ab1c-96f13c557267

### User

继续讨论

### ChatGPT

好，继续进入 **C-6：Loop Boundary（循环边界）**。

这一节要解决的不是“怎么循环”，而是：

> **怎么保证这个循环不会失控。**

这也是 VII-C 最后一个需要先想清楚的核心架构问题。

## 1. 为什么现在必须有循环保护？

到了 VII-C，`run()` 里会出现真正的循环：

```text
Model
↓
Tool
↓
Model
↓
Tool
↓
Model
...
```

如果模型一直返回 `tool_calls`：

```text
第 1 轮：调用工具
第 2 轮：继续调用工具
第 3 轮：继续调用工具
...
```

Runtime 如果没有任何限制，就可能一直跑。

所以现在加一个上限，不是“为了以后扩展”，而是：

> **当前能力一旦成立，就必须有的安全边界。**

---

# 2. 到底限制什么？

这里有三个候选。

### 方案 A：限制 Tool Call 数量

比如：

```text
maxToolCalls = 10
```

看起来合理，但有个问题。

模型一次可能返回：

```text
toolCalls = [A, B, C]
```

这到底算 1 次还是 3 次？

而且真正推动 Agent 往前走的，并不是“Tool 调了多少次”，而是：

> 模型重新思考了多少轮。

---

### 方案 B：限制整个 `while` 循环次数

例如：

```text
maxIterations = 10
```

也能用。

但这个名字有点模糊。

因为以后循环内部可能不止：

```text
Model → Tool
```

“iteration” 到底指什么，容易越用越含糊。

---

### 方案 C：限制 Model Turn（模型轮次）

我目前最倾向这个。

也就是：

```text
maxTurns
```

表示：

> **一次 `run()` 最多允许调用模型多少次。**

例如：

```text
maxTurns = 5
```

执行：

```text
Model Turn #1
→ Tool

Model Turn #2
→ Tool

Model Turn #3
→ stop
```

一共用了 3 个 Turn。

这个定义最容易理解。

---

# 3. 为什么 Model Turn 更合理？

因为 Agent 的主要“决策点”发生在模型调用后。

每次：

```text
ModelProvider.generate()
```

模型都会决定：

```text
结束
还是
继续调用工具
```

所以用模型调用次数限制 Agent Loop，很自然。

而且以后成本控制也更容易理解：

```text
模型调用次数
≈
token 消耗
≈
延迟
≈
费用
```

虽然 VII-C 现在不做 Usage Budget（用量预算），但这个边界本身已经很明确。

---

# 4. 多个 Tool Call 算几轮？

如果我们采用：

```text
maxTurns
```

那么答案非常简单：

```text
Model 返回 3 个 ToolCalls
```

仍然只算：

```text
1 个 Model Turn
```

因为模型只调用了一次。

流程：

```text
Turn #1
↓
Tool A
Tool B
Tool C
↓
Turn #2
```

中间执行几个 Tool，不增加 Turn。

这和我们 C-5 里决定的“同一批 Tool Call 全部执行完，再问模型”也是一致的。

---

# 5. maxTurns 应该放进 RuntimeState 吗？

我建议：

> **不要。**

这是一个很重要的边界。

VII-B 已经明确：

```text
RuntimeState
= 需要跨轮保留的消息事实
```

fileciteturn0file0

而：

```text
currentTurn
maxTurns
```

属于：

> 这一次 `run()` 怎么控制执行。

例如：

```text
currentTurn = 3
```

下一次用户再调用：

```text
runtime.run("你好")
```

显然应该重新从：

```text
currentTurn = 0
```

开始。

所以它不是会话事实。

应该是：

```text
run() 内部局部变量
```

例如概念上：

```text
let turn = 0;
```

而不是：

```text
RuntimeState {
  messages,
  iteration,
  maxTurns
}
```

这一点正好再次印证 VII-B 的设计是对的：

> “会变化”不等于“应该进入 State”。

---

# 6. maxTurns 本身放哪里？

这里可以分开看。

### 当前已经用了多少轮

这是：

```text
currentTurn
```

局部变量。

---

### 最多允许多少轮

这是：

```text
maxTurns
```

它属于配置。

所以更合理的归属是：

```text
AgentRuntime configuration
```

例如创建 Runtime 时确定：

```text
AgentRuntime({
  provider,
  tools,
  maxTurns
})
```

这里只是表达概念，不是在定最终 API。

---

# 7. 是否需要默认值？

我认为需要。

如果每次创建 Runtime 都要求用户必须传：

```text
maxTurns
```

对 Mini Runtime 来说有点啰嗦。

可以有一个小的默认值，比如：

```text
5
```

或者：

```text
8
```

具体数字我们进入 Design Decision 时再定。

现在只需要确认：

> 不应该默认无限。

---

# 8. 达到 maxTurns 后怎么办？

这是这里最重要的第二个问题。

假设：

```text
maxTurns = 5
```

到了第 5 次模型调用，模型又返回：

```text
tool_calls
```

怎么办？

不能继续执行无限循环。

---

# 9. 能不能直接 throw？

例如：

```text
throw new Error("Max turns exceeded")
```

可以，但我不太推荐。

因为这不是 Runtime Bug。

Runtime 本身运行完全正常，只是：

> Agent 在规定步数内没有完成任务。

这更像一个正常的终止结果。

和 VII-B 的：

```text
length
unknown
→ unsupported
```

在性质上比较接近。

---

# 10. 那直接复用 `unsupported` 吗？

这是一个可选方案。

例如：

```text
{
  type: "unsupported",
  finishReason: ...
}
```

但这里有个麻烦。

当前 `unsupported` 的字段是：

```text
finishReason
```

它来自 ModelProvider。

而：

```text
maxTurns reached
```

并不是模型的 `finishReason`。

如果硬塞：

```text
finishReason: "max_turns"
```

就会污染：

```text
FinishReason
```

把 Runtime 自己的结束原因塞进 Model 的结束原因里。

这和 VII-B 已经建立的区分冲突：

```text
Model finishReason
≠
RunOutcome
```

fileciteturn0file0

所以不能偷懒这么做。

---

# 11. 这说明 RunOutcome 可能第一次需要扩展

VII-B 当前是：

```text
completed

unsupported
```

VII-C 出现了一个新的、真实的 Runtime 结束原因：

```text
max turns reached
```

这已经不是未来假设了。

所以 VII-C 很可能需要对 RunOutcome 做一次最小扩展。

例如语义上：

```text
completed
unsupported
limit_reached
```

名字可以再讨论。

重点是：

> **Runtime 自己的结束原因，要留在 RunOutcome 层，不要塞回 Model finishReason。**

这个属于合理的增量演进，不是推翻 VII-B。

---

# 12. 达到上限时，要不要执行本轮刚返回的 Tool？

这里需要明确顺序。

假设：

```text
maxTurns = 3
```

第 3 个 Model Turn 返回：

```text
tool_calls
```

这时候应该：

### 方案 A

执行 Tool，然后因为不能再问模型而结束。

这会留下：

```text
assistant tool_call
tool_result
```

但模型永远没有机会根据这个结果回答用户。

这有点奇怪。

---

### 方案 B

发现已经没有后续 Model Turn 预算，直接结束，不执行这一批 Tool。

我更倾向 B。

因为模型调用 Tool 的目的通常是：

> 拿到结果后继续推理。

如果我们已经确定：

```text
没有下一轮模型调用
```

那执行这个 Tool 往往没有意义。

尤其未来 Tool 可能有副作用。

虽然 Approval 在 VII-H 才做，但架构上也应该避免：

> “明知道不能继续完成任务，还执行一个可能有副作用的操作。”

---

# 13. 所以 maxTurns 的检查时机很重要

比较合理的逻辑应该类似：

```text
开始一个 Model Turn
↓
turn + 1
↓
调用模型
↓
得到结果

如果 stop
→ completed

如果 tool_calls
→ 先判断还有没有下一轮 Model Turn 的空间

有
→ 执行 Tool → continue

没有
→ limit_reached
```

这样可以避免：

```text
执行完 Tool
才发现没法继续
```

---

# 14. 但这里有个小细节

如果：

```text
maxTurns = 1
```

那么它意味着：

> 只允许模型调用一次。

所以如果第一次模型直接：

```text
stop
```

成功。

如果第一次模型：

```text
tool_calls
```

就不能继续。

这符合直觉。

---

# 15. maxTurns 能解决所有死循环吗？

不能。

它只是：

> 最后的硬保护。

例如模型可能：

```text
get_weather
get_weather
get_weather
```

Runtime 不需要现在做：

```text
检测重复工具调用
检测相同参数
检测循环模式
```

那些属于更高级的 Policy（策略）。

VII-C 第一版：

```text
maxTurns
```

够了。

不要继续扩展成：

```text
maxToolCalls
maxSameToolCalls
maxSameArguments
loop detection
cost budget
token budget
```

这些现在都没有必要。

---

# 16. 多 Tool Call 还有一个失败问题

假设模型一次返回：

```text
Tool A
Tool B
Tool C
```

执行：

```text
A → success
B → INVALID_ARGUMENTS
C → success
```

我们前面 C-4 已经决定：

> 可预期 Tool Failure 也只是 Tool Result。

所以不应该 B 一失败就停止整批。

第一版可以：

```text
A → 写 result
B → 写 error result
C → 写 result
```

然后全部交给下一轮模型。

这样模型看到完整结果后再判断。

---

# 17. 如果 Tool B 抛的是 Runtime Bug 呢？

那就不一样。

例如 Executor 自己崩了：

```text
TypeError
```

这不是：

```text
TOOL_EXECUTION_FAILED
```

而是 Runtime Bug。

这种情况下：

```text
run() reject
```

后面的 C 不再继续。

这符合我们 C-4 定下的错误边界。

---

# 18. C-6 我建议锁定的结论

到这里，我建议形成这些 Design Direction（设计方向）：

1. VII-C 引入真正 Tool Loop 后，必须有最大循环保护。

2. 第一版限制 **Model Turn（模型调用轮次）**，而不是 Tool Call 数量。

3. 多个 Tool Call 属于同一个 Model Turn。

4. `currentTurn` 是一次 `run()` 的局部变量，不进入 RuntimeState。

5. `maxTurns` 属于 Runtime 配置，不属于会话事实。

6. Runtime 应提供有限默认值，而不是默认无限循环。

7. 达到上限属于正常的 Runtime Termination（运行终止），不是 Provider Error，也不是 Runtime Bug。

8. 不应该把 `max_turns` 塞进 Model `FinishReason`。

9. 因此 VII-C 很可能需要最小扩展 `RunOutcome`，表达“运行达到限制”。

10. 如果当前 Model Turn 已是最后一轮并返回 `tool_calls`，第一版倾向**不再执行 Tool**，直接以达到限制结束。

11. 一批多个 Tool Call 顺序执行；其中一个正常 Tool Failure 不阻止后续 Tool Call。

---

# 到这里，Architecture Analysis 基本完整了

我们这几轮实际上已经把 VII-C 的关键问题全部走了一遍：

```text
C-1 Tool Contract
✓ ToolDefinition 与可执行 Tool 分离

C-2 Tool Registry
✓ 注册、查找、唯一名称、definitions

C-3 Arguments Contract
✓ unknown → Schema Validation → 可信参数

C-4 Tool Executor + Error Contract
✓ success / not found / invalid / execute failed

C-5 Agent Tool Loop
✓ 同一个 run 内 Model → Tool → Model

C-6 Loop Boundary
✓ multi-tool / 顺序执行 / maxTurns
```

下一步就不应该继续发散新的架构问题了。

我们应该进入你固定流程里的下一阶段：

> **Design Decision（设计决策）**

也就是把刚才讨论出来的候选方案正式收敛成：

```text
哪些确定采用
哪些明确不采用
哪些留到后续 Part
```

然后这份最终决策才会成为后面生成 Codex Implementation Task 的依据。

## 轮次 8 — fb187149-2013-4679-b410-1f9c85e7d0dd

### User

继续

### ChatGPT

好，进入 **Design Decision（设计决策）**。这一阶段不再继续发散方案，而是把 VII-C 前面讨论过的内容正式收敛，作为后面 Codex Implementation Task 的唯一设计依据。

我会尽量只保留“要实现什么、为什么这样定、明确不做什么”。

## 1. Tool Contract：正式采用什么

保留 VII-A 已有的 `ToolDefinition`，它继续只表示：

> 给模型看的工具说明书。

VII-C 新增一个“真正可执行的 Tool”，概念上是：

```text
Tool
=
ToolDefinition
+
execute
```

也就是说：

```text
ToolDefinition
负责告诉模型：
“这个工具叫什么、干什么、参数是什么”

Tool
负责告诉 Runtime：
“这是说明书，这是实际执行能力”
```

**不采用**直接往 `ToolDefinition` 里塞 `execute()` 的方案，避免把模型协议和执行代码混在一起。

这属于增量补充，不推翻 VII-A 已有类型边界。fileciteturn0file0

---

## 2. ToolRegistry：正式采用什么

第一版 Registry（工具注册表）只承担很小的职责：

```text
注册 Tool
根据 name 查 Tool
列出所有 ToolDefinition
```

内部可以理解成：

```text
Map<string, Tool>
```

但增加一个明确规则：

> **Tool Name 必须唯一。**

重复注册同名 Tool：

```text
直接报错
```

而不是后注册的静默覆盖前一个。

这样 Runtime 中“系统到底有哪些工具”只有一个来源：

```text
ToolRegistry
```

模型调用时：

```text
Registry
↓
提取 ToolDefinition[]
↓
ModelRequest.tools
```

执行时：

```text
toolCall.name
↓
Registry 查找
↓
拿到真正 Tool
```

不做：

```text
unregister
replace
version
hot reload
priority
namespace
```

这些都不属于 VII-C。总体规划也明确把 Hot Extension Reload 放在 v1 范围外。fileciteturn0file1

---

## 3. Arguments Contract：正式采用什么

现有：

```ts
ToolCall.arguments: unknown
```

**继续保留。**

原因很简单：

> 模型给出来的数据还没有经过业务 Tool 的参数校验，所以 Runtime 不应该提前相信它。

流程正式定为：

```text
模型参数
↓
unknown
↓
Schema Validation（参数结构校验）
↓
校验通过
↓
交给 Tool.execute()
```

因此我们明确区分：

```text
JSON 能解析
≠
Tool 参数合法
```

VII-A Provider Adapter（供应商适配层）负责前者；VII-C Tool 执行层负责后者。这正好回收 VII-B 留下的 B-P3。fileciteturn0file0

---

## 4. Schema：采用单一事实来源

Tool 的参数规则尽量只维护一份。

也就是说：

```text
同一份 Schema
├── 提供给模型，告诉它怎么调用
└── Runtime 执行前用来校验参数
```

不维护：

```text
一套“给模型看的参数规则”
+
一套“Runtime 自己校验的参数规则”
```

否则两套规则迟早可能不一致。

至于具体使用 AJV 还是其他 JSON Schema Validator（JSON 参数校验器），属于实现层选择，可以交给 Codex 按当前已有 `ToolDefinition.parameters` 类型做最小实现；核心设计已经确定：

> **不自己在每个 Tool.execute() 里重复手写参数校验。**

---

## 5. ToolExecutor：正式职责

ToolExecutor（工具执行器）负责：

```text
1. 根据 name 找 Tool
2. 校验 arguments
3. 校验通过后 execute
4. 把成功结果整理成统一结果
5. 把已知的 Tool Failure 整理成统一错误结果
```

所以它不是简单一句：

```ts
tool.execute()
```

而是 Tool 调用的确定性边界。

AgentRuntime 不需要知道：

```text
Registry 内部怎么查
Schema 怎么验证
Tool 异常怎么转换
```

它只负责：

```text
“模型要调用工具”
↓
交给 ToolExecutor
↓
拿回结果
↓
写入 RuntimeState
```

---

## 6. Error Contract：正式采用三类错误

这里正式锁定三类，不混在一起。

### A. Tool Invocation Failure（工具调用失败）

包括：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
```

这些属于：

> Tool Call 没有成功完成，但 Runtime 本身仍然正常。

因此：

```text
不直接结束 run
↓
转换成 Tool Result
↓
写入 RuntimeState
↓
继续交给模型
```

---

### B. Provider Error（模型调用错误）

例如：

```text
模型 API 请求失败
Provider 映射异常
```

继续沿用 VII-B：

```text
直接向上传播
```

VII-C 不修改。fileciteturn0file0

---

### C. Runtime Bug（Runtime 自身错误）

例如 Runtime 自己违反内部不变量、Executor 实现本身崩掉。

这种：

```text
继续 throw
```

不能 catch everything 后伪装成：

```text
TOOL_EXECUTION_FAILED
```

否则真正 Runtime Bug 会被隐藏。

---

## 7. Error Contract 最小结构

第一版不做复杂错误体系。

至少需要：

```text
code
message
```

例如：

```text
INVALID_ARGUMENTS
"city must be a string"
```

这样既方便：

```text
模型理解
测试断言
未来 UI / 日志识别
```

又不会过度设计。

原始异常的 stack、内部路径等，也不要求完整传给 LLM。

---

## 8. Tool Result：成功和失败都写入 State

继续沿用 VII-B 的原则：

> 已经发生的事实先记录，再决定下一步。

所以：

```text
Tool success
→ tool_result

Tool failure
→ tool_result
```

都进入：

```text
RuntimeState.messages
```

不扩展 RuntimeState 为：

```text
messages
errors
toolCalls
status
iteration
...
```

当前 `messages-only` 的 State 设计继续成立。fileciteturn0file0

---

# 9. Agent Loop：`tool_calls` 从结束改成继续

这是 VII-C 最重要的变化之一。

VII-B：

```text
stop
→ completed

tool_calls
→ unsupported
```

VII-C：

```text
stop
→ completed

tool_calls
→ 执行 Tool
→ 写 tool_result
→ 继续同一个 run
→ 再次调用模型
```

也就是说：

```text
run()
├── Model Turn #1
├── Tool Execution
├── Model Turn #2
├── ...
└── RunOutcome
```

明确：

> **不能让 caller 收到中间 RunOutcome 后再调用一次 `run()` 来继续。**

这样正式回收 VII-B 的 B-P1。fileciteturn0file0

---

## 10. user_input 只写一次

一次：

```ts
runtime.run("查东京天气")
```

只在 run 开始时：

```text
append user_input
```

后面的内部循环只追加：

```text
model_output
tool_result
model_output
tool_result
...
```

不能每次循环重新追加用户输入。

---

# 11. Multiple Tool Calls：第一版顺序执行

一个 ModelResponse 如果返回：

```text
ToolCall A
ToolCall B
ToolCall C
```

第一版：

```text
执行 A → 写结果
执行 B → 写结果
执行 C → 写结果

全部完成
↓
再进入下一 Model Turn
```

明确：

> **支持多个 Tool Call，但不做并行。**

如果其中 B 是正常 Tool Failure：

```text
A success
B INVALID_ARGUMENTS
C success
```

仍然继续执行 C。

因为 B 的失败已经被规范化成普通 Tool Result。

只有真正 Runtime Bug 才中断整次 run。

---

# 12. Loop Guard：正式采用 maxTurns

VII-C 出现真正循环以后，必须防止模型永远调用 Tool。

第一版限制：

> **Model Turn（模型调用轮次）**

而不是 Tool Call 数量。

例如：

```text
Turn #1
→ 3 个 Tool Call

Turn #2
→ stop
```

仍然只用了 2 Turn。

采用：

```text
maxTurns
```

作为 Runtime 配置。

当前：

```text
currentTurn
```

只是一次 `run()` 内的局部变量。

二者都**不进入 RuntimeState**。

这继续保持 VII-B：

> State 不是“所有会变化的数据”。fileciteturn0file0

---

## 13. maxTurns 的默认行为

第一版：

> **不允许无限循环。**

提供一个有限默认值。

具体默认数字不属于核心架构，我建议实现时取一个简单值，例如 `5`，没有必要在这个数字上做复杂设计。

未来如果真实使用发现太小，可以调整。

---

# 14. 达到 maxTurns 怎么结束

这里正式采用：

> **它属于 Runtime 自己的结束原因。**

不是 Provider Error，也不是 Runtime Bug。

同时不能写成：

```text
finishReason = max_turns
```

因为 `FinishReason` 表示 Model Turn 为什么结束，而 `maxTurns` 是 Runtime 自己决定为什么不再继续。

所以 VII-C 允许对现有 `RunOutcome` 做一次最小增量扩展。

语义上增加：

```text
limit_reached
```

具体名称实现时可保持简洁，但必须满足：

```text
Model FinishReason
和
Runtime RunOutcome
继续分离
```

这是 VII-B 已经建立的重要边界。fileciteturn0file0

---

# 15. 最后一轮返回 Tool Call 时，不执行 Tool

这个也正式锁定。

假设：

```text
maxTurns = 3
```

Turn #3 又返回：

```text
tool_calls
```

此时已经没有后续 Model Turn 可以读取工具结果。

因此：

```text
不再执行这一批 Tool
↓
以 limit_reached 结束
```

而不是：

```text
执行 Tool
↓
写结果
↓
然后发现没模型额度继续
```

尤其以后 Tool 可能有副作用，这个边界更稳妥。

---

# 16. VII-C 不修改的东西

这次也明确冻结 Scope。

VII-C 不实现：

```text
ContextBuilder / TurnSnapshot
Event / Subscriber
Streaming
Abort
Single Active Run
SessionStore
Conversation Recovery
Retry
Approval
beforeToolCall
Permission
Parallel Tool Execution
Durable Tool Execution
MCP
Hot Reload
复杂 Loop Detection
Token Budget
Cost Budget
```

对应后续 Milestone 的能力继续按照总体 A-I 规划推进。fileciteturn0file1

---

# 最终设计快照

所以 VII-C 最终链路可以压缩成：

```text
AgentRuntime.run(userInput)
        ↓
只追加一次 user_input
        ↓
     Model Turn
        ↓
保存 model_output
        ↓
   看 finishReason
     /          \
   stop       tool_calls
    ↓             ↓
completed     检查 maxTurns
                  ↓
              ToolExecutor
                  ↓
       Registry lookup
                  ↓
       Schema Validation
                  ↓
             execute
                  ↓
       success / Tool Failure
                  ↓
            tool_result
                  ↓
             写入 State
                  ↓
          下一 Model Turn
```

错误边界：

```text
Tool not found
Invalid arguments
Tool execution exception
        ↓
      Tool Result
        ↓
继续 Agent Loop


Provider Error
        ↓
      throw


Runtime Bug
        ↓
      throw
```

---

## 七个正式 Design Decisions

后面写 Milestone Note 时，可以把它们整理成类似：

```text
C-AD01
ToolDefinition 与 executable Tool 分离

C-AD02
ToolRegistry 是工具唯一注册与查找来源，同名禁止覆盖

C-AD03
ToolCall.arguments 保持 unknown，execute 前统一 Schema Validation

C-AD04
ToolExecutor 统一 lookup / validation / execution / Tool Failure normalization

C-AD05
Tool Failure 转成 tool_result，Provider Error 与 Runtime Bug 继续 throw

C-AD06
tool_calls 在同一 run 内继续 Model → Tool → Model；多个 Tool Call 顺序执行

C-AD07
Agent Loop 使用 maxTurns 限制 Model Turn；达到上限属于 Runtime RunOutcome
```

我认为到这里，**VII-C 的 Architecture Analysis + Design Decision 已经足够收敛了**。没有必要再继续加入新的架构设计。

下一步按照我们的固定流程，就可以进入：

**Codex Implementation**

也就是我根据这一轮已经确认的全部结论，生成正式的：

> **📋 Codex Implementation Task — Part VII-C**

并且像 VII-A / VII-B 一样明确写清 Milestone Goal、Current Repository State、Confirmed Design Decisions、Task Breakdown、Acceptance Criteria 和 Constraints。

## 轮次 9 — 6bf53afb-a151-4205-83f5-6578bb43a468

### User

继续

### ChatGPT

可以。下面这份就是基于我们刚刚已经收敛的 VII-C 架构结论，给 Codex 的正式实现任务。

你可以直接把整段发给 Codex。

:::writing{variant="document" id="48217" title="Codex Implementation Task — Part VII-C"}
# 📋 Codex Implementation Task — Part VII-C

我们正在实现：

**Part VII：Mini Agent Runtime Implementation**

当前已完成：

- Part VII-A：项目骨架 + 类型体系 + ModelProvider
- Part VII-B：RuntimeState + Agent Loop 基础

现在进入：

**Part VII-C：Tool Registry + Tool Executor + Error Contract**

本次实现必须严格基于当前仓库已有代码增量演进。

不要重新设计已经在 VII-A / VII-B 中确认并完成的架构；如果现有代码确实阻碍本 Milestone，可以做最小必要调整，但必须说明原因。

---

## 1. Milestone Goal

本 Milestone 的目标是让当前 Runtime 从：

```text
User
→ Model
→ tool_calls
→ unsupported
```

升级为：

```text
User
→ Model
→ Tool Call
→ Tool Registry
→ Tool Executor
→ Tool Result
→ RuntimeState
→ Model
→ Final Answer
```

完成后，`AgentRuntime.run()` 必须第一次真正支持：

```text
Model → Tool → Model
```

发生在同一个 run 内。

也就是说：

- 模型返回 `tool_calls` 时，不再直接返回 `unsupported`；
- Runtime 能找到对应 Tool；
- 校验 Tool arguments；
- 执行 Tool；
- 将成功或可预期失败写成 `tool_result`；
- 再次调用 Model；
- 直到最终 `stop` 或达到 Runtime 自己的终止边界。

本 Milestone 不要求实现 Weather Agent 完整业务场景，只需要证明 Tool Loop 机制真实成立。

---

## 2. Current Repository State

进入 VII-C 前，当前仓库已经具备：

### Model Contract

已有：

```text
RuntimeMessage
ModelMessage
ToolCall
ToolDefinition
ModelRequest
ModelResponse
FinishReason
ModelUsage
ModelProvider
```

以及：

```text
OpenAIModelProvider
Provider Adapter
```

当前 Provider 负责：

```text
模型协议
→ 内部 ModelResponse
```

其中 `ToolCall.arguments` 当前保持：

```ts
unknown
```

Provider 只保证模型返回的 Tool arguments 能完成 JSON 解析。

Provider 不负责具体 Tool Schema Validation。

不要改变这一职责边界。

---

### Runtime

当前已经存在：

```text
RuntimeState
AgentRuntime
RunOutcome
```

当前 RuntimeState 只保存：

```ts
messages: RuntimeMessage[]
```

这是已经确认的设计。

不要因为本 Milestone 出现 Tool、Error、iteration 等概念，就把以下内容加入 RuntimeState：

```text
status
iteration
maxTurns
errors
toolCalls
usage
finishReason
```

除非真实代码证明有不可避免的必要，否则保持 messages-only State。

---

### 当前 AgentRuntime 行为

当前一次 `run()`：

```text
append user_input
→ 构建 ModelRequest
→ provider.generate()
→ 保存 model_output
→ 根据 finishReason 返回 RunOutcome
```

当前：

```text
stop
→ completed

tool_calls
→ unsupported

length
→ unsupported

unknown
→ unsupported
```

Provider throw / rejection：

```text
原样向上传播
```

不要修改 Provider Error 的既有语义。

---

### 当前状态所有权

已确认：

```text
AgentRuntime owns RuntimeState
```

Loop 是 AgentRuntime 内部执行行为。

当前没有独立 `AgentLoop` class。

本 Milestone 不要为了出现真正循环，就默认创建新的 Loop class。

只有在实现过程中发现 `AgentRuntime.run()` 出现明确、真实、不可接受的职责膨胀时，才允许提出最小提取方案。

---

## 3. Confirmed Design Decisions

以下为本 Milestone 已经确认的设计结论。

Codex 不要重新做架构设计。

---

### C-AD01：ToolDefinition 与 executable Tool 分离

保留已有：

```text
ToolDefinition
```

它继续只表示：

> 给模型看的工具说明。

VII-C 新增真正可执行的 Tool Contract。

语义上：

```text
Tool
=
ToolDefinition
+
execute
```

不要直接往现有 `ToolDefinition` 中加入执行逻辑，使模型协议类型与 Runtime 执行代码混在一起。

---

### C-AD02：ToolRegistry 是唯一工具来源

新增 ToolRegistry。

第一版只负责：

```text
注册 Tool
根据 name 查找 Tool
列出所有 ToolDefinition
```

ToolRegistry 内 Tool Name 必须唯一。

如果重复注册：

```text
直接失败
```

不要静默覆盖。

不要实现：

```text
unregister
replace
version
priority
namespace
hot reload
plugin lifecycle
```

ModelRequest 中的 `tools` 必须来自同一个 ToolRegistry，而不是 caller 另外维护第二份 ToolDefinition 列表。

---

### C-AD03：ToolCall.arguments 保持 unknown

不要为了 VII-C 修改：

```ts
ToolCall.arguments: unknown
```

其语义是：

> 模型输出虽然已经能解析，但仍然是不可信输入。

参数进入 Tool.execute() 前必须经过 Schema Validation。

流程：

```text
unknown
→ validate
→ trusted args
→ execute
```

---

### C-AD04：Tool Schema 保持单一事实来源

Tool 参数 Schema 应尽量只有一份。

同一份参数规则用于：

```text
给 ModelProvider / LLM 描述 Tool
+
Runtime 执行前参数校验
```

不要建立两套独立规则：

```text
一套给模型
一套给 Runtime
```

从而避免二者不一致。

可以使用适合当前已有 ToolDefinition.parameters 结构的 JSON Schema Validator。

不要在每个 Tool.execute() 中重复手写通用参数校验。

---

### C-AD05：ToolExecutor 统一执行边界

新增 ToolExecutor。

ToolExecutor 负责：

```text
1. Tool lookup
2. arguments validation
3. execute
4. success normalization
5. expected Tool failure normalization
```

AgentRuntime 不应该知道：

```text
Registry 内部实现
Schema validator 内部细节
Tool execute 的错误转换细节
```

AgentRuntime 负责流程。

ToolExecutor 负责一次 Tool Call 的确定执行。

---

### C-AD06：Error Contract 分三类

#### A. Expected Tool Failure

包括：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
```

这些属于 Runtime 可以理解并处理的 Tool Invocation Failure。

它们：

```text
不直接 reject run
→ 转换成 Tool Result
→ 写入 RuntimeState
→ 继续交给模型
```

Error Contract 第一版保持最小。

至少应具备：

```text
code
message
```

不要建立复杂 Error framework。

---

#### B. Provider Error

继续保持 VII-B 已有行为：

```text
Provider throw / rejection
→ run reject
```

不要包装成 Tool Error。

---

#### C. Runtime Bug

Runtime 或 Executor 自身违反内部不变量、实现 bug 等：

```text
继续 throw
```

不要使用 catch-all 将所有异常伪装成：

```text
TOOL_EXECUTION_FAILED
```

只将明确属于 Tool.execute() 调用边界内的执行异常规范化为 Tool Failure。

---

### C-AD07：Tool Success 和 Tool Failure 都进入 RuntimeState

Tool 执行成功：

```text
→ tool_result
```

可预期 Tool Failure：

```text
→ tool_result
```

二者都属于已经发生的消息事实。

继续使用：

```text
RuntimeState.messages
```

不要新增独立 errors / observations / toolCalls State。

---

### C-AD08：tool_calls 成为 continue，而不是 return

VII-C 后：

```text
stop
→ completed

tool_calls
→ execute tools
→ append tool_result
→ continue same run

length
→ 保持当前 unsupported 语义

unknown
→ 保持当前 unsupported 语义
```

Tool Flow 必须发生在同一个：

```ts
AgentRuntime.run(userInput)
```

内部。

不能：

```text
run()
→ return 中间 Tool Outcome
→ caller 再次 run()
```

一次 run 中 user_input 只 append 一次。

内部循环只能继续追加：

```text
model_output
tool_result
model_output
...
```

---

### C-AD09：Multiple Tool Calls 第一版顺序执行

一个 ModelResponse 可能返回多个 ToolCall。

第一版必须全部处理。

例如：

```text
[A, B, C]
```

按顺序：

```text
execute A
append result A

execute B
append result B

execute C
append result C

全部完成
→ 下一次 Model Turn
```

不要只执行第一个。

不要实现并行执行。

如果某一个出现正常 Tool Failure：

```text
A success
B INVALID_ARGUMENTS
C success
```

应继续执行 C。

只有 Runtime Bug 才中断整次 run。

---

### C-AD10：Agent Loop 使用 maxTurns

VII-C 引入真正的 Tool Loop 后，必须避免无限 Model → Tool → Model。

第一版限制：

```text
Model Turn 数量
```

而不是 Tool Call 数量。

定义：

```text
一次 ModelProvider.generate()
=
一个 Model Turn
```

如果一次模型返回三个 ToolCall：

```text
仍然只算一个 Model Turn
```

`currentTurn`：

```text
是单次 run 的局部变量
```

不要进入 RuntimeState。

`maxTurns`：

```text
属于 Runtime configuration
```

不是会话事实。

Runtime 必须有有限默认值，不允许默认无限循环。

可以使用一个简单、小的默认值，例如：

```text
5
```

除非当前代码结构存在明确理由选择其他值。

---

### C-AD11：达到 maxTurns 属于 Runtime termination

`maxTurns` 达到后：

```text
不是 Provider Error
不是 Runtime Bug
```

它属于 Runtime 自己的正常终止结果。

不要将：

```text
max_turns
```

塞进 Model `FinishReason`。

Model FinishReason 和 Runtime RunOutcome 必须继续保持分离。

允许对当前 RunOutcome 做最小增量扩展，例如表达：

```text
limit_reached
```

具体字段名可以根据当前代码风格决定，但不要建立大型 lifecycle 类型体系。

---

### C-AD12：最后一个 Model Turn 返回 tool_calls 时不再执行 Tool

例如：

```text
maxTurns = 3
```

Turn #3 返回：

```text
tool_calls
```

因为已经没有后续 Model Turn 可以读取 Tool Result，所以：

```text
不要执行这一批 Tool
→ 直接返回 limit reached
```

避免执行一个结果已经没有机会被模型消费的 Tool。

---

## 4. Task Breakdown

请按当前代码结构做最小实现。

### Task 1：新增 executable Tool Contract

在合适的 core/runtime/tool 模块下新增 Tool 类型。

要求：

```text
包含 ToolDefinition
包含 execute
```

具体泛型设计应保持简单。

目标是让具体 Tool 可以拥有明确参数类型，同时 ToolExecutor 仍能安全处理来自模型的 `unknown` arguments。

不要建立复杂 Tool base class / inheritance tree。

---

### Task 2：新增 ToolRegistry

实现最小能力：

```text
register(tool)
get / lookup by name
listDefinitions()
```

要求：

- name 唯一；
- duplicate registration 显式失败；
- 保持注册顺序；
- ModelRequest.tools 来自 Registry definitions。

不要实现动态卸载、覆盖、热更新。

---

### Task 3：引入 Schema Validation

基于当前已有 `ToolDefinition.parameters` 结构完成 Runtime Tool arguments 校验。

要求：

```text
ToolCall.arguments
→ validate
→ execute
```

Invalid arguments：

```text
Tool.execute() 不允许被调用
```

Validator 应为公共执行层能力，不要要求每个 Tool 手写重复判断。

如果新增第三方依赖，保持最小，并说明为什么与当前 ToolDefinition Schema 匹配。

---

### Task 4：实现 Tool Error Contract

至少支持：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
```

每个错误至少具有：

```text
code
message
```

Error Contract 要足够稳定用于：

```text
RuntimeToolMessage
tests
未来 UI / logging
```

但不要扩展复杂 diagnostics。

---

### Task 5：实现 ToolExecutor

ToolExecutor 接收一次 ToolCall，并完成：

```text
lookup
validation
execution
normalization
```

Tool.execute() 成功：

```text
返回 success result
```

Tool 不存在 / 参数错误 / execute throw：

```text
返回 expected Tool Failure result
```

Runtime 内部异常：

```text
继续 throw
```

避免 catch-all。

---

### Task 6：将 Tool Result 转成 RuntimeToolMessage

根据当前已有 RuntimeMessage / RuntimeToolMessage 类型完成结果回流。

必须保留 Tool Call 与 Tool Result 的对应关系。

如果当前已有字段能够表达：

```text
toolCallId
name
result
```

优先复用现有结构。

不要为了本 Milestone重造整套消息模型。

成功与失败均写入 RuntimeState。

---

### Task 7：向 ModelRequest 注入 Tool Definitions

AgentRuntime 构造每个 ModelRequest 时：

```text
messages
+
registry definitions
```

Tool Definitions 必须来自 Registry。

如果没有 Tool：

```text
保持最小、合法请求
```

不要重复维护第二份 tools 配置。

---

### Task 8：升级 AgentRuntime Tool Loop

将当前：

```text
tool_calls
→ unsupported
```

升级为：

```text
tool_calls
→ execute all calls sequentially
→ append tool results
→ continue same run
```

要求：

- user_input 每次 run 只追加一次；
- 每次 ModelResponse 先保存；
- 每个 Tool Result 保存；
- 一批 Tool Call 全部处理完，再调用下一 Model Turn；
- Tool Failure 不自动结束 run；
- `stop` 最终返回 completed；
- `length / unknown` 保持当前已有 unsupported 语义。

---

### Task 9：加入 maxTurns

实现最小 Loop Guard。

要求：

```text
maxTurns 限制 ModelProvider.generate() 次数
```

不是 Tool Call 次数。

`currentTurn` 是 run 内局部控制变量。

不要放进 RuntimeState。

Runtime 创建时可以接受 maxTurns configuration，并提供有限默认值。

达到 maxTurns 时：

```text
返回 Runtime-level limit outcome
```

不要污染 Model FinishReason。

如果最后允许的 Model Turn 返回 tool_calls：

```text
保存该 model_output
不要执行 tools
返回 limit outcome
```

---

## 5. Acceptance Criteria

请新增/调整自动化测试，至少覆盖以下行为。

### A. Happy Path

```text
User
→ Model tool_call
→ Tool success
→ tool_result
→ Model final answer
→ completed
```

断言：

- 同一个 `run()` 内 ModelProvider 调用两次；
- user_input 只出现一次；
- Runtime history 顺序正确：

```text
user_input
model_output(tool_call)
tool_result
model_output(final)
```

- 第二次 ModelRequest 包含前面的 tool_result。

---

### B. Tool not found

模型调用不存在的 Tool。

断言：

```text
TOOL_NOT_FOUND
```

形成 Tool Result；

run 不因该错误直接 reject；

Tool Error 被写入 history；

Runtime 继续进入下一 Model Turn。

---

### C. Invalid arguments

模型 Tool arguments 不符合 Schema。

断言：

```text
INVALID_ARGUMENTS
```

Tool.execute() 没有被调用；

错误写入 tool_result；

Runtime 可以继续。

---

### D. Tool execution exception

Tool.execute() 抛出普通 Tool 执行异常。

断言：

```text
TOOL_EXECUTION_FAILED
```

被正常规范化；

原始异常不会直接使 run reject；

Tool Failure 写入 State；

下一 Model Turn 能看到该结果。

---

### E. Multiple Tool Calls

一个 ModelResponse 返回至少两个 ToolCall。

断言：

- 每个都被执行；
- 按原顺序执行；
- 每个结果按原顺序写回；
- 全部执行完成后只进入下一次 Model Turn。

---

### F. Mixed Tool Results

例如：

```text
A success
B invalid arguments
C success
```

断言：

```text
C 仍然执行
```

B 的 expected failure 不终止整批。

---

### G. Provider throw

继续验证 VII-B 行为：

```text
Provider throw
→ 原错误继续向上传播
```

不要转换成 Tool Error。

---

### H. maxTurns

构造模型持续返回 tool_calls 的场景。

断言：

- ModelProvider.generate() 不超过 maxTurns；
- 不发生无限循环；
- 返回 Runtime-level limit outcome；
- 最后一个允许 Turn 返回的 model_output 仍然被保存；
- 当已经没有下一 Model Turn 预算时，不执行这一轮返回的 Tools。

---

### I. Runtime State ownership

保持现有引用隔离测试继续通过。

不要因为新增 Tool Registry / Tool Result 破坏 VII-B 已有 State ownership。

---

### J. Existing tests

VII-A / VII-B 现有自动化测试必须继续通过。

若因为正式支持 `tool_calls` 而需要修改 VII-B 中原本断言 `unsupported(tool_calls)` 的测试：

必须修改其语义，使其反映 VII-C 新能力；

不要简单删除覆盖。

---

## 6. Runtime Verification

实现完成后执行：

```bash
npm test
npm run build
```

如果当前仓库已有额外 TypeScript test type-check 命令，也继续执行。

另外新增一个最小 Tool Runtime Demo。

建议使用简单、稳定、无外部网络依赖的 Tool，例如：

```text
add(a, b)
```

或类似确定性工具。

Demo 需要真实展示：

```text
User
→ 模型发起 Tool Call
→ Runtime 执行 Tool
→ 模型基于 Tool Result 返回 Final Answer
```

不要用 Demo 代替自动化测试。

不要在 VII-C 提前实现完整 Weather Agent；Weather Agent 属于 VII-I。

---

## 7. Constraints

严格禁止本 Milestone 顺手实现以下能力：

```text
ContextBuilder
TurnSnapshot
Token Budget
Compaction
AgentEvent
Subscriber
Streaming
Abort
Cancellation
Single Active Run
SessionStore
Conversation Recovery
Retry
Resume
beforeToolCall
Approval
Permission
Parallel Tool Execution
Tool Scheduler
Durable Tool Execution
MCP
Plugin System
Tool Hot Reload
Multi-Agent
Sub-Agent
Workflow Engine
复杂 Loop Detection
Cost Budget
```

不要建立：

```text
AgentLoop class
RunController
ToolManager mega-class
Error framework
Plugin framework
generic lifecycle framework
```

除非当前真实代码已经出现明确不可解决的问题，并在结果中解释为什么需要最小调整。

---

## 8. Implementation Principles

继续遵守整个 Part VII 的工程原则：

1. 只实现当前 Milestone 真正需要的能力。
2. 不为了未来可能扩展而提前抽象。
3. Runtime Core 不依赖供应商 SDK 类型。
4. 现有 VII-A / VII-B Design Decisions 默认保持不变。
5. State 只保存当前确实需要跨步骤保留的事实。
6. Model FinishReason 与 Runtime RunOutcome 保持分离。
7. Tool Failure 与 Provider Error、Runtime Bug 保持分离。
8. 测试必须证明行为，不以“测试通过 = 架构正确”为前提。
9. 优先简单、可读、可解释的实现，不追求框架化。

---

## 9. Expected Codex Output

实现完成后，请按以下结构汇报：

### 1. Implementation Summary

说明实际实现了哪些能力。

### 2. Files Changed

列出新增 / 修改文件以及各自职责。

### 3. Design Mapping

逐项说明实现如何对应：

```text
C-AD01 ～ C-AD12
```

如果任何一项没有完全照做，必须说明原因。

### 4. Tests Added / Updated

列出新增和调整测试，以及每个测试真正验证什么。

### 5. Verification Result

贴出：

```text
npm test
npm run build
```

以及其他实际执行的验证结果。

### 6. Demo Result

贴出最小 Tool Loop Demo 的真实终端输出。

明确区分：

```text
真实程序输出
和
人工总结
```

### 7. Scope Check

明确确认是否意外实现了 VII-D～VII-H 或 v1 范围外能力。

### 8. Open Questions / Deferred Issues

只记录实现过程中真实发现、但不属于 VII-C 的问题。

不要为了显得完整而主动扩展新的 Future Work。
:::

这份直接给 Codex 即可。它已经把这轮 Architecture Analysis → Design Decision 的结论固定下来，Codex 的任务是**实现和验证**，不是再次帮我们选架构。

等 Codex 第一轮实现完成后，你把它的 **实现总结 + 测试输出 + 最新 `src.zip`** 发回来，我们就进入固定流程的下一阶段：**Runtime Verification / Debug → Code Review + Theory Feedback**。

