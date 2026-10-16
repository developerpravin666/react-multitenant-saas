import { apiClient } from "../../../../services/apiClient";
import type { ExtractedPurchaseBill, ExtractedBillItem } from "../types/purchaseBillScanner.types";

export interface LookupItem {
  id: string;
  name: string;
  code?: string;
  gstNumber?: string;
  brandId?: string;
  productTypeId?: string;
  description?: string;
  mobile?: string;
  email?: string;
  address?: string;
}

export interface DetectedEntity {
  tempId: string;
  isNew: boolean;
  originalName: string;
  name: string;
  code: string;
  description: string;
  // Vendor specific
  gstNumber?: string;
  mobile?: string;
  email?: string;
  address?: string;
  // Model specific
  brandName?: string;
  brandTempId?: string;
  productTypeId?: string;
  // DB Resolution
  matchedDbId?: string;
  matchedDbName?: string;
  isEdited?: boolean;
}

export interface DetectedInvoiceMasters {
  vendor: DetectedEntity | null;
  brands: DetectedEntity[];
  models: DetectedEntity[];
  variants: DetectedEntity[];
  colors: DetectedEntity[];
  hasNewEntities: boolean;
  newCount: number;
  existingCount: number;
}

export interface SyncMastersResult {
  vendorId: string;
  brandsMap: Record<string, string>; // originalName or tempId -> real db ID
  modelsMap: Record<string, string>;
  variantsMap: Record<string, string>;
  colorsMap: Record<string, string>;
  createdCounts: {
    vendors: number;
    brands: number;
    models: number;
    variants: number;
    colors: number;
  };
  updatedCounts: {
    vendors: number;
    brands: number;
    models: number;
    variants: number;
    colors: number;
  };
}

function cleanString(str: string | undefined | null): string {
  return (str || "").trim();
}

/**
 * Canonicalizes variant strings into a unified standard representation:
 * E.g.:
 * - "8+128G", "8+128GB", "8/128", "8GB+128GB", "(8+128G)", "8 + 128 GB" -> "8+128GB"
 * - "4+64", "4+64G", "4/64", "(4+64)" -> "4+64GB"
 * - "128G", "128GB", "128 GB", "(128GB)" -> "128GB"
 * - "256GB", "256G", "256 GB" -> "256GB"
 * - "1TB", "1 TB" -> "1TB"
 */
export function canonicalizeVariantName(raw: string | undefined | null): string {
  if (!raw) return "Standard";
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "standard") return "Standard";

  // Match RAM + Storage pattern (e.g. 8+128G, 8+128GB, 8/128, 8GB+128GB, (8+128G))
  const ramStorage = trimmed.match(/^\(?\s*(\d+)\s*(?:gb|g)?\s*[\+/]\s*(\d+)\s*(?:gb|g)?\s*\)?$/i);
  if (ramStorage && ramStorage[1] && ramStorage[2]) {
    return `${ramStorage[1]}+${ramStorage[2]}GB`;
  }

  // Match Storage-only pattern (e.g. 128GB, 128G, 128 GB, 256GB, 512GB)
  const storageOnly = trimmed.match(/^\(?\s*(\d+)\s*(?:gb|g)\s*\)?$/i);
  if (storageOnly && storageOnly[1]) {
    return `${storageOnly[1]}GB`;
  }

  // Match TB pattern
  const tbOnly = trimmed.match(/^\(?\s*(\d+)\s*(?:tb|t)\s*\)?$/i);
  if (tbOnly && tbOnly[1]) {
    return `${tbOnly[1]}TB`;
  }

  // General cleaned fallback
  return trimmed.replace(/[()]/g, "").trim();
}

export function areVariantsEquivalent(v1: string | undefined | null, v2: string | undefined | null): boolean {
  if (!v1 || !v2) return false;
  const c1 = canonicalizeVariantName(v1).toLowerCase();
  const c2 = canonicalizeVariantName(v2).toLowerCase();
  if (c1 === c2) return true;

  // Fallback to stripping all non-alphanumeric
  const k1 = (v1 || "").replace(/[^0-9a-z]/gi, "").toLowerCase();
  const k2 = (v2 || "").replace(/[^0-9a-z]/gi, "").toLowerCase();
  return Boolean(k1 && k1 === k2);
}

function normalizeKey(str: string | undefined | null): string {
  return (str || "").replace(/[()\s_.-]/g, "").toLowerCase();
}

/**
 * Analyzes an extracted bill and determines which Vendors, Brands, Models,
 * Variants, and Colors already exist in the database and which are NEW.
 */
