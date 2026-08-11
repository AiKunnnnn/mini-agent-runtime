# Day06 Part A ChatGPT 分享会话源记录

- 分享链接：https://chatgpt.com/share/6a7acb5d-c468-83ee-b682-6bb04cda7492
- 会话标题：Day06 Memory 拆分建议
- 提取日期：2026-08-11
- 整理说明：原会话共有 6 个消息块。中间有一段 ChatGPT 误把“补充固定章节”理解成“生成完整学习笔记”的输出，正式笔记未采用该段内容；本源记录只保留有效学习讲解、用户纠正和最终固定章节框架。

---

## 用户

这是我的学习笔记的总readme，以及 day05 part i 的学习笔记，你看一下，然后我们进入 day06 的学习。同时进入 day06时，我们是否需要向 day05 那样拆分成好几个 part 呢

## ChatGPT

你的理解方向是对的，而且你这个问题其实已经进入 Memory System 工业实现了。

先回答你的核心问题：

> 是否会设置一个专门的大模型去判断是否需要存储为 Profile、Preference 等 Memory？

答案：

> 会，而且这是目前工业 Memory 系统里非常常见的一种设计。

但是它通常不会叫“专门的大模型”，更准确叫：

> Memory Extractor（记忆提取器）或 Memory Manager（记忆管理器）。

它可能由 LLM 驱动，也可能是规则 + LLM 混合。

## 1. 为什么需要 Memory Extractor？

因为 Runtime 不可能简单：

```text
所有 Conversation
        |
        v
全部存 Memory
```

否则 Memory 会快速污染。

例如：

用户：

> 今天北京天气不错。

如果保存：

```json
{
  "type": "fact",
  "content": "User thinks Beijing weather is good"
}
```

几个月后：

Agent：

> 你之前喜欢北京天气。

明显错误。

所以需要一个判断层：

```text
Conversation
      |
      v
Memory Extractor（记忆提取器）
      |
      +-------- ignore
      |
      +-------- create memory
      |
      +-------- update memory
      |
      +-------- delete memory
```

## 2. Memory Extractor 本质上也是一个 Agent

Memory 系统本身其实也可以看成一个小 Agent。

因为它也有：

- Goal（目标）
- Context（上下文）
- Decision（决策）
- Action（动作）

它的 Goal：

> 判断当前信息是否值得长期保存。

例如输入：

```text
用户：
以后回答问题请多解释原理，不要只给答案。
```

Memory Extractor：

Context：

```json
{
  "conversation": "以后回答问题请多解释原理",
  "existing_memory": []
}
```

Decision：

```json
{
  "action": "create",
  "type": "preference",
  "content": "User prefers detailed explanations"
}
```

然后执行：

```text
Memory Store.save()
```

## 3. Memory Extractor 会不会也是一个大模型？

工业上有几种方案。

### 方案 1：LLM Memory Extractor

```text
Conversation
       |
       v
      LLM
       |
       v
 Memory JSON
```

Prompt 类似：

```text
Analyze this conversation.

Decide whether any information should be stored.

Output:
- type
- content
- confidence
```

输出：

```json
{
  "type": "preference",
  "content": "User prefers detailed explanations",
  "confidence": 0.92
}
```

优点：理解能力强。

缺点：成本高。

### 方案 2：规则 + LLM Hybrid（混合）

工业更常见。

例如先规则过滤：

- 以后
- 永远
- 习惯
- 喜欢
- 不喜欢
- 我的工作是

然后进入 Memory Extractor，由 LLM 判断。

流程：

```text
Conversation
 |
 v
Rule Filter（规则过滤）
 |
 v
Memory Extractor LLM
 |
 v
Memory Store
```

这样降低成本。

### 方案 3：Embedding + Similarity（相似度）

还有一种是判断“这个信息以前有没有？”

例如已有 Memory：

```json
{
  "content": "User prefers TypeScript"
}
```

新的信息：

```text
我更喜欢 TS
```

Embedding 得到向量后计算相似度，发现 90% 相似，于是 Update Memory。

所以工业 Memory 通常不是单一技术，而是：

```text
Conversation
    |
    v
Extraction（提取）
    |
    v
Classification（分类）
    |
    v
Deduplication（去重）
    |
    v
Storage（存储）
    |
    v
Retrieval（检索）
```

## 4. 一个非常重要的点：Memory 不是只 Create

很多初学者理解：

```text
Memory:
发现信息
    |
    v
保存
```

其实不够。

工业 Memory 至少有四种操作：

### Create（创建）

第一次发现：

> 用户喜欢 TypeScript

创建：

