import { prisma } from "@/lib/db";
import { suggestRolesFromProfile } from "@/modules/preferences/services/ai-role-suggestion.service";
import { getSalaryInsights } from "@/modules/preferences/services/salary-insight.service";
import type { CareerTrajectoryInsight } from "@/modules/preferences/types/preferences.types";
import { getUserPreference } from "@/modules/preferences/services/preference.service";

function normalizeSkills(skills: string[]): Set<string> {
  return new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean));
}

function calculateScore(role: string, skills: Set<string>, priorRoles: string[]): { score: number; strengths: string[]; skillGaps: string[] } {
  const roleSkillMap: Record<string, string[]> = {
    "Backend Engineer": ["node", "postgres", "redis", "system design", "api"],
    "Data Engineer": ["sql", "spark", "airflow", "etl", "warehouse"],
    "ML Engineer": ["python", "pytorch", "tensorflow", "ml", "feature engineering"],
    "AI Engineer": ["llm", "prompt", "rag", "vector", "python"],
    "Product Engineer": ["react", "next", "api", "ux", "typescript"],
  };

  const expected = roleSkillMap[role] ?? ["communication", "problem solving", "system design"];
  const strengths = expected.filter((skill) => skills.has(skill.toLowerCase()));
  const skillGaps = expected.filter((skill) => !skills.has(skill.toLowerCase()));

  const base = expected.length > 0 ? (strengths.length / expected.length) * 100 : 0;
  const roleHistoryBoost = priorRoles.some((prior) => prior.toLowerCase().includes(role.toLowerCase())) ? 8 : 0;
  const score = Math.min(100, Math.round(base + roleHistoryBoost));

  return { score, strengths, skillGaps };
}

async function getRoleFitRows(userId: string, limit = 8) {
  try {
    return await prisma.roleFitScore.findMany({
      where: { userId },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        userId: true,
        role: true,
        score: true,
        strengths: true,
        skillGaps: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("[ROLE_FIT][getRoleFitRows]", error);
    return [];
  }
}

export async function calculateRoleFitScore(userId: string) {
  try {
    const [user, candidate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, headline: true, location: true },
      }),
      prisma.candidate.findFirst({
        where: { userId },
        select: {
          id: true,
          summary: true,
          skills: true,
        },
      }),
    ]);

    if (!user || !candidate) {
      return [];
    }

    const [experiences, projects, skillRecords, preference] = await Promise.all([
      prisma.experience.findMany({
        where: { candidateId: candidate.id },
        select: { jobTitle: true },
        orderBy: { startDate: "desc" },
        take: 8,
      }),
      prisma.project.findMany({
        where: { candidateId: candidate.id },
        select: { title: true, technologies: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
      prisma.skill.findMany({
        where: { candidateId: candidate.id },
        select: { name: true },
        take: 40,
      }),
      getUserPreference(userId),
    ]);

    const profileText = [
      user.headline,
      candidate.summary,
      ...experiences.map((exp) => exp.jobTitle),
      ...projects.map((project) => project.title),
    ]
      .filter(Boolean)
      .join(" ");

    const userSkills = [
      ...(candidate.skills ?? []),
      ...skillRecords.map((s) => s.name),
      ...projects.flatMap((p) => p.technologies ?? []),
    ];

    const previousRoles = experiences.map((e) => e.jobTitle);

    const roleHints = await suggestRolesFromProfile({
      resumeData: profileText,
      userSkills,
      githubProjects: projects.map((project) => project.title),
      previousRoles,
    });

    const candidateRoles = [
      preference?.primaryRole,
      ...(preference?.secondaryRoles ?? []),
      ...roleHints.suggestedRoles,
    ].filter(Boolean) as string[];

    const uniqueRoles = [...new Set(candidateRoles)].slice(0, 8);
    const skillSet = normalizeSkills(userSkills);

    const scored = uniqueRoles.map((role) => {
      const roleScore = calculateScore(role, skillSet, previousRoles);
      return {
        userId,
        role,
        score: roleScore.score,
        strengths: roleScore.strengths,
        skillGaps: roleScore.skillGaps,
      };
    });

    await prisma.$transaction(async (tx) => {
      await tx.roleFitScore.deleteMany({ where: { userId } });

      if (scored.length > 0) {
        await tx.roleFitScore.createMany({
          data: scored.map((row) => ({
            userId: row.userId,
            role: row.role,
            score: row.score,
            strengths: row.strengths,
            skillGaps: row.skillGaps,
          })),
        });
      }
    });

    return getRoleFitRows(userId, 8);
  } catch (error) {
    console.error("[ROLE_FIT][calculateRoleFitScore]", error);
    return [];
  }
}

export async function getRoleFitScores(userId: string, limit = 6) {
  return getRoleFitRows(userId, limit);
}

export async function getCareerTrajectoryInsights(userId: string): Promise<CareerTrajectoryInsight | null> {
  try {
    const [scores, pref] = await Promise.all([getRoleFitRows(userId, 1), getUserPreference(userId)]);
    const top = scores[0];

    if (!top) {
      return null;
    }

    const nextRoleMap: Record<string, string> = {
      "Backend Engineer": "Senior Backend Engineer",
      "Product Engineer": "Staff Product Engineer",
      "Data Engineer": "Senior Data Engineer",
      "ML Engineer": "Senior ML Engineer",
      "AI Engineer": "Applied AI Lead",
    };

    const nextRole = nextRoleMap[top.role] ?? `Senior ${top.role}`;
    const location = pref?.preferredLocations?.[0] ?? "Bangalore";
    const salary = await getSalaryInsights(nextRole, location, "SENIOR");

    const timeline = pref?.experienceLevel === "ENTRY" ? "2-3 years" : pref?.experienceLevel === "MID" ? "1-2 years" : "1 year";

    return {
      currentRole: top.role,
      nextRole,
      estimatedSalary: salary.salaryMedian,
      timeline,
      skillsToAcquire: top.skillGaps.slice(0, 4),
    };
  } catch (error) {
    console.error("[ROLE_FIT][getCareerTrajectoryInsights]", error);
    return null;
  }
}
