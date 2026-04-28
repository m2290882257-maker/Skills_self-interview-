import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import {
  answerWithExperience,
  classifyQuestionType,
  evaluateAnswerLogic,
  routeQuestionType,
  runInterviewSession
} from "../orchestrator/interview_session.ts";
import { answerRoleSpecificQuestion } from "../orchestrator/role_specific_question.ts";

test("high match experience should accept with no followups", async () => {
  const result = await runInterviewSession({
    experienceDbPath: "tests/fixtures/session/high_match.experience_db.json",
    questionQueuePath: "tests/fixtures/session/high_match.question_queue.json",
    jobAnchorPath: "tests/fixtures/session/high_match.job_anchor.json"
  });

  assert.equal(result.candidate_answer.confidence, "HIGH");
  assert.equal(result.evaluation.next_action, "accept");
  assert.equal(result.followups.length, 0);
});

test("weak match should trigger followups", async () => {
  const result = await runInterviewSession({
    experienceDbPath: "tests/fixtures/session/weak_match.experience_db.json",
    questionQueuePath: "tests/fixtures/session/weak_match.question_queue.json",
    jobAnchorPath: "tests/fixtures/session/weak_match.job_anchor.json"
  });

  assert.equal(result.candidate_answer.confidence, "LOW");
  assert.equal(result.evaluation.next_action, "request_user_supplement");
  assert.ok(result.followups.length > 0);
  assert.ok(result.followups.length <= 2);
});

test("missing result data should ask followup", async () => {
  const result = await runInterviewSession({
    experienceDbPath: "tests/fixtures/session/missing_result.experience_db.json",
    questionQueuePath: "tests/fixtures/session/missing_result.question_queue.json",
    jobAnchorPath: "tests/fixtures/session/missing_result.job_anchor.json"
  });

  assert.equal(result.candidate_answer.confidence, "MEDIUM");
  assert.ok(result.evaluation.issues.includes("缺少结果指标"));
  assert.equal(result.evaluation.next_action, "ask_followup");
  assert.ok(result.followups.length > 0);
});

test("answer_with_experience should down-rank experiences not aligned with capability_focus", () => {
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

  assert.equal(out.used_experience_ids[0], "exp_sre");
  assert.notEqual(out.confidence, "LOW");
});

test("answer_with_experience should lower confidence when chosen experience misaligns capability_focus", () => {
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

  assert.equal(out.confidence, "LOW");
  assert.ok(out.risk_flags.includes("经历与岗位 capability_focus 对齐不足"));
});

test("answer_with_experience should match Chinese question and resume chunks", () => {
  const out = answerWithExperience(
    "你做过哪些稳定性优化？",
    {
      experiences: [
        {
          experience_id: "exp_cn_1",
          company: "某电商",
          role: "后端工程师",
          project: "稳定性治理",
          actions: ["优化重试策略", "降低超时率"],
          metrics: { timeout_rate: "0.2%" }
        },
        {
          experience_id: "exp_cn_2",
          company: "某内容平台",
          role: "前端工程师",
          project: "活动页改版",
          actions: ["优化首屏动画"],
          metrics: { fps: 60 }
        }
      ]
    },
    {
      capability_focus: ["稳定性", "重试策略"]
    }
  );

  assert.equal(out.used_experience_ids[0], "exp_cn_1");
  assert.notEqual(out.confidence, "LOW");
});

test("runInterviewSession role_specific should inherit optional_experience_hooks as used_experience_ids", async () => {
  const dir = await mkdtemp(join(tmpdir(), "session-role-specific-"));
  const expPath = join(dir, "exp.json");
  const qPath = join(dir, "q.json");
  const anchorPath = join(dir, "anchor.json");

  await writeFile(
    expPath,
    JSON.stringify({
      experiences: [
        {
          experience_id: "exp_perm_1",
          company: "X",
          role: "Backend Engineer",
          project: "权限系统改造",
          actions: ["设计 RBAC", "补齐审计日志"]
        }
      ]
    })
  );

  await writeFile(
    qPath,
    JSON.stringify({
      questions: [
        {
          question_id: "q1",
          text: "你会如何设计一个可审计的权限系统？",
          confirmed: true
        }
      ]
    })
  );

  await writeFile(
    anchorPath,
    JSON.stringify({
      must_have: ["权限模型"],
      capability_focus: ["权限", "审计"]
    })
  );

  const result = await runInterviewSession({
    experienceDbPath: expPath,
    questionQueuePath: qPath,
    jobAnchorPath: anchorPath
  });

  assert.equal(result.question_type, "role_specific");
  assert.ok(result.candidate_answer.used_experience_ids.includes("exp_perm_1"));
  assert.ok(["MEDIUM", "LOW"].includes(result.candidate_answer.confidence));
});



test("role_specific hooks should flow into used_experience_ids and avoid direct evidence-missing penalty", () => {
  const question = "你会如何设计一个可审计的权限系统？";
  const roleSpecific = answerRoleSpecificQuestion({
    question,
    job_anchor: { capability_focus: ["权限", "审计"] },
    optional_experience_db: [
      {
        experience_id: "exp_perm_hook",
        company: "X",
        role: "Backend Engineer",
        project: "权限系统改造",
        actions: ["设计 RBAC", "补齐审计日志"]
      }
    ]
  });

  const usedExperienceIds = roleSpecific.optional_experience_hooks.map((hook) => hook.experience_id);
  const candidateAnswer = {
    route_suggestion: "answer_role_specific_question" as const,
    direct_answer: roleSpecific.recommended_answer,
    coaching_answer: roleSpecific.answer_framework.formula,
    used_experience_ids: usedExperienceIds,
    confidence: (usedExperienceIds.length > 0 ? "MEDIUM" : "LOW") as const,
    risk_flags: roleSpecific.risk_notes,
    weak_spans: [],
    answer_suggestions: []
  };

  const evaluation = evaluateAnswerLogic(question, candidateAnswer, {
    experiences: [
      {
        experience_id: "exp_perm_hook",
        company: "X",
        role: "Backend Engineer",
        project: "权限系统改造",
        actions: ["设计 RBAC", "补齐审计日志"]
      }
    ]
  });

  assert.ok(usedExperienceIds.includes("exp_perm_hook"));
  assert.ok(!evaluation.issues.includes("与经历库直接匹配不足"));
  assert.notEqual(evaluation.confidence, "LOW");
});

test("question_types routing should match resume_based / role_specific / hybrid", () => {
  const q1 = "Can you walk through your project and your motivation for this role?";
  const q2 = "How would you design a B2B permission system with auditability?";
  const q3 = "How did you design the permission system in your last project?";

  assert.equal(classifyQuestionType(q1), "resume_based");
  assert.equal(classifyQuestionType(q2), "role_specific");
  assert.equal(classifyQuestionType(q3), "hybrid");

  assert.deepEqual(routeQuestionType("resume_based"), ["answer_with_experience"]);
  assert.deepEqual(routeQuestionType("role_specific"), ["answer_role_specific_question"]);
  assert.deepEqual(routeQuestionType("hybrid"), ["answer_role_specific_question", "answer_with_experience"]);
});

test("answer_with_experience should expose route_suggestion for role-specific questions", () => {
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

  assert.equal(out.route_suggestion, "answer_role_specific_question");
