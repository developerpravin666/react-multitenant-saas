import type { GridColumn } from "../../../types/grid";

interface NamedMaster {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export function createNamedMasterColumns<
  T extends NamedMaster,
>(): GridColumn<T>[] {
  return [
    {
      id: "name",
      header: "Name",
      accessor: "name",
      searchable: true,
      sortable: true,
      editable: true,
    },
    {
      id: "description",
      header: "Description",
      accessor: "description",
      searchable: true,
      editable: true,
      editor: "textarea",
    },
    {
      id: "isActive",
      header: "Status",
      accessorKey: "isActive",
      sortable: true,
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
                font-medium
                text-emerald-700
              `
              : `
                rounded-full
                bg-slate-100
                px-2.5
                py-1
                text-xs
                text-slate-600
              `
          }
        >
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];
}
