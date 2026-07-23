# Day04 Part E ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a6183bd-18a4-83ee-a96e-d6dca8f390d5
- 会话标题：Day04 Part E 解析
- 抽取时间：2026-07-23

> 本文件由分享页 `linear_conversation` 中的 user / assistant 文本消息抽取而来，用于保留 Day04 Part E 学习原始记录。

## 1. User

这是昨天的学习笔记以及day04 下的 readme，你看一下，然后我们进入 day04 part E

## 2. Assistant

我已经看完你上传的两个文件：

1. **`README(9).md`（Day04 总 README）**  
2. **`day04-part-d-context-window-management.md`（Day04 Part D 完整学习笔记）**

整体看下来，Day04 的学习主线已经非常完整，而且已经形成了一条比较接近工业 Agent Runtime 的认知链：

```text
Prompt
  ↓
Runtime State
  ↓
Context Builder
  ↓
Context Window Management
  ↓
Provider Adapter
  ↓
Tool Calling
```

其中 README 里面已经明确标记：

> Day04 Part E：Provider Adapter，补齐 LLM Provider 抽象与模型供应商适配层  
> Day05：Tool Calling 进入执行系统

所以我们现在进入 **Day04 Part E：Provider Adapter** 是正确的。fileciteturn0file0


---

## 先评价一下 Part D 完成质量

我认为 Part D 是目前 Day04 里面非常关键的一章。

因为之前很多 Agent 教程会直接跳：

```
User Message
 ↓
LLM
 ↓
Tool
```

但你现在已经建立了：

```
Runtime State
       |
       |
Context Engineering
       |
       |
Provider Messages
       |
       |
LLM
```

这个认知层级。

尤其几个点非常重要：

### 1. Context Builder ≠ Prompt Template

这个点已经脱离初级 Agent 认知。

很多所谓 Agent 框架：

```ts
const prompt = `
You are assistant...

${history}

${knowledge}
`
```

本质还是 Prompt Engineering。

而工业 Runtime：

```
Runtime State
      |
      v
Context Policy
      |
      v
Context Builder
      |
      v
Provider Messages
```

这是 Context Engineering。

你已经理解这个区别。


---

### 2. Context Window Management 本质是资源调度

这个理解非常重要：

不是：

> 如何塞更多内容给模型

而是：

> 如何管理模型这一轮的认知资源


类似：

前端：

```
Redux Store
      |
Selector
      |
Component Render
```

Agent：

```
Runtime State
      |
Context Builder
      |
LLM Context
```


这个类比很好，因为你本身有 React 架构背景。


---

### 3. Provider Adapter 是下一块拼图

现在你的 Runtime 还有一个缺口：

目前：

```
Context Builder

输出：

Provider Messages
```

但是：

不同模型供应商：

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

Claude：

```json
{
 messages:[
   {
    role:"user",
    content:[
      {
       type:"text",
       text:"..."
      }
    ]
   }
 ]
}
```

Gemini：

又完全不同。


所以需要：

```
             Context Builder
                    |
                    |
          Unified Message Model
                    |
        +-----------+-----------+
        |           |           |
        v           v           v

    OpenAI      Claude       Gemini

```

这就是 Part E。


---

# Day04 Part E：Provider Adapter

## 本 Part 核心问题

这一章主要回答：

> Runtime 如何做到不绑定任何一家 LLM Provider？

以及：

> 为什么 Provider Adapter 是 Runtime Architecture 的边界层？


---

## Part E 在整个 Runtime 中的位置


完整链路：

```
                 User
                  |
                  v

        +----------------+
        | Application    |
        +----------------+

                  |
                  v

        +----------------+
        | Runtime Core   |
        +----------------+

          |
          |
          +----------------+
          | Runtime State  |
          +----------------+

                  |
                  v

          Context Builder

                  |
                  v

        Unified Context Model

                  |
                  v

          Provider Adapter

                  |
        +---------+---------+
        |         |         |
        v         v         v

     OpenAI    Claude    Gemini


                  |
                  v

              LLM


```


---

# 第一章：为什么需要 Provider Adapter


## 1.1 最简单 Agent 的问题


很多初学者写：

```ts
async function chat(messages){

 return openai.chat.completions.create({
   model:"xxx",
   messages
 })

}
```


看起来没问题。


但是 Runtime 一旦复杂：

你会发现：

```text
Runtime
 |
 |
OpenAI SDK
```

耦合。


未来换模型：

```
OpenAI
 ↓
Claude

```

整个 Runtime 修改。


更严重的是：

Tool Calling：

OpenAI：

```json
{
 tool_calls:[
  {
   function:{
    name:"search",
    arguments:"{}"
   }
  }
 ]
}
```


Claude：

```json
{
 content:[
 {
  type:"tool_use",
  name:"search",
  input:{}
 }
 ]
}

```


Gemini：

又不同。


如果 Runtime 直接处理：

代码会变成：

```ts
if(provider==="openai"){

}

if(provider==="claude"){

}

if(provider==="gemini"){

}

```


最后 Runtime 被污染。


---

# 1.2 Provider Adapter 的核心思想


和前端 Adapter 很像。


例如：

不同浏览器：

```
Chrome API
Safari API
Firefox API
```

你不会：

```ts
if(browser==="chrome")

```


而是：

```
BrowserAdapter

统一接口

```

Agent Runtime 同理。


定义：

```
LLM Provider Interface

```

例如：

```ts
interface LLMProvider {


  chat(
    request: ModelRequest
  ): Promise<ModelResponse>


  stream(
    request: ModelRequest
  ): AsyncIterable<ModelEvent>


}

```


Runtime 只认识：

```
LLMProvider

```


不知道：

```
OpenAI
Claude
Gemini

```


---

# 第二章：Runtime 内部统一模型


这是 Provider Adapter 最重要的设计。


## 2.1 Unified Message Model


Runtime 内部应该有自己的 Message。


例如：


```ts
type Message = {

 role:
   | "system"
   | "user"
   | "assistant"
   | "tool";


 content:string;


 metadata?:{

   source?:string;

   timestamp?:number;

 }


}

```


注意：

这个不是 OpenAI Message。


这是 Runtime Message。


---

为什么？


因为：

Runtime 生命周期：

```
Runtime Message

长期存在


Provider Message

一次调用转换产物

```


类似：

数据库：

```
Domain Model

      ↓

DTO

```


不要让：

```
OpenAI DTO

污染 Domain Model

```


---

# 第三章：Provider Adapter 工作流程


完整流程：


```
Runtime Message


      |
      v


Provider Adapter


      |
      v


OpenAI Request


      |
      v


OpenAI API



```



例如：

Runtime：

```json
{
 role:"assistant",
 content:"hello"
}

```


OpenAI Adapter:


转换：

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


Claude Adapter:


转换：

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

# 第四章：Provider Adapter 不只是格式转换


很多人理解：

Adapter = 转 JSON


太浅。


工业 Adapter 还负责：

## 1. Message Translation


消息格式转换。


## 2. Tool Calling Translation


例如：

Runtime：

```ts
ToolCall{

 name:"search",

 arguments:{}

}

```


转换：

OpenAI:

```
function_call

```


Claude:

```
tool_use

```


## 3. Streaming Translation


不同 Provider:

事件不同。


OpenAI:

```
delta

```


Claude:

```
content_block_delta

```


Runtime 不应该关心。


统一：

```ts
type RuntimeEvent=

 | TextDelta

 | ToolCallStart

 | ToolCallDelta

 | Finish

```


---

## 4. Usage Normalization


不同 Provider 返回：

OpenAI:

```json
{
 prompt_tokens:100,
 completion_tokens:50
}

```


Claude:

```json
{
 input_tokens:100,
 output_tokens:50
}

```


Runtime 统一：

```ts
{
 inputTokens:100,
 outputTokens:50
}

```


用于：

- 成本统计
- 限流
- 用户计费


---

# 第五章：Provider Adapter 和 Context Builder 边界


这是面试重点。


很多系统设计容易混。


## Context Builder 负责：

```
决定给模型看什么

```

包括：

- memory
- conversation
- workspace
- tool result
- summary


输出：

```
Runtime Context

```



---


## Provider Adapter 负责：


```
如何让某个模型理解这些内容

```


包括：

- API 格式
- Message Schema
- Tool Schema
- Streaming
- Error
- Retry


---


一句话：

> Context Builder 决定认知内容，Provider Adapter 决定通信协议。


---

# 第六章：工业 Runtime 架构


最终：

```
                 Runtime Core


+--------------------------------+

 Runtime State


 Context Builder


 Planner


 Tool Runtime


 Memory Manager


 Event System


+--------------------------------+



              |

              v


       Provider Adapter



              |

       +------+------+

       |             |

       v             v


    OpenAI        Claude


```


---

# 结合你的前端经验理解


这个部分其实和你以前做前端架构高度类似。


比如：

你的组件库：

```
业务组件

 ↓

antd

 ↓

React

```


业务不会直接：

```ts
import antd Button

```


而可能：

```
DuButton

 ↓

Adapter

 ↓

antd

```


为什么？

因为：

未来可以替换。


Agent Runtime：

一样。


```
Runtime

 ↓

LLM Adapter

 ↓

Model Provider

```


---

# Part E 学完后的认知升级


之前：

```
Agent =
LLM + Prompt + Tool

```


现在：

```
Agent Runtime =

State Management

+

Context Engineering

+

Provider Abstraction

+

Execution System

```


LLM 只是其中一个可替换组件。


---

接下来 Day04 Part E 我建议按照之前 Part D 的节奏继续拆：

## Day04 Part E 目录

```
Day04 Part E：Provider Adapter

第一章：
为什么 Runtime 不能绑定 LLM Provider

第二章：
Unified Model Interface

第三章：
Provider Adapter Architecture

第四章：
Streaming / Tool Calling / Error / Usage Adapter

第五章：
Mini Provider Adapter 实现

第六章：
Day04 全部串联总结

```

并且结束 Part E 后继续保持你之前要求的固定结构：

- 🔄 前置问题回收（Pending Questions）
- 面试视角
- 下一节学习计划
- 写书 TODO
- 写书素材
- 本 Part 核心认知升级


我们现在正式进入：

# Day04 Part E - Provider Adapter

## 第一章：为什么 Agent Runtime 必须抽象 LLM Provider

下一条开始正式学习。

## 3. User

开始学习。day04 prat E感觉对比之前简单多了

## 4. Assistant

你这个感觉是对的。

Day04 Part E **相对于 Part B / C / D 确实会明显简单一些**。

但是这里有一个原因：

> Part E 不是难在概念复杂，而是难在架构边界设计。

前面的 Part B、C、D 是在建立 Agent Runtime 的“内核认知”：

```text
Part B:
Runtime State 是什么？
Runtime 如何保存世界？

Part C:
Runtime 如何把世界投影给 LLM？

Part D:
如果世界太大，如何管理 LLM 能看到的部分？
```

这三个是在解决：

> Agent 的“大脑如何形成认知”。

而 Part E：

```text
Provider Adapter
```

解决的是：

> 这个大脑如何和不同的“外部模型身体”连接。


所以它不像 Context Engineering 那么抽象，但它是工业架构里非常关键的一层。

---

# Day04 Part E：Provider Adapter

## 第一章：为什么 Runtime 不能绑定 LLM Provider

---

## 1.1 初学 Agent 时的写法

很多人刚开始调用 LLM：

```ts
const response = await openai.chat.completions.create({
  model: "gpt-5",
  messages
})
```

然后继续：

```text
用户输入
   |
   v
OpenAI
   |
   v
返回结果
```

看起来非常简单。


但是如果你是在写：

```text
Agent Runtime
```

这个设计会有严重问题。

---

## 1.2 Runtime 不应该知道 OpenAI


我们回忆一下 Part D：

Runtime 内部：

```text
Runtime State

Conversation
Memory
Workspace
Tool Result
Plan
Checkpoint

        |
        v

Context Builder

        |
        v

Provider Messages
```

注意：

到这里，其实 Runtime 已经完成了一件事：

> 决定模型应该看到什么。


但是下一步：

怎么发送？


不应该由 Runtime 负责。

否则：

```text
Runtime Core

里面出现：

openai.xxx()
anthropic.xxx()
gemini.xxx()

```

架构污染。

---

## 1.3 为什么这是一个严重问题？


假设：

2025：

你的 Agent：

```text
GPT-5
```

运行。


一年后：

公司想降低成本：

改：

```text
Claude Sonnet
```

或者：

```text
Gemini
```

甚至：

```text
DeepSeek
```

如果 Runtime 里面全部写死：

你需要修改：

- Context Builder
- Tool Calling
- Streaming
- Error Handling
- Retry
- Logging
- Cost Tracking


这就是典型：

```text
业务层
依赖
基础设施层
```

