# Part VII-C：交付、Code Review 与 Closure源记录

- 来源：[Part VII - C](https://chatgpt.com/g/g-p-6a62c8cc44e88191bb384ccd56dca50c/c/6a9a7287-0380-83e8-aa16-d99cdc86b75e)
- 归档日期：2026-09-10
- 读取方式：任务读取接口，两页共 16 轮用户／助手文本；本文件保存第 10～16 轮。
- 下面正文按时间顺序保留；它是历史材料，不是当前实现规范。代码事实以主笔记和当前源码为准。
- 接口未提供上传 ZIP 等附件正文；保留原有附件缺失标记。历史 Review 对旧压缩包的判断按会话陈述归档，不声称本次重新解压核验了那些附件。
- 原文中的 filecite 等标记沿用源文本，不是本地文件证据链接。

## 轮次 10 — cd036f93-5638-413a-9f37-c1bceef45ee6

### User

【实现总结】是实现之后的笔记吗

### ChatGPT

对，但要区分一下。

我这里说的【实现总结】不是最终的学习笔记，而是 **Codex 完成代码后给你的开发结果汇报**。它更像：

> 这次改了什么、为什么这么改、改了哪些文件、测试结果是什么、有没有偏离我们之前的设计。

比如：

```text
Implementation Summary
- 新增 ToolRegistry
- 新增 ToolExecutor
- tool_calls 现在会在同一个 run 内继续
- 增加 maxTurns
- 增加 TOOL_NOT_FOUND / INVALID_ARGUMENTS / TOOL_EXECUTION_FAILED
```

然后再配上：

```text
Files Changed
Tests Added
Verification Result
Demo Result
Open Questions
```

这些是为了我们后面做：

**Runtime Verification / Debug → Code Review + Theory Feedback**

用的。

而你说的“实现之后的笔记”，如果指我们每个 Part 最后归档的：

```text
day08-part-vii-c-xxx.md
```

那属于 **Milestone Closure（里程碑收尾）** 阶段的正式学习记录/工程记录。

所以流程是：

```text
GPT 架构讨论
↓
Codex Implementation Task
↓
Codex 写代码
↓
Codex 输出【实现总结】
↓
你把实现总结 + 源码 + 测试结果发给我
↓
我做 Verification / Review
↓
问题修完
↓
Milestone Closure
↓
再生成正式的 Part VII-C 学习笔记 / Milestone Note
```

所以你可以简单理解：

> 【实现总结】是 Codex 的“开发交付说明”，不是最终学习笔记。

最终学习笔记要等我们确认 **VII-C 真正 Done** 之后再归档。

## 轮次 11 — 9a942beb-7ae6-4d58-a78b-ce9363dac6fb

### User

实现总结 是不是这种

[User attached 1 image; image contents were not included]

### ChatGPT

对，就是这种。

你截图里的这份内容，基本就是我前面说的 **【实现总结 / Implementation Summary】+ 开发交付说明**。

它不是最终学习笔记，而是 Codex 实现完以后，用来告诉我们“这次到底做了什么”的交付材料。

你这张图里已经很符合要求了，比如包含：

- `1. Implementation Summary`：说明 VII-C 实现了什么；
- `2. Files Changed`：说明改了哪些文件、各自负责什么；
- 后面通常还应该继续有 `Design Mapping`、`Tests Added / Updated`、`Verification Result`、`Demo Result`、`Scope Check`、`Open Questions / Deferred Issues`。

像截图里这段：

> `AgentRuntime.run()` 支持同一次运行内的 Model → Tool → Model  
> 新增工具注册、Schema 校验、执行与错误规范化、多个调用顺序处理、`maxTurns = 5`

这就是非常典型的 **Implementation Summary（实现总结）**。

而下面：

```text
src/tools/tool.ts
src/tools/tool-registry.ts
src/tools/tool-executor.ts
src/runtime/agent-runtime.ts
...
```

这属于 **Files Changed（修改文件说明）**，也属于同一份“开发结果汇报”。

你可以简单区分成：

```text
Codex 实现总结
= 开发完成后的交付报告
= 给我们 Review 代码用

Milestone Note / 学习笔记
= Review + Debug 都结束、确认 Done 后
= 最终归档用
```

所以如果 Codex 现在输出的就是截图这种内容，你后面把 **这份完整实现总结 + 测试结果 + 最新源码 zip** 发给我即可，我们就可以正式进入 **Runtime Verification / Debug + Code Review + Theory Feedback**。

## 轮次 12 — 3c4f0f82-f358-4486-b93e-b6e4dd39c16a

### User

把那个压缩成 zip 的命令再发我一下

### ChatGPT

如果你是在项目根目录，只想把 `src` 目录压成 zip：

```bash
zip -r src.zip src
```

如果还想把测试一起压进去，建议：

```bash
zip -r source-review.zip src test package.json tsconfig.json
```

你这次给我做 VII-C Review，我更建议第二个，因为我还需要看测试和工程配置。

## 轮次 13 — 2daefbbd-ef4c-433e-b7e7-f51cd7edd4d0

### User

Codex 已经完成当前 Part 的第一轮实现。

下面是 Codex 的实现总结、修改文件、测试结果以及关键代码 / 文件。

# **实现总结：**

## 1. Implementation Summary

已完成 VII-C：`AgentRuntime.run()` 支持同一次运行内的 **Model → Tool → Model**。

新增工具注册、Schema 校验、执行与错误规范化、顺序处理多个调用，以及默认 `maxTurns = 5` 的循环边界。保持 messages-only State、现有消息模型与 Provider 异常语义，没有新增 Loop class。

新增直接依赖 Ajv，用已有 JSON Schema 同时描述和校验参数，无需维护第二套规则。[Ajv 官方说明](https://ajv.js.org/guide/getting-started.html)

## 2. Files Changed

以下路径均位于仓库中：

| 文件职责                                                                                                                                                    |                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [src/tools/tool.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool.ts)                                                                        | `Tool<TArgs>`、JSON 结果值、成功／失败 Contract        |
| [src/tools/tool-registry.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-registry.ts)                                                      | 注册、查找、顺序列举、重复名称检查与定义引用隔离                     |
| [src/tools/tool-executor.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool-executor.ts)                                                      | 校验、执行、预期失败规范化                                |
| [src/runtime/agent-runtime.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts)                                                  | Tool Loop、结果回流、Registry definitions、maxTurns |
| [src/demo/tool-runtime-demo.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/demo/tool-runtime-demo.ts)                                                | 无网络的确定性 Tool Loop Demo                       |
| [src/demo/runtime-demo.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/demo/runtime-demo.ts)                                                          | 非 completed outcome 时停止 Demo                 |
| [test/tool-runtime.test.ts]\(/Users/shengq/Desktop/mini-agent-runtime/test/tool-runtime.test.ts)                                                        | VII-C 新测试                                    |
| [test/agent-runtime.test.ts]\(/Users/shengq/Desktop/mini-agent-runtime/test/agent-runtime.test.ts)                                                      | 更新 tool\_calls 语义，保留引用隔离覆盖                   |
| [package.json]\(/Users/shengq/Desktop/mini-agent-runtime/package.json)、[package-lock.json]\(/Users/shengq/Desktop/mini-agent-runtime/package-lock.json) | Ajv 依赖与 `demo:tools` 命令                      |
| [README.md]\(/Users/shengq/Desktop/mini-agent-runtime/README.md)                                                                                        | 使用说明、错误契约与已知边界                               |

## 3. Design Mapping

| 决策实现对应 |                                                                          |
| ------ | ------------------------------------------------------------------------ |
| C-AD01 | executable `Tool<TArgs>` 包含 definition 和 execute；原 `ToolDefinition` 未修改。 |
| C-AD02 | Registry 是工具唯一来源；重复注册抛错，保持注册顺序。                                          |
| C-AD03 | `ToolCall.arguments` 保持 unknown，校验通过后执行。                                 |
| C-AD04 | Executor 校验 Registry 中同一份 parameters；不转换类型或补默认值。                         |
| C-AD05 | Executor 统一负责查找、校验、执行和结果规范化。                                             |
| C-AD06 | 三种 Tool Failure 返回结果；Provider、Schema 和内部异常继续抛出。catch 只包围 execute。        |
| C-AD07 | 成功与失败均序列化到既有 `RuntimeToolMessage.content`，保留 toolCallId。                 |
| C-AD08 | tool\_calls 在同一 run 内继续；user\_input 只追加一次。                               |
| C-AD09 | 全部调用顺序执行、逐个写回；正常失败不阻止后续调用。                                               |
| C-AD10 | currentTurn 是 run 局部变量；maxTurns 是配置，默认 5。                                |
| C-AD11 | 新增 `{ type: "limit_reached", maxTurns }`，未修改 FinishReason。               |
| C-AD12 | 最后允许回合先保存 model\_output，再返回限制结果，不执行工具。                                   |

无架构偏离。

## 4. Tests Added / Updated

新增 **25 项测试**，总计 **42 项**，覆盖：

- 同一次 run 内两次模型调用、完整历史顺序及结果进入下一请求。
- 工具不存在、参数错误、同步异常、异步 rejection 和非 Error 抛出。
- 多工具顺序执行，以及 A 成功、B 失败后 C 继续。
- Provider 首轮及工具执行后的异常原样传播。
- maxTurns 为 1、3、默认值，以及跨 run 重新计数。
- 最后回合不执行工具；最后回合 stop 仍然 completed。
- 非法配置、Schema 错误、查找异常、序列化异常继续抛出。
- Registry 重复注册、顺序和 Schema 引用隔离。
- Tool、Provider 和历史副本不能修改已保存事实。

原 `unsupported(tool_calls)` 测试已改为验证失败结果回流及同一次 run 继续，没有删除覆盖。VII-A 测试保持通过。

## 5. Verification Result

实际执行结果：

```
npm test
# tests 42
# pass 42
# fail 0

npm run build
> tsc -p tsconfig.json
退出码：0
```

沿用 VII-B 的额外测试类型检查，退出码 **0**：

```
./node_modules/.bin/tsc --noEmit --target ES2022 \
  --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --strict --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

`git diff --check` 通过。

## 6. Demo Result

`npm run demo:tools` 的**真实程序输出**：

```
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
```

\*\*人工说明：\*\*此 Demo 使用确定性 Provider，没有调用真实 LLM；Registry、Executor、State 和循环均运行真实实现，第二次回答从实际收到的 Tool Result 生成。

## 7. Scope Check

未实现 VII-D～VII-H 或所列范围外能力。没有引入 ContextBuilder、Streaming、恢复、审批、并行工具执行、MCP、多 Agent 或生命周期框架；没有实现 Weather Agent。

## 8. Open Questions / Deferred Issues

达到 maxTurns 后，历史保留未执行的最后一批 Tool Call。再次 run 时，严格要求调用与结果配对的 Provider 可能拒绝这段历史。已记录于 README；按本 Milestone 约束，没有加入历史修复或恢复逻辑。

# 代码：如上传的 src

# 测试输出：

➜  mini-agent-runtime git:(main) ✗ npm run test

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

✔ completes a normal answer and records runtime facts (2.234125ms)
✔ retains conversation across two runs on the same runtime (0.343417ms)
✔ records missing tool failure and continues within the same run (0.31825ms)
✔ preserves output for length without retry or continuation (0.536208ms)
✔ preserves output for unknown without retry or continuation (0.344ms)
✔ propagates the original provider throw without retry (0.353916ms)
✔ propagates the original provider reject without retry (0.172125ms)
✔ history copies protect the array, messages, tool calls and nested arguments (0.251208ms)
✔ provider response and request references cannot mutate runtime facts (0.590542ms)
✔ maps provider-neutral model messages to OpenAI chat messages (0.5685ms)
✔ maps provider-neutral tool definitions to OpenAI function tools (0.133666ms)
✔ maps OpenAI assistant text to a Runtime assistant message (0.051125ms)
✔ maps an OpenAI function tool call and parses its arguments (0.109375ms)
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.183167ms)
✔ maps known finish reasons and normalizes provider-specific reasons (0.043ms)
✔ maps OpenAI usage to the Runtime usage model (0.080625ms)
✔ maps a complete OpenAI response without leaking its raw shape (0.057875ms)
✔ happy path uses registry definitions and result in the second turn of one run (13.735125ms)
✔ invalid arguments null never invoke execute and allow continuation (6.88775ms)
✔ invalid arguments [] never invoke execute and allow continuation (4.253667ms)
✔ invalid arguments "bad" never invoke execute and allow continuation (3.381292ms)
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.8575ms)
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.452208ms)
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.007833ms)
✔ tool throw becomes an execution failure visible to the next model turn (3.356708ms)
✔ tool reject becomes an execution failure visible to the next model turn (3.177125ms)
✔ tool non-error becomes an execution failure visible to the next model turn (3.158625ms)
✔ multiple calls finish sequentially before the next turn (mixed=false) (5.694917ms)
✔ multiple calls finish sequentially before the next turn (mixed=true) (4.916625ms)
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.38525ms)
✔ maxTurns=3 counts model turns, skips final tools and resets per run (2.656708ms)
✔ maxTurns=default counts model turns, skips final tools and resets per run (3.324417ms)
✔ stop on the last allowed turn still completes (0.229042ms)
✔ invalid maxTurns fails at construction (0.357166ms)
✔ provider failure after tool execution propagates the same error and preserves facts (3.792209ms)
✔ tool argument and result references cannot mutate history (2.250667ms)
✔ registry rejects duplicates, preserves order and isolates schema references (2.776875ms)
✔ provider cannot change the schema used for tool validation (2.327791ms)
✔ invalid schema and async schema are configuration bugs, not invocation failures (4.703875ms)
✔ lookup bugs propagate unchanged (0.205333ms)
✔ result serialization bugs propagate outside the execute catch boundary (2.174584ms)
✔ tool_calls without calls is an invariant violation (0.151167ms)
ℹ tests 42
ℹ suites 0
ℹ pass 42
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 230.177375
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
➜  mini-agent-runtime git:(main) ✗ npm run demo

> mini-agent-runtime@0.1.0 demo
> tsx src/demo/openai-demo.ts

{
  "message": {
    "role": "assistant",
    "content": "Hello!"
  },
  "finishReason": "stop",
  "usage": {
    "inputTokens": 12,
    "outputTokens": 157,
    "totalTokens": 169
  }
}



# 现在请进入：

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

我先给结论：**你这次上传的 `src(3).zip` 不是 VII-C 的最新源码，而是 VII-B 的旧版本。**

我已经实际解压并检查了压缩包。里面当前仍然是：

```ts
tool_calls
→ unsupported
```

而且没有你实现总结里提到的这些文件/能力：

```text
src/tools/tool.ts
src/tools/tool-registry.ts
src/tools/tool-executor.ts
src/demo/tool-runtime-demo.ts
test/tool-runtime.test.ts
Ajv
maxTurns
limit_reached
demo:tools
```

压缩包里的 `package.json` 也没有 `ajv` 依赖，`agent-runtime.ts` 仍是 VII-B 的单次 `generate()` 实现。

所以这次出现了和你 VII-B Review 时非常类似的问题：

> **终端输出和 Codex 实现总结明显是最新 VII-C，但上传给我的 zip 是旧源码。**

这意味着我现在不能负责任地根据“实现总结 + 42 个测试通过”直接宣布 VII-C Done，因为你也特意要求我：

> 不要默认测试通过 = 架构正确。

而现在恰恰缺少最关键的“真实最新实现源码”。

你这次不用重新发所有文字了，**只需要重新压一次最新代码上传**。

建议直接在 `mini-agent-runtime` 项目根目录执行：

```bash
rm -f source-review.zip
zip -r source-review.zip src test package.json package-lock.json tsconfig.json README.md
```

然后上传：

```text
source-review.zip
```

这样我能同时看到：

- `src/tools/*`
- 最新 `agent-runtime.ts`
- `test/tool-runtime.test.ts`
- `package.json / package-lock.json`
- README 里的 Deferred Issue

等你上传正确版本后，我会直接继续当前 Review，不重新做 Architecture Analysis，按你要求完整给出：

```text
1. Design Decisions 是否真实落实
2. 是否 Scope creep
3. State ownership / 模块职责 / 依赖方向
4. Public Contract
5. Error Contract
6. Loop / maxTurns / termination
7. 测试质量
8. 是否过度设计
9. 与 Agent Runtime 理论 / Pi 的映射
10. 必须修复 / 建议优化 / 后续处理
11. VII-C 是否 Done
12. 如未 Done，只给最小 Codex Fix Task
```

顺带说一下：**单看你贴出来的实现总结和 42 项测试名称，整体方向目前看是非常贴合我们之前 Design Decision 的，甚至边界测试做得比最低要求更充分。** 但这只能算初步判断，不能替代源码 Review。

## 轮次 14 — 27d9d306-4db9-4733-937d-d96bd997018c

### User

我上传了最新的。你结合我上一次发给你的把文件替换后，然后再结合文件重新看下

[User attached 1 file; file contents were not included]

### ChatGPT

我已经把你这次最新上传的 `source-review.zip` 实际解压并重新检查了一遍，也和你上一条发来的 **Codex 实现总结、42 项测试输出、VII-B 最终决策、VII-C 我们刚刚确认的 C-AD01～C-AD12** 对齐了。

这次是对的版本，确实包含了：

```text
src/tools/tool.ts
src/tools/tool-registry.ts
src/tools/tool-executor.ts
src/runtime/agent-runtime.ts
src/demo/tool-runtime-demo.ts
test/tool-runtime.test.ts
```

而且 `package.json` 中也确实加入了 `ajv` 和 `demo:tools`。

先给结论：

> **VII-C 整体实现质量是比较好的，绝大多数 Design Decisions 都真实落地了，也没有明显 Scope Creep（范围膨胀）。**
>
> 但我目前发现 **2 个建议在宣布 Done 前修掉的问题，其中 1 个我认为属于明确的生命周期缺陷，应该归到“必须修复”。**
>
> 所以我暂时不建议直接把 VII-C 标记为 Done。

下面详细说。

---

# 一、Design Decisions 是否真正落实

整体上，**落实得相当完整**。

## C-AD01：ToolDefinition 与 Tool 分离

当前：

```ts
export interface Tool<TArgs = unknown> {
  definition: ToolDefinition;
  execute: (args: TArgs) => ToolValue | Promise<ToolValue>;
}
```

这个非常符合我们之前定的：

```text
ToolDefinition
= 给模型看的说明书

Tool
= definition + execute
```

没有污染 VII-A 的 `ToolDefinition`。

**结论：符合。**

---

## C-AD02：ToolRegistry 是唯一来源

当前：

```ts
#tools = new Map<string, Tool>();
```

并且：

```ts
register()
get()
listDefinitions()
```

都有。

重复注册：

```ts
if (this.#tools.has(definition.name)) {
  throw new Error(...)
}
```

不会静默覆盖。

`AgentRuntime` 构造请求时：

```ts
const definitions = this.#registry.listDefinitions();
```

然后才放进：

```ts
ModelRequest.tools
```

所以不存在 caller 再维护第二份 Tool Definition。

**结论：符合。**

---

## C-AD03 / C-AD04：unknown + Schema Validation

保留了：

```ts
ToolCall.arguments: unknown
```

然后 Executor 里：

```ts
const args: unknown = structuredClone(call.arguments);

if (!validate(args)) {
  return INVALID_ARGUMENTS;
}
```

这个边界非常清楚：

```text
模型参数
↓
unknown
↓
Ajv 校验
↓
execute
```

而且使用的正是：

```ts
tool.definition.parameters
```

没有再维护第二份 Runtime Schema。

**结论：符合，而且是这次实现里比较干净的一部分。**

---

# 二、Ajv 的引入是否过度？

我认为 **没有过度设计**。

因为你们当前 `ToolDefinition.parameters` 本身就是 JSON Schema 风格的数据：

```ts
Record<string, unknown>
```

所以使用 Ajv 相当于直接把已有 Schema 变成运行时校验。

没有多引入：

```text
Zod → JSON Schema 转换
自研 validator
自研 schema DSL
```

因此它属于“解决当前真实需求的直接依赖”。

这点 Codex 的判断合理。

---

# 三、ToolExecutor 的职责边界

当前代码：

```ts
async execute(call: ToolCall): Promise<ToolResult>
```

里面依次处理：

```text
Registry lookup
→ Schema compile / validate
→ execute
→ normalize failure
```

和我们之前讨论的边界基本一致。

尤其这一段做得比较好：

```ts
try {
  result = await tool.execute(args);
} catch (error) {
  return TOOL_EXECUTION_FAILED;
}
```

`try/catch` 只包住：

```text
tool.execute()
```

没有把前面的：

```text
Registry bug
Schema compile bug
Validation implementation bug
```

全部吞掉。

这正是我们之前强调的：

> 不要 `catch everything`，否则 Runtime 自己坏了也会被伪装成 Tool Failure。

测试也专门验证了：

```text
lookup bugs propagate unchanged
invalid schema ... are configuration bugs
result serialization bugs propagate
```

所以 Error Boundary（错误边界）不是只写在文档上，是真有测试约束的。

**结论：符合，而且测试质量不错。**

---

# 四、State Ownership 没有被破坏

VII-B 明确决定：

```ts
RuntimeState {
  messages
}
```

VII-C 没有趁机加入：

```text
iteration
status
errors
maxTurns
tools
```

而是：

```ts
readonly #state: RuntimeState = { messages: [] };
readonly #maxTurns: number;
readonly #registry: ToolRegistry;
```

`currentTurn` 也只是：

```ts
for (let currentTurn = 1; ...)
```

这很好。

它证明了一个我们前面反复讨论的概念：

> **一个变量会变化，不代表它就是 RuntimeState。**

VII-B 的 messages-only State 继续保持成立。fileciteturn0file0

---

# 五、Tool Loop 是否真实成立

这次已经不再是“名义上的 Loop”。

核心代码：

```ts
for (let currentTurn = 1; currentTurn <= this.#maxTurns; currentTurn += 1) {
  ...
  const response = await this.#provider.generate(request);

  this.#state.messages.push(output);

  switch (response.finishReason) {
    case "stop":
      return { type: "completed" };

    case "tool_calls":
      ...
      for (const call of output.toolCalls) {
        const result = await this.#executor.execute(call);

        this.#state.messages.push({
          type: "tool_result",
          ...
        });
      }

      break;
  }
}
```

现在确实形成：

```text
Model
↓
Tool
↓
tool_result
↓
回到 for 下一轮
↓
Model
```

而且：

```ts
this.#state.messages.push({ type: "user_input" ... })
```

是在 `for` 外面。

因此同一次 run 内不会重复写 user。

这是正确的。

---

# 六、Multiple Tool Calls 处理正确

这里也符合之前的决定：

```ts
for (const call of output.toolCalls) {
  await this.#executor.execute(call);
}
```

所以是：

```text
A 完成
↓
B 完成
↓
C 完成
↓
下一 Model Turn
```

没有提前实现 Promise.all 并行工具执行。

而测试专门验证了顺序：

```text
start 1
end 1
start 2
end 2
start 3
end 3
```

并且 mixed failure：

```text
A success
B invalid
C success
```

也能继续执行 C。

**结论：符合，没有偷偷实现 VII-F 或复杂调度。**

---

# 七、Public Contract 整体不算膨胀

目前公开新增的东西主要是：

```text
Tool<TArgs>
ToolResult
ToolError
ToolRegistry
ToolExecutor
AgentRuntimeOptions
RunOutcome.limit_reached
```

没有出现：

```text
ToolManager
RunController
Lifecycle
ExecutionContext
ToolPipeline
AgentLoop class
Plugin framework
```

这一点是好的。

目前 Public Contract（公共契约）总体仍然可控。

---

# 八、但这里有一个值得注意的类型问题

当前：

```ts
interface Tool<TArgs> {
  definition: ToolDefinition;
  execute(args: TArgs): ...
}
```

Registry 注册以后：

```ts
execute: (args) => execute(args as TArgs)
```

这里实际上存在一个隐含前提：

> `definition.parameters` 必须真的和 `TArgs` 描述的是同一种数据。

例如开发者完全可以写：

```ts
Tool<{ a: number }>
```

但 Schema 却定义：

```json
{
  "type": "string"
}
```

Ajv 校验通过 `"hello"` 后，代码最终还是会：

```ts
"hello" as { a: number }
```

交给 `execute()`。

TypeScript 并不能证明：

```text
JSON Schema
===
TArgs
```

所以注释：

```ts
/** parameters must describe TArgs */
```

实际上是一项 **开发者必须遵守的契约**，不是编译器保证。

### 这算不算必须修？

我暂时归为：

> **当前可以接受，以后再处理。**

原因是 Mini Runtime v1 没必要现在做：

```text
JSON Schema → TypeScript 类型生成
TypeBox
Zod
Schema 泛型推导
```

否则 VII-C 会迅速变成类型系统工程。

但是 Milestone Note 中应该明确写：

> `Tool<TArgs>` 的 `TArgs` 与 JSON Schema 一致性，目前属于 Tool 开发者责任，Runtime 只能保证“符合 Schema”，不能从 Schema 静态证明它一定等于 TArgs。

这其实和你以前问过的“Tool SDK 必须有开发规范”是同一个问题。

---

# 九、测试不是只覆盖 Happy Path

这一点可以明确给 Codex 好评。

42 个测试里，VII-C 的新增测试已经覆盖：

```text
正常 Tool Loop
参数 null
参数 []
参数 string
字段类型错误
字段缺失
额外字段
同步 throw
异步 reject
非 Error throw
多个 ToolCall
混合成功失败
maxTurns=1
maxTurns=3
默认 maxTurns
最后一轮 stop
非法 maxTurns
第二轮 Provider failure
引用污染
重复注册
Schema 引用污染
非法 Schema
async Schema
Registry bug
序列化 bug
空 tool_calls invariant
```

这已经明显不是：

```text
happy path 跑通就算完
```

而且很多测试是在验证：

> 谁应该吞错误，谁不应该吞错误。

这种测试比单纯测结果更有架构价值。

---

# 十、Scope 是否扩大

没有明显越界。

没有看到：

```text
ContextBuilder
TurnSnapshot
Events
Streaming
Abort
SessionStore
Approval
Permission
Parallel tools
MCP
Weather Agent
```

所以整体 Scope Control（范围控制）是好的。

---

# 十一、现在说最重要的问题：maxTurns 会留下“坏历史”

这是我认为本轮 **必须修复** 的地方。

Codex 自己其实已经发现了：

> 达到 maxTurns 后，历史保留最后一批没有执行的 Tool Call；再次 run 时，严格 Provider 可能拒绝。

这个问题不是“未来 Session Recovery 再说”那么简单。

因为它直接影响当前 VII-B 已经支持的能力：

```text
同一个 AgentRuntime 连续 run()
```

VII-B 明确把跨 run 历史复用作为当前能力。fileciteturn0file0

---

## 现在会发生什么？

假设：

```text
maxTurns = 1
```

模型返回：

```text
assistant
tool_calls:
  get_weather
```

当前 Runtime：

```ts
保存 model_output(tool_call)

if (currentTurn === maxTurns) {
  return limit_reached;
}
```

所以 State 变成：

```text
user
assistant(tool_call)
```

但没有：

```text
tool_result
```

然后下一次用户：

```ts
runtime.run("那算了")
```

State 变成：

```text
user
assistant(tool_call)
user
```

之后发送给 OpenAI。

对于严格 Tool Calling 协议来说，这种历史通常是不合法的：

```text
assistant 发出了 tool_calls
却没有紧随对应的 tool 消息
```

所以 Runtime 正常返回：

```ts
{ type: "limit_reached" }
```

之后，却可能进入一个：

> **后续无法正常使用的状态。**

这就不只是 Deferred Recovery，而是当前 Lifecycle（生命周期）一致性问题。

---

# 十二、为什么这是我们之前 Design Decision 本身的问题

这里需要明确：

这不是 Codex 擅自改坏了。

它其实**严格执行了我们之前定的 C-AD12**：

> 最后一轮返回 tool_calls 时，不执行 Tool，直接 limit_reached。

所以这个问题实际上是：

> **我们之前自己的架构决定，在真正代码落地后暴露出了副作用。**

这就是为什么你一直坚持：

> 测试通过 ≠ 架构一定正确。

这次正好是一个很好的例子。

---

# 十三、我建议怎么修？

有几个方案，但我们不要扩大范围。

我认为最小、最合理的是：

### 当最后一轮返回 Tool Calls 时

仍然不要真正执行 Tool。

这一点我们可以保留，尤其未来 Tool 可能有副作用。

但应该为每个未执行 ToolCall 写一个对应的：

```text
tool_result
```

明确告诉后续模型：

```text
这个 Tool 没有执行，因为 Agent 达到了 maxTurns。
```

例如语义上：

```json
{
  "success": false,
  "error": {
    "code": "TOOL_EXECUTION_SKIPPED",
    "message": "Tool was not executed because the run reached maxTurns."
  }
}
```

然后 State 就会成为：

```text
user
assistant(tool_call)
tool_result(skipped)
```

再：

```text
return limit_reached
```

这样：

1. 不执行 Tool；
2. 不产生副作用；
3. 保留模型真实提出 Tool Call 的事实；
4. Tool Call / Tool Result 配对完整；
5. 下一次 `run()` 可以继续构造合法上下文。

我认为这是最小修复。

---

# 十四、第二个必须顺手修的小问题：Invariant 检查顺序

当前：

```ts
case "tool_calls":
  if (currentTurn === this.#maxTurns) {
    return limit_reached;
  }

  if (output.toolCalls === undefined || output.toolCalls.length === 0) {
    throw ...
  }
```

这有一个问题。

假设：

```text
最后一个 Turn
+
finishReason = tool_calls
+
toolCalls = []
```

当前会优先：

```text
return limit_reached
```

而不会发现：

```text
这是一个 malformed response / invariant violation
```

也就是说：

> maxTurns 把一个本该暴露的协议错误遮住了。

所以检查顺序应该先：

```text
tool_calls 是否真的存在
```

再判断：

```text
是否达到 maxTurns
```

即：

```text
finishReason = tool_calls
↓
先验证至少有一个 ToolCall
↓
再判断有没有继续预算
```

这个修改很小，但我建议一起做。

---

# 十五、Tool Error message 直接暴露原始 error.message

当前：

```ts
message: error instanceof Error ? error.message : String(error)
```

这个设计目前可用，但我归为：

> **建议优化，不阻塞 VII-C Done。**

因为未来 Tool 可能抛：

```text
数据库连接字符串
内部 URL
SQL
文件路径
token 相关信息
```

把原始 message 原样喂给 LLM 不一定合适。

但现在我们做的是 Mini Runtime，而且还没进入：

```text
安全策略
Tool Permission
Approval
Observability
```

所以没必要现在做错误脱敏框架。

Milestone Note 记录即可。

---

# 十六、ToolResult 用 JSON.stringify 写进 content：现在合理

当前：

```ts
content: JSON.stringify(result)
```

有人可能会说：

> 为什么 RuntimeToolMessage 不直接存结构化 ToolResult？

我认为 **现在不要改。**

因为现有消息契约就是：

```ts
RuntimeToolMessage {
  toolCallId: string;
  content: string;
}
```

而 Model Tool Message 也天然是 string content。

所以 VII-C 通过：

```text
结构化 ToolResult
↓
JSON.stringify
↓
既有 RuntimeToolMessage.content
```

属于最小增量。

不要为了“更强类型”把 VII-A / VII-B 消息体系全部推倒。

---

# 十七、和 Agent Runtime 理论对应后，有几个值得重新理解的点

这次实现之后，有三个认识会比理论课时更具体。

### 1. Tool Error 本身就是 Observation（观察结果）

以前我们说：

```text
Tool Result = Observation
```

容易下意识觉得 Observation 是：

```text
天气 = 28°C
```

但现在代码真正证明：

```text
INVALID_ARGUMENTS
TOOL_NOT_FOUND
TOOL_EXECUTION_FAILED
```

同样是 Observation。

Agent 下一步推理需要知道：

> “我刚才的行动失败了，而且为什么失败。”

所以 Observation 不等于 Success Result。

---

### 2. Agent Loop 的核心不是 `while`

VII-B 没 `while` 依然是 Runtime。

VII-C 加了：

```ts
for (...)
```

之后才真正多轮。

所以你现在可以更准确地理解：

> **Loop 的本质是“存在明确的继续条件和状态推进”，不是代码里有没有一个 while。**

这和我们之前 Pi 学习里看到的 Runtime Loop 是一致的：模型输出、工具结果、下一步决策共同推动循环，而不是单纯语法结构。fileciteturn0file0

---

### 3. Runtime 里“终止”也是状态一致性问题

这次 `maxTurns` 的问题尤其典型。

我们原来可能只考虑：

```text
什么时候 return？
```

但现在会发现更完整的问题应该是：

> **return 之前，我留下的 Conversation State 是否仍然是一个合法、可继续使用的状态？**

这已经是工业 Runtime 很重要的一层思维。

Terminate（终止）不只是：

```text
结束函数
```

还是：

```text
结束后系统处于什么状态
```

---

# 十八、和 Pi 的对照

这次没有必要机械模仿 Pi，但能看到之前学 Pi 的价值。

Pi 里我们反复讨论过：

```text
Core 负责 Loop 和消息推进
Tool 只负责自己的执行
Policy 通过边界注入
Tool Result 先包装成消息，再进入下一轮
```

你现在自己的 Mini Runtime 也已经出现了类似边界：

```text
AgentRuntime
→ 驱动流程

ToolRegistry
→ 能力查找

ToolExecutor
→ 确定性执行边界

Tool
→ 业务能力

RuntimeMessage
→ 保存已经发生的事实
```

重点不是代码长得像 Pi，而是：

> **当真实需求出现以后，你自己也推导出了类似的职责分离。**

这比“照着 Pi 抄一个 Runtime”有价值很多。

---

# 十九、最终 Review 分类

## 1. 必须修复

只有一组，而且范围很小：

**A. `limit_reached` 后不能留下 unresolved Tool Call。**

当前：

```text
assistant(tool_calls)
→ limit_reached
```

会导致 Runtime history 可能无法在下一次 run 中继续使用。

建议：

```text
assistant(tool_calls)
→ 为每个未执行调用写 tool_result(skipped)
→ limit_reached
```

同时：

**B. `tool_calls` 的 invariant 检查应发生在 maxTurns 判断之前。**

不能让 `limit_reached` 遮住 malformed `tool_calls`。

---

## 2. 建议优化

当前不要求修：

- Tool execution error 的原始 `error.message` 未来需要考虑脱敏；
- duplicate Tool 可以未来使用专门 Error 类型，但目前普通 Error 足够；
- `Tool<TArgs>` 的 Schema 与 TArgs 无法静态证明一致，需要明确开发者契约。

这些都不值得现在扩 Scope。

---

## 3. 当前可以接受、以后处理

- `Tool<TArgs>` 与 JSON Schema 的静态类型关联；
- Tool Registry 目前可以在 Runtime 创建后继续 register；
- 更复杂 Loop Detection；
- Token / Cost Budget；
- Tool timeout；
- Retry；
- structured ToolMessage；
- Tool error 展示策略。

全部不阻塞 VII-C。

---

# 二十、Milestone Done 判断

我目前判断：

> **VII-C 已经完成约 95%，核心架构和主体实现是正确的，但还不建议正式标记 Done。**

原因不是代码主体有大问题，而是：

```text
limit_reached
```

是 VII-C 新增的 Public Lifecycle Contract（公共生命周期契约）。

既然 Runtime 正常返回了：

```ts
{ type: "limit_reached" }
```

它就不应该顺手把内部 State 留成一个可能无法再次发送给真实 Provider 的坏状态。

这个问题就在 VII-C 自己引入的 `maxTurns` 范围内，因此应该在当前 Milestone 闭环，不应该甩给 VII-G Conversation Recovery。

---

# 最小 Codex Fix Task

你可以把下面这段直接发给 Codex：

> 当前 VII-C 主体 Review 通过，不要重新设计 Tool Registry、Tool Executor、Error Contract 或 Agent Loop，也不要扩大 Scope。
>
> 只修复以下两个 lifecycle / termination 问题：
>
> 1. 当前最后一个允许的 Model Turn 如果返回 `tool_calls`，Runtime 会保存 assistant tool call 后直接返回 `limit_reached`，留下没有对应 `tool_result` 的 unresolved Tool Call。这样下一次 `runtime.run()` 可能向严格 Provider 发送非法对话历史。
>
>    请保持“最后一个 Turn 不真正执行 Tool”的设计，但为这一批未执行 ToolCall 写入对应的 `RuntimeToolMessage`，明确表示：
>
>    ```text
>    Tool execution was skipped because maxTurns was reached.
>    ```
>
>    使用最小的稳定错误结构，例如增加：
>
>    ```text
>    TOOL_EXECUTION_SKIPPED
>    ```
>
>    或语义等价的最小 Contract。
>
>    要求：
>
>    ```text
>    model_output(tool_calls)
>    → tool_result(skipped) for every call
>    → return limit_reached
>    ```
>
>    不真正调用 Tool.execute()。
>
>    这样正常返回 `limit_reached` 后，Runtime history 仍保持 Tool Call / Tool Result 配对，可供后续 run 使用。
>
> 2. `finishReason === "tool_calls"` 时，必须先验证：
>
>    ```text
>    toolCalls 存在且非空
>    ```
>
>    再判断是否达到 maxTurns。
>
>    malformed `tool_calls` 不应因为恰好发生在最后一个 Turn 而被 `limit_reached` 掩盖。
>
> 补充最小测试：
>
> ```text
> - maxTurns 达到后，每个 final tool call 都产生 skipped tool_result；
> - Tool.execute() 没有被调用；
> - 随后再次 runtime.run() 时，下一 ModelRequest 中历史包含完整 assistant(tool_calls) → tool messages → user 顺序；
> - final turn 的 finishReason=tool_calls 但 toolCalls=[] 时，即便已经达到 maxTurns，也仍然抛 invariant error。
> ```
>
> 保持其他 VII-C 行为、Public Contract 和测试不变。
>
> 完成后执行：
>
> ```bash
> npm test
> npm run build
> ```
>
> 然后只汇报本次 Fix 修改文件、测试结果以及是否引入新的设计变化。

你让 Codex 把这一小修复做完，再把 **修改总结 + 测试输出 + 最新源码** 给我。我再做一次非常窄的复核；如果这两点正确，VII-C 基本就可以正式进入 **Milestone Closure**。

## 轮次 15 — b2a9f452-d24e-4000-932f-2afa761e43e1

### User

# 修改总结：

已修复，仅修改 4 个文件：

- [agent-runtime.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/runtime/agent-runtime.ts)：先校验 toolCalls 存在且非空；达到上限时逐个写入 skipped 结果，不调用工具，再返回 `limit_reached`。
- [tool.ts]\(/Users/shengq/Desktop/mini-agent-runtime/src/tools/tool.ts)：增加 `TOOL_EXECUTION_SKIPPED` 错误码。
- [tool-runtime.test.ts]\(/Users/shengq/Desktop/mini-agent-runtime/test/tool-runtime.test.ts)：验证 skipped 结果配对、零执行、后续 run 的历史顺序，以及最后回合缺失／空 toolCalls 仍抛错。
- [README.md]\(/Users/shengq/Desktop/mini-agent-runtime/README.md)：同步终止行为说明。

验证结果：

- `npm test`：**45 通过，0 失败**。
- `npm run build`：通过。
- 测试类型检查、`git diff --check`：通过。

没有引入新的架构设计；仅增加指定错误码并修正终止行为，Registry、Executor、State 和其他 Public Contract 保持不变。

# 测试输出：

➜  mini-agent-runtime git:(main) ✗ npm test

> mini-agent-runtime@0.1.0 test
> tsx --test test/**/*.test.ts

✔ completes a normal answer and records runtime facts (2.295042ms)
✔ retains conversation across two runs on the same runtime (0.383959ms)
✔ records missing tool failure and continues within the same run (0.361083ms)
✔ preserves output for length without retry or continuation (0.179375ms)
✔ preserves output for unknown without retry or continuation (0.289917ms)
✔ propagates the original provider throw without retry (0.313834ms)
✔ propagates the original provider reject without retry (0.17525ms)
✔ history copies protect the array, messages, tool calls and nested arguments (0.231166ms)
✔ provider response and request references cannot mutate runtime facts (0.651459ms)
✔ maps provider-neutral model messages to OpenAI chat messages (0.758792ms)
✔ maps provider-neutral tool definitions to OpenAI function tools (0.135625ms)
✔ maps OpenAI assistant text to a Runtime assistant message (0.051333ms)
✔ maps an OpenAI function tool call and parses its arguments (0.097833ms)
✔ fails explicitly when OpenAI tool call arguments contain invalid JSON (0.15075ms)
✔ maps known finish reasons and normalizes provider-specific reasons (0.043875ms)
✔ maps OpenAI usage to the Runtime usage model (0.097625ms)
✔ maps a complete OpenAI response without leaking its raw shape (0.05525ms)
✔ happy path uses registry definitions and result in the second turn of one run (13.624542ms)
✔ invalid arguments null never invoke execute and allow continuation (7.770166ms)
✔ invalid arguments [] never invoke execute and allow continuation (4.672292ms)
✔ invalid arguments "bad" never invoke execute and allow continuation (4.52375ms)
✔ invalid arguments {"a":"2","b":3} never invoke execute and allow continuation (3.506792ms)
✔ invalid arguments {"a":2} never invoke execute and allow continuation (3.134708ms)
✔ invalid arguments {"a":2,"b":3,"extra":true} never invoke execute and allow continuation (3.466917ms)
✔ tool throw becomes an execution failure visible to the next model turn (3.103375ms)
✔ tool reject becomes an execution failure visible to the next model turn (3.778083ms)
✔ tool non-error becomes an execution failure visible to the next model turn (3.266666ms)
✔ multiple calls finish sequentially before the next turn (mixed=false) (5.845458ms)
✔ multiple calls finish sequentially before the next turn (mixed=true) (5.6ms)
✔ maxTurns=1 counts model turns, skips final tools and resets per run (0.488084ms)
✔ maxTurns=3 counts model turns, skips final tools and resets per run (3.438209ms)
✔ maxTurns=default counts model turns, skips final tools and resets per run (3.099041ms)
✔ a run after limit_reached receives paired skipped results before the new user input (0.281958ms)
✔ stop on the last allowed turn still completes (0.107625ms)
✔ invalid maxTurns fails at construction (0.195958ms)
✔ provider failure after tool execution propagates the same error and preserves facts (2.609542ms)
✔ tool argument and result references cannot mutate history (2.603875ms)
✔ registry rejects duplicates, preserves order and isolates schema references (2.678667ms)
✔ provider cannot change the schema used for tool validation (2.318458ms)
✔ invalid schema and async schema are configuration bugs, not invocation failures (4.552667ms)
✔ lookup bugs propagate unchanged (0.192875ms)
✔ result serialization bugs propagate outside the execute catch boundary (2.277666ms)
✔ tool_calls without calls is an invariant violation (0.163458ms)
✔ malformed tool_calls (missing) still throws on the final turn (0.119666ms)
✔ malformed tool_calls (empty) still throws on the final turn (0.080834ms)
ℹ tests 45
ℹ suites 0
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 259.261208

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

# 最新源码：如上传的文件

[User attached 1 file; file contents were not included]

### ChatGPT

我已经基于你这次最新上传的源码重新做了窄范围复核，重点只看上一次指出的两个问题有没有真的修好，同时检查有没有因为修复又引入新的架构偏移。

结论可以直接给：

> **这两个问题都已经正确修复。**
>
> **Part VII-C 现在可以正式判定为 Done。**

这次我不建议再让 Codex 改代码，可以进入 **Milestone Closure（里程碑收尾）**。

---

## 1. `limit_reached` 后遗留未配对 Tool Call：已修复

现在 `AgentRuntime` 在最后允许的 Model Turn（模型轮次）返回 `tool_calls` 时，会先保留模型输出，然后为每一个未执行的 Tool Call 写入一个对应的 skipped Tool Result（跳过执行结果）：

```ts
const skipped: ToolResult = {
  success: false,
  error: {
    code: "TOOL_EXECUTION_SKIPPED",
    message: "Tool execution was skipped because maxTurns was reached.",
  },
};

for (const call of output.toolCalls) {
  this.#state.messages.push({
    type: "tool_result",
    toolCallId: call.id,
    content: JSON.stringify(skipped),
  });
}
```

然后才：

```ts
return {
  type: "limit_reached",
  maxTurns: this.#maxTurns,
};
```

所以原来的坏状态：

```text
user
assistant(tool_call)
→ run 结束
```

现在变成：

```text
user
assistant(tool_call)
tool_result(skipped)
→ run 结束
```

这就解决了最核心的问题：

> Runtime 正常结束后，State 仍然保持 Tool Call / Tool Result 配对完整。

下一次 `run()` 再追加新的 user message 时，历史仍然是可继续消费的结构。

---

## 2. Codex 还专门补了“下一次 run”测试

这个测试很关键：

```text
a run after limit_reached receives paired skipped results before the new user input
```

它实际验证的不是简单：

```text
有没有写 skipped
```

而是完整验证：

```text
第一次 run：
user
assistant(tool_calls)
tool
tool
→ limit_reached

