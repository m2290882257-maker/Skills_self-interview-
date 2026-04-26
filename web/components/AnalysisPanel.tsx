import { useState } from "react";

interface Props {
  data: any;
  onPickQuestion?: (question: string) => void;
}

export default function AnalysisPanel({ data, onPickQuestion }: Props) {
  const [activeQuestion, setActiveQuestion] = useState<string>("");
  if (!data) return null;

  const experiences = data.experience_db?.experiences ?? [];
  const jobAnchor = data.job_anchor ?? {};
  const questions = data.question_queue?.questions ?? [];

  return (
    <section className="panel">
      <h2>Analysis</h2>

      <div className="card">
        <h3>experience_db</h3>
        {experiences.length === 0 ? <p>(empty)</p> : null}
        <ul>
          {experiences.map((exp: any) => (
            <li key={exp.experience_id}>
              <b>module:</b> {exp.module || "无"} | <b>action:</b> {exp.action || "无"} | <b>result:</b> {exp.result || "无"}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3>job_anchor</h3>
        <p><b>job_tags:</b> {(jobAnchor.job_tags ?? []).join(", ") || "(empty)"}</p>
        <p><b>target_role:</b> {jobAnchor.target_role ?? "(empty)"}</p>
        <p><b>capability_focus:</b> {(jobAnchor.capability_focus ?? []).join(", ") || "(empty)"}</p>
      </div>

      <div className="card">
        <h3>question_queue</h3>
        {questions.length === 0 ? <p>(empty)</p> : null}
        <ul>
          {questions.map((q: any) => (
            <li key={q.question_id}>
              <button
                className={activeQuestion === q.text ? "active" : ""}
                onClick={() => {
                  setActiveQuestion(q.text);
                  onPickQuestion?.(q.text);
                }}
              >
                {q.text}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <style jsx>{`
        .panel { padding: 16px; border: 1px solid #ddd; border-radius: 8px; display: grid; gap: 10px; }
        .card { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px; }
        ul { margin: 0; padding-left: 18px; }
        button { background: #fff; border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; cursor: pointer; }
        button.active { border-color: #2563eb; color: #2563eb; }
      `}</style>
    </section>
  );
}
