import { vendorColumns } from "../config/vendor.columns";
import { vendorFormConfig } from "../config/vendor.form";
import type { Vendor } from "../types/vendor.types";
import { createResourceApi } from "../../../shared/resourceApi";

export const vendorResource = {
  title: "Vendors",
  description: "Manage product vendors and suppliers.",
  singular: "Vendor",
  auditTableName: "vendors",
  listPath: "/products/vendors/list",
  addPath: "/products/vendors/add",
  editPath: (id: string) => `/products/vendors/${id}/edit`,
  columns: vendorColumns,
  fields: vendorFormConfig,
  api: createResourceApi<Vendor>("/vendors"),
};
