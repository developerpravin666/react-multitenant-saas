import { z } from "zod";
import type { FormFieldConfig } from "../../../types/form";

const req = (label: string) => `${label} is required.`;
const allowed = (options: { value: string }[]) =>
  new Set(options.map((o) => o.value));

export function createDynamicFormSchema(fields: FormFieldConfig[]) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    switch (field.type) {
      case "text":
      case "textarea":
      case "password": {
        let s = z.string();
        if (field.required) s = s.min(1, req(field.label));
        if ("minLength" in field && field.minLength)
          s = s.min(field.minLength, `${field.label} is too short.`);
        if ("maxLength" in field && field.maxLength)
          s = s.max(field.maxLength, `${field.label} is too long.`);
        if ("pattern" in field && field.pattern)
          s = s.regex(
            new RegExp(field.pattern),
            `${field.label} has an invalid format.`,
          );
        shape[field.name] = field.required ? s : s.optional().or(z.literal(""));
        break;
      }
      case "autocomplete":
        shape[field.name] = field.required
          ? z.string().min(1, req(field.label))
          : z.string().optional();
        break;
      case "email":
        shape[field.name] = field.required
          ? z
              .string()
              .min(1, req(field.label))
              .email("Enter a valid email address.")
          : z
              .union([
                z.literal(""),
                z.string().email("Enter a valid email address."),
              ])
              .optional();
        break;
      case "number":
      case "range": {
        let s = z.number().finite(`${field.label} must be a number.`);
        if (field.min !== undefined)
          s = s.min(field.min, `${field.label} is below the minimum.`);
        if (field.max !== undefined)
          s = s.max(field.max, `${field.label} exceeds the maximum.`);
        shape[field.name] = field.required ? s : s.optional();
        break;
      }
      case "select": {
        const set = allowed(field.options);
        let s = z
          .string()
          .refine((v) => v === "" || set.has(v), "Invalid selection.");
        if (field.required) s = s.refine((v) => v !== "", req(field.label));
        shape[field.name] = s;
        break;
      }
      case "multiSelect": {
        const set = allowed(field.options);
        let s = z
          .array(z.string())
          .refine((v) => v.every((x) => set.has(x)), "Invalid selection.");
        if (field.maxSelections)
          s = s.max(
            field.maxSelections,
            `Select no more than ${field.maxSelections} options.`,
          );
        shape[field.name] = field.required ? s.min(1, req(field.label)) : s;
        break;
      }
      case "radio": {
        const set = allowed(field.options);
        const s = z.string().refine((v) => set.has(v), "Invalid selection.");
        shape[field.name] = field.required ? s : s.optional();
        break;
      }
      case "checkbox":
      case "toggle":
        shape[field.name] = field.required
          ? z.literal(true, { error: `${field.label} must be enabled.` })
          : z.boolean();
        break;
      case "hidden":
        shape[field.name] = z.unknown();
        break;
      case "tel":
      case "url":
      case "date":
      case "time":
      case "datetime":
      case "month":
      case "week":
      case "color":
      case "file":
        shape[field.name] = field.required
          ? z.string().min(1, req(field.label))
          : z.string().optional();
        break;
    }
  }
  return z.object(shape);
}
