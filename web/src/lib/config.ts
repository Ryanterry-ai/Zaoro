/**
 * Shared configuration for the web frontend.
 * 
 * In development, set ENGINE_URL=http://localhost:3001 in web/.env.local
 * In production (Vercel), set ENGINE_URL as an environment variable to
 * the deployed engine URL (e.g. https://build-same-engine.onrender.com)
 * 
 * No ngrok required. No manual engine startup needed after deploy.
 */
export function getEngineUrl(): string {
  const url = process.env.ENGINE_URL;
  if (url && url.trim()) return url;

  // In production without ENGINE_URL set, return a placeholder
  // that will give clear error messages rather than silent failure.
  // This prevents the old bug where a stale ngrok URL silently broke builds.
  if (process.env.VERCEL) {
    return ''; // Will cause 502 with clear "ENGINE_URL not configured" message
  }

  // Local development fallback
  return 'http://localhost:3001';
}
