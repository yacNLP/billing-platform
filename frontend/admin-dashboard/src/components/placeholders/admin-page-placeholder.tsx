type AdminPagePlaceholderProps = {
  title: string;
};

export function AdminPagePlaceholder({
  title,
}: AdminPagePlaceholderProps) {
  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Private route
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Coming soon.
          </p>
        </div>
      </section>
    </main>
  );
}
