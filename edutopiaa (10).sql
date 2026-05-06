-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 15 août 2025 à 05:11
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `edutopiaa`
--

-- --------------------------------------------------------

--
-- Structure de la table `abonnements`
--

CREATE TABLE `abonnements` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `titleArabic` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `period` varchar(100) NOT NULL,
  `periodArabic` varchar(100) NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`features`)),
  `featuresArabic` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`featuresArabic`)),
  `isPopular` tinyint(1) DEFAULT 0,
  `isRecommended` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `abonnements`
--

INSERT INTO `abonnements` (`id`, `title`, `titleArabic`, `price`, `period`, `periodArabic`, `features`, `featuresArabic`, `isPopular`, `isRecommended`, `created_at`, `updated_at`) VALUES
(1, 'Test Abonnement', 'تست أبنمنت', 100.00, '3 mois', '3 شهور', '[]', '[]', 0, 1, '2025-08-02 19:20:12', '2025-08-13 22:51:04'),
(3, 'GUEIHQDB', 'هههة', 777.00, 'HSQX', 'هههة', '[\"UHHH\"]', '[\"هههة\"]', 1, 0, '2025-08-02 19:23:21', '2025-08-02 19:23:21'),
(4, 'HHH', 'أمين', 91.15, 'an', 'شهر', '[\"JQHSXQIJ\"]', '[\"أمين\"]', 1, 0, '2025-08-02 19:31:19', '2025-08-02 19:33:58');

-- --------------------------------------------------------

--
-- Structure de la table `categorie_produit`
--

CREATE TABLE `categorie_produit` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `categorie_produit`
--

INSERT INTO `categorie_produit` (`id`, `nom`, `description`, `date_creation`) VALUES
(3, 'Livre', 'Livres éducatifs et manuels scolaires', '2025-08-03 01:55:16'),
(4, 'Accessoires', 'Fournitures et accessoires éducatifs', '2025-08-03 01:55:16'),
(5, 'Pack', 'Packs et collections éducatives', '2025-08-03 01:55:16');

-- --------------------------------------------------------

--
-- Structure de la table `chapitre`
--

