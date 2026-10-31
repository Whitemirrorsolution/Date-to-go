# Funds Flow Diagram & Ledger Rules

## Flow Overview

1. **Client Checkout**
   - Client books an accepted slot and pays the total price (Base + GST).
   - Payment Provider processes the payment.
   - **Ledger Action**: `CREDIT` to `CLIENT_ESCROW` (funds held).

2. **Meeting & OTP (Completion)**
   - Client marks "Met" -> OTP generated.
   - Partner enters OTP -> verified.
   - Booking marked `COMPLETED`.
   - **Ledger Actions**:
     - `DEBIT` `CLIENT_ESCROW` (full amount)
     - `CREDIT` `PLATFORM_REVENUE` (Commission Base)
     - `CREDIT` `GST_PAYABLE` (Commission GST)
     - `CREDIT` `PARTNER_AVAILABLE` (Partner Net Amount)

3. **Withdrawal**
   - Partner requests withdrawal of available funds.
   - **Ledger Actions**:
     - `DEBIT` `PARTNER_AVAILABLE` (lock funds)
     - `CREDIT` `PARTNER_PENDING` 
   - Admin approves / Provider processes payout.
   - **Ledger Actions**:
     - `DEBIT` `PARTNER_PENDING`
     - `CREDIT` `WITHDRAWALS` (Money left our ecosystem)

## Invariant Rules
- The sum of all credits across all accounts must exactly equal the sum of all debits.
- `CLIENT_ESCROW` balance must equal the exact sum of all bookings in `PAID`, `IN_PROGRESS`, `AWAITING_OTP`, and `DISPUTED` statuses.
- `PARTNER_AVAILABLE` + `PARTNER_PENDING` must never be negative for any partner.
- Every ledger entry must have a unique idempotent key: `transactionId + account + entryType`.
