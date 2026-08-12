# Edutopia

Plateforme e-learning pour lycéens et collégiens tunisiens : cours (vidéos, PDF, exercices), quiz qui débloquent les chapitres, marketplace, abonnements, événements live, et **Khlayel** — un assistant IA de mathématiques qui parle français, arabe et darija.

**Stack**

| Côté | Technologies | Port |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite + TanStack Router | 8080 |
| Backend | Node.js + Express + MySQL2 | 5000 |
| IA | Groq (gratuit) ou Anthropic Claude (payant), commutable par `.env` | — |

---

## Prérequis

Installe ces outils avant de commencer :

- [Node.js 18+](https://nodejs.org) (vérifie avec `node -v`)
- [XAMPP](https://www.apachefriends.org/) ou tout autre serveur MySQL local (MySQL 8+ ou MariaDB 10.6+)
- [Git](https://git-scm.com/)
- Un éditeur de code (VS Code recommandé)

---

## Installation pas à pas

### Étape 1 — Cloner le dépôt

```bash
git clone <url-du-repo> edutopia
cd edutopia
```

### Étape 2 — Démarrer MySQL

**Avec XAMPP :**
1. Ouvre le panneau XAMPP
2. Clique **Start** sur la ligne **MySQL**
3. Vérifie que le statut passe au vert

> Si MySQL refuse de démarrer : dans XAMPP → Config → `my.ini`, vérifie que `port=3306` n'est pas déjà utilisé par un autre service.

### Étape 3 — Créer la base de données

Tu as deux options. Choisis celle que tu préfères.

**Option A — Via le terminal (recommandé) :**

```bash
# 1) Schéma complet (crée la base "edutopiav2" + toutes les tables + plans d'abonnement)
mysql -u root -p < backend/database.sql

# 2) Migrations dans l'ordre chronologique
mysql -u root -p edutopiav2 < backend/migrations/2026-05-04-bank-transfer-receipts.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-04-subscription-gate.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-05-academic-curriculum.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-05-academic-curriculum-seed.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-05-free-live-events.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-05-teacher-course-content.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-05-user-academic-track.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-06-parent-child-links.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-05-06-password-reset-flow.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-06-14-student-resource-progress.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-06-15-teacher-subject-assignments.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-06-24-activation-attempts.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-07-konnect-payment.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-09-events-is-free.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-11-khlayel-ai.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-14-ai-feedback.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-14-ai-usage.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-16-chapter-quizzes.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-16-user-phone.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-07-17-notifications.sql
mysql -u root -p edutopiav2 < backend/migrations/2026-08-10-user-code.sql

# 3) Données de test (comptes utilisateurs, produits, événement de démo)
mysql -u root -p edutopiav2 < backend/seed.sql
```

**Option B — Via phpMyAdmin :**
1. Ouvre [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
2. Clique **Nouvelle base de données** → nom : `edutopiav2` → Créer
3. Sélectionne `edutopiav2` → onglet **Importer**
4. Importe `backend/database.sql`
5. Importe chaque fichier de `backend/migrations/` **dans l'ordre alphabétique** (les noms commencent par la date)
6. Importe `backend/seed.sql`

> Les migrations utilisent `IF NOT EXISTS` et `ON DUPLICATE KEY UPDATE` : si une migration signale "column already exists", c'est sans danger, continue.

### Étape 4 — Variables d'environnement

**Backend :**

```bash
cp backend/.env.example backend/.env
```

Ouvre `backend/.env` et remplis au minimum :

```env
DB_HOST=127.0.0.1      # utilise 127.0.0.1 plutôt que localhost (évite les bugs IPv6 sur Windows)
DB_PORT=3306
DB_USER=root
DB_PASSWORD=           # vide si XAMPP sans mot de passe
DB_NAME=edutopiav2
JWT_SECRET=mets_une_chaine_aleatoire_longue_ici
AI_PROVIDER=groq
GROQ_API_KEY=gsk_...   # obtiens une clé gratuite sur console.groq.com
```

**Frontend :**

```bash
cp frontend/.env.example frontend/.env
```

Le fichier par défaut est déjà correct pour du local. Vérifie juste :

```env
VITE_API_URL=http://localhost:5000
```

### Étape 5 — Installer les dépendances

```bash
cd backend  && npm install
cd ../frontend && npm install
```

### Étape 6 — Lancer le projet

Ouvre **deux terminaux** :

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Ouvre [http://localhost:8080](http://localhost:8080) dans ton navigateur.

---

## Comptes de test (créés par seed.sql)

| Rôle | Email | Mot de passe | Accès |
|---|---|---|---|
| Admin | admin@edutopia.tn | Admin@1234 | `/admin` — gestion complète |
| Enseignant | teacher@edutopia.tn | Test@1234 | `/teacher` — cours et contenu |
| Élève | student@edutopia.tn | Test@1234 | `/dashboard` — abonnement actif |
| Parent | parent@edutopia.tn | Test@1234 | `/parent` — suivi de l'élève |
| Commercial | commercial@edutopia.tn | Test@1234 | `/commercial` — stats et commandes |

> Le parent est déjà lié à l'élève de test — le lien parent-enfant est automatiquement créé par le seed.

---

## Intégrations optionnelles

Sans ces clés, l'app tourne quand même. Chaque fonctionnalité se désactive proprement si la clé est absente.

| Fonctionnalité | Variables `.env` (backend) | Comment obtenir |
|---|---|---|
| **Connexion Google** | `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID` (frontend) | [Google Cloud Console](https://console.cloud.google.com) → Identifiants → OAuth 2.0 → type Web. Origine autorisée : `http://localhost:8080` |
| **Khlayel — Groq (gratuit)** | `AI_PROVIDER=groq`, `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — gratuit, pas de CB |
| **Khlayel — Anthropic (qualité)** | `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) — pay-as-you-go |
| **Mémoire long-terme IA** | `MEM0_API_KEY` | [mem0.ai](https://mem0.ai) — facultatif |
| **Emails** (reset MDP, codes activation) | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Gmail, ou [Mailtrap](https://mailtrap.io) en dev |
| **Paiement Konnect** | `KONNECT_WALLET_ID` | [konnect.network](https://konnect.network) — pour les abonnements en ligne |

---

## Structure du projet

```
edutopia/
├── frontend/
│   ├── src/
│   │   ├── routes/          Pages — file-based routing (TanStack Router)
│   │   │   ├── index.tsx        Page d'accueil
│   │   │   ├── dashboard.tsx    Espace élève
│   │   │   ├── teacher.tsx      Espace enseignant
│   │   │   ├── admin.$module.tsx  Backoffice admin
│   │   │   ├── commercial.$module.tsx  Espace commercial
│   │   │   ├── khlayel.tsx      Assistant IA Khlayel
│   │   │   └── ...
│   │   ├── components/      Composants réutilisables
│   │   ├── lib/             Utilitaires, types, i18n, hooks
│   │   └── styles.css       Thème Tailwind + variables CSS
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── controllers/     Logique métier (auth, cours, IA, market…)
│   │   ├── routes/          Définition des routes Express
│   │   ├── config/db.js     Pool de connexions MySQL2
│   │   ├── utils/llm.js     Adaptateur IA (Groq ↔ Anthropic)
│   │   └── middlewares/     Auth JWT, upload fichiers…
│   ├── database.sql         Schéma complet (tables + plans d'abonnement)
│   ├── migrations/          Modifications de schéma (par date)
│   ├── seed.sql             Données de test pour démarrer en local
│   └── .env.example
│
└── README.md
```

---

## Dépannage fréquent

**`Cannot find module '../db'` au démarrage backend**
→ Le chemin correct est `../config/db`. Déjà corrigé — si tu vois cette erreur, fais `git pull`.

**MySQL `connect ETIMEDOUT` sous Windows**
→ Change `DB_HOST=localhost` en `DB_HOST=127.0.0.1` dans `backend/.env`. C'est un bug IPv6 de Windows avec MySQL.

**MySQL ne démarre pas dans XAMPP ("MySQL shutdown unexpectedly")**
→ Va dans `C:\xampp\mysql\data\` et renomme `ib_logfile0` et `ib_logfile1` en `.bak`. Relance MySQL. Si le problème persiste, consulte le fichier `<hostname>.err` dans ce dossier.

**`Cannot find module @rollup/rollup-linux-x64-gnu`**
→ Les `node_modules` du frontend ont été installés sur un autre OS. Supprime `frontend/node_modules` et `frontend/package-lock.json`, puis relance `npm install`.

**Erreur clé étrangère `errno 150` sur une migration**
→ Le type d'`id` ne correspond pas. Assure-toi d'importer `database.sql` **en premier**, avant toutes les migrations.

**CORS bloqué en console navigateur**
→ `ALLOWED_ORIGINS` dans `backend/.env` doit contenir exactement l'URL du frontend, sans slash final. Ex : `http://localhost:8080`.

**Khlayel ne répond pas / erreur 500 sur `/api/ai/math-chat`**
→ Vérifie que `AI_PROVIDER` est défini et que la clé correspondante (`GROQ_API_KEY` ou `ANTHROPIC_API_KEY`) est renseignée dans `backend/.env`.

**Port 8080 ou 5000 déjà utilisé**
→ Change `PORT` dans `backend/.env` et mets à jour `VITE_API_URL` + `ALLOWED_ORIGINS` en conséquence.

---

## Liens utiles

- [Groq Console](https://console.groq.com) — clé API gratuite pour Khlayel
- [Google Cloud Console](https://console.cloud.google.com) — OAuth Google
- [phpMyAdmin local](http://localhost/phpmyadmin) — interface base de données
- [TanStack Router docs](https://tanstack.com/router) — routing frontend
- [Edutopia sur Facebook](https://www.facebook.com/profile.php?id=61551853753304)
- [Edutopia sur Instagram](https://www.instagram.com/edutopia.tn)
- [Edutopia sur YouTube](https://www.youtube.com/@edutopiatn)
