# Day08 / Part VII-B 架构讨论与 Implementation Task 源记录

- 来源：[架构分析 RuntimeState Agent Loop](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a9787a5-90bc-83e8-949b-9c6ea0fb8c93)。
- 归档日期：2026-09-04。
- 获取方式：通过 Codex 应用会话读取接口分页读取到结束；架构与 Review 两份文件合计覆盖可读取的全部 12 轮用户/助手文本。
- 本文件保留讨论当时的候选方案、推断与结论，不将早期说法自动视作最终设计。当前代码事实以正式学习笔记及仓库源码为准。
- 原会话上传附件正文未由接口返回；附件标记及原始 filecite 引用仅作为历史记录保留，不能作为本地可解析的文件引用。本轮代码核对直接使用当前仓库。
- 除行尾空白规范化和引用排版外，以下正文按返回内容保留；并非附件归档。
- 正式笔记：[RuntimeState + Agent Loop](../day08-part-vii-b-runtime-state-agent-loop.md)。

## 会话轮次 1

原始 turn ID：`e47d6573-e733-4d8c-9a9e-cffbe0b44c04`。

### 用户

> # 继续下一个会话：
>
> 我们继续 **Part VII：Mini Agent Runtime Implementation**。
>
> 上一阶段 **Part VII-A** 已完成。
>
> 我已经提供(其中 README 是 day08 agent 实现的整体规划，part-vii-a 是 part a 实现后的Milestone Note，src.zip 是源代码的压缩包)：
>
> - Part VII 总体规划 / README；
> - Part VII-A 最终 Milestone Note；
> - 当前 Architecture Decisions（如果存在）。
>
>
> 现在进入：
>
> **Part VII-B：RuntimeState + Agent Loop**
>
> 请先阅读上一阶段已经形成的真实实现、架构边界和设计决策。
>
> 后续必须基于现有实现做增量演进，不要重新设计已经确认完成的部分；如果发现前一阶段存在明确架构问题，可以提出，但请说明为什么需要调整。
>
> 继续采用固定工程学习流程：
>
> **Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure**
>
> 现在先进入 **Architecture Analysis（架构分析）**。
>
> 请你先根据：
>
> - 当前已有代码和架构决策；
> - 本节标题与目标；
> - 后续 Part 的整体规划；
>
>
>
>
> 帮我识别本节真正需要解决的架构问题、实现边界、关键设计决策和完成标准，然后逐步带我讨论。
>
> 不要一开始直接实现代码，也不要提前实现后续 Part。
>
> [User attached 3 files; file contents were not included]

### ChatGPT

