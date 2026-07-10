# AI 协作规范

本文档定义本项目中人与 AI 协作的基本规则。它不保存某一天的学习内容，而是约束整个 `mini-agent-runtime` 项目的长期协作方式。

## 项目定位

`mini-agent-runtime` 是《从零实现 Agent Runtime》的学习与实现仓库。

项目目标不是快速调用某个 Agent SDK，而是通过持续学习、笔记沉淀、代码实现和最终成书，理解 Agent Runtime 为什么这样设计。

## 协作角色

### ChatGPT / Codex Chat

负责学习、推导和讨论。

适合处理：

- 每天的 Agent Runtime 学习。
- 概念辨析，例如 Runtime、Conversation、Context、Memory。
- 架构推导，例如为什么需要 ContextBuilder。
- 学习结束后的总结草稿。

### Codex Workspace Task

负责执行、归档和落地。

适合处理：

- 根据聊天内容生成 `notes/dayXX-*` 学习文档。
- 将 Markdown 导出为 PDF / DOCX。
- 修改 `README.md`、`WORKFLOW.md` 等项目文档。
- 后续实现 `src/` 下的代码。
- 后续整理 `book/` 下的正式书稿。

## 核心原则

1. 学习、笔记、写书、写代码分离。
2. Chat 负责思考，Workspace Task 负责执行。
3. 每天学习结束后必须沉淀当天学习文档。
4. Markdown 是唯一主版本，PDF 和 DOCX 是派生版本。
5. 不追求当天文档一次完美，先完成 v1，再按需要迭代。
6. 写书阶段不直接复制聊天记录，而是基于学习文档重新组织。
7. 写代码阶段以学习文档中的设计为依据，代码必须能运行和验证。

## 目录职责

```text
mini-agent-runtime/
├── notes/      每日学习文档
├── book/       未来正式书稿
├── scripts/    文档导出脚本
├── src/        后续 Runtime 源码
├── AGENT.md    AI 协作规范
└── WORKFLOW.md 学习与产出流程
```

## Day 学习文档规范

每一天一个独立目录：

```text
notes/day03-runtime-architecture/
├── README.md
├── day03-runtime-architecture.md
├── day03-runtime-architecture.pdf
└── day03-runtime-architecture.docx
```

学习文档建议包含：

1. 今日学习目标
2. 今日知识总结
3. 今日讨论与推导过程
4. 最终达成的结论
5. 今天踩过的坑
6. 今天形成的设计
7. 今天留下的问题
8. 与上一章的联系
9. 下一章学习计划
10. 写书 TODO
11. 写书素材

其中“写书 TODO”只列未来写书需要补充的问题，不在学习阶段提前写完整答案。

## 新一天学习的启动方式

新开 Chat 时，优先只携带上一天的学习文档或上一天文档末尾的“接力棒”。

推荐 Prompt：

```text
我们继续学习 mini-agent-runtime。

下面是上一天的学习文档，请先阅读。
请按照文档最后的“下一章学习计划”开始今天的学习。

要求：
1. 不重复讲上一天已经掌握的基础内容。
2. 保持“先推导，再总结，再沉淀”的学习方式。
3. 今天结束后仍然输出 DayX 学习文档，并包含写书 TODO 和写书素材。
```

不要在每一天都粘贴所有历史文档，避免上下文过长。需要引用历史细节时，再单独提供对应 `notes/dayXX-*` 文档。

## 写书阶段

写书阶段建议使用单独 Workspace，不和学习 Chat、代码实现 Task 混在一起。

写书输入：

- 对应 Day 学习文档。
- 代码实现结果。
- 每天文档末尾的写书 TODO。
- 每天文档末尾的写书素材。

写书输出：

```text
book/
├── chapter01-agent-basics/
├── chapter02-runtime/
└── chapter03-runtime-architecture/
```

## 写代码阶段

代码实现阶段建议在 `mini-agent-runtime` Workspace 中执行。

后续源码目录建议：

```text
src/
├── runtime/
├── llm/
├── tools/
├── memory/
├── approval/
├── stream/
└── events/
```

代码任务应尽量从学习文档中的设计结论出发，例如：

- 根据 Day2 实现 Runtime Loop。
- 根据 Day3 实现 Tool Registry。
- 根据 Day4 实现 ContextBuilder。

## 版本习惯

学习文档可以按版本迭代：

- `v1.0`：当天完成的标准学习文档。
- `v1.1`：补充遗漏、修正表达。
- `v2.0`：写书前整理版。

正式书稿和学习文档分开维护，避免把学习过程直接当成出版内容。
