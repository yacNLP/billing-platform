export type BillingInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELED"
  | "EXPIRED"
  | "PAST_DUE";

export type SubscriptionsQueryParams = {
  status?: SubscriptionStatus;
  customerId?: number;
  planId?: number;
  page?: number;
  pageSize?: number;
};

export type Subscription = {
  id: number;
  tenantId: number;
  customerId: number;
  planId: number;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  amountSnapshot: number;
  currencySnapshot: string;
  intervalSnapshot: BillingInterval;
  intervalCountSnapshot: number;
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionsListResponse = {
  data: Subscription[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
