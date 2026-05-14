"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { CreateCustomerForm } from "@/features/customers/components/create-customer-form";
import { CustomersList } from "@/features/customers/components/customers-list";

export default function CustomersPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);

  return (
    <>
      <CustomersList
        action={
          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            onClick={() => setIsCreateDrawerOpen(true)}
            type="button"
          >
            Create customer
          </button>
        }
      />

      <AdminDrawer
        description="Add a customer with a name and email."
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Create customer"
      >
        <CreateCustomerForm
          isEmbedded
          onCreated={() => setIsCreateDrawerOpen(false)}
        />
      </AdminDrawer>
    </>
  );
}
