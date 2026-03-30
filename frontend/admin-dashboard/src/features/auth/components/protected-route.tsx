"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  selectAuthSession,
  selectAuthStatus,
} from "@/features/auth/selectors";
import { isSessionValid } from "@/features/auth/session";
import { logout } from "@/features/auth/auth-actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const status = useAppSelector(selectAuthStatus);
  const session = useAppSelector(selectAuthSession);
  const hasValidAdminSession = isSessionValid(session) && session?.role === "ADMIN";

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!hasValidAdminSession) {
      logout(dispatch);
      const searchParams = new URLSearchParams({ next: pathname });
      router.replace(`/login?${searchParams.toString()}`);
    }
  }, [dispatch, hasValidAdminSession, pathname, router, status]);

  if (status === "loading") {
    return <FullScreenMessage message="Checking session..." />;
  }

  if (!hasValidAdminSession) {
    return <FullScreenMessage message="Redirecting to login..." />;
  }

  return <>{children}</>;
}

function FullScreenMessage({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
        {message}
      </p>
    </div>
  );
}
