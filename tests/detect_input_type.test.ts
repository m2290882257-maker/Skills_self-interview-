import { describe, expect, it } from "vitest";
import { detectInputType, splitMixedInput } from "../orchestrator/detect_input_type";

describe("detect_input_type", () => {
  it("should classify jd text", () => {
    const out = detectInputType("岗位职责：负责系统设计\n任职要求：3年以上经验");
    expect(out.type).toBe("jd");
  });

  it("should classify interview questions", () => {
    const out = detectInputType("你做过哪些稳定性优化？\n为什么这样设计？");
    expect(out.type).toBe("interview_questions");
  });

  it("should classify mixed and split", () => {
    const text = "岗位职责：负责核心系统\n任职要求：沟通协作\n你做过哪些稳定性优化？";
    const out = detectInputType(text);
    expect(out.type).toBe("mixed");

    const split = splitMixedInput(text);
    expect(split.jd_text).toContain("岗位职责");
    expect(split.interview_questions_text).toContain("稳定性优化");
  });
});
