import { describe, expect, it } from "vitest";
import {
  buildStudioPayload,
  resolveParsedUi,
} from "@/services/resumes/resume-studio.service";
import type { ParsedResumeUI } from "@/models/adapters/resume-ui.adapter";

const uiPayload: ParsedResumeUI = {
  contactInfo: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "",
    location: "NYC",
    linkedin: "",
    github: "",
    website: "",
  },
  summary: "Engineer",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
};

describe("resume-studio.service", () => {
  it("resolveParsedUi prefers parsedContent over parsedData", () => {
    const fromUi = resolveParsedUi({
      parsedContent: JSON.stringify(uiPayload),
      parsedResume: {
        parsedData: { fullName: "Schema Name" },
      } as never,
    });
    expect(fromUi?.contactInfo.name).toBe("Jane Doe");
  });

  it("resolveParsedUi falls back to resumeSchemaToUI from parsedData", () => {
    const fromSchema = resolveParsedUi({
      parsedContent: null,
      parsedResume: {
        parsedData: {
          fullName: "Schema Name",
          email: "schema@example.com",
          phone: null,
          location: null,
          currentTitle: null,
          yearsOfExperience: null,
          seniorityBand: null,
          industryDomain: "GENERAL",
          summary: "Summary",
          skills: [],
          experience: [],
          education: [],
        },
      } as never,
    });
    expect(fromSchema?.contactInfo.name).toBe("Schema Name");
  });

  it("buildStudioPayload returns studio shape", () => {
    const payload = buildStudioPayload({
      id: "rv-1",
      title: "resume.pdf",
      createdAt: new Date("2026-01-01"),
      atsScore: 72,
      parsedContent: JSON.stringify(uiPayload),
      scoreBreakdown: JSON.stringify({ resumeQuality: { score: 80 } }),
      improvements: JSON.stringify([]),
      pipelineStatus: "SCORED",
      status: "ACTIVE",
      roleTarget: null,
      fileUrl: null,
      filePath: null,
      userId: "u1",
      pipelineError: null,
      pipelineRawText: null,
      piiMaskEncrypted: null,
      tenantId: "t1",
      embeddedAt: null,
      updatedAt: new Date(),
      suggestions: [],
      parsedResume: null,
    });

    expect(payload.resumeId).toBe("rv-1");
    expect(payload.parsed?.contactInfo.name).toBe("Jane Doe");
    expect(payload.atsScore).toBe(72);
    expect(payload.scoreBreakdown).toEqual({ resumeQuality: { score: 80 } });
  });
});
