/**
 * @file users.ts
 * @description Users domain module providing interface definitions and API endpoint operations for managing admin and user accounts.
 */

import { api } from "./client";

/**
 * Interface representing user account data returned from backend API routes.
 */
export interface UserData {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

/**
 * Users API service handling CRUD operations for system users.
 */
export const usersApi = {
  /**
   * Fetches the complete list of system users.
   * @returns Promise resolving to an array of UserData objects.
   */
  getUsers: () => api.get<UserData[]>("/api/users/"),

  /**
   * Creates a new system user account.
   * @param data User creation payload including username, name, role, email, and password.
   */
  createUser: (data: Partial<UserData> & { password?: string }) =>
    api.post<UserData>("/api/users/", data),

  /**
   * Updates an existing user account by ID.
   * @param id Target user ID.
   * @param data Fields to update.
   */
  updateUser: (id: number, data: Partial<UserData> & { password?: string }) =>
    api.put<UserData>(`/api/users/${id}`, data),

  /**
   * Deletes a user account by ID.
   * @param id Target user ID.
   */
  deleteUser: (id: number) => api.delete<void>(`/api/users/${id}`),
};
