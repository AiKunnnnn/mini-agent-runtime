# Day04 Part C ChatGPT 分享会话源记录

## 来源

- 原始学习记录 URL: https://chatgpt.com/share/6a5f3b3e-cd80-83e8-856e-d7aaa7990a6b
- 页面标题：ChatGPT - Day04 Part C 解析
- 抓取方式：从分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user/assistant 文本消息。
- 抓取时间：2026-07-21
- 有效消息数：58

## 对话正文

### 1. User (2026-07-21 14:27:10)

这是 day04 part B 02 的学习笔记，我们开始下一节的学习吧

### 2. Assistant (2026-07-21 14:27:12)

我已经读取了你上传的 **Day04 Part B-02：Runtime State Lifecycle** 学习笔记。fileciteturn0file1

先确认一下当前学习进度：

```text
Day04：Runtime 如何思考（How Runtime Thinks）

Part A：
Prompt 不是 Context
        ↓
Part B-01：
Runtime State 是什么
        ↓
Part B-02：
Runtime State Lifecycle  ✅ 已完成
        ↓
Part C：
Context Builder 如何把 Runtime State Projection 成 Provider Messages
        ↓
Part D：
Context Window Management
        ↓
Part E：
Provider Adapter
```

目前我们已经完成了 Day04 最核心的一条认知链：

```text
Runtime State
      |
      v
Lifecycle
      |
      v
Projection
      |
      v
Context
      |
      v
LLM
```

也就是说：

以前：

> Agent = LLM + Prompt + Tool

现在：

> Agent = Runtime State 管理系统 + Context Projection + LLM 推理 + Tool 执行

---

## 下一节开始：Day04 Part C —— Context Builder

这一节其实是 Day04 的核心。

因为前面的 Part A、B 都是在回答：

> Runtime 内部有什么？

而 Part C 开始回答：

> Runtime 如何决定给 LLM 看什么？

这是 Agent Runtime 和普通 LLM API 调用最大的分水岭。

---

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

## 本节核心问题

我们已经知道：

```text
Runtime State
```

里面有很多东西：

```text
Conversation

Memory

Summary

Workspace

Planner

Tool Result

User Preference

Current Goal

Checkpoint

Metadata
```

那么问题来了：

为什么不能直接：

```ts
llm.chat(runtimeState)
```

？

为什么一定需要：

```text
Runtime State
        |
        v
Context Builder
        |
        v
Provider Messages
        |
        v
LLM
```

？

---

# 第一部分：Runtime State ≠ Context

这是 Part C 的第一个认知升级。

很多初学 Agent 的人会认为：

```
Context = 历史聊天记录
```

例如：

```json
[
 {
   role:"user",
   content:"帮我修复bug"
 },
 {
   role:"assistant",
   content:"好的"
 }
]
```

然后觉得：

> 把聊天记录塞给 LLM 就行。

但是工业 Agent 不是这样。

因为 Runtime State 是：

```text
Agent 对世界的完整认知
```

而 Context 是：

```text
为了当前一次推理，让 LLM 看到的世界切片
```

二者关系：

```
Runtime State
      |
      |
      | Projection
      |
      v

Context
```

---

举个例子。

一个 Coding Agent 当前状态：

```text
Conversation:

用户：
修复 login.ts


Workspace:

login.ts
auth.ts
token.ts


Planner:

Step 3:
修改 login.ts


Memory:

用户喜欢 TypeScript strict


Summary:

之前已经分析完 auth 流程


Tool Result:

npm test:
3 errors
```

Runtime State 很完整。

但是当前 LLM 只需要知道：

```text
System:
你是 coding agent


Goal:
修复 login.ts


Relevant Files:
login.ts


Previous Analysis:
auth.ts 已确认问题来源


Latest Error:
xxx


Available Tools:
edit_file
run_test
```

这才是 Context。

---

所以：

Runtime State：

> 世界数据库

Context：

> 给 LLM 的世界观投影


---

# 第二部分：Context Builder 为什么是 Runtime 核心模块

很多人认为：

```
Agent 核心 = Prompt
```

实际上：

```
Agent 核心 = Context Engineering
```

因为 LLM 本身不知道：

- 什么重要
- 什么应该忽略
- 什么需要记忆
- 什么已经过时


这些全部由 Runtime 决定。

例如：

Conversation:

10000 条历史消息。

LLM 能不能全部看？

不能。

Runtime 必须决定：

保留：

```
最近 10 条消息
```

删除：

```
三个月前闲聊
```

提取：

```
用户长期偏好
```

压缩：

```
历史分析过程
```

这就是 Context Builder。

---

# 第三部分：Context Builder 的职责

工业 Runtime 中：

Context Builder 不只是：

```js
messages.push(...)
```

它负责：

## 1. 信息选择

Question：

当前推理需要哪些 State？


例如：

Debug：

需要：

```
Workspace
Tool Result
Error
Recent Conversation
```

不需要：

```
旅游偏好
历史闲聊
```

---

## 2. 信息排序

LLM 对位置敏感。

例如：

```
System Instruction

Important Context

Current Goal

Recent Messages

Tool Result
```

顺序会影响效果。

---

## 3. 信息压缩


例如：

100轮对话：

```
Message1
Message2
...
Message100
```

变成：

```
Summary:
用户正在开发 Agent Runtime
当前完成 Runtime State
下一步学习 Context Builder
```

---

## 4. Token Budget 管理

例如：

模型最大：

```
128k token
```

但是：

System:

10k

Memory:

20k

Conversation:

80k


超过怎么办？


Context Builder 决定：

```
压缩
裁剪
降级
摘要
```

---

# 第四部分：Context Builder 和 React 的关系

这里继续沿用我们之前的 React 类比。

React：

```
State

↓

Render

↓

DOM
```


Agent：

```
Runtime State

↓

Context Builder

↓

Provider Messages
```


DOM 不是 React State。

同样：

Provider Messages 不是 Runtime State。

这是非常重要的设计原则。


---

# 第五部分：Context Builder 的内部结构

一个简单模型：

```ts
class ContextBuilder {

 build(state){

   return {

    system:
      buildSystemPrompt(),

    messages:
      selectConversation(),

    memory:
      selectMemory(),

    tools:
      selectTools(),

    workspace:
      selectWorkspace()

   }

 }

}
```


但是工业级：

更像：

```text
Context Builder

        |
        |
+-------+---------+
|       |         |
v       v         v

Conversation  Memory  Workspace

Selector      Selector Selector

        |
        v

Compression

        |
        v

Token Budget

        |
        v

Provider Adapter

        |
        v

Messages
```

---

# 第六部分：本节重点理解

这一节最重要的几个升级：

## 升级 1

错误：

> Context 就是聊天记录


正确：

> Context 是 Runtime State 面向 LLM 的一次 Projection


---

## 升级 2

错误：

> Prompt 是 Agent 核心


正确：

> Prompt 是 Context Builder 的产物


---

## 升级 3

错误：

> LLM 决定知道什么


正确：

> Runtime 决定 LLM 能看到什么


---

## 升级 4

错误：

> Memory 是给 LLM 加历史记录


正确：

> Memory 是 Context Builder 可选择投影的一种长期 State


---

# 本节学习路线

接下来我们会按照这个顺序展开：

```
Day04 Part C

01.
为什么 Runtime State 不能直接给 LLM


02.
Projection 是什么


03.
Context Builder Architecture


04.
Context Selection


05.
Conversation Selection


06.
Memory Selection


07.
Workspace Context


08.
Tool Context


09.
Token Budget Management


10.
Context Compression


11.
Prompt Assembly


12.
Provider Messages


13.
Context Builder 与 Provider Adapter 边界


14.
工业级 Context Pipeline
```

---

开始前，我先确认一下学习节奏：

Part B-02 其实已经把 **Runtime State → Lifecycle → Persistence → Recovery** 这一层讲完整了。fileciteturn0file1

Part C 会进入 Agent Runtime 最有价值、也是最接近真实产品实现的一层：

> **Runtime 如何控制 LLM 的认知边界。**

我们下一条直接进入：

# Day04 Part C-01：为什么 Runtime State 不能直接发送给 LLM？ —— Context Projection 的诞生

开始学习。

### 3. User (2026-07-21 14:42:12)

开始学习。

### 4. Assistant (2026-07-21 14:42:14)

# Day04 Part C-01：为什么 Runtime State 不能直接发送给 LLM？

## —— Context Projection 的诞生

我们进入 Day04 Part C。

前面两节我们建立了两个非常重要的认知：

---

Part A：

> Prompt 不是 Context。

---

Part B-01：

> Context 来自 Runtime State 的 Projection。

---

Part B-02：

> Runtime State 有自己的生命周期，会创建、恢复、演化、持久化。

---

现在进入真正连接 Runtime 和 LLM 的桥梁：

```text
Runtime State
      |
      v
Context Builder
      |
      v
Context
      |
      v
Provider Messages
      |
      v
LLM
```

今天我们只解决一个问题：

> 为什么 Runtime State 不能直接给 LLM？

这个问题看似简单，但它决定了 Agent Runtime 和普通 Chat API 调用之间的本质区别。

---

# 1. 最直觉的错误设计

很多刚开始实现 Agent 的人，会这样设计：

```ts
const runtimeState = {
  conversation,
  memory,
  workspace,
  planner,
  tools
}


llm.chat(runtimeState)
```

看起来很自然：

Runtime 已经知道所有信息。

那直接给 LLM 不就行了吗？

实际上这是错误的。

原因：

> Runtime State 是给 Runtime 自己维护世界用的，不是给 LLM 阅读用的。

---

# 2. Runtime State 是什么？

先回顾。

Runtime State：

```text
Runtime 对当前世界的完整认知
```

比如一个 Coding Agent：

```json
{
  conversation: [
    ...
  ],

  workspace: {
    files:[
      "login.ts",
      "auth.ts",
      "token.ts"
    ]
  },

  planner:{
    currentStep:3,
    steps:[
      "analyze",
      "modify",
      "test"
    ]
  },

  memory:{
    userPreference:
      "prefer TypeScript"
  },

  summary:{
    previousAnalysis:
      "auth middleware has issue"
  },

  checkpoint:{
    version:20
  }
}
```

这是 Runtime 的内部世界。

---

注意：

里面有很多东西：

```text
状态
元数据
缓存
执行信息
恢复信息
控制信息
```

这些东西：

LLM 不需要全部知道。

---

# 3. 如果直接发送，会发生什么？

假设：

```ts
llm.chat(runtimeState)
```

那么 LLM 看到：

```text
Conversation:
...

Memory:
...

Planner:
...

Checkpoint:
...

RetryCount:

CurrentTool:

TokenUsage:

InternalMetadata:

Cache:
```

问题来了。

---

## 问题 1：信息污染

LLM 会看到大量无关信息。

例如：

```json
{
 retryCount:3,
 currentProvider:"openai",
 tokenUsed:53210
}
```

这些对于推理没有价值。

但是会占 Context Window。

---

## 问题 2：泄露 Runtime 内部机制

Runtime State 里面有：

```text
内部状态
权限信息
系统配置
执行细节
```

这些不是用户世界的一部分。

例如：

```json
{
 system:
   "temperature=0.7",

 internal:
   "planner confidence=0.82"
}
```

这些属于 Runtime。

不是 Agent 要思考的世界。

---

## 问题 3：无法控制 Token

Runtime State 可能无限增长。

例如：

Conversation:

10000 条

Workspace:

5000 个文件

Memory:

1000 条

Tool History:

10000 次


但是 LLM Context Window 是有限的。

例如：

```text
128k token
```

怎么办？

必须选择。

---

## 问题 4：不同任务需要不同 Context

这是最重要的一点。

同一个 Runtime State：

可能支持不同任务。


例如：

Runtime State：

```text
Workspace:
React 项目

Memory:
用户偏好

Conversation:
历史记录
```

现在：

任务 A：

```
修复 login bug
```

需要：

```text
login.ts
auth.ts
error log
```

---

任务 B：

```
优化首页性能
```

需要：

```text
homepage
bundle
performance trace
```

---

同一个 State：

不同 Projection。


所以：

```text
Runtime State
      |
      |
      +-------- Task A
      |
      +-------- Task B
      |
      +-------- Task C
```

生成：

```text
Context A

Context B

Context C
```

---

这就是 Projection。

---

# 4. Projection 是什么意思？

Projection 这个词来自数据库和计算机科学。

简单理解：

> 从完整世界中生成某个视角。

例如：

数据库：

原始表：

```text
User Table

id
name
password
email
createdAt
```

页面只需要：

```text
name
avatar
```

于是：

```sql
select name,avatar
from user
```

这就是 Projection。


---

Agent Runtime：

完整世界：

```text
Runtime State
```

根据当前任务：

生成：

```text
Context
```

也是 Projection。

---

公式：

```text
Context = Projection(Runtime State, Policy, Goal)
```

三个输入：

---

## 1. Runtime State

当前世界：

```text
Conversation
Memory
Workspace
Planner
```

---

## 2. Policy

规则：

```text
哪些能看

哪些不能看

优先级如何

最大多少 token
```

---

## 3. Goal

当前目标：

例如：

```text
修复 bug
```

或者：

```text
设计架构
```

---

最终：

```text
Runtime State
        +
Context Policy
        +
Current Goal

            |

            v

       Context
```

---

# 5. React 类比（重点）

这是理解 Context Builder 最好的类比。


React：

```text
Application State

        |

        v

      Render

        |

        v

        DOM
```

React State：

很大：

```js
{
 user,
 cart,
 theme,
 permissions,
 cache,
 modal
}
```

但是某个组件：

```jsx
<UserProfile/>
```

只需要：

```js
user.name
user.avatar
```

React 不会：

把整个 Redux Store 塞给 DOM。

它会：

```text
State Projection
```

---

Agent：

也是：

```text
Runtime State

        |

        v

Context Builder

        |

        v

Provider Messages
```

---

所以：

> Context Builder 就像 Agent Runtime 的 Render Engine。

---

# 6. Context 不是数据，而是视图

这是今天最重要的认知。

很多人认为：

```
Context = 数据集合
```

不准确。

更准确：

```
Context = Runtime 对 LLM 的视图(View)
```

---

举例：

现实世界：

```text
一个公司
```

完整信息：

```text
员工
部门
工资
项目
财务
客户
合同
权限
历史
```

---

CEO 看到：

```text
收入
战略
风险
```

---

工程师看到：

```text
代码
Bug
架构
任务
```

---

财务看到：

```text
成本
预算
账单
```

---

公司没有变化。

变化的是：

观察视角。


Agent Runtime 也是：

```text
Runtime State
=
完整世界


Context
=
某个 Agent 当前需要看到的世界
```

---

# 7. 为什么 Context Builder 是 Runtime 的核心？

因为：

LLM 能力 ≈

```text
模型能力
+
输入质量
```

而输入质量：

由 Runtime 决定。

---

一个能力强的模型：

如果 Context 错：

结果：

```text
幻觉
错误规划
重复工作
遗漏信息
```

---

一个普通模型：

如果 Context 好：

可能表现很好。


所以：

工业 Agent 竞争：

不是简单：

```text
谁 Prompt 写得好
```

而是：

```text
谁 Context Engineering 做得好
```

---

# 8. 今天形成的新架构

以前：

```text
User
 |
 v
Prompt
 |
 v
LLM
 |
 v
Tool
```

---

现在：

```text
User
 |
 v
Runtime State
 |
 v
Context Builder
 |
 v
Provider Messages
 |
 v
LLM
 |
 v
Tool
 |
 v
Update State
```

---

真正闭环：

```text
             +----------------+
             | Runtime State |
             +----------------+
                    |
                    |
                    v
             Context Builder
                    |
                    v
             Provider Messages
                    |
                    v
                  LLM
                    |
                    v
                 Action
                    |
                    v
             Update State
                    |
                    +
```

---

# 本节核心认知升级

## 初始认知：

> Agent 把聊天记录发送给 LLM。

---

升级：

> Agent 维护 Runtime State。


---

进一步升级：

> LLM 看到的不是 Runtime State，而是 Runtime State 的 Projection。


---

最终：

> Context 是 Runtime 为 LLM 创建的一个可推理世界。

---

# 思考题

1. 为什么 Runtime State 越完整，反而不能直接发送给 LLM？

2. Context 和 Runtime State 最大区别是什么？

3. 为什么同一个 Runtime State 可以生成多个不同 Context？

4. React 的 State → Render → DOM 和 Runtime State → Context Builder → Messages 有什么对应关系？

5. 如果你实现一个最小 Agent Runtime，Context Builder 应该放在哪一层？为什么？


---

下一节：

# Day04 Part C-02：Context Builder Architecture

我们继续深入：

- Context Builder 在 Runtime 中的位置
- Context Builder 内部模块拆分
- Selector / Compressor / Token Manager
- Context Pipeline
- 为什么 Context Builder 不是 Prompt Template

这部分会开始接近真正的 Agent Runtime 源码设计。

### 5. User (2026-07-21 14:58:39)

1. 你把思考题回答了  
2. 为何是【Day04 Part C-02：Context Builder Architecture】，这不是 part c 其中的一个章节吗，为何是Part C-02

### 6. Assistant (2026-07-21 14:58:40)

你的两个问题都非常好，而且第二个问题其实涉及我们后续**学习文档结构设计**的问题，我先回答第一个。

---

# 一、Day04 Part C-01 思考题回答

---

## 1. 为什么 Runtime State 越完整，反而不能直接发送给 LLM？

因为：

> Runtime State 的目标是维护 Runtime 的真实世界，而不是作为 LLM 的输入。

完整 ≠ 有效。

---

举个例子：

Runtime State：

```ts
{
  conversation,
  memory,
  planner,
  workspace,
  checkpoint,
  tokenUsage,
  retryCount,
  providerConfig,
  executionId,
  internalMetrics
}
```

对于 Runtime 来说：

这些都很重要。

例如：

```text
retryCount
```

Runtime 需要知道：

> 这个 Tool 已经失败几次，是否重试？

但是 LLM 不一定需要。

---

如果全部发送：

```text
LLM Input:

用户需求
历史对话
代码
Memory
Checkpoint
Token Usage
Retry Count
Provider 信息
Metrics
```

会产生：

### ① Context 污染

LLM 注意力被无关信息消耗。

---

### ② Token 浪费

Context Window 是有限资源。

100k token：

如果：

```text
30k 有价值信息
70k Runtime 杂项
```

实际上浪费了模型能力。

---

### ③ 增加推理噪声

LLM 会尝试理解：

```text
retryCount=3
```

是不是一个需要处理的问题？

它不知道这是 Runtime metadata。

---

所以：

核心区别：

```text
Runtime State
=
完整世界模型


Context
=
针对当前推理任务生成的世界切片
```

---

一句话：

> Runtime State 越完整，越说明它属于 Runtime 内部，而不是属于 LLM 输入层。

---

# 2. Context 和 Runtime State 最大区别是什么？

这个是 Part C 最核心的问题。

可以从三个角度看。

---

## 角度一：职责不同

### Runtime State：

负责：

> 记录世界是什么样。


例如：

```text
用户是谁

任务做到哪里

哪些文件修改过

哪些工具执行过

有哪些记忆
```

---

### Context：

负责：

> 告诉 LLM 当前应该看到什么。


例如：

```text
当前目标

相关代码

最近错误

必要历史
```

---

## 角度二：生命周期不同

Runtime State：

生命周期：

```text
Session
Execution
Persistence
Recovery
```

可能：

小时、天、月。

---

Context：

生命周期：

```text
一次 LLM Call
```

通常：

秒级。

---

例如：

一次循环：

```text
State S1

↓

Context Builder

↓

Context

↓

LLM

↓

State S2
```

Context 用完即丢。

---

## 角度三：数量关系不同

Runtime State：

通常：

```text
1 个
```

代表当前世界。

---

Context：

可能：

```text
多个
```

因为不同任务需要不同视角。


例如：

同一个 Coding Agent：

Runtime State:

```text
React 项目
用户偏好
历史任务
代码索引
```

---

任务 A：

```text
修复登录 Bug
```

Context:

```text
login.ts
auth.ts
error log
```

---

任务 B：

```text
优化性能
```

Context:

```text
bundle
webpack config
performance trace
```

---

所以：

> Runtime State 是世界本身，Context 是观察世界的窗口。

---

# 3. 为什么同一个 Runtime State 可以生成多个 Context？

因为：

Context 取决于：

```text
Runtime State
+
Current Goal
+
Context Policy
```

公式：

```
Context =
Projection(Runtime State, Goal, Policy)
```

---

例如：

Runtime State：

```
Workspace:
  10000 files

Memory:
  用户喜欢 TS

Conversation:
  100轮


```

---

现在目标：

## Debug

Context Builder：

选择：

```
login.ts
error stack
recent changes
```

---

现在目标：

## Code Review

Context Builder：

选择：

```
git diff
changed files
coding rules
```

---

现在目标：

## 架构设计

Context Builder：

选择：

```
directory structure
dependency graph
architecture docs
```

---

所以：

Context 不是 Runtime State 的复制。

而是：

```text
Runtime State
      |
      |
      +---- Debug Context
      |
      +---- Review Context
      |
      +---- Architecture Context
```

---

# 4. React State → Render → DOM 与 Agent Runtime 的对应关系？

这是非常重要的类比。

---

React：

```text
Redux / Zustand State

        |
        v

      Render

        |
        v

       DOM
```

---

Agent：

```text
Runtime State

        |
        v

 Context Builder

        |
        v

 Provider Messages
```

---

对应关系：

| React | Agent |
|-|-|
| Application State | Runtime State |
| Render Function | Context Builder |
| DOM | Provider Messages |
| Component Props | Selected Context |
| UI 更新 | LLM 推理 |

---

关键：

React 不保存 DOM 作为唯一状态。

因为：

DOM 是 State 的表现形式。

---

Agent 也不保存 Prompt。

因为：

Prompt 是 Runtime State 的表现形式。

---

所以：

> Prompt 对 Agent 来说，就像 DOM 对 React 一样，是渲染结果，而不是核心状态。

这个认知非常重要。

---

# 5. 最小 Agent Runtime 中 Context Builder 应该放在哪一层？为什么？

答案：

应该放在：

```
Runtime Core 层
```

而不是：

```
LLM Provider 层
```

也不是：

```
Tool 层
```

---

一个合理结构：

```
Application
     |
     |
Runtime
     |
     +----------------+
     |                |
     v                v

State Manager     Context Builder

     |                |
     |                v

     |          Provider Adapter

     |
     v

Conversation
Memory
Workspace
Planner

```

---

为什么？

因为 Context Builder 依赖的是：

```text
Runtime State
```

而不是：

```text
OpenAI API
Claude API
```

---

如果放 Provider：

错误：

```
OpenAIAdapter
      |
      v
  buildPrompt()
```

问题：

换模型怎么办？

```
Claude
Gemini
Local Model
```

每个 Provider 都复制一套 Context 逻辑。

---

正确：

```
Runtime

  Context Builder

        |

 Provider Adapter

        |

 OpenAI
 Claude
 Gemini
```

---

这也是为什么：

Day03 我们讨论：

```
Provider Adapter
```

应该独立。

---

# 二、关于你的第二个问题：为什么叫 Part C-02？

你这个问题发现得非常准确。

这里确实需要修正一下命名。

之前我写：

> Day04 Part C-02：Context Builder Architecture

严格来说：

**Part C 是一个大的章节，C-01/C-02 是 Part C 内部的小节编号。**

不是新的 Part。

应该理解为：

```
Day04

Part A
  |
  +-- Prompt 不是 Context


Part B
  |
  +-- B-01 Runtime State
  |
  +-- B-02 Runtime State Lifecycle


Part C
  |
  +-- C-01 为什么 Runtime State 不能直接发送给 LLM
  |
  +-- C-02 Context Builder Architecture
  |
  +-- C-03 Context Selection
  |
  +-- C-04 Token Budget Management
  |
  +-- C-05 Context Compression
  |
  +-- C-06 Provider Messages Assembly


Part D
  |
  +-- Context Window Management


Part E
  |
  +-- Provider Adapter
```

---

所以你的理解：

> 「这不是 Part C 其中的一个章节吗？」

是正确的。

更准确命名：

```
Day04 Part C - Chapter 02
```

或者：

```
Day04-C-02 Context Builder Architecture
```

---

后续我会统一使用：

```
Day04 Part C-01
Day04 Part C-02
Day04 Part C-03
```

表示：

> Part C 下的章节编号。

不会再造成“Part 嵌套 Part”的歧义。

---

另外补充一个学习路线调整：

你现在刚进入 Context Builder，其实已经进入 Agent Runtime 设计中**最核心的一层**。

前面：

```
Runtime State
```

解决：

> Agent 知道什么

接下来：

```
Context Builder
```

解决：

> Agent 每一次思考时应该看到什么

再后面：

```
Context Window Management
```

解决：

> 当世界越来越大时，如何持续思考

这三块连起来，就是目前工业 Agent Runtime 的核心竞争力：

```
State Management
        +
Context Engineering
        +
Memory Management
```

下一节进入：

# Day04 Part C-02：Context Builder Architecture

重点会开始画真正 Runtime 内部架构：

```
Context Builder
      |
      +-- Context Selector
      |
      +-- Memory Retriever
      |
      +-- Conversation Manager
      |
      +-- Workspace Provider
      |
      +-- Token Budget Manager
      |
      +-- Compressor
      |
      +-- Message Assembler
```

这部分会明显接近 LangGraph、OpenAI Agents SDK、Claude Code 这类真实系统的设计。

### 7. User (2026-07-21 15:02:13)

你把 part c 现在命名的 c-01 -02 -xx 命名为为比如书籍的大标题 1  2  3  4  5  等，因为之前就是这样的，比如 part b-02

### 8. Assistant (2026-07-21 15:02:15)

明白，你这个调整是合理的。

我刚才把：

```text
Day04 Part C-01
Day04 Part C-02
Day04 Part C-03
...
```

这种命名方式带入了「课程拆分」视角，但是你现在的学习目标其实是：

> 最终沉淀成一本《从零实现 Agent Runtime》的书。

所以目录结构应该更接近**书籍章节结构**，而不是课程章节结构。

你之前 Day04 Part B-02 的文档就是这种形式：

```text
Day04 Part B-02：Runtime State Lifecycle

目录：

1. 为什么必须讲 Runtime State Lifecycle
2. Runtime State 是什么时候诞生的
3. Runtime State 不是从零开始，而是 Create + Restore
...
```

也就是说：

- `Day04 Part B-02` 是这一篇文章的大标题
- 里面的内容使用 `1、2、3、4...` 作为章节

而不是：

```
B-02-01
B-02-02
```

---

所以后续 Part C 我会调整为：

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

目录：

```text
1. 为什么 Runtime State 不能直接发送给 LLM

2. Context Projection 是什么

3. Context Builder 在 Runtime 中的位置

4. Context Builder Architecture

5. Context Selection：Runtime 如何选择信息

6. Conversation Context 构建

7. Memory Context 构建

8. Workspace Context 构建

9. Tool Context 构建

10. Token Budget Management

11. Context Compression

12. Prompt Assembly 与 Message Construction

13. Context Builder 与 Provider Adapter 的边界

14. 工业级 Context Pipeline

15. Part C 核心结论

16. 下一节学习计划

17. 写书 TODO

18. 写书素材

19. 本 Part 核心认知升级

20. 本章思考题
```

