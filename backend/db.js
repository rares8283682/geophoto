const { createClient } = require('@libsql/client');
const path = require('path');

const DB_URL = `file:${path.join(__dirname, 'geophotos.db')}`;

let client;

function getClient() {
  if (!client) {
    client = createClient({ url: DB_URL });
  }
  return client;
}

/**
 * Initialises the database and creates tables if they do not exist.
 * Must be awaited before the server starts accepting requests.
 */
async function initDB() {
  const db = getClient();

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    UNIQUE NOT NULL,
      password_hash TEXT    NOT NULL,
      name          TEXT,
      username      TEXT    UNIQUE,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      filename       TEXT    NOT NULL,
      original_name  TEXT    NOT NULL,
      lat            REAL    NOT NULL,
      lng            REAL    NOT NULL,
      ai_description TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_id   INTEGER NOT NULL,
      user_id    INTEGER NOT NULL,
      body       TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(lat, lng);
    CREATE INDEX IF NOT EXISTS idx_photos_user     ON photos(user_id);
    CREATE INDEX IF NOT EXISTS idx_comments_photo  ON comments(photo_id);
  `);

  console.log('✅ Database initialised');
}

/**
 * Helper: run a SELECT and return all rows as plain objects.
 */
async function query(sql, args = []) {
  const db = getClient();
  const result = await db.execute({ sql, args });
  return result.rows.map(row => Object.fromEntries(Object.entries(row)));
}

/**
 * Helper: run a INSERT/UPDATE/DELETE and return { lastInsertRowid, rowsAffected }.
 */
async function run(sql, args = []) {
  const db = getClient();
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid: Number(result.lastInsertRowid),
    rowsAffected: result.rowsAffected,
  };
}

module.exports = { getClient, initDB, query, run };
