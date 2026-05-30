import { prisma } from "@/lib/prisma";

let cachedTenantId: string | null = null;

const DEFAULT_SLUG = () => process.env.DEFAULT_TENANT_SLUG ?? "default";
const DEFAULT_NAME = () => process.env.DEFAULT_TENANT_NAME ?? "Default Tenant";

/**
 * Resolve the active tenant id for API requests.
 * Uses DEFAULT_TENANT_ID when set; otherwise find-or-create by slug.
 */
export async function resolveTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  const explicit = process.env.DEFAULT_TENANT_ID?.trim();
  if (explicit) {
    const row = await prisma.tenant.findUnique({ where: { id: explicit } });
    if (row) {
      cachedTenantId = row.id;
      return row.id;
    }
  }

  const slug = DEFAULT_SLUG();
  let tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: DEFAULT_NAME(), slug, isActive: true },
    });
  }

  cachedTenantId = tenant.id;
  return tenant.id;
}

/** Clear cached tenant (tests). */
export function resetTenantCache(): void {
  cachedTenantId = null;
}
