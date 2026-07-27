# Day05 Part C ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a66c34d-978c-83ee-a516-2fc9abb9446f
- 会话标题：Day05 PartC Tool Schema
- 抽取时间：2026-07-27

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part C 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05 part B 的学习笔记，你看一下。然后我们开始 part c 的学习

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Assistant

我已经看完你上传的 **Day05 Part B：Tool Decision Layer** 学习笔记，以及 README 中 Day05 的整体规划。fileciteturn0file0 fileciteturn0file1

先做一个学习衔接确认，然后我们进入 **Day05 Part C：Tool Schema Design**。

---

# Day05 Part B 回顾：我们已经完成了什么

Day05 Part A 解决：

> Tool Calling 是什么？

建立模型：

```text
LLM
 |
 | Tool Call Intent
 v
Runtime
 |
 | Execute
 v
Tool
 |
 | Observation
 v
Runtime State
```

也就是：

> LLM 不执行工具，Runtime 执行工具。

---

Day05 Part B 进一步往前推了一层：

> 为什么 LLM 会决定调用 Tool？

核心升级：

从：

```
用户问题
  |
  v
调用函数
```

升级为：

```
User Goal
    |
    v
Context
    |
    v
LLM Decision
    |
    v
Action Selection
    |
    v
Tool Call Intent
```

也就是：

> Tool Decision 本质不是函数匹配，而是 Goal-driven Action Selection。fileciteturn0file1

---

这里其实和我们前面 Day04 的 Context Engineering 完成了一个闭环：

Day04：

```
Runtime 如何让 LLM 更好思考？
```

答案：

```
Context Engineering
```

---

Day05：

```
Runtime 如何让 LLM 行动？
```

答案：

```
Tool Calling
```

---

而 Part B 处于：

```
Context
  |
  v
Thinking
  |
  v
Action Decision
  |
  v
Tool
```

中间这个位置：

```
        Runtime Brain

Context Builder
       |
       v
     LLM
       |
       v
 Tool Decision
       |
       v
 Tool Calling
```

---

# 进入 Day05 Part C

## Day05 Part C：Tool Schema Design

这一节会进入 Tool Calling 里非常核心的一层。

README 里规划：

> Day05 Part C：Tool Schema 设计  
> 重点回答：
>
> 1. Tool Schema 为什么是 Agent 的 API Contract
> 2. name / description / parameters 如何设计
> 3. 为什么一个万能 Tool 是坏设计
> 4. 为什么 Claude Code 要拆分大量小 Tool
> 5. Tool Schema 如何影响 Agent 行为
> 6. 如何设计工业级 Tool

fileciteturn0file0

---

# Part C 的核心问题

我们已经知道：

```
LLM 可以决定调用 Tool
```

但是出现一个新问题：

---

假设我们给 LLM 一个 Tool：

```json
{
  "name": "execute",
  "description": "执行一个操作",
  "parameters": {
    "input": "string"
  }
}
```

然后告诉它：

你可以操作电脑。

问题：

LLM 能知道：

- 什么时候调用？
- 参数怎么填？
- 是否安全？
- 这个工具适合什么任务？

答案：

很难。

---

所以 Agent 进入下一层：

> Tool 怎么描述，决定 LLM 能不能正确使用。

这就是：

```
Tool Schema Engineering
```

---

# Part C 学习路线

我会按照我们之前 Agent Runtime 学习方式拆：

---

# Part C-1：Tool Schema 到底是什么？

先建立概念。

很多人理解：

```
Tool Schema = API 文档
```

但是 Agent 场景下不够准确。

更准确：

> Tool Schema 是 Runtime 提供给 LLM 的能力描述协议。

也就是：

```
Runtime Capability
        |
        v
   Tool Schema
        |
        v
       LLM
```

它连接：

```
Runtime 世界
       |
       |
       v
LLM 理解世界
```

所以它其实是：

```
Agent Action Interface
```

---

# Part C-2：为什么 Tool Schema 是 Agent 的 API Contract？

传统开发：

前端：

```ts
fetch('/api/order')
```

后端：

```ts
interface QueryOrder {
  orderId:string
}
```

双方靠 API Contract 协作。


Agent 也是一样：

但是调用方变成：

```
Human Developer
        |
        v
       API
```

变成：

```
LLM
 |
 v
Tool Schema
 |
 v
Runtime Executor
```

所以：

```
Tool Schema
=
LLM 与 Runtime 的 API Contract
```

---

# Part C-3：Tool Schema 三个核心字段

一个 Tool：

```json
{
  "name": "",
  "description": "",
  "parameters": {}
}
```

三个字段分别承担不同职责。

---

## 1. name

例如：

```json
"name": "search_file"
```

作用：

告诉模型：

> 这个能力叫什么。

但是注意：

name 不只是名字。

它影响：

```
Token Pattern
+
语义提示
+
调用倾向
```

比如：

不好：

```json
{
"name":"tool1"
}
```

模型不知道是什么。


更好：

```json
{
"name":"search_workspace_files"
}
```

模型天然获得：

```
search
workspace
files
```

这些语义。

---

## 2. description

这是最重要字段。


例如：

差：

```json
{
"description":"读取文件"
}
```

问题：

读取什么？

什么时候用？

限制是什么？

---

好：

```json
{
"description":
"Read a file from current workspace when you need source code, configuration, or document content."
}
```

模型知道：

适用场景：

```
需要源码
需要配置
需要文档
```

不适用：

```
搜索文件
修改文件
执行代码
```

---

所以：

description 本质：

不是介绍工具。

而是在教模型：

```
什么时候应该选择我
```

---

## 3. parameters

参数设计影响：

```
Tool Call Accuracy
```

例如：

坏设计：

```json
{
 "query":"string"
}
```

模型：

```
query?
填什么？
```

---

更好：

```json
{
 "file_path":{
   "type":"string",
   "description":
   "Relative path of the file inside workspace"
 }
}
```

模型知道：

```
需要相对路径
不是 URL
不是文件名
```

---

# Part C 一个核心认知升级

这里会出现一个非常重要的点：

## Tool Schema 不是写给开发者看的

普通 API：

```
Human Developer
        |
        v
API Documentation
```

Agent Tool：

```
LLM
 |
 v
Tool Schema
```

所以优化目标不同：

API 文档：

```
让程序员理解
```

Tool Schema：

```
让模型正确决策
```

---

这也是为什么：

一个优秀工程师写 API：

关注：

- REST
- 参数
- 返回值


一个 Agent 工程师写 Tool：

还要关注：

- 模型是否理解
- 是否容易误调用
- 是否容易滥用
- 是否边界清晰

---

# Part C 后续重点

接下来 Part C 我们会继续深入：

### 1. 为什么 Tool Description 是 Prompt Engineering 的延伸？

### 2. 为什么 Claude Code 不设计：

```text
execute_anything()
```

而设计：

```
ReadFile
Search
EditFile
RunCommand
GitDiff
```

### 3. Tool 粒度如何设计？

太大：

```
万能 Tool
```

问题：

- 决策困难
- 参数复杂
- 风险高


太小：

```
1000 个 Tool
```

问题：

- Action Space 爆炸
- 选择困难


### 4. 工业级 Tool Schema 怎么设计？

最终会落到：

```
Capability Design
+
Boundary Design
+
Safety Design
```

---

# 今天 Part C 的目标

完成后，你应该能回答：

> 为什么 Agent 的能力提升，不只是换更大的模型，而是设计更好的 Tool Schema？


以及：

> Claude Code 为什么看起来像高级工程师，很大原因不是它会调用工具，而是它拥有一套非常适合代码任务的 Tool Schema。

---

下一步我们正式开始：

# Day05 Part C-1：Tool Schema 基础模型

主题：

> Tool Schema：LLM 与 Runtime 之间的行动契约（Action Contract）

开始。

## 7. User

继续学习

## 8. Assistant

# Day05 Part C-1：Tool Schema 基础模型

## Tool Schema：LLM 与 Runtime 之间的行动契约（Action Contract）

---

我们从 Part B 的最后一个认知继续：

Part B：

> Tool Decision 的核心是 Action Selection。

也就是：

```text
Goal
 |
 v
LLM Decision
 |
 v
选择 Action
 |
 v
Tool Call Intent
```

