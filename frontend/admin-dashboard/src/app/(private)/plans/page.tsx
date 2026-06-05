"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useToast } from "@/components/admin/toast-provider";
import { selectCanMutateBilling } from "@/features/auth/selectors";
import { CreatePlanForm } from "@/features/plans/components/create-plan-form";
import { PlansList } from "@/features/plans/components/plans-list";
import { useAppSelector } from "@/store/hooks";

export default function PlansPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const canMutateBilling = useAppSelector(selectCanMutateBilling);
  const { showToast } = useToast();

  return (
    <>
      <PlansList
        action={
          canMutateBilling ? (
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateDrawerOpen(true)}
              type="button"
            >
              Create plan
            </button>
          ) : undefined
        }
      />

      {canMutateBilling ? (
        <AdminDrawer
          description="Add a billing plan and attach it to an active product."
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          title="Create plan"
        >
          <CreatePlanForm
            isEmbedded
            onCreated={() => {
              setIsCreateDrawerOpen(false);
              showToast("Plan created.");
            }}
          />
        </AdminDrawer>
      ) : null}
    </>
  );
}
