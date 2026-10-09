import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, ChevronRight, Bell, Diamond, Trash2, Volume2, ArrowRight, X } from "lucide-react";
import { TOPBAR_ICON, BREADCRUMBS, PAGE_SUBTITLE } from "../data/navigation";
import { useAuth } from "../context/AuthContext";
import { useNotifications, NotificationType } from "../context/NotificationContext";

interface TopbarProps {
  /** Active page route key (optional) */
  page?: string;
  /** Navigation callback handler (optional) */
  setPage?: (page: string) => void;
  /** Mobile drawer toggle callback */
  setMobileOpen: (open: boolean) => void;
  /** Desktop sidebar collapse state */
  desktopOpen: boolean;
  /** Desktop sidebar toggle callback */
  setDesktopOpen: (open: boolean) => void;
}

const breadcrumbPageMap: Record<string, string> = {
  "Dashboard": "dashboard",
  "Orders": "platform-orders",
  "Platform Orders": "platform-orders",
  "Physical Orders": "physical-orders",
  "Slots": "slots",
  "Customers": "customers",
  "Reports": "reports",
  "Analytics": "analytics",
  "User Management": "user-management",
  "Alert Center": "low-stock-alerts",
  "Low Stock Alert": "low-stock-alerts",
  "Discount Promotion": "discount-promotions",
  "Settings": "settings"
};

function formatTimeAgo(timestampMs: number): string {
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const date = new Date(timestampMs);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatNotificationAmount(type: string, amount?: string): string | undefined {
  if (!amount) return undefined;
  if ((type === "sell" || type === "withdraw") && !amount.startsWith("-")) {
    return `-${amount}`;
  }
  return amount;
}

export default function Topbar({
  page,
  setPage,
  setMobileOpen,
  desktopOpen,
  setDesktopOpen
}: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    playTestChime
  } = useNotifications();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Active page route derived from current URL path
  const currentPath = location.pathname.replace(/^\//, "") || "dashboard";
  const activePage = page || currentPath;

  const handleNav = (targetPage: string) => {
    if (setPage) setPage(targetPage);
    navigate(`/${targetPage}`);
  };

  const handleNotificationClick = (item: { id: string; link: string }) => {
    markAsRead(item.id);
    setDropdownOpen(false);
    navigate(item.link);
  };

  const { currentUser } = useAuth();
  const iconEntry = TOPBAR_ICON[activePage];
  const TopIcon = iconEntry === "menu" ? Menu : iconEntry;
  const subtitle = PAGE_SUBTITLE[activePage];

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-4 px-3.5 sm:px-5 h-[72px]">
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm hover:opacity-90 transition-opacity focus:outline-none mr-2"
            title="Show Sidebar"
          >
            <Diamond size={18} fill="white" strokeWidth={1} />
          </button>
          {desktopOpen && iconEntry !== "menu" && (
            <div className="hidden lg:flex h-11 w-11 rounded-xl bg-indigo-600 text-white items-center justify-center shrink-0 mr-3.5">
              <TopIcon size={19} />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
              Welcome, {currentUser?.name || "Administrator"}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              {BREADCRUMBS[activePage]?.map((b, i) => {
                const targetPage = breadcrumbPageMap[b];
                const isLast = i === BREADCRUMBS[activePage].length - 1;
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={11} />}
                    {targetPage && !isLast ? (
                      <button
                        onClick={() => handleNav(targetPage)}
                        className="hover:text-indigo-600 hover:underline focus:outline-none transition-colors"
                      >
                        {b}
                      </button>
                    ) : (
                      <span>{b}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-2.5 shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="text-slate-500 hover:text-slate-800 transition-colors focus:outline-none p-1.5"
            title="View Notifications"
          >
            <div className="relative inline-flex items-center justify-center">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-[17px] min-w-[17px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white leading-none select-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </button>

          {/* Notifications Dropdown Panel */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-700">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-normal text-red-500">
                      ({unreadCount} unread)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Clear all notifications"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List Body */}
              <div className="h-[280px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center px-6 text-center text-slate-500">
                    <div className="h-10 w-10 flex items-center justify-center text-slate-400 mb-2">
                      <Bell size={20} />
                    </div>
                    <p className="text-xs font-normal text-slate-500">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className="px-3.5 py-1.5 cursor-pointer transition-colors flex items-center gap-2.5 hover:bg-slate-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-600 font-normal truncate">
                            {item.subtitle}
                          </p>
                          {item.amount && (
                            <span className="text-xs font-normal text-slate-600 shrink-0">
                              {formatNotificationAmount(item.type, item.amount)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5 text-[10px] text-slate-400 leading-tight">
                          <span>{formatTimeAgo(item.timestampMs)}</span>
                          <span className="text-slate-400 hover:text-indigo-600 hover:underline flex items-center gap-0.5">
                            View details <ArrowRight size={9} />
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(item.id);
                        }}
                        className="text-slate-300 hover:text-slate-600 p-0.5 rounded transition-colors shrink-0"
                        title="Dismiss notification"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-end text-[11px] text-slate-500">
                <button
                  onClick={playTestChime}
                  className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors hover:underline"
                  title="Test notification sound & push"
                >
                  <Volume2 size={12} />
                  <span>Test sound</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {subtitle && <p className="px-3.5 sm:px-5 pb-4 -mt-1 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}
