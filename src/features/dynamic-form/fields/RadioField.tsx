import type { DynamicFieldProps } from "../../../types/form";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";

export function RadioField({ field, register, errors }: DynamicFieldProps) {
  if (field.type !== "radio") return null;
  const message =
    typeof errors[field.name]?.message === "string"
      ? String(errors[field.name]?.message)
      : undefined;
  return (
    <FormFieldShell
      id={field.id}
      label={field.label}
      description={field.description}
      error={message}
      required={field.required}
    >
      <div
        className={
          field.orientation === "horizontal"
            ? "flex flex-wrap gap-4"
            : "space-y-2"
        }
      >
        {field.options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
          >
            <input
              type="radio"
              value={option.value}
              disabled={field.disabled || option.disabled}
              className="size-4 accent-[var(--tenant-primary)]"
              {...register(field.name)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </FormFieldShell>
  );
}
