import { baseApi } from "@/store/api/base-api";

import type {
  TenantSettings,
  UpdateTenantSettingsRequest,
} from "@/features/tenant-settings/types";

export const tenantSettingsApi = baseApi
  .enhanceEndpoints({
    addTagTypes: ["TenantSettings"],
  })
  .injectEndpoints({
    endpoints: (build) => ({
      getTenantSettings: build.query<TenantSettings, void>({
        query: () => ({
          url: "/tenant-settings",
        }),
        providesTags: [{ type: "TenantSettings", id: "CURRENT" }],
      }),
      updateTenantSettings: build.mutation<
        TenantSettings,
        UpdateTenantSettingsRequest
      >({
        query: (body) => ({
          url: "/tenant-settings",
          method: "PUT",
          body,
        }),
        invalidatesTags: [{ type: "TenantSettings", id: "CURRENT" }],
      }),
    }),
  });

export const { useGetTenantSettingsQuery, useUpdateTenantSettingsMutation } =
  tenantSettingsApi;
