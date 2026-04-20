import { baseApi } from "@/store/api/base-api";

import type {
  BillingInterval,
  Plan,
  PlansListResponse,
} from "@/features/plans/types";

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
      createPlan: build.mutation<
        Plan,
        {
          code: string;
          name: string;
          description?: string;
          productId: number;
          amount: number;
          currency: string;
          interval: BillingInterval;
          intervalCount: number;
          trialDays: number;
          active?: boolean;
        }
      >({
        query: (body) => ({
          url: "/plans",
          method: "POST",
          body,
        }),
        invalidatesTags: [{ type: "Plans", id: "LIST" }],
      }),
    }),
  });

export const { useCreatePlanMutation, useGetPlansQuery } = plansApi;
