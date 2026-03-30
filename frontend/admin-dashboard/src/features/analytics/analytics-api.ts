import { baseApi } from "@/store/api/base-api";

import type { AnalyticsSummary } from "@/features/analytics/types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAnalyticsSummary: build.query<AnalyticsSummary, void>({
      query: () => ({
        url: "/analytics/summary",
      }),
    }),
  }),
});

export const { useGetAnalyticsSummaryQuery } = analyticsApi;
