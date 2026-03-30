"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  selectAuthSession,
  selectAuthStatus,
} from "@/features/auth/selectors";
import { isSessionValid } from "@/features/auth/session";
import { logout } from "@/features/auth/auth-actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function PublicOnlyRoute({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector(selectAuthStatus);
  const session = useAppSelector(selectAuthSession);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (session && !isSessionValid(session)) {
      logout(dispatch);
      return;
    }

    if (session && session.role === "ADMIN" && isSessionValid(session)) {
      router.replace("/dashboard");
    }
  }, [dispatch, router, session, status]);

  if (status === "loading") {
    return null;
  }

  return <>{children}</>;
}
