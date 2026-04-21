export type InvoiceStatus = "ISSUED" | "PAID" | "VOID" | "OVERDUE";

export type Invoice = {
  id: number;
  tenantId: number;
  subscriptionId: number;
  customerId: number;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  amountDue: number;
  amountPaid: number;
  periodStart: string;
  periodEnd: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InvoicesListResponse = {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
