import { describe, expect, it } from "vitest";
import { extractJobAnchorFromJd } from "../orchestrator/job_anchor_extractor";

describe("extract_job_anchor_from_jd", () => {
  it("should extract explicit and hidden requirements from JD text", () => {
    const jd = `
      我们招聘资深后端工程师，负责高并发系统架构与稳定性优化。
      需要跨团队沟通协作，具备 owner 意识，结果导向。
      快节奏环境下推动项目落地。
    `;

    const out = extractJobAnchorFromJd(jd);

    expect(out.job_tags).toContain("backend");
    expect(out.capability_focus).toContain("system_design");
    expect(out.hidden_requirements.length).toBeGreaterThan(0);
    expect(out.answer_style.length).toBeGreaterThan(0);
  });

  it("should fallback to defaults when JD is generic", () => {
    const out = extractJobAnchorFromJd("负责日常开发工作");
    expect(out.job_tags.length).toBeGreaterThan(0);
    expect(out.capability_focus.length).toBeGreaterThan(0);
    expect(out.hidden_requirements.length).toBeGreaterThan(0);
  });
});
