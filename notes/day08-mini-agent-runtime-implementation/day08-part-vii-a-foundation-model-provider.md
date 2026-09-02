# Day08 / Part VII-A：项目骨架、类型体系与 ModelProvider

> Engineering Learning Log + Architecture Record  
> Milestone 状态：Done  
> 完成日期：2026-09-02

本记录基于三个事实来源整理：

1. 当前仓库实际提交的 TypeScript 源码、测试和工程配置；
2. [Part VII-A 架构讨论与正式 Implementation Task 源记录](source/day08-part-vii-a-architecture-chatgpt-source.md)；
3. [Runtime Review Plan 与 Provider Adapter Error Boundary Review 源记录](source/day08-part-vii-a-review-chatgpt-source.md)；
4. [Codex 实现、测试与 Debug 源记录](source/day08-part-vii-a-codex-implementation-source.md)。

文中凡是描述“当前实现”的内容，均以仓库最终代码为准。讨论过但没有进入代码的方案，会明确标记为“未采用”或“延期”。

---

## 1. Milestone Goal

Part VII-A 的目标不是实现一个完整 Agent，而是建立后续 Runtime 能够依赖的最小模型协议：

```text
手工构造 ModelRequest
        ↓
ModelProvider.generate()
        ↓
OpenAIModelProvider
        ↓
OpenAI Chat Completions 协议
        ↓
Provider 内部映射
        ↓
Runtime ModelResponse
        ↓
Demo 打印
```

这个 Milestone 需要用真实代码证明四件事：

1. Runtime 拥有自己的消息、请求、响应、Tool Call、Finish Reason 和 Usage 类型；
2. Runtime Core 不直接依赖 OpenAI SDK 类型；
3. Provider Adapter 能完成双向协议转换，而不是把 OpenAI 原始对象泄漏给调用侧；
4. 在尚未出现 Agent Loop、RuntimeState 和 Tool Executor 时，最小 Model Provider 调用链已经可以真实运行。

这里的重点是建立边界，而不是增加功能数量。VII-A 要交付的是后续 Runtime 的“模型语言”和“供应商边界”。

---

## 2. Starting Point

开始实现前，仓库主要保存 Day01～Day07 的 Agent Runtime 学习笔记和 Pi Agent 源码分析，还没有 Node.js + TypeScript Runtime 工程。

当时仓库不存在：

```text
package.json
tsconfig.json
src/
test/
ModelProvider
ModelRequest / ModelResponse
RuntimeMessage / ModelMessage
```

同样也不存在以下后续能力：

```text
RuntimeState
Agent Loop
Tool Registry
Tool Executor
ContextBuilder
AgentEvent
Subscriber
SessionStore
Approval
Streaming Runtime
```

这意味着 Codex 不是在已有框架上补一个 Provider，而是要从空工程开始建立第一条真实边界。但项目上下文同时明确要求：不能因为仓库为空，就预先搭完整 Agent Framework。

第一个 Part 还承担了一个流程职责：建立后续 Milestone 可复用的标准工作方式。

```text
Architecture Analysis
        ↓
Confirmed Design Decisions
        ↓
Codex Implementation Task
        ↓
Implementation
        ↓
Runtime Verification / Debug
        ↓
Code Review + Theory Feedback
        ↓
Milestone Closure
```

架构讨论决定“必须保持什么边界”，Codex 在这些边界内决定文件名、拆分粒度、测试形式等工程细节。

---

## 3. Architecture Questions

### 3.1 Runtime 是否可以直接使用 OpenAI SDK 类型？

如果 `ModelRequest`、`ModelResponse` 或 Runtime 消息直接引用 OpenAI 类型，第一版虽然少写一些映射代码，但 Runtime 会把供应商协议当成自己的核心语言。后续 Agent Loop、ContextBuilder 和 SessionStore 都会被 OpenAI 的字段结构反向塑形。

核心问题不是“能不能调用 OpenAI”，而是：

> OpenAI SDK 的类型究竟属于 Runtime Core，还是只属于 Provider Adapter？

### 3.2 为什么要同时存在 RuntimeMessage 与 ModelMessage？

当前还没有 ContextBuilder，看起来可以只保留一套消息类型。但长期语义不同：

```text
RuntimeMessage = Runtime 内部拥有的消息事实
ModelMessage   = 某一轮准备提供给模型的消息视图
```

如果现在合并，两者未来出现差异时就需要拆解一条已经扩散到 Runtime 的数据结构。

### 3.3 AssistantMessage 的文本和 Tool Call 是否互斥？

