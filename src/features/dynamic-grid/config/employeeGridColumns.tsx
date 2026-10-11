import { MoreHorizontal } from "lucide-react";
import type { GridColumn } from "../../../types/grid";
import type { EmployeeRow } from "../data/employees";

export const employeeGridColumns: GridColumn<EmployeeRow>[] = [
  {
    id: "id",
    header: "Employee ID",
    accessor: "id",
    sortable: true,
    searchable: true,
    width: 130,
  },
  {
    id: "name",
    header: "Employee",
    accessor: "name",
    sortable: true,
    searchable: true,
    minWidth: 210,
    cell: (_, row) => (
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
          {row.name}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {row.email}
        </p>
      </div>
    ),
  },
  {
    id: "department",
    header: "Department",
    accessor: "department",
    sortable: true,
    filterable: true,
    filterOptions: [
      "Engineering",
      "Finance",
      "Operations",
      "Sales",
      "Product",
      "Support",
    ].map((value) => ({ label: value, value })),
  },
  {
    id: "role",
    header: "Role",
    accessor: "role",
    sortable: true,
    searchable: true,
    minWidth: 170,
  },
  {
    id: "status",
    header: "Status",
    accessor: "status",
    sortable: true,
    filterable: true,
    filterOperator: "equals",
    filterOptions: ["Active", "Invited", "Suspended"].map((value) => ({
      label: value,
      value,
    })),
    cell: (value) => {
      const status = String(value);
      const className =
        status === "Active"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : status === "Invited"
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
      return (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${className}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "location",
    header: "Location",
    accessor: "location",
    sortable: true,
    filterable: true,
  },
  {
    id: "projects",
    header: "Projects",
    accessor: "projects",
    sortable: true,
    searchable: false,
    filterable: true,
    filterOperator: "gte",
    align: "right",
    width: 110,
  },
  {
    id: "lastActive",
    header: "Last active",
    accessor: "lastActive",
    sortable: true,
    searchable: false,
    minWidth: 170,
    cell: (value) =>
      new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(String(value))),
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    searchable: false,
    filterable: false,
    exportable: false,
    align: "center",
    width: 60,
    cell: (_, row) => (
      <button
        type="button"
        aria-label={`Actions for ${row.name}`}
        onClick={(event) => event.stopPropagation()}
        className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </button>
    ),
  },
];
