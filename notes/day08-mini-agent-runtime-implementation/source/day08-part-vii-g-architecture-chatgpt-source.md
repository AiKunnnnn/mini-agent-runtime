# Day08 · Part VII-G Architecture Discussion — Full ChatGPT Source

> Source type: Full public conversation transcript（公开分享页可用正文）
> Public share / backing conversation ID: `6ac9f5ba-8b58-83ee-84e7-33d63760a502`
> Conversation title: Part VII-G
> Public source: https://chatgpt.com/share/6ac9f5ba-8b58-83ee-84e7-33d63760a502
> Retrieval date: 2026-10-10
> Retrieval: 优先尝试 Codex read_thread；关联会话所在 durable host 不可用。改从用户指定的公开分享页 HTML 解码页面自身的 conversation mapping，并从 current_node 沿 parent 重建完整当前分支。
> Completeness: mapping 146 节点，当前分支 146 节点，14 个 user turn；已核对节点集合相同，无遗漏的旁支。本组两份 source 合计保留全部非空 user / assistant text、公开的 code 工具请求和 tool text；不截断长回复。
> Normalization: 仅规范化行尾空白；保留原始正文、分段输出与完整回复之间的重复、GenUI / WritingBlock 标记及历史候选代码。它们不表示仓库当前接口。
> Exclusions: 不归档 system / private reasoning；redacted tool output 只保留公开的 redacted 占位，不冒充实际检查输出。上传附件名称不等于附件二进制。
> Attachments named in this conversation: source-review(10).zip、README(7).md、day08-part-vii-f-abort-single-active-run(1).md、source-review(20261010-075805).zip、source-review(20261010-081200).zip。分享页不提供这些附件的二进制；本次没有重新取得这些二进制。

> Scope: 全局第 1～8 轮：Architecture Analysis → Design Decisions → 冻结 G-AD01～G-AD20 → Implementation Task。


## Turn 1


### User

> Message ID: `51427281-b1ad-4e9c-8219-9fe83dbb8272`; content: `text`; channel: `None`; recipient: `all`

我们继续 **Part VII：Mini Agent Runtime Implementation**。



上一阶段 **Part VII-F** 已完成。



我已经提供：



- Part VII 总体规划 / README；如 README 文件
- Part VII-F 最终 Milestone Note；如part-vii-f 文件笔记
- 当前 Architecture Decisions（如果存在）。
  - \


现在进入：



**Part VII-G：SessionStore + Conversation Recovery**



请先阅读上一阶段已经形成的真实实现、架构边界和设计决策。



后续必须基于现有实现做增量演进，不要重新设计已经确认完成的部分；如果发现前一阶段存在明确架构问题，可以提出，但请说明为什么需要调整。



继续采用固定工程学习流程：



**Architecture Analysis → Design Decision → Codex Implementation → Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure**



现在先进入 **Architecture Analysis（架构分析）**。



请你先根据：



- 当前已有代码和架构决策；
- 本节标题与目标；
- 后续 Part 的整体规划；
  - \


帮我识别本节真正需要解决的架构问题、实现边界、关键设计决策和完成标准，然后逐步带我讨论。



不要一开始直接实现代码，也不要提前实现后续 Part。


### Public tool output

> Message ID: `f2b108b4-c9b4-4bff-bf79-d2c8ea1833de`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### Public tool output

> Message ID: `3f5066f0-53e6-4894-83ac-b8bb8fd82d29`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### Public tool output

> Message ID: `48896d6c-3215-4b18-895e-cebbe535a16c`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### Public tool output

> Message ID: `eb888664-7a1a-454d-9e2e-71f84767b057`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — commentary / rendered fragment

> Message ID: `e1d9fbf8-7bf8-4a24-aece-7cd600ebac41`; content: `text`; channel: `commentary`; recipient: `all`

我会先核对你上传的源码压缩包、README 和 VII-F 收尾笔记，区分“代码已经保证的行为”和“VII-G 需要新增的能力”。这一轮只做架构分析，重点看持久化边界、恢复语义，以及它和 VII-F 的运行控制是否冲突。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `519942ff-52e6-4a24-a465-0acf46271e4a`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(10).zip' | head -65; echo '---'; unzip -p '/mnt/data/source-review(10).zip' src/runtime/agent-runtime.ts | head -230


### Public tool output

> Message ID: `62e36b11-b4c7-499f-a7c6-2249c77dd16c`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `05b95aaa-a0ad-49eb-8439-154742bdb4c3`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc for f in src/runtime/runtime-state.ts src/messages/runtime-message.ts src/runtime/context-builder.ts src/messages/to-model-message.ts src/runtime/agent-event.ts; do echo ==== $f; unzip -p '/mnt/data/source-review(10).zip' "$f"; done


### Public tool output

> Message ID: `99aee4fa-a207-4c55-ab40-03381c74081f`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `db796ffe-f2e1-4331-8d51-cbdf67534866`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：SessionStore + Conversation Recovery

<badge color="info">Architecture Analysis · 架构分析</badge>

本节我们正式进入 **Mini Agent Runtime 的持久化与会话恢复阶段**。

我已经核对了你提供的三份材料：

- 当前源码压缩包 `source-review(10).zip`，包括 `AgentRuntime`、`RuntimeState`、`ContextBuilder`、`ToolExecutor` 和测试代码。
- Part VII 总体规划 README。
- Part VII-F 最终 Milestone Note，包含 F-AD01～F-AD16 架构决策。

先明确本节的核心目标：

> **VII-F 解决“一个 Runtime 如何安全地运行和停止”；VII-G 要解决“一个 Runtime 消失后，另一个 Runtime 如何接着之前的对话继续”。**

这次我们仍然坚持三个原则：

1. 不推翻 VII-A～VII-F 已经确认的架构。
2. 不把 SessionStore 扩展成复杂的 Agent 平台。
3. 先确定架构决策，再编写 Codex Implementation Task。

---

## 一、首先理解 VII-G 为什么存在

假设我们已经实现了一个营销运营 Agent。

运营人员发起对话：

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="user-round" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">运营人员 · 第一轮</text>
      帮我分析一下双十一会员优惠券的使用情况。
    </box>
  </row>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="bot" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">Agent · 第一轮</text>
      双十一活动共领取了 10 万张优惠券，使用了 3 万张，核销率为 30%。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={2} justify="center">
    <icon name="refresh-cw" color="secondary"/>
    <text color="secondary" size="xs">Node.js 进程重启 / Runtime 实例被销毁</text>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="user-round" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">运营人员 · 第二轮</text>
      那如果给这批用户再发一张满 200 减 30 的券呢？
    </box>
  </row>
</box>

如果是当前 VII-F 的 Runtime：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("分析双十一优惠券");
await runtime.run("那如果再发一张券呢？");
```

只要 `runtime` 对象还在，第二次调用就能看到第一次的历史。

但如果 Node.js 进程重启：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("那如果再发一张券呢？");
```

新的 Runtime 是空的。

模型不知道“这批用户”是谁，也不知道之前分析的是哪场活动。

**这就是 VII-G 真正要解决的问题：Conversation Continuity（对话连续性）。**

注意，它不是让先前那个 JavaScript Promise 恢复执行，也不是恢复已经中断的模型调用，而是让新的 Runtime 从可靠保存的历史事实继续下一轮对话。

## 二、从真实代码看：我们现在已经拥有什么

从上传的 `agent-runtime.ts` 看，当前关键结构可以简化成：

```ts
export class AgentRuntime {
  readonly #state: RuntimeState = {
    messages: [],
  };

  #active = false;

  getMessages(): RuntimeMessage[] {
    return structuredClone(this.#state.messages);
  }

  async run(userInput: string, options = {}) {
    if (this.#active) {
      throw new Error(
        "AgentRuntime already has an active run."
      );
    }

    this.#active = true;

    try {
      return await this.#run(
        userInput,
        options.signal
      );
    } finally {
      this.#active = false;
    }
  }
}
```

这里有几个非常重要的既有架构事实：

| 已有机制 | VII-G 应如何承接 |
|---|---|
| `RuntimeState` 只有 `messages` | 保留消息事实模型 |
| `AgentRuntime` 是唯一状态修改者 | 恢复和持久化不能绕过这个所有权规则 |
| `getMessages()` 返回深拷贝 | 可以作为快照读取的基础 |
| `ContextBuilder` 无状态 | 恢复后继续读取最新消息构造模型上下文 |
| `#active` 是实例级控制状态 | 不将它序列化进 Session |
| Abort 保留已提交的消息事实 | 恢复时不能错误丢弃这些事实 |
| ToolCall 与 ToolResult 已有配对规则 | 恢复的数据必须保证消息协议合法 |

因此，**现有 Runtime 并不缺少对话状态模型，而是缺少对话状态的持久化和恢复生命周期。**

这意味着没有必要重新开发 Agent Loop，也不需要重建新的消息体系。


### ChatGPT

> Message ID: `7fb221a6-abf9-4b91-b7c7-0f03edab038c`; content: `text`; channel: `final`; recipient: `all`

## 三、VII-G 的架构定位

