import test from "node:test";
import assert from "node:assert/strict";
import {
  buildExperienceDbFromResume,
  buildJobAnchorFromJd,
  buildQuestionQueueFromInterview,
  generateIntroAnswer,
  runInterviewTraining
} from "../../orchestrator/mvp_flow.ts";

test("MVP Flow & Information Architecture: data flow + training route", () => {
  const resume = "项目: 订单系统\n核心动作: 优化重试策略\n结果: 超时率下降30%";
  const jd = "岗位职责：负责系统设计与稳定性优化\n任职要求：跨团队协作";
  const interview = "你做过哪些稳定性优化？\n讲一个你做架构取舍的案例？";

  const experience_db = buildExperienceDbFromResume(resume);
  const job_anchor = buildJobAnchorFromJd(jd);
  const question_queue = buildQuestionQueueFromInterview(interview);

  assert.ok(experience_db.experiences.length > 0);
  assert.ok((job_anchor.capability_focus ?? []).length > 0);
  assert.ok(question_queue.questions.length > 0);

  const intro = generateIntroAnswer({ experience_db, job_anchor });
  assert.ok(intro.intro_answer.length > 0);

  const session = runInterviewTraining({
    question: question_queue.questions[0].text,
    experience_db,
    job_anchor
  });

  assert.ok(["resume_based", "role_specific", "hybrid"].includes(session.question_type ?? ""));
  assert.ok(Array.isArray(session.route_to) && session.route_to.length > 0);
  assert.ok(session.candidate_answer.direct_answer.length > 0);
});
