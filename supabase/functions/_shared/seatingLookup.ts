/**
 * Personal seating lookup codes for the public "find your table" page.
 *
 * A code is derived (HMAC) from a server secret, the seating publication and the
 * guest, so the couple can re-display or reprint codes at any time without them
 * changing, and only a hash is stored in seating_lookup_codes. Republishing the
 * plan creates a new publication, which issues fresh codes.
 */
import { sha256Hex } from "./guestAccess.ts";

/** Uppercase letters and digits without look-alikes (0/O, 1/I/L). */
export const LOOKUP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LOOKUP_CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^[${LOOKUP_CODE_ALPHABET}]{${LOOKUP_CODE_LENGTH}}$`);

/** Accepts "abc-234", "ABC 234" etc. Returns the canonical code or null. */
export function normaliseLookupCode(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 32) return null;
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

/** Display form, e.g. "ABC-234". */
export function formatLookupCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** Case-, accent-, punctuation- and spacing-insensitive name comparison key. */
export function normaliseGuestName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function deriveLookupCode(
  secret: string,
  publicationId: string,
  guestId: string,
): Promise<string> {
  if (!secret) throw new Error("Seating lookup is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`vowora-seating-lookup/v1/${publicationId}/${guestId}`),
    ),
  );
  const view = new DataView(mac.buffer);
  let code = "";
  for (let i = 0; i < LOOKUP_CODE_LENGTH; i++) {
    code += LOOKUP_CODE_ALPHABET[view.getUint32(i * 4) % LOOKUP_CODE_ALPHABET.length];
  }
  return code;
}

/** Stored hash, scoped to the publication so equal codes never collide across weddings. */
export function lookupCodeHash(publicationId: string, code: string): Promise<string> {
  return sha256Hex(`${publicationId}:${code}`);
}

/** Server secret: a dedicated SEATING_LOOKUP_SECRET, else the service role key. */
export function seatingLookupSecret(get: (name: string) => string | undefined): string {
  return get("SEATING_LOOKUP_SECRET") || get("SUPABASE_SERVICE_ROLE_KEY") || "";
}