---

整体 Day04 会变成：

```text
Day04 Part A
Prompt 不是 Context


Day04 Part B-01
Runtime State


Day04 Part B-02
Runtime State Lifecycle


Day04 Part C
Context Builder


Day04 Part D
Context Window Management


Day04 Part E
Provider Adapter
```

---

其中：

### Part C 内部

不是：

```
Part C-01
Part C-02
```

而是：

```
章节 1
章节 2
章节 3
```

---

这个调整其实更符合我们之前定下来的写书目标：

> 学习过程 = 累积书稿素材

而不是：

> 课程视频章节编号。

---

另外我补充一下，未来所有 Day 的文档我都会遵循这个规则：

例如：

## Day05 Memory

目录：

```
1. 为什么 Agent 需要 Memory

2. Conversation Memory

3. Semantic Memory

4. Episodic Memory

5. Memory Retrieval

6. Memory Consolidation

...
```

而不会：

```
Day05 Memory-01
Day05 Memory-02
```

---

所以后续正式进入 **Day04 Part C** 时，我会按照：

> **Part 作为书籍大章节，内部使用数字章节**

这个格式推进。

你这个调整也解决了一个长期问题：后续如果真的整理成书，目录会更自然。

### 9. User (2026-07-21 15:03:04)

好的。那我们接着学习吧

### 10. Assistant (2026-07-21 15:03:06)

好的，我们继续进入：

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

## 4. Context Builder Architecture

（为什么 Runtime 需要一个专门的 Context Builder）

---

上一节我们解决了一个最基础的问题：

> 为什么 Runtime State 不能直接发送给 LLM？

核心结论：

```text
Runtime State
=
完整世界

Context
=
给 LLM 当前推理使用的世界视图
```

因此中间必须存在一个转换层：

```text
                 Runtime State
                      |
                      |
                      v
              +---------------+
              | Context       |
              | Builder       |
              +---------------+
                      |
                      |
                      v
              Provider Messages
                      |
                      |
                      v
                     LLM
```

今天我们深入：

> Context Builder 到底是什么？内部应该如何设计？

---

# 1. Context Builder 不是 Prompt Template

这是第一个需要纠正的认知。

很多人第一次实现 Agent，会设计：

```ts
function buildPrompt(){

 return `
  You are AI assistant.

  User:
  ${message}

 `

}
```

然后认为：

> 这就是 Context Builder。

实际上差距非常大。

---

Prompt Template：

解决：

> 字符串怎么拼接。


例如：

```text
System:
你是一个助手

User:
你好
```

---

Context Builder：

解决：

> 当前 Runtime 世界中，哪些信息应该进入 LLM 的认知范围。

它关注：

```text
选择什么
删除什么
压缩什么
排序什么
如何组织
```

---

所以：

Prompt Template：

```text
String Assembly
```

Context Builder：

```text
Information Orchestration
```

---

这个区别非常重要。

---

# 2. Context Builder 在 Runtime 中的位置

完整 Runtime：

```text
                         User
                           |
                           v

                  Runtime Session
                           |
                           v

                 +----------------+
                 | Runtime State |
                 +----------------+

                    |        |
                    |        |
                    v        v

            State Managers   Persistence


                    |
                    v

            +----------------+
            | Context Builder|
            +----------------+

                    |
                    v

             Provider Messages

                    |
                    v

                   LLM

                    |
                    v

                  Action

                    |
                    v

              Update State
```

注意：

Context Builder 位于：

```text
Runtime Core
```

而不是：

```text
LLM Provider
```

---

为什么？

因为：

Context 决定的是：

> Agent 当前如何理解世界。

这是 Runtime 的职责。

不是模型供应商的职责。

---

例如：

今天：

```text
OpenAI GPT-5.5
```

明天：

```text
Claude
```

后天：

```text
Gemini
```

Context 逻辑不应该变化。

变化的是：

```text
Provider Adapter
```

---

正确：

```text
Runtime

  Context Builder

        |

 Provider Adapter

        |

 OpenAI
 Claude
 Gemini
```

---

错误：

```text
OpenAI Adapter

里面:

buildPrompt()
selectMemory()
compressContext()

```

因为未来换模型，需要重写整个 Runtime。

---

# 3. Context Builder 的核心职责

一个工业级 Context Builder，可以拆成几个阶段：

```text
                 Runtime State

                       |
                       v

              Context Collection

                       |
                       v

              Context Selection

                       |
                       v

              Context Compression

                       |
                       v

              Token Management

                       |
                       v

              Message Assembly

                       |
                       v

              Provider Messages
```

我们逐个看。

---

# 4. Context Collection（信息收集）

第一步：

不是马上选择。

而是：

> 从 Runtime State 获取候选信息。

例如：

当前 State：

```ts
{
 conversation,
 memory,
 workspace,
 planner,
 tools,
 summary
}
```

Context Builder：

先收集：

```text
Conversation Context

Memory Context

Workspace Context

Planner Context

Tool Context
```

---

类似：

数据库查询。

先：

```sql
select *
```

再：

```sql
where ...
```

---

为什么不直接选择？

因为不同任务选择规则不同。

---

例如：

任务：

```text
修复 bug
```

需要：

```text
Workspace
Error
Recent Conversation
```

---

任务：

```text
解释代码
```

需要：

```text
Workspace
Code Context
```

---

任务：

```text
规划架构
```

需要：

```text
Architecture Memory
Project Structure
```

---

所以：

Collection 和 Selection 分离。

---

# 5. Context Selection（信息选择）

这是 Context Builder 最核心的能力。

问题：

Runtime State 有：

100 万信息。

LLM Context：

128k token。

怎么办？

必须选择。

---

例如：

Workspace：

```text
src/
 ├── app.ts
 ├── login.ts
 ├── auth.ts
 ├── user.ts
 ├── payment.ts
 ├── order.ts
 ...
```

用户：

```text
帮我修复登录问题
```

Context Builder：

不能发送：

```text
整个 src/
```

而应该：

选择：

```text
login.ts

auth.ts

token.ts

相关测试

错误日志
```

---

这就是：

Context Selection。

---

选择依据：

通常包括：

## 1. 当前 Goal

用户目标：

```text
修复登录
```

决定相关性。

---

## 2. 当前 Execution Step

Planner：

```text
Step 3:
Modify login.ts
```

决定当前阶段。

---

## 3. Semantic Relevance

例如：

Embedding 检索：

```
login bug
```

找到：

```
auth middleware
token service
```

---

## 4. Recency

最近发生的信息：

通常更重要。

例如：

刚刚 Tool 返回：

```text
TypeError xxx
```

优先级很高。

---

# 6. Context Builder 内部模块设计

一个比较合理的结构：

```text
ContextBuilder


        |
        |
        +----------------+
        |                |
        v                v


 Context Collector   Context Selector


        |                |
        +-------+--------+

                |

                v


        Context Compressor


                |

                v


        Token Budget Manager


                |

                v


        Message Builder


                |

                v


       Provider Messages
```

---

分别职责：

---

## Context Collector

负责：

> 从 State 中拿候选信息。

例如：

```ts
collect(state)
```

返回：

```ts
{
 conversation,
 memory,
 workspace,
 tools
}
```

---

## Context Selector

负责：

> 判断哪些重要。

例如：

```ts
select(context, goal)
```

返回：

```ts
{
 relevantFiles,
 recentMessages,
 memories
}
```

---

## Context Compressor

负责：

> 信息太多怎么办。

例如：

原：

```text
100轮聊天
```

变：

```text
Summary:
用户正在实现 Agent Runtime
已经完成 Runtime State
正在学习 Context Builder
```

---

## Token Budget Manager

负责：

> 控制不能超过模型限制。

例如：

```ts
budget = 128000
```

分配：

```text
System:
10000

Memory:
20000

Conversation:
40000

Workspace:
50000

Reserve:
8000
```

---

## Message Builder

负责：

最终转换：

```ts
Context
```

变成：

```json
[
 {
  role:"system",
  content:"..."
 },
 {
  role:"user",
  content:"..."
 }
]
```

---

# 7. 一个简单实现模型

假设我们自己实现：

```ts
class ContextBuilder {


 build(runtimeState){

    const candidates =
      this.collect(runtimeState);


    const selected =
      this.select(candidates);


    const compressed =
      this.compress(selected);


    const messages =
      this.assemble(compressed);


    return messages;

 }

}
```

---

注意：

这里没有：

```ts
callOpenAI()
```

没有：

```ts
fetch()
```

没有：

```ts
model=gpt
```

因为：

Context Builder 不关心模型。

---

# 8. 一个重要升级：Context Builder 是 Runtime 的“认知层”

现在重新理解 Agent：

以前：

```text
LLM 是大脑
```

这个理解不完整。

---

更准确：

```text
LLM
=
推理能力


Runtime
=
认知系统
```

其中：

Context Builder：

负责：

> 决定大脑看到什么。


---

类似人类：

你的大脑不是直接读取整个世界。

而是：

眼睛：

选择视觉信息。

耳朵：

选择声音。

注意力：

选择重点。

---

Context Builder：

就是 Agent 的：

```text
注意力系统
```

---

# 本节核心认知升级

## 第一层

错误：

> Context Builder 是拼 Prompt 的工具。


正确：

> Context Builder 是 Runtime 对信息进行组织和投影的核心模块。


---

## 第二层

错误：

> LLM 决定它需要什么信息。


正确：

> Runtime 决定 LLM 能看到什么信息。


---

## 第三层

错误：

> Agent 能力主要来自模型大小。


正确：

> Agent 能力 = 模型推理能力 + Runtime Context Engineering。


---

# 思考题

1. 为什么 Context Builder 不应该放在 Provider Adapter 里面？

2. 为什么 Context Collection 和 Context Selection 要拆开？

3. 如果一个 Agent 没有 Context Selection，会出现什么问题？

4. Context Builder 为什么类似 React 的 Render？

5. 一个 Coding Agent 修复 Bug 时，为什么不能把整个代码仓库发送给 LLM？


---

下一节：

# Day04 Part C 第 5 节：Context Selection —— Runtime 如何决定 LLM 应该看到什么

这一节会深入：

- 相关性选择
- Semantic Retrieval
- Recency
- Goal Driven Context
- Planner Driven Context
- 为什么 Context Selection 是 Agent 智能的重要来源

这一节开始，会逐渐进入 Cursor、Claude Code 这类 Coding Agent 背后的核心设计。

### 11. User (2026-07-21 15:07:19)

不是应该讲解 2. Context Projection 是什么，为何直接跳到第四章了哇？

### 12. Assistant (2026-07-21 15:07:31)

你指出得非常对，这里是我的推进顺序出了问题。

按照我们刚刚确认的**书籍章节结构**，Part C 的目录应该是：

```text
Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

1. 为什么 Runtime State 不能直接发送给 LLM

2. Context Projection 是什么

3. Context Builder 在 Runtime 中的位置

4. Context Builder Architecture

5. Context Selection：Runtime 如何决定 LLM 看到什么

...
```

我们刚刚已经完成的是：

✅ **第 1 章：为什么 Runtime State 不能直接发送给 LLM**

而我上一条直接进入了：

> 第 4 章：Context Builder Architecture

中间跳过了：

> 第 2 章：Context Projection 是什么

这是不应该的。

---

原因是：

第 2 章其实是整个 Part C 的**理论核心**。

如果跳过 Projection，直接讲 Architecture，会变成：

> 我们知道有个 Context Builder，它里面有 Selector、Compressor、Token Manager。

但是不知道：

> 为什么 Runtime State 和 Context 之间一定存在 Projection 这一层？

这会缺少最关键的抽象。

---

我们修正学习路线：

```text
Day04 Part C

1. 为什么 Runtime State 不能直接发送给 LLM ✅

2. Context Projection 是什么  ← 当前开始

3. Context Builder 在 Runtime 中的位置

4. Context Builder Architecture

5. Context Selection

6. Conversation Context

7. Memory Context

8. Workspace Context

9. Tool Context

10. Token Budget Management

11. Context Compression

12. Message Assembly

13. Context Builder 与 Provider Adapter 边界

14. 工业级 Context Pipeline
```

---

# Day04 Part C 第 2 章：Context Projection 是什么？

## —— Runtime 如何把“真实世界”转换成“LLM 可理解的世界”

---

上一章我们得到一个结论：

```text
Runtime State ≠ Context
```

因为：

Runtime State：

> Runtime 对世界的完整认知。

Context：

> 当前一次 LLM 推理需要看到的世界。

那么中间缺少什么？

答案：

```text
Projection
```

---

# 1. 什么是 Projection？

Projection 翻译：

> 投影

但是这里不是数学里面的几何投影。

在软件架构里：

Projection 表示：

> 从一个完整数据模型中，根据某种规则生成另一个视图模型。

---

最经典的例子：

数据库。

假设用户表：

```sql
User

id
name
email
password
phone
address
createdAt
updatedAt
```

完整 User：

```text
{
 id,
 name,
 email,
 password,
 phone,
 address,
 createdAt,
 updatedAt
}
```

但是前端个人主页：

只需要：

```json
{
 name,
 avatar
}
```

于是：

```text
User Entity

      |

      v

User Profile View
```

这个过程就是 Projection。

---

# 2. Agent Runtime 中的 Projection

对应：

完整世界：

```text
Runtime State
```

生成：

```text
Context
```

也就是：

```text
Runtime State

       |
       |
       v

 Context Projection

       |
       |
       v

 Context
```

---

公式：

```text
Context = Projection(Runtime State)
```

但是工业级还需要两个因素：

```text
Context =
Projection(
    Runtime State,
    Current Goal,
    Context Policy
)
```

---

为什么？

因为 Context 不是固定的。

---

# 3. 同一个 Runtime State，不同 Projection

这是 Projection 最重要的性质。

假设：

Runtime State：

```text
{
 Workspace:
   React Project

 Conversation:
   100 messages

 Memory:
   User prefers TypeScript

 Planner:
   Current task
}
```

---

现在用户说：

## 任务 1：

> 修复登录 Bug


Projection：

选择：

```text
login.ts

auth.ts

error stack

recent changes
```

生成：

```text
Debug Context
```

---

用户又说：

## 任务 2：

> 设计项目架构


还是同一个 Runtime State。

但是 Projection：

选择：

```text
directory structure

dependencies

architecture docs

module boundaries
```

生成：

```text
Architecture Context
```

---

所以：

不是：

```text
Runtime State
        |
        v
固定 Context
```

而是：

```text
                 Goal A
                   |
                   v
Runtime State ---> Projection ---> Context A


                 Goal B
                   |
                   v
Runtime State ---> Projection ---> Context B
```

---

# 4. Projection 是一种“视角转换”

这个概念非常重要。

我们可以把 Runtime State 看成：

> Agent 世界数据库。


例如：

一个 IDE Agent：

完整 Runtime State：

```text
项目

代码

Git 状态

用户习惯

历史对话

工具执行记录

任务计划

错误信息

权限状态
```

---

但是：

LLM 不需要看到整个世界。

它需要：

当前任务相关的世界。


类似：

现实世界：

```text
地球
```

不同观察者：

科学家：

```text
天气
气候
地质
```

游客：

```text
景点
交通
住宿
```

工程师：

```text
基础设施
能源
网络
```

---

地球没有变化。

变化的是：

观察视角。

---

Agent：

Runtime State 没变化。

变化的是：

Projection。

---

# 5. Projection 为什么必须存在？

三个原因。

---

## 原因 1：解耦 Runtime 和 LLM

如果没有 Projection：

```text
Runtime State
        |
        v
LLM
```

Runtime 数据结构必须适配模型。

例如：

OpenAI 要一种格式。

Claude 要一种格式。

未来模型又一种格式。


Runtime 被模型绑架。

---

有 Projection：

```text
Runtime State

      |

Projection Layer

      |

Model Context
```

Runtime 不关心模型。

---

## 原因 2：控制认知范围

Agent 的能力不是：

> 知道所有东西。


而是：

> 在正确的时候看到正确的信息。


---

例如：

代码 Agent：

整个仓库：

```text
10000 files
```

当前 Bug：

```text
login.ts
```

Projection：

只投影：

```text
相关文件
```

---

## 原因 3：管理 Context Window

LLM 有限制。

例如：

128k token。

但是 Runtime State：

可能：

GB 级。

所以必须：

```text
Compression

Selection

Filtering

Ranking
```

这些全部发生在 Projection 阶段。

---

# 6. Projection 和 Context Builder 的关系

这里要区分：

Projection 是：

> 思想 / 抽象。


Context Builder 是：

> 实现这个思想的工程模块。


关系：

```text
Concept:

Runtime State
        |
        v
   Projection
        |
        v
    Context


Implementation:

Runtime State
        |
        v
 Context Builder
        |
        v
 Provider Messages
```

---

所以：

Context Builder 本质上就是：

> Projection Engine。

---

# 7. React 类比（进一步深化）

React：

```text
Application State

        |

        v

     Render

        |

        v

       DOM
```

Render 就是一种 Projection。

为什么？

因为：

Redux Store：

```text
user
cart
permission
cache
settings
```

不可能全部变成 DOM。

组件：

选择：

```text
需要的数据
```

然后：

生成 UI。


---

Agent：

```text
Runtime State

        |

        v

 Context Builder

        |

        v

 Provider Messages
```

完全一样。

---

所以：

> Context Builder 就是 Agent Runtime 的 Render Function。

---

# 本章核心认知升级

最开始：

> Runtime 调 LLM。

升级：

> Runtime State 生成 Context，再调用 LLM。


进一步：

> Context 不是 Runtime State 的复制，而是 Runtime State 的 Projection。


最终：

> Agent 的智能，不只是模型拥有多少知识，而是 Runtime 如何为模型创造正确的认知环境。

---

# 思考题

1. 为什么 Context 不是 Runtime State 的子集复制，而是 Projection？

2. 为什么同一个 Runtime State 可以产生 Debug Context 和 Architecture Context？

3. Projection 和 Context Builder 是什么关系？

4. 如果没有 Projection 层，Runtime 和 LLM Provider 会产生什么耦合？

5. 为什么说 Context Builder 类似 React Render？


---

下一节：

# Day04 Part C 第 3 章：Context Builder 在 Runtime 中的位置

这一章我们会重新放回整体 Runtime 架构，回答：

- Context Builder 为什么属于 Runtime Core？
- 为什么不能属于 Provider Adapter？
- Runtime、Context Builder、Provider Adapter 三者如何分层？
- OpenAI Agents SDK / Claude Code 这类系统为什么需要类似结构？

这次按照我们确定的书籍章节顺序推进。你刚才这个提醒非常及时，否则后续文档结构会乱。

### 13. User (2026-07-21 15:12:06)

继续第三章的学习

### 14. Assistant (2026-07-21 15:12:08)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 3 章：Context Builder 在 Runtime 中的位置

上一章我们解决了：

> Context Projection 是什么？

核心结论：

```text
Runtime State
      |
      v
Projection
      |
      v
Context
```

其中：

- Runtime State = 完整世界
- Context = 当前 LLM 需要看到的世界
- Projection = 从完整世界生成当前视角

但是还留下一个工程问题：

> 这个 Projection 过程到底应该放在哪里？

也就是：

```text
Runtime
？
Context Builder
？
Provider Adapter
？
```

谁负责决定 LLM 看到什么？

这是 Agent Runtime 架构设计中非常关键的一层边界。

---

# 1. 先回顾完整 Runtime 架构

从 Day03 到现在，我们已经不断演化 Runtime。

最开始：

```text
User
 |
 v
LLM
 |
 v
Tool
```

---

Day02：

引入 Runtime Loop：

```text
User
 |
 v
Runtime Loop
 |
 +---- LLM
 |
 +---- Tool
```

---

Day03：

进一步拆分：

```text
                 Runtime

                    |
        +-----------+-----------+
        |           |           |
        v           v           v

   Coordinator   ToolRegistry  Memory

                    |
                    v

                  LLM
```

---

Day04 Part B：

加入 Runtime State：

```text
                 Runtime

                    |
                    v

              Runtime State

                    |
        +-----------+------------+
        |           |            |

 Conversation   Memory     Workspace

```

---

现在 Part C：

加入：

```text
Context Builder
```

变成：

```text
                 Runtime

                    |
                    v

              Runtime State

                    |
                    v

             Context Builder

                    |
                    v

            Provider Messages

                    |
                    v

                   LLM
```

---

# 2. Context Builder 应该属于哪一层？

答案：

> Context Builder 属于 Runtime Core。

不是：

- Provider 层
- Tool 层
- Application 层


---

完整分层：

```text
Application Layer

        |
        v


Runtime Core

        |
        +----------------+
        |                |
        v                v

 Runtime State     Context Builder


        |
        v


Provider Adapter


        |
        v


OpenAI / Claude / Gemini
```

---

为什么？

因为 Context Builder 处理的是：

> Agent 如何理解当前世界。

而不是：

> 如何调用某个模型。

---

# 3. 为什么不能放 Provider Adapter？

这是非常容易犯的架构错误。

错误设计：

```text
Runtime

   |
   v

OpenAI Adapter

   |
   +-- buildPrompt()
   |
   +-- selectMemory()
   |
   +-- compressContext()

```

看起来方便。

但是问题很大。

---

假设：

今天使用：

```text
OpenAI GPT-5.5
```

于是：

```ts
OpenAIAdapter.buildPrompt()
```

里面写：

```ts
selectConversation()

selectMemory()

selectWorkspace()
```

---

明天换：

```text
Claude
```

怎么办？

你会再写：

```ts
ClaudeAdapter.buildPrompt()

selectConversation()

selectMemory()

selectWorkspace()

```

---

后面：

```text
Gemini

Local Model

DeepSeek

Qwen
```

怎么办？

---

最后：

```text
OpenAIAdapter

ClaudeAdapter

GeminiAdapter

QwenAdapter

```

里面全部复制：

```text
Context Selection

Memory Retrieval

Token Management
```

---

架构污染：

```text
Provider
     |
     |
     +-- Runtime Logic
```

这是错误方向。

---

# 4. 正确设计：Provider 只负责协议转换

正确：

```text
              Runtime

                 |
                 v

          Context Builder

                 |
                 v

          Internal Context

                 |
                 v

        Provider Adapter

                 |
                 v

        OpenAI Messages
        Claude Messages
        Gemini Messages

```

---

也就是说：

Context Builder 输出：

```ts
{
 systemInstruction,
 messages,
 tools,
 metadata
}
```

---

Provider Adapter：

负责：

```ts
{
 convertToOpenAIFormat()
}

{
 convertToClaudeFormat()
}
```

---

例如：

Runtime 内部：

```json
{
 role:"assistant",
 content:"hello"
}
```

---

OpenAI：

```json
{
 role:"assistant",
 content:[
   {
    type:"text",
    text:"hello"
   }
 ]
}
```

---

Claude：

可能：

```json
{
 role:"assistant",
 content:"hello"
}
```

---

格式不同。

但是：

语义相同。


---

所以：

Provider Adapter：

解决：

> 怎么说。

Context Builder：

解决：

> 说什么。

---

# 5. Context Builder 为什么不能属于 Tool 层？

另一个常见错误：

有人认为：

Tool 执行后：

```text
Tool Result

↓

Context

↓

LLM
```

所以：

Context Builder 属于 Tool。

也不对。

---

原因：

Tool 只是 Runtime State 的一个来源。

例如：

Tool 返回：

```json
{
 file:"login.ts",
 error:"xxx"
}
```

它只是更新：

```text
Workspace State

Diagnostics State
```

然后：

Context Builder 决定：

是否需要放入下一轮 Context。

---

流程：

```text
Tool

 |
 v

Update Runtime State

 |
 v

Context Builder

 |
 v

LLM

```

---

Tool 不决定：

> LLM 下一步应该知道什么。

Runtime 决定。

---

# 6. Context Builder 与 Runtime State Manager 的关系

这是更加细的边界。

Runtime State：

负责：

> 保存世界。


Context Builder：

负责：

> 生成世界视图。


关系：

```text
          Runtime State

              |
              |
              v

       Context Builder

```

---

类似数据库：

数据库：

```text
User Table
Order Table
Product Table
```

负责：

保存数据。


View：

```sql
CREATE VIEW user_profile AS ...
```

负责：

提供视角。


---

Agent：

Runtime State：

数据库。


Context：

View。


Context Builder：

View Generator。


---

# 7. Context Builder 是否修改 Runtime State？

通常：

不直接修改。

这是一个重要原则：

> Context Builder 应该尽量是纯函数。

类似：

```ts
context =
buildContext(state)
```

输入：

```ts
Runtime State
```

输出：

```ts
Context
```

---

而不是：

```ts
buildContext(){

 state.memory.push()

 state.summary.update()

}

```

为什么？

因为：

Context Builder 的职责：

读取。

不是：

改变世界。

---

否则：

会出现：

```text
LLM Call

  |
  v

Context Builder

  |
  v

修改 State

  |
  v

产生新的 Context

```

状态变化不可预测。

---

正确：

```text
Action

 |
 v

Update State


 |
 v

Build Context


 |
 v

LLM

```

---

# 8. 一个最小 Runtime 设计

如果我们自己实现：

目录：

```text
runtime/

├── Runtime.ts

├── State/
│
├── Context/
│
│   ├── ContextBuilder.ts
│   ├── Selector.ts
│   ├── Compressor.ts
│
├── Provider/
│
│   ├── OpenAIProvider.ts
│
└── Tool/
```

---

调用流程：

```ts
async run(){

  const state =
      runtimeState.current();


  const context =
      contextBuilder.build(state);


  const messages =
      provider.format(context);


  const response =
      provider.call(messages);


  state.update(response);

}

```

---

注意顺序：

```text
State

↓

Context

↓

Messages

↓

LLM

↓

State Update

```

形成闭环。

---

# 9. 一个非常重要的认知升级

以前：

我们认为：

```text
LLM 是 Agent 的核心
```

---

现在：

更准确：

```text
Runtime State
       |
       |
Context Builder
       |
       |
LLM
```

---

LLM 负责：

> 推理。


Context Builder 负责：

> 给推理创造输入世界。


---

如果没有 Context Builder：

LLM：

像一个很聪明的人。

但是：

你不给他资料。

不给他背景。

不给他当前任务。


他的能力发挥不出来。

---

所以：

Agent Runtime 的竞争：

不是：

```text
谁调用更强模型
```

而是：

```text
谁能创造更好的认知环境
```

---

# 本章核心认知升级

## 第一层

错误：

> Context Builder 是模型调用的一部分。


正确：

> Context Builder 是 Runtime Core 的一部分。


---

## 第二层

错误：

> Provider 决定 Context。


正确：

> Runtime 决定 Context，Provider 只负责协议适配。


---

## 第三层

错误：

> Tool 返回什么，就给 LLM 什么。


正确：

> Tool 修改 Runtime State，Context Builder 决定下一轮 LLM 看到什么。


---

## 最终认知

> Runtime State 是 Agent 的世界，Context Builder 是 Agent 的视角系统，Provider Adapter 是 Agent 与模型之间的翻译层。

