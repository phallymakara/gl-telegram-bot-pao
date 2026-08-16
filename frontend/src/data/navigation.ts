import {
  Home, ShoppingCart, Calendar, TrendingUp, Archive, Users, FileText,
  BarChart3, Send, User, Shield, Bell, Settings as SettingsIcon, Cloud, Store, Monitor, Package, Tag,
  ArrowDownLeft, ArrowUpRight, ShoppingBag, FileCheck, Truck, Layers
} from "lucide-react";
import React from "react";

export interface NavSubItem {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
}

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  badge?: number;
  children?: NavSubItem[];
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "buy-back-slots", label: "Slots", icon: Calendar },
  {
    id: "gold-in", label: "Gold In (Buying)", icon: ArrowDownLeft, children: [
      { id: "purchase", label: "Purchase", icon: ShoppingBag },
    ]
  },
  {
    id: "gold-out", label: "Gold Out (Selling)", icon: ArrowUpRight, children: [
      { id: "sell-orders", label: "Sell Orders", icon: ShoppingCart },
      { id: "delivery-notes", label: "Delivery Notes", icon: Truck },
    ]
  },
  {
    id: "master-stock", label: "Master & Stock", icon: Layers, children: [
      { id: "inventory-ledger", label: "Inventory Ledger", icon: Archive },
    ]
  },
  { id: "user-management", label: "User Management", icon: User },
  {
    id: "alert-center", label: "Alert Center", icon: Bell, children: [
      { id: "low-stock-alerts", label: "Low Stock Alert", icon: Package },
      { id: "discount-promotions", label: "Discount Promotion", icon: Tag },
    ]
  },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export const BREADCRUMBS: Record<string, string[]> = {
  "dashboard": ["Dashboard"],
  "gold-in": ["Dashboard", "Gold In (Buying)"],
  "purchase": ["Dashboard", "Gold In (Buying)", "Purchase"],
  "buy-back-slots": ["Dashboard", "Slots"],
  "gold-out": ["Dashboard", "Gold Out (Selling)"],
  "sell-orders": ["Dashboard", "Gold Out (Selling)", "Sell Orders"],
  "delivery-notes": ["Dashboard", "Gold Out (Selling)", "Delivery Notes"],
  "master-stock": ["Dashboard", "Master & Stock"],
  "inventory-ledger": ["Dashboard", "Master & Stock", "Inventory Ledger"],
  "platform-orders": ["Dashboard", "Orders", "Platform Orders"],
  "physical-orders": ["Dashboard", "Orders", "Physical Orders"],
  "po-local": ["Dashboard", "Purchase Orders", "Local PO"],
  "po-oversea": ["Dashboard", "Purchase Orders", "Oversea PO"],
  "slots": ["Dashboard", "Slots"],
  "gold-prices": ["Dashboard", "Gold Prices"],
  "inventory": ["Dashboard", "Inventory"],
  "customers": ["Dashboard", "Customers"],
  "telegram-bot": ["Dashboard", "Telegram Bot"],
  "user-management": ["Dashboard", "User Management"],
  "audit-logs": ["Dashboard", "Audit Logs"],
  "low-stock-alerts": ["Dashboard", "Alert Center", "Low Stock Alert"],
  "discount-promotions": ["Dashboard", "Alert Center", "Discount Promotion"],
  "settings": ["Dashboard", "Settings"],
  "backup": ["Dashboard", "Backup"],
};

// Icon shown in the colored square on the topbar — matches each reference screen exactly
// ("menu" = hamburger, everything else = the page's own icon)
export const TOPBAR_ICON: Record<string, any> = {
  "dashboard": "menu",
  "purchase": "menu",
  "buy-back-slots": "menu",
  "goods-receipt": "menu",
  "sell-slots-premium": "menu",
  "sell-orders": "menu",
  "invoice": "menu",
  "delivery-notes": "menu",
  "inventory-ledger": "menu",
  "platform-orders": "menu",
  "physical-orders": "menu",
  "po-local": "menu",
  "po-oversea": "menu",
  "slots": "menu",
  "user-management": "menu",
  "gold-prices": "menu",
  "inventory": "menu",
  "customers": "menu",
  "telegram-bot": "menu",
  "audit-logs": "menu",
  "backup": "menu",
  "low-stock-alerts": "menu",
  "discount-promotions": "menu",
  "settings": "menu",
};

export const PAGE_TITLE: Record<string, string> = {
  "dashboard": "Dashboard Overview",
  "purchase": "Purchase Orders",
  "buy-back-slots": "Slots Management",
  "sell-orders": "Sell Orders",
  "delivery-notes": "Delivery Notes",
  "inventory-ledger": "Inventory Ledger",
  "platform-orders": "Platform Orders",
  "physical-orders": "Physical Orders",
  "po-local": "Local Purchase Orders",
  "po-oversea": "Oversea Purchase Orders",
  "slots": "Slots Management",
  "gold-prices": "Gold Prices",
  "inventory": "Inventory",
  "customers": "Customers",
  "telegram-bot": "Telegram Bot",
  "user-management": "User Management",
  "audit-logs": "Audit Logs",
  "low-stock-alerts": "Low Stock Alert",
  "discount-promotions": "Discount Promotion",
  "settings": "Settings",
  "backup": "Backup",
};




export const PAGE_SUBTITLE: Record<string, string> = {
};
