"use client";

import { FormEvent, useState } from "react";

import { useCreateTeamMemberMutation } from "@/features/team/team-api";
import type { AuthRole } from "@/features/auth/types";

type CreateTeamMemberFormProps = {
  onCreated?: () => void;
};

function getCreateMemberErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number | string }).status;

    if (status === 409) {
      return "A team member already exists with this email.";
    }

    if (status === 400) {
      return "Check the email, password, and role before creating the member.";
    }
  }

  return "Unable to create team member.";
}

export function CreateTeamMemberForm({ onCreated }: CreateTeamMemberFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AuthRole>("USER");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createTeamMember, { isLoading }] = useCreateTeamMemberMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createTeamMember({
        email: email.trim().toLowerCase(),
        password,
        role,
      }).unwrap();

      setEmail("");
      setPassword("");
      setRole("USER");
      onCreated?.();
    } catch (error) {
      setErrorMessage(getCreateMemberErrorMessage(error));
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="team-email">
          Email
        </label>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
          id="team-email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="team-password"
        >
          Temporary password
        </label>
        <input
          className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
          id="team-password"
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <p className="text-xs leading-5 text-slate-500">
          Use at least 8 characters. The member can use this password to sign in.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="team-role">
          Role
        </label>
        <select
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
          id="team-role"
          name="role"
          onChange={(event) => setRole(event.target.value as AuthRole)}
          value={role}
        >
          <option value="USER">USER · read-only staff</option>
          <option value="ADMIN">ADMIN · billing operator</option>
        </select>
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading}
        type="submit"
      >
        {isLoading ? "Creating..." : "Create member"}
      </button>
    </form>
  );
}
