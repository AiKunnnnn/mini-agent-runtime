# Day05 Part B ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a62d9f9-379c-83e8-bd79-ad9b33dbf3a5
- 会话标题：Day05 Part B Tool Decision
- 抽取时间：2026-07-24

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part B 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05part A 的学习笔记以及 day05 的 readme，我们开始 part B 的学习吧

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Assistant

好的，我们继续进入 **Day05 Part B：LLM 如何决定调用 Tool（Tool Decision Layer）**。

我已经看过你上传的两个文件：

- `README(12).md`：确认 Day05 整体路线  
- `day05-part-a-tool-calling-basics.md`：确认 Part A 的边界和前置认知

Part A 已经完成了一个非常关键的认知迁移：

以前：

```text
LLM
 |
 v
回答用户
```

升级为：

```text
LLM
 |
 | 产生 Tool Call Intent
 v
Runtime
 |
 | 验证 + 执行
 v
Tool
 |
 | Observation
 v
Runtime State
 |
 v
下一轮 Context
```

也就是说：

> Part A 解决的是「Tool Calling 是什么，以及它在 Runtime 中的位置」。

而 Part B 开始进入真正的决策层：

> **LLM 为什么知道什么时候应该调用 Tool？**

---

# Day05 Part B：LLM 如何决定调用 Tool

## 本节定位

Day04 学的是：

> Runtime 如何让 LLM 更好地思考？

核心：

```text
Context Engineering
```

Day05 Part A 学的是：

> Runtime 如何让 LLM 的思考产生行动？

核心：

```text
Tool Calling
```

Day05 Part B 进一步深入：

> LLM 如何在多个可能行动中选择一个？

核心：

```text
Tool Decision
```

---

# 1. 一个核心问题：LLM 为什么会调用 Tool？

比如用户：

> 查询一下我的订单现在在哪里

Runtime 给 LLM：

```json
{
  "tools": [
    {
      "name": "query_order",
      "description": "查询订单状态",
      "parameters": {
        "order_id": "string"
      }
    }
  ]
}
```

为什么 LLM 不直接回答：

> 您的订单已经发货

而是：

```json
{
  "tool": "query_order",
  "arguments": {
    "order_id": "123"
  }
}
```

原因：

LLM 并不是“突然拥有了调用工具的意识”。

实际上：

> Tool Definition 改变了 LLM 的决策空间。


---

# 2. Tool Decision 本质：Action Selection

Agent Loop：

```text
Runtime State
      |
      v
Context Builder
      |
      v
LLM
      |
      |
      +----------------+
      |                |
      v                v
 Final Answer     Tool Call
```

这里 LLM 面临一个选择：

```text
现在应该：

A. 直接回答？

B. 调用工具？

C. 调用哪个工具？

D. 参数是什么？
```

这就是：

> Action Selection（行动选择）

工业里经常叫：

- Tool Selection
- Action Selection
- Function Selection
- Capability Routing


---

# 3. LLM 决策过程不是 if else

很多初学者会认为：

Runtime：

```ts
if(user.includes("订单")){
    callOrderTool()
}
```

这种其实不是 Agent。

这是：

```text
Rule Engine
```

例如：

```text
关键词
 |
 v
固定流程
 |
 v
调用 API
```

传统 Bot：

```
用户输入
 |
规则匹配
 |
接口调用
```

Agent：

```
用户输入
 |
Context
 |
LLM reasoning
 |
Action decision
 |
Tool call
```

区别：

| |传统 Bot|Agent|
|-|-|-|
|决策者|规则|LLM|
|方式|if/else|概率推理|
|扩展|增加规则|增加能力|
|泛化|弱|强|


---

# 4. Tool Schema 为什么影响决策？

这里连接 Day04：

Day04 学：

> Context 决定 LLM 看什么。

Day05 学：

> Tool Schema 决定 LLM 能做什么。


例如：

给模型：

```json
{
"name":"search"
"description":"搜索文件"
}
```

模型理解：

```
我可以搜索文件
```

但是如果：

```json
{
"name":"search_workspace_files",
"description":
"Search source code, documents and configuration files
inside current workspace"
}
```

模型理解：

```
这是代码环境搜索能力
```

所以：

Tool Schema 本质：

> 给 LLM 描述行动空间。


---

# 5. Tool Description 是 Prompt Engineering 吗？

这是一个很重要的问题。

答案：

不完全是。

更准确：

```
Tool Schema Engineering
```

属于：

```
Agent Behavior Engineering
```

因为它影响：

- Tool 选择
- 参数生成
- 调用频率
- 行为边界


例如：

Claude Code 为什么工具少但是强？

它不是给：

```
execute()
```

一个万能工具。

而是：

```
ReadFile

Search

EditFile

RunCommand

GitDiff
```

每个能力边界非常清晰。


---

# 6. Tool Choice 三种模式

很多 Agent Runtime 都有类似概念。


## 6.1 auto

默认模式：

