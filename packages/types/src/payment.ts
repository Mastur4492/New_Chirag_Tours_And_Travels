export type PaymentType =
  | 'ADVANCE'
  | 'PARTIAL'
  | 'FINAL_BALANCE'
  | 'SECURITY_DEPOSIT'
  | 'REFUND';

export type PaymentMethod =
  | 'UPI'
  | 'NEFT_IMPS'
  | 'BANK_DEPOSIT'
  | 'CASH'
  | 'CHEQUE'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'OTHER';

export type PaymentStatus = 'SUBMITTED' | 'VERIFIED' | 'REJECTED';

export interface PaymentRecordDto {
  id: string;
  bookingId: string;
  receiptNumber: string;
  amount: number;
  amountInPaise: number;
  currency: 'INR';
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate: string;
  proofDocumentUrl?: string;
  status: PaymentStatus;
  recordedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  settlementReference?: string;
  settledAt?: string;
  settledBy?: string;
  rejectionReason?: string;
  notes?: string;
  isRefund: boolean;
  originalPaymentId?: string;
  refundReason?: string;
  allocatedRefundPaise?: number;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecordPaymentInput {
  bookingId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate?: string;
  proofDocumentUrl?: string;
  notes?: string;
  isRefund?: boolean;
  originalPaymentId?: string;
  refundReason?: string;
  idempotencyKey?: string;
}

export interface RecordRefundInput {
  bookingId: string;
  originalPaymentId: string;
  amount: number;
  refundReason: string;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface VerifyPaymentInput {
  decision: 'VERIFY' | 'REJECT';
  rejectionReason?: string;
  reason?: string;
  settlementReference?: string;
  notes?: string;
}