不能把 Assistant 消息设计成“要么文本、要么工具调用”。真实模型响应可能同时包含 `content` 与 `toolCalls`。因此两个字段都必须能够独立出现。

### 3.4 ToolCall arguments 应该是什么语义？

OpenAI 在协议层返回 JSON 字符串，但 Runtime `ToolCall` 选择：

```ts
arguments: unknown
```

这里需要区分两个问题：

- JSON 是否能被解析，是 Provider 协议映射问题；
- 解析后的对象是否符合 Tool Schema，是未来 Tool Executor 的校验问题。

这一区分后来直接触发了 Code Review 中唯一的阻塞修复。

### 3.5 Model 配置应该放在 Request 还是 Provider？

VII-A 不需要一次请求选择一个模型，也不需要 Provider Routing。模型名、API Key 和可选 Base URL 因此属于 Provider 实例配置，而不是 `ModelRequest`。

### 3.6 Finish Reason 是模型一轮结束，还是 Agent 整体结束？

`stop`、`tool_calls`、`length` 只描述一次模型调用为何停止。它们不能在 Provider 内直接触发 Agent 终止或 Tool 执行，因为 Agent 生命周期尚未建立，而且两类终止不是一回事。

### 3.7 第一版需要多少 Provider 能力？

讨论过的候选包括 Streaming、模型列表、能力探测、Token 统计和健康检查。最终问题被收敛为：VII-A 只需要一次完整的非流式生成。

### 3.8 工程层面的 TypeScript、环境变量和测试应如何处理？

这些没有被提前固定为架构决策，而是在实现和 Debug 中逐步确定：

- Node 原生 ESM 下相对导入写 `.js` 还是 `.ts`；
- `.env` 是否自动加载；
- OpenAI mapping 是类私有方法还是独立纯函数；
- 真实 API 调用是否进入自动化测试。

---

## 4. Design Decisions

### 4.1 最终采用：Provider-neutral Runtime Model

Runtime 自己定义并使用：

```text
RuntimeMessage
ModelMessage
ModelRequest
ModelResponse
ToolDefinition
ToolCall
FinishReason
ModelUsage
ModelProvider
```

OpenAI SDK 类型只存在于：

```text
src/model/openai/openai-model-provider.ts
src/model/openai/mappings.ts
test/openai-mappings.test.ts（Adapter 测试输入）
```

测试引用 OpenAI 类型是为了构造 Adapter 边界输入，不属于 Runtime Core 泄漏。

### 4.2 最终采用：RuntimeMessage / ModelMessage 双层消息

`RuntimeMessage` 使用内部事实类型：

```text
user_input
model_output
tool_result
```

`ModelMessage` 使用模型视图角色：

```text
user
assistant
tool
```

当前由 `toModelMessage()` 完成最薄投影。复杂筛选、压缩、Memory 注入和 Token Budget 没有塞入这个函数。

### 4.3 最终采用：最小 Model Contract

```ts
interface ModelRequest {
  messages: ModelMessage[];
  tools?: ToolDefinition[];
}

interface ModelResponse {
  message: AssistantMessage;
  finishReason: FinishReason;
  usage?: ModelUsage;
}
```

`ModelResponse` 没有把 `content`、`toolCalls` 重复平铺到顶层，也没有 `raw`、`metadata` 或 Provider-specific escape hatch。

### 4.4 最终采用：ModelProvider 第一版只有 generate()

