#!/usr/bin/env node
/**
 * Generates resume fixture pairs (.txt + .expected.json) for accuracy testing.
 * Run: node scripts/generate-resume-fixtures.mjs
 */
import { writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "src", "parsing", "fixtures", "resumes");

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Avery",
  "Quinn", "Blake", "Drew", "Jamie", "Skyler", "Reese", "Cameron", "Dakota",
  "Harper", "Logan", "Parker", "Sage", "Rowan", "Emery", "Finley", "Hayden",
];
const LAST_NAMES = [
  "Chen", "Patel", "Kim", "Nguyen", "Garcia", "Smith", "Johnson", "Williams",
  "Brown", "Jones", "Miller", "Davis", "Wilson", "Moore", "Taylor", "Anderson",
  "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Robinson", "Clark",
];
const TECH_COMPANIES = ["Stripe", "Meta", "Google", "Amazon", "Netflix", "Uber", "Airbnb", "Databricks"];
const FINANCE_COMPANIES = ["Goldman Sachs", "JPMorgan", "BlackRock", "Citadel", "Morgan Stanley", "Vanguard"];
const HEALTH_COMPANIES = ["Mayo Clinic", "Kaiser", "Johns Hopkins", "Cleveland Clinic", "Mass General"];
const UNIVERSITIES = ["MIT", "Stanford", "UC Berkeley", "Harvard", "Oxford", "ETH Zurich", "IIT Delhi", "NUS"];

function baseExpected(name, domain, title, company, skills, years) {
  return {
    personalInfo: {
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      phone: null,
      location: domain === "INTERNATIONAL" ? "London, UK" : "San Francisco, CA",
      linkedIn: null,
      github: null,
      portfolio: null,
    },
    summary: `${title} with ${years} years of experience in ${domain.toLowerCase()} roles.`,
    industryDomain: domain === "INTERNATIONAL" ? "TECH" : domain,
    seniorityBand: years >= 8 ? "L5" : years >= 5 ? "L4" : "L3",
    yearsOfExperience: years,
    skills: skills.map((s) => ({ name: s, domain: "BACKEND", proficiencyLevel: 4 })),
    experience: [
      {
        company,
        title,
        startDate: `${2024 - years}-03`,
        endDate: null,
        isCurrent: true,
        durationMonths: years * 12,
        responsibilities: ["Led key initiatives", "Collaborated cross-functionally"],
        achievements: [`Improved systems serving ${100 + years * 50}k users`],
        techStack: skills.slice(0, 3),
      },
    ],
    education: [
      {
        institution: UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)],
        degree: domain === "ACADEMIC" ? "PhD" : "BS",
        field: domain === "FINANCE" ? "Finance" : domain === "HEALTHCARE" ? "Nursing" : "Computer Science",
        startYear: 2014,
        endYear: 2018,
        gpa: 3.7,
      },
    ],
    projects: [],
    certifications: domain === "HEALTHCARE" ? [{ name: "RN License", issuer: "State Board", year: 2020 }] : [],
    achievements: [],
  };
}

function standardTxt(name, title, company, skills, domain) {
  return `${name.toUpperCase()}
${title} at ${company}
${skills.join(" | ")}

EXPERIENCE
${company} — ${title} | Mar ${2019} - Present
- Built scalable systems and APIs
- ${skills[0]} and ${skills[1]} expertise

EDUCATION
${UNIVERSITIES[0]} | BS ${domain === "FINANCE" ? "Finance" : domain === "HEALTHCARE" ? "Nursing" : "Computer Science"} | 2014-2018
`;
}

function creativeTxt(name, title, company) {
  return `✦ ${name} ✦
Creative ${title}
Currently @ ${company}

about me → passionate builder with unconventional path

work → ${company} (${title}, 2020-now)
education → self-taught + bootcamp
skills → design thinking, prototyping, leadership
`;
}

function internationalTxt(name, title, company) {
  return `${name}
${title}, ${company}
London, United Kingdom

Experience
${company} | ${title} | 03/2019 – Present
• Delivered platform upgrades across EU markets

Education
University of Edinburgh | MSc Computer Science | 2016 – 2018
`;
}

