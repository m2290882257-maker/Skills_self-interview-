import path from "node:path";
import type { FileType } from "./types.ts";

export function detectFileType(filePath: string): FileType {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".txt") return "txt";
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  return "unknown";
}
