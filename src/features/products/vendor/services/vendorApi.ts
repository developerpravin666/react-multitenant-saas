import { apiClient } from "../../../../services/apiClient";
import type { Vendor } from "../types/vendor.types";

export type SaveVendorInput = Omit<
  Vendor,
  "isDelete" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
>;

type VendorListResponse =
  | Vendor[]
  | { items?: Vendor[]; rows?: Vendor[]; data?: Vendor[] };

let cachedVendors: Vendor[] | undefined;
let pendingVendors: Promise<Vendor[]> | undefined;

function getVendorRows(response: VendorListResponse): Vendor[] {
  if (Array.isArray(response)) return response;
  const rows = response.items ?? response.rows ?? response.data;
  if (Array.isArray(rows)) return rows;
  throw new Error("The vendors API returned an unsupported list response.");
}

export const vendorApi = {
  list: () => {
    if (cachedVendors) return Promise.resolve(cachedVendors);
    if (pendingVendors) return pendingVendors;
    pendingVendors = apiClient
      .get<VendorListResponse>("/vendors")
      .then(getVendorRows)
      .then((vendors) => {
        cachedVendors = vendors;
        return vendors;
      })
      .finally(() => {
        pendingVendors = undefined;
      });
    return pendingVendors;
  },
  getById: (id: string) =>
    apiClient.get<Vendor>(`/vendors/${encodeURIComponent(id)}`),
  create: async (vendor: SaveVendorInput) => {
    const saved = await apiClient.post<Vendor>("/vendors", vendor);
    cachedVendors = undefined;
    return saved;
  },
  update: async (id: string, vendor: SaveVendorInput) => {
    const saved = await apiClient.put<Vendor>(
      `/vendors/${encodeURIComponent(id)}`,
      vendor,
    );
    cachedVendors = undefined;
    return saved;
  },
};
