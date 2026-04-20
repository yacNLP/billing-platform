import { baseApi } from "@/store/api/base-api";

import type {
  Subscription,
  SubscriptionsListResponse,
} from "@/features/subscriptions/types";

export const subscriptionsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Subscriptions"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getSubscriptions: build.query<Subscription[], void>({
        query: () => ({
          url: "/subscriptions",
        }),
        transformResponse: (response: SubscriptionsListResponse) => response.data,
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
    }),
  });

export const {
  useCreateSubscriptionMutation,
  useGetSubscriptionByIdQuery,
  useGetSubscriptionsQuery,
} = subscriptionsApi;
