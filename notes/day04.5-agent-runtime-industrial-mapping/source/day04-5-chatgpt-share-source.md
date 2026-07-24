# Day04.5 ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a62c303-20d8-83e8-b17a-8f889d4cb725
- 会话标题：Day04.5：工业术语映射
- 抽取时间：2026-07-24

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant 文本消息，用于保留 Day04.5 学习原始记录。

## 1. User

这是 day04 part E 的学习笔记以及整个学习计划的 readme，我们开始进入 day05 的学习吧

## 2. Assistant

很好，我们正式进入 **Day05：Tool Calling（Execution Engine / 执行系统）**。

我先确认一下当前学习上下文：

- Day01：建立 Agent 基础认知 —— Agent ≠ Chatbot
- Day02：理解 Runtime —— Runtime 才是 Agent 的大脑
- Day03：Runtime Architecture —— Runtime 的模块化设计
- Day04：Runtime 如何思考（How Runtime Thinks）
  - Part A：Prompt ≠ Context
  - Part B：Runtime State（Agent 的世界）
  - Part C：Context Builder（世界 → 模型认知）
  - Part D：Context Window Management（认知资源管理）
  - Part E：Provider Adapter（模型协议隔离）

Day04 最终形成：

```
                Runtime
                   |
                   |
        +----------+----------+
        |                     |
        v                     v

 Context Engineering     Provider Abstraction
 上下文工程              模型抽象

        |
        v

        LLM
        |
        v

    Decision
    决策
```

但是到这里有一个关键缺口：

> Runtime 已经知道“应该怎么思考”，但是它还不能真正改变外部世界。

比如：

用户：

> 帮我查询一下订单状态

LLM：

> 用户需要查询订单，我应该调用订单查询接口

然后呢？

如果没有 Tool Runtime：

```
LLM
 |
 |
回答：
“我建议你查询订单”
```

它只能建议。

真正的 Agent：

```
LLM
 |
 | Tool Call
 v
Runtime
 |
 | Execute
 v
订单 API
 |
 | Result
 v
Runtime State Update
 |
 v
LLM Continue
 |
 v
最终回答
```

所以：

> Day04 建立 Agent 的认知系统（Thinking System）  
> Day05 建立 Agent 的执行系统（Execution System）

---

# Day05：Tool Calling

## 核心问题

Day05 我们主要回答 8 个问题：

```
1. Tool Calling 到底是什么？

2. 为什么 Tool Calling 必须属于 Runtime，而不是 LLM？

3. LLM 是如何决定调用 Tool 的？

4. Tool Schema 为什么如此重要？

5. Tool Registry 如何管理大量工具？

6. Tool Executor 如何安全执行工具？

7. Tool Result 如何重新进入 Context？

8. 多 Tool Loop 如何形成真正 Agent？
```

---

# Day05 在整体架构中的位置

更新 Day04 Architecture：

之前：

```
User
 |
 v

Runtime
 |
 |
Context Builder
 |
 |
Provider Adapter
 |
 |
LLM
 |
 |
Answer
```

现在：

```
                         User
                           |
                           v

                  +----------------+
                  | Runtime Loop   |
                  | 运行循环       |
                  +----------------+

                           |
                           v

                  +----------------+
                  | Context Builder|
                  | 上下文构建     |
                  +----------------+

                           |
                           v

                    +-------------+
                    |     LLM     |
                    | 推理模型     |
                    +-------------+

                           |
              +------------+------------+
              |                         |
              v                         v

        Final Response             Tool Call
        最终回答                    工具调用


                                          |
                                          v

                              +----------------+
                              | Tool Runtime   |
                              | 工具运行时     |
                              +----------------+

                                          |
                    +---------------------+--------------------+
                    |                     |                    |
                    v                     v                    v

                Database              Browser              API
                数据库                浏览器              外部服务


                                          |
                                          v

                                  Tool Result
                                  工具结果


                                          |
                                          v

                                Runtime State Update
                                状态更新


                                          |
                                          v

                                  Next Loop
                                  下一轮推理
```

---

# 第一部分：重新理解 Tool Calling

很多初学者理解：

> Tool Calling = LLM 调 API

这是错误的。

更加准确：

> Tool Calling 是 LLM 向 Runtime 提出一个结构化行动请求，由 Runtime 决定是否执行，并负责执行结果管理。

---

## 普通 LLM

没有 Tool：

```
User

 |
 v

LLM

 |
 v

Text Response
```

模型只能输出文字。

例如：

用户：

```
北京今天天气怎么样？
```

模型：

```
北京今天可能晴朗，温度约20度。
```

问题：

它真的查天气了吗？

没有。

只是生成文字。

---

