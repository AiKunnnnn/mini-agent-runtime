# Day05 Part D ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a69b440-0350-83e8-aefb-6671a4295440
- 会话标题：Day05 Part D Tool Registry（页面元数据标题截断）
- 抽取时间：2026-07-29

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part D 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05 part c 的学习笔记与 day05 的readme，你看一下，然后我们开启 part D 的学习吧

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Assistant

我已经认真看完了 Part C 和 Day05 README。

先说结论：

> **Day05 Part C 的内容已经比较完整，可以认为这一 Part 已经达到工业级入门深度了。**

它已经不仅仅讲了 Function Calling，而是真正开始进入 **Tool Engineering（工具工程）** 这一层了。

---

# 我对 Part C 的评价

如果按照我们现在这本《从零实现 Agent Runtime》的定位，我给它打：

> **9.8 / 10**

原因：

它已经覆盖了真正工业 Agent 中 Tool 的几个核心维度：

✅ Tool Schema 为什么存在

✅ Action Contract

✅ Tool Granularity（工具粒度）

✅ Capability Boundary（能力边界）

✅ Input / Output / Error Schema

✅ Semantic Schema（这一节其实很多教程都不会讲）

✅ Runtime Metadata

✅ Tool Evaluation

✅ Agent-oriented API Design

甚至已经开始往：

> Runtime Policy
>
> Permission
>
> Human Approval

这些后面章节铺垫。

所以 Part C 基本不用大改。

---

# 但是 Part C 留了一个"最大的坑"

其实你在最后已经埋下来了：

```
不要把所有 Tool Schema 一次性塞给 LLM
```

然后：

```
Action Space 爆炸
```

这里就是 Part D。

而且——

**这其实是整个 Tool Calling 真正进入 Runtime 的地方。**

因为：

Part C 一直都默认：

```
LLM 能看到所有 Tool
```

但真实世界不是这样。

例如 Claude Code：

```
500+
Tools
```

Cursor：

```
几十个 Tools
```

OpenAI Agents SDK：

```
上百个 MCP Tool
```

企业 Agent：

```
订单
物流
库存
CRM
邮件
知识库
审批
...
```

LLM 不可能每轮都看到全部。

所以 Runtime 必须回答：

> **这一轮，到底给 LLM 看哪些 Tool？**

这就是 Tool Registry。

---

# 所以 Part D 在整个 Runtime 中的位置

我建议 Day05 Part D 一开始就先画这一张图。

```
                    Runtime

              +----------------+
              | Tool Registry  |
              +----------------+
                      |
      ------------------------------
      |            |              |
      v            v              v

 Search Tool   Order Tool    Email Tool
 Read Tool     Refund Tool   Calendar

      ------------------------------
                      |
                      v

          Tool Selector / Routing
                      |
                      v

            Current Available Tools
                      |
                      v

                Context Builder
                      |
                      v

                     LLM
```

一句话：

> **Registry 管的是"所有能力"，LLM 每轮只看到"当前能力"。**

这是整个 Part D 的一句话总结。

---

# 我建议 Part D 不只是 Registry，而是升级一下

README 目前写的是：

```
Tool Registry
```

我建议 Part D 实际内容叫：

> **Tool Registry & Capability Management**

因为真正 Registry 不只是：

```
Map<String, Tool>
```

如果只是：

```ts
registry.register(tool)
```

那这一章十分钟就结束了。

真正工业 Runtime 的 Registry，其实负责：

```
Capability Management
```

即：

```
有哪些 Tool

↓

怎么分类

↓

什么时候暴露

↓

哪些用户能用

↓

哪些 Agent 能用

↓

哪些需要审批

↓

Tool Discovery

↓

MCP Discovery

↓

Dynamic Loading

↓

Tool Routing
```

这才是真正 Registry。

---

# 我建议 Part D 的目录

这是我建议的新目录。

---

## 1 Tool Registry 为什么存在

先回答：

为什么不能：

```
tools = [...]
```

全部给 LLM。

引出：

Action Space Explosion。

---

## 2 Tool Registry 是什么

定义：

```
Registry
=
Capability Catalog
```

不是：

```
Map<String, Tool>
```

而是：

```
Runtime Capability Center
```

---

## 3 Tool Definition 与 Tool Implementation 分离

这一节很重要。

例如：

```
Tool Definition

↓

name
description
schema
permission

↓

Tool Implementation

↓

真正 NodeJS 函数
```

这也是很多 Agent SDK 都这么设计。

---

## 4 Tool Registration

介绍：

```
register()

unregister()

update()

discover()
```

---

## 5 Tool Discovery

开始介绍：

```
Static

vs

Dynamic
```

例如：

```
MCP
```

为什么叫：

Discovery。

---

## 6 Tool Routing

这是 Part D 最重要的一节。

例如：

```
1000 个 Tool

↓

Router

↓

8 个 Tool

↓

LLM
```

这里其实就是：

```
Capability Selection
```

也是：

```
Action Space Optimization
```

---

## 7 Registry 与 Context Builder

这是我希望补进去的。

因为：

Day04 学的是：

```
Context Builder
```

Day05 学：

```
Registry
```

其实：

```
Context Builder

↓

组装 Context

↓

其中一部分

↓

Tool Schema
```

而：

```
Registry

↓

负责提供 Tool Schema
```

所以真正关系应该画成：

```
Registry
      |
      v

Current Tools

      |

Context Builder

      |

Prompt

      |

LLM
```

很多教程不会把这两个串起来。

但我们这本书一定要串。

---

## 8 MCP 与 Registry

终于开始连接：

```
MCP Server

↓

Discovery

↓

Registry

↓

Context Builder

↓

LLM
```

这一章结束以后。

MCP 就不再神秘。

---

## 9 mini-agent-runtime

开始设计：

```ts
class ToolRegistry {

 register()

 unregister()

 get()

 list()

}
```

但是这里只写最小版。

下一章再讲 Executor。

---

# 这一章最大的认知升级

我希望最终形成这一句话。

以前认为：

```
Tool Registry
=
Tool Map
```

学完以后升级成：

```
Tool Registry
=
Runtime 的 Capability Management Center
```

也就是：

```
Context Builder

负责管理：

LLM 看见什么

——————————

Tool Registry

负责管理：

LLM 能做什么
```

这两者一左一右，共同决定 Agent 的行为。

```
              Runtime

      +----------------------+
      |  Context Builder      |
      +----------------------+
            |
            | What to See
            |
            v

            LLM

            ^
            |
            | What Can Do
            |
      +----------------------+
      |   Tool Registry      |
      +----------------------+
```

到这里，Day04 与 Day05 就真正连接起来了。**这也是我建议 Part D 的主线**：不要把 Registry 当作一个简单的数据结构，而要把它讲成 **Agent Runtime 的能力管理中心（Capability Management Center）**。

---

## 📚 下一节学习计划（Day05 Part D）

下一节我们正式进入：

> **Day05 Part D：Tool Registry（Capability Management Center）**

重点回答这些问题：

1. 为什么 Runtime 不能把所有 Tool 一次性交给 LLM？
2. Tool Registry 在 Agent Runtime 中到底承担什么职责？
3. Tool Definition 和 Tool Implementation 为什么要分离？
4. Runtime 如何注册、发现、管理 Tool？
5. Tool Routing 如何降低 Action Space？
6. Tool Registry 如何与 Context Builder 协同工作？
7. MCP 的 Tool Discovery 为什么本质上就是 Registry 的动态扩展？
8. mini-agent-runtime 如何实现一个工业思路、最小可运行的 Tool Registry？ memcite

