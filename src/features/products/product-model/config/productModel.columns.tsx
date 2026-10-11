// import { createNamedMasterColumns } from "../../shared/masterColumns";
import type { ProductModel } from "../types/productModel.types";

// export const productModelColumns = createNamedMasterColumns<ProductModel>();
import type { GridColumn } from "../../../../types/grid";


export const productModelColumns: GridColumn<ProductModel>[] = [
    {
        id: "brandName",
        header: "Brand Name",
        accessorKey: "brandName",
        sortable: true,
        searchable: true,
        editable: true,
    },
    {
        id: "productTypeName",
        header: "Product Type",
        accessorKey: "productTypeName",
        sortable: true,
        searchable: true,
        editable: true,
    }, {
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
    }
];