但是这里马上产生一个问题：

---

如果 LLM 要选择 Action，它怎么知道：

- 有哪些 Action？
- 每个 Action 能干什么？
- 什么情况下应该使用？
- 参数应该怎么填写？

答案：

> Runtime 通过 Tool Schema 向 LLM 描述可用能力。

所以：

```text
Runtime
  |
  | Tool Schema
  v
LLM
```

---

# 1. Tool Schema 是什么？

先看一个最简单的 Tool。

例如：

查询天气：

```json
{
  "name": "get_weather",
  "description": "Get current weather information for a city",
  "parameters": {
    "city": {
      "type": "string",
      "description": "The city name"
    }
  }
}
```

很多初学者看到这里会认为：

> 这不就是 API 定义吗？

但是 Agent 场景中，它的定位不同。

---

传统 API：

```text
Developer
    |
    v
API Contract
    |
    v
Backend
```

调用者是：

```text
人
```

---

Agent Tool：

```text
LLM
 |
 v
Tool Schema
 |
 v
Runtime Executor
```

调用者变成：

```text
模型
```

所以 Tool Schema 的真正作用：

> 让模型理解 Runtime 当前开放了哪些行动能力。

---

因此：

```text
Tool Schema
=
Agent Action Interface
```

---

# 2. Tool Schema 在 Agent Runtime 中的位置

结合 Day04 的 Context Builder：

现在完整链路：

```text
                 Runtime State
                      |
                      v
               Context Builder
                      |
                      |
                      v
              +---------------+
              | LLM Context   |
              +---------------+
                      |
                      |
          +-----------+-----------+
          |                       |
          v                       v
     User Context          Tool Schema
                                  |
                                  |
                                  v
                               LLM
                                  |
                                  v
                           Tool Decision
```

注意一个关键点：

Tool Schema 实际上也是 Context 的一部分。

---

这和 Day04 的核心思想完全一致：

Day04：

> Context 决定 LLM 看什么。

现在：

> Tool Schema 决定 LLM 能做什么。

---

所以：

```text
Context Engineering
        +
Tool Schema Engineering
        =
Agent Behavior Engineering
```

---

# 3. 为什么 Tool Schema 会影响 Agent 行为？

我们看一个例子。

---

## 情况 A：一个模糊 Tool

```json
{
  "name": "search",
  "description": "Search something"
}
```

用户：

> 帮我找一下项目里面用户登录相关代码


LLM 看到：

```
search
```

它不知道：

- 搜索什么？
- 搜索哪里？
- 搜索代码？
- 搜索网络？
- 搜索数据库？

于是可能：

```json
{
 "tool":"search",
 "query":"login"
}
```

但是 Runtime 不知道怎么执行。

---

## 情况 B：明确 Tool

```json
{
  "name": "search_workspace_code",
  "description":
  "Search source code files inside current workspace. 
   Use this when you need to locate functions, classes,
   variables, or implementation details.",
  "parameters":{
     "query":{
       "type":"string",
       "description":
       "Keyword or pattern to search in source files"
     }
  }
}
```

现在模型理解：

这个工具：

范围：

```
workspace
```

对象：

```
source code
```

用途：

```
寻找实现
```

于是：

```json
{
 "tool":"search_workspace_code",
 "query":"login"
}
```

成功率明显提高。

---

所以：

Tool Schema 实际影响：

```
Tool Selection
Parameter Generation
Call Frequency
Error Rate
Safety Boundary
```

---

# 4. Tool Schema 的三个核心组成

工业 Tool Schema 基本包含：

```text
Tool
 |
 +-- name
 |
 +-- description
 |
 +-- parameters
```

---

## 4.1 name：能力名称

例如：

```json
"name":"read_file"
```

它告诉模型：

> 我有什么能力。

---

但是 name 不只是 ID。

它也是：

```text
Semantic Hint
```

语义提示。

---

比较：

### 差：

```json
{
"name":"tool_a"
}
```

模型：

```
tool_a?
不知道。
```

---

### 好：

```json
{
"name":"read_workspace_file"
}
```

模型：

拆解：

```
read
workspace
file
```

自然理解：

```
读取工作区文件
```

---

所以 name 设计原则：

## 动词 + 对象

推荐：

```
read_file

search_code

query_order

create_ticket

send_email
```

不要：

```
file1

api2

handler
```

---

# 5. description：真正决定模型行为的地方

很多 Agent 项目失败，其实失败在这里。

开发者认为：

```json
"description":
"查询订单"
```

已经够了。

但是对于模型：

信息不足。

---

模型需要知道：

## 什么时候使用？

例如：

```json
"description":
"Query user's order status from the order system.
Use this tool when the user asks about shipment,
delivery status, or order information."
```

模型得到：

适用：

```
订单
物流
配送
```

---

## 什么时候不要使用？

更高级：

```json
"description":
"Do not use this tool for general product questions
or historical order analysis."
```

这其实是在做：

```
Behavior Constraint
```

---

所以 description 不只是说明：

它是在指导：

```
Decision Boundary
```

---

# 6. parameters：决定调用质量

Tool Decision 成功后：

还有一个问题：

参数生成。

例如：

```json
{
"name":"query_order",
"parameters":{
 "order_id":"string"
}
}
```

用户：

> 查询我的订单


问题：

模型不知道：

```
order_id 从哪里来？
```

可能生成：

```json
{
"order_id":"我的订单"
}
```

错误。

---

更好的 Schema：

```json
{
"name":"query_order",
"description":
"Query order status by order ID.",
"parameters":{
 "order_id":{
   "type":"string",
   "description":
   "Unique order identifier provided by user or retrieved from context"
 }
}
}
```

模型知道：

来源：

```
用户输入
或者 Runtime Context
```

---

所以 parameters 设计影响：

```
Argument Accuracy
```

---

# 7. 一个重要认知：Tool Schema 是 Prompt 的一种形式

这是 Part C 非常重要的升级。

很多人认为：

Prompt：

```text
system message
user message
```

Tool Schema：

```json
tools:[]
```

两者无关。


实际上：

Tool Schema 也是 Prompt。

只是它是：

```text
Structured Prompt
```

---

因为它告诉 LLM：

```
你可以做什么
```

例如：

System Prompt:

```
你是一个代码助手。
```

Tool Schema:

```
你拥有：
- read_file
- edit_file
- run_test
```

两者共同塑造行为。

---

所以：

Agent 的行为来源：

不是只有：

```
System Prompt
```

而是：

```
System Prompt
+
Context
+
Memory
+
Tool Schema
+
Runtime Policy
```

---

# 8. 为什么 Claude Code 不设计万能 Tool？

这是 Part C 后面重点。

先提前建立直觉。

假设：

```json
{
"name":"execute_action",
"description":
"Execute any coding related operation"
}
```

看起来很强。

实际上很差。


为什么？

因为 Action Space 太大：

模型面对：

```
execute_action
```

不知道：

```
编辑？
删除？
搜索？
运行？
提交？
安装？
```

---

而 Claude Code 类：

```text
ReadFile

Search

EditFile

RunCommand

GitDiff
```

虽然工具多：

但是每个能力边界清晰。

模型决策：

```
我要看代码
 =>
ReadFile

我要找代码
 =>
Search

我要修改
 =>
EditFile
```

---

这就是：

## Capability Decomposition

能力拆分。

---

# 9. 本节核心认知升级

学习前：

> Tool Schema 是 API 参数定义。

学习后：

> Tool Schema 是 Runtime 暴露给 LLM 的行动空间设计。

更准确：

```text
Tool Schema
=
LLM 与 Runtime 的行动契约
```

它决定：

```text
LLM 能看到什么能力
        |
        v
LLM 如何选择行动
        |
        v
Agent 如何表现
```

---

# 工业术语映射

| 本课程 | 工业术语 |
|-|-|
| Tool Schema | Function Schema / Tool Definition |
| 能力描述 | Capability Description |
| 参数定义 | JSON Schema |
| 行动空间 | Action Space |
| Tool 设计 | Capability Design |
| 工具边界 | Capability Boundary |
| 描述优化 | Tool Prompt Engineering |
| Schema 约束 | Interface Contract |

---

# 面试视角

