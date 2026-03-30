"use client";

import { usePathname } from "next/navigation";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { getNavigationItemByPath } from "@/lib/navigation";

export function Topbar() {
  const pathname = usePathname();
  const currentItem = getNavigationItemByPath(pathname);
  const sectionTitle = currentItem?.label ?? "Admin";

  return (
    <header className="rounded-[2rem] border border-[var(--color-border)] bg-white/90 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Current section
          </p>
          {/* Derive the title from navigation config so the shell stays consistent. */}
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {sectionTitle}
          </h1>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
