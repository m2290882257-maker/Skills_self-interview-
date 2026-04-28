import { useState, type ChangeEvent } from "react";
import { runMVPFlow } from "../lib/runMVPFlow";

interface Props {
  onResult: (result: any) => void;
  onError: (message: string) => void;
}

const readFileAsDataURL = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });

async function parseUploadFile(file: File): Promise<{ text: string; warnings: string[]; fileType: string }> {
  const dataUrl = await readFileAsDataURL(file);
  const base64 = dataUrl.split(",")[1] ?? "";

  const resp = await fetch("/api/parse-file", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      contentBase64: base64
    })
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error ?? `文件解析失败 (${resp.status})`);
  }

  return resp.json();
}

export default function UploadPanel({ onResult, onError }: Props) {
  const [resume, setResume] = useState("项目: 订单系统\n核心动作: 优化重试策略\n结果: 超时率下降30%");
  const [jd, setJd] = useState("岗位职责：负责系统设计与稳定性优化\n任职要求：跨团队协作");
  const [interview, setInterview] = useState("你做过哪些稳定性优化？\n讲一个你做架构取舍的案例？");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    onError("");
    try {
      const data = await runMVPFlow({ resumeText: resume, jdText: jd, interviewText: interview });
      onResult(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : "运行失败");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload =
    (setter: (text: string) => void, label: string) => async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      try {
        const parsed = await parseUploadFile(f);
        setter(parsed.text);

        if (parsed.warnings.length > 0) {
          onError(`${label} 文件解析提示：${parsed.warnings.join("；")}`);
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : `${label} 文件解析失败`);
      }
    };

  return (
    <section className="panel">
      <h2>Input Panel</h2>
      <label>Resume</label>
      <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={5} />
      <input
        type="file"
        accept=".txt,.pdf,.docx,image/*,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileUpload(setResume, "Resume")}
      />
      <label>JD</label>
      <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={5} />
      <input
        type="file"
        accept=".txt,.pdf,.docx,image/*,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileUpload(setJd, "JD")}
      />
      <label>Interview Questions</label>
      <textarea value={interview} onChange={(e) => setInterview(e.target.value)} rows={5} />
      <input
        type="file"
        accept=".txt,.pdf,.docx,image/*,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileUpload(setInterview, "Interview Questions")}
      />
      <button disabled={loading} onClick={run}>
        {loading ? "分析中..." : "开始分析"}
      </button>
      <style jsx>{`
        .panel { padding: 16px; border: 1px solid #ddd; border-radius: 8px; display: grid; gap: 8px; }
        textarea { width: 100%; font-family: monospace; }
        button { width: 180px; padding: 8px 12px; }
      `}</style>
    </section>
  );
}
