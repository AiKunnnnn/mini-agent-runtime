# Day08 / Part VII-B：RuntimeState + Agent Loop

> Engineering Learning Log + Architecture Record
> Milestone 状态：Done
> 归档与代码复核日期：2026-09-04
> 代码基线：归档开始时 HEAD 为 `d6d6c4c`，工作区干净；本次归档只修改 Markdown。

本记录按三个来源交叉核对：

1. 当前仓库的 `src/`、`test/`、`package.json` 和 `tsconfig.json`，作为实现事实的依据。
2. [完整 ChatGPT 讨论入口](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a9787a5-90bc-83e8-949b-9c6ea0fb8c93)。已分页读取全部 12 轮可读取的用户/助手文本，分别归档为[架构讨论与 Implementation Task](source/day08-part-vii-b-architecture-chatgpt-source.md)和[Verification / Review / Closure](source/day08-part-vii-b-review-chatgpt-source.md)。接口未提供原会话上传附件的正文，因此旧压缩包问题按历史 Review 记录归因，当前实现另行以工作区源码核对。
3. [Codex 实现、测试与 Debug 记录](source/day08-part-vii-b-codex-implementation-source.md)，包含本任务过程、用户贴回的真实 Demo 输出和归档时的复验。

“最终采用”指当前代码；“候选 / 未采用”指讨论过程；“待回收”指当前边界之外的问题。真实调用结果来自用户手工运行，不写成 Codex 本次重新调用了真实 API。

## 1. Milestone Goal

VII-A 已经能够调用 LLM。VII-B 的目标是把调用前后的执行责任收进 Runtime，让它自己保存输入、构造请求、保存回答，并解释本次运行如何结束。

```text
User Input
    ↓
AgentRuntime.run()
    ↓
RuntimeState → ModelRequest → ModelProvider.generate()
    ↑                              ↓
    └────── model_output ← ModelResponse
                                   ↓
                        Runtime 解释 finishReason
                                   ↓
                               RunOutcome
```

完成标准不要求同一次 run 调用多个 Model Turn。当前没有 ToolExecutor，没有一个业务上成立的理由让 Runtime 自动发起第二次模型调用。

这一版必须证明的是：同一个 Runtime 能记住先前的对话；每次调用由它负责；已经发生的模型输出不会因为后续能力缺失而丢失。

## 2. Starting Point

起点是已完成的 [VII-A](day08-part-vii-a-foundation-model-provider.md)，不是空工程。

| 已有实现 | VII-B 如何使用 |
| --- | --- |
| `RuntimeMessage`：`user_input / model_output / tool_result` | 作为内部事实类型，不另造消息体系 |
| `ModelMessage`：`user / assistant / tool` | 作为本次模型请求的消息视图 |
| `toModelMessage()` | 继续承担 Runtime → Model 的薄转换 |
| `ModelRequest / ModelResponse / FinishReason / ModelUsage` | 直接复用，未修改字段 |
| `ModelProvider.generate(request)` | 作为 Runtime 的依赖边界 |
| `OpenAIModelProvider` 与映射 | 作为可注入实现，继续只负责模型调用与协议转换 |
| Node.js、TypeScript、ESM、tsx 测试 | 保留 `.ts` source import 和构建扩展名重写策略 |

VII-A Demo 手工建立 `RuntimeMessage[]` 和 `ModelRequest`，直接调用 Provider，再打印响应。它没有 `AgentRuntime`，也不会将回答写回长期存在的内部状态。

VII-B 开始前，缺少的正是这个执行所有者。`tool_result` 类型已经存在，并不表示工具执行也已存在。

## 3. Architecture Questions

讨论不是从“需要几个类”开始，而是从以下问题逐步收敛：

