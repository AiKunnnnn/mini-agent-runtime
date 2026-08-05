# Day05 Part H ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a72f6c8-2228-83e8-ad10-0e94c42d3e6e
- 会话标题：Day05 Part H：Multi Tool Loop
- 抽取时间：2026-08-05

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part H 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05 的 readme 与 part G 的学习笔记，你看一下，然后我们进入 part H的学习

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Assistant

我已经看完你上传的两个文件：

- Day05 README：确认整体路线，Part G 之后进入 **Part H：Multi Tool Loop**，再进入 Part I：Mini Tool Runtime Implementation。fileciteturn0file0
- Day05 Part G 学习笔记：确认 Part G 已经完成了 Tool Result → Observation → Runtime State → Context Builder → Next LLM Turn 的反馈闭环。fileciteturn0file1

先简单确认一下我们的学习进度：

## Day05 当前进度

目前已经完成：

```text
Part A Tool Calling Basics
        |
        v
Part B Tool Decision
        |
        v
Part C Tool Schema
        |
        v
Part D Tool Registry
        |
        v
Part E Tool Executor
        |
        v
Part F Permission & Human Approval
        |
        v
Part G Tool Result Runtime Feedback
```

现在 Agent Runtime 的一次完整 Tool 生命周期已经闭环：

```text
User Goal
    |
    v
Context Builder
    |
    v
LLM Decision
    |
    v
Tool Call Intent
    |
    v
Tool Registry
    |
    v
Tool Executor
    |
    v
Permission / Approval
    |
    v
External World
    |
    v
Tool Result / Error
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
Next LLM Turn
```

Part G 实际上补齐的是 Agent 和传统 API 调用最大的区别：

普通程序：

```
call api
 ↓
get result
 ↓
return
```

Agent：

```
call tool
 ↓
observe result
 ↓
update state
 ↓
rethink
 ↓
decide next action
```

所以 Part G 是 Execution Engine 的反馈闭环。

---

# Day05 Part H：Multi Tool Loop

接下来进入：

> **Day05 Part H：Multi Tool Loop（多 Tool 调用循环）**

这一节会解决一个非常关键的问题：

> Agent 为什么不是“调用一次 Tool”，而是可以连续执行多个动作直到完成目标？

因为真实任务几乎不会只有一次 Tool：

例如：

用户：

> 帮我查询订单状态，如果已经发货，帮我通知用户。

单次 Tool：

```
get_order()
```

是不够的。

完整 Agent Loop：

```
Think
 |
 v
Tool Call 1
(get_order)

 |
 v

Observation
(订单已发货)

 |
 v

Think

 |
 v

Tool Call 2
(send_notification)

 |
 v

Observation
(通知成功)

 |
 v

Think

 |
 v

Final Answer
```

这就是 Multi Tool Loop。

---

## Part H 核心问题

按照 README，Part H 重点：

fileciteturn0file0

1. 为什么 Agent Loop 不等于一次 Tool Call
2. 多 Tool 调用的数据流
3. Tool Call Chain
4. Intermediate Observation
5. Stop Condition
6. 如何防止无限循环
7. 最大步数限制
8. OpenAI Agents SDK / Claude Code 的 Multi-step Execution 映射

---

## 我们这一节会重点建立几个认知升级

### 升级 1：

从：

> Agent 会调用 Tool

升级到：

> Agent 是一个持续运行的 Decision → Action → Observation 循环


---

### 升级 2：

从：

```
LLM
 |
Tool
 |
Result
```

升级到：

```
LLM
 |
Tool Call
 |
Execution
 |
Observation
 |
State Update
 |
LLM
 |
Tool Call
 |
...
```

也就是：

```
Agent Loop
```

---

### 升级 3：

理解为什么 Runtime 必须管理 Loop。

很多 Demo：

```js
const result = await tool(args)

return llm(result)
```

其实只是：

```
Single Tool Calling
```

不是完整 Agent。

工业 Runtime 必须解决：

- 当前执行到第几步
- 已经调用哪些 Tool
- 是否应该继续
- 是否陷入循环
- 是否达到预算
- 是否需要停止


---

## Part H 和之前章节的关系

Part A-G 是：

> 单个 Tool 生命周期


Part H 是：

> 多个 Tool 生命周期如何串起来


关系：

```
Part A-C

定义能力
(Tool Contract)


      ↓


Part D

管理能力
(Tool Registry)


      ↓


Part E

执行能力
(Tool Executor)


      ↓


Part F

治理能力
(Permission)


      ↓


Part G

反馈能力
(Observation)


      ↓


Part H

循环能力
(Multi Tool Loop)
```

到了 Part H，Agent Runtime 才真正拥有：

```
自主执行能力
```

---

接下来我们正式开始：

# Day05 Part H：Multi Tool Loop

## 第一部分：

**为什么 Agent Loop 不等于一次 Tool Call**

我会继续按照之前 Day05 的学习方式：

- Runtime 内部设计
- 工业 Agent 对应概念
- OpenAI Agents SDK / Claude Code / LangGraph 映射
- 面试视角
- mini-agent-runtime 实现思路

展开。

## 7. User

开始学习

## 8. Assistant

# Day05 Part H：Multi Tool Loop

我们开始 Part H。

这一节其实是 Day05 一个非常关键的转折点。

前面 Part A-G，我们一直在拆：

> 一个 Tool 调用完整生命周期是什么？

到了 Part H，问题升级：

> 如果 Agent 需要完成一个真实任务，它如何连续调用多个 Tool，并且知道什么时候继续、什么时候停止？

也就是从：

```text
Tool Calling
```

进入：

```text
Agent Loop
```

---

# 1. 为什么 Agent Loop 不等于一次 Tool Call

先回顾 Part G。

我们已经有：

```text
LLM
 |
 v
Tool Call Intent
 |
 v
Tool Executor
 |
 v
Tool Result
 |
 v
Observation
 |
 v
Runtime State
```

如果只看一次执行：

```text
User:
查询订单状态


LLM:

调用 get_order


Tool:

返回订单状态


Agent:

回答用户
```

看起来已经完成。

但是这只是：

```text
Single Tool Execution
```

不是完整 Agent。

---

## 真实任务通常是多步骤

例如：

用户：

> 帮我查一下订单，如果已经送达，给客户发一个满意度调查。

这里至少需要：

### 第一步：

查询订单

```text
get_order(orderId)
```

得到：

```json
{
 "status":"DELIVERED"
}
```

---

### 第二步：

根据结果决定下一步。

Agent 发现：

```text
订单已经送达
```

所以目标还没有完成。

需要：

```text
send_survey()
```

---

### 第三步：

发送调查。

返回：

```json
{
 "success":true
}
```

---

最后：

```text
任务完成
```

完整过程：

```text
          Think
            |
            v
      get_order()
            |
            v
       Observation
            |
            v
          Think
            |
            v
     send_survey()
            |
            v
       Observation
            |
            v
          Think
            |
            v
       Final Answer
```

这就是：

> Multi Tool Loop

---

# 2. Agent 的本质变化

前面我们说：

Tool Calling 让 LLM 从聊天模型变成 Agent。

但是严格来说：

**只有 Tool Calling + Loop，才是真正的 Agent。**

为什么？

因为：

单次 Tool：

```text
Input
 |
LLM
 |
Action
 |
Output
```

更像：

```text
Function Calling
```

而 Agent：

```text
Goal

 |
 v

Reason

 |
 v

Action

 |
 v

Observation

 |
 v

Update State

 |
 v

Reason again

 |
 v

Action again

 |
...
```

核心增加的是：

```text
Iteration
```

也就是：

> Agent 不知道下一步是什么，它需要根据环境反馈动态决定。

---

# 3. Multi Tool Loop 在 Runtime 中的位置

结合 Day05 前面的架构：

现在完整 Runtime：

```text
                 Runtime Loop

                      |
                      v

             Context Builder

                      |
                      v

                    LLM

                      |
                      v

              Tool Call Intent

                      |
                      v

              Tool Executor

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
                      |
                      +----------------+
                                       |
                                       v

                              Context Builder

```

注意：

这里形成了一个环。

所以叫：

## Agent Loop

或者工业中：

- ReAct Loop
- Agent Execution Loop
- Reasoning-Acting Loop
- Control Loop

---

# 4. Multi Tool Loop 的核心数据结构

一个简单 Demo：

```ts
await tool.execute()
await llm()
```

无法支持多步骤。

Runtime 需要记录：

## 1. 当前任务状态

```ts
interface RuntimeState {

  goal:string;

  messages:Message[];

  toolCalls:ToolCallRecord[];

  observations:Observation[];

  step:number;

  status:
    |"thinking"
    |"executing"
    |"completed"
    |"failed";
}
```

---

例如：

执行第一步：

```json
{
 "goal":"帮客户发送调查",
 "step":1,
 "status":"executing"
}
```

调用：

```json
{
"name":"get_order"
}
```

---

执行完成：

State:

```json
{
"step":2,
"observations":[
 {
  "type":"tool_result",
  "summary":"订单已经送达"
 }
]
}
```

---

下一轮 LLM 看到：

```text
Goal:
发送满意度调查


Observation:
订单已经送达
```

然后决定：

```json
{
"name":"send_survey"
}
```

---

# 5. Multi Tool Loop 的核心代码模型

最简单 Runtime：

```ts
async function runAgent(state){

 while(true){

   const decision =
      await llm(state);


   if(decision.type==="final"){
      return decision.answer;
   }


   if(decision.type==="tool_call"){

      const result =
          await executor.execute(
             decision.toolCall
          );


      const observation =
          processResult(result);


      state =
          reducer(
            state,
            observation
          );

   }

 }

}
```

这里最重要的是：

```ts
while(true)
```

这个循环。

它就是 Agent Runtime 的核心。

---

# 6. 为什么不能简单 while(true)

这里马上出现工业问题。

如果：

LLM：

```
调用 tool A
```

Tool：

```
失败
```

LLM：

```
再次调用 tool A
```

失败

继续：

```
调用 tool A
```

...

怎么办？


所以 Runtime 必须管理：

## Loop Control


包括：

### 1. 最大步数

例如：

```ts
maxSteps=20
```


超过：

```text
Agent stopped:
maximum steps exceeded
```

---

### 2. Token Budget

例如：

```text
最多消耗 100k tokens
```

---

### 3. Tool Call 次数限制

例如：

```text
同一个 Tool 5 次失败后停止
```

---

### 4. Timeout

例如：

```text
整个 Agent Session 最多运行 5 分钟
```

---

这些不是 LLM 决策。

这是：

> Runtime Policy


---

# 7. Runtime Policy 和 LLM Reasoning 的边界

这个点和 Part F / Part G 是连续的。


错误设计：

```text
所有事情交给 LLM
```


例如：

"你自己决定最多执行多少次"

不可靠。


工业设计：

```text
Runtime Policy

负责:

- 最大步骤
- 超时
- 权限
- 成本
- 安全


LLM

负责:

- 下一步做什么
- 哪个 Tool 更合适
- 如何完成目标

```

关系：

```text
             Runtime Policy

                    |
                    v

             Allowed Actions


                    |

                    v


                 LLM


                    |

                    v


             Next Action

```

---

# 8. Intermediate Observation（中间观察）

Multi Tool Loop 一个重要概念：

> 中间结果不是噪音，而是 Agent 的推理依据。


例如 Coding Agent：

Claude Code 类似流程：

```text
用户:

修复 bug


Step1:

Read File


Observation:

发现错误代码


Step2:

Edit File


Observation:

文件修改完成


Step3:

Run Test


Observation:

测试失败


Step4:

Fix


Step5:

Run Test


Observation:

测试通过
```

这里：

每一次：

```text
Tool Result
```

都是：

```text
下一步 Action 的依据
```

---

所以：

Observation 不是：

```text
日志
```

而是：

```text
Decision Input
```

---

# 9. Multi Tool Loop 和 Workflow 的区别

这里非常重要。

很多人会混淆：

Agent Loop

和

Workflow


## Workflow：

提前定义：

```text
A
 |
B
 |
C
```

例如：

订单流程：

```text
查询订单
 |
退款审批
 |
退款执行
```

固定。


---

Agent：

运行时决定：

```text
A
 |
?
 |
B
 |
?
 |
C
```

下一步未知。


---

区别：

Workflow:

```text
Developer defines path
```

Agent:

```text
Runtime + LLM decides path
```

---

工业系统通常：

不是二选一。

而是：

```text
Workflow Constraint

        +

LLM Decision

        +

Runtime Loop
```

---

# 10. 本节核心认知升级

从：

> Tool Calling = 调用工具

升级：

> Agent = 在反馈中连续选择行动


从：

```text
LLM -> Tool -> Result
```

升级：

```text
LLM
 |
Action
 |
Observation
 |
State Update
 |
LLM
 |
Action
```

从：

> Runtime 是 Tool 调度器

升级：

> Runtime 是 Agent Execution Controller


---

这里 Part H 我们先完成第一部分：

## Multi Tool Loop 为什么存在，以及 Runtime Loop 的核心模型。

下一部分我们继续深入：

**Part H-2：Tool Call Chain 与 Multi-step Execution**

会重点讲：

1. 多 Tool 调用链如何建模
2. ToolCallRecord 为什么必须存在
3. Observation 如何关联 Tool Call
4. OpenAI Agents SDK / Claude Code 如何实现连续执行
5. 为什么 Claude Code 本质上就是一个强 Multi Tool Loop Runtime

继续。

## 9. User

继续学习

## 10. Assistant

