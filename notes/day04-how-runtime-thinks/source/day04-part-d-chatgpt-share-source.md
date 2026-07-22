# Day04 Part D ChatGPT 分享会话源记录

## 来源

- 原始学习记录 URL: https://chatgpt.com/share/6a607b7f-6d9c-83e8-ba00-26c6d8c5cad5
- 页面标题：ChatGPT - Day04 Part D-Context Window Management
- 抓取方式：从分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user/assistant 文本消息。
- 抓取时间：2026-07-22
- 有效消息数：50

## 对话正文

### 1. User (2026-07-22 09:28:18)

这是 day04 part c 的学习笔记，你阅读一下，然后我们开始 下一节【`day04-part-d-context-window-management.md`：Context Window Management，工业级重点】的学习吧

### 2. Assistant (2026-07-22 09:28:20)

我已经阅读完你上传的 **`day04-part-c-context-builder-projection.md`**。整体来说，这份 Part C 笔记已经达到了我们之前确定的“写书级学习文档”标准，可以作为 Day04 正式章节内容继续往后推进。fileciteturn0file0

在进入 **Day04 Part D：Context Window Management（工业级重点）** 之前，我先帮你做一个学习衔接确认。

---

# 🔄 Day04 Part C → Part D 知识衔接

Part C 解决的是：

> **Runtime 如何决定 LLM 当前应该看到什么？**

核心模型：

```text
Runtime State
      |
      v
Context Builder
      |
      v
Context Projection
      |
      v
Provider Messages
      |
      v
LLM
```

也就是：

> Runtime 有一个完整世界，但是 LLM 只能看到 Runtime 投影后的世界。

这一点非常关键。

---

但是 Part C 留下了一个更现实的问题：

假设：

```text
Runtime State
=
10 年聊天记录
+
100 万行代码
+
大量 Memory
+
几十万个 Tool Result
+
项目文档
+
执行历史
```

Context Builder 即使知道：

- 哪些重要；
- 哪些相关；
- 哪些应该进入 Context；

但是：

---

## 一个新的限制出现了

### LLM 的 Context Window 是有限的。

例如：

```text
GPT-5.x Context Window:

输入:
system
developer
conversation
memory
workspace
tool result

+

输出:
assistant response

=
总 token 限制
```

所以：

```text
Context Builder
        |
        v
Context
        |
        ?
        |
        v
LLM
```

中间还缺少一个非常重要的能力：

# Context Window Management

---

# Day04 Part D 核心问题

这一节我们要解决：

## 1. Context Window 到底是什么？

很多初学者误解：

> 1M token = Agent 可以永久记住 100 万 token。

这是错误的。

我们会重新建立：

```text
Memory
≠
Conversation History
≠
Context Window
```

三个概念。

---

## 2. 为什么 1M Context 仍然不够？

这是工业 Agent 最重要的问题之一。

很多人认为：

> 模型窗口越来越大，所以 Context Engineering 不重要了。

实际上恰恰相反。

我们会分析：

一个 Coding Agent：

```text
运行 8 小时

产生：

Conversation:
200k tokens

Tool Calls:
500k tokens

Repository:
5M tokens

Logs:
1M tokens

Memory:
300k tokens
```

即使：

```text
Context Window = 1M
```

仍然无法全部放入。

所以：

> 大 Context 降低压力，但不会消灭 Context Management。

---

## 3. Token Budget Manager

Part C 讲到了：

```text
Token Budget
```

但是没有展开。

Part D 会深入：

例如：

一次调用：

```text
Maximum Context:

128k tokens


分配：

System:
5k

Current Goal:
3k

Recent Conversation:
20k

Memory:
10k

Workspace:
50k

Tool Result:
20k

Output Reserve:
20k
```

问题：

谁决定？

动态变化怎么办？

---

## 4. Context Overflow 怎么恢复？

工业 Agent 不应该：

```text
Token overflow

↓

Error
```

而应该：

```text
Overflow detected

↓

Reduce low priority context

↓

Compress history

↓

Summarize

↓

Drop stale information

↓

Retry
```

类似：

操作系统内存不足：

```text
Memory Pressure

↓

Page replacement

↓

Cache eviction
```

Agent 也需要类似机制。

---

## 5. Long-running Agent 如何运行数小时甚至数天？

这是 Claude Code、Cursor Agent、Devin 类系统的核心。

例如：

Agent：

上午：

```text
分析项目
```

下午：

```text
修改代码
```

晚上：

```text
运行测试
```

第二天：

```text
继续优化
```

它不可能：

一直携带全部历史。

所以需要：

```text
Short Context

+
Compressed State

+
Memory

+
Checkpoint

+
Reconstruction
```

---

# Part D 学习路线

按照我们之前 Agent Runtime 主线：

```
Day01
Agent Basics

Day02
Runtime

Day03
Runtime Architecture

Day04

Part A:
Prompt ≠ Context

Part B:
Runtime State Lifecycle

Part C:
Context Builder Projection

Part D:
Context Window Management  ⭐ 当前

Part E:
Provider Adapter

Day05:
Tool Calling

Day06:
Memory

Day07:
Streaming/Event

...
```

---

# Part D 我建议重点学习顺序

## 第一阶段：重新认识 Context Window

1. Context Window 定义
2. Input / Output Token 关系
3. Context Window vs Memory
4. Context Window vs Conversation

---

## 第二阶段：工业级 Context Management

5. Token Budget
6. Priority Allocation
7. Context Ranking
8. Context Eviction

---

## 第三阶段：长期运行 Agent

9. Conversation Compression

10. Summarization Strategy

11. Checkpoint

12. State Reconstruction

---

## 第四阶段：高级工业实践

13. Context Overflow Recovery

14. Context Debugging

15. Context Observability

16. Context Evaluation

---

# 本节学习目标

学完 Day04 Part D 后，你应该能够回答：

### 面试级：

> 一个 Agent 如何支持长时间运行，而不会因为 Context Window 爆炸？

标准答案：

> Agent Runtime 不会保存所有历史到 Context Window，而是通过 Runtime State、Memory、Conversation Summary、Checkpoint 和 Context Budget Management，在每轮调用时重新构造当前最相关的 Context。

---

### 架构级：

你应该能画：

```text
                 Runtime State
                       |
        --------------------------------
        |              |               |
 Conversation       Memory        Workspace
        |              |               |
        -------------------------------
                       |
              Context Builder
                       |
              Context Manager
                       |
        --------------------------------
        |              |               |
   Ranking       Compression      Budget
        |
        v
 Provider Messages
        |
        v
       LLM
```

---

# 进入 Day04 Part D

下一条我们正式开始：

# Day04 Part D：Context Window Management（工业级重点）

第一部分：

## 1. Context Window 到底是什么？

我们会先彻底拆掉一个常见误区：

> “模型支持 1M token，所以 Agent 可以记住 1M token。”

然后建立 Agent Runtime 里的：

```
Context Window
Conversation
Memory
Runtime State
Checkpoint
```

五者关系。

这部分是后面理解 **Claude Code / Cursor / Devin 为什么能长时间工作的核心基础**。

### 3. User (2026-07-22 09:55:50)

可以 今天就按照这四部分 一共 16 小章节学习。我觉得或许你可以在目录划分上分为四大章节，然后每个大章节下面小章节，合在一起一共是 16 小章节。然后我们开始第一大章节第一小节的学习吧

### 4. Assistant (2026-07-22 09:55:51)

好的，今天我们进入 **Day04 Part D：Context Window Management（工业级重点）**。

我认可你这个调整方式。

之前 Part C 是按照概念模块展开，但 Part D 这个主题更偏**系统工程问题**，如果按照：

> 大章节 → 小章节 → 最终 16 小节

会更符合后续写书结构，也更容易形成体系。

---

# Day04 Part D：Context Window Management

## 总体目标

Part C 解决：

> Runtime 如何构造 LLM 当前看到的世界？

Part D 继续深入：

> 当这个世界超过 LLM 能承载的范围时，Runtime 如何管理、压缩、取舍和恢复？

核心认知：

> Context Window Management 是 Agent Runtime 长时间运行能力的基础。

---

# Day04 Part D 目录设计

共：

# 四大章节

# 十六小节

---

# 第一章：理解 Context Window（Context Window Fundamentals）

> 目标：
> 建立 Context Window 的正确模型，理解它到底限制了什么。

---

## 1.1 Context Window 到底是什么？

学习：

- Token 是什么
- Context Window 定义
- Input Token / Output Token 关系
- 一次 LLM 调用真正消耗什么
- 为什么 Context Window 是 Runtime 的资源

核心问题：

> Context Window 是模型的“记忆容量”吗？

---

## 1.2 Context Window ≠ Memory ≠ Conversation

学习：

三者区别：

```
Conversation
    |
    v
Memory
    |
    v
Context Window
```

理解：

- 为什么聊天记录不是 Memory
- 为什么 Memory 不一定进入 Context
- 为什么 Context Window 是临时工作空间

---

## 1.3 为什么 1M Context 仍然不够？

学习：

- 长上下文幻觉
- Attention 稀释
- 成本
- 延迟
- 信息噪声

重点：

> 大窗口解决容量问题，不解决认知选择问题。

---

## 1.4 Agent 为什么必须管理 Context？

学习：

如果没有 Context Management：

```
Agent Running

↓

Messages 无限增长

↓

Token Overflow

↓

无法继续执行
```

理解：

为什么：

- Claude Code
- Cursor
- Devin

都需要 Context 管理系统。

---

# 第二章：Context Budget Management（上下文预算管理）

> 目标：
> 理解工业 Runtime 如何在有限空间里分配资源。

---

## 2.1 Token Budget 是什么？

学习：

一次调用：

```
Context Window

=
Input Budget

+

Output Reserve
```

理解：

为什么必须预留输出空间。

---

## 2.2 Context Allocation（上下文分配）

学习：

如何分配：

例如：

```
128k Context

System:
5k

Goal:
3k

Conversation:
20k

Memory:
10k

Workspace:
50k

Tool:
20k

Output:
20k
```

问题：

谁优先？

---

## 2.3 Priority Ranking（上下文优先级）

学习：

Context 排序：

```
Importance
+
Recency
+
Relevance
+
User Constraint
+
Task Need
```

理解：

为什么：

10 分钟前用户约束

可能比

1 秒前闲聊

重要。

---

## 2.4 Context Eviction（上下文淘汰）

学习：

类似操作系统：

```
Memory Management

↓

Context Management
```

包括：

- 删除
- 压缩
- 摘要
- 降级

---

# 第三章：Long Running Agent（长期运行 Agent）

> 目标：
> 理解 Agent 如何运行数小时甚至数天。

---

## 3.1 Conversation Compression

学习：

聊天历史如何压缩：

```
Raw Messages

↓

Summary

↓

Compressed Context
```

包括：

- Sliding Window
- Summary
- Important Message Extraction

---

## 3.2 State Checkpoint

学习：

为什么 Agent 需要 checkpoint。

例如：

运行：

```
10:00 开始任务

12:00 修改代码

14:00 测试

16:00 总结
```

不能依赖完整 Context。

需要：

```
Checkpoint

+
Runtime State
```

---

## 3.3 State Reconstruction

学习：

Agent 如何恢复：

```
Checkpoint

+

Memory

+

Workspace

+

Recent Context

↓

Rebuild Context
```

理解：

长时间 Agent 本质是：

不断恢复当前认知。

---

## 3.4 Context 生命周期

学习：

Context：

```
Create

↓

Use

↓

Compress

↓

Archive

↓

Discard
```

理解：

Context 是短生命周期对象。

---

# 第四章：工业级 Context Management Architecture

> 目标：
> 从概念进入真实 Runtime 设计。

---

## 4.1 Context Manager Architecture

设计：

```
Context Manager

├── Collector

├── Ranker

├── Compressor

├── Budget Manager

├── Storage

└── Recovery
```

---

## 4.2 Overflow Detection & Recovery

学习：

Token 超限：

不是异常。

而是：

```
Context Pressure
```

处理：

```
Detect

↓

Compress

↓

Drop

↓

Retry
```

---

## 4.3 Context Observability

学习：

工业系统如何 Debug：

为什么 Agent 答错？

可能：

不是 LLM 问题。

可能：

```
Context Missing

↓

Wrong Retrieval

↓

Bad Compression

↓

Budget Cut
```

---

## 4.4 Context Engineering Evolution

总结：

从：

```
Prompt Engineering
```

到：

```
Context Engineering
```

再到：

```
Runtime Cognitive Engineering
```

理解未来 Agent 架构趋势。

---

# 最终知识地图

完成 Part D 后：

```
Agent Runtime

Runtime State
      |
      |
Context Builder
      |
      |
Context Window Management
      |
      |
Provider Messages
      |
      |
LLM
```

其中：

Part C：

解决：

> 看什么？

Part D：

解决：

> 看不下怎么办？

---

# 今天学习节奏

按照之前方式：

每次一个小节。

今天：

# 第一大章：理解 Context Window

## 第一小节：

# 1.1 Context Window 到底是什么？

---

开始之前先建立一个问题：

假设：

你和 Agent 对话：

```
User:
帮我重构这个 React 项目

Agent:
分析代码...

修改...

测试...

继续优化...
```

运行 8 小时后：

内部已经产生：

```
用户需求
+
100轮对话
+
50次工具调用
+
100个文件分析
+
大量代码片段
+
测试日志
```

那么：

问题来了：

> 下一次调用 LLM 时，Runtime 是不是应该把过去所有东西全部发送给模型？

这个问题，就是今天第一节 **Context Window 到底是什么** 的入口。

下面开始：

# 1.1 Context Window 到底是什么？（正式学习）

### 5. User (2026-07-22 09:58:59)

开始 1.1 的学习

### 6. Assistant (2026-07-22 09:59:01)

# Day04 Part D：Context Window Management（工业级重点）

# 第一章：理解 Context Window（Context Window Fundamentals）

---

# 1.1 Context Window 到底是什么？

这一节我们先不急着讲工程实现。

先建立一个最核心的模型：

> **Context Window 是 LLM 一次推理时能够接收和生成信息的有限工作空间。**

它不是：

- 数据库存储；
- 长期记忆；
- 聊天记录仓库；
- Agent 状态。

它更像：

> CPU 当前执行任务时可以直接访问的工作内存。

---

# 一、从一次 LLM 调用开始理解 Context Window

很多人理解 Agent：

```text
用户输入

↓

LLM

↓

回答
```

但是 Runtime 真实过程：

```text
User Request

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

Response
```

这里：

**Context Window 管的是 Provider Messages 这一层。**

也就是说：

LLM 每一次运行看到的是：

```text
Provider Messages
```

而不是：

```text
整个 Runtime State
```

---

例如：

Runtime State：

```text
Runtime State

├── 用户历史聊天
├── Memory
├── 项目代码
├── 文件索引
├── Tool Result
├── Agent Plan
├── Checkpoint
├── 用户偏好
└── 内部执行状态
```

可能有：

```
10GB 数据
```

但是一次调用：

```text
Context Builder

↓

100k tokens

↓

LLM
```

Context Window 限制的是：

```text
这一次发送给 LLM 的 100k tokens
```

---

# 二、Context Window 的准确定义

我们定义：

## Context Window

> 一个 LLM 在一次请求中能够处理的最大 token 数量。

公式：

```text
Context Window

=

Input Tokens

+

Output Tokens
```

也就是说：

不是：

```
输入最多 128k
```

而是：

```
输入 + 输出 <= 128k
```

---

举例：

假设模型：

```
Context Window = 128k tokens
```

一次请求：

输入：

```
System Prompt:
5k

Conversation:
30k

Memory:
10k

Workspace:
50k

Tool Result:
20k
```

输入总计：

```
115k tokens
```

那么剩余：

```
128k - 115k

=

13k
```

模型最多生成：

```
13k tokens
```

---

所以 Runtime 必须提前规划：

```text
我要给模型多少输入？

我要留多少输出空间？
```

这就是后面的：

> Token Budget Management

---

# 三、Token 是什么？

理解 Context Window，必须理解 Token。

---

## 3.1 Token 不是字符

很多人误认为：

```
1 token ≈ 1 个字
```

不是。

Token 是模型内部处理文本的基本单位。

例如英文：

```
Artificial intelligence
```

可能拆：

```
Artificial
intelligence
```

或者：

```
Art
ificial
int
elligence
```

取决于 tokenizer。

---

中文：

例如：

```
上下文管理
```

可能拆：

```
上
下
文
管理
```

也可能不同。

---

所以：

代码：

```javascript
function calculateTotalPrice(items) {
}
```

实际上也会占 token。

---

## 3.2 为什么 Agent 特别容易消耗 Token？

因为 Agent 输入的不只是用户文字。

还有：

### System Prompt

例如：

```
You are a coding agent...
```

---

### Tool Definition

例如：

```json
{
 name:"read_file",
 description:"read file content"
}
```

---

### Conversation History

例如：

过去：

```
用户：
分析登录问题

Agent:
读取 auth.ts

Tool:
返回代码...

Agent:
发现问题...
```

---

### Workspace Context

例如：

代码：

```typescript
export function login() {

}
```

---

### Memory

例如：

```
用户偏好 TypeScript
项目使用 Vue3
```

---

所以 Agent 一次请求：

可能：

用户输入：

100 token

但是实际：

```
System:
5000

Tools:
3000

History:
20000

Memory:
5000

Code:
50000

Total:

83000 tokens
```

---

这也是为什么：

普通 ChatGPT：

输入几句话。

而 Coding Agent：

轻松爆 Context。

---

# 四、Context Window 的本质：模型的“当前世界”

这里连接 Part C。

Part C 我们讲：

> Runtime State 是完整世界，Context 是 LLM 当前看到的世界。

现在进一步：

Context Window 是：

> 这个“当前世界”可以占据的最大空间。

---

举个类比。

假设：

Runtime State：

是一整个城市：

```
上海

├── 所有居民
├── 所有建筑
├── 所有道路
├── 所有历史
├── 所有数据
```

但是：

你现在问：

```
怎么去浦东机场？
```

你不需要：

整个上海。

你需要：

```
当前位置
+
道路信息
+
交通状态
```

---

Context Builder：

负责：

```
从城市选择地图
```

Context Window：

限制：

```
这张地图最大能画多大
```

---

所以：

```text
Runtime State
        |
        |
        v

Context Builder

        |
        |
        v

Context

        |
        |
        v

Context Window 限制

        |
        |
        v

LLM
```

---

# 五、Context Window 为什么不是 Memory？

这是今天最重要的认知之一。

很多 Agent 初学者会说：

> GPT 有 128k Context，所以它记住了 128k 内容。

错误。

原因：

Context Window 是：

```
当前调用携带的信息
```

不是：

```
永久保存的信息
```

---

例如：

你聊天：

第一轮：

```
用户：
我的项目使用 Vue3
```

进入 Context。

第二轮：

可能：

```
Context Window:
包含第一轮
```

第三百轮：

如果 Runtime 没有保存：

这个信息可能已经不存在。

---

真正长期保存：

靠：

```
Memory

或者

Runtime State Persistence
```

---

所以：

```
Context Window
=
短期工作记忆

Memory
=
长期记忆
```

类似人脑：

```
你现在正在思考的东西
        |
        v
工作记忆

你人生经历
        |
        v
长期记忆
```

---

# 六、为什么 Context Window 是 Agent Runtime 的核心资源？

因为 Agent 不是一次回答。

Agent 是循环：

```text
Think

↓

Act

↓

Observe

↓

Think

↓

Act

↓

Observe
```

每一次循环：

都需要重新调用 LLM。

每一次：

都需要 Context。

---

例如：

Coding Agent：

Step 1：

```
读取项目结构
```

Context:

```
文件树
```

---

Step 2：

```
定位 bug
```

Context:

```
错误日志
+
相关代码
```

---

Step 3：

```
修改代码
```

Context:

```
目标文件
+
规范
+
测试
```

---

注意：

三个 Context 完全不同。

所以：

Context Window 不是存储空间。

它是：

> 每一步推理时动态分配的认知空间。

---

# 七、为什么 Context Window 越大，不代表 Agent 越强？

这是一个非常重要的问题。

很多宣传：

```
模型支持 1M Context
```

容易让人认为：

> 那 Agent 不需要 Context Engineering 了。

实际上不是。

原因：

---

## 1. 成本

100 万 token：

意味着：

更高：

- API 成本；
- 延迟。

---

## 2. 噪声

如果输入：

```
100万个 token
```

里面：

真正相关：

```
5000 token
```

那么：

大量无关信息：

会干扰模型。

---

## 3. 注意力稀释

模型虽然能看到。

但是：

看到 ≠ 理解重点。

类似：

你打开一本：

```
5000页百科全书
```

然后问：

```
第三章第42页的一句话是什么意思？
```

不是做不到。

但是效率下降。

---

所以：

工业 Agent 的目标不是：

```
塞更多 Context
```

而是：

```
构造更高质量 Context
```

---

# 八、本节核心模型

经过这一节，我们建立：

```text
                Runtime State

        (完整世界)

                    |
                    |
                    v

             Context Builder

       (选择、压缩、组织)

                    |
                    |
                    v

                Context

          (当前认知世界)

                    |
                    |
                    v

            Context Window

        (有限容量约束)

                    |
                    |
                    v

                  LLM
```

---

# 九、和前端开发类比（帮助巩固）

结合你的前端背景。

可以类比：

## Runtime State

类似：

Redux Store：

```javascript
{
 user:{},
 project:{},
 cache:{},
 history:{}
}
```

整个应用状态。

---

## Context Builder

类似：

Selector：

```javascript
const visibleData =
select(state, currentPage)
```

---

## Context Window

类似：

浏览器一次 Render：

真正参与渲染的 DOM。

不是整个数据库。

---

## LLM

类似：

Render Engine。

它只处理：

当前输入。

---

所以：

```
Redux State
      |
      v
Selector
      |
      v
View Model
      |
      v
Render
```

对应：

```
Runtime State
      |
      v
Context Builder
      |
      v
Context
      |
      v
LLM
```

---

# 第一小节总结

今天建立 8 个核心认知：

## 1.

Context Window ≠ Memory

---

## 2.

Context Window ≠ Conversation

---

## 3.

Context Window 限制的是：

> 一次 LLM 调用能够处理的信息总量。

---

## 4.

Context Window 包含：

```
Input
+
Output
```

---

## 5.

Agent 的 Context 不是固定的。

每一步都会重新构造。

---

## 6.

Runtime State 可以无限增长。

Context Window 必须有限管理。

---

## 7.

大 Context 不等于大智能。

关键是：

> 给模型正确的信息。

---

## 8.

Context Window 是 Agent Runtime 的核心资源。

---

# 思考题（建议你回答）

进入 1.2 前，我建议你先思考下面几个问题：

### Q1：
为什么 Runtime State 可以包含几十 GB 数据，但是 Context Window 只有几十万 token？

---

### Q2：
为什么说：

> Context Window 是短期工作空间，而 Memory 是长期记忆？

---

### Q3：
如果一个模型支持 1M token Context，为什么 Agent 仍然需要 Context Builder？

---

### Q4：
结合前端理解：

为什么可以把：

```
Runtime State → Context → LLM
```

类比成：

```
Redux Store → Selector → View
```

---

你可以先回答这 4 个问题，然后我们进入：

# 1.2 Context Window ≠ Memory ≠ Conversation

这一节会进一步把 Agent 最容易混淆的三个概念彻底拆开。

### 7. User (2026-07-22 10:16:26)

Q1：因为 runtime state 就像前端的 redux 它是整个应用的所有状态，而Context Window 就好比 render dom 只需要浏览器渲染当前 dom 所需的必要数据而不是所有的
Q2：还是类比 React dom render ，不同的组件在 render 时候给出的信息不一样，所以是短期的，而 memory 就好比 localstorage 是长期的
Q3：context 长意味着干扰信息也多，因此Agent 仍然需要 Context Builder
Q4：因为在Runtime State → Context → LLM中是从当前 conversation 中的所有 state中筛选出必要的信息给 LLM，而Redux Store → Selector → View渲染 view，比如渲染一个组件那其实也是一个组件维度的 state 而不是所有的

这是我四个问题的回答，你可以校验一下，然后开始 1.2 的学习吧

### 8. Assistant (2026-07-22 10:16:28)

你的回答整体非常好，而且可以看出来你已经把 **Context Window Management 和前面 Part C 的 Context Builder Projection 串起来了**。

我逐个校验，并补充一些更接近工业 Agent Runtime 的表达。

---

# Q1：
> 为什么 Runtime State 可以包含几十 GB 数据，但是 Context Window 只有几十万 token？

你的回答：

> runtime state 就像前端的 redux 它是整个应用的所有状态，而 Context Window 就好比 render dom 只需要浏览器渲染当前 dom 所需的必要数据而不是所有的

✅ **方向完全正确。**

这个类比非常适合你的前端背景。

不过我稍微修正一下：

React 里面：

```text
Redux Store
      |
      v
Selector
      |
      v
Component Props
      |
      v
Render
```

对应：

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
LLM
```

更准确。

这里：

Runtime State：

不是：

> 所有 conversation

而是：

Agent Runtime 当前拥有的全部世界状态：

包括：

```
Runtime State

