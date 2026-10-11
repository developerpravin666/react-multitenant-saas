import { useLocation } from "react-router-dom";
import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import { saleResource } from "./saleResource";

export function SaleProductFormPage({ mode }: { mode: "create" | "edit" }) {
  const location = useLocation();
  const initialValues = (location.state as { initialValues?: Record<string, unknown> } | null)?.initialValues;
  return <ResourceFormPage {...saleResource} mode={mode} initialValues={initialValues} />;
}
