import { PageHeader } from "@/components/admin/page-header";

type StatePanelProps = {
  eyebrow: string;
  title: string;
  message: string;
};

export function StatePanel({ eyebrow, title, message }: StatePanelProps) {
  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader eyebrow={eyebrow} title={title} description={message} />
      </section>
    </main>
  );
}
