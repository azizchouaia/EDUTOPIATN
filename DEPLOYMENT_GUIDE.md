# Edutopia — Production Deployment Guide
**High-Traffic Configuration: nginx + PM2 + MySQL**

> Version 1.0 — July 2026  
> Audience: system administrator / developer deploying to a VPS or cloud VM

---

## Architecture Overview

| Layer | Technology | Role |
|---|---|---|
| Process manager | PM2 cluster mode | 1 Node worker per CPU core |
| Web server | nginx | Reverse proxy + static files + gzip |
| DB pool | mysql2 | 25 connections, 60 s idle timeout |
| Cache | In-memory TTL | 60–120 s for hot read-only endpoints |
| Compression | gzip | Express `compression` + nginx |
| Rate limiting | express-rate-limit | Per-endpoint category limits |

**Traffic flow:** Browser → nginx (80/443) → PM2 cluster (127.0.0.1:5000)

Uploads (PDFs, videos, receipts) are served directly by nginx — they never touch Node.

---

## 2. Pre-Flight Checklist

- [ ] Node.js v18 LTS or v20 LTS installed
- [ ] `npm install -g pm2` done
- [ ] nginx installed (`sudo apt install nginx`)
- [ ] MySQL 8.x running and accessible
- [ ] `.env` file created and all vars set (see Section 3)
- [ ] Both DB migration files applied (see Section 4)
- [ ] Frontend built and copied to `/var/www/edutopia/`
- [ ] `backend/uploads/` directory exists with write permissions
- [ ] `backend/logs/` directory exists (PM2 creates it on first start)
- [ ] Firewall: ports 80/443 open, port 5000 blocked externally

---

## 3. Environment Variables

Create `backend/.env`. **Never commit this file to git.**

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=edutopia
DB_PASSWORD=<strong-password>
DB_NAME=edutopiav2

# JWT
JWT_SECRET=<64-character-random-string>
JWT_EXPIRES_IN=7d

# CORS — your frontend domain, no trailing slash
ALLOWED_ORIGINS=https://yourdomain.com

# Email (SMTP or transactional provider)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=<smtp-password>
EMAIL_FROM=Edutopia <no-reply@yourdomain.com>

# Frontend URL (used in email links)
FRONTEND_URL=https://yourdomain.com
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 4. Database Migrations

Run both files in order before starting the server:

```bash
mysql -u edutopia -p edutopiav2 < backend/migrations/2026-06-24-activation-attempts.sql
mysql -u edutopia -p edutopiav2 < backend/migrations/2026-07-09-events-is-free.sql
```

Verify:
```bash
mysql -u edutopia -p edutopiav2 -e "SHOW TABLES;"
```

---

## 5. Install Dependencies

### Backend
```bash
cd backend
npm install --omit=dev   # skips nodemon in production
```

### Frontend — Build & Deploy
```bash
cd frontend
npm install
npm run build

sudo mkdir -p /var/www/edutopia
sudo cp -r dist/* /var/www/edutopia/
```

> **Re-run `npm run build` and copy to `/var/www/edutopia/` for every frontend change.**

---

## 6. Start the Backend with PM2

### Install PM2
```bash
npm install -g pm2
```

### Start in Cluster Mode
```bash
cd backend
pm2 start ecosystem.config.js --env production
```

This forks one worker per CPU core. On a 4-core server you get 4 Node processes sharing port 5000.

### Verify
```bash
pm2 list
pm2 logs edutopia-api --lines 20
```

### Survive Reboots
```bash
pm2 save
pm2 startup
# Run the command that pm2 startup prints
```

### Zero-Downtime Deploy (after code changes)
```bash
cd backend
git pull
npm install --omit=dev
pm2 reload edutopia-api   # starts new workers before killing old ones
```

---

## 7. Configure nginx

### Install
```bash
sudo apt update && sudo apt install nginx -y
```

### Copy Config
```bash
sudo cp nginx/edutopia.conf /etc/nginx/sites-available/edutopia.conf
```

Edit the file and replace:
- `yourdomain.com` → your actual domain or server IP
- `/var/www/edutopia` → absolute path to the built frontend
- `/var/www/edutopia-api` → absolute path to the backend root (where `uploads/` lives)

### Enable the Site
```bash
sudo ln -s /etc/nginx/sites-available/edutopia.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Certbot (Recommended)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically edits the nginx config to add HTTPS and sets up auto-renewal.

---

## 8. Uploads Directory

nginx serves uploaded files directly (bypass Node). Set the correct ownership:

```bash
sudo chown -R www-data:www-data /absolute/path/to/backend/uploads
sudo chmod -R 755 /absolute/path/to/backend/uploads
```

Update the `alias` in `nginx/edutopia.conf`:
```nginx
location /uploads/ {
    alias /absolute/path/to/backend/uploads/;
}
```

---

## 9. Firewall

Port 5000 (Node) must never be publicly reachable:

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw deny 5000   # Block Node port from outside
sudo ufw enable
```

> If your VPS has a cloud-level firewall panel (AWS Security Groups, Hetzner Cloud Firewall, etc.), mirror these rules there too.

---

## 10. Monitoring & Maintenance

### PM2
```bash
pm2 monit                      # live dashboard
pm2 logs edutopia-api           # tail all logs
pm2 logs edutopia-api --err     # errors only
```

### Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 7
```

### nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### MySQL Connection Pool
Pool is set to 25 connections. Check usage:
```sql
SHOW STATUS LIKE 'Threads_connected';
```
If it consistently exceeds 20, increase `connectionLimit` in `backend/src/config/db.js` and run `pm2 reload edutopia-api`.

---

## 11. Troubleshooting

### 502 Bad Gateway
- PM2 is not running → `pm2 list`, then `pm2 start ecosystem.config.js --env production`
- Wrong port → verify `proxy_pass http://127.0.0.1:5000` in nginx config
- Loopback blocked → `sudo ufw allow from 127.0.0.1 to any port 5000`

### CORS errors in browser
- `ALLOWED_ORIGINS` in `.env` must match the exact origin the browser sends (protocol + domain + port)
- After changing `.env`: `pm2 reload edutopia-api`

### Uploads not loading
- Check `alias` path in nginx config matches the actual `uploads/` absolute path
- Check permissions: `www-data` must be able to read the files
- Test: `curl http://yourdomain.com/uploads/test-file.pdf`

### Email not sending
- Verify `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`
- Check logs: `pm2 logs edutopia-api --err` (look for `[mailer]` lines)
- Most VPS providers block port 25 — use port 587 (STARTTLS) or 465 (SSL)

---

## 12. Quick Command Reference

| Task | Command |
|---|---|
| Start cluster | `pm2 start ecosystem.config.js --env production` |
| Zero-downtime restart | `pm2 reload edutopia-api` |
| Stop all workers | `pm2 stop edutopia-api` |
| View live logs | `pm2 logs edutopia-api` |
| Live monitoring | `pm2 monit` |
| Reload nginx | `sudo systemctl reload nginx` |
| Test nginx config | `sudo nginx -t` |
| Rebuild frontend | `cd frontend && npm run build && sudo cp -r dist/* /var/www/edutopia/` |
| Run DB migration | `mysql -u edutopia -p edutopiav2 < file.sql` |
| Renew SSL cert | `sudo certbot renew` |
