import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { saleResource } from "./saleResource";

export function SaleProductListPage() {
  return <ResourceListPage {...saleResource} />;
}