## 7. User

开始学习 part D

## 8. Assistant

# Day05 Part D：Tool Registry（Capability Management Center）

## 本节定位

我们已经完成：

- Part A：Tool Calling 基础模型

回答：

> Agent 如何从“聊天模型”变成“行动系统”？

核心：

```text
LLM
 |
 | Tool Call Intent
 v
Runtime
 |
 | execute
 v
Tool
 |
 | Observation
 v
Runtime State
```

---

- Part B：Tool Decision

回答：

> LLM 为什么选择调用某个 Tool？

核心：

```text
Goal Understanding
        |
        v
Action Selection
        |
        v
Tool Call Intent
```

---

- Part C：Tool Schema

回答：

> Runtime 如何描述自己的能力，让 LLM 理解？

核心：

```text
Tool Schema

=
LLM 与 Runtime 的 Action Contract
```

---

但是到这里出现一个新的问题：

假设现在 Runtime 有：

```text
search_files

read_file

write_file

run_test

git_diff

query_order

create_refund

send_email

calendar

web_search

database_query

...
```

100 个 Tool。

怎么办？

难道每次请求：

```text
把全部 Tool Schema

↓

塞给 LLM
```

吗？

答案：

> 不行。

这就是 Part D。

---

# Part D 核心问题

本节回答：

> Runtime 如何管理大量 Tool，并决定当前 Agent 可以使用哪些能力？


核心概念：

```text
Tool Registry
```

但是今天我们不要简单理解成：

```ts
Map<string, Tool>
```

工业级理解：

> Tool Registry 是 Agent Runtime 的 Capability Management Center（能力管理中心）。

---

# 1. 为什么需要 Tool Registry？

## 1.1 最简单的 Agent

假设：

```ts
const tools = [
  searchFiles,
  readFile,
  writeFile
]
```

然后：

```text
User:

帮我找一下登录代码


Runtime:

把三个 Tool 给 LLM

↓

LLM 决策
```

没问题。

---

但是如果：

```text
Tool 数量：

10

100

1000
```

问题出现。

---

## 问题一：Action Space 爆炸

Part B 我们讲过：

LLM 本质是在选择：

```text
Final Answer

Tool A

Tool B

Tool C

...
```

如果：

```text
10 个 Tool
```

模型需要比较：

```text
10 个 Action
```

如果：

```text
1000 个 Tool
```

模型需要比较：

```text
1000 个 Action
```

这叫：

```
Action Space Explosion
```

行动空间爆炸。

---

举个例子：

企业客服 Agent：

有：

```text
订单查询

物流查询

退款申请

取消订单

修改地址

会员查询

积分查询

优惠券查询

发票查询

投诉创建

人工转接

...
```

如果用户问：

> 我的包裹什么时候到？


理论上模型看到：

```text
query_order_status

create_refund

cancel_order

update_address

...
```

它需要在几十个能力里选择。

实际上：

真正相关的只有：

```text
query_order_status
```

所以 Runtime 应该提前缩小范围。

---

## 1.2 Tool 越多，模型一定越好吗？

很多人的直觉：

> Tool 越多，Agent 越强。

实际上：

不一定。


原因：

Agent 能力：

不是：

```
Tool 数量
```

而是：

```
有效 Action Space
```

---

举例：

给 LLM：

100 个 Tool：

```
10 个相关
90 个无关
```

和：

给 LLM：

5 个 Tool：

```
全部相关
```

第二种通常效果更好。

因为：

模型注意力有限。

---

所以：

Runtime 需要：

```
所有能力

↓

筛选

↓

当前任务相关能力

↓

LLM
```

中间这个管理中心：

就是：

```
Tool Registry
```

---

# 2. Tool Registry 是什么？

先看一个错误理解：

```text
Tool Registry

=
存 Tool 的地方
```

类似：

```ts
Map<string, Function>
```

例如：

```ts
{
 search_files: fn,
 read_file: fn,
 write_file: fn
}
```

这只是最基础版本。

---

工业 Runtime 中：

Tool Registry：

更像：

```
Capability Database
```

能力数据库。


里面保存：

```text
Tool Identity

Tool Description

Input Schema

Output Schema

Permission

Risk Level

Category

Availability

Version

Owner

Metadata
```

---

例如：

```json
{
  "name": "query_order_status",

  "description":
  "Query customer order delivery status",

  "category":
  "order",

  "inputSchema": {},

  "metadata": {

    "riskLevel": "low",

    "sideEffect": "read",

    "permission":
    "customer.order.read"

  }
}
```

---

所以：

Tool Registry 管理的是：

```
Capability

不是 Function
```

---

# 3. Tool Registry 在 Runtime 架构中的位置

结合 Day04：

我们之前有：

```
User

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

现在加入 Registry：

```
                    Runtime


          +----------------+
          | Tool Registry  |
          +----------------+

                  |

                  |

                  v


          Available Tools


                  |

                  v


          +----------------+
          | Context Builder|
          +----------------+

                  |

                  v


                 LLM
```

---

注意：

这里有一个非常重要的关系：

## Context Builder 决定：

```
LLM 看什么
```

## Tool Registry 决定：

```
LLM 能做什么
```

---

二者结合：

```
Agent Behavior

=

Context

+

Action Space
```

---

也就是说：

Day04：

解决：

```
Information Space
```

信息空间。


Day05：

解决：

```
Action Space
```

行动空间。

---

# 4. Tool Definition 与 Tool Implementation 分离

这是工业 Agent 一个非常重要的设计。

---

普通代码：

```ts
function searchFiles(query){

}
```

这里：

代码本身就是能力。


但是 Agent Runtime：

需要拆开：

---

## Tool Definition

描述：

```text
给 LLM 看
```

例如：

```ts
{
 name:"search_files",

 description:
 "Search files in workspace",

 inputSchema:{
   query:"string"
 }
}
```

---

## Tool Implementation

真正执行：

```ts
async function searchFiles(query){

  return fs.search(query)

}
```

---

关系：

```
             Tool

              |

     -------------------

     |                 |

 Definition       Implementation


给 LLM               给 Runtime

理解能力              执行动作

```

---

为什么要拆？


## 原因 1：同一个能力，多种实现

例如：

```
search_files
```

可以：

本地：

```
ripgrep
```

云端：

```
Code Search API
```

但是对于 LLM：

都是：

```
search_files
```

---

## 原因 2：权限控制

LLM 看到：

```
delete_file
```

但是 Runtime 可以决定：

```
requiresApproval=true
```

---

## 原因 3：动态加载

例如 MCP：

今天：

```
GitHub Tool
```

上线。

明天：

```
Jira Tool
```

上线。

不需要改 Agent 核心代码。

---

# 5. Tool Registry 基础能力

一个最小 Registry：

```ts
class ToolRegistry {

 private tools = new Map()


 register(tool){

 }


 get(name){

 }


 list(){

 }


 remove(name){

 }

}
```

---

例如：

注册：

```ts
registry.register({

 name:"search_files",

 description:"Search files",

 execute:searchFiles

})
```

---

获取：

```ts
registry.get(
 "search_files"
)
```

---

全部：

```ts
registry.list()
```

---

这就是最小版本。

---

但是工业版本：

还需要：

```
discover()

filter()

search()

authorize()

```

---

# 6. Tool Discovery（能力发现）

这是 Part D 一个重要概念。

为什么？

因为未来：

Tool 不一定写死在代码里。


例如 MCP：

```
MCP Server

       |

       |

       v