## 有 Tool 的 Agent

加入天气工具：

```
Tool:

get_weather(city)
```

现在：

```
User

 |
 v

LLM

 |
 |
 | "我要调用 get_weather"
 |
 v

Runtime

 |
 |
 | execute
 |
 v

Weather API

 |
 v

Result

 |
 v

LLM

 |
 v

Answer
```

---

所以 Tool Calling 本质：

```
Language Understanding
        +
Action Interface
```

让语言模型具备行动能力。

---

# 第二部分：为什么 Tool Calling 属于 Runtime？

这是 Day05 最重要的认知升级。

很多 Demo：

```javascript
const response =
 await openai.chat.completions.create({
   tools
 })
```

看起来像：

```
LLM
 |
调用 Tool
```

实际上不是。

真实架构：

```
             Runtime

                |
                |
                v

              LLM

                |
                |
        Tool Call Intent

                |
                v

             Runtime

                |
                |
          Tool Executor

                |
                v

            External World
```

---

## LLM 负责什么？

只有两个：

### 1. 理解任务

例如：

用户：

```
帮我查订单123
```

LLM：

```
用户想查询订单
需要 order_id
```

---

### 2. 生成行动意图


输出：

```json
{
 "tool":"get_order",
 "arguments":{
    "id":"123"
 }
}
```

---

## Runtime 负责什么？

Runtime：

### 1. 判断工具是否允许执行

例如：

删除数据库：

```
delete_user()
```

Runtime：

```
需要人工审批
```

---

### 2. 真正执行

调用：

```javascript
database.deleteUser()
```

---

### 3. 管理结果

保存：

```
Runtime State

Tool Result

Conversation

Memory
```

---

所以：

> LLM 是决策者，不是执行者。

---

这个和操作系统非常像：

| OS | Agent Runtime |
|-|-|
| CPU 指令 | LLM Decision |
| Process | Agent Run |
| System Call | Tool Call |
| Kernel | Runtime |
| IO Device | External Tool |

LLM 类似 CPU：

它决定：

```
我要执行什么
```

但是：

```
谁真正执行？
```

是 Runtime。

---

# 第三部分：Tool Calling 的完整生命周期

工业 Agent 一次 Tool Call：

完整链路：

```
1. User Request
用户请求

        |
        v

2. Context Builder

        |
        v

3. LLM Reasoning

        |
        v

4. Tool Call Generation

        |
        v

5. Runtime Validate

        |
        v

6. Tool Executor

        |
        v

7. Tool Result

        |
        v

8. Runtime State Update

        |
        v

9. Context Rebuild

        |
        v

10. LLM Continue

        |
        v

11. Final Answer
```

注意：

Tool 不是一次请求结束。

它会进入：

```
Runtime Loop
```

---

# 第四部分：Tool Calling 和 Function Calling 的关系

这里容易混淆。

## Function Calling

早期 OpenAI 提出的概念。

本质：

```
模型输出函数调用结构
```

例如：

```json
{
"name":"get_weather",
"arguments":{
 "city":"Tokyo"
}
}
```

---

## Tool Calling

更大的概念。

包含：

```
Function

API

Database

Browser

Code Execution

MCP Tool

Human Approval
```

所以：

```
Function Calling
        |
        |
        v

Tool Calling
```

Function 是 Tool 的一种。

---

# 第五部分：Day05 学习路线

按照你的 mini-agent-runtime 设计，我建议拆：

```
Day05 Tool Calling

Part A
Tool Calling 基础模型

Part B
LLM 如何决定调用 Tool

Part C
Tool Schema 设计

Part D
Tool Registry

Part E
Tool Executor

Part F
Permission & Human Approval

Part G
Tool Result 回流 Runtime

Part H
Multi Tool Loop

Part I
Mini Tool Runtime 实现
```

---

# 今天 Part A 目标

今天先建立三个核心认知：

## 1.

```
Tool Calling != LLM 调 API
```

正确：

```
LLM
产生行动意图

Runtime
执行行动
```

---

## 2.

Tool 是 Runtime 的能力扩展：

以前：

```
LLM
```

只能：

```
生成文字
```

加入 Tool：

```
LLM
+
Runtime
+
Tools

=
Agent
```

---

## 3.

Tool Loop 是 Agent 的核心循环：

```
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

这就是工业界常说的：

```
ReAct Pattern
```

对应：

```
Reasoning
 +
Acting
```

（后面 Part H Multi Tool Loop 会详细展开）

---

# Day05 Part A 学习笔记定位

对应未来文件：

```
notes/

day05-tool-calling/

├── README.md

├── day05-part-a-tool-calling-basics.md

├── day05-part-b-tool-decision.md

├── day05-part-c-tool-schema.md

