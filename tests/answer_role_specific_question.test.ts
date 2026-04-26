import { describe, expect, it } from "vitest";
import { answerRoleSpecificQuestion } from "../orchestrator/role_specific_question";

describe("answer_role_specific_question", () => {
  it("移动端游戏交互设计减少误触", () => {
    const out = answerRoleSpecificQuestion({
      question: "在移动端游戏交互设计中，如何减少玩家误触？",
      job_anchor: { capability_focus: ["user_experience", "risk_control"] }
    });

    expect(out.question_type).toBe("role_specific");
    expect(out.explicit_test_points.length).toBeGreaterThan(0);
    expect(out.hidden_evaluation_dimensions.length).toBeGreaterThan(0);
    expect(out.answer_framework.steps.length).toBeGreaterThanOrEqual(5);
    expect(out.recommended_answer).toContain("定义问题");
    expect(out.recommended_answer).toContain("具体方案");
    expect(out.recommended_answer).toContain("验证");
    expect(out.recommended_answer).toContain("取舍");
    expect(out.optional_experience_hooks.length).toBe(0);
  });

  it("B端产品如何设计权限系统", () => {
    const out = answerRoleSpecificQuestion({
      question: "B 端产品如何设计权限系统？",
      job_anchor: { capability_focus: ["governance", "system_design"] }
    });

    expect(out.question_type).toBe("role_specific");
    expect(out.recommended_answer).toContain("RBAC");
    expect(out.recommended_answer).toContain("验证指标");
    expect(out.recommended_answer).toContain("取舍");
    expect(out.followup_questions.length).toBeGreaterThan(0);
  });

  it("商业化产品如何提升付费转化", () => {
    const out = answerRoleSpecificQuestion({
      question: "商业化产品如何提升付费转化？",
      job_anchor: { capability_focus: ["growth", "business_impact"] },
      optional_experience_db: [
        {
          experience_id: "exp_growth_01",
          project: "付费漏斗优化",
          actions: ["A/B实验", "支付链路优化"]
        }
      ]
    });

    expect(out.question_type).toBe("hybrid");
    expect(out.recommended_answer).toContain("问题");
    expect(out.recommended_answer).toContain("具体方案");
    expect(out.recommended_answer).toContain("验证指标");
    expect(out.recommended_answer).toContain("取舍");
    expect(out.optional_experience_hooks.length).toBeGreaterThan(0);
  });
});
