# Day08 · Part VII-H Architecture Discussion / Design Decisions / Implementation Task — Full ChatGPT Source

> Source type: Full public conversation transcript（公开分享页可取得的完整当前分支；不是附件二进制）。
> Conversation title: Part VII-H
> Public source: https://chatgpt.com/share/6ad02e16-5f24-83ec-9e49-11cf8b5e6451
> Retrieval date: 2026-10-15
> Retrieval: 优先尝试 Codex read_thread（工具上限 10 turns / 每条 20000 字符）；关联 durable host 不可用，未得到会话正文。web open 返回 Cache miss；随后直接读取用户指定的公开分享页 HTML，仅解析其公开 conversation mapping，没有读取认证、浏览器私有接口或内部网络请求。
> Completeness: mapping 196 节点；current_node 沿 parent 回溯得到 196 节点，节点集合与 mapping 完全相同；linear_conversation 也是 196 节点。共 10 个 user turn。两份 source 合计保留 137 条非空公开消息：10 user、34 assistant text（12 commentary、22 final）、44 assistant code 工具请求、49 tool text。没有分页预览替代完整记录，也没有截断长回复。
> Normalization: 仅规范化每行尾部空白；保留原始正文、分段和完整回复的重复、GenUI / WritingBlock / MemoryCite 标记及候选代码。工具请求是历史材料，不在本次 Closure 重新执行。
> Exclusions: 不归档 system / private reasoning / 登录状态 / HTML 认证数据。公开工具的 redacted 占位按原文保留，不能恢复或冒充真实工具输出。
> Attachments: README(8).md、README(9).md、day08-part-vii-g-session-store-conversation-recovery.md、source-review(20261014-031653).zip、source-review(20261015-012420).zip。仅取得名称及公开正文，未重新取得附件二进制；本地当前仓库不等同于历史 ZIP 内容。
> Evidence boundary: 原文中的 API、候选错误名、学习草图、历史 sandbox 文件链接和执行命令属于当时讨论；最终实现以当前仓库为准。ChatGPT Review 是静态审查，不是独立运行测试。原文中的“npm run typecheck”和三个未限定的 demo 占位，在正式笔记按真实脚本与日志明确纠正。

> Scope: 全局第 1～8 轮。

## Turn 1

### User

> Message ID: `fe8a3de7-2be2-4e3a-bdf7-0058378f094f`; content: `text`; channel: `None`; recipient: `all`

# 继续下一个会话：

我们继续 **Part VII：Mini Agent Runtime Implementation**。



上一阶段 **Part VII-G** 已完成。



我已经提供：



- Part VII 总体规划 / README；
- Part VII-G 最终 Milestone Note；
- 当前 Architecture Decisions（如果存在）。
  - \


现在进入：



**Part VII-H：beforeToolCall + 简单 Approval**



请先阅读上一阶段已经形成的真实实现、架构边界和设计决策。



后续必须基于现有实现做增量演进，不要重新设计已经确认完成的部分；如果发现前一阶段存在明确架构问题，可以提出，但请说明为什么需要调整。



继续采用固定工程学习流程：



**Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure**



现在先进入 **Architecture Analysis（架构分析）**。



请你先根据：



- 当前已有代码和架构决策；如上传的压缩包代码与上一节的 md 文件
- 本节标题与目标；
- 后续 Part 的整体规划；
  - \


帮我识别本节真正需要解决的架构问题、实现边界、关键设计决策和完成标准，然后逐步带我讨论。



不要一开始直接实现代码，也不要提前实现后续 Part。

### Public tool output

> Message ID: `3778d4ad-26ee-48f1-ae8f-03c803a3d507`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### Public tool output

> Message ID: `ae7378ac-4f66-4e7d-99fd-d7e7d971aad8`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### Public tool output

> Message ID: `4bb1cb8a-f3f4-4c2d-bd67-f91d8290c463`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### Public tool output

> Message ID: `47696455-fc52-4076-9aa4-a73dd6c271d5`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### Public tool output

> Message ID: `eeec9b5d-ad7b-4c07-bc3f-277335df63c9`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — commentary

> Message ID: `d8673ebb-ea89-4ebe-8cea-09479e18d291`; content: `text`; channel: `commentary`; recipient: `all`

我会先以这次上传的源码压缩包为准，对照 VII-G 的最终笔记和 Day08 README，确认现有 Tool Loop、错误处理、Abort、事件及持久化边界。

然后只分析 VII-H 必须新增的能力、可能的契约冲突和验收场景。我们先讨论架构，不写代码，也不提前决定所有接口。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `0c0dfd1e-fa5f-4b58-b16e-658729ee82f9`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc python - <<'PY'
import zipfile,os
p='/mnt/data/source-review(20261014-031653).zip'
with zipfile.ZipFile(p) as z:
 print('ZIP entries:',len(z.namelist()))
 for info in z.infolist():
  print(info.filename,info.file_size)
PY

### Public tool output

> Message ID: `c945ced7-da8b-40fe-a70e-0a2288a4c08a`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `532af7cb-dc24-4658-8490-74aebc395297`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /tmp/mini_runtime_vii_h_review && unzip -oq '/mnt/data/source-review(20261014-031653).zip' -d /tmp/mini_runtime_vii_h_review && for f in src/runtime/agent-runtime.ts src/tools/tool-executor.ts src/tools/tool.ts src/tools/tool-registry.ts src/runtime/agent-event.ts src/model/model-provider.ts src/messages/runtime-message.ts src/demo/conversation-workflow.ts; do echo; echo '========================' $f; nl -ba /tmp/mini_runtime_vii_h_review/$f; done

### Public tool output

> Message ID: `819e191e-b2f1-4c94-b003-1585cb786f09`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `89ea6267-d023-4b36-b601-751c15f66aa6`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc for f in src/runtime/agent-runtime.ts src/model/tool.ts src/model/model.ts src/messages/validate-conversation.ts src/runtime/context-builder.ts; do echo; echo ==== $f; nl -ba /tmp/mini_runtime_vii_h_review/$f; done

### Public tool output

> Message ID: `b6f69131-16c9-4d1b-9159-5df64325adef`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `9b8def77-5198-4e7b-86b8-acc40ce4993a`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc echo '=== TEST TARGETS ==='; rg -n 'ToolCall|tool_execution|cancel|abort|throw|started|completed|maxTurns|invalid|skipped|active|reentrant|session' /tmp/mini_runtime_vii_h_review/test/run-control.test.ts | head -135; echo ===TOOLTEST===; rg -n '^test\(|^describe\(|^it\(' /tmp/mini_runtime_vii_h_review/test/tool-runtime.test.ts; echo '=== CONTROL TEST EXCERPTS ==='; sed -n '1,260p' /tmp/mini_runtime_vii_h_review/test/run-control.test.ts

### Public tool output

> Message ID: `90743353-7627-469e-ac14-3c0f31f74da9`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `17be36df-41d3-4c58-a3a5-48470c8c464d`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc sed -n '70,220p' /tmp/mini_runtime_vii_h_review/test/tool-runtime.test.ts; sed -n '1,230p' /tmp/mini_runtime_vii_h_review/test/agent-event.test.ts; sed -n '1,120p' /tmp/mini_runtime_vii_h_review/package.json; for f in '/mnt/data/README(8).md' '/mnt/data/README(9).md' '/mnt/data/day08-part-vii-g-session-store-conversation-recovery.md'; do wc -lc "$f"; done

### Public tool output

> Message ID: `6fa7b81c-ec60-4372-b7cb-c3143583465e`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `017be970-4843-4bf4-a50f-efdce92762be`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H：beforeToolCall + 简单 Approval

<badge color="info">Architecture Analysis · 架构分析</badge>

我已经对照了你上传的四份材料：

- `README(8).md`：整个 Agent Runtime 学习路线。
- `README(9).md`：Part VII-A～VII-I 的规划、完成状态和工程原则。
- `day08-part-vii-g-session-store-conversation-recovery.md`：VII-G 最终架构决策与工程记录。
- `source-review(20261014-031653).zip`：实际的 `src/`、`test/`、工程配置与实现代码。

**本节结论先说：VII-H 不需要重新设计 Runtime，而是要给现有 Tool 执行链增加一个真正具备控制权的执行前检查点。**

它和 VII-E 的事件系统不同：

- VII-E 解决的是：外部如何观察 Runtime 正在做什么。
- VII-H 解决的是：Runtime 已经决定执行某个 Tool，但在真正调用它之前，谁有权允许或者拒绝？

这一步是从 **Agent 能调用工具** 走向 **Agent 的工具执行受到控制**。

## 一、先确认我们当前的真实架构

### 1.1 VII-A～VII-G 已经建立的能力

| Milestone | 已确认能力 | VII-H 是否修改 |
|---|---|---|
| VII-A | 消息、ToolCall、ModelProvider | 不重新设计 |
| VII-B | RuntimeState + Agent Loop | 保持消息状态模型 |
| VII-C | Registry、Executor、Error Contract | **核心扩展位置** |
| VII-D | ContextBuilder、TurnSnapshot | 不修改 |
| VII-E | AgentEvent、Subscriber | 保持观察者职责 |
| VII-F | Abort、Single Active Run | 扩展到审批等待过程 |
| VII-G | SessionStore、Conversation Recovery | 保持 Run Boundary 保存 |

从源码确认，当前 `AgentRuntimeOptions` 包含：

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
}
```

当前 `RuntimeState` 仍然只保存 `messages`，没有 Session 元数据、审批状态或者运行状态字段。

`AgentRuntime` 负责唯一的 State mutation；`ToolExecutor` 负责工具查找、Ajv 参数校验、执行与错误归一化。

这些边界都没有理由在 VII-H 被推翻。

### 1.2 当前 Tool 的实际执行链

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">现有调用链（依据 agent-runtime.ts、tool-executor.ts）</text>
  <box background="surface-secondary" radius="md" padding={3} align="center" gap="1px">
    **ModelProvider.generate()**
    <icon name="arrow-down" color="tertiary"/>
    **ModelResponse.toolCalls**
    <icon name="arrow-down" color="tertiary"/>
    **AgentRuntime**
    <text color="secondary" size="xs">提交 model_output，检查 Abort / maxTurns</text>
    <icon name="arrow-down" color="tertiary"/>
    **ToolExecutor.execute()**
    <text color="secondary" size="xs">Registry lookup → Ajv arguments validation</text>
    <icon name="arrow-down" color="tertiary"/>
    <box border={{size:1,color:"default"}} background="surface" radius="md" padding={3} width="90%" align="center" gap={1}>
      **Tool.execute(args)**
      <text color="secondary" size="xs">实际执行工具逻辑，可能产生外部副作用</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    **ToolResult → RuntimeState**
    <icon name="arrow-down" color="tertiary"/>
    **下一轮 Model Turn**
  </box>
</box>

这里最重要的代码事实是：

`agent-runtime.ts:193–219` 调用 Executor，并将执行结果写入 `tool_result`。

`tool-executor.ts:24–63` 进行工具查找、参数校验和真正的 `tool.execute()`。

目前只要工具存在、参数合法且没有触发取消，正常调用路径就会直接执行 Tool。

**缺少的是执行前的授权决策。**

### 1.3 为什么不能拿现有 Subscriber 实现 Approval？

当前 `subscribe()` 接收的是同步观察者，`#emit()` 会隔离观察者异常，并且不接受观察者返回值来控制 Runtime。

因此：

```text
tool_execution_started
        ↓
Subscriber 收到事件
        ↓
用户说：拒绝
```

不能作为可靠的阻止机制。

因为事件发布不代表 Runtime 会等待，也不会使用 Subscriber 的返回值决定是否执行工具。

这正是 VII-E 与 VII-H 必须区分的架构边界：

**Event 是 Observation（观察）；beforeToolCall 是 Interception（执行前拦截）。**

我们不应破坏 VII-E 已经完成的设计。


### ChatGPT

> Message ID: `70ca5ac6-4866-42a5-9113-85ee8e6bdd31`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H：beforeToolCall + 简单 Approval

<badge color="info">Architecture Analysis · 架构分析</badge>

我已经对照了你上传的四份材料：

- `README(8).md`：整个 Agent Runtime 学习路线。
- `README(9).md`：Part VII-A～VII-I 的规划、完成状态和工程原则。
- `day08-part-vii-g-session-store-conversation-recovery.md`：VII-G 最终架构决策与工程记录。
- `source-review(20261014-031653).zip`：实际的 `src/`、`test/`、工程配置与实现代码。

**本节结论先说：VII-H 不需要重新设计 Runtime，而是要给现有 Tool 执行链增加一个真正具备控制权的执行前检查点。**

它和 VII-E 的事件系统不同：

- VII-E 解决的是：外部如何观察 Runtime 正在做什么。
- VII-H 解决的是：Runtime 已经决定执行某个 Tool，但在真正调用它之前，谁有权允许或者拒绝？

这一步是从 **Agent 能调用工具** 走向 **Agent 的工具执行受到控制**。

## 一、先确认我们当前的真实架构

### 1.1 VII-A～VII-G 已经建立的能力

| Milestone | 已确认能力 | VII-H 是否修改 |
|---|---|---|
| VII-A | 消息、ToolCall、ModelProvider | 不重新设计 |
| VII-B | RuntimeState + Agent Loop | 保持消息状态模型 |
| VII-C | Registry、Executor、Error Contract | **核心扩展位置** |
| VII-D | ContextBuilder、TurnSnapshot | 不修改 |
| VII-E | AgentEvent、Subscriber | 保持观察者职责 |
| VII-F | Abort、Single Active Run | 扩展到审批等待过程 |
| VII-G | SessionStore、Conversation Recovery | 保持 Run Boundary 保存 |

从源码确认，当前 `AgentRuntimeOptions` 包含：

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
}
```

当前 `RuntimeState` 仍然只保存 `messages`，没有 Session 元数据、审批状态或者运行状态字段。

`AgentRuntime` 负责唯一的 State mutation；`ToolExecutor` 负责工具查找、Ajv 参数校验、执行与错误归一化。

这些边界都没有理由在 VII-H 被推翻。

### 1.2 当前 Tool 的实际执行链

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">现有调用链（依据 agent-runtime.ts、tool-executor.ts）</text>
  <box background="surface-secondary" radius="md" padding={3} align="center" gap="1px">
    **ModelProvider.generate()**
    <icon name="arrow-down" color="tertiary"/>
    **ModelResponse.toolCalls**
    <icon name="arrow-down" color="tertiary"/>
    **AgentRuntime**
    <text color="secondary" size="xs">提交 model_output，检查 Abort / maxTurns</text>
    <icon name="arrow-down" color="tertiary"/>
    **ToolExecutor.execute()**
    <text color="secondary" size="xs">Registry lookup → Ajv arguments validation</text>
    <icon name="arrow-down" color="tertiary"/>
    <box border={{size:1,color:"default"}} background="surface" radius="md" padding={3} width="90%" align="center" gap={1}>
      **Tool.execute(args)**
      <text color="secondary" size="xs">实际执行工具逻辑，可能产生外部副作用</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    **ToolResult → RuntimeState**
    <icon name="arrow-down" color="tertiary"/>
    **下一轮 Model Turn**
  </box>
</box>

这里最重要的代码事实是：

`agent-runtime.ts:193–219` 调用 Executor，并将执行结果写入 `tool_result`。

`tool-executor.ts:24–63` 进行工具查找、参数校验和真正的 `tool.execute()`。

目前只要工具存在、参数合法且没有触发取消，正常调用路径就会直接执行 Tool。

**缺少的是执行前的授权决策。**

### 1.3 为什么不能拿现有 Subscriber 实现 Approval？

当前 `subscribe()` 接收的是同步观察者，`#emit()` 会隔离观察者异常，并且不接受观察者返回值来控制 Runtime。

因此：

```text
tool_execution_started
        ↓
Subscriber 收到事件
        ↓
用户说：拒绝
```

不能作为可靠的阻止机制。

因为事件发布不代表 Runtime 会等待，也不会使用 Subscriber 的返回值决定是否执行工具。

这正是 VII-E 与 VII-H 必须区分的架构边界：

**Event 是 Observation（观察）；beforeToolCall 是 Interception（执行前拦截）。**

我们不应破坏 VII-E 已经完成的设计。

## 二、本节真正要解决的 6 个架构问题

我把它们按照依赖关系排序。后面我们逐个讨论，而不是一次性冻结全部设计。

| 架构问题 | 必须回答什么 | 优先级 |
|---|---|---|
| H-Q01：Hook 所有权 | beforeToolCall 由谁执行？放在执行链哪一层？ | P0 |
| H-Q02：Hook Contract | Hook 接收什么、返回什么、能否异步、能否修改参数？ | P0 |
| H-Q03：Approval 决策 | 谁判断需要审批？用户允许／拒绝后怎么办？ | P0 |
| H-Q04：Result Contract | 被拒绝的 ToolCall 如何写回消息，并让模型继续？ | P0 |
| H-Q05：Abort × Approval | 等待人工批准时，Run 被取消如何处理？ | P0 |
| H-Q06：Event × Session | 如何与现有事件、消息配对及恢复机制兼容？ | P1 |

### H-Q01：beforeToolCall 应该属于谁？

这是我认为本节的第一个核心问题。

以前我们一直强调：

> Who owns it? Who decides? Who changes state?

这次同样适用，只不过需要区分三个角色：

| 角色 | 建议职责 |
|---|---|
| Application / Approval Handler | 提供审批策略及人工决策 |
| ToolExecutor | 保证没有获得允许的工具不会真正执行 |
| AgentRuntime | 编排执行过程、写入 ToolResult、继续 Agent Loop |

例如未来的营销 Agent，模型提出：

```text
调用 issueCoupon({
  userId: "10001",
  amount: 500
})
```

这时候：

- LLM 只提出工具调用请求，不拥有批准权。
- Application 可以要求人工审批。
- Executor 必须保证拒绝后不能执行发券函数。
- Runtime 需要将拒绝作为工具调用结果回流模型。

**初步建议：决策权由 Application 提供，执行门禁放在 ToolExecutor 附近，Runtime 继续管理状态与循环。**

但我们需要讨论具体如何接入，而不能直接往 `ToolExecutor` 里塞一个回调了事。

### H-Q02：Hook 应该在参数校验前还是校验后执行？

当前 Executor 顺序是：

```text
Registry Lookup
      ↓
JSON Schema Validation
      ↓
Tool.execute()
```

有两种候选设计。

<box border radius="lg" padding={3} gap={3}>
  <box gap={1}>
    **方案 A：Runtime 层提前拦截**

    <text color="secondary" size="sm">Model ToolCall → Hook → Executor → Validation → Execute</text>

    优点是接入比较直观，Runtime 可以直接控制 Hook。

    问题是 Hook 可能收到尚未验证的参数，甚至不存在的工具调用。如果要审批合法参数，就容易在 Runtime 和 Executor 之间重复实现校验逻辑。
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <row align="center" justify="between">
      **方案 B：Executor 校验后拦截**
      <badge>倾向方案</badge>
    </row>
    <text color="secondary" size="sm">Model ToolCall → Executor → Validation → Hook → Tool.execute</text>

    好处是 Hook 只处理有可能真正执行的工具调用，保持 VII-C 已确认的 Ajv Validation 所有权，同时控制点紧邻实际执行。

    需要解决的是：如何将外部 Approval Handler 注入执行链，以及如何保证 Hook 不会偷偷修改已验证的参数。
  </box>
</box>

目前我倾向 **方案 B**，但还没有把它确认为 H-AD01。

### H-Q03：简单 Approval 到底意味着什么？

这里容易过度设计。

我们不需要立刻实现完整的 Approval Engine（审批引擎）。

本阶段真正需要证明的是：

<box border radius="lg" padding={3} gap={1} align="center">
  **LLM 提出工具调用**
  <icon name="arrow-down" color="tertiary"/>
  **执行前判断是否放行**
  <icon name="arrow-down" color="tertiary"/>
  <box border radius="md" padding={3} width="100%" gap={2}>
    <text weight="medium" textAlign="center">人工审批（仅在需要时）</text>
    <grid columns={2} gap={2}>
      <grid-item>
        <box background="surface-secondary" padding={3} radius="md" align="center" gap={1}>
          <icon name="check" color="success" size="lg"/>
          **Approve**
          <text color="secondary" size="xs">执行 Tool</text>
        </box>
      </grid-item>
      <grid-item>
        <box background="surface-secondary" padding={3} radius="md" align="center" gap={1}>
          <icon name="x" color="danger" size="lg"/>
          **Deny**
          <text color="secondary" size="xs">不执行 Tool</text>
        </box>
      </grid-item>
    </grid>
  </box>
  <icon name="arrow-down" color="tertiary"/>
  **ToolResult 回流 Runtime**
  <icon name="arrow-down" color="tertiary"/>
  **模型继续生成回答**
</box>

这里的 Human-in-the-loop（人在执行环节参与决策）不一定需要独立的审批服务。对于 Mini Runtime，一个可以异步等待外部决策的 Approval Handler 就足以验证核心机制。

但它应当具备两个关键性质：

- **不能假装拒绝成功，却仍然执行工具。**
- **不能把“用户拒绝”误解释为“整个 Run 被取消”。**

例如用户拒绝发放优惠券，Agent 应该有机会告诉用户操作未被批准，而不是直接丢掉当前对话。

### H-Q04：拒绝执行以后，ToolResult 怎么办？

VII-C 已经建立：

```ts
type ToolResult =
  | { success: true; result: ToolValue }
  | { success: false; error: ToolError };
```

VII-G 又要求每一批 ToolCall 必须拥有完整的 ToolResult 配对。

所以，一个很重要的初步判断是：

**Approval Denied（审批拒绝）应当作为一条明确的失败 ToolResult 写回，而不是删除 ToolCall、伪造成功或者让它悬空。**

例如可以考虑新增一个明确的错误码，区别于已有的 `TOOL_EXECUTION_FAILED`。

不需要为此修改 `RuntimeMessage` 的三种消息类型。

还有一个需要讨论的场景：模型一次返回三个 ToolCall，其中第二个被拒绝。

我倾向保持现有的逐个执行与逐个结果配对策略，使第二个拒绝不必自动阻断第三个；但前提是第三个仍要独立经过自己的授权检查。

### H-Q05：等待 Approval 的过程中，用户取消 Run 怎么办？

这是 VII-H 与 VII-F 的重要交叉点。

假设：

```text
Runtime.run()
   ↓
ToolCall: issueCoupon()
   ↓
await Approval
   ↓
用户一直没有操作
   ↓
Caller.abort()
```

现有 `#active` 会一直保持 true，直到 Run settle；这符合 Single Active Run 的语义。

但是新增异步审批以后，必须明确：

- Abort 能否打断等待中的 Approval？
- Abort 后迟到的 Approve 还能不能触发 Tool？
- 取消时如何为当前和剩余 ToolCall 写入 cancelled 配对？
- 已经执行成功的前一个 ToolResult 是否保留？

我的建议是沿用 VII-F 的原则：

**Abort 优先阻止尚未开始的副作用；已经提交的事实不回滚；审批等待被取消后，任何迟到的批准都不得执行工具。**

其中，如何保证等待过程能够响应 Abort，是实现阶段必须测试的内容。

### H-Q06：Approval 和 VII-E、VII-G 怎么衔接？

这个问题有两个重要细节。

**第一，现有 `tool_execution_started` 已经包含执行尝试的含义。**

从实际测试看，即使工具不存在，或者参数校验失败，也会发出 `tool_execution_started` 和 `tool_execution_completed`。

因此它并不严格等于“工具函数已经开始产生副作用”。

VII-H 需要明确保留还是细化这个语义，避免把“开始审批”误报为“已真正执行”。

**第二，SessionStore 不能被偷偷升级成审批状态存储。**

当前 `runAndSave()` 是等待 Run settle 后才执行验证和保存。

如果 Approval 正在等待：

- 当前 Run 尚未完成；
- Application 不会通过当前 workflow 保存此次在途审批；
- 进程重启不能自动恢复刚才的人工等待。

这恰好符合 VII-H 的非持久化审批边界。

审批拒绝后生成的 `tool_result` 则是稳定对话事实，可以和其他工具结果一样保存、恢复。

---

## 三、建议的 VII-H 实现边界

| 本节包含 | 本节不包含 |
|---|---|
| 可选 beforeToolCall Hook | 通用插件 / Extension Framework |
| 允许、拒绝两种基本决策 | 多角色、多级审批流程 |
| 简单异步 Human Approval | Durable Approval |
| 拒绝结果回流 LLM | 恢复进程重启前等待的审批 |
| 与 Abort 联动 | 跨 Runtime / 跨实例审批协调 |
| 与现有事件和 Session 兼容 | 审批中心数据库、复杂审计平台 |
| 最小 Demo 与确定性测试 | VII-I Weather Agent 完整实现 |

这里特别强调一个安全边界：**前端或 Application 层的 Approval 不能替代真实业务 API 的服务端鉴权。** 将来营销 Agent 调用发券、修改活动等接口时，服务端仍然需要独立验证权限和业务约束。

## 四、完成标准（初版 Acceptance Criteria）

这里先制定验收目标，不等于已经确认具体实现方式。

| 验收场景 | 预期结果 |
|---|---|
| 没有配置 Hook | 原有 Tool Loop 行为不变 |
| Hook 允许执行 | Tool 实际执行一次，正常回流 |
| Hook 拒绝执行 | Tool 执行次数为 0，产生失败 Result |
| 多 Tool 混合允许／拒绝 | 每个 Call 独立决策，消息完整配对 |
| Tool 不存在或参数非法 | 不会进入实际 Tool.execute，错误契约保留 |
| maxTurns 达到上限 | Tool 不执行，不触发无意义审批 |
| 异步 Approval 等待中 | 不执行 Tool，Single Active Run 生效 |
| 等待期间 Abort | 不执行未获批准的 Tool，正确取消配对 |
| Hook 抛异常 | 不得绕过审批执行工具；错误语义需要冻结 |
| 审批拒绝后继续模型调用 | 模型能观察拒绝结果并生成回答 |
| Run settle 后保存 / 恢复 | 拒绝历史合法，不重新执行历史 Tool |
| 引用隔离 | Hook 无法借参数引用修改 Runtime 已提交事实 |

完成时仍需以 Codex 实际运行的 `npm test`、`npm run build`、`npm run typecheck:tests` 和确定性 Demo 为准。

当前 ZIP 可以静态核对代码与测试，但这次架构分析没有重新运行测试；**176 项通过**是 VII-G 归档中的历史验证基线，不是本轮的新验证结果。

---

## 五、接下来我们先讨论第一个决策

我建议第一轮只冻结 **H-Q01 + H-Q02 的最小部分**：

> beforeToolCall 到底放在哪一层？它应该只检查已经通过 Tool Schema 校验、即将真正执行的工具调用吗？

我的倾向是：

**Application 负责提供决策能力，ToolExecutor 在执行前落实决策，AgentRuntime 负责继续现有 Loop 和提交结果。**

并且第一版 Hook 不允许直接修改 Tool 参数，避免出现“用户审批了 A 参数，实际执行了 B 参数”的问题。

这两个边界一旦确定，我们再讨论 Hook 是返回 `allow/deny`，还是引入一个 `requestApproval` 决策，以及异常、Abort 和 ToolResult 如何协同。

这是本节的第一处真正需要形成的 Architecture Decision。后续我们按讨论结果编写 H-AD 编号，最后统一生成 Codex Implementation Task，而不是现在就动代码。

### ChatGPT

> Message ID: `766af7b4-c99e-4208-8aaf-9b6e6ef26043`; content: `text`; channel: `final`; recipient: `all`

## 二、本节真正要解决的 6 个架构问题

我把它们按照依赖关系排序。后面我们逐个讨论，而不是一次性冻结全部设计。

| 架构问题 | 必须回答什么 | 优先级 |
|---|---|---|
| H-Q01：Hook 所有权 | beforeToolCall 由谁执行？放在执行链哪一层？ | P0 |
| H-Q02：Hook Contract | Hook 接收什么、返回什么、能否异步、能否修改参数？ | P0 |
| H-Q03：Approval 决策 | 谁判断需要审批？用户允许／拒绝后怎么办？ | P0 |
| H-Q04：Result Contract | 被拒绝的 ToolCall 如何写回消息，并让模型继续？ | P0 |
| H-Q05：Abort × Approval | 等待人工批准时，Run 被取消如何处理？ | P0 |
| H-Q06：Event × Session | 如何与现有事件、消息配对及恢复机制兼容？ | P1 |

### H-Q01：beforeToolCall 应该属于谁？

这是我认为本节的第一个核心问题。

以前我们一直强调：

> Who owns it? Who decides? Who changes state?

这次同样适用，只不过需要区分三个角色：

| 角色 | 建议职责 |
|---|---|
| Application / Approval Handler | 提供审批策略及人工决策 |
| ToolExecutor | 保证没有获得允许的工具不会真正执行 |
| AgentRuntime | 编排执行过程、写入 ToolResult、继续 Agent Loop |

例如未来的营销 Agent，模型提出：

```text
调用 issueCoupon({
  userId: "10001",
  amount: 500
})
```

这时候：

- LLM 只提出工具调用请求，不拥有批准权。
- Application 可以要求人工审批。
- Executor 必须保证拒绝后不能执行发券函数。
- Runtime 需要将拒绝作为工具调用结果回流模型。

**初步建议：决策权由 Application 提供，执行门禁放在 ToolExecutor 附近，Runtime 继续管理状态与循环。**

但我们需要讨论具体如何接入，而不能直接往 `ToolExecutor` 里塞一个回调了事。

### H-Q02：Hook 应该在参数校验前还是校验后执行？

当前 Executor 顺序是：

```text
Registry Lookup
      ↓
JSON Schema Validation
      ↓
Tool.execute()
```

有两种候选设计。

<box border radius="lg" padding={3} gap={3}>
  <box gap={1}>
    **方案 A：Runtime 层提前拦截**

    <text color="secondary" size="sm">Model ToolCall → Hook → Executor → Validation → Execute</text>

    优点是接入比较直观，Runtime 可以直接控制 Hook。

    问题是 Hook 可能收到尚未验证的参数，甚至不存在的工具调用。如果要审批合法参数，就容易在 Runtime 和 Executor 之间重复实现校验逻辑。
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    <row align="center" justify="between">
      **方案 B：Executor 校验后拦截**
      <badge>倾向方案</badge>
    </row>
    <text color="secondary" size="sm">Model ToolCall → Executor → Validation → Hook → Tool.execute</text>

    好处是 Hook 只处理有可能真正执行的工具调用，保持 VII-C 已确认的 Ajv Validation 所有权，同时控制点紧邻实际执行。

    需要解决的是：如何将外部 Approval Handler 注入执行链，以及如何保证 Hook 不会偷偷修改已验证的参数。
  </box>
</box>

目前我倾向 **方案 B**，但还没有把它确认为 H-AD01。

### H-Q03：简单 Approval 到底意味着什么？

这里容易过度设计。

我们不需要立刻实现完整的 Approval Engine（审批引擎）。

本阶段真正需要证明的是：

<box border radius="lg" padding={3} gap={1} align="center">
  **LLM 提出工具调用**
  <icon name="arrow-down" color="tertiary"/>
  **执行前判断是否放行**
  <icon name="arrow-down" color="tertiary"/>
  <box border radius="md" padding={3} width="100%" gap={2}>
    <text weight="medium" textAlign="center">人工审批（仅在需要时）</text>
    <grid columns={2} gap={2}>
      <grid-item>
        <box background="surface-secondary" padding={3} radius="md" align="center" gap={1}>
          <icon name="check" color="success" size="lg"/>
          **Approve**
          <text color="secondary" size="xs">执行 Tool</text>
        </box>
      </grid-item>
      <grid-item>
        <box background="surface-secondary" padding={3} radius="md" align="center" gap={1}>
          <icon name="x" color="danger" size="lg"/>
          **Deny**
          <text color="secondary" size="xs">不执行 Tool</text>
        </box>
      </grid-item>
    </grid>
  </box>
  <icon name="arrow-down" color="tertiary"/>
  **ToolResult 回流 Runtime**
  <icon name="arrow-down" color="tertiary"/>
  **模型继续生成回答**
