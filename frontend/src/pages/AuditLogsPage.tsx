/**
 * @file AuditLogsPage.tsx
 * @description Super Admin Activity & Audit Logs page tracking authentication events
 * (login, logout, account switches), sell/buy order creation and changes, stock adjustments,
 * purchasing, financial approvals, and configuration updates.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import Card from "../components/Card";
import SearchInput from "../components/SearchInput";
import Pagination from "../components/Pagination";
import SuperAdminPasswordModal from "../components/SuperAdminPasswordModal";
import { TableLoader } from "../components/Loader";
import {
  auditLogsApi,
  ActivityLogItem,
  ActivityLogStats,
  usersApi,
  UserData,
} from "../api";
import { useAuth } from "../context/AuthContext";

interface AuditLogsPageProps {
  /** Toast notification callback */
  notify: (msg: string, type?: "success" | "error") => void;
}

const PAGE_SIZE = 25;

const CATEGORY_BADGES: Record<string, string> = {
  AUTH: "text-indigo-700",
  ORDERS: "text-emerald-700",
  STOCK: "text-amber-700",
  PURCHASING: "text-blue-700",
  DELIVERY: "text-cyan-700",
  FINANCE: "text-teal-700",
  USERS: "text-violet-700",
  SETTINGS: "text-purple-700",
  MASTER_DATA: "text-slate-700",
};

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatTimestamp(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) {
    return { date: iso, time: "" };
  }
  return {
    date: dt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
    time: dt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

/**
 * Super Admin Activity & Audit Logs view.
 */
export default function AuditLogsPage(_props: AuditLogsPageProps) {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();

  const [unlocked, setUnlocked] = useState<boolean>(
    () => sessionStorage.getItem("super_admin_unlocked") === "true"
  );
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ActivityLogStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFirstLoad = useRef(true);
  const inFlight = useRef(false);

  // Filters & pagination
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadMetadata = useCallback(async () => {
    if (!isSuperAdmin || !unlocked) return;
    try {
      const [statsRes, usersRes] = await Promise.all([
        auditLogsApi.getStats(),
        usersApi.getUsers(),
      ]);
      setStats(statsRes);
      setUsers(usersRes);
    } catch {
      // Metadata failure handled softly alongside main table fetch
    }
  }, [isSuperAdmin, unlocked]);

  const loadLogs = useCallback(async (silent = false) => {
    if (!isSuperAdmin || !unlocked) {
      setLoading(false);
      return;
    }
    if (silent && (inFlight.current || document.visibilityState === "hidden")) {
      return;
    }
    inFlight.current = true;
    if (!silent && isFirstLoad.current) {
      setLoading(true);
    }
    if (!silent) {
      setErrorMsg(null);
    }
    try {
      const res = await auditLogsApi.getLogs({
        search: debouncedSearch || undefined,
        category: categoryFilter || undefined,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
        user_id: userIdFilter ? Number(userIdFilter) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setLogs(res.items);
      setTotal(res.total);
      setErrorMsg(null);
    } catch {
      if (!silent) {
        setErrorMsg("Unable to load activity logs right now.");
      }
    } finally {
      setLoading(false);
      isFirstLoad.current = false;
      inFlight.current = false;
    }
  }, [
    isSuperAdmin,
    unlocked,
    debouncedSearch,
    categoryFilter,
    actionFilter,
    statusFilter,
    userIdFilter,
    dateFrom,
    dateTo,
    page,
  ]);

  // Initial load + realtime polling (every 2s & on window focus)
  useEffect(() => {
    isFirstLoad.current = true;
    loadMetadata();
    loadLogs(false);

    const interval = setInterval(() => {
      loadLogs(true);
      loadMetadata();
    }, 2000);

    const handleFocus = () => {
      loadLogs(true);
      loadMetadata();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadMetadata, loadLogs]);

  const resetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setActionFilter("");
    setStatusFilter("");
    setUserIdFilter("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasFilters = Boolean(
    searchInput ||
      categoryFilter ||
      actionFilter ||
      statusFilter ||
      userIdFilter ||
      dateFrom ||
      dateTo
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!unlocked) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full flex items-center justify-center">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Lock size={22} />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-800">
              Super Admin Verification Required
            </h2>
            <p className="text-xs text-slate-500">
              Verify Super Admin password to inspect system login, order, and stock activity logs.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => navigate("/user-management")}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Back to Users
            </button>
            <button
              type="button"
              onClick={() => setUnlockModalOpen(true)}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Unlock Activity Logs
            </button>
          </div>
        </Card>

        <SuperAdminPasswordModal
          isOpen={unlockModalOpen}
          onClose={() => setUnlockModalOpen(false)}
          onSuccess={() => {
            setUnlocked(true);
            auditLogsApi
              .recordAuthEvent({ event_type: "SUPER_ADMIN_UNLOCK" })
              .catch(() => {});
          }}
          title="Unlock Activity Logs"
          description="Enter Super Admin password to inspect system audit trails."
        />
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-3 lg:p-4 h-full flex flex-col gap-2 overflow-hidden">
      {/* Main Audit Logs Table Card */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Compact Filter Toolbar */}
        <div className="p-2.5 border-b border-slate-100 flex flex-wrap items-center gap-1.5 flex-shrink-0">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              size="sm"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search user, action, order reference, IP, or description..."
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setActionFilter("");
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Categories</option>
            {(stats?.categories || []).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Actions</option>
            {(stats?.actions || []).map((act) => (
              <option key={act} value={act}>
                {formatActionLabel(act)}
              </option>
            ))}
          </select>

          <select
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name} (@{u.username})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>

          <div className="flex items-center gap-1">
            <input
              type="date"
              aria-label="Start date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              aria-label="End date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-[11px] text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">Timestamp</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">User</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">Category</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">Action</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">Target</th>
                <th className="px-2.5 py-2 font-medium bg-slate-50">Description</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">Status</th>
                <th className="px-2.5 py-2 font-medium whitespace-nowrap bg-slate-50">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableLoader colSpan={8} text="Loading activity logs..." />
              ) : errorMsg ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-rose-600">
                    {errorMsg}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-1.5">
                      <Shield size={22} className="text-slate-300" />
                      <span>No activity logs match the selected filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const ts = formatTimestamp(log.created_at);
                  const catColor = CATEGORY_BADGES[log.category] || "text-slate-700";
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-2.5 py-2 whitespace-nowrap leading-tight">
                        <div className="text-slate-700">{ts.date}</div>
                        {ts.time && (
                          <div className="text-[11px] text-slate-400 font-mono">{ts.time}</div>
                        )}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-slate-800">
                        {log.actor_name || log.username || "System"}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className={`text-[11px] font-medium ${catColor}`}>
                          {log.category}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-slate-700">
                        {formatActionLabel(log.action)}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {log.entity_type || log.entity_id
                          ? `${log.entity_type || "Item"}${log.entity_id ? ` #${log.entity_id}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-2.5 py-2 text-slate-700 max-w-md whitespace-nowrap truncate" title={log.description}>
                        {log.description}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            log.status === "FAILED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {log.ip_address || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          totalRecords={total}
          pageSize={PAGE_SIZE}
        />
      </Card>
    </div>
  );
}

