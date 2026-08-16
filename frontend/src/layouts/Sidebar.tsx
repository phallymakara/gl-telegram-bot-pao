import React from "react";
import { Diamond, User, ChevronDown } from "lucide-react";
import { NAV_ITEMS } from "../data/navigation";

interface SidebarProps {
  page: string;
  setPage: (page: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  desktopOpen: boolean;
  setDesktopOpen: (open: boolean) => void;
}

export default function Sidebar({
  page,
  setPage,
  mobileOpen,
  setMobileOpen,
  desktopOpen,
  setDesktopOpen
}: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed lg:sticky lg:top-0 z-40 top-0 left-0 h-screen bg-white border-r border-slate-200 flex flex-col transition-all duration-300 overflow-hidden ${mobileOpen
            ? "translate-x-0 w-72"
            : "-translate-x-full lg:translate-x-0"
          } ${!desktopOpen
            ? "lg:w-20"
            : "lg:w-72"
          }`}
      >
        <div className={`flex items-center border-b border-slate-100 shrink-0 h-[72px] justify-between px-5 transition-all duration-300 ${!desktopOpen ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDesktopOpen(!desktopOpen)}
              className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm hover:opacity-90 transition-opacity focus:outline-none cursor-pointer"
              title={desktopOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
              <Diamond size={18} fill="white" strokeWidth={1} />
            </button>
            <div className={`leading-tight transition-all duration-300 ${!desktopOpen ? "lg:hidden" : "block"}`}>
              <div className="font-bold text-slate-800 text-[15px] tracking-tight">GOLD SYSTEM</div>
              <div className="text-[11px] text-slate-400">Telegram Bot</div>
            </div>
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto py-3 space-y-1.5 transition-all duration-300 ${!desktopOpen ? "px-1.5" : "px-3"}`}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isParentActive = item.children?.some((c) => c.id === page);
            const active = page === item.id || isParentActive;

            if (item.children) {
              return (
                <div key={item.id} className="pt-2 pb-1">
                  {/* Category Main Page Title Header */}
                  <div
                    className={`w-full flex items-center text-[12px] font-bold text-slate-400 uppercase tracking-wider ${!desktopOpen
                        ? "justify-center px-0 py-2 lg:w-12 mx-auto"
                        : "gap-2.5 px-3 py-1.5"
                      }`}
                    title={item.label}
                  >
                    <Icon size={16} className="shrink-0 text-slate-400" />
                    <span className={`flex-1 text-left ${!desktopOpen ? "lg:hidden" : "block"}`}>{item.label}</span>
                  </div>

                  {/* Sub Pages (Always Visible) */}
                  <div className={desktopOpen ? "ml-[18px] mt-1 space-y-0.5 border-l border-slate-200/80 pl-2.5" : "mt-1 space-y-1.5 flex flex-col items-center"}>
                    {item.children.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setPage(c.id);
                          setMobileOpen(false);
                        }}
                        className={desktopOpen ? `w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition-all cursor-pointer ${page === c.id
                            ? "text-indigo-700 font-semibold bg-indigo-50/80 shadow-2xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
                          }` : `h-8 w-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${page === c.id
                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          }`}
                        title={c.label}
                      >
                        {c.icon && <c.icon size={desktopOpen ? 15 : 16} className="shrink-0" />}
                        {desktopOpen && <span>{c.label}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center rounded-lg text-[14px] font-medium transition-colors cursor-pointer relative ${active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-slate-600 hover:bg-slate-50"
                  } ${!desktopOpen
                    ? "justify-center px-0 py-3 lg:w-12 lg:h-12 mx-auto"
                    : "gap-3 px-3 py-2.5"
                  }`}
                title={item.label}
              >
                <Icon size={17} className="shrink-0" />
                <span className={`flex-1 text-left ${!desktopOpen ? "lg:hidden" : "block"}`}>{item.label}</span>
                {item.badge && desktopOpen && (
                  <span className="text-[10px] font-semibold rounded-full bg-rose-500 text-white h-[18px] min-w-[18px] px-1 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {item.badge && !desktopOpen && (
                  <span className="absolute top-1 right-1 text-[8px] font-semibold rounded-full bg-rose-500 text-white h-4 min-w-[16px] px-0.5 flex items-center justify-center lg:flex hidden">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className={`flex items-center rounded-lg hover:bg-slate-50 p-2 cursor-pointer transition-all duration-300 ${!desktopOpen ? "lg:justify-center lg:p-1" : "gap-2.5"
            }`}>
            <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 font-semibold text-xs">
              <User size={16} />
            </div>
            <div className={`leading-tight ${!desktopOpen ? "lg:hidden" : "block"}`}>
              <div className="text-sm font-semibold text-slate-800">Admin</div>
              <div className="text-[11px] text-slate-400">Super Administrator</div>
            </div>
            <ChevronDown size={14} className={`text-slate-400 ml-auto ${!desktopOpen ? "lg:hidden" : "block"}`} />
          </div>
        </div>
      </aside>
    </>
  );
}
