"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useResetPasswordMutation } from "@/features/auth/auth-api";

function getResetPasswordErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number | string }).status;

    if (status === 400) {
      return "This reset link is invalid or has expired.";
    }
  }

  return "Unable to reset your password. Try again later.";
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : "Password reset token is missing.",
  );
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Password reset token is missing.");
      return;
    }

    try {
      await resetPassword({ token, password }).unwrap();
      setPassword("");
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(getResetPasswordErrorMessage(error));
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          RevenueOps Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Choose a new password
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Use at least 8 characters. After reset, sign in with your new password.
        </p>
      </div>

      {isSuccess ? (
        <div className="mt-8 space-y-5">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Your password has been reset.
          </p>
          <Link
            className="block w-full rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-800"
            href="/login"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">New password</span>
            <input
              autoComplete="new-password"
              className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
              disabled={!token}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {errorMessage ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading || !token}
            type="submit"
          >
            {isLoading ? "Resetting password..." : "Reset password"}
          </button>
        </form>
      )}

      {!isSuccess ? (
        <p className="mt-6 text-center text-sm text-slate-600">
          Need a new link?{" "}
          <Link className="font-medium text-[var(--color-accent)] hover:underline" href="/forgot-password">
            Request reset link
          </Link>
        </p>
      ) : null}
    </div>
  );
}
