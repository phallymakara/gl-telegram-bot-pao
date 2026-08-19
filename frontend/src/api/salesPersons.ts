/**
 * @file salesPersons.ts
 * @description Master Data - Sales Persons domain module defining interfaces and API service endpoints.
 */

import { api } from "./client";

/**
 * Interface representing sales person master data records.
 */
export interface SalesPersonData {
  id: number;
  code?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  address?: string | null;
  is_active?: boolean;
  created_at?: string;
}

/**
 * Sales Persons API service handling CRUD operations for master data sales representatives.
 */
export const salesPersonsApi = {
  /**
   * Fetches the complete list of sales persons.
   */
  getSalesPersons: () => api.get<SalesPersonData[]>("/api/sales-persons/"),

  /**
   * Fetches a single sales person record by ID.
   */
  getSalesPersonById: (id: number) => api.get<SalesPersonData>(`/api/sales-persons/${id}`),

  /**
   * Creates a new sales person master data record.
   */
  createSalesPerson: (data: Partial<SalesPersonData>) =>
    api.post<SalesPersonData>("/api/sales-persons/", data),

  /**
   * Updates an existing sales person master record.
   */
  updateSalesPerson: (id: number, data: Partial<SalesPersonData>) =>
    api.put<SalesPersonData>(`/api/sales-persons/${id}`, data),

  /**
   * Deletes a sales person record by ID.
   */
  deleteSalesPerson: (id: number) => api.delete<void>(`/api/sales-persons/${id}`),
};