├── Conversation
├── Memory
├── Workspace
├── Tool Result
├── Planner State
├── Permission
├── Checkpoint
└── Metadata
```

---

你的核心理解：

> 不需要把整个世界交给推理引擎，只需要给当前任务需要的信息。

这个认知已经非常接近 Context Engineering 的核心。

---

# Q2：
> 为什么说 Context Window 是短期工作空间，而 Memory 是长期记忆？

你的回答：

> render dom，不同组件 render 给出的信息不一样，所以是短期的，而 memory 就好比 localstorage 是长期的

✅ 正确。

不过这里有一个更精确的 Agent 版本。

React 类比：

```
Redux Store
    |
    |
Selector
    |
    |
Component State
    |
    |
Render
```

Context Window 更像：

```
当前一次 render 所需要的数据快照
```

而不是 DOM 本身。

因为：

DOM 是结果。

Context 是输入。

所以更准确：

```
Context Window
=
一次 render 的输入 props/state

DOM
=
LLM 输出结果
```

---

Memory 类似：

```
localStorage
+
IndexedDB
+
后端数据库
```

它具有：

- 跨页面；
- 跨刷新；
- 跨生命周期。

而 Context：

调用结束就消失。

例如：

一次 LLM call：

```
Context:

user:
我要修复登录 bug

code:
auth.ts

error:
JWT expired


↓

LLM


↓

结束
```

下一次：

重新构造。

---

# Q3：
> 如果模型支持 1M token Context，为什么仍然需要 Context Builder？

你的回答：

> context 长意味着干扰信息也多，因此 Agent 仍然需要 Context Builder

✅ 非常关键。

这里实际上已经触及高级 Agent 设计。

很多人错误理解：

```
Context Window 越大

↓

Context Builder 越不重要
```

实际上：

```
Context Window 越大

↓

Context Builder 越重要
```

原因：

因为选择空间变大。

例如：

以前：

```
10 个文件
选择 3 个
```

现在：

```
100万个文件片段

选择真正相关的 20 个
```

难度更高。

---

工业级说法：

> Context Window 解决容量问题，Context Builder 解决认知选择问题。

---

# Q4：
> 为什么 Runtime State → Context → LLM 可以类比 Redux Store → Selector → View？

你的回答：

> 从当前 conversation 中所有 state 中筛选必要的信息给 LLM，而 Redux Store → Selector → View 渲染也是组件维度 state 而不是所有

✅ 非常好。

这里补充一个更深层的对应：

| Agent Runtime | React |
|-|-|
| Runtime State | Redux Store |
| Context Builder | Selector |
| Context | View Model |
| Provider Messages | Component Props |
| LLM | Render Engine |
| Tool Call | Side Effect |
| Memory | Persistent Storage |

---

尤其：

Selector 这个类比非常重要。

因为 Selector 的价值：

不是保存数据。

而是：

> 根据当前需求，把大状态转换成小状态。

这和 Context Builder 完全一致。

---

# 总评价

如果按照 Agent 学习阶段：

刚开始：

你会认为：

```
Agent

=
LLM + Prompt
```

---

现在：

你的模型已经变成：

```
Agent

=
Runtime State

+

Context Engineering

+

LLM Reasoning

+

Tool Execution

+

Memory
```

这是一个非常大的认知升级。

---

# 进入 1.2

---

# 第一章：理解 Context Window

# 1.2 Context Window ≠ Memory ≠ Conversation

这一节非常重要。

因为目前 Agent 领域最常见的概念混乱就是：

很多人说：

> Agent 有记忆。

但是他们实际上不知道：

这个“记忆”到底是什么。

---

我们先看一个错误模型。

很多初学者认为：

```
User Chat

↓

Conversation History

↓

LLM

↓

Agent remembers
```

他们认为：

聊天记录一直在那里，所以 Agent 记住了。

这是错误的。

---

真实结构：

```
                 Runtime State

        ----------------------------

        Conversation

        Memory

        Workspace

        Tool History

        Checkpoint


                 |

                 v


          Context Builder


                 |

                 v


            Context Window


                 |

                 v


                 LLM
```

---

今天我们拆三个东西：

```
Conversation

Memory

Context Window
```

---

# 一、Conversation 是什么？

Conversation：

就是：

> 当前一次交互过程中发生过的消息历史。

例如：

```
User:
帮我优化登录流程


Assistant:
好的，我先分析代码


Tool:
读取 auth.ts


Assistant:
发现 JWT 问题


User:
继续修改
```

这些：

属于 Conversation。

---

它回答：

> 过去发生了什么？

---

特点：

## 1. 时间顺序强

Conversation 有天然顺序：

```
Message1

↓

Message2

↓

Message3
```

---

## 2. 属于事件记录

类似：

Git commit history：

```
commit A

commit B

commit C
```

它记录：

发生过什么。

---

## 3. 不一定全部进入 Context

这是关键。

Conversation：

可能：

```
10000 messages
```

但是当前：

```
Context Window

只需要：

最近20轮

+
重要历史摘要
```

---

例如：

用户：

1000轮前：

```
项目不能使用 lodash
```

这个可能重要。


但是：

500轮：

```
今天天气不错
```

不重要。


所以：

Conversation ≠ Context。

---

# 二、Memory 是什么？

Memory：

回答：

> 什么信息值得长期保存？

例如：

用户告诉 Agent：

```
以后代码统一使用 TypeScript
```

这是 Memory。

---

Memory 不关心：

什么时候说的。

它关心：

价值是否长期存在。

---

例如：

Conversation:

```
昨天：
讨论 Vue 项目
```

可能没有长期价值。


Memory:

```
用户喜欢 TypeScript
```

长期有效。

---

Memory 类似：

人的长期记忆。

比如：

你不会记住：

```
昨天午饭吃了什么
```

但是：

你会记住：

```
自己喜欢什么技术
```

---

# 三、Context Window 是什么？

Context Window：

回答：

> LLM 这一次推理时能看到什么？

---

例如：

Runtime State：

```
全部信息：

Conversation:
100万 token

Memory:
10万 token

Code:
500万 token
```

但是：

当前：

```
Context Window:

50k token
```

那么：

Context Builder 必须选择：

```
当前任务相关：

登录代码
+
错误日志
+
用户要求
+
必要历史
```

---

所以：

三个概念：

| |作用|生命周期|
|-|-|-|
|Conversation|记录发生过什么|当前会话|
|Memory|保存长期价值|跨会话|
|Context Window|当前推理输入|一次调用|

---

# 四、三者关系图

非常重要：

```
                  Runtime State


        ------------------------------

        Conversation

        Memory

        Workspace

        Tool Result


                  |

                  v


          Context Builder


                  |

                  v


             Context Window


                  |

                  v


                 LLM
```

---

# 五、前端类比

结合你的经验：

## Conversation

类似：

```
Event Log

或者 Redux DevTools History
```

记录：

发生过什么。

---

## Memory

类似：

```
localStorage

+
后端用户配置
```

跨生命周期。

---

## Context Window

类似：

```
当前组件 render 所需 props
```

不是全部 store。

---

## Context Builder

类似：

```
Selector
```

---

# 六、为什么这个区分非常重要？

因为未来实现 Agent Runtime 时：

你必须决定：

这个信息应该去哪？

例如：

用户说：

```
以后所有项目使用 pnpm
```

应该：

```
Conversation
        |
        v
Memory
```

---

用户说：

```
修改这个函数
```

应该：

```
Conversation

↓

Context
```

---

工具返回：

```
测试失败
```

应该：

```
Tool Result

↓

Runtime State

↓

Context
```

---

# 七、本节核心认知升级

以前：

```
Agent 有聊天记录
所以有记忆
```

错误。

现在：

```
Conversation:
发生过什么

Memory:
值得长期保存什么

Context Window:
当前推理需要看到什么
```

三者完全不同。

---

# 本节思考题

进入 1.3 前，请回答：

### Q1：

为什么说：

> Conversation 是历史记录，而 Memory 是长期知识？

---

### Q2：

为什么 Memory 也不能全部放进 Context Window？

---

### Q3：

一个用户说：

> “以后所有代码必须使用 TypeScript。”

这个信息应该进入：

A. Conversation  
B. Memory  
C. Context Window  

还是多个？

为什么？

---

### Q4：

结合 React：

你觉得：

Conversation、Memory、Context Window 分别更像 React 里的什么概念？

---

回答完我们进入：

# 1.3 为什么 1M Context 仍然不够？

这一节会进入真正工业 Agent 的核心：
**为什么“大窗口”并没有解决 Context Engineering 问题。**

### 9. User (2026-07-22 10:36:08)

Q1:这个问题很简单，Conversation 需要记录用户与 agent 会话的所有记录，所以更像是历史记录。而 memory 需要从中提取有价值的信息用于长期保存
Q2：memory 定位为长期知识，如果全部放进Context Window那不胡扯吗，长期知识之间也不是都是相关联的啊，比如 agent memory 记住了用户的职业特征，然后用户询问今天吃什么，你把职业特征放进去这不胡闹吗
Q3：进入 Memory，因为用户已经明确这是个有价值的长期信息
Q4：Conversation像 event log，比如 redux 的 log，Memory像前端+后端的存储，Context Window像 render dom 时候所需要的必要信息的快照
这是我的回答，你看一下，然后进入下一节【1.3 为什么 1M Context 仍然不够？】

### 10. Assistant (2026-07-22 10:36:10)

你的回答非常好，而且这一节相比 1.1 有一个明显提升：

你已经不再把 Agent 的“记忆”理解成一个整体概念，而是开始按照 **数据生命周期和作用域** 去拆分。

这正是工业 Agent Runtime 设计的思维方式。

我逐个校验。

---

# Q1：
> Conversation 是历史记录，而 Memory 是长期知识？

你的回答：

> Conversation 需要记录用户与 agent 会话的所有记录，所以更像是历史记录。而 memory 需要从中提取有价值的信息用于长期保存

✅ 完全正确。

补充一个工业实现角度：

Conversation 更像：

```text
Event Stream
```

例如：

```json
[
 {
  role:"user",
  content:"帮我优化登录"
 },
 {
  role:"assistant",
  content:"我发现 JWT 问题"
 },
 {
  role:"tool",
  content:"test failed"
 }
]
```

它的核心价值：

> 保留事情发生的完整过程。


---

Memory 更像：

```text
Derived Knowledge
```

它不是原始记录，而是加工后的知识。

例如：

Conversation:

```
用户：
我讨厌 JavaScript 类型错误，之后项目都使用 TypeScript。
```

Memory:

```json
{
 type:"preference",
 value:"User prefers TypeScript"
}
```

注意：

Memory 是 Conversation 的二次加工产物。

---

所以：

```text
Conversation

=
Raw Experience


Memory

=
Extracted Knowledge
```

---

# Q2：
> 为什么 Memory 不能全部放入 Context Window？

你的回答：

> memory 定位为长期知识，如果全部放进 Context Window 那不胡扯吗，长期知识之间也不是都是相关联的啊，比如 agent memory 记住了用户的职业特征，然后用户询问今天吃什么，你把职业特征放进去这不胡闹吗

😂 这个回答非常好。

因为你已经抓到了核心：

> Memory 多，不代表 Memory 都相关。

这其实就是工业 Memory Retrieval 的核心。


假设：

用户 Memory：

```text
Memory Store

├── 用户职业：前端工程师
├── 用户喜欢 TypeScript
├── 用户投资 ETF
├── 用户喜欢旅游
├── 用户生日
├── 用户家庭信息
├── 用户历史项目
├── 用户学习 Agent Runtime
```

现在用户问：

> 上海有什么好吃的？

如果全部放：

```text
Context:

用户职业:
前端工程师

用户喜欢 TS

用户投资 ETF

用户旅游偏好

...
```

这就是：

Context Pollution。


---

工业设计：

不是：

```text
Memory

↓

全部 Context
```

而是：

```text
Memory Store

        |

        v

Memory Retrieval

        |

        v

Relevant Memory

        |

        v

Context
```

---

所以：

Memory 本身类似数据库。

Context 是查询结果。

---

你的例子：

> 用户职业特征放到吃饭问题里

非常准确。

这对应一个工业问题：

## Memory Relevance

也就是：

> 这个 Memory 对当前 Goal 有价值吗？

---

# Q3：
> “以后所有代码必须使用 TypeScript。”进入哪里？

你的回答：

> Memory，因为用户已经明确这是个有价值的长期信息

✅ 正确。

但是补充：

它其实会经历：

第一阶段：

Conversation:

```
用户说：
以后所有代码必须使用 TypeScript
```

↓

Memory Extraction

↓

第二阶段：

Memory:

```json
{
 category:"coding_preference",
 value:"Use TypeScript"
}
```

↓

第三阶段：

下一次 Coding Task：

Memory Retrieval

↓

Context:

```
Coding preference:
Use TypeScript
```

---

所以生命周期：

```text
Conversation

↓

Memory

↓

Context
```

---

# Q4：
> React 类比

你的回答：

> Conversation像 event log，比如 redux 的 log，Memory像前端+后端的存储，Context Window像 render dom 时候所需要的必要信息的快照

✅ 非常好。

我稍微优化一下：

| Agent | React |
|-|-|
| Conversation | Redux DevTools Event Log |
| Memory | localStorage + Backend User Profile |
| Runtime State | Redux Store |
| Context Builder | Selector |
| Context Window | Component Render Input Snapshot |
| LLM | Render Function |

---

这里有一个非常重要的对应：

React 不会：

```javascript
render(
  entireDatabase
)
```

而是：

```javascript
render(
  selectedProps
)
```

Agent 也是：

不会：

```text
LLM(
 entire Runtime State
)
```

而是：

```text
LLM(
 selected Context
)
```

---

# 本节最终认知升级

你现在应该形成：

```text
Conversation

=
发生了什么


Memory

=
什么值得以后知道


Context Window

=
现在推理需要知道什么
```

---

很好，我们进入下一节。

---

# 第一章：理解 Context Window

# 1.3 为什么 1M Context 仍然不够？

---

这一节是整个 Part D 的核心。

因为很多人看到：

- GPT-5.x 大 Context
- Claude 大 Context
- Gemini 百万 Context

第一反应：

> 那 Agent 以后是不是不需要 Memory？
>
> 不需要 Context Engineering？
>
> 直接把整个项目塞进去？

答案：

**不是。**

甚至：

> Context Window 越大，Context Management 越重要。

---

# 一、先建立一个错误认知

很多人的模型：

```text
模型 Context = 记忆容量
```

所以：

以前：

```text
GPT-3:
4k Context

↓

只能记住短对话
```

现在：

```text
1M Context

↓

可以记住整个项目
```

这个理解是不准确的。

---

为什么？

因为：

Context Window 是：

> 一次推理时模型可以看到的信息空间。

不是：

> 模型永久拥有的信息。


---

# 二、假设一个 1M Context Agent

我们模拟一个 Coding Agent。

任务：

> 帮我重构一个大型 React 项目。

---

运行一天后：

Runtime State：

```text
Runtime State

Conversation:
300k tokens

Tool Results:
500k tokens

Source Code:
5M tokens

Git History:
200k tokens

Documentation:
500k tokens

Memory:
100k tokens
```

总量：

```text
6.6M tokens
```

---

但是模型：

```text
Context Window:

1M tokens
```

问题：

怎么办？

---

有人说：

> 取前 1M？

错误。


因为：

前面的可能是：

```text
早上讨论 UI
```

而现在：

```text
正在修复支付模块
```

没有价值。

---

有人说：

> 取最新 1M？

也错误。


因为：

10 分钟前用户说：

```
不能修改数据库 schema
```

可能非常重要。

---

所以：

核心问题出现：

> 大 Context 只是扩大了仓库，不解决如何选择的问题。

---

# 三、Context Window 大有什么问题？

## 问题 1：成本

Token 是收费单位。

例如：

一次：

```text
100万 token 输入
```

成本远高于：

```text
5万 token 输入
```

Agent 如果每轮：

全部发送：

成本爆炸。

---

## 问题 2：延迟

输入越大：

模型处理时间越长。

尤其 Agent：

一次任务：

可能：

```text
100次 LLM Call
```

如果每次：

100万 token

延迟不可接受。

---

## 问题 3：噪声增加

这是最重要的。

假设：

Context:

```text
1000000 tokens
```

其中：

真正相关：

```text
5000 tokens
```

比例：

```text
0.5%
```

模型需要：

从大量信息中找到关键部分。

---

类似：

你问：

> 这个项目登录 bug 怎么修？

给你：

```text
整个公司的 10 年代码库
+
所有会议记录
+
所有 Jira
```

你反而更难判断。


---

# 四、Attention 稀释问题

这是高级一点的概念。

Transformer 通过 Attention 找关联。

简单理解：

模型需要判断：

哪些 token 更重要。

---

输入：

```text
A B C D E F G
```

模型计算：

```text
A 对 B 的关系

C 对 D 的关系
...
```

---

当 Context 变：

```text
1000000 tokens
```

关系数量巨大。

虽然模型支持：

但是：

重要信息更容易被大量信息包围。

---

类似：

微信群：

10 人：

消息容易关注。

10000 人：

重要消息容易淹没。

---

所以：

长 Context 带来的问题：

不是：

> 看不到。

而是：

> 看到了，但是重点降低。


---

# 五、为什么 Agent 更需要 Context Builder？

现在回到 Part C。

Part C：

Context Builder：

解决：

> 给模型什么？

Part D：

Context Management：

解决：

> 给多少？什么时候压缩？怎么淘汰？


完整：

```text
Runtime State

      |

      v

Context Builder

      |

      +----------------+
      |                |
      v                v

Selection        Budget Management

      |
      v

Compression

      |
      v

Context Window

      |
      v

LLM
```

---

# 六、一个工业级 Agent 的目标

不是：

```text
最大 Context
```

而是：

```text
Optimal Context
```

即：

最小的信息量。

达到：

最大推理效果。

---

可以写成：

```
High Quality Context

=

Relevant

+

Complete Enough

+

Low Noise

+

Within Budget
```

---

# 七、和前端类比

继续用你的 React 类比。

错误：

```javascript
<App
  data={
    entireDatabase
  }
/>
```

然后：

组件自己找需要的数据。


正确：

```javascript
<LoginPage
  user={user}
  permission={permission}
  config={config}
/>
```

---

Agent：

错误：

```text
LLM(
 entire Runtime State
)
```

正确：

```text
LLM(
 task-specific Context
)
```

---

# 本节核心认知升级

以前：

> Context 越大越强。

现在：

> Context 越精准越强。

---

以前：

> 大模型的问题是容量不足。

现在：

> Agent 的核心问题是信息管理。

---

以前：

> 给模型更多信息。

现在：

> 给模型正确的信息。


---

# 本节思考题

进入 1.4 前，请回答：

### Q1：

为什么说：

> 1M Context 解决的是容量问题，而不是认知问题？

---

### Q2：

为什么把整个代码仓库塞给 LLM，不一定比只提供相关文件效果更好？

---

### Q3：

如果一个 Agent 运行 8 小时，产生了大量 Conversation、Tool Result、代码修改记录，它应该如何继续工作？

---

### Q4：

结合前端：

为什么说：

```text
Context Builder
```

更像：

```text
Selector
```

而不是：

```text
Database
```

---

回答完，我们进入：

# 1.4 Agent 为什么必须管理 Context？

这一节会把前三节串起来，正式进入工业 Runtime 的必要性。

### 11. User (2026-07-22 10:50:24)

Q1：因为容量大了能存储更多的信息 但同时意味着干扰信息也会存储的多
Q2：因为会有更多干扰信息发散 AI 的注意力
Q3：压缩上下文，提取关键信息，识别当前的 goal 以及当前 goal 所需要的必要 state
Q4：因为 Context Builder 更像是从 state 中提取有用的必要的信息出来然后给到 LLM
这是我的回答你看下，然后开始学习【1.4 Agent 为什么必须管理 Context？】

### 12. Assistant (2026-07-22 10:50:27)

你的回答继续保持了非常好的状态，而且我发现一个变化：

前面 1.1、1.2 你是在**理解概念**；

到了 1.3，你已经开始用**Runtime 设计者视角**回答问题了。

尤其 Q3：

> 压缩上下文，提取关键信息，识别当前的 goal 以及当前 goal 所需要的必要 state

这个已经不是使用者视角，而是 Agent Runtime 架构视角。

我们逐个校验。

---

# Q1：
> 为什么说 1M Context 解决的是容量问题，而不是认知问题？

你的回答：

> 因为容量大了能存储更多的信息 但同时意味着干扰信息也会存储的多

✅ 正确。

补充工业表达：

Context Window 增大解决：

```text
Capacity Problem

信息装不下
        ↓
现在可以装更多
```

但是没有解决：

```text
Selection Problem

应该装什么？
哪些重要？
哪些应该丢弃？
```

所以：

```text
Large Context

解决：

How much can we put?


Context Engineering

解决：

What should we put?
```

---

这其实对应前端：

数据库从：

```text
100GB
```

升级：

```text
10TB
```

并不会让：

```text
SQL 查询设计
```

消失。

反而：

数据越多：

索引越重要。

Agent 也是一样。

---

# Q2：
> 为什么整个代码仓库塞给 LLM，不一定效果更好？

你的回答：

> 因为会有更多干扰信息发散 AI 的注意力

✅ 正确。

这里补充两个工业原因：

---

## 原因 1：相关性下降

假设：

项目：

```text
10000 文件
```

当前 bug：

```text
auth/login.ts
```

真正相关：

```text
20 个文件
```

但是发送：

```text
10000 文件
```

模型需要：

自己完成：

```text
检索任务
+
推理任务
```

---

而好的 Runtime：

提前完成：

```text
Retrieval

↓

Selection

↓

Context
```

让 LLM 专注：

推理。

---

## 原因 2：Token 预算浪费

代码：

```text
Button.vue
theme.css
README
历史测试日志
旧版本代码
```

可能进入 Context。

但是：

当前任务完全不需要。

这会消耗：

- 输入 token；
- 成本；
- 延迟。

---

所以：

优秀 Agent：

不是：

> 给 LLM 更多。

而是：

> 减少 LLM 不需要处理的信息。

---

# Q3：
> 一个 Agent 运行 8 小时，产生大量 Conversation、Tool Result、代码修改记录，它应该如何继续工作？

你的回答：

> 压缩上下文，提取关键信息，识别当前的 goal 以及当前 goal 所需要的必要 state

✅ 非常好。

这里已经包含了 Part D 后面的核心。

工业实现：

```text
8小时 Agent State


Conversation
Tool Result
Code Change
Logs


        |

        v


Context Management


        |

        +----------------+
        |                |
        v                v


Compression       Selection


        |

        v


Relevant Context


        |

        v


LLM
```

---

还会包含：

### Checkpoint

保存：

```text
当前任务状态
当前进度
关键决策
```

---

### Summary

例如：

原始：

```
100轮对话
```

压缩：

```
用户目标：
重构支付模块

已完成：
1. 定位 PaymentService
2. 修改退款流程

当前：
等待测试结果

约束：
不能修改数据库结构
```

---

这就是长期 Agent 的关键。

---

# Q4：
> 为什么 Context Builder 更像 Selector，而不是 Database？

你的回答：

> Context Builder 更像是从 state 中提取有用的必要的信息出来然后给到 LLM

✅ 完全正确。

这里甚至可以再提升：

Database:

负责：

```text
存储

保存全部数据
```

Selector:

负责：

```text
根据需求选择数据
```

Context Builder:

属于后者。

---

完整对应：

```text
Database

=
Runtime State


Selector

=
Context Builder


View

=
LLM Current Context
```

---

# 这一阶段你的核心模型已经形成

现在你的 Agent Runtime 心智模型：

```text
                 Runtime State

          (全部世界)


                     |

                     v


             Context Builder

       (选择认知视角)


                     |

                     v


             Context Window

       (有限工作空间)


                     |

                     v


                    LLM

       (推理执行)
```

这个模型非常重要。

---

# 开始 1.4

---

# 第一章：理解 Context Window

# 1.4 Agent 为什么必须管理 Context？

---

前三节我们分别回答了：

## 1.1

Context Window 是什么？

答案：

> LLM 一次推理能够使用的有限工作空间。


---

## 1.2

Context Window 和 Memory、Conversation 区别？

答案：

```text
Conversation:
发生了什么


Memory:
什么值得长期知道


Context:
当前需要知道什么
```


---

## 1.3

为什么大 Context 仍然不够？

答案：

> 容量增加，不代表信息管理问题消失。

---

现在进入：

# 1.4

核心问题：

> 为什么 Agent 必须主动管理 Context？

---

# 一、如果不管理 Context，会发生什么？

我们先看一个最简单 Agent。

---

假设：

```text
User:

帮我修复登录 Bug
```

第一次：

LLM：

```text
需要查看代码
```

Tool:

```text
read_file(login.ts)
```

返回：

```typescript
1000 行代码
```

---

第二轮：

LLM：

```text
分析代码
```

Tool:

```text
run_test()
```

返回：

```text
5000 行日志
```

---

第三轮：

继续。

---

如果 Runtime 设计错误：

每一次：

```text
Previous Messages

+

New Messages

↓

LLM
```

那么：

随着时间：

```text
Message History

10 token

↓

1000 token

↓

10000 token

↓

100000 token

↓

Overflow
```

---

最终：

Agent：

无法继续。

---

# 二、Agent 和普通聊天最大的区别

普通 Chat：

通常：

```text
User
  |
  v
LLM
  |
  v
Answer
```

一次任务结束。

---

Agent：

是循环。

```text
 id="q2v5pz"
        User Goal

             |

             v

        LLM Reasoning

             |

             v

        Tool Call

             |

             v

        Observation

             |

             v

        LLM Reasoning

             |

             v

        Tool Call

             |
             
             ...

