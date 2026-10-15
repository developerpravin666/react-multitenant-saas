import { useState, useEffect } from "react";
import {
  Sparkles,
  Building2,
  Tag,
  Smartphone,
  Layers,
  Palette,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  RefreshCw,
  Plus,
  ArrowRight,
  Database
} from "lucide-react";
import type {
  DetectedEntity,
  DetectedInvoiceMasters,
  LookupItem
} from "../services/invoiceMasterResolver";

interface InvoiceMastersReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  masters: DetectedInvoiceMasters;
  onSaveMasters: (updatedMasters: DetectedInvoiceMasters) => void;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
  existingLookups: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
  };
}

export function InvoiceMastersReviewModal({
  isOpen,
  onClose,
  masters,
  onSaveMasters,
  onSyncNow,
  isSyncing = false,
  existingLookups,
}: InvoiceMastersReviewModalProps) {
  const [activeTab, setActiveTab] = useState<"vendor" | "brands" | "models" | "variants" | "colors">("vendor");
  const [workingMasters, setWorkingMasters] = useState<DetectedInvoiceMasters>(() => JSON.parse(JSON.stringify(masters)));
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVendorFieldChange = (field: keyof DetectedEntity, value: string) => {
    if (!workingMasters.vendor) return;
    setWorkingMasters({
      ...workingMasters,
      vendor: {
        ...workingMasters.vendor,
        [field]: value,
        isEdited: true,
      },
    });
  };

  const handleEntityFieldChange = (
    category: "brands" | "models" | "variants" | "colors",
    tempId: string,
    field: keyof DetectedEntity,
    value: string
  ) => {
    setWorkingMasters({
      ...workingMasters,
      [category]: workingMasters[category].map((item) =>
        item.tempId === tempId ? { ...item, [field]: value, isEdited: true } : item
      ),
    });
  };

  const handleMapToExisting = (
    category: "vendor" | "brands" | "models" | "variants" | "colors",
    tempId: string,
    existingId: string
  ) => {
    if (category === "vendor") {
      const match = existingLookups.vendors.find((v) => v.id === existingId);
      if (!match || !workingMasters.vendor) return;
      setWorkingMasters({
        ...workingMasters,
        vendor: {
          ...workingMasters.vendor,
          isNew: false,
          matchedDbId: match.id,
          matchedDbName: match.name,
          name: match.name,
          gstNumber: match.gstNumber || workingMasters.vendor.gstNumber,
          code: match.code || workingMasters.vendor.code,
          isEdited: false,
        },
      });
      return;
    }

    const lookupList = existingLookups[category];
    const match = lookupList.find((x) => x.id === existingId);
    if (!match) return;

    setWorkingMasters({
      ...workingMasters,
      [category]: workingMasters[category].map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              isNew: false,
              matchedDbId: match.id,
              matchedDbName: match.name,
              name: match.name,
              code: match.code || item.code,
              isEdited: false,
            }
          : item
      ),
    });
  };

  const handleSaveAndClose = () => {
    onSaveMasters(workingMasters);
    onClose();
  };

  const handleSaveAndSync = async () => {
    onSaveMasters(workingMasters);
    if (onSyncNow) {
      await onSyncNow();
    }
    onClose();
  };

  const tabs = [
    { id: "vendor" as const, label: "Vendor", icon: Building2, count: workingMasters.vendor ? 1 : 0, hasNew: workingMasters.vendor?.isNew },
    { id: "brands" as const, label: "Brands", icon: Tag, count: workingMasters.brands.length, hasNew: workingMasters.brands.some((b) => b.isNew) },
    { id: "models" as const, label: "Models", icon: Smartphone, count: workingMasters.models.length, hasNew: workingMasters.models.some((m) => m.isNew) },
    { id: "variants" as const, label: "Variants", icon: Layers, count: workingMasters.variants.length, hasNew: workingMasters.variants.some((v) => v.isNew) },
    { id: "colors" as const, label: "Colors", icon: Palette, count: workingMasters.colors.length, hasNew: workingMasters.colors.some((c) => c.isNew) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Review & Edit Invoice Masters</span>
                {workingMasters.newCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {workingMasters.newCount} New
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review, edit or map detected vendors, brands, models, variants and colors before populating into database controls.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="border-b border-slate-200 px-6 flex items-center gap-2 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    tab.hasNew
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* VENDOR TAB */}
          {activeTab === "vendor" && (
            <div className="space-y-4">
              {!workingMasters.vendor ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No vendor information detected in this invoice.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {workingMasters.vendor.name}
                        </span>
                        {workingMasters.vendor.isNew ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Plus className="size-3" /> New Vendor (Will be Created)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" /> Existing in Database
                          </span>
                        )}
                        {workingMasters.vendor.isEdited && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Modified
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Original detected string: "{workingMasters.vendor.originalName}"
                      </p>
                    </div>

                    {/* Switch between New or Link to Existing */}
                    <div className="flex items-center gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setWorkingMasters({
                              ...workingMasters,
                              vendor: { ...workingMasters.vendor!, isNew: true, matchedDbId: undefined },
                            });
                          } else if (e.target.value) {
                            handleMapToExisting("vendor", workingMasters.vendor!.tempId, e.target.value);
                          }
                        }}
                        value={workingMasters.vendor.isNew ? "__NEW__" : workingMasters.vendor.matchedDbId || ""}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="__NEW__">+ Create as New Vendor</option>
                        <optgroup label="Or Link to Existing Vendor">
                          {existingLookups.vendors.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name} {v.gstNumber ? `(${v.gstNumber})` : ""}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Vendor Editable Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Vendor Name *
                      </label>
                      <input
                        type="text"
                        value={workingMasters.vendor.name}
                        onChange={(e) => handleVendorFieldChange("name", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        value={workingMasters.vendor.gstNumber || ""}
                        onChange={(e) => handleVendorFieldChange("gstNumber", e.target.value.toUpperCase())}
                        placeholder="23AAAAA0000A1Z5"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Vendor Code
                      </label>
                      <input
                        type="text"
                        value={workingMasters.vendor.code || ""}
                        onChange={(e) => handleVendorFieldChange("code", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Mobile Phone
                      </label>
                      <input
                        type="text"
                        value={workingMasters.vendor.mobile || ""}
                        onChange={(e) => handleVendorFieldChange("mobile", e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={workingMasters.vendor.email || ""}
                        onChange={(e) => handleVendorFieldChange("email", e.target.value)}
                        placeholder="vendor@email.com"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Address / City
                      </label>
                      <input
                        type="text"
                        value={workingMasters.vendor.address || ""}
                        onChange={(e) => handleVendorFieldChange("address", e.target.value)}
                        placeholder="City, State"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BRANDS TAB */}
          {activeTab === "brands" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Brands detected across invoice line items. New brands will be inserted and populated into the Brand dropdown.
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
                {workingMasters.brands.map((b) => (
                  <div key={b.tempId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</span>
                        {b.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            New Brand
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Existing: {b.matchedDbName}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={b.name}
                          onChange={(e) => handleEntityFieldChange("brands", b.tempId, "name", e.target.value)}
                          placeholder="Brand Name"
                          className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={b.description}
                          onChange={(e) => handleEntityFieldChange("brands", b.tempId, "description", e.target.value)}
                          placeholder="Description"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <select
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setWorkingMasters({
                              ...workingMasters,
                              brands: workingMasters.brands.map((x) =>
                                x.tempId === b.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                              ),
                            });
                          } else if (e.target.value) {
                            handleMapToExisting("brands", b.tempId, e.target.value);
                          }
                        }}
                        value={b.isNew ? "__NEW__" : b.matchedDbId || ""}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="__NEW__">+ Create as New Brand</option>
                        <optgroup label="Or Link to Existing Brand">
                          {existingLookups.brands.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODELS TAB */}
          {activeTab === "models" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Models detected from invoice line items. Each model is linked to its brand and automatically inserted into the database.
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
                {workingMasters.models.map((m) => (
                  <div key={m.tempId} className="p-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{m.name}</span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          Brand: {m.brandName || "Generic"}
                        </span>
                        {m.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            New Model
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Existing: {m.matchedDbName}
                          </span>
                        )}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setWorkingMasters({
                              ...workingMasters,
                              models: workingMasters.models.map((x) =>
                                x.tempId === m.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                              ),
                            });
                          } else if (e.target.value) {
                            handleMapToExisting("models", m.tempId, e.target.value);
                          }
                        }}
                        value={m.isNew ? "__NEW__" : m.matchedDbId || ""}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="__NEW__">+ Create as New Model</option>
                        <optgroup label="Or Link to Existing Model">
                          {existingLookups.models.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Model Name *</label>
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => handleEntityFieldChange("models", m.tempId, "name", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Model Code</label>
                        <input
                          type="text"
                          value={m.code}
                          onChange={(e) => handleEntityFieldChange("models", m.tempId, "code", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-mono uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Description</label>
                        <input
                          type="text"
                          value={m.description}
                          onChange={(e) => handleEntityFieldChange("models", m.tempId, "description", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VARIANTS TAB */}
          {activeTab === "variants" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Storage & RAM variants detected from the invoice. New variants will be inserted into the database.
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
                {workingMasters.variants.map((vr) => (
                  <div key={vr.tempId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{vr.name}</span>
                        {vr.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            New Variant
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Existing: {vr.matchedDbName}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={vr.name}
                          onChange={(e) => handleEntityFieldChange("variants", vr.tempId, "name", e.target.value)}
                          placeholder="e.g. 8+128G"
                          className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                        />
                        <input
                          type="text"
                          value={vr.description}
                          onChange={(e) => handleEntityFieldChange("variants", vr.tempId, "description", e.target.value)}
                          placeholder="Description"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <select
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setWorkingMasters({
                              ...workingMasters,
                              variants: workingMasters.variants.map((x) =>
                                x.tempId === vr.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                              ),
                            });
                          } else if (e.target.value) {
                            handleMapToExisting("variants", vr.tempId, e.target.value);
                          }
                        }}
                        value={vr.isNew ? "__NEW__" : vr.matchedDbId || ""}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="__NEW__">+ Create as New Variant</option>
                        <optgroup label="Or Link to Existing Variant">
                          {existingLookups.variants.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COLORS TAB */}
          {activeTab === "colors" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Colors detected from the invoice. New colors will be added to the database and color dropdown.
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
                {workingMasters.colors.map((c) => (
                  <div key={c.tempId} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</span>
                        {c.isNew ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            New Color
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Existing: {c.matchedDbName}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => handleEntityFieldChange("colors", c.tempId, "name", e.target.value)}
                          placeholder="e.g. Diamond Black"
                          className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                        <input
                          type="text"
                          value={c.description}
                          onChange={(e) => handleEntityFieldChange("colors", c.tempId, "description", e.target.value)}
                          placeholder="Description"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <select
                        onChange={(e) => {
                          if (e.target.value === "__NEW__") {
                            setWorkingMasters({
                              ...workingMasters,
                              colors: workingMasters.colors.map((x) =>
                                x.tempId === c.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                              ),
                            });
                          } else if (e.target.value) {
                            handleMapToExisting("colors", c.tempId, e.target.value);
                          }
                        }}
                        value={c.isNew ? "__NEW__" : c.matchedDbId || ""}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="__NEW__">+ Create as New Color</option>
                        <optgroup label="Or Link to Existing Color">
                          {existingLookups.colors.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAndClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              Apply Changes (Local)
            </button>
            <button
              onClick={handleSaveAndSync}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Syncing to Database…</span>
                </>
              ) : (
                <>
                  <Database className="size-4" />
                  <span>Save to DB & Populate Controls</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * An inline editor panel that embeds directly into the main form flow (without any modal).
 */
export function InlineInvoiceMastersEditorPanel({
  masters,
  onSaveMasters,
  existingLookups,
  onSyncNow,
  isSyncing = false,
}: {
  masters: DetectedInvoiceMasters;
  onSaveMasters: (updatedMasters: DetectedInvoiceMasters) => void;
  existingLookups: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
  };
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"vendor" | "brands" | "models" | "variants" | "colors">("vendor");
  const [workingMasters, setWorkingMasters] = useState<DetectedInvoiceMasters>(() => JSON.parse(JSON.stringify(masters)));

  useEffect(() => {
    setWorkingMasters(JSON.parse(JSON.stringify(masters)));
  }, [masters]);

  const handleVendorFieldChange = (field: keyof DetectedEntity, value: string) => {
    if (!workingMasters.vendor) return;
    const updated = {
      ...workingMasters,
      vendor: {
        ...workingMasters.vendor,
        [field]: value,
        isEdited: true,
      },
    };
    setWorkingMasters(updated);
    onSaveMasters(updated);
  };

  const handleEntityFieldChange = (
    category: "brands" | "models" | "variants" | "colors",
    tempId: string,
    field: keyof DetectedEntity,
    value: string
  ) => {
    const updated = {
      ...workingMasters,
      [category]: workingMasters[category].map((item) =>
        item.tempId === tempId ? { ...item, [field]: value, isEdited: true } : item
      ),
    };
    setWorkingMasters(updated);
    onSaveMasters(updated);
  };

  const handleMapToExisting = (
    category: "vendor" | "brands" | "models" | "variants" | "colors",
    tempId: string,
    existingId: string
  ) => {
    if (category === "vendor") {
      const match = existingLookups.vendors.find((v) => v.id === existingId);
      if (!match || !workingMasters.vendor) return;
      const updated = {
        ...workingMasters,
        vendor: {
          ...workingMasters.vendor,
          isNew: false,
          matchedDbId: match.id,
          matchedDbName: match.name,
          name: match.name,
          gstNumber: match.gstNumber || workingMasters.vendor.gstNumber,
          code: match.code || workingMasters.vendor.code,
          isEdited: false,
        },
      };
      setWorkingMasters(updated);
      onSaveMasters(updated);
      return;
    }

    const lookupList = existingLookups[category];
    const match = lookupList.find((x) => x.id === existingId);
    if (!match) return;

    const updated = {
      ...workingMasters,
      [category]: workingMasters[category].map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              isNew: false,
              matchedDbId: match.id,
              matchedDbName: match.name,
              name: match.name,
              code: match.code || item.code,
              isEdited: false,
            }
          : item
      ),
    };
    setWorkingMasters(updated);
    onSaveMasters(updated);
  };

  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-white dark:border-indigo-900/50 dark:bg-slate-900 overflow-hidden shadow-xs">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/60">
        <button
          type="button"
          onClick={() => setActiveTab("vendor")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "vendor"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Building2 className="size-3.5" />
          <span>Vendor / Supplier</span>
          {workingMasters.vendor?.isNew && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
              NEW
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("brands")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "brands"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Tag className="size-3.5" />
          <span>Brands ({workingMasters.brands.length})</span>
          {workingMasters.brands.some((b) => b.isNew) && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
              {workingMasters.brands.filter((b) => b.isNew).length} NEW
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "models"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Smartphone className="size-3.5" />
          <span>Models ({workingMasters.models.length})</span>
          {workingMasters.models.some((m) => m.isNew) && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
              {workingMasters.models.filter((m) => m.isNew).length} NEW
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("variants")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "variants"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Layers className="size-3.5" />
          <span>Variants ({workingMasters.variants.length})</span>
          {workingMasters.variants.some((v) => v.isNew) && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
              {workingMasters.variants.filter((v) => v.isNew).length} NEW
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("colors")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            activeTab === "colors"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <Palette className="size-3.5" />
          <span>Colors ({workingMasters.colors.length})</span>
          {workingMasters.colors.some((c) => c.isNew) && (
            <span className="rounded-full bg-amber-400/90 px-1.5 py-0.2 text-[9px] font-black text-slate-950">
              {workingMasters.colors.filter((c) => c.isNew).length} NEW
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-4">
        {/* VENDOR TAB */}
        {activeTab === "vendor" && (
          <div className="space-y-4">
            {workingMasters.vendor ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {workingMasters.vendor.isNew ? "New Vendor: " : "Matched Vendor: "}
                      {workingMasters.vendor.name}
                    </span>
                    {workingMasters.vendor.isNew ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Will Be Created in DB
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Existing in Database
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Map to Existing:</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const updated = {
                            ...workingMasters,
                            vendor: {
                              ...workingMasters.vendor!,
                              isNew: true,
                              matchedDbId: undefined,
                              matchedDbName: undefined,
                            },
                          };
                          setWorkingMasters(updated);
                          onSaveMasters(updated);
                        } else if (e.target.value) {
                          handleMapToExisting("vendor", "", e.target.value);
                        }
                      }}
                      value={workingMasters.vendor.isNew ? "__NEW__" : workingMasters.vendor.matchedDbId || ""}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="__NEW__">+ Create as New Vendor</option>
                      <optgroup label="Or Link to Existing Vendor">
                        {existingLookups.vendors.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} {v.gstNumber ? `(${v.gstNumber})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Vendor Name</label>
                    <input
                      type="text"
                      value={workingMasters.vendor.name}
                      onChange={(e) => handleVendorFieldChange("name", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">GSTIN</label>
                    <input
                      type="text"
                      value={workingMasters.vendor.gstNumber || ""}
                      onChange={(e) => handleVendorFieldChange("gstNumber", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Phone / Mobile</label>
                    <input
                      type="text"
                      value={workingMasters.vendor.mobile || ""}
                      onChange={(e) => handleVendorFieldChange("mobile", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Address / City</label>
                    <input
                      type="text"
                      value={workingMasters.vendor.address || ""}
                      onChange={(e) => handleVendorFieldChange("address", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No vendor details detected.</p>
            )}
          </div>
        )}

        {/* BRANDS TAB */}
        {activeTab === "brands" && (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
              {workingMasters.brands.map((b) => (
                <div key={b.tempId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{b.name}</span>
                      {b.isNew ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          New Brand (will be inserted)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Existing: {b.matchedDbName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="text"
                        value={b.name}
                        onChange={(e) => handleEntityFieldChange("brands", b.tempId, "name", e.target.value)}
                        placeholder="Brand Name"
                        className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={b.description}
                        onChange={(e) => handleEntityFieldChange("brands", b.tempId, "description", e.target.value)}
                        placeholder="Description / Notes"
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const updated = {
                            ...workingMasters,
                            brands: workingMasters.brands.map((x) =>
                              x.tempId === b.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                            ),
                          };
                          setWorkingMasters(updated);
                          onSaveMasters(updated);
                        } else if (e.target.value) {
                          handleMapToExisting("brands", b.tempId, e.target.value);
                        }
                      }}
                      value={b.isNew ? "__NEW__" : b.matchedDbId || ""}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="__NEW__">+ Create as New Brand</option>
                      <optgroup label="Or Link to Existing Brand">
                        {existingLookups.brands.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODELS TAB */}
        {activeTab === "models" && (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
              {workingMasters.models.map((m) => (
                <div key={m.tempId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {m.brandName ? `${m.brandName} - ` : ""}
                        {m.name}
                      </span>
                      {m.isNew ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          New Model (will be inserted)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Existing: {m.matchedDbName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleEntityFieldChange("models", m.tempId, "name", e.target.value)}
                        placeholder="Model Name (e.g. V80)"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={m.code}
                        onChange={(e) => handleEntityFieldChange("models", m.tempId, "code", e.target.value)}
                        placeholder="Model Code (e.g. V80-5G)"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={m.description}
                        onChange={(e) => handleEntityFieldChange("models", m.tempId, "description", e.target.value)}
                        placeholder="Description"
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const updated = {
                            ...workingMasters,
                            models: workingMasters.models.map((x) =>
                              x.tempId === m.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                            ),
                          };
                          setWorkingMasters(updated);
                          onSaveMasters(updated);
                        } else if (e.target.value) {
                          handleMapToExisting("models", m.tempId, e.target.value);
                        }
                      }}
                      value={m.isNew ? "__NEW__" : m.matchedDbId || ""}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="__NEW__">+ Create as New Model</option>
                      <optgroup label="Or Link to Existing Model">
                        {existingLookups.models.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VARIANTS TAB */}
        {activeTab === "variants" && (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
              {workingMasters.variants.map((vr) => (
                <div key={vr.tempId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{vr.name}</span>
                      {vr.isNew ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          New Variant (will be inserted)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Existing: {vr.matchedDbName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="text"
                        value={vr.name}
                        onChange={(e) => handleEntityFieldChange("variants", vr.tempId, "name", e.target.value)}
                        placeholder="Variant (e.g. 8+128G)"
                        className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 font-mono text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={vr.description}
                        onChange={(e) => handleEntityFieldChange("variants", vr.tempId, "description", e.target.value)}
                        placeholder="Description"
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const updated = {
                            ...workingMasters,
                            variants: workingMasters.variants.map((x) =>
                              x.tempId === vr.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                            ),
                          };
                          setWorkingMasters(updated);
                          onSaveMasters(updated);
                        } else if (e.target.value) {
                          handleMapToExisting("variants", vr.tempId, e.target.value);
                        }
                      }}
                      value={vr.isNew ? "__NEW__" : vr.matchedDbId || ""}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="__NEW__">+ Create as New Variant</option>
                      <optgroup label="Or Link to Existing Variant">
                        {existingLookups.variants.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* COLORS TAB */}
        {activeTab === "colors" && (
          <div className="space-y-3">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900">
              {workingMasters.colors.map((c) => (
                <div key={c.tempId} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</span>
                      {c.isNew ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          New Color (will be inserted)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Existing: {c.matchedDbName}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => handleEntityFieldChange("colors", c.tempId, "name", e.target.value)}
                        placeholder="Color (e.g. Diamond Black)"
                        className="max-w-xs rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                      <input
                        type="text"
                        value={c.description}
                        onChange={(e) => handleEntityFieldChange("colors", c.tempId, "description", e.target.value)}
                        placeholder="Description"
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="shrink-0">
                    <select
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          const updated = {
                            ...workingMasters,
                            colors: workingMasters.colors.map((x) =>
                              x.tempId === c.tempId ? { ...x, isNew: true, matchedDbId: undefined } : x
                            ),
                          };
                          setWorkingMasters(updated);
                          onSaveMasters(updated);
                        } else if (e.target.value) {
                          handleMapToExisting("colors", c.tempId, e.target.value);
                        }
                      }}
                      value={c.isNew ? "__NEW__" : c.matchedDbId || ""}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="__NEW__">+ Create as New Color</option>
                      <optgroup label="Or Link to Existing Color">
                        {existingLookups.colors.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A user-friendly, responsive summary banner that renders directly on the purchase import screen,
 * with an optional inline drawer to view and customize master specifications without opening a modal.
 */
interface InvoiceMastersSummaryBannerProps {
  masters: DetectedInvoiceMasters;
  onUpdateMasters?: (updated: DetectedInvoiceMasters) => void;
  existingLookups?: {
    vendors: LookupItem[];
    brands: LookupItem[];
    models: LookupItem[];
    variants: LookupItem[];
    colors: LookupItem[];
  };
  onOpenReviewModal?: () => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  hasSynced?: boolean;
}

export function InvoiceMastersSummaryBanner({
  masters,
  onUpdateMasters,
  existingLookups,
  onSyncNow,
  isSyncing,
  hasSynced = false,
}: InvoiceMastersSummaryBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/50 p-4 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Invoice Masters Analysis:
            </h4>
            {hasSynced ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                <Check className="size-3" /> Synced to Controls & DB
              </span>
            ) : masters.newCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {masters.newCount} New Master(s) Detected
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                All Masters Matched in Database
              </span>
            )}
          </div>

          {/* Master Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {masters.vendor && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium border ${
                  masters.vendor.isNew
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Building2 className="size-3.5 text-slate-500" />
                <span className="font-semibold">Vendor:</span> {masters.vendor.name}
                {masters.vendor.isNew && (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">[NEW]</span>
                )}
              </span>
            )}

            {masters.brands.map((b) => (
              <span
                key={b.tempId}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium border ${
                  b.isNew
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Tag className="size-3 text-slate-500" />
                <span>Brand: {b.name}</span>
                {b.isNew && <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">[NEW]</span>}
              </span>
            ))}

            {masters.models.map((m) => (
              <span
                key={m.tempId}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium border ${
                  m.isNew
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Smartphone className="size-3 text-slate-500" />
                <span>Model: {m.name}</span>
                {m.isNew && <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">[NEW]</span>}
              </span>
            ))}

            {masters.variants.map((v) => (
              <span
                key={v.tempId}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium border ${
                  v.isNew
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Layers className="size-3 text-slate-500" />
                <span>{v.name}</span>
                {v.isNew && <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">[NEW]</span>}
              </span>
            ))}

            {masters.colors.map((c) => (
              <span
                key={c.tempId}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium border ${
                  c.isNew
                    ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                <Palette className="size-3 text-slate-500" />
                <span>{c.name}</span>
                {c.isNew && <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">[NEW]</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          {existingLookups && onUpdateMasters && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
            >
              <Edit2 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{isExpanded ? "Hide Master Specs" : "Customize Master Specs (Inline)"}</span>
            </button>
          )}

          {!hasSynced && masters.newCount > 0 && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>Syncing…</span>
                </>
              ) : (
                <>
                  <Database className="size-3.5" />
                  <span>Sync to Controls</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Inline Expanded Master Specs Editor (No Modal) */}
      {isExpanded && existingLookups && onUpdateMasters && (
        <InlineInvoiceMastersEditorPanel
          masters={masters}
          onSaveMasters={onUpdateMasters}
          existingLookups={existingLookups}
          onSyncNow={onSyncNow}
          isSyncing={isSyncing}
        />
      )}
    </div>
  );
}

