# Day06 Part D 学习文档 v1.3：Memory × Context Builder

> 本文是《从零实现 Agent Runtime》学习阶段的 Day06 Part D 正式学习文档。
>
> Part A 建立了 Memory 基础模型，Part B 拆解了 Memory Architecture 的 Write Path 与 Read Path，Part C 将 Memory 定义为具有 Create、Update、Merge、Decay、Forget 等生命周期的长期 State。Part D 继续回答：已经存在且仍然有效的 Memory，如何被选择、投影并组装成当前 LLM 真正需要的 Working Context？
>
> 学习来源：
>
> - [Part D 知识学习会话](https://chatgpt.com/share/6a8d563e-a534-83ee-8642-b3ada1dd5ef1)：详细展开 D-5、D-6，并对 D-1～D-6 做完整收束。
> - [完整路线调整会话（需登录）](https://chatgpt.com/c/6a8d2e07-5ebc-83e8-98a9-306b4b7eba5a)：明确 Day06 后从理论学习切换到 Pi Agent / Codex 源码解剖、Mini Runtime 整合和 Agent 项目实战。
> - [学习路线变更的原始讨论](https://chatgpt.com/share/6a8e5b33-a3e8-83e8-b121-5df9580ca33a)：解释为什么引入 Pi Agent、如何定位已有 RAG 能力，以及项目实战后的工业级能力路线。

---

## 本节定位

Part C 解决：

> Memory 自己如何保持合理、可追踪的长期状态？

Part D 解决：

> 长期状态如何被转换成当前 LLM 可以消费的 Context Snapshot？

本节核心结论是：

> Memory Store 保存长期 State；Memory Pipeline 负责有效性、召回、排序与冲突处理；Context Builder 负责在全局 Token Budget 下选择、投影、压缩和组装信息。Memory 只是 Runtime World 的一个 State Source，最终的 Context Snapshot 是整个 Runtime World 面向 LLM 的认知投影。

---

## 目录

1. Part D 的核心问题
2. D-1：Retrieval 不等于 Injection
3. D-2：Memory Context Budget
4. D-3：Projection 与 Assembly
5. D-4：Scope 与 Priority
6. D-5：Memory Conflict 与 Consistency
7. 冲突识别与处理判断树
8. Confidence、Recency、Source 与 Lifecycle
9. 不确定性的 Context Projection
10. Context Snapshot：Runtime World 的 LLM-facing View
11. D-6：Memory Representation Compression
12. Runtime 中的三次压缩
13. Retrieval 与 Compression 的边界
14. 三种 Compression 策略
15. Information Density
16. Day04 与 Day06 Compression 的区别
17. 三个工业级补充点
18. Part C 与 Part D 的完整链路
19. 职责边界与反模式
20. 本 Part 最终设计
21. 本 Part 核心知识点
22. 本 Part 核心认知升级
23. 工业级实现建议
24. 可观测性设计
25. 知识地图
26. 面试视角
27. 思考题
28. 写书 TODO
29. 写书素材
30. Day06 之后：从理论切换到源码与构建
31. 下一节学习计划

---

## Part D 的核心问题

Memory 进入 Context 之前，至少要回答六类问题：

```text
Memory 是否仍然有效？
        ↓
Lifecycle

和当前 Query 相关吗？
        ↓
Retrieval / Ranking

适用于哪个对象和范围？
        ↓
Scope

值得占用多少 Context？
        ↓
Priority / Budget

应该怎样告诉 LLM？
        ↓
Projection / Compression

多条 Memory 互相矛盾怎么办？
        ↓
Conflict / Consistency
```

Part D 的主干因此可以概括为：

```text
D-1  Retrieval ≠ Injection
          ↓
D-2  Memory Context Budget
          ↓
D-3  Projection / Assembly
          ↓
D-4  Scope / Priority
          ↓
D-5  Conflict / Consistency
          ↓
D-6  Representation Compression
```

---

## D-1：Retrieval 不等于 Injection

Retriever 找到一条 Memory，只能说明它是候选信息：

```text
Retrieved Memory
      ≠
Prompt Memory
```

检索回答：

> 哪些 Memory 可能与当前 Query 相关？

Context Selection 回答：

> 哪些候选真的值得占用当前 Prompt？

一条 Memory 即使语义相似，也可能因为以下原因不进入 Context：

- 已经过期或被 deprecated。
- Scope 不适用于当前任务。
- 优先级低于其他 Context Source。
- 与当前目标只有表面相似。
- Token 成本过高，决策价值过低。
- 存在尚未解决的冲突或可信度不足。

所以 Read Path 不能简化成 `vectorSearch → topK → prompt`。

---

## D-2：Memory Context Budget

Memory 不是 Context 的唯一来源。它需要和以下信息竞争有限 Token：

```text
Conversation
Runtime State
Task State
Tool Results
Workspace
Retrieved Knowledge
Memory
```

因此：

```text
Global Context Budget
          ↓
Context Source Allocation
          ↓
Memory Budget
```

Memory System 不应该单独决定整个 Prompt 的预算。它更适合提供：

- Candidate Memories
- relevance / priority 等信号
- 预计 Token Cost
- 可选的投影形式

Context Builder 或独立的 Budget Manager 决定 Memory 最终可以占用多少 Token。

预算分配不是固定百分比的机械切分，而是可以随任务动态变化。例如：

```text
代码排障任务
Workspace / Tool Results  >  User Preference

个性化推荐任务
User Memory               >  大段历史 Tool Result
```

这里还要区分 Forget 与 Context Eviction：

```text
Forget
= 一条长期 Memory 不再被视为当前有效 State

Context Eviction
= 一条仍然有效的 Memory 在这次 Context 中不值得占用 Token
```

因此，一条 Memory 本轮没有进入 Prompt，并不表示它应从 Memory Store 中遗忘或删除。

---

## D-3：Projection 与 Assembly

Memory Store 中的表示是为长期状态管理服务的：

```text
MemoryRecord {
  id
  entity
  type
  slot
  value
  scope
  confidence
  status
  source
  createdAt
  updatedAt
}
```

但 LLM 不需要看到完整的存储结构。Context Builder 需要把它投影成 LLM 可消费的表示：

```text
Memory Store Representation
            ↓
        Projection
            ↓
Memory Context Representation
```

Projection 可能执行：

- 字段裁剪。
- 多条信息合并。
- 确定性程度表达。
- Scope 标签显式化。
- 自然语言或结构化格式转换。
- Token 成本控制。

Assembly 再把 Memory Context Block 与其他 Context Source 合成最终 Snapshot：

```text
Memory Context Block
Conversation Block
Runtime State Block
Tool Result Block
Workspace Block
        ↓
Context Assembly
        ↓
Context Snapshot
```

---

## D-4：Scope 与 Priority

Scope 不是简单优先级，而是信息成立和适用的范围。

常见 Scope：

- `user`：跨项目成立的用户长期偏好或资料。
- `project`：仅在当前项目成立的事实和约束。
- `task`：仅服务当前任务的目标或临时约束。
- `session`：仅在本次会话有效的信息。

例如：

```text
User Scope:
User generally prefers React.

Project Scope:
This project uses Vue.

Task Scope:
The current task requires Angular.
```

三条信息可以同时成立。Context Builder 的目标不是选出一个“最终框架”，而是构造清楚表达当前多层 State 的 Snapshot：

```text
Current task requires Angular.
This project currently uses Vue.
The user generally prefers React.
```

Priority 则回答：

> 在当前 Query 和预算下，哪条适用信息更值得先进入 Context？

因此：

```text
Scope       = Applicability
Priority    = Context Value under Current Query
```

---

## D-5：Memory Conflict 与 Consistency

### 什么是真正的冲突

下面两条看似冲突：

```text
User prefers React.
This project uses Vue.
```

但它们 Scope 不同，所以可以共存。

真正的冲突更接近：

```text
Same Entity
+ Same Scope
+ Same Semantic Slot
+ Conflicting Value
```

例如：

```text
entity = user
scope  = user
slot   = frontend_framework_preference

value = React
vs
value = Vue
```

因此，不能只凭文本里出现不同值就判断冲突。

### 冲突优先在哪一层解决

冲突应优先由 Memory Lifecycle / Consistency 层处理：

```text
Memory Conflict
      ↓
Lifecycle / Update / Merge / Deprecate
      ↓
Consistent Memory State
      ↓
Context Builder
      ↓
Context Selection
```

Context Builder 不应该绕过 Memory State 的一致性问题，自行猜测哪条是真的。

### 三种典型处理策略

#### Update

新值明确覆盖旧值：

```text
Old: React
New: Vue

React → Deprecated
Vue   → Active
```

#### Merge

多条信息共同构成更完整状态：

```text
React experience
+ Vue experience
+ current React usage
        ↓
User has experience with React and Vue,
and currently works primarily with React.
```

#### Coexist

不同 Scope 或不同 Slot 的信息同时成立：

```text
User prefers React.
Project uses Vue.
```

---

## 冲突识别与处理判断树

```text
                 Two Memories
                      |
                      v
             Same Semantic Slot?
                /            \
              No              Yes
              |                |
           Coexist        Same Scope?
                           /       \
                         No         Yes
                         |           |
                      Coexist     Conflict
                                      |
                         +------------+------------+
                         |            |            |
                         v            v            v
                       Update       Merge       Uncertain
```

该判断树说明：

> Conflict Resolution 不是“新值永远覆盖旧值”，而是先判断 State Identity、Scope 和 Semantic Slot，再选择 Update、Merge、Coexist 或保留不确定性。

---

## Confidence、Recency、Source 与 Lifecycle

冲突无法只靠 Confidence 解决。

例如：

```text
M1: User prefers React.
confidence = 0.95
updatedAt  = 2023

M2: User prefers Vue.
confidence = 0.80
updatedAt  = 2026
source     = explicit
```

较新的 Explicit Statement 可能比旧的高置信推断更可信。

冲突判断通常要综合：

```text
Confidence
+ Recency
+ Source
+ Scope
+ Lifecycle Status
+ Temporal Relationship
```

常见 Source 强度可以概念化为：

```text
Explicit User Statement
        >
Repeated Observed Behavior
        >
Single Inference
```

但它也不是脱离时间、Scope 和业务规则的绝对排序。

Confidence 并非只用于存储 metadata，它会影响：

```text
Lifecycle
Retrieval
Ranking
Conflict Resolution
Projection
```

---

## 不确定性的 Context Projection

如果 Memory System 无法判断 React 与 Vue 哪个代表当前偏好，就不能偷偷选一个并用确定语气写入 Prompt。

更合理的投影是：

```text
The user has experience with both React and Vue;
the current preference is uncertain.
```

即：

```text
Internal Uncertainty
        ↓
Context Representation
        ↓
LLM
```

Confidence 也可以改变表述强度：

```text
High confidence:
User prefers React.

Medium confidence:
The user appears to prefer React.

Low confidence:
The user may prefer React.
```

低 Confidence 信息也可能直接被 Context Selection 淘汰，而不是始终以弱语气进入 Prompt。

所以 Memory Projection 不只是压缩，它还负责表达 epistemic status，即系统对信息确定程度的认识。

---

## Context Snapshot：Runtime World 的 LLM-facing View

Runtime 内部拥有大量状态：

```text
Runtime World
  ├── Runtime State
  ├── Memory Store
  ├── Conversation
  ├── Tool State / Results
  ├── Workspace
  └── Task State
```

LLM 不会直接看到整个 Runtime World，而是看到 Context Builder 构造出的 Snapshot：

```text
Runtime World
      ↓
Context Builder
      ↓
Context Snapshot
      ↓
LLM
```

它很像数据库 View：

```text
Database Tables
      ↓
Query / View
      ↓
Consumer-facing Representation
```

对应到 Runtime：

```text
Long-term State Database
      ↓
Lifecycle / Retrieval / Ranking
      ↓
Candidate State
      ↓
Budget / Projection / Assembly
      ↓
LLM-facing View
```

因此 Context Builder 应该是只读的表达层：

```text
Read → Select → Project → Assemble
```

它不应该借生成 Context 的机会反向修改 Memory Store。

---

## D-6：Memory Representation Compression

“Memory 已经是 Conversation 的 Summary，为什么进入 Context 时还要压缩？”

答案是：

> Memory Compression 不是再次修改长期 Memory，而是压缩当前任务需要表达给 LLM 的 Memory Representation。

更准确的名称是：

```text
Memory Representation Compression
```

变化的是：

```text
Memory Context Block
```

不变的是：

```text
Memory Store
```

---

## Runtime 中的三次压缩

Agent Runtime 中至少存在三层信息压缩：

| 阶段 | 压缩对象 | 输出 | 目的 |
| --- | --- | --- | --- |
| 第一次 | Conversation / Observation | Long-term Memory | 从经历中提炼长期 State |
| 第二次 | Retrieved Memories | Memory Context Representation | 提炼当前 Query 需要的 Memory 表达 |
| 第三次 | 所有 Context Sources | Final Prompt / Context Snapshot | 满足全局 Token Budget |

完整链路：

```text
Conversation / Observation
        ↓  第一次压缩
Long-term Memory
        ↓  第二次压缩
Query-aware Memory Context
        ↓
All Context Sources
        ↓  第三次压缩
Final Context Snapshot
```

“已经压缩过一次”只表示它适合长期保存，不表示它已经适合当前 Prompt。

---

## Retrieval 与 Compression 的边界

Retrieval 回答：

> 找哪些 Memory？

Compression 回答：

> 这些 Memory 怎样表达？

例如 Memory Store 中存在：

```text
User mainly works with React.
User has built Next.js SSR systems.
User has 7 years of frontend experience.
```

Retriever 可以把三条都召回；Projection / Compression 将它们表达成：

```text
The user is an experienced frontend engineer
with strong React and Next.js SSR experience.
```

这里 Memory 没有被修改，只生成了面向当前任务的 ViewModel。

前端类比：

```text
Redux Store
     ↓
Selector
     ↓
ViewModel
```

对应：

```text
Memory Store
     ↓
Projection
     ↓
Memory Context Block
```

---

## 三种 Compression 策略

### 1. Selection

从候选中只保留最有价值的少量信息：

```text
10 Memories
     ↓
3 Selected Memories
```

优点：简单、快速、省 Token。

风险：可能丢失多个候选之间的组合信息。

### 2. Summarization

把多条相关 Memory 总结成更紧凑的自然语言：

```text
React + Next.js + SSR
        ↓
The user has extensive React and Next.js SSR experience.
```

优点：表达自然，能融合重复信息。

风险：生成式总结可能丢失 Scope、来源或不确定性。

### 3. Structured Projection

用结构化表示保留关键字段：

```yaml
user_profile:
  role: Frontend Engineer
  primary_stack:
    - React
    - TypeScript
    - Next.js
  current_goal: Learning Agent Runtime
```

优点：边界清晰、可预测、易于 LLM 稳定消费，也更适合调试。

风险：Schema 设计过硬时可能损失自然语言中的细微语义。

工业实现通常不是三选一，而是根据 Memory Type、任务和预算组合使用。

学习会话中还用 Claude Code 的项目上下文表达作为结构化 Projection 的类比，但该部分明确属于模型知识，并非经过源码或官方资料核验的内部实现事实。正式写书时只能把它作为待验证线索，不能直接写成产品实现结论。

---

## Information Density

Compression 的目标不是“越短越好”，而是：

```text
Maximum Decision Information
Minimum Token Cost
```

即最大化信息密度：

```text
Information Density
≈
Decision-relevant Information / Token Cost
```

例如：

```text
User is a frontend engineer.
```

虽然短，但对某些任务决策信息不足。

```text
User has 7 years of frontend experience,
specializing in React, Next.js SSR and Agent Runtime.
```

虽然更长，却可能拥有更高的决策信息密度。

因此 Context Builder 不应该盲目追求最短 Summary，而应保留会改变 LLM 决策的信息。

---

## Day04 与 Day06 Compression 的区别

| 维度 | Day04 Context Compression | Day06 Memory Representation Compression |
| --- | --- | --- |
| 对象 | 整个 Context | Memory 的 Context 表达 |
| 来源 | Conversation、State、Tool、Workspace、Memory 等 | Retrieved Memories |
| 首要目标 | 满足全局 Context Window / Token Budget | 生成 Query-aware Memory Representation |
| 发生位置 | Context Builder 的全局组装阶段 | Memory 候选进入最终 Assembly 之前 |
| 是否修改源数据 | 否 | 否 |

两者最终统一到同一条链路：

```text
Memory Store
      ↓
Memory Projection / Representation Compression
      ↓
Memory Context Block
      ↓
Global Context Assembly / Compression
      ↓
Context Snapshot
```

---

## 三个工业级补充点

Part D 主干完成后，只补充以下三点，不再继续拆 D-7、D-8。

### 1. Global Context Budget 的分配职责

```text
                 Context Budget Manager
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
   Conversation        Memory         Tools
```

Memory System 提供候选和估算，Context Builder / Budget Manager 负责全局分配。Memory 不能在不知道其他 Context Source 成本的情况下，自行抢占 Prompt。

### 2. Memory Retrieval 可以进入 Runtime Loop

简单 Runtime 只在最初检索一次：

```text
User Query → Retrieve Memory → LLM
```

复杂 Runtime 可能根据新的 Observation 重新检索或重新评估：

```text
Initial Query
      ↓
Memory Retrieval
      ↓
LLM Decision
      ↓
Tool Result / New Observation
      ↓
Runtime State Changes
      ↓
Retrieval / Re-evaluation
      ↓
Next LLM Turn
```

因此 Memory 不是一次性的 Prompt Preload，而可以是 Day05 Multi Tool Loop 中动态变化的 Context Source。

### 3. Memory Context 必须可观测

线上调试必须回答：

- 为什么某条 Memory 被召回？
- 为什么它被选中或淘汰？
- 哪个 Scope 和 Priority 生效？
- 冲突如何处理？
- 投影前后消耗了多少 Token？
- 最终以什么表述进入 Context？

这要求 Runtime 保留 Memory Retrieval / Selection / Projection Trace。

---

## Part C 与 Part D 的完整链路

```text
                         Memory Store
                              |
                              v
                         State Changes
                              |
                 +------------+------------+
                 |            |            |
                 v            v            v
               Create       Update       Merge
                              |
                              v
                           Decay
                              |
                              v
                           Forget
                              |
                              v
                    Lifecycle-valid Memory
                              |
                              v
                            Scope
                              |
                              v
                         Retrieval
                              |
                              v
                           Ranking
                              |
                              v
                     Conflict Handling
                              |
                              v
                       Context Budget
                              |
                              v
                         Projection
                              |
                              v
                Representation Compression
                              |
                              v
                     Context Assembly
                              |
                              v
                     Context Snapshot
                              |
                              v
                             LLM
```

Part C 与 Part D 的边界：

```text
Part C
Memory 如何保持合理的长期状态？

Part D
长期状态如何投影成当前 Working Context？
```

---

## 职责边界与反模式

### Memory System

负责：

- Create / Update / Merge。
- Decay / Forget / Deprecate。
- State Identity 与历史记录。
- Conflict Resolution 与 Consistency。
- 提供可检索的长期 State。

### Retriever / Ranker

负责：

- 根据 Query 召回候选。
- 结合语义、关键词、metadata、recency 等信号排序。
- 输出候选及解释信号。

### Context Builder / Budget Manager

负责：

- 跨 Context Source 分配预算。
- 基于 Scope、Priority 和当前任务做选择。
- Projection、Representation Compression、Eviction、Assembly。
- 生成不可反向修改源 State 的 Context Snapshot。

### 常见反模式

- Retriever 找到什么就全部注入 Prompt。
- 把 Scope 当作固定的全局优先级。
- Context Builder 偷偷决定冲突事实的真伪。
- 只看 Confidence，不看 Recency、Source、Scope 和 Lifecycle。
- 把 Memory Compression 做成对 Memory Store 的覆盖写入。
- 追求最短文本，而不是决策信息密度。
- Memory System 自己决定整个 Context 的预算。
- 只保留最终 Prompt，不记录候选、淘汰和投影过程。

---

## 本 Part 最终设计

```text
                         Memory Store
                              |
                              v
                    +------------------+
                    | Lifecycle Filter |
                    | Create / Update  |
                    | Merge / Forget   |
                    +--------+---------+
                             |
                             v
                         Retriever
                             |
                             v
                           Ranker
                             |
                      Candidate Memories
                             |
                             v
                  +--------------------+
                  | Context Builder    |
                  |                    |
                  | Scope              |
                  | Priority           |
                  | Budget             |
                  | Conflict Status    |
                  | Projection         |
                  | Compression        |
                  | Eviction           |
                  +---------+----------+
                            |
                            v
                  Memory Context Block
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
 Conversation        Runtime State        Tool Results
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
                    Context Snapshot
                            |
                            v
                           LLM
```

最关键的边界是：

> Memory Pipeline 和 Context Builder 是两个相邻但不同的系统。前者维护和提供长期 State，后者构造当前 LLM-facing View。

---

## 本 Part 核心知识点

- Retrieval 不等于 Injection，召回只产生候选。
- Memory 只是 Context Source 之一，需要参与全局预算竞争。
- Memory Store Representation 不等于 LLM Context Representation。
- Scope 表示适用范围，Priority 表示当前任务下的 Context 价值。
- 真正冲突需要 Same Entity、Same Scope、Same Semantic Slot 和 Conflicting Value。
- 冲突优先在 Memory Lifecycle / Consistency 层处理。
- Conflict Resolution 包括 Update、Merge、Coexist 和 Uncertain。
- Confidence 需要和 Recency、Source、Scope、Lifecycle 一起使用。
- 无法消除的不确定性应该被诚实投影给 LLM。
- Context Snapshot 是 Runtime World 的 LLM-facing View。
- Forget 表示长期有效性变化，Context Eviction 只表示本轮不注入。
- Memory Compression 压缩的是 Representation，不是 Memory Store。
- Runtime 中至少存在 Conversation → Memory、Memory → Memory Context、All Context → Prompt 三次压缩。
- Retrieval 决定找什么，Compression 决定怎么表达。
- Compression 追求信息密度，而不是最短文本。
- Context Budget 由全局 Context Builder / Budget Manager 协调。
- Memory Retrieval 可以在 Runtime Loop 中重复发生。
- Retrieval、Selection、Projection 必须具备可观测性。

---

## 本 Part 核心认知升级

### 1. Memory 有效，不代表应该进入当前 Context

```text
Lifecycle Validity
        ≠
Retrieval Relevance
        ≠
Context Selection
```

### 2. Context Builder 不是 Memory 冲突仲裁器

它消费一致或显式带有不确定性的 State，而不是掩盖上游的不确定性。

### 3. Projection 是 ViewModel 构造

```text
Memory Store → Selector / Projection → Memory Context Block
```

### 4. Context 是认知投影，不是 Runtime 全量复制

LLM 看到的是经过选择和表达的 Snapshot，而不是 Runtime World 本身。

### 5. Memory Context 是 Runtime Resource Scheduling 问题

在有限 Token 下决定哪些信息值得占位、如何表达，本质上类似资源调度，而不只是自然语言总结问题。

---

## 工业级实现建议

### 候选结构

```ts
interface MemoryContextCandidate {
  memoryId: string;
  entity: string;
  slot: string;
  scope: "user" | "project" | "task" | "session";
  value: unknown;
  lifecycleStatus: "active" | "deprecated" | "forgotten";
  confidence: number;
  retrievalScore: number;
  rankingScore: number;
  estimatedTokens: number;
  sourceType: "explicit" | "observed" | "inferred";
  conflictState?: "none" | "resolved" | "uncertain";
}
```

### Projection 结果

```ts
interface MemoryContextBlock {
  content: string;
  format: "text" | "yaml" | "json";
  sourceMemoryIds: string[];
  tokenCount: number;
  uncertaintyPreserved: boolean;
}
```

### Context Builder 约束

```text
Input:
  Candidate Memories
  Current Query
  Runtime State
  Global Context Budget
  Other Context Sources

Output:
  Memory Context Block
  Selection Trace

Invariant:
  Must not mutate Memory Store
```

这些只是 Part E 实现时的起点，不在 Part D 继续展开具体算法、数据库、并发、缓存和事件溯源。

---

## 可观测性设计

建议记录以下 Trace：

```text
query
  ↓
candidate memories
  ↓
lifecycle filter result
  ↓
retrieval score
  ↓
ranking score
  ↓
scope / priority decision
  ↓
conflict state
  ↓
selected / evicted
  ↓
projection strategy
  ↓
projected tokens
  ↓
final context block
```

示例：

```json
{
  "memoryId": "mem_123",
  "retrievalScore": 0.91,
  "rankingScore": 0.84,
  "scope": "project",
  "estimatedTokens": 58,
  "projectedTokens": 32,
  "selected": true,
  "reason": "high relevance and applicable project scope"
}
```

有了 Trace，才能回答：

> Agent 为什么记住了这个，却没有使用那个？

---

## 知识地图

```text
Day04 Context Builder
  ├── Projection
  ├── Compression
  ├── Token Budget
  ├── Priority
  ├── Assembly
  └── Context Snapshot
            ↑
            |
Day06 Memory System
  ├── Part A：Memory Foundation
  ├── Part B：Write Path / Read Path
  ├── Part C：Lifecycle / State Reconciliation
  └── Part D：Memory → Working Context
            |
            v
Day05 Execution Loop
  ├── Tool Result
  ├── Observation
  ├── Runtime State Update
  └── Dynamic Re-retrieval
```

Part D 是 Day04、Day05、Day06 的连接点。

---

## 面试视角

### Q1：为什么 Retrieval 不等于把 Top-K 全部放入 Prompt？

因为 Retrieval 只负责候选召回，最终是否进入 Prompt 还取决于 Lifecycle、Scope、Priority、冲突状态、Token Cost 和其他 Context Source 的预算竞争。

### Q2：Memory Conflict 应该由谁解决？

优先由 Memory Lifecycle / Consistency 层通过 Update、Merge、Deprecate 或保留 Uncertain 处理。Context Builder 不应在缺乏证据时自行猜测。

### Q3：Memory 已经是 Summary，为什么还要压缩？

Memory 是面向长期保存的压缩结果；进入 Prompt 时还需要面向当前 Query 构造更高信息密度的 Representation。两次压缩的对象和目标不同。

### Q4：Scope 和 Priority 有什么区别？

Scope 表示信息在哪个对象和范围内成立；Priority 表示在当前任务和预算下，它有多值得进入 Context。

### Q5：Context Snapshot 是什么？

它是 Runtime World 面向当前 LLM Turn 的只读认知投影，类似数据库 View 或前端 ViewModel，而不是 Runtime 全部状态的复制。

### Q6：如何调试“Agent 为什么用了这条 Memory”？

需要记录完整的 Retrieval、Ranking、Selection、Eviction 和 Projection Trace，而不只是最终 Prompt。

---

## 思考题

1. 同一用户在个人偏好中选择 React、当前项目使用 Vue，为什么不是 Conflict？
2. 一条旧的高 Confidence Memory 与一条新的 Explicit Memory 冲突时，应该综合哪些信号？
3. Context Builder 为什么不应该反向更新 Memory Store？
4. Selection、Summarization、Structured Projection 分别适合什么场景？
5. 如何衡量 Memory Context 的 Information Density？
6. Tool Result 改变 Runtime State 后，哪些条件会触发 Memory Re-retrieval？
7. Global Context Budget 应该如何在 Conversation、Memory、Tool Results 和 Workspace 之间动态分配？
8. 如何在 Trace 中同时表达候选淘汰原因和 Projection 前后的 Token 成本？

---

## 写书 TODO

- 补充可验证的工业产品实现资料，避免仅依据模型知识描述 ChatGPT、Claude Code、Cursor 的内部实现。
- 为 Conflict Resolution 判断树增加代码示例和测试样例。
- 设计一组 Scope 相同 / 不同、Slot 相同 / 不同的对照案例。
- 进一步讨论 epistemic status 的标准化表示方式。
- 为三次压缩建立统一术语，区分 State Extraction、Representation Compression、Global Context Compression。
- 建立 Information Density 的可操作评估方法，而不只停留在概念公式。
- 补充 Dynamic Retrieval 在 Multi Tool Loop 中的触发策略。
- 将 Memory Context Trace 与后续 Runtime Observability 章节统一。
- 把“Memory Context 是 Runtime Resource Scheduling”纳入 Day04.5 工业映射候选素材。

---

## 写书素材

### 核心类比一：数据库 View

```text
Memory Store ≈ Long-term State Database
Context Snapshot ≈ LLM-facing View
```

### 核心类比二：React Selector

```text
Redux Store → Selector → ViewModel
Memory Store → Projection → Memory Context Block
```

### 核心类比三：资源调度

```text
有限 Token
   ↓
选择最有决策价值的信息
   ↓
用更低成本表达
```

### 可复用金句

> Retrieval 决定找什么，Compression 决定怎么表达。

> Context Builder 不是 Memory Store 的搬运工，而是 Runtime World 的投影器。

> Memory Compression 压缩的是当前任务下的表示，不是长期 Memory 本身。

> 不确定性不应该被隐藏，而应该成为 Context Representation 的一部分。

> Context Snapshot 是 Runtime 当前世界面向 LLM 的认知投影。

---

## Day06 之后：从理论切换到源码与构建

Day01～Day06 已经依次建立：

```text
Agent 基础认知
    ↓
Runtime 基础与架构
    ↓
Context / State / Context Builder
    ↓
工业术语映射
    ↓
Tool Calling / Execution Engine
    ↓
Memory System
```

完成 Day06 Part E 后，Day06 正式收尾，不再单独设置 Part F。原 Part F 的 Industrial Memory Mapping 目标并入 [Day07：Pi Agent 源码解剖](../day07-pi-agent-source-analysis/README.md)，然后进入：

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
从“学习 Runtime”
切换到
“源码解剖 + 构建 Agent”
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        ↓
Day07：Pi Agent 源码解剖
        ↓
Codex + Mini Agent Runtime
        ↓
RAG 工程实现（在项目中补齐）
        ↓
企业智能客服 Agent
        ↓
Data Agent
        ↓
Planning / Evaluation / Observability / Reliability
        ↓
工业级 Agent
```

### Day07：Pi Agent 源码解剖

这一阶段不再重复“Agent 是什么”，而是直接分析：

```text
真实 Runtime
    ↓
源码结构与执行链路
    ↓
为什么这样设计
    ↓
自己的 Mini Runtime 如何对应
```

它的价值是把此前分散学习的 Runtime Loop、State、Context、Tool、Memory、Human Approval 放进真实 Runtime 中验证。

### Codex + Mini Agent Runtime

使用 Codex 分析并实现自己的 Mini Agent Runtime，同时研究 Agent、Workspace、Tool、Context、Execution、Approval 和 Runtime 如何在 Coding Agent 中组合。把之前按章节拆开的能力组合成一个完整系统，而不是继续新增孤立概念：

```text
Runtime Loop
+ State
+ Context Builder
+ Tool Runtime
+ Memory
+ Human Approval
```

### RAG 的当前位置

此前 Day04 Context Builder 与 Day06 Memory 已覆盖 RAG 的 Agent 侧认知：

- RAG Architecture：已理解。
- RAG 在 Agent 中的位置：已理解。
- Retrieval Result 如何进入 Context：已理解。
- Token Budget、Priority、Context Assembly：已理解。

但还没有完整实现 RAG 前半段：

```text
Document Parsing
    ↓
Structure-aware Chunking
    ↓
Embedding
    ↓
Vector Search / Retrieval
    ↓
Reranking
```

因此当前状态不是“完全没学过 RAG”，也不是“已经完整掌握 RAG”，而是已经理解架构与 Agent 集成位置，工程实现需要通过项目补齐。

### RAG 与项目实战

RAG 不再作为一段长时间的独立理论课，而是在企业知识库或业务 Agent 中学习：

```text
Document Parsing
    ↓
Chunking
    ↓
Embedding
    ↓
Retrieval
    ↓
Reranking
    ↓
Context Assembly
    ↓
Agent
```

随后通过企业智能客服 Agent 组合 Workflow、Tool、Memory、RAG 与 Human Approval，再通过 Data Agent 把 Runtime 能力迁移到 Schema、SQL、Execution 和 Analysis 场景。

Data Agent 之后继续补齐 Planning、Evaluation、Observability、Reliability、Permission 与 Data Security，最终形成工业级 Agent 工程能力。

### 学习方式变化

Day06 之后的学习循环从“先讲完理论再动手”调整为：

```text
真实代码 / 项目
      ↓
分析架构
      ↓
Codex 实现
      ↓
运行与 Debug
      ↓
补充当前问题需要的理论
      ↓
总结认知
```

固定的工业级实现、面试视角、Pending Questions、核心认知升级、下一节计划和写书素材仍然保留。

---

## 下一节学习计划

Day06 Part D 主干已完成。

不再继续拆分 D-7、D-8；本节已经吸收三个必要的工业补充点：

1. Global Context Budget 到 Memory Budget 的分配职责。
2. Memory Retrieval 可以参与 Runtime Loop，而非只发生一次。
3. Memory Retrieval、Selection、Projection 必须具备 Observability。

下一节直接进入：

```text
Day06 Part E：Mini Memory Runtime
```

Part E 的目标是把 Day06 A-D 的理论落成一个最小可运行链路：

```text
Observation
    ↓
Memory Extraction
    ↓
Lifecycle Decision
    ↓
Memory Store
    ↓
Retrieval / Ranking
    ↓
Context Builder
    ↓
LLM
```

Part E 重点回答：

- Memory Candidate、Memory Entity 和 History 如何建模。
- Create / Update / Merge / Forget 如何由 Runtime 执行。
- Retriever 与 Ranker 如何提供可解释候选。
- Memory Context Budget 与 Projection 如何落成代码。
- Memory Trace 如何记录 Selection 和 Eviction 原因。
- Memory 如何在 Runtime Loop 中被重新检索和评估。

Part E 完成后：

```text
Day06 Memory 完成
        ↓
Day07：Pi Agent 源码解剖
```

不再单独进入 Part F。原 Part F 的工业映射任务改为在 Pi Agent 阶段通过真实源码完成。

## 最终一句话

> Part C 让 Memory 成为可演化的长期 State；Part D 则让这些 State 在当前 Query、Scope、Priority 和 Token Budget 下，被一致、诚实且高信息密度地投影成 LLM 可消费的 Context Snapshot。