```ts
interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

没有抽象基类、Provider Registry、Factory 或 Capability Matrix。

### 4.5 最终采用：Provider 保存配置，不保存 Agent State

`OpenAIModelProvider` 只持有：

```text
OpenAI client
model
```

它不持有 messages、conversation、current step、tool results 或 iteration。Provider 配置状态与未来 Agent 执行状态没有混在一起。

### 4.6 最终采用：mapping 拆成独立纯函数

请求和响应映射集中在 `src/model/openai/mappings.ts`。这样能够直接测试协议边界，而不需要 Mock OpenAI Client，也不需要构造 Adapter 继承体系。

### 4.7 最终采用：Tool arguments JSON 解析失败显式抛出

最终代码是：

```ts
function parseArguments(value: string): unknown {
  return JSON.parse(value) as unknown;
}
```

Provider Adapter 负责保证输出的 `arguments` 是已完成 JSON 解析的值；JSON 语法错误自然向上传播。它不负责 Tool Schema Validation。

### 4.8 最终采用：源码写 `.ts`，构建时重写为 `.js`

当前源码导入使用真实开发文件名：

```ts
import type { ModelRequest } from "../model/model.ts";
```

`tsconfig.json` 启用：

```json
{
  "allowImportingTsExtensions": true,
  "rewriteRelativeImportExtensions": true
}
```

构建后的 `dist` 自动变成 Node ESM 可执行的 `.js` 相对导入。

### 4.9 最终采用：dotenv 只存在于 Demo 入口

`src/demo/openai-demo.ts` 使用：

```ts
import "dotenv/config";
```

`OpenAIModelProvider` 不读取 `.env` 或 `process.env`，仍然只接收显式配置。这保持了配置装配与 Provider 协议职责的分离。

### 4.10 讨论过但没有采用

以下方案在讨论中出现过，但没有进入最终代码：

- 直接把 OpenAI message/response 当成 Runtime 类型；
- 合并 RuntimeMessage 与 ModelMessage；
- 在 `ModelRequest` 中加入 model、temperature、stream、reasoning 等字段；
- `AssistantMessage` 强制文本和 Tool Call 互斥；
- malformed arguments 返回原始字符串、`{}` 或默认值；
- 为解析错误新增 ProviderError、Error Code 或复杂错误层级；
- 在 Provider 中捕获 401/429/500 并重试、fallback 或返回假响应；
- 新增 MockModelProvider、智谱 Provider、通用 OpenAI-compatible Provider；
- 提前设计 Provider Registry、Factory 或动态路由；
- 把真实 API 调用放进自动化测试；
- 在 VII-A 设计 Streaming API。

---

## 5. Why These Decisions

### 5.1 Provider Adapter 是 Anti-Corruption Layer

Adapter 的价值不是少写一次 SDK 调用，而是把外部协议的变化限制在边界内：

```text
OpenAI 字段、枚举、JSON 字符串约定
                 ↓
          Provider Adapter
                 ↓
Runtime 真正理解的 message / toolCalls / finishReason / usage
```

Provider-neutral 不等于抽象所有供应商差异，而是只统一 Runtime 当前真正需要理解的语义。

### 5.2 双层消息是在保护 State 与 Context 的未来边界

VII-A 的转换很薄，不代表两层没有价值。它提前确认了一个所有权事实：Runtime 保存什么，与某一轮发送给模型什么，不必永远相同。VII-D 的 ContextBuilder 将在这个边界上继续演进，而不是重新拆分已经混合的数据。

### 5.3 最小 Contract 避免被第一个 Provider 绑架

如果第一版把 OpenAI 的所有 finish reason、usage detail 和 response metadata 都搬进 Runtime，所谓“统一类型”只会变成 OpenAI 类型的重命名版本。当前只保留明确需要的最小语义，未知 finish reason 统一为 `unknown`。

### 5.4 Fail Fast 保留错误事实

malformed JSON 不是合法 Tool 参数的另一种表示。返回原始字符串会让下游误以为 Provider 已成功完成映射，并把协议错误伪装成 Tool Validation 问题。

显式抛出保留了事实：

```text
Provider 返回非法 JSON
        ↓
Adapter 无法建立 Runtime ToolCall
        ↓
调用失败向上传播
```

未来 Runtime 可以决定如何归一化或恢复，但 VII-A 不应该替未来层吞掉信息。

### 5.5 Provider 不决定 Agent 生命周期

Provider 只返回一次模型调用结果。它不知道 Agent 是否应该继续、执行 Tool、接受用户输入或结束。将 `finishReason` 映射为 Runtime 枚举，和据此做 Agent 决策，是两个不同职责。

### 5.6 dotenv 放在 Composition Root，而不是 Provider

Demo 是当前唯一的装配入口，所以它负责把外部配置读入并构造 Provider。这样未来无论配置来自 shell、Credential Store、测试还是其他宿主，都不需要修改 Provider。

---

## 6. Implementation Scope

本 Milestone 实际实现了：

```text
Node.js + TypeScript 工程配置
RuntimeMessage / ModelMessage 类型
RuntimeMessage → ModelMessage 的薄转换
ToolCall / ToolDefinition
ModelRequest / ModelResponse
FinishReason / ModelUsage
ModelProvider.generate()
OpenAIModelProvider
OpenAI 请求与响应 mapping
dotenv Demo 配置入口
Provider mapping 单元测试
真实 Provider Demo
```

实现目录严格限制为当前职责：

```text
src/
├── demo/
├── messages/
└── model/
    └── openai/
