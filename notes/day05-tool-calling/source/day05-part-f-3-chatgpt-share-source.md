# Day05 Part F-3 ChatGPT 分享会话源记录

- 来源链接：https://chatgpt.com/share/6a6c6731-d744-83ee-9f11-a760aa23dcd8
- 会话标题：Day05 Part F-3学习
- 抽取时间：2026-07-31

> 本文件由分享页 React Router 数据中的 `linear_conversation` 结构还原可见 user / assistant / tool 文本消息，用于保留 Day05 Part F-3 学习原始记录。分享页中的 tool 输出被平台隐藏时，仅能还原其 redacted 提示文本。

## 1. User

这是 day05 的 readme 以及 part f 前半部分的学习笔记，我们开始进行 part f-3 的学习

## 2. Tool

The output of this plugin was redacted.

## 3. Tool

The output of this plugin was redacted.

## 4. Tool

The output of this plugin was redacted.

## 5. Tool

The output of this plugin was redacted.

## 6. Assistant

好的，我们继续 **Day05 Part F-3：Human-in-the-loop（人工审批机制）**。

我已经读取了 Day05 README 和 Part F 前半部分笔记。当前进度定位如下：

fileciteturn0file0L1-L20  
Day05 Part F 的定位是从 **Execution Engine 进入 Governance Layer**：

> Agent 已经拥有行动能力后，Runtime 如何限制它、审计它，并在必要时暂停执行等待人工决策。  
fileciteturn0file1

前半部分我们已经完成：

```
Part F-1 Permission Model
        |
        v
Part F-2 Policy Engine / Security Boundary
```

核心认知：

```
LLM Output
    |
    v
Tool Call Intent
    |
    v
Policy Evaluation
    |
    +---- allow
    |
    +---- deny
    |
    +---- approval_required
```

剩余部分就是：

# Day05 Part F-3：Human-in-the-loop（人工审批机制）

核心问题：

> Agent 如何在高风险任务中暂停执行，等待人工决策，然后恢复 Runtime？

也就是把：

```
approval_required
```

真正实现成 Runtime 能理解的状态。

---

# 1. 为什么 Human Approval 是 Agent 特有的问题？

传统系统：

```
User
 |
 v
Button Click
 |
 v
API
 |
 v
Execute
```

例如：

用户点击：

```
退款按钮
```

系统知道：

```
用户主动发起退款
```

但是 Agent：

```
User:
帮我处理这个客户问题

       |
       v

LLM:

我认为应该执行：

refund_order
{
 orderId:"001",
 amount:10000
}

       |
       v

Executor
```

这里的问题：

**动作不是用户明确点击产生，而是 AI 推理产生。**

所以：

```
User Intent
        ≠
Agent Action
```

中间需要一个：

```
Human Decision Gate
```

---

# 2. Human Approval 在 Runtime 中的位置

回顾 Part E：

Tool Executor：

```
Tool Call Intent
        |
        v
Tool Lookup
        |
        v
Input Validation
        |
        v
Permission Check
        |
        v
Execution
```

加入 Human Approval：

```
                Runtime

LLM
 |
 |
 v
Tool Call Intent
 |
 v
Validation
 |
 v
Policy Engine
 |
 +----------------+
 |                |
allow             |
 |                |
 v                |
Execute           |
                  |
approval_required
                  |
                  v
          Human Approval Queue
                  |
                  v
             Human Decision
                  |
          +-------+-------+
          |               |
       approve          reject
          |               |
          v               v
       Resume           Stop
```

注意：

Human Approval **不是替代 Permission**。

顺序：

```
Permission
    |
    v
Risk Assessment
    |
    v
Human Approval
    |
    v
Execution
```

---

# 3. 哪些 Action 需要人工确认？

不能简单：

```
所有 Tool 都人工确认
```

否则 Agent 没意义。

工业设计一般按照 Risk Level：

## Level 0：只读

例如：

```
query_order
search_customer
get_weather
```

特点：

- 无状态修改
- 无资金影响

策略：

```
auto execute
```

---

## Level 1：低风险写操作

例如：

```
update_customer_note
change_delivery_address
```

可能：

```
auto execute
```

或者：

```
条件审批
```

例如：

地址修改：

```
订单未发货
    |
    v
允许

订单已发货
    |
    v
需要人工
```

---

## Level 2：业务影响

例如：

```
refund_order
cancel_subscription
send_external_email
```

策略：

```
approval_required
```

---

## Level 3：高危操作

例如：

```
delete_customer_data
delete_database
transfer_money
```

策略：

```
deny
```

或者：

```
multiple approval
```

---

所以 Runtime 中通常存在：

```ts
enum RiskLevel {

 READ,

 WRITE,

 FINANCIAL,

 DESTRUCTIVE

}
```

