# Day05 Part G ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a72d681-98d0-83e8-b1d7-2cc10cfd9c54
- 会话标题：Day05 part G Tool Result 回流 Runtime
- 抽取时间：2026-08-05

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part G 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是我学习 agent 的 readme，以及 day05 的 readme，以及 day05 part F 的学习笔记，你看一下，然后我们开始进入 part g的学习

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Tool

The output of this plugin was redacted.

## 7. Assistant

我已经看完你上传的三个文件：

1. **整体学习路线 README**  
2. **Day05 README**  
3. **Day05 Part F：Permission & Human Approval 学习笔记**

整体没有发现路线偏移，当前学习进度和我们之前约定的一致。

先帮你做一次上下文对齐，然后进入 **Day05 Part G**。

---

# 当前学习进度确认

你的路线：

```text
Part I：Agent Basics
        |
        v
Part II：Runtime Foundation
        |
        v
Part III：Decision Engine
        |
        v
Part IV：Execution Engine
        |
        v
Part V：Memory System
        |
        v
Part VI：Advanced Runtime
```

目前：

✅ Day01 Agent Basics  
✅ Day02 Runtime Overview  
✅ Day03 Runtime Architecture  
✅ Day04 Runtime 如何思考  
✅ Day04.5 工业术语映射  
✅ Day05 Tool Calling

其中 Day05：

```text
Part A
Tool Calling 基础模型

    ↓

Part B
LLM 如何决定调用 Tool

    ↓

Part C
Tool Schema

    ↓

Part D
Tool Registry

    ↓

Part E
Tool Executor

    ↓

Part F
Permission & Human Approval
```

已经全部完成。

fileciteturn0file0

---

# Day05 Part F 学习结果确认

Part F 实际完成的是非常重要的一次认知升级：

之前：

```text
LLM
 |
 v
Tool
 |
 v
Execute
```

这是 Demo Agent。

现在升级成：

```text
LLM
 |
 v
Tool Call Intent
 |
 v
Validation
 |
 v
Policy Engine
 |
 +---- allow
 |
 +---- deny
 |
 +---- approval_required
              |
              v
        Human Decision
              |
              v
          Resume
              |
              v
          Execute
```

fileciteturn0file2

也就是说：

Day05 前半部分解决：

> Agent 如何获得行动能力？

Part F 解决：

> Agent 获得行动能力后，如何保证行动可控？

---

# 我特别确认几个容易跑偏的点

## 1. Part F 放在 Day05 是正确的

因为 Day05 本质不是单纯 Tool Calling。

工业 Agent 的 Execution Engine：

不是：

```text
Tool = function call
```

而是：

```text
Tool Lifecycle Management
```

完整链路：

```text
Tool Discovery
      |
      v
Tool Decision
      |
      v
Tool Schema Validation
      |
      v
Permission
      |
      v
Approval
      |
      v
Execution
      |
      v
Observation
```

所以 Part F 是 Execution Engine 的治理部分。

---

## 2. Human Approval 不应该提前放到 Workflow

你之前问过：

> 人工确认是不是 Workflow？

答案：

现在阶段不是。

Day05 Part F 的定位：

```text
Human Approval
=
Tool Execution Lifecycle 中的暂停点
```

不是：

```text
Workflow Engine
```

后面 Day09 Workflow 才会展开：

- State Machine
- Durable Execution
- Long Running Task
- Retry
- Compensation

所以路线没有问题。

---

## 3. 你之前关于暂停超时的问题理解正确

你问：

> 人工审批暂停 Runtime，会不会网络 timeout？

Part F 已经隐含回答：

不是 HTTP 请求一直挂着。

工业实现：

```text
Request
 |
 v
Runtime State Saved

status:
waiting_human_approval

return
```

之后：

```text
Human Click Approve

        |
        v

External Event

        |
        v

Resume Runtime
```

所以不是：

```
HTTP connection waiting
```

而是：

```
Durable Runtime waiting
```

这个会连接后面的：

- Runtime State Persistence
- Workflow
- Event Driven Runtime

---

# 进入 Day05 Part G

按照 Part F 文档最后规划：

下一节：

# Day05 Part G：Tool Result Runtime Feedback

核心问题：

> Tool 执行完成以后，结果如何重新进入 Runtime，让 Agent 继续推理？

fileciteturn0file2

---

## 为什么 Part G 是必须存在的？

到 Part F 为止，我们解决了：

```
LLM
 |
 v
Tool Call Intent
 |
 v
是否允许执行
```

但是还有一个巨大问题：

执行完以后呢？

例如：

用户：

> 帮我查一下订单状态，如果已经发货告诉客户预计时间


Agent：

第一次：

```json
{
 "tool":"query_order",
 "arguments":{
    "order_id":"ORD-001"
 }
}
```

Tool 返回：

```json
{
 "status":"SHIPPED",
 "delivery_date":"2026-08-10"
}
```

问题：

这个 JSON 怎么处理？

直接：

```text
把 JSON 丢给 LLM
```

？

不够。

---

# Part G 核心问题

实际上要解决：

```text
External World
       |
       v
Tool Result
       |
       v
Observation
       |
       v
Runtime State
       |
       v
Context Builder
       |
       v
LLM Next Reasoning
```

也就是 Agent 的闭环：

之前：

```
Think
 |
Act
```

现在完整：

```
Think
 |
Act
 |
Observe
 |
Think again
```

这就是工业 Agent 常说的：

## ReAct Loop

映射：

| 学习概念 | 工业术语 |
|-|-|
| Runtime Loop | Agent Loop |
| Tool Call | Action |
| Tool Result | Observation |
| Next LLM Call | Reasoning |

---

# Part G 会重点学习什么

我计划拆成几个小节：

---

# Day05 Part G-1：Tool Result ≠ Final Answer

核心：

为什么 Tool 返回不能直接给用户？

学习：

- Tool Result
- Observation
- Final Response
- Result Processor

---

# Day05 Part G-2：Observation Model

重点：

为什么 Runtime 需要统一 Observation：

例如：

Tool：

```json
{
 "status":"success",
 "data":{
 }
}
```

Human Approval：

```json
{
 "decision":"approved"
}
```

Error：

```json
{
 "error":"timeout"
}
```

最终都应该进入：

```ts
Observation
```

---

# Day05 Part G-3：Runtime State Feedback

学习：

Tool Result 如何写入：

```ts
RuntimeState
```

例如：

```ts
{
 messages:[],
 toolResults:[],
 observations:[]
}
```

---

# Day05 Part G-4：Context Builder 如何重新投影

连接 Day04：

之前：

Context Builder：

```
Runtime State
       |
       v
LLM Context
```

现在增加：

```
Tool Result
       |
       v
Observation
       |
       v
Context Builder
       |
       v
LLM
```

---

# Day05 Part G-5：Error Feedback

重点：

工业 Agent 和 Demo Agent 最大区别：

失败不是结束。

例如：

Tool:

```
query_order
```

失败：

```
timeout
```

Agent 不一定直接挂。

可能：

```
Observation:
tool timeout

LLM:
retry?
switch tool?
ask user?
```

---

# 学完 Part G 后 Day05 完整闭环

最终：

```text
                 User
                  |
                  v
              Runtime Loop
                  |
                  v
                 LLM
                  |
                  v
            Tool Decision
                  |
                  v
             Tool Executor
                  |
                  v
          Permission / Approval
                  |
                  v
              Tool Execute
                  |
                  v
             Tool Result
                  |
                  v
             Observation
                  |
                  v
            Runtime State
                  |
                  v
          Context Builder
                  |
                  v
              Next LLM
```

这时候 Day05 才真正形成一个完整 Execution Engine。

---

所以接下来我们进入：

# Day05 Part G：Tool Result Runtime Feedback

我会继续保持之前的学习方式：

- 概念模型
- Runtime 架构位置
- 工业术语映射
- OpenAI Agents SDK / Claude Code / LangGraph 对照
- mini-agent-runtime 设计
- 面试视角
- 最后按照固定结构收尾（下一节计划、写书 TODO、工业级实现、知识地图等）

开始 Part G-1。

## 8. User

开始学习

## 9. Assistant

# Day05 Part G：Tool Result Runtime Feedback

## Part G-1：Tool Result ≠ Final Answer

我们开始 Day05 Part G。

先回顾一下 Day05 到目前的位置：

```text
Day05 Tool Calling（Execution Engine）

Part A
Tool Calling 基础模型

    ↓

Part B
LLM Tool Decision

    ↓

Part C
Tool Schema

    ↓

Part D
Tool Registry

    ↓

Part E
Tool Executor

    ↓

Part F
Permission & Human Approval

    ↓

Part G
Tool Result Runtime Feedback
```

前面 Part A-F 解决的是：

> Agent 如何决定行动，以及如何安全执行行动。

Part G 开始解决另一个核心问题：

> Agent 执行动作之后，如何知道发生了什么，并继续思考？

---

# 1. Agent 为什么需要 Feedback Loop？

普通程序：

```text
Input
 |
 v
Function
 |
 v
Output
```

例如：

```ts
const result = calculatePrice(order);
return result;
```

一次调用结束。

但是 Agent 不是这样。

Agent 的本质：

```text
Goal
 |
 v
Reasoning
 |
 v
Action
 |
 v
Observation
 |
 v
Reasoning
 |
 v
Action
 |
 ...
```

这也是工业 Agent 里的：

## ReAct Loop

对应：

| Agent 概念 | 工业术语 |
|-|-|
| 思考 | Reasoning |
| 调用 Tool | Action |
| Tool 返回 | Observation |

所以：

```text
Think
  |
  v
Act
  |
  v
Observe
  |
  v
Think Again
```

才形成 Agent 闭环。

---

# 2. Part F 结束在哪里？

Part F：

解决：

```text
LLM
 |
 v
Tool Call Intent
 |
 v
Permission
 |
 v
Approval
 |
 v
Execute
```

例如：

用户：

> 帮我查询订单状态，如果已经发货告诉客户。


LLM：

决定：

```json
{
  "tool":"query_order",
  "arguments":{
    "order_id":"ORD-001"
  }
}
```

Runtime：

检查：

```text
Permission:
allow
```

然后执行：

```ts
queryOrder("ORD-001")
```

现在问题来了：

Tool 返回什么？

---

# 3. Tool Result 是什么？

最简单理解：

Tool Result 就是 Tool 执行后的返回值。

例如：

Tool：

```ts
query_order
```

执行：

```ts
await queryOrder("ORD-001")
```

返回：

```json
{
  "order_id":"ORD-001",
  "status":"SHIPPED",
  "delivery_date":"2026-08-10"
}
```

这是：

```
Tool Result
```

---

但是：

这里有一个非常重要的问题：

> Tool Result 能不能直接作为用户回答？


例如：

用户：

> 我的订单什么时候到？

Agent：

直接返回：