的问题。


---

# 2. Provider Adapter 的核心思想

其实你非常熟悉。

因为它和前端架构里面的 Adapter Pattern 完全一样。


比如：

你的业务：

```ts
uploadFile(file)
```

不会直接：

```ts
aliyunOSS.upload()

```

而是：

```text
Business

   |
   v

Storage Adapter

   |
 +------+------+

 OSS       S3

```

未来换存储：

业务不动。


Agent Runtime：

一样。


```text
Agent Runtime

        |
        v

Provider Adapter

        |
 +------+-------+

 OpenAI
 Claude
 Gemini

```

---

# 3. Runtime 应该定义什么？

核心：

不要让 Runtime 认识：

```text
OpenAI Message
Claude Message
Gemini Content
```

而应该定义自己的：

## Unified Model Interface


例如：

```ts
interface LLMProvider {


  chat(
    request: ModelRequest
  ): Promise<ModelResponse>


  stream(
    request: ModelRequest
  ): AsyncIterable<ModelEvent>


}

```


Runtime 只知道：

```ts
provider.chat()

```

不知道：

```ts
openai.chat.completions.create()

```


---

# 4. 为什么需要 Unified Message Model？


这里非常关键。


很多人会犯一个错误：

直接使用 OpenAI 的：

```ts
ChatCompletionMessage
```


然后整个 Runtime 都围绕它设计。


这是错误的。


因为：

OpenAI 的数据结构：

不是你的领域模型。


---

类似前端：

后端返回：

```json
{
 user_name:"xxx"
}
```

你不会让整个 React 状态：

全部叫：

```ts
user_name
```

而是：

```ts
interface User {

 name:string

}

```


中间转换：

```text
API DTO

 ↓

Domain Model

 ↓

UI State

```

---

Agent：

一样：

```text
Provider Message

      ↓

Runtime Message

      ↓

Context Builder

```

---

# 5. Runtime Message 长什么样？


例如：

```ts
type RuntimeMessage = {

 role:
  | "system"
  | "user"
  | "assistant"
  | "tool";


 content:string;


 metadata?: {

   timestamp:number;

   source:string;

 }

}
```

这是 Agent 自己的语言。


---

然后：

OpenAI Adapter：

负责：

```text
RuntimeMessage

      ↓

OpenAI Request

```

Claude Adapter：

负责：

```text
RuntimeMessage

      ↓

Claude Request

```

---

# 6. 一个完整调用链


现在整个 Day04 串起来：

```text
用户问题


 ↓


Runtime State


 ↓


Context Builder


 ↓


Runtime Messages


 ↓


Provider Adapter


 ↓


OpenAI / Claude / Gemini


 ↓


LLM Response


 ↓


Provider Adapter


 ↓


Runtime Response


 ↓


State Update

```


注意：

Provider Adapter 是双向的。


不是：

```text
Runtime → Provider

```

而是：

```text
Runtime

 ↕

Provider Adapter

 ↕

LLM Provider

```

---

# 7. Provider Adapter 真正负责什么？

很多人以为：

> Adapter 就是转换 JSON。

不够。


工业级 Adapter 至少负责：

---

## ① Message Translation


不同模型：

消息格式不同。


统一：

```ts
RuntimeMessage

```


转换：

```text
OpenAI Message

Claude Message

Gemini Content

```

---

## ② Tool Calling Translation


马上 Day05 会深入。


比如 Runtime：

```ts
ToolCall {

 name:"search",

 args:{
   q:"AI"
 }

}

```


OpenAI：

```json
{
"type":"function",
"name":"search"
}
```


Claude：

```json
{
"type":"tool_use",
"name":"search"
}
```


Runtime 不应该知道区别。


---

## ③ Streaming Translation


这个和你前端经验关联很强。


不同 Provider：

事件：

OpenAI:

```text
delta
delta
delta
finish
```


Claude:

```text
content_block_start
content_block_delta
content_block_stop

```


但是 Runtime 希望统一：

```ts
type RuntimeEvent =

 | TextDelta

 | ToolCallStart

 | ToolCallDelta

 | Finish

```

然后前端：

```text
Streaming UI

```

只消费 Runtime Event。


---

## ④ Usage Normalization


成本统计：

OpenAI：

```json
{
 prompt_tokens:100
 completion_tokens:50
}

```


Claude：

```json
{
 input_tokens:100
 output_tokens:50
}

```


Runtime:

统一：

```ts
{
 inputTokens:100,
 outputTokens:50
}

```

方便：

- 计费
- 限流
- 监控


---

# 8. Provider Adapter 和 Context Builder 边界（重点）


这是面试非常容易问的问题。


## Context Builder


负责：

> 给模型看什么？


比如：

```text
选择：

用户目标

Memory

代码

Tool Result

历史摘要

```

输出：

```text
Runtime Context
```


---

## Provider Adapter


负责：

> 怎么让某个模型收到这些内容？


比如：

```text
转换 API

转换消息格式

转换 Tool Schema

处理 Streaming

处理错误

```


---

一句话：

> Context Builder 决定认知内容，Provider Adapter 决定通信协议。


---

# 9. 为什么 Part E 简单？

因为它其实是一个“边界设计章节”。

前面：

```text
Runtime State
Context
Memory
Token Budget

```

是在设计：

> Agent 内部世界。


Part E：

是在设计：

> Agent 和外部世界的接口。


所以复杂度下降。


但是工业价值非常高。

---

# 本节核心认知升级


以前：

```
Agent = 调一个 LLM API
```


现在：

```
Agent Runtime

=
State Management

+
Context Engineering

+
Provider Abstraction

+
Execution System

+
Memory

```

LLM：

只是 Runtime 中的一个可替换推理引擎。


---

## 思考题（建议你回答）

### 1.

为什么下面这种设计不好？

```ts
RuntimeState
   |
   v

openai.chat.completions.create()

```


### 2.

为什么 Runtime 不应该直接保存 OpenAI Message，而应该保存自己的 Runtime Message？


### 3.

如果未来 GPT、Claude、Gemini 都支持 Tool Calling，为什么 Runtime 仍然需要 Provider Adapter？


---

下一节我们进入：

# Day04 Part E 第二章：Unified Model Interface 设计

这一章会更贴近代码设计：

我们会设计：

```ts
interface LLMProvider

interface ChatRequest

interface ChatResponse

interface StreamEvent

interface ToolCall

```

也就是你未来实现 `mini-agent-runtime` 时真正会写的接口。

## 5. User

这几个问题本质上还是各家大模型内部接收的无论是消息还是工具调用响应参数都不一致，因此需要适配。开启第二章的学习吧

## 6. Assistant

你的回答已经抓住了 **Provider Adapter 存在的根本原因**。

不过我稍微帮你提升一下抽象层级。

你说：

> 各家大模型内部接收的消息、工具调用响应参数都不一致，因此需要适配。

这是**第一层原因**。

更完整的架构答案应该是：

> Provider Adapter 的存在，是因为 LLM Provider 在协议层存在差异，而 Runtime 需要保持领域模型稳定，不应该被具体 Provider 的协议污染。

这里有两个关键词：

1. **Protocol Difference（协议差异）**
2. **Domain Isolation（领域隔离）**

这其实和前端架构里的 Adapter、Backend For Frontend、DDD 分层思想是一致的。


---

# Day04 Part E 第二章：Unified Model Interface

## 本章目标

上一章解决：

> 为什么需要 Provider Adapter？


这一章解决：

> Runtime 内部到底应该使用什么统一模型？


也就是：

如果：

```text
OpenAI
Claude
Gemini
Local Model
```

都有不同协议。


那么 Runtime 内部应该长什么样？


---

# 1. 错误设计：以 Provider 为中心


很多初学者会这样设计：

```text
Runtime

   |
   |
OpenAI Message

   |
   |
OpenAI API

```


代码：

```ts
type Message = OpenAI.ChatCompletionMessage
```


然后：

Runtime 到处出现：

```ts
message.role

message.tool_calls

message.function_call

```


问题：

你的 Runtime 已经不是 Agent Runtime。

而变成：

```text
OpenAI Runtime
```


---

如果换 Claude：

你开始修改：

```ts
if(provider==="claude"){

}

```


最后：

```ts
Runtime
 |
 +-- OpenAI logic
 |
 +-- Claude logic
 |
 +-- Gemini logic

```


这是架构腐化。


---

# 2. 正确设计：Runtime 是中心


应该反过来：


```text

              Runtime


                 |
                 |
        Unified Model Interface


        /          |          \


    OpenAI      Claude      Gemini


```


Runtime 定义：

> Agent 世界中的语言。


Provider Adapter：

负责：

> 翻译。


---

# 3. 什么是 Unified Model Interface？


简单理解：

Runtime 定义一套：

“我理解的大模型能力”。


例如：

```ts
interface LLMProvider {

  chat(
    request: ChatRequest
  ): Promise<ChatResponse>


}

```


注意：

这里没有：

```ts
OpenAI

Claude

Gemini

```


它描述的是：

LLM 在 Runtime 中应该具备什么能力。


---

# 4. 设计 ChatRequest


首先看请求。


Runtime 调模型：

本质需要什么？


不是：

```json
{
 model:"gpt-5",
 temperature:1,
 response_format:"json"
}

```


这些是 Provider 概念。


Runtime 真正需要：

```ts
type ChatRequest = {

  messages: RuntimeMessage[];


  tools?: ToolDefinition[];


  options?: ModelOptions;


}

```


---

## 4.1 RuntimeMessage


核心：

```ts
type RuntimeMessage = {

 role:
   | "system"
   | "user"
   | "assistant"
   | "tool";


 content:
   | string
   | ContentBlock[];


 metadata?: {

   source?: string;

 }

}

```


为什么不是：

```ts
OpenAIMessage

```


因为 Runtime 需要表达：

Agent 世界。


---

# 5. ContentBlock 思想


这里开始接近现代模型设计。


以前：

```ts
content:string

```


例如：

```text
你好

```


但是现在：

Message 内容可能很多类型：

文本：

```text
hello
```


图片：

```text
image
```


工具调用：

```text
tool_call
```


文件：

```text
file
```


所以：

现代设计：

```ts
type ContentBlock =

 | TextBlock

 | ImageBlock

 | ToolCallBlock

 | FileBlock

```


例如：

```json
{
 role:"assistant",

 content:[
   {
    type:"text",
    text:"我帮你查询"
   },

   {
    type:"tool_call",
    name:"search",
    arguments:{}
   }
 ]

}

```


---

这个设计你应该很熟悉。

类似 React：

以前：

```jsx
children:string
```


后来：

```jsx
children:ReactNode

```


因为 UI 内容不再只有文本。


Agent Message 也是一样。

---

# 6. Tool 也需要统一抽象


同样：

不要：

```ts
OpenAIToolDefinition

```


而是：

```ts
type ToolDefinition = {

 name:string;


 description:string;


 inputSchema:JSONSchema;

}

```


Runtime：

只知道：

```text
有一个工具

名字

描述

参数结构

```


---

然后 Adapter：

转换：

OpenAI:

```json
{
type:"function",
function:{
 name:"search"
}
}

```


Claude:

```json
{
name:"search",
input_schema:{}
}

```


---

# 7. ChatResponse


响应也一样。


Runtime 不应该关心：

OpenAI:

```json
choices[0].message
```


Claude:

```json
content[]
```


统一：

```ts
type ChatResponse = {

 message: RuntimeMessage;


 usage?: Usage;


 finishReason?: FinishReason;

}

```


---

# 8. 完整 Unified Interface


现在组合：


```ts
interface LLMProvider {


 chat(
   request:ChatRequest
 ):Promise<ChatResponse>



 stream(
   request:ChatRequest
 ):AsyncIterable<StreamEvent>



}
```


这就是 Runtime 的抽象。


---

# 9. Provider Adapter 位置


完整链路：


```text

             Runtime Core


                  |

                  v


        Unified Model Interface


                  |

                  v


          Provider Adapter


                  |

        +---------+---------+

        |                   |

        v                   v


      OpenAI              Claude


```


---

# 10. 这里其实和你的前端架构高度类似


举一个你熟悉的例子。


假设你的业务：

```ts
upload(file)
```


你不希望：

```ts
uploadToOSS(file)
uploadToS3(file)
uploadToCOS(file)

```


散落业务。


所以：

```ts
interface Storage {


 upload(file)

}

```


然后：

```text
Storage Interface


       |

       |

 +-----+-----+

 OSS       S3

```


Agent：

完全一样。


```ts
interface LLMProvider {


 chat()

 stream()

}


        |

 +------+------+

OpenAI       Claude

```


---

# 11. 一个更高级的问题：为什么不直接用 OpenAI 格式作为标准？


这个问题很有面试价值。


