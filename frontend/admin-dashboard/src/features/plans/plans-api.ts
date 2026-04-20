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
      getPlanById: build.query<Plan, number>({
        query: (id) => ({
          url: `/plans/${id}`,
        }),
        providesTags: (_result, _error, id) => [{ type: "Plans", id }],
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
      updatePlan: build.mutation<
        Plan,
        {
          id: number;
          code: string;
          name: string;
          description?: string;
          amount: number;
          currency: string;
          interval: BillingInterval;
          intervalCount: number;
          trialDays: number;
          active: boolean;
        }
      >({
        query: ({ id, ...body }) => ({
          url: `/plans/${id}`,
          method: "PATCH",
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [
          { type: "Plans", id: "LIST" },
          { type: "Plans", id },
        ],
      }),
      deletePlan: build.mutation<void, number>({
        query: (id) => ({
          url: `/plans/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (_result, _error, id) => [
          { type: "Plans", id: "LIST" },
          { type: "Plans", id },
        ],
      }),
    }),
  });

export const {
  useCreatePlanMutation,
  useDeletePlanMutation,
  useGetPlanByIdQuery,
  useGetPlansQuery,
  useUpdatePlanMutation,
} = plansApi;
