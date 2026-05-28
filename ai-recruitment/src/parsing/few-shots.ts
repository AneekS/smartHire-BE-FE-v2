export type Industry = "TECH" | "FINANCE" | "HEALTHCARE" | "SALES" | "LEGAL" | "GENERAL";

export const FEW_SHOT_BANK: Record<Industry, string[]> = {
  TECH: [
    JSON.stringify({
      industryDomain: "TECH",
      seniorityBand: "L4",
      yearsOfExperience: 6,
      skills: [
        { name: "Node.js", domain: "BACKEND", proficiencyLevel: 5 },
        { name: "PostgreSQL", domain: "DATABASES", proficiencyLevel: 4 },
        { name: "Docker", domain: "DEVOPS", proficiencyLevel: 4 },
        { name: "AWS", domain: "CLOUD", proficiencyLevel: 3 },
      ],
      achievements: [
        "Reduced API response time by 40% via query optimization",
        "Led migration to microservices serving 2M+ daily users",
      ],
    }),
    JSON.stringify({
      industryDomain: "TECH",
      seniorityBand: "L3",
      yearsOfExperience: 4,
      skills: [
        { name: "React", domain: "FRONTEND", proficiencyLevel: 4 },
        { name: "TypeScript", domain: "BACKEND", proficiencyLevel: 4 },
        { name: "MongoDB", domain: "DATABASES", proficiencyLevel: 3 },
      ],
      achievements: [
        "Delivered 12 features across 3 product lines in 6-month sprint",
        "Improved Lighthouse score from 54 to 91 across 5 pages",
      ],
    }),
    JSON.stringify({
      industryDomain: "TECH",
      seniorityBand: "L5",
      yearsOfExperience: 10,
      skills: [
        { name: "Kubernetes", domain: "DEVOPS", proficiencyLevel: 5 },
        { name: "Go", domain: "BACKEND", proficiencyLevel: 5 },
        { name: "TensorFlow", domain: "DATA_AI", proficiencyLevel: 3 },
      ],
      achievements: [
        "Architected multi-region deployment cutting p99 latency from 800ms to 120ms",
        "Managed team of 8 engineers across 3 time zones",
        "Reduced cloud spend by $1.2M/year via spot instance strategy",
      ],
    }),
  ],

  FINANCE: [
    JSON.stringify({
      industryDomain: "FINANCE",
      seniorityBand: "L4",
      yearsOfExperience: 7,
      skills: [
        { name: "Python", domain: "BACKEND", proficiencyLevel: 4 },
        { name: "SQL", domain: "DATABASES", proficiencyLevel: 5 },
        { name: "Bloomberg Terminal", domain: "OTHER", proficiencyLevel: 4 },
      ],
      certifications: [{ name: "CFA Level 2", issuer: "CFA Institute", year: 2021 }],
      achievements: [
        "Managed $450M equity portfolio with 14.2% annualized return",
        "Built risk model reducing VaR breach frequency by 35%",
      ],
    }),
    JSON.stringify({
      industryDomain: "FINANCE",
      seniorityBand: "L3",
      yearsOfExperience: 3,
      skills: [
        { name: "Excel", domain: "OTHER", proficiencyLevel: 5 },
        { name: "Python", domain: "BACKEND", proficiencyLevel: 3 },
        { name: "SQL", domain: "DATABASES", proficiencyLevel: 4 },
      ],
      achievements: [
        "Automated monthly reporting saving 40 analyst-hours per cycle",
        "Supported $2.1B M&A deal due diligence across 6 targets",
      ],
    }),
    JSON.stringify({
      industryDomain: "FINANCE",
      seniorityBand: "L5",
      yearsOfExperience: 12,
      certifications: [
        { name: "CFA Charter", issuer: "CFA Institute", year: 2015 },
        { name: "FRM", issuer: "GARP", year: 2017 },
      ],
      achievements: [
        "Oversaw $3.2B AUM across 4 fund strategies",
        "Built quant team of 6 generating 180bps alpha above benchmark",
      ],
    }),
  ],

  HEALTHCARE: [
    JSON.stringify({
      industryDomain: "HEALTHCARE",
      seniorityBand: "L3",
      yearsOfExperience: 4,
      certifications: [
        { name: "RN", issuer: "NCLEX", year: 2020 },
        { name: "BLS", issuer: "AHA", year: 2023 },
      ],
      skills: [
        { name: "Epic EHR", domain: "OTHER", proficiencyLevel: 4 },
        { name: "Patient Assessment", domain: "SOFT_SKILLS", proficiencyLevel: 5 },
      ],
      achievements: [
        "Maintained 97% patient satisfaction score over 24-month period",
        "Reduced medication error rate by 22% via new double-check protocol",
      ],
    }),
    JSON.stringify({
      industryDomain: "HEALTHCARE",
      seniorityBand: "L4",
      yearsOfExperience: 6,
      certifications: [{ name: "CPHQ", issuer: "NAHQ", year: 2021 }],
      achievements: [
        "Led implementation of HIPAA-compliant EHR across 3 facilities",
        "Reduced average length of stay by 1.2 days via care path redesign",
      ],
    }),
    JSON.stringify({
      industryDomain: "HEALTHCARE",
      seniorityBand: "L5",
      yearsOfExperience: 9,
      achievements: [
        "Directed $8M digital health initiative across 12 clinical departments",
        "Published 4 peer-reviewed studies on AI-assisted diagnostics",
      ],
    }),
  ],

  SALES: [
    JSON.stringify({
      industryDomain: "SALES",
      seniorityBand: "L3",
      yearsOfExperience: 4,
      skills: [
        { name: "Salesforce", domain: "OTHER", proficiencyLevel: 4 },
        { name: "HubSpot", domain: "OTHER", proficiencyLevel: 3 },
      ],
      achievements: [
        "Achieved 142% of annual quota in FY2023 ($2.8M closed)",
        "Grew enterprise pipeline from $1.2M to $4.7M in 18 months",
      ],
    }),
    JSON.stringify({
      industryDomain: "SALES",
      seniorityBand: "L4",
      yearsOfExperience: 6,
      achievements: [
        "Built and managed 12-person SDR team generating $18M ARR pipeline",
        "Reduced average sales cycle from 87 days to 54 days",
        "Closed 3 Fortune 500 accounts totaling $4.2M TCV",
      ],
    }),
    JSON.stringify({
      industryDomain: "SALES",
      seniorityBand: "L5",
      yearsOfExperience: 11,
      achievements: [
        "Scaled EMEA revenue from $0 to $22M ARR in 3 years",
        "Led team of 35 AEs, SEs, and CSMs across 8 countries",
      ],
    }),
  ],

  LEGAL: [
    JSON.stringify({
      industryDomain: "LEGAL",
      seniorityBand: "L3",
      yearsOfExperience: 4,
      certifications: [
        { name: "Bar Admission — California", issuer: "State Bar of CA", year: 2020 },
      ],
      achievements: [
        "Led due diligence for $340M Series D financing",
        "Drafted 60+ commercial contracts with <2% dispute rate",
      ],
    }),
    JSON.stringify({
      industryDomain: "LEGAL",
      seniorityBand: "L4",
      yearsOfExperience: 7,
      achievements: [
        "Represented clients in 14 arbitration proceedings, winning 11",
        "Reduced outside counsel spend by $1.8M through in-house buildout",
      ],
    }),
    JSON.stringify({
      industryDomain: "LEGAL",
      seniorityBand: "L5",
      yearsOfExperience: 12,
      achievements: [
        "Built 8-person legal team supporting 5 business units",
        "Closed $2.1B acquisition as lead transaction counsel",
      ],
    }),
  ],

  GENERAL: [
    JSON.stringify({
      industryDomain: "GENERAL",
      seniorityBand: "L2",
      yearsOfExperience: 2,
      achievements: ["Managed cross-functional project delivered 2 weeks early"],
    }),
    JSON.stringify({
      industryDomain: "GENERAL",
      seniorityBand: "L3",
      yearsOfExperience: 4,
      achievements: [
        "Reduced operational costs by 18% through process reengineering",
        "Trained and onboarded 15 new team members",
      ],
    }),
    JSON.stringify({
      industryDomain: "GENERAL",
      seniorityBand: "L4",
      yearsOfExperience: 7,
      achievements: [
        "Led department of 20 with $4M annual operating budget",
        "Improved NPS from 34 to 67 over 18 months",
      ],
    }),
  ],
};

export function getFewShots(industry: Industry, count = 3): string[] {
  const bank = FEW_SHOT_BANK[industry] ?? FEW_SHOT_BANK.GENERAL;
  return bank.slice(0, count);
}

/** @deprecated Use getFewShots */
export function getFewShot(industry: string): string | undefined {
  const shots = getFewShots(
    (industry in FEW_SHOT_BANK ? industry : "GENERAL") as Industry,
    1
  );
  return shots[0];
}
