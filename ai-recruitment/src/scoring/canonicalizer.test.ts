import { describe, expect, it, beforeEach } from "vitest";
import { SkillCanonicalizer } from "@/scoring/canonicalizer";

describe("SkillCanonicalizer", () => {
  beforeEach(() => {
    SkillCanonicalizer.reset();
  });

  it("canonicalizes built-in aliases without DB", () => {
    expect(SkillCanonicalizer.canonicalize("js")).toBe("JavaScript");
    expect(SkillCanonicalizer.canonicalize("k8s")).toBe("Kubernetes");
    expect(SkillCanonicalizer.canonicalize("react.js")).toBe("React");
    expect(SkillCanonicalizer.canonicalize("node")).toBe("Node.js");
  });

  it("returns trimmed original for unknown skills", () => {
    expect(SkillCanonicalizer.canonicalize("  CustomSkill  ")).toBe("CustomSkill");
  });

  it("normalizes for match case-insensitively", () => {
    expect(SkillCanonicalizer.normalizeForMatch("JavaScript")).toBe("javascript");
    expect(SkillCanonicalizer.normalizeForMatch("JS")).toBe("javascript");
  });
});
