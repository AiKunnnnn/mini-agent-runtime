# Day05 Part E ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a6b12be-2bc8-83ee-8db1-2becaef2da15
- 会话标题：Day05 Part E Tool Executor
- 抽取时间：2026-07-30

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part E 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05 part D 的学习笔记与day05 的 readme，你看一下，然后我们进入 part E 的学习

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

- `README(15).md`（Day05 总体规划）
- `day05-part-d-tool-registry.md`（Part D 正式学习文档）

整体来看，**Day05 的学习路线设计是连贯的，Part D 也已经完成了它应该承担的职责**。我们可以进入 **Day05 Part E：Tool Executor**。

在开始 Part E 前，我先帮你做一下上下文承接，确保我们不是孤立学习。

---

# Day05 当前进度回顾

整个 Day05 实际是在回答一个核心问题：

> Runtime 如何让 LLM 从“会思考”变成“会行动”？

完整链路：

```
User Goal
    |
    v
Context Builder
    |
    v
LLM Reasoning
    |
    v
Tool Decision
    |
    v
Tool Call Intent
    |
    v
Tool Execution
    |
    v
Observation
    |
    v
Runtime State Update
    |
    v
Next Loop
```

目前已经完成：

---

## Part A：Tool Calling 基础模型

解决：

> Tool Calling 到底是什么？

核心认知：

```
LLM != Executor

LLM:
    产生行动意图

Runtime:
    执行动作
```

也就是：

```
LLM
 |
 | "我要调用 query_order"
 v
Runtime
 |
 | execute
 v
Tool
```

---

## Part B：Tool Decision

解决：

> LLM 为什么选择某个 Tool？

核心：

```
Tool Decision
=
Goal-driven Action Selection
```

不是：

```js
if(user.includes("订单")){
   callOrderTool()
}
```

而是：

```
Goal
 |
 v
LLM
 |
 v
Action Probability
 |
 v
Tool Selection
```

---

## Part C：Tool Schema

解决：

> Runtime 如何告诉 LLM "你有哪些动作可以做"

核心：

```
Tool Schema
=
Action Contract
```

比如：

```json
{
"name":"query_order",
"description":"Query order status",
"parameters":{
   "order_id":"string"
}
}
```

本质：

给 LLM 定义行动空间。

---

## Part D：Tool Registry

解决：

> 如果 Agent 有 100 个 Tool，怎么办？

核心升级：

以前：

```
tools = [
  tool1,
  tool2,
  tool3
]
```

升级：

```
Tool Registry

=
Capability Management Center
```

负责：

```
所有能力
 |
 v
Registry
 |
 v
Router
 |
 v
当前能力集合
 |
 v
Context Builder
 |
 v
LLM
```

---

# Part E 的位置

Part D 之后，自然出现一个问题：

> LLM 已经选择了 Tool，也生成了参数，那么谁真正执行？

这就是：

# Day05 Part E：Tool Executor

---

# Part E 核心问题

这一节主要回答：

## 1. 为什么 LLM 不能直接执行 Tool？

这是非常重要的 Agent Runtime 分界线。


很多初学者理解：

```
LLM
 |
调用 API
 |
返回结果
```

实际上工业架构：

```
              Runtime

User
 |
 v

Context Builder

 |
 v

LLM
 |
 |
 | Tool Call Intent
 |
 v

Tool Executor
 |
 |
 | validate
 | permission check
 | timeout
 | retry
 | logging
 |
 v

External World
```

LLM 永远只是：

```
Decision Maker
```

不是：

```
Execution Engine
```


---

## 2. Tool Call Intent 如何进入 Executor？

比如 LLM 输出：

```json
{
"name":"query_order",
"arguments":{
   "order_id":"ORD-10001"
}
}
```

这只是：

```
Intent
```

不是执行。

Runtime 接下来：

```
Tool Call Intent

        |
        v

Tool Registry lookup

        |
        v

找到 RuntimeTool

        |
        v

Executor
```

---

# Part E 会重点拆：

## 1. Tool Executor 的职责

不是简单：

```ts
tool.execute()
```

工业 Executor 包含：

```
Tool Executor

+
Input Validation

+
Permission Check

+
Execution Context

+
Timeout

+
Retry

+
Cancellation

+
Error Handling

+
Tracing

+
Result Normalization
```

---

## 2. Executor 与 Registry 的关系

Part D：

```
Registry

管理能力
```

Part E：

```
Executor

执行能力
```

关系：

```
Tool Registry
        |
        |
        v

RuntimeTool

{
 definition,
 metadata,
 execute
}


        |
        v


Tool Executor
```

简单理解：

Registry:

> 你有哪些员工？

Executor:

> 怎么安排员工干活，并监督过程？


---

## 3. Tool Execution Context

这是 Part E 一个重要工业概念。

Tool 执行不是：

```ts
execute(input)
```

而是：

```ts
execute(
 input,
 executionContext
)
```

例如：

```ts
{
 userId,
 sessionId,
 workspace,
 permissions,
 runtimeState,
 logger,
 abortSignal
}
```

为什么？

因为 Tool 需要知道：

```
谁调用？
在哪里调用？
有没有权限？
是否取消？
如何记录？
```

---

## 4. Error Observation

Agent 最大区别：

传统程序：

```
error
 |
throw
 |
结束
```


Agent：

```
Tool Error

    |
    v

Observation

    |
    v

LLM

    |
    v

重新决策
```


例如：

Tool:

```
query_order
```

失败：

```json
{
"error":"ORDER_NOT_FOUND"
}
```

Runtime：

不会直接结束。

而是：

```
Observation:

订单 ORD-10001 不存在，请确认订单号。
```

回 Context：

```
LLM

重新思考

可能：
1. 请求用户确认
2. 查询其他系统
3. 结束任务
```

---

# 5. Retry / Timeout / Cancellation

这是 Agent Runtime 开始接近传统分布式系统的位置。

例如：

```
search_web
```

可能：

- 网络慢
- API 超时
- 服务异常


Executor 要负责：

```
Retry Policy

Timeout

Circuit Breaker

Cancellation
```

这其实和：

- RPC Framework
- Job Queue
- Distributed System

高度相似。

---

# Part E 学习后的工业认知目标

完成 Part E 后，你应该形成：

以前：

```
Tool = 一个函数
```

升级：

```
Tool
=
Capability Contract
+
Implementation
+
Execution Lifecycle
```

更完整：

```
Agent Action

=
Tool Definition

+
Tool Registry

+
Tool Executor

+
Permission Policy

+
Observation Feedback
```

---

# Part E 与后续章节关系

整个 Day05 后半部分：

```
Part D

Tool Registry
能力管理


        |
        v


Part E

Tool Executor
能力执行


        |
        v


Part F

Permission & Human Approval
能力控制


        |
        v


Part G

Tool Result Runtime Feedback
能力反馈


        |
        v


Part H

Multi Tool Loop
能力编排


        |
        v


Part I

Mini Runtime Implementation
落地实现
```

所以 Part E 是非常关键的一节。

---

# 开始 Day05 Part E：Tool Executor

下一条我会按照我们之前 Day04 / Day05 的学习方式展开：

结构：

