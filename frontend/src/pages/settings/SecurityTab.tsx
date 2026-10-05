/**
 * @file SecurityTab.tsx
 * @description Sub-component rendering security preferences, session timeout, 2FA options, and operating hours with off-store text and poster images in system settings.
 */

import { useRef, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { api } from "../../api";

interface SecurityTabProps {
  twoFA?: boolean;
  setTwoFA?: (val: boolean) => void;
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
  sessionTimeout?: number;
  setSessionTimeout?: (val: number) => void;
  passwordExpiry?: number;
  setPasswordExpiry?: (val: number) => void;
  saveSettings?: () => void;
  notify: (msg: string) => void;
}

/**
 * Security & Operating hours settings tab component.
 */
export default function SecurityTab({
  openTime,
  setOpenTime,
  closeTime,
  setCloseTime,
  offStoreMessage,
  setOffStoreMessage,
  offStoreImageUrls,
  setOffStoreImageUrls,
  notify,
}: SecurityTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleScheduleUpdate(patch: { open_time?: string; close_time?: string; off_store_message?: string }) {
    api
      .put("/api/settings/schedule", {
        open_time: patch.open_time ?? openTime,
        close_time: patch.close_time ?? closeTime,
        off_store_message: patch.off_store_message ?? offStoreMessage,
      })
      .catch(() => {
        notify("Failed to save schedule");
      });
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
        const updated = [...offStoreImageUrls, ...newUrls];
        setOffStoreImageUrls(updated);
        await api.put("/api/settings/posters", { urls: updated });
        notify(`${newUrls.length} ${newUrls.length === 1 ? "poster image" : "poster images"} uploaded & saved`);
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
    const updated = offStoreImageUrls.filter((_, idx) => idx !== indexToRemove);
    setOffStoreImageUrls(updated);
    api.put("/api/settings/posters", { urls: updated }).catch(() => {
      notify("Failed to update posters");
    });
    if (targetUrl) {
      api.delete(`/api/settings/poster?url=${encodeURIComponent(targetUrl)}`).catch(() => {});
    }
  }

  return (
    <div id="section-system" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6">
        <div className="p-6 md:p-8 pb-0">
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
                onChange={(e) => {
                  setOpenTime(e.target.value);
                  handleScheduleUpdate({ open_time: e.target.value });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Closing Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => {
                  setCloseTime(e.target.value);
                  handleScheduleUpdate({ close_time: e.target.value });
                }}
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
              onBlur={() => handleScheduleUpdate({ off_store_message: offStoreMessage })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
            <p className="text-[11px] text-slate-400">Custom message sent to customers outside operating hours. If empty, the default schedule notice is sent.</p>
          </div>

          {/* Off-Store Announcement Posters Section matching Bank QR style */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-900">Off-Store Announcement Posters</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Auto-send posters outside operating hours.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={handlePosterFilesChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                  {uploading ? (
                    <>
                      <Upload size={12} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={12} />
                      <span>Upload Poster</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadError && <p className="text-xs text-red-600 mb-3">{uploadError}</p>}

            {offStoreImageUrls.length === 0 ? (
              <div className="py-8 text-center">
                <ImageIcon size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">No Announcement Posters</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {offStoreImageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={url}
                        alt={`Poster ${idx + 1}`}
                        className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800">
                          Poster #{idx + 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRemovePoster(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded-lg hover:bg-red-50"
                        title="Remove poster"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}