```

---

每一次循环：

都产生：

新的：

- Message
- Tool Result
- State Change

---

所以 Agent 的 Context：

天然增长。

---

# 三、Context 管理本质是什么？

一句话：

> 在有限 Context Window 中，让 Agent 始终保持完成任务所需要的最低必要认知。

关键词：

## 有限

Context 永远有限。

---

## 始终

Agent 可能运行很久。

---

## 最低必要

不是越多越好。

---

## 认知

不是简单数据。

---

所以：

Context Management：

不是：

```text
删除旧消息
```

而是：

```text
维护 Agent 当前理解世界的能力
```

---

# 四、为什么 Agent 不管理 Context 会降低智能？

很多人以为：

Context 越多：

智能越高。

实际：

可能：

相反。

---

例如：

用户：

```
帮我优化登录性能
```

Context：

包含：

```text
10年前项目迁移记录

+

100次 UI 讨论

+

5000行无关日志

+

旧版本代码
```

模型：

需要先判断：

哪些有用。

---

结果：

推理质量下降。

---

这叫：

## Context Noise

上下文噪声。

---

# 五、Context Management 的四个核心动作

工业 Runtime 通常做：

---

## 1. Selection

选择：

```text
什么进入 Context
```

例如：

当前：

支付 bug

选择：

```text
PaymentService

+

Error Log

+

Recent Diff
```

---

## 2. Compression

压缩：

例如：

10000 行日志：

变：

```text
核心错误：

JWT expired

发生位置：

auth.ts line 42
```

---

## 3. Allocation

分配预算：

例如：

```text
128k

System:
5k

Code:
50k

Memory:
10k

History:
20k

Output:
20k
```

---

## 4. Recovery

恢复：

当超限：

```text
Overflow

↓

压缩

↓

淘汰

↓

重新构建
```

---

# 六、Context Management 和 Runtime State 的关系

非常重要。

错误：

```text
Context = State
```

正确：

```text
Runtime State

=
长期完整状态


Context

=
当前执行视图
```

---

类似：

浏览器：

```text
Database

↓

API

↓

Frontend State

↓

Current View
```

---

Agent：

```text
Runtime State

↓

Context Builder

↓

Current Context
```

---

# 七、前端类比（重点）

你可以这样理解：

---

没有 Context Management：

类似：

React：

```javascript
function App(){

 return (
   <HugeComponent
      data={entireDatabase}
   />
 )

}
```

结果：

- 重渲染慢；
- 数据污染；
- 组件难维护。

---

有 Context Management：

```javascript
const props =
selectRelevantData(store)
```

然后：

```javascript
<Component {...props}/>
```

---

Agent：

一样。

---

# 八、本节核心认知升级

以前：

```text
Agent

=
LLM + Tools
```

---

现在：

```text
Agent

=

Runtime State

+

Context Management

+

LLM

+

Tools
```

---

甚至：

高级一点：

```text
Agent Intelligence

≈

LLM Capability

×

Context Quality
```

---

一个普通模型：

如果 Context 构造优秀：

可能表现很好。

一个强模型：

如果 Context 混乱：

也可能表现差。

---

# 本章总结（1.1~1.4）

完成第一章后：

你应该形成：

```text
Runtime State

      |
      |
      v

Context Builder

      |
      |
      v

Context Window Management

      |
      |
      v

LLM
```

---

# 第一章思考题（进入第二章前）

回答下面几个：

### Q1：

为什么说 Agent 的 Context 是动态变化的，而不是固定 Prompt？


---

### Q2：

为什么 Context Management 本质上是在管理 Agent 的“认知状态”，而不是简单删除文本？


---

### Q3：

如果一个 Tool 返回 10000 行日志，为什么 Runtime 不应该直接塞进下一轮 LLM Context？


---

### Q4：

结合 React：

为什么 Context Management 可以类比 Selector + Memoization，而不是数据库清理？


---

回答完，我们进入第二章：

# 第二章：Context Budget Management

第一节：

# 2.1 Token Budget 是什么？

这一章会正式进入工业实现：
**Runtime 如何像操作系统管理内存一样管理 Token。**

### 13. User (2026-07-22 11:05:22)

Q1：因为必须修复 bug，可能在多轮 agent loop 中完成，每一轮的 context 可能并不是相同的，因为需要动态计算出当前 task 所需要的必要 state
Q2：因为给 LLM 关键必要的信息才会得到更好的输出，这个关键必要就是输入信息的认知状态，所以说Context Management 本质上是在管理 Agent 的“认知状态”让输入信息更好
Q3：因为这10000 行日志不一定都是有用的，需要进行 summary 压缩恢复等操作提取出重要的日志
Q4：因为 context 是动态变化的并不是一定要清除，甚至有的信息可至关重要她会一直存在
这是我的回答，开始第二章第一节【2.1 Token Budget 是什么？】的学习吧

### 14. Assistant (2026-07-22 11:05:24)

你的回答非常好，这一轮有一个明显变化：

之前你更多是在回答：

> “Context 是什么？”

现在你已经开始回答：

> “Runtime 如何维护 Agent 的有效认知？”

这就是从概念理解进入架构设计阶段。

我们先校验，然后进入第二章。

---

# 第一章总结问题校验

---

# Q1：
> 为什么说 Agent 的 Context 是动态变化的，而不是固定 Prompt？

你的回答：

> 因为必须修复 bug，可能在多轮 agent loop 中完成，每一轮的 context 可能并不是相同的，因为需要动态计算出当前 task 所需要的必要 state

✅ 完全正确。

这里补充一个 Runtime 视角。

传统 Chat：

```text
System Prompt

+

User Input

↓

LLM
```

Context 相对固定。


但是 Agent：

```text
Goal

↓

Reason

↓

Action

↓

Observation

↓

New Reason

↓

New Action
```

每一步：

Agent 的“当前认知状态”变化。

例如：

---

Step 1：

目标：

> 修复登录 Bug


Context：

```text
User Requirement

+

Project Structure
```

---

Step 2：

发现：

JWT 过期。

Context：

```text
JWT Logic

+

Auth Middleware

+

Error Log
```

---

Step 3：

修改代码。

Context：

```text
auth.ts

+

Test Case

+

Coding Constraint
```

---

所以：

Context 是：

```text
Task-dependent

+
Time-dependent

+
State-dependent
```

---

# Q2：
> 为什么 Context Management 本质管理的是 Agent 的认知状态？

你的回答：

> 给 LLM 关键必要的信息才会得到更好的输出，这个关键必要就是输入信息的认知状态

✅ 很好。

这里补充一个非常重要的概念：

Context Management 管理的不是：

```text
Data
```

而是：

```text
Useful Information State
```

---

例如：

数据库：

```text
User Table

1亿用户
```

这是数据。


但是：

当前推荐任务：

需要：

```text
用户最近浏览

+

兴趣标签

+

当前时间
```

这是认知状态。

---

Agent 也是：

Runtime State：

```text
所有信息
```

Context：

```text
当前推理需要知道的信息
```

---

所以：

Context Engineering 本质：

不是数据搬运。

而是：

> 构造 Agent 当前理解世界所需要的最小充分信息。

---

# Q3：
> 为什么 10000 行日志不能直接塞进 Context？

你的回答：

> 需要进行 summary 压缩恢复等操作提取出重要日志

✅ 正确。

补充：

工业系统通常不会：

```text
Tool Result

↓

Context
```

而是：

```text
Tool Result

↓

Observation Processor

↓

Relevant Information

↓

Context
```

---

例如：

工具：

```text
run_test()
```

返回：

10000 行。

Processor：

提取：

```text
Failed Test:

Login.test.ts


Error:

JWT expired


Stack:

auth.ts:42
```

---

这样：

10000 行

↓

50 token

---

这就是后面的：

Tool Result Management。

---

# Q4：
> 为什么 Context Management 类比 Selector + Memoization，而不是数据库清理？

你的回答：

> context 是动态变化的并不是一定要清除，甚至有的信息可至关重要它会一直存在

✅ 非常关键。

这里你抓到了一个容易忽略的问题：

Context Management ≠ 删除旧东西。


很多初学者理解：

```text
Context Management

=

删除历史
```

错误。

实际上：

```text
Context Management

=

选择 + 压缩 + 保留 + 更新
```

---

例如：

用户约束：

```text
不能修改数据库 Schema
```

10小时前说的。

它可能：

必须一直存在。


而：

```text
昨天讨论天气
```

可以删除。


所以：

不是：

时间越久越应该丢。


而是：

价值越低越应该丢。

---

# 第一章最终认知升级

现在你的模型：

```text
Runtime State

(全部世界)

        |

        v

Context Management

(维护认知视角)

        |

        v

Context Window

(有限工作空间)

        |

        v

LLM

(推理)
```

已经完整。

---

# 进入第二章

# 第二章：Context Budget Management

## 目标

第一章解决：

> Context 为什么需要管理？


第二章解决：

> 有限 Context 到底怎么分配？


---

# 2.1 Token Budget 是什么？

---

这是工业 Agent Runtime 非常核心的概念。

因为：

Context Window 不是无限资源。

它类似：

- CPU 时间；
- 内存；
- 网络带宽。

Runtime 必须管理。

---

# 一、先理解一个错误模型

很多人认为：

模型：

```text
Context Window = 128k
```

那么：

Runtime：

```text
直接塞满 128k
```

错误。

---

为什么？

因为：

Context Window 同时包含：

```text
Input

+

Output
```

---

也就是说：

如果：

```text
Context Window

=
128k
```

你不能：

输入：

```text
128k
```

然后期待：

输出。

---

因为：

输出也需要空间。

---

# 二、Token Budget 的定义

Token Budget：

> Runtime 为一次 LLM 调用分配 token 使用额度的策略。

简单公式：

```text id="s8m5e8"
Context Window

=

Input Budget

+

Output Budget
```

---

例如：

模型：

```text
128k Context
```

Runtime:

分配：

```text
Input Budget:

100k


Output Budget:

28k
```

---

那么：

Context Builder 最大只能生成：

```text
100k token Context
```

---

# 三、为什么必须预留 Output Budget？

这是很多新人容易忽略的。

---

例如：

你设计：

```text
128k Context
```

全部给输入：

```text
Input:

128k
```

然后：

用户：

> 请重构这个模块


LLM：

想输出：

```text
代码修改方案

+

解释

+

diff

+

测试建议
```

需要：

10k token。

但是：

没有空间。

---

结果：

可能：

- 截断；
- 输出不完整；
- API error。

---

所以：

Runtime 必须：

提前规划：

```text
我要让模型说多少？
```

---

# 四、Token Budget 类似操作系统内存

这个类比非常重要。

操作系统：

不会：

```text
程序A

占满所有内存
```

因为：

其他任务无法运行。


---

Agent Runtime：

也不会：

```text
Conversation

占满 Context
```

因为：

需要：

- Tool Result
- Memory
- System Instruction
- Output

---

对应：

|OS|Agent|
|-|-|
|Memory|Context Window|
|Process|Context Component|
|Memory Allocation|Token Budget|
|OOM|Context Overflow|
|Memory Cleanup|Context Compression|

---

# 五、工业 Agent 如何分配 Token？

假设：

模型：

```text
200k Context
```

一次 Coding Agent Call：

可能：

```text
System Prompt

10k


User Goal

5k


Memory

15k


Conversation

30k


Code Context

80k


Tool Result

20k


Output Reserve

40k
```

总计：

```text
200k
```

---

注意：

这里：

不是平均分。

而是：

按照任务价值分。

---

# 六、Token Budget 和 Context Builder 的关系

非常重要。


错误：

```text
Context Builder

随便构造 Context

↓

超过限制

↓

报错
```

---

正确：

```text
Context Window Limit

        |

        v

Token Budget Manager

        |

        v

Context Builder

        |

        v

Provider Messages
```

---

也就是说：

Budget Manager 告诉 Context Builder：

```text
你最多只能生成：

80k token
```

然后：

Context Builder：

开始选择：

哪些进去。

---

类似：

前端：

错误：

```javascript
Selector(
  return entire store
)
```

正确：

```javascript
Selector(
  return data under budget
)
```

---

# 七、动态 Budget

工业 Agent 不会固定：

例如：

永远：

```text
Memory:

10k
```

---

而是动态。

任务：

## 写代码：

增加：

```text
Code Context
```

减少：

```text
Conversation
```

---

任务：

## 解释概念：

增加：

```text
Conversation
```

减少：

```text
Workspace
```

---

任务：

## Debug：

增加：

```text
Logs
+
Stack Trace
```

---

所以：

Token Budget 是：

动态资源调度。

---

# 八、本节核心认知升级

以前：

```text
Context Window

=
模型能装多少
```

现在：

```text
Context Window

=
有限认知资源

需要被 Runtime 分配
```

---

以前：

```text
Context Builder

=
选择信息
```

现在：

```text
Context Builder

=

在 Budget 约束下选择信息
```

---

最终模型：

```text
              Context Window

                    |
                    v

            Token Budget Manager

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

# 本节思考题

进入 2.2 前，请回答：

### Q1：

为什么 Context Window 不能全部分配给 Input？

---

### Q2：

为什么 Token Budget 更像操作系统内存管理，而不是简单限制长度？

---

### Q3：

如果一个 Coding Agent 正在 Debug，它应该增加哪类 Context 的预算？减少哪类？

---

### Q4：

为什么 Token Budget 应该在 Context Builder 之前，而不是之后？

---

回答完，我们进入：

# 2.2 Context Allocation（上下文分配）

这一节会进入真正工业设计：

**一个 Agent 如何决定 System、Memory、Code、Tool Result、History 各占多少 token。**

### 15. User (2026-07-22 11:38:44)

Q 1:Context Window 全部分配给 Input那不闹吗，output不管了 ？
Q2：因为Token Budget 需要动态管理，根据不同的任务去动态划分长度
Q3： debug 的话应该增加debug 相关的预算，比如日志调用堆栈等，减少聊天相关的预算
Q4：因为Context Builder需要根据Token Budget的动态分配 限额来给每一部分的 state 进行 builder
这是我的的回答，你看一下，然后开启【2.2 Context Allocation（上下文分配）】的学习吧

### 16. Assistant (2026-07-22 11:38:46)

你的回答非常好，尤其 Q4 已经开始触及 **Context Pipeline 的架构顺序问题**。

这一节你实际上已经掌握了第二章的核心：

> Context Management 不是简单限制 token，而是在有限 token 资源下进行动态认知资源调度。

我们先校验，然后进入 2.2。

---

# 2.1 Token Budget 问题校验

---

# Q1：
> 为什么 Context Window 不能全部分配给 Input？

你的回答：

> Context Window 全部分配给 Input 那不闹吗，output 不管了？

😂 表达简单，但是核心完全正确。

工业表达：

因为：

```text
Context Window

=

Input Tokens

+

Output Tokens
```

如果：

```text
Input = Maximum Context
```

那么：

```text
Output = 0
```

模型没有生成空间。

---

所以 Runtime 必须：

提前规划：

```text
Input Budget

+

Generation Budget
```

例如：

模型：

```
128k Context
```

可能：

```
Input:
96k

Output:
32k
```

---

这里补充一个 Agent 特有问题：

Agent 的 Output 不只是文字。

还有：

```json
{
 "tool_call": {
   "name":"read_file"
 }
}
```

或者：

代码 patch。

所以 Agent 往往需要更大的 Output Reserve。

---

# Q2：
> 为什么 Token Budget 像操作系统内存管理？

你的回答：

> Token Budget 需要动态管理，根据不同任务去动态划分长度

✅ 正确。

补充：

操作系统：

不会问：

> 内存够不够？

而是：

> 当前哪个进程最需要内存？

Agent：

也不是：

> Context 有没有空间？

而是：

> 当前任务哪个信息最值得占空间？


---

例如：

Coding Agent：

当前：

```text
Debug Payment Error
```

那么：

优先级：

```
Error Log
★★★★★

Relevant Code
★★★★★

User Constraint
★★★★

Old Conversation
★
```

---

所以 Token Budget 是：

资源调度系统。

---

# Q3：
> Debug Agent 应该增加什么预算？

你的回答：

> 增加日志调用堆栈等，减少聊天相关预算

✅ 非常正确。

这是动态 Context Allocation 的核心。


例如：

普通聊天：

```text
Conversation:
40%

Memory:
20%

Knowledge:
40%
```

---

Debug：

变成：

```text
Stack Trace:
30%

Code:
40%

Recent Tool Result:
20%

Conversation:
10%
```

---

任务不同：

Context 分配不同。

---

# Q4：
> 为什么 Token Budget 应该在 Context Builder 之前？

你的回答：

> Context Builder 需要根据 Token Budget 的动态分配限额来给每一部分 state builder

✅ 非常好。

这个答案已经是 Runtime Architecture 级别。


错误流程：

```
Runtime State

↓

Context Builder

↓

发现超过限制

↓

失败
```

---

正确：

```
Runtime State

        |

        v

Token Budget Manager

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

原因：

Context Builder 不是无限选择。

它必须知道：

> 我有多少空间。

---

类似：

前端：

错误：

```javascript
selectAllData()

↓

render()

↓

发现太大
```

---

正确：

```javascript
budget = calculateRenderBudget()

↓

selector(budget)

↓

render()
```

---

# 总体评价

你现在对于 Agent Runtime 的理解已经进入：

## 资源管理层

以前：

```
Context Builder
=
选择信息
```

现在：

```
Context Builder
=
在资源约束下选择信息
```

这是非常大的升级。

---

# 开始 2.2

---

# 第二章：Context Budget Management

# 2.2 Context Allocation（上下文分配）

---

上一节我们解决：

> 有多少 Context 可以用？

Token Budget。

---

这一节解决：

> 这些 token 应该给谁？

也就是：

Context Allocation。

---

# 一、Context Allocation 是什么？

定义：

> Context Allocation 是 Runtime 在一次 LLM 调用中，将有限 Token Budget 分配给不同 Context 来源的过程。

---

假设：

模型：

```
Context Window:

200k tokens
```

Runtime：

不能简单：

```
全部 Conversation
```

而需要分配：

```
System
User Goal
Memory
Conversation
Workspace
Tool Result
Output
```

---

例如：

```
200k Budget


System Instruction:
10k


Current Goal:
5k


Memory:
15k


Conversation:
30k


Code:
80k


Tool Result:
20k


Output Reserve:
40k
```

---

这就是 Allocation。

---

# 二、为什么需要 Allocation？

因为不同信息价值不同。

---

假设：

Coding Agent：

当前任务：

> 修改支付模块退款逻辑


Runtime State：

包含：

```
10000 条历史消息

100 个工具调用

500 个文件

大量 Memory
```

---

如果平均分：

```
Conversation:
20%

Code:
20%

Memory:
20%

Tool:
20%

Other:
20%
```

非常错误。

---

因为：

当前任务：

最需要：

```
PaymentService.ts

Refund API

Test Error
```

---

所以：

Allocation 本质：

> 根据当前 Goal 分配认知资源。

---

# 三、Context Allocation 的几个核心区域

工业 Agent 通常有：

---

# 1. System Budget

系统指令。

例如：

```
You are coding agent.

Rules:
- Do not modify database schema
- Use TypeScript
```

特点：

## 优先级最高。

原因：

它决定 Agent 行为边界。

---

例如：

如果系统约束：

```
禁止删除生产数据
```

不能因为：

Context 不够：

被压缩掉。

---

# 2. Goal Budget

当前任务。

例如：

```
User Goal:

Fix login timeout issue.
```

---

这个非常重要。

因为 Agent 每一步都需要知道：

> 我要完成什么。

---

很多 Agent 失败：

不是不会推理。

而是：

Goal 丢失。

---

# 3. Memory Budget

长期知识。

例如：

```
User prefers TypeScript.

Project uses Vue3.

No database migration.
```

---

注意：

Memory 不是越多越好。

需要：

Relevant Memory Retrieval。

---

# 4. Conversation Budget

历史对话。

例如：

```
User:
为什么不用方案 A?

Agent:
因为性能问题。
```

---

作用：

保持连续性。

---

但是：

通常不是最高优先。

因为：

历史很多是噪声。

---

# 5. Workspace Budget

Coding Agent 最重要。

包括：

```
Source Code

Config

Documentation

Git Diff
```

---

例如：

Debug：

Workspace 权重：

提升。

---

# 6. Tool Result Budget

工具返回。

例如：

```
read_file

search

test

browser
```

---

问题：

Tool Result 很容易爆炸。

例如：

```
grep 全项目

返回 50000 行
```

必须管理。

---

# 四、Allocation 不是固定比例

这是重点。

很多人会设计：

```
System:
10%

Memory:
20%

Code:
40%
```

然后固定。

错误。

---

工业 Agent：

动态调整。

---

例如：

## 场景 1：写代码

```
Code:
50%

Tool:
20%

History:
10%

Memory:
10%

Goal:
10%
```

---

## 场景 2：解释概念

```
Conversation:
40%

Knowledge:
40%

Memory:
10%

Code:
10%
```

---

## 场景 3：Debug

```
Logs:
30%

Code:
40%

Tool Result:
20%

History:
10%
```

---

所以：

Allocation 是：

Task-aware。

---

# 五、Allocation 和 Context Builder 的关系

完整流程：

```
              Runtime State


                    |

                    v


          Goal Understanding


                    |

                    v


          Token Budget Manager


                    |

                    v


          Context Allocation


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

注意：

Context Builder 前面多了一步：

Goal Understanding。

为什么？

因为：

不知道目标。

就不知道：

什么重要。

---

# 六、前端类比

这个非常适合你。

---

假设：

Redux Store：

```
{
 user,
 products,
 cart,
 orders,
 settings
}
```

---

当前页面：

购物车页面。

错误：

```javascript
<App data={store}/>
```

---

正确：

Selector：

```javascript
const cartPageData =
selectCartPageState(store)
```

---

但是：

Selector 还有一个问题：

如果页面空间有限怎么办？


例如：

表格：

只能显示：

100 条。

那么：

还需要：

Pagination / Virtual List。

---

对应：

Redux：

```
Selector

+

Pagination

+

Memoization
```

---

Agent：

```
Context Builder

+

Token Budget

+

Compression
```

---

# 七、本节核心认知升级

以前：

```
Context Builder:

选择信息
```

现在：

```
Context Builder:

在 Budget Allocation 后，
按照任务目标选择信息
```

---

以前：

```
Token Limit

=
硬限制
```

现在：

```
Token Budget

=
动态资源调度
```

---

最终架构：

```
                 Runtime State

                       |

                       v

                 Goal Analysis

                       |

                       v

              Token Budget Manager

                       |

                       v

              Context Allocation

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

# 本节思考题

进入 2.3 前，请回答：

### Q1：
为什么 Context Allocation 不能固定比例分配？

---

### Q2：
为什么 System Instruction 和 User Goal 通常比 Conversation History 优先级高？

---

### Q3：
如果 Debug 一个线上支付问题，为什么 Code 和 Log 的 Budget 应该提高？

---

### Q4：
结合 React：

为什么 Context Allocation 更像：

```
Selector + Pagination + Virtual List
```

而不是简单：

```
Redux Store
```

---

回答完，我们进入：

# 2.3 Priority Ranking（上下文优先级排序）

这一节会进一步深入：

**当 Context 超限时，Runtime 到底应该保留什么，淘汰什么。**

### 17. User (2026-07-22 11:49:11)

Q1：因为不同的任务权重不一样。但是这里我有个疑问，Context Allocation 是如何动态识别不同任务然后动态分配的，比如文件识别关键词比对 我知道是根据向量
Q2：因为 gola 是最重要的信息哇，只有知道了用户目标才能知道到底要做什么，history 并不一定是目标
Q3：因为是要 debug，那必要要加大代码与日志排查，所以二者预算应该提高
Q4：因为 Redux Store 在一个 app 成型时候往往是固定的，而Selector + Pagination + Virtual List是动态的，更像 Allocation
这是我的回答，你看下，然后开启【2.3 Priority Ranking（上下文优先级排序）】学习

### 18. Assistant (2026-07-22 11:49:14)

你的回答很好，而且这次你提出的疑问非常关键：

> Context Allocation 是如何动态识别不同任务，然后动态分配？

这个问题其实已经进入 **Agent Runtime 智能调度层** 了。

很多资料讲 Context Management，只讲：

> 压缩、截断、总结。

但是工业 Agent 真正难的地方是：

> Runtime 怎么知道当前应该给什么信息更多预算？

我们先校验你的答案，然后重点回答你的疑问。

---

# 2.2 问题校验

---

# Q1：
> 为什么 Context Allocation 不能固定比例？

你的回答：

> 因为不同任务权重不一样。

✅ 正确。

例如：

固定：

```text
Context:

Code 40%
Memory 20%
History 20%
Tool 20%
```

看起来合理。

但是：

---

任务 A：

代码重构：

```text
Code:
80%

Conversation:
10%

Memory:
10%
```

---

任务 B：

写技术方案：

```text
Conversation:
30%

Knowledge:
50%

Code:
20%
```

---

任务 C：

Debug：

```text
Log:
40%

Code:
40%

History:
10%

Memory:
10%
```

---

所以：

Allocation 必须：

```text
Task-aware
```

---

# 重点回答你的疑问：

## Context Allocation 怎么知道当前是什么任务？

你提到了：

> 文件识别关键词比对、向量？

这个方向对，但是还不完整。

工业 Agent 通常不是单一方式。

它更像一个：

## Task Understanding Layer

---

整体流程：

```text
User Input

      |

      v

