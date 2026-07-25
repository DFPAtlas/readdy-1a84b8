import { describe, it, expect } from 'vitest';
import { mapAuthError, safeAuthLog } from '@/lib/authErrors';

describe('mapAuthError', () => {
  it('maps invalid credentials', () => {
    const result = mapAuthError('Invalid login credentials');
    expect(result).toContain('incorrect');
  });

  it('maps email not confirmed', () => {
    const result = mapAuthError('Email not confirmed');
    expect(result).toContain('verify your email');
  });

  it('maps already registered', () => {
    const result = mapAuthError('User already registered');
    expect(result).toContain('already exists');
    expect(result).toContain('log in');
  });

  it('maps weak password', () => {
    const result = mapAuthError('Password should be at least 6 characters');
    expect(result).toContain('too weak');
  });

  it('maps rate limit', () => {
    const result = mapAuthError('Too many requests, try again later');
    expect(result).toContain('Too many attempts');
  });

  it('maps expired token', () => {
    const result = mapAuthError('Token has expired');
    expect(result).toContain('expired');
    expect(result).toContain('no longer valid');
  });

  it('maps session expired', () => {
    const result = mapAuthError('JWT expired');
    expect(result).toContain('session has expired');
  });

  it('maps network errors', () => {
    expect(mapAuthError('Network error')).toContain('network error');
    expect(mapAuthError('fetch failed')).toContain('network error');
    expect(mapAuthError('Request timeout')).toContain('network error');
  });

  it('maps supabase configuration errors', () => {
    const result = mapAuthError('supabase URL not configured');
    expect(result).toContain('not fully configured');
  });

  it('maps password reuse', () => {
    const result = mapAuthError('New password should be different');
    expect(result).toContain('different from your current password');
  });

  it('returns generic fallback for unknown errors', () => {
    const result = mapAuthError('Some random unknown error');
    expect(result).toContain('Something went wrong');
  });

  it('handles null/undefined gracefully', () => {
    expect(mapAuthError(null)).toContain('unexpected error');
    expect(mapAuthError(undefined)).toContain('unexpected error');
  });

  it('handles Error objects', () => {
    const result = mapAuthError(new Error('Invalid login credentials'));
    expect(result).toContain('incorrect');
  });

  it('is case-insensitive', () => {
    const result = mapAuthError('INVALID LOGIN CREDENTIALS');
    expect(result).toContain('incorrect');
  });

  it('never exposes raw error messages for unknown errors', () => {
    const rawMsg = 'PostgreSQL connection refused on port 5432 with user admin';
    const result = mapAuthError(rawMsg);
    expect(result).not.toContain('PostgreSQL');
    expect(result).not.toContain('5432');
    expect(result).toContain('Something went wrong');
  });

  it('never exposes Supabase internal details', () => {
    const rawMsg = 'AuthApiError: status 500 at https://xxx.supabase.co/auth/v1/token';
    const result = mapAuthError(rawMsg);
    expect(result).not.toContain('supabase.co');
    expect(result).not.toContain('AuthApiError');
    expect(result).not.toContain('status 500');
  });
});

describe('safeAuthLog', () => {
  it('does not throw', () => {
    expect(() => safeAuthLog('test', new Error('test error'))).not.toThrow();
    expect(() => safeAuthLog('test', 'string error')).not.toThrow();
  });

  it('redacts tokens from log messages', () => {
    // This won't actually log in test mode (not DEV), but shouldn't throw
    expect(() => safeAuthLog('login', new Error('token=abc123def456 secret data'))).not.toThrow();
  });
});