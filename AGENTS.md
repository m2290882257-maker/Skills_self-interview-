# AGENTS.md

本仓库是一个**本地优先（local-first）**的「面试助手 skills 系统」。核心由两个 agent 协作完成：

- **interviewer_agent**：基于题库、面经、简历薄弱点，模拟面试官的提问与追问。
- **candidate_agent**：以用户本人身份作答；同时输出回答建议、包装建议、风险高亮与需要补充的信息（与事实答案严格分离）。

> 关键定位：本项目只做“表达优化与结构化建议”，**不虚构不存在的经历、公司、岗位、项目、时间线与硬数据**。

---

## 1. 项目结构（约定）

> 当前仓库尚在初始化阶段。以下为**推荐/约定**的目录结构；新增文件请遵循。

```
.
├─ AGENTS.md                 # 本文件：协作规范与硬性原则
├─ README.md                 # 项目说明
├─ src/
│  ├─ agents/
│  │  ├─ interviewer_agent/  # 面试官 agent（策略、提示词、编排）
│  │  └─ candidate_agent/    # 候选人 agent（回答、建议、风险高亮）
│  ├─ skills/                # skills 实现（每个 skill 一个目录）
│  ├─ data/                  # 本地数据读写（JSON schema、loader、store）
│  └─ shared/                # 通用工具（校验、格式化、日志、常量）
├─ data/                     # 默认本地数据目录（运行时写入）
│  ├─ question_bank.json
│  ├─ experiences.json
│  ├─ resume_weak_points.json
│  ├─ interview_history.json
│  └─ settings.json
└─ tests/
   ├─ skills/                # skill 单测/黄金样例
   └─ agents/                # agent 行为测试（可选）
```

如果实际结构与上述不同：
- 以实际代码为准，但请在本文件中补充“真实结构”。
- 新增模块时尽量向上述结构靠拢，以降低维护成本。

---

## 2. 编码规范

### 2.1 通用

- **小步提交**：每次提交聚焦单一目的（新增一个 skill / 修复一个规则 / 增加一个测试样例）。
- **可读性优先**：函数短小、命名明确、避免“魔法字符串”。
- **确定性输出**：同输入在同版本下输出稳定（便于测试/回归）。
- **日志分级**：调试信息不污染用户可见输出。

### 2.2 文本与提示词

- 所有 prompt / system rules 统一放在对应 agent 或 skill 的目录下（见下文）。
- prompt 修改必须同步更新：
  - 该 skill 的规则说明
  - 测试样例（至少 1 个）

### 2.3 数据与安全

- 仅使用本地文件系统读写；默认 `data/` 下 JSON 文件。
- 不写入用户隐私到日志。
- 不进行任何云端同步/上传行为。

---

## 3. 数据文件位置（本地 JSON）

### 3.1 默认目录

- **运行时数据**默认放在仓库根目录的 `data/` 下。
- 所有数据文件使用 **UTF-8** 编码。

### 3.2 约定的核心数据文件

- `data/question_bank.json`：题库（按岗位/方向/难度/主题分组）
- `data/experiences.json`：用户真实经历素材（项目/职责/成果/限制条件等）
- `data/resume_weak_points.json`：简历薄弱点与证据缺口（用于 interviewer_agent 追问）
- `data/interview_history.json`：历史面试记录（问题、回答、反馈、改进）
- `data/settings.json`：本地配置（模型参数/输出格式开关/语言等）

> 建议每个 JSON 文件配套 schema（例如 `src/data/schemas/*.json`），并在加载时做校验。

---

## 4. skills 的实现规范（必须遵循）

> **所有 skill 必须包含：输入、输出、规则、prompt、测试样例**。

### 4.1 目录规范

每个 skill 一个目录：