```json
{
 "order_id":"ORD-001",
 "status":"SHIPPED",
 "delivery_date":"2026-08-10"
}
```

技术上可以。

但是这不是 Agent。

---

# 4. Tool Result ≠ Final Answer

这是 Part G 第一个核心认知升级。

很多 Demo Agent：

```text
User
 |
 v
LLM
 |
 v
Tool
 |
 v
Result
 |
 v
User
```

看起来像 Agent。

但是工业 Agent：

```text
User
 |
 v
LLM
 |
 v
Tool
 |
 v
Tool Result
 |
 v
Observation
 |
 v
LLM
 |
 v
Final Answer
 |
 v
User
```

多了一层：

```
Observation
```

---

为什么？

因为 Tool Result 是：

> 外部系统返回的数据。

而 Final Answer 是：

> Agent 理解数据后，对用户目标的响应。

二者不是一个东西。

---

举例：

Tool 返回：

```json
{
 "status":"SHIPPED",
 "delivery_date":"2026-08-10"
}
```

LLM 需要推理：

用户真正想知道：

```
什么时候收到货？
```

所以生成：

> 您的订单已经发货，预计 8 月 10 日送达。

这里：

Tool Result：

```json
{
 "status":"SHIPPED",
 "delivery_date":"2026-08-10"
}
```

Observation：

```text
订单 ORD-001 当前状态为 SHIPPED，
预计送达时间为 2026-08-10。
```

Final Answer：

```text
您的订单已经发货，预计 8 月 10 日送达。
```

三个层级不同。

---

# 5. 为什么需要 Observation？

这是 Agent Runtime 设计里的关键。

如果没有 Observation：

Runtime：

```text
Tool Result
 |
 v
LLM
```

那么每个 Tool 都需要自己决定：

- 怎么格式化结果？
- 怎么告诉 LLM？
- 怎么处理错误？
- 怎么处理权限？
- 怎么处理人工审批？


最后：

```text
Tool A:
自己包装

Tool B:
自己包装

Tool C:
自己包装
```

Runtime 会失控。

---

所以工业 Runtime 会引入统一抽象：

```
Observation
```

类似：

```text
External World Event
        |
        v
Observation
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

# 6. Observation 是什么？

定义：

> Observation 是 Runtime 对外部世界反馈的统一表示。

注意：

它不是 Tool Result。

Tool Result 是：

```text
Tool 层概念
```

Observation 是：

```text
Runtime 层概念
```

---

例如：

## Case 1：Tool 成功

Tool：

```json
{
 "temperature":28
}
```

转换：

```json
{
 "type":"tool_result",
 "tool":"weather",
 "status":"success",
 "data":{
    "temperature":28
 }
}
```

---

## Case 2：Tool 失败

Tool：

```text
timeout
```

Runtime：

不能直接抛异常结束。

转换：

```json
{
 "type":"tool_error",
 "tool":"weather",
 "error":"timeout"
}
```

---

## Case 3：人工审批

Part F：

人工点击：

Approve

转换：

```json
{
 "type":"human_approval",
 "decision":"approved",
 "approval_id":"A001"
}
```

---

所以 Runtime 世界里：

所有外部反馈：

```text
Tool Result

Tool Error

Human Decision

External Event

System Event
```

最终都会成为：

```
Observation
```

---

# 7. Observation 为什么重要？

因为 Agent Loop 只认识一种东西：

```
Observation
```

这样 Runtime Loop 就统一了。


完整链路：

```text
                 User Goal

                    |
                    v

                  LLM

                    |
                    v

              Tool Call Intent

                    |
                    v

             Permission Layer

                    |
                    v

                Executor

                    |
                    v

              External System

                    |
                    v

             Tool Result

                    |
                    v

             Observation

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

# 8. 和 Day04 Context Builder 的连接

这里大家容易忽略：

Day04 我们学习：

> Runtime State 不是直接给 LLM 的。

而是：

```text
Runtime State

      |

      v

Context Builder

      |

      v

LLM Context
```

现在加入 Tool Feedback：

```text
Tool Result

      |

      v

Observation

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

所以 Day04 和 Day05 开始连接。

---

# 9. 工业术语映射

| 当前学习概念 | 工业术语 |
|-|-|
| Tool Result | Tool Response |
| Observation | Agent Observation |
| Result Feedback | Feedback Loop |
| Runtime Feedback | Agent Loop Feedback |
| Tool Error | Error Observation |
| Human Approval Result | External Event Observation |
| Runtime State Update | State Transition |
| Next LLM Call | Next Reasoning Step |

---

# 10. OpenAI Agents SDK / Claude Code 映射

这里做工业映射。

## OpenAI Agents SDK

大致结构：

```text
Agent
 |
 v
Tool Call
 |
 v
Tool Output
 |
 v
Agent continues
```

Tool Output 会进入下一轮模型上下文。

也就是：

```text
Tool Output
      |
      v
Conversation History
      |
      v
Next Model Turn
```

---

## Claude Code

更明显：

```text
Assistant
 |
Tool Use
 |
Tool Result
 |
Assistant Continue
```

例如：

```text
Read file

↓

File content

↓

Think

↓

Modify file
```

其中：

文件内容就是 Observation。

---

# 11. mini-agent-runtime 设计

Part G 最小设计：

新增：

```ts
Observation
```

类型：

```ts
interface Observation {
  type:
    | "tool_result"
    | "tool_error"
    | "human_approval";

  source: string;

  data: unknown;

  createdAt: string;
}
```

---

Tool Executor：

以前：

```ts
executeTool()
```

返回：

```ts
ToolResult
```

现在：

```ts
executeTool()
      |
      v
ResultProcessor
      |
      v
Observation
```

结构：

```text
Tool Executor

      |

      v

Result Processor

      |

      v

Observation

      |

      v

Runtime State
```

---

# Part G-1 小结

今天先建立第一个核心：

## 认知升级

以前：

```
Tool Calling = 调函数
```

现在：

```
Tool Calling =
Action + Feedback Loop
```

---

以前：

```
Tool Result = Answer
```

现在：

```
Tool Result
      |
      v
Observation
      |
      v
LLM Reasoning
      |
      v
Final Answer
```

---

以前：

```
Tool 是终点
```

现在：

```
Tool 是 Agent Loop 中的一步
```

---

# 本节核心架构图

```text
              User Goal

                  |
                  v

                LLM

                  |
                  v

            Tool Call Intent

                  |
                  v

        Permission / Approval

                  |
                  v

             Tool Executor

                  |
                  v

          External World

                  |
                  v

             Tool Result

                  |
                  v

            Observation

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

下一节进入：

# Day05 Part G-2：Observation Model 设计

重点学习：

1. 为什么 Observation 需要统一数据结构
2. Tool Result / Error / Human Approval 如何统一
3. Observation 和 Message 的区别
4. Observation 如何进入 Runtime State
5. OpenAI Agents SDK、Claude Code、LangGraph 中 Observation 的对应设计

这一节会把 **Day04 Runtime State** 和 **Day05 Tool Execution** 真正连接起来。

## 10. User

继续学习

## 11. Assistant

# Day05 Part G：Tool Result Runtime Feedback

## Part G-2：Observation Model 设计

上一节我们建立了一个核心认知：

> Tool Result 不是 Agent 的最终答案，而是 Agent 下一轮推理的输入。

也就是：

```text
Tool Execution

      ↓

Tool Result

      ↓

Observation

      ↓

Runtime State

      ↓

Context Builder

      ↓

LLM Next Reasoning
```

今天继续深入：

> Runtime 为什么需要 Observation 这个中间抽象？Observation 应该如何设计？

---

# 1. 为什么不能直接保存 Tool Result？

一个直觉方案：

```ts
RuntimeState {

  toolResults: [
    {
      tool:"query_order",
      result:{
        status:"SHIPPED"
      }
    }
  ]

}
```

看起来没问题。

但是工业 Agent 很快会遇到问题。

因为 Runtime 收到的信息来源不只有 Tool。

例如：

---

## 1. Tool Success

```text
query_order

返回：

{
 status:"SHIPPED"
}
```

---

## 2. Tool Error

例如：

```text
payment_api

timeout
```

---

## 3. Human Approval

Part F：

```text
refund_order

approved
```

---

## 4. External Event

例如：

订单系统主动推送：

```text
Order cancelled
```

---

这些东西本质不同：

但是对于 Agent Loop：

它们都是：

> 外部世界发生了一件事情，需要 Agent 感知。

所以 Runtime 需要统一抽象：

```text
Observation
```

---

# 2. Observation 的本质定义

工业 Agent 中：

> Observation 是 Agent 对外部世界变化的感知结果。

注意关键词：

不是：

```text
Tool 返回值
```

而是：

```text
Agent 感知到的信息
```

---

举例：

外部世界：

```text
Payment Service

退款成功
```

Tool Result：

```json
{
 "refund_id":"R001",
 "status":"success"
}
```

Runtime Observation：

```json
{
 "type":"tool_result",
 "source":"refund_order",
 "status":"success",
 "data":{
    "refund_id":"R001"
 }
}
```

LLM 看到：

```text
退款已经成功。
可以通知用户。
```

---

# 3. Observation 与 Message 的区别

这里连接 Day03 / Day04。

之前我们学习 Message：

```text
Conversation Message
```

例如：

```json
{
 "role":"user",
 "content":"查询订单"
}
```

或者：

```json
{
 "role":"assistant",
 "content":"我帮你查询"
}
```

那么：

Observation 是 Message 吗？

答案：

## 不是。

---

它们解决的问题不同。

---

## Message

解决：

> 人类和 Agent 的交流历史。

例如：

```text
User:

帮我查询订单

Assistant:

好的，我查询一下
```

属于：

```text
Conversation Layer
```

---

## Observation

解决：

> Agent 与外部世界交互后的反馈。

例如：

```text
订单系统:

订单已发货
```

属于：

```text
Runtime Execution Layer
```

---

关系：

```text
Conversation

User Message
      |
      v
Agent Message


Execution

Tool Call
      |
      v
Observation
```

---

# 4. 为什么 Observation 不应该直接塞 Message？

一个简单实现：

```json
[
 {
  "role":"user",
  "content":"查询订单"
 },
 {
  "role":"tool",
  "content":{
    "status":"SHIPPED"
  }
 }
]
```

很多 SDK 确实这样做。

例如 OpenAI Tool Calling：

模型上下文中会有：

```text
assistant:
  tool_call

tool:
  tool_result
```

但是 Runtime 内部不能只依赖 Message。

原因：

Message 是：

> 给 LLM看的协议格式。

Observation 是：

> Runtime 内部状态模型。

---

类似 Day04：

我们讲过：

```text
Runtime State

不是

LLM Context
```

而是：

```text
Runtime State

      ↓

Context Builder

      ↓

LLM Context
```

同理：

```text
Observation

      ↓

Context Builder

      ↓

Message Format
```

---

# 5. Runtime 内部的数据流

