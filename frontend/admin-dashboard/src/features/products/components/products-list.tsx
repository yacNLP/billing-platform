"use client";

import Link from "next/link";

import { useGetProductsQuery } from "@/features/products/products-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function ProductsList() {
  const { data, error, isLoading, isFetching } = useGetProductsQuery();

  if (isLoading) {
    return <StatePanel title="Products" message="Loading products..." />;
  }

  if (error) {
    return <StatePanel title="Products" message="Unable to load products." />;
  }

  if (!data || data.length === 0) {
    return <StatePanel title="Products" message="No products found." />;
  }

  return (
    <main className="px-6 py-16">
      <section className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Products
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
            Listing
          </h2>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            First read-only product list wired to the protected products endpoint.
          </p>
        </div>

        {isFetching ? (
          <p className="mt-6 text-sm text-slate-500">Refreshing products...</p>
        ) : null}

        <ul className="mt-8 space-y-4">
          {data.map((product) => (
            <li
              className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4"
              key={product.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-950">
                    {product.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    {product.isActive ? "Active" : "Inactive"}
                  </p>
                  <Link
                    className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
                    href={`/products/${product.id}`}
                  >
                    View details
                  </Link>
                </div>

                <p className="text-sm text-slate-500">
                  Created {dateFormatter.format(new Date(product.createdAt))}
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
