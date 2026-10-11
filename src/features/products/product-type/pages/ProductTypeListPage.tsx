import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { productTypeResource } from "./productTypeResource";

export function ProductTypeListPage() {
  return <ResourceListPage {...productTypeResource} />;
}
