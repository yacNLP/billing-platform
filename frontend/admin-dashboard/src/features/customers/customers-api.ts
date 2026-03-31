import { baseApi } from "@/store/api/base-api";

import type { Customer, CustomersListResponse } from "@/features/customers/types";

export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<Customer[], void>({
      query: () => ({
        url: "/customers",
      }),
      // The backend returns a paginated object. For this first list view, we only need the array.
      transformResponse: (response: CustomersListResponse) => response.data,
    }),
  }),
});

export const { useGetCustomersQuery } = customersApi;
