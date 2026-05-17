"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = "success") => {
    setToast({
      id: Date.now(),
      message,
      tone,
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
          <div className="absolute -inset-4 rounded-[2rem] bg-slate-950/10 blur-xl backdrop-blur-sm" />
          <div
            className={[
              "relative rounded-2xl border px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl",
              toast.tone === "success"
                ? "border-emerald-400/30 bg-slate-950/95"
                : "border-red-400/30 bg-slate-950/95",
            ].join(" ")}
            role="status"
          >
            <div className="flex items-start gap-3">
              <span
                className={[
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  toast.tone === "success" ? "bg-emerald-600" : "bg-red-600",
                ].join(" ")}
              />
              <div>
                <p className="text-sm font-semibold text-white">
                  {toast.tone === "success" ? "Success" : "Error"}
                </p>
                <p className="mt-0.5 text-sm leading-6 text-slate-300">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
