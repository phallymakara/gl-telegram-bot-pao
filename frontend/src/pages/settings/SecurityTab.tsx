/**
 * @file SecurityTab.tsx
 * @description Sub-component rendering security preferences, session timeout, 2FA options, and operating hours with off-store text and multiple poster images in system settings.
 */

import { useRef, useState } from "react";
import { Send, Trash2, Upload } from "lucide-react";
import { api } from "../../api";
import Toggle from "../../components/Toggle";

interface SecurityTabProps {
  twoFA: boolean;
  setTwoFA: (val: boolean) => void;
  openTime: string;
  setOpenTime: (val: string) => void;
  closeTime: string;
  setCloseTime: (val: string) => void;
  offStoreMessage: string;
  setOffStoreMessage: (val: string) => void;
  offStoreImageUrl?: string;
  setOffStoreImageUrl?: (val: string) => void;
  offStoreImageUrls: string[];
  setOffStoreImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
  sessionTimeout: number;
  setSessionTimeout: (val: number) => void;
  passwordExpiry: number;
  setPasswordExpiry: (val: number) => void;
  saveSettings: () => void;
  notify: (msg: string) => void;
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
  offStoreMessage,
  setOffStoreMessage,
  offStoreImageUrls,
  setOffStoreImageUrls,
  sessionTimeout,
  setSessionTimeout,
  passwordExpiry,
  setPasswordExpiry,
  saveSettings,
  notify,
}: SecurityTabProps) {
  const [uploading, setUploading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleBroadcastAnnouncement() {
    setBroadcasting(true);
    try {
      const res = await api.post<{ success: boolean; sent_count: number; message: string }>("/api/settings/broadcast-notice");
      notify(res.message || `Announcement sent to ${res.sent_count} customer(s)`);
    } catch (err: any) {
      notify(err.message || "Failed to send announcement to customers");
    } finally {
      setBroadcasting(false);
    }
  }

  async function handlePosterFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const oversized = files.find((f) => f.size > 10 * 1024 * 1024);
    if (oversized) {
      setUploadError(`File "${oversized.name}" exceeds the 10MB size limit.`);
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));

      const res = await api.postForm<{ urls: string[]; url: string }>("/api/settings/upload-poster", formData);
      const newUrls = res.urls || (res.url ? [res.url] : []);
      if (newUrls.length > 0) {
        setOffStoreImageUrls((prev) => [...prev, ...newUrls]);
        notify(`${newUrls.length} ${newUrls.length === 1 ? "poster image" : "poster images"} uploaded`);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleRemovePoster(indexToRemove: number) {
    const targetUrl = offStoreImageUrls[indexToRemove];
    setOffStoreImageUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (targetUrl) {
      api.delete(`/api/settings/poster?url=${encodeURIComponent(targetUrl)}`).catch(() => {});
    }
  }

  return (
    <>
      <div id="section-security" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6">
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

      <div id="section-system" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6">
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Off-Store Auto-Reply Message</label>
            <textarea
              rows={3}
              value={offStoreMessage}
              onChange={(e) => setOffStoreMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
            <p className="text-[11px] text-slate-400">Custom message sent to customers outside operating hours. If empty, the default schedule notice is sent.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Off-Store Announcement Posters</label>
                <p className="text-[11px] text-slate-400 mt-0.5">Images sent to customers outside operating hours (sent as single photo or album).</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Upload size={13} className="text-slate-500" />
                {uploading ? "Uploading..." : "Upload Images"}
              </button>
            </div>

            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handlePosterFilesChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            {uploadError && (
              <p className="text-xs text-rose-600 font-medium">{uploadError}</p>
            )}

            {offStoreImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                {offStoreImageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50 aspect-4/3 flex flex-col"
                  >
                    <img
                      src={url}
                      alt={`Poster ${idx + 1}`}
                      className="w-full h-full object-cover block"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                      <button
                        type="button"
                        onClick={() => handleRemovePoster(idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/70 text-[10px] font-medium text-white rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Upload size={20} className="mx-auto text-slate-400 mb-1.5" />
                <p className="text-xs font-medium text-slate-600">Click to upload poster images</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Supports PNG, JPG, WebP up to 10MB each</p>
              </div>
            )}
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={broadcasting}
              onClick={handleBroadcastAnnouncement}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              title="Broadcast the current off-store message and posters to all customers immediately"
            >
              <Send size={13} className="text-slate-500" />
              {broadcasting ? "Sending Announcement..." : "Broadcast Announcement Now"}
            </button>

            <button
              onClick={saveSettings}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer text-center"
            >
              Save Schedule Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
