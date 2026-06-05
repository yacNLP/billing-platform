"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { applyAuthenticatedSession } from "@/features/auth/auth-actions";
import { useLoginMutation } from "@/features/auth/auth-api";
import { buildSessionFromToken } from "@/features/auth/session";
import { useAppDispatch } from "@/store/hooks";

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      const response = await login({ email, password }).unwrap();
      const session = buildSessionFromToken(response.accessToken);

      if (!session) {
        setErrorMessage("Received an invalid access token.");
        return;
      }

      applyAuthenticatedSession(dispatch, session);
      router.replace(nextPath?.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setErrorMessage("Unable to sign in with these credentials.");
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
          RevenueOps Platform
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Workspace sign in
        </h1>
        <p className="text-sm leading-6 text-slate-600">
          Sign in to access your RevenueOps workspace.
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

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            autoComplete="current-password"
            className="w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-[var(--color-accent)]"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <div className="text-right">
          <Link
            className="text-sm font-medium text-[var(--color-accent)] hover:underline"
            href="/forgot-password"
          >
            Forgot password?
          </Link>
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
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to RevenueOps?{" "}
        <Link className="font-medium text-[var(--color-accent)] hover:underline" href="/signup">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
