import { APP_ROUTES } from "../../../../config/routes";
import { taxColumns } from "../config/tax.columns";
import { taxFormConfig } from "../config/tax.form";
import type { TaxRate } from "../types/tax.types";
import { createResourceApi } from "../../../shared/resourceApi";

export const taxResource = {
  title: "Tax",
  description: "Manage CGST and SGST rates.",
  singular: "Tax Rate",
  auditTableName: "taxes",
  listPath: APP_ROUTES.settings.tax.list,
  addPath: APP_ROUTES.settings.tax.add,
  editPath: APP_ROUTES.settings.tax.edit,
  columns: taxColumns,
  fields: taxFormConfig,
  api: createResourceApi<TaxRate>("/taxes"),
};
