# Skills_self-interview-

本项目是本地优先（local-first）的面试助手 skills 系统第一版目录骨架。

## 目录
- `skills/`: 8 个核心技能文档（提取经历、构建岗位锚点、生成追问等）。
- `data/`: 本地 JSON 示例数据。
- `schemas/`: 核心结构 schema（experience/answer/question）。
- `orchestrator/`: 面试会话编排入口。
- `src/document-parser/`: 可插拔文档解析层（TXT/PDF/DOCX）。
- `tests/`: 关键技能测试样例。
- `scripts/`: 无外部依赖的 JSON 与 skill 契约测试脚本。

## 设计原则
1. 默认本地存储，不做云端同步。
2. 不虚构经历、公司、岗位、项目和硬数据。
3. 建议类内容与事实答案分层输出。

## 文档解析入口
统一入口：`parseDocument(filePath)`。

```ts
import { parseDocument } from "./src/document-parser";

const parsed = await parseDocument("./resume.pdf");
console.log(parsed.fileType);       // pdf | docx | txt | unknown
console.log(parsed.normalizedText); // 清洗后的纯文本
console.log(parsed.warnings);       // 解析告警（空文本/不支持格式/解析失败等）
```

说明：
- PDF 优先走 `unpdf`，若不可用则回退 `pdf-parse`。
- DOCX 使用 `mammoth`。
- TXT 按 UTF-8 读取。
- 不使用云端 API，不使用 OCR，不做复杂版式还原。

### 与 skills 的衔接（wrapper）

### 输入类型识别（detect_input_type）
```ts
import { detectInputType, splitMixedInput } from "./orchestrator/detect_input_type";

const raw = `岗位职责：负责系统设计\n任职要求：沟通协作\n你做过哪些稳定性优化？`;
const t = detectInputType(raw); // jd | interview_questions | mixed

if (t.type === "mixed") {
  const { jd_text, interview_questions_text } = splitMixedInput(raw);
  console.log(jd_text, interview_questions_text);
}
```

- `extractResumeFromFile(filePath)`：`filePath -> parseDocument -> normalizedText -> extractResumeExperiences`
- `extractQuestionsFromFile(filePath)`：`filePath -> parseDocument -> normalizedText -> extractInterviewQuestions`

两条链路都保持核心 skill 只接收纯文本，不关心文件格式。

## MVP Flow & Information Architecture

新增纯逻辑编排文件：`orchestrator/mvp_flow.ts`（不接 UI）。

### 1) 数据流（Information Architecture）
- `resume -> experience_db`
- `jd -> job_anchor`
- `interview -> question_queue`

对应函数：
- `buildExperienceDbFromResume(resumeText)`
- `buildJobAnchorFromJd(jdText)`
- `buildQuestionQueueFromInterview(interviewText)`

### 2) 主流程 A：自我介绍生成
- input: `experience_db + job_anchor`
- output: `intro_answer`

对应函数：
- `generateIntroAnswer({ experience_db, job_anchor })`

### 3) 主流程 B：面试训练
- input: `question + experience_db + job_anchor`
- route:
  1. 判断 `question_type`
  2. 调用 `answer_with_experience` 或 `answer_role_specific_question`
  3. 调用 `evaluate_answer_logic`
  4. 若低置信或需追问，调用 `generate_interviewer_followups`

对应函数：
- `runInterviewTraining({ question, experience_db, job_anchor })`

### 4) 统一输出
- 统一返回 `SessionResult`

## Usage Examples

### 1) 从文件提取简历原子经历
```ts
import { extractResumeFromFile } from "./orchestrator/text_extractors";

const { experiences, warnings } = await extractResumeFromFile("./resume.docx");
console.log(experiences[0]);
// {
//   module, action, scenario, result, source: "resume", tags, hash_key
// }
console.log(warnings);
```

### 2) 从文件提取候选面试问题
```ts
import { extractQuestionsFromFile } from "./orchestrator/text_extractors";

const { questions } = await extractQuestionsFromFile("./interview_notes.pdf");
console.log(questions[0]);
// {
//   raw_question,
//   normalized_question,
//   category,
//   confirmed: false,
//   priority: "P0" | "P1" | "P2"
// }
```

