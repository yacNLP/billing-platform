"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation, isNavigationItemActive } from "@/lib/navigation";

const navigationGroups = [
  {
    label: "Overview",
    itemIds: ["dashboard"],
  },
  {
    label: "Catalog",
    itemIds: ["customers", "products", "plans"],
  },
  {
    label: "Billing operations",
    itemIds: ["subscriptions", "invoices", "payments"],
  },
  {
    label: "Automation",
    itemIds: ["revenue-actions", "admin-jobs"],
  },
];

const navigationIconMap: Record<string, string> = {
  "admin-jobs": "AJ",
  customers: "CU",
  dashboard: "DB",
  invoices: "IN",
  payments: "PA",
  plans: "PL",
  products: "PR",
  "revenue-actions": "AC",
  subscriptions: "SU",
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-[2rem] border border-slate-800/80 bg-[var(--color-sidebar)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:sticky lg:top-6 lg:w-72 lg:self-start">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-sm font-semibold tracking-tight text-white shadow-[0_12px_30px_rgba(79,70,229,0.32)]">
            RO
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              RevenueOps
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Admin console
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Admin navigation" className="mt-5 space-y-5">
        {navigationGroups.map((group) => {
          const items = group.itemIds
            .map((itemId) => adminNavigation.find((item) => item.id === itemId))
            .filter((item) => item !== undefined);

          return (
            <div key={group.label}>
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {group.label}
              </p>
              <ul className="mt-2 space-y-1">
                {items.map((item) => {
                  const isActive = isNavigationItemActive(pathname, item.path);

                  return (
                    <li key={item.id}>
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className={[
                          "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-medium transition",
                          isActive
                            ? "border-blue-400/30 bg-white text-slate-950 shadow-[0_14px_34px_rgba(15,23,42,0.18)]"
                            : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.06] hover:text-white",
                        ].join(" ")}
                        href={item.path}
                      >
                        <span
                          className={[
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[0.65rem] font-semibold",
                            isActive
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                              : "bg-white/[0.06] text-slate-400",
                          ].join(" ")}
                        >
                          {navigationIconMap[item.id]}
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