Tool List

       |

       |

       v

Runtime Registry
```

---

比如：

启动 Runtime：

发现：

```
GitHub MCP Server

提供:

create_issue

search_repo

get_pr
```

然后注册：

```
Tool Registry
```

---

所以：

Registry 不一定只是：

```
register()
```

还包括：

```
discover()
```

---

工业术语：

```
Capability Discovery
```

能力发现。

---

# 7. Static Registry vs Dynamic Registry

## Static Registry

代码写死：

```ts
registry.register(
 searchFiles
)
```

特点：

简单。

适合：

```
小型 Agent
```

---

## Dynamic Registry

运行时发现：

例如：

```
MCP

Plugin System

Enterprise Service Discovery
```

流程：

```
Runtime Start

    |

Discover Available Tools

    |

Register

    |

Expose To LLM
```

---

现代 Agent 越来越偏向：

Dynamic Capability System。

---

# 8. Tool Routing：Registry 的核心升级

这里是 Part D 最重要部分。

Registry 不应该只是：

```
存储
```

而应该：

```
筛选
```

---

例如：

现在：

1000 Tools。

用户：

```
帮我修改代码
```

Registry：

先判断：

任务类型：

```
coding
```

然后：

过滤：

```
search_files

read_file

edit_file

run_test
```

输出：

```
4 Tools
```

给 LLM。

---

流程：

```
1000 Tools

     |

     v

Tool Router

     |

     v

Relevant Tools

     |

     v

LLM
```

---

这叫：

```
Tool Routing
```

---

# 9. Tool Registry 与 MCP 的关系

现在可以理解 MCP 了。

很多人认为：

MCP：

```
AI 调工具协议
```

太浅。

更准确：

MCP：

```
标准化 Capability Discovery Protocol
```

---

流程：

```
MCP Server

提供能力

      |

      v

Runtime Discovery

      |

      v

Tool Registry

      |

      v

Context Builder

      |

      v

LLM
```

---

所以：

MCP 解决：

```
工具如何被发现
```

Registry 解决：

```
工具如何被管理
```

---

# 本 Part 核心认知升级（暂）

完成 Part D 后：

以前：

```
Tool Registry

=
工具列表
```

升级：

```
Tool Registry

=

Agent Runtime 的 Capability Management Center
```

进一步：

```
Context Builder

决定:

LLM 看什么


Tool Registry

决定:

LLM 能做什么
```

最终：

```
Agent Behavior

=

Context Engineering

+

Capability Engineering
```

---

# 下一节 Part D 后半部分

下一节继续深入：

## Part D-2：工业级 Tool Registry 设计

重点：

1. Tool Registry 数据模型设计
2. Tool Metadata 设计
3. Tool Category 分类
4. Tool Permission 如何接入 Registry
5. Tool Routing 如何实现
6. Registry 如何和 Context Builder 结合
7. MCP Dynamic Discovery
8. mini-agent-runtime 实现

---

这一节先建立核心认知：

> **Tool Registry 不是一个 Map，而是 Runtime 管理 Agent 能力边界的核心系统。**

下一节我们继续进入工业实现层。

## 9. User

继续学习

## 10. Assistant

# Day05 Part D-2：工业级 Tool Registry 设计

上一节我们建立了核心认知：

> **Tool Registry 不是工具列表，而是 Agent Runtime 的 Capability Management Center（能力管理中心）。**

这一节开始进入工业实现。

我们重点解决：

1. Tool Registry 内部应该存什么？
2. Tool Metadata 为什么重要？
3. Tool 如何分类？
4. Runtime 如何筛选 Tool？
5. Tool Registry 如何连接 Context Builder？
6. MCP 为什么天然需要 Registry？

---

# 1. 工业级 Tool Registry 数据模型

先回忆 Part C：

一个 Tool 最基础：

```ts
{
  name,
  description,
  parameters
}
```

这是：

> 给 LLM 看的能力描述。

但是 Registry 管理的是完整能力。

所以工业模型通常类似：

```ts
type ToolDefinition = {

  // LLM 可见
  name: string;

  description: string;


  // 输入输出契约
  inputSchema: JSONSchema;

  outputSchema?: JSONSchema;


  // Runtime 管理
  metadata: ToolMetadata;


  // 真正执行函数
  execute: ToolExecutor;
}
```

---

展开：

```ts
type ToolMetadata = {

  category: string;


  riskLevel:
    | "low"
    | "medium"
    | "high";


  sideEffect:
    | "read"
    | "write"
    | "external";


  permission?: string;


  timeoutMs: number;


  requiresApproval: boolean;

}
```

---

注意这里一个关键设计：

## Tool Definition = LLM 世界

## Metadata = Runtime 世界


也就是：

```text
                Tool

                 |

     ----------------------------

     |                          |

 Tool Schema              Tool Metadata


给 LLM                    给 Runtime


理解能力                   控制能力
```

---

这和 Part C 最后讲的一样：

不要混淆：

```text
模型知道什么

vs

系统允许什么
```

---

# 2. 为什么 Tool Metadata 必须存在？

假设有一个 Tool：

```text
delete_file
```

Schema：

```json
{
"name":"delete_file",
"description":
"Delete a file"
}
```

LLM 看：

> 可以删除文件。

但是 Runtime 需要知道：

更多东西：

```text
危险吗？

需要确认吗？

谁可以调用？

有没有副作用？

是否可以重试？
```

所以：

Metadata：

```json
{
"name":"delete_file",

"metadata":{

"riskLevel":"high",

"sideEffect":"write",

"requiresApproval":true

}
}
```

---

这就是：

## Capability 与 Control 分离

工业系统一定要分：

```text
What can do

和

Should do
```

---

类似：

银行系统。

API：

```text
transfer_money
```

告诉系统：

> 可以转账。

但是：

权限系统：

告诉系统：

> 当前用户是否允许转账。

Agent 也是一样。

---

# 3. Tool Category（工具分类）

当 Tool 数量增加：

Registry 需要分类。


例如：

Coding Agent：

```text
coding

 ├── file
 │
 │   ├── search_files
 │   ├── read_file
 │   └── edit_file
 │
 ├── git
 │
 │   ├── git_diff
 │   └── git_commit
 │
 └── test
     
     └── run_test
```

---

企业客服：

```text
customer_service


 ├── order

 │   ├── query_order_status
 │   └── cancel_order


 ├── payment

 │   └── refund


 └── customer

     └── query_profile
```

---

为什么分类重要？

因为 Router 可以先过滤类别。

例如：

用户：

> 我的订单在哪里？

先判断：

```text
domain = order
```

然后：

只搜索：

```text
order tools
```

而不是：

```text
全部 500 tools
```

---

这就是：

```text
Hierarchical Tool Routing
```

分层工具路由。

---

# 4. Tool Routing 的两阶段设计

工业 Agent 很少：

直接：

```text
1000 Tools -> LLM
```

而是：

两阶段。

---

## Stage 1：Tool Retrieval

类似知识库检索。

先找候选。

例如：

全部：

```text
1000 Tools
```

↓

Retriever：

```text
用户：
我要查订单

```

找到：

```text
query_order_status

refund_order

cancel_order
```

---

## Stage 2：LLM Decision

然后：

```text
3 Tools

+

User Goal

+

Context

↓

