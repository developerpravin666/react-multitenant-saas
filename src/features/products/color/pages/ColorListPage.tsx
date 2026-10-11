import { ResourceListPage } from "../../../shared/ResourceCrudPages";
import { colorResource } from "./colorResource";

export function ColorListPage() {
  return <ResourceListPage {...colorResource} />;
}
