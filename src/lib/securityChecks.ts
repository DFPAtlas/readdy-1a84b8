/**
 * Vowora Code Security Checks
 *
 * Lightweight static-analysis patterns for detecting high-risk code.
 * These are advisory checks, not build gates — they flag patterns for review.
 *
 * Run during CI as part of the security-scan job.
 */

// ── Types ──

export interface SecurityFinding {
  file: string;
  line: number;
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  snippet: string;
}

export interface SecurityAuditResult {
  findings: SecurityFinding[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
}

// ── Pattern Definitions ──

interface Rule {
  id: string;
  name: string;
  severity: SecurityFinding['severity'];
  description: string;
  patterns: RegExp[];
  excludePatterns?: RegExp[];
}

export const SECURITY_RULES: Rule[] = [
  {
    id: 'NO_DANGEROUSLY_SET_HTML',
    name: 'dangerouslySetInnerHTML usage',
    severity: 'high',
    description: 'Avoid dangerouslySetInnerHTML unless output is thoroughly sanitised',
    patterns: [/dangerouslySetInnerHTML\s*=\s*\{/],
  },
  {
    id: 'NO_DYNAMIC_SQL',
    name: 'Dynamic SQL construction',
    severity: 'critical',
    description: 'Never build SQL queries with string concatenation or template literals',
    patterns: [
      /`\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s/,
      /['"]\s*(SELECT|INSERT|UPDATE|DELETE|DROP)\s.*['"]/,
    ],
    excludePatterns: [/\.test\./, /\.spec\./, /__tests__/, /security-audit/],
  },
  {
    id: 'NO_OPEN_REDIRECT',
    name: 'Potential open redirect',
    severity: 'medium',
    description: 'Redirects using user-controlled parameters must validate target',
    patterns: [/window\.location\s*=\s*(?!['"]#)/, /window\.location\.href\s*=\s*/],
    excludePatterns: [/\.test\./, /node_modules/],
  },
  {
    id: 'NO_ARBITRARY_TABLES',
    name: 'Arbitrary table names from client',
    severity: 'critical',
    description: 'Never accept table names from client requests',
    patterns: [/\.from\(\s*(req|params|query|body|args)/, /\.from\(\s*\$\{/],
    excludePatterns: [/\.test\./, /supabase\/functions/],
  },
  {
    id: 'NO_MISSING_AUTH',
    name: 'Admin function missing authentication',
    severity: 'high',
    description: 'Admin or privileged operations must verify authentication',
    patterns: [/export\s+default\s+async\s+function\s+(.*admin|.*delete|.*export).*(?!verify_jwt)/],
    excludePatterns: [/\.test\./],
  },
  {
    id: 'NO_SELECT_STAR_SENSITIVE',
    name: 'select("*") on large or sensitive tables',
    severity: 'medium',
    description: 'Prefer explicit column selection on tables containing private data',
    patterns: [
      /\.from\(['"]guests['"]\)\s*\.select\(['"]\*['"]\)/,
      /\.from\(['"]rsvp_submissions['"]\)\s*\.select\(['"]\*['"]\)/,
    ],
  },
  {
    id: 'NO_PUBLIC_PRIVATE_STORAGE',
    name: 'Public storage for private data',
    severity: 'high',
    description: 'Do not expose private data through public storage buckets',
    patterns: [
      /\.from\(['"]public['"]\).*\.upload\(/,
      /bucket.*=.*['"]public['"]/,
    ],
    excludePatterns: [/\.test\./, /demo\b/],
  },
  {
    id: 'NO_CLIENT_SUBSCRIPTION_UPDATE',
    name: 'Direct client updates to subscription state',
    severity: 'critical',
    description: 'Subscription state changes must go through verified Edge Functions',
    patterns: [
      /\.from\(['"]subscriptions['"]\)\s*\.(update|upsert|insert)\(/,
      /\.from\(['"]wedora_subscriptions['"]\)\s*\.(update|upsert|insert)\(/,
    ],
    excludePatterns: [/supabase\/functions/, /stripe-webhook/],
  },
  {
    id: 'NO_RAW_TOKENS_IN_LOGS',
    name: 'Raw tokens or secrets in console.log',
    severity: 'medium',
    description: 'Never log tokens, secrets, or authentication credentials',
    patterns: [
      /console\.(log|warn|error)\(.*token/i,
      /console\.(log|warn|error)\(.*secret/i,
      /console\.(log|warn|error)\(.*password/i,
      /console\.(log|warn|error)\(.*api[_-]?key/i,
    ],
    excludePatterns: [/\.test\./, /__tests__/, /securityChecks/],
  },
  {
    id: 'NO_SERVICE_ROLE_IN_CLIENT',
    name: 'Service role import in client code',
    severity: 'critical',
    description: 'Service role credentials must never appear in client-side code',
    patterns: [
      /service_role/,
      /SERVICE_ROLE_KEY/,
      /SUPABASE_SERVICE/,
    ],
    excludePatterns: [/\.test\./, /supabase\/functions/, /env\.ts/, /environment\.ts/, /\.env\.example/, /\.gitleaks/, /scripts\//],
  },
];

// ── Scanner ──

export function scanSourceLine(
  filePath: string,
  lineNumber: number,
  lineContent: string,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];

  for (const rule of SECURITY_RULES) {
    // Check exclude patterns first
    if (rule.excludePatterns) {
      const isExcluded = rule.excludePatterns.some((p) => p.test(filePath));
      if (isExcluded) continue;
    }

    // Check each pattern
    for (const pattern of rule.patterns) {
      if (pattern.test(lineContent)) {
        findings.push({
          file: filePath,
          line: lineNumber,
          rule: rule.id,
          severity: rule.severity,
          message: rule.description,
          snippet: lineContent.trim().slice(0, 120),
        });
        break; // One finding per rule per line
      }
    }
  }

  return findings;
}

export function scanSourceCode(
  filePath: string,
  content: string,
): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineFindings = scanSourceLine(filePath, i + 1, lines[i]);
    findings.push(...lineFindings);
  }

  return findings;
}

export function summarizeFindings(findings: SecurityFinding[]): SecurityAuditResult {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, total: findings.length };
  for (const f of findings) {
    summary[f.severity]++;
  }

  return { findings, summary };
}

// ── Release Gate ──

export function passesReleaseGate(result: SecurityAuditResult): { pass: boolean; reason: string } {
  if (result.summary.critical > 0) {
    return {
      pass: false,
      reason: `${result.summary.critical} critical security finding(s) — must be resolved before release`,
    };
  }
  if (result.summary.high > 0) {
    return {
      pass: false,
      reason: `${result.summary.high} high-severity security finding(s) — review and resolve or document exceptions`,
    };
  }
  return { pass: true, reason: 'Security audit passed' };
}

// ── Export for CI use ──

export default {
  SECURITY_RULES,
  scanSourceLine,
  scanSourceCode,
  summarizeFindings,
  passesReleaseGate,
};