然后 Policy：

```ts
if (
 tool.riskLevel === "FINANCIAL"
 &&
 amount > 5000
) {

 return {
   type:"approval_required"
 }

}
```

---

# 4. Approval Request 如何建模？

这是 Part F-3 最核心的工程问题。

很多初学者会设计：

```ts
await waitHuman()
```

然后阻塞。

这是错误的。

为什么？

因为 Agent 可能等待：

- 几分钟
- 几小时
- 几天


Runtime 不能一直占用进程。

所以 Human Approval 本质是：

```
Durable Workflow State
```

---

## Approval Request 数据模型

例如：

```ts
type ApprovalRequest = {

 id:string;


 // 谁申请
 userId:string;


 // 哪个 Agent
 agentId:string;


 // 哪个任务
 taskId:string;


 // 要执行什么动作
 toolCall:{
    name:string;
    arguments:any;
 };


 // 为什么需要审批
 reason:string;


 status:
   | "pending"
   | "approved"
   | "rejected";


 createdAt:number;


 resolvedAt?:number;

}
```

例如：

```json
{
"id":"approval_001",

"taskId":"task_123",

"toolCall":{

"name":"refund_order",

"arguments":{

"orderId":"001",

"amount":10000

}

},

"reason":

"refund amount exceeds limit",

"status":

"pending"

}
```

---

# 5. Runtime 为什么必须 Suspend？

重点来了。

假设：

```
Agent Task:

1. 查询订单
2. 判断退款
3. 请求审批
4. 退款
5. 通知客户
```

执行到：

```
step 3
```

暂停。


如果 Runtime 不保存状态：

进程：

```
crash
```

那么：

```
Agent 不知道自己做到哪里
```

所以必须保存：

```
Runtime State
```

---

回顾 Day04：

Runtime State 类似：

```
Agent 的 Redux Store
```

这里继续扩展：

之前：

```ts
RuntimeState
{
 messages,
 memory,
 tools,
 context
}
```

现在：

```ts
RuntimeState
{

messages,

memory,


pendingAction:{


 type:"approval",


 approvalId:"approval_001",


 toolCall:{


  name:"refund_order",


  arguments:{}


 }

}

}
```

---

也就是说：

Human Approval 不是：

```
暂停函数
```

而是：

```
Runtime State Transition
```

---

# 6. Suspend 状态机

工业 Agent Runtime 通常有状态机。


以前：

```
RUNNING
```

现在：

```
CREATED

  |
  v

RUNNING

  |
  v

WAITING_APPROVAL

  |
  +----------+
  |          |
approve   reject

  |          |

  v          v

RUNNING    FAILED

  |

  v

COMPLETED
```


定义：

```ts
enum RuntimeStatus {

 CREATED,

 RUNNING,


 WAITING_APPROVAL,


 COMPLETED,


 FAILED

}
```

---

# 7. Approval 后如何 Resume？

重点：

人工点击：

```
Approve
```

之后发生什么？


不是：

```
重新调用 LLM
```

而是：

Runtime 找回：

```
pending tool call
```

继续执行。


流程：

```
Human

Approve

 |
 v

Approval Service

 |
 v

Runtime

 |
 v

Load Runtime State

 |
 v

Find Pending Tool Call

 |
 v

Execute Tool

 |
 v

Observation

 |
 v

Continue Agent Loop
```

---

代码类似：

```ts
async function resume(taskId:string){

 const state =
   await runtimeStore.load(taskId);


 const pending =
   state.pendingAction;


 if(
   pending.type==="approval"
 ){

    await executor.execute(
       pending.toolCall
    );

 }

}
```

---

# 8. Human Decision 如何变成 Observation？

这是 Agent Runtime 一个非常重要的思想。


在 ReAct：

```
Thought

Action

Observation

Thought

Action
```


Human Approval 其实也是一种：

```
Observation
```

例如：

之前：

```
Action:

refund_order


Observation:

refund_success
```

现在：

```
Action:

refund_order


Observation:

human approved refund
```

然后：

LLM 得到：

```
Human approved the refund.

Continue.
```

---

所以：

Human:

```
Approve
```

进入 Runtime：

↓

转换：

```
Observation Event
```

↓

Context Builder:

```
加入 Context
```

↓

LLM:

继续推理。


---

# 9. Claude Code 中 Human Approval 的映射

你之前特别关注 Claude Code，这里对应一下。


Claude Code 执行：

例如：

```
rm -rf project
```

或者：

```
modify production config
```

不会直接执行。


Runtime：

检测：

```
dangerous command
```

进入：

```
Permission Gate
```

显示：

```
Allow this action?
```

用户：

```
Yes
```

继续。


本质：

