import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { vendorResource } from "./vendorResource";

export function VendorFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...vendorResource} mode={mode} />;
}
