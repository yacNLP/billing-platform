"use client";

import { FormEvent, useState } from "react";

import { useUpdateProductMutation } from "@/features/products/products-api";
import type { Product } from "@/features/products/types";

type EditProductFormProps = {
  product: Product;
};

export function EditProductForm({ product }: EditProductFormProps) {
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description || "");
  const [isActive, setIsActive] = useState(product.isActive);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [updateProduct, { isLoading }] = useUpdateProductMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateProduct({
        id: product.id,
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
      }).unwrap();

      setSuccessMessage("Product updated.");
    } catch {
      setErrorMessage("Unable to update product.");
    }
  }

  return (
    <section className="mt-8 rounded-[1.5rem] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
          Edit product
        </h3>
        <p className="text-sm text-slate-600">
          Update the current product name, description, and active status.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="edit-product-name"
          >
            Name
          </label>
          <input
            className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            id="edit-product-name"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            type="text"
            value={name}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="edit-product-description"
          >
            Description
          </label>
          <textarea
            className="min-h-28 w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
            id="edit-product-description"
            name="description"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            checked={isActive}
            className="h-4 w-4 rounded border border-[var(--color-border)]"
            onChange={(event) => setIsActive(event.target.checked)}
            type="checkbox"
          />
          Active product
        </label>

        {errorMessage ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="text-sm text-emerald-600" role="status">
            {successMessage}
          </p>
        ) : null}

        <button
          className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Saving..." : "Save changes"}
        </button>
      </form>
    </section>
  );
}