| 问题 | 引发讨论的具体矛盾 | 最终回答 |
| --- | --- | --- |
| State 应该保存什么？ | `iteration`、`status` 都会变化，是否都算 State？ | 本版只保存需要跨轮保留的消息事实 |
| 谁拥有 State？ | Provider 不保存历史，那是 caller、Loop 还是 Runtime？ | AgentRuntime 拥有，Loop 是其内部行为 |
| State 是 interface 还是 class？ | 唯一修改入口是否要求 `RuntimeState.append()`？ | interface 足够；私有持有与引用边界保证所有权 |
| 没有 Tool，还能叫 Agent Loop 吗？ | 为了章节标题写 `while`，会不会制造无理由调用？ | 先建立状态推进与结束解释；多步骤循环留给 VII-C |
| 模型响应如何进入 State？ | `AssistantMessage` 与 `RuntimeAssistantMessage` 不同 | 只把回答转换成 `model_output`，不保存整个响应包装 |
| `tool_calls` 是错误还是完成？ | 合法模型输出要求当前不存在的能力 | 保存输出，返回 unsupported |
| `run()` 返回什么？ | 最后一条回答不能表达未完成；State 引用又破坏所有权 | 返回最小 RunOutcome，历史另行读取 |
| RunOutcome 会不会驱动下一轮？ | 用户将“某一步结果”与“整个 run 结果”混淆 | 若还要继续，就尚未产生 RunOutcome |

最后一个问题促成了讨论中的重要修正：不能只画 `FinishReason → RunOutcome`，更完整的概念关系是“模型返回 → Runtime 解释下一步 → 如果结束，才返回 outcome”。VII-B 所有合法结束原因当前都走终止分支，代码因此可以保持为一个 `switch`。

## 4. Design Decisions

### 最终采用

1. `RuntimeState` 是纯数据 interface，仅有 `messages: RuntimeMessage[]`。
2. `AgentRuntime` 用 `#state` 私有字段保存状态，用 `#provider` 保存依赖。Provider 不进入 State。
3. 所有执行逻辑保留在 `AgentRuntime.run()`；没有 `AgentLoop` class 或独立 Loop 模块。
4. 一次 run 先记录用户输入，再构造完整历史请求，调用一次 `generate()`，写入回答，最后解释 `finishReason`。
5. `getMessages(): RuntimeMessage[]` 返回 `structuredClone()` 的拷贝。返回值可修改，但修改不影响内部历史；它不是返回类型为 readonly 的视图，也没有 freeze。
6. 请求使用历史拷贝转换，响应的 `toolCalls` 入库前也拷贝，保护两侧嵌套引用。
7. `RunOutcome` 定义在 `agent-runtime.ts`，只表达正常返回时的结束结果：

```ts
export type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: Exclude<FinishReason, "stop"> };
```

8. Provider throw / rejection 原样向上传播，不转换成 `failed`；Runtime 没有重试逻辑。
9. Mock 放在 `test/support/`，只记录请求、按序返回预设响应。
10. 后续根据用户验证需求增加手工真实 Demo；真实 API 不成为自动化测试前提。

### 讨论过但未采用

| 候选方案 | 未采用原因 / 最终变化 |
| --- | --- |
| State 包含 `iteration / status / usage / finishReason / error` | 混入局部执行变量、单次响应和未出现的生命周期需求 |
| State class 自带 append、snapshot、clear 等行为 | 没有独立职责需要；唯一所有者由 Runtime 实现 |
| 初期示意图把 Agent Loop 标成 State owner | 后续明确为 AgentRuntime owns State；Loop 是执行算法 |
| 独立 `agent-loop.ts`、`RunController` | 当前只是额外转发与层级，没有实际拆分收益 |
| `while` 加 maxTurns，或第一轮 stop 后强行再调一次 | 次数上限是阻止继续的 guard，不是继续的原因 |
| `run()` 返回内部 State | 会泄漏可变引用，扩大公共契约 |
| `run()` 只返回最后一个 assistant message | 无法明确区分完成与需要工具但尚未完成 |
| Outcome 携带 message、完整响应或 State | 早期候选未锁定；最终只返回 type，unsupported 时附 finishReason |
| `UnsupportedToolCallError` 或统一 `failed` | 将合法但不支持的流程与 Provider 调用失败混为一谈 |
| 先定义 `LoopDecision / NextAction` 联合类型 | 概念有价值，但当前无需独立代码抽象 |
| 将 BlueFox 作为真实 Demo 输入 | 讨论中的示例；实际 Demo 使用“小明”，验证目标相同 |

