# Day08 / Part VII-B Codex 实现、测试与 Debug 源记录

- 来源：本 Codex Workspace Task 的用户消息、工具执行结果与实现过程。
- 归档日期：2026-09-04。
- 形式：按实际过程整理的证据摘要，不是逐字完整 Codex 会话导出。
- 真实调用输出来自用户手工执行并贴回；归档时没有重新调用收费 API。
- 正式笔记：[RuntimeState + Agent Loop](../day08-part-vii-b-runtime-state-agent-loop.md)。
- 不包含 `.env` 内容或真实密钥。

## 1. 输入与初始检查

用户提供了完整 VII-B Implementation Task，明确只实现 RuntimeState、run、消息写回、最小 RunOutcome 和测试，不实现 VII-C～VII-I。

Codex 检查 Git 状态、源码文件、`AGENT.md`、`WORKFLOW.md`、根 README 和 Day08 README。检查到 VII-A 已具备双层消息、`toModelMessage()`、Model contract、OpenAI Provider 和 8 项映射测试，无需改动既有类型。

首次检查时存在未跟踪的 `src.zip`，本轮实现没有修改它。归档时该文件已被已有提交加入忽略规则；不将这一状态变化归作本轮 Codex 实现的操作。

## 2. 首轮实现

新增：

```text
src/runtime/runtime-state.ts
src/runtime/agent-runtime.ts
test/support/mock-model-provider.ts
test/agent-runtime.test.ts
```

决策落地：

- State 仅 messages，Runtime 使用 `#state` 私有持有。
- `run()` 先追加 user_input，再通过历史拷贝和已有 mapper 构造 ModelRequest。
- Provider 正常返回后，在 run 内转换回答为 model_output；先保存，再 switch finishReason。
- outcome 只有 completed / unsupported，unsupported 附 finishReason。
- getMessages 返回深拷贝，入库的 toolCalls 也深拷贝。
- Provider 错误不 catch、不包装、不再次调用 Provider。
- Mock 用请求数量索引预设响应，响应不足时抛错。

首轮同时修改根 README、Day08 README，补充用法与边界。当时 Day08 标记为 Implemented，等待 Review / Closure，并未提前宣告源码 Review 已完成。

## 3. 自动化验证证据

首轮执行：

```bash
npm test
npm run build
```

结果摘要：

```text
tests 17
pass 17
fail 0
build exit code 0
```

9 项 Runtime 测试覆盖普通回答、跨 run 历史、tool_calls、length、unknown、同步 throw、异步 rejection、历史深层修改和 Provider 引用修改。其余 8 项是既有 VII-A 映射测试。

由于 build 配置只包含 src，另外执行严格测试类型检查：

```bash
./node_modules/.bin/tsc --noEmit --target ES2022 \
  --module NodeNext --moduleResolution NodeNext \
  --allowImportingTsExtensions --strict --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

结果：exit code 0。首轮 `git diff --check` 也通过。

没有失败测试或构建错误记录，因此不能将这次实现描述成“修复了某个已经复现的 Runtime Bug”。

## 4. 真实 Demo 的追加过程

用户询问是否可以直接用 `npm run demo` 验证。Codex 说明现有命令只走 VII-A Provider，不经过 Runtime；随后根据用户希望直接运行命令的上下文，增加：

```text
src/demo/runtime-demo.ts
package.json → demo:runtime
README → 真实 Runtime Demo 用法
```

Demo 读取现有环境配置并创建一个 OpenAIModelProvider，再创建一个 AgentRuntime。固定输入依次为：

```text
我叫小明，请简短回复。
我叫什么名字？请简短回复。
```

每次 await run 后打印 `RunOutcome` 和 `Runtime history`；unsupported 时停止。没有 stdin 读取和交互式聊天功能。

追加 Demo 后重新执行 npm test 与 npm run build，仍全部通过。Codex 没有代替用户运行真实调用。

## 5. 终端额外输入事件

用户第一次运行 Demo，第二次请求期间夹杂自行输入的额外文字；进程结束后，shell 又将该文字当作命令，并报：

```text
zsh: command not found: 你好
```

状态中的四条消息仍只有 Demo 预设输入和模型响应。Codex 结合非交互 Demo 说明：额外文字没有进入 Runtime，shell 错误不是 Runtime 报错。这与终端在模型等待期间接收输入的情况相符。

之后用户重新执行，提供了不含额外文字的干净运行记录。没有为此改动 Runtime 代码。

## 6. 用户贴回的干净真实输出

以下只规范化缩进与用户消息中的 Markdown 转义，保留终端内容，不将摘要伪装成输出：

```text
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
```

证据解释：两轮 completed，历史从 2 条变 4 条，第二轮利用先前信息回答名字。Demo 本身没有打印 Provider request，精确请求历史由 Mock 测试和源码确认。

## 7. 验证方式说明的纠正

用户转述 ChatGPT 对真实 Demo 的建议。Codex 确认已有实现与之对应，并修正用语：VII-B 自动化测试不依赖真实 API，不代表只能用 Mock 验证。

分工最终为：

```text
Mock 测试 → 确定性行为与边界
真实 Demo → 真实集成与对话延续
build / 类型检查 → 工程与类型约束
源码 Review → 责任、范围与契约判断
```

## 8. 分析摘要被误读为原始输出

Codex 在实现总结中使用：

```text
run #1 → completed → 历史 2 条
run #2 → completed → 模型回答“小明。” → 历史 4 条
```

用户指出运行时没看到这个格式。Codex 澄清它是人工概括，程序只打印 User、RunOutcome 和完整 history；没有计数行或 run 编号。此事没有导致代码修改，但影响后续笔记的证据标注方式。

## 9. ChatGPT Review 与本任务的关系

完整评审过程另见 [Review 源记录](day08-part-vii-b-review-chatgpt-source.md)。其中的旧 src.zip、重新上传、`nihao` 猜测与澄清、最终 Done 结论，来自 ChatGPT 会话，而非本 Codex 任务自行解压附件得到的历史事实。

最终 Review 没有必须修复项，保留 unresolved tool call 后再次 run、失败后输入重复追加，以及参数可克隆契约等后续问题。用户随后明确声明 VII-B 完成，要求本次工程学习归档。

## 10. 2026-09-04 归档复核

归档开始时工作区干净，HEAD 为 `d6d6c4c`。当前代码与上述描述一致。

本次读取完整 ChatGPT 会话文本，并核对当前 src/test/config，执行：

- npm test：17/17 通过。
- npm run build：通过。
- 测试严格 TypeScript 类型检查：通过。
- 搜索 `src/`、`test/`：没有 nihao；console 输出仅在 Demo。

本次没有修改 Runtime、Provider、测试或工程配置，没有重跑真实 API，也没有把新的风险讨论转成越界代码。产出为正式学习笔记、源记录和索引 / Closure 状态更新。
