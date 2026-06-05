import type { RootState } from "@/store";

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthSession = (state: RootState) => state.auth.session;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.status === "authenticated" && state.auth.session !== null;

export const selectIsAdmin = (state: RootState) =>
  state.auth.status === "authenticated" && state.auth.session?.role === "ADMIN";

export const selectIsUser = (state: RootState) =>
  state.auth.status === "authenticated" && state.auth.session?.role === "USER";

export const selectIsReadOnlyUser = selectIsUser;
