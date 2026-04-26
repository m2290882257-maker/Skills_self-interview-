import { readFile } from "node:fs/promises";
import { answerRoleSpecificQuestion } from "./role_specific_question.ts";

export interface InterviewSessionInput {
  experienceDbPath: string;
  questionQueuePath: string;
  jobAnchorPath: string;
}

interface QuestionItem {
  question_id: string;
  text: string;
  confirmed: boolean;
}

interface QuestionQueue {
  questions: QuestionItem[];
}

interface ExperienceItem {
  experience_id: string;
  company?: string;
  role?: string;
  project?: string;
  actions?: string[];
  metrics?: Record<string, number | string>;
}

interface ExperienceDb {
  experiences: ExperienceItem[];
}

interface JobAnchor {
  must_have?: string[];
  nice_to_have?: string[];
  capability_focus?: string[];
}

export interface AnswerWithExperienceOutput {
  route_suggestion: "answer_with_experience" | "answer_role_specific_question" | "hybrid";
  direct_answer: string;
  coaching_answer: string;
  used_experience_ids: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  risk_flags: string[];
  weak_spans: Array<{ text: string; reason: string }>;
  answer_suggestions: Array<{
    text: string;
    type: "framing" | "beautification" | "transition" | "admission" | "supplement_needed";
    risk_level: "low" | "medium" | "high";
    reason: string;
  }>;
}

export interface EvaluateAnswerLogicOutput {
  score: { relevance: number; authenticity: number; structure: number; impact: number };
  confidence: "HIGH" | "MEDIUM" | "LOW";
  issues: string[];
  highlight_spans: Array<{ text: string; issue: string; severity: "low" | "medium" | "high" }>;
  next_action: "accept" | "ask_followup" | "request_user_supplement";
}

export interface FollowupItem {
  question: string;
  intent: string;
  pressure_level: "low" | "medium" | "high";
  expected_signal: string;
}

export interface SessionResult {
  question: QuestionItem;
  question_type?: "resume_based" | "role_specific" | "hybrid";
  route_to?: string[];
  candidate_answer: AnswerWithExperienceOutput;
  evaluation: EvaluateAnswerLogicOutput;
  followups: FollowupItem[];
}

export type QuestionType = "resume_based" | "role_specific" | "hybrid";

export function classifyQuestionType(question: string): QuestionType {
  const q = question.toLowerCase();
  const resumeSignals = /(your|you did|你做过|你的项目|你的经历|经历|简历|behavior|motivation|why did you)/i.test(q);
  const roleSignals = /(design|architecture|方案|系统|技术判断|tradeoff|权限|转化|商业化|优化)/i.test(q);

  if (resumeSignals && roleSignals) return "hybrid";
  if (roleSignals) return "role_specific";
  return "resume_based";
}

export function routeQuestionType(questionType: QuestionType): string[] {
  if (questionType === "resume_based") return ["answer_with_experience"];
  if (questionType === "role_specific") return ["answer_role_specific_question"];
  return ["answer_role_specific_question", "answer_with_experience"];
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);

const getCapabilityFocus = (jobAnchor: JobAnchor): string[] =>
  jobAnchor.capability_focus && jobAnchor.capability_focus.length > 0
    ? jobAnchor.capability_focus
    : jobAnchor.must_have ?? [];

const calcCapabilityAlignment = (exp: ExperienceItem, capabilityFocus: string[]): number => {
  if (capabilityFocus.length === 0) return 1;
  const raw = [exp.company, exp.role, exp.project, ...(exp.actions ?? [])].filter(Boolean).join(" ").toLowerCase();
  const hitCount = capabilityFocus.reduce((acc, item) => (raw.includes(item.toLowerCase()) ? acc + 1 : acc), 0);
  return hitCount / capabilityFocus.length;
};

