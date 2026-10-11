import { ResourceFormPage } from "../../shared/ResourceCrudPages";
import { customerResource } from "./customerResource";

export function CustomerFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...customerResource} mode={mode} />;
}