</box>

这里的 Human-in-the-loop（人在执行环节参与决策）不一定需要独立的审批服务。对于 Mini Runtime，一个可以异步等待外部决策的 Approval Handler 就足以验证核心机制。

但它应当具备两个关键性质：

- **不能假装拒绝成功，却仍然执行工具。**
- **不能把“用户拒绝”误解释为“整个 Run 被取消”。**

例如用户拒绝发放优惠券，Agent 应该有机会告诉用户操作未被批准，而不是直接丢掉当前对话。

### H-Q04：拒绝执行以后，ToolResult 怎么办？

VII-C 已经建立：

```ts
type ToolResult =
  | { success: true; result: ToolValue }
  | { success: false; error: ToolError };
```

VII-G 又要求每一批 ToolCall 必须拥有完整的 ToolResult 配对。

所以，一个很重要的初步判断是：

**Approval Denied（审批拒绝）应当作为一条明确的失败 ToolResult 写回，而不是删除 ToolCall、伪造成功或者让它悬空。**

例如可以考虑新增一个明确的错误码，区别于已有的 `TOOL_EXECUTION_FAILED`。

不需要为此修改 `RuntimeMessage` 的三种消息类型。

还有一个需要讨论的场景：模型一次返回三个 ToolCall，其中第二个被拒绝。

我倾向保持现有的逐个执行与逐个结果配对策略，使第二个拒绝不必自动阻断第三个；但前提是第三个仍要独立经过自己的授权检查。

### H-Q05：等待 Approval 的过程中，用户取消 Run 怎么办？

这是 VII-H 与 VII-F 的重要交叉点。

假设：

```text
Runtime.run()
   ↓
ToolCall: issueCoupon()
   ↓
await Approval
   ↓
用户一直没有操作
   ↓
Caller.abort()
```

现有 `#active` 会一直保持 true，直到 Run settle；这符合 Single Active Run 的语义。

但是新增异步审批以后，必须明确：

- Abort 能否打断等待中的 Approval？
- Abort 后迟到的 Approve 还能不能触发 Tool？
- 取消时如何为当前和剩余 ToolCall 写入 cancelled 配对？
- 已经执行成功的前一个 ToolResult 是否保留？

我的建议是沿用 VII-F 的原则：

**Abort 优先阻止尚未开始的副作用；已经提交的事实不回滚；审批等待被取消后，任何迟到的批准都不得执行工具。**

其中，如何保证等待过程能够响应 Abort，是实现阶段必须测试的内容。

### H-Q06：Approval 和 VII-E、VII-G 怎么衔接？

这个问题有两个重要细节。

**第一，现有 `tool_execution_started` 已经包含执行尝试的含义。**

从实际测试看，即使工具不存在，或者参数校验失败，也会发出 `tool_execution_started` 和 `tool_execution_completed`。

因此它并不严格等于“工具函数已经开始产生副作用”。

VII-H 需要明确保留还是细化这个语义，避免把“开始审批”误报为“已真正执行”。

**第二，SessionStore 不能被偷偷升级成审批状态存储。**

当前 `runAndSave()` 是等待 Run settle 后才执行验证和保存。

如果 Approval 正在等待：

- 当前 Run 尚未完成；
- Application 不会通过当前 workflow 保存此次在途审批；
- 进程重启不能自动恢复刚才的人工等待。

这恰好符合 VII-H 的非持久化审批边界。

审批拒绝后生成的 `tool_result` 则是稳定对话事实，可以和其他工具结果一样保存、恢复。

---

## 三、建议的 VII-H 实现边界

| 本节包含 | 本节不包含 |
|---|---|
| 可选 beforeToolCall Hook | 通用插件 / Extension Framework |
| 允许、拒绝两种基本决策 | 多角色、多级审批流程 |
| 简单异步 Human Approval | Durable Approval |
| 拒绝结果回流 LLM | 恢复进程重启前等待的审批 |
| 与 Abort 联动 | 跨 Runtime / 跨实例审批协调 |
| 与现有事件和 Session 兼容 | 审批中心数据库、复杂审计平台 |
| 最小 Demo 与确定性测试 | VII-I Weather Agent 完整实现 |

这里特别强调一个安全边界：**前端或 Application 层的 Approval 不能替代真实业务 API 的服务端鉴权。** 将来营销 Agent 调用发券、修改活动等接口时，服务端仍然需要独立验证权限和业务约束。

## 四、完成标准（初版 Acceptance Criteria）

这里先制定验收目标，不等于已经确认具体实现方式。

| 验收场景 | 预期结果 |
|---|---|
| 没有配置 Hook | 原有 Tool Loop 行为不变 |
| Hook 允许执行 | Tool 实际执行一次，正常回流 |
| Hook 拒绝执行 | Tool 执行次数为 0，产生失败 Result |
| 多 Tool 混合允许／拒绝 | 每个 Call 独立决策，消息完整配对 |
| Tool 不存在或参数非法 | 不会进入实际 Tool.execute，错误契约保留 |
| maxTurns 达到上限 | Tool 不执行，不触发无意义审批 |
| 异步 Approval 等待中 | 不执行 Tool，Single Active Run 生效 |
| 等待期间 Abort | 不执行未获批准的 Tool，正确取消配对 |
| Hook 抛异常 | 不得绕过审批执行工具；错误语义需要冻结 |
| 审批拒绝后继续模型调用 | 模型能观察拒绝结果并生成回答 |
| Run settle 后保存 / 恢复 | 拒绝历史合法，不重新执行历史 Tool |
| 引用隔离 | Hook 无法借参数引用修改 Runtime 已提交事实 |

完成时仍需以 Codex 实际运行的 `npm test`、`npm run build`、`npm run typecheck:tests` 和确定性 Demo 为准。

当前 ZIP 可以静态核对代码与测试，但这次架构分析没有重新运行测试；**176 项通过**是 VII-G 归档中的历史验证基线，不是本轮的新验证结果。

---

## 五、接下来我们先讨论第一个决策

我建议第一轮只冻结 **H-Q01 + H-Q02 的最小部分**：

> beforeToolCall 到底放在哪一层？它应该只检查已经通过 Tool Schema 校验、即将真正执行的工具调用吗？

我的倾向是：

**Application 负责提供决策能力，ToolExecutor 在执行前落实决策，AgentRuntime 负责继续现有 Loop 和提交结果。**

并且第一版 Hook 不允许直接修改 Tool 参数，避免出现“用户审批了 A 参数，实际执行了 B 参数”的问题。

这两个边界一旦确定，我们再讨论 Hook 是返回 `allow/deny`，还是引入一个 `requestApproval` 决策，以及异常、Abort 和 ToolResult 如何协同。

这是本节的第一处真正需要形成的 Architecture Decision。后续我们按讨论结果编写 H-AD 编号，最后统一生成 Codex Implementation Task，而不是现在就动代码。

## Turn 2

### User

> Message ID: `b80d972c-6505-4e7c-80a1-c8888ee76a34`; content: `text`; channel: `None`; recipient: `all`

继续

### ChatGPT — commentary

> Message ID: `bdd6c483-d22e-48f8-b3a9-ea7818f41d42`; content: `text`; channel: `commentary`; recipient: `all`

这轮继续推进 H-Q01 / H-Q02：先核对源码里的 `AgentRuntime → ToolExecutor → Tool.execute` 具体调用位置，再比较 Hook 放在 Runtime 还是 Executor 的影响，最后收敛第一组架构决策。暂不进入实现。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `6d5b3c65-1bc5-42b0-a187-f5047f66224e`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lah /mnt/data && python - <<'PY'
import zipfile
p='/mnt/data/source-review(20261014-031653).zip'
with zipfile.ZipFile(p) as z:
 print('file count', len(z.namelist()))
 for n in z.namelist()[:120]:print(n)
PY

### Public tool output

> Message ID: `0c48b403-14aa-4dae-86d3-ff335dbfd50d`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `0bb9ff12-571e-40b2-ba12-b93b7341df18`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/vii-h-source && unzip -oq '/mnt/data/source-review(20261014-031653).zip' -d /mnt/data/vii-h-source && for f in src/runtime/agent-runtime.ts src/tools/tool-executor.ts src/tools/tool-registry.ts src/tools/tool.ts src/runtime/agent-event.ts src/messages/runtime-message.ts; do echo ==== $f; nl -ba /mnt/data/vii-h-source/$f; done

### Public tool output

> Message ID: `eb5d823c-e384-43e8-8eb7-9fdba50e8165`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `ebcb033e-f09d-4503-96c8-849832e49fa1`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc for f in src/model/tool.ts src/model/model-provider.ts src/demo/conversation-workflow.ts test/tool-runtime.test.ts test/run-control.test.ts test/agent-event.test.ts test/application-settlement.test.ts; do echo -e '\n=============== ' $f; nl -ba /mnt/data/vii-h-source/$f | head -n 310; done

### Public tool output

