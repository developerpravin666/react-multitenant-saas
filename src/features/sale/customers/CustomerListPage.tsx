import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { History as HistoryIcon, Plus, RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { useNotifications } from "../../../context/NotificationContext";
import { APP_ROUTES } from "../../../config/routes";
import { DynamicGrid } from "../../dynamic-grid/DynamicGrid";
import type { GridAction } from "../../../types/grid";
import { customerApi, customerColumns } from "./customerResource";
import type { CustomerRecord } from "./customer.types";

export function CustomerListPage() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [refreshKey, setRefreshKey] = useState(0);

  const actions: GridAction<CustomerRecord>[] = [
    { id: "statement", label: "Statement (SOA)", icon: "view", onClick: (customer) => navigate(APP_ROUTES.sale.customers.statement(customer.id)) },
    { id: "history", label: "History", icon: "view", onClick: (customer) => navigate(APP_ROUTES.sale.customers.history(customer.id)) },
    { id: "audit-history", label: "Audit History", icon: "history", onClick: (customer) => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=customers&recordId=${encodeURIComponent(customer.id)}`) },
    { id: "edit", label: "Edit", icon: "edit", onClick: (customer) => navigate(APP_ROUTES.sale.customers.edit(customer.id)) },
    {
      id: "delete", label: "Delete", icon: "delete", variant: "danger",
      onClick: async (customer) => {
        if (customer.salesCount > 0) {
          notifications.error("Customer has sales history", "Customers with sales history are kept to preserve their records.");
          return;
        }
        const confirmed = await notifications.confirm({ title: "Delete customer?", message: "This enquiry customer will be removed.", variant: "danger", confirmLabel: "Delete" });
        if (!confirmed) return;
        try {
          await customerApi.remove(customer.id);
          setRefreshKey((key) => key + 1);
          notifications.success("Customer deleted", "The customer record was deleted.");
        } catch (reason) {
          notifications.error("Customer could not be deleted", reason instanceof Error ? reason.message : "Unable to delete customer.");
        }
      },
      hidden: (customer) => customer.salesCount > 0,
    },
  ];

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-semibold tracking-tight">Customers</h1><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Save enquiries and keep each customer’s complete sales and payment history.</p></div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`${APP_ROUTES.settings.auditLogs}?tableName=customers`)}><HistoryIcon size={16} /> Audit History</Button>
          <Button variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}><RefreshCw size={16} /> Refresh</Button>
          <Button onClick={() => navigate(APP_ROUTES.sale.customers.add)}><Plus size={16} /> Add Customer</Button>
        </div>
      </header>
      <DynamicGrid
        title="Customer List"
        columns={customerColumns}
        mode="server"
        serverSource={customerApi.serverSource}
        refreshKey={refreshKey}
        getRowId={(customer) => customer.id}
        actions={actions}
        emptyMessage="No customers saved yet. Add customers who come for an enquiry or purchase."
      />
    </section>
  );
}
