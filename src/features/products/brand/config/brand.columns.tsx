import type { GridColumn } from "../../../../types/grid";

import type { Brand } from "../types/brand.types";

export const brandColumns: GridColumn<Brand>[] = [
  {
    id: "name",
    header: "Brand",
    accessorKey: "name",
    searchable: true,
    sortable: true,
    editable: true,
  },
  {
    id: "description",
    header: "Description",
    accessorKey: "description",
    editable: true,
    editor: "textarea",
  },
  {
    id: "isActive",
    header: "Status",
    accessorKey: "isActive",

    cell: (_, row) => (
      <span
        className={
          row.isActive
            ? `
              rounded-full
              bg-emerald-100
              px-2.5
              py-1
              text-xs
              font-semibold
              text-emerald-700

              dark:bg-emerald-900/30
              dark:text-emerald-300
            `
            : `
              rounded-full
              bg-slate-100
              px-2.5
              py-1
              text-xs
              text-slate-600

              dark:bg-slate-800
              dark:text-slate-300
            `
        }
      >
        {row.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
];
