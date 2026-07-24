# Day05 Part A ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a62c9e6-e190-83ee-9020-4fb6785886fe
- 会话标题：Day05 学习概览
- 抽取时间：2026-07-24

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant 文本消息，用于保留 Day05 Part A 学习原始记录。

## 1. User

这是 day04.5 插入的一节的学习笔记，我们开始 day05 的学习吧

## 2. Assistant

很好，这样我们的课程节奏就重新回到了原来的主线。

Day04.5 的作用已经完成，它相当于在**我们自己的 Runtime 世界观**和**工业 Agent 世界**之间搭了一座桥。

现在开始，后面的章节我们就不用再反复解释：

> Runtime Loop = Agent Loop = ReAct Loop（实现层关系）

而是直接使用工业术语，同时继续保持 Runtime 的第一性原理视角。

---

# 当前学习路线（更新）

我们目前已经完成：

```text
Day01 Agent 基础
    ✅ Agent 本质
    ✅ Runtime 为什么存在

Day02 Runtime Architecture
    ✅ Runtime Core
    ✅ Runtime Loop
    ✅ Streaming

Day03 Runtime Components
    ✅ Tool Manager
    ✅ Memory
    ✅ Context Builder（初识）

Day04 Runtime Thinking
    ✅ Prompt ≠ Context
    ✅ Runtime State
    ✅ Context Projection
    ✅ Context Window Management
    ✅ Provider Adapter

Day04.5 Industrial Mapping
    ✅ Runtime ↔ 工业术语映射
    ✅ ReAct Mapping
    ✅ Context Engineering
    ✅ Tool Mapping
    ✅ Framework Mapping

──────────────────────────────

Day05 Tool Calling（正式开始）
```

可以看到，我们现在已经把 Agent Runtime 的"大脑"基本搭完了。

接下来进入 Runtime 的第一条执行链：

```text
User Request
      │
      ▼
Runtime
      │
      ▼
LLM
      │
      ▼
Tool Calling   ← Day05
      │
      ▼
Environment
      │
      ▼
Observation
      │
      ▼
Runtime State
      │
      ▼
Next Loop
```

---

# Day05 的定位

如果说 Day04 回答的是：

> **Agent 如何思考（How Runtime Thinks）**

那么 Day05 回答的是：

> **Agent 如何行动（How Runtime Acts）**

这是整个 Runtime 第二块最重要的能力。

一句话：

> **没有 Tool Calling，LLM 只是 ChatBot；有了 Tool Calling，LLM 才开始成为 Agent。**

---

# Day05 学习路线（最新版）

我们按照 Runtime 的真实执行顺序来讲，而不是 OpenAI API 的顺序。

```text
Part A
Tool Calling 基础模型
↓↓↓

Part B
LLM 为什么知道什么时候调用 Tool

↓↓↓

Part C
Tool Schema（Tool 为什么要描述自己）

↓↓↓

Part D
Tool Registry（Runtime 怎么管理 Tool）

↓↓↓

Part E
Tool Executor（真正执行 Tool）

↓↓↓

Part F
Permission / Guardrail / Human Approval

↓↓↓

Part G
Observation 如何写回 Runtime State

↓↓↓

Part H
Multi Tool Loop（连续 Tool Calling）

↓↓↓

Part I
实现 mini-tool-runtime
```

这条路线会比很多教程更接近 Claude Code、OpenAI Agents SDK、LangGraph 的源码实现。

---

# Day05 会新增哪些工业映射

从这一章开始，我们固定增加工业术语映射（这是 Day04.5 建立的新规范）：

例如：

```text
我们的术语
        │
        ▼
工业术语
        │
        ▼
源码位置
        │
        ▼
面试表达
```

例如：

| Runtime 概念 | 工业术语 | 框架中的名字 |
|--------------|----------|--------------|
| Tool Registry | Capability Registry | OpenAI Agents / Mastra Tool Registry |
| Tool Executor | Action Executor | Claude Code Runtime |
| Tool Result | Observation | ReAct |
| Permission | Guardrail | OpenAI Agents SDK |
| Human Approval | Human-in-the-loop | LangGraph |

