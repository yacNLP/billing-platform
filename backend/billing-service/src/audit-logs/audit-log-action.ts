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
  PaymentCreated: 'payment.created',
  AdminJobRun: 'admin_job.run',
} as const;

export type AuditLogAction =
  (typeof AuditLogAction)[keyof typeof AuditLogAction];
