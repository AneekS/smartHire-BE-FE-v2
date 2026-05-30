/** Phase 3 extraction thresholds */
export const PASS2_CONFIDENCE_THRESHOLD = 0.75;
export const PASS3_CONFIDENCE_THRESHOLD = 0.85;
export const MANUAL_REVIEW_THRESHOLD = 0.6;
export const OLLAMA_EXTRACTION_TEMPERATURE = 0.1;
export const EMBED_DIMENSIONS = 4096;

/** Required fields for pass-2 trigger when missing */
export const REQUIRED_EXTRACTION_FIELDS = [
  "personalInfo",
  "skills",
  "experience",
] as const;
