import { variantColumns } from "../config/variant.columns";
import { variantFormConfig } from "../config/variant.form";
import type { ProductVariant } from "../types/variant.types";
import { createResourceApi } from "../../../shared/resourceApi";

export const variantResource = {
  title: "Variants",
  description: "Manage product variants.",
  singular: "Variant",
  auditTableName: "variants",
  listPath: "/products/variants/list",
  addPath: "/products/variants/add",
  editPath: (id: string) => `/products/variants/${id}/edit`,
  columns: variantColumns,
  fields: variantFormConfig,
  api: createResourceApi<ProductVariant>("/variants"),
};
