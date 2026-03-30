import type { PropsWithChildren } from "react";

import { ProtectedRoute } from "@/features/auth/components/protected-route";

export default function PrivateLayout({ children }: PropsWithChildren) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
