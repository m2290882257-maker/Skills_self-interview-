import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDocument } from "../types.ts";
import { normalizeText } from "../normalizeText.ts";

export async function parseTxt(filePath: string): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const warnings: string[] = [];

  let rawText = "";
  try {
    rawText = await readFile(filePath, "utf-8");
  } catch (error) {
    warnings.push(`TXT read failed: ${String(error)}`);
  }

  const normalizedText = normalizeText(rawText);
  if (!normalizedText) warnings.push("Empty text content.");

  return {
    fileName,
    fileType: "txt",
    rawText,
    normalizedText,
    metadata: {
      charCount: normalizedText.length,
      wordCount: normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0,
      parser: "txtParser"
    },
    warnings
  };
}
