import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { variantResource } from "./variantResource";

export function VariantFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...variantResource} mode={mode} />;
}
