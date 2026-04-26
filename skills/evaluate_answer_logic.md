# skill: evaluate_answer_logic

- **type**: evaluation
- **priority**: P0
- **role**: candidate_agent / interviewer_agent 共享评估技能

## description
评估回答是否真正回答了问题、是否与经历库匹配、是否存在生硬包装或生硬嫁接，并给出下一步动作建议。

## input
- `question: string`
- `answer: string`
- `experience_db: array`
- `job_anchor: object`

## output
- `score: { relevance: 1-5; authenticity: 1-5; structure: 1-5; impact: 1-5 }`
- `confidence: HIGH | MEDIUM | LOW`
- `issues: string[]`
- `highlight_spans: [{ text: string; issue: string; severity: low | medium | high }]`
- `next_action: accept | ask_followup | request_user_supplement`

## rules
1. 不只给分，必须指出逻辑断层。
2. 必须判断是否存在生硬嫁接/生硬包装。
3. 必须判断是否缺少结果指标（如没有结果数字、范围、前后对比）。
4. 如果回答用了 `experience_db` 里没有的事实，必须标记为 `high` severity。
5. 如果可以通过追问补强，`next_action = ask_followup`。
6. 如果必须用户补充真实信息，`next_action = request_user_supplement`。
7. 只有当问题已回答充分、真实性可验证、结构清晰时，`next_action = accept`。

## prompt
```text
你是面试回答质量评估器。

请基于以下输入：
- question
- answer
- experience_db
- job_anchor

输出字段必须为：
- score: relevance/authenticity/structure/impact (1-5)
- confidence: HIGH | MEDIUM | LOW
- issues: string[]
- highlight_spans: [{text, issue, severity}]
- next_action: accept | ask_followup | request_user_supplement

评估步骤：
1) 判断是否真正回答了问题核心（relevance）。
2) 对照 experience_db 检查事实一致性（authenticity）。
3) 检查结构完整度（是否有 STAR/CAR/让步转折，是否存在逻辑断层）。
4) 检查结果影响（是否有结果、指标、范围、前后对比）。
5) 标注生硬嫁接、空泛包装、无法验证表达。

决策规则：
- 缺少关键细节但可通过追问获取 => ask_followup
- 缺少真实事实且必须由用户补充 => request_user_supplement
- 明确使用了经历库不存在的事实 => highlight_spans severity=high，且通常 request_user_supplement
```

## examples

### example 1: 回答较完整（accept）
```json
{
  "output": {
    "score": { "relevance": 5, "authenticity": 5, "structure": 4, "impact": 4 },
    "confidence": "HIGH",
    "issues": ["可补充更多跨团队细节"],
    "highlight_spans": [
      {
        "text": "我协调测试和产品一起完成灰度发布",
        "issue": "协作过程可再补一条冲突处理细节",
        "severity": "low"
      }
    ],
    "next_action": "accept"
  }
}
```

### example 2: 可追问补强（ask_followup）
```json
{
  "output": {
    "score": { "relevance": 4, "authenticity": 4, "structure": 3, "impact": 2 },
    "confidence": "MEDIUM",
    "issues": ["缺少结果指标", "复盘不完整"],
    "highlight_spans": [
      {
        "text": "效果不错",
        "issue": "没有给出可验证指标",
        "severity": "medium"
      }
    ],
    "next_action": "ask_followup"
  }
}
```

### example 3: 需要用户补充真实信息（request_user_supplement）
```json
{
  "output": {
    "score": { "relevance": 3, "authenticity": 1, "structure": 3, "impact": 3 },
    "confidence": "LOW",
    "issues": ["回答包含经历库不存在的管理经历"],
    "highlight_spans": [
      {
        "text": "我带过 30 人团队并负责年度预算",
        "issue": "experience_db 中不存在该事实",
        "severity": "high"
      }
    ],
    "next_action": "request_user_supplement"
  }
}
```
