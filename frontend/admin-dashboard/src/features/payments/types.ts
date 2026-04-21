export type PaymentStatus = "SUCCESS" | "FAILED";

export type Payment = {
  id: number;
  tenantId: number;
  invoiceId: number;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt: string | null;
  failureReason: string | null;
  provider: string | null;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
};
