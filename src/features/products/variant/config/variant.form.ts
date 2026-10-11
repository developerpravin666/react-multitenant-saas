import type { FormFieldConfig } from "../../../../types/form";

export const variantFormConfig: FormFieldConfig[] = [
  {
    id: "name",
    name: "name",
    label: "Variant Name",
    type: "text",
    required: true,
    placeholder: "Example: Standard",
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