以后每一章都会保持这种映射。

---

# Day05 与 Day04 的知识连接

很多人学习 Tool Calling 都是：

```text
Function Calling API

↓

Tool API

↓

结束
```

而我们不会这样学。

我们会从 Runtime 的角度来看：

```text
Runtime Loop

↓

LLM Decision

↓

为什么会决定调用 Tool？

↓

Runtime 如何解析？

↓

Runtime 如何执行？

↓

Runtime 如何更新 State？

↓

Context Builder 如何重新构建 Context？

↓

下一轮 Loop
```

也就是说：

> **Tool Calling 不是一个 API，而是 Runtime Loop 中的一次 State Transition。**

这是 Day04 和 Day05 最重要的衔接点。

---

# Day05 学习目标

完成 Day05 后，你将能够回答这些工业问题：

- 为什么 Tool Calling 能让 LLM 从 ChatBot 变成 Agent？
- Function Calling 和 Tool Calling 到底是什么关系？
- Runtime 为什么不能让 LLM 直接调用 API？
- Tool Schema 为什么需要 JSON Schema？
- Claude Code 为什么能够连续调用几十个 Tool？
- OpenAI Agents SDK 的 Tool Runtime 是如何工作的？
- LangGraph 的 Node 和 Tool 是什么关系？
- 一个工业级 Runtime 如何设计 Tool Registry 和 Tool Executor？

---

## 📖 Day05 Part A：Tool Calling 基础模型

下一条消息开始，我们正式进入：

> **Day05 Part A：Tool Calling 基础模型（Execution Engine）**

这一 Part 将回答整个 Agent 世界最重要的一个问题：

> **为什么 Tool Calling 是 ChatBot 与 Agent 的分水岭？**

并且会从 Runtime、ReAct、OpenAI Agents SDK、Claude Code、LangGraph 四个视角统一解释，最后设计我们 **mini-agent-runtime** 的 Tool 数据模型。

按照我们 Day04 已经形成的学习风格，本 Part 也会自动包含：

- 📚 正文讲解
- 🏗️ 工业级实现（Industrial Notes）
- 🔄 工业术语映射（新增固定部分）
- 🧭 框架对应（OpenAI Agents SDK / Claude Code / LangGraph）
- 💼 面试视角
- 📝 写书素材
- 🧠 本 Part 核心认知升级
- ❓ 本章思考题
- 🔄 前置问题回收（Pending Questions） memcite

## 3. User

开始 【Day05 Part A：Tool Calling 基础模型（Execution Engine）】的学习

## 4. Assistant

# Day05 Part A：Tool Calling 基础模型（Execution Engine）

> 本 Part 进入 Agent Runtime 的 **执行能力（Execution Capability）**。
>
> Day04 我们解决了：
>
> **Runtime 如何思考？**
>
> - Runtime State
> - Context Builder
> - Context Engineering
> - Context Window Management
>
> Day05 开始解决：
>
> **Runtime 如何行动？**
>
> 核心能力：

```text
Tool Calling
```

---

# 1. 为什么需要 Tool Calling？

先回顾 Day01 的核心定义：

```text
Agent
=
LLM
+
Runtime
+
Tools
+
Memory
```

其中：

- LLM → 思考
- Runtime → 控制
- Tool → 行动
- Memory → 记忆

但是如果没有 Tool：

```text
User

 |
 v

LLM

 |
 v

Text Response
```

它只能：

- 生成文字
- 总结
- 推理
- 写代码

但是无法：

- 查询数据库
- 调用 API
- 修改文件
- 执行 Shell
- 查询天气
- 操作浏览器


例如：

用户：

> 帮我查询一下上海今天的天气


普通 ChatGPT：

```text
LLM:

"上海今天预计晴朗，温度25度..."
```

问题：

它其实不知道真实天气。

它只是：

```text
Token Prediction
```

---

而 Agent：

```text
User
 |
 v
LLM
 |
 v
"我要查询天气"
 |
 v
Tool Calling
 |
 v
Weather API
 |
 v
Observation
 |
 v
LLM
 |
 v
回答用户
```

