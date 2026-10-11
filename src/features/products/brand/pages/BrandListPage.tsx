import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { brandResource } from "./brandResource";

export function BrandListPage() {
  return <ResourceListPage {...brandResource} />;
}
