# Day07 / Part VI：Pi Agent 源码解剖

Day07 进入 Part VI：Pi Agent 源码解剖，把学习方式从“先学习抽象理论”切换为“阅读真实源码、解释设计原因、映射已有知识、反推 Mini Runtime 实现”。

Pi Agent 在这里不是要照搬的框架，而是一个真实 Runtime 解剖样本。学习时始终沿着下面这条主线推进：

```text
真实 Runtime
    ↓
源码调用链
    ↓
设计原因与职责边界
    ↓
对照 Day01～Day06
    ↓
反推 mini-agent-runtime
```

## 学习计划

- [x] 会话 1：Part VI-A + Part VI-B
  - Part VI-A：Pi Agent 架构地图
  - Part VI-B：Runtime Loop
- [x] 会话 2：Part VI-C + Part VI-D
  - Part VI-C：Pi Agent State
  - Part VI-D：Context Builder / Message Projection
- [x] 会话 3：Part VI-E + Part VI-F + Part VI-G
  - Part VI-E：Tool Definition / Registry
  - Part VI-F：Tool Execution Pipeline
  - Part VI-G：Observation / Multi-Tool Flow
- [x] 会话 4：Part VI-H + Part VI-I + Part VI-J
  - Part VI-H：Runtime Control（运行时控制）
  - Part VI-I：Streaming & Event Protocol（流式与事件协议）
  - Part VI-J：Human Approval Boundary（人工审批边界）
- [x] 会话 5：Part VI-K + Part VI-L + Part VI-M
  - Part VI-K：Session Persistence & Context Reconstruction（会话持久化与上下文重建）
  - Part VI-L：Dynamic Runtime Configuration（动态运行时配置）
  - Part VI-M：Pi Agent Runtime Boundary & Mini Runtime Extraction（Pi Agent 运行时边界与 Mini Runtime 反推）

## 文件

- Day07 会话 1：架构地图与 Runtime Loop
  - [Markdown 主版本](day07-session-01-architecture-and-runtime-loop.md)
  - [ChatGPT 会话源记录](source/day07-session-01-chatgpt-source.md)
- Day07 会话 2：State 与 Context / Message Projection
  - [Markdown 主版本](day07-session-02-state-and-context-projection.md)
  - [ChatGPT 会话源记录](source/day07-session-02-chatgpt-source.md)
- Day07 会话 3：Tool 系统、执行管线与 Observation
  - [Markdown 主版本](day07-session-03-tool-system-execution-and-observation.md)
  - [ChatGPT 会话源记录](source/day07-session-03-chatgpt-source.md)
- Day07 会话 4：运行时控制、事件协议与人工审批边界
  - [Markdown 主版本](day07-session-04-runtime-control-events-and-human-approval.md)
  - [ChatGPT 会话源记录](source/day07-session-04-chatgpt-source.md)
- Day07 会话 5：会话重建、动态配置与 Mini Runtime 反推
  - [Markdown 主版本](day07-session-05-session-reconstruction-dynamic-runtime-and-mini-runtime-extraction.md)
  - [ChatGPT 会话源记录](source/day07-session-05-chatgpt-source.md)

> 日常学习只生成和维护 Markdown；PDF / DOCX 留到阶段性整理时统一导出。

## 源码阶段固定收尾规则

每个小 Part 正常讲解，但以下栏目按“会话”统一整理一次，避免重复：

1. 下一节学习计划
2. 写书 TODO
3. 写书素材
4. 本会话核心认知升级
5. 工业级实现
6. 知识地图
7. 面试视角
8. 本章思考题
9. 前置问题回收
10. 源码定位清单

其中“源码定位清单”是源码学习阶段新增的固定栏目，用来建立“架构认知 → 文件 → 类型 / 函数”的可回溯映射。
