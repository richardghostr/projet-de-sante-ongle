# BLOC B — Architecture logicielle professionnelle

## Choix technologiques et justification

- Frontend : `React.js` + `Tailwind CSS`. Justification : rapidité de prototypage, composants réutilisables, facilités pour visualisations (Canvas/WebGL) et responsive design.
- Backend : `PHP` moderne, framework recommandé `Laravel` (MVC, Eloquent ORM, middleware, queues, sécurité intégrée). Alternatif : PHP natif structuré si contrainte infra.
- Base de données : `MySQL 8.0` (transactions ACID, indexation, réplication possible).
- Module IA : `Python 3.10+` avec `FastAPI`, `PyTorch` (ou `TensorFlow`), `OpenCV` pour prétraitement. Déploiement via Docker pour isolation et scaling.
- Infrastructure : `Nginx` + `PHP-FPM`, `Uvicorn` pour FastAPI, `Redis` pour cache/queues, object storage (S3) pour images.

## Communication entre services

- Schéma : Utilisateur → Frontend → Backend PHP → API Python IA → MySQL/Object Storage.
- Méthode recommandée : API REST HTTPS entre Backend et IA (POST /predict, auth via JWT ou token service). Avantages : découplage, scalabilité, monitoring indépendant.
- Alternative locale : exécution de script Python depuis PHP (proc_open) — acceptable en dev, déconseillé en prod (pas de scalabilité GPU facile).

## Composants et responsabilités

- Frontend (React)
  - AuthService (login/register)
  - UploadService (client-side compression, preview)
  - AnalysisPage (submission, progress, display)
  - Visualization (heatmap overlay, mask toggle)

- Backend (Laravel)
  - Controllers : `AuthController`, `AnalysisController`, `ProfileController`
  - Services : `IAClient` (HTTP wrapper), `StorageService`, `NotificationService`
  - Jobs : `AsynchronousAnalysisJob` (queue, retry policy)
  - Security : middleware (auth, rate-limit, CSRF/web routes)

- Module IA (FastAPI)
  - Endpoints : `/predict` (multipart/form-data), `/health`, `/metrics`
  - InferenceEngine : loader modèle, preprocess, segmenter, classifier, postprocess
  - ModelManager : versioning, hot-reload possible

## Scalabilité et déploiement

- Containerisation : Docker Compose pour dev, Kubernetes (Helm) pour prod.
- Scaling : répliquer service IA derrière LB, utiliser GPU nodes pour inférences lourdes.
- Monitoring : Prometheus (metrics), Grafana (dashboards), Sentry (erreurs applicatives).

## Sécurité inter-services

- Auth inter-service : JWT signé + vérification côté IA ou token d'API service. Pour infra stricte : mTLS.
- Chiffrement des secrets avec un vault (ex: HashiCorp Vault) en production.
