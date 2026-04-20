"use client";

import { FormEvent, useState } from "react";

import { useCreateProductMutation } from "@/features/products/products-api";

export function CreateProductForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createProduct, { isLoading, isSuccess }] = useCreateProductMutation();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    try {
      await createProduct({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
      }).unwrap();

      setName("");
      setDescription("");
      setIsActive(true);
    } catch {
      setErrorMessage("Unable to create product.");
    }
  }

  return (
    <section className="px-6 pt-16">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Create product
          </h2>
          <p className="text-sm text-slate-600">
            Add a SaaS product with a name, optional description, and active
            status.
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="product-name">
              Name *
            </label>
            <input
              className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="product-name"
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
              htmlFor="product-description"
            >
              Description
            </label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
              id="product-description"
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

          {isSuccess ? (
            <p className="text-sm text-emerald-600" role="status">
              Product created.
            </p>
          ) : null}

          <button
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Creating..." : "Create product"}
          </button>
        </form>
      </div>
    </section>
  );
}
