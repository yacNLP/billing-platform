export class SubscriptionsByPlanDto {
  planId!: number;
  planCode!: string;
  planName!: string;
  activeSubscriptions!: number;
}

export class AnalyticsSummaryDto {
  totalCustomers!: number;
  activeSubscriptions!: number;
  pastDueSubscriptions!: number;
  issuedInvoices!: number;
  paidInvoices!: number;
  overdueInvoices!: number;
  totalRevenuePaid!: number;
  revenueThisMonth!: number;
  totalAmountDue!: number;
  overdueAmount!: number;
  failedPayments!: number;
  successfulPayments!: number;
  paymentSuccessRate!: number;
  estimatedMrr!: number;
  subscriptionsByPlan!: SubscriptionsByPlanDto[];
}
