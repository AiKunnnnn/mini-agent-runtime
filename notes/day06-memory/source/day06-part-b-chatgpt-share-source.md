# Day06 Part B ChatGPT 分享会话源记录

- 分享链接：https://chatgpt.com/share/6a7c3d2e-4e7c-83e8-b464-8d0ee828b2df
- 会话标题：Day06 Part A B 记忆系统
- 提取日期：2026-08-12
- 整理说明：原分享页 linear_conversation 共有 68 个节点；已过滤工具调用占位与 redacted 插件输出，保留用户与 ChatGPT 的有效学习对话，共 20 个消息块。

---

## 用户

这是 day06 part a 的学习笔记以及 day06 的 readme，你看一下，然后我们进入 part B

## ChatGPT

我看完了。Day06 的路线没有跑偏，而且 **Part A → Part B 的衔接非常自然**。

Part A 已经把最重要的认知立住了：**Memory 不是聊天记录，也不是 Vector DB，而是 Runtime 的长期 State；真正的 Memory System 是从提取一直到 Retrieval / Ranking / Injection 的完整子系统。** fileciteturn0file0L17-L44

而 Day06 的 README 明确把 Part B 定位为 **Memory Architecture**，开始从“Memory 是什么”进入“Memory System 怎么设计”。 fileciteturn0file1L29-L35

---

# Day06 Part B：Memory Architecture

这一 Part 我建议我们重点解决一个问题：

> **一条 Memory 从被保存，到未来被 Agent 使用，中间到底经过哪些工程组件？**

Part A 你已经知道：

```text
Conversation
    ↓
Memory Extractor
    ↓
Memory Store
    ↓
Retrieval
    ↓
Ranking
    ↓
Context Builder
    ↓
LLM
```

Part B 我们要把中间这几个名字真正“拆开”。

尤其是：

```text
Memory Store
Embedding
Vector DB
Retriever
Ranker
Context Injection
```

这些概念很容易被初学者全部混成一句：

> “存到向量数据库，然后搜索出来塞 Prompt。”

**工业级 Memory 远远不是这么简单。**

---

# Part B-1：先建立 Memory Architecture 全景

我们先把整个架构画出来：

```text
                         Agent Runtime
                              │
             ┌────────────────┴────────────────┐
             │                                 │
        Current Task                       Memory System
             │                                 │
       Runtime State                          │
             │                                 │
             │                    ┌────────────┴────────────┐
             │                    │                         │
             │              Write Path                 Read Path
             │                    │                         │
             │                    ▼                         ▼
             │             Memory Extractor            Retriever
             │                    │                         │
             │                    ▼                         ▼
             │             Classification               Candidate
             │                    │                    Memories
             │                    ▼                         │
             │             Dedup / Merge                   ▼
             │                    │                       Ranker
             │                    ▼                         │
             │              Memory Store                   ▼
             │                    │                  Context Builder
             │                    │                         │
             └────────────────────┴─────────────────────────┘
                                                          │
                                                          ▼
                                                         LLM
```

这里有一个非常重要的认知：

## Memory System 实际上有两条链

### 写入链 Write Path

```text
Conversation / Observation
        ↓
Privacy Filter
        ↓
Memory Extractor
        ↓
Classification
        ↓
Deduplication
        ↓
Create / Update / Merge / Forget
        ↓
Memory Store
```

解决的是：

> **“什么东西应该被记住？”**

---

### 读取链 Read Path

```text
User Query
    ↓
Retrieval
    ↓
Candidate Memories
    ↓
Ranking
    ↓
Context Budget
    ↓
Context Builder
    ↓
LLM
```

解决的是：

> **“当前这个任务应该想起什么？”**

这其实就是 Part B 最核心的两个方向：

> **Memory Write ≠ Memory Read**

很多所谓 Memory 实现，其实只实现了 Write 或者只实现了一个简单的 Read。

---

# Part B-2：Memory Store 到底是什么？

先看一个最容易产生误解的问题。

Part A 已经明确：

> Vector Database 只是 Memory Store 的一种实现。 fileciteturn0file0L733-L777

所以：

```text
Memory Store
≠
Vector Database
```

Memory Store 更像一个**逻辑抽象**。

例如我们可以设计：

```ts
interface MemoryStore {
  create(memory: Memory): Promise<void>

  update(
    id: string,
    patch: Partial<Memory>
  ): Promise<void>

  delete(id: string): Promise<void>

  get(id: string): Promise<Memory | null>
}
```

注意这里完全没有出现：

```text
Vector
Embedding
Cosine Similarity
```

因为：

> **MemoryStore 关心的是“长期记忆如何持久化”，而不是“底层数据库怎么实现”。**

这跟 Day05 的 ToolRegistry 很像。

你不会说：

```text
ToolRegistry = Map<string, Tool>
```

虽然最简单的实现可能真的就是 Map。

同理：

```text
MemoryStore
```

底层可以是：

```text
MySQL
PostgreSQL
MongoDB
Redis
Vector DB
File
```

甚至可以：

```text
PostgreSQL + pgvector
```

一起使用。

---

# Part B-3：那为什么 Memory 又经常和 Vector DB 绑定？

因为 Memory 有一个特殊问题：

> **我不知道用户下一次会用什么关键词表达过去的事情。**

例如 Memory：

```text
User prefers TypeScript.
```

用户未来可能问：

> “帮我写个前端项目。”

这里根本没有：

```text
TypeScript
```

这个关键词。

如果纯关键词搜索：

```text
query = "帮我写个前端项目"

        ↓

搜索 "TypeScript"

        ↓

找不到
```

但语义上：

```text
前端项目
   ↓
编程语言选择
   ↓
TypeScript preference
```

是相关的。

所以需要：

> **Semantic Retrieval（语义检索）**

这时候 Embedding 就出现了。

---

# Part B-4：Embedding 到底干什么？

Embedding 可以先简单理解成：

> **把文本转换成一个能够表达语义关系的向量。**

例如：

```text
"User prefers TypeScript"
```

经过 Embedding：

```text
[0.12, -0.38, 0.71, ...]
```

另一句话：

```text
"User likes using TS"
```

可能变成：

```text
[0.15, -0.36, 0.69, ...]
```

两个向量距离比较近。

所以：

```text
User prefers TypeScript
        ↕
User likes using TS
```

系统能够判断：

> 这两条 Memory 语义上非常相似。

这就是 Part A 提到的：

> Embedding + Similarity 可以帮助 Memory 去重、相似判断、更新和合并。 fileciteturn0file0L353-L420

---

# Part B-5：Vector DB 到底负责什么？

现在就比较清楚了。

```text
Embedding
   ↓
Vector
   ↓
Vector Database
   ↓
Similarity Search
```

Vector DB 主要解决：

> **“给我找出和这个 Query 语义最接近的 Memory。”**

比如：

```text
Memory 1:
User prefers TypeScript.

Memory 2:
User likes React.

Memory 3:
User works with Next.js.

Memory 4:
User prefers concise answers.

Memory 5:
User likes hotpot.
```

用户：

> “帮我设计一个 React + Next.js 项目。”

经过 embedding：

```text
Query Vector
     ↓
Vector Search
     ↓
Memory 2
Memory 3
Memory 1
```

然后再交给 Ranker。

所以：

```text
Vector DB
```

只是：

> **Candidate Retrieval 基础设施**

它并不负责决定：

> “这些 Memory 最终是不是应该进入 Prompt。”

这个区别非常重要。

---

# Part B-6：为什么 Retrieval 后还需要 Ranking？

这是 Part B 最值得理解的地方之一。

假设我们检索出来：

```text
Top 10 Memories
```

并不代表：

```text
Top 10 Memories
=
应该全部给 LLM
```

例如：

```text
Query:
帮我设计一个 React 项目
```

Retriever 找到：

```text
M1 User uses React
M2 User uses TypeScript
M3 User uses Next.js
M4 User prefers detailed explanations
M5 User lives in Tokyo
M6 User likes hotpot
M7 User once used Vue
M8 User worked on e-commerce
M9 User likes dark mode
M10 User studied Go
```

这些都可能存在某种语义相关性。

但真正有价值的可能是：

```text
M1
M2
M3
M4
M8
```

于是：

```text
Retriever
```

解决：

> **Recall：先尽可能找出来**

而：

```text
Ranker
```

解决：

> **Precision：再判断哪些最值得使用**

可以把它记成：

```text
Retriever = 找得多
Ranker    = 排得准
```

这和搜索引擎、RAG 系统里的思想其实是一致的。

---

# Part B-7：所以 Memory Retrieval 不是简单 Vector Search

工业系统很可能是：

```text
                    Query
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
      Keyword      Semantic    Metadata
      Search       Search       Filter
          │           │           │
          └───────────┼───────────┘
                      ▼
                 Candidates
                      │
                      ▼
                   Ranker
                      │
                      ▼
                Top Memories
```

也就是说：

### Keyword Retrieval

找：

```text
TypeScript
React
Next.js
```

### Semantic Retrieval

找：

```text
“我喜欢 TS”
```

和：

```text
“我主要使用 TypeScript”
```

### Metadata Filter

例如：

```text
user_id = 123

memory_type = preference

confidence > 0.8

not_expired = true
```

最后：

```text
Candidates
    ↓
Ranking
    ↓
Top-K
```

这时候你应该已经能感觉到：

> **Memory Retrieval 本质上已经开始接近一个小型搜索系统。**

---

# Part B-8：Memory Architecture 最终模型

所以这一 Part 我们最终会逐步得到：

```text
                         Memory System
                              │
          ┌───────────────────┴───────────────────┐
          │                                       │
       Write Path                              Read Path
          │                                       │
          ▼                                       ▼
    Memory Extractor                           Query
          │                                       │
          ▼                                       ▼
    Classification                           Retrieval
          │                                       │
          ▼                                ┌──────┼──────┐
    Dedup / Merge                           │      │      │
          │                              Keyword Semantic Metadata
          ▼                                │      │      │
    Memory Store                           └──────┼──────┘
          │                                       │
          │                                       ▼
          │                                    Ranker
          │                                       │
          └───────────────────────┐               ▼
                                  │         Context Budget
                                  │               │
                                  └──────────────►▼
                                           Context Builder
                                                  │
                                                  ▼
                                                 LLM
```

这个模型实际上把 Part A 的一句话真正展开了：

> Memory 必须经过提取、分类、去重、更新、遗忘、检索和投影，才能真正进入 Agent Loop。 fileciteturn0file0L42-L44

---

# 一个特别重要的认知升级

到了这里，你可以把：

```text
Memory
```

理解成一个**长期知识系统**，而不是一个存储组件。

甚至可以类比 Day05：

```text
Day05 Tool System

Tool Schema
    ↓
Tool Registry
    ↓
Tool Executor
    ↓
Observation
    ↓
Runtime Loop


Day06 Memory System

Memory Extractor
    ↓
Memory Store
    ↓
Retriever
    ↓
Ranker
    ↓
Context Builder
    ↓
Runtime Loop
```

所以二者地位非常类似：

```text
Tool
→ 扩展 Agent 的 Action 能力

Memory
→ 扩展 Agent 的 Long-term Knowledge 能力
```

而 Runtime 是把两者组织起来的东西。

这也正好对应 Day06 README 的核心目标：不仅理解 Memory，还要理解它和 **Context Builder、RAG、企业长期记忆**之间的关系。 fileciteturn0file1L13-L27

---

## 接下来 Part B 的学习顺序

我们可以按照这个顺序继续，而不是一次把所有东西讲完：

```text
Part B-1
Memory Architecture 全景
        ↓
Part B-2
Memory Store
        ↓
Part B-3
Embedding
        ↓
Part B-4
Vector DB
        ↓
Part B-5
Retriever
        ↓
Part B-6
Ranker
        ↓
Part B-7
Hybrid Retrieval
        ↓
Part B-8
Memory → Context Builder
        ↓
Part B-9
Memory vs RAG
        ↓
Part B-10
ChatGPT / Claude Code / 企业 Agent 的架构映射
```

**我们现在正式进入 Part B。下一小节就从 `Memory Store` 开始。**

## 用户

继续学习

## ChatGPT

好，我们继续。上一节我们已经把 **Part B 的全景架构**立起来了，这一节先把最核心的一个组件彻底搞清楚：

# Day06 Part B-2：Memory Store

Part A 已经明确说了：

> **Vector Database 只是 Memory Store 的一种实现。** fileciteturn0file0L733-L777

所以我们今天先不要急着讲 Vector DB，而是先回答：

> **Memory Store 到底应该存什么？**

---

## 1. Memory Store ≠ “把文本丢进数据库”

假设用户说：

> “以后回答问题的时候，多给我解释原理。”

Extractor 得到：

```json
{
  "action": "create",
  "type": "preference",
  "content": "User prefers detailed explanations",
  "confidence": 0.92
}
```

那么 Memory Store 真正存的应该是一个 **Memory Entity**，而不是简单字符串：

```json
{
  "id": "mem_001",
  "userId": "user_123",

  "type": "preference",

  "content": "User prefers detailed explanations",

  "confidence": 0.92,

  "source": "conversation",

  "createdAt": "2026-08-12T10:00:00Z",
  "updatedAt": "2026-08-12T10:00:00Z"
}
```

注意这里已经出现几个重要字段：

```text
id
userId
type
content
confidence
source
createdAt
updatedAt
```

这些东西非常重要。

因为 Memory 不只是：

```text
content
```

而是：

> **带有身份、类型、可信度、来源和生命周期信息的长期 State。**

Part A 其实已经为这个方向铺垫了：Memory 需要 `confidence`、`source`、`updatedAt` 等质量信号，而且这些信号会影响保存、检索、覆盖和进入 Context。 fileciteturn0file0L660-L692

---

# 2. 为什么 Memory 必须有 type？

例如：

```text
User prefers TypeScript
```

和：

```text
User works at XX company
```

显然不是同一种东西。

可以简单分类：

```text
Memory
├── preference
├── profile
├── fact
├── goal
├── history
└── knowledge
```

例如：

```json
{
  "type": "preference",
  "content": "User prefers TypeScript"
}
```

或者：

```json
{
  "type": "profile",
  "content": "User is a frontend engineer"
}
```

或者：

```json
{
  "type": "goal",
  "content": "User wants to learn AI Agent Runtime"
}
```

这样做的意义是什么？

因为未来 Retrieval 的时候，你可以做：

```text
只找 preference
```

或者：

```text
只找 profile
```

甚至：

```text
preference + technical background
```

这就是为什么 Memory Store 不是单纯的文本仓库。

---

# 3. Memory Store 更像“长期 State Repository”

这一点和我们 Day04 学 Runtime State 时的感觉非常像。

Day04：

```text
Runtime State
```

保存：

```text
当前任务
当前 Step
Tool Result
Observation
Plan
```

Day06：

```text
Memory State
```

保存：

```text
长期偏好
用户画像
长期目标
重要历史
可复用知识
```

所以可以形成：

```text
                 Agent State
                     │
          ┌──────────┴──────────┐
          │                     │
   Runtime State           Memory State
          │                     │
     当前任务现场             长期状态
          │                     │
    Task Lifecycle          User Lifecycle
```