Task Understanding

      |

      +----------------+
      |                |
      v                v

Intent        Task Type

      |

      v

Context Policy

      |

      v

Allocation
```

---

## 第一种：LLM 自己判断

最简单：

让一个 LLM 判断：

输入：

```
用户：
帮我定位支付失败原因
```

输出：

```json
{
 task_type:"debugging",
 priority:[
   "logs",
   "code",
   "stack_trace"
 ]
}
```

然后：

Runtime：

```text
debugging policy

↓

increase log budget
```

---

## 第二种：规则系统

很多工业系统会混合规则。

例如：

检测关键词：

```text
bug
error
exception
failed
crash
```

提高：

```text
Log Budget
```

---

例如：

用户：

> 为什么接口 500？

规则：

```javascript
if (
 message.includes("500")
 ||
 message.includes("error")
)
{
 increase("logs")
}
```

---

## 第三种：Embedding / Retrieval

你提到向量。

这个主要用于：

## 找相关信息

比如：

用户：

> 修复登录问题

Embedding：

找到：

```text
auth.ts

login-service.ts

jwt-helper.ts
```

---

但是：

Embedding 更偏：

```text
Information Retrieval
```

不是：

```text
Task Classification
```

---

区别：

向量回答：

> 哪些信息相关？


Task Understanding 回答：

> 当前是什么任务？


---

## 第四种：历史 State 推断

Agent 运行过程中：

Runtime 已经知道：

```json
{
 goal:"fix payment bug",

 current_step:"debug",

 previous_action:"read logs"
}
```

那么：

下一轮：

自然提高：

```text
debug context
```

---

所以工业版本：

```text
                User Input

                     |

                     v

             Task Understanding

                     |

        -----------------------

        |          |          |

      Rule     LLM       History


                     |

                     v


              Allocation Policy


                     |

                     v


             Context Budget
```

---

这也是为什么 Agent Runtime 不只是：

LLM + Tool。

它还有大量：

控制逻辑。

---

# Q2：
> 为什么 Goal 比 Conversation History 优先？

你的回答：

> goal 是最重要的信息，只有知道用户目标才能知道到底做什么，history 并不一定是目标

✅ 非常准确。

这是一个核心原则：

## Goal Preservation

Agent 最怕：

历史还在。

目标没了。

---

例如：

Conversation：

100轮。

但是最后：

用户目标：

```text
帮我修复支付退款 Bug
```

如果 Context 压缩时：

保留：

```text
之前为什么不用方案 A
之前讨论 UI
```

丢失：

```text
当前目标
```

Agent 会迷失。

---

所以：

很多 Agent 会把 Goal 单独保存：

例如：

```json
{
 current_goal:
 "Fix payment refund bug",

 constraints:[
  "Do not change DB schema"
 ]
}
```

这个甚至可能比 Conversation 更高优先。

---

# Q3：
> Debug 为什么提高 Code 和 Log？

你的回答：

> 因为要 debug，需要加大代码与日志排查

✅ 正确。

补充：

Debug Agent 的核心：

```text
Observation

+

Evidence
```

也就是：

证据驱动。

所以：

提高：

```text
Code

Log

Stack Trace

Recent Diff
```

降低：

```text
Old Conversation
```

---

# Q4：
> 为什么 Context Allocation 更像 Selector + Pagination + Virtual List？

你的回答：

> Redux Store 成型后固定，而 Selector + Pagination + Virtual List 动态

✅ 非常好的理解。

我补充一点：

Redux Store：

负责：

```text
Where data exists
```

---

Allocation：

负责：

```text
How much data should participate now
```

---

对应：

数据库：

```text
Table

↓

Query

↓

Pagination

↓

Current Page
```

Agent：

```text
Runtime State

↓

Context Builder

↓

Budget

↓

Current Context
```

---

# 总体评价

你的理解已经进入：

## Context Scheduling 层

现在你的模型：

```text
Task Understanding

        |

        v

Context Allocation

        |

        v

Context Builder

        |

        v

LLM
```

已经超过很多只学习 Prompt Engineering 的人。

---

下面进入：

# 2.3 Priority Ranking（上下文优先级排序）

---

# 第二章：Context Budget Management

# 2.3 Priority Ranking（上下文优先级排序）

---

上一节：

Context Allocation：

解决：

> 给谁多少空间？

这一节：

Priority Ranking：

解决：

> 空间不够时，谁留下？

---

这是工业 Agent 非常核心的问题。

因为：

现实一定会发生：

```text
需要的信息

>

Context Budget
```

---

例如：

当前：

```text
Available:

50k tokens
```

但是：

候选 Context：

```text
Conversation:
40k

Code:
50k

Logs:
30k

Memory:
20k

Docs:
40k
```

总：

180k。

怎么办？

---

必须排序。

---

# 一、Priority Ranking 定义

定义：

> Priority Ranking 是 Runtime 根据任务目标，对候选 Context 信息进行重要性排序的过程。

简单：

决定：

```text
谁进入 Context

谁等待

谁丢弃
```

---

# 二、Context 优先级不是简单时间排序

很多初学者：

认为：

最新消息最高。

错误。


例如：

10分钟前：

用户：

> 不允许修改数据库结构。


1分钟前：

用户：

> 继续优化性能。


哪个重要？


显然：

约束更重要。

---

所以：

Priority 不等于：

```text
Recent
```

---

# 三、工业 Context Ranking 的几个维度

通常：

## 1. Relevance（相关性）

最高频。

问题：

> 这个信息和当前 Goal 有关系吗？


例如：

Goal:

修复登录。


相关：

```text
auth.ts
JWT
login API
```

不相关：

```text
购物车
商品列表
```

---

## 2. Importance（重要性）

有些信息：

即使不常用。

也不能丢。


例如：

System Rule：

```text
禁止删除生产数据
```

---

## 3. Recency（新鲜度）

最近发生的信息：

通常更有价值。

例如：

最新：

```text
Error Log
```

---

但是：

不是绝对。

---

## 4. Dependency（依赖关系）

这个非常重要。


例如：

修改：

```text
UserService
```

依赖：

```text
AuthService
```

那么：

AuthService 重要。

---

类似代码：

```javascript
import Auth from "./auth"
```

---

## 5. User Constraint（用户约束）

最高优先。

例如：

用户：

> 不要修改 API。

这个必须保留。

---

# 四、Ranking 可以理解为打分函数

工业实现：

可能：

类似：

```
score =
0.4 * relevance
+
0.2 * importance
+
0.2 * recency
+
0.1 * dependency
+
0.1 * user_constraint
```

---

然后：

排序：

```
Context Candidates

A 0.95
B 0.82
C 0.61
D 0.20
```

取：

Top K。

---

# 五、和搜索引擎类似

你熟悉前端。

可以类比：

Google 搜索。

用户：

```
React performance
```

搜索引擎：

不会返回：

所有网页。

而是：

Ranking。

---

Agent：

不会发送：

所有 State。

而是：

Context Ranking。

---

# 六、Ranking 和 Retrieval 的区别

这个很容易混。

---

Retrieval：

回答：

> 找哪些候选信息？


例如：

向量搜索：

找到：

```text
auth.ts
login.ts
jwt.ts
```

---

Ranking：

回答：

> 哪些最值得进入 Context？


例如：

排序：

```
auth.ts ⭐⭐⭐⭐⭐

login.ts ⭐⭐⭐⭐

jwt.ts ⭐⭐⭐

old-auth.ts ⭐
```

---

流程：

```text
Runtime State

      |

      v

Retrieval

      |

      v

Candidates

      |

      v

Ranking

      |

      v

Context
```

---

# 七、前端类比

非常适合：

假设：

Redux：

```javascript
{
 users,
 products,
 orders,
 cart,
 settings
}
```

---

Selector：

找到候选：

```javascript
selectUserData()
```

---

Ranking：

决定：

哪个优先。


比如：

页面：

用户中心。

优先：

```text
user profile

permission

order
```

低：

```text
recommendation
```

---

Pagination：

控制：

显示多少。

---

对应：

Agent：

```text
Retrieval

+

Ranking

+

Budget

+

Context
```

---

# 八、本节核心认知升级

以前：

Context Management：

```text
删除旧内容
```

---

现在：

Context Management：

```text
理解任务

↓

寻找候选

↓

排序价值

↓

分配预算

↓

构造 Context
```

---

最终架构：

```text
                 Runtime State

                      |

                      v

                 Retrieval

                      |

                      v

              Priority Ranking

                      |

                      v

              Context Allocation

                      |

                      v

             Context Builder

                      |

                      v

                    LLM
```

---

# 本节思考题

进入 2.4 前，请回答：

### Q1：
为什么 Context Ranking 不能简单按照时间排序？

---

### Q2：
为什么 User Constraint 通常比普通 Conversation 更高优先级？

---

### Q3：
Retrieval 和 Ranking 的区别是什么？

---

### Q4：
如果一个 Agent 正在修改支付模块，为什么支付相关代码优先级高于用户之前讨论 UI 的历史？

---

回答完，我们进入：

# 2.4 Context Eviction（上下文淘汰）

这一节会讲：
**当 Context 真的爆炸时，Runtime 如何像操作系统管理内存一样淘汰内容。**

### 19. User (2026-07-22 13:51:54)

这几个问题很简单。基本上你在讲解中就已经提到了。我们直接开始【2.4 Context Eviction（上下文淘汰）】的学习吧

### 20. Assistant (2026-07-22 13:51:56)

好的，既然 2.3 的问题你已经掌握了，我们直接进入 **2.4 Context Eviction（上下文淘汰）**。

不过在开始前补充一句：

你说：

> 这几个问题很简单，基本上讲解中已经提到了。

这个反馈其实说明你的学习阶段已经发生变化。

前面：

- 需要通过问题确认理解；
- 现在：
- 问题更多是在验证架构推理。

所以后续我会逐渐减少“概念复述型问题”，增加：

- 架构设计问题；
- Runtime trade-off 问题；
- 工业实现问题。

因为你的目标不是会用 Agent，而是理解 Agent Runtime。

---

# 第二章：Context Budget Management

# 2.4 Context Eviction（上下文淘汰）

---

## 本节目标

前面三节：

### 2.1 Token Budget

解决：

> 有多少空间？

---

### 2.2 Context Allocation

解决：

> 空间怎么分？

---

### 2.3 Priority Ranking

解决：

> 谁更重要？

---

现在：

## 2.4 Context Eviction

解决：

> 当空间真的不够时，谁应该被淘汰？

---

这其实就是：

Agent 版本的：

## 内存回收（Memory Eviction）

---

# 一、什么是 Context Eviction？

定义：

> Context Eviction 是当 Context Window 超出预算时，Runtime 主动移除、压缩或替换低价值 Context 的过程。

简单理解：

```text id="r7j9tr"
Context 太满

↓

释放空间

↓

保留重要信息
```

---

注意：

Eviction ≠ 删除。

这是一个非常重要的区别。

---

很多初学者：

看到：

Context Overflow：

第一反应：

> 删除旧消息。


错误。


工业 Agent：

不是：

```text id="z9xq4k"
delete old
```

而是：

```text id="a0o5xh"
evaluate value

↓

compress

↓

archive

↓

remove
```

---

# 二、为什么 Agent 一定需要 Eviction？

因为 Agent 有一个天然特点：

## 长生命周期 Loop

---

普通聊天：

```text id="2j1kqv"
User

↓

LLM

↓

Answer

↓

结束
```

---

Agent：

```text id="v1q7pj"
Goal

↓

Reason

↓

Tool

↓

Observation

↓

Reason

↓

Tool

↓

Observation

↓

...
```

---

假设：

一次 Tool：

返回：

10000 tokens。

执行：

100 次。

那么：

```text id="4v8xv0"
Tool Result:

1M tokens
```

---

即使：

Context Window：

1M。

也迟早爆炸。

---

所以：

长任务 Agent：

必须：

不断管理 Context。

---

# 三、Context Eviction 类似操作系统内存淘汰

这个类比非常重要。

操作系统：

RAM：

有限。

进程：

无限。


怎么办？

---

Linux：

会：

- swap；
- page replacement；
- cache eviction。

---

Agent：

Context：

有限。

信息：

无限。


怎么办？

---

Agent：

会：

- compression；
- summarization；
- removal；
- archive。

---

对应：

|OS|Agent|
|-|-|
|RAM|Context Window|
|Memory Page|Context Item|
|LRU Cache|Recent Context|
|Swap|External Storage|
|Garbage Collection|Eviction|

---

# 四、Eviction 不是简单 LRU

这里非常关键。

很多工程师第一反应：

> 淘汰最久没用的数据。

也就是：

LRU：

Least Recently Used。

---

例如：

Conversation：

```text id="k8b2p4"
10分钟前：
讨论数据库限制

1分钟前：
讨论按钮颜色
```

LRU：

删除：

数据库限制。

---

但是：

正确吗？


错误。


为什么？

因为：

数据库限制：

虽然旧。

但是：

属于：

## Constraint


价值：

极高。

---

所以：

Agent Eviction：

不能只看：

时间。

---

# 五、工业 Eviction 通常考虑什么？

---

## 1. Importance

重要性。

例如：

System Rule：

```text id="65h7si"
Never modify production database
```

永远保留。

---

## 2. Relevance

相关性。

当前：

Debug 登录。


那么：

购物车历史：

低价值。


---

## 3. Compression Ability

可压缩程度。

例如：

100轮 Conversation。

可以：

Summary。


但是：

代码：

可能不能简单 Summary。


---

## 4. Recoverability

可恢复性。


这个非常重要。


---

例如：

Conversation：

可以从数据库重新读取。


那么：

可以移除。


---

但是：

当前推理状态：

如果丢：

无法恢复。


---

所以：

Eviction 会考虑：

> 删除后还能不能找回来。

---

# 六、Context Eviction 的四种策略

工业 Agent 常见：

---

# 策略 1：Truncation（截断）

最简单。


例如：

保留最近：

```text id="qknfhs"
Last N messages
```

删除：

旧消息。


---

优点：

简单。


缺点：

容易丢关键状态。


---

适合：

简单 Chat。


---

Agent：

通常不够。


---

# 策略 2：Summarization（总结压缩）

这是 Agent 最常用。


例如：

原始：

```text id="4qnyq7"
100轮 Conversation
```

压缩：

```json id="x7w2hk"
{
 goal:
 "Refactor auth module",

 completed:
 [
 "found JWT issue",
 "updated middleware"
 ],

 remaining:
 "run tests",

 constraints:
 [
 "use TypeScript"
 ]
}
```

---

Token：

10000

↓

500


---

这就是：

Context Compression。

---

# 策略 3：Selective Removal（选择删除）

删除：

明显无价值内容。


例如：

Tool Result：

```text id="txm0bp"
npm install output:

success
success
success
...
```

删除。


---

保留：

```text id="j8y2cn"
error message
```

---

# 策略 4：Externalize（外部化）

这个非常重要。


不是：

删除。


而是：

移动。

---

例如：

Context：

```text id="j0xyq3"
Current Context
```

↓

Archive:

```text id="uj8h5k"
Database

Vector Store

File System
```

---

以后需要：

Retrieval。

---

这对应：

前面 Memory。

---

# 七、Eviction 完整流程

工业 Runtime：

大概：

```text id="1p1y9j"
Context Size Check

        |

        v

Need Eviction?

        |

       Yes

        |

        v

Rank Context Items

        |

        v

Choose Victims

        |

        v

Compress / Archive / Remove

        |

        v

Rebuild Context

        |

        v

LLM
```

---

注意：

Eviction 不是最后补救。

它是：

Runtime Loop 的一部分。

---

# 八、和 React 的类比

继续你的领域。

---

假设：

Redux Store：

```javascript id="0zdbqj"
{
 user,
 cart,
 order,
 history,
 notification
}
```

---

当前页面：

订单详情。


错误：

全部：

```javascript id="1qj8nr"
render()
```

---

正确：

Selector：

选择：

```javascript id="0vlx8f"
orderDetail
user
permission
```

---

如果数据太多：

比如：

订单列表：

100万条。


怎么办？

不是：

删除 Redux 数据。


而是：

```text id="2h5qv0"
Pagination

+

Virtual List

+

Cache
```

---

Agent：

一样。

Context Eviction：

不是：

删除 Runtime State。

而是：

管理当前 View。


---

# 九、Context Eviction 和 Memory 的关系

这里连接前面。


很多人会误解：

Eviction：

删除 Memory。


错误。


三者关系：

```text id="z3k6th"
Runtime State

(全部状态)

        |

        |

Context Management

        |

        |

Context Window

```

---

Eviction：

发生在：

Context Window 层。


不是：

Runtime State。


---

例如：

Conversation 压缩：

不是：

删除历史。


而是：

生成 Summary：

保存历史价值。

---

# 十、本节核心认知升级

以前：

Context Overflow：

```text id="g84k8k"
超过限制

↓

删东西
```

---

现在：

Context Eviction：

```text id="a6g0t9"
超过预算

↓

评估价值

↓

压缩

↓

迁移

↓

删除低价值信息

↓

保持 Agent 认知连续性
```

---

最终第二章完整架构：

```text id="yp1f6j"
              Runtime State

                    |

                    v

            Task Understanding

                    |

                    v

            Token Budget Manager

                    |

                    v

            Context Allocation

                    |

                    v

            Priority Ranking

                    |

                    v

            Context Eviction

                    |

                    v

            Context Builder

                    |

                    v

                   LLM
```

---

# 第二章学习完成后的核心认知

现在你应该形成：

> Context Management 本质就是 Agent 的“认知内存管理系统”。

类似：

操作系统：

管理 RAM。


Agent Runtime：

管理 Context。


---

接下来进入第三章：

# 第三章：Context Compression（上下文压缩）

这一章会更深入：

## 3.1 为什么需要 Compression？
## 3.2 Summary Memory
## 3.3 Hierarchical Context
## 3.4 Long-running Agent 如何保持连续性


这里会开始接近：

Claude Code、Cursor、OpenAI Agent SDK 这类真实产品的设计思想。

### 21. User (2026-07-22 14:06:55)

进入第三章之前我提几个问题：
1. 比如现在市面上的知识库 agent，不好用的原因我是不是可以理解为主要是因为没有落库，没有形成好用 contextbuilder，比如因为没有落库无法形成持久化的用户专属 memory，没有专门针对知识库的 state 处理，同时也没有比如类似向量的检索匹配能力
2. Context Eviction 中 Choose Victims 是不是可以理解为根据权重选择优先级低的进行压缩归档等处理，而不是针对所有信息进行 Choose Victims
3. memory 也会越来越大，它不需要 Eviction 吗？还是说 memory落库了，只会根据任务动态选择 memory 中特定东西，不会存在大量 memory 被植入

回答我的这几个问题后再进入第三章的学习

### 22. Assistant (2026-07-22 14:06:57)

你的这三个问题非常好，而且已经开始从 **Context Window Management → Agent 产品设计** 进行迁移了。

尤其第 1 个问题，其实就是为什么现在很多所谓“知识库 Agent”体验一般的根本原因之一。

我们逐个回答。

---

# 问题 1：

> 市面上的知识库 Agent 不好用，是不是主要因为：
>
> - 没有落库；
> - 没有形成好用 Context Builder；
> - 没有持久化用户 Memory；
> - 没有知识库专属 State；
> - 没有向量检索匹配能力？

你的理解：

方向对，但是需要稍微修正。

因为：

## 知识库 Agent 的问题，不只是“有没有向量”。

很多产品：

其实有：

- Vector DB；
- Embedding；
- RAG；
- 文档切片。


但是依旧不好用。


为什么？


因为：

**RAG ≠ Agent Context Management**

---

我们拆开。

---

# 一、传统知识库 Agent 的简单模型

很多产品：

架构：

```
用户问题

↓

Embedding

↓

Vector Search

↓

Top K 文档

↓

Prompt 拼接

↓

LLM

↓

回答
```

也就是：

```text
Knowledge Base

      |

      v

Retriever

      |

      v

Context

      |

      v

LLM
```

---

问题：

它缺少：

Agent Runtime。

---

# 二、真正的问题在哪里？

## 1. 没有长期用户 Memory

你说：

> 无法形成持久化用户专属 memory

✅ 正确。


例如：

第一次：

用户：

> 我们公司的项目使用 Vue3 + Vite。


好的 Agent：

保存：

```json
{
 user_preference:{
   stack:[
    "Vue3",
    "Vite"
   ]
 }
}
```

---

以后：

用户：

> 帮我写组件


Agent：

知道：

默认：

Vue3。

---

很多知识库：

每次：

重新检索。


不知道：

用户是谁。


---

## 2. 没有 Domain State

你提：

> 没有专门针对知识库的 state 处理

这个非常关键。


例如：

一个法律 Agent。


不能只有：

```
Documents
```

还需要：

```
Case State
```

例如：

```json
{
 case_id:"001",

 parties:[
 ],

 important_facts:[
 ],

 legal_arguments:[
 ],

 pending_questions:[
 ]
}
```

---

否则：

每次：

重新读文件。


没有：

“案件进展”。

---

## 3. Context Builder 能力弱

这是最核心。


很多知识库：

实际上：

Context Builder：

≈

```javascript
topKDocuments.join()
```

---

但是工业 Agent：

应该：

```
Runtime State

+
User Memory

+
Task Goal

+
Knowledge Retrieval

+
Conversation

+
Tool Result

↓

Context Builder

↓

LLM
```

---

也就是说：

知识库只是：

Context 来源之一。


不是全部。

---

## 4. Retrieval 能力不足

你说：

> 类似向量检索匹配能力

正确。

但是向量只是第一代。

更好的：

Hybrid Retrieval：

```
Keyword Search
+
Embedding Search
+
Metadata Filter
+
Reranking
```

---

例如：

用户：

> 去年支付退款策略是什么？


向量：

找到：

支付文档。


但是：

时间：

去年。


需要：

Metadata：

```
year=2025
type=policy
```

---

所以：

高级 Retrieval：

不是：

“找像的”。

而是：

“找当前任务最有价值的”。

---

所以你的总结升级：

错误：

> 知识库 Agent 不好，是因为没有向量。


正确：

> 很多知识库 Agent 不好，是因为它们只有 Retrieval，没有完整 Context Engineering。

---

完整模型：

```
Knowledge

      |
      v

Retrieval

      |
      v

Ranking

      |
      v

Context Builder

      |
      +

Memory

      |

      +

Task State

      |

      v

LLM
```

---

# 问题 2：

> Context Eviction 中 Choose Victims 是不是根据权重选择优先级低的信息进行压缩归档，而不是针对所有信息？

你的理解：

✅ 完全正确。

Choose Victims：

不是：

```
全部信息
    |
    v
随机删除
```

而是：

```
Context Items

      |

      v

Value Scoring

      |

      v

Low Value Items

      |

      v

Victims
```

---

举例：

当前 Context：

```
System Rule
★★★★★

User Goal
★★★★★

Current Code
★★★★★

Recent Error
★★★★

Old Conversation
★★

Old Tool Result
★
```

---

Eviction：

优先：

```
Old Tool Result

↓

Old Conversation
```

---

不会：

删除：

```
User Goal
```

---

# 但是补充一个细节：

Victim 不一定直接删除。

可能：

第一层：

```
Compression
```

例如：

100轮聊天：

↓

Summary


---

第二层：

```
Archive
```

保存：

外部存储。


---

第三层：

```
Remove
```

真正丢弃。


---

所以：

Choose Victims：

更准确：

> 选择最适合离开当前 Context Window 的信息。

---

# 问题 3：

> Memory 也越来越大，它不需要 Eviction 吗？

这个问题非常关键。

答案：

## Memory 也需要管理。

但是：

机制不同。


---

因为：

Memory ≠ Context。

---

Context：

是：

```
工作内存
```

类似：

RAM。


Memory：

是：

```
长期存储
```

类似：

数据库。


---

数据库：

不会因为：

100GB 数据：

直接删除。


而是：

管理。

---

Memory 管理：

主要是：

## Memory Consolidation

记忆整合。

---

例如：

Memory：

初期：

```
用户喜欢 TypeScript

用户喜欢 TS

用户偏爱 TS

用户项目 TS
```

重复。


需要：

合并：

```
User prefers TypeScript.
```

---

## Memory Ranking

不是所有 Memory 都进入 Context。


例如：

Memory:

```
用户职业:
前端工程师

用户喜欢:
咖啡

用户昨天吃:
拉面

用户项目:
Vue3
```

---

今天：

用户：

> 怎么优化 Vue 性能？


进入 Context：

```
Vue3
前端工程师
```

不会：

加入：

```
昨天吃拉面
```

---

所以：

你的理解：

> memory 落库了，只会根据任务动态选择，不会存在大量 memory 被植入

✅ 正确。

---

完整流程：

```
Memory Store

      |

      v

Memory Retrieval

      |

      v

Memory Ranking

      |

      v

Relevant Memory

      |

      v

Context
```

---

# 三者关系总结

这是非常重要的一张图：

```
                 Runtime State

                      |
                      |
        --------------------------------

        |                              |

 Conversation                    Memory Store

        |                              |

        |                              |

        -------- Context Builder ------

                       |

                       v

              Context Window

                       |

                       v

                      LLM
```

---

# 进一步升级你的 Agent 心智模型

现在：

很多人理解：

```
Agent

=
LLM
+
Tools
```

---

你的模型已经接近：

```
Agent

=

LLM

+

Runtime

