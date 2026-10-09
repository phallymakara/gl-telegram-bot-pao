/**
 * @file ProtectedRoute.tsx
 * @description Permission guard component wrapping route views with module-level authorization checks.
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PAGE_TITLE } from "../data/navigation";

interface ProtectedRouteProps {
  /** The module key required to access this route */
  module: string;
  /** Route children elements */
  children: React.ReactNode;
}

/**
 * Guard component that displays a restricted access screen if the active user lacks permission.
 */
export default function ProtectedRoute({ module, children }: ProtectedRouteProps) {
  const { currentUser, isAllowed, getAllowedModulesList } = useAuth();
  const navigate = useNavigate();

  if (!isAllowed(module)) {
    const navigateToFirstAllowed = () => {
      const allowed = getAllowedModulesList();
      if (allowed.length > 0) {
        navigate(`/${allowed[0]}`);
      } else {
        navigate("/dashboard");
      }
    };

    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Module Access Restricted</h2>
            <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Your account (<strong>{currentUser?.name || "User"}</strong> ·{" "}
              <span className="text-indigo-600">{currentUser?.role || "Staff"}</span>) does
              not have permission to access the <strong>{PAGE_TITLE[module] || module}</strong>{" "}
              module.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={navigateToFirstAllowed}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              Go to Allowed Module <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