CREATE TABLE `chapitre` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text NOT NULL DEFAULT '',
  `numero_chapitre` int(11) NOT NULL,
  `statut` varchar(50) NOT NULL DEFAULT 'actif',
  `createur_id` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `matiere_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `chapitre`
--

INSERT INTO `chapitre` (`id`, `titre`, `description`, `numero_chapitre`, `statut`, `createur_id`, `created_at`, `updated_at`, `matiere_id`) VALUES
(15, 'graphe', '.....', 4, 'actif', 4, '2025-07-30 16:53:58', '2025-08-08 00:25:52', 1),
(16, 'proba', '...', 4, 'actif', 4, '2025-07-30 16:53:58', '2025-08-08 00:26:08', 1),
(38, 'stats', '....', 1, 'actif', 4, '2025-08-04 03:21:22', '2025-08-08 00:25:15', 1),
(39, 'test d\'hypothese', '.\r\n', 2, 'actif', 4, '2025-08-04 03:57:12', '2025-08-08 00:29:47', 1),
(40, 'matrice', '.', 1, 'actif', 4, '2025-08-07 02:11:04', '2025-08-08 19:05:30', 1),
(43, 'complexe', '!\r\n', 1, 'actif', 4, '2025-08-07 03:36:29', '2025-08-10 12:25:24', 1),
(45, 'loi de maille', '.', 2, 'actif', 4, '2025-08-08 18:59:02', '2025-08-08 18:59:02', 3),
(46, 'liberté ', '.', 1, 'actif', 4, '2025-08-08 19:01:54', '2025-08-08 19:01:54', 8),
(47, 'espagnol', '.', 1, 'actif', 4, '2025-08-08 22:18:41', '2025-08-08 22:18:41', 14),
(48, 'dev rurable', '.', 1, 'actif', 4, '2025-08-09 19:08:03', '2025-08-09 19:08:03', 12),
(49, 'technique', ';', 1, 'actif', 4, '2025-08-09 19:10:21', '2025-08-09 19:10:21', 7);

-- --------------------------------------------------------

--
-- Structure de la table `course`
--

CREATE TABLE `course` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `niveau` varchar(255) NOT NULL,
  `section` enum('Mathématiques','Sciences expérimentales','Économie et gestion','Sciences techniques','Lettres','Sport','Sciences de l''informatique') DEFAULT NULL,
  `statut` varchar(50) NOT NULL DEFAULT 'actif',
  `createur_id` int(11) NOT NULL DEFAULT 1,
  `chapitre_id` int(11) DEFAULT NULL,
  `fichier_pdf` varchar(255) DEFAULT NULL,
  `fichier_video` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `course`
--

INSERT INTO `course` (`id`, `titre`, `niveau`, `section`, `statut`, `createur_id`, `chapitre_id`, `fichier_pdf`, `fichier_video`) VALUES
(50, 'complexe', 'baccalaureat', 'Sciences expérimentales', 'actif', 1, 43, '/uploads/courses/course-1754590271637-513723520.pdf', '/uploads/courses/course-1754590271638-825572779.mp4'),
(51, 'statistiques', 'baccalaureat', 'Mathématiques', 'actif', 1, 38, '/uploads/courses/course-1754590346106-419853119.pdf', '/uploads/courses/course-1754590346119-889787121.mp4'),
(52, 'introduction', 'Baccalauréat', 'Sciences expérimentales', 'actif', 1, 40, '/uploads/courses/course-1754591022493-769956611.PDF', '/uploads/courses/course-1754591022502-950346232.mp4'),
(54, 'loi de maille', 'Baccalaureat', 'Mathématiques', 'actif', 1, 45, '/uploads/courses/course-1754679782244-248250787.pdf', NULL),
(55, 'liberté ', 'Baccalauréat', 'Économie et gestion', 'actif', 1, 46, '/uploads/courses/course-1754680376010-121678585.pdf', NULL),
(56, 'espagnol', 'Baccalauréat', 'Sciences expérimentales', 'actif', 1, 47, '/uploads/courses/course-1754691543818-917928466.PDF', NULL),
(59, 'dev rurable', 'baccalaureat', 'Économie et gestion', 'actif', 1, 48, '/uploads/courses/course-1754766514767-137559663.PDF', NULL),
(60, 'shémas technique', 'baccalaureat', 'Sciences techniques', 'actif', 1, 49, '/uploads/courses/course-1754766667185-260809868.pdf', NULL),
(65, 'cours eco', 'baccalaureat', 'Économie et gestion', 'actif', 1, 48, '/uploads/courses/course-1754875390775-111657918.pdf', NULL),
(70, 'cours maths', 'baccalaureat', 'Mathématiques', 'actif', 1, 43, '/uploads/courses/course-1754875931074-521229334.pdf', NULL),
(73, 'cours m', 'baccalaureat', 'Mathématiques', 'actif', 1, 40, '/uploads/courses/course-1754876366414-527920720.pdf', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `event`
--

CREATE TABLE `event` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `date` datetime NOT NULL,
  `lieu` varchar(255) NOT NULL,
  `type` varchar(100) NOT NULL,
  `nbrplace` int(11) NOT NULL,
  `image` varchar(500) NOT NULL,
  `typedepaiement` varchar(100) NOT NULL,
  `montant` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `event`
--

INSERT INTO `event` (`id`, `nom`, `description`, `date`, `lieu`, `type`, `nbrplace`, `image`, `typedepaiement`, `montant`) VALUES
(2, 'HXHXH', 'HXBSWBX', '2025-08-02 18:52:00', 'shhw', 'Correction bac', 13, '/uploads/user-1755051410705-463627502.png', 'payant', 51),
(5, 'kenzaaa', 'cd backend\r\nnode app.jscd backend\r\nnode app.js', '2025-08-15 19:27:00', 'cd backend node app.js', 'Exercice', 6, '/uploads/user-1754508476580-651532663.jpg', 'gratuit', 0);

-- --------------------------------------------------------

--
-- Structure de la table `favorite`
--

CREATE TABLE `favorite` (
  `user_id` int(11) NOT NULL,
  `course_id` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `favorite`
--

INSERT INTO `favorite` (`user_id`, `course_id`, `created_at`) VALUES
(12, 51, '2025-08-13 17:32:12'),
(12, 70, '2025-08-13 20:45:07'),
(12, 73, '2025-08-13 17:31:57');

-- --------------------------------------------------------

--
-- Structure de la table `inscription_abonnement`
--

CREATE TABLE `inscription_abonnement` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `abonnement_id` int(11) NOT NULL,
  `type_paiement` enum('especes','virement') NOT NULL,
  `statut` enum('en_attente','valide','rejete') DEFAULT 'en_attente',
  `nom_complet` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `adresse` text DEFAULT NULL,
  `montant` decimal(10,2) NOT NULL,
  `date_inscription` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_validation` timestamp NULL DEFAULT NULL,
  `date_expiration` datetime DEFAULT NULL,
  `commentaire` text DEFAULT NULL,
  `extrait_bancaire` varchar(255) DEFAULT NULL COMMENT 'Chemin vers l''image de l''extrait bancaire pour les virements',
  `cle_validee` tinyint(1) DEFAULT 0,
  `date_validation_cle` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `inscription_abonnement`