# Day05 Part H：Multi Tool Loop
## H-2：Tool Call Chain 与 Multi-step Execution

上一部分我们建立了一个核心认知：

> Agent 的核心不是 Tool Calling，而是基于 Observation 的持续行动循环。

也就是：

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
Update State
 |
 v
Think Again
```

这一节继续深入：

> 当 Agent 连续调用多个 Tool 时，Runtime 如何管理这些调用之间的关系？

---

# 1. 什么是 Tool Call Chain？

先看一个简单任务：

用户：

> 帮我查一下订单，如果已发货，告诉我预计到达时间。

看起来像一个问题。

但是 Runtime 拆开：

## 第一步：

查询订单：

```json
{
  "tool": "get_order",
  "args": {
    "orderId":"123"
  }
}
```

得到：

```json
{
  "status":"SHIPPED"
}
```


---

## 第二步：

因为状态是 SHIPPED。

Agent 判断：

需要查询物流。

调用：

```json
{
  "tool":"get_delivery_info",
  "args":{
    "orderId":"123"
  }
}
```

得到：

```json
{
 "deliveryDate":"2026-08-06"
}
```

---

## 第三步：

生成回答。

整个链路：

```text
User Goal

    |

    v

Tool Call 1
get_order

    |

    v

Observation 1
ORDER_SHIPPED

    |

    v

Tool Call 2
get_delivery_info

    |

    v

Observation 2
DELIVERY_DATE

    |

    v

Final Answer
```

这就是：

```
Tool Call Chain
```

---

# 2. 为什么 Runtime 需要记录 Tool Call Chain？

一个简单 Demo 可能：

```ts
await tool.execute()
```

执行完就结束。

但是 Agent Runtime 不行。

因为它需要回答：

### 问题 1：

现在执行到哪里？

例如：

```text
Step 1:
get_order 完成

Step 2:
get_delivery_info 执行中
```

---

### 问题 2：

为什么调用这个 Tool？

例如：

Debug：

```
为什么 Agent 调用了退款 Tool？
```

需要看到：

```text
User Goal:

取消订单


Observation:

订单已经支付


LLM Decision:

需要退款


Tool Call:

refund_order
```

---

### 问题 3：

失败后如何恢复？

例如：

```text
Step 1:

search_product


Observation:

没有结果


Step 2:

retry_search


Observation:

成功
```

如果没有 Chain：

Runtime 不知道：

- 重试了几次
- 为什么重试
- 是否应该继续

---

所以工业 Runtime 会维护：

```ts
ToolCallRecord
```

---

# 3. ToolCallRecord 数据结构

一个简单设计：

```ts
interface ToolCallRecord {

  id:string;

  toolName:string;


  arguments:unknown;


  status:
    |"pending"
    |"running"
    |"success"
    |"failed";


  startedAt:number;


  completedAt?:number;


  observationId?:string;

}
```

例如：

```json
{
"id":"call_001",

"toolName":"get_order",

"arguments":{
 "orderId":"123"
},

"status":"success",

"observationId":"obs_001"
}
```

注意这里：

ToolCall 和 Observation 是两个对象。

---

# 4. Tool Call 和 Observation 的关系

这是 Part G 的延续。


很多初学者会设计：

```text
Tool Call

↓

Tool Result
```

结束。


但是 Agent Runtime：

应该是：

```text
ToolCall

    |

    v

Execution

    |

    v

Observation

```

关系：

```text
ToolCall
=
我要做什么


Observation
=
世界发生了什么
```

---

例如：

ToolCall:

```json
{
"name":"send_email"
}
```


Observation:

```json
{
"type":"tool_result",

"status":"success",

"summary":
"邮件发送成功"
}
```

---

它们表达的是不同阶段：

|对象|含义|
|-|-|
|ToolCall|Action Intent|
|ToolResult|Execution Output|
|Observation|Runtime Feedback|

---

# 5. 为什么 Observation 需要关联 ToolCall？

看：

```json
{
"type":"tool_error",

"error":{
 "code":"TIMEOUT"
}
}
```

问题：

哪个 Tool 出错？

如果没有关联：

Runtime 不知道。

所以：

Observation：

通常保存：

```ts
toolCallId
```

例如：

```json
{
"id":"obs_001",

"type":"tool_error",

"toolCallId":"call_001"
}
```

形成：

```text
ToolCall
   |
   |
   v
Observation
```

---

这对于：

- Trace
- Debug
- Replay
- Evaluation

非常重要。

---

# 6. Multi Tool Loop 的 Runtime 状态

现在 Runtime State：

应该类似：

```ts
interface RuntimeState {


 goal:string;


 messages:Message[];


 toolCalls:ToolCallRecord[];


 observations:Observation[];


 currentStep:number;


 status:
  |"thinking"
  |"executing"
  |"waiting"
  |"completed";


}
```

运行过程中：

---

## 初始：

```json
{
"step":0,
"status":"thinking"
}
```

---

LLM 决定：

```json
{
"tool":"get_order"
}
```

State:

```json
{
"step":1,
"status":"executing"
}
```

增加：

```json
toolCalls:[
 {
  "id":"call1",
  "tool":"get_order"
 }
]
```

---

执行完成：

增加：

```json
observations:[
 {
  "id":"obs1",
  "toolCallId":"call1",
  "summary":"订单已发货"
 }
]
```

---

进入下一轮：

```json
{
"step":2,
"status":"thinking"
}
```

---

所以 Multi Tool Loop 本质：

不是：

```text
调用多个函数
```

而是：

```text
不断产生 State Transition
```

---

# 7. Agent Loop = State Machine

这里进入一个工业级认知。

Agent Runtime 本质越来越像：

## State Machine（状态机）


状态：

```text
IDLE

 |

THINKING

 |

EXECUTING_TOOL

 |

OBSERVING

 |

THINKING

 |

COMPLETED
```

例如：

```text
             +---------+
             |  IDLE   |
             +----+----+
                  |
                  v
             +---------+
             | THINKING|
             +----+----+
                  |
          Tool Call?
          /       \
        Yes        No
        |           |
        v           v

 +-------------+  COMPLETED
 | EXECUTING   |
 +------+------+
        |
        v

 +-------------+
 | OBSERVING   |
 +------+------+
        |
        v

   THINKING

```

---

这也是为什么前面 Part G 学 Reducer 很重要。

因为：

Observation:

不是简单数组 append。

它是：

```text
Event

↓

State Transition

↓

New State
```

---

# 8. OpenAI Agents SDK / Claude Code 映射

## OpenAI Agents SDK

抽象来看：

```text
Model decides tool

        |

Tool execution

        |

Tool result

        |

Next model turn
```

内部就是：

```text
Loop
```

开发者看到：

```text
agent.run()
```

但 Runtime 内部：

```text
while not finished:

    model()

    if tool_call:

        execute()

        append result

```

---

## Claude Code

更明显。

例如：

用户：

> 修改这个 bug


Claude Code：

第一步：

```
Read file
```

Observation:

```
发现问题代码
```


第二步：

```
Edit file
```

Observation:

```
文件修改完成
```


第三步：

```
Run test
```

Observation:

```
测试失败
```


第四步：

```
Fix
```


这里：

每一步：

都是：

```text
Tool Call

↓

Observation

↓

Next Decision
```

---

# 9. Multi Tool Loop 和 React Agent 的关系

工业术语映射：

我们之前说：

Runtime Loop ≈ ReAct。

这里更具体：

ReAct：

```
Reason

Act

Observation
```


Multi Tool Loop：

就是：

```text
Reason
 |
Act(tool1)
 |
Observation1
 |
Reason
 |
Act(tool2)
 |
Observation2
 |
Reason
```

所以：

> Multi Tool Loop 是 ReAct 在 Runtime 中的执行实现。


---

# 10. 本节核心认知升级

## 升级 1

从：

> Tool Result 是返回值

到：

> Observation 是 Tool Call 后形成的 Runtime Feedback。


---

## 升级 2

从：

> Agent 调用多个 Tool

到：

> Agent 通过 ToolCall Chain 管理连续 Action。


---

## 升级 3

从：

> Agent 是循环代码

到：

> Agent 是 Event-driven State Machine。


---

## 升级 4

从：

> Runtime 记录结果

到：

> Runtime 记录完整执行轨迹。


---

# 当前 Part H 进度

已经完成：

✅ H-1 为什么 Agent Loop 不等于一次 Tool Call  
✅ H-2 Tool Call Chain 与 Multi-step Execution  


下一部分：

# Part H-3：Stop Condition 与 Loop Control

重点：

1. Agent 什么时候知道任务完成？
2. 为什么不能依赖 LLM 自己停止？
3. maxSteps 如何设计？
4. Timeout / Token Budget / Cost Control
5. 无限循环如何防止？
6. 工业 Agent Runtime 的 Loop Governance

这一部分会非常接近真正的 Agent Runtime 工程实现。

## 11. User

继续学习

## 12. Assistant

# Day05 Part H：Multi Tool Loop
## H-3：Stop Condition 与 Loop Control（循环控制与停止条件）

我们继续 Part H。

前面 H-1、H-2 已经建立了两个核心认知：

---

## H-1：

Agent 不是：

```text
LLM
 |
Tool
 |
Result
```

而是：

```text
Reason
 |
Action
 |
Observation
 |
Reason Again
 |
Action Again
...
```

也就是：

> Agent 的能力来自持续反馈循环。

---

## H-2：

多个 Tool 调用不是简单函数串联，而是：

```text
ToolCall
    |
    v
Execution
    |
    v
Observation
    |
    v
Runtime State Update
    |
    v
Next Decision
```

因此：

> Agent Runtime 本质是一个由 Event 驱动的状态机。

---

但是这里马上出现一个工业问题：

如果 Agent 一直循环怎么办？

例如：

```text
LLM:

调用 search_tool


Tool:

没有结果


LLM:

继续 search_tool


Tool:

没有结果


LLM:

继续 search_tool


...
```

或者：

```text
LLM:

修改代码


Test:

失败


LLM:

修改代码


Test:

失败


LLM:

修改代码


...
```

所以：

# Agent Runtime 必须拥有 Loop Control

---

# 1. 为什么不能让 LLM 自己决定停止？

这是一个非常重要的问题。

很多 Demo：

```ts
while(true){

 const response =
    await llm();


 if(response.final){
    break;
 }


 executeTool();

}
```

看起来简单。

但是工业环境不能只依赖：

```text
LLM:
"我觉得完成了"
```

原因：

---

## 1. LLM 没有绝对状态判断能力

例如：

用户：

> 修复这个 bug


LLM：

```
代码修改完成
```

但是：

实际：

```text
test still failed
```

如果没有 Observation：

LLM 不知道。

---

## 2. LLM 可能陷入重复行为

例如：

```text
Action:

search("xxx")


Observation:

empty


Action:

search("xxx")


Observation:

empty
```

模型可能认为：

"再试一次"

---

## 3. 成本不可控

每一次：

- LLM 调用
- Tool 调用

都会消耗：

- Token
- 时间
- API 成本

---

所以：

> 停止条件必须由 Runtime 控制，而不是由 LLM 单独控制。

---

# 2. Agent Loop 的两个决策主体

现在我们可以把控制拆开：

```text
                 Runtime Policy

                       |
                       |
                       v

                  Loop Constraint


                       |
                       v


LLM Decision  ---------> Next Action

```

也就是：

两个层：

---

## LLM 负责：

"下一步应该做什么？"


例如：

```text
继续查询订单

或者

回复用户

或者

调用退款 Tool
```

---

## Runtime 负责：

"是否允许继续？"


例如：

```text
是否超过最大步骤？

是否超时？

是否超过预算？

是否违反策略？
```

---

这和 Part F 的 Permission 设计是一致的：

LLM 提议。

Runtime 治理。

---

# 3. 常见 Stop Condition

工业 Runtime 通常有多个停止条件。

---

# 3.1 Final Answer Stop

最自然的停止。

LLM 输出：

```json
{
"type":"final",
"content":
"订单已经发货"
}
```

Runtime：

```text
任务完成
```

停止。


流程：

```text
LLM

 |
 v

Final Response

 |
 v

Completed

```

---

# 3.2 Max Step Limit

最常见保护。

例如：

```ts
maxSteps = 20
```

Runtime:

```ts
if(state.step >= maxSteps){

 return {
   status:"failed",
   reason:"max steps exceeded"
 }

}
```

---

为什么需要？

因为 Agent Loop：

理论上：

```text
无限
```

但是生产系统：

必须：

```text
有限
```

---

例如：

Coding Agent：

```text
Step 1 read file

Step 2 edit

Step 3 test

Step 4 fix

Step 5 test

...

```

合理：

20-50 steps。


但是：

1000 steps：

明显异常。

---

# 3.3 Timeout Stop

例如：

用户：

"帮我整理服务器日志"


执行：

```text
10分钟
```

还没有结束。

Runtime：

```text
timeout
```

停止。


模型：

可能不知道时间。

Runtime：

知道。

---

设计：

```ts
interface RuntimeConfig {

 timeoutMs:number;

}
```

例如：

```json
{
"timeoutMs":300000
}
```

5分钟。

---

# 3.4 Token Budget Stop

Agent 每一步：

可能：

- 调 LLM
- 调 Tool
- 产生 Context


所以需要：

```text
Token Budget
```

例如：

```text
Maximum:

