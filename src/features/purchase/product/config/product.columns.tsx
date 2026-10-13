import { useState } from "react";
import type { GridColumn } from "../../../../types/grid";
import type { Product } from "../types/product.types";
import { apiClient } from "../../../../services/apiClient";
import { Check, Power } from "lucide-react";

function ProductStatusCell({ row }: { row: Product }) {
  const [isActive, setIsActive] = useState(row.isActive);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (row.isSold || isUpdating) return;

    setIsUpdating(true);
    const nextActive = !isActive;
    try {
      if (nextActive) {
        await apiClient.post(`/products/${row.id}/activate`, {});
      } else {
        await apiClient.post(`/products/${row.id}/deactivate`, {});
      }
      setIsActive(nextActive);
      row.isActive = nextActive;
    } catch {
      // Revert if error
    } finally {
      setIsUpdating(false);
    }
  };

  if (row.isSold) {
    return (
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
        Sold
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${isActive
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}
      >
        {isActive ? "Available" : "Inactive"}
      </span>

      <button
        type="button"
        disabled={isUpdating}
        onClick={toggleActive}
        title={isActive ? "Click to Deactivate Product" : "Click to Activate Product"}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold shadow-2xs transition cursor-pointer ${isActive
            ? "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
            : "border border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-500"
          } ${isUpdating ? "opacity-50" : ""}`}
      >
        {isActive ? (
          <>
            <Check className="size-2.5" />
            <span>Active</span>
          </>
        ) : (
          <>
            <Power className="size-2.5" />
            <span>Activate</span>
          </>
        )}
      </button>
    </div>
  );
}

export const productColumns: GridColumn<Product>[] = [
  { id: "hsnSac", accessor: "hsnSac", header: "HSN/SAC", sortable: true, cell: (_, row) => row.hsnSac || "-" },
  {
    id: "vendorName",
    header: "Vendor",
    accessor: "vendorName",
    searchable: true,
    sortable: true,
    hidden: true,
  },
  {
    id: "productTypeName",
    header: "Type",
    accessor: "productTypeName",
    searchable: true,
    sortable: true,
    hidden: true,
  },
  {
    id: "productModelName",
    header: "Model",
    accessor: "productModelName",
    searchable: true,
  },
  {
    id: "variantName",
    header: "Variant",
    accessor: "variantName",
    searchable: true,
  },
  {
    id: "colorName",
    header: "Color",
    accessor: "colorName",
    searchable: true,
  },
  {
    id: "serialNumber",
    header: "Serial Number",
    accessor: "serialNumber",
    searchable: true,
  },
  {
    id: "serialNumber1",
    header: "Serial Number 1",
    accessor: "serialNumber1",
    searchable: true,
  },
  {
    id: "purchasePrice",
    header: "Purchase Price",
    accessor: "purchasePrice",
    align: "right",
    isAmount: true,
    sortable: true,
    editable: true,
    editor: "number",
    cell: (_, row) =>
      `₹${row.purchasePrice?.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })}`,
  },
  {
    id: "totalAmount",
    header: "Total Amount",
    accessor: "totalAmount",
    align: "right",
    isAmount: true,
    sortable: true,
    cell: (_, row) =>
      `₹${row.totalAmount?.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
  },
  {
    id: "discount",
    header: "Discount",
    accessor: "discount",
    align: "right",
    isAmount: true,
    editable: true,
    editor: "number",
    hidden: true,
  },
  {
    id: "tax",
    header: "Tax %",
    accessor: "tax",
    editable: true,
    editor: "number",
    hidden: true,
  },
  {
    id: "cgst",
    header: "CGST %",
    accessor: "cgst",
    editable: true,
    editor: "number",
    hidden: true,
  },
  {
    id: "sgst",
    header: "SGST %",
    accessor: "sgst",
    editable: true,
    editor: "number",
    hidden: true,
  },
  {
    id: "isSold",
    header: "Status & Activation",
    accessor: "isSold",
    cell: (_, row) => <ProductStatusCell row={row} />,
  },
];