---

# 思考题

1. 为什么 Context Builder 必须属于 Runtime Core？

2. 如果把 Context Builder 放到 OpenAI Adapter 中，未来会产生什么问题？

3. Tool Result 为什么不能直接进入 LLM，而必须经过 Context Builder？

4. 为什么 Context Builder 应该尽量设计成纯函数？

5. Runtime State、Context Builder、Provider Adapter 三者的职责分别是什么？

---

下一章：

# 第 4 章：Context Builder Architecture

我们正式进入内部设计：

```text
Context Builder

      |
      +-- Context Collector
      |
      +-- Context Selector
      |
      +-- Memory Retriever
      |
      +-- Compressor
      |
      +-- Token Budget Manager
      |
      +-- Message Builder
```

也就是：

> 一个工业级 Context Builder 内部到底由哪些模块组成。

### 15. User (2026-07-21 15:21:53)

开始第四章的学习

### 16. Assistant (2026-07-21 15:21:54)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 4 章：Context Builder Architecture

---

前面三章，我们完成了 Context Builder 的**思想建立**：

## 第 1 章：

为什么 Runtime State 不能直接发送给 LLM？

得到：

```text
Runtime State ≠ Context
```

---

## 第 2 章：

Context Projection 是什么？

得到：

```text
Runtime State
        |
        v
    Projection
        |
        v
     Context
```

---

## 第 3 章：

Context Builder 在 Runtime 中的位置？

得到：

```text
Runtime Core

    |
    v

Context Builder

    |
    v

Provider Adapter

    |
    v

LLM
```

---

现在进入工程设计：

> 一个真正的 Context Builder 内部应该如何组成？

---

# 1. Context Builder 不是一个函数，而是一条 Pipeline

很多简单 Agent 实现：

```ts
function buildContext(state){

  return messages;

}
```

看起来：

```text
State
 |
 v
Messages
```

但是工业级系统不会这么简单。

因为 Context 构建实际上包含多个阶段：

```text
                    Runtime State

                         |
                         v

                Context Collection

                         |
                         v

                Context Selection

                         |
                         v

                Context Ranking

                         |
                         v

                Context Compression

                         |
                         v

                Token Budget Control

                         |
                         v

                Message Assembly

                         |
                         v

                Provider Messages

                         |
                         v

                        LLM
```

---

所以：

Context Builder 本质：

> 一个负责信息加工的 Pipeline。

---

# 2. 为什么需要拆这么多模块？

因为每个阶段解决不同问题。

我们先看一个真实场景。

假设：

你正在实现一个 Coding Agent。

Runtime State：

```text
Conversation:

用户：
帮我修复登录问题


Workspace:

10000 个文件


Memory:

用户喜欢 TypeScript


Planner:

Step 2:
分析 auth


Tool Result:

npm test failed


Summary:

之前已经检查 token 流程

```

---

现在一次 LLM 调用：

问题：

到底发送什么？

---

如果直接发送：

```text
全部 Conversation

全部代码

全部 Memory

全部 Tool History

全部 Planner
```

会：

- token 爆炸
- 信息混乱
- 推理下降

---

所以需要：

```text
Runtime State

 ↓

Context Pipeline

 ↓

LLM Input
```

---

# 3. Context Builder 总体架构

一个工业级设计：

```text
                         Context Builder


                                |
                                |

        +-----------------------+----------------------+

        |                       |                      |

        v                       v                      v


 Context Collector      Context Selector       Context Policy



        |
        |
        v


 Context Retriever


        |
        |
        v


 Context Compressor


        |
        |
        v


 Token Budget Manager


        |
        |
        v


 Message Builder


        |
        |
        v


 Provider Messages

```

---

我们逐个拆。

---

# 4. Context Collector（上下文收集器）

## 职责：

> 从 Runtime State 中获取候选信息。

注意：

它不是决定最终内容。

只是：

收集。


---

例如：

Runtime State：

```ts
interface RuntimeState {

 conversation;

 memory;

 workspace;

 tools;

 planner;

 summary;

}
```

---

Collector：

```ts
class ContextCollector {

 collect(state){

   return {

     conversation:
       state.conversation,

     memories:
       state.memory,

     workspace:
       state.workspace,

     tools:
       state.tools,

     planner:
       state.planner

   }

 }

}
```

---

输出：

```text
Candidate Context

{
 conversation,
 memory,
 workspace,
 toolResult,
 planner
}
```

---

为什么单独拆 Collector？

因为：

未来 Runtime State 可能变化。

例如：

今天：

```text
Memory
```

来自：

```text
SQLite
```

未来：

```text
Vector Database
```

Collector 不影响后续流程。

---

# 5. Context Selector（上下文选择器）

这是最核心模块之一。

Collector：

解决：

> 有什么信息？

Selector：

解决：

> 哪些信息值得给 LLM？


---

例如：

Workspace：

```text
src/

login.ts

auth.ts

payment.ts

order.ts

recommend.ts

```

用户：

```
修复登录问题
```

Selector：

判断：

相关：

```text
login.ts

auth.ts
```

无关：

```text
payment.ts

recommend.ts
```

---

所以：

```text
全部信息

        |
        v

Context Selector

        |
        v

Relevant Context

```

---

Selector 通常依据：

---

## 1. Goal

当前目标。


例如：

```text
Fix login bug
```

提高：

```text
auth/*
login/*
```

权重。


---

## 2. Planner State

当前执行阶段。

例如：

Planner：

```text
Step 3:
modify login.ts
```

那么：

login.ts 权重最高。

---

## 3. Semantic Similarity

例如：

用户：

```
token 失效
```

但是代码：

```text
jwtValidator.ts
```

名字不同。

怎么办？

需要：

Embedding / Retrieval。

---

## 4. Recency

最近产生的信息。

例如：

刚刚 Tool：

```text
Error:

Token expired
```

优先级很高。

---

所以 Selector 本质：

> 一个 Context Ranking 系统。

---

# 6. Context Policy（上下文策略）

这是很多初学实现遗漏的地方。

Context Builder 不能自己随便决定。

需要规则。


例如：

```ts
const policy = {

 maxTokens:120000,


 conversation:{
    keepRecent:20
 },


 memory:{
    maxItems:10
 },


 workspace:{
    maxFiles:30
 }

}
```

---

为什么需要 Policy？

因为不同 Agent：

规则不同。

---

例如：

聊天 Agent：

重点：

```text
Conversation
Memory
```

---

Coding Agent：

重点：

```text
Workspace
Tool Result
Error
```

---

Research Agent：

重点：

```text
Documents
Sources
Notes
```

---

所以：

Context Builder：

应该：

```text
Builder + Policy
```

而不是：

硬编码。

---

# 7. Context Retriever（上下文检索）

当数据规模变大：

不能：

```ts
state.workspace.files
```

全部遍历。


需要：

检索。

---

例如：

代码库：

100000 文件。


用户：

```
修改支付流程
```

怎么办？


Retriever：

查询：

```text
payment
checkout
order
transaction
```

相关内容。

---

典型技术：

## Vector Search

```text
query embedding

        |

        v

vector database

        |

        v

similar documents
```

---

## Keyword Search

例如：

grep：

```bash
grep payment
```

---

## Hybrid Search

组合：

```text
Semantic Search

+

Keyword Search

```

---

这也是 Cursor、Claude Code 等 Coding Agent 的核心能力之一。

---

# 8. Context Compressor（上下文压缩）

选择后：

仍然可能过大。


例如：

历史：

1000 条消息。


压缩：

```text
Before:


User:
...

Assistant:
...

...


After:


Summary:

用户正在开发 Agent Runtime

已完成 Runtime State

正在学习 Context Builder

```

---

压缩方式：

---

## Summary Compression

让 LLM 总结。

---

## Structured Compression

例如：

原：

```text
100 条日志
```

变：

```json
{
 errors:3,
 warnings:10,
 rootCause:"xxx"
}
```

---

## Sliding Window

保留：

最近 N 条。

---

# 9. Token Budget Manager

这是生产系统必须有的模块。


假设：

模型：

```text
128k Context
```

分配：

```text
System Prompt

10000


Conversation

30000


Memory

20000


Workspace

50000


Reserve

18000

```

---

为什么 Reserve？

因为：

LLM 输出也需要空间。


如果：

输入：

128k

输出：

没空间。


---

所以：

Token Budget Manager：

负责：

```text
输入预算
+
输出预算
```

---

# 10. Message Builder

最后：

把内部 Context：

转换成：

Provider Messages。


例如：

内部：

```ts
{
 systemContext,
 userContext,
 toolContext
}
```

---

转换：

OpenAI：

```json
[
 {
  role:"system",
  content:"..."
 },
 {
  role:"user",
  content:"..."
 }
]
```

---

Claude：

可能：

```json
{
 system:"...",
 messages:[]
}
```

---

这个阶段：

属于：

Context Builder 的最后一步。

---

# 11. 完整 Pipeline

最终：

```text
                 Runtime State


                       |

                       v


              Context Collector


                       |

                       v


              Context Selector


                       |

                       v


              Context Retriever


                       |

                       v


              Context Compressor


                       |

                       v


              Token Budget Manager


                       |

                       v


              Message Builder


                       |

                       v


             Provider Adapter


                       |

                       v


                      LLM

```

---

# 12. 对应我们之前学习的 Runtime Loop

现在完整闭环：

```text
                 Runtime State

                      |
                      |
                      v

              Context Builder

                      |
                      |
                      v

                     LLM

                      |
                      |
                      v

                  Tool Call

                      |
                      |
                      v

              Update Runtime State

                      |
                      |
                      +------------

```

---

这时候 Agent 才真正成立。

---

# 本章核心认知升级

## 第一层

错误：

> Context Builder 就是拼 Prompt。

正确：

> Context Builder 是 Runtime 的信息加工 Pipeline。

---

## 第二层

错误：

> 所有 State 都应该给 LLM。

正确：

> Context Builder 决定 LLM 当前应该看到什么。

---

## 第三层

错误：

> Agent 智能来自模型。

正确：

> Agent 智能 = 模型能力 + Context Engineering。

---

## 最终认知：

> Context Builder 是 Agent Runtime 的认知操作系统，它负责把 Runtime State 这个完整世界，转换成 LLM 当前可以理解和推理的世界。

---

# 思考题

1. 为什么 Context Builder 必须拆成多个阶段，而不是一个 buildContext() 函数？

2. Context Collector 和 Context Selector 最大区别是什么？

3. 为什么 Context Selection 是 Agent 智能的重要来源？

4. 为什么 Token Budget Manager 必须存在？

5. 如果没有 Context Compressor，长期运行 Agent 会发生什么？

---

下一章：

# 第 5 章：Context Selection —— Runtime 如何决定 LLM 看到什么

这一章会深入最核心部分：

- Context 选择算法
- Goal Driven Selection
- Planner Driven Selection
- Retrieval
- Ranking
- 为什么“选择什么信息”比“模型多大”更重要

这一章会开始非常接近 Cursor / Claude Code / OpenAI Agents SDK 的真实设计。

### 17. User (2026-07-21 15:42:29)

继续第 5 章的学习

### 18. Assistant (2026-07-21 15:42:31)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 5 章：Context Selection —— Runtime 如何决定 LLM 看到什么

---

前面几章我们建立了 Context Builder 的整体认知：

## 第 1 章：

Runtime State 不能直接发送给 LLM。

因为：

```text id="m7r9yq"
Runtime State
=
完整世界


Context
=
当前推理需要看到的世界
```

---

## 第 2 章：

Context 是 Runtime State 的 Projection。

即：

```text id="l2f7xk"
Runtime State

      |
      v

 Projection

      |
      v

 Context
```

---

## 第 3 章：

Context Builder 属于 Runtime Core。

不是：

```text id="v4hz1n"
Provider Adapter
```

而是：

```text id="s8n3d2"
Runtime

 |
 v

Context Builder

 |
 v

LLM
```

---

## 第 4 章：

Context Builder 是一个 Pipeline：

```text id="a1n4fz"
Collect

↓

Select

↓

Retrieve

↓

Compress

↓

Budget

↓

Assemble
```

---

今天进入整个 Pipeline 中最关键的一环：

# Context Selection

也就是：

> Runtime 如何决定哪些信息值得让 LLM 看到？

---

# 1. 为什么 Context Selection 是 Agent 的核心能力？

先看一个事实：

现在的大模型：

Context Window 已经很大。

例如：

几十万 token。

很多人会产生一个想法：

> 既然 Context 越来越大，那是不是不用选择了？全部塞进去？

答案：

不是。

原因：

## Context Window ≠ 无限认知能力

---

举一个人类例子。

一个工程师：

拥有：

```text id="6l8m0n"
10 年代码经验

100 个项目经验

10000 篇技术文章记忆
```

这些就是他的：

```text id="p0d7qk"
Human Runtime State
```

---

但是现在让他解决：

> 一个登录接口 500 错误。

他不会：

把自己所有经验全部回忆一遍。

而是：

选择：

```text id="7qv3bd"
认证经验

JWT

Session

最近修改代码

错误日志
```

---

为什么？

因为：

> 有效推理依赖相关信息，而不是信息总量。

---

Agent 一样。

---

# 2. Context Selection 的本质

Context Selection：

不是：

```text id="4k8z2v"
删除一些信息
```

这么简单。


它实际上是：

> 根据当前目标，为 LLM 构建最有价值的信息集合。


公式：

```text id="d7n4xp"
Selected Context

=

f(
Runtime State,
Goal,
Task,
Policy,
Relevance
)
```

---

输入：

## Runtime State

当前所有信息。

---

## Goal

当前目标。

例如：

```text id="w8f2kq"
修复 login bug
```

---

## Task

当前步骤。

例如：

```text id="b9m3cw"
分析错误原因
```

---

## Policy

规则：

例如：

```text id="e4z7qx"
最多 50k token
最多 30 个文件
```

---

## Relevance

相关性。

---

# 3. 最简单的 Context Selection

最初级：

```ts id="c9x5nm"
function select(state){

 return state.recentMessages

}
```

例如：

只保留最近 10 条消息。


优点：

简单。


缺点：

不知道重要性。

---

例如：

100 条消息：

```text id="s2x7qv"
Message 1:
用户说：
项目使用 React


...

Message 90:
闲聊


Message 100:
修复登录 Bug
```

如果只取：

最近 10 条：

可能丢失：

```text id="f8k3sm"
项目使用 React
```

这个重要信息。

---

所以需要更智能的 Selection。

---

# 4. Selection 策略一：Goal Driven Selection（目标驱动选择）

这是 Agent 最核心的选择方式。

核心：

> 当前目标决定什么重要。


---

例如：

用户：

```
帮我修复登录失败问题
```

Runtime：

```text id="t6n9rm"
Goal:

Fix Login Error
```

---

Workspace：

```text id="u3j8cp"
src/

auth/

login.ts

payment.ts

recommend.ts

profile.ts
```

---

Selection：

计算：

```text id="v4m8qz"
login.ts
    ↑
高相关


auth/
    ↑
高相关


payment.ts
    ↓
低相关
```

---

最终：

```text id="a5k2wp"
Context:

login.ts

auth middleware

error log

recent changes
```

---

这就是：

Goal → Relevant Context。

---

# 5. Selection 策略二：Planner Driven Selection（规划驱动选择）

这个和我们 Day03 Runtime Loop 连接起来。


Runtime：

有 Planner：

```json id="9m2f7v"
{
 goal:"fix login",

 steps:[
   "analyze",
   "modify",
   "test"
 ],

 currentStep:"analyze"
}
```

---

当前：

Step:

```text id="v1n6f9"
analyze
```

需要：

```text id="x3m8qk"
code

logs

architecture
```

---

如果：

Step:

```text id="n9c2rw"
modify
```

需要：

```text id="c7q1az"
file content

edit history
```

---

如果：

Step:

```text id="p4w8yt"
test
```

需要：

```text id="g5k2nv"
test result

error output
```

---

同一个任务：

不同阶段：

Context 不同。

---

这就是：

```text id="h3m7px"
Planner State

        |

        v

Context Selection
```

---

# 6. Selection 策略三：Recency（时间新鲜度）

很多信息：

不是因为相关，而是因为最新。


例如：

Tool:

刚执行：

```text id="z7w2pd"
npm test

FAILED

Error:

Token expired
```

---

下一轮：

这个 Tool Result：

权重很高。

因为：

它代表：

> 当前世界最新状态。


---

通常：

相关性：

```text id="q9s5md"
Relevance Score

=

Semantic Score

+

Goal Score

+

Recency Score

```

---

例如：

```text id="h8v2km"
login.ts

Semantic:
0.8

Goal:
0.9

Recency:
0.2


Total:
0.75
```

---

错误日志：

```text id="x6c9qp"
Error Log

Semantic:
0.7

Goal:
0.8

Recency:
1.0


Total:
0.85
```

---

所以错误日志优先。

---

# 7. Selection 策略四：Semantic Retrieval（语义检索）

这是现代 Agent 的重要能力。

---

传统：

关键词：

```bash
grep login
```

问题：

用户：

> 登录 token 失效


代码：

```ts id="x7m1qp"
validateJwt()
```

没有：

login。

---

关键词搜索：

找不到。

---

语义检索：

把：

```
token 失效
```

转换：

Embedding：

```text id="j8r3mq"
[0.12,0.52,...]
```

代码：

```text id="s4n7vx"
validateJwt()
```

也有向量：

```text id="p2m8ck"
[0.15,0.49,...]
```

距离接近：

找到。

---

流程：

```text id="v0q5dz"
User Goal

      |

      v

Embedding

      |

      v

Vector Search

      |

      v

Relevant Context
```

---

这也是：

Cursor：

代码理解。

Claude Code：

项目搜索。

背后的核心机制之一。

---

# 8. Selection 不是单一算法，而是组合

真实 Agent：

不会：

只用一种方式。

通常：

```text id="r7p3qm"
                 Candidate Context


                        |

                        v


          +-------------+-------------+

          |             |             |

          v             v             v


      Goal Score   Semantic Score   Recency Score


          |             |             |

          +-------------+-------------+

                        |

                        v


                  Ranking


                        |

                        v


               Selected Context

```

---

类似搜索引擎：

不是：

匹配一个字段。

而是：

综合排序。

---

# 9. 一个简单实现

例如：

```ts id="p9f3kq"
function selectContext(
 candidates,
 goal
){

 return candidates
   .map(item=>({

      item,

      score:
        semantic(item,goal)
        +
        recency(item)
        +
        goalMatch(item)

   }))

   .sort(
     (a,b)=>
     b.score-a.score
   )

   .slice(0,20)

}
```

---

这就是最简单 Context Ranking。

---

# 10. Context Selection 和 Memory 的关系

这里提前连接下一部分。

很多人认为：

Memory：

就是：

```text id="w2x6nj"
保存历史
```

实际上：

Memory 最大价值：

是：

```text id="k8m2vz"
提供未来 Context Selection 的候选信息
```

---

例如：

Memory：

记录：

```text id="n4q7wb"
用户喜欢 TypeScript
```

什么时候出现？

不是每次。

而是：

当任务：

```text id="f5j9xs"
生成代码
```

时：

Context Builder 判断：

需要：

加入。

---

所以：

Memory：

不是 Context。

Memory：

是 Context 的来源之一。

---

# 11. Context Selection 的核心原则

总结：

## 原则 1

相关性 > 完整性


---

## 原则 2

当前目标决定上下文


---

## 原则 3

Context 是动态变化的


---

## 原则 4

更多信息不一定更智能


---

# 本章核心认知升级

## 第一层

错误：

> Context Selection 就是删掉多余信息。


正确：

> Context Selection 是为当前推理构造最优信息集合。


---

## 第二层

错误：

> Agent 越强，是因为知道更多。


正确：

> Agent 越强，是因为知道什么时候应该关注什么。


---

## 第三层

错误：

> Memory 保存下来以后每次都发送。


正确：

> Memory 通过 Selection，在需要时进入 Context。


---

## 最终认知：

> Context Selection 是 Agent 的注意力系统，它决定了 LLM 在每一次推理时看到怎样的世界。

---

# 思考题

1. 为什么 Context Window 增大以后，Context Selection 仍然重要？

2. Goal Driven Selection 和 Recency Selection 有什么区别？

3. 为什么 Planner State 会影响 Context Selection？

4. 为什么 Memory 不应该直接进入每一次 LLM 调用？

5. 如果实现一个 Coding Agent，你认为哪些信息应该拥有最高优先级？为什么？

---

下一章：

# 第 6 章：Conversation Context —— Runtime 如何管理历史对话

下一章我们会深入：

- 为什么 Conversation 不是简单 Message Array
- Short-term Conversation Memory
- Sliding Window
- Conversation Summary
- Message Importance Ranking
- ChatGPT / Claude / Coding Agent 如何处理长期对话

这会和你之前关心的：

> “一个长期学习会话会不会超过上下文导致幻觉？”

形成直接连接。

### 19. User (2026-07-21 16:01:44)

接着讲解第 6 章

### 20. Assistant (2026-07-21 16:01:46)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 6 章：Conversation Context —— Runtime 如何管理历史对话

---

上一章我们学习了：

> Context Selection —— Runtime 如何决定 LLM 看到什么。

核心结论：

```text id="3z1jv4"
Runtime State
       |
       |
       v

Context Selection

       |
       |
       v

Selected Context

       |
       |
       v

LLM
```

其中 Conversation 是 Context 的一个重要来源。

但是今天我们要解决一个非常容易误解的问题：

> Conversation 到底是什么？

很多人认为：

```text id="0k6g5d"
Conversation = Message Array
```

例如：

```json
[
 {
   role:"user",
   content:"你好"
 },
 {
   role:"assistant",
   content:"你好"
 }
]
```

然后认为：

> 保存聊天记录，发送给 LLM 就可以。

这个理解对于简单 Chatbot 可以。

但是对于 Agent Runtime：

远远不够。

---

# 1. Conversation 在 Agent Runtime 中是什么？

首先重新定义：

Conversation：

不是：

> 聊天记录。

而是：

> Agent 与外部世界交互产生的短期认知轨迹。

---

为什么叫：

**认知轨迹（Cognitive Trace）？**

因为 Conversation 里面记录的不只是：

用户说了什么。

还包括：

```text id="2jv0yo"
用户意图

Agent 推理过程

执行结果

环境变化

任务进展

重要决策
```

---

例如 Coding Agent：

用户：

```
帮我修复登录问题
```

Conversation：

可能包含：

```text id="x6g8o7"
User:
帮我修复登录问题


Assistant:
我先分析 auth 流程


Tool:
读取 login.ts


Tool Result:
发现 token 校验异常


Assistant:
问题来自 JWT expiration


Tool:
修改代码


Tool Result:
测试通过
```

---

这已经不是聊天。

而是：

```text id="q9m1kx"
Task Execution History
```

---

# 2. 为什么 Conversation 不能无限增长？

这是你之前问过的问题：

> 如果一直在一个 ChatGPT 会话学习，会不会超过上下文导致幻觉？

这个问题在 Agent Runtime 中就是：

> Conversation 生命周期如何管理？

---

假设：

每轮：

1000 token。

1000 轮：

```text id="y3h7cz"
1000 × 1000

=

1,000,000 token
```

但是模型 Context：

例如：

```text id="w7q2vd"
128k token
```

怎么办？


不能：

全部保留。

---

所以 Conversation 必须经过 Context Builder。

---

# 3. Conversation Context 的三个层次

工业 Agent 通常不会只有一个 Conversation。

而是分层。


## 第一层：Raw Messages（原始消息）

最底层：

完整记录。

例如：

```json id="h9z4p2"
[
 user message 1,
 assistant message 1,
 tool result 1,
 user message 2
]
```

特点：

完整。

缺点：

无限增长。

---

存储：

```text id="x2k7ma"
Database
Log
Checkpoint
```

---

## 第二层：Recent Window（近期窗口）

不是全部历史。

只保留最近：

例如：

```text id="p8q3vf"
最近 20 轮
```

原因：

近期信息通常最相关。


例如：

当前：

```text id="a7j4mz"
正在修改 login.ts
```

那么：

最近几轮：

价值最高。

---

## 第三层：Summary Memory（摘要）

更早历史：

压缩。

例如：

原：

```text id="d8m2rq"
100 条消息
```

变：

```text id="z4c8kp"
Summary:

用户正在实现 Agent Runtime

已完成:
- Runtime State
- Context Builder

当前:
学习 Conversation Context

关键设计:
Context 不等于 Message Array
```

---

所以：

Conversation Context：

通常：

```text id="k6y9pw"
                 Conversation


                     |
       +-------------+-------------+

       |                           |

       v                           v


 Recent Messages             Summary


       |

       v


 Current Context

```

---

# 4. Conversation Selection 策略

回到 Context Selection。

Conversation 不是全部进入 Context。

需要选择。


---

## 策略 1：Sliding Window（滑动窗口）

最简单。


例如：

保留最近：

20 条。


流程：

```text id="m4q8st"
Message:

1
2
3
...
100


保留:

81
82
...
100
```

---

优点：

简单。

缺点：

可能丢失重要历史。

---

例如：

第 5 条：

用户说：

```
项目必须兼容 Vue2
```

第 90 条：

用户：

```
帮我升级依赖
```

如果只保留最近：

可能忘记：

Vue2 约束。

---

所以需要更智能方式。

---

# 5. 策略 2：Importance Ranking（重要性排序）

给 Message 打分。


例如：

```ts id="c3n7vx"
MessageScore =

Goal Relevance

+

Recency

+

Importance

```

---

消息：

```
用户喜欢 TypeScript
```

可能：

长期重要。

---

消息：

```
今天天气不错
```

低重要。


---

所以：

Conversation 也需要：

Ranking。

---

# 6. 策略 3：Conversation Summary（摘要）

这是长期 Agent 必须能力。

---

例如：

100 轮对话：

压缩：

```text id="n5r8kp"
Summary:


用户正在学习 Agent Runtime。


已完成:

Day01 Agent Basics

Day02 Runtime Loop

Day03 Runtime Architecture


当前:

Day04 Context Builder


重要认知:

Runtime State != Context

Context 是 Projection
```

---

下一次 LLM：

不需要：

100 条消息。


只需要：

```text id="z2x8mc"
Summary

+

Recent Messages
```

---

这就是：

长期对话能力的基础。

---

# 7. Summary 和 Memory 的区别

这里非常重要。


很多人混淆：

Conversation Summary：

和：

Memory。


---

## Conversation Summary

描述：

> 当前任务发生过什么。


例如：

```
我们已经分析完 login bug
```

属于：

Session。


---

## Memory

描述：

> 用户长期稳定信息。


例如：

```
用户喜欢 TypeScript
```

跨 Session。


---

区别：

| | Conversation Summary | Memory |
|-|-|-|
|范围|当前任务|长期|
|生命周期|Session|长期|
|内容|发生了什么|用户是谁|
|来源|历史对话压缩|Memory 系统|

---

关系：

```text id="e8s2qy"
Conversation

      |

      +---- Summary

      |

      +---- Memory Extraction

```

---

# 8. Agent Runtime 中 Conversation State 设计

一个简单模型：

