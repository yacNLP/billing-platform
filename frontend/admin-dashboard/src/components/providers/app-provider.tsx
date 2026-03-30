"use client";

import type { PropsWithChildren } from "react";

import { AuthBootstrap } from "@/features/auth/components/auth-bootstrap";
import { StoreProvider } from "@/store/provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <StoreProvider>
      <AuthBootstrap />
      {children}
    </StoreProvider>
  );
}
