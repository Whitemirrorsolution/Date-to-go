# Date To Go - Launch Checklist

## Legal & Compliance (REVIEW WITH A LAWYER)
- [ ] Terms of Service finalized and vetted.
- [ ] Privacy Policy compliant with DPDP Act 2023.
- [ ] Safety Guidelines & Code of Conduct strictly prohibits romantic/sexual solicitations.
- [ ] Refund & Cancellation Policy clearly stated with time-based rules.
- [ ] Grievance Officer appointed (name, email, timelines updated in policies).

## Payment Gateway (Razorpay)
- [ ] Business KYC approved on Razorpay.
- [ ] Payment gateway category approval (must clarify strictly platonic nature).
- [ ] Razorpay Live Keys swapped in production environment.
- [ ] Webhook URL configured with correct Live secret.
- [ ] Tested end-to-end with real, small-value payments.

## Third-Party Integrations
- [ ] Production KYC Provider (e.g., DigiLocker/Aadhaar API) active and tested.
- [ ] SMS Provider (e.g., MSG91/Twilio) DLT templates approved (India requirement).
- [ ] Email Provider (e.g., AWS SES / Resend) domain verified via SPF, DKIM, DMARC.
- [ ] Cloud Storage (AWS S3 / Cloudinary) buckets configured with correct CORS and IAM permissions.

## Security & Hardening
- [ ] `npm audit` executed, and no critical/high vulnerabilities exist.
- [ ] MongoDB Atlas Network Access restricted to specific App Server IPs.
- [ ] Rate limits configured and active (auth endpoints, OTP).
- [ ] Helmet & CORS strictly configured.
- [ ] JWT secrets and session cookies set to secure/HttpOnly.

## Operations & Monitoring
- [ ] Sentry (or equivalent) configured for error tracking (scrub PII).
- [ ] Automated database backups enabled on MongoDB Atlas.
- [ ] Admin 2FA enforced.
- [ ] Default seeded admin passwords changed.
- [ ] Load testing completed.
- [ ] Incident Response / Rollback plan documented.
