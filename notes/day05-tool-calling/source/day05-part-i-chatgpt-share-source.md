# Day05 Part I ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a7546d5-9990-83e8-a066-012d543445d4
- 会话标题：Day05 Part I: Mini Tool Runtime
- 抽取时间：2026-08-07

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part I 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是我学习 Agent 的 readme，以及 day05 的 readme，还有 day05 part H 的学习笔记，你看一下，然后我们进入下一节 part I 的学习

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Tool

The output of this plugin was redacted.

## 7. Assistant

我看完了你上传的三个文件：

- 总 README：确认目前学习路线已经进入 **Part IV：Execution Engine → Day05 Tool Calling**，并且 Day05 之后进入 Memory System。fileciteturn0file0L39-L40 fileciteturn0file0L73-L79
- Day05 README：确认 Day05 的拆分结构已经完成 Part A-H，目前下一节就是 Part I。fileciteturn0file1L21-L29
- Day05 Part H：确认 Part H 的定位是把前面的 Tool Schema、Registry、Executor、Permission、Observation、State 收束成 Multi Tool Loop，然后下一节进入 **Mini Tool Runtime Implementation**。fileciteturn0file2L5-L8 fileciteturn0file2L1876-L1884

整体学习路线没有跑偏。

我们现在的位置：

```text
Day01
 Agent 基础
   ↓
Day02
 Runtime 是 Agent 的大脑
   ↓
Day03
 Runtime Architecture
   ↓
Day04
 Context Builder / Decision Engine
   ↓
Day04.5
 工业术语映射
   ↓
Day05
 Execution Engine

   Part A
   Tool Calling 基础
        ↓
   Part B
   Tool Decision
        ↓
   Part C
   Tool Schema
        ↓
   Part D
   Tool Registry
        ↓
   Part E
   Tool Executor
        ↓
   Part F
   Permission / Human Approval
        ↓
   Part G
   Observation Feedback
        ↓
   Part H
   Multi Tool Loop
        ↓
   ⭐ Part I
   Mini Tool Runtime Implementation
```

Part H 其实已经完成了一个非常重要的认知升级：

以前我们理解：

> Agent = LLM + Tools

现在升级为：

> Agent Runtime = State + Context + Decision + Tool Execution + Observation + Loop Control

也就是：

```text
              Agent Runtime

                    |
                    v

          Agent Executor Loop

                    |
     +--------------+--------------+

     LLM Decision              Runtime Control

          |                         |

      Tool Call                Loop Guard

          |

      Tool Executor

          |

      Observation

          |

      State Update

          |

      Next Step
```

Part I 就是把这些设计第一次落成代码。

---

# Day05 Part I：Mini Tool Runtime Implementation

## 本节目标

这一节不是为了写一个生产级 Agent。

而是验证：

> 前面 Part A-H 的所有抽象，是否真的可以组成一个最小 Runtime。

最终我们应该实现：

```text
User Input

    |
    v

Runtime

    |
    +-- Context Builder
    |
    +-- LLM Adapter
    |
    +-- Tool Decision
    |
    +-- Tool Registry
    |
    +-- Tool Executor
    |
    +-- Observation Processor
    |
    +-- Runtime State
    |
    +-- Agent Loop


    |
    v

Final Answer
```

---

# Part I 核心问题

这一节主要回答：

## 1. Runtime 最小闭环是什么？

之前我们拆了很多组件：

Tool Schema

↓

Tool Registry

↓

Tool Executor

↓

Observation

↓

State

↓

Loop


但是如果真正写代码：

最少需要什么？

答案：

```text
RuntimeState

+

ToolRegistry

+

ToolExecutor

+

LLM

+

AgentLoop
```

---

## 2. Mini Runtime 的第一版架构

我们先设计一个极简版本：

```text
src/

mini-agent-runtime/

├── runtime/
│
│   ├── AgentRuntime.ts
│   ├── RuntimeState.ts
│
├── tools/
│
│   ├── Tool.ts
│   ├── ToolRegistry.ts
│   ├── ToolExecutor.ts
│
├── llm/
│
│   └── LLMClient.ts
│
├── observation/
│
│   └── ObservationProcessor.ts
│
└── index.ts
```

注意：

这里不是传统业务代码分层。

而是在映射 Agent Runtime 概念。

---

# 第一版 Runtime State

先回忆 Part H：

Runtime State 负责保存：

- goal
- messages
- toolCalls
- observations
- step
- status

fileciteturn0file2L300-L321

所以：

```ts
interface RuntimeState {

  goal: string;

  messages: Message[];

  toolCalls: ToolCallRecord[];

  observations: Observation[];

  step:number;

  status:
    | "thinking"
    | "executing"
    | "completed"
    | "failed";

}
```

---

这里有一个非常重要的工程认知：

很多初学 Agent 的实现：

```ts
while(true){

  callLLM()

  executeTool()

}
```

实际上没有 Runtime。

因为：

它没有：

- 状态
- 历史
- 恢复能力
- Trace
- Replay

Part H 已经强调：

Agent Loop 本质不是简单 while，而是 State Transition。fileciteturn0file2L564-L574

---

# Tool 系统实现

## Tool Interface

对应 Part C Tool Schema：

```ts
interface Tool {

  name:string;

  description:string;


  execute(
    args:any
  ):Promise<any>;

}
```

例如：

天气 Tool：

```ts
const weatherTool = {

 name:"get_weather",

 description:
 "查询城市天气",

 async execute(args){

   return {
     city:args.city,
     weather:"sunny"
   }

 }

}
```

---

## Tool Registry

负责：

> Runtime 当前有哪些能力。


```ts
class ToolRegistry {


 private tools =
   new Map();


 register(tool){

   this.tools.set(
     tool.name,
     tool
   );

 }


 get(name){

   return this.tools.get(name);

 }

}
```

---

# Tool Executor

这里对应 Part E。

注意：

Agent Executor 和 Tool Executor 分工不同：

Part H 总结：

> Tool Executor 管单个动作，Agent Executor 管整个任务循环。fileciteturn0file2L864-L906


所以：

Tool Executor：

```ts
class ToolExecutor {


 async execute(toolCall){


   const tool =
     registry.get(
       toolCall.name
     );


   const result =
     await tool.execute(
       toolCall.arguments
     );


   return result;

 }

}
```

---

# Agent Loop

这是整个 Day05 的核心。

最终：

