"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { CreateInvoiceForm } from "@/features/invoices/components/create-invoice-form";
import { InvoicesList } from "@/features/invoices/components/invoices-list";

export default function InvoicesPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  return (
    <>
      <InvoicesList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Create invoice
          </button>
        }
      />

      <AdminDrawer
        description="Select a subscription and review the prefilled invoice details before creating a manual invoice."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create invoice"
      >
        <CreateInvoiceForm
          isEmbedded
          onCreated={() => setIsCreateDrawerOpen(false)}
        />
      </AdminDrawer>
    </>
  );
}
