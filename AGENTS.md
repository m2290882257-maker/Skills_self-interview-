# AGENTS.md

## 1) 项目定位与目标
本仓库用于构建一个**本地优先（local-first）**的“面试助手 skills 系统”，包含两个核心 agent：

- `interviewer_agent`：基于题库、面经、简历薄弱点进行面试官提问与追问。
- `candidate_agent`：以用户本人身份作答，并输出回答建议、包装建议、风险高亮、待补充信息。

## 2) 项目结构（约定）
当前仓库最小化初始化，后续目录结构按下述约定演进：

```text
.
├─ AGENTS.md
├─ README.md
├─ skills/
│  ├─ interviewer_agent/
│  │  ├─ SKILL.md
│  │  ├─ prompt.md
│  │  ├─ rules.md
│  │  ├─ input.schema.json
│  │  ├─ output.schema.json
│  │  └─ tests/
│  │     ├─ cases.json
│  │     └─ expected/
│  └─ candidate_agent/
│     ├─ SKILL.md
│     ├─ prompt.md
│     ├─ rules.md
│     ├─ input.schema.json
│     ├─ output.schema.json
│     └─ tests/
│        ├─ cases.json
│        └─ expected/
├─ data/
│  ├─ profiles/
│  ├─ resume/
│  ├─ question_bank/
│  ├─ interview_experience/
│  ├─ sessions/
│  └─ snapshots/
├─ scripts/
│  ├─ validate_json.py
│  └─ run_skill_tests.py
└─ tests/
   └─ integration/
```

> 说明：如果实际目录与该模板不一致，以“本地优先 + 可测试 + 不虚构”的原则优先；新增目录需在 README 或本文件补充。

## 3) 编码规范

### 3.1 通用规范
- 代码、配置、数据文件使用 UTF-8。
- 默认使用 2 或 4 空格缩进，保持同文件一致。
- 文件命名采用小写蛇形（`snake_case`），目录名语义清晰。
- 所有关键逻辑需有注释说明输入、输出和边界行为。

### 3.2 JSON 与 Schema
- 所有核心数据落地为 JSON（必要时配套 `*.schema.json`）。
- JSON 键名统一使用 `snake_case`。
- 时间字段统一使用 ISO-8601（如 `2026-04-26T12:00:00Z`）。
- 严禁“隐式字段”：输出字段必须在 schema 中声明。

### 3.3 Prompt 与规则文件
- `prompt.md` 仅描述角色、目标、输出格式，不存储用户隐私。
- `rules.md` 明确“必须做/禁止做/冲突优先级”。
- 所有“建议类内容”必须与“事实回答”分离输出（见第 5 节）。

## 4) 数据文件位置（本地优先）
- 用户画像：`data/profiles/*.json`
- 简历与经历：`data/resume/*.json`
- 题库：`data/question_bank/*.json`
- 面经：`data/interview_experience/*.json`
- 会话记录：`data/sessions/*.json`
- 版本快照：`data/snapshots/*.json`

**数据原则：**
- 不做云端同步。
- 默认只读写本地文件。
- 不向外部服务发送原始简历、面经、会话全文（除非用户显式允许并在文档中更新此策略）。

## 5) skills 实现规范（强制）
每个 skill 必须包含以下要素，否则视为不合格：

1. **输入定义**：`input.schema.json`
2. **输出定义**：`output.schema.json`
3. **规则定义**：`rules.md`
4. **提示词定义**：`prompt.md`
5. **测试样例**：`tests/cases.json` 与 `tests/expected/*`

### 5.1 输出分层规范
任何 skill 输出必须显式拆分为以下区块（可用 JSON 字段实现）：
- `fact_answer`：基于用户真实信息的事实回答。
- `highlight_suggestions`：高亮建议（美化表达、能力迁移、结构优化、承认不足方式等）。
- `risk_flags`：潜在风险（夸大、逻辑漏洞、数据不一致）。
- `missing_info`：回答前仍需用户补充的信息。

> 严禁将建议类内容混入 `fact_answer`。

### 5.2 真实性约束
- 严禁虚构不存在的经历、公司、岗位、项目、业绩或硬数据。
- 允许基于真实经历进行表达优化、结构化包装、能力迁移解释。
- 若信息不足，必须进入 `missing_info` 或 `risk_flags`，不得自行补全为事实。

## 6) 测试命令（约定）
在仓库根目录执行：

```bash
# 1) JSON 基础合法性检查
python scripts/validate_json.py

# 2) Skill 用例测试
python scripts/run_skill_tests.py

# 3) 如使用 pytest 的集成测试
pytest -q
```

若脚本尚未实现，新增功能时需同步补齐并在 README 记录。

## 7) 不允许修改的原则（红线）
以下原则禁止在功能开发中被绕过或弱化：

1. **本地优先红线**：不得默认引入云端同步与远程持久化。
2. **真实性红线**：不得虚构用户经历与事实数据。
3. **分层输出红线**：建议/包装/风险提示不得混入事实答案。
4. **可测试红线**：新增或修改 skill 时必须更新 schema 与测试样例。
5. **可追溯红线**：关键输出需能回溯到输入数据与规则依据。

## 8) 提交与评审建议
- 提交信息建议包含：`scope: change summary`（如 `skills: add candidate_agent output schema`）。
- PR 描述需说明：变更目的、影响范围、测试结果、是否触及红线原则。

---
当本文件与更深层目录中的 `AGENTS.md` 冲突时，以更深层文件为准；若与系统/开发者/用户显式指令冲突，以后者为准。
