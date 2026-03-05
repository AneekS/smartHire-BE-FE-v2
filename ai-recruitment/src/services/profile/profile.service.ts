/**
 * Profile Service
 * Central service for all candidate profile CRUD operations.
 * Orchestrates Prisma queries, completeness recalculation, and version snapshots.
 */

import { prisma } from "@/lib/db";
import { refreshCompleteness } from "./completeness.service";
import type {
  BasicIdentityInput,
  EducationInput,
  ExperienceInput,
  SkillInput,
  ProjectInput,
  CertificationInput,
  CareerPreferenceInput,
  PrivacyInput,
} from "@/lib/validators/profile.schemas";

// ─── Full Profile Query ──────────────────────────────────────────────────────

export const FULL_PROFILE_SELECT = {
  id:                  true,
  name:                true,
  email:               true,
  phone:               true,
  headline:            true,
  location:            true,
  city:                true,
  country:             true,
  photoUrl:            true,
  summary:             true,
  profileCompleteness: true,
  resumeUrl:           true,
  availability:        true,
  workAuthorization:   true,
  openToFreelance:     true,
  internshipInterest:  true,
  languagesSpoken:     true,
  user: {
    select: {
      id:            true,
      email:         true,
      image:         true,
      linkedInUrl:   true,
      githubUrl:     true,
      websiteUrl:    true,
      jobAlerts:     true,
      aiSuggestions: true,
      publicProfile: true,
      reputationScore:true,
      technicalScore: true,
      softScore:      true,
    },
  },
  educations:     { orderBy: { order: "asc" as const } },
  skillRecords:   { orderBy: { createdAt: "asc" as const } },
  experiences:    { orderBy: { order: "asc" as const } },
  projects:       { orderBy: { order: "asc" as const } },
  certifications: { orderBy: { createdAt: "asc" as const } },
  careerPreference: true,
  privacy:          true,
  aiInsights:       true,
  reputation:       true,
} as const;

// ─── Get or create candidate by user email ────────────────────────────────────

export async function getOrCreateCandidate(userEmail: string) {
  let candidate = await prisma.candidate.findUnique({
    where: { email: userEmail },
    select: FULL_PROFILE_SELECT,
  });

  if (!candidate) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new Error("User not found");

    const created = await prisma.candidate.create({
      data: {
        userId: user.id,
        email:  user.email,
        name:   user.name || "Unknown",
      },
      select: FULL_PROFILE_SELECT,
    });
    candidate = created;
  }

  return candidate;
}

// ─── Identity ─────────────────────────────────────────────────────────────────

export async function updateIdentity(candidateId: string, data: BasicIdentityInput) {
  const updated = await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      name:               data.name,
      headline:           data.headline,
      phone:              data.phone,
      location:           data.location,
      city:               data.city,
      country:            data.country,
      photoUrl:           data.photoUrl,
      summary:            data.summary,
      availability:       data.availability,
      workAuthorization:  data.workAuthorization,
      openToFreelance:    data.openToFreelance,
      internshipInterest: data.internshipInterest,
      languagesSpoken:    data.languagesSpoken,
    },
    select: FULL_PROFILE_SELECT,
  });
  await refreshCompleteness(candidateId);
  return updated;
}

// ─── Education ────────────────────────────────────────────────────────────────

export async function addEducation(candidateId: string, data: EducationInput) {
  const education = await prisma.education.create({
    data: { candidateId, ...data },
  });
  await refreshCompleteness(candidateId);
  return education;
}

export async function updateEducation(id: string, candidateId: string, data: Partial<EducationInput>) {
  const education = await prisma.education.update({
    where: { id, candidateId },
    data,
  });
  await refreshCompleteness(candidateId);
  return education;
}

