import React, { useState, useEffect, useRef } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter the password");
      return;
    }
    if (password === "11223344") {
      setError(null);
      sessionStorage.setItem("super_admin_unlocked", "true");
      onSuccess();
      onClose();
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Lock size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
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
                className={`w-full pl-3 pr-10 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
            >
              Verify & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
