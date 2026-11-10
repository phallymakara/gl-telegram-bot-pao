import React, { useState, useEffect, useRef } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";
import { api } from "../api/client";
import DraggableModalBox from "./DraggableModalBox";

interface SuperAdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

export default function SuperAdminPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Super Admin Verification",
  description = "Enter password to view Super Admin user.",
}: SuperAdminPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setIsVerifying(false);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter the password");
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      await api.post("/api/auth/verify-super-admin", { password });
      sessionStorage.setItem("super_admin_unlocked", "true");
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Incorrect password";
      setError(msg || "Incorrect password");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-transparent flex items-center justify-center p-4"
      onClick={onClose}
    >
      <DraggableModalBox
        resetKey={isOpen}
        className="bg-white rounded-3xl border border-slate-300 shadow-none w-full max-w-sm overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[70vh]">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Password"
                  className={`w-full pl-3 pr-10 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                    error
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3.5 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 font-medium transition-colors focus:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold transition-colors focus:outline-none disabled:opacity-60 cursor-pointer"
            >
              {isVerifying ? "Verifying..." : "Verify & Continue"}
            </button>
          </div>
        </form>
      </DraggableModalBox>
    </div>
  );
}
