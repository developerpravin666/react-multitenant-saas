import type { FormFieldConfig, SelectOption } from "../../../../types/form";

import { resolveTaxRate, taxProfileOptions, type DatedTaxRate } from "../../../settings/tax/taxProfiles";

export interface ProductLookup {
  id: string;
  name: string;
  brandId?: string;
  productTypeId?: string;
  defaultTaxId?: string | null;
  hsnSac?: string | null;
}

interface ProductFormOptions {
  vendors: ProductLookup[];
  brands: ProductLookup[];
  productTypes: ProductLookup[];
  models: ProductLookup[];
  variants: ProductLookup[];
  colors: ProductLookup[];
  taxes?: DatedTaxRate[];
  cgst?: number;
  sgst?: number;
}

const toOptions = (items: ProductLookup[]): SelectOption[] =>
  items.map(({ id, name }) => ({ label: name, value: id }));

export function createProductFormConfig({
  vendors,
  brands,
  productTypes,
  models,
  variants,
  colors,
  taxes = [],
  cgst = 0,
  sgst = 0,
}: ProductFormOptions): FormFieldConfig[] {
  return [
    { id: "vendorId", name: "vendorId", label: "Vendor", type: "select", required: true, options: toOptions(vendors) },
    { id: "billNumber", name: "billNumber", label: "Vendor Bill / Invoice Number", type: "text", required: true },
    { id: "purchaseDate", name: "purchaseDate", label: "Vendor Invoice Date", type: "date", required: true, defaultValue: new Date().toISOString().slice(0, 10) },
    { id: "paymentTermsDays", name: "paymentTermsDays", label: "Payment Terms (days)", type: "number", min: 0, max: 3650, step: 1, defaultValue: 0 },
    { id: "brandId", name: "brandId", label: "Brand", type: "select", required: true, options: toOptions(brands) },
    {
      id: "productTypeId", name: "productTypeId", label: "Product Type",
      type: "select", required: true,
      dependsOn: "brandId", placeholder: "Select a brand first",
      options: productTypes.map((item) => ({ label: item.name, value: item.id, parentValue: item.brandId })),
      loadOptions: async (brandId) => toOptions(productTypes.filter((item) => !item.brandId || item.brandId === brandId)),
    },
    {
      id: "hsnSac", name: "hsnSac", label: "HSN/SAC Code", type: "text",
      maxLength: 8, pattern: "^(?:[0-9]{4}|[0-9]{6}|[0-9]{8})$",
      description: "Defaults from Product Type; editable for this purchase.",
      computed: {
        dependsOn: ["productTypeId"],
        calculate: (values) => productTypes.find(t => t.id === values.productTypeId)?.hsnSac ?? "",
      },
    },
    {
      id: "productModelId", name: "productModelId", label: "Model",
      type: "select", required: true,
      dependsOn: ["brandId", "productTypeId"], placeholder: "Select a model",
      options: models.map((item) => ({ label: item.name, value: item.id, parentValue: item.productTypeId })),
      loadOptions: async (_parentValue, values) => toOptions(models.filter(
        (item) => Boolean(values.brandId && values.productTypeId)
          && item.brandId === values.brandId && item.productTypeId === values.productTypeId,
      )),
    },
    {
      id: "variantId", name: "variantId", label: "Variant", type: "select",
      required: true, options: toOptions(variants)
    },
    {
      id: "colorId", name: "colorId", label: "Color", type: "select",
      required: true, options: toOptions(colors)
    },
    {
      id: "serialNumber", name: "serialNumber", label: "Serial Number",
      type: "text", required: true
    },
    {
      id: "serialNumber1", name: "serialNumber1", label: "Serial Number 1 (Optional)",
      type: "text", required: false
    },
    {
      id: "taxId", name: "taxId", label: "Tax Profile", type: "select", required: true,
      options: taxProfileOptions(taxes),
      description: "Rate follows the vendor invoice date. Select an explicit zero-tax profile when applicable.",
      computed: { dependsOn: ["productTypeId"], calculate: values => productTypes.find(t => t.id === values.productTypeId)?.defaultTaxId ?? "" },
    },
    {
      id: "purchasePrice", name: "purchasePrice", label: "Purchase Price",
      type: "number", required: true, min: 0, step: 1
    },
    {
      id: "totalAmount", name: "totalAmount", label: "Total Amount (per unit)",
      type: "number", readOnly: true, defaultValue: 0, min: 0,
      step: 1,
      computed: {
        calculate: (values) => {
          const safeNumber = (val: any) => {
            const num = Number(val);
            return isNaN(num) ? 0 : num;
          };

          const purchasePrice = safeNumber(values.purchasePrice);
          const discount = safeNumber(values.discount);
          const cgst = safeNumber(values.cgst);
          const sgst = safeNumber(values.sgst);

          const rawTax = Number(values.tax);
          const taxPercent = (values.tax !== undefined && values.tax !== null && !isNaN(rawTax))
            ? rawTax
            : (cgst + sgst);

          const taxableAmount = Math.max(0, purchasePrice - discount);
          const totalAmount = taxableAmount + taxableAmount * (taxPercent / 100);
          return safeNumber(totalAmount.toFixed(2));
        },
      },
    },
    {
      id: "discount", name: "discount", label: "Discount", type: "number", min: 0,
      step: 1, defaultValue: 0
    },
    {
      id: "cgst", name: "cgst", label: "CGST (%)", type: "number",
      min: 0, step: 0.01, defaultValue: cgst, readOnly: true, computed: { calculate: values => resolveTaxRate(taxes, values.taxId, String(values.purchaseDate ?? ""))?.cgst ?? 0 }
    },
    {
      id: "sgst", name: "sgst", label: "SGST (%)", type: "number",
      min: 0, step: 0.01, defaultValue: sgst, readOnly: true, computed: { calculate: values => resolveTaxRate(taxes, values.taxId, String(values.purchaseDate ?? ""))?.sgst ?? 0 }
    },
    {
      id: "tax", name: "tax", label: "Tax (%)", type: "number", min: 0, step: 1,
      computed: {
        calculate: (values) => {
          const cgst = Number(values.cgst ?? 0);
          const sgst = Number(values.sgst ?? 0);
          return Number(cgst + sgst);
        },
      },
    },
    {
      id: "isActive", name: "isActive", label: "Active Product (Available for Sale)",
      type: "checkbox", defaultValue: true,
    },
  ];
}
