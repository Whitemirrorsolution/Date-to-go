# Tax & Compliance TODOs for CA

This document serves as a checklist for the platform's CA and legal counsel to verify before going live.

## 1. Goods and Services Tax (GST)
- [ ] **Commission GST:** Confirm the GST rate (usually 18%) applied to our platform fee (commission) deducted from the partner.
- [ ] **Service GST:** Determine if the partner's service itself attracts GST and who is responsible for collecting/remitting it. Do we need to collect GST on the total transaction amount on behalf of the partner if they are unregistered, or are we an ECO (E-Commerce Operator) liable under section 9(5) of CGST Act?
- [ ] **Invoicing Flow:** Clarify the invoicing requirements:
  - Do we issue a tax invoice to the partner for the platform fee + GST?
  - Do we issue an invoice to the client for the total amount on behalf of the partner?
  - What are the required GSTIN fields, SAC codes, and formats?

## 2. Tax Deducted at Source (TDS) / TCS
- [ ] **TDS on E-commerce Payouts (Section 194-O):** Does the 1% TDS rule apply to payouts we make to partners? If so, what are the threshold limits, and how do we capture the partner's PAN to remit this TDS?
- [ ] **TCS under GST:** Are we required to collect 1% TCS under GST for sales made through the platform?
- [ ] **PAN Verification:** Mandate PAN upload and automated verification during KYC if TDS is applicable.

## 3. Partner Onboarding & Agreements
- [ ] **Terms of Service (Partner Agreement):** Ensure the contract clearly states the partner is an independent contractor, not an employee.
- [ ] **Escrow/Nodal Account Regulations:** Ensure our payment gateway's "Marketplace" or "Route" features (which hold and split funds) comply with RBI guidelines for payment aggregators and intermediaries.
- [ ] **Age & Verification:** Confirm our 18+ age verification and KYC document requirements (Aadhaar, PAN, Selfie) are legally sufficient to avoid liability for underage usage or identity fraud.

## 4. Refund & Dispute Policies
- [ ] **Consumer Protection (E-Commerce) Rules:** Ensure our cancellation policies, refund matrices, and dispute resolution timelines comply with local consumer laws.
- [ ] **Chargebacks:** Draft a policy on how chargebacks are handled financially between the platform and the partner.

## 5. Privacy & Data Localization
- [ ] **Data Protection (DPDP Act):** Verify our data retention policies (e.g., deleting KYC documents after approval but retaining the verification result and masked ID).
- [ ] **Data Localization:** Ensure payment and KYC data are stored within servers located in India, if mandated.
