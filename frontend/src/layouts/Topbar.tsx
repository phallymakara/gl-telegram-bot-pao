import React from "react";
import { Menu, ChevronRight, Bell, Diamond } from "lucide-react";
import { TOPBAR_ICON, BREADCRUMBS, PAGE_SUBTITLE } from "../data/navigation";

interface TopbarProps {
  page: string;
  setPage: (page: string) => void;
  setMobileOpen: (open: boolean) => void;
  desktopOpen: boolean;
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

export default function Topbar({
  page,
  setPage,
  setMobileOpen,
  desktopOpen,
  setDesktopOpen
}: TopbarProps) {
  const iconEntry = TOPBAR_ICON[page];
  const TopIcon = iconEntry === "menu" ? Menu : iconEntry;
  const subtitle = PAGE_SUBTITLE[page];

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between gap-4 px-4 sm:px-8 h-[72px]">
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
              Welcome User
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
              {BREADCRUMBS[page]?.map((b, i) => {
                const targetPage = breadcrumbPageMap[b];
                const isLast = i === BREADCRUMBS[page].length - 1;
                return (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight size={11} />}
                    {targetPage && !isLast ? (
                      <button
                        onClick={() => setPage(targetPage)}
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

        <div className="flex items-center gap-2.5 shrink-0">
          <button className="relative text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none p-1.5 mr-2">
            <Bell size={20} />
            <span className="absolute top-0 right-0 h-[18px] min-w-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-semibold flex items-center justify-center">
              3
            </span>
          </button>
        </div>
      </div>
      {subtitle && <p className="px-4 sm:px-8 pb-4 -mt-1 text-sm text-slate-500">{subtitle}</p>}
    </header>
  );
}