+

Context Engineering

+

Memory

+

Tool System

+

State Management
```

---

# 进入第三章

下一章：

# 第三章：Context Compression（上下文压缩）

目标：

解决：

> 当信息重要但 Context 放不下怎么办？


我们会学习：

## 3.1 为什么需要 Compression？

## 3.2 Summary Memory

## 3.3 Hierarchical Context

## 3.4 Long-running Agent 如何保持连续性


这一章会重点连接：

- Claude Code 长任务能力；
- Cursor Agent 为什么能持续修改代码；
- OpenAI Agent Runtime 如何处理长上下文。


我们开始：

# 3.1 为什么需要 Context Compression？

### 23. User (2026-07-22 14:14:39)

开启 3.1 之前我还想再提个疑问：比如现在的 openspec 、Claude code 的 plan 模式都会根据任务执行生成文档留档，这个文档在理论上来说会反哺项目，但是最终随着使用后发现压根不好用，这是为什么呢？我猜测其中一个问题是 归档的文档虽然有 description 但是 cc  agent无法知道 当用户提出新的目标时候无法去精准判断过往归档的哪些是有用的，以及归档的信息不及时更新也会造成影响

### 24. Assistant (2026-07-22 14:14:42)

这个问题非常好，而且你已经触碰到了 **Agent 长期知识管理（Long-term Context / Project Memory）里面最难的问题之一**。

你提到的：

> openspec、Claude Code plan 模式生成文档留档，理论上会反哺项目，但是最终发现不好用。

这个现象确实存在，而且你的猜测：

> Agent 无法精准判断哪些归档有用；归档信息不及时更新。

已经命中了两个核心问题。

不过我们把它系统拆开。

---

# 一、首先明确：Plan 文档 ≠ Memory

这是第一个容易混淆的地方。

例如：

Claude Code plan：

```
plans/
 ├── refactor-auth.md
 ├── migrate-api.md
 ├── optimize-cache.md
```

或者 OpenSpec：

```
specs/
 ├── feature-a.md
 ├── feature-b.md
```

很多人以为：

> 保存下来 = Agent 有记忆了。

实际上不是。


它更像：

```text
External Knowledge
```

而不是：

```text
Agent Memory
```

---

两者区别：

| |Plan 文档|Memory|
|-|-|-|
|产生方式|任务过程产物|长期沉淀|
|目标|记录方案|指导未来行为|
|生命周期|项目阶段|长期|
|访问方式|主动读取|自动召回|
|结构|文档|结构化信息|

---

例如：

一次任务：

> 重构登录模块


产生：

```
refactor-login-plan.md
```

里面：

```
1. 修改 auth middleware
2. 新增 token refresh
3. 修改 tests
```

---

这份文档：

对当前任务：

价值：

★★★★★


三个月以后：

用户：

> 添加支付功能

价值：

可能：

★

---

所以：

不能简单：

全部作为 Memory。

---

# 二、你的第一个判断：

> Agent 无法知道哪些归档有用

✅ 非常正确。

这叫：

## Retrieval Problem（召回问题）

---

很多系统：

实际上：

```text
Project Files

↓

Search

↓

Top K

↓

Prompt
```

---

问题：

Search：

不知道：

“为什么找”。

---

例如：

项目：

有：

```
docs/

auth-plan.md

payment-plan.md

cache-plan.md

deployment-plan.md
```

---

用户：

> 优化订单查询性能


Agent：

搜索：

可能找到：

```
payment-plan.md
```

因为：

里面也提到了：

query。

---

但是：

真正需要：

```
database-index-plan.md
```

---

所以：

问题不是：

有没有文档。

而是：

> Context Retrieval 是否理解当前 Goal。

---

这对应我们前面：

```text
Task Understanding

↓

Retrieval

↓

Ranking
```

---

# 三、第二个问题：

> 归档信息不及时更新造成影响

✅ 更深。

这叫：

## Memory Staleness（记忆过期）


这是 Agent 最大的问题之一。


---

例如：

2026 年：

生成：

```
architecture.md
```

内容：

```
项目使用 Redux 管理状态
```

---

一年后：

迁移：

Zustand。


但是：

文档没更新。


---

未来 Agent：

读取：

```
architecture.md
```

然后：

建议：

继续 Redux。


---

结果：

产生：

错误认知。

---

这和人类一样：

人：

记忆：

> 公司以前使用 Vue2。


但是：

现在已经 Vue3。


---

所以：

Memory 必须：

有生命周期。


---

# 四、为什么这些 Plan 文档不能自动成为 Memory？

因为：

它们缺少：

## Memory Consolidation（记忆整合）

---

人类不是：

经历一件事：

全部记住。


例如：

你今天：

修电脑。

经历：

```
搜索驱动
安装驱动
重启
成功
```

---

一年后：

你不会记：

```
14:32 下载xxx.exe
14:35 点击下一步
14:37 重启
```

---

你记：

```
这个型号电脑需要更新驱动。
```

---

Agent 也需要：

从：

Event

↓

Experience

↓

Knowledge


---

也就是：

```
Raw Plan

↓

Summary

↓

Stable Memory
```

---

# 五、真正好的 Agent Memory 应该是什么？

不是：

大量 markdown。


而应该：

类似：

```json
{
 "fact":
 "Project uses Next.js App Router",

 "confidence":
 0.95,

 "source":
 "architecture decision",

 "created":
 "2026-07",

 "last_verified":
 "2026-08",

 "scope":
 "frontend"
}
```

---

它有：

1. 内容
2. 来源
3. 置信度
4. 时间
5. 范围

---

这样才能：

判断：

是否使用。

---

# 六、为什么 Claude Code / OpenSpec 这种模式仍然有价值？

这里也不要否定它。

它们的问题不是：

生成文档。


而是：

缺少完整闭环。


好的流程应该：

```
Task

↓

Plan

↓

Execute

↓

Result

↓

Extract Knowledge

↓

Update Memory

↓

Future Retrieval
```

---

很多工具现在：

做到：

前四步：

```
Task

↓

Plan

↓

Execute

↓

Document
```

---

但是：

缺：

后两步：

```
Document

↓

Knowledge Extraction

↓

Memory Update
```

---

所以：

文档越来越多：

但是 Agent 越来越迷茫。


---

# 七、这其实对应我们后面的章节

你这个问题实际上已经提前进入：

后续：

## 第五章：Memory Architecture

里面会讲：

- Short-term Memory
- Long-term Memory
- Episodic Memory
- Semantic Memory
- Memory Consolidation
- Memory Retrieval
- Memory Decay


你提出的问题：

正好属于：

> 为什么简单 Markdown Memory 不够？

---

# 八、结合你的前端理解

可以类比：

很多项目：

有：

```
README.md
docs/
architecture.md
```

但是新人来了：

还是不知道：

系统怎么运行。


为什么？


因为：

文档：

只是：

静态信息。


而好的系统：

需要：

```
Knowledge Graph

+

Runtime Context

+

Search

+

Freshness
```

---

Agent 也是一样。

---

# 最终回答你的猜测

你的两个判断：

### 1.
> Agent 无法知道哪些归档有用

✅ 对。

本质：

缺少：

Task-aware Retrieval + Ranking。


---

### 2.
> 归档信息不及时更新

✅ 对。

本质：

缺少：

Memory Lifecycle Management。


---

再补充一个：

### 3.
> Plan 文档只是过程记录，不一定是可复用知识

这是最容易忽略的。

需要：

Memory Consolidation。

---

所以：

真正成熟 Agent：

不是：

```
会写文档
```

而是：

```
会从历史经验中提炼稳定认知
```

---

这个问题记录一下，后面第五章 Memory Architecture 会重点回收。

现在我们继续：

# 第三章：Context Compression

进入：

## 3.1 为什么需要 Context Compression？

### 25. User (2026-07-22 14:46:28)

开始第三章【3.1 为什么需要 Context Compression？】的学习

### 26. Assistant (2026-07-22 14:46:30)

# 第三章：Context Compression（上下文压缩）

## 3.1 为什么需要 Context Compression？

---

前面第二章我们解决了：

> Context Window 太小，怎么办？

我们学习了：

```
Token Budget
        ↓
Context Allocation
        ↓
Priority Ranking
        ↓
Context Eviction
```

但是这里有一个更深的问题：

---

假设：

一个 Agent 正在执行一个复杂任务。

执行过程：

```
User Goal

↓

分析需求

↓

读取代码

↓

调用工具

↓

修改文件

↓

运行测试

↓

修复 Bug

↓

再次测试

↓

生成总结
```

过程中产生：

```
Conversation:

50000 tokens


Tool Result:

100000 tokens


Code Context:

200000 tokens
```

---

但是：

真正有价值的信息可能只有：

```
当前目标

+

关键决策

+

已经完成步骤

+

未解决问题

+

重要约束
```

可能：

5000 tokens。


---

所以问题来了：

> 能不能把大量历史信息压缩成少量但是保留价值的信息？

答案：

就是：

# Context Compression

---

# 一、什么是 Context Compression？

定义：

> Context Compression 是将大量 Context 信息转换为更小、更高信息密度表示的过程，同时尽量保持 Agent 完成任务所需要的信息。

关键词：

## Information Density（信息密度）


---

不是：

简单减少字符。

例如：

原始：

```
用户：
为什么不用方案A？

Agent：
因为方案A会导致数据库压力。

用户：
那方案B呢？

Agent：
方案B性能更好，但是实现复杂。

用户：
那选择B。
```

---

简单截断：

```
用户：
那选择B。
```

---

Token 少了。

但是：

信息没了。


Agent 不知道：

为什么选择 B。


---

Compression：

应该变成：

```
Decision:

Choose solution B.

Reason:

Solution A causes database pressure.

Constraint:

Prefer performance over implementation simplicity.
```

---

Token：

1000

↓

50


但是：

核心认知保留。


---

# 二、Compression 和 Summarization 的区别

很多人混淆。

认为：

Compression = Summary。


不完全正确。

---

Summary：

关注：

> 总结发生了什么。


例如：

```
今天讨论了登录问题。
```

---

Compression：

关注：

> 保留未来推理需要的信息。


例如：

```
Auth Bug:

Cause:
JWT refresh expired.

Decision:
Move refresh logic to middleware.

Constraint:
Do not modify API contract.
```

---

所以：

Agent Compression：

不是写摘要。


而是：

## Reasoning State Compression

---

# 三、为什么 Agent 必须 Compression？

原因一：

# 1. Long-running Task 必然超过 Context

这是最直接原因。


普通聊天：

```
Question

↓

Answer
```

结束。


Agent：

```
Task

↓

100 steps

↓

Result
```

---

例如：

Coding Agent：

修改一个大型项目。


可能：

调用：

```
read_file
50次

search
30次

test
20次

edit
50次
```

---

如果全部保留：

Context:

爆炸。

---

所以：

必须压缩。

---

# 四、原因二：减少 Noise

这是非常重要。

很多人认为：

Context 越多越好。


错误。

---

因为：

LLM 不是数据库。


LLM 是：

在 Context 中寻找模式。

---

例如：

你给 Agent：

```
当前 Bug:

payment timeout
```

同时给：

```
10000 行历史日志
+
50 个旧方案
+
20 次失败尝试
```

---

可能：

模型注意力被分散。


这叫：

## Context Dilution

（上下文稀释）

---

类似：

你让一个新人：

阅读：

```
500页项目历史文档

然后告诉他：

现在这个 bug 怎么修？
```

---

不一定比：

给他：

```
当前错误日志

+
相关代码

+
历史决策
```

效果好。


---

所以：

Compression 的目的：

不是：

放更多。

而是：

提高信噪比。


---

# 五、原因三：降低 Token Cost

这个是工程现实。


LLM 调用成本：

通常：

和 token 数量相关。


例如：

一次 Agent Loop：

输入：

100k token。


执行：

100 次。


那么：

```
100k × 100
=
10M tokens
```

---

如果 Compression：

降低：

```
100k

↓

20k
```

成本：

直接降低。

---

所以工业 Agent：

一定会做：

Context Optimization。


---

# 六、原因四：提高推理稳定性

这是高级一点。


假设：

Context：

```
历史方案 A

历史方案 B

历史方案 C

当前方案 D
```

---

如果没有压缩：

模型可能：

混淆：

```
哪个方案已经废弃？

哪个方案当前有效？
```

---

Compression 可以整理：

```
Previous Decisions:

A rejected because X.

B rejected because Y.

Current Decision:

Use D.
```

---

相当于：

给 LLM 一个：

干净的认知状态。


---

# 七、Context Compression 的核心目标

不是：

```
Token 越少越好
```

错误。


真正目标：

```
Minimum Tokens

+

Maximum Task-Relevant Information
```

---

也就是：

最小 token。

最大有效信息。

---

公式：

可以理解：

```
Compression Quality

=

Useful Information
/
Token Count
```

---

例如：

方案 A：

```
10000 tokens

包含:

5000 tokens 有用信息
```

密度：

0.5


---

方案 B：

```
2000 tokens

包含:

1500 tokens 有用信息
```

密度：

0.75


---

方案 B 更好。

---

# 八、Compression 在 Agent Runtime 中的位置

结合前面的架构：

现在：

```
Runtime State

      |

      v

Retrieval

      |

      v

Ranking

      |

      v

Allocation

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

但是实际：

Compression 可能发生多个地方。


例如：

## Conversation Compression

历史消息压缩。


## Tool Result Compression

工具结果压缩。


## Memory Compression

长期 Memory 整合。


## Code Context Compression

代码上下文压缩。


---

# 九、前端工程类比

这个和你的经验非常接近。

---

假设：

Redux Store：

```javascript
{
 users,
 products,
 orders,
 logs,
 history
}
```

---

页面：

订单详情。


如果直接：

```
store
↓

component
```

问题：

数据太多。


---

Selector：

第一次优化：

```
store

↓

selectOrderDetail

↓

component
```

---

但是：

orderDetail：

10000 条历史。


继续：

```
Pagination

Virtual List

Aggregation
```

---

Compression：

类似：

```
10000 条订单

↓

最近订单统计

↓

用户需要的信息
```

---

不是删除数据。


而是：

生成：

更适合当前消费场景的数据。


---

# 十、本节核心认知升级

以前：

Context Management：

```
控制 Context 大小
```

现在：

升级：

```
控制信息密度
```

---

以前：

Compression：

```
减少 token
```

现在：

Compression：

```
在减少 token 的同时，
保持 Agent 推理所需状态
```

---

最终认知：

> Context Compression 本质是在有限 Context Window 中，对 Agent 的认知状态进行信息压缩。

---

# 本节思考题

进入 3.2【Summary Memory】之前，请回答：

### Q1：

为什么 Context Compression 不是简单删除历史消息？

---

### Q2：

为什么说 Context 越多不一定越好？

---

### Q3：

Context Compression 和普通文本 Summary 最大区别是什么？

---

### Q4：

一个 Coding Agent 完成 50 次 Tool Call 后，为什么不能把所有 Tool Result 全部保留？

---

回答完，我们进入：

# 3.2 Summary Memory

这一节会重点讲：

**Agent 如何把几十轮甚至几百轮执行过程压缩成可继续推理的“工作记忆”。**

### 27. User (2026-07-22 15:10:59)

Q1：Context Compression 关键在于压缩信息，压缩不是删除，比如一个 task 提供多个方案那么有用的信息就是为什么选择方案 a 不选择 b，那就可以压缩成选择 a 不选择 b 的原因以及方案 a 信息，这比原来的 output 信息少多了
q2：是有用的信息越多越好，关键在于有用而不是多
q3：区别在于Summary在于比如一千条信息的总结，而Compression在于这一千条信息进行提取压缩出有用的信息
q4：因为在每一次 Tool Call 后都是新的 context state 了，过去的 tools result 不一定是有用的信息哇，context builder 中的Compression也是需要对 tool result 进行压缩的

这是我对几个问题的认知，你看下，然后进入【3.2 Summary Memory】的学习

### 28. Assistant (2026-07-22 15:11:01)

你的这几个回答非常好，而且这里有一个明显进步：

你已经不再把 **Compression 理解成“压缩文本”**，而是在理解：

> Compression 是对 Agent 当前认知状态进行压缩。

这个理解非常关键。

我们先逐个校验，然后进入 3.2。

---

# 3.1 问题校验

---

# Q1：
> 为什么 Context Compression 不是简单删除历史消息？

你的回答：

> Compression 关键在于压缩信息，压缩不是删除，比如多个方案，保留为什么选择方案 A，不选择 B 的原因。

✅ 非常正确。

这里补充一个工业概念：

## Compression 保留的是 Decision Boundary（决策边界）

---

例如：

原始过程：

```
方案 A:

优点：
性能高

缺点：
开发成本高


方案 B:

优点：
简单

缺点：
性能差


讨论 30 轮

最终：

选择 A
```

---

简单删除：

```
选择 A
```

信息不足。


为什么？

因为未来 Agent 不知道：

> 为什么不能重新考虑 B？


---

Compression 后：

```
Decision:

Use A.

Rejected:

B rejected because performance requirement.

Constraint:

Performance > implementation simplicity.
```

---

未来：

Agent 可以继续推理。

---

所以：

Compression 保留：

不是聊天内容。

而是：

- Decision
- Reason
- Constraint
- State
- Pending Task

---

# Q2：
> 为什么 Context 越多不一定越好？

你的回答：

> 有用的信息越多越好，关键在于有用而不是多。

✅ 非常准确。


这句话其实就是：

Context Engineering 的核心。


很多人：

认为：

```
更多 Context

=

更强 Agent
```


错误。


实际上：

更准确：

```
High Quality Context

>

Large Context
```

---

例如：

给医生：

错误：

```
患者过去20年所有聊天记录
```

可能不好。


正确：

```
当前症状

+
关键病史

+
检查结果
```


---

LLM 也是一样。

---

# Q3：
> Compression 和普通 Summary 最大区别？

你的回答：

> Summary 是一千条信息的总结，Compression 是提取压缩出有用信息。

✅ 正确。


进一步升级：

Summary：

关注：

```
What happened?
```

---

Compression：

关注：

```
What does the Agent need to know next?
```

---

举例：

会议 Summary：

```
今天讨论了支付系统。
```

---

Agent Compression：

```
Payment Decision:

1.
Use async processing.

2.
Reason:
Avoid timeout.

3.
Remaining:
Implement retry strategy.
```

---

后者才可以驱动下一步行动。

---

# Q4：
> 为什么不能保留所有 Tool Result？

你的回答：

> 每次 Tool Call 后都是新的 context state，过去 tool result 不一定有用，需要 Compression。

✅ 非常好。

这里补充一个 Runtime 细节。


Tool Result 最大的问题：

不是数量。

而是：

## Information Decay（信息衰减）


例如：

第一次：

```
search("payment")
```

返回：

```
100 个文件
```

---

经过：

10 次分析后：

真正重要：

```
payment-service.ts
```

---

早期搜索结果：

价值下降。


所以：

Tool Result 需要：

```
Raw Observation

↓

Extracted Insight

↓

Compressed State
```

---

例如：

原始：

```
grep output:

5000 lines
```

---

Compression：

```
Found:

Payment timeout caused by retry loop.

Relevant:

payment/retry.ts line 42
```

---

这就是 Agent 的：

Observation Compression。

---

# 总体评价

你现在对 Compression 的理解：

已经从：

❌

```
减少 Token
```

升级到了：

✅

```
保持 Agent 可继续推理的最小状态表示
```

---

这正是第三章要讲的核心。

---

# 开始 3.2

# 第三章：Context Compression

# 3.2 Summary Memory（总结记忆）

---

上一节：

我们知道：

Compression 的目标：

> 保留未来推理需要的信息。


那么问题来了：

## 最常见的 Compression 方法是什么？

答案：

# Summary Memory

---

# 一、什么是 Summary Memory？

定义：

> Summary Memory 是将大量历史交互、执行过程压缩为结构化摘要，并作为后续 Agent 推理上下文的一种短期记忆机制。

关键词：

## Summary

+

## Memory

---

注意：

这里的 Memory：

不是长期 Memory。

而是：

## Working Memory（工作记忆）

---

# 二、为什么叫 Summary Memory？

因为它解决：

一个问题：

```
Context Window
        ↓
不断增长
        ↓
爆炸
```

---

所以：

把：

```
过去经历
```

转换为：

```
当前状态摘要
```

---

例如：

原始 Conversation：

```
User:
修复登录问题


Agent:
查看 auth.ts


Agent:
发现 JWT refresh bug


Agent:
修改 middleware


Agent:
测试失败


Agent:
调整 retry


Agent:
测试通过
```

---

如果全部保存：

可能：

5000 tokens。


---

Summary Memory：

```
Task:

Fix login refresh issue.


Completed:

- Found JWT expiration bug
- Updated refresh middleware
- Tests passed


Current State:

Auth flow fixed.


Next:

Deploy verification.
```

---

可能：

100 tokens。

---

# 三、Summary Memory 和 Conversation History 的关系

非常重要。

不是替代。

而是：

分层。

---

结构：

```
Conversation History

(完整事件)

        |

        |

        v

Summary Memory

(压缩状态)

        |

        |

        v

Current Context
```

---

类似：

数据库：

```
Event Table

        |

        v

Materialized View

        |

        v

Query Result
```

---

---

# 四、为什么 Summary Memory 比直接截断好？

假设：

执行：

100轮。

---

方案1：

保留最近10轮。

问题：

丢失：

```
为什么这么设计
```

---

方案2：

Summary。

保留：

```
历史决策
当前状态
未完成事项
```

---

所以：

Agent 连续性更强。

---

# 五、工业 Summary Memory 保存什么？

重点：

不是保存：

聊天。


而是保存：

## 1. Goal

当前目标。


例如：

```
Refactor authentication module.
```

---

## 2. Completed Actions

已经完成。

例如：

```
Updated JWT middleware.
Added tests.
```

---

## 3. Decisions

关键决定。


例如：

```
Use Redis cache instead of local cache.
```

---

## 4. Constraints

约束。

例如：

```
Cannot modify API contract.
```

---

## 5. Current State

当前状态。


例如：

```
Implementation complete.
Waiting for review.
```

---

## 6. Open Questions

未解决问题。

例如：

```
Need decide retry strategy.
```

---

这几个字段：

比聊天记录价值高很多。

---

# 六、Summary Memory 的生成时机

什么时候生成 Summary？


不是：

每一句。


通常：

## 1. Context 接近限制

例如：

```
Context > 80%
```

触发。


---

## 2. Agent 阶段切换

例如：

```
Planning

↓

Implementation
```

生成总结。


---

## 3. Task Checkpoint

例如：

完成一个大步骤。


---

类似：

Git commit。


---

# 七、和 Git Commit 的类比

这个非常适合你。

---

开发：

100 次修改。

不是：

永远：

```
git diff
```

查看。

---

而是：

commit：

```
feat:
add payment retry logic
```

---

Commit：

就是：

代码世界的 Summary Memory。

---

Agent：

Execution:

```
100 steps
```

↓

Summary:

```
Current State Snapshot
```

---

# 八、Summary Memory 的问题

当然：

Summary 不是万能。


最大问题：

## Information Loss


---

例如：

原始：

```
为什么选择方案 A？

因为：

性能要求

+

团队熟悉度

+

未来扩展
```

---

Summary：

```
Choose A for performance.
```

---

丢：

团队熟悉度。


---

所以：

Summary 需要：

## Selective Preservation


也就是：

重要信息不能压缩掉。

---

这会连接下一节：

## 3.3 Hierarchical Context

---

# 九、前端类比

你非常熟悉。

---

比如：

浏览器页面：

原始：

```
10000 条用户操作日志
```

---

不可能：

全部放 React State。


---

生成：

```
Current UI State
```

例如：

```javascript
{
 page:"order",
 filter:"pending",
 selectedOrder:123
}
```

---

这就是：

Summary Memory。


---

不是：

保存所有点击。


而是：

保存：

当前 UI 认知状态。


---

# 十、本节核心认知升级

以前：

Conversation：

```
历史记录
```

---

现在：

Summary Memory：

```
历史压缩后的工作状态
```

---

以前：

Agent 连续性：

靠：

```
越来越长 Context
```

---

现在：

靠：

```
持续更新 Summary Memory
```

---

最终模型：

```
Conversation

(完整经历)

        |

        v

Summary Memory

(压缩认知)

        |

        v

Context Builder

        |

        v

LLM
```

---

# 本节思考题

进入 3.3【Hierarchical Context】之前，请回答：

### Q1：
为什么 Summary Memory 保存的不是完整 Conversation，而是 Goal、Decision、Constraint 等结构化信息？

---

### Q2：
为什么 Summary Memory 属于短期工作记忆，而不是 Long-term Memory？

---

### Q3：
为什么 Agent 不能每一步 Tool Call 后都生成 Summary？

---

### Q4：
结合 Git：
为什么 Summary Memory 更像 Git Commit，而不是 Git Log？

---

回答完，我们进入：

# 3.3 Hierarchical Context（分层上下文）

这一节会解决一个更大的问题：

**一个成熟 Agent 为什么不会只有一个 Context，而是多个层级 Context。**

### 29. User (2026-07-22 15:27:50)

Q1-Q4：我的理解是 Summary Memory 在需要时候进行总结，那么总结时候必然需要前因后果这些关键性的结构化信息，不然就会存在信息不完整容易让 AI 不知道为什么。同时它是属于比如触发阈值时候去总结，因此是短期的不是永久的，但是这个是否需要落库呢？我理解既然是短期的不需要落库。Agent 每一步 Tool Call 后都生成 Summary的话会导致 state 爆掉，Summary本身就是为了解决 state 爆掉的问题的。Git Commit更像是 commit 了什么，而 log 是我 commit 了

