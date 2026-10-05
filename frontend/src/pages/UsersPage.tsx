/**
 * @file UsersPage.tsx
 * @description User Management page component for creating, updating, activating/deactivating,
 * removing accounts, and configuring granular sidebar module permissions.
 */

import React, { useState, useEffect } from "react";
import { Users, User, Shield, Plus, Pencil, Trash2, Key, CheckCircle, Layers } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import IconBtn from "../components/IconBtn";
import UserModal from "../components/UserModal";
import SuperAdminPasswordModal from "../components/SuperAdminPasswordModal";
import { api, UserData } from "../api";
import { useAuth } from "../context/AuthContext";
import { ALL_MODULES } from "../data/navigation";

interface UsersPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string, type?: "success" | "error") => void;
}

/**
 * System User Management page component.
 */
export default function UsersPage({ notify }: UsersPageProps) {
  const { refreshUsers: refreshAuthUsers, currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All Roles");
  const [statusF, setStatusF] = useState("All Statuses");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserData | null>(null);
  const [verifyPasswordOpen, setVerifyPasswordOpen] = useState(false);
  const [pendingSuperAdminUser, setPendingSuperAdminUser] = useState<UserData | null>(null);

  const isSuperAdminUser = (u: UserData) =>
    u.role === "Super Admin" || u.role === "SUPER_ADMIN" || u.name === "Super Admin";

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get<UserData[]>("/api/users/");
      setUsers(data);
    } catch {
      notify("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateOpen = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditOpen = (u: UserData) => {
    if (isSuperAdminUser(u) && sessionStorage.getItem("super_admin_unlocked") !== "true") {
      setPendingSuperAdminUser(u);
      setVerifyPasswordOpen(true);
      return;
    }
    setUserToEdit(u);
    setIsModalOpen(true);
  };

  const handleDelete = async (u: UserData) => {
    if (currentUser?.id === u.id) {
      notify("You cannot delete your own logged-in account", "error");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user "${u.name}" (${u.username})?`)) {
      return;
    }
    try {
      await api.delete(`/api/users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      await refreshAuthUsers();
      notify(`User "${u.name}" removed successfully`);
    } catch (err: any) {
      notify(err?.message || "Failed to delete user", "error");
    }
  };

  const handleModalSuccess = async () => {
    await loadUsers();
    await refreshAuthUsers();
  };

  const filtered = users.filter((u) => {
    const mq =
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase());
    const mr = role === "All Roles" || u.role === role;
    const ms = statusF === "All Statuses" || (statusF === "Active") === u.is_active;
    return mq && mr && ms;
  });

  const roleTint: Record<string, string> = {
    "Super Admin": "bg-violet-50 text-violet-700 border-violet-100",
    SUPER_ADMIN: "bg-violet-50 text-violet-700 border-violet-100",
    Admin: "bg-blue-50 text-blue-700 border-blue-100",
    Manager: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Staff: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const activeUsers = users.filter((u) => u.is_active).length;

  const renderModuleBadge = (u: UserData) => {
    const isSuper = u.role === "Super Admin" || u.role === "SUPER_ADMIN" || u.allowed_modules?.includes("*");
    if (isSuper) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle size={12} /> All Modules
        </span>
      );
    }
    const count = u.allowed_modules?.length || 0;
    if (count === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">
          No Access
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1.5" title={u.allowed_modules?.join(", ")}>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Layers size={11} /> {count} / {ALL_MODULES.length} Modules
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard icon={Users} label="Total Users" value={users.length} sub="System Accounts" tint="bg-indigo-50 text-indigo-600" />
        <StatCard icon={User} label="Active Users" value={activeUsers} sub="Operational" tint="bg-emerald-50 text-emerald-600" />
        <StatCard icon={Shield} label="Roles Configured" value={Array.from(new Set(users.map((u) => u.role))).length} sub="Super Admin, Admin, Staff" tint="bg-violet-50 text-violet-600" />
      </div>

      {/* Main Table Card */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Action and Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 flex-shrink-0 items-stretch sm:items-center justify-between">
          <div className="flex-1 min-w-[240px]">
            <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or username…" />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {["All Roles", "Super Admin", "Admin", "Manager", "Staff"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              value={statusF}
              onChange={(e) => setStatusF(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {["All Statuses", "Active", "Inactive"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {(q || role !== "All Roles" || statusF !== "All Statuses") && (
              <button
                onClick={() => {
                  setQ("");
                  setRole("All Roles");
                  setStatusF("All Statuses");
                }}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            )}

            <button
              onClick={handleCreateOpen}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium whitespace-nowrap shadow-sm transition-all cursor-pointer"
            >
              <Plus size={16} /> Add New User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["#", "User", "USER ID", "Email", "Role", "Status", "Sidebar Module Access", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    No users matching the filters found.
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => (
                  <tr
                    key={u.id}
                    onClick={() => handleEditOpen(u)}
                    className="border-b border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                          {u.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="leading-tight">
                          <span className="font-semibold text-slate-800 block">{u.name}</span>
                          {currentUser?.id === u.id && (
                            <span className="text-[10px] text-indigo-600 font-medium">(You)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap font-mono text-xs">
                      {u.username}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{u.email}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          roleTint[u.role] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={u.is_active ? "Active" : "Inactive"} />
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{renderModuleBadge(u)}</td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <IconBtn
                          title="Edit User & Permissions"
                          onClick={() => handleEditOpen(u)}
                        >
                          <Pencil size={15} />
                        </IconBtn>
                        <IconBtn
                          title="Delete User"
                          tone="danger"
                          onClick={() => handleDelete(u)}
                        >
                          <Trash2 size={15} />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User Create / Edit Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userToEdit={userToEdit}
        onSuccess={handleModalSuccess}
        notify={notify}
      />

      {/* Super Admin Password Verification Modal */}
      <SuperAdminPasswordModal
        isOpen={verifyPasswordOpen}
        onClose={() => {
          setVerifyPasswordOpen(false);
          setPendingSuperAdminUser(null);
        }}
        onSuccess={() => {
          if (pendingSuperAdminUser) {
            setUserToEdit(pendingSuperAdminUser);
            setIsModalOpen(true);
            setPendingSuperAdminUser(null);
          }
        }}
        title="Super Admin Verification"
        description="Enter password to view Super Admin user."
      />
    </div>
  );
}