LLM
```

决定：

```text
query_order_status
```

---

架构：

```text
                 User Request

                       |

                       v


              Tool Retriever


                       |

                       v


             Candidate Tools

                 (Top K)


                       |

                       v


                    LLM


                       |

                       v


                 Tool Selection
```

---

这里其实和 Day04 的 Memory Retrieval 很像。


Memory：

```text
大量历史信息

↓

Retriever

↓

相关 Memory
```

Tool：

```text
大量能力

↓

Tool Retriever

↓

相关 Tool
```

---

所以：

> Tool Registry 和 Memory System 有非常强的结构相似性。

---

# 5. Tool Registry 与 Context Builder 的连接

这是 Part D 最重要的连接点。

回忆 Day04：

Context Builder：

负责：

```text
LLM 应该看到什么
```

现在：

Registry：

提供：

```text
LLM 可以做什么
```

二者组合：

```text
                 Runtime


        +-------------------+

        | Runtime State     |

        +-------------------+

                  |

                  v


        +-------------------+

        | Context Builder   |

        +-------------------+

                  |

                  |

        +-------------------+

        | Tool Registry     |

        +-------------------+

                  |

                  v


              LLM Context
```

---

最终给 LLM 的 Prompt：

不是：

```text
用户消息
```

而是：

```text
System Prompt

+

Conversation

+

Runtime State

+

Relevant Tools
```

---

所以：

Tool Registry 是 Context Builder 的一个输入源。

---

可以抽象：

```ts
buildContext({

 state,

 history,

 memory,

 tools: registry.getRelevantTools()

})
```

---

这就是：

## Tool-aware Context Engineering

工具感知的上下文工程。

---

# 6. Tool Registry 与 Permission 系统

前面 Part C 提到：

```text
Tool Metadata
```

现在展开。

假设：

两个用户：

用户 A：

普通客服。

用户 B：

管理员。


都有：

```text
refund_order
```

但是：

权限不同。


Registry：

存：

```json
{
"name":"refund_order",

"permission":

"order.refund"
}
```

Runtime：

检查：

```text
Current User Permission

        |

        v

Can use this Tool?
```

---

流程：

```text
User Request


    |

    v


Tool Registry


    |

    v


Permission Filter


    |

    v


Available Tools


    |

    v


LLM
```

---

注意：

权限过滤应该发生在 LLM 之前。

为什么？


错误方式：

给 LLM：

```text
refund_order
```

然后：

执行时拒绝。


问题：

LLM 已经知道这个能力存在。


更好的：

直接：

```text
不要暴露
```

---

这叫：

## Capability Security

能力安全。

---

# 7. Tool Registry 与 MCP

现在再看 MCP。

很多人第一次接触 MCP：

觉得：

> MCP 就是统一调用工具。


实际上：

更核心的是：

> MCP 解决 Agent 如何发现外部 Capability。


流程：

```text
                 MCP Server


                     |

                     |

              list_tools()


                     |

                     v


              Tool Registry


                     |

                     v


              Context Builder


                     |

                     v


                    LLM
```

---

例如：

GitHub MCP Server：

发现：

```text
search_repository

create_issue

get_pull_request
```

注册：

```text
Tool Registry
```

---

以后：

新增：

Jira MCP：

```text
create_ticket

query_ticket
```

Runtime 自动发现。


这就是：

Dynamic Capability System。

---

# 8. Static Registry vs Dynamic Registry

总结一下：

## Static

代码注册：

```ts
registry.register(searchFiles)
```

优点：

简单。

缺点：

扩展困难。


适合：

小 Agent。

---

## Dynamic

运行时发现：

```text
MCP

Plugin

Service Discovery
```

优点：

扩展能力强。

缺点：

系统复杂。

---

工业趋势：

越来越 Dynamic。

---

# 9. mini-agent-runtime 设计

现在设计一个简化版本。

---

## ToolRegistry

```ts
class ToolRegistry {


private tools =
new Map<string, ToolDefinition>();


register(tool){

this.tools.set(
tool.name,
tool
)

}



get(name){

return this.tools.get(name)

}



list(){

return [
...this.tools.values()
]

}



}
```

---

但是工业版：

增加：

```ts
findRelevantTools()
```

例如：

```ts
findRelevantTools({

task:"modify code"

})
```

返回：

```ts
[
search_files,
read_file,
edit_file
]
```

---

---

# 10. 本 Part 核心认知升级

到这里：

Tool Registry 的理解应该从：

---

初级：

```text
Tool Registry

=
存工具
```

---

升级：

```text
Tool Registry

=
管理 Agent 能力生命周期
```

---

进一步：

```text
Tool Registry

=
Runtime 的 Capability Management Center
```

负责：

```text
发现能力

注册能力

分类能力

筛选能力

控制能力

暴露能力
```

---

最终 Agent 架构：

```text
                 Runtime


        +----------------+

        | Tool Registry  |

        +----------------+

              |

              | Relevant Capability


              v


        +----------------+

        | Context Builder|

        +----------------+

              |

              |

              v


             LLM


              |

              |

              v


          Tool Call Intent


              |

              v


          Tool Executor
```

---

# 工业术语映射

| 本项目 | 工业术语 |
|-|-|
| Tool Registry | Capability Registry |
| Tool 管理 | Capability Management |
| Tool 筛选 | Tool Routing |
| Tool 发现 | Capability Discovery |
| 动态注册 | Dynamic Registration |
| 工具分类 | Capability Taxonomy |
| 权限过滤 | Capability Security |
| 候选工具 | Candidate Actions |
| 工具检索 | Tool Retrieval |
| 工具暴露 | Capability Exposure |

---

# 面试视角

## Q1：Tool Registry 和简单工具列表有什么区别？

回答：

> 简单工具列表只是存储可调用函数，而工业 Agent 中 Tool Registry 是能力管理中心，负责工具注册、发现、分类、权限控制、路由以及向 Context Builder 提供当前可用能力。


---

## Q2：为什么不能把所有 Tool 都给 LLM？

回答：

> 因为 Tool 数量增加会扩大 Action Space，导致模型决策困难、上下文浪费和错误调用概率增加。工业 Agent 通常通过 Tool Registry 和 Routing 机制先筛选候选工具，再交给 LLM 决策。


---

## Q3：Tool Registry 和 Context Builder 什么关系？

回答：

> Context Builder 决定 LLM 看见什么，而 Tool Registry 决定 LLM 可以使用什么能力。Registry 提供经过筛选的 Tool Schema，Context Builder 将其组合进最终 Context。


---

## Q4：MCP 和 Tool Registry 的关系？

回答：

> MCP 负责标准化外部能力发现和通信，Tool Registry 负责 Runtime 内部能力管理。MCP Server 暴露的工具最终通常需要进入 Runtime Registry，才能被 Agent 使用。


---

# 下一节学习计划

下一节进入：

# Day05 Part E：Tool Executor（执行引擎）

Part D 解决：

> Runtime 如何管理能力？

Part E 解决：

> Runtime 如何安全执行能力？

重点：

1. Tool Executor 为什么不是直接调用函数？
2. validate → execute → observe 完整链路
3. 超时控制
4. 重试机制
5. 幂等性
6. 错误捕获
7. Execution Context
8. Tool Result 标准化
9. mini-agent-runtime Executor 实现

下一节开始，Agent Runtime 才真正进入：

**Execution Layer（执行层）。**

## 11. User

part D 还有要补充的吗

## 12. Assistant

这个问题问得很好。

我重新审视了一下 Day05 Part D 的定位：

> Part C 解决 **单个 Tool 如何设计（Tool Schema Engineering）**
>
> Part D 解决 **大量 Tool 如何管理（Capability Management）**

目前 Part D 的主线已经完整：

```text
Tool Definition
        |
        v
