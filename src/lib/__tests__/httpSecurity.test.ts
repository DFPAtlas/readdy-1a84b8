import { describe, expect, it } from 'vitest';
import {
  baselineJsonError,
  hardenHeaders,
  isTrustedOrigin,
  secureHandler,
} from '../../../supabase/functions/_shared/httpSecurity';

const opts = { cors: true, configured: '', local: false };

describe('isTrustedOrigin', () => {
  it('trusts the production origins and configured extras only', () => {
    expect(isTrustedOrigin('https://vowora.uk')).toBe(true);
    expect(isTrustedOrigin('https://www.vowora.uk')).toBe(true);
    expect(isTrustedOrigin('https://evil.example')).toBe(false);
    expect(isTrustedOrigin('https://vowora.uk.evil.example')).toBe(false);
    expect(isTrustedOrigin('https://preview.example', 'https://preview.example')).toBe(true);
    expect(isTrustedOrigin('http://insecure.example', 'http://insecure.example')).toBe(false);
    expect(isTrustedOrigin(null)).toBe(false);
  });

  it('only trusts localhost in local environments', () => {
    expect(isTrustedOrigin('http://localhost:5173')).toBe(false);
    expect(isTrustedOrigin('http://localhost:5173', '', true)).toBe(true);
  });
});

describe('hardenHeaders', () => {
  it('narrows a wildcard origin to a trusted caller', () => {
    const headers = hardenHeaders(new Headers({ 'Access-Control-Allow-Origin': '*' }), 'https://vowora.uk', opts);
    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://vowora.uk');
    expect(headers.get('Vary')).toContain('Origin');
  });

  it('drops the wildcard for untrusted callers', () => {
    const headers = hardenHeaders(new Headers({ 'Access-Control-Allow-Origin': '*' }), 'https://evil.example', opts);
    expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('keeps an origin the function already allow-listed', () => {
    const headers = hardenHeaders(new Headers({ 'Access-Control-Allow-Origin': 'https://www.vowora.uk' }), 'https://www.vowora.uk', opts);
    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://www.vowora.uk');
  });

  it('strips CORS for server-only endpoints', () => {
    const headers = hardenHeaders(new Headers({ 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'x' }), 'https://vowora.uk', { ...opts, cors: false });
    expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(headers.get('Access-Control-Allow-Headers')).toBeNull();
  });

  it('adds security headers and an API CSP, but leaves HTML pages their own CSP', () => {
    const json = hardenHeaders(new Headers({ 'Content-Type': 'application/json' }), null, opts);
    expect(json.get('X-Content-Type-Options')).toBe('nosniff');
    expect(json.get('X-Frame-Options')).toBe('DENY');
    expect(json.get('Strict-Transport-Security')).toContain('max-age=');
    expect(json.get('Content-Security-Policy')).toContain("default-src 'none'");
    const html = hardenHeaders(new Headers({ 'Content-Type': 'text/html' }), null, opts);
    expect(html.get('Content-Security-Policy')).toBeNull();
  });
});

describe('baselineJsonError', () => {
  it('accepts empty and well-formed bodies', () => {
    expect(baselineJsonError('')).toBeNull();
    expect(baselineJsonError('{"wedding_id":"8b0f6c2e-3f1a-4c0e-9d7a-1f2e3d4c5b6a"}')).toBeNull();
  });

  it('rejects malformed JSON, non-objects, bad wedding ids and oversized bodies', () => {
    expect(baselineJsonError('{nope')?.status).toBe(400);
    expect(baselineJsonError('[1,2]')?.status).toBe(400);
    expect(baselineJsonError('{"wedding_id":"1 or 1=1"}')?.status).toBe(400);
    expect(baselineJsonError('{"weddingId":42}')?.status).toBe(400);
    expect(baselineJsonError(JSON.stringify({ x: 'a'.repeat(1_100_000) }))?.status).toBe(413);
  });
});

describe('secureHandler', () => {
  const post = (body: string, origin = 'https://vowora.uk') =>
    new Request('https://fn.example/x', { method: 'POST', body, headers: { 'content-type': 'application/json', origin } });

  it('returns 400 for malformed JSON before the function runs', async () => {
    let ran = false;
    const res = await secureHandler(() => { ran = true; return new Response('ok'); })(post('{bad'));
    expect(res.status).toBe(400);
    expect(ran).toBe(false);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://vowora.uk');
  });

  it('turns an uncaught exception into a generic 500', async () => {
    const res = await secureHandler(() => { throw new Error('relation "secret_table" does not exist'); })(post('{}'));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret_table');
  });

  it('leaves the raw body untouched for webhooks', async () => {
    const res = await secureHandler(async (req) => new Response(await req.text()), { cors: false })(post('{raw'));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{raw');
  });

  it('lets the function still read the body after validation', async () => {
    const res = await secureHandler(async (req) => Response.json(await req.json()))(post('{"a":1}'));
    expect(await res.json()).toEqual({ a: 1 });
  });
});
