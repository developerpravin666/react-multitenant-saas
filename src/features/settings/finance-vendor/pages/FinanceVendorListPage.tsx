import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { financeVendorResource } from "./financeVendorResource";

export function FinanceVendorListPage() {
  return <ResourceListPage {...financeVendorResource} />;
}
