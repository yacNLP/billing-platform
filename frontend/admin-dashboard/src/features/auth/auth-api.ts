import { baseApi } from "@/store/api/base-api";
import type {
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  OkResponse,
  ResetPasswordRequest,
  SignupRequest,
} from "@/features/auth/types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    signup: build.mutation<LoginResponse, SignupRequest>({
      query: (body) => ({
        url: "/auth/signup",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: build.mutation<OkResponse, ForgotPasswordRequest>({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: build.mutation<OkResponse, ResetPasswordRequest>({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useForgotPasswordMutation,
  useLoginMutation,
  useResetPasswordMutation,
  useSignupMutation,
} = authApi;
