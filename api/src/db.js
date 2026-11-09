import { DatabaseSync } from 'node:sqlite';
import { seedSnippets } from './seed.js';

// Append only: an entry's position is the schema version it upgrades to, and
// databases already deployed have run the earlier entries.
const MIGRATIONS = [
  `CREATE TABLE snippets (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     title       TEXT NOT NULL,
     description TEXT NOT NULL DEFAULT '',
     content     TEXT NOT NULL,
     tags        TEXT NOT NULL DEFAULT '[]',
     created_at  TEXT NOT NULL,
     updated_at  TEXT NOT NULL
   );
   CREATE INDEX idx_snippets_updated_at ON snippets (updated_at DESC, id DESC);`,

  `ALTER TABLE snippets ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
   DROP INDEX idx_snippets_updated_at;
   CREATE INDEX idx_snippets_favorite_updated_at ON snippets (favorite DESC, updated_at DESC, id DESC);`,
];

export function openDb(path, { seed = true } = {}) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');

  const { user_version: version } = db.prepare('PRAGMA user_version').get();
  for (let next = version; next < MIGRATIONS.length; next += 1) {
    db.exec(`BEGIN; ${MIGRATIONS[next]} PRAGMA user_version = ${next + 1}; COMMIT;`);
  }

  // user_version marks an initialised database, so a user who deletes every
  // snippet does not get the examples back on the next restart.
  if (version === 0 && seed) seedSnippets(db);

  return db;
}
