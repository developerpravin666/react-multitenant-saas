import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { productModelResource } from "./productModelResource";

export function ProductModelFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...productModelResource} mode={mode} />;
}
