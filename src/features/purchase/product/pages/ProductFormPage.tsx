import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Receipt,
  Check,
  Hash,
  Building2,
  Calendar,
  X,
  Plus,
  Trash2,
  Copy,
  Save,
  ArrowLeft,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "../../../../components/ui/Button";
import { DynamicForm } from "../../../dynamic-form/DynamicForm";
import { ResourceFormPage } from "../../../shared/ResourceCrudPages";
import {
  productResource,
  loadProductLookups,
  type ProductLookupsData,
  type ProductLookupRecord,
} from "./productResource";
import type { Product } from "../types/product.types";
import { APP_ROUTES } from "../../../../config/routes";
import { apiClient } from "../../../../services/apiClient";
import { useNotifications } from "../../../../context/NotificationContext";
import {
  extractTextFromInvoiceDocument,
  parsePurchaseBillText,
  BILL_PRESETS,
  type BillPresetInfo,
} from "../../scan-bill/services/purchaseBillParser";
import type {
  ExtractedPurchaseBill,
  ExtractedBillHeader,
  ExtractedBillItem,
} from "../../scan-bill/types/purchaseBillScanner.types";

interface ProductRowItem {
  id: string;
  lineNumber: number;
  description: string;
  brandId: string;
  productTypeId: string;
  productModelId: string;
  variantId: string;
  colorId: string;
  serialNumber: string;
  serialNumber1: string;
  purchasePrice: number;
  discount: number;
  cgst: number;
  sgst: number;
  tax: number;
  totalAmount: number;
  isActive: boolean;
}

interface PurchaseHeaderState {
  vendorId: string;
  billNumber: string;
  purchaseDate: string;
  paymentTermsDays: number;
}

