import type { GridColumn } from "../../../../types/grid";

import type { Vendor } from "../types/vendor.types";

export const vendorColumns: GridColumn<Vendor>[] = [
  {
    id: "name",
    header: "Name",
    accessorKey: "name",
    sortable: true,
    searchable: true,
    editable: true,
  },
  {
    id: "code",
    header: "Code",
    accessorKey: "code",
    sortable: true,
    searchable: true,
    editable: true,
  },
  {
    id: "mobile",
    header: "Mobile",
    accessorKey: "mobile",
    sortable: true,
    searchable: true,
    editable: true,
  },
  {
    id: "email",
    header: "Email",
    accessorKey: "email",
    sortable: true,
    searchable: true,
    editable: true,
  },
  {
    id: "address",
    header: "Address",
    accessorKey: "address",
    searchable: true,
    editable: true,
    hidden: true
  },
  {
    id: "description",
    header: "Description",
    accessorKey: "description",
    searchable: true,
    editable: true,
    hidden: true
  },
  {
    id: "isActive",
    header: "Status",
    accessorKey: "isActive",
    sortable: true,
    cell: (_, row) => (
      <span
        className={[
          "rounded-full px-2.5 py-1",
          "text-xs font-medium",

          row.isActive
            ? `
               bg-emerald-50
               text-emerald-700
               dark:bg-emerald-950/40
               dark:text-emerald-300
              `
            : `
               bg-slate-100
               text-slate-600
               dark:bg-slate-800
               dark:text-slate-300
              `,
        ].join(" ")}
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  // {
  //   id: "createdAt",
  //   header: "Created At",
  //   accessorKey: "createdAt",
  //   sortable: true,
  //   searchable: true,
  //   editable: true,
  //   hidden: true
  // },
  // {
  //   id: "createdBy",
  //   header: "Created By",
  //   accessorKey: "createdBy",
  //   sortable: true,
  //   searchable: true,
  //   editable: true,
  //   hidden: true
  // },
  // {
  //   id: "updatedAt",
  //   header: "Updated At",
  //   accessorKey: "updatedAt",
  //   sortable: true,
  //   searchable: true,
  //   editable: true,
  //   hidden: true
  // },
  // {
  //   id: "updatedBy",
  //   header: "Updated By",
  //   accessorKey: "updatedBy",
  //   sortable: true,
  //   searchable: true,
  //   editable: true,
  //   hidden: true
  // },
];
