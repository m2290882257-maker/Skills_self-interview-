import { useState } from "react";
import { runMVPFlow } from "../lib/runMVPFlow";

interface Props {
  onResult: (result: any) => void;
  onError: (message: string) => void;
}

const readTxtFile = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsText(file, "utf-8");
  });

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

  return (
    <section className="panel">
      <h2>Input Panel</h2>
      <label>Resume</label>
      <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={5} />
      <input type="file" accept=".txt,text/plain" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setResume(await readTxtFile(f));
      }} />
      <label>JD</label>
      <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={5} />
      <input type="file" accept=".txt,text/plain" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setJd(await readTxtFile(f));
      }} />
      <label>Interview Questions</label>
      <textarea value={interview} onChange={(e) => setInterview(e.target.value)} rows={5} />
      <input type="file" accept=".txt,text/plain" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setInterview(await readTxtFile(f));
      }} />
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
