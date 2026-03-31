"use client";

import { useGetCustomersQuery } from "@/features/customers/customers-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function CustomersList() {
  const { data, error, isLoading, isFetching } = useGetCustomersQuery();

  if (isLoading) {
    return <StatePanel title="Customers" message="Loading customers..." />;
  }

  if (error) {
    return <StatePanel title="Customers" message="Unable to load customers." />;
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Customers" message="No customers found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Customers
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            First read-only customer list wired to the protected customers
            endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing customers...</p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((customer) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={customer.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">
                    {customer.name}
                  </p>
                  <p className="text-sm text-slate-600">{customer.email}</p>
                </div>

                {/* Keep the first version simple with a readable creation date only. */}
                <p className="text-sm text-slate-500">
                  Created {dateFormatter.format(new Date(customer.createdAt))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

type StatePanelProps = {
  title: string;
  message: string;
};

function StatePanel({ title, message }: StatePanelProps) {
  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Customers
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="text-base leading-7 text-slate-600">{message}</p>
        </div>
      </section>
    </main>
  );
}