function matchVendor(header: ExtractedBillHeader, vendors: ProductLookupRecord[]): string {
  if (!vendors.length) return "";
  const gstin = header.vendorGstin?.trim().toUpperCase();
  const name = header.vendorName?.trim().toLowerCase();

  // 1. Match by GSTIN
  if (gstin) {
    const byGst = vendors.find(
      (v) =>
        (v.gstNumber && v.gstNumber.trim().toUpperCase() === gstin) ||
        (v.code && v.code.trim().toUpperCase() === gstin)
    );
    if (byGst) return byGst.id;
  }

  // 2. Match by exact or partial name
  if (name) {
    const byName = vendors.find((v) => {
      const vName = v.name.trim().toLowerCase();
      return vName === name || vName.includes(name) || name.includes(vName);
    });
    if (byName) return byName.id;

    const firstWord = name.split(/[\s,.-]+/)[0];
    if (firstWord && firstWord.length >= 3) {
      const byWord = vendors.find((v) => v.name.toLowerCase().includes(firstWord));
      if (byWord) return byWord.id;
    }
  }

  return vendors[0]?.id ?? "";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchBrand(itemBrand: string, brands: ProductLookupRecord[], itemDesc?: string): string {
  if (!brands.length) return "";
  const clean = (itemBrand || "").trim().toLowerCase();
  const desc = (itemDesc || "").trim().toLowerCase();

  // 1. Exact match on brand name
  if (clean) {
    const exact = brands.find((b) => b.name.trim().toLowerCase() === clean);
    if (exact) return exact.id;
  }

  // 2. Apple / iPhone equivalence (database brand can be "IPhone" or "Apple")
  const isAppleFamily =
    clean === "apple" ||
    clean === "iphone" ||
    /\b(apple|iphone)\b/i.test(clean) ||
    /\b(apple|iphone)\b/i.test(desc);

  if (isAppleFamily) {
    const appleBrand = brands.find((b) => {
      const bName = b.name.trim().toLowerCase();
      return bName === "iphone" || bName === "apple" || /iphone|apple/i.test(bName);
    });
    if (appleBrand) return appleBrand.id;
  }

  // 3. Techno / Tecno equivalence
  const isTecnoFamily =
    clean === "tecno" ||
    clean === "techno" ||
    /\b(tecno|techno)\b/i.test(clean) ||
    /\b(tecno|techno)\b/i.test(desc);

  if (isTecnoFamily) {
    const tecnoBrand = brands.find((b) => {
      const bName = b.name.trim().toLowerCase();
      return bName === "techno" || bName === "tecno" || /techno|tecno/i.test(bName);
    });
    if (tecnoBrand) return tecnoBrand.id;
  }

  // 4. Standalone brand word mentioned in description (e.g. "VIVO", "OPPO", "SAMSUNG")
  if (desc) {
    const inDesc = brands.find((b) => {
      const bName = b.name.trim().toLowerCase();
      if (!bName) return false;
      const regex = new RegExp(`\\b${escapeRegex(bName)}\\b`, "i");
      return regex.test(desc);
    });
    if (inDesc) return inDesc.id;
  }

  // 5. Partial contains match
  if (clean) {
    const partial = brands.find((b) => {
      const bName = b.name.trim().toLowerCase();
      return bName === clean || bName.includes(clean) || clean.includes(bName);
    });
    if (partial) return partial.id;
  }

  return brands[0]?.id ?? "";
}

function matchProductType(matchedBrandId: string, productTypes: ProductLookupRecord[]): string {
  if (!productTypes.length) return "";
  const brandTypes = productTypes.filter((pt) => !pt.brandId || pt.brandId === matchedBrandId);
  const phoneType = brandTypes.find((pt) => /smart\s*phone|mobile|phone|handset/i.test(pt.name));
  if (phoneType) return phoneType.id;
  return brandTypes[0]?.id ?? productTypes[0]?.id ?? "";
}

function cleanDescForModelMatching(desc: string): string {
  return (desc || "")
    .toLowerCase()
    .replace(/\b(86\d{13}|35\d{13}|\d{15})\b/g, "") // remove IMEIs
    .replace(/\bhsn\s*:?\s*\d+\b/gi, "")            // remove HSN
    .replace(/\bqty\s*:?\s*\d+\b/gi, "")            // remove Qty
    .replace(/\b\d+\s*gb\b/gi, "")                  // remove 128GB, 256GB, etc.
    .replace(/\(\d+\+\d+g?\)/gi, "")                // remove (4+64)
    .replace(/\b(white|black|blue|orange|lavender|green|gold|silver|grey|gray|purple|red)\b/gi, "") // remove common colors
    .trim();
}

function matchModelRecord(
  item: ExtractedBillItem,
  models: ProductLookupRecord[],
  preferredBrandId?: string
): ProductLookupRecord | undefined {
  if (!models.length) return undefined;

  const itemModelClean = (item.model || "").trim().toLowerCase();
  const descClean = (item.description || "").trim().toLowerCase();
  const cleanedDesc = cleanDescForModelMatching(item.description);

  // If a preferred brand is selected, prioritize models of that brand
  const brandModels = preferredBrandId
    ? models.filter((m) => m.brandId === preferredBrandId)
    : [];

  const searchPools = brandModels.length > 0 ? [brandModels, models] : [models];

  for (const pool of searchPools) {
    // 1. Exact match on model name
    if (itemModelClean) {
      const exact = pool.find((m) => m.name.trim().toLowerCase() === itemModelClean);
      if (exact) return exact;
    }

    // 2. Strip brand prefixes (apple, iphone, tecno, techno, oppo, vivo, samsung)
    const strippedItemModel = itemModelClean
      .replace(/\b(apple|iphone|vivo|oppo|tecno|techno|samsung)\b/gi, "")
      .trim();

    if (strippedItemModel) {
      const matchStripped = pool.find((m) => {
        const mClean = m.name.trim().toLowerCase();
        const mStripped = mClean.replace(/\b(apple|iphone|vivo|oppo|tecno|techno|samsung)\b/gi, "").trim();
        return mClean === strippedItemModel || mStripped === strippedItemModel;
      });
      if (matchStripped) return matchStripped;
    }

    // 3. Exact word boundary match in cleaned description (e.g. "16", "15", "17", "V80", "F35")
    const wordInDesc = pool.find((m) => {
      const mName = m.name.trim().toLowerCase();
      if (!mName) return false;
      const regex = new RegExp(`\\b${escapeRegex(mName)}\\b`, "i");
      return regex.test(cleanedDesc) || (itemModelClean && regex.test(itemModelClean));
    });
    if (wordInDesc) return wordInDesc;

    // 4. Substring / contains match for longer model names (>= 3 chars)
    const substringMatch = pool.find((m) => {
      const mName = m.name.trim().toLowerCase();
      if (mName.length < 3) return false;
      return (
        (itemModelClean && (mName.includes(itemModelClean) || itemModelClean.includes(mName))) ||
        descClean.includes(mName)
      );
    });
    if (substringMatch) return substringMatch;
  }

  // 5. If a preferred brand is selected, fall back to its first model
  if (brandModels.length > 0) {
    return brandModels[0];
  }

  return undefined;
}

function matchVariant(itemVariant: string, itemDesc: string, variants: ProductLookupRecord[]): string {
  if (!variants.length) return "";
  const vClean = (itemVariant || "").replace(/[()\s]/g, "").toLowerCase();
  const dClean = (itemDesc || "").replace(/[()\s]/g, "").toLowerCase();

  // 1. Exact match on variant name
  if (vClean && vClean !== "standard") {
    const exact = variants.find((v) => v.name.replace(/[()\s]/g, "").toLowerCase() === vClean);
    if (exact) return exact.id;
  }

  // 2. Exact word boundary or contained in description
  const matched = variants.find((v) => {
    const nameClean = v.name.replace(/[()\s]/g, "").toLowerCase();
    return (
      (vClean && (nameClean === vClean || nameClean.includes(vClean) || vClean.includes(nameClean))) ||
      dClean.includes(nameClean)
    );
  });

  return matched?.id ?? variants[0]?.id ?? "";
}

function matchColor(itemColor: string, itemDesc: string, colors: ProductLookupRecord[]): string {
  if (!colors.length) return "";
  const cClean = (itemColor || "").trim().toLowerCase();
  const dClean = (itemDesc || "").trim().toLowerCase();

  // STEP 1: Exact match with itemColor (e.g. "White" === "White", "Blue" === "Blue", "Black" === "Black")
  if (cClean && cClean !== "standard") {
    const exact = colors.find((c) => c.name.trim().toLowerCase() === cClean);
    if (exact) return exact.id;
  }

  // STEP 2: Exact standalone single-word color found in description (e.g. "White", "Blue", "Black", "Orange", "Lavender")
  if (dClean) {
    const singleWordColors = colors.filter((c) => !c.name.trim().includes(" "));
    const foundSingle = singleWordColors.find((c) => {
      const name = c.name.trim().toLowerCase();
      if (!name) return false;
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "i");
      return regex.test(dClean);
    });
    if (foundSingle) return foundSingle.id;
  }

  // STEP 3: Multi-word / compound color found in description (e.g. "Air White", "Cosmic Black", "Sierra Blue")
  if (dClean) {
    const multiWordColors = colors.filter((c) => c.name.trim().includes(" "));
    const foundMulti = multiWordColors.find((c) => {
      const name = c.name.trim().toLowerCase();
      if (!name) return false;
      const regex = new RegExp(`\\b${escapeRegex(name)}\\b`, "i");
      return regex.test(dClean);
    });
    if (foundMulti) return foundMulti.id;
  }

  // STEP 4: Substring / word contains match on itemColor
  if (cClean && cClean !== "standard") {
    const wordInName = colors.find((c) => {
      const name = c.name.trim().toLowerCase();
      const regex = new RegExp(`\\b${escapeRegex(cClean)}\\b`, "i");
      return regex.test(name);
    });
    if (wordInName) return wordInName.id;

    const partial = colors.find((c) => {
      const name = c.name.trim().toLowerCase();
      return name.includes(cClean) || cClean.includes(name);
    });
    if (partial) return partial.id;
  }

  // Fallback to first color
  return colors[0]?.id ?? "";
}

