/**
 * Guards for Prisma where clauses — avoids `WHERE id IN (NULL)` and invalid `OR` branches.
 */

/** Non-empty, unique strings (order preserved). */
export function uniqueNonEmptyStrings(ids: Iterable<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Safe `Candidate` lookup: never pass `{ id: undefined }` into Prisma. */
export function candidateOrWhere(input: {
  candidateId?: string | null;
  email?: string | null;
}): { OR: Array<{ id: string } | { email: string }> } | null {
  const or: Array<{ id: string } | { email: string }> = [];
  if (typeof input.candidateId === "string" && input.candidateId.length > 0) {
    or.push({ id: input.candidateId });
  }
  if (typeof input.email === "string" && input.email.length > 0) {
    or.push({ email: input.email });
  }
  return or.length > 0 ? { OR: or } : null;
}
