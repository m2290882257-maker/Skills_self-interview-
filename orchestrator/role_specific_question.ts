export interface JobAnchorInput {
  must_have?: string[];
  nice_to_have?: string[];
  capability_focus?: string[];
  job_tags?: string[];
}

export interface ExperienceLite {
  experience_id: string;
  company?: string;
  role?: string;
  project?: string;
  actions?: string[];
}

export interface HiddenEvaluationDimension {
  dimension: string;
  explanation: string;
}

export interface AnswerFrameworkStep {
  title: string;
  explanation: string;
}

export interface RoleSpecificAnswerOutput {
  question_type: "role_specific" | "hybrid";
  explicit_test_points: string[];
  hidden_evaluation_dimensions: HiddenEvaluationDimension[];
  answer_framework: {
    formula: string;
    steps: AnswerFrameworkStep[];
  };
  recommended_answer: string;
  optional_experience_hooks: Array<{ experience_id: string; usage: string }>;
  risk_notes: string[];
  followup_questions: string[];
}

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);

const inferExplicitPoints = (question: string, capabilityFocus: string[]): string[] => {
  const points = ["问题定义是否清晰", "方案是否可落地", "指标设计是否可验证", "是否说明关键取舍"];
  if (/[误触|交互|体验]/.test(question)) points.push("是否兼顾体验与风险控制");
  if (/[权限|鉴权|RBAC|ABAC]/i.test(question)) points.push("是否覆盖权限模型与审计闭环");
  if (/[付费|转化|商业化|增长]/.test(question)) points.push("是否覆盖增长漏斗与实验设计");
  if (capabilityFocus.length > 0) points.push(`是否对齐岗位能力：${capabilityFocus.join(" / ")}`);
  return Array.from(new Set(points));
};

const inferHiddenDimensions = (question: string): HiddenEvaluationDimension[] => {
  const dimensions: HiddenEvaluationDimension[] = [
    { dimension: "结构化思维", explanation: "是否能先定义问题再展开方案，避免直接堆动作。" },
    { dimension: "风险意识", explanation: "是否主动识别失败场景、边界条件与防护策略。" },
    { dimension: "业务感知", explanation: "是否把方案与业务目标、成本和收益绑定。" }
  ];

  if (/[权限|鉴权]/.test(question)) {
    dimensions.push({
      dimension: "治理与合规意识",
      explanation: "是否考虑最小权限、审计日志、越权追责与敏感操作保护。"
    });
  }
  if (/[付费|转化|商业化]/.test(question)) {
    dimensions.push({
      dimension: "增长实验能力",
      explanation: "是否能设计分层实验并区分短期提升与长期价值。"
    });
  }

  return dimensions;
};

const buildFramework = (capabilityFocus: string[]): RoleSpecificAnswerOutput["answer_framework"] => ({
  formula: "定义问题 -> 拆解方案 -> 说明原因 -> 指标验证 -> 取舍复盘",
  steps: [
    {
      title: "问题定义",
      explanation: "明确目标用户、触发场景、当前损失与成功标准。"
    },
    {
      title: "具体方案",
      explanation: "给出系统化方案（策略、流程、机制）并说明关键模块如何协作。"
    },
    {
      title: "原因与原理",
      explanation: "解释为什么这么做，替代方案为何不优先。"
    },
    {
      title: "验证指标",
      explanation: "给出前后对比指标、实验方式与观察周期。"
    },
    {
      title: "取舍与边界",
      explanation: `说明成本、复杂度与风险取舍${capabilityFocus.length ? `，并对齐能力锚点：${capabilityFocus.join("/")}` : ""}。`
    }
  ]
});

const buildRecommendedAnswer = (question: string, capabilityFocus: string[]): string => {
  const anchor = capabilityFocus[0] ?? "岗位核心能力";

  if (question.includes("误触")) {
    return `这道题我会先定义问题：误触主要发生在高紧张操作和拥挤界面下，核心目标是降低误操作同时不拖慢主流程。具体方案上，我会做三层设计：第一层是交互防误触（危险按钮间距、长按确认、关键操作二次确认）；第二层是状态反馈（即时震动/视觉反馈，防止重复触发）；第三层是数据闭环（按入口监控误触率与关键行为完成率）。这么做的原因是它能在不明显增加操作负担的前提下，优先压住高风险误操作。验证上我会看误触率、关键任务完成率、次日留存，并用A/B实验验证是否显著改善。取舍上，确认步骤越多越安全但可能伤害流畅度，所以我会只对高风险操作加重保护，并围绕${anchor}持续迭代。`;
  }

  if (question.includes("权限")) {
    return `我会先定义问题：B端权限系统要解决的是“谁在什么范围内、对什么资源、执行什么操作”，并确保可审计可追责。具体方案是采用 RBAC 为主、必要场景叠加 ABAC：先抽象资源与动作，再设计角色模板、数据范围策略和审批流，同时补齐审计日志与越权告警。原因是纯角色模型实现快但灵活性不足，加入属性策略可以覆盖复杂组织结构。验证指标我会关注越权事件数、授权配置耗时、审批通过时长和权限工单量。取舍上，模型越灵活配置成本越高，我会先标准化高频角色再逐步开放高级策略，确保复杂度可控并对齐${anchor}。`;
  }

  if (question.includes("付费") || question.includes("转化") || question.includes("商业化")) {
    return `我会先定义问题：付费转化提升不能只看短期收入，还要兼顾用户体验和长期留存。具体方案我会按漏斗拆解：曝光 -> 点击 -> 支付 -> 复购，分别做价值表达优化、定价与套餐实验、支付链路减阻和权益体系增强。原因是不同漏斗环节的损失来源不同，必须分段治理。验证指标我会看付费转化率、ARPPU、退款率、7/30日留存，并通过分层A/B确认增量真实有效。取舍上，激进促销能拉升短期转化但可能伤害品牌与长期价值，所以我会控制补贴强度并建立人群差异化策略，确保增长质量与${anchor}一致。`;
  }

  return `我会先定义这道题要解决的核心业务问题，再给出可落地方案，并解释为什么采用该路径而不是替代方案。随后我会明确验证指标与观察周期，最后说明成本、风险与取舍，确保方案既有执行细节也能对齐${anchor}。`;
};

