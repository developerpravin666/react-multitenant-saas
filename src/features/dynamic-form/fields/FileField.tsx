import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import { inputClass } from "../../../components/ui/inputClass";
import type { DynamicFieldProps } from "../../../types/form";

export function FileField({ field, register, errors }: DynamicFieldProps) {
  if (field.type !== "file") return null;
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
      <input
        id={field.id}
        type="file"
        accept={field.accept}
        multiple={field.multiple}
        disabled={field.disabled}
        className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-[var(--tenant-secondary)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--tenant-primary)]`}
        {...register(field.name)}
      />
    </FormFieldShell>
  );
}
