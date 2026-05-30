import {
  PASS2_CONFIDENCE_THRESHOLD,
  PASS3_CONFIDENCE_THRESHOLD,
} from "@/parsing/constants";
import {
  averageConfidence,
  getLowConfidenceFields,
  hasMissingRequiredFields,
} from "@/parsing/extraction-confidence";
import type { ExtractionResumeSchemaType } from "@/parsing/ExtractionSchema";
import { CrossFieldValidator } from "@/parsing/validator";

export function shouldRunPass2(schema: ExtractionResumeSchemaType): boolean {
  const avg = averageConfidence(schema.field_confidence ?? {});
  if (avg < PASS2_CONFIDENCE_THRESHOLD) return true;
  if (hasMissingRequiredFields(schema)) return true;
  const lowFields = getLowConfidenceFields(
    schema.field_confidence ?? {},
    PASS2_CONFIDENCE_THRESHOLD
  );
  return lowFields.length > 0;
}

export function shouldRunPass3(schema: ExtractionResumeSchemaType): boolean {
  const avg = averageConfidence(schema.field_confidence ?? {});
  if (avg < PASS3_CONFIDENCE_THRESHOLD) return true;

  const prelim = CrossFieldValidator.validate(schema);
  const critical = prelim.flags.some((f) =>
    ["SENIORITY_MISMATCH", "MISSING_CONTACT", "EMPTY_EXPERIENCE"].includes(f)
  );
  return critical || prelim.issues.length > 2;
}
