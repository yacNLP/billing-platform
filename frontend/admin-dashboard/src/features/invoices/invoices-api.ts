import { baseApi } from "@/store/api/base-api";

import type {
  Invoice,
  InvoicesListResponse,
  InvoicesQueryParams,
} from "@/features/invoices/types";

export const invoicesApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Invoices"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getInvoices: build.query<InvoicesListResponse, InvoicesQueryParams | void>({
        query: (params) => ({
          url: "/invoices",
          ...(params ? { params } : {}),
        }),
        providesTags: [{ type: "Invoices", id: "LIST" }],
      }),
      getInvoiceById: build.query<Invoice, number>({
        query: (id) => ({
          url: `/invoices/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Invoices", id }],
      }),
      createInvoice: build.mutation<
        Invoice,
        {
          subscriptionId: number;
          customerId: number;
          amountDue: number;
          currency?: string;
          periodStart: string;
          periodEnd: string;
          issuedAt?: string;
          dueAt: string;
        }
      >({
        query: (body) => ({
          url: "/invoices",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Invoices", id: "LIST" }],
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
  useCreateInvoiceMutation,
  useGetInvoiceByIdQuery,
  useGetInvoicesQuery,
  useMarkInvoiceOverdueMutation,
  useMarkInvoicePaidMutation,
  useMarkInvoiceVoidMutation,
} = invoicesApi;
