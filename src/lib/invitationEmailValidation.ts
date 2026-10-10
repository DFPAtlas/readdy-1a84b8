const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ── Parse pasted text into email array ──

export function parsePastedEmails(text: string): string[] {
  const parts = text.split(/[,;\s\n\r]+/);
  const emails: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && trimmed.includes('@') && isValidEmail(trimmed)) {
      emails.push(normalizeEmail(trimmed));
    }
  }
  return [...new Set(emails)];
}