```text
LLM 自己决定
```

流程：

```
User
 |
 v
LLM
 |
 +------+
 |      |
回答   Tool
```

适合：

聊天 Agent。


---

## 6.2 required

强制调用：

```
必须选择 Tool
```

例如：

订单客服：

```
用户问订单
 |
必须查询数据库
```

不能：

```
我猜您的订单应该到了
```


工业系统常用：

```
Critical Data Access
```


---

## 6.3 none

禁止 Tool：

```
只允许回答
```

例如：

总结任务：

```
不要访问外部系统
```


---

# 7. Tool Decision 的真实 Runtime 流程

完整一点：

```text
              Runtime State
                    |
                    v

             Context Builder
                    |
                    v

          +----------------+
          | Prompt Context |
          +----------------+

                    |
                    v

                 LLM

                    |
        +-----------+-----------+
        |                       |
        v                       v

  Final Response          Tool Call Intent

                                |
                                v

                         Tool Validator

                                |
                                v

                         Tool Executor

                                |
                                v

                          Observation

                                |
                                v

                         Runtime State
```

注意：

LLM 输出：

不是：

```
执行结果
```

而是：

```
决策结果
```


---

# 8. ReAct 中 Tool Decision 的位置


经典 ReAct：

```
Thought

↓

Action

↓

Observation

↓

Thought
```


映射到 Runtime：


```
LLM Reasoning

↓

Tool Call Intent

↓

Runtime Execution

↓

Tool Result

↓

Next Context
```


对应关系：

|ReAct|Runtime|
|-|-|
|Thought|LLM reasoning|
|Action|Tool Call Intent|
|Observation|Tool Result|
|Loop|Runtime Loop|


---

# 9. 一个重要认知：LLM 不知道 Tool 是否真实存在

比如：

Runtime 给：

```json
tools:[
 weather,
 database,
 search
]
```


LLM 看到的是：

```
可用能力描述
```


但是：

它不知道：

- API 是否成功
- 权限是否允许
- 数据是否存在


所以：

LLM 决策：

```
我要查询天气
```

Runtime 判断：

```
是否允许？
是否超时？
是否收费？
```

这就是：

```
Decision Layer

Execution Layer
```

分离。


---

# 10. 工业 Runtime 架构中的位置


现在我们的 Runtime 可以进一步细化：


```
                 Agent Runtime

┌──────────────────────────────┐
│                              │
│        Context System        │
│                              │
│ Runtime State                │
│ Context Builder              │
│ Context Management           │
│                              │
└──────────────┬───────────────┘
               |
               v

          LLM Decision Layer

               |
               |

     ┌─────────┴─────────┐

     Tool Decision       Final Answer


               |
               v


        Tool Runtime


               |
               v


        External World
```

Part B 学的是中间这一层：

```
LLM Decision Layer
```


---

# 11. mini-agent-runtime 对应设计


现在增加：

```ts
interface AgentDecision {

 type:
   | "tool_call"
   | "final_answer"

 toolCall?: ToolCallIntent

}
```


LLM 输出：

```json
{
"type":"tool_call",
"toolCall":{
"name":"search",
"arguments":{
"query":"runtime state"
}
}
}
```


Runtime：

```ts
switch(decision.type){

case "tool_call":
    executor.execute()

case "final_answer":
    return response

}
```


---

# 本 Part 核心认知升级

完成 Part B 后，需要升级：

以前：

> Tool Calling = 调函数


现在：

> Tool Calling 前面还有一个 Decision Layer。


完整链路：

```
Context Engineering
        |
        v
LLM Decision
        |
        v
Tool Calling
        |
        v
Tool Execution
        |
        v
Observation
```


---

# 面试视角

## Q1：LLM 如何决定是否调用 Tool？

回答：

> Runtime 会把 Tool Definition 作为上下文提供给模型，LLM 根据当前任务、上下文以及工具描述生成下一步行动决策。这个决策可能是直接回答，也可能生成结构化 Tool Call Intent，之后由 Runtime 执行。


---

## Q2：Tool Description 为什么重要？

回答：

> Tool Description 实际上影响模型的行动空间。如果工具定义模糊，模型可能无法正确选择工具或者生成错误参数。因此工业 Agent 会把 Tool Schema Engineering 作为 Agent Behavior Engineering 的一部分。


---

## Q3：Agent 和传统 Workflow 最大区别？

回答：

> Workflow 的下一步通常由预定义规则决定，而 Agent 的下一步由 LLM 根据 Context 和 Available Tools 动态选择。


---

# 下一节预告

## Day05 Part C：Tool Schema Design

下一节进入：

> 如何设计一个让 LLM 正确理解和调用的 Tool？


重点：

1. Tool Schema 为什么是 Agent API Contract？
2. name / description / parameter 如何设计？
3. 为什么一个万能 Tool 是坏设计？
4. Claude Code 为什么拆分大量小 Tool？
5. Tool Schema 如何影响 Agent 行为？
6. 工业级 Tool Design Pattern


