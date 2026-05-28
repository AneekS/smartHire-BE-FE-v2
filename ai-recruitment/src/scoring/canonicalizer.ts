import { prisma } from "@/lib/db";

const BUILTIN_ALIASES: Record<string, string> = {
  js: "JavaScript",
  py: "Python",
  k8s: "Kubernetes",
  postgres: "PostgreSQL",
  "react.js": "React",
  reactjs: "React",
  node: "Node.js",
  nodejs: "Node.js",
  "node.js": "Node.js",
  ts: "TypeScript",
  golang: "Go",
  "c++": "C++",
  cpp: "C++",
};

let aliasMap: Map<string, string> | null = null;
let loadPromise: Promise<void> | null = null;

export class SkillCanonicalizer {
  static async load(): Promise<void> {
    if (aliasMap) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const map = new Map<string, string>();
      for (const [alias, canonical] of Object.entries(BUILTIN_ALIASES)) {
        map.set(alias.toLowerCase(), canonical);
      }
      try {
        const rows = await prisma.skillAlias.findMany();
        for (const row of rows) {
          map.set(row.alias.toLowerCase(), row.canonical);
        }
      } catch {
        /* table may not exist yet */
      }
      aliasMap = map;
    })();

    return loadPromise;
  }

  static canonicalize(skillName: string): string {
    const key = skillName.trim().toLowerCase();
    if (!aliasMap) {
      return BUILTIN_ALIASES[key] ?? skillName.trim();
    }
    return aliasMap.get(key) ?? skillName.trim();
  }

  static normalizeForMatch(skillName: string): string {
    return SkillCanonicalizer.canonicalize(skillName).toLowerCase();
  }

  /** Reset map (for tests). */
  static reset(): void {
    aliasMap = null;
    loadPromise = null;
  }

  /** Reload aliases from DB (after taxonomy expansion). */
  static async reload(): Promise<void> {
    SkillCanonicalizer.reset();
    await SkillCanonicalizer.load();
  }
}

export function canonicalize(skillName: string): string {
  return SkillCanonicalizer.canonicalize(skillName);
}