Tool Registry
        |
        v
Tool Discovery
        |
        v
Tool Routing
        |
        v
Context Builder
        |
        v
LLM
```

作为学习路径来说，可以进入 Part E。

但是，如果目标是你现在这套：

> 从零实现 Agent Runtime + 工业级理解 + 面试能力

我建议 Part D 还有 **4 个补充点**，这些属于工业实现中非常关键，但是前面没有展开。

---

# 补充 1：Tool Registry 和 Tool Router 的边界

这是 Part D 最容易混淆的地方。

目前我们讲：

```text
Tool Registry
        |
        v
Tool Routing
```

但是二者不是一个东西。


## Tool Registry

负责：

> 管理有什么能力。


例如：

```json
[
 {
  "name":"search_files",
  "category":"coding"
 },
 {
  "name":"refund_order",
  "category":"order"
 }
]
```

它回答：

> 系统有哪些能力？


---

## Tool Router

负责：

> 当前任务需要哪些能力。


例如：

用户：

```
帮我看看登录代码
```

Router：

输入：

```
1000 Tools
```

输出：

```
search_files
read_file
git_diff
```

---

所以：

```text
                Tool Registry

                    |
                    |
              全部 Capability


                    |
                    v


              Tool Router


                    |
                    |

              当前 Candidate Tools

                    |
                    v


                   LLM
```

---

工业术语：

|概念|工业叫法|
|-|-|
|Tool Registry|Capability Catalog|
|Tool Router|Capability Retriever / Action Retriever|

---

这个补充非常重要。

因为很多 Agent 项目失败：

不是没有 Tool。

而是：

> Tool 太多，没有好的 Routing。

---

# 补充 2：Tool Routing 不一定依赖 LLM

这里其实是一个重要的工业设计思想。

很多人认为：

```
Tool Router = 让 LLM 选 Tool
```

其实不是。

LLM 是最后决策层。

前面可以有很多过滤。


例如：

## 方法 1：规则 Routing

```ts
if(task.includes("代码")){
 return codingTools
}

if(task.includes("订单")){
 return orderTools
}
```

---

## 方法 2：Embedding Routing

类似知识库：

把 Tool Description 做 embedding。


例如：

Tool：

```
query_order_status

查询订单物流状态
```

向量：

```
[0.23,0.51,...]
```


用户：

```
我的包裹什么时候到
```


检索：

```
query_order_status
```

---

## 方法 3：LLM Router


让一个小模型先分类：

```
这是订单问题还是代码问题？
```

---

工业系统通常：

混合：

```text
Rule

 +

Embedding

 +

Small LLM

 +

Main LLM
```

---

也就是说：

真正架构：

```text
User Request

      |

      v

Task Classifier

      |

      v

Tool Router

      |

      v

Candidate Tools

      |

      v

Main LLM
```

---

这个和你之前总结的：

> 企业 Agent = LLM + Workflow + Tools + Memory

其实高度一致。

企业不会把所有决策丢给大模型。

---

# 补充 3：Tool Registry 需要生命周期管理

这个是工业系统经常出现的。

目前：

```ts
register(tool)
```

太简单。


生产环境：

Tool 有生命周期：

```text
Created

   |

Registered

   |

Available

   |

Deprecated

   |

Disabled

   |

Removed
```

例如：

订单系统升级。

旧 Tool：

```
query_order_status_v1
```

不能立即删除。

可能：

```
v1 deprecated

v2 available
```

---

所以 Registry 需要：

```ts
{
 name:"query_order_status",

 version:"2.0",

 status:"active"
}
```

---

类似 API Gateway。

为什么？

因为 Agent 是线上系统。

Tool 变化会直接改变 Agent 行为。

---

# 补充 4：Tool Registry 需要 Evaluation

这个其实和 Part C 的 Tool Evaluation 连接。


为什么？

因为：

增加一个 Tool，可能导致旧行为变化。


例如：

以前：

用户：

```
搜索订单
```

模型调用：

```
query_order_status
```


后来新增：

```
search_database
```

结果：

模型：

```
search_database
```

错误。


所以 Tool Registry 变化需要测试。


工业叫：

## Capability Regression Testing


测试：

```
User Intent

      |

      v

Expected Tools

      |

      v

Actual Selected Tools
```

例如：

测试集：

```json
{
 "input":
 "我的快递在哪里",

 "expected":
 "query_order_status"
}
```


---

# 补充 5（额外）：Tool Registry 是 Agent Plugin System 的基础

这个和 MCP 强相关。

很多未来 Agent：

不是：

开发者写死：

```text
Tool A
Tool B
```

而是：

插件生态：


```
              Plugin

                 |

                 v


          Tool Registry


                 |

                 v


               Agent
```


例如：

Claude Code：

本质：

```
Core Runtime

+

Extensions

+

Tools
```

---

所以：

Tool Registry 是未来：

- MCP
- Plugin System
- Agent Marketplace

的基础设施。

---

# Part D 最终认知升级（补充版）

完成 Part D 后，建议你的笔记最终应该形成：

---

以前：

```
Tool Registry

=
保存工具
```

↓

现在：

```
Tool Registry

=
Agent Runtime 的能力管理中心
```

↓

工业级：

```
Tool Registry

负责：

1. Capability Storage
   能力存储

2. Capability Discovery
   能力发现

3. Capability Routing
   能力路由

4. Capability Security
   能力安全

5. Capability Lifecycle
   能力生命周期管理

6. Capability Evaluation
   能力评测
```

---

# 和前面章节串起来

现在整个 Runtime：

```
                 Runtime


        +-------------------+
        | Runtime State     |
        +-------------------+
                  |
                  v

        +-------------------+
        | Context Builder   |
        +-------------------+

                  |
                  |
                  v

        +-------------------+
        |       LLM         |
        +-------------------+

                  |
                  |
                  v

        +-------------------+
        | Tool Decision     |
        +-------------------+

                  |
                  v


        +-------------------+
        | Tool Registry     |
        +-------------------+

                  |
                  v

        +-------------------+
        | Tool Executor     |
        +-------------------+
```

---

# 我的建议

Part D 可以正式结束。

原因：

继续深入会进入两个方向：

1. **Tool Router / Retrieval 系统**
   - 更像一个独立章节
   - 涉及 Embedding、Classifier、Ranking

2. **Tool Lifecycle / Evaluation**
   - 更偏 Agent Platform 工程

它们不是 Part D 的核心。

如果继续塞进去，会破坏 Day05 的节奏。


所以建议：

✅ Part D 完成

下一节进入：

# Day05 Part E：Tool Executor（Execution Engine）

这一节会非常关键。

因为前面：

- Part A：Agent 会产生行动意图
- Part B：Agent 决定行动
- Part C：设计行动接口
- Part D：管理行动能力

下一步：

> Runtime 如何真正、安全、可靠地执行行动？


也就是：

```
Intent
  |
  v
Registry
  |
  v
Executor
  |
  v