```ts
class AgentRuntime {


 async run(state){


   while(true){


     // 1. build context

     const context =
       contextBuilder.build(
          state
       );


     // 2. LLM decision

     const decision =
       await llm.run(
          context
       );



     // 3. final

     if(decision.type==="final"){

        return decision.content;

     }



     // 4. tool call

     if(decision.type==="tool_call"){


        const result =
          await toolExecutor.execute(
             decision
          );


        const observation =
          processor.process(
             result
          );


        state =
          reducer(
             state,
             observation
          );

     }

   }

 }

}
```

这其实就是 Part H 中的 Agent Executor Loop 伪代码落地。fileciteturn0file2L944-L979

---

# 这一节最重要的认知

我们不要把 Part I 理解成：

> 写几个 TypeScript 类。


真正意义：

## 从设计进入实现


前面：

```text
Agent Runtime 是什么？
```

↓

```text
有哪些组件？
```

↓

```text
组件之间如何连接？
```

↓

Part I：

```text
这些组件如何真正跑起来？
```


也就是：

```text
Architecture
      |
      v
Implementation
      |
      v
Executable Runtime
```


---

下一步我们进入：

# Day05 Part I-1：Runtime Skeleton 设计

重点：

1. 为什么 Runtime 应该是 Coordinator，而不是 Tool 管理器
2. AgentRuntime 类如何设计
3. RuntimeState 如何初始化
4. 一次 run 生命周期
5. 第一个可运行 Demo

这部分会开始真正写 `mini-agent-runtime` 的代码骨架。

## 8. User

continue

## 9. Assistant

继续进入 **Day05 Part I-1：Runtime Skeleton 设计**。

这一节开始进入真正的实现阶段。

前面 Part A-H 我们一直在回答：

> 一个 Agent Runtime 应该有哪些概念？

现在开始回答：

> 这些概念在代码里应该如何组织？


---

# Day05 Part I-1：Runtime Skeleton 设计

## 1. 先回顾：Runtime 到底是什么角色？

这是实现前最重要的问题。

很多初学者写 Agent：

```ts
const agent = {

  tools: [],

  async run(){

    const result =
      await llm.call();

    return result;

  }

}
```

看起来有 Agent。

但实际上：

它只是：

```
LLM Wrapper
```

不是 Runtime。


---

真正的 Runtime：

应该是协调者：

```
                  AgentRuntime

                       |
        +--------------+--------------+

        |              |              |

    Context       Tool System    State System

    Builder        Executor       Manager


                       |

                 Loop Controller

```


也就是说：

Runtime 不负责具体业务。

Runtime 负责：

- 什么时候调用 LLM
- 什么时候执行 Tool
- 如何更新 State
- 是否继续 Loop
- 如何停止


这对应 Part H 的核心：

> LLM 负责决策，Runtime 负责治理。fileciteturn0file2L2040-L2047


---

# 2. Runtime Skeleton 第一版

我们先不追求工业级。

先实现：

```
AgentRuntime
      |
      |
      +-- RuntimeState
      |
      +-- ContextBuilder
      |
      +-- LLMClient
      |
      +-- ToolExecutor
      |
      +-- ObservationProcessor
```

代码结构：

```
src/

runtime/

  AgentRuntime.ts

  RuntimeState.ts


context/

  ContextBuilder.ts


llm/

  LLMClient.ts


tools/

  Tool.ts

  ToolRegistry.ts

  ToolExecutor.ts


observation/

  ObservationProcessor.ts

```


---

# 3. RuntimeState

先实现状态。


为什么先实现 State？


因为 Agent 的本质不是：

```
call LLM
```


而是：

```
State
 |
 v
Decision
 |
 v
Action
 |
 v
Observation
 |
 v
State Update
```


Part H 已经明确：

Runtime 至少需要保存：

- goal
- messages
- toolCalls
- observations
- step
- status

fileciteturn0file2L300-L321


所以：

```ts
export interface RuntimeState {


  goal:string;


  messages:Message[];


  toolCalls:ToolCallRecord[];


  observations:Observation[];


  step:number;


  status:
    | "thinking"
    | "executing"
    | "waiting"
    | "completed"
    | "failed";


}
```


---

## 为什么 State 必须独立？

这里回收 Day04 的知识。


之前我们讲：

Runtime State ≠ Context


关系：

```
Runtime State

     |
     |
     v

Context Builder

     |
     |
     v

LLM Context
```


State 是：

> 真实运行状态


Context 是：

> 给模型看的投影


比如：

State:

```json
{
 step:5,

 toolCalls:[
   ...
 ],

 observations:[
   ...
 ]
}
```


Context Builder 可能生成：

```
你已经查询过订单。

订单状态:
SHIPPED

下一步请选择动作。
```


二者不能混。


---

# 4. AgentRuntime 类

核心类：

```ts
class AgentRuntime {


 constructor(
   private contextBuilder,
   private llm,
   private toolExecutor,
   private observationProcessor
 ){}



 async run(
   state:RuntimeState
 ){

 }


}
```


注意：

这里体现一个非常重要的工程设计：

## Runtime 组合能力，而不是继承能力


错误：

```ts
class GPTAgentRuntime
extends ToolExecutor

```


因为 Runtime 不是 Tool。


正确：

```ts
Runtime

has-a

ToolExecutor
```


即：

组合。


这是传统软件工程思想在 Agent Runtime 的应用。


你之前总结：

> Agent 很多设计本质还是软件工程设计在 Agent 的应用。


这里就是典型案例。


---

# 5. Runtime run 生命周期

我们设计第一版：

```ts
async run(state){


 while(true){


   // Step 1
   const context =
      this.contextBuilder.build(
          state
      );


   // Step 2
   const decision =
      await this.llm.run(
          context
      );



   // Step 3
   if(
      decision.type==="final"
   ){

      state.status =
        "completed";


      return decision.answer;

   }



   // Step 4
   if(
      decision.type==="tool_call"
   ){


      state.status =
        "executing";



      const result =
        await this.toolExecutor.execute(
             decision.toolCall
        );



      const observation =
        this.observationProcessor.process(
             result
        );



      state.observations.push(
          observation
      );


      state.step++;


      state.status =
        "thinking";

   }

 }

}
```


这个循环对应：

Part H：

```
Think

↓

Act

↓

Observe

↓

Update State

↓

Think Again
```

fileciteturn0file2L53-L68


---

# 6. 第一个重大问题：谁控制 while？

