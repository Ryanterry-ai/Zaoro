import { NextRequest } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    console.log(`[Build Proxy] Build request for workspace: ${id}`);

    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const targetUrl = `${cleanUrl}/api/workspace/${id}/build`;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    });

    const responseText = await response.text();
    console.log(`[Build Proxy] Engine response: ${response.status} - ${responseText.substring(0, 200)}`);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Engine error: ${response.status}`, details: responseText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      responseText,
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[Build Proxy] Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to connect to engine', details: error.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