const buildFollowups = (question: string): string[] => [
  "如果核心指标没有改善，你会优先排查哪三个环节？",
  "这个方案在高并发或复杂组织场景下会遇到什么边界问题？",
  `针对“${question}”，你会如何设计一次最小可行实验来快速验证？`
];

const buildExperienceHooks = (
  question: string,
  capabilityFocus: string[],
  optional_experience_db: ExperienceLite[] = []
): Array<{ experience_id: string; usage: string }> => {
  if (optional_experience_db.length === 0) return [];

  const qTokens = new Set(tokenize(`${question} ${capabilityFocus.join(" ")}`));
  const keywordHints = ["误触", "权限", "付费", "转化", "商业化", "稳定性", "架构"];
  return optional_experience_db
    .map((exp) => {
      const raw = [exp.company, exp.role, exp.project, ...(exp.actions ?? [])].filter(Boolean).join(" ");
      const tokenScore = tokenize(raw).reduce((acc, t) => (qTokens.has(t) ? acc + 1 : acc), 0);
      const keywordScore = keywordHints.some((k) => question.includes(k) && raw.includes(k)) ? 1 : 0;
      const score = tokenScore + keywordScore;
      return { exp, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ exp }) => ({
      experience_id: exp.experience_id,
      usage: "可在‘方案落地与验证指标’部分补充一条真实执行细节，增强可信度。"
    }));
};

export function answerRoleSpecificQuestion(input: {
  question: string;
  job_anchor: JobAnchorInput;
  optional_experience_db?: ExperienceLite[];
}): RoleSpecificAnswerOutput {
  const capabilityFocus = input.job_anchor.capability_focus ?? input.job_anchor.must_have ?? [];
  const hooks = buildExperienceHooks(input.question, capabilityFocus, input.optional_experience_db ?? []);

  return {
    question_type: hooks.length > 0 ? "hybrid" : "role_specific",
    explicit_test_points: inferExplicitPoints(input.question, capabilityFocus),
    hidden_evaluation_dimensions: inferHiddenDimensions(input.question),
    answer_framework: buildFramework(capabilityFocus),
    recommended_answer: buildRecommendedAnswer(input.question, capabilityFocus),
    optional_experience_hooks: hooks,
    risk_notes: [
      "不得编造用户个人经历；若无相关经历，仅输出通用可复用回答。",
      "避免只给概念，不给可验证指标与取舍说明。"
    ],
    followup_questions: buildFollowups(input.question)
  };
}

// Backward compatibility wrapper for existing acceptance flow.
export interface RoleSpecificQuestionOutput {
  explicit_test_points: string[];
  hidden_evaluation_dimensions: string[];
  answer_framework: string[];
  recommended_answer: string;
  warnings: string[];
}

export function buildRoleSpecificQuestionGuidance(
  question: string,
  job_anchor?: JobAnchorInput
): RoleSpecificQuestionOutput {
  if (!job_anchor || ((job_anchor.must_have ?? []).length === 0 && (job_anchor.nice_to_have ?? []).length === 0)) {
    return {
      explicit_test_points: [],
      hidden_evaluation_dimensions: [],
      answer_framework: [],
      recommended_answer: "缺少 job_anchor，无法给出岗位定制化分析。",
      warnings: ["job_anchor_missing"]
    };
  }

  const out = answerRoleSpecificQuestion({ question, job_anchor });
  return {
    explicit_test_points: out.explicit_test_points,
    hidden_evaluation_dimensions: out.hidden_evaluation_dimensions.map((x) => `${x.dimension}：${x.explanation}`),
    answer_framework: out.answer_framework.steps.map((s) => `${s.title}：${s.explanation}`),
    recommended_answer: out.recommended_answer,
    warnings: []
  };
}
