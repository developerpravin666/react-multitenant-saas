import { APP_ROUTES } from "../../../../config/routes";
import { createResourceApi } from "../../../shared/resourceApi";
import { apiClient } from "../../../../services/apiClient";
import { saleColumns } from "../config/sale.columns";
import { createSaleFormConfig, type SaleTaxOption } from "../config/sale.form";
import type { CustomerLookupRecord, SaleProductOption, SaleRecord } from "../types/sale.types";

const salesApi = createResourceApi<SaleRecord>("/sales/products");
let saleTaxes: SaleTaxOption[] = [];

function toInvoiceValues(values: Record<string, unknown>) {
  const tax = saleTaxes.find((item) => item.id === values.taxId);
  const factor = 1 + ((tax?.cgst ?? 0) + (tax?.sgst ?? 0)) / 100;
  const discount = Math.round(Number(values.discount || 0) / factor * 100) / 100;
  // The invoice API subtracts discount before adding GST. Convert the final
  // inclusive selling price to its taxable value, then restore the discount.
  const sellingPrice = Math.round(Number(values.sellingPrice || 0) / factor * 100) / 100 + discount;
  return { ...values, sellingPrice, discount };
}

export const saleResource = {
  title: "Product Sales",
  auditTableName: "sales_products",
  description: "Record sold products and customer details.",
  singular: "Sale",
  listPath: APP_ROUTES.sale.products.list,
  addPath: APP_ROUTES.sale.products.add,
  editPath: APP_ROUTES.sale.products.edit,
  afterCreatePath: (record: SaleRecord) => APP_ROUTES.sale.products.payment(record.id),
  columns: saleColumns,
  columnsPerRow: 2 as const,
  loadFields: async (record?: SaleRecord) => {
    const currentSale = record ? `?currentSaleId=${encodeURIComponent(record.id)}` : "";
    const [products, taxes] = await Promise.all([
      apiClient.get<SaleProductOption[]>(`/products/all${currentSale}`),
      apiClient.get<SaleTaxOption[]>("/taxes/all"),
    ]);
    saleTaxes = taxes;
    return createSaleFormConfig(products, async (query) => {
      const params = new URLSearchParams({ search: query, limit: "10" });
      return apiClient.get<CustomerLookupRecord[]>(`/customers?${params}`);
    }, taxes);
  },
  api: {
    ...salesApi,
    getById: async (id: string) => {
      const record = await salesApi.getById(id);
      return {
        ...record, sellingPrice: record.totalAmount ?? record.sellingPrice,
        taxId: record.taxId ?? "00000000-0000-0000-0000-000000000000"
      };
    },
    create: (values: Record<string, unknown>) => salesApi.create(toInvoiceValues(values)),
    update: (id: string, values: Record<string, unknown>) => salesApi.update(id, toInvoiceValues(values)),
  },
};
