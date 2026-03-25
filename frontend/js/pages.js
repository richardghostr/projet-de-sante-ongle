// pages.js — Pages exported for progressive migration
// Pages reference Components, UI, Router, Forms, and controllers (Dashboard, Analysis, etc.)
// These are available on window by the bootstrap and by legacy app.js.

export const Pages = {
    // Landing Page
    landing() {
        const isAuth = window.Auth?.isAuthenticated?.() || false;
        window.UI.render(`
            <div class="landing-page">
                <header class="header">
                    <div class="container">
                        <nav class="nav">
                            <a href="#landing" class="logo">
                                ${window.Components.logo()}
                                <span>UngueaHealth</span>
                            </a>
                            <div class="nav-links" id="nav-links">
                                <a href="#about">A propos</a>
                                <a href="#contact">Contact</a>
                                ${isAuth ? `
                                    <a href="#dashboard" class="btn btn-primary">Dashboard</a>
                                ` : `
                                    <a href="#login" class="btn btn-outline">Connexion</a>
                                    <a href="#register" class="btn btn-primary">Inscription</a>
                                `}
                            </div>
                            <button class="mobile-menu-btn" id="mobile-menu-btn" onclick="document.getElementById('nav-links').classList.toggle('active')">
                                <span></span><span></span><span></span>
                            </button>
                        </nav>
                    </div>
                </header>

                <section class="hero">
                    <div class="container">
                        <div class="hero-content">
                            <h1 class="hero-title">
                                Diagnostiquez la sante de vos ongles avec
                                <span class="text-gradient">l'Intelligence Artificielle</span>
                            </h1>
                            <p class="hero-subtitle">
                                UngueaHealth utilise des algorithmes avances de deep learning pour analyser 
                                vos ongles et detecter les signes precoces de pathologies ungueales.
                            </p>
                            <div class="hero-actions">
                                <a href="${isAuth ? '#analyze' : '#register'}" class="btn btn-primary btn-lg">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                                        <circle cx="12" cy="13" r="4"/>
                                    </svg>
                                    Commencer l'analyse
                                </a>
                                <a href="#about" class="btn btn-outline btn-lg">En savoir plus</a>
                            </div>
                        </div>
                        <div class="hero-image">
                            <div class="hero-visual">
                                <div class="scan-animation">
                                    <div class="scan-line"></div>
                                    <div class="nail-icon">
                                        <svg viewBox="0 0 100 140" fill="none">
                                            <path d="M20 60 Q20 20 50 10 Q80 20 80 60 L80 130 Q80 135 75 138 L25 138 Q20 135 20 130 Z" 
                                                  stroke="currentColor" stroke-width="3" fill="none"/>
                                            <path d="M30 70 Q30 40 50 30 Q70 40 70 70" stroke="currentColor" stroke-width="2" opacity="0.5"/>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="features" id="features">
                    <div class="container">
                        <h2 class="section-title">Comment ca fonctionne ?</h2>
                        <div class="features-grid">
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                        <circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                                    </svg>
                                </div>
                                <h3>1. Prenez une photo</h3>
                                <p>Capturez une image claire de votre ongle avec votre smartphone ou camera.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                        <path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                                    </svg>
                                </div>
                                <h3>2. Analyse IA</h3>
                                <p>Notre modele de deep learning analyse l'image en quelques secondes.</p>
                            </div>
                            <div class="feature-card">
                                <div class="feature-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                        <polyline points="14,2 14,8 20,8"/>
                                        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                                    </svg>
                                </div>
                                <h3>3. Resultats detailles</h3>
                                <p>Recevez un diagnostic complet avec des recommandations personnalisees.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="pathologies">
                    <div class="container">
                        <h2 class="section-title">Pathologies detectees</h2>
                        <p class="section-subtitle">Notre IA peut identifier plus de 10 types de pathologies ungueales</p>
                        <div class="pathologies-grid">
                            <div class="pathology-item"><span class="pathology-badge healthy">Sain</span><span>Ongle normal</span></div>
                            <div class="pathology-item"><span class="pathology-badge fungal">Mycose</span><span>Onychomycose</span></div>
                            <div class="pathology-item"><span class="pathology-badge psoriasis">Psoriasis</span><span>Psoriasis ungeal</span></div>
                            <div class="pathology-item"><span class="pathology-badge melanoma">Melanome</span><span>Melanome sous-ungeal</span></div>
                            <div class="pathology-item"><span class="pathology-badge trauma">Traumatisme</span><span>Lesions traumatiques</span></div>
                            <div class="pathology-item"><span class="pathology-badge deficiency">Carence</span><span>Carences nutritionnelles</span></div>
                        </div>
                    </div>
                </section>

                <section class="stats">
                    <div class="container">
                        <div class="stats-grid">
                            <div class="stat-item"><span class="stat-number">95%</span><span class="stat-label">Precision du diagnostic</span></div>
                            <div class="stat-item"><span class="stat-number">50K+</span><span class="stat-label">Analyses effectuees</span></div>
                            <div class="stat-item"><span class="stat-number">10K+</span><span class="stat-label">Utilisateurs actifs</span></div>
                            <div class="stat-item"><span class="stat-number">15+</span><span class="stat-label">Pathologies detectables</span></div>
                        </div>
                    </div>
                </section>

                <section class="cta">
                    <div class="container">
                        <div class="cta-content">
                            <h2>Pret a prendre soin de vos ongles ?</h2>
                            <p>Rejoignez des milliers d'utilisateurs qui font confiance a UngueaHealth</p>
                            <a href="${isAuth ? '#analyze' : '#register'}" class="btn btn-light btn-lg">Commencer gratuitement</a>
                        </div>
                    </div>
                </section>

                <footer class="footer">
                    <div class="container">
                        <div class="footer-content">
                            <div class="footer-brand">
                                <a href="#landing" class="logo">${window.Components.logo()}<span>UngueaHealth</span></a>
                                <p>Diagnostic intelligent des pathologies ungueales par IA.</p>
                            </div>
                            <div class="footer-links">
                                <h4>Navigation</h4>
                                <a href="#about">A propos</a>
                                <a href="#contact">Contact</a>
                                <a href="#login">Connexion</a>
                            </div>
                            <div class="footer-links">
                                <h4>Legal</h4>
                                <a href="#">Mentions legales</a>
                                <a href="#">Politique de confidentialite</a>
                                <a href="#">CGU</a>
                            </div>
                        </div>
                        <div class="footer-bottom">
                            <p>2024 UngueaHealth. Tous droits reserves.</p>
                        </div>
                    </div>
                </footer>
            </div>
        `);
    },

    // Login Page
    login() {
        window.UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${window.Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Connexion</h1>
                            <p>Connectez-vous pour acceder a votre espace personnel</p>
                        </div>
                        <form id="login-form" class="auth-form">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com" autocomplete="email">
                            </div>
                            <div class="form-group">
                                <label for="password">Mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password" name="password" required placeholder="Votre mot de passe" autocomplete="current-password">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="form-options">
                                <label class="checkbox-label">
                                    <input type="checkbox" name="remember"><span>Se souvenir de moi</span>
                                </label>
                                <a href="#forgot-password" class="forgot-link">Mot de passe oublie ?</a>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Se connecter</button>
                        </form>
                        <div class="auth-footer">
                            <p>Pas encore de compte ? <a href="#register">Inscrivez-vous</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        window.Forms?.initLoginForm?.();
    },

    // Register Page
    register() {
        window.UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${window.Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Inscription</h1>
                            <p>Creez votre compte pour commencer</p>
                        </div>
                        <form id="register-form" class="auth-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="nom">Nom</label>
                                    <input type="text" id="nom" name="nom" required placeholder="Votre nom">
                                </div>
                                <div class="form-group">
                                    <label for="prenom">Prenom</label>
                                    <input type="text" id="prenom" name="prenom" required placeholder="Votre prenom">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com" autocomplete="email">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="telephone">Telephone</label>
                                    <input type="tel" id="telephone" name="telephone" placeholder="(+33) 6 12 34 56 78">
                                </div>
                                <div class="form-group">
                                    <label for="date_naissance">Date de naissance</label>
                                    <input type="date" id="date_naissance" name="date_naissance">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="sexe">Sexe</label>
                                <select id="sexe" name="sexe">
                                    <option value="">-- Choisir --</option>
                                    <option value="homme">Homme</option>
                                    <option value="femme">Femme</option>
                                    <option value="autre">Autre</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="password">Mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password" name="password" required placeholder="Votre mot de passe">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="password-strength" id="password-strength"></div>
                            </div>
                            <div class="form-group">
                                <label for="password_confirm">Confirmer le mot de passe</label>
                                <div class="password-input">
                                    <input type="password" id="password_confirm" name="password_confirm" required placeholder="Confirmez votre mot de passe">
                                    <button type="button" class="toggle-password" onclick="Forms.togglePassword('password_confirm')">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="consent_data" name="consent_data" value="1" required>
                                    <span>J'accepte le traitement de mes donnees pour fournir le service</span>
                                </label>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Creer mon compte</button>
                        </form>
                        <div class="auth-footer">
                            <p>Deja inscrit ? <a href="#login">Connectez-vous</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        window.Forms?.initRegisterForm?.();
    },

    // Forgot Password Page
    forgotPassword() {
        window.UI.render(`
            <div class="auth-page">
                <div class="auth-container">
                    <div class="auth-card">
                        <div class="auth-header">
                            <a href="#landing" class="logo">${window.Components.logo()}<span>UngueaHealth</span></a>
                            <h1>Mot de passe oublie</h1>
                            <p>Entrez votre email pour recevoir un lien de reinitialisation</p>
                        </div>
                        <form id="forgot-form" class="auth-form">
                            <div class="form-group">
                                <label for="email">Email</label>
                                <input type="email" id="email" name="email" required placeholder="votre@email.com">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block">Envoyer le lien</button>
                        </form>
                        <div class="auth-footer">
                            <p><a href="#login">Retour a la connexion</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `);

        window.Forms?.initForgotForm?.();
    },

    // The rest of the pages (dashboard, analyze, history, analysisDetail, profile, about, contact, notFound)
    // delegate to existing controllers defined in legacy app.js when executed.
    dashboard() { window.UI && window.UI.render && window.Dashboard && window.Dashboard.init && window.Dashboard.init(); window.Dashboard && window.Dashboard; },
    analyze() { window.Analysis && window.Analysis.init && window.Analysis.init(); },
    history() { window.History && window.History.init && (window.History.init()); },
    analysisDetail(params) { window.AnalysisDetail && window.AnalysisDetail.init && window.AnalysisDetail.init(params && params[0]); },
    profile() { window.Profile && window.Profile.init && window.Profile.init(); },
    about() { window.UI && window.UI.render && window.UI.render('<div class="page"><h1>A propos</h1></div>'); },
    contact() { window.UI && window.UI.render && window.UI.render('<div class="page"><h1>Contact</h1></div>'); },
    notFound() { window.UI && window.UI.render && window.UI.render('<div class="error-page"><h1>404</h1><p>Page non trouvee</p></div>');
    }
};

// Expose for legacy code
window.Pages = Pages;

export default Pages;
