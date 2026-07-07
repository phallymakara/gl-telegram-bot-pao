import React, { useState, useEffect } from "react";
import { Users, User, Shield, Plus, EyeOff, Eye, Pencil, Trash2 } from "lucide-react";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import IconBtn from "../components/IconBtn";
import { api, UserData } from "../data/api";

interface UsersPageProps {
  notify: (msg: string) => void;
}

export default function UsersPage({ notify }: UsersPageProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All Roles");
  const [statusF, setStatusF] = useState("All Statuses");
  const [reveal, setReveal] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.get<UserData[]>("/api/users/").then(setUsers).catch(() => notify("Failed to load users"));
  }, []);

  const filtered = users.filter((u) => {
    const mq = !q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()) || u.username.toLowerCase().includes(q.toLowerCase());
    const mr = role === "All Roles" || u.role === role;
    const ms = statusF === "All Statuses" || (statusF === "Active") === u.is_active;
    return mq && mr && ms;
  });

  const roleTint: Record<string, string> = {
    "Super Admin": "bg-violet-50 text-violet-700",
    Admin: "bg-blue-50 text-blue-700",
    Manager: "bg-emerald-50 text-emerald-700",
    Staff: "bg-slate-100 text-slate-600",
  };

  const activeUsers = users.filter((u) => u.is_active).length;

  return (
    <div className="flex-1 pt-4 px-4 pb-2 sm:pt-4 sm:px-8 sm:pb-2 min-w-0 overflow-hidden w-full flex flex-col space-y-3 min-h-0">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-shrink-0">
        <StatCard icon={Users} label="Total Users" value={users.length} sub="All Users" tint="bg-indigo-50 text-indigo-600" />
        <StatCard icon={User} label="Active Users" value={activeUsers} sub="Currently Active" tint="bg-emerald-50 text-emerald-600" />
        <StatCard icon={User} label="Inactive Users" value={users.length - activeUsers} sub="Currently Inactive" tint="bg-amber-50 text-amber-600" />
      </div>

      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 flex-shrink-0">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or username…" />
          <button onClick={() => notify("Invite sent")} className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium whitespace-nowrap"><Plus size={15} /> Add New User</button>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none">
            {["All Roles", "Super Admin", "Admin", "Manager", "Staff"].map((r) => (<option key={r}>{r}</option>))}
          </select>
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white text-slate-600 focus:outline-none">
            {["All Statuses", "Active", "Inactive"].map((s) => (<option key={s}>{s}</option>))}
          </select>
          <button onClick={() => { setQ(""); setRole("All Roles"); setStatusF("All Statuses"); }} className="text-sm px-3.5 py-2.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">Reset</button>
        </div>
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 w-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200 bg-slate-50">
                {["#", "Name", "USER ID", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (<th key={h} className="px-5 py-3 font-medium whitespace-nowrap bg-slate-50">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-slate-400">{i + 1}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-slate-700">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono">{u.username}</td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleTint[u.role] || "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={u.is_active ? "Active" : "Inactive"} /></td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <IconBtn title="Edit"><Pencil size={15} /></IconBtn>
                      <IconBtn title="Delete" tone="danger" onClick={() => { api.delete(`/api/users/${u.id}`).then(() => { setUsers((us) => us.filter((x) => x.id !== u.id)); notify("User removed"); }).catch(() => notify("Failed to delete user")); }}><Trash2 size={15} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