这里非常重要。


很多 Demo：

```ts
while(true)
```

看似简单。


但是工业 Runtime：

不会让 while 自己无限跑。


为什么？


因为需要：

```
Loop Guard
```


Part H 已经定义：

Loop Guard 负责：

- 最大步数
- timeout
- budget
- 重复动作
- 无进展检测

fileciteturn0file2L765-L781


所以最终：

应该变成：


```ts
while(true){


  guard.check(state);


  runStep();


}
```


架构：

```
AgentRuntime


 |
 |
 +-- StepRunner


 |
 |
 +-- LoopGuard

```


---

# 7. 为什么先不要实现 Planner？

这里提前解释一个设计问题。


很多框架：

LangGraph：

```
Planner
 |
Graph
```

AutoGPT：

```
Planner
 |
Executor
```


但是我们的 mini-runtime 第一版：

不需要。


原因：

现在：

LLM 本身就是 Planner。


流程：

```
State

↓

Context

↓

LLM

↓

NextAction
```


未来：

才抽象：

```ts
interface Planner {


 decide(
   state
 ):Promise<Action>


}
```


然后支持：

```
LLMPlanner

WorkflowPlanner

HybridPlanner

```


Part H 也提前预留了这个方向。fileciteturn0file2L1796-L1811


---

# 8. 当前 Mini Runtime 的工业映射


| Mini Runtime | 工业名称 |
|-|-|
| AgentRuntime | Runner / Agent Runner |
| RuntimeState | Agent State |
| ContextBuilder | Context Management |
| ToolExecutor | Tool Runtime |
| ObservationProcessor | Feedback Pipeline |
| while loop | Agent Execution Loop |
| Guard | Runtime Policy |


对应 Part H 工业映射：

fileciteturn0file2L1818-L1828


---

# 本小节核心认知升级

之前：

```
Agent
=
LLM + Tools
```


升级：


```
Agent Runtime

=
Coordinator

+
State

+
Decision

+
Execution

+
Feedback

+
Control
```


---

# 下一小节

## Day05 Part I-2：Tool System Implementation

下一步我们会真正实现：

```
Tool

↓

ToolRegistry

↓

ToolExecutor

↓

Observation
```


重点讨论：

1. Tool interface 为什么必须统一
2. Tool Registry 为什么不是简单 Map
3. Tool Metadata 如何影响 LLM Decision
4. Tool Executor 如何加入 Permission / Retry
5. 一个天气 Tool Demo 如何跑通


这一步会把 Day05 Part C-G 的设计真正落成代码。

## 10. User

continue

## 11. Assistant

继续进入 **Day05 Part I-2：Tool System Implementation**。

这一节开始把 Day05 Part C-G 的设计真正落成代码。

前面我们已经实现了 Runtime 的骨架：

```text
AgentRuntime

    |
    +-- RuntimeState
    |
    +-- ContextBuilder
    |
    +-- LLMClient
    |
    +-- ToolExecutor
    |
    +-- ObservationProcessor
```

但是现在有一个问题：

```text
LLM

↓

tool_call

↓

???
```

Runtime 知道要调用 Tool，但是：

- Tool 从哪里找？
- Tool 怎么描述？
- Tool 怎么执行？
- Tool 执行失败怎么办？


这就是 Tool System。

---

# 1. Tool System 在 Runtime 中的位置

回顾 Day05 Part H：

完整链路：

```text
LLM Decision

      |
      v

Tool Call Intent

      |
      v

Tool Registry

      |
      v

Tool Executor

      |
      v

External World

      |
      v

Observation

      |
      v

Runtime State
```

fileciteturn0file2L256-L285


所以 Tool System 实际分三层：

```text
              Tool System


        +----------------+

        | Tool Schema    |

        +----------------+

                |

                v


        +----------------+

        | Tool Registry |

        +----------------+

                |

                v


        +----------------+

        | Tool Executor |

        +----------------+

```

---

# 2. Tool Interface 设计

先定义 Tool。

最简单：

```ts
interface Tool {

  name:string;

  description:string;


  execute(
    args:unknown
  ):Promise<unknown>;

}
```


例如天气：

```ts
const weatherTool:Tool = {


 name:"get_weather",


 description:
 "查询指定城市天气",



 async execute(args){


   const city =
      args.city;


   return {

      city,

      weather:"sunny",

      temperature:25

   };


 }


}
```

---

但是这里有一个问题。

如果只是：

```ts
execute(args)
```

那么：

Runtime 不知道：

- 参数结构
- 参数类型
- 必填字段


例如：

```json
{
 "city":"Tokyo"
}
```


为什么 LLM 知道？

因为我们还缺：

## Tool Schema


---

# 3. Tool Schema 加入

回忆 Part C：

Tool Schema 是：

> 模型和 Runtime 之间的行动契约。


所以：

```ts
interface ToolSchema {


 name:string;


 description:string;


 parameters:JSONSchema;


}
```


完整：

```ts
interface Tool {


 schema:ToolSchema;


 execute(
    args:any
 ):Promise<any>;


}
```


例如：

```ts
const weatherTool={


 schema:{


   name:"get_weather",


   description:
   "查询城市天气",


   parameters:{


     type:"object",


     properties:{


       city:{
         type:"string"
       }


     },


     required:[
       "city"
     ]

   }


 },


 execute(args){

   return ...

 }


}
```


这里对应 Part C 的核心：

Tool Schema 不是给代码看的。

它主要给：

```text
LLM Decision Layer
```

看的。

---

# 4. Tool Registry

现在 Runtime 有很多 Tool：

例如：

```text
weather

search

calculator

database

email

```


不能：

```ts
if(tool==="weather")
```


所以需要 Registry。


---

## Registry 职责

不是简单存 Map。


它负责：

### 1. 注册能力

```ts
register(tool)
```


### 2. 查询能力

```ts
get(name)
```


### 3. 暴露给 LLM

```ts
getSchemas()
```


因为 LLM 需要知道：

当前有哪些能力。


---

实现：

```ts
class ToolRegistry {


 private tools =
    new Map<string,Tool>();



 register(tool:Tool){


    this.tools.set(
       tool.schema.name,
       tool
    );


 }



 get(name:string){


    return this.tools.get(name);

 }



 getSchemas(){


    return [
      ...this.tools.values()
    ]
    .map(
      tool=>tool.schema
    );


 }


}
```

---

这里有一个重要设计：

