import { FormFieldConfig } from "../../../../types/form";

export const brandFormConfig: FormFieldConfig[] = [
  {
    id: "name",
    name: "name",
    label: "Brand Name",
    type: "text",
    required: true,
    placeholder: "Example: Samsung",
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
