import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { AuthSession, AuthStatus } from "@/features/auth/types";

type AuthState = {
  status: AuthStatus;
  session: AuthSession | null;
};

const initialState: AuthState = {
  status: "loading",
  session: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<AuthSession>) {
      state.status = "authenticated";
      state.session = action.payload;
    },
    clearSession(state) {
      state.status = "anonymous";
      state.session = null;
    },
    finishAuthBootstrap(state) {
      if (state.status === "loading") {
        state.status = "anonymous";
      }
    },
  },
});

export const { setSession, clearSession, finishAuthBootstrap } = authSlice.actions;
export const authReducer = authSlice.reducer;