## Q：为什么 Tool Schema 很重要？

回答：

> Tool Schema 是 LLM 和 Runtime 之间的能力契约。它不仅描述参数，还定义模型可理解的行动空间。好的 Tool Schema 能帮助模型正确选择工具、生成参数，并减少错误调用。


---

## Q：Tool Schema 和 API Schema 有什么区别？

回答：

> API Schema 面向开发者和程序调用，而 Tool Schema 面向 LLM 决策。它除了定义接口，还需要描述什么时候应该调用、什么时候不应该调用，以及能力边界。


---

## Q：为什么 Tool 越多不一定越好？

回答：

> Tool 数量增加会扩大 Action Space。如果工具边界不清晰，模型会面临更大的选择空间，导致 Tool Selection 和参数生成质量下降。因此工业 Agent 更关注能力拆分和边界设计。


---

# 下一节

## Day05 Part C-2：Tool Schema Engineering

下一节深入：

1. Tool 粒度如何设计？
2. 为什么万能 Tool 是反模式？
3. Tool 数量多少合适？
4. Claude Code 为什么拆这么多工具？
5. MCP 为什么强调 Tool Definition？
6. 企业 Agent 如何设计业务 Tool？


这一节会把：

```
Tool Schema
```

从“字段定义”

提升到：

```
Agent Capability Architecture
```

继续进入 Part C-2。

## 9. User

继续学习

## 10. Assistant

# Day05 Part C-2：Tool Schema Engineering

## 从字段设计到 Agent Capability Architecture

上一节我们建立了一个核心认知：

> Tool Schema 不是 API 描述，而是 LLM 与 Runtime 之间的行动契约（Action Contract）。

回顾：

```text
Runtime
   |
   | Tool Schema
   v
LLM

LLM 根据 Schema 理解：
- 我有什么能力？
- 什么情况下使用？
- 参数如何生成？
```

---

但是马上出现一个更大的问题：

如果 Tool Schema 这么重要：

> 那么 Tool 应该怎么设计？

是不是：

```text
Tool 越多越强？
```

答案：

不是。

---

# 1. Tool 设计本质：设计 Agent 的能力边界

我们先回到 Agent 的本质。

传统软件：

能力来自：

```text
Code
```

例如：

```ts
function queryOrder()
function createRefund()
```

---

Agent：

能力来自：

```text
LLM
+
Tools
+
Runtime
```

其中 Tool 定义了：

```text
Agent 可以影响外部世界的范围
```

所以：

设计 Tool，本质是在设计：

```text
Agent Capability Boundary
```

---

例如 Coding Agent：

如果给：

```text
execute_code()
```

一个万能能力。

理论上：

Agent 什么都能做。

但是实际上：

风险巨大。

因为 Runtime 无法知道：

模型想做什么。

---

如果拆：

```text
read_file()

search_code()

edit_file()

run_test()

git_diff()
```

每个能力：

边界明确。

---

所以：

> 好的 Tool 设计，不是给 Agent 最大能力，而是给 Agent 清晰能力。

---

# 2. Tool 粒度设计（Tool Granularity）

这是工业 Agent 非常核心的问题。

Tool 太大：

```text
万能 Tool
```

Tool 太小：

```text
原子操作爆炸
```

需要找到平衡。

---

## 2.1 大粒度 Tool

例如：

```json
{
"name":"operate_computer",
"description":
"Perform any operation on computer"
}
```

看起来很强。

但是模型面对：

```text
operate_computer
```

不知道：

下一步：

```
打开文件？
编辑代码？
执行命令？
截图？
删除文件？
```

Action Space：

巨大。

---

问题：

### 1. Decision Difficulty 增加

LLM 要在一个巨大空间选择：

```text
P(action)
```

变复杂。


---

### 2. 参数复杂

可能设计：

```json
{
operation:"",
target:"",
options:{}
}
```

结果：

参数变成：

```text
万能参数对象
```

模型更难生成。

---

### 3. Runtime 无法控制

例如：

```json
{
operation:"delete"
}
```

危险。


---

所以：

万能 Tool 是典型反模式：

```text
God Tool Pattern
```

类似软件工程里的：

```text
God Class
```

---

# 3. Tool 太小的问题

反过来：

是不是拆越细越好？

例如：

代码 Agent：

设计：

```text
read_character()

read_line()

read_file_header()

read_file_body()

read_file_footer()
```

问题：

Tool 数量爆炸。


---

模型面对：

```text
500 个 Tool
```

需要判断：

```text
哪个最合适？
```

Action Space：

再次爆炸。


---

这叫：

## Tool Selection Overload

工具选择过载。

---

类似：

菜单设计。

餐厅：

10 个菜：

容易选择。

1000 个菜：

反而困难。

---

所以：

Tool 设计目标：

不是：

```text
Maximum Capability
```

而是：

```text
Optimal Capability Surface
```

---

# 4. 工业 Agent 的 Tool 设计原则

通常遵循：

## Principle 1：单一职责

一个 Tool：

解决一个明确问题。

类似：

软件工程：

```text
Single Responsibility Principle
```

---

例如：

好：

```text
query_order_status
```

负责：

```text
查询订单状态
```

不要：

```text
order_operation
```

负责：

```text
查询
修改
取消
退款
```

---

原因：

模型更容易理解：

```text
Goal -> Tool
```

---

# Principle 2：Tool 名称体现动作

推荐：

```text
verb + noun
```

例如：

```text
search_customer

create_ticket

update_profile

send_email
```

不要：

```text
customer_api

handler1

service2
```

---

为什么？

因为 Agent 思考过程：

更接近：

```text
I need to search customer
```

而不是：

```text
I need customer_api
```

---

# Principle 3：Tool 边界匹配业务能力

这是企业 Agent 很重要的一点。

例如：

客服 Agent。

错误设计：

```text
call_database()
```

为什么？

因为数据库不是业务能力。


---

数据库：

技术能力。

业务：

用户需要：

```text
查询订单
申请退款
修改地址
```

所以应该：

```text
query_order()

create_refund()

update_address()
```

---

区别：

技术 Tool：

```text
Database Query
```

业务 Tool：

```text
Business Capability
```

---

企业 Agent 更应该暴露：

```text
Domain Tool
```

而不是：

```text
Infrastructure Tool
```

---

# 5. Claude Code 为什么拆大量 Tool？

这个问题和之前用户讨论 Claude Code 很相关。

很多人看到：

Claude Code：

```text
Read
Search
Edit
Bash
Git
```

觉得：

是不是 Tool 太多？

其实不是。

因为它遵循：

## Capability Decomposition

代码任务天然包含不同能力：

---

## 阅读阶段

需要：

```text
ReadFile
```

目标：

获取信息。


---

## 查找阶段

需要：

```text
Search
```

目标：

定位。


---

## 修改阶段

需要：

```text
EditFile
```

目标：

改变状态。


---

## 验证阶段

需要：

```text
RunCommand
```

目标：

观察结果。


---

## 版本阶段

需要：

```text
GitDiff
```

目标：

确认变化。


---

注意：

这些 Tool 对应的是：

```text
工程师工作动作
```

不是：

```text
API 接口
```

---

所以优秀 Coding Agent 的 Tool Schema：

其实是在模拟：

```text
Senior Engineer Workflow
```

---

# 6. Tool Schema 与 Context Engineering 的关系

这里连接 Day04。

Day04：

我们学习：

Context Builder 决定：

```text
LLM 看到什么
```

---

Day05：

Tool Schema 决定：

```text
LLM 能做什么
```

---

两者组合：

```text
                 Runtime

        +--------------------+
        |                    |
        v                    v

 Context Engineering   Tool Schema Engineering

        |                    |
        v                    v

     LLM Understanding + Action Space

                  |
                  v

              Agent Behavior
```

---

所以 Agent 工程实际上：

不是简单：

```text
Prompt Engineering
```

而是：

```text
Context Engineering
+
Tool Schema Engineering
+
Runtime Engineering
```

---

# 7. Tool Schema 其实是在训练模型的行为边界

这里有一个很重要的认知。

很多人认为：

模型行为：

来自：

```text
模型参数
```

其实 Agent 场景：

行为来自：

```text
Model
+
Context
+
Tools
+
Policy
```

---