第二次 run：
上述历史
+
新的 user
→ 发给 Provider
```

测试里的顺序断言是：

```text
user
assistant(tool_calls)
tool(A skipped)
tool(B skipped)
user("continue")
```

这说明它真正回收了我们上次指出的 Lifecycle（生命周期）问题，而不是只为了让一个单测变绿。

这部分我认为修得很准确。

---

## 3. 最后一轮 malformed tool_calls 被 `maxTurns` 掩盖的问题：也修好了

现在代码顺序已经变成：

```ts
case "tool_calls":
  if (
    output.toolCalls === undefined ||
    output.toolCalls.length === 0
  ) {
    throw new Error(
      "tool_calls finish reason requires at least one ToolCall."
    );
  }

  if (currentTurn === this.#maxTurns) {
    ...
  }
```

也就是先检查：

```text
模型说自己返回了 tool_calls
↓
到底有没有真正的 ToolCall？
```

确认结构合法以后，才判断：

```text
是不是已经到 maxTurns？
```

这正是上次要求的顺序。

因此不会再出现：

```text
finishReason = tool_calls
toolCalls = []
maxTurns reached
```

却被错误地解释成：

```text
limit_reached
```

现在仍会暴露真正的协议 / 不变量错误。

---

## 4. 对应测试也不是只测了一个分支

Codex 新增了两个测试：

```text
malformed tool_calls (missing) still throws on the final turn

