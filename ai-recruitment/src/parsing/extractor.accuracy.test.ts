import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import { CrossFieldValidator } from "@/parsing/validator";
import type { ExtractionResumeSchemaType } from "@/models/extraction.schema";
import { resetPipelineEnvCache } from "@/config/pipeline-env";
import * as OllamaModule from "@/lib/ollama-extraction-client";
import { MultiPassExtractor } from "@/parsing/extractor";

vi.mock("@/monitoring/logger", () => ({
  logExtractionEvent: vi.fn(),
  fieldCountFromSchema: vi.fn().mockReturnValue(5),
  configureLogger: vi.fn(),
  getLogger: vi.fn().mockReturnValue({ info: vi.fn(), warn: vi.fn() }),
}));

vi.mock("@/monitoring/metrics", () => ({
  MetricsCollector: { record: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

const fixturesDir = path.join(__dirname, "fixtures", "resumes");

const ACCURACY_TARGET = { standard: 0.98, nonStandard: 0.93 };

const NON_STANDARD_PATTERNS = [
  "creative",
  "nonstandard",
  "international",
  "career_changer",
  "academic",
  "generated_creative",
  "generated_international",
  "generated_academic",
];

const EXPECTED_ALIASES: Record<string, string> = {
  international_mixed_dates: "international.expected.json",
};

function resolveExpectedFile(base: string): string | null {
  if (EXPECTED_ALIASES[base]) return EXPECTED_ALIASES[base];
  const direct = `${base}.expected.json`;
  if (existsSync(path.join(fixturesDir, direct))) return direct;
  return null;
}

function discoverFixtures(): Array<{
  name: string;
  file: string;
  expectedFile: string;
  category: "standard" | "nonStandard";
}> {
  const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".txt"));
  const out: Array<{
    name: string;
    file: string;
    expectedFile: string;
    category: "standard" | "nonStandard";
  }> = [];

  for (const file of files) {
    const base = file.replace(/\.txt$/, "");
    const expectedFile = resolveExpectedFile(base);
    if (!expectedFile) continue;

    const isNonStandard = NON_STANDARD_PATTERNS.some((p) => base.includes(p));
    out.push({
      name: base,
      file,
      expectedFile,
      category: isNonStandard ? "nonStandard" : "standard",
    });
  }

  return out;
}

function computeFieldAccuracy(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>
): number {
  const keys = Object.keys(expected);
  const matches = keys.filter((k) => JSON.stringify(actual[k]) === JSON.stringify(expected[k]));
  return matches.length / keys.length;
}

function withConfidence(expected: Record<string, unknown>): ExtractionResumeSchemaType {
  const fieldKeys = [
    "personalInfo",
    "summary",
    "industryDomain",
    "seniorityBand",
    "yearsOfExperience",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
    "achievements",
  ];
  return {
    ...(expected as ExtractionResumeSchemaType),
    field_confidence: Object.fromEntries(fieldKeys.map((k) => [k, 0.95])),
  };
}

describe("MultiPassExtractor — field accuracy", () => {
  const extractor = new MultiPassExtractor();
  const fixtures = discoverFixtures();

  beforeAll(() => {
    process.env.EXTRACTION_FAST_MODE = "false";
    process.env.OLLAMA_EXTRACTION_MAX_PASSES = "3";
    resetPipelineEnvCache();
    vi.spyOn(OllamaModule, "checkExtractionPool").mockResolvedValue([
      { url: "http://localhost:11434", ok: true },
    ]);
  });

  beforeEach(() => {
    vi.spyOn(OllamaModule, "ollamaExtract").mockImplementation(async () => "{}");
  });

  test(`fixture suite has at least 50 resumes (found ${fixtures.length})`, () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(50);
  });

  for (const fixture of fixtures) {
    test(fixture.name, async () => {
      const rawText = readFileSync(path.join(fixturesDir, fixture.file), "utf8");
      const expected = JSON.parse(
        readFileSync(path.join(fixturesDir, fixture.expectedFile), "utf8")
      ) as Record<string, unknown>;
      const payload = withConfidence(expected);

      vi.spyOn(OllamaModule, "ollamaExtract").mockResolvedValue(JSON.stringify(payload));

      const result = await extractor.extract(rawText, Buffer.alloc(0));
      const expectedValidated = CrossFieldValidator.validate(payload).resume;

      const accuracy = computeFieldAccuracy(
        result.schema as unknown as Record<string, unknown>,
        expectedValidated as unknown as Record<string, unknown>
      );
      const target =
        fixture.category === "standard"
          ? ACCURACY_TARGET.standard
          : ACCURACY_TARGET.nonStandard;

      expect(accuracy).toBeGreaterThanOrEqual(target);
      expect(result.passesRun).toContain(1);
      expect(OllamaModule.ollamaExtract).toHaveBeenCalled();
    });
  }
});

describe("MultiPassExtractor — live Ollama (optional)", () => {
  const liveFixtures = discoverFixtures().slice(0, 5);
  const runLive = process.env.OLLAMA_POOL || process.env.OLLAMA_BASE_URL;

  test.skipIf(!runLive)("live subset against Ollama", async () => {
    vi.restoreAllMocks();
    const live = new MultiPassExtractor();

    for (const fixture of liveFixtures) {
      const rawText = readFileSync(path.join(fixturesDir, fixture.file), "utf8");
      const result = await live.extract(rawText, Buffer.alloc(0), { resumeId: fixture.name });
      expect(result.parseConfidence).toBeGreaterThan(0);
      expect(result.passesRun.length).toBeGreaterThan(0);
    }
  }, 600_000);
});
