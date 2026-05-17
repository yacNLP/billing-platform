"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import { EditProductForm } from "@/features/products/components/edit-product-form";
import {
  useDeleteProductMutation,
  useGetProductByIdQuery,
} from "@/features/products/products-api";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

type ProductDetailsProps = {
  id: number;
};

export function ProductDetails({ id }: ProductDetailsProps) {
  const router = useRouter();
  const { data, error, isLoading } = useGetProductByIdQuery(id);
  const { data: plans } = useGetPlansQuery({ page: 1, pageSize: 100 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  async function handleDeleteProduct() {
    setErrorMessage(null);

    try {
      await deleteProduct(id).unwrap();
      router.push("/products");
    } catch {
      setErrorMessage("Unable to delete product.");
    }
  }

  if (isLoading) {
    return <StatePanel title="Product details" message="Loading product..." />;
  }

  if (error) {
    return <StatePanel title="Product details" message="Unable to load product." />;
  }

  if (!data) {
    return <StatePanel title="Product details" message="Product not found." />;
  }

  const descriptionLabel = data.description || "No description provided.";
  const linkedPlans = plans?.data.filter((plan) => plan.productId === data.id);
  const linkedPlansCount = linkedPlans?.length;
  const activePlansCount = linkedPlans?.filter((plan) => plan.active).length;
  const inactivePlansCount = linkedPlans?.filter((plan) => !plan.active).length;
  const statusClassName = data.isActive
    ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
    : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600";

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Products
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              {data.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-base leading-7 text-slate-600">
                Product ID #{data.id}
              </p>
              <span className={statusClassName}>
                {data.isActive ? "Active catalog item" : "Inactive catalog item"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Catalog identity used to group commercial plans."
              title="Product overview"
            >
              <DetailItem label="Name" value={data.name} />
              <DetailItem label="Description" value={descriptionLabel} />
            </DetailSection>

            <DetailSection
              description="Plans currently linked to this catalog product."
              title="Linked plans"
            >
              <DetailItem
                label="Plans linked"
                value={
                  linkedPlansCount !== undefined
                    ? linkedPlansCount
                    : "Loading..."
                }
              />
              <DetailItem
                label="Active plans"
                value={
                  activePlansCount !== undefined
                    ? activePlansCount
                    : "Loading..."
                }
              />
              <DetailItem
                label="Inactive plans"
                value={
                  inactivePlansCount !== undefined
                    ? inactivePlansCount
                    : "Loading..."
                }
              />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Plans using this product
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Compact view of the catalog plans currently attached to this
                  product.
                </p>
              </div>

              <div className="mt-5 divide-y divide-[var(--color-border)] rounded-[1.25rem] border border-[var(--color-border)] bg-white">
                {!linkedPlans ? (
                  <p className="px-4 py-3 text-sm text-slate-600">
                    Loading plans...
                  </p>
                ) : linkedPlans.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-600">
                    No plans are linked to this product yet.
                  </p>
                ) : (
                  linkedPlans.map((plan) => (
                    <div
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      key={plan.id}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {plan.name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          {plan.code}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="text-sm font-semibold text-slate-950">
                          {formatMoney(plan.amount, plan.currency)} /{" "}
                          {plan.interval.toLowerCase()}
                        </span>
                        <span
                          className={
                            plan.active
                              ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                          }
                        >
                          {plan.active ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="Current catalog state and creation date."
              title="Catalog status"
            >
              <DetailItem
                label="Status"
                value={
                  <span className={statusClassName}>
                    {data.isActive ? "Active" : "Inactive"}
                  </span>
                }
              />
              <DetailItem
                label="Created"
                value={dateFormatter.format(new Date(data.createdAt))}
              />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Product actions
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Manage this product catalog entry and destructive actions.
                </p>
              </div>

              {errorMessage ? (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  onClick={() => setIsEditDrawerOpen(true)}
                  type="button"
                >
                  Edit product
                </button>

                {!isDeleteConfirmationOpen ? (
                  <button
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isDeleting}
                    onClick={() => setIsDeleteConfirmationOpen(true)}
                    type="button"
                  >
                    Delete product
                  </button>
                ) : null}
              </div>

              {isDeleteConfirmationOpen ? (
                <div className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold tracking-tight text-red-900">
                      Delete product
                    </h4>
                    <p className="text-sm leading-6 text-red-800">
                      This action will permanently delete this product. This
                      cannot be undone.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className="rounded-xl bg-red-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeleting}
                      onClick={handleDeleteProduct}
                      type="button"
                    >
                      {isDeleting ? "Deleting..." : "Confirm delete"}
                    </button>

                    <button
                      className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isDeleting}
                      onClick={() => setIsDeleteConfirmationOpen(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      </section>

      <AdminDrawer
        description="Update the current product name, description, and active status."
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        title="Edit product"
      >
        <EditProductForm
          isEmbedded
          onUpdated={() => setIsEditDrawerOpen(false)}
          product={data}
        />
      </AdminDrawer>
    </main>
  );
}

type DetailSectionProps = {
  children: ReactNode;
  description: string;
  title: string;
};

function DetailSection({ children, description, title }: DetailSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <dl className="mt-5 divide-y divide-[var(--color-border)] rounded-[1.25rem] border border-[var(--color-border)] bg-white">
        {children}
      </dl>
    </section>
  );
}

type DetailItemProps = {
  label: string;
  value: ReactNode;
};

function DetailItem({ label, value }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-950 sm:text-right">
        {value}
      </dd>
    </div>
  );
}

type StatePanelProps = {
  title: string;
  message: string;
};

function StatePanel({ title, message }: StatePanelProps) {
  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
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
