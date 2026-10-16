import { BaseMaster } from "../../../shared/master.types";


export interface Product extends BaseMaster {
  taxId?: string | null;
  taxTreatment?: string;
  hsnSac?: string | null;
  vendorId: string;
  vendorName?: string;
  billNumber?: string | null;
  purchaseDate: string;
  paymentTermsDays: number;
  dueDate: string;
  brandId: string;
  brandName?: string;
  productTypeId: string;
  productTypeName?: string;
  // categoryId: string;
  // categoryName?: string;
  productModelId: string;
  productModelName?: string;
  variantId: string;
  variantName?: string;
  colorId: string;
  colorName?: string;
  // code: string;
  uniqueNumber: string;
  uniqueNumber1: string;
  serialNumber1?: string | null;
  serialNumber: string;
  isSold: boolean;
  purchasePrice: number;
  totalAmount: number;
  discount: number;
  cgst: number;
  sgst: number;
  tax: number;
  description: string;
}
