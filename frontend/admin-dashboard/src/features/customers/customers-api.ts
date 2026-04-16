import { baseApi } from "@/store/api/base-api";

import type { Customer, CustomersListResponse } from "@/features/customers/types";

export const customersApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Customers"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getCustomers: build.query<Customer[], void>({
        query: () => ({
          url: "/customers",
        }),
        // The backend returns a paginated object. For this first list view, we only need the array.
        transformResponse: (response: CustomersListResponse) => response.data,
        providesTags: [{ type: "Customers", id: "LIST" }],
      }),
      getCustomerById: build.query<Customer, number>({
        query: (id) => ({
          url: `/customers/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Customers", id }],
      }),
      createCustomer: build.mutation<Customer, { name: string; email: string }>({
        query: (body) => ({
          url: "/customers",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Customers", id: "LIST" }],
      }),
      updateCustomer: build.mutation<
        Customer,
        { id: number; name: string; email: string }
      >({
        query: ({ id, ...body }) => ({
          url: `/customers/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "Customers", id: "LIST" },
          { type: "Customers", id },
        ],
      }),
      deleteCustomer: build.mutation<void, number>({
        query: (id) => ({
          url: `/customers/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Customers", id: "LIST" },
          { type: "Customers", id },
        ],
      }),
    }),
  });

export const {
  useCreateCustomerMutation,
  useDeleteCustomerMutation,
  useGetCustomerByIdQuery,
  useGetCustomersQuery,
  useUpdateCustomerMutation,
} = customersApi;