答案：

因为：

OpenAI 格式只是一个 Provider 协议。

它不是 Agent Runtime 的领域模型。


如果 Runtime 采用 OpenAI 格式：

未来：

- Claude 特有能力无法表达；
- Gemini 特有能力无法表达；
- 本地模型能力无法表达；
- Runtime 被 OpenAI API 设计限制。


正确：

```text
Runtime Model

      ↓

Provider Adapter

      ↓

Provider Protocol

```


错误：

```text
Provider Protocol

      ↓

整个 Runtime

```


---

# 本章核心认知升级


以前：

```text
调用模型 = 调 API
```


现在：

```text
Runtime

拥有自己的 Agent Domain Model


LLM Provider

只是外部执行能力
```


---

# 思考题（进入下一节前）

### 1.

为什么 `RuntimeMessage` 不应该直接复用 OpenAI 的 Message 类型？


### 2.

如果 OpenAI 明天推出一个新的 Tool Calling 协议，为什么好的 Runtime 不需要大规模修改？


### 3.

Unified Model Interface 和 Provider Adapter 的关系是什么？


---

下一节：

# Day04 Part E 第三章：Provider Adapter Architecture

这一章会开始进入真正工程设计：

我们会设计：

```text
LLMProvider
    |
    +-- OpenAIAdapter
    |
    +-- ClaudeAdapter
    |
    +-- GeminiAdapter


Adapter 内部：

Message Converter
Tool Converter
Stream Converter
Error Converter
Usage Converter

```

这一章会更接近你未来实现 `mini-agent-runtime` 的代码结构。你会发现它和前端的 **Adapter + Strategy Pattern + Dependency Inversion** 几乎是同一套思想。

## 7. User

这几个问题很简单  直接开启下一章的学习吧

## 8. Assistant

你这个判断是对的。

第二章的问题对于你目前的架构理解来说已经属于**基础校验题**了。

因为经过 Day03 Runtime Architecture、Day04 Part B/C/D，你其实已经具备了一个非常重要的能力：

> 看到“统一接口 + 适配层 + 内外边界”这种设计，可以直接迁移已有的软件架构经验。

所以这几个问题：

---

### 1. 为什么 RuntimeMessage 不直接复用 OpenAI Message？

你的答案应该是：

> 因为 OpenAI Message 是 Provider Protocol，而 RuntimeMessage 是 Agent Runtime Domain Model。前者属于基础设施协议，后者属于业务领域模型。如果绑定，会导致 Runtime 被某一家 Provider 的设计限制。


对应：

```text
错误：

Runtime
 |
 OpenAI Message


正确：

Runtime
 |
 RuntimeMessage
 |
 Adapter
 |
 OpenAI Message

```

---

### 2. 为什么 OpenAI Tool Calling 改协议 Runtime 不需要大改？

因为：

变化被隔离在：

```text
OpenAIAdapter
```

里面。


例如：

旧：

```text
Runtime ToolCall

       |
       v

OpenAI function_call

```


新：

```text
Runtime ToolCall

       |
       v

OpenAI new_tool_protocol

```

Runtime 不知道。

---

### 3. Unified Model Interface 和 Adapter 关系？

一句话：

> Interface 定义能力契约，Adapter 实现具体 Provider 的转换。


类似：

前端：

```text
Storage Interface

        |
        |
 OSS Adapter
 S3 Adapter

```

Agent：

```text
LLMProvider Interface

        |
        |
 OpenAI Adapter
 Claude Adapter

```

---

所以直接进入第三章。

---

# Day04 Part E 第三章：Provider Adapter Architecture

这一章开始进入工程实现层。

前两章解决：

```
为什么抽象？
抽象什么？
```

第三章解决：

```
实际代码怎么组织？
```

---

# 1. Provider Adapter 在 Runtime 架构中的位置


先回忆 Day04 总链路：

```text
                 Runtime Core


+--------------------------------+

 Runtime State


 Context Builder


 Memory Manager


 Tool Runtime


 Planner


+--------------------------------+

                |

                v


       Unified Model Interface


                |

                v


       Provider Adapter Layer


                |

       +--------+---------+

       |                  |

       v                  v


    OpenAI             Claude


                |

                v


              LLM

```

关键边界：

```
Runtime Core
```

下面：

属于 Agent 自己。


下面：

属于外部世界。


---

# 2. Provider Adapter 不应该只是一个类


初级设计：

```ts
class OpenAIAdapter {

 chat(){

 }

}

```

看起来可以。


但是工业 Runtime：

通常会拆：

```text
OpenAIAdapter

 |
 |
 +-- MessageConverter
 |
 +-- ToolConverter
 |
 +-- StreamConverter
 |
 +-- ErrorMapper
 |
 +-- UsageMapper

```

为什么？


因为 Provider 差异不是一个地方。


---

# 3. Message Converter


负责：

Runtime Message

↓

Provider Message


例如：

Runtime：

```ts
{
 role:"user",
 content:"hello"
}

```


OpenAI:

```json
{
 role:"user",
 content:"hello"
}

```


Claude:

```json
{
 role:"user",
 content:[
   {
    type:"text",
    text:"hello"
   }
 ]
}

```


代码：

```ts
class MessageConverter {

 convert(
   messages:RuntimeMessage[]
 ){

 }

}

```

---

# 4. Tool Converter


这个是 Agent 里非常重要的一层。


因为 Day05 Tool Calling 会深入。


Runtime：

定义：

```ts
type ToolDefinition={

 name:string;

 description:string;

 inputSchema:Object;

}

```


例如：

```json
{
"name":"search",
"description":"search web",
"inputSchema":{
"type":"object"
}
}

```

---

OpenAI：

需要：

```json
{
"type":"function",
"function":{
"name":"search"
}
}

```

---

Claude：

需要：

```json
{
"name":"search",
"input_schema":{
"type":"object"
}
}

```

---

所以：

```text
Runtime Tool

      |

      v

ToolConverter

      |

      +------------+

      |            |

 OpenAI       Claude

```

---

# 5. Stream Converter


这个和前端关系最大。


因为 Agent 产品几乎都需要：

Streaming。


比如：

ChatGPT：

文字一个字一个字出现。


但是：

Provider:

事件模型不同。


---

OpenAI:

可能：

```text
response.delta

response.delta

response.done

```

---

Claude:

```text
content_block_start

content_block_delta

message_stop

```

---

Runtime 不应该暴露这些。


应该统一：

```ts
type RuntimeEvent =

 | TextDelta

 | ToolCallStart

 | ToolCallDelta

 | Finish

```

---

例如：

前端：

```tsx
<ChatStream />

```

只监听：

```ts
runtime.onEvent(event)

```

不用知道：

GPT 还是 Claude。


---

# 6. Error Mapper


这是工业系统经常忽略的。


Provider 错误完全不同。


OpenAI：

```json
{
error:{
 type:"rate_limit"
}
}

```


Claude：

```json
{
error:{
 type:"overloaded"
}
}

```


Runtime 需要统一：

```ts
type RuntimeError = {

 code:

   | RATE_LIMIT

   | TIMEOUT

   | AUTH_ERROR

   | MODEL_ERROR


 retryable:boolean

}

```

---

为什么？


因为 Runtime 才能统一：

```text
retry

fallback

alert

logging

```

---

# 7. Usage Mapper


之前提过。

统一：

```ts
type Usage={

 inputTokens:number;

 outputTokens:number;

 totalTokens:number;

}

```


Provider：

不同字段：

```
OpenAI:

prompt_tokens


Claude:

input_tokens


Gemini:

promptTokenCount

```


Adapter 转换。


---

# 8. 一个完整 OpenAI Adapter


大概：

```ts
class OpenAIAdapter 
implements LLMProvider {


 async chat(
   request:ChatRequest
 ){

   const messages =
     MessageConverter.toOpenAI(
       request.messages
     )


   const tools =
     ToolConverter.toOpenAI(
       request.tools
     )


   const response =
      await openai.chat.completions.create({
        messages,
        tools
      })


   return ResponseConverter.fromOpenAI(
      response
   )

 }


}

```

注意：

Runtime：

完全不知道：

```ts
openai.chat.completions.create

```

存在。


---

# 9. Provider Adapter 和 Strategy Pattern


你应该马上想到：

这其实就是 Strategy Pattern。


Runtime：

```ts
class AgentRuntime {


 constructor(
   private llm:LLMProvider
 ){}

}

```

运行时注入：


开发环境：

```ts
new AgentRuntime(
 new OpenAIAdapter()
)

```


生产：

```ts
new AgentRuntime(
 new ClaudeAdapter()
)

```


测试：

```ts
new AgentRuntime(
 new MockLLMAdapter()
)

```


---

这个非常重要。

因为：

Agent Runtime 测试不能依赖真实 LLM。


否则：

- 慢
- 贵
- 不稳定


Mock Provider 是必须的。


---

# 10. 和前端架构类比


你应该已经发现：

这和前端工程化非常像。


比如：

HTTP：

```text
axios

 |

HttpClient Interface

 |

fetch

 |

XMLHttpRequest

```


Storage：

```text
Storage Interface

 |

OSS

 |

S3

```

Agent：

```text
LLMProvider Interface

 |

OpenAI

 |

Claude

```

本质都是：

> Dependency Inversion（依赖倒置）


---

# 本章核心认知升级


以前：

```
调用 GPT
```

现在：

```
Runtime 调用 LLM Capability

Provider 只是实现方式
```


以前：

```
模型 = Agent
```


现在：

```
Agent Runtime

+
任意 LLM Provider

```

---

# 一个非常关键的架构结论


未来真正强大的 Agent 平台：

不会绑定：

```text
GPT Agent

Claude Agent

Gemini Agent

```

而会提供：

```text
Agent Runtime

+

Provider Ecosystem

```

类似：

浏览器：

```text
Web Runtime

+
Chrome
Safari
Firefox

```

---

下一节进入：

# Day04 Part E 第四章：
# Streaming / Tool Calling / Error / Usage Adapter

这一章会是 Part E 最有工程价值的一章。

因为它会连接：

- Day04 Provider Adapter
- Day05 Tool Calling
- Day06 Streaming/Event System

也就是开始进入真正 Runtime 实现阶段。你后面写 `mini-agent-runtime` 基本会直接用到这里。

## 9. User

继续

## 10. Assistant

# Day04 Part E 第四章：Streaming / Tool Calling / Error / Usage Adapter

这一章非常关键。

因为前面几章主要解决：

```text
为什么需要 Adapter？
Adapter 怎么设计？
```

而这一章开始进入：

> Provider Adapter 在真实 Agent Runtime 中到底需要屏蔽哪些差异？

也就是：

```text
LLM Provider 的所有不确定性
          |
          v
Provider Adapter
          |
          v
稳定的 Runtime 世界
```

---

# 1. 为什么这一章重要？

如果只是普通聊天：

```text
User
 |
 v
LLM
 |
 v
Answer
```

Adapter 其实很简单：

```text
Message 转换
```

但是 Agent 不一样。


Agent 有：

```text
LLM
 |
 +-- Streaming
 |
 +-- Tool Calling
 |
 +-- Usage
 |
 +-- Error
 |
 +-- Retry
 |
 +-- Structured Output
```

所以 Provider Adapter 实际上是：

> Runtime 与模型生态之间的防火墙。


---

# 2. Streaming Adapter

先看 Streaming。

这是你前端经验最容易理解的部分。

---

## 2.1 普通 Response


普通调用：

```text
Request

    |

    v


LLM


    |

    v


完整 Response

```

例如：

```json
{
 "content":
 "你好，我是 AI..."
}
```

一次返回。


---

但是 ChatGPT 类产品：

不是这样。


而是：

```text
你
好
，
我
是
AI
```

逐步出现。


这就是 Streaming。

---

# 3. 为什么 Streaming 需要 Adapter？


因为不同 Provider 的事件模型不同。


---

## OpenAI 风格


可能：

```json
{
 type:"delta",
 content:"你"
}
```

下一次：

```json
{
 type:"delta",
 content:"好"
}
```

最后：

```json
{
 type:"done"
}
```


---

## Claude 风格


可能：

开始：

```json
{
 type:"content_block_start"
}
```


中间：

```json
{
 type:"content_block_delta",
 delta:{
   text:"你好"
 }
}
```


结束：

```json
{
 type:"message_stop"
}
```


---

如果 Runtime 直接处理：

会出现：

```ts
if(provider==="openai"){

}

else if(provider==="claude"){

}

```

污染 Runtime。


---

# 4. Runtime 应该定义自己的 Event Model


例如：

```ts
type RuntimeEvent =

 | TextDeltaEvent

 | ToolCallStartEvent

 | ToolCallDeltaEvent

 | UsageEvent

 | FinishEvent

```

---

例如：

