/**
 * Shared configuration for the web frontend.
 *
 * In development, set ENGINE_URL=http://localhost:3001 in web/.env.local
 * In production (Vercel), set ENGINE_URL as an environment variable to
 * the deployed engine URL (e.g. https://zaoro.onrender.com).
 *
 * Falls back to the production Render URL so the frontend works out of the box.
 */
const PRODUCTION_ENGINE_URL = 'https://zaoro.onrender.com';

export function getEngineUrl(): string {
  const url = process.env.ENGINE_URL;
  if (url && url.trim()) return url.trim();

  // Local development fallback
  if (!process.env.VERCEL) {
    return 'http://localhost:3001';
  }

  // Production fallback — Render-hosted engine
  return PRODUCTION_ENGINE_URL;
}