function createRowFromBillItem(
  item: ExtractedBillItem,
  index: number,
  lookups: ProductLookupsData
): ProductRowItem {
  // 1. Identify Brand first
  const brandId = matchBrand(item.brand, lookups.brands, item.description);

  // 2. Identify Model with preferred brand so models belonging to that brand are prioritized
  const matchedModel = matchModelRecord(item, lookups.models, brandId);

  let finalBrandId = brandId;
  let productTypeId = "";
  let productModelId = "";

  if (matchedModel) {
    productModelId = matchedModel.id;
    if (matchedModel.brandId) {
      finalBrandId = matchedModel.brandId;
    }
    productTypeId =
      matchedModel.productTypeId ?? matchProductType(finalBrandId, lookups.productTypes);
  } else {
    productTypeId = matchProductType(finalBrandId, lookups.productTypes);
    const candidateModels = lookups.models.filter(
      (m) => !m.brandId || m.brandId === finalBrandId
    );
    productModelId = candidateModels[0]?.id ?? lookups.models[0]?.id ?? "";
    const chosenModel = lookups.models.find((m) => m.id === productModelId);
    if (chosenModel) {
      if (chosenModel.brandId) finalBrandId = chosenModel.brandId;
      if (chosenModel.productTypeId) productTypeId = chosenModel.productTypeId;
    }
  }

  const variantId = matchVariant(item.variant, item.description, lookups.variants);
  const colorId = matchColor(item.color, item.description, lookups.colors);

  const s1 = item.serialNumber.trim();
  let s2 = item.serialNumber1?.trim() || "";
  if (!s2 && s1.length > 1) {
    const lastDigit = Number(s1.slice(-1));
    s2 = !isNaN(lastDigit) ? `${s1.slice(0, -1)}${(lastDigit + 1) % 10}` : `${s1}1`;
  }

  const rate = item.taxableRate || 0;
  const cgst = item.cgstRate ?? lookups.taxRates.cgst ?? 9;
  const sgst = item.sgstRate ?? lookups.taxRates.sgst ?? 9;
  const tax = cgst + sgst;
  const total = Number((rate + (rate * tax) / 100).toFixed(2));

  return {
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    lineNumber: index + 1,
    description: item.description,
    brandId: finalBrandId,
    productTypeId,
    productModelId,
    variantId,
    colorId,
    serialNumber: s1,
    serialNumber1: s2,
    purchasePrice: rate,
    discount: 0,
    cgst,
    sgst,
    tax,
    totalAmount: total,
    isActive: true,
  };
}

function createEmptyRow(lookups: ProductLookupsData, index: number): ProductRowItem {
  const defaultModel = lookups.models[0];
  const defaultBrandId = defaultModel?.brandId ?? lookups.brands[0]?.id ?? "";
  const defaultTypeId = defaultModel?.productTypeId ?? lookups.productTypes[0]?.id ?? "";
  const defaultModelId = defaultModel?.id ?? "";
  const defaultVariantId = lookups.variants[0]?.id ?? "";
  const defaultColorId = lookups.colors[0]?.id ?? "";
  const cgst = lookups.taxRates.cgst ?? 9;
  const sgst = lookups.taxRates.sgst ?? 9;

  return {
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    lineNumber: index + 1,
    description: "",
    brandId: defaultBrandId,
    productTypeId: defaultTypeId,
    productModelId: defaultModelId,
    variantId: defaultVariantId,
    colorId: defaultColorId,
    serialNumber: "",
    serialNumber1: "",
    purchasePrice: 0,
    discount: 0,
    cgst,
    sgst,
    tax: cgst + sgst,
    totalAmount: 0,
    isActive: true,
  };
}

