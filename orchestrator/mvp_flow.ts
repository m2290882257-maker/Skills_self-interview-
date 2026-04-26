import {
  answerWithExperience,
  classifyQuestionType,
  evaluateAnswerLogic,
  generateInterviewerFollowups,
  type AnswerWithExperienceOutput,
  type SessionResult
} from "./interview_session.ts";
import { extractJobAnchorFromJd } from "./job_anchor_extractor.ts";
import { answerRoleSpecificQuestion } from "./role_specific_question.ts";
import { extractInterviewQuestions, extractResumeExperiences } from "./text_extractors.ts";

export interface ExperienceItem {
  experience_id: string;
  company?: string;
  role?: string;
  project?: string;
  actions?: string[];
  metrics?: Record<string, number | string>;
}

export interface ExperienceDb {
  experiences: ExperienceItem[];
}

export interface JobAnchor {
  must_have?: string[];
  nice_to_have?: string[];
  capability_focus?: string[];
}

export interface QuestionQueue {
  questions: Array<{ question_id: string; text: string; confirmed: boolean }>;
}

// Data flow 1: resume -> experience_db
export function buildExperienceDbFromResume(resumeText: string): ExperienceDb {
  const atoms = extractResumeExperiences(resumeText);
  return {
    experiences: atoms.map((x, idx) => ({
      experience_id: `exp_${idx + 1}`,
      project: x.scenario,
      actions: [x.action],
      metrics: x.result !== "无" ? { result: x.result } : undefined
    }))
  };
}

// Data flow 2: jd -> job_anchor
export function buildJobAnchorFromJd(jdText: string): JobAnchor {
  const anchor = extractJobAnchorFromJd(jdText);
  return {
    must_have: anchor.capability_focus,
    nice_to_have: anchor.hidden_requirements,
    capability_focus: anchor.capability_focus
  };
}

// Data flow 3: interview -> question_queue
export function buildQuestionQueueFromInterview(interviewText: string): QuestionQueue {
  const qs = extractInterviewQuestions(interviewText);
  return {
    questions: qs.map((q, idx) => ({
      question_id: `q_${idx + 1}`,
      text: q.raw_question,
      confirmed: true
    }))
  };
}

// Flow A: 自我介绍生成流程（experience_db + job_anchor -> intro_answer）
export function generateIntroAnswer(input: { experience_db: ExperienceDb; job_anchor: JobAnchor }): {
  intro_answer: string;
} {
  const topExp = input.experience_db.experiences[0];
  const focus = input.job_anchor.capability_focus?.[0] ?? input.job_anchor.must_have?.[0] ?? "岗位核心能力";

  if (!topExp) {
    return {
      intro_answer: `我过往经历里最相关的是围绕${focus}的通用实践，目前会重点补齐与岗位最匹配的项目证据。`
    };
  }

  return {
    intro_answer: `我过去主要在${topExp.project ?? "核心项目"}中负责关键动作（${(topExp.actions ?? []).join(" / ") || "持续优化"}），并持续把工作结果对齐到${focus}。如果有机会，我可以进一步展开具体取舍和验证指标。`
  };
}

// Flow B: 面试训练流程
export function runInterviewTraining(input: {
  question: string;
  experience_db: ExperienceDb;
  job_anchor: JobAnchor;
}): SessionResult {
  const questionItem = { question_id: "q_mvp_1", text: input.question, confirmed: true };
  const questionType = classifyQuestionType(input.question);
  const routeTo =
    questionType === "resume_based"
      ? ["answer_with_experience"]
      : questionType === "role_specific"
        ? ["answer_role_specific_question"]
        : ["answer_role_specific_question", "answer_with_experience"];

  const resumeAnswer = answerWithExperience(input.question, input.experience_db as any, input.job_anchor as any);
  const roleAnswer = answerRoleSpecificQuestion({
    question: input.question,
    job_anchor: input.job_anchor,
    optional_experience_db: input.experience_db.experiences.map((x) => ({
      experience_id: x.experience_id,
      project: x.project,
      actions: x.actions,
      role: x.role,
      company: x.company
    }))
  });

  const candidate_answer: AnswerWithExperienceOutput =
    questionType === "role_specific"
      ? {
          route_suggestion: "answer_role_specific_question",
          direct_answer: roleAnswer.recommended_answer,
          coaching_answer: roleAnswer.answer_framework.formula,
          used_experience_ids: [],
          confidence: "MEDIUM",
          risk_flags: roleAnswer.risk_notes,
          weak_spans: [],
          answer_suggestions: []
        }
      : questionType === "hybrid"
        ? {
            ...resumeAnswer,
            route_suggestion: "hybrid",
            coaching_answer: `${resumeAnswer.coaching_answer}；岗位补充：${roleAnswer.answer_framework.formula}`
          }
        : resumeAnswer;

  const evaluation = evaluateAnswerLogic(input.question, candidate_answer, input.experience_db as any);
  const followups =
    evaluation.confidence === "LOW" || evaluation.next_action !== "accept"
      ? generateInterviewerFollowups(input.question, candidate_answer, evaluation, input.job_anchor as any)
      : [];

  return {
    question: questionItem,
    question_type: questionType,
    route_to: routeTo,
    candidate_answer,
    evaluation,
    followups
  };
}
