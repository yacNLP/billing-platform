import { baseApi } from "@/store/api/base-api";

import type { JobSummary } from "@/features/admin-jobs/types";

export const adminJobsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["Analytics", "Invoices", "Subscriptions"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      runMarkOverdueInvoicesJob: build.mutation<JobSummary, void>({
        query: () => ({
          url: "/admin/jobs/mark-overdue-invoices",
          method: "POST",
        }),
        invalidatesTags: [
          { type: "Analytics", id: "SUMMARY" },
          { type: "Invoices", id: "LIST" },
        ],
      }),
      runUpdatePastDueSubscriptionsJob: build.mutation<JobSummary, void>({
        query: () => ({
          url: "/admin/jobs/update-past-due-subscriptions",
          method: "POST",
        }),
        invalidatesTags: [
          { type: "Analytics", id: "SUMMARY" },
          { type: "Subscriptions", id: "LIST" },
        ],
      }),
      runRenewDueSubscriptionsJob: build.mutation<JobSummary, void>({
        query: () => ({
          url: "/admin/jobs/renew-due-subscriptions",
          method: "POST",
        }),
        invalidatesTags: [
          { type: "Analytics", id: "SUMMARY" },
          { type: "Invoices", id: "LIST" },
          { type: "Subscriptions", id: "LIST" },
        ],
      }),
      runGenerateDueInvoicesJob: build.mutation<JobSummary, void>({
        query: () => ({
          url: "/admin/jobs/generate-due-invoices",
          method: "POST",
        }),
        invalidatesTags: [
          { type: "Analytics", id: "SUMMARY" },
          { type: "Invoices", id: "LIST" },
        ],
      }),
    }),
  });

export const {
  useRunGenerateDueInvoicesJobMutation,
  useRunMarkOverdueInvoicesJobMutation,
  useRunRenewDueSubscriptionsJobMutation,
  useRunUpdatePastDueSubscriptionsJobMutation,
} = adminJobsApi;
