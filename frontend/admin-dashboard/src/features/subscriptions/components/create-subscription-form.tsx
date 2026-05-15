"use client";

import { FormEvent, useMemo, useState } from "react";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import type { BillingInterval } from "@/features/plans/types";
import { useGetProductsQuery } from "@/features/products/products-api";
import { useCreateSubscriptionMutation } from "@/features/subscriptions/subscriptions-api";
import { formatDate, formatMoney } from "@/lib/formatters";

function toIsoDateString(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

const intervalLabelMap: Record<BillingInterval, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

function formatInterval(interval: BillingInterval, intervalCount: number): string {
  const label = intervalLabelMap[interval];

  if (intervalCount === 1) {
    return label;
  }

  return `${intervalCount} ${label}s`;
}

type CreateSubscriptionFormProps = {
  isEmbedded?: boolean;
  onCreated?: () => void;
};

export function CreateSubscriptionForm({
  isEmbedded = false,
  onCreated,
}: CreateSubscriptionFormProps) {
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createSubscription, { isLoading, isSuccess }] =
    useCreateSubscriptionMutation();
  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const {
    data: plans,
    isLoading: isLoadingPlans,
    error: plansError,
  } = useGetPlansQuery({ page: 1, pageSize: 100, active: "true" });
  const {
    data: products,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useGetProductsQuery({ page: 1, pageSize: 100, isActive: "true" });

  const activeProducts = useMemo(() => products?.data || [], [products]);
  const activePlans = useMemo(() => plans?.data || [], [plans]);
  const filteredPlans = useMemo(() => {
    const parsedProductId = Number(productId);

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      return [];
    }

    return activePlans.filter((plan) => plan.productId === parsedProductId);
  }, [activePlans, productId]);
  const selectedCustomer = useMemo(
    () => customers?.data.find((customer) => customer.id === Number(customerId)),
    [customerId, customers],
  );
  const selectedProduct = useMemo(
    () => activeProducts.find((product) => product.id === Number(productId)),
    [activeProducts, productId],
  );
  const selectedPlan = useMemo(
    () => activePlans.find((plan) => plan.id === Number(planId)),
    [activePlans, planId],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedCustomerId = Number(customerId);
    const parsedPlanId = Number(planId);

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      setErrorMessage("Please select a customer.");
      return;
    }

    if (!Number.isInteger(parsedPlanId) || parsedPlanId <= 0) {
      setErrorMessage("Please select a plan.");
      return;
    }

    try {
      await createSubscription({
        customerId: parsedCustomerId,
        planId: parsedPlanId,
        startDate: toIsoDateString(startDate),
        cancelAtPeriodEnd,
      }).unwrap();

      setCustomerId("");
      setProductId("");
      setPlanId("");
      setStartDate("");
      setCancelAtPeriodEnd(false);
      onCreated?.();
    } catch {
      setErrorMessage("Unable to create subscription.");
    }
  }

  const formContent = (
    <>
      {!isEmbedded ? (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create subscription
          </h2>
          <p className="text-sm text-slate-600">
            Choose the customer, product, and plan before confirming the
            subscription that will generate the first invoice.
          </p>
        </div>
      ) : null}

      <form className={isEmbedded ? "space-y-4" : "mt-6 space-y-4"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="subscription-customer"
              >
                Customer *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading || isLoadingCustomers}
                id="subscription-customer"
                name="customerId"
                onChange={(event) => setCustomerId(event.target.value)}
                required
                value={customerId}
              >
                <option value="">
                  {isLoadingCustomers ? "Loading customers..." : "Select a customer"}
                </option>
                {(customers?.data || []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} · {customer.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="subscription-product"
              >
                Product *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading || isLoadingProducts}
                id="subscription-product"
                name="productId"
                onChange={(event) => {
                  setProductId(event.target.value);
                  setPlanId("");
                }}
                required
                value={productId}
              >
                <option value="">
                  {isLoadingProducts ? "Loading products..." : "Select a product"}
                </option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="subscription-plan"
              >
                Plan *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading || isLoadingPlans || !productId}
                id="subscription-plan"
                name="planId"
                onChange={(event) => setPlanId(event.target.value)}
                required
                value={planId}
              >
                <option value="">
                  {isLoadingPlans
                    ? "Loading plans..."
                    : productId
                      ? "Select an active plan"
                      : "Select a product first"}
                </option>
                {filteredPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} · {formatMoney(plan.amount, plan.currency)} /{" "}
                    {formatInterval(plan.interval, plan.intervalCount)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="subscription-start-date"
            >
              Start date
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              disabled={isLoading}
              id="subscription-start-date"
              name="startDate"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              checked={cancelAtPeriodEnd}
              className="h-4 w-4 rounded border border-[var(--color-border)]"
              disabled={isLoading}
              onChange={(event) => setCancelAtPeriodEnd(event.target.checked)}
              type="checkbox"
            />
            Do not renew after first period
          </label>

          {selectedCustomer && selectedProduct && selectedPlan ? (
            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Summary
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  {selectedCustomer.name} will subscribe to {selectedProduct.name}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Plan: {selectedPlan.name} ·{" "}
                  {formatMoney(selectedPlan.amount, selectedPlan.currency)} /{" "}
                  {formatInterval(
                    selectedPlan.interval,
                    selectedPlan.intervalCount,
                  )}
                </p>
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div>
                  <dt className="font-medium text-slate-500">Start date</dt>
                  <dd>
                    {startDate
                      ? formatDate(`${startDate}T00:00:00.000Z`)
                      : "Today if left empty"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">First invoice</dt>
                  <dd>Generated automatically</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">
                    Renewal behavior
                  </dt>
                  <dd>
                    {cancelAtPeriodEnd
                      ? "Cancel at current period end"
                      : "Renew normally"}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {customersError || productsError || plansError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to load customers, products, or plans.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Subscription created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isLoading ||
              isLoadingCustomers ||
              isLoadingProducts ||
              isLoadingPlans
            }
            type="submit"
          >
            {isLoading ? "Creating..." : "Create subscription"}
          </button>
        </form>
    </>
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <section className="pb-8 pt-2">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        {formContent}
      </div>
    </section>
  );
}
