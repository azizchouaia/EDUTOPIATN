# Edutopia

Plateforme e-learning pour lycéens tunisiens : cours (vidéos, PDF, exercices), quiz qui débloquent les chapitres, marketplace, abonnements, événements live, et **Khlayel** — un assistant IA de mathématiques (français / arabe / darija).

- **Frontend** : React + TypeScript + Vite + TanStack Router (port **8080**)
- **Backend** : Node.js + Express + MySQL (port **5000**)
- **IA** : Groq (gratuit) ou Anthropic Claude (payant) — commutable par variable d'environnement

---

## Prérequis

- **Node.js 18+** et npm
- **MySQL 8+** (ou MariaDB) — via XAMPP/WAMP/phpMyAdmin ou une instance locale
- Facultatif : clés API (Google OAuth, Groq/Anthropic, SMTP) — voir plus bas

---

## Installation (première fois)

### 1. Cloner le dépôt

```bash
git clone <url-du-repo> edutopia
cd edutopia
```

### 2. Créer la base de données

Importe le schéma de base, puis les migrations **dans l'ordre chronologique** :

```bash
# 1) Schéma de base (crée la base "edutopiav2" + toutes les tables)
mysql -u root -p < backend/database.sql

# 2) Migrations (dans l'ordre des dates)
mysql -u root -p edutopiav2 < backend/migrations/2026-05-04-subscription-gate.sql
# … applique chaque fichier de backend/migrations/ par ordre de date …
mysql -u root -p edutopiav2 < backend/migrations/2026-07-17-notifications.sql
```

> Via **phpMyAdmin** : sélectionne la base `edutopiav2` → onglet **Importer** → choisis chaque fichier.
> Les migrations utilisent `IF NOT EXISTS` / `ADD COLUMN` : si l'une signale « column/table already exists », c'est sans danger, passe à la suivante.

### 3. Configurer les variables d'environnement

**Backend** :

```bash
cp backend/.env.example backend/.env
```

Valeurs minimales pour démarrer en local : `DB_*` (accès MySQL), `JWT_SECRET` (une chaîne aléatoire), `AI_PROVIDER=groq` + `GROQ_API_KEY` (pour Khlayel).

**Frontend** :

```bash
cp frontend/.env.example frontend/.env
```

`VITE_API_URL=http://localhost:5000` suffit en local.

### 4. Installer les dépendances

```bash
cd backend  && npm install
cd ../frontend && npm install
```

---

## Lancer le projet

Ouvre **deux terminaux** :

```bash
# Terminal 1 — backend (http://localhost:5000)
cd backend && npm run dev

# Terminal 2 — frontend (http://localhost:8080)
cd frontend && npm run dev
```

Puis ouvre **http://localhost:8080**.

---

## Configuration des intégrations (facultatif)

| Fonctionnalité | Variables | Comment l'obtenir |
|---|---|---|
| **Connexion Google** | `GOOGLE_CLIENT_ID` (back) + `VITE_GOOGLE_CLIENT_ID` (front) | Google Cloud Console → Identifiants → ID client OAuth (type Web). Origine autorisée : `http://localhost:8080` |
| **Khlayel — gratuit** | `AI_PROVIDER=groq`, `GROQ_API_KEY` | console.groq.com (gratuit) |
| **Khlayel — qualité** | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` | console.anthropic.com (paiement à l'usage). Bascule sans changer le code. |
| **Mémoire long-terme** | `MEM0_API_KEY` | mem0.ai (facultatif) |
| **Emails** (reset MDP, code d'activation) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Un fournisseur SMTP (Gmail, Mailtrap en dev…) |
| **Paiement Konnect** | `KONNECT_WALLET_ID` | konnect.network (facultatif) |

Sans ces clés, l'app tourne quand même : Google login masqué, emails ignorés, Khlayel désactivé si aucune clé LLM.

---

## Structure du projet

```
edutopia/
├── frontend/               React + Vite (UI)
│   ├── src/routes/         Pages (file-based routing)
│   ├── src/components/
│   └── .env.example
├── backend/                Express + MySQL (API)
│   ├── src/controllers/
│   ├── src/routes/
│   ├── src/utils/llm.js    Adaptateur IA (Groq ⇄ Anthropic)
│   ├── database.sql        Schéma de base
│   ├── migrations/         Migrations SQL (par date)
│   └── .env.example
└── README.md
```

---

## Dépannage

- **`Cannot find module @rollup/rollup-linux-x64-gnu`** (au build) : les `node_modules` ont été installés sur un autre OS. Supprime `frontend/node_modules` et `frontend/package-lock.json`, puis relance `npm install`.
- **Erreur clé étrangère `errno 150`** sur une migration : le type de `id` ne correspond pas (`INT UNSIGNED`). Réimporte `database.sql` en premier, puis les migrations.
- **CORS bloqué** : `ALLOWED_ORIGINS` (backend) doit contenir exactement l'URL du frontend, sans slash final.
- **Khlayel ne répond pas** : vérifie `AI_PROVIDER` et la clé correspondante dans `backend/.env`.
- **Port 8080/5000 déjà pris** : change `PORT` (backend) ou le port Vite, et mets à jour `VITE_API_URL` / `ALLOWED_ORIGINS`.
