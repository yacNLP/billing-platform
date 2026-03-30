import type { RootState } from "@/store";

export const selectAuthStatus = (state: RootState) => state.auth.status;
export const selectAuthSession = (state: RootState) => state.auth.session;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.status === "authenticated" && state.auth.session !== null;
