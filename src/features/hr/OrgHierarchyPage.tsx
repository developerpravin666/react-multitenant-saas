import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Briefcase,
  Building,
  UserCheck,
  RefreshCw,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { hrService } from "./hrService";
import type { Employee } from "./hr.types";
import { useNotifications } from "../../context/NotificationContext";
import { APP_ROUTES } from "../../config/routes";

interface HierarchyNode {
  employee: Employee;
  directReports: HierarchyNode[];
}

export function OrgHierarchyPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const loadHierarchy = async () => {
    try {
      setLoading(true);
      const emps = await hrService.getEmployees();
      setEmployees(emps || []);
      // Expand root nodes by default
      const rootIds = emps.filter((e) => !e.reportsToEmployeeId).map((e) => e.id);
      setExpandedNodes(new Set(rootIds));
    } catch {
      notifications.error("Failed to load organization hierarchy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  // Build tree from flat employees
  const treeRoots = useMemo(() => {
    const nodeMap = new Map<string, HierarchyNode>();
    employees.forEach((emp) => {
      nodeMap.set(emp.id, { employee: emp, directReports: [] });
    });

    const roots: HierarchyNode[] = [];
    employees.forEach((emp) => {
      const node = nodeMap.get(emp.id)!;
      if (emp.reportsToEmployeeId && nodeMap.has(emp.reportsToEmployeeId)) {
        nodeMap.get(emp.reportsToEmployeeId)!.directReports.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [employees]);

  const toggleExpand = (empId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedNodes(new Set(employees.map((e) => e.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderNode = (node: HierarchyNode, level: number = 0) => {
    const { employee, directReports } = node;
    const isExpanded = expandedNodes.has(employee.id);
    const hasReports = directReports.length > 0;
    const matchesSearch =
      search.trim() !== "" &&
      (`${employee.firstName} ${employee.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        employee.designation.toLowerCase().includes(search.toLowerCase()) ||
        (employee.department || "").toLowerCase().includes(search.toLowerCase()) ||
        employee.employeeCode.toLowerCase().includes(search.toLowerCase()));

    return (
      <div key={employee.id} className="relative">
        {/* Node Card */}
        <div
          className={`flex items-start gap-4 p-4 rounded-xl border transition-all my-2 ${
            matchesSearch
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300"
              : level === 0
              ? "bg-indigo-50/40 border-indigo-200 shadow-sm"
              : "bg-white border-gray-200 hover:border-gray-300 shadow-xs"
          }`}
          style={{ marginLeft: `${level * 28}px` }}
        >
          {/* Collapse/Expand Toggle */}
          <div className="pt-1">
            {hasReports ? (
              <button
                type="button"
                onClick={() => toggleExpand(employee.id)}
                className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-6 h-6 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              </div>
            )}
          </div>

          {/* Avatar / Initials */}
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
            {employee.firstName.charAt(0)}
            {employee.lastName.charAt(0)}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h4>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-medium">
                {employee.employeeCode}
              </span>
              {level === 0 && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-semibold">
                  Leadership / Org Head
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
              <span className="font-semibold text-indigo-700 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {employee.designation}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-gray-500">
                <Building className="w-3.5 h-3.5" />
                {employee.department || employee.departmentName || "General"}
              </span>
              {hasReports && (
                <>
                  <span>•</span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-semibold">
                    {directReports.length} direct report{directReports.length > 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <a href={`mailto:${employee.email}`} className="flex items-center gap-1 hover:text-indigo-600">
                <Mail className="w-3.5 h-3.5" />
                {employee.email}
              </a>
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {employee.phone}
              </span>
            </div>
          </div>

          {/* Edit / View Profile action */}
          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.hr.employeeEdit(employee.id))}
              className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors inline-flex items-center gap-1"
            >
              Edit Profile
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Children Render */}
        {hasReports && isExpanded && (
          <div className="border-l-2 border-indigo-100 ml-6 pl-2">
            {directReports.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-600" />
            Organization Hierarchy
          </h1>
          <p className="text-sm text-gray-500">
            Visual organizational structure, reporting managers, and approval chain
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={loadHierarchy}
            className="p-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.hr.employeeAdd)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search employee by name, role, department or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="text-xs text-gray-500">
          Showing <span className="font-semibold text-gray-900">{employees.length}</span> employees in hierarchy
        </div>
      </div>

      {/* Tree View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-xs text-gray-500 font-medium">Building organizational hierarchy tree...</p>
          </div>
        ) : treeRoots.length === 0 ? (
          <div className="p-12 text-center">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900">No employees found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Add your first employee to start building your organizational hierarchy.
            </p>
            <button
              type="button"
              onClick={() => navigate(APP_ROUTES.hr.employeeAdd)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {treeRoots.map((root) => renderNode(root, 0))}
          </div>
        )}
      </div>
    </div>
  );
}
