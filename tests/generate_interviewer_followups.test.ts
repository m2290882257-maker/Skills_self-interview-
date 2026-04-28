import { describe, expect, it } from "vitest";
import cases from "./fixtures/generate_interviewer_followups.cases.json";

type PressureLevel = "low" | "medium" | "high";

describe("generate_interviewer_followups skill contract", () => {
  it("keeps followups count <= 2", () => {
    for (const c of cases) {
      expect(c.output.followups.length).toBeGreaterThan(0);
      expect(c.output.followups.length).toBeLessThanOrEqual(2);
    }
  });

  it("ensures required fields and enum values", () => {
    const validPressure: PressureLevel[] = ["low", "medium", "high"];

    for (const c of cases) {
      for (const f of c.output.followups) {
        expect(f.question.length).toBeGreaterThan(0);
        expect(f.intent.length).toBeGreaterThan(0);
        expect(f.expected_signal.length).toBeGreaterThan(0);
        expect(validPressure).toContain(f.pressure_level as PressureLevel);
      }
    }
  });

  it("prioritizes weak spans when present", () => {
    const weakCase = cases.find((c) => c.case === "weak_span_priority");
    expect((weakCase?.input.weak_spans.length ?? 0)).toBeGreaterThan(0);

    const firstQuestion = weakCase?.output.followups[0]?.question ?? "";
    expect(firstQuestion).toContain("效果不错");
  });

  it("uses interview-like style instead of teaching tone", () => {
    for (const c of cases) {
      const merged = c.output.followups.map((f) => f.question).join(" ");
      expect(merged).not.toContain("建议你");
      expect(merged).not.toContain("你可以这样回答");
    }
  });
});
