import {
  Home, ShoppingCart, Calendar, TrendingUp, Archive, Users, FileText,
  BarChart3, Send, User, Shield, Bell, Settings as SettingsIcon, Cloud, Store, Monitor, Package, Tag
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
  { id: "orders", label: "Orders", icon: ShoppingCart, children: [
      { id: "platform-orders", label: "Platform Orders", icon: Monitor },
      { id: "physical-orders", label: "Physical Orders", icon: Store },
    ] },
  { id: "slots", label: "Slots", icon: Calendar },
  { id: "customers", label: "Customers", icon: Users },
  { id: "user-management", label: "User Management", icon: User },
  { id: "alert-center", label: "Alert Center", icon: Bell, children: [
      { id: "low-stock-alerts", label: "Low Stock Alert", icon: Package },
      { id: "discount-promotions", label: "Discount Promotion", icon: Tag },
    ] },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export const BREADCRUMBS: Record<string, string[]> = {
  "dashboard": ["Dashboard"],
  "platform-orders": ["Dashboard", "Orders", "Platform Orders"],
  "physical-orders": ["Dashboard", "Orders", "Physical Orders"],
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
  "platform-orders": "menu",
  "physical-orders": "menu",
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
  "platform-orders": "Platform Orders",
  "physical-orders": "Physical Orders",
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
