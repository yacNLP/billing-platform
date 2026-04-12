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
      providesTags: ["Customers"],
    }),
    createCustomer: build.mutation<Customer, { name: string; email: string }>({
      query: (body) => ({
        url: "/customers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Customers"], // Invalidate the cache so it will be refetched
    }),
  }),
});

export const { useCreateCustomerMutation, useGetCustomersQuery } = customersApi;
