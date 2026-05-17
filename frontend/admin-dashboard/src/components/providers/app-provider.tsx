"use client";

import type { PropsWithChildren } from "react";

import { ToastProvider } from "@/components/admin/toast-provider";
import { AuthBootstrap } from "@/features/auth/components/auth-bootstrap";
import { StoreProvider } from "@/store/provider";

export function AppProvider({ children }: PropsWithChildren) {
  return (
    <StoreProvider>
      <ToastProvider>
        <AuthBootstrap />
        {children}
      </ToastProvider>
    </StoreProvider>
  );
}