Observation
```

这才是 Agent Runtime 真正的执行核心。

## 13. User

之前提到在识别到结束时候需要固化几个部分：

📚 下一节学习计划
📝 写书 TODO
📦 写书素材
🧠 本 Part 核心认知升级
💡 本章思考题（新增）

你是不是漏掉了   写书素材  写书 TODO

## 14. Assistant

你指出得对，这里是我遗漏了。

按照我们之前固定下来的学习章节结束模板，**每一个 Day Part 完成时都应该自动补齐这几个部分**：

1. 📚 下一节学习计划  
2. 📝 写书 TODO  
3. 📦 写书素材  
4. 🧠 本 Part 核心认知升级  
5. 💡 本章思考题  
6. 🏗️ 工业级实现（之前也固定加入）
7. 🎤 面试视角
8. 🔄 前置问题回收（Pending Questions，如果有）

刚才 Part D 我只输出了：

- 🧠 本 Part 核心认知升级
- 工业术语映射
- 面试视角
- 下一节学习计划

但是漏掉了：

- 📝 写书 TODO
- 📦 写书素材
- 💡 本章思考题（虽然提了一部分，但没有按固定格式）
- 🔄 前置问题回收

这是我的问题，后续 Day05 Part E 以及之后所有 Part 结束时会恢复这个完整结构。

现在补一下 Day05 Part D 缺失部分。

---

# 📝 写书 TODO

## Chapter：Tool Registry —— Managing Agent Capabilities

新增章节：

```text
Tool Registry：Agent Runtime 的能力管理中心
```

核心内容：

### 1. 从 Tool List 到 Capability Management

需要强调：

初级理解：

```
Tool Registry = 存工具
```

工业理解：

```
Tool Registry = 管理 Agent 能力生命周期
```

---

### 2. Tool Registry 与 Context Engineering 的关系

书中需要建立：

```
Context Builder

决定：

LLM 看什么


Tool Registry

决定：

LLM 能做什么
```

最终：

```
Agent Behavior

=

Information Space

+

Action Space
```

---

### 3. Tool Router 独立章节化

后续可以扩展：

```
Tool Routing：

How Agent Chooses Available Capabilities
```

涉及：

- Rule Routing
- Embedding Routing
- LLM Router
- Hybrid Routing

---

### 4. MCP 本质定位

需要避免：

“MCP = 调工具协议”

这种浅层解释。


应该写：

> MCP 是一种标准化 Agent Capability Discovery 协议，让 Runtime 能动态发现外部能力并注册到自己的 Capability Registry 中。

---

# 📦 写书素材

## 素材 1：Tool Registry 核心定义

英文：

> A Tool Registry is not just a collection of tools. It is the capability management layer of an Agent Runtime, responsible for discovering, organizing, filtering, securing, and exposing available capabilities to the model.

中文：

> Tool Registry 不只是工具集合，而是 Agent Runtime 的能力管理层，负责发现、组织、筛选、安全控制以及向模型暴露可用能力。


---

## 素材 2：Context 与 Capability 的关系

可以作为书中的核心图：

```
                 Agent Runtime


       +-----------------------+
       |   Context Builder     |
       +-----------------------+

              ↓

       What the model sees


              LLM


              ↑

       What the model can do


       +-----------------------+
       |   Tool Registry       |
       +-----------------------+

```

总结：

> Context Engineering 管理信息空间，Tool Registry 管理行动空间。

---

## 素材 3：为什么 Tool 越多不一定越强

适合写：

很多人认为：

```
More Tools = More Capability
```

实际上：

```
More Tools

↓

Larger Action Space

↓

Higher Decision Complexity

↓

Potentially Worse Agent Behavior
```

工业 Agent 追求：

不是最大能力暴露。

而是：

> Optimal Capability Exposure（最佳能力暴露）。

---

## 素材 4：Tool Registry 与 MCP

可以形成：

```
External Capability

        |

        v

MCP Discovery

        |

        v

Tool Registry

        |

        v

Context Builder

        |

        v

LLM
```

解释：

MCP 解决：

> 能力如何被发现。


Registry 解决：

> 能力如何被管理。

---

# 💡 本章思考题

## 基础理解

### 1.
为什么 Tool Registry 不是简单的 Map？

---

### 2.
Tool Registry 和 Tool Definition 有什么区别？

---

### 3.
为什么 Context Builder 和 Tool Registry 是 Agent Runtime 的两个核心系统？

---

## 工业设计

### 4.
为什么不能把所有 Tool Schema 一次性发送给 LLM？

---

### 5.
如果一个企业 Agent 有 1000 个 Tool，你如何设计 Tool Routing？

---

### 6.
Tool Router 是否一定需要 LLM？

---

### 7.
为什么权限过滤应该发生在 LLM 调用之前？

---

### 8.
为什么 Tool Registry 需要生命周期管理？

---

## 面试思考

### 9.

解释：

> Tool Registry 如何降低 Agent 的 Action Space？


---

### 10.

解释：

> MCP 和 Tool Registry 的关系。


---

### 11.

如果新增一个 Tool 后 Agent 行为变差，你如何排查？


---

# 🔄 前置问题回收（Pending Questions）

目前 Part D 没有新的前置问题。

之前 Day04 / Part C 遗留问题，在本章得到部分回收：

---

## 已回收：

### Q：为什么不能把所有能力暴露给 LLM？

回收：

因为：

```
Tool 数量增加

↓

Action Space 增大

↓

Decision Difficulty 增加
```

所以需要：

```
Tool Registry + Tool Routing
```

---

### Q：MCP 为什么需要 Runtime？

回收：

MCP 负责：

```
Capability Discovery
```

但是 Runtime 需要：

```
Registry

Routing

Permission

Execution
```

所以 MCP 不是 Agent Runtime 本身。

---

## 后续章节继续回答：

### Q：Tool Result 如何进入 Runtime State？

→ Day05 Part G


### Q：Tool 执行失败如何恢复？

→ Day05 Part E / Part G


### Q：高风险 Tool 如何控制？

→ Day05 Part F

---

# 📚 下一节学习计划（重新整理）

进入：

# Day05 Part E：Tool Executor（Execution Engine）


核心问题：

> Runtime 已经知道有什么能力，也知道调用哪个 Tool，那么如何安全执行？


重点：

1. Tool Executor 为什么不是直接调用函数？
2. Execution Context
3. 参数 Validation
4. Timeout
5. Retry
6. Idempotency（幂等）
7. Error Handling
8. Tool Result 标准化
9. Observation 回流 Runtime

最终形成：

```
Tool Call Intent

        |

        v

Tool Registry

        |

        v

Tool Executor

        |

        v

Tool Result

        |

        v

Runtime State
```

---

感谢你提醒，这个固定章节结构对于后续把 Agent Runtime 整理成“可写书级别”的体系非常重要。我后续每个 Part 结束都会按这个完整模板收尾。

## 15. User

感谢你的讲解，我提出两个问题：
1. mcp 本质上是不是也是补充 Agent tools 不足的问题
2. ToolRegistry  ability 的设计除了能力描述外，本质上还是像 map 加上软件工程层面的设计，比如路由分类

## 16. Assistant

这两个问题非常好，而且其实已经触碰到了 **Agent Runtime 工业化设计的两个核心边界**：

1. **MCP 为什么出现**
2. **Tool Registry 和传统软件工程架构的关系**

我逐个回答。

---

# 问题 1：MCP 本质上是不是也是补充 Agent Tools 不足的问题？

你的理解：

> MCP 是不是就是补充 Agent tools 不足？

答案：

**对，但这个理解还差一层。**

更准确：

> MCP 不是为了补充“Tool 数量不足”，而是为了补充“Tool 获取、标准化、复用能力不足”。

---

## 先看早期 Agent Tool 的问题

最开始：

Agent:

```text
LLM

+

