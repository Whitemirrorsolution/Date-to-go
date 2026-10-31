export type BookingStage = 
  | 'REQUESTED' 
  | 'ACCEPTED' 
  | 'PAYMENT_PENDING' 
  | 'PAID' 
  | 'IN_PROGRESS' 
  | 'AWAITING_OTP' 
  | 'COMPLETED' 
  | 'DECLINED' 
  | 'CANCELLED' 
  | 'EXPIRED' 
  | 'DISPUTED' 
  | 'REFUNDED';

export interface StageConfig {
  label: string;
  colorVar: string;
  description: string;
}

export const STAGE_MAP: Record<BookingStage, StageConfig> = {
  REQUESTED: {
    label: 'Requested',
    colorVar: 'var(--color-stage-requested)',
    description: 'Awaiting companion approval',
  },
  ACCEPTED: {
    label: 'Accepted',
    colorVar: 'var(--color-stage-accepted)',
    description: 'Companion has accepted',
  },
  PAYMENT_PENDING: {
    label: 'Payment Pending',
    colorVar: 'var(--color-stage-payment)',
    description: 'Awaiting your payment',
  },
  PAID: {
    label: 'Paid & Confirmed',
    colorVar: 'var(--color-stage-paid)',
    description: 'Booking is confirmed',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    colorVar: 'var(--color-stage-progress)',
    description: 'Meeting is happening now',
  },
  AWAITING_OTP: {
    label: 'Awaiting OTP',
    colorVar: 'var(--color-stage-otp)',
    description: 'Verify meeting start with OTP',
  },
  COMPLETED: {
    label: 'Completed',
    colorVar: 'var(--color-stage-completed)',
    description: 'Meeting finished successfully',
  },
  DECLINED: {
    label: 'Declined',
    colorVar: 'var(--color-stage-declined)',
    description: 'Companion declined the request',
  },
  CANCELLED: {
    label: 'Cancelled',
    colorVar: 'var(--color-stage-declined)',
    description: 'Booking was cancelled',
  },
  EXPIRED: {
    label: 'Expired',
    colorVar: 'var(--color-stage-expired)',
    description: 'Booking time has passed',
  },
  DISPUTED: {
    label: 'Disputed',
    colorVar: 'var(--color-stage-disputed)',
    description: 'Booking is under dispute review',
  },
  REFUNDED: {
    label: 'Refunded',
    colorVar: 'var(--color-stage-refunded)',
    description: 'Payment was refunded',
  }
};
