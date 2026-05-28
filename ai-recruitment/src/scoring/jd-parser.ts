import { ollamaChat, parseJsonFromModel } from "@/lib/ollama-client";
import { getCachedJd, jdTextHash, setCachedJd } from "@/lib/cache-redis";
import { JD_PARSE_PROMPT } from "@/parsing/prompts";
import { parseJobSchema, type JobSchemaType } from "@/models/job.schema";
import { prisma } from "@/lib/db";
import { jobSchemaFromListing, jobSchemaFromText } from "@/scoring/jd-heuristic";

export type JdParseStrategy = "heuristic" | "llm" | "auto";

export class JDParser {
  static async parse(jdText: string, jobId?: string): Promise<JobSchemaType> {
    const trimmed = jdText.trim();
    const hash = jdTextHash(trimmed);

    const cached = await getCachedJd(hash);
    if (cached) {
      try {
        const parsed = parseJobSchema(JSON.parse(cached));
        return { ...parsed, jobId: jobId ?? parsed.jobId };
      } catch {
        /* re-parse */
      }
    }

    const content = await ollamaChat(JD_PARSE_PROMPT, trimmed.slice(0, 12000));
    const job = parseJobSchema(parseJsonFromModel(content));
    const result = { ...job, jobId: jobId ?? job.jobId, description: trimmed };

    await setCachedJd(hash, JSON.stringify(result));
    return result;
  }
}

export async function parseJobDescription(text: string): Promise<JobSchemaType> {
  return JDParser.parse(text);
}

export async function resolveJobSchema(input: {
  jobId?: string | null;
  jdText: string;
  jobTitle?: string;
  companyName?: string;
  strategy?: JdParseStrategy;
}): Promise<JobSchemaType> {
  const strategy = input.strategy ?? "heuristic";
  const trimmed = input.jdText.trim();
  if (!trimmed) {
    return parseJobSchema({
      jobId: input.jobId ?? undefined,
      title: input.jobTitle ?? "",
      companyName: input.companyName ?? "",
    });
  }

  const hash = jdTextHash(trimmed);
  const cached = await getCachedJd(hash);
  if (cached) {
    try {
      const parsed = parseJobSchema(JSON.parse(cached));
      return { ...parsed, jobId: input.jobId ?? parsed.jobId };
    } catch {
      /* fall through */
    }
  }

  if (input.jobId) {
    const listing = await prisma.jobListing.findFirst({
      where: { id: input.jobId, isActive: true },
    });
    if (listing) {
      if (strategy === "heuristic") {
        const heuristic = jobSchemaFromListing(listing);
        await setCachedJd(hash, JSON.stringify(heuristic)).catch(() => undefined);
        return heuristic;
      }

      const fullText = [
        listing.title,
        listing.companyName,
        listing.description,
        listing.requirements,
        listing.responsibilities,
        listing.niceToHave,
        listing.techStack?.join(", "),
      ]
        .filter(Boolean)
        .join("\n\n");

      if (strategy === "auto") {
        const heuristic = jobSchemaFromListing(listing);
        if (heuristic.requiredSkills.length > 0) {
          await setCachedJd(hash, JSON.stringify(heuristic)).catch(() => undefined);
          return heuristic;
        }
      }

      try {
        const parsed = await JDParser.parse(fullText || trimmed, listing.id);
        if (parsed.requiredSkills.length === 0 && listing.techStack?.length) {
          return parseJobSchema({
            ...parsed,
            requiredSkills: listing.techStack.map((s) => ({
              skillName: s,
              minLevel: 3,
              isMustHave: true,
            })),
          });
        }
        return parsed;
      } catch (llmErr) {
        console.warn("[jd-parser] LLM parse failed, using heuristic:", llmErr);
        return jobSchemaFromListing(listing);
      }
    }
  }

  if (strategy === "heuristic" || strategy === "auto") {
    const heuristic = jobSchemaFromText({
      jobId: input.jobId,
      jdText: trimmed,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
    });
    if (strategy === "heuristic" || heuristic.requiredSkills.length > 0) {
      await setCachedJd(hash, JSON.stringify(heuristic)).catch(() => undefined);
      return heuristic;
    }
  }

  try {
    const parsed = await JDParser.parse(trimmed, input.jobId ?? undefined);
    if (input.jobTitle && !parsed.title) {
      return {
        ...parsed,
        title: input.jobTitle,
        companyName: input.companyName ?? parsed.companyName,
      };
    }
    return parsed;
  } catch (llmErr) {
    console.warn("[jd-parser] LLM parse failed, using heuristic:", llmErr);
    return jobSchemaFromText({
      jobId: input.jobId,
      jdText: trimmed,
      jobTitle: input.jobTitle,
      companyName: input.companyName,
    });
  }
}

export async function parseJobListing(listingId: string): Promise<JobSchemaType | null> {
  const listing = await prisma.jobListing.findFirst({
    where: { id: listingId, isActive: true },
  });
  if (!listing) return null;

  const jdText = [
    listing.title,
    listing.companyName,
    listing.description,
    listing.requirements,
    listing.responsibilities,
    listing.niceToHave,
    listing.techStack?.join(", "),
  ]
    .filter(Boolean)
    .join("\n\n");

  return resolveJobSchema({
    jobId: listing.id,
    jdText,
    jobTitle: listing.title,
    companyName: listing.companyName,
  });
}

/** @deprecated Use resolveJobSchema */
export function jobSchemaFromBody(body: {
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  jobId?: string;
}): JobSchemaType {
  return parseJobSchema({
    jobId: body.jobId,
    title: body.jobTitle ?? "",
    companyName: body.companyName ?? "",
    description: body.jobDescription ?? "",
    requiredSkills: extractSkillsFromText(body.jobDescription ?? "").map((s) => ({
      skillName: s,
      minLevel: 3,
      isMustHave: true,
    })),
    requirements: (body.jobDescription ?? "").split("\n").filter(Boolean),
  });
}

function extractSkillsFromText(text: string): string[] {
  const common = [
    "typescript",
    "javascript",
    "python",
    "react",
    "node",
    "java",
    "aws",
    "docker",
    "kubernetes",
    "sql",
    "postgresql",
  ];
  const lower = text.toLowerCase();
  return common.filter((s) => lower.includes(s));
}
