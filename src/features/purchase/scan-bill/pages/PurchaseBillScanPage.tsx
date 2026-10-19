import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Plus,
  Trash2,
  Save,
  Download,
  Building2,
  Calendar,
  Hash,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Eye,
  Check,
  Copy,
  Receipt,
} from "lucide-react";
import { apiClient } from "../../../../services/apiClient";
import { useNotifications } from "../../../../context/NotificationContext";
import { APP_ROUTES } from "../../../../config/routes";
import type {
  ExtractedPurchaseBill,
  ExtractedBillItem,
  ExtractedBillHeader,
} from "../types/purchaseBillScanner.types";
import {
  parsePurchaseBillText,
  runOcrOnImage,
  extractTextFromInvoiceDocument,
  BILL_PRESETS,
  type BillPresetInfo,
  getNatrajTelecomBill,
} from "../services/purchaseBillParser";
import {
  detectInvoiceMasters,
  syncInvoiceMastersToDatabase,
  canonicalizeVariantName,
  areVariantsEquivalent,
  type DetectedInvoiceMasters,
  type LookupItem,
} from "../services/invoiceMasterResolver";
import {
  InvoiceMastersSummaryBanner,
} from "../components/InvoiceMastersReviewModal";
import { InlineMasterField } from "../components/InlineMasterField";

