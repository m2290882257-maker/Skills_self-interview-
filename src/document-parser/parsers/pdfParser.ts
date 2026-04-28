import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedDocument } from "../types.ts";
import { normalizeText } from "../normalizeText.ts";

type UnpdfLike = {
  extractText: (input: Buffer) => Promise<{ text: string; pageCount?: number; encrypted?: boolean }>;
};

type PdfParseLike = (input: Buffer) => Promise<{ text: string; numpages?: number }>;

async function loadUnpdf(): Promise<UnpdfLike | null> {
  try {
    const mod = await import("unpdf");
    const candidate = mod as unknown as { extractText?: UnpdfLike["extractText"] };
    if (candidate.extractText) return { extractText: candidate.extractText };
    return null;
  } catch {
    return null;
  }
}

async function loadPdfParse(): Promise<PdfParseLike | null> {
  try {
    const mod = await import("pdf-parse");
    const fn = (mod as unknown as { default?: PdfParseLike }).default;
    return fn ?? null;
  } catch {
    return null;
  }
}

export async function parsePdf(
  filePath: string,
  deps?: { unpdf?: UnpdfLike | null; pdfParse?: PdfParseLike | null }
): Promise<ParsedDocument> {
  const fileName = path.basename(filePath);
  const warnings: string[] = [];

  let rawText = "";
  let pageCount: number | undefined;
  const unpdf = deps?.unpdf ?? (await loadUnpdf());
  const pdfParse = deps?.pdfParse ?? (await loadPdfParse());

  try {
    const buffer = await readFile(filePath);

    if (unpdf) {
      const result = await unpdf.extractText(buffer);
      if (result.encrypted) warnings.push("Encrypted PDF may not be fully readable.");
      rawText = result.text ?? "";
      pageCount = result.pageCount;
    } else if (pdfParse) {
      const result = await pdfParse(buffer);
      rawText = result.text ?? "";
      pageCount = result.numpages;
      warnings.push("Using pdf-parse fallback (unpdf unavailable).");
    } else {
      warnings.push("No PDF parser available (unpdf/pdf-parse not installed).");
    }
  } catch (error) {
    warnings.push(`PDF parse failed: ${String(error)}`);
  }

  const normalizedText = normalizeText(rawText);
  if (!normalizedText) warnings.push("Empty text content.");

  return {
    fileName,
    fileType: "pdf",
    rawText,
    normalizedText,
    metadata: {
      pageCount,
      charCount: normalizedText.length,
      wordCount: normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0,
      parser: unpdf ? "unpdf" : pdfParse ? "pdf-parse" : "pdfParser(no-lib)"
    },
    warnings
  };
}
