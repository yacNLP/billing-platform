"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { StatePanel } from "@/components/admin/state-panel";
import { useToast } from "@/components/admin/toast-provider";
import { selectIsAdmin } from "@/features/auth/selectors";
import { useAppSelector } from "@/store/hooks";
import { CreateTeamMemberForm } from "@/features/team/components/create-team-member-form";
import { TeamMembersList } from "@/features/team/components/team-members-list";

export default function TeamPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const { showToast } = useToast();
  const isAdmin = useAppSelector(selectIsAdmin);

  if (!isAdmin) {
    return (
      <StatePanel
        eyebrow="Workspace"
        title="Admin access required"
        message="Team management is available to workspace admins only."
      />
    );
  }

  return (
    <>
      <TeamMembersList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Add member
          </button>
        }
      />

      <AdminDrawer
        description="Invite a teammate and choose whether they can operate billing or only read workspace data."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Add team member"
      >
        <CreateTeamMemberForm
          onCreated={() => {
            setIsCreateDrawerOpen(false);
            showToast("Team member created.");
          }}
        />
      </AdminDrawer>
    </>
  );
}
