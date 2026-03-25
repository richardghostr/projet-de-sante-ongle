# 🚀 Guide de démarrage rapide - UnguealHealth Frontend

## En 5 minutes

### 1. Démarrer le serveur
```bash
cd frontend
python -m http.server 8080
# ou
npx http-server -p 8080
```

### 2. Ouvrir dans le navigateur
```
http://localhost:8080
```

### 3. Naviguer dans l'app
- **Accueil**: `/` (landing page)
- **Connexion**: `/login`
- **Inscription**: `/register`
- **Dashboard**: `/dashboard` (après login)

## Structure du projet

```
frontend/
├── index.html          # Point d'entrée
├── css/               # Feuilles de style modulaires
│   ├── variables.css  # Design tokens
│   └── pages/         # Styles spécifiques
└── js/                # Modules JavaScript
    ├── main.js        # Initialisation
    ├── core/          # Router, state, config
    ├── services/      # API, Auth, Storage
    ├── components/    # UI réutilisables
    └── pages/         # Pages de l'app
```

## Routes disponibles

| Route | Page | Auth requise |
|-------|------|-------------|
| `/` | Accueil | Non |
| `/about` | À propos | Non |
| `/contact` | Contact | Non |
| `/login` | Connexion | Non |
| `/register` | Inscription | Non |
| `/dashboard` | Tableau de bord | Oui |
| `/analyze` | Nouvelle analyse | Oui |
| `/history` | Historique | Oui |
| `/profile` | Profil utilisateur | Oui |

## Authentification

### Démo utilisateur
```
Email: demo@example.com
Password: password123
```

### Test d'authentification
L'authentification est gérée via `AuthService`:
```javascript
import { AuthService } from './services/auth.js';

// Vérifier l'auth
if (AuthService.isAuthenticated()) {
  console.log('User:', AuthService.getCurrentUser());
}
```

## Développement

### Ajouter une nouvelle page

**1. Créer le fichier** `js/pages/newpage.js`:
```javascript
export const NewPage = {
  render() {
    const div = document.createElement('div');
    div.className = 'newpage';
    div.innerHTML = '<h1>Nouvelle page</h1>';
    return div;
  }
};
```

**2. L'enregistrer** dans `js/main.js`:
```javascript
import { NewPage } from './pages/newpage.js';

// Dans registerRoutes():
this.router.registerRoute('/newpage', {
  name: 'newpage',
  component: NewPage,
  requiresAuth: false
});
```

**3. Créer le CSS** `css/pages/newpage.css`:
```css
.newpage {
  padding: var(--spacing-lg);
}
```

### Utiliser les couleurs du design

```css
.mon-element {
  background-color: var(--primary);      /* Violet */
  color: var(--text);                     /* Gris foncé */
  border: 1px solid var(--border);        /* Gris clair */
}
```

### Afficher une notification
```javascript
import { UIComponents } from './components/ui.js';

UIComponents.showToast('Message de succès!', 'success');
// Types: 'success', 'error', 'warning', 'info'
```

### Appeler l'API
```javascript
import { ApiService } from './services/api.js';

// Login
const response = await ApiService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Autres endpoints
await ApiService.getProfile();
await ApiService.uploadImage(file);
await ApiService.getHistory(page, limit);
```

### Gérer l'état
```javascript
import { AppState } from './core/state.js';

// Lire
const user = AppState.getState().user;

// Modifier
AppState.setState({ isLoading: true });

// Écouter les changements
AppState.onChange(state => {
  console.log('État changé:', state);
});
```

## Codes couleur

```
Primary (Violet)    : #8b5cf6
Secondary (Teal)    : #14B8A6
Success (Vert)      : #10B981
Warning (Orange)    : #F59E0B
Danger (Rouge)      : #EF4444
Background (Blanc)  : #FFFFFF
Text (Gris)         : #1F2937
```

## Dépannage

### Aucun style n'apparaît
- Vérifier les chemins CSS dans `index.html`
- Ouvrir DevTools (F12) et checker les erreurs réseau
- Rafraîchir le navigateur (Ctrl+Shift+R)

### Navigation ne fonctionne pas
- Vérifier la console pour les erreurs
- S'assurer que le hash URL est correct (#/dashboard)
- Vérifier que la route est enregistrée dans main.js

### API n'appelle pas le backend
- S'assurer que le serveur backend est actif
- Vérifier l'URL API dans `js/core/config.js`
- Checker les headers CORS

## Ressources

- 📖 [Documentation complète](frontend/README.md)
- 📋 [Guide de refactorisation](docs/FRONTEND_REFACTORING.md)
- 📊 [Rapport de completion](REFACTORING_COMPLETE.md)

## Prochaines étapes

1. Tester l'authentification
2. Vérifier l'intégration API
3. Tester la navigation
4. Valider le responsive design

## Support

Pour les questions ou problèmes:
1. Vérifier la console du navigateur (F12)
2. Consulter la documentation complète
3. Vérifier les logs du serveur backend

---

**Bon développement!** 🎉