举例：

同一个 GPT：

ChatGPT：

工具：

```text
无代码编辑工具
```

表现：

聊天助手。


---

Claude Code：

工具：

```text
Read
Edit
Run
Git
```

表现：

工程师助手。


---

为什么？

不是模型换了。

而是：

Runtime 给它：

```text
不同 Action Space
```

---

所以：

> Tool Schema 是塑造 Agent 身份的重要因素。

---

# 8. MCP 为什么强调 Tool Definition？

提前连接后面的 MCP。

MCP（Model Context Protocol）的核心：

其实就是标准化：

```text
LLM 如何发现外部能力
```

其中重要部分：

就是：

```text
Tool Definition
```

例如：

Server 暴露：

```json
{
"name":"query_customer",
"description":"Query customer information",
"inputSchema":{}
}
```

Client：

把这些能力提供给模型。

---

所以 MCP 本质：

不是：

```text
连接 API
```

而是：

```text
标准化 Agent Capability Discovery
```

---

# 9. mini-agent-runtime 中 Tool Schema 设计

现在回到我们的 mini runtime。

之前：

```ts
interface Tool {
  name:string;
  description:string;
  parameters:any;
}
```

太简单。

工业化一点：

```ts
interface ToolDefinition {

  name:string;

  description:string;

  inputSchema: JSONSchema;

  metadata?: {

    category?: string;

    riskLevel?: 
      "low" |
      "medium" |
      "high";

    requiresApproval?: boolean;

  };
}
```

---

为什么增加：

metadata？

因为 Runtime 后续需要：

判断：

```text
是否允许执行？
是否需要人工确认？
是否属于危险操作？
```

---

例如：

```json
{
"name":"delete_file",

"riskLevel":"high",

"requiresApproval":true
}
```

Runtime：

看到：

```text
delete_file
+
high risk
```

不会直接执行。

---

这连接后面的：

Part F：

Permission & Human Approval。

---

# 本节核心认知升级

学习前：

> Tool Schema 是定义函数参数。

---

学习后：

> Tool Schema 是设计 Agent 能力边界。

完整理解：

```text
Tool Schema
      |
      v
Defines Action Space
      |
      v
Influences Tool Decision
      |
      v
Shapes Agent Behavior
```

---

# 工业术语映射

| 本课程 | 工业术语 |
|-|-|
| Tool 粒度 | Tool Granularity |
| 能力拆分 | Capability Decomposition |
| 工具边界 | Capability Boundary |
| 万能 Tool | God Tool Anti-pattern |
| 工具选择困难 | Tool Selection Overload |
| 业务 Tool | Domain Tool |
| 技术 Tool | Infrastructure Tool |
| Tool 元数据 | Tool Metadata |
| 风险等级 | Risk Classification |

---

# 面试视角

## Q1：为什么不要设计一个万能 Tool？

回答：

> 因为万能 Tool 会导致 Action Space 过大，模型难以选择，同时参数复杂、权限边界模糊。工业 Agent 更倾向于拆分多个职责清晰的 Tool，让模型在有限能力空间中进行可靠决策。


---

## Q2：Tool 越多 Agent 越强吗？

回答：

> 不一定。Tool 数量增加会扩大模型决策空间，如果 Tool 边界不清晰，会降低选择准确率。优秀 Agent 更关注能力设计和边界，而不是工具数量。


---

## Q3：企业 Agent 为什么应该设计业务 Tool？

回答：

> 因为 Agent 的目标是完成业务任务，而不是操作基础设施。暴露 query_order、create_refund 这种业务能力，比暴露 database_query 更容易让模型正确规划，同时也更安全。


---

# 下一节

## Day05 Part C-3：Tool Schema 如何影响 Agent Decision

下一节进入更深层：

> Tool Schema 不只是描述能力，它实际上会改变 LLM 的决策概率。

重点：

1. Tool Description 为什么类似 Prompt？
2. Tool 名称如何影响模型选择？
3. 为什么增加一个 Tool 会改变 Agent 行为？
4. Tool Schema 如何做 A/B Test？
5. 工业 Agent 如何优化 Tool Calling 成功率？

这一节会把：

```text
Tool Schema Design
```

提升到：

```text
Agent Behavior Optimization
```

继续。

## 11. User

继续学习

## 12. Assistant

# Day05 Part C-3：Tool Schema 如何影响 Agent Decision

## 从 Tool 描述到 Agent 行为优化（Agent Behavior Optimization）

上一节我们完成了一个非常重要的认知升级：

> Tool Schema 不是简单接口定义，而是在设计 Agent 的能力边界。

回顾：

```text
Tool Schema
      |
      v
Action Space
      |
      v
LLM Decision
      |
      v
Agent Behavior
```

---

这一节继续深入一个更隐蔽的问题：

> 为什么修改一个 Tool 的 description，就可能改变 Agent 行为？

例如：

同一个模型：

GPT-5.5

同一个用户：

> 帮我找一下登录代码的问题

同一个 Runtime。

只是 Tool Schema 不一样：

---

版本 A：

```json
{
"name":"search",
"description":"Search files"
}
```

---

版本 B：

```json
{
"name":"search_authentication_code",
"description":
"Search authentication and authorization related source code.
Use this tool when investigating login, session,
permission or user identity issues."
}
```

结果可能完全不同。

为什么？

因为：

> Tool Schema 参与了 LLM 的决策上下文。

---

# 1. Tool Schema 本质是 Decision Prompt

我们先回忆 Day04。

Day04 讲：

Context 不是简单历史消息。

而是：

```text
Raw Information
        |
        v
Context Builder
        |
        v
Optimized Context
```

目标：

让 LLM 更容易完成任务。

---

Tool Schema 也是类似：

它不是：

```text
告诉模型函数存在
```

而是：

```text
告诉模型：

在当前任务中，
有哪些行动值得考虑。
```

---

所以：

Tool Schema 可以看成：

```text
Structured Decision Prompt
```

即：

> 结构化决策提示。

---

完整 Context：

```text
              LLM Context

+--------------------------------+

System Prompt

User Request

Conversation History

Runtime State

Memory

Tool Schema

+--------------------------------+

                |
                v

           Action Decision
```

---

因此：

LLM 的决策输入：

不是：

```text
用户问题
```

而是：

```text
用户问题
+
当前状态
+
可用能力描述
```

---

# 2. Tool Description 如何影响模型选择？

这是 Tool Schema 最核心的地方。

假设：

两个 Tool：

---

## Tool A

```json
{
"name":"search",
"description":
"Search information"
}
```

---

## Tool B

```json
{
"name":"search_workspace_code",
"description":
"Search source code in current workspace.
Use when you need to locate functions,
classes or implementation details."
}
```

---

用户：

> 找一下用户登录逻辑在哪里


模型看到：

Tool A：

```text
search
```

语义：

非常宽泛。

可能：

```text
搜索网页？
搜索文件？
搜索知识？
```

---

Tool B：

模型理解：

```text
workspace
+
code
+
implementation
```

匹配：

```text
用户登录逻辑
```

概率提高。

---

从概率角度：

可以抽象：

```text
P(action | context)
```

其中：

context 包含：

```text
Tool Schema
```

---

修改 Schema：

实际上改变：

```text
P(search_workspace_code)
```

---

所以：

Tool Schema 是影响：

```text
Action Probability Distribution
```

的重要因素。

---

# 3. Tool Name 为什么重要？

很多开发者认为：

name 只是唯一标识：

例如：

```ts
tool_001
```

也可以。

技术上：

Runtime 可以执行。

但是 Agent 效果会下降。

---

为什么？

因为 LLM 看到的是 Token。

例如：

```text
query_order
```

模型拆解：

```text
query
order
```

语义明确。

---

而：

```text
function_23
```

模型：

没有语义。


---

所以：

Tool Name 是：

```text
Semantic Identifier
```

而不是：

```text
Random ID
```

---

推荐：

动作 + 对象：

```text
get_weather

query_order

create_refund

update_customer_profile
```

---

不推荐：

```text
weather1

api_call

execute_task
```

---

# 4. 增加一个 Tool 会发生什么？

这是很多人容易忽略的问题。

假设原来：

```text
Tools:

A 查询订单
B 查询天气
```

模型面对：

