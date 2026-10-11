import type { FormFieldConfig } from "../../../../types/form";

export const colorFormConfig: FormFieldConfig[] = [
  {
    id: "name",
    name: "name",
    label: "Color Name",
    type: "text",
    required: true,
    placeholder: "Example: Midnight Black",
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