你看下，然后进入【3.3 Hierarchical Context（分层上下文）】学习

### 30. Assistant (2026-07-22 15:27:53)

你的回答整体非常好，而且你在 Q1 里面其实已经触碰到了 **Summary Memory 最核心的设计目标：保持 Agent 的状态连续性（state continuity）**。

不过有两个地方需要稍微修正：

1. **Summary Memory 是否落库？**
2. **Git Commit 类比需要再精确一点**

我们先校验。

---

# 3.2 问题校验

---

## Q1：
> Summary Memory 需要前因后果这些关键结构化信息，否则 AI 不知道为什么。

✅ 正确。

而且这里有一个非常重要的概念：

## Summary Memory 保存的是“因果链”，不是“文本”。

---

比如：

原始：

```
用户：
为什么不用 Redis？

Agent：
因为目前单机部署，不需要分布式缓存。

用户：
那以后扩容怎么办？

Agent：
预留 Cache Interface。

用户：
好。
```

---

普通 Summary：

```
讨论了缓存方案。
```

价值：

很低。


---

好的 Summary Memory：

```json
{
 "decision": "Use local cache first",
 "reason": "Current system is single-node",
 "future_plan": "Keep cache abstraction for Redis migration"
}
```

---

未来 Agent 才知道：

不是：

“不知道 Redis”。

而是：

“当前阶段故意不用 Redis”。

---

所以 Summary Memory 的核心：

不是：

缩短 Conversation。


而是：

保留：

```
Why
+
What
+
Current State
+
Next Step
```

---

# Q2：
> 它是短期的，因为触发阈值时候总结，不是永久的，但是是否需要落库？

这里需要调整。

你的：

> 短期，所以不需要落库

❌ 这个不完全正确。

---

关键：

**短期 ≠ 不落库。**

---

我们重新定义：

Memory 的分类：

不是按照：

“有没有数据库”。

而是按照：

“生命周期和用途”。

---

例如：

## Working Memory（工作记忆）

特点：

当前任务。


例如：

```
正在修复支付 Bug

已经完成:
- 找到异常
- 修改 retry

下一步:
- 跑测试
```

---

它可能：

存在：

Runtime State：

或者：

临时数据库。


---

## Episodic Memory（事件记忆）

特点：

过去发生过什么。


例如：

```
2026-07-22
完成支付模块重构
```

---

通常：

需要落库。


---

## Semantic Memory（知识记忆）

特点：

稳定事实。


例如：

```
项目使用 Next.js App Router
```

---

长期落库。


---

所以：

Summary Memory：

通常处于：

```
短期工作记忆
```

但是：

工业 Agent：

可能：

会持久化。

为什么？


---

例如：

Claude Code：

你关闭终端。

第二天回来。

希望：

继续昨天任务。


那么：

昨天 Summary：

必须存在。


---

所以：

更准确：

> Summary Memory 通常是短期工作状态，但为了支持长任务恢复（checkpoint/resume），通常会持久化。

---

类似：

浏览器：

sessionStorage：

和：

数据库：

不是二选一。


---

# Q3：
> 每一步 Tool Call 都 Summary 会导致 state 爆掉。

✅ 正确。


再深入：

为什么？


因为 Summary 本身也是 Context。


如果：

每一步：

```
Tool Call

↓

Summary

↓

Save
```

最终：

变成：

```
1000个 Summary
```

---

这叫：

## Summary Accumulation Problem

---

所以：

Summary 也需要：

Compression。


形成：

层级：

```
Step Summary

↓

Phase Summary

↓

Task Summary
```

---

这就是下一节：

Hierarchical Context。

---

# Q4：
> Git Commit 更像 commit 了什么，而 Log 是 commit 了。

你的方向对。

稍微调整：

Git Log：

记录：

```
所有事件
```

例如：

```
commit1
commit2
commit3
commit4
```

---

Summary Memory：

更像：

Git Commit。


为什么？

因为：

Commit：

不是记录：

每一行修改。

而是：

记录：

一次变化后的状态。


例如：

```
feat: add payment retry mechanism
```

里面包含：

- 改了什么
- 为什么改
- 当前状态

---

所以：

对应：

```
Git Log
=
Conversation History


Git Commit
=
Summary Memory
```

---

这个类比非常准确。

---

# 进入 3.3

# 第三章：Context Compression

# 3.3 Hierarchical Context（分层上下文）

---

这一节非常重要。

因为它解决：

## Summary Memory 的一个问题：

> 如果 Summary 也越来越多怎么办？

---

例如：

一个 Coding Agent：

执行：

一天。


产生：

```
1000 Tool Calls

↓

100 Summary
```

---

100 Summary：

还是很多。

怎么办？

---

答案：

## Hierarchical Context

---

# 一、什么是 Hierarchical Context？

定义：

> Hierarchical Context 是将 Context 按照不同抽象层级组织，使 Agent 根据当前任务需要选择不同粒度的信息。

简单：

不是只有一个 Context。

而是：

多个层级。

---

类似：

人类记忆。


---

你问：

> 你大学学什么？


不会：

回忆：

大学四年每天发生什么。


你直接：

```
本科:
计算机专业
```

---

如果问：

> 大三那个项目怎么做的？

再深入。


---

这就是：

Memory Hierarchy。


---

# 二、为什么需要分层？

因为：

不同任务需要不同粒度。


---

例如：

用户：

> 这个项目是什么？

需要：

高层。


```
这是一个电商系统
使用 Next.js
```

---

用户：

> 为什么不用 SSR？

需要：

中层。


```
当时考虑:
缓存复杂度
部署成本
```

---

用户：

> SSR 那个 hydration bug 怎么修？

需要：

底层。


```
具体代码
error stack
```

---

所以：

Context：

应该：

分层。


---

# 三、典型 Agent Context Hierarchy

工业 Agent 常见：

```
Level 0:

Current Context

(当前输入)


        ↑


Level 1:

Task Summary

(当前任务)


        ↑


Level 2:

Session Summary

(本次会话)


        ↑


Level 3:

Project Memory

(项目知识)


        ↑


Level 4:

External Knowledge

(文档/数据库)
```

---

越往下：

越详细。

越往上：

越抽象。

---

# 四、和数据库的类比

非常类似：

数据库：

```
Raw Events

↓

Aggregated Table

↓

Materialized View

↓

Dashboard
```

---

Agent：

```
Conversation Events

↓

Summary Memory

↓

Project Knowledge

↓

Current Context
```

---

---

# 五、和前端架构类比

这个你应该很容易理解。


React 应用：

后端：

```
Database

↓

API

↓

Store

↓

Selector

↓

Component State

↓

DOM
```

---

不是：

数据库全部塞 DOM。


---

Agent：

```
Memory Store

↓

Retrieval

↓

Context Builder

↓

Context Window

↓

LLM
```

---

不是：

所有 Memory 塞 LLM。


---

# 六、Hierarchical Context 最大价值

## 1. 降低 Token

不用每次读取全部历史。


---

## 2. 保持长期一致性

高层 Summary 保留：

```
项目目标
架构原则
关键决策
```

---

## 3. 支持深度展开

需要细节：

再向下检索。


---

例如：

Agent：

先知道：

```
Payment module exists
```

发现需要：

再展开：

```
payment-service.ts
```

---

类似：

文件系统：

```
/
 └── project
       └── src
            └── payment
                  └── service.ts
```

---

# 七、Hierarchical Context 和 RAG 的关系

这里提前连接。

很多人：

认为：

RAG：

就是搜索。


其实：

高级 Agent：

是：

```
Hierarchy

+

Retrieval
```

---

例如：

用户：

问：

> 支付为什么这样设计？


先：

Project Summary：

找到：

```
Payment uses async queue
```

---

然后：

需要：

展开：

设计文档。


---

不是：

直接：

Vector Search 全项目。


---

# 八、本节核心认知升级

以前：

Context：

```
一个大文本窗口
```

---

现在：

Context：

```
多个层级的信息空间
```

---

成熟 Agent：

不是：

拥有更大的 Context Window。


而是：

知道：

什么时候看哪个层级。


---

最终模型：

```
                 LLM

                  ↑

          Current Context

                  ↑

          Task Summary

                  ↑

        Session Summary

                  ↑

        Project Memory

                  ↑

       External Knowledge
```

---

# 本节思考题（进入 3.4 前）

### Q1：
为什么 Agent 不能把所有 Memory 都直接放入 Context？

---

### Q2：
为什么 Hierarchical Context 可以降低 Token 消耗？

---

### Q3：
为什么用户问“项目是什么”和“支付模块某行代码为什么这样写”，需要不同层级 Context？

---

### Q4：
结合前端：
为什么 Hierarchical Context 更像 “Database → API → Store → Selector → View”，而不是直接把数据库全部渲染到页面？

---

回答完，我们进入：

# 3.4 Long-running Agent 如何保持连续性

这一节会把前三章串起来：

**为什么 Claude Code 可以连续修改几小时代码，而不是每轮都像失忆一样重新开始。**

### 31. User (2026-07-22 15:47:26)

这几个问题你回答下吧。然后开启下一节【3.4 Long-running Agent 如何保持连续性】的学习

### 32. Assistant (2026-07-22 15:47:28)

先回答 3.3 的几个问题，然后进入 **3.4 Long-running Agent 如何保持连续性**。

---

# 3.3 问题校验

---

# Q1：
> 为什么 Agent 不能把所有 Memory 都直接放入 Context？

答案：

因为：

## Memory ≠ 当前认知状态

---

Memory 是：

```text
所有可能有价值的信息集合
```

例如：

项目 Memory：

```text
Vue3
Vite
历史架构决策
旧 Bug
用户习惯
部署方式
数据库设计
```

---

但是当前任务：

比如：

> 修复支付接口超时


真正需要：

```text
payment module
API contract
recent logs
retry strategy
```

---

如果全部放：

```text
Memory

↓

Context Window

↓

LLM
```

会产生：

### 1. Token 浪费

大量无关信息。

---

### 2. Context Noise

例如：

LLM 同时看到：

```text
支付模块
+
登录模块
+
历史 UI 重构
+
旧技术选型
```

注意力被分散。


---

### 3. 冲突信息

例如：

Memory：

```text
项目使用 Redux
```

后来：

```text
迁移 Zustand
```

两个都在 Context：

LLM 不知道哪个有效。

---

所以：

正确：

```text
Memory Store

↓

Memory Retrieval

↓

Relevant Memory

↓

Context
```

---

类似：

数据库不会：

每次请求：

```sql
select * from database;
```

然后返回整个库。

---

# Q2：
> 为什么 Hierarchical Context 可以降低 Token 消耗？

核心：

## 按需展开（Progressive Disclosure）

---

没有层级：

```text
全部历史

↓

LLM
```

例如：

100 万 token。


---

有层级：

第一层：

```text
Project Summary

100 tokens
```

---

发现：

需要支付信息。

展开：

```text
Payment Design

1000 tokens
```

---

发现：

需要具体实现。

展开：

```text
payment-service.ts

5000 tokens
```

---

过程：

```text
100

↓

1000

↓

5000
```

---

而不是：

```text
1,000,000
```

---

这和：

操作系统：

虚拟内存。

文件系统：

目录树。

数据库：

索引。

本质一样：

> 不加载全部，只加载当前需要部分。

---

# Q3：
> 为什么“项目是什么”和“支付模块某行代码为什么这样写”需要不同层级 Context？

因为：

两个问题的：

## Information Granularity 不一样。

---

问题：

> 项目是什么？

需要：

高层抽象。

Context：

```json
{
 project:"e-commerce platform",
 stack:[
  "Next.js",
  "Node.js"
 ],
 architecture:"SSR"
}
```

---

问题：

> payment-service.ts 第42行为什么这样写？

需要：

低层细节。

Context：

```text
payment-service.ts

line 42

retry mechanism

related issue #123

previous decision
```

---

如果给第一个问题：

代码细节。

浪费。


如果给第二个问题：

项目简介。

没用。

---

所以：

Hierarchical Context：

解决：

```text
不同问题

↓

不同信息粒度
```

---

# Q4：
> 为什么 Hierarchical Context 类似 Database → API → Store → Selector → View？

你的类比非常准确。

原因：

每一层都在：

## 降低信息空间。


数据库：

```text
全部数据
```

↓

API：

```text
业务需要的数据
```

↓

Store：

```text
客户端状态
```

↓

Selector：

```text
组件需要的数据
```

↓

View：

```text
当前 UI
```

---

Agent：

对应：

```text
Memory Store

↓

Retrieval

↓

Context State

↓

Context Builder

↓

LLM
```

---

错误：

```text
Database

↓

DOM
```

---

对应错误：

```text
全部 Memory

↓

Prompt
```

---

# 3.3 总结

你现在应该形成：

```text
Memory

不是 Context

Context

不是 Prompt

Prompt

不是全部信息
```

而是：

```text
Huge Knowledge Space

        ↓

Relevant Information

        ↓

Task Context

        ↓

LLM Input
```

---

下面进入：

# 第三章：Context Compression

# 3.4 Long-running Agent 如何保持连续性

---

这一节是第三章的收尾，也是前三章的综合。

我们回答一个核心问题：

> 为什么 Claude Code、Cursor Agent 可以连续工作几十分钟甚至几个小时，而不是每一步都像失忆一样？

---

# 一、什么叫 Long-running Agent？

普通 Chat：

```text
User

↓

LLM

↓

Answer

↓

结束
```

---

Long-running Agent：

```text
Goal

↓

Plan

↓

Execute

↓

Observe

↓

Adjust

↓

Continue

↓

Complete
```

---

例如：

用户：

> 帮我重构整个支付系统。


可能执行：

```text
Step 1:
分析架构


Step 2:
读取代码


Step 3:
修改 payment service


Step 4:
运行测试


Step 5:
修复失败


Step 6:
优化性能
```

---

可能：

100+ 个步骤。


问题：

LLM 每次调用都是：

stateless。

---

那么：

连续性从哪里来？

---

答案：

## Agent Runtime 维护状态。

---

# 二、LLM 本身没有连续记忆

这是非常重要。


很多人误解：

> Claude Code 记住了我的项目。


实际上：

不是。


LLM 每次：

类似：

```text
Input

↓

LLM

↓

Output
```

---

它不知道：

上一次发生什么。


---

连续性来自：

Runtime：

保存：

```text
State
```

---

---

# 三、Long-running Agent 的核心状态

通常包括：

---

## 1. Goal State

当前目标。


例如：

```json
{
goal:
"Refactor payment module"
}
```

---

## 2. Plan State

计划。

例如：

```json
{
steps:[
 "analyze",
 "modify",
 "test"
 ],

current:
2
}
```

---

## 3. Execution State

执行状态。


例如：

```json
{
completed:[
 "analysis"
],

pending:[
 "run tests"
]
}
```

---

## 4. Context Summary

压缩后的认知。


例如：

```json
{
decision:
"Use async queue",

constraint:
"Keep API unchanged"
}
```

---

## 5. Tool State

工具执行结果。

例如：

```json
{
last_test:
"failed",

error:
"timeout"
}
```

---

最终：

```text
Agent State

=
Goal

+

Plan

+

Execution

+

Context Summary

+

Tool Result
```

---

# 四、为什么 Context Compression 是连续性的关键？

因为：

长期任务：

信息一直增长。


如果：

每一步：

```text
append context
```

最终：

爆炸。


---

所以：

Agent：

不断：

```text
Experience

↓

Compression

↓

State Update
```

---

例如：

第 1 步：

```text
Read auth.ts
```

---

第 10 步：

总结：

```text
Auth issue caused by JWT refresh.
```

---

第 50 步：

更新：

```text
Auth refactor completed.
```

---

旧过程：

被压缩。

状态：

持续。

---

# 五、Long-running Agent 的完整循环

工业模型：

```text
          Goal

           |

           v

      Planner

           |

           v

      Executor

           |

           v

        Tool

           |

           v

      Observation

           |

           v

   Context Compression

           |

           v

      State Update

           |

           +------------+

                        |

                        v

                  Next Loop
```

---

注意：

Compression 在 Loop 中间。

不是最后。


---

# 六、为什么 Claude Code Plan 模式有效？

回到你之前的问题。


Plan：

实际上提供：

```text
Goal State

+

Plan State

+

Decision History
```

---

例如：

plan.md：

```md
Goal:
Refactor auth


Completed:
- middleware changed


Remaining:
- tests


Decision:
Keep API compatible
```

---

它就是：

一种外部化 Context。


---

但是：

如果：

没有 Retrieval + Update：

就会：

变成死文档。


---

# 七、和人类工作类比

高级工程师解决复杂问题：

不会：

记住所有细节。


而是：

维护：

```text
设计文档

TODO

Decision Log

Issue 状态
```

---

这些东西：

就是：

外部认知。


---

Agent：

也是一样。

---

# 八、前端架构类比

一个大型 React 应用：

不会：

每个组件自己记住整个业务。


而是：

```text
Backend

↓

Store

↓

Selector

↓

Component State

↓

UI
```

---

Agent：

```text
Environment

↓

Runtime State

↓

Context Builder

↓

Context Window

↓

LLM
```

---

---

# 九、第三章总结：Context Compression 的完整认知

现在三章串起来：

---

## 第一阶段：

Context Budget

解决：

> 空间有限怎么办？

---

## 第二阶段：

Context Ranking/Eviction

解决：

> 哪些留下？

---

## 第三阶段：

Context Compression

解决：

> 如何让重要信息长期存在？


---

最终：

工业 Agent：

不是：

拥有无限 Context。

而是：

拥有：

```text
动态认知压缩系统
```

---

# 第三章核心认知升级

从：

❌

> Agent 厉害，因为 Context Window 大。

升级：

✅

> Agent 厉害，因为它能在有限 Context 中持续维护高质量认知状态。

---

下一步进入：

# 第四章：Context Engineering 实战设计

目录：

## 4.1 Context Builder 工业架构回顾

## 4.2 OpenAI / Claude Code 类 Agent Context Pipeline

## 4.3 如何设计一个 Mini Agent Context Manager

## 4.4 Day04 总结 + 写书 TODO + 写书素材

这一章会开始把前面的理论落到：

**真正 Runtime 代码设计。**

### 33. User (2026-07-22 15:49:59)

开始【第四章：Context Engineering 实战设计】的学习

### 34. Assistant (2026-07-22 15:50:02)

# Day04 Part D：Context Window Management

# 第四章：Context Engineering 实战设计

前面三章我们一直在解决：

> Agent 如何管理自己的“认知输入”。

现在进入最后一章：

从理论进入工程设计。

这一章会把：

- Runtime State
- Context Builder
- Memory
- Retrieval
- Ranking
- Compression
- Token Budget

全部串起来。

最终目标：

设计一个工业级 Agent 的 Context Pipeline。

---

# 第四章目录

## 4.1 Context Builder 工业架构回顾

## 4.2 OpenAI / Claude Code 类 Agent Context Pipeline

## 4.3 如何设计一个 Mini Agent Context Manager

## 4.4 Day04 总结 + 写书 TODO + 写书素材

---

# 4.1 Context Builder 工业架构回顾

---

在前面的学习中，我们不断提到：

```text
Runtime State

↓

Context Builder

↓

LLM
```

但是现在我们要深入：

> Context Builder 到底是不是一个简单函数？

答案：

不是。

---

# 一、重新认识 Context Builder

初级理解：

很多人认为：

```javascript
function buildContext(state){
  return state.messages;
}
```

例如：

```javascript
const context = [
  systemPrompt,
  ...messages
];

llm.call(context);
```

---

这个只能叫：

## Prompt Assembly

不是：

Context Engineering。

---

工业 Agent：

Context Builder：

实际上是一个：

## Context Management System

---

它负责：

```text
决定：

1. 放什么

2. 不放什么

3. 放多少

4. 什么优先

5. 如何组织
```

---

所以：

更准确：

```text
Context Builder

=

Context Selection

+

Context Ranking

+

Context Compression

+

Context Formatting
```

---

# 二、Context Builder 在 Runtime 中的位置

完整 Runtime：

```text
                 User

                  |

                  v

              Runtime Loop


                  |

        +---------+---------+

        |                   |

        v                   v


     State              Tools


        |                   |

        +---------+---------+

                  |

                  v


          Context Builder


                  |

                  v


                 LLM


                  |

                  v


              Next Action
```

---

注意：

Context Builder 不在 LLM 内。

它属于：

## Runtime 控制层。

---

这也是为什么：

Agent ≠ LLM。

---

# 三、Context Builder 输入什么？

我们前面学习了：

Runtime State。

现在展开。

---

一个 Agent State：

可能：

```typescript
interface AgentState {

  conversation: Message[];

  goal: Goal;

  plan: Plan;

  memory: Memory[];

  toolResults: ToolResult[];

  environment: Environment;

  constraints: Constraint[];

}
```

---

注意：

这里：

全部都是候选信息。

---

但是：

不能全部进入 Context。

---

所以：

Context Builder：

输入：

```text
All Available State
```

输出：

```text
LLM Required Context
```

---

# 四、Context Builder 核心流程

工业版本：

大概：

```text
                 Runtime State

                       |

                       v


             Task Understanding


                       |

                       v


              Context Retrieval


                       |

                       v


              Priority Ranking


                       |

                       v


             Token Allocation


                       |

                       v


             Compression


                       |

                       v


             Context Assembly


                       |

                       v


                    LLM
```

---

我们逐层拆。

---

# 五、Step 1：Task Understanding

为什么第一步不是 Retrieval？

因为：

你不知道任务。

你不知道找什么。


---

例如：

用户：

> 帮我优化这个模块


问题：

优化什么？

可能：

- 性能？
- 可维护性？
- 代码规范？


---

所以：

先识别：

```json
{
 taskType:"performance optimization",
 goal:"reduce rendering time"
}
```

---

这会影响：

后续 Context。


---

# 六、Step 2：Context Retrieval

根据目标：

寻找候选信息。


例如：

任务：

优化订单页面。


Retrieval：

找到：

```text
OrderList.vue

useOrder.ts

API docs

Performance logs
```

---

注意：

Retrieval：

不是最终选择。

只是：

候选池。

---

类似：

搜索引擎：

先召回。

---

# 七、Step 3：Priority Ranking

候选：

```text
OrderList.vue
★★★★

UserProfile.vue
★

Performance.log
★★★★★

Old README
★★
```

---

排序。

---

# 八、Step 4：Token Allocation

假设：

Context Budget：

50k。


分配：

```text
Goal:

5k


Code:

20k


Logs:

15k


Memory:

5k


Conversation:

5k
```

---

动态。

不是固定。

---

# 九、Step 5：Compression

例如：

历史：

10000 tokens。

压缩：

1000。


保留：

```text
Decision

Constraint

Current State
```

---

# 十、Step 6：Context Assembly

最后：

组织成：

LLM 看到的结构。


例如：

```text
<System>

You are coding agent.

</System>


<Goal>

Fix payment timeout.

</Goal>


<Constraints>

Do not modify API.

</Constraints>


<Relevant Code>

payment-service.ts

</Relevant Code>


<Previous Decisions>

Use async retry.

</Previous Decisions>


<Tool Result>

Latest test failed.

</Tool Result>
```

---

这一步：

非常重要。

---

因为：

同样的信息。

不同排列。

LLM 表现不同。

---

# 十一、为什么 Context 顺序重要？

LLM 不是数据库。

它存在：

Attention。


---

例如：

错误：

```text
10000 lines logs

最后：

Goal:
fix payment bug
```

---

模型可能：

被日志淹没。


---

更好：

```text
Goal

↓

Constraints

↓

Current State

↓

Evidence

↓

Details
```

---

类似：

写技术方案：

先：

背景。

再：

方案。

最后：

细节。

---

# 十二、前端类比：Context Builder 就是 Selector++

你之前的 Redux 类比非常准确。

普通 Selector：

```javascript
selectUser(state)
```

---

Context Builder：

更像：

超级 Selector：

```javascript
selectAgentContext(
 state,
 goal,
 budget,
 taskType
)
```

---

例如：

```typescript
buildContext({
 state,
 goal:"debug",
 budget:50000
})
```

输出：

```json
{
 system,
 goal,
 code,
 logs,
 memory
}
```

---

它不是：

取数据。

它是在：

生成当前 Agent 的“视图”。

---

# 十三、为什么 Context Builder 是 Agent 核心竞争力？

因为：

未来：

模型能力越来越接近。


区别会在哪里？

不是：

谁调用 GPT。


而是：

谁能给 GPT 更好的 Context。


---

例如：

同一个 GPT：

输入 A：

```text
帮我修 Bug
```

---

输入 B：

```text
Goal:
Fix payment timeout

Relevant code:
payment-service.ts

Previous decision:
Use retry queue

Latest error:
Timeout at line 42
```

---

结果：

完全不同。

---

所以：

未来 Agent 竞争：

很大程度：

是：

## Context Engineering 竞争。

---

# 十四、本节核心认知升级

以前：

Context Builder：

```text
拼 Prompt
```

---

现在：

Context Builder：

```text
Agent 的认知操作系统
```

---

它负责：

```text
State

↓

Knowledge

↓

Memory

↓

Evidence

↓

Reasoning Context

↓

LLM
```

---

# 本节思考题

