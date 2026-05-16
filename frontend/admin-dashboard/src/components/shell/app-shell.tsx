import type { PropsWithChildren } from "react";

import { Sidebar } from "@/components/navigation/sidebar";
import { Topbar } from "@/components/navigation/topbar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-6 lg:flex-row lg:items-start">
        <Sidebar />

        {/* Main content stays flexible so future shell steps can grow here. */}
        <div className="min-w-0 flex-1 space-y-4">
          <Topbar />
          {children}
        </div>
      </div>
    </div>
  );
}