malformed tool_calls (empty) still throws on the final turn
```

也就是同时验证：

```text
toolCalls === undefined
```

和：

```text
toolCalls = []
```

即使发生在最后一个 Turn，也还是：

```text
throw invariant error
```

不会被 maxTurns 吃掉。

这部分也符合我们的 Fix Task。

---

# 5. `TOOL_EXECUTION_SKIPPED` 加进 Error Contract 合不合理？

合理。

现在：

```ts
ToolError.code =
  | "TOOL_NOT_FOUND"
  | "INVALID_ARGUMENTS"
  | "TOOL_EXECUTION_FAILED"
  | "TOOL_EXECUTION_SKIPPED";
```

这里虽然 `SKIPPED` 不是 ToolExecutor 执行失败产生的，而是 AgentRuntime 因运行预算不足主动产生的，但它仍然描述的是：

> 这次 Tool Call 最终没有执行，以及为什么没有执行。

所以作为写入 `RuntimeToolMessage` 的结构化结果是成立的。

而且它没有因此引入：

```text
RuntimeError hierarchy
Lifecycle event framework
Cancellation model
```

只是增加一个当前真实需要的错误码。

**这不算过度设计。**

---

# 6. State ownership 仍然干净

这次修复没有把：

```text
limit_reached
skipped
currentTurn
```

塞进 `RuntimeState`。

仍然是：

```ts
RuntimeState {
  messages: RuntimeMessage[];
}
```

这点很重要。

现在 State 中只增加了：

```text
tool_result(skipped)
```

因为它是已经发生的会话事实。

而：

```text
currentTurn
maxTurns
```

仍然只是执行控制。

所以 VII-B 定下来的 State ownership 没被破坏。

---

# 7. 模块职责也没有因为 Fix 变乱

现在职责依旧很清楚：

```text
AgentRuntime
= 决定整个流程怎么推进

