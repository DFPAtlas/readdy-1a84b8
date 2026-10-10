export async function unsubscribeToken(
  wedding: string,
  email: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(
      `vowora-email-preference/v1/${wedding}/${email.trim().toLowerCase()}`,
    ),
  );
  return Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function unsubscribeUrl(
  wedding: string,
  email: string,
): Promise<string> {
  const secret =
    Deno.env.get("EMAIL_PREFERENCE_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "";
  if (!secret) throw new Error("Email preferences are not configured");
  const url = new URL(
    "/unsubscribe",
    Deno.env.get("PUBLIC_SITE_URL") || "https://vowora.uk",
  );
  url.searchParams.set("wedding", wedding);
  url.searchParams.set("email", email);
  url.searchParams.set("token", await unsubscribeToken(wedding, email, secret));
  return url.href;
}
