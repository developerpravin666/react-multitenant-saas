import type { GridColumn } from "../../../../types/grid";
import type { FinanceVendor } from "../types/financeVendor.types";

export const financeVendorColumns: GridColumn<FinanceVendor>[] = [
  { id: "name", header: "Name", accessorKey: "name", sortable: true, searchable: true },
  { id: "code", header: "Code", accessorKey: "code", sortable: true, searchable: true },
  { id: "mobile", header: "Mobile", accessorKey: "mobile", sortable: true, searchable: true },
  { id: "email", header: "Email", accessorKey: "email", sortable: true, searchable: true },
  { id: "contactName", header: "Contact Name", accessorKey: "contactName", sortable: true, searchable: true },
  { id: "contactMobile", header: "Contact Mobile", accessorKey: "contactMobile", searchable: true },
  { id: "description", header: "Description", accessorKey: "description", searchable: true, hidden: true },
  {
    id: "isActive",
    header: "Status",
    accessorKey: "isActive",
    sortable: true,
    cell: (_, row) => (
      <span className={row.isActive
        ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"}>
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];
