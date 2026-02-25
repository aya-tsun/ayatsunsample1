import { verifyPassword, signJWT } from "../../lib/auth.js";

export async function onRequestPost(context) {
  var body = await context.request.json();
  var email = (body.email || "").trim().toLowerCase();
  var password = body.password || "";

  if (!email || !password) {
    return Response.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  var user = await context.env.DB
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!user) {
    return Response.json({ error: "メールアドレスまたはパスワードが間違っています" }, { status: 401 });
  }

  var valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return Response.json({ error: "メールアドレスまたはパスワードが間違っています" }, { status: 401 });
  }

  var token = await signJWT({ sub: user.id, email: user.email }, context.env.JWT_SECRET);

  return Response.json({ token: token, email: user.email });
}
