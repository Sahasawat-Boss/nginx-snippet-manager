function toSummary(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSnippet(row) {
  return { ...toSummary(row), content: row.content };
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function createSnippetRepo(db) {
  const selectById = db.prepare('SELECT * FROM snippets WHERE id = ?');

  const get = (id) => {
    const row = selectById.get(id);
    return row ? toSnippet(row) : null;
  };

  return {
    get,

    list({ q, tag, page, limit }) {
      const conditions = [];
      const params = [];

      if (q) {
        const like = `%${escapeLike(q)}%`;
        conditions.push(
          `(title LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')`,
        );
        params.push(like, like, like);
      }
      if (tag) {
        conditions.push('EXISTS (SELECT 1 FROM json_each(snippets.tags) WHERE json_each.value = ?)');
        params.push(tag);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { total } = db.prepare(`SELECT COUNT(*) AS total FROM snippets ${where}`).get(...params);
      const rows = db
        .prepare(`SELECT * FROM snippets ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`)
        .all(...params, limit, (page - 1) * limit);

      return {
        data: rows.map(toSummary),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    create({ title, description, content, tags }) {
      const now = new Date().toISOString();
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO snippets (title, description, content, tags, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(title, description, content, JSON.stringify(tags), now, now);
      return get(Number(lastInsertRowid));
    },

    update(id, { title, description, content, tags }) {
      const { changes } = db
        .prepare(
          `UPDATE snippets SET title = ?, description = ?, content = ?, tags = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(title, description, content, JSON.stringify(tags), new Date().toISOString(), id);
      return changes ? get(id) : null;
    },

    remove(id) {
      return db.prepare('DELETE FROM snippets WHERE id = ?').run(id).changes > 0;
    },

    listTags() {
      return db
        .prepare(
          `SELECT json_each.value AS name, COUNT(*) AS count
           FROM snippets, json_each(snippets.tags)
           GROUP BY json_each.value
           ORDER BY count DESC, name ASC`,
        )
        .all()
        .map(({ name, count }) => ({ name, count }));
    },
  };
}