---

这一节 Part B 的核心就是一句话：

> **Tool Calling 的前提不是“有 Tool”，而是 Runtime 通过 Tool Schema 给 LLM 建立一个可选择的行动空间，而 LLM 在这个空间里进行 Action Selection。**

下一节我们进入 **Day05 Part C：Tool Schema Engineering（Agent 能力设计层）**。

## 7. User

那这一节的内容还有需要补充的吗(你把握学习节奏即可，因为你把 day05 拆分了很多节，如果 partB  确实就那么少那就那么少)

## 8. Assistant

这个问题问得很好，我来控制一下节奏。

先给结论：

> **Day05 Part B 目前的内容已经达到“理解 Agent Runtime 中 Tool Decision 的必要深度”，不建议继续扩展太多。**
>
> 但是有 **3 个小补充点**，我建议加入 Part B 的正式笔记中，否则后面 Part C / D / E 会少几个连接点。

原因是 Day05 我拆分比较细：

```
Part A：Tool Calling 基础模型
        ↓
Part B：LLM 如何决定调用 Tool
        ↓
Part C：Tool Schema Design
        ↓
Part D：Tool Registry
        ↓
Part E：Tool Executor
        ↓
Part F：Permission / Human Approval
        ↓
Part G：Tool Result 回流 Runtime
        ↓
Part H：Multi Tool Loop
        ↓
Part I：Mini Tool Runtime 实现
```

所以 Part B 不应该提前讲：

- Schema 细节 ❌（Part C）
- Registry ❌（Part D）
- Executor 实现 ❌（Part E）
- Permission ❌（Part F）
- Loop 工程细节 ❌（Part H）

否则章节边界会混乱。


---

# Part B 建议补充 1：Tool Decision 不是一次决策，而是一个概率选择过程

这一点比较重要。

现在我们说：

```
LLM
 |
选择 Tool
```

容易让人误解成：

> LLM 内部有一个 if 判断。


实际上更接近：

```
Given:

Context
+
Available Tools
+
User Intent

↓

Probability Distribution

↓

Select Next Action
```


例如：

用户：

> 北京今天多少度？


Runtime 给：

```
Tools:

weather(city)

search(query)
```


LLM 内部类似：

```
Action candidates:

weather:
  0.92

search:
  0.05

final_answer:
  0.03
```

最后选择：

```
weather
```


所以 Agent Decision 本质：

```
Next Action Prediction
```

而不是：

```
Function Matching
```


这个认知非常重要，因为后面会连接：

- Agent Planning
- Reflection
- Self Correction


---

# Part B 建议补充 2：Tool Decision 其实受三个因素共同影响

现在我们讲：

```
Tool Schema
+
Context
=
Decision
```

还可以进一步抽象：

工业 Agent：

```
Tool Decision =
        Context
        +
        Tool Definition
        +
        Runtime Policy
```

三个部分：

---

## 1. Context

来自 Day04：

```
用户目标
历史消息
Memory
Runtime State
Observation
```

决定：

> 当前问题是什么


---

## 2. Tool Definition

来自 Part C：

```
name
description
parameters
```

决定：

> 有哪些能力


---

## 3. Runtime Policy

这个是后续 Part F 会深入的。

例如：

虽然模型想：

```
delete_file()
```

但是：

Runtime Policy:

```
需要人工确认
```

于是：

```
LLM Decision

↓

Policy Check

↓

Blocked
```

所以完整链路：

```
             Context
                |
                |
                v

          LLM Decision

                |
                v

        Runtime Policy Check

                |
        +-------+-------+

        allow       deny

          |
          v

       Executor
```


这也是为什么工业 Agent 一定不是：

```
LLM + Tools
```

而是：

```
LLM
+
Runtime Control Layer
+
Tools
```


---

# Part B 建议补充 3：为什么 Agent 有时候“不调用 Tool”

这个其实面试很喜欢问。


例如：

用户：

> 什么是 React？


同时 Runtime 给：

```
search_web
database_query
calculator
```


为什么 LLM 不调用？


因为：

```
Question
 |
 v
Context Evaluation

发现：

已有知识足够

↓

Final Answer
```


所以：

Agent 决策不是：

```
看到 Tool 就调用
```

而是：

```
Evaluate:

Need external information?

Need external action?

Need verification?

```

然后决定：


```
                 User Request

                       |

                       v


             Need External World?

               /             \

             No               Yes

             |                 |

             v                 v

        Final Answer       Tool Call
```


这个非常关键。


否则很多企业 Agent 会犯一个错误：

> 给 LLM 一堆工具，然后希望它自动变聪明。


实际：

工具越多：

Decision Space 越大。


后面 Part C 会讲：

为什么 Tool 设计不好，Agent 会退化。


---

# 所以 Part B 最终结构我建议调整为：

