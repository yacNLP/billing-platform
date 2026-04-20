export type BillingInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type Plan = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  productId: number;
  amount: number;
  currency: string;
  interval: BillingInterval;
  intervalCount: number;
  trialDays: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlansListResponse = {
  data: Plan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
