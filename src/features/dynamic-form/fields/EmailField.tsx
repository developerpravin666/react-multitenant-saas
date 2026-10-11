import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import { getInputClass } from "../../../components/ui/inputClass";
import type { DynamicFieldProps } from "./fieldTypes";
import type { Control, FieldValues } from "react-hook-form";

type CompatibleProps = DynamicFieldProps & { control?: Control<FieldValues> };

export function EmailField({ field, register, errors }: CompatibleProps) {
  if (field.type !== "email") return null;

  const error = errors[field.name]?.message;
  const message = typeof error === "string" ? error : undefined;

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
        type="email"
        autoComplete={field.autoComplete ?? "off"}
        placeholder={field.placeholder}
        disabled={field.disabled}
        aria-invalid={Boolean(message)}
        aria-describedby={message ? `${field.id}-error` : undefined}
        className={getInputClass(Boolean(message))}
        {...register(field.name)}
      />
    </FormFieldShell>
  );
}