```
Tool Call

      |

Risk Evaluation

      |

Human Approval

      |

Execute
```

和企业 Agent 完全一致。


---

# 10. 企业 Agent 真实案例

客服 Agent：

用户：

```
帮我处理退款
```


Agent：

```
query_order

↓

check_policy

↓

refund_order
```


但是：

金额：

```
20000
```


Policy：

```
approval_required
```


Runtime：

保存：

```
task_001

pending refund_order
```


运营人员：

后台：

```
Approve
```


Runtime：

恢复：

```
refund_order

↓

refund_success

↓

notify_customer
```


整个过程：

不是 Chatbot。

而是：

```
Durable Agent Workflow
```

---

# 11. Part F-3 核心认知升级

到这里，需要升级一个非常重要的认知：

之前：

```
Agent Loop
```

理解：

```
Think
 |
Act
 |
Observe
```

现在：

工业 Agent：

```
Think

 |

Act Proposal

 |

Governance

 |

Execute

 |

Observe
```

中间多了一层：

```
Governance Loop
```

---

最终工业架构：

```
                 User

                  |

                  v


             Agent Runtime


                  |

        +---------+---------+

        |                   |

   Decision Layer      Governance Layer

        |                   |

       LLM              Policy

                            |

                       Approval


                  |

                  v


              Executor


                  |

                  v


             Business System
```

---

# 本节暂时学习到这里

Part F-3 后半部分我们还需要继续展开：

下一阶段重点：

1. Approval Service 如何设计
2. Approval Queue
3. 多人审批
4. 超时审批
5. Approval Timeout 后 Runtime 怎么处理
6. Human Approval 与 Workflow Engine 的关系
7. LangGraph interrupt/resume 映射
8. OpenAI Agents SDK 的 Human Approval 映射
9. mini-agent-runtime 如何实现 Suspend/Resume

这部分会直接连接后面的：

```
Day06 Runtime State Persistence
```

因为 Human Approval 本质上是：

> Runtime State 持久化之后，允许 Agent 跨时间继续执行。

下一节继续：
**Day05 Part F-3（下）：Approval Workflow + Suspend/Resume Runtime 实现**。

## 7. User

你确定下学习 day05 别跑偏了哇。然后继续学习 Part F-3 下半部分

## 8. Tool

The output of this plugin was redacted.

## 9. Assistant

先确认一下，你这个提醒是对的。我重新对照了一下 Day05 README 和 Part F 文档，我们**没有跑偏**，但是上一节 Part F-3 上半部分有一点点“提前展开 Day06 Runtime State Persistence”的倾向。

严格按照 Day05 的路线：

fileciteturn0file0L1-L20

Day05 主线是：

```text
Tool Calling（Execution Engine）

A Tool Calling Basics
B Tool Decision
C Tool Schema
D Tool Registry
E Tool Executor
F Permission & Human Approval
G Tool Result Runtime Feedback
H Multi Tool Loop
I Mini Tool Runtime Implementation
```

其中 Part F 的目标：

fileciteturn0file0L130-L153

重点是：

1. Agent Permission
2. RBAC / ABAC 区别
3. Permission Check 在 Executor Pipeline 的位置
4. Policy Engine
5. PDP / PEP
6. allow / deny / approval_required 三态
7. Prompt Injection 与 Runtime Governance
8. Agent Security Boundary
9. Human Approval 为什么不是唯一安全兜底

所以 Part F-3 **不是深入讲 Runtime Persistence**。

正确定位应该是：

> Human Approval 作为 Permission Decision 的一种执行分支，如何影响 Tool Execution Lifecycle。

而不是：

> 如何实现完整 Durable Workflow Engine。

后者属于后续 Runtime State Persistence / Workflow Engine。

刚才我讲到：

- Approval Queue
- Durable State
- Resume
- 长时间暂停

这些方向是正确关联，但是深度应该控制。

工业系统确实通常需要 suspend/resume，例如一些 Agent Workflow 会把 approval 作为可持久化步骤，在人工确认后恢复执行。citeturn0search0turn0search2

但是在 Day05 阶段，我们只需要理解：

**Runtime 为什么需要支持 pending 状态。**

不用提前实现 Workflow Engine。


---

# Day05 Part F-3 下半部分

## Human Approval 如何进入 Tool Executor 生命周期

回顾 Part E：

Tool Executor：

```text
Tool Call Intent
        |
        v
Tool Registry Lookup
        |
        v
Input Validation
        |
        v
Permission Check
        |
        v
Execute Tool
        |
        v
Tool Result
```

现在加入 Human Approval：

```text
Tool Call Intent

        |

        v

Validation

        |

        v

Policy Engine

        |

        +-------------+
        |             |
        v             v

     allow     approval_required

        |             |

        v             v

    Execute     Human Decision

                      |

              +-------+-------+

              |               |

          approve          reject

              |               |

              v               v

          Execute          Deny

```

