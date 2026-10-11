import type { InputHTMLAttributes } from "react";
import type { DynamicFieldProps } from "../../../types/form";
import { FormFieldShell } from "../../../components/ui/FormFieldShell";
import { getInputClass } from "../../../components/ui/inputClass";

export function NativeInputField({
  field,
  register,
  errors,
}: DynamicFieldProps) {
  const supported = [
    "password",
    "number",
    "tel",
    "url",
    "date",
    "time",
    "datetime",
    "month",
    "week",
    "color",
    "range",
  ];
  if (!supported.includes(field.type)) return null;
  const message =
    typeof errors[field.name]?.message === "string"
      ? String(errors[field.name]?.message)
      : undefined;

  const typeMap: Record<string, InputHTMLAttributes<HTMLInputElement>["type"]> =
    {
      password: "password",
      number: "number",
      tel: "tel",
      url: "url",
      date: "date",
      time: "time",
      datetime: "datetime-local",
      month: "month",
      week: "week",
      color: "color",
      range: "range",
    };
  const attrs: InputHTMLAttributes<HTMLInputElement> = {
    id: field.id,
    type: typeMap[field.type],
    disabled: field.disabled,
    readOnly: field.readOnly,
    placeholder: "placeholder" in field ? field.placeholder : undefined,
    autoComplete: ("autoComplete" in field && field.autoComplete) ? field.autoComplete : "off",
    min: "min" in field ? field.min : undefined,
    max: "max" in field ? field.max : undefined,
    step: "step" in field ? field.step : undefined,
    "aria-invalid": Boolean(message),
    "aria-describedby": message ? `${field.id}-error` : undefined,
    className:
      field.type === "color"
        ? `h-11 w-20 cursor-pointer rounded-lg border bg-white p-1 dark:bg-slate-950 ${
            message ? "border-rose-500" : "border-slate-300 dark:border-slate-700"
          }`
        : getInputClass(Boolean(message)),
  };
  return (
    <FormFieldShell
      id={field.id}
      label={field.label}
      description={field.description}
      error={message}
      required={field.required}
    >
      <input
        {...attrs}
        {...register(field.name, {
          valueAsNumber: field.type === "number" || field.type === "range",
        })}
      />
    </FormFieldShell>
  );
}
