/**
 * @file client.ts
 * @description Core HTTP client module providing request wrapper, generic REST API methods, token authentication, error parsing, and numeric utilities.
 */

// Base URL prefix for API calls (empty string defaults to current host origin)
const BASE = "";

/**
 * Generic HTTP request helper function.
 * Handles automatic inclusion of Bearer authentication tokens from localStorage,
 * content-type headers, HTTP status validation, JSON error parsing, and 204 No Content handling.
 *
 * @template T - Expected JSON response payload structure.
 * @param path - API endpoint path (e.g. "/api/orders").
 * @param options - Standard Fetch RequestInit configuration options.
 * @returns Promise resolving to the parsed response body of type T.
 * @throws Error containing server detail or raw HTTP error message if status is not OK.
 */
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Retrieve bearer token from local storage
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Perform fetch request
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  });

  // Process non-2xx response errors
  if (!res.ok) {
    const text = await res.text();
    let message = text || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.detail) message = String(parsed.detail);
    } catch {
      // Retain raw error text if not valid JSON
    }
    throw new Error(message);
  }

  // Handle 204 No Content response status
  if (res.status === 204) return undefined as T;

  // Parse and return standard JSON response payload
  return res.json();
}

/**
 * Utility function to convert unknown values to finite numbers.
 * Safe fallback for null, undefined, NaN, or non-numeric strings.
 *
 * @param value - Target value to parse as a number.
 * @returns Parsed number if finite; otherwise defaults to 0.
 */
export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Convenience wrapper object providing typed GET, POST, PUT, and DELETE helper methods.
 */
export const api = {
  /**
   * Executes a typed GET request.
   * @template T Response type.
   * @param path API endpoint URL.
   */
  get: <T>(path: string) => request<T>(path),

  /**
   * Executes a typed POST request.
   * @template T Response type.
   * @param path API endpoint URL.
   * @param body Optional request payload.
   */
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * Executes a typed PUT request.
   * @template T Response type.
   * @param path API endpoint URL.
   * @param body Request payload for updates.
   */
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),

  /**
   * Executes a typed DELETE request.
   * @template T Response type.
   * @param path API endpoint URL.
   */
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
