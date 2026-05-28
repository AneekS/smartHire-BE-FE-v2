import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";
import type { SectionType } from "@/parsing/preprocess.types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\d{10,12}\b/;

/** Fill obvious gaps from raw text + section detector output when LLM extraction is sparse. */
export function enrichSparseExtraction(
  schema: ExtractionResumeSchemaType,
  rawText: string,
  sections?: Partial<Record<SectionType, string>>
): ExtractionResumeSchemaType {
  const out = structuredClone(schema);
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!out.personalInfo.name?.trim()) {
    const firstLine = lines[0] ?? "";
    if (
      firstLine.length >= 3 &&
      firstLine.length <= 60 &&
      !EMAIL_RE.test(firstLine) &&
      !PHONE_RE.test(firstLine) &&
      !/^(education|experience|skills|summary|work)/i.test(firstLine)
    ) {
      out.personalInfo.name = firstLine.replace(/\s{2,}/g, " ");
    }
  }

  if (!out.personalInfo.email?.trim()) {
    const email = rawText.match(EMAIL_RE)?.[0];
    if (email) out.personalInfo.email = email;
  }

  if (!out.personalInfo.phone?.trim()) {
    const phone = rawText.match(PHONE_RE)?.[0];
    if (phone) out.personalInfo.phone = phone.replace(/\s/g, "");
  }

  if (!out.summary?.trim() && sections?.SUMMARY) {
    out.summary = sections.SUMMARY.slice(0, 600).trim();
  } else if (!out.summary?.trim()) {
    const summaryLine = lines.find(
      (l) =>
        l.length > 40 &&
        l.length < 280 &&
        !EMAIL_RE.test(l) &&
        !/^(education|experience|skills)/i.test(l) &&
        l !== out.personalInfo.name
    );
    if (summaryLine) out.summary = summaryLine;
  }

  if (out.skills.length === 0 && sections?.SKILLS) {
    out.skills = parseSkillsBlock(sections.SKILLS);
  }

  if (out.experience.length === 0 && sections?.EXPERIENCE) {
    const block = parseExperienceBlock(sections.EXPERIENCE);
    if (block.length) out.experience = block;
  }

  if (out.education.length === 0 && sections?.EDUCATION) {
    const block = parseEducationBlock(sections.EDUCATION);
    if (block.length) out.education = block;
  }

  return out;
}

function parseSkillsBlock(text: string): ExtractionResumeSchemaType["skills"] {
  const tokens = text
    .split(/[,;|•\n]/)
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 40);
  const unique = [...new Set(tokens)].slice(0, 40);
  return unique.map((name) => ({
    name,
    domain: "OTHER" as const,
    proficiencyLevel: 3,
  }));
}

function parseExperienceBlock(
  text: string
): ExtractionResumeSchemaType["experience"] {
  const chunks = text.split(/\n(?=[A-Z][^\n]{8,}(?:\n|$))/).filter((c) => c.trim().length > 20);
  const blocks = chunks.length ? chunks : [text];

  return blocks.slice(0, 8).map((chunk) => {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const dateMatch = chunk.match(
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*[-–—]\s*((?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}))/i
    );
    const title = lines[0] ?? "Role";
    const company = lines.find((l, i) => i > 0 && l.length < 80 && !dateMatch?.[0]?.includes(l)) ?? lines[1] ?? "";
    const bullets = lines
      .slice(2)
      .filter((l) => l.length > 15 && !/^(bangalore|mumbai|delhi|india)/i.test(l));

    return {
      company: company.slice(0, 120),
      title: title.slice(0, 120),
      startDate: dateMatch ? toYearMonth(dateMatch[1]) : null,
      endDate: dateMatch ? (dateMatch[2].toLowerCase() === "present" ? null : toYearMonth(dateMatch[2])) : null,
      isCurrent: /present/i.test(chunk),
      durationMonths: null,
      responsibilities: bullets.slice(0, 6),
      achievements: [],
      techStack: [],
    };
  });
}

function parseEducationBlock(
  text: string
): ExtractionResumeSchemaType["education"] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const institution =
    lines.find((l) => /university|institute|college|school|iit/i.test(l)) ?? lines[0] ?? "";
  const degree = lines.find((l) => /b\.?tech|m\.?tech|bachelor|master|degree|dual/i.test(l)) ?? null;
  const yearMatch = text.match(/\b(20\d{2})\b/g);
  const gpaMatch = text.match(/(?:CGPA|GPA)\s*[:.]?\s*([\d.]+)/i);

  return [
    {
      institution: institution.slice(0, 200),
      degree,
      field: null,
      startYear: yearMatch?.[0] ? Number(yearMatch[0]) : null,
      endYear: yearMatch?.[1] ? Number(yearMatch[1]) : yearMatch?.[0] ? Number(yearMatch[0]) : null,
      gpa: gpaMatch ? Number(gpaMatch[1]) : null,
    },
  ];
}

function toYearMonth(label: string): string | null {
  const m = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})/i);
  if (!m) return null;
  const months: Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };
  const mm = months[m[1].slice(0, 3).toLowerCase()];
  return mm ? `${m[2]}-${mm}` : `${m[2]}-01`;
}
