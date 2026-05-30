import { prisma } from "@/lib/db";
import {
  resumeSchemaToUI,
  type ParsedResumeUI,
} from "@/models/adapters/resume-ui.adapter";
import { parseResumeSchema } from "@/models/resume.schema";
import type { PipelineStatus, ResumeSuggestion, ResumeVersion } from "@prisma/client";
import type { ParsedResume } from "@prisma/client";

const READY_PIPELINE_STATUSES: PipelineStatus[] = [
  "PARSED",
  "SCORED",
  "EMBEDDING",
  "EMBEDDED",
  "COMPLETE",
];

export type StudioImprovement = {
  id: string;
  severity: "critical" | "important" | "suggestion";
  section: string;
  fieldPath: string;
  title: string;
  description: string;
  originalText: string;
  suggestedText: string;
  impact: string;
  applied?: boolean;
};

export type ResumeStudioPayload = {
  resumeId: string;
  fileName: string;
  uploadedAt: string;
  atsScore: number | null;
  parsed: ParsedResumeUI | null;
  scoreBreakdown: Record<string, unknown> | null;
  improvements: StudioImprovement[];
  pipelineStatus: PipelineStatus;
  status: string;
  fileUrl?: string | null;
  roleTarget?: string | null;
};

type ResumeVersionWithRelations = ResumeVersion & {
  suggestions: ResumeSuggestion[];
  parsedResume: ParsedResume | null;
};

function parseJsonField<T>(raw: string | null | undefined): T | null {
  if (!raw?.trim()) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function suggestionTypeToSeverity(
  type: string
): StudioImprovement["severity"] {
  switch (type) {
    case "CRITICAL":
      return "critical";
    case "IMPROVEMENT":
      return "important";
    default:
      return "suggestion";
  }
}

function mapDbSuggestion(s: ResumeSuggestion): StudioImprovement {
  return {
    id: s.id,
    severity: suggestionTypeToSeverity(s.type),
    section: s.section,
    fieldPath: s.section.toLowerCase(),
    title: s.title,
    description: s.description,
    originalText: "",
    suggestedText: "",
    impact: s.description,
    applied: s.applied,
  };
}

function normalizeImprovement(raw: unknown, index: number): StudioImprovement | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? o.name ?? "Improvement");
  const description = String(o.description ?? o.impact ?? "");
  const severityRaw = String(o.severity ?? o.type ?? "suggestion").toLowerCase();
  let severity: StudioImprovement["severity"] = "suggestion";
  if (severityRaw.includes("critical") || severityRaw === "critical") {
    severity = "critical";
  } else if (
    severityRaw.includes("important") ||
    severityRaw === "improvement"
  ) {
    severity = "important";
  }

  return {
    id: String(o.id ?? `imp_${index}`),
    severity,
    section: String(o.section ?? "general"),
    fieldPath: String(o.fieldPath ?? o.section ?? "summary"),
    title,
    description,
    originalText: String(o.originalText ?? ""),
    suggestedText: String(o.suggestedText ?? o.suggestion ?? ""),
    impact: String(o.impact ?? description),
    applied: Boolean(o.applied),
  };
}

export function resolveParsedUi(
  version: Pick<ResumeVersion, "parsedContent"> & {
    parsedResume?: ParsedResume | null;
  }
): ParsedResumeUI | null {
  const fromContent = parseJsonField<ParsedResumeUI>(version.parsedContent);
  if (fromContent?.contactInfo) {
    return fromContent;
  }

  const parsedData = version.parsedResume?.parsedData;
  if (!parsedData) return fromContent;

  try {
    const schema = parseResumeSchema(parsedData);
    return resumeSchemaToUI(schema);
  } catch {
    return fromContent;
  }
}

export function buildStudioPayload(
  version: ResumeVersionWithRelations,
  fileUrl?: string | null
): ResumeStudioPayload {
  const parsed = resolveParsedUi(version);
  const scoreBreakdown = parseJsonField<Record<string, unknown>>(
    version.scoreBreakdown
  );

  const fromJson = parseJsonField<unknown[]>(version.improvements) ?? [];
  const jsonImprovements = fromJson
    .map((item, i) => normalizeImprovement(item, i))
    .filter((x): x is StudioImprovement => x != null);

  const dbImprovements = version.suggestions.map(mapDbSuggestion);

  const improvements =
    jsonImprovements.length > 0 ? jsonImprovements : dbImprovements;

  return {
    resumeId: version.id,
    fileName: version.title,
    uploadedAt: version.createdAt.toISOString(),
    atsScore: version.atsScore,
    parsed,
    scoreBreakdown,
    improvements,
    pipelineStatus: version.pipelineStatus,
    status: version.status,
    fileUrl: fileUrl ?? version.fileUrl,
    roleTarget: version.roleTarget,
  };
}

export async function getActiveResumeVersion(
  userId: string,
  tenantId: string
): Promise<ResumeVersionWithRelations | null> {
  const include = {
    suggestions: { orderBy: { createdAt: "asc" as const } },
    parsedResume: true,
  };

  const tenantFilter = { OR: [{ tenantId }, { tenantId: null }] };

  const activeReady = await prisma.resumeVersion.findFirst({
    where: {
      userId,
      ...tenantFilter,
      status: "ACTIVE",
      pipelineStatus: { in: READY_PIPELINE_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    include,
  });

  if (activeReady) return activeReady;

  const activeAny = await prisma.resumeVersion.findFirst({
    where: {
      userId,
      ...tenantFilter,
      status: "ACTIVE",
      OR: [
        { parsedContent: { not: null } },
        { parsedResume: { isNot: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include,
  });

  if (activeAny) return activeAny;

  return prisma.resumeVersion.findFirst({
    where: {
      userId,
      ...tenantFilter,
      OR: [
        { parsedContent: { not: null } },
        { parsedResume: { isNot: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include,
  });
}

export async function getResumeStudioPayload(
  userId: string,
  tenantId: string
): Promise<ResumeStudioPayload | null> {
  const version = await getActiveResumeVersion(userId, tenantId);
  if (!version) return null;

  let fileUrl = version.fileUrl;
  if (version.filePath) {
    try {
      const { getResumeSasUrl } = await import("@/lib/azure-storage");
      fileUrl = await getResumeSasUrl(version.filePath);
    } catch {
      fileUrl = version.fileUrl;
    }
  }

  return buildStudioPayload(version, fileUrl);
}

export async function getResumeStudioPayloadById(
  resumeId: string,
  userId: string,
  tenantId: string
): Promise<ResumeStudioPayload | null> {
  const version = await prisma.resumeVersion.findFirst({
    where: {
      id: resumeId,
      userId,
      OR: [{ tenantId }, { tenantId: null }],
    },
    include: {
      suggestions: { orderBy: { createdAt: "asc" } },
      parsedResume: true,
    },
  });

  if (!version) return null;

  let fileUrl = version.fileUrl;
  if (version.filePath) {
    try {
      const { getResumeSasUrl } = await import("@/lib/azure-storage");
      fileUrl = await getResumeSasUrl(version.filePath);
    } catch {
      fileUrl = version.fileUrl;
    }
  }

  return buildStudioPayload(version, fileUrl);
}
