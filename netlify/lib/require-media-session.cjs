// Check again inside each function so a direct invocation cannot bypass the edge gate.
exports.withMediaSession = (handler) => async (event, context) => {
  const { hasSession, privateHeaders } = await import("./media-auth.mjs");
  const password = process.env.MEDIA_PASSWORD;
  const secret = process.env.MEDIA_SESSION_SECRET;
  const denied = (statusCode, error) => ({ statusCode,
    headers: { ...privateHeaders, "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ error })
  });
  if (!password || !secret || secret.length < 32) return denied(503, "Wedding memories are temporarily unavailable.");
  const headers = new Headers(event?.headers || {});
  const request = new Request("https://media.internal/", { headers });
  if (!await hasSession(request, { password, secret })) return denied(401, "Please unlock the media page first.");
  const response = await handler(event, context);
  return { ...response, headers: { ...response.headers, ...privateHeaders, vary: "Cookie" } };
};
