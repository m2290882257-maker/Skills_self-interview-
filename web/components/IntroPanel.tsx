import { useMemo } from "react";
import { answerWithExperience } from "../../orchestrator/interview_session.ts";

interface Props {
  experience_db?: any;
  job_anchor?: any;
}

export default function IntroPanel({ experience_db, job_anchor }: Props) {
  const intro = useMemo(() => {
    if (!experience_db || !job_anchor) return null;

    const experienceDb = {
      experiences: (experience_db.experiences ?? []).map((x: any) => ({
        experience_id: x.experience_id,
        project: x.module,
        actions: [x.action],
        metrics: x.result && x.result !== "无" ? { result: x.result } : undefined
      }))
    };

    const anchor = {
      must_have: job_anchor.capability_focus ?? [],
      nice_to_have: job_anchor.hidden_requirements ?? [],
      capability_focus: job_anchor.capability_focus ?? []
    };

    const intro30 = answerWithExperience(
      "请做一个30秒自我介绍，突出与你应聘岗位最相关的经历。",
      experienceDb as any,
      anchor as any
    );

    const intro60 = answerWithExperience(
      "请做一个1分钟自我介绍，包含背景、代表项目、能力优势和岗位匹配。",
      experienceDb as any,
      anchor as any
    );

    const suggestions = [...(intro30.answer_suggestions ?? []), ...(intro60.answer_suggestions ?? [])];

    return { intro30, intro60, suggestions };
  }, [experience_db, job_anchor]);

  if (!intro) return null;

  return (
    <section className="panel">
      <h2>Intro Panel</h2>

      <div className="card">
        <h3>30秒自我介绍</h3>
        <p>{intro.intro30.direct_answer}</p>
      </div>

      <div className="card">
        <h3>1分钟自我介绍</h3>
        <p>{intro.intro60.direct_answer}</p>
      </div>

      <div className="card">
        <h3>建议优化点</h3>
        <ul>
          {intro.suggestions.map((s: any, idx: number) => (
            <li key={`${s.text}-${idx}`}>{s.text}</li>
          ))}
          {intro.suggestions.length === 0 ? <li>无</li> : null}
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
