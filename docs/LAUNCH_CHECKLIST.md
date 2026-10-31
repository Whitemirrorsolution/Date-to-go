# Go-Live Launch Checklist

## 1. Compliance & Legal
- [ ] Sign off on Privacy Policy & T&Cs.
- [ ] Confirm DPDP Act data retention compliance (KYC files deleted after N days).
- [ ] Review `TAX_COMPLIANCE_TODO.md` with CA (GST rates, TDS on payouts).
- [ ] Establish dispute resolution legal disclaimers.

## 2. Payments & Escrow Integration
- [ ] Secure Payment Gateway "Marketplace/Route" approval (holding and routing funds).
- [ ] Replace `LedgerOnly` mock with `ProviderHold` adapter in production.
- [ ] Webhook signatures verified in production environment.
- [ ] Payouts API enabled and tested in sandbox.

## 3. Security & Infrastructure
- [x] E2E Security audit complete (IDOR, NoSQL Injection, XSS, SSRF).
- [ ] Production Database hardened (VPC, encryption at rest, automated backups).
- [ ] AWS S3 (or equivalent) bucket configured for KYC with strictly private ACLs and server-side encryption.
- [ ] Ledger invariants checker cron job deployed and alerting to Slack/PagerDuty.

## 4. Notifications
- [ ] SMS Gateway (DLT Registration) approved with templates.
- [ ] APNS/FCM keys configured for push notifications.
- [ ] Email delivery configured via SES/SendGrid (DKIM/SPF passed).

## 5. Operations
- [ ] Moderator accounts created.
- [ ] KYC_REVIEWER SOP drafted and communicated.
- [ ] Initial set of Categories created and reviewed.
- [ ] App Settings (Expiry times, OTP expiry, Cancellation Matrix) set in admin panel.