这也是 Part A 最重要的边界之一：Runtime State 面向当前任务生命周期，而 Memory 面向跨任务、跨会话的长期生命周期。 fileciteturn0file0L572-L601

---

# 4. 那 Memory Store 为什么不能直接用一个 Vector DB？

这是今天非常重要的一个问题。

假设我们只有：

```text
Vector DB
```

里面：

```text
embedding → text
```

看起来可以搜索。

但工业 Memory 会马上遇到问题。

---

### 问题一：Update

用户以前：

> 我主要使用 Vue。

后来：

> 我现在主要使用 React。

你不能简单：

```text
INSERT React
```

否则：

```text
Memory 1:
User uses Vue

Memory 2:
User uses React
```

以后 Retrieval 可能两个都找出来。

所以 Memory 需要：

```text
Update
```

甚至：

```text
Conflict Resolution
```

---

### 问题二：Forget

用户：

> 我已经不使用 Vue 了。

那么：

```text
User uses Vue
```

就可能应该：

```text
delete
```

或者：

```text
mark inactive
```

或者：

```text
降低 confidence
```

Part A 已经明确强调 Memory 不是只有 Create，而是至少需要：

```text
Create
Update
Merge
Forget
```

并且存在 Memory Decay。 fileciteturn0file0L473-L518

---

### 问题三：Metadata

Vector DB 可以保存 metadata，但：

> **“数据库支持 metadata” ≠ “Memory System 已经设计好 metadata”。**

例如：

```json
{
  "type": "preference",
  "confidence": 0.92,
  "source": "conversation",
  "createdAt": "...",
  "updatedAt": "...",
  "expiresAt": null
}
```

这些字段背后其实对应的是：

```text
Memory Governance
Memory Lifecycle
Memory Retrieval
Memory Ranking
Privacy
```

所以：

> Vector DB 是基础设施，Memory Store 是领域抽象。

---

# 5. 这和我们 Day05 ToolRegistry 很像

这个类比我建议你记住。

Day05：

```text
ToolRegistry
```

不是：

```text
Map<string, Tool>
```

虽然 Mini Runtime 里可以这么实现。

它是：

> **Tool 的领域抽象。**

同样：

```text
MemoryStore
```

也不是：

```text
VectorDB
```

它是：

> **Memory 的领域抽象。**

因此我们可以设计：

```ts
interface MemoryStore {
  create(memory: Memory): Promise<void>

  get(id: string): Promise<Memory | null>

  update(
    id: string,
    patch: Partial<Memory>
  ): Promise<void>

  delete(id: string): Promise<void>

  list(
    filter: MemoryFilter
  ): Promise<Memory[]>
}
```

未来底层可以换：

```text
MySQL
PostgreSQL
MongoDB
Redis
Vector DB
File
```

而 Runtime 不需要改变。

这就是典型的：

> **Domain Abstraction → Infrastructure Implementation**

这其实也是你前面一直感受到的那个东西：

**Agent Runtime 里面大量设计，本质上还是软件工程，只不过这些工程抽象被放到了 Agent 场景里。**

---

# 6. 但是这里马上出现一个问题

现在我们有：

```text
MemoryStore
```

可以保存：

```text
mem_001
mem_002
mem_003
...
mem_10000
```

那用户问：

> “帮我设计一个 React 项目。”

Runtime 难道：

```ts
memoryStore.list({
  userId: "user_123"
})
```

然后把 10000 条 Memory 全取出来？

当然不行。

这就是我们 Part B 接下来真正要解决的问题：

```text
Memory Store
       ↓
      ????
       ↓
Relevant Memories
```

这个 `????` 就是：

# Retrieval

也就是：

> **如何从大量长期 Memory 中找到“和当前任务最相关”的候选记忆？**

---

# 7. Retrieval 和 Store 是两个完全不同的问题

这一点一定要分清：

```text
Memory Store
```

回答：

> **我把 Memory 存在哪里、怎么持久化？**

而：

```text
Retriever
```

回答：

> **当前 Query 下，我应该找哪些 Memory？**

例如：

```text
Memory Store

M1 React
M2 TypeScript
M3 Next.js
M4 火锅
M5 Tokyo
M6 Vue
M7 Node.js
...
```

Query：

```text
帮我设计一个 Next.js 项目
```

Retriever：

```text
→ M3 Next.js
→ M2 TypeScript
→ M1 React
→ M7 Node.js
```

所以：

```text
Store = Persistence
Retriever = Recall
```

这两个概念不要混。

---

# 8. 这里就是 Embedding 出场的位置

假设 Memory：

```text
User prefers TypeScript.
```

Query：

```text
帮我设计一个前端项目。
```

关键词没有完全重合。

但是语义相关。

于是：

```text
Memory
   ↓
Embedding Model
   ↓
Vector
   ↓
Vector Index
```

Query 也一样：

```text
User Query
   ↓
Embedding Model
   ↓
Query Vector
```

然后：

```text
Query Vector
      ↓
Vector Similarity Search
      ↓
Candidate Memories
```

这时候你应该形成一个非常清晰的认知：

> **Embedding 不是 Memory。**

> **Vector DB 不是 Memory。**

> **Embedding 是把语义转换成向量表示的技术。**

> **Vector DB 是利用这些向量进行高效相似检索的基础设施。**

> **Memory System 才负责把这些能力组织起来。**

---

# 9. 但相似度最高 ≠ 最应该使用

这里就进入下一个关键组件：

```text
Ranker
```

例如 Retriever 返回：

```text
M1 User likes React
similarity = 0.92

M2 User prefers TypeScript
similarity = 0.89

M3 User works in Tokyo
similarity = 0.87

M4 User likes hotpot
similarity = 0.84
```

如果只按照 similarity：

```text
M1
M2
M3
M4
```

但当前任务其实只需要：

```text
M1
M2
```

所以最终可能采用：

```text
final_score =
    semantic_similarity
  + memory_type_weight
  + confidence
  + recency
  + task_relevance
```

这就是：

```text
Retriever
    ↓
Candidates
    ↓
Ranker
    ↓
Relevant Memories
```

---

# 10. 现在把整个 Read Path 串起来

我们目前已经可以把：

```text
用户请求
```

一路追踪下去了：

```text
User Query
    │
    ▼
Retriever
    │
    ├── Keyword Search
    ├── Semantic Search
    └── Metadata Filter
    │
    ▼
Candidate Memories
    │
    ▼
Ranker
    │
    ├── Similarity
    ├── Confidence
    ├── Recency
    ├── Type
    └── Task Relevance
    │
    ▼
Top-K Memories
    │
    ▼
Context Budget
    │
    ▼
Context Builder
    │
    ▼
LLM
```

这时候 Part A 中的：

```text
Memory
   ↓
Retrieval
   ↓
Ranking
   ↓
Context Builder
```

就不再是一串名词，而开始变成真正的 Runtime Architecture 了。Part A 明确要求 Memory 最终必须通过 Retrieval、Ranking 和 Context Builder 的预算管理后才能进入 LLM Context。 fileciteturn0file0L605-L655

---

# 11. 和 RAG 的关系先提前埋一个伏笔

你可能已经发现：

```text
RAG

Query
 ↓
Retriever
 ↓
Ranking
 ↓
Context
 ↓
LLM
```

和：

```text
Memory

Query
 ↓
Retriever
 ↓
Ranking
 ↓
Context
 ↓
LLM
```

**看起来几乎一样。**

没错。

这就是 Day06 后面必须专门讲：

> **Memory vs RAG**

的原因。

但现在先不要急着下结论：

```text
Memory = RAG
```

这会是错误的。

我们后面会看到：

```text
RAG
→ 外部知识获取

Memory
→ Agent 长期状态 / 个体化历史
```

二者底层 Retrieval 技术可以高度复用，但**语义和生命周期完全不同**。

---

# 🧠 今天这一小节最应该记住的 5 句话

如果只留下 5 句话：

### ① Memory Store 是领域抽象

```text
MemoryStore ≠ VectorDB
```

### ② Vector DB 是基础设施

```text
Vector DB
→ 帮 Memory 做高效语义检索
```

### ③ Embedding 是表示技术

```text
Text
↓
Embedding
↓
Vector
```

### ④ Retriever 和 Ranker 不一样

```text
Retriever → 找候选
Ranker    → 排优先级
```

### ⑤ Memory Architecture 本质上分 Write Path 和 Read Path

```text
Write:
Conversation
→ Extract
→ Store

Read:
Query
→ Retrieve
→ Rank
→ Context
→ LLM
```

---

## 🔗 和我们前面几天的知识连接起来

现在整个 Agent Runtime 已经开始变成：

```text
                         Agent Runtime
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     Runtime State        Tool System        Memory System
          │                   │                   │
      当前任务             能做什么             长期知道什么
          │                   │                   │
          │              Tool Calling        Memory Retrieval
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                       Context Builder
                              │
                              ▼
                             LLM
```

而且你会发现一个很漂亮的对称关系：

```text
Day05 Tool

LLM
 ↓
Tool Decision
 ↓
Tool Executor
 ↓
Observation
 ↓
LLM


Day06 Memory

Conversation
 ↓
Memory Extractor
 ↓
Memory Store
 ↓
Retriever
 ↓
Ranker
 ↓
Context Builder
 ↓
LLM
```

**Tool 是向 Runtime 外部世界扩展 Action；Memory 是向过去扩展 Knowledge。**

这就是 Part B 到这里最重要的认知升级。

下一段我们就继续进入 **Embedding → Vector Search → Vector DB**，把“为什么向量检索能找到语义相关 Memory”彻底讲明白。

## 用户

继续学习

## ChatGPT

继续。我们接着 **Day06 Part B：Memory Architecture**，这一段进入最容易被“向量数据库”带偏的地方：

# Part B-3：Embedding → Vector Search → Vector DB

Part A 已经明确指出：

> Embedding + Similarity 主要用于 Memory 的去重、相似判断、更新和合并；Vector Database 只是 Memory Store 的一种实现。 fileciteturn0file1L64-L73

这一节我们把这几个概念彻底拆开。

---

## 1. 为什么 Memory 需要“语义检索”？

先假设 Memory 里有：

```text
M1: User prefers TypeScript
M2: User prefers React
M3: User works with Next.js
M4: User likes hotpot
```

现在用户说：

> 帮我设计一个前端项目。

如果使用传统关键词匹配：

```text
Query:
"帮我设计一个前端项目"

Memory:
"User prefers TypeScript"
```

两边没有明显相同的关键词。

但是人类会觉得：

```text
前端项目
   ↓
技术选型
   ↓
TypeScript
```

是有关系的。

所以 Memory Retrieval 需要一种能力：

> **不要只判断两个文本有没有相同单词，而要判断两个文本在语义上是否相关。**

这就是 Embedding 发挥作用的地方。

---

# 2. Embedding 到底是什么？

可以先把它理解成：

> **Embedding 是把一个对象转换成一个能够用于计算语义关系的向量表示。**

例如：

```text
"User prefers TypeScript"
```

经过 Embedding Model：

```text
[
  0.12,
 -0.38,
  0.71,
  0.24,
  ...
]
```

另一句话：

```text
"User likes using TS"
```

可能得到：

```text
[
  0.15,
 -0.36,
  0.69,
  0.27,
  ...
]
```

两个向量比较接近。

于是系统可以推断：

```text
User prefers TypeScript
        ≈
User likes using TS
```

---

# 3. 这里千万不要把“向量”理解成“文字的坐标”

初学时特别容易产生一个误解：

> Embedding 是不是把一句话拆成几个数字？

不是这么简单。

Embedding Model 学到的是：

```text
文本
 ↓
语义表示
 ↓
向量
```

所以它更重要的能力不是：

```text
文本 → 数字
```

而是：

```text
语义相近的文本
        ↓
通常得到空间中相近的向量
```

例如：

```text
"我喜欢 TypeScript"
"我更喜欢 TS"
"我的主要语言是 TypeScript"
```

这些文本字面上不同，但语义比较接近。

Embedding 的目标就是让这种语义关系能够被数学计算利用。

---

# 4. 那怎么判断两个向量“接近”？

这时候就出现：

> **Similarity**

最常见的概念之一就是 Cosine Similarity。

你现在不需要把数学公式背下来，只需要理解：

```text
两个向量方向越接近
        ↓
Similarity 越高
        ↓
语义越可能相关
```

于是：

```text
Query
"帮我设计一个 TS 项目"
```

可能和：

```text
M1
"User prefers TypeScript"
```

得到：

```text
similarity = 0.91
```

而：

```text
M2
"User likes hotpot"
```

可能：

```text
similarity = 0.08
```

于是：

```text
M1 > M2
```

---

# 5. 但这里又出现一个问题

假设 Memory 有：

```text
100 条
```

还好。

如果是：

```text
100 万条
```

你是不是可以：

```text
Query
 ↓
Embedding
 ↓
和 100 万个 Vector 一个个算 Similarity
 ↓
排序
```

理论上可以。

工程上当然不行。

这时候就需要：

# Vector Index / Vector Database

它解决的问题不是：

> “什么是 Memory？”

也不是：

> “什么是 Embedding？”

而是：

> **如何高效地从海量向量中找到最相似的 Top-K 向量。**

---

# 6. 所以三者的职责完全不同

这一组非常值得记：

```text
Embedding
    ↓
负责把语义转换成向量表示

Similarity
    ↓
负责判断两个向量有多相似

Vector DB / Vector Index
    ↓
负责高效搜索最相似的向量
```

可以类比：

```text
Embedding
≈ 把文档转换成“可比较的特征表示”

Similarity
≈ 判断两个特征有多接近

Vector DB
≈ 在大量特征中快速找到最接近的一批
```

所以千万不要说：

> “Vector DB 负责把文本变成向量。”

更准确的是：

```text
Embedding Model
→ 生成 Vector

Vector DB
→ 存储 / 索引 / 检索 Vector
```

---

# 7. Memory 写入时发生什么？

现在我们回到 Memory Architecture。

假设 Extractor 得到：

```json
{
  "type": "preference",
  "content": "User prefers TypeScript",
  "confidence": 0.92
}
```

写入 Memory 的时候可以变成：

```text
Memory
  │
  ├── structured metadata
  │
  │     type
  │     confidence
  │     userId
  │     createdAt
  │     updatedAt
  │
  └── semantic representation
        │
        ▼
     Embedding
        │
        ▼
      Vector
```

最终存储系统里可能同时存在：

```text
Memory Record
+
Embedding Vector
```

也就是说：

> **一条 Memory 通常既有“结构化信息”，也可能有“向量表示”。**

这也是为什么：

```text
Memory = Vector
```

是错误的。

---

# 8. 为什么还需要结构化字段？

假设用户问：

> “我现在的技术偏好是什么？”

如果只有：

```text
embedding
```

你很难直接回答。

因为 embedding 是用于计算语义关系的表示，并不是给业务逻辑直接读取的结构化数据。

真正的 Memory Record 仍然需要：

