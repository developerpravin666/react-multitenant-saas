import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Footer } from "./Footer";
import { APP_ROUTES } from "../../config/routes";
import { OfflineBanner } from "../network/OfflineBanner";

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "F4") {
        e.preventDefault();
        navigate(APP_ROUTES.contraVoucher);
      } else if (e.key === "F7") {
        e.preventDefault();
        navigate(APP_ROUTES.journalVoucher);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  return (
    <div
      className="
        flex
        min-h-screen
        bg-slate-50
        text-slate-900
        dark:bg-slate-950
        dark:text-slate-100
      "
    >
      <div className="no-print">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="no-print">
          <OfflineBanner />
          <Header />
        </div>

        <main className="flex-1 p-3 md:p-4 print:p-0">
          <Outlet />
        </main>

        <div className="no-print">
          <Footer />
        </div>
      </div>
    </div>
  );
}
