"use client";

import type { PropsWithChildren } from "react";

import { StoreProvider } from "@/store/provider";

export function AppProvider({ children }: PropsWithChildren) {
  return <StoreProvider>{children}</StoreProvider>;
}
