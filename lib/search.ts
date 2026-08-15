/**
 * Sanitize a raw search string before it's interpolated into a Supabase
 * `.or()` ILIKE filter.
 *
 * Without this, a search term containing a comma or parenthesis could
 * break out of the intended `name.ilike.%x%,description.ilike.%x%` filter
 * and inject additional PostgREST filter conditions (e.g. someone typing
 * something crafted to also match rows outside the normal query). `%` and
 * `_` are also escaped since they're ILIKE wildcards, not literal
 * characters people expect to search for.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .replace(/[,()]/g, " ")
    .replace(/[%_\\]/g, (m) => `\\${m}`)
    .trim()
    .slice(0, 100);
}
