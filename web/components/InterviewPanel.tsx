import { useMemo } from "react";
import {
  answerWithExperience,
  classifyQuestionType,
  evaluateAnswerLogic,
  generateInterviewerFollowups
} from "../../orchestrator/interview_session.ts";
import { answerRoleSpecificQuestion } from "../../orchestrator/role_specific_question.ts";

interface Props {
  data?: any;
  pickedQuestion?: string;
}

export default function InterviewPanel({ data, pickedQuestion }: Props) {
  const result = useMemo(() => {
    if (!data) return null;

    const question = pickedQuestion || data.question_queue?.questions?.[0]?.text;
    if (!question) return null;

    const experienceDb = {
      experiences: (data.experience_db?.experiences ?? []).map((x: any) => ({
        experience_id: x.experience_id,
        project: x.module,
        actions: [x.action],
        metrics: x.result && x.result !== "无" ? { result: x.result } : undefined
      }))
    };

    const jobAnchor = {
      must_have: data.job_anchor?.capability_focus ?? [],
      nice_to_have: data.job_anchor?.hidden_requirements ?? [],
      capability_focus: data.job_anchor?.capability_focus ?? []
    };

    const questionType = classifyQuestionType(question);
    const resumeAnswer = answerWithExperience(question, experienceDb as any, jobAnchor as any);
    const roleSpecific = answerRoleSpecificQuestion({
      question,
      job_anchor: jobAnchor,
      optional_experience_db: experienceDb.experiences
    });

    const usedExperienceIds = roleSpecific.optional_experience_hooks.map(
      (hook: { experience_id: string }) => hook.experience_id
    );

    const candidateAnswer =
      questionType === "role_specific"
        ? {
            route_suggestion: "answer_role_specific_question" as const,
            direct_answer: roleSpecific.recommended_answer,
            coaching_answer: roleSpecific.answer_framework.formula,
            used_experience_ids: usedExperienceIds,
            confidence: (usedExperienceIds.length > 0 ? "MEDIUM" : "LOW") as const,
            risk_flags: roleSpecific.risk_notes,
            weak_spans: [],
            answer_suggestions: []
          }
        : questionType === "hybrid"
          ? {
              ...resumeAnswer,
              route_suggestion: "hybrid" as const,
              coaching_answer: `${resumeAnswer.coaching_answer}；岗位思路：${roleSpecific.answer_framework.formula}`
            }
          : resumeAnswer;

    const evaluation = evaluateAnswerLogic(question, candidateAnswer, experienceDb as any);
    const followups = generateInterviewerFollowups(question, candidateAnswer, evaluation, jobAnchor as any);

    return {
      question,
      questionType,
      roleSpecific,
      candidateAnswer,
      evaluation,
      followups
    };
  }, [data, pickedQuestion]);

  if (!result) return null;

  return (
    <section className="panel">
      <h2>Interview Panel</h2>

      <div className="card">
        <h3>【问题】</h3>
        <p>{result.question}</p>
      </div>

      <div className="card">
        <h3>【推荐回答】</h3>
        <p>{result.candidateAnswer.direct_answer}</p>
        <h4>【coaching_answer】</h4>
        <p>{result.candidateAnswer.coaching_answer}</p>
      </div>

      {result.questionType !== "resume_based" ? (
        <div className="card">
          <h3>【考察点（如果是 role_specific）】</h3>
          <ul>
            {result.roleSpecific.explicit_test_points.map((x: string) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h3>【⚠️ 弱点（weak_spans）】</h3>
        <ul>
          {(result.candidateAnswer.weak_spans ?? []).map((x: any, idx: number) => (
            <li key={`${x.text}-${idx}`}>{x.text}（{x.reason}）</li>
          ))}
          {(result.candidateAnswer.weak_spans ?? []).length === 0 ? <li>无</li> : null}
        </ul>
      </div>

      <div className="card">
        <h3>【💡 建议（answer_suggestions）】</h3>
        <ul>
          {(result.candidateAnswer.answer_suggestions ?? []).map((x: any, idx: number) => (
            <li key={`${x.text}-${idx}`}>{x.text}</li>
          ))}
          {(result.candidateAnswer.answer_suggestions ?? []).length === 0 ? <li>无</li> : null}
        </ul>
      </div>

      <div className="card">
        <h3>【🎯 追问（followups）】</h3>
        <ul>
          {(result.followups ?? []).map((x: any, idx: number) => (
            <li key={`${x.question}-${idx}`}>{x.question}</li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .panel { padding: 16px; border: 1px solid #ddd; border-radius: 8px; display: grid; gap: 10px; }
        .card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; }
        ul { margin: 0; padding-left: 18px; }
      `}</style>
    </section>
  );
}