核心：

> Human Approval 不是 Tool 的逻辑，而是 Permission Decision 的一种结果。


---

# 1. Approval 不是“询问用户一句话”

很多 Demo Agent：

```text
Agent:

我要退款，需要确认。

User:

确认。

Agent:

执行退款。
```

这个理解太浅。


工业 Runtime 需要确认的是：

**确认什么？**

不是：

```text
继续吗？
```

而是：

```json
{
 "action":"refund_order",

 "target":{
    "orderId":"ORD-001"
 },

 "effect":{
    "amount":10000
 },

 "risk":"financial",

 "reason":
 "refund exceeds automatic threshold"
}
```


Human 审批的是：

> 这个具体 Action Intent。

而不是：

> 让 Agent 随便继续。


---

# 2. Approval 必须绑定 Tool Call Intent

为什么？

假设：

第一次：

```json
{
"name":"refund_order",

"amount":1000
}
```

人工：

Approve


但是攻击者修改：

```json
{
"name":"refund_order",

"amount":100000
}
```


如果 Approval 只是：

```text
approved=true
```

危险。


所以：

Approval 必须绑定：

```text
User
+
Agent
+
Session
+
Tool
+
Arguments
+
Timestamp
```


类似：

```ts
type ApprovalRecord = {

 approvalId:string;


 toolCallId:string;


 toolName:string;


 arguments:any;


 approvedBy:string;


 status:
 "approved"
 |
 "rejected";

}
```


核心：

> 人批准的是一次具体行动，不是给 Agent 永久授权。


---

# 3. 为什么 Approval 发生在 Tool Execute 前？


错误：

```text
LLM

↓

Execute Tool

↓

Ask Human
```


已经晚了。


比如：

```text
delete_database()
```

执行以后：

再问：

```text
是否允许？
```


没有意义。


正确：

```text
LLM

↓

Intent

↓

Policy

↓

Approval

↓

Execute

```


所以 Human Approval 是：

```text
Pre-execution Gate
```

执行前闸门。


---

# 4. Approval 和 Permission 的关系

这里容易混淆。


Permission：

回答：

> 有没有资格做？


Approval：

回答：

> 这个具体动作现在是否需要人确认？


例如：

员工：

```text
customer_service
```


权限：

```text
refund:create
```


所以：

Permission:

```text
allow
```


但是：

金额：

```text
50000
```


Policy:

```text
approval_required
```


最终：

```text
Permission:

你有退款能力。


Approval:

这次退款需要经理确认。
```


---

# 5. Runtime 如何表示 Pending？

Day05 不需要实现完整状态机，但是需要理解：

Executor 不能返回：

```ts
throw Error
```


因为：

Approval 不是错误。


错误：

```text
Tool不存在

参数错误

权限不足
```


Approval：

```text
等待外部事件
```


所以 Result 类型需要扩展。


例如：

```ts
type ExecutionResult =

{
 type:"success",
 data:any
}

|

{
 type:"error",
 error:string
}

|

{
 type:"pending",
 reason:string,
 approvalId:string
}
```


这里很关键：

```text
pending
```

也是 Agent Loop 的一种 Observation。


---

# 6. Agent Loop 如何处理 pending？

普通：

```text
Thought

↓

Action

↓

Observation

↓

Thought
```


加入 Approval：

```text
Thought

↓

Action Proposal

↓

Governance

↓

Pending Approval

↓

(wait)

↓

Human Decision

↓

Observation

↓

Continue
```


也就是说：

Agent Loop 不一定每次：

```text
Action -> Result
```


可能：

```text
Action -> Pending -> External Event -> Result
```


这就是为什么 Agent Runtime 和普通函数调用不同。


---

# 7. Human Approval 不是安全边界


这里再次强化 Part F 的核心思想。


错误：

```text
危险操作

↓

人工审批

↓

安全
```


正确：

```text
User Authentication

↓

Agent Permission

↓

Policy Engine

↓

Human Approval

↓

Executor

↓

Business Authorization

```


Human 只是增加：

```text
Human Judgment
```

不是替代：

- 权限
- 校验
- 业务规则


---

# 8. Claude Code 映射


你之前问过 Claude Code。


例如：

Agent：

```text
修改项目配置
```


LLM：

```json
{
"tool":"shell",

"command":
"npm uninstall xxx"
}
```


Runtime：

检查：

```text
risk = medium
```


可能：

```text
approval_required
```


用户：

```text
Allow
```


Runtime：

继续：

```text
Executor
```

这就是：

```text
Tool Approval Gate
```


---

# 9. mini-agent-runtime 最小实现


Day05 我们只需要做到：

