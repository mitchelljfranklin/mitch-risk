"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    [],
  );

  function remove(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const bgMap: Record<ToastType, string> = {
    success: "bg-success text-success-foreground",
    error: "bg-destructive text-white",
    info: "bg-muted-foreground text-primary-foreground",
  };

  return (
    <ToastContext value={{ toast: showToast }}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            onClick={() => remove(t.id)}
            className={`${bgMap[t.type]} animate-in slide-in-from-right-4 pointer-events-auto cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium shadow-lg transition-all`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
