# skill: extract_resume_experiences

- **name**: extract_resume_experiences
- **type**: transformation
- **priority**: P0

## description
将用户简历拆解为原子化经历素材，形成 `experience_db.json`。

## input
- `resume_text: string`

## output
- `experiences[]`
  - `module: string`
  - `action: string`
  - `scenario: string`
  - `result: string`
  - `source: "resume"`
  - `tags: string[]`
  - `hash_key: string`

## rules
1. 只允许使用简历原文信息。
2. 如果没有结果，`result` 必须填写 `"无"`。
3. 不得补充、推测或美化不存在的信息。
4. 使用 `hash(action + scenario)` 作为 upsert 主键。
5. 核心 skill 只接收纯文本，不关心文件格式。

## prompt
```text
你是一个简历经历结构化助手。
请将用户简历拆解为原子经历数组。
每条经历必须包含：
- module：能力模块
- action：核心动作
- scenario：发生场景
- result：结果，如果原文没有则填“无”
- tags：能力标签
严禁编造。
```
