// Migration runner (database.md Bagian 5: setiap perubahan schema via file migrasi).
// Usage: node server/src/db/migrate.js  (atau: npm run db:migrate)
const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./connection');

function runMigrations() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort();
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
  );

  const results = [];
  for (const file of files) {
    const migration = require(path.join(dir, file));
    if (!applied.has(migration.version)) {
      const tx = db.transaction(() => {
        migration.up(db);
        db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(
          migration.version,
          migration.name
        );
      });
      tx();
      results.push(`${migration.version}_${migration.name}`);
    }
  }
  return results;
}

if (require.main === module) {
  const applied = runMigrations();
  console.log(
    applied.length === 0 ? 'Database already up to date.' : `Applied: ${applied.join(', ')}`
  );
  closeDb();
}

module.exports = { runMigrations };