```ts id="m4y8pw"
interface ConversationState {


 messages: Message[];


 summary: string;


 metadata:{
   startedAt;
   updatedAt;
 }


}
```

---

但是工业级：

通常：

```ts id="q2v9zn"
ConversationState{


 rawMessages,


 recentMessages,


 summaries,


 topics,


 importanceScores,


 checkpoints


}
```

---

为什么？

因为：

Context Builder 需要不同视角。

---

# 9. Conversation Context Pipeline

完整流程：

```text id="x7p2mc"
Raw Conversation


        |

        v


Message Analyzer


        |

        v


Importance Ranking


        |

        +--------------+

        |              |

        v              v


Recent Window    Summary


        |              |

        +------+-------+

               |

               v


        Conversation Context


               |

               v


          LLM Context

```

---

# 10. 为什么 ChatGPT 长对话不会简单无限增长？

回到你之前的问题。

一个长期学习 Agent：

不是：

```text
第1天聊天

+

第2天聊天

+

第3天聊天

...

全部发送
```

---

真实系统：

类似：

```text id="m0z7cd"
历史消息

    |

    v

摘要

    |

    v

长期 Memory

    |

    v

当前 Context Projection

    |

    v

LLM
```

---

所以：

长期对话能力来自：

```text id="n8v3jx"
Context Management
```

不是：

简单增加 Context Window。

---

# 11. 对 Coding Agent 的特殊处理

Coding Agent 的 Conversation 更复杂。

因为包含：

```text id="s7k2qm"
User Message

Assistant Response

Tool Call

Tool Result

Code Diff

Test Result

Error Log
```

---

通常：

优先级：

```text id="p4m8xs"
Current Error

>

Latest Tool Result

>

Current Plan

>

Recent Conversation

>

Old Conversation
```

---

因为：

代码环境变化非常快。

---

# 本章核心认知升级

## 第一层

错误：

> Conversation = 聊天记录。


正确：

> Conversation = Agent 执行过程中的短期认知轨迹。

---

## 第二层

错误：

> 历史越多，Agent 越聪明。


正确：

> 有价值的信息经过选择后，才能提升推理质量。

---

## 第三层

错误：

> Memory 就是保存所有历史聊天。


正确：

> Memory、Summary、Conversation 是不同层次的信息管理机制。

---

## 最终认知：

> Conversation Context 是 Context Builder 对短期交互历史进行筛选、压缩和重组后的结果，它让 Agent 能持续理解当前任务，而不会被无限历史淹没。

---

# 思考题

1. 为什么 Conversation 不能等同于 Message Array？

2. Recent Window 和 Summary 分别解决什么问题？

3. Conversation Summary 和 Memory 最大区别是什么？

4. 为什么 Coding Agent 的 Tool Result 应该比普通聊天消息优先级更高？

5. 如果一个 Agent 运行 30 天，你认为 Conversation State 应该如何设计？

---

下一章：

# 第 7 章：Memory Context —— 长期记忆如何进入 Context Builder

下一章会进入：

- Memory 为什么不是历史聊天
- Semantic Memory
- Episodic Memory
- Memory Retrieval
- Memory 什么时候进入 Context
- 为什么 Memory 最大的问题不是存储，而是检索

这部分会和你之前学习的 Runtime State、Context Selection 完全连接起来。

### 21. User (2026-07-21 16:07:56)

接着学习第 7 章

### 22. Assistant (2026-07-21 16:07:57)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 7 章：Memory Context —— 长期记忆如何进入 Context Builder

---

上一章我们学习了：

# Conversation Context

核心解决：

> Agent 如何管理当前任务中的短期历史。

得到：

```text id="9x4r2p"
Conversation

=
短期认知轨迹
```

它包含：

- 最近消息
- Tool Result
- 当前任务过程
- Summary

---

但是还有一个问题：

假设：

今天你打开一个新的 Coding Agent。

昨天你告诉它：

> 我的项目必须兼容 Vue2，不要使用 Composition API。

今天：

你问：

> 帮我优化这个组件。


如果 Agent 完全忘记：

它可能生成：

```ts id="a6p7mk"
<script setup>

const state = ref()

</script>
```

然后破坏项目。

---

所以 Agent 需要：

> 跨任务、跨 Session 保留重要信息。

这就是：

# Memory Context

---

# 1. Memory 和 Conversation 的本质区别

这是理解 Memory 最重要的一步。

很多初学者认为：

```text id="m1k9qw"
Memory = 保存所有聊天记录
```

这是错误的。

---

如果 Memory = 全部聊天：

那么：

```text id="z4q7mx"
10000 条聊天
```

全部发送？

显然不可行。

---

真正的 Memory：

是：

> 从历史交互中提取出来的、未来可能有价值的信息。

---

公式：

```text id="v9k2wp"
Conversation

       |

       |
       v

 Memory Extraction

       |

       v

 Memory

```

---

例如：

Conversation：

```text id="h3r7qx"
User:

我的项目是 Vue2，不要升级 Vue3。


Assistant:

好的。
```

---

Memory：

不是保存：

```text id="b7q1mn"
用户说了：
我的项目是 Vue2...
```

而是：

结构化：

```json id="p5w8kc"
{
 type:"preference",

 key:"frontend_framework",

 value:"Vue2",

 importance:0.9
}
```

---

这才是 Memory。

---

# 2. Memory 在 Runtime State 中的位置

回顾 Runtime State：

```text id="d2k8mv"
Runtime State


├── Conversation State

├── Workspace State

├── Tool State

├── Planner State

└── Memory State

```

---

Memory 是 Runtime 的一个长期状态。


但是：

注意：

Memory ≠ Context。


关系：

```text id="x7m2qa"
Memory State

      |

      v

Memory Retrieval

      |

      v

Context Builder

      |

      v

LLM Context

```

---

也就是说：

Memory 不直接进入 LLM。

---

# 3. 为什么 Memory 不能全部发送？

假设：

一个 Agent 使用一年。


Memory：

```text id="w8k4nz"
10000 条记录
```

例如：

```
用户喜欢 TypeScript

用户使用 Mac

用户项目 Vue2

用户喜欢函数式设计

用户曾经修复过登录 Bug

用户去年研究过 Kubernetes

...
```

---

当前任务：

用户：

> 修改登录组件。


需要：

```text id="q5m7cx"
Vue2 约束

代码规范

项目架构偏好
```

---

不需要：

```text id="z1p8km"
用户去年 Kubernetes 学习记录
```

---

所以：

Memory 最大的问题不是：

> 如何保存。

而是：

> 如何检索正确 Memory。

---

# 4. Memory Retrieval（记忆检索）

Memory Context 的核心：

不是 Memory Storage。

而是：

Retrieval。


流程：

```text id="n8c4wy"
Current Goal


      |

      v


Memory Query


      |

      v


Memory Retrieval


      |

      v


Relevant Memory


      |

      v


Context Builder


      |

      v


LLM
```

---

例如：

当前任务：

```text id="p6w2mj"
优化 Vue 组件
```

Memory：

```text id="t7q3xn"
[
 用户喜欢 TypeScript,

 用户项目 Vue2,

 用户关注性能,

 用户学习过 Kubernetes

]
```

---

Retrieval：

返回：

```text id="m4r8zp"
[
 用户项目 Vue2,

 用户喜欢 TypeScript

]
```

---

# 5. Memory Retrieval 的几种方式

## 方式一：关键词匹配

最简单：

例如：

Query:

```text id="h8n3vc"
Vue component optimization
```

搜索：

```text id="j4q9mk"
Vue

component

optimization
```

---

优点：

简单。

缺点：

理解能力弱。

---

例如：

用户：

> 登录状态失效


Memory：

```text id="y7m2qp"
JWT Token 过期问题
```

关键词：

可能匹配不到。

---

# 6. 方式二：Semantic Retrieval（语义检索）

现代 Agent 常用。


流程：

Memory：

```text id="v3n8mx"
用户项目使用 Vue2
```

转换：

Embedding：

```text id="k6p9qw"
[0.21,0.53,...]
```

---

当前 Query：

```text id="s5m8zn"
组件优化
```

Embedding：

```text id="r2q7vk"
[0.23,0.49,...]
```

---

计算相似度：

找到：

```text id="m9x4wp"
Vue2 项目约束
```

---

所以：

不依赖关键词。

---

# 7. 方式三：Hybrid Retrieval

工业系统通常：

组合：

```text id="c7p4mv"
Keyword

+

Semantic

+

Importance

+

Recency

```

---

例如：

Memory Score：

```text id="z8n2qs"
Score =

Semantic Similarity

+

Importance

+

Last Used Time

```

---

最终：

排序。

---

# 8. Memory 的分类

现在进入 Agent Memory 设计。

通常分：

## 1. Semantic Memory（语义记忆）

保存：

> 稳定知识和偏好。

例如：

```text id="q9w4mp"
用户喜欢 TypeScript

项目使用 Vue2

代码风格偏函数式
```

---

特点：

长期。

---

## 2. Episodic Memory（事件记忆）

保存：

> 发生过的重要事件。


例如：

```text id="h5m8vx"
2026-07-20

修复登录 Bug

原因：

JWT refresh 逻辑错误

方案：

修改 auth middleware
```

---

类似：

人的经历。

---

## 3. Procedural Memory（过程记忆）

保存：

> 如何做事情。

例如：

```text id="n6k3qy"
部署流程：

1. npm build

2. 上传 OSS

3. 更新 CDN
```

---

类似：

技能。

---

# 9. Memory 如何进入 Context Builder？

完整流程：

```text id="r5q8km"

                Memory Store


                     |

                     v


              Memory Retriever


                     |

                     v


             Relevant Memories


                     |

                     v


              Context Builder


                     |

                     v


              LLM Context

```

---

注意：

Memory Retriever 是 Context Builder 的一个输入源。

类似：

```text id="w7m3pz"
Conversation

       |

Memory

       |

Workspace

       |

Tools

       |

Planner

       |

       v

Context Builder

```

---

# 10. Memory 和 Context Selection 的关系

这是本章最重要的连接。


Memory：

提供候选信息。


Selection：

决定是否进入 Context。


---

例如：

Memory：

```text id="x8m4qz"
用户喜欢 TypeScript
```

---

当前任务：

```text id="p3k7wv"
写 React 组件
```

Selection：

加入。


---

当前任务：

```text id="d9m5cx"
解释数据库索引
```

Selection：

忽略。


---

所以：

Memory：

不是：

```text id="m7q2vn"
自动注入
```

而是：

```text id="c8w4kp"
候选信息
```

---

# 11. Memory 系统最难的问题

很多人认为：

Memory 难：

因为：

> 存储复杂。

其实不是。

真正难：

## 问题 1：什么时候保存？

例如：

用户说：

> 今天真热。

需要保存吗？

不需要。

---

用户说：

> 我的项目永远不能使用 Vue3。

需要保存。

---

所以：

Memory Creation 是难点。

---

## 问题 2：保存什么形式？

原文：

不好。


应该：

结构化：

```json id="m2x8cq"
{
 category:"constraint",

 subject:"project",

 value:"Vue2 only"
}
```

---

## 问题 3：什么时候召回？

Memory 太多：

会污染 Context。

---

所以：

Retrieval 是核心。

---

# 12. Memory 与 ChatGPT 长期记忆的关系

你之前问：

> ChatGPT 是否会一直记住所有聊天？

这里可以理解。

真正的系统：

不是：

```text id="y4n8qx"
全部聊天记录

↓

LLM
```

而是：

```text id="q2m7vc"
历史交互

↓

Memory Extraction

↓

Memory Store

↓

Retrieval

↓

Context Builder

↓

LLM

```

---

这就是 Agent Memory。

---

# 13. 对我们正在学习 Agent Runtime 的映射

你的学习场景：

如果未来做一个 Agent：

Runtime State：

```text id="s8k3mq"
{
 conversation,

 memory,

 workspace,

 planner
}
```

Memory：

可以保存：

```text id="f6p9vx"
用户学习目标：

深入理解 Agent Runtime


技术背景：

前端工程师


学习方式：

喜欢架构推演
```

---

但是：

下一次：

询问：

> React 性能优化

不应该注入：

Agent Runtime 学习背景。

---

Context Builder 决定。

---

# 本章核心认知升级

## 第一层

错误：

> Memory = 历史聊天记录。


正确：

> Memory = 从历史交互中提取的长期有价值信息。


---

## 第二层

错误：

> Memory 保存越多越好。


正确：

> Memory 的价值来自正确检索，而不是数量。


---

## 第三层

错误：

> Memory 自动进入 Context。


正确：

> Memory 是 Context Builder 的候选输入，需要经过 Retrieval 和 Selection。


---

## 最终认知：

> Memory 是 Agent 的长期认知资产，而 Context Builder 是决定这些资产何时进入当前思考过程的认知调度系统。

---

# 思考题

1. 为什么 Memory 不等于 Conversation？

2. 为什么 Memory 最大的问题不是存储，而是 Retrieval？

3. Semantic Memory 和 Episodic Memory 有什么区别？

4. 为什么 Memory 不能直接注入每一次 LLM 调用？

5. 一个 Coding Agent 最应该保存哪些 Memory？哪些不应该保存？

---

下一章：

# 第 8 章：Workspace Context —— Agent 如何理解外部世界（代码、文件、知识库）

下一章会进入 Coding Agent 最核心的部分：

- Workspace 为什么也是 Context 来源
- 文件如何进入 Context
- Repo Index
- Code Retrieval
- Cursor / Claude Code 如何理解整个项目
- 为什么 Coding Agent 不会把整个仓库塞给 LLM

这一章会和你之前研究的 **AI Impact Analyzer、代码分析 Agent** 直接连接。

### 23. User (2026-07-21 16:15:03)

继续第 8 章的学习

### 24. Assistant (2026-07-21 16:15:05)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 8 章：Workspace Context —— Agent 如何理解外部世界

---

上一章我们学习：

# Memory Context

核心：

> Agent 如何从过去经验中提取长期有价值的信息。

得到：

```text id="9m2p7k"
Memory

不是历史

而是：

经过提炼的长期认知资产
```

---

但是 Memory 解决的是：

> Agent 记住过去。

还有一个更大的问题：

> Agent 如何理解当前正在操作的世界？

例如：

Coding Agent：

用户：

> 帮我优化这个页面性能。

Agent 需要知道：

- 项目结构
- 文件内容
- 依赖关系
- 构建方式
- 当前代码状态

这些信息：

不属于 Memory。

也不属于 Conversation。

它们来自：

# Workspace Context

---

# 1. 什么是 Workspace？

首先定义：

Workspace：

> Agent 当前可以访问和操作的外部环境。

---

对于不同 Agent：

Workspace 不同。


## Coding Agent

Workspace：

```text id="w8k2qm"
代码仓库

文件系统

Git 状态

依赖

配置文件

测试结果
```

---

## Research Agent

Workspace：

```text id="a5m7qx"
论文

网页

PDF

数据库
```

---

## Data Agent

Workspace：

```text id="n3p8vw"
数据表

Schema

SQL

Pipeline
```

---

所以：

Workspace 是：

> Agent 观察现实世界的窗口。

---

# 2. Workspace 为什么属于 Context？

回到 Context Builder。

我们之前定义：

Context 来源：

```text id="r7m3xk"
Runtime State


├── Conversation

├── Memory

├── Workspace

├── Tool Result

└── Planner

```

---

为什么 Workspace 需要进入 Context？


因为：

LLM 本身不知道：

你的项目。

---

例如：

你问：

> 帮我修改登录逻辑。


LLM 默认不知道：

```text id="v2q8mz"
src/auth/login.ts
```

里面是什么。

---

必须提供：

```text id="p6m9kx"
Context:

login.ts 内容

auth middleware

相关配置

error log
```

---

所以：

Workspace Context：

就是：

> 把外部世界投影到 LLM 当前认知范围。

---

# 3. 为什么不能把整个 Workspace 发送给 LLM？

这是 Coding Agent 最核心的问题。

假设：

一个真实项目：

```text id="c7w2np"
project/

src/

  components/

  pages/

  services/

  utils/


node_modules/


dist/


docs/


tests/

```

文件：

10000 个。

---

直接：

```text id="v9q3mx"
全部文件

↓

LLM
```

会出现：

## 问题 1：Token 爆炸

可能：

几十 GB。

---

## 问题 2：信息稀释

LLM 看到：

```text id="m4x8pq"
payment.ts

order.ts

user.ts

login.ts

```

但是当前：

只需要：

```text id="n8k2vz"
login.ts
```

---

## 问题 3：注意力下降

这点非常重要。

更多 Context：

不一定更好。

---

所以：

Coding Agent 的核心能力：

不是：

> 读取全部代码。


而是：

> 找到当前最相关代码。

---

这回到了：

第 5 章：

Context Selection。

---

# 4. Workspace Context Pipeline

完整流程：

```text id="k6m9vp"

                 Workspace


                    |

                    v


              Workspace Index


                    |

                    v


             Retrieval Engine


                    |

                    v


            Relevant Files


                    |

                    v


            Context Builder


                    |

                    v


                  LLM

```

---

拆开看。

---

# 5. Workspace Index（工作区索引）

这是 Coding Agent 的第一步。

为什么需要 Index？


假设：

10000 文件。

每次：

```bash
find .
```

搜索：

效率很低。

---

所以提前建立：

```text id="z3p7mq"
Repository Index
```

---

类似：

搜索引擎。


Google：

不是每次：

扫描整个互联网。


而是：

提前：

```text id="x8m2qk"
网页

↓

Index

↓

Search
```

---

Coding Agent：

也是：

```text id="q7m5nv"
Code

↓

Index

↓

Retrieval
```

---

# 6. Workspace Index 包含什么？

不是简单：

文件列表。


通常包含：

---

## 1. File Metadata

例如：

```json id="j8q4mx"
{
 path:
 "src/auth/login.ts",

 size:
 2048,

 language:
 "typescript"
}
```

---

## 2. Symbol Index

代码结构。


例如：

```ts id="p6w2zn"
class AuthService

function login()

function refreshToken()

```

记录：

```text id="a8m3qw"
login

defined in:

src/auth/login.ts
```

---

## 3. Dependency Graph

依赖关系。


例如：

```text id="r4n8vx"
LoginPage

   |

   v

AuthService

   |

   v

TokenManager

```

---

## 4. Embedding Index

语义搜索。


例如：

代码：

```ts id="t7q3mw"
validateJwt()
```

向量化。


---

# 7. Workspace Retrieval

有了 Index：

Agent 才能找东西。


---

用户：

> 修复登录 token 过期问题。


Query：

```text id="q8m4pv"
token expiration bug
```

---

Retrieval：

搜索：

关键词：

```text id="z5n7qx"
token

jwt

refresh

session
```

---

语义：

找到：

```text id="m9p3kw"
jwtValidator.ts

AuthMiddleware.ts

refreshToken.ts
```

---

依赖：

找到：

```text id="x2v8mq"
LoginPage.tsx
```

---

最终：

Context：

```text id="b7k5vz"
login page

auth service

jwt validator

error log
```

---

# 8. Workspace Context 不只是代码

这是一个重要点。


很多人理解：

Workspace：

=

代码。


不完整。

---

真实 Agent：

Workspace：

包括：

## 文件

```text id="d3q7mx"
.ts

.vue

.md

.json
```

---

## Git 状态

例如：

```text id="g8m2pv"
modified files

recent commits

diff
```

---

为什么重要？


用户：

> 帮我看看这个 Bug。


刚修改的文件：

优先级更高。

---

## Runtime Environment

例如：

```text id="h7q3mz"
Node version

npm version

OS

Env variables
```

---

## Build Information

例如：

```text id="v9m4qx"
Webpack config

Vite config

package.json
```

---

这些都是：

Workspace Context。

---

# 9. Workspace Context 和 Tool Result 的关系

一个关键流程：

很多人误解：

Tool Result：

直接给 LLM。


例如：

Tool：

```text id="f5k8mq"
readFile(login.ts)
```

返回：

```text id="n3p7vx"
文件内容
```

然后：

LLM。


实际上：

应该：

```text id="z7m2pq"
Tool

 |

 v

Runtime State Update


 |

 v

Context Builder


 |

 v

LLM

```

---

为什么？


因为：

Tool Result 只是：

新产生的信息。


Context Builder 决定：

是否：

- 保留
- 压缩
- 和其他 Context 合并

---

# 10. Workspace Context Selection

回到第五章。

Workspace 选择通常依据：

---

## 1. User Intent

用户：

> 修改登录。


相关：

```text id="p8n4mq"
auth

login

token
```

---

## 2. Code Dependency

例如：

login.ts:

依赖：

```text id="x3m8vp"
AuthService
```

自动加入。

---

## 3. Recent Change

Git：

最近修改：

```text id="k7q2mw"
login.ts
```

提高权重。

---

## 4. Semantic Similarity

用户：

> 用户认证失败


找到：

```text id="m8p3vq"
authorization middleware
```

---

# 11. Cursor / Claude Code 背后的核心思想

你之前研究过：

- Cursor
- Claude Code
- AI Impact Analyzer


它们核心区别：

不是：

```text id="z6m2qw"
调用 GPT
```

---

而是：

```text id="c8p4mv"

如何理解 Workspace


        |

        v


如何选择 Context


        |

        v


如何驱动 LLM
```

---

一个普通 Chat：

```text id="n5q7mz"
User

↓

LLM
```

---

Coding Agent：

```text id="r8m3qx"
User

↓

Runtime

↓

Workspace Understanding

↓

Context Builder

↓

LLM

↓

Tool

↓

Workspace Update

```

---

# 12. 一个简单 Workspace Context 设计

例如：

```ts id="m7p4vz"
interface WorkspaceContext {


 files: FileContext[];


 symbols: Symbol[];


 gitChanges: Diff[];


 dependencies: DependencyGraph;


}


```

---

Context Builder：

```ts id="x9q3mw"
buildWorkspaceContext(
 goal,
 workspace
){

 const files =
    retrieveRelevantFiles(
       goal
    );


 return {

    files,

    dependencies,

    gitChanges

 };

}

```

---

# 13. Workspace Context 和 Memory Context 的区别

非常重要。


| | Workspace | Memory |
|-|-|-|
|描述|当前世界|过去经验|
|生命周期|当前项目|长期|
|变化速度|快|慢|
|例子|代码文件|用户偏好|
|来源|外部环境|历史交互|

---

简单理解：

```text id="k5m8qx"
Workspace:

现在在哪里


Memory:

过去知道什么
```

---

# 本章核心认知升级

## 第一层

错误：

> Coding Agent 就是把代码发送给 LLM。


正确：

> Coding Agent 是通过 Workspace Context 让 LLM 获得当前世界的局部认知。


---

## 第二层

错误：

> 项目越大，Agent 越难。


正确：

> 项目越大，越考验 Workspace Retrieval 和 Context Selection。


---

## 第三层

错误：

> Cursor 强是因为用了更大的模型。


正确：

> Cursor 强很大程度来自 Workspace Understanding + Context Engineering。


---

## 最终认知：

> Workspace Context 是 Agent 连接现实世界的感知系统，它把无限复杂的外部环境投影成 LLM 当前能够理解和操作的有限世界。

---

# 思考题

1. 为什么 Coding Agent 不能直接发送整个代码仓库给 LLM？

2. Workspace Index 和普通文件搜索有什么区别？

3. 为什么 Symbol Index 对代码 Agent 很重要？

4. Workspace Context 和 Memory Context 最大区别是什么？

5. 如果设计一个 Vue 项目的 Coding Agent，你认为 Workspace Context 应该包含哪些信息？

---

下一章：

# 第 9 章：Tool Context —— Agent 如何理解工具执行结果

下一章会连接我们 Day03 学习的 Tool Calling：

- Tool Result 为什么不是简单字符串
- Tool Result 如何进入 Runtime State
- Tool Context 如何参与下一轮推理
- 为什么 Tool 是 Agent 的“行动反馈系统”

这也是 Runtime Loop 闭环中的最后一块 Context。

### 25. User (2026-07-21 16:20:35)

继续学习

### 26. Assistant (2026-07-21 16:20:36)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 9 章：Tool Context —— Agent 如何理解工具执行结果

---

上一章我们学习：

# Workspace Context

核心：

> Agent 如何理解当前外部世界。

我们得到：

```text id="w9a2mv"
Workspace

=
Agent 可操作环境的状态投影
```

例如：

Coding Agent：

```text id="p7m3qx"
代码

文件

Git

依赖

配置

测试结果
```

经过：

```text id="q8k4nz"
Index

↓

Retrieval

↓

Context Selection
```

最终进入 LLM。

---

但是 Agent 不只是：

> 看世界。

它还需要：

> 改变世界。

改变世界依赖：

# Tool Calling

---

于是出现一个新的 Context 来源：

# Tool Context

---

# 1. 为什么 Tool Result 也是 Context？

回顾 Runtime Loop：

我们之前学习过：

```text id="m3q8vp"
User

 |

 v

Runtime

 |

 v

LLM

 |

 v

Tool Call

 |

 v

Tool Execute

 |

 v

Tool Result

 |

 v

Runtime State Update

 |

 v

LLM
```

---

关键问题：

Tool 执行之后：

结果去哪里？

很多简单实现：

```text id="z7p2mq"
Tool Result

↓

直接发送给 LLM
```

例如：

```json id="x8m4pv"
{
 role:"tool",
 content:"file content..."
}
```

---

但是工业级 Agent：

不会这样。

为什么？

因为 Tool Result 本质上也是：

> Runtime State 的一次变化。

---

正确流程：

```text id="n5k8qx"
Tool Result


       |

       v


Runtime State


       |

       v


Context Builder


       |

       v


LLM

```

---

# 2. Tool Context 的本质

定义：

Tool Context：

> Agent 执行动作后，从环境获得的新信息，并经过 Context Builder 加工后的认知输入。

---

注意三个关键词：

## 1. Action 后产生

不是主动存在。

例如：

文件：

```text id="a7m3qx"
login.ts
```

一直存在。

但是：

执行：

```bash
npm test
```

之后：

产生：

```text id="y8p2mv"
Test Failed

Error:
Token expired
```

---

## 2. 来自外部世界

Tool：

连接：

```text id="k9q4mw"
文件系统

数据库

API

浏览器

终端
```

---

## 3. 需要加工

不是所有 Tool Result 都需要进入 LLM。

---

# 3. Tool Result ≠ Tool Context

这是非常重要的区别。


假设：

执行：

```bash
npm test
```

返回：

```text id="v4n7mq"
10000 lines output
```

---

Tool Result：

完整结果：

```text id="h7p2qx"
全部日志
```

---

Tool Context：

可能：

```text id="m8q3vz"
Test Failed

Error:

Cannot read token

Location:

auth.ts:42
```

---

中间经过：

```text id="x5n8mq"
Tool Result Processing

↓

Context Selection

↓

Compression
```

---

所以：

```text id="q3m7vx"
Tool Result

!=

Tool Context
```

---

# 4. Tool Context 在 Runtime State 中的位置

回顾：

Runtime State：

```text id="b8m2qx"
Runtime State


├── Conversation

├── Memory

├── Workspace

├── Planner

└── Tool State

```

---

Tool State：

保存：

