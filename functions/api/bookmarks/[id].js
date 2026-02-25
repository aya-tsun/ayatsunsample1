export async function onRequestPut(context) {
  var userId = context.data.user.sub;
  var id = context.params.id;
  var body = await context.request.json();
  var title = body.title;
  var url = body.url;
  var tags = body.tags;

  if (!title || !url) {
    return Response.json({ error: "title and url are required" }, { status: 400 });
  }

  var tagsJson = JSON.stringify(tags || []);

  var result = await context.env.DB
    .prepare("UPDATE bookmarks SET title = ?, url = ?, tags = ? WHERE id = ? AND user_id = ?")
    .bind(title, url, tagsJson, id, userId)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ id: id, title: title, url: url, tags: tags || [] });
}

export async function onRequestDelete(context) {
  var userId = context.data.user.sub;
  var id = context.params.id;

  var result = await context.env.DB
    .prepare("DELETE FROM bookmarks WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
