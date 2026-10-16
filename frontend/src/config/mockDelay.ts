/**
 * @file mockDelay.ts
 * @description Centralized configuration for artificial loading animation delays.
 * Allows developers and testers to clearly observe loading animations across all pages.
 *
 * HOW TO REMOVE OR DISABLE:
 * Simply change ENABLE_MOCK_DELAY below to `false`.
 */

// ============================================================================
// DISABLED: ALL ARTIFICIAL LOADING DELAYS ARE REMOVED
// ============================================================================
export const ENABLE_MOCK_DELAY = false;

export const MOCK_DELAYS = {
  /** Full-page route lazy loading delay (PageLoader) */
  PAGE_LOAD_MS: 0,

  /** Backend API request / data fetch delay (TableLoader & data loaders) */
  API_FETCH_MS: 0,

  /** Table scroll progressive batch delay (useLazyRecords) */
  SCROLL_MORE_MS: 0,
};

/**
 * Utility helper to pause execution for a given mock delay duration.
 */
export async function waitMockDelay(_ms?: number): Promise<void> {
  return;
}

