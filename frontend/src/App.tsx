import React, { useState, useRef } from "react";
import { TrendingUp, Archive, Users, BarChart3, Send, Shield, Cloud } from "lucide-react";
import Sidebar from "./layouts/Sidebar";
import Topbar from "./layouts/Topbar";
import DashboardPage from "./pages/DashboardPage";
import PlatformOrdersPage from "./pages/PlatformOrdersPage";
import PhysicalOrdersPage from "./pages/PhysicalOrdersPage";
import SlotsPage from "./pages/SlotsPage";
import AlertsPage from "./pages/AlertsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import ComingSoon from "./components/ComingSoon";
import Toast from "./components/Toast";
import { PAGE_TITLE } from "./data/navigation";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function notify(msg: string) {
    setToast(msg);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setToast(null), 2200);
  }

  const simplePages: Record<string, React.ComponentType<any>> = {
    "gold-prices": TrendingUp,
    inventory: Archive,
    customers: Users,
    "telegram-bot": Send,
    "audit-logs": Shield,
    backup: Cloud
  };

  return (
    <div
      className="h-screen max-h-screen bg-slate-50 flex text-slate-800 overflow-hidden"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <Sidebar
        page={page}
        setPage={setPage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopOpen={desktopOpen}
        setDesktopOpen={setDesktopOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar
          page={page}
          setPage={setPage}
          setMobileOpen={setMobileOpen}
          desktopOpen={desktopOpen}
          setDesktopOpen={setDesktopOpen}
        />
        <main className="flex-1 min-w-0 overflow-hidden w-full flex flex-col">
          {page === "platform-orders" && <PlatformOrdersPage notify={notify} />}
          {page === "physical-orders" && <PhysicalOrdersPage notify={notify} />}
          {page === "low-stock-alerts" && <AlertsPage mode="stock" notify={notify} />}
          {page === "discount-promotions" && <AlertsPage mode="promo" notify={notify} />}
          {page === "user-management" && <UsersPage notify={notify} />}
          {page === "slots" && <SlotsPage notify={notify} />}
          {page !== "platform-orders" && page !== "physical-orders" && page !== "low-stock-alerts" && page !== "discount-promotions" && page !== "user-management" && page !== "slots" && (
            <div className="flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col justify-between">
              <div>
                {page === "dashboard" && <DashboardPage />}
                {page === "settings" && <SettingsPage notify={notify} />}
                {simplePages[page] && (
                  <ComingSoon label={PAGE_TITLE[page]} icon={simplePages[page]} />
                )}
              </div>
              <footer className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-1 text-xs text-slate-400">
                <span>© 2025 Gold System - Telegram Bot. All rights reserved.</span>
                <span>Version 1.0.0</span>
              </footer>
            </div>
          )}
        </main>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