用户：

> 我的订单什么时候到？

选择：

```text
A
```

---

现在增加：

```text
C 搜索知识库
```

看起来：

能力增加。

但是：

模型决策空间变化：

以前：

```text
2 个 Action
```

现在：

```text
3 个 Action
```

甚至更多。


---

如果 C 描述：

```text
Search information
```

非常宽泛。

可能出现：

模型：

```text
订单问题

是否查询订单？
是否搜索知识库？
```

---

这就是：

## Action Space Expansion

行动空间扩张。

---

所以：

增加 Tool 不是免费收益。

需要考虑：

```text
Tool Utility
        vs
Decision Complexity
```

---

# 5. Tool Schema 优化其实类似模型调优

这里进入工业实践。

很多团队优化 Agent：

第一反应：

换模型。

例如：

GPT-4
换 GPT-5

Claude Sonnet
换 Opus

---

但是很多时候：

问题不是模型。

而是：

```text
Tool Design
```

---

例如：

Agent Tool Call 成功率：

70%

问题：

可能来自：

模型能力：

30%

Tool Schema：

70%

---

优化方向：

不是：

```text
换更大模型
```

而是：

调整：

```text
name
description
parameter
tool boundary
```

---

这叫：

## Tool Schema Optimization

---

# 6. 工业中如何优化 Tool Schema？

通常几个方向。

---

## 6.1 Description 增强

之前：

```json
{
"description":"Get order"
}
```

优化：

```json
{
"description":
"Retrieve current order status.
Use this tool when users ask about:
- shipment progress
- delivery status
- order tracking

Do not use for:
- product recommendation
- historical analytics"
}
```

增加：

- 使用场景
- 非使用场景
- 边界


---

## 6.2 参数语义增强

之前：

```json
{
"id":"string"
}
```

优化：

```json
{
"order_id":{
"type":"string",
"description":
"Unique order identifier, usually starting with ORD-"
}
}
```

---

模型生成：

更准确。

---

## 6.3 减少歧义 Tool

例如：

两个 Tool：

```text
search_customer
lookup_customer
```

区别？

模型可能困惑。

---

优化：

```text
find_customer_by_email

get_customer_profile
```

明确职责。

---

# 7. Tool Schema 与 Claude Code

回到 Claude Code。

为什么它的工具设计让人感觉：

“像工程师”？

因为 Tool Schema 和工程流程高度匹配。

例如：

## 阅读

```text
ReadFile
```

对应：

工程师：

> 先看代码。


---

## 搜索

```text
Search
```

对应：

工程师：

> 定位问题。


---

## 修改

```text
EditFile
```

对应：

工程师：

> 修改实现。


---

## 验证

```text
RunCommand
```

对应：

工程师：

> 测试结果。


---

注意：

Claude Code 不是简单：

给模型：

```text
code_tool
```

而是：

把工程师行为拆成：

```text
Cognitive Actions
```

---

这也是 Agent 工程的重要思想：

> Tool 应该映射人的任务动作，而不是底层 API。

---

# 8. Tool Schema 和 Workflow 的关系

这里连接我们之前讨论的：

企业 Agent。

你之前提到：

> 企业 Agent 更多是流程固化。

这个理解非常正确。

因为企业场景：

不是无限开放探索。

例如：

退款：

流程：

```text
用户申请退款
        |
        v
查询订单
        |
        v
检查规则
        |
        v
创建退款
```

---

这里 Tool：

不是给 LLM 自由选择：

```text
query_database()
```

而是：

业务能力：

```text
query_order()

check_refund_policy()

create_refund()
```

---

Workflow：

决定：

```text
什么时候允许调用
```

Tool Schema：

决定：

```text
这个能力是什么
```

---

关系：

```text
Workflow
    |
    v
限制 Action Space

Tool Schema
    |
    v
描述 Action Space

LLM
    |
    v
选择 Action
```

---

# 9. mini-agent-runtime 中如何体现？

目前：

```ts
interface ToolDefinition {

 name:string;

 description:string;

 inputSchema:any;

}
```

升级：

```ts
interface ToolDefinition {

  name:string;

  description:string;

  inputSchema:JSONSchema;


  usage?: {

    whenToUse:string[];

    whenNotToUse:string[];

  };


  metadata?:{

    category:string;

    riskLevel:string;

  }

}
```

---

例如：

```ts
{
name:"query_order",

description:
"Query current order status",

usage:{
 whenToUse:[
   "User asks shipment status",
   "User asks delivery progress"
 ],

 whenNotToUse:[
   "Product recommendation"
 ]
}

}
```

---

这其实就是：

把经验编码进 Tool Schema。

---

# 本节核心认知升级

之前：

```text
Tool Schema
=
函数定义
```

现在：

```text
Tool Schema
=
影响 Agent 决策的结构化上下文
```

完整链路：

```text
Tool Schema

       |
       v

Action Space Definition

       |
       v

LLM Probability Distribution

       |
       v

Tool Selection

       |
       v

Agent Behavior
```

---

# 工业术语映射

| 本课程 | 工业术语 |
|-|-|
| Tool Schema 优化 | Tool Schema Optimization |
| 决策概率 | Action Probability |
| 行动空间 | Action Space |
| 描述增强 | Capability Description Engineering |
| 工具边界 | Capability Boundary |
| 使用条件 | Tool Invocation Guidance |
| 非使用条件 | Negative Guidance |
| 行为塑造 | Agent Behavior Shaping |

---

# 面试视角

## Q1：为什么修改 Tool Description 可以改变 Agent 行为？

回答：

> 因为 Tool Schema 是 LLM Context 的一部分，它会影响模型对可用 Action 的理解，从而改变 Tool Selection 的概率分布。优化 Tool Description 本质是在优化模型的行动决策空间。


---

## Q2：Tool Schema 和 Prompt Engineering 有什么关系？

回答：

> Tool Schema 可以看作结构化 Prompt。Prompt 描述角色和任务，而 Tool Schema 描述模型可用能力以及能力边界，两者共同决定 Agent 行为。


---

## Q3：为什么增加 Tool 可能降低 Agent 效果？

回答：

> 增加 Tool 会扩大 Action Space，如果工具之间边界不清晰，会增加模型选择难度，导致错误调用率上升。因此 Agent 工程需要平衡能力覆盖和决策复杂度。


---

# 下一节

## Day05 Part C-4：工业级 Tool Schema Design

下一节我们进入实际设计：

重点：

1. OpenAI Function Calling / MCP 中真实 Schema 长什么样？
2. 如何设计一个生产级 Tool？
3. Tool 返回值如何设计？
4. Error Schema 为什么重要？
5. Tool Result 如何帮助下一轮 Decision？
6. 从一个简单函数升级成工业 Tool Contract。


这一节结束后，Part C 基本完整闭环：

```text
Tool Schema
    |
    +-- 描述能力
    |
    +-- 定义边界
    |
    +-- 影响决策
    |
    +-- 支撑执行
```

继续进入 **Day05 Part C-4：工业级 Tool Schema Design**。

## 13. User

继续学习

## 14. Assistant

# Day05 Part C-4：工业级 Tool Schema Design

## 从 Function Definition 到 Tool Contract

前面三节，我们完成了 Tool Schema 的认知升级：

---

第一层：

```text
Tool Schema
=
函数定义
```

⬇️

第二层：

```text
Tool Schema
=
LLM 理解能力的接口
```

⬇️

第三层：

```text
Tool Schema
=
影响 Agent Decision 的 Action Space 设计
```

---

这一节进入工业实现。

核心问题：

> 一个生产级 Agent Tool，除了 name、description、parameters，还需要设计什么？

答案：

一个真正工业级 Tool，不只是：

```text
输入
+
函数执行
```

而是：

```text
Tool Contract
```

即：

```text
输入契约
+
执行契约
+
输出契约
+
错误契约
+
安全契约
```

---

# 1. 从 Function 到 Tool Contract

传统函数：

```ts
function queryOrder(orderId:string){
}
```

开发者关注：

```text
参数
返回值
异常
```

---

但是 Agent Tool：

调用者变成：

```text
LLM
```

所以增加：

```text
模型理解成本
+
决策成本
+
恢复成本
```

---

例如：

一个普通 API：

