import type { SectionType } from "@/parsing/preprocess.types";

const SECTION_ALIASES: Record<string, SectionType> = {
  summary: "SUMMARY",
  "professional summary": "SUMMARY",
  profile: "SUMMARY",
  objective: "SUMMARY",
  experience: "EXPERIENCE",
  "work experience": "EXPERIENCE",
  "work experiences": "EXPERIENCE",
  employment: "EXPERIENCE",
  "work history": "EXPERIENCE",
  educations: "EDUCATION",
  "educations:": "EDUCATION",
  skills: "SKILLS",
  "technical skills": "SKILLS",
  competencies: "SKILLS",
  education: "EDUCATION",
  academic: "EDUCATION",
  qualifications: "EDUCATION",
  certifications: "CERTIFICATIONS",
  licenses: "CERTIFICATIONS",
  credentials: "CERTIFICATIONS",
  achievements: "ACHIEVEMENTS",
  accomplishments: "ACHIEVEMENTS",
  awards: "ACHIEVEMENTS",
};

function normalizeHeader(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/[:\-–—|•*#]+$/g, "")
    .trim()
    .toLowerCase();
}

function classifyHeader(line: string): SectionType | null {
  const normalized = normalizeHeader(line);
  if (!normalized) return null;

  if (SECTION_ALIASES[normalized]) return SECTION_ALIASES[normalized];

  const upper = line.replace(/^#+\s*/, "").trim();
  if (upper.length >= 3 && upper.length <= 40 && upper === upper.toUpperCase()) {
    const key = upper.toLowerCase();
    if (SECTION_ALIASES[key]) return SECTION_ALIASES[key];
  }

  for (const [alias, type] of Object.entries(SECTION_ALIASES)) {
    if (normalized === alias || normalized.startsWith(`${alias} `)) {
      return type;
    }
  }

  return null;
}

function isLikelyHeader(line: string, nextLine: string | undefined): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;

  if (trimmed.startsWith("##")) return true;

  const section = classifyHeader(trimmed);
  if (section) {
    if (!nextLine || nextLine.trim() === "" || nextLine.trim().startsWith("-")) {
      return true;
    }
    if (/^[A-Z\s&\/]+$/.test(trimmed.replace(/^#+\s*/, ""))) return true;
  }

  return false;
}

export class SectionDetector {
  static detect(rawText: string): Partial<Record<SectionType, string>> {
    const lines = rawText.split("\n");
    const sections: Partial<Record<SectionType, string>> = {};
    const buffers: Partial<Record<SectionType, string[]>> = {};

    let current: SectionType | null = null;

    const flush = () => {
      if (!current || !buffers[current]?.length) return;
      sections[current] = buffers[current]!.join("\n").trim();
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      const headerType = isLikelyHeader(line, nextLine) ? classifyHeader(line) : null;

      if (headerType) {
        flush();
        current = headerType;
        if (!buffers[current]) buffers[current] = [];
        continue;
      }

      const target = current ?? "OTHER";
      if (!buffers[target]) buffers[target] = [];
      buffers[target]!.push(line);
    }

    flush();

    if (buffers.OTHER?.length && !sections.OTHER) {
      sections.OTHER = buffers.OTHER.join("\n").trim();
    }

    return sections;
  }
}

/** Map SectionType keys to extractor field names for Pass 2 gap fill. */
export function sectionsToExtractorContext(
  sections: Partial<Record<SectionType, string>>,
  lowFields: string[]
): Record<string, string> {
  const fieldMap: Record<string, SectionType> = {
    personalInfo: "OTHER",
    summary: "SUMMARY",
    experience: "EXPERIENCE",
    skills: "SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    achievements: "ACHIEVEMENTS",
    projects: "OTHER",
  };

  const out: Record<string, string> = {};
  for (const field of lowFields) {
    const sectionKey = fieldMap[field] ?? "OTHER";
    const text = sections[sectionKey];
    if (text) out[field] = text;
  }
  return out;
}