```json
{
  "type": "preference",
  "value": "typescript"
}
```

### Update（更新）

后来：

> 用户最近开始使用 Rust。

更新：

```json
{
  "old": "User uses TypeScript",
  "new": "User uses TypeScript and Rust"
}
```

### Merge（合并）

两个 Memory：

```json
{
  "content": "喜欢 React"
}
```

```json
{
  "content": "喜欢 Next.js"
}
```

合并：

```json
{
  "content": "Frontend ecosystem preference: React + Next.js"
}
```

### Forget（遗忘）

例如三年前用户使用 Vue2，现在主要使用 React，旧 Memory 应该降低权重。

所以工业 Memory 有 Memory Decay（记忆衰减）。

## 5. 回到你的问题：是不是模拟人类记忆？

是。

而且这个设计非常像认知科学。

人类：

```text
经历 Experience
  |
  v
大脑筛选
  |
  v
长期记忆 Long-term Memory
```

Agent：

```text
Conversation
  |
  v
Memory Extractor
  |
  v
Memory Store
```

对应：

| 人类 | Agent |
| --- | --- |
| 经历 | Conversation |
| 注意力 | Extractor |
| 长期记忆 | Memory |
| 回忆 | Retrieval |
| 遗忘 | Decay |

## Part A 还有几个补充点

### 补充 1：Memory 是 Runtime 的长期 State

Day04 讲 Runtime State 是当前任务状态。

现在增加：

```text
State
 |
 +-- Runtime State
 |
 +-- Memory State
```

区别：

- Runtime State：分钟级，任务生命周期
- Memory：长期，用户生命周期

类似：

```text
Runtime State = 当前页面 JS state
Memory        = localStorage
```

### 补充 2：Memory 也需要 Context Budget

不是：

```text
所有 Memory
      |
      v
全部塞给 LLM
```

否则用户积累 10000 条 Memory 后，Prompt 会爆炸。

所以 Memory Retrieval 必须回答：

> 当前任务需要哪些 Memory？

例如用户问：

> 帮我设计 React 架构

需要：

- Frontend background
- React preference
- Engineering style

不需要：

- 喜欢吃火锅
- 去年去哪里旅游

### 补充 3：Memory 有可信度

不是所有 Memory 一样。

例如：

> 我最近可能考虑学习 Go。

Confidence 低。

> 我的主要技术栈是 React 和 Node。

Confidence 高。

Memory 可能是：

```json
{
  "content": "User uses React",
  "confidence": 0.95
}
```

### 补充 4：Memory 是安全边界

工业系统必须考虑哪些东西不能存。

例如：

- 密码：password=123456
- 身份证

所以 Memory Extractor 还需要 Privacy Filter（隐私过滤器）。

## 总结 Part A 最终模型

```text
Conversation
  |
  v
Memory Extractor（LLM/规则）
  |
  +------------+------------+
  |            |            |
Create       Update       Forget
  |
  v
Memory Store
  |
  v
Retrieval（检索）
  |
  v
Context Builder
  |
  v
LLM
```

Part A 完整后，下一节 Part B 进入：

> Day06 Part B：Memory Architecture（记忆系统架构）

重点拆：

- Memory Store 到底存什么
- Vector Database（向量数据库）为什么不是 Memory
- Retrieval（检索）为什么需要 Ranking（排序）
- Memory 如何进入 Context Builder
- ChatGPT / Claude Code 这类产品大概是什么 Memory 架构

---

## 用户

那你把固定的章节补充下 我好根据这个 part 的学习去生成学习笔记

## 说明：误解段落已省略

ChatGPT 随后误把“补充固定章节”理解成“生成完整学习笔记”，输出了一段完整笔记框架。该段内容未进入正式学习笔记。

## 用户

我的意思是不是让你去升成学习笔记，是让你把固定章节补充上，你忘记了吗

## ChatGPT

你说得对，是我理解偏了。

你不是让我生成 Day06 Part A 学习笔记内容，而是按照之前 Day05 每个 Part 学完后的固定收尾格式，补充：

> 本 Part 学完后，笔记里应该固定保留哪些章节。

方便你后续自己整理学习笔记。

## Day06 Part A：Memory 基础模型固定章节

### 1. 本 Part 核心知识点（Core Concepts）

记录：

- Memory（记忆系统）的定义
- 为什么 Agent 需要 Memory
- Stateless Agent（无状态 Agent） vs Stateful Agent（有状态 Agent）
- Conversation（对话历史） vs Memory（长期记忆）
- Memory 分类
- Profile Memory（用户画像记忆）
- Preference Memory（偏好记忆）
- Episodic Memory（事件记忆）
- Semantic Memory（语义记忆）
- Memory Extractor（记忆提取器）
- Memory ≠ Vector Database（向量数据库）
- Memory 与 Runtime State（运行时状态）的区别
- Memory 与 Context Builder（上下文构建器）的关系

