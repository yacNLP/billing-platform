import type { ReactNode } from "react";

import { PageHeader } from "@/components/admin/page-header";

type StatePanelProps = {
  action?: ReactNode;
  eyebrow: string;
  title: string;
  message: string;
};

export function StatePanel({ action, eyebrow, title, message }: StatePanelProps) {
  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          action={action}
          eyebrow={eyebrow}
          title={title}
          description={message}
        />
      </section>
    </main>
  );
}
