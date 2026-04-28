import test from "node:test";
import assert from "node:assert/strict";
import {
  answerWithExperience,
  evaluateAnswerLogic,
  generateInterviewerFollowups
} from "../../orchestrator/interview_session.ts";

test("MVP flow: weak match must not be HIGH and must generate followups", () => {
  const question = "你在移动端游戏中如何减少玩家误触？";
  const experienceDb = {
    experiences: [
      {
        experience_id: "exp_1",
        company: "Data Ops",
        role: "Analyst",
        project: "BI dashboard",
        actions: ["build report"],
        metrics: {}
      }
    ]
  };

  const jobAnchor = { must_have: ["mobile game UX"] };
  const candidate = answerWithExperience(question, experienceDb as any, jobAnchor);

  assert.notEqual(candidate.confidence, "HIGH");
  assert.ok(candidate.weak_spans.length > 0);
  assert.ok(candidate.answer_suggestions.length > 0);

  const evaluation = evaluateAnswerLogic(question, candidate as any, experienceDb as any);
  const followups = generateInterviewerFollowups(question, candidate as any, evaluation as any, jobAnchor);
  assert.ok(followups.length > 0);
});
