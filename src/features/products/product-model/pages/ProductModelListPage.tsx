import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { productModelResource } from "./productModelResource";

export function ProductModelListPage() {
  return <ResourceListPage {...productModelResource} />;
}
