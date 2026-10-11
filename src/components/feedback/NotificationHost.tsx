import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect, useState, useContext } from "react";
import type {
  NotificationPosition,
  NotificationVariant,
} from "../../types/notification";
import {
  NotificationContext,
  type AlertRecord,
  type ConfirmRecord,
  type ToastRecord,
} from "../../context/NotificationContext";

const meta: Record<
  NotificationVariant,
  { icon: typeof Info; text: string; bar: string }
> = {
  success: {
    icon: CheckCircle2,
    text: "text-emerald-500",
    bar: "bg-emerald-500",
  },
  error: { icon: XCircle, text: "text-rose-500", bar: "bg-rose-500" },
  warning: { icon: AlertTriangle, text: "text-amber-500", bar: "bg-amber-500" },
  info: { icon: Info, text: "text-sky-500", bar: "bg-sky-500" },
};
const positions: Record<NotificationPosition, string> = {
  "top-right": "right-4 top-4 sm:right-6 sm:top-6",
  "top-left": "left-4 top-4 sm:left-6 sm:top-6",
  "top-center": "left-1/2 top-4 -translate-x-1/2 sm:top-6",
  "bottom-right": "right-4 bottom-4 sm:right-6 sm:bottom-6",
  "bottom-left": "left-4 bottom-4 sm:left-6 sm:bottom-6",
  "bottom-center": "left-1/2 bottom-4 -translate-x-1/2 sm:bottom-6",
};

export function NotificationHost({
  position,
  onDismiss,
  onConfirm,
}: {
  position: NotificationPosition;
  onDismiss: (id: string) => void;
  onConfirm: (value: boolean) => void;
}) {
  const context = useContext(NotificationContext);
  if (!context) return null;
  return (
    <>
      <div
        className={`pointer-events-none fixed z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 ${positions[position]}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {context.toasts.map((item) => (
          <Toast key={item.id} toast={item} onDismiss={onDismiss} />
        ))}
      </div>
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] mx-auto flex max-w-2xl flex-col gap-3 sm:bottom-6"
        aria-live="polite"
      >
        {context.alerts.map((item) => (
          <InlineAlert key={item.id} alert={item} onDismiss={onDismiss} />
        ))}
      </div>
      {context.confirmDialog ? (
        <ConfirmDialog dialog={context.confirmDialog} onResolve={onConfirm} />
      ) : null}
    </>
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const item = meta[toast.variant ?? "info"];
  const Icon = item.icon;
  useEffect(() => {
    const enter = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(enter);
  }, []);
  useEffect(() => {
    if (!toast.duration || toast.duration <= 0) return;
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.duration, toast.id]);
  return (
    <div
      className={`pointer-events-auto overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 transition-all duration-300 dark:border-slate-700 dark:bg-slate-900 ${visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className="flex gap-3 p-4">
        <Icon className={`mt-0.5 size-5 shrink-0 ${item.text}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {toast.title}
          </p>
          {toast.message ? (
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
              {toast.message}
            </p>
          ) : null}
          {toast.actionLabel ? (
            <button
              type="button"
              onClick={() => toast.onAction?.()}
              className="mt-2 text-xs font-bold text-[var(--tenant-primary)]"
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
        {toast.dismissible !== false ? (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      <div className={`h-0.5 ${item.bar}`} />
    </div>
  );
}

function InlineAlert({
  alert,
  onDismiss,
}: {
  alert: AlertRecord;
  onDismiss: (id: string) => void;
}) {
  const item = meta[alert.variant ?? "info"];
  const Icon = item.icon;
  return (
    <div
      className="pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      role={alert.variant === "error" ? "alert" : "status"}
    >
      <div className="flex gap-3">
        <Icon className={`mt-0.5 size-5 shrink-0 ${item.text}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {alert.title}
          </p>
          {alert.message ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {alert.message}
            </p>
          ) : null}
          {alert.actionLabel ? (
            <button
              type="button"
              onClick={() => alert.onAction?.()}
              className="mt-2 text-xs font-bold text-[var(--tenant-primary)]"
            >
              {alert.actionLabel}
            </button>
          ) : null}
        </div>
        {alert.dismissible !== false ? (
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => onDismiss(alert.id)}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmDialog({
  dialog,
  onResolve,
}: {
  dialog: ConfirmRecord;
  onResolve: (value: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const danger = dialog.variant === "danger";
  const warning = dialog.variant === "warning";
  const confirmAction = () => {
    setBusy(true);
    onResolve(true);
  };
  const cancel = () => onResolve(false);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dialog.closeOnBackdrop)
          cancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="p-6">
          <div
            className={`flex size-11 items-center justify-center rounded-full ${danger ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40" : warning ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40" : "bg-sky-50 text-sky-600 dark:bg-sky-950/40"}`}
          >
            <AlertTriangle className="size-5" />
          </div>
          <h3
            id="confirm-title"
            className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {dialog.title}
          </h3>
          {dialog.message ? (
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {dialog.message}
            </p>
          ) : null}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/40">
          <button
            type="button"
            disabled={busy}
            onClick={cancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {dialog.cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirmAction}
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50 ${danger ? "bg-rose-600" : warning ? "bg-amber-600" : "bg-[var(--tenant-primary)]"}`}
          >
            {busy ? "Working…" : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