```json
{
  "id": "mem_001",
  "type": "preference",
  "content": "User prefers TypeScript",
  "confidence": 0.92
}
```

Embedding 则是：

```text
vector = [...]
```

于是：

```text
Memory Record
       +
Embedding
```

共同组成 Memory 的可检索表示。

---

# 9. Retrieval 实际上可能不是只有 Vector Search

这里开始进入工业实现。

假设：

```text
Query:
帮我设计 React + Next.js 项目
```

我们可以同时使用：

### Semantic Search

```text
Query
 ↓
Embedding
 ↓
Vector Search
```

找到：

```text
User uses React
User uses Next.js
User prefers TypeScript
```

---

### Keyword Search

例如 Query 中明确出现：

```text
Next.js
```

那么关键词搜索可以非常准确地找到：

```text
User has experience with Next.js
```

---

### Metadata Filter

比如：

```text
userId = user_123
type = preference
confidence > 0.8
```

这样可以先排除：

```text
其他用户的 Memory
```

或者：

```text
低置信度 Memory
```

---

# 10. 所以工业 Retrieval 很可能是 Hybrid Retrieval

也就是：

```text
                     Query
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Keyword      Semantic     Metadata
       Search        Search       Filter
          │            │            │
          └────────────┼────────────┘
                       ▼
                  Candidates
                       │
                       ▼
                    Ranker
                       │
                       ▼
                  Top-K Memory
```

这其实是非常重要的一个认知升级：

> **工业 Memory Retrieval 并不等于“Vector DB Search”。**

Vector Search 只是其中一种 Retrieval Strategy。

---

# 11. 那为什么还需要 Ranker？

假设：

```text
Semantic Search
```

返回：

```text
M1 similarity = 0.95
M2 similarity = 0.93
M3 similarity = 0.91
M4 similarity = 0.90
M5 similarity = 0.89
```

是不是直接：

```text
M1
M2
M3
```

就可以了？

不一定。

因为 Memory 的最终价值不仅仅由语义相似度决定。

例如：

```text
M1:
User once used React in 2023.
confidence = 0.55

M2:
User currently prefers React.
confidence = 0.95
```

Query：

> 帮我设计一个 React 项目。

即使：

```text
similarity(M1) > similarity(M2)
```

M2 可能仍然更加有价值。

所以 Ranker 可以综合：

```text
semantic similarity
+
confidence
+
recency
+
memory type
+
task relevance
```

最终：

```text
Final Score
```

---

# 12. 这时候 Retriever 和 Ranker 的区别就非常清晰了

可以用搜索引擎的思路理解。

### Retriever

目标：

> **不要漏掉可能有价值的 Memory。**

所以偏向：

```text
Recall
```

例如找：

```text
Top 100 Candidates
```

---

### Ranker

目标：

> **从候选里面挑出真正最值得给 LLM 的 Memory。**

所以偏向：

```text
Precision
```

例如：

```text
100 Candidates
      ↓
Ranker
      ↓
Top 5
```

所以：

```text
Retriever = Recall
Ranker    = Precision
```

这句话在面试里非常好用。

---

# 13. 最后还有一个非常重要的环节：Context Budget

假设 Ranker 最后得到：

```text
Top 50 Memories
```

也不能全部塞给 LLM。

因为 Part A 已经明确提出：

> Memory 本身也需要 Context Budget。 fileciteturn0file0L605-L655

所以：

```text
50 Memories
    ↓
Context Budget
    ↓
Top 5 / Top 10
    ↓
Context Builder
    ↓
LLM
```

最终形成完整 Read Path：

```text
User Query
    ↓
Query Embedding
    ↓
Hybrid Retrieval
    ↓
Candidate Memories
    ↓
Ranker
    ↓
Context Budget
    ↓
Context Builder
    ↓
LLM
```

---

# 14. 到这里，你应该能看懂“Vector DB 不是 Memory”到底是什么意思了

我们把一条链完整拆开：

```text
                         Memory System

Write Path
─────────────────────────────────────────────

Conversation
     ↓
Memory Extractor
     ↓
Memory Record
     ↓
Embedding Model
     ↓
Vector
     ↓
Memory Store
     │
     ├── Structured Data
     └── Vector Index


Read Path
─────────────────────────────────────────────

User Query
     ↓
Embedding Model
     ↓
Query Vector
     ↓
Retriever
     │
     ├── Vector Search
     ├── Keyword Search
     └── Metadata Filter
     ↓
Candidates
     ↓
Ranker
     ↓
Context Budget
     ↓
Context Builder
     ↓
LLM
```

这就是我们目前 Part B 的核心架构。

---

# 🧠 一个特别值得你注意的点

你前面学习 Day05 的时候有一个很重要的认知：

> **Tool 是 Runtime 对外部能力的抽象，而不是 API 本身。**

现在 Day06 完全可以建立一个对应认知：

> **Memory 是 Runtime 对长期信息的抽象，而不是数据库本身。**

所以：

```text
Tool
├── Schema
├── Registry
├── Executor
└── Observation


Memory
├── Extractor
├── Store
├── Retriever
├── Ranker
└── Lifecycle
```

而：

```text
MySQL
Redis
Vector DB
Embedding Model
```

这些都属于 **Infrastructure**。

这其实又一次印证了你之前说的那句话：

> **Agent 的很多工程设计，本质上仍然是软件工程，只是把传统的软件工程抽象应用到了 Agent Runtime。**

---

## 下一步

下一小节我们继续解决一个特别关键的问题：

> **既然 Retriever 已经找到了相关 Memory，为什么还需要 Ranker？Ranker 到底应该怎么设计？**

然后我们会进一步进入：

```text
Retriever
    ↓
Ranker
    ↓
Hybrid Retrieval
```

这部分会开始真正接触 **RAG / 搜索系统 / Agent Memory** 三者之间的工程关系。

## 用户

继续学习

## ChatGPT

继续。我们进入 **Day06 Part B-4：Retriever → Ranker → Hybrid Retrieval**。

这一段其实是 Part B 的核心。前面我们已经知道：

```text
Memory Store
    ↓
Retriever
    ↓
Ranker
    ↓
Context Builder
    ↓
LLM
```

但现在要真正回答：

> **Retriever 找出来之后，为什么不能直接给 LLM？Ranker 到底在判断什么？**

---

# 一、先把 Retriever 和 Ranker 的职责彻底分开

上一节我们已经建立了一个非常重要的区分：

```text
Retriever = Recall
Ranker    = Precision
```

但这句话还不够。

更准确地说：

### Retriever

负责：

> **从整个 Memory 空间里，尽可能找出“可能相关”的候选集合。**

例如：

```text
Memory Store
    ↓
100,000 条 Memory
    ↓
Retriever
    ↓
100 条 Candidate Memories
```

它的目标是：

> **不要漏。**

---

### Ranker

负责：

> **从候选集合中，判断哪些 Memory 对当前任务真正有价值。**

```text
100 Candidates
      ↓
Ranker
      ↓
Top 5 Memories
```

它的目标是：

> **选得准。**

所以这两个阶段本质上是：

```text
             全部 Memory
                  │
                  ▼
             Retriever
          “哪些可能相关？”
                  │
                  ▼
             Candidates
                  │
                  ▼
               Ranker
          “哪些真的有用？”
                  │
                  ▼
             Final Memories
```

---

# 二、为什么 Semantic Similarity 不够？

这是理解 Ranker 的关键。

假设用户问：

> 帮我设计一个 React 项目。

Memory 中有：

```text
M1:
User prefers React.

M2:
User has used React in 2021.

M3:
User prefers TypeScript.

M4:
User lives in Tokyo.

M5:
User likes hotpot.
```

经过 Semantic Retrieval，可能得到：

```text
M1 similarity = 0.95
M2 similarity = 0.93
M3 similarity = 0.91
M4 similarity = 0.70
M5 similarity = 0.10
```

如果只看 similarity：

```text
M1
M2
M3
```

似乎没问题。

但是仔细看：

```text
M1:
当前偏好 React

M2:
2021 年使用过 React
```

**M1 和 M2 的语义相似度可能都很高，但对当前任务的价值明显不同。**

这就说明：

> **Similarity ≠ Relevance**

Similarity 只是：

> “两个文本在语义空间里有多接近。”

而 Ranker 要判断：

> “这个 Memory 对当前任务到底有没有用？”

这是两个不同的问题。

---

# 三、所以 Ranker 可以综合多个信号

Part A 已经明确提到了：

Memory 有：

- confidence
- source
- updatedAt

并且这些质量信号会影响：

- 是否参与检索
- 是否进入上下文
- 是否覆盖旧 Memory 等。 fileciteturn0file0L660-L692

因此 Ranker 可以综合：

```text
Final Score
    =
Semantic Similarity
    +
Confidence
    +
Recency
    +
Memory Type
    +
Task Relevance
```

注意：

**这里不是说一定存在一个固定公式。**

这是我们理解工业 Ranker 的一个抽象模型。

---

# 四、Confidence 为什么会影响 Ranking？

还是这个例子：

```text
M1:
User prefers React
confidence = 0.95

M2:
User might learn Vue
confidence = 0.45
```

当前任务：

> 帮我设计前端项目。

即使：

```text
M2 similarity = 0.91
M1 similarity = 0.89
```

也不能简单认为：

```text
M2 > M1
```

因为：

```text
M1
明确、稳定、高置信度

M2
只是“可能”
```

所以最终排名可以把：

```text
confidence
```

作为一个信号。

这也是为什么 Part A 强调：

> Memory 不是所有信息都具有同样可信度。 fileciteturn0file0L660-L676

---

# 五、Recency 为什么重要？

再看：

```text
M1:
User prefers Vue
updatedAt = 2023

M2:
User prefers React
updatedAt = 2026
```

当前用户问：

> 帮我设计一个前端项目。

如果两条 Memory 都很相关：

```text
M1 similarity = 0.90
M2 similarity = 0.91
```

显然：

```text
M2
```

更值得优先使用。

所以 Memory 不应该永远是：

```text
static facts
```

而应该是：

```text
dynamic long-term state
```

这和 Part A 中的 Memory Lifecycle、Update、Forget、Decay 是连起来的。 fileciteturn0file0L473-L518

---

# 六、这时候可以理解 Memory 的一个重要特性

Memory 并不是：

```text
事实集合
```

而更接近：

```text
带有状态和质量信号的长期知识集合
```

例如：

```json
{
  "content": "User prefers React",
  "confidence": 0.95,
  "updatedAt": "2026-08-10",
  "source": "conversation",
  "type": "preference"
}
```

所以 Ranking 实际上是在判断：

> **当前任务 + Memory 的多维关系**

而不是单纯：

> **Query + Memory 的向量距离**

---

# 七、那么 Retriever 到底应该怎么找？

到这里进入：

# Hybrid Retrieval

Part A 已经明确提到工业 Memory 会组合：

```text
Extraction
Classification
Deduplication
Storage
Retrieval
Ranking
Injection
Lifecycle Management
```

而 Retrieval 本身也不一定只有一种方式。 fileciteturn0file0L424-L468

一个典型架构：

```text
                         Query
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Keyword          Semantic          Metadata
      Retrieval        Retrieval          Filter
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                      Candidates
                           │
                           ▼
                         Ranker
                           │
                           ▼
                       Top-K
```

这就是：

> **Hybrid Retrieval**

---

# 八、Keyword Retrieval 解决什么问题？

假设用户说：

> “我之前那个 `ai-agent-runtime` 项目怎么样了？”

如果 Memory 中恰好有：

```text
User is building ai-agent-runtime.
```

那么：

```text
ai-agent-runtime
```

这个精确关键词非常有价值。

这时候 Keyword Search 往往非常有效。

它擅长：

```text
精确名称
ID
项目名
专有名词
技术名称
```

例如：

```text
ORD-12345
React
Next.js
ai-agent-runtime
```

这种东西，纯语义搜索未必一定是最优的。

---

# 九、Semantic Retrieval 又解决什么？

比如 Memory：

```text
User prefers detailed explanations.
```

用户现在说：

> “别只告诉我怎么做，原理也讲一下。”

关键词几乎不一样。

但语义高度一致。

这时候 Semantic Retrieval 更有优势：

```text
User prefers detailed explanations
              ↕
“原理也讲一下”
```

所以：

```text
Keyword Search
→ 精确匹配能力强

Semantic Search
→ 语义匹配能力强
```

二者组合起来，就比单独使用一种方式更加稳健。

---

# 十、Metadata Filter 更重要，因为它可以减少“错误候选”

假设 Memory Store 里有：

```text
user_001
user_002
user_003
...
```

当前用户是：

```text
user_001
```

那么首先就应该：

```text
userId = user_001
```

而不是：

```text
全库搜索
```

同样可以过滤：

```text
type = preference
confidence >= 0.8
deleted = false
expired = false
```

于是：

```text
100,000 Memories
        ↓
Metadata Filter
        ↓
10,000
        ↓
Semantic / Keyword Retrieval
        ↓
100 Candidates
        ↓
Ranker
        ↓
5 Final Memories
```

这其实也是典型的软件工程思想：

> **先利用确定性条件缩小搜索空间，再使用昂贵的语义判断。**

---

# 十一、所以一个工业 Retrieval Pipeline 可以长这样

```text
User Query
    │
    ▼
Query Analysis
    │
    ├── keywords
    ├── semantic intent
    ├── memory type
    └── metadata
    │
    ▼
Candidate Generation
    │
    ├── Keyword Search
    ├── Vector Search
    └── Metadata Filter
    │
    ▼
Candidate Set
    │
    ▼
Ranking
    │
    ├── Similarity
    ├── Confidence
    ├── Recency
    ├── Type
    └── Task Relevance
    │
    ▼
Top-K Memories
    │
    ▼
Context Budget
    │
    ▼
Context Builder
    │
    ▼
LLM
```

现在整个 Memory Read Path 已经比较完整了。

---

# 十二、这里出现一个特别重要的工程问题：Top-K

假设：

```text
Ranker
↓
Top 100
```

我们是不是把 100 条 Memory 都给 LLM？

通常不会。

因为：

```text
Memory
+
Conversation
+
Tools
+
System Prompt
+
User Input
```

全部都要争夺 Context Window。

所以最终还需要：

```text
Context Budget
```

例如：

```text
总 Context Budget = 20k tokens

System Prompt      3k
Conversation       8k
Tool Context       4k
Memory             3k
Reserved Output    2k
```

那么 Memory 只有：

```text
3k tokens
```

预算。

所以 Ranker 最终不仅仅是在做：

```text
相关性排序
```

还间接参与：

> **有限 Context Budget 下，哪些 Memory 最值得占用空间。**

这和 Day04 Context Builder 的学习直接连接起来了。

---

# 十三、现在把 Day04 和 Day06 串起来

Day04 我们学的是：

```text
Context Builder
```

它解决：

> **当前这一轮到底让 LLM 看到什么？**

现在 Day06：

```text
Memory Retrieval
```

解决：

> **从长期 Memory 中找什么？**

于是：

```text
Memory Store
     ↓
Retriever
     ↓
Ranker
     ↓
Context Builder
```

