import { describe, expect, it } from 'vitest';
import { billingErrorMessage } from '@/lib/billingErrors';

const invokeError = (status: number, body: unknown) => ({
  message: 'Edge Function returned a non-2xx status code',
  context: { status, json: async () => body },
});

describe('billingErrorMessage', () => {
  it('never shows the raw Edge Function message', async () => {
    const msg = await billingErrorMessage(invokeError(500, { error: 'Internal server error' }));
    expect(msg).not.toMatch(/non-2xx|edge function/i);
    expect(msg).toMatch(/payment provider/);
  });

  it('uses the function’s own short reason for client errors', async () => {
    expect(await billingErrorMessage(invokeError(409, { error: 'Manage your existing subscription in the billing portal to change plans.' })))
      .toBe('Manage your existing subscription in the billing portal to change plans.');
    expect(await billingErrorMessage(invokeError(400, { error: 'Plan not found' }))).toBe('Plan not found.');
  });

  it('explains expired sessions and missing permission', async () => {
    expect(await billingErrorMessage(invokeError(401, {}))).toMatch(/session has expired/);
    expect(await billingErrorMessage(invokeError(403, {}))).toMatch(/permission/);
  });

  it('falls back when the body is not JSON or has no reason', async () => {
    const notJson = { message: 'x', context: { status: 400, json: async () => { throw new Error('bad'); } } };
    expect(await billingErrorMessage(notJson)).toMatch(/payment provider/);
    expect(await billingErrorMessage(invokeError(400, {}))).toMatch(/payment provider/);
  });

  it('reports network failures plainly', async () => {
    expect(await billingErrorMessage(new TypeError('Failed to fetch'))).toMatch(/network error/);
  });
});
