export type FileType = "pdf" | "docx" | "txt" | "unknown";

export interface ParsedDocument {
  fileName: string;
  fileType: FileType;
  rawText: string;
  normalizedText: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    charCount: number;
    parser: string;
  };
  warnings: string[];
}

export interface ParserContext {
  filePath: string;
  fileName: string;
  fileType: FileType;
}