1. Part E 定位
2. 为什么需要 Tool Executor
3. LLM 与 Executor 边界
4. Tool Call Intent 生命周期
5. Executor Architecture
6. Input Validation
7. Execution Context
8. Permission Hook
9. Retry / Timeout / Cancellation
10. Error Handling
11. Observation 构造
12. OpenAI Agents SDK / Claude Code / LangGraph 映射
13. mini-agent-runtime 实现
14. 工业级实现
15. 面试视角
16. 本章思考题

我们进入：

# Day05 Part E：Tool Executor（Execution Runtime）🚀

## 7. User

继续学习

## 8. Assistant

# Day05 Part E：Tool Executor（Execution Runtime）

## 1. Part E 定位：从「能力管理」进入「能力执行」

前面 Part A-D，我们一直在解决：

> Agent 如何知道自己有什么能力，以及选择什么能力？

回顾：

```
Part A
Tool Calling
=
LLM 产生行动意图


Part B
Tool Decision
=
LLM 选择行动


Part C
Tool Schema
=
描述行动契约


Part D
Tool Registry
=
管理所有行动能力
```

但是到这里还有一个问题：

---

假设 LLM 输出：

```json
{
  "name": "query_order",
  "arguments": {
    "order_id": "ORD-10001"
  }
}
```

现在：

谁执行？

谁检查参数？

谁判断权限？

谁处理失败？

谁记录日志？

谁控制超时？

谁把结果反馈给 Agent？

---

答案：

# Tool Executor

---

## 核心定义

> Tool Executor 是 Agent Runtime 中负责将 LLM 产生的 Tool Call Intent 转换为真实外部动作，并管理整个执行生命周期的组件。


简单理解：

```
LLM
 |
 | "我要调用 query_order"
 |
 v

Tool Executor

 |
 | 真正执行
 |
 v

Database / API / File System
```

---

# 2. 为什么 LLM 不能直接执行 Tool？

这是理解 Agent Runtime 的一个关键分界。

很多初学者会认为：

```
用户
 |
LLM
 |
调用 API
 |
返回结果
```

实际上工业架构：

```
                Agent Runtime


User
 |
 v

Context Builder

 |
 v

LLM

 |
 | Tool Call Intent
 |
 v

Tool Executor

 |
 | validate
 | permission
 | execute
 | retry
 | timeout
 | tracing
 |
 v

External World
```

---

为什么必须隔离？

原因：

## 原因 1：安全边界

LLM 是概率系统。

例如：

用户：

> 删除测试环境所有数据


LLM 可能生成：

```json
{
"name":"delete_database"
}
```

但是 Runtime 必须判断：

```
当前用户？
当前环境？
是否允许？
是否需要审批？
```

所以：

```
LLM:
    提议动作

Runtime:
    决定是否执行
```

---

## 原因 2：可靠性

LLM 不负责：

- timeout
- retry
- circuit breaker
- logging
- tracing

例如：

调用：

```
payment_api
```

失败：

```
timeout
```

LLM 不知道：

- 是否重试？
- 重试几次？
- 是否降级？


这些属于 Executor。

---

## 原因 3：业务系统不应该暴露给模型

比如：

内部订单服务：

```
POST
/internal/order/query/v3
```

参数：

```json
{
 appId,
 token,
 tenantId
}
```

LLM 不应该知道这些。

LLM 只看到：

```json
{
"name":"query_order",
"description":"查询订单状态"
}
```

Runtime 负责：

```
Tool
 |
Adapter
 |
Internal Service
```

---

# 3. Tool Executor 在 Runtime Loop 中的位置

完整 Agent Loop：

```
                Runtime


        +----------------+
        | Context Builder|
        +----------------+
                |
                v

              LLM

                |
                |
        Tool Call Intent

                |
                v

        +---------------+
        | Tool Executor |
        +---------------+

                |
                v

             Tool

                |
                v

          Tool Result

                |
                v

          Runtime State

                |
                v

        Next Agent Loop
```

注意：

Executor 位于：

```
Decision
    |
    v
Execution
```

之间。

它是：

> 从认知世界进入现实世界的边界层。

---

# 4. Tool Call Intent 生命周期

这是 Part E 最重要的概念。

LLM 输出：

```json
{
"name":"query_order",
"arguments":{
 "order_id":"ORD-10001"
}
}
```

不要理解为：

```
执行成功
```

它只是：

```
Intent
```

完整生命周期：

---

## Step 1：LLM 生成 Intent


```
LLM


输出：

ToolCallIntent

{
 toolName,
 arguments
}
```

---

## Step 2：Executor 接收


```
Executor

收到：

{
 name:"query_order"
}
```

---

## Step 3：Registry 查找 Tool


```
Executor

        |
        v

Tool Registry


        |
        v


RuntimeTool
```

例如：

```ts
{
 definition:{
   name:"query_order"
 },

 execute(){
    ...
 }
}
```

---

## Step 4：参数验证


例如：

Schema:

```json
{
"type":"object",
"required":[
 "order_id"
]
}
```


输入：

```json
{}
```


Executor：

```
reject
```

不会进入业务系统。

---

## Step 5：权限检查


例如：

Tool:

```
refund_order
```


Runtime:

```
当前用户:
普通客服


权限:
refund:create


结果:
拒绝
```

---

## Step 6：执行


调用：

```
execute()
```

---

## Step 7：结果标准化


成功：

```json
{
 ok:true,
 output:{
   status:"SHIPPED"
 }
}
```


失败：

```json
{
 ok:false,
 error:{
   code:"ORDER_NOT_FOUND"
 }
}
```

---

## Step 8：回 Runtime


变成：

```
Observation
```

进入下一轮：

```
Context Builder

↓

LLM
```

---

# 5. Tool Executor 架构设计

工业实现通常类似：

```
             Tool Call Intent

                    |
                    v

          +----------------+
          | Tool Executor  |
          +----------------+

                    |
       +------------+------------+
       |
       v

 Input Validator

       |
       v

 Permission Checker

       |
       v

 Execution Manager

       |
       +--------+
       |        |
       v        v

 Retry    Timeout Manager


       |
       v


 Tool Implementation


       |
       v


 Result Normalizer


       |
       v


 Observation
```

---

# 6. Input Validation（参数校验）

为什么 Executor 还需要校验？

因为：

Tool Schema 是给 LLM 的。

但是：

LLM 输出不是可信输入。


例如：

Schema：

```json
{
"order_id":"string"
}
```


LLM:

```json
{
"order_id":12345
}
```


或者：

```json
{
"order_id":"DROP TABLE"
}
```


所以：

```
Schema
 |
 v
LLM理解

Validator
 |
 v
Runtime安全
```

两层作用：

---

## 第一层：格式正确

例如：

```ts
order_id:string
```

检查：

```ts
typeof order_id === "string"
```

---

## 第二层：业务约束

例如：

退款：

```json
{
amount:100000
}
```


格式正确。

但是：

```
金额超过审批阈值
```

仍然不能执行。

所以：

```
Schema Validation

+

Business Validation
```

---

# 7. Tool Execution Context

这是工业 Agent 和普通函数调用的区别。

普通函数：

```ts
queryOrder(orderId)
```


Agent Tool：

```ts
execute(
 input,
 executionContext
)
```


例如：

