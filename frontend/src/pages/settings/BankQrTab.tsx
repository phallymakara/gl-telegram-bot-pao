/**
 * @file BankQrTab.tsx
 * @description Sub-component for managing Bank Account QR codes with per-image enable/disable toggle rows.
 */

import { useRef, useState } from "react";
import { Plus, QrCode, Trash2, Upload } from "lucide-react";
import { api } from "../../api";
import Toggle from "../../components/Toggle";

export interface BankQrItemData {
  url: string;
  enabled: boolean;
}

interface BankQrTabProps {
  bankQrItems: BankQrItemData[];
  setBankQrItems: React.Dispatch<React.SetStateAction<BankQrItemData[]>>;
  notify: (msg: string) => void;
}

/**
 * Bank Account QR settings tab component.
 */
export default function BankQrTab({
  bankQrItems,
  setBankQrItems,
  notify,
}: BankQrTabProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
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

      const res = await api.postForm<{ urls: string[]; url: string }>("/api/settings/upload-bank-qr", formData);
      const newUrls = res.urls || (res.url ? [res.url] : []);
      if (newUrls.length > 0) {
        const newItems: BankQrItemData[] = newUrls.map((u) => ({ url: u, enabled: true }));
        const updated = [...bankQrItems, ...newItems];
        setBankQrItems(updated);
        await api.put("/api/settings/bank-qr", { items: updated });
        notify(`${newUrls.length} ${newUrls.length === 1 ? "QR image" : "QR images"} uploaded & saved`);
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload QR code images");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  const activeCount = bankQrItems.filter((i) => i.enabled).length;
  const isOnlyRemaining = bankQrItems.length <= 1;

  function handleToggleItem(index: number) {
    const itemToToggle = bankQrItems[index];
    if (itemToToggle?.enabled && activeCount <= 1) {
      notify("At least one Bank QR code must remain active");
      return;
    }
    const updated = bankQrItems.map((item, idx) =>
      idx === index ? { ...item, enabled: !item.enabled } : item
    );
    setBankQrItems(updated);
    api.put("/api/settings/bank-qr", { items: updated }).catch((err: any) => {
      notify(err.message || "Failed to update QR setting");
    });
  }

  function handleRemoveImage(indexToRemove: number) {
    if (isOnlyRemaining) {
      notify("At least one Bank QR code must remain");
      return;
    }
    const remaining = bankQrItems.filter((_, idx) => idx !== indexToRemove);
    const remainingActive = remaining.filter((i) => i.enabled).length;
    if (remainingActive === 0) {
      notify("At least one Bank QR code must remain active");
      return;
    }

    const targetUrl = bankQrItems[indexToRemove]?.url;
    setBankQrItems(remaining);
    api.put("/api/settings/bank-qr", { items: remaining }).catch((err: any) => {
      notify(err.message || "Failed to update QR setting");
    });
    if (targetUrl) {
      api.delete(`/api/settings/bank-qr?url=${encodeURIComponent(targetUrl)}`).catch(() => {});
    }
  }

  return (
    <div id="section-bank-qr" className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6">
      <div className="p-6 md:p-8 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Bank Account QR Code</h3>
          <p className="text-xs text-slate-400 mt-1">
            Auto-send QR to customers on deposit.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleFilesChange}
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
                <span>Upload QR</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

        {/* QR Code Images Rows */}
        {bankQrItems.length === 0 ? (
          <div className="py-8 text-center">
            <QrCode size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-500">No Bank QR Images</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bankQrItems.map((item, idx) => {
              const isLastActive = item.enabled && activeCount <= 1;
              const canDelete = !isOnlyRemaining && (!item.enabled || activeCount > 1);

              return (
                <div
                  key={`${item.url}-${idx}`}
                  className="py-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={item.url}
                      alt={`Bank QR ${idx + 1}`}
                      className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">
                        Bank QR #{idx + 1}
                      </div>
                      <div className="mt-1">
                        <span className={`text-xs ${item.enabled ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
                          {item.enabled ? (isLastActive ? "Active (Required)" : "Active") : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <Toggle
                      on={Boolean(item.enabled)}
                      onClick={() => handleToggleItem(idx)}
                      disabled={isLastActive}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      disabled={!canDelete}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                      title={!canDelete ? (isOnlyRemaining ? "At least one Bank QR code must remain" : "At least one active Bank QR code must remain") : "Remove QR code"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
