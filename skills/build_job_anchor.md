# skill: build_job_anchor

## 输入
- `jd_text`: 目标岗位 JD
- `experiences[]`: 候选人经历

## 输出
- `job_anchor`: 该岗位的能力锚点、关键词、优先级

## 规则
- 锚点必须来源于 JD。
- 与经历对齐不足项必须标注“需补充”。