```ts
type ToolExecutionContext = {

 userId:string;

 sessionId:string;

 workspace:string;


 permissions:string[];


 runtimeState:RuntimeState;


 logger:Logger;


 abortSignal:AbortSignal;

}
```

---

为什么需要？

## 用户身份

例如：

```
query_salary
```

不同员工看到不同数据。


---

## 权限

例如：

```
delete_file
```

需要：

```
workspace:write
```


---

## Runtime State

Tool 可能依赖：

```
当前项目
当前任务
当前环境
```

例如 Claude Code：

```
workspace=/project/demo
```

---

## Logging

生产环境需要：

```
谁
什么时候
调用什么 Tool
参数是什么
结果是什么
```

用于：

- 审计
- Debug
- Evaluation

---

# 8. Tool Executor 与传统软件工程映射

这里非常符合你之前提到的：

> Agent 本质还是软件工程在 Agent 上的应用。


Tool Executor 对应：

| Agent | 传统工程 |
|-|-|
| Tool Executor | Service Executor |
| Validation | API Gateway Validation |
| Permission | RBAC |
| Retry | RPC Retry |
| Timeout | Distributed Timeout |
| Logging | Observability |
| Result Normalizer | DTO Adapter |

---

所以：

Agent Runtime 并没有创造新的工程思想。

它把：

```
软件工程可靠性体系

+

LLM 非确定决策
```

结合起来。

---

# 9. Error Handling：失败也是 Observation

这是 Agent 和传统程序最大区别之一。


传统：

```
Error

↓

Exception

↓

结束
```


Agent：

```
Error

↓

Observation

↓

LLM重新规划
```

---

例如：

Tool:

```
search_customer
```

返回：

```json
{
error:{
 code:"CUSTOMER_NOT_FOUND"
}
}
```

Runtime 转换：

```
Observation:

没有找到该客户，请确认姓名或手机号。
```

LLM：

重新判断：

```
可能需要询问用户更多信息
```

---

所以：

Tool Error 不是简单异常。

它是：

```
Environment Feedback
```

也就是 ReAct 里的：

```
Observation
```

---

# 10. Tool Executor 最小实现模型

mini-agent-runtime：

```ts
class ToolExecutor {


 async execute(
   toolCall,
   context
 ){

   // 1. 找 Tool
   const tool =
      registry.get(toolCall.name);


   // 2. validate
   validate(
      toolCall.arguments,
      tool.definition.inputSchema
   );


   // 3. permission
   await permission.check(
      tool,
      context
   );


   // 4. execute
   const result =
      await tool.execute(
          toolCall.arguments,
          context
      );


   // 5. normalize
   return normalize(result);

 }

}
```

---

此时 Runtime 已经形成：

```
Tool Registry

负责：
找到能力


Tool Executor

负责：
执行能力
```

---

# 本 Part 核心认知升级

学习 Part E 后：

之前：

```
Tool
=
一个函数
```

升级：

```
Tool
=
Capability Contract
+
Runtime Managed Execution
```

再升级：

```
Agent Action

=
LLM Decision

+

Tool Registry

+

Tool Executor

+

Permission

+

Observation Feedback
```

---

# 工业级实现（Industrial Notes）

真实企业 Agent 中：

Tool Executor 往往不会直接调用业务 API。

中间还有：

```
Agent Runtime

      |
      v

Tool Executor

      |
      v

Domain Adapter

      |
      v

Business Service

      |
      v

Database
```

原因：

保持：

```
Agent Layer
业务层
数据层
```

隔离。

例如客服 Agent：

```
LLM

↓

query_order Tool

↓

OrderToolAdapter

↓

OrderService

↓

OrderDB
```

而不是：

```
LLM

↓

SQL
```

---

# 面试视角

## Q1：为什么 Tool Executor 必须存在？

因为 LLM 只能产生 Tool Call Intent，不能直接控制真实系统。Executor 负责参数校验、权限控制、可靠执行和结果标准化。


---

## Q2：Tool Executor 和 Tool Registry 区别？

Registry：

> 管理有哪些能力。

Executor：

> 管理如何执行能力。


---

## Q3：Tool Error 为什么可以继续 Agent Loop？

因为 Agent 将错误视为 Observation，而不是终止异常。LLM 可以根据反馈重新规划。


---

## Q4：Tool Executor 和普通函数调用区别？

普通函数调用：

```
input
 |
function
 |
output
```

Agent Tool Executor：

```
Intent

↓

Validation

↓

Policy

↓

Execution

↓

Observation

↓

Next Reasoning
```

---

# 本章思考题

1. 为什么 LLM 不能直接调用数据库？
2. Tool Call Intent 和 Tool Execution 有什么区别？
3. Tool Executor 为什么需要 Context？
4. Schema Validation 为什么不能完全相信 LLM？
5. Retry 应该属于 Tool 本身还是 Executor？
6. Tool Error 为什么是 Observation？
7. Tool Executor 如何和 Permission System 衔接？
8. Tool Registry 和 Executor 为什么必须拆开？
9. Agent Runtime 中 Executor 更像 API Gateway 还是 Job Executor？
10. 如果 Tool 执行耗时 10 分钟，Executor 应该如何设计？

---

下一节进入：

# Day05 Part F：Permission & Human Approval

Part E 解决：

> Runtime 如何执行动作？

Part F 将解决更关键的问题：

> Runtime 如何决定这个动作是否允许执行？

也就是：

**Agent 安全边界设计。**

## 9. User

提几个问题：
1. LLM 输出 intent 后，从 Intent 到 tools registry 是怎样的呢？这个 intent 是具体的某个 tool 吗？如果只是表示某个 tool 的能力描述，那么从能力描述到 从  tools registry 中找到这个能力的 tool 又是谁完成的呢？
2. 以 上面举例的 type ToolExecutionContext 为例，里面的参数比如权限permissions 这个字段是行业与 LLM 的共识吗？如果是不同的 LLM 是否定义的字段不同呢
3. 感觉啊，tool Execution本质上还是软件工程中业务代码那一套在 Agent 中的应用

## 10. Assistant

这三个问题非常好，而且其实已经进入了 **Agent Runtime 工程实现的核心边界问题**。尤其第 1 个问题，你已经开始从“使用 Agent”进入“设计 Runtime”的视角了。

我们逐个拆。

---

# 问题 1：LLM 输出 Intent 后，怎么从 Intent 到 Tool Registry？

你的疑问：

> 这个 intent 是具体某个 tool 吗？如果只是能力描述，那么谁负责从能力描述找到 registry 中的 tool？

这个问题非常关键。

答案：

**现代 Tool Calling 中，LLM 输出的 Intent 通常已经包含具体 Tool name，而不是模糊能力描述。**

也就是说：

LLM 输出：

```json
{
  "name": "query_order",
  "arguments": {
    "order_id": "ORD-10001"
  }
}
```

这里：

```text
name = query_order
```

已经是 Registry 中 Tool 的唯一标识。

所以流程：

```
                 LLM

                  |
                  |
                  v

        Tool Call Intent


{
 name:"query_order",
 arguments:{
   order_id:"ORD-10001"
 }
}


                  |
                  v


          Tool Executor


                  |
                  v


          Tool Registry


                  |
                  v


          RuntimeTool
```