ToolRegistry
= 保存和查找 Tool

ToolExecutor
= 真正校验并执行 Tool Call

Tool
= 业务执行能力

RuntimeState
= 保存消息事实
```

而 `TOOL_EXECUTION_SKIPPED` 是 Runtime 自己决定“不执行”产生的结果，所以由 `AgentRuntime` 构造，而不是硬塞进 `ToolExecutor`。

这一点我反而认为是正确的。

因为 Executor 并没有真的收到一次“请执行这个 Tool”的请求。

---

# 8. Error Boundary 仍然保持正确

最新实现依旧保持：

```text
Tool not found
Invalid arguments
Tool execute throws
        ↓
ToolResult
```

而：

```text
Provider Error
Runtime internal bug
Schema configuration bug
Registry bug
序列化 bug
        ↓
throw
```

没有因为 Fix 又加一个：

```ts
try {
  everything
} catch {
  TOOL_EXECUTION_FAILED
}
```

所以 C-AD06 继续成立。

---

# 9. 测试覆盖现在已经比较完整

从你贴出的 45 项测试以及我检查到的源码测试来看，VII-C 已经覆盖了几乎所有当前定义出来的边界：

```text
正常 Model → Tool → Model

Tool not found

多种 Invalid Arguments

Tool sync throw

