import type { FormFieldConfig } from "../../../types/form";

export const loginFormFields: FormFieldConfig[] = [
  {
    id: "tenant-slug",
    name: "tenantSlug",
    label: "Tenant slug",
    type: "text",
    placeholder: "acme",
    autoComplete: "off",
    required: true,
  },
  {
    id: "username",
    name: "username",
    label: "Username",
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
