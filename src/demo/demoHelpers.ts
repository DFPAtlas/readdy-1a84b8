/**
 * Demo Mode safety helpers — used throughout the app to:
 * 1. Block real external calls when in demo mode
 * 2. Show simulated success toasts
 * 3. Update local demo state
 */

import { isDemoMode } from './demoConfig';

export interface SimulatedActionResult {
  success: boolean;
  message: string;
  simulated: true;
}

const DEMO_ACTIONS: Record<string, string> = {
  sendEmail: 'Email sending is simulated in Demo Mode.',
  sendInvitation: 'Invitation sending is simulated in Demo Mode.',
  publishWebsite: 'Website publishing is simulated in Demo Mode.',
  chargePayment: 'Payment processing is simulated in Demo Mode.',
  createPayout: 'Payout creation is simulated in Demo Mode.',
  runAIModeration: 'AI moderation is simulated in Demo Mode.',
  edgeFunction: 'This feature requires a live Supabase connection and is simulated in Demo Mode.',
};

export function simulateAction(action: keyof typeof DEMO_ACTIONS): SimulatedActionResult {
  return {
    success: true,
    message: DEMO_ACTIONS[action] || 'This action is simulated in Demo Mode.',
    simulated: true,
  };
}

export function shouldSimulate(): boolean {
  return isDemoMode;
}

/**
 * Wrap an async action so that in Demo Mode it:
 * 1. Simulates a 600–1200ms delay
 * 2. Returns the simulated result
 * 3. Never calls the real implementation
 */
export async function withDemoGuard<T>(
  actionKey: keyof typeof DEMO_ACTIONS,
  realFn: () => Promise<T>,
): Promise<T | SimulatedActionResult> {
  if (!isDemoMode) return realFn();

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));

  return simulateAction(actionKey);
}