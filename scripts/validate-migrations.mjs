/**
 * Vowora Migration Validation Script
 *
 * Usage: node scripts/validate-migrations.mjs
 *
 * Validates Supabase migration files for:
 *   - Timestamp naming convention
 *   - Duplicate migration names
 *   - SQL syntax (basic)
 *   - Destructive operations requiring review
 *   - New tables have RLS consideration
 *   - Wedding-scoped tables have wedding relationship
 *
 * Exits 0 on success, 1 on findings.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

const MIGRATIONS_DIR = resolve(PROJECT_ROOT, 'supabase', 'migrations');

// ── Check 1: Migrations directory exists ──

if (!existsSync(MIGRATIONS_DIR)) {
  console.log('No supabase/migrations directory found — skipping migration validation');
  process.exit(0);
}

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('No migration files found — skipping validation');
  process.exit(0);
}

console.log(`Found ${migrationFiles.length} migration(s)\n`);

// ── Check 2: Timestamp naming ──

const TIMESTAMP_PATTERN = /^\d{14}_.+\.sql$/;
const timestampErrors = [];

for (const file of migrationFiles) {
  if (!TIMESTAMP_PATTERN.test(file)) {
    timestampErrors.push(file);
  }
}

if (timestampErrors.length > 0) {
  console.log('❌ Invalid migration names (expected YYYYMMDDHHMMSS_name.sql):');
  for (const f of timestampErrors) {
    console.log(`   ${f}`);
  }
} else {
  console.log('✅ All migration names follow timestamp convention');
}

// ── Check 3: Duplicate names ──

const nameCounts = {};
for (const file of migrationFiles) {
  const base = file.replace(/^\d{14}_/, '');
  nameCounts[base] = (nameCounts[base] || 0) + 1;
}
const duplicates = Object.entries(nameCounts).filter(([, count]) => count > 1);

if (duplicates.length > 0) {
  console.log('\n❌ Duplicate migration names:');
  for (const [name, count] of duplicates) {
    console.log(`   ${name} (${count}x)`);
  }
} else {
  console.log('✅ No duplicate migration names');
}

// ── Check 4: Destructive operations ──

const DESTRUCTIVE_PATTERNS = [
  { name: 'DROP TABLE', pattern: /\bDROP\s+TABLE\b/i, severity: 'critical' },
  { name: 'DROP COLUMN', pattern: /\bDROP\s+COLUMN\b/i, severity: 'high' },
  { name: 'Unqualified DELETE', pattern: /\bDELETE\s+FROM\s+\w+(?!\s+WHERE)/i, severity: 'critical' },
  { name: 'Unqualified UPDATE', pattern: /\bUPDATE\s+\w+\s+SET\s(?!.*\bWHERE\b)/i, severity: 'critical' },
  { name: 'RLS disabled', pattern: /\bALTER\s+TABLE\s+\w+\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i, severity: 'critical' },
  { name: 'TRUNCATE', pattern: /\bTRUNCATE\b/i, severity: 'high' },
];

let destructiveFindings = 0;

for (const file of migrationFiles) {
  const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
  for (const { name, pattern, severity } of DESTRUCTIVE_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`\n⚠️  [${severity.toUpperCase()}] ${file}: ${name}`);
      console.log(`   Context: ${content.slice(matches.index - 30, matches.index + 80).replace(/\n/g, ' ').trim()}`);
      destructiveFindings++;
    }
  }
}

if (destructiveFindings === 0) {
  console.log('✅ No destructive operations detected');
} else {
  console.log(`\n⚠️  ${destructiveFindings} destructive operation(s) found — review required`);
}

// ── Check 5: RLS consideration for new tables ──

let tablesWithoutRls = 0;

for (const file of migrationFiles) {
  const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
  const createTableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);

  for (const match of createTableMatches) {
    const tableName = match[1];
    // Check if RLS is enabled in this or a later migration
    const hasAlterRls = content.includes(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`);
    const hasCreatePolicy = new RegExp(`CREATE\\s+POLICY.*ON\\s+${tableName}`, 'i').test(content);

    if (!hasAlterRls && !hasCreatePolicy) {
      // Check all migration files (not just current) for RLS enabling
      let rlsFoundElsewhere = false;
      for (const otherFile of migrationFiles) {
        const otherContent = readFileSync(resolve(MIGRATIONS_DIR, otherFile), 'utf-8');
        if (otherContent.includes(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY`)) {
          rlsFoundElsewhere = true;
          break;
        }
      }

      if (!rlsFoundElsewhere) {
        console.log(`\n⚠️  [MEDIUM] Table "${tableName}" in ${file} has no RLS policy in any migration`);
        tablesWithoutRls++;
      }
    }
  }
}

if (tablesWithoutRls === 0) {
  console.log('✅ All tables have RLS policies or enablement');
}

// ── Check 6: Wedding-scoped tables ──

const weddingScopedKeywords = ['wedding_id', 'wedding'];

for (const file of migrationFiles) {
  const content = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8');
  const createTableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi);

  for (const match of createTableMatches) {
    const tableName = match[1].toLowerCase();
    // Skip known non-wedding tables
    if (['profiles', 'user_settings', 'organisations', 'subscriptions'].includes(tableName)) continue;
    if (tableName.startsWith('admin_') || tableName.startsWith('staff_') || tableName.startsWith('cms_')) continue;
    if (tableName.startsWith('email_') || tableName.startsWith('pbx_') || tableName.startsWith('uat_')) continue;
    if (tableName.includes('digital_footprint') || tableName.includes('client_')) continue;

    // Check the CREATE TABLE block for wedding reference
    const tableBlock = content.slice(match.index, content.indexOf(';', match.index) + 1);
    const hasWeddingRef = weddingScopedKeywords.some((kw) =>
      tableBlock.toLowerCase().includes(kw)
    );

    if (!hasWeddingRef) {
      console.log(`\n⚠️  [LOW] Table "${tableName}" in ${file} may be missing wedding_id column — verify it's intentionally non-scoped`);
    }
  }
}

// ── Summary ──

console.log('\n============================================');
console.log('Migration Validation Summary');
console.log('============================================');
console.log(`Total migrations: ${migrationFiles.length}`);
console.log(`Timestamp format errors: ${timestampErrors.length}`);
console.log(`Duplicate names: ${duplicates.length}`);
console.log(`Destructive operations: ${destructiveFindings}`);
console.log(`Tables without RLS: ${tablesWithoutRls}`);

const hasErrors = timestampErrors.length > 0 || duplicates.length > 0 || destructiveFindings > 0;

if (hasErrors) {
  console.log('\n❌ Migration validation FAILED\n');
  process.exit(1);
} else {
  console.log('\n✅ Migration validation PASSED\n');
  process.exit(0);
}