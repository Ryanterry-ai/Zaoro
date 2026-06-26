const ENGINE_URL = process.env.ENGINE_URL || "https://households-realm-ltd-indices.trycloudflare.com";

const NGROK_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

export function getEngineUrl(): string {
  return ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
}

export async function engineFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: any }> {
  const { timeoutMs = 15000, ...fetchOpts } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${getEngineUrl()}${path}`;
    const res = await fetch(url, {
      ...fetchOpts,
      signal: controller.signal,
      headers: { ...NGROK_HEADERS, ...fetchOpts.headers },
    });
    clearTimeout(timer);

    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }

    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timer);
    return { ok: false, status: 502, data: { error: 'Engine unreachable', details: err.message } };
  }
}