export function detectInvoiceMasters(
  bill: ExtractedPurchaseBill,
  lookups: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
    productTypes: LookupItem[];
  }
): DetectedInvoiceMasters {
  const result: DetectedInvoiceMasters = {
    vendor: null,
    brands: [],
    models: [],
    variants: [],
    colors: [],
    hasNewEntities: false,
    newCount: 0,
    existingCount: 0,
  };

  // 1. Detect Vendor
  const vName = cleanString(bill.header.vendorName);
  const vGstin = cleanString(bill.header.vendorGstin).toUpperCase();
  const vPhone = cleanString(bill.header.vendorPhone);
  const vAddress = cleanString(bill.header.vendorAddress);

  if (vName || vGstin) {
    const matchedVendor = lookups.vendors.find((v) => {
      const gMatch = vGstin && (
        (v.gstNumber && v.gstNumber.trim().toUpperCase() === vGstin) ||
        (v.code && v.code.trim().toUpperCase() === vGstin)
      );
      if (gMatch) return true;
      const firstWord = vName ? vName.split(" ")[0]?.toLowerCase() : "";
      const nMatch = vName && (
        v.name.trim().toLowerCase() === vName.toLowerCase() ||
        (firstWord ? v.name.toLowerCase().includes(firstWord) : false)
      );
      return nMatch;
    });

    if (matchedVendor) {
      result.vendor = {
        tempId: matchedVendor.id,
        isNew: false,
        originalName: vName || matchedVendor.name,
        name: matchedVendor.name,
        code: matchedVendor.code || vGstin || "VEND-" + matchedVendor.id.slice(0, 6).toUpperCase(),
        description: matchedVendor.description || "Vendor matched from database",
        gstNumber: matchedVendor.gstNumber || vGstin,
        mobile: matchedVendor.mobile || vPhone,
        email: matchedVendor.email,
        address: matchedVendor.address || vAddress || "Local",
        matchedDbId: matchedVendor.id,
        matchedDbName: matchedVendor.name,
      };
      result.existingCount++;
    } else {
      const defaultName = vName || (vGstin ? `Vendor ${vGstin}` : "New Vendor");
      const defaultCode = vGstin ? vGstin.slice(0, 18) : "VEND-" + Date.now().toString().slice(-6);
      result.vendor = {
        tempId: "temp-vendor-" + Date.now(),
        isNew: true,
        originalName: defaultName,
        name: defaultName,
        code: defaultCode,
        description: `Imported from Invoice #${bill.header.billNumber || "N/A"}`,
        gstNumber: vGstin,
        mobile: vPhone,
        email: "",
        address: vAddress || "Local Market",
      };
      result.newCount++;
      result.hasNewEntities = true;
    }
  }

  // Helper deduplication maps
  const brandMap = new Map<string, DetectedEntity>();
  const modelMap = new Map<string, DetectedEntity>();
  const variantMap = new Map<string, DetectedEntity>();
  const colorMap = new Map<string, DetectedEntity>();

  bill.items.forEach((item, index) => {
    // A. Detect Brand
    const rawBrand = cleanString(item.brand) || cleanString(extractBrandFromDesc(item.description)) || "Generic";
    const brandKey = rawBrand.toLowerCase();

    if (!brandMap.has(brandKey)) {
      const matchedBrand = lookups.brands.find((b) => {
        const bClean = b.name.trim().toLowerCase();
        if (bClean === brandKey) return true;
        // Apple/iPhone equivalence
        if (/\b(apple|iphone)\b/i.test(brandKey) && /\b(apple|iphone)\b/i.test(bClean)) return true;
        // Tecno/Techno equivalence
        if (/\b(tecno|techno)\b/i.test(brandKey) && /\b(tecno|techno)\b/i.test(bClean)) return true;
        return false;
      });

      if (matchedBrand) {
        brandMap.set(brandKey, {
          tempId: matchedBrand.id,
          isNew: false,
          originalName: rawBrand,
          name: matchedBrand.name,
          code: matchedBrand.code || rawBrand.toUpperCase().slice(0, 10),
          description: matchedBrand.description || "Brand matched from database",
          matchedDbId: matchedBrand.id,
          matchedDbName: matchedBrand.name,
        });
        result.existingCount++;
      } else {
        brandMap.set(brandKey, {
          tempId: `temp-brand-${brandKey}`,
          isNew: true,
          originalName: rawBrand,
          name: rawBrand,
          code: rawBrand.toUpperCase().slice(0, 10),
          description: "New brand detected from invoice line items",
        });
        result.newCount++;
        result.hasNewEntities = true;
      }
    }

    // B. Detect Variant
    const rawVariant = cleanString(item.variant) || "Standard";
    const canonicalVariant = canonicalizeVariantName(rawVariant);
    const variantKey = canonicalVariant.toLowerCase();

    if (!variantMap.has(variantKey)) {
      const matchedVariant = lookups.variants.find(
        (v) =>
          normalizeKey(v.name) === variantKey ||
          areVariantsEquivalent(v.name, rawVariant) ||
          areVariantsEquivalent(v.name, canonicalVariant)
      );
      if (matchedVariant) {
        variantMap.set(variantKey, {
          tempId: matchedVariant.id,
          isNew: false,
          originalName: rawVariant,
          name: matchedVariant.name,
          code: matchedVariant.code || canonicalVariant.toUpperCase(),
          description: matchedVariant.description || "Variant matched from database",
          matchedDbId: matchedVariant.id,
          matchedDbName: matchedVariant.name,
        });
        result.existingCount++;
      } else {
        variantMap.set(variantKey, {
          tempId: `temp-variant-${variantKey}`,
          isNew: true,
          originalName: rawVariant,
          name: canonicalVariant,
          code: canonicalVariant.toUpperCase(),
          description: "New variant detected from invoice",
        });
        result.newCount++;
        result.hasNewEntities = true;
      }
    }

    // C. Detect Color
    const rawColor = cleanString(item.color) || "Standard";
    const colorKey = rawColor.toLowerCase();

    if (!colorMap.has(colorKey)) {
      const matchedColor = lookups.colors.find((c) => c.name.trim().toLowerCase() === colorKey);
      if (matchedColor) {
        colorMap.set(colorKey, {
          tempId: matchedColor.id,
          isNew: false,
          originalName: rawColor,
          name: matchedColor.name,
          code: rawColor.toUpperCase().slice(0, 10),
          description: matchedColor.description || "Color matched from database",
          matchedDbId: matchedColor.id,
          matchedDbName: matchedColor.name,
        });
        result.existingCount++;
      } else {
        colorMap.set(colorKey, {
          tempId: `temp-color-${colorKey}`,
          isNew: true,
          originalName: rawColor,
          name: rawColor,
          code: rawColor.toUpperCase().slice(0, 10),
          description: "New color detected from invoice",
        });
        result.newCount++;
        result.hasNewEntities = true;
      }
    }

    // D. Detect Model (dependent on brand)
    const rawModel = cleanString(item.model) || cleanString(item.description) || `Item Model ${index + 1}`;
    const modelKey = `${brandKey}__${rawModel.toLowerCase()}`;

    if (!modelMap.has(modelKey)) {
      const brandEntity = brandMap.get(brandKey);
      const targetBrandId = brandEntity?.matchedDbId;

      const matchedModel = lookups.models.find((m) => {
        const mClean = m.name.trim().toLowerCase();
        const rClean = rawModel.toLowerCase();
        if (targetBrandId && m.brandId && m.brandId !== targetBrandId) return false;
        return mClean === rClean || rClean.includes(mClean) || mClean.includes(rClean);
      });

      if (matchedModel) {
        modelMap.set(modelKey, {
          tempId: matchedModel.id,
          isNew: false,
          originalName: rawModel,
          name: matchedModel.name,
          code: matchedModel.code || rawModel.toUpperCase().replace(/\s+/g, "").slice(0, 15),
          brandName: rawBrand,
          brandTempId: brandEntity?.tempId,
          description: matchedModel.description || "Model matched from database",
          matchedDbId: matchedModel.id,
          matchedDbName: matchedModel.name,
        });
        result.existingCount++;
      } else {
        modelMap.set(modelKey, {
          tempId: `temp-model-${modelKey}`,
          isNew: true,
          originalName: rawModel,
          name: rawModel,
          code: rawModel.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15) || `MOD${Date.now().toString().slice(-4)}`,
          brandName: rawBrand,
          brandTempId: brandEntity?.tempId,
          description: `Model for ${rawBrand} detected from invoice`,
        });
        result.newCount++;
        result.hasNewEntities = true;
      }
    }
  });

  result.brands = Array.from(brandMap.values());
  result.models = Array.from(modelMap.values());
  result.variants = Array.from(variantMap.values());
  result.colors = Array.from(colorMap.values());

  return result;
}

