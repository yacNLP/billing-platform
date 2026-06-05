"use client";

import { useState } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { useToast } from "@/components/admin/toast-provider";
import { selectCanMutateBilling } from "@/features/auth/selectors";
import { CreateProductForm } from "@/features/products/components/create-product-form";
import { ProductsList } from "@/features/products/components/products-list";
import { useAppSelector } from "@/store/hooks";

export default function ProductsPage() {
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const canMutateBilling = useAppSelector(selectCanMutateBilling);
  const { showToast } = useToast();

  return (
    <>
      <ProductsList
        action={
          canMutateBilling ? (
            <button
              className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => setIsCreateDrawerOpen(true)}
              type="button"
            >
              Create product
            </button>
          ) : undefined
        }
      />

      {canMutateBilling ? (
        <AdminDrawer
          description="Add a product with a name, optional description, and active status."
          isOpen={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          title="Create product"
        >
          <CreateProductForm
            isEmbedded
            onCreated={() => {
              setIsCreateDrawerOpen(false);
              showToast("Product created.");
            }}
          />
        </AdminDrawer>
      ) : null}
    </>
  );
}
