"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useToast } from "@/components/admin/toast-provider";
import { selectCanMutateBilling } from "@/features/auth/selectors";
import { CreateInvoiceForm } from "@/features/invoices/components/create-invoice-form";
import { InvoicesList } from "@/features/invoices/components/invoices-list";
import { useAppSelector } from "@/store/hooks";

export default function InvoicesPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const canMutateBilling = useAppSelector(selectCanMutateBilling);
  const { showToast } = useToast();

  return (
    <>
      <InvoicesList
        action={
          canMutateBilling ? (
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateDrawerOpen(true)}
              type="button"
            >
              Create invoice
            </button>
          ) : undefined
        }
      />

      {canMutateBilling ? (
        <AdminDrawer
          description="Select a subscription and review the prefilled invoice details before creating a manual invoice."
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          title="Create invoice"
        >
          <CreateInvoiceForm
            isEmbedded
            onCreated={() => {
              setIsCreateDrawerOpen(false);
              showToast("Invoice created.");
            }}
          />
        </AdminDrawer>
      ) : null}
    </>
  );
}
