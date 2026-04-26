# AGENTS.md

本仓库是一个**本地优先（local-first）**的「面试助手 skills 系统」。核心由两个 agent 协作完成：

- **interviewer_agent**：基于题库、面经、简历薄弱点，模拟面试官的提问与追问。
- **candidate_agent**：以用户本人身份作答；同时输出回答建议、包装建议、风险高亮与需要补充的信息（与事实答案严格分离）。

> 关键定位：本项目只做"表达优化与结构化建议"，**不虚构不存在的经历、公司、岗位、项目、时间线与硬数据**。

---

## 1. 项目结构（约定）

> 当前仓库尚在初始化阶段。以下为**推荐/约定**的目录结构；新增文件请遵循。

```
.
├─ AGENTS.md                 # 本文件：协作规范与硬性原则
├─ README.md                 # 项目说明
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
├─ data/                     # 默认本地数据目录（运行时写入）
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

如果实际结构与上述不同：
- 以实际代码为准，但请在本文件中补充"真实结构"。
- 新增模块时尽量向上述结构靠拢，以降低维护成本。

---

## 2. 编码规范

### 2.1 通用

- 代码、配置、数据文件使用 UTF-8。
- 默认使用 2 或 4 空格缩进，保持同文件一致。
- 文件命名采用小写蛇形（`snake_case`），目录名语义清晰。
- **小步提交**：每次提交聚焦单一目的（新增一个 skill / 修复一个规则 / 增加一个测试样例）。
- **可读性优先**：函数短小、命名明确、避免"魔法字符串"。
- **确定性输出**：同输入在同版本下输出稳定（便于测试/回归）。
- **日志分级**：调试信息不污染用户可见输出。
- 所有关键逻辑需有注释说明输入、输出和边界行为。

### 2.2 JSON 与 Schema

- 所有核心数据落地为 JSON（必要时配套 `*.schema.json`）。
- JSON 键名统一使用 `snake_case`。
- 时间字段统一使用 ISO-8601（如 `2026-04-26T12:00:00Z`）。
- 严禁"隐式字段"：输出字段必须在 schema 中声明。

### 2.3 Prompt 与规则文件

- 所有 prompt / system rules 统一放在对应 agent 或 skill 的目录下。
- `prompt.md` 仅描述角色、目标、输出格式，不存储用户隐私。
- `rules.md` 明确"必须做/禁止做/冲突优先级"。
- 所有"建议类内容"必须与"事实回答"分离输出（见第 4 节）。
- prompt 修改必须同步更新该 skill 的规则说明与测试样例（至少 1 个）。

### 2.4 数据与安全

- 仅使用本地文件系统读写；默认 `data/` 下 JSON 文件。
- 不写入用户隐私到日志。
- 不进行任何云端同步/上传行为。

---

## 3. 数据文件位置（本地 JSON）

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
- 所有数据文件使用 **UTF-8** 编码。
- 建议每个 JSON 文件配套 schema，并在加载时做校验。

---

## 4. skills 实现规范（强制）

每个 skill 必须包含以下要素，否则视为不合格：

1. **输入定义**：`input.schema.json`
2. **输出定义**：`output.schema.json`
3. **规则定义**：`rules.md`
4. **提示词定义**：`prompt.md`
5. **测试样例**：`tests/cases.json` 与 `tests/expected/*`

### 4.1 输入（Input）

- 必须是结构化对象（JSON），字段有默认值与校验规则。
- 必须显式携带：
  - `language`（例如 `zh-CN`）
  - `role`/`target_position`（面试方向）
  - `context`（题库/经历/弱点/历史对话的引用）

### 4.2 输出分层规范

任何 skill 输出必须显式拆分为以下区块（**事实与建议严格分离**）：

- `fact_answer`：基于用户真实信息的**事实性答案**（不得混入包装/美化/推测）。
- `highlight_suggestions`：所有"美化、转化、承认不足、补充建议、表达优化、能力迁移解释"等，必须在此处以高亮建议形式列出。
- `risk_flags`：潜在风险（夸大、逻辑漏洞、数据不一致、表述可能被追问、与经历矛盾）。
- `missing_info`：回答前仍需用户补充的信息清单（可被用于下一轮追问）。
- `citations`（可选）：如果引用了本地数据片段，给出来源路径与 JSON pointer。

> 严禁将建议类内容混入 `fact_answer`。

### 4.3 真实性约束

- 严禁虚构不存在的经历、公司、岗位、项目、业绩或硬数据。
- 允许基于真实经历进行表达优化、结构化包装、能力迁移解释。
- 若信息不足，必须进入 `missing_info` 或 `risk_flags`，不得自行补全为事实。

### 4.4 规则（Rules）

每个 skill 的 `rules.md` 至少包含：

- 不虚构：不存在就写 `unknown` 或提示补齐。
- 可验证：遇到数字/时间/规模等硬数据，必须来自本地数据或用户输入；否则标记为缺失。
- 追问策略：当证据薄弱时，优先产出 `missing_info` 与 `risk_flags`，而不是生成看似完整的故事。

---

## 5. 测试命令（约定）

在仓库根目录执行：

```bash
# 1) JSON 基础合法性检查
python scripts/validate_json.py

# 2) Skill 用例测试
python scripts/run_skill_tests.py

# 3) Node.js 验收测试
npm test

# 4) 如使用 pytest 的集成测试
pytest -q
```

若脚本尚未实现，新增功能时需同步补齐并在 README 记录。

---

## 6. 不允许修改的原则（红线）

以下原则属于项目红线，禁止在功能开发中被绕过或弱化：

1. **本地优先红线**：不得默认引入云端同步与远程持久化。
2. **真实性红线**：不得虚构用户经历与事实数据；缺失就标记缺失并提出补齐问题。
3. **分层输出红线**：建议/包装/风险提示不得混入事实答案。
4. **可测试红线**：新增或修改 skill 时必须更新 schema 与测试样例。
5. **可追溯红线**：关键输出需能回溯到输入数据与规则依据（文件路径 + JSON pointer）。
6. **skills 必备要素**：每个 skill 必须包含输入、输出、规则、prompt、测试样例；缺一不可。

---

## 7. 贡献与变更要求

- 新增/修改一个 skill 时，至少同时提交：
  - `rules.md`
  - `prompt.md`
  - `input.schema.json` 与 `output.schema.json`
  - `tests/` 下 ≥1 组用例
- 改动任何"红线原则"，必须先在 issue 中讨论并得到明确同意（默认不接受）。
- 提交信息建议包含：`scope: change summary`（如 `skills: add candidate_agent output schema`）。
- PR 描述需说明：变更目的、影响范围、测试结果、是否触及红线原则。

---

当本文件与更深层目录中的 `AGENTS.md` 冲突时，以更深层文件为准；若与系统/开发者/用户显式指令冲突，以后者为准。
