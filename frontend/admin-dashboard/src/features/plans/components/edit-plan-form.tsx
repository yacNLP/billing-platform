"use client";

import { FormEvent, useState } from "react";

import { useUpdatePlanMutation } from "@/features/plans/plans-api";
import type { BillingInterval, Plan } from "@/features/plans/types";

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

function toDisplayPrice(amount: number): string {
  return (amount / 100).toFixed(2);
}

type EditPlanFormProps = {
  plan: Plan;
};

export function EditPlanForm({ plan }: EditPlanFormProps) {
  const [code, setCode] = useState(plan.code);
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description || "");
  const [price, setPrice] = useState(toDisplayPrice(plan.amount));
  const [currency, setCurrency] = useState(plan.currency);
  const [interval, setInterval] = useState<BillingInterval>(plan.interval);
  const [intervalCount, setIntervalCount] = useState(String(plan.intervalCount));
  const [trialDays, setTrialDays] = useState(String(plan.trialDays));
  const [active, setActive] = useState(plan.active);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updatePlan, { isLoading }] = useUpdatePlanMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsedIntervalCount = Number(intervalCount);
    const parsedTrialDays = Number(trialDays);
    const amountInMinorUnits = toMinorUnits(price);

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
      await updatePlan({
        id: plan.id,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        amount: amountInMinorUnits,
        currency: currency.trim().toUpperCase(),
        interval,
        intervalCount: parsedIntervalCount,
        trialDays: parsedTrialDays,
        active,
      }).unwrap();

      setSuccessMessage("Plan updated.");
    } catch {
      setErrorMessage("Unable to update plan.");
    }
  }

  return (
    <section className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
          Edit plan
        </h3>
        <p className="text-sm text-slate-600">
          Update the current plan pricing, billing interval, and metadata.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-plan-code">
              Code
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-code"
              name="code"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              type="text"
              value={code}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-plan-name">
              Name
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-name"
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
            htmlFor="edit-plan-description"
          >
            Description
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            id="edit-plan-description"
            name="description"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-plan-price">
              Price
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-price"
              inputMode="decimal"
              name="price"
              onChange={(event) => setPrice(event.target.value)}
              required
              type="text"
              value={price}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-plan-currency">
              Currency
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-currency"
              maxLength={3}
              name="currency"
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              type="text"
              value={currency}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="edit-plan-interval">
              Interval
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-interval"
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
              htmlFor="edit-plan-interval-count"
            >
              Interval count
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-interval-count"
              min={1}
              name="intervalCount"
              onChange={(event) => setIntervalCount(event.target.value)}
              required
              type="number"
              value={intervalCount}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="edit-plan-trial-days"
            >
              Trial days
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="edit-plan-trial-days"
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

        {errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="text-sm text-emerald-600" role="status">
            {successMessage}
          </p>
        ) : null}

        <button
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </section>
  );
}