## Registry 是 Runtime 能力边界


例如：

用户：

> 删除数据库所有数据


但是当前 Runtime：

没有：

```text
delete_database
```


那么 LLM 根本不知道这个能力存在。


所以：

Registry 决定：

> Agent 当前能做什么。


---

# 5. Tool Executor

Registry 找到了 Tool。

下一步：

执行。


流程：

```text
ToolCall

{
 name:"get_weather",

 arguments:{
   city:"Tokyo"
 }

}


       |

       v


ToolExecutor


       |

       v


weatherTool.execute()

```


---

实现：

```ts
class ToolExecutor {


 constructor(
   private registry:ToolRegistry
 ){}



 async execute(
    toolCall:ToolCall
 ){



   const tool =
      this.registry.get(
          toolCall.name
      );


   if(!tool){

      throw new Error(
        "Tool not found"
      );

   }



   const result =
      await tool.execute(
          toolCall.arguments
      );


   return result;


 }


}
```

---

# 6. 为什么 Tool Executor 不放在 Tool 里面？

这是一个很关键的软件设计问题。


错误：

```ts
tool.execute(){

  validate();

  permission();

  retry();

  api();

}
```


结果：

每个 Tool 都自己实现：

- 权限
- retry
- timeout
- logging


最后：

```text
weatherTool

emailTool

databaseTool

```

全部重复。


---

正确：

```text
ToolExecutor


    |
    +-- validation

    |
    +-- permission

    |
    +-- retry

    |
    +-- timeout

    |
    +-- logging

    |
    +-- execute Tool

```


Tool：

只负责业务能力。


Executor：

负责运行治理。


这就是 Part E 的核心。

---

# 7. 加入 Permission

继续扩展：

```ts
class ToolExecutor {


 async execute(toolCall){


   await permission.check(
       toolCall
   );


   const result =
      await tool.execute();


   return result;


 }


}
```


例如：

```json
{
 "tool":"refund_money"
}
```


Executor：

检查：

```text
用户权限？

金额限制？

是否需要人工审批？
```


然后：

决定：

```
execute
|
or
|
pause
```

---

# 8. 加入 Observation Pipeline


Tool Result：

不能直接塞回 LLM。


错误：

```text
Tool Result

↓

Prompt

↓

LLM
```


正确：

```text
Tool Result

↓

Observation Processor

↓

Observation

↓

Runtime State

↓

Context Builder

↓

LLM
```


对应 Part G：

Tool Result 是执行输出。

Observation 是 Runtime Feedback。

fileciteturn0file2L488-L501


---

实现：

```ts
class ObservationProcessor {


 process(
    toolResult
 ){


    return {

       id:
       crypto.randomUUID(),


       type:
       "tool_result",


       summary:
       JSON.stringify(
          toolResult
       ),


       payload:
       toolResult

    };


 }


}
```

---

# 9. 现在完整 Tool Flow

我们已经可以串起来：

```text
User

 |
 v

LLM


 |
 v

ToolCall


 |
 v

ToolRegistry


 |
 v

ToolExecutor


 |
 v

Tool


 |
 v

ToolResult


 |
 v

ObservationProcessor


 |
 v

Observation


 |
 v

RuntimeState


 |
 v

Next LLM Turn

```


这就是 Day05 Part A-G 的代码版本。

---

# 10. 工业映射

| Mini Runtime | 工业概念 |
|-|-|
| Tool Interface | Tool Contract |
| Tool Schema | Function Schema / Capability Schema |
| Tool Registry | Capability Registry |
| Tool Executor | Tool Runtime |
| Observation Processor | Feedback Adapter |
| RuntimeState | Agent State |


---

# 本节核心认知升级


之前：

```text
Tool = 一个函数
```


升级：

```text
Tool = Agent 可使用的一项能力契约
```


---

之前：

```text
调用函数
```


升级：

```text
Tool Call

↓

Execution

↓

Observation

↓

State Transition

```


---

之前：

```text
Runtime 管调用
```


升级：

```text
Runtime 管能力发现、执行治理、反馈回流
```


---

# 下一节

## Day05 Part I-3：Agent Executor Loop Implementation

下一步真正把：

```text
Runtime

+

Tool System

+

LLM

+

State

```

闭环。


重点：

1. run() 生命周期
2. StepRunner 设计
3. Tool Call → Observation → State Update
4. Loop Guard 接入
5. 第一个完整 Agent Demo

也就是：

> 从“有组件”进入“真正跑起来”。

## 12. User

continue

## 13. Assistant

继续进入 **Day05 Part I-3：Agent Executor Loop Implementation**。

这一节是 Day05 Part I 最核心的一节。

前两节我们已经完成：

```text
Part I-1

Runtime Skeleton

AgentRuntime
RuntimeState
ContextBuilder
```

以及：

```text
Part I-2

Tool System

Tool Schema
Tool Registry
Tool Executor
Observation Processor
```

现在缺最后一块：

```text
如何让这些组件真正循环运行？
```

也就是：

> Agent Executor Loop。

---

# 1. Agent Runtime 的完整拼图

现在我们的架构：

```text
                 AgentRuntime


                      |
                      v


              Agent Executor Loop


                      |
        +-------------+-------------+

        |                           |

 Context Builder              Tool System


        |                           |

        v                           v


      LLM                    Tool Executor


                                    |

                                    v


                              Observation


                                    |

                                    v


                              State Update

```

这就是 Part H 的设计落地。

Part H 中已经定义：

Agent Executor Loop 负责：

- LLM 调用
- 状态推进
- 循环控制
- 停止判断

而 Tool Executor 只负责：

- 单个 Tool 生命周期

fileciteturn0file2L864-L906

---

# 2. 为什么不能直接写 while(true)

很多 Demo：

```ts
while(true){

 const response =
   await llm.call();


 if(response.final){
    break;
 }


 await tool.execute();

}
```

看起来能跑。

但是问题：

## 第一：

没有 Step 概念。


## 第二：

没有 State Transition。


## 第三：

无法插入治理能力。


比如：

- timeout
- max steps
- approval
- retry
- trace


所以工业设计：

不是：

```text
while
```

而是：

```text
Step Runner
```

---

# 3. Step Runner 设计


回顾 Part H：

工业 Runtime 常把每一次循环称为 Step。

抽象：

```ts
interface StepRunner {

 run(
   state:RuntimeState
 ):Promise<StepResult>;

}
```