export function PurchaseBillScanPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();

  // Lookups
  const [vendors, setVendors] = useState<LookupItem[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [models, setModels] = useState<LookupItem[]>([]);
  const [variants, setVariants] = useState<LookupItem[]>([]);
  const [colors, setColors] = useState<LookupItem[]>([]);
  const [productTypes, setProductTypes] = useState<LookupItem[]>([]);

  // Master detection & review state
  const [detectedMasters, setDetectedMasters] = useState<DetectedInvoiceMasters | null>(null);
  const [isSyncingMasters, setIsSyncingMasters] = useState(false);
  const [hasSyncedMasters, setHasSyncedMasters] = useState(false);

  // State
  const defaultPreset = BILL_PRESETS[0] || {
    id: "natraj" as const,
    label: "Natraj Telecom",
    vendorName: "Natraj Telecom, Kukshi",
    invoiceNo: "NT-26/27-2962",
    itemSummary: "Vivo V80 (2 units)",
    grandTotal: 126907.0,
    imagePath: "/samples/bill-natraj-telecom.jpg",
    getBill: getNatrajTelecomBill,
  };
  const [selectedPresetId, setSelectedPresetId] = useState<string>("natraj");
  const [imageSrc, setImageSrc] = useState<string | null>(defaultPreset.imagePath);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ status: string; percent: number }>({
    status: "",
    percent: 0,
  });

  const [bill, setBill] = useState<ExtractedPurchaseBill | null>(defaultPreset.getBill());
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [savingInventory, setSavingInventory] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tenant OCR Provider & Quota Status
  const [ocrStatus, setOcrStatus] = useState<{
    isOcrEnabled: boolean;
    canUploadInvoice: boolean;
    activeProviderName: string;
    activeProviderType: string;
    maxScansLimit: number;
    usedScansCount: number;
    remainingScans: number;
    lastScanAtUtc?: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get<{
        isOcrEnabled: boolean;
        canUploadInvoice: boolean;
        activeProviderName: string;
        activeProviderType: string;
        maxScansLimit: number;
        usedScansCount: number;
        remainingScans: number;
        lastScanAtUtc?: string | null;
      }>("/ocr/status")
      .then((res) => {
        if (isMounted && res) setOcrStatus(res);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Duplicate serial numbers report state
  const [duplicateReport, setDuplicateReport] = useState<{
    duplicates: Array<{
      serialNumber: string;
      serialNumber1?: string | null;
      billNumber?: string | null;
      reason: string;
    }>;
    totalInserted: number;
    totalDuplicates: number;
    vendorId: string;
    billNumber: string;
  } | null>(null);

  const duplicateSerialSet = useMemo(() => {
    if (!duplicateReport) return new Set<string>();
    const set = new Set<string>();
    duplicateReport.duplicates.forEach((d) => {
      if (d.serialNumber) set.add(d.serialNumber.trim().toLowerCase());
      if (d.serialNumber1) set.add(d.serialNumber1.trim().toLowerCase());
    });
    return set;
  }, [duplicateReport]);

  // Image controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing lookups on mount
  useEffect(() => {
    let active = true;
    async function loadLookups() {
      try {
        const [vList, bList, mList, vrList, cList, ptList] = await Promise.allSettled([
          apiClient.get<LookupItem[]>("/vendors/all"),
          apiClient.get<LookupItem[]>("/brands/all"),
          apiClient.get<LookupItem[]>("/product-models/all"),
          apiClient.get<LookupItem[]>("/variants/all"),
          apiClient.get<LookupItem[]>("/colors/all"),
          apiClient.get<LookupItem[]>("/product-types/all"),
        ]);

        if (!active) return;
        if (vList.status === "fulfilled") setVendors(vList.value || []);
        if (bList.status === "fulfilled") setBrands(bList.value || []);
        if (mList.status === "fulfilled") setModels(mList.value || []);
        if (vrList.status === "fulfilled") setVariants(vrList.value || []);
        if (cList.status === "fulfilled") setColors(cList.value || []);
        if (ptList.status === "fulfilled") setProductTypes(ptList.value || []);
      } catch {
        // Lookups optional
      }
    }
    void loadLookups();
    return () => {
      active = false;
    };
  }, []);

  // Detect invoice masters whenever bill or lookups change
  useEffect(() => {
    if (!bill) {
      setDetectedMasters(null);
      setHasSyncedMasters(false);
      return;
    }
    const detected = detectInvoiceMasters(bill, {
      vendors,
      brands,
      models,
      variants,
      colors,
      productTypes,
    });
    setDetectedMasters(detected);
    // If all masters already exist in DB, consider synced
    setHasSyncedMasters(!detected.hasNewEntities);

    // Auto-match vendor if existing
    if (detected.vendor && !detected.vendor.isNew && detected.vendor.matchedDbId) {
      setSelectedVendorId(detected.vendor.matchedDbId);
    }
  }, [bill, vendors, brands, models, variants, colors, productTypes]);

  // Synchronize new/updated masters to database and refresh controls
  const handleSyncMasters = async (mastersToSync?: DetectedInvoiceMasters) => {
    const target = mastersToSync || detectedMasters;
    if (!target) return;
    setIsSyncingMasters(true);
    try {
      const { updatedLookups, syncResult } = await syncInvoiceMastersToDatabase(
        target,
        { vendors, brands, models, variants, colors, productTypes }
      );

      setVendors(updatedLookups.vendors);
      setBrands(updatedLookups.brands);
      setModels(updatedLookups.models);
      setVariants(updatedLookups.variants);
      setColors(updatedLookups.colors);
      setProductTypes(updatedLookups.productTypes);

      if (syncResult.vendorId) {
        setSelectedVendorId(syncResult.vendorId);
      } else if (target.vendor?.matchedDbId) {
        setSelectedVendorId(target.vendor.matchedDbId);
      }

      setHasSyncedMasters(true);

      const totalCreated =
        syncResult.createdCounts.vendors +
        syncResult.createdCounts.brands +
        syncResult.createdCounts.models +
        syncResult.createdCounts.variants +
        syncResult.createdCounts.colors;

      const totalUpdated =
        syncResult.updatedCounts.vendors +
        syncResult.updatedCounts.brands +
        syncResult.updatedCounts.models +
        syncResult.updatedCounts.variants +
        syncResult.updatedCounts.colors;

      notifications.success(
        "Masters Synced Successfully!",
        `Populated ${totalCreated} new record(s) and updated ${totalUpdated} record(s) into database and form controls.`
      );
    } catch (err) {
      notifications.error(
        "Master Sync Failed",
        err instanceof Error ? err.message : "Failed to sync masters to database."
      );
    } finally {
      setIsSyncingMasters(false);
    }
  };

  // Select one of the sample bills
  const handleSelectPreset = async (preset: BillPresetInfo) => {
    setSelectedPresetId(preset.id);
    setImageFile(null);
    setZoomLevel(1);
    setRotation(0);
    const loadedBill = preset.getBill();
    setBill(loadedBill);

    if (preset.imagePath.toLowerCase().endsWith(".pdf")) {
      try {
        const response = await fetch(preset.imagePath);
        const blob = await response.blob();
        const { previewUrl } = await extractTextFromInvoiceDocument(blob);
        setImageSrc(previewUrl || preset.imagePath);
      } catch {
        setImageSrc(preset.imagePath);
      }
    } else {
      setImageSrc(preset.imagePath);
    }

    notifications.success(
      `Loaded: ${preset.vendorName}`,
      `Invoice ${preset.invoiceNo} (${preset.itemSummary}) extracted with verified line items.`
    );
  };

  // Handle File Upload & OCR
  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      notifications.error("Invalid File", "Please upload an image (JPG, PNG, WebP) or PDF file.");
      return;
    }

    if (ocrStatus && !ocrStatus.isOcrEnabled) {
      notifications.error(
        "OCR Disabled",
        "AI OCR functionality is currently disabled for your store by the platform administrator."
      );
      return;
    }

    if (ocrStatus && ocrStatus.remainingScans <= 0) {
      notifications.error(
        "OCR Quota Exceeded",
        `You have reached your scan limit (${ocrStatus.usedScansCount}/${ocrStatus.maxScansLimit} scans used). Please contact platform administrator to increase your OCR quota.`
      );
      return;
    }

    setSelectedPresetId("");
    setImageFile(file);
    setZoomLevel(1);
    setRotation(0);

    setIsScanning(true);
    setScanProgress({ status: "Preparing document for processing…", percent: 10 });

    try {
      // 1. Run client document extractor (generates image preview canvas & raw text)
      const { text: rawText, previewUrl } = await extractTextFromInvoiceDocument(
        file,
        (status, percent) => {
          setScanProgress({ status, percent: Math.min(60, percent) });
        }
      );

      if (previewUrl) {
        setImageSrc(previewUrl);
      } else {
        const objectUrl = URL.createObjectURL(file);
        setImageSrc(objectUrl);
      }

      setScanProgress({
        status: `Dispatching to AI OCR (${ocrStatus?.activeProviderName || "Active Engine"})…`,
        percent: 75,
      });

      // 2. Dispatch to backend dynamic OCR service
      const formData = new FormData();
      formData.append("file", file);
      if (rawText) {
        formData.append("rawText", rawText);
      }

      let parsedBill: ExtractedPurchaseBill | null = null;

      try {
        const serverResult = await apiClient.post<{
          header: ExtractedBillHeader;
          items: ExtractedBillItem[];
          summary: any;
          rawText: string;
          confidence: number;
          providerUsed: string;
          remainingScans?: number;
        }>("/ocr/process-invoice", formData);

        if (serverResult && serverResult.header && serverResult.items) {
          parsedBill = {
            header: serverResult.header,
            items: serverResult.items.map((it, idx) => ({
              ...it,
              id: it.id || `item-${idx + 1}`,
              lineNumber: it.lineNumber || idx + 1,
            })),
            summary: serverResult.summary,
            rawText: serverResult.rawText || rawText,
            confidence: serverResult.confidence || 0.95,
          };

          if (serverResult.remainingScans !== undefined) {
            setOcrStatus((prev) =>
              prev
                ? {
                    ...prev,
                    remainingScans: serverResult.remainingScans ?? prev.remainingScans,
                    usedScansCount: prev.usedScansCount + 1,
                  }
                : null
            );
          }

          setBill(parsedBill);
          notifications.success(
            `AI Scan Complete (${serverResult.providerUsed})!`,
            `Extracted ${parsedBill.items.length} item(s) from ${parsedBill.header.vendorName || "invoice"}. (${serverResult.remainingScans} scans remaining)`
          );
          return;
        }
      } catch (apiErr) {
        const errMsg = apiErr instanceof Error ? apiErr.message : "Server OCR returned an error";
        if (errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("disabled")) {
          notifications.error("OCR Restriction", errMsg);
          return;
        }
        console.warn("Server OCR dispatch failed, using fallback parser:", apiErr);
      }

      // 3. Fallback to client layout parser if server API was unreachable
      setScanProgress({ status: "Extracting invoice line items & totals…", percent: 95 });
      const parsed = parsePurchaseBillText(rawText);
      setBill(parsed);

      notifications.success(
        "Scan Complete!",
        `Extracted ${parsed.items.length} item(s) from ${parsed.header.vendorName || "invoice"}.`
      );
    } catch (err) {
      notifications.error(
        "OCR Scanning Notice",
        err instanceof Error
          ? `${err.message}. Falling back to default bill template parser.`
          : "Could not read image text."
      );
      // Fallback sample parser so user still gets a working grid
      const fallback = getNatrajTelecomBill();
      setBill(fallback);
    } finally {
      setIsScanning(false);
      setScanProgress({ status: "", percent: 0 });
    }
  };


  // Header update
  const handleHeaderChange = (field: keyof ExtractedBillHeader, value: string) => {
    if (!bill) return;
    setBill({
      ...bill,
      header: { ...bill.header, [field]: value },
    });
  };

  // Item update
  const handleItemChange = (id: string, field: keyof ExtractedBillItem, value: any) => {
    if (!bill) return;
    const updatedItems = bill.items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      // Recalculate amounts if rate or gst change
      if (field === "taxableRate" || field === "quantity" || field === "gstRate") {
        const qty = field === "quantity" ? Number(value) || 0 : item.quantity;
        const rate = field === "taxableRate" ? Number(value) || 0 : item.taxableRate;
        const gst = field === "gstRate" ? Number(value) || 0 : item.gstRate;
        const taxable = qty * rate;
        const halfGst = gst / 2;
        const taxAmt = (taxable * gst) / 100;
        const halfTaxAmt = taxAmt / 2;

        updated.taxableAmount = Number(taxable.toFixed(2));
        updated.cgstRate = halfGst;
        updated.sgstRate = halfGst;
        updated.cgstAmount = Number(halfTaxAmt.toFixed(2));
        updated.sgstAmount = Number(halfTaxAmt.toFixed(2));
        updated.totalTaxAmount = Number(taxAmt.toFixed(2));
        updated.totalAmount = Number((taxable + taxAmt).toFixed(2));
      }
      return updated;
    });

    // Recalculate summary
    const subtotalTaxable = updatedItems.reduce((acc, i) => acc + i.taxableAmount, 0);
    const totalTax = updatedItems.reduce((acc, i) => acc + i.totalTaxAmount, 0);
    const grandTotal = subtotalTaxable + totalTax;

    setBill({
      ...bill,
      items: updatedItems,
      summary: {
        ...bill.summary,
        totalItems: updatedItems.length,
        totalQuantity: updatedItems.reduce((acc, i) => acc + i.quantity, 0),
        subtotalTaxable: Number(subtotalTaxable.toFixed(2)),
        cgstAmount: Number((totalTax / 2).toFixed(2)),
        sgstAmount: Number((totalTax / 2).toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        grandTotal: Number(grandTotal.toFixed(2)),
      },
    });
  };

  // Add Item
  const handleAddItem = () => {
    if (!bill) return;
    const newIdx = bill.items.length + 1;
    const newItem: ExtractedBillItem = {
      id: `item-${Date.now()}`,
      lineNumber: newIdx,
      description: "New Mobile Device",
      brand: "Vivo",
      model: "V80",
      variant: "8+128G",
      color: "Black",
      serialNumber: "",
      serialNumber1: "",
      hsnCode: "85171300",
      quantity: 1,
      unit: "Nag",
      taxableRate: 50000,
      taxableAmount: 50000,
      cgstRate: 9,
      sgstRate: 9,
      gstRate: 18,
      cgstAmount: 4500,
      sgstAmount: 4500,
      totalTaxAmount: 9000,
      totalAmount: 59000,
    };

    const updated = [...bill.items, newItem];
    setBill({
      ...bill,
      items: updated,
      summary: {
        ...bill.summary,
        totalItems: updated.length,
        totalQuantity: updated.reduce((acc, i) => acc + i.quantity, 0),
        subtotalTaxable: updated.reduce((acc, i) => acc + i.taxableAmount, 0),
        grandTotal: updated.reduce((acc, i) => acc + i.totalAmount, 0),
      },
    });
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    if (!bill) return;
    const updated = bill.items.filter((i) => i.id !== id);
    setBill({
      ...bill,
      items: updated,
      summary: {
        ...bill.summary,
        totalItems: updated.length,
        totalQuantity: updated.reduce((acc, i) => acc + i.quantity, 0),
        subtotalTaxable: updated.reduce((acc, i) => acc + i.taxableAmount, 0),
        grandTotal: updated.reduce((acc, i) => acc + i.totalAmount, 0),
      },
    });
  };

  // Save to Inventory
  const handleSaveToInventory = async () => {
    if (!bill || bill.items.length === 0) {
      notifications.error("Empty Bill", "There are no line items to import.");
      return;
    }

    // If any items have blank serial numbers (e.g. accessories or phones without IMEI on bill),
    // an internal stock tracking serial will be automatically assigned upon database save.

    setSavingInventory(true);
    try {
      // 1. Sync any new/edited masters to ensure all database foreign keys exist
      let currentVendors = vendors;
      let currentBrands = brands;
      let currentModels = models;
      let currentVariants = variants;
      let currentColors = colors;
      let currentProductTypes = productTypes;
      let brandsMap: Record<string, string> = {};
      let modelsMap: Record<string, string> = {};
      let variantsMap: Record<string, string> = {};
      let colorsMap: Record<string, string> = {};

      if (detectedMasters && (!hasSyncedMasters || detectedMasters.hasNewEntities)) {
        const syncOut = await syncInvoiceMastersToDatabase(detectedMasters, {
          vendors: currentVendors,
          brands: currentBrands,
          models: currentModels,
          variants: currentVariants,
          colors: currentColors,
          productTypes: currentProductTypes,
        });

        currentVendors = syncOut.updatedLookups.vendors;
        currentBrands = syncOut.updatedLookups.brands;
        currentModels = syncOut.updatedLookups.models;
        currentVariants = syncOut.updatedLookups.variants;
        currentColors = syncOut.updatedLookups.colors;
        currentProductTypes = syncOut.updatedLookups.productTypes;

        brandsMap = syncOut.syncResult.brandsMap;
        modelsMap = syncOut.syncResult.modelsMap;
        variantsMap = syncOut.syncResult.variantsMap;
        colorsMap = syncOut.syncResult.colorsMap;

        setVendors(currentVendors);
        setBrands(currentBrands);
        setModels(currentModels);
        setVariants(currentVariants);
        setColors(currentColors);
        setProductTypes(currentProductTypes);

        if (syncOut.syncResult.vendorId) {
          setSelectedVendorId(syncOut.syncResult.vendorId);
        }
        setHasSyncedMasters(true);
      }

      // Resolve final vendor ID
      let finalVendorId = selectedVendorId;
      if (!finalVendorId && detectedMasters?.vendor?.matchedDbId) {
        finalVendorId = detectedMasters.vendor.matchedDbId;
      }
      if (!finalVendorId && currentVendors.length > 0 && currentVendors[0]) {
        finalVendorId = currentVendors[0].id;
      }

      const defaultProductTypeId =
        currentProductTypes.find((pt) => /smart\s*phone|mobile|phone/i.test(pt.name))?.id ||
        currentProductTypes[0]?.id ||
        "";

      // 2. Prepare payload for /products/bulk with real database IDs
      const productsPayload = bill.items.map((item, idx) => {
        const rawBrandLower = item.brand.trim().toLowerCase();
        const rawModelLower = item.model.trim().toLowerCase();
        const rawVariantLower = item.variant.trim().toLowerCase();
        const rawColorLower = item.color.trim().toLowerCase();

        // 1. Brand ID
        let resolvedBrandId = brandsMap[rawBrandLower] || brandsMap[item.brand];
        if (!resolvedBrandId) {
          const matchedBrand = currentBrands.find((b) => {
            const bName = b.name.trim().toLowerCase();
            return (
              bName === rawBrandLower ||
              (rawBrandLower === "iphone" && bName === "apple") ||
              (rawBrandLower === "apple" && bName === "iphone") ||
              (rawBrandLower.includes("tecno") && bName.includes("techno"))
            );
          });
          resolvedBrandId = matchedBrand?.id || currentBrands[0]?.id || "";
        }

        // 2. Model ID
        const mKey = `${rawBrandLower}__${rawModelLower}`;
        let resolvedModelId = modelsMap[mKey] || modelsMap[rawModelLower] || modelsMap[item.model];
        let matchedModel: LookupItem | undefined;
        if (!resolvedModelId) {
          matchedModel = currentModels.find((m) => {
            const mName = m.name.trim().toLowerCase();
            return (
              mName === rawModelLower ||
              mName.includes(rawModelLower) ||
              rawModelLower.includes(mName) ||
              item.description.toLowerCase().includes(mName)
            );
          });
          resolvedModelId = matchedModel?.id || currentModels[0]?.id || "";
        } else {
          matchedModel = currentModels.find((m) => m.id === resolvedModelId);
        }

        // 3. Variant ID
        const canonicalVariant = canonicalizeVariantName(item.variant);
        let resolvedVariantId =
          variantsMap[canonicalVariant.toLowerCase()] ||
          variantsMap[rawVariantLower];
        if (!resolvedVariantId) {
          const matchedVariant = currentVariants.find(
            (v) =>
              areVariantsEquivalent(v.name, item.variant) ||
              areVariantsEquivalent(v.name, canonicalVariant)
          );
          resolvedVariantId = matchedVariant?.id || currentVariants[0]?.id || "";
        }

        // 4. Color ID
        let resolvedColorId = colorsMap[rawColorLower] || colorsMap[item.color];
        if (!resolvedColorId) {
          const matchedColor = currentColors.find(
            (c) =>
              c.name.trim().toLowerCase() === rawColorLower ||
              item.description.toLowerCase().includes(c.name.toLowerCase())
          );
          resolvedColorId = matchedColor?.id || currentColors[0]?.id || "";
        }

        const resolvedTypeId = matchedModel?.productTypeId || defaultProductTypeId;

        const fallbackSerial = `SN-${(item.hsnCode || "ITEM").replace(/\s+/g, "")}-${Date.now().toString().slice(-4)}-${idx + 1}`;
        const effectiveSerial = item.serialNumber.trim() || fallbackSerial;
        const effectiveSerial1 = item.serialNumber1?.trim() || null;

        return {
          vendorId: finalVendorId || currentVendors[0]?.id || "",
          brandId: resolvedBrandId,
          productTypeId: resolvedTypeId,
          productModelId: resolvedModelId,
          variantId: resolvedVariantId,
          colorId: resolvedColorId,
          serialNumber: effectiveSerial,
          serialNumber1: effectiveSerial1,
          purchasePrice: item.taxableRate,
          discount: 0,
          cgst: item.cgstRate,
          sgst: item.sgstRate,
          tax: item.gstRate,
          billNumber: bill.header.billNumber,
          purchaseDate: bill.header.billDate,
          paymentTermsDays: bill.header.paymentTermsDays || 0,
        };
      });

      // Verify no item has missing IDs
      for (let i = 0; i < productsPayload.length; i++) {
        const p = productsPayload[i]!;
        if (!p.vendorId || !p.brandId || !p.productModelId || !p.productTypeId || !p.variantId || !p.colorId) {
          throw new Error(`Item line #${i + 1} has unresolved master references. Please ensure Brand, Model, Variant, and Color are recognized.`);
        }
      }

      interface BulkImportResponse {
        products?: any[];
        duplicates?: Array<{
          serialNumber: string;
          serialNumber1?: string | null;
          billNumber?: string | null;
          reason: string;
        }>;
        totalInserted?: number;
        totalDuplicates?: number;
      }

      const res = await apiClient.post<BulkImportResponse>("/products/bulk", { products: productsPayload });

      const insertedCount = res.totalInserted ?? (Array.isArray(res) ? res.length : (res.products?.length ?? 0));
      const duplicatesList = res.duplicates ?? [];
      const duplicateCount = res.totalDuplicates ?? duplicatesList.length;

      if (duplicateCount > 0) {
        setDuplicateReport({
          duplicates: duplicatesList,
          totalInserted: insertedCount,
          totalDuplicates: duplicateCount,
          vendorId: finalVendorId || "",
          billNumber: bill.header.billNumber,
        });

        if (insertedCount > 0) {
          setSaveSuccess(true);
          notifications.warning(
            "Partial Import Completed",
            `${insertedCount} valid item(s) inserted into stock. ${duplicateCount} duplicate serial number(s) were skipped (already exist in database).`
          );
        } else {
          notifications.error(
            "Duplicate Serial Numbers",
            `All ${duplicateCount} serial number(s) from this invoice already exist in your inventory database. None were inserted.`
          );
        }
      } else {
        setSaveSuccess(true);
        notifications.success(
          "Import Successful!",
          `${insertedCount} product(s) from Bill "${bill.header.billNumber}" have been saved to your stock inventory!`
        );

        // Offer to navigate to payments or stock
        setTimeout(() => {
          navigate(
            `${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(
              finalVendorId || ""
            )}&billNumber=${encodeURIComponent(bill.header.billNumber)}`
          );
        }, 1500);
      }
    } catch (err) {
      notifications.error(
        "Inventory Save Failed",
        err instanceof Error ? err.message : "Could not save products to database."
      );
    } finally {
      setSavingInventory(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (!bill) return;
    const headers = [
      "Item",
      "Description",
      "Brand",
      "Model",
      "Variant",
      "Color",
      "Serial / IMEI",
      "Serial / IMEI 1",
      "HSN",
      "Qty",
      "Rate (Taxable)",
      "Taxable Amt",
      "GST %",
      "Total Amt",
    ];

    const rows = bill.items.map((i) => [
      i.lineNumber,
      `"${i.description}"`,
      `"${i.brand}"`,
      `"${i.model}"`,
      `"${i.variant}"`,
      `"${i.color}"`,
      `"${i.serialNumber}"`,
      `"${i.serialNumber1 || ""}"`,
      i.hsnCode,
      i.quantity,
      i.taxableRate,
      i.taxableAmount,
      i.gstRate,
      i.totalAmount,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bill-${bill.header.billNumber || "import"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Receipt className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Purchase Bill Scanner & Auto-Extractor
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Upload physical or digital purchase invoices to automatically extract vendor details,
              IMEI/serial numbers, GST breakdown, and view them in a verified grid.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-95"
          >
            <UploadCloud className="size-4" />
            <span>Upload New Invoice</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileUpload(file);
            }}
          />
        </div>
      </div>

      {/* Active AI OCR Engine & Quota Status Banner */}
      {ocrStatus && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-50/70 via-sky-50/50 to-white dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-slate-900 shadow-sm text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
              <Sparkles className="size-4 text-indigo-600 animate-pulse" />
              <span>Active OCR Engine:</span>
            </div>
            <span className="font-semibold text-indigo-700 bg-white dark:bg-indigo-900/60 dark:text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-200 shadow-xs">
              {ocrStatus.activeProviderName}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">
              Type: {ocrStatus.activeProviderType}
            </span>
            {!ocrStatus.isOcrEnabled && (
              <span className="bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                OCR Disabled by Super Admin
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Scans Usage:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {ocrStatus.usedScansCount} / {ocrStatus.maxScansLimit}
              </span>
            </div>
            <span
              className={`px-3 py-1 rounded-full font-bold shadow-xs ${
                ocrStatus.remainingScans <= 0
                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                  : ocrStatus.remainingScans < 20
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
            >
              {ocrStatus.remainingScans} scans left
            </span>
          </div>
        </div>
      )}

      {/* 4 Supported Mobile Purchase Bills Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Sparkles className="size-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Supported Sample Bills (Click any bill to load & inspect)
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              6 Distributor Invoices Verified
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click to switch between real distributor invoice formats and test auto-extraction.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {BILL_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`group relative flex flex-col rounded-xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/80 shadow-sm ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-indigo-950/50 dark:ring-indigo-500/30"
                    : "border-slate-200 bg-slate-50/40 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/30 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex w-full items-start justify-between gap-1">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {preset.label}
                  </span>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{preset.grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-mono">{preset.invoiceNo}</span>
                  {isSelected && (
                    <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                      <Check className="size-3" /> Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {preset.itemSummary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* OCR In Progress Banner */}
      {isScanning && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <RefreshCw className="size-5 animate-spin text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {scanProgress.status}
                </span>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  {scanProgress.percent}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-200/60 dark:bg-blue-900/60">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${scanProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Layout: Document Preview & Extracted Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Document Image Viewer (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Original Document Viewer
                </span>
              </div>

              {imageSrc && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Zoom Out"
                  >
                    <ZoomOut className="size-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Zoom In"
                  >
                    <ZoomIn className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Rotate 90°"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Viewport */}
            <div className="mt-3 flex min-h-[500px] max-h-[750px] items-center justify-center overflow-auto rounded-xl border border-slate-100 bg-slate-100/60 p-2 dark:border-slate-800 dark:bg-slate-950">
              {imageSrc ? (
                <div
                  className="transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                >
                  <img
                    src={imageSrc}
                    alt="Uploaded purchase bill"
                    className="max-h-[680px] w-auto rounded-lg shadow-sm object-contain"
                  />
                </div>
              ) : (
                <div className="p-8 text-center">
                  <UploadCloud className="mx-auto size-12 text-slate-300 dark:text-slate-700" />
                  <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                    No document selected yet
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Upload a bill photo, or click "Load Sample Bill" above.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (BILL_PRESETS[0]) handleSelectPreset(BILL_PRESETS[0]);
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-600 shadow-xs hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Try Sample Natraj Invoice</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Extracted Metadata & Interactive Grid (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          {bill ? (
            <>
              {/* Card 1: Bill & Vendor Header Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Invoice & Vendor Details
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                    <CheckCircle2 className="size-3" />
                    Extracted
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  {/* Vendor Name */}
                  <div className="space-y-1 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Supplier / Vendor Name
                      </label>
                      {bill.header.vendorName && (
                        detectedMasters?.vendor?.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            New Vendor - will be created in DB
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Matched Store Vendor
                          </span>
                        )
                      )}
                    </div>
                    <input
                      type="text"
                      value={bill.header.vendorName}
                      onChange={(e) => handleHeaderChange("vendorName", e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Vendor Matching Select */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Linked Store Vendor
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">-- Match Store Vendor --</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bill Number */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Invoice / Bill No.
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={bill.header.billNumber}
                        onChange={(e) => handleHeaderChange("billNumber", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 font-mono text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Bill Date */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Invoice Date
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                      <input
                        type="date"
                        value={bill.header.billDate}
                        onChange={(e) => handleHeaderChange("billDate", e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* GSTIN */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Vendor GSTIN
                    </label>
                    <input
                      type="text"
                      value={bill.header.vendorGstin}
                      onChange={(e) => handleHeaderChange("vendorGstin", e.target.value)}
                      placeholder="e.g. 23AANFN9230A1ZK"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Vendor Phone */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Vendor Mobile / Phone
                    </label>
                    <input
                      type="text"
                      value={bill.header.vendorPhone || ""}
                      onChange={(e) => handleHeaderChange("vendorPhone", e.target.value)}
                      placeholder="e.g. 9826012345"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Vendor Address */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Vendor Address
                    </label>
                    <input
                      type="text"
                      value={bill.header.vendorAddress || ""}
                      onChange={(e) => handleHeaderChange("vendorAddress", e.target.value)}
                      placeholder="e.g. Main Market, Kukshi"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice Masters Analysis & Sync Banner with Inline Master Specs Drawer */}
              {detectedMasters && (
                <InvoiceMastersSummaryBanner
                  masters={detectedMasters}
                  onUpdateMasters={setDetectedMasters}
                  existingLookups={{
                    vendors,
                    brands,
                    models,
                    variants,
                    colors,
                  }}
                  onSyncNow={() => handleSyncMasters()}
                  isSyncing={isSyncingMasters}
                  hasSynced={hasSyncedMasters}
                />
              )}

              {/* Card 2: Extracted Items Data Grid */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Line Items Grid ({bill.items.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Plus className="size-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {/* Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        <th className="py-2.5 px-2 min-w-[120px]">Brand</th>
                        <th className="py-2.5 px-2 min-w-[140px]">Model</th>
                        <th className="py-2.5 px-2 min-w-[110px]">Variant</th>
                        <th className="py-2.5 px-2 min-w-[110px]">Color</th>
                        <th className="py-2.5 px-2 min-w-[140px]">Serial / IMEI 1</th>
                        <th className="py-2.5 px-2 min-w-[140px]">Serial / IMEI 2</th>
                        <th className="py-2.5 px-2 w-14 text-center">Qty</th>
                        <th className="py-2.5 px-2 text-right">Taxable Rate</th>
                        <th className="py-2.5 px-2 text-center">GST %</th>
                        <th className="py-2.5 px-2 text-right">Net Total</th>
                        <th className="py-2.5 px-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bill.items.map((item, index) => {
                        const matchedBrand = brands.find(
                          (b) => b.name.toLowerCase() === item.brand.toLowerCase()
                        );
                        const availableModels = matchedBrand
                          ? models.filter((m) => !m.brandId || m.brandId === matchedBrand.id)
                          : models;

                        const isDuplicate = Boolean(
                          (item.serialNumber && duplicateSerialSet.has(item.serialNumber.trim().toLowerCase())) ||
                          (item.serialNumber1 && duplicateSerialSet.has(item.serialNumber1.trim().toLowerCase()))
                        );
                        const isSuccessfullySaved = Boolean(saveSuccess && !isDuplicate);

                        return (
                          <tr
                            key={item.id}
                            className={`transition ${
                              isDuplicate
                                ? "bg-amber-50/70 border-l-4 border-l-amber-500 dark:bg-amber-950/30"
                                : isSuccessfullySaved
                                ? "bg-emerald-50/40 border-l-4 border-l-emerald-500 dark:bg-emerald-950/20"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                            }`}
                          >
                            <td className="py-2.5 px-2 font-mono text-center text-slate-400">
                              {index + 1}
                            </td>

                            {/* Brand */}
                            <td className="py-2.5 px-2">
                              <InlineMasterField
                                value={item.brand}
                                options={brands}
                                onChange={(val) => handleItemChange(item.id, "brand", val)}
                                placeholder="Brand"
                                typeLabel="Brand"
                              />
                            </td>

                            {/* Model */}
                            <td className="py-2.5 px-2">
                              <InlineMasterField
                                value={item.model}
                                options={availableModels}
                                onChange={(val) => handleItemChange(item.id, "model", val)}
                                placeholder="Model"
                                typeLabel="Model"
                              />
                            </td>

                            {/* Variant */}
                            <td className="py-2.5 px-2">
                              <InlineMasterField
                                value={item.variant}
                                options={variants}
                                onChange={(val) => handleItemChange(item.id, "variant", val)}
                                placeholder="Variant"
                                typeLabel="Variant"
                              />
                            </td>

                            {/* Color */}
                            <td className="py-2.5 px-2">
                              <InlineMasterField
                                value={item.color}
                                options={colors}
                                onChange={(val) => handleItemChange(item.id, "color", val)}
                                placeholder="Color"
                                typeLabel="Color"
                              />
                            </td>

                          {/* Serial Number 1 */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              maxLength={100}
                              value={item.serialNumber}
                              onChange={(e) =>
                                handleItemChange(item.id, "serialNumber", e.target.value)
                              }
                              placeholder="IMEI 1 (e.g. 8652...)"
                              className={`w-full rounded-lg border px-2 py-1 font-mono text-xs outline-none ${
                                isDuplicate
                                  ? "border-amber-400 bg-amber-50/80 text-amber-900 font-bold dark:border-amber-600 dark:bg-amber-950 dark:text-amber-200"
                                  : "border-slate-200 text-indigo-700 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-300"
                              }`}
                            />
                            {isDuplicate && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="size-2.5 text-amber-600" />
                                <span>Already in DB (Skipped)</span>
                              </div>
                            )}
                            {isSuccessfullySaved && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-2.5 text-emerald-600" />
                                <span>Saved to Stock</span>
                              </div>
                            )}
                          </td>

                          {/* Serial Number 2 */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              maxLength={100}
                              value={item.serialNumber1 || ""}
                              onChange={(e) =>
                                handleItemChange(item.id, "serialNumber1", e.target.value)
                              }
                              placeholder="IMEI 2 (optional)"
                              className="w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(item.id, "quantity", e.target.value)
                              }
                              className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center font-mono text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* Taxable Rate */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={item.taxableRate}
                              onChange={(e) =>
                                handleItemChange(item.id, "taxableRate", e.target.value)
                              }
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right font-mono text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </td>

                          {/* GST Rate */}
                          <td className="py-3 px-3 text-center">
                            <select
                              value={item.gstRate}
                              onChange={(e) =>
                                handleItemChange(item.id, "gstRate", e.target.value)
                              }
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>

                          {/* Net Total */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ₹
                            {item.totalAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>

                          {/* Delete */}
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                              title="Delete row"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              </div>

              {/* Card 3: Tax Summary & Totals */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Bank & Payment Info */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Supplier Bank Details
                    </span>
                    <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      <p>Bank: {bill.header.bankName || "HDFC Bank LTD, Susari"}</p>
                      <p>A/C No: {bill.header.bankAccountNo || "50200025654828"}</p>
                      <p>IFSC: {bill.header.bankIfsc || "HDFC0001056"}</p>
                      <p>PAN: {bill.header.pan || "AANFN9230A"}</p>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Taxable Value (Subtotal):</span>
                      <span className="font-mono font-semibold">
                        ₹{bill.summary.subtotalTaxable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>CGST (9%):</span>
                      <span className="font-mono">
                        ₹{bill.summary.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>SGST (9%):</span>
                      <span className="font-mono">
                        ₹{bill.summary.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {bill.summary.roundOff !== 0 && (
                      <div className="flex justify-between text-slate-500">
                        <span>Round Off:</span>
                        <span className="font-mono">{bill.summary.roundOff}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:border-slate-700 dark:text-white">
                      <span>Grand Total:</span>
                      <span className="font-mono text-base text-indigo-600 dark:text-indigo-400">
                        ₹{bill.summary.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Download className="size-3.5" />
                  <span>Export Grid to CSV</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveToInventory}
                    disabled={savingInventory}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50 active:scale-95"
                  >
                    {savingInventory ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Saving Products to Inventory…</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Save & Ingest into Inventory ({bill.items.length} units)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                <Receipt className="size-7" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                No Purchase Bill Loaded
              </h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                Upload a bill photo, drop a file, or click "Load Sample Bill (Natraj Telecom)" above to
                instantly extract and view items in the grid.
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (BILL_PRESETS[0]) handleSelectPreset(BILL_PRESETS[0]);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700"
                >
                  <Sparkles className="size-3.5" />
                  <span>Try Sample Bill Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Duplicate Serials Report Modal */}
      {duplicateReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Duplicate Serial Numbers Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invoice: <span className="font-mono font-semibold">{duplicateReport.billNumber}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {duplicateReport.totalInserted > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="size-3.5" />
                    {duplicateReport.totalInserted} Inserted
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="size-3.5" />
                  {duplicateReport.totalDuplicates} Skipped
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
              <div className="rounded-xl bg-amber-50/90 p-4 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                {duplicateReport.totalInserted > 0 ? (
                  <>
                    <strong>Partial Import Notice:</strong> <strong>{duplicateReport.totalInserted}</strong> valid product(s) have been successfully saved into your stock inventory. The <strong>{duplicateReport.totalDuplicates}</strong> serial number(s) listed below already exist in the database and were skipped to prevent double-entry.
                  </>
                ) : (
                  <>
                    <strong>Duplicate Warning:</strong> All <strong>{duplicateReport.totalDuplicates}</strong> serial number(s) in this invoice already exist in your inventory database. No new entries were added.
                  </>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3">Serial / IMEI 1</th>
                      <th className="py-2.5 px-3">Serial / IMEI 2</th>
                      <th className="py-2.5 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {duplicateReport.duplicates.map((dup, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-700 dark:text-amber-300">
                          <span className="rounded bg-amber-100 px-2 py-0.5 dark:bg-amber-950">
                            {dup.serialNumber}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {dup.serialNumber1 || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                          {dup.reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Duplicates are highlighted in amber in the line items grid.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDuplicateReport(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Close Report
                </button>
                {duplicateReport.totalInserted > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate(
                        `${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(
                          duplicateReport.vendorId
                        )}&billNumber=${encodeURIComponent(duplicateReport.billNumber)}`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                  >
                    <span>Proceed to Payment Voucher</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

