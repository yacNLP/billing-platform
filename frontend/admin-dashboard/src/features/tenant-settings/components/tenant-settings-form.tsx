"use client";

import { FormEvent, useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { StatePanel } from "@/components/admin/state-panel";
import { useToast } from "@/components/admin/toast-provider";
import { selectAuthSession } from "@/features/auth/selectors";
import {
  useGetTenantSettingsQuery,
  useUpdateTenantSettingsMutation,
} from "@/features/tenant-settings/tenant-settings-api";
import type {
  TenantSettings,
  UpdateTenantSettingsRequest,
} from "@/features/tenant-settings/types";
import { useAppSelector } from "@/store/hooks";

function optionalValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toFormState(settings: TenantSettings): UpdateTenantSettingsRequest {
  return {
    companyName: settings.companyName,
    logoUrl: settings.logoUrl ?? "",
    billingEmail: settings.billingEmail,
    phone: settings.phone ?? "",
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2 ?? "",
    city: settings.city,
    postalCode: settings.postalCode,
    country: settings.country,
    taxId: settings.taxId ?? "",
    vatNumber: settings.vatNumber ?? "",
    defaultCurrency: settings.defaultCurrency,
    paymentTerms: settings.paymentTerms,
    invoiceFooter: settings.invoiceFooter ?? "",
  };
}

function toPayload(formState: UpdateTenantSettingsRequest) {
  return {
    companyName: formState.companyName.trim(),
    logoUrl: optionalValue(formState.logoUrl ?? ""),
    billingEmail: formState.billingEmail.trim(),
    phone: optionalValue(formState.phone ?? ""),
    addressLine1: formState.addressLine1.trim(),
    addressLine2: optionalValue(formState.addressLine2 ?? ""),
    city: formState.city.trim(),
    postalCode: formState.postalCode.trim(),
    country: formState.country.trim(),
    taxId: optionalValue(formState.taxId ?? ""),
    vatNumber: optionalValue(formState.vatNumber ?? ""),
    defaultCurrency: formState.defaultCurrency.trim().toUpperCase(),
    paymentTerms: Number(formState.paymentTerms),
    invoiceFooter: optionalValue(formState.invoiceFooter ?? ""),
  } satisfies UpdateTenantSettingsRequest;
}

export function TenantSettingsForm() {
  const session = useAppSelector(selectAuthSession);
  const { showToast } = useToast();
  const { data, error, isLoading } = useGetTenantSettingsQuery();
  const [updateTenantSettings, { isLoading: isSaving }] =
    useUpdateTenantSettingsMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<UpdateTenantSettingsRequest | null>(
    null,
  );

  const isReadOnly = session?.role !== "ADMIN";
  const canEdit = !isReadOnly;
  const isFormDisabled = isReadOnly || !isEditing || isSaving;
  const settings = formState ?? (data ? toFormState(data) : null);

  function updateField<K extends keyof UpdateTenantSettingsRequest>(
    field: K,
    value: UpdateTenantSettingsRequest[K],
  ) {
    if (!settings || isFormDisabled) {
      return;
    }

    setFormState({
      ...settings,
      [field]: value,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings || isFormDisabled) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    const payload = toPayload(settings);

    if (!payload.companyName) {
      setErrorMessage("Company name is required.");
      return;
    }

    if (!payload.billingEmail) {
      setErrorMessage("Billing email is required.");
      return;
    }

    if (!/^[A-Z]{3}$/.test(payload.defaultCurrency)) {
      setErrorMessage("Default currency must use exactly 3 letters.");
      return;
    }

    if (
      !Number.isInteger(payload.paymentTerms) ||
      payload.paymentTerms < 0 ||
      payload.paymentTerms > 120
    ) {
      setErrorMessage("Payment terms must be between 0 and 120 days.");
      return;
    }

    try {
      const updated = await updateTenantSettings(payload).unwrap();
      setFormState(toFormState(updated));
      setIsEditing(false);
      setSuccessMessage("Settings saved.");
      showToast("Settings saved.");
    } catch {
      setSuccessMessage(null);
      setErrorMessage("Unable to save tenant settings.");
      showToast("Unable to save tenant settings.", "error");
    }
  }

  function handleEdit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormState(settings);
    setIsEditing(true);
  }

  function handleCancel() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormState(data ? toFormState(data) : null);
    setIsEditing(false);
  }

  if (isLoading) {
    return (
      <StatePanel
        eyebrow="Settings"
        title="Tenant settings"
        message="Loading tenant billing settings..."
      />
    );
  }

  if (error) {
    return (
      <StatePanel
        eyebrow="Settings"
        title="Tenant settings"
        message="Unable to load tenant billing settings."
      />
    );
  }

  if (!settings) {
    return (
      <StatePanel
        eyebrow="Settings"
        title="Tenant settings"
        message="No tenant billing settings found."
      />
    );
  }

  return (
    <main className="pb-8 pt-2">
      <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <PageHeader
          eyebrow="Settings"
          title="Tenant settings"
          description="Manage the company information used for billing documents and invoice defaults."
        />

        {isReadOnly ? (
          <p className="mt-6 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Your role is read-only. You can review billing settings, but only an
            admin can save changes.
          </p>
        ) : null}

        {canEdit ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
            <p className="text-sm text-slate-600">
              {isEditing
                ? "You are editing tenant billing settings."
                : "Settings are read-only until you choose Edit settings."}
            </p>
            {!isEditing ? (
              <button
                className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={handleEdit}
                type="button"
              >
                Edit settings
              </button>
            ) : null}
          </div>
        ) : null}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <SettingsSection
            description="Public company identity shown on billing documents."
            title="Company identity"
          >
            <Field label="Company name" required>
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("companyName", event.target.value)}
                required
                type="text"
                value={settings.companyName}
              />
            </Field>
            <Field label="Logo URL">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("logoUrl", event.target.value)}
                placeholder="https://example.com/logo.png"
                type="url"
                value={settings.logoUrl ?? ""}
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            description="Contact details used for billing communication."
            title="Billing contact"
          >
            <Field label="Billing email" required>
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("billingEmail", event.target.value)}
                required
                type="email"
                value={settings.billingEmail}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("phone", event.target.value)}
                type="tel"
                value={settings.phone ?? ""}
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            description="Company billing address printed on future invoice PDFs."
            title="Address"
          >
            <Field label="Address line 1">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("addressLine1", event.target.value)}
                type="text"
                value={settings.addressLine1}
              />
            </Field>
            <Field label="Address line 2">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("addressLine2", event.target.value)}
                type="text"
                value={settings.addressLine2 ?? ""}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("city", event.target.value)}
                type="text"
                value={settings.city}
              />
            </Field>
            <Field label="Postal code">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("postalCode", event.target.value)}
                type="text"
                value={settings.postalCode}
              />
            </Field>
            <Field label="Country">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("country", event.target.value)}
                type="text"
                value={settings.country}
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            description="Optional tax identifiers for invoice documents."
            title="Tax information"
          >
            <Field label="Tax ID / SIRET">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("taxId", event.target.value)}
                type="text"
                value={settings.taxId ?? ""}
              />
            </Field>
            <Field label="VAT number">
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                onChange={(event) => updateField("vatNumber", event.target.value)}
                type="text"
                value={settings.vatNumber ?? ""}
              />
            </Field>
          </SettingsSection>

          <SettingsSection
            description="Default values used when generating billing documents."
            title="Invoice defaults"
          >
            <Field label="Default currency" required>
              <input
                className={`${inputClassName} uppercase`}
                disabled={isFormDisabled}
                maxLength={3}
                onChange={(event) =>
                  updateField("defaultCurrency", event.target.value.toUpperCase())
                }
                required
                type="text"
                value={settings.defaultCurrency}
              />
            </Field>
            <Field label="Payment terms" required>
              <input
                className={inputClassName}
                disabled={isFormDisabled}
                max={120}
                min={0}
                onChange={(event) =>
                  updateField("paymentTerms", Number(event.target.value))
                }
                required
                type="number"
                value={settings.paymentTerms}
              />
            </Field>
            <Field label="Invoice footer">
              <textarea
                className={`${inputClassName} min-h-28`}
                disabled={isFormDisabled}
                onChange={(event) => updateField("invoiceFooter", event.target.value)}
                value={settings.invoiceFooter ?? ""}
              />
            </Field>
          </SettingsSection>

          {errorMessage ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="text-sm font-medium text-emerald-700" role="status">
              {successMessage}
            </p>
          ) : null}

          {isEditing ? (
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving..." : "Save settings"}
              </button>
              <button
                className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                onClick={handleCancel}
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}

const inputClassName =
  "w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

type SettingsSectionProps = {
  children: React.ReactNode;
  description: string;
  title: string;
};

function SettingsSection({ children, description, title }: SettingsSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

type FieldProps = {
  children: React.ReactNode;
  label: string;
  required?: boolean;
};

function Field({ children, label, required = false }: FieldProps) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}
