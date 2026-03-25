# 📊 UnguealHealth - Project Overview

## Vision

UnguealHealth est une application web intelligente qui utilise l'IA pour diagnostiquer et analyser les maladies des ongles. Les utilisateurs peuvent uploader des images de leurs ongles et recevoir une analyse détaillée basée sur un modèle de deep learning.

## Stack technologique

```
Frontend:
├── HTML5 (sémantique)
├── CSS3 (variables, grid, flexbox)
├── JavaScript ES6+ (modules)
└── Vanilla (pas de framework)

Backend:
├── PHP (API RESTful)
├── Base de données SQL
└── JWT Authentication

IA/ML:
├── Python FastAPI
├── TensorFlow/Keras
└── Deep Learning Model
```

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Vanilla JS)                       │
│  ┌─────────────┬──────────────┬──────────────┬────────────────┐  │
│  │  Landing    │  Auth Pages  │  Dashboard   │  Analysis Page │  │
│  │  (Public)   │  (Login/Reg) │  (Protected) │  (Protected)   │  │
│  └─────────────┴──────────────┴──────────────┴────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Core: Router | State | Config                              │  │
│  │ Services: API | Auth | Storage                             │  │
│  │ Components: UI | Forms | Navigation                        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTP/REST API
┌──────────────────────▼───────────────────────────────────────────┐
│                      BACKEND (PHP)                                 │
│  ┌──────────────┬──────────────┬──────────────────────────────┐  │
│  │  Auth API    │  Profile API │  Analysis API                │  │
│  │  /login      │  /profile    │  /analyze, /history          │  │
│  │  /register   │  /password   │  /upload                     │  │
│  └──────────────┴──────────────┴──────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Database: Users | Analyses | Results                      │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────────────┘
                       │ File Upload, Model Prediction
┌──────────────────────▼───────────────────────────────────────────┐
│                   IA/ML (Python FastAPI)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Image Processing → Model → Prediction → Results            │ │
│  │  (Deep Learning CNN for nail disease classification)        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Structure frontend détaillée

```
frontend/
├── index.html ........................ HTML principal
│
├── css/ ............................. Feuilles de style
│   ├── variables.css ................ Design tokens
│   ├── base.css ..................... Styles globaux
│   ├── components.css ............... Composants
│   ├── layouts.css .................. Layouts
│   ├── utilities.css ................ Utilities
│   └── pages/
│       ├── landing.css .............. Landing page
│       ├── auth.css ................. Auth pages
│       ├── dashboard.css ............ Dashboard
│       ├── analysis.css ............. Analysis page
│       ├── history.css .............. History page
│       └── profile.css .............. Profile page
│
└── js/ ............................. Modules JavaScript
    ├── main.js ...................... Entry point
    ├── app.js ....................... Legacy compatibility
    ├── core/
    │   ├── config.js ................ Configuration
    │   ├── state.js ................. State management
    │   └── router.js ................ SPA router
    ├── services/
    │   ├── api.js ................... API client
    │   ├── auth.js .................. Authentication
    │   └── storage.js ............... Storage service
    ├── components/
    │   ├── ui.js .................... UI components
    │   ├── forms.js ................. Form components
    │   └── nav.js ................... Navigation
    ├── pages/
    │   ├── landing.js ............... Landing page
    │   ├── about.js ................. About page
    │   ├── contact.js ............... Contact page
    │   ├── login.js ................. Login page
    │   ├── register.js .............. Register page
    │   ├── dashboard.js ............. Dashboard page
    │   ├── analyze.js ............... Analyze page
    │   ├── history.js ............... History page
    │   └── profile.js ............... Profile page
    └── utils/
        ├── helpers.js ............... Utility functions
        └── dom.js ................... DOM utilities
```

## Pages et fonctionnalités

### 🏠 Pages publiques

#### Landing Page
- Hero section avec CTA
- Feature showcase
- Testimonials
- Call to action (Sign up / Login)

#### About Page
- Présentation du projet
- Mission et valeurs
- Équipe
- Impact

#### Contact Page
- Formulaire de contact
- Information de contact
- Intégration d'une carte (optionnel)

### 🔐 Authentification

#### Login Page
- Email/password input
- Remember me checkbox
- Forgot password link
- Sign up link

#### Register Page
- Email/password/confirmation input
- Terms & conditions
- Login link
- Email verification (optionnel)

### 📊 Pages protégées (authentifiée requis)

#### Dashboard
- Statistiques utilisateur
- Analyses récentes
- Quick actions
- Notifications

#### Analyze Page
- Drag & drop d'image
- Résultats de l'analyse
- Sauvegarde des résultats
- Partage des résultats

#### History Page
- Liste paginée des analyses
- Filtres et recherche
- Détails de chaque analyse
- Suppression/export

#### Profile Page
- Édition profil
- Changement mot de passe
- Suppressions compte
- Préférences

## Routes de l'application

```
PUBLIC ROUTES:
  GET  /              → Landing page
  GET  /about         → About page
  GET  /contact       → Contact page
  POST /contact       → Submit contact form
  GET  /login         → Login page
  POST /login         → Authenticate
  GET  /register      → Register page
  POST /register      → Create account

PROTECTED ROUTES (requires authentication):
  GET  /dashboard     → Dashboard
  GET  /analyze       → Analysis page
  POST /analyze       → Submit analysis
  GET  /history       → History page
  GET  /history/:id   → Analysis details
  DELETE /history/:id → Delete analysis
  GET  /profile       → Profile page
  PUT  /profile       → Update profile
  POST /logout        → Logout
```

