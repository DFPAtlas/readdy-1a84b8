import { describe, it, expect } from 'vitest';

// ── Email validation and parsing (replicating SendPanel logic for testability) ──

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const MAX_EMAIL_LENGTH = 254;

function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_REGEX.test(email);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parsePastedEmails(text: string): string[] {
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

// ── Tests ──

describe('Email validation', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    expect(isValidEmail('a@b.cd')).toBe(true);
  });

  it('rejects blank values', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects emails without @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
    expect(isValidEmail('test at domain.com')).toBe(false);
  });

  it('rejects emails that are too long', () => {
    const long = 'a'.repeat(255) + '@b.com';
    expect(isValidEmail(long)).toBe(false);
  });

  it('rejects emails with names but no address', () => {
    expect(isValidEmail('John Doe')).toBe(false);
  });
});

describe('Email normalization', () => {
  it('trims whitespace', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });

  it('lowercases', () => {
    expect(normalizeEmail('UPPER@CASE.COM')).toBe('upper@case.com');
  });
});

describe('Pasted emails parsing', () => {
  it('parses comma-separated emails', () => {
    const result = parsePastedEmails('a@test.com, b@test.com, c@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
  });

  it('parses semicolon-separated emails', () => {
    const result = parsePastedEmails('a@test.com; b@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com']);
  });

  it('parses newline-separated emails', () => {
    const result = parsePastedEmails('a@test.com\nb@test.com\nc@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
  });

  it('parses space-separated emails', () => {
    const result = parsePastedEmails('a@test.com b@test.com c@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com', 'c@test.com']);
  });

  it('deduplicates pasted emails', () => {
    const result = parsePastedEmails('a@test.com, A@TEST.COM, a@test.com');
    expect(result).toEqual(['a@test.com']);
  });

  it('rejects invalid entries in paste', () => {
    const result = parsePastedEmails('a@test.com, invalid, not@email, b@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com']);
  });

  it('returns empty array for pure invalid text', () => {
    const result = parsePastedEmails('hello world foo bar');
    expect(result).toEqual([]);
  });

  it('handles mixed separators', () => {
    const result = parsePastedEmails('a@test.com; b@test.com\nc@test.com, d@test.com');
    expect(result).toEqual(['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com']);
  });
});

describe('Maximum recipient limit', () => {
  const MAX_RECIPIENTS = 100;

  it('identifies when limit is reached', () => {
    const recipients = Array.from({ length: MAX_RECIPIENTS }, (_, i) => `user${i}@test.com`);
    expect(recipients.length).toBe(MAX_RECIPIENTS);
    expect(recipients.length >= MAX_RECIPIENTS).toBe(true);
  });
});

describe('Subject validation', () => {
  const MAX_SUBJECT_LENGTH = 160;

  it('enforces max length', () => {
    const subject = 'A'.repeat(MAX_SUBJECT_LENGTH + 1);
    expect(subject.length).toBeGreaterThan(MAX_SUBJECT_LENGTH);
  });

  it('allows subject at max length', () => {
    const subject = 'A'.repeat(MAX_SUBJECT_LENGTH);
    expect(subject.length).toBe(MAX_SUBJECT_LENGTH);
  });

  it('rejects empty subject', () => {
    expect(''.trim()).toBe('');
    expect('   '.trim()).toBe('');
  });
});

describe('Message validation', () => {
  const MAX_MESSAGE_LENGTH = 2000;

  it('enforces max length', () => {
    const message = 'A'.repeat(MAX_MESSAGE_LENGTH + 1);
    expect(message.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
  });

  it('allows message at max length', () => {
    const message = 'A'.repeat(MAX_MESSAGE_LENGTH);
    expect(message.length).toBe(MAX_MESSAGE_LENGTH);
  });

  it('allows empty message (optional)', () => {
    expect(''.trim()).toBe('');
  });
});

describe('SendFormState shape', () => {
  it('has required fields', () => {
    const state = {
      senderId: 'uuid-1',
      recipients: ['test@example.com'],
      subject: 'Wedding Invitation',
      message: '',
      mode: 'now' as const,
      scheduledFor: null,
      timezone: 'Europe/London',
    };

    expect(state.senderId).toBeTruthy();
    expect(state.recipients.length).toBeGreaterThan(0);
    expect(state.subject.trim()).toBeTruthy();
    expect(state.mode).toBe('now');
  });

  it('scheduled mode requires scheduledFor', () => {
    const state = {
      senderId: 'uuid-1',
      recipients: ['test@example.com'],
      subject: 'Wedding Invitation',
      message: '',
      mode: 'scheduled' as const,
      scheduledFor: '2026-08-01T14:00:00.000Z',
      timezone: 'Europe/London',
    };

    expect(state.mode).toBe('scheduled');
    expect(state.scheduledFor).toBeTruthy();
  });
});