代码类似：

```ts
const tool =
    registry.get(toolCall.name);
```

也就是：

```ts
registry.get("query_order")
```

找到：

```ts
{
 definition:{
   name:"query_order"
 },

 execute(){
    // 查询订单
 }
}
```

---

## 那 Tool Routing 是什么？

你可能想到：

> 如果 LLM 已经知道 tool name，那为什么 Part D 还讲 Tool Routing？

因为这里有两个阶段。


## 阶段 1：决定给 LLM 看哪些 Tool

这是 Part D：

```
1000 Tools

   |
   |
   v

Tool Router

   |
   |
   v

10 Candidate Tools

   |
   |
   v

LLM
```

例如：

全部能力：

```
read_file
write_file
delete_file
query_order
refund
send_email
calendar
github
...
```

用户：

> 查询订单物流


Router：

筛选：

```
query_order
query_logistics
```

然后 Context Builder：

把这两个 Tool Schema 给 LLM。


---

## 阶段 2：LLM 从候选 Tool 中选择

LLM：

看到：

```
query_order
query_logistics
```

决定：

```json
{
"name":"query_logistics"
}
```

---

所以完整链路：

```
Tool Registry

(保存全部能力)

        |
        |
        v

Tool Router

(缩小候选能力)

        |
        |
        v

Context Builder

(暴露 Tool Schema)

        |
        |
        v

LLM

(选择具体 Tool)

        |
        |
        v

Tool Call Intent

(name=query_logistics)

        |
        |
        v

Tool Executor

(registry.get)

        |
        |
        v

真实执行
```

---

所以回答你的问题：

> intent 是能力描述吗？

不是。

更准确：

```
Tool Description
        |
        | 给 LLM 理解能力
        |
        v

Tool Call Intent
        |
        | 指定具体动作
        |
        v

Tool Execution
```

---

类比传统软件：

HTTP：

```http
GET /users/100
```

不是：

> 我要执行一个查询用户能力

而是：

具体：

```
endpoint=/users
method=GET
```

Agent：

```json
{
"name":"query_user"
}
```

类似：

```
调用哪个 endpoint
```

---

# 问题 2：ToolExecutionContext 里的 permissions 是行业共识吗？

你的观察很敏锐：

> permissions 这个字段是不是 LLM 和行业约定？不同 LLM 会不会字段不同？

答案：

**不是。**

这里要区分：

## LLM 世界

和

## Runtime 世界


---

LLM 看到：

```json
{
"name":"query_order",
"description":"查询订单"
}
```

它不知道：

```ts
permissions
userId
sessionId
workspace
logger
```

这些。

---

这些属于：

# Runtime Internal Contract

也就是：

Agent 框架自己的内部设计。

例如：

OpenAI Agents SDK 可以设计：

```ts
context = {
 user,
 session,
 permissions
}
```

Claude Code 可以设计：

```ts
context = {
 workspace,
 filesystem,
 terminal
}
```

LangGraph 可以设计：

```ts
state = {
 messages,
 tools,
 metadata
}
```

它们没有统一。


---

行业真正统一的是更上层概念：

例如：

```
Tool Call
Tool Schema
Function Name
Arguments
Result
```

这些是模型接口协议。

比如：

OpenAI Function Calling：

```json
{
"name":"get_weather",
"arguments":{
 "city":"Tokyo"
}
}
```

Anthropic Tool Use：

类似：

```json
{
"name":"get_weather",
"input":{
 "city":"Tokyo"
}
}
```

---

但是：

Runtime Context：

```
permissions
userId
tenantId
workspace
logger
traceId
```

没有标准。


---

这其实和传统后端一样。

比如：

HTTP Request：

统一：

```
GET
POST
Headers
Body
```

但是你的业务：

```ts
req.user
req.tenant
req.permissions
```

是谁定义？

公司自己。

---

所以：

```
LLM Protocol

=
行业标准


Runtime Context

=
框架/企业设计
```

---

# 问题 3：Tool Executor 本质是不是软件工程业务代码？

你的感觉：

> 感觉 tool Execution 本质上还是软件工程中业务代码那一套在 Agent 中的应用。

这个判断：

**基本正确。**

甚至这是学习 Agent 最重要的认知升级之一。

很多人认为：

```
Agent
=
全新的技术
```

其实：

```
Agent
=
软件工程基础设施
+
LLM 决策层
```

---

我们映射一下。

传统系统：

```
Controller

 |
 v

Service

 |
 v

Repository

 |
 v

Database
```

调用路径固定：

```
if A
   call B

else
   call C
```

---

Agent：

多了一层：

```
Controller

 |
 v

LLM Decision Layer

 |
 v

Tool Executor

 |
 v

Service

 |
 v

Database
```

变化在哪里？

不是执行层。

执行层还是：

```
Service
API
Database
RPC
Queue
```

变化的是：

以前：

```
程序员决定调用哪个 Service
```

现在：

```
LLM 根据目标选择 Action
```

---

举客服系统：

传统：

```
用户输入:

查询订单


代码:

if intent=="查询订单":

   orderService.query()
```

---

Agent：

```
用户输入:

我的订单什么时候到？


LLM:

我要调用 query_logistics


Tool Executor:

调用 logisticsService


返回结果


LLM:

生成回复
```

---

所以：

真正变化：

不是：

```
Tool Executor
```

而是：

```
Decision Layer
```

---

# 这也是为什么你之前总结：

> Agent = LLM + Workflow + Tools + Memory

这个方向是对的。


拆开：

## LLM

负责：

```
概率决策
```

---

## Workflow

负责：

```
确定流程约束
```

---

## Tool

负责：

```
业务能力
```

---

## Executor

负责：

```
可靠执行
```

---

## Memory

负责：

```
长期状态
```

---

所以企业 Agent 为什么落地多是：

```
LLM
+
已有业务系统
+
Workflow
+
Tools
```

而不是重新开发业务。

因为：

企业已经有：

```
订单系统
库存系统
CRM
ERP
权限系统
```

Agent 只是：

增加一个智能决策入口。

---

# 最后总结你的三个问题

## 1.

> Intent 怎么找到 Tool？

答案：

LLM 输出通常已经包含 Tool name。

```
Intent.name
        |
        v
registry.get(name)
        |
        v
Tool Implementation
```

Router 是之前筛选候选 Tool，不是执行阶段寻找。

---

## 2.

> permissions 是 LLM 标准吗？

不是。

分层：

```
Tool Schema
    |
    | 标准
    |
LLM


Runtime Context
    |
    | 自定义
    |
Agent Framework
```

---

## 3.

> Tool Executor 是业务代码应用？

是。

更准确：

```
Tool Executor
=
传统软件执行体系

+
Agent Runtime 生命周期管理
```

Agent 最大的新东西不是 Tool Executor。

真正的新东西是：

> **让 LLM 参与原本由程序员硬编码的 Action Selection。**

---

其实你现在已经碰到了 Agent 工程里非常核心的一条分界线：

**Agent Runtime 70% 是软件工程，30% 是 LLM Orchestration。**

后面的 Part F（Permission & Human Approval）会继续证明这一点，因为它本质就是：

> RBAC + Policy Engine + Human-in-the-loop 在 Agent 场景下的应用。

## 11. User

