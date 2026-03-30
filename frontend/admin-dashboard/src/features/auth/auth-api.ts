import { baseApi } from "@/store/api/base-api";
import type { LoginRequest, LoginResponse } from "@/features/auth/types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useLoginMutation } = authApi;
