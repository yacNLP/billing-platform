export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface)] px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-[var(--color-border)] bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          Revenue & Billing Platform
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Admin dashboard foundation is ready.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          This frontend currently exposes only the technical base: Next.js App
          Router, Tailwind CSS, Redux Toolkit, RTK Query, typed environment
          access, and a scalable source structure.
        </p>
      </section>
    </main>
  );
}
