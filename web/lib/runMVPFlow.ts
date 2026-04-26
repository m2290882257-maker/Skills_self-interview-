export interface MVPInput {
  resumeText: string;
  jdText: string;
  interviewText: string;
}

export async function runMVPFlow(input: MVPInput): Promise<{
  experience_db: {
    experiences: Array<{
      experience_id: string;
      module: string;
      action: string;
      result: string;
    }>;
  };
  job_anchor: {
    job_tags: string[];
    target_role: string;
    capability_focus: string[];
    hidden_requirements: string[];
    answer_style: string;
  };
  question_queue: {
    questions: Array<{ question_id: string; text: string; confirmed: boolean; priority: "P0" | "P1" | "P2" }>;
  };
}> {
  const resp = await fetch("/api/mvp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json.error || "Run failed");
  }
  return json;
}
