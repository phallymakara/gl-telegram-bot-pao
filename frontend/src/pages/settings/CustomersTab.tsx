/**
 * @file CustomersTab.tsx
 * @description Sub-component rendering Telegram whitelist customers management tab in settings.
 */

import { Plus, Trash2, UserCheck } from "lucide-react";
import IconBtn from "../../components/IconBtn";
import { CustomerData } from "../../api";

interface CustomersTabProps {
  customers: CustomerData[];
  newUserId: string;
  setNewUserId: (val: string) => void;
  newUsername: string;
  setNewUsername: (val: string) => void;
  addCustomer: () => void;
  removeCustomer: (id: number) => void;
}

/**
 * Customers Telegram whitelist tab component.
 */
export default function CustomersTab({
  customers,
  newUserId,
  setNewUserId,
  newUsername,
  setNewUsername,
  addCustomer,
  removeCustomer,
}: CustomersTabProps) {
  return (
    <div id="section-allow-user" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
      <div className="p-6 md:p-8 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">Allowed Telegram Users (Whitelist)</h3>
        <p className="text-xs text-slate-400 mt-1">
          Only authorized Telegram accounts will be permitted to access and interact with the bot.
        </p>
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Telegram Username</label>
            <input
              type="text"
              placeholder="@username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Telegram User ID</label>
            <input
              type="text"
              placeholder="e.g. 123456789"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono text-xs"
            />
          </div>
          <div>
            <button
              onClick={addCustomer}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus size={14} /> Add User
            </button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Telegram Username</th>
                <th className="px-4 py-3">Telegram ID</th>
                <th className="px-4 py-3">Added Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                    No whitelisted users configured yet.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 flex items-center gap-2">
                      <UserCheck size={15} className="text-emerald-500" />
                      {c.username ? `@${c.username}` : c.display_name || "Unknown"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.telegram_user_id}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <IconBtn title="Remove User" tone="danger" onClick={() => removeCustomer(c.id)}>
                        <Trash2 size={14} />
                      </IconBtn>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
