import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  answerWithExperience,
  evaluateAnswerLogic,
  generateInterviewerFollowups
} from "../../orchestrator/interview_session.ts";
import { extractResumeExperiences, extractInterviewQuestions } from "../../orchestrator/text_extractors.ts";

test("MVP flow: resume -> experience_db -> candidate answer -> evaluate -> optional followups", () => {
  const resumeText = readFileSync("tests/fixtures/raw/resume_text.txt", "utf-8");
  const atomic = extractResumeExperiences(resumeText);

  const experienceDb = {
    experiences: atomic.map((x, i) => ({
      experience_id: `exp_mvp_${i + 1}`,
      company: x.module,
      role: x.module,
      project: x.scenario,
      actions: [x.action],
      metrics: x.result === "无" ? {} : { result: x.result }
    }))
  };

  const jobAnchor = { must_have: ["stability", "ownership"] };
  const qs = extractInterviewQuestions("Q: 你做过哪些稳定性优化？");
  assert.ok(qs.length > 0);

  const candidate = answerWithExperience(qs[0].raw_question, experienceDb as any, jobAnchor);
  const evaluation = evaluateAnswerLogic(qs[0].raw_question, candidate as any, experienceDb as any);

  assert.ok(candidate.direct_answer.length > 0);
  assert.ok(["HIGH", "MEDIUM", "LOW"].includes(candidate.confidence));
  assert.ok(["accept", "ask_followup", "request_user_supplement"].includes(evaluation.next_action));

  if (evaluation.confidence === "LOW" || evaluation.next_action !== "accept") {
    const followups = generateInterviewerFollowups(qs[0].raw_question, candidate as any, evaluation as any, jobAnchor);
    assert.ok(followups.length > 0);
  }
});
