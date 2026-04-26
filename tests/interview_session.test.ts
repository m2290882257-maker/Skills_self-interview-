import { describe, expect, it } from "vitest";
import {
  answerWithExperience,
  classifyQuestionType,
  routeQuestionType,
  runInterviewSession
} from "../orchestrator/interview_session";

describe("runInterviewSession", () => {
  it("high match experience should accept with no followups", async () => {
    const result = await runInterviewSession({
      experienceDbPath: "tests/fixtures/session/high_match.experience_db.json",
      questionQueuePath: "tests/fixtures/session/high_match.question_queue.json",
      jobAnchorPath: "tests/fixtures/session/high_match.job_anchor.json"
    });

    expect(result.candidate_answer.confidence).toBe("HIGH");
    expect(result.evaluation.next_action).toBe("accept");
    expect(result.followups.length).toBe(0);
  });

  it("weak match should trigger followups", async () => {
    const result = await runInterviewSession({
      experienceDbPath: "tests/fixtures/session/weak_match.experience_db.json",
      questionQueuePath: "tests/fixtures/session/weak_match.question_queue.json",
      jobAnchorPath: "tests/fixtures/session/weak_match.job_anchor.json"
    });

    expect(result.candidate_answer.confidence).toBe("LOW");
    expect(result.evaluation.next_action).toBe("request_user_supplement");
    expect(result.followups.length).toBeGreaterThan(0);
    expect(result.followups.length).toBeLessThanOrEqual(2);
  });

  it("missing result data should ask followup", async () => {
    const result = await runInterviewSession({
      experienceDbPath: "tests/fixtures/session/missing_result.experience_db.json",
      questionQueuePath: "tests/fixtures/session/missing_result.question_queue.json",
      jobAnchorPath: "tests/fixtures/session/missing_result.job_anchor.json"
    });

    expect(result.candidate_answer.confidence).toBe("MEDIUM");
    expect(result.evaluation.issues).toContain("缺少结果指标");
    expect(result.evaluation.next_action).toBe("ask_followup");
    expect(result.followups.length).toBeGreaterThan(0);
  });

  it("answer_with_experience should down-rank experiences not aligned with capability_focus", () => {
    const out = answerWithExperience(
      "请讲一个你做稳定性优化的案例",
      {
        experiences: [
          {
            experience_id: "exp_ui",
            company: "A",
            role: "Frontend Engineer",
            project: "landing page redesign",
            actions: ["优化首屏动画"],
            metrics: { fps: 60 }
          },
          {
            experience_id: "exp_sre",
            company: "B",
            role: "Backend Engineer",
            project: "stability governance",
            actions: ["优化重试策略", "降低超时率"],
            metrics: { timeout_rate: "0.3%" }
          }
        ]
      },
      {
        capability_focus: ["stability", "重试策略"]
      }
    );

    expect(out.used_experience_ids[0]).toBe("exp_sre");
    expect(out.confidence).not.toBe("LOW");
  });

  it("answer_with_experience should lower confidence when chosen experience misaligns capability_focus", () => {
    const out = answerWithExperience(
      "Tell me about your frontend performance optimization project",
      {
        experiences: [
          {
            experience_id: "exp_ui",
            company: "A",
            role: "Frontend Engineer",
            project: "frontend performance optimization",
            actions: ["优化首屏渲染", "减少 bundle 体积"],
            metrics: { lcp: "1.8s" }
          }
        ]
      },
      {
        capability_focus: ["stability", "incident handling"]
      }
    );

    expect(out.confidence).toBe("LOW");
    expect(out.risk_flags).toContain("经历与岗位 capability_focus 对齐不足");
  });

  it("question_types routing should match resume_based / role_specific / hybrid", () => {
    const q1 = "Can you walk through your project and your motivation for this role?";
    const q2 = "How would you design a B2B permission system with auditability?";
    const q3 = "How did you design the permission system in your last project?";

    expect(classifyQuestionType(q1)).toBe("resume_based");
    expect(classifyQuestionType(q2)).toBe("role_specific");
    expect(classifyQuestionType(q3)).toBe("hybrid");

    expect(routeQuestionType("resume_based")).toEqual(["answer_with_experience"]);
    expect(routeQuestionType("role_specific")).toEqual(["answer_role_specific_question"]);
    expect(routeQuestionType("hybrid")).toEqual([
      "answer_role_specific_question",
      "answer_with_experience"
    ]);
  });

  it("answer_with_experience should expose route_suggestion for role-specific questions", () => {
    const out = answerWithExperience(
      "How would you design a B2B permission system with auditability?",
      {
        experiences: [
          {
            experience_id: "exp_1",
            project: "backend refactor",
            actions: ["service split"]
          }
        ]
      },
      { capability_focus: ["system_design"] }
    );

    expect(out.route_suggestion).toBe("answer_role_specific_question");
  });
});