function extractBrandFromDesc(desc: string | undefined): string {
  if (!desc) return "";
  const d = desc.toLowerCase();
  if (d.includes("vivo")) return "Vivo";
  if (d.includes("iphone") || d.includes("apple")) return "Apple";
  if (d.includes("samsung")) return "Samsung";
  if (d.includes("oppo")) return "Oppo";
  if (d.includes("realme")) return "Realme";
  if (d.includes("oneplus")) return "OnePlus";
  if (d.includes("xiaomi") || d.includes("redmi") || d.includes("mi")) return "Xiaomi";
  if (d.includes("motorola") || d.includes("moto")) return "Motorola";
  if (d.includes("tecno") || d.includes("techno")) return "Tecno";
  return "";
}

/**
 * Synchronizes new and edited masters to the database:
 * - Inserts new records (POST) and captures newly generated database GUIDs.
 * - Updates edited existing records (PUT).
 * - Returns the updated lookups and ID mapping table so all dropdown controls
 *   and product rows are populated and linked with valid database IDs.
 */
export async function syncInvoiceMastersToDatabase(
  masters: DetectedInvoiceMasters,
  currentLookups: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
    productTypes: LookupItem[];
  }
): Promise<{
  updatedLookups: typeof currentLookups;
  syncResult: SyncMastersResult;
}> {
  const syncResult: SyncMastersResult = {
    vendorId: "",
    brandsMap: {},
    modelsMap: {},
    variantsMap: {},
    colorsMap: {},
    createdCounts: { vendors: 0, brands: 0, models: 0, variants: 0, colors: 0 },
    updatedCounts: { vendors: 0, brands: 0, models: 0, variants: 0, colors: 0 },
  };

  const nextVendors = [...currentLookups.vendors];
  const nextBrands = [...currentLookups.brands];
  const nextModels = [...currentLookups.models];
  const nextVariants = [...currentLookups.variants];
  const nextColors = [...currentLookups.colors];
  const nextProductTypes = [...currentLookups.productTypes];

  // Ensure default ProductType (Smart Phone / Mobile) exists
  let defaultTypeId = nextProductTypes.find((pt) =>
    /smart\s*phone|mobile|phone|handset/i.test(pt.name)
  )?.id;

  if (!defaultTypeId) {
    if (nextProductTypes.length > 0 && nextProductTypes[0]?.id) {
      defaultTypeId = nextProductTypes[0].id;
    } else {
      try {
        const existingTypes = await apiClient.get<LookupItem[]>("/product-types/all");
        if (existingTypes && existingTypes.length > 0 && existingTypes[0]?.id) {
          nextProductTypes.push(...existingTypes);
          defaultTypeId = existingTypes[0].id;
        }
      } catch {
        // Continue to create default
      }

      if (!defaultTypeId) {
        try {
          const res = await apiClient.post<LookupItem>("/product-types", {
            name: "Smart Phone",
            description: "Mobile Handsets and Smart Phones",
            hsnSac: "85171300",
          });
          if (res && res.id) {
            defaultTypeId = res.id;
            nextProductTypes.push(res);
          }
        } catch {
          try {
            const allTypes = await apiClient.get<LookupItem[]>("/product-types/all");
            if (allTypes && allTypes.length > 0 && allTypes[0]?.id) {
              nextProductTypes.push(...allTypes);
              defaultTypeId = allTypes[0].id;
            }
          } catch {
            // Log warning if completely unable to fetch or create
            console.error("Failed to ensure default ProductType in tenant");
          }
        }
      }
    }
  }

  // 1. Process Brands
  for (const b of masters.brands) {
    if (b.isNew) {
      try {
        const res = await apiClient.post<LookupItem>("/brands", {
          name: b.name.trim(),
          description: b.description || "Created from invoice import",
        });
        const createdId = res?.id || b.tempId;
        syncResult.brandsMap[b.originalName.toLowerCase()] = createdId;
        syncResult.brandsMap[b.name.toLowerCase()] = createdId;
        syncResult.brandsMap[b.tempId] = createdId;
        b.matchedDbId = createdId;
        b.isNew = false;
        syncResult.createdCounts.brands++;

        nextBrands.push({
          id: createdId,
          name: b.name.trim(),
          description: b.description,
        });
      } catch (err) {
        console.warn("Failed to create brand, attempting recovery from database", b.name, err);
        try {
          const dbBrands = await apiClient.get<LookupItem[]>("/brands/all");
          const matched = dbBrands?.find(
            (nb) => nb.name.trim().toLowerCase() === b.name.trim().toLowerCase() ||
              nb.name.trim().toLowerCase() === b.originalName.trim().toLowerCase()
          );
          if (matched && matched.id) {
            syncResult.brandsMap[b.originalName.toLowerCase()] = matched.id;
            syncResult.brandsMap[b.name.toLowerCase()] = matched.id;
            syncResult.brandsMap[b.tempId] = matched.id;
            b.matchedDbId = matched.id;
            b.isNew = false;
            if (!nextBrands.some((x) => x.id === matched.id)) nextBrands.push(matched);
            continue;
          }
        } catch {
          // ignore
        }
        const fallback = nextBrands.find((nb) => nb.name.toLowerCase() === b.name.toLowerCase());
        const id = fallback?.id || nextBrands[0]?.id || b.tempId;
        syncResult.brandsMap[b.originalName.toLowerCase()] = id;
        syncResult.brandsMap[b.tempId] = id;
      }
    } else {
      const existingId = b.matchedDbId || b.tempId;
      syncResult.brandsMap[b.originalName.toLowerCase()] = existingId;
      syncResult.brandsMap[b.name.toLowerCase()] = existingId;
      syncResult.brandsMap[b.tempId] = existingId;

      if (b.isEdited) {
        try {
          await apiClient.put(`/brands/${existingId}`, {
            id: existingId,
            name: b.name.trim(),
            description: b.description,
            isActive: true,
          });
          syncResult.updatedCounts.brands++;
          const idx = nextBrands.findIndex((x) => x.id === existingId);
          if (idx !== -1 && nextBrands[idx]) {
            nextBrands[idx] = { ...nextBrands[idx], name: b.name.trim(), description: b.description };
          }
        } catch (err) {
          console.warn("Failed to update brand", b.name, err);
        }
      }
    }
  }

  // 2. Process Vendor
  if (masters.vendor) {
    const v = masters.vendor;
    if (v.isNew) {
      const vGstinUpper = (v.gstNumber || "").trim().toUpperCase();
      const vNameLower = v.name.trim().toLowerCase();

      // Check if vendor already exists in known list
      const preExisting = nextVendors.find((nv) => {
        const nvGstin = (nv.gstNumber || nv.code || "").trim().toUpperCase();
        if (vGstinUpper && nvGstin && nvGstin === vGstinUpper) return true;
        return nv.name.trim().toLowerCase() === vNameLower;
      });

      if (preExisting && preExisting.id) {
        syncResult.vendorId = preExisting.id;
        v.matchedDbId = preExisting.id;
        v.isNew = false;
      } else {
        try {
          const res = await apiClient.post<LookupItem>("/vendors", {
            name: v.name.trim(),
            code: v.code.trim() || (v.gstNumber ? v.gstNumber.slice(0, 18) : "VEND-" + Date.now().toString().slice(-6)),
            mobile: v.mobile?.trim(),
            email: v.email?.trim(),
            description: v.description || "Vendor auto-created from invoice",
            address: v.address || "Local",
            gstNumber: v.gstNumber || null,
          });
          const createdId = res?.id || v.tempId;
          syncResult.vendorId = createdId;
          v.matchedDbId = createdId;
          v.isNew = false;
          syncResult.createdCounts.vendors++;

          nextVendors.push({
            id: createdId,
            name: v.name.trim(),
            code: v.code,
            gstNumber: v.gstNumber,
            mobile: v.mobile,
            email: v.email,
            address: v.address,
          });
        } catch (err) {
          console.warn("Vendor registration conflict or notice, retrieving from database…", v.name, err);
          try {
            const dbVendors = await apiClient.get<LookupItem[]>("/vendors/all");
            const vendorList: LookupItem[] = Array.isArray(dbVendors) ? dbVendors : [];
            const matched = vendorList.find(
              (nv) =>
                (vGstinUpper && (nv.gstNumber || nv.code || "").toUpperCase() === vGstinUpper) ||
                (nv.name && nv.name.trim().toLowerCase() === vNameLower)
            );
            if (matched && matched.id) {
              syncResult.vendorId = matched.id;
              v.matchedDbId = matched.id;
              v.isNew = false;
              if (!nextVendors.some((x) => x.id === matched.id)) nextVendors.push(matched);
            } else {
              syncResult.vendorId = nextVendors[0]?.id || v.tempId;
            }
          } catch {
            syncResult.vendorId = nextVendors[0]?.id || v.tempId;
          }
        }
      }
    } else {
      const existingId = v.matchedDbId || v.tempId;
      syncResult.vendorId = existingId;

      if (v.isEdited) {
        try {
          await apiClient.put(`/vendors/${existingId}`, {
            id: existingId,
            name: v.name.trim(),
            code: v.code.trim(),
            mobile: v.mobile?.trim(),
            email: v.email?.trim(),
            description: v.description || "",
            address: v.address || "Local",
            gstNumber: v.gstNumber || null,
            isActive: true,
          });
          syncResult.updatedCounts.vendors++;
          const idx = nextVendors.findIndex((x) => x.id === existingId);
          if (idx !== -1 && nextVendors[idx]) {
            nextVendors[idx] = { ...nextVendors[idx], name: v.name.trim(), gstNumber: v.gstNumber };
          }
        } catch (err) {
          console.warn("Failed to update vendor", v.name, err);
        }
      }
    }
  } else {
    syncResult.vendorId = nextVendors[0]?.id || "";
  }

  // 3. Process Variants
  for (const vr of masters.variants) {
    const key = normalizeKey(vr.originalName);
    const canonical = canonicalizeVariantName(vr.name);

    // Dedup check: Does an equivalent variant already exist in nextVariants?
    const existingEquivalent = nextVariants.find(
      (v) =>
        normalizeKey(v.name) === normalizeKey(canonical) ||
        areVariantsEquivalent(v.name, canonical) ||
        areVariantsEquivalent(v.name, vr.originalName)
    );

    if (existingEquivalent) {
      const existingId = existingEquivalent.id;
      syncResult.variantsMap[key] = existingId;
      syncResult.variantsMap[normalizeKey(vr.name)] = existingId;
      syncResult.variantsMap[canonical.toLowerCase()] = existingId;
      syncResult.variantsMap[vr.tempId] = existingId;
      vr.matchedDbId = existingId;
      vr.isNew = false;
      continue;
    }

    if (vr.isNew) {
      try {
        const res = await apiClient.post<LookupItem>("/variants", {
          name: canonical,
          description: vr.description || "Created from invoice import",
        });
        const createdId = res?.id || vr.tempId;
        syncResult.variantsMap[key] = createdId;
        syncResult.variantsMap[normalizeKey(vr.name)] = createdId;
        syncResult.variantsMap[canonical.toLowerCase()] = createdId;
        syncResult.variantsMap[vr.tempId] = createdId;
        vr.matchedDbId = createdId;
        vr.isNew = false;
        syncResult.createdCounts.variants++;

        nextVariants.push({
          id: createdId,
          name: canonical,
          description: vr.description,
        });
      } catch (err) {
        console.warn("Failed to create variant, attempting recovery from database", vr.name, err);
        try {
          const dbVariants = await apiClient.get<LookupItem[]>("/variants/all");
          const matched = dbVariants?.find(
            (v) => areVariantsEquivalent(v.name, canonical) || areVariantsEquivalent(v.name, vr.name)
          );
          if (matched && matched.id) {
            syncResult.variantsMap[key] = matched.id;
            syncResult.variantsMap[normalizeKey(vr.name)] = matched.id;
            syncResult.variantsMap[canonical.toLowerCase()] = matched.id;
            syncResult.variantsMap[vr.tempId] = matched.id;
            vr.matchedDbId = matched.id;
            vr.isNew = false;
            if (!nextVariants.some(x => x.id === matched.id)) nextVariants.push(matched);
            continue;
          }
        } catch {
          // ignore
        }
        const fallback = nextVariants.find((x) => areVariantsEquivalent(x.name, canonical));
        const id = fallback?.id || nextVariants[0]?.id || vr.tempId;
        syncResult.variantsMap[key] = id;
        syncResult.variantsMap[canonical.toLowerCase()] = id;
        syncResult.variantsMap[vr.tempId] = id;
      }
    } else {
      const existingId = vr.matchedDbId || vr.tempId;
      syncResult.variantsMap[key] = existingId;
      syncResult.variantsMap[normalizeKey(vr.name)] = existingId;
      syncResult.variantsMap[vr.tempId] = existingId;

      if (vr.isEdited) {
        try {
          await apiClient.put(`/variants/${existingId}`, {
            id: existingId,
            name: vr.name.trim(),
            description: vr.description,
            isActive: true,
          });
          syncResult.updatedCounts.variants++;
          const idx = nextVariants.findIndex((x) => x.id === existingId);
          if (idx !== -1 && nextVariants[idx]) {
            nextVariants[idx] = { ...nextVariants[idx], name: vr.name.trim() };
          }
        } catch (err) {
          console.warn("Failed to update variant", vr.name, err);
        }
      }
    }
  }

  // 4. Process Colors
  for (const c of masters.colors) {
    const key = c.originalName.trim().toLowerCase();
    if (c.isNew) {
      try {
        const res = await apiClient.post<LookupItem>("/colors", {
          name: c.name.trim(),
          description: c.description || "Created from invoice import",
        });
        const createdId = res?.id || c.tempId;
        syncResult.colorsMap[key] = createdId;
        syncResult.colorsMap[c.name.trim().toLowerCase()] = createdId;
        syncResult.colorsMap[c.tempId] = createdId;
        c.matchedDbId = createdId;
        c.isNew = false;
        syncResult.createdCounts.colors++;

        nextColors.push({
          id: createdId,
          name: c.name.trim(),
          description: c.description,
        });
      } catch (err) {
        console.warn("Failed to create color, attempting recovery from database", c.name, err);
        try {
          const dbColors = await apiClient.get<LookupItem[]>("/colors/all");
          const matched = dbColors?.find(
            (nc) => nc.name.trim().toLowerCase() === key || nc.name.trim().toLowerCase() === c.name.trim().toLowerCase()
          );
          if (matched && matched.id) {
            syncResult.colorsMap[key] = matched.id;
            syncResult.colorsMap[c.name.trim().toLowerCase()] = matched.id;
            syncResult.colorsMap[c.tempId] = matched.id;
            c.matchedDbId = matched.id;
            c.isNew = false;
            if (!nextColors.some(x => x.id === matched.id)) nextColors.push(matched);
            continue;
          }
        } catch {
          // ignore
        }
        const fallback = nextColors.find((x) => x.name.trim().toLowerCase() === key);
        const id = fallback?.id || nextColors[0]?.id || c.tempId;
        syncResult.colorsMap[key] = id;
        syncResult.colorsMap[c.tempId] = id;
      }
    } else {
      const existingId = c.matchedDbId || c.tempId;
      syncResult.colorsMap[key] = existingId;
      syncResult.colorsMap[c.name.trim().toLowerCase()] = existingId;
      syncResult.colorsMap[c.tempId] = existingId;

      if (c.isEdited) {
        try {
          await apiClient.put(`/colors/${existingId}`, {
            id: existingId,
            name: c.name.trim(),
            description: c.description,
            isActive: true,
          });
          syncResult.updatedCounts.colors++;
          const idx = nextColors.findIndex((x) => x.id === existingId);
          if (idx !== -1 && nextColors[idx]) {
            nextColors[idx] = { ...nextColors[idx], name: c.name.trim() };
          }
        } catch (err) {
          console.warn("Failed to update color", c.name, err);
        }
      }
    }
  }

  // 5. Process Models (requires brandId and productTypeId)
  for (const m of masters.models) {
    const brandKey = (m.brandName || "").toLowerCase();
    const resolvedBrandId =
      syncResult.brandsMap[brandKey] ||
      syncResult.brandsMap[m.brandTempId || ""] ||
      nextBrands.find((b) => b.name.toLowerCase() === brandKey)?.id ||
      nextBrands[0]?.id ||
      "";

    const mKey = `${brandKey}__${m.originalName.toLowerCase()}`;
    const targetTypeId = m.productTypeId || defaultTypeId;

    if (m.isNew) {
      try {
        const res = await apiClient.post<LookupItem>("/product-models", {
          brandId: resolvedBrandId,
          productTypeId: targetTypeId,
          code: m.code.trim() || m.name.toUpperCase().replace(/\s+/g, "").slice(0, 15),
          name: m.name.trim(),
          description: m.description || `Model for ${m.brandName || "Brand"} from invoice`,
        });
        const createdId = res?.id || m.tempId;
        syncResult.modelsMap[mKey] = createdId;
        syncResult.modelsMap[m.originalName.toLowerCase()] = createdId;
        syncResult.modelsMap[m.name.toLowerCase()] = createdId;
        syncResult.modelsMap[m.tempId] = createdId;
        m.matchedDbId = createdId;
        m.isNew = false;
        syncResult.createdCounts.models++;

        nextModels.push({
          id: createdId,
          name: m.name.trim(),
          code: m.code,
          brandId: resolvedBrandId,
          productTypeId: targetTypeId,
          description: m.description,
        });
      } catch (err) {
        console.warn("Failed to create model, attempting recovery from database", m.name, err);
        try {
          const dbModels = await apiClient.get<LookupItem[]>("/product-models/all");
          const matched = dbModels?.find(
            (nm) => (resolvedBrandId ? nm.brandId === resolvedBrandId : true) &&
              (nm.name.trim().toLowerCase() === m.name.trim().toLowerCase() ||
                nm.name.trim().toLowerCase() === m.originalName.trim().toLowerCase())
          );
          if (matched && matched.id) {
            syncResult.modelsMap[mKey] = matched.id;
            syncResult.modelsMap[m.originalName.toLowerCase()] = matched.id;
            syncResult.modelsMap[m.name.toLowerCase()] = matched.id;
            syncResult.modelsMap[m.tempId] = matched.id;
            m.matchedDbId = matched.id;
            m.isNew = false;
            if (!nextModels.some(x => x.id === matched.id)) nextModels.push(matched);
            continue;
          }
        } catch {
          // ignore
        }
        const fallback = nextModels.find((x) => x.name.toLowerCase() === m.name.toLowerCase());
        const id = fallback?.id || nextModels[0]?.id || m.tempId;
        syncResult.modelsMap[mKey] = id;
        syncResult.modelsMap[m.originalName.toLowerCase()] = id;
        syncResult.modelsMap[m.name.toLowerCase()] = id;
        syncResult.modelsMap[m.tempId] = id;
      }
    } else {
      const existingId = m.matchedDbId || m.tempId;
      syncResult.modelsMap[mKey] = existingId;
      syncResult.modelsMap[m.originalName.toLowerCase()] = existingId;
      syncResult.modelsMap[m.name.toLowerCase()] = existingId;
      syncResult.modelsMap[m.tempId] = existingId;

      if (m.isEdited) {
        try {
          await apiClient.put(`/product-models/${existingId}`, {
            id: existingId,
            brandId: resolvedBrandId,
            productTypeId: targetTypeId,
            code: m.code.trim(),
            name: m.name.trim(),
            description: m.description || "",
            isActive: true,
          });
          syncResult.updatedCounts.models++;
          const idx = nextModels.findIndex((x) => x.id === existingId);
          if (idx !== -1 && nextModels[idx]) {
            nextModels[idx] = {
              ...nextModels[idx],
              name: m.name.trim(),
              code: m.code.trim(),
              brandId: resolvedBrandId,
            };
          }
        } catch (err) {
          console.warn("Failed to update model", m.name, err);
        }
      }
    }
  }

  return {
    updatedLookups: {
      vendors: nextVendors,
      brands: nextBrands,
      models: nextModels,
      variants: nextVariants,
      colors: nextColors,
      productTypes: nextProductTypes,
    },
    syncResult,
  };
}

