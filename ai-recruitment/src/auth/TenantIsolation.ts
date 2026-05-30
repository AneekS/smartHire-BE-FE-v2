import { ForbiddenError } from "@/auth/errors";

export function addTenantFilter<T extends Record<string, unknown>>(
  where: T,
  tenantId: string
): T & { tenantId: string } {
  return { ...where, tenantId };
}

export function assertTenantMatch(
  recordTenantId: string | null | undefined,
  requestTenantId: string
): void {
  if (!recordTenantId || recordTenantId !== requestTenantId) {
    throw new ForbiddenError("Tenant mismatch");
  }
}