开发者手写 Tools
```

例如：

```ts
const tools = [
 searchFile,
 readFile,
 queryDatabase
]
```

问题：

Tool 都在 Agent 项目代码里面。


---

假设：

你开发一个 Coding Agent。

你写：

```text
git tool

file tool

terminal tool
```

很好。


但是第二个人开发：

客服 Agent：

又写：

```text
order tool

refund tool

CRM tool
```

第三个人：

数据分析 Agent：

又写：

```text
SQL tool

BI tool
```

问题出现：

---

## 问题 1：Tool 重复建设

大家都在重新造：

```text
GitHub Tool

Slack Tool

Database Tool

File Tool
```

---

## 问题 2：Tool 和 Agent 强绑定


以前：

```text
Agent

  |

  |

 Tools
```

关系：

```text
1 : N
```

一个 Agent 自己拥有 Tool。

---

但是未来：

希望：

```text
             GitHub Tool

                  |

       ----------------------

       |          |          |

    Coding    PM Agent   Research Agent

```

一个 Tool 服务多个 Agent。


---

## 问题 3：Tool 没有统一协议

比如：

GitHub：

```json
{
"repo":"",
"branch":""
}
```

GitLab：

可能：

```json
{
"project":"",
"ref":""
}
```

不同。


---

所以 MCP 解决：

不是：

> 我缺少 Tool。

而是：

> 我需要一个 Tool 生态系统。


---

更准确一句：

> MCP 是把 Tool 从 Agent 内部代码，提升成一种可发现、可连接、可复用的外部 Capability。


---

所以关系：

```text
传统 Agent:

Agent
 |
 +-- Tool A
 +-- Tool B
 +-- Tool C



MCP:

             Tool Server

                  |

                  |

              MCP Protocol

                  |

                  |

Agent Runtime

                  |

             Tool Registry

                  |

                 LLM
```


---

所以回答你的问题：

### MCP 是不是补充 Tools？

✅ 是。

但是不是：

```
缺少工具数量
```

而是：

```
缺少标准化能力生态
```

---

# 问题 2：ToolRegistry 的 Ability 设计，除了能力描述，本质是不是 Map + 软件工程设计？

你的理解非常准确。

甚至可以说：

> Tool Registry 其实就是传统软件工程思想进入 Agent Runtime 后的重新包装。

但是增加了一层：

**面向 LLM 的能力抽象。**

---

我们拆开看。

---

## 第一层：最基础

你说的：

> 像 Map


没错。


最简单：

```ts
Map<string, Tool>
```


例如：

```ts
{
 "search_file": SearchFileTool,

 "read_file": ReadFileTool
}
```

这就是：

数据结构层。


---

## 第二层：软件工程能力

随着系统复杂：

你自然会增加：

### 分类

```json
{
"name":"query_order",

"category":"order"
}
```


类似：

传统：

```text
package/module
```

---

### 路由

```text
order request

↓

order tools
```

类似：

传统：

```text
API Gateway routing
```


---

### 权限

```json
{
"permission":
"order.refund"
}
```


类似：

RBAC。


---

### 生命周期

```text
active

deprecated

disabled
```


类似：

API version management。


---

### 版本

```json
{
"name":"refund",

"version":"v2"
}
```


类似：

微服务 API。


---

所以你说：

> Map + 软件工程设计

非常准确。

---

但是 Agent 多了一层。

---

# Agent 特有的一层：Semantic Capability

传统 API：

关注：

```text
路径

参数

返回值
```

例如：

```
POST /order/refund
```


但是 Agent Tool：

需要：

```text
这个能力是什么？
什么时候应该使用？
解决什么问题？
```

也就是：

Semantic。


例如：

传统：

```ts
refundOrder()
```

名字。


Agent：

需要：

```json
{
"name":"refund_order",

"description":
"Refund a customer's order when payment has been completed",

"when_to_use":
"When user requests cancellation after payment"
}
```


为什么？

因为调用者不是程序员。

是：

LLM。


---

所以 Tool Registry 实际结构：

我觉得可以这样理解：

```
Tool Registry

=

传统软件能力管理

+

LLM Semantic Interface
```

---

画一下：

```
                 Tool Registry


       +-------------------------+

       | Software Engineering   |

       |                         |

       | Map                    |

       | Routing                |

       | Permission             |

       | Version                |

       | Lifecycle              |

       +-------------------------+



       +-------------------------+

       | LLM Capability Layer   |

       |                         |

       | Description            |

       | Intent                 |

       | Usage Context          |

       | Examples               |

       +-------------------------+

```


---

# 其实你已经发现一个很重要的趋势

Agent Runtime 并不是创造全新的软件工程。

它是在：

> 把传统软件工程中的能力管理、权限、路由、生命周期，加上一层 LLM 可理解的语义接口。


这也是为什么：

很多 Agent Framework：

看起来很像：

- API Gateway
- Workflow Engine
- Plugin System
- Microservice Architecture

因为底层思想高度相通。


---

# 联系你之前说的企业 Agent

你之前有一个判断：

> 企业 Agent 更多是已有业务流程固化。


这个判断非常正确。

例如：

企业客服：

传统：

```
订单服务

库存服务

支付服务
```

已经存在。


Agent 并不是创造业务。

它做的是：

```
自然语言入口

       ↓

Intent Understanding

       ↓

Capability Routing

       ↓

Existing Business APIs
```

其中：

Tool Registry：

其实就是：

> AI 世界里的 API Gateway + Service Catalog。


---

# 最终总结两个问题

## Q1：MCP 是不是补充 Tool 不足？

升级理解：

❌ Tool 数量不足

✅ Tool 生态不足

MCP 解决：

```
Tool Discovery

Tool Standardization

Tool Reuse

Tool Interoperability
```


---

## Q2：Tool Registry 是不是 Map + 软件工程设计？

答案：

✅ 基础上就是。

但是多了一层：

```
Semantic Capability Layer
```

最终：

```
Tool Registry

=

Map

+

API Gateway

+

Plugin System

+

Permission System

+

LLM Semantic Capability Catalog
```


---

其实你这两个问题，已经自然过渡到后面的两个章节：

- **MCP（Model Context Protocol）**
- **Agent Platform Engineering**

后面学 MCP 时，你会发现：

MCP Server 本质就是：

> 外部 Capability Provider。

而 Tool Registry：

就是：

> Runtime 内部 Capability Manager。

两者正好闭环。你现在的理解方向是对的。

## 17. User

1. 学来学去 我发现 Agent 中很多设计本质上还是软件工程设计在 Agent 的应用
2. 那 tools 与 mcp 的区别是什么呢？又该区别定义哪些需要内置在 Agent 的 tools 中哪些需要定义为外部的 mcp？

## 18. Assistant

这两个问题其实是非常关键的**Agent 工程认知升级点**。

尤其第一个：

> 学来学去发现 Agent 很多设计本质还是软件工程设计在 Agent 的应用。

这个观察非常准确。

甚至可以说：

> **Agent 并没有推翻软件工程，而是把传统软件工程中的“确定性系统设计”与“概率性决策模型”结合起来。**

下面展开。

---

# 1. 为什么 Agent 里面大量都是传统软件工程？

你现在学习到：

- Runtime
- Context Builder
- Memory
- Tool Registry
- Tool Router
- Workflow
- Permission
- Executor
- Retry
- State Management

你会发现：

这些东西以前都有。

例如：

|Agent 概念|传统软件工程对应|
|-|-|
|Tool Registry|Service Registry / API Gateway|
|Tool Router|Request Routing|
|Workflow|Workflow Engine|
|Memory|Database / Cache|
|Runtime State|Application State|
|Executor|Task Executor|
|Permission|RBAC|
|Retry|Distributed System Reliability|
|Context Builder|Data Aggregation Layer|
|MCP|Protocol / Integration Standard|

---

为什么？

因为 Agent 解决的问题：

不是：

> 怎么让机器执行代码。

这个早解决了。

而是：

> 怎么让机器在不确定情况下选择并调用已有能力。


所以变化的是：

**决策层。**

---

传统系统：

```text
User

 |