/**
 * Extracts masters dynamically from row items and header (for manual line entries
 * or when uploadedBill is null).
 */
export function extractMastersFromRowsAndHeader(
  header: { vendorId?: string; vendorName?: string; vendorGstin?: string },
  rows: Array<{
    brandId?: string;
    brandName?: string;
    productModelId?: string;
    modelName?: string;
    variantId?: string;
    variantName?: string;
    colorId?: string;
    colorName?: string;
    description?: string;
  }>,
  lookups: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
    productTypes: LookupItem[];
  }
): DetectedInvoiceMasters {
  const syntheticBill = {
    header: {
      vendorName: header.vendorName || lookups.vendors.find(v => v.id === header.vendorId)?.name || "Vendor",
      vendorGstin: header.vendorGstin || "",
      billNumber: "DRAFT",
      billDate: new Date().toISOString().slice(0, 10),
    },
    items: rows.map(r => ({
      brand: r.brandName || lookups.brands.find(b => b.id === r.brandId)?.name || "Generic",
      model: r.modelName || lookups.models.find(m => m.id === r.productModelId)?.name || "Model",
      variant: r.variantName || lookups.variants.find(v => v.id === r.variantId)?.name || "Standard",
      color: r.colorName || lookups.colors.find(c => c.id === r.colorId)?.name || "Standard",
      description: r.description || "",
      serialNumber: "SN",
      serialNumber1: "SN1",
      quantity: 1,
      taxableRate: 0,
      taxableAmount: 0,
      totalAmount: 0,
    })),
    summary: {
      totalItems: rows.length,
      totalQuantity: rows.length,
      subtotalTaxable: 0,
      totalTax: 0,
      grandTotal: 0,
    },
  } as unknown as ExtractedPurchaseBill;

  return detectInvoiceMasters(syntheticBill, lookups);
}