## 5. Why These Decisions

### 事实、配置、局部控制分别归位

聊天历史需要在下一次 run 继续使用。`provider` 是完成调用的依赖，`maxTurns` 是策略，`iteration` 是算法计数；把它们都塞进 State，会使“记住什么”和“怎么执行”混在一起。当前连局部 iteration 都没有，因为没有多步骤循环。

`ModelResponse` 包含 `message / finishReason / usage`，本版只有 message 被固化为会话事实。finishReason 在当前 run 中解释，usage 没有统计消费者，因此未保存。不是这些数据永远不能持久化，而是本版没有相应需求。

### 所有权由修改路径决定

仅将字段声明成 readonly 不能防止深层对象变化；仅拷贝数组也仍共享消息和嵌套参数。当前代码用私有字段阻断内部 State 的访问路径，再用原生深拷贝隔离外部数据。

这个选择没有引入自定义 immutable framework。它解决的是现在已存在的 `ToolCall.arguments` 引用问题，即使当前还不执行 Tool，也需要保留这些事实。

### 先保存，再决定下一步

模型请求工具已经是一条真实输出。Runtime 当前没有 ToolExecutor，不等于这条输出没有发生。先返回 unsupported 再尝试保存，会遗漏事实；当前代码把 append 放在 switch 之前。

### RunOutcome 是 return，不是 continue

当用户提出“RunOutcome 如果涉及下一个 loop 怎么办”时，讨论明确收紧了术语。它只在整个 run 结束时返回。未来执行 Tool 后还要调用模型时，应留在同一个 run 内部推进，不先返回 outcome 再让 caller 接手 Loop。

这也是为什么当前可以没有 while：所有已支持的判断分支都结束；VII-C 提供真实工具结果之后，才出现合理的继续理由。

## 6. Implementation Scope

本版实现的边界是：

```text
输入字符串 → 记录事实 → 完整历史模型请求
→ 模型输出入库 → completed / unsupported
```

对合法、当前可处理的数据，单次 run 调用 `ModelProvider.generate()` 一次。此处次数指 Runtime 到 Provider 接口的调用，不等价于底层 HTTP 请求次数保证；VII-B 没有修改 SDK 的配置或实现新的网络重试策略。

没有模型输入筛选，没有工具定义注入：虽然 `ModelRequest` 允许 `tools`，当前 run 构造的请求只有 `messages`。

公开入口保持为：

```ts
new AgentRuntime(provider);
await runtime.run(userInput);
runtime.getMessages();
```

没有 getState、setState、reset、resume、abort、运行状态查询或会话恢复。连续调用的验收指顺序 await，不代表支持并发执行。

## 7. Code Changes

| 文件 | 本 Milestone 的实际变化 |
| --- | --- |
| [runtime-state.ts](../../src/runtime/runtime-state.ts) | 新增最小 State interface |
| [agent-runtime.ts](../../src/runtime/agent-runtime.ts) | 新增执行所有者、消息写回、历史读取和 RunOutcome |
| [mock-model-provider.ts](../../test/support/mock-model-provider.ts) | 新增确定性 Test Double |
| [agent-runtime.test.ts](../../test/agent-runtime.test.ts) | 新增 9 项 Runtime 测试 |
| [runtime-demo.ts](../../src/demo/runtime-demo.ts) | 后续追加真实 Provider 两轮验证入口 |
| [package.json](../../package.json) | 增加 `demo:runtime` script，保留原 `demo` |
| [根 README](../../README.md)、[Day08 README](README.md) | 补充用法、能力边界与阶段进度 |

VII-A 的消息类型、Model contract、OpenAI Provider 和映射均未因 VII-B 修改。没有为对称性增加通用反向 mapper。

当前 request 构造原文：

```ts
const request: ModelRequest = {
  messages: this.getMessages().map(toModelMessage),
};
const response = await this.#provider.generate(request);
```

