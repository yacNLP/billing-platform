import { CreateProductForm } from "@/features/products/components/create-product-form";
import { ProductsList } from "@/features/products/components/products-list";

export default function ProductsPage() {
  return (
    <>
      <CreateProductForm />
      <ProductsList />
    </>
  );
}
