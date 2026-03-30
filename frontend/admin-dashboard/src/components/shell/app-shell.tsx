import type { PropsWithChildren } from "react";

import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "@/components/navigation/topbar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="px-6 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row lg:items-start">
        <Sidebar />

        {/* Main content stays flexible so future shell steps can grow here. */}
        <div className="min-w-0 flex-1 space-y-6">
          <Topbar />
          {children}
        </div>
      </div>
    </div>
  );
}
