#!/usr/bin/env python3
"""Local, dependency-free contract tests for skills fixtures.

Why: some environments block npm registry access, so `vitest` cannot be installed.
This script provides a stable fallback for CI/local checks.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


def load_json(path: str):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def test_answer_with_experience() -> None:
    cases = load_json("tests/fixtures/answer_with_experience.cases.json")

    case_names = [c["case"] for c in cases]
    assert case_names == ["normal_match", "weak_match", "insufficient_info"], case_names

    required_fields = {
        "route_suggestion",
        "direct_answer",
        "coaching_answer",
        "used_experience_ids",
        "confidence",
        "risk_flags",
        "weak_spans",
        "answer_suggestions",
    }
    valid_confidence = {"HIGH", "MEDIUM", "LOW"}
    valid_route = {"answer_with_experience", "answer_role_specific_question", "hybrid"}
    valid_types = {
        "framing",
        "beautification",
        "transition",
        "admission",
        "supplement_needed",
    }
    valid_risk = {"low", "medium", "high"}

    for c in cases:
        out = c["output"]
        assert required_fields.issubset(out.keys()), c["case"]
        assert out["confidence"] in valid_confidence, c["case"]
        assert out["route_suggestion"] in valid_route, c["case"]

        for s in out["answer_suggestions"]:
            assert s["type"] in valid_types, (c["case"], s)
            assert s["risk_level"] in valid_risk, (c["case"], s)

    index = {c["case"]: c for c in cases}
    assert index["weak_match"]["output"]["confidence"] == "LOW"
    assert index["insufficient_info"]["output"]["confidence"] == "LOW"


def test_generate_interviewer_followups() -> None:
    cases = load_json("tests/fixtures/generate_interviewer_followups.cases.json")
    valid_pressure = {"low", "medium", "high"}

    for c in cases:
        followups = c["output"]["followups"]
        assert 1 <= len(followups) <= 2, c["case"]
        for f in followups:
            assert f["question"].strip(), c["case"]
            assert f["intent"].strip(), c["case"]
            assert f["expected_signal"].strip(), c["case"]
            assert f["pressure_level"] in valid_pressure, c["case"]

    weak_case = next(c for c in cases if c["case"] == "weak_span_priority")
    assert weak_case["input"]["weak_spans"], "weak_span_priority should include weak_spans"
    assert "效果不错" in weak_case["output"]["followups"][0]["question"]



def test_evaluate_answer_logic() -> None:
    cases = load_json("tests/fixtures/evaluate_answer_logic.cases.json")

    valid_confidence = {"HIGH", "MEDIUM", "LOW"}
    valid_severity = {"low", "medium", "high"}
    valid_action = {"accept", "ask_followup", "request_user_supplement"}

    for c in cases:
        out = c["output"]
        score = out["score"]
        for field in ("relevance", "authenticity", "structure", "impact"):
            assert 1 <= score[field] <= 5, (c["case"], field, score[field])

        assert out["confidence"] in valid_confidence, c["case"]
        assert out["next_action"] in valid_action, c["case"]
        for span in out["highlight_spans"]:
            assert span["severity"] in valid_severity, (c["case"], span)

    fabricated = next(c for c in cases if c["case"] == "request_user_supplement")
    assert fabricated["output"]["highlight_spans"][0]["severity"] == "high"
    assert fabricated["output"]["next_action"] == "request_user_supplement"

    followup = next(c for c in cases if c["case"] == "ask_followup")
    assert followup["output"]["next_action"] == "ask_followup"
    assert "缺少结果指标" in followup["output"]["issues"]



def test_interview_session_orchestrator() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { runInterviewSession, answerWithExperience, classifyQuestionType, routeQuestionType } from './orchestrator/interview_session.ts';"
            "const high = await runInterviewSession({experienceDbPath:'tests/fixtures/session/high_match.experience_db.json',questionQueuePath:'tests/fixtures/session/high_match.question_queue.json',jobAnchorPath:'tests/fixtures/session/high_match.job_anchor.json'});"
            "assert.equal(high.evaluation.next_action,'accept');"
            "const weak = await runInterviewSession({experienceDbPath:'tests/fixtures/session/weak_match.experience_db.json',questionQueuePath:'tests/fixtures/session/weak_match.question_queue.json',jobAnchorPath:'tests/fixtures/session/weak_match.job_anchor.json'});"
            "assert.equal(weak.evaluation.next_action,'request_user_supplement');"
            "const missing = await runInterviewSession({experienceDbPath:'tests/fixtures/session/missing_result.experience_db.json',questionQueuePath:'tests/fixtures/session/missing_result.question_queue.json',jobAnchorPath:'tests/fixtures/session/missing_result.job_anchor.json'});"
            "assert.equal(missing.evaluation.next_action,'ask_followup');"
            "assert.equal(classifyQuestionType('Can you walk through your project and your motivation for this role?'),'resume_based');"
            "assert.equal(classifyQuestionType('How would you design a B2B permission system?'),'role_specific');"
            "assert.equal(classifyQuestionType('How did you design the permission system in your last project?'),'hybrid');"
            "assert.deepEqual(routeQuestionType('resume_based'),['answer_with_experience']);"
            "assert.deepEqual(routeQuestionType('role_specific'),['answer_role_specific_question']);"
            "assert.deepEqual(routeQuestionType('hybrid'),['answer_role_specific_question','answer_with_experience']);"
            "const downgraded = answerWithExperience('Tell me about your frontend performance optimization project',{ experiences:[{ experience_id:'exp_ui', role:'Frontend Engineer', project:'frontend performance optimization', actions:['优化首屏渲染'], metrics:{ lcp:'1.8s' } }] },{ capability_focus:['stability','incident handling'] });"
            "assert.equal(downgraded.confidence,'LOW');"
            "assert.ok(downgraded.risk_flags.includes('经历与岗位 capability_focus 对齐不足'));"
            "console.log('orchestrator checks passed');"
        ),
    ]

    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "orchestrator checks passed" in result.stdout



def test_text_extractors() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';"
            "import { tmpdir } from 'node:os';"
            "import path from 'node:path';"
            "import { extractResumeExperiences, extractInterviewQuestions, extractResumeFromFile, extractQuestionsFromFile } from './orchestrator/text_extractors.ts';"
            "const resume = readFileSync('tests/fixtures/raw/resume_text.txt','utf-8');"
            "const exps = extractResumeExperiences(resume);"
            "assert.ok(exps.length>=2);"
            "assert.ok(exps.some(e=>e.result==='无'));"
            "assert.ok(exps.every(e=>e.source==='resume'));"
            "const qText = readFileSync('tests/fixtures/raw/questions_text.txt','utf-8');"
            "const qs = extractInterviewQuestions(qText);"
            "assert.ok(qs.length>0);"
            "assert.ok(qs.every(q=>q.confirmed===false));assert.ok(qs.every(q=>['P0','P1','P2'].includes(q.priority)));const onlyJd='岗位职责：负责系统设计\\n任职要求：3年以上经验';assert.equal(extractInterviewQuestions(onlyJd).length,0);const mixed='岗位职责：负责系统设计\\n任职要求：沟通协作\\n你做过哪些稳定性优化？';const mixedQs=extractInterviewQuestions(mixed);assert.equal(mixedQs.length,1);"
            "const wrapperDir = mkdtempSync(path.join(tmpdir(),'wrapper-'));"
            "const rf = path.join(wrapperDir,'resume.txt'); writeFileSync(rf,'岗位: W\\n项目: P\\n核心动作: A');"
            "const r = await extractResumeFromFile(rf); assert.equal(r.experiences[0].action,'A');"
            "const qf = path.join(wrapperDir,'q.txt'); writeFileSync(qf,'Q: Why this design?');"
            "const q = await extractQuestionsFromFile(qf); assert.ok(q.questions.every(i=>i.confirmed===false));"
            "const docxInjected = await extractQuestionsFromFile('x.docx', async ()=>({ fileName:'x.docx', fileType:'docx', rawText:'Q: Why this architecture?', normalizedText:'Q: Why this architecture?', metadata:{ charCount:24, parser:'mammoth', wordCount:4 }, warnings:[] }));assert.equal(docxInjected.questions[0].confirmed,false);const pdfInjected = await extractQuestionsFromFile('x.pdf', async ()=>({ fileName:'x.pdf', fileType:'pdf', rawText:'讲一个你做性能优化的案例？', normalizedText:'讲一个你做性能优化的案例？', metadata:{ charCount:13, parser:'unpdf', wordCount:1, pageCount:1 }, warnings:[] }));assert.equal(pdfInjected.questions[0].confirmed,false);rmSync(wrapperDir,{ recursive:true, force:true });"
            "console.log('text extractors checks passed');"
        ),
    ]

    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "text extractors checks passed" in result.stdout



def test_document_parser() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';"
            "import { tmpdir } from 'node:os';"
            "import path from 'node:path';"
            "import { parseDocument } from './src/document-parser/index.ts';"
            "import { parseDocx } from './src/document-parser/parsers/docxParser.ts';"
            "import { parsePdf } from './src/document-parser/parsers/pdfParser.ts';"
            "const dir = mkdtempSync(path.join(tmpdir(),'doc-parser-'));"
            "const txt = path.join(dir,'a.txt'); writeFileSync(txt,'hello   world\\n\\n');"
            "const p1 = await parseDocument(txt); assert.equal(p1.fileType,'txt');"
            "const docx = path.join(dir,'a.docx'); writeFileSync(docx,Buffer.from('x'));"
            "const p2 = await parseDocx(docx,{ extractRawText: async ()=>({ value:'docx text' }) }); assert.equal(p2.normalizedText,'docx text');"
            "const pdf = path.join(dir,'a.pdf'); writeFileSync(pdf,Buffer.from('x'));"
            "const p3 = await parsePdf(pdf,{ unpdf:{ extractText: async ()=>({ text:'pdf text', pageCount:1 }) }, pdfParse:null }); assert.equal(p3.normalizedText,'pdf text');"
            "const p4 = await parseDocument(path.join(dir,'a.bin')); assert.equal(p4.fileType,'unknown');"
            "const empty = path.join(dir,'empty.txt'); writeFileSync(empty,'\\n'); const p5 = await parseDocument(empty); assert.ok(p5.warnings.includes('Empty text content.'));"
            "rmSync(dir,{ recursive:true, force:true });"
            "console.log('document parser checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "document parser checks passed" in result.stdout



def test_refine_answer_with_supplement() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { refineAnswerWithSupplement } from './orchestrator/refine_answer_with_supplement.ts';"
            "const db = [];"
            "const out = refineAnswerWithSupplement({ original_answer:'原回答', followup_question:'追问', user_supplement:'模块: 稳定性\\n核心动作: 调整重试策略\\n场景: 高峰期超时', experience_db: db });"
            "assert.equal(out.updated_experience.source,'supplemental');"
            "assert.equal(out.updated_experience.result,'无');"
            "assert.equal(db.length,1);"
            "assert.ok(out.refined_answer.includes('原回答'));"
            "console.log('refine_answer_with_supplement checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "refine_answer_with_supplement checks passed" in result.stdout



def test_extract_job_anchor_from_jd() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { extractJobAnchorFromJd } from './orchestrator/job_anchor_extractor.ts';"
            "const jd = '招聘资深后端工程师，负责高并发系统架构与稳定性优化，需要跨团队沟通协作与owner意识，快节奏环境落地项目。';"
            "const out = extractJobAnchorFromJd(jd);"
            "assert.ok(out.job_tags.length>0);"
            "assert.ok(out.capability_focus.length>0);"
            "assert.ok(out.hidden_requirements.length>0);"
            "assert.ok(out.answer_style.length>0);"
            "console.log('extract_job_anchor_from_jd checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "extract_job_anchor_from_jd checks passed" in result.stdout



def test_detect_input_type() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { detectInputType, splitMixedInput } from './orchestrator/detect_input_type.ts';"
            "import { extractJobAnchorFromJd } from './orchestrator/job_anchor_extractor.ts';"
            "import { extractInterviewQuestions } from './orchestrator/text_extractors.ts';"
            "assert.equal(detectInputType('岗位职责：负责系统设计\\n任职要求：3年以上经验').type,'jd');"
            "assert.equal(detectInputType('你做过哪些稳定性优化？').type,'interview_questions');"
            "const mixed='岗位职责：负责系统设计\\n任职要求：沟通协作\\n你做过哪些稳定性优化？';"
            "assert.equal(detectInputType(mixed).type,'mixed');"
            "const split = splitMixedInput(mixed);"
            "assert.ok(split.jd_text.includes('岗位职责'));"
            "assert.ok(split.interview_questions_text.includes('稳定性优化'));"
            "assert.ok(extractJobAnchorFromJd(split.jd_text).capability_focus.length>0);"
            "assert.equal(extractInterviewQuestions(split.jd_text).length,0);"
            "assert.ok(extractInterviewQuestions(split.interview_questions_text).length>0);"
            "console.log('detect_input_type checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "detect_input_type checks passed" in result.stdout


def test_role_specific_question() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { buildRoleSpecificQuestionGuidance } from './orchestrator/role_specific_question.ts';"
            "const withAnchor = buildRoleSpecificQuestionGuidance('如何减少误触？',{ must_have:['用户体验','风险控制'], nice_to_have:['数据驱动复盘'] });"
            "assert.equal(withAnchor.warnings.length,0);"
            "assert.ok(withAnchor.explicit_test_points.length>0);"
            "const withoutAnchor = buildRoleSpecificQuestionGuidance('如何减少误触？');"
            "assert.ok(withoutAnchor.warnings.includes('job_anchor_missing'));"
            "console.log('role_specific_question checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "role_specific_question checks passed" in result.stdout


def test_answer_role_specific_question() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { answerRoleSpecificQuestion } from './orchestrator/role_specific_question.ts';"
            "const game = answerRoleSpecificQuestion({ question:'在移动端游戏交互设计中，如何减少玩家误触？', job_anchor:{ capability_focus:['user_experience','risk_control'] } });"
            "assert.equal(game.question_type,'role_specific');"
            "assert.ok(game.recommended_answer.includes('定义问题'));"
            "const b2b = answerRoleSpecificQuestion({ question:'B 端产品如何设计权限系统？', job_anchor:{ capability_focus:['governance'] } });"
            "assert.ok(b2b.recommended_answer.includes('RBAC'));"
            "const growth = answerRoleSpecificQuestion({ question:'商业化产品如何提升付费转化？', job_anchor:{ capability_focus:['growth'] }, optional_experience_db:[{ experience_id:'exp_growth_01', project:'付费漏斗优化', actions:['A/B实验'] }] });"
            "assert.equal(growth.question_type,'hybrid');"
            "assert.ok(growth.optional_experience_hooks.length>0);"
            "console.log('answer_role_specific_question checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "answer_role_specific_question checks passed" in result.stdout


def test_mvp_flow() -> None:
    cmd = [
        "node",
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        (
            "import assert from 'node:assert/strict';"
            "import { buildExperienceDbFromResume, buildJobAnchorFromJd, buildQuestionQueueFromInterview, generateIntroAnswer, runInterviewTraining } from './orchestrator/mvp_flow.ts';"
            "const resume='项目: 订单系统\\n核心动作: 优化重试策略\\n结果: 超时率下降30%';"
            "const jd='岗位职责：负责系统设计与稳定性优化\\n任职要求：跨团队协作';"
            "const interview='你做过哪些稳定性优化？\\n讲一个你做架构取舍的案例？';"
            "const experience_db = buildExperienceDbFromResume(resume);"
            "const job_anchor = buildJobAnchorFromJd(jd);"
            "const question_queue = buildQuestionQueueFromInterview(interview);"
            "assert.ok(experience_db.experiences.length>0);"
            "assert.ok((job_anchor.capability_focus??[]).length>0);"
            "assert.ok(question_queue.questions.length>0);"
            "const intro = generateIntroAnswer({ experience_db, job_anchor });"
            "assert.ok(intro.intro_answer.length>0);"
            "const session = runInterviewTraining({ question: question_queue.questions[0].text, experience_db, job_anchor });"
            "assert.ok(Array.isArray(session.route_to) && session.route_to.length>0);"
            "assert.ok(session.candidate_answer.direct_answer.length>0);"
            "console.log('mvp_flow checks passed');"
        ),
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    assert "mvp_flow checks passed" in result.stdout


def main() -> None:
    test_answer_with_experience()
    test_generate_interviewer_followups()
    test_evaluate_answer_logic()
    test_interview_session_orchestrator()
    test_text_extractors()
    test_document_parser()
    test_refine_answer_with_supplement()
    test_extract_job_anchor_from_jd()
    test_detect_input_type()
    test_role_specific_question()
    test_answer_role_specific_question()
    test_mvp_flow()
    print("All skill contract tests passed.")


if __name__ == "__main__":
    main()
