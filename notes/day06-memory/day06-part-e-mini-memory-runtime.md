# Day06 Part E 学习文档 v1.0：Mini Memory Runtime Implementation

> 本文是《从零实现 Agent Runtime》学习阶段的 Day06 Part E 正式学习文档，也是 Day06 Memory System 的收尾章节。
>
> Part A 建立 Memory 基础模型，Part B 拆解读写架构，Part C 讨论长期状态的生命周期，Part D 说明 Memory 如何经由 Context Builder 进入当前推理。Part E 将这些抽象连成一个 Mini Memory Runtime，并进一步补齐生产环境中的并发、幂等、一致性、降级、可观测性与真实 Agent 映射。
>
> 学习来源：[Day06 Part E：Mini Memory Runtime Implementation（需登录）](https://chatgpt.com/c/6a8e5d9f-f66c-83ee-b67e-56a3c5fadc83)

---

## 本节定位

Part A～D 解决的是 Memory System 各个局部职责，Part E 解决的是：

> 这些职责怎样在一次 Agent Run 中形成可运行、可演进、可治理的长期状态闭环？

本节核心结论是：

> Memory 不是 Runtime 外挂的数据库功能，而是 Runtime State Lifecycle 跨 Run、跨 Session 的延伸。Mini Runtime 的价值是验证主链路；工业化的重点则会从“AI 怎么抽取”逐步转向并发控制、可靠性语义、数据治理和可观测性。

---

## 目录

1. Part E 的目标与范围
2. Mini Memory Runtime 完整架构
3. Read Path 与 Write Path
4. Candidate、Matcher 与 Decision Engine
5. CREATE / UPDATE / MERGE / IGNORE
6. Canonical Memory、Version 与 Audit
7. 并发更新与乐观锁
8. Idempotency 与 Semantic Deduplication
9. Critical Path 与 Best-effort Side Effect
10. 同步、异步与 Read-after-write Consistency
11. Graceful Degradation 与依赖策略
12. Provenance、False Memory 与 Write Policy
13. Observability 与 Metrics
14. 教学版 `run()` 与事件驱动演进
15. Demo 与 Production 的边界
16. 真实 Agent 中的职责映射
17. Chat Assistant 与 Coding Agent 的 Memory
18. Memory、Workspace Index、Checkpoint 与 Summary
19. Episodic、Semantic 与 Procedural Memory
20. Memory 与 Source of Truth
21. Day04～Day06 的统一 Runtime
22. 本 Part 核心知识点
23. 本 Part 核心认知升级
24. 工业级实现建议
25. 知识地图
26. 面试视角
27. 思考题
28. 前置问题回收
29. 写书 TODO
30. 写书素材
31. 下一阶段学习计划

---

## Part E 的目标与范围

Part E 的学习主线可以概括为：

```text
E-1  Mini Memory Runtime 架构
E-2  Read / Write Lifecycle
E-3  CREATE / UPDATE / MERGE / IGNORE
E-4  Retrieval Scoring
E-5  TypeScript Mini Runtime
E-6  工业级失败与一致性
E-7  真实 Agent 映射与总体收束
```

Mini Runtime 第一版不追求一次性实现生产系统，而是验证：

```text
长期状态能否被取回
        ↓
能否正确进入当前 Context
        ↓
Run 完成后能否抽取新 Candidate
        ↓
能否与旧状态协调
        ↓
能否形成新的 Canonical Memory
```

第一版使用同步、单进程和 InMemory Store 完全合理。工业级思维不等于第一天就引入 Kafka、Redis、PostgreSQL、Vector DB 和 Worker。

---

## Mini Memory Runtime 完整架构

最终主链路为：

```text
                    Agent Runtime
                         │
                         ▼
                Memory Retrieval
                         │
                         ▼
                 Context Builder
                         │
                         ▼
                        LLM
                         │
                         ▼
                Memory Extraction
                         │
                         ▼
                Memory Candidate
                         │
                         ▼
                 Memory Matcher
                         │
                         ▼
                Decision Engine
       CREATE / UPDATE / MERGE / IGNORE
                         │
                         ▼
                   Memory Store
                         │
                         ▼
               Version / Audit / Trace
```

将 Tool Calling 纳入后，一次完整 Run 可以表达为：

```text
User Request
    ↓
Runtime State
    ↓
Memory Hydration
    ↓
Context Builder
    ↓
LLM
    ├─ Tool Call → Observation → State Update → ReAct Loop
    └─ Final Answer
            ↓
       Run Completed
            ↓
     Memory Extraction
            ↓
      Reconciliation
            ↓
      Persist Memory
```

这里的关键不是类名，而是职责边界。真实系统可能没有 `MemoryMatcher` 或 `MemoryDecisionEngine` 这些同名类，但只要支持长期学习，就必须有某个位置负责匹配、判断和改变长期状态。

阅读真实源码时，应持续追问：

```text
Who owns it?
Who decides it?
Who changes state?
```

---

## Read Path 与 Write Path

### Read Path

```text
Query / Runtime State
        ↓
Memory Retriever
        ↓
Candidate Memories
        ↓
Ranking / Filtering
        ↓
Context Projection
        ↓
Current LLM Context
```

Read Path 关注的是：当前 Run 需要哪些长期状态，以及这些状态怎样被投影成模型可消费的信息。

### Write Path

```text
Conversation / Observation / Run Result
        ↓
Memory Extractor
        ↓
Memory Candidate
        ↓
Match Existing State
        ↓
Reconciliation Decision
        ↓
Canonical Memory + History
```

Write Path 关注的是：哪些新信息值得升级为长期状态，以及它与已有状态是什么关系。

两条链路不能混成一个简单的 `save()`：Read 追求当前相关性，Write 追求长期准确性，两者的风险和阈值不同。

---

## Candidate、Matcher 与 Decision Engine

Extractor 的输出不是最终 Memory，而只是候选：

```text
Conversation
    ↓
MemoryCandidate
    ≠
Canonical Memory
```

一个候选至少应保留：

```ts
interface MemoryCandidate {
  id: string
  type: MemoryType
  content: string
  confidence: number
  sourceRunId: string
  evidence?: {
    sourceMessageId: string
    quote?: string
  }
}
```

Matcher 负责找出可能属于同一状态槽位的旧 Memory；Decision Engine 再结合 `entity`、`type`、`slot`、`scope`、`temporal signal`、`confidence` 和语义关系做最终判断。

Similarity 只能回答“像不像”，不能单独回答“是不是同一个状态”。

---

## CREATE / UPDATE / MERGE / IGNORE

### CREATE

没有对应的长期状态，且候选具备足够的长期价值与可信度时，新建 Canonical Memory。

### UPDATE

候选与已有 Memory 属于同一实体、同一 Scope 和同一语义 Slot，但值发生变化时，更新当前状态并增加版本。

### MERGE

候选与已有 Memory 不是简单替换关系，而是互补信息时，合成为更完整的当前状态。

### IGNORE

候选重复、临时、低可信、缺少证据、已处理或不值得长期保存时忽略。

判断流程可以简化为：

```text
Candidate
   ↓
是否已有同一 State Identity？
   ├─ 否 → 是否值得长期保存？ → CREATE / IGNORE
   └─ 是
       ↓
   是替换、补充还是重复？
       ├─ 替换 → UPDATE
       ├─ 补充 → MERGE
       └─ 重复/低价值 → IGNORE
```

---

## Canonical Memory、Version 与 Audit

Memory Store 不应只有一堆不可解释的文本。更稳妥的模型是：

```text
Canonical Current State
        +
Version History
        +
Memory Event / Audit Log
```

Canonical Memory 服务未来 Retrieval；Version 和 Audit 服务并发控制、调试、回滚、治理和来源追踪。

```ts
interface Memory {
  id: string
  version: number
  entity: string
  type: MemoryType
  slot?: string
  value: unknown
  scope: string
  confidence: number
  status: "active" | "archived" | "expired"
  updatedAt: number
}
```

---

## 并发更新与乐观锁

同一个用户、同一个 Memory Key 被并发修改时，可能发生 Lost Update：两个 Run 都读取旧版本，随后最后一次写入覆盖前一次结果。

Memory 是长期状态，因此并发问题已经不是 LLM 特有问题，而是标准状态一致性问题。

常见解法是 Optimistic Concurrency Control：

```sql
UPDATE memory
SET content = ?, version = version + 1
WHERE id = ? AND version = ?;
```

如果 `affectedRows = 0`，说明读取后已有其他写入发生。Manager 应重新执行：

```text
read
  ↓
reconcile
  ↓
retry
```

Memory 适合乐观锁，是因为“同一用户 + 同一状态槽位 + 完全同时修改”通常不是高频事件，没有必要在每次读取时长期持有数据库锁。

---

## Idempotency 与 Semantic Deduplication

这两个概念不能混淆。

### Idempotency

处理同一个操作因为网络重试、事件重放等原因被执行多次：

```text
同一操作执行 1 次或 10 次
最终状态相同
```

可以使用：

```ts
const idempotencyKey = `${runId}:${candidate.id}`
```

并在持久层建立唯一约束：

```sql
UNIQUE(idempotency_key)
```

### Semantic Deduplication

处理不同 Run 在不同时间产生了语义重复的信息，例如“我喜欢 TypeScript”和“TypeScript 是我的默认语言”。

```text
Idempotency
= execution-level duplicate protection

Deduplication
= semantic-level duplicate protection
```

前者依赖操作身份，后者依赖语义、结构化槽位和生命周期判断。

---

## Critical Path 与 Best-effort Side Effect

主 LLM 已经生成回答后，如果 MemoryExtractor 超时，不一定应该让整个请求返回失败。

对个性化 Memory 来说，常见语义是：

```text
Main Response
= Critical Path

Memory Update
= Best-effort Side Effect
```

Memory Pipeline 失败时记录日志并跳过写入，用户仍能得到正常回答。

但不能把所有 Memory 都当成 Best Effort。若用户明确要求“永久记录审批结论”，持久化本身就是业务结果，Store 失败不能假装成功。

因此应区分：

```text
Personalization Memory
→ best effort

Business-critical State
→ strong persistence guarantee
```

这不是简单的 `try/catch` 问题，而是 Reliability Semantics。

---

## 同步、异步与 Read-after-write Consistency

如果把 Extraction 和 Commit 全部放在主响应之前：

```text
Main LLM 800ms
Memory Extractor 700ms
Memory Commit 200ms
总响应时间 1.7s
```

用户其实在 800ms 时已经具备拿到答案的条件。因此生产系统常把 Memory Write 移出主响应 Critical Path：

```text
Run Completed
    ├─ Return Final Answer
    └─ Emit Event → Memory Worker → Memory Store
```

但异步化会引入 Eventual Consistency。下一轮请求可能在上一次 Memory Commit 完成前到达，导致刚写入的信息不可见。

一种解决方式是 Session Pending Memory：

```text
Run 1 产生 Candidate
        ↓
立即放入 Session Pending State
        ↓
后台持久化

Run 2 Context
= Persisted Memory + Pending Memory
```

另一种方式是 Policy-driven Persistence：

```text
明确且关键的用户偏好 → sync
弱推断、低优先级信息   → async
```

异步化降低延迟，但一致性、重试、顺序和重复消费成本会随之出现。

---

## Graceful Degradation 与依赖策略

Memory Store 不可用时，是否允许 Agent 继续运行取决于当前任务是否依赖 Memory。

```ts
interface MemoryRetrievalPolicy {
  required: boolean
}
```

- `required = false`：检索失败后使用空 Memory，记录告警并继续运行。
- `required = true`：明确告诉上层“所需历史状态暂时不可用”，不能让模型猜测。

这对应：

```text
Optional Dependency
vs
Required Dependency
```

Graceful Degradation 不是无条件吞错，而是在业务允许的边界内保留核心能力。

---

## Provenance、False Memory 与 Write Policy

Extractor 也会产生幻觉。例如用户只说“最近在看 Rust”，Extractor 却把它升格为“未来项目偏好 Rust”。

候选应同时记录：

- explicitness：信息是否明确表达。
- confidence：抽取结果可信度。
- durability：是否具有长期价值。
- source：来自用户、助手、工具还是业务系统。
- evidence：可追溯的原始消息或事件。

这就是 Memory Provenance。

Memory Read 错一次通常影响一轮，而 Memory Write 错一次可能污染未来几十轮。因此：

> Write Policy 应比 Retrieval Policy 更保守；读可以适当追求 Recall，写必须优先保证 Precision。

可采用更严格的写入阈值：

```text
explicit user + high confidence → auto commit
assistant inference            → stricter threshold
low confidence                 → ignore
high-risk state                → human approval
```

好的 Memory System 不是记得越多越好，而是记得越准越好：

```text
Good Memory
= Selective Remembering
+ Selective Forgetting
```

---

## Observability 与 Metrics

Memory 不应是独立黑盒，而应进入统一 Agent Trace：

```text
Run Trace
├─ Context Trace
├─ LLM Trace
├─ Tool Trace
└─ Memory Trace
   ├─ Retrieval
   ├─ Selection / Projection
   ├─ Extraction
   ├─ Matching / Reconciliation
   └─ Persistence
```

一次 Memory Trace 至少可以记录：

- Run ID、Query 与用户/会话范围。
- Retrieved、Filtered 与 Injected Memory。
- Candidate、Match、Decision 与 Reason。
- Commit 结果、版本与重试次数。
- 各阶段延迟与错误。

建议关注的指标包括：

```text
memory_retrieval_latency
memory_hit_rate
memory_usage_rate
memory_extraction_latency
memory_candidate_count
memory_create_count
memory_update_count
memory_merge_count
memory_ignore_count
memory_commit_failure_count
false_memory_rate
```

其中 `memory_usage_rate` 能帮助判断 Retriever 是否召回过宽；`false_memory_rate` 则直接衡量长期状态污染风险。

---

## 教学版 `run()` 与事件驱动演进

教学版可以保持同步实现，但需要在架构上识别主响应与 Memory Pipeline 的边界：

```ts
async run(input: RunInput) {
  const state = this.createRuntimeState(input)

  try {
    state.memories = await this.memoryRetriever.retrieve({
      userId: input.userId,
      query: input.input
    })
  } catch (error) {
    this.logger.warn("memory retrieval failed", error)
    state.memories = []
  }

  const context = await this.contextBuilder.build(state)
  const response = await this.llm.generate(context)
  state.finalResponse = response

  try {
    const candidates = await this.memoryExtractor.extract({
      runtimeState: state
    })

    state.pendingMemories.push(...candidates)

    await this.memoryManager.commit({
      runId: state.runId,
      userId: input.userId,
      candidates
    })
  } catch (error) {
    this.logger.error("memory pipeline failed", {
      runId: state.runId,
      error
    })
  }

  return response
}
```

规模扩大后可以演进为：

```text
Agent Runtime
    ├─ Final Response
    └─ RunCompletedEvent
             ↓
        Message Queue
             ↓
        Memory Worker
             ↓
 Extract / Match / Reconcile
             ↓
        Memory Store
```

事件驱动带来吞吐和解耦，也同时带来幂等、顺序、一致性、重试和分布式追踪问题。

---

## Demo 与 Production 的边界

| 能力 | Mini Runtime | 工业级系统 |
| --- | --- | --- |
| Store | `Map` / InMemory | DB / KV / Vector Store |
| 并发 | 暂不处理 | Optimistic Lock |
| 幂等 | 暂不处理 | Idempotency Key / Unique Constraint |
| 重复 | 简单结构判断 | Semantic Deduplication |
| Extraction | Rule 或简单 LLM | LLM + Rule + Evidence |
| Commit | 同步 | Sync / Async Policy |
| 异常 | 直接抛出 | Graceful Degradation |
| Audit | 无或简单日志 | Version + Event Log |
| Trace | Console | Distributed Trace |
| 写入策略 | 简单阈值 | Risk / Confidence / Approval Policy |
| 一致性 | 单进程即时可见 | Read-after-write / Eventual Consistency |

合理演进顺序是：

```text
InMemory Demo
    ↓
Persistent Store
    ↓
Optimistic Lock + Idempotency
    ↓
Async Queue + Worker
    ↓
Distributed Tracing + Governance
```

---

## 真实 Agent 中的职责映射

真实系统不一定拥有和教学模型完全相同的类，但以下职责几乎一定存在：

- 长期状态落在某种 Store、Profile Service 或文件系统中。
- 当前 Run 需要决定取回哪些历史状态。
- 长期状态需要被选择、格式化和投影到当前 Context。
- 系统需要判断什么值得记、何时记、是新增还是更新。

教学中显式拆出的 `MemoryMatcher`、`MemoryDecisionEngine` 和 `MemoryManager`，在真实项目中可能被合并进一个 `memoryService.updateFromConversation()`，也可能由一个结构化 LLM 调用完成。

因此源码映射要看职责，而不是搜同名类。

---

## Chat Assistant 与 Coding Agent 的 Memory

Chat Assistant 更常见的是：

- 用户偏好。
- 跨会话稳定事实。
- 长期目标。
- 需要按需检索的历史经历。

Coding Agent 更关心：

- Repository / Workspace State。
- Project Instructions 与 Coding Conventions。
- Previous Decisions 与 Learned Constraints。
- Session Summary、Task History 和项目级操作规则。

更通用的定义是：

> Memory 是在当前 Run 之外仍需要存活，并可能在未来决策中被重新使用的状态。

它不等于“用户画像”。Project Decision、Repository Knowledge、Session Summary 和 Learned Constraint 都可能是 Memory。

---

## Memory、Workspace Index、Checkpoint 与 Summary

### Workspace Index

回答“当前外部工作空间里有什么”，例如文件、符号、引用和代码关系。

### Memory

回答“过去运行过程中有哪些长期状态值得未来继续使用”，例如用户决定后续统一使用 pnpm。

### Checkpoint

服务执行恢复：

```text
Checkpoint = Execution Recovery State
```

例如 Tool Approval 暂停后恢复原 Runtime。

### Conversation Summary

主要解决 Context Window，是一种 Compression Artifact；它可以成为 Memory 的来源，也可能被系统当作 Episodic Memory 使用。

这些数据可以存放在同一个数据库中，但语义和生命周期不同。

---

## Episodic、Semantic 与 Procedural Memory

| 类型 | 主要回答 | 示例 |
| --- | --- | --- |
| Episodic Memory | 发生过什么 | 上周用户要求项目迁移到 pnpm |
| Semantic Memory | 现在知道什么 | 该项目默认使用 pnpm |
| Procedural Memory | 以后应该怎么做 | 修改后必须执行 lint 和 test |

教学版的 `preference / fact / goal / experience` 只是起点。生产系统的 Memory Schema 应服务具体业务，可以设计为 Profile、Project、Customer Preference、Service History、Risk Constraint 等类型，而不是机械套用论文分类。

---

## Memory 与 Source of Truth

Memory 不能替代权威业务数据源。

```text
用户稳定偏好       → Memory
订单实时状态       → Order Service
账户余额           → Account Service
库存               → Inventory Service
企业制度与产品文档 → Knowledge Base / RAG
```

动态业务事实如果被长期缓存为 Canonical Memory，很容易因过期而产生错误答案。

不同 Memory 还需要不同的 Freshness Policy：

```ts
type FreshnessPolicy =
  | "stable"
  | "session"
  | "ttl"
  | "source_refresh"
```

例如语言偏好可能长期稳定，当前位置只适合小时级 TTL，当前分支只在 Session 内有效，订单状态则应始终回源查询。

企业知识库也不应被简单等同为 Memory：两者都可能经过 Retrieval 进入 Context，但前者是 External Knowledge，后者是 Learned Long-term State。

---

## Day04～Day06 的统一 Runtime

```text
                       User Request
                            │
                            ▼
                       Runtime State
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
   Conversation State  Workspace State   Memory State
          └─────────────────┼─────────────────┘
                            ▼
                      Context Builder
          Projection / Assembly / Compression
                            │
                            ▼
                       Provider Adapter
                            │
                            ▼
                           LLM
                     ┌──────┴──────┐
                     ▼             ▼
                  Tool Call    Final Answer
                     │
                     ▼
               Tool Executor
                     │
                     ▼
                 Observation
                     │
                     ▼
               Runtime State / Loop
                     │
                     ▼
                 Run Completed
                     │
                     ▼
              Memory Consolidation
```

Day04、Day05、Day06 最终都汇入同一个循环：

```text
State
  ↓
Context
  ↓
Decision
  ↓
Action
  ↓
Observation
  ↓
State Update
  ↓
Loop
```

Memory 位于循环两端：它从 Long-term State 进入当前 Context，也从 Run Result 接收新的长期状态。

---

## 本 Part 核心知识点

- Mini Memory Runtime 连接 Retrieval、Context、LLM、Extraction、Reconciliation 与 Persistence。
- Candidate 不等于 Canonical Memory，Extractor 不能直接写最终状态。
- CREATE / UPDATE / MERGE / IGNORE 是长期状态协调，而不是普通 CRUD。
- Similarity 不能单独决定 State Identity。
- Canonical State、Version History 和 Audit Event 应分层考虑。
- 乐观锁解决并发 Lost Update，幂等键解决重复执行。
- Idempotency 与 Semantic Deduplication 处在不同层级。
- 个性化 Memory 通常是 Best-effort Side Effect，业务关键状态可能需要强持久化。
- 异步写入降低响应延迟，但会引入 Eventual Consistency 和 Read-after-write 问题。
- Memory Store 故障是否可降级，取决于它是 Optional 还是 Required Dependency。
- Provenance 让 Memory 能被追溯，False Memory Rate 衡量长期污染风险。
- Write Policy 应比 Retrieval Policy 更保守。
- Memory 是 Long-term State，Context 是 Current Inference Snapshot。
- Memory 不等于 Chat History、Vector DB、Knowledge Base 或 Source of Truth。
- Memory 可以 Agent 化，但不意味着必须独立成为 Agent。

---

## 本 Part 核心认知升级

学习前容易把 Memory 理解为：

```text
Conversation
    ↓
Embedding
    ↓
Vector DB
    ↓
Search
```

学习后应升级为：

```text
Long-term State
      ↓
Retrieval / Ranking
      ↓
Context Projection
      ↓
Agent Runtime
      ↓
Extraction
      ↓
Candidate + Evidence
      ↓
Matching / Reconciliation
      ↓
Canonical Memory
      ↓
Version / Audit / Expire
```

最终结论：

> Memory 不是一个数据库模块，而是一套 Long-term State Lifecycle。

---

## 工业级实现建议

生产级 Memory System 可以按五个维度演进：

```text
Storage
├─ Structured Profile Store
├─ Semantic Memory Store
└─ History / Event Log

Retrieval
├─ Keyword / BM25
├─ Embedding
├─ Metadata Filter
├─ Hybrid Retrieval
└─ Re-ranking

Lifecycle
├─ Extraction
├─ Deduplication
├─ Conflict Detection
├─ Reconciliation
├─ Versioning
├─ Expiration
└─ Forgetting

Reliability
├─ Idempotency
├─ Optimistic Lock
├─ Retry
├─ Graceful Degradation
└─ Eventual Consistency

Governance & Observability
├─ Permission / Human Approval
├─ Provenance / Audit
├─ Source of Truth Boundary
├─ Retrieval / Decision / Commit Trace
└─ False Memory Monitoring
```

Mini Runtime 第一版只实现 InMemory Store、Simple Retriever、Simple Extractor 和 Rule Decision 即可。先验证闭环，再依据真实瓶颈增加复杂度。

---

## 知识地图

```text
Memory System
├─ Read Path
│  ├─ Retrieval
│  ├─ Ranking
│  ├─ Selection
│  └─ Context Projection
├─ Write Path
│  ├─ Extraction
│  ├─ Candidate
│  ├─ Matching
│  ├─ Reconciliation
│  └─ Persistence
├─ Lifecycle
│  ├─ CREATE / UPDATE / MERGE / IGNORE
│  ├─ ARCHIVE / EXPIRE / DELETE
│  ├─ Version
│  └─ Audit
├─ Reliability
│  ├─ Optimistic Lock
│  ├─ Idempotency
│  ├─ Sync / Async
│  └─ Graceful Degradation
└─ Governance
   ├─ Evidence / Provenance
   ├─ Freshness
   ├─ Permission / Approval
   ├─ Source of Truth
   └─ Observability
```

---

## 面试视角

### Q1：Agent Memory 是什么？

Agent Memory 是 Runtime 的长期状态管理能力。它从用户交互、Tool Observation 和运行状态中提取长期有价值的信息，经过去重和 Reconciliation 后持久化；在后续 Run 中根据当前任务做 Retrieval 和 Ranking，再由 Context Builder 投影到当前模型上下文。

### Q2：Memory 是不是 Vector DB？

不是。Vector DB 只是 Semantic Retrieval 的一种基础设施。Memory 还包括 Extraction、Lifecycle、Conflict Resolution、Versioning、Expiration、Permission、Provenance 和 Observability。

### Q3：Memory 与 Context 有什么区别？

Memory 是跨 Run 或跨 Conversation 存活的长期状态；Context 是为某一次模型推理重新构建的当前快照。

### Q4：Memory 与 RAG 有什么区别？

两者可以共享 Embedding、Vector Search 和 Reranking，但目标不同。RAG 主要检索外部知识，Memory 主要维护用户、Agent、Session 或 Project 的长期状态，并更关注状态演进、冲突、Confidence、Recency 和 Lifecycle。

### Q5：Memory 如何处理并发更新？

使用 Version 和 Optimistic Lock 检测 Lost Update；版本冲突后重新读取、Reconcile 并按策略重试，同时保留 Audit History。

### Q6：Memory 写入失败是否应该让 Agent 请求失败？

取决于可靠性语义。个性化 Memory 通常是 Best-effort Side Effect，可以记录错误并降级；关键业务状态则可能要求同步或强持久化，失败必须明确上报。

### Q7：Idempotency 和 Deduplication 有什么区别？

Idempotency 处理同一个操作被重复执行；Deduplication 处理不同操作产生语义重复状态。前者偏执行层，后者偏语义与生命周期层。

---

## 思考题

1. “Java 项目只能继续用 Java，但我个人更喜欢 TypeScript”应该形成一个 UPDATE，还是两个 Scope 不同的 Memory？
2. `package.json` 中声明 `packageManager = "pnpm"` 时，应写 Project Memory，还是每次读取 Source of Truth？
3. “我今天人在东京”更适合 Runtime State、Conversation State，还是带 TTL 的 Long-term Memory？
4. Retriever 召回 10 条而 Context Builder 只注入 3 条，为什么这两个阶段不应该合并？
5. 为什么 Memory 系统通常宁可漏记，也不能错误记忆？
6. 当异步 Commit 与下一轮请求发生竞态时，Session Pending Memory 需要如何去重和失效？

---

## 前置问题回收

### Memory 本身是不是也可以是一个 Agent？

可以 Agent 化。它内部可以拥有 Retrieval、LLM Judgment、Policy、Tool、Reconciliation 与 Loop；但在主 Agent 架构中通常仍是负责长期状态管理的子系统。

### Memory Update 后会不会保留旧数据？

可以采用 `Canonical Current Memory + Version History + Memory Event Log`，同时服务当前推理、审计、调试和回滚。

### Similarity 是否会随着 Prompt 改变？

会。`similarity = f(query, memory)`，它是 Query 与 Memory 的动态关系，不是 Memory 自身固定属性。最终排序还会结合 Importance、Recency、Confidence、Scope 和 Source。

### Memory 与 Context Builder 如何配合？

```text
Memory Store
    ↓
Retriever
    ↓
Relevant Memory
    ↓
Context Builder
    ↓
Projection
    ↓
Current LLM Context
```

Memory 保存长期状态，Context Builder 决定这些状态本轮如何被模型看到。

---

## 写书 TODO

- 将 Day06 整理为“Memory：Agent 如何拥有长期状态”独立章节。
- 保留完整 TypeScript Mini Memory Runtime，避免退化成 Vector DB / RAG 教程。
- 增加一组并发更新、重复事件、异步一致性和 False Memory 的测试案例。
- 用真实 Coding Agent 源码验证 State、Persistence、Compaction 与 On-demand Retrieval 的职责归属。
- 补充 Memory Permission、删除权、隐私边界和企业数据治理案例。
- 对比 Profile Memory、Project Memory、Episodic Memory 和 Procedural Memory 的 Schema。

---

## 写书素材

可作为正文核心观点的表达：

> Memory 不是聊天记录，而是过去信息经过筛选后，对未来决策仍然有价值的长期状态。

> Memory 是长期状态，Context 是这份长期状态在当前 Run 中的一次投影。

> Vector DB 解决相似语义检索，Memory System 解决长期状态生命周期。

> Similarity 回答“像不像”，Retrieval Ranking 回答“现在值不值得取”，Context Builder 回答“取出后是否应该进入本轮 Context”。

> Memory Read 错一次可能影响一轮推理；Memory Write 错一次可能污染未来几十轮推理。

> Memory 不能替代 Source of Truth。

> Memory 系统真正的问题不是“怎么存”，而是什么值得存、何时存、怎样与旧状态协调、何时取、取哪些、何时失效，以及如何追溯。

---

## 下一阶段学习计划

Day06 Memory System 至此完成。下一阶段从学习 Runtime 零件切换为：

```text
Day07：Pi Agent 源码解剖
        ↓
建立真实 Agent Runtime 全局地图
        ↓
Codex + TypeScript / Node
实现自己的 Mini Agent Runtime
        ↓
在项目中补齐 RAG
        ↓
企业智能客服 Agent
        ↓
Data Agent
```

阅读 Pi Agent 时先建立架构地图，再定位：

- Agent Loop 在哪里。
- Runtime State 由谁维护。
- Context 如何构建。
- Tool 如何注册、执行与回流。
- Provider 如何适配。
- Session 和 Persistence 如何处理。
- Compaction、Summary 与 On-demand Retrieval 在哪里。
- Streaming 如何穿过整个 Runtime。

继续沿用：

```text
Architecture First
        ↓
Lifecycle
        ↓
Critical Path
        ↓
Source Code
```

---

## Day06 最终结论

Day06 已形成完整闭环：

```text
Memory Basics
    ↓
Memory Architecture
    ↓
Memory Lifecycle
    ↓
Memory × Context Builder
    ↓
Mini Memory Runtime
    ↓
Reliability / Consistency / Governance
```

最需要带走的五个判断是：

1. Memory 不等于 Chat History。
2. Memory 不等于 Vector DB。
3. Memory 不等于 Context。
4. Memory 不等于 Source of Truth。
5. Memory 的本质是 Long-term State Lifecycle。
