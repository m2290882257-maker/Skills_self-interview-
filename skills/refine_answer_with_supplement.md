# skill: refine_answer_with_supplement

- **name**: refine_answer_with_supplement
- **type**: transformation
- **priority**: P0

## description
将用户对追问的补充写回经历库，并重新优化答案。

## input
- `original_answer: string`
- `followup_question: string`
- `user_supplement: string`
- `experience_db: array`

## output
- `updated_experience`
  - `module: string`
  - `action: string`
  - `scenario: string`
  - `result: string`
  - `source: supplemental`
  - `tags: string[]`
  - `hash_key: string`
- `refined_answer: string`

## rules
1. 用户补充必须标记为 `supplemental`。
2. 必须写回 `experience_db`。
3. 只能基于用户补充优化，不得额外编造。

## prompt
```text
请将用户对追问的补充整理为一条新的经历素材。
然后基于新增素材，优化原答案。
保留用户真实表达中的细节和判断过程。
```