其中：

```text
Retriever
```

负责：

> 从“过去”寻找候选信息。

```text
Ranker
```

负责：

> 判断过去哪些信息对“现在”有价值。

```text
Context Builder
```

负责：

> 决定这些信息最终以什么形式进入 LLM Context。

这个链路非常漂亮：

```text
过去
 ↓
Memory
 ↓
Retrieval
 ↓
Ranking
 ↓
当前任务
 ↓
Context Builder
 ↓
LLM
```

---

# 十四、现在来看 Memory 和 RAG

到这里你应该已经发现：

```text
Memory Retrieval
```

和：

```text
RAG Retrieval
```

在技术上高度相似。

例如 RAG：

```text
User Query
    ↓
Embedding
    ↓
Vector Search
    ↓
Rank
    ↓
Relevant Documents
    ↓
Context
    ↓
LLM
```

Memory：

```text
User Query
    ↓
Embedding
    ↓
Vector Search
    ↓
Rank
    ↓
Relevant Memories
    ↓
Context
    ↓
LLM
```

**技术链路真的非常像。**

但是不能因此得出：

```text
Memory = RAG
```

---

# 十五、最核心的区别：它们“记住”的东西不同

### RAG

主要解决：

> **模型不知道的外部知识，从知识库里找出来。**

例如：

```text
公司内部文档
产品说明书
技术文档
法律文档
知识库
```

---

### Memory

主要解决：

> **Agent 过去与用户 / 任务交互中产生的长期状态。**

例如：

```text
用户偏好
用户背景
长期目标
历史决策
重要事件
长期任务状态
```

所以：

```text
RAG
→ External Knowledge

Memory
→ Long-term Agent State
```

这句话非常值得记住。

---

# 十六、一个特别好的例子

用户：

> “帮我设计一个 React 项目。”

RAG 找到：

```text
React 官方文档
Next.js 文档
公司前端规范
项目架构规范
```

这些是：

> **外部知识**

Memory 找到：

```text
User prefers TypeScript.
User has experience with Next.js.
User prefers detailed explanations.
User is working on an Agent Runtime project.
```

这些是：

> **关于这个用户 / Agent 长期状态的信息**

最终：

```text
             User Query
                  │
        ┌─────────┴─────────┐
        │                   │
       RAG                Memory
        │                   │
  External Knowledge   Personal State
        │                   │
        └─────────┬─────────┘
                  ▼
            Context Builder
                  │
                  ▼
                 LLM
```

这就是 Day06 后面一定会重点讨论的：

> **Memory 与 RAG 可以共享 Retrieval 基础设施，但不是同一个概念。**

---

# 十七、现在我们把整个 Part B 架构再看一次

```text
                         Agent Runtime
                              │
                              ▼
                        Context Builder
                         ▲          │
                         │          ▼
                    Memory       LLM
                         ▲
                         │
                      Ranker
                         ▲
                         │
                    Retriever
                  ▲      ▲      ▲
                  │      │      │
             Keyword  Semantic  Metadata
                  │      │      │
                  └──────┼──────┘
                         │
                    Memory Store
                         ▲
                         │
                  Memory Lifecycle
                         ▲
                         │
                  Memory Extractor
                         ▲
                         │
              Conversation / Observation
```

你现在应该能看到：

**Memory Architecture 本质上不是“数据库架构”。**

它是：

```text
Write
+
Persistence
+
Retrieval
+
Ranking
+
Context Integration
+
Lifecycle
```

组成的一个 **Runtime Subsystem**。

---

# 🧠 本阶段认知升级

前面你可能会把 Memory 理解成：

```text
Memory
 ↓
Vector DB
 ↓
Search
```

现在应该升级成：

```text
Memory System

Write Path:
Conversation
 ↓
Extraction
 ↓
Classification
 ↓
Dedup / Merge
 ↓
Store


Read Path:
Query
 ↓
Hybrid Retrieval
 ↓
Ranking
 ↓
Context Budget
 ↓
Context Builder
 ↓
LLM
```

这就是从：

> **“Memory 是数据库”**

升级到：

> **“Memory 是 Runtime 的一个完整子系统。”**

而且这和 Part A 的核心定位完全一致：Memory System 不只是 Store，而是包含 Extraction、Classification、Deduplication、Retrieval、Ranking、Injection 和 Lifecycle Management 的完整系统。 fileciteturn0file0L424-L468

---

下一节我们就可以进入 **Part B-5：Memory → Context Builder**。

这一节会把 Day04 和 Day06 真正接起来：

> **检索出来的 Memory 到底以什么格式进入 Context？为什么不能直接把 Memory JSON 塞进 Prompt？Context Builder 到底负责什么？**

这会是整个 Memory Architecture 里非常关键的一环。

## 用户

continue

## ChatGPT

好，我们继续 **Day06 Part B：Memory Architecture**。

前面我们已经把：

```text
Memory Store
Embedding
Vector Search
Retriever
Ranker
Hybrid Retrieval
```

串起来了。

现在进入一个非常关键的连接点：

# Part B-5：Memory → Context Builder

这一节实际上是在回答：

> **Retriever 找到 Memory 之后，为什么还不能直接扔给 LLM？**

---

## 1. 先回忆 Day04 的 Context Builder

Day04 我们建立过一个非常重要的模型：

```text
Runtime State
Conversation
Tools
Memory
...
   ↓
Context Builder
   ↓
LLM Context
```

Context Builder 并不是简单：

```text
所有数据
 ↓
JSON.stringify()
 ↓
Prompt
```

而是：

> **根据当前任务，从 Runtime 的各种 State / Data Source 中选择、组织、压缩和投影出这一轮 LLM 真正需要看到的 Context。**

现在 Memory 加进来以后，它只是：

```text
Context Builder 的一个输入源
```

而不是 Context 本身。

Part A 已经明确指出：

> Memory 不应该全部塞给 LLM，而要经过 Retrieval、Ranking 和 Context Builder 的预算管理。 fileciteturn0file0L605-L655

---

# 2. 为什么 Retriever 找到的 Memory 还不能直接给 LLM？

假设 Retriever 找到了：

```json
[
  {
    "id": "m1",
    "type": "preference",
    "content": "User prefers TypeScript",
    "confidence": 0.95
  },
  {
    "id": "m2",
    "type": "profile",
    "content": "User is a frontend engineer",
    "confidence": 0.92
  },
  {
    "id": "m3",
    "type": "history",
    "content": "User worked on an e-commerce project",
    "confidence": 0.87
  }
]
```

你当然可以直接：

```text
Prompt += JSON.stringify(memories)
```

但这其实是一个比较粗糙的实现。

为什么？

因为 **Memory Store 的数据结构是给 Runtime 管理的，不是专门给 LLM 阅读的。**

---

# 3. Memory Record 和 LLM Context 是两种不同的数据模型

这是今天最值得理解的一个点。

### Memory Record

主要服务于：

```text
Storage
Lifecycle
Retrieval
Ranking
Governance
```

所以可能包含：

```json
{
  "id": "mem_001",
  "userId": "user_123",
  "type": "preference",
  "content": "User prefers TypeScript",
  "confidence": 0.95,
  "source": "conversation",
  "createdAt": "...",
  "updatedAt": "...",
  "embedding": [...]
}
```

但 LLM 真正需要的可能只是：

```text
User preferences:
- Prefers TypeScript.
```

你会发现：

```text
Memory Record
       ↓
      投影
       ↓
LLM Context
```

这其实就是 Context Builder 的职责之一。

---

# 4. 所以 Memory Injection 本质上是一个 Projection

可以把它理解成：

```text
Memory Store
    ↓
Memory Records
    ↓
Retrieval
    ↓
Ranking
    ↓
Selected Memories
    ↓
Context Builder
    ↓
Memory Context
    ↓
LLM
```

这里的：

```text
Selected Memories
```

并不等于：

```text
LLM Context
```

中间还有一次：

> **Projection / Injection**

也就是：

> **把 Runtime 内部的 Memory State 转换成适合当前 LLM Context 的表示。**

这和 Day04 的 Context Builder 思想完全一致。

---

# 5. 为什么不能把所有 Memory 都 Injection？

Part A 已经给出了一个很直观的例子：

用户可能积累：

```text
10000 条 Memory
```

如果：

```text
All Memory
   ↓
Prompt
```

那么 Context 很快就爆炸。 fileciteturn0file0L605-L622

所以必须：

```text
10000 Memories
      ↓
Retrieval
      ↓
100 Candidates
      ↓
Ranking
      ↓
10 Selected
      ↓
Context Budget
      ↓
5 Memories
      ↓
LLM
```

这时候你会发现：

> **Context Builder 实际上是 Memory Retrieval 的最后一道闸门。**

---

# 6. Context Budget 到底在控制什么？

假设这一轮：

```text
Context Window = 32k tokens
```

Runtime 可能已经有：

```text
System Prompt       4k
Conversation         10k
Tool Context         5k
Current State        3k
```

那么：

```text
已经用了 22k
```

还剩：

```text
10k
```

但不能全部给 Memory。

因为还需要：

```text
Output Budget
Safety Margin
Future Tool Call Context
```

因此可能最终给 Memory：

```text
3k tokens
```

于是 Context Builder 需要决定：

```text
Memory A → 800 tokens
Memory B → 600 tokens
Memory C → 500 tokens
Memory D → 300 tokens
...
```

这就是为什么 Part A 专门强调：

> Memory 自己也需要 Context Budget。 fileciteturn0file0L605-L655

---

# 7. 这时候 Ranking 和 Context Budget 又形成了一层关系

我们之前说：

```text
Retriever
→ 找候选

Ranker
→ 排优先级
```

现在再加：

```text
Context Builder
→ 决定最终能放多少
```

于是：

```text
100,000 Memories
       ↓
Retriever
       ↓
100 Candidates
       ↓
Ranker
       ↓
20 High-value Memories
       ↓
Context Budget
       ↓
5 Memories
       ↓
LLM
```

所以：

> **Ranker 决定“谁更值得”，Context Builder 决定“谁最终有资格占用 Context”。**

这两个概念不要混。

---

# 8. Memory Injection 还需要考虑“什么时候注入”

这是另一个很重要的 Runtime 问题。

并不是：

```text
每一次请求
 ↓
把所有 Memory Retrieval
 ↓
塞进去
```

例如用户问：

> “你好。”

可能根本不需要复杂的 Memory。

但是：

> “继续帮我完善之前那个 Agent Runtime。”

这时候：

```text
Historical Task Memory
Project Preference
Technical Background
```

就非常重要。

所以可以有：

```text
Query
  ↓
判断是否需要 Memory
  ↓
需要
  ↓
Retrieval
```

或者：

```text
每次都 Retrieval
  ↓
但根据相关性 / Budget
决定是否 Injection
```

具体策略属于后续更深入的工业设计，这里先抓住核心：

> **Memory Retrieval 和 Memory Injection 不是同一个动作。**

---

# 9. 这其实和 Day04 的“Context 是 Snapshot”完全对应

Day04 我们有一个非常重要的理解：

```text
Runtime State
```

不是直接等于：

```text
LLM Context
```

而是：

```text
Runtime State
      ↓
Context Builder
      ↓
Context Snapshot
      ↓
LLM
```

现在 Memory 也是一样：

```text
Memory Store
      ↓
Retrieval
      ↓
Ranking
      ↓
Context Builder
      ↓
Memory Snapshot
      ↓
LLM
```

所以：

> **LLM 看到的永远不是完整 Memory，而是 Memory 在当前任务中的一个 Context Projection。**

这个认知非常重要。

---

# 10. 一个完整例子

假设 Memory Store 有：

```text
M1:
User prefers TypeScript

M2:
User prefers detailed explanations

M3:
User has experience with Next.js

M4:
User likes hotpot

M5:
User previously used Vue

M6:
User is learning Agent Runtime

M7:
User lives in Tokyo
```

当前任务：

> “继续教我 Day06 的 Memory Architecture。”

---

### Step 1：Retriever

可能找到：

```text
M1 TypeScript
M2 Detailed explanations
M3 Next.js
M6 Agent Runtime
```

---

### Step 2：Ranker

根据：

```text
semantic relevance
confidence
recency
type
task relevance
```

可能得到：

```text
M6
M2
M1
M3
```

---

### Step 3：Context Budget

假设只允许：

```text
1500 tokens
```

最终选择：

```text
M6
M2
M1
```

---

### Step 4：Context Builder

并不是直接：

```json
[
  {...},
  {...},
  {...}
]
```

而是投影成：

```text
Relevant user context:

- User is learning Agent Runtime.
- User prefers detailed explanations.
- User prefers TypeScript.
```

---

### Step 5：LLM

LLM 最终看到：

```text
System
+
Conversation
+
Current Runtime State
+
Relevant Memory
+
Tools
+
User Input
```

这就是：

> **Memory → Context Builder → LLM**

---

# 11. 这里又可以和 Tool System 对比

Day05：

```text
Tool Registry
      ↓
Tool Metadata
      ↓
Context Builder
      ↓
LLM
```

LLM 并不会看到：

```text
Tool Executor 内部实现
数据库连接
权限系统
HTTP Client
```

它看到的是：

```text
Tool Schema
```

同样：

Day06：

```text
Memory Store
      ↓
Memory Retrieval
      ↓
Context Builder
      ↓
LLM
```

LLM 不需要看到：

```text
Memory ID
embedding
数据库字段
createdAt
内部审计信息
```

它主要看到：

```text
Relevant Memory Content
```

所以：

> **Context Builder 是 Runtime 内部世界与 LLM 世界之间的 Projection Layer。**

这句话其实可以贯穿 Day04、Day05、Day06。

---

# 12. 到这里，Memory Architecture 已经形成闭环

现在我们可以把完整架构画出来：

```text
                    ┌─────────────────────┐
                    │    Conversation     │
                    │    Observation      │
                    │    Business Events  │
                    └──────────┬──────────┘
                               │
                               ▼
                       Memory Extractor
                               │
                               ▼
                       Classification
                               │
                               ▼
                        Dedup / Merge
                               │
                               ▼
                         Memory Store
                               │
                    ┌──────────┴──────────┐
                    │                     │
              Structured Data          Embedding
                    │                     │
                    │                     ▼
                    │                Vector Index
                    │                     │
                    └──────────┬──────────┘
                               │
                               ▼
                            Retrieval
                         ↙      ↓      ↘
                    Keyword  Semantic  Metadata
                         ↘      ↓      ↙
                               │
                               ▼
                             Ranker
                               │
                               ▼
                         Context Budget
                               │
                               ▼
                        Context Builder
                               │
                               ▼
                              LLM
```

这基本就是 Part B 的完整 Memory Architecture。

---

# 13. 现在回头看 Part A 的一句话

Part A 有一句非常重要的话：

> **Memory 保存的不是所有历史，而是未来可能影响 Agent 行为和决策的长期有效信息。** fileciteturn0file0L42-L44

现在这句话可以进一步展开：

