export type AnalyticsSummary = {
  totalCustomers: number;
  activeSubscriptions: number;
  overdueInvoicesCount: number;
  overdueAmount: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  mrr: number;
  paidInvoicesThisMonth: number;
};