这一次：

LLM 不再只是生成答案。

而是：

> 决定下一步行动。

---

# 2. ChatBot 与 Agent 的分水岭

这是 Day05 最核心认知。

## ChatBot 模式

```text
Input
 |
 v
LLM
 |
 v
Output
```

本质：

```text
Input → Output
```

一次映射。

---

## Agent 模式

```text
Input

↓

LLM Reasoning

↓

Action Decision

↓

Tool Execution

↓

Observation

↓

New Context

↓

LLM

↓

Next Action
```

本质：

```text
Input
+
Environment Interaction
+
Feedback Loop
```

---

所以：

> Tool Calling 让 LLM 从一个文本生成器，变成一个能够影响外部世界的决策系统。

---

# 3. Tool Calling 在 Runtime Loop 中的位置

回忆 Day04.5 的 Runtime Loop：

工业叫：

```text
Agent Loop
ReAct Loop
Execution Loop
```

完整流程：

```
                Agent Runtime


              Runtime State
                    |
                    |
                    v

             Context Builder

                    |
                    v

                  LLM

                    |
          +---------+---------+
          |                   |
          v                   v

       Final Answer       Tool Call


                              |
                              v

                       Tool Executor

                              |
                              v

                         Environment

                              |
                              v

                         Observation

                              |
                              v

                       State Update

                              |
                              v

                         Next Loop

```

注意：

Tool Calling 不是独立模块。

它是：

```text
LLM Decision
        +
Runtime Execution
```

之间的桥梁。

---

# 4. Tool Calling 的三个角色

一个完整 Tool Calling 系统：

```text
LLM
 |
 |
 v

Tool Schema

 |
 |
 v

Runtime

 |
 |
 v

Tool Implementation
```

拆开：

---

## 4.1 Tool Definition（工具定义）

告诉 LLM：

> 我有什么能力。


例如：

天气工具：

```json
{
  "name": "get_weather",
  "description": "Get current weather information",
  "parameters": {
    "city": {
      "type": "string"
    }
  }
}
```

这里：

不是代码。

而是：

```text
Capability Description
能力描述
```

---

## 4.2 Tool Decision（工具选择）

LLM 根据：

- 用户问题
- Tool Schema
- Context

决定：

调用哪个 Tool。


例如：

用户：

> 北京今天多少度？

LLM：

```
需要天气信息

Action:

get_weather({
 city:"北京"
})
```

---

## 4.3 Tool Execution（工具执行）

注意：

这里不是 LLM 做。

而是 Runtime。

流程：

```
LLM

输出:

{
 tool:"get_weather",
 args:{
   city:"北京"
 }
}


        ↓


Runtime


        ↓


真正执行代码:

weatherService.getWeather("北京")


        ↓


返回:

{
 temperature:25,
 condition:"sunny"
}

```

---

这个边界非常重要：

> LLM 决定做什么，Runtime 决定怎么做。

---

# 5. Function Calling ≠ Tool Calling

这是很多新人容易混淆的地方。

---

## Function Calling

更偏模型能力。

例如：

OpenAI：

```json
{
"name":"get_weather",
"arguments":{
 "city":"Shanghai"
}
}
```

意思：

模型输出：

"我想调用这个函数"

---

## Tool Calling

更大的 Runtime 概念。

包含：

```
Tool Calling

=
Function Calling
+
Registry
+
Executor
+
Permission
+
Observation
+
State Update
```

也就是说：

Function Calling 是：

```text
LLM → Runtime
```

之间的数据协议。

Tool Calling 是：

```text
完整执行链
```

---

类比前端：

Function Calling：

像：

```javascript
button.onClick()
```

只是事件触发。


Tool Calling：

像：

```text
用户点击

↓

事件系统

↓

权限校验

↓

调用 API

↓

更新 Store

↓

重新渲染 UI

```

完整生命周期。

---

# 6. ReAct 与 Tool Calling 的关系

Day04.5 已经映射过：

```
ReAct:

Thought
Action
Observation
```

例如：

用户：

