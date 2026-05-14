"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { CreatePlanForm } from "@/features/plans/components/create-plan-form";
import { PlansList } from "@/features/plans/components/plans-list";

export default function PlansPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  return (
    <>
      <PlansList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Create plan
          </button>
        }
      />

      <AdminDrawer
        description="Add a billing plan and attach it to an active product."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create plan"
      >
        <CreatePlanForm
          isEmbedded
          onCreated={() => setIsCreateDrawerOpen(false)}
        />
      </AdminDrawer>
    </>
  );
}