进入 4.2【OpenAI / Claude Code 类 Agent Context Pipeline】之前：

回答几个架构问题：

---

### Q1：

为什么 Context Builder 不应该直接把 Runtime State 全部传给 LLM？

---

### Q2：

为什么说 Context Builder 类似 React 中的 Selector，但是能力更强？

---

### Q3：

为什么同一个 LLM，Context 不同，Agent 能力差异巨大？

---

### Q4：

如果你设计一个 Mini Agent Runtime，你认为 Context Builder 应该属于：

A. LLM 层  
B. Runtime 层  
C. Tool 层  
D. Memory 层  

为什么？

---

回答完进入：

# 4.2 OpenAI / Claude Code 类 Agent Context Pipeline

这一节我们会开始拆真实工业 Agent：

**为什么 Claude Code 能读代码、改代码、持续工作几个小时。**

### 35. User (2026-07-22 15:53:50)

q1-q4 问题本质上还是只需要给 LLM 最有用最关键的信息。而哪些信息有用关键就是 Context Builder 要做的事情，这也是在模型能力差不多时候为何不同的 agent 表现不同的原因。
开启【4.2 OpenAI / Claude Code 类 Agent Context Pipeline】的学习

### 36. Assistant (2026-07-22 15:53:53)

你的回答非常准确，这里我补充一个更高级的抽象，然后进入 4.2。

---

# 4.1 问题回收与认知升级

你的总结：

> 本质上还是只需要给 LLM 最有用最关键的信息。而哪些信息有用关键就是 Context Builder 要做的事情，这也是在模型能力差不多时候为何不同 agent 表现不同的原因。

✅ 完全正确。

甚至可以把 Agent 能力拆成：

```text
Agent Capability

=

Model Intelligence

+

Context Engineering

+

Tool Capability

+

Runtime Control
```

---

很多人关注：

```
GPT-5.x
Claude xxx
Gemini xxx
```

但实际 Agent 产品竞争：

越来越偏向：

```
谁能构造更好的 Context
```

---

举一个 Coding Agent 例子。

两个 Agent 都调用同一个 LLM。


Agent A：

输入：

```
帮我修复登录 bug
```

---

Agent B：

输入：

```
Goal:
Fix login timeout issue


Relevant files:
auth/middleware.ts

Previous decision:
Keep JWT contract unchanged


Recent error:
refresh token expired


Related code:
line 42-56


Constraints:
Do not modify API response format
```

---

显然 Agent B 胜。

因为：

不是模型更强。

而是：

它构造了更好的认知环境。

---

所以：

Context Builder 本质：

> 是 Agent 给 LLM 创建“工作空间”的能力。

---

# 进入 4.2

# OpenAI / Claude Code 类 Agent Context Pipeline

这一节我们开始拆：

真实工业 Agent 为什么能够：

- 阅读大型代码库
- 连续修改文件
- 执行几十轮 Tool Call
- 保持上下文连续

---

## 一、先纠正一个误区

很多人认为：

Claude Code 工作方式：

```
用户输入

↓

Claude

↓

修改代码
```

类似聊天。


实际上：

不是。


真实：

更接近：

```
User Goal

↓

Agent Runtime

↓

Planning

↓

Context Construction

↓

LLM Reasoning

↓

Tool Execution

↓

Observation

↓

State Update

↓

Next Loop
```

---

它是一个：

循环系统。

---

# 二、工业 Agent 的完整 Context Pipeline

抽象：

```
                 User Request

                       |

                       v

              Task Understanding


                       |

                       v


              Runtime State


                       |

        +--------------+--------------+

        |                             |

        v                             v


   Memory Retrieval             Tool History


        |                             |

        +--------------+--------------+

                       |

                       v


              Context Builder


                       |

                       v


                 Token Budget


                       |

                       v


                 LLM Input


                       |

                       v


              Next Action Decision
```

---

我们逐层拆。

---

# 三、第一层：User Request → Task Understanding

很多简单 Agent：

直接：

```
User Message

↓

LLM
```

---

工业 Agent：

第一步：

理解任务。


例如：

用户：

> 优化这个页面


Agent 需要判断：

这是：

```json
{
 taskType:"performance",
 domain:"frontend",
 target:"page rendering"
}
```

---

为什么？

因为不同任务：

需要不同 Context。


---

比如：

## Debug：

需要：

```
Error
Logs
Stack Trace
Relevant Code
Recent Changes
```


---

## Feature Development：

需要：

```
Requirements
Architecture
Existing Patterns
Similar Components
```


---

## Code Review：

需要：

```
Diff
Coding Convention
Security Rules
Tests
```

---

所以：

Context Builder 前面一定有：

Task Understanding。

---

# 四、第二层：Runtime State

这是我们 Day04 Part B 学的。

Runtime State 是：

Agent 当前世界状态。


例如：

```typescript
interface RuntimeState {

 conversation;

 goal;

 plan;

 currentStep;

 toolResults;

 memoryRefs;

 constraints;

}
```

---

注意：

Runtime State 不是全部送进去。


它只是：

Context 的来源。


---

类似：

Redux Store：

不是：

所有 state 都渲染。


需要：

Selector。


---

# 五、第三层：Memory Retrieval

这里连接第五章 Memory。

---

Agent 有长期知识：

例如：

```
Project Memory:

- 使用 Next.js App Router
- 禁止修改 API contract
- 使用 pnpm workspace
```

---

但是：

用户：

> 修复支付 timeout


不会全部加载。


---

Retrieval：

寻找：

相关 Memory。


结果：

```
Payment architecture decision

+
API constraints
```

---

这就是：

Memory → Context 的桥梁。

---

# 六、第四层：Tool History 管理

这是 Coding Agent 最关键部分。


例如：

Claude Code：

执行：

```
read_file
search
edit
test
```

---

每次 Tool：

产生：

Observation。


例如：

```
npm test

↓

500 lines output
```

---

不能全部保存。


需要：

Tool Result Compression。


例如：

原始：

```
500 lines
```

压缩：

```
Test failed:

AuthService.test.ts

Reason:
token refresh mismatch
```

---

所以：

Tool History：

不是日志仓库。

而是：

Reasoning Evidence。


---

# 七、第五层：Context Builder

现在：

输入：

```
Task

+

Runtime State

+

Relevant Memory

+

Compressed Tool Results

+

Code Context
```

---

开始：

选择：

```
What enters Context?
```

---

例如：

当前：

Debug payment。


最终：

Context：

```
<System>
You are coding agent
</System>


<Goal>
Fix payment timeout
</Goal>


<Relevant Code>
payment-service.ts
</Relevant Code>


<Previous Decision>
Use async retry
</Previous Decision>


<Latest Error>
Timeout after 30s
</Latest Error>
```

---

这就是：

Agent 的认知状态。

---

# 八、第六层：LLM Decision

LLM 不负责：

管理上下文。


LLM 负责：

基于输入：

推理。


例如：

看到：

```
timeout after 30s
```

决定：

```
Need inspect retry logic
```

输出：

Tool Call：

```json
{
 tool:"read_file",
 args:{
  path:"retry.ts"
 }
}
```

---

然后：

进入下一轮。


---

# 九、整个 Loop

完整：

```
        Goal

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

    Environment

         |

         v

 Observation

         |

         v

 State Update

         |

         v

 Context Compression

         |

         v

 Next Loop
```

---

这就是：

为什么 Agent 可以工作几个小时。

---

# 十、Claude Code 为什么效果好？

不是因为：

“它记住所有代码”。

而是：

它有：

## 1. Repository Understanding

理解项目结构。


---

## 2. Context Retrieval

找到相关文件。


---

## 3. Tool Loop

不断执行。


---

## 4. Context Management

保持状态。


---

## 5. Human-like Planning

维护目标。


---

这些组合起来：

才形成：

Agent。

---

# 十一、和你的前端架构经验对应

你可以这样理解：


传统前端：

```
Backend Data

↓

API

↓

Redux Store

↓

Selector

↓

Component

↓

DOM
```


Agent：

```
World Knowledge

↓

Memory Store

↓

Runtime State

↓

Context Builder

↓

LLM Context

↓

Action
```


---

Context Builder：

就是 Agent 世界里的：

Selector + Compiler。


为什么说 Compiler？

因为：

它把：

```
复杂状态空间
```

编译成：

```
LLM 可理解输入
```

---

# 十二、本节核心认知升级

以前：

Agent：

```
LLM + Tools
```

---

现在：

工业 Agent：

```
LLM

+

Runtime

+

Context Engineering

+

Memory

+

Tools
```

---

其中：

Context Engineering：

连接所有模块。


---

最终一句话：

> OpenAI / Claude Code 类 Agent 的核心能力，不是让 LLM 看到更多信息，而是在每一轮循环中，为 LLM 构造最适合当前决策的认知环境。

---

# 本节思考题

进入最后一节 **4.3 Mini Agent Context Manager 设计** 前：

### Q1：
为什么说 Context Builder 更像 Compiler，而不仅是 Selector？

---

### Q2：
为什么 Tool Result 不能直接全部进入下一轮 Context？

---

### Q3：
如果一个 Coding Agent 修改一个大型项目，它的 Context 应该优先包含：
A. 整个代码仓库  
B. 当前目标相关代码 + 决策 + 错误信息  
C. 所有历史 Conversation  
D. 所有 Memory  

为什么？

---

### Q4：
结合你前端架构经验：
Runtime State、Context Builder、LLM 三者关系更像：

A. Redux Store → Selector → View  
B. Database → API → Browser  
C. webpack → bundle → CDN  
D. Router → Component → DOM

为什么？

---

回答后进入：

# 4.3 如何设计一个 Mini Agent Context Manager

这一节我们会开始设计代码结构，把 Day04 的理论落成 Runtime 组件。

### 37. User (2026-07-22 15:57:57)

Q1：因为Context Builder 除了做选择之外还要做总结压缩等操作，这有点像Compiler
q2：本质上还是信息的有用性
q3：B 
q4：A
开启【4.3 如何设计一个 Mini Agent Context Manager】的学习

### 38. Assistant (2026-07-22 15:57:59)

你的回答继续保持很好的抽象能力，尤其 Q1 和 Q4。

我们先快速校验，然后进入 **4.3 Mini Agent Context Manager 设计**。

---

# 4.2 问题校验

---

## Q1：
> Context Builder 不只是选择，还要总结压缩，所以像 Compiler。

✅ 正确。

再提升一下：

Compiler 不只是：

“选择代码”。

它还有：

```text
Source Code

↓

Parsing

↓

Optimization

↓

Transformation

↓

Machine Code
```

---

Context Builder：

类似：

```text
Raw Agent State

↓

Understand

↓

Filter

↓

Compress

↓

Organize

↓

LLM Context
```

---

所以：

Context Builder ≈ Agent 的 Compiler。


输入：

```text
复杂世界状态
```

输出：

```text
LLM 可推理表示
```

---

## Q2：
> Tool Result 不能全部进入，因为信息有用性。

✅ 正确。

补充：

Tool Result 最大的问题：

不是数量。

而是：

### Observation ≠ Knowledge


例如：

工具：

```text
grep "login"
```

返回：

```text
2000 lines
```

这是 Observation。


但是：

Agent 真正需要：

```text
JWT refresh bug exists in auth.ts line 42
```

这是 Knowledge。


所以：

需要：

```text
Observation

↓

Extraction

↓

Context
```

---

## Q3：
> B

✅ 完全正确。


大型 Coding Agent：

不会：

```text
Repository

↓

LLM
```

---

而是：

```text
Goal

+

Relevant Files

+

Decision History

+

Error Evidence

+

Constraints
```

---

## Q4：
> A

✅ 正确。


而且这个类比已经贯穿 Day04。


对应：

```text
Redux Store

↓

Selector

↓

View
```

---

Agent：

```text
Runtime State

↓

Context Builder

↓

LLM
```

---

差别：

Selector：

主要：

选择。


Context Builder：

选择 + 推理优化。


---

# 进入 4.3

# 如何设计一个 Mini Agent Context Manager

这一节我们开始把 Day04 所有概念落成代码架构。

目标：

设计一个：

最小但是工业思想完整的 Context Manager。

---

# 一、先定义目标

我们不是实现：

完整 Claude Code。


而是实现：

核心能力：

```text
Runtime State

↓

Context Manager

↓

LLM Input
```

---

也就是说：

输入：

Agent 当前世界。

输出：

当前 LLM 需要知道的东西。

---

# 二、整体架构

Mini Context Manager：

```text
                 Runtime State

                      |

                      v


             Context Manager


      +---------------+---------------+

      |               |               |

      v               v               v


 Retrieval       Ranking        Compression


      |               |               |


      +---------------+---------------+

                      |

                      v


              Context Assembly


                      |

                      v


                    LLM
```

---

# 三、定义 Runtime State

首先：

Context Manager 不负责保存状态。

它消费状态。


例如：

```typescript
interface RuntimeState {

  // 用户目标
  goal: string;


  // 当前对话
  messages: Message[];


  // 执行计划
  plan?: Plan;


  // 工具结果
  toolResults: ToolResult[];


  // 长期记忆引用
  memories: Memory[];


  // 当前任务状态
  status: TaskStatus;
}
```

---

注意：

这里：

所有信息都有。

但是：

不会全部进入 LLM。

---

# 四、Context Manager 核心接口

设计：

```typescript
interface ContextManager {

  build(
    state: RuntimeState,
    budget: TokenBudget
  ): Context;

}
```

---

调用：

```typescript
const context =
contextManager.build(
 state,
 {
   maxTokens:50000
 }
);
```

---

输出：

```typescript
interface Context {

 system:string;

 messages:Message[];

 tools:ToolContext[];

 memory:Memory[];

}
```

---

---

# 五、内部 Pipeline 设计

实现：

```typescript
class DefaultContextManager {


 build(state,budget){


   const task =
      understandTask(state);


   const candidates =
      retrieve(state,task);


   const ranked =
      rank(candidates);


   const compressed =
      compress(
        ranked,
        budget
      );


   return assemble(
      compressed
   );


 }

}
```

---

这就是：

工业 Context Pipeline。

---

# 六、模块1：Task Understanding

负责：

理解当前任务。

例如：

输入：

```text
帮我优化首页性能
```

输出：

```typescript
{
 type:"performance",

 target:"homepage",

 need:[
  "component",
  "network",
  "render"
 ]
}
```

---

为什么单独抽出来？

因为：

Context 选择依赖任务。


---

# 七、模块2：Retrieval

负责：

召回候选信息。


例如：

```typescript
retrieve(
 state,
 task
)
```

返回：

```typescript
[
 homepage.vue,

 performance.log,

 architecture.md
]
```

---

注意：

Retrieval：

只是候选。


---

# 八、模块3：Ranking

排序。

例如：

```typescript
rank([
 code,
 memory,
 logs
])
```

结果：

```text
homepage.vue

★★★★★


performance.log

★★★★


old-doc.md

★
```

---

依据：

可能：

```text
relevance

+

recency

+

importance

+

confidence
```

---

# 九、模块4：Compression

这是 Day04 核心。


输入：

```text
50000 tokens
```

目标：

```text
10000 tokens
```

---

例如：

Tool Result：

之前：

```text
5000 lines
```

变：

```text
Payment API failed because timeout.

Relevant:
payment-service.ts
line 42
```

---

---

# 十、模块5：Context Assembly

最后：

组装 Prompt。


例如：

```text
<System>

You are coding agent

</System>


<Goal>

Fix payment timeout

</Goal>


<Context>

Relevant code...

Previous decisions...

Current errors...

</Context>
```

---

这个顺序：

非常重要。

---

# 十一、一个完整例子

用户：

> 修复支付超时问题


Runtime State：

```json
{
goal:
"fix payment timeout",


messages:[
...
],


toolResults:[
 npm test output
],


memory:[
 payment architecture
]

}
```

---

Context Manager：

---

## Task Understanding

得到：

```text
debug task
```

---

## Retrieval

找到：

```text
payment-service.ts

retry.ts

error.log
```

---

## Ranking

排序：

```text
error.log

payment-service.ts

old-doc
```

---

## Compression

日志：

```text
5000 lines

↓

timeout at retry handler
```

---

## Assembly

最终：

```text
Goal:
Fix payment timeout


Evidence:
retry timeout after 30s


Code:
retry.ts


Constraint:
Keep API contract
```

---

然后：

LLM：

决定：

```text
read retry.ts
```

---

这就是：

一次完整 Context Engineering。

---

# 十二、为什么这个设计重要？

因为：

未来模型变化：

比如：

GPT-6

Claude 6


你的：

Context Architecture：

仍然有效。


---

因为：

核心不是模型。


核心：

```text
如何管理认知输入
```

---

# 十三、和你的前端架构映射

你可以这样记：


传统：

```text
Redux Store

↓

Selector

↓

Component
```

---

Agent：

```text
Runtime State

↓

Context Manager

↓

LLM
```


---

但是：

Agent Selector 更复杂：

因为它需要：

```text
Selector

+

Memoization

+

Compression

+

Ranking

+

Retrieval
```

---

# 十四、本节核心认知升级

以前：

Agent：

```text
调用 LLM
```

---

现在：

Agent：

```text
管理 Context

↓

调用 LLM

↓

管理结果
```

---

所以：

Agent Runtime 的核心：

不是：

LLM API。


而是：

围绕 LLM 构建：

认知管理系统。


---

# 本节思考题

最后进入 4.4 Day04 总结前，请回答：

### Q1：
为什么 Runtime State 和 Context 不应该设计成同一个结构？

---

### Q2：
为什么 Context Manager 应该是 Runtime 层组件，而不是 LLM 层？

---

### Q3：
如果 Context Manager 设计成：

```typescript
buildContext(state)
```

和：

```typescript
buildContext(state, goal, budget)
```

你认为哪个更工业化？为什么？

---

### Q4：
结合 Redux：
为什么 Context Manager 更像 Selector + Middleware + Compiler 的组合？

---

回答完，我们进入：

# 4.4 Day04 总结

包括固定栏目：

1. 下一节学习计划  
2. 写书 TODO  
3. 写书素材  
4. 本 Part 核心认知升级

并完成 Day04 Context Window Management 总结闭环。

### 39. User (2026-07-22 16:01:15)

q1：因为Runtime State 包含所有的 state，而Context 是只有需要的信息
Q2：Runtime 层组件
Q3：第二个更工业化，因为不能只有 state，而没有目标 token 预算规则
Q4：这个问题回答很多次了 就不做解释了
开启【4.4 Day04 总结】学习

### 40. Assistant (2026-07-22 16:01:17)

你的回答没有问题，尤其 Q3 说明你已经理解了 **Context Builder 的动态性**。

我们简单校验，然后进入 Day04 总结。

---

# 4.3 问题校验

---

## Q1：
> Runtime State 包含所有 state，而 Context 是只有需要的信息

✅ 正确。

进一步抽象：

```text
Runtime State
=
Agent 世界状态

Context
=
Agent 当前认知视图
```

---

类似：

数据库：

```text
Database

=
全部事实
```

---

View：

```text
View Model

=
当前页面需要的数据
```

---

所以：

不要设计：

```typescript
RuntimeState === Context
```

否则：

Context Management 失去意义。

---

# Q2：
> Runtime 层组件

✅ 正确。


原因：

LLM：

只负责：

```text
Input

↓

Reasoning

↓

Output
```

---

Context Manager：

负责：

```text
决定 Input 是什么
```

---

所以：

属于：

```text
Agent Runtime Control Plane
```

---

# Q3：
> buildContext(state, goal, budget) 更工业化

✅ 正确。

因为：

Context 不是固定转换。


它依赖：

```text
Task

+

Budget

+

Priority

+

Runtime State
```

---

同一个 State：

不同 Goal：

产生不同 Context。

---

例如：

State：

```json
{
 code,
 logs,
 history,
 memory
}
```

---

Debug：

```text
code

+

logs
```

---

Review：

```text
diff

+

architecture
```

---

Explain：

```text
docs

+

high level summary
```

---

所以：

Context 是：

动态 Projection。

---

# Q4

你说：

> 回答很多次了

哈哈，这里确实是 Day04 贯穿类问题。

你的前面回答已经覆盖。

最终一句：

```text
Context Manager

=

Selector

+
Middleware

+
Compiler
```

---

Selector：

选择。

Middleware：

加工。

Compiler：

转换。


---

下面进入：

# Day04 Part D 最终总结

# Context Window Management

---

# 一、Day04 学习目标回顾

Day04 的主题：

不是：

“Context Window 有多大”。

而是：

> Agent 如何在有限 Context Window 中维持持续、高质量的认知能力。

---

我们最终建立了：

```text
Runtime State

↓

Context Engineering

↓

LLM Reasoning

↓

Action

↓

State Update
```

---

---

# 二、Day04 完整知识地图

---

# 第一章：Context Window 的本质

核心问题：

> 为什么不能直接把所有信息给 LLM？

---

学习：

## 1.1 Context Window 是什么

理解：

Context Window：

不是存储。

而是：

```text
LLM 当前可感知世界
```

---

## 1.2 Context 和 Memory 区别

形成：

三层模型：

```text
Conversation

历史事件


Memory

长期知识


Context

当前认知输入
```

---

## 1.3 为什么大 Context 仍然不够

因为：

```text
More Context

≠

Better Context
```

---

核心：

信息质量。

---

## 1.4 为什么 Agent 必须管理 Context

因为：

Agent 是：

长期循环系统。

Context：

动态变化。

---

---

# 第二章：Context Budget Management

解决：

> Context 有限，怎么分配？

---

## 2.1 Token Budget

理解：

Context Window：

不是无限资源。


需要：

```text
Input

+

Output

+

Reasoning
```

预算。


---

## 2.2 Context Allocation

不同任务：

不同分配。


例如：

Debug：

```text
Logs ↑

Code ↑
```

---

Planning：

```text
History ↑

Memory ↑
```

---

## 2.3 Priority Ranking

核心：

不是：

信息多少。


而是：

相关性。


---

排序：

```text
Goal

>

Constraint

>

Decision

>

Evidence

>

History
```

---

## 2.4 Context Eviction

理解：

不是删除。


而是：

```text
低价值信息退出当前 Context
```

---

---

# 第三章：Context Compression

解决：

> 如何让 Agent 长时间工作？

---

## 3.1 Context Compression

核心：

压缩：

不是删除。


保留：

```text
Decision

Reason

Constraint

State
```

---

## 3.2 Summary Memory

理解：

Summary：

不是聊天总结。


而是：

```text
当前工作状态快照
```

---

类似：

Git Commit。

---

## 3.3 Hierarchical Context

理解：

Context 不是一个平面空间。


而是：

层级：

```text
Project Memory

↓

Session Summary

↓

Task Summary

↓

Current Context
```

---

## 3.4 Long-running Agent 连续性

最终：

Agent 连续工作：

靠：

```text
State

+

Compression

+

Context Reconstruction
```

---

不是：

LLM 记住。

---

---

# 第四章：Context Engineering 实战设计

解决：

> 如何实现？

---

## 4.1 Context Builder 工业架构

理解：

Context Builder：

不是拼 Prompt。


而是：

```text
Selection

+

Ranking

+

Compression

+

Assembly
```

---

## 4.2 工业 Agent Context Pipeline

形成完整链路：

```text
User Goal

↓

Task Understanding

↓

Runtime State

↓

Retrieval

↓

Ranking

↓

Compression

↓

Context Assembly

↓

LLM

↓

Action
```

---

## 4.3 Mini Agent Context Manager

设计：

核心组件：

```text
ContextManager

 ├── Task Analyzer

 ├── Retriever

 ├── Ranker

 ├── Compressor

 └── Assembler
```

---

---

# 三、Day04 最大认知升级

如果 Day01：

Agent：

```text
LLM + Tool
```

---

Day02：

Agent：

```text
LLM

+

Runtime Loop
```

---

Day03：

Agent：

```text
Runtime

+

Tool

+

State
```

---

Day04：

Agent：

升级：

```text
Runtime

+

State

+

Context Engineering

+

Memory

+

Tools

+

LLM
```

---

真正的 Agent：

不是：

更大的模型。

---

而是：

## 更好的认知管理系统。

---

# 四、写书 TODO 📚

（按照我们之前约定，Day 章节结束自动沉淀）

---

## TODO 1：

增加章节：

# 《Context Engineering：Agent 的认知操作系统》

核心观点：

> LLM 决定推理能力，Context Engineering 决定模型能否获得正确认知。

---

## TODO 2：

增加 Runtime 架构图：

```text
                 Runtime State

                       |

                       v

              Context Manager

        +--------------+--------------+

        |              |              |

   Retrieval       Ranking      Compression


                       |

                       v

                 Context Window


                       |

                       v

                      LLM
```

---

## TODO 3：

补充：

Context Builder ≠ Prompt Template


对比：

| | Prompt Template | Context Builder |
|-|-|-|
|目的|格式化输入|管理认知|
|动态|低|高|
|是否检索|否|是|
|是否压缩|否|是|
|是否排序|否|是|

---

## TODO 4：

补充：

Agent Context 三层模型：

```text
Memory

↓

Runtime State

↓

Context Window
```

---

# 五、写书素材 📦

---

## 素材 1：

### Context 是 Agent 的认知窗口

类比：

人类不会：

把人生所有经历全部塞进大脑当前思考。


而是：

根据目标：

调用相关记忆。


---

## 素材 2：

### Context Builder = Agent Compiler

经典比喻：

编译器：

```text
Source Code

↓

Optimization

↓

Machine Code
```

