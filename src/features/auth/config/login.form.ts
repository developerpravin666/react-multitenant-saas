import type { FormFieldConfig } from "../../../types/form";

export const loginFormFields: FormFieldConfig[] = [
  {
    id: "tenant-slug",
    name: "tenantSlug",
    label: "Tenant slug (optional)",
    type: "text",
    placeholder: "acme",
    autoComplete: "off",
    required: false,
  },
  {
    id: "username",
    name: "username",
    label: "Email or mobile",
    type: "text",
    autoComplete: "off",
    required: true,
  },
  {
    id: "password",
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "off",
    required: true,
  },
];