我建议将 VII-G 理解为：在已有 Runtime 外围增加一个最小的持久化边界。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 290" width="100%" xmlns="http://www.w3.org/2000/svg">
    {#each [{y:12,t:"Caller / Application"},{y:76,t:"AgentRuntime",sub:"唯一 State mutation owner"},{y:140,t:"SessionStore",sub:"保存 / 加载 Conversation"},{y:204,t:"Persistence Backend",sub:"JSON 文件 / 其他存储介质"}] as n,i}
      <rect x="45" y={n.y} width="250" height={i===0?40:53} rx="9" fill={i===1?"#DDEBFA":i===2?"#DDF3E8":"#F1F3F5"} stroke={i===1?"#5689BB":i===2?"#4F9970":"#A4AAB2"} strokeWidth="1.2"/>
      <text x="170" y={n.y+20} fontSize="13" textAnchor="middle" fontWeight="600" fill="#25313D">{n.t}</text>
      {#if n.sub}<text x="170" y={n.y+37} fontSize="10" textAnchor="middle" fill="#566473">{n.sub}</text>{/if}
      {#if i<3}
        <path d={`M 163 ${n.y+(i===0?40:53)} v ${i===0?24:11} m -4 -6 l 4 6 l 4 -6`} fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <path d={`M 177 ${n.y+(i===0?64:64)} v -${i===0?24:11} m -4 6 l 4 -6 l 4 6`} fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/if}
    {/each}
    <text x="170" y="276" textAnchor="middle" fontSize="10" fill="currentColor">双向箭头表示保存与加载，不代表恢复执行栈</text>
  </svg>
  <caption>逻辑职责示意，具体依赖方向仍需在 Design Decision 中确定。</caption>
</box>

它需要具备四个最小能力：

- **Session Identity（会话标识）**：知道这份历史属于哪次对话。
- **Conversation Persistence（对话持久化）**：把已经形成的对话事实保存下来。
- **Conversation Recovery（对话恢复）**：将历史事实加载进新的 Runtime。
- **Continuation（继续对话）**：恢复后能够正常执行下一次 `run()`。

这里尤其要区分三个概念：

| 概念 | 含义 | 本节 |
|---|---|---|
| Conversation Recovery | 恢复历史消息并开始新的一轮 | 必须 |
| Run Recovery | 恢复尚未结束的 Agent Loop | 不做 |
| Durable Execution | 断电后恢复 Tool 执行、避免重复副作用 | 不做 |

例如用户调用了发券 Tool，Node.js 恰好在业务 API 发券成功、Runtime 记录 ToolResult 之前崩溃。

VII-G 不能凭空判断券是否已经发出，更不应该自动重放这个 Tool。

这类问题涉及 Durable Execution（持久化执行）、幂等性和业务事务，不属于当前 Milestone。

---

## 四、我识别出的六个核心架构问题

下面这些是我们本节真正需要做决策的地方。

| 编号 | 架构问题 | 关键决策 |
|---|---|---|
| G-1 | Session 到底是什么？ | Session 是否只是 ID + Conversation Snapshot？ |
| G-2 | 谁管理持久化？ | AgentRuntime、SessionStore 还是调用方？ |
| G-3 | 什么时候保存？ | 每次 Run 结束，还是每条消息提交后？ |
| G-4 | 如何恢复？ | 新 Runtime 构造时注入历史，还是恢复方法？ |
| G-5 | 如何处理异常历史？ | 不完整 ToolCall、非法数据、存储失败 |
| G-6 | 同一 Session 被两个 Runtime 加载怎么办？ | 是否需要跨实例并发保护？ |

这六个问题彼此关联。

其中 **G-2 和 G-3 尤其重要**，因为它们决定 SessionStore 是一个简单的数据存储模块，还是开始参与 Agent Runtime 的生命周期控制。

### G-1：Session 与 RuntimeState 是一回事吗？

不是。

当前 `RuntimeState` 的职责非常明确：

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

我的初步建议是继续保持不变。

而 Session 可以理解为：

```text
Session
├── sessionId
└── Conversation Snapshot
    └── RuntimeMessage[]
```

Session 是可重新定位的一份对话记录；RuntimeState 是当前 Runtime 实例正在推进的事实状态。

一个 Session 可以先后由不同的 Runtime 实例加载，但不能因此认为这些实例都自动获得并发写入同一份历史的权利。

还要留意：`RunOutcome` 并没有保存进 `RuntimeState`。例如 `aborted` 是 Run 的终止结果，而 `TOOL_CALL_CANCELLED` 是已提交的消息事实。恢复对话需要后者，不一定需要持久化前者。

### G-2：谁有权保存与恢复状态？

这里存在两条有代表性的路线。

<box gap={3}>
  <box border radius="lg" padding={3} gap={2}>
    <row align="center" justify="between">
      **方案 A：Runtime 集成 Persistence**
      <badge color="secondary">候选</badge>
    </row>
    ```text
    AgentRuntime
       ├─ Agent Loop
       ├─ RuntimeState
       └─ SessionStore
            ├─ load()
            └─ save()
    ```
    每当 Runtime 产生可保存事实，由 Runtime 负责将它交给 Store。

    好处是持久化时机可与实际 Commit Boundary（事实提交边界）紧密结合；代价是 Runtime 要承担更多存储失败和异步协调责任。
  </box>
  <box border radius="lg" padding={3} gap={2}>
    <row align="center" justify="between">
      **方案 B：Application 编排 Persistence**
      <badge color="secondary">候选</badge>
    </row>
    ```text
    Application / SessionService
        ├─ SessionStore
        │    ├─ load()
        │    └─ save()
        └─ AgentRuntime
             ├─ Agent Loop
             └─ RuntimeState
    ```
    由外层负责加载快照、创建 Runtime，以及在适当的时机保存历史。

    好处是 Runtime Core 更纯粹；代价是调用方若只在 Run 结束后保存，就无法自动保证运行中每条消息都及时落盘。
  </box>
</box>

**我的初步倾向是 B，但要明确它的恢复保证。**

如果本节目标只是“正常完成对话后保存，进程重启后继续”，方案 B 比较合适。

如果目标包含“Run 进行到一半突然进程崩溃，恢复所有已经提交的消息”，单纯通过 `getMessages()` 在 Run 结束后保存就不够了。

这是我们必须明确的一条能力边界，而不是实现细节。

### G-3：什么时候保存 Conversation？

考虑这样一个 Tool Loop：

```text
User Input
   ↓
Model Output（ToolCall）
   ↓
Tool A Result
   ↓
Tool B Result
   ↓
Model Final Answer
```

有两个保存策略：

| 策略 | 优势 | 限制 |
|---|---|---|
| Run 结束后保存 | 实现简单，容易测试 | 进程中途崩溃可能丢失当前 Run 的全部未保存内容 |
| 每个事实 Commit 后保存 | 可缩小崩溃丢失窗口 | 涉及异步持久化、失败处理与提交顺序 |

还有一个容易忽略的问题：

即使每条消息都写文件，也不意味着具备完整的事务恢复能力。

例如已经持久化了 ToolCall，但对应 ToolResult 还没有写入，进程就崩溃了。恢复时就可能出现不完整的 Tool 协议。

因此 **保存频率和恢复合法性必须同时设计**。

VII-F 已经处理了正常 Abort 下的 ToolCall pairing，但进程直接崩溃无法执行 `finally`，也不能依赖 Abort 逻辑帮我们补齐历史。


### ChatGPT

> Message ID: `29e89e0c-98a5-4770-ba29-7902d8ea07bd`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：SessionStore + Conversation Recovery

<badge color="info">Architecture Analysis · 架构分析</badge>

本节我们正式进入 **Mini Agent Runtime 的持久化与会话恢复阶段**。

我已经核对了你提供的三份材料：

- 当前源码压缩包 `source-review(10).zip`，包括 `AgentRuntime`、`RuntimeState`、`ContextBuilder`、`ToolExecutor` 和测试代码。
- Part VII 总体规划 README。
- Part VII-F 最终 Milestone Note，包含 F-AD01～F-AD16 架构决策。

先明确本节的核心目标：

> **VII-F 解决“一个 Runtime 如何安全地运行和停止”；VII-G 要解决“一个 Runtime 消失后，另一个 Runtime 如何接着之前的对话继续”。**

这次我们仍然坚持三个原则：

1. 不推翻 VII-A～VII-F 已经确认的架构。
2. 不把 SessionStore 扩展成复杂的 Agent 平台。
3. 先确定架构决策，再编写 Codex Implementation Task。

---

## 一、首先理解 VII-G 为什么存在

假设我们已经实现了一个营销运营 Agent。

运营人员发起对话：

<box border radius="xl" padding={3} gap={3}>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="user-round" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">运营人员 · 第一轮</text>
      帮我分析一下双十一会员优惠券的使用情况。
    </box>
  </row>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="bot" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">Agent · 第一轮</text>
      双十一活动共领取了 10 万张优惠券，使用了 3 万张，核销率为 30%。
    </box>
  </row>
  <divider color="subtle"/>
  <row align="center" gap={2} justify="center">
    <icon name="refresh-cw" color="secondary"/>
    <text color="secondary" size="xs">Node.js 进程重启 / Runtime 实例被销毁</text>
  </row>
  <divider color="subtle"/>
  <row align="start" gap={2}>
    <box background="surface-secondary" radius="lg" padding={2}>
      <icon name="user-round" size="lg"/>
    </box>
    <box flex="1" gap={1}>
      <text weight="medium" size="xs" color="secondary">运营人员 · 第二轮</text>
      那如果给这批用户再发一张满 200 减 30 的券呢？
    </box>
  </row>
</box>

如果是当前 VII-F 的 Runtime：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("分析双十一优惠券");
await runtime.run("那如果再发一张券呢？");
```

只要 `runtime` 对象还在，第二次调用就能看到第一次的历史。

但如果 Node.js 进程重启：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("那如果再发一张券呢？");
```

新的 Runtime 是空的。

模型不知道“这批用户”是谁，也不知道之前分析的是哪场活动。

**这就是 VII-G 真正要解决的问题：Conversation Continuity（对话连续性）。**

注意，它不是让先前那个 JavaScript Promise 恢复执行，也不是恢复已经中断的模型调用，而是让新的 Runtime 从可靠保存的历史事实继续下一轮对话。

## 二、从真实代码看：我们现在已经拥有什么

从上传的 `agent-runtime.ts` 看，当前关键结构可以简化成：

```ts
export class AgentRuntime {
  readonly #state: RuntimeState = {
    messages: [],
  };

  #active = false;

  getMessages(): RuntimeMessage[] {
    return structuredClone(this.#state.messages);
  }

  async run(userInput: string, options = {}) {
    if (this.#active) {
      throw new Error(
        "AgentRuntime already has an active run."
      );
    }

    this.#active = true;

    try {
      return await this.#run(
        userInput,
        options.signal
      );
    } finally {
      this.#active = false;
    }
  }
}
```

这里有几个非常重要的既有架构事实：

| 已有机制 | VII-G 应如何承接 |
|---|---|
| `RuntimeState` 只有 `messages` | 保留消息事实模型 |
| `AgentRuntime` 是唯一状态修改者 | 恢复和持久化不能绕过这个所有权规则 |
| `getMessages()` 返回深拷贝 | 可以作为快照读取的基础 |
| `ContextBuilder` 无状态 | 恢复后继续读取最新消息构造模型上下文 |
| `#active` 是实例级控制状态 | 不将它序列化进 Session |
| Abort 保留已提交的消息事实 | 恢复时不能错误丢弃这些事实 |
| ToolCall 与 ToolResult 已有配对规则 | 恢复的数据必须保证消息协议合法 |

因此，**现有 Runtime 并不缺少对话状态模型，而是缺少对话状态的持久化和恢复生命周期。**

这意味着没有必要重新开发 Agent Loop，也不需要重建新的消息体系。

## 三、VII-G 的架构定位

我建议将 VII-G 理解为：在已有 Runtime 外围增加一个最小的持久化边界。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 290" width="100%" xmlns="http://www.w3.org/2000/svg">
    {#each [{y:12,t:"Caller / Application"},{y:76,t:"AgentRuntime",sub:"唯一 State mutation owner"},{y:140,t:"SessionStore",sub:"保存 / 加载 Conversation"},{y:204,t:"Persistence Backend",sub:"JSON 文件 / 其他存储介质"}] as n,i}
      <rect x="45" y={n.y} width="250" height={i===0?40:53} rx="9" fill={i===1?"#DDEBFA":i===2?"#DDF3E8":"#F1F3F5"} stroke={i===1?"#5689BB":i===2?"#4F9970":"#A4AAB2"} strokeWidth="1.2"/>
      <text x="170" y={n.y+20} fontSize="13" textAnchor="middle" fontWeight="600" fill="#25313D">{n.t}</text>
      {#if n.sub}<text x="170" y={n.y+37} fontSize="10" textAnchor="middle" fill="#566473">{n.sub}</text>{/if}
      {#if i<3}
        <path d={`M 163 ${n.y+(i===0?40:53)} v ${i===0?24:11} m -4 -6 l 4 6 l 4 -6`} fill="none" stroke="currentColor" strokeWidth="1.4"/>
        <path d={`M 177 ${n.y+(i===0?64:64)} v -${i===0?24:11} m -4 6 l 4 -6 l 4 6`} fill="none" stroke="currentColor" strokeWidth="1.4"/>
      {/if}
    {/each}
    <text x="170" y="276" textAnchor="middle" fontSize="10" fill="currentColor">双向箭头表示保存与加载，不代表恢复执行栈</text>
  </svg>
  <caption>逻辑职责示意，具体依赖方向仍需在 Design Decision 中确定。</caption>
</box>

它需要具备四个最小能力：

- **Session Identity（会话标识）**：知道这份历史属于哪次对话。
- **Conversation Persistence（对话持久化）**：把已经形成的对话事实保存下来。
- **Conversation Recovery（对话恢复）**：将历史事实加载进新的 Runtime。
- **Continuation（继续对话）**：恢复后能够正常执行下一次 `run()`。

这里尤其要区分三个概念：

| 概念 | 含义 | 本节 |
|---|---|---|
| Conversation Recovery | 恢复历史消息并开始新的一轮 | 必须 |
| Run Recovery | 恢复尚未结束的 Agent Loop | 不做 |
| Durable Execution | 断电后恢复 Tool 执行、避免重复副作用 | 不做 |

例如用户调用了发券 Tool，Node.js 恰好在业务 API 发券成功、Runtime 记录 ToolResult 之前崩溃。

VII-G 不能凭空判断券是否已经发出，更不应该自动重放这个 Tool。

这类问题涉及 Durable Execution（持久化执行）、幂等性和业务事务，不属于当前 Milestone。

---

## 四、我识别出的六个核心架构问题

下面这些是我们本节真正需要做决策的地方。

| 编号 | 架构问题 | 关键决策 |
|---|---|---|
| G-1 | Session 到底是什么？ | Session 是否只是 ID + Conversation Snapshot？ |
| G-2 | 谁管理持久化？ | AgentRuntime、SessionStore 还是调用方？ |
| G-3 | 什么时候保存？ | 每次 Run 结束，还是每条消息提交后？ |
| G-4 | 如何恢复？ | 新 Runtime 构造时注入历史，还是恢复方法？ |
| G-5 | 如何处理异常历史？ | 不完整 ToolCall、非法数据、存储失败 |
| G-6 | 同一 Session 被两个 Runtime 加载怎么办？ | 是否需要跨实例并发保护？ |

这六个问题彼此关联。

其中 **G-2 和 G-3 尤其重要**，因为它们决定 SessionStore 是一个简单的数据存储模块，还是开始参与 Agent Runtime 的生命周期控制。

### G-1：Session 与 RuntimeState 是一回事吗？

不是。

当前 `RuntimeState` 的职责非常明确：

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

我的初步建议是继续保持不变。

而 Session 可以理解为：

```text
Session
├── sessionId
└── Conversation Snapshot
    └── RuntimeMessage[]
```

Session 是可重新定位的一份对话记录；RuntimeState 是当前 Runtime 实例正在推进的事实状态。

一个 Session 可以先后由不同的 Runtime 实例加载，但不能因此认为这些实例都自动获得并发写入同一份历史的权利。

还要留意：`RunOutcome` 并没有保存进 `RuntimeState`。例如 `aborted` 是 Run 的终止结果，而 `TOOL_CALL_CANCELLED` 是已提交的消息事实。恢复对话需要后者，不一定需要持久化前者。

### G-2：谁有权保存与恢复状态？

这里存在两条有代表性的路线。

<box gap={3}>
  <box border radius="lg" padding={3} gap={2}>
    <row align="center" justify="between">
      **方案 A：Runtime 集成 Persistence**
      <badge color="secondary">候选</badge>
    </row>
    ```text
    AgentRuntime
       ├─ Agent Loop
       ├─ RuntimeState
       └─ SessionStore
            ├─ load()
            └─ save()
    ```
    每当 Runtime 产生可保存事实，由 Runtime 负责将它交给 Store。

    好处是持久化时机可与实际 Commit Boundary（事实提交边界）紧密结合；代价是 Runtime 要承担更多存储失败和异步协调责任。
  </box>
  <box border radius="lg" padding={3} gap={2}>
    <row align="center" justify="between">
      **方案 B：Application 编排 Persistence**
      <badge color="secondary">候选</badge>
    </row>
    ```text
    Application / SessionService
        ├─ SessionStore
        │    ├─ load()
        │    └─ save()
        └─ AgentRuntime
             ├─ Agent Loop
             └─ RuntimeState
    ```
    由外层负责加载快照、创建 Runtime，以及在适当的时机保存历史。

    好处是 Runtime Core 更纯粹；代价是调用方若只在 Run 结束后保存，就无法自动保证运行中每条消息都及时落盘。
  </box>
</box>

**我的初步倾向是 B，但要明确它的恢复保证。**

如果本节目标只是“正常完成对话后保存，进程重启后继续”，方案 B 比较合适。

如果目标包含“Run 进行到一半突然进程崩溃，恢复所有已经提交的消息”，单纯通过 `getMessages()` 在 Run 结束后保存就不够了。

这是我们必须明确的一条能力边界，而不是实现细节。

### G-3：什么时候保存 Conversation？

考虑这样一个 Tool Loop：

```text
User Input
   ↓
Model Output（ToolCall）
   ↓
Tool A Result
   ↓
Tool B Result
   ↓
Model Final Answer
```

有两个保存策略：

| 策略 | 优势 | 限制 |
|---|---|---|
| Run 结束后保存 | 实现简单，容易测试 | 进程中途崩溃可能丢失当前 Run 的全部未保存内容 |
| 每个事实 Commit 后保存 | 可缩小崩溃丢失窗口 | 涉及异步持久化、失败处理与提交顺序 |

还有一个容易忽略的问题：

即使每条消息都写文件，也不意味着具备完整的事务恢复能力。

例如已经持久化了 ToolCall，但对应 ToolResult 还没有写入，进程就崩溃了。恢复时就可能出现不完整的 Tool 协议。

因此 **保存频率和恢复合法性必须同时设计**。

VII-F 已经处理了正常 Abort 下的 ToolCall pairing，但进程直接崩溃无法执行 `finally`，也不能依赖 Abort 逻辑帮我们补齐历史。

### G-4：恢复时谁来注入历史消息？

当前 `AgentRuntime` 在类内部初始化：

```ts
readonly #state: RuntimeState = {
  messages: [],
};
```

并且只提供了：

```ts
getMessages(): RuntimeMessage[]
```

它能读取历史，却没有初始化历史的公开入口。

因此 VII-G 必须增加一种受控的恢复入口。

我倾向于通过构造时传入恢复快照，或者提供显式的 Runtime 创建流程，而不是新增随时可以调用的 `setMessages()`。

原因很简单：**恢复是初始化行为，不应该变成运行中任意改写历史的能力。**

这样也能继续遵守 VII-B 的决定：Runtime 是唯一的 State mutation owner。

### G-5：恢复的数据应该满足什么条件？

除了数据结构正确，还需要关心消息的语义正确性。

例如：

```text
user_input
model_output(toolCallId = A)
tool_result(toolCallId = A)
```

这是一段可以继续构造模型上下文的历史。

但如果是：

```text
user_input
model_output(toolCallId = A)
```

并且恢复时 A 没有结果，就可能破坏后续 Provider 调用。

所以本节至少需要讨论：

- 如何拒绝损坏的 Session 数据。
- 如何处理缺少 ToolResult 的消息。
- 是否允许自动修复历史，还是显式报告恢复失败。
- 加载的数据如何与 Runtime 内部状态隔离引用。

我的倾向是第一版采用 **严格验证、失败显式暴露、不自动猜测 Tool 执行结果**，但这还不是最终决定。

### G-6：跨 Runtime 的 Session 并发

VII-F 已经保证：

```text
Runtime A
  ├── Run 1 active
  └── Run 2 rejected
```

但不能保证：

```text
Runtime A ──┐
            ├── 同一个 Session
Runtime B ──┘
```

因为 A 和 B 都有自己的 `#active`。

这意味着两个 Runtime 可能读取相同的历史，分别生成下一轮消息，最后相互覆盖保存。

从工程上看，可以用版本号检查（Optimistic Concurrency Control，乐观并发控制）防止静默覆盖；但这不等于提供跨进程锁，也不等于自动合并两条对话。

我建议至少明确这种情况的行为，并把真正的分布式执行互斥留在 VII-G 的最小目标之外。

---

## 五、VII-G 完成标准与 Scope

本节暂定以如下标准验收。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">Milestone Acceptance Checklist（待架构决策确认）</text>
  {@body const checks = ["能够创建或定位 Session，并保存 Conversation","能够通过 Session ID 加载历史","能够使用保存的消息创建新的 AgentRuntime","恢复后 ContextBuilder 使用完整历史构建模型请求","恢复后再次 run() 能完成正常 Model → Tool → Model 链路","ToolCall / ToolResult 历史保持合法配对","存储失败、数据损坏不会悄悄当成空 Session","快照具有引用隔离，不能绕过 Runtime 修改状态","保留 VII-F Abort、Single Active Run 及事件行为","既有 75 项测试无回归，新增恢复与异常测试通过"]}
  {@body const [done,setDone] = DIL.useState([])}
  <row align="center" justify="between">
    <text color="secondary" size="xs">用于后续 Milestone Review</text>
    <text color="secondary" size="xs" tabularNums>{done.length}/{checks.length}</text>
  </row>
  <box background="surface-tertiary" height="5px" radius="full" clip>
    <box background="surface-inverted" height="100%" width={`${done.length/checks.length*100}%`} radius="full"/>
  </box>
  {#each checks as c,i}
    <checkbox key={i} checked={done.includes(i)} onChange={v=>setDone(p=>v?[...p,i]:p.filter(x=>x!==i))} lineThrough={false}>{c}</checkbox>
  {/each}
</box>

暂时不做 Session Tree、多 Agent、Durable Tool、Durable Approval、复杂 Compaction、分布式 Scheduler，也不提前实现 VII-H 的 Human Approval。

这些边界与 README 的 VII-A～VII-I 规划一致。

## 六、进入第一轮架构决策

我认为现在最需要先讨论的，不是使用 JSON 文件、SQLite 还是 Redis，而是 **Session 持久化究竟承诺多强的恢复能力**。

因为它会直接决定我们是否必须改动 `AgentRuntime` 的事实提交链路。

{@body const [choice,setChoice] = DIL.useState("a")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD01 候选决策：Conversation Recovery Guarantee（会话恢复保证）</text>
  <radio-group direction="col" value={choice} onChange={setChoice}>
    <radio value="a">
      **A. Run Boundary Persistence（按 Run 边界保存）**

      <text size="sm" color="secondary">正常结束一个 Run 后保存完整历史；发生进程崩溃时，允许丢失尚未保存的当前 Run。最简单，但需处理异常结束和保存失败。</text>
    </radio>
    <radio value="b">
      **B. Fact-level Persistence（按消息事实保存）**

      <text size="sm" color="secondary">尽量保存每条已提交消息，并定义中途崩溃留下不完整 ToolCall 时的恢复规则。能力更强，涉及更复杂的提交边界。</text>
    </radio>
    <radio value="c">
      **C. 两阶段增量演进**

      <text size="sm" color="secondary">VII-G 先实现 A，明确不保证运行中崩溃的逐消息恢复；在架构上避免阻碍未来 B，但不提前实现 B。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(choice==="a"?"VII-G G-AD01 我选择 A：Run Boundary Persistence。继续讨论持久化所有权与恢复行为。":choice==="b"?"VII-G G-AD01 我选择 B：Fact-level Persistence。继续讨论事实提交、存储失败和恢复协议。":"VII-G G-AD01 我选择 C：两阶段增量演进。继续讨论持久化所有权、恢复语义和最小实现边界。")}>确定方案，继续架构讨论 <icon name="arrow-right" inline/></button>
</box>

我个人更倾向于 **C**：既确保本节能真正做出可恢复对话的 Mini Runtime，又避免过早把它复杂化为持久化执行引擎。

我们先把 G-AD01 讨论确定，再逐步进入 SessionStore ownership、Session 数据模型、恢复入口与错误契约。等所有 Design Decisions 收敛后，再统一生成 Codex 的实现任务。


### ChatGPT

> Message ID: `e49215f7-d83b-480d-891f-eb51ff1fbf4f`; content: `text`; channel: `final`; recipient: `all`

### G-4：恢复时谁来注入历史消息？

当前 `AgentRuntime` 在类内部初始化：

```ts
readonly #state: RuntimeState = {
  messages: [],
};
```

并且只提供了：

```ts
getMessages(): RuntimeMessage[]
```

它能读取历史，却没有初始化历史的公开入口。

因此 VII-G 必须增加一种受控的恢复入口。

我倾向于通过构造时传入恢复快照，或者提供显式的 Runtime 创建流程，而不是新增随时可以调用的 `setMessages()`。

原因很简单：**恢复是初始化行为，不应该变成运行中任意改写历史的能力。**

这样也能继续遵守 VII-B 的决定：Runtime 是唯一的 State mutation owner。

### G-5：恢复的数据应该满足什么条件？

除了数据结构正确，还需要关心消息的语义正确性。

例如：

```text
user_input
model_output(toolCallId = A)
tool_result(toolCallId = A)
```

这是一段可以继续构造模型上下文的历史。

但如果是：

```text
user_input
model_output(toolCallId = A)
```

并且恢复时 A 没有结果，就可能破坏后续 Provider 调用。

所以本节至少需要讨论：

- 如何拒绝损坏的 Session 数据。
- 如何处理缺少 ToolResult 的消息。
- 是否允许自动修复历史，还是显式报告恢复失败。
- 加载的数据如何与 Runtime 内部状态隔离引用。

我的倾向是第一版采用 **严格验证、失败显式暴露、不自动猜测 Tool 执行结果**，但这还不是最终决定。

### G-6：跨 Runtime 的 Session 并发

VII-F 已经保证：

```text
Runtime A
  ├── Run 1 active
  └── Run 2 rejected
```

但不能保证：

```text
Runtime A ──┐
            ├── 同一个 Session
Runtime B ──┘
```

因为 A 和 B 都有自己的 `#active`。

这意味着两个 Runtime 可能读取相同的历史，分别生成下一轮消息，最后相互覆盖保存。

从工程上看，可以用版本号检查（Optimistic Concurrency Control，乐观并发控制）防止静默覆盖；但这不等于提供跨进程锁，也不等于自动合并两条对话。

我建议至少明确这种情况的行为，并把真正的分布式执行互斥留在 VII-G 的最小目标之外。

---

## 五、VII-G 完成标准与 Scope

本节暂定以如下标准验收。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">Milestone Acceptance Checklist（待架构决策确认）</text>
  {@body const checks = ["能够创建或定位 Session，并保存 Conversation","能够通过 Session ID 加载历史","能够使用保存的消息创建新的 AgentRuntime","恢复后 ContextBuilder 使用完整历史构建模型请求","恢复后再次 run() 能完成正常 Model → Tool → Model 链路","ToolCall / ToolResult 历史保持合法配对","存储失败、数据损坏不会悄悄当成空 Session","快照具有引用隔离，不能绕过 Runtime 修改状态","保留 VII-F Abort、Single Active Run 及事件行为","既有 75 项测试无回归，新增恢复与异常测试通过"]}
  {@body const [done,setDone] = DIL.useState([])}
  <row align="center" justify="between">
    <text color="secondary" size="xs">用于后续 Milestone Review</text>
    <text color="secondary" size="xs" tabularNums>{done.length}/{checks.length}</text>
  </row>
  <box background="surface-tertiary" height="5px" radius="full" clip>
    <box background="surface-inverted" height="100%" width={`${done.length/checks.length*100}%`} radius="full"/>
  </box>
  {#each checks as c,i}
    <checkbox key={i} checked={done.includes(i)} onChange={v=>setDone(p=>v?[...p,i]:p.filter(x=>x!==i))} lineThrough={false}>{c}</checkbox>
  {/each}
</box>

暂时不做 Session Tree、多 Agent、Durable Tool、Durable Approval、复杂 Compaction、分布式 Scheduler，也不提前实现 VII-H 的 Human Approval。

这些边界与 README 的 VII-A～VII-I 规划一致。

## 六、进入第一轮架构决策

我认为现在最需要先讨论的，不是使用 JSON 文件、SQLite 还是 Redis，而是 **Session 持久化究竟承诺多强的恢复能力**。

因为它会直接决定我们是否必须改动 `AgentRuntime` 的事实提交链路。

{@body const [choice,setChoice] = DIL.useState("a")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD01 候选决策：Conversation Recovery Guarantee（会话恢复保证）</text>
  <radio-group direction="col" value={choice} onChange={setChoice}>
    <radio value="a">
      **A. Run Boundary Persistence（按 Run 边界保存）**

      <text size="sm" color="secondary">正常结束一个 Run 后保存完整历史；发生进程崩溃时，允许丢失尚未保存的当前 Run。最简单，但需处理异常结束和保存失败。</text>
    </radio>
    <radio value="b">
      **B. Fact-level Persistence（按消息事实保存）**

      <text size="sm" color="secondary">尽量保存每条已提交消息，并定义中途崩溃留下不完整 ToolCall 时的恢复规则。能力更强，涉及更复杂的提交边界。</text>
    </radio>
    <radio value="c">
      **C. 两阶段增量演进**

      <text size="sm" color="secondary">VII-G 先实现 A，明确不保证运行中崩溃的逐消息恢复；在架构上避免阻碍未来 B，但不提前实现 B。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(choice==="a"?"VII-G G-AD01 我选择 A：Run Boundary Persistence。继续讨论持久化所有权与恢复行为。":choice==="b"?"VII-G G-AD01 我选择 B：Fact-level Persistence。继续讨论事实提交、存储失败和恢复协议。":"VII-G G-AD01 我选择 C：两阶段增量演进。继续讨论持久化所有权、恢复语义和最小实现边界。")}>确定方案，继续架构讨论 <icon name="arrow-right" inline/></button>
</box>

我个人更倾向于 **C**：既确保本节能真正做出可恢复对话的 Mini Runtime，又避免过早把它复杂化为持久化执行引擎。

我们先把 G-AD01 讨论确定，再逐步进入 SessionStore ownership、Session 数据模型、恢复入口与错误契约。等所有 Design Decisions 收敛后，再统一生成 Codex 的实现任务。


## Turn 2


### User

> Message ID: `8ba40719-6a3f-431b-9717-3a98a61f70e8`; content: `text`; channel: `None`; recipient: `all`

VII-G G-AD01 我选择 C：两阶段增量演进。继续讨论持久化所有权、恢复语义和最小实现边界。


### ChatGPT

> Message ID: `29b9ed3b-474f-4b09-b1e0-bd84ba203053`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 2 轮

**G-AD01 已确认：选择 C — 两阶段增量演进。**

这意味着我们正式确定了 VII-G 的第一条架构决策：

> 当前 Milestone 保证已经保存的 Conversation 能够在新的 Runtime 中恢复并继续对话，但不承诺在进程突然崩溃后恢复正在执行的 Run。

这不是放弃异常处理，而是明确区分 **Conversation Recovery（对话恢复）** 和 **Durable Execution（持久化执行）**。

## 一、G-AD01 的架构含义

采用 C 后，恢复能力分成两层。

| 场景 | VII-G v1 保证 |
|---|---|
| Run 正常完成，保存成功，进程重启 | <icon name="check-circle" color="success" inline/> 恢复 |
| Run 返回 `aborted`，保存成功 | <icon name="check-circle" color="success" inline/> 恢复已提交消息 |
| Run 返回 `limit_reached`，保存成功 | <icon name="check-circle" color="success" inline/> 恢复 |
| Provider 抛错，但历史仍可读取 | 需要明确失败后的保存规则 |
| Run 正在执行，Node.js 突然崩溃 | 不保证保留尚未保存的当前 Run |
| Tool 已产生外部副作用，但尚未写入结果就崩溃 | 不自动重放，也不假定 Tool 未执行 |

这与 VII-F 的 *Committed Facts Never Roll Back（已提交事实不回滚）* 不冲突。

VII-F 的 commit 指的是写入当前 RuntimeState；VII-G 新增的是把内存中的事实保存到持久化存储。两者不是天然的原子事务。

## 二、G-AD02：持久化的所有权应该属于谁？

我们已经在 VII-B 确定：

**AgentRuntime 是 RuntimeState 的唯一 mutation owner（状态修改所有者）。**

因此 VII-G 不能让 SessionStore 直接修改 `runtime.#state.messages`。

关键是要分清两个 ownership：

- **State Ownership**：谁可以改变正在运行的对话事实？仍然是 `AgentRuntime`。
- **Persistence Ownership**：谁决定加载、保存哪一个 Session？这是本轮要决定的新职责。

我建议采用上一轮的 **方案 B：Application-level Persistence Orchestration（应用层持久化编排）**。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 245" width="100%">
    <rect x="65" y="8" width="210" height="44" rx="8" fill="#DDEBFA" stroke="#6697CC"/>
    <text x="170" y="26" textAnchor="middle" fontSize="13" fontWeight="600" fill="#183956">Application / Caller</text>
    <text x="170" y="42" textAnchor="middle" fontSize="10" fill="#456078">负责会话生命周期编排</text>
    <path d="M116 52 V82 M224 52 V82" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M112 76 L116 83 L120 76 M220 76 L224 83 L228 76" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    <rect x="14" y="85" width="155" height="64" rx="8" fill="#DDF3E8" stroke="#61A782"/>
    <text x="91" y="107" textAnchor="middle" fontSize="12" fontWeight="600" fill="#20583A">AgentRuntime</text>
    <text x="91" y="124" textAnchor="middle" fontSize="10" fill="#406B50">Agent Loop</text>
    <text x="91" y="138" textAnchor="middle" fontSize="10" fill="#406B50">RuntimeState</text>
    <rect x="189" y="85" width="137" height="64" rx="8" fill="#F0E6FA" stroke="#AA86C6"/>
    <text x="257" y="107" textAnchor="middle" fontSize="12" fontWeight="600" fill="#5C3777">SessionStore</text>
    <text x="257" y="125" textAnchor="middle" fontSize="10" fill="#6F5580">load / save</text>
    <path d="M257 149 V183" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M253 177 L257 184 L261 177" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    <rect x="189" y="186" width="137" height="38" rx="8" fill="#F0F1F3" stroke="#9EA5AE"/>
    <text x="257" y="201" textAnchor="middle" fontSize="11" fontWeight="600" fill="#46505A">Storage</text>
    <text x="257" y="214" textAnchor="middle" fontSize="9" fill="#606A75">具体存储介质</text>
    <text x="92" y="174" textAnchor="middle" fontSize="10" fill="currentColor">不直接依赖 Store</text>
  </svg>
</box>

示意调用：

```ts
const session = await store.load(sessionId);

const runtime = new AgentRuntime(provider, {
  // 受控的初始历史，具体 API 待定
  initialMessages: session.messages,
});

const outcome = await runtime.run(userInput);

await store.save({
  sessionId,
  messages: runtime.getMessages(),
});
```

这是说明职责的伪代码，不是最终 API。

### 为什么我更推荐外部编排？

**第一，避免 AgentRuntime 承担数据库职责。**

当前 Runtime 已经负责 Agent Loop、State mutation、Event、Abort、Active Run 等核心机制。如果再让它直接维护 Session 生命周期，会让这个类的职责继续膨胀。

**第二，SessionStore 不需要理解 Agent Loop。**

Store 只需要知道如何保存、读取一份 Conversation Snapshot，不应该关心 Provider、ToolExecutor、`maxTurns` 或 AbortSignal。

**第三，便于后续接入业务系统。**

未来营销 Agent 可以由 Node.js 服务、Java 服务或上层业务应用管理 Session。Runtime 不必绑定特定数据库，也不必负责用户身份、会话列表等业务能力。

不过这个选择有明确限制：如果调用方在 Run 结束后、保存之前崩溃，当前 Run 的最新事实可能丢失。这是 G-AD01 已经接受的范围。

---

## 三、G-AD03：SessionStore 最小应该提供什么能力？

我的初步建议是保持极简：

```ts
interface SessionStore {
  load(sessionId: string): Promise<SessionSnapshot | null>;

  save(snapshot: SessionSnapshot): Promise<void>;
}
```

其中 `SessionSnapshot` 至少需要：

```ts
interface SessionSnapshot {
  sessionId: string;
  messages: RuntimeMessage[];
}
```

这两个结构目前只是设计候选。

**为什么暂时不加更多方法？**

例如：

- `deleteSession()`：不属于恢复对话的必要条件。
- `listSessions()`：属于会话管理产品能力。
- `appendMessage()`：会改变当前按 Run 保存的策略。
- `saveCheckpoint()`：容易提前引入执行检查点。
- `resumeRun()`：已经超出 Conversation Recovery。

同样，`title`、`createdAt`、`updatedAt` 这些字段，只有当前 Milestone 有实际使用场景时再添加。

但有一个地方值得提前讨论：**是否需要 `revision`（版本号）来避免多个 Runtime 静默覆盖同一 Session？**

版本号并不一定意味着复杂架构。它可以只是：

```text
Runtime A 读取 version 3
Runtime B 读取 version 3

Runtime A 保存 version 4：成功
Runtime B 试图以 version 3 保存：冲突
```

这样至少不会悄悄丢失 A 的对话。

然而，这同时会引入新的保存失败契约与版本管理。因此我建议把它放在 G-AD04 的并发讨论中，而不是马上加入最小接口。

## 四、G-AD04～G-AD06：恢复行为的初步边界

接下来还有三个相互依赖的问题。

| 决策 | 我的初步建议 | 原因 |
|---|---|---|
| G-AD04：恢复入口 | 新 Runtime 创建时注入已验证的历史 | 防止运行中任意替换 State |
| G-AD05：存储失败 | 明确抛错，不静默忽略 | 避免调用方误以为历史已经保存 |
| G-AD06：并发 Session | 至少禁止静默覆盖，具体是否采用 revision 待讨论 | VII-F 的实例级锁不覆盖跨实例竞争 |

这里要特别注意：**Store 保存失败不等于 Agent Run 失败。**

例如模型已经完成回答，`run()` 返回 `completed`，但随后文件写入失败。

此时：

```text
Agent Run：completed
Persistence：failed
```

不能事后把 `RunOutcome` 修改为 `aborted` 或 `unsupported`，也不应该为了保存失败重新执行 Tool。

这会是 VII-G 很有价值的工程学习点：执行结果与持久化结果属于两个不同的成功边界。

---

## 五、本轮要确定的决策

{@body const [decision,setDecision] = DIL.useState("external")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD02：Persistence Ownership（持久化所有权）</text>
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="external">
      **A. Application / Caller 编排（推荐）**

      <text color="secondary" size="sm">SessionStore 负责 load/save，调用方负责恢复 Runtime 和触发保存。保持 AgentRuntime 与存储模块解耦。</text>
    </radio>
    <radio value="runtime">
      **B. AgentRuntime 直接集成 SessionStore**

      <text color="secondary" size="sm">Runtime 自身管理恢复及保存时机，调用更简单，但核心类要承担持久化生命周期。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="external"?"确认 VII-G G-AD02 选择 A：Application / Caller 编排 Persistence。继续讨论 G-AD03 SessionStore 最小接口、SessionSnapshot、revision，以及保存失败契约。":"确认 VII-G G-AD02 选择 B：AgentRuntime 集成 SessionStore。继续讨论其依赖边界、最小接口和持久化失败处理。")}>确认 G-AD02，进入下一轮 <icon name="arrow-right" inline/></button>
</box>

我们接下来按顺序讨论 `SessionSnapshot`、恢复入口、存储失败、并发冲突，最后统一收敛 G-AD01～G-ADxx。

**当前仍处于 Design Decision，不进入 Codex Implementation。**


## Turn 3


### User

> Message ID: `7ba6da52-cbd9-4725-843f-7bf63bb21b70`; content: `text`; channel: `None`; recipient: `all`

确认 VII-G G-AD02 选择 A：Application / Caller 编排 Persistence。继续讨论 G-AD03 SessionStore 最小接口、SessionSnapshot、revision，以及保存失败契约。


### ChatGPT

> Message ID: `3f0ef3f4-79c1-4152-a456-d6499f3e9097`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 3 轮

<badge color="success">G-AD02 已确认</badge>

我们现在已经确定两条架构决策：

| ID | 已确认决策 |
|---|---|
| G-AD01 | 两阶段增量演进：先实现 Run 边界持久化，不做运行中断点恢复 |
| G-AD02 | Application / Caller 负责持久化编排，`AgentRuntime` 不直接依赖 `SessionStore` |

接下来讨论 **G-AD03：SessionStore 的最小接口与数据契约**。

这一轮我建议围绕四个问题展开：

1. SessionStore 究竟应该提供哪些方法？
2. SessionSnapshot 应该保存哪些字段？
3. 是否需要 `revision`（版本号）？
4. 保存失败后，Runtime 和调用方应该怎样处理？

其中第 3 个问题会直接影响我们的架构边界，值得重点讨论。

---

## 一、首先明确：SessionStore 不是 SessionManager

这两个概念容易混淆。

**SessionStore（会话存储）** 只负责持久化数据。

**SessionManager（会话管理器）** 通常还涉及创建、关闭、查找、生命周期管理、并发控制等职责。

按照 G-AD02，我们目前不需要引入 SessionManager。

已有的职责可以保持为：

```text
Application / Caller
    │
    ├── 管理 sessionId
    │
    ├── SessionStore
    │      ├── load()
    │      └── save()
    │
    └── AgentRuntime
           ├── Agent Loop
           ├── RuntimeState
           ├── ContextBuilder
           └── ToolExecutor
```

Runtime 专注运行，Store 专注保存。

这是对 VII-A～VII-F 的增量扩展，而不是重建架构。

## 二、G-AD03：SessionStore 最小接口

我建议采用：

```ts
interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<void>;
}
```

这里有两个需要明确的语义。

### 1. `load()`：不存在和失败必须区分

```ts
const snapshot = await store.load(sessionId);
```

可能出现三种结果：

| 情况 | 结果 | 含义 |
|---|---|---|
| Session 存在 | `SessionSnapshot` | 正常恢复 |
| Session 不存在 | `null` | 允许调用方决定是否创建新会话 |
| 存储读取失败 | Throw Error | 不能误认为新会话 |

为什么重要？

假设营销运营助手正在恢复一个历史对话，但文件损坏了。

错误的做法：

```ts
try {
  return await store.load(sessionId);
} catch {
  return null;
}
```

这会把“历史读取失败”伪装成“用户没有历史”。

随后用户提问“刚才那批会员怎么办”，Agent 就会在丢失上下文的情况下回答。

**存储失败必须显式暴露，不允许静默退化为空会话。**

### 2. `save()`：成功必须有明确含义

我们首先定义：

```ts
await store.save(snapshot);
```

Promise resolve 表示 Store 已按自己的存储契约成功保存该快照。

Promise reject 表示保存失败。

但要注意：`save()` 返回并不意味着所有存储介质都提供相同级别的断电持久性。

例如内存 Store、普通文件 Store 和数据库的 durability guarantee（持久性保证）可能不同。

VII-G 需要选择一种具体实现并明确它能保证什么，不能仅靠 TypeScript 接口声称绝对可靠。

---

## 三、SessionSnapshot 到底应该保存什么？

结合 VII-F 已经确认的原则：

> Session 只恢复稳定的 Conversation Facts（对话事实），不恢复进程内的执行控制状态。

我推荐最小数据模型：

```ts
interface SessionSnapshot {
  sessionId: string;
  messages: RuntimeMessage[];
}
```

<box border radius="lg" padding={3} gap={2}>
  <title size="md">SessionSnapshot</title>
  <box background="surface-secondary" radius="md" padding={3} gap={2}>
    <row justify="between" align="center">
      <text weight="medium">sessionId</text>
      <text color="secondary" size="xs">string</text>
    </row>
    <divider color="subtle"/>
    <row justify="between" align="center">
      <text weight="medium">messages</text>
      <text color="secondary" size="xs">RuntimeMessage[]</text>
    </row>
    <box border radius="md" padding={2} gap={1}>
      <row align="center" gap={2}>
        <icon name="message-square" color="secondary"/>
        <text size="sm">user_input</text>
      </row>
      <row align="center" gap={2}>
        <icon name="bot" color="secondary"/>
        <text size="sm">model_output</text>
      </row>
      <row align="center" gap={2}>
        <icon name="wrench" color="secondary"/>
        <text size="sm">tool_result</text>
      </row>
      <text color="tertiary" size="xs">按真实 RuntimeMessage 的既有结构保存</text>
    </box>
  </box>
  <caption>这是当前推荐的最小逻辑模型，还没有加入 revision。</caption>
</box>

### 为什么不直接保存整个 AgentRuntime？

因为下面这些都是不能直接恢复的进程内状态：

| 数据 | 是否持久化 | 原因 |
|---|---|---|
| `RuntimeState.messages` | 是 | 稳定的对话事实 |
| `#active` | 否 | 新 Runtime 有自己的运行所有权 |
| `AbortSignal` | 否 | 属于当前调用的控制信号 |
| `AbortController` | 否 | 不能跨进程恢复 |
| `ModelProvider` 实例 | 否 | 新 Runtime 重新注入 |
| `ToolRegistry` 实例 | 否 | 新 Runtime 重新注册工具 |
| `Subscriber` 回调 | 否 | 进程内函数，重新订阅 |
| `TurnSnapshot` | 否 | 可以由 ContextBuilder 重新生成 |
| `RunOutcome` | 暂不保存 | 当前目标是 Conversation Recovery，不是执行审计 |

特别是 `TurnSnapshot`。

VII-D 已经决定它是每个 Model Turn 临时生成的上下文投影。

恢复对话时：

```text
Stored RuntimeMessage[]
          ↓
New AgentRuntime
          ↓
ContextBuilder
          ↓
New TurnSnapshot
          ↓
ModelProvider
```

不需要保存旧的 TurnSnapshot。

这正体现了前面几节建立的模块边界。

---

## 四、最值得讨论的问题：要不要 revision？

我们先通过一个例子理解问题。

假设两个 Node.js Runtime 加载了同一个 Session。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">同一 Session 的并发写入</text>
  <svg viewBox="0 0 340 246" width="100%">
    <rect x="109" y="5" width="122" height="39" rx="7" fill="#E5E7EB" stroke="#9199A4"/>
    <text x="170" y="21" textAnchor="middle" fontSize="12" fontWeight="600" fill="#273444">SessionStore</text>
    <text x="170" y="35" textAnchor="middle" fontSize="10" fill="#4D5968">revision = 3</text>
    <path d="M132 44 L76 78 M208 44 L264 78" stroke="currentColor" strokeWidth="1.4" fill="none"/>
    <rect x="6" y="79" width="146" height="48" rx="7" fill="#DDEBFA" stroke="#6697CC"/>
    <text x="79" y="98" textAnchor="middle" fontSize="12" fill="#21466D" fontWeight="600">Runtime A</text>
    <text x="79" y="115" textAnchor="middle" fontSize="10" fill="#345878">读取 revision 3</text>
    <rect x="188" y="79" width="146" height="48" rx="7" fill="#DDEBFA" stroke="#6697CC"/>
    <text x="261" y="98" textAnchor="middle" fontSize="12" fill="#21466D" fontWeight="600">Runtime B</text>
    <text x="261" y="115" textAnchor="middle" fontSize="10" fill="#345878">读取 revision 3</text>
    <path d="M79 127 V157 M261 127 V157" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="6" y="158" width="146" height="49" rx="7" fill="#DDF3E8" stroke="#69A886"/>
    <text x="79" y="178" textAnchor="middle" fontSize="11" fontWeight="600" fill="#20573A">保存成功</text>
    <text x="79" y="194" textAnchor="middle" fontSize="10" fill="#40674E">revision 3 → 4</text>
    <rect x="188" y="158" width="146" height="49" rx="7" fill="#FCE3E3" stroke="#D17C7C"/>
    <text x="261" y="178" textAnchor="middle" fontSize="11" fontWeight="600" fill="#893C3C">版本冲突</text>
    <text x="261" y="194" textAnchor="middle" fontSize="10" fill="#9B5050">期望 3，实际 4</text>
    <text x="170" y="232" textAnchor="middle" fontSize="10" fill="currentColor">B 不得静默覆盖 A 的记录</text>
  </svg>
</box>

如果不使用版本号：

```ts
await store.save(snapshotA);
await store.save(snapshotB);
```

假设采用覆盖式保存，最终 B 可能覆盖 A。

VII-F 的 `#active` 也无能为力，因为 A 和 B 是不同的 Runtime 实例。

### revision 能解决什么？

可以将快照扩展为：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}
```

保存时采用 **Compare-and-Swap（CAS，比较并交换）** 语义：

```text
我要保存 revision 3 的快照

Store 当前也是 revision 3
    → 允许保存，变为 revision 4

Store 当前已经是 revision 4
    → 拒绝保存，报告 Conflict
```

重点在于：**版本比较和写入必须是一个原子操作。**

如果只是先 `load()` 比较，再执行普通 `save()`，两个写入仍然可能发生竞态。

### revision 解决不了什么？

它不能阻止两个 Runtime 同时调用模型或者 Tool。

例如：

```text
Runtime A → 发放优惠券
Runtime B → 发放优惠券

两者都已执行业务副作用

Runtime A → 保存成功
Runtime B → 保存冲突
```

虽然 B 的 Session 保存被拒绝，但 B 的券已经发出去了。

所以：

**revision 是防止会话历史静默丢失的保护，不是跨 Runtime 执行锁，更不是 Tool 幂等性方案。**

这个界限必须明确。

---

## 五、revision 的两种候选方案

<box gap={3}>
  <box border radius="lg" padding={3} gap={2}>
    **方案 A：VII-G 先不实现 revision**

    ```ts
    interface SessionSnapshot {
      sessionId: string;
      messages: RuntimeMessage[];
    }
    ```

    好处：接口简单，容易理解和测试。

    代价：如果多个 Runtime 保存相同 Session，可能发生覆盖，需要调用方保证单写入者。

    适合先跑通单用户、单 Runtime 的恢复演示。
  </box>
  <box border radius="lg" padding={3} gap={2}>
    **方案 B：VII-G 增加最小 revision（推荐）**

    ```ts
    interface SessionSnapshot {
      sessionId: string;
      revision: number;
      messages: RuntimeMessage[];
    }
    ```

    Store 明确实现条件写入；版本不匹配则抛出专门的 Conflict Error。

    好处：防止多个 Runtime 静默覆盖历史，为未来业务集成提供更安全的数据边界。

    代价：必须定义首次保存、版本递增、冲突处理，以及存储实现的原子性。
  </box>
</box>

我的推荐是 **B，但只实现最小乐观并发控制**。

理由是我们已经开始建立真正的持久化能力，静默覆盖历史属于数据正确性问题，而不仅是高级功能。

它不需要 Redis 分布式锁，也不需要引入 Scheduler。

但如果选 B，必须有能力在选定的存储介质上正确实现原子版本检查；不能仅给数据增加一个 `revision` 字段，就宣称已经解决并发安全。

---

## 六、保存失败应该如何处理？

这也是本轮需要形成的明确契约。

假设代码：

```ts
const outcome = await runtime.run(input);

await store.save(snapshot);
```

出现以下情况：

```text
AgentRuntime.run()
        ↓
   completed
        ↓
SessionStore.save()
        ↓
   抛出异常
```

此时 Runtime 已经正常完成。

所以我建议采用：

**Persistence Error 独立于 RunOutcome。**

不能做：

```ts
// ❌ 错误语义
catch {
  return { type: "aborted" };
}
```

因为用户没有取消 Run。

也不应该重新执行：

```ts
// ❌ 可能重复 Tool 副作用
catch {
  await runtime.run(input);
}
```

保存失败时应当：

1. 将保存错误原样或以明确的存储错误类型暴露给调用方。
2. 保留当前 Runtime 中已经提交的消息。
3. 不伪造 `run_finished(aborted)` 或其他生命周期事件。
4. 不自动重放模型调用或 Tool。
5. 再次保存前，应根据具体错误确定存储是否已经成功写入，不能一概假定失败等于完全未写入。

对于单纯的 revision conflict，更不应该自动覆盖较新的 Session。

这里还存在一个额外的设计细节：当前 VII-F 的 Provider Error 可以向上传播，但 Runtime 可能已经提交部分消息。因此应用层保存逻辑不能只覆盖 `run()` 正常返回的路径。我们在下一轮讨论恢复与保存流程时，应专门定义异常 Run 后如何提取和保存合法快照。

---

## 七、本轮决策收敛

目前我给出的建议如下：

| ID | 候选决策 | 状态 |
|---|---|---|
| G-AD03 | SessionStore 只包含 `load()` 和 `save()` | 建议采用 |
| G-AD04 | SessionSnapshot 保存 sessionId + messages，必要时增加 revision | 待定 |
| G-AD05 | `load()` 区分不存在与失败；`save()` 失败显式暴露 | 建议采用 |
| G-AD06 | 使用最小 revision 防止静默覆盖，不引入分布式锁 | 待定 |

我建议这一轮先锁定最有分歧的 **revision** 决策。

{@body const [revisionChoice,setRevisionChoice] = DIL.useState("b")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">你希望 VII-G 如何处理并发保存？</text>
  <radio-group direction="col" value={revisionChoice} onChange={setRevisionChoice}>
    <radio value="a">
      **A. 先不加 revision**

      <text color="secondary" size="sm">只保证单写入者场景，保持最简单的 SessionStore，未来需要时再加入并发检测。</text>
    </radio>
    <radio value="b">
      **B. 加最小 revision（推荐）**

      <text color="secondary" size="sm">增加原子条件写入和冲突错误，不做跨 Runtime 锁、自动重试或 Tool 幂等控制。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(revisionChoice==="a"?"VII-G 确认先不实现 revision；SessionStore 保留最小 load/save，并约定单写入者。继续讨论 Session 恢复入口、存储实现和异常 Run 保存规则。":"VII-G 确认加入最小 revision 与原子条件写入，防止 Session 静默覆盖。不引入跨 Runtime 执行锁或自动重试。继续讨论 Session 恢复入口、存储实现和异常 Run 保存规则。")}>确认并继续下一轮 <icon name="arrow-right" inline/></button>
</box>

下一轮我们会重点解决：**如何把加载出来的历史安全地注入新的 `AgentRuntime`，同时不破坏已有的 State Ownership 和 Agent Loop。**


## Turn 4


### User

> Message ID: `a1b1f598-f70c-415d-95eb-cbce2a66e9d5`; content: `text`; channel: `None`; recipient: `all`

VII-G 确认加入最小 revision 与原子条件写入，防止 Session 静默覆盖。不引入跨 Runtime 执行锁或自动重试。继续讨论 Session 恢复入口、存储实现和异常 Run 保存规则。


### ChatGPT

> Message ID: `48701401-1eb5-46dc-be9e-4d72d8597b56`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 4 轮

**本轮主题：Conversation Recovery + Persistence Boundary**

我们已经确认了 VII-G 的三个重要方向：

| 决策 | 最终结论 |
|---|---|
| G-AD01 | 两阶段增量演进，当前只实现 Run 边界持久化 |
| G-AD02 | Application / Caller 负责 Persistence Orchestration（持久化编排） |
| revision 决策 | 引入最小版本号 + 原子条件写入，防止 Session 静默覆盖 |

你明确排除了跨 Runtime 执行锁、自动重试与 Durable Execution（持久化执行）。

接下来需要解决一个更具体的问题：

> **新的 AgentRuntime 如何安全地接收历史消息？什么时候允许保存？如果 Run 执行中出现异常，我们究竟应该保存什么？**

这三个问题相互关联，不能分别随意设计。

---

## 一、先重新划清三个所有权

我们现在实际上有三种不同的 Ownership（所有权）。

| 所有权 | 负责模块 | 权限 |
|---|---|---|
| State Ownership | `AgentRuntime` | 修改运行中的 Conversation |
| Execution Ownership | `AgentRuntime.#active` | 控制单个实例的 Active Run |
| Persistence Ownership | Application + SessionStore | 决定何时读取、保存某个 Session |

这里新增的 revision 只提供 **Persistence Conflict Detection（持久化冲突检测）**。

它不代表某个 Runtime 已获得 Session 的独占执行权。

例如两个 Runtime 同时从 revision 5 开始运行，仍然都可能调用 Tool。只是在保存时，第二个写入者会因版本过期而被拒绝。

因此我们必须避免把 revision 理解为 VII-F `#active` 的跨实例版本。

## 二、G-AD07：Conversation Recovery 应该从哪里进入？

根据 VII-F 源码和收尾记录，当前 RuntimeState 仍然只包含 `messages`，并由 `AgentRuntime` 管理。

所以恢复入口有两种典型设计。

<box gap={3}>
  <box border radius="lg" padding={3} gap={2}>
    **方案 A：构造阶段注入初始历史（推荐）**

    ```ts
    const runtime = new AgentRuntime(
      provider,
      registry,
      {
        initialMessages: snapshot.messages
      }
    );
    ```

    <text color="secondary" size="sm">代码是接口示意，不代表已确认的构造函数签名。</text>

    恢复发生在 Runtime 开始执行之前。构造时验证消息并深拷贝，之后仍由 Runtime 独占状态修改权限。
  </box>
  <box border radius="lg" padding={3} gap={2}>
    **方案 B：创建后调用 restore()**

    ```ts
    const runtime = new AgentRuntime(...);

    runtime.restore(snapshot.messages);
    ```

    必须额外规定：只能调用一次、不能在 Active Run 中调用、不能在已有历史后调用，以及失败时是否保留原状态。

    这会给已经初始化的 Runtime 增加第二种状态修改入口。
  </box>
</box>

我建议选择方案 A。

它延续了之前学习过的一条原则：

**谁拥有 State，谁负责接收和验证初始 State；但外部不能在运行过程中任意改写它。**

具体而言：

- SessionStore 返回独立的消息快照。
- Application 把消息交给新建的 Runtime。
- Runtime 验证、深拷贝后建立自己的 `RuntimeState`。
- ContextBuilder 在下一次 `run()` 中使用恢复后的消息。
- 恢复本身不调用 ModelProvider，也不执行 Tool，更不发出虚假的 Run 生命周期事件。

还需要补充一点：恢复时不应简单地把任何 JSON 对象都当成合法 `RuntimeMessage[]`。TypeScript 的类型无法校验从磁盘读取的运行时数据。

---

## 三、G-AD08：SessionSnapshot 与 revision 怎么配合？

上一轮确定引入 revision，但我们还没有确定它的读写语义。

我建议采用下面这组最小契约：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

这里我有意将之前候选的 `save(): Promise<void>` 调整成返回最新快照。

原因是我们已经选择了 revision。

例如：

```ts
const snapshot = await store.load(sessionId);
// revision = 3

const updated = await store.save({
  sessionId,
  revision: snapshot.revision,
  messages: runtime.getMessages(),
});

// updated.revision = 4
```

调用方必须知道保存后的 revision，才能继续保存，而不必额外读取一次 Store。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">最小 revision 状态转换</text>
  <svg viewBox="0 0 330 124" width="100%">
    {#each [{x:5,t:"读取",s:"revision = 3"},{x:116,t:"条件保存",s:"期望 revision 3"},{x:227,t:"保存成功",s:"revision = 4"}] as n,i}
      <rect x={n.x} y="22" width="98" height="67" rx="8" fill={i===2?"#DDF3E8":"#E5EDF7"} stroke={i===2?"#66A883":"#799ABF"}/>
      <text x={n.x+49} y="47" fill="#29465F" fontSize="12" textAnchor="middle" fontWeight="600">{n.t}</text>
      <text x={n.x+49} y="66" fill="#4B6075" fontSize="9.5" textAnchor="middle">{n.s}</text>
      {#if i<2}<path d={`M ${n.x+99} 56 h 12 l -4 -4 m 4 4 l -4 4`} stroke="currentColor" strokeWidth="1.3" fill="none"/>{/if}
    {/each}
    <text x="165" y="112" textAnchor="middle" fontSize="10" fill="currentColor">比较版本与写入必须原子完成</text>
  </svg>
</box>

另外有三个必须统一的规则：

1. Session 首次创建时如何表示不存在的旧版本。
2. 保存时版本冲突抛出什么错误。
3. 保存成功后，调用方如何更新本地 revision。

我倾向于让 `revision = 0` 表示尚未创建的 Session，第一次成功保存得到 `revision = 1`。但这需要定义清楚“新会话”和“已存在会话”的区别，不能让 `load()` 失败时自动使用 0。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `18c59e44-b3d0-4b35-b18f-dbb80401dcf4`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(10).zip' | head -35 && unzip -p '/mnt/data/source-review(10).zip' '*/src/runtime/agent-runtime.ts' | head -100


### Public tool output

> Message ID: `445b4995-70a5-41f5-9f00-788750995a2d`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `b0e2c84b-ec6a-40e9-ba5f-b843556d1897`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -p '/mnt/data/source-review(10).zip' src/runtime/agent-runtime.ts | sed -n '1,120p'; unzip -p '/mnt/data/source-review(10).zip' src/messages/runtime-message.ts; unzip -p '/mnt/data/source-review(10).zip' src/runtime/runtime-state.ts


### Public tool output

> Message ID: `0e68f05e-2e28-4bb8-8d19-46712f091aef`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `d686c457-4d89-4e2c-a22a-1f8dabb446c0`; content: `text`; channel: `final`; recipient: `all`

## 四、G-AD09：选择什么存储实现？

我重新核对了压缩包中的实际构造函数，当前签名是：

```ts
constructor(
  provider: ModelProvider,
  options: AgentRuntimeOptions = {}
)
```

其中 `options` 已有 `registry` 和 `maxTurns`。所以若选择构造时恢复，我建议直接给现有 `AgentRuntimeOptions` 增加可选的 `initialMessages`，而不是增加第三个构造函数参数。

至于 SessionStore 的具体实现，有三种常见选择。

| 存储方式 | 能否跨进程恢复 | revision 原子写入 | 本节适合度 |
|---|---|---|---|
| MemorySessionStore | 否 | 进程内可实现 | 适合单元测试 |
| JSON FileSessionStore | 是 | 需要专门处理锁与竞态 | 实现细节较多 |
| SQLiteSessionStore | 是 | 可以用数据库事务和条件 UPDATE 实现 | 适合最小真实持久化 |

**我倾向于 SQLite + Memory 两种实现。**

原因是我们已经决定 revision 必须具有真正的原子性。

SQLite 可以通过事务和条件写入实现，不需要 Redis，也不用为了文件锁自行构建一套协调机制。

需要注意：SQLite 的原子事务可以保证条件写入不被其他并发事务插入破坏，但不能保证两个 Runtime 不会同时执行 Tool。

实际落地可以这样划分：

- `MemorySessionStore`：验证接口和数据隔离，用于确定性测试。
- `SQLiteSessionStore`：验证进程重建、持久化和 revision 冲突。
- `AgentRuntime`：继续不依赖 SQLite 或 Node.js 文件系统。

如果你希望 VII-G 进一步控制依赖规模，也可以只实现 SQLite Store，通过临时数据库做测试，不必同时维护两个生产级 Store。

---

## 五、G-AD10：异常 Run 后应该保存什么？

这是本轮最需要深入理解的地方。

我们已经确定按 Run 边界保存，但 **Run Boundary 不等于只有 `completed` 才保存**。

看看实际可能发生的情况。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">一个 Run 的四种典型结束情况</text>
  <box gap={2}>
    <row align="center" gap={2}>
      <icon name="check-circle-2" color="success"/>
      <box flex="1" gap={1}>
        **正常完成**
        <text color="secondary" size="xs">User → Model → Final Answer</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="octagon-x" color="secondary"/>
      <box flex="1" gap={1}>
        **用户取消**
        <text color="secondary" size="xs">User → Model ToolCalls → Cancelled Pairing</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="flag" color="secondary"/>
      <box flex="1" gap={1}>
        **达到 maxTurns**
        <text color="secondary" size="xs">User → Model ToolCalls → Skipped Pairing</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="alert-triangle" color="danger"/>
      <box flex="1" gap={1}>
        **Provider / Runtime 异常**
        <text color="secondary" size="xs">已提交消息可能不完整</text>
      </box>
      <badge>需验证</badge>
    </row>
  </box>
</box>

为什么最后一种情况要区别处理？

在当前实现中：

```text
1. Runtime append user_input
2. ModelProvider.generate()
3. Provider throw Error
4. Runtime finally 释放 #active
```

虽然 Run 抛出了错误，但 `user_input` 已经写入 RuntimeState。

如果调用方简单地只在 `run()` resolve 后保存，就会丢失这条已经提交的输入。

反过来，如果无论什么异常都直接保存 `runtime.getMessages()`，则可能遇到 ToolCall 已写入、ToolResult 尚未配对的不完整状态。

### 我建议的保存规则

| Run 结果 | 应用层行为 |
|---|---|
| `completed` | 保存完整快照 |
| `unsupported` | 保存已提交消息 |
| `limit_reached` | 保存包含 skipped pairing 的历史 |
| `aborted` | 保存已提交消息及 cancellation pairing |
| Provider / Runtime throw | 检查快照是否合法，再决定是否保存；保留原始异常 |
| Pre-aborted | 无新消息，不必保存 |
| 存储异常 | 不改变 RunOutcome，不自动重跑 Run |

重点是 **保存前的合法性验证**。

但这里存在一个还没有最终确定的细节：如果异常 Run 留下不完整 ToolCall，到底是拒绝保存整份快照，还是在显式规则下产生恢复用的终止记录？

基于 VII-F 的既有架构，我暂时推荐第一种：不自动补写 ToolResult，显式报告快照不可恢复。这样不会错误声称 Tool 已取消或失败。

后续如果真实需求需要，我们可以再讨论如何安全地表示异常中断的 ToolCall。


### ChatGPT

> Message ID: `56176d21-57bd-49d1-aa4f-c9d46b7325c8`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 4 轮

**本轮主题：Conversation Recovery + Persistence Boundary**

我们已经确认了 VII-G 的三个重要方向：

| 决策 | 最终结论 |
|---|---|
| G-AD01 | 两阶段增量演进，当前只实现 Run 边界持久化 |
| G-AD02 | Application / Caller 负责 Persistence Orchestration（持久化编排） |
| revision 决策 | 引入最小版本号 + 原子条件写入，防止 Session 静默覆盖 |

你明确排除了跨 Runtime 执行锁、自动重试与 Durable Execution（持久化执行）。

接下来需要解决一个更具体的问题：

> **新的 AgentRuntime 如何安全地接收历史消息？什么时候允许保存？如果 Run 执行中出现异常，我们究竟应该保存什么？**

这三个问题相互关联，不能分别随意设计。

---

## 一、先重新划清三个所有权

我们现在实际上有三种不同的 Ownership（所有权）。

| 所有权 | 负责模块 | 权限 |
|---|---|---|
| State Ownership | `AgentRuntime` | 修改运行中的 Conversation |
| Execution Ownership | `AgentRuntime.#active` | 控制单个实例的 Active Run |
| Persistence Ownership | Application + SessionStore | 决定何时读取、保存某个 Session |

这里新增的 revision 只提供 **Persistence Conflict Detection（持久化冲突检测）**。

它不代表某个 Runtime 已获得 Session 的独占执行权。

例如两个 Runtime 同时从 revision 5 开始运行，仍然都可能调用 Tool。只是在保存时，第二个写入者会因版本过期而被拒绝。

因此我们必须避免把 revision 理解为 VII-F `#active` 的跨实例版本。

## 二、G-AD07：Conversation Recovery 应该从哪里进入？

根据 VII-F 源码和收尾记录，当前 RuntimeState 仍然只包含 `messages`，并由 `AgentRuntime` 管理。

所以恢复入口有两种典型设计。

<box gap={3}>
  <box border radius="lg" padding={3} gap={2}>
    **方案 A：构造阶段注入初始历史（推荐）**

    ```ts
    const runtime = new AgentRuntime(
      provider,
      registry,
      {
        initialMessages: snapshot.messages
      }
    );
    ```

    <text color="secondary" size="sm">代码是接口示意，不代表已确认的构造函数签名。</text>

    恢复发生在 Runtime 开始执行之前。构造时验证消息并深拷贝，之后仍由 Runtime 独占状态修改权限。
  </box>
  <box border radius="lg" padding={3} gap={2}>
    **方案 B：创建后调用 restore()**

    ```ts
    const runtime = new AgentRuntime(...);

    runtime.restore(snapshot.messages);
    ```

    必须额外规定：只能调用一次、不能在 Active Run 中调用、不能在已有历史后调用，以及失败时是否保留原状态。

    这会给已经初始化的 Runtime 增加第二种状态修改入口。
  </box>
</box>

我建议选择方案 A。

它延续了之前学习过的一条原则：

**谁拥有 State，谁负责接收和验证初始 State；但外部不能在运行过程中任意改写它。**

具体而言：

- SessionStore 返回独立的消息快照。
- Application 把消息交给新建的 Runtime。
- Runtime 验证、深拷贝后建立自己的 `RuntimeState`。
- ContextBuilder 在下一次 `run()` 中使用恢复后的消息。
- 恢复本身不调用 ModelProvider，也不执行 Tool，更不发出虚假的 Run 生命周期事件。

还需要补充一点：恢复时不应简单地把任何 JSON 对象都当成合法 `RuntimeMessage[]`。TypeScript 的类型无法校验从磁盘读取的运行时数据。

---

## 三、G-AD08：SessionSnapshot 与 revision 怎么配合？

上一轮确定引入 revision，但我们还没有确定它的读写语义。

我建议采用下面这组最小契约：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

这里我有意将之前候选的 `save(): Promise<void>` 调整成返回最新快照。

原因是我们已经选择了 revision。

例如：

```ts
const snapshot = await store.load(sessionId);
// revision = 3

const updated = await store.save({
  sessionId,
  revision: snapshot.revision,
  messages: runtime.getMessages(),
});

// updated.revision = 4
```

调用方必须知道保存后的 revision，才能继续保存，而不必额外读取一次 Store。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">最小 revision 状态转换</text>
  <svg viewBox="0 0 330 124" width="100%">
    {#each [{x:5,t:"读取",s:"revision = 3"},{x:116,t:"条件保存",s:"期望 revision 3"},{x:227,t:"保存成功",s:"revision = 4"}] as n,i}
      <rect x={n.x} y="22" width="98" height="67" rx="8" fill={i===2?"#DDF3E8":"#E5EDF7"} stroke={i===2?"#66A883":"#799ABF"}/>
      <text x={n.x+49} y="47" fill="#29465F" fontSize="12" textAnchor="middle" fontWeight="600">{n.t}</text>
      <text x={n.x+49} y="66" fill="#4B6075" fontSize="9.5" textAnchor="middle">{n.s}</text>
      {#if i<2}<path d={`M ${n.x+99} 56 h 12 l -4 -4 m 4 4 l -4 4`} stroke="currentColor" strokeWidth="1.3" fill="none"/>{/if}
    {/each}
    <text x="165" y="112" textAnchor="middle" fontSize="10" fill="currentColor">比较版本与写入必须原子完成</text>
  </svg>
</box>

另外有三个必须统一的规则：

1. Session 首次创建时如何表示不存在的旧版本。
2. 保存时版本冲突抛出什么错误。
3. 保存成功后，调用方如何更新本地 revision。

我倾向于让 `revision = 0` 表示尚未创建的 Session，第一次成功保存得到 `revision = 1`。但这需要定义清楚“新会话”和“已存在会话”的区别，不能让 `load()` 失败时自动使用 0。

## 四、G-AD09：选择什么存储实现？

我重新核对了压缩包中的实际构造函数，当前签名是：

```ts
constructor(
  provider: ModelProvider,
  options: AgentRuntimeOptions = {}
)
```

其中 `options` 已有 `registry` 和 `maxTurns`。所以若选择构造时恢复，我建议直接给现有 `AgentRuntimeOptions` 增加可选的 `initialMessages`，而不是增加第三个构造函数参数。

至于 SessionStore 的具体实现，有三种常见选择。

| 存储方式 | 能否跨进程恢复 | revision 原子写入 | 本节适合度 |
|---|---|---|---|
| MemorySessionStore | 否 | 进程内可实现 | 适合单元测试 |
| JSON FileSessionStore | 是 | 需要专门处理锁与竞态 | 实现细节较多 |
| SQLiteSessionStore | 是 | 可以用数据库事务和条件 UPDATE 实现 | 适合最小真实持久化 |

**我倾向于 SQLite + Memory 两种实现。**

原因是我们已经决定 revision 必须具有真正的原子性。

SQLite 可以通过事务和条件写入实现，不需要 Redis，也不用为了文件锁自行构建一套协调机制。

需要注意：SQLite 的原子事务可以保证条件写入不被其他并发事务插入破坏，但不能保证两个 Runtime 不会同时执行 Tool。

实际落地可以这样划分：

- `MemorySessionStore`：验证接口和数据隔离，用于确定性测试。
- `SQLiteSessionStore`：验证进程重建、持久化和 revision 冲突。
- `AgentRuntime`：继续不依赖 SQLite 或 Node.js 文件系统。

如果你希望 VII-G 进一步控制依赖规模，也可以只实现 SQLite Store，通过临时数据库做测试，不必同时维护两个生产级 Store。

---

## 五、G-AD10：异常 Run 后应该保存什么？

这是本轮最需要深入理解的地方。

我们已经确定按 Run 边界保存，但 **Run Boundary 不等于只有 `completed` 才保存**。

看看实际可能发生的情况。

<box border radius="xl" padding={3} gap={2}>
  <text weight="medium">一个 Run 的四种典型结束情况</text>
  <box gap={2}>
    <row align="center" gap={2}>
      <icon name="check-circle-2" color="success"/>
      <box flex="1" gap={1}>
        **正常完成**
        <text color="secondary" size="xs">User → Model → Final Answer</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="octagon-x" color="secondary"/>
      <box flex="1" gap={1}>
        **用户取消**
        <text color="secondary" size="xs">User → Model ToolCalls → Cancelled Pairing</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="flag" color="secondary"/>
      <box flex="1" gap={1}>
        **达到 maxTurns**
        <text color="secondary" size="xs">User → Model ToolCalls → Skipped Pairing</text>
      </box>
      <badge>可保存</badge>
    </row>
    <divider color="subtle"/>
    <row align="center" gap={2}>
      <icon name="alert-triangle" color="danger"/>
      <box flex="1" gap={1}>
        **Provider / Runtime 异常**
        <text color="secondary" size="xs">已提交消息可能不完整</text>
      </box>
      <badge>需验证</badge>
    </row>
  </box>
</box>

为什么最后一种情况要区别处理？

在当前实现中：

```text
1. Runtime append user_input
2. ModelProvider.generate()
3. Provider throw Error
4. Runtime finally 释放 #active
```

虽然 Run 抛出了错误，但 `user_input` 已经写入 RuntimeState。

如果调用方简单地只在 `run()` resolve 后保存，就会丢失这条已经提交的输入。

反过来，如果无论什么异常都直接保存 `runtime.getMessages()`，则可能遇到 ToolCall 已写入、ToolResult 尚未配对的不完整状态。

### 我建议的保存规则

| Run 结果 | 应用层行为 |
|---|---|
| `completed` | 保存完整快照 |
| `unsupported` | 保存已提交消息 |
| `limit_reached` | 保存包含 skipped pairing 的历史 |
| `aborted` | 保存已提交消息及 cancellation pairing |
| Provider / Runtime throw | 检查快照是否合法，再决定是否保存；保留原始异常 |
| Pre-aborted | 无新消息，不必保存 |
| 存储异常 | 不改变 RunOutcome，不自动重跑 Run |

重点是 **保存前的合法性验证**。

但这里存在一个还没有最终确定的细节：如果异常 Run 留下不完整 ToolCall，到底是拒绝保存整份快照，还是在显式规则下产生恢复用的终止记录？

基于 VII-F 的既有架构，我暂时推荐第一种：不自动补写 ToolResult，显式报告快照不可恢复。这样不会错误声称 Tool 已取消或失败。

后续如果真实需求需要，我们可以再讨论如何安全地表示异常中断的 ToolCall。

## 六、G-AD11：恢复时如何保证历史可靠？

我建议把验证分为两层：

**第一层：SessionStore 校验存储数据。**

例如 `sessionId`、`revision`、消息数组的类型，以及读取的 JSON 是否损坏。

**第二层：Runtime 校验 Conversation 语义。**

例如：

- `model_output.toolCalls` 是否满足已有 ToolCall 类型契约。
- ToolCall ID 与 ToolResult 是否正确对应。
- 是否出现重复的 ToolResult 或无法配对的 ToolResult。
- 消息顺序是否满足已有的模型映射要求。
- 恢复时是否存在未完成的 ToolCall。

这一层不能只依赖 TypeScript interface，必须验证真实运行时数据。

更重要的是：**恢复失败不能偷偷创建一个空 Runtime。**

否则可能导致一次原本需要上下文的业务操作，在错误的历史基础上执行。

## 七、本轮架构决策汇总

| 决策 | 建议 | 状态 |
|---|---|---|
| G-AD07 | 通过 `AgentRuntimeOptions.initialMessages` 构造时恢复 | 待确认 |
| G-AD08 | `save()` 返回带有新 revision 的快照，revision 从 0 到 1 开始 | 待确认 |
| G-AD09 | 使用 SQLite 持久化，Memory Store 辅助测试 | 待确认 |
| G-AD10 | 正常终止保存；异常终止仅保存合法快照，不自动修复 ToolCall | 待确认 |
| G-AD11 | 恢复前验证数据结构与消息协议，不静默降级 | 待确认 |

本轮我们没有必要一次确定全部决策。最先要明确的是存储方案，因为它直接关系到 revision 能否正确实现。

{@body const [storage,setStorage] = DIL.useState("sqlite-memory")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD09：选择最小持久化实现</text>
  <radio-group direction="col" value={storage} onChange={setStorage}>
    <radio value="sqlite-memory">
      **A. SQLite + MemorySessionStore（推荐）**

      <text size="sm" color="secondary">SQLite 负责真实持久化与原子 revision，Memory Store 负责测试，二者共享最小 SessionStore 接口。</text>
    </radio>
    <radio value="sqlite">
      **B. 只实现 SQLiteSessionStore**

      <text size="sm" color="secondary">依赖和实现数量更少，通过临时数据库完成测试，不额外维护 Memory Store。</text>
    </radio>
    <radio value="file">
      **C. JSON 文件存储**

      <text size="sm" color="secondary">数据易于人工查看，但要额外解决原子条件写入及跨进程竞争问题。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(storage==="sqlite-memory"?"确认 VII-G G-AD09 采用 SQLiteSessionStore + MemorySessionStore。继续讨论 G-AD07/G-AD08 的构造恢复接口、revision 创建与更新契约，以及 G-AD10/G-AD11 的异常保存和协议验证细节。":storage==="sqlite"?"确认 VII-G G-AD09 只实现 SQLiteSessionStore。继续讨论构造恢复、revision 契约、异常保存和消息验证。":"确认 VII-G G-AD09 采用 JSON 文件存储，同时必须实现真实原子条件写入。继续讨论文件写入互斥、构造恢复、异常保存和消息验证。")}>确认存储方案，继续 <icon name="arrow-right" inline/></button>
</box>

接下来我们要进一步确定两个关键边界：

**恢复时验证到什么程度，以及发生不可恢复的历史错误时由谁承担责任。**

这会成为 VII-G 最关键的 Code Review 检查点之一。


### ChatGPT

> Message ID: `ae739cdd-e7fc-4b28-8698-0c3c37624668`; content: `text`; channel: `final`; recipient: `all`

## 六、G-AD11：恢复时如何保证历史可靠？

我建议把验证分为两层：

**第一层：SessionStore 校验存储数据。**

例如 `sessionId`、`revision`、消息数组的类型，以及读取的 JSON 是否损坏。

**第二层：Runtime 校验 Conversation 语义。**

例如：

- `model_output.toolCalls` 是否满足已有 ToolCall 类型契约。
- ToolCall ID 与 ToolResult 是否正确对应。
- 是否出现重复的 ToolResult 或无法配对的 ToolResult。
- 消息顺序是否满足已有的模型映射要求。
- 恢复时是否存在未完成的 ToolCall。

这一层不能只依赖 TypeScript interface，必须验证真实运行时数据。

更重要的是：**恢复失败不能偷偷创建一个空 Runtime。**

否则可能导致一次原本需要上下文的业务操作，在错误的历史基础上执行。

## 七、本轮架构决策汇总

| 决策 | 建议 | 状态 |
|---|---|---|
| G-AD07 | 通过 `AgentRuntimeOptions.initialMessages` 构造时恢复 | 待确认 |
| G-AD08 | `save()` 返回带有新 revision 的快照，revision 从 0 到 1 开始 | 待确认 |
| G-AD09 | 使用 SQLite 持久化，Memory Store 辅助测试 | 待确认 |
| G-AD10 | 正常终止保存；异常终止仅保存合法快照，不自动修复 ToolCall | 待确认 |
| G-AD11 | 恢复前验证数据结构与消息协议，不静默降级 | 待确认 |

本轮我们没有必要一次确定全部决策。最先要明确的是存储方案，因为它直接关系到 revision 能否正确实现。

{@body const [storage,setStorage] = DIL.useState("sqlite-memory")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD09：选择最小持久化实现</text>
  <radio-group direction="col" value={storage} onChange={setStorage}>
    <radio value="sqlite-memory">
      **A. SQLite + MemorySessionStore（推荐）**

      <text size="sm" color="secondary">SQLite 负责真实持久化与原子 revision，Memory Store 负责测试，二者共享最小 SessionStore 接口。</text>
    </radio>
    <radio value="sqlite">
      **B. 只实现 SQLiteSessionStore**

      <text size="sm" color="secondary">依赖和实现数量更少，通过临时数据库完成测试，不额外维护 Memory Store。</text>
    </radio>
    <radio value="file">
      **C. JSON 文件存储**

      <text size="sm" color="secondary">数据易于人工查看，但要额外解决原子条件写入及跨进程竞争问题。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(storage==="sqlite-memory"?"确认 VII-G G-AD09 采用 SQLiteSessionStore + MemorySessionStore。继续讨论 G-AD07/G-AD08 的构造恢复接口、revision 创建与更新契约，以及 G-AD10/G-AD11 的异常保存和协议验证细节。":storage==="sqlite"?"确认 VII-G G-AD09 只实现 SQLiteSessionStore。继续讨论构造恢复、revision 契约、异常保存和消息验证。":"确认 VII-G G-AD09 采用 JSON 文件存储，同时必须实现真实原子条件写入。继续讨论文件写入互斥、构造恢复、异常保存和消息验证。")}>确认存储方案，继续 <icon name="arrow-right" inline/></button>
</box>

接下来我们要进一步确定两个关键边界：

**恢复时验证到什么程度，以及发生不可恢复的历史错误时由谁承担责任。**

这会成为 VII-G 最关键的 Code Review 检查点之一。


## Turn 5


### User

> Message ID: `98728738-ec9b-4081-b56e-79e44f9e199e`; content: `text`; channel: `None`; recipient: `all`

确认 VII-G G-AD09 采用 SQLiteSessionStore + MemorySessionStore。继续讨论 G-AD07/G-AD08 的构造恢复接口、revision 创建与更新契约，以及 G-AD10/G-AD11 的异常保存和协议验证细节。


### ChatGPT

> Message ID: `30ca3d33-5764-4477-b7a3-5d5964c7bef0`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 5 轮

**本轮主题：恢复入口、Revision Contract、异常保存与历史校验**

我们已经确认 **G-AD09：采用 SQLiteSessionStore + MemorySessionStore**。

这两个 Store 必须遵守相同的存储契约。其中 SQLite 负责真实持久化与原子版本检查，Memory Store 用于确定性测试。

目前已确认的架构基线：

| 决策 | 最终结论 |
|---|---|
| G-AD01 | 先实现 Run 边界持久化，不做运行中断点恢复 |
| G-AD02 | Application / Caller 负责编排持久化 |
| Revision | 使用原子条件写入，防止静默覆盖 |
| G-AD09 | SQLiteSessionStore + MemorySessionStore |

这一轮，我建议我们重点解决四个问题：

1. **恢复入口**：如何把历史交给新的 `AgentRuntime`，又不破坏 State Ownership？
2. **版本协议**：首次创建、正常更新、并发冲突各是什么语义？
3. **异常保存**：Provider 抛错后，如何处理已经写入 RuntimeState 的消息？
4. **历史校验**：哪些消息能够安全恢复，哪些必须拒绝？

我会给出推荐设计，但先不把候选方案当成已经确定的 Architecture Decision。

---

## 一、G-AD07：构造时恢复，而不是运行中恢复

VII-F 已经确定：`AgentRuntime` 是唯一 State Mutation Owner（状态修改所有者）。

当前实现的 `AgentRuntimeOptions` 已有 `registry`、`maxTurns`，因此推荐在现有 Options 上做增量扩展。

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;

  // VII-G 新增
  initialMessages?: RuntimeMessage[];
}
```

使用方式：

```ts
const snapshot = await store.load(sessionId);

const runtime = new AgentRuntime(provider, {
  registry,
  initialMessages: snapshot?.messages ?? [],
});

await runtime.run("继续分析刚才的活动");
```

这里有个重要前提：`snapshot === null` 必须确实表示 Session 不存在，而不是加载失败。存储失败应直接抛错。

### 为什么不推荐 `runtime.restore()`？

考虑下面的情况：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("分析优惠券活动");

// 假如允许随时恢复
runtime.restore(oldMessages);
```

这相当于在一个已经发生过执行的 Runtime 中直接替换历史事实。

可能产生三个问题：

- **State Ownership**：外部调用能覆盖已提交的消息。
- **Event Semantics**：之前发出的 lifecycle events 和当前 State 不再对应。
- **Execution Consistency**：恢复后的历史可能与实际执行过的 Tool 不一致。

所以我推荐：

> Conversation Recovery 是 Runtime Initialization（初始化）的一部分，不是 Agent Loop 的一个操作。

### 恢复的具体行为

<box border radius="lg" padding={3} gap={2}>
  <list marker="number" connector="solid" gap={2}>
    <list-item>Application 调用 `store.load(sessionId)`。</list-item>
    <list-item>Store 返回独立的 `SessionSnapshot`，或者明确报告不存在或失败。</list-item>
    <list-item>Application 创建新的 `AgentRuntime` 并传入 `initialMessages`。</list-item>
    <list-item>Runtime 验证消息协议，深拷贝后建立内部 State。</list-item>
    <list-item>下一次调用 `run()` 时，`ContextBuilder` 读取完整的恢复历史。</list-item>
  </list>
</box>

整个恢复过程不应触发模型、Tool 或 `run_started` 等事件。

它只是重建 Conversation，不是重放之前的执行。

**G-AD07 推荐结论：使用 `AgentRuntimeOptions.initialMessages`，只允许构造时恢复，继续由 Runtime 独占状态修改权。**


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `4575f388-821f-4e7d-88ab-12c05e5af6a1`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(10).zip' | head -35 && unzip -p '/mnt/data/source-review(10).zip' '*/src/runtime/agent-runtime.ts' | head -80


### Public tool output

> Message ID: `0527063f-39c8-474c-90ac-e43525dcae08`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `8a276270-0c5b-4470-bbba-3b19fc94c5ea`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -p '/mnt/data/source-review(10).zip' src/runtime/agent-runtime.ts | sed -n '1,240p'; echo '---'; unzip -p '/mnt/data/source-review(10).zip' src/messages/runtime-message.ts; echo '---'; unzip -p '/mnt/data/source-review(10).zip' src/messages/to-model-message.ts


### Public tool output

> Message ID: `03212ce5-bc39-4164-85f9-0a5df285522f`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `e173e025-98f2-4b85-acfc-90faaa1ca592`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 5 轮

**本轮主题：恢复入口、Revision Contract、异常保存与历史校验**

我们已经确认 **G-AD09：采用 SQLiteSessionStore + MemorySessionStore**。

这两个 Store 必须遵守相同的存储契约。其中 SQLite 负责真实持久化与原子版本检查，Memory Store 用于确定性测试。

目前已确认的架构基线：

| 决策 | 最终结论 |
|---|---|
| G-AD01 | 先实现 Run 边界持久化，不做运行中断点恢复 |
| G-AD02 | Application / Caller 负责编排持久化 |
| Revision | 使用原子条件写入，防止静默覆盖 |
| G-AD09 | SQLiteSessionStore + MemorySessionStore |

这一轮，我建议我们重点解决四个问题：

1. **恢复入口**：如何把历史交给新的 `AgentRuntime`，又不破坏 State Ownership？
2. **版本协议**：首次创建、正常更新、并发冲突各是什么语义？
3. **异常保存**：Provider 抛错后，如何处理已经写入 RuntimeState 的消息？
4. **历史校验**：哪些消息能够安全恢复，哪些必须拒绝？

我会给出推荐设计，但先不把候选方案当成已经确定的 Architecture Decision。

---

## 一、G-AD07：构造时恢复，而不是运行中恢复

VII-F 已经确定：`AgentRuntime` 是唯一 State Mutation Owner（状态修改所有者）。

当前实现的 `AgentRuntimeOptions` 已有 `registry`、`maxTurns`，因此推荐在现有 Options 上做增量扩展。

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;

  // VII-G 新增
  initialMessages?: RuntimeMessage[];
}
```

使用方式：

```ts
const snapshot = await store.load(sessionId);

const runtime = new AgentRuntime(provider, {
  registry,
  initialMessages: snapshot?.messages ?? [],
});

await runtime.run("继续分析刚才的活动");
```

这里有个重要前提：`snapshot === null` 必须确实表示 Session 不存在，而不是加载失败。存储失败应直接抛错。

### 为什么不推荐 `runtime.restore()`？

考虑下面的情况：

```ts
const runtime = new AgentRuntime(provider);

await runtime.run("分析优惠券活动");

// 假如允许随时恢复
runtime.restore(oldMessages);
```

这相当于在一个已经发生过执行的 Runtime 中直接替换历史事实。

可能产生三个问题：

- **State Ownership**：外部调用能覆盖已提交的消息。
- **Event Semantics**：之前发出的 lifecycle events 和当前 State 不再对应。
- **Execution Consistency**：恢复后的历史可能与实际执行过的 Tool 不一致。

所以我推荐：

> Conversation Recovery 是 Runtime Initialization（初始化）的一部分，不是 Agent Loop 的一个操作。

### 恢复的具体行为

<box border radius="lg" padding={3} gap={2}>
  <list marker="number" connector="solid" gap={2}>
    <list-item>Application 调用 `store.load(sessionId)`。</list-item>
    <list-item>Store 返回独立的 `SessionSnapshot`，或者明确报告不存在或失败。</list-item>
    <list-item>Application 创建新的 `AgentRuntime` 并传入 `initialMessages`。</list-item>
    <list-item>Runtime 验证消息协议，深拷贝后建立内部 State。</list-item>
    <list-item>下一次调用 `run()` 时，`ContextBuilder` 读取完整的恢复历史。</list-item>
  </list>
</box>

整个恢复过程不应触发模型、Tool 或 `run_started` 等事件。

它只是重建 Conversation，不是重放之前的执行。

**G-AD07 推荐结论：使用 `AgentRuntimeOptions.initialMessages`，只允许构造时恢复，继续由 Runtime 独占状态修改权。**

## 二、G-AD08：Revision 的创建与更新契约

这里需要把 revision 的语义确定得更严格一些。

我建议使用 **Expected Revision（预期版本）** 作为保存的前置条件。

### 1. Session 首次创建

应用层生成 `sessionId`，然后创建第一份快照：

```ts
const initialSnapshot = {
  sessionId: "session-001",
  revision: 0,
  messages: [],
};

const saved = await store.save(initialSnapshot);
// saved.revision === 1
```

这里的 `revision: 0` 代表：调用方期望该 Session 尚不存在。

它不是已经持久化的版本 0。

如果 Store 中已经存在相同 `sessionId`，必须返回 Conflict，不允许覆盖。

### 2. 正常更新

```ts
const snapshot = await store.load("session-001");

if (snapshot === null) {
  throw new Error("Session not found");
}

const runtime = new AgentRuntime(provider, {
  initialMessages: snapshot.messages,
});

await runtime.run("你好");

const saved = await store.save({
  sessionId: snapshot.sessionId,
  revision: snapshot.revision,
  messages: runtime.getMessages(),
});
```

假设读取版本是 1，保存成功后版本变成 2。

### 3. 两个 Runtime 并发保存

| 操作 | Runtime A | Runtime B |
|---|---|---|
| Load | revision 2 | revision 2 |
| Run | 完成 | 完成 |
| Save | 成功，版本变成 3 | Conflict |
| 处理 | 保留已保存的历史 | 保留内存历史并报告冲突 |

特别强调：B 保存失败后不能直接重新读取最新 revision，再把旧消息覆盖上去。

那样相当于绕过了我们设计 revision 的意义。

### 4. SQLite 如何实现真正的原子条件写入？

不需要分布式锁，可以依靠数据库事务。

首次创建时，使用 `sessionId` 唯一约束，避免两个创建请求都成功。

更新时采用类似：

```sql
UPDATE sessions
SET
  revision = revision + 1,
  messages_json = ?
WHERE
  session_id = ?
  AND revision = ?;
```

然后检查受影响的行数。

- 1 行：更新成功。
- 0 行：版本不匹配或 Session 不存在，保存失败。

这里的 SQL 只是表达我们已经确认的 CAS 语义，并非 Codex Implementation Task。

**推荐结论：G-AD08 采用 revision 从 1 开始、0 表示预期不存在，保存成功返回新快照。**

---

## 三、G-AD10：异常 Run 后如何保存

这部分我重新核对了你上传的 `agent-runtime.ts`，有一个值得明确的边界。

当前实现是在 Provider 调用之前提交 `user_input`：

```ts
this.#state.messages.push({
  type: "user_input",
  content: userInput,
});
```

Provider 如果抛出普通异常，错误会继续向上传播。

因此可能出现：

```text
run("分析优惠券")
    ↓
append user_input
    ↓
Provider throw
    ↓
run() reject
    ↓
RuntimeState 仍然保留 user_input
```

这段历史其实可以作为下一轮的上下文，不应该因为本轮 Provider 失败就被简单丢弃。

但另一个异常场景不同：

```text
append model_output(toolCalls)
    ↓
Runtime 内部发生异常
    ↓
尚未形成全部 tool_result
```

这段历史可能不满足模型 Tool 协议，不能直接作为下一轮上下文。

### 我的建议：分两层处理

**第一层：Application 负责在 Run settle 后触发保存流程。**

包含正常返回和异常抛出。

**第二层：Snapshot Validator（快照校验逻辑）决定历史是否可以持久化并用于恢复。**

例如：

| 异常后历史 | 建议 |
|---|---|
| 只有新的 user_input | 允许保存 |
| 完整的 user + model_output | 允许保存 |
| ToolCall 与结果完整配对 | 允许保存 |
| ToolCall 未配对 | 拒绝作为可恢复快照保存 |
| 消息字段损坏或顺序不合法 | 拒绝保存 |

但是，我不建议创建一个复杂的 Validator Framework（校验框架）。

使用针对 `RuntimeMessage[]` 的最小验证函数即可，由构造恢复入口和 Store 数据边界复用。

### 这里还存在一个重要问题

假设上一次保存的版本是 5，本次运行产生了无法保存的历史。

此时不能为了凑出一份合法数据而偷偷删除最后几条消息。

VII-F 已经确立了：

> Committed Facts Never Roll Back（已提交事实不回滚）。

因此本节不应该修改 Runtime 内存事实，也不应该伪造 ToolResult。

应用层应明确报告：

```text
Run：failed
Conversation persistence：not completed
Last persisted revision：5
```

这样既不破坏已有事实，也不会把不合法的消息保存为可以继续运行的对话。

**需要特别注意**：Run 正常返回的 `aborted`、`limit_reached` 等结果，在当前实现中已经有 Tool pairing 处理；但这不代表所有普通异常后的历史一定合法。

---

## 四、G-AD11：历史消息验证到底做到什么程度？

这里我不建议仅使用 JSON Schema 检查字段类型。

原因是 Conversation 的合法性不仅是 TypeScript 结构问题，还有 **Protocol Invariant（协议不变量）**。

例如：

```ts
[
  {
    type: "model_output",
    toolCalls: [
      { id: "call-1", name: "query", arguments: {} }
    ]
  },
  {
    type: "tool_result",
    toolCallId: "call-2",
    content: "..."
  }
]
```

即使单个对象的字段结构都合法，ToolCall ID 仍然无法对应。

（上面是说明配对关系的示意数据，不代表当前 `ToolCall` 的完整字段契约。）

我建议最小验证分为四层：

| 层次 | 验证内容 |
|---|---|
| 结构 | 消息类型与各字段符合既有 `RuntimeMessage` Contract |
| 数据 | 消息内容和 ToolCall 参数可安全序列化与恢复 |
| 协议 | ToolCall ID 与 ToolResult 正确配对，不重复、不遗漏 |
| 边界 | 恢复的历史没有尚待执行的 ToolCall |

还需要保留 VII-C、VII-F 的历史语义：

- `TOOL_EXECUTION_SKIPPED` 是合法的 Runtime-generated result。
- `TOOL_CALL_CANCELLED` 也是合法的配对结果。
- 不能因为它们表示失败或取消，就把整段历史判定为非法。
- 验证不应该重新执行工具，也不需要检查历史 Tool 是否仍注册在当前 Registry 中。

### 校验应该放在哪里？

我建议分为两道边界：

```text
SQLite / Memory Store
        ↓
   Snapshot 数据校验
        ↓
Application / Caller
        ↓
AgentRuntime(initialMessages)
        ↓
   Conversation 协议校验
        ↓
RuntimeState
```

Store 需要拒绝损坏的数据；Runtime 需要拒绝无法安全进入 Agent Loop 的历史。

可以共用相同的基础验证逻辑，但不必为了复用而引入通用 Validation Engine。

---

## 五、我们还需要讨论一个容易遗漏的恢复问题

假设一次对话成功完成并保存了 revision 3。

应用层拿着同一个 Runtime 连续运行：

```ts
await runtime.run("问题 A");
await store.save(...); // revision 3

await runtime.run("问题 B");
await store.save(...); // revision 4
```

这是允许的。

但当保存 revision 4 失败时，该 Runtime 的内存历史可能已经比持久化历史更新。

这时：

- 不应该把 RuntimeState 回滚到 revision 3。
- 不应该把持久化 revision 假装更新成功。
- 不应该自动重跑问题 B。
- 调用方需要明确知道自己的内存历史尚未成功持久化。

这说明：

**RuntimeState 的版本与 SessionStore 的 revision 不是一回事。**

RuntimeState 目前无需增加版本字段。

revision 属于 SessionSnapshot 的持久化元数据，由 Application 持有并管理。

---

## 六、本轮决策建议

| ID | 候选结论 | 状态 |
|---|---|---|
| G-AD07 | 构造时通过 `initialMessages` 恢复 | 推荐确认 |
| G-AD08 | revision 0 表示新建预期，保存后递增并返回新快照 | 推荐确认 |
| G-AD09 | SQLite + Memory Store | 已确认 |
| G-AD10 | Run settle 后由 Application 保存；异常时仅保存可恢复快照 | 推荐确认 |
| G-AD11 | 运行时结构 + ToolCall 配对验证；不自动修复历史 | 推荐确认 |

我认为前四条可以一起收敛，但 **G-AD10/G-AD11 还需要补一个边界讨论**：对异常产生的不完整历史，我们究竟只报告失败，还是允许保存一份明确标记为不可恢复的诊断记录？

后者会改变 SessionSnapshot 的职责，因此目前更推荐前者，避免让 SessionStore 提前承担 Execution Log 的任务。

{@body const [decision,setDecision] = DIL.useState("strict")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">关键决策：不可恢复的 Conversation 如何处理？</text>
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="strict">
      **A. 严格拒绝保存（推荐）**

      <text color="secondary" size="sm">保持最后一次成功保存的 Session 不变；明确报告当前快照不可恢复。不修改 Runtime 内存历史，不伪造 ToolResult。</text>
    </radio>
    <radio value="diagnostic">
      **B. 保存不可恢复状态用于诊断**

      <text color="secondary" size="sm">为快照增加状态字段，允许保留异常历史，但恢复时必须拒绝继续执行。数据更完整，模型也更复杂。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="strict"?"VII-G 确认 G-AD07 构造时 initialMessages 恢复，G-AD08 revision 0 创建与递增版本，G-AD10 Run settle 后应用层保存，G-AD11 严格验证并拒绝保存不可恢复历史。不引入诊断快照。继续讨论应用层编排与异常传播的最终边界。":"VII-G 确认构造时恢复、revision 原子写入和应用层保存；但选择保存带明确不可恢复状态的诊断快照。继续讨论 Snapshot 状态字段与恢复拒绝规则。")}>确认决策并继续 <icon name="arrow-right" inline/></button>
</box>

我们暂时不进入 Codex 实现。下一轮应进一步确认 Application 如何编排 `run()`、`save()` 和错误传播，以及 Memory 与 SQLite Store 的一致性测试。这样在正式生成 Implementation Task 前，整个 VII-G 的职责、数据和异常契约才能真正闭合。


### ChatGPT

> Message ID: `155b9f50-f8d8-430f-9d56-98e76164556c`; content: `text`; channel: `final`; recipient: `all`

## 二、G-AD08：Revision 的创建与更新契约

这里需要把 revision 的语义确定得更严格一些。

我建议使用 **Expected Revision（预期版本）** 作为保存的前置条件。

### 1. Session 首次创建

应用层生成 `sessionId`，然后创建第一份快照：

```ts
const initialSnapshot = {
  sessionId: "session-001",
  revision: 0,
  messages: [],
};

const saved = await store.save(initialSnapshot);
// saved.revision === 1
```

这里的 `revision: 0` 代表：调用方期望该 Session 尚不存在。

它不是已经持久化的版本 0。

如果 Store 中已经存在相同 `sessionId`，必须返回 Conflict，不允许覆盖。

### 2. 正常更新

```ts
const snapshot = await store.load("session-001");

if (snapshot === null) {
  throw new Error("Session not found");
}

const runtime = new AgentRuntime(provider, {
  initialMessages: snapshot.messages,
});

await runtime.run("你好");

const saved = await store.save({
  sessionId: snapshot.sessionId,
  revision: snapshot.revision,
  messages: runtime.getMessages(),
});
```

假设读取版本是 1，保存成功后版本变成 2。

### 3. 两个 Runtime 并发保存

| 操作 | Runtime A | Runtime B |
|---|---|---|
| Load | revision 2 | revision 2 |
| Run | 完成 | 完成 |
| Save | 成功，版本变成 3 | Conflict |
| 处理 | 保留已保存的历史 | 保留内存历史并报告冲突 |

特别强调：B 保存失败后不能直接重新读取最新 revision，再把旧消息覆盖上去。

那样相当于绕过了我们设计 revision 的意义。

### 4. SQLite 如何实现真正的原子条件写入？

不需要分布式锁，可以依靠数据库事务。

首次创建时，使用 `sessionId` 唯一约束，避免两个创建请求都成功。

更新时采用类似：

```sql
UPDATE sessions
SET
  revision = revision + 1,
  messages_json = ?
WHERE
  session_id = ?
  AND revision = ?;
```

然后检查受影响的行数。

- 1 行：更新成功。
- 0 行：版本不匹配或 Session 不存在，保存失败。

这里的 SQL 只是表达我们已经确认的 CAS 语义，并非 Codex Implementation Task。

**推荐结论：G-AD08 采用 revision 从 1 开始、0 表示预期不存在，保存成功返回新快照。**

---

## 三、G-AD10：异常 Run 后如何保存

这部分我重新核对了你上传的 `agent-runtime.ts`，有一个值得明确的边界。

当前实现是在 Provider 调用之前提交 `user_input`：

```ts
this.#state.messages.push({
  type: "user_input",
  content: userInput,
});
```

Provider 如果抛出普通异常，错误会继续向上传播。

因此可能出现：

```text
run("分析优惠券")
    ↓
append user_input
    ↓
Provider throw
    ↓
run() reject
    ↓
RuntimeState 仍然保留 user_input
```

这段历史其实可以作为下一轮的上下文，不应该因为本轮 Provider 失败就被简单丢弃。

但另一个异常场景不同：

```text
append model_output(toolCalls)
    ↓
Runtime 内部发生异常
    ↓
尚未形成全部 tool_result
```

这段历史可能不满足模型 Tool 协议，不能直接作为下一轮上下文。

### 我的建议：分两层处理

**第一层：Application 负责在 Run settle 后触发保存流程。**

包含正常返回和异常抛出。

**第二层：Snapshot Validator（快照校验逻辑）决定历史是否可以持久化并用于恢复。**

例如：

| 异常后历史 | 建议 |
|---|---|
| 只有新的 user_input | 允许保存 |
| 完整的 user + model_output | 允许保存 |
| ToolCall 与结果完整配对 | 允许保存 |
| ToolCall 未配对 | 拒绝作为可恢复快照保存 |
| 消息字段损坏或顺序不合法 | 拒绝保存 |

但是，我不建议创建一个复杂的 Validator Framework（校验框架）。

使用针对 `RuntimeMessage[]` 的最小验证函数即可，由构造恢复入口和 Store 数据边界复用。

### 这里还存在一个重要问题

假设上一次保存的版本是 5，本次运行产生了无法保存的历史。

此时不能为了凑出一份合法数据而偷偷删除最后几条消息。

VII-F 已经确立了：

> Committed Facts Never Roll Back（已提交事实不回滚）。

因此本节不应该修改 Runtime 内存事实，也不应该伪造 ToolResult。

应用层应明确报告：

```text
Run：failed
Conversation persistence：not completed
Last persisted revision：5
```

这样既不破坏已有事实，也不会把不合法的消息保存为可以继续运行的对话。

**需要特别注意**：Run 正常返回的 `aborted`、`limit_reached` 等结果，在当前实现中已经有 Tool pairing 处理；但这不代表所有普通异常后的历史一定合法。

---

## 四、G-AD11：历史消息验证到底做到什么程度？

这里我不建议仅使用 JSON Schema 检查字段类型。

原因是 Conversation 的合法性不仅是 TypeScript 结构问题，还有 **Protocol Invariant（协议不变量）**。

例如：

```ts
[
  {
    type: "model_output",
    toolCalls: [
      { id: "call-1", name: "query", arguments: {} }
    ]
  },
  {
    type: "tool_result",
    toolCallId: "call-2",
    content: "..."
  }
]
```

即使单个对象的字段结构都合法，ToolCall ID 仍然无法对应。

（上面是说明配对关系的示意数据，不代表当前 `ToolCall` 的完整字段契约。）

我建议最小验证分为四层：

| 层次 | 验证内容 |
|---|---|
| 结构 | 消息类型与各字段符合既有 `RuntimeMessage` Contract |
| 数据 | 消息内容和 ToolCall 参数可安全序列化与恢复 |
| 协议 | ToolCall ID 与 ToolResult 正确配对，不重复、不遗漏 |
| 边界 | 恢复的历史没有尚待执行的 ToolCall |

还需要保留 VII-C、VII-F 的历史语义：

- `TOOL_EXECUTION_SKIPPED` 是合法的 Runtime-generated result。
- `TOOL_CALL_CANCELLED` 也是合法的配对结果。
- 不能因为它们表示失败或取消，就把整段历史判定为非法。
- 验证不应该重新执行工具，也不需要检查历史 Tool 是否仍注册在当前 Registry 中。

### 校验应该放在哪里？

我建议分为两道边界：

```text
SQLite / Memory Store
        ↓
   Snapshot 数据校验
        ↓
Application / Caller
        ↓
AgentRuntime(initialMessages)
        ↓
   Conversation 协议校验
        ↓
RuntimeState
```

Store 需要拒绝损坏的数据；Runtime 需要拒绝无法安全进入 Agent Loop 的历史。

可以共用相同的基础验证逻辑，但不必为了复用而引入通用 Validation Engine。

---

## 五、我们还需要讨论一个容易遗漏的恢复问题

假设一次对话成功完成并保存了 revision 3。

应用层拿着同一个 Runtime 连续运行：

```ts
await runtime.run("问题 A");
await store.save(...); // revision 3

await runtime.run("问题 B");
await store.save(...); // revision 4
```

这是允许的。

但当保存 revision 4 失败时，该 Runtime 的内存历史可能已经比持久化历史更新。

这时：

- 不应该把 RuntimeState 回滚到 revision 3。
- 不应该把持久化 revision 假装更新成功。
- 不应该自动重跑问题 B。
- 调用方需要明确知道自己的内存历史尚未成功持久化。

这说明：

**RuntimeState 的版本与 SessionStore 的 revision 不是一回事。**

RuntimeState 目前无需增加版本字段。

revision 属于 SessionSnapshot 的持久化元数据，由 Application 持有并管理。

---

## 六、本轮决策建议

| ID | 候选结论 | 状态 |
|---|---|---|
| G-AD07 | 构造时通过 `initialMessages` 恢复 | 推荐确认 |
| G-AD08 | revision 0 表示新建预期，保存后递增并返回新快照 | 推荐确认 |
| G-AD09 | SQLite + Memory Store | 已确认 |
| G-AD10 | Run settle 后由 Application 保存；异常时仅保存可恢复快照 | 推荐确认 |
| G-AD11 | 运行时结构 + ToolCall 配对验证；不自动修复历史 | 推荐确认 |

我认为前四条可以一起收敛，但 **G-AD10/G-AD11 还需要补一个边界讨论**：对异常产生的不完整历史，我们究竟只报告失败，还是允许保存一份明确标记为不可恢复的诊断记录？

后者会改变 SessionSnapshot 的职责，因此目前更推荐前者，避免让 SessionStore 提前承担 Execution Log 的任务。

{@body const [decision,setDecision] = DIL.useState("strict")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">关键决策：不可恢复的 Conversation 如何处理？</text>
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="strict">
      **A. 严格拒绝保存（推荐）**

      <text color="secondary" size="sm">保持最后一次成功保存的 Session 不变；明确报告当前快照不可恢复。不修改 Runtime 内存历史，不伪造 ToolResult。</text>
    </radio>
    <radio value="diagnostic">
      **B. 保存不可恢复状态用于诊断**

      <text color="secondary" size="sm">为快照增加状态字段，允许保留异常历史，但恢复时必须拒绝继续执行。数据更完整，模型也更复杂。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="strict"?"VII-G 确认 G-AD07 构造时 initialMessages 恢复，G-AD08 revision 0 创建与递增版本，G-AD10 Run settle 后应用层保存，G-AD11 严格验证并拒绝保存不可恢复历史。不引入诊断快照。继续讨论应用层编排与异常传播的最终边界。":"VII-G 确认构造时恢复、revision 原子写入和应用层保存；但选择保存带明确不可恢复状态的诊断快照。继续讨论 Snapshot 状态字段与恢复拒绝规则。")}>确认决策并继续 <icon name="arrow-right" inline/></button>
</box>

我们暂时不进入 Codex 实现。下一轮应进一步确认 Application 如何编排 `run()`、`save()` 和错误传播，以及 Memory 与 SQLite Store 的一致性测试。这样在正式生成 Implementation Task 前，整个 VII-G 的职责、数据和异常契约才能真正闭合。


## Turn 6


### User

> Message ID: `ad5a9072-1299-4bd3-914e-87a4ec48d6a3`; content: `text`; channel: `None`; recipient: `all`

VII-G 确认 G-AD07 构造时 initialMessages 恢复，G-AD08 revision 0 创建与递增版本，G-AD10 Run settle 后应用层保存，G-AD11 严格验证并拒绝保存不可恢复历史。不引入诊断快照。继续讨论应用层编排与异常传播的最终边界。


### ChatGPT

> Message ID: `d7d0ef7a-ba8f-4ec0-95e3-301159b2a656`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Design Decision 第 6 轮

**本轮主题：Application Orchestration（应用层编排）+ Error Propagation（异常传播）**

我们已经完成了 VII-G 的主要架构选择。这一轮需要把它们连接成一条完整、可靠的调用链。

先同步已经确认的决策：

| 决策 | 最终结论 |
|---|---|
| G-AD01 | 两阶段演进，当前采用 Run Boundary Persistence |
| G-AD02 | Application / Caller 负责持久化编排 |
| G-AD07 | `AgentRuntimeOptions.initialMessages` 构造时恢复 |
| G-AD08 | revision 0 表示首次创建预期；成功保存后递增 |
| G-AD09 | SQLiteSessionStore + MemorySessionStore |
| G-AD10 | Run settle 后保存合法快照 |
| G-AD11 | 严格验证历史；不自动修复、不保存不可恢复快照 |

接下来最重要的问题是：

> **如果 Agent 执行和 Session 保存分别成功或失败，调用方怎样知道真实结果，同时避免丢失原始错误？**

这不是普通的 `try/catch` 细节，而是 VII-G 新增的两个独立生命周期之间的边界问题。

---

## 一、首先明确：Agent Run 和 Persistence 是两个事务边界

这里说的事务边界，是指各自的成功与失败语义，并不是数据库事务包裹整个 Agent Run。

<box border radius="xl" padding={3} gap={2}>
  <svg viewBox="0 0 340 242" width="100%">
    <rect x="58" y="8" width="224" height="39" rx="8" fill="#E4EBF4" stroke="#7894B5"/>
    <text x="170" y="32" textAnchor="middle" fill="#253E5A" fontSize="13" fontWeight="600">Application / Caller</text>
    <path d="M170 47 V66" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="63" y="67" width="214" height="55" rx="8" fill="#DDF3E8" stroke="#68A685"/>
    <text x="170" y="88" textAnchor="middle" fill="#20583A" fontSize="13" fontWeight="600">1. AgentRuntime.run()</text>
    <text x="170" y="106" textAnchor="middle" fill="#3F6B51" fontSize="10">Agent Outcome / Original Error</text>
    <path d="M170 122 V141" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="63" y="142" width="214" height="55" rx="8" fill="#EAE3F5" stroke="#9880B6"/>
    <text x="170" y="163" textAnchor="middle" fill="#563C78" fontSize="13" fontWeight="600">2. SessionStore.save()</text>
    <text x="170" y="181" textAnchor="middle" fill="#6E5989" fontSize="10">New Revision / Persistence Error</text>
    <path d="M170 197 V216" stroke="currentColor" strokeWidth="1.5"/>
    <text x="170" y="232" textAnchor="middle" fontSize="11" fill="currentColor">分别结算，不伪造另一方结果</text>
  </svg>
</box>

一旦采用 Application-level Orchestration，就可能出现四种组合：

| Run | Persistence | 应当如何解释 |
|---|---|---|
| 成功 | 成功 | 本轮执行完成，历史已保存 |
| 成功 | 失败 | 本轮执行完成，但历史未确认保存 |
| 失败 | 成功 | Run 出错，但合法的已提交历史被保存 |
| 失败 | 失败 | 两个操作都失败，必须保留两者的信息 |

第四种尤其关键。

例如：

```text
Provider 抛出 NetworkError
       ↓
Application 尝试保存已有 user_input
       ↓
SQLite 写入失败
```

如果只是使用一个外层 `catch`，很容易让 SQLite 错误覆盖 Provider 错误。

这样调用方就失去了真正的执行失败原因。

## 二、G-AD12：Application 如何编排 run() 和 save()？

我建议维持我们已确认的外部编排模式，但明确它必须覆盖 Run 的所有 settlement 路径。

逻辑上：

```text
Application
    │
    ├─ Load / Create Session
    │
    ├─ Create AgentRuntime(initialMessages)
    │
    ├─ Run Agent
    │    ├─ Outcome
    │    └─ Error
    │
    ├─ Read committed messages
    │
    ├─ Validate restorable snapshot
    │
    ├─ Conditional Save (CAS)
    │
    └─ Report combined execution/persistence result
```

这里的关键点是：**Run 抛错后，仍然可能存在需要保存的合法消息事实。**

### 不推荐的实现

```ts
try {
  const outcome = await runtime.run(input);

  await store.save({
    sessionId,
    revision,
    messages: runtime.getMessages(),
  });

  return outcome;
} catch (error) {
  throw error;
}
```

这个代码最大的问题不是写法，而是 Provider 一旦抛错，就完全跳过了保存。

因此不满足 G-AD10。

### 推荐的语义

建议分别捕获 Run 结果与 Save 结果，然后由 Application 决定如何向上层报告。

例如：

```ts
type RunSettlement =
  | { type: "resolved"; outcome: RunOutcome }
  | { type: "rejected"; error: unknown };

type PersistenceSettlement =
  | { type: "saved"; snapshot: SessionSnapshot }
  | { type: "failed"; error: unknown }
  | { type: "not_saved"; reason: string };
```

这里是用来讨论错误模型的示意类型，不代表要为 Mini Runtime 新增两套公共 Union。

我们应尽量避免为了一个简单 Demo 设计完整的 `SessionService`、`RunCoordinator` 或大型 Result Framework。

**G-AD12 推荐：Application 在 Run settle 后读取快照，执行验证与条件保存，并分别保留 Run 和 Persistence 的结算信息。**

---

## 三、G-AD13：异常优先级和错误传播

接下来必须确定两次操作都失败时的行为。

有两种典型策略。

### 方案 A：保留原始 Run Error 为主要错误（推荐）

例如：

```text
Run Error：ProviderNetworkError
Persistence Error：SQLiteWriteError
```

最终应用层报告时，以 Run Error 作为主要错误，同时提供 Persistence Error。

优势是保留错误因果关系：Agent 为什么失败、保存为什么失败，两件事都可追踪。

不建议直接把二者压缩为一个模糊的 `SessionError`。

### 方案 B：统一包装成复合错误

例如：

```ts
throw new AggregateError(
  [runError, persistenceError],
  "Agent run and persistence both failed",
);
```

好处是一个异常中同时包含两个错误。

但代价是改变错误对象的 identity（对象身份），对于当前 VII-F 已经确立的 Provider Error 原对象传播语义，需要小心区分。

这里有一个容易被忽略的关键差异：

**AgentRuntime.run() 的原始错误传播契约可以保持不变，而 Application 层可以拥有自己的报告契约。**

也就是说，外部编排器不一定需要和 `run()` 完全相同的返回值结构，但不能反过来修改 Runtime Core 的既有错误行为。

我倾向于第一版不要增加复杂错误类型体系，而是在演示调用方里显式保留两个结算结果。

---

## 四、G-AD14：Revision 保存失败之后怎么办？

假设：

```text
Session revision = 5
       ↓
Runtime A 运行并形成新消息
       ↓
Runtime B 已先保存 revision 6
       ↓
Runtime A 保存 revision 5
       ↓
Conflict
```

我们已经决定不自动重试。

因此推荐行为是：

- Store 抛出明确的 `SessionConflictError`。
- 原 Session 的 revision 6 和消息保持不变。
- Runtime A 的内存消息不被回滚。
- Application 不自动合并两个 Runtime 的历史。
- Application 不重新执行 Agent Loop 或 Tool。

即使是没有发生版本冲突的普通 IO Error，也不能简单地认为“写入一定没成功”。

例如保存操作提交成功，但调用方在接收到确认前连接中断，调用方可能并不知道真实的持久化结果。

第一版可以将这种情况作为明确失败暴露，不必实现自动重试与结果对账，但必须避免误导性地宣称数据一定没有落盘。

---

## 五、G-AD15：保存哪些消息，如何保证快照一致？

VII-F 已有 `getMessages()`，它返回状态的深拷贝。

这对 VII-G 是一个有利的既有接口。

但需要保证调用方读取时：

```ts
const messages = runtime.getMessages();
```

Runtime 已经 settle，不会再由当前 Run 继续修改状态。

因此我们推荐：

```text
Await Runtime settlement
          ↓
Get messages snapshot
          ↓
Validate
          ↓
Store.save()
```

这样与 G-AD01 的 Run Boundary Persistence 一致。

不过这里需要增加一个重要限制：

**不能在保存进行时，让同一个 Runtime 开始新的 Run。**

因为 VII-F 的 `#active` 只保护 `run()` 执行期间，并不保护应用层的异步 `store.save()`。

例如：

```text
Run A settled
       ↓
Save A pending
       ↓
Run B started
       ↓
Save B started
```

两个保存可能使用同一个旧 revision，进而产生冲突。

CAS 能防止静默覆盖，但无法自动保证调用方的保存顺序。

因此 G-AD02 的 Application-level Ownership 必须承担一个约束：

> **同一个 Session 的恢复、Run、保存应被应用层视为一组顺序操作；保存完成前不启动下一次对该 Session 的写入流程。**

这不是要求创建全局分布式锁。

对于 Mini Runtime v1，我们可以在 Application Demo 中通过顺序 `await` 保证。

同时在文档中明确：两个独立进程仍然可能同时执行同一 Session 的 Run，revision 只能在保存时检测冲突。

---

## 六、Memory 与 SQLite 的一致性测试

既然我们已经决定实现两种 Store，我建议用相同的契约测试检验二者。

| 测试场景 | Memory | SQLite |
|---|---|---|
| 加载不存在 Session 返回 null | 必测 | 必测 |
| revision 0 首次创建 | 必测 | 必测 |
| 重复创建同一 ID 返回冲突 | 必测 | 必测 |
| 以当前 revision 更新 | 必测 | 必测 |
| 过期 revision 更新失败 | 必测 | 必测 |
| 保存后读取完整消息 | 必测 | 必测 |
| load/save 引用隔离 | 必测 | 必测 |
| 版本冲突不修改已有数据 | 必测 | 必测 |
| 非法快照拒绝保存 | 必测 | 必测 |
| 新实例恢复并继续对话 | 集成测试 | 集成测试 |
| 关闭并重开存储后恢复 | 不适用 | 必测 |
| 不同数据库连接并发 CAS | 不适用 | 必测 |

这组测试不是为了追求数量，而是验证两种 Store 共享同一个契约。

尤其 SQLite 的跨连接 CAS 测试很重要，因为只有单实例顺序测试不能证明原子并发行为。

---

## 七、还有一个需要预先指出的问题

当前我们选择了“严格拒绝保存不可恢复的历史”。

这意味着：

```text
Run failed
   ↓
RuntimeState contains incomplete ToolCalls
   ↓
Snapshot validation failed
   ↓
No new revision persisted
```

但这时同一个 Runtime 的内存状态依然包含不完整的历史。

如果 Application 不加检查，直接调用：

```ts
await runtime.run("继续");
```

依然可能把不完整 ToolCall 传给 ModelProvider。

**因此 G-AD11 不能只保护 SessionStore，还应该保护 Runtime 的恢复入口和异常后续用行为。**

不过，这并不意味着本节应该顺手实现一个完整的 Runtime 故障恢复状态机。

我的建议是：

- 对从 Session 恢复的数据进行严格校验。
- 对准备保存的快照进行相同的协议校验。
- 如果发现当前 Runtime 历史不合法，Application 不继续复用这个 Runtime。
- 保持旧 Runtime 事实不变；必要时从最后一次成功持久化的 Session 创建新 Runtime。
- 不自动重放上一次 Tool 或 User Input。

这属于应用层的安全使用边界，而不是重写 VII-F 的错误处理机制。

---

## 八、本轮待确认的架构决策

| ID | 推荐决策 |
|---|---|
| G-AD12 | Application 在 Run settle 后执行验证和保存，覆盖 resolved 与 rejected 两种路径 |
| G-AD13 | Run Error 与 Persistence Error 分别保留；Runtime 原有错误语义不变 |
| G-AD14 | Conflict 显式失败，不覆盖、不自动合并、不自动重试 |
| G-AD15 | 同一 Session 的 Run → Save 在应用层顺序完成 |
| G-AD16 | 非法历史不继续复用，不自动修复；可从最后一次成功保存的快照重新构建 |

其中 **G-AD15 需要特别区分应用层顺序编排和跨实例互斥**：

- 前者是我们本节的最小实现约束。
- 后者是更复杂的执行协调能力，本节不做。

### 这一轮建议确认的方案

{@body const [decision,setDecision] = DIL.useState("minimal")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">Application 的异常传播采用哪种方式？</text>
  <radio-group direction="col" value={decision} onChange={setDecision}>
    <radio value="minimal">
      **A. 双 Settlement，外层显式处理（推荐）**

      <text color="secondary" size="sm">Application 分别保留 Run 与 Persistence 的结果，调用方决定如何展示或抛出错误。不引入新的通用 Result Framework。</text>
    </radio>
    <radio value="aggregate">
      **B. 对双重失败统一使用 AggregateError**

      <text color="secondary" size="sm">同时失败时包装两个错误，便于一次抛出，但外层错误不再等于原始 Run Error。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(decision==="minimal"?"VII-G 确认 G-AD12～G-AD16：采用 Application 双 Settlement 编排，保留 Run/Persistence 各自错误；Conflict 显式失败，同 Session 顺序 Run→Save，非法历史不继续复用。继续检查架构决策是否闭合，以及还有哪些 Must Decide。":"VII-G 确认 G-AD12～G-AD16：采用 AggregateError 表示双重失败；Conflict 显式失败，同 Session 顺序 Run→Save，非法历史不继续复用。继续检查设计闭合。")}>确认错误协议，继续 <icon name="arrow-right" inline/></button>
</box>

确认之后，我们下一轮就应该从继续增加功能转向 **Architecture Closure Review（架构决策闭合审查）**：检查是否仍有真正影响正确性的未决问题，明确 Implementation Scope 与测试标准，然后再进入 Codex Implementation Task。


## Turn 7


### User

> Message ID: `9ae17f6e-ad93-499e-beea-bc8d33e5088d`; content: `text`; channel: `None`; recipient: `all`

VII-G 确认 G-AD12～G-AD16：采用 Application 双 Settlement 编排，保留 Run/Persistence 各自错误；Conflict 显式失败，同 Session 顺序 Run→Save，非法历史不继续复用。继续检查架构决策是否闭合，以及还有哪些 Must Decide。


### ChatGPT — commentary / rendered fragment

> Message ID: `4f3f8210-ec1c-474f-b247-7d6f4a544f1b`; content: `text`; channel: `commentary`; recipient: `all`

我会按“必须在实现前决定”和“可以交给 Codex 落地”两类审查，重点检查首次建 Session、异常后的快照合法性、以及双 Settlement 是否真的能保持错误语义。不会重新扩大 VII-G 的范围。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `f2f2d718-54e5-4441-9be5-8000b7cd4d64`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -l '/mnt/data/source-review(10).zip' | head -45; ls -l /mnt/data/README\(7\).md /mnt/data/day08-part-vii-f-abort-single-active-run\(1\).md


### Public tool output

> Message ID: `c91a6d6a-a9ef-448b-9ed9-de7c1034de38`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `c8e72a6a-a1ae-46ed-a46b-67a2a8406b78`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -p '/mnt/data/source-review(10).zip' src/runtime/agent-runtime.ts | sed -n '1,255p'; echo '---messages---'; unzip -p '/mnt/data/source-review(10).zip' src/messages/runtime-message.ts; unzip -p '/mnt/data/source-review(10).zip' src/messages/to-model-message.ts; unzip -p '/mnt/data/source-review(10).zip' src/runtime/context-builder.ts


### Public tool output

> Message ID: `208a3daa-37a2-44dc-aa96-8a47b4e6d91e`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `a1abfa2d-ec13-4233-befa-1bdd7b52fabc`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Architecture Closure Review（第 7 轮）

<badge color="success">G-AD12～G-AD16 已确认</badge>

这轮我们不再增加新功能，而是对 VII-G 进行一次正式的 **Architecture Closure Review（架构闭合审查）**。

我重新核对了上传的 `source-review(10).zip`，重点检查 `agent-runtime.ts`、`runtime-message.ts`、`context-builder.ts`，并对照 VII-F 的 F-AD01～F-AD16。

先说结论：

**VII-G 的核心设计已经基本收敛，但目前还不建议直接生成 Codex Implementation Task。**

我识别出 **4 项 Must Decide（实现前必须明确）**，以及若干可以直接交给 Codex 的工程实现细节。

其中最重要的不是 SQLite，也不是 revision，而是：

> 我们目前已经定义了如何保存合法历史，却还没有完全定义“合法历史如何跨 Run 连续演进”，以及“失败之后如何避免错误地使用旧版本历史”。

---

## 一、已经闭合的架构决策

先冻结已确认的部分，后续不反复设计。

| 范围 | 最终决定 | 状态 |
|---|---|---|
| 持久化粒度 | Run Boundary Persistence | 已确认 |
| Persistence Owner | Application / Caller | 已确认 |
| State Mutation Owner | AgentRuntime | 保留 VII-B 决策 |
| 恢复入口 | `initialMessages`，构造时恢复 | 已确认 |
| SessionStore | `load()` / `save()` | 已形成共识 |
| 存储实现 | Memory + SQLite | 已确认 |
| Revision | CAS 原子条件写入 | 已确认 |
| 创建版本 | revision 0 表示预期不存在，首次保存成为 1 | 已确认 |
| 错误传播 | Run 与 Persistence 双 Settlement | 已确认 |
| 保存时机 | Run settle 后验证并保存 | 已确认 |
| 历史损坏 | 严格拒绝，不自动修复 | 已确认 |
| 并发冲突 | 不自动重试、合并或覆盖 | 已确认 |
| 同 Session 顺序操作 | Application 负责 Run → Save | 已确认 |
| Durable Execution | 不实现 | 已排除 |

这些决策可以继续沿用。

---

## 二、Must Decide 1：什么叫合法的 Conversation History？

<text color="secondary" weight="medium" size="xs">影响：G-AD11 · Snapshot Validation</text>

这是源码复核后发现需要特别强调的问题。

当前消息模型只有三类：

```ts
type RuntimeMessage =
  | RuntimeUserMessage
  | RuntimeAssistantMessage
  | RuntimeToolMessage;
```

其中 `RuntimeAssistantMessage` 支持可选的 `content` 和 `toolCalls`，而 `RuntimeToolMessage` 包含 `toolCallId` 与 `content`。

这意味着**不能要求每一条 UserMessage 后面都必须有一条 AssistantMessage**。

例如：

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">两段可以恢复的历史</text>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <badge>场景 A</badge>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">user_input</text>
        </box>
        <row justify="center">
          <icon name="arrow-down" color="secondary"/>
        </row>
        <box border radius="md" padding={2}>
          <text size="xs" weight="medium">Provider throw</text>
        </box>
        <text color="success" size="xs">可以保留 User Input</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <badge>场景 B</badge>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">user_input</text>
        </box>
        <row justify="center">
          <icon name="arrow-down" color="secondary"/>
        </row>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">model_output</text>
        </box>
        <text color="success" size="xs">正常对话已完成</text>
      </box>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  <text weight="medium">不可直接恢复的历史</text>
  <box background="surface-secondary" radius="lg" padding={3} gap={2}>
    <row align="center" gap={2}>
      <box background="surface" radius="md" padding={2} flex="1">
        <text size="xs" textAlign="center">model_output</text>
        <text color="secondary" size="2xs" textAlign="center">ToolCall A, B</text>
      </box>
      <icon name="arrow-right" color="secondary"/>
      <box background="surface" radius="md" padding={2} flex="1">
        <text size="xs" textAlign="center">tool_result A</text>
      </box>
      <icon name="arrow-right" color="secondary"/>
      <box border={{size:1,color:"danger"}} radius="md" padding={2} flex="1">
        <text color="danger" size="xs" textAlign="center">缺少 B</text>
      </box>
    </row>
    <text color="secondary" size="xs">不能因为 A 已执行成功，就把缺少 B 的历史直接送给 ModelProvider。</text>
  </box>
</box>

建议把验证规则精确定义为：

- 允许空历史。
- 允许合法的连续用户消息，包括 Provider 失败后只留下 user_input。
- 每个 ToolCall 必须有且仅有一个对应的 ToolResult。
- ToolResult 必须引用已存在的 ToolCall，且配对顺序必须合法。
- 同一批 ToolCall 的结果全部配对后，才能开始新的非 ToolResult 消息。
- 允许 VII-C 的 skipped 和 VII-F 的 cancelled ToolResult；它们是合法的协议终止记录。
- 不要求历史 Tool 仍然注册在当前 ToolRegistry 中。
- 不自动执行、补齐或删除历史 ToolCall。

**推荐：用现有 `RuntimeMessage` 结构实现最小状态机校验，而非新增通用消息协议框架。**

这还需要确定一个细节：恢复验证是否只保证 Model Context 的协议有效，还是要完整校验历史 ToolResult 内容的业务 JSON？

我建议只校验结构和协议，不要求解析每个 ToolResult 的业务内容，因为历史结果本来就可能是 Tool 返回的任意字符串。

---

## 三、Must Decide 2：Run 失败后，Application 是否必须终止当前 Session Workflow？

<text color="secondary" weight="medium" size="xs">影响：G-AD10 · G-AD15 · G-AD16</text>

这里要区分两个情况。

### 情况 A：Provider 抛错，但快照合法

```text
Session revision 3
       ↓
Runtime.run("分析优惠券")
       ↓
append user_input
       ↓
Provider throws
       ↓
Run rejected
       ↓
Snapshot validation passes
       ↓
Save revision 4
```

这符合我们已确认的设计。

尽管 Run 失败，合法的 User Input 仍然可以保存。

但 Application 对用户的反馈必须保留 Run Error，不能把保存成功误当成 Agent 执行成功。

### 情况 B：Runtime 抛错，快照协议不完整

```text
Session revision 3
       ↓
Runtime commit ToolCalls
       ↓
Unexpected error
       ↓
Snapshot validation fails
       ↓
No save
       ↓
Session stays at revision 3
```

这时我建议：

**当前 Runtime 不再参与该 Session 的后续运行。**

Application 可以保留这个对象用于调试，但不能继续调用它执行 Agent Loop。

下一次要继续对话，必须从最后一次成功持久化的快照创建新的 Runtime。

然而，需要认识到：

- 最后一次保存的快照可能没有记录本次失败 Run 的消息。
- 某些 Tool 可能已经产生了真实副作用。
- 从旧快照恢复不代表外部世界也回滚到了旧状态。
- Application 不得自动重新执行失败前的 Tool。

这与我们已经确认的“不实现 Durable Execution”完全一致。

**推荐补充一条：非法历史会让当前会话工作流停止继续运行，但不修改 RuntimeState，也不自动修复。**

---

## 四、Must Decide 3：Session 首次创建时，是否立即持久化？

<text color="secondary" weight="medium" size="xs">影响：G-AD08 · Revision Lifecycle</text>

目前 revision 0 的语义已经确定，但首次创建到底什么时候保存还没有完全定义。

两种流程都合理。

### A. 先创建空 Session，再运行

```text
Generate sessionId
       ↓
save(empty messages, revision 0)
       ↓
Stored revision 1
       ↓
Create Runtime
       ↓
run()
       ↓
save(messages, expected revision 1)
       ↓
Stored revision 2
```

优势是 Session 在调用模型之前就有一份可查询的记录。

代价是多一次存储写入。

### B. 第一轮 Run 结束后创建 Session

```text
Generate sessionId
       ↓
Create Runtime(empty history)
       ↓
run()
       ↓
save(messages, expected revision 0)
       ↓
Stored revision 1
```

优势是更少的写入，和 Run Boundary Persistence 最直接一致。

代价是第一轮 Run 执行期间，Session 还没有真正保存。如果第一轮崩溃，Session ID 可能存在于 Application 中，但 Store 中没有对应记录。

**我的推荐是 B。**

原因：VII-G 主要目标是恢复成功保存的 Conversation，而不是构建完整的 Session Lifecycle Management（会话生命周期管理）。

但如果选择 B，必须明确 `load(sessionId) === null` 不能被当作“安全地恢复一份空历史”。

Application 只有在明确执行新建会话流程时，才允许使用空历史和 revision 0。

否则，历史 Session 丢失可能被误判为新会话，导致上下文错误。


### ChatGPT

> Message ID: `349bfe04-41db-413d-b104-1b81a5c86990`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G · Architecture Closure Review（第 7 轮）

<badge color="success">G-AD12～G-AD16 已确认</badge>

这轮我们不再增加新功能，而是对 VII-G 进行一次正式的 **Architecture Closure Review（架构闭合审查）**。

我重新核对了上传的 `source-review(10).zip`，重点检查 `agent-runtime.ts`、`runtime-message.ts`、`context-builder.ts`，并对照 VII-F 的 F-AD01～F-AD16。

先说结论：

**VII-G 的核心设计已经基本收敛，但目前还不建议直接生成 Codex Implementation Task。**

我识别出 **4 项 Must Decide（实现前必须明确）**，以及若干可以直接交给 Codex 的工程实现细节。

其中最重要的不是 SQLite，也不是 revision，而是：

> 我们目前已经定义了如何保存合法历史，却还没有完全定义“合法历史如何跨 Run 连续演进”，以及“失败之后如何避免错误地使用旧版本历史”。

---

## 一、已经闭合的架构决策

先冻结已确认的部分，后续不反复设计。

| 范围 | 最终决定 | 状态 |
|---|---|---|
| 持久化粒度 | Run Boundary Persistence | 已确认 |
| Persistence Owner | Application / Caller | 已确认 |
| State Mutation Owner | AgentRuntime | 保留 VII-B 决策 |
| 恢复入口 | `initialMessages`，构造时恢复 | 已确认 |
| SessionStore | `load()` / `save()` | 已形成共识 |
| 存储实现 | Memory + SQLite | 已确认 |
| Revision | CAS 原子条件写入 | 已确认 |
| 创建版本 | revision 0 表示预期不存在，首次保存成为 1 | 已确认 |
| 错误传播 | Run 与 Persistence 双 Settlement | 已确认 |
| 保存时机 | Run settle 后验证并保存 | 已确认 |
| 历史损坏 | 严格拒绝，不自动修复 | 已确认 |
| 并发冲突 | 不自动重试、合并或覆盖 | 已确认 |
| 同 Session 顺序操作 | Application 负责 Run → Save | 已确认 |
| Durable Execution | 不实现 | 已排除 |

这些决策可以继续沿用。

---

## 二、Must Decide 1：什么叫合法的 Conversation History？

<text color="secondary" weight="medium" size="xs">影响：G-AD11 · Snapshot Validation</text>

这是源码复核后发现需要特别强调的问题。

当前消息模型只有三类：

```ts
type RuntimeMessage =
  | RuntimeUserMessage
  | RuntimeAssistantMessage
  | RuntimeToolMessage;
```

其中 `RuntimeAssistantMessage` 支持可选的 `content` 和 `toolCalls`，而 `RuntimeToolMessage` 包含 `toolCallId` 与 `content`。

这意味着**不能要求每一条 UserMessage 后面都必须有一条 AssistantMessage**。

例如：

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">两段可以恢复的历史</text>
  <grid columns={2} gap={2}>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <badge>场景 A</badge>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">user_input</text>
        </box>
        <row justify="center">
          <icon name="arrow-down" color="secondary"/>
        </row>
        <box border radius="md" padding={2}>
          <text size="xs" weight="medium">Provider throw</text>
        </box>
        <text color="success" size="xs">可以保留 User Input</text>
      </box>
    </grid-item>
    <grid-item>
      <box background="surface-secondary" radius="lg" padding={3} gap={2}>
        <badge>场景 B</badge>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">user_input</text>
        </box>
        <row justify="center">
          <icon name="arrow-down" color="secondary"/>
        </row>
        <box background="surface" radius="md" padding={2}>
          <text size="xs">model_output</text>
        </box>
        <text color="success" size="xs">正常对话已完成</text>
      </box>
    </grid-item>
  </grid>
  <divider color="subtle"/>
  <text weight="medium">不可直接恢复的历史</text>
  <box background="surface-secondary" radius="lg" padding={3} gap={2}>
    <row align="center" gap={2}>
      <box background="surface" radius="md" padding={2} flex="1">
        <text size="xs" textAlign="center">model_output</text>
        <text color="secondary" size="2xs" textAlign="center">ToolCall A, B</text>
      </box>
      <icon name="arrow-right" color="secondary"/>
      <box background="surface" radius="md" padding={2} flex="1">
        <text size="xs" textAlign="center">tool_result A</text>
      </box>
      <icon name="arrow-right" color="secondary"/>
      <box border={{size:1,color:"danger"}} radius="md" padding={2} flex="1">
        <text color="danger" size="xs" textAlign="center">缺少 B</text>
      </box>
    </row>
    <text color="secondary" size="xs">不能因为 A 已执行成功，就把缺少 B 的历史直接送给 ModelProvider。</text>
  </box>
</box>

建议把验证规则精确定义为：

- 允许空历史。
- 允许合法的连续用户消息，包括 Provider 失败后只留下 user_input。
- 每个 ToolCall 必须有且仅有一个对应的 ToolResult。
- ToolResult 必须引用已存在的 ToolCall，且配对顺序必须合法。
- 同一批 ToolCall 的结果全部配对后，才能开始新的非 ToolResult 消息。
- 允许 VII-C 的 skipped 和 VII-F 的 cancelled ToolResult；它们是合法的协议终止记录。
- 不要求历史 Tool 仍然注册在当前 ToolRegistry 中。
- 不自动执行、补齐或删除历史 ToolCall。

**推荐：用现有 `RuntimeMessage` 结构实现最小状态机校验，而非新增通用消息协议框架。**

这还需要确定一个细节：恢复验证是否只保证 Model Context 的协议有效，还是要完整校验历史 ToolResult 内容的业务 JSON？

我建议只校验结构和协议，不要求解析每个 ToolResult 的业务内容，因为历史结果本来就可能是 Tool 返回的任意字符串。

---

## 三、Must Decide 2：Run 失败后，Application 是否必须终止当前 Session Workflow？

<text color="secondary" weight="medium" size="xs">影响：G-AD10 · G-AD15 · G-AD16</text>

这里要区分两个情况。

### 情况 A：Provider 抛错，但快照合法

```text
Session revision 3
       ↓
Runtime.run("分析优惠券")
       ↓
append user_input
       ↓
Provider throws
       ↓
Run rejected
       ↓
Snapshot validation passes
       ↓
Save revision 4
```

这符合我们已确认的设计。

尽管 Run 失败，合法的 User Input 仍然可以保存。

但 Application 对用户的反馈必须保留 Run Error，不能把保存成功误当成 Agent 执行成功。

### 情况 B：Runtime 抛错，快照协议不完整

```text
Session revision 3
       ↓
Runtime commit ToolCalls
       ↓
Unexpected error
       ↓
Snapshot validation fails
       ↓
No save
       ↓
Session stays at revision 3
```

这时我建议：

**当前 Runtime 不再参与该 Session 的后续运行。**

Application 可以保留这个对象用于调试，但不能继续调用它执行 Agent Loop。

下一次要继续对话，必须从最后一次成功持久化的快照创建新的 Runtime。

然而，需要认识到：

- 最后一次保存的快照可能没有记录本次失败 Run 的消息。
- 某些 Tool 可能已经产生了真实副作用。
- 从旧快照恢复不代表外部世界也回滚到了旧状态。
- Application 不得自动重新执行失败前的 Tool。

这与我们已经确认的“不实现 Durable Execution”完全一致。

**推荐补充一条：非法历史会让当前会话工作流停止继续运行，但不修改 RuntimeState，也不自动修复。**

---

## 四、Must Decide 3：Session 首次创建时，是否立即持久化？

<text color="secondary" weight="medium" size="xs">影响：G-AD08 · Revision Lifecycle</text>

目前 revision 0 的语义已经确定，但首次创建到底什么时候保存还没有完全定义。

两种流程都合理。

### A. 先创建空 Session，再运行

```text
Generate sessionId
       ↓
save(empty messages, revision 0)
       ↓
Stored revision 1
       ↓
Create Runtime
       ↓
run()
       ↓
save(messages, expected revision 1)
       ↓
Stored revision 2
```

优势是 Session 在调用模型之前就有一份可查询的记录。

代价是多一次存储写入。

### B. 第一轮 Run 结束后创建 Session

```text
Generate sessionId
       ↓
Create Runtime(empty history)
       ↓
run()
       ↓
save(messages, expected revision 0)
       ↓
Stored revision 1
```

优势是更少的写入，和 Run Boundary Persistence 最直接一致。

代价是第一轮 Run 执行期间，Session 还没有真正保存。如果第一轮崩溃，Session ID 可能存在于 Application 中，但 Store 中没有对应记录。

**我的推荐是 B。**

原因：VII-G 主要目标是恢复成功保存的 Conversation，而不是构建完整的 Session Lifecycle Management（会话生命周期管理）。

但如果选择 B，必须明确 `load(sessionId) === null` 不能被当作“安全地恢复一份空历史”。

Application 只有在明确执行新建会话流程时，才允许使用空历史和 revision 0。

否则，历史 Session 丢失可能被误判为新会话，导致上下文错误。

## 五、Must Decide 4：SQLite 与 Memory 的一致性保证到什么程度？

<text color="secondary" weight="medium" size="xs">影响：Store Contract · CAS · Persistence Errors</text>

我们已经选择两种 Store，但还需要确定**相同接口背后必须具有哪些共同语义**。

我建议至少保证：

| 契约 | Memory | SQLite |
|---|---|---|
| 不存在返回 `null` | 是 | 是 |
| 创建时使用 revision 0 | 是 | 是 |
| 更新时版本必须匹配 | 是 | 是 |
| 保存成功后版本递增 | 是 | 是 |
| 冲突不修改原快照 | 是 | 是 |
| `load()` 返回引用隔离的数据 | 是 | 是 |
| `save()` 不保留调用方的可变引用 | 是 | 是 |
| 非法数据显式失败 | 是 | 是 |
| 进程重启后恢复 | 不要求 | 必须 |
| 原子 CAS | 在单进程内保证 | 通过数据库事务或原子 SQL 保证 |

尤其需要注意两个问题。

**1. 不能用普通的读取后写入模拟 CAS。**

SQLite 可以通过带 revision 条件的 `UPDATE` 和受影响行数判断实现真正的版本检查。

Memory Store 虽然是内存实现，也应该把版本检查和修改放在不跨越异步等待的同一个临界操作中。

**2. Save Error 不代表一定没有写入成功。**

这与先前确认的 G-AD13 有关。

如果数据库已经完成提交，但调用方没有收到成功确认，可能出现未知提交结果。

当前 VII-G 不需要实现自动对账和重试，但必须保持错误诚实：不能向调用方承诺“保存失败，所以数据一定没有变化”。

### 还需要冻结的一个接口细节

建议最终采用：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

约定：

- `save()` 输入的 revision 是 expected revision。
- 返回值是成功写入后的最新快照。
- `SessionConflictError` 明确表示原子条件写入未通过。
- 普通 Persistence Error 表示保存未被确认成功，不承诺数据一定未写入。
- 内存与 SQLite 使用相同的验证与冲突语义。

不新增 `create()`、`update()`、`delete()`、`list()` 以及 SessionManager。

---

## 六、完整运行链路的闭合检查

<box border radius="xl" padding={3} gap={2}>
  <title size="md">VII-G 最小完整链路</title>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    A["Application 获取 sessionId"] --> B{"新建还是恢复？"}
    B -->|新建| C["空历史 + revision 0"]
    B -->|恢复| D["SessionStore.load()"]
    D --> E{"找到且有效？"}
    E -->|否| F["报告错误，不静默新建"]
    E -->|是| G["已保存 Snapshot"]
    C --> H["new AgentRuntime(initialMessages)"]
    G --> H
    H --> I["run()"]
    I --> J["Run settle: outcome / error"]
    J --> K["读取并验证历史"]
    K --> L{"可恢复？"}
    L -->|否| M["停止复用 Runtime，报告错误"]
    L -->|是| N["SessionStore.save(CAS)"]
    N --> O{"保存成功？"}
    O -->|是| P["取得新 revision，继续会话"]
    O -->|否| Q["报告存储错误或冲突，不自动重试"]
  </CodeBlock>
  <caption>这是 Application Workflow 的逻辑流程，不要求引入新的 SessionService 类。</caption>
</box>

由此我们可以检查三个维度：

**State：** 只有 AgentRuntime 修改当前消息历史。恢复初始化和 `getMessages()` 都应保持深拷贝隔离。

**Control：** VII-F 的 `#active` 保持原样。Application 对同一 Session 顺序执行 Run → Save，Store 使用 revision 检测竞争写入。

**Error：** Run Outcome、Run Error、Snapshot Validation Error、Persistence Error 各自保留语义，不互相伪装。

---

## 七、Implementation Scope：哪些文件需要变化？

根据上传源码的实际模块结构，我预计 VII-G 的最小改动集中在以下位置。

| 文件 / 模块 | 预计改动 |
|---|---|
| `runtime/agent-runtime.ts` | 增加 `initialMessages`，构造时验证和深拷贝 |
| `messages/` 或 `runtime/` | 增加最小 Conversation Validator |
| 新增 `session/session-store.ts` | `SessionSnapshot` 与 `SessionStore` Contract |
| 新增 `session/memory-session-store.ts` | Memory Store |
| 新增 `session/sqlite-session-store.ts` | SQLite Store |
| Demo | 展示保存、重建 Runtime、继续对话 |
| Test | Store contract、CAS、恢复、异常历史、错误隔离 |

不应改动 `ContextBuilder`、`ModelProvider`、ToolExecutor 的已有主要职责。

而且不应为了存储新增 runId、traceId、Session Tree、Event Sourcing（事件溯源）或者新的 Runtime 状态机。

SQLite 的具体依赖库属于实现选型。Codex 可以基于当前 Node.js 版本和项目配置选择适配方案，但必须在任务中要求它说明依赖与运行环境兼容性，不能擅自扩展其他基础设施。

---

## 八、最终 Closure Checklist

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">架构就绪状态</text>
  {@body const items=[["恢复入口及 State Ownership","done"],["Run Boundary Persistence","done"],["CAS revision 契约","done"],["Memory + SQLite 选型","done"],["双 Settlement / 错误传播","done"],["恢复历史协议规则","review"],["首次 Session 创建时机","review"],["非法历史后续处理","review"],["Store 的最小错误保证","review"]]}
  {#each items as item,i}
    <row key={i} align="center" gap={2}>
      <icon name={item[1]==="done"?"check-circle-2":"circle-dashed"} color={item[1]==="done"?"success":"secondary"}/>
      <box flex="1">
        <text size="sm">{item[0]}</text>
      </box>
      <text size="xs" color="secondary">{item[1]==="done"?"已确认":"待冻结"}</text>
    </row>
  {/each}
</box>

整体看，VII-G 目前没有需要推翻前几节架构的 Must Fix。剩余问题主要是将已达成的原则收敛为可测试、没有歧义的契约。

## 九、这轮需要你确认的最后一组决策

我的建议是把四项 Must Decide 一起冻结，避免进入 Implementation Task 后让 Codex 自行解释。

{@body const [finalChoice,setFinalChoice]=DIL.useState("accept")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD17～G-AD20：架构闭合方案</text>
  <radio-group direction="col" value={finalChoice} onChange={setFinalChoice}>
    <radio value="accept">
      **A. 接受最小闭合方案（推荐）**

      <text color="secondary" size="sm">严格验证历史协议但不解析 ToolResult 业务内容；非法历史停止复用；第一轮 Run settle 后才首次保存；Memory 与 SQLite 均遵守 CAS 和错误契约。</text>
    </radio>
    <radio value="createfirst">
      **B. 首次 Run 前先保存空 Session**

      <text color="secondary" size="sm">其余规则不变，但先保存 revision 1 的空 Session，再运行并更新到 revision 2。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(finalChoice==="accept"?"VII-G 确认 G-AD17～G-AD20，接受最小架构闭合方案。请进行最终 Architecture Decisions Review，整理已确认决策、实现范围、关键测试与理论回顾，随后生成可直接交给 Codex 的 Implementation Task。":"VII-G 确认 G-AD17～G-AD20，但首次 Run 前必须先保存空 Session。其余闭合规则确认。请进行最终 Architecture Decisions Review，并生成 Codex Implementation Task。")}>确认架构闭合方案 <icon name="arrow-right" inline/></button>
</box>

如果采用 A，我们就可以结束 Architecture Analysis / Design Decision 阶段。

进入实现后，重点不是“能不能把消息写进 SQLite”，而是验证三个工程不变量：

**恢复不篡改事实、并发写入不静默覆盖、失败不伪装成成功。**

这也是 VII-G 相比普通聊天记录存储，更值得学习的 Agent Runtime 架构知识。


### ChatGPT

> Message ID: `4ba03b9d-f3ee-4e2e-a080-72d227f9712d`; content: `text`; channel: `final`; recipient: `all`

## 五、Must Decide 4：SQLite 与 Memory 的一致性保证到什么程度？

<text color="secondary" weight="medium" size="xs">影响：Store Contract · CAS · Persistence Errors</text>

我们已经选择两种 Store，但还需要确定**相同接口背后必须具有哪些共同语义**。

我建议至少保证：

| 契约 | Memory | SQLite |
|---|---|---|
| 不存在返回 `null` | 是 | 是 |
| 创建时使用 revision 0 | 是 | 是 |
| 更新时版本必须匹配 | 是 | 是 |
| 保存成功后版本递增 | 是 | 是 |
| 冲突不修改原快照 | 是 | 是 |
| `load()` 返回引用隔离的数据 | 是 | 是 |
| `save()` 不保留调用方的可变引用 | 是 | 是 |
| 非法数据显式失败 | 是 | 是 |
| 进程重启后恢复 | 不要求 | 必须 |
| 原子 CAS | 在单进程内保证 | 通过数据库事务或原子 SQL 保证 |

尤其需要注意两个问题。

**1. 不能用普通的读取后写入模拟 CAS。**

SQLite 可以通过带 revision 条件的 `UPDATE` 和受影响行数判断实现真正的版本检查。

Memory Store 虽然是内存实现，也应该把版本检查和修改放在不跨越异步等待的同一个临界操作中。

**2. Save Error 不代表一定没有写入成功。**

这与先前确认的 G-AD13 有关。

如果数据库已经完成提交，但调用方没有收到成功确认，可能出现未知提交结果。

当前 VII-G 不需要实现自动对账和重试，但必须保持错误诚实：不能向调用方承诺“保存失败，所以数据一定没有变化”。

### 还需要冻结的一个接口细节

建议最终采用：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

约定：

- `save()` 输入的 revision 是 expected revision。
- 返回值是成功写入后的最新快照。
- `SessionConflictError` 明确表示原子条件写入未通过。
- 普通 Persistence Error 表示保存未被确认成功，不承诺数据一定未写入。
- 内存与 SQLite 使用相同的验证与冲突语义。

不新增 `create()`、`update()`、`delete()`、`list()` 以及 SessionManager。

---

## 六、完整运行链路的闭合检查

<box border radius="xl" padding={3} gap={2}>
  <title size="md">VII-G 最小完整链路</title>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    A["Application 获取 sessionId"] --> B{"新建还是恢复？"}
    B -->|新建| C["空历史 + revision 0"]
    B -->|恢复| D["SessionStore.load()"]
    D --> E{"找到且有效？"}
    E -->|否| F["报告错误，不静默新建"]
    E -->|是| G["已保存 Snapshot"]
    C --> H["new AgentRuntime(initialMessages)"]
    G --> H
    H --> I["run()"]
    I --> J["Run settle: outcome / error"]
    J --> K["读取并验证历史"]
    K --> L{"可恢复？"}
    L -->|否| M["停止复用 Runtime，报告错误"]
    L -->|是| N["SessionStore.save(CAS)"]
    N --> O{"保存成功？"}
    O -->|是| P["取得新 revision，继续会话"]
    O -->|否| Q["报告存储错误或冲突，不自动重试"]
  </CodeBlock>
  <caption>这是 Application Workflow 的逻辑流程，不要求引入新的 SessionService 类。</caption>
</box>

由此我们可以检查三个维度：

**State：** 只有 AgentRuntime 修改当前消息历史。恢复初始化和 `getMessages()` 都应保持深拷贝隔离。

**Control：** VII-F 的 `#active` 保持原样。Application 对同一 Session 顺序执行 Run → Save，Store 使用 revision 检测竞争写入。

**Error：** Run Outcome、Run Error、Snapshot Validation Error、Persistence Error 各自保留语义，不互相伪装。

---

## 七、Implementation Scope：哪些文件需要变化？

根据上传源码的实际模块结构，我预计 VII-G 的最小改动集中在以下位置。

| 文件 / 模块 | 预计改动 |
|---|---|
| `runtime/agent-runtime.ts` | 增加 `initialMessages`，构造时验证和深拷贝 |
| `messages/` 或 `runtime/` | 增加最小 Conversation Validator |
| 新增 `session/session-store.ts` | `SessionSnapshot` 与 `SessionStore` Contract |
| 新增 `session/memory-session-store.ts` | Memory Store |
| 新增 `session/sqlite-session-store.ts` | SQLite Store |
| Demo | 展示保存、重建 Runtime、继续对话 |
| Test | Store contract、CAS、恢复、异常历史、错误隔离 |

不应改动 `ContextBuilder`、`ModelProvider`、ToolExecutor 的已有主要职责。

而且不应为了存储新增 runId、traceId、Session Tree、Event Sourcing（事件溯源）或者新的 Runtime 状态机。

SQLite 的具体依赖库属于实现选型。Codex 可以基于当前 Node.js 版本和项目配置选择适配方案，但必须在任务中要求它说明依赖与运行环境兼容性，不能擅自扩展其他基础设施。

---

## 八、最终 Closure Checklist

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">架构就绪状态</text>
  {@body const items=[["恢复入口及 State Ownership","done"],["Run Boundary Persistence","done"],["CAS revision 契约","done"],["Memory + SQLite 选型","done"],["双 Settlement / 错误传播","done"],["恢复历史协议规则","review"],["首次 Session 创建时机","review"],["非法历史后续处理","review"],["Store 的最小错误保证","review"]]}
  {#each items as item,i}
    <row key={i} align="center" gap={2}>
      <icon name={item[1]==="done"?"check-circle-2":"circle-dashed"} color={item[1]==="done"?"success":"secondary"}/>
      <box flex="1">
        <text size="sm">{item[0]}</text>
      </box>
      <text size="xs" color="secondary">{item[1]==="done"?"已确认":"待冻结"}</text>
    </row>
  {/each}
</box>

整体看，VII-G 目前没有需要推翻前几节架构的 Must Fix。剩余问题主要是将已达成的原则收敛为可测试、没有歧义的契约。

## 九、这轮需要你确认的最后一组决策

我的建议是把四项 Must Decide 一起冻结，避免进入 Implementation Task 后让 Codex 自行解释。

{@body const [finalChoice,setFinalChoice]=DIL.useState("accept")}
<box border radius="xl" padding={3} gap={3}>
  <text weight="medium">G-AD17～G-AD20：架构闭合方案</text>
  <radio-group direction="col" value={finalChoice} onChange={setFinalChoice}>
    <radio value="accept">
      **A. 接受最小闭合方案（推荐）**

      <text color="secondary" size="sm">严格验证历史协议但不解析 ToolResult 业务内容；非法历史停止复用；第一轮 Run settle 后才首次保存；Memory 与 SQLite 均遵守 CAS 和错误契约。</text>
    </radio>
    <radio value="createfirst">
      **B. 首次 Run 前先保存空 Session**

      <text color="secondary" size="sm">其余规则不变，但先保存 revision 1 的空 Session，再运行并更新到 revision 2。</text>
    </radio>
  </radio-group>
  <button block onClick={()=>GenUI.issueNewTurn(finalChoice==="accept"?"VII-G 确认 G-AD17～G-AD20，接受最小架构闭合方案。请进行最终 Architecture Decisions Review，整理已确认决策、实现范围、关键测试与理论回顾，随后生成可直接交给 Codex 的 Implementation Task。":"VII-G 确认 G-AD17～G-AD20，但首次 Run 前必须先保存空 Session。其余闭合规则确认。请进行最终 Architecture Decisions Review，并生成 Codex Implementation Task。")}>确认架构闭合方案 <icon name="arrow-right" inline/></button>
</box>

如果采用 A，我们就可以结束 Architecture Analysis / Design Decision 阶段。

进入实现后，重点不是“能不能把消息写进 SQLite”，而是验证三个工程不变量：

**恢复不篡改事实、并发写入不静默覆盖、失败不伪装成成功。**

这也是 VII-G 相比普通聊天记录存储，更值得学习的 Agent Runtime 架构知识。


## Turn 8


### User

> Message ID: `7530f6cd-e298-46a7-81a8-ec59f72b7d05`; content: `text`; channel: `None`; recipient: `all`

VII-G 确认 G-AD17～G-AD20，接受最小架构闭合方案。请进行最终 Architecture Decisions Review，整理已确认决策、实现范围、关键测试与理论回顾，随后生成可直接交给 Codex 的 Implementation Task。


### ChatGPT — commentary / rendered fragment

> Message ID: `4be922da-9015-4686-88f3-94834855b999`; content: `text`; channel: `commentary`; recipient: `all`

我会把这轮已确认的设计冻结成一份架构审查结论，再对照源码检查现有 API、消息结构和测试入口，最后输出可直接复制给 Codex 的实现任务。尤其会把“已确认的设计”和“Codex 不得擅自决定的边界”分开写清楚。


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `452aff2a-86e4-450a-b4fb-f6f4db11442b`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc ls -lh /mnt/data/* | head; unzip -l '/mnt/data/source-review(10).zip' | head -45; cat '/mnt/data/README(7).md' | tail -85


### Public tool output

> Message ID: `6d92f0e8-8710-4634-9971-ae519d3627eb`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT — tool request (historical, not executed during documentation)

> Message ID: `97c2cb01-0d3c-478f-9972-354759137479`; content: `code`; channel: `None`; recipient: `container.exec`

bash -lc unzip -p '/mnt/data/source-review(10).zip' src/runtime/agent-runtime.ts | sed -n '1,245p'; for f in src/messages/runtime-message.ts src/model/model.ts src/model/tool.ts src/runtime/context-builder.ts src/runtime/runtime-state.ts package.json tsconfig.json; do echo ==== $f; unzip -p '/mnt/data/source-review(10).zip' "$f"; done


### Public tool output

> Message ID: `cf0e69d1-c41a-431f-ba63-acad26fa9748`; content: `text`; channel: `None`; recipient: `all`

The output of this plugin was redacted.


### ChatGPT

> Message ID: `32288d97-be51-4a71-9635-3d671e81ccce`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：Architecture Decisions Review + Codex Implementation Task

<badge color="success">架构设计闭合 · Ready for Implementation</badge>

**最终审查结论：PASS，可以进入 Codex Implementation 阶段。**

本轮基于以下材料完成复核：

- `source-review(10).zip`：实际源码、测试及工程配置。
- `README(7).md`：Part VII-A～VII-I 的范围与工程原则。
- VII-F 最终笔记：F-AD01～F-AD16 的控制、取消和消息提交契约。
- 本次 VII-G 架构讨论已经确认的 G-AD01～G-AD20。

我没有发现需要推翻 VII-A～VII-F 的架构问题。不过有几处实现细节必须写进 Codex Task，避免 Codex 自行做出超出范围的设计。

## 一、最终架构评审

### 1. 从源码确认的真实工程基线

| 模块 | 当前真实实现 | VII-G 处理方式 |
|---|---|---|
| `AgentRuntime` | 实例内保存 `RuntimeState.messages` | 增加构造时恢复入口 |
| `RuntimeState` | 只有 messages | 不增加 sessionId / revision |
| `getMessages()` | 使用 `structuredClone()` | 复用为快照读取 |
| `ContextBuilder` | 无状态，每轮重新投影上下文 | 不修改 |
| `ToolExecutor` | 校验、执行、ToolError 归一化 | 不修改 |
| `AgentEvent` | 同步 Subscriber，事件隔离 | 不修改 |
| `#active` | 每实例 Single Active Run | 保留 |
| Abort | 通过 RunOutcome 和 Tool pairing 结算 | 保留 |
| SessionStore | 尚不存在 | 新增 |
| Conversation Recovery | 尚不存在 | 本节实现 |

当前工程采用 Node.js `>=20`、TypeScript NodeNext、ES2022，现有依赖没有 SQLite 驱动。

因此 SQLite 库的选型必须兼容当前项目配置，不能未经确认就要求升级 Node.js 主版本或修改既有模块系统。

### 2. VII-G 最终职责划分

<box border radius="xl" padding={3} gap={2}>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    A["Application / Caller"] -->|"load / save"| B["SessionStore"]
    B --> C["MemorySessionStore"]
    B --> D["SQLiteSessionStore"]
    A -->|"initialMessages"| E["AgentRuntime"]
    E --> F["RuntimeState: messages"]
    E --> G["ContextBuilder"]
    G --> H["ModelProvider"]
    E --> I["ToolExecutor"]
    A -->|"读取已结算消息"| E
  </CodeBlock>
  <caption>SessionStore 不反向依赖 AgentRuntime；Runtime Core 不认识 SQLite、revision 和 sessionId。</caption>
</box>

这个依赖方向是本节最重要的架构成果。

---

## 二、G-AD01～G-AD20 最终冻结

为避免沿用前几轮讨论中出现的候选编号歧义，Implementation Task 将以**决策内容**为权威，编号作为追踪标识。

| ID | 最终确认的设计 |
|---|---|
| G-AD01 | Run Boundary Persistence，暂不支持进程崩溃后的执行恢复 |
| G-AD02 | Application 负责持久化编排，Runtime 不直接依赖 Store |
| G-AD03 | SessionStore 最小 `load()` / `save()` Contract |
| G-AD04 | SessionSnapshot 保存 Session ID、revision、RuntimeMessage 历史 |
| G-AD05 | 存储不存在与存储失败必须区分 |
| G-AD06 | revision CAS 防止静默覆盖，不提供执行锁 |
| G-AD07 | `AgentRuntimeOptions.initialMessages` 构造时恢复 |
| G-AD08 | revision 0 表示预期不存在，成功创建得到 1，之后逐次递增 |
| G-AD09 | SQLiteSessionStore + MemorySessionStore |
| G-AD10 | Run settle 后由 Application 验证并保存合法历史 |
| G-AD11 | 严格验证恢复协议，不自动修复非法历史 |
| G-AD12 | Application 保留 Run 和 Persistence 的独立 Settlement |
| G-AD13 | 双重失败不覆盖原始 Run Error |
| G-AD14 | CAS 冲突显式失败，不重试、不合并、不覆盖 |
| G-AD15 | 同一 Session 的 Run → Save 在 Application 层顺序完成 |
| G-AD16 | 不合法的当前 Runtime 历史不得继续用于下一次 Run |
| G-AD17 | 验证消息结构与 ToolCall 配对，不解析历史 ToolResult 的业务内容 |
| G-AD18 | 首轮 Run settle 后首次保存；不预先保存空 Session |
| G-AD19 | Memory 和 SQLite 遵守相同接口、引用隔离与 CAS 语义 |
| G-AD20 | 不可恢复快照拒绝保存，既有持久化版本保持不变 |

**以上均属于已确认决策，不允许 Codex 重新选型。**

---

## 三、最终评审发现的 4 个实现风险

这些是 Architecture Review 对 Implementation Task 的补充约束，并不改变之前的设计。

### 风险 1：恢复后的数据不能只做 TypeScript 断言

源码中的 `RuntimeMessage` 是 TypeScript union，但 SQLite 中存储的 JSON 是运行时数据。

必须同时校验结构与配对关系。

尤其要验证每一批 ToolCall 的 `id` 唯一、ToolResult 一一对应，并拒绝跨批次引用。`TOOL_CALL_CANCELLED` 和 `TOOL_EXECUTION_SKIPPED` 仍然是合法 ToolResult，不需要解析其 JSON 业务内容。

### 风险 2：revision 必须由 Store 原子递增

不能由调用方简单执行：

```ts
snapshot.revision += 1;
```

然后直接覆盖保存。

应用层传入的是 expected revision。Store 比较版本、原子提交，再返回实际保存的 revision。

Memory 实现也应遵守相同规则。

### 风险 3：Store 的成功不等于 Run 的成功

`RunOutcome` 不增加 `persistence_failed`。

正常 Run 完成而 Store 保存失败，应分别报告执行结果和保存失败。

反过来，Provider 抛错但合法消息保存成功，也不能报告 `completed`。

### 风险 4：不能为“修复异常历史”修改已经完成的 Runtime

当前 `AgentRuntime` 在模型返回 ToolCalls 后，存在先提交 ModelOutput、随后才检查异常条件的路径。

因此某些异常确实可能留下未配对的 ToolCall。

VII-G 应在保存和恢复边界发现这种情况，但**不能为了通过持久化验证而删消息、补造 ToolResult 或重写 VII-F 的 Agent Loop**。

---

## 四、Milestone 完成标准

VII-G 需要交付的不仅是两个 Store，还必须证明实际恢复链路成立。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">实施验收分组</text>
  <list marker="number" gap={2}>
    <list-item>
      **Session Contract**

      `load()` / `save()`、revision CAS、错误区分、快照隔离。
    </list-item>
    <list-item>
      **Conversation Validation**

      运行时结构验证、ToolCall 配对验证、非法历史拒绝。
    </list-item>
    <list-item>
      **Runtime Recovery**

      新 Runtime 从历史初始化，并继续正常 Model → Tool → Model。
    </list-item>
    <list-item>
      **Application Orchestration**

      Run / Persistence 双 Settlement，不丢失错误，顺序保存。
    </list-item>
    <list-item>
      **Regression**

      VII-A～VII-F 既有测试无回归，新增 SQLite 重开恢复及并发 CAS 测试。
    </list-item>
  </list>
</box>

实现结束后，Codex 应报告新增测试数、总测试数、build 结果和所有修改文件，不得仅使用“全部通过”代替验证证据。

---


### ChatGPT — commentary / rendered fragment

> Message ID: `59ed20a7-4f18-456b-a1dd-be8222a3848a`; content: `text`; channel: `commentary`; recipient: `all`

源码核对后，实施范围可以保持很小：主要新增 SessionStore、两种实现和验证逻辑；`AgentRuntime` 只扩展构造选项。下面我把这些约束整理成 Codex 可执行任务，并明确哪些测试必须覆盖异常与并发，而不只是正常恢复。


### ChatGPT

> Message ID: `da6e598f-60e2-4e25-9548-359f74c5c922`; content: `text`; channel: `final`; recipient: `all`

## 五、📋 Codex Implementation Task — Part VII-G

下面这份任务可以直接交给 Codex 执行。

它沿用我们之前确定的 Milestone Goal、Current Repository State、Confirmed Design Decisions、Implementation Scope、Tests、Constraints 与交付报告结构。

<WritingBlock id="73842" variant="document"># 📋 Codex Implementation Task — Part VII-G

## 0. Execution Context

我们正在持续实现 `mini-agent-runtime`，这是一个使用 Node.js + TypeScript 编写的 Mini Agent Runtime v1。

项目采用 Milestone-by-Milestone 的增量演进方式，目标是理解并实践 Agent Runtime 的状态、执行、上下文、控制与持久化边界，而不是复刻 Pi Agent 或一次实现完整工业级平台。

已完成：

- VII-A：Foundation + ModelProvider
- VII-B：RuntimeState + Agent Loop
- VII-C：Tool Registry + Tool Executor + Error Contract
- VII-D：ContextBuilder + TurnSnapshot
- VII-E：AgentEvent + Subscriber
- VII-F：Abort + Single Active Run

现在实现：

**Part VII-G：SessionStore + Conversation Recovery**

请首先完整阅读当前仓库中的相关源码、现有测试、README 和工程配置。

以仓库真实代码为准，不要根据本任务中的示意接口覆盖现有接口。

本 Milestone 的架构讨论已经全部完成。你的角色是按照已确认的设计实现代码、编写测试、运行验证，而不是重新设计架构。

如果发现已确认设计存在确实无法实现或明显破坏既有契约的地方，请明确报告问题和最小调整建议，不要擅自扩展 Scope。

---

## 1. Milestone Goal

在 VII-F 的现有 Runtime 基础上，增量实现最小 Conversation Persistence & Recovery。

实现完成后必须满足：

1. Application 可以保存一个 Runtime 已提交的对话消息。
2. 使用 `sessionId` 可以重新加载持久化历史。
3. 可以通过 `initialMessages` 创建新的 `AgentRuntime`。
4. 新 Runtime 可以基于恢复后的历史继续运行正常 Agent Loop。
5. SQLite Store 支持关闭并重新打开数据库后的对话恢复。
6. Memory / SQLite 均提供 revision CAS（Compare-and-Swap，比较并交换）。
7. Session 并发写入不能静默覆盖。
8. 损坏或协议不完整的历史不能被恢复为可执行 Runtime。
9. Run Error 和 Persistence Error 不得互相覆盖。
10. VII-A～VII-F 所有既有契约和测试继续成立。

不需要恢复正在执行的 Promise、Tool、HTTP 请求或 Agent Loop。

这是 Conversation Recovery，不是 Durable Execution。

## 2. Current Repository State

当前真实源码包含：

- `src/runtime/agent-runtime.ts`
- `src/runtime/runtime-state.ts`
- `src/runtime/context-builder.ts`
- `src/runtime/agent-event.ts`
- `src/messages/runtime-message.ts`
- `src/messages/to-model-message.ts`
- `src/model/model-provider.ts`
- `src/tools/tool-registry.ts`
- `src/tools/tool-executor.ts`

当前关键事实：

### 2.1 RuntimeState

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

保持 messages-only 设计。

### 2.2 AgentRuntime

当前构造函数：

```ts
constructor(
  provider: ModelProvider,
  options: AgentRuntimeOptions = {}
)
```

当前 Options：

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
}
```

当前提供：

```ts
getMessages(): RuntimeMessage[]
```

方法返回深拷贝。

当前 Runtime 拥有自己的 `#active`，并使用外层 `try/finally` 释放 Active Run ownership。

### 2.3 ContextBuilder

现有 ContextBuilder 无状态。

每个 Model Turn 根据最新 RuntimeMessage 历史构建独立的 TurnSnapshot。

VII-G 不应修改其职责。

### 2.4 Abort and Tool Pairing

VII-F 已实现：

- Caller-owned AbortSignal
- Provider / Tool cooperative cancellation
- Cancellation provenance
- `RunOutcome.aborted`
- committed facts 不回滚
- `TOOL_CALL_CANCELLED` pairing
- `TOOL_EXECUTION_SKIPPED` pairing
- Single Active Run
- subscriber 异常隔离

这些行为必须保留。

### 2.5 Engineering Configuration

项目采用：

- Node.js >=20
- TypeScript
- NodeNext module resolution
- ESM
- `tsx --test`
- `tsc`
- 严格 TypeScript 类型检查

原有 `npm test` 共有 75 个通过的测试。

新增依赖必须与当前 Node.js 支持范围、ESM 及工程配置兼容。

---

## 3. Confirmed Design Decisions

以下设计已经由用户确认，禁止重新设计。

### G-AD01：Run Boundary Persistence

本阶段在 Run settle 后保存已提交的消息历史。

不实现逐消息 checkpoint、崩溃期间的执行恢复、Durable Tool 或 Event Sourcing。

### G-AD02：Application owns persistence orchestration

- `AgentRuntime` 负责 Agent Loop 和 RuntimeState。
- Application / Caller 负责 load、run、validation、save 的编排。
- SessionStore 负责数据读写。
- `AgentRuntime` 不直接依赖 SessionStore。
- SessionStore 不调用 AgentRuntime，也不执行模型或 Tool。

### G-AD03～G-AD06：Minimal SessionStore Contract

建议最终接口：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

约束：

- `load()` 找不到 Session 返回 null。
- 读取或反序列化失败必须抛错，不得伪装为 null。
- `save()` 输入的 revision 是 expected revision。
- 保存成功返回包含新 revision 的快照。
- 冲突必须显式抛出 `SessionConflictError`。
- 不允许静默覆盖。
- 不做自动合并或自动重试。
- 不增加 delete/list/session tree 等接口。

### G-AD07：Constructor-only Recovery

扩展现有 `AgentRuntimeOptions`：

```ts
initialMessages?: RuntimeMessage[];
```

要求：

- 只在构造时注入历史。
- 运行时严格验证历史。
- 使用深拷贝隔离传入对象和内部 State。
- 空历史合法。
- 恢复本身不发 AgentEvent。
- 恢复本身不调用 ModelProvider 或 Tool。
- 不增加公共 `setMessages()` 或 `restore()`。
- 不改变当前 `run()` 的接口语义。

### G-AD08：Revision Lifecycle

- revision 0 表示调用方期望 Session 尚不存在。
- 首次成功保存返回 revision 1。
- 正常更新要求输入 revision 与当前持久化版本一致。
- 更新成功 revision +1。
- 版本不匹配时抛 `SessionConflictError`。
- revision 必须是安全、有效的非负整数。
- 超出安全整数范围不得溢出或绕过版本检查。
- Store 负责生成新 revision，调用方不能直接指定新的已提交版本。

### G-AD09：Two Store Implementations

实现：

- `MemorySessionStore`
- `SQLiteSessionStore`

两者必须遵守相同接口与基本错误契约。

Memory 主要用于确定性测试。

SQLite 用于真实跨进程持久化与原子 CAS。

SQLite 的版本检查与写入必须使用数据库提供的原子机制。

不得先独立 SELECT 版本，再无条件 UPDATE 作为 CAS 实现。

不要引入 Redis、PostgreSQL 或分布式锁。

### G-AD10：Run Settlement Persistence

Application 在一次 Run settle 后：

1. 获得 Run Outcome 或原始异常。
2. 读取 Runtime 已提交的 messages。
3. 验证快照是否可以安全恢复。
4. 对合法且需要保存的历史调用 SessionStore.save()。
5. 分别保留 Run 与 Persistence 的结算结果。

正常返回的 completed、unsupported、limit_reached、aborted 均可保存合法消息。

普通 Provider Error 后，如果留下合法历史，例如单独的 user_input，同样应支持保存。

Pre-aborted 且没有新增消息的 Run 不应无意义地创建 Session 或递增 revision。

### G-AD11：Strict Conversation Validation

验证包括：

- RuntimeMessage 的真实结构。
- 各消息必要字段的类型。
- ToolCall 的基本结构及参数可序列化性。
- ToolCall ID 唯一性。
- ToolResult 对应关系。
- 不重复配对。
- 不缺失配对。
- 不出现孤立 ToolResult。
- 不跨 ToolCall batch 错误配对。
- 不允许带未完成 ToolCall 的历史直接恢复。

允许：

- 空历史。
- 正常连续的用户消息。
- Provider Error 后的单独 user_input。
- 已完整配对的 ToolCalls。
- skipped/cancelled/error ToolResult。

不要解析或重新解释历史 ToolResult 的业务内容，也不要因为 ToolResult.success 为 false 就拒绝整段 Conversation。

不要求历史 Tool 仍注册在当前 Registry。

不执行、重放或自动补齐 ToolCall。

如果已有真实 RuntimeMessage Contract 允许某些合法的历史形态，不要凭空限制为 user/assistant 严格交替。

验证应基于当前模型和 ContextBuilder 可以安全处理的消息协议。

### G-AD12～G-AD13：Dual Settlement

Run 与 Persistence 是独立结算边界。

Application 必须保留两者各自的结果或错误。

不得：

- 将保存错误映射成 `RunOutcome.aborted`。
- 将保存失败视为 Tool 执行失败。
- 因保存失败自动重新执行 Run。
- 用 Persistence Error 覆盖原始 Provider Error。
- 将保存成功误报为 Agent Run completed。

优先使用简洁的应用层显式编排代码。

不要为此创建大型 Result Framework。

如果展示代码或 Demo，应使双重失败时的原始 Run Error 和 Persistence Error 都可以被调用方观察到。

### G-AD14：Conflict Semantics

发生 CAS Conflict：

- 原持久化 Session 保持不变。
- 抛出明确 Conflict Error。
- 不覆盖、合并或自动 retry。
- 不自动重新执行 Provider 或 Tool。
- 不回滚 AgentRuntime 内存事实。

### G-AD15：Sequential Session Workflow

同一 Application Session Workflow：

```text
Run → Snapshot → Validate → Save → Next Run
```

保存 settle 前不得开始当前 Session 的下一次写入流程。

该约束由 Application 负责。

不增加全局 Session Lock、RunManager、Queue 或 Scheduler。

不同 Runtime 同时操作同一 Session 的冲突由 CAS 在保存边界检测；CAS 不是跨 Runtime 执行锁。

### G-AD16：Invalid History

如果当前 Runtime 的消息历史无法通过恢复协议验证：

- 不保存非法快照。
- 不修改 RuntimeState。
- 不删消息。
- 不伪造 ToolResult。
- 不自动重放。
- Application 不继续复用该 Runtime。
- 可以由调用方显式加载最后一次成功保存的 Session，重新创建 Runtime。

### G-AD17：Validation Boundary

只验证数据结构及 Conversation 协议完整性。

不建立业务 ToolResult 内容校验框架。

不创建通用 Validation Engine。

### G-AD18：First Save Timing

第一轮 Run settle 后才进行首次保存。

不要求提前持久化空 Session。

Application 必须明确区分：

- 新建会话：空历史 + expected revision 0。
- 恢复会话：必须存在已保存的 Session。

不得因为恢复时 load 返回 null 或 throw，就静默新建空会话。

### G-AD19：Store Consistency

Memory 与 SQLite 使用相同的：

- SessionSnapshot 数据契约
- revision CAS 语义
- Conflict Error 语义
- 基础数据验证
- load/save 引用隔离
- 非法数据拒绝规则

SQLite 另需验证数据库重新打开后的持久化恢复。

### G-AD20：Invalid Snapshot Rejection

不可恢复的历史不得覆盖最后一次有效的 Session 版本。

不引入用于诊断的不可恢复 SessionSnapshot 状态。

---

## 4. Implementation Scope

只实施 VII-G 必需的增量。

### 4.1 AgentRuntime

修改：

`src/runtime/agent-runtime.ts`

工作：

- 扩展 AgentRuntimeOptions.initialMessages。
- 构造时调用最小历史校验。
- 将校验后的历史深拷贝到内部 RuntimeState。
- 保持 getMessages() 隔离行为。
- 不改变已有 Run Loop 的主要逻辑。
- 不改变 Abort、Events、Tool execution 与 maxTurns 契约。

### 4.2 Conversation Validator

在与现有项目结构一致的位置增加最小 Validator。

要求：

- 接受 unknown 的持久化数据，并进行真正的运行时验证。
- 不能只使用 TypeScript 类型断言。
- 结构校验与 ToolCall pairing 校验可以放在同一个小模块中。
- 明确区分数据结构错误与配对协议错误，至少提供可诊断的错误信息。
- 不引入大型抽象。
- 复用同一验证规则保护 Store 和 Runtime 恢复入口。

### 4.3 SessionStore

建议新增：

```text
src/session/
├── session-store.ts
├── memory-session-store.ts
└── sqlite-session-store.ts
```

路径可以根据现有仓库规范做等价微调，避免无意义的新层级。

SessionStore 不包含 AgentRuntime、Provider、ContextBuilder 等依赖。

### 4.4 MemorySessionStore

要求：

- 内存保存 Snapshot。
- revision CAS。
- 创建冲突和更新冲突。
- 数据深拷贝。
- 无效 Snapshot 拒绝。
- load 不存在返回 null。
- 版本检查和状态替换在同步临界操作中完成，不在中途 await。

### 4.5 SQLiteSessionStore

要求：

- 真实文件数据库。
- sessionId 唯一。
- revision 字段。
- messages JSON 持久化。
- 原子创建和条件更新。
- 保存成功返回真实新 revision。
- 明确数据库连接生命周期及关闭方法。
- 可关闭并重新打开同一个数据库，恢复历史。
- 正确处理损坏数据、数据库错误、版本冲突。
- 不把所有 SQLite 错误都归一化为 Conflict。

选择 SQLite 依赖时：

1. 检查当前 package.json 和 Node.js engines。
2. 选择兼容当前工程的最小依赖。
3. 如果所选依赖要求调整 Node.js 支持范围，不要擅自调整；报告问题及替代方案。
4. 不使用需要升级到项目声明范围之外 Node 版本的内建 API 作为唯一方案。
5. 不实现通用 Repository Framework 或 ORM。

### 4.6 Application Workflow / Demo

新增一个最小的 Conversation Recovery Demo。

展示：

```text
Create new sessionId
        ↓
Create AgentRuntime
        ↓
Run #1
        ↓
Validate and save
        ↓
Dispose / stop using old Runtime
        ↓
Close and reopen SQLite
        ↓
Load SessionSnapshot
        ↓
Create new AgentRuntime(initialMessages)
        ↓
Run #2
        ↓
Model receives recovered history
        ↓
Validate and save new revision
```

优先使用 MockModelProvider 保证 Demo 可确定执行，不要求真实 OpenAI API Key。

Demo 应体现 Application 负责持久化编排，而不是把 SessionStore 注入 Runtime。

同时覆盖失败的 Run 与保存结果独立记录的最小示例或测试。

可以使用少量 Demo 层辅助函数，但不要引入通用 SessionManager、AgentService 或大型协调器。

---

## 5. Required Tests

新增测试必须覆盖以下场景。

### Group A：SessionStore Contract

对 Memory 和 SQLite 复用同一组核心行为测试：

1. 不存在 Session → null。
2. revision 0 创建 → revision 1。
3. 重复创建 → Conflict。
4. 当前 revision 更新成功。
5. 旧 revision 更新失败。
6. 冲突不改变已保存的历史。
7. sessionId 和 revision 非法输入被拒绝。
8. 非法消息结构拒绝保存。
9. 不合法 ToolCall pairing 拒绝保存。
10. load/save 双向引用隔离。
11. revision 极值及溢出保护。
12. 更新不存在的 Session 不能静默创建。

### Group B：Conversation Validation

验证：

1. 空历史合法。
2. 正常 user/model 历史合法。
3. Provider Error 后只有 user_input 的历史合法。
4. 完整 ToolCall / ToolResult 配对合法。
5. 多 ToolCall 顺序配对合法。
6. cancelled ToolResult 合法。
7. skipped ToolResult 合法。
8. Tool error result 合法。
9. 缺失 ToolResult 拒绝。
10. 重复 ToolResult 拒绝。
11. 孤立 ToolResult 拒绝。
12. 重复 ToolCall ID 拒绝。
13. 跨批次错误配对拒绝。
14. 消息类型及必要字段损坏拒绝。
15. ToolResult 业务内容不因为无法解析 JSON 而被错误拒绝。
16. 验证过程不修改输入对象。

测试应以现有真实 RuntimeMessage Contract 为准，不要为了满足测试而扩展消息字段。

### Group C：Runtime Recovery

1. 构造时使用 initialMessages 恢复。
2. 传入消息与内部 State 引用隔离。
3. getMessages() 仍然返回深拷贝。
4. 恢复不调用 Provider。
5. 恢复不执行 Tool。
6. 恢复不发 AgentEvent。
7. 下一次 run() 的 ModelRequest 包含恢复的历史。
8. 恢复后正常完成 Model → Tool → Model。
9. 恢复后 Abort 语义保持原样。
10. 恢复后依然维持 Single Active Run。
11. 不合法 initialMessages 在构造阶段拒绝。
12. 恢复前的 ToolResult 不触发历史 Tool 重放。

### Group D：SQLite Persistence

1. 保存并关闭数据库。
2. 用新 Store 实例重新打开。
3. 通过 Session ID 恢复历史。
4. 使用新 AgentRuntime 继续对话。
5. 再次保存后 revision 正确递增。
6. 两个独立数据库连接读取同一旧 revision。
7. 第一个保存成功。
8. 第二个保存因 revision 冲突失败。
9. 最终保存的数据没有被覆盖。
10. 数据损坏与普通 IO Error 不被报告为 Session 不存在或版本冲突。

### Group E：Application Settlement

1. Run completed + Save success。
2. Run completed + Save failure。
3. Run rejected + 合法历史 + Save success。
4. Run rejected + Save failure，两个错误都可观察。
5. Run rejected + 非法历史，不保存。
6. Abort 后完整的 cancelled pairing 可以保存。
7. Pre-aborted 且无新消息不产生无意义写入。
8. CAS conflict 不自动重新运行 Provider/Tool。
9. 保存失败不修改已提交 RuntimeState。
10. 顺序 Run → Save → Run 不发生无意义版本冲突。
11. 非法历史不继续交给 AgentRuntime.run()。

---

## 6. Explicit Non-goals

绝对不要提前实现：

- Session Tree
- SessionManager
- Durable Agent Loop
- Durable Tool Execution
- Durable Approval
- Checkpoint / Resume current Run
- Event Sourcing
- Run Queue
- Distributed Lock
- Scheduler
- Automatic Retry
- Conversation Merge
- Compaction / Summary
- Multi-Agent / Sub-Agent
- Streaming
- Run ID / Trace ID
- Telemetry Framework
- beforeToolCall / Human Approval
- Weather Agent 业务集成

VII-H、VII-I 留待后续 Milestone。

不要修改已确认的 Provider Contract、Tool Error Contract、Abort Contract 或 AgentEvent Contract，除非发现明确缺陷并说明必要原因。

---

## 7. Architecture Compliance

实现完成后，逐项检查：

1. AgentRuntime 是否依然是唯一 RuntimeState mutation owner？
2. SessionStore 是否完全独立于 AgentRuntime？
3. revision 是否仅属于持久化 Session，而不是 RuntimeState？
4. CAS 是否真正原子？
5. 是否存在静默覆盖 Session 的路径？
6. 恢复是否没有运行模型或 Tool？
7. invalid snapshot 是否在状态污染前被拒绝？
8. 是否有隐藏的异常吞噬或错误语义转换？
9. 是否错误扩大 VII-F 的 Active Run ownership？
10. 是否为了未来扩展而增加不必要的接口和抽象？
11. 是否保留了所有已确认的 G-AD01～G-AD20？
12. 是否避免提前实现 VII-H / VII-I？

---

## 8. Verification Commands

至少执行：

```bash
npm test
npm run build
npm run demo:runtime
npm run demo:tools
```

另执行现有仓库适用的严格测试 TypeScript 检查。

可以参考之前 VII-F 使用的检查方式：

```bash
./node_modules/.bin/tsc --noEmit \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --allowImportingTsExtensions \
  --strict \
  --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes \
  --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

运行新增 Conversation Recovery Demo。

并执行：

```bash
git diff --check
```

如果新增测试目录或工程配置，需要确保全部新测试都被 npm test 和类型检查覆盖。

不要将测试未覆盖的文件报告成已经通过验证。

---

## 9. Required Delivery Report

完成后，请按以下结构输出：

### A. Implementation Summary

本次实现了什么。

### B. Modified Files

逐文件说明职责和修改原因。

### C. Architecture Compliance

G-AD01～G-AD20 的落实情况及证据。

### D. Public Contract

最终真实 TypeScript 接口。

特别说明 SessionStore、SessionSnapshot、revision 和恢复入口。

### E. Persistence Semantics

说明 SQLite 的创建、条件更新、事务原子性、Conflict Error、数据隔离和错误行为。

### F. Runtime Verification

提供实际执行的命令、测试通过数量、失败数量、build 结果和 Demo 结果。

### G. Error and Recovery Cases

分别报告：

- Provider Error
- Persistence Error
- CAS Conflict
- Invalid Snapshot
- Incomplete ToolCall History
- Abort / Cancelled ToolResult

### H. Scope Review

明确说明是否引入任何未确认能力。

### I. Remaining Limitations

哪些问题仍然留待后续 Milestone，哪些是 VII-G 有意接受的限制。

---

## 10. Implementation Discipline

- 先阅读源码，再修改。
- 严格按照已确认设计做增量实现。
- 优先复用现有接口与类型。
- 不重写 Agent Loop。
- 不因为测试通过就自行认定架构正确。
- 不为未来假想需求增加抽象。
- 不修改历史 Milestone 的核心行为。
- 不自动生成 VII-G Closure Note 或宣布 Milestone Done。

本次 Codex 工作只交付 **Implementation + Tests + Verification Report**。

之后我们会在 ChatGPT 中独立进行：

**Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure。**</WritingBlock>


### ChatGPT

> Message ID: `bc19479c-1635-426c-af37-3d3d1066fe3a`; content: `text`; channel: `final`; recipient: `all`

# Part VII-G：Architecture Decisions Review + Codex Implementation Task

<badge color="success">架构设计闭合 · Ready for Implementation</badge>

**最终审查结论：PASS，可以进入 Codex Implementation 阶段。**

本轮基于以下材料完成复核：

- `source-review(10).zip`：实际源码、测试及工程配置。
- `README(7).md`：Part VII-A～VII-I 的范围与工程原则。
- VII-F 最终笔记：F-AD01～F-AD16 的控制、取消和消息提交契约。
- 本次 VII-G 架构讨论已经确认的 G-AD01～G-AD20。

我没有发现需要推翻 VII-A～VII-F 的架构问题。不过有几处实现细节必须写进 Codex Task，避免 Codex 自行做出超出范围的设计。

## 一、最终架构评审

### 1. 从源码确认的真实工程基线

| 模块 | 当前真实实现 | VII-G 处理方式 |
|---|---|---|
| `AgentRuntime` | 实例内保存 `RuntimeState.messages` | 增加构造时恢复入口 |
| `RuntimeState` | 只有 messages | 不增加 sessionId / revision |
| `getMessages()` | 使用 `structuredClone()` | 复用为快照读取 |
| `ContextBuilder` | 无状态，每轮重新投影上下文 | 不修改 |
| `ToolExecutor` | 校验、执行、ToolError 归一化 | 不修改 |
| `AgentEvent` | 同步 Subscriber，事件隔离 | 不修改 |
| `#active` | 每实例 Single Active Run | 保留 |
| Abort | 通过 RunOutcome 和 Tool pairing 结算 | 保留 |
| SessionStore | 尚不存在 | 新增 |
| Conversation Recovery | 尚不存在 | 本节实现 |

当前工程采用 Node.js `>=20`、TypeScript NodeNext、ES2022，现有依赖没有 SQLite 驱动。

因此 SQLite 库的选型必须兼容当前项目配置，不能未经确认就要求升级 Node.js 主版本或修改既有模块系统。

### 2. VII-G 最终职责划分

<box border radius="xl" padding={3} gap={2}>
  <CodeBlock language="mermaid" model_previewable>
flowchart TD
    A["Application / Caller"] -->|"load / save"| B["SessionStore"]
    B --> C["MemorySessionStore"]
    B --> D["SQLiteSessionStore"]
    A -->|"initialMessages"| E["AgentRuntime"]
    E --> F["RuntimeState: messages"]
    E --> G["ContextBuilder"]
    G --> H["ModelProvider"]
    E --> I["ToolExecutor"]
    A -->|"读取已结算消息"| E
  </CodeBlock>
  <caption>SessionStore 不反向依赖 AgentRuntime；Runtime Core 不认识 SQLite、revision 和 sessionId。</caption>
</box>

这个依赖方向是本节最重要的架构成果。

---

## 二、G-AD01～G-AD20 最终冻结

为避免沿用前几轮讨论中出现的候选编号歧义，Implementation Task 将以**决策内容**为权威，编号作为追踪标识。

| ID | 最终确认的设计 |
|---|---|
| G-AD01 | Run Boundary Persistence，暂不支持进程崩溃后的执行恢复 |
| G-AD02 | Application 负责持久化编排，Runtime 不直接依赖 Store |
| G-AD03 | SessionStore 最小 `load()` / `save()` Contract |
| G-AD04 | SessionSnapshot 保存 Session ID、revision、RuntimeMessage 历史 |
| G-AD05 | 存储不存在与存储失败必须区分 |
| G-AD06 | revision CAS 防止静默覆盖，不提供执行锁 |
| G-AD07 | `AgentRuntimeOptions.initialMessages` 构造时恢复 |
| G-AD08 | revision 0 表示预期不存在，成功创建得到 1，之后逐次递增 |
| G-AD09 | SQLiteSessionStore + MemorySessionStore |
| G-AD10 | Run settle 后由 Application 验证并保存合法历史 |
| G-AD11 | 严格验证恢复协议，不自动修复非法历史 |
| G-AD12 | Application 保留 Run 和 Persistence 的独立 Settlement |
| G-AD13 | 双重失败不覆盖原始 Run Error |
| G-AD14 | CAS 冲突显式失败，不重试、不合并、不覆盖 |
| G-AD15 | 同一 Session 的 Run → Save 在 Application 层顺序完成 |
| G-AD16 | 不合法的当前 Runtime 历史不得继续用于下一次 Run |
| G-AD17 | 验证消息结构与 ToolCall 配对，不解析历史 ToolResult 的业务内容 |
| G-AD18 | 首轮 Run settle 后首次保存；不预先保存空 Session |
| G-AD19 | Memory 和 SQLite 遵守相同接口、引用隔离与 CAS 语义 |
| G-AD20 | 不可恢复快照拒绝保存，既有持久化版本保持不变 |

**以上均属于已确认决策，不允许 Codex 重新选型。**

---

## 三、最终评审发现的 4 个实现风险

这些是 Architecture Review 对 Implementation Task 的补充约束，并不改变之前的设计。

### 风险 1：恢复后的数据不能只做 TypeScript 断言

源码中的 `RuntimeMessage` 是 TypeScript union，但 SQLite 中存储的 JSON 是运行时数据。

必须同时校验结构与配对关系。

尤其要验证每一批 ToolCall 的 `id` 唯一、ToolResult 一一对应，并拒绝跨批次引用。`TOOL_CALL_CANCELLED` 和 `TOOL_EXECUTION_SKIPPED` 仍然是合法 ToolResult，不需要解析其 JSON 业务内容。

### 风险 2：revision 必须由 Store 原子递增

不能由调用方简单执行：

```ts
snapshot.revision += 1;
```

然后直接覆盖保存。

应用层传入的是 expected revision。Store 比较版本、原子提交，再返回实际保存的 revision。

Memory 实现也应遵守相同规则。

### 风险 3：Store 的成功不等于 Run 的成功

`RunOutcome` 不增加 `persistence_failed`。

正常 Run 完成而 Store 保存失败，应分别报告执行结果和保存失败。

反过来，Provider 抛错但合法消息保存成功，也不能报告 `completed`。

### 风险 4：不能为“修复异常历史”修改已经完成的 Runtime

当前 `AgentRuntime` 在模型返回 ToolCalls 后，存在先提交 ModelOutput、随后才检查异常条件的路径。

因此某些异常确实可能留下未配对的 ToolCall。

VII-G 应在保存和恢复边界发现这种情况，但**不能为了通过持久化验证而删消息、补造 ToolResult 或重写 VII-F 的 Agent Loop**。

---

## 四、Milestone 完成标准

VII-G 需要交付的不仅是两个 Store，还必须证明实际恢复链路成立。

<box border radius="lg" padding={3} gap={2}>
  <text weight="medium">实施验收分组</text>
  <list marker="number" gap={2}>
    <list-item>
      **Session Contract**

      `load()` / `save()`、revision CAS、错误区分、快照隔离。
    </list-item>
    <list-item>
      **Conversation Validation**

      运行时结构验证、ToolCall 配对验证、非法历史拒绝。
    </list-item>
    <list-item>
      **Runtime Recovery**

      新 Runtime 从历史初始化，并继续正常 Model → Tool → Model。
    </list-item>
    <list-item>
      **Application Orchestration**

      Run / Persistence 双 Settlement，不丢失错误，顺序保存。
    </list-item>
    <list-item>
      **Regression**

      VII-A～VII-F 既有测试无回归，新增 SQLite 重开恢复及并发 CAS 测试。
    </list-item>
  </list>
</box>

实现结束后，Codex 应报告新增测试数、总测试数、build 结果和所有修改文件，不得仅使用“全部通过”代替验证证据。

---

## 五、📋 Codex Implementation Task — Part VII-G

下面这份任务可以直接交给 Codex 执行。

它沿用我们之前确定的 Milestone Goal、Current Repository State、Confirmed Design Decisions、Implementation Scope、Tests、Constraints 与交付报告结构。

<WritingBlock id="73842" variant="document"># 📋 Codex Implementation Task — Part VII-G

## 0. Execution Context

我们正在持续实现 `mini-agent-runtime`，这是一个使用 Node.js + TypeScript 编写的 Mini Agent Runtime v1。

项目采用 Milestone-by-Milestone 的增量演进方式，目标是理解并实践 Agent Runtime 的状态、执行、上下文、控制与持久化边界，而不是复刻 Pi Agent 或一次实现完整工业级平台。

已完成：

- VII-A：Foundation + ModelProvider
- VII-B：RuntimeState + Agent Loop
- VII-C：Tool Registry + Tool Executor + Error Contract
- VII-D：ContextBuilder + TurnSnapshot
- VII-E：AgentEvent + Subscriber
- VII-F：Abort + Single Active Run

现在实现：

**Part VII-G：SessionStore + Conversation Recovery**

请首先完整阅读当前仓库中的相关源码、现有测试、README 和工程配置。

以仓库真实代码为准，不要根据本任务中的示意接口覆盖现有接口。

本 Milestone 的架构讨论已经全部完成。你的角色是按照已确认的设计实现代码、编写测试、运行验证，而不是重新设计架构。

如果发现已确认设计存在确实无法实现或明显破坏既有契约的地方，请明确报告问题和最小调整建议，不要擅自扩展 Scope。

---

## 1. Milestone Goal

在 VII-F 的现有 Runtime 基础上，增量实现最小 Conversation Persistence & Recovery。

实现完成后必须满足：

1. Application 可以保存一个 Runtime 已提交的对话消息。
2. 使用 `sessionId` 可以重新加载持久化历史。
3. 可以通过 `initialMessages` 创建新的 `AgentRuntime`。
4. 新 Runtime 可以基于恢复后的历史继续运行正常 Agent Loop。
5. SQLite Store 支持关闭并重新打开数据库后的对话恢复。
6. Memory / SQLite 均提供 revision CAS（Compare-and-Swap，比较并交换）。
7. Session 并发写入不能静默覆盖。
8. 损坏或协议不完整的历史不能被恢复为可执行 Runtime。
9. Run Error 和 Persistence Error 不得互相覆盖。
10. VII-A～VII-F 所有既有契约和测试继续成立。

不需要恢复正在执行的 Promise、Tool、HTTP 请求或 Agent Loop。

这是 Conversation Recovery，不是 Durable Execution。

## 2. Current Repository State

当前真实源码包含：

- `src/runtime/agent-runtime.ts`
- `src/runtime/runtime-state.ts`
- `src/runtime/context-builder.ts`
- `src/runtime/agent-event.ts`
- `src/messages/runtime-message.ts`
- `src/messages/to-model-message.ts`
- `src/model/model-provider.ts`
- `src/tools/tool-registry.ts`
- `src/tools/tool-executor.ts`

当前关键事实：

### 2.1 RuntimeState

```ts
interface RuntimeState {
  messages: RuntimeMessage[];
}
```

保持 messages-only 设计。

### 2.2 AgentRuntime

当前构造函数：

```ts
constructor(
  provider: ModelProvider,
  options: AgentRuntimeOptions = {}
)
```

当前 Options：

```ts
interface AgentRuntimeOptions {
  registry?: ToolRegistry;
  maxTurns?: number;
}
```

当前提供：

```ts
getMessages(): RuntimeMessage[]
```

方法返回深拷贝。

当前 Runtime 拥有自己的 `#active`，并使用外层 `try/finally` 释放 Active Run ownership。

### 2.3 ContextBuilder

现有 ContextBuilder 无状态。

每个 Model Turn 根据最新 RuntimeMessage 历史构建独立的 TurnSnapshot。

VII-G 不应修改其职责。

### 2.4 Abort and Tool Pairing

VII-F 已实现：

- Caller-owned AbortSignal
- Provider / Tool cooperative cancellation
- Cancellation provenance
- `RunOutcome.aborted`
- committed facts 不回滚
- `TOOL_CALL_CANCELLED` pairing
- `TOOL_EXECUTION_SKIPPED` pairing
- Single Active Run
- subscriber 异常隔离

这些行为必须保留。

### 2.5 Engineering Configuration

项目采用：

- Node.js >=20
- TypeScript
- NodeNext module resolution
- ESM
- `tsx --test`
- `tsc`
- 严格 TypeScript 类型检查

原有 `npm test` 共有 75 个通过的测试。

新增依赖必须与当前 Node.js 支持范围、ESM 及工程配置兼容。

---

## 3. Confirmed Design Decisions

以下设计已经由用户确认，禁止重新设计。

### G-AD01：Run Boundary Persistence

本阶段在 Run settle 后保存已提交的消息历史。

不实现逐消息 checkpoint、崩溃期间的执行恢复、Durable Tool 或 Event Sourcing。

### G-AD02：Application owns persistence orchestration

- `AgentRuntime` 负责 Agent Loop 和 RuntimeState。
- Application / Caller 负责 load、run、validation、save 的编排。
- SessionStore 负责数据读写。
- `AgentRuntime` 不直接依赖 SessionStore。
- SessionStore 不调用 AgentRuntime，也不执行模型或 Tool。

### G-AD03～G-AD06：Minimal SessionStore Contract

建议最终接口：

```ts
interface SessionSnapshot {
  sessionId: string;
  revision: number;
  messages: RuntimeMessage[];
}

interface SessionStore {
  load(
    sessionId: string
  ): Promise<SessionSnapshot | null>;

  save(
    snapshot: SessionSnapshot
  ): Promise<SessionSnapshot>;
}
```

约束：

- `load()` 找不到 Session 返回 null。
- 读取或反序列化失败必须抛错，不得伪装为 null。
- `save()` 输入的 revision 是 expected revision。
- 保存成功返回包含新 revision 的快照。
- 冲突必须显式抛出 `SessionConflictError`。
- 不允许静默覆盖。
- 不做自动合并或自动重试。
- 不增加 delete/list/session tree 等接口。

### G-AD07：Constructor-only Recovery

扩展现有 `AgentRuntimeOptions`：

```ts
initialMessages?: RuntimeMessage[];
```

要求：

- 只在构造时注入历史。
- 运行时严格验证历史。
- 使用深拷贝隔离传入对象和内部 State。
- 空历史合法。
- 恢复本身不发 AgentEvent。
- 恢复本身不调用 ModelProvider 或 Tool。
- 不增加公共 `setMessages()` 或 `restore()`。
- 不改变当前 `run()` 的接口语义。

### G-AD08：Revision Lifecycle

- revision 0 表示调用方期望 Session 尚不存在。
- 首次成功保存返回 revision 1。
- 正常更新要求输入 revision 与当前持久化版本一致。
- 更新成功 revision +1。
- 版本不匹配时抛 `SessionConflictError`。
- revision 必须是安全、有效的非负整数。
- 超出安全整数范围不得溢出或绕过版本检查。
- Store 负责生成新 revision，调用方不能直接指定新的已提交版本。

### G-AD09：Two Store Implementations

实现：

- `MemorySessionStore`
- `SQLiteSessionStore`

两者必须遵守相同接口与基本错误契约。

Memory 主要用于确定性测试。

SQLite 用于真实跨进程持久化与原子 CAS。

SQLite 的版本检查与写入必须使用数据库提供的原子机制。

不得先独立 SELECT 版本，再无条件 UPDATE 作为 CAS 实现。

不要引入 Redis、PostgreSQL 或分布式锁。

### G-AD10：Run Settlement Persistence

Application 在一次 Run settle 后：

1. 获得 Run Outcome 或原始异常。
2. 读取 Runtime 已提交的 messages。
3. 验证快照是否可以安全恢复。
4. 对合法且需要保存的历史调用 SessionStore.save()。
5. 分别保留 Run 与 Persistence 的结算结果。

正常返回的 completed、unsupported、limit_reached、aborted 均可保存合法消息。

普通 Provider Error 后，如果留下合法历史，例如单独的 user_input，同样应支持保存。

Pre-aborted 且没有新增消息的 Run 不应无意义地创建 Session 或递增 revision。

### G-AD11：Strict Conversation Validation

验证包括：

- RuntimeMessage 的真实结构。
- 各消息必要字段的类型。
- ToolCall 的基本结构及参数可序列化性。
- ToolCall ID 唯一性。
- ToolResult 对应关系。
- 不重复配对。
- 不缺失配对。
- 不出现孤立 ToolResult。
- 不跨 ToolCall batch 错误配对。
- 不允许带未完成 ToolCall 的历史直接恢复。

允许：

- 空历史。
- 正常连续的用户消息。
- Provider Error 后的单独 user_input。
- 已完整配对的 ToolCalls。
- skipped/cancelled/error ToolResult。

不要解析或重新解释历史 ToolResult 的业务内容，也不要因为 ToolResult.success 为 false 就拒绝整段 Conversation。

不要求历史 Tool 仍注册在当前 Registry。

不执行、重放或自动补齐 ToolCall。

如果已有真实 RuntimeMessage Contract 允许某些合法的历史形态，不要凭空限制为 user/assistant 严格交替。

验证应基于当前模型和 ContextBuilder 可以安全处理的消息协议。

### G-AD12～G-AD13：Dual Settlement

Run 与 Persistence 是独立结算边界。

Application 必须保留两者各自的结果或错误。

不得：

- 将保存错误映射成 `RunOutcome.aborted`。
- 将保存失败视为 Tool 执行失败。
- 因保存失败自动重新执行 Run。
- 用 Persistence Error 覆盖原始 Provider Error。
- 将保存成功误报为 Agent Run completed。

优先使用简洁的应用层显式编排代码。

不要为此创建大型 Result Framework。

如果展示代码或 Demo，应使双重失败时的原始 Run Error 和 Persistence Error 都可以被调用方观察到。

### G-AD14：Conflict Semantics

发生 CAS Conflict：

- 原持久化 Session 保持不变。
- 抛出明确 Conflict Error。
- 不覆盖、合并或自动 retry。
- 不自动重新执行 Provider 或 Tool。
- 不回滚 AgentRuntime 内存事实。

### G-AD15：Sequential Session Workflow

同一 Application Session Workflow：

```text
Run → Snapshot → Validate → Save → Next Run
```

保存 settle 前不得开始当前 Session 的下一次写入流程。

该约束由 Application 负责。

不增加全局 Session Lock、RunManager、Queue 或 Scheduler。

不同 Runtime 同时操作同一 Session 的冲突由 CAS 在保存边界检测；CAS 不是跨 Runtime 执行锁。

### G-AD16：Invalid History

如果当前 Runtime 的消息历史无法通过恢复协议验证：

- 不保存非法快照。
- 不修改 RuntimeState。
- 不删消息。
- 不伪造 ToolResult。
- 不自动重放。
- Application 不继续复用该 Runtime。
- 可以由调用方显式加载最后一次成功保存的 Session，重新创建 Runtime。

### G-AD17：Validation Boundary

只验证数据结构及 Conversation 协议完整性。

不建立业务 ToolResult 内容校验框架。

不创建通用 Validation Engine。

### G-AD18：First Save Timing

第一轮 Run settle 后才进行首次保存。

不要求提前持久化空 Session。

Application 必须明确区分：

- 新建会话：空历史 + expected revision 0。
- 恢复会话：必须存在已保存的 Session。

不得因为恢复时 load 返回 null 或 throw，就静默新建空会话。

### G-AD19：Store Consistency

Memory 与 SQLite 使用相同的：

- SessionSnapshot 数据契约
- revision CAS 语义
- Conflict Error 语义
- 基础数据验证
- load/save 引用隔离
- 非法数据拒绝规则

SQLite 另需验证数据库重新打开后的持久化恢复。

### G-AD20：Invalid Snapshot Rejection

不可恢复的历史不得覆盖最后一次有效的 Session 版本。

不引入用于诊断的不可恢复 SessionSnapshot 状态。

---

## 4. Implementation Scope

只实施 VII-G 必需的增量。

### 4.1 AgentRuntime

修改：

`src/runtime/agent-runtime.ts`

工作：

- 扩展 AgentRuntimeOptions.initialMessages。
- 构造时调用最小历史校验。
- 将校验后的历史深拷贝到内部 RuntimeState。
- 保持 getMessages() 隔离行为。
- 不改变已有 Run Loop 的主要逻辑。
- 不改变 Abort、Events、Tool execution 与 maxTurns 契约。

### 4.2 Conversation Validator

在与现有项目结构一致的位置增加最小 Validator。

要求：

- 接受 unknown 的持久化数据，并进行真正的运行时验证。
- 不能只使用 TypeScript 类型断言。
- 结构校验与 ToolCall pairing 校验可以放在同一个小模块中。
- 明确区分数据结构错误与配对协议错误，至少提供可诊断的错误信息。
- 不引入大型抽象。
- 复用同一验证规则保护 Store 和 Runtime 恢复入口。

### 4.3 SessionStore

建议新增：

```text
src/session/
├── session-store.ts
├── memory-session-store.ts
└── sqlite-session-store.ts
```

路径可以根据现有仓库规范做等价微调，避免无意义的新层级。

SessionStore 不包含 AgentRuntime、Provider、ContextBuilder 等依赖。

### 4.4 MemorySessionStore

要求：

- 内存保存 Snapshot。
- revision CAS。
- 创建冲突和更新冲突。
- 数据深拷贝。
- 无效 Snapshot 拒绝。
- load 不存在返回 null。
- 版本检查和状态替换在同步临界操作中完成，不在中途 await。

### 4.5 SQLiteSessionStore

要求：

- 真实文件数据库。
- sessionId 唯一。
- revision 字段。
- messages JSON 持久化。
- 原子创建和条件更新。
- 保存成功返回真实新 revision。
- 明确数据库连接生命周期及关闭方法。
- 可关闭并重新打开同一个数据库，恢复历史。
- 正确处理损坏数据、数据库错误、版本冲突。
- 不把所有 SQLite 错误都归一化为 Conflict。

选择 SQLite 依赖时：

1. 检查当前 package.json 和 Node.js engines。
2. 选择兼容当前工程的最小依赖。
3. 如果所选依赖要求调整 Node.js 支持范围，不要擅自调整；报告问题及替代方案。
4. 不使用需要升级到项目声明范围之外 Node 版本的内建 API 作为唯一方案。
5. 不实现通用 Repository Framework 或 ORM。

### 4.6 Application Workflow / Demo

新增一个最小的 Conversation Recovery Demo。

展示：

```text
Create new sessionId
        ↓
Create AgentRuntime
        ↓
Run #1
        ↓
Validate and save
        ↓
Dispose / stop using old Runtime
        ↓
Close and reopen SQLite
        ↓
Load SessionSnapshot
        ↓
Create new AgentRuntime(initialMessages)
        ↓
Run #2
        ↓
Model receives recovered history
        ↓
Validate and save new revision
```

优先使用 MockModelProvider 保证 Demo 可确定执行，不要求真实 OpenAI API Key。

Demo 应体现 Application 负责持久化编排，而不是把 SessionStore 注入 Runtime。

同时覆盖失败的 Run 与保存结果独立记录的最小示例或测试。

可以使用少量 Demo 层辅助函数，但不要引入通用 SessionManager、AgentService 或大型协调器。

---

## 5. Required Tests

新增测试必须覆盖以下场景。

### Group A：SessionStore Contract

对 Memory 和 SQLite 复用同一组核心行为测试：

1. 不存在 Session → null。
2. revision 0 创建 → revision 1。
3. 重复创建 → Conflict。
4. 当前 revision 更新成功。
5. 旧 revision 更新失败。
6. 冲突不改变已保存的历史。
7. sessionId 和 revision 非法输入被拒绝。
8. 非法消息结构拒绝保存。
9. 不合法 ToolCall pairing 拒绝保存。
10. load/save 双向引用隔离。
11. revision 极值及溢出保护。
12. 更新不存在的 Session 不能静默创建。

### Group B：Conversation Validation

验证：

1. 空历史合法。
2. 正常 user/model 历史合法。
3. Provider Error 后只有 user_input 的历史合法。
4. 完整 ToolCall / ToolResult 配对合法。
5. 多 ToolCall 顺序配对合法。
6. cancelled ToolResult 合法。
7. skipped ToolResult 合法。
8. Tool error result 合法。
9. 缺失 ToolResult 拒绝。
10. 重复 ToolResult 拒绝。
11. 孤立 ToolResult 拒绝。
12. 重复 ToolCall ID 拒绝。
13. 跨批次错误配对拒绝。
14. 消息类型及必要字段损坏拒绝。
15. ToolResult 业务内容不因为无法解析 JSON 而被错误拒绝。
16. 验证过程不修改输入对象。

测试应以现有真实 RuntimeMessage Contract 为准，不要为了满足测试而扩展消息字段。

### Group C：Runtime Recovery

1. 构造时使用 initialMessages 恢复。
2. 传入消息与内部 State 引用隔离。
3. getMessages() 仍然返回深拷贝。
4. 恢复不调用 Provider。
5. 恢复不执行 Tool。
6. 恢复不发 AgentEvent。
7. 下一次 run() 的 ModelRequest 包含恢复的历史。
8. 恢复后正常完成 Model → Tool → Model。
9. 恢复后 Abort 语义保持原样。
10. 恢复后依然维持 Single Active Run。
11. 不合法 initialMessages 在构造阶段拒绝。
12. 恢复前的 ToolResult 不触发历史 Tool 重放。

### Group D：SQLite Persistence

1. 保存并关闭数据库。
2. 用新 Store 实例重新打开。
3. 通过 Session ID 恢复历史。
4. 使用新 AgentRuntime 继续对话。
5. 再次保存后 revision 正确递增。
6. 两个独立数据库连接读取同一旧 revision。
7. 第一个保存成功。
8. 第二个保存因 revision 冲突失败。
9. 最终保存的数据没有被覆盖。
10. 数据损坏与普通 IO Error 不被报告为 Session 不存在或版本冲突。

### Group E：Application Settlement

1. Run completed + Save success。
2. Run completed + Save failure。
3. Run rejected + 合法历史 + Save success。
4. Run rejected + Save failure，两个错误都可观察。
5. Run rejected + 非法历史，不保存。
6. Abort 后完整的 cancelled pairing 可以保存。
7. Pre-aborted 且无新消息不产生无意义写入。
8. CAS conflict 不自动重新运行 Provider/Tool。
9. 保存失败不修改已提交 RuntimeState。
10. 顺序 Run → Save → Run 不发生无意义版本冲突。
11. 非法历史不继续交给 AgentRuntime.run()。

---

## 6. Explicit Non-goals

绝对不要提前实现：

- Session Tree
- SessionManager
- Durable Agent Loop
- Durable Tool Execution
- Durable Approval
- Checkpoint / Resume current Run
- Event Sourcing
- Run Queue
- Distributed Lock
- Scheduler
- Automatic Retry
- Conversation Merge
- Compaction / Summary
- Multi-Agent / Sub-Agent
- Streaming
- Run ID / Trace ID
- Telemetry Framework
- beforeToolCall / Human Approval
- Weather Agent 业务集成

VII-H、VII-I 留待后续 Milestone。

不要修改已确认的 Provider Contract、Tool Error Contract、Abort Contract 或 AgentEvent Contract，除非发现明确缺陷并说明必要原因。

---

## 7. Architecture Compliance

实现完成后，逐项检查：

1. AgentRuntime 是否依然是唯一 RuntimeState mutation owner？
2. SessionStore 是否完全独立于 AgentRuntime？
3. revision 是否仅属于持久化 Session，而不是 RuntimeState？
4. CAS 是否真正原子？
5. 是否存在静默覆盖 Session 的路径？
6. 恢复是否没有运行模型或 Tool？
7. invalid snapshot 是否在状态污染前被拒绝？
8. 是否有隐藏的异常吞噬或错误语义转换？
9. 是否错误扩大 VII-F 的 Active Run ownership？
10. 是否为了未来扩展而增加不必要的接口和抽象？
11. 是否保留了所有已确认的 G-AD01～G-AD20？
12. 是否避免提前实现 VII-H / VII-I？

---

## 8. Verification Commands

至少执行：

```bash
npm test
npm run build
npm run demo:runtime
npm run demo:tools
```

另执行现有仓库适用的严格测试 TypeScript 检查。

可以参考之前 VII-F 使用的检查方式：

```bash
./node_modules/.bin/tsc --noEmit \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --allowImportingTsExtensions \
  --strict \
  --noUncheckedIndexedAccess \
  --exactOptionalPropertyTypes \
  --skipLibCheck \
  test/*.test.ts test/support/*.ts
```

运行新增 Conversation Recovery Demo。

并执行：

```bash
git diff --check
```

如果新增测试目录或工程配置，需要确保全部新测试都被 npm test 和类型检查覆盖。

不要将测试未覆盖的文件报告成已经通过验证。

---

## 9. Required Delivery Report

完成后，请按以下结构输出：

### A. Implementation Summary

本次实现了什么。

### B. Modified Files

逐文件说明职责和修改原因。

### C. Architecture Compliance

G-AD01～G-AD20 的落实情况及证据。

### D. Public Contract

最终真实 TypeScript 接口。

特别说明 SessionStore、SessionSnapshot、revision 和恢复入口。

### E. Persistence Semantics

说明 SQLite 的创建、条件更新、事务原子性、Conflict Error、数据隔离和错误行为。

### F. Runtime Verification

提供实际执行的命令、测试通过数量、失败数量、build 结果和 Demo 结果。

### G. Error and Recovery Cases

分别报告：

- Provider Error
- Persistence Error
- CAS Conflict
- Invalid Snapshot
- Incomplete ToolCall History
- Abort / Cancelled ToolResult

### H. Scope Review

明确说明是否引入任何未确认能力。

### I. Remaining Limitations

哪些问题仍然留待后续 Milestone，哪些是 VII-G 有意接受的限制。

---

## 10. Implementation Discipline

- 先阅读源码，再修改。
- 严格按照已确认设计做增量实现。
- 优先复用现有接口与类型。
- 不重写 Agent Loop。
- 不因为测试通过就自行认定架构正确。
- 不为未来假想需求增加抽象。
- 不修改历史 Milestone 的核心行为。
- 不自动生成 VII-G Closure Note 或宣布 Milestone Done。

本次 Codex 工作只交付 **Implementation + Tests + Verification Report**。

之后我们会在 ChatGPT 中独立进行：

**Runtime Verification / Debug → Code Review + Theory Feedback → Milestone Closure。**</WritingBlock>

---

## 六、Theory Feedback：VII-G 真正需要掌握什么？

本节虽然围绕 SessionStore 展开，但最值得理解的不是 SQLite API，而是四个重要概念。

### 1. State Ownership 不等于 Persistence Ownership

以前的 Runtime 只需要回答：

> 谁能修改当前对话历史？

答案是 AgentRuntime。

现在进一步需要回答：

> 谁决定什么时候把历史保存为可恢复数据？

答案是 Application。

这是我们前面学习过的 **Who owns it / Who decides / Who changes state** 在真实工程中的又一次应用。

### 2. Conversation Recovery 不等于 Execution Recovery

这是 Agent 开发中特别重要的区分。

```text
Conversation Recovery
    恢复历史 → 创建新 Runtime → 开始新 Run

Execution Recovery
    恢复执行位置 → 处理未完成操作 → 继续旧 Run
```

前者解决上下文连续性。

后者涉及持久化执行、Tool 副作用、幂等性和中断重放。

我们的 Mini Runtime 当前只需要前者。

### 3. CAS 保证版本安全，不保证副作用安全

revision 能防止旧会话覆盖新会话，但不能防止两个 Agent 同时操作外部业务系统。

未来开发营销业务 Agent 时，这一点尤其重要。

例如发放会员优惠券，真正防止重复发放还需要业务 API 层的权限、幂等性与执行控制，而不能仅依靠 SessionStore。

### 4. Commit 有两个不同层次

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={2}>
    <icon name="brain-circuit" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Runtime Commit**

      <text size="sm" color="secondary">消息成为 AgentRuntime 内部已提交的事实。</text>
    </box>
  </row>
  <row justify="center">
    <icon name="arrow-down" color="secondary"/>
  </row>
  <row align="center" gap={2}>
    <icon name="database" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Persistence Commit**

      <text size="sm" color="secondary">Conversation Snapshot 经版本检查后成功写入持久化存储。</text>
    </box>
  </row>
</box>

这两个 Commit 之间存在时间窗口。VII-G 不试图把它们变成一笔跨 Runtime 和数据库的原子事务。

理解这一点，比单纯记住 `save()`、`load()` 更有价值。

## 七、接下来的工程流程

<box border radius="lg" padding={3} gap={2}>
  <list marker="number" connector="solid" gap={2}>
    <list-item>
      **Architecture Analysis + Design Decision**

      <badge color="success">已完成</badge>
    </list-item>
    <list-item>
      **Codex Implementation**

      <text color="secondary" size="sm">当前阶段：交付源码修改、测试结果及实施报告。</text>
    </list-item>
    <list-item>
      **Runtime Verification / Debug**

      <text color="secondary" size="sm">核对真实运行行为，重点验证跨进程恢复与 CAS 并发。</text>
    </list-item>
    <list-item>
      **Code Review + Theory Feedback**

      <text color="secondary" size="sm">审查 Ownership、Commit、Error 和 Recovery 边界。</text>
    </list-item>
    <list-item>
      **Milestone Closure**

      <text color="secondary" size="sm">通过最终 Review 后，再整理 VII-G 学习笔记与架构决策记录。</text>
    </list-item>
  </list>
</box>

**当前 Part VII-G 的状态是 Architecture Ready，尚不是 Done。**

你现在可以将上面的 Codex Implementation Task 交给 Codex。等 Codex 完成第一轮实现，把源码压缩包、修改总结和测试结果发给我，我们按既定流程进入独立 Code Review，而不是默认测试通过就代表架构正确。


### ChatGPT

> Message ID: `25f81b05-ada0-4996-9f6e-90f8c22b6971`; content: `text`; channel: `final`; recipient: `all`

---

## 六、Theory Feedback：VII-G 真正需要掌握什么？

本节虽然围绕 SessionStore 展开，但最值得理解的不是 SQLite API，而是四个重要概念。

### 1. State Ownership 不等于 Persistence Ownership

以前的 Runtime 只需要回答：

> 谁能修改当前对话历史？

答案是 AgentRuntime。

现在进一步需要回答：

> 谁决定什么时候把历史保存为可恢复数据？

答案是 Application。

这是我们前面学习过的 **Who owns it / Who decides / Who changes state** 在真实工程中的又一次应用。

### 2. Conversation Recovery 不等于 Execution Recovery

这是 Agent 开发中特别重要的区分。

```text
Conversation Recovery
    恢复历史 → 创建新 Runtime → 开始新 Run

Execution Recovery
    恢复执行位置 → 处理未完成操作 → 继续旧 Run
```

前者解决上下文连续性。

后者涉及持久化执行、Tool 副作用、幂等性和中断重放。

我们的 Mini Runtime 当前只需要前者。

### 3. CAS 保证版本安全，不保证副作用安全

revision 能防止旧会话覆盖新会话，但不能防止两个 Agent 同时操作外部业务系统。

未来开发营销业务 Agent 时，这一点尤其重要。

例如发放会员优惠券，真正防止重复发放还需要业务 API 层的权限、幂等性与执行控制，而不能仅依靠 SessionStore。

### 4. Commit 有两个不同层次

<box border radius="lg" padding={3} gap={2}>
  <row align="center" gap={2}>
    <icon name="brain-circuit" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Runtime Commit**

      <text size="sm" color="secondary">消息成为 AgentRuntime 内部已提交的事实。</text>
    </box>
  </row>
  <row justify="center">
    <icon name="arrow-down" color="secondary"/>
  </row>
  <row align="center" gap={2}>
    <icon name="database" color="secondary" size="lg"/>
    <box flex="1" gap={1}>
      **Persistence Commit**

      <text size="sm" color="secondary">Conversation Snapshot 经版本检查后成功写入持久化存储。</text>
    </box>
  </row>
</box>

这两个 Commit 之间存在时间窗口。VII-G 不试图把它们变成一笔跨 Runtime 和数据库的原子事务。

理解这一点，比单纯记住 `save()`、`load()` 更有价值。

## 七、接下来的工程流程

<box border radius="lg" padding={3} gap={2}>
  <list marker="number" connector="solid" gap={2}>
    <list-item>
      **Architecture Analysis + Design Decision**

      <badge color="success">已完成</badge>
    </list-item>
    <list-item>
      **Codex Implementation**

      <text color="secondary" size="sm">当前阶段：交付源码修改、测试结果及实施报告。</text>
    </list-item>
    <list-item>
      **Runtime Verification / Debug**

      <text color="secondary" size="sm">核对真实运行行为，重点验证跨进程恢复与 CAS 并发。</text>
    </list-item>
    <list-item>
      **Code Review + Theory Feedback**

      <text color="secondary" size="sm">审查 Ownership、Commit、Error 和 Recovery 边界。</text>
    </list-item>
    <list-item>
      **Milestone Closure**

      <text color="secondary" size="sm">通过最终 Review 后，再整理 VII-G 学习笔记与架构决策记录。</text>
    </list-item>
  </list>
</box>

**当前 Part VII-G 的状态是 Architecture Ready，尚不是 Done。**

你现在可以将上面的 Codex Implementation Task 交给 Codex。等 Codex 完成第一轮实现，把源码压缩包、修改总结和测试结果发给我，我们按既定流程进入独立 Code Review，而不是默认测试通过就代表架构正确。