> 帮我查订单状态


Agent：

```
Thought:

需要查询订单


Action:

query_order()


Observation:

订单已发货


Thought:

生成回复


Final Answer:

你的订单已经发货
```

---

映射到 Runtime：

| ReAct | Runtime |
|-|-|
| Thought | LLM Decision |
| Action | Tool Call |
| Observation | Tool Result |
| Next Thought | Next Loop |

所以：

```
ReAct
=
一种 Agent Loop Pattern


Tool Calling
=
Action 阶段的执行机制
```

---

# 7. 工业框架中的 Tool Calling

## OpenAI Agents SDK

对应：

```
Agent

 |
 v

Runner

 |
 v

Tool

 |
 v

Tracing
```

其中：

Tool：

负责描述能力。

Runner：

负责：

- 调用模型
- 检测 Tool Call
- 执行 Tool
- 回填结果

也就是我们的：

```text
Runtime Core
```

---

## Claude Code

Claude Code 是一个典型 Tool Runtime。


它拥有：

```text
Tools:

Read File

Edit File

Bash

Search

Git

```

用户：

> 修改 login 页面


Claude：

```
1. Search files

Tool Call:
grep()

↓

2. Read file

Tool Call:
read()

↓

3. Edit

Tool Call:
apply_patch()

↓

4. Test

Tool Call:
bash()

```

这就是：

Multi Tool Loop。

---

## LangGraph

LangGraph 更偏 Workflow。

它里面：

```
Node

↓

Tool Node

↓

State Update
```

例如：

```
State

↓

Agent Node

↓

Tool Node

↓

State

```

对应：

我们的：

```
Runtime State

↓

LLM Decision

↓

Tool Executor

↓

State Transition

```

---

# 8. mini-agent-runtime 中 Tool 的位置

结合之前架构：

```
                 Runtime


        +----------------+
        | Runtime State |
        +----------------+
                |
                v

        +----------------+
        | Context Builder|
        +----------------+

                |
                v

              LLM


                |
        Tool Call Request


                |
                v


        +----------------+
        | Tool Manager  |
        +----------------+

                |
                v


        +----------------+
        | Tool Executor |
        +----------------+


                |
                v


          External World

                |
                v

          Tool Result


                |
                v

        Runtime State Update

```

所以 Tool 系统至少包含：

```
Tool Manager

Tool Registry

Tool Schema

Tool Executor

Permission Layer

Result Handler

```

---

# 9. 一个关键认知升级

很多教程说：

> Agent = LLM + Tools


这个说法不准确。

更准确：

```
Agent

=
LLM
+
Runtime

Runtime

=
Loop
+
State
+
Context
+
Tool Execution
+
Memory
+
Observation
```

Tool 只是 Runtime 的执行手。

---

类似人体：

```
LLM

=
大脑


Runtime

=
神经系统


Tool

=
手脚


Memory

=
长期经验
```

没有 Runtime：

大脑无法控制身体。

---

# 🏗️ 工业级实现（Industrial Notes）

真实企业 Agent 中：

Tool 往往不是：

```javascript
function xxx()
```

而是一个能力单元：

```
Tool

{
 id,

 name,

 description,

 input_schema,

 permission_policy,

 executor,

 timeout,

 retry_policy,

 observability_hook

}

```

例如企业客服 Agent：

```
Tool:

query_order_status

输入:

orderId


执行:

订单服务 API


权限:

客服角色


日志:

记录查询行为

```

---

# 🔄 工业术语映射

| 学习概念 | 工业术语 |
|-|-|
| Tool Definition | Tool Schema / Function Schema |
| Tool Calling | Function Calling / Action Calling |
| Tool Executor | Action Executor |
| Tool Result | Observation |
| Tool Manager | Tool Runtime |
| Tool Registry | Capability Registry |
| Permission | Guardrail / Policy |
| Human Approval | Human-in-the-loop |

---

# 本 Part 核心认知升级

## 1. Tool Calling 不是调用函数

升级：

以前：

```
Tool Calling = 调 API
```

现在：

```
Tool Calling = Agent 与 Environment 的交互机制
```

