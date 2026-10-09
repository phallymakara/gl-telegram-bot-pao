/**
 * @file NotificationContext.tsx
 * @description Centralized notifications context for real-time order (Buy & Sell),
 * deposit, and withdrawal activity tracking. Handles audio chimes, browser push
 * notifications, unread badge counters, and local persistence.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import { playNotificationSound, triggerBrowserNotification } from "../utils/sound";

export type NotificationType = "buy" | "sell" | "deposit" | "withdraw";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  amount?: string;
  tag: string;
  timestampMs: number;
  read: boolean;
  link: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  playTestChime: () => void;
  notifyAction: (item: {
    type: NotificationType;
    title: string;
    subtitle: string;
    amount?: string;
    tag?: string;
    link: string;
    id?: string;
  }) => void;
}

const STORAGE_KEY = "gl_app_notifications_v1";

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const ensureNegativeAmount = (type: NotificationType, amt?: string): string | undefined => {
  if (!amt) return amt;
  if ((type === "sell" || type === "withdraw") && !amt.startsWith("-")) {
    return `-${amt}`;
  }
  return amt;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item: AppNotification) => !item.read && !item.title?.includes("PO-BB"))
            .map((item: AppNotification) => ({
              ...item,
              amount: ensureNegativeAmount(item.type, item.amount),
            }));
        }
      }
    } catch {
      // Ignore parse errors
    }
    return [];
  });

  // Track known backend entity IDs to detect new incoming actions
  const seenOrderIds = useRef<Set<number>>(new Set());
  const seenPoIds = useRef<Set<number>>(new Set());
  const seenDepositIds = useRef<Set<number>>(new Set());
  const seenWithdrawalIds = useRef<Set<number>>(new Set());
  const isInitialized = useRef<boolean>(false);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 60)));
    } catch {
      // Storage quota or privacy restriction
    }
  }, [notifications]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  /**
   * Dispatches audio chime, system push notification, and adds to state.
   */
  const dispatchNotification = useCallback((item: AppNotification, playSound = true) => {
    const formattedItem: AppNotification = {
      ...item,
      amount: ensureNegativeAmount(item.type, item.amount),
    };

    setNotifications((prev) => {
      // Prevent duplicates
      if (prev.some((n) => n.id === formattedItem.id)) {
        return prev;
      }
      return [formattedItem, ...prev].slice(0, 60);
    });

    if (playSound) {
      playNotificationSound();
    }

    triggerBrowserNotification(formattedItem.title, {
      body: `${formattedItem.subtitle}${formattedItem.amount ? ` • ${formattedItem.amount}` : ""}`,
      tag: formattedItem.id,
    });
  }, []);

  /**
   * Programmatic dispatch when an action occurs directly in the UI.
   */
  const notifyAction = useCallback(
    (item: {
      type: NotificationType;
      title: string;
      subtitle: string;
      amount?: string;
      tag?: string;
      link: string;
      id?: string;
    }) => {
      const notifId = item.id || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newNotif: AppNotification = {
        id: notifId,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        amount: item.amount,
        tag: item.tag || item.type.toUpperCase(),
        timestampMs: Date.now(),
        read: false,
        link: item.link,
      };
      dispatchNotification(newNotif, true);
    },
    [dispatchNotification]
  );

  /**
   * Polling fetcher to sync latest Buy/Sell Orders, Purchase Orders, Deposits, and Withdrawals.
   */
  const checkForUpdates = useCallback(async () => {
    try {
      const [ordersRes, poRes, depRes, wthRes] = await Promise.allSettled([
        api.get<any[]>("/api/orders/"),
        api.get<any[]>("/api/purchase-orders/"),
        api.get<any[]>("/api/deposits/"),
        api.get<any[]>("/api/withdrawals/"),
      ]);

      const orders = ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value) ? ordersRes.value : [];
      const pos = poRes.status === "fulfilled" && Array.isArray(poRes.value) ? poRes.value : [];
      const deps = depRes.status === "fulfilled" && Array.isArray(depRes.value) ? depRes.value : [];
      const wths = wthRes.status === "fulfilled" && Array.isArray(wthRes.value) ? wthRes.value : [];

      // Initial cold load: seed IDs without triggering alarms
      if (!isInitialized.current) {
        orders.forEach((o) => o?.id && seenOrderIds.current.add(o.id));
        pos.forEach((p) => p?.id && seenPoIds.current.add(p.id));
        deps.forEach((d) => d?.id && seenDepositIds.current.add(d.id));
        wths.forEach((w) => w?.id && seenWithdrawalIds.current.add(w.id));
        isInitialized.current = true;
        return;
      }

      const newlyDetected: AppNotification[] = [];

      // 1. Check Orders (Platform & Telegram Buy/Sell)
      for (const o of orders) {
        if (!o?.id || seenOrderIds.current.has(o.id)) continue;
        seenOrderIds.current.add(o.id);

        const isBuy = String(o.transaction_type || "").toUpperCase() === "BUY";
        const type: NotificationType = isBuy ? "buy" : "sell";
        const tag = isBuy ? "BUY" : "SELL";
        const customer = o.customer_name || (o.username ? `@${o.username}` : "Customer");
        const qty = o.quantity ? `${o.quantity} ${o.unit_type || "Kg"}` : "";
        const channel = o.channel ? ` (${o.channel.replace(/_/g, " ")})` : "";
        const amt = o.total_amount
          ? `${isBuy ? "" : "-"}$${Number(o.total_amount).toLocaleString()}`
          : undefined;

        newlyDetected.push({
          id: `order-${o.id}`,
          type,
          tag,
          title: isBuy ? `New Buy Order #${o.order_no}` : `New Sell Order #${o.order_no}`,
          subtitle: `${customer} • ${qty}${channel}`,
          amount: amt,
          timestampMs: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
          read: false,
          link: isBuy ? "/physical-orders" : "/sell-orders",
        });
      }

      // 2. Check Purchase Orders (Gold In / Supplier Buys)
      for (const p of pos) {
        if (!p?.id || seenPoIds.current.has(p.id)) continue;
        seenPoIds.current.add(p.id);

        // Skip internal customer BUYBACK purchase orders (already notified as Telegram/Platform customer order)
        if (String(p.po_type || "").toUpperCase() === "BUYBACK" || String(p.po_no || "").includes("PO-BB")) {
          continue;
        }

        const supplier = p.supplier_name || p.po_type || "Supplier";
        const qty = p.quantity ? `${p.quantity} ${p.unit_type || "Kg"}` : "";
        const amt = p.total_cost ? `$${Number(p.total_cost).toLocaleString()}` : undefined;

        newlyDetected.push({
          id: `po-${p.id}`,
          type: "buy",
          tag: "BUY (PO)",
          title: `Purchase Order #${p.po_no}`,
          subtitle: `${supplier} • ${qty}`,
          amount: amt,
          timestampMs: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
          read: false,
          link: "/purchase",
        });
      }

      // 3. Check Deposits
      for (const d of deps) {
        if (!d?.id || seenDepositIds.current.has(d.id)) continue;
        seenDepositIds.current.add(d.id);

        const account = d.account_name || (d.username ? `@${d.username}` : "Customer");
        const method = d.payment_method ? d.payment_method.toUpperCase() : "Bank";
        const amt = d.amount ? `$${Number(d.amount).toLocaleString()}` : undefined;

        newlyDetected.push({
          id: `dep-${d.id}`,
          type: "deposit",
          tag: "DEPOSIT",
          title: `New Deposit #${d.deposit_no}`,
          subtitle: `${account} • Method: ${method}`,
          amount: amt,
          timestampMs: d.created_at ? new Date(d.created_at).getTime() : Date.now(),
          read: false,
          link: "/deposits?tab=deposits",
        });
      }

      // 4. Check Withdrawals
      for (const w of wths) {
        if (!w?.id || seenWithdrawalIds.current.has(w.id)) continue;
        seenWithdrawalIds.current.add(w.id);

        const account = w.account_name || (w.username ? `@${w.username}` : "Customer");
        const method = w.payment_method ? w.payment_method.toUpperCase() : "Bank";
        const amt = w.amount ? `-$${Number(w.amount).toLocaleString()}` : undefined;

        newlyDetected.push({
          id: `wth-${w.id}`,
          type: "withdraw",
          tag: "WITHDRAW",
          title: `New Withdrawal #${w.withdraw_no}`,
          subtitle: `${account} • Method: ${method}`,
          amount: amt,
          timestampMs: w.created_at ? new Date(w.created_at).getTime() : Date.now(),
          read: false,
          link: "/deposits?tab=withdrawals",
        });
      }

      // If new events found, play audio chime and notify
      if (newlyDetected.length > 0) {
        setNotifications((prev) => [...newlyDetected, ...prev].slice(0, 60));
        playNotificationSound();

        // Push desktop notification for the most prominent one
        const first = newlyDetected[0];
        triggerBrowserNotification(first.title, {
          body: `${first.subtitle}${first.amount ? ` • ${first.amount}` : ""}`,
          tag: first.id,
        });
      }
    } catch {
      // Quietly ignore polling fetch errors (network blip, etc.)
    }
  }, []);

  // Set up polling interval (every 3 seconds) and on window focus
  useEffect(() => {
    // Initial fetch
    checkForUpdates();

    const interval = setInterval(() => {
      checkForUpdates();
    }, 3000);

    const handleFocus = () => {
      checkForUpdates();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkForUpdates]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const playTestChime = useCallback(() => {
    playNotificationSound();
    triggerBrowserNotification("Test Notification", {
      body: "Notification chime and desktop push are working properly.",
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
        playTestChime,
        notifyAction,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
