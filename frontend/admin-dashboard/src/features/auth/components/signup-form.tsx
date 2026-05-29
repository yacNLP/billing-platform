"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { applyAuthenticatedSession } from "@/features/auth/auth-actions";
import { useSignupMutation } from "@/features/auth/auth-api";
import { buildSessionFromToken } from "@/features/auth/session";
import { useAppDispatch } from "@/store/hooks";

function getSignupErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 409
  ) {
    return "An account already exists with this email.";
  }

  return "Unable to create your workspace. Check the form and try again.";
}

export function SignupForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [signup, { isLoading }] = useSignupMutation();

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const normalizedCurrency = defaultCurrency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      setErrorMessage("Default currency must be a 3-letter code, like EUR or USD.");
      return;
    }

    try {
      const response = await signup({
        companyName: companyName.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(billingEmail.trim()
          ? { billingEmail: billingEmail.trim().toLowerCase() }
          : {}),
        ...(normalizedCurrency ? { defaultCurrency: normalizedCurrency } : {}),
      }).unwrap();

      const session = buildSessionFromToken(response.accessToken);

      if (!session) {
        setErrorMessage("Received an invalid access token.");
        return;
      }

      applyAuthenticatedSession(dispatch, session);
      router.replace("/dashboard");
    } catch (error) {
      setErrorMessage(getSignupErrorMessage(error));
    }
  }

  return (
    <div className="w-full max-w-xl rounded-3xl border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          RevenueOps Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Create your workspace
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Set up your company workspace and first admin account. You can refine
          billing settings later from Settings.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Company name</span>
          <input
            autoComplete="organization"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
            minLength={2}
            onChange={(event) => setCompanyName(event.target.value)}
            required
            type="text"
            value={companyName}
          />
        </label>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Admin email</span>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-[1fr_10rem]">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">
              Billing email <span className="font-normal text-slate-400">optional</span>
            </span>
            <input
              autoComplete="email"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              onChange={(event) => setBillingEmail(event.target.value)}
              placeholder="Defaults to admin email"
              type="email"
              value={billingEmail}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Currency</span>
            <input
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm uppercase text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              maxLength={3}
              minLength={3}
              onChange={(event) => setDefaultCurrency(event.target.value.toUpperCase())}
              pattern="[A-Za-z]{3}"
              type="text"
              value={defaultCurrency}
            />
          </label>
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Creating workspace..." : "Create workspace"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have a workspace?{" "}
        <Link className="font-medium text-[var(--color-accent)] hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