Tool async reject

非 Error throw

多个 Tool 顺序执行

部分 Tool Failure 后继续

maxTurns = 1

maxTurns = 3

默认 maxTurns

跨 run 重置 turn 计数

limit_reached 后历史仍合法

最后一轮 stop

非法 maxTurns

第二轮 Provider Error

引用隔离

Registry duplicate

Schema 引用隔离

Provider 修改 tools 不污染 Registry

非法 Schema

async Schema

Registry bug

序列化 bug

tool_calls 缺失

tool_calls 空数组

最后一轮 malformed tool_calls
```

所以可以很明确地说：

> **这不是 happy path 驱动的实现。**

尤其很多测试实际上是在锁定模块边界，而不只是测试业务输出。

---

# 10. Scope 依然没有扩大

最新源码没有因为这次 Fix 顺手加入：

```text
ContextBuilder
TurnSnapshot
AgentEvent
Streaming
Abort
SessionStore
Recovery
Approval
Permission
Parallel Tool Execution
MCP
Retry
```

因此 VII-C 没有提前侵入 VII-D～VII-H。

---

# 11. Public Contract 现在也可以接受

目前主要公开新增的是：

```text
Tool<TArgs>
ToolResult
ToolError
ToolRegistry
ToolExecutor
AgentRuntimeOptions
limit_reached
TOOL_EXECUTION_SKIPPED
```

它们全部都是 VII-C 已经真实需要的能力。

没有为了“以后可能需要”创建一堆抽象。

所以目前 Public Contract 没有我认为需要回收的内容。

---

# 12. 还有哪些问题可以以后再处理？

有几个，但都**不阻塞 VII-C Done**。

### `Tool<TArgs>` 和 JSON Schema 的静态一致性

现在：

```ts
Tool<{ a: number }>
```

和：

```ts
definition.parameters
```

是否真正一致，是开发者责任。

Runtime 能证明：

```text
arguments 符合 Schema
```

但 TypeScript 不能证明：

```text
Schema 一定等于 TArgs
```

第一版完全可以接受。

---

### Tool 执行异常 message 的暴露

现在：

```ts
error.message
```

会进入 Tool Result。

未来可能需要做：

```text
错误脱敏
用户可见错误
模型可见错误
内部日志错误
```

但现在没必要提前做安全错误框架。

---

### Registry 仍可在 Runtime 创建后 register

现在 Registry 本身是可注册的。

以后是否冻结 Registry，是未来真实需求再决定。

目前没必要提前限制。

---

# 13. 一个很值得记住的理论升级

这次 Fix 其实让我们对 **Termination（终止）** 有了比之前更完整的理解。

以前很容易理解成：

```text
Termination
=
什么时候 return
```

现在你已经实际遇到了：

```text
什么时候 return
+
return 时 State 留成什么样
```

所以更准确的是：

> **一个 Runtime 的终止设计，不只是“停止执行”，还要保证停止以后留下的状态是自洽的。**

这次：

```text
assistant(tool_calls)
→ 不能继续
```

如果直接 return，函数层面没错。

但从 Conversation（会话）角度看，状态没闭合。

补上：

```text
tool_result(skipped)
```

之后才真正做到：

```text
执行终止
+
消息历史终止
+
后续可继续
```

这个认知非常重要。

---

# 14. 和 Pi / Agent Runtime 理论再对照一次

这次你自己的实现已经非常清楚地验证了之前学过的几个概念。

```text
LLM
只负责：
“我要调用 Tool”
```

```text
Runtime
负责：
“能不能调用？
怎么执行？
执行完以后怎么继续？
什么时候停止？”
```

```text
ToolExecutor
负责：
“这一次具体 Tool Call 怎么安全执行？”
```

```text
State
负责：
“真实发生过什么？”
```

所以 Agent Runtime 的核心价值越来越清楚：

> **它不是替模型思考，而是把模型的不确定决策放进一个确定、可控、可验证的软件执行流程里。**

VII-C 已经第一次真正把这件事情写成了代码。

---

# 15. 我唯一无法独立复现的一点

我尝试在你上传的压缩包里直接执行：

```bash
npm test
npm run build
```

但压缩包没有包含 `node_modules`，因此当前隔离环境里报：

```text
tsx: not found
```

这不是你的代码失败，而是压缩包本来就不应该带 `node_modules`。

所以：

- **45 tests / 45 pass、build 通过**：来自你贴回的真实终端输出；
- **源码结构和测试断言是否与输出相符**：我已经基于最新 zip 实际检查；
- 我没有把“无法在这个临时环境安装依赖”伪装成自己重新执行成功。

这一点不影响这次架构 Review 结论。

---

# 最终判断

## 必须修复

**无。**

上一次两个必须修复项都已经正确解决。

## 建议优化

暂时只有之前已经提到的非阻塞项：

- 未来考虑 Tool Error message 脱敏；
- 未来如果确有需要，再增强 Schema ↔ TypeScript 类型一致性；
- Registry 生命周期是否冻结以后再根据需求决定。

## 当前可以接受、以后处理

上面这些以及更复杂的：

```text
Retry
Tool timeout
Token / Cost Budget
复杂 Loop Detection
Parallel Tool Execution
```

继续延期。

---

# Part VII-C：最终状态

**Done。**

可以正式关闭：

> **Part VII-C：Tool Registry + Tool Executor + Error Contract**

当前 Runtime 已经从 VII-B 的：

```text
User
→ Model
→ Final Answer
```

真正升级到：

```text
User
→ Model
→ Tool Call
→ Schema Validation
→ Tool Execution
→ Tool Result
→ Model
→ Final Answer
```

而且不仅 Happy Path 能跑，错误回流、多个 Tool、循环终止和跨 run 状态完整性也已经建立。

下一步按照我们的固定流程，不是立刻进入 VII-D，而应该先完成本 Milestone 的 **Milestone Closure（里程碑收尾）**：把 VII-C 的最终实现事实、Architecture Decisions、Debug/Fix、Theory Feedback、Deferred Work 以及你固定要求的学习收尾栏目正式归档。

## 轮次 16 — 6beec38f-0575-461e-a1f4-8ee239edcf74

### User

那收尾下吧

### ChatGPT

好，下面把 **Part VII-C：Tool Registry + Tool Executor + Error Contract** 正式收尾。

这次只做 Milestone Closure（里程碑收尾），不提前进入 VII-D。

---

# Part VII-C：Milestone Closure

## 1. Milestone 最终结论

VII-C 已完成，状态：

> **Done**

这一阶段把 Runtime 从 VII-B 的：

```text
User
→ Model
→ Final Answer
```

升级成了真正可循环的：

```text
User
→ Model
→ Tool Call
→ Tool Registry
→ Schema Validation
→ Tool Execution
→ Tool Result
→ Model
→ Final Answer
```

而且不是只跑通 Happy Path（正常路径），还补齐了：

- Tool 不存在
- 参数非法
- Tool 执行异常
- 多 Tool Call 顺序执行
- Tool Failure（工具失败）回流模型
- maxTurns（最大模型轮次）
- limit_reached（达到运行上限）
- 最后一轮 Tool Call 的 skipped 结果配对
- malformed tool_calls（异常工具调用结构）不被终止逻辑吞掉
- Provider Error（模型供应商错误）与 Runtime Bug（运行时自身错误）继续保持独立边界

---

# 2. 最终架构快照

当前 VII-C 后的核心关系可以收敛成：

```text
AgentRuntime
├── owns RuntimeState
├── calls ModelProvider
├── drives Model → Tool → Model loop
├── controls maxTurns
└── decides RunOutcome

