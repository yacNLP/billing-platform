import { baseApi } from "@/store/api/base-api";

import type { Invoice, InvoicesListResponse } from "@/features/invoices/types";

export const invoicesApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Invoices"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getInvoices: build.query<Invoice[], void>({
        query: () => ({
          url: "/invoices",
        }),
        transformResponse: (response: InvoicesListResponse) => response.data,
        providesTags: [{ type: "Invoices", id: "LIST" }],
      }),
      getInvoiceById: build.query<Invoice, number>({
        query: (id) => ({
          url: `/invoices/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Invoices", id }],
      }),
    }),
  });

export const { useGetInvoiceByIdQuery, useGetInvoicesQuery } = invoicesApi;