> 可以。我们现在正式进入 **Part VII-B：RuntimeState + Agent Loop** 的 **Architecture Analysis（架构分析）**。
>
> 先把这一 Part 的位置定准：VII-A 解决的是“Runtime 用什么语言和模型通信”；VII-B 第一次要解决的是“**谁拥有运行中的事实，以及谁驱动这些事实不断向前变化**”。VII-A 已经明确 Provider 只负责一次 Model Turn（模型轮次），不负责 Agent 生命周期；因此 VII-B 才是真正开始出现 Runtime Core（运行时核心）的地方。fileciteturn1file5
>
> ---
>
> # 一、VII-B 在整个 Part VII 中到底处于什么位置
>
> 当前总体规划已经把职责切得很清楚：
>
> ```text
> VII-A
> Model Contract / Provider
>         ↓
> VII-B
> RuntimeState / Agent Loop
>         ↓
> VII-C
> Tool Registry / Tool Executor
>         ↓
> VII-D
> ContextBuilder / TurnSnapshot
>         ↓
> VII-E+
> Event / Abort / Session / Approval
> ```
>
> README 对 VII-B 的要求也明确限定为：
>
> - RuntimeState（运行时状态）最小事实模型；
> - Model → Runtime → 下一轮最小循环；
> - ModelResponse 写回状态；
> - Runtime State 唯一所有者；
> - 循环推进；
> - Model Turn 与 Agent Run 的终止区别；
> - MockModelProvider（模拟模型提供者）与确定性测试。fileciteturn1file6
>
> 所以这一节**不是“小 Agent 全链路”**。
>
> 它真正建立的是：
>
> ```text
>           owns
> Agent Loop ─────────► RuntimeState
>     │                     │
>     │ read                │ append
>     ▼                     ▼
> ModelRequest          RuntimeMessage[]
>     │
>     ▼
> ModelProvider.generate()
>     │
>     ▼
> ModelResponse
>     │
>     └──────────────► RuntimeState
> ```
>
> 第一次形成：
>
> > **State（状态） + Transition（状态迁移） + Loop（循环驱动）**
>
> 这三个东西结合起来，才开始像 Runtime。
>
> ---
>
> # 二、VII-B 真正需要回答的 6 个架构问题
>
> 我认为这一 Part 不是单纯设计两个 TypeScript 文件，而是有 **6 个真正值得讨论的问题**。
>
> 其中前 4 个是核心，后 2 个是边界问题。
>
> ---
>
> ## 问题 1：RuntimeState 到底应该保存什么？
>
> 这是 VII-B 第一核心问题。
>
> VII-A 已经存在：
>
> ```text
> RuntimeMessage[]
> ```
>
> 其中事实语义是：
>
> ```text
> user_input
> model_output
> tool_result
> ```
>
> 并明确：
>
> ```text
> RuntimeMessage
>     ≠
> ModelMessage
> ```
>
> RuntimeMessage 是 Runtime 拥有的事实；ModelMessage 是某轮发给模型的视图。fileciteturn1file1
>
> 所以第一反应很容易写成：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 但很快就会出现诱惑：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   iteration: number;
>   status: "running" | "completed" | "failed";
>   finishReason?: FinishReason;
>   finalAnswer?: string;
>   currentToolCall?: ToolCall;
>   error?: Error;
>   usage?: ModelUsage;
>   ...
> }
> ```
>
> 这就是本节第一个必须抵抗的地方：
>
> > **Runtime 运行过程中出现过的数据，不等于都应该成为 RuntimeState。**
>
> 我们要重新使用之前一直在用的三问：
>
> ```text
> Who owns it?
> Who changes it?
> Is it a durable runtime fact?
> ```
>
> 尤其要区分：
>
> ```text
> RuntimeState
>     ≠
> AgentLoop 的局部控制变量
>     ≠
> Runtime 配置
>     ≠
> 某一次 Provider 调用结果
>     ≠
> 未来 Session 持久化模型
> ```
>
> ### 我目前倾向的最小方向
>
> VII-B 第一版的 RuntimeState 很可能应该非常小：
>
> ```text
> RuntimeState
> └── messages: RuntimeMessage[]
> ```
>
> 最多再讨论是否存在一个真正属于运行状态的字段。
>
> 而：
>
> ```text
> maxTurns
> provider
> 当前循环计数
> 临时 ModelResponse
> ```
>
> 原则上都不应该因为“Loop 用得到”就自动塞进去。
>
> 这一点我们后面要专门定。
>
> ---
>
> # 三、问题 2：谁能修改 RuntimeState？
>
> 这比 State 里有什么还重要。
>
> 例如最简单的写法：
>
> ```ts
> const state = {
>   messages: []
> };
>
> state.messages.push(...)
> ```
>
> 技术上完全能工作。
>
> 但 VII-B 的目标里特意写了一项：
>
> > 明确 Runtime State 的唯一所有者。fileciteturn1file6
>
> 说明这一 Part 实际是在验证：
>
> ```text
> Provider
>    ✗
>
> Context conversion
>    ✗
>
> 未来 Tool
>    ✗
>
> 调用 Agent 的业务代码
>    ✗
>
> Agent Runtime / RuntimeState owner
>    ✓
> ```
>
> 也就是说未来应该是类似：
>
> ```text
> ModelProvider
>       │
>       │ returns ModelResponse
>       ▼
> Agent Loop
>       │
>       │ interprets
>       ▼
> Runtime State
> ```
>
> 而不是：
>
> ```text
> ModelProvider ───────► state.messages.push(...)
> ```
>
> VII-A 已经通过 Provider **没有 messages / iteration / toolResults 等字段**验证过 State Ownership（状态所有权）。fileciteturn1file5
>
> VII-B 就要把这个“没有状态的 Provider”另一半补出来：
>
> > **既然 Provider 不拥有，那 Runtime 到底由谁拥有？**
>
> ---
>
> # 四、问题 3：Agent Loop 一轮到底是什么？
>
> 这是本节最关键的行为问题。
>
> 现在我们已经有：
>
> ```ts
> ModelProvider.generate(request)
> ```
>
> VII-A Demo 是：
>
> ```text
> 人工构造 messages
>         ↓
> 人工构造 ModelRequest
>         ↓
> provider.generate()
>         ↓
> 拿 ModelResponse
>         ↓
> console.log()
> ```
>
> VII-B 要把其中的“人工胶水”收进 Runtime：
>
> ```text
> RuntimeState
>       ↓
> Runtime 读取 messages
>       ↓
> toModelMessage()
>       ↓
> ModelRequest
>       ↓
> provider.generate()
>       ↓
> ModelResponse
>       ↓
> 转换为 RuntimeMessage
>       ↓
> append RuntimeState
> ```
>
> 这才是一轮真正的 Agent Loop（Agent 循环）。
>
> 所以一个非常重要的架构认知是：
>
> > **Agent Loop 不等于 `while(true)`。**
>
> `while` 只是实现形式。
>
> 真正的 Loop 是：
>
> ```text
> State
>   ↓
> derive input
>   ↓
> execute external capability
>   ↓
> observe result
>   ↓
> transition state
>   ↓
> decide next action
> ```
>
> 也就是我们之前理论里学过的：
>
> ```text
> State → Decision → Action → Observation → State
> ```
>
> VII-B 只是它的最小版：
>
> ```text
> RuntimeState
>       ↓
> Model Call
>       ↓
> ModelResponse
>       ↓
> RuntimeState
> ```
>
> Tool Action（工具动作）要到 VII-C 才出现。
>
> ---
>
> # 五、问题 4：ModelResponse 怎么“进入” RuntimeState？
>
> 这个问题看起来很简单：
>
> ```ts
> state.messages.push(response.message)
> ```
>
> 但现在类型其实不能直接这么做。
>
> VII-A 已明确：
>
> ```text
> ModelResponse.message
>     =
> AssistantMessage
>     =
> ModelMessage 层
> ```
>
> 而 RuntimeState 应该保存：
>
> ```text
> RuntimeMessage
> ```
>
> 两者不是同一个所有权层。fileciteturn1file1
>
> 因此 VII-B 第一次会碰到一个非常值得学习的问题：
>
> ```text
> ModelResponse
>       │
>       ▼
> ???
>       │
>       ▼
> RuntimeAssistantMessage
>       │
>       ▼
> RuntimeState
> ```
>
> 也就是说 VII-A 已经有：
>
> ```text
> RuntimeMessage
>       ↓
> toModelMessage()
>       ↓
> ModelMessage
> ```
>
> VII-B 很可能需要形成另一边：
>
> ```text
> AssistantMessage
>       ↓
> Runtime model_output fact
>       ↓
> RuntimeMessage
> ```
>
> 但这里要特别小心：
>
> > 不要因此设计一个庞大的双向 Mapper 系统。
>
> 当前只需要把一次模型输出固化为 Runtime 事实即可。
>
> 这也是 VII-B 很值得讨论的一个点：
>
> ### ModelResponse 是“事实”吗？
>
> 不是。
>
> `ModelResponse` 是一次 Provider 调用的返回包装：
>
> ```text
> message
> finishReason
> usage
> ```
>
> 真正应该进入 Conversation/Runtime history 的，很可能只有：
>
> ```text
> message
> ```
>
> 而：
>
> ```text
> finishReason
> usage
> ```
>
> 是否应该成为 RuntimeState 的持久事实，是另一个问题。
>
> 不能简单整个：
>
> ```ts
> state.responses.push(modelResponse)
> ```
>
> 否则 Runtime State 会开始被 Model 调用协议塑形。
>
> ---
>
> # 六、问题 5：Agent Loop 到底什么时候继续、什么时候停止？
>
> 这会是 VII-B 最有意思的一个问题。
>
> VII-A 已经非常明确：
>
> ```text
> FinishReason
>     =
> Model Turn 为什么结束
>
> ≠
>
> Agent Run 为什么结束
> ```
>
> Provider 不能看到：
>
> ```ts
> finishReason === "stop"
> ```
>
> 就直接决定整个 Agent 生命周期。fileciteturn1file3
>
> 现在 VII-B 第一次需要有人解释它。
>
> 目前已有：
>
> ```text
> stop
> tool_calls
> length
> unknown
> ```
>
> 但 VII-C 的 Tool Executor 还不存在。
>
> 于是出现一个非常关键的问题：
>
> ### 假如模型返回 `tool_calls`，VII-B 怎么办？
>
> 不能：
>
> ```text
> 收到 tool_calls
> ↓
> 执行 Tool
> ```
>
> 因为这是 VII-C。
>
> 也不能：
>
> ```text
> 收到 tool_calls
> ↓
> 假装完成
> ```
>
> 因为语义错误。
>
> 更不能提前加：
>
> ```text
> ToolRegistry
> ToolExecutor
> ToolError
> ```
>
> 因为 Scope 越界。
>
> 所以 VII-B 很可能必须第一次明确：
>
> > **“Agent Run 停止”不一定等于“Agent Task 成功完成”。**
>
> 例如当前能力边界可能是：
>
> ```text
> stop
> → Runtime 可以结束当前 Run
>
> tool_calls
> → Runtime 已经走到当前能力边界
> → 本 Part 不执行 Tool
>
> length
> → 需要明确第一版策略
>
> unknown
> → 需要明确第一版策略
> ```
>
> 这里我暂时**不替我们直接定最终方案**。
>
> 因为这是 VII-B 最值得我们讨论的 Design Decision（设计决策）之一。
>
> ---
>
> # 七、这里有一个非常值得警惕的“假 Loop”问题
>
> README 要求：
>
> > Model → Runtime → 下一轮的最小循环。fileciteturn1file6
>
> 但我们不能为了证明有个 `while`，写出这种代码：
>
> ```ts
> while (true) {
>   const response = await provider.generate(...);
>   state.messages.push(...);
>
>   if (response.finishReason === "stop") {
>     break;
>   }
> }
> ```
>
> 然后：
>
> ```text
> tool_calls → 继续调用模型
> ```
>
> 这是错的。
>
> 因为模型既然请求了 Tool：
>
> ```text
> assistant:
>   tool_call(weather)
> ```
>
> 下一轮正常 Context 应该包含：
>
> ```text
> assistant tool_call
> tool result
> ```
>
> 而 VII-B 根本还没有 Tool Executor。
>
> 如果直接把：
>
> ```text
> assistant tool_call
> ```
>
> 重新喂给模型：
>
> ```text
> assistant tool_call
> assistant ?
> ```
>
> 其实是在构造一个不完整甚至非法的 Agent 轨迹。
>
> 所以：
>
> > **不能为了实现 Agent Loop，而提前伪造 Tool Loop。**
>
> 这个边界我认为应该成为 VII-B 的重点 Review 项。
>
> ---
>
> # 八、问题 6：MockModelProvider 应该是什么，而不应该是什么？
>
> VII-A 明确把 MockModelProvider 延期到了 VII-B。fileciteturn1file7
>
> 它现在出现的理由很明确：
>
> 真实 Provider：
>
> ```text
> 有网络
> 有余额
> 有随机性
> 响应无法完全预测
> ```
>
> 而我们要测试：
>
> ```text
> 第一次模型输出什么
> ↓
> Runtime 如何写 State
> ↓
> 是否继续
> ↓
> 第二轮收到什么 Context
> ↓
> 什么时候退出
> ```
>
> 所以必须确定性。
>
> 但这里也容易过度设计成：
>
> ```text
> MockProvider
> - rules
> - regex matching
> - conversation simulator
> - fake tool calling
> - programmable scenarios
> - provider factory
> ```
>
> 这些都没必要。
>
> VII-B 的 Mock 最合理的角色应该接近：
>
> ```text
> 一个预先排好 ModelResponse 队列的 Test Double（测试替身）
>
> generate #1 → response A
> generate #2 → response B
> generate #3 → response C
> ```
>
> 这样它测试的是 Runtime，而不是重新实现一个假 LLM。
>
> ---
>
> # 九、VII-B 与后续 Part 的边界必须守住
>
> 这个特别重要。
>
> ## VII-B 可以做
>
> ```text
> src/runtime/
>   RuntimeState
>   Agent Loop
>
> ModelResponse → RuntimeMessage
>
> MockModelProvider
>
> Agent Loop deterministic tests
> ```
>
> 并让：
>
> ```text
> RuntimeState
>   ↓
> ModelRequest
>   ↓
> Provider
>   ↓
> ModelResponse
>   ↓
> RuntimeState
> ```
>
> 真实跑起来。
>
> ---
>
> ## VII-B 不应该做
>
> ### 不做 VII-C
>
> ```text
> ToolRegistry
> ToolExecutor
> Schema Validation
> Tool Error Contract
> 真正 Tool Result
> ```
>
> VII-A 已明确，`ToolCall.arguments` 当前只保证 JSON 可解析；Schema Validation 属于 VII-C。fileciteturn1file2
>
> ### 不做 VII-D
>
> ```text
> ContextBuilder
> Token Budget
> Compaction
> Memory 注入
> TurnSnapshot
> ```
>
> 当前仍然可以：
>
> ```ts
> state.messages.map(toModelMessage)
> ```
>
> 因为 VII-D 才负责正式把 State → Context 抽象出来。README 甚至明确要求 VII-D 才实现 Runtime State 与 LLM Context 解耦以及 TurnSnapshot。fileciteturn1file4
>
> 这一点非常重要：
>
> > VII-B 可以使用当前薄转换，但不要因为 Loop 需要构造 Context，就顺手造一个 ContextBuilder。
>
> ### 不做 VII-E
>
> ```text
> AgentEvent
> Subscriber
> Streaming
> ```
>
> ### 不做 VII-F
>
> ```text
> AbortSignal
> Single Active Run
> 并发锁
> ```
>
> ### 不做 VII-G
>
> ```text
> Session
> Persistence
> Recovery
> ```
>
> 所以 VII-B 的 RuntimeState 也不要因为“以后要持久化”就提前设计：
>
> ```text
> sessionId
> createdAt
> updatedAt
> version
> checkpoint
> ```
>
> ---
>
> # 十、我建议 VII-B 的架构分析收敛成 5 个 Design Decisions
>
> 接下来我们不应该一口气写 Implementation Task。
>
> 我建议逐个讨论这 **5 个决策**：
>
> ```text
> Decision 1
> RuntimeState 第一版究竟包含哪些事实？
>
> Decision 2
> RuntimeState 谁拥有，修改入口是什么？
>
> Decision 3
> 一轮 Agent Loop 的精确状态迁移是什么？
>
> Decision 4
> stop / tool_calls / length / unknown
> 在 VII-B 分别意味着什么？
>
> Decision 5
> Agent Loop 的 Public Contract 应该是什么？
> 以及 MockModelProvider 最小做到什么程度？
> ```
>
> 其中 **Decision 1 和 Decision 4 最重要**。
>
> 因为它们一个决定：
>
> > Runtime 到底是什么状态机器。
>
> 另一个决定：
>
> > Runtime 到底凭什么继续/停止。
>
> ---
>
> # 十一、VII-B 完成标准，我先给一个架构级版本
>
> 现在还不是 Codex Task，只定义什么叫“这一 Part 真正学完/做完”。
>
> 我认为至少要满足：
>
> ### 1. Runtime 真正拥有 State
>
> 不能再由 Demo 人工维护：
>
> ```text
> RuntimeMessage[]
> ```
>
> 而应该出现明确的 RuntimeState（运行时状态）所有权。
>
> ### 2. User Input 能进入 State
>
> 例如：
>
> ```text
> []
> ↓
> user_input("hello")
> ↓
> RuntimeState.messages
> ```
>
> ### 3. Runtime 能从当前 State 构造模型调用
>
> 当前阶段允许继续使用：
>
> ```text
> RuntimeMessage[]
>   ↓
> toModelMessage()
>   ↓
> ModelRequest
> ```
>
> 不提前引入 ContextBuilder。
>
> ### 4. ModelResponse 能被正确固化为 Runtime Fact
>
> ```text
> ModelResponse.message
>         ↓
> Runtime model_output
>         ↓
> RuntimeState
> ```
>
> 而不是把 Provider response 原样存进去。
>
> ### 5. Loop 有明确生命周期语义
>
> 能够回答：
>
> ```text
> 为什么继续？
> 为什么退出？
> 是谁决定？
> ```
>
> 而不是单纯存在一个 `while(true)`。
>
> ### 6. Model Turn 与 Agent Run 被代码真正区分
>
> 不只是在笔记里知道它们不同。
>
> ### 7. MockModelProvider 能确定性验证至少一次状态推进
>
> 最好能够验证：
>
> ```text
> Provider 实际收到了哪些 messages
> Runtime 最终保存了哪些 messages
> 调用发生了几轮
> 为什么最终退出
> ```
>
> ### 8. 没有提前实现 C～H
>
> 尤其 Review 时要专门查：
>
> ```text
> Tool Executor?       不该有
> ContextBuilder?      不该有
> Events?              不该有
> Abort?               不该有
> SessionStore?        不该有
> Approval?            不该有
> ```
>
> 这符合 Day08 的总原则：每个 Part 只实现当前 Milestone 真正需要的能力，不为了以后可能需要而提前建立复杂抽象。fileciteturn1file0
>
> ---
>
> # 十二、先进入第一个真正的讨论：RuntimeState 应该是什么？
>
> 我建议我们现在从这里开始，而不是马上讨论 `AgentLoop` 类长什么样。
>
> 先看三个候选：
>
> ### A. 极简 State
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> ### B. 带 Runtime 生命周期 State
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   status: "idle" | "running" | "completed";
>   iteration: number;
> }
> ```
>
> ### C. 大而全 State
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   status: ...;
>   iteration: number;
>   finishReason?: FinishReason;
>   usage?: ModelUsage;
>   finalAnswer?: string;
>   error?: Error;
>   ...
> }
> ```
>
> **我目前更倾向 A，而不是 B/C。**
>
> 原因不是为了“代码少”，而是：
>
> ```text
> messages
> =
> Agent 到目前为止真正发生过的运行事实
>
> iteration
> =
> Loop 当前执行算法的控制变量
>
> maxTurns
> =
> Runtime 配置 / Policy
>
> finishReason
> =
> 某一个 Model Turn 的结果
>
> finalAnswer
> =
> 可以从最终 model_output 得到，不一定需要复制状态
>
> status
> =
> 目前还没有 Abort / Suspend / Session lifecycle 需求
> ```
>
> 所以如果现在把这些全部装进 RuntimeState，本质上是在：
>
> > **把“Loop 为了执行所需要知道的东西”误认为“Runtime 应该长期拥有的事实”。**
>
> 这正好对应我们之前学习中的一个经典区别：
>
> ```text
> State ≠ Local Control State
> ```
>
> 而且到了 VII-D，README 已经明确要求**禁止直接把完整 RuntimeState 喂给模型**。fileciteturn1file4
>
> 这其实反过来说明：
>
> > RuntimeState 未来一定可能越来越丰富，所以现在更应该严格判断什么才有资格进入它。
>
> ---
>
> 因此我建议 **Architecture Analysis 的第一轮先锁定这一题**：
>
> > **VII-B 的 `RuntimeState` 是否先只拥有 `RuntimeMessage[]`，而把 `iteration / maxTurns / finishReason / status / usage` 留在 Loop、配置或返回值中？**
>
> 我的当前判断是：**是，这会是最干净的第一版。**
>
> 下一步我们可以直接沿着这个结论继续拆：**为什么 `iteration` 看起来明明是“运行状态”，却反而不应该进入 `RuntimeState`；以及 RuntimeState 应该是一个纯 interface/object，还是一个封装 `append()` 的状态对象。** 这两个问题会把 State Ownership（状态所有权）真正讲透。

## 会话轮次 2

原始 turn ID：`807cf1f6-dee7-4fed-ac13-5ef85956f1a8`。

### 用户

> 继续

### ChatGPT

> 好，我们继续围绕 **Decision 1：RuntimeState 第一版应该是什么** 往下拆。
>
> 上一轮我们的暂定方向是：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 现在真正需要讨论的是两个问题：
>
> 1. 为什么 `iteration` 这种“运行中的状态”反而不应该进入 RuntimeState；
> 2. RuntimeState 应该只是一个纯数据对象，还是一个带 `append()` 的状态容器。
>
> ---
>
> # 1. 为什么 `iteration` 看起来像状态，却不一定属于 RuntimeState
>
> 乍一看：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   iteration: number;
> }
> ```
>
> 非常合理。
>
> 因为 Agent Loop 确实会经历：
>
> ```text
> iteration 1
> iteration 2
> iteration 3
> ...
> ```
>
> 但我们要问的不是：
>
> > “这个值会不会变化？”
>
> 而是：
>
> > **“这个值描述的是 Agent 已经发生的事实，还是当前 Loop 算法自己的执行位置？”**
>
> 这是两回事。
>
> ---
>
> ## 举个最简单的例子
>
> 假设当前：
>
> ```text
> messages:
>
> 1. user: hello
> 2. assistant: hi
> ```
>
> 然后 Runtime 准备再次执行。
>
> 此时：
>
> ```text
> iteration = 1
> ```
>
> 还是：
>
> ```text
> iteration = 2
> ```
>
> 其实取决于你怎么定义“iteration”。
>
> 可能有人定义：
>
> ```text
> 一次 provider.generate() = 一次 iteration
> ```
>
> 也有人定义：
>
> ```text
> 一轮 user → assistant = 一个 turn
> ```
>
> 未来 Tool 出现以后甚至可能变成：
>
> ```text
> LLM
> ↓
> Tool
> ↓
> LLM
> ↓
> Tool
> ↓
> LLM
> ```
>
> 那么到底：
>
> ```text
> iteration = 5
> ```
>
> 还是：
>
> ```text
> turn = 1
> ```
>
> ？
>
> 这说明：
>
> > `iteration` 很大程度上是 Loop 算法的计数方式，而不是 Conversation 本身的事实。
>
> ---
>
> # 2. 一个很好用的判断方法：Runtime 重启后，你是否必须恢复它？
>
> 我们未来 VII-G 会实现 SessionStore（会话存储）。
>
> 假设当前状态保存了：
>
> ```text
> user: 北京天气怎么样？
> assistant: tool_call(getWeather)
> tool: 25°C
> assistant: 今天北京约 25°C。
> ```
>
> Runtime 重启。
>
> 为了继续对话，我们必须恢复：
>
> ```text
> messages
> ```
>
> 因为这是 Conversation（会话）真正发生过的事实。
>
> 但是否需要恢复：
>
> ```text
> iteration = 4
> ```
>
> ？
>
> 通常并不需要。
>
> 新的 Run 完全可以：
>
> ```text
> localIteration = 0
> ```
>
> 重新开始。
>
> 所以可以用一个非常实用的问题判断：
>
> > **如果 Runtime 被销毁后重新构造，这个字段必须恢复吗？**
>
> 对于：
>
> ```text
> messages
> ```
>
> 答案明显是：
>
> > 是。
>
> 对于：
>
> ```text
> iteration
> ```
>
> 大多数情况下：
>
> > 否。
>
> 因此两者所有权并不一样。
>
> ---
>
> # 3. `maxTurns` 就更明显不属于 State
>
> 比如以后：
>
> ```ts
> run({
>   maxTurns: 10
> })
> ```
>
> 这是：
>
> ```text
> Policy / Configuration
> 策略 / 配置
> ```
>
> 不是 Runtime Fact（运行事实）。
>
> 如果塞成：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   maxTurns: number;
> }
> ```
>
> 就会把：
>
> ```text
> 事实
> +
> 执行策略
> ```
>
> 混在一起。
>
> 我们之前学 Agent Runtime 时其实一直在强调这个问题：
>
> ```text
> State
> ≠
> Policy
> ```
>
> 在 Pi Agent 源码里你也已经看到类似设计：
>
> 很多策略并不一定属于 Agent Core State，而可以通过函数、options 或上层业务进行注入。
>
> VII-B 正好第一次让这个理论落到自己的代码上。
>
> ---
>
> # 4. `finishReason` 为什么也不应该直接塞进去
>
> 这个更值得注意。
>
> VII-A 当前的：
>
> ```ts
> interface ModelResponse {
>   message: AssistantMessage;
>   finishReason: FinishReason;
> }
> ```
>
> 假如这样写：
>
> ```ts
> state.finishReason = response.finishReason;
> ```
>
> 那么 RuntimeState 中这个字段到底表达什么？
>
> 比如发生：
>
> ```text
> 第 1 次 model call
> finishReason = tool_calls
>
> 第 2 次 model call
> finishReason = stop
> ```
>
> 最后 State：
>
> ```text
> finishReason = stop
> ```
>
> 第一轮：
>
> ```text
> tool_calls
> ```
>
> 已经丢掉。
>
> 所以它其实只是：
>
> > “最近一次 Model Call 的 finishReason”。
>
> 那么字段名理论上就应该是：
>
> ```ts
> lastModelFinishReason
> ```
>
> 但我们马上又会问：
>
> > Runtime 真的需要永久保存这个吗？
>
> 目前 VII-B 没有需求。
>
> Agent Loop 可以：
>
> ```ts
> const response = await provider.generate(request);
>
> switch (response.finishReason) {
>   ...
> }
> ```
>
> 使用完以后就结束。
>
> 因此：
>
> ```text
> ModelResponse
> ```
>
> 更像：
>
> > 一次 State Transition（状态迁移）期间使用的临时 Observation（观察结果）。
>
> 而不是 State 本身。
>
> ---
>
> # 5. Usage 也属于同样的问题
>
> 比如：
>
> ```ts
> usage: {
>   inputTokens: 100,
>   outputTokens: 20,
>   totalTokens: 120
> }
> ```
>
> 未来很可能我们真的想统计：
>
> ```text
> 整个 Agent Run 消耗多少 token
> ```
>
> 但 VII-B 还没有任何：
>
> ```text
> Usage Accounting
> Budget
> Metrics
> Event
> ```
>
> 需求。
>
> 如果现在因为字段已经存在就写：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
>   totalUsage: ModelUsage;
> }
> ```
>
> 实际上就是典型的：
>
> > **Data availability driven design（因为数据有，所以就存）**
>
> 而不是：
>
> > **Requirement driven design（因为 Runtime 真需要，所以才拥有）**
>
> 这正是我们这次工程训练要避免的。
>
> ---
>
> # 6. 那 `status` 呢？
>
> 这个最容易产生争议。
>
> 例如：
>
> ```ts
> type RuntimeStatus =
>   | "idle"
>   | "running"
>   | "completed"
>   | "failed";
> ```
>
> 看起来很 Runtime。
>
> 但是我们现在后续规划里已经明确：
>
> - VII-F 才处理 Abort（取消）；
> - VII-G 才处理 Session；
> - VII-H 才出现 Approval / suspend 类行为。fileciteturn0file1
>
> 现在 VII-B 的执行模型还非常简单：
>
> ```text
> 调用 run()
> ↓
> 同步地 await 整个 Agent Run
> ↓
> return
> ```
>
> 如果没有：
>
> ```text
> 外部查询状态
> 并发执行
> 暂停
> 恢复
> 取消
> Session persistence
> ```
>
> 那么：
>
> ```ts
> state.status = "running"
> ```
>
> 其实没人消费。
>
> 这就变成了：
>
> ```text
> 为了看起来像 Runtime
> 而定义 RuntimeStatus
> ```
>
> 属于我们明确要避免的 Overdesign（过度设计）。
>
> 所以目前我也倾向：
>
> ```text
> VII-B 不加 status
> ```
>
> 后面 VII-F 出现：
>
> ```text
> Single Active Run
> Abort
> ```
>
> 以后，status 是否需要进入 State，再由真实需求驱动。
>
> ---
>
> # 7. 因此 RuntimeState 的第一原则可以正式提炼出来
>
> 我建议把 VII-B 的第一条 Design Decision（设计决策）逐渐收敛为：
>
> > **RuntimeState 第一版只保存跨 Model Turn 延续、并且代表 Agent 已发生事实的数据；Loop 控制变量、执行策略和单次 Model Call 的临时结果不进入 RuntimeState。**
>
> 所以：
>
> | 数据 | VII-B RuntimeState？ | 原因 |
> |---|---:|---|
> | `messages` | ✅ | 跨轮次延续的 Runtime Fact |
> | `iteration` | ❌ | Loop 局部控制变量 |
> | `maxTurns` | ❌ | Policy / Config |
> | `finishReason` | ❌ | 单次 Model Turn 结果 |
> | `usage` | ❌ | 当前无累计/预算需求 |
> | `status` | ❌ | 当前无并发/暂停/恢复需求 |
> | `provider` | ❌ | Dependency，不是 State |
> | `error` | ❌ | VII-B 尚未建立 Runtime Error Model |
>
> 这样第一版：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 反而是一个**有架构理由的极简设计**，而不是“先随便写少一点”。
>
> ---
>
> # 8. 接下来第二个问题：RuntimeState 是 interface，还是 class？
>
> 现在出现两个方案。
>
> ## 方案 A：纯数据对象
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> Loop 直接：
>
> ```ts
> state.messages.push(message);
> ```
>
> 优点非常明显：
>
> ```text
> 简单
> 无隐藏行为
> 测试容易
> State 就是 Data
> ```
>
> ---
>
> ## 方案 B：State 封装修改入口
>
> 例如：
>
> ```ts
> class RuntimeState {
>   private messages: RuntimeMessage[] = [];
>
>   append(message: RuntimeMessage) {
>     this.messages.push(message);
>   }
>
>   getMessages() {
>     return this.messages;
>   }
> }
> ```
>
> 它看起来更符合：
>
> > Runtime State 唯一所有者。
>
> 因为可以禁止别人直接改数组。
>
> 但它也马上带来问题：
>
> ```text
> 是否要 immutable？
> 是否返回 readonly？
> 是否 clone？
> 是否 addUserMessage()？
> 是否 addModelMessage()？
> 是否 clear()？
> 是否 snapshot()？
> ```
>
> 很容易开始设计一个 State Manager。
>
> 而 VII-B 并没有这些需求。
>
> ---
>
> # 9. “唯一所有者”其实不等于“必须用 class 封装”
>
> 这是这里最重要的一点。
>
> 假设我们写：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 然后只有：
>
> ```ts
> AgentRuntime
> ```
>
> 内部持有：
>
> ```ts
> private readonly state: RuntimeState;
> ```
>
> 只有 Runtime 自己做：
>
> ```ts
> this.state.messages.push(...)
> ```
>
> 外部完全拿不到可变引用。
>
> 那么：
>
> > State Ownership（状态所有权）已经成立。
>
> 并不需要：
>
> ```ts
> RuntimeState.append()
> ```
>
> 才能证明所有权。
>
> 所有权主要是：
>
> ```text
> 谁持有 reference
> 谁有修改路径
> 谁负责 transition
> ```
>
> 不是：
>
> ```text
> 有没有 class
> ```
>
> 这个其实就是很典型的软件工程问题。
>
> ---
>
> # 10. 我更倾向一个“纯 State + Runtime owner”的结构
>
> 概念上类似：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
>
> class AgentRuntime {
>   private readonly state: RuntimeState;
>
>   constructor(...) {
>     this.state = {
>       messages: [],
>     };
>   }
> }
> ```
>
> 然后：
>
> ```text
> AgentRuntime
>     │
>     ├── owns RuntimeState
>     │
>     ├── calls ModelProvider
>     │
>     └── applies state transition
> ```
>
> RuntimeState 本身：
>
> > **只描述数据形状，不描述行为。**
>
> 这样我们会得到一个非常干净的职责划分：
>
> ```text
> RuntimeState
> =
> What is true now?
> 现在有哪些事实？
>
> Agent Loop
> =
> How does state move forward?
> 这些事实如何向前推进？
> ```
>
> 这是我认为 VII-B 最值得建立的设计直觉之一。
>
> ---
>
> # 11. 但是这里马上会引出一个新问题：到底是 `AgentRuntime` 还是 `AgentLoop` 拥有 State？
>
> 假设有：
>
> ```ts
> runAgentLoop(...)
> ```
>
> 写成函数：
>
> ```ts
> async function runAgentLoop(
>   state: RuntimeState,
>   provider: ModelProvider
> ) {}
> ```
>
> 那到底谁是 State Owner（状态所有者）？
>
> 看上去调用者创建：
>
> ```ts
> const state = { messages: [] };
>
> await runAgentLoop(state, provider);
> ```
>
> 那么严格来说：
>
> ```text
> 调用者
> ```
>
> 才是拥有 state reference 的人。
>
> Loop 只是借来修改。
>
> 另一种是：
>
> ```ts
> class AgentRuntime {
>   private state: RuntimeState;
>
>   async run(input: string) {
>     ...
>   }
> }
> ```
>
> State Ownership 就很明确：
>
> ```text
> AgentRuntime owns state
> AgentLoop is behavior inside Runtime
> ```
>
> 这其实已经进入我们的：
>
> # Decision 2：RuntimeState 谁拥有？
>
> 而我认为这里要非常小心不要把两个概念混成：
>
> ```text
> AgentRuntime
> =
> AgentLoop
> ```
>
> 严格来说：
>
> ```text
> Runtime
> 拥有 State / Dependencies / Run entrypoint
>
> Agent Loop
> 是 Runtime 执行一次 Run 时采用的循环算法
> ```
>
> 类似：
>
> ```text
> AgentRuntime
> ├── state
> ├── provider
> └── run()
>       └── loop
> ```
>
> ---
>
> # 12. 这跟我们之前学的 Pi Agent 有一个很好的对应
>
> 我们之前看 Pi 时，你已经形成一个认知：
>
> > Agent Core 里真正核心的东西不是某一个类，而是围绕 State 驱动执行循环。
>
> VII-B 自己实现时，我们就能体会为什么很多框架最后不会只暴露：
>
> ```ts
> while (true) {}
> ```
>
> 而会有：
>
> ```text
> Agent / Runtime object
>         ↓
> run()
>         ↓
> Agent Loop
> ```
>
> 因为：
>
> ```text
> Loop
> =
> Execution Algorithm（执行算法）
>
> Runtime
> =
> Execution Owner（执行所有者/运行容器）
> ```
>
> 它们相关，但不是同一个概念。
>
> ---
>
> # 13. 所以 Decision 1 + Decision 2，我建议先形成暂定结论
>
> ### Decision 1 — RuntimeState 内容
>
> VII-B 第一版：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 暂时不包含：
>
> ```text
> iteration
> status
> finishReason
> usage
> error
> maxTurns
> provider
> ```
>
> 原因：
>
> > RuntimeState 只保存跨 Model Turn 延续的 Runtime Facts（运行事实）。
>
> ---
>
> ### Decision 2 — State Ownership
>
> 我倾向：
>
> ```text
> AgentRuntime
>     owns
> RuntimeState
> ```
>
> 而不是：
>
> ```text
> ModelProvider owns State            ❌
> runAgentLoop caller freely mutates  ❌
> RuntimeState class owns itself      ❌
> ```
>
> Agent Loop 是：
>
> ```text
> AgentRuntime 内部推进 State 的执行机制
> ```
>
> 不是另一个状态拥有者。
>
> ---
>
> # 14. 然后我们就进入真正最核心的 Decision 3
>
> 下一步就可以开始讨论：
>
> > **一次 `run()` 到底如何推进 State？**
>
> 例如用户：
>
> ```text
> "Hello"
> ```
>
> 是不是：
>
> ```text
> run("Hello")
>         ↓
> append user_input
>         ↓
> build ModelRequest
>         ↓
> provider.generate()
>         ↓
> append model_output
>         ↓
> ???
> ```
>
> 这里马上会出现一个非常关键的问题：
>
> 如果：
>
> ```text
> finishReason = stop
> ```
>
> 是不是直接：
>
> ```text
> return
> ```
>
> 那这其实根本没有“循环”。
>
> 而如果：
>
> ```text
> finishReason = tool_calls
> ```
>
> VII-B 又不能执行 Tool。
>
> 也就是说我们马上就会碰到一个看似矛盾的问题：
>
> > **在没有 Tool Executor 的 VII-B 里，Agent Loop 到底凭什么产生“下一轮”？**
>
> 这个问题非常重要，因为如果处理不好，我们就会为了实现 README 中的“最小循环”而造一个假的 `while`。
>
> 下一轮我们就专门把这个问题拆开：**VII-B 到底应该实现“Loop”，还是先实现一个可循环的 Runtime 执行骨架；什么情况下才真正发生第二次 `ModelProvider.generate()`。**

## 会话轮次 3

原始 turn ID：`423d31ef-1d80-4bf9-b936-e95b34fa8cb6`。

### 用户

> 继续讨论

### ChatGPT

> 好，我们继续。现在进入 **Decision 3：VII-B 里的 Agent Loop（Agent 循环）到底怎么成立**。
>
> 这里有一个必须先澄清的点：
>
> > **“实现 Agent Loop”不等于“这一 Part 必须真的跑很多轮模型调用”。**
>
> 因为按照当前整体规划，真正让循环产生第二轮、第三轮的核心原因——**Tool Result（工具结果）回流**——是在 VII-C 才出现。README 也明确把 Tool Registry / Tool Executor / Error Contract 放在下一 Part。fileciteturn0file1
>
> 所以 VII-B 如果为了证明“有 Loop”，硬写出一个会反复调用模型的 `while(true)`，反而容易制造错误架构。
>
> ---
>
> # 一、先重新定义：什么叫 Agent Loop
>
> 我们之前理论里经常画：
>
> ```text
> State
>   ↓
> LLM
>   ↓
> Action
>   ↓
> Observation
>   ↓
> State
>   ↓
> LLM
> ```
>
> 这确实是完整 Agent Loop（Agent 循环）。
>
> 但这是**完整版**。
>
> VII-B 当前只有：
>
> ```text
> RuntimeState
>      ↓
> ModelProvider
>      ↓
> ModelResponse
>      ↓
> RuntimeState
> ```
>
> 还没有：
>
> ```text
> Tool Execution
> Observation
> Approval
> ContextBuilder
> ```
>
> 所以现在应该把 Loop 理解成：
>
> > **一种能够根据 RuntimeState 不断执行“下一步”的控制结构。**
>
> 重点是“能够决定下一步”，而不是“必须至少循环两次”。
>
> 换句话说：
>
> ```text
> Loop ≠ 多执行几次
> Loop = repeated state transition mechanism
>        可重复执行的状态迁移机制
> ```
>
> ---
>
> # 二、一次最小 State Transition 应该是什么
>
> 假设 Runtime 初始状态：
>
> ```text
> messages = []
> ```
>
> 用户执行：
>
> ```ts
> runtime.run("Hello")
> ```
>
> 那么第一轮非常自然：
>
> ```text
> ① 接收 User Input
>         ↓
> ② 转成 RuntimeUserMessage
>         ↓
> ③ append RuntimeState
>         ↓
> ④ RuntimeState → ModelMessage[]
>         ↓
> ⑤ 构造 ModelRequest
>         ↓
> ⑥ provider.generate()
>         ↓
> ⑦ 得到 ModelResponse
>         ↓
> ⑧ 把 response.message 固化为 RuntimeAssistantMessage
>         ↓
> ⑨ append RuntimeState
>         ↓
> ⑩ 根据 ModelResponse 判断下一步
> ```
>
> 注意这里第 ⑩ 才是 Agent Loop 的关键。
>
> 前 9 步其实只是：
>
> > **一次 Model Turn（模型轮次）执行。**
>
> 真正让它成为 Agent Loop 的是：
>
> ```text
> ModelResponse
>     ↓
> What next?
> 下一步是什么？
> ```
>
> ---
>
> # 三、VII-B 最大的问题：现在根本没有一个合法的“继续原因”
>
> 看看当前 FinishReason：
>
> ```text
> stop
> tool_calls
> length
> unknown
> ```
>
> 逐个看。
>
> ---
>
> ## 1. `stop`
>
> 如果：
>
> ```text
> finishReason = stop
> ```
>
> 通常表示模型认为这一轮回答完成。
>
> 在目前没有其他 Action 的情况下：
>
> ```text
> stop
> ↓
> Agent Run complete
> ```
>
> 这是合理的。
>
> 所以不会继续下一轮。
>
> ---
>
> ## 2. `tool_calls`
>
> 正常完整 Agent 应该：
>
> ```text
> assistant:
>   tool_call(getWeather)
>         ↓
> Tool Executor
>         ↓
> tool_result
>         ↓
> RuntimeState
>         ↓
> LLM next turn
> ```
>
> 但 Tool Executor（工具执行器）明确属于 VII-C。fileciteturn0file1
>
> 所以 VII-B 不能：
>
> ```text
> tool_calls
> ↓
> 再次 provider.generate()
> ```
>
> 因为缺少：
>
> ```text
> tool_result
> ```
>
> 这会破坏对话轨迹。
>
> 因此：
>
> ```text
> tool_calls
> ```
>
> 目前也不能成为合法的“继续 Model Loop”的原因。
>
> ---
>
> ## 3. `length`
>
> `length` 一般表示：
>
> > 当前 Model Turn 因长度限制结束。
>
> 那 Runtime 要不要自动继续？
>
> 比如追加：
>
> ```text
> continue
> ```
>
> 再请求一次？
>
> 现在绝对不能这么干。
>
> 因为那属于一种：
>
> ```text
> Recovery Policy（恢复策略）
> Continuation Policy（续写策略）
> ```
>
> README 和 VII-A 都没有给 VII-B 这个职责。
>
> 所以：
>
> ```text
> length
> ```
>
> 也不应该自动触发下一轮。
>
> ---
>
> ## 4. `unknown`
>
> 更加明显。
>
> 未知状态：
>
> ```text
> unknown
> ```
>
> Runtime 更不应该自行猜：
>
> ```text
> “那我再问一次模型吧”
> ```
>
> 这会变成隐藏 Retry / Recovery（重试/恢复）策略。
>
> ---
>
> # 四、于是出现一个有意思的结论
>
> 在 VII-B 当前真实能力边界下：
>
> ```text
> 所有合法 ModelResponse
> ```
>
> 实际上都有可能导致当前 `run()` 结束。
>
> 也就是说第一版：
>
> ```ts
> while (...) {
>    await provider.generate()
> }
> ```
>
> 很可能只跑一次。
>
> 那是不是说明：
>
> > VII-B 根本不该叫 Agent Loop？
>
> 不是。
>
> 这里要区分：
>
> ```text
> Loop structure
> 循环结构
>
> 和
>
> Multi-step execution
> 多步骤执行
> ```
>
> 我们现在构建的是前者。
>
> ---
>
> # 五、一个更准确的架构理解：VII-B 是“Loop Kernel”
>
> 我更愿意把 VII-B 理解为：
>
> > **Agent Loop Kernel（Agent 循环内核/最小循环骨架）**
>
> 它第一次建立：
>
> ```text
> State
>  ↓
> Step
>  ↓
> Result
>  ↓
> State
>  ↓
> Decision
> ```
>
> 目前 Decision 的所有出口可能都是：
>
> ```text
> terminate
> ```
>
> 但是 VII-C 加进来之后：
>
> ```text
> tool_calls
> ↓
> execute tools
> ↓
> append tool_result
> ↓
> continue
> ```
>
> 就可以自然变成：
>
> ```text
> State
>  ↓
> Model
>  ↓
> Tool Call
>  ↓
> Tool
>  ↓
> State
>  ↓
> Model
> ```
>
> 关键是：
>
> > VII-C 应该给现有 Loop 增加一个新的合法 transition，而不是重写 Agent Loop。
>
> 如果 VII-C 到时候必须把 VII-B 的整体架构推翻，说明 VII-B 的 Loop 设计错了。
>
> 这个可以作为我们判断 VII-B 设计是否好的一个标准。
>
> ---
>
> # 六、所以我不建议为了 Loop 写假的第二轮
>
> 比如这种测试：
>
> ```text
> Mock response #1:
> content = "Thinking..."
>
> Mock response #2:
> content = "Final answer"
> ```
>
> 然后规定：
>
> ```text
> 第一个 stop 不算结束
> 第二个 stop 才结束
> ```
>
> 这是人为制造协议。
>
> 因为当前 `ModelResponse` 并没有：
>
> ```text
> continue
> ```
>
> 这样的 Runtime 语义。
>
> 还有一种可能：
>
> ```ts
> for (let i = 0; i < maxTurns; i++) {
>   const response = await provider.generate(...);
>   ...
> }
> ```
>
> 然后：
>
> ```text
> 只要不到 maxTurns 就继续
> ```
>
> 这也不对。
>
> 因为：
>
> > **maxTurns 应该是 Safety Guard（安全保护），不是 Continue Reason（继续原因）。**
>
> 这一点特别重要。
>
> ---
>
> # 七、`maxTurns` 不能决定“继续”，只能阻止“继续”
>
> 这个设计原则以后会非常重要。
>
> 假设未来完整 Runtime：
>
> ```text
> Model
> ↓
> tool_calls
> ↓
> Tool
> ↓
> Model
> ↓
> tool_calls
> ↓
> Tool
> ...
> ```
>
> Runtime 可能设置：
>
> ```text
> maxTurns = 10
> ```
>
> 它的逻辑应该是：
>
> ```text
> 有业务理由继续？
>         │
>        yes
>         ↓
> 是否超过 maxTurns？
>         │
>       no ↓
>       continue
> ```
>
> 而不是：
>
> ```text
> iteration < maxTurns
> ↓
> 所以继续
> ```
>
> 两者完全不同。
>
> 可以写成：
>
> ```text
> Continue Reason
> 决定“为什么要继续”
>
> Guard
> 决定“即使想继续，还允不允许继续”
> ```
>
> 例如以后：
>
> ```text
> Continue Reason:
> tool result 已经产生，需要下一轮模型判断
>
> Guard:
> maxTurns 尚未达到
> abort signal 未触发
> runtime 未被占用
> ```
>
> VII-B 现在虽然暂时不一定需要 `maxTurns`，但这个概念一定要先建立正确。
>
> 否则特别容易写出：
>
> ```ts
> while (iteration < maxTurns)
> ```
>
> 然后让“循环次数”反过来主导 Agent 行为。
>
> ---
>
> # 八、那么 VII-B 是否需要 `while`？
>
> 我目前倾向：
>
> > **可以有，也可以暂时没有；架构正确性不应该由是否出现 `while` 判断。**
>
> 例如第一版甚至可以是：
>
> ```ts
> async run(input: string) {
>   appendUserInput(input);
>
>   const response = await this.runModelTurn();
>
>   appendModelOutput(response);
>
>   return ...
> }
> ```
>
> 这种代码从表面看没有：
>
> ```ts
> while
> ```
>
> 但它已经建立：
>
> ```text
> Runtime owns State
> Model Turn
> State Transition
> Termination Decision
> ```
>
> 到了 VII-C 再演进：
>
> ```ts
> while (true) {
>   const response = await this.runModelTurn();
>
>   if (response.finishReason === "tool_calls") {
>     ...
>     continue;
>   }
>
>   return ...;
> }
> ```
>
> 也完全可以。
>
> ---
>
> # 九、但这里又有另一个方向：VII-B 直接把循环控制骨架写出来
>
> 例如概念上：
>
> ```ts
> while (true) {
>   const response = await executeModelTurn();
>
>   const decision = decideNextStep(response);
>
>   if (decision === "stop") {
>     break;
>   }
> }
> ```
>
> 当前：
>
> ```text
> decideNextStep()
> ```
>
> 可能所有情况都返回：
>
> ```text
> stop / unsupported / error
> ```
>
> VII-C 再加入：
>
> ```text
> continue_after_tool
> ```
>
> 这个方案的优势是：
>
> > Loop 结构在 VII-B 就真实出现。
>
> 但问题是很容易为了未来提前发明：
>
> ```ts
> type NextStep =
>   | { type: "continue" }
>   | { type: "execute_tools" }
>   | { type: "stop" }
>   | { type: "await_approval" }
>   | ...
> ```
>
> 那就明显越界了。
>
> 所以如果走这个方向，必须非常克制。
>
> ---
>
> # 十、我更倾向一个中间方案
>
> 也就是：
>
> > **VII-B 建立明确的 Run Loop 控制点，但只表达当前已经真实存在的决策。**
>
> 概念上：
>
> ```text
> run(input)
>    │
>    ▼
> append user message
>    │
>    ▼
> while (run is active)
>    │
>    ▼
> execute model turn
>    │
>    ▼
> append model output
>    │
>    ▼
> inspect finish reason
>    │
>    ├── stop ───────► finish
>    │
>    ├── tool_calls ─► 当前能力不支持，结束/显式失败
>    │
>    ├── length ─────► 当前能力不自动恢复
>    │
>    └── unknown ────► 当前能力不自动恢复
> ```
>
> 但这里最关键的一步还没定：
>
> ```text
> tool_calls / length / unknown
> ```
>
> 究竟是：
>
> ```text
> A. 正常结束当前 Run
> ```
>
> 还是：
>
> ```text
> B. 抛错误
> ```
>
> 还是：
>
> ```text
> C. 返回一个 Run Result，告诉 caller 为什么停止
> ```
>
> 这就是 **Decision 4**。
>
> ---
>
> # 十一、先分析 `tool_calls`：它到底是错误吗？
>
> 假设用户：
>
> ```text
> 北京天气怎么样？
> ```
>
> ModelProvider 返回：
>
> ```text
> assistant:
>   tool_call(getWeather)
> finishReason:
>   tool_calls
> ```
>
> 从模型协议角度：
>
> ```text
> 完全合法
> ```
>
> 从未来完整 Agent Runtime 角度：
>
> ```text
> 也是正常流程
> ```
>
> 只是：
>
> ```text
> VII-B 当前还不会执行
> ```
>
> 所以如果 Runtime 直接：
>
> ```ts
> throw new Error("tool_calls is invalid")
> ```
>
> 其实语义不准确。
>
> 因为不是：
>
> ```text
> 模型错了
> ```
>
> 而是：
>
> ```text
> 当前 Runtime capability 不完整
> ```
>
> 这叫：
>
> > **Unsupported Transition（当前不支持的状态迁移）**
>
> 所以我不太赞成把它包装成 Provider Error。
>
> ---
>
> # 十二、那能不能当成“正常完成”？
>
> 比如：
>
> ```text
> finishReason = tool_calls
> ↓
> run() return
> ```
>
> 然后调用方拿到：
>
> ```text
> 最后一个 assistant message
> ```
>
> 这又容易误导：
>
> > 好像 Agent 已经完成任务。
>
> 实际上它只是：
>
> ```text
> Agent 需要 Tool 才能继续
> ```
>
> 所以如果 `run()` 返回类型只是：
>
> ```ts
> Promise<AssistantMessage>
> ```
>
> 这个问题会非常明显。
>
> 调用方看到：
>
> ```text
> tool call
> ```
>
> 却不知道：
>
> ```text
> 是完成？
> 还是暂停？
> 还是能力不支持？
> ```
>
> 这就会逼出一个新的设计问题：
>
> # AgentRuntime.run() 到底返回什么？
>
> 这正好是 Decision 5。
>
> ---
>
> # 十三、我们先不要急着设计 `RunResult`
>
> 因为很容易变成：
>
> ```ts
> type RunResult =
>   | {
>       status: "completed";
>       ...
>     }
>   | {
>       status: "tool_call";
>       ...
>     }
>   | {
>       status: "failed";
>       ...
>     }
>   | {
>       status: "aborted";
>       ...
>     }
>   | {
>       status: "awaiting_approval";
>       ...
>     }
> ```
>
> 一看到这个就知道：
>
> ```text
> VII-F Abort
> VII-H Approval
> VII-C Tool
> ```
>
> 全被提前塞进 VII-B 了。
>
> 所以必须从当前需求倒推 Public Contract（公共契约）。
>
> ---
>
> # 十四、VII-B 当前调用方究竟需要什么？
>
> 目前这个 Mini Runtime 还没有 UI、Session、Approval。
>
> 调用方真正需要的可能只是：
>
> ```text
> runtime.run("Hello")
> ```
>
> 运行结束之后：
>
> ```text
> 拿到最终 Runtime State
> ```
>
> 或者：
>
> ```text
> 拿到最后一次 model output
> ```
>
> 也就是说我们先要确定：
>
> > `run()` 是“执行命令”，还是“执行并返回最终答案”的 API？
>
> 这是很重要的架构区别。
>
> ---
>
> # 十五、两种可能
>
> ## 方案 A：`run()` 返回 RuntimeState
>
> 例如：
>
> ```ts
> const state = await runtime.run("hello");
> ```
>
> 优点：
>
> ```text
> 最中立
> 不提前定义 FinalAnswer
> 测试方便
> 调用方看到完整结果
> ```
>
> 缺点：
>
> ```text
> 把内部 State 暴露给调用者
> 容易破坏 State Ownership
> ```
>
> 尤其如果返回：
>
> ```ts
> RuntimeState
> ```
>
> 里面 `messages` 是可变数组，那调用方可以：
>
> ```ts
> state.messages.push(...)
> ```
>
> 直接改 Runtime 状态。
>
> 这和我们刚刚定的：
>
> > AgentRuntime owns state
>
> 冲突。
>
> ---
>
> ## 方案 B：`run()` 返回最后一次 Model Output
>
> 例如：
>
> ```ts
> Promise<RuntimeAssistantMessage>
> ```
>
> 优点：
>
> ```text
> 简单
> 符合 Demo 使用感
> 不暴露整个 State
> ```
>
> 但缺点是：
>
> ```text
> tool_calls 时它并不是 final answer
> ```
>
> 而且未来 Tool Loop 中：
>
> ```text
> 最后一次 model output
> ```
>
> 可能确实是 final answer，但现在语义还没正式确定。
>
> ---
>
> # 十六、还有一个更保守的方案
>
> `run()` 只负责推进 Runtime：
>
> ```ts
> await runtime.run("hello");
>
> const messages = runtime.getMessages();
> ```
>
> 然后：
>
> ```text
> run()
> =
> Command（命令）
>
> getMessages()
> =
> Read model（读取视图）
> ```
>
> 这会让 State Ownership 很干净：
>
> ```text
> 外部不能直接持有 State
> 外部只能读取 snapshot / readonly data
> ```
>
> 但又会带来：
>
> ```text
> 是否需要 getState()
> getMessages() 是否 clone
> readonly 怎么处理
> ```
>
> 所以还是要克制。
>
> ---
>
> # 十七、在目前阶段，我倾向于把 `run()` 返回值保持非常窄
>
> 我目前最倾向的是：
>
> ```text
> run(input)
> ↓
> 返回本次最终产生的 RuntimeAssistantMessage
> ```
>
> 同时 Runtime 内部保存完整 messages。
>
> 原因是当前 VII-B 的用户故事非常简单：
>
> ```text
> User Input
> ↓
> Runtime
> ↓
> Model
> ↓
> Assistant Output
> ```
>
> 而完整 State 是 Runtime 内部事实，不应该为了测试方便就变成 Public Contract。
>
> 测试完全可以通过：
>
> ```text
> runtime.messages snapshot
> ```
>
> 或者测试专用读取 API 来验证。
>
> 不过这里暂时先作为候选，不急着锁死。
>
> ---
>
> # 十八、回到 Decision 3，我认为现在可以收敛了
>
> 我建议正式形成：
>
> ### Decision 3 — Agent Loop 的第一版语义
>
> > VII-B 实现的是 **可演进的 Run Loop（运行循环）骨架**，而不是人为制造多轮模型调用。
>
> 每个 Model Turn：
>
> ```text
> RuntimeState
> ↓
> toModelMessage()
> ↓
> ModelRequest
> ↓
> ModelProvider.generate()
> ↓
> ModelResponse
> ↓
> RuntimeAssistantMessage
> ↓
> append RuntimeState
> ↓
> interpret result
> ```
>
> 只有未来出现合法 Continue Reason（继续原因）时才再次调用模型。
>
> VII-B **不能因为存在 `maxTurns` 或 `while` 就自动继续。**
>
> ---
>
> 同时：
>
> > `tool_calls` 在 VII-B 是“模型产生了合法但当前 Runtime 尚不能完成的下一步”，不能伪造 Tool Result，也不能直接再次调用模型。
>
> 我觉得这一点已经基本可以确定。
>
> ---
>
> # 十九、下一步就该锁最关键的 Decision 4
>
> 现在我们只剩一个非常具体的问题：
>
> 假设 VII-B 收到：
>
> ```text
> finishReason = tool_calls
> ```
>
> 当前没有 VII-C。
>
> API 应该怎么表现？
>
> 我认为有三个真正可选方案：
>
> ```text
> 方案 A
> throw UnsupportedToolCallError
>
> 方案 B
> run 正常返回，但返回一个结构化停止原因
>
> 方案 C
> run 返回 assistant message，
> 由调用方自己看 toolCalls
> ```
>
> 我目前**最不倾向 C**，因为它把 Runtime 生命周期解释责任泄漏给 caller。
>
> 而 A 和 B 之间才是真正值得讨论的：
>
> > **“当前能力不支持继续”应该建模为 Error，还是建模为 Run Outcome（运行结果）？**
>
> 这会直接决定 VII-B 是否需要最小的 `AgentRunResult`，也会影响未来 VII-C 是否能自然演进。
>
> 下一轮我们就把 A/B 两条路线彻底拆开，再顺带讨论 `length / unknown` 应该跟 `tool_calls` 一样处理，还是不同处理。

## 会话轮次 4

原始 turn ID：`4055805a-5db9-4450-a236-b2612a016bba`。

### 用户

> 继续

### ChatGPT

> 好，我们继续把 **Decision 4：`tool_calls / length / unknown` 到底该如何结束 VII-B 的 Run** 收敛掉。
>
> 我先给结论方向：**我更倾向方案 B——把它建模成最小 `Run Outcome（运行结果）`，而不是异常。**
>
> 原因是这里的核心不是“出错了”，而是：
>
> > **Runtime 当前这一版走到了它能力边界。**
>
> 这和 Provider 抛错、JSON 解析失败、Tool 执行异常不是一类东西。
>
> ---
>
> # 1. 先比较 A：抛 `UnsupportedToolCallError`
>
> 假设：
>
> ```text
> finishReason = tool_calls
> ```
>
> 然后：
>
> ```ts
> throw new UnsupportedToolCallError(...)
> ```
>
> 这个方案的优点很直接：
>
> ```text
> 调用方不会误以为任务完成
> 控制流明确
> 实现简单
> ```
>
> 但问题更大。
>
> 因为 `tool_calls` 本身不是错误。
>
> 它在未来完整 Runtime 里其实是：
>
> ```text
> 正常状态迁移
> ```
>
> 只是 VII-B 还没实现 VII-C。
>
> 所以如果现在把：
>
> ```text
> tool_calls
> ```
>
> 定义成 Error（错误），未来 VII-C 又要改成：
>
> ```text
> 正常分支
> ```
>
> 这意味着我们今天给它赋予了错误语义，之后再推翻。
>
> 这不是最理想的增量演进。
>
> ---
>
> # 2. 更关键的是：异常应该表示“无法按照契约完成”
>
> 比如 VII-A 的 malformed arguments：
>
> ```text
> JSON 解析失败
> ```
>
> 这里 Provider 无法构造一个合法的 Runtime `ToolCall`。
>
> 所以：
>
> ```text
> throw
> ```
>
> 非常合理。
>
> 但 `tool_calls`：
>
> ```text
> ModelResponse 合法
> Runtime 也理解它是什么
> 只是当前没有 ToolExecutor
> ```
>
> 这更像：
>
> ```text
> Known but unsupported next action
> 已知但当前未实现的下一步
> ```
>
> 而不是：
>
> ```text
> Invalid runtime state
> 非法状态
> ```
>
> 所以从语义上讲，我不建议用 Exception（异常）承载它。
>
> ---
>
> # 3. 那方案 B：Run Outcome 到底是什么？
>
> 先不要设计太大。
>
> 我们不能一下写成：
>
> ```ts
> type AgentRunResult =
>   | Completed
>   | ToolPending
>   | Aborted
>   | Failed
>   | WaitingApproval
>   | Suspended
>   | ...
> ```
>
> 因为这会把 VII-F / VII-H 全拉进来。
>
> VII-B 真正需要的只有当前已经存在的几种结束情况。
>
> 比如最小可以表达成：
>
> ```ts
> type RunOutcome =
>   | {
>       type: "completed";
>       message: RuntimeAssistantMessage;
>     }
>   | {
>       type: "unsupported_finish";
>       finishReason: Exclude<FinishReason, "stop">;
>       message: RuntimeAssistantMessage;
>     };
> ```
>
> 这只是示意，不是最终代码。
>
> 重点是语义：
>
> ```text
> completed
> =
> 当前 Runtime 可以认为这次 Run 正常完成
>
> unsupported_finish
> =
> 模型正常结束了这一 Turn，
> 但 Runtime 当前没有合法下一步
> ```
>
> ---
>
> # 4. `tool_calls` 最适合落在哪一类？
>
> 我建议：
>
> ```text
> tool_calls
> → run ends with unsupported / incomplete outcome
> ```
>
> 不要叫：
>
> ```text
> failed
> ```
>
> 因为失败会暗示：
>
> ```text
> 系统出了错
> ```
>
> 而实际只是：
>
> ```text
> 当前 Milestone 尚未具备 Tool Execution
> ```
>
> 所以更准确的概念是：
>
> ```text
> incomplete
> blocked
> unsupported
> ```
>
> 三者里我更倾向：
>
> ```text
> unsupported
> ```
>
> 因为它最准确地描述：
>
> > Runtime 识别这个 finish reason，但当前能力没有对应 transition。
>
> ---
>
> # 5. 那 `length` 呢？
>
> `length` 和 `tool_calls` 不完全一样。
>
> `tool_calls`：
>
> ```text
> 有一个明确的下一步
> ↓
> 执行 Tool
> ```
>
> 只是 VII-B 还没做。
>
> 而 `length`：
>
> ```text
> 模型输出因为 token / length 限制被截断
> ```
>
> Runtime 是否应该：
>
> ```text
> 自动续写？
> 重试？
> 修改 prompt？
> 增大 token？
> ```
>
> 目前都没有 Policy（策略）。
>
> 所以它同样不能算：
>
> ```text
> completed
> ```
>
> 但它也不是系统异常。
>
> 因此我倾向：
>
> ```text
> length
> → unsupported / incomplete outcome
> ```
>
> 理由是：
>
> > 当前 Runtime 没有 Continuation Policy（续写策略）。
>
> 这和 `tool_calls` 的具体原因不同，但在 VII-B 的 Run Lifecycle（运行生命周期）层面，可以暂时归为同类：
>
> ```text
> Model Turn 正常结束
> 但 Agent Run 无法继续完成
> ```
>
> ---
>
> # 6. `unknown` 呢？
>
> 这个比 `length` 更保守。
>
> VII-A 已经决定：
>
> ```text
> Provider 不把所有供应商 finish reason 都强行塞进 Runtime
> 未知值 → unknown
> ```
>
> 所以 VII-B 收到：
>
> ```text
> unknown
> ```
>
> 不能猜。
>
> 也不能当：
>
> ```text
> stop
> ```
>
> 否则你就把一个“不知道为什么结束”解释成了“任务完成”。
>
> 这明显不安全。
>
> 所以：
>
> ```text
> unknown
> → unsupported / incomplete outcome
> ```
>
> 我认为也合理。
>
> ---
>
> # 7. 这样 VII-B 的终止语义就可以非常干净
>
> 最终可以先抽象成：
>
> ```text
> finishReason = stop
>         ↓
> Agent Run completed
>
>
> finishReason = tool_calls
>         ↓
> Agent Run stopped at unsupported transition
>
>
> finishReason = length
>         ↓
> Agent Run stopped at unsupported recovery case
>
>
> finishReason = unknown
>         ↓
> Agent Run stopped conservatively
> ```
>
> 最关键的是：
>
> > **它们都会停止当前 run，但停止原因不同。**
>
> 这就是我们之前一直强调的：
>
> ```text
> Termination（终止）
> ≠
> Success（成功）
> ```
>
> 这一点到了真实代码里就会特别清楚。
>
> ---
>
> # 8. 这会自然引出一个很重要的 Runtime 概念
>
> 以前我们可能觉得 Agent 只有：
>
> ```text
> running
> completed
> failed
> ```
>
> 但实际上工业级 Runtime（运行时）经常还会有：
>
> ```text
> blocked
> waiting
> suspended
> requires_action
> cancelled
> ```
>
> 为什么？
>
> 因为：
>
> > **“不能继续执行”并不等于“发生异常”。**
>
> VII-B 虽然还不应该正式引入这些完整状态，但现在已经能看到它们为什么未来会出现。
>
> 比如：
>
> ```text
> tool_calls
> ```
>
> 在 VII-B：
>
> ```text
> unsupported
> ```
>
> 到了 VII-C：
>
> ```text
> execute tool → continue
> ```
>
> 到了 VII-H 某些敏感 Tool：
>
> ```text
> requires approval
> ```
>
> 再到了 Durable Approval（持久审批）时代：
>
> ```text
> suspended
> ```
>
> 你会发现：
>
> > 同一个模型意图随着 Runtime Capability（运行时能力）扩张，对应的生命周期 transition 也在扩张。
>
> 这个认知比记几个 status 枚举重要得多。
>
> ---
>
> # 9. 这也验证了我们为什么之前没把 `status` 放进 RuntimeState
>
> 假设一开始我们就写：
>
> ```ts
> state.status = "completed";
> ```
>
> 然后遇到：
>
> ```text
> tool_calls
> ```
>
> 你马上就会纠结：
>
> ```text
> status = failed?
> status = paused?
> status = waiting_tool?
> status = unsupported?
> ```
>
> 其实这些都还不是 VII-B 真正需要长期保存的 Runtime Fact。
>
> 而如果我们只是：
>
> ```text
> run(...)
> ↓
> returns RunOutcome
> ```
>
> 那就很自然。
>
> 也就是说：
>
> ```text
> RuntimeState
> =
> Conversation / Runtime Facts
>
> RunOutcome
> =
> 这一轮 run() 调用为什么结束
> ```
>
> 这是两个完全不同的概念。
>
> 这其实是一个非常重要的架构分离。
>
> ---
>
> # 10. 所以可以正式区分三个层级了
>
> 现在我们已经有三个东西：
>
> ```text
> ModelResponse
> RunOutcome
> RuntimeState
> ```
>
> 它们千万不能混。
>
> ---
>
> ## ModelResponse
>
> 回答：
>
> > **这一轮模型调用发生了什么？**
>
> 例如：
>
> ```text
> message
> finishReason
> usage
> ```
>
> 属于 Model Turn（模型轮次）。
>
> ---
>
> ## RunOutcome
>
> 回答：
>
> > **这次 Runtime.run() 为什么结束？**
>
> 例如：
>
> ```text
> completed
> unsupported_finish
> ```
>
> 属于 Agent Run（Agent 运行）。
>
> ---
>
> ## RuntimeState
>
> 回答：
>
> > **到目前为止，Runtime 中有哪些已发生事实？**
>
> 例如：
>
> ```text
> messages
> ```
>
> 属于 Runtime State（运行时状态）。
>
> ---
>
> 这三个层级特别重要：
>
> ```text
> Provider
>     ↓
> ModelResponse
>
> Agent Loop
>     ↓
> RunOutcome
>
> Runtime
>     ↓
> RuntimeState
> ```
>
> 如果 VII-B 能把这三个彻底分开，我觉得这一 Part 的学习价值就已经很高了。
>
> ---
>
> # 11. 那么 RunOutcome 会不会属于 RuntimeState？
>
> 不属于。
>
> 比如：
>
> ```text
> run #1
> → completed
>
> 过几分钟用户再次：
>
> run #2
> → completed
> ```
>
> RuntimeState 中的 conversation：
>
> ```text
> user
> assistant
> user
> assistant
> ```
>
> 继续增长。
>
> 但：
>
> ```text
> run #1 outcome
> ```
>
> 通常不需要为了下一次对话而恢复。
>
> 所以它更接近：
>
> ```text
> 一次 run() 调用的返回值
> ```
>
> 而不是长期 State。
>
> ---
>
> # 12. 这也解释了为什么 `finishReason` 不应该塞 RuntimeState
>
> 链路应该是：
>
> ```text
> ModelResponse.finishReason
>         ↓
> Agent Loop interprets
>         ↓
> RunOutcome
> ```
>
> 而不是：
>
> ```text
> ModelResponse.finishReason
>         ↓
> RuntimeState.finishReason
> ```
>
> 前者是：
>
> ```text
> 把 Model semantics
> 转换成 Runtime lifecycle semantics
> ```
>
> 后者只是：
>
> ```text
> 复制字段
> ```
>
> 这正是 Agent Runtime 真正开始有价值的地方。
>
> 它不能只是 Provider 的中转站。
>
> ---
>
> # 13. Decision 4 我认为现在可以基本锁定
>
> ### Decision 4 — Finish Reason 与 Agent Run 终止
>
> 我建议最终设计原则是：
>
> > `FinishReason` 仍然只描述 Model Turn。Agent Loop 负责把它解释成当前 Runtime 能理解的 `RunOutcome`。
>
> 当前 VII-B：
>
> ```text
> stop
> → completed
>
> tool_calls
> → unsupported / incomplete
>
> length
> → unsupported / incomplete
>
> unknown
> → unsupported / incomplete
> ```
>
> 并且：
>
> ```text
> unsupported
> ≠ exception
> ```
>
> 除非 Runtime 自身出现真正执行错误，例如未来：
>
> ```text
> Provider.generate() reject
> ```
>
> 这种才走 Error path（错误路径）。
>
> ---
>
> # 14. 这里还必须区分 Provider Error
>
> 比如：
>
> ```ts
> await provider.generate()
> ```
>
> 直接抛：
>
> ```text
> 401
> 429
> network error
> malformed mapping
> ```
>
> 这种怎么办？
>
> VII-B 不应该因为我们现在讨论 RunOutcome，就顺手创建：
>
> ```ts
> { type: "failed", error }
> ```
>
> 为什么？
>
> 因为 README 已经明确后续 Error Contract（错误契约）重点在 VII-C，而 VII-A 也明确 Provider SDK 错误当前自然向上传播。fileciteturn0file0
>
> 所以 VII-B 最合理的是：
>
> ```text
> Provider exception
> ↓
> 不吞
> ↓
> run() reject
> ```
>
> 这样可以保持 VII-A 已经确认的错误传播语义。
>
> 不能为了统一返回值而写：
>
> ```ts
> try {
>  ...
> } catch (error) {
>  return { type: "failed" };
> }
> ```
>
> 这反而改变了前一 Part 的边界。
>
> 这一点 Code Review（代码审查）以后要专门检查。
>
> ---
>
> # 15. 所以 RunOutcome 不应该是一个“万能 Result”
>
> 这非常重要。
>
> 它只表达：
>
> > **正常执行流程最终走到了哪个 Runtime 生命周期出口。**
>
> 而不负责吞：
>
> ```text
> Provider Error
> Programming Error
> Mapping Error
> Tool Error
> ```
>
> 所以现在可以理解成：
>
> ```text
> Normal control-flow outcome
> ```
>
> 而不是：
>
> ```text
> Result<T, E>
> ```
>
> 这种错误统一包装器。
>
> ---
>
> # 16. 现在进入 Decision 5：`run()` 的 Public Contract
>
> 我们已经有足够信息了。
>
> 目前候选：
>
> ### 方案 1
>
> ```ts
> run(input): Promise<RuntimeAssistantMessage>
> ```
>
> 问题：
>
> ```text
> 无法表达 unsupported finish
> ```
>
> ---
>
> ### 方案 2
>
> ```ts
> run(input): Promise<RuntimeState>
> ```
>
> 问题：
>
> ```text
> 暴露内部 State
> State Ownership 变差
> ```
>
> ---
>
> ### 方案 3
>
> ```ts
> run(input): Promise<RunOutcome>
> ```
>
> 这个现在明显开始变得最自然。
>
> 比如概念上：
>
> ```ts
> type RunOutcome =
>   | {
>       type: "completed";
>       message: RuntimeAssistantMessage;
>     }
>   | {
>       type: "unsupported";
>       finishReason: FinishReason;
>       message: RuntimeAssistantMessage;
>     };
> ```
>
> 这样：
>
> ```text
> RuntimeState
> 仍然内部持有
>
> 调用者
> 只拿本次 Run Outcome
> ```
>
> State Ownership 也不会被破坏。
>
> 我目前最倾向这个方向。
>
> ---
>
> # 17. 但 `RunOutcome` 是否应该包含 `message`？
>
> 我倾向：
>
> > 应该。
>
> 否则：
>
> ```ts
> const outcome = await runtime.run("hello");
> ```
>
> 只得到：
>
> ```text
> completed
> ```
>
> 那调用方还需要：
>
> ```text
> runtime.getLastMessage()
> ```
>
> 才能拿回答。
>
> 这对 VII-B 第一版 API 没太大必要。
>
> 所以可以让 outcome 本身携带：
>
> ```text
> 本次最后一个 model_output
> ```
>
> 这并不是暴露整个 State。
>
> ---
>
> # 18. 那调用方要不要能读取历史消息？
>
> 我认为可以提供：
>
> ```text
> read-only snapshot
> ```
>
> 但这里要非常克制。
>
> 比如：
>
> ```ts
> runtime.getMessages()
> ```
>
> 返回：
>
> ```text
> readonly RuntimeMessage[]
> ```
>
> 或者 copy。
>
> 目的只是：
>
> ```text
> 调试
> 测试
> 后续上层消费
> ```
>
> 而不是让外部：
>
> ```ts
> runtime.state.messages.push(...)
> ```
>
> 所以 State Ownership 仍然保持：
>
> ```text
> write
> → Runtime only
>
> read
> → caller can inspect
> ```
>
> 这其实很像数据库：
>
> ```text
> Ownership
> ≠
> 别人不能读
> ```
>
> 而是：
>
> ```text
> 谁有权进行 mutation
> ```
>
> ---
>
> # 19. 我建议 Decision 5 收敛为
>
> ### Runtime Public Contract
>
> 概念上：
>
> ```ts
> runtime.run(input)
> ```
>
> 负责：
>
> ```text
> 1. append user_input
> 2. 执行当前 Agent Run
> 3. 推进内部 RuntimeState
> 4. 返回 RunOutcome
> ```
>
> 同时 Runtime 可以暴露：
>
> ```text
> read-only messages snapshot
> ```
>
> 但：
>
> ```text
> 不暴露可变 RuntimeState reference
> ```
>
> 这样：
>
> ```text
> AgentRuntime
>     owns RuntimeState
>
> run()
>     performs transition
>
> RunOutcome
>     describes current run termination
>
> getMessages()
>     exposes read-only view
> ```
>
> 职责非常清楚。
>
> ---
>
> # 20. 最后一个还没锁：MockModelProvider 怎么设计
>
> 现在其实简单很多了。
>
> 因为 VII-B 不需要假装 Tool Loop。
>
> Mock 只需要做到两件事：
>
> ```text
> 1. 返回预定义 ModelResponse
> 2. 记录收到的 ModelRequest
> ```
>
> 比如：
>
> ```ts
> const provider = new MockModelProvider([
>   {
>     message: {
>       role: "assistant",
>       content: "Hello!"
>     },
>     finishReason: "stop"
>   }
> ]);
> ```
>
> Runtime：
>
> ```text
> run("Hi")
> ```
>
> 然后测试：
>
> ```text
> provider.requests.length === 1
> ```
>
> 并检查：
>
> ```text
> request.messages
> ```
>
> 是不是：
>
> ```text
> user: Hi
> ```
>
> 然后 RuntimeState：
>
> ```text
> user_input: Hi
> model_output: Hello!
> ```
>
> 这就是一个非常完整的 VII-B 测试。
>
> ---
>
> # 21. 还应该测试 `tool_calls`
>
> 这特别重要。
>
> Mock 返回：
>
> ```text
> assistant:
>   toolCalls: [...]
>
> finishReason:
>   tool_calls
> ```
>
> 然后验证：
>
> ```text
> Runtime 没有再次调用 provider
> ```
>
> 以及：
>
> ```text
> RunOutcome = unsupported
> ```
>
> 但：
>
> ```text
> model_output 仍然写入 RuntimeState
> ```
>
> 为什么这一点重要？
>
> 因为 Tool Call 已经是：
>
> > **模型真实产生的 Runtime Fact（运行事实）。**
>
> 虽然当前不会执行 Tool，但不能因为 Runtime 不支持下一步，就把这条模型输出丢掉。
>
> 这是非常关键的状态语义。
>
> ---
>
> # 22. 所以状态迁移顺序必须是
>
> ```text
> Provider.generate()
>         ↓
> 获得 ModelResponse
>         ↓
> 先把 model_output 写入 RuntimeState
>         ↓
> 再解释 finishReason
>         ↓
> 得到 RunOutcome
> ```
>
> 而不是：
>
> ```text
> 先看 finishReason
> ↓
> tool_calls unsupported
> ↓
> return
> ↓
> 模型消息没存
> ```
>
> 后者会丢失事实。
>
> 这一点我建议以后直接进入 Acceptance Criteria（验收标准）。
>
> ---
>
> # 23. 到这里，Architecture Analysis 已经基本形成完整骨架
>
> 我们现在有 5 个暂定结论：
>
> ### Decision 1 — RuntimeState
>
> ```text
> 第一版只保存 messages
> ```
>
> ### Decision 2 — State Ownership
>
> ```text
> AgentRuntime owns RuntimeState
> Agent Loop 负责推进
> 外部只读
> ```
>
> ### Decision 3 — Agent Loop
>
> ```text
> Loop 是可演进的状态迁移骨架
> 不人为制造第二轮 Model Call
> ```
>
> ### Decision 4 — Termination
>
> ```text
> Model FinishReason
> ≠
> Agent Run Outcome
>
> stop → completed
> tool_calls / length / unknown → unsupported
> Provider error → reject / 向上传播
> ```
>
> ### Decision 5 — Public Contract
>
> ```text
> run(input): RunOutcome
>
> 内部保存 State
> 不返回可变 RuntimeState
> 允许读取只读 messages snapshot
> ```
>
> ---
>
> 我认为接下来 Architecture Analysis 还剩最后一个值得单独讨论的问题：
>
> > **VII-B 里的 `AgentRuntime`、`AgentLoop`、`RuntimeState` 到底应该是 1 个类、2 个模块，还是纯函数组合？**
>
> 也就是不要只讨论“职责逻辑”，还要决定第一版**模块边界**。
>
> 这个问题会直接影响 Codex 最后生成：
>
> ```text
> src/runtime/runtime-state.ts
> src/runtime/agent-runtime.ts
> src/runtime/agent-loop.ts
> ```
>
> 还是更小的结构。
>
> 下一步我们就讨论这个：**第一版是否真的需要独立 `AgentLoop` 模块，还是 `AgentRuntime.run()` 本身就是 Agent Loop，避免为了名字漂亮而多拆一层。**

## 会话轮次 5

原始 turn ID：`9b81c64d-b57c-4eda-942b-1921b9b9711c`。

### 用户

> 1. 有个疑问，你提到 【RunOutcome 会不会属于 RuntimeState】，但是 RunOutcome的结果如果涉及到下一个 loop 呢
> 2. 继续讨论

### ChatGPT

> 你这个疑问非常关键，而且它确实暴露了我们刚才设计里一个需要进一步收紧的地方：
>
> > **如果某个结果还会驱动“下一个 loop”，那它严格来说就不应该叫 `RunOutcome`。**
>
> 因为 `RunOutcome` 更准确的语义应该是：
>
> > **整个 `run()` 已经结束以后，对外描述“这次 Run 最终为什么结束”。**
>
> 而“是否进入下一轮”属于 **Loop 内部控制决策**。
>
> 这两个概念必须分开。
>
> ---
>
> # 1. 先回答你的疑问：RunOutcome 如果涉及下一个 loop 怎么办？
>
> 假设未来 VII-C 完整之后：
>
> ```text
> ModelResponse
>     ↓
> finishReason = tool_calls
>     ↓
> 执行 Tool
>     ↓
> 写入 tool_result
>     ↓
> 下一次 Model Loop
> ```
>
> 这时候：
>
> ```text
> tool_calls
> ```
>
> 显然不能变成：
>
> ```ts
> RunOutcome = ...
> ```
>
> 因为：
>
> ```text
> run()
> 还没有结束
> ```
>
> 它只是告诉 Agent Loop：
>
> > 下一步应该执行 Tool，然后继续。
>
> 所以真正的层级应该是：
>
> ```text
> ModelResponse
>       ↓
> Loop Decision / Next Action
>       ↓
> 继续 or 结束
>       ↓
> 如果结束
>       ↓
> RunOutcome
> ```
>
> 而不是：
>
> ```text
> ModelResponse
>       ↓
> RunOutcome
>       ↓
> 再决定是否继续
> ```
>
> 后者语义确实反了。
>
> ---
>
> # 2. 我们应该正式区分 4 个概念
>
> 现在架构可以再精确一步。
>
> ## 第一层：RuntimeState
>
> 回答：
>
> > **现在有哪些已发生事实？**
>
> 例如：
>
> ```text
> messages
> ```
>
> ---
>
> ## 第二层：ModelResponse
>
> 回答：
>
> > **刚刚这一次 Model Turn 发生了什么？**
>
> 例如：
>
> ```text
> message
> finishReason
> usage
> ```
>
> ---
>
> ## 第三层：Loop Decision
>
> 回答：
>
> > **Agent Loop 接下来要做什么？**
>
> 例如未来可能是：
>
> ```text
> complete
> execute_tool
> continue_model
> ```
>
> 注意：这里只是概念，不代表 VII-B 要一次把这些枚举全部实现。
>
> ---
>
> ## 第四层：RunOutcome
>
> 只有当：
>
> ```text
> Loop 决定不再继续
> ```
>
> 才产生：
>
> ```text
> RunOutcome
> ```
>
> 回答：
>
> > **整个 Agent Run 最终如何结束？**
>
> 所以链路应该是：
>
> ```text
> RuntimeState
>      ↓
> Model Call
>      ↓
> ModelResponse
>      ↓
> 写入 RuntimeState
>      ↓
> Loop Decision
>      │
>      ├── continue
>      │      ↓
>      │   next loop
>      │
>      └── terminate
>             ↓
>         RunOutcome
> ```
>
> 这个就严谨很多。
>
> ---
>
> # 3. 这也解释了为什么 RunOutcome 不属于 RuntimeState
>
> 你刚才的疑问其实正好帮助我们验证了这一点。
>
> 假设未来：
>
> ```text
> Loop #1
> Model → tool_calls
> ```
>
> 这里产生的是：
>
> ```text
> Loop Decision = execute_tool
> ```
>
> 不是：
>
> ```text
> RunOutcome
> ```
>
> 然后：
>
> ```text
> Tool Result
> ↓
> Loop #2
> Model → stop
> ```
>
> 到这里：
>
> ```text
> Loop Decision = complete
> ```
>
> 整个 Run 才结束：
>
> ```text
> RunOutcome = completed
> ```
>
> 所以：
>
> ```text
> RuntimeState
> ```
>
> 记录的是整个过程中不断累积的事实：
>
> ```text
> user_input
> model_output(tool call)
> tool_result
> model_output(final answer)
> ```
>
> 而：
>
> ```text
> RunOutcome
> ```
>
> 只是在外层 `run()` 返回之前产生一次。
>
> 因此它确实不适合作为长期 RuntimeState。
>
> ---
>
> # 4. 那 VII-B 的 `tool_calls` 怎么理解？
>
> 这里有个很有意思的地方。
>
> 未来 VII-C：
>
> ```text
> tool_calls
> → Loop Decision = execute_tool
> → continue
> ```
>
> 但当前 VII-B：
>
> ```text
> Tool Executor 不存在
> ```
>
> 所以：
>
> ```text
> tool_calls
> ```
>
> 的真实含义其实是：
>
> ```text
> 模型要求下一步 execute_tool
> ↓
> Runtime 当前没有这种 capability
> ↓
> 无法继续
> ↓
> 本次 Run 终止
> ↓
> RunOutcome = unsupported
> ```
>
> 完整链路应该是：
>
> ```text
> ModelResponse(tool_calls)
>         ↓
> Loop interprets
>         ↓
> Next Action = execute_tool
>         ↓
> Capability 不存在
>         ↓
> terminate
>         ↓
> RunOutcome = unsupported
> ```
>
> 这样就不会产生：
>
> > “RunOutcome 为什么还能进入下一轮？”
>
> 因为 **RunOutcome 永远不进入下一轮**。
>
> 如果还能进入下一轮，那就还没形成 RunOutcome。
>
> ---
>
> # 5. 这个区别非常像函数里的 `continue` 和 `return`
>
> 其实可以用普通程序理解。
>
> ```ts
> while (...) {
>   const result = step();
>
>   if (...) {
>     continue;
>   }
>
>   return outcome;
> }
> ```
>
> 这里：
>
> ```text
> result
> ```
>
> 和：
>
> ```text
> outcome
> ```
>
> 根本不是一个东西。
>
> 对应 Agent：
>
> ```text
> ModelResponse
> ≈ step result
>
> Loop Decision
> ≈ continue / break / action
>
> RunOutcome
> ≈ function return value
> ```
>
> 这个类比应该很好理解。
>
> ---
>
> # 6. 所以我们要修正刚才的一句话
>
> 之前我说：
>
> > Model FinishReason → RunOutcome
>
> 这个说法略微简化过头了。
>
> 更准确应该是：
>
> ```text
> Model FinishReason
>         ↓
> Loop Interpretation
>         ↓
> Next Action / Termination Decision
>         ↓
> 如果终止
>         ↓
> RunOutcome
> ```
>
> 这实际上才是 Runtime 真正做的事：
>
> > **把 Provider 层语义转换为 Agent 执行语义。**
>
> 不是简单把 `finishReason` 重命名。
>
> ---
>
> # 7. 这会不会要求 VII-B 现在就设计 `LoopDecision` 类型？
>
> 我反而认为：
>
> > **不一定。**
>
> 这里我们知道“概念上存在”就够了。
>
> 因为 VII-B 当前所有情况最终都会终止：
>
> ```text
> stop
> → complete
> → terminate
>
> tool_calls
> → execute_tool requested
> → unsupported capability
> → terminate
>
> length
> → continuation/recovery required
> → unsupported policy
> → terminate
>
> unknown
> → no known transition
> → terminate
> ```
>
> 所以现在代码完全可以直接写局部逻辑。
>
> 例如概念上：
>
> ```ts
> switch (response.finishReason) {
>   case "stop":
>     return completedOutcome;
>
>   case "tool_calls":
>   case "length":
>   case "unknown":
>     return unsupportedOutcome;
> }
> ```
>
> 不需要为了未来提前定义：
>
> ```ts
> type LoopDecision = ...
> ```
>
> 因为目前它还没有被多个模块共享，也没有复杂分支。
>
> ### 这也是一个非常好的工程原则：
>
> > **概念上区分职责，不代表必须马上为每个概念创建一个 TypeScript 类型。**
>
> ---
>
> # 8. 好，现在继续刚才没讨论完的模块边界
>
> 我们现在的问题是：
>
> > VII-B 应该有 `RuntimeState`、`AgentRuntime`、`AgentLoop` 三个模块吗？
>
> 看起来最“架构漂亮”的方案可能是：
>
> ```text
> src/runtime/
> ├── runtime-state.ts
> ├── agent-runtime.ts
> └── agent-loop.ts
> ```
>
> 但我们要判断：
>
> > `agent-loop.ts` 现在有没有独立存在的真实职责？
>
> ---
>
> # 9. 方案 A：独立 AgentLoop
>
> 例如：
>
> ```ts
> class AgentRuntime {
>   private state: RuntimeState;
>
>   async run(input: string) {
>     return runAgentLoop({
>       state: this.state,
>       provider: this.provider,
>     });
>   }
> }
> ```
>
> 然后：
>
> ```ts
> async function runAgentLoop(...) {
>   ...
> }
> ```
>
> 看起来很漂亮：
>
> ```text
> AgentRuntime
>     ↓
> AgentLoop
>     ↓
> Provider
> ```
>
> 但第一版很可能出现一个问题：
>
> ```text
> AgentRuntime.run()
> 几乎没逻辑
>
> AgentLoop
> 也只有几十行
> ```
>
> 于是：
>
> ```text
> Runtime
> 只是一个包装器
> Loop
> 只是被拆出去的一段函数
> ```
>
> 这种拆分未必产生真实边界。
>
> ---
>
> # 10. 更重要的是：谁拥有 State 会变模糊
>
> 我们刚刚已经决定：
>
> ```text
> AgentRuntime owns RuntimeState
> ```
>
> 如果：
>
> ```ts
> runAgentLoop(state, provider)
> ```
>
> 拿到了可变 `state`：
>
> ```text
> AgentRuntime
>    │ owns
>    ▼
> RuntimeState
>    ▲
>    │ mutates
> AgentLoop
> ```
>
> 这本身并非错误。
>
> 但我们现在只有一个调用方：
>
> ```text
> AgentRuntime
> ```
>
> 那么独立 `AgentLoop` 模块的价值是什么？
>
> 目前还没有：
>
> ```text
> 不同 Loop 实现
> Loop Strategy
> Reusable Loop Engine
> Streaming Loop
> Tool Loop
> Subagent Loop
> ```
>
> 所以它可能只是：
>
> > 为了名字上体现“Agent Loop”而拆模块。
>
> 这个不符合我们的 Day08 原则。
>
> ---
>
> # 11. 方案 B：`AgentRuntime.run()` 本身就是 Loop
>
> 结构变成：
>
> ```text
> src/runtime/
> ├── runtime-state.ts
> └── agent-runtime.ts
> ```
>
> 然后：
>
> ```ts
> class AgentRuntime {
>   private state: RuntimeState;
>   private provider: ModelProvider;
>
>   async run(input: string): Promise<RunOutcome> {
>     ...
>   }
> }
> ```
>
> 内部：
>
> ```text
> append user
> ↓
> execute model turn
> ↓
> append model output
> ↓
> interpret response
> ↓
> return outcome
> ```
>
> 这里：
>
> ```text
> run()
> ```
>
> 本身就是当前 Agent Loop。
>
> 我目前更倾向这个方案。
>
> ---
>
> # 12. 为什么这不代表“AgentRuntime 和 AgentLoop 是一个概念”
>
> 这是一个容易误解的地方。
>
> 我们可以在架构认知上明确：
>
> ```text
> AgentRuntime
> =
> 运行容器 / State Owner
>
> Agent Loop
> =
> run() 内部采用的执行算法
> ```
>
> 但在第一版代码里：
>
> ```text
> Agent Loop
> ```
>
> 不一定必须是独立文件或类。
>
> 就像：
>
> ```text
> 排序算法
> ```
>
> 可以只是：
>
> ```ts
> sort()
> ```
>
> 里面的一段实现。
>
> 不能因为概念叫：
>
> ```text
> Agent Loop
> ```
>
> 就必须创建：
>
> ```text
> class AgentLoop
> ```
>
> ---
>
> # 13. 什么时候才值得拆独立 AgentLoop？
>
> 未来如果出现：
>
> ```text
> AgentRuntime
> ├── run()
> ├── resume()
> ├── abort()
> ├── session recovery
> └── multiple execution modes
> ```
>
> 或者：
>
> ```text
> Loop
> 需要独立注入：
> - ContextBuilder
> - ToolExecutor
> - EventEmitter
> - Approval
> - AbortSignal
> ```
>
> 这时候：
>
> ```text
> agent-loop.ts
> ```
>
> 可能自然有价值。
>
> 特别到了 VII-C～VII-H：
>
> ```text
> model
> ↓
> tool
> ↓
> model
> ↓
> approval
> ↓
> tool
> ↓
> ...
> ```
>
> Loop 逻辑会明显长起来。
>
> 到那时再提取：
>
> ```ts
> runAgentLoop(...)
> ```
>
> 属于：
>
> > **需求驱动的 Extract Function / Extract Module（提取函数 / 提取模块）**
>
> 而不是：
>
> > 为未来预留架构。
>
> 这更符合我们的 Mini Runtime 学习目标。
>
> ---
>
> # 14. 所以我目前倾向 VII-B 的模块最小结构
>
> 大致概念上：
>
> ```text
> src/
> ├── messages/
> ├── model/
> └── runtime/
>     ├── runtime-state.ts
>     └── agent-runtime.ts
> ```
>
> 测试：
>
> ```text
> test/
> ├── openai-mappings.test.ts
> └── agent-runtime.test.ts
> ```
>
> 如果 `RunOutcome` 很简单，可以：
>
> ```text
> 定义在 agent-runtime.ts
> ```
>
> 甚至不需要：
>
> ```text
> run-outcome.ts
> ```
>
> 除非它开始被多个模块共同使用。
>
> ---
>
> # 15. 那 `RuntimeState` 要不要单独文件？
>
> 这个我认为 **值得**。
>
> 因为它代表一个真正独立的核心概念：
>
> ```text
> RuntimeState
> ```
>
> 而且后面 VII-C、VII-D、VII-G 都会围绕它演进。
>
> 尤其 README 明确把 VII-B 的一个核心目标定义为：
>
> > RuntimeState 最小事实模型。fileciteturn0file1
>
> 所以单独：
>
> ```text
> runtime-state.ts
> ```
>
> 不是为了目录好看，而是：
>
> > 这是未来 Runtime 的核心数据边界。
>
> ---
>
> # 16. `RunOutcome` 要不要单独文件？
>
> 目前我倾向：
>
> > 不需要。
>
> 原因是目前它只是：
>
> ```text
> AgentRuntime.run()
> ```
>
> 的返回契约。
>
> 如果单独：
>
> ```text
> run-outcome.ts
> ```
>
> 会有点过早。
>
> 等以后：
>
> ```text
> Session
> Event
> Approval
> API layer
> ```
>
> 都开始消费 RunOutcome，再考虑提取。
>
> ---
>
> # 17. MockModelProvider 放哪里？
>
> 这个也要避免一个常见错误：
>
> ```text
> src/model/mock-model-provider.ts
> ```
>
> 我反而不太赞成。
>
> 为什么？
>
> 因为 MockModelProvider（模拟模型提供者）现在唯一用途是：
>
> ```text
> 测试 Agent Runtime
> ```
>
> 它不是 Production Runtime Capability（生产运行能力）。
>
> 所以更合理是：
>
> ```text
> test/support/mock-model-provider.ts
> ```
>
> 或者直接在：
>
> ```text
> agent-runtime.test.ts
> ```
>
> 里定义一个极小 Test Double（测试替身）。
>
> ---
>
> # 18. 我更倾向先放在 test support
>
> 如果测试超过一个场景：
>
> ```text
> stop
> tool_calls
> provider error
> multi-run conversation
> ```
>
> 那么：
>
> ```text
> test/support/mock-model-provider.ts
> ```
>
> 就比较合理。
>
> 它可以做两件事：
>
> ```text
> responses queue
> requests history
> ```
>
> 比如概念上：
>
> ```text
> responses:
> [
>   response1,
>   response2
> ]
>
> requests:
> []
> ```
>
> 每次：
>
> ```text
> generate()
> ```
>
> 执行：
>
> ```text
> requests.push(request)
> return responses.shift()
> ```
>
> 足够了。
>
> 绝对不要加：
>
> ```text
> prompt matching
> tool simulation
> regex routing
> delay
> streaming
> ```
>
> 除非后续测试真实需要。
>
> ---
>
> # 19. 一个非常值得测试的场景：多次 `run()`，而不是一次 run 多 loop
>
> 这个点可能正好解决“VII-B 看起来没有真正多轮”的疑惑。
>
> 例如：
>
> ```text
> runtime.run("Hello")
> ↓
> assistant: Hi
> ```
>
> State：
>
> ```text
> user: Hello
> assistant: Hi
> ```
>
> 然后同一个 Runtime：
>
> ```text
> runtime.run("How are you?")
> ```
>
> 第二次 ModelRequest 应该收到：
>
> ```text
> user: Hello
> assistant: Hi
> user: How are you?
> ```
>
> 然后：
>
> ```text
> assistant: I'm good
> ```
>
> 最终 RuntimeState：
>
> ```text
> user: Hello
> assistant: Hi
> user: How are you?
> assistant: I'm good
> ```
>
> 注意：
>
> > 这不是一个 Run 内的多 Loop。
>
> 而是：
>
> ```text
> Run #1
> Run #2
> ```
>
> 共享同一个 RuntimeState。
>
> 这反而非常适合 VII-B。
>
> 因为它能验证：
>
> ```text
> RuntimeState 真的是跨 Model Turn 持续存在的
> ```
>
> 而不需要提前实现 Tool Loop。
>
> ---
>
> # 20. 这个测试非常重要，因为它验证 State Ownership
>
> 如果第二次：
>
> ```text
> runtime.run("How are you?")
> ```
>
> Provider 收到了：
>
> ```text
> 完整历史
> ```
>
> 就说明：
>
> ```text
> AgentRuntime
> ```
>
> 真的在拥有 conversation state。
>
> 而不是：
>
> ```text
> run()
> ```
>
> 只是一个无状态 Provider wrapper。
>
> 这其实是 VII-B 非常核心的 Acceptance Test（验收测试）。
>
> ---
>
> # 21. 所以 VII-B 完全可以没有“一个 run 多次 provider.generate()”
>
> 但仍然真正实现了：
>
> ```text
> Runtime State
> +
> Agent execution
> +
> Conversation progression
> ```
>
> 我们可以把两个概念明确区分：
>
> ```text
> Conversation Multi-turn
> 多轮会话
>
> ≠
>
> Single-run Multi-step Loop
> 单次运行中的多步骤循环
> ```
>
> VII-B 可以首先真正实现：
>
> ```text
> Conversation Multi-turn
> ```
>
> VII-C 再首次实现：
>
> ```text
> Single-run Multi-step Loop
> ```
>
> 例如：
>
> ```text
> user
> ↓
> model(tool call)
> ↓
> tool
> ↓
> model(final)
> ```
>
> 这是一个非常自然的阶段划分。
>
> ---
>
> # 22. 我觉得这个认知甚至应该写进 Milestone Note
>
> 因为否则以后回头看 VII-B：
>
> > “你不是说实现 Agent Loop 吗，怎么一次 run 只调一次 LLM？”
>
> 容易误解。
>
> 准确说应该是：
>
> > VII-B 建立 **Agent Loop 的状态驱动骨架和生命周期解释权**；由于 Tool Action 尚未进入 Scope，当前单次 Run 不人为制造多步骤模型循环。真正的第一次 `continue` 将由 VII-C 的 Tool Result 回流触发。
>
> 这个说法就很准确。
>
> ---
>
> # 23. 当前 Architecture Analysis 基本已经可以收尾
>
> 我建议最终确定的架构结构是：
>
> ```text
> AgentRuntime
> │
> ├── owns RuntimeState
> │       └── messages
> │
> ├── owns ModelProvider dependency
> │
> ├── run(userInput)
> │       │
> │       ├── append RuntimeUserMessage
> │       ├── derive current ModelMessages
> │       ├── provider.generate()
> │       ├── convert + append model_output
> │       ├── interpret finishReason
> │       └── return RunOutcome
> │
> └── read-only message inspection
> ```
>
> 而不是：
>
> ```text
> AgentRuntime
> ↓
> AgentLoop class
> ↓
> RuntimeState manager
> ↓
> RunController
> ↓
> TurnEngine
> ```
>
> 后面那套现在完全没有必要。
>
> ---
>
> # 24. 现在 5 个 Design Decisions 可以进一步修正为最终候选
>
> ### D1 — RuntimeState
>
> ```text
> 只保存跨 Model Turn 延续的 Runtime Facts。
> 第一版仅 messages。
> ```
>
> ### D2 — Ownership
>
> ```text
> AgentRuntime 是 RuntimeState 唯一 mutation owner。
> 外部最多读取 snapshot。
> ```
>
> ### D3 — Loop
>
> ```text
> Agent Loop 是 AgentRuntime.run() 的执行算法；
> VII-B 不要求独立 AgentLoop 类/模块。
> ```
>
> ### D4 — Next Action vs RunOutcome
>
> 这是我们刚刚修正后的重要版本：
>
> ```text
> ModelResponse
> ↓
> Runtime interprets next action
> ↓
> 如果还能继续 → next loop
> 如果结束 → RunOutcome
> ```
>
> 所以：
>
> > **RunOutcome 永远不用于驱动下一个 Loop。**
>
> ### D5 — Current termination
>
> VII-B：
>
> ```text
> stop
> → completed
>
> tool_calls
> → 当前缺少 Tool capability
> → unsupported outcome
>
> length / unknown
> → 当前无恢复策略
> → unsupported outcome
>
> Provider exception
> → 继续向上传播
> ```
>
> ---
>
> 我认为 **Architecture Analysis（架构分析）阶段到这里实际上已经足够完整了**。
>
> 接下来应该进入固定流程的下一阶段：
>
> # Design Decision（设计决策）
>
> 下一步不再继续发散方案，而是把我们刚刚讨论出的内容正式固化成一份 **VII-B Confirmed Design Decisions**，逐条确认：
>
> - State 模型；
> - Ownership；
> - `run()` contract；
> - RunOutcome；
> - FinishReason 解释；
> - MockModelProvider；
> - 模块边界；
> - Scope / Deferred。
>
> 确认完这一版后，再进入 **Codex Implementation Task**，而不是继续无限讨论。

## 会话轮次 6

原始 turn ID：`d96ea7f0-2730-4a33-b8b6-058ee505ea68`。

### 用户

> 1. 那其实是我理解错了 RunOutcome代表已经执行结束了 loop 不再继续，而不是某个环节结束了还会继续
> 2. 我感觉你现在讲解的  有的地方我有点懵，但是又说不出哪里不懂，你能懂我的感觉吗？这种感觉会影响接下来我们的讨论与判断吗？还是说往后你的讲解尽量接地气点？
> 3. 继续

### ChatGPT

> 对，你第 1 点现在理解是对的：
>
> > **RunOutcome = 整个 `run()` 已经结束后，对外给出的“这次运行最终结果”。**
>
> 它不是“某一个环节结束后的中间结果”。
>
> 更接地气地说：
>
> ```text
> run() 开始
>   ↓
> 模型想干什么
>   ↓
> Runtime 决定下一步
>   ↓
> 还能继续？——继续跑
> 不能/不需要继续？——run() 结束
>   ↓
> 这时候才有 RunOutcome
> ```
>
> 所以只要还会进入下一个 Loop，就还没到 RunOutcome。
>
> ---
>
> 至于你第 2 点，我懂你说的那种感觉。
>
> 不是“完全听不懂”，而是：
>
> > 每句话单独看都能理解，但概念层级开始变多以后，你脑子里还没有形成一个稳定画面，所以会出现“好像懂了，但让我自己判断方案时又有点虚”的感觉。
>
> 我觉得我们最近几轮确实有点讲得过于“架构语言化”了，比如连续出现：
>
> ```text
> ModelResponse
> Loop Decision
> Next Action
> RunOutcome
> RuntimeState
> Termination
> Capability
> Transition
> ```
>
> 这些概念本身没错，但**在还没有代码和真实运行画面之前，同时引入太多名词，确实容易让人悬空**。
>
> 这不会影响我们后续做正确判断，但有一个前提：
>
> > **后面不要继续用更多抽象名词去解释已有抽象名词。**
>
> 我会调整。
>
> 后面我们优先按照：
>
> ```text
> 先看一个真实场景
> ↓
> Runtime 此时手里有什么
> ↓
> 代码下一步要干什么
> ↓
> 为什么这么干
> ↓
> 最后才给这个东西起架构名字
> ```
>
> 来讲。
>
> 而不是先：
>
> ```text
> State Transition
> Loop Decision
> RunOutcome...
> ```
>
> 再让你反过来理解代码。
>
> ---
>
> # 那我们先把目前 VII-B 用一个很接地气的例子重新串一次
>
> 暂时忘掉前面那些名词。
>
> 假设我们未来写：
>
> ```ts
> const runtime = new AgentRuntime(provider);
>
> const result = await runtime.run("你好");
> ```
>
> Runtime 里面到底干了什么？
>
> 就 5 件事。
>
> ### 第一步：把用户的话记下来
>
> 原本：
>
> ```text
> messages = []
> ```
>
> 变成：
>
> ```text
> messages = [
>   user_input("你好")
> ]
> ```
>
> 这就是 RuntimeState（运行时状态）。
>
> 你可以先简单理解：
>
> > **RuntimeState 就是这个 Agent 到目前为止记着的真实聊天记录。**
>
> VII-B 第一版先别想复杂。
>
> ---
>
> ### 第二步：把历史消息交给模型
>
> Runtime 把：
>
> ```text
> user_input("你好")
> ```
>
> 转成模型认识的：
>
> ```text
> user: 你好
> ```
>
> 然后：
>
> ```ts
> provider.generate(...)
> ```
>
> VII-A 做的那些东西终于被 Runtime 用起来。
>
> ---
>
> ### 第三步：模型返回
>
> 比如模型说：
>
> ```text
> assistant: 你好，有什么可以帮助你的？
> finishReason = stop
> ```
>
> Runtime 先把：
>
> ```text
> assistant: 你好，有什么可以帮助你的？
> ```
>
> 记下来。
>
> 于是 State：
>
> ```text
> user: 你好
> assistant: 你好，有什么可以帮助你的？
> ```
>
> 到这里，不管后面怎么办，这条消息都已经真实发生了。
>
> ---
>
> ### 第四步：Runtime 看模型想干嘛
>
> 模型还告诉 Runtime：
>
> ```text
> finishReason = stop
> ```
>
> Runtime一看：
>
> > 模型已经直接回答完了，也没有要求我执行别的东西。
>
> 所以：
>
> ```text
> 这次 run() 到此结束。
> ```
>
> ---
>
> ### 第五步：返回 RunOutcome
>
> 比如概念上：
>
> ```text
> completed
> ```
>
> 意思就是：
>
> > **刚才 `runtime.run("你好")` 这一整个过程已经结束，并且正常完成。**
>
> 这就是 RunOutcome。
>
> ---
>
> # 再看天气这个例子，就更容易区分了
>
> 用户：
>
> ```text
> 北京天气怎么样？
> ```
>
> Runtime：
>
> ```text
> 先记 user_input
> ↓
> 调用模型
> ```
>
> 模型返回：
>
> ```text
> 我需要调用 getWeather
> finishReason = tool_calls
> ```
>
> Runtime还是先把这个模型输出记下来：
>
> ```text
> messages:
> 1. user: 北京天气怎么样？
> 2. assistant: tool_call(getWeather)
> ```
>
> 然后 Runtime 看：
>
> > 哦，模型下一步想让我执行 Tool。
>
> ---
>
> ## 到 VII-B
>
> 我们还不会执行 Tool。
>
> 所以：
>
> ```text
> 想继续
> ↓
> 但是缺 ToolExecutor
> ↓
> 没法继续
> ↓
> 当前 run() 结束
> ```
>
> 于是才产生：
>
> ```text
> RunOutcome = unsupported
> ```
>
> 这个 `unsupported` 不是说：
>
> > 模型错了。
>
> 而是：
>
> > **你这个要求我认识，但我现在这版 Runtime 还没这个能力。**
>
> ---
>
> ## 到 VII-C
>
> 就不一样了。
>
> 模型：
>
> ```text
> tool_calls
> ```
>
> Runtime：
>
> ```text
> 哦，要执行 Tool。
> ↓
> ToolExecutor.execute()
> ↓
> 得到北京 25°C
> ↓
> 把 tool_result 记入 State
> ```
>
> 此时：
>
> ```text
> run() 还没结束
> ```
>
> 所以**没有 RunOutcome**。
>
> 继续：
>
> ```text
> 再调用模型
> ↓
> 模型：北京今天 25°C
> ↓
> finishReason = stop
> ```
>
> 这时候：
>
> ```text
> run() 终于结束
> ```
>
> 才有：
>
> ```text
> RunOutcome = completed
> ```
>
> 所以你可以把它死记成一句非常简单的话：
>
> > **RunOutcome 就像函数最后的 `return`；只要还要继续 `while`，就还没 return。**
>
> 这个理解已经够用了。
>
> ---
>
> # 这样再回来看 VII-B，其实没有那么多东西
>
> 这一 Part 真正就解决三个问题：
>
> ### ① Agent 把聊天记录放哪？
>
> ```text
> RuntimeState
> ```
>
> 第一版：
>
> ```ts
> {
>   messages: [...]
> }
> ```
>
> ---
>
> ### ② 谁负责不断调用模型、记录结果？
>
> ```text
> AgentRuntime.run()
> ```
>
> 也就是我们说的 Agent Loop（Agent 循环）。
>
> 第一版它可能只执行一次模型调用。
>
> 没关系。
>
> ---
>
> ### ③ `run()` 什么时候算结束？
>
> 比如：
>
> ```text
> 模型正常回答完
> → completed
>
> 模型要求调用 Tool，但 VII-B 还没有 Tool
> → unsupported
> ```
>
> 结束以后再把：
>
> ```text
> RunOutcome
> ```
>
> 返回给调用者。
>
> 其实就这些。
>
> ---
>
> # 现在继续我们的 Design Decision，但这次不用那么抽象
>
> 目前我认为下面这些已经可以确定了。
>
> ## 1. RuntimeState 第一版只存 messages
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 为什么？
>
> 因为我们目前真正需要“下次还记得”的就只有聊天历史。
>
> 先不加：
>
> ```text
> status
> iteration
> usage
> finishReason
> ```
>
> 以后真用到再加。
>
> ---
>
> ## 2. AgentRuntime 自己管理 State
>
> 外部使用：
>
> ```ts
> runtime.run("你好");
> ```
>
> 而不是：
>
> ```ts
> state.messages.push(...)
> ```
>
> 也就是说：
>
> > 调用者负责告诉 Agent“用户说了什么”，Runtime 自己负责记账。
>
> 这个应该很好理解。
>
> ---
>
> ## 3. 第一版不额外拆 `AgentLoop` 类
>
> 我们直接：
>
> ```ts
> class AgentRuntime {
>   async run(input) {
>     // 这里就是当前的 Agent Loop
>   }
> }
> ```
>
> 先做到这里。
>
> 以后 VII-C 加 Tool 后，这段代码明显复杂起来，再考虑：
>
> ```text
> agent-loop.ts
> ```
>
> 不提前拆。
>
> ---
>
> # 4. 有一个地方我想稍微修改我们之前的方案
>
> 前面我们讨论：
>
> ```text
> RunOutcome:
> completed
> unsupported
> ```
>
> 这个思路我仍然认为是对的。
>
> 但现在我觉得**没必要在 Architecture Analysis 阶段过早确定它具体的 TypeScript 类型形状**。
>
> 比如之前我写：
>
> ```ts
> type RunOutcome =
>   | {
>       type: "completed";
>       message: RuntimeAssistantMessage;
>     }
>   | {
>       type: "unsupported";
>       ...
>     };
> ```
>
> 这已经开始接近实现细节了。
>
> 我们现在只需要先确认语义：
>
> ```text
> run() 要能区分：
> 1. 正常完成
> 2. 模型要求当前 Runtime 不支持的后续动作
> ```
>
> 至于 Codex 实现前再决定：
>
> ```text
> 字段叫什么
> 是否带 message
> 是否带 finishReason
> ```
>
> 这样我们不会在还没写代码前，把类型设计得太死。
>
> ---
>
> # 5. MockModelProvider 也用最简单的话理解
>
> 它就是一个：
>
> > **假的 LLM。**
>
> 但不是“聪明的假 LLM”。
>
> 而是我们提前告诉它：
>
> ```text
> 你第一次被调用，就返回："你好"
> ```
>
> Runtime 调它：
>
> ```text
> 你好
> ```
>
> 然后我们检查：
>
> ```text
> Runtime 有没有把用户消息传过去？
> Runtime 有没有把模型回答保存下来？
> Runtime 有没有正确结束？
> ```
>
> 目的只是测试 Runtime。
>
> 就这么简单。
>
> ---
>
> # 6. 七-B 最重要的测试，我现在建议只抓 3 类
>
> ### 场景一：最普通回答
>
> ```text
> User: Hello
> ↓
> Model: Hi
> ↓
> Runtime 结束
> ```
>
> 验证：
>
> ```text
> messages 正确
> 结果 completed
> provider 调 1 次
> ```
>
> ---
>
> ### 场景二：同一个 Runtime 连续聊天
>
> 第一次：
>
> ```text
> User: Hello
> Model: Hi
> ```
>
> 第二次：
>
> ```text
> User: How are you?
> ```
>
> 这时候模型应该收到：
>
> ```text
> User: Hello
> Assistant: Hi
> User: How are you?
> ```
>
> 验证：
>
> > RuntimeState 确实保存了上下文。
>
> 这个测试其实特别重要。
>
> ---
>
> ### 场景三：模型要求调用 Tool
>
> ```text
> User: 北京天气
> ↓
> Model: tool_call(getWeather)
> ```
>
> VII-B：
>
> ```text
> 不执行 Tool
> 不再次调用模型
> ```
>
> 但是：
>
> ```text
> 这个 tool_call 模型消息要保存下来
> ```
>
> 然后：
>
> ```text
> run() 返回“当前能力不支持继续”
> ```
>
> 到 VII-C 再把这一条路径接着实现。
>
> ---
>
> # 7. 这样你再看整体演进会非常顺
>
> VII-A：
>
> ```text
> 我已经会调用 LLM 了。
> ```
>
> VII-B：
>
> ```text
> 我有一个 Runtime，
> 它会记住对话，
> 会调用 LLM，
> 会记录回答，
> 会判断这次运行结束没有。
> ```
>
> VII-C：
>
> ```text
> 模型如果说“我要调用 Tool”，
> Runtime 终于会执行 Tool，
> 然后继续问 LLM。
> ```
>
> VII-D：
>
> ```text
> 对话越来越复杂，
> 不能每次直接把所有 State 扔给 LLM，
> 所以加入 ContextBuilder。
> ```
>
> 这样就顺了。
>
> ---
>
> # 8. 这不会影响我们继续做架构判断
>
> 反而我建议你现在不用要求自己把所有概念都“彻底吃透”再往下走。
>
> 我们这次是**工程实现式学习**。
>
> 很多概念会经历：
>
> ```text
> 现在知道大概是什么意思
> ↓
> Codex 写出来
> ↓
> 我们真实运行
> ↓
> 你看到 State 怎么变化
> ↓
> Code Review 再看设计
> ↓
> 这时候突然完全理解
> ```
>
> 这很正常。
>
> 尤其 Agent Runtime 本身就是一个强动态流程，仅靠静态架构图很容易产生你刚才那种悬空感。
>
> 后面我会更多使用：
>
> ```text
> “现在代码手里有什么？”
> “下一行该干嘛？”
> “如果不这么干会发生什么？”
> ```
>
> 这种方式带你讨论。
>
> ---
>
> 按照我们刚刚已经讨论的内容，我认为 **Architecture Analysis 已经可以结束，不需要继续挖更多概念**。
>
> 下一步我们进入：
>
> > **Design Decision（设计决策）**
>
> 我会先把 VII-B 已经讨论出的结论整理成一份很短、很明确的 **Confirmed Design Decisions 候选稿**，每条都用“我们最终决定怎么做 + 为什么”来写，不继续加新架构概念。然后我们一起检查有没有哪条你觉得不踏实，再进入 Codex Implementation Task。

## 会话轮次 7

原始 turn ID：`7d11ac5e-e83e-4baa-9d6a-f01d2cc54157`。

### 用户

> 1. 你用通俗点的讲解好理解多了  我明白了 感谢。【7. 这样你再看整体演进会非常顺】这一部分的通俗化很接地气
> 2. 继续

### ChatGPT

> 好，那我们继续，而且后面 VII-B 我就尽量保持这种“先看 Runtime 现在手里有什么、下一步要干嘛”的讲法。
>
> 现在进入正式的 **Design Decision（设计决策）**。这一阶段我们不再扩展新方案，只把刚才讨论过的结论收拢成一份可以拿去指导实现的版本。
>
> ## VII-B Confirmed Design Decisions 候选稿
>
> ### 1. RuntimeState 第一版只保存 `messages`
>
> 先简单理解：
>
> > RuntimeState 就是 Runtime 目前真正“记住”的东西。
>
> VII-B 当前唯一确定需要跨轮保存的，就是：
>
> ```ts
> interface RuntimeState {
>   messages: RuntimeMessage[];
> }
> ```
>
> 暂时不放：
>
> ```text
> iteration
> status
> finishReason
> usage
> error
> maxTurns
> provider
> ```
>
> 原因很简单：
>
> - `iteration` 是这次循环跑到第几步，不是长期记忆；
> - `maxTurns` 是规则，不是事实；
> - `finishReason` 是某一次模型调用的结果；
> - `usage` 当前还没有统计需求；
> - `status` 现在还没有暂停、恢复、并发这些场景；
> - `provider` 是依赖，不是状态。
>
> 这和 VII-A 已经确定的边界是一致的：Runtime 保存自己的事实，不把 Provider 调用细节直接变成 Runtime State。fileciteturn0file0
>
> ---
>
> ### 2. `AgentRuntime` 是 State 的唯一修改者
>
> 外部使用方式应该像：
>
> ```ts
> await runtime.run("Hello");
> ```
>
> 而不是：
>
> ```ts
> runtime.state.messages.push(...)
> ```
>
> 换句话说：
>
> > 外部只负责告诉 Runtime “用户说了什么”，至于这句话怎么记、模型回答怎么记，都由 Runtime 自己处理。
>
> 可以允许外部读取历史，例如：
>
> ```text
> getMessages()
> ```
>
> 但读到的应该是只读视图或拷贝，不能让调用方直接改内部数组。
>
> 所以：
>
> ```text
> 读 State：可以
> 改 State：Runtime 自己来
> ```
>
> 这就是 State Ownership（状态所有权）。
>
> ---
>
> ### 3. VII-B 不单独创建 `AgentLoop` 类
>
> 第一版直接：
>
> ```ts
> class AgentRuntime {
>   async run(input: string) {
>     // 当前 Agent Loop 就在这里
>   }
> }
> ```
>
> 原因不是说 Agent Loop（Agent 循环）不重要，而是现在它还很小。
>
> 目前 `run()` 基本只是：
>
> ```text
> 记用户消息
> ↓
> 调用模型
> ↓
> 记模型回答
> ↓
> 判断这次 run 是否结束
> ```
>
> 这时候再拆：
>
> ```text
> AgentRuntime
> → AgentLoop
> → RuntimeStateManager
> ```
>
> 只是增加文件和层级，并没有真实职责收益。
>
> 以后 VII-C 加入 Tool 后，Loop 真的变复杂了，再决定要不要提取独立模块。
>
> ---
>
> ### 4. 一次 `run()` 的基本流程固定下来
>
> 例如：
>
> ```ts
> await runtime.run("Hello");
> ```
>
> 内部顺序应该是：
>
> ```text
> 1. 把 "Hello" 变成 RuntimeUserMessage
> 2. 写进 RuntimeState.messages
> 3. 把当前 RuntimeMessage 转成 ModelMessage
> 4. 构造 ModelRequest
> 5. 调用 ModelProvider.generate()
> 6. 拿到 ModelResponse
> 7. 把 assistant message 转成 Runtime model_output
> 8. 先写入 RuntimeState
> 9. 再根据 finishReason 判断这次 run 怎么结束
> 10. 返回 RunOutcome
> ```
>
> 这里第 8 步很重要。
>
> 假如模型返回：
>
> ```text
> tool_call(getWeather)
> ```
>
> 即使 VII-B 还不会执行 Tool，这个模型输出也已经真实发生了，所以必须先保存。
>
> 不能：
>
> ```text
> 看到 tool_calls
> ↓
> 发现现在不支持
> ↓
> 直接 return
> ↓
> 模型这条消息丢了
> ```
>
> ---
>
> ### 5. `RunOutcome` 只在整个 `run()` 结束时产生
>
> 这点我们刚刚已经彻底厘清了。
>
> 可以直接把它理解成：
>
> > `RunOutcome` 就是 `run()` 最后的 `return`。
>
> 如果还会：
>
> ```text
> 执行 Tool
> ↓
> 再调模型
> ```
>
> 那就还没有 RunOutcome。
>
> 概念关系是：
>
> ```text
> 模型返回
> ↓
> Runtime 看下一步要干嘛
> ↓
> 还能继续？
> ├─ 能 → 继续 Loop
> └─ 不能/不需要 → run 结束 → RunOutcome
> ```
>
> VII-B 当前因为还没有 Tool Executor，所以一次 `run()` 大概率只调用一次模型。
>
> 这没有问题。
>
> ---
>
> ### 6. VII-B 对 `finishReason` 的处理
>
> 当前 VII-A 已经有：
>
> ```text
> stop
> tool_calls
> length
> unknown
> ```
>
> VII-B 暂定这样解释：
>
> ```text
> stop
> → 模型已经正常回答完
> → run 正常完成
>
> tool_calls
> → 模型希望 Runtime 执行 Tool
> → 但 VII-B 还没有 ToolExecutor
> → 当前 run 不能继续
> → 返回“当前能力不支持继续”的结果
>
> length
> → 模型因为长度限制结束
> → VII-B 没有自动续写策略
> → 当前 run 不继续
>
> unknown
> → Runtime 不知道模型为什么结束
> → 不猜
> → 当前 run 不继续
> ```
>
> 最关键的是：
>
> > `tool_calls` 不是模型出错，而是当前 Runtime 能力还没接上。
>
> 到了 VII-C：
>
> ```text
> tool_calls
> → ToolExecutor
> → tool_result
> → 再调模型
> ```
>
> 这条路就会从“不能继续”升级成“正常继续”。
>
> README 对 VII-B / VII-C 的边界本来就是这样划分的。fileciteturn0file1
>
> ---
>
> ### 7. Provider 自己抛出的错误继续向上抛
>
> 例如：
>
> ```text
> 401
> 429
> 网络错误
> JSON mapping 错误
> ```
>
> VII-B 不做：
>
> ```text
> try/catch
> ↓
> 统一包装成 RunOutcome.failed
> ```
>
> 因为 VII-A 已经确认了：
>
> > 当前 Provider 错误保持真实失败事实，自然向上传播，不提前搞 Retry / Error Normalization。fileciteturn0file0
>
> 所以：
>
> ```text
> 模型正常返回，但 Runtime 不支持下一步
> ```
>
> 和：
>
> ```text
> Provider 调用本身失败
> ```
>
> 是两回事。
>
> 前者是正常控制流结束。
>
> 后者是异常。
>
> ---
>
> ### 8. `RunOutcome` 保持最小，不提前设计后续状态
>
> 现在只需要能表达两件事：
>
> ```text
> 这次 run 正常完成
>
> 这次 run 因当前能力不足无法继续
> ```
>
> 先不提前放：
>
> ```text
> aborted
> waiting_approval
> suspended
> failed
> tool_executing
> session_closed
> ```
>
> 因为 Abort 是 VII-F，Approval 是 VII-H。fileciteturn0file1
>
> 至于最终 TypeScript 到底叫：
>
> ```text
> completed
> unsupported
> ```
>
> 还是其他命名，可以在 Implementation Task 再落具体字段。
>
> 现在先锁语义，不急着锁字面。
>
> ---
>
> ### 9. MockModelProvider 只是测试用“假模型”
>
> 它不进入 Production Core。
>
> 最小能力：
>
> ```text
> 1. 提前准备几个 ModelResponse
> 2. generate() 每调用一次就拿一个返回
> 3. 记录 Runtime 实际传给它的 ModelRequest
> ```
>
> 例如：
>
> ```text
> 我提前告诉 Mock：
>
> 第一次调用 → 回 "Hello"
> 第二次调用 → 回 "I'm fine"
> ```
>
> 然后测试 Runtime 有没有：
>
> ```text
> 把正确历史传给模型
> 把模型回答记进 State
> 按预期结束
> ```
>
> 不让 Mock 自己“理解 prompt”，也不模拟 Tool Executor。
>
> ---
>
> ### 10. VII-B 最重要的三个测试场景
>
> #### 场景 A：普通问答
>
> ```text
> User: Hello
> ↓
> Model: Hi
> ↓
> run completed
> ```
>
> 检查：
>
> ```text
> Provider 调 1 次
> State 有 user + assistant
> 结果是正常完成
> ```
>
> #### 场景 B：同一个 Runtime 连续两次 run
>
> 第一次：
>
> ```text
> User: Hello
> Model: Hi
> ```
>
> 第二次：
>
> ```text
> User: How are you?
> ```
>
> 第二次 Provider 应看到：
>
> ```text
> User: Hello
> Assistant: Hi
> User: How are you?
> ```
>
> 这个场景最能证明：
>
> > **我们写的不是一个 ModelProvider Wrapper，而是真的有 RuntimeState。**
>
> #### 场景 C：模型请求 Tool
>
> ```text
> User: 北京天气
> ↓
> Model: tool_call(getWeather)
> ```
>
> VII-B 验证：
>
> ```text
> Tool 不执行
> Provider 不再调第二次
> tool_call 消息已经保存
> run 明确告诉调用方“当前能力无法继续”
> ```
>
> VII-C 就从这里接着开发。
>
> ---
>
> ## 用一句特别通俗的话总结 VII-B
>
> VII-A 是：
>
> > **我会跟 LLM 说话了。**
>
> VII-B 是：
>
> > **我现在有一个 Runtime，它会记住你们聊过什么，会自己去问 LLM，会把 LLM 的回答记下来，还知道这次活儿是不是已经干完了。**
>
> VII-C 才是：
>
> > **如果 LLM 说“这事我得先查个工具”，Runtime 真会去查，然后回来继续问 LLM。**
>
> 这就是我们目前要做的全部，不需要把 VII-B 想成一个很重的 Runtime Framework。
>
> ---
>
> 我认为这 10 条已经可以作为 **VII-B 的 Confirmed Design Decisions** 进入下一步了。
>
> 接下来固定流程就是 **Codex Implementation**。下一步我们应该基于这些已经确认的设计，生成一份可直接给 Codex 的 **`Codex Implementation Task — Part VII-B`**，其中会把 Scope、文件边界、Acceptance Criteria 和“严禁提前实现 VII-C～VII-H”写清楚。

## 会话轮次 8

原始 turn ID：`c0ae79cc-7e0c-400a-911b-9037d2d00ee5`。

### 用户

> 继续

### ChatGPT

> 可以，我们现在正式进入固定流程的下一步：
>
> **Codex Implementation**
>
> 下面这份就是可以直接给 Codex 的 **Part VII-B 实现任务**。我会保持它只实现我们刚刚确认的范围，不提前进入 Tool、ContextBuilder、Event、Abort、Session、Approval。VII-B 的总体目标也与 README 中定义的 RuntimeState、Agent Loop、ModelResponse 写回、终止语义和 MockModelProvider 一致。fileciteturn0file1
>
> :::writing{variant="document" id="58321"}
> # 📋 Codex Implementation Task — Part VII-B：RuntimeState + Agent Loop
>
> 我们当前正在实现：
>
> **Part VII：Mini Agent Runtime Implementation**
>
> 这是一个 Node.js + TypeScript 的最小 Agent Runtime 工程。
>
> Part VII 按照 A～I 共 9 个 Milestone 增量实现。
>
> 当前状态：
>
> ```text
> Part VII-A  [Done]     项目骨架 + 类型体系 + ModelProvider
> Part VII-B  [Current]  RuntimeState + Agent Loop
> Part VII-C  [Planned]  Tool Registry + Tool Executor + Error Contract
> Part VII-D  [Planned]  ContextBuilder + TurnSnapshot
> Part VII-E  [Planned]  AgentEvent + Subscriber
> Part VII-F  [Planned]  Abort + Single Active Run
> Part VII-G  [Planned]  SessionStore + Conversation Recovery
> Part VII-H  [Planned]  beforeToolCall + 简单 Approval
> Part VII-I  [Planned]  Weather Agent 完整链路
> ```
>
> 当前 Milestone 的架构讨论已经完成。
>
> 请不要重新设计已经确认的架构，也不要为了未来扩展提前实现后续能力。
>
> 你的任务是：
>
> > 基于 Part VII-A 当前真实代码，增量实现 Part VII-B。
>
> ---
>
> # 1. Milestone Goal
>
> Part VII-B 的目标是让项目第一次拥有真正的 Runtime execution ownership。
>
> 完成后需要能够做到：
>
> ```text
> User Input
>    ↓
> AgentRuntime
>    ↓
> RuntimeState
>    ↓
> ModelRequest
>    ↓
> ModelProvider.generate()
>    ↓
> ModelResponse
>    ↓
> RuntimeState
>    ↓
> Run ends
> ```
>
> 这一阶段主要验证四件事：
>
> 1. Runtime 能够拥有并持续维护 Conversation State；
> 2. Runtime 能够根据当前 State 调用现有 ModelProvider；
> 3. ModelResponse 能够被转换为 Runtime Fact 并写回 State；
> 4. Runtime 能够判断当前一次 `run()` 是否正常完成，或者由于当前能力边界无法继续。
>
> Part VII-B 不是完整 Tool Agent。
>
> 当前单次 `run()` 不要求人为制造多次 ModelProvider 调用。
>
> 真正的：
>
> ```text
> Model
> → Tool
> → Model
> ```
>
> 多步骤循环将在 Part VII-C 出现 ToolExecutor 后自然形成。
>
> ---
>
> # 2. Current Repository State
>
> Part VII-A 已经完成以下稳定能力。
>
> ## 2.1 Runtime message layer
>
> 当前已经存在 Runtime 自己拥有的消息事实类型：
>
> ```text
> RuntimeMessage
> ├── user_input
> ├── model_output
> └── tool_result
> ```
>
> 同时存在：
>
> ```text
> ModelMessage
> ├── user
> ├── assistant
> └── tool
> ```
>
> 两者语义不同：
>
> ```text
> RuntimeMessage
> =
> Runtime 内部保存的事实
>
> ModelMessage
> =
> 某一次提供给 ModelProvider 的模型消息视图
> ```
>
> 当前已经存在：
>
> ```text
> RuntimeMessage
> ↓
> toModelMessage()
> ↓
> ModelMessage
> ```
>
> Part VII-B 必须继续使用这一边界。
>
> 不要合并 RuntimeMessage 与 ModelMessage。
>
> ---
>
> ## 2.2 Model Contract
>
> 当前已经存在：
>
> ```text
> ModelRequest
> ModelResponse
> ModelProvider
> FinishReason
> ModelUsage
> ToolCall
> ToolDefinition
> ```
>
> 其中：
>
> ```ts
> interface ModelProvider {
>   generate(request: ModelRequest): Promise<ModelResponse>;
> }
> ```
>
> Part VII-B 必须依赖这个接口，而不是直接依赖 OpenAI SDK。
>
> ---
>
> ## 2.3 Provider Boundary
>
> 当前已有：
>
> ```text
> OpenAIModelProvider
> ```
>
> 以及 OpenAI Chat Completions mapping。
>
> Runtime Core 不允许引用 OpenAI SDK 类型。
>
> OpenAI Provider 当前：
>
> - 保存 Provider 配置；
> - 不保存 conversation messages；
> - 不保存 RuntimeState；
> - 不决定 Agent 生命周期。
>
> 该边界已经确认，请不要修改。
>
> ---
>
> ## 2.4 Existing error semantics
>
> Part VII-A 已确认：
>
> - Provider mapping 错误显式失败；
> - malformed tool arguments 不允许静默降级；
> - OpenAI / Provider 调用异常当前自然向上传播；
> - 当前不实现 Provider Error normalization；
> - 当前不实现 Retry / fallback。
>
> Part VII-B 不得改变这一语义。
>
> ---
>
> # 3. Confirmed Design Decisions
>
> 以下内容已经完成架构讨论，请严格执行。
>
> ---
>
> ## Decision 1：RuntimeState 第一版保持最小
>
> RuntimeState 第一版只保存：
>
> ```ts
> messages: RuntimeMessage[]
> ```
>
> 不要加入：
>
> ```text
> iteration
> status
> finishReason
> usage
> error
> maxTurns
> provider
> sessionId
> createdAt
> updatedAt
> ```
>
> 原因：
>
> RuntimeState 当前只保存跨 Model Turn 持续存在的 Runtime Facts。
>
> Loop 局部控制变量、配置、Provider 调用结果都不属于 RuntimeState。
>
> ---
>
> ## Decision 2：AgentRuntime 是 RuntimeState 的唯一 mutation owner
>
> 外部使用方式应该类似：
>
> ```ts
> await runtime.run("Hello");
> ```
>
> 调用方不得：
>
> ```ts
> runtime.state.messages.push(...)
> ```
>
> AgentRuntime 自己负责：
>
> ```text
> 写入 user_input
> 写入 model_output
> ```
>
> 如果需要暴露历史消息，只允许暴露只读视图或拷贝。
>
> 不得向调用方暴露可直接修改的 RuntimeState reference。
>
> ---
>
> ## Decision 3：第一版不要单独设计 AgentLoop class
>
> Part VII-B 当前 Agent Loop 逻辑保持在：
>
> ```text
> AgentRuntime.run()
> ```
>
> 内部。
>
> 不要提前创建：
>
> ```text
> AgentLoop class
> RuntimeStateManager
> RunController
> TurnEngine
> LoopStrategy
> ```
>
> 当前职责还不足以支撑这些抽象。
>
> 未来如果 Part VII-C～VII-H 使 Loop 明显复杂，再根据真实代码决定是否 Extract Module。
>
> ---
>
> ## Decision 4：一次 run() 的基本执行顺序
>
> 一次：
>
> ```ts
> runtime.run(userInput)
> ```
>
> 应遵循：
>
> ```text
> 1. 接收 userInput
> 2. 创建 RuntimeUserMessage
> 3. append 到 RuntimeState.messages
> 4. 当前 RuntimeMessage[] 转为 ModelMessage[]
> 5. 构造 ModelRequest
> 6. 调用 ModelProvider.generate()
> 7. 获得 ModelResponse
> 8. 将 ModelResponse.message 转换为 Runtime model_output
> 9. append 到 RuntimeState.messages
> 10. 解释 ModelResponse.finishReason
> 11. 返回当前 Run 的结果
> ```
>
> 特别注意：
>
> > ModelResponse.message 必须先写入 RuntimeState，再处理 finishReason。
>
> 例如模型返回：
>
> ```text
> assistant tool_call
> finishReason = tool_calls
> ```
>
> 即使当前 Runtime 尚不会执行 Tool，这条 model_output 也已经真实发生，必须保存在 RuntimeState 中。
>
> 不得因为当前能力不支持 Tool Execution 就丢弃模型输出。
>
> ---
>
> ## Decision 5：RunOutcome 只代表整个 run() 已经结束
>
> RunOutcome 不是 Loop 内部的中间结果。
>
> 可以理解为：
>
> ```text
> RunOutcome
> =
> AgentRuntime.run() 最后的 return value
> ```
>
> 如果未来某一步仍然需要：
>
> ```text
> 执行 Tool
> → 再调用模型
> ```
>
> 那么 Run 还没有结束，也就不应该产生 RunOutcome。
>
> Part VII-B 当前只需要表达最小 Run 结束语义。
>
> ---
>
> ## Decision 6：FinishReason 与 Run termination 分离
>
> ModelProvider 返回：
>
> ```text
> stop
> tool_calls
> length
> unknown
> ```
>
> 这些只是 Model Turn 的 finish reason。
>
> AgentRuntime 负责解释它们。
>
> Part VII-B 当前语义：
>
> ### stop
>
> ```text
> Model 正常回答完成
> → 当前 run 正常完成
> ```
>
> ### tool_calls
>
> ```text
> Model 请求执行 Tool
> → 当前 Runtime 尚未实现 ToolExecutor
> → 当前 run 无法继续
> → 返回“当前能力不支持继续”的 outcome
> ```
>
> 注意：
>
> ```text
> tool_calls
> ```
>
> 不是 Provider Error，也不是非法 ModelResponse。
>
> 它只是当前 Runtime 尚未具备下一步能力。
>
> ### length
>
> ```text
> Model 因长度限制结束
> → 当前 Runtime 没有自动续写 / recovery policy
> → 当前 run 不自动继续
> ```
>
> ### unknown
>
> ```text
> Runtime 不知道 Model Turn 为什么结束
> → 不猜测
> → 当前 run 不自动继续
> ```
>
> ---
>
> ## Decision 7：不要把 unsupported flow 当异常
>
> 以下场景：
>
> ```text
> tool_calls
> length
> unknown
> ```
>
> 如果 ModelProvider 已成功返回合法 ModelResponse，则不属于 Provider Exception。
>
> 当前 Runtime 可以通过最小 RunOutcome 表达：
>
> ```text
> completed
> unsupported
> ```
>
> 具体 TypeScript 字段命名可以根据现有项目风格做最小设计，但不要扩展成完整生命周期状态机。
>
> 禁止提前加入：
>
> ```text
> aborted
> waiting_approval
> suspended
> tool_executing
> session_closed
> retrying
> ```
>
> ---
>
> ## Decision 8：Provider exception 保持向上传播
>
> 例如：
>
> ```text
> HTTP error
> network error
> Provider SDK error
> mapping error
> malformed response
> ```
>
> 继续 reject：
>
> ```ts
> runtime.run(...)
> ```
>
> Part VII-B 不得：
>
> ```text
> catch everything
> → return { type: "failed" }
> ```
>
> 不要建立新的 ProviderError / RuntimeError hierarchy。
>
> 不要加入 Retry。
>
> ---
>
> ## Decision 9：MockModelProvider 只服务测试
>
> 需要一个确定性的 Test Double，用于验证 Runtime 行为，而不是依赖真实网络和随机模型输出。
>
> MockModelProvider 最小需要：
>
> ```text
> 预设 ModelResponse
> 记录收到的 ModelRequest
> generate() 按顺序返回预设响应
> ```
>
> 不要增加：
>
> ```text
> Prompt matching
> Regex routing
> Tool simulation
> Streaming
> Delay simulation
> Fake reasoning
> Provider factory
> ```
>
> 如果只被测试使用，优先放在：
>
> ```text
> test/
> ```
>
> 或：
>
> ```text
> test/support/
> ```
>
> 而不是 Production Runtime Core。
>
> ---
>
> # 4. Suggested Module Boundary
>
> 请优先保持最小结构。
>
> 预期新增方向可以类似：
>
> ```text
> src/
> └── runtime/
>     ├── runtime-state.ts
>     └── agent-runtime.ts
> ```
>
> 测试：
>
> ```text
> test/
> ├── existing Part VII-A tests
> ├── agent-runtime.test.ts
> └── support/
>     └── mock-model-provider.ts
> ```
>
> 具体文件名可以根据当前仓库实际风格调整。
>
> 但不要为了名字完整创建：
>
> ```text
> agent-loop.ts
> run-controller.ts
> state-manager.ts
> runtime-engine.ts
> ```
>
> 除非当前真实实现已经出现明确独立职责。
>
> ---
>
> # 5. Implementation Requirements
>
> ## 5.1 RuntimeState
>
> 定义最小：
>
> ```text
> RuntimeState
> └── messages
> ```
>
> 应复用现有 RuntimeMessage。
>
> 不要复制新的 Message 类型。
>
> ---
>
> ## 5.2 AgentRuntime
>
> AgentRuntime 至少负责：
>
> ```text
> 保存 ModelProvider dependency
> 拥有内部 RuntimeState
> 接收 user input
> 执行一次当前 Runtime run
> 维护 conversation messages
> 调用现有 ModelProvider
> 把 ModelResponse 转成 RuntimeMessage
> 解释 finishReason
> 返回最小 RunOutcome
> ```
>
> ---
>
> ## 5.3 Message conversion
>
> Part VII-A 当前已有：
>
> ```text
> RuntimeMessage
> → ModelMessage
> ```
>
> VII-B 需要最小补充：
>
> ```text
> ModelResponse.message
> → Runtime model_output
> ```
>
> 这里只做当前实际需要的转换。
>
> 不要为了对称性创建大型 bidirectional mapper framework。
>
> ---
>
> ## 5.4 Read-only conversation inspection
>
> 测试和调用方需要能够检查当前 Runtime history。
>
> 允许设计一个最小读取入口，例如：
>
> ```text
> getMessages()
> ```
>
> 但不得让调用方获得内部可变数组引用。
>
> 优先返回：
>
> ```text
> readonly view
> ```
>
> 或：
>
> ```text
> copy
> ```
>
> 保持：
>
> ```text
> write → Runtime only
> read  → caller allowed
> ```
>
> ---
>
> # 6. Acceptance Tests
>
> 请至少覆盖以下场景。
>
> ---
>
> ## Test 1：普通回答正常完成
>
> Mock Provider：
>
> ```text
> User input:
> Hello
>
> Model response:
> assistant: Hi
> finishReason: stop
> ```
>
> 验证：
>
> ```text
> Provider.generate() 被调用 1 次
> ```
>
> Provider 收到的消息正确：
>
> ```text
> user: Hello
> ```
>
> 最终 Runtime messages：
>
> ```text
> user_input: Hello
> model_output: Hi
> ```
>
> RunOutcome 表示正常完成。
>
> ---
>
> ## Test 2：同一个 Runtime 连续两次 run
>
> 第一次：
>
> ```text
> User: Hello
> Model: Hi
> ```
>
> 第二次：
>
> ```text
> User: How are you?
> ```
>
> 第二次 Provider 收到的 ModelRequest 必须包含：
>
> ```text
> User: Hello
> Assistant: Hi
> User: How are you?
> ```
>
> 最终 Runtime messages：
>
> ```text
> user_input: Hello
> model_output: Hi
> user_input: How are you?
> model_output: ...
> ```
>
> 这个测试用于验证：
>
> > RuntimeState 真正跨 run 持续存在。
>
> 不要把每次 run 当成无状态 Provider wrapper。
>
> ---
>
> ## Test 3：Tool Call 当前能力不支持
>
> Mock Provider 返回：
>
> ```text
> assistant:
>   toolCalls: [...]
>
> finishReason:
>   tool_calls
> ```
>
> 验证：
>
> ```text
> Provider 只调用 1 次
> ```
>
> 不得再次调用 Provider。
>
> 不得执行 Tool。
>
> 不得制造 Tool Result。
>
> 但是 assistant tool call 对应的 Runtime model_output 必须写入 RuntimeState。
>
> RunOutcome 应明确表示：
>
> ```text
> 当前 Runtime 不能继续完成该 Run
> ```
>
> 而不是：
>
> ```text
> completed
> ```
>
> ---
>
> ## Test 4：length
>
> Mock 返回：
>
> ```text
> finishReason = length
> ```
>
> 验证：
>
> ```text
> 模型输出仍然写入 RuntimeState
> 不会自动 retry
> 不会自动续写
> 不会再次调用 Provider
> ```
>
> RunOutcome 不应误报 completed。
>
> ---
>
> ## Test 5：unknown
>
> Mock 返回：
>
> ```text
> finishReason = unknown
> ```
>
> 验证：
>
> ```text
> Runtime 不猜测下一步
> Provider 不再次调用
> 模型输出仍被保存
> Run 结束为非 completed outcome
> ```
>
> ---
>
> ## Test 6：Provider error propagation
>
> Mock Provider：
>
> ```text
> generate() reject / throw
> ```
>
> 验证：
>
> ```text
> runtime.run() 同样 reject
> ```
>
> 不要把异常吞成：
>
> ```text
> RunOutcome.failed
> ```
>
> 不要自动 Retry。
>
> ---
>
> ## Test 7：External mutation protection
>
> 如果 Runtime 提供：
>
> ```text
> getMessages()
> ```
>
> 验证调用方无法通过返回值直接修改 Runtime 内部真实 messages。
>
> 例如：
>
> ```text
> caller 修改返回数组
> ```
>
> 不得影响 Runtime 内部 State。
>
> 具体测试形式根据 TypeScript 实现方式决定。
>
> ---
>
> # 7. Scope Constraints
>
> 本 Milestone 严禁提前实现以下能力。
>
> ---
>
> ## 不实现 Part VII-C
>
> 禁止：
>
> ```text
> Tool Registry
> Tool lookup
> Tool Executor
> Tool Schema Validation
> Tool Error Contract
> Tool Result execution
> Tool not found
> Tool execution exception
> ```
>
> `tool_calls` 当前只作为 Runtime 能力边界处理。
>
> ---
>
> ## 不实现 Part VII-D
>
> 禁止：
>
> ```text
> ContextBuilder
> TurnSnapshot
> Token Budget
> Compaction
> Memory injection
> Context selection policy
> ```
>
> 当前继续直接使用已有：
>
> ```text
> RuntimeMessage[]
> → toModelMessage()
> → ModelRequest
> ```
>
> ---
>
> ## 不实现 Part VII-E
>
> 禁止：
>
> ```text
> AgentEvent
> Subscriber
> Streaming
> EventEmitter abstraction
> Observability system
> ```
>
> ---
>
> ## 不实现 Part VII-F
>
> 禁止：
>
> ```text
> AbortSignal
> Cancellation
> Single Active Run
> Runtime lock
> Concurrency control
> ```
>
> ---
>
> ## 不实现 Part VII-G
>
> 禁止：
>
> ```text
> SessionStore
> Persistence
> Conversation recovery
> Checkpoint
> Session ID
> ```
>
> ---
>
> ## 不实现 Part VII-H
>
> 禁止：
>
> ```text
> beforeToolCall
> Approval
> Human-in-the-loop
> Suspend / Resume
> Durable Approval
> ```
>
> ---
>
> ## 不实现其他延期能力
>
> 禁止：
>
> ```text
> Session Tree
> Durable Tool Execution
> Hot Extension Reload
> Multi-Agent
> Sub-Agent
> Complex Memory
> Provider Routing
> Provider Registry
> Workflow Engine
> ```
>
> ---
>
> # 8. Engineering Constraints
>
> 继续遵守 Part VII-A 已确认的工程原则：
>
> 1. Runtime Core 不依赖 OpenAI SDK 类型。
> 2. 不修改已经稳定的 Provider-neutral model contract，除非当前实现无法满足 VII-B 的真实需求。
> 3. 如果必须修改 VII-A 类型，请先说明：
>    - 当前哪里无法满足 VII-B；
>    - 为什么必须修改；
>    - 修改是否会扩大 Public Contract。
> 4. 不为未来能力提前建立抽象。
> 5. 优先纯粹、简单、可测试的 TypeScript。
> 6. 保持当前 Node.js / TypeScript / ESM 工程约定。
> 7. 不改变当前 `.ts` source import / build rewrite 策略。
> 8. 不把 Mock 测试能力放进生产 Core，除非存在真实生产需求。
>
> ---
>
> # 9. Definition of Done
>
> Part VII-B 完成时应该能够证明：
>
> ```text
> User
> ↓
> AgentRuntime.run()
> ↓
> RuntimeState 记录 user_input
> ↓
> 当前 messages 构造 ModelRequest
> ↓
> ModelProvider.generate()
> ↓
> ModelResponse
> ↓
> RuntimeState 记录 model_output
> ↓
> Runtime 解释 finishReason
> ↓
> RunOutcome
> ```
>
> 并且：
>
> ```text
> 同一个 AgentRuntime
> ↓
> run #1
> ↓
> State 保留
> ↓
> run #2
> ↓
> Model 能看到之前 conversation
> ```
>
> 同时：
>
> ```text
> tool_calls
> ```
>
> 在当前 Milestone：
>
> ```text
> 被识别
> 被保存
> 不执行
> 不伪造结果
> 不继续调用模型
> ```
>
> ---
>
> # 10. Implementation Output Required
>
> 完成实现后，请不要只回复“Done”。
>
> 请按以下结构返回：
>
> ## 1. Implementation Summary
>
> 说明实际实现了什么。
>
> ## 2. Files Added / Modified
>
> 列出所有新增和修改文件，并简述职责。
>
> ## 3. Runtime Flow
>
> 用简短流程说明：
>
> ```text
> run()
> → state
> → model
> → response
> → state
> → outcome
> ```
>
> 实际代码如何工作。
>
> ## 4. Design Decisions Preserved
>
> 确认哪些 Confirmed Design Decisions 被实现遵守。
>
> ## 5. Tests Added
>
> 逐项说明新增测试覆盖了什么。
>
> ## 6. Verification Results
>
> 执行并报告：
>
> ```bash
> npm test
> npm run build
> ```
>
> 如果存在其他必要验证，也列出。
>
> 不要把真实收费 API 调用作为自动化测试要求。
>
> ## 7. Issues / Deviations
>
> 如果实现过程中必须偏离上述设计，请明确说明：
>
> ```text
> 原设计是什么
> 发现了什么问题
> 实际如何处理
> 为什么
> ```
>
> 不要静默扩大 Scope。
>
> ## 8. Deferred Work
>
> 明确哪些问题仍留给 VII-C 及后续 Milestone。
>
> ---
>
> # Final Reminder
>
> 当前目标不是让 Agent 功能看起来完整。
>
> 目标是：
>
> > **第一次让 Runtime 真正拥有自己的 State，并能够驱动一次 Model execution，再把结果写回自己的 State。**
>
> Part VII-B 做完后，我们希望得到：
>
> ```text
> VII-A：
> “我会调用 LLM。”
>
> VII-B：
> “我有一个 Runtime，它会记住对话、调用 LLM、记录回答，并判断当前这次运行是否已经结束。”
>
> VII-C：
> “当 LLM 要求调用 Tool 时，我再真正执行 Tool，并让同一个 run 继续循环。”
> ```
>
> 请严格停在 VII-B。
> :::
>
> 这份可以直接交给 Codex。
>
> 等 Codex 实现完以后，不要直接进入 VII-C。下一步仍按照我们的固定流程，把 **Codex Implementation Summary + 修改后的 `src.zip`** 给我，然后进入：
>
> **Runtime Verification / Debug → Code Review + Theory Feedback**
>
> 届时我们重点会看一个很现实的问题：代码跑起来之后，`RuntimeState`、`run()` 和 `RunOutcome` 是否还像现在讨论时这么清晰，还是实际代码会暴露新的职责问题。

## 会话轮次 9

原始 turn ID：`888b36b9-e989-4b51-97cc-067b57403587`。

### 用户

> 这一章节的代码没法通过真实调用验证只能通过测试用例吗

### ChatGPT

> 可以通过真实调用验证，不是只能靠测试用例。
>
> 只是 **VII-B 的真实调用验证，验证价值和 VII-A 不太一样**。
>
> VII-A 的真实调用重点是：
>
> ```text
> 真实 OpenAI-compatible API
> ↓
> Provider 映射
> ↓
> 拿到真实 ModelResponse
> ```
>
> 因为 VII-A 核心就是 Provider 边界。fileciteturn0file0
>
> 而 VII-B 核心变成：
>
> ```text
> RuntimeState
> + AgentRuntime.run()
> + 状态写回
> + 多轮 conversation
> ```
>
> 所以完全可以做一个真实 Demo。
>
> 比如：
>
> ```text
> runtime.run("你好，我叫小明")
> ↓
> 真实 LLM 返回
> ↓
> RuntimeState 保存 user + assistant
>
> runtime.run("我刚才叫什么？")
> ↓
> 第二次真实请求携带之前历史
> ↓
> LLM 回答“小明”
> ```
>
> 如果第二次真实回答能利用第一次的 conversation history，这就能非常直观地验证：
>
> > **RuntimeState 确实跨 `run()` 保存了状态，AgentRuntime 也确实把历史重新带给模型。**
>
> 这其实比单纯看测试还接地气。
>
> 不过，真实调用和自动化测试承担的职责不同。
>
> | 验证方式 | 主要验证什么 |
> |---|---|
> | Mock 自动化测试 | Runtime 逻辑是否确定正确 |
> | 真实 Provider Demo | 整条真实链路是否真的能跑 |
> | Build | TypeScript / ESM 工程是否正确 |
>
> 比如 `tool_calls` 这个边界，用真实模型验证反而没 Mock 稳定。
>
> 因为你问：
>
> ```text
> 北京天气怎么样？
> ```
>
> 真实模型可能：
>
> ```text
> 调用 Tool
> ```
>
> 也可能因为 Prompt / 模型能力不同，直接自己回答天气，结果不确定。
>
> Mock 就可以明确指定：
>
> ```text
> 这次必须返回 tool_calls
> ```
>
> 然后验证：
>
> ```text
> Runtime 保存 tool_call
> 但不执行 Tool
> 不调用第二次模型
> 返回 unsupported
> ```
>
> 因此我建议 VII-B 完成后验证分成两层：
>
> ```text
> 自动化测试
> 负责验证：
> - stop
> - tool_calls
> - length
> - unknown
> - provider error
> - 多次 run 历史累积
> ```
>
> 再加一个**手工真实 Demo**：
>
> ```text
> run #1: "请记住一个信息：我的代号是 BlueFox"
> ↓
> 真实模型回答
>
> run #2: "我的代号是什么？"
> ↓
> 检查模型是否基于历史回答 BlueFox
> ```
>
> 最终打印：
>
> ```text
> Run #1 outcome
> Run #2 outcome
> Runtime messages
> ```
>
> 这样你能真正“看到”Runtime 在工作。
>
> 所以我会稍微修正刚才给 Codex 的要求：**VII-B 不需要真实 API 作为自动化测试，但完全值得保留一个手工真实 Runtime Demo。**
>
> 而且我建议加上，因为你现在是在学习 Runtime，实现完只看绿色测试确实不如亲自跑一次：
>
> > “原来我第二次 `run()`，真的把第一次消息带进去了。”
>
> 这个体验对理解 VII-B 很有帮助。
