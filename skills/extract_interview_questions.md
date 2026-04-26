# skill: extract_interview_questions

- **name**: extract_interview_questions
- **type**: extraction
- **priority**: P0

## description
从面经、题库或用户粘贴内容中提取候选面试问题。

## input
- `interview_text: string`

## output
- `questions[]`
  - `raw_question: string`
  - `normalized_question: string`
  - `category: string`
  - `confirmed: false`
  - `priority: P0 | P1 | P2`

## rules
1. 只提取疑似问题。
2. 不自动确认问题。
3. 必须等待用户勾选确认。
4. 输入必须是 `interview_questions` 类型。
5. 如果检测到 JD 内容，必须先剔除。
6. 核心 skill 只接收纯文本，不关心文件格式。

## prompt
```text
你是面经问题提取助手。
请从文本中提取所有疑似面试问题。
不要回答问题，只输出问题列表。
```
