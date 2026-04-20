"use client";

import { useGetProductByIdQuery } from "@/features/products/products-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type ProductDetailsProps = {
  id: number;
};

export function ProductDetails({ id }: ProductDetailsProps) {
  const { data, error, isLoading } = useGetProductByIdQuery(id);

  if (isLoading) {
    return <StatePanel title="Product details" message="Loading product..." />;
  }

  if (error) {
    return <StatePanel title="Product details" message="Unable to load product." />;
  }

  if (!data) {
    return <StatePanel title="Product details" message="Product not found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Products
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            {data.name}
          </h2>
          <p className="text-base leading-7 text-slate-600">
            {data.description || "No description provided."}
          </p>
        </div>

        <dl className="mt-8 space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Name</dt>
            <dd className="mt-1 text-base text-slate-950">{data.name}</dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Description</dt>
            <dd className="mt-1 text-base text-slate-950">
              {data.description || "No description provided."}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Status</dt>
            <dd className="mt-1 text-base text-slate-950">
              {data.isActive ? "Active" : "Inactive"}
            </dd>
          </div>

          <div className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
            <dt className="text-sm font-medium text-slate-500">Created</dt>
            <dd className="mt-1 text-base text-slate-950">
              {dateFormatter.format(new Date(data.createdAt))}
            </dd>
          </div>
        </dl>
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
            Products
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
