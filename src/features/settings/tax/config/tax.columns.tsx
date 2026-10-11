import type { GridColumn } from "../../../../types/grid";
import type { TaxRate } from "../types/tax.types";

export const taxColumns: GridColumn<TaxRate>[] = [
  { id: "cgst", header: "CGST (%)", accessor: "cgst", sortable: true },
  { id: "sgst", header: "SGST (%)", accessor: "sgst", sortable: true },
  { id: "totalTax", header: "Total Tax (%)", accessor: "totalTax", sortable: true },
  {
    id: "isActive",
    header: "Status",
    accessor: "isActive",
    sortable: true,
    cell: (_, row) => (
      <span className={row.isActive
        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
        : "rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"}>
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];
