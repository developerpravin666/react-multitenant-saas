import { apiClient, type PagedData } from "../../../../services/apiClient";
import type { GridServerSource } from "../../../../types/grid";
import type { AvailableStockProduct, StockGroup } from "../types/stock.types";

function createPagedSource<T>(endpoint: (query: URLSearchParams) => string): GridServerSource<T> {
  return {
    async load(query, signal) {
      const params = new URLSearchParams({
        page: String(query.pageIndex + 1),
        pageSize: String(query.pageSize),
        search: query.search,
      });
      const sort = query.sort[0];
      if (sort) {
        params.set("sortBy", query.sort.map((item) => item.field).join(","));
        params.set("sortDirection", query.sort.map((item) => item.direction).join(","));
      }
      const result = await apiClient.get<PagedData<T>>(endpoint(params), { signal });
      return {
        rows: result.items,
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    },
  };
}

export const stockGroupSource = createPagedSource<StockGroup>((params) => `/inventory/stock?${params}`);

export function availableProductsSource(brandId: string, productModelId: string, variantId: string) {
  return createPagedSource<AvailableStockProduct>((params) => {
    params.set("brandId", brandId);
    params.set("productModelId", productModelId);
    params.set("variantId", variantId);
    return `/inventory/stock/products?${params}`;
  });
}