ToolRegistry
├── register Tool
├── lookup Tool by name
└── expose ToolDefinition[]

ToolExecutor
├── lookup
├── validate arguments
├── execute
└── normalize expected Tool Failure

Tool
├── ToolDefinition
└── execute()

RuntimeState
└── messages
```

最关键的依赖方向没有被破坏：

```text
AgentRuntime
→ ModelProvider interface

AgentRuntime
→ ToolRegistry
→ Tool

AgentRuntime
→ ToolExecutor
→ ToolRegistry / Tool

OpenAIModelProvider
X 不知道 ToolExecutor
X 不负责执行 Tool
```

---

# 3. 最终 Architecture Decisions

这次可以正式归档成：

### C-AD01
`ToolDefinition` 与 executable Tool（可执行工具）分离。

### C-AD02
ToolRegistry（工具注册表）是 Tool 的唯一注册与查找来源，Tool Name 必须唯一，不允许静默覆盖。

### C-AD03
`ToolCall.arguments` 保持 `unknown`，模型参数在校验前不可信。

### C-AD04
同一份 Tool Schema 同时用于：

```text
给模型描述参数
+
Runtime 执行前校验参数
```

避免双份规则。

### C-AD05
ToolExecutor（工具执行器）统一负责：

```text
lookup
→ validation
→ execution
→ result normalization
```

### C-AD06
错误划分为三类：

```text
Tool Failure
→ Tool Result → 继续 Loop

