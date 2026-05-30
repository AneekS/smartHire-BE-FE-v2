import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";

export function getLowConfidenceFields(
  confidenceMap: Record<string, number>,
  threshold: number
): string[] {
  return Object.entries(confidenceMap)
    .filter(([, v]) => v < threshold)
    .map(([k]) => k);
}

export function averageConfidence(confidenceMap: Record<string, number>): number {
  const values = Object.values(confidenceMap);
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function hasMissingRequiredFields(schema: ExtractionResumeSchemaType): boolean {
  if (!schema.personalInfo.name?.trim()) return true;
  if (!schema.skills.length) return true;
  if (!schema.experience.length) return true;
  return false;
}
