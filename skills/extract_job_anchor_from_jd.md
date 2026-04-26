# skill: extract_job_anchor_from_jd

- **name**: extract_job_anchor_from_jd
- **type**: extraction
- **priority**: P0

## description
从 JD（岗位描述）中提取岗位标签、能力要求和隐含评估标准。

## input
- `jd_text: string`

## output
- `job_tags: string[]`
- `target_role: string`
- `capability_focus: string[]`
- `hidden_requirements: string[]`
- `answer_style: string`

## rules
1. 必须基于 JD 原文。
2. 不依赖用户输入。
3. 要识别“显性要求 + 隐性要求”。
4. 输出必须能指导面试回答方向。

## prompt
```text
你是一个招聘分析专家。

请从岗位描述（JD）中提取：

1. job_tags（岗位关键词）
2. target_role（岗位类型）
3. capability_focus（核心能力要求）
4. hidden_requirements（隐含要求，例如抗压、沟通、owner意识）
5. answer_style（面试回答偏好）

注意：
- 不要照抄 JD，要抽象总结
- hidden_requirements 必须推断
```
