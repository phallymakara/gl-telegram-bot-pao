/**
 * @file ProfileTab.tsx
 * @description Sub-component rendering the user profile section in system settings.
 */

import { Camera, Mail, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * Profile tab view component.
 */
export default function ProfileTab() {
  const { currentUser } = useAuth();

  const displayName = currentUser?.name || currentUser?.username || "Super Administrator";
  const displayRole = currentUser?.role || "Administrator";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SA";

  return (
    <div id="section-profile" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6 p-6 md:p-8 space-y-6">
      <div className="flex flex-col items-center justify-center text-center gap-3">
        <div className="relative group shrink-0">
          <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold border-2 border-white">
            {initials}
          </div>
          <button
            type="button"
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none cursor-pointer"
          >
            <Camera size={16} />
          </button>
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-base">{displayName}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{displayRole}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              key={currentUser?.name}
              defaultValue={currentUser?.name || ""}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              key={currentUser?.email}
              defaultValue={currentUser?.email || ""}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