function academicTxt(name, title, institution) {
  return `${name}, PhD
Research Scientist | ${institution}

PUBLICATIONS
- Neural Methods for Document Understanding (2023)
- Structured Extraction from Scientific CVs (2021)

EXPERIENCE
${institution} | Postdoctoral Researcher | 2019-Present

EDUCATION
${institution} | PhD Computer Science | 2014-2018
`;
}

const fixtures = [];

for (let i = 0; i < 8; i++) {
  const name = `${FIRST_NAMES[i]} ${LAST_NAMES[i]}`;
  const company = TECH_COMPANIES[i % TECH_COMPANIES.length];
  const skills = ["TypeScript", "Node.js", "PostgreSQL", "AWS"].slice(0, 3 + (i % 2));
  const years = 3 + (i % 6);
  const id = `generated_standard_tech_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "standard",
    txt: standardTxt(name, "Software Engineer", company, skills, "TECH"),
    expected: baseExpected(name, "TECH", "Software Engineer", company, skills, years),
  });
}

for (let i = 0; i < 8; i++) {
  const name = `${FIRST_NAMES[i + 8]} ${LAST_NAMES[i + 8]}`;
  const company = FINANCE_COMPANIES[i % FINANCE_COMPANIES.length];
  const skills = ["Excel", "Python", "SQL", "Bloomberg"];
  const years = 4 + (i % 5);
  const id = `generated_standard_finance_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "standard",
    txt: standardTxt(name, "Financial Analyst", company, skills, "FINANCE"),
    expected: baseExpected(name, "FINANCE", "Financial Analyst", company, skills, years),
  });
}

for (let i = 0; i < 9; i++) {
  const name = `${FIRST_NAMES[i + 16]} ${LAST_NAMES[i + 16]}`;
  const company = HEALTH_COMPANIES[i % HEALTH_COMPANIES.length];
  const skills = ["Patient Care", "Epic EMR", "Clinical Protocols"];
  const years = 2 + (i % 8);
  const id = `generated_standard_healthcare_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "standard",
    txt: standardTxt(name, "Registered Nurse", company, skills, "HEALTHCARE"),
    expected: baseExpected(name, "HEALTHCARE", "Registered Nurse", company, skills, years),
  });
}

for (let i = 0; i < 10; i++) {
  const name = `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[i + 10]}`;
  const company = TECH_COMPANIES[(i + 3) % TECH_COMPANIES.length];
  const id = `generated_creative_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "nonStandard",
    txt: creativeTxt(name, "Product Designer", company),
    expected: baseExpected(name, "TECH", "Product Designer", company, ["Figma", "UX Research"], 5),
  });
}

for (let i = 0; i < 8; i++) {
  const name = `${FIRST_NAMES[i + 5]} ${LAST_NAMES[i + 15]}`;
  const company = TECH_COMPANIES[i % TECH_COMPANIES.length];
  const id = `generated_international_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "nonStandard",
    txt: internationalTxt(name, "Platform Engineer", company),
    expected: baseExpected(name, "INTERNATIONAL", "Platform Engineer", company, ["Go", "Kubernetes"], 6),
  });
}

for (let i = 0; i < 9; i++) {
  const name = `Dr. ${FIRST_NAMES[i + 12]} ${LAST_NAMES[i + 12]}`;
  const institution = UNIVERSITIES[i % UNIVERSITIES.length];
  const id = `generated_academic_${String(i + 1).padStart(2, "0")}`;
  fixtures.push({
    id,
    category: "nonStandard",
    txt: academicTxt(name, "Research Scientist", institution),
    expected: baseExpected(name, "ACADEMIC", "Research Scientist", institution, ["Python", "ML", "NLP"], 7),
  });
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let written = 0;
for (const f of fixtures) {
  const txtPath = path.join(outDir, `${f.id}.txt`);
  const jsonPath = path.join(outDir, `${f.id}.expected.json`);
  if (existsSync(txtPath) && existsSync(jsonPath)) continue;
  writeFileSync(txtPath, f.txt, "utf8");
  writeFileSync(jsonPath, JSON.stringify(f.expected, null, 2) + "\n", "utf8");
  written++;
}

console.log(`Generated ${written} new fixture pairs (${fixtures.length} total defined, ${fixtures.length + 6} with originals).`);
