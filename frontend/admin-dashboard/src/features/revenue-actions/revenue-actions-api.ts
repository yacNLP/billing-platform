import { baseApi } from "@/store/api/base-api";

import type {
  RevenueActionsListResponse,
  RevenueActionsQueryParams,
} from "@/features/revenue-actions/types";

export const revenueActionsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["RevenueActions"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getRevenueActions: build.query<
        RevenueActionsListResponse,
        RevenueActionsQueryParams | void
      >({
        query: (params) => ({
          url: "/revenue-actions",
          ...(params ? { params } : {}),
        }),
        providesTags: [{ type: "RevenueActions", id: "LIST" }],
      }),
    }),
  });

export const { useGetRevenueActionsQuery } = revenueActionsApi;
