"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { useForgotPasswordMutation } from "@/features/auth/auth-api";

const SUCCESS_MESSAGE = "If an account exists for this email, we sent a reset link.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      await forgotPassword({ email: email.trim().toLowerCase() }).unwrap();
      setStatusMessage(SUCCESS_MESSAGE);
    } catch {
      setErrorMessage("Unable to request a password reset. Try again later.");
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          RevenueOps Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Reset your password
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Enter your workspace email. If an account exists, we will send a reset
          link.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            autoComplete="email"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        {statusMessage ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </p>
        ) : null}

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
          {isLoading ? "Sending reset link..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered your password?{" "}
        <Link className="font-medium text-[var(--color-accent)] hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
