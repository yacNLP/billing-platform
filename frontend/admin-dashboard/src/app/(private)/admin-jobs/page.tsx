"use client";

import { StatePanel } from "@/components/admin/state-panel";
import { selectIsAdmin } from "@/features/auth/selectors";
import { AdminJobsPanel } from "@/features/admin-jobs/components/admin-jobs-panel";
import { useAppSelector } from "@/store/hooks";

export default function AdminJobsPage() {
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return (
      <StatePanel
        eyebrow="Automation"
        title="Admin access required"
        message="Admin jobs can change billing data and are available to workspace admins only."
      />
    );
  }

  return <AdminJobsPanel />;
}