## PermissionDecision


```ts
type PermissionDecision =

{
 type:"allow"
}

|

{
 type:"deny",
 reason:string
}

|

{
 type:"approval_required",
 approvalId:string
}
```


Executor：

```ts
const decision =
 await permission.check(
   tool,
   call,
   context
 );


if(decision.type==="allow"){

 return tool.execute();

}


if(decision.type==="deny"){

 return {
   error:"permission_denied"
 };

}


if(
 decision.type==="approval_required"
){

 return {

   status:"pending",

   approvalId:
      decision.approvalId

 };

}
```


到这里 Day05 的实现目标已经满足。

---

# Part F-3 最终认知升级


之前：

```text
Agent
=
LLM + Tools
```


现在：

```text
Industrial Agent

=
LLM

+

Runtime

+

Tool System

+

Governance Layer

```


其中：

```text
Tool System
解决：

Agent 能不能做


Governance Layer
解决：

Agent 应不应该做
```


Human Approval：

不是让 AI 变聪明。

而是：

> 在 AI 具备行动能力后，引入人类作为高风险决策节点。


---

# Day05 Part F 完成情况

现在 Part F 可以认为完整结束：

✅ Permission Model

✅ Agent Permission vs RBAC

✅ Policy Engine

✅ PDP / PEP

✅ allow / deny / approval_required

✅ Tool Metadata Boundary

✅ Prompt Injection Risk

✅ Agent Security Boundary

✅ Business Security Boundary

✅ Human Approval


下一节进入：

# Day05 Part G：Tool Result Runtime Feedback

核心问题：

> Tool 执行完以后，结果如何重新进入 Runtime，让 Agent 继续思考？


这会重新连接 Day04：

```text
Runtime State

Context Builder

Context Window

Observation
```

也是把：

```text
Tool Calling
```

闭环成：

```text
Think
  |
Action
  |
Execute
  |
Observation
  |
Think Again
```

这才是完整 Agent Loop。

## 10. User

那 part f-3 还有需要补充的吗

## 11. Assistant

我重新检查了一下 Day05 的整体目标，以及 Part F 在整个 Tool Calling 链路中的位置。

结论：

**Part F-3（Human-in-the-loop）核心内容已经学完，不需要再展开大章节。**

但是有几个点我建议补充一下，因为它们刚好是 **工业 Agent 和 Demo Agent 的分水岭**，并且会影响后面的 Part G、H、I。

---

# Part F-3 补充 1：Human Approval 本质是 Runtime Event，不是 Permission

这个点非常重要。

很多人会误认为：

```
Permission
    |
    v
Human Approval
```

好像 Approval 是 Permission 的子模块。

更准确：

```
Governance Layer

        |
        |
+----------------+
|                |
Permission       Human Decision
|                |
Policy           Approval Workflow
```

也就是说：

## Permission 是系统判断

例如：

```
用户 Alice

是否允许 refund_order？
```

结果：

```
approval_required
```

这是 Runtime 的自动判断。


---

## Human Approval 是外部事件

例如：

```
Manager Bob

点击 Approve
```

这个不是 Runtime 自己计算出来的。

它来自：

```
External Human Event
```


所以更准确模型：

```
Tool Call Intent

      |
      v

Policy Decision

      |
      v

Runtime Event:

WAITING_HUMAN_APPROVAL


      |
      v

External Event:

Human Approved


      |
      v

Continue Execution
```


这也是为什么后面会连接：

- Event-driven Runtime
- Workflow Engine
- Durable Execution


但是 Day05 只需要知道：

> Approval 是 Runtime 生命周期中的一种外部事件。

---

# Part F-3 补充 2：Approval Scope（审批粒度）

工业系统还有一个容易忽略的问题：

**人工批准的范围是什么？**

例如：

Agent：

```
我要退款
```

人工：

```
批准
```

到底批准什么？

有三种设计。

---

## 1. Action Approval（推荐）

批准一次具体动作。


例如：

```json
{
 "tool":"refund_order",

 "orderId":"001",

 "amount":10000
}
```


Human:

```
Approve
```

只允许：

```
refund_order(001,10000)
```


优点：

安全。


缺点：

频繁审批。


---

## 2. Capability Approval

批准 Agent 使用某类能力。


例如：

```
允许客服 Agent 今天可以退款
```


类似：

```
grant capability
```


风险：

如果 Agent 后续错误判断：

```
refund_order(500000)
```

可能继续执行。


所以需要额外限制：

```
Capability
+
Policy Constraint
```

---

## 3. Session Approval

例如：

Claude Code：

```
Allow npm install commands during this session
```

类似：

```
本次任务允许 shell 操作
```


优点：

体验好。


缺点：

风险扩大。


---