1. 是因为在 Agent 初始化时候已经把 tools 都注入了吗，所以 LLM 的 output 能突出具体的 tool name？

## 12. Assistant

对，你这个理解方向是对的，而且你已经抓到了 **Tool Calling 中最关键的一个机制：LLM 为什么知道 Tool name**。

答案：

> **因为 Runtime 在调用 LLM 时，会把当前可用的 Tool Definition（包含 name、description、parameters）注入到 Context / API 请求中，所以 LLM 生成 Tool Call 时，是从这些已知 Tool 中选择具体 name。**

但是这里需要稍微修正一下“初始化时候注入”的理解。

不一定是在 **Agent 初始化时一次性注入所有 tools**。

更准确：

> 每一次 LLM 推理请求之前，Runtime 会根据当前任务动态构建 Tool Context，然后把候选 Tool Schema 传给 LLM。

---

## 1. 完整流程

假设 Registry 里面有：

```ts
ToolRegistry {

  query_order

  query_logistics

  refund_order

  send_email

  delete_file

}
```

这是 Runtime 全部能力。

---

用户：

> 我的订单什么时候到？

---

## 第一步：Tool Router 筛选

Runtime 判断：

当前任务可能相关：

```text
query_order
query_logistics
```

于是生成：

```json
[
 {
  "name":"query_order",
  "description":"查询订单信息"
 },
 {
  "name":"query_logistics",
  "description":"查询物流状态"
 }
]
```

---

## 第二步：Context Builder 构建 LLM Context

最终发给 LLM：

类似：

```json
{
 "messages":[
   {
    "role":"user",
    "content":"我的订单什么时候到？"
   }
 ],

 "tools":[
   {
    "name":"query_order",
    "description":"查询订单信息",
    "parameters":{
       "order_id":"string"
    }
   },

   {
    "name":"query_logistics",
    "description":"查询物流状态",
    "parameters":{
       "tracking_number":"string"
    }
   }
 ]
}
```

注意：

这里的 tools 就是关键。

---

## 第三步：LLM 输出 Tool Call

LLM 看到：

```
Available tools:

1. query_order
2. query_logistics
```

结合用户目标：

```
我的订单什么时候到？
```

推理：

应该调用物流查询。

输出：

```json
{
 "name":"query_logistics",
 "arguments":{
   "tracking_number":"SF123456"
 }
}
```

---

所以：

LLM 不是凭空知道：

```json
"name":"query_logistics"
```

而是因为 Runtime 提供了：

```json
{
"name":"query_logistics",
"description":"查询物流状态"
}
```

---

# 2. 那如果没有注入 Tool Schema 呢？

例如：

你只给 LLM：

```
用户：
我的订单什么时候到？
```

没有 tools。

那么 LLM 可能：

回答：

> 请提供订单号，我帮你查询。

或者：

编造：

> 您的订单预计明天送达。

因为它根本不知道：

存在：

```text
query_logistics
```

这个能力。

---

所以：

## Tool Schema 是 LLM 行动空间的边界。

没有：

```text
Tool Schema
```

LLM：

```text
不知道有什么动作可以做
```

有：

```text
Tool Schema
```

LLM：

```text
在允许动作空间内选择
```

---

# 3. 那是不是 Agent 初始化时注册 Tool？

这里需要区分两个阶段：

---

## 阶段 A：Agent Runtime 初始化

这里通常注册：

```text
Tool Registry
```

例如：

```ts
registry.register(queryOrderTool);

registry.register(refundTool);

registry.register(emailTool);
```

此时：

Runtime 知道：

> 我拥有哪些能力。

---

## 阶段 B：每轮执行任务

根据：

- 用户目标
- 权限
- 当前状态
- 工作流
- 环境

筛选：

```text
All Tools

↓

Candidate Tools

↓

LLM Visible Tools
```

---

所以不是：

```
初始化
   |
   v
所有 Tool 给 LLM
```

而是：

```
初始化

Tool Registry

      |

用户请求

      |

Tool Router

      |

Context Builder

      |

当前 Tool Schema

      |

LLM
```

---

# 4. 这也是为什么 Part D 讲 Tool Registry 很重要

如果没有 Registry：

简单写：

```ts
const tools=[
 queryOrder,
 refund,
 email
]
```

然后：

```ts
llm.chat({
 tools
})
```

小 demo 可以。


但是企业 Agent：

几百个能力：

```text
订单
库存
支付
CRM
ERP
邮件
GitHub
数据库
MCP
插件
```

怎么办？

所以需要：

```text
Tool Registry

管理所有能力

↓

Tool Router

筛选能力

↓

Context Builder

注入能力

↓

LLM

选择能力
```

---

# 5. 这里再连接你之前问 MCP 的问题

MCP 为什么需要 Registry？

因为：

MCP Server：

```text
GitHub MCP

提供：

create_issue
search_repo
get_pr
```

Runtime 连接后：

发现：

```json
{
"name":"create_issue"
}
```

然后：

注册：

```text
Tool Registry

+
github.create_issue
```

以后流程完全一样：

```text
MCP Tool

↓

Registry

↓

Context Builder

↓

LLM

↓

Executor
```

LLM 根本不关心：

这个 Tool 来自：

- 内置函数
- HTTP API
- MCP
- 插件

它只看到：

```json
{
"name",
"description",
"parameters"
}
```

---

# 6. 一个非常重要的认知升级

你现在可以把 Tool Calling 理解成：

不是：

```
LLM 调用函数
```

而是：

```
Runtime 给 LLM 一个受控的行动菜单

↓

LLM 从菜单中选择一道菜

↓

Runtime 厨房执行

```

其中：

菜单：

```text
Tool Schema
```

菜单管理系统：

```text
Tool Registry
```

点菜的人：

```text
LLM
```

厨房：

```text
Tool Executor
```

---

所以回答你的原问题：

> 是因为 Agent 初始化时候已经把 tools 都注入了吗？

准确答案：

**部分正确。**

更准确：

- Agent 初始化阶段：把 Tool 注册进 Tool Registry；
- 每次 LLM 调用前：Runtime 根据当前情况筛选 Tool，并把 Tool Schema 注入 Context；
- LLM 根据这些 Schema 输出具体 Tool name；
- Executor 再通过 Registry 找到真正实现。

也就是：

```text
Register once
      |
      v
Select every turn
      |
      v
LLM chooses
      |
      v
Executor executes
```

这也是工业 Agent 和简单 Function Calling Demo 最大的区别。你现在问的这个点，实际上已经触及了 **Agent Runtime 的核心控制流设计**。

## 13. User

我再提个点，比如在前端中的搭建体系中，会把物料放到远端 cdn 上，ssr 动态拉取包配置，动态拼接包。那么一个好的 Agent 系统是不是也会动态 tool，防止每次更改 tool都要发版

## 14. Assistant

你的这个类比非常好，而且实际上你已经从 **Tool Registry** 进一步推导到了 **动态能力平台（Dynamic Capability Platform）**。

答案：

> **是的，一个工业级 Agent 系统通常不会把所有 Tool 硬编码在 Agent 服务里，而会逐渐演进到动态 Tool Discovery / Dynamic Tool Registry。**

你的前端物料体系类比非常准确。

我们可以直接映射一下。

