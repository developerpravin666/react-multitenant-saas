import { APP_ROUTES } from "../../../../config/routes";
import { createResourceApi } from "../../../shared/resourceApi";
import { financeVendorColumns } from "../config/financeVendor.columns";
import { financeVendorFormConfig } from "../config/financeVendor.form";
import type { FinanceVendor } from "../types/financeVendor.types";

export const financeVendorResource = {
  title: "Finance Vendors",
  description: "Manage finance vendors and their contact details.",
  singular: "Finance Vendor",
  auditTableName: "finance_vendors",
  listPath: APP_ROUTES.settings.financeVendors.list,
  addPath: APP_ROUTES.settings.financeVendors.add,
  editPath: APP_ROUTES.settings.financeVendors.edit,
  columns: financeVendorColumns,
  fields: financeVendorFormConfig,
  api: createResourceApi<FinanceVendor>("/finance-vendors"),
};
