import { hashPassword, signJWT } from "../../lib/auth.js";

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var email = (body.email || "").trim().toLowerCase();
    var password = body.password || "";

    if (!email || !password) {
      return Response.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "パスワードは6文字以上にしてください" }, { status: 400 });
    }

    if (!context.env.DB) {
      return Response.json({ error: "データベースが設定されていません。Cloudflareダッシュボードで D1 バインディング（変数名: DB）を確認してください" }, { status: 500 });
    }

    if (!context.env.JWT_SECRET) {
      return Response.json({ error: "JWT_SECRET が設定されていません。Cloudflareダッシュボードで環境変数を確認してください" }, { status: 500 });
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
  } catch (err) {
    return Response.json({ error: "サーバーエラーが発生しました: " + err.message }, { status: 500 });
  }
}
