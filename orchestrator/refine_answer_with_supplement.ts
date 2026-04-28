import crypto from "node:crypto";

export interface SupplementalExperience {
  module: string;
  action: string;
  scenario: string;
  result: string;
  source: "supplemental";
  tags: string[];
  hash_key: string;
}

export interface RefineAnswerInput {
  original_answer: string;
  followup_question: string;
  user_supplement: string;
  experience_db: SupplementalExperience[];
}

export interface RefineAnswerOutput {
  updated_experience: SupplementalExperience;
  refined_answer: string;
}

const readSegment = (text: string, labels: string[]): string => {
  for (const label of labels) {
    const reg = new RegExp(`(?:^|\\n)\\s*${label}\\s*[:：]\\s*(.+)`, "i");
    const m = text.match(reg);
    if (m?.[1]) return m[1].trim();
  }
  return "无";
};

const parseTags = (raw: string): string[] => {
  if (!raw || raw === "无") return ["无"];
  const tags = raw
    .split(/[;,，；]/)
    .map((x) => x.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : ["无"];
};

const hashKey = (action: string, scenario: string): string =>
  crypto.createHash("sha256").update(`${action}::${scenario}`).digest("hex");

export function refineAnswerWithSupplement(input: RefineAnswerInput): RefineAnswerOutput {
  const moduleValue = readSegment(input.user_supplement, ["module", "模块", "能力模块"]);
  const actionValue = readSegment(input.user_supplement, ["action", "动作", "核心动作"]);
  const scenarioValue = readSegment(input.user_supplement, ["scenario", "场景", "背景"]);
  const resultValue = readSegment(input.user_supplement, ["result", "结果", "产出"]);
  const tagsValue = parseTags(readSegment(input.user_supplement, ["tags", "标签"]));

  const updated_experience: SupplementalExperience = {
    module: moduleValue || "无",
    action: actionValue || "无",
    scenario: scenarioValue || "无",
    result: resultValue || "无",
    source: "supplemental",
    tags: tagsValue,
    hash_key: hashKey(actionValue || "无", scenarioValue || "无")
  };

  // 必须写回 experience_db
  input.experience_db.push(updated_experience);

  const refined_answer = [
    input.original_answer.trim(),
    `补充回应“${input.followup_question.trim()}”：${input.user_supplement.trim()}`
  ]
    .filter(Boolean)
    .join("\n");

  return {
    updated_experience,
    refined_answer
  };
}
