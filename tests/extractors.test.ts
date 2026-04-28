import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ParsedDocument } from "../src/document-parser/types";
import {
  extractInterviewQuestions,
  extractQuestionsFromFile,
  extractResumeExperiences,
  extractResumeFromFile
} from "../orchestrator/text_extractors";

describe("text extractors", () => {
  it("extract_resume_experiences should output atomic experiences and result=无 when missing", () => {
    const text = readFileSync("tests/fixtures/raw/resume_text.txt", "utf-8");
    const exps = extractResumeExperiences(text);

    expect(exps.length).toBeGreaterThan(1);
    expect(exps[0].source).toBe("resume");
    expect(exps[0].hash_key.length).toBe(64);
    expect(exps.some((x) => x.result === "无")).toBe(true);
  });

  it("extract_interview_questions should only extract question-like lines and confirmed=false", () => {
    const text = readFileSync("tests/fixtures/raw/questions_text.txt", "utf-8");
    const qs = extractInterviewQuestions(text);

    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.confirmed).toBe(false);
      expect(["P0", "P1", "P2"]).toContain(q.priority);
      expect(q.raw_question.length).toBeGreaterThan(0);
      expect(q.normalized_question.length).toBeGreaterThan(0);
    }
  });


  it("extract_interview_questions should drop pure JD input", () => {
    const jdText = "岗位职责：负责系统设计\n任职要求：3年以上经验";
    const qs = extractInterviewQuestions(jdText);
    expect(qs.length).toBe(0);
  });

  it("extract_interview_questions should strip JD content when mixed", () => {
    const mixed = "岗位职责：负责系统设计\n任职要求：沟通协作\n你做过哪些稳定性优化？";
    const qs = extractInterviewQuestions(mixed);
    expect(qs.length).toBe(1);
    expect(qs[0].raw_question).toContain("稳定性优化");
  });

  it("extractResumeFromFile should use parseDocument -> normalizedText -> skill", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "extract-wrapper-"));
    const file = path.join(dir, "resume.txt");
    writeFileSync(file, "岗位: Engineer\n项目: parser\n核心动作: build parser\n", "utf-8");

    const result = await extractResumeFromFile(file);
    expect(result.experiences.length).toBe(1);
    expect(result.experiences[0].action).toBe("build parser");

    rmSync(dir, { recursive: true, force: true });
  });

  it("extractQuestionsFromFile should parse normalized text and keep confirmed=false", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "extract-wrapper-"));
    const file = path.join(dir, "questions.txt");
    writeFileSync(file, "Q: Why did you pick this design?\n", "utf-8");

    const result = await extractQuestionsFromFile(file);
    expect(result.questions.length).toBe(1);
    expect(result.questions[0].confirmed).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });

  it("extractQuestionsFromFile can validate pdf/docx parser output chain via parser injection", async () => {
    const fakeDocxParser = async (): Promise<ParsedDocument> => ({
      fileName: "x.docx",
      fileType: "docx",
      rawText: "Q: Why this architecture?",
      normalizedText: "Q: Why this architecture?",
      metadata: { charCount: 24, parser: "mammoth", wordCount: 4 },
      warnings: []
    });

    const fakePdfParser = async (): Promise<ParsedDocument> => ({
      fileName: "x.pdf",
      fileType: "pdf",
      rawText: "讲一个你做性能优化的案例？",
      normalizedText: "讲一个你做性能优化的案例？",
      metadata: { charCount: 13, parser: "unpdf", wordCount: 1, pageCount: 1 },
      warnings: []
    });

    const fromDocx = await extractQuestionsFromFile("dummy.docx", fakeDocxParser);
    const fromPdf = await extractQuestionsFromFile("dummy.pdf", fakePdfParser);

    expect(fromDocx.questions[0].raw_question).toContain("Why");
    expect(fromPdf.questions[0].raw_question).toContain("性能优化");
    expect(fromDocx.questions[0].confirmed).toBe(false);
    expect(fromPdf.questions[0].confirmed).toBe(false);
  });
});
