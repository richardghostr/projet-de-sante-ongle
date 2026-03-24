# BLOC A — Analyse fonctionnelle complète

## Utilisateurs cibles

- Grand public : usage mobile/desktop, interface simple, langage non médical.
- Étudiants : accès aux métadonnées, visualisations explicatives (Grad‑CAM, masks).
- Personnes en zones rurales : tolérance basse à la bande passante, upload asynchrone et compression côté client.
- Utilisateurs sans expertise médicale : explications pédagogiques, avertissements clairs.

## Cas d'usage détaillés

1. Inscription
   - Collecte : `nom`, `email`, `password`, consentement RGPD.
   - Vérification email et enregistrement sécurisé (hash mot de passe).
2. Connexion
   - Session sécurisée (cookie HttpOnly ou token Bearer), option MFA pour profils pro.
3. Upload image
   - Fichiers : `jpeg`, `png`, `heic` (conversion serveur si nécessaire).
   - Validation client + serveur (taille max 8MB, types MIME, stripping EXIF).
4. Capture webcam
   - `getUserMedia` avec overlay guidé pour positionnement de l'ongle.
5. Analyse IA
   - Chemin synchrone pour UX rapide (timeout ≤10s) ou asynchrone avec queue pour charge.
6. Consultation résultats
   - Classe(s) détectée(s), probabilité(s), score confiance, heatmap, conseils.
7. Historique
   - Liste paginée d'analyses avec comparatif visuel et export PDF.
8. Profil utilisateur
   - Gestion données, suppression compte (right to be forgotten).

## User stories (exemples)

- En tant qu'utilisateur, je veux importer une image afin d'obtenir une analyse automatique avec score et conseils clairs.
- En tant qu'étudiant, je veux accéder à la heatmap pour comprendre pourquoi le modèle a pris une décision.
- En tant qu'utilisateur en zone rurale, je veux que l'upload soit compressé et fiable sur connexion lente.

## Diagramme fonctionnel des acteurs (description)

- Acteurs : `Utilisateur`, `Système Web (Frontend)`, `Backend PHP`, `Moteur IA (Python)`, `Base de données (MySQL)`.
- Flux simplifié :
  1. Utilisateur → Frontend (upload/capture) → Backend (validation, stockage)
  2. Backend → Moteur IA (API REST) → Backend (résultats: classes, probas, masks)
  3. Backend → Persistance (MySQL) → Frontend (affichage résultat)

## Contraintes et règles métier

- Le service ne fournit pas de diagnostic médical officiel — afficher disclaimer obligatoire.
- Conservation des images et données selon consentement (durée paramétrable).
- Logging d'audit pour actions sensibles (login, suppression de compte, export).
