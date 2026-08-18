/**
 * @file index.ts
 * @description Central barrel export file for all page view components. Maps each page file to its user-facing UI route name for developer clarity.
 */

// Dashboard Overview (Route: "dashboard")
export { default as DashboardPage } from "./DashboardPage";

// Purchase Orders (Route: "purchase", "po-local", "po-oversea")
export { default as PurchaseOrdersPage } from "./PurchaseOrdersPage";

// Platform & Online Orders (Route: "sell-orders", "platform-orders")
export { default as PlatformOrdersPage } from "./PlatformOrdersPage";

// Physical Store Orders (Route: "physical-orders")
export { default as PhysicalOrdersPage } from "./PhysicalOrdersPage";

// Slots & Price Tables (Route: "buy-back-slots", "sell-slots-premium", "slots")
export { default as SlotsPage } from "./SlotsPage";

// Inventory Stock Ledger (Route: "inventory-ledger", "inventory")
export { default as InventoryPage } from "./InventoryPage";

// Delivery Notes (Route: "delivery-notes")
export { default as DeliveryNotesPage } from "./DeliveryNotesPage";

// Goods Receipt Vouchers (Route: "goods-receipt")
export { default as GoodsReceiptPage } from "./GoodsReceiptPage";

// Customer Invoices (Route: "invoice")
export { default as InvoicePage } from "./InvoicePage";

// Reports & Analytics (Route: "reports")
export { default as ReportsPage } from "./ReportsPage";

// User Management (Route: "user-management")
export { default as UsersPage } from "./UsersPage";

// Alert Center & Promotions (Route: "low-stock-alerts", "discount-promotions")
export { default as AlertsPage } from "./AlertsPage";

// System Settings (Route: "settings")
export { default as SettingsPage } from "./SettingsPage";
