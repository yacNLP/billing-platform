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
      updateProduct: build.mutation<
        Product,
        { id: number; name: string; description?: string; isActive: boolean }
      >({
        query: ({ id, ...body }) => ({
          url: `/products/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "Products", id: "LIST" },
          { type: "Products", id },
        ],
      }),
      deleteProduct: build.mutation<void, number>({
        query: (id) => ({
          url: `/products/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Products", id: "LIST" },
          { type: "Products", id },
        ],
      }),
    }),
  });

export const {
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetProductByIdQuery,
  useGetProductsQuery,
  useUpdateProductMutation,
} = productsApi;