function BulkProductCreateForm() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  // Lookups data
  const [lookups, setLookups] = useState<ProductLookupsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invoice Header
  const [header, setHeader] = useState<PurchaseHeaderState>({
    vendorId: "",
    billNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    paymentTermsDays: 7,
  });

  // Product Rows
  const [rows, setRows] = useState<ProductRowItem[]>([]);

  // Invoice Upload & Scanning
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ status: string; percent: number }>({ status: "", percent: 0 });
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [uploadedBill, setUploadedBill] = useState<ExtractedPurchaseBill | null>(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load Lookups on mount
  useEffect(() => {
    let active = true;
    void loadProductLookups()
      .then((loaded) => {
        if (!active) return;
        setLookups(loaded);
        setHeader((prev) => ({
          ...prev,
          vendorId: prev.vendorId || loaded.vendors[0]?.id || "",
        }));
        setRows((prev) => (prev.length === 0 ? [createEmptyRow(loaded, 0)] : prev));
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load product form data.");
      });
    return () => {
      active = false;
    };
  }, []);

  // Populate all multi-line items from invoice
  const applyExtractedBillToAllItems = useCallback((bill: ExtractedPurchaseBill, currentLookups = lookups) => {
    if (!currentLookups) return;

    // 1. Auto-fill Header
    const matchedVendorId = matchVendor(bill.header, currentLookups.vendors);
    setHeader({
      vendorId: matchedVendorId || currentLookups.vendors[0]?.id || "",
      billNumber: bill.header.billNumber,
      purchaseDate: bill.header.billDate || new Date().toISOString().slice(0, 10),
      paymentTermsDays: bill.header.paymentTermsDays || 7,
    });

    // 2. Auto-create multi-line items for ALL items in invoice
    const newRows: ProductRowItem[] = bill.items.map((item, idx) =>
      createRowFromBillItem(item, idx, currentLookups)
    );

    setRows(newRows.length > 0 ? newRows : [createEmptyRow(currentLookups, 0)]);
  }, [lookups]);

  // Handle Document Upload & OCR
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      notifications.error("Invalid File", "Please upload an invoice image (JPG, PNG, WebP) or PDF file.");
      return;
    }

    setActivePresetId(null);
    setIsScanning(true);
    setScanProgress({ status: "Reading invoice document…", percent: 15 });

    try {
      const { text, previewUrl } = await extractTextFromInvoiceDocument(file, (status, percent) => {
        setScanProgress({ status, percent });
      });

      if (previewUrl) {
        setInvoicePreviewUrl(previewUrl);
        setShowDocPreview(true);
      }

      setScanProgress({ status: "Extracting GST line items & IMEI serial numbers…", percent: 90 });
      const parsedBill = parsePurchaseBillText(text);
      setUploadedBill(parsedBill);
      applyExtractedBillToAllItems(parsedBill);

      notifications.success(
        "Invoice Auto-Filled!",
        `Extracted and created ${parsedBill.items.length} product line(s) from ${parsedBill.header.vendorName || "Invoice"}!`
      );
    } catch (err) {
      notifications.error(
        "Scanning Notice",
        err instanceof Error ? err.message : "Could not scan document. Please check the file and try again."
      );
    } finally {
      setIsScanning(false);
      setScanProgress({ status: "", percent: 0 });
    }
  }, [applyExtractedBillToAllItems, notifications]);

  // Handle Preset Select
  const handleSelectPreset = (preset: BillPresetInfo) => {
    if (!lookups) return;
    setActivePresetId(preset.id);
    setInvoicePreviewUrl(preset.imagePath);
    setShowDocPreview(true);
    setZoomLevel(1);
    setRotation(0);

    const bill = preset.getBill();
    setUploadedBill(bill);
    applyExtractedBillToAllItems(bill);

    notifications.success(
      `Loaded: ${preset.vendorName}`,
      `Auto-created ${bill.items.length} line items from Invoice ${preset.invoiceNo} with specs and IMEIs.`
    );
  };

  // Global Clipboard Paste Listener (Ctrl+V anywhere on page)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") &&
        (activeEl as HTMLInputElement).type !== "file"
      ) {
        if (!e.clipboardData?.types.includes("Files")) return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            notifications.info("Processing Copied Image", "Recognized pasted invoice image from clipboard. Extracting details…");
            void handleFileUpload(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handleFileUpload, notifications]);

  // Row operations
  const updateRowField = (id: string, field: keyof ProductRowItem, value: any) => {
    if (!lookups) return;
    setRows((current) =>
      current.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };

        // Cascade model -> brand & productType
        if (field === "productModelId") {
          const model = lookups.models.find((m) => m.id === value);
          if (model) {
            if (model.brandId) updated.brandId = model.brandId;
            if (model.productTypeId) updated.productTypeId = model.productTypeId;
          }
        }

        // Cascade brand -> pick first valid model
        if (field === "brandId") {
          const validModel = lookups.models.find((m) => m.brandId === value);
          if (validModel) {
            updated.productModelId = validModel.id;
            if (validModel.productTypeId) updated.productTypeId = validModel.productTypeId;
          }
        }

        // Recalculate amounts
        if (field === "purchasePrice" || field === "discount" || field === "cgst" || field === "sgst") {
          const price = Number(field === "purchasePrice" ? value : updated.purchasePrice) || 0;
          const disc = Number(field === "discount" ? value : updated.discount) || 0;
          const c = Number(field === "cgst" ? value : updated.cgst) || 0;
          const s = Number(field === "sgst" ? value : updated.sgst) || 0;
          const taxable = Math.max(0, price - disc);
          const t = c + s;
          updated.tax = t;
          updated.totalAmount = Number((taxable + (taxable * t) / 100).toFixed(2));
        }

        return updated;
      })
    );
  };

  const addRow = () => {
    if (!lookups) return;
    setRows((current) => [...current, createEmptyRow(lookups, current.length)]);
  };

  const duplicateRow = (index: number) => {
    const source = rows[index];
    if (!source) return;
    const s1 = source.serialNumber.trim();
    let s2 = source.serialNumber1.trim();
    if (s1.length > 2) {
      const last = Number(s1.slice(-1));
      s2 = !isNaN(last) ? `${s1.slice(0, -1)}${(last + 1) % 10}` : "";
    }
    const cloned: ProductRowItem = {
      ...source,
      id: `row-${Date.now()}-${rows.length}-${Math.random().toString(36).slice(2, 7)}`,
      lineNumber: rows.length + 1,
      serialNumber: "",
      serialNumber1: s2,
    };
    setRows((current) => [...current, cloned]);
  };

  const removeRow = (id: string) => {
    setRows((current) => {
      const filtered = current.filter((r) => r.id !== id);
      return filtered.length > 0 ? filtered : lookups ? [createEmptyRow(lookups, 0)] : [];
    });
  };

  const handleClearInvoice = () => {
    if (!lookups) return;
    setUploadedBill(null);
    setActivePresetId(null);
    setInvoicePreviewUrl(null);
    setShowDocPreview(false);
    setHeader({
      vendorId: lookups.vendors[0]?.id || "",
      billNumber: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      paymentTermsDays: 7,
    });
    setRows([createEmptyRow(lookups, 0)]);
  };

  // Save All Products
  const handleSaveAll = async () => {
    if (!header.vendorId) {
      notifications.error("Vendor Required", "Please select a vendor.");
      return;
    }
    if (!header.billNumber.trim()) {
      notifications.error("Bill Number Required", "Please enter the invoice / bill number.");
      return;
    }
    if (rows.length === 0) {
      notifications.error("No Products", "Please add at least one product line item.");
      return;
    }

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (!r.serialNumber.trim() || !r.serialNumber1.trim()) {
        notifications.error(
          "Serial Numbers Missing",
          `Unit row #${i + 1} (${r.description || `Line ${i + 1}`}) requires both Serial Number and Serial Number 1.`
        );
        return;
      }
      if (!r.productModelId) {
        notifications.error("Model Missing", `Unit row #${i + 1} requires a selected model.`);
        return;
      }
    }

    // Check duplicate serials across rows
    const allSerials = rows
      .flatMap((r) => [r.serialNumber.trim().toLowerCase(), r.serialNumber1.trim().toLowerCase()])
      .filter(Boolean);
    const set = new Set(allSerials);
    if (set.size !== allSerials.length) {
      notifications.error("Duplicate Serials", "All serial numbers must be unique across all units in this purchase.");
      return;
    }

    setIsSubmitting(true);
    try {
      const productsPayload = rows.map((r) => ({
        vendorId: header.vendorId,
        billNumber: header.billNumber.trim(),
        purchaseDate: header.purchaseDate,
        paymentTermsDays: Number(header.paymentTermsDays) || 0,
        brandId: r.brandId,
        productTypeId: r.productTypeId,
        productModelId: r.productModelId,
        variantId: r.variantId,
        colorId: r.colorId,
        serialNumber: r.serialNumber.trim(),
        serialNumber1: r.serialNumber1.trim(),
        purchasePrice: Number(r.purchasePrice) || 0,
        discount: Number(r.discount) || 0,
        cgst: Number(r.cgst) || 0,
        sgst: Number(r.sgst) || 0,
        tax: Number(r.tax) || 0,
        isActive: r.isActive ?? true,
      }));

      await apiClient.post("/products/bulk", { products: productsPayload });

      notifications.success(
        "Purchase Saved Successfully!",
        `Saved ${rows.length} product unit(s) from Invoice "${header.billNumber}" into stock inventory!`
      );

      navigate(
        `${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(
          header.vendorId
        )}&billNumber=${encodeURIComponent(header.billNumber.trim())}`
      );
    } catch (err) {
      notifications.error(
        "Save Failed",
        err instanceof Error ? err.message : "Failed to save purchase products. Please check entries."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Global Ctrl+S Shortcut to Save Products
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (loadError)
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </div>
    );
  if (!lookups) return <p className="text-sm text-slate-500">Loading form data…</p>;

  // Calculations for summary footer
  const totalUnits = rows.length;
  const totalTaxable = rows.reduce((sum, r) => sum + Math.max(0, (r.purchasePrice || 0) - (r.discount || 0)), 0);
  const totalTax = rows.reduce((sum, r) => {
    const taxable = Math.max(0, (r.purchasePrice || 0) - (r.discount || 0));
    return sum + (taxable * (r.tax || 0)) / 100;
  }, 0);
  const grandTotal = totalTaxable + totalTax;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(productResource.listPath)}
            className="grid size-9 place-items-center rounded-xl border border-slate-300 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Back to products list"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Add Purchase Products (Multi-Item Invoice)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload invoice or paste image (<kbd className="rounded border bg-slate-100 px-1 py-0.5 text-[10px] font-mono dark:bg-slate-800">Ctrl+V</kbd>) to automatically create and populate all line items.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(productResource.listPath)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={isSubmitting}
            onClick={() => void handleSaveAll()}
            className="gap-2 shadow-md shadow-indigo-600/20"
          >
            <Save className="size-4" />
            <span>Save All {totalUnits} {totalUnits === 1 ? "Unit" : "Units"}</span>
            <kbd className="hidden rounded bg-indigo-700/60 px-1.5 py-0.5 text-[10px] sm:inline">Ctrl+S</kbd>
          </Button>
        </div>
      </div>

      {/* Upload Invoice Card */}
      <section
        aria-labelledby="upload-invoice-heading"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFileUpload(file);
        }}
        className={`overflow-hidden rounded-2xl border transition-all p-5 shadow-xs ${
          isDraggingOver
            ? "border-indigo-500 bg-indigo-50/90 ring-4 ring-indigo-500/20 dark:bg-indigo-950/40"
            : "border-indigo-100 bg-linear-to-br from-indigo-50/70 via-white to-slate-50 dark:border-indigo-950/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/20"
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Receipt className="size-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="upload-invoice-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Upload Invoice & Auto-Create Line Items
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  <Sparkles className="size-3" /> Multi-Item OCR
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <ClipboardPaste className="size-3" /> Ctrl+V Paste Ready
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Drop invoice file here, paste from clipboard (<kbd className="rounded border bg-slate-100 px-1 py-0.5 text-[10px] font-mono dark:bg-slate-800">Ctrl+V</kbd>), or pick a sample bill below. All items, IMEIs, and taxes will be created automatically.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="primary"
              disabled={isScanning}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <UploadCloud className="size-4" />
              <span>{uploadedBill ? "Replace Invoice" : "Upload Invoice (Image / PDF)"}</span>
            </Button>

            {uploadedBill && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDocPreview((prev) => !prev)}
                  className="gap-1.5"
                  title="Toggle original bill viewer"
                >
                  {showDocPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span>{showDocPreview ? "Hide Preview" : "View Bill"}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearInvoice}
                  className="gap-1.5 text-slate-600 dark:text-slate-400"
                  title="Reset to blank entry"
                >
                  <X className="size-4" />
                  <span>Clear</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 4 Sample Distributor Invoices Selector */}
        {/* <div className="mt-4 pt-3.5 border-t border-indigo-100/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              One-Click Sample Distributor Invoices (Click any to test auto-extraction):
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BILL_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`flex flex-col text-left rounded-xl border p-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-600/20 shadow-xs dark:border-indigo-500 dark:bg-indigo-950/60 dark:ring-indigo-500/30"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {preset.label}
                    </span>
                    {isSelected ? <Check className="size-3.5 text-indigo-600 dark:text-indigo-400" /> : null}
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {preset.invoiceNo}
                  </span>
                  <span className="mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    {preset.itemSummary}
                  </span>
                </button>
              );
            })}
          </div>
        </div> */}

        {/* OCR Scanning Progress Bar */}
        {isScanning && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 dark:border-blue-900/70 dark:bg-blue-950/40">
            <div className="flex items-center gap-3">
              <RefreshCw className="size-4.5 animate-spin text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                  <span>{scanProgress.status}</span>
                  <span className="font-mono">{scanProgress.percent}%</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${scanProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Bill Notification Badge */}
        {uploadedBill && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1 font-bold">
                <CheckCircle2 className="size-3.5 text-emerald-600" /> Verified Auto-Extraction:
              </span>
              <span>Vendor: <strong>{uploadedBill.header.vendorName}</strong></span>
              <span>Invoice: <strong className="font-mono">{uploadedBill.header.billNumber}</strong></span>
              <span>Date: <strong className="font-mono">{uploadedBill.header.billDate}</strong></span>
              <span>Grand Total: <strong className="font-mono">₹{uploadedBill.summary.grandTotal.toLocaleString("en-IN")}</strong></span>
              <span className="rounded bg-emerald-200/60 px-1.5 py-0.5 font-bold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100">
                {uploadedBill.items.length} line items auto-created below
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Document Viewer */}
        {showDocPreview && invoicePreviewUrl && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <FileText className="size-3.5 text-indigo-600" />
                <span>Uploaded Document Preview</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Rotate 90°"
                >
                  <RotateCw className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="flex max-h-[450px] items-center justify-center overflow-auto rounded-lg bg-slate-50 p-2 dark:bg-slate-900">
              <img
                src={invoicePreviewUrl}
                alt="Invoice document"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
                className="max-h-[420px] w-auto rounded object-contain shadow-xs transition-transform duration-200"
              />
            </div>
          </div>
        )}
      </section>

      {/* Invoice Header Form Details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 dark:border-slate-800">
          <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Invoice & Vendor Shared Details
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Vendor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vendor / Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={header.vendorId}
              onChange={(e) => setHeader((prev) => ({ ...prev, vendorId: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">-- Select Vendor --</option>
              {lookups.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.gstNumber ? `(${v.gstNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice / Bill No */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vendor Bill / Invoice Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <input
                type="text"
                required
                value={header.billNumber}
                onChange={(e) => setHeader((prev) => ({ ...prev, billNumber: e.target.value }))}
                placeholder="e.g. NT-26/27-2962"
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Vendor Invoice Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <input
                type="date"
                required
                value={header.purchaseDate}
                onChange={(e) => setHeader((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Terms (days)
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={header.paymentTermsDays}
              onChange={(e) => setHeader((prev) => ({ ...prev, paymentTermsDays: Number(e.target.value) || 0 }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>
      </section>

      {/* Multi-Line Items Products Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-2 p-5 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Purchase Line Items ({rows.length})
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Each row represents a product unit to be added into stock inventory.
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            className="gap-1.5 self-start text-xs"
          >
            <Plus className="size-3.5" />
            <span>Add Product Line</span>
          </Button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <th className="py-2.5 px-3 text-center w-10">#</th>
                <th className="py-2.5 px-3 min-w-[140px]">Brand</th>
                <th className="py-2.5 px-3 min-w-[180px]">Model</th>
                <th className="py-2.5 px-3 min-w-[110px]">Variant</th>
                <th className="py-2.5 px-3 min-w-[110px]">Color</th>
                <th className="py-2.5 px-3 min-w-[150px]">IMEI / Serial 1 <span className="text-red-500">*</span></th>
                <th className="py-2.5 px-3 min-w-[150px]">IMEI / Serial 2 <span className="text-red-500">*</span></th>
                <th className="py-2.5 px-3 min-w-[100px] text-right">Taxable Rate (₹)</th>
                <th className="py-2.5 px-3 min-w-[70px] text-right">GST %</th>
                <th className="py-2.5 px-3 min-w-[110px] text-right">Total (₹)</th>
                <th className="py-2.5 px-3 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, idx) => {
                const availableModels = lookups.models.filter((m) => !row.brandId || m.brandId === row.brandId);
                const displayModels = availableModels.length > 0 ? availableModels : lookups.models;

                return (
                  <tr
                    key={row.id}
                    className="group hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    {/* Index */}
                    <td className="py-2 px-3 text-center font-bold text-slate-400">
                      {idx + 1}
                    </td>

                    {/* Brand */}
                    <td className="py-2 px-3">
                      <select
                        value={row.brandId}
                        onChange={(e) => updateRowField(row.id, "brandId", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {lookups.brands.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Model */}
                    <td className="py-2 px-3">
                      <select
                        value={row.productModelId}
                        onChange={(e) => updateRowField(row.id, "productModelId", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {displayModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Variant */}
                    <td className="py-2 px-3">
                      <select
                        value={row.variantId}
                        onChange={(e) => updateRowField(row.id, "variantId", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {lookups.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Color */}
                    <td className="py-2 px-3">
                      <select
                        value={row.colorId}
                        onChange={(e) => updateRowField(row.id, "colorId", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      >
                        {lookups.colors.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Serial Number 1 */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={row.serialNumber}
                        onChange={(e) => updateRowField(row.id, "serialNumber", e.target.value)}
                        placeholder="e.g. 865238087752275"
                        className={`w-full rounded-lg border px-2 py-1.5 font-mono text-xs outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white ${
                          !row.serialNumber.trim()
                            ? "border-amber-300 bg-amber-50/50 dark:border-amber-800"
                            : "border-slate-200 bg-white dark:border-slate-700"
                        }`}
                      />
                    </td>

                    {/* Serial Number 2 */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={row.serialNumber1}
                        onChange={(e) => updateRowField(row.id, "serialNumber1", e.target.value)}
                        placeholder="e.g. 865238087752276"
                        className={`w-full rounded-lg border px-2 py-1.5 font-mono text-xs outline-none focus:border-indigo-500 dark:bg-slate-800 dark:text-white ${
                          !row.serialNumber1.trim()
                            ? "border-amber-300 bg-amber-50/50 dark:border-amber-800"
                            : "border-slate-200 bg-white dark:border-slate-700"
                        }`}
                      />
                    </td>

                    {/* Purchase Price */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={row.purchasePrice}
                        onChange={(e) => updateRowField(row.id, "purchasePrice", Number(e.target.value) || 0)}
                        className="w-24 text-right rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* GST % */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.tax}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          updateRowField(row.id, "cgst", val / 2);
                          updateRowField(row.id, "sgst", val / 2);
                        }}
                        className="w-16 text-right rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </td>

                    {/* Total Amount */}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₹{row.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Actions */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateRow(idx)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="Duplicate row"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          title="Remove row"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Totals Summary Bar & Action Button */}
        <div className="flex flex-col gap-4 bg-slate-50 p-5 border-t border-slate-200 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Units: </span>
              <strong className="text-slate-900 dark:text-slate-100">{totalUnits}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Taxable: </span>
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                ₹{totalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total GST: </span>
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                ₹{totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="rounded-lg bg-indigo-50 px-3 py-1 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200">
              <span className="font-semibold">Grand Total: </span>
              <strong className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={addRow}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Unit Row</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isSubmitting}
              onClick={() => void handleSaveAll()}
              className="gap-2 shadow-md shadow-indigo-600/20"
            >
              <Save className="size-4" />
              <span>Save All {totalUnits} {totalUnits === 1 ? "Unit" : "Units"}</span>
              <kbd className="hidden rounded bg-indigo-700/60 px-1.5 py-0.5 text-[10px] sm:inline">Ctrl+S</kbd>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function BulkProductUpdateForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedProducts = (location.state as { products?: Product[] } | null)?.products ?? [];
  const [fields, setFields] = useState<Awaited<ReturnType<typeof productResource.loadFields>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serialPairs, setSerialPairs] = useState(() => selectedProducts.map((product) => ({
    serialNumber: product.serialNumber ?? "",
    serialNumber1: product.serialNumber1 ?? "",
  })));

  useEffect(() => {
    if (selectedProducts.length === 0) return;
    let active = true;
    void productResource.loadFields().then((loadedFields) => {
      if (active) setFields(loadedFields.filter((field) => ["purchasePrice", "discount", "cgst", "sgst", "tax", "totalAmount"].includes(field.name)));
    }).catch((reason: unknown) => {
      if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load product form data.");
    });
    return () => { active = false; };
  }, [selectedProducts.length]);

  if (selectedProducts.length === 0)
    return <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
      <p>Select one or more products from the product list to bulk update their pricing.</p>
      <Button variant="secondary" onClick={() => navigate(productResource.listPath)}>Back to products</Button>
    </section>;
  if (loadError) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>;
  if (!fields) return <p className="text-sm text-slate-500">Loading form…</p>;

  const first = selectedProducts[0]!;
  const initialValues = {
    purchasePrice: first.purchasePrice,
    discount: first.discount ?? 0,
    cgst: first.cgst ?? 0,
    sgst: first.sgst ?? 0,
    tax: first.tax ?? Number(first.cgst ?? 0) + Number(first.sgst ?? 0),
  };

  return (
    <DynamicForm
      title="Bulk Update Products"
      description={`Update purchase pricing and tax for ${selectedProducts.length} selected products. Each product's serial numbers and sold status will be preserved.`}
      fields={fields}
      initialValues={initialValues}
      columnsPerRow={3}
      submitLabel={`Update ${selectedProducts.length} ${selectedProducts.length === 1 ? "product" : "products"}`}
      onCancel={() => navigate(productResource.listPath)}
      onSubmit={async (values) => {
        if (serialPairs.some((pair) => !pair.serialNumber.trim() || !pair.serialNumber1.trim()))
          throw new Error("Enter both serial numbers for every selected product.");
        const products = selectedProducts.map((product, index) => {
          const pair = serialPairs[index] ?? { serialNumber: "", serialNumber1: "" };
          return {
            id: product.id,
            vendorId: product.vendorId,
            brandId: product.brandId,
            productTypeId: product.productTypeId,
            productModelId: product.productModelId,
            variantId: product.variantId,
            colorId: product.colorId,
            billNumber: product.billNumber,
            serialNumber: pair.serialNumber.trim(),
            serialNumber1: pair.serialNumber1.trim(),
            purchasePrice: Number(values.purchasePrice),
            discount: Number(values.discount ?? 0),
            cgst: Number(values.cgst ?? 0),
            sgst: Number(values.sgst ?? 0),
            tax: Number(values.tax ?? Number(values.cgst ?? 0) + Number(values.sgst ?? 0)),
          };
        });
        await productResource.api.bulkUpdate(products);
        navigate(productResource.listPath);
      }}
    >
      <section className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Selected products ({selectedProducts.length})</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {selectedProducts.map((product, index) => <div key={product.id} className="grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[minmax(8rem,0.7fr)_1fr_1fr] dark:bg-slate-800/50">
            <span className="self-center text-sm font-medium">{product.productModelName ?? `Product ${index + 1}`}</span>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Serial Number
              <input required maxLength={100} autoComplete="off" value={serialPairs[index]?.serialNumber ?? ""} onChange={(event) => setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, serialNumber: event.target.value } : pair))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Serial Number 1
              <input required maxLength={100} autoComplete="off" value={serialPairs[index]?.serialNumber1 ?? ""} onChange={(event) => setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, serialNumber1: event.target.value } : pair))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
            </label>
          </div>)}
        </div>
      </section>
    </DynamicForm>
  );
}


export function ProductFormPage({ mode }: { mode: "create" | "edit" | "bulk-update" }) {
  if (mode === "create") return <BulkProductCreateForm />;
  if (mode === "bulk-update") return <BulkProductUpdateForm />;
  return <ResourceFormPage {...productResource} mode={mode} />;
}
