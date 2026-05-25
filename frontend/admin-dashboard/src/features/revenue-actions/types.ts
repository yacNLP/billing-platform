export type RevenueActionSeverity = "HIGH" | "MEDIUM" | "LOW";

export type RevenueActionType =
  | "OVERDUE_INVOICE"
  | "PAST_DUE_SUBSCRIPTION"
  | "FAILED_PAYMENT";

export type RevenueActionEntityType = "invoice" | "subscription";

export type RevenueActionsQueryParams = {
  page?: number;
  pageSize?: number;
  severity?: RevenueActionSeverity;
  type?: RevenueActionType;
};

export type RevenueAction = {
  key: string;
  severity: RevenueActionSeverity;
  type: RevenueActionType;
  title: string;
  description: string;
  entityType: RevenueActionEntityType;
  entityId: number;
  amount?: number;
  currency?: string;
  suggestedAction: string;
  createdFromRule: string;
  metadata?: Record<string, unknown>;
};

export type RevenueActionsListResponse = {
  data: RevenueAction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
