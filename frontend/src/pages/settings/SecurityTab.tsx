/**
 * @file SecurityTab.tsx
 * @description Sub-component rendering security preferences, session timeout, and 2FA options in system settings.
 */

import Toggle from "../../components/Toggle";

interface SecurityTabProps {
  twoFA: boolean;
  setTwoFA: (val: boolean) => void;
  openTime: string;
  setOpenTime: (val: string) => void;
  closeTime: string;
  setCloseTime: (val: string) => void;
  sessionTimeout: number;
  setSessionTimeout: (val: number) => void;
  passwordExpiry: number;
  setPasswordExpiry: (val: number) => void;
  saveSettings: () => void;
}

/**
 * Security & Operating hours settings tab component.
 */
export default function SecurityTab({
  twoFA,
  setTwoFA,
  openTime,
  setOpenTime,
  closeTime,
  setCloseTime,
  sessionTimeout,
  setSessionTimeout,
  passwordExpiry,
  setPasswordExpiry,
  saveSettings,
}: SecurityTabProps) {
  return (
    <>
      <div id="section-security" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Security & Authentication</h3>
          <p className="text-xs text-slate-400 mt-1">Configure session policies and multi-factor authentication.</p>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800 text-sm">Two-Factor Authentication (2FA)</div>
              <div className="text-xs text-slate-400 mt-0.5">Require TOTP code verification on admin logins.</div>
            </div>
            <Toggle on={twoFA} onClick={() => setTwoFA(!twoFA)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Session Timeout (Minutes)</label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Password Expiry (Days)</label>
              <input
                type="number"
                value={passwordExpiry}
                onChange={(e) => setPasswordExpiry(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div id="section-system" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
        <div className="p-6 md:p-8 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Operating Hours & Schedule</h3>
          <p className="text-xs text-slate-400 mt-1">Configure trading hours for automatic order acceptance.</p>
        </div>
        <div className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Opening Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={saveSettings}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Save Schedule Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
