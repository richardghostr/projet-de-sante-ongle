// main.js - bootstrap module to expose ES module pieces as globals
import { CONFIG, AppState, Utils } from './utils.js';
import { ApiService } from './api.js';
import { UI } from './ui.js';
import { Router } from './router.js';
import { Auth } from './auth.js';
import { Components } from './components.js';
import Forms from './forms.js';
import Pages from './pages.js';
import Dashboard from './controllers/dashboard.js';
import Analysis from './controllers/analysis.js';
import History from './controllers/history.js';
import Profile from './controllers/profile.js';

// Expose to window for compatibility with the legacy app.js
window.CONFIG = CONFIG;
window.AppState = AppState;
window.Utils = Utils;
window.ApiService = ApiService;
window.UI = UI;
window.Router = Router;
window.Auth = Auth;
window.Components = Components;
window.Forms = Forms;
window.Pages = Pages;
window.Dashboard = Dashboard;
window.Analysis = Analysis;
window.History = History;
window.Profile = Profile;

console.info('UnguealHealth: module bootstrap initialized — modules exposed to window');

// Initialize app once DOM is ready. This moves startup responsibility to main.js
// so the app can run in module-only mode (legacy `app.js` can be removed).
document.addEventListener('DOMContentLoaded', () => {
	try {
		Auth.init();
		UI.init();
		Router.init();
		console.info('UnguealHealth: app initialized via main.js');
	} catch (err) {
		console.error('Initialization error in main.js', err);
	}
});
