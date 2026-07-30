/**
 * PM2 Ecosystem Config — Edutopia Backend
 *
 * Usage:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save          # persist across reboots
 *   pm2 startup       # generate & install the startup script
 *
 * Cluster mode forks one worker per CPU core, so all cores are used and a
 * single worker crash doesn't take the whole server down.
 */

module.exports = {
  apps: [
    {
      name: 'edutopia-api',
      script: 'src/app.js',
      instances: 'max',         // one process per CPU core
      exec_mode: 'cluster',     // share the port across all workers

      // Graceful restart: wait for in-flight requests to finish (up to 5 s)
      // before killing the old worker on a reload/deploy.
      kill_timeout: 5000,
      wait_ready: false,

      // Restart on crash but don't thrash — if the process crashes more than
      // 10 times in 30 s it's likely a config error, so stop auto-restarting.
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 1000,

      // Log files (PM2 handles rotation via `pm2 install pm2-logrotate`)
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Environment variables for production — set secrets here or in a
      // separate .env file loaded via dotenv (already done in app.js).
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        // DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, etc. come from
        // the .env file in the backend root — don't hard-code secrets here.
      },

      // Dev mode: single instance, auto-restart on file changes.
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        watch: true,
        ignore_watch: ['node_modules', 'logs', 'uploads'],
      },
    },
  ],
};