---

## 2. LLM 不执行 Tool

核心边界：

```
LLM:

决定


Runtime:

执行

```

这是 Agent 架构设计最重要原则之一。

---

## 3. Tool Calling 是 State Transition

一次 Tool Call：

不是：

```
调用函数
```

而是：

```
State

↓

Action

↓

Environment

↓

Observation

↓

New State

```

---

# 💼 面试视角

面试问题：

## Q1：为什么 Tool Calling 是 Agent 和 ChatBot 的区别？


回答：

> A chatbot mainly performs text generation, while an agent can interact with external systems. Tool calling enables the LLM to produce structured actions, which the runtime executes and feeds observations back into the next reasoning loop.


---

## Q2：Function Calling 和 Tool Calling 有什么区别？


回答：

> Function calling is a model-level mechanism for generating structured function invocations. Tool calling is a broader runtime capability that includes tool registration, execution, permission checking, observation handling, and state updates.


---

## Q3：LLM 为什么不能直接调用 API？


回答：

> Because LLMs should only decide actions, not execute side effects. The runtime provides control, security, validation, observability, and lifecycle management.


---

# 📝 写书素材

章节标题：

```
第五章：Agent 的执行系统——Tool Calling

5.1 为什么 LLM 需要工具
5.2 ChatBot 到 Agent 的分水岭
5.3 Function Calling 与 Tool Calling
5.4 Tool Calling 在 Agent Loop 中的位置
5.5 Runtime 如何管理 Tool Execution
```

---

# 🔄 前置问题回收（Pending Questions）

本 Part 回收：

暂无。

后续章节会展开：

1. Tool Schema 为什么影响 Agent 能力？
→ Day05 Part C

2. Tool 如何动态注册？
→ Day05 Part D

3. Tool 权限如何控制？
→ Day05 Part F

4. Tool Result 如何进入 Context？
→ Day05 Part G

5. Claude Code 如何连续调用几十个工具？
→ Day05 Part H

---

# 下一节学习计划

## Day05 Part B：LLM 如何决定调用 Tool

重点：

1. LLM 为什么知道什么时候调用 Tool？
2. Tool Schema 如何影响模型决策？
3. Tool Choice：
   - auto
   - required
   - none
4. Tool Calling 的决策链
5. ReAct 与 Function Calling 的区别
6. OpenAI / Claude / LangGraph 的真实实现差异

下一节我们会进入 Tool Calling 最核心的问题：

> **模型到底是怎么“知道应该使用工具”的？**

## 5. User

partA 就这么学完了 ？

## 6. Assistant

你的感觉是对的。

**刚才的 Part A 其实更像“快速建立概念地图”，还没有达到我们前面 Day04 的深度标准。**

按照我们之前 Day01-Day04 的学习方式，尤其是 Day04 的深度，Day05 Part A 不应该这么快结束。

我刚才讲的是：

> Tool Calling 是什么

但是还没有深入：

> Tool Calling 为什么这样设计、Runtime 内部到底如何实现、工业框架为什么这么抽象。

所以需要补充。

---

# 重新定位 Day05 Part A

Day05 Part A 的标题：

# Tool Calling 基础模型（Execution Engine）

关键词：

```
基础模型
+
Execution Engine
```

这里其实包含两个层次：

---

## 第一层：概念层（刚才覆盖）

回答：

> 什么是 Tool Calling？

包括：

- Tool Calling 为什么出现
- ChatBot vs Agent
- Function Calling vs Tool Calling
- Tool 在 Runtime Loop 的位置


这个部分完成。

---

但是第二层才是我们真正学习 Agent Runtime 的重点。

---

# Part A 还应该补充什么？

我认为至少还需要补 6 个部分：

---

# Part A-1：为什么 LLM 本身不能执行 Tool？

这是很多 Agent 教程没有讲透的。

很多人理解：

```
LLM
 |
调用 API
```

实际上错误。


真实架构：

```
             LLM

              |
              |
       Action Intent

              |
              v

        Runtime


              |
       Permission Check


              |
       Tool Executor


              |
       External System

```