100k tokens
```

Runtime：

记录：

```ts
state.usage = {

 inputTokens:50000,

 outputTokens:20000

}
```

超过：

停止。


---

# 3.5 Cost Budget

工业 Agent 更关注：

成本。

例如：

一个 Coding Agent：

调用：

- GPT
- Claude
- Embedding
- Search API

都会产生费用。


所以：

```ts
budget = {

 maxCost:5$

}
```

超过：

停止。

---

# 3.6 Tool Failure Stop

错误不能无限 retry。


例如：

```text
API failed

retry

API failed

retry

API failed

```

Runtime：

需要：

```text
failure policy
```

例如：

```ts
maxRetry=3
```

超过：

```text
stop
```

---

# 4. Retry 和 Loop 的区别

这里容易混淆。


## Retry

同一个 Action 重试：

```text
Tool A

失败

Tool A

失败

Tool A

成功
```

属于：

```text
Recovery
```

---

## Loop

新的 Agent 决策：

```text
Tool A

Observation

LLM

Tool B

Observation

LLM

Tool C

```

属于：

```text
Reasoning Loop
```

---

区别：

Retry：

```text
Runtime Policy
```

控制。


Loop：

```text
LLM + Runtime
```

共同控制。

---

# 5. Loop Guard（循环保护）

工业 Runtime 通常会有：

## Loop Guard

专门防止异常循环。


例如：

```ts
interface LoopGuard {


 check(state:RuntimeState):GuardResult;


}
```

---

检查：

## Step:

```text
是否超过最大步数
```

---

## Duplicate Action:

例如：

连续：

```text
search("abc")
search("abc")
search("abc")
```

检测。


---

## Same Observation:

例如：

连续收到：

```text
Not Found
```

说明：

没有进展。


---

## Progress Detection

这是比较高级的。


Runtime 判断：

> Agent 有没有向目标靠近？

例如：

State:

第一次：

```text
找不到文件
```

第二次：

```text
还是找不到文件
```

没有进展。

可以停止。

---

# 6. Multi Tool Loop 完整模型

现在完整 Runtime：

```text
                 User Goal

                     |

                     v


              Context Builder


                     |

                     v


                   LLM


                     |

             +-------+-------+

             |               |

          Final          ToolCall


             |               |

             v               v


        Completed       Tool Executor


                              |

                              v


                         Observation


                              |

                              v


                         Runtime State


                              |

                              v


                         Loop Guard


                              |

                 +------------+------------+

                 |                         |

              Continue                  Stop


                 |

                 v


              Next LLM Turn

```

---

这里：

Loop Guard 是隐藏但非常重要的一层。

---

# 7. OpenAI Agents SDK / Claude Code 映射

## OpenAI Agents SDK

用户看到：

```ts
await agent.run()
```

但是内部需要：

```text
loop:

1. model turn

2. tool calls

3. tool execution

4. append outputs

5. next turn

6. stop condition

```

停止：

- final output
- max turns
- errors

---

## Claude Code

更明显。

例如：

任务：

> 修复测试失败


内部：

```text
Step 1

Read file


Observation

找到 bug


Step 2

Edit file


Observation

修改完成


Step 3

Run test


Observation

失败


Step 4

Fix


Step 5

Run test


Observation

Success

```

什么时候停？

不是：

"Claude 想停"

而是：

满足：

```text
Goal achieved

+
No more required actions

+
Runtime allows finish

```

---

# 8. 和 Workflow Engine 的关系

到这里你会发现：

Agent Runtime 越来越像：

Workflow Engine。

因为都有：

- State
- Event
- Transition
- Retry
- Timeout
- Compensation
- Suspend


区别：

Workflow:

路径提前定义。

```text
A -> B -> C
```


Agent:

路径运行时生成。

```text
A -> ? -> ? -> C
```

所以：

Agent Runtime：

= Workflow Engine + LLM Decision


---

# 9. 本节核心认知升级

## 升级 1

从：

> Agent 会自己停止

升级：

> Runtime 必须控制停止边界。

---

## 升级 2

从：

> while(true) 是 Agent Loop

升级：

> Agent Loop = Loop + Policy + Guard。


---

## 升级 3

从：

> 最大步数只是防 bug

升级：

> Loop Control 是 Agent 安全、成本、可靠性的核心治理层。


---

## 升级 4

从：

> LLM 控制 Agent

升级：

> LLM 决策，Runtime 管理。


---

# Part H 当前进度

已经完成：

✅ H-1 为什么 Agent Loop 不等于一次 Tool Call  
✅ H-2 Tool Call Chain 与 Multi-step Execution  
✅ H-3 Stop Condition 与 Loop Control  


下一节：

# Day05 Part H-4：Multi Tool Loop 工业实现

重点：

1. Agent Executor Loop 如何设计
2. Event Loop vs Agent Loop
3. Step Runner
4. Tool Call Queue
5. Parallel Tool Calls（并行 Tool）
6. Sequential vs Parallel Execution
7. OpenAI Agents SDK / Claude Code 的真实执行模型

这一节会开始接近真正 Runtime 源码结构。

## 13. User

继续

## 14. Assistant

# Day05 Part H：Multi Tool Loop
## H-4：Multi Tool Loop 工业实现（Agent Executor Loop）

继续 Part H。

前面三部分，我们已经从概念上建立了：

- H-1：Agent 不是一次 Tool Call，而是循环执行
- H-2：Multi Tool 需要 Tool Call Chain 管理执行轨迹
- H-3：Runtime 必须通过 Stop Condition 和 Loop Control 管理边界

这一节进入更接近工业 Runtime 的设计：

> 一个生产级 Agent Runtime，内部到底如何组织这个循环？

---

# 1. 从 while(true) 到 Agent Executor Loop

前面我们写过：

```ts
while(true){

  const decision = await llm();

  if(final){
    break;
  }

  executeTool();

}
```

这个可以理解为：

## Demo Agent Loop

但是工业 Runtime 不会这么写。

因为真实情况：

一次循环里面包含很多阶段：

```text
Think

↓

Decision

↓

Validation

↓

Permission

↓

Execution

↓

Observation

↓

State Update

↓

Loop Guard

↓

Next Step

```

所以工业实现通常抽象为：

```text
Agent Executor Loop
```

---

# 2. Agent Executor Loop 的职责

它不是执行 Tool。

Tool Executor 已经负责执行 Tool。

Agent Executor Loop 负责：

> 控制 Agent 一轮又一轮运行。

职责：

1. 调用 LLM
2. 判断输出类型
3. 调度 Tool
4. 接收 Observation
5. 更新 State
6. 判断是否继续
7. 控制生命周期

---

架构：

```text
                 Agent Executor Loop


                        |
                        |

        +---------------+---------------+

        |                               |

      LLM Runner                 Tool Runner


        |                               |

        v                               v


   Tool Decision                Tool Execution


        |                               |

        +---------------+---------------+

                        |

                        v


                 Runtime State


                        |

                        v


                 Loop Controller

```

---

# 3. Agent Executor 和 Tool Executor 的区别

这个地方非常容易混。


## Tool Executor

负责：

> 一个具体 Tool 怎么执行


例如：

```ts
executeTool(
  "get_weather",
  args
)
```


内部：

```text
validate

permission

call api

timeout

retry

return result

```


---

## Agent Executor Loop

负责：

> Agent 是否继续运行


例如：

```text
Step 1:

调用天气 Tool


Step 2:

根据天气决定是否推荐活动


Step 3:

生成回答

```

---

关系：

```text
Agent Executor Loop

        |
        |
        v

Tool Executor

        |
        |
        v

External System

```

---

# 4. Step Runner（步骤执行器）

工业 Runtime 常见设计：

每一次循环称为：

```text
Step
```

例如：

```
Step 1:

LLM Decision

Step 2:

Tool Execution

Step 3:

Observation Update

Step 4:

Next Decision

```

所以会抽象：

```ts
interface StepRunner {

  run(
    state: RuntimeState
  ): Promise<StepResult>;

}
```

---

例如：

```ts
async function runStep(
 state
){

 const response =
   await llm.generate(
      buildContext(state)
   );


 if(response.toolCall){

    return executeToolStep(
       response.toolCall
    );

 }


 return {
    type:"final",
    answer:response.content
 };

}
```

---

# 5. Agent Loop 完整伪代码

工业化一点：

```ts
async function runAgent(
 initialState
){

 let state = initialState;


 while(true){


   // 1. Loop Guard

   guard.check(state);



   // 2. Build Context

   const context =
      contextBuilder.build(state);



   // 3. LLM Decision

   const decision =
      await llm.run(context);



   // 4. Final

   if(decision.type==="final"){

      return decision.content;

   }



   // 5. Tool Call

   if(decision.type==="tool_call"){


      const result =
          await toolExecutor.execute(
             decision.toolCall
          );


      const observation =
          resultProcessor.process(
             result
          );


      state =
          reducer(
             state,
             observation
          );

   }

 }

}
```

注意：

这里真正的核心不是：

```ts
while
```

而是：

```text
State Transition
```

---

# 6. Event Loop vs Agent Loop

这是一个很容易混淆的概念。


## Event Loop

例如 Node.js：

```text
callback

↓

event queue

↓

execute

↓

next event

```

它解决：

> 程序如何调度异步任务。


---

## Agent Loop

解决：

> Agent 如何根据反馈持续行动。


它是：

```text
Goal

↓

Decision

↓

Action

↓

Observation

↓

Decision

```

---

两者关系：

Agent Runtime 通常运行在 Event Loop 之上。

例如：

Node：

```text
Node Event Loop

        |

        v

Agent Loop

        |

        v

Tool Execution

```

---

所以：

不要认为：

Agent Loop = Node Event Loop。

它们解决的问题不同。

---

# 7. Tool Call Queue（工具调用队列）

现在考虑一个问题：

LLM 一次可能返回多个 Tool Call。


例如：

用户：

> 查询天气和汇率


LLM：

```json
[
 {
  "name":"get_weather"
 },
 {
  "name":"get_exchange_rate"
 }
]
```

怎么办？

---

简单实现：

串行：

```text
Tool A

↓

Tool B

↓

Observation

```

---

工业 Runtime：

会引入：

```text
Tool Call Queue
```

例如：

```ts
interface ToolCallQueue {

 enqueue(call:ToolCall)

 dequeue():ToolCall

}

```

流程：

```text
LLM

 |

 v

Tool Calls


[
 Tool A,
 Tool B,
 Tool C
]


 |

 v


Tool Queue


 |

 v


Executor

```

---

# 8. Sequential Tool Execution

最简单：

一个一个执行。


例如：

```text
Tool A

完成

↓

Tool B

完成

↓

Tool C

完成

```

优点：

简单。

状态容易管理。


缺点：

慢。


---

例如：

三个查询：

```
weather API
+
stock API
+
news API
```

互相没有依赖。


串行：

```
2s
+
2s
+
2s

=6s
```

---

# 9. Parallel Tool Execution（并行 Tool）

如果 Tool 之间没有依赖：

可以：

```text
       Tool A
          |
LLM ---- Tool B
          |
       Tool C

```

同时执行。


例如：

```ts
await Promise.all([
 getWeather(),
 getStock(),
 getNews()
])
```

时间：

```
max(2,2,2)

=2s
```

---

但是注意：

并行不是默认开启。

因为有问题。

---

# 10. Parallel Tool 的风险

## 风险 1：依赖关系


例如：

错误：

```text
create_order()

get_order_status()
```

不能并行。


因为：

第二个依赖第一个结果。


---

## 风险 2：副作用


例如：

```text
send_email()

refund_money()

```

两个动作同时执行。

风险巨大。


---

## 风险 3：状态竞争


两个 Tool 同时修改：

```text
Runtime State
```

需要：

- reducer
- transaction
- event ordering


---

所以工业 Runtime 需要判断：

```text
Can Parallel Execute?
```

---

# 11. Tool Dependency Graph

更高级设计：

不是简单 Queue。

而是：

```text
Tool Dependency Graph
```

例如：

```text
        search_product

              |

              v

        get_product_detail

              |

              v

        create_order

```

表示：

依赖关系。

---

而：

```text
weather

news

stock

```

没有边。

可以并行。


---

# 12. Claude Code 中的 Multi Tool Loop

Claude Code 是非常好的例子。

用户：

> 分析这个项目，然后修复测试失败。


可能：

Step 1：

Tool:

```text
list_files
```

Observation:

```text
项目结构
```


Step 2：

Tool:

```text
read_file
```

Observation:

```text
发现问题代码
```


Step 3：

Tool:

```text
edit_file
```

Observation:

```text
修改完成
```


Step 4：

Tool:

```text
run_test
```

Observation:

```text
失败
```


Step 5：

继续修复


这里 Runtime 管理：

- 当前 Step
- Tool Chain
- Observation
- 是否继续
- 是否停止


---

# 13. OpenAI Agents SDK 映射

抽象来看：

```text
Agent.run()

       |

       v

Runner Loop


       |

       +------ Model Call

       |

       +------ Tool Execution

       |

       +------ Result Append

       |

       +------ Next Turn

```

所以：

用户看到：

```ts
await agent.run()
```

内部实际上：

```text
Agent Executor Loop
```

---

# 14. Multi Tool Loop 工业架构

最终：

```text
                         Agent Runtime


                              |

                              v


                     Agent Executor Loop


                              |

          +-------------------+-------------------+

          |                                       |

          v                                       v


   Context Builder                         Loop Controller


          |                                       |

          v                                       v


        LLM                                Stop / Budget / Guard



          |

          v


    Tool Call Queue


          |

          v


    Tool Executor


          |

          v


    Observation


          |

          v


    Runtime State


          |

          +----------------------------+

