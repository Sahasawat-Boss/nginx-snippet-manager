import { DatabaseSync } from 'node:sqlite';
import { seedSnippets } from './seed.js';

const SCHEMA_VERSION = 1;

export function openDb(path, { seed = true } = {}) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');

  // user_version marks an initialised database, so a user who deletes every
  // snippet does not get the examples back on the next restart.
  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version < SCHEMA_VERSION) {
    db.exec(`
      CREATE TABLE snippets (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        content     TEXT NOT NULL,
        tags        TEXT NOT NULL DEFAULT '[]',
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      );
      CREATE INDEX idx_snippets_updated_at ON snippets (updated_at DESC, id DESC);
    `);
    if (seed) seedSnippets(db);
    db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }

  return db;
}
