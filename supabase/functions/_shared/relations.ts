/** PostgREST to-one joins are objects; the ungenerated client can infer arrays. */
export function oneRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}