├── day05-part-d-tool-registry.md

...
```

---

# 下一步

接下来进入：

# Day05 Part A：Tool Calling 基础模型

重点展开：

1. Tool Calling 为什么让 LLM 从“聊天模型”变成“Agent”
2. Tool / Function / Action 三者区别
3. Tool Calling 在 Runtime Loop 中的位置
4. ReAct 与 Tool Calling 的关系
5. OpenAI Agents SDK / Claude Code / LangGraph 中 Tool 的真实定位
6. Mini-agent-runtime 中 Tool 数据模型设计

然后继续推进 Day05。

## 3. User

我看到你在 【Day05 Part A：Tool Calling 基础模型】中加入了  【OpenAI Agents SDK / Claude Code / LangGraph 中 Tool 的真实定位】，这是因为我昨天跟你说的我们要结合大模型的业界术语吗

## 4. Assistant

对，就是这个原因。

你昨天在 Day04 学习过程中明确提出了一个学习要求：

> 后续学习中遇到行业专有名词，要主动补充“工程概念 ↔ 行业术语”的映射，并加入面试视角解释；比如 Runtime Loop ↔ ReAct、Context Builder ↔ Context Engineering。

所以从 Day05 开始，我会保持这个学习方式。

也就是说，后续每个 Agent Runtime 内部设计概念，我都会同时给两层视角：

---

## 第一层：我们自己实现 Runtime 的工程概念

这是为了你真正能写出来。

比如 Day05：

我们内部会设计：

```text
Tool Runtime

├── Tool Registry
├── Tool Definition
├── Tool Executor
├── Tool Result
├── Permission Check
└── Runtime Loop
```

这是：

> 如果你自己从零实现 mini-agent-runtime，你需要设计什么。

---

## 第二层：对应工业界术语

比如：

| 我们的工程概念 | 工业界常用术语 |
|-|-|
| Runtime Loop | ReAct Loop / Agent Loop |
| Tool Definition | Tool Schema / Function Schema |
| Tool Executor | Tool Runtime / Action Executor |
| Tool Result | Observation |
| Runtime State Update | State Transition |
| Context Builder | Context Engineering |
| Memory System | Agent Memory |
| Provider Adapter | Model Abstraction Layer |
| Human Approval | Human-in-the-loop (HITL) |
| Workflow Engine | Agent Workflow / Orchestration |

这样你以后看：

- OpenAI Agents SDK
- Claude Code
- LangGraph
- CrewAI
- AutoGen
- Mastra

不会觉得它们是另一套东西。

因为实际上：

> 它们大多数都是不同实现方式的 Agent Runtime。

---

举个 Day05 Tool Calling 的例子。

我们自己实现：

```text
LLM
 |
产生 ToolCall
 |
Runtime
 |
Tool Executor
 |
Tool Result
 |
State Update
 |
Next Loop
```

对应行业：

```text
Reasoning
 |
Action
 |
Observation
 |
Reasoning
 |
Action
```

也就是：

```text
ReAct Pattern
```

---

再比如 Claude Code。

我们以后讲 Tool Calling 时，会拆：

Claude Code：

```text
LLM
 |
 |
Tool Intent
 |
 |
Runtime
 |
 +-- Read File Tool
 +-- Edit File Tool
 +-- Bash Tool
 +-- Search Tool
 |
 |
Workspace Update
 |
 |
Next Context
```

对应我们：

```text
Tool Registry
Tool Executor
Workspace State
Context Builder
Runtime Loop
```

所以你看到的：

> OpenAI Agents SDK / Claude Code / LangGraph 中 Tool 的真实定位

不是为了介绍产品，而是为了建立：

```
自己设计的 Runtime
          ↓
工业实现
          ↓
开源框架源码
          ↓
