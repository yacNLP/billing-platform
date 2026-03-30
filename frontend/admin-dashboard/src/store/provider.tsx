"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Provider } from "react-redux";

import { makeStore, type AppStore } from "@/store";

export function StoreProvider({ children }: PropsWithChildren) {
  const [store] = useState<AppStore>(() => makeStore());

  return <Provider store={store}>{children}</Provider>;
}
