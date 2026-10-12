import { useEffect, useRef, useState } from "react";
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
import { createProductFormConfig } from "../config/product.form";
import type { Product } from "../types/product.types";
import { APP_ROUTES } from "../../../../config/routes";
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

interface SerialPair {
  serialNumber: string;
  serialNumber1: string;
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

function matchBrand(itemBrand: string, brands: ProductLookupRecord[]): string {
  if (!brands.length) return "";
  const clean = itemBrand.trim().toLowerCase();
  const matched = brands.find((b) => {
    const bName = b.name.trim().toLowerCase();
    return bName === clean || bName.includes(clean) || clean.includes(bName);
  });
  return matched?.id ?? brands[0]?.id ?? "";
}

function matchProductType(matchedBrandId: string, productTypes: ProductLookupRecord[]): string {
  if (!productTypes.length) return "";
  const brandTypes = productTypes.filter((pt) => !pt.brandId || pt.brandId === matchedBrandId);
  const phoneType = brandTypes.find((pt) => /smart\s*phone|mobile|phone|handset/i.test(pt.name));
  if (phoneType) return phoneType.id;
  return brandTypes[0]?.id ?? productTypes[0]?.id ?? "";
}

function matchModel(
  item: ExtractedBillItem,
  matchedBrandId: string,
  matchedProductTypeId: string,
  models: ProductLookupRecord[]
): string {
  if (!models.length) return "";
  const candidateModels = models.filter(
    (m) =>
      (!m.brandId || m.brandId === matchedBrandId) &&
      (!m.productTypeId || m.productTypeId === matchedProductTypeId)
  );
  const pool = candidateModels.length > 0 ? candidateModels : models;
  const itemModelClean = item.model.trim().toLowerCase();
  const descClean = item.description.trim().toLowerCase();

  const matched = pool.find((m) => {
    const mName = m.name.trim().toLowerCase();
    return (
      mName === itemModelClean ||
      mName.includes(itemModelClean) ||
      itemModelClean.includes(mName) ||
      descClean.includes(mName)
    );
  });

  return matched?.id ?? pool[0]?.id ?? "";
}

function matchVariant(itemVariant: string, itemDesc: string, variants: ProductLookupRecord[]): string {
  if (!variants.length) return "";
  const vClean = itemVariant.replace(/[()\s]/g, "").toLowerCase();
  const dClean = itemDesc.replace(/[()\s]/g, "").toLowerCase();

  const matched = variants.find((v) => {
    const nameClean = v.name.replace(/[()\s]/g, "").toLowerCase();
    return (
      nameClean === vClean ||
      nameClean.includes(vClean) ||
      vClean.includes(nameClean) ||
      dClean.includes(nameClean)
    );
  });

  return matched?.id ?? variants[0]?.id ?? "";
}

function matchColor(itemColor: string, itemDesc: string, colors: ProductLookupRecord[]): string {
  if (!colors.length) return "";
  const cClean = itemColor.trim().toLowerCase();
  const dClean = itemDesc.trim().toLowerCase();

  const matched = colors.find((c) => {
    const nameClean = c.name.trim().toLowerCase();
    return (
      nameClean === cClean ||
      nameClean.includes(cClean) ||
      cClean.includes(nameClean) ||
      dClean.includes(nameClean)
    );
  });

  return matched?.id ?? colors[0]?.id ?? "";
}

function BulkProductCreateForm() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [lookups, setLookups] = useState<ProductLookupsData | null>(null);
  const [fields, setFields] = useState<Awaited<ReturnType<typeof productResource.loadFields>> | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serialPairs, setSerialPairs] = useState<SerialPair[]>([{ serialNumber: "", serialNumber1: "" }]);

  // Invoice Upload & Auto-fill State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ status: string; percent: number }>({ status: "", percent: 0 });
  const [uploadedBill, setUploadedBill] = useState<ExtractedPurchaseBill | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState<string | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Form Versioning for clean resets when invoice fills form
  const [formVersion, setFormVersion] = useState(0);
  const [initialFormValues, setInitialFormValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let active = true;
    void loadProductLookups()
      .then((loaded) => {
        if (!active) return;
        setLookups(loaded);
        const formFields = createProductFormConfig({
          vendors: loaded.vendors,
          brands: loaded.brands,
          productTypes: loaded.productTypes,
          models: loaded.models,
          variants: loaded.variants,
          colors: loaded.colors,
          ...loaded.taxRates,
        });
        setFields(formFields.filter((field) => !["serialNumber", "serialNumber1"].includes(field.name)));
      })
      .catch((reason: unknown) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : "Unable to load product form data.");
      });
    return () => {
      active = false;
    };
  }, []);

  const applyExtractedBill = (bill: ExtractedPurchaseBill, itemIdx: number, currentLookups = lookups) => {
    if (!currentLookups) return;
    const item = bill.items[itemIdx] ?? bill.items[0];
    if (!item) return;

    const matchedVendorId = matchVendor(bill.header, currentLookups.vendors);
    const matchedBrandId = matchBrand(item.brand, currentLookups.brands);
    const matchedProductTypeId = matchProductType(matchedBrandId, currentLookups.productTypes);
    const matchedModelId = matchModel(item, matchedBrandId, matchedProductTypeId, currentLookups.models);
    const matchedVariantId = matchVariant(item.variant, item.description, currentLookups.variants);
    const matchedColorId = matchColor(item.color, item.description, currentLookups.colors);

    // Populate serial numbers for this item
    const pairs: SerialPair[] = [];
    if (item.serialNumber) {
      const s1 = item.serialNumber.trim();
      let s2 = item.serialNumber1?.trim() || "";
      if (!s2 && s1.length > 1) {
        const lastDigit = Number(s1.slice(-1));
        s2 = !isNaN(lastDigit) ? `${s1.slice(0, -1)}${(lastDigit + 1) % 10}` : `${s1}1`;
      }
      pairs.push({ serialNumber: s1, serialNumber1: s2 });
    } else {
      pairs.push({ serialNumber: "", serialNumber1: "" });
    }
    setSerialPairs(pairs);

    // Populate initial form fields
    const newValues: Record<string, unknown> = {
      vendorId: matchedVendorId,
      billNumber: bill.header.billNumber,
      purchaseDate: bill.header.billDate,
      paymentTermsDays: bill.header.paymentTermsDays || 7,
      brandId: matchedBrandId,
      productTypeId: matchedProductTypeId,
      productModelId: matchedModelId,
      variantId: matchedVariantId,
      colorId: matchedColorId,
      purchasePrice: item.taxableRate,
      discount: 0,
      cgst: item.cgstRate ?? currentLookups.taxRates.cgst ?? 9,
      sgst: item.sgstRate ?? currentLookups.taxRates.sgst ?? 9,
      tax: (item.cgstRate ?? 9) + (item.sgstRate ?? 9),
      isActive: true,
    };

    setInitialFormValues(newValues);
    setSelectedItemIndex(itemIdx);
    setFormVersion((v) => v + 1);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      notifications.error("Invalid File", "Please upload an invoice image (JPG, PNG, WebP) or PDF file.");
      return;
    }

    setActivePresetId(null);
    setIsScanning(true);
    setScanProgress({ status: "Preparing document for scanning…", percent: 15 });

    try {
      const { text, previewUrl } = await extractTextFromInvoiceDocument(file, (status, percent) => {
        setScanProgress({ status, percent });
      });

      if (previewUrl) {
        setInvoicePreviewUrl(previewUrl);
        setShowDocPreview(true);
      }

      setScanProgress({ status: "Extracting GST details, line items & serials…", percent: 90 });
      const parsedBill = parsePurchaseBillText(text);
      setUploadedBill(parsedBill);
      applyExtractedBill(parsedBill, 0);

      notifications.success(
        "Invoice Auto-Filled!",
        `Extracted details from ${parsedBill.header.vendorName || "Invoice"}: ${parsedBill.items.length} line item(s) found.`
      );
    } catch (err) {
      notifications.error(
        "Invoice Scanning Notice",
        err instanceof Error ? err.message : "Could not scan document. Please check the file and try again."
      );
    } finally {
      setIsScanning(false);
      setScanProgress({ status: "", percent: 0 });
    }
  };

  const handleSelectPreset = (preset: BillPresetInfo) => {
    setActivePresetId(preset.id);
    setInvoicePreviewUrl(preset.imagePath);
    setShowDocPreview(true);
    setZoomLevel(1);
    setRotation(0);

    const bill = preset.getBill();
    setUploadedBill(bill);
    applyExtractedBill(bill, 0);

    notifications.success(
      `Loaded: ${preset.vendorName}`,
      `Invoice ${preset.invoiceNo} auto-filled into form fields with item specs and IMEI serials.`
    );
  };

  const handleClearInvoice = () => {
    setUploadedBill(null);
    setActivePresetId(null);
    setInvoicePreviewUrl(null);
    setShowDocPreview(false);
    setSelectedItemIndex(0);
    setSerialPairs([{ serialNumber: "", serialNumber1: "" }]);
    setInitialFormValues({});
    setFormVersion((v) => v + 1);
  };

  const handleSwitchItem = (index: number) => {
    if (!uploadedBill) return;
    applyExtractedBill(uploadedBill, index);
  };

  if (loadError) return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>;
  if (!fields || !lookups) return <p className="text-sm text-slate-500">Loading form…</p>;

  const updateSerial = (index: number, key: keyof SerialPair, value: string) => {
    setSerialPairs((current) => current.map((pair, pairIndex) => pairIndex === index ? { ...pair, [key]: value } : pair));
  };
  const resizeSerialPairs = (count: number) => {
    setSerialPairs((current) => Array.from({ length: count }, (_, index) => current[index] ?? { serialNumber: "", serialNumber1: "" }));
  };

  return (
    <div className="space-y-6">
      {/* Upload Invoice Card */}
      <section
        aria-labelledby="upload-invoice-heading"
        className="overflow-hidden rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/70 via-white to-slate-50 p-5 shadow-xs dark:border-indigo-950/60 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/20"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Receipt className="size-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="upload-invoice-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Upload Invoice & Auto-Fill
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  <Sparkles className="size-3" /> Auto OCR
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Upload a purchase invoice (image or PDF) or choose a sample bill. Vendor details, invoice number, date, specs, taxes, and IMEI serials will auto-fill instantly.
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
                  title="Toggle invoice preview"
                >
                  {showDocPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  <span>{showDocPreview ? "Hide Preview" : "View Invoice"}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearInvoice}
                  className="gap-1.5 text-slate-600 dark:text-slate-400"
                  title="Reset uploaded invoice"
                >
                  <X className="size-4" />
                  <span>Clear</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 4 Sample Bill Quick Selectors */}
        <div className="mt-4 pt-3.5 border-t border-indigo-100/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Sample Distributor Invoices (Click to test auto-fill):
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
                    {isSelected ? (
                      <Check className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                    ) : null}
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
        </div>

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

        {/* Extracted Bill Summary Header */}
        {uploadedBill && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-950/60 dark:bg-emerald-950/30">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-3.5 text-emerald-600" /> Auto-Filled From Invoice
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Vendor: <strong className="text-slate-900 dark:text-slate-200">{uploadedBill.header.vendorName}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Bill No: <strong className="font-mono text-slate-900 dark:text-slate-200">{uploadedBill.header.billNumber}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Date: <strong className="font-mono text-slate-900 dark:text-slate-200">{uploadedBill.header.billDate}</strong>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Total: <strong className="font-mono text-indigo-700 dark:text-indigo-400">₹{uploadedBill.summary.grandTotal.toLocaleString("en-IN")}</strong>
                </span>
              </div>
            </div>

            {/* If invoice has multiple items, allow switching item line to populate specs & IMEI */}
            {uploadedBill.items.length > 1 && (
              <div className="mt-3 pt-2.5 border-t border-emerald-200/70 dark:border-emerald-900/50">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Select Item from Invoice to Auto-Fill Specs & IMEI:
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedBill.items.map((item, idx) => {
                    const isItemActive = selectedItemIndex === idx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSwitchItem(idx)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          isItemActive
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <span>Item {idx + 1}: {item.description}</span>
                        <span className="font-mono opacity-85">₹{item.taxableRate.toLocaleString("en-IN")}</span>
                        {isItemActive && <Check className="size-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Main Dynamic Product Form with Auto-Filled Values */}
      <DynamicForm
        key={formVersion}
        title="Add Products"
        description="Enter shared purchase details once, then add both serial numbers for every unit."
        fields={fields}
        initialValues={initialFormValues}
        columnsPerRow={3}
        submitLabel={`Save ${serialPairs.length} ${serialPairs.length === 1 ? "unit" : "units"}`}
        onCancel={() => navigate(productResource.listPath)}
        onSubmit={async (values) => {
          if (serialPairs.length < 1 || serialPairs.length > 500)
            throw new Error("Add between 1 and 500 product units.");
          if (serialPairs.some((pair) => !pair.serialNumber.trim() || !pair.serialNumber1.trim()))
            throw new Error("Enter both serial numbers for every unit.");
          const created = await productResource.api.create({ ...values, serialPairs });
          navigate(`${APP_ROUTES.purchase.accountingPayment}?vendorId=${encodeURIComponent(created.vendorId)}&billNumber=${encodeURIComponent(created.billNumber ?? "")}`);
        }}
      >
        <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" aria-labelledby="unit-serials-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="unit-serials-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">Unit serial numbers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Both values are required and must be unique across all units.</p>
            </div>
            <span className="text-sm text-slate-500">{serialPairs.length} {serialPairs.length === 1 ? "unit" : "units"}</span>
          </div>
          {serialPairs.map((pair, index) => (
            <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto] dark:bg-slate-800/50">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Unit {index + 1} · Serial Number <span className="text-red-600">*</span></span>
                <input required maxLength={100} value={pair.serialNumber} onChange={(event) => updateSerial(index, "serialNumber", event.target.value)} autoComplete="off" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="mb-1 block">Unit {index + 1} · Serial Number 1 <span className="text-red-600">*</span></span>
                <input required maxLength={100} value={pair.serialNumber1} onChange={(event) => updateSerial(index, "serialNumber1", event.target.value)} autoComplete="off" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950" />
              </label>
              {serialPairs.length > 1 ? <Button type="button" variant="secondary" aria-label={`Remove unit ${index + 1}`} onClick={() => {
                const nextCount = serialPairs.length - 1;
                resizeSerialPairs(nextCount);
              }}>Remove</Button> : <span />}
            </div>
          ))}
          <Button type="button" variant="secondary" disabled={serialPairs.length >= 500} onClick={() => {
            const nextCount = serialPairs.length + 1;
            resizeSerialPairs(nextCount);
          }}>
            {serialPairs.length >= 500 ? "Maximum 500 units" : "+ Add another unit"}
          </Button>
        </section>
      </DynamicForm>
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
