import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseDocument } from "../../../src/document-parser/index.ts";

type ParseFileResponse = {
  text: string;
  fileType: string;
  warnings: string[];
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb"
    }
  }
};

const extFromName = (name: string): string => {
  const ext = path.extname(name || "").toLowerCase();
  if (ext) return ext;
  return ".txt";
};

async function tryOcrImage(buffer: Buffer): Promise<{ text: string; warnings: string[] }> {
  try {
    const mod = await import("tesseract.js");
    const recognize = (mod as unknown as { recognize?: Function }).recognize;
    if (!recognize) {
      return {
        text: "",
        warnings: ["tesseract.js 未暴露 recognize，无法解析图片文字。"]
      };
    }

    const result = await recognize(buffer, "chi_sim+eng");
    const text = String((result as any)?.data?.text ?? "").trim();
    return {
      text,
      warnings: text ? [] : ["图片 OCR 结果为空。"]
    };
  } catch {
    return {
      text: "",
      warnings: ["当前环境未安装 tesseract.js，图片 OCR 不可用。"]
    };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ParseFileResponse | { error: string }>) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const fileName = String(req.body?.fileName ?? "upload.txt");
    const mimeType = String(req.body?.mimeType ?? "");
    const contentBase64 = String(req.body?.contentBase64 ?? "");

    if (!contentBase64) {
      res.status(400).json({ error: "contentBase64 is required" });
      return;
    }

    const buffer = Buffer.from(contentBase64, "base64");

    if (mimeType.startsWith("image/")) {
      const ocr = await tryOcrImage(buffer);
      res.status(200).json({
        text: ocr.text,
        fileType: "image",
        warnings: ocr.warnings
      });
      return;
    }

    const ext = extFromName(fileName);
    const tempPath = path.join(os.tmpdir(), `mvp-upload-${randomUUID()}${ext}`);
    await fs.writeFile(tempPath, buffer);

    try {
      const parsed = await parseDocument(tempPath);
      res.status(200).json({
        text: parsed.normalizedText,
        fileType: parsed.fileType,
        warnings: parsed.warnings
      });
    } finally {
      await fs.unlink(tempPath).catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: message });
  }
}
