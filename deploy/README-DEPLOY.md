# Deploying Edutopia to GCP for ~$0/month

## Why this shape

- One **e2-micro** Compute Engine VM — the *only* GCP compute resource that's
  actually free (Always Free tier: 1 instance/month, only in `us-west1`,
  `us-central1`, or `us-east1`), with a 30GB standard persistent disk (also
  free up to 30GB).
- Cloud Run + Cloud SQL would be more "cloud-native," but Cloud SQL has no
  free tier — even the smallest instance runs ~$8–15/month. Running MySQL
  in a container on the free VM instead costs $0.
- Frontend + backend live in **one Docker image** (backend serves the built
  static frontend). MySQL is a **separate container** with its own volume —
  don't put a database inside the same image as your app; you'll lose data
  on every rebuild.
- **Caddy** gets you free auto-renewing HTTPS with ~5 lines of config,
  cheaper than setting up a GCP load balancer (which is not free).

Total steady-state cost if you stay within Always Free limits: **$0/month**
(plus a few cents if you exceed 1GB/month egress).

---

## 1. Files to place in your repo

```
your-repo/
├── Dockerfile                          ← from this bundle (repo root)
├── docker-compose.yml                  ← from this bundle (repo root)
├── .dockerignore                       ← from this bundle (repo root)
├── Caddyfile                           ← from this bundle (repo root)
├── .env                                ← copy from .env.compose.example, fill in
├── backend/
│   ├── .env                            ← copy from backend.env.production.example, fill in
│   └── src/app.js                      ← replace with app.js.patched
└── deploy/
    └── vm-startup.sh                   ← from this bundle
```

`database.sql` and `seed.sql` already exist at your repo root per your
screenshot — docker-compose references them directly to initialize MySQL
on first boot.

## 2. One-time GCP setup

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Reserve a static external IP (free while attached to a running instance)
gcloud compute addresses create edutopia-ip --region=us-central1

# Open firewall for HTTP/HTTPS only — DB and app ports stay internal
gcloud compute firewall-rules create allow-http-https \
  --allow=tcp:80,tcp:443 \
  --target-tags=edutopia-server \
  --direction=INGRESS

# Create the VM
gcloud compute instances create edutopia-vm \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-standard \
  --tags=edutopia-server \
  --address=edutopia-ip \
  --metadata-from-file=startup-script=deploy/vm-startup.sh
```

## 3. Push your code to the VM

Easiest: SSH in and `git clone` your repo (push it to GitHub/GitLab first).

```bash
gcloud compute ssh edutopia-vm --zone=us-central1-a

# on the VM:
git clone https://github.com/you/edutopia.git
cd edutopia
```

No GitHub? `scp` the whole folder instead:

```bash
gcloud compute scp --recurse ./your-repo edutopia-vm:~/edutopia --zone=us-central1-a
```

## 4. Fill in secrets on the VM

```bash
cd ~/edutopia
cp .env.compose.example .env                 # root — DB creds
nano .env                                     # set real passwords

cp backend.env.production.example backend/.env
nano backend/.env                             # set real JWT_SECRET, API keys, etc.
```

Rotate every key that was pasted into chat earlier (Groq, Mem0, JWT secret)
before putting the new values here.

Edit `Caddyfile` and replace `your-domain.com` with your real domain (point
its DNS A record at the static IP from step 2), or switch to the `:80`
block if you don't have a domain yet.

## 5. Build and run

```bash
docker compose up -d --build
docker compose ps        # confirm app, mysql, caddy are all "healthy"/"running"
docker compose logs -f app
```

## 6. Verify

```bash
curl http://YOUR_STATIC_IP/api/health
# or once DNS + Caddy TLS is live:
curl https://your-domain.com/api/health
```

## Redeploying after code changes

```bash
cd ~/edutopia
git pull
docker compose up -d --build
```

## Cost checklist to stay at $0

- Keep exactly **one** VM, `e2-micro`, in `us-west1`/`us-central1`/`us-east1`.
- Keep the boot disk ≤30GB, type `pd-standard` (not SSD).
- Don't attach the static IP to a *stopped* instance — GCP charges for
  reserved IPs that aren't in use.
- Watch network egress; the free tier is 1GB/month to most destinations.
