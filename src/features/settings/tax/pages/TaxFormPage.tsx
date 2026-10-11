import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { taxResource } from "./taxResource";

export function TaxFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...taxResource} mode={mode} />;
}