> Message ID: `6d2154b1-a352-4be7-af43-717e3c053771`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `f3c5a084-0994-42cd-b1bc-00f2218c4d3a`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc wc -l /mnt/data/vii-h-source/test/*test.ts; sed -n '110,255p' /mnt/data/vii-h-source/test/tool-runtime.test.ts; sed -n '1,240p' /mnt/data/vii-h-source/test/run-control.test.ts; sed -n '1,250p' /mnt/data/vii-h-source/test/agent-event.test.ts

### Public tool output

> Message ID: `b8d3da54-217f-49b3-ac18-7dd3baec8d19`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `0b0eb5d8-eae5-4b73-a1cb-3ea335ddf8f1`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc grep -n -E '(abort|active|reent|cancel|signal|tool_execution|throws|rejects)' /mnt/data/vii-h-source/test/run-control.test.ts | head -n 120; sed -n '220,445p' /mnt/data/vii-h-source/test/run-control.test.ts; cat /mnt/data/vii-h-source/tsconfig.json; cat /mnt/data/vii-h-source/package.json

### Public tool output

> Message ID: `016c9cf5-dd01-41f0-a153-b8af8ffa4a37`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `0f3f75a2-a3af-4ed9-b396-5927697c6489`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ②
## H-Q01：beforeToolCall 应该放在哪一层？

我们继续讨论第一个架构决策。

这一轮我重新核对了压缩包中的 `agent-runtime.ts`、`tool-executor.ts`、`tool-registry.ts`，以及 Tool、Abort、Event 相关测试。

先给出我的建议：

**让 Runtime 负责组织调用，让 ToolExecutor 负责执行前门禁，让 Application 提供授权决策。**

但这句话背后有几个值得理解的设计原因。

## 一、为什么不能简单在 Runtime 中加一个 Hook？

先看当前源码。

`agent-runtime.ts` 的工具执行核心是：

```ts
this.#emit({ type: "tool_execution_started", toolCall: call });

let result: ToolResult;

try {
  result = await this.#executor.execute(
    call,
    signal === undefined ? undefined : { signal },
  );
} catch (error) {
  // 处理 Tool cancellation
}
```

而真正的执行逻辑位于 `tool-executor.ts`：

```ts
const tool = this.registry.get(call.name);

// Tool not found
// Ajv schema validation
// structuredClone arguments

result = await tool.execute(args, options);
```

注意这里已有三层职责：

| 层 | 负责什么 |
|---|---|
| AgentRuntime | 决定什么时候调用 Tool、管理 Loop 和消息 |
| ToolExecutor | 检查 Tool 是否存在、参数是否合法、执行 Tool |
| Tool | 执行业务功能 |

假设我们直接在 Runtime 增加：

```ts
await beforeToolCall(call);

await executor.execute(call);
```

看似非常简单，但会出现一个问题。

### 场景：LLM 请求发放优惠券

```json
{
  "name": "issueCoupon",
  "arguments": {
    "userId": "10001",
    "amount": -500
  }
}
```

这里的 `amount` 显然可能不符合 Tool Schema。

如果 Hook 在 Runtime 层：

1. Hook 先要求用户审批。
2. 用户花时间批准。
3. Executor 才开始校验。
4. 最后发现参数非法，根本无法执行。

这个顺序不合理。

更重要的是，如果 Hook 需要拿到合法参数，Runtime 就可能被迫额外引入参数校验。

这样就破坏了 VII-C 已确认的职责边界：

**ToolExecutor 才是参数校验的所有者。**

所以我不建议在 Runtime 中独立建立另一套 Tool Validation。

---

## 二、推荐的架构：Executor 内部增加执行前门禁

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">VII-H 候选架构（未冻结）</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">提供 Hook / Approval Handler</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">Tool Loop + State + Abort</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="lg" padding={3} width="100%" gap={2}>
      <text weight="medium" textAlign="center">ToolExecutor</text>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        <text size="sm">1. Registry Lookup</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        <text size="sm">2. Ajv Schema Validation</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box border={{size:2,color:"info"}} radius="md" padding={3} gap={1} align="center">
        <text color="default" weight="medium">3. beforeToolCall</text>
        <text color="secondary" size="xs">新增的控制点</text>
        <row justify="center" gap={3}>
          <badge color="success">Allow</badge>
          <badge color="danger">Deny</badge>
        </row>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        <text size="sm">4. Tool.execute()（仅允许时）</text>
      </box>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text color="secondary" size="xs">ToolResult → RuntimeState → Agent Loop</text>
    </box>
  </box>
</box>

这样可以保证：

- 不重复实现 Ajv Validation。
- Hook 能看到已通过校验的参数。
- 审批拒绝时不调用 `Tool.execute()`。
- Runtime 继续负责 ToolResult 写入和模型下一轮调用。
- 现有消息协议与 ContextBuilder 不需要改造。

还有一个好处：

当前测试直接使用 `new ToolExecutor(registry).execute()`，并非所有工具调用都通过 AgentRuntime。

因此将门禁放在 Executor 的执行路径上，可以让其成为配置了 Hook 的 Executor 的统一检查点，而不是只在某一个 Runtime 调用入口检查。

但需要明确：它不是整个系统不可绕过的安全机制。其他未配置 Hook 的 Executor 实例、或者直接调用业务 API 的代码，仍需自身的访问控制。

---

## 三、H-Q02：Hook 的契约应该怎么设计？

我们暂时不写最终 TypeScript 接口，先分析它需要具备哪些属性。

### 3.1 Hook 接收什么？

我倾向使用一个最小的 Tool 执行上下文。

| 字段 | 用途 |
|---|---|
| `toolCall.id` | 区分同一批次中的调用 |
| `toolCall.name` | 知道正在调用什么工具 |
| `toolCall.arguments` | 展示即将执行的参数 |
| `signal` | 支持等待审批期间取消 |

至于 Tool Definition 中的描述和 Schema 是否也要提供，可以等我们讨论具体 Approval Handler 时再确定。

**关键原则：Hook 只能检查参数，不能修改真实执行参数。**

这里必须注意源码细节。

当前 Executor 已通过：

```ts
const args: unknown = structuredClone(call.arguments);
```

隔离模型历史与工具执行参数。

但是如果把 `args` 直接传给 Hook：

```text
已验证的 args
      ↓
Hook 修改 args.amount
      ↓
Tool.execute(args)
```

就可能出现审批与实际执行内容不一致的问题。

因此还需要保证 **Hook 所见参数与最终执行参数之间的引用隔离**。

不必为此引入复杂的不可变框架，现有 `structuredClone` 思路足够作为第一版设计基础。

### 3.2 Hook 要不要支持异步？

我认为必须支持。

因为 Approval 最典型的情况就是：

```text
Tool 准备执行
    ↓
等待用户确认
    ↓
用户点击批准
    ↓
继续执行
```

这个过程天然是异步的。

它和 VII-E 的 Subscriber 不冲突：

- Subscriber 保持同步、只观察。
- beforeToolCall 可以异步，并且返回控制决策。

同时，异步等待期间必须保留 VII-F 已建立的 Single Active Run 约束。

### 3.3 如果没有配置 Hook 呢？

必须保持向后兼容。

```text
无 Hook：
  Validation → Tool.execute()

有 Hook：
  Validation → Hook → Tool.execute() / Deny
```

即没有配置 Hook 时，现有 VII-C 的 Tool Error、VII-F 的 Abort、VII-E 的事件行为应保持不变。

### 3.4 Hook 抛异常是否等于 Deny？

这里先不冻结。

这是两个完全不同的概念：

- `Deny`：决策者明确拒绝执行。
- `Hook Error`：决策机制本身出现异常。

两者都不能放行工具，但是否生成 `ToolResult`、是否中断整个 Run，会影响 VII-G 的历史完整性。

我们留到 H-Q03 / H-Q04 一起讨论。

---

## 四、这次还发现一个需要保留的历史契约

当前 `tool_execution_started` 事件是在调用 Executor **之前** 发出的。

这意味着，即使 Tool 不存在或参数非法，仍可能出现：

```text
tool_execution_started
tool_execution_completed
```

这在 VII-E 测试中是已经确认的行为。

因此 VII-H 不能直接将这个事件重新定义成“Tool.execute 已经开始运行”。

它在现有实现里表达的是一次 Tool Execution Attempt（工具执行尝试）。

我们可以在 H-Q06 再讨论是否需要增加审批相关观察事件，但目前不应该随意修改现有六种 AgentEvent 的含义。

---

## 五、本轮候选 Architecture Decisions

这里先形成候选决策，等你确认后再正式冻结编号。

| ID | 候选决策 | 理由 |
|---|---|---|
| H-AD01 | beforeToolCall 门禁位于 Executor 的校验后、真实执行前 | 复用 VII-C Validation 边界 |
| H-AD02 | Application 提供授权决策，Executor 落实，Runtime 管理状态 | 避免职责混乱 |
| H-AD03 | Hook 支持异步；无 Hook 保持原行为 | 支持人工等待、向后兼容 |
| H-AD04 | Hook 不能通过参数引用修改实际执行数据 | 保证审批内容与执行内容一致 |

还没有确认的包括：Hook 具体接口、允许／拒绝返回值、异常语义、Approval 的具体形式与取消处理。

---

## 六、现在需要你理解并决定的一个问题

我们其实有两种不同的控制理念。

**A. 通用 Tool 拦截器**

所有合法工具调用都会进入 `beforeToolCall`，Hook 自己决定放行还是拒绝；以后可以在同一个 Hook 中调用人工审批函数。

**B. Approval 专用机制**

Runtime 直接识别哪些工具需要人工审批，只处理审批逻辑。

我建议选 **A**。

因为我们的目标是构建 Mini Agent Runtime，而不是一个只能做人工确认的审批模块。

通用 Hook 能够承担执行前控制责任，而 Human Approval 只是它的一种具体应用。

这也更适合之后的营销 Agent：查询活动可以直接放行，发放优惠券则可以进入人工审批，两者不必建立两套工具执行链。

{@body const [choice,setChoice] = DIL.useState("A")}
<box border radius="lg" padding={3} gap={3}>
  <text weight="medium">H-Q01 / H-Q02：选择控制模型</text>
  <radio-group direction="col" value={choice} onChange={setChoice}>
    <radio value="A">方案 A：通用 beforeToolCall Hook（推荐）</radio>
    <radio value="B">方案 B：Approval 专用机制</radio>
    <radio value="discuss">先讨论两个方案的工程差异</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(choice==="A"?"确认采用方案 A：通用 beforeToolCall Hook。继续讨论 H-Q03 Approval 决策契约，但先不要实现代码。":choice==="B"?"我倾向方案 B：Approval 专用机制。请进一步分析如何保持 VII-C 的职责边界。":"继续比较通用 Hook 与 Approval 专用机制在职责划分、扩展性及错误边界上的差异。")}>继续架构讨论 <icon name="arrow-right" inline/></button>
</box>

确认以后，我们进入 **H-Q03：Hook 到底返回 `allow / deny`，还是 `allow / deny / requireApproval`？** 这会直接决定我们有没有必要将 Policy（策略判断）与 Approval（人工决策）拆成两个抽象，也是本节第二个关键架构问题。

## Turn 3

### User

> Message ID: `15757b66-3838-4e1f-bccb-736f62e6a490`; content: `text`; channel: `None`; recipient: `all`

确认采用方案 A：通用 beforeToolCall Hook。继续讨论 H-Q03 Approval 决策契约，但先不要实现代码。

### ChatGPT — commentary

> Message ID: `133427be-7ae4-45bf-b309-41bb2e51995a`; content: `text`; channel: `commentary`; recipient: `all`

方案 A 确定：使用通用 `beforeToolCall` Hook，人工审批是它的一种应用，而不是另建一套执行链。

这一轮我会重点比较两种契约：Hook 直接返回 `allow/deny`，或返回 `allow/deny/requireApproval`。同时核对现有 ToolResult、Abort 和 Session 边界，避免新设计与 VII-C～VII-G 冲突。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `8c7b42d1-01e6-4803-a2fb-e115448e199f`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -la /mnt/data | sed -n '1,80p'; unzip -l '/mnt/data/source-review(20261014-031653).zip' | sed -n '1,100p'

### Public tool output

> Message ID: `02bb1ec4-6198-401e-a7dc-91659b1251d8`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `f289b2ee-5786-4bdb-9d7b-4ba364177758`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/_vii_h_review && unzip -qo '/mnt/data/source-review(20261014-031653).zip' -d /mnt/data/_vii_h_review && for f in src/tools/tool.ts src/tools/tool-executor.ts src/tools/tool-registry.ts src/runtime/agent-runtime.ts src/runtime/agent-event.ts src/runtime/runtime-state.ts src/messages/runtime-message.ts src/demo/conversation-workflow.ts; do echo '===========' $f; nl -ba /mnt/data/_vii_h_review/$f; done

### Public tool output

> Message ID: `b9424b6c-df79-4a43-92b5-2c7692c4aeed`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `16b4c35f-ac15-4038-ac9d-f0bcfaf721d3`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ③
## H-Q03：Approval 决策契约应该如何设计？

<badge color="success">方案 A 已确认</badge>

上一轮确定的方向是：

**采用通用 `beforeToolCall` Hook，Human Approval（人工审批）作为 Hook 的一种应用。**

这意味着我们不需要重新设计 Tool 执行链，也不应该让 Runtime 变成一个专门的审批引擎。

这一轮要解决的核心问题是：

> 当 Hook 发现一个工具调用需要人工批准时，应该返回 `requireApproval` 让 Runtime 去等待，还是 Hook 自己等待人工决定，最后只返回 `allow / deny`？

我的建议是：**第一版只保留 `allow / deny` 两种最终决策，让 Hook 自己处理异步人工审批。**

这是一个候选设计，我们先分析原因，再决定是否冻结。

## 一、先区分三个经常混淆的概念

| 概念 | 英文术语 | 职责 |
|---|---|---|
| 策略判断 | Policy Evaluation | 判断某个操作是否需要审批、是否被禁止 |
| 人工审批 | Human Approval | 请求用户进行批准或拒绝 |
| 执行授权 | Execution Authorization | 最终决定 Tool 能不能执行 |

举个未来营销 Agent 的例子。

用户对 Agent 说：

「帮我给会员 10001 发放一张 500 元优惠券。」

LLM 生成：

```json
{
  "id": "call_001",
  "name": "issueCoupon",
  "arguments": {
    "userId": "10001",
    "amount": 500
  }
}
```

这里其实存在三个独立的问题。

**第一，是否需要审批？**

根据应用策略：

- `queryCoupon`：只读查询，可以自动放行。
- `issueCoupon`：会修改业务数据，需要人工批准。
- `deleteAllCoupons`：假设业务策略禁止此操作，则直接拒绝。

**第二，如果需要审批，谁来问用户？**

这属于 Application 的职责。

可以是命令行确认、Web 弹窗，或者未来营销运营平台的审批 UI。

**第三，执行器真正关心什么？**

它不需要知道审批发生在哪里，只需要知道最终结果：

- `allow`：可以调用 `Tool.execute()`。
- `deny`：禁止调用 `Tool.execute()`。

这就是我们接下来比较两种契约的基础。

---

## 二、两种设计方案

### 方案 A1：Hook 返回三种决策

```text
beforeToolCall
      │
      ├── allow ──────────→ Tool.execute()
      │
      ├── deny ───────────→ 拒绝执行
      │
      └── requireApproval
                  ↓
            Runtime 发起审批
                  ↓
            等待 Application
                  ↓
               allow / deny
```

它的优点是策略判断和人工审批明确分离。

但问题也很明显：谁负责 `requireApproval` 之后的流程？

Runtime 就需要理解审批请求、等待审批、获取结果和处理取消。

即使只是内存中的简单审批，也相当于增加了一套新的编排机制。

对于需要跨服务、跨天等待审批的工业系统，这种设计可能合理。但我们的 VII-H 明确不实现 Durable Approval（持久化审批）。

因此，**A1 不是错误设计，只是对当前 Mini Runtime 来说抽象成本偏高。**

### 方案 A2：Hook 只返回最终 `allow / deny`

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **推荐：异步 Hook + 两种最终决策**
    <badge>候选方案</badge>
  </row>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **ToolExecutor**
      <text size="xs" color="secondary">Tool 查找 + 参数校验成功</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      **await beforeToolCall(context)**
      <text color="secondary" size="xs">Hook 内部可以直接决策，也可以等待审批</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **返回最终决定**
      <grid columns={2} gap={2}>
        <grid-item>
          <box border radius="sm" padding={2} align="center">
            <text weight="medium" color="success">allow</text>
            <icon name="arrow-down" color="tertiary"/>
            <text size="xs">Tool.execute()</text>
          </box>
        </grid-item>
        <grid-item>
          <box border radius="sm" padding={2} align="center">
            <text weight="medium" color="danger">deny</text>
            <icon name="arrow-down" color="tertiary"/>
            <text size="xs">失败 ToolResult</text>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **AgentRuntime**
      <text size="xs" color="secondary">提交 ToolResult，继续 Agent Loop</text>
    </box>
  </box>
</box>

这样设计有一个重要特点：

**Executor 不关心 Hook 如何作出决定，只负责落实最终决定。**

Hook 可以立即返回 `allow`，也可以先等待用户点击批准，再返回 `allow`。

Runtime 无须识别 `requireApproval` 这个中间状态。


### ChatGPT

> Message ID: `452f81a0-4f85-49f8-9d87-0418fcf61db3`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ③
## H-Q03：Approval 决策契约应该如何设计？

<badge color="success">方案 A 已确认</badge>

上一轮确定的方向是：

**采用通用 `beforeToolCall` Hook，Human Approval（人工审批）作为 Hook 的一种应用。**

这意味着我们不需要重新设计 Tool 执行链，也不应该让 Runtime 变成一个专门的审批引擎。

这一轮要解决的核心问题是：

> 当 Hook 发现一个工具调用需要人工批准时，应该返回 `requireApproval` 让 Runtime 去等待，还是 Hook 自己等待人工决定，最后只返回 `allow / deny`？

我的建议是：**第一版只保留 `allow / deny` 两种最终决策，让 Hook 自己处理异步人工审批。**

这是一个候选设计，我们先分析原因，再决定是否冻结。

## 一、先区分三个经常混淆的概念

| 概念 | 英文术语 | 职责 |
|---|---|---|
| 策略判断 | Policy Evaluation | 判断某个操作是否需要审批、是否被禁止 |
| 人工审批 | Human Approval | 请求用户进行批准或拒绝 |
| 执行授权 | Execution Authorization | 最终决定 Tool 能不能执行 |

举个未来营销 Agent 的例子。

用户对 Agent 说：

「帮我给会员 10001 发放一张 500 元优惠券。」

LLM 生成：

```json
{
  "id": "call_001",
  "name": "issueCoupon",
  "arguments": {
    "userId": "10001",
    "amount": 500
  }
}
```

这里其实存在三个独立的问题。

**第一，是否需要审批？**

根据应用策略：

- `queryCoupon`：只读查询，可以自动放行。
- `issueCoupon`：会修改业务数据，需要人工批准。
- `deleteAllCoupons`：假设业务策略禁止此操作，则直接拒绝。

**第二，如果需要审批，谁来问用户？**

这属于 Application 的职责。

可以是命令行确认、Web 弹窗，或者未来营销运营平台的审批 UI。

**第三，执行器真正关心什么？**

它不需要知道审批发生在哪里，只需要知道最终结果：

- `allow`：可以调用 `Tool.execute()`。
- `deny`：禁止调用 `Tool.execute()`。

这就是我们接下来比较两种契约的基础。

---

## 二、两种设计方案

### 方案 A1：Hook 返回三种决策

```text
beforeToolCall
      │
      ├── allow ──────────→ Tool.execute()
      │
      ├── deny ───────────→ 拒绝执行
      │
      └── requireApproval
                  ↓
            Runtime 发起审批
                  ↓
            等待 Application
                  ↓
               allow / deny
```

它的优点是策略判断和人工审批明确分离。

但问题也很明显：谁负责 `requireApproval` 之后的流程？

Runtime 就需要理解审批请求、等待审批、获取结果和处理取消。

即使只是内存中的简单审批，也相当于增加了一套新的编排机制。

对于需要跨服务、跨天等待审批的工业系统，这种设计可能合理。但我们的 VII-H 明确不实现 Durable Approval（持久化审批）。

因此，**A1 不是错误设计，只是对当前 Mini Runtime 来说抽象成本偏高。**

### 方案 A2：Hook 只返回最终 `allow / deny`

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **推荐：异步 Hook + 两种最终决策**
    <badge>候选方案</badge>
  </row>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **ToolExecutor**
      <text size="xs" color="secondary">Tool 查找 + 参数校验成功</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      **await beforeToolCall(context)**
      <text color="secondary" size="xs">Hook 内部可以直接决策，也可以等待审批</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **返回最终决定**
      <grid columns={2} gap={2}>
        <grid-item>
          <box border radius="sm" padding={2} align="center">
            <text weight="medium" color="success">allow</text>
            <icon name="arrow-down" color="tertiary"/>
            <text size="xs">Tool.execute()</text>
          </box>
        </grid-item>
        <grid-item>
          <box border radius="sm" padding={2} align="center">
            <text weight="medium" color="danger">deny</text>
            <icon name="arrow-down" color="tertiary"/>
            <text size="xs">失败 ToolResult</text>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **AgentRuntime**
      <text size="xs" color="secondary">提交 ToolResult，继续 Agent Loop</text>
    </box>
  </box>
</box>

这样设计有一个重要特点：

**Executor 不关心 Hook 如何作出决定，只负责落实最终决定。**

Hook 可以立即返回 `allow`，也可以先等待用户点击批准，再返回 `allow`。

Runtime 无须识别 `requireApproval` 这个中间状态。

## 三、为什么我更推荐 A2？

### 3.1 保持 Runtime 的职责简单

我们此前一直强调一个原则：

> Runtime 是执行协调器，不是每一种业务能力的实现者。

选 A2 后，职责会非常清晰。

| 组件 | 知道什么 | 不需要知道什么 |
|---|---|---|
| Application | 哪些 Tool 需要人工审批，如何获得决定 | Runtime 内部如何管理消息 |
| beforeToolCall | 当前 ToolCall 和最终允许／拒绝决定 | 模型下一轮如何生成 |
| ToolExecutor | 是否允许执行 Tool | 决策是自动产生还是人工产生 |
| AgentRuntime | ToolResult、Abort、Loop | 审批 UI 和业务审批策略 |

它也意味着将来我们使用 React、Vue 或 CLI（命令行）作为交互入口时，不需要为每种入口重新设计 Runtime。

### 3.2 允许三种业务场景，但不引入三种 Runtime 状态

| 场景 | Hook 内部行为 | 返回结果 |
|---|---|---|
| 查询优惠券 | 策略判断可直接放行 | `allow` |
| 违规的优惠券操作 | 策略直接拒绝 | `deny` |
| 发放高额优惠券 | 等待用户人工审批 | 批准返回 `allow`，拒绝返回 `deny` |

注意第三行：

**人工审批是 Hook 内部的异步过程，不是第三种最终决策。**

这和 JavaScript 中一个普通的异步函数很像：函数执行期间可以等待网络请求、数据库或用户输入，但调用方只需要关心最终返回值。

### 3.3 不阻碍以后升级工业级 Approval

未来如果要支持：

- 进程重启后继续等待审批；
- 审批请求持久化；
- 多人会签；
- 审批超时和工作流恢复；

确实可能需要将 Policy、Approval、Execution 分离，并引入审批请求标识、持久化状态及恢复协议。

但那时是产生了新的真实需求，不是因为 Mini Runtime 一开始少定义一个 `requireApproval`。

符合我们一直坚持的原则：**先实现当前确实需要的抽象。**

---

## 四、Hook 的决策契约还有四个必须明确的边界

### 4.1 `deny` 必须是明确的最终决定

建议概念上只有：

- `allow`：当前 ToolCall 获得执行许可。
- `deny`：当前 ToolCall 被明确拒绝，可附带拒绝原因。

不要使用含糊的 `true / false / undefined`，因为这容易将“没有返回值”误当成“自动放行”。

无 Hook 和 Hook 没有正常返回决定是两回事：

- 没配置 Hook：保留旧行为。
- 配置了 Hook，但它出错或返回非法结果：**不能默认放行**。

### 4.2 Approval Denied 不等于 Run Aborted

例如用户拒绝发券：

```text
LLM 请求 issueCoupon
       ↓
Hook → 用户拒绝
       ↓
不执行 issueCoupon
       ↓
生成明确的失败 ToolResult
       ↓
模型继续回答：
“优惠券发放未获批准，因此没有执行。”
```

不能因为用户拒绝一个工具，就直接把整个 Run 标记为 `aborted`。

这也说明为什么我们后续可能需要一个专用错误码，而不是复用 `TOOL_EXECUTION_FAILED`。

### 4.3 Hook 抛异常不等于人工拒绝

这是容易忽视的工程问题。

| 情况 | 本质 | 是否允许执行 |
|---|---|---|
| 用户明确 Deny | 业务决策 | 否 |
| 审批 UI 报错 | 审批机制故障 | 否 |
| Hook 自身抛异常 | 执行前控制故障 | 否 |
| Caller 触发 Abort | Run 取消 | 否 |

它们虽然都不能执行工具，但不能简单归成同一种结果。

结合真实源码，还有一个很关键的地方：

当前 `ToolExecutor` 只把 `Tool.execute()` 内部的普通异常归一化成 `TOOL_EXECUTION_FAILED`；其他异常按已有边界向上传播。

因此 Hook 出错时究竟要返回专用 ToolResult，还是传播原始错误，需要下一轮专门设计。

现在先确立 **Fail Closed（失败时不放行）** 原则，不提前决定错误转换。

### 4.4 Abort 在等待 Approval 时不能被绕过

这里有一个必须进入 VII-H 验收的场景：

```text
10:00  Hook 请求人工审批
10:01  用户尚未决定
10:02  Caller 取消 Run
10:03  用户迟到地点击 Approve
```

10:03 的批准绝不能导致 Tool 执行。

尤其要注意：**Hook Promise 成功返回 `allow`，不代表此时 Caller 仍然允许执行。**

因此真正调用 `Tool.execute()` 之前，还要确保 Run 没有被取消。

从现有代码还能看到一个需要处理的细节：

`AgentRuntime` 目前依赖带有正确 `signal` 的 `ToolExecutionCancelledError` 来识别执行阶段的取消，并为剩余 ToolCall 补齐取消结果。

如果新 Hook 只是随意抛出一个 `AbortError`，Runtime 未必能按原有逻辑识别，可能留下未配对的 ToolCall，影响 VII-G 的 Conversation Validation。

这不要求我们改写 VII-F，而是要求 VII-H 的新异步等待遵守既有取消契约。

---

## 五、H-Q03 本轮建议冻结的决策

| 决策编号 | 建议内容 | 状态 |
|---|---|---|
| H-AD05 | Hook 只输出最终 `allow / deny`，不引入 `requireApproval` 第三种决策 | 待确认 |
| H-AD06 | Hook 支持异步等待，人工审批由 Application 侧提供 | 待确认 |
| H-AD07 | Deny 仅拒绝当前 ToolCall，默认不取消整个 Run | 待确认 |
| H-AD08 | 未配置 Hook 保持旧行为；配置后异常不能自动放行 | 待确认 |

<caption>编号为本轮暂定的 Architecture Decision ID；之前的 H-AD01～04 仍保留候选状态，不把尚未确认的设计写成已完成决策。</caption>

## 六、当前推荐方向

我建议我们采用 **A2：异步 Hook + `allow / deny` 两种最终决策**。

它已经能够满足 VII-H 的最小 Human Approval 目标，并且不会向 Runtime Core 引入额外的 Approval 状态机。

还有一个值得保留的架构认识：

**LLM 负责提出工具调用，Application 负责授权策略，Executor 负责强制执行最终决定。**

LLM 不能通过生成「我已经获得批准」这样的文本来绕过 Hook。

现在只需要确认一个问题：

{@body const [choice,setChoice] = DIL.useState("a2")}
<box border radius="lg" padding={3} gap={3}>
  **H-Q03 最终决策模型**
  <radio-group direction="col" value={choice} onChange={setChoice}>
    <radio value="a2">采用 A2：异步 Hook，最终只返回 allow / deny（推荐）</radio>
    <radio value="a1">采用 A1：allow / deny / requireApproval 三种决策</radio>
    <radio value="compare">继续讨论两种方案在实际 Web 审批中的区别</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(choice==="a2"?"确认采用 A2：异步 beforeToolCall Hook 最终只返回 allow / deny。继续 H-Q04：Deny、Hook Error 和 Abort 如何与现有 ToolResult、RunOutcome、消息配对契约协同。先不实现代码。":choice==="a1"?"我倾向 A1 三种决策模型，请继续分析 requireApproval 的编排所有权和新增架构复杂度。":"请用 Vue 前端审批弹窗与 Node.js Agent Runtime 的完整交互场景，对比 A1 和 A2，不写实现代码。")}>确认并继续 <icon name="arrow-right" inline/></button>
</box>

确认后，我们进入 **H-Q04：拒绝、异常和取消的 ToolResult / RunOutcome 契约**。这是本节最容易产生隐蔽 Bug 的部分，尤其需要保护 VII-G 已完成的严格消息配对与恢复能力。

### ChatGPT

> Message ID: `c7da6d2b-d01c-457d-a707-9a0ca516353a`; content: `text`; channel: `final`; recipient: `all`

## 三、为什么我更推荐 A2？

### 3.1 保持 Runtime 的职责简单

我们此前一直强调一个原则：

> Runtime 是执行协调器，不是每一种业务能力的实现者。

选 A2 后，职责会非常清晰。

| 组件 | 知道什么 | 不需要知道什么 |
|---|---|---|
| Application | 哪些 Tool 需要人工审批，如何获得决定 | Runtime 内部如何管理消息 |
| beforeToolCall | 当前 ToolCall 和最终允许／拒绝决定 | 模型下一轮如何生成 |
| ToolExecutor | 是否允许执行 Tool | 决策是自动产生还是人工产生 |
| AgentRuntime | ToolResult、Abort、Loop | 审批 UI 和业务审批策略 |

它也意味着将来我们使用 React、Vue 或 CLI（命令行）作为交互入口时，不需要为每种入口重新设计 Runtime。

### 3.2 允许三种业务场景，但不引入三种 Runtime 状态

| 场景 | Hook 内部行为 | 返回结果 |
|---|---|---|
| 查询优惠券 | 策略判断可直接放行 | `allow` |
| 违规的优惠券操作 | 策略直接拒绝 | `deny` |
| 发放高额优惠券 | 等待用户人工审批 | 批准返回 `allow`，拒绝返回 `deny` |

注意第三行：

**人工审批是 Hook 内部的异步过程，不是第三种最终决策。**

这和 JavaScript 中一个普通的异步函数很像：函数执行期间可以等待网络请求、数据库或用户输入，但调用方只需要关心最终返回值。

### 3.3 不阻碍以后升级工业级 Approval

未来如果要支持：

- 进程重启后继续等待审批；
- 审批请求持久化；
- 多人会签；
- 审批超时和工作流恢复；

确实可能需要将 Policy、Approval、Execution 分离，并引入审批请求标识、持久化状态及恢复协议。

但那时是产生了新的真实需求，不是因为 Mini Runtime 一开始少定义一个 `requireApproval`。

符合我们一直坚持的原则：**先实现当前确实需要的抽象。**

---

## 四、Hook 的决策契约还有四个必须明确的边界

### 4.1 `deny` 必须是明确的最终决定

建议概念上只有：

- `allow`：当前 ToolCall 获得执行许可。
- `deny`：当前 ToolCall 被明确拒绝，可附带拒绝原因。

不要使用含糊的 `true / false / undefined`，因为这容易将“没有返回值”误当成“自动放行”。

无 Hook 和 Hook 没有正常返回决定是两回事：

- 没配置 Hook：保留旧行为。
- 配置了 Hook，但它出错或返回非法结果：**不能默认放行**。

### 4.2 Approval Denied 不等于 Run Aborted

例如用户拒绝发券：

```text
LLM 请求 issueCoupon
       ↓
Hook → 用户拒绝
       ↓
不执行 issueCoupon
       ↓
生成明确的失败 ToolResult
       ↓
模型继续回答：
“优惠券发放未获批准，因此没有执行。”
```

不能因为用户拒绝一个工具，就直接把整个 Run 标记为 `aborted`。

这也说明为什么我们后续可能需要一个专用错误码，而不是复用 `TOOL_EXECUTION_FAILED`。

### 4.3 Hook 抛异常不等于人工拒绝

这是容易忽视的工程问题。

| 情况 | 本质 | 是否允许执行 |
|---|---|---|
| 用户明确 Deny | 业务决策 | 否 |
| 审批 UI 报错 | 审批机制故障 | 否 |
| Hook 自身抛异常 | 执行前控制故障 | 否 |
| Caller 触发 Abort | Run 取消 | 否 |

它们虽然都不能执行工具，但不能简单归成同一种结果。

结合真实源码，还有一个很关键的地方：

当前 `ToolExecutor` 只把 `Tool.execute()` 内部的普通异常归一化成 `TOOL_EXECUTION_FAILED`；其他异常按已有边界向上传播。

因此 Hook 出错时究竟要返回专用 ToolResult，还是传播原始错误，需要下一轮专门设计。

现在先确立 **Fail Closed（失败时不放行）** 原则，不提前决定错误转换。

### 4.4 Abort 在等待 Approval 时不能被绕过

这里有一个必须进入 VII-H 验收的场景：

```text
10:00  Hook 请求人工审批
10:01  用户尚未决定
10:02  Caller 取消 Run
10:03  用户迟到地点击 Approve
```

10:03 的批准绝不能导致 Tool 执行。

尤其要注意：**Hook Promise 成功返回 `allow`，不代表此时 Caller 仍然允许执行。**

因此真正调用 `Tool.execute()` 之前，还要确保 Run 没有被取消。

从现有代码还能看到一个需要处理的细节：

`AgentRuntime` 目前依赖带有正确 `signal` 的 `ToolExecutionCancelledError` 来识别执行阶段的取消，并为剩余 ToolCall 补齐取消结果。

如果新 Hook 只是随意抛出一个 `AbortError`，Runtime 未必能按原有逻辑识别，可能留下未配对的 ToolCall，影响 VII-G 的 Conversation Validation。

这不要求我们改写 VII-F，而是要求 VII-H 的新异步等待遵守既有取消契约。

---

## 五、H-Q03 本轮建议冻结的决策

| 决策编号 | 建议内容 | 状态 |
|---|---|---|
| H-AD05 | Hook 只输出最终 `allow / deny`，不引入 `requireApproval` 第三种决策 | 待确认 |
| H-AD06 | Hook 支持异步等待，人工审批由 Application 侧提供 | 待确认 |
| H-AD07 | Deny 仅拒绝当前 ToolCall，默认不取消整个 Run | 待确认 |
| H-AD08 | 未配置 Hook 保持旧行为；配置后异常不能自动放行 | 待确认 |

<caption>编号为本轮暂定的 Architecture Decision ID；之前的 H-AD01～04 仍保留候选状态，不把尚未确认的设计写成已完成决策。</caption>

## 六、当前推荐方向

我建议我们采用 **A2：异步 Hook + `allow / deny` 两种最终决策**。

它已经能够满足 VII-H 的最小 Human Approval 目标，并且不会向 Runtime Core 引入额外的 Approval 状态机。

还有一个值得保留的架构认识：

**LLM 负责提出工具调用，Application 负责授权策略，Executor 负责强制执行最终决定。**

LLM 不能通过生成「我已经获得批准」这样的文本来绕过 Hook。

现在只需要确认一个问题：

{@body const [choice,setChoice] = DIL.useState("a2")}
<box border radius="lg" padding={3} gap={3}>
  **H-Q03 最终决策模型**
  <radio-group direction="col" value={choice} onChange={setChoice}>
    <radio value="a2">采用 A2：异步 Hook，最终只返回 allow / deny（推荐）</radio>
    <radio value="a1">采用 A1：allow / deny / requireApproval 三种决策</radio>
    <radio value="compare">继续讨论两种方案在实际 Web 审批中的区别</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(choice==="a2"?"确认采用 A2：异步 beforeToolCall Hook 最终只返回 allow / deny。继续 H-Q04：Deny、Hook Error 和 Abort 如何与现有 ToolResult、RunOutcome、消息配对契约协同。先不实现代码。":choice==="a1"?"我倾向 A1 三种决策模型，请继续分析 requireApproval 的编排所有权和新增架构复杂度。":"请用 Vue 前端审批弹窗与 Node.js Agent Runtime 的完整交互场景，对比 A1 和 A2，不写实现代码。")}>确认并继续 <icon name="arrow-right" inline/></button>
</box>

确认后，我们进入 **H-Q04：拒绝、异常和取消的 ToolResult / RunOutcome 契约**。这是本节最容易产生隐蔽 Bug 的部分，尤其需要保护 VII-G 已完成的严格消息配对与恢复能力。

## Turn 4

### User

> Message ID: `f70800ff-ab18-41e9-aeed-0754fbcca406`; content: `text`; channel: `None`; recipient: `all`

确认采用 A2：异步 beforeToolCall Hook 最终只返回 allow / deny。继续 H-Q04：Deny、Hook Error 和 Abort 如何与现有 ToolResult、RunOutcome、消息配对契约协同。先不实现代码。

### ChatGPT — commentary

> Message ID: `8a037e76-85d2-429f-b31c-28b8d5dac4ea`; content: `text`; channel: `commentary`; recipient: `all`

A2 已确认。这一轮我会对照源码里的 `ToolExecutor.execute()`、`AgentRuntime.run()`、Abort 归因，以及 VII-G 的消息校验规则，分别推演 Deny、Hook Error 和等待审批时 Abort 的结果。

重点是保证三个约束同时成立：不执行未获授权的工具、不伪造 ToolResult、不中断或破坏既有的消息配对。先讨论契约，不改代码。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `59e77654-66a4-405b-a595-fe9f86988c51`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lah /mnt/data | head -30 && unzip -l '/mnt/data/source-review(20261014-031653).zip' | head -90

### Public tool output

> Message ID: `0362cfd6-9aa9-4669-ba4d-5acccad72d2c`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `b7e05cd2-87d4-4f36-b350-809837bfcd12`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -la /mnt/data/_vii_h_review && unzip -oq '/mnt/data/source-review(20261014-031653).zip' -d /mnt/data/_vii_h_review && nl -ba /mnt/data/_vii_h_review/src/tools/tool-executor.ts && nl -ba /mnt/data/_vii_h_review/src/tools/tool.ts && nl -ba /mnt/data/_vii_h_review/src/messages/runtime-message.ts

### Public tool output

> Message ID: `0e0b48dd-6f50-4b71-8da7-02c3541063cb`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `92451905-1b06-4e4b-ae35-2bcd9a7923df`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc nl -ba /mnt/data/_vii_h_review/src/runtime/agent-runtime.ts | sed -n '1,330p'; printf '\n--- VALIDATOR ---\n'; nl -ba /mnt/data/_vii_h_review/src/messages/validate-conversation.ts | sed -n '1,255p'; printf '\n--- EVENT ---\n'; cat /mnt/data/_vii_h_review/src/runtime/agent-event.ts; printf '\n--- WORKFLOW ---\n'; cat /mnt/data/_vii_h_review/src/demo/conversation-workflow.ts

### Public tool output

> Message ID: `6e746664-787e-4146-a9df-1116cacb868b`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `9ceb71d9-a93b-4564-ba1c-96c82fd1cc7a`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc rg -n 'cancell|abort|ToolExecutionCancelledError|rejected|unknown|failed|exception|tool_execution_started|tool_execution_completed|TOOL_CALL_CANCELLED|TOOL_EXECUTION_FAILED|incomplete' /mnt/data/_vii_h_review/test/{run-control,tool-runtime,application-settlement,agent-event}.test.ts | head -170; cat /mnt/data/_vii_h_review/src/model/model-provider.ts; cat /mnt/data/_vii_h_review/src/model/tool.ts; cat /mnt/data/_vii_h_review/src/tools/tool-registry.ts

### Public tool output

> Message ID: `cda0bfde-d3fb-40aa-97ea-40ce62b09e04`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `a2f08a9c-e61d-441b-8ddd-aed39dce2eec`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ④
## H-Q04：Deny、Hook Error、Abort 的结果与状态契约

<badge color="success">A2 决策已确认</badge>

上一轮我们确认：

- 使用通用 `beforeToolCall` Hook。
- Hook 支持异步，最终只返回 `allow / deny`。
- 人工审批由 Application 提供，Executor 负责执行前门禁。
- 不引入 `requireApproval`、独立审批状态机或 Durable Approval。

这一轮重点不再是 Hook 怎么调用，而是：

**当工具最终没有被执行时，Runtime 应该留下什么事实？整个 Run 应该如何结束？**

这里直接关联你已经完成的三个 Milestone：

- **VII-C：Tool Error Contract**——工具失败如何回流模型。
- **VII-F：Abort Contract**——取消与普通错误如何区分。
- **VII-G：Conversation Recovery**——哪些消息历史可以安全保存与恢复。

## 一、先确认真实源码中的四条既有约束

我重新检查了 `source-review(20261014-031653).zip` 中的相关代码与测试。

### 约束一：Tool 失败不一定意味着 Run 失败

当前 `ToolExecutor.execute()` 对不同错误采用不同处理方式。

| 原有情况 | 当前源码行为 |
|---|---|
| Tool 不存在 | 返回 `TOOL_NOT_FOUND` |
| 参数校验失败 | 返回 `INVALID_ARGUMENTS` |
| `Tool.execute()` 普通异常 | 返回 `TOOL_EXECUTION_FAILED` |
| Tool 协作式取消 | 抛出带 Signal 归因的 `ToolExecutionCancelledError` |
| Schema 编译等执行器内部异常 | 异常向上传播 |

前三类会成为失败的 ToolResult，Runtime 将结果写入消息，然后继续 Agent Loop。

**因此，一个 ToolCall 没有成功执行，不代表整个 Agent Run 必须终止。**

这是 Deny 应该复用的基础。

### 约束二：RunOutcome 与 ToolResult 是两种不同的事实

`RunOutcome` 当前包括：

```ts
type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: ... }
  | { type: "limit_reached"; maxTurns: number }
  | { type: "aborted" };
```

它描述整个 Run 如何结束。

而 `ToolResult` 描述某个 ToolCall 的结果。

例如用户拒绝发券，但 Agent 随后成功告诉用户“操作未获批准”，最终可以是：

- ToolResult：失败，原因是审批拒绝。
- RunOutcome：`completed`。

这里没有矛盾，因为完成的是 **Agent 对话任务**，并非优惠券发放业务操作。

### 约束三：一个 ToolCall 必须拥有对应结果

VII-G 的 `validateConversation()` 要求：

- 同一批 ToolCall 中，ID 必须唯一。
- 每个 ToolCall 都必须有对应的 `tool_result`。
- 当前批次未完全配对之前，不能进入下一条模型消息或用户消息。
- 允许失败、取消、跳过等结果，只要消息结构和配对正确。

因此，**审批拒绝不应该删除模型已经生成的 ToolCall，也不能让它永远悬空。**

### 约束四：取消必须有明确归因

VII-F 的代码不是简单判断 `signal.aborted === true` 就将任何异常认定为取消。

它通过特定的 cancellation error 和原始 `AbortSignal` 确认取消来源。

这是为避免下面这种错误：

```text
Tool 本来因为网络故障失败
            +
Caller 恰好触发 Abort
            ↓
错误地把网络故障解释为工具取消
```

VII-H 新增的异步审批必须尊重这一契约。

---

## 二、首先明确 Deny 应该怎么处理

这一点我认为没有必要引入新的选择。

### 推荐：Deny 是失败的 ToolResult，不是 Runtime 异常

例如：

```text
LLM: issueCoupon(500)
        ↓
beforeToolCall
        ↓
Application: 用户拒绝
        ↓
deny
        ↓
Tool.execute() 不调用
        ↓
tool_result:
  success = false
  code = TOOL_APPROVAL_DENIED
        ↓
下一轮 Model Turn
```

这里的 `TOOL_APPROVAL_DENIED` 是候选错误码，尚未确认最终命名。

为什么建议独立错误码？

因为下面三个原因不一样：

| 错误码 | 含义 |
|---|---|
| `TOOL_EXECUTION_FAILED` | Tool 实际执行时发生异常 |
| `TOOL_EXECUTION_SKIPPED` | maxTurns 限制导致不执行 |
| `TOOL_APPROVAL_DENIED`（候选） | 执行前授权被明确拒绝 |

第三种情况下 Tool 根本没有被调用。

独立表达更利于调试，也避免模型误以为工具执行后失败。

注意：由于我们选的是通用 Hook，不仅人工拒绝，策略自动拒绝也会产生 Deny。因此最终命名可能使用更宽泛的 `TOOL_EXECUTION_DENIED`，而不专门绑定 Human Approval。

**我更倾向 `TOOL_EXECUTION_DENIED`。**

这保持了通用 Hook 的语义，不要求 Executor 知道是谁拒绝了调用。


### ChatGPT

> Message ID: `40e395aa-7546-4144-a63a-5adf88fdde1d`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ④
## H-Q04：Deny、Hook Error、Abort 的结果与状态契约

<badge color="success">A2 决策已确认</badge>

上一轮我们确认：

- 使用通用 `beforeToolCall` Hook。
- Hook 支持异步，最终只返回 `allow / deny`。
- 人工审批由 Application 提供，Executor 负责执行前门禁。
- 不引入 `requireApproval`、独立审批状态机或 Durable Approval。

这一轮重点不再是 Hook 怎么调用，而是：

**当工具最终没有被执行时，Runtime 应该留下什么事实？整个 Run 应该如何结束？**

这里直接关联你已经完成的三个 Milestone：

- **VII-C：Tool Error Contract**——工具失败如何回流模型。
- **VII-F：Abort Contract**——取消与普通错误如何区分。
- **VII-G：Conversation Recovery**——哪些消息历史可以安全保存与恢复。

## 一、先确认真实源码中的四条既有约束

我重新检查了 `source-review(20261014-031653).zip` 中的相关代码与测试。

### 约束一：Tool 失败不一定意味着 Run 失败

当前 `ToolExecutor.execute()` 对不同错误采用不同处理方式。

| 原有情况 | 当前源码行为 |
|---|---|
| Tool 不存在 | 返回 `TOOL_NOT_FOUND` |
| 参数校验失败 | 返回 `INVALID_ARGUMENTS` |
| `Tool.execute()` 普通异常 | 返回 `TOOL_EXECUTION_FAILED` |
| Tool 协作式取消 | 抛出带 Signal 归因的 `ToolExecutionCancelledError` |
| Schema 编译等执行器内部异常 | 异常向上传播 |

前三类会成为失败的 ToolResult，Runtime 将结果写入消息，然后继续 Agent Loop。

**因此，一个 ToolCall 没有成功执行，不代表整个 Agent Run 必须终止。**

这是 Deny 应该复用的基础。

### 约束二：RunOutcome 与 ToolResult 是两种不同的事实

`RunOutcome` 当前包括：

```ts
type RunOutcome =
  | { type: "completed" }
  | { type: "unsupported"; finishReason: ... }
  | { type: "limit_reached"; maxTurns: number }
  | { type: "aborted" };
```

它描述整个 Run 如何结束。

而 `ToolResult` 描述某个 ToolCall 的结果。

例如用户拒绝发券，但 Agent 随后成功告诉用户“操作未获批准”，最终可以是：

- ToolResult：失败，原因是审批拒绝。
- RunOutcome：`completed`。

这里没有矛盾，因为完成的是 **Agent 对话任务**，并非优惠券发放业务操作。

### 约束三：一个 ToolCall 必须拥有对应结果

VII-G 的 `validateConversation()` 要求：

- 同一批 ToolCall 中，ID 必须唯一。
- 每个 ToolCall 都必须有对应的 `tool_result`。
- 当前批次未完全配对之前，不能进入下一条模型消息或用户消息。
- 允许失败、取消、跳过等结果，只要消息结构和配对正确。

因此，**审批拒绝不应该删除模型已经生成的 ToolCall，也不能让它永远悬空。**

### 约束四：取消必须有明确归因

VII-F 的代码不是简单判断 `signal.aborted === true` 就将任何异常认定为取消。

它通过特定的 cancellation error 和原始 `AbortSignal` 确认取消来源。

这是为避免下面这种错误：

```text
Tool 本来因为网络故障失败
            +
Caller 恰好触发 Abort
            ↓
错误地把网络故障解释为工具取消
```

VII-H 新增的异步审批必须尊重这一契约。

---

## 二、首先明确 Deny 应该怎么处理

这一点我认为没有必要引入新的选择。

### 推荐：Deny 是失败的 ToolResult，不是 Runtime 异常

例如：

```text
LLM: issueCoupon(500)
        ↓
beforeToolCall
        ↓
Application: 用户拒绝
        ↓
deny
        ↓
Tool.execute() 不调用
        ↓
tool_result:
  success = false
  code = TOOL_APPROVAL_DENIED
        ↓
下一轮 Model Turn
```

这里的 `TOOL_APPROVAL_DENIED` 是候选错误码，尚未确认最终命名。

为什么建议独立错误码？

因为下面三个原因不一样：

| 错误码 | 含义 |
|---|---|
| `TOOL_EXECUTION_FAILED` | Tool 实际执行时发生异常 |
| `TOOL_EXECUTION_SKIPPED` | maxTurns 限制导致不执行 |
| `TOOL_APPROVAL_DENIED`（候选） | 执行前授权被明确拒绝 |

第三种情况下 Tool 根本没有被调用。

独立表达更利于调试，也避免模型误以为工具执行后失败。

注意：由于我们选的是通用 Hook，不仅人工拒绝，策略自动拒绝也会产生 Deny。因此最终命名可能使用更宽泛的 `TOOL_EXECUTION_DENIED`，而不专门绑定 Human Approval。

**我更倾向 `TOOL_EXECUTION_DENIED`。**

这保持了通用 Hook 的语义，不要求 Executor 知道是谁拒绝了调用。

## 三、关键分歧：Hook Error 应该怎么处理？

这是本轮真正需要讨论和确认的设计问题。

假设用户正在等待审批，但审批服务突然异常：

```text
LLM → issueCoupon()
          ↓
beforeToolCall()
          ↓
Application.requestApproval()
          ↓
审批服务连接失败
          ↓
throw Error("Approval service unavailable")
```

虽然审批没有完成，但我们至少知道一件事：

**工具没有获得执行许可，也没有真正执行。**

问题是：Runtime 应该把它当作一次工具失败，还是让整个 Run 抛出异常？

### 方案 A：转成专用失败 ToolResult

<box border radius="lg" padding={3} gap={2}>
  <row justify="between" align="center">
    **方案 A：错误回流模型**
    <badge>我更倾向</badge>
  </row>
  ```text
  Hook throw
      ↓
  Executor 捕获
      ↓
  TOOL_PRE_EXECUTION_FAILED
      ↓
  ToolResult(success: false)
      ↓
  Runtime 提交消息
      ↓
  Agent Loop 继续
  ```

  <text color="secondary" size="sm">`TOOL_PRE_EXECUTION_FAILED` 只是候选命名，表示执行前控制环节失败。</text>
</box>

优点：

- 严格 Fail Closed（失败时禁止执行）。
- 本次 ToolCall 可以获得真实的失败结果。
- 保持 VII-G 所要求的完整配对。
- 模型能解释「操作未执行，因为审批服务不可用」。
- 可以复用已有的 Tool Result → Model 机制。

代价是：Hook 抛出的原始 Error 会被转换成 ToolError，无法直接通过 Run reject 保留对象身份。

因此需要考虑哪些错误信息能够暴露给模型，哪些只能留在应用侧的诊断信息中。

这和 VII-C 把 Tool 执行异常转成 `TOOL_EXECUTION_FAILED` 的思想相近，但属于新增的**执行前控制失败边界**，不是修改原有 Tool 异常契约。

### 方案 B：Hook Error 原样向上传播

```text
Hook throw
      ↓
Executor 不捕获
      ↓
AgentRuntime.run() reject
      ↓
原始 Error 向上返回
```

优点是保留异常对象身份，程序错误不会被包装成普通 Tool Failure。

但结合当前源码，会产生一个明确后果：

Runtime 已经提交包含 ToolCall 的 `model_output`，此时 Hook 抛错，当前调用尚未产生 `tool_result`。

那么 VII-G 的 Application Workflow 会出现：

| 维度 | 结果 |
|---|---|
| Run Settlement | `rejected`，保留原始 Hook Error |
| Conversation Validation | 失败，存在未配对 ToolCall |
| Persistence Settlement | `rejected`，不保存非法历史 |
| `reusable` | `false` |

这不是 VII-G 校验器的 Bug。它是在正确拒绝无法恢复的历史。

而且当前 VII-G 已经允许部分其他 Runtime 内部异常产生这样的边界。

**但对于一个可能调用远程审批服务的 Hook，服务暂时不可用就让整段 Runtime 无法直接复用，代价比较高。**

### 我的推荐

建议普通 Hook Error 采用方案 A，与明确 Deny 分开：

| 情况 | 候选结果码 | Tool 执行 |
|---|---|---|
| Hook 明确返回 deny | `TOOL_EXECUTION_DENIED` | 否 |
| Hook 异常或返回非法决策 | `TOOL_PRE_EXECUTION_FAILED` | 否 |
| Hook 返回 allow | 正常 ToolResult | 是 |
| Caller 明确 Abort | `TOOL_CALL_CANCELLED` | 否（尚未启动时） |

这里需要强调：**Hook 返回非法决策绝不能被解释成 allow。** 例如返回 `undefined`、未知决策值，都应该按执行前控制失败处理。

这样能够同时保留三个不同事实：

- Denied：有人明确拒绝。
- Failed：授权决策机制出问题了。
- Cancelled：Caller 已经取消当前 Run。

---

## 四、Abort 与 Approval：需要区分三个取消时间点

Abort 比 Hook Error 更复杂，因为它与异步执行存在竞争条件（Race Condition）。

### 场景一：等待人工批准时 Abort

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">审批等待中的取消</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **beforeToolCall → 等待批准**
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      <row align="center" justify="center" gap={2}>
        <icon name="ban" color="danger"/>
        **Caller.abort()**
      </row>
      <text size="xs" color="secondary">中断等待，不进入 Tool.execute()</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **当前及剩余 ToolCall 补齐取消结果**
      <text size="xs" color="secondary">TOOL_CALL_CANCELLED</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **RunOutcome = aborted**
    </box>
  </box>
</box>

我建议复用 VII-F 已有的 `#appendCancelledToolCalls()`，而不是为 Approval 再发明一种消息结构。

但这里存在一个容易漏掉的问题：

当前 ToolExecutor 只有在工具协作式抛出对应 Signal 的取消原因时，才会生成 `ToolExecutionCancelledError`。

而 Approval Hook 可能是一个长时间未完成的 Promise。

即使向 Hook 传递 Signal，也不能假定 Hook 一定会响应取消。

所以 VII-H 需要让执行前等待具备 Abort 感知能力，保证即使审批 Handler 没有及时结束，Executor 仍能停止等待并阻止后续工具执行。

这不代表底层正在进行的远程审批请求一定被物理取消；只是当前 Run 不再接受其迟到的结果。

### 场景二：Hook 刚刚 Allow，Caller 恰好 Abort

```text
Hook 返回 allow
       ↓
Caller.abort()
       ↓
准备调用 Tool.execute()
```

这里需要在**真正调用 Tool.execute() 前再检查 Signal**。

只在 Hook 开始前检查一次是不够的。

否则会出现：

```text
审批时 Run 仍有效
      ↓
审批结束，但 Run 已取消
      ↓
错误地继续执行发券
```

因此建议：

> Authorization 允许执行只是必要条件。真正开始执行时，还必须满足当前 Run 没有被取消。

如果 Abort 已先被观察到，当前 ToolCall 应按取消处理。

### 场景三：Tool 已经开始执行，然后 Abort

例如：

```text
allow
  ↓
Tool.execute(issueCoupon)
  ↓
已经调用发券 API
  ↓
Caller.abort()
```

这里不能承诺发券一定失败，也不能承诺副作用可以回滚。

VII-F 已经处理了这个边界：

- Tool 协作式取消且有正确归因，按照取消结果处理。
- Tool 实际成功返回，即使随后 Abort，已经提交的成功结果仍然保留。
- Tool 发生无关的普通异常，不因为恰好 Abort 就把错误伪装成取消。

VII-H 应当继承这些规则，不需要重新设计执行中 Tool 的取消机制。

---

## 五、最后将三种情况放到同一张结果矩阵中

这是后续 Codex 实现和测试最有价值的验收依据。

| 场景 | ToolResult | Run 结果 | 能否合法保存历史 |
|---|---|---|---|
| Hook allow，Tool 成功 | success | 后续决定 | 可以 |
| Hook deny | denied 失败结果 | 继续 Loop | 可以 |
| Hook 普通 Error（方案 A） | pre-execution failed | 继续 Loop | 可以 |
| Hook 返回非法决策（方案 A） | pre-execution failed | 继续 Loop | 可以 |
| 等待 Approval 时 Abort | cancelled | aborted | 可以 |
| Allow 后、Tool 启动前 Abort | cancelled | aborted | 可以 |
| Tool 已成功执行后 Abort | 保留 success；剩余调用 cancelled | aborted | 可以 |
| Hook Error 原样传播（方案 B） | 当前调用可能无 Result | Run reject | 不完整历史拒绝保存 |
| maxTurns 已达到上限 | skipped | limit_reached | 可以 |

<caption>表中的「可以」表示满足 VII-G 消息配对要求、具备保存资格，不代表 SQLite 写入必然成功。Run 的最终 completed / limit_reached 取决于后续模型响应。Hook Error 两个候选方案尚未冻结。</caption>

还有两个与原有架构有关的细节。

**第一，AgentEvent 不需要立即增加新事件。** 目前 `tool_execution_started` 表达的是执行尝试，在进入 Executor 前触发。Deny 或 Hook Error 产生正式 ToolResult 后，依旧可以按既有规则发布 `tool_execution_completed`；Abort 产生的补齐结果则保持 VII-F 原有的事件行为。

**第二，Approval 等待状态不进入 SessionStore。** 当前 Run 尚未 settle，Application 不会执行 Run Boundary Save。完成审批后产生的 ToolResult 可以保存；进程关闭时未结束的等待不能依靠 VII-G 恢复。这是本节明确接受的限制。

---

## 六、本轮 Architecture Decision 候选

结合之前的 A2，这一轮准备增加如下决策：

| ID | 决策内容 | 当前判断 |
|---|---|---|
| H-AD09 | Deny 生成 `TOOL_EXECUTION_DENIED`，不调用 Tool，不终止 Run | 推荐 |
| H-AD10 | 普通 Hook Error 转为独立失败 ToolResult，而非原样抛出 | **需要确认** |
| H-AD11 | Abort 等待 Approval 时，沿用 VII-F cancelled pairing 与 aborted outcome | 推荐 |
| H-AD12 | Hook allow 后、Tool.execute 前必须再次检查 Abort | 推荐 |
| H-AD13 | 保留已提交结果，禁止迟到 Approval 再触发执行 | 推荐 |
| H-AD14 | 不增加 Approval 持久化消息或改变 SessionStore | 推荐 |

## 七、现在只剩一个需要你决定的问题

**你更希望 Hook 自身发生技术异常时，Runtime 怎么表现？**

我建议 **方案 A：将普通 Hook Error 转为专用失败 ToolResult，让 Agent 可以解释失败并继续对话**。它更符合我们此次实现简单 Approval 的目的，同时避免常见审批故障造成不可复用的半批工具历史。

方案 B 也合理，但更强调程序异常的原样传播；代价是需要接受对应 Runtime 历史可能无法继续复用。

你可以直接回复「确认方案 A」或「选择方案 B」。

确认后，下一轮我们讨论 **H-Q05：Abort × Approval 的具体等待与竞态契约**，重点确定谁负责中断等待、迟到的 Approve 如何失效，以及如何不破坏 VII-F 已确认的取消归因。仍然只做架构分析，不进入 Codex 实现。

### ChatGPT

> Message ID: `1cffce17-3e61-4e90-b083-036a5d74a41d`; content: `text`; channel: `final`; recipient: `all`

## 三、关键分歧：Hook Error 应该怎么处理？

这是本轮真正需要讨论和确认的设计问题。

假设用户正在等待审批，但审批服务突然异常：

```text
LLM → issueCoupon()
          ↓
beforeToolCall()
          ↓
Application.requestApproval()
          ↓
审批服务连接失败
          ↓
throw Error("Approval service unavailable")
```

虽然审批没有完成，但我们至少知道一件事：

**工具没有获得执行许可，也没有真正执行。**

问题是：Runtime 应该把它当作一次工具失败，还是让整个 Run 抛出异常？

### 方案 A：转成专用失败 ToolResult

<box border radius="lg" padding={3} gap={2}>
  <row justify="between" align="center">
    **方案 A：错误回流模型**
    <badge>我更倾向</badge>
  </row>
  ```text
  Hook throw
      ↓
  Executor 捕获
      ↓
  TOOL_PRE_EXECUTION_FAILED
      ↓
  ToolResult(success: false)
      ↓
  Runtime 提交消息
      ↓
  Agent Loop 继续
  ```

  <text color="secondary" size="sm">`TOOL_PRE_EXECUTION_FAILED` 只是候选命名，表示执行前控制环节失败。</text>
</box>

优点：

- 严格 Fail Closed（失败时禁止执行）。
- 本次 ToolCall 可以获得真实的失败结果。
- 保持 VII-G 所要求的完整配对。
- 模型能解释「操作未执行，因为审批服务不可用」。
- 可以复用已有的 Tool Result → Model 机制。

代价是：Hook 抛出的原始 Error 会被转换成 ToolError，无法直接通过 Run reject 保留对象身份。

因此需要考虑哪些错误信息能够暴露给模型，哪些只能留在应用侧的诊断信息中。

这和 VII-C 把 Tool 执行异常转成 `TOOL_EXECUTION_FAILED` 的思想相近，但属于新增的**执行前控制失败边界**，不是修改原有 Tool 异常契约。

### 方案 B：Hook Error 原样向上传播

```text
Hook throw
      ↓
Executor 不捕获
      ↓
AgentRuntime.run() reject
      ↓
原始 Error 向上返回
```

优点是保留异常对象身份，程序错误不会被包装成普通 Tool Failure。

但结合当前源码，会产生一个明确后果：

Runtime 已经提交包含 ToolCall 的 `model_output`，此时 Hook 抛错，当前调用尚未产生 `tool_result`。

那么 VII-G 的 Application Workflow 会出现：

| 维度 | 结果 |
|---|---|
| Run Settlement | `rejected`，保留原始 Hook Error |
| Conversation Validation | 失败，存在未配对 ToolCall |
| Persistence Settlement | `rejected`，不保存非法历史 |
| `reusable` | `false` |

这不是 VII-G 校验器的 Bug。它是在正确拒绝无法恢复的历史。

而且当前 VII-G 已经允许部分其他 Runtime 内部异常产生这样的边界。

**但对于一个可能调用远程审批服务的 Hook，服务暂时不可用就让整段 Runtime 无法直接复用，代价比较高。**

### 我的推荐

建议普通 Hook Error 采用方案 A，与明确 Deny 分开：

| 情况 | 候选结果码 | Tool 执行 |
|---|---|---|
| Hook 明确返回 deny | `TOOL_EXECUTION_DENIED` | 否 |
| Hook 异常或返回非法决策 | `TOOL_PRE_EXECUTION_FAILED` | 否 |
| Hook 返回 allow | 正常 ToolResult | 是 |
| Caller 明确 Abort | `TOOL_CALL_CANCELLED` | 否（尚未启动时） |

这里需要强调：**Hook 返回非法决策绝不能被解释成 allow。** 例如返回 `undefined`、未知决策值，都应该按执行前控制失败处理。

这样能够同时保留三个不同事实：

- Denied：有人明确拒绝。
- Failed：授权决策机制出问题了。
- Cancelled：Caller 已经取消当前 Run。

---

## 四、Abort 与 Approval：需要区分三个取消时间点

Abort 比 Hook Error 更复杂，因为它与异步执行存在竞争条件（Race Condition）。

### 场景一：等待人工批准时 Abort

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">审批等待中的取消</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **beforeToolCall → 等待批准**
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      <row align="center" justify="center" gap={2}>
        <icon name="ban" color="danger"/>
        **Caller.abort()**
      </row>
      <text size="xs" color="secondary">中断等待，不进入 Tool.execute()</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **当前及剩余 ToolCall 补齐取消结果**
      <text size="xs" color="secondary">TOOL_CALL_CANCELLED</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **RunOutcome = aborted**
    </box>
  </box>
</box>

我建议复用 VII-F 已有的 `#appendCancelledToolCalls()`，而不是为 Approval 再发明一种消息结构。

但这里存在一个容易漏掉的问题：

当前 ToolExecutor 只有在工具协作式抛出对应 Signal 的取消原因时，才会生成 `ToolExecutionCancelledError`。

而 Approval Hook 可能是一个长时间未完成的 Promise。

即使向 Hook 传递 Signal，也不能假定 Hook 一定会响应取消。

所以 VII-H 需要让执行前等待具备 Abort 感知能力，保证即使审批 Handler 没有及时结束，Executor 仍能停止等待并阻止后续工具执行。

这不代表底层正在进行的远程审批请求一定被物理取消；只是当前 Run 不再接受其迟到的结果。

### 场景二：Hook 刚刚 Allow，Caller 恰好 Abort

```text
Hook 返回 allow
       ↓
Caller.abort()
       ↓
准备调用 Tool.execute()
```

这里需要在**真正调用 Tool.execute() 前再检查 Signal**。

只在 Hook 开始前检查一次是不够的。

否则会出现：

```text
审批时 Run 仍有效
      ↓
审批结束，但 Run 已取消
      ↓
错误地继续执行发券
```

因此建议：

> Authorization 允许执行只是必要条件。真正开始执行时，还必须满足当前 Run 没有被取消。

如果 Abort 已先被观察到，当前 ToolCall 应按取消处理。

### 场景三：Tool 已经开始执行，然后 Abort

例如：

```text
allow
  ↓
Tool.execute(issueCoupon)
  ↓
已经调用发券 API
  ↓
Caller.abort()
```

这里不能承诺发券一定失败，也不能承诺副作用可以回滚。

VII-F 已经处理了这个边界：

- Tool 协作式取消且有正确归因，按照取消结果处理。
- Tool 实际成功返回，即使随后 Abort，已经提交的成功结果仍然保留。
- Tool 发生无关的普通异常，不因为恰好 Abort 就把错误伪装成取消。

VII-H 应当继承这些规则，不需要重新设计执行中 Tool 的取消机制。

---

## 五、最后将三种情况放到同一张结果矩阵中

这是后续 Codex 实现和测试最有价值的验收依据。

| 场景 | ToolResult | Run 结果 | 能否合法保存历史 |
|---|---|---|---|
| Hook allow，Tool 成功 | success | 后续决定 | 可以 |
| Hook deny | denied 失败结果 | 继续 Loop | 可以 |
| Hook 普通 Error（方案 A） | pre-execution failed | 继续 Loop | 可以 |
| Hook 返回非法决策（方案 A） | pre-execution failed | 继续 Loop | 可以 |
| 等待 Approval 时 Abort | cancelled | aborted | 可以 |
| Allow 后、Tool 启动前 Abort | cancelled | aborted | 可以 |
| Tool 已成功执行后 Abort | 保留 success；剩余调用 cancelled | aborted | 可以 |
| Hook Error 原样传播（方案 B） | 当前调用可能无 Result | Run reject | 不完整历史拒绝保存 |
| maxTurns 已达到上限 | skipped | limit_reached | 可以 |

<caption>表中的「可以」表示满足 VII-G 消息配对要求、具备保存资格，不代表 SQLite 写入必然成功。Run 的最终 completed / limit_reached 取决于后续模型响应。Hook Error 两个候选方案尚未冻结。</caption>

还有两个与原有架构有关的细节。

**第一，AgentEvent 不需要立即增加新事件。** 目前 `tool_execution_started` 表达的是执行尝试，在进入 Executor 前触发。Deny 或 Hook Error 产生正式 ToolResult 后，依旧可以按既有规则发布 `tool_execution_completed`；Abort 产生的补齐结果则保持 VII-F 原有的事件行为。

**第二，Approval 等待状态不进入 SessionStore。** 当前 Run 尚未 settle，Application 不会执行 Run Boundary Save。完成审批后产生的 ToolResult 可以保存；进程关闭时未结束的等待不能依靠 VII-G 恢复。这是本节明确接受的限制。

---

## 六、本轮 Architecture Decision 候选

结合之前的 A2，这一轮准备增加如下决策：

| ID | 决策内容 | 当前判断 |
|---|---|---|
| H-AD09 | Deny 生成 `TOOL_EXECUTION_DENIED`，不调用 Tool，不终止 Run | 推荐 |
| H-AD10 | 普通 Hook Error 转为独立失败 ToolResult，而非原样抛出 | **需要确认** |
| H-AD11 | Abort 等待 Approval 时，沿用 VII-F cancelled pairing 与 aborted outcome | 推荐 |
| H-AD12 | Hook allow 后、Tool.execute 前必须再次检查 Abort | 推荐 |
| H-AD13 | 保留已提交结果，禁止迟到 Approval 再触发执行 | 推荐 |
| H-AD14 | 不增加 Approval 持久化消息或改变 SessionStore | 推荐 |

## 七、现在只剩一个需要你决定的问题

**你更希望 Hook 自身发生技术异常时，Runtime 怎么表现？**

我建议 **方案 A：将普通 Hook Error 转为专用失败 ToolResult，让 Agent 可以解释失败并继续对话**。它更符合我们此次实现简单 Approval 的目的，同时避免常见审批故障造成不可复用的半批工具历史。

方案 B 也合理，但更强调程序异常的原样传播；代价是需要接受对应 Runtime 历史可能无法继续复用。

你可以直接回复「确认方案 A」或「选择方案 B」。

确认后，下一轮我们讨论 **H-Q05：Abort × Approval 的具体等待与竞态契约**，重点确定谁负责中断等待、迟到的 Approve 如何失效，以及如何不破坏 VII-F 已确认的取消归因。仍然只做架构分析，不进入 Codex 实现。

## Turn 5

### User

> Message ID: `6fe6ae3e-8a35-465d-b26a-693269816c30`; content: `text`; channel: `None`; recipient: `all`

确认方案 A

### ChatGPT — commentary

> Message ID: `c7552cc8-ec5d-4285-9d5f-230a293414b6`; content: `text`; channel: `commentary`; recipient: `all`

已确认方案 A：普通 Hook 异常会转成独立的失败 ToolResult，不默认放行，也不直接让整个 Run 失败。

接下来进入 H-Q05。我会重点核对当前 Abort 的错误归因和 ToolCall 配对机制，讨论审批等待被取消、批准与取消同时发生，以及迟到的批准如何失效。这轮仍不写代码。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `7d6882ac-cc50-4e0e-8607-d60c3833c94d`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lah /mnt/data | sed -n '1,90p'; unzip -l '/mnt/data/source-review(20261014-031653).zip' | head -100

### Public tool output

> Message ID: `e4344332-7202-4b06-8b7e-3257a9210fcd`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `5091d465-b0f6-4208-bd86-227db70e2aaf`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc find /mnt/data/_vii_h_review -maxdepth 2 -type f | head -25; unzip -p '/mnt/data/source-review(20261014-031653).zip' 'src/runtime/agent-runtime.ts' | nl -ba | sed -n '1,300p'; echo '=== EXECUTOR ==='; unzip -p '/mnt/data/source-review(20261014-031653).zip' 'src/tools/tool-executor.ts' | nl -ba; echo '=== TOOL ==='; unzip -p '/mnt/data/source-review(20261014-031653).zip' 'src/tools/tool.ts' | nl -ba; echo '=== EVENT ==='; unzip -p '/mnt/data/source-review(20261014-031653).zip' 'src/runtime/agent-event.ts' | nl -ba

### Public tool output

> Message ID: `f02bbfbb-5c8e-4636-a540-d779697d9115`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `f01e5030-ead1-497b-a98e-8b0657a53e47`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc sed -n '1,290p' /mnt/data/_vii_h_review/test/run-control.test.ts | cat; echo '=== RELEVANT ABORT TEST MATCHES ==='; rg -n 'cancel|aborted|abort|tool_execution|reason|delay|late' /mnt/data/_vii_h_review/test/run-control.test.ts | tail -100; echo '=== MESSAGES ==='; cat /mnt/data/_vii_h_review/src/messages/runtime-message.ts; echo '=== WORKFLOW ==='; cat /mnt/data/_vii_h_review/src/demo/conversation-workflow.ts

### Public tool output

> Message ID: `22b2fea8-7107-4ad2-bcc4-d9159ca13719`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `d431fa06-b06c-4fe5-8189-3308b1aedd40`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc sed -n '289,465p' /mnt/data/_vii_h_review/test/run-control.test.ts; echo '---'; cat /mnt/data/_vii_h_review/src/model/tool.ts; sed -n '1,90p' /mnt/data/_vii_h_review/README.md 2>/dev/null || true

### Public tool output

> Message ID: `cf35caad-400d-4953-b755-5ae0700c5a94`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `b2b18ada-e9f1-4d4d-8f61-4175a5587044`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ⑤
## H-Q05：Abort × Approval 的取消与竞态契约

<badge color="success">H-Q04 · 方案 A 已确认</badge>

先把上一轮的决定记录下来：

**普通 Hook Error 转换为独立的失败 ToolResult，Agent Loop 可以继续，不直接让整个 Run reject。**

同时保留三种不同语义：

| 情况 | 错误表达 | 整个 Run |
|---|---|---|
| 明确拒绝 | `TOOL_EXECUTION_DENIED`（候选） | 继续 |
| Hook 异常 | `TOOL_PRE_EXECUTION_FAILED`（候选） | 继续 |
| Caller Abort | 现有 `TOOL_CALL_CANCELLED` | `aborted` |

前两者是执行前控制结果，第三者是整个 Run 的取消，不应混为一谈。

接下来我们要解决一个更深层的问题：

> **如果人工审批一直没有返回，Caller 取消 Run，谁负责让 Runtime 真正结束等待？**

这涉及 VII-F 的 Single Active Run、Abort 归因，以及 VII-G 的 Conversation Recovery。

## 一、现有 VII-F 能做到什么？

根据当前 `agent-runtime.ts` 和 `tool-executor.ts`：

1. `AgentRuntime.run()` 使用 `#active` 保证单实例只有一个执行中的 Run。
2. `AbortSignal` 从 Caller 传给 Provider、Executor，再传给 Tool。
3. Executor 只有识别到与当前 Signal 匹配的取消原因，才抛出 `ToolExecutionCancelledError`。
4. Runtime 捕获这一特定错误后，为当前和剩余 ToolCall 补齐取消结果。
5. Run 通过 `finally` 释放执行权。

这些能力已经验证过，不需要重新设计。

但 VII-H 会引入一个此前不存在的环节：

**在 Tool 真正开始执行之前，Runtime 可能因为人工审批而长时间等待。**

## 二、两个候选取消方案

### 方案 A：完全依赖 Hook 自己响应 Abort

```text
Runtime
   ↓
Executor
   ↓
await beforeToolCall({ signal })
   ↓
Application 自己监听 signal
```

这种方式最简单。

但是假设 Approval Handler 忘记处理 Abort：

```text
Hook Promise 一直 pending
          ↓
Caller.abort()
          ↓
Promise 仍然 pending
          ↓
Runtime.run() 不结束
          ↓
#active 一直为 true
```

后果是 Runtime 无法及时释放执行权。

换句话说，**仅仅把 Signal 传给 Hook，不等于 Runtime 真正支持取消。**

### 方案 B：Executor 保证等待可中断，Hook 仍接收 Signal

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    **推荐：双层取消协作**
    <badge>候选方案</badge>
  </row>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **Executor 等待 Hook 决策**
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" gap={2}>
      <text weight="medium" textAlign="center">两个竞争的结果</text>
      <grid columns={2} gap={2}>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
            <icon name="check-circle" color="success"/>
            **Hook 先完成**
            <text size="xs" color="secondary">得到 allow / deny</text>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
            <icon name="ban" color="danger"/>
            **Abort 先触发**
            <text size="xs" color="secondary">终止当前等待</text>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center">
      **Executor 只接受有效的最终结果**
    </box>
  </box>
</box>

方案 B 的关键在于：

- Hook 接收原始 Signal，可以主动取消自己的异步任务。
- Executor 自身对 Abort 保持响应，即使 Hook 永远不返回，也可以结束当前等待。
- Executor 不再等待或接受已失效的审批决定。
- Runtime 沿用 VII-F 的取消错误和 ToolCall 配对逻辑。

需要明确：这只能保证 **Runtime 不再等待、不会因迟到批准而执行 Tool**，不能保证远程审批请求一定从服务器撤销。

我更推荐方案 B。

---

## 三、关键问题：Abort 与 Allow 同时出现怎么办？

假设未来营销 Agent 调用发券工具。

<box border radius="lg" padding={3} gap={2}>
  **场景：迟到的审批决定**

  | 时刻 | 事件 |
  |---|---|
  | T1 | LLM 请求调用 `issueCoupon` |
  | T2 | Hook 发起人工审批，等待用户决定 |
  | T3 | Caller 触发 Abort |
  | T4 | Runtime 结束审批等待，提交 cancelled Result |
  | T5 | 人工审批界面迟到地返回 allow |

  <text weight="medium">T5 的 allow 必须失效，不能再次调用 issueCoupon。</text>
</box>

如何保证？

我建议建立三个不变量（Invariant，任何路径都必须满足的约束）。

### 不变量 1：Allow 不代表永久授权

Hook 的 `allow` 只表示当前这次 ToolCall 通过了授权检查。

它不是可以留到下次 Run 复用的许可证。

### 不变量 2：Tool.execute 前再次检查 Abort

即使 Hook 返回 allow，也必须在真正执行 Tool 前确认 Signal 尚未取消。

执行前的顺序应当是：

```text
Validation
    ↓
beforeToolCall
    ↓
allow
    ↓
检查 Signal
    ↓
Tool.execute()
```

如果此时 Signal 已经 aborted，则不执行 Tool。

注意，这里的检查不是为了回滚已经启动的工具，而是防止**取消已发生之后仍开始新的副作用**。

### 不变量 3：一次 ToolCall 最多提交一个 ToolResult

假设某个调用被取消，Runtime 已经提交了：

```text
call_001 → TOOL_CALL_CANCELLED
```

随后即使审批 Handler 返回 allow，也不能再产生：

```text
call_001 → success
```

否则不仅是重复执行问题，还会直接违反 VII-G 的消息配对规则。

所以在当前 Run 的这条路径中，取消结果一旦提交，该 ToolCall 就不能重新进入执行流程。

---

## 四、最重要的源码复用点：取消归因

当前源码有一个值得保留的设计：

```ts
if (
  signal?.aborted
  && error instanceof ToolExecutionCancelledError
  && error.signal === signal
) {
  this.#appendCancelledToolCalls(
    output.toolCalls.slice(index),
  );
  return this.#finish({ type: "aborted" });
}
```

这说明 Runtime 不会把任意错误误认为取消。

对 VII-H 来说，建议复用这一契约：

**Executor 在审批等待被当前 Signal 取消时，抛出携带相同 Signal 的专用取消错误。**

而不是直接抛出普通 Error、返回 deny，或者返回 Hook Error。

这样 Runtime 仍然可以：

- 为当前 ToolCall 写入 cancelled。
- 为后续未执行的 ToolCall 写入 cancelled。
- 返回 `RunOutcome: aborted`。
- 通过现有 `finally` 释放 `#active`。

不需要新增 `approval_cancelled` 消息类型。

### 这里有一个容易忽略的竞态

假设 Hook 因审批系统故障抛错，同时 Caller 取消 Run。

我们不能简单地采用：

```text
只要 signal.aborted，就把一切错误归为取消
```

因为 VII-F 已经明确反对这种做法。

我建议按已观察到的结算顺序处理：

- 先确认普通 Hook Error：产生 `TOOL_PRE_EXECUTION_FAILED`。
- 先确认当前 Signal 的 Abort：按取消处理。
- 如果普通失败结果已经提交，然后 Caller 才 Abort：保留失败事实，再让整个 Run 结束为 aborted。
- 绝不在取消已经生效后，再将迟到的 allow 转成 Tool 执行。

如此既能保留原来的错误归因，也不会引入一套独立的审批取消状态机。

---

## 五、与 Multi Tool Calls 的组合

例如模型一次生成：

```text
A: queryCoupon()
B: issueCoupon()
C: queryMember()
```

假设 A 已成功，B 正在等待审批，此时发生 Abort。

最终应当得到：

| ToolCall | ToolResult | 是否实际执行 |
|---|---|---|
| A | success | 是 |
| B | `TOOL_CALL_CANCELLED` | 否 |
| C | `TOOL_CALL_CANCELLED` | 否 |

RunOutcome 为 `aborted`。

这可以直接复用 VII-F 已有的 `#appendCancelledToolCalls()`。

需要保留当前 AgentEvent 的行为：B 可能已经产生 `tool_execution_started`（现有语义为执行尝试），但因为审批阶段被取消，不应产生对应的 `tool_execution_completed`。自动补齐的 cancelled ToolResult 也不额外伪造 Tool 执行完成事件。

### 和 VII-G 的关系

三条 ToolCall 仍然拥有三条完整的 ToolResult。

因此 Conversation Validation 可以通过。至于真正是否成功保存到 SQLite，仍取决于 Run 结束后 Application 的 Save Settlement。

这符合 VII-G 的 Run Boundary Persistence，不意味着我们已经实现 Durable Approval。

---

## 六、本轮建议冻结的 Architecture Decisions

| ID | 候选决策 |
|---|---|
| H-AD15 | 审批等待由 Executor 保证可被 Abort 中断，不完全依赖 Hook 自行响应 |
| H-AD16 | Hook 接收 Caller 原始 Signal；Executor 不创建另一套取消所有权 |
| H-AD17 | Allow 后、Tool.execute 前检查 Abort；迟到的 Allow 失效 |
| H-AD18 | 等待阶段的 Abort 复用 VII-F 取消错误、结果配对与 RunOutcome |
| H-AD19 | 保留先前已提交结果，不重复提交、不重新执行 Tool |
| H-AD20 | 等待终止后释放 Abort 监听资源；不等待已经失效的审批 Promise 才结束 Run |

其中 H-AD20 需要一点工程层面的说明：即使 Executor 不再等待，Hook 内部的异步工作仍可能继续；实现时需要正确处理迟到的 Promise resolve/reject，避免未处理异常和监听器泄漏，但不因此建立审批任务管理器。

## 七、验收标准

等进入 Codex Implementation 时，至少需要覆盖以下确定性测试：

1. Hook 永远 pending，Caller Abort 后 Run 仍能及时 settle，`#active` 被释放。
2. Abort 后 Hook 迟到地返回 allow，工具执行次数仍为 0。
3. Hook allow 已经生效，但 Tool 尚未开始时 Abort，工具不执行。
4. ToolCall A 已成功、B 等待审批被取消、C 尚未开始，三条结果均正确配对。
5. Hook 普通异常和 Abort 竞争，不将普通异常无条件伪装为取消。
6. 未配置 Hook 时，VII-F 既有测试行为完全不变。

---

## 八、下一步决策

这一轮我建议采用 **方案 B：Executor 保证审批等待可中断，Hook 同时接收 AbortSignal 并尽可能协作取消**。

这能保证即使未来某个前端审批弹窗没有正确响应关闭事件，也不会一直占用 Mini Agent Runtime 的 Active Run。

{@body const [decision,setDecision] = DIL.useState("B")}
<box border radius="lg" padding={3} gap={3}>
  **H-Q05：审批等待的 Abort 所有权**
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="B">方案 B：Executor 保证可中断 + Hook 协作响应（推荐）</radio>
    <radio value="A">方案 A：只由 Hook 自行处理 Abort</radio>
    <radio value="discuss">再分析方案 B 是否过度设计</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="B"?"确认采用方案 B：Executor 保证 beforeToolCall 等待可中断，Hook 同时接收原始 AbortSignal。继续 H-Q06：AgentEvent、SessionStore、Hook 注入与参数隔离的架构边界。先不实现代码。":decision==="A"?"我倾向方案 A：只让 Hook 自行响应 Abort，请分析对 Single Active Run 和取消配对的具体影响。":"我担心 Executor 保证审批等待可中断会引入过多复杂性。请结合当前源码说明最小实现范围和必要性。")}>确认并继续架构讨论 <icon name="arrow-right" inline/></button>
</box>

确认后，我们进入最后一组架构分析：**H-Q06：Hook 注入、参数隔离、AgentEvent 和 SessionStore 的兼容关系**。

然后再统一审核 H-AD 决策，形成 Part VII-H 的正式 Design Decision，最后才交给 Codex 实现。

## Turn 6

### User

> Message ID: `03b7f94e-187d-462e-b3bc-3e52b97fe1b1`; content: `text`; channel: `None`; recipient: `all`

确认采用方案 B：Executor 保证 beforeToolCall 等待可中断，Hook 同时接收原始 AbortSignal。继续 H-Q06：AgentEvent、SessionStore、Hook 注入与参数隔离的架构边界。先不实现代码。

### ChatGPT — commentary

> Message ID: `711f22e7-93f6-43f2-b527-87ee3c21d082`; content: `text`; channel: `commentary`; recipient: `all`

这轮只处理 H-Q06。我会重新核对上传代码中 Hook 的可接入位置、事件发出时机、参数引用隔离和 Session 保存边界，然后给出一组可确认的设计决策，不进入实现。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `d82ccc06-a9db-4cfa-9202-a3a51fd37e3f`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -Z1 '/mnt/data/source-review(20261014-031653).zip' | head -65; echo '---'; ls /mnt/data/*md

### Public tool output

> Message ID: `f4d005d6-e367-4e54-975f-5a42907ff79e`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `9223dcf3-f792-4711-839f-7e832660dafc`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/vii-h-inspect && cd /mnt/data/vii-h-inspect && unzip -oq '/mnt/data/source-review(20261014-031653).zip'; cat src/runtime/agent-runtime.ts; echo '------executor------'; cat src/tools/tool-executor.ts; echo '------event------'; cat src/runtime/agent-event.ts; echo '------tool------'; cat src/tools/tool.ts

### Public tool output

> Message ID: `258e7e1c-629a-4e2e-9e01-6df767092b77`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `58e51350-a9d1-4ada-a2a7-4a18acba3643`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ⑥
## H-Q06：Hook 注入、参数隔离、AgentEvent 与 SessionStore

<badge color="success">H-Q05 · 方案 B 已确认</badge>

这轮是 VII-H 架构分析的最后一个主题。我们先不写代码，也不急着生成 Codex Implementation Task。

我重新检查了你上传的 `source-review(20261014-031653).zip`，重点核对以下真实文件：

- `src/runtime/agent-runtime.ts`
- `src/tools/tool-executor.ts`
- `src/tools/tool.ts`
- `src/runtime/agent-event.ts`
- `src/messages/validate-conversation.ts`
- `src/demo/conversation-workflow.ts`

结合 VII-G 的最终 Architecture Record，可以得出一个重要结论：

**VII-H 最合适的演进方式，是新增一个执行前控制能力，而不是让 Approval 变成 RuntimeState、AgentEvent 或 SessionStore 的新职责。**

我们要保护已经建立的几个架构边界：

| 现有组件 | 已确认的所有权 | VII-H 的处理原则 |
|---|---|---|
| AgentRuntime | Agent Loop、消息写入、Run 控制 | 仅接入 Hook 配置 |
| ToolExecutor | 工具查找、参数验证、执行 | 增加执行前门禁 |
| RuntimeState | 已提交的消息事实 | 继续 messages-only |
| AgentEvent | 同步观察生命周期 | 不作为审批通道 |
| SessionStore | 稳定 Conversation 快照 | 不保存等待中的审批 |
| Application | 业务编排与持久化 | 提供审批策略和交互 |

---

## 一、H-Q06-1：Hook 应该从哪里注入？

这是本轮第一个需要决定的问题。

当前的构造关系是：

```text
Application
    ↓
new AgentRuntime(provider, options)
    ↓
AgentRuntime
    ├── ToolRegistry
    ├── ToolExecutor
    ├── ContextBuilder
    └── RuntimeState
```

实际源码中：

```ts
export interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
}
```

以及：

```ts
this.#registry = options.registry ?? new ToolRegistry();
this.#executor = new ToolExecutor(this.#registry);
```

因此，最小改动就是扩展现有的 Options，而不是引入一个新层级的 ApprovalManager。

### 两种可行方案

<box border radius="lg" padding={3} gap={3}>
  <box gap={1}>
    **方案 A：Application 配置到 AgentRuntimeOptions（推荐）**

    <text color="secondary" size="sm">Application → AgentRuntimeOptions → ToolExecutor → Hook</text>

    Application 在创建 Runtime 时提供 Hook。Runtime 只负责把 Hook 传给 Executor，不参与具体审批逻辑。

    优点是保留现有 `new AgentRuntime(provider, options)` API，配置在 Runtime 生命周期内保持稳定，适合当前单实例运行模型。
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **方案 B：每次 run() 动态传入 Hook**

    <text color="secondary" size="sm">Application → run(input, { beforeToolCall }) → Executor</text>

    优点是每次 Run 都可以使用不同的 Hook。

    但会增加 RunOptions 的职责，也需要考虑多次 Run、调用级策略变化以及审批 Handler 的生命周期。
  </box>
</box>

我倾向方案 A。

还有一个细节：`ToolExecutor` 已经存在直接调用路径及其单元测试。因此它自己也应能接收可选 Hook 配置，而不能只在 AgentRuntime 层实现拦截。

这里不意味着要注入整个 Application 对象。

**我们只需要一个小的函数契约，而不是引入 ApprovalService、PermissionManager、PolicyEngine 等一系列抽象。**

### 初步设计边界

- Hook 由 Application 提供。
- Runtime 构造时接收可选 Hook。
- Runtime 将它传入 Executor。
- Executor 负责调用 Hook 并执行其决定。
- 不增加运行过程中的 `setHook()`、`registerHook()` 或 Hot Reload。

这属于对 VII-A、VII-C 已有构造边界的增量扩展。

---

## 二、H-Q06-2：Hook 如何保证参数隔离？

这是我认为本轮最值得认真理解的工程细节。

### 2.1 当前源码已经有第一层隔离

在 `ToolExecutor.execute()` 中：

```ts
const args: unknown = structuredClone(call.arguments);

if (!validate(args)) {
  return {
    success: false,
    error: {
      code: "INVALID_ARGUMENTS",
      message: this.#validator.errorsText(validate.errors),
    },
  };
}
```

这保证 Tool 不会通过输入参数引用直接修改 Runtime 已记录的 Model ToolCall。

但在引入 Hook 后，会增加一个新的引用共享风险。

### 2.2 新的风险：审批内容和执行内容不一致

例如模型生成：

```json
{
  "name": "issueCoupon",
  "arguments": {
    "userId": "10001",
    "amount": 500
  }
}
```

假设 Hook 接收的是 Executor 准备传给 Tool 的同一个对象：

```text
原始 ToolCall
      ↓
Executor Clone
      ↓
Schema Validation
      ↓
Hook 接收 args
      ↓
Hook 修改 amount: 500 → 5000
      ↓
Hook 返回 allow
      ↓
Tool.execute(args)
```

这样会造成两个问题：

1. 用户审批的是 500 元，实际可能执行 5000 元。
2. 改动发生在 Ajv Validation 之后，甚至可能绕过原有 Schema 约束。

所以这里不仅是防止修改 RuntimeState，更要保证：

**Hook 审批的参数与 Tool 实际执行的参数保持一致。**

### 2.3 建议继续使用 Reference Isolation（引用隔离）

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">推荐的参数隔离关系</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" padding={3} radius="md" width="100%" align="center">
      **已记录的 Model ToolCall**
      <text color="secondary" size="xs">RuntimeState 中的事实，不允许 Hook 修改</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      **Executor 创建并校验执行参数**
      <text color="secondary" size="xs">Ajv Validation</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <grid columns={2} gap={3}>
      <grid-item>
        <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
          **Hook Input**
          <text color="secondary" size="xs" textAlign="center">独立深拷贝，仅用于决策</text>
        </box>
      </grid-item>
      <grid-item>
        <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
          **Execution Args**
          <text color="secondary" size="xs" textAlign="center">独立对象，仅交给 Tool</text>
        </box>
      </grid-item>
    </grid>
  </box>
</box>

这里我建议保持 VII-D、VII-E 已经采用的思想：使用 `structuredClone` 实现引用隔离，不额外引入 `deepFreeze` 或不可变状态框架。

但需要留意一个细节：

`ToolCall.arguments` 在类型上是 `unknown`。只有通过当前 Executor 的工具 Schema 校验后，才有理由将其视作符合对应工具参数约束。

另外，`structuredClone` 保护的是对象引用隔离，并不是业务权限校验，也不能阻止 Hook 自己在外部发起副作用。

因此第一版应明确：

- Hook 是受信任的 Application 扩展代码。
- Hook 不具有修改本次执行参数的官方能力。
- Hook 拿到的上下文不应该与执行参数共享可变对象。
- Hook 的返回值只能影响放行或拒绝，不能替换 Tool 名称、ID 或参数。
- 如果未来确实需要参数转换，应当另行设计校验与授权顺序，而不是让 Hook 隐式修改。

这也是未来做营销 Agent 时非常重要的安全边界。

---

## 三、H-Q06-3：AgentEvent 是否需要新增审批事件？

我建议 **本节先不新增事件类型**。

原因并不是审批不需要被观察，而是当前六种 AgentEvent 已经有明确的使用边界。

实际 `agent-event.ts` 定义：

```ts
export type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | { type: "model_turn_completed"; message: RuntimeAssistantMessage }
  | { type: "tool_execution_started"; toolCall: ToolCall }
  | { type: "tool_execution_completed"; message: RuntimeToolMessage }
  | { type: "run_finished"; outcome: RunOutcome };
```

### 3.1 Approval 不应该通过 Subscriber 发起

VII-E 的 `#emit()` 有三个特性：

- 同步通知；
- 隔离 Subscriber 异常；
- 深拷贝事件 payload。

这些特性适合观察，不适合执行授权。

假设 Subscriber 收到：

```text
tool_execution_started
```

随后想返回：

```text
deny
```

Runtime 根本不会消费这个返回值。

所以我们不应该让 Subscriber 冒充 Hook。

### 3.2 当前事件时间点必须保留

我从 `agent-runtime.ts` 确认：

```ts
this.#emit({
  type: "tool_execution_started",
  toolCall: call,
});

// 此处才调用 Executor
result = await this.#executor.execute(...);
```

因此 `tool_execution_started` 不是 `Tool.execute()` 真实开始的精确通知，它表达的是 Runtime 已开始处理该 ToolCall 的执行尝试。

这意味着加入审批后：

| 情况 | started | completed |
|---|---|---|
| Hook allow，Tool 返回结果 | 有 | 有 |
| Hook deny，生成失败 Result | 有 | 有 |
| Hook Error，生成失败 Result | 有 | 有 |
| Approval 等待中 Abort | 有 | 按现有 VII-F 语义不发 |
| maxTurns skipped | 无 | 无 |

此外，Subscriber 在 `tool_execution_started` 内可以同步触发 Abort。原代码在 emit 后再次检查 Signal，必须保留这项行为。

### 3.3 是否需要 `approval_requested`？

未来做 Web 产品时，确实可能需要：

```text
approval_requested
approval_resolved
```

但不建议本节提前增加。

因为对于 VII-H，Application 本身拥有 Approval Handler。它可以在 Handler 中展示弹窗、更新本地 UI 状态，而不需要 Runtime 新增一套事件来通知它自己发起的审批。

例如：

```text
beforeToolCall
      ↓
Application.requestApproval()
      ↓
Web UI 显示确认弹窗
      ↓
人工允许或拒绝
      ↓
Hook 返回决策
```

这是一条 Application 内部交互流程。

如果之后我们需要统一审批审计、跨服务监听，再讨论新的事件及其交付保证。

**本节不应该仅仅为了展示 Approval 流程，就重写已有 Event Model。**


### ChatGPT

> Message ID: `7f306f44-375f-4f51-8ec7-1aa9158b7143`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H · Architecture Analysis ⑥
## H-Q06：Hook 注入、参数隔离、AgentEvent 与 SessionStore

<badge color="success">H-Q05 · 方案 B 已确认</badge>

这轮是 VII-H 架构分析的最后一个主题。我们先不写代码，也不急着生成 Codex Implementation Task。

我重新检查了你上传的 `source-review(20261014-031653).zip`，重点核对以下真实文件：

- `src/runtime/agent-runtime.ts`
- `src/tools/tool-executor.ts`
- `src/tools/tool.ts`
- `src/runtime/agent-event.ts`
- `src/messages/validate-conversation.ts`
- `src/demo/conversation-workflow.ts`

结合 VII-G 的最终 Architecture Record，可以得出一个重要结论：

**VII-H 最合适的演进方式，是新增一个执行前控制能力，而不是让 Approval 变成 RuntimeState、AgentEvent 或 SessionStore 的新职责。**

我们要保护已经建立的几个架构边界：

| 现有组件 | 已确认的所有权 | VII-H 的处理原则 |
|---|---|---|
| AgentRuntime | Agent Loop、消息写入、Run 控制 | 仅接入 Hook 配置 |
| ToolExecutor | 工具查找、参数验证、执行 | 增加执行前门禁 |
| RuntimeState | 已提交的消息事实 | 继续 messages-only |
| AgentEvent | 同步观察生命周期 | 不作为审批通道 |
| SessionStore | 稳定 Conversation 快照 | 不保存等待中的审批 |
| Application | 业务编排与持久化 | 提供审批策略和交互 |

---

## 一、H-Q06-1：Hook 应该从哪里注入？

这是本轮第一个需要决定的问题。

当前的构造关系是：

```text
Application
    ↓
new AgentRuntime(provider, options)
    ↓
AgentRuntime
    ├── ToolRegistry
    ├── ToolExecutor
    ├── ContextBuilder
    └── RuntimeState
```

实际源码中：

```ts
export interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
}
```

以及：

```ts
this.#registry = options.registry ?? new ToolRegistry();
this.#executor = new ToolExecutor(this.#registry);
```

因此，最小改动就是扩展现有的 Options，而不是引入一个新层级的 ApprovalManager。

### 两种可行方案

<box border radius="lg" padding={3} gap={3}>
  <box gap={1}>
    **方案 A：Application 配置到 AgentRuntimeOptions（推荐）**

    <text color="secondary" size="sm">Application → AgentRuntimeOptions → ToolExecutor → Hook</text>

    Application 在创建 Runtime 时提供 Hook。Runtime 只负责把 Hook 传给 Executor，不参与具体审批逻辑。

    优点是保留现有 `new AgentRuntime(provider, options)` API，配置在 Runtime 生命周期内保持稳定，适合当前单实例运行模型。
  </box>
  <divider color="subtle"/>
  <box gap={1}>
    **方案 B：每次 run() 动态传入 Hook**

    <text color="secondary" size="sm">Application → run(input, { beforeToolCall }) → Executor</text>

    优点是每次 Run 都可以使用不同的 Hook。

    但会增加 RunOptions 的职责，也需要考虑多次 Run、调用级策略变化以及审批 Handler 的生命周期。
  </box>
</box>

我倾向方案 A。

还有一个细节：`ToolExecutor` 已经存在直接调用路径及其单元测试。因此它自己也应能接收可选 Hook 配置，而不能只在 AgentRuntime 层实现拦截。

这里不意味着要注入整个 Application 对象。

**我们只需要一个小的函数契约，而不是引入 ApprovalService、PermissionManager、PolicyEngine 等一系列抽象。**

### 初步设计边界

- Hook 由 Application 提供。
- Runtime 构造时接收可选 Hook。
- Runtime 将它传入 Executor。
- Executor 负责调用 Hook 并执行其决定。
- 不增加运行过程中的 `setHook()`、`registerHook()` 或 Hot Reload。

这属于对 VII-A、VII-C 已有构造边界的增量扩展。

---

## 二、H-Q06-2：Hook 如何保证参数隔离？

这是我认为本轮最值得认真理解的工程细节。

### 2.1 当前源码已经有第一层隔离

在 `ToolExecutor.execute()` 中：

```ts
const args: unknown = structuredClone(call.arguments);

if (!validate(args)) {
  return {
    success: false,
    error: {
      code: "INVALID_ARGUMENTS",
      message: this.#validator.errorsText(validate.errors),
    },
  };
}
```

这保证 Tool 不会通过输入参数引用直接修改 Runtime 已记录的 Model ToolCall。

但在引入 Hook 后，会增加一个新的引用共享风险。

### 2.2 新的风险：审批内容和执行内容不一致

例如模型生成：

```json
{
  "name": "issueCoupon",
  "arguments": {
    "userId": "10001",
    "amount": 500
  }
}
```

假设 Hook 接收的是 Executor 准备传给 Tool 的同一个对象：

```text
原始 ToolCall
      ↓
Executor Clone
      ↓
Schema Validation
      ↓
Hook 接收 args
      ↓
Hook 修改 amount: 500 → 5000
      ↓
Hook 返回 allow
      ↓
Tool.execute(args)
```

这样会造成两个问题：

1. 用户审批的是 500 元，实际可能执行 5000 元。
2. 改动发生在 Ajv Validation 之后，甚至可能绕过原有 Schema 约束。

所以这里不仅是防止修改 RuntimeState，更要保证：

**Hook 审批的参数与 Tool 实际执行的参数保持一致。**

### 2.3 建议继续使用 Reference Isolation（引用隔离）

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium" size="sm">推荐的参数隔离关系</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" padding={3} radius="md" width="100%" align="center">
      **已记录的 Model ToolCall**
      <text color="secondary" size="xs">RuntimeState 中的事实，不允许 Hook 修改</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="md" padding={3} width="100%" align="center" gap={1}>
      **Executor 创建并校验执行参数**
      <text color="secondary" size="xs">Ajv Validation</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <grid columns={2} gap={3}>
      <grid-item>
        <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
          **Hook Input**
          <text color="secondary" size="xs" textAlign="center">独立深拷贝，仅用于决策</text>
        </box>
      </grid-item>
      <grid-item>
        <box background="surface-secondary" radius="md" padding={3} align="center" gap={1}>
          **Execution Args**
          <text color="secondary" size="xs" textAlign="center">独立对象，仅交给 Tool</text>
        </box>
      </grid-item>
    </grid>
  </box>
</box>

这里我建议保持 VII-D、VII-E 已经采用的思想：使用 `structuredClone` 实现引用隔离，不额外引入 `deepFreeze` 或不可变状态框架。

但需要留意一个细节：

`ToolCall.arguments` 在类型上是 `unknown`。只有通过当前 Executor 的工具 Schema 校验后，才有理由将其视作符合对应工具参数约束。

另外，`structuredClone` 保护的是对象引用隔离，并不是业务权限校验，也不能阻止 Hook 自己在外部发起副作用。

因此第一版应明确：

- Hook 是受信任的 Application 扩展代码。
- Hook 不具有修改本次执行参数的官方能力。
- Hook 拿到的上下文不应该与执行参数共享可变对象。
- Hook 的返回值只能影响放行或拒绝，不能替换 Tool 名称、ID 或参数。
- 如果未来确实需要参数转换，应当另行设计校验与授权顺序，而不是让 Hook 隐式修改。

这也是未来做营销 Agent 时非常重要的安全边界。

---

## 三、H-Q06-3：AgentEvent 是否需要新增审批事件？

我建议 **本节先不新增事件类型**。

原因并不是审批不需要被观察，而是当前六种 AgentEvent 已经有明确的使用边界。

实际 `agent-event.ts` 定义：

```ts
export type AgentEvent =
  | { type: "run_started" }
  | { type: "model_turn_started" }
  | { type: "model_turn_completed"; message: RuntimeAssistantMessage }
  | { type: "tool_execution_started"; toolCall: ToolCall }
  | { type: "tool_execution_completed"; message: RuntimeToolMessage }
  | { type: "run_finished"; outcome: RunOutcome };
```

### 3.1 Approval 不应该通过 Subscriber 发起

VII-E 的 `#emit()` 有三个特性：

- 同步通知；
- 隔离 Subscriber 异常；
- 深拷贝事件 payload。

这些特性适合观察，不适合执行授权。

假设 Subscriber 收到：

```text
tool_execution_started
```

随后想返回：

```text
deny
```

Runtime 根本不会消费这个返回值。

所以我们不应该让 Subscriber 冒充 Hook。

### 3.2 当前事件时间点必须保留

我从 `agent-runtime.ts` 确认：

```ts
this.#emit({
  type: "tool_execution_started",
  toolCall: call,
});

// 此处才调用 Executor
result = await this.#executor.execute(...);
```

因此 `tool_execution_started` 不是 `Tool.execute()` 真实开始的精确通知，它表达的是 Runtime 已开始处理该 ToolCall 的执行尝试。

这意味着加入审批后：

| 情况 | started | completed |
|---|---|---|
| Hook allow，Tool 返回结果 | 有 | 有 |
| Hook deny，生成失败 Result | 有 | 有 |
| Hook Error，生成失败 Result | 有 | 有 |
| Approval 等待中 Abort | 有 | 按现有 VII-F 语义不发 |
| maxTurns skipped | 无 | 无 |

此外，Subscriber 在 `tool_execution_started` 内可以同步触发 Abort。原代码在 emit 后再次检查 Signal，必须保留这项行为。

### 3.3 是否需要 `approval_requested`？

未来做 Web 产品时，确实可能需要：

```text
approval_requested
approval_resolved
```

但不建议本节提前增加。

因为对于 VII-H，Application 本身拥有 Approval Handler。它可以在 Handler 中展示弹窗、更新本地 UI 状态，而不需要 Runtime 新增一套事件来通知它自己发起的审批。

例如：

```text
beforeToolCall
      ↓
Application.requestApproval()
      ↓
Web UI 显示确认弹窗
      ↓
人工允许或拒绝
      ↓
Hook 返回决策
```

这是一条 Application 内部交互流程。

如果之后我们需要统一审批审计、跨服务监听，再讨论新的事件及其交付保证。

**本节不应该仅仅为了展示 Approval 流程，就重写已有 Event Model。**

## 四、H-Q06-4：Approval 与 SessionStore 的关系

这是必须和 VII-G 对齐的部分。

上一阶段我们已经确定：

```text
Application
     ↓
Runtime.run()
     ↓
Run settle
     ↓
validateConversation()
     ↓
SessionStore.save()
```

目前 `runAndSave()` 不会在 Run 进行到一半时自动保存消息。

因此，我们需要区分三类事实。

| 数据 | 是否写入 Conversation | 原因 |
|---|---|---|
| LLM 提出的 ToolCall | 是 | 已提交的模型输出 |
| 正在等待的 Approval Promise | 否 | 进程内执行状态 |
| Allow 后的 ToolResult | 是 | 工具执行结果 |
| Deny 后的 ToolResult | 是 | 明确拒绝的事实 |
| Hook Error 对应的 ToolResult | 是 | 执行前控制失败的事实 |
| AbortSignal / Hook Handler | 否 | 不可恢复的运行时资源 |

### 4.1 审批等待期间崩溃怎么办？

例如：

```text
LLM 提出 issueCoupon
        ↓
Runtime 进入 beforeToolCall
        ↓
Web 前端展示审批弹窗
        ↓
Node.js 进程崩溃
```

当前方案不会保存这次进行中的审批请求，也不能自动恢复等待。

这符合已确认的 Non-Durable Approval 边界。

**不能因为 VII-G 已经有 SQLiteSessionStore，就认为 Approval 具备持久化能力。**

### 4.2 拒绝后恢复历史会怎样？

假设一次 Run 已经完成：

```text
Model:
  issueCoupon(call_001)

ToolResult:
  TOOL_EXECUTION_DENIED

Model:
  用户未批准发券，操作没有执行。
```

Application 保存合法历史。

后来重新创建 Runtime：

```text
SQLite.load()
       ↓
new AgentRuntime(provider, { initialMessages })
       ↓
下一次 run()
```

历史中的 Deny 只是一条已经发生的结果。

不会重新调用 `beforeToolCall`，更不会重新弹出审批窗口。

这是 VII-G 已经确立的 **Conversation Recovery ≠ Execution Recovery** 的直接延伸。

### 4.3 是否需要修改 Conversation Validator？

**不需要。**

这是本轮很值得保留的结论。

当前校验器并不解析 `tool_result.content` 的业务含义，只要求它是合法的字符串，并且 ToolCall ID 配对正确。

因此新的 Deny / Hook Error 仍使用已有 `ToolResult` 格式序列化即可。

不需要增加：

```text
approval_request
approval_response
pending_approval
```

也不需要修改 SessionSnapshot 或 CAS revision 协议。

同样，之前 G-AD12～G-AD16 定义的 Run / Persistence 双 Settlement 与 `reusable` 语义仍然成立。只要运行结束后历史合法，Application 就可以尝试保存；保存是否成功仍由独立的 Persistence Settlement 决定。

---

## 五、本轮 Architecture Decision 候选

现在可以把 H-Q06 收敛为六条决策。

| ID | 建议决策 | 状态 |
|---|---|---|
| H-AD21 | Hook 通过 `AgentRuntimeOptions` 构造注入，再传给 Executor | 待确认 |
| H-AD22 | Executor 也支持相同的可选 Hook，不设置第二套执行门禁 | 待确认 |
| H-AD23 | Hook 输入与已记录 ToolCall、实际执行参数保持引用隔离 | 待确认 |
| H-AD24 | Hook 只能返回执行决策，不能替换名称、ID、参数 | 待确认 |
| H-AD25 | 保留现有六种 AgentEvent 与发布时机，不新增审批生命周期事件 | 待确认 |
| H-AD26 | 保留 messages-only State 与现有 SessionStore / Validator，不持久化 Approval 等待 | 待确认 |

<text color="secondary" size="xs">本节所有 H-AD 编号暂时作为架构讨论追踪编号。正式 Design Decision 阶段还会统一核对并整理，避免因分轮讨论产生重复或冲突的冻结决策。</text>

## 六、还需要一个重要的工程约束：不要让 Hook 结果污染模型上下文

即使决定将 Hook Error 转成 ToolResult，也不应该毫无限制地把原始异常信息返回给模型。

例如：

```text
Error:
  Database connection failed
  postgres://user:password@internal-db...
```

如果把完整错误堆栈放入 `ToolResult.content`，下一轮模型就可能接收到内部连接信息。

因此我建议在 H-AD10 的基础上增加一个边界：

**Hook Error 保留明确的失败类别，但 ToolResult 中使用安全的错误描述，不直接暴露任意原始异常对象、堆栈或敏感内容。**

Application 可以自行记录诊断信息；Mini Runtime 不需要因此增加复杂日志系统。

同理，人工拒绝原因如果允许被回流给模型，也应明确这是准备暴露给模型的文本，而不是未经过筛选的内部审批信息。

这不会改变我们已经确认的「Hook Error → 失败 ToolResult」设计，只是补充它的安全表达契约。

---

## 七、VII-H 架构分析目前形成的整体模型

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">候选最终架构（仅为设计，不代表已经实现）</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">提供 beforeToolCall / Approval Handler</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">Loop、Run、State、AgentEvent</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="lg" padding={3} width="100%" gap={2}>
      <text weight="medium" textAlign="center">ToolExecutor</text>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        <text size="sm">Registry Lookup → Ajv Validation</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box border={{size:2,color:"info"}} padding={3} radius="md" gap={1} align="center">
        **await beforeToolCall()**
        <text color="secondary" size="xs">隔离参数 / 异步审批 / Abort 感知</text>
      </box>
      <grid columns={3} gap={2}>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="check" color="success"/>
            **Allow**
            <text size="2xs" textAlign="center">执行 Tool</text>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="x" color="danger"/>
            **Deny/Error**
            <text size="2xs" textAlign="center">失败 Result</text>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="ban" color="danger"/>
            **Abort**
            <text size="2xs" textAlign="center">取消配对</text>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">提交结果 → Event → 下一轮 Model Turn</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">Run settle → Validate → SessionStore.save</text>
    </box>
  </box>
</box>

这张图体现了 VII-H 最重要的变化：

以前的 Agent Runtime 只知道「模型要求调用工具，就尝试执行」。

现在的 Agent Runtime 能够区分：

- 模型提出的意图；
- Executor 验证过的调用；
- Application 授权的执行；
- Tool 实际发生的结果；
- Runtime 最终记录的事实。

这与我们未来做营销业务 Agent 的需求直接相关，但本阶段仍不引入实际营销 API。

## 八、下一步：冻结 H-Q06，还是先审查边界？

我建议先确认本轮六条候选决策，然后进入正式的 **Design Decision Review**。

在 Review 中，我们还需要检查几个细节，特别是 Hook 的最终 TypeScript 契约、审批等待的 Abort 竞争、普通 Hook Error 与取消的结算优先级，以及是否确实需要保留所有暂定 H-AD 编号。

{@body const [decision,setDecision] = DIL.useState("confirm")}
<box border radius="lg" padding={3} gap={3}>
  **H-Q06：本轮决策**
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="confirm">确认 H-AD21～26，进入完整 Design Decision Review（推荐）</radio>
    <radio value="events">先深入讨论是否需要 Approval 相关 AgentEvent</radio>
    <radio value="hook">先深入讨论 Hook 的参数隔离与注入方式</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="confirm"?"确认 H-Q06 的六条候选决策。请进入 Part VII-H 正式 Design Decision Review，统一审核 H-AD01～26，去重、检查与 VII-A～VII-G 的兼容性，给出最终 TypeScript 契约和测试矩阵，但仍不生成 Codex Implementation Task、不修改代码。":decision==="events"?"继续分析 H-Q06：是否真的不需要新增 approval_requested / approval_resolved AgentEvent？结合 Vue 前端审批交互、现有 Subscriber 和 Abort 契约比较。":"继续分析 H-Q06：请基于真实 AgentRuntime、ToolExecutor 代码，深入推导 Hook 注入、参数引用隔离与 Tool Schema Validation 的具体边界，不写代码。")}>继续 <icon name="arrow-right" inline/></button>
</box>

整个 VII-H 目前仍处于 Architecture Analysis。**还没有代码实现，也没有开始 Runtime Verification。** 只有在决策 Review 完成以后，我们才进入 Codex Implementation。

### ChatGPT

> Message ID: `18222ab1-a93c-4c4e-92b3-20c365c9f754`; content: `text`; channel: `final`; recipient: `all`

## 四、H-Q06-4：Approval 与 SessionStore 的关系

这是必须和 VII-G 对齐的部分。

上一阶段我们已经确定：

```text
Application
     ↓
Runtime.run()
     ↓
Run settle
     ↓
validateConversation()
     ↓
SessionStore.save()
```

目前 `runAndSave()` 不会在 Run 进行到一半时自动保存消息。

因此，我们需要区分三类事实。

| 数据 | 是否写入 Conversation | 原因 |
|---|---|---|
| LLM 提出的 ToolCall | 是 | 已提交的模型输出 |
| 正在等待的 Approval Promise | 否 | 进程内执行状态 |
| Allow 后的 ToolResult | 是 | 工具执行结果 |
| Deny 后的 ToolResult | 是 | 明确拒绝的事实 |
| Hook Error 对应的 ToolResult | 是 | 执行前控制失败的事实 |
| AbortSignal / Hook Handler | 否 | 不可恢复的运行时资源 |

### 4.1 审批等待期间崩溃怎么办？

例如：

```text
LLM 提出 issueCoupon
        ↓
Runtime 进入 beforeToolCall
        ↓
Web 前端展示审批弹窗
        ↓
Node.js 进程崩溃
```

当前方案不会保存这次进行中的审批请求，也不能自动恢复等待。

这符合已确认的 Non-Durable Approval 边界。

**不能因为 VII-G 已经有 SQLiteSessionStore，就认为 Approval 具备持久化能力。**

### 4.2 拒绝后恢复历史会怎样？

假设一次 Run 已经完成：

```text
Model:
  issueCoupon(call_001)

ToolResult:
  TOOL_EXECUTION_DENIED

Model:
  用户未批准发券，操作没有执行。
```

Application 保存合法历史。

后来重新创建 Runtime：

```text
SQLite.load()
       ↓
new AgentRuntime(provider, { initialMessages })
       ↓
下一次 run()
```

历史中的 Deny 只是一条已经发生的结果。

不会重新调用 `beforeToolCall`，更不会重新弹出审批窗口。

这是 VII-G 已经确立的 **Conversation Recovery ≠ Execution Recovery** 的直接延伸。

### 4.3 是否需要修改 Conversation Validator？

**不需要。**

这是本轮很值得保留的结论。

当前校验器并不解析 `tool_result.content` 的业务含义，只要求它是合法的字符串，并且 ToolCall ID 配对正确。

因此新的 Deny / Hook Error 仍使用已有 `ToolResult` 格式序列化即可。

不需要增加：

```text
approval_request
approval_response
pending_approval
```

也不需要修改 SessionSnapshot 或 CAS revision 协议。

同样，之前 G-AD12～G-AD16 定义的 Run / Persistence 双 Settlement 与 `reusable` 语义仍然成立。只要运行结束后历史合法，Application 就可以尝试保存；保存是否成功仍由独立的 Persistence Settlement 决定。

---

## 五、本轮 Architecture Decision 候选

现在可以把 H-Q06 收敛为六条决策。

| ID | 建议决策 | 状态 |
|---|---|---|
| H-AD21 | Hook 通过 `AgentRuntimeOptions` 构造注入，再传给 Executor | 待确认 |
| H-AD22 | Executor 也支持相同的可选 Hook，不设置第二套执行门禁 | 待确认 |
| H-AD23 | Hook 输入与已记录 ToolCall、实际执行参数保持引用隔离 | 待确认 |
| H-AD24 | Hook 只能返回执行决策，不能替换名称、ID、参数 | 待确认 |
| H-AD25 | 保留现有六种 AgentEvent 与发布时机，不新增审批生命周期事件 | 待确认 |
| H-AD26 | 保留 messages-only State 与现有 SessionStore / Validator，不持久化 Approval 等待 | 待确认 |

<text color="secondary" size="xs">本节所有 H-AD 编号暂时作为架构讨论追踪编号。正式 Design Decision 阶段还会统一核对并整理，避免因分轮讨论产生重复或冲突的冻结决策。</text>

## 六、还需要一个重要的工程约束：不要让 Hook 结果污染模型上下文

即使决定将 Hook Error 转成 ToolResult，也不应该毫无限制地把原始异常信息返回给模型。

例如：

```text
Error:
  Database connection failed
  postgres://user:password@internal-db...
```

如果把完整错误堆栈放入 `ToolResult.content`，下一轮模型就可能接收到内部连接信息。

因此我建议在 H-AD10 的基础上增加一个边界：

**Hook Error 保留明确的失败类别，但 ToolResult 中使用安全的错误描述，不直接暴露任意原始异常对象、堆栈或敏感内容。**

Application 可以自行记录诊断信息；Mini Runtime 不需要因此增加复杂日志系统。

同理，人工拒绝原因如果允许被回流给模型，也应明确这是准备暴露给模型的文本，而不是未经过筛选的内部审批信息。

这不会改变我们已经确认的「Hook Error → 失败 ToolResult」设计，只是补充它的安全表达契约。

---

## 七、VII-H 架构分析目前形成的整体模型

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium" size="sm">候选最终架构（仅为设计，不代表已经实现）</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">提供 beforeToolCall / Approval Handler</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">Loop、Run、State、AgentEvent</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="lg" padding={3} width="100%" gap={2}>
      <text weight="medium" textAlign="center">ToolExecutor</text>
      <box background="surface-secondary" radius="md" padding={2} align="center">
        <text size="sm">Registry Lookup → Ajv Validation</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box border={{size:2,color:"info"}} padding={3} radius="md" gap={1} align="center">
        **await beforeToolCall()**
        <text color="secondary" size="xs">隔离参数 / 异步审批 / Abort 感知</text>
      </box>
      <grid columns={3} gap={2}>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="check" color="success"/>
            **Allow**
            <text size="2xs" textAlign="center">执行 Tool</text>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="x" color="danger"/>
            **Deny/Error**
            <text size="2xs" textAlign="center">失败 Result</text>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="ban" color="danger"/>
            **Abort**
            <text size="2xs" textAlign="center">取消配对</text>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">提交结果 → Event → 下一轮 Model Turn</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">Run settle → Validate → SessionStore.save</text>
    </box>
  </box>
</box>

这张图体现了 VII-H 最重要的变化：

以前的 Agent Runtime 只知道「模型要求调用工具，就尝试执行」。

现在的 Agent Runtime 能够区分：

- 模型提出的意图；
- Executor 验证过的调用；
- Application 授权的执行；
- Tool 实际发生的结果；
- Runtime 最终记录的事实。

这与我们未来做营销业务 Agent 的需求直接相关，但本阶段仍不引入实际营销 API。

## 八、下一步：冻结 H-Q06，还是先审查边界？

我建议先确认本轮六条候选决策，然后进入正式的 **Design Decision Review**。

在 Review 中，我们还需要检查几个细节，特别是 Hook 的最终 TypeScript 契约、审批等待的 Abort 竞争、普通 Hook Error 与取消的结算优先级，以及是否确实需要保留所有暂定 H-AD 编号。

{@body const [decision,setDecision] = DIL.useState("confirm")}
<box border radius="lg" padding={3} gap={3}>
  **H-Q06：本轮决策**
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="confirm">确认 H-AD21～26，进入完整 Design Decision Review（推荐）</radio>
    <radio value="events">先深入讨论是否需要 Approval 相关 AgentEvent</radio>
    <radio value="hook">先深入讨论 Hook 的参数隔离与注入方式</radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="confirm"?"确认 H-Q06 的六条候选决策。请进入 Part VII-H 正式 Design Decision Review，统一审核 H-AD01～26，去重、检查与 VII-A～VII-G 的兼容性，给出最终 TypeScript 契约和测试矩阵，但仍不生成 Codex Implementation Task、不修改代码。":decision==="events"?"继续分析 H-Q06：是否真的不需要新增 approval_requested / approval_resolved AgentEvent？结合 Vue 前端审批交互、现有 Subscriber 和 Abort 契约比较。":"继续分析 H-Q06：请基于真实 AgentRuntime、ToolExecutor 代码，深入推导 Hook 注入、参数引用隔离与 Tool Schema Validation 的具体边界，不写代码。")}>继续 <icon name="arrow-right" inline/></button>
</box>

整个 VII-H 目前仍处于 Architecture Analysis。**还没有代码实现，也没有开始 Runtime Verification。** 只有在决策 Review 完成以后，我们才进入 Codex Implementation。

## Turn 7

### User

> Message ID: `cb8d0ec9-d66d-41b7-aba1-f0aa9f5b5248`; content: `text`; channel: `None`; recipient: `all`

确认 H-Q06 的六条候选决策。请进入 Part VII-H 正式 Design Decision Review，统一审核 H-AD01～26，去重、检查与 VII-A～VII-G 的兼容性，给出最终 TypeScript 契约和测试矩阵，但仍不生成 Codex Implementation Task、不修改代码。

### ChatGPT — commentary

> Message ID: `da1b745b-1370-4093-926a-da503cad0ee6`; content: `text`; channel: `commentary`; recipient: `all`

我会把 H-AD01～26 当作“候选决策”重新审查，而不是直接全部冻结。先核对源码中的真实类型、调用顺序、异常与取消分支，再检查这些候选决策之间有没有重复或冲突。

最后给出一版精简、可实施的正式决策集、TypeScript 契约草案和完整测试矩阵；不会修改仓库，也不会生成 Codex 任务。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `37fbe9ab-0afb-469f-adc2-f6dc3297fed8`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lh /mnt/data && unzip -l '/mnt/data/source-review(20261014-031653).zip' | head -95

### Public tool output

> Message ID: `3b463bb5-a0f7-4d88-9ae2-3e8608f28d02`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `01aaac7f-1f47-4892-9bb6-2e5f704c87f8`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/vii-h-design-review-live && unzip -oq '/mnt/data/source-review(20261014-031653).zip' -d /mnt/data/vii-h-design-review-live && for f in src/runtime/agent-runtime.ts src/tools/tool-executor.ts src/tools/tool.ts src/tools/tool-registry.ts src/runtime/agent-event.ts src/messages/runtime-message.ts src/messages/validate-conversation.ts src/demo/conversation-workflow.ts src/model/model-provider.ts src/runtime/context-builder.ts; do echo; echo '========' $f; nl -ba /mnt/data/vii-h-design-review-live/$f; done

### Public tool output

> Message ID: `3e8bb0d9-f65c-42f5-ab5b-d92f90f0a9ee`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `5573c084-d6b7-4ab7-9e13-ee1c0f7d5eab`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc for f in src/tools/tool-executor.ts src/tools/tool.ts src/tools/tool-registry.ts src/runtime/agent-event.ts src/messages/runtime-message.ts src/model/tool.ts src/model/model.ts tsconfig.json package.json; do echo ==== $f; nl -ba /mnt/data/vii-h-design-review-live/$f; done

### Public tool output

> Message ID: `26bdf93d-2a5d-480c-be6d-8d9e3db1b49f`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `f3095330-29ea-417e-9032-0362d5b8aed1`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc rg -n 'cancelled|aborted|signal.reason|tool_execution_started|tool_execution_completed|before|reusable|TOOL_EXECUTION_FAILED|TOOL_CALL_CANCELLED' /mnt/data/vii-h-design-review-live/test/run-control.test.ts /mnt/data/vii-h-design-review-live/test/agent-event.test.ts /mnt/data/vii-h-design-review-live/test/tool-runtime.test.ts /mnt/data/vii-h-design-review-live/test/application-settlement.test.ts | head -190

### Public tool output

> Message ID: `61a537e0-697a-4477-aad4-0ae4b36ff965`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `dd412202-9c87-413b-8e32-6879e49c9bb4`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc sed -n '225,385p' /mnt/data/vii-h-design-review-live/test/run-control.test.ts; sed -n '125,168p' /mnt/data/vii-h-design-review-live/test/agent-event.test.ts; sed -n '1,132p' /mnt/data/vii-h-design-review-live/test/tool-runtime.test.ts; sed -n '215,245p' /mnt/data/vii-h-design-review-live/src/runtime/agent-runtime.ts

### Public tool output

> Message ID: `4c775823-371d-4321-82d3-22e34114b7cb`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — commentary

> Message ID: `4594d55e-e164-4054-9957-dad42c0e66c1`; content: `text`; channel: `commentary`; recipient: `all`

源码审查确认了两个需要在正式决策中修正的细节：`ToolExecutionCancelledError` 的现有说明只覆盖 Tool 调用阶段，扩展到审批等待时需要明确其语义；另外，Hook 的异常不能直接套用 Tool 执行异常的处理方式，否则可能泄露内部错误文本或破坏 VII-G 的配对规则。

我会将 26 条候选决策合并成少量正式决策，并保留旧编号的映射，避免学习记录失去可追踪性。

### ChatGPT

> Message ID: `a93de7cb-1d2d-49a8-86ec-a9f6a1b15e78`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H：Design Decision Review

<badge color="success">Architecture Analysis 完成 · 正式决策审查</badge>

**审查基线：** Part VII-G Done → Part VII-H beforeToolCall + 简单 Approval

**本轮范围：** 统一审核 H-AD01～26、消除重复和冲突、确定 TypeScript 契约、冻结验收标准。不修改代码，不生成 Codex Implementation Task。

## 一、审查结论

基于你上传的 `source-review(20261014-031653).zip`、Part VII README 和 VII-G 最终 Architecture Record，我认为：

**VII-H 的整体设计方向可以保留，但原来的 26 条候选决策不适合原样全部冻结。**

经过合并，建议收敛成 **10 条正式 Architecture Decisions**。

<box border radius="lg" padding={3} gap={2}>
  <text color="secondary" weight="medium" size="xs">设计审查结果</text>
  <grid columns={3} gap={2}>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>26</title>
        <caption>原候选决策</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>10</title>
        <caption>建议正式决策</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>0</title>
        <caption>必须重构的既有模块</caption>
      </box>
    </grid-item>
  </grid>
</box>

这次审查需要特别修正四个容易被忽略的问题。

| 审查发现 | 处理意见 |
|---|---|
| 原候选将 Hook 的位置、职责和注入方式拆成多条 | 合并决策，避免同一问题重复冻结 |
| Abort 只传 `signal`，不保证 Hook Promise 能被打断 | Executor 必须拥有可中断等待的保证 |
| Hook Error 转成 ToolResult，可能泄露异常信息 | 使用独立错误码和固定的安全消息 |
| 现有 Cancellation Error 注释强调 Tool invocation | 允许复用错误类型，但必须澄清其覆盖执行前门禁的语义 |

同时确认：**无需新增 RuntimeMessage、RunOutcome、SessionStore 状态，也不需要修改 ContextBuilder 或引入 ApprovalManager。**

## 二、现有代码的真实边界

为避免设计脱离实现，这次对照的是压缩包内的真实代码，而非此前讨论中的示意接口。

| 文件 | 当前事实 | 本轮结论 |
|---|---|---|
| `src/runtime/agent-runtime.ts` | 构造函数创建 Executor；Runtime 唯一写入消息；单实例 Active Run | 只扩展可选 Hook 配置和转发 |
| `src/tools/tool-executor.ts` | Registry → Ajv → Clone → Tool.execute；只有工具调用异常被转成普通失败 | 在 Schema 校验成功后增加门禁 |
| `src/tools/tool.ts` | ToolResult 为 success / error 两种结构 | 只扩展 ToolError.code |
| `src/runtime/agent-event.ts` | 六种事件，同步 Subscriber | 不新增审批事件 |
| `src/messages/validate-conversation.ts` | 验证完整 ToolCall 批次，不解释 Result.content 的业务内容 | 不需要修改 |
| `src/demo/conversation-workflow.ts` | Run settle 后保存；Run / Persistence 独立结算 | 不改变保存时机 |

其中有一个重要的实现细节：

当前 `ToolExecutor.execute()` 对 Tool 的普通异常返回 `TOOL_EXECUTION_FAILED`，但 Schema 编译异常等执行器内部错误会传播出去。

所以我们要增加的是一个**专属于 Hook 的异常归一化边界**，而不是将整个 Executor 包进一个无差别的 `try/catch`。

否则 VII-C 已经建立的错误归因会被破坏。

---

## 三、26 条候选决策如何收敛？

为了保留学习记录，我建议不覆盖此前 H-AD01～26 的历史含义。

正式决策采用 `H-DD01～H-DD10`（H Design Decision），并记录旧编号映射。

| 正式 ID | 最终决策主题 | 原候选 H-AD |
|---|---|---|
| H-DD01 | 执行门禁的准确位置 | 01 |
| H-DD02 | Hook 所有权及构造注入 | 02、21、22 |
| H-DD03 | 异步 Hook + 最终 allow / deny | 03、05、06 |
| H-DD04 | 参数不可替换及引用隔离 | 04、23、24 |
| H-DD05 | Deny → 失败 ToolResult | 07、09 |
| H-DD06 | Hook Error → 安全失败 ToolResult | 08、10 |
| H-DD07 | Executor 保证审批等待可中断 | 15、16、20 |
| H-DD08 | Abort 归因、竞争及完整配对 | 11、12、13、17、18、19 |
| H-DD09 | 保持 AgentEvent 兼容 | 25 |
| H-DD10 | 保持 Session / Recovery 兼容 | 14、26 |

<caption>映射覆盖 H-AD01～26 全部候选编号。此前已确认的 A2、Hook Error 方案 A、Abort 方案 B 均被保留，没有推翻用户已经作出的架构选择。</caption>

这 10 条不是十套新组件，而是对现有 Runtime 执行链的十项约束。

## 四、正式 Architecture Decisions

### H-DD01：执行前门禁的位置

**决定：** `beforeToolCall` 在 ToolExecutor 内，Tool 查找和 Ajv 参数校验成功之后、实际 `Tool.execute()` 之前执行。

执行顺序冻结为：

```text
ToolCall
   ↓
Registry Lookup
   ↓
Schema Compile / Validation
   ↓
校验后的执行参数
   ↓
beforeToolCall（新增）
   ↓
allow / deny / error / abort
   ↓
Tool.execute（仅允许且未取消）
```

这保证不重复实现 Tool Validation。

如果 Tool 不存在或参数非法，Hook 不被调用，既有错误码和 Tool Loop 行为保持不变。

### H-DD02：所有权和注入方式

**决定：** Application 提供 Hook，`AgentRuntimeOptions` 构造注入，Runtime 传给 Executor，Executor 强制落实决策。

不引入：

- 每次 `run()` 重新配置 Hook。
- 独立 `ApprovalManager`。
- 运行中的 `setHook()` / Hot Reload。

直接调用 `ToolExecutor.execute()` 的测试和使用场景，也必须支持同一个可选 Hook。

同一 Runtime 实例可跨多个 Run 复用构造时的 Hook；Hook 自身不属于持久化数据。

### H-DD03：异步 Hook 与最终决策

**决定：** Hook 可以同步或异步完成，但最终只返回两种合法决定：

`allow` 或 `deny`。

没有第三种 `requireApproval`。

需要审批时，由 Application 的 Hook 自行等待人工决定。

未配置 Hook 时沿用旧路径；配置 Hook 但返回无效值时，绝不默认允许执行。

### H-DD04：参数隔离和执行一致性

**决定：** Hook 获取经过校验的 ToolCall 数据副本，不获取实际执行参数的可变引用。

最终执行的参数与 Schema 校验通过的参数保持一致。

Hook 不能通过返回值修改工具名称、ToolCall ID 或参数。

这里沿用现有的 `structuredClone` 思路，不引入 deepFreeze、不可变状态框架，也不增加第二次 Ajv Validation。

注意，TypeScript 的 `readonly` 只是编译期约束；真正防止参数引用污染的是运行时的数据隔离。

### H-DD05：明确拒绝的结果

**决定：** Hook 返回 `deny` 后：

- 不调用 `Tool.execute()`。
- 返回 `success: false` 的 ToolResult。
- 使用独立错误码 `TOOL_EXECUTION_DENIED`。
- Runtime 将其作为对应 ToolCall 的真实结果提交。
- Agent Loop 可以继续。

Deny 不等于 Abort，也不意味着 Run 必须失败。

### H-DD06：Hook 异常的处理

**决定：** Hook 抛出普通异常、Promise reject 或返回非法决策时：

- 不执行 Tool。
- 返回 `TOOL_PRE_EXECUTION_FAILED`。
- ToolResult 中使用固定、安全的错误描述。
- 不把任意原始 Error.message 或 Stack 直接传给模型。
- 不将普通 Hook Error 伪装为人工 Deny 或 Caller Abort。

这里存在一条明确的异常边界：Hook 失败转换为 ToolResult；Executor 其他原有内部异常继续保持既有行为。

### H-DD07：可中断的异步审批等待

**决定：** Executor 必须能够结束对 Hook Promise 的等待，即使 Application Handler 本身没有及时响应 Abort。

Hook 同时接收 Caller 原始 `AbortSignal`，供它协作停止自身任务。

Executor 不负责取消所有外部网络操作，也不提供审批超时调度器。

这意味着可以停止当前 Runtime 等待，但不能宣称已经撤销外部审批系统中的请求。

### H-DD08：Abort 归因和提交规则

**决定：** 复用 VII-F 已有的 `ToolExecutionCancelledError`、`TOOL_CALL_CANCELLED`、`#appendCancelledToolCalls()` 和 `RunOutcome.aborted`。

要求：

- Hook 等待期间发生 Abort，当前及剩余未执行 ToolCall 完整配对。
- Hook 返回 allow 后、Tool 真正启动前，再检查 Signal。
- 迟到的 allow 不能重新触发工具。
- 已提交结果不被改写。
- 同一个 ToolCall 不重复提交 ToolResult。
- 不因为 Signal 随后被取消，就把已经确认的独立 Hook Error 无条件重新归因成取消。

这里需要对现有 Cancellation Error 的文档说明作一处最小范围的语义澄清：它属于 ToolExecutor 执行边界的取消证明，执行前 Hook 等待也包含在这一边界中。

不建议另外创建一套 `ApprovalCancelledError`。

### H-DD09：AgentEvent 不变

**决定：** 保留原有六种事件，以及 `tool_execution_started` 在进入 Executor 前发布的时机。

因此：

- Deny / Hook Error：提交 ToolResult 后发 `tool_execution_completed`。
- 审批等待时 Abort：按照 VII-F 已有行为，不伪造 `tool_execution_completed`。
- maxTurns skipped：不发 Tool Execution 事件。
- Subscriber 仍然只观察，不拥有执行授权。

Approval 的 Web/CLI 交互由 Application Hook 自行通知 UI。

### H-DD10：Session / Recovery 不变

**决定：** 不新增审批状态消息，不扩展 RuntimeState、SessionSnapshot、Conversation Validator 或 CAS 契约。

Deny / Hook Error 的失败 ToolResult 和 Abort 的取消结果，遵守现有完整配对规则。

审批中的 Promise、Signal 和 Handler 不持久化。

VII-G 的 `Run → Validate → Save` 顺序与 `reusable` 语义继续成立。

以上十条构成正式冻结建议；下一部分把它们落到可供 Codex 实施的 TypeScript 公共契约和可验证行为上。


### ChatGPT

> Message ID: `43e35ab3-3f5d-4d90-b566-4534b970aa6a`; content: `text`; channel: `final`; recipient: `all`

# Part VII-H：Design Decision Review

<badge color="success">Architecture Analysis 完成 · 正式决策审查</badge>

**审查基线：** Part VII-G Done → Part VII-H beforeToolCall + 简单 Approval

**本轮范围：** 统一审核 H-AD01～26、消除重复和冲突、确定 TypeScript 契约、冻结验收标准。不修改代码，不生成 Codex Implementation Task。

## 一、审查结论

基于你上传的 `source-review(20261014-031653).zip`、Part VII README 和 VII-G 最终 Architecture Record，我认为：

**VII-H 的整体设计方向可以保留，但原来的 26 条候选决策不适合原样全部冻结。**

经过合并，建议收敛成 **10 条正式 Architecture Decisions**。

<box border radius="lg" padding={3} gap={2}>
  <text color="secondary" weight="medium" size="xs">设计审查结果</text>
  <grid columns={3} gap={2}>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>26</title>
        <caption>原候选决策</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>10</title>
        <caption>建议正式决策</caption>
      </box>
    </grid-item>
    <grid-item>
      <box gap={1}>
        <title size="2xl" color="default" tabularNums>0</title>
        <caption>必须重构的既有模块</caption>
      </box>
    </grid-item>
  </grid>
</box>

这次审查需要特别修正四个容易被忽略的问题。

| 审查发现 | 处理意见 |
|---|---|
| 原候选将 Hook 的位置、职责和注入方式拆成多条 | 合并决策，避免同一问题重复冻结 |
| Abort 只传 `signal`，不保证 Hook Promise 能被打断 | Executor 必须拥有可中断等待的保证 |
| Hook Error 转成 ToolResult，可能泄露异常信息 | 使用独立错误码和固定的安全消息 |
| 现有 Cancellation Error 注释强调 Tool invocation | 允许复用错误类型，但必须澄清其覆盖执行前门禁的语义 |

同时确认：**无需新增 RuntimeMessage、RunOutcome、SessionStore 状态，也不需要修改 ContextBuilder 或引入 ApprovalManager。**

## 二、现有代码的真实边界

为避免设计脱离实现，这次对照的是压缩包内的真实代码，而非此前讨论中的示意接口。

| 文件 | 当前事实 | 本轮结论 |
|---|---|---|
| `src/runtime/agent-runtime.ts` | 构造函数创建 Executor；Runtime 唯一写入消息；单实例 Active Run | 只扩展可选 Hook 配置和转发 |
| `src/tools/tool-executor.ts` | Registry → Ajv → Clone → Tool.execute；只有工具调用异常被转成普通失败 | 在 Schema 校验成功后增加门禁 |
| `src/tools/tool.ts` | ToolResult 为 success / error 两种结构 | 只扩展 ToolError.code |
| `src/runtime/agent-event.ts` | 六种事件，同步 Subscriber | 不新增审批事件 |
| `src/messages/validate-conversation.ts` | 验证完整 ToolCall 批次，不解释 Result.content 的业务内容 | 不需要修改 |
| `src/demo/conversation-workflow.ts` | Run settle 后保存；Run / Persistence 独立结算 | 不改变保存时机 |

其中有一个重要的实现细节：

当前 `ToolExecutor.execute()` 对 Tool 的普通异常返回 `TOOL_EXECUTION_FAILED`，但 Schema 编译异常等执行器内部错误会传播出去。

所以我们要增加的是一个**专属于 Hook 的异常归一化边界**，而不是将整个 Executor 包进一个无差别的 `try/catch`。

否则 VII-C 已经建立的错误归因会被破坏。

---

## 三、26 条候选决策如何收敛？

为了保留学习记录，我建议不覆盖此前 H-AD01～26 的历史含义。

正式决策采用 `H-DD01～H-DD10`（H Design Decision），并记录旧编号映射。

| 正式 ID | 最终决策主题 | 原候选 H-AD |
|---|---|---|
| H-DD01 | 执行门禁的准确位置 | 01 |
| H-DD02 | Hook 所有权及构造注入 | 02、21、22 |
| H-DD03 | 异步 Hook + 最终 allow / deny | 03、05、06 |
| H-DD04 | 参数不可替换及引用隔离 | 04、23、24 |
| H-DD05 | Deny → 失败 ToolResult | 07、09 |
| H-DD06 | Hook Error → 安全失败 ToolResult | 08、10 |
| H-DD07 | Executor 保证审批等待可中断 | 15、16、20 |
| H-DD08 | Abort 归因、竞争及完整配对 | 11、12、13、17、18、19 |
| H-DD09 | 保持 AgentEvent 兼容 | 25 |
| H-DD10 | 保持 Session / Recovery 兼容 | 14、26 |

<caption>映射覆盖 H-AD01～26 全部候选编号。此前已确认的 A2、Hook Error 方案 A、Abort 方案 B 均被保留，没有推翻用户已经作出的架构选择。</caption>

这 10 条不是十套新组件，而是对现有 Runtime 执行链的十项约束。

## 四、正式 Architecture Decisions

### H-DD01：执行前门禁的位置

**决定：** `beforeToolCall` 在 ToolExecutor 内，Tool 查找和 Ajv 参数校验成功之后、实际 `Tool.execute()` 之前执行。

执行顺序冻结为：

```text
ToolCall
   ↓
Registry Lookup
   ↓
Schema Compile / Validation
   ↓
校验后的执行参数
   ↓
beforeToolCall（新增）
   ↓
allow / deny / error / abort
   ↓
Tool.execute（仅允许且未取消）
```

这保证不重复实现 Tool Validation。

如果 Tool 不存在或参数非法，Hook 不被调用，既有错误码和 Tool Loop 行为保持不变。

### H-DD02：所有权和注入方式

**决定：** Application 提供 Hook，`AgentRuntimeOptions` 构造注入，Runtime 传给 Executor，Executor 强制落实决策。

不引入：

- 每次 `run()` 重新配置 Hook。
- 独立 `ApprovalManager`。
- 运行中的 `setHook()` / Hot Reload。

直接调用 `ToolExecutor.execute()` 的测试和使用场景，也必须支持同一个可选 Hook。

同一 Runtime 实例可跨多个 Run 复用构造时的 Hook；Hook 自身不属于持久化数据。

### H-DD03：异步 Hook 与最终决策

**决定：** Hook 可以同步或异步完成，但最终只返回两种合法决定：

`allow` 或 `deny`。

没有第三种 `requireApproval`。

需要审批时，由 Application 的 Hook 自行等待人工决定。

未配置 Hook 时沿用旧路径；配置 Hook 但返回无效值时，绝不默认允许执行。

### H-DD04：参数隔离和执行一致性

**决定：** Hook 获取经过校验的 ToolCall 数据副本，不获取实际执行参数的可变引用。

最终执行的参数与 Schema 校验通过的参数保持一致。

Hook 不能通过返回值修改工具名称、ToolCall ID 或参数。

这里沿用现有的 `structuredClone` 思路，不引入 deepFreeze、不可变状态框架，也不增加第二次 Ajv Validation。

注意，TypeScript 的 `readonly` 只是编译期约束；真正防止参数引用污染的是运行时的数据隔离。

### H-DD05：明确拒绝的结果

**决定：** Hook 返回 `deny` 后：

- 不调用 `Tool.execute()`。
- 返回 `success: false` 的 ToolResult。
- 使用独立错误码 `TOOL_EXECUTION_DENIED`。
- Runtime 将其作为对应 ToolCall 的真实结果提交。
- Agent Loop 可以继续。

Deny 不等于 Abort，也不意味着 Run 必须失败。

### H-DD06：Hook 异常的处理

**决定：** Hook 抛出普通异常、Promise reject 或返回非法决策时：

- 不执行 Tool。
- 返回 `TOOL_PRE_EXECUTION_FAILED`。
- ToolResult 中使用固定、安全的错误描述。
- 不把任意原始 Error.message 或 Stack 直接传给模型。
- 不将普通 Hook Error 伪装为人工 Deny 或 Caller Abort。

这里存在一条明确的异常边界：Hook 失败转换为 ToolResult；Executor 其他原有内部异常继续保持既有行为。

### H-DD07：可中断的异步审批等待

**决定：** Executor 必须能够结束对 Hook Promise 的等待，即使 Application Handler 本身没有及时响应 Abort。

Hook 同时接收 Caller 原始 `AbortSignal`，供它协作停止自身任务。

Executor 不负责取消所有外部网络操作，也不提供审批超时调度器。

这意味着可以停止当前 Runtime 等待，但不能宣称已经撤销外部审批系统中的请求。

### H-DD08：Abort 归因和提交规则

**决定：** 复用 VII-F 已有的 `ToolExecutionCancelledError`、`TOOL_CALL_CANCELLED`、`#appendCancelledToolCalls()` 和 `RunOutcome.aborted`。

要求：

- Hook 等待期间发生 Abort，当前及剩余未执行 ToolCall 完整配对。
- Hook 返回 allow 后、Tool 真正启动前，再检查 Signal。
- 迟到的 allow 不能重新触发工具。
- 已提交结果不被改写。
- 同一个 ToolCall 不重复提交 ToolResult。
- 不因为 Signal 随后被取消，就把已经确认的独立 Hook Error 无条件重新归因成取消。

这里需要对现有 Cancellation Error 的文档说明作一处最小范围的语义澄清：它属于 ToolExecutor 执行边界的取消证明，执行前 Hook 等待也包含在这一边界中。

不建议另外创建一套 `ApprovalCancelledError`。

### H-DD09：AgentEvent 不变

**决定：** 保留原有六种事件，以及 `tool_execution_started` 在进入 Executor 前发布的时机。

因此：

- Deny / Hook Error：提交 ToolResult 后发 `tool_execution_completed`。
- 审批等待时 Abort：按照 VII-F 已有行为，不伪造 `tool_execution_completed`。
- maxTurns skipped：不发 Tool Execution 事件。
- Subscriber 仍然只观察，不拥有执行授权。

Approval 的 Web/CLI 交互由 Application Hook 自行通知 UI。

### H-DD10：Session / Recovery 不变

**决定：** 不新增审批状态消息，不扩展 RuntimeState、SessionSnapshot、Conversation Validator 或 CAS 契约。

Deny / Hook Error 的失败 ToolResult 和 Abort 的取消结果，遵守现有完整配对规则。

审批中的 Promise、Signal 和 Handler 不持久化。

VII-G 的 `Run → Validate → Save` 顺序与 `reusable` 语义继续成立。

以上十条构成正式冻结建议；下一部分把它们落到可供 Codex 实施的 TypeScript 公共契约和可验证行为上。

## 五、最终 TypeScript 契约

下面是根据 H-DD01～10 推导出的**待实现公共接口**，不是当前仓库已经存在的代码。

### 5.1 beforeToolCall 核心契约

<CodeBlock language="typescript" editable={false}>
import type { ToolCall } from "../model/tool.ts";

export type BeforeToolCallDecision =
  | Readonly<{ type: "allow" }>
  | Readonly<{ type: "deny" }>;

export interface BeforeToolCallContext {
  readonly toolCall: Readonly<ToolCall>;
  readonly signal?: AbortSignal;
}

export type BeforeToolCallHook = (
  context: BeforeToolCallContext
) =>
  | BeforeToolCallDecision
  | Promise<BeforeToolCallDecision>;
</CodeBlock>

我建议第一版只包含这些字段。

| 字段 | 为什么需要 |
|---|---|
| `toolCall.id` | 识别当前工具调用 |
| `toolCall.name` | 识别要执行的工具 |
| `toolCall.arguments` | 审查已经过 Schema 校验的参数 |
| `signal` | 配合 Caller 取消审批等待 |

**这里特意没有添加 `reason`、`requestId`、`sessionId`、`approvalStatus` 等字段。**

其中 `reason` 虽然方便展示拒绝原因，但还需要设计它是否可被模型读取、是否允许包含内部信息。当前最小 Approval 可以使用固定的拒绝消息，不需要提前增加这一数据通道。

此外，`Readonly<ToolCall>` 只提供浅层 TypeScript 约束。实现必须通过独立拷贝保护嵌套参数，不能仅凭 `readonly` 宣称实现了深层隔离。

### 5.2 AgentRuntimeOptions 增量扩展

<CodeBlock language="typescript" editable={false}>
export interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];

  // VII-H 新增
  beforeToolCall?: BeforeToolCallHook;
}
</CodeBlock>

现有构造函数保持不变：

```ts
new AgentRuntime(provider, options);
```

`RunOptions` 仍只包含可选 `signal`，不新增每次运行的 Hook 参数。

### 5.3 ToolExecutorOptions

<CodeBlock language="typescript" editable={false}>
export interface ToolExecutorOptions {
  beforeToolCall?: BeforeToolCallHook;
}
</CodeBlock>

候选构造签名：

```ts
constructor(
  registry: ToolRegistry,
  options?: ToolExecutorOptions
);
```

原有的 `new ToolExecutor(registry)` 继续有效。

`execute(call, options)` 的现有签名不需要改变，`ToolExecutionOptions.signal` 继续使用原契约。

### 5.4 ToolError 扩展

在原有错误码基础上，只增加：

```ts
| "TOOL_EXECUTION_DENIED"
| "TOOL_PRE_EXECUTION_FAILED"
```

现有 `ToolResult` 联合类型不变。

建议的序列化内容如下。

<box gap={2}>
  <text weight="medium" size="sm">明确拒绝</text>
  <CodeBlock language="json" editable={false}>
{
  "success": false,
  "error": {
    "code": "TOOL_EXECUTION_DENIED",
    "message": "Tool execution was denied."
  }
}
</CodeBlock>
  <text weight="medium" size="sm">Hook 自身失败</text>
  <CodeBlock language="json" editable={false}>
{
  "success": false,
  "error": {
    "code": "TOOL_PRE_EXECUTION_FAILED",
    "message": "Pre-execution authorization failed."
  }
}
</CodeBlock>
</box>

采用固定安全消息，意味着原始 Hook 异常对象不进入 RuntimeMessage。需要更详细诊断时，由 Application 在自己的边界记录，不为此新增 Runtime 日志系统。

### 5.5 不需要修改的公共契约

| 接口 | 本轮处理 |
|---|---|
| `ToolCall` | 不变 |
| `ToolDefinition` | 不变 |
| `Tool.execute()` | 不变 |
| `ToolResult` 数据结构 | 不变，仅扩展错误码 |
| `RuntimeMessage` | 不变 |
| `RuntimeState` | 不变 |
| `RunOutcome` | 不变 |
| `AgentEvent` | 不变 |
| `SessionSnapshot` | 不变 |
| `SessionStore` | 不变 |
| `validateConversation()` | 不变 |

这也是本轮架构控制最重要的成果：**新能力主要增加在 Executor 执行前，而不是蔓延到整个 Runtime。**

---

## 六、异常与 Abort 的最终结算规则

这里需要比前几轮更加精确，避免写代码时因竞争条件出现模糊行为。

### 6.1 统一执行决策表

| 执行前状态 | Executor 结果 | Tool 是否执行 | Runtime 后续 |
|---|---|---|---|
| 没配置 Hook | 原有路径 | 按原有规则 | 不变 |
| Hook 返回 allow | 正常调用 Tool | 是 | 正常提交 |
| Hook 返回 deny | DENIED Result | 否 | 继续 Loop |
| Hook 普通异常 | PRE_EXECUTION_FAILED Result | 否 | 继续 Loop |
| Hook 返回非法决策 | PRE_EXECUTION_FAILED Result | 否 | 继续 Loop |
| 等待 Hook 时 Abort | 抛归因明确的取消错误 | 否 | 补齐 cancelled，Run aborted |
| Hook allow 后、Tool 开始前 Abort | 取消 | 否 | 补齐 cancelled，Run aborted |
| Tool 已开始后 Abort | 遵循 VII-F 现有约定 | 可能已经执行 | 不回滚已提交事实 |

### 6.2 同时发生 Hook Error 和 Abort，哪个优先？

这里建议把之前“谁先发生”细化为：

**以 Executor 实际观察并接受的结算边界为准，不根据事后 `signal.aborted` 重新解释已经确定的普通错误。**

例如：

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">场景 A：Hook Error 已确认，随后 Abort</text>
  <row align="center" gap={2} wrap="wrap">
    <badge>Hook Error</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>失败 Result 已提交</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>Abort</badge>
  </row>
  结果：保留 `TOOL_PRE_EXECUTION_FAILED`，整个 Run 可以因随后取消而返回 `aborted`。不将既有失败改写成 Cancelled。
  <divider color="subtle"/>
  <text weight="medium">场景 B：Abort 先终止等待，Hook 后续才出错</text>
  <row align="center" gap={2} wrap="wrap">
    <badge>Abort</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>Cancelled 已提交</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>迟到 Hook Error</badge>
  </row>
  结果：只保留 Cancelled，不追加新的失败 ToolResult，也不让迟到的 Promise rejection 产生未处理异常。
</box>

需要强调：这不是根据墙上时钟精确判断两个事件谁先发生，而是由同一条异步结算路径决定哪一个结果被接受。

对于两个在同一轮事件循环附近发生的竞争，测试应该使用可控 Promise 和 AbortController 构造确定性执行顺序，而不是依赖任意延迟。

### 6.3 可中断等待的最小实现约束

虽然本轮不实现代码，但设计上必须确保：

1. 等待开始前及等待期间可以观察 Abort。
2. Hook 不响应 Abort，也不能永久阻止 Runtime 结束已经取消的 Run。
3. Hook Promise 的迟到完成不能重新进入 Tool.execute。
4. 等待结束时清理 Executor 自己注册的 Abort listener。
5. 迟到的 Promise reject 不成为未处理异常。
6. 不取消或覆盖已经提交的 ToolResult。

这里不需要独立的 Approval Task、后台任务管理器或持久化队列。

**还有一个边界需要接受：如果 Caller 从不提供 AbortSignal，Hook 又永远不结束，那么 Run 可以一直等待。** 本阶段不加入默认审批超时器。

---

## 七、Runtime Verification 测试矩阵

以下全部属于 VII-H 的**待实现验收用例**，不是已通过的测试。

我建议测试尽量复用现有 `MockModelProvider`、`ToolRegistry`、确定性异步控制和 `runAndSave()` 测试环境。

### 7.1 基础执行和 Hook 契约

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T01 | 不提供 Hook | 行为与旧 Executor 一致 |
| H-T02 | Hook 返回 allow | Hook 一次，Tool 一次，success |
| H-T03 | Hook 返回 deny | Tool 零次，DENIED Result |
| H-T04 | Hook 同步 throw | Tool 零次，PRE_EXECUTION_FAILED |
| H-T05 | Hook Promise reject | 同上，Run 可继续 |
| H-T06 | Hook 返回 undefined / null / 非法决定 | 不放行，产生安全失败 |
| H-T07 | Tool 不存在 | 不触发 Hook，仍为 TOOL_NOT_FOUND |
| H-T08 | 参数非法 | 不触发 Hook，仍为 INVALID_ARGUMENTS |
| H-T09 | Schema 编译等原有内部错误 | 保留既有异常传播边界 |
| H-T10 | 直接调用 ToolExecutor | 同样执行 Hook 检查 |

### 7.2 参数隔离与数据安全

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T11 | Hook 修改嵌套 arguments | 实际 Tool 参数不变 |
| H-T12 | Hook 修改自己的 ToolCall ID / name | 执行目标及结果配对不变 |
| H-T13 | Hook 修改收到的数据后返回 deny | RuntimeState 记录的 ToolCall 不变 |
| H-T14 | Hook Error 含敏感信息 | ToolResult 和下一轮 ModelRequest 不包含原始秘密 |
| H-T15 | 多次 Run 复用同一 Hook | 调用相互独立，配置不需要重新注入 |

这里的 H-T11～13 尤其重要。它们不只是类型测试，而应通过真实执行路径确认引用隔离。

### 7.3 Approval × Abort

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T16 | Hook 永远 pending，然后 Abort | Run 正常返回 aborted，释放 #active |
| H-T17 | Hook 收到 AbortSignal | 与 Caller 提供的是同一个对象 |
| H-T18 | Hook 内同步触发 Abort | 即使返回 allow，Tool 也不执行 |
| H-T19 | Abort 后 Hook 迟到 allow | Tool 零次，没有重复 Result |
| H-T20 | Abort 后 Hook 迟到 reject | 无未处理异常，没有错误结果覆盖 |
| H-T21 | Hook Error 先结算、随后 Abort | 保留普通失败归因，Run 可 aborted |
| H-T22 | Abort 先结束等待、Hook 后出错 | 只提交 Cancelled |
| H-T23 | A 成功、B 审批等待中 Abort、C 尚未开始 | A success，B/C cancelled |
| H-T24 | 审批等待期间再次调用同一 Runtime.run() | 并发 Run Fail Fast，不修改 State |
| H-T25 | Abort settle 后再次 Run | Active ownership 已释放 |

### 7.4 Event、Loop 和 Session 回归

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T26 | Deny / Hook Error 的事件 | started → Result commit → completed |
| H-T27 | 审批等待期间 Abort | started 后无 completed，保持 VII-F 语义 |
| H-T28 | maxTurns 耗尽 | 不触发 Hook、不执行 Tool，全部 skipped |
| H-T29 | 三个 Tool 混合 allow / deny / error | 全部配对，顺序执行，下一轮模型接收完整结果 |
| H-T30 | Deny 后模型返回最终回答 | Run completed，不会误判 aborted |
| H-T31 | 审批结束后 runAndSave | 合法历史保存并可从 SQLite 恢复 |
| H-T32 | 恢复包含 Deny 的历史 | 不重新请求历史审批、不重放旧 Tool |
| H-T33 | Run completed 但 Save Conflict | Run 结果不变，reusable false |

上述 33 个是**建议覆盖的独立测试场景编号**，不要求一定写成 33 个测试函数，也不表示最终测试总数只能增加 33。

尤其需要保留 VII-G 之前的 176 项回归测试，确保新增 Hook 没有破坏既有模块。

### 7.5 工程验证门槛

| 验证项 | 通过标准 |
|---|---|
| `npm test` | 所有既有与新增测试通过 |
| `npm run build` | 通过 |
| `npm run typecheck:tests` | 严格类型检查通过 |
| `npm run demo:tools` | 原工具链不回归 |
| `npm run demo:recovery` | 原 Session 恢复链不回归 |
| VII-H 确定性 Demo | allow、deny、人工等待、Abort 路径可观察 |
| Code Review | 没有消息配对、执行授权或取消归因方面的 Must Fix |

由于用户明确要求本轮只审查设计，**上述测试尚未执行，也没有修改任何文件**。

---

## 八、与 VII-A～VII-G 的完整兼容性审查

| Milestone | 影响范围 | Review 结果 |
|---|---|---|
| VII-A：ModelProvider | 无接口变更 | 兼容 |
| VII-B：State + Loop | 新增控制路径，保持唯一消息提交者 | 兼容 |
| VII-C：Tool Executor | 增加校验后的门禁和两个错误码 | 有控制的增量扩展 |
| VII-D：ContextBuilder | 继续使用既有 ToolResult 投影 | 兼容 |
| VII-E：AgentEvent | 保留六种事件和同步观察者 | 兼容 |
| VII-F：Abort | 扩展可取消的执行前等待区间 | 有控制的增量扩展 |
| VII-G：SessionStore | 只保存稳定 ToolResult，完整配对 | 兼容 |

这里有两处必须在 Code Review 阶段特别检查。

**第一处：不能为了统一处理 Hook Error，把 Executor 原有的所有异常都吞掉。**

例如 Schema 编译错误如果被错误归类为 `TOOL_PRE_EXECUTION_FAILED`，就改变了 VII-C 的错误契约。

**第二处：不能把 Abort 直接变成 Deny。**

否则 `RunOutcome`、ToolResult、AgentEvent 以及 Session 中的实际事实可能全部产生语义偏差。

---

## 九、对后续 VII-I 和营销 Agent 的适配

VII-I 是 Weather Agent 完整链路，因此只需验证它能够调用 `beforeToolCall` 并正确处理允许与拒绝。

不需要在 VII-H 提前实现天气接口。

从更长期的营销 Agent 来看，这个设计同样适用。

| 业务工具 | Application 策略示例 | Hook 最终决策 |
|---|---|---|
| 查询营销活动 | 自动放行 | allow |
| 查询优惠券 | 自动放行 | allow |
| 创建营销活动 | 需要运营确认 | 等待后 allow / deny |
| 发放优惠券 | 需要运营确认 | 等待后 allow / deny |
| 不允许的批量删除操作 | 策略直接拒绝 | deny |

这只是展示适配能力，不代表这些业务规则已写入 Runtime。

而且未来营销系统的服务端 API 仍必须自行进行身份鉴别、权限检查和业务校验。`beforeToolCall` 是 Agent 执行链的门禁，不是外部 API 的唯一安全边界。

---

## 十、最终架构快照

<box border radius="xl" padding={3} gap={2}>
  <text color="secondary" weight="medium" size="xs">Part VII-H · 拟冻结的 Runtime 架构</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">注入 Hook / Approval Handler</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">Single Active Run · Agent Loop · RuntimeState</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="lg" padding={3} width="100%" gap={2}>
      <text textAlign="center" weight="medium">ToolExecutor</text>
      <box background="surface-secondary" radius="md" padding={3} align="center">
        <text size="sm">Lookup + Ajv Validation</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box border={{size:2,color:"info"}} radius="md" padding={3} gap={1} align="center">
        **beforeToolCall**
        <text size="xs" color="secondary">异步 · 参数隔离 · Abort</text>
      </box>
      <grid columns={3} gap={2}>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="check" color="success"/>
            <text weight="medium" size="xs">allow</text>
            <caption textAlign="center">Tool.execute</caption>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="x" color="danger"/>
            <text weight="medium" size="xs">deny/error</text>
            <caption textAlign="center">失败 Result</caption>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="ban" color="danger"/>
            <text weight="medium" size="xs">abort</text>
            <caption textAlign="center">Cancelled</caption>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">ToolResult commit → Event → Next Model Turn</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">Run settlement → Conversation Validation → SessionStore</text>
    </box>
  </box>
</box>

## 十一、Design Decision Review 最终结论

<row align="center" gap={2}>
  <icon name="check-circle-2" color="success" size="lg"/>
  **Design Review：PASS**
</row>

我认为可以将 **H-DD01～H-DD10 作为 Part VII-H 的正式设计基线**。这次审查没有发现需要推翻 VII-A～VII-G 的架构问题；所有变化都可以通过对现有 ToolExecutor 和 AgentRuntime 的有限扩展完成。

本轮明确保持延期的内容包括 Durable Approval、审批持久化、独立 Approval Engine、审批生命周期事件、动态 Hook 热替换、跨实例协调和完整营销业务 API 集成。

当前工程学习流程的状态为：

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="check-circle" color="success"/>
      <text weight="medium">Architecture Analysis</text>
    </row>
    <text size="xs" color="secondary">完成</text>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="check-circle" color="success"/>
      <text weight="medium">Design Decision Review</text>
    </row>
    <text size="xs" color="secondary">完成</text>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Codex Implementation</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Runtime Verification / Debug</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Code Review + Theory Feedback</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Milestone Closure</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
</box>

**本节最核心的认知升级是：Tool Calling（工具调用）、Execution Authorization（执行授权）和 Tool Execution（工具实际执行）是三个不同的边界。**

LLM 提出 ToolCall，不等于获得执行权限；Hook 返回 allow，也不代表 Runtime 已经不可取消；只有经过授权并实际完成的工具执行，才产生对应的执行事实。

这套划分既能支撑 VII-I Weather Agent 的完整链路，也能为之后的营销业务 Agent 提供清晰的执行控制基础。

本轮到此停留在 Design Decision Review，不修改仓库，不生成 Codex 实现提示词。

### ChatGPT

> Message ID: `3a718503-52b2-43de-8271-700e8d538938`; content: `text`; channel: `final`; recipient: `all`

## 五、最终 TypeScript 契约

下面是根据 H-DD01～10 推导出的**待实现公共接口**，不是当前仓库已经存在的代码。

### 5.1 beforeToolCall 核心契约

<CodeBlock language="typescript" editable={false}>
import type { ToolCall } from "../model/tool.ts";

export type BeforeToolCallDecision =
  | Readonly<{ type: "allow" }>
  | Readonly<{ type: "deny" }>;

export interface BeforeToolCallContext {
  readonly toolCall: Readonly<ToolCall>;
  readonly signal?: AbortSignal;
}

export type BeforeToolCallHook = (
  context: BeforeToolCallContext
) =>
  | BeforeToolCallDecision
  | Promise<BeforeToolCallDecision>;
</CodeBlock>

我建议第一版只包含这些字段。

| 字段 | 为什么需要 |
|---|---|
| `toolCall.id` | 识别当前工具调用 |
| `toolCall.name` | 识别要执行的工具 |
| `toolCall.arguments` | 审查已经过 Schema 校验的参数 |
| `signal` | 配合 Caller 取消审批等待 |

**这里特意没有添加 `reason`、`requestId`、`sessionId`、`approvalStatus` 等字段。**

其中 `reason` 虽然方便展示拒绝原因，但还需要设计它是否可被模型读取、是否允许包含内部信息。当前最小 Approval 可以使用固定的拒绝消息，不需要提前增加这一数据通道。

此外，`Readonly<ToolCall>` 只提供浅层 TypeScript 约束。实现必须通过独立拷贝保护嵌套参数，不能仅凭 `readonly` 宣称实现了深层隔离。

### 5.2 AgentRuntimeOptions 增量扩展

<CodeBlock language="typescript" editable={false}>
export interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];

  // VII-H 新增
  beforeToolCall?: BeforeToolCallHook;
}
</CodeBlock>

现有构造函数保持不变：

```ts
new AgentRuntime(provider, options);
```

`RunOptions` 仍只包含可选 `signal`，不新增每次运行的 Hook 参数。

### 5.3 ToolExecutorOptions

<CodeBlock language="typescript" editable={false}>
export interface ToolExecutorOptions {
  beforeToolCall?: BeforeToolCallHook;
}
</CodeBlock>

候选构造签名：

```ts
constructor(
  registry: ToolRegistry,
  options?: ToolExecutorOptions
);
```

原有的 `new ToolExecutor(registry)` 继续有效。

`execute(call, options)` 的现有签名不需要改变，`ToolExecutionOptions.signal` 继续使用原契约。

### 5.4 ToolError 扩展

在原有错误码基础上，只增加：

```ts
| "TOOL_EXECUTION_DENIED"
| "TOOL_PRE_EXECUTION_FAILED"
```

现有 `ToolResult` 联合类型不变。

建议的序列化内容如下。

<box gap={2}>
  <text weight="medium" size="sm">明确拒绝</text>
  <CodeBlock language="json" editable={false}>
{
  "success": false,
  "error": {
    "code": "TOOL_EXECUTION_DENIED",
    "message": "Tool execution was denied."
  }
}
</CodeBlock>
  <text weight="medium" size="sm">Hook 自身失败</text>
  <CodeBlock language="json" editable={false}>
{
  "success": false,
  "error": {
    "code": "TOOL_PRE_EXECUTION_FAILED",
    "message": "Pre-execution authorization failed."
  }
}
</CodeBlock>
</box>

采用固定安全消息，意味着原始 Hook 异常对象不进入 RuntimeMessage。需要更详细诊断时，由 Application 在自己的边界记录，不为此新增 Runtime 日志系统。

### 5.5 不需要修改的公共契约

| 接口 | 本轮处理 |
|---|---|
| `ToolCall` | 不变 |
| `ToolDefinition` | 不变 |
| `Tool.execute()` | 不变 |
| `ToolResult` 数据结构 | 不变，仅扩展错误码 |
| `RuntimeMessage` | 不变 |
| `RuntimeState` | 不变 |
| `RunOutcome` | 不变 |
| `AgentEvent` | 不变 |
| `SessionSnapshot` | 不变 |
| `SessionStore` | 不变 |
| `validateConversation()` | 不变 |

这也是本轮架构控制最重要的成果：**新能力主要增加在 Executor 执行前，而不是蔓延到整个 Runtime。**

---

## 六、异常与 Abort 的最终结算规则

这里需要比前几轮更加精确，避免写代码时因竞争条件出现模糊行为。

### 6.1 统一执行决策表

| 执行前状态 | Executor 结果 | Tool 是否执行 | Runtime 后续 |
|---|---|---|---|
| 没配置 Hook | 原有路径 | 按原有规则 | 不变 |
| Hook 返回 allow | 正常调用 Tool | 是 | 正常提交 |
| Hook 返回 deny | DENIED Result | 否 | 继续 Loop |
| Hook 普通异常 | PRE_EXECUTION_FAILED Result | 否 | 继续 Loop |
| Hook 返回非法决策 | PRE_EXECUTION_FAILED Result | 否 | 继续 Loop |
| 等待 Hook 时 Abort | 抛归因明确的取消错误 | 否 | 补齐 cancelled，Run aborted |
| Hook allow 后、Tool 开始前 Abort | 取消 | 否 | 补齐 cancelled，Run aborted |
| Tool 已开始后 Abort | 遵循 VII-F 现有约定 | 可能已经执行 | 不回滚已提交事实 |

### 6.2 同时发生 Hook Error 和 Abort，哪个优先？

这里建议把之前“谁先发生”细化为：

**以 Executor 实际观察并接受的结算边界为准，不根据事后 `signal.aborted` 重新解释已经确定的普通错误。**

例如：

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">场景 A：Hook Error 已确认，随后 Abort</text>
  <row align="center" gap={2} wrap="wrap">
    <badge>Hook Error</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>失败 Result 已提交</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>Abort</badge>
  </row>
  结果：保留 `TOOL_PRE_EXECUTION_FAILED`，整个 Run 可以因随后取消而返回 `aborted`。不将既有失败改写成 Cancelled。
  <divider color="subtle"/>
  <text weight="medium">场景 B：Abort 先终止等待，Hook 后续才出错</text>
  <row align="center" gap={2} wrap="wrap">
    <badge>Abort</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>Cancelled 已提交</badge>
    <icon name="arrow-right" color="tertiary"/>
    <badge>迟到 Hook Error</badge>
  </row>
  结果：只保留 Cancelled，不追加新的失败 ToolResult，也不让迟到的 Promise rejection 产生未处理异常。
</box>

需要强调：这不是根据墙上时钟精确判断两个事件谁先发生，而是由同一条异步结算路径决定哪一个结果被接受。

对于两个在同一轮事件循环附近发生的竞争，测试应该使用可控 Promise 和 AbortController 构造确定性执行顺序，而不是依赖任意延迟。

### 6.3 可中断等待的最小实现约束

虽然本轮不实现代码，但设计上必须确保：

1. 等待开始前及等待期间可以观察 Abort。
2. Hook 不响应 Abort，也不能永久阻止 Runtime 结束已经取消的 Run。
3. Hook Promise 的迟到完成不能重新进入 Tool.execute。
4. 等待结束时清理 Executor 自己注册的 Abort listener。
5. 迟到的 Promise reject 不成为未处理异常。
6. 不取消或覆盖已经提交的 ToolResult。

这里不需要独立的 Approval Task、后台任务管理器或持久化队列。

**还有一个边界需要接受：如果 Caller 从不提供 AbortSignal，Hook 又永远不结束，那么 Run 可以一直等待。** 本阶段不加入默认审批超时器。

---

## 七、Runtime Verification 测试矩阵

以下全部属于 VII-H 的**待实现验收用例**，不是已通过的测试。

我建议测试尽量复用现有 `MockModelProvider`、`ToolRegistry`、确定性异步控制和 `runAndSave()` 测试环境。

### 7.1 基础执行和 Hook 契约

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T01 | 不提供 Hook | 行为与旧 Executor 一致 |
| H-T02 | Hook 返回 allow | Hook 一次，Tool 一次，success |
| H-T03 | Hook 返回 deny | Tool 零次，DENIED Result |
| H-T04 | Hook 同步 throw | Tool 零次，PRE_EXECUTION_FAILED |
| H-T05 | Hook Promise reject | 同上，Run 可继续 |
| H-T06 | Hook 返回 undefined / null / 非法决定 | 不放行，产生安全失败 |
| H-T07 | Tool 不存在 | 不触发 Hook，仍为 TOOL_NOT_FOUND |
| H-T08 | 参数非法 | 不触发 Hook，仍为 INVALID_ARGUMENTS |
| H-T09 | Schema 编译等原有内部错误 | 保留既有异常传播边界 |
| H-T10 | 直接调用 ToolExecutor | 同样执行 Hook 检查 |

### 7.2 参数隔离与数据安全

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T11 | Hook 修改嵌套 arguments | 实际 Tool 参数不变 |
| H-T12 | Hook 修改自己的 ToolCall ID / name | 执行目标及结果配对不变 |
| H-T13 | Hook 修改收到的数据后返回 deny | RuntimeState 记录的 ToolCall 不变 |
| H-T14 | Hook Error 含敏感信息 | ToolResult 和下一轮 ModelRequest 不包含原始秘密 |
| H-T15 | 多次 Run 复用同一 Hook | 调用相互独立，配置不需要重新注入 |

这里的 H-T11～13 尤其重要。它们不只是类型测试，而应通过真实执行路径确认引用隔离。

### 7.3 Approval × Abort

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T16 | Hook 永远 pending，然后 Abort | Run 正常返回 aborted，释放 #active |
| H-T17 | Hook 收到 AbortSignal | 与 Caller 提供的是同一个对象 |
| H-T18 | Hook 内同步触发 Abort | 即使返回 allow，Tool 也不执行 |
| H-T19 | Abort 后 Hook 迟到 allow | Tool 零次，没有重复 Result |
| H-T20 | Abort 后 Hook 迟到 reject | 无未处理异常，没有错误结果覆盖 |
| H-T21 | Hook Error 先结算、随后 Abort | 保留普通失败归因，Run 可 aborted |
| H-T22 | Abort 先结束等待、Hook 后出错 | 只提交 Cancelled |
| H-T23 | A 成功、B 审批等待中 Abort、C 尚未开始 | A success，B/C cancelled |
| H-T24 | 审批等待期间再次调用同一 Runtime.run() | 并发 Run Fail Fast，不修改 State |
| H-T25 | Abort settle 后再次 Run | Active ownership 已释放 |

### 7.4 Event、Loop 和 Session 回归

| ID | 测试场景 | 核心断言 |
|---|---|---|
| H-T26 | Deny / Hook Error 的事件 | started → Result commit → completed |
| H-T27 | 审批等待期间 Abort | started 后无 completed，保持 VII-F 语义 |
| H-T28 | maxTurns 耗尽 | 不触发 Hook、不执行 Tool，全部 skipped |
| H-T29 | 三个 Tool 混合 allow / deny / error | 全部配对，顺序执行，下一轮模型接收完整结果 |
| H-T30 | Deny 后模型返回最终回答 | Run completed，不会误判 aborted |
| H-T31 | 审批结束后 runAndSave | 合法历史保存并可从 SQLite 恢复 |
| H-T32 | 恢复包含 Deny 的历史 | 不重新请求历史审批、不重放旧 Tool |
| H-T33 | Run completed 但 Save Conflict | Run 结果不变，reusable false |

上述 33 个是**建议覆盖的独立测试场景编号**，不要求一定写成 33 个测试函数，也不表示最终测试总数只能增加 33。

尤其需要保留 VII-G 之前的 176 项回归测试，确保新增 Hook 没有破坏既有模块。

### 7.5 工程验证门槛

| 验证项 | 通过标准 |
|---|---|
| `npm test` | 所有既有与新增测试通过 |
| `npm run build` | 通过 |
| `npm run typecheck:tests` | 严格类型检查通过 |
| `npm run demo:tools` | 原工具链不回归 |
| `npm run demo:recovery` | 原 Session 恢复链不回归 |
| VII-H 确定性 Demo | allow、deny、人工等待、Abort 路径可观察 |
| Code Review | 没有消息配对、执行授权或取消归因方面的 Must Fix |

由于用户明确要求本轮只审查设计，**上述测试尚未执行，也没有修改任何文件**。

---

## 八、与 VII-A～VII-G 的完整兼容性审查

| Milestone | 影响范围 | Review 结果 |
|---|---|---|
| VII-A：ModelProvider | 无接口变更 | 兼容 |
| VII-B：State + Loop | 新增控制路径，保持唯一消息提交者 | 兼容 |
| VII-C：Tool Executor | 增加校验后的门禁和两个错误码 | 有控制的增量扩展 |
| VII-D：ContextBuilder | 继续使用既有 ToolResult 投影 | 兼容 |
| VII-E：AgentEvent | 保留六种事件和同步观察者 | 兼容 |
| VII-F：Abort | 扩展可取消的执行前等待区间 | 有控制的增量扩展 |
| VII-G：SessionStore | 只保存稳定 ToolResult，完整配对 | 兼容 |

这里有两处必须在 Code Review 阶段特别检查。

**第一处：不能为了统一处理 Hook Error，把 Executor 原有的所有异常都吞掉。**

例如 Schema 编译错误如果被错误归类为 `TOOL_PRE_EXECUTION_FAILED`，就改变了 VII-C 的错误契约。

**第二处：不能把 Abort 直接变成 Deny。**

否则 `RunOutcome`、ToolResult、AgentEvent 以及 Session 中的实际事实可能全部产生语义偏差。

---

## 九、对后续 VII-I 和营销 Agent 的适配

VII-I 是 Weather Agent 完整链路，因此只需验证它能够调用 `beforeToolCall` 并正确处理允许与拒绝。

不需要在 VII-H 提前实现天气接口。

从更长期的营销 Agent 来看，这个设计同样适用。

| 业务工具 | Application 策略示例 | Hook 最终决策 |
|---|---|---|
| 查询营销活动 | 自动放行 | allow |
| 查询优惠券 | 自动放行 | allow |
| 创建营销活动 | 需要运营确认 | 等待后 allow / deny |
| 发放优惠券 | 需要运营确认 | 等待后 allow / deny |
| 不允许的批量删除操作 | 策略直接拒绝 | deny |

这只是展示适配能力，不代表这些业务规则已写入 Runtime。

而且未来营销系统的服务端 API 仍必须自行进行身份鉴别、权限检查和业务校验。`beforeToolCall` 是 Agent 执行链的门禁，不是外部 API 的唯一安全边界。

---

## 十、最终架构快照

<box border radius="xl" padding={3} gap={2}>
  <text color="secondary" weight="medium" size="xs">Part VII-H · 拟冻结的 Runtime 架构</text>
  <box align="center" gap={1}>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">注入 Hook / Approval Handler</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">Single Active Run · Agent Loop · RuntimeState</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box border radius="lg" padding={3} width="100%" gap={2}>
      <text textAlign="center" weight="medium">ToolExecutor</text>
      <box background="surface-secondary" radius="md" padding={3} align="center">
        <text size="sm">Lookup + Ajv Validation</text>
      </box>
      <box align="center">
        <icon name="arrow-down" color="tertiary"/>
      </box>
      <box border={{size:2,color:"info"}} radius="md" padding={3} gap={1} align="center">
        **beforeToolCall**
        <text size="xs" color="secondary">异步 · 参数隔离 · Abort</text>
      </box>
      <grid columns={3} gap={2}>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="check" color="success"/>
            <text weight="medium" size="xs">allow</text>
            <caption textAlign="center">Tool.execute</caption>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="x" color="danger"/>
            <text weight="medium" size="xs">deny/error</text>
            <caption textAlign="center">失败 Result</caption>
          </box>
        </grid-item>
        <grid-item>
          <box background="surface-secondary" radius="md" padding={2} align="center" gap={1}>
            <icon name="ban" color="danger"/>
            <text weight="medium" size="xs">abort</text>
            <caption textAlign="center">Cancelled</caption>
          </box>
        </grid-item>
      </grid>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **AgentRuntime**
      <text size="xs" color="secondary">ToolResult commit → Event → Next Model Turn</text>
    </box>
    <icon name="arrow-down" color="tertiary"/>
    <box background="surface-secondary" radius="md" padding={3} width="100%" align="center" gap={1}>
      **Application**
      <text size="xs" color="secondary">Run settlement → Conversation Validation → SessionStore</text>
    </box>
  </box>
</box>

## 十一、Design Decision Review 最终结论

<row align="center" gap={2}>
  <icon name="check-circle-2" color="success" size="lg"/>
  **Design Review：PASS**
</row>

我认为可以将 **H-DD01～H-DD10 作为 Part VII-H 的正式设计基线**。这次审查没有发现需要推翻 VII-A～VII-G 的架构问题；所有变化都可以通过对现有 ToolExecutor 和 AgentRuntime 的有限扩展完成。

本轮明确保持延期的内容包括 Durable Approval、审批持久化、独立 Approval Engine、审批生命周期事件、动态 Hook 热替换、跨实例协调和完整营销业务 API 集成。

当前工程学习流程的状态为：

<box border radius="lg" padding={3} gap={2}>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="check-circle" color="success"/>
      <text weight="medium">Architecture Analysis</text>
    </row>
    <text size="xs" color="secondary">完成</text>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="check-circle" color="success"/>
      <text weight="medium">Design Decision Review</text>
    </row>
    <text size="xs" color="secondary">完成</text>
  </row>
  <divider color="subtle"/>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Codex Implementation</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Runtime Verification / Debug</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Code Review + Theory Feedback</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
  <row align="center" justify="between">
    <row align="center" gap={2}>
      <icon name="circle" color="tertiary"/>
      <text color="secondary">Milestone Closure</text>
    </row>
    <text size="xs" color="secondary">未开始</text>
  </row>
</box>

**本节最核心的认知升级是：Tool Calling（工具调用）、Execution Authorization（执行授权）和 Tool Execution（工具实际执行）是三个不同的边界。**

LLM 提出 ToolCall，不等于获得执行权限；Hook 返回 allow，也不代表 Runtime 已经不可取消；只有经过授权并实际完成的工具执行，才产生对应的执行事实。

这套划分既能支撑 VII-I Weather Agent 的完整链路，也能为之后的营销业务 Agent 提供清晰的执行控制基础。

本轮到此停留在 Design Decision Review，不修改仓库，不生成 Codex 实现提示词。

## Turn 8

### User

> Message ID: `c9e8c944-db4f-4c80-b4ad-4f5ac70314e3`; content: `text`; channel: `None`; recipient: `all`

继续。是不是该让你升成一份供 codex 执行的提示词了

### ChatGPT — commentary

> Message ID: `691b987a-1b4d-40aa-af79-20c2afbe59aa`; content: `text`; channel: `commentary`; recipient: `all`

对，已经到 **Codex Implementation** 阶段了。这一轮应该把刚才确认的 H-DD01～H-DD10 转成一份可直接复制给 Codex 的工程任务。

我会再核对一次压缩包中的真实接口和测试脚本，确保提示词既明确实现边界，也不让 Codex 顺手重构 VII-A～VII-G。

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `4d3d1e8b-1599-4f89-a85c-c7b426c2efaf`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lah /mnt/data && unzip -l '/mnt/data/source-review(20261014-031653).zip' | sed -n '1,130p'

### Public tool output

> Message ID: `2de172d8-83f7-4e62-9a60-a62da9882d7b`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `4f05b638-0253-4a2d-a032-8014dbac7197`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc mkdir -p /mnt/data/vii-h-prompt-inspect && unzip -oq '/mnt/data/source-review(20261014-031653).zip' -d /mnt/data/vii-h-prompt-inspect && for f in src/model/tool.ts src/tools/tool.ts src/tools/tool-executor.ts src/tools/tool-registry.ts src/runtime/agent-event.ts src/runtime/agent-runtime.ts src/messages/runtime-message.ts src/demo/conversation-workflow.ts package.json tsconfig.json; do echo; echo ========== $f; nl -ba "/mnt/data/vii-h-prompt-inspect/$f"; done

### Public tool output

> Message ID: `1c578b3f-f498-4530-a3c7-1c859f40abb4`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT — historical tool request (not executed during documentation)

> Message ID: `649b959f-1bfb-4d84-816e-2ddc59c42b99`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc sed -n '84,150p' /mnt/data/vii-h-prompt-inspect/src/runtime/agent-runtime.ts && sed -n '1,260p' /mnt/data/vii-h-prompt-inspect/test/run-control.test.ts | head -180 && sed -n '1,130p' /mnt/data/vii-h-prompt-inspect/src/messages/validate-conversation.ts && sed -n '1,120p' /mnt/data/vii-h-prompt-inspect/test/tool-runtime.test.ts

### Public tool output

> Message ID: `b6bc1c97-d9a2-41bf-b517-fa05e32df022`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.

### ChatGPT

> Message ID: `c1627faf-3b5e-4b6e-b0c3-aaec50eeb4c9`; content: `text`; channel: `final`; recipient: `all`

对。我们已经完成了 **Part VII-H 的 Architecture Analysis → Design Decision Review**，现在正式进入第三阶段：

**Codex Implementation（工程实现）**。

我建议这次让 Codex 一次性完成 VII-H 的最小实现、自动化测试和 Demo，而不是再拆成很多轮。因为 10 条 Architecture Decisions 已经明确，剩下主要是落实到代码，并通过测试验证。

我重新核对了你上传的源码，确认当前关键入口是 `AgentRuntimeOptions`、`ToolExecutor.execute()` 和 `ToolExecutionCancelledError`。下面这份提示词以这些真实接口为基础，同时要求 Codex 优先以它当前工作区的实际代码为准。

## Part VII-H · Codex Implementation Task

以下可以直接复制给 Codex。

<WritingBlock id="68341" variant="document"># Part VII-H：beforeToolCall + Simple Human Approval — Implementation Task

## 0. Task Context

当前项目：`mini-agent-runtime`

技术栈：

- Node.js >=20
- TypeScript / ESM / NodeNext
- Ajv JSON Schema
- Node.js Test Runner + tsx
- SQLiteSessionStore / MemorySessionStore

当前 **Part VII-A～VII-G 均已完成**，VII-G 是最新已确认的工程基线。

现在进入 **Part VII-H：beforeToolCall + 简单 Human Approval**。

本轮 Architecture Analysis 与 Design Decision Review 已完成，形成 **H-DD01～H-DD10**。

请基于当前仓库的真实代码增量实现这些决策。

**本任务是 Implementation + Runtime Verification，不是重新进行 Architecture Design。**

不要重新设计之前已经完成的架构；如果发现设计与真实代码存在明确冲突，应先说明冲突、影响与最小修正方案，不要擅自扩大 Scope。

---

## 1. Mandatory Source Review

修改代码之前，必须阅读当前仓库的以下文件。

### Runtime / Tool

- `src/runtime/agent-runtime.ts`
- `src/runtime/runtime-state.ts`
- `src/runtime/agent-event.ts`
- `src/runtime/context-builder.ts`
- `src/tools/tool.ts`
- `src/tools/tool-executor.ts`
- `src/tools/tool-registry.ts`
- `src/model/tool.ts`

### Conversation / Session

- `src/messages/runtime-message.ts`
- `src/messages/validate-conversation.ts`
- `src/demo/conversation-workflow.ts`
- `src/session/session-store.ts`

### Tests

- `test/tool-runtime.test.ts`
- `test/run-control.test.ts`
- `test/agent-event.test.ts`
- `test/runtime-recovery.test.ts`
- `test/application-settlement.test.ts`
- `test/support/mock-model-provider.ts`

同时检查当前 `package.json`、`tsconfig.json` 和 README。

阅读后先确认真实代码与下述前提是否一致：

1. `AgentRuntime` 是 RuntimeState 唯一 mutation owner。
2. RuntimeState 只保存 messages。
3. ToolExecutor 负责 Registry Lookup、Ajv Validation、Tool.execute。
4. ToolResult 使用 success / error 联合类型。
5. AgentEvent 包含现有六种事件。
6. Abort 使用 Caller-owned AbortSignal，并保留取消归因。
7. `#appendCancelledToolCalls()` 负责未完成批次的取消配对。
8. SessionStore 在 Run Boundary 进行保存，不恢复正在执行的 Run。
9. `validateConversation()` 强制完整 ToolCall batch pairing。
10. `runAndSave()` 保留独立 Run / Persistence Settlement 与 reusable 语义。

如果当前仓库与以上前提存在差异，必须根据真实代码说明，不得假装代码与旧版本完全相同。

---

## 2. Milestone Goal

本轮目标：

**在现有 ToolExecutor 执行链中增加可选的异步 beforeToolCall Hook，使 Application 能在 Tool 真正执行前允许、拒绝或等待人工批准，同时保持既有 Runtime、Abort、Event、Session 契约。**

目标链路：

```text
ModelProvider
    ↓
Model ToolCall
    ↓
AgentRuntime
    ↓
ToolExecutor
    ↓
Registry Lookup
    ↓
Ajv Schema Validation
    ↓
beforeToolCall
    ↓
  ├── allow → Tool.execute()
  ├── deny → Failed ToolResult
  ├── error → Failed ToolResult
  └── abort → Cancelled ToolResults
    ↓
AgentRuntime
    ↓
RuntimeState / AgentEvent
    ↓
Next Model Turn
```

Human Approval 由 Application 提供的异步 Hook 实现。

Runtime 不负责审批 UI、审批服务或审批状态持久化。

---

## 3. Frozen Architecture Decisions

以下 H-DD01～H-DD10 为本轮设计基线。

### H-DD01：Hook Placement

beforeToolCall 必须位于：

**Registry Lookup → Ajv Validation → beforeToolCall → Tool.execute**

只对已经找到工具、参数校验成功、即将真正执行的调用执行 Hook。

不得将参数验证复制到 AgentRuntime。

Tool 不存在或参数非法时保持原有错误契约，不调用 Hook。

### H-DD02：Hook Ownership / Injection

- Application 提供 Hook。
- 通过 `AgentRuntimeOptions` 构造注入。
- AgentRuntime 转发给 ToolExecutor。
- ToolExecutor 负责强制执行 Hook 决策。
- ToolExecutor 独立使用时，也支持同一可选 Hook。
- 不支持运行中替换 Hook。
- 不在 RunOptions 新增 Hook。

保持现有 `new AgentRuntime(provider, options)` 结构。

### H-DD03：Async Hook + Final Decision

Hook 可以同步或异步返回。

最终只允许：

- `allow`
- `deny`

不增加 `requireApproval` 第三种决策。

Human Approval 由 Hook 内部异步等待产生最终结果。

未配置 Hook 时保持原有执行行为。

Hook 返回不合法的决策不能默认放行。

### H-DD04：Reference Isolation

Hook 可以查看已校验的 ToolCall 信息，但不能通过引用修改：

- RuntimeState 中已经提交的 ToolCall。
- Tool 实际执行的参数。
- Tool 名称与 ToolCall ID。

Hook 收到的数据必须与真正传给 Tool.execute 的可变参数对象隔离。

使用现有 structuredClone 思路即可。

不引入 deepFreeze、不可变框架或额外参数转换机制。

不重复执行 Ajv Validation。

### H-DD05：Explicit Deny

Hook 返回 deny：

- Tool.execute 调用次数必须为 0。
- 返回失败 ToolResult。
- 使用 `TOOL_EXECUTION_DENIED` 错误码。
- Runtime 正常提交对应 tool_result。
- Agent Loop 可以继续。

Deny 不等于 Abort。

### H-DD06：Hook Error

Hook 出现以下情况：

- 同步 throw
- Promise reject
- 非法返回值

均不得执行 Tool。

普通 Hook Error 转换为独立失败 ToolResult：

`TOOL_PRE_EXECUTION_FAILED`

必须使用安全、固定的错误消息，不将原始 Error.message、Stack 或其他敏感数据直接回流模型。

Hook Error 的归一化范围仅限 Hook 边界。

不得把 Schema Compile、Validation 内部故障或原有 Executor 内部异常都吞掉。

### H-DD07：Interruptible Approval Wait

Executor 必须保证 beforeToolCall 的异步等待可被 Caller 的 AbortSignal 中断。

Hook 同时接收原始 AbortSignal。

即使 Hook Promise 永远 pending，Caller Abort 后，Runtime 也必须能够结束当前等待并释放 Active Run。

Executor 不需要保证远程审批请求被物理撤销。

不增加默认审批超时器或审批调度器。

### H-DD08：Abort Attribution / Pairing

沿用 VII-F 已确认的取消契约。

审批等待期间的 Abort，或者 allow 已返回但 Tool 尚未启动时的 Abort：

- 不允许开始新的 Tool.execute。
- 保留先前已提交 ToolResult。
- 当前及剩余未执行 ToolCall 补齐 `TOOL_CALL_CANCELLED`。
- RunOutcome 为 `aborted`。
- 不重复提交 ToolResult。
- 迟到的 allow 不得触发 Tool 执行。

复用现有 ToolExecutionCancelledError 的归因机制，并对其注释作必要的最小语义澄清。

不要新建第二套 Approval Cancelled Error。

必须区分：

1. Hook Error 已经结算，随后 Caller Abort；
2. Caller Abort 已经终止等待，Hook 随后返回或抛错。

不能仅因为 `signal.aborted` 最终为 true，就把已经确认的普通 Hook Error 改写成取消。

### H-DD09：AgentEvent Compatibility

保留现有六种 AgentEvent。

保留现有事件发布时机。

特别注意：

`tool_execution_started` 表示 Runtime 开始处理执行尝试，不保证 Tool.execute 已启动。

Deny / Hook Error 生成 ToolResult 后，按原有规则触发 tool_execution_completed。

Approval 等待中 Abort，沿用 VII-F 的取消事件语义，不伪造 tool_execution_completed。

不增加 approval_requested / approval_resolved Event。

Subscriber 不参与执行授权。

### H-DD10：Session / Recovery Compatibility

不修改：

- RuntimeMessage union
- RuntimeState
- ContextBuilder
- RunOutcome
- SessionSnapshot
- SessionStore
- validateConversation 的协议
- CAS revision 语义
- runAndSave 的双 Settlement

Deny / Hook Error / Cancelled 必须使用现有 ToolResult 消息格式形成完整配对。

不保存 pending Approval、Promise、AbortSignal 或 Handler。

恢复历史时不能重新触发旧 ToolCall 的 Hook，也不能重放旧工具。

---

## 4. Proposed TypeScript Contract

下面是已经讨论确认的公共契约方向。

允许根据真实仓库组织形式选择合适文件放置类型，但不得改变语义。

```ts
import type { ToolCall } from "../model/tool.ts";

export type BeforeToolCallDecision =
  | Readonly<{ type: "allow" }>
  | Readonly<{ type: "deny" }>;

export interface BeforeToolCallContext {
  readonly toolCall: Readonly<ToolCall>;
  readonly signal?: AbortSignal;
}

export type BeforeToolCallHook = (
  context: BeforeToolCallContext
) =>
  | BeforeToolCallDecision
  | Promise<BeforeToolCallDecision>;
```

注意：

- `Readonly` 不等于深层运行时不可变。
- 实际参数隔离必须通过正确的复制边界实现。
- 当前 `ToolCall.arguments` 是 unknown。
- Hook 应接收通过相应 Tool Schema Validation 的参数内容。
- Hook 返回值只表达决策，不允许替换 ToolCall。

扩展：

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
  initialMessages?: RuntimeMessage[];
  beforeToolCall?: BeforeToolCallHook;
}
```

ToolExecutor 可以增加：

```ts
interface ToolExecutorOptions {
  beforeToolCall?: BeforeToolCallHook;
}
```

保持原有构造方式兼容：

```ts
new ToolExecutor(registry);
```

不需要在接口中加入 `sessionId`、`requestId`、`approvalStatus`、`reason` 或额外状态字段。

### ToolError

在已有 ToolError.code 联合类型中，只增加：

```ts
"TOOL_EXECUTION_DENIED"
"TOOL_PRE_EXECUTION_FAILED"
```

建议固定错误消息：

```ts
// Deny
{
  success: false,
  error: {
    code: "TOOL_EXECUTION_DENIED",
    message: "Tool execution was denied."
  }
}

// Hook Error
{
  success: false,
  error: {
    code: "TOOL_PRE_EXECUTION_FAILED",
    message: "Pre-execution authorization failed."
  }
}
```

以上只是目标数据契约，不表示新建额外的消息类型。

---

## 5. Abort Implementation Requirements

这是本轮最高风险的实现部分，请特别仔细。

### 5.1 Waiting

Hook 异步等待时：

- Executor 监听当前 Signal。
- Signal Abort 可以终止等待。
- 不能完全依赖 Hook 自己检查 signal.aborted。
- 等待结束时清理 Executor 注册的 Abort listener。
- 不得引入永久保留的未使用监听资源。

### 5.2 Settlement Race

必须正确处理：

```text
A. Hook 先 allow → 尚未 Abort → 执行 Tool

B. Hook 先 deny → 提交失败 Result

C. Hook Error 先结算 → 提交失败 Result

D. Abort 先终止等待 → 当前及后续 ToolCall cancelled

E. Abort 后 Hook 迟到 allow → 不执行 Tool

F. Abort 后 Hook 迟到 reject → 不增加 Result，不产生未处理异常
```

以执行链实际接受的结算结果为准。

不能根据事后 Signal 状态无条件重写已接受的普通错误归因。

### 5.3 Before Tool Execution

即使 Hook 返回 allow，在真正开始 Tool.execute 前仍必须检查 Abort。

无论是 Hook 内同步 Abort，还是等待完成附近的 Abort，都不允许在已观察到取消后开始新的副作用。

### 5.4 Existing Cancellation Contract

当前 Runtime 识别：

- `ToolExecutionCancelledError`
- 与 Caller 原始 Signal 的归因关系

请复用已有取消传播机制，让 Runtime 原有的 `#appendCancelledToolCalls()` 能正确配对。

不要修改 VII-F 已确认的 Provider Cancellation 或 Tool Execution Cancellation 行为。

### 5.5 No Signal

如果 Caller 没有提供 AbortSignal，而 Hook 永久 pending，则 Runtime 可以持续等待。

本轮不新增审批超时或默认定时器。

---

## 6. Scope Control

### Allowed Changes

根据实际需要，允许修改：

- `src/runtime/agent-runtime.ts`
- `src/tools/tool-executor.ts`
- `src/tools/tool.ts`
- 与 Hook 类型相关的最小新文件
- 必要的测试文件
- 最小 Approval Demo
- package.json 中与 Demo 对应的脚本
- README 中本轮使用方法及行为说明

不要求为了完成任务强行触及全部文件。

### Forbidden Scope Expansion

不要实现：

- Durable Approval
- Durable Tool Execution
- ApprovalManager / ApprovalEngine
- 通用 Policy Engine
- Session Tree
- Approval 状态持久化
- RuntimeState.status
- 新 RuntimeMessage 类型
- 动态 Hook Hot Reload
- 复杂 EventBus
- Streaming
- MCP
- 多 Agent / Sub-Agent
- Weather Agent（VII-I）
- 真实营销业务 API
- UI Framework 或审批服务
- 跨 Runtime / 跨进程执行锁
- 复杂 Telemetry / Logging Framework

不得因“未来可能有用”自行扩展公共接口。

---

## 7. Required Test Matrix

新增确定性测试，建议与以下测试矩阵对照。

允许将相近场景组合在同一个测试函数中，但所有关键行为必须有证据。

### Group A：Hook Basic Contract

| ID | 场景 | 断言 |
| --- | --- | --- |
| H-T01 | 无 Hook | 原有行为不变 |
| H-T02 | allow | Hook 一次、Tool 一次 |
| H-T03 | deny | Tool 零次，DENIED Result |
| H-T04 | 同步 throw | PRE_EXECUTION_FAILED |
| H-T05 | Promise reject | PRE_EXECUTION_FAILED |
| H-T06 | 非法 Hook 返回值 | Fail Closed，不执行 Tool |
| H-T07 | Tool 不存在 | Hook 不调用，保留 TOOL_NOT_FOUND |
| H-T08 | 参数非法 | Hook 不调用，保留 INVALID_ARGUMENTS |
| H-T09 | 原有内部异常 | 保留原始传播契约 |
| H-T10 | 直接使用 ToolExecutor | Hook 仍然生效 |

### Group B：Isolation / Security

| ID | 场景 | 断言 |
| --- | --- | --- |
| H-T11 | Hook 修改嵌套 arguments | 实际执行参数不变 |
| H-T12 | Hook 修改 id / name | 实际调用与结果关联不变 |
| H-T13 | Hook 修改参数后 deny | RuntimeState 历史不变 |
| H-T14 | Hook Error 含敏感字符串 | ToolResult / ModelRequest 不泄露原文 |
| H-T15 | 多 Run 复用 Hook | 每次独立生效 |

### Group C：Abort / Race

| ID | 场景 | 断言 |
| --- | --- | --- |
| H-T16 | Hook 永久 pending 后 Abort | Run aborted，释放 #active |
| H-T17 | Hook 收到 Signal | 与 Caller Signal 对象相同 |
| H-T18 | Hook 内同步 Abort 后 allow | Tool 零次 |
| H-T19 | Abort 后迟到 allow | Tool 零次、不重复 Result |
| H-T20 | Abort 后迟到 reject | 无未处理异常、不覆盖取消 |
| H-T21 | Hook Error 先结算，之后 Abort | 保留原错误归因 |
| H-T22 | Abort 先终止等待，之后 Hook Error | 仅按取消配对 |
| H-T23 | A 成功、B 等待审批被取消、C 未执行 | A success、B/C cancelled |
| H-T24 | 审批 pending 时并发 run | Fail Fast，无多余 State mutation |
| H-T25 | Abort 结算后下一次 run | 可正常运行 |

### Group D：Event / Session / Loop

| ID | 场景 | 断言 |
| --- | --- | --- |
| H-T26 | deny / Hook Error | 原有 started、completed 顺序 |
| H-T27 | Approval Abort | 无虚假 completed |
| H-T28 | maxTurns 耗尽 | Hook 不调用，skipped 配对 |
| H-T29 | 多 Tool allow / deny / error | 完整配对，后续 ModelRequest 正确 |
| H-T30 | deny 后模型正常回答 | RunOutcome completed |
| H-T31 | Deny / Error 后 runAndSave | 合法历史能够保存和恢复 |
| H-T32 | 恢复包含 Deny 的历史 | 不重新触发旧 Approval / Tool |
| H-T33 | Save CAS Conflict | 保留 Run Settlement，reusable false |

对于 Abort 竞争测试，优先使用可控 deferred Promise 和 AbortController。

不要依赖随意增加的 `setTimeout` 来碰运气。

特别验证：

- Tool.execute 调用次数
- Hook 调用次数
- ToolResult 唯一配对
- RunOutcome
- AgentEvent 顺序
- 原有历史引用隔离
- 下一轮 ModelRequest
- Single Active Run ownership 释放

---

## 8. Minimal Approval Demo

提供一个最小可运行 Demo，用于证明：

```text
User Input
  ↓
Model ToolCall
  ↓
beforeToolCall
  ↓
Application Approval
  ↓
allow / deny
  ↓
ToolResult
  ↓
Model Final Answer
```

Demo 约束：

1. 复用当前 ModelProvider 与 AgentRuntime 契约。
2. 使用简单工具，例如模拟执行一个需要批准的操作。
3. 人工决策由 Application 层的异步 Handler 提供。
4. 不在 Runtime 内直接读取 CLI 输入。
5. 可以使用 CLI 人工确认作为最小示例，不需要开发 Web UI。
6. 提供无需人工输入的确定性验证方式，避免自动化验证永久挂起。
7. 不依赖真实外部业务 API 或 API Key。
8. 不提前实现 VII-I Weather Agent。

可按真实工程需要增加 `demo:approval` 脚本。

README 应准确说明如何运行以及 Approval 无法跨进程恢复的限制。

---

## 9. Backward Compatibility

本轮属于增量实现。

必须确保现有行为不回归：

- 正常 Model → Tool → Model
- Multiple Tool Calls
- Tool Not Found
- INVALID_ARGUMENTS
- TOOL_EXECUTION_FAILED
- maxTurns skipped
- ContextBuilder Snapshot
- Subscriber isolation
- Provider Abort
- Tool Abort
- Single Active Run
- initialMessages Recovery
- Conversation Validation
- Memory / SQLite SessionStore
- CAS Conflict
- Run / Persistence Settlement
- reusable 继续资格

禁止为了让新测试通过，随意修改旧测试预期。

如果确实需要更新既有测试，必须说明是契约要求还是测试问题，并给出修改理由。

---

## 10. Verification Commands

实现结束后实际执行：

```bash
npm test
npm run build
npm run typecheck:tests
npm run demo:tools
npm run demo:recovery
```

还需要运行新增 Approval Demo 的确定性验证路径。

如果运行环境支持：

```bash
git diff --check
```

请同时执行。

保留仓库已有的 Demo 行为，尤其不要要求真实 OpenAI Key 才能运行本轮自动化验收。

如出现失败：

1. 定位失败属于旧功能回归还是新增行为。
2. 进行最小范围修复。
3. 重新执行相关测试。
4. 最终运行完整测试集。

不要只运行新增测试就宣布 Milestone 通过。

---

## 11. Implementation Principles

必须遵守：

1. 以当前仓库真实代码为最终实现依据。
2. 不重新设计 VII-A～VII-G。
3. 保持 RuntimeState messages-only。
4. 不增加无必要的状态机。
5. 纯数据隔离与实际副作用执行保持边界清晰。
6. 所有授权失败必须 Fail Closed。
7. 不将审批失败错误地表达为整个 Run 的 Abort。
8. 不能因 Hook 返回 allow 而跳过 Abort 检查。
9. 不能让 Hook 通过引用改变实际工具参数。
10. 不让 Hook Error 泄露原始敏感信息。
11. 不通过 Subscriber 完成人工审批。
12. 不通过 SessionStore 恢复 pending Approval。
13. 尽可能复用现有类型、Error Contract 和测试工具。
14. 保持 TypeScript strict、noUncheckedIndexedAccess、exactOptionalPropertyTypes 兼容。
15. 不引入非必要第三方依赖。

如果遇到设计空白：

- 优先选择满足当前验收的最小实现。
- 不擅自添加新的公共架构概念。
- 将必要的额外决策列入报告，标注其原因。
- 如果发现与冻结 H-DD 决策发生实质冲突，不应隐式修改契约。

---

## 12. Required Delivery Report

实现完成后，请按以下固定结构输出工程交付报告。

### 12.1 Implementation Summary

说明本次实现了什么，哪些能力明确未实现。

### 12.2 Architecture Compliance

逐条对照：

- H-DD01
- H-DD02
- H-DD03
- H-DD04
- H-DD05
- H-DD06
- H-DD07
- H-DD08
- H-DD09
- H-DD10

对于每条给出：

- 是否满足
- 具体代码位置
- 测试证据
- 如有偏差，说明原因

### 12.3 Files Changed

列出新增 / 修改文件，并说明各文件职责。

### 12.4 Key Implementation Details

重点解释：

- Hook 注入与调用顺序
- 参数隔离
- allow / deny 契约
- Hook Error 归一化
- 可中断审批等待
- Abort 竞态与取消归因
- ToolResult pairing
- Event / Session 兼容方式

### 12.5 Runtime Verification

列出所有实际执行的命令、结果、通过数量、失败数量。

不得将未执行测试写为通过。

### 12.6 Tests Added

列出新增测试及对应 H-T 编号覆盖情况。

标记哪些场景未覆盖，以及原因。

### 12.7 Bugs / Debugging

如果过程中出现 Bug，记录：

- 现象
- 根因
- 修复方式
- 回归验证

没有实际发生的问题不需要编造 Debug 经历。

### 12.8 Architecture Deviations

说明是否偏离冻结设计。

如果无偏差，明确说明。

### 12.9 Remaining Risks

重点说明真实限制，例如：

- 在途审批不能持久化
- 外部审批请求不一定被实际取消
- Abort 不能回滚已发生的 Tool 副作用
- Application Hook 不等于外部 API 权限控制

### 12.10 Final Status

明确：

- Implementation 是否完成
- Tests 是否全部通过
- Build / Typecheck 是否通过
- Demo 是否通过
- 是否可以进入 ChatGPT Code Review
- 是否还有 Must Fix 或未解决问题

---

## 13. Stop Boundary

本轮只完成：

**Part VII-H Codex Implementation + Runtime Verification / Debug。**

不要提前宣布 Part VII-H Milestone Closure。

不要直接进入 VII-I。

不要自动生成最终 Engineering Learning Log。

不要自动创建 Git Commit。

完成实现和测试后，输出交付报告，等待下一轮 ChatGPT Code Review + Theory Feedback。

最终验收是否成立，由实际代码、测试证据及后续 Code Review 共同决定。</WritingBlock>

## 交给 Codex 后的下一步

这份提示词把我们前面六轮架构讨论形成的 H-DD01～10 全部落实到了具体任务，同时保留了 33 个验收场景。

这次最需要关注的不是新增多少代码，而是三件事：

1. **Hook 的执行顺序与参数隔离**：模型提出调用不代表已授权，Hook 也不能修改实际执行参数。
2. **Abort 与异步 Approval 的竞争**：取消后不得因迟到的批准而再次调用 Tool。
3. **失败结果与消息配对**：Deny、Hook Error、Abort 必须遵守各自的结果契约，不能破坏 VII-G 的 Conversation Recovery。

等 Codex 实现完成后，把它的**实现总结、测试日志和最新源码 ZIP** 发给我。我们就按之前 VII-G 的方式，进入正式 Code Review，重点判断有没有 Must Fix，而不是重新讨论已经冻结的架构。

当前状态：**VII-H Design Decision 已完成，Codex Implementation 待执行。**