Provider Error
→ throw

Runtime Bug
→ throw
```

### C-AD07
Tool 成功和 Tool Failure 都属于已经发生的事实，都进入 RuntimeState.messages。

### C-AD08
`tool_calls` 不再意味着 `run()` 结束，而是同一个 run 内的继续条件。

### C-AD09
一个 Model Response 中多个 Tool Call 第一版顺序执行，不做并行。

### C-AD10
maxTurns 限制 Model Turn（模型调用轮次），不是 Tool Call 次数。

### C-AD11
达到 maxTurns 属于 Runtime-level termination（运行时终止），不能污染 Model `FinishReason`。

### C-AD12
最后一轮模型返回 Tool Call 时不真正执行 Tool，但必须写入 skipped Tool Result，保证历史仍然闭合。

---

# 4. 最终 Error Contract

目前已经形成最小但清晰的错误语义：

```text
TOOL_NOT_FOUND
INVALID_ARGUMENTS
TOOL_EXECUTION_FAILED
TOOL_EXECUTION_SKIPPED
```

这里最重要的不是错误码数量，而是边界：

```text
模型调用错了
≠
Runtime 崩了
```

例如：

```text
参数写错
→ INVALID_ARGUMENTS
→ 告诉模型
→ 模型可以修正

Tool 业务执行异常
→ TOOL_EXECUTION_FAILED
→ 告诉模型
→ 模型决定下一步
```

而：

```text
Registry 自身 bug
Schema 配置 bug
Provider Error
Runtime internal bug
```

不会被 catch-all 吞掉。

这是 VII-C 很重要的一次工程升级。

---

# 5. Runtime State 的结论再次被验证

VII-C 没有把这些东西塞进 State：

```text
currentTurn
maxTurns
finishReason
errors
status
ToolRegistry
```

RuntimeState 仍然保持：

```text
messages
```

这再次验证了 VII-B 的一个核心认知：

> **会变化的数据，不等于都属于 State。**

真正进入 State 的，是后续步骤仍然需要知道的“已发生事实”。

例如：

```text
user_input
model_output
tool_result(success)
tool_result(error)
tool_result(skipped)
```

---

# 6. 本次最重要的 Debug / Fix

这一阶段最值得记录的不是普通代码 bug，而是一个架构边界问题。

最开始我们决定：

```text
最后一轮 Model Turn
→ 返回 tool_calls
→ 不执行 Tool
→ limit_reached
```

这个思路本身是为了避免：

> 明知没有下一轮模型可消费结果，还去执行可能有副作用的 Tool。

方向没错。

但第一次实现留下了：

```text
assistant(tool_calls)
```

却没有对应：

```text
tool_result
```

这导致后续新的 `run()` 可能拿着不完整历史发送给严格 Provider。

最终修正成：

```text
assistant(tool_calls)
→ tool_result(skipped)
→ limit_reached
```

这次修复带来一个很重要的 Runtime 认知：

> **Termination（终止）不只是“函数什么时候 return”，还要保证 return 后留下的状态仍然自洽。**

这是 VII-C 很值得保留的一条工业级经验。

---

# 7. Runtime Verification 最终结果

最终自动化测试：

```text
45 pass
0 fail
```

覆盖的范围已经不只是正常工具调用，而是包括：

```text
正常 Model → Tool → Model
Tool not found
多种 invalid arguments
同步 Tool throw
异步 rejection
非 Error throw
多个 Tool Call 顺序执行
混合成功 / 失败
maxTurns
limit_reached 后再次 run
最后一轮 stop
非法 maxTurns
Provider failure
State 引用隔离
Registry duplicate
Schema 引用隔离
非法 Schema
Registry bug
序列化 bug
tool_calls missing / empty
最后一轮 malformed tool_calls
```

另外：

```text
npm run build
```

通过。

Demo 也已经证明：

```text
User: 2 + 3?
→ Model 调 add
→ Tool 得到 5
→ 第二轮 Model 收到 tool_result
→ Final Answer
→ completed
```

所以 VII-C 的闭环已经有：

```text
单测证据
+
Demo 证据
+
源码 Review
```

---

# 8. Theory Feedback

这一 Part 有几个理论认识现在可以升级。

### 8.1 Tool Result 不等于“成功结果”

以前容易把 Observation（观察结果）理解成：

```text
天气 = 28°C
```

但现在代码已经证明：

```text
INVALID_ARGUMENTS
TOOL_NOT_FOUND
TOOL_EXECUTION_FAILED
```

同样也是 Observation。

因为模型下一步需要知道：

> 我刚才的 Action（动作）发生了什么。

---

### 8.2 Agent Loop 的核心不是 `while`

VII-B 没有真正循环，但已经有 Runtime ownership。

VII-C 才出现真实：

```text
Model
→ Tool
→ Model
```

所以 Loop 的本质应该理解为：

> **有明确的继续条件、状态推进和终止条件。**

不是“代码里有没有 while”。

---

### 8.3 Runtime 的作用越来越清楚

LLM 做的是：

```text
“我下一步想调用什么”
```

Runtime 做的是：

```text
这个 Tool 存不存在？
参数是否合法？
能不能执行？
执行结果怎么保存？
失败怎么表达？
还要不要继续模型？
什么时候必须停止？
```

所以 Agent Runtime 的核心价值可以进一步概括为：

> **把概率性的模型决策，放进确定性的工程执行框架中。**

---

# 9. Pi Mapping

这一阶段和之前 Pi 源码学习中的几个认知已经真正对应上：

```text
Pi / Agent Core
负责 Loop 和状态推进