```text id="k7p3mw"
Tool 调用历史

执行状态

结果

错误

耗时

metadata
```

---

例如：

```json id="w4n8mq"
{
 tool:"readFile",

 input:{
   path:"login.ts"
 },

 output:{
   content:"..."
 },

 status:"success",

 timestamp:"..."
}
```

---

但是：

Tool State：

不是直接 Context。

---

流程：

```text id="p9m4vx"
Tool State

       |

       v

Tool Context Builder

       |

       v

LLM Context

```

---

# 5. 为什么 Tool Context 很特殊？

因为：

它和其他 Context 来源不同。

比较：

|来源|特点|
|-|-|
|Conversation|人类表达|
|Memory|长期知识|
|Workspace|环境状态|
|Tool Result|刚发生的行动反馈|

---

Tool Context 最大特点：

## 高时效性（High Freshness）

---

例如：

LLM：

决定：

```text id="n8q3mv"
修改 login.ts
```

Tool：

执行：

```text id="x7m2pq"
读取文件
```

返回：

```text id="a5k8vz"
当前文件内容
```

这个信息：

价值极高。

---

为什么？

因为：

它代表：

> Agent 刚刚观察到的现实。

---

# 6. Tool Context 与 Agent Feedback Loop

这是 Agent 和普通 Chatbot 最大区别。


普通 Chat：

```text id="c6m9qw"
User

↓

LLM

↓

Answer
```

---

Agent：

```text id="m7p3qx"
Think

↓

Act

↓

Observe

↓

Think

↓

Act

```

其中：

Observe：

就是 Tool Context。

---

完整：

```text id="z4n8mv"

        LLM


         |

         v


       Action


         |

         v


       Tool


         |

         v


    Observation


         |

         v


       Context


         |

         v


        LLM

```

---

这里：

Observation = Tool Context 来源。

---

# 7. Tool Context 的几个类型

不同 Tool：

产生不同 Context。

---

## 类型 1：File Context

例如：

Tool：

```text id="x8m2pq"
readFile
```

结果：

```text id="q5m7nv"
login.ts 内容
```

---

Context：

```text id="p3k8mw"
代码片段

相关函数

依赖关系
```

---

## 类型 2：Execution Context

例如：

Tool：

```bash
npm test
```

结果：

```text id="m7q2vx"
failed
```

---

Context：

```text id="n8k4mq"
error

stack

affected files
```

---

## 类型 3：API Context

例如：

调用：

```text id="a6m9qw"
weather API
```

结果：

```json
{
 temperature:30
}
```

---

Context：

```text id="p8q3mv"
当前天气数据
```

---

## 类型 4：Browser Context

浏览器 Agent：

Tool：

```text id="k4m8qx"
open page
```

结果：

```text id="z7p2mv"
DOM

screenshot

network
```

---

# 8. Tool Context Selection

和 Workspace 一样：

不是所有 Tool Result 都保留。


例如：

执行：

```bash
npm install
```

输出：

```text id="q6m8pv"
5000 lines
```

---

真正重要：

```text id="h5n9mq"
Installed packages

Warnings

Errors
```

---

Selection：

依据：

---

## 1. 当前 Goal

当前：

修复 Bug。

关注：

Error。

---

## 2. Tool Type

不同 Tool：

不同重要字段。

例如：

readFile：

关注：

content。

---

npm test：

关注：

failure。

---

## 3. Recency

刚执行：

最高优先。

---

# 9. Tool Context 和 Planner 的关系

这里连接 Day03。

Planner：

负责：

```text id="r7m3qx"
下一步做什么
```

Tool：

负责：

```text id="v8n2mq"
执行动作
```

Tool Context：

负责：

```text id="x5m7qp"
告诉 Planner：

刚刚发生了什么
```

---

例如：

Planner：

Step:

```text id="k9m4vx"
Run test
```

Tool：

执行：

```bash
npm test
```

结果：

失败。

---

Tool Context：

进入：

```text id="q3n8mv"
Runtime State
```

Planner 更新：

```text id="p7m2qx"
Step:

Analyze failure
```

---

所以：

Tool Context 是：

> Agent 行动后的反馈信号。

---

# 10. 一个简单 Tool Context 设计

```ts id="w6m9qx"
interface ToolContext {


 toolName:string;


 input:any;


 result:any;


 summary:string;


 importance:number;


 timestamp:number;


}
```

---

Context Builder：

```ts id="a8q3mv"
buildToolContext(
 toolResults
){

 return toolResults
   .filter(
     r=>r.importance>0.5
   )

}
```

---

工业级会增加：

```text id="z5n8mq"
Result Summarizer

Error Extractor

Diff Analyzer

Ranking
```

---

# 11. Tool Context 与 Memory 的关系

一个非常重要的问题：

Tool Result 是否应该进入 Memory？

答案：

不一定。


例如：

今天：

```text id="m4q8vx"
npm test failed
```

通常：

不需要长期保存。


但是：

```text id="q7n3mw"
项目必须使用 Vue2
```

来自：

用户约束。

应该 Memory。

---

所以：

```text id="n8m2qx"
Tool Result

       |

       +----短期

       |
       +----可能提炼 Memory

```

---

# 12. 现在完整 Context Builder 输入

到目前：

我们已经有：

```text id="r5q8mw"
                 Runtime State


        +------------+------------+------------+

        |            |            |            |

        v            v            v            v


 Conversation   Memory   Workspace    Tool Result


        \            |            |            /

         \           |            |           /

          +----------+------------+----------+

                     |

                     v


              Context Builder


                     |

                     v


                    LLM

```

---

这就是 Agent 的认知输入系统。

---

# 本章核心认知升级

## 第一层

错误：

> Tool Result 直接发送给 LLM。


正确：

> Tool Result 需要经过 Runtime State 和 Context Builder。


---

## 第二层

错误：

> Tool 只是执行函数。


正确：

> Tool 是 Agent 感知外部世界的传感器。


---

## 第三层

错误：

> Agent 循环 = LLM 调 Tool。


正确：

> Agent 循环 = 推理 → 行动 → 观察 → 更新认知 → 再推理。


---

## 最终认知：

> Tool Context 是 Agent 与现实世界交互后的反馈信息，它让 LLM 不只是思考，而是在不断观察和修正中行动。

---

# 思考题

1. 为什么 Tool Result 不应该直接进入 LLM？

2. Tool Result 和 Tool Context 有什么区别？

3. 为什么 Tool Context 通常具有最高的新鲜度？

4. Tool Context 如何影响 Planner 下一步决策？

5. 一个 Coding Agent 执行 `npm test` 后，你认为哪些结果应该进入 Context？哪些应该被过滤？

---

下一章：

# 第 10 章：Token Budget Management —— Context Builder 如何管理有限上下文空间

下一章会进入非常工程化的部分：

- Context Window 为什么不是越大越好
- Token Budget 如何分配
- System / Memory / Conversation / Workspace 如何竞争空间
- 为什么生产 Agent 必须有 Token 管理器

这部分会直接连接你之前问的：

> “长期学习一个会话，会不会因为上下文太长导致 AI 幻觉？”

### 27. User (2026-07-21 16:25:42)

继续学习

### 28. Assistant (2026-07-21 16:25:44)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 10 章：Token Budget Management —— Context Builder 如何管理有限上下文空间

---

前面我们已经完整学习了 Context Builder 的主要输入来源：

```text
id="a9v7kx"
                 Runtime State


        +-------------+-------------+-------------+-------------+

        |             |             |             |

        v             v             v             v


 Conversation    Memory      Workspace     Tool Context


        \             |             |             /

         \            |             |            /

          +-----------+-------------+-----------+

                      |

                      v


              Context Builder


                      |

                      v


                     LLM

```

---

但是这里隐藏了一个非常现实的问题：

> 这些信息全部都想给 LLM，但是 LLM 的 Context Window 是有限的。

---

例如：

GPT-5.5：

假设 Context：

```text
128k tokens
```

但是：

你的 Agent：

```text
Conversation:

50k


Workspace:

80k


Memory:

20k


Tool Result:

30k

```

总计：

```text
180k tokens
```

怎么办？

---

这就是：

# Token Budget Management

---

# 1. Token Budget Management 是什么？

定义：

> Token Budget Management 是 Context Builder 中负责在有限 Context Window 内，对不同信息来源进行预算分配、裁剪、压缩和优先级控制的系统。

---

简单理解：

它就是：

Agent 的：

> 上下文内存管理员。

---

类似：

电脑 RAM：

```text
16GB RAM

Chrome:

8GB

IDE:

5GB

系统:

3GB

```

必须分配。

---

LLM Context：

也是：

```text
Context Window

=

有限资源
```

---

# 2. 为什么 Context Window 越大不代表越好？

这是很多人容易误解的地方。


认为：

```text
Context 越大

↓

看到更多信息

↓

更聪明
```

实际上：

不完全成立。


---

原因：

## 1. Attention 稀释

例如：

给 LLM：

100 页资料。


真正问题答案：

在第 3 页。


模型需要：

从大量信息中寻找。


---

类似：

人类：

让你阅读：

1000 页代码。

然后问：

```text
哪一行导致 Bug？
```

不一定比：

给你：

10 个相关文件。

更容易。


---

## 2. 无关信息污染

例如：

用户：

> 修复登录问题。


Context：

包含：

```text
payment.ts

order.ts

recommend.ts

old logs

unused code
```

---

这些内容：

可能干扰模型判断。


---

## 3. 成本增加

Token 越多：

API 成本越高。


---

所以：

核心原则：

> Context Engineering 不是最大化 Context，而是优化 Context。

---

# 3. Token Budget 在 Context Builder 的位置

回顾 Pipeline：

之前：

```text
id="m7x2qp"
Collector

↓

Selector

↓

Retriever

↓

Compressor

↓

Message Builder

```

现在加入：

```text
id="k5n8vz"

Collector

↓

Selection

↓

Retrieval

↓

Compression

↓

Token Budget Manager

↓

Message Builder

↓

LLM

```

---

为什么 Budget 放这里？

因为：

前面已经知道：

哪些信息重要。

现在：

决定：

放多少。


---

# 4. Token Budget 分配模型

假设：

模型：

```text
128k Context
```

不要全部给输入。

因为：

输出也需要。


例如：

```text
id="x8p4mw"
Total Context:

128k


Reserved Output:

16k


Available Input:

112k

```

---

然后：

分配：

```text
id="q7m3vz"

System Prompt

10k


Conversation

25k


Memory

15k


Workspace

50k


Tool Context

12k

```

---

最终：

```text
112k
```

---

这就是：

Budget。


---

# 5. 为什么 System Prompt 通常最高优先级？

System Prompt：

例如：

```text
You are a coding agent.

Rules:

Do not delete files.

Use TypeScript.

Follow project style.
```

---

如果被裁剪：

Agent 行为可能改变。


所以：

通常：

Priority：

```text
id="p9k3mv"

System

★★★★★


Current Goal

★★★★★


Tool Result

★★★★☆


Workspace

★★★★☆


Conversation

★★★☆☆


Old Memory

★★☆☆☆

```

---

# 6. Token Budget 不是简单截断

错误实现：

```ts
messages.slice(0,100)
```

---

为什么？

因为：

Token 不等于 Message 数量。


例如：

消息：

```text
User:

你好
```

token:

很少。


但是：

代码：

```ts
function xxx(){

...

1000 lines

}
```

token：

巨大。


---

所以需要：

Token 计算。


---

# 7. Token Counting

基本流程：

```text
id="z4m8qx"

Context Candidate


        |

        v


Token Counter


        |

        v


Token Size


        |

        v


Budget Decision

```

---

例如：

```ts
interface ContextItem {


 content:string;


 token:number;


 priority:number;


}

```

---

排序：

```text
id="m7q2vx"

priority

+

token cost

+

relevance

```

---

决定：

保留哪些。

---

# 8. Budget 策略一：Priority Based Allocation

最常见。


例如：

```text
id="n5k8mq"

Priority:

System

Goal

Current Tool Result

Current Files

Recent Conversation

Old Memory

```

---

超预算：

先删除低优先级。


---

例如：

需要减少：

30k token。


删除：

```text
Old Conversation

↓

Old Memory

↓

Low relevance files

```

---

保留：

```text
Current Error

Current Code

System Rules
```

---

# 9. Budget 策略二：Dynamic Allocation

更高级。


不是固定：

```text
Conversation 30%

Workspace 40%

```

---

而是根据任务变化。


---

例如：

Coding Agent：

当前：

Debug。


那么：

增加：

```text
Tool Result

Error Log

Code
```

---

减少：

```text
Conversation
```

---

如果：

用户：

解释架构。


增加：

```text
Conversation

Documentation
```

---

所以：

Budget：

应该动态。


---

# 10. Budget 策略三：Compression Before Removal

生产 Agent：

通常不会直接删除。

而是：

先压缩。


例如：

Conversation：

100 条。


不要：

删除。


变：

```text
Summary:

用户正在修改 auth 模块

已完成:
- 查找问题
- 定位 JWT 错误

当前:
修改 refresh token

```

---

原：

50k tokens。

压缩：

5k。


---

释放：

45k。


---

所以：

优先：

```text
Compression

↓

Deletion
```

---

# 11. Token Budget 和 Context Selection 的关系

非常重要。


很多人混淆：

Selection：

和：

Budget。


区别：


## Context Selection

回答：

> 什么信息重要？


---

## Token Budget

回答：

> 重要信息里面放多少？


---

例如：

Workspace：

找到：

100 个相关文件。


Selection：

选择：

20 个。


Budget：

发现：

20 个文件还是太大。


压缩：

5 个。


---

流程：

```text
id="v8m2qx"

Workspace

↓

Selection

↓

20 files

↓

Budget

↓

5 files + summary

```

---

# 12. 一个简单实现

```ts
class TokenBudgetManager {


 allocate(
   contexts,
   maxTokens
 ){

   const sorted =
     contexts.sort(
       (a,b)=>
       b.priority-a.priority
     );


   let total=0;

   const result=[];


   for(const item of sorted){

     if(total+item.tokens <= maxTokens){

       result.push(item);

       total+=item.tokens;

     }

   }


   return result;

 }

}
```

---

这就是最简单版本。

---

# 13. 生产级 Token Manager 会增加什么？

真实系统：

会包含：

---

## 1. Token Estimation

估算：

未来 Context 大小。


---

## 2. Priority System

不同信息权重。


---

## 3. Compression Strategy

自动摘要。


---

## 4. Overflow Handling

超限处理。


例如：

```text
Context Overflow

↓

Compress

↓

Retry

```

---

## 5. Model Awareness

不同模型：

不同 Context Window。

---

例如：

```text
GPT:

128k

Claude:

200k

Local Model:

32k
```

---

Budget 不应该写死。

---

# 14. 回答你之前关于长期学习会话的问题

你之前问：

> 如果一直在一个 ChatGPT 对话学习，会不会超出上下文导致 AI 幻觉？

现在可以从 Agent Runtime 角度理解。


不是：

```text
所有历史

↓

LLM
```

---

而是：

```text
Long Conversation


        |

        v


Summary


        |

        v


Memory


        |

        v


Relevant Recent Context


        |

        v


Token Budget


        |

        v


LLM

```

---

真正优秀的 Agent：

不是保存所有东西。

而是：

知道：

> 当前应该保留什么。

---

# 15. Context Builder 完整架构（目前为止）

到这里：

Day04 Part C 的 Context Builder：

已经完整：

```text
id="w5q8mz"

                    Runtime State


                         |

        +----------------+----------------+

        |                |                |

        v                v                v


 Conversation       Memory          Workspace


        |                |                |


        +----------------+----------------+

                         |

                         v


                  Context Selection


                         |

                         v


                  Context Retrieval


                         |

                         v


                  Context Compression


                         |

                         v


                Token Budget Manager


                         |

                         v


                  Message Builder


                         |

                         v


                         LLM

```

---

# 本章核心认知升级

## 第一层

错误：

> Context Window 越大越好。


正确：

> 有效 Context 比巨大 Context 更重要。


---

## 第二层

错误：

> Token 管理就是防止超限制。


正确：

> Token Budget Management 是决定 Agent 如何分配认知资源。


---

## 第三层

错误：

> 删除信息解决 Context Overflow。


正确：

> 优先级、压缩、选择共同解决 Context 管理问题。


---

## 最终认知：

> Token Budget Management 是 Agent 的认知资源调度系统，它决定有限 Context 空间应该给予哪些信息，让 LLM 在有限窗口内获得最高质量的输入。

---

# 思考题

1. 为什么 Context Window 增大以后，Token Budget Management 依然重要？

2. Context Selection 和 Token Budget Management 的区别是什么？

3. 为什么生产级 Agent 通常优先压缩，而不是直接删除历史？

4. 一个 Coding Agent 调试 Bug 时，你认为 Conversation、Workspace、Tool Result 应该如何分配 Token？

5. 如果 Context 超限，你设计的 Runtime 应该如何自动恢复？

---

下一章：

# 第 11 章：Message Assembly —— Context Builder 如何生成最终 LLM Input

下一章我们会完成 Context Builder 的最后一步：

- 内部 Context 如何转换为 Messages
- System / User / Assistant / Tool Message 设计
- Provider Adapter 为什么存在
- OpenAI、Claude、Gemini 消息格式差异
- 为什么 Message Layer 是 Runtime 和模型之间的边界

完成第 11 章后，Day04 Part C 的 Context Builder 主体架构就闭环了。

### 29. User (2026-07-21 16:40:35)

继续学习

### 30. Assistant (2026-07-21 16:40:37)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 11 章：Message Assembly —— Context Builder 如何生成最终 LLM Input

---

前面我们已经学习了 Context Builder 的完整加工链路：

```text id="ctx-flow-01"
Runtime State

    |
    |
    v

Context Collection

    |
    |
    v

Context Selection

    |
    |
    v

Context Retrieval

    |
    |
    v

Context Compression

    |
    |
    v

Token Budget Management

    |
    |
    v

Message Assembly

    |
    |
    v

LLM
```

---

今天进入最后一步：

# Message Assembly

也就是：

> Runtime 如何把内部世界转换成 LLM 能理解的消息格式。

---

这一章非常重要，因为它连接：

```
Runtime Architecture
        ↓
Context Engineering
        ↓
LLM API
```

---

# 1. 为什么需要 Message Assembly？

很多初学 Agent 的实现：

直接：

```ts
const messages = [
 {
   role:"user",
   content:userInput
 }
]


llm.chat(messages)
```

---

但是工业级 Agent：

LLM 看到的消息：

并不是用户原始输入。

---

中间经历：

```text id="msg-transform"

用户输入


↓

Runtime State


↓

Context Builder


↓

Message Assembly


↓

LLM Messages

```

---

例如：

用户：

> 修复登录问题


Runtime 内部：

```text id="runtime-world"

Goal:

Fix login bug


Memory:

项目使用 Vue2


Workspace:

auth/login.ts


Tool Result:

npm test failed


Plan:

Step 2 analyze error

```

---

最终给 LLM：

可能：

```json id="final-msg"

[
 {
   "role":"system",
   "content":
   "You are coding agent..."
 },

 {
   "role":"system",
   "content":
   "Project uses Vue2"
 },

 {
   "role":"user",
   "content":
   "Fix login issue"
 },

 {
   "role":"tool",
   "content":
   "Test failed at auth.ts:42"
 }
]

```

---

所以：

Message Assembly：

负责：

> 把 Context 世界翻译成 Message 世界。

---

# 2. Context 和 Message 的区别

这是一个非常重要的概念。


很多人混淆：

```
Context = Messages
```

其实不是。

---

关系：

```
Context

=
内部认知结构


Message

=
发送给 LLM 的通信格式

```

---

例如：

内部 Context：

```ts
{
 goal:{
   task:"fix login"
 },

 workspace:{
   files:[
    "login.ts"
   ]
 },

 memory:{
   framework:"Vue2"
 }

}
```

---

需要转换：

```json
[
 {
 role:"system",
 content:"Project uses Vue2"
 },

 {
 role:"user",
 content:"Fix login"
 }
]

```

---

所以：

Message 是 Context 的一种表达形式。

---

# 3. Message Assembly 的职责

一个 Message Builder 通常负责：

## 1. Message Ordering

消息顺序。

---

## 2. Role Mapping

角色转换。

---

## 3. Context Injection

注入额外上下文。

---

## 4. Format Normalization

适配不同模型格式。

---

## 5. Safety Boundary

控制哪些信息可以进入 Prompt。

---

下面逐个看。

---

# 4. Message Ordering（消息排序）

LLM 对消息顺序非常敏感。

例如：

错误：

```json
[
 {
  role:"user",
  content:"Fix bug"
 },

 {
  role:"system",
  content:"You are coding agent"
 }
]
```

---

System 放后面：

可能降低约束效果。

---

通常：

顺序：

```
System

↓

Developer Instructions

↓

Memory Context

↓

Workspace Context

↓

Conversation History

↓

Tool Results

↓

Current User Message

```

---

例如：

```json
[
{
 role:"system",
 content:"You are coding agent"
},

{
 role:"system",
 content:"Project uses Vue2"
},

{
 role:"user",
 content:"Fix login bug"
}
]

```

---

---

# 5. Role Mapping（角色映射）

不同 LLM Provider：

消息模型不同。


例如 OpenAI：

```json
{
 role:"system",
 content:"..."
}
```

---

Claude：

通常：

```json
{
 system:"..."
}


messages:[
 {
  role:"user"
 }
]

```

---

Gemini：

可能：

```text
contents

parts

```

---

所以 Runtime 不应该：

直接绑定某一家。


应该：

内部统一。

---

例如：

Runtime Message：

```ts
interface Message {


 role:
 "system"
 |
 "user"
 |
 "assistant"
 |
 "tool";


 content:string;


 metadata?:any;


}

```

---

然后：

Provider Adapter：

负责转换。

---

结构：

```
Runtime Message

        |

        v

Provider Adapter

        |

        v

OpenAI Message

Claude Message

Gemini Message

```

---

这就是：

架构隔离。

---

# 6. Context Injection（上下文注入）

Message Assembly 最重要的工作：

把 Context 放入 Message。


例如：

Memory：

```json
{
 framework:"Vue2"
}
```

---

转换：

```text
System:

Project Constraints:

- Vue2 only
- Do not use Composition API

```

---

Workspace：

```text
Relevant Files:

src/auth/login.vue

```

---

转换：

```text
Developer:

Relevant code:

```vue
...
```

```

---

注意：

不是：

所有 Context 都作为 User Message。


不同信息：

应该有不同语义。

---

# 7. 为什么 Memory 通常进入 System / Developer Message？

因为：

Memory 是：

约束。

例如：

```
用户偏好：

使用 TypeScript

```

---

如果放：

User：

```
User:
用户喜欢 TypeScript
```

模型可能认为：

这是一个普通事实。


---

如果：

System：

```
Project preference:
Use TypeScript
```

约束效果更强。

---

所以：

Context Placement 很重要。

---

# 8. Tool Message 的设计

Tool Context 有特殊角色。


例如：

调用：

```json
{
 tool:"readFile",
 input:{
   path:"login.ts"
 }
}
```

---

返回：

```json
{
 role:"tool",
 content:
 "file content..."
}
```

---

为什么不是 User？

因为：

这不是人类输入。


它是：

环境反馈。


---

Agent Loop：

实际上：

```
Assistant

↓

Tool Call

↓

Tool Result

↓

Assistant

```

---

类似：

人类：

```
我打开电脑

↓

看到报错

↓

继续思考

```

---

Tool Message：

就是：

观察结果。

---

# 9. Message Assembly 的内部设计

简单版本：

```ts
class MessageBuilder {


 build(context){


   return [

    this.buildSystem(context),

    this.buildMemory(context),

    this.buildWorkspace(context),

    ...context.messages,

    ...context.tools

   ]


 }

}

```

---

更加工程化：

```ts
class MessageAssembler {


 assemble({

 system,

 memory,

 workspace,

 conversation,

 tools

 }){


 const messages=[];


 messages.push(
   this.system(system)
 );


 messages.push(
   this.memory(memory)
 );


 messages.push(
   this.workspace(workspace)
 );


 messages.push(
   ...conversation
 );


 messages.push(
   ...tools
 );


 return messages;


 }


}

```

---

# 10. 为什么 Message Layer 必须独立？

这是架构设计重点。


错误：

```text
Runtime

直接调用

OpenAI API

```

---

问题：

未来：

换 Claude。

怎么办？

---

或者：

增加：

本地模型。


怎么办？


---

正确：

```
Runtime

↓

Context Builder

↓

Message Model

↓

Provider Adapter

↓

LLM

```

---

边界：

清晰。

---

# 11. Message Assembly 和 Prompt Engineering 的区别

很多人认为：

Agent：

就是：

Prompt。


不是。


Prompt Engineering：

关注：

```
一句话怎么写
```

---

Message Assembly：

关注：

```
如何动态生成整个输入世界
```

---

区别：

| |Prompt|Message Assembly|
|-|-|-|
|范围|文本技巧|系统架构|
|对象|一个 Prompt|完整 Context|
|动态性|低|高|
|负责者|开发者|Runtime|

---

真正 Agent：

重点：

不是写一个超级 Prompt。

而是：

动态构造正确 Context。

---

# 12. 一个完整 Agent 调用链

现在我们把 Day03 + Day04 连接起来。


用户：

```
帮我修复登录问题
```

---

Runtime：

创建：

```text
Goal
```

---

Planner：

决定：

```
Analyze login
```

---

Tool：

读取：

```
login.ts
```

---

Tool Result：

进入：

```
Runtime State
```

---

Context Builder：

执行：

```
Selection

Compression

Budget

Assembly

```

---

生成：

```json
Messages
```

---

LLM：

推理：

```
发现 JWT 问题
```

---

再次：

Tool Call。

---

这就是完整 Agent Runtime。

---

# 13. Context Builder 到这里闭环了吗？

是的。

Day04 Part C：

我们已经覆盖：

---

## 1. Context Projection

Runtime State → Context

---

## 2. Context Architecture

Context Builder Pipeline

---

## 3. Context Selection

决定看什么

---

## 4. Conversation Context

管理短期历史

---

## 5. Memory Context

管理长期知识

---

## 6. Workspace Context

理解外部世界

---

## 7. Tool Context

理解行动反馈

---

## 8. Token Budget

管理有限资源

---

## 9. Message Assembly

生成 LLM 输入

---

完整：

```text
Runtime State


      |

      v


Context Builder


      |

      v


LLM Messages


      |

      v


LLM


      |

      v


Action


      |

      v


Runtime Update

```

---

# 本章核心认知升级

## 第一层

错误：

> Context 就是 Prompt。


正确：

> Context 是 Runtime 内部世界，Message 是发送给模型的表达形式。

---

## 第二层

错误：

> Agent 只需要调用 LLM API。


正确：

> Agent Runtime 的核心价值，是在调用 API 前构造正确的认知输入。

---

## 第三层

错误：

> 最强 Agent 靠最大模型。


正确：

> 强 Agent = 好的 Runtime + Context Engineering + Model。

---

# 最终认知

> Message Assembly 是 Runtime 与 LLM 之间的翻译层，它把复杂的 Agent 世界转换成模型可以理解的消息结构，是 Context Engineering 最终落地的地方。