```
src/skills/<skill_name>/
├─ index.(ts|py|js)          # skill 入口（函数/类/导出）
├─ prompt.md                 # 该 skill 的提示词（或 prompt 模板）
├─ rules.md                  # 该 skill 的硬规则（不可违反）
├─ io.schema.json            # 输入/输出 JSON schema（或分别 input/output）
└─ examples/
   ├─ case_001.input.json
   ├─ case_001.expected.json
   └─ case_001.md            # 可选：人类可读说明
```

### 4.2 输入（Input）

- 必须是结构化对象（JSON），字段有默认值与校验规则。
- 必须显式携带：
  - `language`（例如 `zh-CN`）
  - `role`/`target_position`（面试方向）
  - `context`（题库/经历/弱点/历史对话的引用）

### 4.3 输出（Output）

输出必须分区，**事实与建议严格分离**：

- `answer`：以“用户本人身份”给出的**事实性答案**（不得混入包装/美化/推测）。
- `suggestions_highlighted`：所有“美化、转化、承认不足、补充建议、表达优化、能力迁移解释”等，必须在此处以**高亮建议**形式列出。
- `risk_flags`：风险点（例如：证据不足、指标缺失、表述可能被追问、与经历矛盾）。
- `missing_info`：需要向用户补齐的信息清单（可被用于下一轮追问）。
- `citations`（可选）：如果引用了本地数据片段，给出来源路径与 JSON pointer。

> 禁止把建议“偷偷写进 answer 里”。answer 只能陈述可被本地数据证明/用户确认的事实。

### 4.4 规则（Rules）

每个 skill 的 `rules.md` 至少包含：

- 不虚构：不存在就写 `unknown` 或提示补齐。
- 可验证：遇到数字/时间/规模等硬数据，必须来自 `experiences.json` 或用户输入；否则标记为缺失。
- 追问策略：当证据薄弱时，优先产出 `missing_info` 与 `risk_flags`，而不是生成看似完整的故事。

### 4.5 Prompt

- `prompt.md` 必须包含：
  - 角色定义（该 skill 在 agent 中的职责）
  - 输入/输出格式（与 schema 一致）
  - 不允许修改的原则（引用本文件第 6 节）

---

## 5. 测试命令（约定）

> 当前仓库尚无测试脚手架。以下为**推荐的最小测试约定**。

- **技能样例回归测试**：遍历 `src/skills/**/examples/*`，把 input 喂给 skill，断言输出满足：
  - schema 校验通过
  - 与 expected 的关键字段一致（或使用 snapshot）
  - `answer` 不包含建议性措辞（可用简单规则/词表做 lint）

建议提供以下脚本之一（按实际技术栈落地）：

- Node.js/TypeScript：
  - `npm test`
  - `npm run test:skills`
- Python：
  - `pytest`

> 当你在仓库中加入具体语言与测试框架后，请在此处把命令改为“真实可运行”的命令。

---

## 6. 不允许修改的原则（硬性约束）

以下原则属于项目红线：

1. **不做云端同步**：不引入任何自动上传/同步到第三方的逻辑。
2. **数据默认本地 JSON**：默认读写 `data/` 下的 JSON；如需其他格式必须明确说明并保持本地优先。
3. **不虚构经历与硬数据**：不得编造公司/岗位/项目/指标/时间线；缺失就标记缺失并提出补齐问题。
4. **建议与事实分离**：所有“美化、转化、承认不足、补充建议、包装、能力迁移解释”必须进入 `suggestions_highlighted`，不得混入 `answer`。
5. **skills 必备要素**：每个 skill 必须包含输入、输出、规则、prompt、测试样例；缺一不可。
6. **可追溯引用**：引用本地数据时必须可定位（文件路径 + JSON pointer）。

---

## 7. 贡献与变更要求

- 新增/修改一个 skill 时，至少同时提交：
  - `rules.md`
  - `prompt.md`
  - `io.schema.json`
  - `examples/` 下 ≥1 组用例
- 改动任何“红线原则”，必须先在 issue 中讨论并得到明确同意（默认不接受）。