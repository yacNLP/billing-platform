"use client";

import { FormEvent, useState } from "react";

import { useUpdateCustomerMutation } from "@/features/customers/customers-api";
import type { Customer } from "@/features/customers/types";

type EditCustomerFormProps = {
  customer: Customer;
};

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
  const [name, setName] = useState(customer.name);
  const [email, setEmail] = useState(customer.email);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updateCustomer, { isLoading }] = useUpdateCustomerMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateCustomer({
        id: customer.id,
        name: name.trim(),
        email: email.trim(),
      }).unwrap();

      setSuccessMessage("Customer updated.");
    } catch {
      setErrorMessage("Unable to update customer.");
    }
  }

  return (
    <section className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
          Edit customer
        </h3>
        <p className="text-sm text-slate-600">
          Update the current customer name and email.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="edit-customer-name"
          >
            Name
          </label>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            id="edit-customer-name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="edit-customer-email"
          >
            Email
          </label>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            id="edit-customer-email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </div>

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
