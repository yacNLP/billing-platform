export type AuditLogAction =
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "plan.created"
  | "plan.updated"
  | "plan.deleted"
  | "subscription.created"
  | "subscription.canceled"
  | "invoice.created"
  | "invoice.marked_paid"
  | "invoice.voided"
  | "invoice.marked_overdue"
  | "invoice.email_sent"
  | "payment.created"
  | "admin_job.run"
  | "tenant_settings.updated"
  | "team.member_created"
  | "team.member_role_updated"
  | "team.member_deleted"
  | "demo.sample_data_loaded"
  | "auth.password_reset_requested"
  | "auth.password_reset_completed";

export type AuditLogEntityType =
  | "customer"
  | "product"
  | "plan"
  | "subscription"
  | "invoice"
  | "payment"
  | "admin_job"
  | "tenant_settings"
  | "team_member"
  | "demo"
  | "auth";

export type AuditLog = {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: unknown;
  actorUserId: number | null;
  createdAt: string;
};

export type AuditLogsQueryParams = {
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  entityId?: number;
};

export type AuditLogsListResponse = {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