export async function deleteEducation(id: string, candidateId: string) {
  await prisma.education.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Experience ───────────────────────────────────────────────────────────────

export async function addExperience(candidateId: string, data: ExperienceInput) {
  const experience = await prisma.experience.create({
    data: {
      candidateId,
      company:        data.company,
      jobTitle:       data.jobTitle,
      employmentType: data.employmentType,
      location:       data.location,
      startDate:      new Date(data.startDate),
      endDate:        data.endDate ? new Date(data.endDate) : null,
      isCurrent:      data.isCurrent ?? false,
      description:    data.description,
      achievements:   data.achievements ?? [],
      technologies:   data.technologies ?? [],
    },
  });
  await refreshCompleteness(candidateId);
  return experience;
}

export async function updateExperience(id: string, candidateId: string, data: Partial<ExperienceInput>) {
  const experience = await prisma.experience.update({
    where: { id, candidateId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate   ? new Date(data.endDate)   : data.isCurrent ? null : undefined,
    },
  });
  await refreshCompleteness(candidateId);
  return experience;
}

export async function deleteExperience(id: string, candidateId: string) {
  await prisma.experience.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Skills ───────────────────────────────────────────────────────────────────

export async function addSkill(candidateId: string, data: SkillInput) {
  // Prevent duplicates (case-insensitive)
  const existing = await prisma.skill.findFirst({
    where: { candidateId, name: { equals: data.name, mode: "insensitive" } },
  });
  if (existing) return existing;

  const skill = await prisma.skill.create({ data: { candidateId, ...data } });
  await refreshCompleteness(candidateId);
  return skill;
}

export async function deleteSkill(id: string, candidateId: string) {
  await prisma.skill.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

export async function bulkUpsertSkills(candidateId: string, skills: SkillInput[]) {
  await prisma.$transaction([
    prisma.skill.deleteMany({ where: { candidateId } }),
    prisma.skill.createMany({
      data: skills.map((s) => ({ candidateId, ...s })),
    }),
  ]);
  await refreshCompleteness(candidateId);
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function addProject(candidateId: string, data: ProjectInput) {
  const project = await prisma.project.create({
    data: {
      candidateId,
      title:        data.title,
      description:  data.description,
      technologies: data.technologies ?? [],
      repoUrl:      data.repoUrl || null,
      demoUrl:      data.demoUrl || null,
      teamRole:     data.teamRole,
      startDate:    data.startDate ? new Date(data.startDate) : null,
      endDate:      data.endDate   ? new Date(data.endDate)   : null,
      isCurrent:    data.isCurrent ?? false,
    },
  });
  await refreshCompleteness(candidateId);
  return project;
}

export async function updateProject(id: string, candidateId: string, data: Partial<ProjectInput>) {
  const project = await prisma.project.update({
    where: { id, candidateId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate:   data.endDate   ? new Date(data.endDate)   : undefined,
    },
  });
  await refreshCompleteness(candidateId);
  return project;
}

export async function deleteProject(id: string, candidateId: string) {
  await prisma.project.delete({ where: { id, candidateId } });
  await refreshCompleteness(candidateId);
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function addCertification(candidateId: string, data: CertificationInput) {
  return prisma.certification.create({
    data: {
      candidateId,
      name:          data.name,
      issuer:        data.issuer,
      issueDate:     data.issueDate  ? new Date(data.issueDate)  : null,
      expiryDate:    data.expiryDate ? new Date(data.expiryDate) : null,
      credentialId:  data.credentialId,
      credentialUrl: data.credentialUrl || null,
    },
  });
}

export async function updateCertification(id: string, candidateId: string, data: Partial<CertificationInput>) {
  return prisma.certification.update({
    where: { id, candidateId },
    data: {
      ...data,
      issueDate:  data.issueDate  ? new Date(data.issueDate)  : undefined,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    },
  });
}

export async function deleteCertification(id: string, candidateId: string) {
  await prisma.certification.delete({ where: { id, candidateId } });
}

// ─── Career Preferences ───────────────────────────────────────────────────────

export async function upsertCareerPreference(candidateId: string, data: CareerPreferenceInput) {
  const pref = await prisma.careerPreference.upsert({
    where:  { candidateId },
    create: { candidateId, ...data },
    update: data,
  });
  await refreshCompleteness(candidateId);
  return pref;
}

// ─── Privacy ──────────────────────────────────────────────────────────────────

export async function upsertPrivacy(candidateId: string, data: PrivacyInput) {
  return prisma.profilePrivacy.upsert({
    where:  { candidateId },
    create: { candidateId, ...data },
    update: data,
  });
}

// ─── Profile Version Snapshot ─────────────────────────────────────────────────

export async function snapshotProfile(candidateId: string, snapshot: object) {
  const last = await prisma.profileVersion.findFirst({
    where:   { candidateId },
    orderBy: { version: "desc" },
    select:  { version: true },
  });
  await prisma.profileVersion.create({
    data: {
      candidateId,
      version:  (last?.version ?? 0) + 1,
      snapshot: snapshot as never,
    },
  });
}
