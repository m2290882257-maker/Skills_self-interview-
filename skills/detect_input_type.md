# skill: detect_input_type

- **name**: detect_input_type
- **type**: classification
- **priority**: P0

## input
- `text: string`

## output
- `type: jd | interview_questions | mixed`

## rules
1. JD 通常包含：岗位职责、任职要求。
2. 面经通常是问句。
3. `mixed` 需要后续拆分（可使用 `splitMixedInput`）。