```

---

# 15. 本节核心认知升级

## 升级 1

从：

> Agent Loop 是 while 循环

升级：

> Agent Loop 是 Runtime 控制的 State Transition Pipeline。


---

## 升级 2

从：

> Tool Executor 执行工具

升级：

> Agent Executor 决定什么时候执行、执行多少次。


---

## 升级 3

从：

> 多 Tool = 多次函数调用

升级：

> Multi Tool = Tool Call Chain + Observation Feedback + State Evolution。


---

## 升级 4

从：

> 并行 Tool 是性能优化

升级：

> 并行 Tool 是 Runtime 调度问题，需要考虑依赖、安全和状态一致性。


---

# Part H 当前进度

已完成：

✅ H-1 Agent Loop 为什么不是一次 Tool Call  
✅ H-2 Tool Call Chain 与 Multi-step Execution  
✅ H-3 Stop Condition 与 Loop Control  
✅ H-4 Multi Tool Loop 工业实现  


下一节：

# Day05 Part H-5：Multi Tool Loop 总结与工业映射

重点：

1. Agent Loop 与 ReAct 的最终映射
2. OpenAI Agents SDK / Claude Code / LangGraph 的 Loop 对比
3. Multi Tool Loop 在面试中的回答方式
4. Day05 Part H 知识地图
5. Part H 固定总结环节

完成 Part H 后，我们进入：

# Day05 Part I：Mini Tool Runtime Implementation

也就是：

把 Day05 A-H 所有设计真正写成一个 mini-agent-runtime。

## 15. User

继续学习

## 16. Assistant

# Day05 Part H：Multi Tool Loop
## H-5：Multi Tool Loop 总结与工业映射

继续 Part H。

这一部分我们已经把 Multi Tool Loop 从：

> “Agent 可以连续调用多个 Tool”

深入到了：

> “Agent Runtime 如何管理一个持续运行的决策执行系统”

在进入 Part I 实现之前，我们先把 Part H 收束，把它和工业 Agent Runtime 对齐。

---

# 1. Part H 回顾：我们到底解决了什么问题？

Day05 前半部分解决：

## 如何执行一个 Tool？

```text
LLM
 |
 v
Tool Call Intent
 |
 v
Tool Executor
 |
 v
Tool Result
```

但是一个真实 Agent：

不会只执行一次。

例如：

用户：

> 帮我分析这个项目并修复测试失败。

可能：

```text
Read File

↓

Observation

↓

Analyze

↓

Edit File

↓

Observation

↓

Run Test

↓

Observation

↓

Fix

↓

Run Test

↓

Final Answer
```

所以：

Part H 解决：

> Runtime 如何让 Agent 持续行动。

---

# 2. Multi Tool Loop 的最终模型

现在完整 Agent Loop：

```text
                    Goal

                     |
                     v

              Context Builder

                     |
                     v

                  LLM

                     |
          +----------+----------+
          |                     |
          v                     v

     Final Answer          Tool Call

                                  |
                                  v

                           Tool Executor

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

                            Loop Control

                                  |
                                  |
                       +----------+---------+
                       |                    |
                       v                    v

                    Continue             Stop

                       |
                       v

                    Next LLM Turn

```

这个循环就是：

## Agent Execution Loop

工业术语：

- Agent Loop
- ReAct Loop
- Execution Loop
- Control Loop

---

# 3. Multi Tool Loop 和 ReAct 的关系

之前 Day04.5 我们做过工业术语映射。

这里再次强化。

ReAct：

```text
Reason

↓

Act

↓

Observation

↓

Reason

↓

Act

```

对应 Runtime：

|ReAct|Runtime|
|-|-|
|Reason|LLM Decision|
|Act|Tool Call + Executor|
|Observation|Runtime Observation|
|Memory|State / Memory System|

所以：

> ReAct 是 Agent 思考模式，Multi Tool Loop 是 Runtime 对 ReAct 的工程实现。

---

# 4. Agent Loop 为什么不是 Workflow？

这个问题非常重要。

因为很多企业 Agent 最终会落到 Workflow。

两者容易混。

---

## Workflow

提前定义路径：

```text
Step A

↓

Step B

↓

Step C

```

例如：

审批流程：

```text
提交申请

↓

主管审批

↓

财务审批

↓

执行付款

```

路径固定。


---

## Agent Loop

路径动态生成：

```text
Goal

↓

Action ?

↓

Observation

↓

Next Action ?

```

Runtime 不知道：

下一步一定是什么。


例如 Coding Agent：

第一次：

```text
Read File
```

可能发现：

需要：

```text
Search Dependency
```

也可能：

```text
Run Test
```

---

所以：

Workflow：

> Developer defines execution path


Agent：

> Runtime + LLM decide execution path

---

工业系统通常：

不是二选一：

而是：

```text
Workflow Constraint

        +

LLM Decision

        +

Agent Loop

```

例如：

企业客服 Agent：

Workflow 限制：

```text
退款必须审批
```

Agent 决定：

```text
是否先查询订单
是否解释政策
是否推荐方案
```

---

# 5. Multi Tool Loop 和 State Machine

Part G 我们引入：

```text
Observation

↓

State Transition
```

Part H 完成：

```text
State Transition

↓

Loop
```

所以 Agent Runtime 越来越像：

## State Machine

状态：

```text
IDLE

↓

THINKING

↓

EXECUTING

↓

OBSERVING

↓

THINKING

↓

COMPLETED

```

事件：

```text
ToolCalled

ToolCompleted

ToolFailed

ApprovalResolved

```

转换：

```text
Event

↓

Reducer

↓

New State

```

---

这也是为什么：

Agent Runtime 不是简单：

```js
callLLM()
```

而更像：

```text
Event-driven Workflow Runtime
```

---

# 6. Multi Tool Loop 的三个核心组件

工业实现中，可以抽象三个核心：

---

## 1. Agent Executor Loop

负责：

控制循环。

例如：

```ts
while(running){

  runStep();

}
```

职责：

- 调 LLM
- 判断输出
- 推进状态
- 控制生命周期


---

## 2. Tool Execution Layer

负责：

执行动作。


包含：

Part E：

- Registry
- Executor

Part F：

- Permission
- Approval

---

## 3. Loop Controller

负责：

什么时候停止。


包含：

- max steps
- timeout
- token budget
- cost budget
- retry policy
- duplicate detection

---

最终：

```text
Agent Executor Loop

        |
        |
        +---- LLM

        |
        +---- Tool Layer

        |
        +---- Loop Controller

```

---

# 7. Parallel Tool Calls（并行工具调用）最终理解

Part H 中一个重要扩展：

LLM 可能一次产生多个 Tool Call。


例如：

用户：

> 查询北京天气和上海天气。


LLM：

```json
[
 {
  "tool":"weather",
  "city":"北京"
 },
 {
  "tool":"weather",
  "city":"上海"
 }
]
```

两个 Tool：

没有依赖。

可以：

```text
weather(北京)

weather(上海)

同时执行

```

---

但是：

如果：

```text
create_order()

↓

query_order()
```

存在依赖。

不能并行。


所以：

工业 Runtime 需要：

不是简单：

```text
Promise.all()
```

而是：

判断：

```text
Dependency Graph

+
Side Effect

+
State Conflict

```

---

# 8. OpenAI Agents SDK 映射

从 Runtime 视角：

```text
Agent.run()

        |

        v

Runner Loop


        |

        +---- Model Turn

        |

        +---- Tool Execution

        |

        +---- Append Result

        |

        +---- Next Turn


        |

        +---- Stop Condition

```

开发者看到：

```ts
await agent.run()
```

实际上内部：

持续：

```text
LLM

↓

Tool

↓

Observation

↓

LLM

↓

Tool

```

---

# 9. Claude Code 映射

Claude Code 是 Multi Tool Loop 最明显的案例。


用户：

> 修改这个 bug


内部：

```text
Goal:

Fix Bug


Step 1:

Read File


Observation:

发现错误


Step 2:

Edit File


Observation:

代码修改


Step 3:

Run Test


Observation:

测试失败


Step 4:

Fix


Observation:

测试成功


Step 5:

Final Answer

```

这里：

核心能力不是：

“会编辑文件”

而是：

> 能根据每次执行反馈调整下一步行动。

---

# 10. LangGraph 映射

LangGraph 更显式。

模型：

```text
Node

↓

State Update

↓

Next Node
```

类似：

```text
Tool Node

↓

Observation

↓

State

↓

Next Decision Node

```

区别：

LangGraph 更偏：

显式 Workflow Graph。

Agent Loop：

更偏：

动态决策。


---

# 11. 面试视角

## Q1：为什么 Agent 需要 Multi Tool Loop？

回答：

> 单次 Tool Calling 只能完成一次动作，而真实任务通常需要根据执行结果动态决定下一步。因此 Agent Runtime 需要维护 Think-Act-Observe 循环，把 Tool Result 转换成 Observation，更新 Runtime State，再进入下一轮决策。


---

## Q2：Agent Loop 和 Workflow 有什么区别？

回答：

> Workflow 的执行路径通常由开发者提前定义，而 Agent Loop 的下一步行动由 LLM 根据当前 State 和 Observation 动态决定。工业系统通常结合两者，用 Workflow 约束边界，用 Agent Loop 提供灵活决策。


---

## Q3：为什么不能让 LLM 无限循环？

回答：

> LLM 本身不具备可靠的资源控制能力，因此 Runtime 需要通过 max steps、timeout、token budget、cost budget 和 retry policy 控制执行边界。


---

## Q4：Tool Executor 和 Agent Executor 区别？

回答：

> Tool Executor 负责一个具体 Tool 的生命周期管理，而 Agent Executor 负责整个 Agent Loop，包括 LLM 调用、状态推进、循环控制和停止判断。


---

# 12. Part H 知识地图

```text
                 Agent Goal

                     |
                     v

              Agent Executor Loop

                     |
                     v

              LLM Decision

                     |
                     v

             Tool Call Chain

                     |
                     v

              Tool Executor

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

              Loop Controller

                     |
             +-------+-------+

             |               |

        Continue          Complete

             |

             v

        Next Iteration

```

---

# Part H 完成总结

Day05 Part H 已完成：

✅ Agent Loop 为什么不是一次 Tool Call  
✅ Tool Call Chain  
✅ Multi-step Execution  
✅ Stop Condition  
✅ Loop Control  
✅ Agent Executor Loop  
✅ Tool Call Queue  
✅ Sequential / Parallel Tool Execution  
✅ 工业 Runtime 映射  


下一节进入：

# Day05 Part I：Mini Tool Runtime Implementation

这是 Day05 的实践收尾。

我们会把 A-H 所有设计组合起来：

```text
Tool Schema

+

Tool Registry

+

Tool Executor

+

Permission

+

Observation

+

Runtime State

+

Multi Tool Loop

```

实现一个真正的：

```text
mini-agent-runtime
```

下一节会开始写代码结构：

- Runtime 类设计
- Agent Loop 实现
- Tool Registry
- Tool Executor
- Observation Pipeline
- 一个完整 Agent Demo

Part I 会把前面理论全部落地。

## 17. User

part H 这是学习完了吗 还有要补充的吗

## 18. Assistant

Part H 到这里**核心内容已经学习完成**。

我先对照 Day05 的整体目标确认一下：

Part H 的定位是：

> **Multi Tool Loop：让 Agent 从“一次 Tool 调用”升级为“持续执行任务的 Runtime Loop”**

我们已经覆盖了 README 中这一部分的核心目标：

- ✅ 为什么 Agent Loop 不等于一次 Tool Call
- ✅ 多 Tool 调用的数据流
- ✅ Tool Call Chain
- ✅ Intermediate Observation
- ✅ Stop Condition
- ✅ 防止无限循环
- ✅ 最大步骤限制
- ✅ Loop Control
- ✅ Agent Executor Loop
- ✅ Sequential / Parallel Tool Execution
- ✅ 工业 Runtime 映射

所以从学习路线来说，可以进入 Part I。

---

不过 Part H 我建议补充几个**工业级隐藏知识点**。

这些不是必须内容，但是对于你后面实现 mini-agent-runtime，以及理解 Claude Code / OpenAI Agents SDK 会非常有价值。

---

# 补充 1：Agent Loop 实际不是一个 Loop，而是一个 Runtime Protocol

我们前面大量使用：

```ts
while(true){

    llm()

    tool()

    observation()

}
```

帮助理解。

但是工业实现里，它更接近：

```
Agent Protocol
```

即：

每一步都有明确事件：

```text
AgentStarted

↓

ModelRequested

↓

ModelResponded

↓

ToolCallCreated

↓

ToolExecutionStarted

↓

ToolExecutionCompleted

↓

ObservationCreated

↓

StateUpdated

↓

AgentContinued

↓

AgentCompleted
```

也就是说：

Agent Runtime 更像一个：

> Event-driven execution protocol


这也是为什么工业 Agent 都需要：

- Trace
- Logging
- Replay
- Debug


因为每一次状态变化都有事件。

---

# 补充 2：Multi Tool Loop 的核心不是循环，而是“决策闭环”

这个是 Part H 最重要的认知升级。

很多人理解 Agent：

```
LLM
 ↓
Tool
 ↓
LLM
 ↓
Tool
```

但真正核心：

不是调用次数。

而是：

```
Action

↓

World Change

↓

Observation

↓

New Context

↓

New Decision
```

也就是：

```
Decision Loop
```

例如：

普通程序：

```text
if weather=="rain":
    take umbrella
```

规则提前写死。

Agent：

```text
check weather

↓

observe rain