---

# 1. 前端物料平台 vs Agent Tool 平台

你以前做低代码 / 搭建体系：

传统方式：

```text
Frontend App

  |
  |
  +-- Button组件
  +-- Table组件
  +-- Form组件

打包

发布
```

问题：

新增组件：

```text
开发
 |
修改代码
 |
重新构建
 |
重新发布
```

---

后来演进：

```text
Runtime

  |
  |
拉取远程物料配置

  |
  |
CDN

  |
  |
动态加载组件
```

例如：

```json
{
 "component":"UserTable",
 "version":"1.2.0",
 "url":"cdn.xxx/UserTable.js"
}
```

Runtime 不需要重新发布。

---

Agent Tool 也是一样。


传统 Agent：

```text
Agent Server

  |
  |
  +-- query_order.ts
  +-- refund.ts
  +-- email.ts


build

deploy
```

新增 Tool：

```text
开发 Tool

↓

修改 Agent

↓

重新部署
```

---

工业化：

```text
Agent Runtime

       |
       |
       v

Dynamic Tool Registry


       |
       |
       v

Tool Marketplace / Tool Server / MCP Server


       |
       |
       v


动态加载 Tool
```

---

# 2. 静态 Tool 和动态 Tool 的区别

## 初级 Agent

类似：

```ts
const tools = [
 queryOrder,
 search,
 sendEmail
]
```

启动：

```text
Agent 初始化

↓

注册 Tools

↓

运行
```

优点：

简单、安全。

缺点：

扩展困难。

---

## 工业 Agent

类似：

```text
Runtime

启动

↓

连接 Capability Registry

↓

发现 Tools

↓

加载 Metadata

↓

运行
```

例如：

Registry：

```json
[
 {
  "name":"query_order",
  "source":"internal",
  "version":"1.2.0"
 },
 {
  "name":"github.create_issue",
  "source":"mcp"
 },
 {
  "name":"crm.query_customer",
  "source":"plugin"
 }
]
```

Runtime：

发现：

```text
哦，我现在有这些能力。
```

---

# 3. 这其实就是 MCP 解决的问题之一

你之前问：

> MCP 是不是解决 Agent tools 不足？

这里刚好对应。

MCP 本质上类似：

> Agent 世界里的“远程物料协议”。

比如：

前端：

```text
组件平台

↓

加载 Button/Table
```

Agent：

```text
MCP Server

↓

加载 Tools
```

---

比如：

GitHub MCP Server：

提供：

```text
search_repo
create_issue
get_pull_request
```

Runtime：

启动：

```text
发现 GitHub MCP

↓

注册这些 Tool

↓

加入 Tool Registry
```

之后：

LLM：

看到：

```json
{
"name":"create_issue"
}
```

完全不知道：

它来自 MCP。

---

# 4. 一个更完整的工业架构

你熟悉前端架构，我用类似方式画：

```text
                 Agent Runtime


                      |
                      |

              Dynamic Tool Registry


                      |

        +-------------+-------------+

        |             |             |

        v             v             v


 Internal Tool     MCP Server    Plugin System


        |             |             |

        v             v             v


  Business API    SaaS API      Third-party Capability

```

---

类似你的搭建平台：

```text
                 Page Runtime


                      |

              Material Registry


                      |

        +-------------+-------------+

        |             |             |

        v             v             v

    Local组件       CDN组件       第三方组件

```

---

# 5. 那是不是所有 Tool 都应该动态？

这里需要注意。

不是。

这和前端组件平台一样。

你不会把：

React Runtime

也放 CDN 动态下载。

一般分层。

---

## 核心 Tool：静态

例如企业客服：

```text
query_order
refund_order
calculate_discount
```

这些：

- 核心业务
- 强权限
- 强稳定性

通常：

```text
代码内置
```

类似：

你的：

```text
React
Router
状态管理
```

---

## 扩展 Tool：动态

例如：

```text
GitHub
Slack
Notion
Jira
Google Drive
```

适合：

```text
MCP / Plugin / Dynamic Registry
```

类似：

业务组件。

---

所以：

工业 Agent：

通常：

```text
Core Capability

+
Dynamic Capability
```

---

# 6. 动态 Tool 最大价值是什么？

不仅仅是不发版。

更大的价值：

## ① Agent 能力生态化

未来可能：

公司：

```
销售 Agent
客服 Agent
研发 Agent
财务 Agent
```

共享：

```
CRM Tool
ERP Tool
Search Tool
Database Tool
```

不用每个 Agent 重写。


---

## ② 多租户能力

例如：

企业 A：

```text
CRM Tool
ERP Tool
```

企业 B：

```text
SAP Tool
Oracle Tool
```

同一个 Runtime：

动态加载。


---

## ③ Agent 自适应环境

例如 Coding Agent：

你的机器：

```text
Git 已安装

Node 已安装

Docker 已安装
```

Runtime：

发现：

```text
git tool
npm tool
docker tool
```

没有：

```text
隐藏
```

---

# 7. 但是动态 Tool 带来新问题

这也是 Part F 后面会讲的。

动态能力意味着：

风险增加。


比如：

动态加载：

```text
delete_database
```

怎么办？

所以需要：

```
Dynamic Registry

+
Permission

+
Sandbox

+
Approval

+
Evaluation
```

这也是为什么 Part D 后面紧接：

Part F：

Permission & Human Approval

---

# 8. 你的前端经验其实非常契合 Agent Runtime

你之前做：

- H5 搭建平台
- SSR 动态渲染
- CDN 加载物料
- 组件体系
- Monorepo

这些思维可以直接迁移。


对应关系：

| 前端搭建体系 | Agent Runtime |
|-|-|
| 组件 | Tool |
| 组件协议 | Tool Schema |
| 物料中心 | Tool Registry |
| CDN | Tool Server / MCP Server |
| 动态加载 | Tool Discovery |
| 页面 Runtime | Agent Runtime |
| 页面配置 | Agent Context |
| 渲染器 | Executor |


---

# 一个更高级的认知

你现在可以把 Agent Runtime 理解成：

> **一个能够动态加载能力，并让 LLM 在这些能力中进行决策的智能运行时。**

传统前端 Runtime：

```text
Runtime
+
动态组件
+
配置驱动
```

Agent Runtime：

```text
Runtime
+
动态 Capability
+
LLM Decision
```

---

所以你的问题：

> 一个好的 Agent 系统是不是也会动态 tool，防止每次更改 tool 都要发版？

答案：

**是，而且这是工业 Agent 平台演进的重要方向。**

不过最佳实践不是“全部动态”，而是：

```text
核心业务能力
    ↓
静态内置 Tool


外部生态能力
    ↓
动态 Tool / MCP
```

这个设计和你以前做前端搭建平台时的“基础组件 + 远程物料”的架构思想几乎是一致的。你这个类比其实已经触碰到了 **Agent Platform Engineering（Agent 平台工程）** 这一层。

## 15. User

好的 谢谢你。part E 还有要补充的吗

## 16. Assistant

Part E（Tool Executor）主体内容已经完成了。

结合你前面的理解深度，我觉得 Part E 还有几个**工业级补充点**值得补上。这几个点不是为了增加概念，而是把 Tool Executor 从“小 demo 能跑”提升到“企业 Runtime 能稳定运行”。