响应转换在 run 内联完成：建立 `type: "model_output"`，按存在性复制 `content`，对存在的 `toolCalls` 使用 `structuredClone()`。省略不存在的可选字段，与 `exactOptionalPropertyTypes` 工程约定一致。没有把 `role`、`usage` 或整个 Provider response 写入 Runtime history。

Mock 以调用前的 `requests.length` 为下标，先保存 request，再返回对应 response；预设响应不足则显式抛错。讨论里使用过 `shift()` 的概念示例，但真实实现不修改预设响应数组。异常测试另用内联 Provider 分别制造同步 throw 和 Promise rejection，没有向 Mock 添加错误路由框架。

真实 Demo 使用 `dotenv/config`，读取与原 Demo 相同的环境变量配置。它循环两条预设用户输入，调用同一 Runtime；每次打印 outcome 和完整历史。如果 unsupported，就打印提示并停止。这个 Demo 的 for 循环是两个独立 run 的调用方逻辑，不是 Runtime 内的 Tool Loop。

## 8. Runtime Verification

### 自动化测试：检查确定的状态与调用行为

```bash
npm test
npm run build
```

首次实现验证、追加 Demo 后验证以及 2026-09-04 归档复验，均得到测试通过和构建通过。归档复验是 **17 tests / 17 pass / 0 fail**：VII-A 原有 8 项，加 VII-B 新增 9 项。

| 新增测试 | 关键断言 |
| --- | --- |
| 普通回答 | 初始为空；请求只有 user；最终 user_input + model_output；completed；1 次调用 |
| 连续两次 run | 第二次 request 精确包含 user / assistant / user；最终 4 条 RuntimeMessage |
| tool_calls | 输出保存完整工具调用；unsupported；1 次调用；没有 tool_result |
| length | 保存部分回答；unsupported；没有自动续写或第二次调用 |
| unknown | 保存回答；unsupported；没有猜测后继续 |
| 同步 throw | 同一个错误对象传出；1 次调用；只保留 user_input |
| Promise rejection | 同上，覆盖异步失败 |
| 外部历史修改 | 数组替换、消息内容、工具名、嵌套 location.city 修改均不污染 State |
| Provider 引用修改 | 响应参数修改、后续请求参数修改和请求数组清空不污染 State |

测试命名中“无重试”的确定含义，是失败后 Runtime 没有再次调用 Provider。

当前 build 的 `include` 只有 `src/**/*.ts`，而 tsx 测试运行不等于完整类型检查。因此另外执行并通过：

```bash
./node_modules/.bin/tsc --noEmit --target ES2022 \
  --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --strict --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

### 手工真实调用：看到历史如何被复用

```bash
npm run demo:runtime
```

用户贴回的干净运行记录显示：第一轮的 outcome 是 completed，history 中有“小明”的用户输入和“你好，小明！”的模型输出；第二轮的 outcome 仍是 completed，history 增长为四条，最后一条是：

```json
{
  "type": "model_output",
  "content": "小明。"
}
```

以下是分析性概括，**不是程序逐字打印的内容**：

| run | 输入 | 结果 | 从打印数组统计的历史数量 |
| --- | --- | --- | --- |
| 1 | 我叫小明，请简短回复。 | completed；你好，小明！ | 2 |
| 2 | 我叫什么名字？请简短回复。 | completed；小明。 | 4 |

Demo 实际打印的标签只有 `User:`、`RunOutcome:`、`Runtime history:`，以及 unsupported 时的提示。它不打印 `run #1`、计数或请求明细。

真实 Demo 为端到端会话传递提供直观证据；第二次 ModelRequest 中历史的精确结构由 Mock 断言和源码补证。真实模型回答的措辞不作为稳定自动化断言。

本版也没有向真实请求传 tools，因此不能仅通过询问天气，就稳定验证 tool_calls 分支。该分支依靠预设合法 ModelResponse 的 Mock 验收。

## 9. Bugs / Debugging

