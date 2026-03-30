"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation, isNavigationItemActive } from "@/lib/navigation";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur lg:sticky lg:top-6 lg:w-72 lg:self-start">
      <div className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Admin
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
          Navigation
        </h2>
      </div>

      <nav aria-label="Admin navigation" className="mt-6">
        <ul className="space-y-2">
          {adminNavigation.map((item) => {
            // Highlight the current page so the user always knows where they are.
            const isActive = isNavigationItemActive(pathname, item.path);

            return (
              <li key={item.id}>
                <Link
                  className={[
                    "block rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-transparent bg-[var(--color-surface)] text-slate-700 hover:border-[var(--color-border)] hover:text-slate-950",
                  ].join(" ")}
                  href={item.path}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
