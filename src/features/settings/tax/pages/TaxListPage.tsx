import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { taxResource } from "./taxResource";

export function TaxListPage() {
  return <ResourceListPage {...taxResource} />;
}
