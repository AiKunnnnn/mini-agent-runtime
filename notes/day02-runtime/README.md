# Day2：Agent Runtime —— 谁才是真正的大脑？

Day2 解决的是 Runtime 的职责边界问题：

> LLM 负责推理，Runtime 负责管理。真正让 Agent 工作起来的，不是模型本身，而是 Runtime。

## 文件

- [Markdown 主版本](day02-runtime.md)
- [PDF 阅读版](day02-runtime.pdf)
- [DOCX 可编辑版](day02-runtime.docx)

## 核心内容

- Agent 不是 Tool，而是 Runtime
- Chat 为什么不是 Agent
- 真正循环的是 Runtime，不是 LLM
- LLM 与 Runtime 的职责划分
- Conversation 与 Context 的区别
- ContextBuilder 为什么存在
- Summary 与 Summary Cache
- Tool 的设计
- Runtime 的职责与结束控制
- mini-agent-runtime 的第一版结构
