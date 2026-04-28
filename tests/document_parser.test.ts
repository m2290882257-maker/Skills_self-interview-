import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseDocument } from "../src/document-parser";
import { parseDocx } from "../src/document-parser/parsers/docxParser";
import { parsePdf } from "../src/document-parser/parsers/pdfParser";

describe("document parser layer", () => {
  it("txt 正常解析", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "doc-parser-"));
    const file = path.join(dir, "resume.txt");
    writeFileSync(file, "  Hello   world\n\n\nHeader\nHeader\nHeader\nBody  ", "utf-8");

    const doc = await parseDocument(file);
    expect(doc.fileType).toBe("txt");
    expect(doc.normalizedText.includes("Hello world")).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  it("docx 正常解析", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "doc-parser-"));
    const file = path.join(dir, "resume.docx");
    writeFileSync(file, Buffer.from("fake-docx"));

    const fakeMammoth = {
      extractRawText: async () => ({ value: "DOCX content" })
    };
    const doc = await parseDocx(file, fakeMammoth);
    expect(doc.fileType).toBe("docx");
    expect(doc.normalizedText).toBe("DOCX content");

    rmSync(dir, { recursive: true, force: true });
  });

  it("pdf 正常解析", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "doc-parser-"));
    const file = path.join(dir, "resume.pdf");
    writeFileSync(file, Buffer.from("fake-pdf"));

    const fakeUnpdf = {
      extractText: async () => ({ text: "PDF content", pageCount: 2 })
    };
    const doc = await parsePdf(file, { unpdf: fakeUnpdf, pdfParse: null });
    expect(doc.fileType).toBe("pdf");
    expect(doc.normalizedText).toBe("PDF content");
    expect(doc.metadata.pageCount).toBe(2);

    rmSync(dir, { recursive: true, force: true });
  });

  it("不支持格式返回 unknown", async () => {
    const doc = await parseDocument("/tmp/xxx.unsupported");
    expect(doc.fileType).toBe("unknown");
    expect(doc.warnings.length).toBeGreaterThan(0);
  });

  it("空文本返回 warning", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "doc-parser-"));
    const file = path.join(dir, "empty.txt");
    writeFileSync(file, "\n\n", "utf-8");

    const doc = await parseDocument(file);
    expect(doc.warnings).toContain("Empty text content.");

    rmSync(dir, { recursive: true, force: true });
  });
});
