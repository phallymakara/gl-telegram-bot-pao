/**
 * @file vendors.ts
 * @description Vendors domain module defining interfaces and API service endpoints for vendor / supplier master data.
 */

import { api } from "./client";

/**
 * Interface representing vendor / supplier master data.
 */
export interface VendorData {
  id: number;
  vendor_code?: string;
  name: string;
  supplier_type: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Vendors API service handling CRUD operations for suppliers and vendors.
 */
export const vendorsApi = {
  /**
   * Fetches the list of active vendors / suppliers.
   * @returns Promise resolving to an array of VendorData.
   */
  getVendors: () => api.get<VendorData[]>("/api/suppliers/"),

  /**
   * Creates a new vendor / supplier record.
   * @param data Vendor payload.
   */
  createVendor: (data: Partial<VendorData>) =>
    api.post<VendorData>("/api/suppliers/", data),

  /**
   * Updates an existing vendor record.
   * @param id Target vendor ID.
   * @param data Updated vendor payload.
   */
  updateVendor: (id: number, data: Partial<VendorData>) =>
    api.put<VendorData>(`/api/suppliers/${id}`, data),

  /**
   * Deletes a vendor record by ID.
   * @param id Target vendor ID.
   */
  deleteVendor: (id: number) => api.delete<void>(`/api/suppliers/${id}`),
};
