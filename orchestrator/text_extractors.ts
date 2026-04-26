import crypto from "node:crypto";
import { parseDocument } from "../src/document-parser/index.ts";
import type { ParsedDocument } from "../src/document-parser/types.ts";
import { detectInputType, splitMixedInput } from "./detect_input_type.ts";

export interface ResumeExperienceAtom {
  module: string;
  action: string;
  scenario: string;
  result: string;
  source: "resume";
  tags: string[];
  hash_key: string;
}

export interface InterviewQuestionCandidate {
  raw_question: string;
  normalized_question: string;
  category: string;
  confirmed: false;
  priority: "P0" | "P1" | "P2";
}

const splitBlocks = (input: string): string[] =>
  input
    .split(/\n\s*\n/g)
    .map((b) => b.trim())
    .filter(Boolean);

const readField = (block: string, labels: string[]): string => {
  for (const label of labels) {
    const reg = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:：]\\s*(.+)`, "i");
    const match = block.match(reg);
    if (match?.[1]) return match[1].trim();
  }
  return "无";
};

const parseList = (raw: string): string[] => {
  if (!raw || raw === "无") return ["无"];
  const items = raw
    .split(/[;,，；]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [raw.trim()];
};

const hashKey = (action: string, scenario: string): string =>
  crypto.createHash("sha256").update(`${action}::${scenario}`).digest("hex");

// 核心 skill：仅接收纯文本。
export function extractResumeExperiences(resumeText: string): ResumeExperienceAtom[] {
  const blocks = splitBlocks(resumeText);

  return blocks.flatMap((block) => {
    const moduleName = readField(block, ["module", "模块", "能力模块", "岗位"]);
    const scenario = readField(block, ["scenario", "场景", "项目", "项目背景"]);
    const result = readField(block, ["result", "结果", "产出"]);
    const tags = parseList(readField(block, ["tags", "标签"]));
    const actions = parseList(readField(block, ["action", "行动", "职责", "核心动作"]));

    return actions.map((action) => ({
      module: moduleName || "无",
      action: action || "无",
      scenario: scenario || "无",
      result: result || "无",
      source: "resume" as const,
      tags,
      hash_key: hashKey(action || "无", scenario || "无")
    }));
  });
}

const normalizeQuestion = (q: string): string =>
  q
    .replace(/^[-*\d.\)\s]*(Q[:：]\s*)?/i, "")
    .replace(/[?？]+$/g, "")
    .trim();

const inferCategory = (q: string): string => {
  if (/(系统设计|架构|高并发|扩展性|scalability|design)/i.test(q)) return "system_design";
  if (/(项目|经历|case|example|讲一个)/i.test(q)) return "experience";
  if (/(冲突|协作|沟通|team|collaboration)/i.test(q)) return "collaboration";
  if (/(性能|稳定性|故障|latency|stability)/i.test(q)) return "engineering";
  return "general";
};

const inferPriority = (q: string): "P0" | "P1" | "P2" => {
  if (/(系统设计|架构|高并发|why|how)/i.test(q)) return "P0";
  if (/(优化|tradeoff|取舍|复盘|稳定性|性能)/i.test(q)) return "P1";
  return "P2";
};

const looksLikeQuestion = (line: string): boolean =>
  /[?？]$/.test(line) || /请|如何|为什么|讲一个|what|how|why/i.test(line);

// 核心 skill：仅接收纯文本。
export function extractInterviewQuestions(interviewText: string): InterviewQuestionCandidate[] {
  const detected = detectInputType(interviewText);

  if (detected.type === "jd") {
    // 输入必须是 interview_questions 类型，纯 JD 直接返回空问题集合。
    return [];
  }

  const questionText =
    detected.type === "mixed" ? splitMixedInput(interviewText).interview_questions_text : interviewText;

  const lines = questionText
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter(looksLikeQuestion);

  const dedupedRaw = Array.from(new Set(lines));

  return dedupedRaw.map((raw) => {
    const normalized = normalizeQuestion(raw);
    return {
      raw_question: raw,
      normalized_question: normalized || "无",
      category: inferCategory(raw),
      confirmed: false as const,
      priority: inferPriority(raw)
    };
  });
}

// Wrapper: filePath -> parseDocument -> normalizedText -> extractResumeExperiences
export async function extractResumeFromFile(
  filePath: string,
  parser: (path: string) => Promise<ParsedDocument> = parseDocument
): Promise<{
  experiences: ResumeExperienceAtom[];
  warnings: string[];
}> {
  const parsed = await parser(filePath);
  return {
    experiences: extractResumeExperiences(parsed.normalizedText),
    warnings: parsed.warnings
  };
}

// Wrapper: filePath -> parseDocument -> normalizedText -> extractInterviewQuestions
export async function extractQuestionsFromFile(
  filePath: string,
  parser: (path: string) => Promise<ParsedDocument> = parseDocument
): Promise<{
  questions: InterviewQuestionCandidate[];
  warnings: string[];
}> {
  const parsed = await parser(filePath);
  return {
    questions: extractInterviewQuestions(parsed.normalizedText),
    warnings: parsed.warnings
  };
}