工业 Agent 通常：

```
低风险:

Capability Approval


高风险:

Action Approval
```


---

# Part F-3 补充 3：Approval Timeout

这是企业场景一定会遇到的问题。


例如：

Agent：

```
等待财务审批退款
```


然后：

3天没人处理。


Runtime 怎么办？


需要 Policy：

例如：

```
approval_timeout = 24h
```


超过：

```
pending

    |

    v

expired
```


状态：

```ts
enum ApprovalStatus {

 pending,

 approved,

 rejected,

 expired

}
```


Runtime 行为：

```
expired

↓

cancel tool execution

↓

notify user
```


---

# Part F-3 补充 4：Approval 与 Audit Log

工业 Agent 必须记录：

不是：

```
谁点击了按钮
```

而是完整 Action Chain：


```
User Request

↓

LLM Decision

↓

Tool Call Intent

↓

Policy Decision

↓

Approval Request

↓

Human Decision

↓

Tool Execution

↓

Result
```


例如：

Audit:

```json
{
"user":"Alice",

"agent":"refund-agent",

"tool":"refund_order",

"amount":10000,

"policy":

"approval_required",

"approvedBy":

"Bob",

"time":

"2026-07-31"
}
```


为什么？


因为企业关心：

> AI 为什么做这个动作？

而不仅：

> 谁执行了这个动作？


这也是 Agent 和普通 API 审计最大的区别。

---

# Part F-3 补充 5：Approval 和 MCP 的关系（提前关联）

你后面 Day10 会学 MCP，所以这里提前埋一个概念。


MCP Tool：

```
external filesystem

database

github

browser
```

进入 Runtime 后：

仍然只是：

```
Tool
```


所以：

MCP Tool：

```
MCP Server

    |

    v

Tool Registry

    |

    v

Permission

    |

    v

Approval

    |

    v

Executor
```


MCP 不绕过 Governance。


这是非常重要的工业认知：

> 外部能力越强，越需要 Runtime Governance。

---

# Part F-3 是否需要增加代码实现？

我认为不用。

原因：

Day05 Part I 才实现 mini-tool-runtime。

现在只需要形成设计认知：

```
PermissionService

        |

        v

PermissionDecision

        |

        +---- allow

        +---- deny

        +---- approval_required

```


真正代码：

- ApprovalStore
- Approval API
- Resume Handler
- Event Bus

属于：

- Runtime State Persistence
- Workflow Engine

不是 Day05 主线。

---

# Part F 完整知识闭环

现在 Day05 Part F 可以形成：

```
                 Agent Action Governance


LLM

 |

 | Tool Call Intent

 v


Validation

 |

 v


Policy Engine

 |

 +-------------+

 |             |

allow       approval_required

 |             |

 v             v

Execute    Human Approval

               |

               v

          Human Event

               |

               v

            Resume


 |

 v


Business API Authorization


 |

 v


External World

```


---

# 最终判断

Part F-3：

✅ 已达到 Day05 学习目标

补充后：

✅ 工业视角完整

不建议继续深入：

- Workflow Engine
- Durable Execution
- Event Sourcing
- Temporal
- LangGraph Persistence

这些会在后续章节自然展开。


所以：

**Day05 Part F 可以正式结束。**

下一节进入：

# Day05 Part G：Tool Result Runtime Feedback

这个 Part 会非常关键，因为它会把 Day04 的：

```
Context Builder
Runtime State
Observation
```

和 Day05 的：

```
Tool Calling
Executor
Permission
```

真正闭环。

也就是回答：

> Tool 执行完以后，Agent 为什么还能继续思考？结果到底进入了哪里？


这会是 Agent Runtime Loop 的完整闭环。

## 12. User

如果没有要补充的了，你把固定环节输出下

## 13. Assistant

好的，确认一下：

**Day05 Part F：Permission & Human Approval 已正式结束。**

本 Part 没有遗漏需要继续补充的核心内容。

补充内容也已经覆盖到合理边界：

- Permission Decision 三态模型
- Policy Engine
- PDP / PEP
- Agent Permission vs RBAC / ABAC
- Tool Metadata 不是安全边界
- Tool Call Intent 不可信
- Prompt Injection 与 Action Governance
- Agent Security Boundary
- Business Security Boundary
- Least Privilege
- Human Approval
- Approval Scope
- Approval Timeout
- Audit Log
- MCP 与 Governance 关系

继续深入：

- Durable Execution
- Workflow State Machine
- Event Sourcing
- Temporal
- LangGraph Persistence

这些属于后续 Runtime State Persistence / Workflow Engine 范畴，不属于 Day05 Tool Calling 主线。

下面按照我们固定学习结束结构输出。

---

# 📚 下一节学习计划

## Day05 Part G：Tool Result Runtime Feedback

