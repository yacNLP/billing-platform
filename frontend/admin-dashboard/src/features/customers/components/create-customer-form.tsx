"use client";

import { FormEvent, useState } from "react";

import { useCreateCustomerMutation } from "@/features/customers/customers-api";

export function CreateCustomerForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createCustomer, { isLoading, isSuccess }] = useCreateCustomerMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createCustomer({
        name: name.trim(),
        email: email.trim(),
      }).unwrap();

      setName("");
      setEmail("");
    } catch {
      setErrorMessage("Unable to create customer.");
    }
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create customer
          </h2>
          <p className="text-sm text-slate-600">
            Add a customer with a name and email.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="customer-name">
              Name
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="customer-name"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              type="text"
              value={name}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="customer-email">
              Email
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="customer-email"
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

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Customer created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create customer"}
          </button>
        </form>
      </div>
    </section>
  );
}
