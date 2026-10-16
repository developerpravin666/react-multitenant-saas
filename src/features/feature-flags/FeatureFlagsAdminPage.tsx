import { useState, useMemo } from "react";
import {
  ToggleRight,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Database,
  Filter,
  Sparkles,
  Info,
  Globe,
  Building2,
  Users,
  RotateCcw,
  Zap,
} from "lucide-react";
import { useFeatureFlags } from "./FeatureFlagContext";
import { useNotifications } from "../../context/NotificationContext";
import type { FeatureFlag } from "./types";

export function FeatureFlagsAdminPage() {
  const {
    items,
    tenants,
    loading,
    selectedTenantId,
    setSelectedTenantId,
    toggleFlag,
    toggleAllTenants,
    resetTenantOverride,
    saveFlag,
    refreshFlags,
  } = useFeatureFlags();
  const notifications = useNotifications();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Tenant overrides management modal state
  const [managingFlag, setManagingFlag] = useState<FeatureFlag | null>(null);
  const [tenantSearch, setTenantSearch] = useState("");

  // Bulk confirmation modal
  const [bulkConfirmModal, setBulkConfirmModal] = useState<{
    key: string;
    name: string;
    enable: boolean;
  } | null>(null);

  // Form state for creating a new flag
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newEnabled, setNewEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["All", ...Array.from(set)];
  }, [items]);

  const selectedTenant = useMemo(() => {
    return tenants.find((t) => t.id === selectedTenantId) || null;
  }, [tenants, selectedTenantId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [items, search, selectedCategory]);

  // Current flag being managed in modal (kept in sync with items)
  const currentManagingFlag = useMemo(() => {
    if (!managingFlag) return null;
    return items.find((i) => i.key.toLowerCase() === managingFlag.key.toLowerCase()) || managingFlag;
  }, [managingFlag, items]);

  const filteredTenantsInModal = useMemo(() => {
    if (!tenantSearch.trim()) return tenants;
    const q = tenantSearch.toLowerCase();
    return tenants.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tenants, tenantSearch]);

  const handleToggle = async (key: string, currentStatus: boolean, tenantId?: string | null) => {
    setTogglingKey(key);
    const nextStatus = !currentStatus;
    const ok = await toggleFlag(key, nextStatus, tenantId);
    setTogglingKey(null);

    const targetDesc = tenantId
      ? `tenant '${tenants.find((t) => t.id === tenantId)?.name || tenantId}'`
      : selectedTenant
      ? `tenant '${selectedTenant.name}'`
      : "all tenants (global default)";

    if (ok) {
      notifications.success(
        "Feature Flag Updated",
        `Flag '${key}' has been set to ${nextStatus ? "Enabled" : "Disabled"} for ${targetDesc}.`
      );
    } else {
      notifications.error("Update Failed", "Could not persist feature flag update to the database.");
    }
  };

  const handleToggleAllTenants = async (key: string, enable: boolean) => {
    setTogglingKey(key);
    const ok = await toggleAllTenants(key, enable);
    setTogglingKey(null);
    setBulkConfirmModal(null);

    if (ok) {
      notifications.success(
        "Bulk Update Successful",
        `Flag '${key}' has been ${enable ? "Enabled" : "Disabled"} across ALL tenants in the database.`
      );
    } else {
      notifications.error("Update Failed", "Could not apply bulk toggle to all tenants.");
    }
  };

  const handleResetOverride = async (key: string, tenantId: string) => {
    const ok = await resetTenantOverride(key, tenantId);
    if (ok) {
      notifications.success(
        "Override Cleared",
        `Tenant override for '${key}' removed. Tenant is now inheriting global default.`
      );
    } else {
      notifications.error("Error", "Could not reset tenant override.");
    }
  };

  const handleCreateFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newName.trim()) {
      notifications.error("Validation Error", "Key and Name are required fields.");
      return;
    }

    setIsSubmitting(true);
    const ok = await saveFlag({
      key: newKey.trim().toLowerCase().replace(/\s+/g, "_"),
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      category: newCategory.trim() || "General",
      isEnabled: newEnabled,
      tenantId: selectedTenantId,
    });
    setIsSubmitting(false);

    if (ok) {
      notifications.success("Feature Flag Created", `Flag '${newKey}' created and stored in database.`);
      setShowAddModal(false);
      setNewKey("");
      setNewName("");
      setNewDescription("");
      setNewCategory("General");
      setNewEnabled(true);
    } else {
      notifications.error("Error", "Could not save the new feature flag to database.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ToggleRight className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Feature Flags Management</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Database className="size-3" />
                PostgreSQL Master
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage runtime toggles stored in <code className="font-mono">tenant.feature_flags</code>. Control features globally or override per specific tenant.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshFlags(selectedTenantId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync DB</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Add Flag</span>
          </button>
        </div>
      </div>

      {/* Tenant Scope Selector Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            {selectedTenantId ? (
              <Building2 className="size-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>Active Configuration Scope:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTenantId(null)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedTenantId === null
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              🌐 Global Default (All Tenants)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Tenant Override:</span>
          <select
            value={selectedTenantId || ""}
            onChange={(e) => setSelectedTenantId(e.target.value || null)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">-- Choose Tenant to Override --</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.slug})
              </option>
            ))}
          </select>

          {selectedTenantId && (
            <button
              type="button"
              onClick={() => setSelectedTenantId(null)}
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400 font-medium cursor-pointer"
            >
              Clear Scope
            </button>
          )}
        </div>
      </div>

      {/* Scope Banner if specific tenant is chosen */}
      {selectedTenant && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 text-xs text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div>
              <span className="font-bold">Targeted Tenant Mode:</span> Currently viewing and configuring overrides for{" "}
              <strong className="underline">{selectedTenant.name}</strong> (slug: <code>{selectedTenant.slug}</code>).
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTenantId(null)}
            className="rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 cursor-pointer"
          >
            Return to Global Scope
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by flag key, name, or description..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Flags Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredItems.map((flag) => {
          const isToggling = togglingKey === flag.key;
          const isVoiceFlag = flag.key.toLowerCase() === "voice_typing";

          // Determine override status for selected tenant
          const tenantOverride = selectedTenantId
            ? flag.overrides?.find((o) => o.tenantId === selectedTenantId)
            : null;

          const isOverriddenForTenant = Boolean(tenantOverride);

          return (
            <div
              key={flag.key}
              className={`relative rounded-2xl border p-5 transition-all shadow-sm ${
                flag.isEnabled
                  ? "border-emerald-200 bg-white dark:border-emerald-950/60 dark:bg-slate-900"
                  : "border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block size-2 rounded-full ${
                        flag.isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                      }`}
                    />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                      {flag.name}
                    </h2>
                    {isVoiceFlag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.2 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Sparkles className="size-2.5" /> Core Speech
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">
                    key: <span className="font-semibold text-slate-600 dark:text-slate-300">{flag.key}</span>
                  </div>
                </div>

                {/* Primary Toggle Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[11px] font-bold ${
                      flag.isEnabled
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {flag.isEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={flag.isEnabled}
                    disabled={isToggling}
                    onClick={() => handleToggle(flag.key, flag.isEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                      flag.isEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                    title={
                      selectedTenant
                        ? `Toggle ${flag.name} for ${selectedTenant.name}`
                        : `Toggle ${flag.name} global default`
                    }
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        flag.isEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {flag.description && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {flag.description}
                </p>
              )}

              {/* Status and Scope Badges */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                {selectedTenant ? (
                  isOverriddenForTenant ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      <span>Tenant Override: {flag.isEnabled ? "ON" : "OFF"}</span>
                      <button
                        type="button"
                        onClick={() => handleResetOverride(flag.key, selectedTenant.id)}
                        className="ml-1 text-xs text-amber-800 hover:underline dark:text-amber-200 cursor-pointer"
                        title="Remove override and inherit global default"
                      >
                        (Reset)
                      </button>
                    </span>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Inheriting Global Default ({flag.globalEnabled ? "ON" : "OFF"})
                    </span>
                  )
                ) : (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    Global Default: {flag.globalEnabled ? "Enabled" : "Disabled"}
                  </span>
                )}

                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {flag.category}
                </span>

                {/* Overrides Count Pill */}
                <button
                  type="button"
                  onClick={() => setManagingFlag(flag)}
                  className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 cursor-pointer"
                  title="View and configure per-tenant status"
                >
                  <Users className="size-3" />
                  <span>{flag.overridesCount || 0} Tenant Overrides</span>
                </button>
              </div>

              {/* Action Buttons: "Apply to All at Once" & "Manage Tenants" */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBulkConfirmModal({
                        key: flag.key,
                        name: flag.name,
                        enable: true,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 cursor-pointer"
                    title="Enable this flag for ALL tenants at once"
                  >
                    <Zap className="size-3" />
                    <span>Enable All</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBulkConfirmModal({
                        key: flag.key,
                        name: flag.name,
                        enable: false,
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 cursor-pointer"
                    title="Disable this flag for ALL tenants at once"
                  >
                    <Zap className="size-3" />
                    <span>Disable All</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setManagingFlag(flag)}
                  className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                >
                  Manage Per-Tenant →
                </button>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500 dark:border-slate-800">
            No feature flags found matching your filter.
          </div>
        )}
      </div>

      {/* Database Persistence Explanation */}
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/20 dark:text-indigo-300">
        <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1">
          <span className="font-semibold">Dual-Level Feature Flag Resolution:</span> Flags resolved for any tenant query check for a tenant-specific row in <code className="font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 px-1 py-0.5 rounded">tenant.feature_flags</code>. If none is found, the global default (<code className="font-mono text-[11px]">tenant_id = null</code>) applies automatically.
        </div>
      </div>

      {/* Modal: Manage Per-Tenant Overrides for a Specific Flag */}
      {currentManagingFlag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Tenant Matrix: {currentManagingFlag.name}
                  </h2>
                  <span className="font-mono text-xs text-slate-500">
                    ({currentManagingFlag.key})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enable or disable this flag for individual tenants, or apply to all tenants at once.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingFlag(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Bulk Actions for this Flag */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Global Default:
                </span>
                <span
                  className={`font-bold ${
                    currentManagingFlag.globalEnabled
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-500"
                  }`}
                >
                  {currentManagingFlag.globalEnabled ? "Enabled (ON)" : "Disabled (OFF)"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleToggle(currentManagingFlag.key, currentManagingFlag.globalEnabled ?? true, null)
                  }
                  className="ml-1 text-[11px] font-bold text-indigo-600 underline dark:text-indigo-400 cursor-pointer"
                >
                  Toggle Global
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-semibold">Apply to ALL at once:</span>
                <button
                  type="button"
                  onClick={() =>
                    setBulkConfirmModal({
                      key: currentManagingFlag.key,
                      name: currentManagingFlag.name,
                      enable: true,
                    })
                  }
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-500 cursor-pointer"
                >
                  Enable for All
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBulkConfirmModal({
                      key: currentManagingFlag.key,
                      name: currentManagingFlag.name,
                      enable: false,
                    })
                  }
                  className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-rose-500 cursor-pointer"
                >
                  Disable for All
                </button>
              </div>
            </div>

            {/* Tenant Search Bar inside Modal */}
            <div className="mt-3 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Search registered tenants by name or slug..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Tenant Table / List */}
            <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {filteredTenantsInModal.map((tenant) => {
                const override = currentManagingFlag.overrides?.find((o) => o.tenantId === tenant.id);
                const isOverridden = Boolean(override);
                const effectiveEnabled = isOverridden
                  ? Boolean(override?.isEnabled)
                  : Boolean(currentManagingFlag.globalEnabled);

                return (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {tenant.name}
                        </span>
                        <code className="text-[11px] text-slate-400">({tenant.slug})</code>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOverridden ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Custom Override: {effectiveEnabled ? "ON" : "OFF"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Inheriting Global ({currentManagingFlag.globalEnabled ? "ON" : "OFF"})
                          </span>
                        )}
                        {isOverridden && (
                          <button
                            type="button"
                            onClick={() => handleResetOverride(currentManagingFlag.key, tenant.id)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer"
                          >
                            <RotateCcw className="size-2.5" /> Reset to Global
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Toggle Switch per Tenant */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[11px] font-bold ${
                          effectiveEnabled
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-slate-400"
                        }`}
                      >
                        {effectiveEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={effectiveEnabled}
                        onClick={() =>
                          handleToggle(currentManagingFlag.key, effectiveEnabled, tenant.id)
                        }
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          effectiveEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        title={`Toggle ${currentManagingFlag.name} for ${tenant.name}`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            effectiveEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTenantsInModal.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  No tenants registered yet.
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingFlag(null)}
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Apply to All Tenants at Once */}
      {bulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid size-10 place-items-center rounded-xl text-white ${
                  bulkConfirmModal.enable ? "bg-emerald-600" : "bg-rose-600"
                }`}
              >
                <Zap className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {bulkConfirmModal.enable ? "Enable" : "Disable"} for ALL Tenants?
                </h2>
                <p className="text-xs text-slate-500">
                  Feature: <strong className="text-slate-700 dark:text-slate-300">{bulkConfirmModal.name}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action will update the global default AND synchronize all registered tenants across the system to{" "}
              <strong>{bulkConfirmModal.enable ? "ENABLED" : "DISABLED"}</strong> in the PostgreSQL database.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBulkConfirmModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleToggleAllTenants(bulkConfirmModal.key, bulkConfirmModal.enable)
                }
                className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm cursor-pointer ${
                  bulkConfirmModal.enable
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                Yes, {bulkConfirmModal.enable ? "Enable" : "Disable"} for All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Feature Flag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Feature Flag
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFlag} noValidate autoComplete="off" className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Flag Key (e.g., ai_barcode_scanner) *
                </label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="module_feature_name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Smart Barcode Scanning"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explains what this flag toggles..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Accessibility, Inventory, Billing..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="flag-default-enabled"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  className="size-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="flag-default-enabled" className="text-slate-700 dark:text-slate-300 font-medium">
                  Default Enabled (ON) in PostgreSQL
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Create Flag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