文本：

```ts
{
 type:"text_delta",
 text:"你好"
}
```


Tool：

```ts
{
 type:"tool_call_start",
 name:"search"
}
```


结束：

```ts
{
 type:"finish"
}
```

---

于是：

架构变成：

```text
OpenAI Stream

        |

        v

OpenAI Stream Adapter

        |

        v

RuntimeEvent


        |

        v

Frontend

```


---

# 5. 为什么这对前端特别重要？

因为你的 UI 不应该关心模型。


比如：

React：

```tsx
function Chat(){

 useRuntimeEvent(
   event=>{
      append(event.text)
   }
 )

}

```

它不应该：

```tsx
if(gpt){

}

if(claude){

}

```

否则：

UI 和模型绑定。


---

这其实就是你以前做：

组件库抽象。

业务组件：

```text
Button

```

不关心：

```text
antd Button

Element Button

```

一样。


---

# 6. Tool Calling Adapter

这个是 Day05 的前置。

先建立 Adapter 视角。

---

## Runtime 世界里的 Tool


Runtime 认为：

工具就是：

```ts
type ToolDefinition={

 name:string;

 description:string;

 inputSchema:JSONSchema;

}

```


例如：

```json
{
"name":"searchUser",

"description":"查询用户",

"inputSchema":{
"type":"object",
"properties":{
"id":{
"type":"string"
}
}
}

}
```

---

Runtime 不知道：

OpenAI 怎么表示。

---

# 7. OpenAI Tool 格式


OpenAI：

类似：

```json
{
"type":"function",

"function":{

"name":"searchUser",

"description":"查询用户",

"parameters":{

}

}

}
```


---

Claude：

可能：

```json
{
"name":"searchUser",

"description":"查询用户",

"input_schema":{

}

}
```

---

所以：

```text
Runtime Tool

       |

       v

Tool Adapter


       |

 +-----+------+

OpenAI       Claude

```

---

# 8. Tool Result Adapter


还有一个方向：

不仅：

Runtime → Provider


还有：

Provider → Runtime


例如：

模型返回：

OpenAI：

```json
{
tool_calls:[
{
name:"searchUser",
arguments:"{}"
}
]
}
```

---

Runtime 不应该保存这个。


应该转换：

```ts
type ToolCall = {

 id:string;

 name:string;

 arguments:Object;

}

```


然后：

进入：

```text
Runtime State

```

---

这点和 Part B 很连接。


还记得：

> Tool Result 不应该直接进入 LLM。


完整流程：

```text
LLM

 |
 v

Provider Adapter

 |
 v

Runtime ToolCall

 |
 v

Tool Runtime

 |
 v

Tool Result

 |
 v

Runtime State

 |
 v

Context Builder

 |
 v

下一轮 LLM

```

---

# 9. Error Adapter

工业系统一定需要。

---

## 为什么？

因为模型服务一定会失败。


例如：

### 限流

OpenAI:

```json
{
type:"rate_limit"
}
```


Claude:

```json
{
type:"overloaded"
}
```


Runtime 不应该知道。


---

统一：

```ts
type RuntimeError={


 code:

 | RATE_LIMIT

 | TIMEOUT

 | AUTH_FAILED

 | MODEL_UNAVAILABLE;



 retryable:boolean;



 message:string;


}

```

---

然后 Runtime 可以：

```ts
if(error.retryable){

 retry()

}

else{

 notify()

}

```

---

注意：

这里体现一个重要原则：

> Adapter 不只是转换数据，它还负责转换语义。


---

# 10. Usage Adapter


为什么 Usage 需要 Adapter？


因为 Agent 平台必须知道：

- 花多少钱
- 使用多少 token
- 用户额度
- 模型成本


---

Provider:

OpenAI:

```json
{
prompt_tokens:100,
completion_tokens:50
}
```


Claude:

```json
{
input_tokens:100,
output_tokens:50
}
```


Gemini:

```json
{
promptTokenCount:100
}
```


Runtime：

统一：

```ts
type Usage={

 inputTokens:number;

 outputTokens:number;

 totalTokens:number;

}

```

---

# 11. Provider Adapter 最终结构


现在完整：

```text
ProviderAdapter


 |
 +-- MessageConverter
 |
 +-- ToolConverter
 |
 +-- StreamConverter
 |
 +-- ErrorMapper
 |
 +-- UsageMapper
 |
 +-- ResponseConverter

```

---

对应：

```text
Runtime Model

       |

       v

Adapter Layer


       |

       v


Provider SDK

```

---

# 12. 到这里 Day04 的完整闭环

现在回看 Day04：

---

## Part A

Prompt 不是 Context

↓

## Part B

Runtime State 是 Agent 世界

↓

## Part C

Context Builder 把世界投影给 LLM

↓

## Part D

Context Window Management 管理认知资源

↓

## Part E

Provider Adapter 让 Runtime 与任何模型连接


完整：

```text
                 Runtime


                  State

                    |

                    v

              Context Builder

                    |

                    v

             Runtime Context

                    |

                    v

          Provider Adapter

                    |

        +-----------+-----------+

        |                       |

        v                       v

     OpenAI                  Claude


                    |

                    v

                   LLM

```

---

# 一个非常重要的认知升级

到这里，你应该已经可以理解：

为什么现在很多 Agent 框架看起来：

```text
几十行代码调用 LLM
```

但真正工业系统：

需要：

```text
Runtime State

Context Engineering

Provider Adapter

Tool Runtime

Memory System

Event System

Observability

```

因为：

调用模型只是 Agent 的一个环节。

---

# 本章核心认知升级

以前：

> Provider Adapter = 换模型的工具


现在：

> Provider Adapter = 隔离模型生态差异，保护 Runtime 稳定性的基础设施层。


---

# 下一节

## Day04 Part E 第五章：Mini Provider Adapter 实现设计

这一章会进入代码设计：

我们会设计：

```ts
src/
 ├── providers/
 │    ├── interface.ts
 │    ├── openai/
 │    │     ├── adapter.ts
 │    │     ├── converter.ts
 │    │
 │    ├── claude/
 │          ├── adapter.ts
 │
 ├── runtime/
      ├── message.ts
      ├── events.ts

```

并且把前面：

- RuntimeMessage
- ChatRequest
- ChatResponse
- ToolCall
- StreamEvent

串起来。

这一章基本就是你后面实现 `mini-agent-runtime` 时 Provider 层的雏形。

## 11. User

继续

## 12. Assistant

# Day04 Part E 第五章：Mini Provider Adapter 实现设计

这一章开始进入代码设计阶段。

前面四章我们一直在讨论：

```text
为什么抽象？
抽象什么？
边界在哪里？
```

现在进入：

> 如果我们自己实现一个 mini-agent-runtime，Provider Adapter 这一层代码应该怎么组织？

这一章非常重要，因为它会把 Day04 前面的所有知识串起来。

---

# 1. Mini Agent Runtime 的整体目录设计

假设我们的项目：

```text
mini-agent-runtime
```

目录：

```text
src/

├── runtime/
│
│   ├── state.ts
│   ├── message.ts
│   ├── context.ts
│   └── events.ts
│
├── providers/
│
│   ├── interface.ts
│   │
│   ├── openai/
│   │   ├── adapter.ts
│   │   ├── message-converter.ts
│   │   ├── tool-converter.ts
│   │   └── stream-converter.ts
│   │
│   ├── claude/
│       ├── adapter.ts
│       └── converter.ts
│
├── tools/
│
├── memory/
│
└── index.ts

```

这里体现一个非常重要的架构：

```text
Runtime Domain

和

Provider Infrastructure

完全隔离。
```

---

# 2. Runtime 层定义自己的模型

首先：

不要从 Provider 开始。

先定义：

Agent Runtime 自己的世界。

---

## 2.1 Runtime Message


`runtime/message.ts`

```ts
export type MessageRole =
  | "system"
  | "user"
  | "assistant"
  | "tool";


export interface RuntimeMessage {

  role: MessageRole;

  content: ContentBlock[];

  metadata?: {
    timestamp?: number;
    source?: string;
  };

}

```

---

为什么不用：

```ts
content:string
```

？

因为现代 Agent Message 不只是文本。


未来可能：

```text
文本

图片

文件

Tool Call

Tool Result

代码块

引用

```

所以：

```ts
ContentBlock
```

---

例如：

```ts
export type ContentBlock =

 | TextBlock

 | ToolCallBlock

 | ToolResultBlock;


export interface TextBlock {

 type:"text";

 text:string;

}


export interface ToolCallBlock {

 type:"tool_call";

 name:string;

 arguments:unknown;

}

```

---

这一步非常像：

React 从：

```jsx
children:string
```

升级到：

```tsx
children:ReactNode
```

因为系统复杂度提高了。

---

# 3. 定义 Unified Model Interface


`providers/interface.ts`

这是整个 Provider Layer 的核心。


```ts
export interface LLMProvider {


 chat(
   request:ChatRequest
 ):Promise<ChatResponse>



 stream(
   request:ChatRequest
 ):AsyncIterable<RuntimeEvent>


}

```

---

注意：

这里没有：

```ts
OpenAI

Claude

Gemini

```

只有：

```text
LLM 能力
```

---

# 4. ChatRequest


```ts
export interface ChatRequest {


 messages:RuntimeMessage[];


 tools?:ToolDefinition[];


 temperature?:number;


 model?:string;


}

```

---

这里可能有人疑问：

为什么还有：

```ts
model
```

不是 Provider 信息吗？


这里需要区分。


比如：

Runtime：

```text
我要一个推理能力强的模型
```

可能：

```ts
model:"reasoning"
```

Provider Adapter：

转换：

```text
reasoning

↓

gpt-5-thinking
claude-opus
```

---

所以：

Runtime 可以表达能力需求。

但不要表达：

Provider API 细节。


---

# 5. ChatResponse


```ts
export interface ChatResponse {


 message:RuntimeMessage;


 usage?:Usage;


 finishReason?:string;


}

```

---

注意：

返回也必须回到 Runtime 世界。


不要：

```ts
OpenAIResponse
```

泄漏出来。


---

# 6. OpenAI Adapter


现在才进入：

Provider。


目录：

```text
providers/openai/

adapter.ts

```

---

```ts
class OpenAIAdapter 
implements LLMProvider {


 constructor(
   private client:OpenAI
 ){}



 async chat(
   request:ChatRequest
 ){

   const messages =
      convertMessages(
        request.messages
      );


   const tools =
      convertTools(
        request.tools
      );


   const response =
      await this.client.chat.completions.create({

        messages,

        tools

      });



   return convertResponse(
       response
   );

 }


}

```

---

注意流程：

```text
RuntimeMessage

        |

        v

convertMessages

        |

        v

OpenAI Message

        |

        v

OpenAI API

```

---

# 7. Message Converter


例如：

Runtime：

```json
{
 role:"user",

 content:[
  {
   type:"text",
   text:"hello"
  }
 ]
}

```

转换：

```json
{
 role:"user",

 content:"hello"

}

```

---

代码：

```ts
function convertMessages(
 messages:RuntimeMessage[]
){


 return messages.map(
  msg=>({

    role:msg.role,

    content:
      msg.content
      .map(
        block=>block.text
      )
      .join("")

  })
 )

}

```

---

# 8. Tool Converter


Runtime:

```ts
{
 name:"search",

 description:"search web",

 inputSchema:{}

}

```

转换：

OpenAI:

```json
{
 type:"function",

 function:{
   name:"search",

   parameters:{}

 }

}

```

---

代码：

```ts
function convertTool(
 tool:ToolDefinition
){


 return {

   type:"function",

   function:{

     name:tool.name,

     description:
        tool.description,

     parameters:
        tool.inputSchema

   }

 }

}

```

---

# 9. Response Converter


OpenAI 返回：

```json
{
 choices:[
 {
  message:{
    role:"assistant",
    content:"hello"
  }
 }
]
}

```

转换：

Runtime:

```ts
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

为什么必须转换？


因为：

Runtime State 保存的是：

```text
RuntimeMessage

```

不是：

```text
OpenAI Response

```

---

# 10. Streaming Adapter


这里连接 Day06。


定义：

```ts
export type RuntimeEvent =


 | {

   type:"text_delta";

   text:string;

 }


 | {

   type:"tool_call";

   name:string;

 }


 | {

   type:"finish";

 }


```

---

OpenAI：

```text
delta

delta

done

```

转换：

```text
text_delta

text_delta

finish

```

---

Claude：

```text
content_delta

message_stop

```

转换：

```text
text_delta

finish

```

---

Runtime：

永远只处理：

```text
RuntimeEvent

```

---

# 11. Runtime 如何使用 Provider？


这里体现依赖倒置。


Runtime：

```ts
class AgentRuntime {


constructor(
 private provider:LLMProvider
){}



async run(){

 const response =
    await this.provider.chat({

       messages:this.context

    });


}

}

