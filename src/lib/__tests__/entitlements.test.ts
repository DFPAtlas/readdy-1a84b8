import { describe, expect, it } from 'vitest';
import { paidRouteFeature } from '../paidRoutes';
import { PLANS } from '../plans';
import { hasFeature, PLAN_LIMITS, FEATURE_PLANS, type EntitlementPlan } from '../../../supabase/functions/_shared/entitlementConfig';
import { requireEntitlement, EntitlementError } from '../../../supabase/functions/_shared/requireEntitlement';
import type { SupabaseClient } from '@supabase/supabase-js';
describe('subscription authorization contract', () => {
  it('locks every paid route family including nested and day-of pages', () => {
    for (const [path, feature] of Object.entries({ '/app/budget/reports':'budget','/app/tasks':'planning','/app/styleboard':'planning','/app/calendar':'planning','/app/timeline':'weddingDay','/app/seating/new':'seating','/app/suppliers':'suppliers','/app/updates':'communications','/app/gallery-control':'gallery','/app/travel':'travel','/app/invitations/new':'invitations','/app/seating/plans/one/day-mode':'weddingDay' })) expect(paidRouteFeature(path)).toBe(feature);
    for (const path of ['/app/billing','/app/dashboard','/app/onboarding','/app/guests','/app/support','/app/invitations/responses','/app/admin']) expect(paidRouteFeature(path)).toBeNull();
  });
  it('the published plan allowances use the same entitlement matrix', () => {
    for (const plan of Object.keys(PLAN_LIMITS) as EntitlementPlan[]) expect(PLANS[plan].limits).toEqual(PLAN_LIMITS[plan]);
    expect(hasFeature('free','invitations')).toBe(false);
    expect(hasFeature('essential','budget')).toBe(false);
    expect(hasFeature('complete','budget')).toBe(true);
    expect(hasFeature('complete','weddingDay')).toBe(false);
    expect(hasFeature('luxury','weddingDay')).toBe(true);
    expect(PLAN_LIMITS.complete.prioritySupport).toBe(true);
    expect(Object.keys(FEATURE_PLANS)).toContain('customDomain');
  });
  it('privileged action guard fails closed for denial, missing state or RPC failure', async () => {
    for (const result of [{data:false,error:null},{data:null,error:null},{data:true,error:{message:'DB unavailable'}}]) {
      const client={rpc:async()=>result} as unknown as SupabaseClient;
      await expect(requireEntitlement(client,'wedding','invitations')).rejects.toBeInstanceOf(EntitlementError);
    }
    const client={rpc:async(name:string,args:unknown)=>{ expect(name).toBe('require_wedding_feature'); expect(args).toEqual({p_wedding_id:'wedding',p_feature:'budget'}); return {data:true,error:null}; }} as unknown as SupabaseClient;
    await expect(requireEntitlement(client,'wedding','budget')).resolves.toBeUndefined();
  });
});
