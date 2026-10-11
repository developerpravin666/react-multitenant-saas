import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { brandResource } from "./brandResource";

export function BrandFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...brandResource} mode={mode} />;
}
