import { baseApi } from "@/store/api/base-api";

import type { Plan, PlansListResponse } from "@/features/plans/types";

export const plansApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Plans"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getPlans: build.query<Plan[], void>({
        query: () => ({
          url: "/plans",
        }),
        transformResponse: (response: PlansListResponse) => response.data,
        providesTags: [{ type: "Plans", id: "LIST" }],
      }),
    }),
  });

export const { useGetPlansQuery } = plansApi;
