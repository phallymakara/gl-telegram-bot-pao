/**
 * @file chunkRecovery.ts
 * @description Handles stale Vite chunk/module load failures after production deployments by forcing a single guarded page reload.
 */

const CHUNK_RELOAD_KEY = "vite_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 15_000;

/**
 * Reloads the page at most once within the cooldown window when a lazy chunk or preloaded module fails to load.
 * Returns true if a reload was triggered, false if skipped to avoid a reload loop.
 */
export function reloadForStaleChunk(): boolean {
  const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || "0");
  if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  }
  return false;
}

