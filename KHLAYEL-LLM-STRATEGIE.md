# Khlayel — Stratégie LLM & Modèle Commercial

*Rapport de décision — juillet 2026. Objectif : choisir le(s) modèle(s), gérer la fin des tokens gratuits, et rentabiliser Khlayel via les abonnements.*

---

## 1. La question directe : « les tokens Groq gratuits sont finis, je fais quoi ? »

**Ne construis PAS ton produit sur "plusieurs comptes Groq gratuits qu'on switche".** Trois raisons :

- **C'est interdit** par les conditions d'utilisation (multi-comptes pour contourner les quotas = bannissement possible de tous les comptes).
- **Le gratuit n'est pas limité en tokens mais en débit** (tokens/minute). Tu l'as déjà vu : erreur 429 à 8 000 tokens/minute. Multiplier les comptes ne règle pas un pic de 30 élèves en même temps le soir du bac.
- **Aucune fiabilité commerciale** : le jour où tu vends un abonnement, tu ne peux pas dépendre d'une astuce fragile.

**La bonne nouvelle** : le coût réel d'un message Khlayel est minuscule (entre **0,05 et 1,2 centime de dollar**). Le vrai sujet n'est pas « payer ou pas », c'est **quel modèle pour quelle tâche**, et **comment le quota par abonnement transforme ce coût en marge**.

---

## 2. Les prix du marché (juillet 2026, par million de tokens)

| Fournisseur / Modèle | Entrée | Sortie | Qualité maths | Note |
|---|---|---|---|---|
| **Groq gpt-oss-20b** | 0,075 $ | 0,30 $ | Faible | Ton scope-gate actuel |
| **Groq gpt-oss-120b** | 0,15 $ | 0,60 $ | Moyenne | Ton modèle actuel |
| **Gemini 2.5 Flash-Lite** | 0,10 $ | 0,40 $ | Bonne | Le moins cher fiable* |
| **DeepSeek V3** | 0,14 $ | 0,28 $ | Bonne | Très bon rapport q/prix |
| **Claude Haiku 4.5** | 1,00 $ | 5,00 $ | Très bonne | Rapide, léger |
| **Claude Sonnet 5** | 2,00 $ (promo) → 3,00 $ | 10 $ → 15 $ | **Excellente** | Le meilleur en maths |

*Gemini 2.5 Flash-Lite est retiré le 16 oct. 2026 → remplacé par 3.1 Flash-Lite à 0,25 $ / 1,50 $.

**Deux leviers qui divisent la facture :**
- **Prompt caching** : ton system prompt + curriculum (~2 000 tokens identiques à chaque message) sont mis en cache → **−90 %** sur cette partie (Anthropic, DeepSeek) ou −50 % (Groq).
- **Batch API** : −50 % pour les tâches non temps-réel (ex. génération de quiz en masse la nuit).

---

## 3. Coût réel d'UN message Khlayel

Profil type d'un message : **~2 500 tokens en entrée** (system + curriculum + historique) et **~700 en sortie**.

| Modèle | Sans cache | Avec cache | Pour 1 000 messages |
|---|---|---|---|
| Gemini Flash-Lite | 0,05 ¢ | 0,04 ¢ | **~0,45 $** |
| DeepSeek V3 | 0,05 ¢ | 0,04 ¢ | ~0,45 $ |
| Groq gpt-oss-120b | 0,08 ¢ | 0,06 ¢ | ~0,70 $ |
| Claude Haiku 4.5 | 0,60 ¢ | 0,40 ¢ | ~4,50 $ |
| Claude Sonnet 5 | 1,20 ¢ | 0,84 ¢ | ~8,40 $ |

**Lecture** : même le modèle le plus cher (Sonnet) coûte **moins d'1,2 centime par message**. Un élève très actif à 600 messages/mois coûte ~5 $ en Sonnet, ~0,30 $ en Gemini.

---

## 4. La vraie stratégie : le ROUTAGE par tâche

Ne choisis pas UN modèle. **Route chaque tâche vers le modèle juste suffisant** — c'est ce qui fait 80 % de l'économie :

| Étape du pipeline | Modèle conseillé | Pourquoi |
|---|---|---|
| Scope-gate (filtre hors-sujet) | Le moins cher (Gemini Flash-Lite / gpt-oss-20b) | Simple classification |
| Résumé de cours | Modèle moyen (Haiku / Gemini Flash) | Peu de raisonnement |
| **Correction / Exercice bac** | **Sonnet** | Zéro erreur de calcul = critique |
| Vision (photo de cahier) | Sonnet ou Gemini (natif) | Qualité de lecture |
| Tuteur (questions simples) | Moyen, escalade vers Sonnet si besoin | Équilibre |

Résultat : un coût **mélangé** de ~0,3 à 0,5 centime/message au lieu de tout payer au prix Sonnet.

---

