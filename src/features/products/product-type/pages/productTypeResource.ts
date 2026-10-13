import { productTypeColumns } from "../config/productType.columns";
import type { ProductType } from "../types/productType.types";
import { createResourceApi } from "../../../shared/resourceApi";
import { createProductTypeFormConfig } from "../config/productType.form";

import type { TaxRate } from "../../../settings/tax/types/tax.types";
import { taxProfileOptions } from "../../../settings/tax/taxProfiles";
const productTypesApi = createResourceApi<ProductType>("/product-types");

export const productTypeResource = {
  title: "Product Types", description: "Manage product classifications.", singular: "Product Type",
  auditTableName: "product_types",
  listPath: "/products/types/list",
  addPath: "/products/types/add",
  editPath: (id: string) => `/products/types/${id}/edit`,
  columns: productTypeColumns,
  loadFields: async () => [...createProductTypeFormConfig, {
    id: "defaultTaxId", name: "defaultTaxId", label: "Default Tax Profile", type: "select" as const,
    description: "The applicable rate is resolved on each transaction date.",
    options: taxProfileOptions(await createResourceApi<TaxRate>("/taxes/all").list()),
  }],
  api: { ...productTypesApi, create: (values: Record<string, unknown>) => productTypesApi.create({ ...values, defaultTaxId: values.defaultTaxId || null }), update: (id: string, values: Record<string, unknown>) => productTypesApi.update(id, { ...values, defaultTaxId: values.defaultTaxId || null }), getById: async (id: string) => {
    const productType = await productTypesApi.getById(id);
    return { ...productType, hsnSac: productType.hsnSac ?? "", defaultTaxId: productType.defaultTaxId ?? "" };
  } },
};