核心问题：

> Tool 执行完成以后，结果如何重新进入 Runtime，让 Agent 继续推理？

前面：

```text
Day04

Runtime State
Context Builder
Context Window
```

解决：

> Agent 如何思考？

---

Day05 Part A-F：

解决：

```text
Agent 如何行动？

以及：

行动是否允许？
```

---

Part G 将完成闭环：

```text
              User Goal

                  |

                  v

                LLM

                  |

                  v

            Tool Call Intent

                  |

                  v

              Governance

                  |

                  v

              Executor

                  |

                  v

              Tool Result

                  |

                  v

              Runtime State

                  |

                  v

            Context Builder

                  |

                  v

                 LLM
```

重点学习：

1. Tool Result 为什么不是简单 return
2. Tool Result 与 Observation 的关系
3. Tool Result 如何进入 Runtime State
4. 为什么 Context Builder 需要处理 Tool Result
5. Success / Error / Partial Result 如何建模
6. Tool Result Compression
7. 大结果如何避免污染 Context Window
8. OpenAI Agents SDK / Claude Code 中 Observation 的真实映射
9. mini-agent-runtime 如何实现 Result Pipeline


---

# 📝 写书 TODO

## TODO 1：增加 Agent Governance Layer 章节

建议标题：

```text
Agent 为什么需要治理层：
从 Tool Calling 到安全执行
```

核心观点：

普通 Agent：

```text
LLM
 |
Tool
 |
Execute
```

工业 Agent：

```text
LLM

 |

Action Proposal

 |

Governance

 |

Execution

 |

Business System
```

---

## TODO 2：补充一个核心概念

### LLM Output ≠ Instruction

传统程序：

```ts
deleteUser(id)
```

代表：

开发者明确调用。


Agent：

```json
{
 "tool":"delete_user",
 "arguments":{
   "id":"001"
 }
}
```

只是：

```text
Action Proposal
```

必须经过：

```text
Validation

Authorization

Policy

Approval

Execution
```

---

## TODO 3：补充 Agent Permission 与传统权限对比


传统：

```text
User

 |

Role

 |

Permission

 |

Resource
```


Agent：

```text
User

 |

Agent

 |

Action Intent

 |

Policy

 |

Resource
```


核心变化：

> 系统第一次需要治理“机器产生的动态行动”。

---

## TODO 4：补充 Human Approval 定位


错误：

```text
危险操作

↓

人工确认

↓

安全
```


正确：

```text
Policy

↓

Risk Assessment

↓

Human Approval

↓

Executor

↓

Business Validation
```


Human Approval：

不是安全边界。

它是：

```text
Risk Management Layer
```

---

# 📦 写书素材


## 素材 1：Agent Runtime 类似操作系统 Kernel


映射：

| Operating System | Agent Runtime |
|-|-|
| Application | LLM |
| System Call | Tool Call |
| Kernel Permission | Policy Engine |
| Process State | Runtime State |
| Scheduler | Runtime Loop |
| File Permission | Tool Permission |


核心观点：

> LLM 类似应用程序，Runtime 类似 Kernel。LLM 可以提出请求，但不能直接触碰外部世界。


---

## 素材 2：Agent Security 三层模型


```text
              User

               |

               v

       Agent Governance Layer

               |

               v

       Business Application Layer

               |

               v

             Data Layer
```


职责：

Agent Layer：

- 控制 AI Action
- 防止误操作
- 防止 Prompt Injection
- 限制 Tool 能力


Business Layer：

- 业务规则
- 最终授权
- 数据一致性


Data Layer：

- 数据保护
- Secret Security
- Access Control


---

## 素材 3：Human Approval 本质


不是：

```text
人工替 AI 决策
```


而是：

```text
Agent Action Lifecycle 中增加一个 Human Decision Event
```


流程：

```text
Intent

↓

Policy

↓

Approval Event

↓

Execution

↓

Observation
```


---

# 本 Part 核心认知升级


## 从：

```text
Agent = LLM + Tools
```


升级为：

```text
Agent

=

LLM

+

Runtime

+

Tool System

+

Governance Layer

+

Business System
```


---

本 Part 最大认知：

> Agent 的难点不是让 AI 获得能力，而是在 AI 获得能力以后，让它只能在正确、安全、可审计的边界内行动。


---

进一步升级：

```text
LLM

=
概率性决策组件


Runtime

=
确定性控制系统


Business System

=
最终可信边界
```


---

# 🏗️ 工业级实现（Industrial Notes）


企业 Agent 通常不会设计：

```text
LLM -> Tool -> API
```


而是：

```text
                Agent Runtime


User

 |

v


LLM Decision Layer

 |

v


Action Intent

 |

v


Governance Layer

 |

+----------------+

|                |

Policy       Human Approval


 |

v


Execution Layer

 |

v


Business API

 |

v


Database
```