↓

decide:
maybe umbrella
maybe cancel trip
maybe change route

```

下一步由状态决定。

---

# 补充 3：为什么 Agent Loop 一定需要 Context Builder

这个和 Day04 强关联。


很多人以为：

Multi Tool Loop：

就是：

```
messages.push(tool_result)
```

其实工业 Runtime：

不会无限 append。


例如：

100 次 Tool 调用：

```
message history:

user
assistant
tool
assistant
tool
assistant
tool
...
```

Context 会爆炸。


所以每一轮：

实际上：

```
Runtime State

      |

      v

Context Builder

      |

      v

LLM Input
```

关系：

```
State
不是
Context
```


State 是完整世界。

Context 是当前决策需要的信息。


这个是你 Day04 学到的 Runtime 核心思想，在 Part H 再次出现。

---

# 补充 4：Multi Tool Loop 里面还有一个重要概念：Replanning

工业 Agent 经常不是：

```
Plan A

↓

执行到底
```


而是：

```
Plan

↓

Execute

↓

Observe

↓

Replan

↓

Execute
```

例如：

Coding Agent：

初始计划：

```
1. 找 bug
2. 修改
3. 测试
```

但是：

测试失败：

Observation:

```
还有另一个依赖问题
```

Agent：

重新规划：

```
1. 修改依赖
2. 修改代码
3. 测试
```

这叫：

> Dynamic Replanning


也是为什么 Agent 和 Workflow 最大区别：

Workflow:

```
固定 Plan
```

Agent:

```
Plan + Replan
```

---

# 补充 5：Multi Tool Loop 的失败模式

工业面试比较喜欢问。


## 1. Infinite Loop

例如：

```
search

↓

no result

↓

search

↓

no result
```


解决：

- max steps
- duplicate detection
- progress checking


---

## 2. Wrong Tool Loop

例如：

LLM：

```
调用 A
```

结果：

```
A 不适合
```

但是继续：

```
A
A
A
```

解决：

Observation 中加入：

```
failure reason
```

让 Context Builder 提供：

```
previous failed attempts
```


---

## 3. Context Drift

执行几十步后：

LLM 忘记最初目标。


解决：

Runtime State 保存：

```
goal

constraints

important observations
```

---

# 补充 6：Multi Tool Loop 和 Claude Code 的本质关系

你之前问过 Claude Code 为什么强。

这里可以对应：

Claude Code 强的不只是：

```
会调用 bash
```

而是：

它有非常成熟的 Loop：

```
Goal

↓

Inspect

↓

Act

↓

Observe

↓

Update understanding

↓

Act again
```

尤其：

Observation：

不是简单：

```
command output
```

而是经过 Runtime 整理：

```
当前发现

影响

下一步建议
```

这就是 Agent Runtime 的价值。

---

# 补充 7：Part H 和 Part I 的边界

这里也帮你划一下。

Part H：

解决：

> Agent 怎么运行多个步骤？


重点：

```
Loop Design
```

---

Part I：

解决：

> 我怎么把这个 Loop 写出来？


重点：

```
Implementation
```

---

对应：

```
Part A-G

单个 Tool 生命周期


        ↓


Part H

多个 Tool 生命周期编排


        ↓


Part I

代码实现 Runtime

```

---

# Part H 最终知识地图

```
                Agent Goal

                    |

                    v

             Agent Executor Loop

                    |

                    v

              LLM Decision

                    |

          +---------+---------+

          |                   |

       Final              Tool Call

                              |

                              v

                      Tool Execution

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

                         Next Turn


              Loop Controller

              - max steps
              - timeout
              - budget
              - retry
              - guard

```

---

# 我的判断

按照你的学习目标（自己实现 mini-agent-runtime + 看 OpenAI Agents SDK / Claude Code Runtime）：

Part H **已经达到可以进入 Part I 的程度**。

额外补充的几个点：

- Event-driven Agent Protocol
- Replanning
- Context Builder 在 Loop 中的位置
- Failure Mode
- Dynamic Decision Loop

建议作为 Part H 的工业补充，而不是继续拆 Part H-6。

否则容易陷入 Runtime 细节泥潭，影响 Day05 主线。

---

接下来进入：

# Day05 Part I：Mini Tool Runtime Implementation

这一节会非常关键，因为前面 Day05 A-H 的设计会第一次组合成代码：

```
Tool Schema
      +
Tool Registry
      +
Tool Executor
      +
Permission
      +
Observation
      +
Runtime State
      +
Multi Tool Loop

          ↓

Mini Agent Runtime
```

这也是 Day05 从“理解 Agent Runtime”进入“自己造一个 Agent Runtime”的阶段。

## 19. User

我们结束时候的固定章节也都输出了吗

## 20. Assistant

你提醒得对，这次 **Part H 结束时我没有完整输出我们约定的固定收尾章节**。

刚才我只输出了：

- Part H 完成判断
- 补充知识点
- 下一节 Part I 引导

但是按照我们之前约定的 Agent 学习固定结构，每一个完整 Part 结束都应该补齐：

1. 📚 下一节学习计划  
2. 📝 写书 TODO  
3. 📦 写书素材  
4. 本 Part 核心认知升级  
5. 🏗️ 工业级实现（Industrial Notes）  
6. 🧭 知识地图（Knowledge Map）  
7. 🧑‍💻 面试视角  
8. ❓ 本章思考题  
9. 🔄 前置问题回收（Pending Questions）

下面补齐 **Day05 Part H：Multi Tool Loop 完整收尾**。

---

# 📚 下一节学习计划

## Day05 Part I：Mini Tool Runtime Implementation

下一阶段进入实践实现。

目标：

把 Day05 Part A-H 的所有设计组合成一个真正可运行的 Mini Agent Runtime。

实现：

```text
Tool Schema

    +

Tool Registry

    +

Tool Executor

    +

Permission Layer

    +

Tool Result

    +

Observation

    +

Runtime State

    +

Multi Tool Loop


          ↓


Mini Agent Runtime
```

主要内容：

### Part I-1 Runtime 基础骨架

实现：

- AgentRuntime
- RuntimeState
- Message Model
- Event Model


---

### Part I-2 Tool 系统实现

实现：

- Tool Interface
- Tool Registry
- Tool Executor
- Tool Context


---

### Part I-3 Agent Loop 实现

实现：

```ts
while(running){

    llm()

    toolCall()

    execute()

    observation()

    updateState()

}
```


---

### Part I-4 完整 Demo

实现：

例如：

Weather Agent：

```text
User

↓

Agent

↓

weather tool

↓

Observation

↓

Final Answer
```

---

# 📝 写书 TODO

## Chapter：Agent Runtime Loop

新增章节：

### 1. Agent Loop 为什么是 Agent Runtime 核心

核心观点：

> Tool Calling 让模型拥有行动能力，而 Loop 让模型拥有持续完成目标的能力。


---

### 2. Agent Loop ≠ while(true)

需要解释：

简单循环：

```ts
while(true){

}
```

只是控制结构。


真正 Agent Loop：

```text
Decision

↓

Action

↓

Observation

↓

State Transition

↓

Decision
```

---

### 3. Runtime Control 与 LLM Decision 分离

核心设计原则：

```
LLM:

决定下一步做什么


Runtime:

决定是否允许继续
```

---

### 4. Multi Tool Loop 是动态 Workflow

对比：

Workflow：

```
Developer defines path
```


Agent：

```
Runtime generates path
```

---

# 📦 写书素材

## 素材 1：Agent Loop 生命周期图


```text
              Goal

               |

               v

          LLM Decision

               |

        +------+------+

        |             |

     Final        Tool Call

                      |

                      v

                Tool Executor

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

                Next Turn
```

---

## 素材 2：ToolCall 与 Observation 分离


错误：

```
Tool Call = Result
```


正确：

```
ToolCall:

我要执行什么


Observation:

世界发生了什么
```

---

## 素材 3：Runtime 三层结构


```
Agent Executor Loop

        |

        |

+-------+-------+

|               |

LLM          Tool Layer

|

Loop Controller

```

---

# 本 Part 核心认知升级

## 1.

从：

> Agent 会调用 Tool

升级：

> Agent 是一个基于反馈持续行动的执行循环。


---

## 2.

从：

> 多 Tool = 多函数调用

升级：

> Multi Tool = Tool Call Chain + Observation + State Transition。


---

## 3.

从：

> LLM 控制 Agent

升级：

> LLM 负责决策，Runtime 负责治理。


---

## 4.

从：

> Agent Loop 是代码循环

升级：

> Agent Loop 是一个事件驱动状态机。


---

## 5.

从：

> Tool Result 是返回值

升级：

> Observation 是下一轮决策的输入。


---

# 🏗️ 工业级实现（Industrial Notes）

## 1. 生产级 Runtime 必须拥有 Loop Governance

包括：

### Max Steps

限制：

```
最多执行 N 步
```


---

### Timeout

限制：

```
最长运行时间
```


---

### Token Budget

限制：

```
最大上下文消耗
```


---

### Cost Budget

限制：

```
最大费用
```


---

### Retry Policy

限制：

```
失败最多重试次数
```

---

## 2. Agent Runtime 通常事件化

工业系统不会只保存最终结果。

而会记录：

```
AgentStarted

ModelCalled

ToolCalled

ToolCompleted

ObservationCreated

StateUpdated

AgentFinished
```

用于：

- Debug
- Trace
- Replay
- Evaluation


---

## 3. Parallel Tool Execution 需要依赖分析

不能简单：

```js
Promise.all()
```

需要考虑：

- 数据依赖
- 副作用
- 状态竞争


---

# 🧭 知识地图（Knowledge Map）

Day05 到 Part H：

```text
                Agent Runtime


                    |

                    v


             Execution Engine


                    |

    +---------------+---------------+

    |                               |

 Tool Lifecycle              Agent Loop


    |                               |

 Schema                       Decision


 Registry                    Action


 Executor                    Observation


 Permission                  State


 Result                     Loop Control



                    |

                    v


             Multi Tool Loop


                    |

                    v


          Dynamic Task Execution

```

---

# 🧑‍💻 面试视角

## Q1：什么是真正的 Agent Loop？

回答：

> Agent Loop 是一个持续的 Decision-Action-Observation 循环。Runtime 根据当前 State 构建 Context，让 LLM 决定下一步 Action，再通过 Tool 执行并产生 Observation，直到满足停止条件。


---

## Q2：为什么 Tool Calling 不等于 Agent？

回答：

> Tool Calling 只提供单次动作能力，而 Agent 需要根据执行结果动态调整下一步行动，因此必须具备 Loop、State Management 和 Control Policy。


---

## Q3：为什么不能把所有控制权交给 LLM？

回答：

> LLM 擅长语义决策，但不适合负责资源和安全控制。因此工业 Runtime 会控制步骤限制、权限、预算、超时等边界。


---

## Q4：Agent Loop 和 Workflow 有什么区别？

回答：

> Workflow 通常提前定义执行路径，而 Agent Loop 的路径由 LLM 根据 Observation 动态生成。工业系统通常使用 Workflow 提供约束，Agent 提供动态决策。


---

# ❓ 本章思考题

## 思考题 1

为什么：

```text
Tool Result
```

不能直接等于：

```text
Next Prompt
```

而需要：

```
Observation
```

这一层？


---

## 思考题 2

如果 Agent 连续 10 次调用同一个 Tool，都失败：

应该由谁决定停止？

A. LLM  
B. Tool  
C. Runtime  


为什么？


---

## 思考题 3

为什么：

```text
State

≠

Context
```

这两个概念为什么必须分离？


---

## 思考题 4

一个 Agent 同时需要：

- 查询天气
- 查询新闻

为什么可能并行？

但是：

- 创建订单
- 查询订单状态

为什么不能并行？


---

# 🔄 前置问题回收（Pending Questions）

## 已回收：

### 1. Tool Result 到 Observation 的关系

之前你的问题：

> Observation 是否只是数据清洗格式化层？


结论：

不是。

Observation 是：

```
External World Feedback

↓

Runtime Understanding

↓

Next Decision Input
```

它承担 Agent Loop 的反馈作用。


---

### 2. 人工审批暂停是否导致超时？

Part F 提前讨论：

暂停不是普通 HTTP 请求阻塞。

工业 Runtime：

会保存：

```
Pending State

+

Resume Token

+

Waiting Status
```

之后恢复执行。


---

### 3. Tool 与 MCP 的边界

Part D 延续：

Tool：

Runtime 内部能力。


MCP：

外部能力协议。


Part H 中体现：

无论 Tool 来源哪里：

最终都会进入：

```
Tool Call

↓

Executor

↓

Observation

↓

Loop
```

---

# Day05 Part H 最终状态

✅ Part H：Multi Tool Loop 已完成

核心掌握：

- Agent Loop
- ReAct 映射
- Tool Call Chain
- Observation Feedback
- Runtime State Transition
- Loop Control
- Executor Architecture
- Parallel Tool Execution
- 工业 Agent Runtime 映射


下一次进入：

# Day05 Part I：Mini Tool Runtime Implementation

开始真正写 Runtime。你前面 A-H 学到的所有抽象，会在 Part I 组合成代码结构。

## 21. User

我提个疑问：那如果说对于流程固化的能力，其实 multi tools 不如 workflow 稳定。muti tools 注册多个 tool，LLM 并不一定能够根据状态机命中下一步，而workflow 是一定会。但是multi tools 又能解耦各 tool

## 22. Assistant

你的这个疑问非常好，而且实际上已经触碰到了**Agent Runtime 和 Workflow Engine 的核心边界问题**。

你的理解基本正确：

> 对于流程固化能力，Multi Tool Loop 确实不如 Workflow 稳定，因为 Tool 选择依赖 LLM 推理，而 Workflow 是确定性状态转移。

但是这里需要进一步拆开，因为 **Multi Tool Loop 和 Workflow 解决的问题其实不是完全竞争关系**。

---

# 1. 你的核心判断：正确

先看两个模型。

---

## Multi Tool Loop

类似：

```text
User Goal

    |

    v

