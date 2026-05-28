import { describe, it, expect } from "vitest";
import { reflowTwoColumns, normalizeText, DocumentExtractor } from "@/parsing/document-extractor";

describe("document-extractor utilities", () => {
  it("reflows two-column lines", () => {
    const input = [
      "Left column text here          Right column text here",
      "More left content              More right content",
      "Third left                     Third right",
      "Single column line",
    ].join("\n");

    const { text, applied } = reflowTwoColumns(input);
    expect(applied).toBe(true);
    expect(text).toContain("Left column text here");
    expect(text).toContain("Right column text here");
  });

  it("normalizes smart quotes and extra newlines", () => {
    const input = "It\u2019s great\n\n\n\nNext line";
    const out = normalizeText(input);
    expect(out).toContain("It's great");
    expect(out).not.toMatch(/\n{3,}/);
  });
});

describe("DocumentExtractor RTF", () => {
  it("extracts plain text from RTF buffer", async () => {
    const rtf = Buffer.from(
      "{\\rtf1\\ansi Jane Doe\\par Senior Engineer\\par jane@example.com\\par }",
      "utf8"
    );
    const result = await DocumentExtractor.extract(rtf, "resume.rtf", "application/rtf");
    expect(result.text).toContain("Jane Doe");
    expect(result.text).toContain("Senior Engineer");
    expect(result.parsingMethod).toBe("text_layer");
  });
});
