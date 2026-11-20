/**
 * @file AuthContext.tsx
 * @description Authentication and permission context providing active user profile state,
 * allowed sidebar module authorization checks, and dynamic user switching for testing and role enforcement.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserData, usersApi } from "../api/users";
import { auditLogsApi } from "../api/auditLogs";
import { api } from "../api/client";
import { ALL_MODULES } from "../data/navigation";

export function isSuperAdminUser(user: UserData | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === "Super Admin" ||
    user.role === "SUPER_ADMIN" ||
    user.name === "Super Admin"
  );
}

interface AuthContextType {
  currentUser: UserData | null;
  users: UserData[];
  isLoading: boolean;
  isSuperAdmin: boolean;
  setCurrentUser: (user: UserData | null) => void;
  switchUser: (userId: number) => void;
  loginUser: (username: string, password: string) => Promise<UserData>;
  logoutUser: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  isAllowed: (moduleId: string) => boolean;
  getAllowedModulesList: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [currentUser, setCurrentUserState] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCurrentUserState(null);
      localStorage.removeItem("current_user_id");
      sessionStorage.removeItem("super_admin_unlocked");
      setIsLoading(false);
      return;
    }

    try {
      // Validate session with /api/auth/me
      const me = await api.get<UserData>("/api/auth/me");
      if (me && me.is_active) {
        setCurrentUserState(me);
        localStorage.setItem("current_user_id", String(me.id));
        if (isSuperAdminUser(me)) {
          sessionStorage.setItem("super_admin_unlocked", "true");
        }
      } else {
        throw new Error("Inactive user account");
      }

      // Also load all users for admin user management views
      try {
        const data = await usersApi.getUsers();
        setUsers(data);
      } catch {
        // Non-fatal if current user lacks permission to list all users
      }
    } catch (err) {
      console.warn("Session expired or invalid token:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("current_user_id");
      sessionStorage.removeItem("super_admin_unlocked");
      setCurrentUserState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const setCurrentUser = useCallback((user: UserData | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem("current_user_id", String(user.id));
    } else {
      localStorage.removeItem("current_user_id");
    }
  }, []);

  const switchUser = useCallback((_userId: number) => {
    // Isolated user sessions: unauthenticated switching disabled.
    // Users must authenticate with their own credentials via loginUser.
  }, []);

  const loginUser = useCallback(async (username: string, password: string): Promise<UserData> => {
    const res = await api.post<{ access_token: string; user: UserData }>("/api/auth/login", {
      username,
      password,
    });
    localStorage.setItem("token", res.access_token);
    localStorage.setItem("current_user_id", String(res.user.id));
    if (isSuperAdminUser(res.user)) {
      sessionStorage.setItem("super_admin_unlocked", "true");
    } else {
      sessionStorage.removeItem("super_admin_unlocked");
    }
    setCurrentUserState(res.user);
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch {}
    return res.user;
  }, []);

  const logoutUser = useCallback(async (): Promise<void> => {
    try {
      await auditLogsApi.logout();
    } catch (err) {
      console.warn("Failed to record logout event:", err);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("current_user_id");
    sessionStorage.removeItem("super_admin_unlocked");
    setCurrentUserState(null);
  }, []);

  const isAllowed = useCallback((moduleId: string): boolean => {
    if (moduleId === "audit-logs") {
      return isSuperAdminUser(currentUser);
    }
    if (!currentUser) return true; // If not loaded yet, do not lock out

    // Super Admin has unrestricted access to all modules
    if (isSuperAdminUser(currentUser)) {
      return true;
    }

    const allowed = currentUser.allowed_modules || [];
    if (allowed.includes("*")) {
      return true;
    }

    return allowed.includes(moduleId);
  }, [currentUser]);

  const getAllowedModulesList = useCallback((): string[] => {
    if (!currentUser) return ALL_MODULES.map((m) => m.id);
    if (currentUser.role === "Super Admin" || currentUser.role === "SUPER_ADMIN" || currentUser.allowed_modules?.includes("*")) {
      return ALL_MODULES.map((m) => m.id);
    }
    return currentUser.allowed_modules || [];
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isLoading,
        isSuperAdmin: isSuperAdminUser(currentUser),
        setCurrentUser,
        switchUser,
        loginUser,
        logoutUser,
        refreshUsers,
        isAllowed,
        getAllowedModulesList,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