LLM Decision

    |

    +------+
    |      |
    v      v

 Tool A  Tool B

    |

Observation

    |

LLM Decision

```

这里：

下一步：

```text
Action = f(State, Context, LLM)
```

也就是说：

下一步是什么，由：

- 当前状态
- 历史 Observation
- Prompt
- Model 能力

共同决定。

所以存在：

> LLM 不一定选择正确 Tool。

---

比如：

注册：

```json
tools:[
 get_user,
 create_order,
 cancel_order,
 refund_order
]
```

用户：

> 我要取消订单


理论：

应该：

```
get_user
    |
check_order_status
    |
cancel_order
```

但是 LLM 可能：

```
cancel_order
```

直接调用。


所以：

Multi Tool Loop：

优势：

灵活。

缺点：

不确定。

---

# 2. Workflow 为什么稳定？

Workflow：

本质：

提前定义：

```text
State

  |

Transition Rule

  |

Next State
```

例如：

退款流程：

```text
START

 |
 v

CHECK_ORDER

 |
 v

CHECK_PAYMENT

 |
 v

CHECK_PERMISSION

 |
 v

REFUND

 |
 v

DONE

```

这里：

下一步不是 LLM 决定。

而是：

```ts
switch(state){

 case CHECK_ORDER:

    return CHECK_PAYMENT

}
```

所以：

稳定性非常高。

---

# 3. 那为什么还需要 Multi Tool Loop？

因为现实任务不是所有流程都能提前写死。

举个非常典型的例子：

## 企业客服

固定流程：

```text
退款申请

↓

审核

↓

退款
```

Workflow 很适合。


但是用户输入：

> 我的订单昨天显示发货，但是物流三天没更新，是不是丢了？如果丢了帮我退款，如果只是延迟告诉我什么时候到。


这里：

提前定义所有路径：

非常困难。


可能：

路径 A：

```
查订单

↓

查物流

↓

判断异常

↓

联系客服
```

路径 B：

```
查订单

↓

发现已签收

↓

解释
```

路径 C：

```
查订单

↓

发现退款条件满足

↓

退款流程
```


这个时候：

LLM Decision 有价值。

---

# 4. 所以真正工业架构不是二选一

很多人误认为：

```
Workflow

vs

Agent
```

实际上工业趋势：

是：

```
Workflow
    +
Agent
```

---

更准确：

## Workflow 管确定性

例如：

```
付款
审批
退款
开户
合规
```

这些不能让 LLM 自由发挥。


---

## Agent Loop 管不确定性

例如：

```
理解用户意图

搜索信息

分析问题

决定下一步调查方向

```

---

组合：

```
              User


               |

               v


          Agent Layer

        (Reasoning)


               |

               v


        Workflow Layer

       (Execution Control)


               |

               v


          Tools / APIs

```

---

# 5. 一个更真实的例子：Coding Agent

为什么 Claude Code 不直接 Workflow？


因为：

修改代码路径高度不确定。

例如：

用户：

> 修复登录 bug


可能：

路径 1：

```
search login

↓

发现 frontend bug

↓

edit

↓

test
```

路径 2：

```
search login

↓

发现 backend bug

↓

read API

↓

edit backend

↓

test
```


没人可以提前写 Workflow。

所以：

Agent Loop。

---

但是：

测试发布：

```
代码修改

↓

lint

↓

test

↓

build

↓

deploy
```

这个非常适合 Workflow。


---

# 6. 你提到的“Tool 解耦”是关键点

你说：

> multi tools 又能解耦各 tool


这个观察非常重要。

实际上：

Agent Runtime 的一个核心价值：

就是：

## Capability Decoupling

例如：

Tool：

```ts
getWeather()

searchDatabase()

sendEmail()

createOrder()

```

Runtime：

不关心内部实现。


它只知道：

```json
{
"name":"send_email",
"description":"发送邮件"
}
```

---

这样：

新增能力：

不用修改 Runtime。


例如：

今天：

```
Tool Registry:

weather
email
calendar

```

明天：

新增：

```
crm
erp
search
```

Agent 自动获得能力。


这就是：

Tool Ecosystem。

---

# 7. 所以 Multi Tool Loop 最大优势是什么？

不是稳定。

而是：

## Open-ended capability


它解决：

> 我不知道下一步是什么，但是我希望系统能够探索。


例如：

Research Agent：

目标：

> 调研新能源行业


你无法写：

Workflow：

```
搜索 A

↓

搜索 B

↓

总结

```

因为：

不知道：

- 搜什么
- 看哪些资料
- 哪些重要


Agent：

根据 Observation 调整。


---

# 8. 一个工业级决策表

|场景|Workflow|Agent Loop|
|-|-|-|
|订单退款|★★★★★|★★|
|支付流程|★★★★★|★|
|审批流程|★★★★★|★|
|客服理解问题|★★|★★★★★|
|代码修复|★★|★★★★★|
|资料研究|★|★★★★★|
|数据分析|★★★|★★★★|
|自动运营|★★★|★★★★|

---

# 9. 回到你的 mini-agent-runtime 学习

其实你现在 Day05 学到这里，可以重新理解为什么 Runtime 要这样设计：

不是为了替代 Workflow。

而是提供：

```
Dynamic Decision Runtime
```

你的 mini runtime：

未来更合理的架构应该是：

```
                 Agent Runtime


                       |

              Decision Layer

                       |

          +------------+------------+

          |                         |

     Tool Loop              Workflow Executor


          |                         |

       Tools                  Fixed Process


```

也就是说：

未来 Part I 实现的时候，其实可以留一个接口：

```ts
interface Planner {

 decide(state):NextAction

}
```

以后：

可以有：

```ts
LLMPlanner
```

也可以有：

```ts
WorkflowPlanner
```

甚至：

```ts
HybridPlanner
```

---

# 10. 这个问题对应面试高级回答

如果面试官问：

> 为什么不用 Workflow，为什么需要 Agent？

高级回答：

> Workflow 适合确定性流程，通过预定义状态转移保证可靠性；Agent Loop 适合开放任务，通过 LLM 根据 Observation 动态规划下一步。工业系统通常不是替代关系，而是结合 Workflow 保证关键流程安全，Agent 提供非结构化任务的决策能力。

---

所以你的理解可以总结成一句：

> **Workflow 解决“确定怎么走”，Multi Tool Loop 解决“不知道下一步怎么走”。工业 Agent Runtime 的方向不是替代 Workflow，而是在 Workflow 无法覆盖的不确定区域引入动态决策。**

这个问题其实也是 Part H 最后一个非常重要的认知补充，补完之后进入 Part I 是非常合适的。你已经从“怎么实现 Agent Loop”进一步进入了“为什么工业系统这样组合设计”的层面。

## 23. User

multi tool loop 的Open-ended capability，我理解起来其实有点像比如过去中国的各大互联网企业都想把自己的 app 做成一个超级 app，里面能够涵盖各个方面，但是无一例外最终都失败了，那么如果在 Agent 时代，其实可以把各个方面以 tool 的形式嵌进去，根据用户的 prompt 去触发对应的业务，而这些是 workflow 不具备的。而对于比如客服财务等固化流程其实 workflow 更稳定，而这些业务场景其实弄一个智能化的 Agent 并不划算，还不如一个小的 Agent+固化的 workflow+小的 LLM 更划算

## 24. Assistant

你的这个理解已经非常接近**工业 Agent 架构演进方向**了，而且你把几个之前分散的概念串起来了：

- Multi Tool Loop 的 Open-ended capability
- 超级 App 的失败
- Tool 生态
- Workflow 的确定性
- 小模型 + Workflow + Agent 的企业落地

这里我帮你进一步抽象一下。

---

# 1. 你提到“超级 App”这个类比，其实非常准确

过去互联网时代，各家公司想做：

> 一个入口覆盖所有用户需求。

例如：

```text
超级 App

 |
 +-- 电商
 |
 +-- 外卖
 |
 +-- 打车
 |
 +-- 金融
 |
 +-- 内容
 |
 +-- 社交

```

逻辑是：

用户进入一个 App。

但是问题：

## 用户不知道入口在哪里

于是产生：

- 首页越来越复杂
- 功能越来越深
- 导航越来越重


最终：

用户还是：

> 搜索、点击、找入口。


---

# 2. Agent 时代改变的是“能力入口”

传统：

```text
用户

↓

App 首页

↓

功能入口

↓

业务流程

```

Agent：

```text
用户

↓

自然语言目标

↓

Agent

↓

选择能力

↓

执行业务

```

也就是说：

以前：

> 人适应软件结构。


现在：

> 软件适应人的表达方式。

---

你的：

> “把各个方面以 tool 形式嵌进去，根据用户 prompt 去触发对应业务”

本质就是：

## Capability as Tool

能力不再以 UI 入口存在。

而以：

```json
{
"name":"book_flight",
"description":"预订机票"
}
```

存在。


---

# 3. 但是这里有一个关键区别：Tool 不是业务系统

这个非常重要。


很多人会误解：

未来：

```text
Agent
 |
 +-- 电商 Tool
 |
 +-- 支付 Tool
 |
 +-- 金融 Tool
```

然后认为：

Agent 替代所有 App。


实际上：

不是。

更准确：

```text
                 Agent


                   |

             Capability Layer


                   |

        +----------+----------+

        |                     |

    Tool Adapter       Workflow System


        |                     |

    Business API        Business Process


```

---

例如：

支付。

Agent 不应该：

```text
Agent
 |
调用支付接口
```

而应该：

```text
Agent

↓

Payment Workflow

↓

Risk Check

↓

Payment API

```

因为支付里面：

- 风控
- 合规
- 审批
- 幂等

不能交给 LLM。

---

# 4. 所以未来不是“Agent 替代 Workflow”

而是：

## Agent 负责入口智能化

Workflow 负责业务确定性。


这个关系：

非常类似：

过去：

```text
Frontend

↓

Backend API

↓

Business Service

```

现在：

```text
Agent

↓

Workflow / Service

↓

Business System

```

Agent 更像：

新的交互层。

---

# 5. 你说“小 Agent + 固化 Workflow + 小 LLM”，这个判断非常重要

其实很多企业最终形态很可能不是：

```text
一个超级 Agent

拥有所有能力

GPT-5级大模型
```

而是：

```text
              User


               |

               v


          Small Agent


               |

      Intent Classification


               |

     +---------+---------+

     |                   |

 Workflow A          Workflow B


     |                   |

 Customer           Finance


```

---

例如客服：

用户：

> 我的订单什么时候到？

Agent：

判断：

```json
intent:
check_delivery
```

进入：

```text
Delivery Workflow
```

流程：

```text
查询订单

↓

查询物流

↓

计算预计时间

↓

回复用户

```

这里：

根本不需要强 Agent。

---

# 6. 为什么企业客服不适合纯 Agent？

因为：

客服业务目标：

不是：

> 最大化智能。


而是：

> 最大化稳定性和成本效率。


例如：

退款：

企业希望：

10000 次退款：

结果一致。


不是：

第一次：

Agent A：

退款。


第二次：

Agent B：

建议换货。


第三次：

Agent C：

补偿优惠券。


企业会疯。


---

所以：

金融：

保险：

客服：

审批：

ERP：

大量场景：

都是：

```text
Workflow First
```

---

# 7. 那 Multi Tool Loop 的价值在哪里？

它解决：

## 长尾 + 非结构化问题

例如：

### 企业知识助手

用户：

> 为什么去年 Q3 华东区域销售下降？


流程不知道：

应该：

- 查销售数据？
- 查市场报告？
- 查竞品？
- 查会议记录？


Agent：

动态：

```text
查询数据库

↓

分析

↓

发现问题

↓

查询会议纪要

↓

总结

```

---

### Coding Agent

更加明显：

没有人可以提前写：

```text
修 bug workflow:

1.
打开 xxx 文件

2.
修改 xxx 行

3.
执行测试

```

因为：

每个 bug 都不同。

---

# 8. 所以未来软件结构可能变成：

以前：

```text
Application

 |
 +-- UI

 |
 +-- Business Logic

 |
 +-- Database

```

未来：

```text
AI Application


 |
 +-- Agent Layer
 |
 |     Decision
 |     Planning
 |     Tool Selection
 |
 |
 +-- Workflow Layer
 |
 |     Deterministic Process
 |
 |
 +-- Tool Layer
 |
 |     Capability Adapter
 |
 |
 +-- Existing System

```

---

# 9. 你的“超级 App”类比还有一个更深层含义

以前超级 App 失败：

因为：

> 一个产品团队无法理解所有场景。


但是 Agent 时代：

理论上：

可以：

```text
一个 Agent Runtime

+

无限 Capability Provider

```

类似：

App Store。

---

未来可能不是：

微信里面加所有功能。

而是：

你的 Agent：

动态连接：

- 银行
- 电商
- 医疗
- 企业系统


---

这其实和 MCP 的理念非常接近。

MCP 本质：

就是：

> 把外部能力标准化暴露给 Agent。


---

# 10. 但是这里有一个限制：Agent 不会自动产生业务价值

这是很多 AI 项目容易失败的地方。


企业不是缺：

“一个会调用 Tool 的 Agent”。

企业缺：

“一个稳定完成业务目标的系统”。

所以真正落地：

通常：

```text
20%

