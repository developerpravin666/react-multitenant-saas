import { APP_ROUTES } from "../../../../config/routes";
import { taxColumns } from "../config/tax.columns";
import { taxFormConfig } from "../config/tax.form";
import type { TaxRate } from "../types/tax.types";
import { createResourceApi } from "../../../shared/resourceApi";

import { taxProfileOptions } from "../taxProfiles";
const taxesApi = createResourceApi<TaxRate>("/taxes");
const taxVersionsApi = createResourceApi<TaxRate>("/taxes/all");
export const taxResource = {
  title: "Tax",
  description: "Maintain dated GST rate versions. Add a new version to change a slab; issued documents retain their saved rates.",
  singular: "Tax Rate",
  auditTableName: "taxes",
  listPath: APP_ROUTES.settings.tax.list,
  addPath: APP_ROUTES.settings.tax.add,
  editPath: APP_ROUTES.settings.tax.edit,
  columns: taxColumns,
  loadFields: async (record?: TaxRate) => {
    const rates = await taxVersionsApi.list();
    const fields = record ? taxFormConfig.map(field => ["cgst", "sgst", "effectiveFrom", "treatment"].includes(field.name) ? { ...field, readOnly: true, disabled: field.type === "select" } : field) : taxFormConfig;
    return record ? fields : [
      { id: "profileId", name: "profileId", label: "Existing Tax Profile", type: "select" as const, description: "Leave empty for a new profile. Choose a profile to schedule its next rate.", options: taxProfileOptions(rates) },
      ...fields,
    ];
  },
  api: { ...taxesApi, create: (values: Record<string, unknown>) => taxesApi.create({ ...values, profileId: values.profileId || null }) },
};