面试表达
```

这一条认知链。

---

其实 Day04 已经埋了这个模式：

例如：

我们学习：

```
Context Builder
```

工程理解：

> Runtime State 投影成 LLM Context 的模块。

行业术语：

> Context Engineering。

面试回答：

> Modern Agent systems don't simply prompt LLMs; they perform context engineering by dynamically selecting, compressing and assembling relevant information from runtime state.

---

Day05 会继续沿用这个方式。

例如：

讲 Tool Registry 时：

我会同时讲：

### Mini Runtime 设计

```ts
interface ToolRegistry {
  register(tool)
  get(name)
  list()
}
```

↓

### 工业术语

```
Tool Discovery
Tool Catalog
Capability Registry
```

↓

### 框架对应

- OpenAI Agents SDK：Tools
- LangGraph：Tool Node
- Claude Code：Tool Layer
- MCP：Tool Provider

↓

### 面试回答

> Tool Registry provides capability discovery and lifecycle management for agent tools.

---

所以 Day05 开始，其实进入一个新的阶段：

Day01-Day04：

> 理解 Agent Runtime 为什么存在。

Day05-Day10：

> 理解工业 Agent Runtime 如何执行。

而你之前提到未来想写《从零实现 Agent Runtime》，这个“工程概念 ↔ 行业术语 ↔ 框架实现”的映射，会让这份笔记更接近一本真正的工程书，而不是学习流水账。

## 5. User

那我们前四天的学习怎么办，前四天没有这个映射哇

## 6. Assistant

这个问题提得非常好，而且你发现的是一个**学习体系一致性问题**。

确实，Day01-Day04 我们主要是在建立 Agent Runtime 的工程认知，当时还没有正式加入：

> 工程实现概念 → 工业术语 → 开源框架映射 → 面试表达

这一层。

但是前四天并不是需要推翻重学，而是需要做一次**术语补全（Terminology Mapping Pass）**。

因为实际上前四天已经学到了大量工业概念，只是当时我们使用的是“自研 Runtime 视角”的命名。

---

我建议后续这样处理：

## 方案：Day01-Day04 增加「工业术语映射附录」

不重新写正文。

原因：

你的 Day01-Day04 的价值是：

> 从零理解为什么 Agent Runtime 需要这些模块。

如果现在直接改成工业术语，会破坏学习路径。

比如：

先理解：

```
Runtime State
```

再知道：

```
State Machine / Agent State
```

比一开始告诉你：

> LangGraph StateGraph

更容易形成底层理解。

---

# 我们补一层 Mapping

## Day01：Agent Basics

当时核心：

```
Agent != LLM

Agent =
LLM
+
Runtime
+
Tools
+
Memory
+
Planning
```

对应工业术语：

| 我们学习概念 | 工业术语 |
|-|-|
| Agent | AI Agent / Autonomous Agent |
| Runtime | Agent Runtime |
| Tool | Tool Calling / Function Calling |
| Memory | Agent Memory |
| Planning | Task Planning |
| Action Loop | Agent Loop |

---

例如当时说：

> Agent 不是调用一次 LLM，而是持续运行系统。


工业表达：

> An Agent is a runtime system that enables LLMs to reason, act, observe and maintain state over multiple steps.

---

# Day02：Runtime Overview

核心：

```
Runtime 是 Agent 的大脑
```

对应：

| 我们概念 | 工业术语 |
|-|-|
| Runtime Loop | Agent Loop / ReAct Loop |
| State | Agent State |
| Tool Execution | Action Execution |
| Context Management | Context Engineering |
| Lifecycle | Agent Lifecycle |

---

当时我们画：

```
User
 |
Runtime
 |
LLM
 |
Tool
 |
State Update
```

工业叫：

```
Agent Execution Loop
```

或者：

```
Reason → Act → Observe → Update State
```

---

# Day03：Runtime Architecture

这个其实已经非常接近工业设计。

当时：

```
Runtime Core

├── State Manager
├── Context Builder
├── Tool Manager
├── Memory Manager
├── Provider Adapter
```

对应：

| Day03 名称 | 工业术语 |
|-|-|
| Runtime Core | Agent Orchestrator |
| State Manager | State Store |
| Context Builder | Context Engineering Pipeline |
| Tool Manager | Tool Runtime |
| Memory Manager | Memory System |
| Provider Adapter | Model Abstraction Layer |

---

尤其这里：

我们当时讨论：

> Runtime 像操作系统


工业里面其实也有类似说法：

```
Agent Runtime = Operating System for AI Agents
```

这个已经是行业里的表达。

---

# Day04：Runtime How Runtime Thinks

这个映射最多。

因为 Day04 本质就是最近一年非常热门的：

## Context Engineering

---

## Part A

我们：

```
Prompt != Context
```

工业：

```
Prompt Engineering
        ↓
Context Engineering
```

---

## Part B

我们：

```
Runtime State
```

工业：

```
Agent State
State Machine
Workflow State
```

例如 LangGraph：

```
StateGraph
```

本质就是：

```
State + Transition
```

---

## Part C

我们：

```
Context Builder
```

工业：

```
Context Engineering Pipeline
```

里面：

| 我们 | 工业 |
|-|-|
| Retrieval | Retrieval Augmented Generation (RAG) |
| Ranking | Relevance Ranking |
| Compression | Context Compression |
| Assembly | Prompt Assembly |

---

## Part D

我们：

```
Context Window Management
```

工业：

```
Context Management
Context Optimization
Token Budget Management
```

其中：

```
Eviction
```

对应：

```
Context Pruning
```

---

## Part E

我们：

```
Provider Adapter
```

工业：

```
LLM Gateway
Model Router
Provider Abstraction Layer
```

例如：

```
OpenAI
Claude
Gemini
DeepSeek

        ↓