完整结构：

```text
                 Runtime State

                       |
                       |
        +--------------+-------------+
        |                            |
        v                            v

 Conversation                 Observations

 User Message                 Tool Result

 Assistant Message            Human Approval

                              Error Event


        |
        |
        v

              Context Builder

                       |
                       v

                LLM Messages
```

---

所以：

Runtime 内部：

```text
Message
+
Observation
```

最后投影：

```text
LLM Context
```

---

# 6. Observation 数据结构设计

一个最小版本：

```ts
interface Observation {

  id:string;

  type:
    | "tool_result"
    | "tool_error"
    | "human_approval"
    | "external_event";


  source:string;


  data:unknown;


  createdAt:string;

}
```

---

例如 Tool Result：

```json
{
"id":"obs001",

"type":"tool_result",

"source":"query_order",

"data":{
   "status":"SHIPPED"
}
}
```

---

Error：

```json
{
"id":"obs002",

"type":"tool_error",

"source":"payment",

"data":{
   "error":"timeout"
}
}
```

---

Human Approval：

```json
{
"id":"obs003",

"type":"human_approval",

"source":"approval_service",

"data":{
   "decision":"approved"
}
}
```

---

# 7. Observation 为什么需要 source？

例如：

```json
{
"type":"result",

"data":{
 "success":true
}
}
```

问题：

谁产生的？

不知道。

但是：

```json
{
"type":"tool_result",

"source":"refund_order",

"data":{
 "success":true
}
}
```

Runtime 可以知道：

```text
这个结果来自退款工具。
```

---

source 的作用：

- Debug
- Audit
- Context Filtering
- Security Analysis

---

# 8. Observation 为什么需要 type？

因为不同反馈处理方式不同。

例如：

## tool_result

可以：

```text
继续推理
```

---

## tool_error

可能：

```text
Retry

Fallback

Ask User
```

---

## human_approval

可能：

```text
Resume

Stop
```

---

所以：

```text
Observation Type
```

决定 Runtime 行为。

---

# 9. Observation 与 Runtime State Lifecycle

连接 Day04。

之前：

Runtime State：

```text
Created

↓

Running

↓

Completed
```

现在：

加入 Observation：

```text
Running

 |
 |
 v

Tool Call

 |
 |
 v

Waiting Tool Result

 |
 |
 v

Observation Added

 |
 |
 v

Continue Reasoning
```

---

如果失败：

```text
Running

 |
 v

Tool Error Observation

 |
 v

Recovery Logic

 |
 v

Retry / Alternative Action
```

---

如果人工审批：

```text
Running

 |
 v

Approval Required

 |
 v

Waiting Approval

 |
 v

Human Observation

 |
 v

Resume
```

---

所以 Observation 是 Runtime 状态转换的输入。

---

# 10. Result Processor 的作用

这里引入一个工业组件：

## Result Processor

为什么需要？

因为 Tool Executor 不应该负责理解所有结果。


错误：

```ts
executeTool(){

 if(tool=="weather"){
   formatWeather()
 }

 if(tool=="order"){
   formatOrder()
 }

}
```

最后 Executor 变成巨大分支。

---

正确：

```text
Tool Executor

负责：

执行


↓

Result Processor

负责：

转换


↓

Observation

```

---

结构：

```text
Tool

 |

 v

Executor

 |

 v

Raw Result

 |

 v

Result Processor

 |

 v

Observation

```

---

# 11. 工业术语映射

| 学习概念 | 工业术语 |
|-|-|
| Observation | Agent Observation |
| Result Processor | Output Parser / Result Adapter |
| Tool Result | Tool Response |
| Runtime State | Agent State |
| Observation Store | Event Store / State Store |
| Observation Type | Event Type |
| External Event | Runtime Event |

---

# 12. OpenAI Agents SDK / Claude Code 对应

## OpenAI Agents SDK

外部表现：

```text
assistant

tool_call


tool

tool_result


assistant continue
```

内部思想：

```text
Tool Result

↓

下一轮模型 Context
```

---

## Claude Code

非常明显：

例如：

Agent：

```text
读取 package.json
```

Tool：

```text
Read file
```

返回：

```text
文件内容
```

这个内容不是答案。

它是：

```text
Observation
```

然后 Claude：

```text
根据文件内容继续修改代码
```

---

# 13. LangGraph 映射

后面 Day09 Workflow 会详细讲。

这里提前映射：

LangGraph：

```text
State

+
Node

+
Edge
```

其中：

Node 执行：

```text
Tool Node
```

产生：

```text
State Update
```

本质：

也是 Observation 写入 State。

---

# 14. mini-agent-runtime 设计

现在我们的 Runtime State：

Day04：

```ts
interface RuntimeState {

 messages: Message[];

}
```

升级：

```ts
interface RuntimeState {

 messages: Message[];


 observations: Observation[];


 status:
   | "running"
   | "waiting"
   | "completed";

}
```

---

Tool 执行：

之前：

```ts
const result =
 await executor.execute(toolCall);
```

现在：

```ts
const result =
 await executor.execute(toolCall);


const observation =
 resultProcessor.process(result);


state.observations.push(observation);
```

---

最终：

```text
Tool Executor

      |

      v

Result Processor

      |

      v

Observation

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

# Part G-2 核心认知升级

今天最重要的三个升级：

---

## 1. Tool Result 不属于 Agent 思考层

错误：

```text
Tool Result = Answer
```

正确：

```text
Tool Result

↓

Observation

↓

Reasoning Input
```

---

## 2. Observation 是 Runtime 世界统一反馈模型

Tool：

```text
Result
```

Error：

```text
Error
```

Human：

```text
Approval
```

最终：

```text
Observation
```

---

## 3. Runtime State 不只是保存聊天记录

以前：

```text
State = Messages
```

现在：

```text
State =
{
 Messages,
 Tool Calls,
 Observations,
 Pending Actions,
 Metadata
}
```

这为后面的：

- Memory
- Workflow
- Durable Execution

打基础。

---

下一节：

# Day05 Part G-3：Observation 如何进入 Runtime State

重点：

1. Observation 生命周期
2. State Update Model
3. Event Sourcing 思想
4. 为什么 Agent Runtime 越来越像 Workflow Engine
5. mini-agent-runtime 如何设计 State Reducer

这一节会正式连接：

**Day04 Runtime State → Day05 Tool Feedback → Day06 Memory**。

## 12. User

继续学习

## 13. Assistant

# Day05 Part G：Tool Result Runtime Feedback

## Part G-3：Observation 如何进入 Runtime State

上一节我们解决了一个非常关键的问题：

> Tool Result 不是直接给 LLM 的答案，而是 Runtime 对外部世界变化的一次 Observation。

现在链路变成：

```text
Tool Execution

      ↓

Tool Result

      ↓

Observation

      ↓

???

      ↓

Next LLM Reasoning
```

今天的问题：

> Observation 产生以后，应该如何进入 Runtime？

答案：

> Observation 必须成为 Runtime State 的一次状态变化（State Transition）。

---

# 1. 回顾 Day04 Runtime State

在 Day04 我们学习过：

Runtime 不是简单保存聊天记录。

错误理解：

```text
Runtime State = Conversation History
```

实际上：

```text
Runtime State
=
Agent 当前运行世界的完整状态
```

例如：

```ts
interface RuntimeState {

  sessionId:string;

  messages:Message[];

  currentGoal:string;

  status:string;

}
```

---

现在加入 Tool Feedback：

Agent 执行过程中：

```text
User Goal

↓

LLM Decision

↓

Tool Call

↓

Tool Result

↓

Observation
```

那么 Runtime State 必须知道：

```text
刚才发生了什么
```

所以：

```ts
interface RuntimeState {

  sessionId:string;


  messages:Message[];


  observations:Observation[];


  status:
    | "running"
    | "waiting"
    | "completed";

}
```

---

# 2. Observation 不是临时变量

很多 Demo Agent：

```ts
const result =
 await tool.execute();


const answer =
 await llm(result);
```

看起来：

```text
Tool Result
    |
    v
LLM
```

但是工业 Runtime 不这么做。

为什么？

因为 Agent 是长生命周期系统。

可能：

- Tool 执行失败
- 网络中断
- 人工审批等待
- Runtime 重启
- 多小时任务

如果 Observation 只是：

```ts
const result
```

那么：

Runtime 一挂：

信息丢失。

---

所以：

Observation 必须持久化。

变成：

```text
Runtime State

        +

Observation History
```

---

# 3. Observation 生命周期

一个完整生命周期：

```text
                 Tool Call

                    |
                    v

              Tool Executor

                    |
                    v

              Raw Tool Result

                    |
                    v

              Result Processor

                    |
                    v

              Observation Created

                    |
                    v

              State Update

                    |
                    v

              Context Builder

                    |
                    v

                  LLM
```

---

注意：

真正进入 Agent Loop 的不是：

```text
Tool Result
```

而是：

```text
State Update 后的 Observation
```

---

# 4. State Update 是什么？

简单理解：

把新的事实合并进 Runtime 当前状态。

例如：

当前：

```json
{
 "status":"running",

 "observations":[]
}
```

收到：

```json
{
 "type":"tool_result",

 "source":"query_order",

 "data":{
    "status":"SHIPPED"
 }
}
```

执行：

```ts
state.observations.push(observation)
```

变成：

```json
{
 "status":"running",

 "observations":[

   {
    "type":"tool_result",
    "source":"query_order",
    "data":{
       "status":"SHIPPED"
    }
   }

 ]
}
```

这就是：

```text
State Transition
```

---

# 5. 为什么叫 State Transition？

因为 Agent Runtime 本质越来越像状态机。

例如：

开始：

```text
CREATED
```

用户输入：

```text
RUNNING
```

调用 Tool：

```text
EXECUTING_TOOL
```

等待结果：

```text
WAITING_TOOL_RESULT
```

收到 Observation：

```text
PROCESSING_OBSERVATION
```

继续：

```text
RUNNING
```

---

完整：

```text
CREATED

  |
  v

RUNNING

  |
  v

EXECUTING_TOOL

  |
  v

WAITING_RESULT

  |
  v

OBSERVATION_RECEIVED

  |
  v

RUNNING
```

---

# 6. 为什么 Runtime 越来越像 Workflow Engine？

这是一个重要认知。

前面我们一直说：

Agent Runtime：

```text
LLM + Tools
```

但是工业化以后：

实际上：

```text
Agent Runtime

=

LLM Decision

+

State Machine

+

Event Processing

+

Execution Control
```

---

为什么？

因为 Agent 要处理：

## Tool Result

```text
Event
```

---

## Human Approval

```text
Event
```

---

## Error

```text
Event
```

---

## Timeout

```text
Event
```

---

所以 Runtime 的核心：

不是循环调用 LLM。

而是：

> 接收事件，更新状态，根据状态决定下一步动作。

---

# 7. Event 思维

传统程序：

```text
call function

