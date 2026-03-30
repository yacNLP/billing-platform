"use client";

import { useRouter } from "next/navigation";

import { logout } from "@/features/auth/auth-actions";
import { useAppDispatch } from "@/store/hooks";

export function LogoutButton() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  function handleLogout() {
    logout(dispatch);
    router.replace("/login");
  }

  return (
    <button
      className="rounded-2xl border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
      onClick={handleLogout}
      type="button"
    >
      Logout
    </button>
  );
}