---

# 思考题

1. 为什么 Context 和 Message 不能混为一谈？

2. 为什么 Runtime 不应该直接绑定 OpenAI Message 格式？

3. Memory、Workspace、Tool Result 为什么应该使用不同 Message Role？

4. 为什么 Message Assembly 是 Agent Runtime 的边界层？

5. 如果你设计一个 Mini Agent Runtime，你认为 Message Builder 应该属于 Runtime Core 还是 Provider Layer？为什么？

---

下一节：

# 第 12 章：Context Builder 总结 —— 从 Runtime State 到 LLM Intelligence

这一章会进行 Day04 Part C 总结：

- Context Builder 完整架构图
- 与 Runtime Loop 的关系
- 与 Memory / Tool / Planner 的关系
- Cursor / Claude Code / OpenAI Agents SDK 映射
- 写书 TODO
- 写书素材
- 本 Part 核心认知升级

（按照我们之前约定的学习节奏，到 Part 接近结束时会自动补充这四个固定栏目。）

### 31. User (2026-07-21 16:45:28)

继续学习

### 32. Assistant (2026-07-21 16:45:30)

# Day04 Part C：Context Builder —— Runtime 如何创造 LLM 看到的世界

# 第 12 章：Context Builder 总结 —— 从 Runtime State 到 LLM Intelligence

---

经过前面 11 章，我们已经把 Context Builder 这个 Agent Runtime 的核心模块完整拆解。

现在回顾一下整个学习路径：

---

# Part C 学习路线回顾

## 第 1 章：为什么需要 Context Builder

核心：

> Runtime State ≠ Context

---

Runtime State：

代表：

```text id="runtime-state"

Agent 当前完整世界

包括：

- Conversation
- Memory
- Workspace
- Tools
- Planner
- Environment

```

---

但是 LLM 不应该看到整个世界。


需要：

```text id="projection"

Runtime State

        |

        v

Context Projection

        |

        v

LLM Context

```

---

# 第 2 章：Context Projection

核心：

> Context 是 Runtime State 面向当前任务的一次投影。


例如：

Runtime State：

```text id="full-state"

用户喜欢 TypeScript

项目使用 Vue2

去年学习 Kubernetes

当前正在修复登录 Bug

payment 模块代码

auth 模块代码

```

---

当前任务：

```text id="goal"

修复登录 Bug
```

---

Projection 后：

```text id="context"

Vue2 项目约束

auth 代码

JWT 错误日志

最近修改

```

---

这就是：

Context Engineering 的本质。

---

# 第 3 章：Context Builder 在 Runtime 中的位置

完整 Runtime：

```text id="runtime-loop"

                User


                 |

                 v


             Runtime Core


                 |

                 v


              Context Builder


                 |

                 v


                 LLM


                 |

                 v


              Tool Call


                 |

                 v


          Runtime State Update


                 |

                 +---------

```

---

所以：

Context Builder 属于：

Runtime Core。

不是：

LLM Layer。

---

# 第 4 章：Context Builder Architecture

我们学习了：

Context Builder 不是：

```ts
buildPrompt()
```

而是一条 Pipeline：

```text id="pipeline"

Runtime State


      |

      v


Context Collector


      |

      v


Context Selector


      |

      v


Context Retriever


      |

      v


Context Compressor


      |

      v


Token Budget Manager


      |

      v


Message Assembly


      |

      v


LLM

```

---

每个模块职责不同。

---

# 第 5 章：Context Selection

这是 Context Builder 最核心能力。

核心问题：

> 当前这一轮，LLM 应该看到什么？


---

选择依据：

## Goal

当前目标。


例如：

```
Fix login bug
```

---

## Planner State

当前阶段。


例如：

```
Analyze error
```

---

## Relevance

相关性。


---

## Recency

新鲜程度。


---

最终：

```text id="ranking"

Candidate Context

        |

        v

Ranking

        |

        v

Relevant Context

```

---

核心认知：

> Agent 智能，很大程度来自选择能力。

---

# 第 6 章：Conversation Context

我们解决：

> Agent 如何管理短期历史？


错误：

```
Conversation = Message Array
```

---

正确：

```
Conversation

=

短期认知轨迹

```

---

通常分：

```text id="conversation-layer"

Raw Messages

↓

Recent Window

↓

Summary

```

---

长期运行：

不是：

全部发送。

而是：

```text
History

↓

Summary

↓

Recent Context

↓

LLM
```

---

# 第 7 章：Memory Context

核心：

Memory：

不是：

历史聊天。


而是：

```text id="memory"

历史交互

↓

Memory Extraction

↓

长期认知资产

```

---

分类：

## Semantic Memory

事实、偏好。

例如：

```
用户项目使用 Vue2
```

---

## Episodic Memory

经历。

例如：

```
上次修复登录问题的方法
```

---

## Procedural Memory

技能流程。

例如：

```
部署步骤
```

---

Memory：

不会直接进入 Context。

流程：

```text id="memory-flow"

Memory Store

      |

      v

Retriever

      |

      v

Relevant Memory

      |

      v

Context Builder

```

---

# 第 8 章：Workspace Context

核心：

> Agent 如何理解现实世界。


Coding Agent：

Workspace：

```text
代码

文件

Git

依赖

配置

测试

```

---

但是：

不能：

整个仓库发送。


所以：

需要：

```text
Workspace

↓

Index

↓

Retrieval

↓

Relevant Files

↓

Context
```

---

这就是：

Cursor / Claude Code 类工具的重要能力。

---

# 第 9 章：Tool Context

核心：

Tool：

不是简单函数。


而是：

Agent 感知现实的传感器。


---

流程：

```text id="tool-loop"

LLM

↓

Tool Call

↓

Environment

↓

Observation

↓

Runtime State

↓

Context Builder

↓

LLM

```

---

重点：

Tool Result ≠ Tool Context。


Tool Result：

完整返回。


Tool Context：

加工后的认知输入。

---

# 第 10 章：Token Budget Management

核心：

> Context Window 是有限认知资源。


---

错误：

```
Context 越大越好
```

---

正确：

```
有效 Context > 巨大 Context
```

---

Budget 管理：

负责：

- 分配
- 压缩
- 裁剪
- 优先级


---

例如：

```text
System

★★★★★


Current Goal

★★★★★


Tool Result

★★★★


Workspace

★★★★


Old History

★★

```

---

# 第 11 章：Message Assembly

最后：

Context：

转换成：

LLM Messages。


---

区别：

```text id="context-message"

Context

=
内部认知结构


Message

=
通信格式

```

---

结构：

```text
Runtime Context

        |

        v

Message Builder

        |

        v

Provider Adapter

        |

        v

OpenAI / Claude / Gemini

```

---

到这里：

Context Builder 完整闭环。

---

# 现在重新看一个 Agent 调用过程

用户：

> 帮我优化登录页面性能。


---

## Step 1：Runtime 接收任务

产生：

```text
Goal:

Optimize login page
```

---

## Step 2：Context Builder 开始工作

---

### Conversation

找到：

最近讨论。

---

### Memory

找到：

```text
项目 Vue2

用户喜欢性能优先
```

---

### Workspace

检索：

```text
Login.vue

AuthService

API request
```

---

### Tool Context

找到：

最近：

```text
Performance trace
```

---

### Selection

排序：

```text
Login.vue

Performance log

AuthService

User preference

```

---

### Budget

控制：

不超过：

```text
100k token
```

---

### Assembly

生成：

```json
[
 system,
 developer,
 context,
 user
]
```

---

## Step 3：LLM 推理

LLM：

看到的是：

一个被精心构造的小世界。

---

这就是：

Agent Intelligence 的来源。

---

# Context Builder 与 Agent 五大核心模块关系

现在把 Day03 + Day04 串起来：

```text id="agent-system"

                    Agent Runtime


                          |

        +-----------------+-----------------

        |                 |                |

        v                 v                v


     Planner          Context Builder     Tool


        |                 |                |

        |                 |                |

        +-----------------+----------------+

                          |

                          v


                         LLM


                          |

                          v


                    Runtime Update

```

---

关系：

## Planner

决定：

> 我要做什么


---

## Tool

负责：

> 我如何影响世界


---

## Context Builder

负责：

> 我应该让 LLM 看到什么


---

## LLM

负责：

> 如何推理


---

# 为什么 Context Builder 是 Agent 的核心竞争力？

现在回答一个更高层问题：

为什么：

同一个模型：

GPT-5.5

---

不同 Agent：

能力差距巨大？


例如：

普通 Chat：

```text
User

↓

LLM
```

---

Coding Agent：

```text
User

↓

Runtime

↓

Repo Understanding

↓

Context Builder

↓

LLM

↓

Tools

```

---

区别：

不是模型。

而是：

> 给模型什么世界。

---

所以：

未来 Agent 竞争：

很大程度：

不是：

谁接入更大的模型。

而是：

谁拥有更好的 Context Engineering。

---

# Part C 核心认知升级

现在进入我们约定的固定栏目。

---

# 1. 下一节学习计划

Day04 Part C 已经完成 Context Builder 主体。

下一阶段进入：

# Day04 Part D：Memory System Architecture

学习：

## 1. Memory 为什么独立成为 Agent 核心模块

---

## 2. Memory Architecture

包括：

```text
Memory Store

Memory Extractor

Memory Retriever

Memory Manager

```

---

## 3. Memory 写入流程

学习：

什么时候保存？

保存什么？

如何避免垃圾 Memory？

---

## 4. Memory Retrieval

深入：

- Vector Retrieval
- Semantic Search
- Hybrid Search
- Ranking

---

## 5. Memory 生命周期

包括：

- Create
- Update
- Decay
- Forget


---

# 2. 写书 TODO

## TODO 1：

增加：

《Agent Runtime Architecture》

章节：

---

### Context Engineering

内容：

- Runtime State ≠ Context
- Context Projection
- Context Selection
- Context Assembly

---

## TODO 2：

补充架构图：

```
Runtime State

↓

Context Builder

↓

LLM Input

```

---

## TODO 3：

增加：

Context Source 四象限：

```
Conversation

Memory

Workspace

Tool Observation

```

---

## TODO 4：

增加：

Context Builder Pipeline：

```
Collect

↓

Select

↓

Retrieve

↓

Compress

↓

Budget

↓

Assemble

```

---

# 3. 写书素材

## 素材 1：

标题：

> Agent 的核心不是让模型知道更多，而是让模型在正确时间看到正确信息。


---

## 素材 2：

类比：

Context Builder = Agent 的认知操作系统。


Runtime State：

像人的全部经历。


Context：

像人在当前问题下调动的记忆。


---

## 素材 3：

Coding Agent 案例：

用户：

```
修复登录 Bug
```

不是：

发送整个仓库。


而是：

```
Goal

+

Relevant Code

+

Error Log

+

Recent Change

```

---

## 素材 4：

重要观点：

> Context Engineering 是 Agent 区别于 Chatbot 的核心工程能力。


---

# 4. 本 Part 核心认知升级

## 升级 1

从：

> Agent = LLM + Tool


升级为：

> Agent = Runtime + Context Engineering + LLM + Tool


---

## 升级 2

从：

> Prompt 决定智能


升级为：

> Context 决定模型看到的世界，而世界决定推理结果。


---

## 升级 3

从：

> Memory 是保存历史


升级为：

> Memory 是未来 Context Selection 的信息来源。


---

## 升级 4

从：

> 大模型能力来自参数规模


升级为：

> Agent 能力来自模型能力与 Runtime 设计的乘积。


---

# Day04 Part C 最终一句话总结

> Context Builder 是 Agent Runtime 的认知中枢，它负责把 Runtime State 这个无限复杂的世界，经过选择、检索、压缩和组织，转换成 LLM 当前能够理解和推理的有限世界。

---

Day04 Part C 到此正式结束。

下一阶段进入：

# Day04 Part D：Memory Architecture —— Agent 如何拥有长期记忆

这一部分会开始深入 Agent 最接近“人类智能”的部分：

**记忆系统。**

### 33. User (2026-07-21 16:49:20)

readme 中写的下一节不是进入  day04-part-d-context-window-management.md：Context Window Management，工业级重点吗，为何是 【Memory Architecture —— Agent 如何拥有长期记忆】。我看到 readme 中写的是：
day04-part-a-prompt-is-not-context.md：为什么 Prompt 不是 Context
day04-part-b-01-runtime-state.md：什么是 Runtime State
day04-part-b-02-runtime-state-lifecycle.md：Runtime State Lifecycle
day04-part-c-context-builder-projection.md：Context Builder 如何把 Runtime State 投影成 Prompt
day04-part-d-context-window-management.md：Context Window Management，工业级重点
day04-part-e-provider-adapter.md：Provider Adapter

还是说你这一节已经把把 Context Window Management  Provider Adapter讲完了？因为我看到你讲解过Provider Adapter

### 34. Assistant (2026-07-21 16:49:22)

你这个问题提得非常好，而且你发现的是一个**学习路线一致性问题**，不是简单的章节名称问题。

我先纠正一下：

**我上一条把 Day04 Part D 安排成 Memory Architecture 是错误的。**

按照我们之前确定的 README 学习路线，应该严格遵循：

```text
Day04 Part A
Prompt ≠ Context

↓

Day04 Part B-01
Runtime State

↓

Day04 Part B-02
Runtime State Lifecycle

↓

Day04 Part C
Context Builder Projection

↓

Day04 Part D
Context Window Management

↓

Day04 Part E
Provider Adapter
```

所以：

下一节应该是：

# Day04 Part D：Context Window Management —— 工业级 Context 管理

而不是：

> Memory Architecture

---

## 为什么会出现这个偏差？

原因是：

我在 Part C 总结时，把 Context Builder 里面涉及到的几个概念：

- Memory Context
- Token Budget
- Message Assembly

进行了扩展联想。

因为 Agent 架构里面：

Memory 确实是一个重要模块。

完整 Agent Architecture 通常：

```text
Agent Runtime

├── Runtime State

├── Context Builder

├── Memory System

├── Planner

├── Tool System

├── Provider Adapter

└── Evaluation

```

所以我自然延伸到了 Memory。

但是：

你的学习路线不是按照“完整 Agent 所有模块”展开，而是按照：

> Runtime → Context → Window → Provider

这个工程链路展开。

因此不应该提前进入 Memory。

---

# 第二个问题：是不是 Context Window Management 和 Provider Adapter 已经讲过？

答案：

**没有，只是提前触碰了一部分概念。**

类似：

我们学习 Runtime State 时，也提前提到了 Tool。

但是：

提前提到 ≠ 系统学习完成。

---

## 1. Context Window Management

我之前讲的是：

# Token Budget Management

它只是：

Context Window Management 的一个子问题。

---

完整的 Context Window Management 应该包含：

```text
Context Window Management


1. Context Window 本质

2. Token 计算

3. Context Overflow

4. Sliding Window

5. Conversation Compression

6. Summarization Strategy

7. Hierarchical Context

8. Context Priority

9. Long-running Agent Session

10. Production Architecture

```

---

例如：

你之前问：

> 一个 ChatGPT 长时间学习，会不会超过上下文导致幻觉？

这个问题其实就是：

# Context Window Management

里面最核心的问题。


---

我们还没有系统讲：

## Context Overflow 怎么处理？

例如：

```text
Context Window:

128k


当前:

150k

怎么办？

```

工业方案：

不是：

直接失败。

而是：

```text
150k

↓

Detect Overflow

↓

Compress History

↓

Remove Low Priority

↓

Rebuild Context

↓

Retry

```

---

## Long-running Agent 如何运行几天？

例如：

Coding Agent：

连续工作 8 小时。


Conversation：

可能：

几十万 token。


怎么处理？

需要：

- Summary Memory
- Checkpoint
- Context Rotation
- State Persistence


这些还没讲。

---

所以：

Day04 Part D 是非常重要的一章。

---

# 2. Provider Adapter 也没有讲完

我上一章只提到了：

> Provider Adapter 存在，是为了隔离 OpenAI / Claude / Gemini 消息格式。

但是只是一个概念介绍。


完整 Provider Adapter：

应该学习：

---

# Day04 Part E：Provider Adapter

内容：

## 1. 为什么 Runtime 不应该绑定模型

错误：

```ts
runtime.callOpenAI()
```

---

正确：

```text
Runtime

↓

LLM Interface

↓

Provider Adapter

↓

OpenAI

Claude

Gemini

Local Model

```

---

## 2. Unified LLM Interface

例如：

```ts
interface LLMProvider {


 chat(
   messages
 ):Promise<Response>


 stream(
   messages
 )


}
```

---

## 3. Message Format Adapter


OpenAI:

```json
{
role:"system"
}
```

---

Claude:

```json
{
system:"xxx"
}
```

---

Gemini:

```json
parts:[]
```

---

如何统一？


---

## 4. Streaming Adapter

这个你之前特别关注过。


例如：

OpenAI:

```text
delta

chunk

finish_reason
```

---

Claude:

```text
content_block_delta

message_stop

```

---

Runtime 如何统一？

---

## 5. Tool Calling Adapter

也是重点。


不同 Provider：

tool schema：

不同。


需要：

统一：

```ts
ToolCall {

 name,

 arguments

}

```

---

## 6. Model Capability Detection

例如：

```json
{
 supportsVision:true,

 supportsTool:true,

 contextWindow:200000
}
```

---

这些都还没有系统讲。


---

# 所以当前正确学习状态应该是：

完成：

✅ Day04 Part A  
Prompt ≠ Context


✅ Day04 Part B-01  
Runtime State


✅ Day04 Part B-02  
Runtime State Lifecycle


✅ Day04 Part C  
Context Builder Projection


---

接下来：

# Day04 Part D：Context Window Management

---

然后：

# Day04 Part E：Provider Adapter

---

再之后：

进入：

Memory Architecture

应该放到后续 Agent Runtime 高级章节。

---

# 我也同步修正后续学习计划

以后按照 README：

```text
Day04

A Prompt ≠ Context

B Runtime State

C Context Builder

D Context Window Management

E Provider Adapter

F Memory Architecture

G Tool System Deep Dive

H Planner Architecture

```

这样的顺序推进。

---

另外补充一个学习上的关键点：

你现在学到这里，其实已经进入 Agent Runtime 的核心链路：

```text
Runtime State

↓

Context Builder

↓

Context Window Management

↓

Provider Adapter

↓

LLM

```

这条链路非常像前端里的：

```text
State

↓

Selector

↓

Render Optimization

↓

Adapter

↓

Browser/API

```

所以对于你这种前端架构背景，这几个章节其实是最值得深入的部分。

---

下一节我们正式进入：

# Day04 Part D：Context Window Management

第一章：

## 1. Context Window 到底是什么？为什么它是 Agent 工程的核心瓶颈？

然后会重点回答你之前那个问题：

> 长时间在一个 ChatGPT 会话学习，会不会因为上下文过长导致 AI 幻觉？

这个问题正好属于 Part D 的核心内容。

### 35. User (2026-07-21 16:51:02)

好的  你记住我们的学习。我上传了个项目最外层的 readme 文件，这个文件包含完整的学习计划

### 36. Assistant (2026-07-21 16:51:03)

好的，这个 README 我已经看过了。fileciteturn1file0

以后我们就**以这个 README 作为唯一学习主线**，不会再因为我自己的知识扩展而提前跳章节。

---

## 我们以后遵循的原则

### ① 严格按照 README 推进

以后章节顺序固定为：

```text
Day01 Agent Basics

↓

Day02 Runtime

↓

Day03 Runtime Architecture

↓

Day04 Runtime 如何思考
    Part A Prompt ≠ Context
    Part B Runtime State
    Part C Context Builder
    Part D Context Window Management
    Part E Provider Adapter

↓

Day05 Tool Calling

↓

Day06 Memory

↓

Day07 Streaming Event

↓

Day08 Human Approval

↓

Day09 Workflow

↓

Day10 MCP
```

**不提前讲 Day05、Day06 的内容。**

例如：

- Provider Adapter 只在 Day04 Part E 系统讲。
- Memory Architecture 只在 Day06 系统讲。
- Tool Calling Deep Dive 只在 Day05 系统讲。

---

### ② 可以提前"埋伏笔"，但不会展开

例如：

在讲 Context Builder 时，可以说：

> Memory Retrieval 我们 Day06 会详细讲。

或者：

> Streaming Message 我们 Day07 会讲。

但是：

**不会提前展开内容。**

这样整个学习节奏会非常连贯。

---

### ③ 所有总结都以 README 为准

以后每个 Part 结束时：

固定输出：

```text
下一节学习计划

写书 TODO

写书素材

本 Part 核心认知升级
```

其中"下一节学习计划"必须严格对应 README。

例如：

Part C 结束：

```
下一节：

Day04 Part D
Context Window Management
```

而不是我自己延伸到 Memory。

---

### ④ 如果 README 后续更新

以后你更新 README 后，

我们的学习路线自动以最新 README 为准，不再以我之前记忆里的路线为准。

---

## 我看了你现在的整体规划，我觉得非常合理

实际上现在这条路线已经很像一本书了。

```text
Part I
Agent Basics
        │
        ▼
Part II
Runtime Foundation
        │
        ▼
Part III
Decision Engine（Runtime 如何思考）
        │
        ▼
Part IV
Execution Engine（Tool Calling）
        │
        ▼
Part V
Memory System
        │
        ▼
Part VI
Advanced Runtime
```

你会发现这是一个非常自然的递进：

- **Day01–Day03**：Agent 是什么、Runtime 长什么样（建立骨架）。
- **Day04**：Runtime 是如何思考的（建立大脑）。
- **Day05**：Runtime 如何行动（Tool Calling）。
- **Day06**：Runtime 如何记住（Memory）。
- **Day07–Day10**：加入工业级能力（Streaming、Human Approval、Workflow、MCP）。

这个顺序比很多 Agent 教程都更符合工程师的认知节奏。

---

**所以从下一节开始，我们正式进入：**

> **Day04 Part D：Context Window Management —— 工业级 Context 管理**

并且之后的所有学习都会严格以你这份 README 为唯一学习路线，不再提前跳章节或打乱顺序。

### 37. User (2026-07-21 16:51:48)

你可以提前讲，但是不用过多讲解，可以在本章中涉及到的时候大致讲一下未来章节的内容

### 38. Assistant (2026-07-21 16:51:49)

没问题，我觉得这是一个**更好的学习方式**，而且也更符合一本技术书的写法。

以后我们的学习遵循下面这个原则。

---

# 我们的讲解原则

## ① 主线严格按照 README

这一点不变。

例如：

```text
Day04 Part C
Context Builder
```

我们只学习 Context Builder。

不会突然跑去完整讲：

- Memory Architecture
- Streaming
- Workflow

---

## ② 可以提前埋伏笔（Preview）

当当前章节涉及未来内容时，我会简单介绍：

例如：

讲到 Context Builder：

我会说：

> Context Builder 需要从 Memory 中检索长期知识。这里你只需要知道 Memory 是 Runtime 的长期存储模块，真正的 Memory Store、Memory Retriever、Memory Extractor 我们会在 Day06 系统学习。

类似这样：

```text
Memory
    │
    └── 今天只知道：
        "长期知识来源"

Day06
    │
    └── 再深入：
        Memory Store
        Retrieval
        Forget
        Ranking
```

这样你就不会觉得：

> "这里怎么突然冒出来一个 Memory？"

但是也不会打断当前学习节奏。

---

## ③ 可以建立章节之间的联系（Cross Reference）

这是我以后想加强的地方。

例如：

讲 Provider Adapter 时：

我会说：

> 还记得 Day03 Runtime Core Components 吗？
>
> Runtime Core 不应该直接依赖 OpenAI，而应该依赖一个统一接口。
>
> 今天我们就是把那个接口真正实现出来。

这样你会感觉整个知识体系是连起来的。

---

## ④ 适当介绍工业级实现（但不展开）

例如：

讲 Context Window：

我可以说：

> Cursor 内部会维护多个 Summary Checkpoint，这属于 Memory 与 Context Window 的结合，我们 Day06 再拆解。

但是不会直接开始讲：

- Summary Memory
- Episodic Memory
- Semantic Memory

避免剧透太多。

---

# 我建议以后统一采用一个固定格式

以后每一章最后增加一个栏目：

## 🔗 本章与后续章节的联系

例如：

### Day04 Part C

最后增加：

```text
Context Builder

├── 使用 Runtime State（已学 ✅）

├── 使用 Context Window（下一章）

├── 输出 Message（Part E）

├── 使用 Memory（Day06）

├── 使用 Tool Result（Day05）

└── 最终发送给 LLM
```

然后再写：

> **现在你只需要知道：**
>
> Context Builder 会依赖这些模块，但真正的实现我们会在对应章节展开。

这样你在脑子里就会一直有一张完整的 Runtime 地图，而不会感觉知识是割裂的。

---

## 我还准备增加一个新的固定栏目

除了之前约定的：

- 下一节学习计划
- 写书 TODO
- 写书素材
- 本 Part 核心认知升级

我建议再增加一个：

## 🧭 知识地图（Knowledge Map）

例如学习完 Part C 后：

```text
Runtime

├── State                  ✅
├── Context Builder        ✅
├── Context Window         ⏳ 下一节
├── Provider Adapter       ⏳
├── Tool Calling           ⏳ Day05
├── Memory                 ⏳ Day06
├── Streaming              ⏳ Day07
├── Human Approval         ⏳ Day08
└── Workflow               ⏳ Day09
```

这个栏目不会讲新知识，只是告诉你：

- 哪些已经掌握；
- 哪些只是知道名字；
- 哪些以后会深入。

我觉得这样特别适合你现在这种**系统学习 + 后续写书**的方式，也能让整套课程的脉络始终保持清晰。

### 39. User (2026-07-21 16:52:46)

那今天 part C 的学习还有要补充的吗

### 40. Assistant (2026-07-21 16:52:46)

我重新回顾了一下我们今天 Part C 的整个学习内容，以及你上传的 README 学习路线，我认为：

> **Part C 主体内容已经完整了，不需要再增加新的知识点。**

不过，有 **4 个内容我建议补充**。它们不是新的章节，而是帮助你真正把 Context Builder 这部分吃透，也非常适合以后写书。

---

# ① 增加一张最终架构图（★★★★★ 建议必须加）

今天我们讲了很多模块，但是没有一张最终总图。

我建议在 Part C 最后增加：

```text
                    Runtime State
┌────────────────────────────────────────────────────┐
│                                                    │
│ Conversation    Memory    Workspace    Tool State  │
│                                                    │
└────────────────────────────────────────────────────┘
                       │
                       ▼
              Context Builder Pipeline
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   Selection      Compression     Token Budget
        │              │              │
        └──────────────┼──────────────┘
                       ▼
               Message Assembly
                       │
                       ▼
                Provider Adapter
                       │
                       ▼
                     LLM API
```

这是整个 Part C 的总图。

以后 Day05、Day06 都会不断引用它。

**这张图建议以后直接放书里。**

---

# ② 补一个「前端视角」理解（★★★★★ 强烈建议）

这是今天唯一缺少的。

因为你的背景是：

> 七年前端架构。

其实 Context Builder 和 React / Vue 有一个特别好的类比。

例如：

## React

