# Day08 / Part VII-A Codex 实现、测试与 Debug 源记录

- 来源：Codex Workspace Task 实际执行记录
- 执行仓库：`mini-agent-runtime`
- 整理日期：2026-09-02
- 覆盖范围：仓库检查、工程初始化、代码实现、构建、测试、Demo、Debug、Review Fix
- 安全说明：本记录不保存任何真实 API Key 或 `.env` 内容。
- 正式学习记录见 `../day08-part-vii-a-foundation-model-provider.md`。

## 1. 仓库检查

Codex 首先读取 `AGENT.md`、根 README、Git 状态和文件列表。确认仓库只有理论学习资料，没有现成 Node.js / TypeScript Runtime 工程。

实施原则：基于已确认设计做最小实现，不创建未来 Part 的空目录。

## 2. 第一轮工程实现

新增：

```text
package.json
package-lock.json
tsconfig.json
.gitignore
src/messages/
src/model/
src/model/openai/
src/demo/
test/
```

核心实现：

- RuntimeMessage / ModelMessage；
- `toModelMessage()`；
- ToolCall / ToolDefinition；
- ModelRequest / ModelResponse / FinishReason / ModelUsage；
- ModelProvider；
- OpenAI request/response mapping；
- OpenAIModelProvider；
- Demo；
- mapping tests。

## 3. npm 缓存权限 Debug

首次执行：

```bash
npm install
```

失败原因：`~/.npm/_cacache` 中存在 root-owned 文件，报 `EPERM`。

没有修改全局目录权限，改用：

```bash
npm install --cache /tmp/mini-agent-runtime-npm-cache
```

依赖安装成功。

## 4. OpenAI SDK 联合类型 Debug

第一轮测试通过，但 TypeScript build 报错：新版 OpenAI SDK 的 `ChatCompletionMessageToolCall` 还包含 custom tool call，不能无条件访问 `.function`。

最小修复：

```ts
if (toolCall.type !== "function") {
  throw new Error(`Unsupported OpenAI tool call type: ${toolCall.type}`);
}
```

没有把 custom tool 能力扩展到 Runtime。

## 5. 第一轮验证

完成修复后：

```text
npm run build  PASS
npm test       7/7 PASS
```

缺少 API Key 时 Demo 明确失败，没有 Mock fallback。

## 6. TypeScript import 策略调整

初版源码相对导入写 `.js`，符合经典 NodeNext 运行时 specifier 方式，但开发阶段与真实 `.ts` 文件名不一致。

对照 Pi 当前工程后，统一改为 `.ts`，并在 `tsconfig.json` 增加：

```json
{
  "allowImportingTsExtensions": true,
  "rewriteRelativeImportExtensions": true
}
```

验证：源码无相对 `.js` import，dist 无相对 `.ts` import，Node ESM 可以加载编译产物。

## 7. dotenv Debug

用户创建 `.env` 后，Demo 仍提示 `OPENAI_API_KEY` 缺失。检查确认文件和变量名存在，但项目没有 dotenv 依赖，也没有加载 `.env`。

修复：

- 安装 `dotenv`；
- Demo 顶部 `import "dotenv/config"`；
- 新增 `.env.example`；
- README 增加使用说明；
- `.env` 保持 Git ignore。

只验证变量已加载，不打印任何值。

## 8. 真实 Provider 调用

### OpenAI 官方 API

请求真实到达 OpenAI，但返回：

```text
HTTP 429
code: credit_balance_exhausted
```

原因是账户没有 API credits，不是代码 mapping 失败。没有添加 Retry 或 Error normalization。

### 智谱 OpenAI-compatible API

通过 Provider 的可选 baseURL 和当前 `.env` 配置，真实调用成功，得到 Runtime ModelResponse：

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

这里验证的是 OpenAI Chat Completions 兼容协议链路，代码没有新增正式智谱 Provider。

## 9. API Key 安全事件

Debug 过程中曾把完整 API Key 放入终端命令并粘贴到对话。Codex 明确要求立即撤销和轮换，并建议后续使用 `.env` 或先 export 环境变量。

源记录不保存该 Key。

## 10. Code Review Fix

Review 发现 `parseArguments()` 在 JSON.parse 失败后返回原始字符串，隐藏 Provider mapping 错误。

Codex 只做两处修改：

```ts
function parseArguments(value: string): unknown {
  return JSON.parse(value) as unknown;
}
```

以及新增：

```text
fails explicitly when OpenAI tool call arguments contain invalid JSON
```

没有实现 ProviderError、Retry、Streaming、Tool Validation、Fallback 或 Logging。

## 11. Fix 后最终验证

```text
npm run build  PASS
npm test       8/8 PASS
npm run demo   PASS, exit code 0
```

Fix 后真实 Demo 返回：

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

## 12. Scope 审计

最终通过文本审计确认 `src` / `test` 没有 RuntimeState、AgentLoop、ToolExecutor、AgentEvent、SessionStore、Approval、Subscriber 或 MockModelProvider。

Part VII-A 在最小修复后停止开发。

