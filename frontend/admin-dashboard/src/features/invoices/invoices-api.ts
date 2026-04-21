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
      markInvoicePaid: build.mutation<Invoice, number>({
        query: (id) => ({
          url: `/invoices/${id}/paid`,
          method: "PATCH",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Invoices", id: "LIST" },
          { type: "Invoices", id },
        ],
      }),
      markInvoiceVoid: build.mutation<Invoice, number>({
        query: (id) => ({
          url: `/invoices/${id}/void`,
          method: "PATCH",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Invoices", id: "LIST" },
          { type: "Invoices", id },
        ],
      }),
      markInvoiceOverdue: build.mutation<Invoice, number>({
        query: (id) => ({
          url: `/invoices/${id}/overdue`,
          method: "PATCH",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Invoices", id: "LIST" },
          { type: "Invoices", id },
        ],
      }),
    }),
  });

export const {
  useGetInvoiceByIdQuery,
  useGetInvoicesQuery,
  useMarkInvoiceOverdueMutation,
  useMarkInvoicePaidMutation,
  useMarkInvoiceVoidMutation,
} = invoicesApi;
