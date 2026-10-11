import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { colorResource } from "./colorResource";

export function ColorFormPage({ mode }: { mode: "create" | "edit" }) {
  return <ResourceFormPage {...colorResource} mode={mode} />;
}
