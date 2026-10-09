/**
 * @file AppRoutes.tsx
 * @description Centralized React Router configuration defining application routes, page component mappings,
 * and authorization guards for all accessible modules.
 */

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { TrendingUp, Send, Shield, Cloud } from "lucide-react";
import ProtectedRoute from "../components/ProtectedRoute";
import ComingSoon from "../components/ComingSoon";
import { PAGE_TITLE } from "../data/navigation";
import { PageLoader } from "../components/Loader";
import { waitMockDelay, MOCK_DELAYS } from "../config/mockDelay";

// Lazy-loaded Page Views with mock delay support (configured in src/config/mockDelay.ts)
function lazyPage<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    await waitMockDelay(MOCK_DELAYS.PAGE_LOAD_MS);
    return factory();
  });
}

const DashboardPage = lazyPage(() => import("../pages/DashboardPage"));
const PurchaseOrdersPage = lazyPage(() => import("../pages/PurchaseOrdersPage"));
const PlatformOrdersPage = lazyPage(() => import("../pages/PlatformOrdersPage"));
const PhysicalOrdersPage = lazyPage(() => import("../pages/PhysicalOrdersPage"));
const SlotsPage = lazyPage(() => import("../pages/SlotsPage"));
const InventoryPage = lazyPage(() => import("../pages/InventoryPage"));
const CustomersPage = lazyPage(() => import("../pages/CustomersPage"));
const VendorsPage = lazyPage(() => import("../pages/VendorsPage"));
const ProductsPage = lazyPage(() => import("../pages/ProductsPage"));
const SalesPersonsPage = lazyPage(() => import("../pages/SalesPersonsPage"));
const DeliveryNotesPage = lazyPage(() => import("../pages/DeliveryNotesPage"));
const DepositsPage = lazyPage(() => import("../pages/DepositsPage"));
const GoodsReceiptPage = lazyPage(() => import("../pages/GoodsReceiptPage"));
const InvoicePage = lazyPage(() => import("../pages/InvoicePage"));
const ReportsPage = lazyPage(() => import("../pages/ReportsPage"));
const UsersPage = lazyPage(() => import("../pages/UsersPage"));
const AlertsPage = lazyPage(() => import("../pages/AlertsPage"));
const SettingsPage = lazyPage(() => import("../pages/SettingsPage"));
import { ToastType } from "../components/Toast";

interface AppRoutesProps {
  /** Toast notification trigger callback passed to pages */
  notify: (msg: string, type?: ToastType) => void;
}

/**
 * Common container for standard scrollable pages (Settings & Coming Soon) with footer
 */
function StandardPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 px-3.5 sm:px-5 py-4 min-w-0 overflow-y-auto w-full flex flex-col justify-between">
      <div>{children}</div>
      <footer className="mt-8 pt-5 border-t border-slate-200 flex flex-col sm:flex-row justify-between gap-1 text-xs text-slate-400">
        <span className="hidden sm:inline">© 2025 Gold System - Telegram Bot. All rights reserved.</span>
        <span className="sm:hidden">© 2025 All rights reserved.</span>
        <span>Version 1.0.0</span>
      </footer>
    </div>
  );
}

/**
 * Application routes component registering all route paths and module authorization rules.
 */
export default function AppRoutes({ notify }: AppRoutesProps) {
  return (
    <Suspense fallback={<PageLoader text="Loading page..." />}>
      <Routes>
        {/* Root redirect to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute module="dashboard">
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Gold In / Purchase Orders */}
      <Route
        path="/purchase"
        element={
          <ProtectedRoute module="purchase">
            <PurchaseOrdersPage poType="" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/po-local"
        element={
          <ProtectedRoute module="po-local">
            <PurchaseOrdersPage poType="LOCAL" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/po-oversea"
        element={
          <ProtectedRoute module="po-oversea">
            <PurchaseOrdersPage poType="OVERSEA" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goods-receipt"
        element={
          <ProtectedRoute module="goods-receipt">
            <GoodsReceiptPage notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Gold Out / Sell Orders & Delivery Notes */}
      <Route
        path="/sell-orders"
        element={
          <ProtectedRoute module="sell-orders">
            <PlatformOrdersPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/platform-orders"
        element={
          <ProtectedRoute module="platform-orders">
            <PlatformOrdersPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/physical-orders"
        element={
          <ProtectedRoute module="physical-orders">
            <PhysicalOrdersPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/delivery-notes"
        element={
          <ProtectedRoute module="delivery-notes">
            <DeliveryNotesPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice"
        element={
          <ProtectedRoute module="invoice">
            <InvoicePage notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Slots & Trading Quotas */}
      <Route
        path="/buy-back-slots"
        element={
          <ProtectedRoute module="buy-back-slots">
            <SlotsPage mode="buyback" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sell-slots-premium"
        element={
          <ProtectedRoute module="sell-slots-premium">
            <SlotsPage mode="sell" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/slots"
        element={
          <ProtectedRoute module="slots">
            <SlotsPage mode="buyback" notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Deposits & Withdrawals */}
      <Route
        path="/deposits"
        element={
          <ProtectedRoute module="deposits">
            <DepositsPage notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Master Data */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute module="customers">
            <CustomersPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors"
        element={
          <ProtectedRoute module="vendors">
            <VendorsPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/products"
        element={
          <ProtectedRoute module="products">
            <ProductsPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sales-persons"
        element={
          <ProtectedRoute module="sales-persons">
            <SalesPersonsPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory-ledger"
        element={
          <ProtectedRoute module="inventory-ledger">
            <InventoryPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute module="inventory">
            <InventoryPage notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute module="reports">
            <ReportsPage notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Alert Center */}
      <Route
        path="/low-stock-alerts"
        element={
          <ProtectedRoute module="low-stock-alerts">
            <AlertsPage mode="stock" notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discount-promotions"
        element={
          <ProtectedRoute module="discount-promotions">
            <AlertsPage mode="promo" notify={notify} />
          </ProtectedRoute>
        }
      />

      {/* Administration & Settings */}
      <Route
        path="/user-management"
        element={
          <ProtectedRoute module="user-management">
            <UsersPage notify={notify} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute module="settings">
            <StandardPageWrapper>
              <SettingsPage notify={notify} />
            </StandardPageWrapper>
          </ProtectedRoute>
        }
      />

      {/* Coming Soon & Auxiliary Pages */}
      <Route
        path="/gold-prices"
        element={
          <ProtectedRoute module="gold-prices">
            <StandardPageWrapper>
              <ComingSoon label={PAGE_TITLE["gold-prices"]} icon={TrendingUp} />
            </StandardPageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/telegram-bot"
        element={
          <ProtectedRoute module="telegram-bot">
            <StandardPageWrapper>
              <ComingSoon label={PAGE_TITLE["telegram-bot"]} icon={Send} />
            </StandardPageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-logs"
        element={
          <ProtectedRoute module="audit-logs">
            <StandardPageWrapper>
              <ComingSoon label={PAGE_TITLE["audit-logs"]} icon={Shield} />
            </StandardPageWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup"
        element={
          <ProtectedRoute module="backup">
            <StandardPageWrapper>
              <ComingSoon label={PAGE_TITLE["backup"]} icon={Cloud} />
            </StandardPageWrapper>
          </ProtectedRoute>
        }
      />

      {/* Fallback wildcard route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
  );
}

