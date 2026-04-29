import { baseApi } from "@/store/api/base-api";

import type { AnalyticsSummary } from "@/features/analytics/types";

export const analyticsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Analytics"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getAnalyticsSummary: build.query<AnalyticsSummary, void>({
        query: () => ({
          url: "/analytics/summary",
        }),
        providesTags: [{ type: "Analytics", id: "SUMMARY" }],
      }),
    }),
  });

export const { useGetAnalyticsSummaryQuery } = analyticsApi;
