import type { FormFieldConfig } from "../../../types/form";
import type { GridColumn } from "../../../types/grid";
import { APP_ROUTES } from "../../../config/routes";
import { createResourceApi } from "../../shared/resourceApi";
import type { CustomerRecord } from "./customer.types";

export const customerApi = createResourceApi<CustomerRecord>("/customers");

export const customerFields: FormFieldConfig[] = [
  { id: "name", name: "name", label: "Customer name", type: "text", required: true, placeholder: "Full name" },
  { id: "mobile", name: "mobile", label: "Mobile number", type: "tel", required: true, placeholder: "Mobile number" },
  { id: "email", name: "email", label: "Email", type: "email", placeholder: "Optional email address" },
  { id: "address", name: "address", label: "Address", type: "textarea", required: true, placeholder: "Customer address" },
];

export const customerColumns: GridColumn<CustomerRecord>[] = [
  { id: "name", header: "Customer", accessor: "name", searchable: true, sortable: true },
  { id: "mobile", header: "Mobile", accessor: "mobile", searchable: true, sortable: true },
  { id: "email", header: "Email", accessor: "email", searchable: true },
  { id: "address", header: "Address", accessor: "address", hidden: true },
  { id: "salesCount", header: "Sales", accessor: "salesCount", sortable: true, align: "right" },
];

export const customerResource = {
  title: "Customers",
  auditTableName: "customers",
  description: "Manage customers, including people who have only made an enquiry.",
  singular: "Customer",
  listPath: APP_ROUTES.sale.customers.list,
  addPath: APP_ROUTES.sale.customers.add,
  editPath: APP_ROUTES.sale.customers.edit,
  columns: customerColumns,
  fields: customerFields,
  columnsPerRow: 2 as const,
  api: customerApi,
};
