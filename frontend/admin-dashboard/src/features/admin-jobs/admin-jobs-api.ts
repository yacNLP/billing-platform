import { baseApi } from "@/store/api/base-api";

import type { JobSummary } from "@/features/admin-jobs/types";

export const adminJobsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    runMarkOverdueInvoicesJob: build.mutation<JobSummary, void>({
      query: () => ({
        url: "/admin/jobs/mark-overdue-invoices",
        method: "POST",
      }),
    }),
    runUpdatePastDueSubscriptionsJob: build.mutation<JobSummary, void>({
      query: () => ({
        url: "/admin/jobs/update-past-due-subscriptions",
        method: "POST",
      }),
    }),
    runRenewDueSubscriptionsJob: build.mutation<JobSummary, void>({
      query: () => ({
        url: "/admin/jobs/renew-due-subscriptions",
        method: "POST",
      }),
    }),
    runGenerateDueInvoicesJob: build.mutation<JobSummary, void>({
      query: () => ({
        url: "/admin/jobs/generate-due-invoices",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useRunGenerateDueInvoicesJobMutation,
  useRunMarkOverdueInvoicesJobMutation,
  useRunRenewDueSubscriptionsJobMutation,
  useRunUpdatePastDueSubscriptionsJobMutation,
} = adminJobsApi;