```json
{
 "orderId":"123"
}
```

够不够？

对于程序：

够。

对于 Agent：

不够。

因为模型不知道：

- 123 是什么？
- 错误怎么办？
- 没找到怎么办？
- 下一步应该做什么？

---

所以 Tool 需要：

```text
Machine Interface
+
Semantic Interface
```

---

# 2. 工业级 Tool 完整结构

一个成熟 Tool：

```text
Tool Definition

{
    name

    description

    inputSchema

    outputSchema

    errorSchema

    metadata

    permission

}
```

---

对应：

```text
              Tool Contract

        +----------------+

        | Name           |
        | Description    |
        | Input          |
        | Output         |
        | Error          |
        | Permission     |

        +----------------+

```

---

# 3. Input Schema：输入契约

之前：

```json
{
"name":"query_order",
"parameters":{
 "id":"string"
}
}
```

太简单。


工业：

```json
{
"name":"query_order",

"description":
"Query current order information.
Use when user asks about order status,
shipping progress or delivery information.",

"inputSchema":{
 "type":"object",
 "properties":{
   "order_id":{
      "type":"string",
      "description":
      "Unique order identifier."
   }
 },
 "required":[
   "order_id"
 ]
}

}
```

---

这里有几个关键点。

---

## 3.1 required 非常重要

如果：

```json
{
"order_id":"string"
}
```

模型可能：

```json
{
"order_id":""
}
```

或者：

```json
{}
```

---

增加：

```json
"required":[
 "order_id"
]
```

告诉模型：

这个字段必须存在。

---

## 3.2 参数描述不是给开发看的

例如：

```json
{
"order_id":{
"type":"string",
"description":
"Order ID starting with ORD-"
}
}
```

模型会学习：

格式：

```text
ORD-xxxx
```

---

这类似：

Prompt Engineering。

---

# 4. Output Schema：返回契约

这是很多初学 Agent 开发忽略的地方。

很多人设计 Tool：

只关注：

```text
输入
```

但是 Agent 更依赖：

```text
输出
```

---

例如：

Tool 返回：

```json
{
"id":"123",
"status":"shipping"
}
```

模型：

知道。

---

但是：

如果返回：

```json
{
"data":[...]
}
```

模型不知道：

data 是什么。

---

工业设计：

```json
{
"order_id":"ORD-123",

"status":"SHIPPED",

"estimated_delivery":
"2026-07-30",

"tracking_number":
"SF123456"
}
```

---

为什么？

因为 Tool Result 会进入下一轮 Context。

链路：

```text
Tool

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

所以：

Tool Output 实际也是 Prompt。

---

# 5. Tool Result 设计原则

一个好的 Tool Result：

## 原则 1：语义明确

不好：

```json
{
"a":1,
"b":2
}
```

好：

```json
{
"available_stock":100,
"reserved_stock":20
}
```

---

## 原则 2：减少模型推理成本

例如：

返回：

```json
{
"status_code":3
}
```

模型需要猜：

```text
3 是什么？
```

---

返回：

```json
{
"status":"OUT_OF_STOCK"
}
```

直接理解。

---

## 原则 3：提供下一步需要的信息

例如：

订单查询：

不要只返回：

```json
{
"status":"shipping"
}
```

还应该：

```json
{
"status":"shipping",

"next_possible_actions":[
"track_package",
"contact_carrier"
]
}
```

---

注意：

这不是强迫 Agent。

而是降低下一步 Decision 成本。

---

# 6. Error Schema：工业 Agent 必须设计错误

传统 API：

错误：

```json
500
```

程序处理。

---

Agent：

错误也是 Context。

---

例如：

Tool：

```text
query_customer
```

失败：

返回：

```json
{
"error":
"customer not found"
}
```

问题：

模型不知道：

下一步怎么办。


---

工业：

```json
{
"error_type":
"CUSTOMER_NOT_FOUND",

"message":
"No customer matched this email",

"recoverable":true,

"suggestion":
"Ask user to provide another email"
}
```

---

模型看到：

```text
错误

+
是否可恢复

+
建议动作
```

可以继续：

```text
询问用户
```

---

所以：

Error Schema 是 Agent 自恢复能力的重要基础。

---

# 7. Tool Metadata：Runtime 控制信息

之前说：

Tool Schema 给 LLM。

但是 Runtime 也需要信息。

例如：

删除文件：

```json
{
"name":"delete_file",

"metadata":{
 "riskLevel":"high"
}
}
```

Runtime：

看到：

```text
high risk
```

触发：

```text
Human Approval
```

---

所以：

Tool Definition 实际有两部分：

---

## 给 LLM：

```text
name
description
parameters
```

---

## 给 Runtime：

```text
permission
risk
cost
timeout
retry policy
```

---

完整：

```text
              Tool Definition

          +----------------+

          | LLM Metadata   |
          |                |
          | name           |
          | description    |
          | schema         |

          +----------------+

          | Runtime Meta   |
          |                |
          | permission     |
          | risk           |
          | timeout        |

          +----------------+
```

---

# 8. Tool Permission：连接后续 Human Approval

举个例子。

两个 Tool：

---

查询订单：

```json
{
"name":"query_order",

"riskLevel":"low"
}
```

可以：

```text
自动执行
```

---

退款：

```json
{
"name":"create_refund",

"riskLevel":"high",

"requiresApproval":true
}
```

流程：

```text
LLM

 |
 v

create_refund

 |
 v

Runtime Policy

 |
 v

需要人工确认

 |
 v

执行
```

---

这就是：

后续 Part F：

Permission & Human Approval。

---

# 9. OpenAI Function Calling / MCP 对应关系

现在映射工业标准。

---

## OpenAI Function Calling

核心：

```json
{
"name",
"description",
"parameters"
}
```

对应：

```text
Tool Schema
```

---

## MCP

MCP Tool：

类似：

```json
{
"name",
"description",
"inputSchema"
}
```

本质：

标准化：

```text
Capability Discovery
```

---

MCP 解决：

过去：

每个平台：

```text
自定义 Tool 格式
```

现在：

统一：

```text
Tool Definition Protocol
```

---

# 10. mini-agent-runtime 工业化设计

之前：

```ts
interface Tool {

 name:string;

 description:string;

 inputSchema:any;

}
```

升级：

```ts
interface ToolDefinition {

 name:string;

 description:string;


 inputSchema:JSONSchema;


 outputSchema?:JSONSchema;


 metadata?:{

   riskLevel:
    "low"|
    "medium"|
    "high";


   requiresApproval:boolean;


   timeout:number;


 };


}
```

---

执行：

```ts
interface ToolExecutor {

 execute(
   toolName:string,
   input:any
 ):Promise<ToolResult>

}
```

---

返回：

```ts
interface ToolResult {

 success:boolean;


 data?:unknown;


 error?:{

   type:string;

   message:string;

   recoverable:boolean;

 };

}
```

---

这个结构已经接近：

真实 Agent Runtime。

---

# 11. 一个完整例子：企业客服 Agent

设计：

## Tool

查询订单：

```json
{
"name":"query_order_status",

"description":
"Query current order status.
Use when customer asks about shipment,
delivery or order progress.",


"inputSchema":{

"order_id":{
"type":"string"
}

},


"metadata":{

"riskLevel":"low",

"requiresApproval":false

}

}
```

---

返回：

```json
{
"order_id":"ORD-10001",

"status":"SHIPPED",

"delivery_date":"2026-07-30"
}
```

---

Agent：

用户：

> 我的订单到哪里了？

Decision：

```text
Goal:
获取订单状态

Action:
query_order_status

Observation:
订单运输中

Final:
告诉用户预计时间
```

---

整个链路：

```text
User

 |
 v

Goal Understanding

 |
 v

Tool Decision

 |
 v

query_order_status

 |
 v

Tool Executor

 |
 v

Observation

 |
 v

Context Update

 |
 v

Answer

```

---

# 本节核心认知升级

之前：

```text
Tool Schema
=
描述函数
```

现在：

```text
Tool Schema
=
Agent 与 Runtime 的完整能力契约
```

包括：

```text
Input
+
Output
+
Error
+
Permission
+
Runtime Policy
```

---

最终：

```text
Good Tool Design

不是：

"这个 API 能不能调用"