```text
过去发生的事情
       ↓
Memory Extractor
       ↓
长期信息
       ↓
Memory Store
       ↓
当前任务
       ↓
Retriever
       ↓
Ranker
       ↓
Context Builder
       ↓
LLM
       ↓
影响当前决策
```

所以 Memory 的真正价值不是：

> **“我能存多少东西。”**

而是：

> **“我能不能在正确的时间，把正确的过去信息提供给当前决策。”**

这其实才是 Agent Memory 和传统数据库最大的思维差异之一。

---

# 14. 现在可以开始理解 ChatGPT / Claude Code 这一类系统

这里先只做**架构映射**，不展开产品内部未公开的实现细节。

一个通用的 Agent Memory / Context Architecture 可以抽象成：

```text
User / Project History
        ↓
Long-term Information
        ↓
Memory / Project Context
        ↓
Retrieval
        ↓
Ranking / Selection
        ↓
Context Builder
        ↓
LLM
```

而不同 Agent 产品真正拉开差距的地方之一，就是：

> **它们到底从过去提取了什么，以及当前任务到底选择了什么 Context。**

所以你之前一直关注的：

> “为什么 ChatGPT、Cursor、Claude Code 看起来都是 LLM，但表现差这么多？”

到了这里其实又能得到一个答案：

```text
LLM
+
不同的 Context Construction
+
不同的 Memory / Retrieval Strategy
+
不同的 Runtime
```

最终行为就会非常不同。

---

# 🧠 Part B 到这里的核心认知升级

我们已经从：

```text
Memory
=
Vector DB
```

升级成：

```text
Memory
=
Long-term State System
```

进一步升级成：

```text
Memory System
=
Write Path
+
Persistence
+
Retrieval
+
Ranking
+
Context Projection
+
Lifecycle
```

而最重要的 Read Path：

```text
Memory Store
      ↓
Retriever
      ↓
Ranker
      ↓
Context Budget
      ↓
Context Builder
      ↓
LLM
```

可以浓缩成一句面试话术：

> **Memory 不应该直接进入 LLM Context，而应该经过 Retrieval 找到候选记忆，再通过 Ranking 和 Context Budget 选择真正相关的信息，最后由 Context Builder 将 Memory Projection 到当前 LLM Context。**

---

## 下一节

接下来我们进入 **Part B-6：Memory vs RAG**。

这个非常值得单独讲，因为你现在已经把两者的技术链路都看到了：

```text
Memory:
Query → Retrieval → Ranking → Context → LLM

RAG:
Query → Retrieval → Ranking → Context → LLM
```

**技术上高度相似，但为什么概念上不能把 Memory 当成 RAG？**

我们下一节把：

```text
Memory
RAG
Knowledge Base
Vector DB
Context
```

这五个东西一次性彻底分清。

## 用户

继续学习

## ChatGPT

好，继续。不过这里我先纠正一下我们前面学习节奏上的一个点：

**Day06 README 的正式路线是 Part B → Part C → Part D。** Part B 是完整的 **Memory Architecture**，Part C 才是 **Memory Lifecycle**，Part D 才是 **Memory 与 Context Builder 集成**。fileciteturn2file0L23-L30

我们前面实际上已经把 Part B 的核心架构拆得比较充分了。接下来不应该提前把 Part C/D 的内容大量混进来。

所以现在把 **Part B 收尾**，重点把 **Memory / RAG / Knowledge Base / Vector DB / Context** 这几个概念彻底分清。

---

# Day06 Part B-6：Memory vs RAG

这是 Part B 非常关键的一节。

因为你现在已经知道：

```text
Memory

Query
 ↓
Retrieval
 ↓
Ranking
 ↓
Context Builder
 ↓
LLM
```

而 RAG：

```text
Query
 ↓
Retrieval
 ↓
Ranking
 ↓
Context
 ↓
LLM
```

你会自然产生一个问题：

> **那 Memory 不就是 RAG 吗？**

答案是：

> **不是。**

但是二者确实存在大量技术重叠。

---

# 1. 先给结论

我们先建立一个最简单的边界：

```text
RAG
→ 帮 Agent 找“外部知识”

Memory
→ 帮 Agent 找“过去值得长期记住的信息”
```

Day06 README 明确把：

> Memory 与 RAG 的区别

列为 Day06 必须掌握的核心问题。fileciteturn2file2L170-L184

而 Day06 Part A 已经把 Memory 定义得非常清楚：

> Memory 保存的不是所有历史，而是未来可能影响 Agent 行为和决策的长期有效信息。fileciteturn2file1L108-L110

所以两者最根本的区别，不是：

```text
Vector DB vs MySQL
```

而是：

> **它们解决的问题不同。**

---

# 2. RAG 是“知识获取”

假设你做一个企业客服 Agent。

企业有：

```text
产品手册
售后政策
退款规则
会员规则
内部知识库
```

这些东西原本就存在。

Agent 的问题是：

> **我现在不知道相关内容，去哪里找？**

于是：

```text
用户问题
   ↓
Retriever
   ↓
知识库
   ↓
相关文档
   ↓
LLM
```

这就是典型 RAG。

---

# 3. Memory 是“经验沉淀”

现在换一个场景。

用户跟 Agent 聊了很多次：

```text
第一次：
我叫小王。

第二次：
我是前端工程师。

第三次：
我主要使用 TypeScript。

第四次：
以后解释技术问题的时候，希望你多讲原理。
```

这些信息并不是一个外部知识库。

它们是：

> **Agent 与这个用户长期交互过程中沉淀出来的信息。**

于是：

```text
Conversation
   ↓
Memory Extraction
   ↓
Long-term Memory
   ↓
未来任务 Retrieval
   ↓
Context
```

这就是 Memory。

---

# 4. 一个非常重要的区别：谁是“知识的主人”？

这是我非常建议你记住的判断方法。

### RAG

知识的主人通常是：

```text
企业
项目
文档系统
知识库
外部数据源
```

例如：

```text
公司退款政策
React 官方文档
项目 API 文档
```

---

### Memory

知识的主人通常是：

```text
User
Agent
Session / Project
长期任务
```

例如：

```text
用户偏好
用户背景
用户长期目标
过去做过什么决定
Agent 过去积累的经验
```

所以可以简单记：

```text
RAG
= External Knowledge

Memory
= Persistent Agent/User State
```

---

# 5. 那 Knowledge Base 又是什么？

这也是非常容易混的。

可以把：

```text
Knowledge Base
```

理解成：

> **一个用于管理和提供知识的数据系统。**

例如：

```text
Knowledge Base
├── 产品文档
├── FAQ
├── 技术文档
├── SOP
└── 企业制度
```

然后它可以通过：

```text
Keyword Search
Semantic Search
Vector Search
Metadata Filter
```

提供 Retrieval。

所以：

```text
Knowledge Base
```

是一个更大的概念。

而：

```text
Vector DB
```

只是可能用于支撑它的一种基础设施。

---

# 6. Vector DB 又是什么？

现在把四层分开：

```text
Memory
Knowledge Base
Vector DB
LLM
```

它们根本不在一个抽象层。

例如：

```text
                    Application Domain
                           │
             ┌─────────────┴─────────────┐
             │                           │
          Memory                    Knowledge Base
             │                           │
             └─────────────┬─────────────┘
                           │
                      Retrieval
                           │
                  ┌────────┴────────┐
                  │                 │
             Keyword Search    Vector Search
                                    │
                                    ▼
                               Vector DB
```

所以：

> **Vector DB 是基础设施，不是业务概念。**

这和 Part A 的结论完全一致：

> Vector Database 只是 Memory Store 的一种实现，并不等于完整 Memory System。fileciteturn2file7L693-L704

---

# 7. 一个很典型的误区

很多人会说：

> “我们公司用了 Milvus，所以我们已经有 Memory 了。”

这是不成立的。

因为：

```text
Milvus
↓
Vector Storage / Retrieval
```

但是完整 Memory 还需要：

```text
Memory Extraction
Memory Classification
Deduplication
Update
Merge
Forget
Retrieval
Ranking
Context Injection
Privacy
Confidence
Lifecycle
```

Day06 Part A 已经明确把这些能力视为 Memory System 的组成部分。fileciteturn2file7L695-L704

所以：

```text
Vector DB
≠ Memory
```

同样：

```text
Vector DB
≠ RAG
```

它只是 RAG / Memory 都可能使用的基础设施。

---

# 8. 再看 Context

这个概念也必须独立出来。

Context 是：

> **当前这一轮 LLM 真正看到的输入上下文。**

它可以来自：

```text
Conversation
Summary
Memory
RAG
Tool Schema
Runtime State
MCP Context
System Prompt
```

这一点在我们之前的 Runtime 设计里已经明确：

```text
Raw Agent State
   │
   ├── Conversation
   ├── Summary
   ├── Memory
   ├── Tool Schema
   ├── MCP Context
   ├── Policy
   └── Runtime State
          ↓
   Context Compiler
          ↓
      LLM Context
```

fileciteturn1file5L639-L663

所以：

> **Memory 和 RAG 都是 Context 的输入源，而不是 Context 本身。**

这个关系非常重要。

---

# 9. 把五个概念放在一张图里

现在终于可以完整地看：

```text
                  Agent Runtime
                       │
                       ▼
                 Context Builder
                       ▲
              ┌────────┴────────┐
              │                 │
           Memory              RAG
              │                 │
        Long-term State    External Knowledge
              │                 │
              ▼                 ▼
         Memory Store      Knowledge Base
              │                 │
              └───────┬─────────┘
                      │
                  Retrieval
                      │
             ┌────────┴────────┐
             │                 │
       Keyword Search    Vector Search
                               │
                               ▼
                           Vector DB
```

这里有一个非常重要的层次关系：

```text
Memory / RAG
    ↓
Application / Domain Layer

Vector DB
    ↓
Infrastructure Layer
```

---

# 10. Memory 和 RAG 可以共用 Retriever

这也是为什么它们经常被混在一起。

例如：

```text
Query
 ↓
Embedding
 ↓
Vector Search
```

这个技术完全可以同时服务：

```text
Memory Retrieval
```

和：

```text
RAG Retrieval
```

甚至可以：

```text
                   Query
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Memory                  RAG
          │                     │
          ▼                     ▼
   User Preferences       Company Docs
   User Profile           Technical Docs
   Past Decisions         Product Docs
          │                     │
          └──────────┬──────────┘
                     ▼
              Context Builder
                     │
                     ▼
                    LLM
```

这时候 LLM 可以同时获得：

```text
“关于用户，我知道什么”
+
“关于世界，我知道什么”
```

这就是现代 Agent Context Engineering 中非常重要的组合。

---

# 11. 举个非常贴近你当前学习的例子

假设你问 Agent：

> “继续帮我实现 mini-agent-runtime 的 Memory。”

### Memory Retrieval

可能找到：

```text
User is building mini-agent-runtime.

User prefers understanding engineering principles.

User wants industrial Agent terminology mapping.

User has completed Tool Calling / Tool Runtime learning.
```

这些是：

```text
Memory
```

---

### RAG Retrieval

如果 Agent 接入你的技术文档库：

```text
day06 README
Memory Architecture 文档
Context Builder 文档
Agent Runtime 文档
```

那么检索出来的是：

```text
RAG
```

---

### 最终 Context

Context Builder 可能组装：

```text
System Prompt
+
Current Conversation
+
Relevant Memory
+
Relevant RAG Documents
+
Runtime State
+
Tool Schema
```

然后：

```text
                 Context Builder
                       │
                       ▼
                       LLM
```

所以你可以把它理解成：

> **Memory 告诉 Agent“这个用户/这个任务过去发生过什么、值得记住什么”。**

> **RAG 告诉 Agent“外部知识库里现在有什么相关知识”。**

---

# 12. 再进一步：Memory 甚至可以不使用 Vector DB

这一点非常重要。

因为 Memory 的抽象是：

```text
Memory Store
```

不是：

```text
Vector DB
```

所以完全可以：

```text
MemoryStore
   │
   ├── PostgreSQL
   ├── Redis
   ├── Document DB
   ├── Vector DB
   └── 混合存储
```

甚至对于一个非常小的 Mini Runtime：

```ts
class InMemoryStore {
  private memories: Memory[] = [];
}
```

就已经可以实现：

```text
Memory Create
Memory Update
Memory Retrieve
```

这也是我们后面的 **Part E：Mini Memory Runtime** 可以做的事情。

README 明确把 Part E 定义成 Mini Memory Runtime 实现。fileciteturn2file0L25-L30

---

# 13. 所以 Mini Runtime 不应该一开始就上 Vector DB

这点其实和我们 Day05 的学习方式是一致的。

Day05 我们没有一上来：

```text
Tool
 ↓
MCP
 ↓
复杂 Agent Framework
```

而是先自己实现：

```text
Tool Schema
Tool Registry
Tool Executor
Observation
Loop
```

Day06 也一样：

```text
Memory
 ↓
Memory Entity
 ↓
Memory Store
 ↓
Retriever
 ↓
Context Builder
```

第一版甚至可以：

```text
Array<Memory>
```

然后：

```text
for (...)
  calculate relevance
```

等抽象稳定之后，再把：

```text
MemoryStore
```

换成：

```text
Postgres
Vector DB
Hybrid Search
```

这样你才能真正理解：

> **Vector DB 是实现细节，而 Memory 是 Runtime 能力。**

---

# 14. 这和你之前说的“Agent 本质还是软件工程”又对应上了

你之前有一个非常准确的感受：

> Agent 中很多设计本质上还是软件工程设计在 Agent 的应用。

Day06 又是一个非常典型的例子。

传统软件：

```text
Repository
Service
Database
Search
Ranking
Cache
Context
```

Agent：

```text
MemoryStore
MemoryService
Vector DB
Retriever
Ranker
Context Builder
```

很多底层工程思想完全是共通的。

真正 Agent-specific 的地方在于：

```text
什么时候写 Memory
写什么
什么时候更新
什么时候忘记
什么时候检索
如何影响下一轮 LLM Decision
```

也就是：

> **LLM 参与了传统系统中很多“判断 / 提取 / 决策”的位置。**

---

# 15. Part B 到这里，你应该形成这张“抽象层级地图”

```text
┌──────────────────────────────────┐
│          Agent Runtime           │
│                                  │
│        Context Builder            │
│              ▲                   │
│       ┌──────┴──────┐            │
│       │             │            │
│    Memory          RAG           │
│       │             │            │
│   MemoryStore   KnowledgeBase    │
│       │             │            │
│       └──────┬──────┘            │
│              │                   │
│          Retrieval               │
│              │                   │
│       ┌──────┴──────┐            │
│       │             │            │
│   Keyword       Semantic         │
│                  Search          │
│                     │            │
│                  Vector DB       │
└──────────────────────────────────┘
```

然后一句话记忆：

> **Memory / RAG 是能力层，Store / Knowledge Base 是数据层，Retriever / Ranker 是检索层，Vector DB 是基础设施层，Context Builder 是进入 LLM 前的编译层。**

---

# 🧠 Part B 最终认知升级

我们把这一整个 Part 从头收一下。

最开始：

```text
Memory = 存东西
```

然后：

