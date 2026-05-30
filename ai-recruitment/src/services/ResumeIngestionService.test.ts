import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResumeIngestionService } from "@/services/ResumeIngestionService";

vi.mock("@/config/pipeline-env", () => ({
  getPipelineEnv: vi.fn(() => ({ ASYNC_RESUME_PIPELINE: false })),
  resetPipelineEnvCache: vi.fn(),
}));

vi.mock("@/lib/BlobStorageService", () => ({
  BlobStorageService: {
    uploadResume: vi.fn(),
    generateSasUrl: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    resumeVersion: {
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/event-grid", () => ({
  isEventGridConfigured: vi.fn(() => false),
  publishResumeUploadedEvent: vi.fn(),
}));

vi.mock("@/queue/redis-queue", () => ({
  RedisJobQueue: { enqueueParseJob: vi.fn() },
}));

vi.mock("@/pipeline/resume-pipeline", () => ({
  runResumePipeline: vi.fn().mockResolvedValue({
    resumeId: "rv-1",
    fileName: "cv.pdf",
    uploadedAt: "2026-01-01",
    atsScore: 80,
    indexed: true,
    parsed: {
      contactInfo: {
        name: "Test",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        website: "",
      },
      summary: "",
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    },
    scoreBreakdown: { resumeQuality: { score: 80 } },
    improvements: [],
  }),
}));

vi.mock("@/monitoring/appInsights", () => ({
  trackEvent: vi.fn(),
}));

describe("ResumeIngestionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs sync pipeline when ASYNC_RESUME_PIPELINE is false", async () => {
    const result = await ResumeIngestionService.ingest({
      userId: "u-1",
      candidateId: "c-1",
      tenantId: "t-1",
      fileName: "cv.pdf",
      buffer: Buffer.from("pdf"),
      mimeType: "application/pdf",
    });

    expect(result.status).toBe("COMPLETE");
    if (result.status === "COMPLETE") {
      expect(result.resumeId).toBe("rv-1");
      expect(result.atsScore).toBe(80);
      expect(result.parsed?.contactInfo.name).toBe("Test");
    }
  });
});
