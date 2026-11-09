import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT ?? 3000);
const dbPath = process.env.DB_PATH ?? 'snippets.db';

const db = openDb(dbPath);
const server = createApp(db).listen(port, () => {
  console.log(`API listening on port ${port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
