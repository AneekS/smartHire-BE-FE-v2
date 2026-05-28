#!/usr/bin/env node
/**
 * Seed skill_aliases table. Run: node scripts/seed-skill-aliases.mjs
 */
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });
config({ path: resolve(root, ".env") });

const ALIASES = [
  ["js", "JavaScript"],
  ["javascript", "JavaScript"],
  ["ts", "TypeScript"],
  ["typescript", "TypeScript"],
  ["py", "Python"],
  ["python", "Python"],
  ["k8s", "Kubernetes"],
  ["kubernetes", "Kubernetes"],
  ["postgres", "PostgreSQL"],
  ["postgresql", "PostgreSQL"],
  ["pg", "PostgreSQL"],
  ["react.js", "React"],
  ["reactjs", "React"],
  ["react", "React"],
  ["node", "Node.js"],
  ["nodejs", "Node.js"],
  ["node.js", "Node.js"],
  ["vue", "Vue.js"],
  ["vuejs", "Vue.js"],
  ["angularjs", "Angular"],
  ["angular", "Angular"],
  ["aws", "Amazon Web Services"],
  ["gcp", "Google Cloud Platform"],
  ["azure", "Microsoft Azure"],
  ["ml", "Machine Learning"],
  ["ai", "Artificial Intelligence"],
  ["nlp", "Natural Language Processing"],
  ["sql", "SQL"],
  ["nosql", "NoSQL"],
  ["mongo", "MongoDB"],
  ["mongodb", "MongoDB"],
  ["redis", "Redis"],
  ["docker", "Docker"],
  ["tf", "TensorFlow"],
  ["tensorflow", "TensorFlow"],
  ["pytorch", "PyTorch"],
  ["cpp", "C++"],
  ["c++", "C++"],
  ["csharp", "C#"],
  ["c#", "C#"],
  ["golang", "Go"],
  ["go", "Go"],
  ["ruby", "Ruby"],
  ["rails", "Ruby on Rails"],
  ["php", "PHP"],
  ["swift", "Swift"],
  ["kotlin", "Kotlin"],
  ["rust", "Rust"],
  ["scala", "Scala"],
  ["r", "R"],
  ["html", "HTML"],
  ["css", "CSS"],
  ["sass", "Sass"],
  ["scss", "Sass"],
  ["tailwind", "Tailwind CSS"],
  ["figma", "Figma"],
  ["jira", "Jira"],
  ["agile", "Agile"],
  ["scrum", "Scrum"],
];

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL in .env.local");
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
    connectionTimeoutMillis: 15_000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

async function main() {
  const { prisma, pool } = createPrisma();

  try {
    for (const [alias, canonical] of ALIASES) {
      const normalized = alias.toLowerCase().trim();
      await prisma.skillAlias.upsert({
        where: { alias: normalized },
        create: { alias: normalized, canonical },
        update: { canonical },
      });
    }
    console.log(`Seeded ${ALIASES.length} skill aliases`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
