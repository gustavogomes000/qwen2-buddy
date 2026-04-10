// ── Background Sync API ──────────────────────────────────────────────────────
// Registers for background sync so pending items sync even when the app is closed.
// Falls back gracefully if the API is not available.

const SYNC_TAG = 'offline-registrations-sync';

/**
 * Request a one-shot background sync. The Service Worker will receive
 * a 'sync' event with tag SYNC_TAG when connectivity is available.
 */
export async function requestBackgroundSync(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration && 'sync' in registration) {
      await (registration as any).sync.register(SYNC_TAG);
      console.log('[BackgroundSync] Registered sync:', SYNC_TAG);
      return true;
    }
  } catch (err) {
    console.warn('[BackgroundSync] Registration failed:', err);
  }
  return false;
}

/**
 * Check if Background Sync API is supported.
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

export { SYNC_TAG };
