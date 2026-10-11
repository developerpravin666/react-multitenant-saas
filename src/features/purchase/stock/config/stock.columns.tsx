import type { GridColumn } from "../../../../types/grid";
import type { StockGroup } from "../types/stock.types";

const currency = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const stockColumns: GridColumn<StockGroup>[] = [
  {
    id: "brandName", header: "Brand", accessor: "brandName", searchable: true, sortable: true
  },
  {
    id: "modelName", header: "Model", accessor: "modelName", searchable: true, sortable: true
  },
  {
    id: "variantName", header: "Variant", accessor: "variantName", searchable: true, sortable: true
  },
  {
    id: "totalQuantity", header: "Available Quantity", accessor: "totalQuantity",
    sortable: true, align: "right"
  },
  {
    id: "totalProductCost",
    header: "Total Product Cost",
    accessor: "totalProductCost",
    sortable: true,
    align: "right",
    isAmount: true,
    cell: (_, row) => currency(row.totalProductCost),
  },
];
