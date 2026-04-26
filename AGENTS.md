# AGENTS.md — 面试助手 Skills 系统

本文件是本仓库所有 agent、skill 开发的权威指南。所有贡献者（包括 AI 编码助手）在修改或新增代码前必须阅读并遵守本文件的全部规则。

---

## 目录

1. [项目目标](#1-项目目标)
2. [项目结构](#2-项目结构)
3. [编码规范](#3-编码规范)
4. [数据文件位置](#4-数据文件位置)
5. [Skills 实现规范](#5-skills-实现规范)
6. [测试命令](#6-测试命令)
7. [不允许修改的原则](#7-不允许修改的原则)

---

## 1. 项目目标

这是一个**本地优先**的「面试助手 Skills 系统」，由两个核心 agent 组成：

| Agent | 职责 |
|---|---|
| `interviewer_agent` | 基于题库、面经、简历薄弱点，模拟面试官提问与追问 |
| `candidate_agent` | 以用户本人身份回答问题，同时输出回答建议、包装建议、风险高亮和需要补充的信息 |

**核心约束（详见第 7 节）：**
- 不做云端同步，所有数据保存在本地 JSON 文件中。
- 严禁虚构不存在的经历、公司、岗位、项目和硬数据。
- 所有"美化、转化、承认不足、补充建议"必须作为**高亮建议**输出，不得混入事实答案。

---

## 2. 项目结构

```
Skills_self-interview-/
├── AGENTS.md                  # 本文件（开发规范权威文档）
├── README.md                  # 项目简介
│
├── agents/                    # Agent 实现
│   ├── interviewer_agent.py   # 面试官 agent
│   └── candidate_agent.py     # 候选人 agent
│
├── skills/                    # 所有 skill 模块
│   ├── __init__.py
│   ├── base_skill.py          # Skill 基类（接口定义）
│   └── <skill_name>/          # 每个 skill 独立目录
│       ├── __init__.py
│       ├── skill.py           # Skill 实现
│       ├── prompt.txt         # Skill 使用的 prompt 模板
│       ├── rules.json         # Skill 的规则配置
│       └── tests/
│           ├── test_skill.py  # 单元测试
│           └── samples/       # 测试样例（输入/输出 JSON）
│               ├── sample_01_input.json
│               └── sample_01_output.json
│
├── data/                      # 本地数据文件（详见第 4 节）
│   ├── resume/
│   │   └── resume.json        # 用户简历数据
│   ├── question_bank/
│   │   └── questions.json     # 题库
│   ├── interview_experience/
│   │   └── experience.json    # 面经记录
│   └── sessions/
│       └── <session_id>.json  # 每次面试会话记录
│
├── config/
│   └── settings.json          # 全局配置（模型、路径等）
│
└── tests/                     # 全局集成测试
    ├── test_interviewer_agent.py
    └── test_candidate_agent.py
```

---

## 3. 编码规范

### 语言与运行时

- **主语言：Python 3.10+**
- 禁止引入任何需要云端服务的第三方依赖（如云存储 SDK、远程数据库客户端）。
- 依赖管理使用 `requirements.txt`，新增依赖前须在 PR 中说明理由。

### 代码风格

- 遵循 [PEP 8](https://peps.python.org/pep-0008/)。
- 使用 `black` 格式化代码，行宽限制 **88** 字符。
- 使用 `flake8` 做静态检查，配置见 `setup.cfg` 或 `.flake8`。
- 类型注解：所有公开函数和方法必须有完整的类型注解（`typing` 标准库）。
- 文档字符串：所有公开类、函数、方法必须有 docstring（Google 风格）。

### 命名规范

| 对象 | 规范 |
|---|---|
| 模块、文件名 | `snake_case` |
| 类名 | `PascalCase` |
| 函数、变量 | `snake_case` |
| 常量 | `UPPER_SNAKE_CASE` |
| Skill 目录名 | `snake_case`，与 skill 类名对应 |

### Git 提交

- 提交信息格式：`<type>(<scope>): <subject>`
  - type: `feat` / `fix` / `docs` / `test` / `refactor` / `chore`
  - 示例：`feat(skills): add behavioral_question_skill`
- 每个 PR 只做一件事，保持小而聚焦。

---

## 4. 数据文件位置

所有数据文件**仅存储在本地**，路径基准为仓库根目录下的 `data/` 目录。

| 文件 | 路径 | 说明 |
|---|---|---|
| 用户简历 | `data/resume/resume.json` | 用户真实经历、技能、岗位信息 |
| 题库 | `data/question_bank/questions.json` | 结构化面试题，按类别组织 |
| 面经记录 | `data/interview_experience/experience.json` | 用户收集的面经和薄弱点标注 |
| 会话记录 | `data/sessions/<session_id>.json` | 每次面试模拟的完整问答记录 |
| 全局配置 | `config/settings.json` | 模型参数、默认路径等运行时配置 |

### 数据文件规则

- 所有 JSON 文件必须使用 **UTF-8** 编码，缩进为 **2 个空格**。
- `data/` 目录下的文件**不得提交到版本控制**（已在 `.gitignore` 中排除），仅保留示例模板文件（`*.example.json`）。
- `config/settings.json` 中**禁止**存储任何密钥、Token 或个人隐私信息。
- 任何 skill 或 agent 读写数据时，必须通过统一的 `data_manager` 模块（`skills/data_manager.py`）操作，禁止直接硬编码文件路径。

---

## 5. Skills 实现规范

每个 skill 是系统最小功能单元，**必须**包含以下五个要素：

### 5.1 输入（Input）

在 `skill.py` 中以 `SkillInput` dataclass 明确定义输入字段及其类型。

```python
from dataclasses import dataclass

@dataclass
class SkillInput:
    question: str          # 面试问题
    resume_context: dict   # 简历上下文片段
    session_history: list  # 当前会话历史
```

### 5.2 输出（Output）

在 `skill.py` 中以 `SkillOutput` dataclass 明确定义输出字段。输出必须区分**事实答案**与**建议**两个字段。

```python
@dataclass
class SkillOutput:
    factual_answer: str          # 基于真实经历的事实性回答
    suggestions: list[str]       # 高亮建议（包装、补充、风险提示）
    risk_highlights: list[str]   # 潜在风险点标注
    follow_up_hints: list[str]   # 可能的追问方向
```

### 5.3 规则（Rules）

在 `rules.json` 中以结构化方式声明该 skill 的约束规则。

```json
{
  "skill_name": "behavioral_question_skill",
  "version": "1.0.0",
  "rules": [
    "不得虚构项目经历或数据",
    "建议内容必须标记为 suggestion，不混入 factual_answer",
    "追问提示必须基于候选人真实背景"
  ],
  "forbidden_actions": [
    "fabricate_experience",
    "mix_suggestion_with_fact"
  ]
}
```

### 5.4 Prompt（提示词模板）

在 `prompt.txt` 中存放该 skill 使用的 prompt 模板，使用 `{variable}` 占位符表示动态内容。

```
你是一位资深技术面试官。
当前候选人简历摘要：{resume_summary}
请根据以下问题生成追问：{question}

规则：
- 只基于简历中真实存在的经历提问
- 追问应聚焦候选人的薄弱点：{weak_points}
```

### 5.5 测试样例（Test Samples）

每个 skill 必须提供**至少 2 个**端到端测试样例，存放于 `skills/<skill_name>/tests/samples/`。

样例命名格式：`sample_<序号>_input.json` / `sample_<序号>_output.json`

输入样例（`sample_01_input.json`）：
```json
{
  "question": "请介绍一个你主导过的复杂技术项目",
  "resume_context": {
    "projects": ["电商推荐系统优化（2023）"]
  },
  "session_history": []
}
```

期望输出样例（`sample_01_output.json`）：
```json
{
  "factual_answer": "我在2023年参与了电商推荐系统的性能优化工作...",
  "suggestions": ["可补充具体的性能指标提升数据以增强说服力"],
  "risk_highlights": ["如无法提供具体数据，面试官可能追问指标"],
  "follow_up_hints": ["系统规模？团队规模？你的具体职责？"]
}
```

### 5.6 Skill 基类要求

所有 skill 必须继承 `base_skill.py` 中的 `BaseSkill`，并实现 `run` 方法：

```python
from abc import ABC, abstractmethod

class BaseSkill(ABC):
    """所有 skill 的抽象基类。"""

    @abstractmethod
    def run(self, skill_input: "SkillInput") -> "SkillOutput":
        """执行 skill 的核心逻辑。"""
        ...

    @abstractmethod
    def validate_input(self, skill_input: "SkillInput") -> bool:
        """验证输入是否合法，非法时抛出 ValueError。"""
        ...
```

---

## 6. 测试命令

### 运行所有测试

```bash
python -m pytest tests/ skills/ -v
```

### 运行单个 skill 的测试

```bash
python -m pytest skills/<skill_name>/tests/ -v
```

### 运行样例对比测试（端到端）

```bash
python -m pytest skills/<skill_name>/tests/test_skill.py::test_samples -v
```

### 代码格式检查

```bash
black --check .
flake8 .
```

### 代码自动格式化

```bash
black .
```

### 类型检查

```bash
mypy agents/ skills/
```

> **注意：** 所有测试必须在不依赖网络的环境下通过。禁止在测试中调用真实的外部 API 或云服务，必须使用 mock。

---

## 7. 不允许修改的原则

以下原则是本系统的核心约束，**任何 agent、skill 或代码变更都不得违反**。违反任何一条将导致 PR 被拒绝。

### 原则一：本地优先，禁止云端同步

- 所有数据（简历、题库、会话记录）**仅存储在本地文件系统**。
- 禁止引入任何云存储、云数据库、远程同步服务。
- 禁止将用户数据上传至任何第三方服务。

### 原则二：严禁虚构事实

- `factual_answer` 字段**只能**包含用户简历和会话历史中真实存在的经历、公司、岗位、项目和硬数据。
- 禁止在事实答案中捏造任何不存在的项目、公司名称、职位或量化指标。
- 所有数字（如"提升了 30%"）必须来源于用户输入的真实数据，或明确标注为"建议补充估算"。

### 原则三：建议与事实严格分离

- 任何"表达优化、结构化包装、能力迁移解释、承认不足"等内容，**必须且只能**出现在 `suggestions`、`risk_highlights` 或 `follow_up_hints` 字段中。
- 禁止将建议性内容混入 `factual_answer` 字段。
- 高亮建议在 UI 或输出中必须有明确的视觉区分（如前缀标签 `[建议]`、`[风险]`）。

### 原则四：所有 Skill 必须有完整规范

- 没有同时满足以下五项的 skill 不得合并：**输入定义、输出定义、规则文件、prompt 模板、测试样例（≥2 个）**。
- skill 的 `rules.json` 必须明确列出 `forbidden_actions`。

### 原则五：测试必须离线可运行

- 任何依赖真实网络请求的测试都不允许合并。
- 所有对 LLM API 的调用必须在测试中使用 mock 替代。

### 原则六：禁止硬编码路径和密钥

- 所有文件路径必须通过 `config/settings.json` 或 `data_manager` 模块获取。
- 禁止在代码、prompt、规则文件中硬编码任何 API Key、Token 或个人信息。
