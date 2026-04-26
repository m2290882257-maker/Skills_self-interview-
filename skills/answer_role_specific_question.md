# skill: answer_role_specific_question

- **name**: answer_role_specific_question
- **type**: generation
- **priority**: P0

## description
针对岗位强相关问题，解析考察点、隐藏评估维度、回答思路，并生成可直接背诵的推荐回答。

## input
- `question: string`
- `job_anchor: object`
- `optional_experience_db: array`

## output
- `question_type: role_specific | hybrid`
- `explicit_test_points: string[]`
- `hidden_evaluation_dimensions: [{ dimension: string, explanation: string }]`
- `answer_framework`
  - `formula: string`
  - `steps: [{ title: string, explanation: string }]`
- `recommended_answer: string`
- `optional_experience_hooks: [{ experience_id: string, usage: string }]`
- `risk_notes: string[]`
- `followup_questions: string[]`

## rules
1. 不强制使用用户简历经历。
2. 必须先判断这道题在考什么。
3. 必须拆出面试官暗中观察的深层能力。
4. 回答思路必须可复用，像公式一样能迁移到同类题。
5. `recommended_answer` 必须是最重要输出，要求自然、完整、可背诵。
6. 如果能轻度结合用户经历，可以输出 `optional_experience_hooks`。
7. 不得编造用户真实经历。
8. 可以使用岗位常识、行业方法论、产品/设计/运营/技术通用知识。
9. 回答不能空泛，必须有具体方案、取舍和评估指标。

## prompt
```text
你是一个高压面试训练教练，擅长回答岗位专业题、方案题、技术判断题。

请针对用户的问题，输出以下内容：

1. explicit_test_points：
这道题表面上在考什么。

2. hidden_evaluation_dimensions：
面试官不会明说，但实际在观察什么深层能力。
例如：
- 抽象问题能力
- 场景拆解能力
- 用户心理理解
- 交互设计取舍
- 指标意识
- 业务目标意识
- 风险意识
- 方案落地能力

3. answer_framework：
给出回答公式。
格式类似：
“先定义场景和目标 → 拆误触成因 → 给出三类方案 → 说明取舍 → 给指标验证”。

4. recommended_answer：
生成一段用户可以直接在面试中说的中文回答。
要自然、专业、有结构，但不要像 AI 论文。
必须包含：
- 对问题的重新定义
- 具体方案
- 为什么有效
- 如何验证
- 可能的取舍

5. optional_experience_hooks：
如果用户经历库中有可轻度挂钩的经历，给出如何自然带入。
如果没有，不要强行嫁接。

约束：
- 这类题不要求完全依赖用户简历。
- 可以使用岗位通用知识和方法论。
- 不要编造用户经历。
- 推荐答案是最重要部分，必须可直接背诵。
```