↓

return result
```

Agent Runtime：

```text
Action

↓

Event

↓

State Update

↓

Next Action
```

---

例如：

退款 Agent：

当前：

```json
{
"task":"refund",
"status":"waiting"
}
```

收到：

```json
{
"type":"human_approval",
"decision":"approved"
}
```

Reducer：

更新：

```json
{
"task":"refund",
"status":"approved"
}
```

然后：

Runtime：

继续：

```text
execute refund_order
```

---

# 8. State Reducer

这里引入一个工业概念：

## Reducer

熟悉前端的话，你会非常容易理解。

类似 Redux：

```ts
(state, action)
        |
        v
    newState
```

Agent Runtime：

```ts
(runtimeState, observation)

        |

        v

    newRuntimeState
```

---

例如：

```ts
function reduce(
 state:RuntimeState,
 observation:Observation
){

 switch(observation.type){

  case "tool_result":

    return {
      ...state,

      observations:[
        ...state.observations,
        observation
      ]
    };


 }

}
```

---

这个设计和你之前做 React 状态管理非常像。

区别：

Redux：

```text
UI State
```

Agent Runtime：

```text
Execution State
```

---

# 9. 为什么不用直接修改 State？

例如：

```ts
state.status="running";
```

当然可以。

但是工业系统更喜欢：

```text
Event -> Reducer -> New State
```

原因：

## 1. 可追踪

知道：

为什么变成这个状态。

例如：

```text
10:01 Tool Called

10:02 Tool Success

10:03 Human Approved
```

---

## 2. 可恢复

Runtime 崩溃：

重新 replay：

```text
Event1

Event2

Event3
```

恢复状态。

---

## 3. 可审计

企业需要：

谁做了什么。

---

这就是后面会讲的：

- Event Sourcing
- Durable Execution

---

# 10. Observation Store

工业系统通常不会只：

```ts
state.observations=[]
```

因为可能非常大。

而是：

```text
Runtime State

        |

        +---- Current Snapshot

        |

        +---- Observation/Event Store
```

类似：

数据库：

```
agent_session

runtime_state

observations
```

---

例如：

Observation 表：

| id | type | source | created |
|-|-|-|-|
|001|tool_result|query_order|10:00|
|002|human_approval|approval|10:05|
|003|tool_result|refund|10:06|

---

# 11. Context Builder 如何消费 Observation？

这里重新连接 Day04。

Runtime State：

```text
{
 messages,

 observations,

 memory,

 workspace
}
```

但是 LLM 不需要全部。

Context Builder：

```text
Runtime State

       |

       v

Projection

       |

       v

LLM Context
```

例如：

Observation：

历史：

```text
1000条
```

但是当前：

只需要：

```text
最近退款结果
```

所以：

Context Builder：

选择：

```text
Relevant Observation
```

---

这就是：

Day04 Context Builder

+

Day05 Observation

结合。

---

# 12. mini-agent-runtime 设计

目前架构：

```text
Runtime Core

      |

      v

LLM

      |

      v

Tool Executor

      |

      v

Result Processor

      |

      v

Observation

      |

      v

State Reducer

      |

      v

Runtime State
```

---

接口：

```ts
interface StateReducer {

 update(
   state:RuntimeState,
   observation:Observation
 ):RuntimeState;

}
```

---

执行：

```ts
const result =
 await toolExecutor.execute(call);


const observation =
 resultProcessor.process(result);


runtimeState =
 reducer.update(
   runtimeState,
   observation
 );
```

---

# 13. 工业术语映射

| 学习概念 | 工业术语 |
|-|-|
| Observation | Event |
| State Update | State Transition |
| Reducer | State Reducer |
| Runtime State | Agent State |
| Observation Store | Event Store |
| Replay | State Reconstruction |
| Snapshot | State Snapshot |
| Context Projection | State Projection |

---

# 14. OpenAI Agents SDK / Claude Code 映射

## OpenAI Agents SDK

思路：

```text
Tool Call

↓

Tool Output

↓

Append to Conversation

↓

Next Model Call
```

内部其实就是：

```text
Observation

↓

State Update
```

---

## Claude Code

例如：

用户：

> 修改这个函数


Agent：

读取文件：

```text
Tool:
read_file
```

返回：

```text
文件内容
```

Runtime：

保存：

```text
Observation:
file_content
```

下一步：

LLM：

```text
根据代码内容修改
```

---

# 15. 本节核心认知升级

今天最重要：

---

## 1. Observation 是 Runtime State 的变化输入

不是：

```text
Tool Result -> LLM
```

而是：

```text
Tool Result

↓

Observation

↓

State Transition

↓

LLM
```

---

## 2. Agent Runtime 本质是状态机

不是简单：

```text
while(true){

 call LLM

}
```

而是：

```text
Event

↓

State

↓

Decision

↓

Action

↓

Event
```

---

## 3. 这和前端架构高度类似

你的前端经验可以直接迁移：

Redux：

```text
Action

↓

Reducer

↓

State
```

Agent Runtime：

```text
Observation

↓

Reducer

↓

Runtime State
```

---

# Part G-3 完成

下一节进入：

# Day05 Part G-4：Context Builder 如何消费 Observation

重点：

1. Observation 为什么不能全部塞给 LLM
2. Token Budget 如何影响 Observation 选择
3. Observation Compression
4. Observation Eviction
5. Tool Result 与 Memory 的边界
6. Claude Code 为什么需要特殊 Context Builder

这一节会再次连接你 Day04 学过的：

> Context Builder 不是拼 Prompt，而是 Runtime State → LLM Context 的智能投影。

也是 Day05 和 Day06 Memory 的连接点。

## 14. User

继续学习

## 15. Assistant

# Day05 Part G：Tool Result Runtime Feedback

## Part G-4：Context Builder 如何消费 Observation

前面三节，我们已经把 Tool Feedback 链路补完整：

```
Tool Call

   ↓

Tool Executor

   ↓

Tool Result

   ↓

Observation

   ↓

State Reducer

   ↓

Runtime State

   ↓

???
```

今天解决最后一步：

> Runtime State 里面有大量 Observation，但是 LLM 不可能全部看到，Context Builder 应该如何选择、加工、投影 Observation？

这部分会和我们 Day04 学习的 **Context Builder** 完全连接。

---

# 1. 回顾 Day04：Runtime State ≠ LLM Context

这是整个 Agent Runtime 最重要的设计思想之一。

很多初级 Agent：

```text
Runtime State

      ↓

全部塞给 LLM
```

例如：

```json
{
 messages:[],
 tools:[],
 memory:[],
 observations:[]
}
```

然后：

```text
prompt = JSON.stringify(state)
```

发送给模型。

这是 Demo 做法。

---

工业 Runtime：

```text
Runtime State

        |

        v

 Context Builder

        |

        v

LLM Context
```

也就是说：

> Runtime State 是完整世界，LLM Context 是针对当前推理任务的视图。

---

这和前端非常像。

例如：

Redux Store：

```js
{
 user:{},
 products:[],
 cart:[],
 orders:[],
 permissions:[]
}
```

页面渲染：

不会：

```js
JSON.stringify(store)
```

全部渲染。

而是：

Selector：

```js
selectCurrentUser(state)
```

取需要的数据。

---

Agent：

Context Builder：

就是 Runtime 的 Selector。

---

# 2. 为什么 Observation 不能全部给 LLM？

假设一个 Coding Agent：

执行：

```
读取文件
```

产生：

Observation:

```json
{
 type:"tool_result",
 source:"read_file",
 data:"xxx代码"
}
```

然后：

```
搜索依赖
```

Observation：

```json
{
 type:"tool_result",
 source:"grep",
 data:"100个文件"
}
```

然后：

```
运行测试
```

Observation：

```json
{
 type:"tool_result",
 source:"test",
 data:"5000行日志"
}
```

最终：

Runtime：

```
observations:[
  read_file,
  grep,
  test
]
```

如果全部给 LLM：

```
Token 爆炸
```

而且：

真正重要的信息可能被淹没。

---

所以：

Observation 进入 Runtime 后：

不是直接进入 Context。

而是：

```
Observation Store

        ↓

Context Selection

        ↓

LLM Context
```

---

# 3. Observation Selection（选择）

Context Builder 首先需要判断：

哪些 Observation 和当前任务相关。

例如：

当前目标：

```
修复支付 bug
```

Observation：

---

A:

```
读取 PaymentService.ts
```

相关：

✅

---

B:

```
读取 UserAvatar.vue
```

无关：

❌

---

C:

```
昨天运行测试失败日志
```

相关：

✅

---

所以：

Context Builder 需要：

```
Relevance Ranking
```

相关性排序。

---

# 4. Observation Priority（优先级）

工业 Agent 通常不会简单：

```
最新优先
```

而是：

多维排序。


例如：

```
Observation Priority

=
Recency

+

Relevance

+

Importance

+

Dependency
```

---

## 1. Recency

最近发生：

优先。

例如：

刚刚执行的 Tool Result。


---

## 2. Relevance

和当前 Goal 相关。

例如：

用户：

```
修改订单逻辑
```

订单相关 Observation：

高。


---

## 3. Importance

信息价值。

例如：

错误：

```
Database connection failed
```

重要。


普通日志：

```
request success
```

低。


---

## 4. Dependency

后续推理依赖。

例如：

```
读取文件内容
```

后面修改代码必须依赖。

高。

---

# 5. Observation Compression

这对应 Day04 学过的：

Context Compression。

例如：

原始 Observation：

```
npm test

Running tests...

Test suite 1 passed

Test suite 2 passed

...

10000 lines

Failed:
PaymentService.test.ts line 20
```

全部保存。

但是给 LLM：

压缩：

```
测试执行失败：

PaymentService.test.ts
line 20

原因：
expected 100
received 0
```

---

所以：

Runtime 保存：

```
Raw Observation
```

Context 使用：

```
Compressed Observation
```

---

架构：

```
Observation

    |

    v

Compression

    |

    v

Context Builder

    |

    v

LLM
```

---

# 6. Observation Eviction（淘汰）

继续连接 Day04。

Context Window 有限制。

所以：

Observation 也需要淘汰。


例如：

Agent 工作 3 小时：

产生：

```
5000 observations
```

不可能全部保留。


策略：

---

## 最近窗口

保留：

```
最近 N 个
```

---

## Summary

旧 Observation：

转换：

```
summary observation
```

例如：

以前：

```
读取100个文件
执行20次测试
修改5个文件
```

压缩：

```
已完成代码分析和初步修复
```

---

## Importance-based Eviction

删除：

低价值 Observation。

保留：

关键决策信息。

---

# 7. Observation 和 Memory 的边界

这里连接 Day06。

很多人会混淆：

Observation：

是不是 Memory？

答案：

不是。

---

## Observation

生命周期：

短期。

属于：

```
Current Task
```

例如：

```
刚刚查询订单
```

---

## Memory

生命周期：

长期。

跨 Task。

例如：

```
用户喜欢使用 TypeScript
```

---

关系：

```
Observation

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

