export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-[var(--tenant-primary)] focus:ring-2 focus:ring-[var(--tenant-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

export const inputErrorClass =
  "border-rose-500 bg-rose-50/20 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white";

export function getInputClass(isInvalid?: boolean, extraClasses?: string): string {
  const base = isInvalid
    ? "w-full rounded-lg border border-rose-500 bg-rose-50/20 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-500 dark:bg-rose-950/20 dark:text-white dark:placeholder:text-slate-500"
    : inputClass;
  return extraClasses ? `${base} ${extraClasses}` : base;
}
