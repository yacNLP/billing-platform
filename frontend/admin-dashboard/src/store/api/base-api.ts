import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { getStoredAccessToken } from "@/features/auth/auth-storage";
import { env } from "@/lib/env";
import type { RootState } from "@/store";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: env.apiBaseUrl,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const accessToken = state.auth.session?.accessToken ?? getStoredAccessToken();

      if (accessToken) {
        headers.set("authorization", `Bearer ${accessToken}`);
      }

      return headers;
    },
  }),
  endpoints: () => ({}),
  tagTypes: [],
});
