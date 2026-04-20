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

export const { useCreateProductMutation, useGetProductsQuery } = productsApi;
