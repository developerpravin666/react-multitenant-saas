import type { AutocompleteOption, FormFieldConfig, SelectOption } from "../../../../types/form";
import type { CustomerLookupRecord, SaleProductOption } from "../types/sale.types";

export interface SaleTaxOption {
  id: string;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export function createSaleFormConfig(
  products: SaleProductOption[],
  searchCustomers: (query: string) => Promise<CustomerLookupRecord[]>,
  taxes: SaleTaxOption[],
): FormFieldConfig[] {
  const options: SelectOption[] = products.map((product) => {
    const serial = product.serialNumber || product.serialNumber1;
    return {
      value: product.id,
      label: serial ? `${product.brand} - ${product.productModel} - ${product.variant} - ${product.color} — ${serial}` : product.brand,
    };
  });

  return [
    {
      id: "productId",
      name: "productId",
      label: "Product (name or serial number)",
      type: "select",
      required: true,
      options,
      placeholder: "Search product name or serial number",
      colSpan: "full",
    },
    {
      id: "customerName",
      name: "customerName",
      label: "Customer Name or Mobile",
      type: "autocomplete",
      placeholder: "Search by customer name or mobile number",
      colSpan: "full",
      required: true,
      selectionValueField: "name",
      searchOptions: async (query): Promise<AutocompleteOption[]> =>
        (await searchCustomers(query)).map((customer) => ({
          id: customer.id,
          label: customer.name,
          description: customer.mobile,
          data: {
            name: customer.name,
            mobile: customer.mobile,
            address: customer.address,
            email: customer.email,
          },
        })),
      populateFields: {
        customerMobile: "mobile",
        customerAddress: "address",
        customerEmail: "email",
      },
    },
    {
      id: "customerMobile",
      name: "customerMobile",
      label: "Mobile Number",
      type: "tel",
      required: true,
    },
    {
      id: "customerEmail",
      name: "customerEmail",
      label: "Email (optional)",
      type: "email",
    },
    {
      id: "customerAddress",
      name: "customerAddress",
      label: "Address",
      type: "textarea",
      required: true,
      colSpan: "full",
    },
    {
      id: "saleDate",
      name: "saleDate",
      label: "Sale Date",
      type: "date",
      required: true,
      defaultValue: new Date().toISOString().slice(0, 10),
    },
    { id: "paymentTermsDays", name: "paymentTermsDays", label: "Payment Terms (days)", type: "number", min: 0, max: 3650, step: 1, defaultValue: 0 },

    {
      id: "productPrice",
      name: "productPrice",
      label: "Purchase Price (including GST)",
      type: "number",
      required: true,
      min: 0,
      step: 0.01,
      readOnly: true,
      computed: {
        calculate: (values) => {
          const product = products.find(
            (item) => item.id === String(values.productId ?? ""),
          );
          return product?.totalAmount ?? 0;
        },
      },
    },
    {
      id: "sellingPrice",
      name: "sellingPrice",
      label: "Selling Price (including GST)",
      type: "number",
      required: true,
      min: 0,
      step: 0.01,
      computed: {
        dependsOn: ["productId"],
        calculate: (values) => {
          const product = products.find(
            (item) => item.id === String(values.productId ?? ""),
          );
          return product?.totalAmount ?? 0;
        },
      },
    },
    {
      id: "taxId",
      name: "taxId",
      label: "GST rate",
      type: "select",
      required: true,
      computed: {
        dependsOn: ["productId"],
        calculate: (values) => {
          const product = products.find((item) => item.id === String(values.productId ?? ""));
          return taxes.find((tax) => tax.cgst === product?.cgst && tax.sgst === product?.sgst)?.id
            ?? "00000000-0000-0000-0000-000000000000";
        },
      },
      options: [
        { value: "00000000-0000-0000-0000-000000000000", label: "No GST" },
        ...taxes.map((tax) => ({ value: tax.id, label: `CGST ${tax.cgst}% + SGST ${tax.sgst}%` })),
      ],
    },
    {
      id: "discount",
      name: "discount",
      label: "Discount (including GST)",
      type: "number",
      required: true,
      min: 0,
      step: 0.01,
      readOnly: true,
      computed: {
        calculate: (values) => {
          const product = products.find((item) => item.id === String(values.productId ?? ""));
          return Math.round(Math.max(0, (product?.totalAmount ?? 0) - Number(values.sellingPrice || 0)) * 100) / 100;
        },
      },
    },
  ];
}
