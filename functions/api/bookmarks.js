export async function onRequestGet(context) {
  try {
    var userId = context.data.user.sub;

    var { results } = await context.env.DB
      .prepare("SELECT id, title, url, tags, created_at as createdAt FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC")
      .bind(userId)
      .all();

    var bookmarks = results.map(function (row) {
      return { id: row.id, title: row.title, url: row.url, tags: JSON.parse(row.tags), createdAt: row.createdAt };
    });

    return Response.json(bookmarks);
  } catch (err) {
    return Response.json({ error: "サーバーエラーが発生しました: " + err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    var userId = context.data.user.sub;
    var body = await context.request.json();
    var title = body.title;
    var url = body.url;
    var tags = body.tags;

    if (!title || !url) {
      return Response.json({ error: "title and url are required" }, { status: 400 });
    }

    var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    var createdAt = new Date().toISOString();
    var tagsJson = JSON.stringify(tags || []);

    await context.env.DB
      .prepare("INSERT INTO bookmarks (id, user_id, title, url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, userId, title, url, tagsJson, createdAt)
      .run();

    return Response.json({ id: id, title: title, url: url, tags: tags || [], createdAt: createdAt }, { status: 201 });
  } catch (err) {
    return Response.json({ error: "サーバーエラーが発生しました: " + err.message }, { status: 500 });
  }
}