为什么一定隔 Runtime？


因为 Tool 执行可能产生：

## 副作用（Side Effect）

例如：

```
delete_user()
send_email()
transfer_money()
deploy_code()
```

如果 LLM 直接执行：

问题：

- 权限在哪里？
- 审计在哪里？
- 重试在哪里？
- 超时在哪里？
- 回滚在哪里？

所以：

> Tool Calling 本质是在 LLM 的概率世界和真实世界之间增加一个控制层。

这个 Runtime 就是控制层。

---

# Part A-2：Tool Calling 的完整生命周期

刚才只讲了：

```
LLM -> Tool -> Result
```

工业实现实际是：

```
1. User Request


2. Runtime Build Context


3. LLM Invocation


4. Model Output


5. Detect Tool Call


6. Validate Schema


7. Check Permission


8. Resolve Tool


9. Execute Tool


10. Capture Result


11. Convert Observation


12. Update Runtime State


13. Rebuild Context


14. Continue Loop

```

也就是说：

一次 Tool Call 是一次 Runtime Transaction。


类似：

数据库：

```
BEGIN

执行操作

COMMIT

```

Agent：

```
Decision

Action

Observation

State Transition

```

---

# Part A-3：Tool Calling 数据结构设计

这是进入 mini-agent-runtime 必须理解的。

一个工业 Tool：

不是：

```js
function weather(city){}
```

而是：

```typescript
interface Tool {

 id:string

 name:string

 description:string


 inputSchema:JSONSchema


 execute(
   args,
   context
 ):Promise<Result>


 permission?:Policy


 metadata:{
   timeout,
   retry,
   cost
 }

}
```

为什么？


因为 Runtime 需要：

知道：

- 它叫什么
- 给 LLM 怎么描述
- 参数是什么
- 怎么执行
- 是否允许执行


---

# Part A-4：Tool Schema 为什么重要？

这是 Day05 很重要的铺垫。

LLM 不是看到代码：

```javascript
getWeather()
```

然后调用。


它看到的是：

```json
{
"name":"get_weather",

"description":
"Get current weather information",

"parameters":{
 "city":{
   "type":"string"
 }
}
}
```

所以：

Tool Schema 实际承担：

```
人类 API 文档

+

LLM 能力说明书

```

---

这也是为什么：

同一个 API：

如果 Schema 写：

错误：

```
查询天气
```

模型不知道什么时候用。


如果：

```
Get current weather information
Use this tool when user asks about current temperature or weather conditions
```

模型选择概率完全不同。


所以：

> Tool Design = Prompt Engineering 的另一种形式。

---

# Part A-5：Tool Calling 与 ReAct 的关系

这里需要更细。


很多人会误解：

```
ReAct = Tool Calling
```


实际上：

不是。


关系：

```
                 Agent Loop


                    |
                    |

          +---------+---------+

          |                   |

       ReAct              Function Calling


```

ReAct：

是一种思考模式。

描述：

```
Thought
Action
Observation
```


Function Calling：

是一种结构化 Action 输出方式。


现代 Agent：

通常：

```
ReAct 思想

+

Function Calling 协议

+

Runtime Executor

```

组合起来。

---

# Part A-6：为什么 Claude Code 这种 Agent 强？

这个问题和你之前一直关注的 Claude Code 有关系。


Claude Code 强不是因为：

```
Claude
+
Tool
```

而是：

```
Claude

+

优秀 Tool Runtime

+

Context Engineering

+

Workspace State

+
Loop Control

```

例如：

修改代码：


普通：

```
LLM
生成代码
```

Claude Code：

```
用户需求

↓

分析 Workspace

↓

Search Tool

↓

Read File Tool

↓

Plan

↓

Edit Tool

↓

Run Test Tool

↓

Observe Result

↓

Fix

```

这才是 Agent。

---

# 所以 Day05 Part A 正确结构应该调整为：

