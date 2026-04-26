import { describe, expect, it } from "vitest";
import cases from "./fixtures/evaluate_answer_logic.cases.json";

type Confidence = "HIGH" | "MEDIUM" | "LOW";
type Severity = "low" | "medium" | "high";
type NextAction = "accept" | "ask_followup" | "request_user_supplement";

describe("evaluate_answer_logic skill contract", () => {
  it("checks score range 1-5", () => {
    for (const c of cases) {
      const s = c.output.score;
      for (const v of [s.relevance, s.authenticity, s.structure, s.impact]) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(5);
      }
    }
  });

  it("checks enum fields", () => {
    const validConfidence: Confidence[] = ["HIGH", "MEDIUM", "LOW"];
    const validSeverity: Severity[] = ["low", "medium", "high"];
    const validAction: NextAction[] = ["accept", "ask_followup", "request_user_supplement"];

    for (const c of cases) {
      expect(validConfidence).toContain(c.output.confidence as Confidence);
      expect(validAction).toContain(c.output.next_action as NextAction);
      for (const span of c.output.highlight_spans) {
        expect(validSeverity).toContain(span.severity as Severity);
      }
    }
  });

  it("requires high severity for fabricated facts", () => {
    const fabricated = cases.find((c) => c.case === "request_user_supplement");
    expect(fabricated?.output.highlight_spans[0]?.severity).toBe("high");
    expect(fabricated?.output.next_action).toBe("request_user_supplement");
  });

  it("uses ask_followup when answer can be strengthened by questioning", () => {
    const followup = cases.find((c) => c.case === "ask_followup");
    expect(followup?.output.next_action).toBe("ask_followup");
    expect(followup?.output.issues).toContain("缺少结果指标");
  });
});
