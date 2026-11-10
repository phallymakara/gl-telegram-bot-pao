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
    try {
      const data = await usersApi.getUsers();
      setUsers(data);

      const isSuper = (u: UserData) =>
        u.role === "Super Admin" || u.role === "SUPER_ADMIN" || u.name === "Super Admin";

      const savedUserId = localStorage.getItem("current_user_id");
      if (savedUserId) {
        const found = data.find((u) => u.id === Number(savedUserId));
        if (found && found.is_active) {
          if (!isSuper(found) || sessionStorage.getItem("super_admin_unlocked") === "true") {
            setCurrentUserState(found);
            return;
          }
        }
      }

      // Default to first active regular user so testing doesn't automatically expose Super Admin
      const defaultUser =
        data.find((u) => u.is_active && !isSuper(u)) ||
        (sessionStorage.getItem("super_admin_unlocked") === "true" ? data[0] : null) ||
        data[0] ||
        null;
      setCurrentUserState(defaultUser);
      if (defaultUser) {
        localStorage.setItem("current_user_id", String(defaultUser.id));
      }
    } catch (err) {
      console.error("Failed to load users:", err);
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

  const switchUser = useCallback((userId: number) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      const prevId = currentUser?.id ?? null;
      localStorage.removeItem("token");
      setCurrentUser(user);
      if (prevId !== user.id) {
        const eventType = isSuperAdminUser(user) ? "SUPER_ADMIN_UNLOCK" : "USER_SWITCH";
        auditLogsApi
          .recordAuthEvent({
            event_type: eventType,
            target_user_id: user.id,
            previous_user_id: prevId,
          })
          .catch((err) => console.warn("Failed to record auth switch event:", err));
      }
    }
  }, [users, currentUser, setCurrentUser]);

  const loginUser = useCallback(async (username: string, password: string): Promise<UserData> => {
    const res = await api.post<{ access_token: string; user: UserData }>("/api/auth/login", {
      username,
      password,
    });
    localStorage.setItem("token", res.access_token);
    if (isSuperAdminUser(res.user)) {
      sessionStorage.setItem("super_admin_unlocked", "true");
    } else {
      sessionStorage.removeItem("super_admin_unlocked");
    }
    setCurrentUser(res.user);
    await refreshUsers();
    return res.user;
  }, [setCurrentUser, refreshUsers]);

  const logoutUser = useCallback(async (): Promise<void> => {
    try {
      await auditLogsApi.logout();
    } catch (err) {
      console.warn("Failed to record logout event:", err);
    }
    localStorage.removeItem("token");
    sessionStorage.removeItem("super_admin_unlocked");
    const fallbackUser = users.find((u) => u.is_active && !isSuperAdminUser(u)) || null;
    setCurrentUser(fallbackUser);
  }, [users, setCurrentUser]);

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
