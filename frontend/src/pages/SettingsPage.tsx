/**
 * @file SettingsPage.tsx
 * @description System Settings page component delegating tabs to modular sub-components.
 */

import { useEffect, useState } from "react";
import { Clock, QrCode, Send, User, UserCheck } from "lucide-react";
import { api, CustomerData } from "../api";
import ProfileTab from "./settings/ProfileTab";
import BotTab from "./settings/BotTab";
import CustomersTab from "./settings/CustomersTab";
import SecurityTab from "./settings/SecurityTab";
import BankQrTab, { BankQrItemData } from "./settings/BankQrTab";

interface SettingsPageProps {
  /** Toast notification trigger callback */
  notify: (msg: string) => void;
}

/**
 * System settings container page component.
 */
export default function SettingsPage({ notify }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "bot" | "allow-user" | "system" | "bank-qr">("profile");
  const [showToken, setShowToken] = useState(false);
  const [twoFA, setTwoFA] = useState(false);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [offStoreMessage, setOffStoreMessage] = useState("");
  const [offStoreImageUrl, setOffStoreImageUrl] = useState("");
  const [offStoreImageUrls, setOffStoreImageUrls] = useState<string[]>([]);
  const [botUsername, setBotUsername] = useState("GoldSystemBot");
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [passwordExpiry, setPasswordExpiry] = useState(90);

  // Bank QR State
  const [bankQrItems, setBankQrItems] = useState<BankQrItemData[]>([]);

  // Whitelist / Allow User State
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [newUserId, setNewUserId] = useState("");
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    api
      .get<any>("/api/settings/")
      .then((s) => {
        setBotUsername(s.bot.bot_username);
        setSessionTimeout(s.security.session_timeout);
        setPasswordExpiry(s.security.password_expiry);
        setTwoFA(s.security.two_factor);
        setOpenTime(s.system.open_time);
        setCloseTime(s.system.close_time);
        setOffStoreMessage(s.system.off_store_message || "");
        const rawUrls: string[] = s.system.off_store_image_urls || [];
        const initialUrls = rawUrls.length > 0 ? rawUrls : (s.system.off_store_image_url ? [s.system.off_store_image_url] : []);
        setOffStoreImageUrls(initialUrls);
        setOffStoreImageUrl(initialUrls[0] || "");
        if (s.bank_qr) {
          const items: BankQrItemData[] = s.bank_qr.items || [];
          if (items.length > 0) {
            setBankQrItems(items);
          } else if (s.bank_qr.image_urls) {
            setBankQrItems(
              s.bank_qr.image_urls.map((u: string) => ({
                url: u,
                enabled: s.bank_qr.enabled !== undefined ? Boolean(s.bank_qr.enabled) : true,
              }))
            );
          }
        }
      })
      .catch(() => {});

    api
      .get<CustomerData[]>("/api/customers/")
      .then(setCustomers)
      .catch(() => {});

    const sectionIds = ["profile", "bot", "allow-user", "security", "system", "bank-qr"];
    const handleScroll = () => {
      for (const id of sectionIds) {
        const el = document.getElementById(`section-${id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 250 && rect.bottom >= 100) {
            setActiveTab(id as any);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, []);

  function saveSettings() {
    api
      .put("/api/settings/", {
        bot: { bot_token: "", bot_username: botUsername },
        security: {
          session_timeout: sessionTimeout,
          password_expiry: passwordExpiry,
          two_factor: twoFA,
        },
        system: {
          open_time: openTime,
          close_time: closeTime,
          off_store_message: offStoreMessage,
          off_store_image_url: offStoreImageUrls[0] || "",
          off_store_image_urls: offStoreImageUrls,
        },
        bank_qr: {
          items: bankQrItems,
          image_urls: bankQrItems.map((it) => it.url),
          enabled: bankQrItems.some((it) => it.enabled),
          caption: "",
        },
      })
      .then(() => notify("Settings saved"))
      .catch(() => notify("Failed to save settings"));
  }

  function addCustomer() {
    if (!newUsername.trim() && !newUserId.trim()) {
      notify("Please enter a Username or Telegram ID");
      return;
    }
    api
      .post<CustomerData>("/api/customers/", {
        username: newUsername.trim() || null,
        telegram_user_id: newUserId.trim() || null,
      })
      .then((c) => {
        setCustomers((prev) => [c, ...prev]);
        setNewUserId("");
        setNewUsername("");
        notify("Allowed Telegram user added");
      })
      .catch((e: Error) => notify(e.message));
  }

  function removeCustomer(id: number) {
    api
      .delete(`/api/customers/${id}`)
      .then(() => {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        notify("User removed from whitelist");
      })
      .catch((e: Error) => notify(e.message));
  }

  const tabs = [
    { id: "profile", label: "User Profile", desc: "Personal info & avatar", icon: User },
    { id: "bot", label: "Telegram Bot", desc: "Bot token & username", icon: Send },
    { id: "allow-user", label: "Allow User", desc: "Whitelist allowed Telegram users", icon: UserCheck },
    { id: "system", label: "Operating Hours", desc: "Store operating times", icon: Clock },
    { id: "bank-qr", label: "Bank QR Code", desc: "Deposit account QR images", icon: QrCode },
  ] as const;

  function scrollToSection(id: string) {
    setActiveTab(id as any);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full items-start">
      <div className="md:col-span-1 md:sticky md:top-4 self-start flex flex-row overflow-x-auto flex-nowrap gap-1.5 md:flex-col scrollbar-none min-w-0 border-b md:border-b-0 border-slate-200/60 pb-3 md:pb-0 z-10 bg-slate-50/90 backdrop-blur-xs md:bg-transparent">
        <div className="hidden md:block px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Settings Menu
        </div>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => scrollToSection(tab.id)}
              className={`shrink-0 whitespace-nowrap text-left px-3.5 py-2.5 md:py-3 rounded-lg transition-all duration-150 flex items-center gap-2.5 relative focus:outline-none cursor-pointer ${
                isActive
                  ? "bg-indigo-50 md:bg-slate-100 text-indigo-700 md:text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
              }`}
            >
              {isActive && (
                <span className="hidden md:block absolute left-0 top-3 bottom-3 w-1 rounded-r bg-indigo-600" />
              )}
              <Icon
                size={16}
                className={`shrink-0 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
              />
              <span className="text-[13px] leading-normal">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="md:col-span-3 space-y-6">
        <ProfileTab />
        <BotTab
          botUsername={botUsername}
          setBotUsername={setBotUsername}
          showToken={showToken}
          setShowToken={setShowToken}
          saveSettings={saveSettings}
        />
        <CustomersTab
          customers={customers}
          newUserId={newUserId}
          setNewUserId={setNewUserId}
          newUsername={newUsername}
          setNewUsername={setNewUsername}
          addCustomer={addCustomer}
          removeCustomer={removeCustomer}
        />
        <SecurityTab
          twoFA={twoFA}
          setTwoFA={setTwoFA}
          openTime={openTime}
          setOpenTime={setOpenTime}
          closeTime={closeTime}
          setCloseTime={setCloseTime}
          offStoreMessage={offStoreMessage}
          setOffStoreMessage={setOffStoreMessage}
          offStoreImageUrl={offStoreImageUrl}
          setOffStoreImageUrl={setOffStoreImageUrl}
          offStoreImageUrls={offStoreImageUrls}
          setOffStoreImageUrls={setOffStoreImageUrls}
          sessionTimeout={sessionTimeout}
          setSessionTimeout={setSessionTimeout}
          passwordExpiry={passwordExpiry}
          setPasswordExpiry={setPasswordExpiry}
          saveSettings={saveSettings}
          notify={notify}
        />
        <BankQrTab
          bankQrItems={bankQrItems}
          setBankQrItems={setBankQrItems}
          notify={notify}
        />
      </div>
    </div>
  );
}
