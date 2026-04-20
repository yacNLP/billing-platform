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
    }),
  });

export const { useGetSubscriptionsQuery } = subscriptionsApi;
