import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { variantResource } from "./variantResource";

export function VariantListPage() {
  return <ResourceListPage {...variantResource} />;
}
