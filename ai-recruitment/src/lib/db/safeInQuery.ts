/**
 * safeInQuery — prevents Prisma from generating WHERE ... IN (NULL)
 *
 * Returns `{ in: ids }` only when the array is non-empty.
 * Returns `undefined` otherwise, which Prisma ignores entirely.
 *
 * Usage:
 *   where: { id: safeInQuery(jobIds) }
 *
 * When `jobIds` is empty/null the entire `id` filter is omitted,
 * which is always safer than producing an impossible IN (NULL) clause.
 *
 * For follow-up queries where an empty id list should mean “no rows”, prefer:
 *   if (!ids || ids.length === 0) return [];
 * before running the query (see e.g. getJobEmbeddings).
 */
export function safeInQuery<T>(ids: T[] | null | undefined): { in: T[] } | undefined {
  if (!ids || ids.length === 0) return undefined;
  return { in: ids };
}

/**
 * safeNotInQuery — same guard for `notIn` filters.
 */
export function safeNotInQuery<T>(ids: T[] | null | undefined): { notIn: T[] } | undefined {
  if (!ids || ids.length === 0) return undefined;
  return { notIn: ids };
}
