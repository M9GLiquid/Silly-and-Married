import { hasSession, isMediaPage, isProtectedPath, normalizedPath, privateHeaders, readSecrets } from "../lib/media-auth.mjs";

export default async function mediaGuard(request, context) {
  let path;
  try { path = normalizedPath(request.url); }
  catch { return new Response("Invalid URL", { status: 400, headers: privateHeaders }); }
  // Only this exact route is handled by the rate-limited login function.
  if (new URL(request.url).pathname === "/media-access") return;
  if (!isProtectedPath(path)) return;

  const secrets = readSecrets();
  if (!secrets) return new Response("Wedding memories are temporarily unavailable. Please try again later.", {
    status: 503, headers: privateHeaders
  });
  if (!await hasSession(request, secrets)) {
    if (isMediaPage(path)) return new Response(null, {
      status: 303, headers: { ...privateHeaders, location: "/media-access" }
    });
    return new Response(JSON.stringify({ error: "Please unlock the media page first." }), {
      status: 401, headers: { ...privateHeaders, "content-type": "application/json; charset=utf-8" }
    });
  }

  const upstream = await context.next();
  const headers = new Headers(upstream.headers);
  for (const [name, value] of Object.entries(privateHeaders)) headers.set(name, value);
  headers.append("vary", "Cookie");
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}

// Run before redirects, including direct function URLs and encoded static paths.
// Never opt into edge caching or onError: "bypass" for authentication middleware.
export const config = { path: "/*", onError: "fail" };