```

---

初始化：

生产：

```ts
new AgentRuntime(

 new OpenAIAdapter()

)

```

---

测试：

```ts
new AgentRuntime(

 new MockProvider()

)

```

---

切换 Claude：

```ts
new AgentRuntime(

 new ClaudeAdapter()

)

```

Runtime 不改。


---

# 12. Mock Provider 为什么重要？


这个很多人忽略。


Agent 测试：

不能每次：

调用真实模型。


原因：

- 慢
- 贵
- 不稳定
- 输出不可预测


所以：

```ts
class MockProvider
implements LLMProvider {


 async chat(){

   return {

    message:{
      role:"assistant",

      content:[
       {
        type:"text",
        text:"mock answer"
       }
      ]

    }

   }

 }


}

```

---

这样：

测试：

```text
Runtime Logic

Context Builder

Tool Loop

State Transition

```

不依赖模型。


---

# 13. 到这里，一个 Mini Runtime 已经具备什么？


现在我们已经有：

```text
Runtime State

        +

Context Builder

        +

LLMProvider Interface

        +

Provider Adapter

        +

Message Converter

        +

Stream Event

```

已经是一个 Agent Runtime 雏形。


---

# 14. 回看 Day04 全部知识


现在整个 Day04 可以画成：

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


        Runtime Message


                   |

                   v


        LLMProvider Interface


                   |

                   v


        Provider Adapter


          /        |        \


         v         v         v


     OpenAI     Claude    Gemini


                   |

                   v


                 LLM


                   |

                   v


            Runtime Update


```

---

# Day04 Part E 核心认知升级

## 第一层

以前：

```text
模型调用
=
调用 SDK
```

现在：

```text
模型调用
=
Runtime Capability Interface
+
Provider Adapter
```


---

## 第二层

以前：

```text
Agent 绑定 GPT
```


现在：

```text
Agent Runtime 不属于任何模型

模型只是 Runtime 的推理插件。
```


---

## 第三层

以前：

```text
换模型 = 重写 Agent
```


现在：

```text
换模型 = 替换 Adapter
```


---

# 第四层（最重要）

整个 Day04 最终形成：

```text
Runtime 决定：

1. 当前世界是什么（State）

2. 给模型看什么（Context）

3. 如何管理认知资源（Context Window）

4. 如何连接不同模型（Provider Adapter）

```

---

# 下一节：Day04 Part E 第六章（最终总结）

下一章我们会做：

1. Day04 A-E 全链路总结  
2. Runtime Architecture 最终图  
3. 回收 Day04 前面所有 Pending Questions  
4. 面试视角  
5. 写书 TODO  
6. 写书素材  
7. 本 Part 核心认知升级  

然后 Day05 正式进入：

# Tool Calling

也就是：

> LLM 如何从“思考”进入“行动”。

这会是 Agent Runtime 真正开始执行任务的地方。你之前提到的：

```text
LLM + Workflow + Tools + Memory
```

会从 Day05 开始真正展开。

## 13. User

继续

## 14. Assistant

# Day04 Part E 第六章：Day04 全部串联总结

到这里，Day04 Part E 已经完成。

这一章其实不是单独讲 Provider Adapter，而是完成了整个 **Agent Runtime 内核认知闭环**。

如果说 Day01-Day03 是在认识 Agent：

```text
什么是 Agent？
Runtime 是什么？
为什么需要 Runtime？
```

那么 Day04 做的事情是：

> 构建 Agent 的“大脑架构”。

---

# 一、Day04 五个 Part 回顾

先把 Day04 全部串起来。


---

# Part A：Agent Runtime 基础


核心问题：

> Agent 为什么不能只是一个 LLM 调用？


最初：

```text
User

 ↓

Prompt

 ↓

LLM

 ↓

Answer

```

这是 Chatbot。


但是 Agent：

需要：

```text
User

 ↓

Runtime

 ↓

LLM

 ↓

Tools

 ↓

Memory

 ↓

State Update

 ↓

Next Step

```

所以：

Agent 的核心不是 LLM。

而是：

```text
Runtime Loop
```

---

# Part B：Runtime State


核心升级：

> Agent 不是一次请求，而是一个持续运行过程。


所以需要：

```ts
RuntimeState
```


保存：

```text
Conversation

Memory

Tool Result

Plan

Variables

Checkpoint

Metadata

```

---

类似前端：

```text
React Component

      |

      v

State

      |

      v

Render

```


Agent：

```text
Runtime

      |

      v

State

      |

      v

Decision

```

---

# Part C：Context Builder


核心问题：

> Runtime 有这么多状态，LLM 为什么不能全部看到？


因为：

Context Window 有限制。


所以：

需要：

```text
State

 |

 v

Context Builder

 |

 v

LLM Context

```


Context Builder 负责：

选择：

- 哪些历史重要
- 哪些 Memory 相关
- 哪些 Tool Result 需要保留
- 哪些信息需要摘要


---

这里完成了一个重要升级：

以前：

```text
Prompt Engineering
```

现在：

```text
Context Engineering
```


---

# Part D：Context Window Management


核心问题：

> Context 不够怎么办？


解决：

不是简单删除。


而是：

资源管理。


类似：

操作系统：

```text
Memory Management

```


Agent：

```text
Context Window Management

```


策略：

## 1. Truncation

删除低价值历史。


## 2. Summarization

压缩历史。


## 3. Retrieval

需要时重新获取。


## 4. Projection

只投影当前任务需要的信息。


---

这里形成：

```text
Runtime State

大世界


        |

        v


Context Builder


        |

        v


LLM Context

小世界

```

---

# Part E：Provider Adapter


最后一个问题：

> Runtime 怎么连接不同模型？


答案：

不要绑定。


增加：

```text
Unified Model Interface

```


结构：

```text
Runtime

   |

   v

LLMProvider Interface

   |

   v

Provider Adapter

   |

 +------+------+

OpenAI Claude Gemini

```

---

# 二、Day04 最终 Runtime 架构图


现在把所有东西放一起：

```text
                       User


                        |

                        v


              +----------------+

              | Runtime Core   |

              +----------------+


                        |

                        v


              +----------------+

              | Runtime State  |

              +----------------+


                        |

                        v


              +----------------+

              | Context Builder|

              +----------------+


                        |

                        v


              +----------------+

              | Runtime Model  |

              +----------------+


                        |

                        v


              +----------------+

              | LLM Provider   |

              | Interface      |

              +----------------+


                        |

                        v


              +----------------+

              | Adapter Layer  |

              +----------------+


              /        |        \


             /         |         \


          OpenAI    Claude    Gemini


                        |

                        v


                       LLM


```


---

# 三、一个非常重要的架构认知升级

经过 Day04，你应该已经不会再认为：

```text
Agent = LLM + Prompt
```

这个理解太浅。


现在：

```text
Agent Runtime

=

State

+

Context Engineering

+

LLM Abstraction

+

Execution Loop

+

Memory

+

Tools

```

---

其中：

LLM：

只是：

```text
Reasoning Engine
```

类似：

浏览器里面：

JavaScript Engine。

---

浏览器：

```text
Browser Runtime

        |

        v

 JavaScript Engine

```

Agent：

```text
Agent Runtime

        |

        v

 LLM Engine

```

---

# 四、Day04 对你前端架构经验的映射


这里我觉得非常值得记录。


因为你本身有 7 年前端架构经验。


实际上：

Agent Runtime 和大型前端架构高度相似。


---

## React


```text
Component

 |

State

 |

Render

```


Agent：

```text
Runtime

 |

State

 |

Decision

```


---

## Redux Selector


```text
Global State

 |

Selector

 |

View

```


Agent：

```text
Runtime State

 |

Context Builder

 |

LLM Context

```


---

## Component Adapter


```text
Business Component

 |

UI Adapter

 |

antd / Element

```


Agent：

```text
Runtime

 |

Provider Adapter

 |

OpenAI / Claude

```

---

所以：

你之前积累的软件架构能力，并不是切换 AI 后重新学习。

而是在迁移。


---

# 五、Day04 遗留问题回收（Pending Questions）


之前学习过程中有几个问题，现在可以回答了。


---

## Q1：

为什么 Agent 需要 Runtime，而不是直接调用 LLM？


答案：

因为 Agent 是持续状态机。


需要：

- 状态保存
- 上下文管理
- 工具执行
- 错误恢复
- 事件流


LLM 只是其中一步。


---

## Q2：

为什么 Memory 不直接塞 Prompt？


答案：

因为 Memory 是 Runtime State。


需要：

```text
Memory

 ↓

Retrieval Policy

 ↓

Context Builder

 ↓

LLM

```

而不是：

```text
全部 Memory

 ↓

Prompt

```

---

## Q3：

为什么 Tool Calling 不属于 LLM？


答案：

因为：

LLM 只能提出行动建议。


真正执行：

属于 Runtime。


流程：

```text
LLM

↓

Tool Call Request

↓

Runtime

↓

Tool Executor

↓

Result

↓

LLM

```

---

# 六、面试视角


## 面试问题 1

### Q：

你如何设计一个 Agent Runtime？


高级回答：

> 我会将 Runtime 分成几个核心模块：State Management、Context Builder、LLM Provider Abstraction、Tool Runtime、Memory System 和 Event System。Runtime 负责控制执行流程，而 LLM 只是其中一个可替换的推理组件。


---

## 面试问题 2

### Q：

为什么需要 Provider Adapter？


回答：

> 因为不同 LLM Provider 在 Message Schema、Tool Calling、Streaming Event、Error Format 和 Usage Metrics 上存在差异。Adapter 可以隔离 Provider Protocol，使 Runtime 保持稳定。


---

## 面试问题 3

### Q：

Context Builder 和 Prompt Template 区别？


回答：

> Prompt Template 主要负责字符串拼接，而 Context Builder 是基于 Runtime State 的动态上下文投影系统，它会考虑 Memory、History、Tool Result 和 Token Budget。


---

# 七、写书 TODO


Day04 可以形成一个完整章节：

## Chapter：Agent Runtime Architecture


目录：

```text
1. 为什么 Agent 需要 Runtime

2. Runtime State

3. Context Engineering

4. Context Window Management

5. Provider Abstraction

6. Runtime Architecture Design

```

---

# 八、写书素材


## 素材 1

标题：

《LLM 不是 Agent 的核心，Runtime 才是》


核心观点：

> LLM 提供推理能力，但 Runtime 决定 Agent 如何记忆、行动和持续运行。


---

## 素材 2

标题：

《Context Engineering 是 Prompt Engineering 的升级》


核心：

Prompt：

```text
写什么

```

Context：

```text
给模型看什么

```


---

## 素材 3

标题：

《为什么 Agent 框架越来越像操作系统》


对应：

OS:

```text
Process

Memory

Scheduler

IO

```

Agent:

```text
Agent Loop

State

Context

Tools

Events

```

---

# 九、本 Part 核心认知升级


## 1.

以前：

```text
模型决定 Agent
```

现在：

```text
Runtime 决定 Agent
```


---

## 2.

以前：

```text
换模型 = 重写应用
```

现在：

```text
换模型 = 替换 Provider Adapter
```


---

## 3.

以前：

```text
上下文 = Prompt
```

现在：

```text
上下文 = Runtime State 的动态投影
```


---

## 4.

最终理解：


一个工业 Agent：

```text
              Agent


                |

        +---------------+

        | Runtime       |

        +---------------+


        State

        Context

        Memory

        Tools

        Events


                |

                v


              LLM

```

LLM 是大脑里的推理区域。

Runtime 才是整个生命系统。

---

# 下一节学习计划


## Day05：Tool Calling

正式进入：

> Agent 从“思考”到“行动”的关键章节。


核心内容：

```text
1. Tool Calling 原理

2. LLM 如何决定调用工具

3. Tool Schema

4. Tool Registry

5. Tool Executor

6. Tool Result 回流

7. Tool Loop

8. 多 Tool 编排

9. Human Approval

10. 实现 Mini Tool Runtime

```


这部分会明显比 Day04 更接近真正 Agent。

因为：

Day04 解决：

> Agent 如何思考。


Day05 开始解决：

> Agent 如何行动。


（另外按照你的学习习惯，Day04 Part E 到这里正式结束。下一次进入 Day05 时，会从 Tool Calling 基础开始。）

## 15. User

Day04 最终 Runtime 架构图中你把里面比如  Runtime Core  Runtime State  Context Builder   Runtime Model   等这里的大模块可以向右展示出里面都是啥以及步骤

## 16. Assistant

这个问题问得非常好。

其实刚才那个 Day04 最终架构图还是**宏观版**，适合快速理解层级关系。