function matchExperience(question: string, experiences: ExperienceItem[], jobAnchor: JobAnchor): ExperienceItem[] {
  const qTokens = new Set(tokenize(question));
  const capabilityFocus = getCapabilityFocus(jobAnchor);
  return experiences
    .map((exp) => {
      const raw = [exp.company, exp.role, exp.project, ...(exp.actions ?? [])].filter(Boolean).join(" ");
      const questionScore = tokenize(raw).reduce((acc, t) => (qTokens.has(t) ? acc + 1 : acc), 0);
      const capabilityAlignment = calcCapabilityAlignment(exp, capabilityFocus);
      // 不符合岗位能力的经历要降权：最低保留 20% 分数避免直接丢失可迁移证据。
      const score = questionScore * Math.max(0.2, capabilityAlignment);
      return { exp, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.exp);
}

export function answerWithExperience(
  question: string,
  experienceDb: ExperienceDb,
  jobAnchor: JobAnchor
): AnswerWithExperienceOutput {
  const questionType = classifyQuestionType(question);
  const routeSuggestion: AnswerWithExperienceOutput["route_suggestion"] =
    questionType === "resume_based"
      ? "answer_with_experience"
      : questionType === "role_specific"
        ? "answer_role_specific_question"
        : "hybrid";

  const matches = matchExperience(question, experienceDb.experiences ?? [], jobAnchor);
  const picked = matches[0];

  if (!picked) {
    return {
      route_suggestion: routeSuggestion,
      direct_answer: "我目前没有完全同类的直接经历，但我会先说明边界，再给出最接近的可迁移案例。",
      coaching_answer: "先承认不足，再转向最接近的真实项目；不要硬编。",
      used_experience_ids: [],
      confidence: "LOW",
      risk_flags: ["问题与经历库匹配弱"],
      weak_spans: [{ text: "最接近的可迁移案例", reason: "缺少问题直连项目" }],
      answer_suggestions: [
        {
          text: "补充一个可迁移案例并说明学习计划",
          type: "supplement_needed",
          risk_level: "medium",
          reason: "当前素材不足"
        }
      ]
    };
  }

  const hasMetrics = !!picked.metrics && Object.keys(picked.metrics).length > 0;
  const metricText = hasMetrics ? `，并通过指标验证了结果（${Object.entries(picked.metrics ?? {})[0].join(": ")}）` : "";
  const capabilityFocus = getCapabilityFocus(jobAnchor);
  const alignedCapability =
    capabilityFocus.find((item) => {
      const raw = [picked.company, picked.role, picked.project, ...(picked.actions ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return raw.includes(item.toLowerCase());
    }) ?? capabilityFocus[0];
  const anchorHint = alignedCapability ? `，并且对齐了岗位关注的 ${alignedCapability}` : "";
  const capabilityAligned = calcCapabilityAlignment(picked, capabilityFocus) > 0;
  const confidence: AnswerWithExperienceOutput["confidence"] = !capabilityAligned
    ? "LOW"
    : hasMetrics
      ? "HIGH"
      : "MEDIUM";
  const riskFlags = [
    ...(hasMetrics ? [] : ["缺少结果指标"]),
    ...(capabilityAligned ? [] : ["经历与岗位 capability_focus 对齐不足"])
  ];
  const weakSpans = [
    ...(hasMetrics ? [] : [{ text: "关键改进", reason: "未提供前后量化结果" }]),
    ...(capabilityAligned ? [] : [{ text: picked.project ?? "当前经历", reason: "与岗位核心能力对齐弱" }])
  ];

  return {
    route_suggestion: routeSuggestion,
    direct_answer: `我在 ${picked.company ?? "过往项目"} 的 ${picked.project ?? "核心项目"} 中主导了关键改进${metricText}${anchorHint}。`,
    coaching_answer: hasMetrics
      ? "用 STAR 结构作答：先交代场景和目标，再说动作，最后给量化结果。"
      : "先讲动作和取舍，再主动承认缺少量化结果，并说明后续如何补充指标。",
    used_experience_ids: picked.experience_id ? [picked.experience_id] : [],
    confidence,
    risk_flags: riskFlags,
    weak_spans: weakSpans,
    answer_suggestions: hasMetrics && capabilityAligned
      ? [
          {
            text: "可补一条跨团队冲突处理细节",
            type: "framing",
            risk_level: "low",
            reason: "增强真实度和完整性"
          }
        ]
      : [
          {
            text: "补充可验证结果指标（如时延/错误率前后对比）",
            type: "supplement_needed",
            risk_level: "medium",
            reason: capabilityAligned ? "impact 维度证据不足" : "impact 与岗位能力对齐证据不足"
          }
        ]
  };
}

export function evaluateAnswerLogic(
  question: string,
  answer: AnswerWithExperienceOutput,
  experienceDb: ExperienceDb
): EvaluateAnswerLogicOutput {
  const issues: string[] = [];
  const highlight_spans: EvaluateAnswerLogicOutput["highlight_spans"] = [];

  const hasUsed = answer.used_experience_ids.length > 0;
  const knownIds = new Set((experienceDb.experiences ?? []).map((x) => x.experience_id));
  const outOfDb = answer.used_experience_ids.filter((id) => !knownIds.has(id));

  if (outOfDb.length > 0) {
    issues.push("回答包含经历库不存在的事实引用");
    highlight_spans.push({ text: outOfDb.join(","), issue: "experience_db 不存在该事实", severity: "high" });
  }

  if (!hasUsed) {
    issues.push("与经历库直接匹配不足");
    highlight_spans.push({ text: answer.direct_answer, issue: "缺少可核验经历锚点", severity: "medium" });
  }

  if (answer.risk_flags.includes("缺少结果指标")) {
    issues.push("缺少结果指标");
    highlight_spans.push({ text: "关键改进", issue: "未给出量化结果", severity: "medium" });
  }

  const relevance = hasUsed ? 4 : 2;
  const authenticity = outOfDb.length > 0 ? 1 : hasUsed ? 4 : 3;
  const structure = answer.coaching_answer.includes("STAR") ? 4 : 3;
  const impact = answer.risk_flags.includes("缺少结果指标") ? 2 : 4;

  let next_action: EvaluateAnswerLogicOutput["next_action"] = "accept";
  let confidence: EvaluateAnswerLogicOutput["confidence"] = "HIGH";

  if (outOfDb.length > 0 || !hasUsed) {
    next_action = "request_user_supplement";
    confidence = "LOW";
  } else if (issues.length > 0 || impact <= 2) {
    next_action = "ask_followup";
    confidence = "MEDIUM";
  }

  return {
    score: { relevance, authenticity, structure, impact },
    confidence,
    issues,
    highlight_spans,
    next_action
  };
}

export function generateInterviewerFollowups(
  question: string,
  answer: AnswerWithExperienceOutput,
  evaluation: EvaluateAnswerLogicOutput,
  jobAnchor: JobAnchor
): FollowupItem[] {
  const followups: FollowupItem[] = [];

  const weak = answer.weak_spans[0] ?? evaluation.highlight_spans[0];
  if (weak) {
    followups.push({
      question: `你提到“${weak.text}”，具体怎么验证这个点？请给出数据或边界。`,
      intent: "验证薄弱点是否可被事实支撑",
      pressure_level: "high",
      expected_signal: "给出可验证数据、时间窗口或个人贡献边界"
    });
  }

  if (followups.length < 2) {
    followups.push({
      question: `如果重来一次，你在“${question}”这题里会调整哪一个关键取舍？为什么？`,
      intent: `验证复盘深度并对齐岗位要求${jobAnchor.must_have?.[0] ? `（${jobAnchor.must_have[0]}）` : ""}`,
      pressure_level: "medium",
      expected_signal: "能讲清楚失败/取舍/复盘及改进路径"
    });
  }

  return followups.slice(0, 2);
}

export async function runInterviewSession(input: InterviewSessionInput): Promise<SessionResult> {
  const [expRaw, queueRaw, anchorRaw] = await Promise.all([
    readFile(input.experienceDbPath, "utf-8"),
    readFile(input.questionQueuePath, "utf-8"),
    readFile(input.jobAnchorPath, "utf-8")
  ]);

  const experienceDb = JSON.parse(expRaw) as ExperienceDb;
  const queue = JSON.parse(queueRaw) as QuestionQueue;
  const jobAnchor = JSON.parse(anchorRaw) as JobAnchor;

  const question = queue.questions.find((q) => q.confirmed === true);
  if (!question) {
    throw new Error("No confirmed question found in question_queue.");
  }

  const questionType = classifyQuestionType(question.text);
  const routeTo = routeQuestionType(questionType);

  const resumeAnswer = answerWithExperience(question.text, experienceDb, jobAnchor);
  const roleSpecificAnswer = answerRoleSpecificQuestion({
    question: question.text,
    job_anchor: {
      must_have: jobAnchor.must_have,
      nice_to_have: jobAnchor.nice_to_have,
      capability_focus: jobAnchor.capability_focus
    },
    optional_experience_db: (experienceDb.experiences ?? []).map((exp) => ({
      experience_id: exp.experience_id,
      company: exp.company,
      role: exp.role,
      project: exp.project,
      actions: exp.actions
    }))
  });

  const candidate_answer =
    questionType === "role_specific"
      ? {
          route_suggestion: "answer_role_specific_question",
          direct_answer: roleSpecificAnswer.recommended_answer,
          coaching_answer: roleSpecificAnswer.answer_framework.formula,
          used_experience_ids: [],
          confidence: "MEDIUM" as const,
          risk_flags: roleSpecificAnswer.risk_notes,
          weak_spans: [],
          answer_suggestions: [
            {
              text: "若有相关项目，可补 1 条真实落地细节提升说服力。",
              type: "supplement_needed" as const,
              risk_level: "low" as const,
              reason: "当前答案以岗位通用方法为主"
            }
          ]
        }
      : questionType === "hybrid"
        ? {
            ...resumeAnswer,
            route_suggestion: "hybrid",
            coaching_answer: `${resumeAnswer.coaching_answer}；补充岗位方法论：${roleSpecificAnswer.answer_framework.formula}`
          }
        : resumeAnswer;
  const evaluation = evaluateAnswerLogic(question.text, candidate_answer, experienceDb);

  const needFollowup = evaluation.confidence === "LOW" || evaluation.next_action !== "accept";
  const followups = needFollowup
    ? generateInterviewerFollowups(question.text, candidate_answer, evaluation, jobAnchor)
    : [];

  return {
    question,
    question_type: questionType,
    route_to: routeTo,
    candidate_answer,
    evaluation,
    followups
  };
}