API

 |

Service A

 |

Database
```

路径提前写死。


---

Agent：

```text
User

 |

LLM

 |

选择:

Service A?
Service B?
Tool C?

 |

Execution
```

路径动态生成。


---

所以：

传统软件工程：

解决：

> 如何可靠执行确定流程。


Agent：

增加：

> 如何让系统动态规划下一步。


---

一句话：

> Agent = Software Engineering Infrastructure + LLM Decision Layer


这也是为什么未来优秀 Agent 工程师，本质上还是优秀的软件工程师。

---

# 2. Tool 和 MCP 的区别是什么？

这是非常好的问题。

因为很多资料把 MCP 讲得很模糊。

我们先给结论。

---

## Tool

定义：

> Agent Runtime 内部直接拥有的能力。


例如：

你的 Agent 项目：

```
my-agent

├── runtime
├── tools
│
├── search_file.ts
├── read_file.ts
└── execute_command.ts
```

这里：

```ts
search_file()
```

就是 Tool。

---

## MCP

定义：

> Agent Runtime 连接外部能力的一种标准协议。


例如：

你的 Agent：

```
Coding Agent
```

需要 GitHub 能力。

你没有自己写：

```ts
create_issue()
```

而是：

连接：

```
GitHub MCP Server
```

然后发现：

```
create_issue
search_repo
get_pr
```

这些能力。


---

所以：

最核心区别：

```
Tool:

能力属于 Agent


MCP:

能力属于外部系统，通过协议接入 Agent
```

---

# 3. 架构区别

## 普通 Tool

```text
             Agent Runtime


                  |

                  |

              Tool Registry


                  |

                  |

              Tool Executor


                  |

                  |

              Function


                  |

                  |

              Database/API
```

---

例如：

```ts
async function queryOrder(){

 return db.query()

}
```

代码就在 Agent 内。

---

## MCP

```text
              Agent Runtime


                    |

                    |

              MCP Client


                    |

                    |

             MCP Protocol


                    |

                    |

             MCP Server


                    |

                    |

          External Capability
```

---

例如：

```
GitHub MCP Server

↓

GitHub API

```

---

# 4. 那 Tool 和 MCP Tool 在 LLM 眼里有什么区别？

这里非常重要。

答案：

**几乎没有区别。**

对于 LLM：

都是：

```json
{
"name":"search_repository",

"description":"Search code repository"
}
```

---

LLM 不知道：

这是：

内部 function：

```
search_repository()
```

还是：

MCP 调用：

```
mcp.github.search_repository()
```

---

所以：

MCP 最终还是会进入：

```text
Tool Registry
```

---

完整链路：

```text
                 MCP Server

                     |

                     v

              MCP Discovery

                     |

                     v

              Tool Registry

                     |

                     v

             Context Builder

                     |

                     v

                    LLM
```

---

所以：

MCP 不是替代 Tool。

而是：

> 一种产生 Tool 的方式。

---

这个理解非常重要。

---

# 5. 那什么时候定义内部 Tool？

判断标准：

## 原则：

> 这个能力是不是 Agent 自己业务的一部分？


例如：

你开发：

客服 Agent。

订单查询：

```text
query_order_status
```

通常内部 Tool。


为什么？

因为：

这是你的业务核心。


比如：

```text
订单数据库

库存系统

会员系统
```

这些属于你的系统。


---

结构：

```
Customer Agent

    |
    |
 Tool

    |
    |
 Internal Service
```

---

# 6. 什么适合做 MCP？

判断标准：

> 这个能力是不是一个独立生态，希望被多个 Agent 复用？


例如：

GitHub：

```text
search_repo
create_issue
get_pr
```


Slack：

```text
send_message
search_channel
```


Google Drive：

```text
search_document
read_file
```


数据库：

```text
query_sql
```


这些特点：

1. 外部系统
2. 多 Agent 使用
3. 有独立生命周期
4. 不希望每个 Agent 重写


适合 MCP。

---

# 7. 一个实际判断表

|问题|Tool|MCP|
|-|-|-|
|能力属于 Agent 本身吗？|✅|❌|
|业务核心逻辑？|✅|❌|
|内部数据库/API？|✅|可能|
|第三方系统？|可能|✅|
|多个 Agent 共用？|较少|✅|
|希望插件化？|较少|✅|
|需要动态发现？|较少|✅|
|需要跨语言？|较少|✅|

---

# 8. 举一个企业 Agent 的例子

假设：

你做：

「家具销售 Agent」

系统：

```
用户聊天

↓

销售 Agent

↓

订单
库存
物流
CRM
```

---

## 内部 Tool

你的业务：

```text
query_product_inventory

calculate_discount

create_order

check_customer_level
```

因为：

这些是你的核心业务。


---

## MCP

外部能力：

```
飞书

企业微信

邮件

ERP

Google Calendar
```

例如：

客户说：

> 帮我约销售明天下午拜访


Agent：

调用：

```
Calendar MCP

create_event
```


---

# 9. 一个更本质的判断方式

我建议你以后判断 Tool / MCP：

不要看技术。

看：

## Ownership（所有权）


问：

> 谁拥有这个能力？


---

如果：

你的 Agent 团队拥有：

```
query_customer()
```

内部 Tool。


---

如果：

Google 拥有：

```
google_drive_search()
```

MCP。


---

如果：

GitHub 拥有：

```
create_issue()
```

MCP。


---

# 10. 和你前面学的 Registry 连接

现在闭环了：

Tool Registry 不关心来源。

它看到：

都是 Capability。

例如：

```
Tool Registry


search_file
       |
       |
       来源:
       Internal Tool


search_repo
       |
       |
       来源:
       MCP Tool


query_order
       |
       |
       来源:
       Internal API

```

统一管理。


---

所以最终架构：

```
                 Capability Sources


        Internal Tool       MCP Server

              |                 |

              |                 |

              +--------+--------+

                       |

                       v


                Tool Registry


                       |

                       v


                Context Builder


                       |

                       v


                      LLM
```

---

# 最后总结你的两个问题

## 1. Agent 是不是软件工程在新领域应用？

答案：

**是，但增加了概率决策层。**

更准确：

```
Agent

=

Software Engineering

+

LLM Reasoning

+

Dynamic Decision Making
```

---

## 2. Tool 和 MCP 区别？

一句话：

> Tool 是 Agent 使用能力的抽象，MCP 是让外部能力以标准方式成为 Tool 的协议。


或者：

```
Tool:

我有什么能力


MCP:

别人有什么能力，我怎么接进来
```

---

你现在其实已经进入 Agent 架构中一个很重要的分界：

前面学的是：

> Agent Runtime 内部机制

后面 MCP 学的是：

> Agent 如何连接外部世界

这两个合起来，才是工业 Agent 平台的完整形态。你这个问题实际上正好卡在 Day05 和后续 MCP 章节的连接点上。
