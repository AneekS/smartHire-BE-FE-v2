import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/auth-middleware", () => ({
  withAuth: (_req: unknown, handler: (req: unknown) => Promise<Response>) =>
    handler({
      tenantId: "tenant-1",
      url: "http://localhost/api/v1/search/resumes?q=typescript&topK=5",
    }),
}));

vi.mock("@/embedding/embedder", () => ({
  embedText: vi.fn().mockResolvedValue({ vector: [0.1, 0.2] }),
}));

vi.mock("@/lib/VectorSearchRouter", () => ({
  VectorSearchRouter: {
    hybridSearch: vi.fn().mockResolvedValue([
      {
        id: "chunk-1",
        resumeVersionId: "rv-1",
        candidateId: "c-1",
        section: "SKILLS",
        fusedScore: 0.92,
      },
    ]),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    parsedResume: {
      findMany: vi.fn().mockResolvedValue([
        {
          resumeVersionId: "rv-1",
          parsedData: { skills: ["TypeScript", "React"] },
        },
      ]),
    },
  },
}));

import { VectorSearchRouter } from "@/lib/VectorSearchRouter";

describe("GET /api/v1/search/resumes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hybrid search hits with tenant filter", async () => {
    const res = await GET({} as never);
    const json = await res.json();

    expect(VectorSearchRouter.hybridSearch).toHaveBeenCalledWith(
      "typescript",
      [0.1, 0.2],
      expect.objectContaining({ tenantId: "tenant-1", topK: 5 })
    );

    expect(json.data.hits).toHaveLength(1);
    expect(json.data.hits[0]).toMatchObject({
      resumeVersionId: "rv-1",
      candidateId: "c-1",
      section: "SKILLS",
      skills: ["TypeScript", "React"],
    });
  });
});
