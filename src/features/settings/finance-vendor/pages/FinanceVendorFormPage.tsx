import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { financeVendorResource } from "./financeVendorResource";

export function FinanceVendorFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...financeVendorResource} mode={mode} />;
}
