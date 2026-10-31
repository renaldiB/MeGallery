/**
 * Application Global Configuration
 * Supports both Google OAuth Client ID and Google Apps Script Webhook URL
 */
export const DEFAULT_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_GAS_WEBHOOK_URL || '';
