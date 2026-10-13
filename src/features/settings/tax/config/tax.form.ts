import type { FormFieldConfig } from "../../../../types/form";

export const taxFormConfig: FormFieldConfig[] = [
  {
    id: "name", name: "name", label: "Tax Profile Name", type: "text",
    required: true, maxLength: 100, placeholder: "Example: Mobile devices GST"
  },
  {
    id: "effectiveFrom", name: "effectiveFrom", label: "Effective From",
    type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10)
  },
  {
    id: "treatment", name: "treatment", label: "Tax Treatment", type:
      "select", required: true, defaultValue: "Taxable", options: ["Taxable", "Exempt", "NilRated", "NonGst", "ZeroRated"].map(value => ({ value, label: value }))
  },
  {
    id: "cgst",
    name: "cgst",
    label: "CGST (%)",
    type: "number",
    required: true,
    min: 0,
    max: 100,
    step: 0.01,
    defaultValue: 0,
  },
  {
    id: "sgst",
    name: "sgst",
    label: "SGST (%)",
    type: "number",
    required: true,
    min: 0,
    max: 100,
    step: 0.01,
    defaultValue: 0,
  },
  {
    id: "totalTax",
    name: "totalTax",
    label: "Total Tax (%)",
    type: "number",
    readOnly: true,
    defaultValue: 0,
    description: "Calculated automatically as CGST + SGST.",
    computed: {
      calculate: (values) => Number(values.cgst ?? 0) + Number(values.sgst ?? 0),
    },
  },
  {
    id: "isActive",
    name: "isActive",
    label: "Active",
    type: "toggle",
    defaultValue: true,
  },
];