fileciteturn0file2L910-L917


为什么需要 Step？

因为：

一次 Agent Loop：

其实就是：

```text
Step 1

↓

Step 2

↓

Step 3

```


例如 Claude Code：

```text
Step 1

Read File


Step 2

Edit File


Step 3

Run Test


Step 4

Fix Error


Step 5

Final Answer

```

---

# 4. StepRunner 内部流程


一个 Step：

不是简单调用 LLM。

而是：

```text
Step


 |

 v


Build Context


 |

 v


LLM Decision


 |

 +--------------+

 |              |

Final        ToolCall


                 |

                 v


            Execute Tool


                 |

                 v


            Observation


                 |

                 v


            Update State

```

---

代码：

```ts
class StepRunner {


constructor(
 private contextBuilder,
 private llm,
 private toolExecutor,
 private observationProcessor
){}



async run(
 state:RuntimeState
){


 const context =
    this.contextBuilder.build(
       state
    );



 const decision =
    await this.llm.run(
       context
    );



 if(
   decision.type==="final"
 ){

    return {

      type:"final",

      answer:
       decision.answer

    };

 }



 if(
   decision.type==="tool_call"
 ){


    const result =
      await this.toolExecutor.execute(
          decision.toolCall
      );


    const observation =
      this.observationProcessor.process(
          result
      );


    return {

       type:"observation",

       observation

    };


 }


}

}
```

---

# 5. AgentRuntime 调度 Step


现在 Runtime 不负责具体一步。

它负责：

循环。


```ts
class AgentRuntime {


constructor(
 private stepRunner,
 private guard
){}



async run(
 state
){


 while(true){


    this.guard.check(
       state
    );



    const result =
       await this.stepRunner.run(
           state
       );



    if(
       result.type==="final"
    ){

       state.status =
          "completed";


       return result.answer;

    }



    if(
       result.type==="observation"
    ){


       state.observations.push(
          result.observation
       );


       state.step++;


    }


 }


}


}
```

---

这里体现一个非常重要的分层：

```text
AgentRuntime

负责：

继续不继续


StepRunner

负责：

这一轮怎么跑

```

---

# 6. Runtime Loop 完整生命周期


现在完整流程：


```text
User Goal


 |

 v


RuntimeState


 |

 v


AgentRuntime.run()


 |

 v


Loop Guard


 |

 v


StepRunner


 |

 v


ContextBuilder


 |

 v


LLM


 |

 +----------------+

 |                |

Final          ToolCall


                  |

                  v


             ToolExecutor


                  |

                  v


             ToolResult


                  |

                  v


          ObservationProcessor


                  |

                  v


            RuntimeState Update


                  |

                  v


              Next Step

```

---

这就是 Part H 的：

```text
Think

Act

Observe

Update State

Think Again
```

fileciteturn0file2L53-L68

---

# 7. 接入 Loop Guard


现在加入生产保护。


先定义：

```ts
interface LoopGuard {


 check(
   state:RuntimeState
 ):void;


}
```


例如：

```ts
class MaxStepGuard {


constructor(
 private maxSteps:number
){}



check(state){


 if(
   state.step >= this.maxSteps
 ){

   throw new Error(
    "max step exceeded"
   );

 }


}


}
```

---

为什么这个必须在 Runtime？

因为：

LLM 不应该控制资源。


比如：

LLM：

```
再搜索一次
```

Runtime：

```
已经搜索20次，停止
```


Part H 明确：

停止条件不能完全交给 LLM。

Runtime 需要控制：

- max step
- timeout
- token budget
- cost budget

fileciteturn0file2L580-L603

---

# 8. 第一个完整 Demo


假设：

用户：

```
查询东京天气
```


---

初始化：

```ts
state={

 goal:
 "查询东京天气",

 step:0,

 status:"thinking"

}
```


---

## Step 1

Context：

```
用户想查询东京天气。

可用 Tool:

get_weather

```


LLM：

```json
{
"type":"tool_call",

"toolCall":{
"name":"get_weather",

"arguments":{
 "city":"Tokyo"
}

}

}
```

---

Executor：

调用：

```ts
get_weather({
 city:"Tokyo"
})
```


返回：

```json
{
weather:"sunny",

temperature:25
}
```


---

Observation：

```json
{
type:"tool_result",

summary:
"Tokyo weather sunny 25"
}
```


---

State：

```json
{
step:1,

observations:[
 {
  type:"tool_result"
 }
]
}
```


---

## Step 2


LLM 看到：

```
Observation:
东京天气晴朗，25度。

```

决定：

```json
{
"type":"final",

"answer":
"东京今天晴，25度"
}
```

结束。


---

# 9. 这里和 Claude Code 的关系


Claude Code 本质就是这个循环。


例如：

用户：

```
修复 bug
```


内部：

```text
Step 1

Read File


Observation:

发现错误位置


Step 2

Edit File


Observation:

代码变化


Step 3

Run Test


Observation:

测试失败


Step 4

Fix


Step 5

Test Pass


Step 6

Final Answer

```

Part H 对 Claude Code 的映射也是这个逻辑。fileciteturn0file2L1203-L1246

---

# 10. Mini Runtime 到工业 Runtime 的差距


现在我们的版本：

```text
Mini Runtime


AgentRuntime

+

StepRunner

+

ToolExecutor

+

State

```

已经具备：

✅ Tool Calling  
✅ Multi Step Loop  
✅ Observation Feedback  
✅ State Transition  


但是距离工业还有：


## Persistence

保存：

```text
checkpoint
```


## Streaming

事件：

```text
ToolCalled

ToolCompleted

StateUpdated

```

## Human Approval

暂停：

```text
waiting

resume
```

## Trace

记录：

```text
为什么调用这个 Tool
```


这些会在 Day07-Day10 继续补齐。

---

# 本节核心认知升级


以前：

```
Agent Loop = while(true)
```


升级：

```
Agent Loop

=

Step Execution

+

State Transition

+

Control Policy
```


---

以前：

```
Tool Calling 是 Agent 核心
```


升级：

```
Tool Calling

只是 Action

Loop + Observation

才形成 Agent
```


---

以前：

```
Runtime 是调用 LLM 的代码
```


升级：

```
Runtime 是管理 Agent 生命周期的操作系统
```


---

## 下一节

进入：

# Day05 Part I-4：完整 Mini Agent Demo + 总结


内容：

