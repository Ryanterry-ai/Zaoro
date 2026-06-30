/**
 * Shared configuration for the web frontend.
 *
 * In development, set ENGINE_URL=http://localhost:3001 in web/.env.local
 * In production (Vercel), set ENGINE_URL as an environment variable to
 * the tunneled engine URL (e.g. https://xxx.trycloudflare.com).
 */
export function getEngineUrl(): string {
  const url = process.env.ENGINE_URL;
  if (url && url.trim()) return url.trim();

  // Local development fallback
  if (!process.env.VERCEL) {
    return 'http://localhost:3001';
  }

  throw new Error('ENGINE_URL environment variable is required in production');
}
