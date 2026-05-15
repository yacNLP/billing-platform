import { ProductDetails } from "@/features/products/components/product-details";

type ProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <main className="pb-8 pt-2">
        <section className="w-full rounded-[2rem] border border-[var(--color-border)] bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--color-accent)]">
              Products
            </p>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
              Product details
            </h2>
            <p className="text-base leading-7 text-slate-600">
              Invalid product id.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return <ProductDetails id={id} />;
}