```text
Memory = Vector DB
```

再到：

```text
Memory = Retrieval + Ranking
```

最终应该升级成：

```text
Memory System
=
长期信息的
提取
+
分类
+
存储
+
检索
+
排序
+
生命周期管理
+
Context 投影
```

而整个 Read Path：

```text
Memory Store
      ↓
Retriever
      ↓
Ranker
      ↓
Context Budget
      ↓
Context Builder
      ↓
LLM
```

整个 Write Path：

```text
Conversation
Observation
Business Events
      ↓
Memory Extractor
      ↓
Classification
      ↓
Dedup / Merge
      ↓
Memory Store
```

Day06 README 对 Memory 的总定义正是：

> Runtime 从 Conversation、Observation 和业务事件中抽取长期有效信息，经过分类、去重、更新、遗忘、检索和排序，再由 Context Builder 投影给 LLM。fileciteturn2file2L158-L168

---

## 下一节：Day06 Part C

Part B 到这里基本完成。

下一节正式进入：

# **Day06 Part C：Memory Lifecycle**

核心问题会从：

> **“Memory 怎么架构？”**

转变成：

> **“一条 Memory 从出生到死亡，到底经历什么？”**

也就是：

```text
Create
  ↓
Update
  ↓
Merge
  ↓
Decay
  ↓
Forget
```

以及非常关键的：

```text
谁决定 Create？
谁决定 Update？
什么时候 Merge？
什么时候应该 Forget？
LLM 决定还是 Rule 决定？
```

这部分其实会把 Part A 中我们已经埋下的 **Create / Update / Merge / Forget / Confidence** 全部真正串起来。

## 用户

part B 好像学习结束了，这里提几个点：

1. 在 memory 中单条similarity 不是一成不变的话，会根据用户的prompt 检索出来后，比如用户喜欢 ts 语言可能在用户打算 Java 开发时候是 0.01，但是在用户前端项目是 0.9
2. 我理解以使用 ChatGPT 为例，在用户输入的一段 prompt 中，如何去拆分语句，再升成向量是很关键的，还是说完整的 prompt 组成一个向量
3. 比如企业知识库，如果自研的话，其实最关键的点在于：知识库 map 存储时候(key 为文档名 value 为文档链接 desc 为文档摘要)，这个 key desc 如何升成非常关键，以及根据用户的 prompt 去向量语义化匹配也是需要自研的，以及用户长期会话的 memory 存储与设计也是需要自研的，而这些关键点决定知识库好不好用还是说只是个 search，同时 top k中的权重设计这些也是需要自研的吧，而不是使用一个 LLM +通用 agent(比如 langchain.js)就都具备了。还是说知识库不需要具备 memory 呢，只需要具备向量检索，只需开发向量检索
4. 还有个点 memory 是如何更新的呢，比如用户以前倾向于前端项目使用vue，后来说他倾向 react，内部是怎么识别到这两条是同一个类型信息然后把 vue 替换成 react 的
5. Memory 与 RAG的区别是不是可以理解为 memory 是带有用户信息的 rag 呢，memory 的关键在于 user。而 rag 可以理解为是企业的知识库，user 只是检索发起者
6. 我现在有点感觉 memory 的设计更像是模仿人类的大脑了？

## ChatGPT

对，你这 6 个点其实已经从“学习 Memory 怎么实现”进入到 **Memory 为什么这样设计、企业到底应该自己做什么** 这个层面了。尤其第 3、4、5、6 点非常关键。

我逐个回答，而且我会顺便纠正其中几个容易形成误解的地方。

---

# 1. similarity 是不是会随着用户 Prompt 变化？

**完全正确。**

但这里有一个非常关键的概念：

> **Memory 本身的 embedding 不变，但 Query 与 Memory 之间的 similarity 会变化。**

比如 Memory：

```text
M1:
User prefers TypeScript.
```

它被写入 Memory 时：

```text
M1
 ↓
Embedding
 ↓
Vector_M1
```

这个 Vector 通常不会因为用户下一句话变了就重新生成。

---

现在用户：

> 我准备开发一个前端项目。

Query：

```text
Q1
 ↓
Embedding
 ↓
Vector_Q1
```

计算：

```text
similarity(Vector_Q1, Vector_M1)
= 0.90
```

---

用户换一个问题：

> 我准备写一个 Java 后端服务。

新的 Query：

```text
Q2
 ↓
Embedding
 ↓
Vector_Q2
```

于是：

```text
similarity(Vector_Q2, Vector_M1)
= 0.05
```

所以你的理解可以修正成：

```text
Memory Vector
    固定
      │
      │ similarity
      ▼
Query Vector
    每次变化
```

因此：

> **不是 Memory 的 similarity 在变化，而是 Query 不同，Query ↔ Memory 的相关性分数不同。**

这也是为什么：

```text
User prefers TypeScript
```

并不是：

> “永远应该进入 Context 的 Memory。”

它是：

> **当前任务相关时才应该进入 Context。**

这正是 Memory Retrieval 的核心。

---

# 2. 用户输入一段 Prompt，到底是“拆成多个向量”还是“整个 Prompt 一个向量”？

这个问题非常好。

答案是：

> **两种都可以，但最基础的 Semantic Retrieval 通常是“一个 Query → 一个 Embedding”。**

例如用户：

> “我现在准备做一个前端项目，技术栈想使用 React + TypeScript，你觉得目录结构应该怎么设计？”

最简单的 Retrieval：

```text
完整 Prompt
    ↓
Embedding Model
    ↓
一个 Query Vector
```

例如：

```text
Q = [
  0.12,
  -0.33,
  0.71,
  ...
]
```

然后：

```text
Q
 ↓
Vector Search
 ↓
Top K Memories
```

---

## 但是你问到的“拆分”确实非常重要

因为一个 Prompt 可能包含多个意图。

比如：

> “我喜欢 TypeScript，但是最近后端项目准备使用 Java，同时我希望你以后回答技术问题的时候多讲原理。”

实际上这里有三个不同的信息：

```text
M1
User prefers TypeScript.

M2
User is planning to use Java for backend projects.

M3
User prefers detailed technical explanations.
```

如果你把整个 Prompt：

```text
一句话
 ↓
一个 Vector
```

直接存进 Memory，就非常糟糕。

所以 Memory 的 **Write Path** 通常需要先：

```text
Conversation
    ↓
Memory Extraction
    ↓
识别多个 Memory Candidate
    ↓
分别结构化
    ↓
Embedding
```

也就是：

```text
Prompt
  │
  ├── Preference: TypeScript
  ├── Preference: Java for backend
  └── Preference: detailed explanation
```

然后每一条分别生成自己的 embedding。

所以：

> **Query Retrieval 阶段通常可以是“整个 Query → 一个向量”；Memory 写入阶段则更强调“从对话中提取出多个独立 Memory → 每条 Memory 独立向量化”。**

这是两个完全不同的问题。

---

# 3. 你对企业知识库的理解，已经非常接近真实情况了

你这里其实问了一个非常大的问题：

> **企业知识库到底是不是“LangChain + Vector DB + LLM”就完事？**

答案：

> **远远不是。**

但我稍微修正一下你的描述。

你说：

> key 为文档名，value 为文档链接，desc 为文档摘要，然后把 key、desc 做 embedding。

这是**可以做**，但工业知识库一般不会简单停留在：

```text
Map<
  documentName,
  {
    url,
    desc
  }
>
```

而是会形成：

```text
Document
   ↓
Parser
   ↓
Chunking
   ↓
Metadata
   ↓
Embedding
   ↓
Index
```

---

## 企业知识库真正难的地方在哪里？

不是：

```text
Vector DB
```

而是：

### ① 文档解析

例如：

```text
PDF
Word
Excel
PPT
网页
Markdown
代码
数据库
飞书文档
Confluence
```

怎么统一转换成：

```text
Document
```

---

### ② Chunking

这个非常重要。

例如一个 100 页的产品文档：

```text
100 pages
```

你不能：

```text
100 pages
 ↓
一个 embedding
```

一般要拆：

```text
Document
 ├── Chunk 1
 ├── Chunk 2
 ├── Chunk 3
 ├── ...
 └── Chunk N
```

而：

> **Chunk 怎么切，本身就是知识库效果的重要因素。**

---

### ③ Metadata

例如：

```json
{
  "documentId": "doc_001",
  "title": "退款政策",
  "department": "客服",
  "product": "电商",
  "version": "2026-08",
  "permission": "customer-service",
  "updatedAt": "2026-08-10"
}
```

这些信息非常重要。

因为企业知识库不是：

```text
所有人
 ↓
搜索所有文档
```

而是：

```text
User
 ↓
Permission Filter
 ↓
Relevant Knowledge
```

---

### ④ Embedding

你说的这个非常关键：

> **到底什么内容参与 embedding？**

例如：

```text
标题
+
正文
+
章节
+
摘要
+
Metadata
```

到底组合成什么？

这是一个真正需要工程实践的问题。

---

### ⑤ Retrieval

也不是简单：

```text
Query
 ↓
Vector Search
 ↓
Top 5
```

工业系统经常是：

```text
Keyword Search
+
Vector Search
+
Metadata Filter
+
Permission Filter
```

然后：

```text
Candidate Retrieval
       ↓
Rerank
       ↓
Top K
```

---

# 4. 所以你说的“Top K 权重设计也需要自研”，基本正确

例如：

```text
Vector Similarity = 0.75
Keyword Score     = 0.82
Recency           = 0.90
Authority         = 1.00
```

最终：

```text
Final Score
=
0.5 * Semantic
+
0.2 * Keyword
+
0.1 * Recency
+
0.2 * Authority
```

当然这只是示意。

工业系统甚至可能使用：

```text
Cross Encoder
Reranker
Learning-to-Rank
LLM Reranking
```

等等。

所以：

> **“Vector Search”只是 Retrieval 的一个组件，而不是知识库能力本身。**

---

# 5. 但是：知识库一定需要 Memory 吗？

这里答案是：

> **不一定。**

这是你第 3 个问题里面最值得单独拆出来的地方。

一个最简单的企业知识库完全可以：

```text
Documents
   ↓
Chunking
   ↓
Embedding
   ↓
Vector DB
   ↓
Retrieval
   ↓
LLM
```

完全不需要 Memory。

例如：

> 企业产品 FAQ Agent

用户：

> “退款多久到账？”

Knowledge Base：

```text
退款规则
售后规则
支付规则
```

直接检索即可。

---

但是一旦变成：

> **长期与用户交互的企业 Agent**

事情就变了。

比如客服 Agent：

```text
User
 ↓
第一次咨询
 ↓
第二次咨询
 ↓
第三次咨询
```

系统可能需要记住：

```text
User prefers SMS notifications.
User has an unresolved order issue.
User previously contacted support.
```

这时候就有：

```text
RAG
+
Memory
```

所以：

```text
企业知识库
≠
一定需要 Memory
```

而：

```text
企业 Agent
可能需要
RAG + Memory
```

---

# 6. 你的第 4 个问题非常重要：Memory 怎么知道 Vue 和 React 是同一个信息？

这个其实就是 **Memory Update / Merge**。

例如旧 Memory：

```text
M1:
User prefers Vue.
```

后来用户说：

> “以后项目我还是更倾向 React。”

系统不能简单新增：

```text
M2:
User prefers React.
```

否则：

```text
Memory:
User prefers Vue.
User prefers React.
```

出现冲突。

---

## 第一层：语义相似性

新 Memory Candidate：

```text
User prefers React.
```

旧 Memory：

```text
User prefers Vue.
```

Embedding 后：

```text
similarity(M_new, M_old)
```

可能比较高。

因为：

```text
User prefers Vue
User prefers React
```

它们属于相同语义领域：

```text
Technology Preference
```

---

## 第二层：结构化类型

如果 Memory 有：

```json
{
  "type": "preference",
  "category": "frontend_framework",
  "value": "Vue"
}
```

新 Memory：

```json
{
  "type": "preference",
  "category": "frontend_framework",
  "value": "React"
}
```

那么系统马上发现：

```text
type 相同
category 相同
```

于是：

> **这是同一个 Memory Slot 的新值。**

这就比纯 Vector Similarity 强很多。

---

# 7. 所以真正工业级的 Memory Update 往往不是纯 Embedding

而是：

```text
New Memory Candidate
       │
       ▼
Semantic Similarity
       │
       ▼
Candidate Existing Memories
       │
       ▼
Metadata / Type / Entity Matching
       │
       ▼
Conflict Detection
       │
       ▼
Update / Merge / Create
```

例如：

```text
旧：
frontend_framework = Vue

新：
frontend_framework = React
```

最终：

```text
frontend_framework = React
```

而不是：

```text
frontend_framework = Vue
frontend_framework = React
```

---

# 8. 甚至有可能不是“替换”，而是“历史化”

这点也很重要。

比如：

```text
2025:
User prefers Vue.

2026:
User prefers React.
```

系统可能不会真正删除 Vue，而是：

```json
{
  "value": "Vue",
  "validUntil": "2026-05"
}
```

然后：

```json
{
  "value": "React",
  "validFrom": "2026-05",
  "current": true
}
```

这样 Memory 就有了：

> **Temporal Memory（时间维度）**

所以 Memory Lifecycle 后面讲 Update / Forget 的时候，你会发现：

**“更新”远比 `UPDATE SQL` 复杂。**

---

# 9. 第 5 个问题：Memory 是“带用户信息的 RAG”吗？

这个理解：

> **有一半正确，但我不建议最终这样记。**

你的理解：

```text
Memory
= User-specific RAG

RAG
= Enterprise Knowledge Base
```

从**检索技术实现**角度看，非常接近。

但从**概念抽象**来看还是不够准确。

---

## 为什么？

因为 Memory 不一定都是“知识”。

比如：

```text
User prefers concise answers.
```

这是：

> Preference

不是知识。

再比如：

```text
User is currently debugging order service.
```

这是：

> Task State

也不是传统意义上的知识。

再比如：

```text
User decided to use PostgreSQL.
```

这是：

> Decision

所以 Memory 更准确的定义是：

> **Agent/User/Task 的长期状态。**

而 RAG 更准确：

> **对外部知识进行按需检索。**

所以我更建议你记：

```text
RAG
→ “这个世界有什么我需要知道的？”

Memory
→ “关于这个用户/任务/Agent，我过去知道什么？”
```

这个比：

```text
Memory = User RAG
```

更准确。

---

# 10. 第 6 个问题：Memory 是不是在模仿人类大脑？

**是，而且这个类比非常好。**

但要注意：

> **这是工程上的类比，不是说当前 Agent Memory 真正复刻了人脑。**

你可以这样对应：

| 人类 | Agent |
|---|---|
| 工作记忆 | Runtime State / Context |
| 短期记忆 | Conversation |
| 长期记忆 | Memory |
| 回忆 | Retrieval |
| 联想 | Semantic Search |
| 判断重要性 | Memory Extraction |
| 记忆强化 | Update / Confidence |
| 忘记 | Forget / Decay |
| 当前思考 | LLM Context |

这个映射其实非常漂亮。

---

