"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { CreateSubscriptionForm } from "@/features/subscriptions/components/create-subscription-form";
import { SubscriptionsList } from "@/features/subscriptions/components/subscriptions-list";

export default function SubscriptionsPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  return (
    <>
      <SubscriptionsList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Create subscription
          </button>
        }
      />

      <AdminDrawer
        description="Choose the customer, product, and plan before confirming the subscription."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create subscription"
      >
        <CreateSubscriptionForm
          isEmbedded
          onCreated={() => setIsCreateDrawerOpen(false)}
        />
      </AdminDrawer>
    </>
  );
}