--

INSERT INTO `inscription_abonnement` (`id`, `user_id`, `abonnement_id`, `type_paiement`, `statut`, `nom_complet`, `email`, `telephone`, `adresse`, `montant`, `date_inscription`, `date_validation`, `date_expiration`, `commentaire`, `extrait_bancaire`, `cle_validee`, `date_validation_cle`) VALUES
(36, 12, 1, 'virement', 'valide', 'chouaia aziz', 'Chouaia.mohamedaziz@esprit.tn', '+21653822532', 'ariana hedi nouira\nghazela', 100.00, '2025-08-14 00:30:18', '2025-08-15 00:23:40', '2025-11-15 02:23:40', 'Clé d\'accès générée: 4C4HYBR8', '/uploads/user-1755131567146-771399471.png', 1, '2025-08-15 01:26:45');

-- --------------------------------------------------------

--
-- Structure de la table `inscription_event`
--

CREATE TABLE `inscription_event` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `date_inscription` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `matiere`
--

CREATE TABLE `matiere` (
  `id` int(11) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `actif` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `matiere`
--

INSERT INTO `matiere` (`id`, `nom`, `actif`) VALUES
(1, 'Mathématiques', 1),
(3, 'physique', 0),
(4, 'science', 0),
(7, 'technique', 1),
(8, 'francais', 0),
(9, 'philosophie', 0),
(10, 'anglais', 0),
(11, 'arabe', 0),
(12, 'economie', 0),
(13, 'Gestion', 0),
(14, 'espagnol', 0);

-- --------------------------------------------------------

--
-- Structure de la table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `panier_id` int(11) DEFAULT NULL,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `adresse` text NOT NULL,
  `complement` text DEFAULT NULL,
  `code_postal` varchar(10) NOT NULL,
  `ville` varchar(100) NOT NULL,
  `pays` varchar(50) DEFAULT 'France',
  `instructions_livraison` text DEFAULT NULL,
  `methode_paiement` enum('carte','paypal','sur_place') DEFAULT 'sur_place',
  `sous_total` decimal(10,2) NOT NULL,
  `frais_livraison` decimal(10,2) DEFAULT 0.00,
  `reduction` decimal(10,2) DEFAULT 0.00,
  `total_final` decimal(10,2) NOT NULL,
  `promo_code_used` varchar(50) DEFAULT NULL,
  `statut` enum('en_attente','confirmee','en_preparation','expediee','livree','annulee') DEFAULT 'en_attente',
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `panier_id`, `nom`, `prenom`, `email`, `telephone`, `adresse`, `complement`, `code_postal`, `ville`, `pays`, `instructions_livraison`, `methode_paiement`, `sous_total`, `frais_livraison`, `reduction`, `total_final`, `promo_code_used`, `statut`, `date_creation`, `date_modification`) VALUES
(30, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'ghazela', '4009', 'Tunis', 'Tunisie', 'hjehzjehziueziuezhezieuz', 'sur_place', 224.00, 0.00, 0.00, 224.00, NULL, 'expediee', '2025-08-11 16:52:44', '2025-08-11 20:09:10'),
(31, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'ghazela', '4009', 'Ariana', 'Tunisie', 'hzehdzhhzdhzehzhezhzdhzdhzzhzhdzdhzdhehzehz', 'sur_place', 1511.69, 0.00, 167.97, 1343.72, NULL, 'en_attente', '2025-08-11 17:20:23', '2025-08-11 20:07:48'),
(32, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'gvtgvtgvtgtvttftftfftvtrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr', '4009', 'Tunis', 'Tunisie', 'xeceefrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr', 'sur_place', 81.00, 0.00, 9.00, 72.00, NULL, 'en_attente', '2025-08-11 20:52:37', '2025-08-11 20:52:37'),
(33, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'arianaaaaaa', 'aaaaaaaaaa', '1000', 'Tunis', 'Tunisie', 'DZD', 'sur_place', 29.99, 5.99, 0.00, 35.98, NULL, 'en_attente', '2025-08-12 19:11:17', '2025-08-12 19:11:17'),
(34, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'aa', '1000', 'Tunis', 'Tunisie', 'ariana , appartement numero 8 ', 'sur_place', 65.68, 0.00, 7.30, 58.38, NULL, 'en_attente', '2025-08-12 19:24:35', '2025-08-12 19:24:35'),
(35, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'ghazela', '1000', 'Nabeul', 'Tunisie', 'GGGGGGGGGG', 'sur_place', 29.99, 5.99, 0.00, 35.98, NULL, 'en_attente', '2025-08-13 23:16:03', '2025-08-13 23:16:03'),
(36, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'ghazela', '1000', 'Gafsa', 'Tunisie', 'BBBBBBBBBB', 'sur_place', 30.00, 5.99, 0.00, 35.99, NULL, 'en_attente', '2025-08-13 23:18:35', '2025-08-13 23:18:35'),
(37, 12, 5, 'BALI', 'Mohamed Amin', 'amin.bali@esprit.tn', '53822532', 'ariana hedi nouira', 'ghazela', '1000', 'Tunis', 'Tunisie', 'HHHHH', 'sur_place', 59.99, 0.00, 0.00, 59.99, NULL, 'en_attente', '2025-08-14 00:27:56', '2025-08-14 00:27:56');

