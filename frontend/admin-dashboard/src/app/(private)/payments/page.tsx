"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { CreatePaymentForm } from "@/features/payments/components/create-payment-form";
import { PaymentsList } from "@/features/payments/components/payments-list";

export default function PaymentsPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  return (
    <>
      <PaymentsList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Create payment
          </button>
        }
      />

      <AdminDrawer
        description="Select an open invoice, review the payment details, and record the payment outcome."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create payment"
      >
        <CreatePaymentForm
          isEmbedded
          onCreated={() => setIsCreateDrawerOpen(false)}
        />
      </AdminDrawer>
    </>
  );
}
