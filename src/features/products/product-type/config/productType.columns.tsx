import { createNamedMasterColumns } from "../../shared/masterColumns";
import type { GridColumn } from "../../../../types/grid";
import { ProductType } from "../types/productType.types";

export const productTypeColumns: GridColumn<ProductType>[] = [
  ...createNamedMasterColumns<ProductType>(),
  { id: "hsnSac", accessor: "hsnSac", header: "Default HSN/SAC", sortable: true, cell: (_, row) => row.hsnSac || "-" },
];
