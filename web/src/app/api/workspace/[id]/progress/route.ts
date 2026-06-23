import { NextRequest } from 'next/server';

const ENGINE_URL = process.env.ENGINE_URL || "https://cytoplast-essence-untagged.ngrok-free.dev";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const cleanUrl = ENGINE_URL.endsWith('/') ? ENGINE_URL.slice(0, -1) : ENGINE_URL;
    const targetUrl = `${cleanUrl}/api/workspace/${id}/progress`;

    const response = await fetch(targetUrl, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });

    const responseText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Engine error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      responseText,
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to connect to engine', details: error.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