```
Day05 Part B：LLM Tool Decision

1. Tool Decision 是什么
2. Action Selection：LLM 如何选择下一步动作
3. 为什么不是 if/else Rule
4. Tool Schema 如何影响 Decision
5. Tool Choice:
   - auto
   - required
   - none

6. Decision Layer 与 Execution Layer 分离

7. Tool Decision 三因素模型 ⭐新增

   Context
      +
   Tool Definition
      +
   Runtime Policy

8. Agent 为什么选择不用 Tool ⭐新增

9. mini-agent-runtime Decision Model

10. 工业实现映射

11. 面试视角

12. 思考题
```


---

# 另外有一个学习节奏上的判断

我觉得 Day05 Part B **不要再深入了**。

原因：

真正复杂的是后面：

```
Part C Tool Schema
```

因为这里会进入 Agent 工程非常核心的一层：

> **设计什么 Tool，决定 Agent 能力边界。**

然后：

```
Part D Registry
```

会进入：

> Agent 如何动态管理能力。


```
Part E Executor
```

会进入：

> Agent 如何安全执行动作。


所以 Part B 现在的定位就是：

```
建立 Agent 的决策脑模型
```

不是实现细节。


---

因此我的建议：

✅ Part B 保持一个“小而关键”的章节  
✅ 加入上面三个补充点  
✅ 然后进入 Part C

这也符合整个 Day05 的认知曲线：

```
Part A
理解 Tool 是什么

        ↓

Part B
理解为什么选择 Tool

        ↓

Part C
设计 Tool

        ↓

Part D
管理 Tool

        ↓

Part E
执行 Tool

        ↓

Part F
控制 Tool

        ↓

Part G
理解 Tool 反馈

        ↓

Part H
形成完整 Agent Loop
```

这个节奏会比较接近真正设计 Agent Runtime 的思路。

## 9. User

1.【Tool Decision 不是一次决策，而是一个概率选择过程】这句话是不是可以理解为如果 LLM 不够聪明，即便你给它 tools 它也会不知道去调用，然后直接输出

## 10. Assistant

对，你的理解方向是对的，而且你刚好抓到了 **Agent 工程里一个非常关键的问题：模型能力会直接影响 Tool Calling 行为**。

但是我稍微修正一下：

> **不是“LLM 不够聪明所以不知道 Tool 存在”，而是 LLM 的 Tool Decision 能力不足时，即使 Runtime 提供了 Tool，它也可能无法正确判断“什么时候应该用 Tool”。**

我们展开看。

---

## 1. Tool 给了 ≠ 一定会调用

很多人刚开始理解 Tool Calling 会有一个误区：

> Runtime 给 LLM tools，那 LLM 就会自动调用。

实际上不是。

流程：

```text
Runtime

提供：

Context
+
Tools

↓

LLM

产生：

Final Answer
或者
Tool Call
```

LLM 每次都有选择：

```text
Action Space:

A. 直接回答

B. 调用 tool_1

C. 调用 tool_2

D. 调用 tool_3
```

它需要判断：

> 当前任务是否需要外部能力？


---

## 2. 举个简单例子

假设：

Runtime 提供：

```json
{
"name": "weather_query",
"description": "查询城市天气"
}
```

用户：

> 上海今天热吗？

优秀模型：

推理：

```
我不知道实时天气
需要外部信息
存在 weather_query 工具
应该调用
```

输出：

```json
{
"tool":"weather_query",
"city":"上海"
}
```

---

但是能力弱一点的模型：

可能：

```
上海天气？
我知道上海夏天比较热
```

直接回答：

```
上海夏天通常比较炎热，建议注意防晒。
```

问题：

它没有意识到：

> 这是一个需要实时数据的问题。


所以：

Tool 存在，但是没有进入 Action。


---

# 3. 这也是为什么 Agent 对模型能力有要求

普通 Chat：

```text
用户问题
 |
 v
生成答案
```


Agent：

```text
用户问题

↓

判断：

是否需要行动？

↓

选择：

哪个行动？

↓

生成参数

↓

执行
```

多了一层：

```text
Decision Making
```

也就是：

> Agent 不只是要求模型会回答，还要求模型会决定下一步。


---

# 4. 但是不要理解成“越大模型越好”

这里还有一个工程细节。

Tool Calling 能力 ≠ 单纯模型参数大小。


影响因素：

## ① 模型训练是否包含 Tool Calling 数据

例如：

一个模型：

```
100B 参数
但是没训练过 function calling
```

可能表现不好。


另一个：

```
30B
但是大量 tool-use 数据训练
```

可能更稳定。


---

## ② Tool Schema 是否设计合理

这个非常重要。

比如：

坏设计：

```json
{
"name":"do_everything",
"description":"执行所有操作"
}
```

模型：

```
？？？
什么时候用？
参数是什么？
```

容易乱。


好的：

```json
{
"name":"search_order_status",
"description":
"Query the current status of a user's order by order id"
}
```

模型：

```
用户问订单状态
→ 这个工具匹配
```

---

