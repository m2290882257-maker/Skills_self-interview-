# skill: generate_cheat_sheet_keywords

## 输入
- `job_anchor`
- `question_queue`
- `experience_db`

## 输出
- `keywords[]`: 面试速记关键词
- `story_links[]`: 关键词到经历映射

## 规则
- 关键词必须可回溯到岗位或经历。
- 不生成与真实经历冲突的记忆点。
