"use client";

import { useEffect } from "react";

import { bootstrapAuthSession } from "@/features/auth/auth-actions";
import { useAppDispatch } from "@/store/hooks";

export function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    bootstrapAuthSession(dispatch);
  }, [dispatch]);

  return null;
}
