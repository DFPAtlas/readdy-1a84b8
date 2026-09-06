# Backup Verification Procedure

**Project:** Vowora  
**Last updated:** 2027-08-05  
**Owner:** Platform Operations

---

## Purpose

This document defines the procedure for verifying Vowora database and storage backups. Backup evidence is recorded in `backup_records` and verified through isolated restore tests recorded in `restore_tests`.

---

## Backup Types

| Type | Provider | Frequency | Retention |
|------|----------|-----------|-----------|
| PostgreSQL Database | Supabase Automated | Daily | 7 days |
| Storage Objects | Supabase Storage | Daily | 7 days |
| Edge Functions | Supabase CLI / manual snapshot | Per deploy | 7 days |
| Configuration | Manual inventory | Weekly | 30 days |
| DNS Records | Manual documentation | Per change | 30 days |

---

## Verification Procedure

### 1. Database Backup Verification

**Frequency:** After every daily backup completes.

**Steps:**
1. Navigate to Supabase Dashboard > Database > Backups
2. Confirm latest backup status is "Completed"
3. Record backup details:
   - Backup ID / timestamp
   - Database version
   - Approximate size
   - Encryption status
4. Create entry in `backup_records` table (via Backups dashboard or API)
5. Mark verification_status as "verified" once confirmed

**Evidence required:**
- Supabase Dashboard screenshot or API response reference
- Provider reference number
- Verification timestamp and verifier name

### 2. Restore Test (Weekly Minimum)

**Frequency:** At least once per week. More often after schema changes.

**Steps:**
1. Create a new Supabase project for the restore test (isolated environment)
2. Restore the latest backup to the isolated environment
3. Run the restore verification checklist:
   - [ ] Database opens successfully
   - [ ] Migration history is readable
   - [ ] Weddings and memberships exist
   - [ ] RLS remains enabled
   - [ ] Cross-wedding access remains blocked
   - [ ] Authenticated test user can access only authorised data
   - [ ] Guest token validation behaves safely
   - [ ] RSVP data remains consistent
   - [ ] Storage references resolve (if storage included)
   - [ ] Stripe remains disconnected or test-only
   - [ ] Resend remains disabled or test-only
   - [ ] Demo mode remains correctly separated
   - [ ] Production secrets are NOT copied into test environment
   - [ ] Application can build against the restored schema
4. Record results in `restore_tests` table
5. If any check fails, document issues and resolution
6. Delete the isolated test environment after verification

**Important safety rules:**
- NEVER restore a backup over production as a routine test
- NEVER send customer emails during restore tests
- NEVER create live Stripe charges during restore tests
- NEVER copy production secrets into the test environment
- ALWAYS verify Stripe and Resend are isolated before testing

### 3. Storage Backup Verification

**Frequency:** Weekly.

**Steps:**
1. Check Supabase Storage backup status
2. Verify bucket listing matches expected structure
3. Spot-check critical files (gallery, exports, website assets)
4. Test download of sample file from backup
5. Record results in `backup_records`

### 4. Edge Function Verification

**Frequency:** Per deployment.

**Steps:**
1. Export or snapshot current Edge Function deployments
2. Store function source and configuration (without secrets)
3. Verify function can be re-deployed from snapshot
4. Record in `backup_records` as `edge_functions` type

### 5. Configuration Backup

**Frequency:** Weekly or after any config change.

**Steps:**
1. Generate environment variable inventory (names only, no values)
2. Document Stripe product/price/webhook configuration (references only)
3. Document Resend domain and sender configuration
4. Document custom domain DNS records
5. Store in secure location
6. Record in `backup_records`

---

## Manual Verification Workflow

When automatic backup metadata retrieval is not available (provider API limitations):

1. Open Backups dashboard at `/app/admin/backups`
2. Click "Record verification" on the backup record
3. Enter verification details:
   - Verifier name
   - Evidence reference (e.g., screenshot filename, ticket ID)
   - Verification date (auto-filled)
4. Mark as "verified"
5. Status is accurately labelled "manually confirmed"

---

## Backup Coverage Checklist

- [ ] PostgreSQL database
- [ ] Supabase Auth relationships (included in PG backup)
- [ ] Storage objects
- [ ] Edge Function source and deployment configuration
- [ ] Environment variable inventory (no secret values)
- [ ] Stripe product and webhook configuration (references only)
- [ ] Resend domain and sender configuration
- [ ] Frontend deployment release identifier
- [ ] Custom domain configuration
- [ ] Required DNS records

---

## Failure Response

If a backup fails:
1. Check Supabase Dashboard for error details
2. If transient: allow retry
3. If persistent: escalate to Supabase support
4. Record failure in `backup_records` with status "failed"
5. Attempt manual backup if supported
6. Do NOT deploy migrations until backup is confirmed

---

## Records

All backup evidence is stored in:
- `backup_records` table (database)
- Backups dashboard at `/app/admin/backups`
- Restore tests at `/app/admin/recovery`

Never store backup download URLs, encryption keys, or provider credentials in backup records.