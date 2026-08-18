/**
 * @file BotTab.tsx
 * @description Sub-component rendering Telegram Bot settings in system settings.
 */

import { Eye, EyeOff, Send } from "lucide-react";

interface BotTabProps {
  botUsername: string;
  setBotUsername: (val: string) => void;
  showToken: boolean;
  setShowToken: (val: boolean) => void;
  saveSettings: () => void;
}

/**
 * Telegram bot settings tab component.
 */
export default function BotTab({
  botUsername,
  setBotUsername,
  showToken,
  setShowToken,
  saveSettings,
}: BotTabProps) {
  return (
    <div id="section-bot" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-6">
      <div className="p-6 md:p-8 border-b border-slate-100">
        <h3 className="text-base font-bold text-slate-900">Telegram Bot Configurations</h3>
        <p className="text-xs text-slate-400 mt-1">Configure bot credentials and communication settings.</p>
      </div>
      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bot Username</label>
            <div className="relative">
              <Send size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={botUsername}
                onChange={(e) => setBotUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bot Token API</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                defaultValue="758493021:AAHk9d0sFk2m19-XzL4kLmN8p"
                className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={saveSettings}
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Save Configurations
          </button>
        </div>
      </div>
    </div>
  );
}