-- --------------------------------------------------------

--
-- Structure de la table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `produit_nom` varchar(255) NOT NULL,
  `quantite` int(11) NOT NULL,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `produit_id`, `produit_nom`, `quantite`, `prix_unitaire`, `total`, `date_creation`) VALUES
(8, 30, 5, 'Histoire-Géo Terminale', 8, 28.00, 224.00, '2025-08-11 16:52:45'),
(12, 32, 14, 'AA WINEK', 3, 30.00, 90.00, '2025-08-11 20:52:37'),
(13, 33, 3, 'Manuel de Mathématiques 2nde', 1, 29.99, 29.99, '2025-08-12 19:11:17'),
(14, 34, 14, 'AA WINEK', 1, 30.00, 30.00, '2025-08-12 19:24:36'),
(15, 34, 3, 'Manuel de Mathématiques 2nde', 1, 29.99, 29.99, '2025-08-12 19:24:36'),
(16, 34, 6, 'Kit Géométrie Complet', 1, 12.99, 12.99, '2025-08-12 19:24:36'),
(17, 35, 3, 'Manuel de Mathématiques 2nde', 1, 29.99, 29.99, '2025-08-13 23:16:03'),
(18, 36, 14, 'AA WINEK', 1, 30.00, 30.00, '2025-08-13 23:18:35'),
(19, 37, 3, 'Manuel de Mathématiques 2nde', 1, 29.99, 29.99, '2025-08-14 00:27:56'),
(20, 37, 14, 'AA WINEK', 1, 30.00, 30.00, '2025-08-14 00:27:56');

-- --------------------------------------------------------

--
-- Structure de la table `paiement_especes`
--