Agent：

读取项目：

Observation：

```
项目使用 pnpm
```

长期有价值：

Memory：

```
该项目默认包管理器为 pnpm
```

---

所以：

Observation 是原始事件。

Memory 是提炼后的知识。

---

# 8. Claude Code 为什么 Context Builder 特别重要？

你之前关注过 Claude Code。

原因：

Coding Agent 的 Observation 极其巨大。

例如：

Tool：

```
read_file
```

可能返回：

几千行代码。

Tool：

```
grep
```

可能返回：

几百个匹配。

Tool：

```
terminal
```

可能返回：

大量日志。

---

如果没有 Context Builder：

Agent 很快失控。

所以 Coding Agent 核心能力之一：

不是：

```
会不会调用工具
```

而是：

```
如何管理工具产生的信息
```

---

这也是为什么：

Claude Code

Cursor

OpenAI Codex

这些产品竞争重点：

不是 Tool Calling。

而是：

```
Context Engineering
```

---

# 9. mini-agent-runtime 设计升级

现在我们的 Runtime：

```
RuntimeState

{
 messages,

 observations,

 memory,

 status
}
```

增加：

```
ObservationManager
```

结构：

```
              Runtime State


                   |

                   v


          Observation Manager


        +----------+----------+

        |                     |

        v                     v


 Compression          Ranking


        |

        v


 Context Builder


        |

        v


 LLM
```

---

接口：

```ts
interface ObservationManager {

  add(
    observation: Observation
  ):void;


  retrieve(
    goal:string
  ):Observation[];


  compress(
    observations:Observation[]
  ):Observation[];

}
```

---

# 10. 工业术语映射

|学习概念|工业术语|
|-|-|
|Observation Manager|Observation Store / Event Manager|
|Observation Ranking|Relevance Ranking|
|Observation Compression|Context Compression|
|Observation Eviction|Context Eviction|
|Observation Projection|Context Projection|
|Runtime State → LLM Context|Context Engineering|

---

# 11. OpenAI Agents SDK 映射

简单模型：

```
Tool Output

    ↓

Conversation History

    ↓

Next Model Call
```

实际上：

```
Tool Output

    ↓

Observation

    ↓

Context Assembly

    ↓

Model Input
```

---

# 12. LangGraph 映射

LangGraph 更明显：

```
State

   |

Node

   |

State Update

   |

Next Node
```

这里：

Node 输出：

就是 Observation。

然后：

更新 State。

---

所以：

```
Observation

=

State Transition Input
```

---

# Part G-4 核心认知升级

今天重点：

---

## 1. Observation 不是直接进入 LLM

错误：

```
Observation

↓

LLM
```

正确：

```
Observation

↓

Runtime State

↓

Context Builder

↓

LLM
```

---

## 2. Context Builder 是 Agent 智能的核心

不是：

```
拼 Prompt
```

而是：

```
从 Runtime 世界中选择当前推理需要的信息
```

---

## 3. Tool 能力只是入口，Context 管理决定 Agent 上限

工业 Agent：

```
Tools
+
Context Engineering
+
Runtime State Management
```

三者缺一不可。

---

# 目前 Day05 Part G 进度

已完成：

✅ G-1 Tool Result ≠ Final Answer  
✅ G-2 Observation Model  
✅ G-3 Observation → Runtime State  
✅ G-4 Context Builder 消费 Observation  


下一节：

# Day05 Part G-5：Tool Error Feedback & Recovery

重点：

1. Tool 失败是不是 Agent 结束？
2. Error Observation 如何进入 Runtime
3. Retry / Fallback / Alternative Tool
4. Agent 如何根据错误重新规划
5. 工业 Agent 的可靠性设计

这一节会把 Day05 从：

**“Agent 能执行工具”**

升级到：

**“Agent 能在真实世界失败环境下运行”。**

## 16. User

继续学习

## 17. Assistant

# Day05 Part G：Tool Result Runtime Feedback

## Part G-5：Tool Error Feedback & Recovery

前面 G-1 ～ G-4，我们已经把 **成功路径** 打通：

```text
User Goal

    ↓

LLM Decision

    ↓

Tool Call

    ↓

Tool Executor

    ↓

Tool Result

    ↓

Observation

    ↓

Runtime State

    ↓

Context Builder

    ↓

LLM Continue
```

但是现实世界不会这么理想。

工业 Agent 最大的问题不是：

> 会不会调用 Tool

而是：

> Tool 失败以后，Agent 能不能继续工作。

所以今天进入：

# Error Feedback & Recovery

---

# 1. Demo Agent 的错误处理

很多简单 Agent：

```ts
try {

  const result =
    await tool.execute();

  return result;

}
catch(error){

  return "执行失败";

}
```

流程：

```text
LLM

 ↓

Tool

 ↓

Error

 ↓

结束
```

---

这种 Agent：

适合：

- Demo
- 简单问答
- 非关键任务

但是企业 Agent 不行。

---

例如：

客服 Agent：

用户：

> 帮我退款


Agent：

调用：

```text
refund_order
```

结果：

```text
Payment API timeout
```

如果直接结束：

用户：

> 怎么了？

Agent：

> 系统错误。

任务失败。

---

工业 Agent 需要：

```text
Error

↓

Observation

↓

Reasoning

↓

Recovery
```

---

# 2. Error 也是 Observation

这是 Part G 的核心。

之前：

成功：

```text
Tool Result

↓

Observation
```

现在：

失败：

```text
Tool Error

↓

Observation
```

统一：

```text
External World Feedback

          ↓

     Observation
```

---

例如：

成功：

```json
{
"type":"tool_result",

"source":"query_order",

"data":{
 "status":"SHIPPED"
}
}
```

---

失败：

```json
{
"type":"tool_error",

"source":"query_order",

"data":{
 "error":"timeout"
}
}
```

---

对于 Runtime：

两者都是：

```text
新的世界状态变化
```

---

# 3. 为什么 Error 不能直接 throw？

传统程序：

```ts
throw Error()
```

结束调用。

但是 Agent：

错误本身也是信息。

例如：

Tool：

```text
search_customer
```

失败：

```text
customer_id not found
```

这其实告诉 Agent：

可能：

方案1：

重新询问用户：

> 请确认客户编号


方案2：

换搜索方式：

```text
search_by_phone
```


方案3：

检查输入：

```text
customer_id 格式错误
```

---

所以：

错误应该进入：

```text
Reasoning Loop
```

而不是：

```text
Exception Loop
```

---

# 4. Error Observation 如何影响下一步？

举例：

用户：

> 查询订单 ORD-001


第一次：

LLM：

```json
{
"tool":"query_order",
"id":"ORD-001"
}
```

---

Tool：

返回：

```json
{
"type":"tool_error",

"error":
"ORDER_SERVICE_TIMEOUT"
}
```

---

进入 Runtime：

```text
Observation:

订单查询失败，原因：
订单服务超时
```

---

下一轮 LLM：

看到：

```text
Previous Action:

query_order


Observation:

timeout
```

可能推理：

方案：

```text
retry
```

生成：

```json
{
"tool":"query_order",
"retry":true
}
```

---

或者：

```text
暂时无法查询，询问用户稍后重试
```

---

重点：

Agent 不只是执行：

而是：

```text
根据反馈调整行为
```

---

# 5. Recovery Strategy（恢复策略）

工业 Agent 常见恢复策略：

---

## 1. Retry（重试）

最简单。

例如：

网络：

```text
timeout
```

执行：

```text
retry
```

---

但是不能无限重试。

需要：

```text
Retry Policy
```

例如：

```ts
{
 maxRetries:3,

 backoff:"exponential"
}
```

---

流程：

```text
失败

 ↓

判断可重试

 ↓

等待

 ↓

重新执行
```

---

## 2. Fallback（降级）

例如：

Tool：

```text
weather_api_primary
```

失败。

切换：

```text
weather_api_backup
```

---

结构：

```text
Primary Tool

      ↓

    failed

      ↓

Fallback Tool
```

---

## 3. Alternative Action（替代方案）

这个更 Agent。

例如：

目标：

> 帮用户订酒店


Tool：

```text
booking_api
```

失败：

```text
库存接口异常
```

Agent：

不是一直 retry。

可能：

换：

```text
recommend_hotels
```

然后告诉用户：

> 当前无法直接预订，我先推荐可选酒店。

---

## 4. Ask User（询问用户）

例如：

Tool：

```text
transfer_money
```

失败：

原因：

```text
缺少收款账号
```

Agent：

应该：

```text
需要用户补充信息
```

---

# 6. Error Recovery 需要 Runtime 管理

这里非常关键。

不能：

```text
Tool 自己 retry
```

为什么？

因为 Tool 不知道 Agent 目标。

例如：

搜索工具：

```text
timeout
```

Tool：

不知道：

- 是否重要？
- 是否可以换工具？
- 是否应该问用户？

---

所以：

恢复属于：

```text
Runtime Policy
```

---

架构：

```text
             Tool Executor


                  |

                  v


             Tool Error


                  |

                  v


          Error Processor


                  |

                  v


            Error Observation


                  |

                  v


             Runtime


                  |

                  v


             LLM Decide
```

---

# 7. Error Processor

类似之前：

成功：

```text
Result Processor
```

失败：

```text
Error Processor
```

---

统一：

```text
Tool Output Handler
```

结构：

```text
             Tool

              |

              v

       Tool Output Handler


        +-------------+

        |             |

        v             v


 Result          Error


        |             |

        +-------------+

              |

              v

        Observation
```

---

# 8. Error Observation 数据结构

扩展：

```ts
interface Observation {

 id:string;


 type:
   | "tool_result"
   | "tool_error";


 source:string;


 data:any;


 metadata?:{

   retryable:boolean;

   errorCode?:string;

 };

}
```

---

例如：

```json
{
"type":"tool_error",

"source":"payment_api",

"data":{
 "message":"timeout"
},

"metadata":{
 "retryable":true,
 "errorCode":"TIMEOUT"
}
}
```

---

LLM 或 Runtime 可以知道：

```text
这个错误是否值得重试
```

---

# 9. Retry 应该由谁决定？

这里有一个工业设计问题。

两个极端：

---

## Tool 决定

```text
Tool:

失败自动 retry 3 次
```

问题：

Tool 不知道业务。


---

## LLM 决定全部

```text
LLM:

看到 timeout

决定 retry
```

问题：

LLM 不稳定。

---

工业方案：

## Runtime Policy + LLM Reasoning

例如：

Runtime：

```text
timeout

↓

允许 retry
```

LLM：

决定：

```text
是否继续任务
```

---

类似：

```text
Runtime 控制边界

LLM 控制策略
```

---

# 10. 连接 Part F Human Approval

这里出现一个重要闭环。

