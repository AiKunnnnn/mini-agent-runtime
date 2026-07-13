# mini-agent-runtime

《从零实现 Agent Runtime》的学习与实现仓库。

这个项目目前处在学习阶段：先按天沉淀 Agent Runtime 的学习笔记，再逐步进入代码实现，最后把学习文档整理成正式书稿。

## 当前内容

```text
mini-agent-runtime/
├── notes/      每日学习资料
├── book/       未来正式书稿
├── scripts/    文档导出脚本
├── AGENT.md    AI 协作规范
├── WORKFLOW.md 学习与产出流程
└── README.md   项目入口
```

## 项目规范

- [AI 协作规范](AGENT.md)
- [学习与产出流程](WORKFLOW.md)

## 学习笔记

- [Day1：AI Agent 到底是什么？](notes/day01-agent-basics/day01-agent-basics.md)
- [Day2：Agent Runtime —— 谁才是真正的大脑？](notes/day02-runtime/day02-runtime.md)
- [Day3：Runtime Architecture](notes/day03-runtime-architecture/README.md)

每一天的学习资料独立放在一个文件夹里，包含：

- Markdown：主版本，适合 GitHub 阅读和后续维护。
- PDF：阅读版。
- DOCX：可编辑版。
- source：原始材料，仅在当天有源文件时保留。

## 后续计划

学习阶段会继续覆盖：

1. Runtime Architecture
2. Runtime Loop
3. Tool Calling
4. Context Builder
5. Memory
6. Streaming Event
7. Human Approval
8. MCP
9. Workflow
10. Mastra / OpenAI Agents SDK 源码理解

后续实现阶段会在 `src/` 中逐步实现一个最小可运行的 `mini-agent-runtime`。

## 导出文档

当前使用 `scripts/export_learning_note.py` 将 Markdown 导出为 DOCX 和 PDF。

示例：

```bash
python3 scripts/export_learning_note.py \
  notes/day02-runtime/day02-runtime.md \
  notes/day02-runtime/day02-runtime.docx \
  notes/day02-runtime/day02-runtime.pdf
```

Markdown 始终作为唯一主版本，DOCX 和 PDF 是派生版本。
