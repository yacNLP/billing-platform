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
    }),
  });

export const { useGetProductsQuery } = productsApi;