但是对于你现在学习 Agent Runtime，并且未来准备实现 `mini-agent-runtime` 来说，需要进一步展开：

> 每一个大模块内部到底有什么？  
> 一次 Agent Run 从输入到输出到底经过哪些步骤？

我给你展开成 **Runtime 内部视角图**。

---

# Day04 Agent Runtime 最终架构图（展开版）

```text
                                    User
                                     |
                                     |
                                     v

+================================================================================+
|                              Agent Runtime Core                                |
|                                                                                |
|                                                                                |
|   1. Runtime Lifecycle Controller                                              |
|      - 创建一次 Agent Run                                                      |
|      - 管理执行生命周期                                                        |
|      - 控制 Loop                                                               |
|                                                                                |
|   2. Coordinator / Orchestrator                                                |
|      - 调度各模块                                                              |
|      - 决定下一步执行什么                                                      |
|                                                                                |
|   3. Event Manager                                                             |
|      - 发布 Runtime Event                                                      |
|      - Streaming 输出                                                          |
|                                                                                |
|   4. Error Handler                                                             |
|      - Retry                                                                    |
|      - Fallback                                                                  |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v

+================================================================================+
|                              Runtime State                                     |
|                                                                                |
|                                                                                |
|   保存 Agent 当前世界状态                                                      |
|                                                                                |
|                                                                                |
|   Conversation State                                                           |
|       - 用户消息                                                               |
|       - Assistant 消息                                                         |
|       - Tool Message                                                            |
|                                                                                |
|                                                                                |
|   Memory State                                                                 |
|       - 长期记忆                                                               |
|       - 用户信息                                                               |
|       - 历史经验                                                               |
|                                                                                |
|                                                                                |
|   Execution State                                                              |
|       - 当前 Step                                                               |
|       - 当前 Task                                                               |
|       - Plan 状态                                                               |
|                                                                                |
|                                                                                |
|   Tool State                                                                   |
|       - Tool Call                                                               |
|       - Tool Result                                                             |
|                                                                                |
|                                                                                |
|   Metadata                                                                     |
|       - Trace ID                                                                |
|       - Token 使用量                                                            |
|       - 时间信息                                                               |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v


+================================================================================+
|                            Context Builder                                     |
|                                                                                |
|                                                                                |
|   作用：                                                                       |
|   Runtime State  --->  LLM 能理解的 Context                                    |
|                                                                                |
|                                                                                |
|   1. Context Selector                                                          |
|      - 选择哪些信息进入 Context                                                 |
|                                                                                |
|                                                                                |
|   2. History Manager                                                           |
|      - 最近消息                                                                |
|      - 历史摘要                                                                |
|                                                                                |
|                                                                                |
|   3. Memory Retriever                                                          |
|      - 查询相关 Memory                                                         |
|                                                                                |
|                                                                                |
|   4. Tool Result Selector                                                      |
|      - 判断哪些 Tool Result 保留                                               |
|                                                                                |
|                                                                                |
|   5. Token Budget Manager                                                      |
|      - 控制 Context Window                                                     |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v


+================================================================================+
|                             Runtime Model                                      |
|                                                                                |
|                                                                                |
|   Runtime 内部统一的数据模型                                                  |
|                                                                                |
|                                                                                |
|   RuntimeMessage                                                               |
|       - system                                                                  |
|       - user                                                                    |
|       - assistant                                                                |
|       - tool                                                                     |
|                                                                                |
|                                                                                |
|   ContentBlock                                                                 |
|       - text                                                                    |
|       - image                                                                   |
|       - tool_call                                                                |
|       - tool_result                                                              |
|                                                                                |
|                                                                                |
|   ToolDefinition                                                                |
|       - name                                                                     |
|       - description                                                              |
|       - inputSchema                                                              |
|                                                                                |
|                                                                                |
|   RuntimeEvent                                                                   |
|       - text_delta                                                               |
|       - tool_call_start                                                          |
|       - finish                                                                    |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v


+================================================================================+
|                         LLM Provider Interface                                 |
|                                                                                |
|                                                                                |
|   定义 Runtime 和模型之间的契约                                               |
|                                                                                |
|                                                                                |
|   chat()                                                                       |
|       输入: ChatRequest                                                        |
|       输出: ChatResponse                                                       |
|                                                                                |
|                                                                                |
|   stream()                                                                     |
|       输入: ChatRequest                                                        |
|       输出: RuntimeEvent Stream                                               |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v


+================================================================================+
|                          Provider Adapter                                      |
|                                                                                |
|                                                                                |
|   屏蔽不同模型差异                                                             |
|                                                                                |
|                                                                                |
|   Message Converter                                                             |
|       RuntimeMessage                                                           |
|             |                                                                  |
|             v                                                                  |
|       OpenAI Message / Claude Message                                          |
|                                                                                |
|                                                                                |
|   Tool Converter                                                                |
|       Runtime Tool                                                              |
|             |                                                                  |
|             v                                                                  |
|       Provider Tool Schema                                                     |
|                                                                                |
|                                                                                |
|   Stream Converter                                                              |
|       Provider Event                                                            |
|             |                                                                  |
|             v                                                                  |
|       RuntimeEvent                                                              |
|                                                                                |
|                                                                                |
|   Error Mapper                                                                  |
|       Provider Error                                                            |
|             |                                                                  |
|             v                                                                  |
|       Runtime Error                                                             |
|                                                                                |
|                                                                                |
|   Usage Mapper                                                                   |
|       Token Usage                                                               |
|             |                                                                  |
|             v                                                                  |
|       Unified Usage                                                             |
|                                                                                |
+================================================================================+
                                     |
                                     |
                                     v


                 +-------------------+-------------------+
                 |                   |                   |
                 v                   v                   v


             OpenAI              Claude              Gemini


                 |                   |                   |

                 +-------------------+-------------------+

                                     |

                                     v


                                    LLM

```

---

# 一次 Agent Run 的真实执行流程

现在按照时间顺序走一遍。


假设用户：

> 帮我查询订单状态


---

## Step 1：用户输入


进入 Runtime：

```text
User Message

        |
        v

Runtime Core

```

---

## Step 2：创建 Runtime State


Runtime 创建：

```ts
state = {

 messages:[

  {
    role:"user",
    content:"帮我查询订单状态"
  }

 ]

}
```

---

此时：

```text
State
 |
保存事实
```

---

## Step 3：Context Builder 工作


它问：

> 当前调用 LLM，需要给它什么？


可能选择：

```
system prompt

+
最近对话

+
用户信息

+
订单查询工具定义

```


生成：

```ts
Context = {

 messages:[...],

 tools:[

   {
    name:"queryOrder"
   }

 ]

}

```

---

## Step 4：转换 Runtime Model


Runtime 内部：

```ts
RuntimeMessage
```

变成：

```ts
ChatRequest

```

---

## Step 5：进入 Provider Adapter


例如 OpenAI：

转换：

```
Runtime Message

        ↓

OpenAI Message

```

转换：

```
Runtime Tool

        ↓

OpenAI Function Tool

```

---

## Step 6：调用 LLM


OpenAI：

```text
Request

   ↓

GPT

   ↓

Response

```

---

## Step 7：Adapter 转回来


GPT 返回：

```json
tool_call:

queryOrder

```

Adapter：

转换：

```ts
Runtime ToolCall

{
 name:"queryOrder"
}

```

---

## Step 8：Runtime 决定执行 Tool


注意：

这里非常重要。


不是：

```text
LLM 调 Tool
```


而是：

```text
LLM 提议 Tool Call

Runtime 执行 Tool

```

---

流程：

```text
LLM

 |
 |
 v

ToolCall Request


 |
 |
 v


Runtime


 |
 |
 v


Tool Executor


 |
 |
 v


Tool Result

```

---

## Step 9：Tool Result 回 State


State：

增加：

```text
Tool Result

订单:
已发货

```

---

## Step 10：再次 Context Builder


重新构造：

```text
用户问题

+

工具结果

```

再次给 LLM。

---

## Step 11：最终回答


LLM：

```text
你的订单已经发货，预计明天送达。

```

Runtime：

保存：

```text
Assistant Message

```

结束。


---

# 最终一句话总结整个 Runtime

你现在可以把 Agent Runtime 理解成：


```
Runtime Core
        |
        |
管理生命周期

        |
        v

Runtime State
        |
        |
保存世界

        |
        v

Context Builder
        |
        |
选择认知

        |
        v

Runtime Model
        |
        |
统一语言

        |
        v

Provider Adapter
        |
        |
翻译协议

        |
        v

LLM

```


如果类比前端：

| Agent Runtime | 前端 |
|-|-|
| Runtime State | Redux/Zustand Store |
| Context Builder | Selector |
| Runtime Model | Domain Model |
| Provider Adapter | API Adapter |
| LLM | Backend Service |
| Runtime Core | Application Framework |

---

这张展开图其实就是 **Day04 最终应该沉淀到你的 Agent 学习笔记里的核心架构图**。

下一步进入 Day05 Tool Calling 时，我们会在这张图上继续往右扩展：

```text
Runtime Core

      |
      +----------------+
                       |
                       v

              Tool Runtime

                       |
                       v

              External System

```

也就是 Agent 从“认知系统”进入“执行系统”。你前面提到的：

> LLM + Workflow + Tools + Memory

会从这里真正展开。

## 17. User

那今天的学习到此结束了吗 还有需要补充的吗

## 18. Assistant

是的，**Day04 到这里可以正式结束了**。

而且我认为今天不是“学完一个章节”，而是完成了一次非常重要的**Agent 架构认知跃迁**。

不过按照我们之前约定的学习方式，在结束一个 Part / Chapter 时，我会补充几个固定部分：

1. 🔄 前置问题回收（Pending Questions）
2. 面试视角
3. 下一节学习计划
4. 写书 TODO
5. 写书素材
6. 本 Part 核心认知升级

另外我会补充一个：

7. Day04 全章最终认知地图

---

# Day04 Part E 前置问题回收（Pending Questions）

之前你在学习过程中其实提出过几个问题，现在 Day04 已经可以完整回答。

---

## Q1：为什么 Agent = LLM + Workflow + Tools + Memory 比单纯 LLM 更接近企业落地？

现在答案更加清晰：

因为企业需要的不是：

> 一个会聊天的模型。


而是：

> 一个运行在业务流程中的自动化系统。


完整结构：

```text
                  Agent Runtime


                        |

        +---------------+---------------+

        |               |               |

      State           Tools          Memory


        |               |               |

        +---------------+---------------+

                        |

                  Context Builder

                        |

                  Provider Adapter

                        |

                       LLM

```

LLM 只是其中推理部分。


---

## Q2：为什么企业 Agent 往往需要 Workflow？


因为企业流程通常是：

确定性的。


例如客服：

```text
用户咨询订单

↓

识别用户身份

↓

查询订单

↓

判断状态

↓

生成回复

```

这里：

70%-80% 是 Workflow。

LLM：

负责：

- 理解自然语言
- 判断意图
- 生成表达


所以未来企业 Agent：

大概率不是：

```text
完全自由 Agent
```

而是：

```text
Workflow + LLM + Tools
```

这个观点现在经过 Day04 更加成立。

---

## Q3：为什么 Agent Runtime 很像操作系统？


Day04 后答案完整：

OS：

```text
Process

Memory

Scheduler

IO

Resource Management

```

Agent Runtime：

```text
Agent Loop

State

Context Management

Tool Execution

Event System

Token Budget

```

对应关系：

| OS | Agent Runtime |
|-|-|
| Process | Agent Run |
| Memory | Runtime State |
| Scheduler | Runtime Loop |
| IO | Tool Calling |
| Memory Management | Context Management |

---

# 面试视角


## 1. 什么是 Agent Runtime？


高级回答：

> Agent Runtime 是负责管理 Agent 生命周期的执行环境，它负责维护状态、构建上下文、调度模型调用、执行工具、处理事件和错误恢复。LLM 只是 Runtime 中负责推理的一部分。


---

## 2. 为什么需要 Context Builder？


回答：

> Runtime 中的信息量通常超过模型 Context Window，因此需要 Context Builder 根据当前任务动态选择、压缩和组织信息，将 Runtime State 投影成模型可理解的上下文。


---

## 3. Provider Adapter 解决什么问题？


回答：

> Provider Adapter 将 Runtime 内部统一模型和不同 LLM Provider 的协议隔离，包括 Message Schema、Tool Calling、Streaming Event、Error Format 和 Usage Metric，使 Runtime 不绑定任何具体模型。


---

## 4. Tool Calling 是 LLM 做的吗？

高级回答：

> LLM 负责产生 Tool Call 意图，但真正的工具执行属于 Runtime。Runtime 接收模型产生的 Tool Call，然后调用 Tool Executor，将结果重新写入 State，并继续下一轮推理。


