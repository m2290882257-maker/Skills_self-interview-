import test from "node:test";
import assert from "node:assert/strict";
import { detectInputType, splitMixedInput } from "../../orchestrator/detect_input_type.ts";
import { extractJobAnchorFromJd } from "../../orchestrator/job_anchor_extractor.ts";
import { extractInterviewQuestions } from "../../orchestrator/text_extractors.ts";

test("JD + interview mixed input should be separated into job_anchor and question_queue", () => {
  const mixedInput = [
    "岗位职责：负责高并发系统设计与稳定性优化",
    "任职要求：具备跨团队协作能力",
    "你做过哪些稳定性优化？",
    "讲一个你做架构取舍的案例？"
  ].join("\n");

  const detected = detectInputType(mixedInput);
  assert.equal(detected.type, "mixed");

  const split = splitMixedInput(mixedInput);
  assert.ok(split.jd_text.includes("岗位职责"));
  assert.ok(split.interview_questions_text.includes("稳定性优化？"));

  const jobAnchor = extractJobAnchorFromJd(split.jd_text);
  assert.ok(jobAnchor.capability_focus.length > 0);
  assert.ok(jobAnchor.job_tags.length > 0);

  const questionQueue = extractInterviewQuestions(split.interview_questions_text);
  assert.equal(questionQueue.length, 2);
  assert.ok(questionQueue.every((q) => !q.raw_question.includes("岗位职责")));
  assert.ok(questionQueue.every((q) => !q.raw_question.includes("任职要求")));

  // JD 只能进入 job_anchor，不应进入问题队列
  assert.equal(extractInterviewQuestions(split.jd_text).length, 0);
});
