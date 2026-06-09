import { baseApi } from "@/store/api/base-api";

import type {
  AuditLogsListResponse,
  AuditLogsQueryParams,
} from "@/features/audit-logs/types";

export const auditLogsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["AuditLogs"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getAuditLogs: build.query<
        AuditLogsListResponse,
        AuditLogsQueryParams | void
      >({
        query: (params) => ({
          url: "/audit-logs",
          ...(params ? { params } : {}),
        }),
        providesTags: [{ type: "AuditLogs", id: "LIST" }],
      }),
    }),
  });

export const { useGetAuditLogsQuery } = auditLogsApi;
