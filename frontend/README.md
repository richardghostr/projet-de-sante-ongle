# UnguealHealth Frontend - Architecture Refactorisée

## Vue d'ensemble

Le frontend a été complètement refactorisé selon une architecture moderne et modulaire en Vanilla JS ES6. Cette structure améliore la maintenabilité, la performance et facilite les extensions futures.

## Structure des dossiers

```
frontend/
├── index.html                 # Point d'entrée HTML
├── css/                       # Feuilles de style modulaires
│   ├── variables.css         # Variables et design tokens
│   ├── base.css              # Styles de base et reset
│   ├── components.css        # Composants réutilisables
│   ├── layouts.css           # Layouts et grilles
│   ├── utilities.css         # Classes utilitaires
│   └── pages/                # Styles spécifiques aux pages
│       ├── landing.css
│       ├── auth.css
│       ├── dashboard.css
│       ├── analysis.css
│       ├── history.css
│       └── profile.css
└── js/                        # Modules JavaScript ES6
    ├── main.js               # Point d'entrée applicatif
    ├── app.js                # Compatibilité legacy
    ├── core/                 # Modules core
    │   ├── config.js         # Configuration globale
    │   ├── state.js          # Gestion d'état centralisée
    │   └── router.js         # Routeur SPA
    ├── services/             # Services métier
    │   ├── api.js            # Requêtes API
    │   ├── auth.js           # Gestion authentification
    │   └── storage.js        # Gestion du stockage
    ├── components/           # Composants réutilisables
    │   ├── ui.js             # Composants UI (modals, toasts)
    │   ├── forms.js          # Composants formulaires
    │   └── nav.js            # Navigation et header
    ├── pages/                # Pages de l'application
    │   ├── landing.js
    │   ├── login.js
    │   ├── register.js
    │   ├── dashboard.js
    │   ├── analyze.js
    │   ├── history.js
    │   ├── profile.js
    │   ├── about.js
    │   └── contact.js
    ├── utils/                # Utilitaires
    │   ├── helpers.js        # Fonctions utilitaires
    │   └── dom.js            # Utilitaires DOM
    └── controllers/          # Contrôleurs legacy (compatibilité)
        ├── dashboard.js
        ├── analysis.js
        ├── history.js
        └── profile.js
```

## Architecture et principes

### 1. **Séparation des responsabilités**
- **Core**: Logique applicative (routeur, état, config)
- **Services**: Logique métier (API, authentification, stockage)
- **Components**: Composants réutilisables
- **Pages**: Composants de pages spécifiques
- **Utils**: Fonctions utilitaires

### 2. **CSS Modulaire**
- **variables.css**: Design tokens (couleurs, espacements, typographie)
- **base.css**: Reset CSS, styles de base, animations
- **components.css**: Composants réutilisables (boutons, cartes, formulaires)
- **layouts.css**: Systèmes de layouts, grilles
- **utilities.css**: Classes utilitaires (flexbox, spacing, etc.)
- **pages/*.css**: Styles spécifiques aux pages

### 3. **Système de design**
- **Palette de couleurs**: Violet (#8b5cf6) + Teal (#14B8A6) + Neutres
- **Typographie**: Inter (sans-serif)
- **Espacements**: Échelle 4px (0.25rem, 0.5rem, 1rem, etc.)
- **Animations**: Transitions fluides 300ms

### 4. **État global (AppState)**
```javascript
{
  isAuthenticated: boolean,
  user: User | null,
  isLoading: boolean,
  theme: 'light' | 'dark'
}
```

## Utilisation

### Démarrage
```bash
# Ouvrir index.html dans un navigateur
# Ou servir via un serveur HTTP local
python -m http.server 8080
```

### Ajouter une nouvelle page

1. **Créer le composant page** (`js/pages/mypage.js`):
```javascript
export const MyPage = {
  render() {
    const container = document.createElement('div');
    container.className = 'mypage';
    container.innerHTML = `<h1>My Page</h1>`;
    return container;
  }
};
```

2. **Enregistrer la route** (dans `main.js`):
```javascript
this.router.registerRoute('/mypage', {
  name: 'mypage',
  component: MyPage,
  requiresAuth: false
});
```

3. **Créer le CSS** (`css/pages/mypage.css`):
```css
.mypage {
  /* Styles */
}
```

### Ajouter un service

1. **Créer le service** (`js/services/myservice.js`):
```javascript
export const MyService = {
  async doSomething() {
    // logique
  }
};
```

2. **L'importer** où nécessaire

### Gestion de l'état

```javascript
import { AppState } from './core/state.js';

// Lire l'état
const user = AppState.getState().user;

// Modifier l'état
AppState.setState({
  isLoading: true
});

// Écouter les changements
AppState.onChange((newState) => {
  console.log('État changé:', newState);
});
```

## Routes

- **`/`** - Landing page (accueil)
- **`/about`** - À propos
- **`/contact`** - Contact
- **`/login`** - Connexion
- **`/register`** - Inscription
- **`/dashboard`** - Tableau de bord (authentifiée)
- **`/analyze`** - Nouvelle analyse (authentifiée)
- **`/history`** - Historique (authentifiée)
- **`/profile`** - Profil utilisateur (authentifiée)

## API Service

```javascript
import { ApiService } from './services/api.js';

// Authentification
await ApiService.register(userData);
await ApiService.login(credentials);
await ApiService.logout();

// Profil
await ApiService.getProfile();
await ApiService.updateProfile(data);
await ApiService.changePassword(data);

// Analyses
await ApiService.uploadImage(file);
await ApiService.analyzeImage(analysisId);
await ApiService.getHistory(page, limit);
await ApiService.getAnalysisDetail(id);
await ApiService.deleteAnalysis(id);
```

## Authentification

```javascript
import { AuthService } from './services/auth.js';

// Vérifier l'authentification
AuthService.isAuthenticated();

// Obtenir l'utilisateur
AuthService.getCurrentUser();

// Logout
AuthService.logout();
```

## Composants UI

```javascript
import { UIComponents } from './components/ui.js';

// Toast
UIComponents.showToast('Message', 'success');

// Modal
UIComponents.showModal('Contenu', {
  title: 'Titre',
  size: 'large'
});

// Confirmation
UIComponents.showConfirm('Êtes-vous sûr?', () => {
  // Confirmé
});
```

## Configuration

Modifier `js/core/config.js`:
```javascript
export const CONFIG = {
  API_BASE_URL: 'http://localhost:8000/api',
  IA_URL: 'http://localhost:5000',
  // ...
};
```

## Performance

- **Code splitting**: Chaque page est indépendante
- **Lazy loading**: CSS spécifique aux pages
- **Caching**: HTTP caching des ressources statiques
- **Minification**: Recommandé en production

## Navigateur supportés

- Chrome/Edge: ≥90
- Firefox: ≥88
- Safari: ≥14

## Compatibilité legacy

Le fichier `app.js` et les contrôleurs dans `js/controllers/` fournissent des shims pour la compatibilité avec le code legacy. Pour la migration complète, mettre à jour graduellement.

## Contribution

1. Suivre la structure existante
2. Utiliser les design tokens (variables CSS)
3. Documenter les nouvelles fonctionnalités
4. Tester sur mobile et desktop
