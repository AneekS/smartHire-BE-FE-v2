/**
 * Quick Azure Blob Storage connectivity check.
 * Usage: npm run storage:ping
 */
import { config } from "dotenv";
import { BlobServiceClient } from "@azure/storage-blob";

config({ path: ".env.local" });

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!connectionString) {
  console.error("Missing AZURE_STORAGE_CONNECTION_STRING in .env.local");
  process.exit(1);
}

const resumesContainer = process.env.AZURE_STORAGE_CONTAINER_RESUMES ?? "resumes";
const avatarsContainer = process.env.AZURE_STORAGE_CONTAINER_AVATARS ?? "avatars";

try {
  const client = BlobServiceClient.fromConnectionString(connectionString);
  const account = client.accountName;
  console.log("Storage account:", account);

  for (const name of [resumesContainer, avatarsContainer]) {
    const container = client.getContainerClient(name);
    const exists = await container.exists();
    if (!exists) {
      await container.createIfNotExists();
      console.log(`Container "${name}": created`);
    } else {
      console.log(`Container "${name}": OK`);
    }
  }

  console.log("Azure Blob Storage OK");
  process.exit(0);
} catch (e) {
  console.error("Azure Blob Storage FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}
