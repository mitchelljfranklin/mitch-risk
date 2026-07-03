"use client";

import { useSyncExternalStore } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

const TOAST_DURATION_MS = 3500;

// The toast queue lives at module scope, not in React state. A Server Action
// that revalidates the current route (or a router.refresh()) re-renders the
// layout that hosts the toast viewport; keeping the queue outside React means
// queued toasts survive that re-render instead of being dropped — a bug that
// only surfaced in production builds.
let toasts: Toast[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Toast[] {
  return toasts;
}

const EMPTY_TOASTS: Toast[] = [];
function getServerSnapshot(): Toast[] {
  return EMPTY_TOASTS;
}

function removeToast(id: number) {
  toasts = toasts.filter((toastItem) => toastItem.id !== id);
  emit();
}

export function showToast(message: string, type: ToastType = "success") {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  emit();
  setTimeout(() => removeToast(id), TOAST_DURATION_MS);
}

const BACKGROUND_BY_TYPE: Record<ToastType, string> = {
  success: "bg-success text-success-foreground",
  error: "bg-destructive text-white",
  info: "bg-muted-foreground text-primary-foreground",
};

function ToastViewport() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
    >
      {items.map((toastItem) => (
        <div
          key={toastItem.id}
          role="alert"
          onClick={() => removeToast(toastItem.id)}
          className={`${BACKGROUND_BY_TYPE[toastItem.type]} animate-in slide-in-from-right-4 pointer-events-auto cursor-pointer rounded-md px-4 py-2.5 text-sm font-medium shadow-lg transition-all`}
        >
          {toastItem.message}
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastViewport />
    </>
  );
}

export function useToast() {
  return { toast: showToast };
}
