const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'edutopiav2',
  waitForConnections: true,
  connectionLimit:    25,   // up from 10 — supports more concurrent requests
  queueLimit:         50,   // queue up to 50 requests instead of unlimited (fail fast under extreme load)
  connectTimeout:     10000, // 10 s — give up quickly if DB is unreachable
  // mysql2 uses idleTimeout to release stale pool connections (keep-alive protection)
  idleTimeout:        60000, // 60 s idle before a connection is released
});

// mysql2 attaches 'error' listeners per-connection rather than re-emitting on
// the pool itself. An idle connection killed by the DB server (network blip,
// DB restart, max idle timeout) emits 'error' on that connection object — and
// in Node, an EventEmitter 'error' event with no listener throws and crashes
// the process. Listening here keeps a dropped connection from taking down the
// whole server; the pool will simply open a new connection on the next query.
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    console.error('MySQL connection error (recovered):', err.message);
  });
});

module.exports = pool;
