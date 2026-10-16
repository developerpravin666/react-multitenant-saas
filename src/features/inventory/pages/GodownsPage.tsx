import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Building2,
  ArrowLeftRight,
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Truck,
  FileSpreadsheet,
  Trash2,
  Eye,
  X,
  Warehouse,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { useNotifications } from "../../../context/NotificationContext";
import { godownApi } from "../services/godownApi";
import type {
  GodownDto,
  CreateGodownRequest,
  UpdateGodownRequest,
  GodownStockItemDto,
  StockTransferSummaryDto,
  StockTransferDetailDto,
  StockTransferLineInput,
  CreateStockTransferRequest,
  PhysicalStockAuditSummaryDto,
  StockAdjustmentDto,
  CreateStockAdjustmentRequest,
} from "../types/godown.types";

const currency = (val: number | null | undefined): string => {
  const num = val ?? 0;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function GodownsPage() {
  const notifications = useNotifications();

  // Active Top-level Tab
  const [activeTab, setActiveTab] = useState<"godowns" | "transfers" | "audit">("godowns");

  // -------------------------------------------------------------
  // TAB 1: GODOWNS STATE
  // -------------------------------------------------------------
  const [godowns, setGodowns] = useState<GodownDto[]>([]);
  const [godownsLoading, setGodownsLoading] = useState(false);
  const [godownSearch, setGodownSearch] = useState("");
  const [showGodownModal, setShowGodownModal] = useState(false);
  const [editingGodown, setEditingGodown] = useState<GodownDto | null>(null);
  const [godownForm, setGodownForm] = useState<CreateGodownRequest>({
    name: "",
    code: "",
    address: "",
    isPrimary: false,
  });
  const [godownBusy, setGodownBusy] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: STOCK TRANSFERS STATE
  // -------------------------------------------------------------
  const [transfers, setTransfers] = useState<StockTransferSummaryDto[]>([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [fromGodownId, setFromGodownId] = useState<string>("");
  const [toGodownId, setToGodownId] = useState<string>("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [dispatchNote, setDispatchNote] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [narration, setNarration] = useState("");
  const [sourceStockItems, setSourceStockItems] = useState<GodownStockItemDto[]>([]);
  const [sourceStockLoading, setSourceStockLoading] = useState(false);
  const [sourceItemSearch, setSourceItemSearch] = useState("");
  const [transferLines, setTransferLines] = useState<StockTransferLineInput[]>([]);
  const [transferBusy, setTransferBusy] = useState(false);
  const [selectedTransferDetail, setSelectedTransferDetail] = useState<StockTransferDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: PHYSICAL AUDIT & ADJUSTMENTS STATE
  // -------------------------------------------------------------
  const [auditGodownId, setAuditGodownId] = useState<string>("");
  const [auditData, setAuditData] = useState<PhysicalStockAuditSummaryDto | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number>>({});
  const [adjustments, setAdjustments] = useState<StockAdjustmentDto[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  // Adjustment Modal
  const [reconcilingItem, setReconcilingItem] = useState<{
    itemId: string;
    itemType: "Serialized" | "Sku";
    productId?: string | null;
    skuId?: string | null;
    itemName: string;
    serialNumber?: string | null;
    bookQty: number;
    physicalQty: number;
    discrepancy: number;
    unitCost: number;
  } | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentDate, setAdjustmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);

  // =============================================================
  // DATA LOADERS
  // =============================================================
  const loadGodowns = useCallback(async () => {
    setGodownsLoading(true);
    try {
      const data = await godownApi.getGodowns();
      setGodowns(data);
      if (data.length > 0) {
        const first = data[0];
        const second = data[1];
        if (first && !fromGodownId) setFromGodownId(first.id);
        if (second && !toGodownId) setToGodownId(second.id);
        if (first && !auditGodownId) setAuditGodownId(first.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load godowns.";
      notifications.error("Error", msg);
    } finally {
      setGodownsLoading(false);
    }
  }, [fromGodownId, toGodownId, auditGodownId, notifications]);

  const loadTransfers = useCallback(async () => {
    setTransfersLoading(true);
    try {
      const data = await godownApi.getStockTransfers();
      setTransfers(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load stock transfers.";
      notifications.error("Error", msg);
    } finally {
      setTransfersLoading(false);
    }
  }, [notifications]);

  const loadAuditData = useCallback(async (godownId: string) => {
    if (!godownId) return;
    setAuditLoading(true);
    try {
      const data = await godownApi.getPhysicalStockAudit(godownId);
      setAuditData(data);
      // Initialize physical counts with book quantities
      const initial: Record<string, number> = {};
      data.items.forEach((item, idx) => {
        const key = item.productId ?? item.skuId ?? `item-${idx}`;
        initial[key] = item.bookQuantity;
      });
      setPhysicalCounts(initial);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load physical stock audit.";
      notifications.error("Error", msg);
    } finally {
      setAuditLoading(false);
    }
  }, [notifications]);

  const loadAdjustments = useCallback(async (godownId?: string) => {
    setAdjustmentsLoading(true);
    try {
      const data = await godownApi.getStockAdjustments(godownId ? { godownId } : undefined);
      setAdjustments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load stock adjustments.";
      notifications.error("Error", msg);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [notifications]);

  // Load available stock when source godown changes for transfer
  const loadSourceStock = useCallback(async (godownId: string) => {
    if (!godownId) return;
    setSourceStockLoading(true);
    try {
      const items = await godownApi.getGodownStock(godownId);
      setSourceStockItems(items);
    } catch (err: unknown) {
      console.warn("Could not load source godown stock", err);
      setSourceStockItems([]);
    } finally {
      setSourceStockLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGodowns();
    loadTransfers();
  }, [loadGodowns, loadTransfers]);

  useEffect(() => {
    if (fromGodownId) {
      loadSourceStock(fromGodownId);
      setTransferLines([]);
    }
  }, [fromGodownId, loadSourceStock]);

  useEffect(() => {
    if (auditGodownId) {
      loadAuditData(auditGodownId);
      loadAdjustments(auditGodownId);
    }
  }, [auditGodownId, loadAuditData, loadAdjustments]);

  // =============================================================
  // GODOWN ACTIONS
  // =============================================================
  const handleOpenAddGodown = () => {
    setEditingGodown(null);
    setGodownForm({ name: "", code: "", address: "", isPrimary: godowns.length === 0 });
    setShowGodownModal(true);
  };

  const handleOpenEditGodown = (g: GodownDto) => {
    setEditingGodown(g);
    setGodownForm({
      name: g.name,
      code: g.code,
      address: g.address ?? "",
      isPrimary: g.isPrimary,
    });
    setShowGodownModal(true);
  };

  const handleSaveGodown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!godownForm.name.trim() || !godownForm.code.trim()) {
      notifications.warning("Validation Error", "Name and Code are required.");
      return;
    }
    setGodownBusy(true);
    try {
      if (editingGodown) {
        const payload: UpdateGodownRequest = {
          id: editingGodown.id,
          name: godownForm.name.trim(),
          code: godownForm.code.trim().toUpperCase(),
          address: godownForm.address?.trim() || null,
          isPrimary: godownForm.isPrimary ?? false,
          isActive: editingGodown.isActive,
        };
        await godownApi.updateGodown(editingGodown.id, payload);
        notifications.success("Saved", `Godown '${payload.name}' updated.`);
      } else {
        const payload: CreateGodownRequest = {
          name: godownForm.name.trim(),
          code: godownForm.code.trim().toUpperCase(),
          address: godownForm.address?.trim() || null,
          isPrimary: godownForm.isPrimary ?? false,
        };
        await godownApi.createGodown(payload);
        notifications.success("Created", `Godown '${payload.name}' created.`);
      }
      setShowGodownModal(false);
      await loadGodowns();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save godown.";
      notifications.error("Error", msg);
    } finally {
      setGodownBusy(false);
    }
  };

  // =============================================================
  // STOCK TRANSFER ACTIONS
  // =============================================================
  const handleAddItemToTransfer = (item: GodownStockItemDto) => {
    // Check if already in transfer lines
    const existing = transferLines.find(
      (l) =>
        (item.itemType === "Serialized" && l.productId === item.itemId) ||
        (item.itemType === "Sku" && l.skuId === item.itemId)
    );

    if (existing) {
      notifications.info("Already Added", `'${item.name}' is already in transfer lines.`);
      return;
    }

    const newLine: StockTransferLineInput = {
      itemType: item.itemType,
      productId: item.itemType === "Serialized" ? item.itemId : null,
      skuId: item.itemType === "Sku" ? item.itemId : null,
      itemName: item.name,
      serialNumber: item.serialNumber ?? null,
      quantity: 1,
      unitCost: item.unitCost,
    };

    setTransferLines((prev) => [...prev, newLine]);
  };

  const handleUpdateLineQty = (index: number, qty: number) => {
    setTransferLines((prev) => {
      const copy = [...prev];
      const line = copy[index];
      if (line) {
        copy[index] = { ...line, quantity: Math.max(0.0001, qty) };
      }
      return copy;
    });
  };

  const handleRemoveLine = (index: number) => {
    setTransferLines((prev) => prev.filter((_, i) => i !== index));
  };

  const totalTransferQty = useMemo(
    () => transferLines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0),
    [transferLines]
  );

  const totalTransferVal = useMemo(
    () => transferLines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0),
    [transferLines]
  );

  const handlePostTransfer = async () => {
    if (!fromGodownId || !toGodownId) {
      notifications.warning("Validation Error", "Select source and destination godowns.");
      return;
    }
    if (fromGodownId === toGodownId) {
      notifications.warning("Validation Error", "Source and destination godowns cannot be identical.");
      return;
    }
    if (transferLines.length === 0) {
      notifications.warning("Validation Error", "Please add at least one item to transfer.");
      return;
    }

    setTransferBusy(true);
    try {
      const payload: CreateStockTransferRequest = {
        transferDate: transferDate || new Date().toISOString().split("T")[0]!,
        fromGodownId,
        toGodownId,
        vehicleNumber: vehicleNumber.trim() || null,
        dispatchNote: dispatchNote.trim() || null,
        transporterName: transporterName.trim() || null,
        narration: narration.trim() || null,
        lines: transferLines,
      };

      const res = await godownApi.createStockTransfer(payload);
      notifications.success(
        "Transfer Completed",
        `Stock transfer posted successfully (ID: ${res.id.slice(0, 8)}).`
      );

      setTransferLines([]);
      setVehicleNumber("");
      setDispatchNote("");
      setTransporterName("");
      setNarration("");
      setShowNewTransfer(false);

      await Promise.all([loadTransfers(), loadGodowns(), loadSourceStock(fromGodownId)]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post stock transfer.";
      notifications.error("Transfer Failed", msg);
    } finally {
      setTransferBusy(false);
    }
  };

  const handleViewTransferDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await godownApi.getStockTransferById(id);
      setSelectedTransferDetail(detail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load transfer detail.";
      notifications.error("Error", msg);
    } finally {
      setDetailLoading(false);
    }
  };

  // =============================================================
  // PHYSICAL AUDIT & ADJUSTMENT ACTIONS
  // =============================================================
  const handlePhysicalCountChange = (key: string, val: number) => {
    setPhysicalCounts((prev) => ({ ...prev, [key]: Math.max(0, val) }));
  };

  const handleOpenReconcileModal = (
    item: {
      productId?: string | null;
      skuId?: string | null;
      itemType: "Serialized" | "Sku";
      itemName: string;
      serialNumber?: string | null;
      bookQuantity: number;
      unitCost: number;
    },
    key: string
  ) => {
    const physQty = physicalCounts[key] ?? item.bookQuantity;
    const discrepancy = physQty - item.bookQuantity;

    setReconcilingItem({
      itemId: key,
      itemType: item.itemType,
      productId: item.productId,
      skuId: item.skuId,
      itemName: item.itemName,
      serialNumber: item.serialNumber,
      bookQty: item.bookQuantity,
      physicalQty: physQty,
      discrepancy,
      unitCost: item.unitCost,
    });

    setAdjustmentReason(
      discrepancy < 0
        ? "Physical audit stock shortage write-off"
        : "Physical audit excess stock found"
    );
  };

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingItem || !auditGodownId) return;
    if (!adjustmentReason.trim()) {
      notifications.warning("Validation Error", "Please provide a reason for the adjustment.");
      return;
    }

    setAdjustmentBusy(true);
    try {
      const isShortage = reconcilingItem.discrepancy < 0;
      const payload: CreateStockAdjustmentRequest = {
        adjustmentDate: adjustmentDate || new Date().toISOString().split("T")[0]!,
        godownId: auditGodownId,
        adjustmentType: (isShortage ? "Shortage" : "Surplus") as "Shortage" | "Surplus",
        reason: adjustmentReason.trim(),
        itemType: reconcilingItem.itemType,
        productId: reconcilingItem.productId,
        skuId: reconcilingItem.skuId,
        itemName: reconcilingItem.itemName,
        serialNumber: reconcilingItem.serialNumber,
        bookQuantity: reconcilingItem.bookQty,
        physicalQuantity: reconcilingItem.physicalQty,
        unitCost: reconcilingItem.unitCost,
      };

      const res = await godownApi.createStockAdjustment(payload);
      notifications.success(
        "Stock Adjustment Posted",
        `Adjustment voucher posted with General Ledger journal (ID: ${res.id.slice(0, 8)}).`
      );

      setReconcilingItem(null);
      await Promise.all([loadAuditData(auditGodownId), loadAdjustments(auditGodownId), loadGodowns()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post adjustment.";
      notifications.error("Adjustment Failed", msg);
    } finally {
      setAdjustmentBusy(false);
    }
  };

  // Filtered Lists
  const filteredGodowns = useMemo(() => {
    const q = godownSearch.toLowerCase();
    return godowns.filter(
      (g) => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q) || (g.address ?? "").toLowerCase().includes(q)
    );
  }, [godowns, godownSearch]);

  const filteredSourceStock = useMemo(() => {
    const q = sourceItemSearch.toLowerCase();
    return sourceStockItems.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.serialNumber ?? "").toLowerCase().includes(q)
    );
  }, [sourceStockItems, sourceItemSearch]);

  const filteredAuditItems = useMemo(() => {
    if (!auditData?.items) return [];
    const q = auditSearch.toLowerCase();
    return auditData.items.filter(
      (i) =>
        i.itemName.toLowerCase().includes(q) ||
        (i.serialNumber ?? "").toLowerCase().includes(q) ||
        (i.serialNumber1 ?? "").toLowerCase().includes(q)
    );
  }, [auditData, auditSearch]);

  const totalCompanyStockVal = useMemo(
    () => godowns.reduce((acc, g) => acc + (Number(g.totalStockValue) || 0), 0),
    [godowns]
  );
  const totalSerializedCount = useMemo(
    () => godowns.reduce((acc, g) => acc + (Number(g.serializedItemCount) || 0), 0),
    [godowns]
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Warehouse className="size-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Multi-Godown & Stock Journal
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Internal warehouse stocking locations, non-taxable Stock Transfer Journals, and physical audit reconciliation.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "godowns" && (
            <button
              onClick={handleOpenAddGodown}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <Plus className="size-4" />
              Add Godown
            </button>
          )}
          {activeTab === "transfers" && !showNewTransfer && (
            <button
              onClick={() => setShowNewTransfer(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 transition"
            >
              <ArrowLeftRight className="size-4" />
              New Stock Transfer
            </button>
          )}
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("godowns")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === "godowns"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <Building2 className="size-4" />
          Godown Master ({godowns.length})
        </button>

        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === "transfers"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ArrowLeftRight className="size-4" />
          Stock Transfer Journal ({transfers.length})
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition ${
            activeTab === "audit"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <ClipboardCheck className="size-4" />
          Physical Audit & Adjustments
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GODOWNS MASTER */}
      {/* ========================================================= */}
      {activeTab === "godowns" && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">Total Godowns</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{godowns.length}</p>
              <p className="mt-1 text-xs text-slate-400">Physical Stock Locations</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">Primary Location</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {godowns.find((g) => g.isPrimary)?.name ?? "Not Set"}
              </p>
              <p className="mt-1 text-xs text-emerald-600">Default Goods Receipt</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">Serialized Units in Stock</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalSerializedCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-400">Active Mobile Handsets</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500">Total Stock Valuation</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {currency(totalCompanyStockVal)}
              </p>
              <p className="mt-1 text-xs text-indigo-600">Across all locations</p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search godowns by code, name, address..."
                value={godownSearch}
                onChange={(e) => setGodownSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-xs focus:border-indigo-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Godowns Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Godown Name</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Serialized Stock</th>
                  <th className="px-4 py-3 text-right">SKU Stock</th>
                  <th className="px-4 py-3 text-right">Stock Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {godownsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading godowns...
                    </td>
                  </tr>
                ) : filteredGodowns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No godowns found.
                    </td>
                  </tr>
                ) : (
                  filteredGodowns.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {g.code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {g.name}
                        {g.isPrimary && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            Primary
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {g.address || <span className="italic text-slate-400">No address recorded</span>}
                      </td>
                      <td className="px-4 py-3">
                        {g.isPrimary ? (
                          <span className="text-xs font-medium text-emerald-600">Main Hub</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">Branch / Warehouse</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {g.serializedItemCount.toLocaleString()} units
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                        {g.skuItemQuantity.toLocaleString()} pcs
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {currency(g.totalStockValue)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block size-2 rounded-full ${
                            g.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenEditGodown(g)}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STOCK TRANSFER JOURNAL */}
      {/* ========================================================= */}
      {activeTab === "transfers" && (
        <div className="space-y-6">
          {showNewTransfer ? (
            /* Stock Transfer Voucher Creation Form */
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ArrowLeftRight className="size-5 text-indigo-600" />
                    New Stock Transfer Journal Voucher
                  </h2>
                  <p className="text-xs text-slate-500">
                    Internal stock relocation between locations without tax or invoice implications.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewTransfer(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Godown Selection & Transit Details */}
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transfer Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Source Godown (Consumption) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fromGodownId}
                    onChange={(e) => setFromGodownId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select Source Godown</option>
                    {godowns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Destination Godown (Receipt) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={toGodownId}
                    onChange={(e) => setToGodownId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value="">Select Destination Godown</option>
                    {godowns
                      .filter((g) => g.id !== fromGodownId)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Vehicle Number (Transit)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MP-09-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Note / Challan #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DC-2026-0042"
                    value={dispatchNote}
                    onChange={(e) => setDispatchNote(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Transporter Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VRL Logistics"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Narration / Transfer Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stock replenishment for weekend festival sale demand"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Items Picker from Source Godown */}
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Boxes className="size-4 text-indigo-600" />
                    Select Items from Source Godown ({sourceStockItems.length} available)
                  </h3>
                  <div className="relative w-64">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter items/serials..."
                      value={sourceItemSearch}
                      onChange={(e) => setSourceItemSearch(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {sourceStockLoading ? (
                  <p className="py-4 text-center text-xs text-slate-500">Loading source stock items...</p>
                ) : filteredSourceStock.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">
                    No items found in selected source godown.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-800/30">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredSourceStock.map((item) => {
                        const isAdded = transferLines.some(
                          (l) =>
                            (item.itemType === "Serialized" && l.productId === item.itemId) ||
                            (item.itemType === "Sku" && l.skuId === item.itemId)
                        );
                        return (
                          <div
                            key={item.itemId}
                            className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition ${
                              isAdded
                                ? "border-indigo-300 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-950/40"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                              {item.serialNumber && (
                                <p className="font-mono text-[11px] text-slate-500">S/N: {item.serialNumber}</p>
                              )}
                              <p className="text-[11px] text-slate-400">
                                Avail: {item.availableQuantity} • {currency(item.unitCost)}
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleAddItemToTransfer(item)}
                              className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition ${
                                isAdded
                                  ? "bg-indigo-200 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }`}
                            >
                              {isAdded ? "Added" : "+ Add"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Transfer Lines Table */}
              <div className="mt-6 border-t border-slate-200 pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Transfer Voucher Line Items ({transferLines.length})
                </h3>

                {transferLines.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-xs text-slate-500 dark:border-slate-700">
                    No items selected yet. Choose items from the source stock above.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2.5">Type</th>
                          <th className="px-3 py-2.5">Item Name</th>
                          <th className="px-3 py-2.5">Serial Number</th>
                          <th className="px-3 py-2.5 text-right w-24">Quantity</th>
                          <th className="px-3 py-2.5 text-right">Unit Cost</th>
                          <th className="px-3 py-2.5 text-right">Line Total</th>
                          <th className="px-3 py-2.5 text-center w-16">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {transferLines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="px-3 py-2.5">
                              <span
                                className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                                  line.itemType === "Serialized"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {line.itemType}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              {line.itemName}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-600 dark:text-slate-300">
                              {line.serialNumber ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {line.itemType === "Serialized" ? (
                                <span className="font-semibold text-slate-900 dark:text-slate-100">1</span>
                              ) : (
                                <input
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  value={line.quantity}
                                  onChange={(e) => handleUpdateLineQty(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 rounded border border-slate-300 px-2 py-1 text-right text-xs dark:border-slate-700 dark:bg-slate-800"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-medium text-slate-900 dark:text-slate-100">
                              {currency(line.unitCost)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                              {currency(line.quantity * line.unitCost)}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLine(idx)}
                                className="rounded p-1 text-slate-400 hover:text-rose-600 transition"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold dark:border-slate-800 dark:bg-slate-800/40">
                        <tr>
                          <td colSpan={3} className="px-3 py-2.5 text-slate-900 dark:text-slate-100">
                            Total Transfer Quantity & Valuation
                          </td>
                          <td className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400">
                            {totalTransferQty.toLocaleString()} units
                          </td>
                          <td></td>
                          <td className="px-3 py-2.5 text-right text-indigo-600 dark:text-indigo-400">
                            {currency(totalTransferVal)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTransfer(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={transferBusy || transferLines.length === 0}
                  onClick={handlePostTransfer}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {transferBusy ? "Posting Transfer..." : "Post Stock Transfer Voucher"}
                </button>
              </div>
            </div>
          ) : null}

          {/* Past Transfers List */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-indigo-600" />
                Stock Transfer Journal History
              </h3>
              <button
                onClick={loadTransfers}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
              >
                <RefreshCw className="size-3" /> Refresh
              </button>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Transfer #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source Godown</th>
                  <th className="px-4 py-3">Destination Godown</th>
                  <th className="px-4 py-3 text-right">Items / Qty</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3">Vehicle / Transit</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {transfersLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading transfers...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No stock transfers recorded yet. Click "New Stock Transfer" to transfer inventory.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="font-mono text-xs">{t.transferNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.transferDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {t.fromGodownName}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {t.toGodownName}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                        {t.totalQuantity.toLocaleString()} ({t.itemCount} items)
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {currency(t.totalValue)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {t.vehicleNumber ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300">{t.vehicleNumber}</span>
                        ) : (
                          <span className="italic">Direct Transfer</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <CheckCircle2 className="size-3" />
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleViewTransferDetail(t.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Eye className="size-3" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: PHYSICAL AUDIT & ADJUSTMENTS */}
      {/* ========================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          {/* Audit Controls & Summary Header */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                  Godown to Audit:
                </label>
                <select
                  value={auditGodownId}
                  onChange={(e) => setAuditGodownId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {godowns.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code}) {g.isPrimary ? "[Primary]" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => auditGodownId && loadAuditData(auditGodownId)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Reload Book Stock"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>

              {auditData && (
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-xs text-slate-500">Book Items:</span>{" "}
                    <span className="font-bold text-slate-900 dark:text-slate-100">{auditData.totalItemsCount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Book Quantity:</span>{" "}
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {auditData.totalBookQuantity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Book Valuation:</span>{" "}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {currency(auditData.totalBookValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audit Verification Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ClipboardCheck className="size-4 text-indigo-600" />
                  Physical Stock Count & Discrepancy Reconciliation
                </h3>
                <p className="text-xs text-slate-500">
                  Update the physical count in the field to identify shortages or surpluses. Click "Reconcile" to write off shortages or record surpluses with automatic General Ledger posting.
                </p>
              </div>
              <div className="relative w-64">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter audit items..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Item Description</th>
                  <th className="px-4 py-3">Serial / Batch</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Book Stock</th>
                  <th className="px-4 py-3 text-right w-36">Physical Count</th>
                  <th className="px-4 py-3 text-right">Discrepancy</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {auditLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading audit inventory...
                    </td>
                  </tr>
                ) : filteredAuditItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No stock items found in this godown.
                    </td>
                  </tr>
                ) : (
                  filteredAuditItems.map((item, idx) => {
                    const key = item.productId ?? item.skuId ?? `item-${idx}`;
                    const physical = physicalCounts[key] ?? item.bookQuantity;
                    const diff = physical - item.bookQuantity;

                    return (
                      <tr key={key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              item.itemType === "Serialized"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {item.itemType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {item.itemName}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {item.serialNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-900 dark:text-slate-100">
                          {currency(item.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {item.bookQuantity}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={physical}
                            onChange={(e) => handlePhysicalCountChange(key, parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-slate-300 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {diff === 0 ? (
                            <span className="text-emerald-600">0</span>
                          ) : diff < 0 ? (
                            <span className="text-rose-600">{diff}</span>
                          ) : (
                            <span className="text-blue-600">+{diff}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {diff === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Matched
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                              <AlertTriangle className="size-3" />
                              Shortage
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                              <Plus className="size-3" />
                              Surplus
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {diff !== 0 && (
                            <button
                              onClick={() => handleOpenReconcileModal(item, key)}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white shadow-2xs transition ${
                                diff < 0
                                  ? "bg-rose-600 hover:bg-rose-700"
                                  : "bg-blue-600 hover:bg-blue-700"
                              }`}
                            >
                              Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Historical Adjustments Log */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="size-4 text-indigo-600" />
                Physical Stock Adjustment Vouchers Log
              </h3>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Adjustment #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Godown</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Discrepancy</th>
                  <th className="px-4 py-3 text-right">Adjustment Value</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-center">GL Journal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {adjustmentsLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      Loading adjustments...
                    </td>
                  </tr>
                ) : adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No stock adjustments posted yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100 font-mono text-xs">
                        {a.adjustmentNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{a.adjustmentDate}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{a.godownName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            a.adjustmentType === "Shortage"
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400"
                          }`}
                        >
                          {a.adjustmentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                        {a.itemName}
                        {a.serialNumber && (
                          <span className="block font-mono text-xs text-slate-500">S/N: {a.serialNumber}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        {a.discrepancyQuantity}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {currency(a.totalValue)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">{a.reason}</td>
                      <td className="px-4 py-3 text-center">
                        {a.journalEntryId ? (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                            <ShieldCheck className="size-3" />
                            Posted
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT GODOWN */}
      {/* ========================================================= */}
      {showGodownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Warehouse className="size-5 text-indigo-600" />
                {editingGodown ? "Edit Godown" : "Add New Godown"}
              </h3>
              <button
                onClick={() => setShowGodownModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGodown} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Godown Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warehouse Kukshi, Main Store"
                  value={godownForm.name}
                  onChange={(e) => setGodownForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Godown Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. MAIN, WH-01, SVC-PT"
                  value={godownForm.code}
                  onChange={(e) => setGodownForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 uppercase font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Address / Location Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Plot #, Street, City, Pincode"
                  value={godownForm.address ?? ""}
                  onChange={(e) => setGodownForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimaryGodown"
                  checked={godownForm.isPrimary ?? false}
                  onChange={(e) => setGodownForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPrimaryGodown" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Set as Primary Location (Default destination for new supplier purchase bills)
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGodownModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={godownBusy}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {godownBusy ? "Saving..." : editingGodown ? "Update Godown" : "Create Godown"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: TRANSFER DETAILS */}
      {/* ========================================================= */}
      {selectedTransferDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ArrowLeftRight className="size-5 text-indigo-600" />
                  Stock Transfer Journal #{selectedTransferDetail.transferNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Transferred on {selectedTransferDetail.transferDate} • Status: {selectedTransferDetail.status}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransferDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-xs border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <span className="text-slate-500">From Godown:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.fromGodownName}
                </span>
              </div>
              <div>
                <span className="text-slate-500">To Godown:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.toGodownName}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Vehicle Number:</span>{" "}
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.vehicleNumber ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Dispatch Note:</span>{" "}
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.dispatchNote ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Transporter:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.transporterName ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Narration:</span>{" "}
                <span className="text-slate-900 dark:text-slate-100">
                  {selectedTransferDetail.narration ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Transferred Items</h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Item Name</th>
                    <th className="px-3 py-2">Serial Number</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selectedTransferDetail.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.itemType}</td>
                      <td className="px-3 py-2 font-medium">{l.itemName}</td>
                      <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">
                        {l.serialNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right">{l.quantity}</td>
                      <td className="px-3 py-2 text-right">{currency(l.unitCost)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{currency(l.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 font-semibold dark:border-slate-800">
                  <tr>
                    <td colSpan={3} className="px-3 py-2">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right">{selectedTransferDetail.totalQuantity}</td>
                    <td></td>
                    <td className="px-3 py-2 text-right text-indigo-600 dark:text-indigo-400">
                      {currency(selectedTransferDetail.totalValue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                onClick={() => setSelectedTransferDetail(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: DISCREPANCY RECONCILIATION */}
      {/* ========================================================= */}
      {reconcilingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle
                  className={`size-5 ${
                    reconcilingItem.discrepancy < 0 ? "text-rose-600" : "text-blue-600"
                  }`}
                />
                Reconcile Stock Discrepancy
              </h3>
              <button
                onClick={() => setReconcilingItem(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handlePostAdjustment} className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50 space-y-1">
                <p>
                  <span className="text-slate-500">Item:</span>{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{reconcilingItem.itemName}</span>
                </p>
                {reconcilingItem.serialNumber && (
                  <p>
                    <span className="text-slate-500">Serial:</span>{" "}
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {reconcilingItem.serialNumber}
                    </span>
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
                  <div>
                    <span className="text-slate-500 block">Book Stock</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {reconcilingItem.bookQty}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Physical Count</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {reconcilingItem.physicalQty}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Discrepancy</span>
                    <span
                      className={`font-bold ${
                        reconcilingItem.discrepancy < 0 ? "text-rose-600" : "text-blue-600"
                      }`}
                    >
                      {reconcilingItem.discrepancy}
                    </span>
                  </div>
                </div>
                <div className="pt-2 text-right">
                  <span className="text-slate-500">Discrepancy Value:</span>{" "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {currency(Math.abs(reconcilingItem.discrepancy) * reconcilingItem.unitCost)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={adjustmentDate}
                  onChange={(e) => setAdjustmentDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {reconcilingItem.discrepancy < 0
                    ? "Shortage — Write-off as Stock Shrinkage / Damage Expense (Dr 5100, Cr 1200)"
                    : "Surplus — Record as Inventory Gain / Excess Stock (Dr 1200, Cr 4900)"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Discrepancy <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damage during transit, missing handset, count error"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReconcilingItem(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustmentBusy}
                  className={`rounded-lg px-4 py-2 text-xs font-medium text-white shadow-xs transition disabled:opacity-50 ${
                    reconcilingItem.discrepancy < 0
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {adjustmentBusy ? "Posting..." : "Confirm & Post Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
