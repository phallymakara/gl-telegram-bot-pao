/**
 * @file App.tsx
 * @description Main application container component managing page routing state, layout shell (Sidebar & Topbar),
 * toast notification state, authentication context provider, and permission-based route protection.
 */

import React, { useState, useRef, useEffect } from "react";
import { TrendingUp, BarChart3, Send, Shield, Cloud, Lock, ArrowRight } from "lucide-react";
import Sidebar from "./layouts/Sidebar";
import Topbar from "./layouts/Topbar";
import GoodsReceiptPage from "./pages/GoodsReceiptPage";
import InvoicePage from "./pages/InvoicePage";
import DeliveryNotesPage from "./pages/DeliveryNotesPage";
import ReportsPage from "./pages/ReportsPage";
import DashboardPage from "./pages/DashboardPage";
import PlatformOrdersPage from "./pages/PlatformOrdersPage";
import PhysicalOrdersPage from "./pages/PhysicalOrdersPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import SlotsPage from "./pages/SlotsPage";
import InventoryPage from "./pages/InventoryPage";
import CustomersPage from "./pages/CustomersPage";
import VendorsPage from "./pages/VendorsPage";
import ProductsPage from "./pages/ProductsPage";
import SalesPersonsPage from "./pages/SalesPersonsPage";
import AlertsPage from "./pages/AlertsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import DepositsPage from "./pages/DepositsPage";
import ComingSoon from "./components/ComingSoon";
import Toast, { ToastType } from "./components/Toast";
import { PAGE_TITLE } from "./data/navigation";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AppContent() {
  const { currentUser, isAllowed, getAllowedModulesList } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("success");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function notify(msg: string, type: ToastType = "success") {
    setToast(msg);
    setToastType(type);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setToast(null), type === "error" ? 4500 : 2200);
  }

  // Check if current user has permission for the active page
  const hasPageAccess = isAllowed(page);

  const simplePages: Record<string, React.ComponentType<any>> = {
    "gold-prices": TrendingUp,
    "telegram-bot": Send,
    "audit-logs": Shield,
    backup: Cloud,
  };

  const isCustomFullPage =
    page === "platform-orders" ||
    page === "physical-orders" ||
    page === "po-local" ||
    page === "po-oversea" ||
    page === "purchase" ||
    page === "buy-back-slots" ||
    page === "goods-receipt" ||
    page === "sell-slots-premium" ||
    page === "sell-orders" ||
    page === "invoice" ||
    page === "delivery-notes" ||
    page === "inventory-ledger" ||
    page === "customers" ||
    page === "vendors" ||
    page === "products" ||
    page === "sales-persons" ||
    page === "reports" ||
    page === "low-stock-alerts" ||
    page === "discount-promotions" ||
    page === "user-management" ||
    page === "deposits" ||
    page === "slots" ||
    page === "inventory";

  const navigateToFirstAllowed = () => {
    const allowed = getAllowedModulesList();
    if (allowed.length > 0) {
      setPage(allowed[0]);
    } else {
      setPage("dashboard");
    }
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
          {!hasPageAccess ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                  <Lock size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Module Access Restricted</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    Your account (<strong>{currentUser?.name || "User"}</strong> ·{" "}
                    <span className="text-indigo-600">{currentUser?.role || "Staff"}</span>) does
                    not have permission to access the <strong>{PAGE_TITLE[page] || page}</strong>{" "}
                    module.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={navigateToFirstAllowed}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
                  >
                    Go to Allowed Module <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {page === "purchase" && <PurchaseOrdersPage poType="" notify={notify} />}
              {page === "buy-back-slots" && <SlotsPage mode="buyback" notify={notify} />}
              {page === "sell-slots-premium" && <SlotsPage mode="sell" notify={notify} />}
              {page === "sell-orders" && <PlatformOrdersPage notify={notify} />}
              {page === "delivery-notes" && <DeliveryNotesPage notify={notify} />}
              {page === "inventory-ledger" && <InventoryPage notify={notify} />}
              {page === "customers" && <CustomersPage notify={notify} />}
              {page === "vendors" && <VendorsPage notify={notify} />}
              {page === "products" && <ProductsPage notify={notify} />}
              {page === "sales-persons" && <SalesPersonsPage notify={notify} />}
              {page === "reports" && <ReportsPage notify={notify} />}

              {page === "platform-orders" && <PlatformOrdersPage notify={notify} />}
              {page === "physical-orders" && <PhysicalOrdersPage notify={notify} />}
              {page === "po-local" && <PurchaseOrdersPage poType="LOCAL" notify={notify} />}
              {page === "po-oversea" && <PurchaseOrdersPage poType="OVERSEA" notify={notify} />}
              {page === "low-stock-alerts" && <AlertsPage mode="stock" notify={notify} />}

              {page === "discount-promotions" && <AlertsPage mode="promo" notify={notify} />}
              {page === "deposits" && <DepositsPage notify={notify} />}
              {page === "user-management" && <UsersPage notify={notify} />}
              {page === "slots" && <SlotsPage mode="buyback" notify={notify} />}
              {page === "inventory" && <InventoryPage notify={notify} />}

              {!isCustomFullPage && (
                <div
                  className={`flex-1 p-4 sm:p-8 min-w-0 overflow-y-auto w-full flex flex-col justify-between ${
                    page === "dashboard" ? "bg-white" : ""
                  }`}
                >
                  <div>
                    {page === "dashboard" && <DashboardPage />}
                    {page === "settings" && <SettingsPage notify={notify} />}
                    {simplePages[page] && (
                      <ComingSoon label={PAGE_TITLE[page]} icon={simplePages[page]} />
                    )}
                  </div>
                  <footer className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-1 text-xs text-slate-400">
                    <span className="hidden sm:inline">© 2025 Gold System - Telegram Bot. All rights reserved.</span>
                    <span className="sm:hidden">© 2025 All rights reserved.</span>
                    <span>Version 1.0.0</span>
                  </footer>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      <Toast toast={toast} type={toastType} />
    </div>
  );
}

/**
 * Root React App component wrapped in AuthProvider.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
