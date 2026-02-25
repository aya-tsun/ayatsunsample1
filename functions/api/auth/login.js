import { verifyPassword, signJWT } from "../../lib/auth.js";

export async function onRequestPost(context) {
  try {
    var body = await context.request.json();
    var email = (body.email || "").trim().toLowerCase();
    var password = body.password || "";

    if (!email || !password) {
      return Response.json({ error: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    if (!context.env.DB) {
      return Response.json({ error: "データベースが設定されていません。Cloudflareダッシュボードで D1 バインディング（変数名: DB）を確認してください" }, { status: 500 });
    }

    if (!context.env.JWT_SECRET) {
      return Response.json({ error: "JWT_SECRET が設定されていません。Cloudflareダッシュボードで環境変数を確認してください" }, { status: 500 });
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
  } catch (err) {
    return Response.json({ error: "サーバーエラーが発生しました: " + err.message }, { status: 500 });
  }
}