### 9.1 第一轮没有出现 Runtime 代码失败，不能编造修复过程

现有执行记录中，新增 Runtime 后首次测试和 build 即通过；追加 Demo 后也通过。没有证据表明本轮经历了 Runtime 编译错误、状态丢失修复或失败测试驱动的逻辑重写。

引用隔离是在首轮实现中加入并验证的设计，不是发现线上污染后补的补丁。VII-A 曾发生的依赖安装权限或 SDK 类型问题，不重复记成本轮 Bug。

### 9.2 `npm run demo` 没经过 Runtime

用户希望真实调用验证 VII-B，发现原有命令只能验证 VII-A Provider。原因是原 `openai-demo.ts` 直接构造请求、调用 Provider。

处理：增加 `runtime-demo.ts` 与 `npm run demo:runtime`，让同一 Runtime 顺序执行两次 run，打印状态。未替换原 Demo，也未让自动化测试依赖网络。

这里同时纠正了说明上的歧义：“不需要真实 API 作为自动化验收前提”，不能表达成“VII-B 只能用测试用例验证”。

### 9.3 等待响应时输入文字，被 shell 当成命令

用户第一次贴出的终端输出在第二次请求期间混入了额外文字，随后出现 `zsh: command not found: 你好`。Runtime history 仍只有 Demo 预设的两组问答。

依据当前 Demo 不读取 stdin、额外输入不在 State 且最终被 shell 执行，可判断这与在非交互 Demo 中输入文字相符；不是工具执行失败。没有据此给 Runtime 增加 readline。

用户随后重新运行，贴回的干净输出没有该干扰。

### 9.4 ChatGPT Review 中的 `nihao` 疑点被降级

另一份提交给 ChatGPT 的日志含有孤立 `nihao`。初步 Review 怀疑存在调试打印，但当时尚未拿到正确源码，因此这只是猜测。

后续 ChatGPT 最新源码 Review 表示没有找到该字符串；本次归档也搜索了当前 `src/` 和 `test/`：没有 `nihao`，console 输出只在 Demo 文件。当前证据不支持“已定位并删除 Runtime Debug log”。`nihao` 的具体来源不能凭日志独断，不能与上一个 shell 输入事件强行归为同一原因。

### 9.5 首次 Review 使用了旧 `src.zip`

按 ChatGPT 会话记录，首次源码 Review 发现上传包只有 VII-A 文件，没有新增 runtime、runtime-demo 和测试；因此没有仅凭 17 个绿灯及实现总结就宣布正式 Done。

处理是用户重新上传最新源码。随后 Review 给出“没有必须修复问题，VII-B Done”的结论。这个事件是交付材料版本错误，不是 Runtime 代码回退，也不是本次归档重新解压旧附件得到的发现。

### 9.6 总结格式与实际输出混淆

Codex 将结果概括成 `run #1 → completed → 历史 2 条`。用户再次运行后表示没看到这段输出。

处理是澄清：该格式为人工总结；真实程序打印完整数组，数量由阅读数组得出。没有为配合总结去声称代码已经输出计数，也没有修改业务逻辑。

这一点带来的记录规则是：终端原文、分析摘要、预期示例必须分别标注。

## 10. Code Review Findings

本节结合[ChatGPT 的初步及最终 Review](source/day08-part-vii-b-review-chatgpt-source.md)与归档时当前源码复核。最终 Review 未要求 Codex Fix Task；本次归档没有修改 Runtime 代码。

### 必须修复：无

状态所有权、Provider-neutral 依赖、写回顺序、异常传播、finishReason 解释、测试范围及 Scope 均满足 VII-B 已确认约束。

初步 Review 对深拷贝是否过度设计的担忧，最终由源码消除：实现使用原生 `structuredClone()`，并没有自定义 clone framework。getMessages 拷贝也不等于提前实现了 VII-D 的 TurnSnapshot。

### 建议优化：非本轮修复项

