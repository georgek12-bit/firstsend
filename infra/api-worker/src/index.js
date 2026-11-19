// api.firstsend.site → the `api` Supabase Edge Function.
// Customers call https://api.firstsend.site/v1/... and never see the supabase.co address.
// Auth is the customer's API key in the x-api-token header; the Edge Function checks it.

const UPSTREAM = 'https://vmnjfswqxxmykfnhecbm.supabase.co/functions/v1/api';

// Only these request headers are passed on. Everything else (cookies, Cloudflare's own) is dropped.
const PASS = ['x-api-token', 'x-workspace-id', 'content-type', 'accept', 'idempotency-key', 'user-agent'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'x-api-token, x-workspace-id, content-type, idempotency-key',
  'Access-Control-Max-Age': '86400',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/' || url.pathname === '') {
      return json({ name: 'Firstsend API', version: 'v1', docs: 'https://firstsend.site/docs/api' });
    }
    if (url.pathname === '/health') return json({ ok: true });

    const headers = new Headers();
    for (const h of PASS) {
      const v = request.headers.get(h);
      if (v) headers.set(h, v);
    }
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) headers.set('x-client-ip', ip); // for per-key rate limits and logs

    let res;
    try {
      res = await fetch(UPSTREAM + url.pathname + url.search, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });
    } catch {
      return json({ error: { code: 'upstream_unavailable', message: 'The API is unavailable right now. Try again shortly.' } }, 502);
    }

    // Supabase's own "function not found" (the Edge Function isn't deployed): don't leak its wording.
    if (res.status === 404) {
      const text = await res.clone().text();
      if (/Requested function was not found/i.test(text) || !text.trim().startsWith('{"error"')) {
        return json({ error: { code: 'not_found', message: 'No such endpoint. See https://firstsend.site/docs/api' } }, 404);
      }
    }

    const out = new Headers(CORS);
    for (const h of ['content-type', 'content-disposition', 'retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-request-id']) {
      const v = res.headers.get(h);
      if (v) out.set(h, v);
    }
    return new Response(res.body, { status: res.status, headers: out });
  },
};