工业实践：

### 1. Tool Registry

管理：

- Tool Capability
- Risk Metadata
- Permission Requirement


---

### 2. Policy Engine

负责：

- Authorization
- Risk Evaluation
- Approval Decision


---

### 3. Executor

负责：

- 强制执行策略
- 参数校验
- Audit


---

### 4. Business Service

负责最终：

- Authentication
- Authorization
- Business Rule Validation


---

### 5. Audit System

记录：

```text
User Request

↓

LLM Decision

↓

Tool Call

↓

Policy Decision

↓

Human Approval

↓

Execution Result
```


---

# 🧭 知识地图


当前 Day05 进度：

```text
Day05 Tool Calling


Part A
Tool Calling Basics

        |

        v


Part B
Tool Decision

        |

        v


Part C
Tool Schema

        |

        v


Part D
Tool Registry

        |

        v


Part E
Tool Executor

        |

        v


Part F
Permission & Human Approval

        |

        +----------------+

        |

        Permission Model

        Policy Engine

        PDP / PEP

        Security Boundary

        Human Approval


        |

        v


Part G
Tool Result Runtime Feedback
```

---

# 🧑‍💻 面试视角


## Q1：为什么 Agent 需要 Human Approval？

高级回答：

> 因为 LLM 输出的是概率性的 Action Proposal，而不是可信执行指令。对于高风险动作，Runtime 需要引入 Human-in-the-loop，在 Policy Decision 后、Tool Execution 前增加人工确认节点。


---

## Q2：Human Approval 是否可以替代 Permission？

回答：

> 不可以。Permission 判断 Agent 是否具备执行能力，Human Approval 是针对某一次高风险 Action 的人工决策，两者属于不同治理层。


---

## Q3：为什么 Tool Metadata 不能作为安全边界？

回答：

> Metadata 只是能力声明和策略输入，真正安全边界应该由 Runtime Policy Engine、Executor Enforcement 和 Business Authorization 共同保证。


---

## Q4：Agent Runtime 为什么不能完全相信 LLM？

回答：

> 因为 LLM 输出具有概率性，并可能受到 Prompt Injection、错误上下文影响。因此 Tool Call Intent 必须经过 Runtime Validation、Policy、Approval 和业务系统最终校验。


---

## Q5：Agent Permission 和传统 RBAC 区别？

回答：

> RBAC 解决用户访问资源的问题，而 Agent Permission 解决 AI 代表用户产生动态 Action 的治理问题，需要结合 Tool、Context、Risk 和 Policy。


---

# ❓ 本章思考题


## 1.

如果 LLM 产生：

```json
{
"name":"refund_order",
"amount":100000
}
```

但是用户只有：

```text
refund:create
```

权限。

Runtime 应该：

A. 直接执行  
B. 让 Tool 自己拒绝  
C. Runtime Policy 拦截  

为什么？


---

## 2.

为什么：

```text
approval_required
```

不能等价于：

```text
permission denied
```


---

## 3.

如果人工批准：

```json
{
"amount":1000
}
```


但是执行前参数变成：

```json
{
"amount":100000
}
```

Runtime 如何防止？


---

## 4.

为什么 MCP Tool 进入 Runtime 后仍然需要 Permission 和 Approval？


---

## 5.

为什么说：

> Human Approval 是风险管理，而不是安全边界？


---

# 🔄 前置问题回收（Pending Questions）


## Q1：Tool Metadata 被修改怎么办？

结论：

Metadata：

```text
Declaration
```

不是：

```text
Enforcement
```


真正安全：

```text
Policy

+

Executor

+

Business API
```


---

## Q2：Intent 被伪造怎么办？

结论：

Tool Call Intent：

```text
Untrusted Input
```

必须经过：

- Validation
- Permission
- Policy
- Approval
- Business Authorization


---

## Q3：业务密钥泄露怎么办？

结论：

进入传统安全领域：

- Secret Management
- API Security
- Identity Security
- Data Security


Agent Governance 无法替代。


---

## Q4：为什么需要 Human Approval？

结论：

因为：

```text
LLM Decision
```

存在不确定性。


Human Approval：

用于：

```text
高风险 Action 的人工决策节点
```


---

## Q5：Part F 最大收获是什么？


从：

```text
Agent 会调用 Tool
```


升级到：

```text
Agent 会在治理约束下调用 Tool
```


---

✅ **Day05 Part F：Permission & Human Approval 完成。**

下一节进入：

# Day05 Part G：Tool Result Runtime Feedback

这部分会把：

```text
Tool Calling
+
Runtime State
+
Context Builder
+
Observation
```

真正闭环。
