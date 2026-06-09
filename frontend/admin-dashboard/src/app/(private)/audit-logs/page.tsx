"use client";

import { StatePanel } from "@/components/admin/state-panel";
import { selectIsAdmin } from "@/features/auth/selectors";
import { AuditLogsList } from "@/features/audit-logs/components/audit-logs-list";
import { useAppSelector } from "@/store/hooks";

export default function AuditLogsPage() {
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return (
      <StatePanel
        eyebrow="Audit Logs"
        title="Admin access required"
        message="Audit logs contain security-sensitive workspace activity and are only available to admins."
      />
    );
  }

  return <AuditLogsList />;
}
