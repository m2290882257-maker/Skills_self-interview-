import { describe, expect, it } from "vitest";
import { refineAnswerWithSupplement } from "../orchestrator/refine_answer_with_supplement";

describe("refine_answer_with_supplement", () => {
  it("should append supplemental experience into experience_db and return refined answer", () => {
    const db: any[] = [];

    const out = refineAnswerWithSupplement({
      original_answer: "我主导了服务稳定性优化。",
      followup_question: "你当时怎么做取舍？",
      user_supplement: "模块: 稳定性\n核心动作: 调整重试策略\n场景: 高峰期超时\n结果: 错误率下降到0.3%\n标签: 稳定性, 取舍",
      experience_db: db
    });

    expect(out.updated_experience.source).toBe("supplemental");
    expect(out.updated_experience.hash_key.length).toBe(64);
    expect(db.length).toBe(1);
    expect(out.refined_answer).toContain("我主导了服务稳定性优化");
    expect(out.refined_answer).toContain("调整重试策略");
  });

  it("should set result=无 when supplement has no result", () => {
    const db: any[] = [];

    const out = refineAnswerWithSupplement({
      original_answer: "原回答",
      followup_question: "追问",
      user_supplement: "模块: 工程效率\n核心动作: 拆分构建步骤\n场景: CI 超时",
      experience_db: db
    });

    expect(out.updated_experience.result).toBe("无");
    expect(db[0].result).toBe("无");
  });
});
