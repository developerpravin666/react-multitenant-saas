import type { DynamicFieldProps } from "./fieldTypes";
import type { Control, FieldValues } from "react-hook-form";

type CompatibleProps = DynamicFieldProps & { control?: Control<FieldValues> };

export function CheckboxField({ field, register, errors }: CompatibleProps) {
  if (field.type !== "checkbox") return null;

  const error = errors[field.name]?.message;
  const message = typeof error === "string" ? error : undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={field.id}
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-all duration-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
      >
        <input
          id={field.id}
          type="checkbox"
          disabled={field.disabled}
          aria-invalid={Boolean(message)}
          aria-describedby={message ? `${field.id}-error` : undefined}
          className="mt-0.5 size-4 rounded border-slate-300 accent-[var(--tenant-primary)]"
          {...register(field.name)}
        />
        <span>
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {field.label}
            {field.required ? (
              <span className="ml-1 text-red-600">*</span>
            ) : null}
          </span>
          {field.description ? (
            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
              {field.description}
            </span>
          ) : null}
        </span>
      </label>

      {message ? (
        <p
          id={`${field.id}-error`}
          role="alert"
          className="text-sm font-medium text-red-600 dark:text-red-400"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
