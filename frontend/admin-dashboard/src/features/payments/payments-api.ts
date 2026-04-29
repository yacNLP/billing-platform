import { baseApi } from "@/store/api/base-api";

import type {
  Payment,
  PaymentsListResponse,
  PaymentsQueryParams,
  PaymentStatus,
} from "@/features/payments/types";

export const paymentsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Analytics", "Payments", "Invoices"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getPayments: build.query<PaymentsListResponse, PaymentsQueryParams | void>({
        query: (params) => ({
          url: "/payments",
          ...(params ? { params } : {}),
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
          { type: "Analytics", id: "SUMMARY" },
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
