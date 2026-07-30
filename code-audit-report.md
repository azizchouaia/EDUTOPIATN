# Edutopia — Audit code (securite, erreurs, complexite)

Date : 24 juin 2026

Perimetre : backend Express (`controllers/`, `routes/`, `middleware/`) et echantillon frontend (market, subscriptions). Priorite donnee a la securite, puis aux bugs qui coutent de l'argent (race conditions), puis a la correction generale, puis a la complexite/optimisation.

## 1. Securite (priorite 1)

**Pas d'injection SQL.** Toutes les requetes utilisent des `?` parametres. Le pattern "UPDATE dynamique" (`marketController.js`, `subscriptionController.js`, `courseController.js`, `userController.js`) construit les noms de colonnes a partir de tableaux whitelists codes en dur — seules les valeurs viennent du client, toujours parametrees. Aucune faille trouvee ici.

**IDOR / autorisation : globalement solide.** Verifie sur orders (`marketController.getMyOrders` filtre par `user_id`), subscriptions (`uploadReceipt`, `cancelPending` filtrent par `user_id`), enfants-parents (`parentController.loadLinkedChild` filtre par `parent_id` ET `is_active`), reclamations (`getAll` filtre par `user_id` sauf admin), cours (`loadOwnedCourse`/`loadOwnedCourseChapter`/`loadOwnedCourseResource` verifient `teacher_id === req.user.id`), et assignations enseignant (`loadTeacherSubjectIds` limite chaque action a la matiere assignee). Pas de faille IDOR critique trouvee.

**Faille reelle : code d'activation d'abonnement sans limite de tentatives.** `subscriptionController.activateCode` (`backend/src/controllers/subscriptionController.js:325-367`) compare un hash mais n'a aucun compteur d'essais ni verrouillage, et la route `/api/subscriptions/activate-code` (`routes/subscriptions.js:77-81`) n'a pas de rate-limit. Le code est court (6 caracteres hexadecimaux, ~16M combinaisons) avec une fenetre de validite de 30 minutes — sans throttling, un script peut tenter de le deviner en boucle. A corriger en ajoutant un compteur d'essais par abonnement (ex: bloquer apres 5 essais) et un rate-limit IP/utilisateur sur cette route en particulier.

**Manque global : pas de `helmet`, pas de `express-rate-limit`, `cors()` sans options (ouvert a tous les domaines).** Deja signale dans l'audit precedent, toujours non implemente. Prioritaire pour la prod — sans rate-limit, `/api/auth/login` et `/api/subscriptions/activate-code` sont les deux endpoints les plus exposes au brute force.

**Mineur : `markResourceComplete`** (`courseController.js:1346-1362`) ne verifie pas que l'etudiant est inscrit au cours proprietaire de la ressource avant de marquer une progression — seulement que la ressource existe et est publiee. Un etudiant peut donc marquer comme "complete" une ressource d'un cours auquel il n'est pas inscrit. Pas une fuite de donnees, juste une incoherence de progression a corriger si les statistiques de progression sont utilisees pour autre chose qu'un affichage.

## 2. Race conditions — risque financier direct (priorite 2)

C'est le point le plus important pour "ce qui peut couter de l'argent". Deux endroits dans `marketController.createOrder` (`backend/src/controllers/marketController.js:82-216`) ont un probleme classique de TOCTOU (time-of-check-time-of-use) :

**Survente de stock.** Le stock est lu une fois avant la transaction (`productMap`, ligne 132-136), verifie (`product.stock < item.quantity`, ligne 143), puis decremente sans condition dans la transaction (`UPDATE products SET stock = stock - ? WHERE id = ?`, ligne 191-194). Deux commandes simultanees sur le dernier exemplaire d'un produit peuvent toutes les deux passer la verification et toutes les deux decrementer — le stock devient negatif et les deux clients pensent avoir achete un produit qui n'existe plus.
Correction : ajouter `AND stock >= ?` a la clause `WHERE` du `UPDATE`, lire `result.affectedRows`, et si `0`, annuler la transaction (`rollback`) avec un message "stock insuffisant".

**Abus de code promo.** Meme schema : `used_count < max_uses` est verifie avant la transaction (ligne 113-119), puis `used_count` est incremente sans condition (ligne 198). Deux commandes simultanees avec un code promo a usage unique (`max_uses = 1`) peuvent toutes les deux passer la verification et toutes les deux beneficier de la reduction.
Correction : `UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)`, puis verifier `affectedRows` avant de commit.

Ces deux corrections sont courtes (quelques lignes chacune) et eliminent un risque de perte d'argent reel en cas de pic de trafic ou de rafraichissement double-clic.

## 3. Erreurs / correction (priorite 3)

- `backend/src/app.js` : pas de wrapper async-error. Une exception non interceptee dans un controleur `async` (ex: erreur DB transitoire) saute le middleware d'erreur global et peut faire planter le process Node. Solution simple : `express-async-errors` ou un wrapper `asyncHandler` autour de chaque route.
- `backend/src/config/db.js` : le pool MySQL n'a pas de handler `pool.on('error', ...)`. Une coupure reseau avec la base peut faire crasher le process plutot que d'etre loguee et retentee.
- Aucune validation `items.length > 0` necessaire dans `createOrder` — c'est deja couvert par le validateur de route (`body('items').isArray({ min: 1 })`), donc pas un bug reel malgre l'apparence du code controleur seul.

## 4. Complexite / optimisation (priorite 4)

Le codebase est globalement propre : pas de boucle N+1 dans les listes principales. `getMyOrders`/`getAllOrders` (market) et `getTeacherOutline`/`getCourseContent` (courses) suivent le bon pattern — une requete pour les entites parentes, une seconde avec `WHERE id IN (?)` pour les enfants, regroupees en memoire. C'est efficace.

Points mineurs, non urgents :
- `courseController.teacherGetMySubject` (ligne 1150) fait une requete par assignation dans un `Promise.all` plutot qu'une seule requete jointe — sans consequence aujourd'hui car un enseignant n'a qu'une seule assignation (contrainte `UNIQUE` sur `teacher_id`), mais a revoir si cette contrainte est levee un jour.
- Beaucoup de duplication du pattern "construire UPDATE dynamique depuis une whitelist" (repete ~10 fois dans 4 controleurs). Pas un bug, mais une fonction utilitaire partagee (`buildUpdate(table, allowedFields, body, id)`) reduirait le risque d'erreur de copier-coller et la taille du code.

## 5. Frontend (echantillon market.tsx)

Les mutations (`orderMutation`, `promoMutation`) gerent bien les erreurs via `onError` + toast. En revanche les `useQuery` (produits, commandes) n'ont pas de gestion `isError` — si l'API est indisponible, la page affiche silencieusement une liste vide plutot qu'un message d'erreur explicite. Mineur, a corriger si du temps reste apres les points 1 et 2.

## Resume des actions prioritaires

1. Ajouter une limite de tentatives sur `/api/subscriptions/activate-code` (securite).
2. Corriger les deux race conditions de `createOrder` (stock + promo) avec des `WHERE` conditionnels et verification de `affectedRows` (argent).
3. Installer `helmet` + `express-rate-limit` globalement, en particulier sur `/auth/login` et `/subscriptions/activate-code`.
4. Ajouter un handler d'erreur sur le pool MySQL et un wrapper async pour les routes.
5. (Optionnel, plus tard) factoriser le pattern UPDATE dynamique, ajouter `isError` aux queries frontend.
