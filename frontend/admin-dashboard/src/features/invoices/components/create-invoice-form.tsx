"use client";

import { FormEvent, useMemo, useState } from "react";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useCreateInvoiceMutation } from "@/features/invoices/invoices-api";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";

function toMinorUnits(amountInput: string): number | null {
  const normalized = amountInput.trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function toIsoDateString(dateValue: string): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export function CreateInvoiceForm() {
  const [customerId, setCustomerId] = useState("");
  const [subscriptionId, setSubscriptionId] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createInvoice, { isLoading, isSuccess }] = useCreateInvoiceMutation();
  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useGetCustomersQuery();
  const {
    data: subscriptions,
    isLoading: isLoadingSubscriptions,
    error: subscriptionsError,
  } = useGetSubscriptionsQuery({ page: 1, pageSize: 100 });

  const filteredSubscriptions = useMemo(() => {
    const parsedCustomerId = Number(customerId);
    const activeSubscriptions = (subscriptions?.data || []).filter(
      (subscription) => subscription.status === "ACTIVE",
    );

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      return activeSubscriptions;
    }

    return activeSubscriptions.filter(
      (subscription) => subscription.customerId === parsedCustomerId,
    );
  }, [customerId, subscriptions]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedCustomerId = Number(customerId);
    const parsedSubscriptionId = Number(subscriptionId);
    const amountInMinorUnits = toMinorUnits(amountDue);
    const periodStartIso = toIsoDateString(periodStart);
    const periodEndIso = toIsoDateString(periodEnd);
    const issuedAtIso = toIsoDateString(issuedAt);
    const dueAtIso = toIsoDateString(dueAt);
    const normalizedCurrency = currency.trim().toUpperCase();

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      setErrorMessage("Please select a customer.");
      return;
    }

    if (!Number.isInteger(parsedSubscriptionId) || parsedSubscriptionId <= 0) {
      setErrorMessage("Please select a subscription.");
      return;
    }

    if (amountInMinorUnits === null) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    if (!periodStartIso || !periodEndIso || !dueAtIso) {
      setErrorMessage("Please fill the required invoice dates.");
      return;
    }

    if (new Date(periodEndIso).getTime() <= new Date(periodStartIso).getTime()) {
      setErrorMessage("Period end must be after period start.");
      return;
    }

    if (
      issuedAtIso &&
      new Date(dueAtIso).getTime() < new Date(issuedAtIso).getTime()
    ) {
      setErrorMessage("Due date must be on or after issued date.");
      return;
    }

    try {
      await createInvoice({
        subscriptionId: parsedSubscriptionId,
        customerId: parsedCustomerId,
        amountDue: amountInMinorUnits,
        currency: normalizedCurrency || undefined,
        periodStart: periodStartIso,
        periodEnd: periodEndIso,
        issuedAt: issuedAtIso,
        dueAt: dueAtIso,
      }).unwrap();

      setCustomerId("");
      setSubscriptionId("");
      setAmountDue("");
      setCurrency("EUR");
      setPeriodStart("");
      setPeriodEnd("");
      setIssuedAt("");
      setDueAt("");
    } catch {
      setErrorMessage("Unable to create invoice.");
    }
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create invoice
          </h2>
          <p className="text-sm text-slate-600">
            Create a manual invoice for an existing subscription.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-customer"
              >
                Customer *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading || isLoadingCustomers}
                id="invoice-customer"
                onChange={(event) => {
                  setCustomerId(event.target.value);
                  setSubscriptionId("");
                }}
                required
                value={customerId}
              >
                <option value="">
                  {isLoadingCustomers ? "Loading customers..." : "Select a customer"}
                </option>
                {(customers || []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-subscription"
              >
                Subscription *
              </label>
              <select
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading || isLoadingSubscriptions}
                id="invoice-subscription"
                onChange={(event) => setSubscriptionId(event.target.value)}
                required
                value={subscriptionId}
              >
                <option value="">
                  {isLoadingSubscriptions
                    ? "Loading subscriptions..."
                    : "Select a subscription"}
                </option>
                {filteredSubscriptions.map((subscription) => (
                  <option key={subscription.id} value={subscription.id}>
                    #{subscription.id} · Plan {subscription.planId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-amount"
              >
                Amount due *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-amount"
                inputMode="decimal"
                onChange={(event) => setAmountDue(event.target.value)}
                placeholder="49.00"
                required
                type="text"
                value={amountDue}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-currency"
              >
                Currency
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-currency"
                maxLength={3}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                type="text"
                value={currency}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-period-start"
              >
                Period start *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-period-start"
                onChange={(event) => setPeriodStart(event.target.value)}
                required
                type="date"
                value={periodStart}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-period-end"
              >
                Period end *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-period-end"
                onChange={(event) => setPeriodEnd(event.target.value)}
                required
                type="date"
                value={periodEnd}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-issued-at"
              >
                Issued at
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-issued-at"
                onChange={(event) => setIssuedAt(event.target.value)}
                type="date"
                value={issuedAt}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="invoice-due-at"
              >
                Due at *
              </label>
              <input
                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                disabled={isLoading}
                id="invoice-due-at"
                onChange={(event) => setDueAt(event.target.value)}
                required
                type="date"
                value={dueAt}
              />
            </div>
          </div>

          {customersError || subscriptionsError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to load customers or subscriptions.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Invoice created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || isLoadingCustomers || isLoadingSubscriptions}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create invoice"}
          </button>
        </form>
      </div>
    </section>
  );
}
