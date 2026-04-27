import { baseApi } from "@/store/api/base-api";

import type {
  Subscription,
  SubscriptionsListResponse,
  SubscriptionsQueryParams,
} from "@/features/subscriptions/types";

export const subscriptionsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Subscriptions"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getSubscriptions: build.query<
        SubscriptionsListResponse,
        SubscriptionsQueryParams | void
      >({
        query: (params) => ({
          url: "/subscriptions",
          ...(params ? { params } : {}),
        }),
        providesTags: [{ type: "Subscriptions", id: "LIST" }],
      }),
      getSubscriptionById: build.query<Subscription, number>({
        query: (id) => ({
          url: `/subscriptions/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Subscriptions", id }],
      }),
      createSubscription: build.mutation<
        Subscription,
        {
          customerId: number;
          planId: number;
          startDate?: string;
          cancelAtPeriodEnd?: boolean;
        }
      >({
        query: (body) => ({
          url: "/subscriptions",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Subscriptions", id: "LIST" }],
      }),
      cancelSubscription: build.mutation<
        Subscription,
        { id: number; cancelAtPeriodEnd?: boolean }
      >({
        query: ({ id, ...body }) => ({
          url: `/subscriptions/${id}/cancel`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "Subscriptions", id: "LIST" },
          { type: "Subscriptions", id },
        ],
      }),
    }),
  });

export const {
  useCancelSubscriptionMutation,
  useCreateSubscriptionMutation,
  useGetSubscriptionByIdQuery,
  useGetSubscriptionsQuery,
} = subscriptionsApi;
