# Storage Cleanup Runbook

**Project:** Vowora  
**Last updated:** 2027-08-05  
**Owner:** Platform Operations

---

## Purpose

This runbook defines the procedure for auditing and cleaning up Vowora storage (Supabase Storage buckets). Storage cleanup identifies orphaned files, expired exports, rejected media past retention, and other reclaimable storage.

All cleanup operations are recorded in `storage_cleanup_audit` table for accountability.

---

## Storage Buckets

| Bucket | Purpose | Cleanup Cadence |
|--------|---------|-----------------|
| `private` | User uploads, exports, wedding assets | Monthly |
| `public` | Published website assets, public gallery | Monthly |
| Gallery quarantine | Rejected/moderated media | Weekly |

---

## Cleanup Categories

### 1. Orphaned Files (Database rows missing, file exists)

**Detection:** List all files in storage, cross-reference with database records.

**Action:** Flag for review. Do NOT auto-delete. Verify wedding ownership before removal.

**Example:** A gallery_assets record was deleted but the file in storage was not cleaned up.

### 2. Orphaned Database Records (File missing, DB row exists)

**Detection:** Query gallery_assets, invitation assets, export records where storage_path is set but file does not exist in bucket.

**Action:** Mark DB record as missing. Notify admin. Do not auto-delete DB rows.

### 3. Expired Exports

**Detection:** Export files where `export_expires_at` has passed and `downloaded_at` is set (downloaded) or `export_expires_at` + 24 hours has passed (undownloaded).

**Action:** Safe to delete. Export was generated for one-time download.

### 4. Rejected Gallery Media Past Retention

**Detection:** Gallery assets with moderation status "rejected" older than 30 days.

**Action:** Delete from quarantine bucket. Update DB record if needed.

### 5. Replaced Website Media

**Detection:** Old versions of website media where a newer version exists.

**Action:** Retain last 3 versions. Delete older.

### 6. Removed Profile Images

**Detection:** Profile avatar files where the profile record no longer references them.

**Action:** Delete after 30 days grace period.

### 7. Abandoned Uploads

**Detection:** Files in upload staging areas older than 24 hours with no associated completed record.

**Action:** Safe to delete.

### 8. Temporary Files

**Detection:** Files in `tmp/` paths older than 24 hours.

**Action:** Safe to delete.

---

## Cleanup Procedure

### Dry Run (Always First)

1. Query storage for all files
2. Cross-reference with database records
3. Generate report of:
   - Orphaned files (count and total size)
   - Orphaned DB records (count)
   - Expired exports (count and total size)
   - Rejected media past retention (count)
   - Replaced website media (count)
   - Abandoned uploads (count)
4. Record dry run in `storage_cleanup_audit` with `run_type = 'dry_run'`
5. Review report with admin before proceeding

### Cleanup Execution

1. Process in batches of 100 files
2. For each file:
   - Verify wedding ownership and database reference (do NOT delete by filename pattern alone)
   - Delete from storage
   - Update database record if needed
3. Record results in `storage_cleanup_audit` with `run_type = 'cleanup'`
4. If errors occur: stop batch, record errors, retry failed batch

### Post-Cleanup

1. Verify no critical files were removed
2. Check gallery, exports, and website still function
3. Record total files removed and space reclaimed
4. Update audit log

---

## Safety Rules

- [ ] ALWAYS run dry-run first
- [ ] NEVER delete files solely by filename pattern
- [ ] ALWAYS verify wedding ownership and database references before deletion
- [ ] NEVER delete files under active retention hold
- [ ] NEVER delete financial or security-related files
- [ ] Process in small batches (100 max)
- [ ] Stop on unexpected errors
- [ ] Record all actions in audit table

---

## Error Handling

| Error | Response |
|-------|----------|
| File not found during delete | Skip, record warning |
| Permission denied | Check bucket policies, escalate |
| Rate limited | Wait, retry with smaller batch |
| Database reference ambiguous | Skip file, flag for manual review |
| Wedding ownership unclear | Skip file, flag for manual review |

---

## Schedule

| Cleanup Type | Frequency | Owner |
|--------------|-----------|-------|
| Expired exports | Weekly | Automated job |
| Rejected media | Weekly | Automated job |
| Abandoned uploads | Daily | Automated job |
| Orphaned files | Monthly | Manual (with dry-run) |
| Website media versions | Monthly | Manual review |
| Profile images | Monthly | Manual review |