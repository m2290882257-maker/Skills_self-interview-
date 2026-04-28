export interface JobAnchorFromJdOutput {
  job_tags: string[];
  target_role: string;
  capability_focus: string[];
  hidden_requirements: string[];
  answer_style: string;
}

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

export function extractJobAnchorFromJd(jd_text: string): JobAnchorFromJdOutput {
  const text = jd_text.trim();
  const lower = text.toLowerCase();

  const job_tags: string[] = [];
  if (/(后端|backend|java|golang|node)/i.test(text)) job_tags.push("backend");
  if (/(前端|frontend|react|vue|web)/i.test(text)) job_tags.push("frontend");
  if (/(移动端|android|ios|mobile)/i.test(text)) job_tags.push("mobile");
  if (/(游戏|game)/i.test(text)) job_tags.push("game");
  if (/(数据|data|sql|分析)/i.test(text)) job_tags.push("data");
  if (/(架构|system design|分布式|高并发)/i.test(text)) job_tags.push("system_design");
  if (/(沟通|协作|cross-functional|cross-team)/i.test(text)) job_tags.push("collaboration");
  if (/(owner|ownership|负责|主导)/i.test(text)) job_tags.push("ownership");

  let target_role = "general_engineer";
  if (/(senior|资深)/i.test(text)) target_role = "senior_engineer";
  if (/(staff|专家)/i.test(text)) target_role = "staff_engineer";
  if (/(manager|管理|负责人)/i.test(text)) target_role = "engineering_manager";
  if (/(product manager|产品经理)/i.test(text)) target_role = "product_manager";

  const capability_focus: string[] = [];
  if (/(系统设计|架构|高并发|scalability|distributed)/i.test(text)) capability_focus.push("system_design");
  if (/(性能|优化|latency|throughput)/i.test(text)) capability_focus.push("performance_optimization");
  if (/(稳定性|可用性|reliability|incident)/i.test(text)) capability_focus.push("reliability");
  if (/(跨团队|协作|沟通|stakeholder)/i.test(text)) capability_focus.push("cross_team_collaboration");
  if (/(业务|商业|impact|结果)/i.test(text)) capability_focus.push("business_impact");
  if (/(执行|落地|delivery)/i.test(text)) capability_focus.push("execution");

  const hidden_requirements: string[] = [];
  if (/(快节奏|高压|抗压)/i.test(text)) hidden_requirements.push("抗压与优先级管理");
  if (/(独立|自驱|self-driven)/i.test(text)) hidden_requirements.push("自驱与owner意识");
  if (/(沟通|协作|跨团队)/i.test(text)) hidden_requirements.push("复杂协作与沟通对齐");
  if (/(模糊|不确定|探索)/i.test(text)) hidden_requirements.push("在不确定性中拆解问题");
  if (/(结果导向|impact|业务价值)/i.test(text)) hidden_requirements.push("结果导向与业务敏感度");

  const answer_style = lower.includes("senior") || lower.includes("资深") || lower.includes("manager")
    ? "强调取舍、影响力、跨团队推动与可量化业务结果"
    : "强调问题拆解、执行细节、结果指标与复盘反思";

  return {
    job_tags: uniq(job_tags).length ? uniq(job_tags) : ["general"],
    target_role,
    capability_focus: uniq(capability_focus).length ? uniq(capability_focus) : ["execution"],
    hidden_requirements: uniq(hidden_requirements).length
      ? uniq(hidden_requirements)
      : ["基础沟通协作与结果导向"],
    answer_style
  };
}
