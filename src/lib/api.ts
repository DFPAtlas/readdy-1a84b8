export { supabase } from '@/lib/supabase';
export type { Invitation, InvitationRecipient, InvitationTemplate, InvitationActivityLog } from '@/types/invitation';
export type {
  InvitationAccessToken,
  GuestAccessSession,
  AccessActivity,
  GuestPortalSettings,
  WeddingEvent,
  GuestAccessResponse,
  GuestRecipientInfo,
} from '@/types/access';

export { INVITATION_STATUS_OPTIONS, INVITATION_TYPE_OPTIONS, DELIVERY_METHOD_OPTIONS, STYLE_PRESET_PREVIEWS } from '@/types/invitation';

export function hashToken(token: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );
}

function generateAccessTokenCrypto(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export { generateAccessTokenCrypto as generateAccessToken };