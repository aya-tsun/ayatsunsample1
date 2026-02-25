export async function onRequestPut(context) {
  const id = context.params.id;
  const body = await context.request.json();
  const { title, url, tags } = body;

  if (!title || !url) {
    return Response.json({ error: "title and url are required" }, { status: 400 });
  }

  const tagsJson = JSON.stringify(tags || []);

  const result = await context.env.DB
    .prepare("UPDATE bookmarks SET title = ?, url = ?, tags = ? WHERE id = ?")
    .bind(title, url, tagsJson, id)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ id, title, url, tags: tags || [] });
}

export async function onRequestDelete(context) {
  const id = context.params.id;

  const result = await context.env.DB
    .prepare("DELETE FROM bookmarks WHERE id = ?")
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
