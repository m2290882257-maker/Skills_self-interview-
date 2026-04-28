import { describe, expect, it } from "vitest";
import cases from "./fixtures/answer_with_experience.cases.json";

type Confidence = "HIGH" | "MEDIUM" | "LOW";
type RouteSuggestion = "answer_with_experience" | "answer_role_specific_question" | "hybrid";
type SuggestionType =
  | "framing"
  | "beautification"
  | "transition"
  | "admission"
  | "supplement_needed";

describe("answer_with_experience skill cases", () => {
  it("covers normal/weak/insufficient scenarios", () => {
    const caseNames = cases.map((c) => c.case);
    expect(caseNames).toEqual(["normal_match", "weak_match", "insufficient_info"]);
  });

  it("enforces first-person direct answer and required output fields", () => {
    for (const c of cases) {
      expect(c.output.direct_answer.length).toBeGreaterThan(0);
      expect([
        "answer_with_experience",
        "answer_role_specific_question",
        "hybrid"
      ]).toContain(c.output.route_suggestion as RouteSuggestion);
      expect(c.output.coaching_answer.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(c.output.confidence as Confidence);
      expect(Array.isArray(c.output.used_experience_ids)).toBe(true);
      expect(Array.isArray(c.output.risk_flags)).toBe(true);
      expect(Array.isArray(c.output.weak_spans)).toBe(true);
      expect(Array.isArray(c.output.answer_suggestions)).toBe(true);
    }
  });

  it("requires LOW confidence for weak and insufficient cases", () => {
    const weak = cases.find((c) => c.case === "weak_match");
    const insufficient = cases.find((c) => c.case === "insufficient_info");

    expect(weak?.output.confidence).toBe("LOW");
    expect(insufficient?.output.confidence).toBe("LOW");
    expect((weak?.output.weak_spans.length ?? 0)).toBeGreaterThan(0);
    expect((insufficient?.output.weak_spans.length ?? 0)).toBeGreaterThan(0);
  });

  it("validates suggestion type and risk level enums", () => {
    const validTypes: SuggestionType[] = [
      "framing",
      "beautification",
      "transition",
      "admission",
      "supplement_needed"
    ];
    const validRisks = ["low", "medium", "high"];

    for (const c of cases) {
      for (const s of c.output.answer_suggestions) {
        expect(validTypes).toContain(s.type as SuggestionType);
        expect(validRisks).toContain(s.risk_level);
      }
    }
  });
});