Tool
只负责具体能力

Tool Result
作为独立消息回流

Runtime
决定继续还是结束
```

你的 Mini Runtime 虽然没有照抄 Pi，但已经自然长出了类似职责边界。

这个意义比“代码结构和 Pi 一样”更重要。

---

# 10. 🏗️ 工业级实现（Industrial Notes）

工业级系统以后还可能继续增加：

```text
Tool timeout
Retry policy
Tool permission
Approval
Parallel execution
Observability
Error redaction
Token / Cost budget
Loop detection
Durable Tool Execution
```

但 VII-C 没有提前实现这些，是正确的。

当前 Mini Runtime 已经建立了工业实现最重要的第一层：

> **Tool 调用必须经过统一 Registry、Validation、Execution、Error Contract，而不是让模型输出直接打到业务函数。**

---

# 11. 📚 下一节学习计划

下一节进入：

> **Part VII-D：ContextBuilder + TurnSnapshot**

VII-C 目前每次调用模型，仍然基本是：

```text
RuntimeState.messages
→ 全量转换
→ ModelRequest
```

VII-D 要开始解决：

> Runtime 保存的全部事实，不代表每一轮都应该原样喂给模型。

重点会讨论：

```text
RuntimeState
和
LLM Context
为什么不是同一个东西？

ContextBuilder 负责什么？

TurnSnapshot 为什么需要不可变？

为什么构建当前模型请求应该是一个独立边界？
```

这会正式进入 Context Management（上下文管理）。

---

# 12. 📝 写书 TODO

《从零实现 Agent Runtime》中，VII-C 可以沉淀成一章：

**《Tool Execution：从模型意图到确定性执行》**

建议包含：

```text
1. 为什么 ToolDefinition 不等于 Tool
2. ToolRegistry 为什么只是“带规则的 Map”
3. LLM arguments 为什么必须当 unknown
4. JSON 合法为什么不等于 Tool 参数合法
5. Schema Validation 应放在哪
6. ToolExecutor 为什么不是简单调用函数
7. Tool Failure 为什么应该作为 Observation
8. Model → Tool → Model 如何形成最小 ReAct Loop
9. maxTurns 为什么是 Runtime 责任
10. Termination 为什么必须保证历史闭合
```

---

# 13. 📦 写书素材

这一 Part 最适合写进书里的例子有三个。

第一个：

```text
get_weather(city=123)
→ INVALID_ARGUMENTS
→ 模型修正 city="Tokyo"
```

用于解释：

> LLM 错误不等于 Runtime Error。

第二个：

```text
Tool A success
Tool B invalid
Tool C success
```

用于解释：

> Multiple Tool Calls 第一版如何顺序执行，以及 Expected Failure 不该中断整批。

第三个就是这次真实 Debug：

```text
assistant(tool_calls)
→ limit_reached
```

为什么不完整，以及最后如何修正成：

```text
assistant(tool_calls)
→ tool_result(skipped)
→ limit_reached
```

这个例子非常适合讲 Runtime Termination 和 State Consistency（状态一致性）。

---

# 14. 🧠 本 Part 核心认知升级

如果只保留五句话：

> **第一，Tool Call 是模型提出的行动意图，不是已经执行的事实。**

> **第二，模型输出必须经过确定性校验后，才能进入真实业务执行。**

> **第三，Tool Failure 也是 Observation，可以让模型继续推理和修正。**

> **第四，Agent Loop 的所有权属于 Runtime，而不是 Tool、Provider 或 caller。**

> **第五，Runtime 的结束不仅要停止循环，还要保证留下的状态仍然完整可继续。**

---

# 15. 🧭 知识地图

当前 Part VII 已经形成：

```text
VII-A
ModelProvider
模型调用边界
    ↓
VII-B
RuntimeState + AgentRuntime
状态所有权 / 基础执行流程
    ↓
VII-C
Tool Registry + Executor + Error Contract
真正的 Model → Tool → Model
    ↓
VII-D
ContextBuilder + TurnSnapshot
Runtime State → LLM Context 边界
```

从能力演进来看：

```text
会调用模型
↓
会记住模型
↓
会执行模型要求的动作
↓
下一步：决定每一轮模型到底应该看到什么
```

这个路线现在非常连贯。

---

# 16. 🧑‍💻 面试视角

如果面试官问：

**“Agent Runtime 中 Tool Calling 应该怎么设计？”**

可以回答成：

> 模型只产生 Tool Call 意图，Runtime 不应该直接信任参数。一般会通过 Tool Registry 做能力查找，通过 Schema Validation 校验 arguments，再由 Tool Executor 执行并统一规范化结果。Tool 成功和可预期失败都会作为 Tool Result 回流模型，让 Agent 在同一个 Run 内继续 Model → Tool → Model。Provider Error 和 Runtime Bug 则不应该伪装成 Tool Failure。循环本身还需要 maxTurns 等终止保护。

如果继续追问：

**“为什么 Tool 参数错误不直接 throw？”**

可以回答：

> 因为 LLM 输出本身具有概率性，参数错误属于可预期的模型行为。把 INVALID_ARGUMENTS 作为 Tool Result 回流，可以让模型自己修正，而不是把一次可恢复错误升级成整个 Runtime 失败。

这已经是一套比较完整的 Agent Runtime 工程回答。

---

# 17. ❓ 本章思考题

保留几个真正值得想的问题：

1. 如果某个 Tool 是“付款”“删除数据”这种有副作用操作，`maxTurns` 最后一轮为什么更不能直接执行？

2. Tool Result 现在用 JSON string 写入消息。如果未来希望 UI 展示结构化错误，应该在 RuntimeMessage 层改，还是 Event 层解决？

3. 如果一个 Tool Schema 和 `Tool<TArgs>` 的 TypeScript 类型写得不一致，应该由编译期解决，还是开发规范解决？

4. 如果一个 Model Turn 返回 10 个 Tool Call，第一版顺序执行合理；什么时候才值得引入并行？

5. ToolExecutor 应该负责 timeout / retry 吗，还是未来需要更高一层 Execution Policy（执行策略）？

这些都先不要现在实现。

---

# 18. 🔄 前置问题回收（Pending Questions）

本 Part 正式回收 VII-B 的：

### B-P1：unresolved tool call 后再次 run

已解决。

现在 Tool Call 会在同一个 run 内执行并产生 Tool Result；达到 maxTurns 时也会写入 skipped result，避免留下悬空调用。

### B-P3：`arguments: unknown` 与 Tool 参数契约

已解决第一层。

当前通过：

```text
unknown
→ JSON Schema Validation
→ execute
```

建立了运行时可信边界。

但：

```text
JSON Schema
↔
TypeScript TArgs
```

的静态一致性仍然是未来可选优化，不属于 VII-C 必须能力。

### B-P2：Provider 失败后的重复 user input / retry 语义

**继续 Pending。**

它涉及：

```text
retry current step
和
start a new run
```

的区别，更适合等 VII-G Conversation Recovery 或未来真正引入 Retry 需求时再回收。

---

# Part VII-C Final Status

```text
Part VII-A  [Done]  项目骨架 + 类型体系 + ModelProvider

Part VII-B  [Done]  RuntimeState + Agent Loop 基础

Part VII-C  [Done]  Tool Registry + Tool Executor + Error Contract

Part VII-D  [Next]  ContextBuilder + TurnSnapshot
```

VII-C 可以正式关闭。

下一次会话如果继续，我们就从 **VII-D 的 Architecture Analysis（架构分析）** 开始，不直接写代码。

