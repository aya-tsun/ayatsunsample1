import { hashPassword, signJWT } from "../../lib/auth.js";

export async function onRequestPost(context) {
  var body = await context.request.json();
  var email = (body.email || "").trim().toLowerCase();
  var password = body.password || "";

  if (!email || !password) {
    return Response.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
  }

  // Check if email already exists
  var existing = await context.env.DB
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (existing) {
    return Response.json({ error: "このメールアドレスは既に登録されています" }, { status: 409 });
  }

  var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  var passwordHash = await hashPassword(password);
  var createdAt = new Date().toISOString();

  await context.env.DB
    .prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, email, passwordHash, createdAt)
    .run();

  var token = await signJWT({ sub: id, email: email }, context.env.JWT_SECRET);

  return Response.json({ token: token, email: email }, { status: 201 });
}