这个问题 Day05 会深入。

---

# 写书 TODO

Day04 可以沉淀为：

# Chapter：Building Agent Runtime Core


## 章节结构：

```text
4.1 Why Agent Needs Runtime


4.2 Runtime State Management


4.3 Context Engineering


4.4 Context Window Management


4.5 Provider Abstraction


4.6 Runtime Architecture Design


4.7 Build Mini Agent Runtime


```

---

# 写书素材


## 素材 1

标题：

《LLM 是 Agent 的大脑，但 Runtime 才是生命系统》


核心：

很多人认为：

```
Agent = LLM
```

实际上：

```
Agent = Runtime + LLM
```


LLM 提供：

- 推理

Runtime 提供：

- 记忆
- 状态
- 行动
- 生命周期


---

## 素材 2

标题：

《Context Engineering：新时代 Agent 工程能力》


核心：

Prompt Engineering：

```
我要告诉模型什么？
```


Context Engineering：

```
这一刻模型应该知道什么？
```


区别：

从写提示词：

升级到：

设计信息流。


---

## 素材 3

标题：

《Provider Adapter：Agent 世界的浏览器兼容层》


类比：

Web：

```
Browser API

 ↓

Chrome/Safari/Firefox
```


Agent：

```
LLM Interface

 ↓

GPT/Claude/Gemini
```


---

# Day04 Part E 核心认知升级


## 1. Agent 不等于 LLM


以前：

```
调用模型 = Agent
```


现在：

```
Agent
=
Runtime
+
LLM
```


---

## 2. Runtime State 是 Agent 的世界


以前：

```
Prompt 保存上下文
```


现在：

```
State 保存世界
Context 保存投影
```


---

## 3. Context Builder 是 Agent 的认知过滤器


以前：

```
Prompt 拼接
```


现在：

```
State
 ↓
Policy
 ↓
Context
 ↓
LLM
```


---

## 4. Provider Adapter 是架构边界


以前：

```
换模型 = 改代码
```


现在：

```
换模型 = 换 Adapter
```


---

## 5. 最终认知模型


现在你应该形成：

```text
                       Agent


                         |

                +----------------+

                | Runtime Core   |

                +----------------+


                         |

        +----------------+----------------+

        |                |                |


      State          Context          Tools


        |                |


        +----------------+


                         |

                 Provider Adapter


                         |

              GPT / Claude / Gemini


```

---

# Day04 总体评价


我觉得你今天最大的收获不是：

“学会 Provider Adapter”。

而是：

你已经开始从：

> AI 应用开发者

转向：

> Agent Runtime 架构设计者


因为你现在关注的问题已经不是：

“怎么调用 GPT API”

而是：

- 状态在哪里保存？
- 上下文如何形成？
- 模型如何替换？
- 执行边界在哪里？
- Runtime 如何设计？


这已经进入 Agent Infra 层。

---

# 下一节学习计划

## Day05：Tool Calling（核心章节）

预计难度：

⭐⭐⭐⭐⭐

会明显比 Day04 更难。

因为开始进入：

> Agent 如何从思考走向行动。


目录：

```
Day05 Tool Calling


Part A:
Tool Calling 基础模型


Part B:
LLM 如何决定调用 Tool


Part C:
Tool Schema 设计


Part D:
Tool Registry


Part E:
Tool Executor


Part F:
Tool Result 回流 Runtime


Part G:
Multi Tool Loop


Part H:
Human Approval


Part I:
Mini Tool Runtime 实现

```

---

我建议下一次 Day05 开始前，先不要急着看代码。

因为 Tool Calling 是 Agent 和普通 Chatbot 的**真正分水岭**。

Day04 建的是“大脑结构”。

Day05 开始学习：

> 手和脚如何接入大脑。  
> Agent 如何真正改变外部世界。


今天可以正式收尾。你目前 Day01-Day04 的 Agent Runtime 基础已经形成了一套比较完整的体系。

## 19. User

上面更新的架构图感觉  Context Builder   部分少了  Compression  Eviction  Assembly，Runtime State 里少了 Workspace Index。比如day04 part D 给出的架构图当时是：```
                                 User
                                  |
                                  |
                                  v
                         +----------------+
                         |  User Request  |
                         +----------------+
                                  |
                                  v

                    +---------------------------+
                    |     Task Understanding    |
                    |                           |
                    | - Intent Detection        |
                    | - Goal Extraction         |
                    | - Task Classification     |
                    +---------------------------+

                                  |
                                  v


                         Agent Runtime Loop
        +------------------------------------------------+
        |                                                |
        |                                                |
        |        Runtime State                           |
        |                                                |
        |  +------------------------------------------+  |
        |  | Conversation State                      |  |
        |  | - Messages                              |  |
        |  | - User History                          |  |
        |  +------------------------------------------+  |
        |                                                |
        |  | Goal State                               |  |
        |  | - Current Objective                      |  |
        |  | - Success Criteria                       |  |
        |  +------------------------------------------+  |
        |                                                |
        |  | Planning State                           |  |
        |  | - Plan                                   |  |
        |  | - Current Step                           |  |
        |  | - Remaining Tasks                        |  |
        |  +------------------------------------------+  |
        |                                                |
        |  | Execution State                          |  |
        |  | - Tool Calls                             |  |
        |  | - Tool Results                           |  |
        |  | - Errors                                 |  |
        |  +------------------------------------------+  |
        |                                                |
        |  | Memory Reference                         |  |
        |  | - User Memory                            |  |
        |  | - Project Memory                         |  |
        |  | - Knowledge Memory                       |  |
        |  +------------------------------------------+  |
        |                                                |
        +------------------------------------------------+

                                  |
                                  |
                                  v


                    +----------------------------+
                    |     Context Manager        |
                    |                            |
                    |  (Agent Cognitive System)  |
                    +----------------------------+

                                  |
        +-------------------------+-------------------------+
        |                         |                         |
        v                         v                         v


+---------------+        +---------------+        +----------------+
|  Retrieval    |        |   Ranking     |        | Compression    |
|               |        |               |        |                |
| Memory Search |        | Priority      |        | Summary        |
| Code Search   |        | Relevance     |        | Token Reduce   |
| Vector Search |        | Recency       |        | State Merge    |
+---------------+        +---------------+        +----------------+

        |                         |                         |
        +-------------------------+-------------------------+

                                  |
                                  v


                    +----------------------------+
                    |   Token Budget Manager     |
                    |                            |
                    | Allocate Context Space:    |
                    |                            |
                    | Goal       5%              |
                    | Code      40%              |
                    | Memory    20%              |
                    | History   15%              |
                    | Tool      20%              |
                    +----------------------------+

                                  |
                                  v


                    +----------------------------+
                    |    Context Assembly        |
                    |                            |
                    | Construct LLM Input:       |
                    |                            |
                    | System Prompt              |
                    | Goal                       |
                    | Constraints                |
                    | Relevant Memory            |
                    | Evidence                   |
                    | Tool Result                |
                    +----------------------------+

                                  |
                                  v


                         +----------------+
                         |      LLM       |
                         |                |
                         | Reasoning      |
                         | Planning       |
                         | Decision       |
                         +----------------+

                                  |
                                  v


                         Action Decision

                                  |
                 +----------------+----------------+
                 |                                 |
                 v                                 v

          Tool Calling                      Final Response

                 |
                 v

        +----------------+
        | Environment    |
        |
        | Codebase       |
        | Browser        |
        | Database       |
        | APIs           |
        +----------------+

                 |
                 v

           Observation Result

                 |
                 v

        Runtime State Update

                 |
                 v

        Context Compression

                 |
                 v

             Next Loop
```

## 20. Assistant

你这个发现是对的，而且说明你已经开始从“听架构”进入“审架构”的阶段了。

我前面给出的 **Day04 最终 Runtime 架构图（展开版）** 确实做了一次**过度简化**，为了突出模块边界，把 Day04 Part D 里面已经建立的 Context Engineering 细节压缩掉了。

但是如果作为你最终沉淀到学习笔记 / 未来写书的架构图，应该以 Part D 的完整模型为准。

你指出的两个缺失点：

1. Context Builder 缺少：
   - Compression
   - Eviction
   - Assembly

2. Runtime State 缺少：
   - Workspace Index

都是合理的。

我重新整理一版 **Day04 Final Runtime Architecture v2**。

---

# Day04 Final Agent Runtime Architecture（完整版）

```text
                                    User
                                     |
                                     |
                                     v

                         +----------------+
                         | User Request   |
                         +----------------+

                                     |
                                     v


                    +-----------------------------+
                    |    Task Understanding       |
                    |                             |
                    | - Intent Detection          |
                    | - Goal Extraction           |
                    | - Task Classification       |
                    | - Constraint Extraction     |
                    +-----------------------------+


                                     |
                                     v


======================================================================
                         Agent Runtime Loop
======================================================================


+--------------------------------------------------------------------+
|                                                                    |
|                         Runtime State                              |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Conversation State                                           |  |
|  |                                                              |  |
|  | - Messages                                                   |  |
|  | - User History                                               |  |
|  | - Conversation Summary                                       |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Goal State                                                   |  |
|  |                                                              |  |
|  | - Current Objective                                          |  |
|  | - Success Criteria                                           |  |
|  | - Constraints                                                |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Planning State                                               |  |
|  |                                                              |  |
|  | - Plan                                                       |  |
|  | - Current Step                                               |  |
|  | - Remaining Tasks                                            |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Execution State                                              |  |
|  |                                                              |  |
|  | - Tool Calls                                                 |  |
|  | - Tool Results                                               |  |
|  | - Errors                                                     |  |
|  | - Execution History                                          |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Memory Reference                                             |  |
|  |                                                              |  |
|  | - User Memory                                                |  |
|  | - Project Memory                                             |  |
|  | - Knowledge Memory                                           |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  | Workspace Index                                              |  |
|  |                                                              |  |
|  | - Files                                                      |  |
|  | - Documents                                                  |  |
|  | - Code Symbols                                               |  |
|  | - Retrieved Context                                          |  |
|  | - Search Index Reference                                     |  |
|  +--------------------------------------------------------------+  |
|                                                                    |
|                                                                    |
+--------------------------------------------------------------------+

                                     |
                                     |
                                     v


+--------------------------------------------------------------------+
|                        Context Builder                             |
|                                                                    |
|                    (Agent Cognitive System)                       |
|                                                                    |
+--------------------------------------------------------------------+

                                     |
                                     |
        +----------------------------+------------------------------+
        |                            |                              |
        v                            v                              v


+----------------+        +----------------+        +----------------+
| Retrieval      |        | Ranking        |        | Compression    |
|                |        |                |        |                |
| - Memory       |        | - Priority     |        | - Summary      |
| - Code Search  |        | - Relevance    |        | - Token Reduce |
| - Vector DB    |        | - Recency      |        | - State Merge  |
| - Workspace    |        | - Importance   |        |                |
+----------------+        +----------------+        +----------------+


        |                            |                              |
        +----------------------------+------------------------------+

                                     |
                                     v


+--------------------------------------------------------------------+
|                       Context Optimization                         |
|                                                                    |
|                                                                    |
|  +----------------------+        +----------------------------+    |
|  | Token Budget Manager |        | Eviction Policy             |    |
|  |                      |        |                            |    |
|  | - Token Allocation   |        | - Remove Low Value Context |    |
|  | - Context Priority   |        | - History Trimming         |    |
|  | - Window Control     |        | - Duplicate Removal        |    |
|  +----------------------+        +----------------------------+    |
|                                                                    |
+--------------------------------------------------------------------+

                                     |
                                     v


+--------------------------------------------------------------------+
|                       Context Assembly                             |
|                                                                    |
|                                                                    |
| Construct Final LLM Input                                          |
|                                                                    |
|                                                                    |
| - System Prompt                                                    |
| - Goal                                                              |
| - Constraints                                                       |
| - Relevant History                                                  |
| - Memory                                                            |
| - Workspace Evidence                                                |
| - Tool Result                                                       |
| - Retrieved Knowledge                                               |
|                                                                    |
+--------------------------------------------------------------------+


                                     |
                                     v


+--------------------------------------------------------------------+
|                         Runtime Model                              |
|                                                                    |
|                                                                    |
| Unified Internal Representation                                    |
|                                                                    |
| - RuntimeMessage                                                  |
| - ContentBlock                                                    |
| - ToolDefinition                                                  |
| - ToolCall                                                        |
| - RuntimeEvent                                                    |
|                                                                    |
+--------------------------------------------------------------------+


                                     |
                                     v


+--------------------------------------------------------------------+
|                    LLM Provider Interface                          |
|                                                                    |
|                                                                    |
| - chat()                                                          |
| - stream()                                                        |
|                                                                    |
+--------------------------------------------------------------------+


                                     |
                                     v


+--------------------------------------------------------------------+
|                     Provider Adapter                               |
|                                                                    |
|                                                                    |
| - Message Converter                                               |
| - Tool Converter                                                  |
| - Stream Converter                                                |
| - Error Mapper                                                    |
| - Usage Mapper                                                    |
|                                                                    |
+--------------------------------------------------------------------+


                         |
          +--------------+--------------+
          |              |              |
          v              v              v

       OpenAI        Claude         Gemini


                         |
                         v


                        LLM


                         |
                         v


                  Action Decision


                         |
          +--------------+--------------+
          |                             |
          v                             v


     Tool Calling                 Final Response


          |
          v


+------------------------------+
| Tool Runtime                 |
|                              |
| - Tool Registry              |
| - Tool Executor              |
| - Permission Check           |
| - Human Approval             |
+------------------------------+


          |
          v


+------------------------------+
| Environment                  |
|                              |
| - Codebase                   |
| - Browser                    |
| - Database                   |
| - APIs                       |
+------------------------------+


          |
          v


Observation Result


          |
          v


Runtime State Update


          |
          v


Context Compression


          |
          v


Next Agent Loop

```

