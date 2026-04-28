export type AnalyticsSummary = {
  totalCustomers: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  issuedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenuePaid: number;
  totalAmountDue: number;
  failedPayments: number;
  successfulPayments: number;
  estimatedMrr: number;
};