### 2. 写书 TODO（Book TODO）

记录未来写 Agent Runtime 章节时需要整理：

- Memory 为什么是 Agent Runtime 核心能力
- LLM 本身没有持续记忆能力
- Runtime 通过 Memory 扩展 Agent 的长期能力
- Memory 是 Context Builder 的输入源
- Memory System Architecture（记忆系统架构）

未来形成：

```text
Conversation
    |
    v
Memory Extractor
    |
    v
Memory Store
    |
    v
Retrieval
    |
    v
Context Builder
    |
    v
LLM
```

### 3. 写书素材（Book Materials）

记录有价值的案例。

案例 1：Conversation ≠ Memory。

用户：

> 我今天吃火锅。

Conversation 保存：User said hotpot today。

Memory 不保存。

用户：

> 我以后希望回答问题多解释原理。

Memory 保存：User prefers detailed explanations。

案例 2：Memory 类似人类记忆。

| 人类 | Agent |
| --- | --- |
| 经历 | Conversation |
| 筛选 | Memory Extractor |
| 长期记忆 | Memory |
| 回忆 | Retrieval |
| 遗忘 | Forget Policy |

### 4. 本 Part 核心认知升级

记录从：

```text
Agent = LLM + Tools
```

升级到：

```text
Agent = LLM + Runtime + Tools + Memory
```

新增认知：

> Memory 不是存储历史，而是帮助 Agent 保存未来决策有价值的信息。

### 5. 工业级实现（Industrial Notes）

记录工业设计：

Memory 不是数据库表。

错误：

```text
Memory = MySQL Table
```

工业：

```text
Memory System
├── Extraction（提取）
├── Classification（分类）
├── Storage（存储）
├── Retrieval（检索）
├── Ranking（排序）
├── Injection（注入）
└── Forget Policy（遗忘策略）
```

Memory Extractor 工业实现：

```text
LLM Based:
Conversation
      |
      v
LLM Extractor
      |
      v
Memory
```

```text
Hybrid:
Conversation
  |
  v
Rule Filter
  |
  v
LLM Extractor
  |
  v
Memory Store
```

### 6. 知识地图（Knowledge Map）

记录：

```text
Agent Runtime
        |
        |
 Context Builder
        |
        |
 Memory System
        |
        |
 +----------------+
 |                |
Extractor      Retrieval
 |                |
Memory Store  Ranking
```

关联：

- Day04 Context Builder
- Day05 Tool System
- Day07 Streaming
- Day08 Human Approval
- Day09 Workflow

### 7. 面试视角（Interview Perspective）

Q1：Memory 和 Conversation 有什么区别？

核心回答：

> Conversation 是完整历史事件，Memory 是从历史中提取出的长期有效信息。

Q2：Memory 是不是 Vector Database？

核心回答：

> Vector Database 只是 Memory Store 的一种实现，完整 Memory System 还包含 Extractor、Retrieval、Ranking、Lifecycle Management。

Q3：为什么需要 Memory Extractor？

核心回答：

> 因为不是所有历史信息都有长期价值，需要通过规则或者 LLM 判断哪些信息应该被保存。

### 8. 本章思考题（Thinking Questions）

记录：

- 为什么不能直接保存所有 Conversation？
- Memory Extractor 是否一定需要 LLM？
- Memory Conflict（记忆冲突）如何处理？
- Memory Retrieval 是否每次请求都执行？
- Runtime State 和 Memory 是否可以统一设计？

### 9. 前置问题回收（Pending Questions）

本 Part 回答：

- Conversation 和 Memory 的区别
- 为什么 Memory 需要分类
- 为什么 Memory 需要 Extractor
- Memory 为什么不是 Vector Database

待后续回答：

- Memory Store 如何设计？
- Embedding（向量表示）是什么？
- Retrieval 如何实现？
- Ranking 为什么必要？
- Memory 如何控制 Token Budget（上下文预算）？

### 10. 下一节学习计划

Day06 Part B：Memory Architecture（记忆系统架构）

重点：

- Memory Store（记忆存储）
- Embedding（向量表示）
- Vector Database（向量数据库）
- Retrieval（检索）
- Similarity Search（相似度搜索）
- Ranking（排序）
- Hybrid Retrieval（混合检索）
- Memory 如何进入 Context Builder