---

# 为什么 Workspace Index 必须属于 Runtime State？

你这个点很关键。

之前我把它遗漏，是因为我把 Runtime State 简化成了：

> Agent 当前执行状态


但是对于 Coding Agent / 企业 Agent：

Runtime State 不只是：

```text
当前发生了什么
```

还包括：

```text
Agent 当前拥有的工作空间认知
```

例如 Claude Code：

它不会每次重新扫描：

```text
src/
  components/
  utils/
  api/
```

它会维护：

```text
Workspace Index
```

包括：

- 文件结构
- 符号关系
- 已读取文件
- 相关上下文
- 搜索结果


所以更准确：

Runtime State：

= Execution State

+

World Model


---

# Context Builder 为什么必须有 Assembly？

这个也是一个高级点。

很多人理解 Context Builder：

就是：

```text
找资料
```

其实不完整。


完整流程：

```text
Retrieval

找候选信息


↓

Ranking

排序


↓

Compression

压缩


↓

Eviction

淘汰


↓

Budget Allocation

分配 Token


↓

Assembly

组装 Prompt

```


所以：

Context Builder 更像：

一个 Compiler。


输入：

```text
Runtime State
```

输出：

```text
LLM Context Program
```

---

# 这张图其实就是 Day04 最终版本

之前：

```
Runtime State
      |
Context Builder
      |
LLM
```

是教学简化版。


现在：

```
Runtime State
      |
      |
Context Engineering Pipeline
      |
      |
Runtime Model
      |
Provider Adapter
      |
LLM
```

才是工程版。

---

另外我建议你后续 Day05 开始，我们沿用这个架构图，不再重新画。

因为：

Day05 Tool Calling 只是在这里扩展：

```text
Runtime Core
       |
       +---- Tool Runtime
```

Day06 Streaming：

扩展：

```text
Runtime Core
       |
       +---- Event System
```

Day07 Memory：

扩展：

```text
Runtime State
       |
       +---- Memory System
```


也就是说：

Day04 结束后，这张图就是我们整个 Agent Runtime 学习路线的“总架构地图”。你刚才指出的两个遗漏点，应该补回去。你这个校正是正确的。

## 21. User

架构图里除了英文关键步骤字段吗还要加上必要的中文说明

## 22. Assistant

你这个要求是合理的。

前面的架构图更偏“工程设计文档风格”，所以保留了大量英文模块名，但是作为**学习笔记 / 未来写书素材**，应该采用：

> **英文作为架构领域标准术语 + 中文解释帮助理解**

否则后续回看容易出现：

“知道 Context Builder 这个词，但是忘记它到底负责什么”。

所以 Day04 最终架构图应该升级成：

# Day04 Final Agent Runtime Architecture v3（学习版）

特点：

- 模块名保留英文（方便以后看源码、论文、框架）
- 每个模块增加中文职责说明
- 标注数据流方向
- 保留 Day04 Part D 的 Context Engineering 细节

---

```text
                                  User
                                  用户输入
                                    |
                                    |
                                    v


                      +----------------------------+
                      |      User Request          |
                      |      用户请求              |
                      |                            |
                      | 用户原始问题/任务描述       |
                      +----------------------------+

                                    |
                                    v


              +-------------------------------------------+
              |        Task Understanding                 |
              |        任务理解层                         |
              |                                           |
              | - Intent Detection                         |
              |   意图识别                                |
              |                                           |
              | - Goal Extraction                         |
              |   提取目标                                |
              |                                           |
              | - Task Classification                     |
              |   判断任务类型                            |
              |                                           |
              | - Constraint Extraction                   |
              |   提取约束条件                            |
              +-------------------------------------------+

                                    |
                                    v


====================================================================
                       Agent Runtime Loop
                       Agent 运行循环
====================================================================


+------------------------------------------------------------------+
|                                                                  |
|                       Runtime State                              |
|                       Agent 状态中心                             |
|                                                                  |
|  Runtime 当前拥有的全部世界信息                                  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Conversation State                                         |  |
|  | 对话状态                                                    |  |
|  |                                                            |  |
|  | - Messages                                                 |  |
|  |   用户、模型、工具产生的消息                               |  |
|  |                                                            |  |
|  | - User History                                             |  |
|  |   用户历史交互                                             |  |
|  |                                                            |  |
|  | - Conversation Summary                                     |  |
|  |   历史压缩摘要                                             |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Goal State                                                  |  |
|  | 目标状态                                                    |  |
|  |                                                            |  |
|  | - Current Objective                                         |  |
|  |   当前目标                                                  |  |
|  |                                                            |  |
|  | - Success Criteria                                          |  |
|  |   成功标准                                                  |  |
|  |                                                            |  |
|  | - Constraints                                                |  |
|  |   约束条件                                                  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Planning State                                              |  |
|  | 规划状态                                                    |  |
|  |                                                            |  |
|  | - Plan                                                       |  |
|  |   当前计划                                                  |  |
|  |                                                            |  |
|  | - Current Step                                              |  |
|  |   当前执行步骤                                              |  |
|  |                                                            |  |
|  | - Remaining Tasks                                           |  |
|  |   剩余任务                                                  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Execution State                                             |  |
|  | 执行状态                                                    |  |
|  |                                                            |  |
|  | - Tool Calls                                                |  |
|  |   已发起工具调用                                            |  |
|  |                                                            |  |
|  | - Tool Results                                              |  |
|  |   工具返回结果                                              |  |
|  |                                                            |  |
|  | - Errors                                                    |  |
|  |   执行错误                                                  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Memory Reference                                            |  |
|  | 记忆索引                                                     |  |
|  |                                                            |  |
|  | - User Memory                                               |  |
|  |   用户长期信息                                               |
|  |                                                            |  |
|  | - Project Memory                                            |  |
|  |   项目上下文                                                 |
|  |                                                            |  |
|  | - Knowledge Memory                                          |  |
|  |   外部知识                                                   |
|  +------------------------------------------------------------+  |
|                                                                  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Workspace Index                                             |  |
|  | 工作空间索引（Coding Agent 尤其重要）                       |  |
|  |                                                            |  |
|  | - Files                                                     |  |
|  |   文件结构                                                   |
|  |                                                            |  |
|  | - Code Symbols                                              |  |
|  |   类/函数/变量索引                                           |
|  |                                                            |  |
|  | - Search Index                                              |  |
|  |   搜索索引                                                   |
|  |                                                            |  |
|  | - Retrieved Context                                         |  |
|  |   已获取上下文                                               |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+

                                    |
                                    |
                                    v


+------------------------------------------------------------------+
|                       Context Builder                            |
|                       上下文构建器                               |
|                                                                  |
| 将 Runtime State 投影成 LLM 可以理解的上下文                    |
|                                                                  |
+------------------------------------------------------------------+

                                    |
                                    v


       +----------------+      +----------------+      +----------------+
       | Retrieval      |      | Ranking        |      | Compression    |
       | 信息检索       |      | 信息排序       |      | 信息压缩       |
       |                |      |                |      |                |
       | Memory Search  |      | Relevance      |      | Summary        |
       | Code Search    |      | Priority       |      | Token Reduce   |
       | Vector Search  |      | Recency        |      | State Merge    |
       +----------------+      +----------------+      +----------------+


                                    |
                                    v


+------------------------------------------------------------------+
|                 Context Optimization                             |
|                 上下文优化阶段                                   |
|                                                                  |
|                                                                  |
| +--------------------------+   +------------------------------+ |
| | Token Budget Manager     |   | Eviction Policy               | |
| | Token预算管理            |   | 上下文淘汰策略                 | |
| |                          |   |                              | |
| | 控制 Context Window      |   | 删除低价值信息                | |
| | 分配 Token 空间          |   | 移除过期历史                  | |
| +--------------------------+   +------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+

                                    |
                                    v


+------------------------------------------------------------------+
|                    Context Assembly                              |
|                    上下文组装                                    |
|                                                                  |
| 最终生成发送给 LLM 的输入                                       |
|                                                                  |
| 包含：                                                          |
|                                                                  |
| - System Prompt        系统规则                                 |
| - Goal                 当前目标                                 |
| - Constraints          约束条件                                 |
| - History              相关历史                                 |
| - Memory               相关记忆                                 |
| - Evidence             检索证据                                 |
| - Tool Result          工具结果                                 |
+------------------------------------------------------------------+

                                    |
                                    v


+------------------------------------------------------------------+
|                      Runtime Model                               |
|                      Runtime 内部统一模型                        |
|                                                                  |
| 屏蔽外部 Provider 差异                                           |
|                                                                  |
| - RuntimeMessage       统一消息模型                              |
| - ContentBlock         内容块                                    |
| - ToolDefinition       工具定义                                  |
| - ToolCall             工具调用                                  |
| - RuntimeEvent         运行事件                                  |
+------------------------------------------------------------------+

                                    |
                                    v


+------------------------------------------------------------------+
|                 LLM Provider Interface                           |
|                 模型能力接口                                     |
|                                                                  |
| Runtime 定义模型需要提供什么能力                                 |
|                                                                  |
| - chat()              普通调用                                   |
| - stream()            流式调用                                   |
+------------------------------------------------------------------+

                                    |
                                    v


+------------------------------------------------------------------+
|                    Provider Adapter                              |
|                    模型适配层                                    |
|                                                                  |
| 将 Runtime Model 转换成具体模型协议                              |
|                                                                  |
| - Message Converter    消息转换                                  |
| - Tool Converter       工具格式转换                              |
| - Stream Converter     流事件转换                                |
| - Error Mapper         错误统一                                  |
| - Usage Mapper         Token统计统一                             |
+------------------------------------------------------------------+

                    |                 |                 |

                    v                 v                 v


                OpenAI            Claude            Gemini
                GPT模型           Claude模型        Gemini模型


                    |
                    v


                   LLM
                   大语言模型


                    |
                    v


             Action Decision
             行动决策


                    |
          +---------+---------+
          |                   |
          v                   v


     Tool Calling        Final Response
     工具调用             最终回复


          |
          v


+--------------------------------+
| Tool Runtime                   |
| 工具运行时                    |
|                                |
| - Tool Registry                |
|   工具注册表                   |
|                                |
| - Tool Executor                |
|   工具执行器                   |
|                                |
| - Permission Check             |
|   权限检查                     |
|                                |
| - Human Approval               |
|   人工审批                     |
+--------------------------------+


          |
          v


Environment
外部环境

- Codebase 代码库
- Database 数据库
- Browser 浏览器
- APIs 外部服务


          |
          v


Observation Result
观察结果


          |
          v


Runtime State Update
更新 Agent 状态


          |
          v


Next Agent Loop
进入下一轮循环

```

---

这版才是我建议你最终保存到：

```
day04-runtime-architecture.md
```

里面的版本。

因为它同时满足三个用途：

### 1. 学习理解

中文解释帮助回忆。

### 2. 工程设计

英文模块名接近真实框架源码。

### 3. 写书素材

未来整理成文章时可以直接演化。


另外，你刚才指出的问题其实暴露了一个很重要的学习方法：

**不要只记“模块名字”，要记“数据经过哪些阶段发生什么变化”。**

Day04 真正的主线其实不是：

```
Runtime State
Context Builder
LLM
```

而是：

```
世界状态
 ↓
选择信息
 ↓
压缩信息
 ↓
组装认知
 ↓
转换协议
 ↓
模型推理
 ↓
产生行动
 ↓
改变世界
 ↓
更新状态
```

这条链路才是 Agent Runtime 的核心。你现在对 Day04 的理解已经进入架构设计层，而不是 API 使用层。
