/**
 * @file App.tsx
 * @description Main application container component managing layout shell (Sidebar & Topbar),
 * toast notifications, authentication context, and React Router integration.
 */

import { useState, useRef } from "react";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "./layouts/Sidebar";
import Topbar from "./layouts/Topbar";
import Toast, { ToastType } from "./components/Toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import AppRoutes from "./routes/AppRoutes";
import LoginPage from "./pages/LoginPage";
import { PageLoader } from "./components/Loader";

/**
 * Shell container holding the responsive sidebar, header topbar, route content, and notifications.
 */
function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("success");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  function notify(msg: string, type: ToastType = "success") {
    setToast(msg);
    setToastType(type);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setToast(null), type === "error" ? 4500 : 2200);
  }

  // Display initial loading indicator while validating session token
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <PageLoader text="Loading session..." />
      </div>
    );
  }

  // If user is not authenticated, display full-screen Login Page
  if (!currentUser) {
    return (
      <>
        <LoginPage notify={notify} />
        <Toast toast={toast} type={toastType} />
      </>
    );
  }

  return (
    <div
      className="h-screen max-h-screen bg-slate-50 flex text-slate-800 overflow-hidden"
      style={{ fontFamily: "Inter, 'Kantumruy Pro', system-ui, sans-serif" }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopOpen={desktopOpen}
        setDesktopOpen={setDesktopOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar
          setMobileOpen={setMobileOpen}
          desktopOpen={desktopOpen}
          setDesktopOpen={setDesktopOpen}
        />
        <main className="flex-1 min-w-0 overflow-hidden w-full flex flex-col">
          <AppRoutes notify={notify} />
        </main>
      </div>
      <Toast toast={toast} type={toastType} />
    </div>
  );
}

/**
 * Root React App component wrapped in BrowserRouter, AuthProvider, and NotificationProvider.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
