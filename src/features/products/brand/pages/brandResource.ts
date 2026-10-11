import { brandColumns } from "../config/brand.columns";
import type { Brand } from "../types/brand.types";
import { createResourceApi, type ResourceRecord } from "../../../shared/resourceApi";
import { brandFormConfig } from "../config/brand.form";

export const brandResource = {
  title: "Brands",
  description: "Manage product brands.",
  singular: "Brand",
  auditTableName: "brands",
  listPath: "/products/brands/list",
  addPath: "/products/brands/add",
  editPath: (id: string) => `/products/brands/${id}/edit`,
  columns: brandColumns,
  fields: brandFormConfig,
  api: createResourceApi<Brand>("/brands"),
};
