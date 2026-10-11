interface EntitlementClient { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>; }
import type { PaidFeature } from './entitlementConfig.ts';
export async function requireEntitlement(db: EntitlementClient, weddingId: string, feature: PaidFeature): Promise<void> {
  const { data, error } = await db.rpc('require_wedding_feature', { p_wedding_id: weddingId, p_feature: feature });
  if (error || data !== true) throw new EntitlementError();
}
export class EntitlementError extends Error {
  constructor() { super('Upgrade your subscription to use this feature.'); }
}
export function entitlementErrorResponse(error: unknown, headers: Record<string, string>): Response | null {
  return error instanceof EntitlementError ? new Response(JSON.stringify({ success: false, error: 'subscription_required', message: error.message }), { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }) : null;
}

export async function getWeddingFeatures(db: EntitlementClient, weddingId: string): Promise<Record<PaidFeature, boolean>> {
  const { data, error } = await db.rpc('service_wedding_features', { p_wedding_id: weddingId });
  if (error || !data || typeof data !== 'object') throw new EntitlementError();
  return data as Record<PaidFeature, boolean>;
}
