import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/auth-slice";
import { baseApi } from "@/store/api/base-api";

export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