```

没有为空的未来职责创建 `runtime/`、`events/`、`session/`、`approval/` 等目录。

---

## 7. Code Changes

### 7.1 工程配置

- `package.json`
  - Node.js 20+；
  - `build`、`test`、`demo` scripts；
  - 运行依赖 `openai`、`dotenv`；
  - 开发依赖 TypeScript、tsx、Node types。
- `package-lock.json`
  - 锁定实际依赖版本。
- `tsconfig.json`
  - strict TypeScript；
  - NodeNext ESM；
  - `.ts` 相对导入构建重写；
  - `src` 编译到 `dist`。
- `.gitignore`
  - 忽略 `node_modules/`、`dist/`、`.env`。
- `.env.example`
  - 提供不含真实凭证的 Demo 配置模板。

### 7.2 消息模型

- `src/messages/runtime-message.ts`
  - 定义 Runtime 内部的 user input、model output、tool result 事实。
- `src/messages/model-message.ts`
  - 定义发送给模型的 user、assistant、tool 视图。
- `src/messages/to-model-message.ts`
  - 实现当前阶段最薄的穷举转换。

### 7.3 Runtime Model Contract

- `src/model/tool.ts`
  - `ToolCall { id, name, arguments }`；
  - `ToolDefinition { name, description, parameters }`。
- `src/model/model.ts`
  - `ModelRequest`、`ModelResponse`、`FinishReason`、`ModelUsage`。
- `src/model/model-provider.ts`
  - 只声明 `generate()`。

### 7.4 OpenAI Adapter

- `src/model/openai/openai-model-provider.ts`
  - 构造 OpenAI Client；
  - 保存 model；
  - 调用 `chat.completions.create()`；
  - 将 mapping 结果作为 `ModelResponse` 返回。
- `src/model/openai/mappings.ts`
  - ModelMessage → OpenAI message；
  - ToolDefinition → OpenAI function tool；
  - OpenAI tool call → ToolCall；
  - OpenAI assistant message → AssistantMessage；
  - finish reason → Runtime FinishReason；
  - usage → Runtime ModelUsage；
  - completion → ModelResponse。

### 7.5 Demo 与测试

- `src/demo/openai-demo.ts`
  - 加载 `.env`；
  - 缺失 API Key 时显式失败；
  - 手工创建 RuntimeMessage 与 ModelRequest；
  - 构造 Provider 并打印 Runtime ModelResponse。
- `test/openai-mappings.test.ts`
  - 最终共 8 个测试，覆盖请求、响应和关键错误边界。

---

## 8. Runtime Verification

### 8.1 依赖与构建

最终安装版本：

```text
@types/node  22.20.1
dotenv       17.4.2
openai       5.23.2
tsx          4.23.13
typescript   5.9.3
```

最终重新执行：

```bash
npm run build
```

结果：通过，exit code 0。

构建产物位于 `dist/`，源码中的 `.ts` 相对导入被正确重写为 `.js`；Node ESM 可以直接解析编译后的 Provider 模块。

### 8.2 自动化测试

最终重新执行：

```bash
npm test
```

结果：

```text
tests   8
pass    8
fail    0
```

覆盖范围：

1. Provider-neutral ModelMessage → OpenAI message；
2. ToolDefinition → OpenAI function tool；
3. OpenAI assistant text → AssistantMessage；
4. 合法 OpenAI tool arguments → 解析后的 ToolCall；
5. 非法 JSON tool arguments → 显式 `SyntaxError`；
6. finish reason normalization；
7. usage mapping；
8. 完整 completion → ModelResponse，且不泄漏 raw response。

### 8.3 Demo 启动与错误路径

没有 `OPENAI_API_KEY` 时，Demo 实际启动并明确失败：

```text
Error: OPENAI_API_KEY is required to run the OpenAI demo.
```

这验证了“不自动 fallback 到 Mock”的设计。

### 8.4 OpenAI 官方端点验证

使用 OpenAI 官方 Key 发起过真实请求，请求到达 API，但返回：

```text
HTTP 429
code: credit_balance_exhausted
```

该结果说明网络、SDK 和请求调用已经发生，但因为账户没有 API credits，没有得到成功的模型响应。它不是 Runtime mapping 错误，也不能记录为“OpenAI 官方成功调用”。

### 8.5 智谱 OpenAI-compatible 真实调用

利用 Provider 已有的可选 `baseURL`，当前 `.env` 配置连接智谱的 OpenAI-compatible endpoint，真实 Demo 成功返回过：

```json
{
  "message": {
    "role": "assistant",
    "content": "Hello there!"
  },
  "finishReason": "stop",
  "usage": {
    "inputTokens": 12,
    "outputTokens": 259,
    "totalTokens": 271
  }
}
```

完成 malformed arguments 修复后，再次执行 `npm run demo`，结果仍成功，exit code 0：

```json
{
  "message": {
    "role": "assistant",
    "content": "Hello!"
  },
  "finishReason": "stop",
  "usage": {
    "inputTokens": 12,
    "outputTokens": 151,
    "totalTokens": 163
  }
}
```

因此需要准确区分两个结论：

- OpenAI 官方 API：真实请求到达，但因额度不足未完成成功响应；
- 智谱 OpenAI-compatible API：真实端到端调用成功。

成功调用验证了当前 Chat Completions 协议 Adapter 的完整链路，但代码并没有新增 `ZhipuModelProvider`，也不代表 Runtime 已正式支持多 Provider。

---

## 9. Bugs / Debugging

### 9.1 npm 全局缓存权限异常

首次 `npm install` 失败：本机 `~/.npm` 缓存中存在 root-owned 文件，出现 `EPERM`。

没有修改全局目录权限，而是使用隔离缓存：

```bash
npm install --cache /tmp/mini-agent-runtime-npm-cache
```

这使项目依赖安装成功，同时避免扩大对用户环境的修改。

### 9.2 OpenAI SDK Tool Call 联合类型变化

首次 TypeScript build 发现 `ChatCompletionMessageToolCall` 不只包含 function 分支，还可能包含 custom tool call，因此直接访问 `toolCall.function` 无法通过类型检查。

最终采用最小显式边界：

```ts
if (toolCall.type !== "function") {
  throw new Error(`Unsupported OpenAI tool call type: ${toolCall.type}`);
}
```

当前 Runtime 只发送 function tools，不把 SDK 的 custom tool 语义提前扩展进 Runtime。

### 9.3 TypeScript 源码中的 `.js` / `.ts` 导入争议

初版在 `.ts` 文件中使用 NodeNext 常见的 `.js` 运行时 specifier。它能够正确编译和运行，但开发阶段看到的路径与真实源码扩展名不一致。

对照当前 Pi 源码后，工程策略发生调整：源码统一写 `.ts`，TypeScript 构建时使用 `rewriteRelativeImportExtensions` 自动输出 `.js`。

这不是 Runtime 架构变化，而是开发体验和构建策略修正。

### 9.4 创建 `.env` 后 Demo 仍读不到变量

仅创建 `.env` 不会自动影响 `process.env`。初版 Demo 只读取进程环境变量，没有加载文件，因此实际报错 Key 缺失。

最终在 Demo composition root 加入：

```ts
import "dotenv/config";
```

并新增 `.env.example`。Provider 本身仍不感知 dotenv。

### 9.5 API Key 暴露风险

Debug 过程中曾把完整 API Key 放进终端命令并粘贴到对话。该 Key 必须撤销并轮换；后续使用 `.env` 或先 `export` 环境变量，避免密钥出现在代码、Git、聊天内容和可复制日志中。

这一事件反向验证了配置边界不仅是便利性问题，也是安全边界问题。

### 9.6 OpenAI 429 被误认为代码错误的可能

OpenAI SDK 抛出 `RateLimitError`，但响应的真正错误码是 `credit_balance_exhausted`。这不是请求节流问题，也不是 Adapter mapping bug，而是账户额度问题。

VII-A 没有为了改善错误展示而新增 Provider Error Normalization 或 Retry。SDK 错误继续自然向上传播。

### 9.7 Tool arguments 被静默降级

第一轮实现：

```ts
function parseArguments(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
```

这会把 malformed JSON 变成字符串形式的 `ToolCall.arguments`，隐藏 Adapter 已知的协议错误。

Code Review 将 Milestone 判定为 Almost Done，并只下发一个最小 Fix Task。最终移除 `catch`，新增非法 JSON 测试，原有 7 个测试继续通过，测试总数变为 8。

---

## 10. Code Review Findings

### 10.1 Review 初始结论

```text
Architecture      PASS
Scope             PASS
State Ownership   PASS
Dependency        PASS
Public Contract   PASS
Termination       PASS
Happy Path        PASS
Error Boundary    FAIL（1 issue）

Milestone         Almost Done
```

唯一阻塞问题是 malformed tool arguments 被静默吞掉。Review 明确拒绝借此扩展 ProviderError、Error Code、Retry 或 Agent Loop error handling。

### 10.2 修复后结论

```text
Error Boundary    PASS
Milestone         DONE
```

### 10.3 已确认正确的实现

- Provider 不拥有 Agent execution state；
- Runtime Core 没有 OpenAI SDK 类型泄漏；
- ModelRequest / ModelResponse 保持最小；
- `content: null + tool_calls` 能正确映射为只含 `toolCalls` 的 AssistantMessage；
- `finishReason` 只描述 Model Turn，不执行 Runtime termination；
- `content_filter` 等当前不需要的供应商状态映射为 `unknown`；
- OpenAI API 错误直接向上抛，当前阶段不伪造响应；
- 没有提前实现 Agent Loop、RuntimeState、Tool Executor、Streaming、Memory、Approval 或 Provider fallback；
- 独立纯 mapping 函数使稳定边界可以被直接测试。

### 10.4 当前接受但不在本 Part 扩展

- `usage === undefined` 可以增加测试，但不阻塞 Milestone；
- 更细的 FinishReason 需要由未来 Runtime 需求驱动；
- Provider API Error normalization 和 Retry 留给后续生命周期/错误设计；
- `npm run build` 当前只包含 `src/**/*.ts`，测试通过 `tsx --test` 执行。若未来测试类型规模扩大，可单独建立测试 typecheck 配置，但 VII-A 不为此增加工程层级。

---

## 11. Theory Feedback

### 11.1 Provider Adapter 不是 SDK Wrapper

如果只是 Wrapper，最简单的做法是把 OpenAI response 原样返回。当前实现必须做选择：哪些字段成为 Runtime 语义，哪些字段停留在外部协议。因此它更接近 Anti-Corruption Layer。

### 11.2 Provider-neutral 不等于 Provider-complete

Runtime 没有义务表达供应商全部能力。统一模型只应包含 Agent Runtime 真实消费的交集和语义，而不是追求一个能装下所有厂商字段的万能对象。

### 11.3 State Ownership 可以通过“类里没有什么”来验证

`OpenAIModelProvider` 没有 messages、toolResults、iteration 等字段，这不仅是代码简洁，也是状态所有权正确的证据。Provider 保存配置，未来 Runtime 保存执行事实。

### 11.4 Model Turn Termination 不等于 Agent Termination

`stop` 可能意味着回答结束，`tool_calls` 可能意味着 Runtime 下一步应执行工具，`length` 可能需要恢复策略。但 Provider 只报告模型这一轮的结果。谁决定下一步，要等 VII-B Agent Loop 出现后再实现。

### 11.5 错误也是边界输出的一部分

边界不仅转换成功数据，也必须保持失败事实。吞掉 malformed JSON 会破坏上层判断能力。Fail Fast 并不是错误体系不完整，而是当前没有错误归一化层时最诚实的行为。

### 11.6 实现反馈可以修正早期工程选择，而不推翻架构

`.js` → `.ts` import、增加 dotenv、处理 SDK custom tool union，都是实现反馈。这些变化没有改变 Provider-neutral、消息双层或 Scope 边界。Milestone 演进并不意味着每次变化都要重新设计 Runtime。

---

## 12. Pi Mapping

本次只发生了以下四类真实 Pi 对照。

### 12.1 Agent Core 与模型 Provider 分层

Pi 的 Agent Core 不应直接依赖某个供应商 response shape；模型协议转换位于更靠近 LLM API 的边界。Mini Runtime 当前用 `ModelProvider` 和 `src/model/openai/` 建立了同方向、但远小于 Pi 的边界。

### 12.2 Runtime Message 与 LLM Message 投影

Pi Agent Loop 中也存在 AgentMessage 到模型 Message 的调用边界转换。Mini Runtime 当前只实现 `toModelMessage()`，没有复制 Pi 的完整 transform、compaction 或事件系统。

### 12.3 TypeScript 相对导入策略

当前 Pi 源码使用 `.ts` 相对导入，并由 TypeScript 在构建期重写扩展名。Mini Runtime 在 Debug 后采用同类策略：开发源码与真实文件名一致，dist 仍输出 `.js`。

### 12.4 Credential 装配边界

Pi 主要通过进程环境变量和独立 `auth.json` 解析凭证，而不是让每个 Provider 自行加载项目 `.env`。Mini Runtime 当前没有实现 Credential Store，只在 Demo 入口用 dotenv 完成本地装配；Provider 仍只接收配置。

本次没有复制 Pi 的 Provider Registry、OAuth、Session、Streaming、Event 或 Harness。Pi 是边界验证样本，不是 VII-A 的功能清单。

---

## 13. Architecture Decisions Added

以下是实现和 Review 过程中，在原始 Confirmed Design Decisions 之外新增或进一步固化的工程决策。

### ADR-VII-A-01：OpenAI mapping 使用独立纯函数

- 状态：Accepted
- 原因：自然形成可测试边界，不引入类层级。

### ADR-VII-A-02：非 function OpenAI Tool Call 显式拒绝

- 状态：Accepted
- 原因：当前 Runtime 只声明 function tools，不提前吸收 SDK 的 custom tool 语义。

### ADR-VII-A-03：malformed Tool arguments 显式失败

- 状态：Accepted after Review
- 原因：JSON 解析失败属于 Provider mapping 失败，不能伪装成合法 Runtime ToolCall。

### ADR-VII-A-04：TypeScript 源码导入使用 `.ts`

- 状态：Accepted after Debug
- 原因：开发路径与源码一致；构建期自动重写 `.js`。

### ADR-VII-A-05：dotenv 只在 Demo 入口加载

- 状态：Accepted after Debug
- 原因：保留本地开发便利，同时不让 Provider 依赖配置文件机制。

### ADR-VII-A-06：可选 baseURL 是 Provider 配置，不代表多 Provider 路由

- 状态：Accepted
- 原因：它允许配置 OpenAI API 地址或兼容端点，但当前代码仍只有一个 Adapter 类和一种 Chat Completions mapping。

### ADR-VII-A-07：真实 API 调用保持手动验证

- 状态：Accepted
- 原因：避免自动化测试依赖密钥、网络、余额和非确定模型输出。

---

## 14. Deferred Work

### Part VII-B：RuntimeState + Agent Loop

- RuntimeState；
- 最小 Model → Runtime → 下一轮循环；
- 模型响应如何写回 Runtime State；
- MockModelProvider，用于确定性 Agent Loop 测试；
- Runtime 如何解释一次 ModelResponse 并决定下一步。

### Part VII-C：Tool Registry + Tool Executor + Error Contract

- Tool 注册、查找和执行；
- `ToolCall.arguments` 的 Schema Validation；
- Tool Result 回流；
- Tool Error 分类。

注意：VII-A 只保证 arguments 是可解析 JSON，不保证符合任何 Tool Schema。

### Part VII-D：ContextBuilder + TurnSnapshot

- 正式承担 RuntimeMessage → ModelMessage 投影；
- Context 选择、Token Budget、压缩边界；
- TurnSnapshot。

### Part VII-E：AgentEvent + Subscriber

- Runtime Event Model；
- Streaming；
- 对外 Subscriber。

### Part VII-F：Abort + Single Active Run

- Abort、Cancellation；
- 单活跃 Run 并发边界。

### Part VII-G：SessionStore + Conversation Recovery

- Conversation 保存、恢复和继续运行。

### Part VII-H：beforeToolCall + 简单 Approval

- Tool 执行前 Hook；
- 最小 Human Approval；
- 不实现 Durable Approval。

### Part VII-I：Weather Agent 完整链路

- User → Agent Loop → Tool → Observation → Final Answer 集成验证。

### 第一阶段继续明确延期

```text
Session Tree
Durable Tool Execution
Durable Approval
Hot Extension Reload
复杂 Compaction
Multi-Agent
Sub-Agent
复杂 Memory System
复杂 Provider Routing
复杂 Workflow Engine
```

### 未安排到当前 Milestone 的 Provider 工作

- 正式 ZhipuModelProvider；
- Anthropic / Gemini Provider；
- OpenAI-compatible 通用 Provider 抽象；
- Provider Factory / Registry；
- Provider fallback；
- Error normalization、Retry、Rate Limit policy；
- OAuth 或 Pi 风格 auth.json Credential Store。

---

## 15. Final Architecture Snapshot

### 15.1 当前真实调用关系

```text
.env / process.env
        │
        │ dotenv 仅在 Demo 入口加载
        ▼
openai-demo.ts
        │
        ├── RuntimeMessage[]
        │        │
        │        ▼
        │   toModelMessage()
        │        │
        │        ▼
        │   ModelMessage[]
        │        │
        └────► ModelRequest
                 │
                 ▼
          ModelProvider contract
                 │
                 ▼
        OpenAIModelProvider.generate()
                 │
                 ├── toOpenAIMessage()
                 ├── toOpenAITools()
                 │
                 ▼
       OpenAI SDK chat.completions.create()
                 │
                 ▼
       OpenAI Chat Completions response
                 │
                 ├── fromOpenAIMessage()
                 ├── fromOpenAIToolCall()
                 ├── fromOpenAIFinishReason()
                 └── fromOpenAIUsage()
                 │
                 ▼
            ModelResponse
                 │
                 ▼
          Demo JSON.stringify()
```

### 15.2 当前类型关系

```text
RuntimeMessage
    ├── RuntimeUserMessage
    ├── RuntimeAssistantMessage
    └── RuntimeToolMessage
              │
              ▼
         toModelMessage
              │
              ▼
ModelMessage
    ├── UserMessage
    ├── AssistantMessage ─────► ToolCall[]?
    └── ToolMessage
              │
              ▼
ModelRequest ────────────────► ToolDefinition[]?
              │
              ▼
ModelProvider.generate()
              │
              ▼
ModelResponse
    ├── message: AssistantMessage
    ├── finishReason: FinishReason
    └── usage?: ModelUsage
```

### 15.3 OpenAI 类型边界结束位置

```text
Runtime Core / Demo calling side
        │ 只认识 ModelRequest / ModelResponse
        ▼
src/model/openai/
        │ OpenAI SDK 类型与协议转换仅存在于这里
        ▼
OpenAI SDK / compatible endpoint
```

当前没有 Agent Runtime Loop。Demo 只是手工装配并发起一次模型调用，不能把它误认为 Agent。

---

## 16. Core Knowledge Upgrade

Part VII-A 使此前的理论认知发生了以下工程化升级。

### 16.1 从“Provider 要抽象”升级为“Provider 边界要选择语义”

真正困难的不是写 `generate()`，而是决定 Runtime 接受哪些语义、拒绝哪些供应商细节，以及失败时保留什么事实。

### 16.2 从“消息有不同角色”升级为“消息有不同所有权层”

`RuntimeMessage` 与 `ModelMessage` 的区别不是 role 数量，而是谁拥有事实、谁拥有某一轮模型视图。

### 16.3 从“Tool arguments 是 unknown”升级为“两阶段合法性”

```text
阶段一：Provider JSON syntax mapping
阶段二：Tool Executor schema validation
```

`unknown` 不是允许 Adapter 隐藏 JSON 解析错误，而是表示解析后的业务形状仍需后续校验。

### 16.4 从“Finish Reason 表示结束”升级为“结束有层级”

Model Turn 结束原因是 Provider 输出；Agent 是否结束是未来 Runtime 决策。类型相似不代表职责相同。

### 16.5 从“错误以后再设计”升级为“现在也不能吞错误”

延期 Error Contract 不等于允许返回假成功。没有归一化错误体系时，自然抛出比静默降级更正确。

### 16.6 从“照着 Pi 做”升级为“用 Pi 验证边界”

本项目只借 Pi 检查分层、消息投影、构建和凭证装配方向，没有复制其工业级能力。架构映射不等于功能复刻。

### 16.7 从“Milestone 是功能切片”升级为“Milestone 也是知识验证单元”

VII-A 经历了设计、实现、真实调用、失败分类、Code Review 和最小修复。Done 的依据不是文件已经写完，而是边界假设被代码和错误路径共同验证。

---

## 17. Next Milestone

下一阶段是：

```text
Part VII-B：RuntimeState + Agent Loop
```

VII-B 应在当前成果上增加最小运行状态和循环：

```text
RuntimeState
      │
      ▼
构造 ModelRequest
      │
      ▼
ModelProvider.generate()
      │
      ▼
ModelResponse
      │
      ▼
写回 RuntimeState
      │
      ▼
决定是否进入下一轮
```

VII-B 需要重点回答：

1. RuntimeState 第一版真正需要保存哪些事实；
2. 一次 ModelResponse 如何原子地进入状态；
3. 最小 Agent Loop 的继续与停止条件是什么；
4. 如何引入 MockModelProvider，使循环测试不依赖真实网络和模型随机性；
5. RuntimeMessage 与 ModelMessage 的当前薄转换在 Loop 中处于什么位置。

VII-B 仍然不要提前实现：

```text
Tool Registry / Tool Executor（VII-C）
正式 ContextBuilder / TurnSnapshot（VII-D）
Streaming / AgentEvent（VII-E）
Abort / Single Active Run（VII-F）
SessionStore（VII-G）
Approval（VII-H）
```

Part VII-A 提供给下一阶段的稳定输入是：

```text
Provider-neutral message language
ModelRequest / ModelResponse contract
ModelProvider.generate() boundary
OpenAI Chat Completions adapter
可确定测试的 mapping functions
已验证的错误传播语义
```

下一阶段不需要重做 Provider Boundary，而应该第一次让 Runtime 真正拥有状态并驱动模型进入下一轮。