之前：

人工审批：

```text
Human Decision

↓

Observation
```

现在：

错误：

```text
Error

↓

Observation
```

所以：

Runtime 实际处理的是：

```text
Event
```

统一：

```text
                Event


 Tool Result       Error       Human Approval


      \             |             /


              Observation


                   |


              Runtime State
```

---

这就是为什么工业 Agent 越来越像：

- Workflow Engine
- Event Driven System

---

# 11. 和前端工程的对应

这个部分你应该会比较熟。

前端请求：

```text
API Request

↓

Success

↓

Update Store
```

对应：

Agent：

```text
Tool Call

↓

Success Observation

↓

Update Runtime State
```

---

前端异常：

```text
API Error

↓

Error State
```

Agent：

```text
Tool Error

↓

Error Observation

↓

Recovery
```

---

区别：

前端：

人工处理错误。

Agent：

尝试自主恢复。

---

# 12. mini-agent-runtime 设计升级

现在：

```text
Runtime Core


       |

       v


 Tool Executor


       |

       v


 Output Handler


       |

       v


 Observation


       |

       v


 State Reducer


       |

       v


 Runtime State
```

---

Output Handler：

```ts
interface ToolOutputHandler {

 process(
   result:any
 ):Observation;

}
```

---

Error：

```ts
processError(
 error:Error
):Observation
```

---

Runtime：

```ts
switch(observation.type){

 case "tool_error":

    recoveryManager.handle(
       observation
    );

}
```

---

增加：

```text
Recovery Manager
```

---

架构：

```text
              Runtime


                 |

                 v


          Recovery Manager


          /       |       \


      Retry   Fallback   AskUser

```

---

# 13. 工业术语映射

|学习概念|工业术语|
|-|-|
|错误反馈|Error Feedback|
|错误 Observation|Error Event|
|恢复策略|Recovery Strategy|
|重试|Retry Policy|
|降级|Fallback|
|恢复管理器|Recovery Manager|
|输出处理器|Output Handler|
|事件驱动|Event Driven Runtime|

---

# 14. OpenAI Agents SDK / Claude Code 映射

## Claude Code

非常典型。

例如：

执行：

```text
npm test
```

返回：

```text
failed
```

它不会结束。

而是：

Observation:

```text
Test failed:
xxx
```

继续：

```text
分析错误

↓

修改代码

↓

重新测试
```

---

## Coding Agent 本质：

```text
Action

↓

Observation

↓

Fix

↓

Action Again
```

---

这就是：

Agent Loop。

---

# Part G-5 核心认知升级

今天最重要：

---

## 1. Error 不是异常终止，而是 Agent 的输入

传统：

```text
Error = Stop
```

Agent：

```text
Error = Observation
```

---

## 2. Agent 的能力来自反馈闭环

不是：

```text
LLM + Tools
```

而是：

```text
LLM

+

Action

+

Observation

+

Recovery
```

---

## 3. 工业 Runtime 的职责越来越清晰

Runtime 管：

```text
状态

权限

执行

错误

恢复

上下文
```

LLM 管：

```text
理解目标

推理

选择下一步
```

---

# Day05 Part G 完成情况

现在 Part G 全部完成：

✅ G-1 Tool Result ≠ Final Answer  
✅ G-2 Observation Model  
✅ G-3 Observation → Runtime State  
✅ G-4 Context Builder 消费 Observation  
✅ G-5 Error Feedback & Recovery  


---

下一步进入：

# Day05 Part G 总结 + 固定收尾

按照你的固定学习闭环，我会输出：

- 📚 下一节学习计划
- 📝 写书 TODO
- 📦 写书素材
- 本 Part 核心认知升级
- 🏗️ 工业级实现（Industrial Notes）
- 🧭 知识地图
- 🧑‍💻 面试视角
- ❓ 本章思考题
- 🔄 前置问题回收（Pending Questions）

然后再进入 Day05 后续章节。

## 18. User

继续学习

## 19. Assistant

# Day05 Part G 总结：Tool Result Runtime Feedback

Part G 到这里完整结束。

这一 Part 是 Day05 非常关键的一个转折点。

如果说：

- Part A-E 解决：

> Agent 如何拥有行动能力？

那么：

- Part F 解决：

> Agent 如何安全地行动？

而：

- Part G 解决：

> Agent 如何从行动结果中学习，并继续运行？

---

# 一、Part G 完整链路回顾

我们现在把 Day05 Execution Engine 拼完整：

```text
                         User Goal

                            |
                            v

                         LLM

                            |
                            v

                    Tool Decision

                            |
                            v

                    Tool Schema Validate

                            |
                            v

                  Permission / Approval

                            |
                            v

                    Tool Executor

                            |
                            v

                  External World System

                            |
                            v

                  +----------------+

                  | Tool Response  |

                  | Tool Error     |

                  | Human Event    |

                  +----------------+

                            |
                            v

                       Observation

                            |
                            v

                    State Reducer

                            |
                            v

                    Runtime State

                            |
                            v

                   Context Builder

                            |
                            v

                         LLM

                            |
                            v

                    Next Decision
```

这就是一个完整 Agent Execution Loop。

---

# 二、📚 下一节学习计划

Day05 到这里，Execution Engine 已经闭环。

下一阶段进入：

# Day06：Memory System（Agent Memory）

为什么 Day06 接在这里？

因为现在 Agent 已经具备：

```text
短期执行能力
```

但是还有一个问题：

---

现在 Agent：

知道：

```text
当前任务发生了什么
```

例如：

```
用户让我查询订单

↓

调用订单工具

↓

订单已发货
```

但是下一次：

用户：

> 还是按照之前那个地址发货。


Agent：

不知道：

- 什么地址？
- 上次是什么？
- 用户有什么偏好？

---

所以需要：

```text
Memory
```

---

Day06 会解决：

## Part A：Memory 基础模型

学习：

- Memory 是什么
- 为什么 Context 不等于 Memory
- Short-term Memory
- Long-term Memory


---

## Part B：Conversation Memory

学习：

- Chat History
- Message Compression
- Summary Memory


---

## Part C：Semantic Memory

学习：

- 用户偏好
- 知识记忆
- Vector Store


---

## Part D：Memory Retrieval

学习：

- 如何召回 Memory
- Similarity Search
- Ranking


---

## Part E：Memory Write Policy

学习：

重点：

> Agent 什么情况下应该记忆？


例如：

用户：

> 我今天喜欢吃火锅

是否保存？


用户：

> 我公司项目使用 React

是否保存？


---

# 三、📝 写书 TODO

Day05 Execution Engine 可以整理成：

## Chapter：Agent Execution Engine

章节结构：

---

## 1. Tool Calling 不是 Function Calling

核心：

```text
Function Calling:

input
 ↓
function
 ↓
output


Agent Tool Calling:

goal

 ↓

decision

 ↓

permission

 ↓

execution

 ↓

observation

 ↓

next reasoning
```

---

## 2. Tool Registry

核心：

> Tool 是 Agent 能力注册系统，而不是简单函数列表。


包括：

- Tool Metadata
- Schema
- Capability Description
- Dynamic Loading


---

## 3. Permission Layer

核心：

> 工业 Agent 必须具备行动边界。


包括：

- Risk Level
- Policy Engine
- Human Approval


---

## 4. Observation Model

核心：

> Agent 不消费 Tool Result，而消费 Observation。


关系：

```text
Tool Result

↓

Observation

↓

Runtime State

↓

Context

↓

LLM
```

---

## 5. Recovery System

核心：

> Error 是 Agent 的反馈，不是程序终止。


包括：

- Retry
- Fallback
- Alternative Action
- Ask User


---

# 四、📦 写书素材

## 素材 1：普通程序 vs Agent Runtime


普通程序：

```text
Input

 ↓

Function

 ↓

Output
```


Agent：

```text
Goal

 ↓

Reason

 ↓

Action

 ↓

Observation

 ↓

Reason Again

 ↓

Action Again
```


---

## 素材 2：Observation 抽象


错误设计：

```text
Tool Result
      |
      v
LLM
```


工业设计：

```text
Tool Result

      |

      v

Observation

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

## 素材 3：Agent Runtime 越来越像 Workflow Engine


因为它处理：

```
Event

↓

State

↓

Decision

↓

Action
```

而不是简单：

```
Prompt

↓

Response
```

---

# 五、本 Part 核心认知升级

## 升级 1：

以前：

> Tool 是给 LLM 调用的函数。


现在：

> Tool 是 Agent 与外部世界交互的执行能力。

---

## 升级 2：

以前：

> Tool Result 就是结果。


现在：

> Tool Result 是 Observation 的来源。


---

## 升级 3：

以前：

> Error 是异常。


现在：

> Error 是 Agent 可以理解的信息。


---

## 升级 4：

以前：

> Agent Loop = LLM 循环调用。


现在：

> Agent Loop = Event → State → Decision → Action。

---

# 六、🏗️ 工业级实现（Industrial Notes）

工业 Agent Execution Engine 通常包含：

```text
Execution Layer


├── Tool Registry

├── Tool Selector

├── Schema Validator

├── Permission Engine

├── Approval Manager

├── Tool Executor

├── Result Processor

├── Observation Manager

├── Recovery Manager

└── State Reducer
```

---

对应职责：

|模块|职责|
|-|-|
|Tool Registry|管理能力|
|Tool Selector|选择工具|
|Schema Validator|参数校验|
|Permission Engine|安全控制|
|Approval Manager|人工审批|
|Executor|执行|
|Result Processor|转换结果|
|Observation Manager|管理反馈|
|Recovery Manager|失败恢复|
|State Reducer|更新状态|

---

# 七、🧭 知识地图（Knowledge Map）

Day05 在 Agent Runtime 中的位置：

```text
                    Agent Runtime


                         |

        +----------------+----------------+

        |                                 |

 Decision Engine                 Execution Engine


        |                                 |

   Goal Planning                  Tool Calling


   Reasoning                      Executor


   Context                       Permission


                                  Observation


                                  Recovery


                         |

                         v


                    Memory System
