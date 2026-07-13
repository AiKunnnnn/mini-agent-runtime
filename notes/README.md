# 学习笔记

这里保存《从零实现 Agent Runtime》的每日学习资料。

## 目录

- [Day1：AI Agent 到底是什么？](day01-agent-basics/day01-agent-basics.md)
- [Day2：Agent Runtime —— 谁才是真正的大脑？](day02-runtime/day02-runtime.md)
- [Day3：Runtime Architecture](day03-runtime-architecture/README.md)

## 组织规则

每一天一个独立文件夹：

```text
notes/
├── day01-agent-basics/
│   ├── README.md
│   ├── day01-agent-basics.md
│   ├── day01-agent-basics.pdf
│   ├── day01-agent-basics.docx
│   └── source/
│
└── day02-runtime/
    ├── README.md
    ├── day02-runtime.md
    ├── day02-runtime.pdf
    └── day02-runtime.docx

└── day03-runtime-architecture/
    ├── README.md
    ├── day03-01-runtime-architecture-design-principles.md
    ├── day03-01-runtime-architecture-design-principles.pdf
    └── day03-01-runtime-architecture-design-principles.docx
```

规则：

- Markdown 是主版本。
- PDF 是阅读版。
- DOCX 是可编辑版。
- 原始资料放在当天目录的 `source/` 中。
- 后续图示、流程图、代码草稿可以放进当天目录的 `assets/` 或 `examples/`。
- 如果某一天被拆成多个小节，统一放在当天目录下平铺管理，例如 `day03-01-xxx.md`、`day03-02-xxx.md`。