Agent：

```text
World State

↓

Context Engineering

↓

LLM Input
```

---

## 素材 3：

### 大 Context 不等于强 Agent

公式：

```
Agent Quality

≈

Model Capability

×

Context Quality
```

---

## 素材 4：

### Claude Code / Coding Agent 本质

不是：

记住整个代码库。


而是：

动态构造：

```text
Goal

+

Relevant Code

+

History Decision

+

Error Evidence
```

---

# 六、本 Part 核心认知升级 🧠

从：

> Agent 需要更大的 Context Window。

升级为：

> Agent 需要更好的 Context Engineering。


---

从：

> Memory 越多越智能。

升级为：

> Memory 只有经过 Context Builder 转化，才成为 Agent 当前认知。


---

从：

> LLM 是 Agent 的大脑。

升级为：

> LLM 是推理核心，而 Runtime + Context Engineering 才是完整认知系统。


---

# Day04 完成状态 ✅

你已经完成：

```
Day04 Context Window Management

16 小节

4 大章节

```

完整覆盖：

- Context Window
- Token Budget
- Allocation
- Ranking
- Eviction
- Compression
- Summary Memory
- Hierarchical Context
- Long-running Agent
- Context Pipeline
- Context Manager Design


---

下一阶段建议进入：

# Day05：Memory System（Agent 长期记忆系统）

因为 Day04 最后留下一个核心问题：

> Context 可以动态构建，但是 Agent 的长期知识到底存在哪里？

下一章会正式拆：

```
Memory Architecture

├── Short-term Memory
├── Working Memory
├── Episodic Memory
├── Semantic Memory
├── Memory Retrieval
├── Memory Consolidation
└── Memory Lifecycle
```

这会和今天的 Context Engineering 完全衔接。

### 41. User (2026-07-22 16:05:00)

Runtime 架构图你再画详细一点。另外需要在【本 Part 核心认知升级】章节后补充【面试视角】【本章思考题】两个大章节信息，这两个大章节你也要记录到 memory 中以后每次学习完都需要。如果有【前置问题回收】也需要补充这个章节

### 42. Assistant (2026-07-22 16:05:07)

已记录到 memory，后续 Agent 学习章节结束时，我会固定在：

1. 下一节学习计划  
2. 写书 TODO  
3. 写书素材  
4. 本 Part 核心认知升级  

之后继续追加：

5. **面试视角**  
6. **本章思考题**  

如果存在之前遗留但属于后续章节的问题，也会增加：

7. **前置问题回收（Pending Questions）**

作为固定章节。

---

另外你提到 Runtime 架构图需要更详细，这里补充 Day04 中最核心的一张工业级 Context Runtime 架构图。

# Agent Runtime + Context Engineering 完整架构图

```text
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

---

# 这个架构图里面几个关键认知

## 1. Runtime State ≠ Context

这是 Day04 最大核心。

关系：

```text
Runtime State
(世界全部状态)

        |
        |
        v

Context Manager

        |
        |
        v

Context Window
(当前认知状态)
```

---

类似：

前端：

```text
Redux Store

        |
        |
        v

Selector

        |
        |
        v

Component Props
```

---

不是：

Redux Store 直接 render。

---

# 2. Context Manager 是 Agent 的“大脑前额叶”

如果：

LLM = 大脑推理区域

那么：

Context Manager = 信息调度中心。


负责：

- 我要看什么？
- 哪些信息重要？
- 哪些应该遗忘？
- 哪些需要展开？
- 哪些需要压缩？

---

# 3. Tool Result 不直接进入 LLM

真实链路：

错误：

```text
Tool Result

↓

LLM
```

---

正确：

```text
Tool Result

↓

Observation

↓

Extraction

↓

Compression

↓

Context

↓

LLM
```

---

# 4. Long-running Agent 为什么不会失忆

不是因为：

LLM 有记忆。

而是：

每轮：

```text
Old State

↓

Compression

↓

New State

↓

New Context

↓

LLM
```

持续重建认知。

---

# 补充到 Day04 写书结构中的新增固定章节

以后 Day04 这种章节结束会变成：

```text
Day04 总结

├── 下一节学习计划
├── 写书 TODO
├── 写书素材
├── 本 Part 核心认知升级
├── 面试视角
│
├── 本章思考题
│
└── 前置问题回收（如果存在）
```

---

另外，这张 Runtime 架构图我建议未来写书时作为：

**《Agent Runtime Architecture 总览图》**

而不是只放 Day04。

因为它实际上串联：

- Runtime State（Day02/Day03）
- Tool Calling（Day03）
- Context Engineering（Day04）
- Memory（Day05）
- Streaming/Event（后续）

它会成为整个 Agent 架构学习路线的一张总架构图。

### 43. User (2026-07-22 16:07:55)

那你看下今天学习是否到此就结束了呢？是否有需要补充的呢？比如【本章思考题】【面试视角】【前置问题回收】

### 44. Assistant (2026-07-22 16:08:00)

我回顾了一下今天 Day04 Part D【Context Window Management】的完整学习内容。

结论：

**今天的学习主体已经结束，不需要再新增知识章节。**

原因是我们已经完整闭环了：

```text
Context Window 是什么
        ↓
为什么需要管理 Context
        ↓
如何分配 Token Budget
        ↓
如何 Ranking / Eviction
        ↓
如何 Compression
        ↓
如何保持 Long-running Agent 连续性
        ↓
如何设计 Context Manager
        ↓
工业 Agent Context Pipeline
```

也就是说，Day04 的目标已经达成。

不过按照我们刚刚约定的学习规范，最后还需要补齐三个章节：

1. 【前置问题回收（Pending Questions）】
2. 【面试视角】
3. 【本章思考题】

下面补充。

---

# 前置问题回收（Pending Questions）

今天没有新的未解决问题。

但是之前几个章节留下的问题，在 Day04 已经得到部分回答。

---

## Pending Question 1

### 为什么知识库 Agent 经常“不好用”？

之前你的问题：

> 现在很多知识库 Agent 不好用，是不是因为没有形成好的 Context Builder？

Day04 后答案更加清晰：

问题通常不是：

❌ 没有向量数据库

而是：

## 没有完整 Context Engineering Pipeline


很多知识库 Agent：

架构：

```text
Documents

↓

Embedding

↓

Vector Search

↓

LLM
```

但是缺少：

```text
Query Understanding

↓

Retrieval Ranking

↓

Context Compression

↓

Context Assembly
```


所以：

召回了一堆文档。

但是：

没有形成 Agent 当前需要的认知。


---

正确架构：

```text
Knowledge Base


        ↓


Retriever


        ↓


Relevant Knowledge


        ↓


Context Builder


        ↓


LLM
```

---

## Pending Question 2

### OpenSpec / Claude Code Plan 为什么容易失效？

之前你的判断：

> 文档虽然有 description，但是 Agent 无法判断什么时候有用，而且没有及时更新。

Day04 后可以重新定义：

核心问题：

## Artifact ≠ Memory


一个 plan.md：

只是：

```text
Static Document
```

---

而 Agent Memory：

应该是：

```text
Dynamic Knowledge
```

需要：

- relevance 判断
- 更新时间
- confidence
- retrieval
- consolidation


否则：

最后会变成：

```text
Old Knowledge Graveyard
```

---

## Pending Question 3

### Memory 会不会越来越大，需要 Eviction？

Day04 后答案：

会。

但是：

Memory Eviction 和 Context Eviction 不一样。

---

Context Eviction：

解决：

```text
当前 Token 超限
```

属于：

短期认知管理。

---

Memory Management：

解决：

```text
长期知识质量下降
```

属于：

长期知识治理。

---

Memory 后续 Day05 会详细学习：

包括：

```text
Memory Creation

Memory Retrieval

Memory Consolidation

Memory Forgetting
```

---

# 面试视角

这一部分以后固定保留。

---

# 1. 什么是 Context Window Management？

面试回答：

> Context Window Management 是 Agent Runtime 对 LLM 输入信息进行动态管理的能力，包括信息选择、排序、压缩、淘汰和组织，目标是在有限 Token Budget 下提供最相关的上下文，提高模型推理质量。


---

# 2. Context Window 越大 Agent 越好吗？

标准回答：

不是。

原因：

Context 增大同时带来：

1. Token 成本增加

2. 注意力稀释

3. 无关信息干扰

4. 冲突信息增加


优秀 Agent 不是：

给模型更多信息。

而是：

给模型更好的信息。

---

# 3. Runtime State 和 Context 有什么区别？

面试回答：

> Runtime State 表示 Agent 当前完整运行状态，而 Context 是 Runtime 根据当前任务、Token Budget 和优先级动态构造出来提供给 LLM 的认知视图。


类比：

```text
Redux Store

↓

Selector

↓

Component Props
```

---

# 4. Context Builder 为什么重要？

高级回答：

> 因为 LLM 本身没有任务相关的信息选择能力，它只能基于输入推理。Context Builder 负责把复杂世界状态转换成模型可有效推理的输入，因此 Context Engineering 是 Agent 能力的重要来源。


---

# 5. Context Builder 和 Prompt Template 区别？

| |Prompt Template|Context Builder|
|-|-|-|
|目标|格式化文本|管理认知|
|动态|低|高|
|检索|无|有|
|压缩|无|有|
|排序|无|有|
|任务感知|弱|强|

---

# 6. 为什么 Claude Code 能长期运行？

面试回答：

> 因为 Claude Code 并不是依赖模型记忆，而是通过 Runtime State、Plan State、Tool Observation、Context Compression 和 Context Reconstruction，在多轮 Agent Loop 中持续维护任务状态。


---

# 本章思考题

这些问题可以作为 Day04 自测。

---

## 思考题 1

如果未来 GPT 拥有：

100M Token Context Window。

Context Builder 是否还需要？

为什么？

---

## 思考题 2

一个 Agent：

把所有 Memory 都放入 Context。

为什么可能比没有 Memory 更差？

---

## 思考题 3

为什么说：

Context Engineering 是 Agent 的核心竞争力之一？

它和模型能力是什么关系？

---

## 思考题 4

设计一个 Code Agent：

用户要求：

“帮我优化这个项目性能”。

你认为 Context Builder 第一轮应该加载什么？

不要考虑实现，只考虑信息优先级。

---

## 思考题 5

下面哪个设计更合理？


方案 A：

```text
Conversation

↓

Context

↓

LLM
```


方案 B：

```text
Runtime State

↓

Context Builder

↓

Context

↓

LLM
```


为什么？


---

# Day04 最终闭环

今天最大的认知升级：

---

以前：

> Agent = LLM + Tools


现在：

> Agent = Runtime + State + Context Engineering + Memory + Tools + LLM


---

以前：

> LLM 越强，Agent 越强


现在：

> Agent 的上限取决于它能否持续为 LLM 构造正确的认知环境。


---

以前：

> Context 是输入长度


现在：

> Context 是 Agent 当前对世界的认知投影。


---

所以 Day04 最终一句话：

> **Agent 的核心不是拥有无限的信息，而是在有限信息窗口中持续维护正确的认知状态。**

---

至此：

✅ Day04 Part D：Context Window Management 完成。

下一章 Day05：

# Memory System（Agent 长期记忆系统）

会正好回答今天留下的核心问题：

> Context 可以动态构建，那么 Agent 的长期知识到底如何产生、保存、检索、更新和遗忘？


Day05 会进入：

```text
Memory Architecture

├── Short-term Memory
├── Working Memory
├── Episodic Memory
├── Semantic Memory
├── Memory Retrieval
├── Memory Consolidation
└── Memory Lifecycle
```

这会和今天的 Context Engineering 完全衔接。

### 45. User (2026-07-22 16:09:47)

下一节不是 day05 而是 【`day04-part-e-provider-adapter.md`：Provider Adapter】，还是说这部分已经讲解过了呢

### 46. Assistant (2026-07-22 16:09:49)

你这个纠正是对的，我刚才把学习路线直接跳到了 **Day05 Memory System**，这是不符合我们之前规划的。

根据我们当前 Day04 的章节规划，**下一节确实不是 Day05，而是：**

# `day04-part-e-provider-adapter.md`：Provider Adapter

---

## 那 Provider Adapter 是否已经讲过？

答案：

**没有系统讲过。**

之前我们确实零散接触过一些相关概念，例如：

- LLM API 调用
- OpenAI / Claude / Gemini 等模型差异
- Runtime 调用 LLM
- Tool Calling
- Model Provider

但是这些都是站在：

> Agent Runtime 如何使用模型

这个角度讲的。

而 **Provider Adapter** 是另外一个工程层问题：

> Agent Runtime 如何屏蔽不同模型供应商差异。

---

# 为什么 Provider Adapter 属于 Day04？

其实它和 Context Engineering 有关系。

因为：

Context 最终要进入：

```text
Context Builder

↓

Provider Adapter

↓

LLM Provider
```

完整链路应该是：

```text
                Runtime State

                      |

                      v

              Context Builder

                      |

                      v

              Context Object

                      |

                      v

             Provider Adapter

                      |

          +-----------+-----------+

          |           |           |

          v           v           v

       OpenAI      Claude      Gemini

          |           |           |

          v           v           v

                  LLM Response

                      |

                      v

               Runtime Loop
```

---

# Provider Adapter 解决什么问题？

假设没有 Adapter：

你的 Runtime：

```typescript
runtime.callLLM()
```

里面直接：

```typescript
openai.chat.completions.create({
 messages
})
```

---

那么以后换：

Claude：

```typescript
anthropic.messages.create()
```

Gemini：

```typescript
gemini.generateContent()
```

你的 Runtime 全部修改。

---

这会导致：

Agent Runtime 和模型厂商强耦合。

---

工业设计：

应该：

```text
Runtime

↓

LLM Interface

↓

Provider Adapter

↓

Provider SDK
```

---

例如：

Runtime 只认识：

```typescript
interface LLMProvider {


  generate(
    context: Context
  ): Promise<Response>


}
```

---

OpenAI Adapter：

```typescript
class OpenAIAdapter
implements LLMProvider {


 async generate(context){

   return openai.chat.completions.create({
     messages:
       convert(context)
   })

 }

}
```

---

Claude Adapter：

```typescript
class ClaudeAdapter
implements LLMProvider {


 async generate(context){

   return anthropic.messages.create({
     messages:
       convert(context)
   })

 }

}
```

---

Runtime 完全不知道：

底层是谁。

---

# 它和 Context Engineering 的关系

这里有一个非常重要的认知：

Context Builder 输出的不是 Prompt 字符串。

更工业化：

应该输出：

```typescript
ContextObject
```

例如：

```typescript
{
 system:[
   "You are coding agent"
 ],

 messages:[
   ...
 ],

 tools:[
   ...
 ],

 metadata:{
   tokenBudget:50000
 }
}
```

---

然后：

Provider Adapter：

负责：

```text
Context Object

↓

OpenAI Message Format


或者


↓

Claude Message Format


或者


↓

Gemini Format
```

---

所以：

两者职责：

|组件|职责|
|-|-|
|Context Builder|决定给 LLM 什么信息|
|Provider Adapter|决定如何发送给不同模型|

---

# 为什么这一节很重要？

因为它补齐 Agent Runtime 的最后一层抽象：

之前：

```text
Runtime

↓

Context

↓

LLM
```

现在：

```text
Runtime

↓

Context Engineering

↓

Provider Abstraction

↓

LLM Provider
```

---

这也是为什么工业 Agent Framework：

例如：

- OpenAI Agents SDK
- LangGraph
- Mastra
- CrewAI

都会有类似抽象。

---

# 所以 Day04 最终目录应该调整为：

```text
Day04 Context Engineering & Runtime Infrastructure


Part A
Context Window Fundamentals


Part B
Token Budget Management


Part C
Context Compression & Continuity


Part D
Context Engineering 实战设计


Part E
Provider Adapter
```

---

然后 Day05 才进入：

```text
Memory System
```

---

另外这里其实还有一个好处：

Day04 学完 Provider Adapter 后，Agent Runtime 的完整闭环会变成：

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

          Provider Adapter

                 |

                 v

                LLM

                 |

                 v

              Tool Call

                 |

                 v

           State Update

                 |

                 v

          Next Iteration
```

这张图会成为进入 Day05 Memory 前非常重要的 Runtime 总架构图。

所以我们下一节应该继续：

# Day04 Part E：Provider Adapter

而不是进入 Memory。你指出得很及时。

### 47. User (2026-07-22 16:10:48)

那你更新下下一章学习计划来承接下

### 48. Assistant (2026-07-22 16:10:50)

好的，我更新一下后续学习计划，承接 Day04 当前进度。

之前我把 Day04 结束后直接跳 Day05 Memory，这里调整为：

> **先完成 Day04 Part E：Provider Adapter，补齐 Agent Runtime 基础设施闭环，再进入 Day05 Memory System。**

---

# 更新后的 Agent 学习路线

# Day04：Context Engineering & Runtime Infrastructure

目标：

理解一个工业级 Agent Runtime 如何围绕 LLM 构建完整基础设施。

---

## ✅ Part A：Context Window Fundamentals（已完成）

核心：

> Context Window 不是存储空间，而是 Agent 当前的认知窗口。

学习：

- Context Window 本质
- Context vs Conversation
- Context vs Memory
- 为什么大 Context 仍然不够
- Agent 为什么必须管理 Context

---

## ✅ Part B：Token Budget Management（已完成）

核心：

> Context 是有限资源，需要动态分配。

学习：

- Token Budget
- Context Allocation
- Priority Ranking
- Context Eviction

---

## ✅ Part C：Context Compression & Continuity（已完成）

核心：

> Long-running Agent 依靠状态压缩与重建保持连续性，而不是依赖模型记忆。

学习：

- Context Compression
- Summary Memory
- Hierarchical Context
- Long-running Agent Continuity

---

## ✅ Part D：Context Engineering 实战设计（已完成）

核心：

> Context Builder 是 Agent 的认知编译器。

学习：

- Context Builder 工业架构
- OpenAI / Claude Code Context Pipeline
- Mini Agent Context Manager 设计

形成：

```text
Runtime State

↓

Context Manager

↓

Context

↓

LLM
```

---

# ⏳ Part E：Provider Adapter（下一节）

目标：

补齐：

```text
Context Engineering

        +

LLM Provider Abstraction
```

---

学习内容：

## 5.1 为什么需要 Provider Adapter？

理解：

为什么 Agent Runtime 不应该直接依赖：

- OpenAI SDK
- Anthropic SDK
- Gemini SDK


核心：

解除：

```text
Agent Runtime

        ❌

LLM Provider
```

强耦合。

---

## 5.2 LLM Provider Interface 设计

设计：

统一接口：

```typescript
interface LLMProvider {

  chat(
    context: Context
  ): Promise<Response>

}
```

理解：

Runtime 只依赖抽象。

---

## 5.3 Provider Adapter 如何转换 Context？

重点：

理解：

Context Builder 输出：

```typescript
ContextObject
```

不是：

Prompt String。


然后：

Adapter 转换：

```text
Context Object

↓

OpenAI Messages


Context Object

↓

Claude Messages


Context Object

↓

Gemini Format
```

---

## 5.4 Streaming / Tool Calling 在 Adapter 层如何处理

承接 Day03：

Tool Calling：

```text
LLM

↓

tool_call

↓

Runtime
```

Streaming：

```text
LLM

↓

Token/Event Stream

↓

Runtime Event System
```

学习：

Adapter 如何屏蔽不同 Provider 差异。

---

## 5.5 工业级 Provider Layer 设计

最终形成：

```text
                 Agent Runtime


                       |

                       v


              LLM Provider Interface


                       |

        +--------------+--------------+

        |              |              |

        v              v              v


    OpenAI Adapter Claude Adapter Gemini Adapter


        |              |              |


        v              v              v


       OpenAI       Anthropic      Google
```

---

# Day04 最终产出

完成 Part E 后，Day04 会形成完整 Agent Runtime 总架构：

```text
                         User

                          |

                          v


                   Runtime Loop


                          |

                          v


                    Runtime State


                          |

                          v


                  Context Builder


                          |

                          v


                  Context Object


                          |

                          v


              Provider Adapter Layer


                          |

        +-----------------+----------------+

        |                 |                |

        v                 v                v

     OpenAI            Claude           Gemini


                          |

                          v


                         LLM


                          |

                          v


                    Tool / Response


                          |

                          v


                  State Update


                          |

                          v


                    Next Loop
```

---

# Day05：Memory System（后续）

等 Day04 Part E 完成后进入。

因为逻辑顺序应该是：

```text
Day01
Agent Basics

↓

Day02
Runtime Loop

↓

Day03
Runtime Architecture
(Tool / State / Event)

↓

Day04
Context Engineering
(如何给 LLM 正确输入)

↓

Day04 Part E
Provider Adapter
(如何抽象调用不同模型)

↓

Day05
Memory System
(如何形成长期知识)
```

---

这样顺序更符合真实 Agent Runtime 架构：

先解决：

1. **怎么运行 Agent**
2. **怎么管理状态**
3. **怎么构造输入**
4. **怎么连接模型**
5. **怎么形成长期记忆**

---

下一节正式进入：

# Day04 Part E：Provider Adapter

这部分结束后，Day04 才算真正闭环。

### 49. User (2026-07-22 16:12:21)

day04 完整结束后原来的 readme 中标识的是先 Tool Calling 然后 Day06：Memory

### 50. Assistant (2026-07-22 16:12:24)

你这个提醒是正确的，我刚刚调整路线时**把 Provider Adapter 的位置提得太靠前了**，导致和原始学习路线不一致。

我重新核对了你上传的 README，目前原规划确实是：

fileciteturn2file0

```text
Day01：Agent Basics

Day02：Runtime Foundation

Day03：Runtime Architecture

Day04：Runtime 如何思考（How Runtime Thinks）

Day05：Tool Calling

Day06：Memory

Day07：Streaming Event

Day08：Human Approval

Day09：Workflow

Day10：MCP
```

并且 Day04 当前目录规划到：

```text
Day04 Part A：Prompt 不是 Context

Day04 Part B-01：Runtime State

Day04 Part B-02：Runtime State Lifecycle

Day04 Part C：Context Builder Projection
```

fileciteturn2file0

---

所以正确的承接应该调整为：

# Day04 完整路线重新整理

实际上我们现在学习的内容已经扩展到了：

```text
Day04 Runtime 如何思考（How Runtime Thinks）

├── Part A
│   Prompt 不是 Context
│
├── Part B
│   Runtime State
│
├── Part C
│   Context Builder Projection
│
├── Part D
│   Context Window Management
│
└── Part E
    Provider Adapter（补充）
```

但是：

**Part E Provider Adapter 不应该成为 Day04 后的主线章节。**

原因：

Provider Adapter 属于：

```text
Runtime Infrastructure
```

而不是：

```text
Decision Engine / How Runtime Thinks
```

---

# 正确学习顺序应该保持：

## Day04：Runtime 如何思考

解决：

> Runtime 如何决定给 LLM 什么信息，以及如何形成一次思考输入。

核心：

```text
State

↓

Context Builder

↓

Context

↓

LLM
```

---

## Day05：Tool Calling

解决：

> Runtime 如何让 LLM 从“思考”进入“行动”。

承接关系：

Day04：

```text
我要给 LLM 什么信息？
```

↓

Day05：

```text
LLM 决定行动后 Runtime 如何执行？
```

完整闭环：

```text
Context

↓

LLM Reasoning

↓

Tool Call

↓

Observation

↓

State Update

↓

New Context
```

---

## Day06：Memory

解决：

> Agent 如何积累长期知识。

承接：

Day04 已经留下：

```text
Context ≠ Memory
```

Day05 Tool Calling 又会产生：

```text
Tool Observation

↓

Memory Candidate
```

所以 Day06 很自然。

---

# 那 Provider Adapter 放哪里？

我建议不要丢掉，而是调整定位：

它不作为 Day04 主章节。

更适合：

## Day03 Runtime Architecture 补充章节

或者：

## Day10 MCP / Advanced Runtime 前置基础设施章节


因为它解决的是：

```text
Agent Runtime

如何适配不同 LLM Provider
```

属于：

工程架构问题。

---

完整关系：

```text
                 Agent Runtime


        +---------------------------+

        |                           |

        v                           v


 Decision Layer              Execution Layer


(Context Engineering)        (Tool Calling)



        |                           |

        v                           v


 Context Builder              Tool Runtime


        |

        v


 Provider Adapter


        |

        v


 LLM Provider
```

---

所以我建议最终路线：

# 修正版学习路线

```text
Day01 Agent Basics

↓

Day02 Runtime Foundation

↓

Day03 Runtime Architecture

↓

Day04 Runtime 如何思考
    ├ Context
    ├ Runtime State
    ├ Context Builder
    └ Context Management

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

Provider Adapter：

作为 Runtime Architecture 的补充知识穿插，不改变主线。

---

你刚才这个纠正其实反映了一个很重要的问题：

我之前从“工程完整性”角度考虑：

> Runtime 需要 Provider Adapter，所以应该补齐。

但是你的 README 路线是按照：

> Agent 能力演进路径

设计的。

这个学习顺序更合理：

```text
感知 Context
        ↓
思考 Decision
        ↓
执行 Tool
        ↓
形成 Memory
        ↓
增强 Runtime 能力
```

所以后续我们保持 README 主线。

下一节应该是：

# Day05：Tool Calling

而不是 Provider Adapter。

Provider Adapter 我会作为后续 Runtime Infrastructure 补充章节记录。你这个调整是正确的。