```

---

Day05 解决：

```text
Agent 如何行动
```

Day06 解决：

```text
Agent 如何记住
```

---

# 八、🧑‍💻 面试视角

## Q1：

为什么 Agent Tool Calling 不等于普通 Function Calling？


回答：

> Function Calling 只是模型生成函数参数，而 Agent Tool Calling 包含完整执行生命周期，包括 Tool Discovery、Permission Check、Execution、Observation Feedback 和下一轮 Reasoning。


---

## Q2：

为什么需要 Observation？


回答：

> Tool Result 是外部系统返回的数据，而 Observation 是 Runtime 对外部反馈的统一抽象，使 Tool Result、Error、Human Approval 等事件可以统一进入 Agent Loop。


---

## Q3：

Agent 如何处理 Tool Error？


回答：

> 工业 Agent 不会直接终止，而是把 Error 转换成 Observation，由 Runtime 根据策略执行 Retry、Fallback、Alternative Action 或请求用户补充信息。


---

## Q4：

Runtime State 和 Conversation History 有什么区别？


回答：

> Conversation History 只是用户与 Agent 的消息记录，而 Runtime State 包含 Agent 当前运行所需的完整状态，包括 Tool Call、Observation、Memory、Pending Action 等。


---

# 九、❓本章思考题

建议你自己回答：

---

### 1.

为什么 Observation 不直接叫 Tool Result？

---

### 2.

如果一个 Tool 返回 10MB 数据，应该直接保存到 Runtime State 吗？

为什么？

---

### 3.

Retry 应该由 Tool、LLM 还是 Runtime 决定？

为什么？

---

### 4.

Human Approval 和 Tool Error 为什么都可以抽象成 Observation？

---

### 5.

为什么说 Context Builder 是 Agent 的核心竞争力？

---

# 十、🔄 前置问题回收（Pending Questions）

目前 Day05 遗留问题：

---

## Q1：

Runtime State 应该存在数据库吗？

答案：

工业系统通常需要。

后续：

- Durable Execution
- Workflow
- Long Running Agent

会展开。

---

## Q2：

Observation 是否等于 Event？

答案：

概念接近。

更准确：

```text
Event
=
系统发生的事实

Observation
=
Agent Runtime 对事件的理解形式
```

后续 Workflow 会进一步展开。

---

## Q3：

Memory 是否就是长期 Observation？

答案：

不是。

关系：

```text
Observation

      |

      v

Memory Extraction

      |

      v

Long-term Memory
```

Day06 会展开。

---

# Day05 完成状态

✅ Tool Calling 基础  
✅ Tool Decision  
✅ Tool Schema  
✅ Tool Registry  
✅ Tool Executor  
✅ Permission  
✅ Human Approval  
✅ Observation Model  
✅ Runtime Feedback  
✅ Error Recovery  


到这里，你已经完成了：

# Agent Runtime 的 Execution Engine

下一阶段进入：

# Day06：Memory System

核心问题：

> 一个 Agent 如何从“一次任务执行器”，变成“长期工作的智能体”。

## 20. User

Observation 整体感受下来更像是一层数据清洗格式化层？Tool Result 到Observation 中提到在定义interface 时type 为"tool_result"| "tool_error"| "human_approval"，那岂不是 tools 的响应格式都必须符合这种格式枚举，不然可能会识别不了
。这是不是有点像业务逻辑了呢？

## 21. Assistant

你这个问题非常好，而且实际上你已经触碰到了 **Agent Runtime 设计里面一个非常核心的边界问题**：

> Observation 到底是不是一个“数据清洗层”？  
> 如果 Observation 有固定 type，是不是 Runtime 开始侵入业务逻辑？

答案：

**你的感觉对了一半。**

Observation 确实有“数据归一化”的作用，但是它不是普通的数据清洗层；同时，Observation 的 type 也不是要求所有 Tool 必须返回固定格式。

这里需要重新拆一下工业设计。

---

# 1. Observation 像数据清洗层吗？

先看传统系统：

```text
数据库

 ↓

DTO转换

 ↓

Service

 ↓

业务逻辑
```

DTO：

负责：

- 字段转换
- 格式统一
- 类型适配


Observation 有类似作用：

```text
External World

       |

       v

Tool Result

       |

       v

Observation

       |

       v

Runtime
```

它确实负责：

- 不同来源统一
- 错误格式统一
- 生命周期统一

所以你的理解：

> Observation 更像一层数据清洗格式化层

这是正确的一部分。

---

但是区别在于：

普通 DTO：

解决：

> 数据长什么样？

Observation：

解决：

> Runtime 如何理解外部世界发生了什么？

---

举个例子。

三个来源：

---

Tool:

```json
{
 "orderStatus":"SHIPPED"
}
```

---

Human:

```json
{
 "approve":true
}
```

---

System:

```json
{
 "timeout":5000
}
```

DTO 思维：

转换成：

```json
{
 data:any
}
```

结束。

---

Observation 思维：

需要表达：

```json
{
 event:"something happened",
 source:"xxx",
 impact:"runtime should react"
}
```

所以它更接近：

> Event Normalization（事件归一化）

而不是简单 DTO。

---

# 2. 那为什么 Observation type 有固定枚举？

你问：

> type 为 "tool_result" | "tool_error" | "human_approval"，那是不是所有 Tool 响应必须符合这个格式？

这里有一个误解。

这个 type：

不是 Tool 返回格式。

而是：

**Runtime 内部事件分类。**

两者方向相反。

---

错误理解：

```
Tool

返回:

{
 type:"tool_result"
}

↓

Runtime
```

像这样：

```
Tool 被要求遵守 Runtime 协议
```

---

工业设计：

应该是：

```
Tool

返回任意业务结果


↓

Adapter


↓

Observation
```

---

例如：

你的订单 Tool：

```ts
async queryOrder(id){

 return {

   orderId:"001",

   status:"SHIPPED",

   deliveryDate:"2026-08-10"

 }

}
```

完全不用知道 Observation。

---

然后：

Result Adapter：

```ts
function processToolResult(result){

 return {

   type:"tool_result",

   source:"queryOrder",

   data:result

 }

}
```

---

所以：

真正结构：

```
Tool

  |
  |
  v

Tool Result
(业务数据)


  |
  |
  v

Result Processor
(Runtime Adapter)


  |
  |
  v

Observation
(Runtime 数据模型)
```

---

# 3. 这是不是业务逻辑侵入？

你的第二个问题更关键：

> 这是不是有点像业务逻辑了？

答案：

**如果设计不好，会。**

这也是 Agent Runtime 设计容易踩坑的地方。

---

错误设计：

```ts
ResultProcessor(){

 if(tool==="refund"){

   if(result.status==="SUCCESS"){

      observation.type="success"

   }

 }

 if(tool==="order"){

 }

}
```

这就是污染。

为什么？

因为 Runtime 开始知道：

- refund 怎么处理
- order 怎么处理
- payment 怎么处理


这不应该。

---

正确分层：

## Tool 层

负责：

业务能力。

例如：

```text
退款

查询订单

搜索商品
```

---

## Runtime 层

负责：

执行生命周期。

例如：

```text
成功

失败

等待

暂停

恢复
```

---

所以 Runtime 只关心：

```json
{
"type":"tool_result",

"source":"refund_order",

"data":{

  "refund_id":"xxx",

  "status":"SUCCESS"

}

}
```

它不知道：

SUCCESS 代表退款成功。

---

# 4. 那 Runtime 怎么知道 SUCCESS 的意义？

这里就是你 Day05 Part C 问过的问题：

> LLM 怎么知道 status=SHIPPED 是什么意思？


答案一样：

靠 Tool Schema 和 Description。

---

例如 Tool 定义：

```json
{
"name":"query_order",

"description":
"查询订单状态",

"parameters":{

 "order_id":{
   "type":"string"
 }

}
}
```

返回：

```json
{
"status":"SHIPPED"
}
```

---

Runtime 不理解。

LLM 根据上下文理解：

```
query_order 返回：

status=SHIPPED

说明订单已经发货
```

---

所以：

分工：

|层|理解什么|
|-|-|
|Tool|业务含义|
|Runtime|执行状态|
|LLM|业务推理|

---

# 5. 那 Observation type 会不会越来越多？

会。

例如未来：

```ts
type ObservationType =
 
 "tool_result"

 "tool_error"

 "human_approval"

 "external_event"

 "memory_update"

 "workflow_event"

 "system_event"
```

---

但是注意：

这些不是业务类型。

不会出现：

```ts
"refund_success"

"order_shipped"

"user_likes_react"
```

因为这些属于业务。

---

正确：

```
Runtime Event Type

        +

Business Payload
```

例如：

```json
{
"type":"tool_result",

"source":"refund_order",

"data":{

 "refund_status":"SUCCESS"

}

}
```

---

# 6. 这其实和浏览器事件模型很像

你是前端工程师，这里有一个非常类似的设计。

DOM Event：

```ts
{
 type:"click",

 target:"button"
}
```

浏览器不会定义：

```ts
type:"buy_product_button_click"
```

因为这是业务。

---

业务：

```js
button.onclick(){

 buyProduct()

}
```

---

Agent Observation：

也是一样。

Runtime：

```json
{
type:"tool_result"
}
```

业务：

```json
{
 source:"refund_order",

 data:{
   refund_status:"SUCCESS"
 }
}
```

---

# 7. 更工业化一点的 Observation 设计

之前那个 interface：

```ts
interface Observation {

 type:
   | "tool_result"
   | "tool_error"
   | "human_approval"

 data:any

}
```

其实还是教学简化版。


工业可能：

```ts
interface RuntimeEvent {


 id:string;


 category:
   |
   "execution"
   |
   "approval"
   |
   "system";


 source:string;


 payload:any;


 metadata:{

   timestamp:string;

   traceId:string;

 };


}
```

---

例如：

Tool 成功：

```json
{
category:"execution",

source:"query_order",

payload:{
 status:"SHIPPED"
}
}
```

---

Human：

```json
{
category:"approval",

source:"human",

payload:{
 decision:"approved"
}
}
```

---

Runtime：

只处理：

```text
execution event

approval event

system event
```

---

# 8. 回到 mini-agent-runtime 应该怎么设计？

如果我们自己实现：

我会调整之前设计。

不要：

```ts
Observation.type
```

绑定业务。

改：

```ts
interface Observation {

 id:string;


 kind:
  "execution"
  |
  "approval"
  |
  "system";


 source:string;


 payload:any;


}
```

---

Tool：

完全自由：

```ts
return {

 orderId:"001",

 status:"SHIPPED"

}
```

---

Adapter：

负责：

```ts
return {

 kind:"execution",

 source:"query_order",

 payload:result

}
```

---

这样：

Runtime 不知道：

订单是什么。

支付是什么。

退款是什么。

---

# 9. 这个问题其实对应 Agent 工业架构中的一个原则

叫：

> Runtime should be domain-agnostic

中文：

> Runtime 应该与业务领域无关。


好的 Agent Runtime：

类似：

- 操作系统
- 浏览器 Runtime
- Workflow Engine


它提供：

```
执行能力

状态管理

事件处理

权限

恢复
```

但是：

不懂：

```
订单

支付

库存

代码
```

---

# 总结你的两个问题

## 问题1：

> Observation 是不是数据清洗格式化层？

答案：

**部分是。**

更准确：

```
Observation
=
Event Normalization Layer

+
Runtime State Input Model
```

不是简单 DTO。


---

## 问题2：

> Tool Response 是否必须符合 Observation 枚举？

答案：

**不是。**

正确：

```
Tool Result
(业务世界)

        ↓

Adapter / Processor

        ↓

