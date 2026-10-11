import { createResourceApi } from "../../../shared/resourceApi";
import { colorColumns } from "../config/color.columns";
import { colorFormConfig } from "../config/color.form";
import type { ProductColor } from "../types/color.types";

export const colorResource = {
  title: "Colors",
  description: "Manage product colors.",
  singular: "Color",
  auditTableName: "colors",
  listPath: "/products/colors/list",
  addPath: "/products/colors/add",
  editPath: (id: string) => `/products/colors/${id}/edit`,
  columns: colorColumns,
  fields: colorFormConfig,
  api: createResourceApi<ProductColor>("/colors"),
};