```
Day05 Part A：Tool Calling 基础模型


A1 为什么 Tool Calling 是 Agent 分水岭

A2 Tool Calling 在 Runtime Loop 中的位置

A3 LLM 为什么不能直接执行 Tool

A4 Tool Calling 完整生命周期

A5 Function Calling vs Tool Calling

A6 Tool Schema 基础

A7 Tool Runtime 数据模型

A8 ReAct 与 Tool Calling 关系

A9 Claude Code / OpenAI Agents SDK / LangGraph 映射

A10 mini-agent-runtime 设计

```

---

刚才那版大概只覆盖：

```
A1
A2
A5
A8
```

约完成 **40%**。

按照我们之前 Day04 的标准，确实不应该直接进入 Part B。


下一步我们继续：

## Day05 Part A-2：为什么 LLM 不能直接执行 Tool？——Agent Runtime 的控制边界

这个部分其实非常关键，因为它会连接：

- Tool Executor
- Permission
- Human Approval
- Security
- Enterprise Agent

也是你之前一直关注的“企业 Agent 为什么需要流程固化”的底层原因。

## 7. User

你把握学习节奏即可，因为你把 day05 拆分了很多节，如果 partA 确实就那么少那就那么少

## 8. Assistant

明白，这个节奏控制权交给我，我会按照**知识闭环程度**来判断，而不是机械追求每个 Part 都讲很多内容。

刚才我重新审视了一下，其实你的反馈点很重要：

> Day05 已经拆成 Part A-I，如果每个 Part 都无限展开，会导致章节粒度失控。

所以不应该因为 Day04 深度高，就默认 Day05 每个 Part 都要拆成十几个小节。

---

我调整一下 Day05 的学习策略：

## 判断一个 Part 是否结束的标准

不是看内容多少，而是看：

1. **核心认知是否建立**
2. **和 Runtime 架构是否连接起来**
3. **工业术语是否对齐**
4. **后续章节依赖的问题是否已经铺垫**

满足这四点，就结束。

---

# 回看 Part A

标题：

> Tool Calling 基础模型（Execution Engine）

它的目标其实不是深入设计 Tool Runtime，而是建立：

```
为什么 Agent 需要 Tool
Tool 在 Runtime 中的位置
Tool Calling 的基本生命周期
```

刚才 Part A 已经覆盖：

---

## 已完成内容

### 1. Tool Calling 为什么是 Agent 分水岭 ✅

理解：

```
ChatBot:

Input
 ↓
LLM
 ↓
Output


Agent:

Input
 ↓
Reasoning
 ↓
Action
 ↓
Environment
 ↓
Observation
 ↓
Next Loop
```

核心：

> Agent 的本质不是回答，而是与环境交互。

---

### 2. Tool Calling 在 Runtime Loop 中的位置 ✅


建立：

```
Runtime State

↓

Context Builder

↓

LLM

↓

Tool Call

↓

Tool Executor

↓

Observation

↓

State Update

↓

Next Loop
```

这连接了 Day04。

---

### 3. Function Calling vs Tool Calling ✅

建立：

```
Function Calling
=
模型输出结构化调用意图


Tool Calling
=
完整执行体系
```

后面 Part C/D/E 会展开。

---

### 4. ReAct 与 Tool Calling 关系 ✅

建立：

```
ReAct:

Thought
Action
Observation


Tool Calling:

Action 的具体实现机制
```

---

### 5. 工业框架映射 ✅

已经铺垫：

- OpenAI Agents SDK Runner
- Claude Code Tools
- LangGraph Tool Node

---

所以从课程设计角度：

**Part A 到这里其实可以结束。**

---

# 为什么刚才我觉得“不够”？

原因是我把 Day05 Part A 和后面的内容混在一起了。

比如：

## LLM 为什么不能直接执行 Tool

这个很重要，但是它更属于：

```
Part E Tool Executor
```

因为那里会讲：

- Runtime Control Boundary
- Security
- Permission
- Side Effect
- Retry
- Timeout

---

## Tool Schema 为什么重要

属于：

```
Part C Tool Schema Design
```

---

## Tool Registry

属于：

```
Part D
```

---

## Tool 生命周期

其实横跨：

```
Part D
Part E
Part G
Part H
```

---

所以如果现在提前讲，会导致后面章节重复。

