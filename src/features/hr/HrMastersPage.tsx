import React, { useState, useEffect, useMemo } from "react";
import {
  Sliders,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  Clock,
  Layers,
  DollarSign,
  CalendarDays,
  X,
  Save,
  Tag,
  RefreshCw,
} from "lucide-react";
import { hrService } from "./hrService";
import type { HrMasterItem } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";

const CATEGORIES = [
  { key: "DEPARTMENT", label: "Departments", icon: Building, desc: "Organizational departments & cost centers" },
  { key: "JOB_TITLE", label: "Job Titles / Designations", icon: Briefcase, desc: "Roles, designations & job profiles" },
  { key: "EMPLOYMENT_TYPE", label: "Employment Types", icon: Clock, desc: "Full-time, Part-time, Contract, Intern" },
  { key: "EMPLOYEE_STATUS", label: "Employee Statuses", icon: Tag, desc: "Active, Probation, On Leave, Resigned" },
  { key: "SALARY_TYPE", label: "Salary Types", icon: DollarSign, desc: "Monthly Gross vs Annual CTC Packages" },
  { key: "LEAVE_CATEGORY", label: "Leave Categories", icon: CalendarDays, desc: "Casual, Sick, Earned, Maternity, Paternity" },
];

export function HrMastersPage() {
  const notifications = useNotifications();
  const [activeCategory, setActiveCategory] = useState<string>("DEPARTMENT");
  const [masters, setMasters] = useState<HrMasterItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");

  // Create Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    displayOrder: 1,
    isDefault: false,
  });

  const loadMasters = async () => {
    try {
      setLoading(true);
      const items = await hrService.getMasters();
      setMasters(items || []);
    } catch {
      notifications.error("Failed to load HR master items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  const filteredItems = useMemo(() => {
    return masters.filter((m) => {
      const matchCat = m.category === activeCategory;
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [masters, activeCategory, search]);

  const handleOpenAdd = () => {
    setForm({
      name: "",
      code: "",
      description: "",
      displayOrder: (filteredItems.length + 1) * 10,
      isDefault: false,
    });
    setShowAddModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notifications.error("Name is required");
      return;
    }
    const generatedCode = form.code.trim() || form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").slice(0, 15);

    try {
      setIsSubmitting(true);
      await hrService.createMaster({
        category: activeCategory,
        name: form.name.trim(),
        code: generatedCode,
        description: form.description.trim() || undefined,
        sortOrder: form.displayOrder,
        isDefault: form.isDefault,
      });
      notifications.success(`Added new entry to ${activeCategory}`);
      setShowAddModal(false);
      await loadMasters();
    } catch (err: any) {
      notifications.error(err?.response?.data?.message || err?.message || "Failed to create master entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryMeta = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0]!;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-600" />
            HR Master Entries & Setup
          </h1>
          <p className="text-sm text-gray-500">
            Manage organization masters for departments, designations, employment types, statuses, salary formats, and leave categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadMasters}
            className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add {currentCategoryMeta.label.replace(/s$/, "")}
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.key;
          const count = masters.filter((m) => m.category === cat.key).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`p-3.5 text-left rounded-xl border transition-all ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50/70 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${isSelected ? "text-indigo-600" : "text-gray-500"}`} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isSelected ? "bg-indigo-200 text-indigo-800" : "bg-gray-100 text-gray-600"}`}>
                  {count}
                </span>
              </div>
              <div className="text-xs font-bold text-gray-900 leading-snug">{cat.label}</div>
            </button>
          );
        })}
      </div>

      {/* Active Category Header & Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">{currentCategoryMeta.label}</h2>
          <p className="text-xs text-gray-500">{currentCategoryMeta.desc}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${currentCategoryMeta.label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table of Master Entries */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Loading {currentCategoryMeta.label}...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <currentCategoryMeta.icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No master items found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Get started by adding default or customized {currentCategoryMeta.label.toLowerCase()} for your organization.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First {currentCategoryMeta.label.replace(/s$/, "")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Name / Title</th>
                  <th className="py-3 px-4">Code / Key</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Sort Order</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {item.name}
                        {item.isDefault && (
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-gray-600 bg-gray-50/50 rounded">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500 max-w-xs truncate">
                      {item.description || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      {item.displayOrder}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Master Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                Add New {currentCategoryMeta.label.replace(/s$/, "")}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${currentCategoryMeta.key === "DEPARTMENT" ? "Operations" : currentCategoryMeta.key === "JOB_TITLE" ? "Lead Architect" : "Standard"}`}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Code / Identifier (Optional, auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. OPS_DEPT"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief details about this master entry"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Display Sort Order</label>
                  <input
                    type="number"
                    min="1"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Set as Default
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Master Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
