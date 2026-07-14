# Day3：Runtime Architecture

Day3 解决的是 Runtime 的整体架构设计问题：

> Runtime 不应该是一个“大而全”的万能类，而应该是整个 Agent 系统的 Orchestrator。

Day3 会被拆成多个小节，统一放在当前目录下平铺管理。

## 文件

- Day03-01：Runtime Architecture Design Principles
  - [Markdown 主版本](day03-01-runtime-architecture-design-principles.md)
  - [PDF 阅读版](day03-01-runtime-architecture-design-principles.pdf)
  - [DOCX 可编辑版](day03-01-runtime-architecture-design-principles.docx)
- Day03-02：Runtime Core Components
  - [Markdown 主版本](day03-02-runtime-core-components.md)
  - [PDF 阅读版](day03-02-runtime-core-components.pdf)
  - [DOCX 可编辑版](day03-02-runtime-core-components.docx)

## Day3 拆分计划

- `day03-01-runtime-architecture-design-principles.md`：架构设计原则
- `day03-02-runtime-core-components.md`：核心组件设计
- `day03-03-conversation-message-data-model.md`：Conversation 与 Message 数据模型
- `day03-04-runtime-architecture-diagram.md`：架构图与调用时序

## 核心内容

- Runtime 为什么应该是 Orchestrator
- Runtime 第一版核心组件：Runtime、Conversation、Message、ContextBuilder、LLMClient、ToolRegistry
- ContextBuilder 为什么更像 Context Compiler，而不是 Prompt Builder
- Domain Model 与 Domain Service 在 Runtime 组件中的分类
- Ownership、State Boundary 与 Tell, Don't Ask
- Agent Runtime 中的职责边界
- 副作用应该归属于拥有职责的对象
- Dependency Direction：底层对象不应该依赖上层对象
- Composition over Inheritance：通过组合扩展 Runtime 能力
- Runtime 设计五问：
  - Who owns it?
  - Who decides?
  - Who changes state?
  - Who depends on whom?
  - Can this be composed?
