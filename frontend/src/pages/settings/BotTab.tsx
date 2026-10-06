/**
 * @file BotTab.tsx
 * @description Sub-component rendering Telegram Bot settings and payment method toggles.
 */

import { Eye, EyeOff, Send } from "lucide-react";
import { api } from "../../api";
import Toggle from "../../components/Toggle";

export interface PaymentMethodsState {
  deposit: {
    bank: boolean;
    cheque: boolean;
    cash: boolean;
  };
  withdrawal: {
    bank: boolean;
    cheque: boolean;
    cash: boolean;
  };
}

interface BotTabProps {
  botUsername: string;
  setBotUsername: (val: string) => void;
  showToken: boolean;
  setShowToken: (val: boolean) => void;
  paymentMethods: PaymentMethodsState;
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethodsState>>;
  saveSettings: () => void;
  notify: (msg: string) => void;
}

/**
 * Telegram bot settings tab component with payment method toggle buttons.
 */
export default function BotTab({
  botUsername,
  setBotUsername,
  showToken,
  setShowToken,
  paymentMethods,
  setPaymentMethods,
  saveSettings,
  notify,
}: BotTabProps) {
  function toggleDepositMethod(key: "bank" | "cheque" | "cash") {
    const current = paymentMethods.deposit[key];
    if (current) {
      const activeCount = Object.values(paymentMethods.deposit).filter(Boolean).length;
      if (activeCount <= 1) {
        notify("At least one deposit payment method must remain active.");
        return;
      }
    }
    const updated: PaymentMethodsState = {
      ...paymentMethods,
      deposit: { ...paymentMethods.deposit, [key]: !current },
    };
    setPaymentMethods(updated);
    api
      .put("/api/settings/payment-methods", updated)
      .then(() => notify("Payment method setting updated"))
      .catch((err: any) => notify(err.message || "Failed to update payment method"));
  }

  function toggleWithdrawalMethod(key: "bank" | "cheque" | "cash") {
    const current = paymentMethods.withdrawal[key];
    if (current) {
      const activeCount = Object.values(paymentMethods.withdrawal).filter(Boolean).length;
      if (activeCount <= 1) {
        notify("At least one withdrawal payment method must remain active.");
        return;
      }
    }
    const updated: PaymentMethodsState = {
      ...paymentMethods,
      withdrawal: { ...paymentMethods.withdrawal, [key]: !current },
    };
    setPaymentMethods(updated);
    api
      .put("/api/settings/payment-methods", updated)
      .then(() => notify("Payment method setting updated"))
      .catch((err: any) => notify(err.message || "Failed to update payment method"));
  }

  return (
    <div id="section-bot" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6">
      <div className="p-6 md:p-8 pb-0">
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
                placeholder="Bot username"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bot Token API</label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                placeholder="Bot token API"
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
            className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            Save Configurations
          </button>
        </div>
      </div>

      {/* Payment Method Toggle Buttons Section */}
      <div className="border-t border-slate-200 p-6 md:p-8 space-y-5 bg-slate-50/30 font-kantoumrouy">
        <div>
          <h4 className="text-sm font-bold text-slate-900 leading-snug">Payment Method Buttons (វិធីសាស្ត្រទូទាត់)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Show or hide payment buttons in Telegram.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Deposit Payment Methods */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Deposit (បញ្ចូលប្រាក់)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Payment</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">តាមគណនីធនាគារ (Bank Transfer)</p>
                <p className="text-[11px] text-slate-400">Shows Bank QR code & slip upload button</p>
              </div>
              <Toggle on={paymentMethods.deposit.bank} onClick={() => toggleDepositMethod("bank")} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">មូលប្បទានប័ត្រ (Cheque)</p>
                <p className="text-[11px] text-slate-400">Shows Cheque document upload button</p>
              </div>
              <Toggle on={paymentMethods.deposit.cheque} onClick={() => toggleDepositMethod("cheque")} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">សាច់ប្រាក់ (Cash)</p>
                <p className="text-[11px] text-slate-400">Shows Cash counter payment button</p>
              </div>
              <Toggle on={paymentMethods.deposit.cash} onClick={() => toggleDepositMethod("cash")} />
            </div>
          </div>

          {/* Withdrawal Payment Methods */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Withdrawal (ដកប្រាក់)
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Payout</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">តាមគណនីធនាគារ (Bank Transfer)</p>
                <p className="text-[11px] text-slate-400">Shows Bank QR upload for receiving money</p>
              </div>
              <Toggle on={paymentMethods.withdrawal.bank} onClick={() => toggleWithdrawalMethod("bank")} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-xs font-semibold text-slate-800">សាច់ប្រាក់ (Cash)</p>
                <p className="text-[11px] text-slate-400">Shows Cash counter withdrawal option</p>
              </div>
              <Toggle on={paymentMethods.withdrawal.cash} onClick={() => toggleWithdrawalMethod("cash")} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
