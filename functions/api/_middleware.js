import { verifyJWT } from "../lib/auth.js";

export async function onRequest(context) {
  var url = new URL(context.request.url);

  // Auth routes don't need authentication
  if (url.pathname.startsWith("/api/auth")) {
    return context.next();
  }

  var authHeader = context.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  var token = authHeader.slice(7);
  var user = await verifyJWT(token, context.env.JWT_SECRET);
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  context.data.user = user;
  return context.next();
}
