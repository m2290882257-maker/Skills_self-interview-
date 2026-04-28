import type { NextApiRequest, NextApiResponse } from "next";
import { extractJobAnchorFromJd } from "../../../orchestrator/job_anchor_extractor.ts";
import { extractInterviewQuestions, extractResumeExperiences } from "../../../orchestrator/text_extractors.ts";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const resumeText = req.body.resumeText ?? req.body.resume_text ?? "";
    const jdText = req.body.jdText ?? req.body.jd_text ?? "";
    const interviewText = req.body.interviewText ?? req.body.interview_text ?? "";

    const experiences = extractResumeExperiences(resumeText);
    const job_anchor = extractJobAnchorFromJd(jdText);
    const questions = extractInterviewQuestions(interviewText);

    const experience_db = {
      experiences: experiences.map((x, idx) => ({
        experience_id: `exp_${idx + 1}`,
        module: x.module,
        action: x.action,
        result: x.result
      }))
    };
    const question_queue = {
      questions: questions.map((q, idx) => ({
        question_id: `q_${idx + 1}`,
        text: q.raw_question,
        confirmed: false,
        priority: q.priority
      }))
    };

    const result = {
      experience_db,
      job_anchor,
      question_queue
    };
    res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
