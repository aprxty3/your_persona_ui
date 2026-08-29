/**
 * Runtime proxy to the backend API.
 *
 * Replaces the previous `rewrites()` entry in next.config.mjs. With
 * `output: 'standalone'`, rewrites() is evaluated at BUILD time and its result is
 * baked into routes-manifest.json — so API_INTERNAL_URL supplied at container
 * runtime was silently ignored and every /api/be/* call fell back to
 * http://localhost:8080 (the UI container itself), returning 500.
 *
 * A Route Handler reads process.env per request, so one image works for dev,
 * staging and prod.
 */
import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // never cache a proxied API response
export const runtime = 'nodejs';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
  'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'host',
]);

function target(): string {
  return (process.env.API_INTERNAL_URL ?? 'http://localhost:8080').replace(/\/+$/, '');
}

function forwardHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) out.set(key, value);
  });
  return out;
}

async function proxy(req: NextRequest, path: string[]): Promise<Response> {
  const url = `${target()}/${path.join('/')}${req.nextUrl.search}`;
  const method = req.method;
  const hasBody = !['GET', 'HEAD'].includes(method);

  try {
    const upstream = await fetch(url, {
      method,
      headers: forwardHeaders(req.headers),
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });

    const headers = new Headers();
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
    });

    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (err) {
    // Do not leak the internal URL or the raw error to the client.
    console.error(`[api-proxy] ${method} ${path.join('/')} failed:`, err);
    return NextResponse.json(
      { success: false, error: { code: 'UPSTREAM_UNREACHABLE', message: 'Backend unavailable' } },
      { status: 502 },
    );
  }
}

type Ctx = { params: Promise<{ path: string[] }> };
const handler = async (req: NextRequest, ctx: Ctx) => proxy(req, (await ctx.params).path);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