| 项目 | 当前判断 |
| --- | --- |
| getMessages 返回 readonly 类型 | 可以提高类型层表达，但当前返回副本已满足要求，不修改 |
| 引用隔离测试在 unsupported 后再 run | 注释已说明仅测引用所有权；VII-C 应结合正常 Tool Loop 调整，避免误读成恢复能力 |

### 当前接受，后续回收

**B-P1：未解决工具调用后的新 run。** 当前 Runtime 没有阻止调用方在 unsupported(tool_calls) 后再次 run。它会携带缺少 tool_result 的历史，并追加新 user。Mock 接受这样的请求不代表真实 Provider 必须接受，也不代表实现了恢复。VII-C 需要让工具结果回流并在同一个 run 中继续，届时一并回收该测试及生命周期含义。本轮不加 blocked status 或 guard。

**B-P2：Provider 失败后的用户输入。** 失败时已经记录 user_input，符合事实语义；但再次 `run(sameInput)` 会追加重复输入。未来重试设计必须区分“重试当前 Model Step”与“开始新 run”。VII-G 做恢复时重新审视这一边界；具体 Retry / Error Recovery 能力尚未排入已确认实现范围，不能因此宣称 VII-F/G 必须实现重试。

**B-P3：工具参数与深拷贝的契约。** TypeScript 的 `arguments: unknown` 比 structured-cloneable 数据更宽。当前 OpenAI 映射用 JSON.parse 产生普通 JSON 数据，可以正常拷贝；自定义 Provider 返回函数、Symbol 等不可克隆值时，Runtime 的拷贝可能抛错。此时不能笼统宣称“所有符合 TypeScript 接口的响应必定先保存后返回”。VII-C 参数契约讨论时评估是否收紧为 JSONValue，本轮未修改 VII-A 类型，也未新增验证器。

## 11. Theory Feedback

这次代码让几个原来容易混淆的概念有了可观察的区别：

| 概念 | 在当前代码中回答的问题 |
| --- | --- |
| RuntimeState | 到现在记住了哪些消息？ |
| ModelResponse | 刚刚一次模型调用返回了什么？ |
| Runtime 内的判断 | 当前能力下，接下来能做什么？ |
| RunOutcome | 本次 run 正常返回时，如何结束？ |

会变化的数据不必都属于 RuntimeState。已经发生的输入也不会因为后续调用失败而消失。结束不等于完成：unsupported 结束了 run，却没有把依赖工具的工作完成。

Model Turn 和 Agent Run 本版在调用次数上恰好一一对应，但职责并不相同。Provider 返回 tool_calls；Runtime 决定当前 unsupported。VII-C 可改变后者的执行分支，而不把工具生命周期判断移进 Provider。

另一个需要保留的区别是：`completed` 表示本版按 stop 正常结束，不验证回答在业务上一定正确。Demo 的正确回答提供集成证据，不能代替模型质量评估。

学习方式也发生了变化。用户反馈连续抽象术语让理解“悬空”，之后讨论改成“先记用户的话 → 问模型 → 记回答 → 看还能不能继续 → return”。真实 Demo 再展示两条变四条，让状态所有权从术语变成具体执行过程。

## 12. Pi Mapping

只保留本轮讨论实际涉及的对照，不重新声称审查了 Pi 最新源码。依据为本次 ChatGPT 讨论以及既有 [Day07 State / Context 记录](../day07-pi-agent-source-analysis/day07-session-02-state-and-context-projection.md)和 [Runtime Loop 记录](../day07-pi-agent-source-analysis/day07-session-01-architecture-and-runtime-loop.md)。

| Pi 学习中的观察 | VII-B 对照 | 边界 |
| --- | --- | --- |
| Agent 拥有 State，低层 Loop 是执行机制 | AgentRuntime 持有 #state，run 内推进状态 | 没有照搬 Pi 的独立 Loop 文件 |
| AgentMessage 与模型消息有转换边界 | RuntimeMessage 经 toModelMessage 进入 ModelRequest | 只做现有薄转换，不引入 transformContext |
| 模型输出、工具结果和下一步判断共同推动循环 | 本版输出写回后判断结束；工具路径停在 unsupported | Pi 的 Tool Loop 不代表 VII-B 已具备工具执行 |
| 内存 AgentState 与持久化 Session 不等价 | 本版只在实例存活期间保留消息 | 没有 SessionStore 或重启恢复 |

