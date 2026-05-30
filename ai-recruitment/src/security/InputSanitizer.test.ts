import { describe, it, expect } from "vitest";
import { InputSanitizer } from "@/security/InputSanitizer";

describe("InputSanitizer", () => {
  it("sanitizes and truncates strings", () => {
    expect(InputSanitizer.sanitizeString("  hello  ", { maxLength: 3 })).toBe("hel");
  });

  it("sanitizes filenames", () => {
    expect(InputSanitizer.sanitizeFilename("../../etc/passwd")).not.toContain("/");
  });

  it("detects path traversal patterns", () => {
    expect(InputSanitizer.detectPathTraversal("../secret")).toBe(true);
    expect(InputSanitizer.detectPathTraversal("resume.pdf")).toBe(false);
  });

  it("strips html tags", () => {
    expect(InputSanitizer.stripHtml('<script>alert("x")</script>hello')).toBe(
      'alert("x")hello'
    );
  });
});
