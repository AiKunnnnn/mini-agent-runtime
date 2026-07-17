# 学习与产出流程

本文档描述 `mini-agent-runtime` 的长期工作流：先学习，再沉淀笔记，再实现代码，最后整理成书。

## 总体流程

```text
ChatGPT / Codex Chat
        │
        ▼
每天学习与推导
        │
        ▼
Add to task
        │
        ▼
Codex Workspace Task
        │
        ├── notes/  每日学习文档
        ├── src/    Runtime 代码实现
        └── book/   未来正式书稿
```

核心分工：

- Chat 负责“为什么”：学习、推导、质疑、建立认知。
- Workspace Task 负责“做什么”：写文件、导出文档、改代码、整理书稿。

## 阶段一：学习

学习在 ChatGPT / Codex Chat 中进行。

每天只聚焦一个主题，当前学习路线为：

```text
Part I：Agent Basics
  Day01：Agent Basics

Part II：Runtime Foundation
  Day02：Runtime Overview
  Day03：Runtime Architecture

Part III：Decision Engine
  Day04：Runtime 如何思考（How Runtime Thinks）

Part IV：Execution Engine
  Day05：Tool Calling

Part V：Memory System
  Day06：Memory

Part VI：Advanced Runtime
  Day07：Streaming Event
  Day08：Human Approval
  Day09：Workflow
  Day10：MCP
```

学习时优先讨论：

- 为什么需要这个概念。
- 它解决什么问题。
- 它属于 Runtime、LLM、Tool 还是 Memory。
- 如果设计错了会出现什么问题。
- 后续在 `mini-agent-runtime` 中应该如何落地。

## 阶段二：生成学习文档

当天学习结束后，从 Chat 中使用 `Add to task` 创建 Workspace 任务。

任务目标：

```text
根据今天的聊天内容，生成 DayX 标准学习文档，
写入 notes/dayXX-topic/，
并导出 Markdown / PDF / DOCX 三个版本。
```

标准输出：

```text
notes/dayXX-topic/
├── README.md
├── dayXX-topic.md
├── dayXX-topic.pdf
└── dayXX-topic.docx
```

Markdown 是主版本，PDF 和 DOCX 由脚本生成。

## Day 文档固定结构

每份 Day 学习文档建议使用以下结构：

```text
# DayX：主题

## 今日学习目标

## 今日知识总结

## 今日讨论与推导过程

## 最终达成的结论

## 今天踩过的坑

## 今天形成的设计

## 今天留下的问题

## 与上一章的联系

## 下一章学习计划

## 写书 TODO

## 写书素材
```

说明：

- “今日讨论与推导过程”要保留关键思考路径，而不是只写结论。
- “今天踩过的坑”记录错误理解和纠正过程。
- “下一章学习计划”用于第二天新 Chat 的承接。
- “写书 TODO”只列问题，不在学习阶段展开答案。
- “写书素材”记录未来写 Chapter 时可以复用的图、比喻、结论和代码草稿。

## 新一天学习如何开始

新一天建议新开 Chat，避免长期对话导致上下文裁剪。

推荐方式：

1. 粘贴上一天学习文档，或至少粘贴上一天文档末尾的“下一章学习计划”。
2. 告诉 AI 按照该计划继续，不重复上一天已掌握内容。
3. 当天学习结束后，再通过 `Add to task` 归档为新的 Day 文档。

推荐 Prompt：

```text
我们继续学习 mini-agent-runtime。

下面是上一天的学习文档，请先阅读。
请根据文档最后的“下一章学习计划”开始今天的学习。

要求：
1. 保持 Framework 作者视角。
2. 先推导，再总结，不直接堆 API。
3. 今天结束后输出 DayX 学习文档。
4. DayX 文档需要包含写书 TODO、写书素材、与上一章的联系、下一章学习计划。
```

## 阶段三：代码实现

当某一天的概念已经足够清晰，再进入代码实现。

代码实现使用 Workspace Task，而不是普通 Chat。

示例任务：

```text
根据 notes/day02-runtime/day02-runtime.md 的设计，
实现最小 Runtime Loop。
要求：
1. 新建 src/runtime/
2. 保持 TypeScript 类型清晰
3. 提供一个 examples/ 示例
4. 能通过 npm/pnpm 脚本运行
```

代码实现阶段建议新增：

```text
src/
examples/
tests/
```

## 阶段四：写书

写书阶段在学习阶段完成后开始。

写书不直接复制聊天，也不直接复制 Day 文档，而是基于以下材料重写：

- Day 学习文档正文
- 写书 TODO
- 写书素材
- 代码实现
- 后续源码阅读结果

写书建议使用单独 Workspace，例如 `agent-runtime-book`，避免和学习、代码任务混在一起。

输出目录：

```text
book/
├── chapter01-agent-basics/
├── chapter02-runtime/
├── chapter03-runtime-architecture/
└── README.md
```

## 文档导出

当前使用：

```bash
python3 scripts/export_learning_note.py \
  notes/day02-runtime/day02-runtime.md \
  notes/day02-runtime/day02-runtime.docx \
  notes/day02-runtime/day02-runtime.pdf
```

约定：

- Markdown 是唯一主版本。
- PDF / DOCX 不手改。
- 如果需要改内容，先改 Markdown，再重新导出。

## Git 习惯

建议提交信息：

```text
docs(day03): add runtime architecture note
feat(runtime): implement runtime loop
book(chapter02): draft runtime chapter
chore(workflow): document learning workflow
```

## 工作流纪律

1. 当天学习，当天归档。
2. 不把所有历史文档都塞进新 Chat。
3. 每天只携带上一天文档或接力棒。
4. 需要历史细节时再引用对应文档。
5. 学习文档允许迭代，但必须先完成。
6. 写书阶段再追求出版级表达。
7. 代码实现必须能运行，不能停留在伪代码。
