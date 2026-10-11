

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
