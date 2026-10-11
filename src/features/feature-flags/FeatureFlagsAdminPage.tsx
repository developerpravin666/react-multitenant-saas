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
} from "lucide-react";
import { useFeatureFlags } from "./FeatureFlagContext";
import { useNotifications } from "../../context/NotificationContext";

export function FeatureFlagsAdminPage() {
  const { items, loading, toggleFlag, saveFlag, refreshFlags } = useFeatureFlags();
  const notifications = useNotifications();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

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

  const handleToggle = async (key: string, currentStatus: boolean) => {
    setTogglingKey(key);
    const nextStatus = !currentStatus;
    const ok = await toggleFlag(key, nextStatus);
    setTogglingKey(null);

    if (ok) {
      notifications.success(
        "Feature Flag Updated",
        `Flag '${key}' has been set to ${nextStatus ? "Enabled" : "Disabled"} in the database.`
      );
    } else {
      notifications.error("Update Failed", "Could not persist feature flag update to the database.");
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
                Database Stored
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage runtime feature toggles stored persistently in PostgreSQL (<code className="font-mono">tenant.feature_flags</code>). Changes propagate instantly across all user sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refreshFlags()}
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

      {/* Database Storage Notice */}
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900 dark:border-indigo-950/60 dark:bg-indigo-950/20 dark:text-indigo-300">
        <Info className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div className="flex-1">
          <span className="font-semibold">Central Database Storage:</span> Feature flag configurations are persisted in the master database schema table <code className="font-mono text-[11px] bg-white/80 dark:bg-slate-900/80 px-1 py-0.5 rounded">tenant.feature_flags</code>. When toggled, states sync dynamically across all stores without requiring server restarts.
        </div>
      </div>

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

      {/* Feature Flags Grid / List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredItems.map((flag) => {
          const isToggling = togglingKey === flag.key;
          const isVoiceFlag = flag.key.toLowerCase() === "voice_typing";

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

                {/* Database Toggle Switch */}
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
                    title={`Click to ${flag.isEnabled ? "disable" : "enable"} ${flag.name} in database`}
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

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {flag.category}
                </span>

                <span className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  <span>PostgreSQL Synced</span>
                </span>
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
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFlag} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Flag Key (e.g., ai_barcode_scanner) *
                </label>
                <input
                  type="text"
                  required
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
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Smart Barcode Scanning"
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
                  placeholder="General / Inventory / Billing"
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
                  placeholder="What does this feature flag control?"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-enabled"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-indigo-600"
                />
                <label htmlFor="modal-enabled" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Enable immediately in database upon creation
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving to Database…" : "Save to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

