export type PaymentStatus = "SUCCESS" | "FAILED";

export type PaymentsQueryParams = {
  status?: PaymentStatus;
  invoiceId?: number;
  customerId?: number;
  page?: number;
  pageSize?: number;
};

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

export type PaymentsListResponse = {
  data: Payment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