1. 把 Runtime + Tool + Loop 串起来
2. 实现一个天气 Agent
3. Debug 一次完整执行链
4. 对照 OpenAI Agents SDK / LangGraph / Claude Code
5. Day05 Part I 完成总结


这一节结束后，Day05 的 Execution Engine 就真正闭环了。

## 14. User

continue

## 15. Assistant

继续进入 **Day05 Part I-4：完整 Mini Agent Demo + Day05 Execution Engine 总结**。

这一节我们做两件事：

1. 把前面设计的所有组件真正串起来。
2. 对 Day05 做一次整体闭环，把 Tool Calling 这条链路彻底吃透。

---

# Day05 Part I-4：Mini Agent Runtime Demo

## 1. 当前 Mini Runtime 完整架构

经过 Part A-I，我们现在拥有：

```text id="m3z1s8"
                    User


                     |

                     v


              AgentRuntime


                     |

                     v


              Loop Controller


                     |

                     v


              StepRunner


                     |

        +------------+------------+

        |                         |


 ContextBuilder              LLM


                                  |

                                  v


                            Tool Decision


                                  |

                                  v


                            ToolRegistry


                                  |

                                  v


                            ToolExecutor


                                  |

                                  v


                              Tool


                                  |

                                  v


                           Tool Result


                                  |

                                  v


                      ObservationProcessor


                                  |

                                  v


                            RuntimeState


                                  |

                                  v


                            Next Step

```

这就是一个最小 Agent Runtime。

注意：

这里已经不是：

```text
LLM + Function
```

而是：

```text
Runtime + Decision + Execution + Feedback
```

---

# 2. Demo：Weather Agent

我们实现一个最简单的 Agent：

用户：

> 北京今天天气怎么样？


能力：

```text
get_weather(city)
```


---

## Step 1：注册 Tool

```ts
const registry =
  new ToolRegistry();


registry.register(
{
 schema:{
   name:"get_weather",

   description:
   "查询城市天气",

   parameters:{
     type:"object",
     properties:{
       city:{
         type:"string"
       }
     }
   }
 },


 execute(args){

   return {

     city:args.city,

     weather:"晴",

     temperature:26

   }

 }

}
)

```

---

现在 Runtime 拥有：

```text
Capability:

get_weather
```

---

# 3. 初始化 Runtime State


用户输入：

```text
北京今天天气怎么样？
```


初始化：

```ts
const state = {


 goal:
 "查询北京天气",


 messages:[
   {
    role:"user",
    content:
    "北京今天天气怎么样？"
   }
 ],


 toolCalls:[],


 observations:[],


 step:0,


 status:"thinking"


}
```

---

注意：

这里没有直接把：

```text
用户输入
```

丢给 LLM。


而是：

```text
User Input

↓

Runtime State

↓

Context Builder

↓

LLM Context

```

这就是 Day04 Context Builder 的思想。

---

# 4. Context Builder


代码：

```ts
class ContextBuilder {


 build(
  state
 ){


 return {


  messages:
    state.messages,


  observations:
    state.observations,


  tools:
    registry.getSchemas()


 }


 }


}
```

---

生成给 LLM 的 Context：

```json
{
"messages":[
{
"role":"user",
"content":
"北京今天天气怎么样？"
}
],


"tools":[

{
"name":"get_weather",

"description":
"查询城市天气"

}

]

}
```

---

# 5. 第一次 LLM Decision


LLM 返回：

```json
{

"type":
"tool_call",


"toolCall":{


"name":
"get_weather",


"arguments":{


"city":
"北京"


}

}

}
```

注意：

LLM 没有执行任何事情。

它只是：

> 提出下一步行动。


---

# 6. Tool Executor


Runtime 收到：

```json
{
"name":"get_weather"
}
```

进入：

```text
ToolRegistry

↓

找到 Tool

↓

ToolExecutor

↓

execute()
```


执行：

```ts
get_weather(
{
 city:"北京"
}
)
```


结果：

```json
{
city:"北京",

weather:"晴",

temperature:26
}
```

---

# 7. Observation


Tool Result 不能直接进入下一轮。

经过：

```text
Tool Result

↓

Observation Processor

↓

Observation
```

得到：

```json
{

"type":
"tool_result",


"content":
"北京天气晴，26度"


}
```

---

然后：

```ts
state.observations.push(
 observation
)


state.step++
```

---

当前 State：

```json
{

goal:
"查询北京天气",


step:
1,


observations:[

{
"type":
"tool_result",

"content":
"北京天气晴，26度"

}

]


}
```

---

# 8. 第二次 Loop


Runtime 再进入：

```text
ContextBuilder

↓

LLM
```

LLM 看到：

```text
用户问题：

北京今天天气怎么样？


Observation:

北京天气晴，26度。

```


于是：

```json
{

"type":
"final",


"answer":

"北京今天晴天，26度"

}
```

---

Runtime：

```ts
return answer;
```

结束。

---

# 9. 完整 Trace

如果打印 Runtime Trace：

应该类似：

```text
[Step 0]

User:
北京今天天气怎么样？


[Decision]

ToolCall:
get_weather


[Execution]

Tool:
get_weather

Args:
{
 city:"北京"
}


[Observation]

{
 weather:"晴",
 temperature:26
}


[Step 1]


[Decision]

Final Answer


[Result]

北京今天晴，26度

```

---

这其实就是工业 Agent 的 Trace。

以后：

OpenAI Agents SDK

LangGraph

Claude Code

都会产生类似信息。

---

# 10. Day05 全部知识串联


现在回顾 Day05。

---

## Part A：Tool Calling 基础

解决：

> Agent 如何调用外部能力？


得到：

```text
LLM

↓

Tool Call
```

---

## Part B：Tool Decision


解决：

> 什么时候调用 Tool？


得到：

```text
Tool Calling

不是固定规则

而是 Decision Process
```

---

## Part C：Tool Schema


解决：

> LLM 如何理解 Tool？


得到：

```text
Tool Schema

=

LLM 与 Runtime 的协议
```

---

## Part D：Tool Registry


解决：

> Agent 有哪些能力？


得到：

```text
Capability Management
```

---

## Part E：Tool Executor


解决：

> Tool 如何安全执行？


得到：

```text
Execution Layer
```

---

## Part F：Permission / Human Approval


解决：

> 高风险动作怎么办？


得到：

```text
Runtime Control
```

---

## Part G：Observation


解决：

> Tool Result 如何反馈？


