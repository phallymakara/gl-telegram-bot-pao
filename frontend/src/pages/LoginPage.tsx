/**
 * @file LoginPage.tsx
 * @description Authentication login page requiring user credentials before granting access to the system.
 */

import React, { useState, FormEvent } from "react";
import { Diamond, User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ToastType } from "../components/Toast";

interface LoginPageProps {
  notify?: (msg: string, type?: ToastType) => void;
}

export default function LoginPage({ notify }: LoginPageProps) {
  const { loginUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setUsernameError(null);
    setPasswordError(null);
    setAuthError(null);

    const cleanUsername = username.trim();
    let hasValidationError = false;

    if (!cleanUsername) {
      setUsernameError("Please enter your username");
      hasValidationError = true;
    }
    if (!password) {
      setPasswordError("Please enter your password");
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await loginUser(cleanUsername, password);
      if (notify) {
        notify(`Welcome back, ${user.name}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid username or password";
      const isCredentialError = msg.toLowerCase().includes("credentials") || msg.toLowerCase().includes("401");
      setAuthError(isCredentialError ? "Invalid username or password. Please try again." : msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6"
      style={{ fontFamily: "Inter, 'Kantumruy Pro', system-ui, sans-serif" }}
    >
      <div className="w-[92%] sm:w-[78%] md:w-[60%] lg:w-[45%] xl:w-[34%] max-w-[500px]">
        {/* Login Form Box */}
        <div className="login-card w-full bg-white border border-slate-200 rounded-3xl px-7 py-9 sm:px-10 sm:py-11">
          {/* Logo at the top center */}
          <div className="flex justify-center mb-8">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-white shrink-0">
              <Diamond size={24} fill="white" strokeWidth={1} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Username
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) setUsernameError(null);
                    if (authError) setAuthError(null);
                  }}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-3.5 py-3 text-xs bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-colors ${
                    usernameError || authError
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  }`}
                />
              </div>
              {usernameError && (
                <span className="text-[11px] text-rose-600 block mt-1">{usernameError}</span>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                    if (authError) setAuthError(null);
                  }}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-10 py-3 text-xs bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-colors ${
                    passwordError || authError
                      ? "border-rose-400 focus:border-rose-500"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {passwordError && (
                <span className="text-[11px] text-rose-600 block mt-1">{passwordError}</span>
              )}
              {authError && !passwordError && (
                <span className="text-[11px] text-rose-600 block mt-1">{authError}</span>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