而是：

"Agent 能不能可靠完成任务"
```

---

# 工业术语映射

| 本课程 | 工业术语 |
|-|-|
| Tool Contract | Tool Interface Contract |
| 输入契约 | Input Schema |
| 输出契约 | Output Schema |
| 错误契约 | Error Schema |
| Tool 元数据 | Tool Metadata |
| 风险等级 | Risk Classification |
| 可恢复错误 | Recoverable Error |
| 工具执行器 | Tool Executor |
| 能力发现 | Capability Discovery |

---

# 面试视角

## Q1：为什么 Tool 需要设计 Output Schema？

回答：

> Tool Result 会作为 Observation 回流到 Agent Context，影响下一轮决策。如果输出结构不明确，模型需要额外推理理解结果，会降低 Agent 稳定性。


---

## Q2：为什么 Agent Tool 需要 Error Schema？

回答：

> Agent 不像普通程序只处理异常，它需要根据错误继续规划下一步行动。结构化错误可以告诉模型错误类型、是否可恢复以及建议动作。


---

## Q3：Tool Schema 和 Runtime Metadata 为什么分开？

回答：

> Tool Schema 服务于 LLM 理解能力边界，而 Runtime Metadata 服务于执行控制，例如权限、风险、超时和人工审批，两者关注点不同。


---

# Day05 Part C 完整总结

到这里：

Part C 完成：

```text
Tool Schema Design
```

完整链路：

```text
                 Tool Schema

        +----------------------+

        | 描述能力             |
        | 定义输入             |
        | 定义输出             |
        | 定义错误             |
        | 定义权限             |

        +----------------------+

                 |
                 v

            Action Space

                 |
                 v

            Tool Decision

                 |
                 v

            Tool Execution

```

---

# 下一节 Day05 Part D：Tool Registry

下一章进入：

> Runtime 如何管理大量 Tool？

重点：

1. 为什么不能把所有 Tool 一次性塞给 LLM？
2. Tool Registry 是什么？
3. Tool Discovery 如何工作？
4. MCP Server 与 Tool Registry 的关系？
5. Tool Routing 如何降低 Action Space？
6. 企业 Agent 如何管理几百个业务 Tool？

这里会开始进入：

```text
Tool Schema
        |
        v
Tool Management System
```

也就是 Agent Runtime 真正的“能力管理层”。

## 15. User

提个点，比如你上面举例的客服：{
"order_id":"ORD-10001",

"status":"SHIPPED",

"delivery_date":"2026-07-30"
}，那么比如 "status":"SHIPPED",LLM 怎么知道这个状态啥意思？需要代码写好枚举值吗

## 16. Assistant

这个问题问得非常好，而且其实已经触碰到了 **Tool Schema 设计 + Domain Modeling + LLM 理解机制** 的核心。

你的疑问：

> `status: "SHIPPED"`，LLM 怎么知道 SHIPPED 是什么意思？需要代码写枚举值吗？

答案：

**需要设计，但不一定是传统代码里的 enum。**

更准确：

> LLM 不理解你的业务枚举，它理解的是你提供给它的语义上下文。

---

我们拆开看。

---

## 1. 最简单情况：只返回枚举值

比如 Tool 返回：

```json
{
  "order_id": "ORD-10001",
  "status": "SHIPPED",
  "delivery_date": "2026-07-30"
}
```

LLM 看到：

```
status = SHIPPED
```

它为什么可能知道？

因为：

`SHIPPED` 本身是一个自然语言 token。

训练数据里大量出现：

```
order status:
PENDING
PROCESSING
SHIPPED
DELIVERED
CANCELLED
```

所以 GPT 类模型大概率知道：

```
SHIPPED ≈ 已发货
```

但是注意：

这是**概率理解**。

不是可靠契约。

---

比如你的公司内部：

```json
{
"status":"S3"
}
```

或者：

```json
{
"status":"20"
}
```

LLM 就不知道。

---

## 2. 工业 Agent 不应该依赖模型猜枚举

生产环境通常不会这样：

```json
{
"status":"SHIPPED"
}
```

然后期待模型自己理解。

更推荐：

### 方案 A：返回语义化字段

例如：

```json
{
  "order_id": "ORD-10001",

  "status": {
    "code": "SHIPPED",
    "description": "订单已经发出，正在运输途中"
  },

  "delivery_date": "2026-07-30"
}
```

LLM：

看到：

```
code:
SHIPPED

description:
订单已经发出，正在运输途中
```

理解成本降低。

---

这其实类似我们前面讲的：

> Tool Result 也是 Context。

既然进入 Context，就应该为模型优化。

---

## 3. 更进一步：Output Schema 定义枚举

比如 Tool Definition：

```json
{
"name":"query_order_status",

"outputSchema":{
  "type":"object",

  "properties":{

    "status":{
      "type":"string",

      "enum":[
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
      ],

      "description":
      "Current order lifecycle status"
    }

  }
}
}
```

这里：

`enum`

主要作用：

### 对 Runtime：

约束：

```text
status 必须是这些值之一
```

---

### 对 LLM：

提供：

```
这个字段可能有哪些状态
```

---

但是：

仅 enum 还不够。

因为：

```json
"enum":[
 "PENDING",
 "PROCESSING",
 "SHIPPED"
]
```

模型知道有哪些。

但是：

不知道业务含义。

---

所以工业里更喜欢：

---

## 4. Enum + Description Mapping

例如：

```json
{
"status":{

"type":"string",

"description":
"
Order lifecycle status:

PENDING:
Order created but payment not confirmed.

PROCESSING:
Payment confirmed, warehouse preparing shipment.

SHIPPED:
Package has left warehouse and is in transit.

DELIVERED:
Customer received package.

CANCELLED:
Order has been cancelled.
",

"enum":[
"PENDING",
"PROCESSING",
"SHIPPED",
"DELIVERED",
"CANCELLED"
]

}
}
```

---

现在 LLM 获得：

```text
SHIPPED
=
包裹已经离开发货仓，运输途中
```

---

这就是：

## Semantic Schema

不是：

```text
结构 Schema
```

而是：

```text
结构 + 语义 Schema
```

---

# 5. 还有一种工业做法：直接返回面向 Agent 的结果

很多 Agent Runtime 会做一层 Adapter。

比如：

数据库：

```json
{
"status_code":3
}
```

↓

Adapter：

```json
{
"status":"SHIPPED",

"human_readable_status":
"商品已经发出，目前正在运输中",

"next_action":
"wait_for_delivery"
}
```

↓

LLM


---

为什么？

因为：

数据库模型：

服务程序。

Agent 模型：

服务决策。

两者目标不同。

---

这个其实和你之前讨论企业 Agent 的观点非常一致：

企业 Agent 不应该直接暴露：

```text
数据库能力
```

而应该暴露：

```text
业务能力
```

这里也是一样。

不要给 Agent：

```
订单表 status_code=3
```

而给：

```
订单当前处于运输阶段
预计7月30日送达
```

---

# 6. 那代码里面需要 enum 吗？

答案：

**Runtime 层建议需要。**

例如 TypeScript：

```ts
enum OrderStatus {
  PENDING="PENDING",
  PROCESSING="PROCESSING",
  SHIPPED="SHIPPED",
  DELIVERED="DELIVERED",
  CANCELLED="CANCELLED"
}
```

原因：

不是给 LLM。

而是给：

- 后端代码
- 数据校验
- Tool Executor
- 测试
- 防止脏数据

---

完整链路：

```text
Database

status_code=3


      |
      v

Backend Domain Model


status=SHIPPED


      |
      v

Tool Adapter


{
 code:"SHIPPED",
 description:"运输途中"
}


      |
      v

LLM Context


      |
      v

Agent Decision
```

---

# 7. 这里其实引出一个 Agent 工程非常重要的思想

普通后端：

关注：

```
数据正确
```

Agent 工程：

还要关注：

```
模型是否容易理解
```

所以会出现：

## Agent-oriented API Design

也就是：

> 为 Agent 设计 API，而不是只为程序设计 API。

---

例如普通 API：

```json
{
"status":3
}
```

没问题。


Agent API：

```json
{
"status":"SHIPPED",

"status_description":
"订单已发出，等待配送",

"expected_action":
"wait"
}
```

更好。

---

# 回到 Day05 Part C 的核心

其实你这个问题正好对应刚才讲的：

> Tool Output Schema 为什么重要？

因为：

Tool Output 不只是返回数据。

它是：

```text
Observation
    |
    v