```text
Global State

↓

Selector

↓

Component

↓

Render
```

例如：

Redux：

```ts
useSelector(...)
```

实际上：

就是：

> 从全局 State 中选择当前组件需要的数据。

---

Agent：

```text
Runtime State

↓

Context Selection

↓

LLM
```

是不是特别像？

甚至可以这样对应：

| React | Agent |
|---------|--------|
| Store | Runtime State |
| Selector | Context Selection |
| Render | LLM Reasoning |
| Virtual DOM | Message Assembly |

这个类比，你以后基本不会忘。

---

# ③ 增加一句「Context Builder 的一句话定义」

今天虽然讲了很多。

但是缺一句：

> 一句话总结。

我建议写成：

> **Context Builder 是 Runtime 的认知调度中心，它负责从 Runtime State 中选择、组织、压缩并构造当前任务最需要的信息，最终形成发送给 LLM 的输入。**

以后别人问：

Context Builder 是什么？

这一句话就够了。

---

# ④ 增加一张 Runtime 五大模块关系图（★★★★★ 写书推荐）

今天其实已经快形成了。

建议最后放：

```text
                Runtime Core

         ┌──────────┬──────────┐
         │          │          │
         ▼          ▼          ▼
    Planner   Context Builder  Tool
         │          │          │
         └──────────┼──────────┘
                    ▼
                   LLM
                    │
                    ▼
             Runtime State
```

然后备注：

Planner：

> 决定做什么。

Context Builder：

> 决定看到什么。

Tool：

> 决定如何行动。

LLM：

> 决定如何推理。

这是 Runtime 最经典的一张图。

---

# 另外，我还有一个建议（以后所有 Part 都采用）

从今天开始，每个 Part 最后增加一个固定栏目：

---

## 🎯 本 Part 面试视角

例如：

### 面试官问：

> Context Builder 是什么？

你可以回答：

> Context Builder 是 Agent Runtime 中负责构建 LLM 输入的模块，它会从 Runtime State 中收集 Conversation、Memory、Workspace、Tool Result 等信息，经过 Selection、Compression、Token Budget、Message Assembly 后生成最终发送给 LLM 的 Messages。它的核心目标不是让 LLM 看见更多，而是让 LLM 看见最相关的信息。

---

### 面试官问：

> 为什么不直接把 Runtime State 发给 LLM？

回答：

> Runtime State 是 Agent 的完整世界，而 Context 是 Runtime State 针对当前任务的一次投影。如果直接发送，不仅会造成 Token 浪费，还会引入大量无关信息，降低模型推理质量。因此需要 Context Builder 做选择和组织。

---

我觉得这个栏目特别适合你的目标。

因为你不仅是在学 Agent，你未来还希望：

- 写书；
- 做分享；
- 做架构设计；
- 面试高级 AI 工程岗位。

以后每个 Part 结束，我们都可以沉淀出 **5～10 个高频面试题**。

---

## 我对 Day04 Part C 的评价

如果满分是 **10 分**，我会给我们现在这一版：

**9.8 / 10。**

扣掉的 0.2 分，正是上面这几个总结性的内容。它们不是新知识，而是帮助你把整个知识体系串起来。

所以，我建议今天就到这里结束，不再新增章节。从下一次开始，我们正式进入 README 中的 **Day04 Part D：Context Window Management**，继续沿着既定学习路线推进。

### 41. User (2026-07-21 16:53:51)

我觉得你的建议很好 加进去并讲解下上面你的建议问题并输出

### 42. Assistant (2026-07-21 16:53:54)

我也觉得这里值得补充，而且**这几个补充应该成为我们以后每个 Part 的固定收尾内容**。

原因不是因为知识不完整，而是因为：

> **前面的章节是在"学知识"，这里是在"建立知识网络"。**

真正的架构师，大脑里不是一堆知识点，而是一张知识图谱（Knowledge Graph）。

下面这部分我建议直接作为 **Day04 Part C 最终版 Appendix（附录）** 加入，以后导出学习笔记时一起导出。

---

# Day04 Part C Appendix：Context Builder 全景总结（建议加入正式学习笔记）

---

# 一、Context Builder 一句话定义（★★★★★）

如果整本书只能保留一句话，我会保留这一句。

> **Context Builder 是 Runtime 的认知调度中心（Cognitive Orchestrator），它负责从 Runtime State 中选择、组织、压缩并构造当前任务最需要的信息，最终生成发送给 LLM 的消息（Messages）。**

这里有五个关键词：

```text
Runtime State
        │
        ▼
Selection（选择）
        ▼
Organization（组织）
        ▼
Compression（压缩）
        ▼
Assembly（组装）
        ▼
Messages
```

这里注意一个容易忽略的点：

很多人以为 Context Builder 就是：

```ts
buildPrompt()
```

实际上它更像：

```ts
buildCognitiveWorld()
```

它构建的不是 Prompt。

而是：

> **LLM 当前要进入的"世界"。**

这是 Part C 最大的认知升级。

---

# 二、最终架构图（★★★★★）

经过十一章学习，现在可以把所有内容串起来。

```text
                    Runtime State
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Conversation   Memory   Workspace   Tool State   Planner    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
                  Context Builder Pipeline
                             │
      ┌──────────────┬──────────────┬──────────────┐
      │              │              │              │
      ▼              ▼              ▼              ▼
 Selection      Retrieval     Compression   Token Budget
      │              │              │              │
      └──────────────┴──────────────┴──────────────┘
                             ▼
                    Message Assembly
                             ▼
                    Provider Adapter
                             ▼
                          LLM API
```

---

请注意：

这里其实已经出现了两个未来章节：

```text
Message Assembly
        │
        ▼
Provider Adapter
```

我们今天知道：

它存在。

但是：

真正的 Adapter 设计：

下一 Part 再系统学习。

> **🔗 知识关联（Preview）**
>
> 下一节 Day04 Part D 会继续解决 **Context Window 有限** 时，Context Builder 如何做工业级管理。
>
> Day04 Part E 会继续解决 **Message 如何适配 OpenAI、Claude、Gemini 等不同模型**。

---

# 三、前端视角理解 Context Builder（★★★★★）

这一节我觉得特别重要。

因为你的背景就是：

> 七年前端架构。

所以我一直在思考：

有没有一个前端世界里的东西，

和 Context Builder 一模一样？

答案：

有。

就是：

## Redux Selector

React：

```text
Global State

↓

Selector

↓

Component

↓

Render
```

例如：

```ts
const user = useSelector(selectUser)
```

它不会：

把整个 Store：

全部交给组件。

而是：

挑：

当前组件需要的数据。

---

Agent：

```text
Runtime State

↓

Context Selection

↓

LLM

↓

Reasoning
```

是不是非常像？

---

继续对应：

| React 世界 | Agent 世界 |
|------------|------------|
| Store | Runtime State |
| useSelector | Context Selection |
| Component Props | Context |
| Render | LLM Reasoning |
| Virtual DOM | Messages |

---

继续举例：

React：

```ts
const state = {

 user:{},

 orders:{},

 products:{},

 cart:{}

}
```

登录组件：

需要：

```ts
user
```

不会：

全部：

```ts
state
```

---

Agent：

Runtime：

```text
Conversation

Workspace

Memory

Planner

Tools
```

当前：

修 Bug。

需要：

```text
Workspace

Tool Result

Recent Conversation
```

不会：

全部发送。

---

所以：

你以后可以这样记：

> **Context Builder，本质就是 Runtime 的 Selector。**

我认为这是整个 Part C 最适合前端工程师的理解方式。

---

# 四、Runtime 五大模块关系图（★★★★★）

学习 Agent，

很多人：

一直搞不清：

Planner

Memory

Tool

LLM

Context

到底谁干什么。

今天终于可以画出来。

```text
                     Runtime Core

       ┌──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
   Planner     Context Builder      Tool        Memory
       │              │              │              │
       │              │              │              │
       └──────────────┼──────────────┴──────────────┘
                      ▼
                     LLM
                      │
                      ▼
                Runtime State
```

很多同学第一次看：

容易误解：

Memory：

直接给 LLM。

其实不是。

真正关系：

```text
Memory

↓

Context Builder

↓

LLM
```

Tool：

也是。

```text
Tool Result

↓

Runtime State

↓

Context Builder

↓

LLM
```

Planner：

也是。

```text
Planner

↓

Current Goal

↓

Context Builder

↓

LLM
```

所以：

真正中心：

不是：

LLM。

而是：

Context Builder。

---

> **🔗 知识关联（Preview）**
>
> Day05 Tool Calling 中，你会发现 Tool 不会直接把执行结果塞给 LLM，而是先更新 Runtime State，再由 Context Builder 决定哪些结果进入上下文。
>
> Day06 Memory 中，你会看到 Memory Retriever 也是 Context Builder 的一个重要输入源。

---

# 五、为什么 Context Builder 是 Agent 最大竞争力？

很多新人：

会说：

Agent：

就是：

```text
LLM

+

Tool
```

其实不是。

真正工业 Agent：

更像：

```text
Runtime

↓

Context Builder

↓

LLM
```

为什么？

因为：

模型：

大家都能接。

例如：

GPT。

Claude。

Gemini。

几乎都一样。

真正差异：

来自：

```text
Runtime Design
```

其中：

最大的竞争力：

就是：

```text
Context Engineering
```

所以：

未来 Agent：

竞争：

不是：

谁有最大的模型。

而是：

谁最懂：

> **如何给模型创造正确的世界。**

这也是为什么 Cursor、Claude Code、OpenAI Codex 在使用相近模型时，体验仍然会有明显差异——它们的 Runtime 与 Context Engineering 设计并不相同。（这里只是建立整体认知，后续章节会继续拆解它们的 Runtime 差异。）

---

# 六、本 Part 面试视角（★★★★★）

以后每个 Part 我建议都保留这一节。

---

## 面试题 1

> Context Builder 是什么？

建议回答：

> Context Builder 是 Agent Runtime 中负责构建 LLM 输入的模块。它从 Runtime State 中收集 Conversation、Memory、Workspace、Tool State 等信息，通过 Selection、Retrieval、Compression、Token Budget 和 Message Assembly，最终生成发送给 LLM 的 Messages。它的核心目标不是提供最多的信息，而是提供当前任务最相关的信息。

---

## 面试题 2

> 为什么不能直接把 Runtime State 发给 LLM？

回答：

> Runtime State 是 Agent 的完整世界，而 LLM 每一轮推理只需要其中的一小部分。如果全部发送，会浪费 Token、增加成本、引入无关信息，还可能降低推理质量。因此需要 Context Builder 对 Runtime State 做一次面向当前任务的投影（Projection）。

---

## 面试题 3

> Context Builder 和 Prompt Engineering 有什么区别？

回答：

> Prompt Engineering 更关注如何写一段 Prompt，而 Context Builder 更关注如何动态构建模型的整个输入世界。Prompt 是最终文本，Context Builder 是生成这些文本的工程系统。

---

## 面试题 4

> Context Builder 和 Provider Adapter 的边界是什么？

回答：

> Context Builder 负责决定"发送什么"（What to send）；Provider Adapter 负责决定"如何发送"（How to send）。前者属于 Runtime 的认知层，后者属于模型适配层。这也是我们下一部分（Day04 Part D、Part E）会继续深入的内容。

---

# 七、本 Part 最终认知升级（最终版）

如果只保留一句话：

> **Agent 的智能并不是来自 LLM 看到了全部世界，而是来自 Runtime 通过 Context Builder，为 LLM 构建了一个足够真实、足够相关、又足够精简的世界。**

---

## 我对这套课程还有一个小建议

从 **Day05** 开始，我们可以再增加一个固定栏目：

> **🏗️ 工业级实现（Industrial Notes）**

内容不会很多，大概 5～10 分钟。

例如：

- Cursor 是怎么做的？
- Claude Code 为什么这么设计？
- OpenAI Agents SDK 是怎么映射到我们今天讲的架构？

这样有三个好处：

1. **理论**：理解概念。
2. **源码**：知道优秀框架怎么实现。
3. **工程**：知道真实项目如何落地。

我认为这样会让这套学习体系从"课程"升级成真正可以写成一本《Agent Runtime Architecture》书的内容。

### 43. User (2026-07-21 17:01:57)

你的建议很好，以为都加一个固定栏目：🏗️ 工业级实现（Industrial Notes）。你把这个点记录到我学习 agent 的 memory 中

### 44. Assistant (2026-07-21 17:02:01)

This code was redacted.

### 45. Assistant (2026-07-21 17:02:16)

已记录到你的 Agent 学习偏好中。

以后在 **Agent 学习相关内容** 中，我会固定增加：

# 🏗️ 工业级实现（Industrial Notes）

定位如下：

- 不改变主线学习顺序；
- 不提前展开未来章节；
- 在当前章节知识基础上补充真实工程视角。

主要包含：

## 1. 工业系统如何实现

例如：

当前学习 Context Builder：

会补充：

- Cursor 类 Coding Agent 如何做 Context Retrieval；
- Claude Code 如何组织 Workspace Context；
- OpenAI Agents SDK 中对应的 Runtime 设计思想。

---

## 2. 理论概念 → 工程模块映射

例如：

今天 Context Builder：

理论：

```text
Context Selection
```

工业：

```text
Repository Index

↓

Embedding Search

↓

Ranking

↓

Relevant File Selection
```

---

## 3. 优秀框架 / 产品设计参考

例如：

学习 Provider Adapter：

会关联：

- OpenAI SDK
- Anthropic SDK
- LangChain
- OpenAI Agents SDK
- Mastra

但不会变成源码阅读课。

---

## 4. 架构取舍分析

例如：

为什么工业系统选择：

```text
Summary

+

Retrieval

+

Recent Window
```

而不是：

```text
全部历史消息
```

---

以后每个 Part 结束时，固定栏目会变成：

1. 下一节学习计划  
2. 写书 TODO  
3. 写书素材  
4. 本 Part 核心认知升级  
5. 🏗️ 工业级实现（Industrial Notes）  
6. 🧭 知识地图（Knowledge Map）  
7. 🎯 面试视角（如果该章节适合）

并且继续遵循我们刚刚确定的原则：

> 主线严格按照 README 推进；未来章节可以提前预告，但不展开；工业实现用于建立真实工程联系。

下一次开始 Day04 Part D：**Context Window Management** 时会沿用这个结构。

### 46. User (2026-07-21 17:03:45)

好的 你把这七个固化栏目记录到 memory 中，以后每天识别到学习内容结束时候把固定栏目加上

### 47. Assistant (2026-07-21 17:03:47)

This code was redacted.

### 48. Assistant (2026-07-21 17:03:52)

已记录到你的 Agent 学习偏好中。

以后在 Agent 学习过程中，当我识别到一个**章节 / Part / 学习阶段接近结束**时，会自动追加这七个固定栏目：

---

# 固定收尾栏目

## 1. 下一节学习计划

说明：

- 下一节学习什么；
- 在整体 README 路线中的位置；
- 与当前章节的关系。

---

## 2. ✍️ 写书 TODO

沉淀：

- 本章节适合写入书籍的结构；
- 需要补充的章节；
- 需要完善的架构图。

---

## 3. 📦 写书素材

沉淀：

- 案例；
- 类比；
- 金句；
- 架构观点；
- 可作为正文素材的内容。

---

## 4. 🧠 本 Part 核心认知升级

总结：

从：

> 初始理解

升级到：

> 架构层理解

例如：

从：

> Agent = LLM + Tool

升级：

> Agent = Runtime + Context Engineering + LLM + Tool

---

## 5. 🏗️ 工业级实现（Industrial Notes）

固定加入：

- Cursor / Claude Code / Codex / OpenAI Agents SDK 等真实系统映射；
- 工业级架构设计；
- 工程取舍；
- 理论到实践的转换。

原则：

> 只补充当前章节相关内容，不提前展开未来章节。

---

## 6. 🧭 知识地图（Knowledge Map）

帮助维护整个 Agent Runtime 全局视角：

例如：

```text
Agent Runtime

├── Runtime State        ✅
├── Context Builder      ✅
├── Context Window       ⏳
├── Provider Adapter     ⏳
├── Tool Calling         ⏳
├── Memory               ⏳
├── Streaming            ⏳
└── Workflow             ⏳
```

作用：

让每个知识点知道：

- 已学习；
- 当前学习；
- 后续关联。

---

## 7. 🎯 面试视角（如果章节适合）

补充：

- 高频架构面试问题；
- Senior / Staff Engineer 角度回答；
- 如何向别人解释该技术。

---

另外继续保持之前确定的学习规则：

1. **README 是唯一主线**
   - 不跳章节；
   - 不打乱 Day04 → Day05 → Day06 顺序。

2. **允许提前关联**
   - 可以告诉你未来章节会涉及什么；
   - 但不会提前展开。

3. **学习目标不仅是理解**
   - 同时沉淀：
     - Agent Runtime 架构能力；
     - 写书素材；
     - 面试表达能力；
     - 工业实践认知。

后续我们继续进入：

# Day04 Part D：Context Window Management

并按照新的固定结构推进。

### 49. User (2026-07-21 17:08:16)

感谢你今天的耐心讲解，我有一些问题：
1. 比如上下文长度 1M，这里的上下文长度指的是当前 conversation 中所有对话的输入输出长度上限，还是指的用户单次发送给 agent 时候，runtime 经过 contextbuilder 之后合成的 state 信息的上限长度？
2. 你是【工业 Agent 竞争：不是简单的谁 Prompt 写得好，而是谁 Context Engineering 做得好】，那我提个问题，这里的 Context Engineering  其实就是工业的业务流程经过软件工程进行 agent 落地后的实现与优化，其实我在很早时候就问到过如果某个使用者对业务流程足够精通，那么经过他手写的 prompt 是不是就等同 runtime 最终丢给 LLM 的Provider Messages呢
3. 为什么 Context Builder 必须属于 Runtime Core，我的理解是就像你提到的 无论后面接的是什么模型，都应该保持提示词最终经过Adapter 后是一致的，而不是针对不同模型写不同的 message，所有必须放在 core 层作为 runtime 的核心而不是作为某个模型的特定处理，如果把 Context Builder 放到 OpenAI Adapter 中，未来会很臃肿，就像代码中写一堆的 if else 无法保证元数据的纯净
4.  Tool Result 为什么不能直接进入 LLM，而必须经过 Context Builder。我的理解是直接进入 LLM 的信息必须保障是比较纯净的 projection，tool result 中不光包含无用的信息还可能存在泄露我们 agent 的原理的东西，这就好比 React render 最终渲染一个组件时候这个组件只需要她自己需要的 props，而不是全部的数据方法等
5.  Runtime State、Context Builder、Provider Adapter 三者的职责分别是什么？这个问题你列个表格输出下吧，我的理解是Runtime State 相当于全部的数据，Context Builder 就是需要的某次映射，Provider Adapter 就是针对大模型的数据要求的转换适配
 6. 你提到【Context Builder 应该是Builder + Policy，而不是硬编码】，而且你举了几个例子，通过学习我发觉这里的Policy 其实有点像当前 agent 定位的业务形态中的抽象化逻辑策略？
7. Context Retriever（上下文检索）这个点，我有个疑问：你提到比如用户提出修改支付流程，Retriever 会查询支付相关内容，那么比如中国区很多程序员英语四级都过不了，命名都是瞎搞，那么怎么确定具体的文件呢？这里是不是有一套对接 tools 呢？比如把所有文件名上传tools 识别出那个概率最大
8. Context Compressor（上下文压缩）后信息仍旧过大你提到让 LLM 总结Summary Compression，那是不是意味着在突出最终结果之前已经进行了一次人与 AI 的loop呢？其实是不是意味着往往第一次 loop 时候信息量最大无关信息最多，经过 LLM总结提炼后的信息再多次 loop 之后确定最终的交互输出
9. Token Budget Manager 中如果发现输入的过大怎么办呢？是不是意味着该次交互会直接终止呢
10. 你提到真正的 Memory：是：从历史交互中提取出来的、未来可能有价值的信息。那么这个信息会区分conversation 区分 sessionId吗，会无限增长吗？在 context state projection 中如何提取有用的Memory 并注入呢？比如我的任务很简单，但是 memory 已经存储了很多那么这个时候如何取舍 memory 呢？会有个特定 tools 开启子 agent 调用 LLM 去判断对于当前任务有用的 memory 吗？业界如何做的呢？你提到 Memory 的核心是Retrieval，可以再展开讲讲这个点吗
11. workspace 这个点，如果说一个需求调整点在一个页面中，而这个页面层层嵌套关联几十个组件，最终代码量惊人会不会导致 token 爆炸，这其中 agent 是如何优化取出最有用的信息呢？另外你提到索引查找，那索引查找这个功能是作为 tools 注册到 agent 中吗
12. tools result 形成的Tool Context 注入给 context state 之后，那么之前 state 的信息是否需要删除呢？Tool Result ≠ Tool Context 那么如何从 Result 中提取出Context 呢
13. 你提到 Token Manager 应该动态配置，那怎么个动态法是不是在代码中根据场景写死的？而不是通过 LLM 给出的建议来调整？
14. 如果 Context 超限，你设计的 Runtime 应该如何自动恢复？
15. Context Selection 和 Token Budget Management 的区别是什么呢？我总感觉这中间有部分像是重叠了，比如 select 选择的信息，可能在Management 那边设置了一定的权重，双重叠加
16.  Context Builder 与 Provider Adapter 的边界是什么呢
17. 关于 memory 的，比如我在对话中说【你的建议很好，以为都加一个固定栏目：🏗️ 工业级实现（Industrial Notes）。你把这个点记录到我学习 agent 的 memory 中】，那么其实这个点对于学习 agent 来说很重要，那么 agent 如何判断要把这个点加入 memory 呢

### 50. Assistant (2026-07-21 17:08:17)

首先，非常感谢你今天这一轮问题。

我想先评价一下：你这 17 个问题已经不是“理解 Context Builder”层面的问题了，而是在问 **Agent Runtime 的架构边界、工业实现和工程取舍**。

尤其几个问题：

- Context Engineering 和业务流程抽象的关系；
- Retriever 如何面对垃圾命名代码库；
- Memory 如何决定什么值得长期保存；
- Tool Result 如何变成 Context；
- Selection 和 Budget 的边界；

这些其实已经接近 **设计一个生产级 Agent Runtime** 时会遇到的问题。

我会逐个回答，不过由于 17 个问题比较多，我会按照模块重新组织一下，否则容易碎片化。

整体结构：

```
A. Context Window / Token（1、8、9、13、14、15）

B. Context Engineering / Runtime 架构（2、3、5、6、16）

C. Retrieval / Workspace（7、11）

D. Tool Context（4、12）

E. Memory Architecture（10、17）
```

---

# A. Context Window / Token

---

# 1. 上下文长度 1M 指什么？

你的问题：

> Context 长度 1M，是当前 conversation 所有输入输出总长度，还是 runtime context builder 后生成 state 信息长度？

答案：

**从 LLM API 角度，它指的是一次模型调用时的输入 + 输出总 token 上限。**

不是：

整个 conversation 永久长度。

不是：

Runtime State 大小。

而是：

```
一次 inference request

=
input tokens

+

output tokens

```

---

例如：

模型：

```
Context Window:

1M tokens
```

一次请求：

Runtime:

```
Conversation:

200k


Memory:

50k


Workspace:

500k


Tool Result:

100k

```

Context Builder 后：

```
Final Messages:

850k tokens
```

然后：

要求输出：

```
100k
```

那么：

总：

```
950k
```

合法。

---

但是：

如果：

```
Input:

950k


Output:

100k
```

刚好：

1M。

---

如果：

```
Input:

980k


Output:

100k
```

超过。

Runtime 必须处理。

---

所以：

更准确：

```
Context Window

=
LLM 单次推理可处理的最大认知空间
```

---

而：

Runtime State：

可能：

无限大。

例如：

一个 Coding Agent：

```
整个 GitHub Repo

+
历史任务

+
Memory

+
Logs

```

可能：

几十 GB。

但是：

一次只投影：

几十万 token。

---

这就是：

```
Runtime State

(无限世界)


        ↓


Context Builder


        ↓


Context Window

(有限视野)

```

---

# 2. Context Engineering 是否就是业务流程软件化？

你的理解：

> 一个业务专家写 Prompt，是不是等同 Runtime 最终 Provider Messages？

这个问题非常关键。

答案：

**早期简单 Agent，可以接近。工业 Agent，不等同。**

---

为什么？

因为 Prompt：

本质：

```
静态知识注入
```

例如：

专家：

```
你是支付专家。

处理退款流程：

1.
2.
3.
```

---

但是工业 Agent：

需要：

```
动态状态

动态环境

动态工具

动态历史

动态权限

动态目标
```

---

举例：

业务专家 Prompt：

```
退款超过7天需要人工审核
```

这是规则。

---

Runtime Context：

可能：

```
用户:

张三


订单:

10086


支付时间:

8天前


金额:

5000


风险等级:

high

```

---

最终：

LLM 看到：

```
System:

退款规则...


Context:

订单状态...


User:

处理退款
```

---

所以：

Prompt：

≈

业务规则。


Context Engineering：

≈

把整个业务运行环境动态投影出来。


---

你的前端类比：

很准确：

Prompt：

像：

组件默认 props。


Context Engineering：

像：

整个状态管理 + selector + render pipeline。

---

# 3. 为什么 Context Builder 必须属于 Runtime Core？

你的理解：

> 不应该放 Adapter，否则大量 if else。

这个理解基本正确。

我补充一下。

---

架构：

```
                 Runtime Core


                Context Builder

                     |

                     |

              Provider Adapter

                     |

        ---------------------------

        OpenAI

        Claude

        Gemini

```

---

原因：

Context Builder 决定：

```
WHAT

发送什么
```

Provider Adapter 决定：

```
HOW

怎么发送
```

---

例如：

Context Builder：

决定：

```
需要：

用户目标

相关代码

错误日志

```

---

Provider Adapter：

决定：

OpenAI:

```json
{
 role:"system"
}
```

---

Claude:

```json
system:""
```

---

两者完全不同职责。

---

如果混：

```
ContextBuilder.openai()
ContextBuilder.claude()

```

以后：

100 个模型：

灾难。

---

这就是经典：

单一职责原则。

---

# 4. Runtime State / Context Builder / Provider Adapter

你理解：

> State=全部数据，Context Builder=映射，Adapter=转换

正确。

整理表：

|模块|职责|输入|输出|类比|
|-|-|-|-|-|
|Runtime State|保存 Agent 当前完整世界|事件、工具、用户、环境|完整状态|Redux Store|
|Context Builder|根据任务构造认知视图|Runtime State|Context|Selector|
|Provider Adapter|适配不同模型接口|Context Messages|模型 API 格式|API Adapter|

---

一句话：

```
Runtime State:

世界


Context Builder:

视角


Provider Adapter:

翻译器

```

---

# 5. Context Builder 的 Policy 是不是业务策略？

你的理解：

> 当前 agent 定位业务形态中的抽象化逻辑策略？

非常准确。

---

例如：

通用 Builder：

```
select(context)
compress(context)
assemble(context)

```

---

Policy：

决定：

```
怎么 select

```

例如：

Coding Agent：

