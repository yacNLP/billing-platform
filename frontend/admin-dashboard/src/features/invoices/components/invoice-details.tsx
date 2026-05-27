"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { useToast } from "@/components/admin/toast-provider";
import { getStoredAccessToken } from "@/features/auth/auth-storage";
import { selectAuthSession } from "@/features/auth/selectors";
import { useGetCustomersQuery } from "@/features/customers/customers-api";
import type { InvoiceStatus } from "@/features/invoices/types";
import {
  useGetInvoiceByIdQuery,
  useMarkInvoiceOverdueMutation,
  useMarkInvoicePaidMutation,
  useMarkInvoiceVoidMutation,
} from "@/features/invoices/invoices-api";
import { useGetPaymentsQuery } from "@/features/payments/payments-api";
import { env } from "@/lib/env";
import { useAppSelector } from "@/store/hooks";
import type { PaymentStatus } from "@/features/payments/types";
import { useGetSubscriptionsQuery } from "@/features/subscriptions/subscriptions-api";
import type { BillingInterval } from "@/features/subscriptions/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const statusClassNameMap: Record<InvoiceStatus, string> = {
  ISSUED:
    "inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700",
  PAID: "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  VOID: "inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600",
  OVERDUE:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

const intervalLabelMap: Record<BillingInterval, string> = {
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

const paymentStatusClassNameMap: Record<PaymentStatus, string> = {
  SUCCESS:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700",
  FAILED:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-red-700",
};

function formatProviderLabel(provider: string | null): string {
  if (!provider) {
    return "Manual";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function buildInvoicePdfUrl(invoiceId: number): string {
  return `${env.apiBaseUrl.replace(/\/$/, "")}/invoices/${invoiceId}/pdf`;
}

function getFilenameFromContentDisposition(
  contentDisposition: string | null,
  fallbackFilename: string,
): string {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);

  return match?.[1] ?? fallbackFilename;
}

type InvoiceDetailsProps = {
  id: number;
};

export function InvoiceDetails({ id }: InvoiceDetailsProps) {
  const session = useAppSelector(selectAuthSession);
  const { showToast } = useToast();
  const { data, error, isLoading } = useGetInvoiceByIdQuery(id);
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });
  const { data: subscriptions } = useGetSubscriptionsQuery({
    page: 1,
    pageSize: 100,
  });
  const {
    data: payments,
    error: paymentsError,
    isLoading: isLoadingPayments,
  } = useGetPaymentsQuery(
    {
      invoiceId: id,
      page: 1,
      pageSize: 10,
    },
    { skip: !data },
  );
  const [actionMode, setActionMode] = useState<
    "paid" | "void" | "overdue" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [markInvoicePaid, { isLoading: isMarkingPaid }] =
    useMarkInvoicePaidMutation();
  const [markInvoiceVoid, { isLoading: isVoiding }] =
    useMarkInvoiceVoidMutation();
  const [markInvoiceOverdue, { isLoading: isMarkingOverdue }] =
    useMarkInvoiceOverdueMutation();

  const isSubmittingAction = isMarkingPaid || isVoiding || isMarkingOverdue;

  async function handleDownloadPdf() {
    const accessToken = session?.accessToken ?? getStoredAccessToken();

    if (!accessToken) {
      showToast("Unable to download invoice PDF.", "error");
      return;
    }

    setIsDownloadingPdf(true);

    try {
      const response = await fetch(buildInvoicePdfUrl(id), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Unable to download invoice PDF.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getFilenameFromContentDisposition(
        response.headers.get("content-disposition"),
        `${data?.invoiceNumber ?? `invoice-${id}`}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showToast("Unable to download invoice PDF.", "error");
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  async function handleInvoiceAction() {
    if (!actionMode) {
      return;
    }

    setErrorMessage(null);

    try {
      if (actionMode === "paid") {
        await markInvoicePaid(id).unwrap();
        showToast("Invoice marked as paid.");
      } else if (actionMode === "void") {
        await markInvoiceVoid(id).unwrap();
        showToast("Invoice voided.");
      } else {
        await markInvoiceOverdue(id).unwrap();
        showToast("Invoice marked as overdue.");
      }

      setActionMode(null);
    } catch {
      setErrorMessage("Unable to update invoice status.");
    }
  }

  if (isLoading) {
    return <StatePanel title="Invoice details" message="Loading invoice..." />;
  }

  if (error) {
    return (
      <StatePanel title="Invoice details" message="Unable to load invoice." />
    );
  }

  if (!data) {
    return <StatePanel title="Invoice details" message="Invoice not found." />;
  }

  const canMarkPaid = data.status === "ISSUED" || data.status === "OVERDUE";
  const canVoid = data.status === "ISSUED";
  const canMarkOverdue = data.status === "ISSUED";
  const showActions = canMarkPaid || canVoid || canMarkOverdue;
  const customer = customers?.data.find((item) => item.id === data.customerId);
  const subscription = subscriptions?.data.find(
    (item) => item.id === data.subscriptionId,
  );
  const customerLabel = customer
    ? `${customer.name} · ${customer.email}`
    : `Customer ID ${data.customerId}`;
  const subscriptionLabel = subscription
    ? `Subscription #${subscription.id} · ${formatMoney(
        subscription.amountSnapshot,
        subscription.currencySnapshot,
      )} / ${intervalLabelMap[subscription.intervalSnapshot]}`
    : `Subscription ID ${data.subscriptionId}`;
  const remainingAmount = Math.max(data.amountDue - data.amountPaid, 0);
  const amountDueLabel = formatMoney(data.amountDue, data.currency);
  const amountPaidLabel = formatMoney(data.amountPaid, data.currency);
  const remainingAmountLabel = formatMoney(remainingAmount, data.currency);
  const periodStartLabel = dateFormatter.format(new Date(data.periodStart));
  const periodEndLabel = dateFormatter.format(new Date(data.periodEnd));
  const billingPeriodLabel = `${periodStartLabel} → ${periodEndLabel}`;
  const dueDateLabel = dateFormatter.format(new Date(data.dueAt));
  const paymentAttempts = payments?.data ?? [];

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Invoices
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              {data.invoiceNumber}
            </h2>
            <span className={statusClassNameMap[data.status]}>
              {data.status}
            </span>
          </div>
          <p className="text-base leading-7 text-slate-600">
            {customerLabel} · {subscriptionLabel} · {amountDueLabel}
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Customer, subscription, and invoice identity."
              title="Invoice overview"
            >
              <DetailItem label="Invoice number" value={data.invoiceNumber} />
              <DetailItem label="Customer" value={customerLabel} />
              <DetailItem label="Subscription" value={subscriptionLabel} />
              <DetailItem label="Billing period" value={billingPeriodLabel} />
              <DetailItem
                label="Issued"
                value={dateFormatter.format(new Date(data.issuedAt))}
              />
            </DetailSection>

            <DetailSection
              description="Collection position for this invoice."
              title="Payment position"
            >
              <DetailItem label="Amount due" value={amountDueLabel} />
              <DetailItem label="Amount paid" value={amountPaidLabel} />
              <DetailItem
                label="Remaining amount"
                value={remainingAmountLabel}
              />
              <DetailItem label="Due date" value={dueDateLabel} />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Payment attempts
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Payment attempts recorded against this invoice, including
                  failed collection attempts.
                </p>
              </div>

              {isLoadingPayments ? (
                <p className="mt-5 rounded-[1.25rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-600">
                  Loading payment attempts...
                </p>
              ) : paymentsError ? (
                <p className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Unable to load payment attempts.
                </p>
              ) : paymentAttempts.length === 0 ? (
                <p className="mt-5 rounded-[1.25rem] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-600">
                  No payment attempts recorded yet.
                </p>
              ) : (
                <ul className="mt-5 divide-y divide-[var(--color-border)] rounded-[1.25rem] border border-[var(--color-border)] bg-white">
                  {paymentAttempts.map((payment) => (
                    <li
                      className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                      key={payment.id}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={
                              paymentStatusClassNameMap[payment.status]
                            }
                          >
                            {payment.status}
                          </span>
                          <p className="text-sm font-semibold text-slate-950">
                            {formatMoney(payment.amount, payment.currency)}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {formatProviderLabel(payment.provider)} ·{" "}
                          {payment.providerReference ?? "No provider reference"}
                        </p>
                        {payment.failureReason ? (
                          <p className="mt-1 text-sm text-red-700">
                            {payment.failureReason}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-slate-500 lg:text-right">
                        {payment.paidAt
                          ? dateFormatter.format(new Date(payment.paidAt))
                          : dateFormatter.format(new Date(payment.createdAt))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="Current invoice state and lifecycle timestamps."
              title="Status & lifecycle"
            >
              <DetailItem
                label="Current status"
                value={
                  <span className={statusClassNameMap[data.status]}>
                    {data.status}
                  </span>
                }
              />
              {data.paidAt ? (
                <DetailItem
                  label="Paid at"
                  value={dateFormatter.format(new Date(data.paidAt))}
                />
              ) : null}
              {data.voidedAt ? (
                <DetailItem
                  label="Voided at"
                  value={dateFormatter.format(new Date(data.voidedAt))}
                />
              ) : null}
              <DetailItem
                label="Created"
                value={dateFormatter.format(new Date(data.createdAt))}
              />
              <DetailItem
                label="Updated"
                value={dateFormatter.format(new Date(data.updatedAt))}
              />
            </DetailSection>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Invoice document
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Download the tenant-branded PDF generated from the current
                  invoice data.
                </p>
              </div>

              <button
                className="mt-5 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isDownloadingPdf}
                onClick={handleDownloadPdf}
                type="button"
              >
                {isDownloadingPdf ? "Downloading..." : "Download PDF"}
              </button>
            </section>

            <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">
                  Invoice operations
                </h3>
                <p className="text-sm leading-6 text-slate-600">
                  Apply one of the supported backend status actions for this
                  invoice.
                </p>
              </div>

              {errorMessage ? (
                <p className="mt-5 text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              {actionMode ? (
                <div className="mt-5">
                  <p className="text-sm leading-6 text-slate-600">
                    {actionMode === "paid"
                      ? "This will mark the invoice as paid and set the paid amount to the full due amount."
                      : actionMode === "void"
                        ? "This will void the invoice and clear any paid timestamp."
                        : "This will move the invoice to overdue if the backend considers it past due."}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingAction}
                      onClick={handleInvoiceAction}
                      type="button"
                    >
                      {isSubmittingAction ? "Saving..." : "Confirm"}
                    </button>

                    <button
                      className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingAction}
                      onClick={() => setActionMode(null)}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showActions ? (
                <div className="mt-5 flex flex-col gap-3">
                  {canMarkPaid ? (
                    <button
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingAction}
                      onClick={() => setActionMode("paid")}
                      type="button"
                    >
                      Mark paid
                    </button>
                  ) : null}

                  {canVoid ? (
                    <button
                      className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingAction}
                      onClick={() => setActionMode("void")}
                      type="button"
                    >
                      Void
                    </button>
                  ) : null}

                  {canMarkOverdue ? (
                    <button
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmittingAction}
                      onClick={() => setActionMode("overdue")}
                      type="button"
                    >
                      Mark overdue
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-6 text-slate-600">
                  No invoice operations are currently available for this status.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
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
            Invoices
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
