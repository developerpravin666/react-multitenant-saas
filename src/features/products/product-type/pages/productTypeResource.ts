import { productTypeColumns } from "../config/productType.columns";
import type { ProductType } from "../types/productType.types";
import { createResourceApi } from "../../../shared/resourceApi";
import { createProductTypeFormConfig } from "../config/productType.form";

const productTypesApi = createResourceApi<ProductType>("/product-types");

export const productTypeResource = {
  title: "Product Types", description: "Manage product classifications.", singular: "Product Type",
  auditTableName: "product_types",
  listPath: "/products/types/list",
  addPath: "/products/types/add",
  editPath: (id: string) => `/products/types/${id}/edit`,
  columns: productTypeColumns,
  fields: createProductTypeFormConfig,
  api: { ...productTypesApi, getById: async (id: string) => {
    const productType = await productTypesApi.getById(id);
    return { ...productType, hsnSac: productType.hsnSac ?? "" };
  } },
};