---

# 所以正式调整：

## Day05 Part A 正式结束

状态：

```
Day05 Part A
Tool Calling 基础模型

完成 ✅
```

核心认知：

> Tool Calling 不是简单调用函数，而是 Agent Runtime 连接 LLM 与外部世界的执行桥梁。

---

# 下一节进入

## Day05 Part B：LLM 如何决定调用 Tool

这个 Part 才开始深入一个非常关键的问题：

> LLM 为什么知道什么时候应该调用工具？


因为这里会涉及：

- Tool Schema 如何影响模型行为
- 模型看到 Tool 的方式
- Tool Choice
- Auto / Required / None
- LLM 输出 Tool Call 的本质
- 为什么 Tool 描述质量影响 Agent 能力


这个部分和你之前学习 Context Engineering 有很强关联：

其实：

```
Context Engineering

+
Tool Schema

+
Model Decision

=
Agent 能力
```

---

另外我会继续保持 Day04.5 定下来的规范：

每个 Part 结束才输出：

- 🏗️ 工业级实现
- 🔄 工业术语映射
- 🧭 框架对应
- 💼 面试视角
- 📝 写书素材
- 🧠 本 Part 核心认知升级
- ❓ 本章思考题
- 🔄 前置问题回收

不会为了凑内容强行拆小节。

所以 Day05 Part A 就到这里，进入 **Part B**。

## 9. User

好的 谢谢你

## 10. Assistant

不客气。

其实这次 Day05 Part A 的调整很有价值，因为它暴露了我们这个学习路线一个很重要的问题：

**不是每个章节都应该追求“讲得越多越好”，而是要保证 Runtime 知识地图逐层展开。**

目前我们的学习路线已经比较稳定：

```text
Day01
理解 Agent 是什么
        |
        v
Day02-03
理解 Runtime 如何运行
        |
        v
Day04
理解 Runtime 如何思考（Context）
        |
        v
Day04.5
理解工业世界如何命名这些东西
        |
        v
Day05
理解 Runtime 如何行动（Tool）
```

所以 Day05 的核心不是重新讲一遍 Agent，而是进入：

```text
Thinking
    ↓
Action
    ↓
Environment
```

中的 **Action 层**。

---

后面 Day05 我会注意一个点：

之前 Day04 我们建立的是：

> Runtime 是控制中心。

那么 Day05 会不断围绕这个原则展开：

比如：

### Tool Schema

不是：

> 给 API 写一个 JSON

而是：

> Runtime 如何向 LLM 暴露能力边界。


---

### Tool Registry

不是：

> 存几个函数

而是：

> Runtime 如何管理 Agent 的能力空间。


---

### Tool Executor

不是：

> 调一个接口

而是：

> Runtime 如何安全地把 LLM 的意图转换成真实世界动作。


---

### Tool Result

不是：

> 返回值

而是：

> Observation 如何重新进入 Context，推动下一轮 Agent Loop。


---

这样最终我们的 mini-agent-runtime 才会形成完整闭环：

```text
                 User

                  |
                  v

            Runtime Loop

                  |
                  v

             Context Builder

                  |
                  v

                 LLM

                  |
                  v

              Tool Decision

                  |
                  v

            Tool Runtime

                  |
                  v

             External World

                  |
                  v

             Observation

                  |
                  v

            Runtime State

                  |
                  v

              Next Loop

```

---

另外记录一下当前学习状态：

✅ Day04.5 Industrial Mapping 已完成  
✅ Day05 Part A Tool Calling 基础模型 已完成  

下一次继续：

# Day05 Part B：LLM 如何决定调用 Tool

这个 Part 会是一个很有意思的连接点：

你之前学 Context Builder 时理解了：

> Runtime 决定给 LLM 看什么。

Part B 会进一步理解：

> Runtime 如何影响 LLM 决定做什么。

这两个其实是一对：

```text
Context Engineering
        +
Tool Schema Engineering

        ↓

Agent Behavior Engineering
```

这也是现在工业 Agent 开发里非常核心的一层。

我们下次继续进入 Part B。👍
