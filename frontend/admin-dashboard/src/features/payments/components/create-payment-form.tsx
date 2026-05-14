"use client";

import { FormEvent, useMemo, useState } from "react";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetInvoicesQuery } from "@/features/invoices/invoices-api";
import {
  useCreatePaymentMutation,
  useGetPaymentsQuery,
} from "@/features/payments/payments-api";
import type { PaymentStatus } from "@/features/payments/types";
import { formatDate, formatMoney } from "@/lib/formatters";

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

function getTodayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

type CreatePaymentFormProps = {
  isEmbedded?: boolean;
  onCreated?: () => void;
};

export function CreatePaymentForm({
  isEmbedded = false,
  onCreated,
}: CreatePaymentFormProps) {
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("SUCCESS");
  const [paidAt, setPaidAt] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [provider, setProvider] = useState("stripe");
  const [providerReference, setProviderReference] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createPayment, { isLoading, isSuccess }] = useCreatePaymentMutation();
  const {
    data: invoices,
    isLoading: isLoadingInvoices,
    error: invoicesError,
  } = useGetInvoicesQuery({ page: 1, pageSize: 100 });
  const {
    data: customers,
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const {
    data: payments,
    isLoading: isLoadingPayments,
    error: paymentsError,
  } = useGetPaymentsQuery({ page: 1, pageSize: 100 });

  const payableInvoices = useMemo(() => {
    const usedInvoiceIds = new Set(
      (payments?.data || [])
        .filter((payment) => payment.status === "SUCCESS")
        .map((payment) => payment.invoiceId),
    );

    return (invoices?.data || []).filter(
      (invoice) =>
        (invoice.status === "ISSUED" || invoice.status === "OVERDUE") &&
        !usedInvoiceIds.has(invoice.id),
    );
  }, [invoices, payments]);

  const selectedInvoice = useMemo(
    () => payableInvoices.find((invoice) => invoice.id === Number(invoiceId)),
    [invoiceId, payableInvoices],
  );
  const selectedCustomer = useMemo(
    () =>
      customers?.data.find((customer) => customer.id === selectedInvoice?.customerId),
    [customers, selectedInvoice],
  );

  function handleInvoiceChange(nextInvoiceId: string) {
    setInvoiceId(nextInvoiceId);

    const invoice = payableInvoices.find(
      (item) => item.id === Number(nextInvoiceId),
    );

    if (!invoice) {
      setAmount("");
      setCurrency("");
      setPaidAt("");
      return;
    }

    setAmount((invoice.amountDue / 100).toFixed(2));
    setCurrency(invoice.currency);

    if (status === "SUCCESS") {
      setPaidAt(getTodayInputValue());
    }
  }

  function handleStatusChange(nextStatus: PaymentStatus) {
    setStatus(nextStatus);

    if (nextStatus === "SUCCESS") {
      setFailureReason("");
      setPaidAt((currentValue) => currentValue || getTodayInputValue());
      return;
    }

    setPaidAt("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const parsedInvoiceId = Number(invoiceId);
    const amountInMinorUnits = toMinorUnits(amount);
    const normalizedCurrency = currency.trim().toUpperCase();
    const paidAtIso = toIsoDateString(paidAt);
    const normalizedFailureReason = failureReason.trim();
    const normalizedProvider = provider.trim();
    const normalizedProviderReference = providerReference.trim();

    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setErrorMessage("Please select an invoice.");
      return;
    }

    if (amountInMinorUnits === null) {
      setErrorMessage("Please enter a valid amount.");
      return;
    }

    if (!normalizedCurrency) {
      setErrorMessage("Please provide a valid currency.");
      return;
    }

    if (status === "SUCCESS" && !paidAtIso) {
      setErrorMessage("Paid at is required for successful payments.");
      return;
    }

    if (status === "FAILED" && !normalizedFailureReason) {
      setErrorMessage("Failure reason is required for failed payments.");
      return;
    }

    try {
      await createPayment({
        invoiceId: parsedInvoiceId,
        amount: amountInMinorUnits,
        currency: normalizedCurrency,
        status,
        paidAt: status === "SUCCESS" ? paidAtIso : undefined,
        failureReason:
          status === "FAILED" ? normalizedFailureReason : undefined,
        provider: normalizedProvider || undefined,
        providerReference: normalizedProviderReference || undefined,
      }).unwrap();

      setInvoiceId("");
      setAmount("");
      setCurrency("");
      setStatus("SUCCESS");
      setPaidAt("");
      setFailureReason("");
      setProvider("stripe");
      setProviderReference("");
      onCreated?.();
    } catch {
      setErrorMessage("Unable to create payment.");
    }
  }

  const formContent = (
    <>
      {!isEmbedded ? (
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create payment
          </h2>
          <p className="text-sm text-slate-600">
            Select an open invoice, review the payment details, and record the
            payment outcome.
          </p>
        </div>
      ) : null}

      <form className={isEmbedded ? "space-y-4" : "mt-6 space-y-4"} onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="payment-invoice"
            >
              Invoice *
            </label>
            <select
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              disabled={
                isLoading ||
                isLoadingInvoices ||
                isLoadingCustomers ||
                isLoadingPayments
              }
              id="payment-invoice"
              onChange={(event) => handleInvoiceChange(event.target.value)}
              required
              value={invoiceId}
            >
              <option value="">
                {isLoadingInvoices ? "Loading invoices..." : "Select an invoice"}
              </option>
              {payableInvoices.map((invoice) => {
                const customer = customers?.data.find(
                  (item) => item.id === invoice.customerId,
                );

                return (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} ·{" "}
                    {customer?.name ?? `Customer ${invoice.customerId}`} ·{" "}
                    {invoice.status} · {formatMoney(invoice.amountDue, invoice.currency)}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedInvoice ? (
            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
                  Summary
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Payment for {selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  {selectedCustomer
                    ? `${selectedCustomer.name} · ${selectedCustomer.email}`
                    : `Customer ${selectedInvoice.customerId}`}
                </p>
              </div>

              <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-4">
                <div>
                  <dt className="font-medium text-slate-500">Invoice status</dt>
                  <dd>{selectedInvoice.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Amount due</dt>
                  <dd>
                    {formatMoney(selectedInvoice.amountDue, selectedInvoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Amount paid</dt>
                  <dd>
                    {formatMoney(selectedInvoice.amountPaid, selectedInvoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Payment amount</dt>
                  <dd>
                    {formatMoney(selectedInvoice.amountDue, selectedInvoice.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Due date</dt>
                  <dd>{formatDate(selectedInvoice.dueAt)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Payment details
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Payment amount and currency must match the selected invoice.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="payment-amount"
                >
                  Amount *
                </label>
                <input
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                  disabled
                  id="payment-amount"
                  inputMode="decimal"
                  placeholder="49.00"
                  required
                  type="text"
                  value={amount}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="payment-currency"
                >
                  Currency *
                </label>
                <input
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-slate-400"
                  disabled
                  id="payment-currency"
                  maxLength={3}
                  required
                  type="text"
                  value={currency}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="payment-status"
                >
                  Status *
                </label>
                <select
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                  disabled={isLoading}
                  id="payment-status"
                  onChange={(event) =>
                    handleStatusChange(event.target.value as PaymentStatus)
                  }
                  value={status}
                >
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {status === "SUCCESS" ? (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="payment-paid-at"
                  >
                    Paid at *
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                    disabled={isLoading}
                    id="payment-paid-at"
                    onChange={(event) => setPaidAt(event.target.value)}
                    required
                    type="date"
                    value={paidAt}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor="payment-failure-reason"
                  >
                    Failure reason *
                  </label>
                  <input
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                    disabled={isLoading}
                    id="payment-failure-reason"
                    onChange={(event) => setFailureReason(event.target.value)}
                    required
                    type="text"
                    value={failureReason}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                Provider details
              </h3>
              <p className="text-sm leading-6 text-slate-600">
                Optional metadata for manual reconciliation or external payment
                provider references.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="payment-provider"
                >
                  Provider
                </label>
                <input
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                  disabled={isLoading}
                  id="payment-provider"
                  onChange={(event) => setProvider(event.target.value)}
                  type="text"
                  value={provider}
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="payment-provider-reference"
                >
                  Provider reference
                </label>
                <input
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                  disabled={isLoading}
                  id="payment-provider-reference"
                  onChange={(event) => setProviderReference(event.target.value)}
                  type="text"
                  value={providerReference}
                />
              </div>
            </div>
          </section>

          {invoicesError || customersError || paymentsError ? (
            <p className="text-sm text-red-600" role="alert">
              Unable to load payable invoices, customers, or payments.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Payment created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              isLoading ||
              isLoadingInvoices ||
              isLoadingCustomers ||
              isLoadingPayments
            }
            type="submit"
          >
            {isLoading ? "Creating..." : "Create payment"}
          </button>
        </form>
    </>
  );

  if (isEmbedded) {
    return formContent;
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        {formContent}
      </div>
    </section>
  );
}