所以最终：

Tool Decision:

不是：

```
LLM intelligence
```

单因素决定。

而是：

```
Tool Decision Quality

=

Model Capability

+

Tool Schema Design

+

Context Quality

+

Runtime Policy
```

---

# 5. 这也解释了为什么 Claude Code 很强

很多人看到：

> Claude Code 为什么感觉像一个高级工程师？

容易认为：

> 因为 Claude 模型聪明。


实际上：

Claude Code：

```
Claude Model

+

大量工程 Tool

+

优秀 Tool Schema

+

Context Engineering

+

Runtime Loop
```

比如：

工具：

```
ReadFile
Search
EditFile
RunTest
GitDiff
```

模型非常容易理解：

```
我要修改代码

↓

先读取文件

↓

修改

↓

运行测试

↓

查看结果
```

如果工具设计成：

```
execute_workspace_action()
```

反而模型更难。


---

# 6. 回到我们 mini-agent-runtime

未来实现：

我们的 Runtime 不应该假设：

```ts
LLM 一定知道调用什么
```

而应该设计：

```text
Context Builder

↓

LLM Decision

↓

Decision Validator

↓

Tool Executor
```


甚至可以加入：

```ts
interface DecisionValidator {

 validate(
   decision: AgentDecision
 ): boolean

}
```


例如：

LLM：

```
我要查询订单
```

但是没有调用工具。

Validator：

```
发现：
用户要求实时订单数据

但是没有 tool call

↓

要求重新决策
```

这就是工业 Agent 里面：

- Planning
- Guardrail
- Policy
- Reflection

的基础。


---

# 7. 所以你的理解可以升级成一句面试表达

你的原话：

> 如果 LLM 不够聪明，即便给它 tools，它也不知道去调用，然后直接输出。

工业表达：

> Tool Calling 并不会自动赋予模型行动能力，它只是扩大了模型的 action space。模型仍然需要具备 tool selection 能力，根据 context 判断是否需要调用工具。如果模型推理能力不足、tool schema 不清晰或者 context 不完整，Agent 可能会选择直接回答而不是执行 action。

这个理解非常重要。

实际上你已经触碰到了后面一个更大的主题：

> **Agent 的核心不是“拥有工具”，而是“正确选择工具”。**

这也是为什么 Day05 Part B 虽然短，但它的位置非常关键——它连接了：

```text
Day04 Context Engineering
        |
        v
Day05 Tool Decision
        |
        v
Day05 Tool Schema Engineering
        |
        v
Agent Behavior Engineering
```

你这个问题其实已经提前进入 Part C 的核心了。下一节讲 Tool Schema 时会进一步解释：

**为什么好的 Tool Schema 能显著提升 LLM 调用成功率。**

## 11. User

好的 谢谢你。今天这一节还有需要补充的吗

## 12. Assistant

不客气。这个问题其实说明你已经不是在“学习 Tool Calling API”，而是在理解 **Agent Runtime 为什么这样设计**。

我重新评估一下 Day05 Part B 的学习目标：

> Part B 的目标不是实现 Tool Decision，而是建立“LLM 决策层”的认知模型。

目前我们已经覆盖：

✅ Tool Decision 是什么  
✅ 为什么 Tool 存在不代表一定会调用  
✅ Action Selection 思想  
✅ Tool Schema 对决策的影响（提前铺垫）  
✅ auto / required / none  
✅ Decision Layer 和 Execution Layer 分离  
✅ Context + Tool Definition + Runtime Policy 三因素模型  
✅ 模型能力对 Tool Calling 的影响  

我认为还剩 **两个非常值得补充的小点**，补完之后 Part B 可以正式结束。

---

# 补充 1：Tool Decision 有两个阶段，而不是一步完成

之前我们讲：

```text
User Request
      |
      v
LLM Decision
      |
      v
Tool Call
```

这个对于初学够了。

但工业 Runtime 更接近：

```text
             User Request

                  |
                  v

        +-------------------+
        | Intent Understanding|
        +-------------------+

                  |
                  v

        +-------------------+
        | Action Selection   |
        +-------------------+

                  |
                  v

             Tool Call
```

也就是说：

LLM 实际完成两个问题：

---

## 第一层：我要解决什么问题？

例如：

用户：

> 我的订单什么时候到？


LLM 先理解：

```text
Intent:

Query Order Status
```

---

## 第二层：解决这个问题需要什么动作？

然后：

```text
Available Actions:

A. 查询订单数据库

B. 查询物流接口

C. 直接回答
```

选择：

```text
Action:

query_order()
```

---

所以：

Agent Decision：

不是：

```text
问题 → Tool
```

而是：

```text
问题理解

↓

任务目标

↓

行动选择

↓

执行
```

这其实已经接近后面的：

- Planning
- Workflow
- Task Decomposition


---

# 为什么这个补充重要？

因为很多企业 Agent 实际做的是：

```text
用户输入

↓

Intent Classification

↓

Workflow

↓

Tool
```