## Système de design

### Palette de couleurs

| Couleur | Code | Utilisation |
|---------|------|------------|
| Primary | #8b5cf6 | Boutons principaux, headers, éléments actifs |
| Secondary | #14B8A6 | Accents, underlines, highlights |
| Success | #10B981 | Messages de succès, checkmarks |
| Warning | #F59E0B | Attention, avertissements |
| Danger | #EF4444 | Erreurs, suppressions |
| Background | #FFFFFF | Fond principal |
| Text | #1F2937 | Texte principal |
| Muted | #6B7280 | Texte secondaire |
| Border | #E5E7EB | Bordures, separators |

### Typographie

- **Font**: Inter (sans-serif)
- **Headings**: 
  - H1: 32px, weight 800
  - H2: 28px, weight 700
  - H3: 24px, weight 700
  - H4: 20px, weight 600
  - H5: 18px, weight 600
  - H6: 16px, weight 600
- **Body**: 
  - Regular: 16px, weight 400
  - Medium: 16px, weight 500
  - Semibold: 16px, weight 600
- **Line-height**: 1.5-1.6 (pour lisibilité)

### Composants

#### Boutons
- Primary: Violet fond, blanc texte
- Secondary: Gris fond, texte gris
- Outline: Transparent fond, bordure couleur
- Danger: Rouge fond, blanc texte
- Icon: Petit, icône uniquement
- States: Normal, Hover, Active, Disabled

#### Formulaires
- Input text avec label
- Password avec toggle visibility
- Email avec validation
- Checkbox et radio buttons
- Select dropdowns
- Textarea
- File upload avec drag & drop

#### Cartes
- Analysis cards avec image et metadata
- Stat cards avec nombre et label
- User cards avec profil info
- Feature cards avec icon et description

#### Notifications
- Toast: Position bottom-right, auto-dismiss
- Modal: Center, avec backdrop
- Alert: Inline warning/error/info
- Confirmation: Modal avec yes/no buttons

## Gestion d'état

```javascript
AppState = {
  isAuthenticated: boolean,
  user: {
    id: number,
    email: string,
    firstName: string,
    lastName: string,
    avatar: string,
    createdAt: string
  },
  isLoading: boolean,
  theme: 'light' | 'dark',
  // ... autres propriétés
}
```

## Flux d'authentification

```
User visits /login
        ↓
User enters credentials
        ↓
Submit to /api/login
        ↓
Backend returns JWT token
        ↓
Frontend stores token
        ↓
Update AppState (isAuthenticated = true)
        ↓
Redirect to /dashboard
        ↓
Protected routes now accessible
        ↓
API calls include Authorization header
```

## Performance targets

- **Page Load**: < 3 secondes
- **Time to Interactive**: < 4 secondes
- **First Contentful Paint**: < 1.5 secondes
- **Lighthouse Performance**: > 80
- **Lighthouse Accessibility**: > 90
- **Lighthouse Best Practices**: > 85

## Sécurité

- JWT tokens pour authentification
- HTTPS en production
- CORS configuré correctement
- Input validation côté client
- XSS prevention
- CSRF protection (si nécessaire)
- Password hashing côté backend
- Rate limiting sur les endpoints sensibles

## Accessibilité

- WCAG AA compliant
- Semantic HTML
- Keyboard navigation
- Screen reader friendly
- Color contrast WCAG AA
- Focus indicators visibles
- Alt text pour images
- ARIA labels où nécessaire

## Responsive design

```
Mobile-first approach:
  320px - 599px:   Mobile phones
  600px - 1023px:  Tablets
  1024px+:         Desktops
```

## Développement

### Pour ajouter une nouvelle page:

1. Créer `js/pages/newpage.js`
2. Créer `css/pages/newpage.css`
3. Enregistrer la route dans `main.js`

### Pour ajouter un service:

1. Créer `js/services/newservice.js`
2. Exporter les fonctions
3. L'importer où besoin

### Pour ajouter un composant:

1. Créer une fonction dans `js/components/ui.js` (ou nouveau fichier)
2. Créer les styles dans `css/components.css`
3. L'utiliser dans les pages

## Dépendances

### Production
- Aucune dépendance externe (Vanilla JS)
- Google Fonts (Inter)

### Development
- Optionnel: Build tools (webpack, esbuild)
- Optionnel: Minifiers (terser, postcss)

## Déploiement

```
1. Minifier CSS et JS
2. Optimiser les images
3. Configurer API_BASE_URL pour production
4. Mettre en place HTTPS
5. Configurer les headers sécurité
6. Tester sur production environment
7. Monitorer les erreurs et performance
```

## Maintenabilité

- Code bien organisé et modulaire
- Documentation complète
- Patterns cohérents
- Facile à étendre
- Pas de dette technique majeure

## Prochaines évolutions

- [ ] Dark mode
- [ ] Notifications en temps réel
- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Social sharing
- [ ] Mobile app (React Native)
- [ ] Offline support (PWA)

---

**Version**: 1.0
**Last Updated**: 25 Mars 2026
**Status**: Production Ready