Context
    |
    v
Next Decision
```

所以：

设计 Tool Output，本质是在设计：

> 下一轮 LLM 如何理解世界。

---

## 本问题对应工业术语

|你的问题|工业概念|
|-|-|
|SHIPPED 怎么理解|Semantic Schema|
|枚举值|Enum Constraint|
|描述状态含义|Field Description|
|状态码转换|Domain Adapter|
|给 Agent 返回友好结果|Agent-oriented API|
|Tool 返回设计|Observation Design|

---

这个问题其实可以作为 Day05 Part C 的一个补充章节：

> **Part C-5：Tool Output Schema：如何让 Agent 正确理解世界**

因为它连接：

```text
Tool Schema
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
下一轮 Decision
```

后面进入 **Part D Tool Registry** 前，我建议补这一节，会把 Tool Schema 闭环补完整。你这个问题刚好踩到了工业 Agent 和普通 Function Calling 的分界线。

## 17. User

好的 谢谢你。那 part c 到此学完了吗？还有要补充的吗

## 18. Assistant

是的，**Day05 Part C：Tool Schema Design 主体内容已经学完了**。

而且这一 Part 实际上比最初规划的重要性更高，因为我们不是停留在：

> “怎么写一个 Function Schema”

而是深入到了：

> “如何设计 Agent 的能力边界，让 LLM 能稳定理解、选择和使用能力。”

这也是工业 Agent 和简单 Function Calling 的分水岭。

我整理一下 Part C 的完整闭环，以及还有没有遗漏。

---

# Day05 Part C 完整知识地图

## Part C-1：Tool Schema 基础模型

解决：

> Tool Schema 是什么？

核心：

```text
Tool Schema
=
LLM 与 Runtime 的行动契约
```

我们建立：

```text
Runtime Capability

        |
        v

   Tool Schema

        |
        v

      LLM

        |
        v

  Action Decision
```

关键认知：

Tool Schema 不是给开发者看的 API 文档，而是给 LLM 理解能力空间的接口。

---

# Part C-2：Tool Schema Engineering

解决：

> Tool 应该怎么设计？

核心：

```text
Tool Design
=
Capability Design
```

学习了：

## 1. Tool 粒度

太大：

```text
execute_anything()
```

问题：

- Action Space 太大
- 决策困难
- 权限难控制


太小：

```text
read_line()
read_character()
```

问题：

- Tool 爆炸
- Selection Overload


最佳：

```text
业务动作级 Capability
```

例如：

不好：

```text
database_query()
```

好：

```text
query_order()

create_refund()

update_address()
```

---

## 2. Tool 应该映射人的任务动作

特别是 Claude Code：

不是：

```text
code_api()
```

而是：

```text
ReadFile

Search

EditFile

RunCommand

GitDiff
```

因为：

这些对应：

```text
Engineer Cognitive Actions
```

---

# Part C-3：Tool Schema 如何影响 Agent Decision

解决：

> 为什么 Schema 会改变 Agent 行为？

核心：

```text
Tool Schema
        |
        v
Action Space
        |
        v
Probability Distribution
        |
        v
Tool Selection
```

也就是：

修改：

```json
description
name
parameters
```

实际上是在调整：

```text
P(action | context)
```

---

这里有一个非常重要的工业认知：

> Tool Schema 是 Structured Prompt。

Agent 行为来源：

不是：

```text
Model
```

而是：

```text
Model

+

Context

+

Memory

+

Tool Schema

+

Runtime Policy
```

---

# Part C-4：工业级 Tool Schema Design

解决：

> 一个生产 Tool 应该包含什么？

升级：

从：

```ts
{
 name,
 description,
 parameters
}
```

到：

```ts
{
 name,

 description,

 inputSchema,

 outputSchema,

 errorSchema,

 metadata,

 permission
}
```

---

重点学习：

## Input Schema

控制：

```text
模型如何调用
```

---

## Output Schema

控制：

```text
模型如何理解世界
```

---

## Error Schema

控制：

```text
模型如何恢复
```

---

## Metadata

控制：

```text
Runtime 如何约束执行
```

---

# 你的问题：SHIPPED 怎么理解？

这个问题其实补上了 Part C 最后一个隐藏点：

## Tool Result Schema

也就是：

> Agent 不只是需要知道“有什么工具”，还需要知道“工具返回的信息代表什么”。

完整链路：

```text
Tool Definition

       |
       v

Tool Execution

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

Next Decision
```

---

所以 Tool Schema 实际应该分：

## 1. Action Schema

告诉 LLM：

你能做什么。

例如：

```json
query_order_status
```

---

## 2. Input Schema

告诉 LLM：

怎么做。

例如：

```json
{
order_id:string
}
```

---

## 3. Output Schema

告诉 LLM：

结果是什么。

例如：

```json
{
status:"SHIPPED"
}
```

---

## 4. Semantic Schema

告诉 LLM：

这个状态是什么意思。

例如：

```json
{
status:"SHIPPED",

description:
"订单已经发出，目前运输途中"
}
```

---

# Part C 还有两个小补充点（建议记入笔记）

虽然不是主线，但工业上很重要。

---

# 补充 1：Tool Schema 需要版本管理

真实企业里：

Tool 会变化。

例如：

v1：

```json
query_order()
```

返回：

```json
{
status:"SHIPPED"
}
```

---

半年后：

业务增加：

```json
{
status:"SHIPPED",

carrier:"SF",

tracking_number:"xxx"
}
```

问题：

旧 Agent Prompt / Workflow 是否还能工作？

所以工业 Runtime 通常需要：

```text
Tool Versioning
```

例如：

```text
query_order.v1

query_order.v2
```

类似：

API Version。

---

# 补充 2：Tool Schema 需要测试

这是很多 Agent 项目没有意识到的。

普通 API 测试：

```text
输入
 |
 v
输出正确
```

Agent Tool 测试：

还需要：

```text
输入场景
 |
 v
LLM 是否选择正确 Tool
 |
 v
参数是否正确
 |
 v
结果是否正确理解
```

也就是：

## Tool Calling Evaluation

例如：

测试：

用户：

> 我的包裹什么时候到？

期望：

```json
{
tool:"query_order_status"
}
```

而不是：

```json
{
tool:"search_web"
}
```

---

这已经进入后面的：

- Agent Evaluation
- Runtime Observability

（后续章节）

---

# 所以 Day05 Part C 最终认知升级

从：

```text
Tool = Function
```

升级：

```text
Tool = Agent Capability
```

再升级：

```text
Tool Schema
=
定义 Agent 能力边界 + 决策空间 + 世界理解方式
```

---

# 面试版一句话总结

如果面试问：

> Tool Schema 在 Agent 中有什么作用？

可以回答：

> Tool Schema 是 LLM 与 Runtime 之间的能力契约，它不仅描述工具接口，还定义模型可见的行动空间、参数约束和结果语义，从而直接影响 Agent 的 Tool Selection、参数生成以及后续规划行为。

这个回答已经是偏高级 Agent Engineer 的理解。

---

# Day05 当前进度

目前：

✅ Part A Tool Calling 基础模型  
✅ Part B Tool Decision  
✅ Part C Tool Schema Design  

下一节：

# Day05 Part D：Tool Registry

这个章节会进入 Runtime 的“能力管理系统”。

核心问题：

现在我们已经有：

```text
100 个 Tool
```

怎么办？

难道每轮：

```text
把100个Tool Schema全部塞给LLM？
```

显然不行。

所以需要：

```text
Tool Registry
```

它负责：

- Tool 注册
- Tool 管理
- Tool Discovery
- Tool Filtering
- Tool Routing

也会连接：

- MCP Server
- Claude Code Tool Management
- OpenAI Agents SDK Tool Collection

---

这里我认为 Part C 已经完整结束，可以进入 Part D。你提出的 `SHIPPED` 问题作为补充，实际上帮 Part C 补上了 **Tool Output Semantic Design** 这一块，是非常好的一个收尾问题。
