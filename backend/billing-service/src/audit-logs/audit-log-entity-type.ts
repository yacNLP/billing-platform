export const AuditLogEntityType = {
  Customer: 'customer',
  Product: 'product',
  Plan: 'plan',
  Subscription: 'subscription',
  Invoice: 'invoice',
  Payment: 'payment',
  AdminJob: 'admin_job',
} as const;

export type AuditLogEntityType =
  (typeof AuditLogEntityType)[keyof typeof AuditLogEntityType];
