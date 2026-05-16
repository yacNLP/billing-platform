"use client";

import { usePathname } from "next/navigation";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { getNavigationItemByPath } from "@/lib/navigation";
import { selectAuthSession } from "@/features/auth/selectors";
import { useAppSelector } from "@/store/hooks";

export function Topbar() {
  const pathname = usePathname();
  const currentItem = getNavigationItemByPath(pathname);
  const sectionTitle = currentItem?.label ?? "Admin";
  const session = useAppSelector(selectAuthSession);

  return (
    <header className="rounded-[2rem] border border-[var(--color-border)] bg-white/95 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-accent)]">
            Current section
          </p>
          {/* Derive the title from navigation config so the shell stays consistent. */}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            {sectionTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {session ? (
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                {session.role}
              </p>
              <p className="text-sm font-semibold text-slate-950">
                Tenant #{session.tenantId}
              </p>
            </div>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
