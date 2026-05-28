/**
 * Azure AI Search connectivity check.
 * Usage: npm run search:ping
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const key = process.env.AZURE_SEARCH_ADMIN_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX ?? "resumes-index";

if (!endpoint || !key) {
  console.error("Missing AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_ADMIN_KEY");
  process.exit(1);
}

try {
  const res = await fetch(`${endpoint}/indexes/${indexName}?api-version=2024-07-01`, {
    headers: { "api-key": key },
  });

  if (res.status === 404) {
    console.log(`Index "${indexName}" not found — run: npm run search:setup`);
    process.exit(1);
  }

  if (!res.ok) {
    console.error("Search FAIL:", res.status, await res.text());
    process.exit(1);
  }

  const index = await res.json();
  console.log("Azure Search OK:", endpoint);
  console.log("Index:", index.name);
  const vectorField = (index.fields ?? []).find((f) => f.name === "contentVector");
  if (vectorField) {
    const dims = vectorField.dimensions ?? vectorField.vectorSearchDimensions ?? "unknown";
    console.log("Vector field dimensions:", dims);
    const expected = Number(process.env.EMBED_VECTOR_DIMENSIONS ?? 4096);
    if (typeof dims === "number" && dims !== expected) {
      console.warn(`WARN: index has ${dims}d but EMBED_VECTOR_DIMENSIONS=${expected}. Run: npm run search:setup`);
    }
  }
  process.exit(0);
} catch (e) {
  console.error("Search FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}