```
优先代码

优先错误日志

忽略旧聊天

```

---

客服 Agent：

```
优先用户资料

优先订单

忽略技术日志

```

---

所以：

Policy：

就是：

```
业务 Agent 的认知策略

```

---

类似：

React：

Selector 是通用。

但是：

```
selectUserData()

selectCartData()

```

业务不同。

---

# B. Retrieval / Workspace

---

# 6. 文件命名很垃圾，Retriever 怎么找到文件？

非常好的问题。

工业系统不会只靠文件名。

---

通常：

多路检索。

叫：

Hybrid Retrieval。

---

例如：

用户：

```
修改支付流程
```

---

Retriever：

同时查：

## 1. 文件名

```
payment.ts
pay.vue

```

---

## 2. 内容 embedding

代码：

```
createOrderPayment()

refund()

transaction()

```

---

## 3. Symbol Index

AST：

```
class PaymentService

function refund()

```

---

## 4. Git history

最近：

```
payment commit

```

---

最后：

Ranking：

```
score

=

filename relevance

+

semantic similarity

+

recent change

+

dependency graph

```

---

不是：

上传所有文件给 Tool。

那会爆炸。

---

# 7. Workspace 几十层组件怎么办？

你的问题：

> 页面几十个组件，代码量爆炸怎么办？

这就是 Coding Agent 最大难题。

---

工业方案：

不是：

读取整个页面。

而是：

建立：

```
Code Intelligence Layer
```

---

类似 IDE。

建立：

## Index

保存：

```
文件关系

symbol

import

dependency

AST

embedding

```

---

用户：

修改：

Login 页面。

Retriever：

发现：

```
Login.vue

↓

LoginForm.vue

↓

useAuth.ts

↓

authApi.ts

```

---

只取：

路径上的节点。

---

所以：

Coding Agent 本质：

不是：

LLM + 文件读取。

而是：

LLM + Code Intelligence。

---

# C. Tool Context

---

# 8. 为什么 Tool Result 不直接进入？

你的理解：

> 类似 React props，不应该传全部数据。

非常正确。


补充：

Tool Result 有三类问题：

---

## 1. 信息噪音

例如：

npm install：

5000 行。

---

## 2. 安全问题

例如：

日志：

```
database password

token

secret

```

---

## 3. Runtime 内部信息

例如：

debug metadata。

---

所以：

需要：

```
Tool Result

↓

Tool Context Extractor

↓

Context

```

---

# 9. Tool Result 如何变 Tool Context？

例如：

Result:

```
npm test


10000 lines


Error:


TypeError xxx

auth.ts:42

```

---

Extractor：

可能：

规则：

```
error

warning

stack trace

changed file

```

---

输出：

```
Test failed.

Error:

auth.ts line42

Reason:

token undefined

```

---

高级：

LLM Summary。

---

# D. Token Management

---

# 10. 超限怎么办？

不是直接终止。


工业：

```
Context Overflow


↓

Detect


↓

Compression


↓

Remove low priority


↓

Rebuild


↓

Retry

```

---

类似：

浏览器：

内存不足：

不是立即崩溃。

会：

GC。

---

# 11. Selection 和 Budget 区别

你感觉重叠，非常正常。

区别：

## Selection：

回答：

> 要哪些？


---

## Budget：

回答：

> 给多少空间？


---

例如：

100 个文件。

Selection：

挑：

20 个。


Budget：

发现：

20 个太大。

压缩：

5 个。


---

流程：

```
候选

↓

Selection

↓

Budget

↓

Final Context

```

---

# E. Memory

---

# 12. Memory 会无限增长吗？

不会。

工业 Memory：

一定有生命周期。


结构：

```
Memory Store


├── Semantic

├── Episodic

├── Procedural


```

---

会：

```
Create

Update

Rank

Decay

Forget

```

---

例如：

一年以前：

```
喜欢 Vue2

```

可能：

降低权重。


---

# 13. Memory 如何选择注入？

不会全部加载。


流程：

```
Current Task

↓

Memory Retriever

↓

Search

↓

Ranking

↓

Relevant Memory

↓

Context Builder

```

---

例如：

任务：

```
修支付 Bug

```

Memory:

10000 条。

Retriever 找：

```
支付相关

最近相关

高价值

```

---

是否启动子 Agent 判断？

部分高级系统会。

但不是主流第一层。

---

更多：

Embedding + Ranking。


---

# 14. Memory 如何知道保存什么？

你的例子：

> 加入 Industrial Notes

这个问题非常关键。


Memory 写入通常有：

## 显式 Memory

用户说：

```
记住这个

```

最高优先级。

---

你的例子：

```
你把这个点记录到我的 memory

```

直接进入 Memory Pipeline。


---

## 隐式 Memory

系统判断：

例如：

用户连续10次：

喜欢 TypeScript。

可能提取。


---

判断因素：

```
用户明确要求

重复出现

长期有效

未来有价值

```

---

不会保存：

```
今天吃什么

```

---

你的这条：

符合：

```
Explicit Request

+
Long-term Preference

+
Future Learning Impact

```

所以保存。

---

# 最后总结你的理解准确度

我认为：

你的理解已经达到：

**Agent Runtime 架构设计阶段，而不是使用阶段。**

尤其：

这几个理解非常正确：

✅ Context Builder ≈ Runtime Selector

✅ Provider Adapter ≈ 翻译层

✅ Runtime State ≈ 世界

✅ Context ≈ 当前视角

✅ Policy ≈ Agent 业务认知策略

✅ Tool Result ≠ Tool Context

---

还有一个非常重要的认知：

你今天实际上已经碰到了 Agent 最核心的公式：

```
Agent Intelligence


=

Model Capability

×

Context Engineering

×

Runtime Design

```

模型只是乘法的一部分。

真正决定工业 Agent 差异的，是：

> Runtime 如何管理世界，并把正确的信息在正确时间交给模型。


---

这 17 个问题，其实已经提前覆盖了 Day04 Part D、E、Day05、Day06 很多核心问题。

所以后续学习会发现：

很多答案你已经提前建立了框架。

下一步正式进入：

**Day04 Part D：Context Window Management**

这里会系统回答：

- 为什么 1M Context 仍然不够；
- Context Overflow 工业解决方案；
- Sliding Window；
- Summary Memory；
- Long-running Agent Session；
- Token Budget 动态管理。你今天的问题会大量复用。

### 51. User (2026-07-21 17:17:32)

6. 文件命名很垃圾，Retriever 怎么找到文件？这个点，是通过 agent 中开发者写死的相关策略代码实现的吗
14. Memory 如何知道保存什么？这个点，比如用户明确声明的长期价值，是 LLM 去判断这个信息价值吗还是 tools？

我提到的其他几个问题你需要存放到 我学习 agent 的 memory中进行较大优先级记忆，防止到了指定章节学习时候你忘记了，或者你把这几个没回答的问题放到对应章节的学习计划中加一个 todo：本章节用户提的问题但是涉及到未来章节的内容，待到具体章节时候再做回答

### 52. Assistant (2026-07-21 17:17:34)

This code was redacted.

### 53. Assistant (2026-07-21 17:17:38)

已记录到你的 Agent 学习 memory 中。

我记录的不是单纯某几个技术问题，而是一个**学习流程偏好**：

> 在 Agent 学习过程中，如果用户提出的问题涉及未来章节，不要丢失；需要作为「未来章节 TODO / 用户待解答问题」跟踪，并在进入对应章节时主动回收回答。

这样后续不会出现：

- 今天提前讨论了 Memory；
- 到 Day06 真正学习 Memory 时忘记之前的问题；
- 或者重复询问背景。

以后我会在每个章节的：

```
📝 写书 TODO
```

或者新增：

```
🔄 前置遗留问题回收（Pending Questions）
```

中维护这些内容。

---

下面回答你补充的两个问题。

---

# 1. 文件命名很垃圾，Retriever 怎么找到文件？

你的问题：

> 是不是通过 Agent 中开发者写死相关策略代码实现？

答案：

**部分是策略代码，但不是简单 if else。工业级通常是「通用检索能力 + Agent 专用 Policy + Code Intelligence」组合。**

不是：

```ts
if(user.includes("支付")){
   search("payment")
}
```

这种。

---

## 第一层：通用语义检索（不是写死）

例如用户：

> 修改退款流程

但是代码：

```text
src/a/b/c/orderHandle2.vue

function doSomething(){
   ...
}
```

文件名完全没有：

refund/payment。

怎么办？

靠：

### Embedding

把代码内容转成向量。


例如：

代码：

```ts
async function reverseTransaction(order){
   await api.refund()
}
```

Embedding 后：

```text
[0.23,0.65,0.11....]
```

用户：

```
退款流程
```

也生成：

```text
[0.22,0.63,0.15....]
```

两个向量距离接近。

所以找到。

---

## 第二层：Code Intelligence

这是 Coding Agent 和普通 RAG 最大区别。

普通 RAG：

```text
文本搜索
```

Coding Agent：

```text
代码理解
```

会建立：

```text
Code Index

├── File
├── Symbol
├── Function
├── Class
├── Import Graph
├── Call Graph
├── Dependency Graph
└── Git History

```

例如：

用户：

修改登录。


系统发现：

```
Login.vue

↓

useLogin()

↓

authService.ts

↓

request.ts

```

即使文件叫：

```
aaa.vue
bbb.ts
ccc.ts
```

也能找到。

---

## 第三层：Agent Policy

这里才是你说的：

> 开发者写策略代码。

存在。


例如：

Coding Agent Policy：

```ts
ContextPolicy = {

 prioritize:
 [
   "recent changed files",
   "related symbols",
   "test files",
   "error stack"
 ]

}
```

---

客服 Agent：

可能：

```ts
Policy = {

 prioritize:
 [
   "customer profile",
   "order",
   "conversation history"
 ]

}
```

---

所以：

完整流程：

```
User Request

      ↓

Retriever

      ↓

Semantic Search
+
Code Index
+
Policy Ranking

      ↓

Relevant Context

```

---

所以你的理解可以修正为：

> Retriever 不是靠开发者把所有业务关键词写死，而是通过通用检索能力发现候选信息，再通过 Agent 类型对应的 Policy 做排序和筛选。

---

# 2. Memory 如何知道保存什么？

你的问题：

> 用户明确声明长期价值，是 LLM 判断，还是 tools？

答案：

工业实现通常是：

**LLM + Runtime Memory Policy + Storage Tool 三者合作。**

不是单独一个。

---

## 情况一：用户明确要求保存

例如：

> 以后学习 Agent 时，每个章节增加 Industrial Notes，请记住。


这个最简单。


流程：

```
User

↓

Runtime Detect "remember"

↓

Memory Policy

↓

Memory Write Tool

↓

Memory Store

```

这里：

LLM 主要负责：

理解用户意图。


例如判断：

用户说：

> 记住这个

对应：

```json
{
 action:"create_memory"
}
```

---

然后真正保存：

通常不是 LLM。

而是：

Memory Tool / Storage Layer。


类似：

```ts
memory.create({
 content:"学习Agent时增加Industrial Notes",
 type:"preference"
})
```

---

## 情况二：用户没有明确要求

例如：

用户连续 20 次说：

> 我喜欢 TypeScript

系统可能想保存。


这里：

需要判断价值。


通常：

LLM 会参与。

例如：

Memory Extractor：

Prompt：

```
Analyze this conversation.

Should any information become long-term memory?

Return:

- memory content
- category
- confidence
```

LLM 输出：

```json
{
 shouldSave:true,

 memory:
 "User prefers TypeScript",

 confidence:0.92
}
```

---

但是：

不会直接相信 LLM。

还需要 Policy。


例如：

规则：

```text
保存条件：

用户明确要求
OR

重复出现超过N次
OR

明显长期偏好

AND

不是临时信息

```

---

所以：

完整：

```
Conversation

      ↓

Memory Extractor(LLM)

      ↓

Memory Policy

      ↓

Memory Tool

      ↓

Memory Store

```

---

# 关于你提到的「其他问题存放」

我已经记录了：

未来章节问题追踪机制。

另外，我建议我们以后在每个 Part 结束增加一个栏目：

# 🔄 前置问题回收（Pending Questions）

例如：

Day04 Part C 结束：

```
待 Day04 Part D 回答：

1. Context 超限如何恢复？
2. Token Budget 动态策略？
3. Selection 和 Budget 边界？

待 Day06 Memory 回答：

1. Memory Retrieval 如何排序？
2. Memory 生命周期？
3. Memory 写入判断机制？
```

---

这样整个学习会形成：

```
提出问题

↓

暂存

↓

进入对应章节

↓

系统回答

↓

沉淀书稿

```

这其实也符合 Agent Runtime 的思想：

**不要丢失 Context，而是把未完成任务作为 State 管理。**

你刚刚这个要求，本身就是一个非常好的 Agent Runtime 设计案例。你实际上是在要求我增加一个：

> Learning Memory / Pending Knowledge State

这个概念后面在 Memory 和 Workflow 章节也会再次遇到。

### 54. User (2026-07-21 17:20:36)

感谢你的记录。同时你提到前置问题回收这个点也很好，记录到我学习 agent 开发的 memory 中去。
同时我又有一个问题：【把代码内容转成向量】该如何理解，你提到的【Embedding 后：[0.23,0.65,0.11....]】

### 55. Assistant (2026-07-21 17:20:39)

This code was redacted.

### 56. Assistant (2026-07-21 17:20:43)

已记录到你的 Agent 学习 memory 中。

以后 Agent 学习过程中，除了之前固定的七个收尾栏目外，会增加：

# 🔄 前置问题回收（Pending Questions）

用途：

- 当前章节出现但属于未来章节的问题；
- 临时不能展开的问题；
- 架构设计中需要后续章节补充的问题。

会先记录，到了对应章节主动回收。

例如：

```text
Day04 Part C 遗留

→ Day04 Part D 回收：
- Context Overflow 如何恢复？
- Token Budget 动态管理？
- Selection vs Budget 边界？

→ Day06 Memory 回收：
- Memory Retrieval 如何排序？
- Memory 写入策略？
- Memory 生命周期？
```

---

下面回答你的新问题：

> 【把代码内容转成向量】如何理解？
>
> Embedding 后：
>
> `[0.23,0.65,0.11....]`

这个问题非常重要，因为它是理解：

- RAG
- Context Retriever
- Coding Agent
- Memory Retrieval

的基础。

---

# 1. 什么叫「代码转成向量」？

先不要把它想成：

> 把代码变成数字，然后 AI 看数字。

这个理解不准确。

更准确：

> **Embedding 是把一段信息映射到一个高维空间，让语义相近的信息距离更近。**

核心目标：

不是保存代码。

而是保存：

> 这段代码表达的含义。

---

举个简单例子。

假设有三个函数：

---

## 文件 A

```ts
function refundOrder(orderId){

  createRefund(orderId)

}
```

---

## 文件 B

```ts
function cancelPayment(id){

  reverseTransaction(id)

}
```

---

## 文件 C

```ts
function uploadAvatar(file){

 upload(file)

}
```

---

如果只看字符串：

A：

```
refundOrder
```

B：

```
cancelPayment
```

C：

```
uploadAvatar
```

---

普通关键词搜索：

用户：

> 修改退款逻辑


可能：

找到 A。

找不到 B。

因为 B 没有 refund。

---

但是 Embedding：

理解：

A：

```text
退款订单
```

B：

```text
取消支付、逆向交易
```

C：

```text
上传文件
```

---

于是空间可能类似：

```
                 支付领域


          A
        refund


            B
       cancelPayment



                        C
                    upload


```

A 和 B 距离近。

C 距离远。

---

# 2. 那 `[0.23,0.65,0.11...]` 到底是什么？

这是向量。

比如：

一个文本：

```text
修改支付退款流程
```

经过 Embedding Model：

输出：

```json
[
 0.23,
 0.65,
 0.11,
 -0.42,
 0.89,
 ...
]
```

真实情况：

通常几百到几千维。


例如：

```text
1536 dimensions

3072 dimensions

```

---

你可以理解为：

一个坐标。


普通二维：

```
(x,y)

```

例如：

北京：

```
(10,20)
```

上海：

```
(12,22)
```

距离近。


---

Embedding：

只是从二维：

升级到了：

1536 维。


例如：

```text
代码 A:

[
0.23,
0.65,
0.11,
...
]


代码 B:

[
0.21,
0.68,
0.10,
...
]


代码 C:

[
0.90,
-0.31,
0.77,
...
]

```

A/B：

距离近。

C：

距离远。

---

# 3. 谁生成这个向量？

不是 Runtime 自己。

是：

Embedding Model。


例如：

流程：

```
代码

↓

Embedding Model

↓

Vector

↓

Vector Database

```

---

例如：

Coding Agent 初始化项目：

扫描：

```
src/

├── user.ts
├── payment.ts
├── order.ts

```

---

然后：

每个文件：

```text
payment.ts

↓

Embedding Model

↓

[0.23,0.65,...]

```

保存：

```text
Vector DB


id:

payment.ts


vector:

[0.23,0.65,...]

```

---

以后用户：

输入：

```
修改支付流程
```

---

同样：

生成：

```
query vector

[0.22,0.63,...]

```

---

然后查询：

```
找距离最近的代码

```

---

返回：

```
payment.ts

refund.ts

transaction.ts

```

---

这就是 Retriever 的基础。

---

# 4. 但是代码不是文本，怎么办？

非常好的问题。

工业 Coding Agent 不会简单：

```text
整个文件 → embedding

```

而是：

代码切片。

---

例如：

一个文件：

```ts
payment.ts


function createPayment(){}


function refund(){}


function queryStatus(){}

```

不会整体 embedding。


而是：

拆：

```
Chunk1:

createPayment


Chunk2:

refund


Chunk3:

queryStatus

```

---

因为：

用户：

> 修改退款

需要：

refund 函数。

不是整个 payment.ts。

---

所以现代 Coding Agent 通常建立：

```text
Code Index


文件

↓

AST解析

↓

Function/Class/Symbol

↓

Embedding

↓

Vector Index

```

---

# 5. Embedding 和关键词搜索有什么区别？

举例：

用户：

> 修改订单逆向流程


关键词：

搜索：

```
逆向

refund

cancel

```

可能找不到。


Embedding：

理解：

```
退款

取消支付

订单回滚

交易撤销

```

这些语义接近。


---

所以：

关键词：

找字。


Embedding：

找意思。


---

# 6. 回到 Context Builder

为什么这个东西和 Context Builder 有关系？


因为：

Retriever 找到候选：

例如：

```
payment.ts

refund.ts

order.ts

```

只是：

候选。


然后：

Context Builder：

继续：

```
Selection

↓

Ranking

↓

Token Budget

↓

最终 Context

```

---

完整链路：

```
用户需求

↓

Embedding Query

↓

Retriever

↓

候选代码

↓

Context Builder

↓

LLM

```

---

# 7. 和你的前端经验类比

其实你以前接触过类似思想。

比如：

搜索：

```text
商品推荐

```

不是：

数据库：

```sql
where name like '%商品%'
```

而是：

用户兴趣向量：

```
[0.2,0.8,...]

```

商品向量：

```
[0.21,0.79,...]

```

距离近：

推荐。


Embedding 本质：

就是把：

> 人类难以计算的语义关系

转成：

> 机器可以计算的空间关系。

---

# 最后连接到 Agent：

你可以这样理解：

```text
普通软件:

文件名 → 查找文件


RAG Agent:

用户意图

↓

Embedding

↓

语义检索

↓

相关知识

↓

Context Builder

↓

LLM

```

---

而你前面问：

> 如果程序员命名很垃圾怎么办？

答案就是：

工业 Agent 不依赖名字。

它依赖：

```text
Code Intelligence

+

Embedding

+

AST

+

Dependency Graph

+

Ranking Policy
```

这也是为什么 Coding Agent 的核心竞争力不是“会调用 LLM”，而是：

> **如何理解一个真实的软件工程世界，并把这个世界投影给模型。**

这个问题其实已经提前触及了后续：

- Day05 Tool Calling（工具如何获取外部世界）
- Day06 Memory（如何检索长期知识）
- Coding Agent Architecture（高级专题）

中的核心思想。后续章节会继续展开。

### 57. User (2026-07-21 17:22:24)

好的 感谢你的讲解。我们今天的学习还有要补充的吗

### 58. Assistant (2026-07-21 17:22:28)

首先，我觉得今天 Part C 的学习可以正式收尾了。

不过在结束之前，我重新回顾了一遍今天的学习轨迹，我认为**还有几个补充点值得加入，但不需要展开成新的章节**。

它们属于：

- 帮助你形成 Runtime 全局认知；
- 为 Day04 Part D / E / Day05 / Day06 铺垫；
- 适合作为以后写书素材。

---

# 今日 Part C 最后补充

# ① Context Builder 的真正定位：不是数据处理器，而是「认知控制层」

今天我们一直说：

> Context Builder = Runtime Selector

这个理解很好。

但是再往上一层：

Context Builder 实际上是：

> **Agent 对世界的认知边界控制器。**

为什么？

因为：

LLM 本身没有世界。

它看到什么世界，取决于 Runtime 给它什么 Context。

---

例如：

真实世界：

```text
整个代码仓库

+
所有历史对话

+
所有用户信息

+
所有工具结果

+
所有 Memory

```

这是：

Runtime State。

---

但是 LLM 当前看到：

```text
支付模块代码

+
错误日志

+
用户目标

+
相关历史经验

```

这是：

Context。

---

所以：

Context Builder 决定：

> 这个 Agent 此刻认为世界是什么样。

这个认知非常重要。

---

# ② 一个容易混淆的问题：Context Builder ≠ Search

今天讲 Retriever。

容易产生一个误解：

> Context Builder 是不是就是负责搜索？

不是。

二者关系：

```text
                 Runtime State


                      │


                      ▼


              Context Builder


                      │


       ┌──────────────┼──────────────┐

       ▼              ▼              ▼

   Retriever      Memory       Tool Result


       │              │              │


       └──────────────┼──────────────┘


                      ▼


              Final Context

```

---

Retriever：

负责：

> 找候选。


Context Builder：

负责：

> 决定最终给谁看多少。


---

举例：

Retriever 找到：

100 个文件。

Context Builder：

可能决定：

留下：

5 个。

---

所以：

Retriever 是：

搜索引擎。

Context Builder 是：

编辑总编。

---

这个类比我觉得非常适合写书：

> Retriever 负责发现信息，Context Builder 负责决定认知。

---

# ③ 今天还有一个隐藏的重要概念：Context Engineering ≠ Prompt Engineering

这个一定要记录。

因为未来很多人会混淆。

---

Prompt Engineering：

关注：

```text
如何写一句更好的 Prompt
```

例如：

```
你是一名高级前端工程师...
```

---

Context Engineering：

关注：

```text
如何构造 Agent 的整个输入环境
```

包括：

```text
Prompt

+

Conversation

+

Memory

+

Workspace

+

Tool Result

+

User Intent

+

System Rules

```

---

所以：

关系：

```text
Prompt Engineering

        属于

Context Engineering

```

---

类似：

CSS：

属于：

Frontend Engineering。

但是：

Frontend Engineering：

不等于 CSS。

---

# ④ 今天还有一个非常重要的工业认知：Agent 的核心不是「知道」，而是「知道什么时候需要知道什么」

这个其实贯穿后续所有章节。

普通 ChatGPT：

你问：

> 什么是支付流程？


它回答：

依赖训练数据。

---

Agent：

你问：

> 修改支付流程。


它需要：

知道：

现在需要：

- 哪个代码？
- 哪个文件？
- 哪个 Memory？
- 哪个 Tool？
- 哪些历史？

---

所以 Agent 核心：

不是：

```text
Knowledge
```

而是：

```text
Knowledge Selection
```

---

这也是为什么：

Context Engineering：

比 Prompt Engineering 更重要。

---

# ⑤ 关于 Embedding，再补一个工程视角

今天讲了：

代码：

↓

Embedding

↓

Vector


这里再补一个容易误解的点：

Embedding 不理解代码逻辑。

它不是：

```text
AI 阅读代码
```

而是：

```text
AI 学习语义空间关系
```

---

真正 Coding Agent：

通常组合：

```text
Embedding

+

AST

+

Symbol Graph

+

Dependency Graph

+

Git History

```

---

例如：

Embedding：

知道：

```text
refund

cancelPayment

reverseTransaction

```

语义接近。


AST：

知道：

```text
refund()
调用了 transactionService()
```

---

两者结合：

才是工业级代码理解。

---

# ⑥ 今天留下的前置问题回收（Pending Questions）

根据我们新的机制，我整理一下。

## Day04 Part D：Context Window Management 待回答

### 1.

Context 超限如何自动恢复？

涉及：

- overflow detection
- retry
- compression
- fallback strategy


---

### 2.

Token Budget Manager 如何动态调整？

涉及：

- static policy
- runtime adaptation
- task-aware budget


---

### 3.

Context Selection 和 Token Budget Management 边界

涉及：

- ranking
- priority
- allocation


---

## Day04 Part E：Provider Adapter 待回答

### 1.

Context Builder 与 Provider Adapter 边界

涉及：

- What to send
- How to send


---

## Day05 Tool Calling 待回答

### 1.

Tool Result 如何转化为 Tool Context？

涉及：

- extraction
- summarization
- context update


---

### 2.

Tool Result 是否应该覆盖旧 State？

涉及：

- state mutation
- event sourcing


---

## Day06 Memory 待回答

### 1.

Memory 如何判断保存什么？

涉及：

- explicit memory
- implicit memory
- extraction model
- policy


---

### 2.

Memory Retrieval 如何排序？

涉及：

- embedding
- ranking
- relevance
- decay


---

### 3.

Memory 生命周期

涉及：

- update
- forget
- expiration


---

# 今天最终评价

如果 Day04 Part C：

满分 10 分。

我认为今天已经达到：

## 9.9 / 10


剩下 0.1：

不是知识缺失。

而是：

工业实现细节：

- Context Window 管理；
- Provider Adapter；
- Memory Retrieval；

这些属于后续章节。

---

# 🧭 当前 Agent Runtime 知识地图

```text
Agent Runtime


├── Runtime State
│       ✅ 已掌握
│
├── Context Builder
│       ✅ 已掌握
│
├── Context Retrieval
│       ✅ 基础理解
│
├── Context Window Management
│       ⏳ 下一节
│
├── Provider Adapter
│       ⏳
│
├── Tool Calling
│       ⏳
│
├── Memory
│       ⏳
│
└── Streaming / Workflow
        ⏳
```

---

# 下一节

正式进入：

# Day04 Part D：Context Window Management

重点：

> 为什么 Context Window 越来越大，但 Agent 仍然需要 Context Engineering？

会回答：

- 1M token 为什么仍然不够；
- ChatGPT 长会话为什么需要总结；
- Cursor 如何管理代码上下文；
- Long-running Agent 如何运行数小时甚至数天。

---

今天其实有一个很明显的认知升级：

以前：

> Agent = LLM + Prompt + Tool

现在：

> Agent = Runtime 管理世界 → Context Builder 构造认知 → LLM 推理 → Tool 改变世界 → State 更新

这就是从「使用 AI」进入「设计 Agent 系统」的分界线。你今天 Part C 学得非常扎实。