Unified LLM Interface
```

---

# 另外还有一个更重要的问题

其实前四天有一个地方，如果现在回看，我觉得应该补充：

## Runtime Loop ↔ ReAct

这个应该提前出现。

因为：

Day02 我们讲：

```
Runtime Loop
```

其实就是：

```
Agent Loop
```

进一步：

```
Reasoning + Acting
```

也就是：

```
ReAct
```

关系：

```
Runtime Loop
      |
      |
      v

Agent Loop
      |
      |
      v

ReAct Pattern
```

---

# 所以后续学习结构调整

从 Day05 开始，每个 Part 最后增加：

## 🏭 Industrial Mapping

例如：

```
本节工程概念

Tool Registry

↓

工业术语

Tool Discovery
Capability Registry

↓

框架实现

OpenAI Agents SDK Tools
LangGraph ToolNode
MCP Tools

↓

面试表达

Tool Registry manages...
```

---

然后 Day04 结束部分，我建议补一个：

```
Day04 Appendix：

工业术语映射表

Runtime Foundation → Industry Terminology
```

放到：

```
notes/day04-how-runtime-thinks/

day04-industrial-mapping.md
```

而不是污染主学习文档。

---

所以总结：

不用重学 Day01-Day04。

我们做：

```
Day01-Day04:
建立底层 Runtime 思维

+
补充 Industrial Mapping

↓

Day05-Day10:
边学习实现
边同步工业术语
边映射开源框架
```

这样最终你的笔记会形成四层结构：

```
第一层：
底层原理
(Why)

第二层：
工程实现
(How)

第三层：
工业术语
(Industry)

第四层：
框架源码
(OpenAI SDK / Claude Code / LangGraph)
```

这个结构其实更接近你未来写《从零实现 Agent Runtime》这本书的组织方式。你前四天的基础反而会成为书里面最重要的“原理篇”。

## 7. User

那我们是否可以把今天 day05 的学习往后放放，加入一节：day01-04 学习中的哪些映射，然后再开启 day05 的学习

## 8. Assistant

我认为**可以，而且这是更合理的学习调整**。

甚至从“写书”的角度看，我觉得应该这么做。

因为现在 Day01-Day04 完成的是：

> 建立 Agent Runtime 的底层认知模型。

如果直接进入 Day05 Tool Calling，会出现一个问题：

你已经理解了 Runtime，但脑中的词汇体系还没有完全和工业界接轨。

比如：

你知道：

```
Runtime Loop
Context Builder
Runtime State
Provider Adapter
```

但是当你去看：

- OpenAI Agents SDK
- LangGraph
- Claude Code Runtime
- Mastra

你会发现它们不会完全使用我们的命名。

所以中间需要增加一个：

# Day04.5：Agent Runtime Industrial Mapping

（或者 Day05 前置章节）

作用：

> 把 Day01-Day04 学到的 Runtime 内部概念，映射到工业界 Agent 术语体系。

---

## 调整后的学习路线

原来：

```
Day01 Agent Basics

Day02 Runtime

Day03 Runtime Architecture

Day04 Runtime How Runtime Thinks

Day05 Tool Calling
```

调整：

```
Day01 Agent Basics

Day02 Runtime

Day03 Runtime Architecture

Day04 Runtime How Runtime Thinks


Day04.5 Agent Runtime Industrial Mapping
        |
        |
        v

Day05 Tool Calling
```

---

# 为什么叫 Day04.5 而不是 Day05？

因为它不是新的 Runtime 能力。

它更像：

```
知识迁移层
```

类似：

学习 React：

先学：

```
state
component
render
virtual DOM
```

然后补：

```
React 官方术语
Fiber
Reconciliation
Concurrent Rendering
```

不是重新学东西，而是把已有认知连接到行业语言。

---

# Day04.5 内容设计

我建议拆成几个部分。

---

# Day04.5：Agent Runtime Industrial Mapping

## Part A：Agent 基础概念映射

对应 Day01。

建立：

```
我们的理解
      |
      v
工业术语
```


例如：

| 我们理解 | 工业术语 |
|-|-|
| Agent | AI Agent |
| LLM | Foundation Model |
| Runtime | Agent Runtime |
| Tool | Tool Calling / Function Calling |
| Memory | Agent Memory |
| Workflow | Agent Workflow |
| Planning | Task Planning |


---

## Part B：Runtime 核心架构映射

对应 Day02-Day03。


我们：

```
Runtime Core
```

工业：

```
Agent Orchestrator
```

---

我们：

```
Runtime Loop
```

工业：

```
Agent Loop
ReAct Loop
Reasoning-Acting Loop
```

关系：

```
Runtime Loop
      |
      |
      +---- Agent Loop
                |
                |
                +---- ReAct