例如客服：

```text
用户：

我要退款


↓

Intent:

Refund Request


↓

Workflow:

检查订单
|
检查退款条件
|
创建退款单


↓

Tools:
query_order()
create_refund()
```


这里：

LLM 不直接决定：

“调用哪个 API”。

而是：

决定：

“进入哪个业务流程”。

这也是你之前提到的：

> 企业 Agent 更多是业务流程固化。


这个理解是正确的。

---

# 补充 2：Tool Decision 存在“不确定性”

这个和你刚才的问题直接相关。

LLM 决策：

不是：

```text
if need_tool=true
```

而是：

```text
confidence
```

例如：

用户：

> 帮我看看服务器状态


LLM：

候选：

```
check_server_status
0.85

search_web
0.10

answer_directly
0.05
```

---

但是：

用户：

> 服务器是不是挂了？

可能：

```
check_server_status
0.55

answer_directly
0.45
```

这时候 Runtime 可以介入：

例如：

```ts
if confidence < threshold {

    require_confirmation()

}
```

或者：

```text
低置信度

↓

重新规划

↓

询问用户
```


这就是后面：

- Human Approval
- Reflection
- Self Correction

的基础。

---

# 到这里 Day05 Part B 完整认知链应该是：

```text
                Context

                  |
                  v

          LLM Decision Layer


                  |
        +---------+---------+

        Understand Intent

                  |

          Select Action

                  |

        Generate Tool Call


                  |
                  v


          Runtime Validation


                  |
                  v


          Tool Execution

```

---

# 我建议 Part B 正式笔记增加两个章节：

## 7. Tool Decision 的两阶段模型

内容：

```text
Intent Understanding

↓

Action Selection

↓

Tool Call
```


---

## 8. Tool Decision 的不确定性与 Runtime 控制

内容：

```text
LLM produces decision

but Runtime controls execution
```


包括：

- confidence
- fallback
- retry
- human approval


---

# 但是到这里，我建议不要继续扩展。

原因：

再往下就是：

## Part C：Tool Schema

会讨论：

> 为什么一个好的 Tool 描述，会提高 Tool Decision 准确率。


再往后：

## Part F：Permission

会讨论：

> Runtime 如何处理 LLM 不可靠决策。


所以 Part B 现在刚好停在：

```text
LLM 决策层
```

的位置。


---

## Day05 当前学习进度

现在：

```
Day05 Tool Calling

✅ Part A
Tool Calling 基础模型

✅ Part B
LLM Tool Decision

⬜ Part C
Tool Schema Design

⬜ Part D
Tool Registry

⬜ Part E
Tool Executor

⬜ Part F
Permission & Human Approval

⬜ Part G
Tool Result Feedback

⬜ Part H
Multi Tool Loop

⬜ Part I
Mini Tool Runtime
```


下一节 Part C 会进入一个我认为非常核心的主题：

> **Tool Schema Engineering：为什么 Agent 的能力边界，本质上由 Tool 设计决定。**

这一节会和你之前研究 Claude Code、企业 Agent、Context Engineering 的思考连接起来。你之前说：

> “企业 Agent 更多是流程固化”

Part C 会解释：

**流程固化之外，Agent 能力上限其实还取决于 Runtime 暴露给 LLM 的能力模型。**

所以 Part B 到这里可以正式收尾。你今天的学习量刚好。👍

## 13. User

你的补充 1 不就是我们之前反复提到的 LLM 需要先确定 goal

## 14. Assistant

对，你这个联想是**完全正确的**。

而且我觉得这里需要做一个概念对齐：我刚才补充的「Tool Decision 两阶段模型」，其实就是我们前面 Day01～Day04 一直在铺垫的 **Goal → Plan → Action** 这条链路。

只是到了 Tool Calling 阶段，它换了一个工业术语：

之前我们叫：

```text
Goal Understanding
```

到了 Tool Decision：

```text
Intent Understanding
+
Action Selection
```

本质是一回事。

---

## 回到我们之前的 Agent Runtime 模型

我们之前一直强调：

Agent 不是：

```text
User Input
    |
    v
LLM
    |
    v
Tool
```

而是：

```text
User Request

      |
      v

Goal Understanding
      |
      v

Task Representation
      |
      v

Planning / Decision
      |
      v

Action Selection
      |
      v

Tool Call
      |
      v

Observation
```

所以你指出的：

> “不就是之前反复提到的 LLM 需要先确定 goal”

是对的。

---

# 那为什么 Part B 还要重新讲？

因为之前我们讲 Goal，是站在：

## Agent 如何理解任务

这个角度。


例如：

用户：

> 帮我分析这个项目为什么启动失败


Runtime：

LLM 应该理解：

```text
Goal:

Find root cause of startup failure
```

---

但是 Part B 进入 Tool Calling 后，我们关注的是：

## Goal 如何转换成 Action

也就是：

知道目标以后：

下一步怎么办？

