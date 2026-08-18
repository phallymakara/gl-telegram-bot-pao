/**
 * @file products.ts
 * @description Master Data - Products domain module defining interfaces and API service endpoints with Conversion Factor support.
 */

import { api } from "./client";

/**
 * Interface representing gold product master data items (Name, Conversion Factor, Status).
 */
export interface ProductData {
  id: number;
  name: string;
  conversion_factor?: number | null;
  is_active?: boolean;
  product_code?: string | null;
  purity?: string | null;
  category?: string | null;
  unit_weight_kg?: number | null;
  description?: string | null;
  created_at?: string;
}

/**
 * Products API service handling CRUD operations for gold products master data.
 */
export const productsApi = {
  /**
   * Fetches the complete list of master data gold products.
   * @returns Promise resolving to an array of ProductData.
   */
  getProducts: () => api.get<ProductData[]>("/api/products/"),

  /**
   * Fetches a single product record by ID.
   * @param id Target product ID.
   */
  getProductById: (id: number) => api.get<ProductData>(`/api/products/${id}`),

  /**
   * Creates a new product master record.
   * @param data Product payload.
   */
  createProduct: (data: Partial<ProductData>) =>
    api.post<ProductData>("/api/products/", data),

  /**
   * Updates an existing product master record.
   * @param id Target product ID.
   * @param data Updated product payload.
   */
  updateProduct: (id: number, data: Partial<ProductData>) =>
    api.put<ProductData>(`/api/products/${id}`, data),

  /**
   * Deletes a product record by ID.
   * @param id Target product ID.
   */
  deleteProduct: (id: number) => api.delete<void>(`/api/products/${id}`),
};
