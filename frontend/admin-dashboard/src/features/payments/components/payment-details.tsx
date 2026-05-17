"use client";

import type { ReactNode } from "react";

import { useGetCustomersQuery } from "@/features/customers/customers-api";
import { useGetInvoiceByIdQuery } from "@/features/invoices/invoices-api";
import { useGetPaymentByIdQuery } from "@/features/payments/payments-api";
import type { PaymentStatus } from "@/features/payments/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const statusClassNameMap: Record<PaymentStatus, string> = {
  SUCCESS:
    "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700",
  FAILED:
    "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700",
};

function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

function formatProviderLabel(provider: string | null): string {
  if (!provider) {
    return "Manual";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

type PaymentDetailsProps = {
  id: number;
};

export function PaymentDetails({ id }: PaymentDetailsProps) {
  const { data, error, isLoading } = useGetPaymentByIdQuery(id);
  const { data: invoice } = useGetInvoiceByIdQuery(data?.invoiceId ?? 0, {
    skip: !data,
  });
  const { data: customers } = useGetCustomersQuery({ page: 1, pageSize: 100 });

  if (isLoading) {
    return <StatePanel title="Payment details" message="Loading payment..." />;
  }

  if (error) {
    return <StatePanel title="Payment details" message="Unable to load payment." />;
  }

  if (!data) {
    return <StatePanel title="Payment details" message="Payment not found." />;
  }

  const amountLabel = formatMoney(data.amount, data.currency);
  const invoiceNumberLabel = invoice?.invoiceNumber ?? `Invoice ID ${data.invoiceId}`;
  const invoiceLabel = invoice
    ? `${invoice.invoiceNumber} · ${formatMoney(
        invoice.amountDue,
        invoice.currency,
      )}`
    : `Invoice ID ${data.invoiceId}`;
  const paidAtLabel = data.paidAt
    ? dateFormatter.format(new Date(data.paidAt))
    : "Not paid";
  const providerLabel = formatProviderLabel(data.provider);
  const paymentSourceLabel = `${providerLabel} payment`;
  const providerReferenceLabel = data.providerReference ?? "No reference";
  const invoiceRemainingAmount =
    invoice ? Math.max(invoice.amountDue - invoice.amountPaid, 0) : null;
  const customer = invoice
    ? customers?.data.find((item) => item.id === invoice.customerId)
    : undefined;
  const customerLabel = invoice
    ? customer
      ? `${customer.name} · ${customer.email}`
      : `Customer ID ${invoice.customerId}`
    : "Loading invoice...";
  const invoicePeriodLabel = invoice
    ? `${dateFormatter.format(new Date(invoice.periodStart))} → ${dateFormatter.format(
        new Date(invoice.periodEnd),
      )}`
    : "Loading invoice...";

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
            Payments
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              Payment #{data.id}
            </h2>
            <span className={statusClassNameMap[data.status]}>{data.status}</span>
          </div>
          <p className="text-base leading-7 text-slate-600">
            {paymentSourceLabel} applied to {invoiceNumberLabel} · {amountLabel}
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <DetailSection
              description="Invoice link and payment amount recorded for reconciliation."
              title="Payment overview"
            >
              <DetailItem label="Invoice" value={invoiceLabel} />
              <DetailItem label="Amount" value={amountLabel} />
              <DetailItem label="Currency" value={data.currency} />
            </DetailSection>

            <DetailSection
              description="Invoice context used to understand how this payment affects collection."
              title="Related invoice"
            >
              <DetailItem
                label="Invoice status"
                value={invoice?.status ?? "Loading invoice..."}
              />
              <DetailItem label="Customer" value={customerLabel} />
              <DetailItem label="Invoice period" value={invoicePeriodLabel} />
              <DetailItem
                label="Invoice amount due"
                value={
                  invoice
                    ? formatMoney(invoice.amountDue, invoice.currency)
                    : "Loading invoice..."
                }
              />
              <DetailItem
                label="Invoice amount paid"
                value={
                  invoice
                    ? formatMoney(invoice.amountPaid, invoice.currency)
                    : "Loading invoice..."
                }
              />
              <DetailItem
                label="Invoice remaining"
                value={
                  invoice && invoiceRemainingAmount !== null
                    ? formatMoney(invoiceRemainingAmount, invoice.currency)
                    : "Loading invoice..."
                }
              />
            </DetailSection>

            <DetailSection
              description="External payment provider metadata, when available."
              title="Provider details"
            >
              <DetailItem label="Provider" value={providerLabel} />
              <DetailItem
                label="Provider reference"
                value={providerReferenceLabel}
              />
            </DetailSection>
          </div>

          <aside className="space-y-6">
            <DetailSection
              description="Current payment outcome and audit timestamps."
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
              <DetailItem label="Paid at" value={paidAtLabel} />
              <DetailItem
                label="Created"
                value={dateFormatter.format(new Date(data.createdAt))}
              />
              <DetailItem
                label="Updated"
                value={dateFormatter.format(new Date(data.updatedAt))}
              />
            </DetailSection>

            {data.status === "FAILED" ? (
              <DetailSection
                description="Failure context returned by the payment flow."
                title="Failure context"
              >
                <DetailItem
                  label="Failure reason"
                  value={data.failureReason ?? "No failure recorded"}
                />
              </DetailSection>
            ) : null}
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
            Payments
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