例如：

Goal:

```text
Find startup failure reason
```

候选 Action：

```text
A.
直接回答

B.
读取 package.json

C.
查看错误日志

D.
运行 npm install
```


于是：

Decision Layer：

```text
Goal
 |
 v
Possible Actions
 |
 v
Select Action
```

---

所以两者关系：

```text
            User Request

                  |
                  v

          Goal Understanding
          （我要解决什么问题）

                  |
                  v

          Action Decision
          （下一步做什么）

                  |
                  v

             Tool Call
          （如何执行）


```

---

# 这其实也是为什么 Agent Loop 不是简单 ReAct

很多资料讲：

```
Thought
Action
Observation
```

容易让人误解：

LLM：

> 想一下，然后调用工具。


但工业 Runtime 更接近：

```
Understand Goal

↓

Maintain Task State

↓

Choose Next Action

↓

Execute

↓

Observe

↓

Update Goal Progress

```

这里：

Goal 是长期稳定目标。

Action 是短期一步行为。

---

举一个 Claude Code 的例子。

用户：

> 优化这个函数性能


Goal：

```text
Improve function performance
```

不是：

```text
edit file
```


LLM 可能选择：

Step 1:

```text
ReadFile
```

为什么？

因为：

当前 Action：

```text
Need understand code first
```

---

读取后：

Observation：

```text
Found O(n²) loop
```

下一轮：

Goal 不变：

```text
Improve performance
```

Action 改变：

```text
EditFile
```

再下一轮：

Action：

```text
RunTest
```

所以：

Goal：

```text
长期目标
```

Action：

```text
完成目标过程中的一步
```

---

# 这也解释一个容易混淆的问题

为什么 Agent 不应该每次重新决定目标？


错误理解：

```
Loop:

重新理解用户
重新决定目标
重新调用工具
```

实际上：

Runtime State 保存：

```ts
{
 goal:"optimize function",
 progress:[
   "read file",
   "found issue"
 ],
 nextAction:"edit"
}
```


所以：

Agent：

```
Goal
 |
 |
保持
 |
 v
Action不断变化
```

---

# 回到 Day05 Part B

所以我会调整一下这个补充的表达。

之前写：

> Tool Decision 有两个阶段：
> Intent Understanding → Action Selection


对于我们的课程体系，我觉得应该改成：

更符合前面章节：

## Tool Decision = Goal-driven Action Selection

即：

```
User Request

↓

Goal Understanding

↓

Current Task State

↓

Candidate Actions

↓

Select Tool

↓

Execute
```

这样和 Day04：

```
Runtime State
Context Builder
Goal
Memory
```

全部连起来。


---

# 其实你这个问题说明一个很好的点

你已经开始发现：

Day05 不是新的知识点。

它是在补齐之前 Runtime 架构缺失的一半：

Day04：

```
Runtime 如何让 LLM 思考
```

核心：

```
Context Engineering
```

Day05：

```
Runtime 如何让 LLM 行动
```

核心：

```
Action Engineering
```

而 Action Engineering 的第一步：

就是：

```
Goal → Action
```

所以你这个问题非常准确。

---

我会把 Part B 的最终版本调整为：

```
Day05 Part B：LLM Tool Decision

1. Tool Decision 的本质
2. Goal Understanding（复用 Day01-04）
3. Goal-driven Action Selection
4. 为什么 Tool 存在 ≠ 一定调用
5. Tool Decision 三因素：
   - Context
   - Tool Definition
   - Runtime Policy

6. Decision Layer 与 Execution Layer 分离
7. Tool Decision 的不确定性

```

这样整个学习链路会更统一。

你刚才这个纠正其实是对章节设计的优化：**不要把 Agent 的 Goal 理解和 Tool Decision 割裂开。** 这正是我们前面学习 Runtime 的核心思想。

## 15. User

好的 谢谢你 还有要补充的吗 没有的话我们这一part 就结束

## 16. Assistant

好的，我最后再做一次 Part B 的收口检查。

按照我们之前定的学习标准：

一个 Part 结束需要满足：

1. 核心认知闭环 ✅  
2. 和 Runtime 架构连接 ✅  
3. 工业术语映射 ✅  
4. 面试表达能力 ✅  
5. 为下一 Part 铺垫 ✅  

我认为 **Day05 Part B 已经可以结束，没有必要继续扩展。**

---

不过在正式结束前，我补充一个「隐藏但重要」的认知点，作为 Part B 的最后一句话即可，不展开。

# 最后补充：Tool Decision 本质是 Runtime 的控制权分配问题

这个是连接后面所有章节的核心。

很多人理解 Agent：

```text
LLM
+
Tools
=
Agent
```

但工业 Runtime 实际关心：

> 谁拥有下一步行动的决定权？


有三种模式：

---

## 模式 1：完全由 LLM 决定

```text
User
 |
 v
LLM

决定：

- 是否调用 Tool
- 调哪个 Tool
- 参数是什么

 |
 v

Runtime执行
```

