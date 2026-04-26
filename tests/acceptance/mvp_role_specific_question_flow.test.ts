import test from "node:test";
import assert from "node:assert/strict";
import { buildRoleSpecificQuestionGuidance } from "../../orchestrator/role_specific_question.ts";

test("MVP flow: role-specific question should return required coaching structure", () => {
  const out = buildRoleSpecificQuestionGuidance("在移动端游戏中如何减少玩家误触？", {
    must_have: ["用户体验", "风险控制"],
    nice_to_have: ["数据驱动复盘"]
  });

  assert.ok(Array.isArray(out.explicit_test_points) && out.explicit_test_points.length > 0);
  assert.ok(Array.isArray(out.hidden_evaluation_dimensions) && out.hidden_evaluation_dimensions.length > 0);
  assert.ok(Array.isArray(out.answer_framework) && out.answer_framework.length > 0);
  assert.ok(typeof out.recommended_answer === "string" && out.recommended_answer.length > 0);
  assert.equal(out.warnings.length, 0);
});

test("MVP flow: role-specific question should output warning when job_anchor missing", () => {
  const out = buildRoleSpecificQuestionGuidance("在移动端游戏中如何减少玩家误触？");
  assert.ok(out.warnings.includes("job_anchor_missing"));
});