## 5. Deux plans concrets

### Plan A — « Gratuit / bootstrap » (avant les revenus)
Objectif : coût ~0 $ pendant que tu valides le produit.

1. **Google AI Studio (Gemini) — niveau gratuit** : quota journalier généreux, bonne qualité, 0 $. *Le meilleur choix pour démarrer.*
2. **DeepSeek** : 5 M tokens offerts puis quasi gratuit.
3. **Groq gratuit** (actuel) : garde-le en secours, mais limité en débit.
4. ❌ Auto-hébergement : nécessite un GPU, ingérable à ton échelle.

→ **Recommandation bootstrap** : Gemini gratuit en principal, Groq en secours automatique.

### Plan B — « Payant / croissance » (financé par les abonnements)
Objectif : meilleure qualité, fiabilité, marge.

1. ⭐ **Anthropic (Sonnet + Haiku) + routage + caching** : la meilleure qualité maths, PDF/vision natifs. ~0,4 à 0,8 ¢/msg.
2. **Gemini 2.5/3.1 Flash** : le moins cher, très correct. ~0,05 ¢/msg.
3. **DeepSeek V3** : ultra économique, qualité honnête.
4. **Groq gpt-oss-120b payant** : rapide et pas cher, mais qualité maths sous Sonnet.

→ **Recommandation croissance** : **Sonnet pour les corrections/exercices, Haiku ou Gemini pour le reste.** Un seul interrupteur `AI_PROVIDER` dans le `.env` te laisse basculer et garder Groq en secours.

---

## 6. Simulation commerciale réelle

**Hypothèses** (1 $ ≈ 3,1 TND) :

| Formule | Prix/mois | Accès Khlayel |
|---|---|---|
| **Gratuit** | 0 TND | 5 messages/jour, texte seulement |
| **Standard** | 19 TND (~6 $) | 30 msg/jour, texte + résumés |
| **Premium** | 39 TND (~12,5 $) | 100 msg/jour, **tout** (photo, PDF, correcteur Sonnet) |

**Scénario : 2 000 inscrits, 15 % payants = 300 abonnés** (200 Standard + 100 Premium).

**Revenus** : 200 × 19 + 100 × 39 = **7 700 TND/mois (~2 480 $)**

**Coûts LLM** (usage moyen réel, pas le plafond, routage + cache) :
- 400 gratuits actifs × ~3 msg/j → modèle cheap → **~18 $**
- 200 Standard × ~10 msg/j → cheap+moyen → **~180 $**
- 100 Premium × ~25 msg/j → moyen+Sonnet → **~450 $**
- **Total ≈ 650 $/mois (~2 000 TND)**

**Marge brute Khlayel : 7 700 − 2 000 = ~5 700 TND/mois (~74 %)**

→ **Le coût LLM ne représente que ~25 % des revenus.** Le facteur limitant n'est PAS le modèle, c'est ton **taux de conversion** et le **design des quotas**.

---

## 7. La règle d'or pour ne jamais perdre d'argent

Le seul cas où tu perds : un abonné Premium qui **sature 100 msg/jour en Sonnet** = ~25 $/mois de coût pour 12,5 $ de revenu.

**Trois protections (déjà en partie codées) :**
1. **Route seulement les vraies corrections vers Sonnet** — le reste en modèle cheap.
2. **Quota journalier strict** par formule (déjà en place : 5 / 100).
3. **Règle de tarification** : *prix d'une formule ≥ 2× son coût LLM maximum*, OU *quota tel que le coût max ≤ 30 % du prix*.

Applique ça et chaque abonné est rentable même dans le pire cas.

---

## 8. Plan d'action recommandé

1. **Maintenant (gratuit)** : bascule le principal sur **Gemini gratuit**, garde Groq en secours. Zéro coût, meilleure fiabilité que Groq seul.
2. **Ajoute le routage par tâche** (un seul classificateur qui choisit le modèle) + **prompt caching**.
3. **Au lancement des abonnements** : active **Anthropic Sonnet+Haiku** via l'interrupteur `.env`, avec Gemini/Groq en secours.
4. **Relie les quotas aux formules** : `ai_daily_limit` + `ai_uploads_allowed` comme colonnes de `subscription_plans` → pilotable depuis l'admin sans redéploiement.
5. **Surveille** : le dashboard admin Khlayel montre déjà les tokens/coûts ; ajoute une alerte de budget chez le fournisseur dès le 1er jour.

**Résumé en une phrase** : le modèle payant coûte des centimes, le quota par abonnement le transforme en marge de ~70 % — commence gratuit sur Gemini, passe sur Sonnet (corrections) + Haiku (reste) quand les abonnements financent la qualité.

---

*Sources : CloudZero, Anthropic, Google AI, DeepSeek pricing pages (juillet 2026). Prix susceptibles de changer — revérifier avant décision finale.*
