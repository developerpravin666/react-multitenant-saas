

import type { FormFieldConfig } from "../../../../types/form";

export const createProductTypeFormConfig: FormFieldConfig[] = [
  {
    id: "name",
    name: "name",
    label: "Product Type",
    type: "text",
    required: true,
    placeholder: "Example: Mobile",
  },
  {
    id: "hsnSac", name: "hsnSac", label: "Default HSN/SAC Code", type: "text",
    maxLength: 8, pattern: "^(?:[0-9]{4}|[0-9]{6}|[0-9]{8})$",
    description: "Optional default: 4, 6 or 8 digits. Used for new purchases.",
  },
  {
    id: "description",
    name: "description",
    label: "Description",
    type: "textarea",
  },
  {
    id: "isActive",
    name: "isActive",
    label: "Active",
    type: "toggle",
    defaultValue: true,
  },
];
