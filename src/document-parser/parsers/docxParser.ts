import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDocument } from "../types.ts";
import { normalizeText } from "../normalizeText.ts";

type MammothLike = {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
};

async function loadMammoth(): Promise<MammothLike | null> {
  try {
    const mod = await import("mammoth");
    return mod as unknown as MammothLike;
  } catch {
    return null;
  }
}

export async function parseDocx(filePath: string, mammothLib?: MammothLike): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const warnings: string[] = [];

  let rawText = "";
  const lib = mammothLib ?? (await loadMammoth());

  try {
    const buffer = await readFile(filePath);
    if (!lib) {
      warnings.push("mammoth not installed, DOCX parse unavailable.");
    } else {
      const result = await lib.extractRawText({ buffer });
      rawText = result.value ?? "";
    }
  } catch (error) {
    warnings.push(`DOCX parse failed: ${String(error)}`);
  }

  const normalizedText = normalizeText(rawText);
  if (!normalizedText) warnings.push("Empty text content.");

  return {
    fileName,
    fileType: "docx",
    rawText,
    normalizedText,
    metadata: {
      charCount: normalizedText.length,
      wordCount: normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0,
      parser: lib ? "mammoth" : "docxParser(no-mammoth)"
    },
    warnings
  };
}