Observation
(Runtime世界)
```

Tool 不知道 Observation。

---

## 问题3：

> 这是不是业务逻辑？

答案：

如果 Observation 里面出现：

```
refund_success
order_shipped
payment_failed
```

就是业务污染。

工业设计应该：

```
Runtime Event Type
+
Business Payload
```

分离。

---

其实你这个问题已经进入 Day05 最后一个隐藏层：

> **Agent Runtime 和业务 Agent 的边界在哪里？**

这个边界也是为什么 LangGraph、OpenAI Agents SDK、Claude Code 都会强调：

**Runtime 是通用执行框架，Agent Logic 才承载业务。**

这个认知非常重要。你前面一直在问“哪些应该内置 Runtime，哪些应该作为 Tool/MCP”，本质上就是同一个架构边界问题。你这里已经开始从“实现 Agent”进入“设计 Agent 平台”的视角了。

## 22. User

好的 谢谢你 本节还有要补充的吗

## 23. Assistant

不用客气。这个问题其实是 Part G 里面**最值得补充的一层架构认知**。

前面的 G-1 ～ G-5 已经覆盖了 Agent Feedback Loop 的主流程，但是你刚才提出的问题暴露了一个工业实现中经常被忽略的点：

> Observation Layer 和 Domain Layer 的边界。

所以我补充几个工业设计细节。

---

# 补充 1：Observation 不只是“数据格式”，它还有 Runtime 语义

刚才我们说：

```text
Tool Result

↓

Observation
```

容易让人觉得：

> 不就是包一层 JSON 吗？

其实不是。

Observation 还有 Runtime 语义。

例如：

两个 Tool 返回：

---

Tool A:

```json
{
 "success":true
}
```

---

Tool B:

```json
{
 "success":true
}
```

业务含义完全不同。

但是 Runtime 看：

都是：

```text
execution succeeded
```

所以 Runtime 可以做：

```text
继续执行
更新状态
触发下一轮推理
```

---

也就是说：

Observation 的价值不是增加字段。

而是：

> 把业务世界转换成 Runtime 可以处理的事件模型。

---

# 补充 2：Observation 和 Message 的关系还可以再深入一点

之前我们说：

```text
Message
=
Conversation Layer


Observation
=
Execution Layer
```

但是工业 Agent 最后都会汇聚到：

```text
Context Builder
```

所以最终：

```text
                Runtime State


       +-------------------------+

       |                         |

       v                         v


 Conversation              Execution


 Message                   Observation


       |                         |

       +-----------+-------------+

                   |

                   v

           Context Builder

                   |

                   v

              LLM Context
```

---

所以：

Message 和 Observation 是两个不同来源的信息。

但是：

LLM 最终看到的是：

**Context Builder 生成的统一视图。**

---

# 补充 3：为什么 Observation 不应该让 LLM 直接生成？

这里有一个容易误解的地方。

有人会设计：

```text
Tool Result

↓

LLM

↓

Observation
```

也就是让 LLM 判断：

“这个结果是什么类型？”

例如：

LLM 输出：

```json
{
"type":"human_approval"
}
```

---

工业一般不会这么做。

原因：

LLM 不可靠。

例如：

工具返回：

```json
{
"error":"permission denied"
}
```

LLM 可能理解成：

```text
用户拒绝
```

但是实际上：

```text
系统权限错误
```

---

所以：

Observation 创建通常由：

```text
Runtime Code
```

完成。

不是：

```text
LLM
```

---

结构：

正确：

```text
Tool

↓

Runtime Adapter

↓

Observation

↓

LLM
```

不是：

```text
Tool

↓

LLM

↓

Observation
```

---

# 补充 4：Observation 其实是 Agent Runtime 的“事件总线”

这个是更高级一点的理解。

如果继续工业化：

Observation 可以演化成：

```text
Runtime Event
```

类似：

前端：

```text
DOM Event

↓

Event Bus
```

后端：

```text
Kafka Event

↓

Consumer
```

Agent：

```text
Observation

↓

Runtime Event Bus

↓

State Reducer
```

---

例如：

多个模块监听：

```text
Observation Created
```

然后：

Memory：

保存重要信息。


Logger：

记录。


Monitor：

统计。


Recovery：

处理失败。


---

架构：

```text
                 Observation


                      |

                      v


              Runtime Event Bus


        +-------------+-------------+

        |             |             |


      State        Memory       Monitor


      Update       Extract      Logging

```

---

这就是为什么工业 Agent Runtime 后面会越来越像：

- Workflow Engine
- Event Driven Architecture

---

# 补充 5：什么时候 Observation 应该进入 Memory？

这个边界非常重要。

错误：

```text
所有 Observation

↓

Memory
```

会爆炸。


例如：

Tool：

```text
ls node_modules
```

产生：

```text
10000 文件列表
```

没有意义。


---

正确：

Observation：

```text
短期事实
```

经过：

```text
Memory Policy
```

判断。

例如：

用户说：

> 我喜欢使用 pnpm


Observation：

```json
{
"type":"user_statement",
"content":
"喜欢 pnpm"
}
```

Memory Extractor：

判断：

长期价值：

✅

写入：

```text
User Preference Memory
```

---

所以：

链路：

```text
Observation

      |

      v

Memory Evaluator

      |

      v

Memory
```

这个会在 Day06 展开。

---

# 补充 6：Runtime Event Type 和业务 Event Type 要严格分离

这是你刚才问题最核心的地方。

举例：

错误：

```ts
type:
 "ORDER_SHIPPED"
```

为什么错误？

因为 Runtime 被订单业务污染。


---

正确：

Runtime：

```ts
type:
 "TOOL_RESULT"
```

业务：

```json
{
source:"order_service",

payload:{
 status:"SHIPPED"
}
}
```

---

未来换成：

电商：

```text
order_service
```

金融：

```text
payment_service
```

代码 Agent：

```text
terminal_tool
```

Runtime 不需要修改。

---

# 补充 7：和 MCP 的关系（提前连接 Day10）

这个问题其实也能解释：

为什么 MCP 不应该进入 Runtime Core。


MCP 提供：

```text
外部能力发现

Tool Schema

Tool Connection
```

它属于：

```text
Tool Layer
```

---

而 Observation 属于：

```text
Runtime Layer
```

关系：

```text
                 Runtime


                    |

                    v


             Observation


                    |


          +---------+---------+

          |                   |


       Internal Tool       MCP Tool

```

---

无论 Tool 来自：

- 本地函数
- HTTP API
- MCP Server

最终：

都应该产生：

Runtime 可以理解的 Observation。

---

# 最后总结一下本节隐藏知识点

你刚才的问题其实让 Part G 从：

### 初级理解：

> Tool Result 转换成统一格式

升级到了：

### 工业理解：

> Observation 是 Runtime 与业务世界之间的隔离层。

核心原则：

```
Domain Logic
       |
       |
       v
Tool

       |

       v

Observation Adapter

       |

       v

Runtime Event

       |

       v

Agent Runtime
```

---

所以 Part G 到这里，我认为没有必须继续补充的大块内容了。

但是我建议把你刚才这个问题作为 **Day05 Part G 的“架构边界重点”写入书籍素材**，因为这是从“实现一个 Agent”迈向“设计 Agent Runtime 平台”的分水岭。

下一步可以进入 Day06 Memory System。

进入 Day06 后，会出现一个新的类似问题：

> Memory 是不是 Observation 的长期存储？

这个问题会和今天的 Observation 边界形成完整闭环。

## 24. User

但是我看到 day05 的学习计划中 part G 之后是- `day05-part-h-multi-tool-loop.md`：Multi Tool Loop
- `day05-part-i-mini-tool-runtime-implementation.md`：Mini Tool Runtime 实现

## 25. Assistant

你这个提醒是对的，我刚才这里**学习节奏跑偏了一点**。

我前面把 Part G 按照“概念闭环”讲完后，直接进入了固定收尾和 Day06 规划，但按照我们最初制定的 Day05 README：

```text
Day05 Tool Calling（Execution Engine）

Part A Tool Calling 基础模型

Part B Tool Decision

Part C Tool Schema

Part D Tool Registry

Part E Tool Executor

Part F Permission / Human Approval / Error Handling

Part G Tool Result Runtime Feedback

Part H Multi Tool Loop

Part I Mini Tool Runtime Implementation
```

所以正确顺序应该是：

```
Day05 Execution Engine

        |
        |
        v

Tool 能力定义
(A-C)

        |
        v

Tool 管理与执行
(D-E)

        |
        v

安全与可靠性
(F)

        |
        v

反馈闭环
(G)

        |
        v

多 Tool 协作执行
(H)

        |
        v

自己实现 Mini Tool Runtime
(I)
```

---

而且实际上 Part H 和 Part I 不能跳。

原因是：

Part G 解决的是：

> 单次 Tool 调用结束以后，Runtime 如何接收反馈并继续推理。

但是现实 Agent 很少只调用一次 Tool。

例如 Coding Agent：

```
用户：

修复登录 bug


LLM:

调用 grep


Observation:

找到 auth.ts


LLM:

调用 read_file


Observation:

读取代码


LLM:

调用 edit_file


Observation:

修改完成


LLM:

调用 test


Observation:

测试失败


LLM:

再次修改

...
```

这里就是：

# Part H：Multi Tool Loop

解决：

> Agent 如何连续调用多个 Tool，并管理整个执行轨迹。

---

然后：

# Part I：Mini Tool Runtime Implementation

就是把 Day05 前面所有设计落地：

我们会真正组合：

```text
Runtime Loop

+

Tool Registry

+

Tool Schema

+

Tool Executor

+

Permission

+

Observation

+

Recovery

+

Multi Tool Loop
```

形成：

```text
Mini Agent Runtime
```

---

所以调整一下：

刚才 Part G 的总结保留，但是**Day06 不应该现在开始**。

正确下一步：

# Day05 Part H：Multi Tool Loop

重点：

1. 为什么 Agent Loop 不等于一次 Tool Call
2. 多 Tool 调用的数据流
3. Tool Call Chain
4. Intermediate Observation
5. Stop Condition（什么时候停止调用 Tool）
6. 防止无限循环
7. 最大步数限制（Max Iterations）
8. OpenAI Agents SDK / Claude Code 的 Multi-step Execution 映射


然后：

# Day05 Part I：Mini Tool Runtime Implementation

开始代码设计：

- Runtime Loop
- Tool Registry
- Tool Executor
- Observation Pipeline
- State Update
- Multi Tool Execution


你刚才这个纠正其实也挺重要，因为它体现了一个 Agent 学习路线上的区别：

**Part G 是“反馈机制”，但不是 Execution Engine 的终点。**

真正完整的 Execution Engine 应该是：

```
Action

↓

Observation

↓

Decision

↓

Action Again

↓

...

↓

Goal Completed
```

也就是：

**Part H Multi Tool Loop 才把 Agent Loop 真正闭环。**

我们继续进入：

# Day05 Part H：Multi Tool Loop
