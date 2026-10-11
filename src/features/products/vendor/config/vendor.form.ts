import type { FormFieldConfig } from "../../../../types/form";

export const vendorFormConfig: FormFieldConfig[] = [
  {
    id: "name",
    name: "name",
    label: "Vendor Name",
    type: "text",
    placeholder: "Enter vendor name",
    required: true,
    minLength: 2,
  },
  {
    id: "code",
    name: "code",
    label: "Vendor Code",
    type: "text",
    placeholder: "Example: VEN001",
    required: true,
  },
  {
    id: "description",
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Enter description",
  },
  {
    id: "address",
    name: "address",
    label: "Address",
    type: "textarea",
    placeholder: "Enter address",
  },
  {
    id: "mobile",
    name: "mobile",
    label: "Mobile",
    type: "tel",
    placeholder: "Enter mobile number",
    required: true,
  },
  {
    id: "email",
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "vendor@example.com",
    required: true,
  },
  {
    id: "isActive",
    name: "isActive",
    label: "Active",
    type: "toggle",
    defaultValue: true,
  },
];
