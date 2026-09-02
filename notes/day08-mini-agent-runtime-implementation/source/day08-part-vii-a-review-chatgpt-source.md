# Day08 / Part VII-A Code Review ChatGPT 源记录

- 会话链接：https://chatgpt.com/c/6a977aef-d364-83ee-b486-ea1dd35d6373
- 会话标题：Runtime Review Plan
- 提取日期：2026-09-02
- 覆盖范围：仓库代码审查、State Ownership、Provider Boundary、Public Contract、termination、Scope、测试缺口和 Provider Adapter Error Boundary Fix Task
- 整理说明：本文件保存会话中的有效 Review 主线和修复要求，不逐字复制页面 UI 和上传交互。最终工程学习记录见 `../day08-part-vii-a-foundation-model-provider.md`。

## Review 输入

ChatGPT 普通对话最初无法直接读取本地仓库，因此用户将以下内容打包为 `src.zip` 上传：

```text
src/
test/
package.json
tsconfig.json
```

Review 在实际读取这些文件后进行，而不是只根据架构任务推测代码。

## Review 总结

第一轮结论：整体架构与 Scope 通过，只存在一个需要阻塞 Closure 的错误边界问题。

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

## 唯一必须修复的问题

第一轮代码：

```ts
function parseArguments(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
```

当 Provider 返回：

```text
{"city":
```

Runtime 会收到一个 `arguments` 为原始字符串的 ToolCall。Adapter 已知 JSON 非法，却隐藏了该事实。

Review 确认正确语义是：

```text
OpenAI Tool Call
      ↓
arguments JSON parse
      ↓
parse failure
      ↓
explicit failure
      ↓
future Runtime decides how to handle it
```

最小修复：

```ts
function parseArguments(value: string): unknown {
  return JSON.parse(value) as unknown;
}
```

并增加 malformed JSON 测试。Review 明确禁止借此新增 ProviderError、Error Code、Retry、Fallback、Logging 或 Agent Loop error handling。

## State Ownership Review

`OpenAIModelProvider` 只保存 OpenAI client 与 model，没有保存：

```text
messages
conversation
runtimeState
currentStep
toolResults
iteration
```

因此 Provider 保存的是配置和客户端状态，而不是 Agent execution state，不存在双 State Source of Truth。

## Dependency 与 Adapter Review

当前依赖关系被确认清晰：

```text
RuntimeMessage
      ↓
toModelMessage
      ↓
ModelMessage
      ↓
ModelProvider
      ↓
OpenAIModelProvider
      ↓
OpenAI SDK
```

返回方向：

```text
OpenAI Response
      ↓
OpenAI mappings
      ↓
ModelResponse
```

没有 OpenAI Adapter 反向依赖 Agent Loop 或 Tool Executor。

## Public Contract Review

ModelRequest 只有 messages / tools，ModelResponse 只有 message / finishReason / usage。没有 raw response、providerMetadata 或万能 extensions 字段，OpenAI 原始结构没有泄漏进 Runtime Core。

## Termination Review

Provider 只把供应商 finish reason 转换为：

```text
stop
tool_calls
length
unknown
```

它没有 terminateAgent() 或 executeTools()。Review 强调：

```text
Model Turn Termination
≠
Agent Runtime Termination
```

## content: null Tool Call

OpenAI `{ content: null, tool_calls: [...] }` 被正确映射为只含 toolCalls 的 AssistantMessage，没有强制空字符串，也没有报错。现有测试已经覆盖。

## 当前接受的设计

- 未知 Provider finish reason 映射为 `unknown`；
- 401、429、500、timeout、network error 直接向上抛；
- 暂不设计 Error normalization、Retry 和 Fallback；
- 不增加更重的 Provider 抽象。

## Scope Review

压缩包中没有出现 Agent Loop、RuntimeState、Retry、Streaming、Provider Router、Middleware、Tracing、Memory、Token Budget、ContextBuilder、Tool Executor 或 Approval。

结论：Codex 没有 Scope Creep，也没有明显过度设计。

## 测试 Review

第一轮 7 个测试覆盖合法 mapping，但缺少 malformed Tool arguments。Review 不建议为了数量补大量边界 Case，只增加这个最重要的错误边界测试。

## Fix Task Done 条件

1. 原有 7 个测试继续通过；
2. 新增 malformed Tool arguments 测试；
3. build 通过；
4. tests 通过；
5. Demo 仍可真实运行。

该 Fix 完成后，Review 结论从 Almost Done 更新为 Done。

