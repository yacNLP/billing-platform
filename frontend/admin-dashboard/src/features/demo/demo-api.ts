import { baseApi } from "@/store/api/base-api";

import type { LoadSampleDataResponse } from "@/features/demo/types";

export const demoApi = baseApi
  .enhanceEndpoints({
    addTagTypes: [
      "Analytics",
      "Customers",
      "Invoices",
      "Onboarding",
      "Payments",
      "Plans",
      "Products",
      "RevenueActions",
      "Subscriptions",
    ],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      loadSampleData: build.mutation<LoadSampleDataResponse, void>({
        query: () => ({
          url: "/demo/load-sample-data",
          method: "POST",
        }),
        invalidatesTags: [
          { type: "Analytics", id: "SUMMARY" },
          { type: "Customers", id: "LIST" },
          { type: "Invoices", id: "LIST" },
          { type: "Onboarding", id: "STATUS" },
          { type: "Payments", id: "LIST" },
          { type: "Plans", id: "LIST" },
          { type: "Products", id: "LIST" },
          { type: "RevenueActions", id: "LIST" },
          { type: "Subscriptions", id: "LIST" },
        ],
      }),
    }),
  });

export const { useLoadSampleDataMutation } = demoApi;
