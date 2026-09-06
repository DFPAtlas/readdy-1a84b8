# Vowora — Email Production Checklist

> Generated: 2026-08-04 | Phase 9C | Version 214

## Required Secrets

Set in Supabase Dashboard → Edge Function Secrets:

| Secret | Used By |
|---|---|
| `RESEND_API_KEY` | `invitation-send`, `email-campaign-send` |
| `RESEND_FROM_DOMAIN` | `invitation-send` (sender domain, e.g. `vowora.uk`) |

## Domain Verification

Resend requires domain verification before sending production email:

1. Add your sending domain in Resend Dashboard
2. Configure DNS records as instructed (SPF + DKIM)
3. Wait for verification (can take minutes to hours)
4. Domain status must show "Verified"

## DNS Requirements

| Record | Type | Purpose |
|---|---|---|
| SPF | TXT | `v=spf1 include:spf.resend.com ~all` |
| DKIM | TXT | Provided by Resend during domain setup |
| DMARC | TXT | Recommended: `v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com` |

## Sender Configuration

Applied in `invitation-send` Edge Function:

```
From: {Partner Names} <noreply@{RESEND_FROM_DOMAIN}>
Reply-To: noreply@{RESEND_FROM_DOMAIN}
```

## Email Templates

### Invitation Email
- Beautiful HTML template with wedding branding
- Includes couple names, wedding date, event details
- RSVP button linking to secure invitation token URL
- Plain text fallback
- Uses `SITE_URL` env var for invite link construction

### Campaign Email
- Customisable HTML content blocks
- Brand colours, fonts, CTA
- Audience filtering

## Security

- [ ] `RESEND_API_KEY` never exposed in client code
- [ ] `RESEND_FROM_DOMAIN` stored server-side
- [ ] Invitation tokens not logged in email content
- [ ] Guest dietary/accessibility data not included in emails
- [ ] Demo mode never sends real emails (blocked at hook level)
- [ ] Rate limiting: max 20 sends per 60 seconds via fingerprint

## Test Procedure

1. Set `RESEND_API_KEY` in Supabase Dashboard
2. Set `RESEND_FROM_DOMAIN` to verified domain
3. Use test email address (`delivered@resend.dev` in Resend test mode)
4. Create an invitation with a test guest (real email)
5. Click "Send invitation"
6. Verify email arrives with correct styling and working RSVP link
7. Check `invitation_access_activity` for delivery event

## Failure Handling

- Resend API errors logged in `invitation_access_activity`
- Failed deliveries update invitation status to `delivery_status: 'failed'`
- `last_delivery_error` column stores truncated error message
- Token remains valid even if email fails — couple can use copy-link feature
- If Resend is not configured, token is generated and returned for manual sharing

## Bounce/Complaint Handling

- Resend webhook endpoint: Not yet implemented
- Recommendation: Configure Resend webhooks for bounce/complaint monitoring
- Action: Add bounced emails to `email_suppressions` table

## Pre-Launch Verification

- [ ] Resend domain verified
- [ ] SPF record published
- [ ] DKIM record published  
- [ ] DMARC policy set (recommended)
- [ ] `RESEND_API_KEY` configured in Supabase Dashboard
- [ ] `RESEND_FROM_DOMAIN` configured in Supabase Dashboard
- [ ] Test email sent and received successfully
- [ ] Invitation link resolves correctly
- [ ] Demo mode blocks email sending