/**
 * @file UserModal.tsx
 * @description Modal dialog for creating and editing platform users with granular sidebar module access permissions.
 */

import { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Lock,
  ShieldCheck,
  Layers,
  Eye,
  EyeOff,
} from "lucide-react";
import { getFriendlyErrorMessage } from "../utils/errorMessage";
import { UserData, usersApi } from "../api/users";
import { ALL_MODULES, ModuleDefinition } from "../data/navigation";
import DraggableModalBox from "./DraggableModalBox";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: UserData | null;
  onSuccess: (savedUser: UserData) => void;
  notify: (msg: string, type?: "success" | "error") => void;
}

export default function UserModal({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
  notify,
}: UserModalProps) {
  const isEditing = Boolean(userToEdit);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("Staff");
  const [isActive, setIsActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
    password?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setFieldErrors({});
      if (userToEdit) {
        setName(userToEdit.name || "");
        setUsername(userToEdit.username || "");
        setEmail(userToEdit.email || "");
        setPassword("");
        setRole(userToEdit.role || "Staff");
        setIsActive(userToEdit.is_active ?? true);
        if (userToEdit.allowed_modules && userToEdit.allowed_modules.includes("*")) {
          setAllowedModules(ALL_MODULES.map((m) => m.id));
        } else {
          setAllowedModules(userToEdit.allowed_modules || []);
        }
      } else {
        setName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setRole("Staff");
        setIsActive(true);
        // Default modules for new Staff
        setAllowedModules(["dashboard", "purchase", "sell-orders", "delivery-notes", "customers"]);
      }
    }
  }, [isOpen, userToEdit]);

  if (!isOpen) return null;

  // Group modules by category
  const categories: Record<string, ModuleDefinition[]> = {};
  ALL_MODULES.forEach((mod) => {
    if (!categories[mod.category]) {
      categories[mod.category] = [];
    }
    categories[mod.category].push(mod);
  });

  const toggleModule = (id: string) => {
    setAllowedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setAllowedModules(ALL_MODULES.map((m) => m.id));
  };

  const deselectAll = () => {
    setAllowedModules([]);
  };

  const applyPreset = (preset: "admin" | "sales" | "inventory" | "finance" | "viewer") => {
    switch (preset) {
      case "admin":
        setAllowedModules(ALL_MODULES.map((m) => m.id));
        setRole("Admin");
        break;
      case "sales":
        setAllowedModules(["dashboard", "sell-orders", "delivery-notes", "deposits", "customers", "sales-persons"]);
        setRole("Staff");
        break;
      case "inventory":
        setAllowedModules(["dashboard", "purchase", "inventory-ledger", "products", "vendors", "low-stock-alerts"]);
        setRole("Staff");
        break;
      case "finance":
        setAllowedModules(["dashboard", "deposits", "customers", "sell-orders"]);
        setRole("Staff");
        break;
      case "viewer":
        setAllowedModules(["dashboard", "buy-back-slots", "sell-orders", "delivery-notes", "deposits", "products"]);
        break;
    }
  };

  const toggleCategory = (categoryModules: ModuleDefinition[]) => {
    const ids = categoryModules.map((m) => m.id);
    const allSelected = ids.every((id) => allowedModules.includes(id));
    if (allSelected) {
      setAllowedModules((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setAllowedModules((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = "Full name is required";
    }
    if (!username.trim()) {
      errors.username = "Username is required";
    }
    if (!email.trim() || !email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }
    if (!isEditing && (!password || password.length < 6)) {
      errors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      if (isEditing && userToEdit) {
        const payload: Parameters<typeof usersApi.updateUser>[1] = {
          name: name.trim(),
          email: email.trim(),
          role,
          is_active: isActive,
          allowed_modules: role === "Super Admin" ? ["*"] : allowedModules,
        };
        if (password.trim()) {
          payload.password = password.trim();
        }
        const updated = await usersApi.updateUser(userToEdit.id, payload);
        notify("User updated successfully");
        onSuccess(updated);
        onClose();
      } else {
        const payload = {
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          role,
          is_active: isActive,
          allowed_modules: role === "Super Admin" ? ["*"] : allowedModules,
        };
        const created = await usersApi.createUser(payload);
        notify("User created successfully");
        onSuccess(created);
        onClose();
      }
    } catch (err: any) {
      setFormError(getFriendlyErrorMessage(err, "Failed to save user. Please check the details and try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-transparent flex items-center justify-center p-4"
      onClick={onClose}
    >
      <DraggableModalBox
        resetKey={userToEdit?.id ?? "new"}
        className="bg-white rounded-3xl shadow-none border border-slate-300 w-full max-w-2xl h-[92vh] max-h-[94vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <User size={18} className="text-indigo-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                {isEditing ? `Edit User: ${userToEdit?.name}` : "Create New User"}
              </h3>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? "Update user profile details and sidebar module authorization"
                  : "Add a new system user and configure which sidebar modules they can access"}
              </p>
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

        {/* Modal Body & Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
            {formError && (
              <p className="text-xs text-rose-600 font-medium">{formError}</p>
            )}

            {/* Core Information Grid */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-500" /> User Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Full name"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.name
                          ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.replace(/\s+/g, ""));
                      if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    placeholder="Username"
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                      isEditing
                        ? "text-slate-500 border-slate-200 cursor-not-allowed"
                        : fieldErrors.username
                        ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                        : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                    }`}
                  />
                  {fieldErrors.username && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.username}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      placeholder="Email address"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.email
                          ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                    {isEditing ? "New Password (optional)" : "Password"}{" "}
                    {!isEditing && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      placeholder={isEditing ? "Leave blank to keep current" : "Minimum 6 characters"}
                      className={`w-full pl-9 pr-10 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 ${
                        fieldErrors.password
                          ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                          : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Staff">Staff (Operations)</option>
                    <option value="Manager">Manager (Supervisory)</option>
                    <option value="Admin">Admin (Administrator)</option>
                    <option value="Super Admin">Super Admin (Full System Access)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Account Status</label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                    <span className={`text-sm font-medium ${isActive ? "text-emerald-700" : "text-slate-500"}`}>
                      {isActive ? "Active Account" : "Inactive / Suspended"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Module Access Permissions Section */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-500" /> Sidebar Module Access Permissions
                  </h3>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-indigo-600 hover:border-indigo-300 font-medium transition-colors cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-medium transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Presets Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => applyPreset("admin")}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-medium cursor-pointer"
                >
                  Full Access
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("sales")}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-medium cursor-pointer"
                >
                  Sales & Delivery
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("inventory")}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-medium cursor-pointer"
                >
                  Inventory & Buying
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("finance")}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-medium cursor-pointer"
                >
                  Finance & Deposits
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("viewer")}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-medium cursor-pointer"
                >
                  Viewer / Cashier
                </button>
              </div>

              {role === "Super Admin" && (
                <div className="py-1.5 text-slate-600 text-xs flex items-center gap-2">
                  <ShieldCheck size={15} className="shrink-0 text-violet-600" />
                  <span>
                    <span className="font-semibold text-violet-700">Super Admin Privilege:</span> Super Admins always possess unrestricted access to all modules, including system-level configuration and auditing.
                  </span>
                </div>
              )}

              {/* Categories & Checkboxes */}
              <div className="space-y-3 pt-1">
                {Object.entries(categories).map(([catName, modules]) => {
                  const isCatAllSelected = modules.every((m) => allowedModules.includes(m.id));

                  return (
                    <div key={catName} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          {catName}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCategory(modules)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          {isCatAllSelected ? "Deselect Group" : "Select Group"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {modules.map((mod) => {
                          const isChecked = allowedModules.includes(mod.id);
                          return (
                            <label
                              key={mod.id}
                              className={`flex items-start gap-2.5 p-2 rounded-lg border bg-white cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-indigo-400 text-slate-900"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleModule(mod.id)}
                                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                              />
                              <div className="leading-snug">
                                <span className="text-xs font-medium block">{mod.label}</span>
                                {mod.description && (
                                  <span className="text-[11px] text-slate-400 block leading-tight">
                                    {mod.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
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
              disabled={submitting}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-semibold transition-colors focus:outline-none cursor-pointer"
            >
              {submitting ? "Saving..." : isEditing ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </DraggableModalBox>
    </div>
  );
}