### 3) 运行一次完整面试会话编排
```ts
import { runInterviewSession } from "./orchestrator/interview_session";

const session = await runInterviewSession({
  experienceDbPath: "./data/experience_db.example.json",
  questionQueuePath: "./data/question_queue.example.json",
  jobAnchorPath: "./data/job_anchor.example.json"
});

console.log(session.question.text);
console.log(session.candidate_answer.direct_answer);
console.log(session.evaluation.next_action);
console.log(session.followups);
```

### 4) 将追问补充写回经历库并优化答案
```ts
import { refineAnswerWithSupplement } from "./orchestrator/refine_answer_with_supplement";

const experienceDb = [];
const output = refineAnswerWithSupplement({
  original_answer: "我主导了服务稳定性优化。",
  followup_question: "你当时怎么做取舍？",
  user_supplement: "模块: 稳定性\n核心动作: 调整重试策略\n场景: 高峰期超时",
  experience_db: experienceDb
});

console.log(output.updated_experience.source); // supplemental
console.log(experienceDb.length);              // 已写回
console.log(output.refined_answer);
```


## CLI 手动测试入口（MVP）

已提供：`scripts/manual_mvp_test.ts`。

运行：

```bash
npm run manual:mvp
# 或
node --experimental-strip-types scripts/manual_mvp_test.ts
```

输入文件：
- `examples/resume.txt`
- `examples/interview_questions.txt`
- `examples/job_anchor.json`

输出文件：
- `outputs/manual_mvp_result.json`
- `outputs/manual_mvp_result.md`

Markdown 输出会清晰展示：
- 提取出的经历
- 提取出的问题
- 推荐回答（direct_answer）
- coaching_answer
- confidence
- weak_spans
- answer_suggestions
- interviewer followups

## 测试
优先使用本地无依赖脚本（适用于 npm registry 受限环境）：

同时支持 MVP acceptance tests：`npm test` 或 `pnpm test`。

```bash
python scripts/validate_json.py
python scripts/run_skill_tests.py
pytest -q
```

如网络可用且已安装 Vitest，可额外运行：

```bash
npx vitest run tests/answer_with_experience.test.ts
npx vitest run tests/generate_interviewer_followups.test.ts
npx vitest run tests/document_parser.test.ts
npx vitest run tests/extractors.test.ts
npx vitest run tests/refine_answer_with_supplement.test.ts
```

## 前端 MVP 测试界面（Next.js）

已新增最小可运行前端目录：`web/`（仅用于 MVP 验证，非生产环境）。

启动方式：

```bash
cd web
pnpm dev
# 或
npm run dev
```

默认访问：
- `http://localhost:3000`

### Web 健康检查（离线 / 无需安装依赖）

当网络受限、无法 `npm install` 时，可先运行最小化静态健康检查脚本：

```bash
npm run health:web
# 或
node scripts/web_health_check.js
```

该脚本只使用 Node.js 内置模块，检查：
- `web` 关键页面/API/组件文件是否存在
- `web/package.json` 是否包含 `dev/build/start` 脚本
- `runMVPFlow -> /api/mvp -> 本地提取器` 的最小连线是否存在


### 纯静态 HTML 测试页（不依赖 Next 安装）

当 `web` 依赖无法安装时，可直接使用静态测试页先验证交互流程：

```bash
# 仓库根目录
npm run web:static

# 或在 web/ 目录
cd web && npm run web:static

# 打开 http://127.0.0.1:4173
```

若看到 `ERR_CONNECTION_REFUSED`：
1. 先执行 `npm run web:static:file`（或 `cd web && npm run web:static:file`），直接打开输出的 `file://.../static_web_test/index.html`（无需服务）；
2. 若你需要 HTTP 访问，再执行 `npm run web:static` 并保持终端不关闭；
3. 端口占用时改端口：`python scripts/start_static_web_test.py --port 4174`；
4. 若在容器/远程环境，请先做端口转发，再访问映射地址。

静态页路径：`static_web_test/index.html`，支持：
- 输入 `resume / jd / interview_questions` 三段文本
- 生成并展示 `experience_db / job_anchor / question_queue`
- 生成分层输出：`fact_answer / highlight_suggestions / risk_flags / missing_info`

说明：该页面用于交互验证与演示，不替代 `web/pages/api/mvp.ts` 的真实本地 skill 链路。
