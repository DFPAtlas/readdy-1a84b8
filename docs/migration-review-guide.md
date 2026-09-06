# Vowora Migration Review Guide

**Version:** 1.0
**Last updated:** 2026-08-05

---

## Overview

Every database migration must be reviewed for safety, correctness, and security before being applied to staging or production. This guide documents the review process and automated checks.

## Migration Naming

All migrations must follow the timestamp convention:

```
supabase/migrations/YYYYMMDDHHMMSS_descriptive_name.sql
```

Examples:
```
20260805120000_add_wedding_archive_status.sql
20260805143000_create_performance_metrics.sql
```

The timestamp ensures deterministic ordering. Description should be a short, lowercase, underscore-separated summary.

## Automated Validation

Run before human review:

```bash
node scripts/validate-migrations.mjs
```

This checks:
1. **Timestamp naming** — all files match `YYYYMMDDHHMMSS_name.sql`
2. **Duplicate names** — no two migrations share the same name
3. **Destructive operations** — flags DROP TABLE, DROP COLUMN, unqualified DELETE/UPDATE, TRUNCATE, RLS disable
4. **RLS consideration** — new tables that appear to need RLS but don't have it
5. **Wedding scoping** — new tables that might need `wedding_id` but don't have it

## Human Review Checklist

### For Every Migration

- [ ] **Purpose clear**: The migration's purpose is obvious from its name and content
- [ ] **Single concern**: One migration does one thing (don't combine schema + data changes unless tightly coupled)
- [ ] **Idempotent where possible**: Uses `IF EXISTS`, `IF NOT EXISTS` guards
- [ ] **No breaking changes**: Does not remove columns or tables still referenced by application code
- [ ] **Backward compatible**: Existing queries continue to work after migration
- [ ] **RLS considered**: New tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and appropriate policies
- [ ] **Indexes appropriate**: New indexes support actual query patterns, not speculative
- [ ] **No hardcoded values**: No hardcoded UUIDs, secrets, or environment-specific data
- [ ] **Transaction-safe**: Operations are safe to run in a transaction (no concurrent DDL conflicts)

### For Schema Changes (DDL)

- [ ] **Column additions**: New columns have sensible defaults or are nullable
- [ ] **Column removals**: Application code no longer references the removed column
- [ ] **Type changes**: Compatible with existing data (no data loss)
- [ ] **Constraint changes**: Won't break existing data
- [ ] **Table creation**: Named clearly, has primary key, has RLS
- [ ] **Function/Trigger creation**: Uses `SECURITY INVOKER` (not `SECURITY DEFINER` without review), search_path set

### For Data Changes (DML)

- [ ] **Scoped**: UPDATE/DELETE has appropriate WHERE clause
- [ ] **Wedding-scoped**: If touching wedding data, includes `wedding_id` filter
- [ ] **Batch-safe**: Large operations use batching or are confirmed as safe for single-transaction
- [ ] **Reversible documented**: If data is deleted, recovery plan is documented

### For Destructive Operations (Requires Explicit Review)

If the migration contains `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or unqualified `DELETE`:

- [ ] **Justified**: Why is this operation necessary?
- [ ] **Reviewed by second developer**: At least one other engineer has reviewed
- [ ] **Backup confirmed**: Backup exists before running
- [ ] **Application ready**: All application code updated to not reference removed objects
- [ ] **Staging tested**: Migration applied successfully in staging first
- [ ] **Rollback plan**: How to recover if something goes wrong

## RLS Policy Requirements

### Every New Table Must Answer

1. **Does this table contain wedding-scoped data?**
   - YES → Must have `wedding_id` column and RLS policy checking `is_wedding_member(wedding_id)`
   - NO → Document why it's intentionally non-scoped

2. **Who can read?**
   - Wedding members (role-based: owner/partner read everything, viewer also reads)
   - Specific roles for sensitive tables

3. **Who can write?**
   - Owner can always write
   - Collaborators can write for tables they manage
   - Service role for system operations

### Wedding-Scoped Table Template

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Read policy
CREATE POLICY "Members can view table"
ON new_table
FOR SELECT
TO authenticated
USING (
  is_wedding_member(wedding_id)
);

-- Insert policy
CREATE POLICY "Members can insert into table"
ON new_table
FOR INSERT
TO authenticated
WITH CHECK (
  is_wedding_member(wedding_id)
);

-- Update policy
CREATE POLICY "Members can update table"
ON new_table
FOR UPDATE
TO authenticated
USING (
  is_wedding_member(wedding_id)
)
WITH CHECK (
  is_wedding_member(wedding_id)
);

-- Delete policy
CREATE POLICY "Owners can delete from table"
ON new_table
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wedding_members
    WHERE wedding_id = new_table.wedding_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'partner')
  )
);
```

## Testing Migrations

### Local Test (Recommended Before PR)

```bash
# 1. Start local Supabase
supabase start

# 2. Apply all migrations
supabase db reset

# 3. Run validation
node scripts/validate-migrations.mjs

# 4. Run application against local DB
npm run dev
```

### CI Test (Automated)

The CI pipeline should (when configured):
1. Start a temporary Supabase instance
2. Apply all migrations from zero
3. Verify schema matches expectations
4. Run representative queries
5. Check RLS policies are enforced

## Migration Rollback

### Safe Reversible Changes
These can be rolled back with a reverse migration:
- Adding columns with defaults
- Adding indexes
- Adding RLS policies
- Creating new tables (can drop if no data yet)

### Forward-Fix Required
These cannot be simply reversed — must deploy a fix migration:
- Renaming columns used by application code
- Changing data types (potential data loss)
- Removing constraints that existing data violates

### Backup Restoration Required
These require full backup restoration:
- Dropping tables with data
- Truncating large datasets
- Corruption from failed migration

## Prohibited Patterns

These must never appear in migrations:

- ❌ `DROP TABLE` without explicit review marker
- ❌ `DELETE FROM table` without WHERE clause
- ❌ `UPDATE table SET col = val` without WHERE clause
- ❌ `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`
- ❌ Hardcoded secrets, API keys, or tokens
- ❌ Environment-specific references (`localhost`, specific URLs)
- ❌ Unsafe SQL injection patterns
- ❌ `SECURITY DEFINER` without explicit `search_path` set

## Migration Review Sign-off

| Migration | Reviewer | Date | Notes |
|-----------|----------|------|-------|
| | | | |

---

*Last updated: 2026-08-05. Always test migrations in staging before production.*