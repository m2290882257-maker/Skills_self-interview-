export type InputType = "jd" | "interview_questions" | "mixed";

export interface DetectInputTypeOutput {
  type: InputType;
}

const JD_PATTERNS = [
  /岗位职责|职位职责|职责描述/i,
  /任职要求|职位要求|资格要求/i,
  /我们希望你|你将负责|job description|responsibilities/i
];

const QUESTION_PATTERNS = [/[?？]/, /请|如何|为什么|讲一个|what|how|why/i];

export function detectInputType(text: string): DetectInputTypeOutput {
  const content = text.trim();
  const lines = content.split(/\n+/).map((x) => x.trim()).filter(Boolean);

  const jdHits = JD_PATTERNS.reduce((acc, p) => acc + (p.test(content) ? 1 : 0), 0);
  const questionLikeLines = lines.filter((line) => QUESTION_PATTERNS.some((p) => p.test(line))).length;

  const hasJd = jdHits > 0;
  const hasQuestions = questionLikeLines >= Math.max(1, Math.floor(lines.length * 0.3));

  if (hasJd && hasQuestions) return { type: "mixed" };
  if (hasJd) return { type: "jd" };
  return { type: "interview_questions" };
}

export function splitMixedInput(text: string): { jd_text: string; interview_questions_text: string } {
  const lines = text.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const jdLines: string[] = [];
  const qLines: string[] = [];

  for (const line of lines) {
    const isJdLine = JD_PATTERNS.some((p) => p.test(line));
    const isQuestionLine = QUESTION_PATTERNS.some((p) => p.test(line));
    if (isJdLine && !isQuestionLine) jdLines.push(line);
    else if (isQuestionLine) qLines.push(line);
    else jdLines.push(line);
  }

  return {
    jd_text: jdLines.join("\n"),
    interview_questions_text: qLines.join("\n")
  };
}