Agent Reasoning


80%

Business Workflow + Data + Integration

```

---

# 最终总结你的观点

你的理解可以升级成：

> 超级 App 时代试图通过 UI 聚合所有能力，而 Agent 时代通过自然语言聚合能力。Multi Tool Loop 提供了开放式能力编排，让 Agent 可以根据用户目标动态选择能力；但对于确定性业务流程，Workflow 仍然是更可靠的执行机制。因此未来企业 Agent 更可能是“小 Agent + Workflow + Tools + 合适规模 LLM”的组合，而不是一个万能超级 Agent。

这个认知其实已经超出了 Part H 本身，进入了 **Agent 产品架构设计层面**。

也正好解释了为什么我们前面一直强调：

> Agent Runtime 不是替代软件工程，而是把软件工程中的 Workflow、Service、Tool、State Machine 重新组合到 LLM 决策之下。

这也是你后面 Part I 实现 mini-agent-runtime 时最重要的架构思想。

## 25. User

如果Agent 只负责入口智能化的话，那其实并不需要多么牛逼的 LLM，一个小的最好是能够离线在用户手机上跑的最好了

## 26. Assistant

你的这个推论非常有意思，而且已经触碰到了未来 Agent 产品形态里面一个很重要的分歧：

> **如果 Agent 的主要职责是“入口智能化 + 能力编排”，那么是不是不需要超大模型，而应该尽可能本地化？**

答案是：

**很多企业 Agent 场景确实会趋向“小模型 + 本地/边缘运行 + Workflow/Tool 后端执行”，但不是所有 Agent 都是这样。**

我们拆开看。

---

# 1. 你的前提：Agent 只是入口智能化 —— 基本成立

如果 Agent 的职责：

不是：

> 替代整个业务系统思考。


而是：

> 理解用户意图，把需求路由到正确能力。


那么它需要的能力主要是：

## Intent Understanding

例如：

用户：

> 帮我看看我的订单什么时候到


模型需要判断：

```json
{
 "intent":"query_delivery",
 "entity":{
   "order_id":"xxx"
 }
}
```

然后：

```text
Agent

↓

Delivery Workflow

↓

订单系统
```

---

这种任务：

其实不需要 GPT-5 级别能力。


类似：

过去：

```text
用户输入

↓

NLP分类模型

↓

业务接口

```

只是现在：

自然语言复杂度更高。

---

# 2. 这类 Agent 最适合小模型

例如：

客服场景：

输入：

> 我昨天买的鞋还没收到

模型只需要理解：

```text
intent:

物流查询


entity:

鞋

时间:

昨天

```

然后：

调用：

```text
物流查询 Workflow
```

---

这里：

7B 甚至更小模型可能够用。


甚至：

未来手机端：

```text
用户语音

↓

Small LLM

↓

Intent

↓

Tool Call

```

完全可能。

---

# 3. 为什么本地模型很有价值？

你提到手机端，这个方向非常关键。

因为 Agent 有几个天然优势：

---

## 1. 隐私

比如：

手机助手：

- 短信
- 相册
- 通讯录
- 日程


如果全部上传：

风险很大。


本地：

```text
Phone

 |
Local LLM

 |
Tool

```

天然安全。

---

## 2. 延迟

云：

```text
User

↓

Network

↓

LLM Server

↓

Response
```

几十到几百 ms。


本地：

```text
User

↓

NPU

↓

LLM

```

即时。

---

## 3. 成本

如果每个用户每天调用：

100 次。

云模型成本：

巨大。


本地：

边际成本接近 0。

---

# 4. 那为什么还需要大模型？

因为有一类任务：

不是入口理解。

而是：

## Complex Reasoning

例如：

### Coding Agent

用户：

> 优化这个项目性能


这里不是：

判断 intent。


需要：

- 理解代码
- 建立因果关系
- 修改方案
- 验证结果


需要强模型。

---

### Research Agent

用户：

> 分析新能源行业未来五年趋势


需要：

- 搜索
- 筛选
- 推理
- 综合


小模型很难。

---

所以：

未来很可能分层。

---

# 5. 一个很可能的未来架构

不是：

```text
所有事情 GPT-5

```

而是：

```text
                  User


                    |

                    v


             Local Agent


        (Small LLM / NPU)


                    |

        +-----------+-----------+

        |                       |

    Simple Task             Complex Task


        |                       |

        v                       v


Local Workflow          Cloud Big Model



        |

        v


Business Systems

```

---

类似：

手机：

判断：

> 我要订机票


本地模型：

完成。


但是：

> 帮我规划一个欧洲三个月旅行


升级：

云端大模型。

---

# 6. 这其实和现在的软件架构非常像

过去：

前端不会承担核心业务。

为什么？

因为：

前端：

- 用户交互
- 状态管理


后端：

- 业务逻辑
- 数据一致性


未来：

Agent 也类似。

---

Agent：

类似：

```text
新的智能前端
```

负责：

- 理解用户
- 转换意图
- 调度能力


Workflow：

类似：

```text
新的智能后端
```

负责：

- 业务规则
- 数据一致性
- 权限
- 流程


---

所以你的理解可以进一步升级：

> Agent 不一定是未来软件的“大脑”，很多企业场景中 Agent 更像智能化操作系统入口；真正的业务智能仍然沉淀在 Workflow、Service 和 Data 中。

---

# 7. 但是这里有一个隐藏问题：为什么现在大家都在追求大模型 Agent？

因为现在处于探索期。

大家想验证：

> 一个模型到底能不能直接完成复杂任务？

所以出现：

- Claude Code
- ChatGPT Agent
- Devin

这类产品。

它们属于：

## Agent as Worker

目标：

替代人的部分工作。


---

而你说的小模型：

属于：

## Agent as Interface

目标：

替代传统 UI。


---

未来两个方向都会存在：

|类型|目标|模型|
|-|-|-|
|Agent as Interface|智能入口|小模型|
|Agent as Worker|执行复杂任务|大模型|
|Agent + Workflow|企业生产系统|大小模型结合|

---

# 8. 这也解释了为什么 MCP 会重要

MCP 其实不是为了让模型变聪明。

而是：

让能力标准化：

```text
任何 Agent

↓

发现 Tool

↓

调用能力

```

未来：

手机本地 Agent：

可能：

```text
Local LLM

+

MCP Server

+

Device Capability

```

例如：

- 相机
- 日历
- 文件
- 地图


---

# 9. 回到我们 Day05 的 Multi Tool Loop

这里其实有一个很好的总结：

Multi Tool Loop 的价值不是：

> 让一个 Agent 包办天下。


而是：

> 让一个智能入口能够动态连接大量能力。


至于这个入口：

可以是：

- GPT-5
- Claude
- 7B 本地模型
- 手机 NPU 模型

取决于任务。


---

所以你的判断：

> “如果 Agent 只是入口智能化，其实不需要多牛逼 LLM，最好手机本地跑”

在**Agent as Interface**这个方向上非常正确。

甚至未来很多企业内部 Agent，我认为更可能是：

```
小模型
+
Intent Router
+
Workflow Engine
+
Tool Ecosystem
```

而不是：

```
一个超级大模型 Agent
```

这其实也和你之前做前端架构的经验很像：

以前大家想做“万能前端框架”，后来发现：

真正工业系统是：

**轻入口 + 强业务服务 + 清晰边界。**

Agent 时代可能也是同一个演化规律。

## 27. User

而且现在我整体的感受是，除了 cursor Claude code codex 这种编码的 Agent，其他行业的 Agent 好像压根没有，比如支付宝 app，他出了个 AI 版本的，里面的 Agent 我看着其实就像是一个根据用户 prompt 去触达他已有的业务中，更像是解决用户不知道某些功能在哪里然后 Agent 帮助用户来触达

## 28. Assistant

你的观察其实非常接近目前 Agent 商业落地的真实状态，而且这里有一个很重要的区分：

> **现在真正“像 Agent”的产品，主要集中在编码领域；大量其他行业所谓 Agent，本质更接近 AI Assistant + Intent Router + Workflow 调度。**

这不是说它们不好，而是因为不同领域的任务结构差异非常大。

---

# 1. 为什么 Coding Agent 是目前最像 Agent 的？

先看 Cursor / Claude Code / Codex 这类。

它们的任务天然符合 Agent Loop：

用户：

> 帮我修复这个 bug


它不知道：

- 哪个文件
- 哪个函数
- 什么原因
- 怎么修改


所以必须：

```text
Goal

↓

Explore

↓

Observe

↓

Reason

↓

Act

↓

Test

↓

Replan

↓

Act again

```

例如：

```text
搜索代码

↓

阅读文件

↓

修改

↓

运行测试

↓

发现失败

↓

继续修改

```

这里：

下一步真的不确定。

所以 LLM 的推理能力产生价值。


---

# 2. 为什么其他行业目前不像 Agent？

因为大量企业业务：

其实不是开放任务。


例如支付宝：

用户：

> 我要查一下我的社保


以前：

用户路径：

```text
支付宝首页

↓

城市服务

↓

社保

↓

查询
```

现在：

```text
用户说一句：

我要查社保


↓

AI 理解意图

↓

调用已有服务

```

这解决的是：

## Discovery Problem（能力发现问题）


不是：

## Reasoning Problem（复杂推理问题）


---

# 3. 这类产品更准确叫：

## AI Interface Layer

而不是 Agent Worker。


架构：

以前：

```text
User

↓

UI Navigation

↓

Business Service

```

现在：

```text
User

↓

AI Assistant

↓

Intent Recognition

↓

Business Service

```

---

比如：

支付宝：

背后已经有：

- 支付
- 转账
- 理财
- 社保
- 医疗
- 生活服务


Agent 只是：

帮你找到正确入口。


---

# 4. 为什么这种场景不需要强 Agent？

因为业务能力已经存在。


例如：

查快递：

真正执行：

```text
物流系统 API

↓

订单系统 API

↓

配送系统 API
```

AI 只需要：

理解：

> 我要查哪个订单。


所以：

模型能力需求：

可能：

```text
意图识别
+
参数抽取
+
简单规划
```

即可。


---

# 5. 但是为什么企业宣传都叫 Agent？

这里有一个行业现象。

因为：

“Agent”这个词现在比较热。


很多产品实际上是：

```text
LLM

+

Function Calling

+

Workflow

```

然后包装成：

Agent。


严格来说：

更接近：

## Tool-using Assistant

或者：

## AI Orchestrator


---

# 6. 真正 Agent 和 AI Assistant 的区别

可以这样判断：

问一个问题：

> 如果去掉 LLM，这个系统还能不能运行？


---

## AI Assistant

例如：

支付宝 AI：

去掉 LLM：

仍然：

```text
点击入口

↓

调用业务服务

```

能运行。


LLM：

只是新的入口。


---

## Agent Worker

例如：

Claude Code：

去掉 LLM：

无法运行。


因为：

不知道：

- 看哪里
- 改什么
- 下一步做什么


---

# 7. 为什么 Coding 是 Agent 的黄金场景？

因为代码世界：

天然：

## 高工具密度

工具：

```text
read_file

search

edit

terminal

test

git

```

---

## 高反馈密度

每一步都有：

```text
compile error

test result

runtime error
```

---

## 高可验证性

成功标准：

```text
test pass

build success
```

---

这三个条件非常重要：

Agent 最喜欢：

```text
Action

↓

Feedback

↓

Correction
```

---

# 8. 其他行业为什么难？

例如：

医疗。

用户：

> 我最近头疼怎么办？


Agent 想行动：

需要：

- 病历
- 检查
- 风险判断
- 医疗责任


反馈：

没有即时结果。


所以：

Agent Loop：

很难闭环。


---

金融：

类似：

你让 Agent：

> 帮我投资赚钱


问题：

Action 后：

多久知道对错？

风险谁承担？


---

所以很多行业：

目前更适合：

```text
AI Assistant

+
Workflow

```

---

# 9. 你前面说的“小 Agent + Workflow”其实就是当前企业最现实路线

比如银行：

可能不是：

“大模型 Agent 自主处理贷款”。


而是：

```text
用户

↓

小模型 Agent


↓

贷款 Workflow


↓

风险系统


↓

审批系统

```

Agent：

负责：

- 收集信息
- 理解需求
- 引导用户


Workflow：

负责：

- 合规
- 审批
- 风控


---

# 10. 那未来会不会出现其他行业的 Claude Code？

我认为会，但条件不同。

Claude Code 成功因为：

它解决：

> 一个专家级任务。


未来可能出现：

## 产品经理 Agent

输入：

> 分析这个产品为什么用户流失


自动：

- 查数据
- 看反馈
- 分析竞品
- 输出方案


---

## 数据分析 Agent

输入：

> 为什么这个月收入下降？


自动：

- 查数据库
- 建 SQL
- 分析


---

## 运维 Agent

输入：

> 服务为什么慢？


自动：

- 查日志
- 查指标
- 定位


---

这些和 Coding Agent 类似：

都有：

工具

↓

反馈

↓

修正

---

# 11. 所以你观察到的现象可以总结为：

目前：

```
Agent 发展阶段：

编码领域：
★★★★★ 真 Agent

企业助手：
★★★ AI + Workflow

超级 App AI：
★★ Intent Router

