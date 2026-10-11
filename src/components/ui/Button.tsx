import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { LoaderCircle } from "lucide-react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps
  extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "bg-[var(--tenant-primary)] text-white hover:bg-[var(--tenant-primary-hover)]"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
    >
      {isLoading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
