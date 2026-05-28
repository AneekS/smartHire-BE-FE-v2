/**
 * Create or update resumes-index (vector dims from EMBED_VECTOR_DIMENSIONS, default 4096 for qwen3-embedding:8b).
 * Usage: npm run search:setup
 */
import { config } from "dotenv";
import { EMBED_VECTOR_DIMENSIONS } from "./ollama-models.mjs";

config({ path: ".env.local" });

const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
const key = process.env.AZURE_SEARCH_ADMIN_KEY;
const indexName = process.env.AZURE_SEARCH_INDEX ?? "resumes-index";
const vectorDims = Number(process.env.EMBED_VECTOR_DIMENSIONS ?? EMBED_VECTOR_DIMENSIONS);

if (!endpoint || !key) {
  console.error("Missing AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_ADMIN_KEY");
  process.exit(1);
}

const indexDefinition = {
  name: indexName,
  fields: [
    { name: "id", type: "Edm.String", key: true, filterable: true },
    { name: "resumeVersionId", type: "Edm.String", filterable: true, facetable: true },
    { name: "candidateId", type: "Edm.String", filterable: true, facetable: true },
    { name: "tenantId", type: "Edm.String", filterable: true, facetable: true },
    { name: "embeddingModel", type: "Edm.String", filterable: true, facetable: true },
    { name: "section", type: "Edm.String", filterable: true, facetable: true },
    { name: "docType", type: "Edm.String", filterable: true, facetable: true },
    { name: "content", type: "Edm.String", searchable: true },
    {
      name: "contentVector",
      type: "Collection(Edm.Single)",
      searchable: true,
      retrievable: false,
      dimensions: vectorDims,
      vectorSearchProfile: "resume-vector-profile",
    },
    { name: "skills", type: "Collection(Edm.String)", searchable: true, filterable: true },
    { name: "seniorityBand", type: "Edm.String", filterable: true },
    { name: "industryDomain", type: "Edm.String", filterable: true, facetable: true },
    { name: "updatedAt", type: "Edm.DateTimeOffset", filterable: true, sortable: true },
  ],
  vectorSearch: {
    algorithms: [
      {
        name: "hnsw-algo",
        kind: "hnsw",
        hnswParameters: { metric: "cosine", m: 4, efConstruction: 400, efSearch: 500 },
      },
    ],
    profiles: [{ name: "resume-vector-profile", algorithm: "hnsw-algo" }],
  },
};

async function upsertIndex() {
  const getRes = await fetch(`${endpoint}/indexes/${indexName}?api-version=2024-07-01`, {
    headers: { "api-key": key },
  });

  const method = getRes.ok ? "PUT" : "POST";
  const url =
    method === "PUT"
      ? `${endpoint}/indexes/${indexName}?api-version=2024-07-01`
      : `${endpoint}/indexes?api-version=2024-07-01`;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "api-key": key },
    body: JSON.stringify(indexDefinition),
  });

  if (!res.ok) {
    console.error("Index setup FAIL:", res.status, await res.text());
    process.exit(1);
  }

  console.log(`Index "${indexName}" ${getRes.ok ? "updated" : "created"} (${vectorDims}d vectors)`);
}

await upsertIndex();