```

---

而且这个现象其实和我们 Day05 学的内容完全对应：

Multi Tool Loop 的价值：

不是：

> 给所有 App 加一个聊天框。


而是：

> 在一个开放任务中，让模型根据 Observation 动态调用能力完成目标。


支付宝这种：

更多是：

```text
Prompt

↓

Intent

↓

Tool

↓

Workflow

```

而 Claude Code：

是：

```text
Goal

↓

Reason

↓

Tool

↓

Observation

↓

Replan

↓

Tool

```

这两个其实属于不同层级。

你现在对 Agent 的理解已经开始从“功能调用”进入“产品形态和架构边界”了，这也是后面学习 MCP、Workflow、Multi-Agent 时非常关键的判断标准。

## 29. User

那其实现在很多行业很多公司做的还停留在 AI Assistant + workflow

## 30. Assistant

对，而且你的判断基本符合目前企业 AI 落地的真实情况。

不过这里需要稍微精确一下：

> **不是“很多公司做错了”，而是目前大多数企业场景天然更适合 AI Assistant + Workflow，而不是纯 Agent。**

这其实也是为什么现在很多所谓“企业 Agent”看起来不像 Claude Code。

---

# 1. 当前大量企业 AI 产品的真实架构

很多产品宣传：

> AI Agent 自动完成业务流程


但拆开：

```text
              User


                |

                v


          AI Assistant


                |

        Intent Understanding


                |

                v


          Workflow Router


                |

       +--------+--------+

       |                 |

    CRM流程          ERP流程


       |                 |

       v                 v


    Business API

```

本质：

```text
LLM = 智能入口

Workflow = 执行主体

```

---

比如：

## 银行客服 Agent

用户：

> 我要查一下信用卡账单


LLM：

识别：

```json
{
 intent:"query_bill"
}
```


然后：

进入：

```text
查询账单 Workflow

↓

身份验证

↓

调用账单系统

↓

返回结果

```

这里：

Agent 没有“思考”。

它主要负责：

- 理解人话
- 找入口
- 填参数


---

# 2. 为什么企业大多数会选择这个路线？

因为企业最看重：

## 1. 稳定

企业流程：

比如：

贷款审批：

```text
提交

↓

审核

↓

风控

↓

批准

```

不能：

今天：

LLM：

> 我觉得可以批准


明天：

LLM：

> 建议补充材料


后天：

LLM：

> 换一个方案


---

## 2. 可控

企业需要：

知道：

为什么执行这个动作。


Workflow：

```text
Rule A

↓

Step B

↓

Permission C
```

可审计。


---

## 3. 成本

一个 Workflow：

调用几十次 API。

如果每一步都：

GPT-5 Agent：

成本很高。


而：

```text
Small LLM

+

Workflow
```

便宜很多。

---

# 3. 为什么 Claude Code 这种 Agent 反而容易成功？

因为代码领域：

刚好满足 Agent 的黄金条件。


## 任务开放

你不知道 bug 在哪里。


## 工具丰富

```text
search

read

edit

terminal

git
```

## Feedback 快

```text
test pass/fail

compile error

runtime error
```

## 结果可验证

```text
build success
```

---

所以：

Agent Loop：

```text
Reason

↓

Action

↓

Observation

↓

Replan

```

天然成立。


---

# 4. 企业很多场景其实“不需要 Agent”

这个观点很重要。

例如：

## 人事系统

用户：

> 帮我申请年假


流程：

固定：

```text
检查余额

↓

检查权限

↓

提交申请

↓

通知主管

```

为什么需要 Agent？

其实：

一个：

```text
Intent Router

+

Workflow
```

已经很好。


---

## 财务报销

用户：

> 报销这个发票


流程：

固定：

```text
OCR

↓

规则校验

↓

审批

↓

付款
```

不需要：

Agent 自主规划。


---

# 5. 那为什么大家还叫 Agent？

这里有一个行业营销因素。

因为：

过去：

叫：

- chatbot
- workflow automation
- RPA

资本市场兴趣有限。


现在：

Agent 是热点。


所以很多：

```text
LLM

+

Function Calling

+

Workflow
```

被包装成 Agent。


严格来说：

更像：

> Agentic Workflow

而不是：

> Autonomous Agent

---

# 6. 真正有价值的企业 Agent 在哪里？

我认为主要是：

## 非结构化输入 + 多系统探索 + 动态决策

例如：

---

## 企业数据分析 Agent

老板：

> 为什么今年华东销售下降？

它需要：

不知道：

- 查哪个表
- 哪些指标重要
- 是否需要看市场数据


可能：

```text
查询销售数据库

↓

发现某区域下降

↓

查询库存

↓

查询活动记录

↓

生成分析
```

---

## 运维 Agent

用户：

> 最近接口为什么变慢？


可能：

```text
查监控

↓

查日志

↓

查发布记录

↓

定位原因

↓

建议修复
```

---

## Coding Agent

就是最成熟案例。

---

# 7. 所以未来企业架构可能分三类

我觉得可以这样理解：

## 第一类：AI Assistant

定位：

智能入口。


架构：

```
Small LLM

+

Intent Router

+

Workflow
```


占大量企业场景。


---

## 第二类：Agentic Workflow

这是目前最现实的企业方向。


架构：

```
Agent

+

Workflow

+

Tools

```


Agent 负责：

动态部分。


Workflow 负责：

确定部分。


---

## 第三类：Autonomous Agent

例如：

Claude Code：

```
Goal

↓

Explore

↓

Act

↓

Observe

↓

Replan
```


目前主要集中：

- 编程
- 研究
- 自动化运维

---

# 8. 其实这也对应你前面提到的超级 App

你的类比可以进一步升级：

过去超级 App：

> 聚合所有 UI 能力


Agent 时代：

> 聚合所有 Capability 能力


但是：

不是所有 Capability 都需要 Agent 推理。


更可能：

```
                 Agent Interface


                       |

        +--------------+--------------+

        |                             |

  Dynamic Reasoning            Fixed Workflow


        |                             |

   Coding/Data                Finance/CRM


```

---

所以你的总结：

> “现在很多行业很多公司做的还停留在 AI Assistant + workflow”

我会稍微改成：

> **目前大部分企业 AI 落地阶段确实主要集中在 AI Assistant + Workflow，这是因为企业业务高度结构化；真正需要 Multi Tool Loop + Replanning 的 Autonomous Agent，主要存在于开放任务领域。未来更可能是两者结合，而不是 Agent 替代 Workflow。**

这其实也是为什么我们 Day05 学 Tool Loop 很重要：  
如果没有理解 **什么时候需要动态 Loop，什么时候应该交给 Workflow**，很容易把所有问题都错误地设计成 Agent。你现在已经开始进入 Agent 架构设计层面的判断了。

## 31. User

那对于 AI Assistant +workflow 的形式，目前市场上有哪些开源的吗，而 langchain.js这种是不是有点大材小用了呢

## 32. Assistant

这个问题非常关键，因为它其实连接到了我们前面讨论的：

> “Agent 时代到底是不是重新造一个超级 App？”

以及：

> “企业为什么大量落地的是 AI Assistant + Workflow，而不是 Autonomous Agent？”

你的判断也引出了一个很现实的问题：

> 如果只是 AI Assistant + Workflow，那 LangChain.js 这种 Agent Framework 是不是有点过重？

答案：

**很多场景下，是的。LangChain.js 确实偏大材小用。**

但需要区分：企业里的“AI Assistant + Workflow”也有不同复杂度。

---

# 1. 先定义一下 AI Assistant + Workflow

最简单形态：

```text
User

 |

 v

LLM

 |

Intent / Entity Extraction

 |

Workflow Router

 |

Business API

```

例如：

支付宝：

用户：

> 帮我查社保


LLM：

输出：

```json
{
 intent:"query_social_security",
 params:{
   city:"上海"
 }
}
```

然后：

```text
query_social_security workflow

↓

社保 API

↓

结果
```

这里根本不需要：

- Agent Loop
- Tool Planning
- ReAct
- Memory
- Multi-step Reasoning

---

# 2. 这种场景有哪些开源方案？

其实很多，而且比 LangChain 更轻。

---

## 方案 1：Rasa（经典 Intent + Dialogue）

entity["company","Rasa","open source conversational AI platform"]

这是非常典型的：

```text
NLU

+

Dialogue Manager

+

Action Server
```

架构。


以前：

聊天机器人。


现在：

更像：

AI Assistant Runtime。


流程：

```text
用户

↓

NLU

↓

Intent

↓

Dialogue State

↓

Action

↓

Backend API

```

非常适合：

- 客服
- 企业助手
- 流程机器人


特点：

优点：

- 稳定
- 可控
- 企业友好


缺点：

开放推理能力弱。

---

# 3. 方案 2：Dify

entity["company","Dify","open source LLM application development platform"]

这个其实非常符合你说的：

> AI Assistant + Workflow


它的核心：

不是 Agent。

而是：

```text
LLM App Builder

+

Workflow Engine

+

Knowledge Base

+

Tool Integration
```

例如：

画一个流程：

```text
用户输入

↓

LLM 节点

↓

条件判断

↓

HTTP 请求

↓

输出

```

类似：

低代码 AI Workflow。


适合：

- 企业知识库
- 客服机器人
- 内部助手


---

# 4. 方案 3：Flowise

entity["company","Flowise","open source low-code LLM workflow builder"]

它和 LangChain 关系比较近。


特点：

可视化编排：

```text
Prompt

↓

LLM

↓

Retriever

↓

Tool

↓

Output
```

但是：

比直接 LangChain 简单。


适合：

快速搭：

- RAG
- Chatbot
- Workflow


---

# 5. 方案 4：n8n + LLM

entity["company","n8n","workflow automation platform"]

这个其实非常符合企业自动化。


以前：

自动化：

```text
邮件

↓

CRM

↓

通知
```


现在：

加入：

```text
LLM Node
```

变成：

```text
用户输入

↓

LLM 判断

↓

Workflow

↓

系统操作

```

例如：

销售助手：

收到邮件：

↓

LLM 判断客户意图

↓

更新 CRM

↓

创建任务


---

# 6. 那 LangChain.js 的定位是什么？

LangChain.js 更像：

```text
Application Framework

```

不是简单：

Workflow Engine。


它解决：

```text
怎么构建一个 LLM 应用
```

包括：

- Prompt
- Model
- Retriever
- Tool
- Agent
- Memory


如果你的系统：

只是：

```text
用户

↓

分类

↓

调用 API

```

确实：

LangChain 有点重。

---

# 7. 举个例子

## 客服退款

### 方案 A：LangChain Agent

可能：

```text
User

↓

Agent

↓

LLM:

我需要查询订单

↓

Tool:

get_order

↓

LLM:

我要判断退款

↓

Tool:

refund

```

问题：

为什么让 LLM 决定退款流程？


---

### 方案 B：Workflow

```text
User

↓

Intent:

refund_request


↓

Refund Workflow


↓

check_order

↓

check_policy

↓

approval

↓

refund

```

更合理。

---

# 8. 那为什么还有 Agent Framework？

因为有些问题 Workflow 写不了。


例如：

## 数据分析 Agent

用户：

> 为什么今年利润下降？

不知道：

流程是什么。


可能：

```text
SQL

↓

发现库存问题

↓

查供应链

↓

发现供应商问题

↓

分析

```

这里：

Workflow 很难提前写。


需要：

Agent。


---

# 9. 所以可以这么分类

|场景|推荐架构|
|-|-|
|客服 FAQ|RAG + Workflow|
|业务查询|Intent Router + Workflow|
|审批流程|Workflow|
|ERP 操作|Workflow|
|知识助手|RAG + Assistant|
|数据分析|Agent|
|Coding|Agent|
|研究任务|Agent|
|自动运维|Agent|

---

# 10. 回到你的问题：LangChain.js 是不是大材小用？

我的判断：

## 对 AI Assistant + Workflow：

很多时候：

**是大材小用。**

更合适：

```
LLM API
+
Intent Router
+
Workflow Engine
+
Business API
```

甚至自己写：

几百行 Node.js：

```ts
const intent =
 await llm.classify(input)


switch(intent){

case "refund":

 return refundWorkflow()

case "delivery":

 return deliveryWorkflow()

}

```

已经够了。

---

## 对真正 Agent：

LangChain / LangGraph 才合理。

例如：

```text
Goal

↓

Planning

↓

Tool Selection

↓

Execution

↓

Observation

↓

Replanning
```

这种。


---

# 11. 其实你的前端架构经验很好类比

你以前做业务系统：

不会因为有 React，就所有东西都写 React。


例如：

权限：

后端控制。


支付：

后端控制。


流程：

后端状态机。


React：

只是交互层。


Agent 也是一样：

不要因为有 LLM：

所有东西都 Agent 化。


未来更合理：

```text
              AI Interface


                   |

       +-----------+-----------+

       |                       |

   Agent Runtime        Workflow Engine


       |                       |

   Open Tasks          Business Process


```

---

所以你这个问题其实已经把 Day05 后半部分串起来了：

- Tool Loop → 动态能力调用
- Workflow → 确定性流程
- MCP → 能力标准化暴露
- LangChain/LangGraph → 更偏 Agent Runtime
- Dify/n8n/Rasa → 更偏 AI Assistant + Workflow

这也是为什么后面我们学习 MCP 和 LangChain.js 时，需要先建立这个边界，否则很容易误以为：

> “所有 AI 应用都应该用 Agent Framework。”

实际上工业设计恰恰相反：

> **能用 Workflow 解决的问题，不要强行上 Agent；只有不确定的问题，才交给 Agent。**
