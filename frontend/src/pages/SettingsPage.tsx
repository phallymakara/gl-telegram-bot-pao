import React, { useState, useEffect } from "react";
import { Send, EyeOff, Eye, Shield, Lock, Clock, User, Mail, Camera } from "lucide-react";
import Toggle from "../components/Toggle";
import { api } from "../data/api";

interface SettingsPageProps {
  notify: (msg: string) => void;
}

export default function SettingsPage({ notify }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "bot" | "security" | "system">("profile");
  const [showToken, setShowToken] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [botUsername, setBotUsername] = useState("GoldSystemBot");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [passwordExpiry, setPasswordExpiry] = useState(90);

  useEffect(() => {
    api.get<any>("/api/settings/").then((s) => {
      setBotUsername(s.bot.bot_username);
      setSessionTimeout(s.security.session_timeout);
      setPasswordExpiry(s.security.password_expiry);
      setTwoFA(s.security.two_factor);
      setOpenTime(s.system.open_time);
      setCloseTime(s.system.close_time);
    }).catch(() => {});
  }, []);

  function saveSettings() {
    api.put("/api/settings/", {
      bot: { bot_token: "", bot_username: botUsername },
      security: { session_timeout: sessionTimeout, password_expiry: passwordExpiry, two_factor: twoFA },
      system: { open_time: openTime, close_time: closeTime },
    }).then(() => notify("Settings saved")).catch(() => notify("Failed to save settings"));
  }

  const tabs = [
    { id: "profile", label: "User Profile", desc: "Personal info & avatar", icon: User },
    { id: "bot", label: "Telegram Bot", desc: "Bot token & username", icon: Send },
    { id: "security", label: "Security Settings", desc: "2FA & timeout configs", icon: Shield },
    { id: "system", label: "Operating Hours", desc: "Store operating times", icon: Clock },
  ] as const;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto w-full">
      <div className="md:col-span-1 flex flex-col gap-1 pr-2">
        <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settings Menu</div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3.5 py-3 rounded-lg transition-all duration-150 flex items-center gap-3 relative focus:outline-none ${isActive ? "bg-slate-100 text-slate-900 font-semibold" : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"}`}>
              {isActive && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-indigo-600" />}
              <Icon size={16} className={`shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span className="text-[13px] leading-normal">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="md:col-span-3">
        {activeTab === "profile" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">User Profile Information</h3>
              <p className="text-xs text-slate-400 mt-1">Manage your administrative details and account credentials.</p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/50 rounded-xl p-5 border border-slate-100">
                <div className="relative group shrink-0">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xl font-bold border-2 border-white shadow-md">SA</div>
                  <button className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"><Camera size={14} /></button>
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="font-bold text-slate-800 text-base">Super Administrator</h4>
                  <p className="text-[11px] text-slate-400 mt-2">Member since Jan 2025</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <input defaultValue="Super Admin" className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <input defaultValue="admin@goldsystem.com" className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => notify("User profile updated successfully")} className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-600/10 transition-all">Save Profile Changes</button>
            </div>
          </div>
        )}

        {activeTab === "bot" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Telegram Bot Configuration</h3>
              <p className="text-xs text-slate-400 mt-1">Configure credentials and tokens for the bot integration.</p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bot API Token</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input readOnly value={showToken ? "7284:AAH-x92kLp_gS3dF7qRtYzW1nMvBcXeUio" : "••••••••••••••••••••••••••••••••••••"} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 pr-10 bg-slate-50/30 text-slate-600 focus:outline-none font-mono" />
                    <button onClick={() => setShowToken((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">{showToken ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  </div>
                  <button onClick={() => notify("Bot token updated successfully")} className="px-4 py-2.5 text-xs font-semibold rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">Update Token</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bot Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">@</span>
                  <input value={botUsername} onChange={(e) => setBotUsername(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg pl-8 pr-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all font-medium" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={saveSettings} className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-600/10 transition-all">Save Bot Config</button>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Security & Access Management</h3>
              <p className="text-xs text-slate-400 mt-1">Configure session restrictions and authentication policies.</p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Session Timeout (Minutes)</label>
                  <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(+e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password Expiry (Days)</label>
                  <input type="number" value={passwordExpiry} onChange={(e) => setPasswordExpiry(+e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-between bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Two-Factor Authentication</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Require OTP multi-factor code upon administrator login.</div>
                </div>
                <Toggle on={twoFA} onClick={() => setTwoFA((v) => !v)} />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={saveSettings} className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-600/10 transition-all">Save Security Changes</button>
            </div>
          </div>
        )}

        {activeTab === "system" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Operating Hours Settings</h3>
              <p className="text-xs text-slate-400 mt-1">Configure business operating timings and timezone schedules.</p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Open Time</label>
                  <div className="relative">
                    <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                    <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Store Close Time</label>
                  <div className="relative">
                    <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 bg-slate-50/30 text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50/35 transition-all" />
                    <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={saveSettings} className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-600/10 transition-all">Save Business Hours</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
