import { describe, expect, it } from 'vitest';
import {
  SHARED_UPLOAD_MAX_BYTES,
  cleanText,
  cleanUploaderName,
  maxUploadBytes,
  sniffImageType,
  uploadWindow,
  validSharedUploadToken,
} from '../../../supabase/functions/_shared/sharedUpload';

describe('shared photo upload rules', () => {
  it('accepts only database-shaped tokens', () => {
    expect(validSharedUploadToken('0123456789abcdef0123456789abcdef')).toBe(true);
    expect(validSharedUploadToken('0123456789ABCDEF0123456789abcdef')).toBe(false);
    expect(validSharedUploadToken('short')).toBe(false);
    expect(validSharedUploadToken(undefined)).toBe(false);
  });

  it('cleans names and captions', () => {
    expect(cleanText('  Hello\u0000\n  world  ', 50)).toBe('Hello world');
    expect(cleanText('x'.repeat(300), 200)).toHaveLength(200);
    expect(cleanUploaderName(' A ')).toBeNull();
    expect(cleanUploaderName('Aunt Jo')).toBe('Aunt Jo');
  });

  it('caps the file size at 15 MB', () => {
    expect(maxUploadBytes(0)).toBe(SHARED_UPLOAD_MAX_BYTES);
    expect(maxUploadBytes(5 * 1048576)).toBe(5 * 1048576);
    expect(maxUploadBytes(100 * 1048576)).toBe(SHARED_UPLOAD_MAX_BYTES);
  });

  it('respects the couple\'s upload window', () => {
    const now = new Date('2027-05-01T12:00:00Z');
    expect(uploadWindow(null, null, now)).toBe('open');
    expect(uploadWindow('2027-05-02T00:00:00Z', null, now)).toBe('not_open');
    expect(uploadWindow(null, '2027-04-30T00:00:00Z', now)).toBe('closed');
  });

  it('identifies images by their bytes, not their name', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('image/webp');
    expect(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });
});
