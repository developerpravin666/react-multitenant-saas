import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { productResource } from "../purchase/product/pages/productResource";
import { DynamicForm } from "../dynamic-form/DynamicForm";
import type { FormFieldConfig } from "../../types/form";
import { apiClient } from "../../services/apiClient";
export function OpeningStockFormPage() {
  const navigate = useNavigate(); const [fields,setFields] = useState<FormFieldConfig[] | null>(null); const [error,setError] = useState("");
  useEffect(()=>{void productResource.loadFields().then(setFields).catch(e=>setError(e.message));},[]);
  if(error)return <p role="alert">{error}</p>;if(!fields)return <p>Loading stock form…</p>;
  return <DynamicForm title="Import opening stock" description="Enter one existing stock unit at its historical cost. Its opening inventory journal is posted when you import reconciled opening balances." fields={fields} onCancel={()=>navigate("/accounting/opening-balances")} submitLabel="Import stock unit" onSubmit={async values=>{await apiClient.post("/accounting/opening-stock",{product:values});navigate("/accounting/opening-balances");}}/>;
}
