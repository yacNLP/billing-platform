"use client";

import { FormEvent, useMemo, useState } from "react";

import { useGetProductsQuery } from "@/features/products/products-api";
import { useCreatePlanMutation } from "@/features/plans/plans-api";
import type { BillingInterval } from "@/features/plans/types";

const intervalOptions: BillingInterval[] = ["DAY", "WEEK", "MONTH", "YEAR"];

function toMinorUnits(priceInput: string): number | null {
  const normalized = priceInput.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function CreatePlanForm() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [interval, setInterval] = useState<BillingInterval>("MONTH");
  const [intervalCount, setIntervalCount] = useState("1");
  const [trialDays, setTrialDays] = useState("0");
  const [active, setActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createPlan, { isLoading, isSuccess }] = useCreatePlanMutation();
  const {
    data: products,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useGetProductsQuery({ page: 1, pageSize: 100, isActive: "true" });

  const activeProducts = useMemo(
    () => products?.data || [],
    [products],
  );

  const hasAvailableProducts = activeProducts.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedProductId = Number(productId);
    const parsedIntervalCount = Number(intervalCount);
    const parsedTrialDays = Number(trialDays);
    const amountInMinorUnits = toMinorUnits(price);

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      setErrorMessage("Please select a product.");
      return;
    }

    if (!Number.isInteger(parsedIntervalCount) || parsedIntervalCount < 1) {
      setErrorMessage("Interval count must be at least 1.");
      return;
    }

    if (!Number.isInteger(parsedTrialDays) || parsedTrialDays < 0) {
      setErrorMessage("Trial days must be 0 or more.");
      return;
    }

    if (amountInMinorUnits === null) {
      setErrorMessage("Please enter a valid price.");
      return;
    }

    try {
      await createPlan({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        productId: parsedProductId,
        amount: amountInMinorUnits,
        currency: currency.trim().toUpperCase(),
        interval,
        intervalCount: parsedIntervalCount,
        trialDays: parsedTrialDays,
        active,
      }).unwrap();

      setCode("");
      setName("");
      setDescription("");
      setProductId("");
      setPrice("");
      setCurrency("EUR");
      setInterval("MONTH");
      setIntervalCount("1");
      setTrialDays("0");
      setActive(true);
    } catch {
      setErrorMessage("Unable to create plan.");
    }
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create plan
          </h2>
          <p className="text-sm text-slate-600">
            Add a billing plan and attach it to an active product.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-code">
                Code *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-code"
                name="code"
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                required
                type="text"
                value={code}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-name">
                Name *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                required
                type="text"
                value={name}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="plan-description"
            >
              Description
            </label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="plan-description"
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-product">
                Product *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoadingProducts || !hasAvailableProducts}
                id="plan-product"
                name="productId"
                onChange={(event) => setProductId(event.target.value)}
                required
                value={productId}
              >
                <option value="">
                  {isLoadingProducts
                    ? "Loading products..."
                    : hasAvailableProducts
                      ? "Select a product"
                      : "No active products available"}
                </option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-price">
                Price *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-price"
                inputMode="decimal"
                name="price"
                onChange={(event) => setPrice(event.target.value)}
                placeholder="29.99"
                required
                type="text"
                value={price}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-currency">
                Currency *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-currency"
                maxLength={3}
                name="currency"
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                required
                type="text"
                value={currency}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-interval">
                Interval *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-interval"
                name="interval"
                onChange={(event) => setInterval(event.target.value as BillingInterval)}
                value={interval}
              >
                {intervalOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="plan-interval-count"
              >
                Interval count *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-interval-count"
                min={1}
                name="intervalCount"
                onChange={(event) => setIntervalCount(event.target.value)}
                required
                type="number"
                value={intervalCount}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="plan-trial-days">
                Trial days *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                id="plan-trial-days"
                min={0}
                name="trialDays"
                onChange={(event) => setTrialDays(event.target.value)}
                required
                type="number"
                value={trialDays}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              checked={active}
              className="h-4 w-4 rounded border border-[var(--color-border)]"
              onChange={(event) => setActive(event.target.checked)}
              type="checkbox"
            />
            Active plan
          </label>

          {productsError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to load active products.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Plan created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isLoadingProducts || !hasAvailableProducts}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create plan"}
          </button>
        </form>
      </div>
    </section>
  );
}