得到：

```text
Feedback Loop
```

---

## Part H：Multi Tool Loop


解决：

> 多步骤任务如何运行？


得到：

```text
Think

↓

Act

↓

Observe

↓

Update State

↓

Repeat
```

---

## Part I：Implementation


解决：

> 这些设计如何变成代码？


得到：

```text
Mini Agent Runtime
```

---

# 11. 工业映射

现在我们的小 Runtime 对应工业：

| Mini Runtime | 工业概念 |
|-|-|
| AgentRuntime | Agent Runner |
| StepRunner | Execution Step |
| RuntimeState | Agent State |
| ContextBuilder | Context Management |
| ToolRegistry | Capability Registry |
| ToolExecutor | Tool Runtime |
| Observation | Execution Feedback |
| LoopGuard | Runtime Policy |


---

# 12. 和 LangChain / LangGraph / OpenAI Agents SDK 对比


## OpenAI Agents SDK

核心：

```text
Runner

+

Tools

+

Handoff

+

Tracing
```


我们的：

```text
AgentRuntime

+

Tool System

+

State

+

Observation

```


思想高度一致。


---

## LangGraph


LangGraph 更强调：

```text
Graph State Machine
```


例如：

```text
Node A

↓

Node B

↓

Node C
```


而我们：

```text
Dynamic Loop
```


区别：

```text
Workflow

确定路径


Agent

动态路径
```

---

## Claude Code


更接近：

```text
Runtime Loop

+

Tools

+

Context Management

+

Human Interaction
```

尤其：

代码读取：

Tool

修改：

Tool

测试：

Tool


全部进入：

```text
Observation Loop
```

---

# 13. Day05 最终认知升级


学习 Day05 前：

你的理解：

```text
Agent

=
LLM

+
Tools

```

---

学习 Day05 后：

升级：

```text
Agent

=

Runtime

+

LLM Decision

+

Tool Execution

+

Observation

+

State Transition

+

Control Policy

```

---

更准确：

```text
LLM

负责：

想下一步做什么


Runtime

负责：

是否允许做

怎么执行

执行结果如何进入下一轮

什么时候结束

```

---

# Day05 Part I 完成 ✅

按照我们的固定学习闭环，下一步应该输出：

## 📚 下一节学习计划

进入：

# Day06：Memory System（Agent Memory）

核心问题：

> Agent 如何拥有长期记忆？


会学习：

1. Conversation ≠ Memory
2. Short-term Memory
3. Long-term Memory
4. Memory Extraction
5. Memory Retrieval
6. Memory Injection into Context
7. Memory 与 Context Builder 的关系
8. OpenAI Agents SDK / Claude Code / LangGraph 中 Memory 设计


---

## 📝 写书 TODO

新增章节：

```
Day05 Execution Engine

5.x Mini Agent Runtime Implementation

5.x.1 Runtime Skeleton

5.x.2 Tool System

5.x.3 Agent Executor Loop

5.x.4 Complete Execution Trace

```

---

## 📦 写书素材

核心代码思想：

```text
AgentRuntime

不是 Agent 本身。

它是：

Agent 生命周期管理器。
```

---

```text
Tool

不是函数。

它是：

Runtime 可调度的一项能力。
```

---

```text
Observation

不是 Tool Result。

它是：

Runtime 对外部世界反馈的理解。
```

---

# 本 Part 核心认知升级

从：

> Agent = 会调用工具的 LLM


升级：

> Agent = 一个由 Runtime 驱动的状态机。


---

# 🏗️ 工业级实现（Industrial Notes）

工业 Agent Runtime 必然包含：

- State Persistence
- Checkpoint
- Streaming Event
- Trace
- Retry
- Permission
- Human Approval
- Cost Control
- Memory


Mini Runtime 只是：

核心执行骨架。


---

# 🧭 知识地图


```text
Agent

 |
 Runtime

 |
 +-- Context Builder

 |
 +-- Decision Engine

 |
 +-- Execution Engine

        |
        +-- Tool Calling

        |
        +-- Observation

        |
        +-- Loop

 |
 +-- Memory System

 |
 +-- Workflow

 |
 +-- MCP

```


---

# 🧑‍💻 面试视角


面试问题：

## Q1：
Agent 和普通 Chatbot 最大区别？

回答：

> Chatbot 是一次 LLM 调用，而 Agent 是 Runtime 驱动的循环执行系统，通过 State、Tool、Observation 实现多步骤任务完成。


---

## Q2：
Tool Calling 的核心是什么？

回答：

> Tool Calling 不只是函数调用，而是 Runtime 提供给 LLM 的能力契约，通过 Schema、Registry、Executor 完成从决策到执行的闭环。


---

## Q3：
为什么 Agent 需要 Runtime？

回答：

> 因为 LLM 只负责生成下一步决策，不负责状态管理、权限控制、执行治理和生命周期管理。


---

# ❓本章思考题

1. 为什么 Tool Result 不能直接作为下一轮 Prompt？
2. 为什么 Runtime State 和 Context 必须分离？
3. 为什么 ToolExecutor 不应该属于 Tool？
4. 为什么 while(true) 不是工业 Agent Loop？
5. Claude Code 为什么可以看作一个 Runtime？


---

# 🔄 前置问题回收

Day04 遗留：

> Context Builder 为什么是 Runtime 核心？


现在答案：

因为：

```text
State

↓

Context Builder

↓

LLM Decision

↓

Action

↓

Observation

↓

State Update
```

Context Builder 是 Runtime 与 LLM 的桥梁。


---

Day05 Execution Engine 到这里完整闭环。

下一次进入：

# Day06：Memory System

我们会继续解决：

> 一个 Agent 如何从“一次性智能”变成“持续智能”。

## 16. User

还有要补充的吗

## 17. Assistant

有，Day05 Part I 虽然已经完成了，但是从**工业 Agent Runtime 设计角度**来看，还有几个非常值得补充的点。

这些不是为了增加复杂度，而是帮助你把现在的 Mini Runtime 认知，连接到真正的 OpenAI Agents SDK、Claude Code、LangGraph 这类工业实现。

---

# 补充 1：AgentRuntime 其实还缺一个「Event System」

我们现在的 Runtime：

```text id="g7f2x4"
AgentRuntime

 |
 v

StepRunner

 |
 v

ToolExecutor

 |
 v

Observation

 |
 v

State Update

```

逻辑已经通。

