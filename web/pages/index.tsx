import { useState } from "react";
import AnalysisPanel from "../components/AnalysisPanel";
import InterviewPanel from "../components/InterviewPanel";
import IntroPanel from "../components/IntroPanel";
import UploadPanel from "../components/UploadPanel";

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [pickedQuestion, setPickedQuestion] = useState<string>("");
  const [tab, setTab] = useState<"intro" | "interview">("intro");

  return (
    <main>
      <h1>MVP Interview Assistant (Local Orchestrator)</h1>
      <section className="top">
        <h2>Job Anchor</h2>
        {data?.job_anchor ? (
          <>
            <p><b>job_tags:</b> {(data.job_anchor.job_tags ?? []).join(", ") || "(empty)"}</p>
            <p><b>target_role:</b> {data.job_anchor.target_role ?? "(empty)"}</p>
            <p><b>capability_focus:</b> {(data.job_anchor.capability_focus ?? []).join(", ") || "(empty)"}</p>
          </>
        ) : (
          <p>(empty)</p>
        )}
      </section>

      <section className="layout">
        <div className="left">
          <UploadPanel onResult={setData} onError={setError} />
          {error ? <p className="error">{error}</p> : null}
          <AnalysisPanel data={data} onPickQuestion={setPickedQuestion} />
          {pickedQuestion ? <p>Picked question: {pickedQuestion}</p> : null}
        </div>

        <div className="right">
          <div className="tabs">
            <button className={tab === "intro" ? "active" : ""} onClick={() => setTab("intro")}>
              自我介绍
            </button>
            <button className={tab === "interview" ? "active" : ""} onClick={() => setTab("interview")}>
              面试训练
            </button>
          </div>

          {tab === "intro" ? (
            <IntroPanel experience_db={data?.experience_db} job_anchor={data?.job_anchor} />
          ) : (
            <InterviewPanel data={data} pickedQuestion={pickedQuestion} />
          )}
        </div>
      </section>

      <style jsx>{`
        main { max-width: 1200px; margin: 24px auto; padding: 0 12px; display: grid; gap: 12px; }
        .top { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
        .layout { display: flex; gap: 12px; align-items: flex-start; }
        .left { width: 46%; display: grid; gap: 12px; }
        .right { width: 54%; display: grid; gap: 8px; }
        .tabs { display: flex; gap: 8px; }
        .tabs button { border: 1px solid #ccc; background: #fff; padding: 6px 10px; cursor: pointer; border-radius: 4px; }
        .tabs button.active { border-color: #2563eb; color: #2563eb; }
        .error { color: #b91c1c; }
      `}</style>
    </main>
  );
}
