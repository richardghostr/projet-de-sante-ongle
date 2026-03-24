# BLOC C — Structure dossiers professionnelle

## Frontend (React + Tailwind) — arborescence recommandée

```
frontend/
  package.json
  tailwind.config.js
  public/
  src/
    index.tsx
    App.tsx
    assets/
    components/
      Button/
      Card/
      Heatmap/
      ImageUploader/
      WebcamCapture/
    pages/
      Landing/
      Dashboard/
      Analyze/
      History/
      Profile/
    services/
      api.ts
      auth.ts
      iaClient.ts
    styles/
```

## Backend PHP (Laravel) — arborescence recommandée

```
backend/
  composer.json
  .env
  app/
    Http/Controllers/
      AuthController.php
      AnalysisController.php
      ProfileController.php
    Models/
      User.php
      Analysis.php
      Advice.php
      Log.php
  database/
    migrations/
    seeders/
  routes/
    api.php
  storage/uploads/
  config/ia.php
```

## Module IA Python — arborescence recommandée

```
ia/
  pyproject.toml (or requirements.txt)
  Dockerfile
  dataset/
    raw/
    annotations/
  preprocessing/
    segmentation.py
    augment.py
  model/
    mobilenetv2.py
    efficientnet.py
    unet.py
  training/
    train.py
    utils.py
  inference/
    server.py (FastAPI)
    predict.py
  exports/
    saved_models/
```

## DevOps / infra

- `docker-compose.yml` (prototypage): services nginx, php-fpm, mysql, redis, fastapi, frontend (dev). 
- `k8s/` or `helm/` pour déploiement prod.

## Tests & documentation

- `backend/tests/` (PHPUnit)
- `frontend/tests/` (Cypress / Jest)
- `ia/tests/` (unit tests PyTorch / inference smoke tests)
- `docs/` pour specs, protocole d'évaluation, slides soutenance.
