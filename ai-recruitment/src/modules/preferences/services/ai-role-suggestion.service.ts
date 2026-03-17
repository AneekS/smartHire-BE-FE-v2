import { insforge } from "@/lib/insforge";
import type {
  RoleSuggestionInput,
  RoleSuggestionResult,
} from "@/modules/preferences/types/preferences.types";

const ROLE_KEYWORDS: Record<string, string[]> = {
  "Data Engineer": ["etl", "warehouse", "spark", "airflow", "dbt", "pipeline", "sql"],
  "ML Engineer": ["model", "tensorflow", "pytorch", "ml", "feature", "training", "inference"],
  "AI Engineer": ["llm", "rag", "agents", "prompt", "vector", "openai", "genai"],
  "Product Engineer": ["frontend", "react", "next", "api", "ux", "fullstack", "product"],
  "Backend Engineer": ["node", "api", "postgres", "redis", "microservices", "system design"],
};

function dedupeRoles(roles: string[]): string[] {
  return [...new Set(roles.map((role) => role.trim()).filter(Boolean))];
}

function ruleBasedRoles(input: RoleSuggestionInput): RoleSuggestionResult {
  const corpus = [
    input.resumeData ?? "",
    ...input.userSkills,
    ...input.githubProjects,
    ...input.previousRoles,
  ]
    .join(" ")
    .toLowerCase();

  const scored = Object.entries(ROLE_KEYWORDS)
    .map(([role, keywords]) => {
      const score = keywords.reduce((acc, keyword) => (corpus.includes(keyword) ? acc + 1 : acc), 0);
      return { role, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.role);

  const fallback = scored.length > 0 ? scored : ["Backend Engineer", "Product Engineer"];

  return {
    suggestedRoles: fallback,
    confidence: scored.length > 0 ? 0.72 : 0.56,
    source: "rule-based",
  };
}

export async function suggestRolesFromProfile(
  input: RoleSuggestionInput,
): Promise<RoleSuggestionResult> {
  const fallback = ruleBasedRoles(input);

  try {
    const prompt = `You are an expert recruiter AI. Analyze this candidate profile and return strict JSON only:\n\n${JSON.stringify(
      input,
      null,
      2,
    )}\n\nReturn shape:\n{\n  "suggestedRoles": ["Data Engineer", "ML Engineer"],\n  "confidence": 0.0 to 1.0\n}\nLimit to top 4 roles.`;

    const completion = await insforge.ai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      suggestedRoles?: string[];
      confidence?: number;
    };

    const suggestedRoles = dedupeRoles(parsed.suggestedRoles ?? []).slice(0, 4);
    if (suggestedRoles.length === 0) {
      return fallback;
    }

    return {
      suggestedRoles,
      confidence: Math.max(0.1, Math.min(1, parsed.confidence ?? 0.7)),
      source: "ai",
    };
  } catch {
    return fallback;
  }
}
