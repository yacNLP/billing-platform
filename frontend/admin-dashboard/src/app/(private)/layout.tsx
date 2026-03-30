import type { PropsWithChildren } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";

export default function PrivateLayout({ children }: PropsWithChildren) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}