但是工业 Runtime 一般不会直接调用：

```ts
console.log()
```

而是产生 Event。


例如：

```ts
type RuntimeEvent =

 | {
    type:"llm_start"
   }

 | {
    type:"tool_called",
    tool:"get_weather"
   }

 | {
    type:"tool_completed"
   }

 | {
    type:"state_updated"
   }

 | {
    type:"final"
   }
```

然后：

```text
Runtime

  |
  |
 Event Stream

  |
  +---- UI

  |
  +---- Trace

  |
  +---- Logging

  |
  +---- Monitoring

```

---

为什么这个重要？


因为你之前问过：

> Claude Code 为什么可以实时显示它正在读取文件、修改文件？


答案：

不是因为它特殊。

而是 Runtime 暴露：

```text
Execution Event Stream
```


例如：

Claude Code：

```
Thinking...

Reading file xxx

Editing xxx

Running test

```

本质：

```json
{
type:"tool_called",

tool:"read_file"
}
```


所以：

未来 Day05 可以补充：

```
Runtime Event Bus
```

---

# 补充 2：State Update 不应该直接修改对象

我们之前写：

```ts
state.step++

state.observations.push()
```

为了教学简单。


工业一般不会这样。


更接近：

```text
Action

↓

Reducer

↓

New State

```


类似 Redux。


例如：

```ts
function reducer(
 state,
 event
){

 switch(event.type){

 case "OBSERVATION_ADDED":

 return {

   ...state,

   observations:[
     ...state.observations,
     event.data
   ]

 }

 }

}
```


为什么？


因为 Agent Runtime 需要：

## 1. Replay

重新播放：

```
Step1

Step2

Step3

```


## 2. Debug


比如：

为什么 Agent 选择调用数据库？


查看：

```
State Event History

↓

Decision Context

↓

Action
```


---

这个和你之前 Day04 的问题：

> Runtime State 如何持久化？

直接相关。


工业答案：

不是保存对象。

而是保存：

```
State Transition Log
```

---

# 补充 3：LLM Decision 也应该抽象成 Planner

我们现在：

```ts
const decision =
 await llm.run(context)
```


教学阶段没问题。


但是工业：

通常会抽象：

```ts
interface Planner {


 decide(
   context
 ):Promise<Action>


}
```


然后：

```text
AgentRuntime

       |

       v

Planner

       |

       +-------------+

       |             |

 LLM Planner   Workflow Planner


```


例如：

## Coding Agent

可能：

```text
LLM Planner
```


动态决定：

```
读取文件

修改代码

测试
```


---

## 企业审批 Agent

可能：

```text
Workflow Planner
```


固定：

```
提交申请

↓

主管审批

↓

财务审批

↓

完成
```


---

这也对应你之前观察：

> 很多企业 Agent 实际是 AI Assistant + Workflow。


原因：

企业把 Planner 固化成 Workflow。


---

# 补充 4：ToolExecutor 和 AgentRuntime 中间还可以有 Action Layer

现在：

```text
LLM

↓

ToolCall

↓

ToolExecutor

```


工业可能：

```text
LLM

↓

Action

↓

Policy Check

↓

ToolExecutor

```


例如：

LLM 输出：

```json
{
action:"refund",
amount:10000
}
```


Action Layer：

判断：

```
refund

需要权限？

金额？

是否人工审批？
```


然后：

决定：

```
execute

or

pause
```


这个其实就是你 Day05 Part F Human Approval 的延伸。

---

# 补充 5：Tool Calling 还有一个隐藏问题：Tool Result 可信度

这是很多教程不会讲的。


现在：

```text
Tool

↓

Observation

↓

LLM
```


但是：

Tool 返回：

```json
{
status:"SUCCESS"
}
```


LLM 默认相信。


工业需要：

```text
Observation

↓

Validation

↓

Context Injection

```


例如：

数据库 Tool：

返回：

```json
{
balance:-100000000
}
```


Runtime 应该检查。


所以：

Observation Processor 后面通常还有：

```
Validator

Normalizer

Summarizer

```

---

# 补充 6：Multi-Agent 其实就是多个 Runtime

提前埋一个伏笔。


很多人理解：

Multi-Agent：

```
多个 LLM
```


实际上：

更准确：

```
多个 Runtime Instance

+

Agent Communication
```


例如：

Coding Agent：

```
Planner Runtime

        |

        v

Coder Runtime

        |

        v

Reviewer Runtime
```


每个 Agent：

都有：

- State
- Loop
- Tools
- Context


---

# 补充 7：Day05 最容易误解的一点

我觉得你目前已经理解，但是这里再强化：

## Tool 不是 Agent 能力本身

很多人说：

> 给 Agent 加几个 API，它就变聪明。


实际上：

Tool 只是：

```
Execution Capability
```


真正决定 Agent 能力的是：

```
Context Builder

+

Decision

+

Loop

+

Memory

+

Tool

```

比如：

同一个：

```
search_tool
```


给 ChatGPT：

可能只是搜索。


给 Claude Code：

变成：

```
搜索代码

定位问题

修改

测试
```


区别不是 Tool。

区别是 Runtime。

---

# Day05 最终补充后的知识地图

现在完整版：

```
                  Agent Runtime


                       |

        +--------------+--------------+

        |                             |

    Decision Engine              Execution Engine


        |                             |

    Planner                    Tool System


        |                             |

    Context Builder             Tool Registry


        |                             |

    LLM                         Tool Executor


                                      |

                                 Observation


                                      |

                              State Transition


                                      |

                              Event System


                                      |

                              Persistence


                                      |

                               Memory System

```

---

# 我认为 Day05 到这里可以正式结束 ✅

原因：

你已经掌握了：

- Tool Calling 为什么存在
- Tool Schema 为什么重要
- Tool Registry 的意义
- Tool Executor 与 Tool 的边界
- Observation 为什么不是 Result
- Multi Tool Loop
- Mini Runtime 实现


而且最重要：

你已经完成了一个认知跃迁：

> Agent 的核心不是调用工具，而是 Runtime 如何管理「决策 → 执行 → 反馈 → 状态演化」。


下一阶段 Day06 Memory System 会非常自然：

因为现在 Runtime 已经会：

```
短期运行
```

下一步解决：

```
长期演化
```

也就是：

> Agent 如何记住过去，并影响未来的 Context。


Day05 完成。进入 Day06 前，这一节没有必须补充的内容了。你可以开始 Day06。
