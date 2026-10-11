import { Controller, type Control, type FieldValues } from "react-hook-form";
import type { DynamicFieldProps } from "../../../types/form";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";

interface Props extends DynamicFieldProps {
  control: Control<FieldValues>;
}

export function ToggleField({ field, control, errors }: Props) {
  if (field.type !== "toggle") return null;
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
      <Controller
        name={field.name}
        control={control}
        render={({ field: controller }) => {
          const checked = controller.value === true;
          return (
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              disabled={field.disabled}
              onClick={() => controller.onChange(!checked)}
              className="inline-flex items-center gap-3 py-1 text-sm font-medium text-slate-700 dark:text-slate-300 disabled:opacity-60"
            >
              <span
                className={`relative h-6 w-11 rounded-full transition-all duration-300 ${checked ? "bg-[var(--tenant-primary)]" : "bg-slate-300 dark:bg-slate-700"}`}
              >
                <span
                  className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${checked ? "translate-x-6" : "translate-x-1"}`}
                />
              </span>
              {checked ? (field.onLabel ?? "On") : (field.offLabel ?? "Off")}
            </button>
          );
        }}
      />
    </FormFieldShell>
  );
}
