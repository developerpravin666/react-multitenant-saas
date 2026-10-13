import { productColumns } from "../config/product.columns";
import { createProductFormConfig } from "../config/product.form";
import type { Product } from "../types/product.types";
import { createResourceApi, type ResourceRecord } from "../../../shared/resourceApi";
import type { TaxRate } from "../../../settings/tax/types/tax.types";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";

export type ProductLookupRecord = ResourceRecord & {
  name: string;
  brandId?: string;
  productTypeId?: string;
  hsnSac?: string | null;
  gstNumber?: string;
  code?: string;
};
const vendorsApi = createResourceApi<ProductLookupRecord>("/vendors/all");
const brandsApi = createResourceApi<ProductLookupRecord>("/brands/all");
const typesApi = createResourceApi<ProductLookupRecord>("/product-types/all");
const modelsApi = createResourceApi<ProductLookupRecord>("/product-models/all");
const variantsApi = createResourceApi<ProductLookupRecord>("/variants/all");
const colorsApi = createResourceApi<ProductLookupRecord>("/colors/all");
const taxRatesApi = createResourceApi<TaxRate>("/taxes/all");
const productsApi = createResourceApi<Product>("/products");

export async function getCurrentTaxRates() {
  const taxRates = await taxRatesApi.list(true);
  const activeTax = taxRates.find((taxRate) => taxRate.isActive) ?? taxRates[0];
  return { cgst: activeTax?.cgst ?? 0, sgst: activeTax?.sgst ?? 0 };
}

export interface ProductLookupsData {
  vendors: ProductLookupRecord[];
  brands: ProductLookupRecord[];
  productTypes: ProductLookupRecord[];
  models: ProductLookupRecord[];
  variants: ProductLookupRecord[];
  colors: ProductLookupRecord[];
  taxRates: { cgst: number; sgst: number };
}

export async function loadProductLookups(): Promise<ProductLookupsData> {
  const [vendors, brands, productTypes, models, variants, colors, taxRates] = await Promise.all([
    vendorsApi.list(),
    brandsApi.list(),
    typesApi.list(),
    modelsApi.list(),
    variantsApi.list(),
    colorsApi.list(),
    getCurrentTaxRates(),
  ]);
  return { vendors, brands, productTypes, models, variants, colors, taxRates };
}

export const productResource = {
  title: "Products", description: "Manage inventory products, variants, pricing and stock.", singular: "Product",
  auditTableName: "products",
  listPath: APP_ROUTES.purchase.products.list,
  addPath: APP_ROUTES.purchase.products.add,
  bulkUpdatePath: APP_ROUTES.purchase.products.bulkUpdate,
  editPath: APP_ROUTES.purchase.products.edit, columns: productColumns,
  columnsPerRow: 3 as const,
  loadFields: async () => {
    const lookups = await loadProductLookups();
    const fields = createProductFormConfig({
      vendors: lookups.vendors,
      brands: lookups.brands,
      productTypes: lookups.productTypes,
      models: lookups.models,
      variants: lookups.variants,
      colors: lookups.colors,
      ...lookups.taxRates,
    });
    return fields;
  },
  api: {
    ...productsApi,
    bulkUpdate: async (products: Record<string, unknown>[]) =>
      apiClient.put<Product[]>("/products/bulk", { products }),
    create: async (values: Record<string, unknown>) => {
      const serialPairs = values.serialPairs as { serialNumber: string; serialNumber1: string }[];
      if (!serialPairs?.length || serialPairs.length > 500)
        throw new Error("Add between 1 and 500 product units.");
      const normalizedSerials = serialPairs.flatMap(({ serialNumber, serialNumber1 }) => [serialNumber, serialNumber1])
        .map((serial) => serial.trim().toLocaleLowerCase());
      if (normalizedSerials.some((serial) => !serial))
        throw new Error("Enter both serial numbers for every unit.");
      if (new Set(normalizedSerials).size !== normalizedSerials.length)
        throw new Error("Serial Number and Serial Number 1 must all be unique.");

      const { serialPairs: _serialPairs, ...shared } = values;
      const products = serialPairs.map(({ serialNumber, serialNumber1 }) => ({
        ...shared,
        serialNumber: serialNumber.trim(),
        serialNumber1: serialNumber1.trim(),
      }));
      const created = await apiClient.post<Product[]>("/products/bulk", { products });
      const firstCreated = created[0];
      if (!firstCreated) throw new Error("No products were returned after saving the purchase.");
      return firstCreated;
    },
    getById: async (id: string) => {
      const [product, taxRates] = await Promise.all([
        productsApi.getById(id),
        getCurrentTaxRates(),
      ]);
      return { ...taxRates, ...product, hsnSac: product.hsnSac ?? "" };
    },
  },
};
