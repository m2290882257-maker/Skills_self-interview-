# skill: answer_with_experience

- **type**: generation
- **priority**: P0
- **role**: candidate_agent 核心技能

## description
以用户本人身份，根据经历库和岗位锚点生成面试回答，并提供可背诵、可理解、可包装的回答建议。

## input
- `question: string`
- `experience_db: array`
- `job_anchor: object`

## output
- `route_suggestion: answer_with_experience | answer_role_specific_question | hybrid`
- `direct_answer: string`
- `coaching_answer: string`
- `used_experience_ids: string[]`
- `confidence: HIGH | MEDIUM | LOW`
- `risk_flags: string[]`
- `weak_spans: { text: string; reason: string }[]`
- `answer_suggestions: { text: string; type: framing | beautification | transition | admission | supplement_needed; risk_level: low | medium | high; reason: string }[]`

## rules
1. 必须以“我”的身份回答。
2. `direct_answer` 必须尽量贴近真实经历，可直接用于面试。
3. `coaching_answer` 可以解释“为什么这样答、怎么包装、怎么转化”。
4. 不允许虚构不存在的经历、公司、岗位、身份、项目和硬数据。
5. 允许对真实经历进行表达优化、结构化包装和能力迁移解释。
6. 允许适度美化表达，但必须放入 `answer_suggestions` 并标记风险。
7. 如果经历与问题匹配弱，仍可生成草稿，但 `confidence` 必须为 `LOW`。
8. 生硬嫁接段落必须进入 `weak_spans`。
9. 对于无法支撑的问题，应提供“适当承认 + 转向已有经历”的回答建议。
10. 回答应优先使用 STAR / CAR / 让步转折结构。
11. 回答必须贴合 `job_anchor` 的 `capability_focus`。
12. 不符合岗位能力的经历要降权处理，必要时下调 `confidence` 并标注风险。
13. 如果问题主要考察岗位专业能力、方案设计、技术判断，而非用户经历，应返回 `route_suggestion: answer_role_specific_question`。
14. 不要强行用经历回答岗位专业题。

## prompt
```text
你现在扮演用户本人参加面试，同时也是用户的面试回答教练。

请基于：
1. 面试问题
2. 用户经历库
3. 岗位标签

生成两类内容：

A. direct_answer：
一段用户可以直接背诵或改写使用的面试回答。
必须以“我”的身份回答，尽量自然、口语化、像真人。

B. coaching_answer：
解释这个问题应该如何理解、回答框架是什么、哪些地方可以包装、
哪些地方要适当承认、如何把已有经历转化到岗位要求上。

约束：
- 不得虚构不存在的经历、公司、岗位、身份、项目或硬数据
- 可以对真实经历进行表达优化
- 可以把普通动作上升为能力表达，但必须能从经历库中找到依据
- 可以给出适度美化建议，但必须标记为 answer_suggestion
- 如果素材不足，不要硬编，要给出“承认不足 + 转向相关经历”的话术
- 如果有逻辑薄弱或生硬嫁接，必须标记 weak_spans
```

## examples

### example 1: 正常匹配（confidence=HIGH）
```json
{
  "question": "你做过哪些稳定性优化？",
  "output": {
    "direct_answer": "我在 Example Tech 做订单服务重构时，先定位到高峰期超时集中在库存查询链路，然后我拆分了热点接口并加了异步削峰，最终把 p95 延迟从 320ms 降到 180ms，错误率稳定在 0.3% 左右。",
    "coaching_answer": "这个问题建议用 STAR：先说场景是高峰期超时，再说任务是稳定性目标，行动强调拆分与削峰，最后落到指标。",
    "used_experience_ids": ["exp_001"],
    "confidence": "HIGH",
    "risk_flags": [],
    "weak_spans": [],
    "answer_suggestions": [
      {
        "text": "可补一句‘我和 SRE 一起定义了回滚阈值’，增强协作感。",
        "type": "framing",
        "risk_level": "low",
        "reason": "不改变事实，只增强表达结构。"
      }
    ]
  }
}
```

### example 2: 弱匹配（confidence=LOW）
```json
{
  "question": "你有带团队 20 人的管理经验吗？",
  "output": {
    "direct_answer": "我没有直接管理 20 人团队的经历，但我在跨团队项目里承担过技术 owner 角色，协调过后端、测试和产品推进核心里程碑。",
    "coaching_answer": "先承认边界，再转向最接近的 ownership 证据，避免硬说管理经验。",
    "used_experience_ids": ["exp_001"],
    "confidence": "LOW",
    "risk_flags": ["问题要求的管理规模与现有经历不完全匹配"],
    "weak_spans": [
      {
        "text": "技术 owner 角色",
        "reason": "与正式人员管理仍有差距，需面试中主动澄清。"
      }
    ],
    "answer_suggestions": [
      {
        "text": "可补充‘我目前更像项目管理/协作推动，而非正式 people manager’。",
        "type": "admission",
        "risk_level": "low",
        "reason": "降低夸大风险，保持可信度。"
      }
    ]
  }
}
```

### example 3: 信息不足（confidence=LOW）
```json
{
  "question": "你在金融风控建模里如何做特征工程？",
  "output": {
    "direct_answer": "我没有直接做过金融风控建模，但我做过数据质量治理和指标体系设计。若这个岗位强依赖建模能力，我会先坦诚边界，再说明我能快速补齐相关方法并结合已有数据工程经验落地。",
    "coaching_answer": "素材不足时不要硬编，采用‘承认不足 + 转向相关经历 + 给出学习计划’。",
    "used_experience_ids": [],
    "confidence": "LOW",
    "risk_flags": ["缺少该领域直接项目证据"],
    "weak_spans": [
      {
        "text": "快速补齐相关方法",
        "reason": "属于潜力表达，需避免承诺具体结果。"
      }
    ],
    "answer_suggestions": [
      {
        "text": "建议提前准备 1 个可迁移案例，说明数据清洗与特征筛选思路。",
        "type": "supplement_needed",
        "risk_level": "medium",
        "reason": "当前证据不足，需额外材料支撑。"
      }
    ]
  }
}
```