优点：

灵活。

缺点：

不可控。


---

## 模式 2：完全由 Workflow 决定

例如：

客服：

```text
用户退款

↓

固定流程

↓

查询订单

↓

检查规则

↓

退款
```

流程：

```text
Workflow
    |
    v
Tool
```

优点：

稳定。

缺点：

泛化弱。


---

## 模式 3：工业 Agent（主流）

实际上更多是：

```text
                Goal

                 |
                 v

          LLM Decision

                 |
                 v

        Runtime Policy

                 |
                 v

            Tool Call

                 |
                 v

          Workflow Constraint

                 |
                 v

           Execution
```

也就是：

> LLM 提出行动建议，Runtime 决定是否允许这个行动发生。


这就是为什么企业 Agent 通常不是：

```text
LLM + Tools
```

而是：

```text
LLM
+
Workflow
+
Tools
+
Runtime Control
```

这也和你之前一直提到的：

> 企业 Agent 更多是业务流程固化

完全一致。

---

# 所以 Day05 Part B 最终核心认知升级

从：

> LLM 会不会调用 Tool？

升级为：

> Agent Runtime 如何让 LLM 在目标约束下选择下一步行动。


完整链路：

```text
User Request

      |
      v

Goal Understanding
      |
      v

Runtime State

      |
      v

Context Builder

      |
      v

LLM Decision

      |
      v

Action Selection

      |
      v

Tool Call Intent

      |
      v

Runtime Control

      |
      v

Tool Execution

```

---

# Day05 Part B 正式结束 ✅


## 下一节学习计划

进入：

# Day05 Part C：Tool Schema Design（Tool 能力建模）


这一节会回答：

1. 为什么 Tool Schema 是 Agent 的 API Contract？
2. 为什么 Tool Description 会影响模型行为？
3. 为什么一个万能 Tool 是坏设计？
4. 为什么 Claude Code 要拆很多小 Tool？
5. Tool Schema 如何决定 Agent 能力边界？
6. 如何设计工业级 Tool？


这一节其实会连接：

```text
Day04 Context Engineering

        +

Day05 Tool Schema Engineering

        ↓

Agent Behavior Engineering
```

---

## 写书 TODO

增加：

### 「Tool Decision = Goal-driven Action Selection」

不要把 Tool Decision 单独描述为：

> LLM 选择函数。

应该描述：

> Agent 首先理解 Goal，然后基于当前 Runtime State 和 Available Capability，选择下一步 Action。


---

## 写书素材

一句比较适合放书里的总结：

> Tool Calling is not about giving an LLM access to functions. It is about giving an Agent Runtime a controlled action space where the model can propose the next step and the runtime can decide how that step is executed.

中文：

> Tool Calling 的本质不是让模型拥有函数调用能力，而是 Runtime 为 Agent 建立一个受控行动空间，让模型提出下一步行动，让 Runtime 负责验证、约束和执行。

---

## 🏗️ 工业级实现（Industrial Notes）

工业 Agent 中：

Tool Decision 通常不是孤立存在：

```text
Goal Manager
      |
Task Planner
      |
Decision Layer
      |
Policy Engine
      |
Tool Runtime
```

简单 Agent：

```text
LLM → Tool
```

生产 Agent：

```text
LLM → Decision → Policy → Execution
```

---

## 🧭 知识地图（Knowledge Map）

目前 Agent Runtime 认知：

```text
                Agent Runtime


              Thinking System

Day04
 |
 +-- Runtime State
 |
 +-- Context Builder
 |
 +-- Context Window Management
 |
 +-- Provider Adapter


              Acting System

Day05
 |
 +-- Tool Calling
 |
 +-- Tool Decision   ✅
 |
 +-- Tool Schema
 |
 +-- Tool Registry
 |
 +-- Tool Executor
 |
 +-- Permission
 |
 +-- Observation Feedback
 |
 +-- Multi Tool Loop

```

---

## 面试视角

现在如果被问：

### “Agent 为什么不是 LLM + Tools？”

可以回答：

> Tools 只是 Agent 的执行能力，而 Agent 还需要 Runtime 管理 Goal、Context、Decision、Policy 和 Execution。LLM 负责推理和提出行动意图，Runtime 负责控制行动闭环。


---

## 本章思考题

1. 为什么 Tool 存在不代表 Agent 一定会调用？
2. Tool Decision 和普通函数调用有什么区别？
3. 为什么 Goal Understanding 是 Tool Decision 的前置？
4. 为什么企业 Agent 通常不会完全把 Tool 决策权交给 LLM？
5. Runtime Policy 在 Tool Decision 中有什么作用？


---

到这里 Day05 Part B 可以正式归档。

下一次我们进入 **Day05 Part C：Tool Schema Design**。

这一节我认为会比 Part B 更接近真实 Agent 工程，因为它开始进入：

> **“如何设计 Agent 的能力边界。”** 这一层。
