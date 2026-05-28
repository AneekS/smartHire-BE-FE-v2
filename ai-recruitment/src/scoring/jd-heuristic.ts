import type { JobListing } from "@prisma/client";
import { parseJobSchema, type JobSchemaType, type RoleType } from "@/models/job.schema";
import type { SeniorityBand } from "@/models/resume.schema";

const COMMON_SKILLS = [
  "typescript",
  "javascript",
  "python",
  "java",
  "go",
  "golang",
  "rust",
  "c++",
  "c#",
  ".net",
  "react",
  "next.js",
  "nextjs",
  "vue",
  "angular",
  "node",
  "nodejs",
  "node.js",
  "express",
  "django",
  "flask",
  "fastapi",
  "spring",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "k8s",
  "terraform",
  "sql",
  "postgresql",
  "postgres",
  "mysql",
  "mongodb",
  "redis",
  "graphql",
  "rest",
  "api",
  "git",
  "ci/cd",
  "jenkins",
  "kafka",
  "spark",
  "hadoop",
  "tensorflow",
  "pytorch",
  "machine learning",
  "deep learning",
  "nlp",
  "llm",
  "openai",
  "agile",
  "scrum",
  "figma",
  "salesforce",
  "tableau",
  "power bi",
  "excel",
  "financial modeling",
  "bloomberg",
];

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = COMMON_SKILLS.filter((skill) => lower.includes(skill));

  const bulletSkills = text
    .split(/[\n,;|•]/)
    .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 40 && !/\d{4}/.test(s));

  const merged = [...new Set([...found, ...bulletSkills])];
  return merged.slice(0, 30);
}

function extractBulletLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*•]+/, "").trim())
    .filter((line) => line.length > 10)
    .slice(0, 8);
}

function inferRoleType(title: string, body: string): RoleType {
  const t = `${title} ${body}`.toLowerCase();
  if (/\b(nurse|rn|lpn|clinical|healthcare|physician)\b/.test(t)) return "HEALTHCARE";
  if (/\b(account executive|sales|business development|sdr|bdr)\b/.test(t)) return "SALES";
  if (/\b(ceo|cto|cfo|vp |vice president|director|head of)\b/.test(t)) return "EXECUTIVE";
  if (/\b(manager|lead|supervisor|team lead)\b/.test(t)) return "MANAGER";
  return "IC";
}

function inferSeniority(
  experienceLevel: string | null | undefined,
  title: string
): SeniorityBand {
  const t = `${experienceLevel ?? ""} ${title}`.toLowerCase();
  if (/\b(intern|entry|junior|graduate|l1)\b/.test(t)) return "L1";
  if (/\b(mid|associate|l2|2\+?\s*years|3\+?\s*years)\b/.test(t)) return "L2";
  if (/\b(senior|sr\.?|l3|5\+?\s*years)\b/.test(t)) return "L3";
  if (/\b(staff|principal|l4|8\+?\s*years)\b/.test(t)) return "L4";
  if (/\b(director|head|l5)\b/.test(t)) return "L5";
  if (/\b(executive|vp|c-level|l6)\b/.test(t)) return "L6";
  return "L3";
}

function inferYearsExperience(text: string): number | null {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i);
  if (match) return Number(match[1]);
  return null;
}

function inferIndustry(title: string, body: string): JobSchemaType["industryDomain"] {
  const t = `${title} ${body}`.toLowerCase();
  if (/\b(finance|banking|investment|accounting|analyst)\b/.test(t)) return "FINANCE";
  if (/\b(health|nurse|clinical|medical|pharma)\b/.test(t)) return "HEALTHCARE";
  if (/\b(sales|account executive|revenue)\b/.test(t)) return "SALES";
  if (/\b(legal|attorney|paralegal)\b/.test(t)) return "LEGAL";
  if (/\b(design|creative|marketing|brand)\b/.test(t)) return "CREATIVE";
  return "TECH";
}

export function jobSchemaFromListing(listing: JobListing): JobSchemaType {
  const description = [
    listing.description,
    listing.requirements,
    listing.responsibilities,
    listing.niceToHave,
  ]
    .filter(Boolean)
    .join("\n\n");

  const techSkills = listing.techStack ?? [];
  const extracted = extractSkillsFromText(description);
  const skillNames = [...new Set([...techSkills, ...extracted])].filter(Boolean);

  return parseJobSchema({
    jobId: listing.id,
    title: listing.title,
    roleTitle: listing.title,
    companyName: listing.companyName,
    location: listing.location,
    experienceLevel: listing.experienceLevel,
    seniorityExpected: inferSeniority(listing.experienceLevel, listing.title),
    industryDomain: inferIndustry(listing.title, description),
    roleType: inferRoleType(listing.title, description),
    requiredSkills: skillNames.map((skillName) => ({
      skillName,
      minLevel: 3,
      isMustHave: true,
    })),
    niceToHaveSkills: extractSkillsFromText(listing.niceToHave ?? "").map((skillName) => ({
      skillName,
      minLevel: 2,
    })),
    minYearsExperience: inferYearsExperience(description),
    keyResponsibilities: extractBulletLines(listing.responsibilities).slice(0, 5),
    requirements: extractBulletLines(listing.requirements),
    responsibilities: extractBulletLines(listing.responsibilities),
    description,
    salaryRange: listing.salaryRange,
    jobType: listing.jobType,
  });
}

export function jobSchemaFromText(input: {
  jobId?: string | null;
  jdText: string;
  jobTitle?: string;
  companyName?: string;
}): JobSchemaType {
  const trimmed = input.jdText.trim();
  const skillNames = extractSkillsFromText(trimmed);

  return parseJobSchema({
    jobId: input.jobId ?? undefined,
    title: input.jobTitle ?? "",
    roleTitle: input.jobTitle ?? "",
    companyName: input.companyName ?? "",
    seniorityExpected: inferSeniority(null, input.jobTitle ?? trimmed),
    industryDomain: inferIndustry(input.jobTitle ?? "", trimmed),
    roleType: inferRoleType(input.jobTitle ?? "", trimmed),
    requiredSkills: skillNames.map((skillName) => ({
      skillName,
      minLevel: 3,
      isMustHave: true,
    })),
    minYearsExperience: inferYearsExperience(trimmed),
    keyResponsibilities: extractBulletLines(trimmed).slice(0, 5),
    requirements: extractBulletLines(trimmed),
    description: trimmed,
  });
}
