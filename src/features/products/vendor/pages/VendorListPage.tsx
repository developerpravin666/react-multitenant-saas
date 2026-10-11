import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { vendorResource } from "./vendorResource";

export function VendorListPage() {
  return <ResourceListPage {...vendorResource} />;
}
