export async function onRequestGet(context) {
  const db = context.env.DB;

  const { results } = await db
    .prepare("SELECT id, title, url, tags, created_at as createdAt FROM bookmarks ORDER BY created_at DESC")
    .all();

  const bookmarks = results.map((row) => ({
    ...row,
    tags: JSON.parse(row.tags),
  }));

  return Response.json(bookmarks);
}

export async function onRequestPost(context) {
  const body = await context.request.json();
  const { title, url, tags } = body;

  if (!title || !url) {
    return Response.json({ error: "title and url are required" }, { status: 400 });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const createdAt = new Date().toISOString();
  const tagsJson = JSON.stringify(tags || []);

  await context.env.DB
    .prepare("INSERT INTO bookmarks (id, title, url, tags, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(id, title, url, tagsJson, createdAt)
    .run();

  return Response.json({ id, title, url, tags: tags || [], createdAt }, { status: 201 });
}
