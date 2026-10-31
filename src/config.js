/**
 * Application Global Configuration
 * Google OAuth Client ID (injected from Netlify Environment Variables: VITE_GOOGLE_CLIENT_ID)
 */
export const DEFAULT_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
