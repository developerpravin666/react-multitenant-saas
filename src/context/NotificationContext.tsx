import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { NotificationHost } from "../components/feedback/NotificationHost";
import type {
  AlertOptions,
  ConfirmOptions,
  NotificationApi,
  NotificationProviderProps,
  ToastOptions,
} from "../types/notification";

export interface ToastRecord extends ToastOptions {
  id: string;
}
export interface AlertRecord extends AlertOptions {
  id: string;
}
export interface ConfirmRecord extends ConfirmOptions {
  id: string;
  resolve: (value: boolean) => void;
}
export interface NotificationContextValue extends NotificationApi {
  toasts: ToastRecord[];
  alerts: AlertRecord[];
  confirmDialog: ConfirmRecord | null;
}
export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  children,
  position = "top-right",
  maxToasts = 5,
}: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmRecord | null>(
    null,
  );
  const counter = useRef(0);
  const nextId = () => `notification-${++counter.current}`;
  const dismiss = useCallback((id: string) => {
    setToasts((v) => v.filter((x) => x.id !== id));
    setAlerts((v) => v.filter((x) => x.id !== id));
  }, []);
  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId();
      const record: ToastRecord = {
        duration: 5000,
        dismissible: true,
        variant: "info",
        ...options,
        id,
      };
      setToasts((v) => [...v, record].slice(-maxToasts));
      return id;
    },
    [maxToasts],
  );
  const createVariant = useCallback(
    (
      variant: ToastOptions["variant"],
      title: string,
      message?: string,
      options?: Omit<ToastOptions, "title" | "message" | "variant">,
    ) => toast({ ...options, title, message, variant }),
    [toast],
  );
  const alert = useCallback((options: AlertOptions) => {
    const id = nextId();
    setAlerts((v) => [
      ...v,
      { dismissible: true, variant: "info", ...options, id },
    ]);
    return id;
  }, []);
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) =>
        setConfirmDialog({
          id: nextId(),
          variant: "danger",
          confirmLabel: "Confirm",
          cancelLabel: "Cancel",
          closeOnBackdrop: true,
          ...options,
          resolve,
        }),
      ),
    [],
  );
  const resolveConfirm = useCallback((value: boolean) => {
    setConfirmDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);
  const value = useMemo<NotificationContextValue>(
    () => ({
      toasts,
      alerts,
      confirmDialog,
      toast,
      success: (t, m, o) => createVariant("success", t, m, o),
      error: (t, m, o) => createVariant("error", t, m, o),
      warning: (t, m, o) => createVariant("warning", t, m, o),
      info: (t, m, o) => createVariant("info", t, m, o),
      alert,
      dismiss,
      confirm,
    }),
    [alerts, confirm, confirmDialog, createVariant, dismiss, toast, toasts],
  );
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationHost
        position={position}
        onDismiss={dismiss}
        onConfirm={resolveConfirm}
      />
    </NotificationContext.Provider>
  );
}
export function useNotifications(): NotificationApi {
  const value = useContext(NotificationContext);
  if (!value)
    throw new Error(
      "useNotifications must be used inside NotificationProvider.",
    );
  return value;
}
export function useNotificationState(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value)
    throw new Error(
      "useNotificationState must be used inside NotificationProvider.",
    );
  return value;
}