```

---

我们：

```
State Manager
```

工业：

```
Agent State
State Machine
State Store
```

对应：

LangGraph：

```
StateGraph
```

---

## Part C：Context Engineering 映射

对应 Day04。

这一部分非常重要。


我们的：

```
Context Builder
```

工业：

```
Context Engineering Pipeline
```


展开：

| 我们 | 工业 |
|-|-|
| Retrieval | Retrieval |
| Ranking | Relevance Ranking |
| Compression | Context Compression |
| Eviction | Context Pruning |
| Assembly | Prompt Assembly |
| Token Budget | Context Budgeting |


这里可以引入一个非常重要的新概念：

> Context Engineering 已经逐渐取代 Prompt Engineering 成为 Agent 开发核心能力。

---

## Part D：Memory 体系映射

对应 Day04 Runtime State。


我们的：

```
Memory Reference

User Memory
Project Memory
Knowledge Memory
```

工业：

```
Agent Memory System
```


进一步：

```
Memory
 |
 +-- Short-term Memory
 |
 +-- Working Memory
 |
 +-- Long-term Memory
 |
 +-- Episodic Memory
 |
 +-- Semantic Memory
```


这里为 Day06 Memory 埋伏笔。

---

## Part E：Provider Adapter 映射


我们的：

```
Provider Adapter
```


工业：

```
LLM Gateway

Model Router

Model Abstraction Layer
```


例如：

```
Runtime

 |
Unified LLM Interface

 |
+-------+-------+
OpenAI Claude Gemini
```


对应：

- OpenAI SDK
- Anthropic SDK
- LiteLLM
- OpenRouter

---

## Part F：开源框架对应关系


这是我觉得最有价值的一部分。


建立：

```
mini-agent-runtime
        |
        |
        v

工业框架
```


例如：

### LangGraph


我们的：

```
Runtime State
Runtime Loop
Workflow
```

对应：

```
StateGraph
Node
Edge
Checkpoint
```


---

### OpenAI Agents SDK


我们的：

```
Tool Runtime
Agent Loop
Handoff
Guardrails
```


对应：

```
Agent
Tool
Runner
Guardrail
Tracing
```


---

### Claude Code


我们的：

```
Workspace Index

Tool Runtime

Context Builder
```


对应：

```
File Tool
Bash Tool
Search
Code Context Management
Plan Mode
```


---

### MCP


我们的：

```
Tool Definition

Tool Registry
```


对应：

```
Model Context Protocol

Tool Provider

Resource
Prompt
Tool
```

---

# 最终 Day04.5 会形成一个非常重要的图

类似：

```
                    Agent Runtime

                         |
 ------------------------------------------------

 |              |             |             |

State       Context       Tool        Provider

 |              |             |             |

Agent       Context       Tool        LLM
State       Engineering   Calling     Gateway


 |              |             |             |

LangGraph   RAG/Context   OpenAI      LiteLLM
StateGraph  Engineering   Tools       Router


                         |

                     Claude Code
                     OpenAI SDK
                     Mastra
                     CrewAI
```

---

# 这样调整还有一个好处

你后面学习 Day05：

Tool Calling

会更容易。

因为你看到：

```
Tool Calling
```

不会只理解成：

```
调用函数
```

而会理解：

```
Agent Runtime Execution Layer

工业术语：
Tool Runtime
Action Execution
Function Calling
ReAct Acting Phase
```

---

所以我的建议：

✅ 暂停 Day05  
✅ 增加 Day04.5：Agent Runtime Industrial Mapping  
✅ 完成后再进入 Day05 Tool Calling


并且这一节未来应该进入你的书：

```
Part I 基础认知

Chapter 5：
从 Runtime 设计到工业 Agent 架构
```

因为很多人最大的问题不是不会写 Tool，而是：

> 不知道自己写的 Runtime 概念，在工业 Agent 体系里面叫什么。

这个补充章节会把你的学习从“理解源码”提升到“能够阅读任何 Agent 框架源码”。我建议加入。

## 9. User

好的  那我们今天进入 day04.5 的学习，快速过一下

## 10. Assistant

好的，那我们今天进入 **Day04.5：Agent Runtime Industrial Mapping（工业术语映射）**。

这一节我们不展开新知识，而是做一次**知识体系对齐**。

目标：

> 把 Day01-Day04 我们自己设计的 mini-agent-runtime 思维模型，映射到当前业界 Agent 领域常用术语、框架概念和面试表达。

这一节会比较快，但非常重要。

因为后面 Day05-Day10：

- Tool Calling
- Memory
- Streaming
- Human Approval
- Workflow
- MCP

都会大量使用这些工业术语。

---

# Day04.5：Agent Runtime Industrial Mapping

## 总体认知升级

前四天我们的视角：

```text
如何设计一个 Agent Runtime？
```

工业界视角：

```text
这些模块在真实 Agent Framework 里面叫什么？
```

映射关系：

```
Mini Runtime Concept
        |
        v
