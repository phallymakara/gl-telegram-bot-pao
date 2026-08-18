/**
 * @file ProfileTab.tsx
 * @description Sub-component rendering the user profile section in system settings.
 */

import { Camera, Mail, User } from "lucide-react";

/**
 * Profile tab view component.
 */
export default function ProfileTab() {
  return (
    <div id="section-profile" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
      <div className="p-6 md:p-8 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">User Profile Information</h3>
        <p className="text-xs text-slate-400 mt-1">Manage your administrative details and account credentials.</p>
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/50 rounded-xl p-5 border border-slate-100">
          <div className="relative group shrink-0">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold border-2 border-white shadow-md">
              SA
            </div>
            <button className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none">
              <Camera size={14} />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h4 className="font-bold text-slate-800 text-base">Super Administrator</h4>
            <p className="text-[11px] text-slate-400 mt-2">Member since Jan 2025</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                defaultValue="System Admin"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                defaultValue="admin@goldsystem.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
