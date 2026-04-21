import { baseApi } from "@/store/api/base-api";

import type { Payment, PaymentStatus } from "@/features/payments/types";

export const paymentsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Payments", "Invoices"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getPayments: build.query<Payment[], void>({
        query: () => ({
          url: "/payments",
        }),
        providesTags: [{ type: "Payments", id: "LIST" }],
      }),
      getPaymentById: build.query<Payment, number>({
        query: (id) => ({
          url: `/payments/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Payments", id }],
      }),
      createPayment: build.mutation<
        Payment,
        {
          invoiceId: number;
          amount: number;
          currency: string;
          status: PaymentStatus;
          paidAt?: string;
          failureReason?: string;
          provider?: string;
          providerReference?: string;
        }
      >({
        query: (body) => ({
          url: "/payments",
          method: "POST",
          body,
        }),
        invalidatesTags: (_result, _error, { invoiceId }) => [
          { type: "Payments", id: "LIST" },
          { type: "Invoices", id: "LIST" },
          { type: "Invoices", id: invoiceId },
        ],
      }),
    }),
  });

export const {
  useCreatePaymentMutation,
  useGetPaymentByIdQuery,
  useGetPaymentsQuery,
} = paymentsApi;