CREATE TABLE `paiement_especes` (
  `id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `nom_complet` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `telephone` varchar(20) NOT NULL,
  `adresse` text NOT NULL,
  `ville` varchar(100) NOT NULL,
  `code_postal` varchar(10) NOT NULL,
  `pays` varchar(100) DEFAULT 'France',
  `date_naissance` date DEFAULT NULL,
  `numero_cni` varchar(50) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `paiement_virement`
--

CREATE TABLE `paiement_virement` (
  `id` int(11) NOT NULL,
  `commande_id` int(11) NOT NULL,
  `reference_virement` varchar(255) NOT NULL,
  `montant` decimal(10,2) NOT NULL,
  `date_virement` date NOT NULL,
  `banque_emetteur` varchar(100) DEFAULT NULL,
  `nom_emetteur` varchar(255) NOT NULL,
  `statut` enum('en_attente','confirmee','rejetee') DEFAULT 'en_attente',
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_confirmation` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `panier`
--

CREATE TABLE `panier` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `session_id` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `panier`
--

INSERT INTO `panier` (`id`, `user_id`, `session_id`, `date_creation`, `date_modification`) VALUES
(5, 12, NULL, '2025-08-07 16:49:07', '2025-08-07 16:49:07'),
(6, 4, NULL, '2025-08-07 18:27:58', '2025-08-07 18:27:58'),
(7, 19, NULL, '2025-08-09 15:09:01', '2025-08-09 15:09:01'),
(8, 21, NULL, '2025-08-09 21:09:31', '2025-08-09 21:09:31'),
(9, 26, NULL, '2025-08-11 21:37:18', '2025-08-11 21:37:18'),
(10, 37, NULL, '2025-08-13 02:21:42', '2025-08-13 02:21:42');

-- --------------------------------------------------------

--
-- Structure de la table `panier_item`
--

CREATE TABLE `panier_item` (
  `id` int(11) NOT NULL,
  `panier_id` int(11) NOT NULL,
  `produit_id` int(11) NOT NULL,
  `quantite` int(11) NOT NULL DEFAULT 1,
  `prix_unitaire` decimal(10,2) NOT NULL,
  `date_ajout` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `panier_item`
--

INSERT INTO `panier_item` (`id`, `panier_id`, `produit_id`, `quantite`, `prix_unitaire`, `date_ajout`) VALUES
(42, 7, 12, 1, 24.00, '2025-08-09 15:09:06'),
(43, 7, 3, 1, 29.99, '2025-08-09 15:09:08'),
(44, 7, 5, 1, 28.00, '2025-08-09 15:09:09'),
(45, 8, 12, 1, 24.00, '2025-08-09 21:09:38'),
(46, 8, 3, 1, 29.99, '2025-08-09 21:09:39');

-- --------------------------------------------------------

--
-- Structure de la table `produit`
--

CREATE TABLE `produit` (
  `id` int(11) NOT NULL,
  `nom` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `prix` decimal(10,2) NOT NULL,
  `stock` int(11) DEFAULT 0,
  `image_url` varchar(255) DEFAULT NULL,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `categorie_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `produit`
--

INSERT INTO `produit` (`id`, `nom`, `description`, `prix`, `stock`, `image_url`, `date_creation`, `categorie_id`) VALUES
(3, 'Manuel de Mathématiques 2nde', 'Manuel complet de mathématiques pour la classe de seconde avec exercices et corrigés', 29.99, 0, '/uploads/user-1754960486800-113266780.jpg', '2025-08-03 01:55:16', 3),
(4, 'Physique-Chimie 2ère', 'Cours de physique et chimie pour la première année avec expériences pratiques', 32.50, 0, '/uploads/books/physique-1ere.jpg', '2025-08-03 01:55:16', 3),
(5, 'Histoire-Géo Terminale', 'Manuel d\'histoire et géographie pour la terminale avec cartes et documents', 28.00, 32, '/uploads/books/histoire-term.jpg', '2025-08-03 01:55:16', 3),
(6, 'Kit Géométrie Complet', 'Kit complet de géométrie avec compas, équerre, rapporteur et règle', 12.99, 99, '/uploads/accessories/kit-geometrie.jpg', '2025-08-03 01:55:16', 4),
(8, 'Cahiers Premium x5', 'Pack de 5 cahiers premium avec papier de qualité et couverture rigide', 8.50, 200, '/uploads/accessories/cahiers-premium.jpg', '2025-08-03 01:55:16', 4),
(9, 'Pack Révisions BAC', 'Pack complet de révision pour le baccalauréat avec tous les sujets', 24.99, 30, '/uploads/packs/pack-bac.jpg', '2025-08-03 01:55:16', 5),
(10, 'Collection Sciences Complète', 'Collection complète de sciences : physique, chimie, SVT et mathématiques', 19.99, 45, '/uploads/packs/collection-sciences.jpg', '2025-08-03 01:55:16', 5),
(11, 'Pack Rentrée Étudiant', 'Pack complet pour la rentrée : fournitures, manuels et accessoires', 89.99, 20, '/uploads/packs/pack-rentree.jpg', '2025-08-03 01:55:16', 5),
(14, 'AA WINEK', 'SSSS', 30.00, 24, '', '2025-08-11 16:52:28', 3);

-- --------------------------------------------------------

--
-- Structure de la table `promo_codes`
--

CREATE TABLE `promo_codes` (
  `id` int(11) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `discount_type` enum('percentage','fixed') NOT NULL,
  `discount_value` decimal(10,2) NOT NULL,
  `active` tinyint(1) DEFAULT 1,
  `one_time_use` tinyint(1) DEFAULT 1,
  `usage_limit` int(11) DEFAULT NULL,
  `usage_count` int(11) DEFAULT 0,
  `expiry_date` datetime DEFAULT NULL,
  `min_order_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `promo_codes`
--

INSERT INTO `promo_codes` (`id`, `code`, `description`, `discount_type`, `discount_value`, `active`, `one_time_use`, `usage_limit`, `usage_count`, `expiry_date`, `min_order_amount`, `created_at`, `updated_at`) VALUES
(1, 'WELCOME10', 'Code de bienvenue - 10% de réduction', 'percentage', 10.00, 1, 0, 100, 0, NULL, 20.00, '2025-08-07 15:53:09', '2025-08-12 23:10:05'),
(2, 'STUDENT20', 'Réduction étudiant - 20% de réduction', 'percentage', 20.00, 1, 1, 50, 0, NULL, 25.00, '2025-08-07 15:53:09', '2025-08-07 15:53:09');

-- --------------------------------------------------------

--
-- Structure de la table `promo_code_usage`
--

CREATE TABLE `promo_code_usage` (
  `id` int(11) NOT NULL,
  `promo_code_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `used_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `promo_code_usage`
--

INSERT INTO `promo_code_usage` (`id`, `promo_code_id`, `user_id`, `used_at`) VALUES
(1, 1, 4, '2025-08-07 16:51:21');

-- --------------------------------------------------------

--
-- Structure de la table `reclamations`
--

CREATE TABLE `reclamations` (
  `id` int(11) NOT NULL,
  `nom` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `sujet` varchar(255) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `statut` enum('en attente','en cours','resolue','fermee','traitée','rejetée') DEFAULT 'en attente',
  `date_creation` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `reclamations`
--

INSERT INTO `reclamations` (`id`, `nom`, `prenom`, `email`, `sujet`, `message`, `statut`, `date_creation`) VALUES
(19, 'chouaia', 'aziz', 'chouaia.mohamedaziz@esprit.tn', 'l\'abonnement ne marche pas', 'l\'abonnement ne marche pas , lorsque je  clique pour payer , il beug', 'resolue', '2025-08-13 02:42:29');

-- --------------------------------------------------------

--
-- Structure de la table `serie_corrections`
--

CREATE TABLE `serie_corrections` (
  `id` int(11) NOT NULL,
  `titre` varchar(255) NOT NULL,
  `serie_pdf` varchar(500) DEFAULT NULL,
  `correction_pdf` varchar(500) DEFAULT NULL,
  `correction_video` varchar(500) DEFAULT NULL,
  `course_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `serie_corrections`
--

INSERT INTO `serie_corrections` (`id`, `titre`, `serie_pdf`, `correction_pdf`, `correction_video`, `course_id`, `created_at`, `updated_at`) VALUES
(9, 'serie statistiques', '/uploads/serie-corrections/serie-correction-1755205392179-577088259.pdf', '/uploads/serie-corrections/serie-correction-1755205392180-339935860.pdf', '/uploads/serie-corrections/serie-correction-1755203695576-241073681.mp4', 51, '2025-08-14 20:08:46', '2025-08-14 21:03:12'),
(12, 'serie_maths', '/uploads/serie-corrections/serie-correction-1755205310776-830085257.pdf', '/uploads/serie-corrections/serie-correction-1755205310785-413557695.pdf', NULL, 73, '2025-08-14 21:01:50', '2025-08-14 21:01:50'),
(13, 'yyyyyyy', '/uploads/serie-corrections/serie-correction-1755207027513-627039598.pdf', '/uploads/serie-corrections/serie-correction-1755207027564-652998723.pdf', NULL, 70, '2025-08-14 21:30:27', '2025-08-14 21:30:27');

-- --------------------------------------------------------

--
-- Structure de la table `team`
--

CREATE TABLE `team` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL,
  `speciality` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `skills` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`skills`)),
  `email` varchar(255) DEFAULT NULL,
  `github_url` varchar(255) DEFAULT NULL,
  `linkedin_url` varchar(255) DEFAULT NULL,
  `order_position` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `team`
--

INSERT INTO `team` (`id`, `name`, `role`, `speciality`, `description`, `image`, `skills`, `email`, `github_url`, `linkedin_url`, `order_position`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 'Amenallah Omar FERCHICHI', 'Developer', 'Data Scientist', '', '/uploads/user-1754516370753-694541846.jpeg', '[]', 'amenallahomar.ferchichi@esprit.tn', '', '', 2, 1, '2025-08-06 21:09:02', '2025-08-06 21:39:30'),
(7, 'Hajer AYADI', 'Developer', 'AI Engineer', '', '/uploads/user-1754516473980-455695248.jpeg', '[]', 'hajer.ayadi@esprit.tn', '', '', 3, 1, '2025-08-06 21:10:07', '2025-08-06 21:41:13'),
(10, 'Mohammed Aziz CHOUAIA', 'Developer', 'Data Scientist', '', '/uploads/user-1755039497150-419287578.jpg', '[]', 'chouaia.mohamedaziz@esprit.tn', '', '', 1, 1, '2025-08-12 22:58:17', '2025-08-14 00:04:00'),
(11, 'med amine bali', 'Developer', 'Data Scientist', '', '/uploads/user-1755039536916-977225909.jpg', '[]', 'amin.bali@esprit.tn', '', '', 5, 1, '2025-08-12 22:58:56', '2025-08-14 00:04:26'),
(12, 'Kenza BOKRI', 'Developer', 'Data Scientist', '', '/uploads/user-1755039556026-969829728.jpeg', '[]', 'kenza.bokri@esprit.tn', '', '', 4, 1, '2025-08-12 22:59:16', '2025-08-14 00:04:11');

-- --------------------------------------------------------

--
-- Structure de la table `conversation_images`
--

CREATE TABLE `conversation_images` (
  `id` int(11) NOT NULL,
  `thread_id` varchar(255) NOT NULL,
  `user_id` int(11) NOT NULL,
  `image_data` longtext NOT NULL,
  `image_type` varchar(50) DEFAULT 'image/jpeg',
  `image_size` int(11) NOT NULL,
  `original_filename` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `login` varchar(180) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) NOT NULL,
  `date_de_naissance` date NOT NULL,
  `num_tel` varchar(8) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `image` varchar(255) NOT NULL,
  `role` varchar(20) NOT NULL,
  `adresse` varchar(255) NOT NULL,
  `section` enum('Mathématiques','Sciences expérimentales','Économie et gestion','Sciences techniques','Lettres','Sport','Sciences de l''informatique') NOT NULL,
  `etablissement` varchar(255) NOT NULL,
  `statut` varchar(255) NOT NULL,
  `niveau` enum('baccalaureat','3eme annee','2eme annee','1ere annee') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `user`
--

INSERT INTO `user` (`id`, `login`, `nom`, `prenom`, `date_de_naissance`, `num_tel`, `email`, `mot_de_passe`, `image`, `role`, `adresse`, `section`, `etablissement`, `statut`, `niveau`) VALUES
(12, '374ETU3751', 'chouaia', 'aziz', '2025-08-12', '29446598', 'Chouaia.mohamedaziz@esprit.tn', '$2b$10$Uh.qXCXCZCF4TsH259aVLe0D9JRoJOrPxHFhImzUYMc7YklRq3nhC', '/uploads/user-1755047802219-777565781.jpg', 'etudiant', 'si mansour', 'Mathématiques', 'Lycee Pere Blanc', 'validé', 'baccalaureat'),
(28, '626ADM8823', 'Ben Rabia', 'khalil', '2000-06-29', '54666874', 'service@edutopiatn.com', '$2b$10$O6GCndQBjEKTQu0N3LCHtOTv1CZDrys9wWfJZKe8RBc.ZFSnM/WqK', '/uploads/user-1754960486800-113266780.jpg', 'admin', 'Cité Olympique', 'Mathématiques', 'Lycee Pere Blanc', 'validé', 'baccalaureat'),
(36, '582ETU8054', 'bokri', 'kenza ', '2003-02-13', '53822532', 'kenza.bokri@esprit.tn', '$2b$10$TZPKHs5r1Nh2YjlAEa63qO2WSucQ400Vm9fQFCr5nWoP5K9XbS76W', '/uploads/user-1755047625009-345442389.jpeg', 'etudiant', 'ariana hedi nouira', 'Sciences expérimentales', 'ariana', 'validé', 'baccalaureat'),
(38, '280ETU9118', 'BALI', 'Mohamed Amin', '2003-06-29', '53822532', 'amin.bali@esprit.tn', '$2b$10$MgTcvzRh5hOEYqRWU2.3e.jlTYTIvAtyNPjg7qys14lOvtSRbocwW', '/uploads/user-1755218528144-599307101.jpg', 'etudiant', 'arianaGGGGGGGGGGGG', 'Mathématiques', 'HGGHHH', 'validé', '3eme annee'),
(39, '462ETU3537', 'PICHEWI', 'PICHOU', '2002-02-02', '53822532', 'pech@gmail.com', '$2b$10$tKkDmTzOTZuyKMabYGC78uoaLDGIRqbyykY/PvQDBJxeo6lWAkF.O', '/uploads/user-1755218624120-834143520.jpg', 'etudiant', 'arianaAAAAAAAAA', 'Économie et gestion', 'Non applicable', 'validé', 'baccalaureat');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `abonnements`
--
ALTER TABLE `abonnements`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `categorie_produit`
--
ALTER TABLE `categorie_produit`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `chapitre`
--
ALTER TABLE `chapitre`
  ADD PRIMARY KEY (`id`),
  ADD KEY `createur_id` (`createur_id`),
  ADD KEY `fk_chapitre_matiere` (`matiere_id`);

--
-- Index pour la table `course`
--
ALTER TABLE `course`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_course_chapitre` (`chapitre_id`);

--
-- Index pour la table `event`
--
ALTER TABLE `event`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `favorite`
--
ALTER TABLE `favorite`
  ADD PRIMARY KEY (`user_id`,`course_id`),
  ADD KEY `fk_fav_course` (`course_id`);

--
-- Index pour la table `inscription_abonnement`
--
ALTER TABLE `inscription_abonnement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `abonnement_id` (`abonnement_id`);

--
-- Index pour la table `inscription_event`
--
ALTER TABLE `inscription_event`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_event` (`user_id`,`event_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_event_id` (`event_id`),
  ADD KEY `idx_date_inscription` (`date_inscription`);

--
-- Index pour la table `matiere`
--
ALTER TABLE `matiere`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`);

--
-- Index pour la table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_orders_user_id` (`user_id`),
  ADD KEY `idx_orders_date_creation` (`date_creation`);

--
-- Index pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_items_order_id` (`order_id`),
  ADD KEY `idx_order_items_produit_id` (`produit_id`);

--
-- Index pour la table `paiement_especes`
--
ALTER TABLE `paiement_especes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `commande_id` (`commande_id`);

--
-- Index pour la table `paiement_virement`
--
ALTER TABLE `paiement_virement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `commande_id` (`commande_id`);

--
-- Index pour la table `panier`
--
ALTER TABLE `panier`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_panier_user_id` (`user_id`),
  ADD KEY `idx_panier_session_id` (`session_id`);

--
-- Index pour la table `panier_item`
--
ALTER TABLE `panier_item`
  ADD PRIMARY KEY (`id`),
  ADD KEY `panier_id` (`panier_id`),
  ADD KEY `produit_id` (`produit_id`),
  ADD KEY `idx_panier_item_panier_id` (`panier_id`),
  ADD KEY `idx_panier_item_produit_id` (`produit_id`),
  ADD KEY `idx_panier_item_panier_produit` (`panier_id`,`produit_id`);

--
-- Index pour la table `produit`
--
ALTER TABLE `produit`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categorie_id` (`categorie_id`),
  ADD KEY `idx_produit_stock` (`stock`),
  ADD KEY `idx_produit_categorie_id` (`categorie_id`);

--
-- Index pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Index pour la table `promo_code_usage`
--
ALTER TABLE `promo_code_usage`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_usage` (`promo_code_id`,`user_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Index pour la table `reclamations`
--
ALTER TABLE `reclamations`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `serie_corrections`
--
ALTER TABLE `serie_corrections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `course_id` (`course_id`);

--
-- Index pour la table `team`
--
ALTER TABLE `team`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `conversation_images`
--
ALTER TABLE `conversation_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_thread_id` (`thread_id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_thread_user` (`thread_id`,`user_id`);

--
-- Index pour la table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `abonnements`
--
ALTER TABLE `abonnements`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `categorie_produit`
--
ALTER TABLE `categorie_produit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `chapitre`
--
ALTER TABLE `chapitre`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT pour la table `course`
--
ALTER TABLE `course`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT pour la table `event`
--
ALTER TABLE `event`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `inscription_abonnement`
--
ALTER TABLE `inscription_abonnement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT pour la table `inscription_event`
--
ALTER TABLE `inscription_event`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT pour la table `matiere`
--
ALTER TABLE `matiere`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT pour la table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT pour la table `paiement_especes`
--
ALTER TABLE `paiement_especes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `paiement_virement`
--
ALTER TABLE `paiement_virement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `panier`
--
ALTER TABLE `panier`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `panier_item`
--
ALTER TABLE `panier_item`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=120;

--
-- AUTO_INCREMENT pour la table `produit`
--
ALTER TABLE `produit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT pour la table `promo_codes`
--
ALTER TABLE `promo_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT pour la table `promo_code_usage`
--
ALTER TABLE `promo_code_usage`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `reclamations`
--
ALTER TABLE `reclamations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `serie_corrections`
--
ALTER TABLE `serie_corrections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `team`
--
ALTER TABLE `team`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `conversation_images`
--
  ALTER TABLE `conversation_images`
    MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `favorite`
--
ALTER TABLE `favorite`
  ADD CONSTRAINT `fk_fav_course` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_fav_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `inscription_abonnement`
--
ALTER TABLE `inscription_abonnement`
  ADD CONSTRAINT `inscription_abonnement_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscription_abonnement_ibfk_2` FOREIGN KEY (`abonnement_id`) REFERENCES `abonnements` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `inscription_event`
--
ALTER TABLE `inscription_event`
  ADD CONSTRAINT `inscription_event_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `inscription_event_ibfk_2` FOREIGN KEY (`event_id`) REFERENCES `event` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`produit_id`) REFERENCES `produit` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `serie_corrections`
--
ALTER TABLE `serie_corrections`
  ADD CONSTRAINT `serie_corrections_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `course` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `conversation_images`
--
ALTER TABLE `conversation_images`
  ADD CONSTRAINT `conversation_images_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