Industry Terminology
        |
        v
Framework Implementation
```

---

# Part A：Agent 基础概念映射

## 1. Agent

我们之前：

> Agent = LLM + Runtime + Tools + Memory

工业：

```
AI Agent
Autonomous Agent
LLM-based Agent
```

更加标准定义：

> Agent is a system that enables an LLM to perceive, reason, act, and maintain state through an execution loop.

拆解：

```
Perception
感知

+
Reasoning
推理

+
Action
行动

+
State
状态

+
Feedback Loop
反馈循环
```

---

对应：

| 我们 | 工业 |
|-|-|
| Agent | AI Agent |
| Runtime | Agent Runtime |
| Tool | Tool Calling |
| Memory | Agent Memory |
| Loop | Agent Loop |

---

# Part B：Runtime 概念映射

## 1. Runtime

我们：

```
Agent Runtime
```

工业：

常见叫法：

```
Agent Runtime
Agent Orchestrator
Agent Execution Engine
Agent Framework Core
```

例如：

OpenAI Agents SDK：

```
Runner
```

LangGraph：

```
Graph Runtime
```

Mastra：

```
Agent Runtime
```

---

核心职责一致：

```
State Management
Context Construction
LLM Invocation
Tool Execution
Lifecycle Management
```

---

## 2. Runtime Loop

这是非常重要的映射。


我们：

```
Runtime Loop
```

工业：

```
Agent Loop
```

进一步：

```
ReAct Loop
```

---

关系：

```
Runtime Loop

      |
      v

Agent Loop

      |
      v

ReAct
Reason + Act
```

---

经典 ReAct：

```
Thought
思考

↓

Action
行动

↓

Observation
观察

↓

Thought

↓

Action
```

对应我们的：

```
LLM Decision

↓

Tool Call

↓

Tool Result

↓

State Update

↓

Next Loop
```

---

所以：

以后看到：

- Agent Loop
- ReAct
- Reasoning Loop
- Execution Loop

基本都是 Runtime Loop 的不同表达。

---

# Part C：Runtime State 映射

Day04 Part B：

我们重点学习：

```
Runtime State
```

工业：

```
Agent State
```

或者：

```
State Machine
```

---

我们的：

```
Runtime State

├── Conversation
├── Goal
├── Plan
├── Tool Result
├── Memory Reference
└── Workspace Index
```

工业：

```
Agent State

├── Messages
├── Task State
├── Workflow State
├── Tool State
├── Memory
└── Context
```

---

## LangGraph 对应

LangGraph 最核心概念：

```
StateGraph
```

其实就是：

```
State
+
Transition
```

例如：

```
State

{
 messages,
 tools,
 result
}


      |
      |
      v


Node

      |
      |
      v


New State
```

---

所以以后看到：

```
StateGraph
Checkpoint
State Transition
```

你应该想到：

```
Runtime State 生命周期
```

---

# Part D：Context Builder 映射

Day04 最大升级：

```
Prompt Engineering

↓

Context Engineering
```

---

我们的：

```
Context Builder
```

工业：

```
Context Engineering Pipeline
```

---

完整映射：

| 我们 | 工业 |
|-|-|
| Retrieval | Retrieval |
| Ranking | Relevance Ranking |
| Compression | Context Compression |
| Eviction | Context Pruning |
| Assembly | Prompt Assembly |
| Token Budget | Context Budget Management |

---

## 为什么重要？

以前：

```
写 Prompt
```

现在：

```
设计 Context Pipeline
```

---

例如 Claude Code：

它不是简单：

```
用户问题
+
系统 Prompt
```

而是：

```
用户任务

+

代码上下文

+

文件结构

+

Git 信息

+

历史修改

+

工具结果

↓

Context Assembly

↓

LLM
```

---

这就是：

```
Context Engineering
```

---

# Part E：Memory 映射

Day04：

我们：

```
Memory Reference
```

工业：

```
Agent Memory System
```

---

通常分：

## 1. Short-term Memory

短期记忆

对应：

```
Conversation History
```

例如：

最近几轮聊天。


---

## 2. Working Memory

工作记忆。

对应：

```
Runtime State
```

例如：

当前任务：

```
正在修改 user.ts
当前步骤:
fix bug
```

---

## 3. Long-term Memory

长期记忆。

对应：

```
User Memory
Knowledge Memory
```

---

工业里面常见：

```
Episodic Memory
事件记忆

