import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  answerWithExperience,
  evaluateAnswerLogic,
  generateInterviewerFollowups
} from "../orchestrator/interview_session.ts";
import { extractInterviewQuestions, extractResumeExperiences } from "../orchestrator/text_extractors.ts";

async function main() {
  const [resumeText, interviewText, jobAnchorRaw] = await Promise.all([
    readFile("examples/resume.txt", "utf-8"),
    readFile("examples/interview_questions.txt", "utf-8"),
    readFile("examples/job_anchor.json", "utf-8")
  ]);

  const jobAnchor = JSON.parse(jobAnchorRaw);
  const experiences = extractResumeExperiences(resumeText);
  const questions = extractInterviewQuestions(interviewText);

  const experienceDb = {
    experiences: experiences.map((x, i) => ({
      experience_id: `exp_manual_${i + 1}`,
      company: x.module,
      role: x.module,
      project: x.scenario,
      actions: [x.action],
      metrics: x.result === "无" ? {} : { result: x.result }
    }))
  };

  const qaResults = questions.map((q) => {
    const candidate = answerWithExperience(q.raw_question, experienceDb as any, jobAnchor as any);
    const evaluation = evaluateAnswerLogic(q.raw_question, candidate as any, experienceDb as any);
    const followups =
      evaluation.confidence === "LOW" || evaluation.next_action !== "accept"
        ? generateInterviewerFollowups(q.raw_question, candidate as any, evaluation as any, jobAnchor as any)
        : [];

    return {
      question: q,
      candidate_answer: candidate,
      evaluation,
      interviewer_followups: followups
    };
  });

  const result = {
    generated_at: new Date().toISOString(),
    extracted_experiences: experiences,
    extracted_questions: questions,
    qa_results: qaResults
  };

  await mkdir("outputs", { recursive: true });
  await writeFile("outputs/manual_mvp_result.json", JSON.stringify(result, null, 2), "utf-8");

  const mdParts: string[] = [];
  mdParts.push("# Manual MVP Test Result");
  mdParts.push(`Generated at: ${result.generated_at}`);

  mdParts.push("\n## 1) 提取出的经历\n");
  experiences.forEach((e, idx) => {
    mdParts.push(`### Experience ${idx + 1}`);
    mdParts.push(`- module: ${e.module}`);
    mdParts.push(`- action: ${e.action}`);
    mdParts.push(`- scenario: ${e.scenario}`);
    mdParts.push(`- result: ${e.result}`);
    mdParts.push(`- tags: ${e.tags.join(", ")}`);
    mdParts.push(`- hash_key: ${e.hash_key}`);
  });

  mdParts.push("\n## 2) 提取出的问题\n");
  questions.forEach((q, idx) => {
    mdParts.push(`### Question ${idx + 1}`);
    mdParts.push(`- raw_question: ${q.raw_question}`);
    mdParts.push(`- normalized_question: ${q.normalized_question}`);
    mdParts.push(`- category: ${q.category}`);
    mdParts.push(`- confirmed: ${q.confirmed}`);
    mdParts.push(`- priority: ${q.priority}`);
  });

  mdParts.push("\n## 3) 推荐回答与评估\n");
  qaResults.forEach((r, idx) => {
    mdParts.push(`### QA ${idx + 1}: ${r.question.raw_question}`);
    mdParts.push("#### 推荐回答 (direct_answer)");
    mdParts.push(r.candidate_answer.direct_answer || "无");
    mdParts.push("\n#### coaching_answer");
    mdParts.push(r.candidate_answer.coaching_answer || "无");
    mdParts.push("\n#### confidence");
    mdParts.push(r.candidate_answer.confidence || "无");

    mdParts.push("\n#### weak_spans");
    if (r.candidate_answer.weak_spans.length === 0) {
      mdParts.push("- 无");
    } else {
      r.candidate_answer.weak_spans.forEach((w) => mdParts.push(`- ${w.text} (${w.reason})`));
    }

    mdParts.push("\n#### answer_suggestions");
    if (r.candidate_answer.answer_suggestions.length === 0) {
      mdParts.push("- 无");
    } else {
      r.candidate_answer.answer_suggestions.forEach((s) =>
        mdParts.push(`- [${s.type}/${s.risk_level}] ${s.text} (${s.reason})`)
      );
    }

    mdParts.push("\n#### interviewer followups");
    if (r.interviewer_followups.length === 0) {
      mdParts.push("- 无");
    } else {
      r.interviewer_followups.forEach((f) =>
        mdParts.push(`- (${f.pressure_level}) ${f.question} | intent: ${f.intent} | signal: ${f.expected_signal}`)
      );
    }
  });

  await writeFile("outputs/manual_mvp_result.md", mdParts.join("\n"), "utf-8");
  console.log("Manual MVP test completed:");
  console.log("- outputs/manual_mvp_result.json");
  console.log("- outputs/manual_mvp_result.md");
}

main().catch((err) => {
  console.error("manual_mvp_test failed", err);
  process.exit(1);
});
