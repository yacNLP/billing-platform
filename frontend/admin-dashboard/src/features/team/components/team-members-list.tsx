"use client";

import { ReactNode, useState } from "react";

import { PageHeader } from "@/components/admin/page-header";
import { StatePanel } from "@/components/admin/state-panel";
import { useToast } from "@/components/admin/toast-provider";
import { selectAuthSession } from "@/features/auth/selectors";
import type { AuthRole } from "@/features/auth/types";
import {
  useDeleteTeamMemberMutation,
  useGetTeamMembersQuery,
  useUpdateTeamMemberRoleMutation,
} from "@/features/team/team-api";
import type { TeamMember } from "@/features/team/types";
import { useAppSelector } from "@/store/hooks";

type TeamMembersListProps = {
  action?: ReactNode;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getRoleBadgeClass(role: AuthRole) {
  return role === "ADMIN"
    ? "border-indigo-200 bg-indigo-50 text-indigo-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
}

function getTeamActionErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: number | string }).status;
    const data = (error as { data?: { message?: unknown } }).data;
    const rawMessage = Array.isArray(data?.message)
      ? data.message.join(" ")
      : typeof data?.message === "string"
        ? data.message
        : "";
    const message = rawMessage.toLowerCase();

    if (status === 403 && message.includes("admin")) {
      return "At least one admin must remain in the workspace.";
    }

    if (status === 400 && message.includes("yourself")) {
      return "You cannot delete your own account.";
    }

    if (status === 404) {
      return "This team member no longer exists or belongs to another workspace.";
    }
  }

  return fallback;
}

type TeamMemberRowProps = {
  currentUserId?: number;
  member: TeamMember;
};

function TeamMemberRow({ currentUserId, member }: TeamMemberRowProps) {
  const { showToast } = useToast();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [pendingRole, setPendingRole] = useState<AuthRole | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [updateRole, { isLoading: isUpdatingRole }] =
    useUpdateTeamMemberRoleMutation();
  const [deleteMember, { isLoading: isDeleting }] = useDeleteTeamMemberMutation();

  const isCurrentUser = currentUserId === member.id;

  async function handleConfirmRoleChange() {
    if (!pendingRole || pendingRole === member.role) {
      setPendingRole(null);
      return;
    }

    setRowError(null);

    try {
      await updateRole({ id: member.id, role: pendingRole }).unwrap();
      setPendingRole(null);
      showToast("Team member role updated.");
    } catch (error) {
      setRowError(
        getTeamActionErrorMessage(error, "Unable to update team member role."),
      );
    }
  }

  async function handleDelete() {
    setRowError(null);

    try {
      await deleteMember(member.id).unwrap();
      setIsConfirmingDelete(false);
      showToast("Team member deleted.");
    } catch (error) {
      setRowError(getTeamActionErrorMessage(error, "Unable to delete team member."));
    }
  }

  return (
    <article className="rounded-[1.5rem] border border-[var(--color-border)] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_220px] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="truncate text-base font-semibold text-slate-950">
              {member.email}
            </h3>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
                getRoleBadgeClass(member.role),
              ].join(" ")}
            >
              {member.role}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Added {formatDate(member.createdAt)}
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
            htmlFor={`team-role-${member.id}`}
          >
            Role
          </label>
          <select
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUpdatingRole || isDeleting || isCurrentUser}
            id={`team-role-${member.id}`}
            onChange={(event) => setPendingRole(event.target.value as AuthRole)}
            value={pendingRole ?? member.role}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>
          {isCurrentUser ? (
            <p className="text-xs leading-5 text-slate-500">
              You cannot change your own role from here.
            </p>
          ) : null}
          {pendingRole && pendingRole !== member.role ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-950">
                Change role to {pendingRole}?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isUpdatingRole}
                  onClick={handleConfirmRoleChange}
                  type="button"
                >
                  {isUpdatingRole ? "Saving..." : "Confirm"}
                </button>
                <button
                  className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
                  onClick={() => setPendingRole(null)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          {isCurrentUser ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Current user
            </p>
          ) : !isConfirmingDelete ? (
            <button
              className="w-fit rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdatingRole || isDeleting}
              onClick={() => setIsConfirmingDelete(true)}
              type="button"
            >
              Delete
            </button>
          ) : (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">Delete member?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-xl bg-red-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  type="button"
                >
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rowError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {rowError}
        </p>
      ) : null}
    </article>
  );
}

export function TeamMembersList({ action }: TeamMembersListProps) {
  const session = useAppSelector(selectAuthSession);
  const { data, isError, isLoading } = useGetTeamMembersQuery();

  if (isLoading) {
    return (
      <StatePanel
        eyebrow="Workspace"
        message="Loading team members..."
        title="Team"
      />
    );
  }

  if (isError) {
    return (
      <StatePanel
        eyebrow="Workspace"
        message="Unable to load team members."
        title="Team unavailable"
      />
    );
  }

  const members = data ?? [];

  return (
    <section className="space-y-6">
      <PageHeader
        action={action}
        eyebrow="Workspace"
        title="Team"
        description="Manage who can access this RevenueOps workspace."
      />

      {members.length === 0 ? (
        <StatePanel
          action={action}
          eyebrow="Workspace"
          message="Invite the first team member to share workspace access."
          title="No team members yet"
        />
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <TeamMemberRow
              key={member.id}
              currentUserId={session?.userId}
              member={member}
            />
          ))}
        </div>
      )}
    </section>
  );
}
