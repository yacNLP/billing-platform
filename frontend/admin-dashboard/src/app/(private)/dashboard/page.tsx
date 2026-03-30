import { LogoutButton } from "@/features/auth/components/logout-button";

export default function DashboardPage() {
  return (
    <main className="px-6 py-16">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Protected route
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
              Admin dashboard
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Authentication is active. This placeholder route is now protected
              by the frontend auth layer and ready for future billing modules.
            </p>
          </div>

          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