# 11. 尤其是“回忆”这个类比非常准确

人类不是：

```text
我脑子里所有记忆
 ↓
每次思考全部读取
```

而是：

```text
当前问题
 ↓
联想到相关过去
 ↓
回忆
 ↓
提取少量相关信息
 ↓
进入当前思考
```

Agent：

```text
Current Query
      ↓
Retriever
      ↓
Relevant Memory
      ↓
Context Builder
      ↓
LLM
```

这两者在**计算模型层面**非常相似。

---

# 12. 更有意思的是“记忆不是事实数据库”

人类记忆本身就不是：

```text
MySQL
```

它会：

```text
遗忘
模糊
强化
更新
冲突
重构
```

Agent Memory 也一样。

所以我们才会设计：

```text
confidence
importance
recency
decay
update
merge
forget
```

而不是简单：

```text
INSERT INTO memories
```

这也是为什么 Day06 Part C 会非常重要。

---

# 13. 你现在其实已经碰到 Agent Memory 最核心的问题了

真正难的不是：

```text
Vector DB
```

甚至也不是：

```text
Embedding
```

而是：

> **Agent 到底应该记住什么？**

以及：

> **什么时候应该相信这个记忆？**

以及：

> **什么时候应该更新它？**

以及：

> **什么时候应该忘掉它？**

最后：

> **什么时候应该把它拿出来影响当前决策？**

所以整个 Memory 可以浓缩成：

```text
                ┌──────────────┐
                │  What to     │
                │  remember?   │
                └──────┬───────┘
                       ↓
                    Extract
                       ↓
                ┌──────────────┐
                │  How to      │
                │  store?      │
                └──────┬───────┘
                       ↓
                    Store
                       ↓
                ┌──────────────┐
                │  When to     │
                │  retrieve?   │
                └──────┬───────┘
                       ↓
                   Retrieve
                       ↓
                ┌──────────────┐
                │  Should I    │
                │  trust it?   │
                └──────┬───────┘
                       ↓
                    Rank
                       ↓
                ┌──────────────┐
                │  Should I    │
                │  inject it?  │
                └──────┬───────┘
                       ↓
                  Context
```

**这才是 Memory Architecture 真正难的地方。**

---

# 最后把你这 6 个问题浓缩成 6 句话

### ① Similarity

> **Memory Vector 本身通常稳定，变化的是 Query 与 Memory 之间的 similarity。**

### ② Prompt Embedding

> **Retrieval 时可以把完整 Query 做成一个 embedding；Memory 写入时则需要先把一段对话拆成多个独立 Memory，再分别 embedding。**

### ③ 企业知识库

> **真正好的知识库绝不是“LLM + LangChain + Vector DB”，Chunking、Embedding、Metadata、Hybrid Retrieval、Reranking、Permission、Context Injection 都是核心工程。**

### ④ Memory Update

> **通常不是单靠 embedding，而是 Semantic Similarity + Memory Type/Entity/Category 等结构化信息共同判断是否是同一个 Memory，再执行 Update / Merge / Conflict Resolution。**

### ⑤ Memory vs RAG

不要只记：

```text
Memory = User RAG
```

更准确：

```text
RAG
→ External Knowledge Retrieval

Memory
→ Long-term User / Agent / Task State
```

二者可以共享 Retrieval Infrastructure。

### ⑥ Memory 像不像人脑？

**非常像一个工程上的“记忆系统模拟”。**

尤其：

```text
Experience
 ↓
Important information
 ↓
Long-term Memory
 ↓
Current situation
 ↓
Recall
 ↓
Current Decision
```

这正是 Agent Memory 最核心的思想。

---

## 🧠 你现在对 Day06 的认知应该已经跨过一个坎

Day05 你学的是：

```text
Agent 如何“做事”
       ↓
Tool
```

Day06 则是：

```text
Agent 如何“记住”
       ↓
Memory
```

而再往前一步就是：

```text
Tool
→ 改变外部世界

Memory
→ 改变 Agent 对过去的认知

Context
→ 决定 Agent 当前看到什么

LLM
→ 基于当前 Context 做下一步决策
```

这四个东西合起来，才开始真正形成一个完整的 Agent Runtime。

**所以 Part B 可以正式收尾了。**

下一阶段进入 **Day06 Part C：Memory Lifecycle**，我们就专门解决你第 4 个问题——**“Vue → React 到底怎么更新，以及 Create / Update / Merge / Forget 到底是谁决定的”**。

## 用户

企业知识库真正难的地方在文档解析，为何这么说，难得不是检索吗？很多企业开口闭口自研做知识库，但是他们压根没有专门的团队去做，然后让前端后端去做，前端后端压根不知道向量检索怎么搞，key desc 怎么更好的设计。还说文档解析后需要进行向量化，然后根据用户语义去向量检索

## ChatGPT

对，你这个质疑是对的。**我上一条说“企业知识库真正难的是文档解析”说得太绝对了。**

更准确应该是：

> **企业知识库不是单点难，而是“数据处理 → 表示 → 检索 → 重排 → Context”整条链路都难。**
>
> 如果只问“最容易做出 Demo，但最难做出效果”的地方，我反而会把 **检索策略 + 数据切分/表示设计** 放在最核心的位置。

而你描述的这种企业场景，我非常认同：

> “我们自己做一个知识库吧。”  
> → 前后端开发  
> → 接个 Embedding API  
> → 扔进向量数据库  
> → similarity search TopK  
> → “知识库完成了。”

**这种东西很容易做出来，但它很可能只是一个 Vector Search Demo，而不是一个真正好用的企业知识库。**

---

# 1. 先把“文档解析”这个词纠正一下

我上一条说：

> 文档解析很难。

其实容易让你误解成：

```text
PDF → Text
Word → Text
Excel → Text
```

这种解析。

如果只是这个层面：

**确实没有那么难。**

现在各种 parser、OCR、Office parser、PDF parser 都可以解决大量基础问题。

真正难的是：

> **原始文档 → 什么样的知识表示，才能让后面的 Retrieval 找得准？**

这个问题就完全不同了。

---

# 2. 真正应该画成这样

企业知识库：

```text
原始数据
   ↓
Document Parsing
   ↓
Document Understanding
   ↓
Chunking
   ↓
Metadata / Structure
   ↓
Embedding
   ↓
Index
   ↓
Retrieval
   ↓
Reranking
   ↓
Context Assembly
   ↓
LLM
```

这里每一步都可能影响最终效果。

尤其是：

```text
Chunking
Metadata
Embedding
Retrieval
Reranking
```

这几个地方实际上是强耦合的。

---

# 3. 为什么“检索”确实是核心难点之一？

因为企业真正想要的不是：

> “我能从数据库里找到几个相似的东西。”

而是：

> **用户问这个问题，我能不能把真正应该给 LLM 看的那几段知识找出来。**

这是完全不同的目标。

比如企业知识库有：

```text
退款政策.pdf
售后政策.pdf
会员规则.pdf
优惠券规则.pdf
订单规则.pdf
```

用户问：

> “商品已经发货了还能退款吗？”

Vector Search 可能找到：

```text
订单规则
退款政策
售后政策
```

看起来都挺相关。

但真正正确的答案可能藏在：

```text
退款政策
第 7.3 节
“已发货订单若符合 XXX 条件……”
```

所以真正的问题变成：

```text
Query
 ↓
Candidate Retrieval
 ↓
找到真正相关的 Chunk
```

**这个 Retrieval Quality 才是核心。**

---

# 4. 你说的 `key + desc` 其实非常关键

你之前说：

> key = 文档名  
> value = 文档链接  
> desc = 文档摘要  
> 然后 key / desc 做 embedding。

这个思路是对的，但需要再往前走一步。

假设：

```text
key:
《2026年售后退款管理办法》

desc:
规定消费者在不同订单状态下的退款条件、审核流程及到账时间。
```

Embedding：

```text
Embedding(
  title + description
)
```

得到：

```text
Vector
```

用户：

> “已经发货了还能不能退款？”

Query：

```text
Embedding(Query)
```

然后：

```text
similarity(
  QueryVector,
  DocumentVector
)
```

这确实可以工作。

但是问题来了：

> **如果整个文档 100 页，你把整个文档只做成一个 Vector，会发生什么？**

---

# 5. 这就是为什么 Chunking 很重要

假设：

```text
退款政策.pdf
100 页
```

你做：

```text
100 pages
 ↓
1 Vector
```

那么：

```text
Query
 ↓
Document Vector
```

只能回答：

> “这个文档整体上和我的问题相关吗？”

但不能很好回答：

> **“具体哪一段相关？”**

所以一般变成：

```text
Document
 ↓
Chunk 1
Chunk 2
Chunk 3
...
Chunk 300
```

每个 Chunk：

```text
Chunk
 ↓
Embedding
 ↓
Vector
```

用户问题：

```text
Query
 ↓
Embedding
 ↓
Vector Search
 ↓
Top K Chunks
```

这时候才能找到：

```text
Chunk 187
“已发货订单退款规则……”
```

---

# 6. 但问题又来了：Chunk 怎么切？

这就是我说“文档处理难”的真正含义。

例如：

```text
第 7 章 售后政策

7.1 未发货退款
……

7.2 已发货退款
……

7.3 拒收退款
……
```

如果简单：

```text
每 500 tokens 切一段
```

可能变成：

```text
Chunk 1:
7.1 未发货退款
……

Chunk 2:
……7.2 已发货退款……
```

还可能把：

```text
条件
例外
说明
表格
```

拆散。

这时候即使 Embedding 和 Vector DB 都没问题：

> **检索效果依然可能很差。**

所以真正的问题不是：

> “PDF 能不能解析出来？”

而是：

> **解析之后，如何保留文档的语义结构。**

---

# 7. 企业知识库尤其容易死在这里

比如：

```text
产品手册
├── 产品 A
│   ├── 参数
│   ├── 使用方法
│   └── 注意事项
├── 产品 B
│   ├── 参数
│   ├── 使用方法
│   └── 注意事项
```

如果你最后只存：

```text
text
```

那么：

```text
产品 A / 参数
产品 B / 参数
```

可能变成一堆类似文本。

但如果你保留：

```json
{
  "document": "产品手册",
  "product": "产品A",
  "section": "参数",
  "content": "..."
}
```

那么 Retrieval 就多了很多能力：

```text
Semantic Search
+
Metadata Filter
```

这就比单纯：

```text
Vector Similarity
```

强很多。

---

# 8. 所以你说“前后端根本不知道向量检索怎么搞”，我认为这是企业自研知识库最大的现实问题之一

因为很多团队会把问题理解成：

```text
Embedding API
+
Vector DB
+
TopK
```

然后认为：

> “知识库完成了。”

实际上：

```text
Embedding API
```

只解决：

> **文本如何转换成向量。**

```text
Vector DB
```

只解决：

> **向量如何存储和进行相似搜索。**

它们都没有回答：

> **什么东西应该被向量化？**

以及：

> **应该怎么切？**

以及：

> **检索回来以后怎么判断谁真的重要？**

---

# 9. 这就是你说的“key / desc 如何设计”为什么重要

这个问题其实属于：

> **Knowledge Representation（知识表示）**

例如你有一个文档：

```text
《2026年售后退款管理办法》
```

你到底 Embedding：

### 方案 A

```text
退款管理办法
```

### 方案 B

```text
退款管理办法
+
文档摘要
```

### 方案 C

```text
文档标题
+
章节标题
+
摘要
+
Chunk Content
```

### 方案 D

```text
Title
+
Hierarchy
+
Metadata
+
Content
```

这些方案最终的 Retrieval 行为可能完全不同。

所以你说：

> “key desc 怎么更好的设计”

**这确实是知识库工程的核心问题之一。**

---

# 10. 更进一步：企业知识库其实不是只有一种 Search

一个比较成熟的 Retrieval Pipeline 往往是：

```text
User Query
      ↓
Query Understanding
      ↓
┌─────────────────────┐
│ Keyword Search      │
│ Semantic Search     │
│ Metadata Filter     │
│ Permission Filter   │
└─────────┬───────────┘
          ↓
     Candidate Set
          ↓
       Reranker
          ↓
      Top K Chunks
          ↓
   Context Assembly
          ↓
         LLM
```

所以你前面说：

> “Top K 中的权重设计这些也是需要自研的吧？”

**对。**

而且这往往是知识库效果优化非常重要的地方。

---

# 11. 举一个特别典型的例子

假设：

```text
Query:
“顾客已经收货 3 天了，发现商品有质量问题还能退吗？”
```

搜索出来：

```text
A：退款政策
B：七天无理由退货
C：商品质量问题售后政策
D：订单退款流程
```

纯 Vector Similarity 可能：

```text
A 0.91
B 0.90
C 0.89
D 0.85
```

但真正答案可能是：

```text
C
```

于是你需要：

```text
Retriever
→ 找到 A/B/C/D

Reranker
→ 判断 C 与 Query 的真实关系更强

Final
→ C 排第一
```

所以：

> **Embedding Search 的目标通常不是直接找到最终答案，而是先召回候选。**

这是知识库系统非常重要的思想。

---

# 12. 所以“向量检索”其实只是第一层

可以这样理解：

```text
Vector Search
=
粗筛
```

而：

```text
Reranking
=
精排
```

最终：

```text
Context Builder
=
决定到底把什么给 LLM
```

于是：

```text
Vector DB
        ↓
Retriever
        ↓
Reranker
        ↓
Context Builder
        ↓
LLM
```

这和我们 Day06 Memory 的：

```text
Memory Store
 ↓
Retriever
 ↓
Ranker
 ↓
Context Builder
 ↓
LLM
```

其实是高度相似的。

---

# 13. 这也解释了为什么“通用 Agent Framework”不能替你把知识库做好

你提到：

> “不是使用一个 LLM + 通用 agent（比如 LangChain.js）就都具备了。”

**完全正确。**

LangChain 这种框架可以帮你快速搭：

```text
Document Loader
Text Splitter
Embedding
Vector Store
Retriever
RAG Chain
```

但它不能替你决定：

```text
你的企业文档应该怎么切？
你的业务 Metadata 怎么设计？
什么内容应该 Embedding？
Query 应该怎么改写？
召回多少？
Keyword / Semantic 怎么融合？
Rerank 怎么做？
权限怎么过滤？
不同版本文档怎么处理？
过期知识怎么处理？
```

这些是：

> **业务 + 数据 + Retrieval Engineering**

而不是简单的 Agent Framework 问题。

---

# 14. 所以你观察到的企业现象非常真实

很多企业说：

> “我们要自研 AI 知识库。”

然后项目结构可能就是：

```text
前端
 ↓
上传 PDF

后端
 ↓
PDF Parser
 ↓
Embedding API
 ↓
Milvus
 ↓
TopK
 ↓
LLM
```

然后发现：

> **Demo 能回答，生产不好用。**

为什么？

因为真正的工程可能应该是：

