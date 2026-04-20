import { baseApi } from "@/store/api/base-api";

import type { Product, ProductsListResponse } from "@/features/products/types";

export const productsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Products"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getProducts: build.query<Product[], void>({
        query: () => ({
          url: "/products",
        }),
        transformResponse: (response: ProductsListResponse) => response.data,
        providesTags: [{ type: "Products", id: "LIST" }],
      }),
      getProductById: build.query<Product, number>({
        query: (id) => ({
          url: `/products/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Products", id }],
      }),
      createProduct: build.mutation<
        Product,
        { name: string; description?: string; isActive: boolean }
      >({
        query: (body) => ({
          url: "/products",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Products", id: "LIST" }],
      }),
    }),
  });

export const {
  useCreateProductMutation,
  useGetProductByIdQuery,
  useGetProductsQuery,
} = productsApi;