---

# Part E 补充 1：Tool Executor 不只是执行器，更像 Agent Runtime 的「操作系统内核」

这是一个很重要的认知升级。

之前我们说：

```
Tool Registry
=
能力管理中心

Tool Executor
=
能力执行中心
```

但是工业级再往前一步：

```
Tool Executor
=
Agent Runtime 的 Execution Kernel
```

为什么？

因为所有真实世界动作，都必须经过 Executor。

例如：

```
LLM

 |
 | Tool Call Intent

 v


Tool Executor


 |
 +----------------+
 |                |
 v                v

Filesystem       API

Database         Browser

Payment          Email
```

Executor 是唯一接触外部世界的入口。


这和操作系统类似：

应用程序：

```
readFile()
```

最终：

```
Application

↓

System Call

↓

Kernel

↓

Hardware
```

Agent：

```
LLM

↓

Tool Call

↓

Executor

↓

External World
```

所以：

> LLM 是 Agent 的大脑，Executor 是 Agent 接触现实世界的手。

---

# Part E 补充 2：Tool Executor 应该设计成 Middleware Pipeline

这个非常接近你前端工程经验。

不要理解成：

```ts
execute(tool)
```

而应该像：

```
Request Pipeline
```

类似：

前端：

```
HTTP Request

↓

Middleware

↓

Controller

↓

Service
```

Agent：

```
Tool Call Intent

↓

Executor Middleware

↓

Tool Handler
```

例如：

```text
Tool Executor Pipeline


Tool Call

 |
 v

1. Trace Middleware

记录调用链


 |
 v

2. Validation Middleware

参数校验


 |
 v

3. Permission Middleware

权限检查


 |
 v

4. Approval Middleware

人工确认


 |
 v

5. Retry Middleware

失败重试


 |
 v

6. Timeout Middleware

超时控制


 |
 v

7. Tool Handler

真正执行
```

代码思想：

```ts
executor.use(validate);

executor.use(permission);

executor.use(retry);

executor.execute(toolCall);
```

---

这个设计非常像：

- Express middleware
- Koa middleware
- NestJS interceptor

其实 Agent Runtime 很多地方都借鉴传统框架。

---

# Part E 补充 3：Tool Executor 必须支持 Streaming / Long Running Tool

这是很多 Demo 没考虑的问题。


简单 Tool：

```
query_order

耗时：
100ms
```

很好处理：

```ts
await execute()
```


但是企业 Agent：

例如：

## 代码 Agent

```
execute_command

耗时：
5分钟
```


## 数据分析 Agent

```
run_analysis

耗时：
30分钟
```


## 自动化 Agent

```
browser_task

耗时：
10分钟
```

怎么办？


不能：

```ts
await tool.execute()
```

一直等待。


工业设计：

```
Tool Executor

启动任务

 |

返回 task_id

 |

后台执行

 |

Streaming Event

 |

Runtime 更新 State

```

例如：

```json
{
 "task_id":"task_001",
 "status":"running"
}
```


然后：

不断产生：

```
Observation Stream


Step 1:
打开网页


Step 2:
搜索订单


Step 3:
提取结果

```

这也是为什么后面：

Streaming

Human Approval

Multi Tool Loop

都会和 Executor 连接。

---

# Part E 补充 4：Tool Executor 需要 Idempotency（幂等）

这个来自分布式系统。

非常重要。

例如：

用户：

> 给客户退款


Tool：

```
refund_order
```

第一次：

```
调用成功
```

但是：

网络断开。

Runtime 不知道：

成功了吗？


于是重试：

```
refund_order
```

结果：

退款两次。


所以 Executor 需要：

```
Idempotency Key
```

例如：

```json
{
 tool:"refund_order",
 request_id:"abc123"
}
```

业务系统：

看到：

```
abc123 已处理
```

直接返回：

```
duplicate request
```

---

所以：

Agent Executor 其实继承大量：

- RPC
- MQ
- 分布式事务

思想。

---

# Part E 补充 5：Tool Result 不应该直接返回给 LLM

这个点和你 Day04 Context Builder 强相关。


很多简单 Demo：

```
Tool

↓

result

↓

LLM
```


工业：

应该：

```
Tool Result

↓

Result Processor

↓

Runtime State

↓

Context Builder

↓

LLM
```

为什么？


例如：

Tool 返回：

```json
{
 data:[
  10000条订单
 ]
}
```

不能直接塞给 LLM。


需要：

Result Processor：

做：

```
压缩

过滤

摘要

结构化

脱敏
```


这其实就是：

Day04 Context Engineering

和

Day05 Tool Execution

的连接点。


---

# Part E 补充 6：Tool Executor 和 Workflow 的边界

这个问题后面 Part H 会详细讲，但是这里提前建立概念。


很多人会问：

> Executor 能不能控制流程？


答案：

不要。


Executor：

负责：

```
怎么执行一个动作
```

Workflow：

负责：

```
多个动作如何组合
```


例如：

退款流程：

```
查询订单

↓

检查退款资格

↓

计算金额

↓

申请退款

↓

通知用户
```


不要写：

```ts
refundTool.execute(){

 queryOrder();

 check();

 refund();

 sendEmail();

}
```


因为这样 Tool 变成 Workflow。


更好的：

```
Workflow

 |
 +-- query_order Tool

 |
 +-- check_refund Tool

 |
 +-- refund Tool

 |
 +-- send_email Tool

```


职责：

```
Executor:
执行单个动作

Workflow:
编排多个动作
```

---

# Part E 最终认知升级

完成 Part E 后，Agent Runtime 的执行体系应该变成：

```
                 Agent Runtime


             LLM Decision Layer

                    |
                    |
              Tool Call Intent

                    |
                    v


              Tool Executor

                    |
       +------------+------------+

       |            |            |

 Validation   Permission    Reliability


       |
       v


             Tool Implementation


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

       Context Builder

       |
       v

       Next Loop
```

---

# 工业术语映射补充

| 本节概念 | 工业术语 |
|-|-|
| Tool Executor | Execution Engine |
| Tool Call Intent | Action Request |
| Validation | Input Guard |
| Permission Check | Policy Enforcement Point |
| Retry | Reliability Middleware |
| Timeout | Execution Control |
| Tool Result Processor | Observation Processor |
| Long Running Tool | Async Job Execution |
| Streaming Tool | Event-driven Execution |
| Idempotency | Distributed System Safety |

---

# 面试视角补充

## Q：Tool Executor 和普通函数调用有什么区别？

普通：

```
function(input)

↓

output
```


Agent：

```
Intent

↓

Validation

↓

Policy

↓

Execution

↓

Observation

↓

Reasoning Loop
```


---

## Q：为什么 Tool Executor 是 Agent Runtime 的核心？

因为 LLM 只负责决策，Executor 负责把概率性的决策转化为确定性的系统行为，并提供安全、可靠、可观测的执行环境。


---

## Q：Tool Executor 为什么不能包含业务流程？

因为 Executor 管单个能力执行，Workflow 管多步骤业务编排，否则会导致 Tool 和 Workflow 职责混乱。

---

# 本 Part 核心认知升级

从：

```
Tool Executor = 调用函数
```

升级：