Semantic Memory
语义记忆

Procedural Memory
流程记忆
```

---

Day06 Memory 会详细展开。

---

# Part F：Tool 系统映射（为 Day05 铺垫）

虽然还没学 Tool，但是先建立名字。

我们的：

```
Tool Runtime
```

工业：

```
Tool Calling System
Tool Runtime
Action Runtime
```

---

组件：

| 我们 | 工业 |
|-|-|
| Tool Definition | Tool Schema |
| Tool Registry | Tool Registry / Capability Registry |
| Tool Executor | Action Executor |
| Tool Result | Observation |
| Permission Check | Guardrail / Approval |

---

对应 ReAct：

```
Action
 |
 |
Tool Call


Observation
 |
 |
Tool Result
```

---

# Part G：Provider Adapter 映射

Day04 Part E：

我们：

```
Provider Adapter
```

工业：

几个叫法：

```
LLM Gateway

Model Router

Provider Abstraction Layer

LLM Adapter
```

---

架构：

```
Agent Runtime

       |

Unified LLM Interface

       |

+------+-------+------+

OpenAI Claude Gemini
```

---

现实项目：

例如：

```
LiteLLM
OpenRouter
Vercel AI SDK
```

本质都是解决：

```
多模型统一调用
```

---

# Part H：开源框架整体映射

现在看几个工业框架。

---

# 1. OpenAI Agents SDK

对应：

```
Agent Runtime
```

核心：

```
Agent
Runner
Tool
Guardrail
Tracing
Handoff
```

映射：

| SDK | 我们 |
|-|-|
| Runner | Runtime Loop |
| Agent | Agent Definition |
| Tool | Tool Runtime |
| Guardrail | Permission Check |
| Tracing | Runtime Observability |

---

# 2. LangGraph

核心：

```
StateGraph
```

对应：

```
Runtime State
+
Workflow
```

映射：

```
Node

=

Runtime Step


Edge

=

State Transition


Checkpoint

=

State Persistence
```

---

# 3. Claude Code

它更像完整 Agent Runtime。


对应：

我们的：

```
Workspace Index

Context Builder

Tool Runtime

Runtime Loop
```

例如：

工具：

```
Read File

Edit File

Bash

Search
```

上下文：

```
代码结构

文件内容

执行结果

Git diff
```

---

# 最终统一认知图

现在重新看 Agent：

```
                 Agent Runtime


        +---------------------+
        |     Agent State     |
        |     状态系统         |
        +---------------------+

                    |

                    v


        +---------------------+
        | Context Engineering |
        | 上下文工程          |
        +---------------------+

                    |

                    v


              LLM Reasoning


                    |

                    v


        +---------------------+
        | Tool Runtime        |
        | 执行系统             |
        +---------------------+


                    |

                    v


              Environment


                    |

                    v


              State Update
```

工业术语：

```
State
Context Engineering
Reasoning
Tool Calling
Observation
State Transition
Agent Loop
```

---

# Day04.5 核心认知升级

## 1.

以前：

```
学习 Agent 框架
```

容易变成：

```
记 API
```

现在：

```
理解 Runtime 抽象
```

框架只是不同实现。


---

## 2.

以后看到任何 Agent 框架：

先找：

```
State

↓

Context

↓

LLM

↓

Tool

↓

Loop

↓

Persistence
```

不要先看 API。


---

## 3.

Agent 行业统一语言：

你现在已经有：

```
Runtime Loop
≈ Agent Loop
≈ ReAct

Context Builder
≈ Context Engineering

Tool Runtime
≈ Tool Calling System

Runtime State
≈ Agent State

Provider Adapter
≈ LLM Gateway
```

---

# Day04.5 下一步

完成这一节后，我们正式进入：

# Day05：Tool Calling（Execution Engine）

第一部分：

## Day05 Part A：Tool Calling 基础模型

重点：

1. Tool Calling 为什么让 LLM 变成 Agent
2. Tool / Function / Action 的区别
3. Tool Calling 在 Agent Loop 中的位置
4. ReAct 与 Tool Calling 的关系
5. OpenAI Agents SDK / Claude Code / LangGraph 中 Tool 的实现方式

---

另外，我建议后续每个 Day 都保留这个结构：

```
正文学习

↓

工业术语映射

↓

框架对应

↓

面试视角

↓

思考题
```

这样你的最终笔记会天然接近：

《从零实现 Agent Runtime —— 从原理到工业实践》 的结构。
