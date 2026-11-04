import { describe, expect, it } from 'vitest';
import { claimLimit, parseScanResult, secretsMatch } from '../../../supabase/functions/_shared/scanWorker';

const ID = '11111111-2222-4333-8444-555555555555';
const SECRET = 'a'.repeat(40);

describe('gallery scan worker input rules', () => {
  it('only accepts the exact, sufficiently long secret', () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true);
    expect(secretsMatch(SECRET.slice(1), SECRET)).toBe(false);
    expect(secretsMatch(`${SECRET}x`, SECRET)).toBe(false);
    expect(secretsMatch(null, SECRET)).toBe(false);
    expect(secretsMatch('short', 'short')).toBe(false);
    expect(secretsMatch(SECRET, undefined)).toBe(false);
  });

  it('parses and cleans results', () => {
    expect(parseScanResult({ asset_id: ID.toUpperCase(), verdict: 'flagged', labels: ['nudity', 7, ' x\u0000y ', ''], score: 1.7, model: 'm', reason: 'r' }))
      .toEqual({ asset_id: ID, verdict: 'flagged', labels: ['nudity', 'x y'], score: 1, model: 'm', reason: 'r' });
    expect(parseScanResult({ asset_id: ID, verdict: 'clean' })).toEqual({ asset_id: ID, verdict: 'clean', labels: [], score: null, model: null, reason: null });
    expect(parseScanResult({ asset_id: ID, verdict: 'approved' })).toBeNull();
    expect(parseScanResult({ asset_id: 'not-a-uuid', verdict: 'clean' })).toBeNull();
    expect(parseScanResult(null)).toBeNull();
    expect(parseScanResult({ asset_id: ID, verdict: 'clean', labels: Array(20).fill('a') })?.labels).toHaveLength(10);
  });

  it('bounds the claim size', () => {
    expect(claimLimit(undefined)).toBe(10);
    expect(claimLimit(3)).toBe(3);
    expect(claimLimit(500)).toBe(25);
    expect(claimLimit(-1)).toBe(10);
  });
});
