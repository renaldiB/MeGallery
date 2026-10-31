/**
 * Application Global Configuration
 * Reads from Vite environment variable (e.g. Netlify Environment Variables)
 * or fallback to empty string (user can input manually via UI).
 */
export const DEFAULT_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
