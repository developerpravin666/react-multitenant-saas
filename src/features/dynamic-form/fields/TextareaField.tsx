import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import { getInputClass } from "../../../components/ui/inputClass";
import type { DynamicFieldProps } from "../../../types/form";

export function TextareaField({ field, register, errors }: DynamicFieldProps) {
  if (field.type !== "textarea") return null;
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
      <textarea
        id={field.id}
        rows={field.rows ?? 4}
        placeholder={field.placeholder}
        autoComplete="off"
        disabled={field.disabled}
        aria-invalid={Boolean(message)}
        aria-describedby={message ? `${field.id}-error` : undefined}
        className={getInputClass(Boolean(message), "resize-y")}
        {...register(field.name)}
      />
    </FormFieldShell>
  );
}