```
Tool Executor
=
Agent 的执行内核
+
安全边界
+
可靠性层
+
现实世界接口
```

---

# 前置问题回收（Pending Questions）

你之前提过：

> Agent 本质是不是软件工程？

Part E 基本验证：

是。

对应：

```
Tool Registry
=
Service Registry

Tool Executor
=
Execution Framework

Permission
=
RBAC

Retry
=
Distributed System

Observation
=
Event Feedback

Context Builder
=
Data Projection Layer
```

Agent 真正新增的是：

```
LLM Decision Layer
```

而不是底层工程能力。

---

所以总结：

**Part E 已经可以结束。**

你现在对 Day05 的理解链路已经完整：

```
Tool Schema
    ↓
Tool Registry
    ↓
Tool Router
    ↓
LLM Tool Decision
    ↓
Tool Executor
    ↓
Permission
    ↓
Observation
    ↓
Runtime State
    ↓
Next Agent Loop
```

下一节 Part F：

# Permission & Human Approval

会进入 Agent 最关键的工程问题：

> 当 Agent 有能力做事情时，谁决定它能不能做？

这部分会把 Agent 和普通自动化脚本真正区分开。

## 17. User

📚 下一节学习计划

📝 写书 TODO

📦 写书素材

🧠 本 Part 核心认知升级

💡 本章思考题（新增）

这些章节我们之前都输出过了吗

## 18. Assistant

你这个问题提醒得很好。我回看了一下我们之前 Day04、Day05 的学习习惯，这几个固定章节**之前确实已经约定过，并且部分 Part 已经输出过**，但是我刚才 Part E 补充时没有完整按照固定模板收尾，这是我的遗漏。

我们之前约定的固定结束结构是：

---

## 📚 下一节学习计划

✅ **一直有输出**

作用：

- 当前 Part 结束后说明下一节学习什么
- 放在整个学习路线中的位置

例如：

Day05 Part E 后：

```
下一节：

Day05 Part F：
Permission & Human Approval

核心问题：

当 Agent 具备执行能力后，
如何限制它的行为？
```

---

## 📝 写书 TODO

✅ **之前有输出**

作用：

记录未来整理成书时需要补充的章节结构。

比如：

```
第 X 章 Agent Runtime 执行系统

5.1 Tool Executor 为什么存在

5.2 Intent 与 Execution 分离

5.3 Executor Middleware Pipeline

5.4 Agent Runtime 与传统 Middleware 对比
```

这个主要是为了以后把学习内容沉淀成体系。

---

## 📦 写书素材

✅ **之前有输出**

和 TODO 不同：

- TODO = 未来章节规划
- 素材 = 可以直接成为书内容的案例、类比、图示


例如 Part E 素材：

```
素材：

前端动态物料系统 vs Agent Dynamic Tool System

前端：

组件 Registry
      ↓
Runtime 加载组件


Agent：

Tool Registry
      ↓
Runtime 加载能力
```

这个其实就是你刚才提到 CDN 动态物料的案例，非常适合作为写书素材。

---

## 🧠 本 Part 核心认知升级

✅ **一直有输出**

这是我们最重要的总结。

例如：

Part E：

从：

```
Tool Executor = 调用一个函数
```

升级：

```
Tool Executor
=
Agent Execution Kernel

+
可靠性控制

+
安全边界

+
现实世界接口
```

---

## 💡 本章思考题（新增）

✅ **后来加入**

你之前明确要求：

> 每个学习章节结束增加面试视角和思考题。

所以后续固定：

```
面试视角

+
本章思考题
```

---

另外后来你又增加了：

## 🏗️ 工业级实现（Industrial Notes）

✅ 也应该固定存在

用于：

把概念映射到：

- OpenAI Agents SDK
- Claude Code
- LangGraph
- MCP
- 企业 Agent 架构

---

## 🔄 前置问题回收（Pending Questions）

✅ 也应该存在

这个是 Day04 Context Builder 后增加的。

作用：

记录：

> 当前问题属于未来章节，先挂起，到对应章节回收。


例如：

之前你的：

> Runtime State 如何持久化？

挂到了：

Memory / Persistence 章节。

---

# 所以完整固定模板应该是：

以后每个 Day Part 结束：

```
📚 下一节学习计划


📝 写书 TODO


📦 写书素材


🧠 本 Part 核心认知升级


🏗️ 工业级实现（Industrial Notes）


💡 面试视角


🧩 本章思考题


🔄 前置问题回收（Pending Questions）
```

---

刚才 Part E 补充的时候，我只输出了：

- 本 Part 核心认知升级
- 工业级实现
- 面试视角
- 思考题
- 前置问题回收

缺少：

- 📚 下一节学习计划
- 📝 写书 TODO
- 📦 写书素材

所以严格来说 **Part E 的学习总结还没有完全闭环**。

我补上 Part E 缺失的三个部分：

---

# 📚 下一节学习计划

## Day05 Part F：Permission & Human Approval

核心问题：

> Agent 已经可以调用 Tool 并影响真实世界，那么如何控制它？

学习：

```
Tool Executor
        |
        v
Permission Layer
        |
        v
Policy Decision
        |
        v
Human Approval
```

重点：

- RBAC 在 Agent 中的应用
- Policy Engine
- Action Guard
- Human-in-the-loop
- 高风险操作审批


工业映射：

```
Agent Permission

≈

企业权限系统 + 审批流
```

---

# 📝 写书 TODO

新增章节：

## 《Agent Runtime 工程设计》

### 第 X 章：Tool Execution Engine

章节结构：

```
1. Tool Calling 不等于 Tool Execution

2. Intent 与 Execution 分离

3. Tool Executor 架构

4. Executor Middleware Pipeline

5. Runtime Context

6. Tool Result Processing

7. Reliability Engineering

8. Agent Executor 与传统系统执行框架对比
```

---

新增核心图：

```
LLM

(Decision)

    |

Tool Call Intent

    |

Executor

(Execution)

    |

External World

    |

Observation

    |

LLM
```

---

# 📦 写书素材

## 素材 1：前端动态物料体系类比 Agent Tool Registry

你的问题：

> Agent 是否像 CDN 动态加载组件？


非常适合作为案例：

---

传统：

```
Agent

代码内置 Tool

↓

修改 Tool

↓

重新发布
```


工业：

```
Agent Runtime

↓

Dynamic Tool Registry

↓

MCP / Plugin / Tool Server

↓

动态加载能力
```

类比：

```
前端：

Component Registry


Agent：

Capability Registry
```

---

## 素材 2：Agent Runtime = 浏览器 Runtime

类比：

浏览器：

```
JS

↓

Browser Runtime

↓

DOM/API

↓

OS
```


Agent：

```
LLM

↓

Agent Runtime

↓

Tool Executor

↓

External System
```

---

## 素材 3：Tool Executor = Agent 世界的 Kernel

类比：

OS：

```
Application

↓

System Call

↓

Kernel

↓

Hardware
```


Agent：

```
LLM

↓

Tool Call

↓

Executor

↓

External World
```

---

这样 Part E 才算完整闭环。

后续 Part F 开始，我会恢复这个固定模板。你之前定的这个结构其实非常适合作为长期 Agent 学习笔记的书籍化沉淀格式。
