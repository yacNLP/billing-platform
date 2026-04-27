"use client";

import { FormEvent, useMemo, useState } from "react";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetPlansQuery } from "@/features/plans/plans-api";
import { useCreateSubscriptionMutation } from "@/features/subscriptions/subscriptions-api";

function toIsoDateString(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export function CreateSubscriptionForm() {
  const [customerId, setCustomerId] = useState("");
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
  } = useGetPlansQuery();

  const activePlans = useMemo(
    () => (plans || []).filter((plan) => plan.active),
    [plans],
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
      setPlanId("");
      setStartDate("");
      setCancelAtPeriodEnd(false);
    } catch {
      setErrorMessage("Unable to create subscription.");
    }
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create subscription
          </h2>
          <p className="text-sm text-slate-600">
            Attach a customer to an active plan and optionally schedule it to end
            at period close.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
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
                    {customer.name}
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
                disabled={isLoading || isLoadingPlans}
                id="subscription-plan"
                name="planId"
                onChange={(event) => setPlanId(event.target.value)}
                required
                value={planId}
              >
                <option value="">
                  {isLoadingPlans ? "Loading plans..." : "Select an active plan"}
                </option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
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
            Cancel at period end
          </label>

          {customersError || plansError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to load customers or plans.
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
            disabled={isLoading || isLoadingCustomers || isLoadingPlans}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create subscription"}
          </button>
        </form>
      </div>
    </section>
  );
}
