export const AuditLogAction = {
  CustomerCreated: 'customer.created',
  CustomerUpdated: 'customer.updated',
  CustomerDeleted: 'customer.deleted',
  ProductCreated: 'product.created',
  ProductUpdated: 'product.updated',
  ProductDeleted: 'product.deleted',
  PlanCreated: 'plan.created',
  PlanUpdated: 'plan.updated',
  PlanDeleted: 'plan.deleted',
  SubscriptionCreated: 'subscription.created',
  SubscriptionCanceled: 'subscription.canceled',
  InvoiceCreated: 'invoice.created',
  InvoiceMarkedPaid: 'invoice.marked_paid',
  InvoiceVoided: 'invoice.voided',
  InvoiceMarkedOverdue: 'invoice.marked_overdue',
  InvoiceEmailSent: 'invoice.email_sent',
  PaymentCreated: 'payment.created',
  AdminJobRun: 'admin_job.run',
  TenantSettingsUpdated: 'tenant_settings.updated',
  TeamMemberCreated: 'team.member_created',
  TeamMemberRoleUpdated: 'team.member_role_updated',
  TeamMemberDeleted: 'team.member_deleted',
} as const;

export type AuditLogAction =
  (typeof AuditLogAction)[keyof typeof AuditLogAction];
