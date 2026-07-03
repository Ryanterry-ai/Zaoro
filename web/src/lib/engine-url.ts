/**
 * API base URL helper for frontend hooks.
 *
 * When the Next.js frontend and the Node.js backend run on different
 * ports (e.g., 3000 vs 3001), relative URLs like /api/workspace/...
 * hit the Next.js server which doesn't have these routes, causing 404s.
 *
 * This module provides a configurable base URL that defaults to the
 * backend origin. Set NEXT_PUBLIC_ENGINE_URL env var to override.
 */

function getEngineBase(): string {
  // In browser: use env var or default to same-origin (works when proxied)
  if (typeof window !== 'undefined') {
    return (window as any).__ENGINE_BASE__ || '';
  }
  // In SSR: use env var or empty string
  return '';
}

export function engineUrl(path: string): string {
  const base = getEngineBase();
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
