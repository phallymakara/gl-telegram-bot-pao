/**
 * @file mockDelay.ts
 * @description Centralized configuration for artificial loading animation delays.
 * Allows developers and testers to clearly observe loading animations across all pages.
 *
 * HOW TO REMOVE OR DISABLE:
 * Simply change ENABLE_MOCK_DELAY below to `false`.
 */

// ============================================================================
// SET TO FALSE TO INSTANTLY DISABLE ALL ARTIFICIAL LOADING DELAYS
// ============================================================================
export const ENABLE_MOCK_DELAY = true;

export const MOCK_DELAYS = {
  /** Full-page route lazy loading delay (PageLoader) */
  PAGE_LOAD_MS: ENABLE_MOCK_DELAY ? 1000 : 0,

  /** Backend API request / data fetch delay (TableLoader & data loaders) */
  API_FETCH_MS: ENABLE_MOCK_DELAY ? 1200 : 0,

  /** Table scroll progressive batch delay (useLazyRecords) */
  SCROLL_MORE_MS: ENABLE_MOCK_DELAY ? 1200 : 350,
};

/**
 * Utility helper to pause execution for a given mock delay duration.
 */
export async function waitMockDelay(ms: number): Promise<void> {
  if (!ENABLE_MOCK_DELAY || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}