Pi 的 AgentState 在已有学习记录里还包含配置、streaming 与 pending 等内容。VII-B 的 messages-only 是本项目当前范围的选择，不能反过来声称 Pi 也只保存事实或只有 messages。

## 13. Architecture Decisions Added

以下编号仅作为本笔记的决策索引，不引入新的决策管理模块。

| 编号 | 新增并已落实的决策 | 代码 / 验证证据 |
| --- | --- | --- |
| B-AD01 | 最小事实 State，仅 messages | RuntimeState interface |
| B-AD02 | AgentRuntime 拥有修改权，边界隔离可变引用 | #state、structuredClone、两项引用保护测试 |
| B-AD03 | Model → Runtime 只固化当前所需回答事实 | run 内联构造 RuntimeAssistantMessage |
| B-AD04 | 写回发生在结束解释之前 | append output 位于 switch 前；三个 unsupported 测试 |
| B-AD05 | Outcome 是整个 run 的结束返回值 | completed / unsupported 联合类型，无继续型 outcome |
| B-AD06 | 合法但当前不能继续的响应不作为 Provider error | unsupported 分支与 throw / rejection 测试分离 |
| B-AD07 | 当前不创建独立 AgentLoop，不制造无理由续调 | run 一次 generate，无 while / maxTurns |
| B-AD08 | 会话多轮先于单次 run 多步骤 | 第二次 request 历史断言；手工“小明”Demo |
| B-AD09 | Mock 仅是确定性测试替身 | test/support 预设响应，无生产导入 |

B-P1、B-P2、B-P3 是 Review 后保留的待回收问题，不伪装成已经实现的新生命周期或参数校验能力。

## 14. Deferred Work

| 能力 / 问题 | 计划归属 | 本轮明确停在哪里 |
| --- | --- | --- |
| Tool Registry、lookup、执行、Schema Validation、Error Contract | VII-C | 只有 ToolCall 事实，无执行和 tool_result 生成 |
| 同一 run 内 Model → Tool → Model | VII-C | tool_calls 返回 unsupported；回收 B-P1 |
| 参数数据契约与引用隔离测试调整 | VII-C 讨论 | 回收 B-P3，未承诺必须改成 JSONValue |
| ContextBuilder、TurnSnapshot | VII-D | 全历史拷贝后直接 map，无上下文选择 |
| Token Budget、裁剪 / Memory 注入策略 | VII-D 相关讨论；复杂策略未承诺 | 当前均无；复杂 Compaction 不进入本版 |
| AgentEvent、Subscriber、Streaming | VII-E | 输出仅来自 Demo，无事件机制 |
| Abort、Single Active Run、并发控制 | VII-F | 当前不阻止并发调用 |
| SessionStore、持久化、Conversation Recovery | VII-G | 只保留实例内存；恢复时审视 B-P2 |
| beforeToolCall、简单 Approval | VII-H | 无 hook、等待审批和恢复 |
| Weather Agent 完整集成 | VII-I | 当前 Demo 只是两轮文本对话 |
| 自动续写、Retry、fallback、Provider Error normalization、Usage 统计 | 未单独排期，需未来真实需求再决定 | 没有新增相应能力；B-P2 不等于重试承诺 |
| 交互式终端聊天、readonly 返回类型优化 | 未排期的可选改进 | 当前 Demo 不读取 stdin，getMessages 返回可变副本 |
| Session Tree、Durable Tool Execution、Durable Approval、Hot Reload、复杂 Memory、Multi-Agent / Sub-Agent、Provider Routing、Workflow Engine | Part VII v1 范围外 | 本轮均未实现 |

## 15. Final Architecture Snapshot

下图为当前源码关系；没有把未来组件画进已实现路径。

