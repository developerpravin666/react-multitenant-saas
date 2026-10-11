import type { ReactNode } from "react";

export type NotificationVariant = "success" | "error" | "warning" | "info";
export type NotificationPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export interface ToastOptions {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  duration?: number;
  dismissible?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export interface AlertOptions {
  title: string;
  message?: string;
  variant?: NotificationVariant;
  dismissible?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  variant?: "danger" | "warning" | "info";
  confirmLabel?: string;
  cancelLabel?: string;
  closeOnBackdrop?: boolean;
}

export interface NotificationApi {
  toast: (options: ToastOptions) => string;
  success: (
    title: string,
    message?: string,
    options?: Omit<ToastOptions, "title" | "message" | "variant">,
  ) => string;
  error: (
    title: string,
    message?: string,
    options?: Omit<ToastOptions, "title" | "message" | "variant">,
  ) => string;
  warning: (
    title: string,
    message?: string,
    options?: Omit<ToastOptions, "title" | "message" | "variant">,
  ) => string;
  info: (
    title: string,
    message?: string,
    options?: Omit<ToastOptions, "title" | "message" | "variant">,
  ) => string;
  alert: (options: AlertOptions) => string;
  dismiss: (id: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export interface NotificationProviderProps {
  children: ReactNode;
  position?: NotificationPosition;
  maxToasts?: number;
}