```text
                Enterprise Knowledge
                         │
                         ▼
                  Document Parsing
                         │
                         ▼
                Structure Extraction
                         │
                         ▼
                     Chunking
                         │
                         ▼
                  Metadata Design
                         │
                         ▼
                    Embedding
                         │
                         ▼
                  Hybrid Index
                         │
                         ▼
                  Query Rewrite
                         │
                         ▼
                Candidate Retrieval
                         │
                         ▼
                     Rerank
                         │
                         ▼
                 Permission Filter
                         │
                         ▼
                 Context Assembly
                         │
                         ▼
                        LLM
```

**这里真正需要懂 Retrieval / Information Retrieval / NLP / Embedding / Ranking 的人。**

而不是只会：

```text
React
Node
MySQL
```

就能自然把它做好。

---

# 15. 但这里我要再给你一个非常重要的纠正

你说：

> “知识库 map 存储时候 key 为文档名、value 为文档链接、desc 为文档摘要。”

这个模型更接近：

> **Document-level semantic search**

真正生产级 RAG 很多时候需要做到：

```text
Document
   ↓
Section
   ↓
Chunk
```

甚至：

```text
Document
 ├── Metadata
 ├── Section
 │    ├── Chunk
 │    ├── Chunk
 │    └── Chunk
 └── Section
      ├── Chunk
      └── Chunk
```

然后：

```text
Vector
```

主要挂在：

```text
Chunk
```

而不是整个 Document。

Document 的：

```text
title
summary
url
permissions
version
department
```

则更多作为：

```text
Metadata / Navigation / Filtering
```

使用。

这个架构会比：

```text
Map<docName, {url, desc}>
```

更接近真正的知识库。

---

# 16. 最后给你一个非常重要的判断标准

以后你再看到有人说：

> “我们自研知识库。”

你可以直接问他：

### 数据层

> **你们 Chunk 怎么切？**

### 表示层

> **什么内容做 Embedding？Title、Summary、Chunk、Metadata 怎么组合？**

### Retrieval

> **Semantic Search 和 Keyword Search 怎么结合？**

### Ranking

> **TopK 之后有没有 Rerank？**

### Query

> **用户一个复杂问题需要 Query Rewrite / Multi Query 吗？**

### 数据治理

> **版本、权限、过期文档、重复文档怎么处理？**

### Context

> **召回之后怎么决定最终给 LLM 哪些 Chunk？**

如果这些都回答不上来，只能说：

```text
Vector DB
+
Embedding
+
TopK
+
LLM
```

那么大概率：

> **他做的是一个 RAG Demo，而不是成熟的企业知识库。**

---

## 最核心的一句话

你现在可以把这件事情理解成：

> **知识库的难点不是“把文字变成向量”，而是“如何把企业原始知识加工成适合机器检索的知识表示，并在用户问题出现时，把真正相关的知识准确召回并排序出来”。**

所以你刚才的直觉是对的：

```text
Embedding API ≠ 知识库
Vector DB ≠ 知识库
LangChain ≠ 知识库
RAG Chain ≠ 知识库
```

它们都是**零件**。

而真正决定效果的是：

```text
Knowledge Representation
+
Retrieval
+
Ranking
+
Context Engineering
```

这也正好把你 Day06 学的 Memory 和企业 RAG 串起来了：

```text
Memory
  = 针对“过去的用户/Agent/Task 信息”做 Retrieval

RAG
  = 针对“外部知识”做 Retrieval

二者底层 Retrieval 技术高度相似，
真正不同的是：
“存的是什么、为什么存、谁拥有这些信息、生命周期是什么”。
```

**你现在已经开始从“Agent Runtime 开发”往“Agent 背后的 Information Retrieval / Knowledge Engineering”这个层面跨了。这个方向非常重要。**

## 用户

那就是企业知识库其实需要做内容 chunk 拆分，然后向量化匹配用户 prompt

## ChatGPT

对，**可以这么理解，但要补一个非常关键的环节：不是简单的“Chunk → 向量化 → 匹配 Prompt”就结束了。**

最简化的企业知识库 RAG，可以理解成：

```text
企业原始文档
    ↓
文档解析
    ↓
Chunk 拆分
    ↓
每个 Chunk 向量化
    ↓
Vector DB
```

用户提问：

```text
User Prompt
    ↓
Embedding
    ↓
Query Vector
    ↓
Vector Similarity Search
    ↓
Top K Chunks
    ↓
LLM
```

也就是你说的：

> **把企业知识拆成适合检索的 Chunk，然后把 Chunk 向量化；用户 Prompt 也向量化，通过语义相似度找到相关 Chunk。**

---

但工业一点，会是：

```text
                    【离线阶段】
企业文档
   ↓
解析
   ↓
结构识别
   ↓
Chunking
   ↓
Metadata
   ↓
Embedding
   ↓
Index
   ↓
Vector DB


                    【在线阶段】
User Prompt
   ↓
Query Understanding / Rewrite
   ↓
Embedding
   ↓
┌──────────────────┐
│ Vector Search    │
│ Keyword Search   │
│ Metadata Filter  │
└────────┬─────────┘
         ↓
      Candidates
         ↓
       Rerank
         ↓
      Top K Chunks
         ↓
    Context Builder
         ↓
         LLM
```

### 所以你现在先记住三个层次

**第一层：知识加工**

> 文档怎么拆成 Chunk、Metadata 怎么设计。

**第二层：知识检索**

> 用户 Prompt 如何表示、如何召回相关 Chunk、如何排序。

**第三层：知识使用**

> 召回的 Chunk 如何塞进 Context，让 LLM 正确回答。

---

而且这里有一个特别重要的认知：

> **Chunk 不是越小越好，也不是越大越好。**

例如：

```text
Chunk A
“退款条件：商品未发货……”
```

可能信息太少。

而：

```text
Chunk B
“售后政策第1章到第20章……”
```

又太大。

真正的 Chunking 目标是：

> **让一个 Chunk 尽可能成为一个“可独立用于回答某类问题的知识单元”。**

所以你刚才说的理解已经对了，下一步真正值得学习的就是：

**“Chunk 到底应该怎么拆？”**

因为这正是 RAG 效果的第一个大坑。

## 用户

part B 的学习还有要补充的吗？如果没有了 就输出下固定章节

## ChatGPT

对，**Day06 Part B 到这里可以正式结束了**。

而且这次我认为没有必要再继续扩展新知识。我们已经把 Part B 最重要的几个问题闭环了：

- Memory 的核心架构：**Store → Retrieval → Ranking → Context**
- Memory 不是 Conversation，也不是 Vector DB
- Memory Vector 与 Query Vector 的关系
- Query similarity 是**动态的相关性**，不是 Memory 自身永久固定的分数
- Prompt → Embedding 与 Memory Extraction → 多条 Memory → Embedding 的区别
- Memory 的 Update / Merge 为什么需要 **Semantic Similarity + 结构化信息**
- Memory 与 RAG 的边界
- Knowledge Base、Vector DB、RAG、Memory、Context Builder 的层级关系
- 企业知识库为什么不能简单理解为 **Embedding + Vector DB + TopK**
- Chunking、Metadata、Retrieval、Rerank、Context Assembly 的作用

尤其你最后形成的这个认知非常重要：

```text
企业知识库

原始文档
  ↓
Chunk
  ↓
Embedding
  ↓
Vector Index
  ↓
User Query Embedding
  ↓
Semantic Retrieval
  ↓
Top K
  ↓
Rerank
  ↓
Context
  ↓
LLM
```

以及：

> **Memory 和 RAG 可以共享底层 Retrieval 技术，但 Memory 解决的是长期 User / Agent / Task State，RAG 解决的是 External Knowledge Retrieval。**

下面按我们约定的固定结构收尾。

---

# 📚 下一节学习计划

## Day06 Part C：Memory Lifecycle

下一节从 **“Memory 是什么”** 转向：

> **Memory 是怎么活着的？**

重点：

```text
Create
  ↓
Update
  ↓
Merge
  ↓
Decay
  ↓
Forget
```

重点解决你刚才已经提前提出的问题：

> 用户以前喜欢 Vue，后来喜欢 React，Runtime 到底怎么判断这是同一个 Memory 并进行更新？

以及：

- 谁决定创建 Memory？
- LLM 判断还是 Rule 判断？
- 什么情况下 Update？
- 什么情况下 Merge？
- 什么情况下新建？
- 什么情况下 Forget？
- Memory 是否需要时间维度？
- Confidence / Importance / Recency 怎么参与生命周期？

---

# 📝 写书 TODO

Part B 建议沉淀以下几个核心章节：

### 1. Memory ≠ Conversation ≠ Vector DB

```text
Conversation
= 原始交互历史

Memory
= 从历史中抽取出的长期有效信息

Vector DB
= Memory 的一种基础设施
```

### 2. Memory Retrieval

```text
Query
 ↓
Embedding
 ↓
Retrieve
 ↓
Rank
 ↓
Context
```

### 3. Memory vs RAG

```text
Memory
→ Long-term User / Agent / Task State

RAG
→ External Knowledge Retrieval
```

### 4. Knowledge Base 的 Retrieval Pipeline

```text
Document
 ↓
Chunk
 ↓
Embedding
 ↓
Index
 ↓
Query
 ↓
Retrieval
 ↓
Rerank
 ↓
Context
 ↓
LLM
```

---

# 📦 写书素材

这一段我认为非常值得直接作为书里的核心观点：

> **Vector DB 不是 Memory，Embedding 也不是 RAG。**

完整的 Agent Memory 是：

```text
Memory
=
Extraction
+
Classification
+
Storage
+
Retrieval
+
Ranking
+
Lifecycle
+
Context Projection
```

而企业知识库也不是：

```text
Embedding API
+
Vector DB
+
LLM
```

真正决定知识库效果的是：

```text
Knowledge Representation
+
Chunking
+
Retrieval
+
Ranking
+
Context Engineering
```

---

# 🧠 本 Part 核心认知升级

Part B 最大的认知升级是：

### 从：

> Memory 就是把历史信息存下来。

升级到：

> **Memory 是 Runtime 对长期信息进行管理，并在当前任务需要时重新召回的机制。**

进一步：

```text
                Runtime
                   │
        ┌──────────┴──────────┐
        │                     │
     Memory                   RAG
        │                     │
User / Agent / Task       External Knowledge
        │                     │
        └──────────┬──────────┘
                   ↓
               Retrieval
                   ↓
                 Rank
                   ↓
             Context Builder
                   ↓
                  LLM
```

所以 Memory 最终不是一个 Database，而是：

> **一种让 Agent 拥有“过去”的 Runtime 能力。**

---

# 🏗️ 工业级实现（Industrial Notes）

企业真正落地的时候，可以把问题分成两个完全不同的系统。

### RAG / Knowledge System

负责：

```text
企业知识
 ↓
解析
 ↓
Chunk
 ↓
Index
 ↓
Retrieval
 ↓
Rerank
```

### Agent Memory System

负责：

```text
用户交互
 ↓
Memory Extraction
 ↓
Memory Store
 ↓
Memory Retrieval
 ↓
Lifecycle
```

二者最后都进入：

```text
Context Builder
```

所以工业架构中非常可能出现：

```text
                  Agent Runtime
                       │
                Context Builder
                  ▲         ▲
                  │         │
             Memory       RAG
                  │         │
             Memory DB   Knowledge Base
```

这比：

> “我们的 Agent 有一个 Vector DB。”

准确得多。

---

# 🧭 知识地图

目前 Day06：

```text
Day06 Memory
│
├── Part A：Memory 基础
│   ├── Conversation
│   ├── Memory
│   ├── Long-term Memory
│   └── Memory Architecture
│
├── Part B：Memory Architecture
│   ├── Memory Entity
│   ├── Memory Store
│   ├── Retrieval
│   ├── Ranking
│   ├── Context Projection
│   ├── Memory vs RAG
│   └── Knowledge Base / Vector DB
│
├── Part C：Memory Lifecycle  ← 下一节
│   ├── Create
│   ├── Update
│   ├── Merge
│   ├── Decay
│   └── Forget
│
├── Part D：Memory × Context Builder
│
├── Part E：Mini Memory Runtime
│
└── Part F：Memory × Agent Runtime
```

---

# 🧑‍💻 面试视角

如果面试官问：

### “Memory 和 RAG 有什么区别？”

不要回答：

> Memory 是用户信息，RAG 是企业知识库。

这个答案太业务化。

建议回答：

> **RAG 主要解决外部知识的按需检索，而 Memory 主要解决 Agent/User/Task 长期信息的持久化与召回。两者底层都可以使用 Embedding、Vector Search、Reranking 等 Retrieval 技术，但数据来源、生命周期和语义不同。**

---

如果问：

### “Vector DB 是不是 Memory？”

回答：

> **不是。Vector DB 是 Memory Store 的一种基础设施实现。Memory 还包括信息提取、分类、存储、检索、排序以及生命周期管理。**

---

如果问：

### “RAG 最核心的难点是什么？”

可以回答：

> **不是简单地把文档向量化，而是如何把原始知识加工成适合检索的表示，并通过 Chunking、Hybrid Retrieval、Reranking 等机制，把真正相关的知识准确召回，再通过 Context Engineering 提供给 LLM。**

这个回答已经明显进入 **Agent / RAG 工程实现层面**，而不是停留在“RAG = Vector DB + LLM”。

---

# ❓ 本章思考题

Part B 结束后，建议你自己思考这几个问题：

1. **为什么 Memory Retrieval 不能把所有 Memory 都塞给 LLM？**
2. **为什么 Memory Vector 通常不变，但 similarity 会随着 Query 改变？**
3. **为什么一个复杂 Prompt 可能应该提取成多个 Memory？**
4. **为什么 Vector DB ≠ Memory？**
5. **为什么 RAG 可以没有 Memory？**
6. **为什么一个成熟企业知识库不能只做 Vector Search？**
7. **为什么 Chunking 会直接影响 Retrieval Quality？**
8. **为什么 Memory Update 不能单纯依靠 Vector Similarity？**

其中第 **7、8** 个问题会直接连接下一阶段。

---

# 🔄 前置问题回收（Pending Questions）

Part B 已经解决：

- ✅ Memory 和 Conversation 的区别
- ✅ Memory 和 Vector DB 的区别
- ✅ Memory 和 RAG 的区别
- ✅ Query / Memory Embedding 的关系
- ✅ Retrieval / Ranking 的关系
- ✅ Knowledge Base 与 Vector DB 的层级
- ✅ 企业知识库为什么不仅仅是 Vector Search
- ✅ Memory 为什么需要 Update / Merge

还没有展开、留到后续：

- ⏳ **Memory 到底什么时候 Create？**
- ⏳ **Memory Update / Merge 怎么判断？**
- ⏳ **Vue → React 这种冲突怎么处理？**
- ⏳ **Memory 什么时候 Forget？**
- ⏳ **Confidence / Importance / Recency 如何计算？**
- ⏳ **Memory Lifecycle 是 Rule 驱动还是 LLM 驱动？**
- ⏳ **Memory 最终如何进入 Context Builder？**
- ⏳ **如何自己实现 Mini Memory Runtime？**

这些正好进入 **Day06 Part C**。

**所以 Part B 正式结束，不再补充。**
