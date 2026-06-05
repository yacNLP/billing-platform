"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useToast } from "@/components/admin/toast-provider";
import { selectCanMutateBilling } from "@/features/auth/selectors";
import { CreatePaymentForm } from "@/features/payments/components/create-payment-form";
import { PaymentsList } from "@/features/payments/components/payments-list";
import { useAppSelector } from "@/store/hooks";

export default function PaymentsPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const canMutateBilling = useAppSelector(selectCanMutateBilling);
  const { showToast } = useToast();

  return (
    <>
      <PaymentsList
        action={
          canMutateBilling ? (
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateDrawerOpen(true)}
              type="button"
            >
              Create payment
            </button>
          ) : undefined
        }
      />

      {canMutateBilling ? (
        <AdminDrawer
          description="Select an open invoice, review the payment details, and record the payment outcome."
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          title="Create payment"
        >
          <CreatePaymentForm
            isEmbedded
            onCreated={() => {
              setIsCreateDrawerOpen(false);
              showToast("Payment created.");
            }}
          />
        </AdminDrawer>
      ) : null}
    </>
  );
}
