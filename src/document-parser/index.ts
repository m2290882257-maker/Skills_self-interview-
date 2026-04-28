import path from "node:path";
import { detectFileType } from "./detectFileType.ts";
import { normalizeText } from "./normalizeText.ts";
import { parseDocx } from "./parsers/docxParser.ts";
import { parsePdf } from "./parsers/pdfParser.ts";
import { parseTxt } from "./parsers/txtParser.ts";
import type { ParsedDocument } from "./types.ts";

export type { ParsedDocument } from "./types.ts";

export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const fileType = detectFileType(filePath);

  if (fileType === "txt") return parseTxt(filePath);
  if (fileType === "pdf") return parsePdf(filePath);
  if (fileType === "docx") return parseDocx(filePath);

  const fileName = path.basename(filePath);
  return {
    fileName,
    fileType: "unknown",
    rawText: "",
    normalizedText: "",
    metadata: {
      charCount: 0,
      wordCount: 0,
      parser: "unknown"
    },
    warnings: ["Unsupported file type."]
  };
}

export { detectFileType, normalizeText };
