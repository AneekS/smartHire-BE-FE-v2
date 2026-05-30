import { SkillCanonicalizer } from "@/scoring/canonicalizer";
import { ONET_ALIAS_PAIRS } from "@/scoring/taxonomy/onet-aliases-data";

export interface SkillMatchResult {
  canonical: string;
  confidence: number;
  matchedAlias?: string;
}

let staticMap: Map<string, string> | null = null;
let dbLoaded = false;

function buildStaticMap(): Map<string, string> {
  if (staticMap) return staticMap;
  staticMap = new Map();
  for (const [alias, canonical] of ONET_ALIAS_PAIRS) {
    staticMap.set(alias.toLowerCase().trim(), canonical);
  }
  return staticMap;
}

async function ensureDbAliases(): Promise<void> {
  if (dbLoaded) return;
  await SkillCanonicalizer.load();
  dbLoaded = true;
}

export class OnetSkillTaxonomy {
  static normalizeForMatch(skillName: string): string {
    const key = skillName.trim().toLowerCase();
    const map = buildStaticMap();
    return map.get(key) ?? SkillCanonicalizer.canonicalize(skillName);
  }

  static findBestMatch(raw: string): SkillMatchResult {
    const key = raw.trim().toLowerCase();
    if (!key) return { canonical: raw.trim(), confidence: 0 };

    const map = buildStaticMap();
    const staticHit = map.get(key);
    if (staticHit) {
      return { canonical: staticHit, confidence: 1, matchedAlias: key };
    }

    const canonical = SkillCanonicalizer.canonicalize(raw);
    if (canonical.toLowerCase() !== key) {
      return { canonical, confidence: 0.85, matchedAlias: key };
    }

    for (const [alias, canon] of ONET_ALIAS_PAIRS) {
      if (key.includes(alias) || alias.includes(key)) {
        return { canonical: canon, confidence: 0.7, matchedAlias: alias };
      }
    }

    return { canonical: raw.trim(), confidence: 0.5 };
  }

  static async findBestMatchAsync(raw: string): Promise<SkillMatchResult> {
    await ensureDbAliases();
    return OnetSkillTaxonomy.findBestMatch(raw);
  }

  static get aliasCount(): number {
    return ONET_ALIAS_PAIRS.length;
  }
}
