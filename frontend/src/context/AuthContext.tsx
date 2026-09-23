/**
 * @file AuthContext.tsx
 * @description Authentication and permission context providing active user profile state,
 * allowed sidebar module authorization checks, and dynamic user switching for testing and role enforcement.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserData, usersApi } from "../api/users";
import { ALL_MODULES } from "../data/navigation";

interface AuthContextType {
  currentUser: UserData | null;
  users: UserData[];
  isLoading: boolean;
  setCurrentUser: (user: UserData | null) => void;
  switchUser: (userId: number) => void;
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

      const savedUserId = localStorage.getItem("current_user_id");
      if (savedUserId) {
        const found = data.find((u) => u.id === Number(savedUserId));
        if (found && found.is_active) {
          setCurrentUserState(found);
          return;
        }
      }

      // Default to first active super admin or first active user
      const defaultUser = data.find((u) => u.is_active && (u.role === "Super Admin" || u.role === "SUPER_ADMIN" || u.role === "Admin")) || data[0] || null;
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
      setCurrentUser(user);
    }
  }, [users, setCurrentUser]);

  const isAllowed = useCallback((moduleId: string): boolean => {
    if (!currentUser) return true; // If not loaded yet, do not lock out

    // Super Admin has unrestricted access to all modules
    if (currentUser.role === "Super Admin" || currentUser.role === "SUPER_ADMIN") {
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
        setCurrentUser,
        switchUser,
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
