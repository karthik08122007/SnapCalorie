import { analyticsAPI } from '../services/api';

/**
 * trackEvent
 * Fire-and-forget analytics call. Never throws — safe to call anywhere.
 *
 * @param {string} eventName - e.g. 'meal_scan_started', 'meal_saved'
 * @param {object} metadata  - e.g. { scan_time_ms: 1200, meal_type: 'snack' }
 */
export async function trackEvent(eventName, metadata = {}) {
  try {
    await analyticsAPI.track(eventName, metadata);
  } catch {
    // Analytics must never block the user — silently swallow all errors
  }
}