```text
runtime-demo.ts                         test/agent-runtime.test.ts
  │ 创建 OpenAIModelProvider               │ 创建 Mock / 内联失败 Provider
  └───────────────┐                 ┌──────┘
                  ▼                 ▼
                 new AgentRuntime(provider)
                   ├── #provider: ModelProvider
                   └── #state: RuntimeState
                           └── messages: RuntimeMessage[]

caller ── await run(input)
                  │
                  ├─ append { type: user_input, content: input }
                  ├─ getMessages() → structuredClone(内部 messages)
                  ├─ map(toModelMessage) → ModelRequest { messages }
                  ├─ #provider.generate(request)
                  │       ├─ OpenAI 实例：映射 → SDK → 映射 → ModelResponse
                  │       └─ 测试实例：记录 request → 预设 ModelResponse
                  │
                  ├─ 响应转换 → append { type: model_output, ... }
                  └─ switch response.finishReason
                          ├─ stop → { type: completed }
                          └─ tool_calls / length / unknown
                               → { type: unsupported, finishReason }

Provider 抛错：run reject；已追加的 user_input 保留，无 model_output。
caller ── getMessages() → 得到深拷贝，不能通过修改副本修改内部事实。
```

依赖方向需精确理解：AgentRuntime import 的是 ModelProvider 类型接口；Demo 负责实例化 OpenAIModelProvider 并注入。上图出现 OpenAI 执行路径，不意味着 Runtime Core 直接 import OpenAI 实现。

同一实例的两次成功 run：

```text
[]
  → user_input #1
  → model_output #1
  → user_input #2
  → model_output #2
```

第二次模型请求在最后一条 model_output 产生之前构造，包含前三条事实投影出的模型消息。历史副本是引用隔离手段，当前没有正式 TurnSnapshot 类型或持久化 checkpoint。

## 16. Core Knowledge Upgrade

本轮真正获得的能力是把架构问题落实到“下一行代码该做什么”：

- 谁记录输入？Runtime，而不是 Demo 手工 push。
- 谁保存回答？Runtime，而不是 Provider 保存 conversation。
- 为什么第二次模型知道名字？Runtime 保存历史并再次投影成 request。
- 为什么工具调用要保存却不执行？事实已经发生，执行能力还没实现。
- 为什么没有 while 也完成 VII-B？已有执行所有权和结束判断，尚无继续依据。
- 为什么 State 不保存 RunOutcome？它描述本次运行的返回结果，不是供下一轮推进的消息事实。
- 为什么绿色测试之外还要 Review？测试输出可能对应错误版本的压缩包，也不能独自证明抽象和范围合理。
- 为什么 Done 后仍有 Pending？已完成当前责任，与未来生命周期全部定义完毕是两件事。

VII-A 建立“我会调用模型”；VII-B 建立“我会记住对话、驱动模型、保存回答，并决定这次运行怎样结束”。“小明”Demo 让这一升级可以直接观察。

## 17. Next Milestone

下一阶段是 **Part VII-C：Tool Registry + Tool Executor + Error Contract**。从当前真实缺口开始讨论：

```text
已有：model_output(toolCalls) 已进入 State
缺少：工具查找 → 参数处理 → 执行 → tool_result
目标：有了工具结果，再让同一个 run 调用模型
```

下一轮需要明确工具注册、查找、参数校验与执行各自职责；区分工具不存在、参数不合法、执行异常和 Provider 异常；决定工具观察如何回流为 RuntimeToolMessage，并据此继续模型调用。

必须带走 B-P1 和 B-P3：不能把 unresolved tool call 后新开 run 当作正式恢复，也不能因当前 arguments 是 unknown 就忽略真实数据契约。B-P2 继续保留，等恢复 / 重试需求真正进入范围时处理。

只有真实新增职责使 run 明显复杂时，才讨论是否提取 Loop 模块；不默认推翻 VII-B 的状态所有权或提前加入 VII-D～VII-H。

本阶段 Closure 依据为：当前源码核对、17 项测试、构建与测试类型检查、用户真实 Demo，以及最新源码 Review 的“无必须修复”结论。Part VII-B 已完成。
