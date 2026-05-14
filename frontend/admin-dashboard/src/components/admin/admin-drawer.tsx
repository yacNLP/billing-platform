"use client";

import { ReactNode, useEffect } from "react";

type AdminDrawerProps = {
  children: ReactNode;
  description?: string;
  isOpen: boolean;
  title: string;
  onClose: () => void;
};

export function AdminDrawer({
  children,
  description,
  isOpen,
  title,
  onClose,
}: AdminDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      aria-labelledby="admin-drawer-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm"
      role="dialog"
    >
      <div aria-hidden="true" className="absolute inset-0" />

      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <header className="border-b border-[var(--color-border)] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2
                className="text-2xl font-semibold tracking-tight text-slate-950"
                id="admin-drawer-title"
              >
                {title}
              </h2>
              {description ? (
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              ) : null}
            </div>

            <button
              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </aside>
    </div>
  );
}
