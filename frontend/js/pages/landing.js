/**
 * Landing Page
 * Home page with product overview
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { UIComponents } from '../components/ui.js';

export const LandingPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'landing-page']
    });

    // Header/Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Hero Section
    const hero = dom.createElement('section', {
      classes: ['hero']
    });

    const heroContent = dom.createElement('div', {
      classes: ['hero-content']
    });

    const heroTitle = dom.createElement('h1', {
      classes: ['hero-title'],
      text: 'Analysez votre santé ungéale'
    });

    const heroSubtitle = dom.createElement('p', {
      classes: ['hero-subtitle'],
      text: 'Découvrez l\'état de vos ongles avec notre technologie IA avancée. Détectez les anomalies et recevez des recommandations personnalisées.'
    });

    const heroCTA = dom.createElement('div', {
      classes: ['hero-cta']
    });

    const ctaButton = dom.createElement('a', {
      classes: ['btn', 'btn-primary', 'btn-lg'],
      attrs: { href: '#/analyze' },
      text: 'Commencer l\'analyse'
    });

    const secondaryButton = dom.createElement('a', {
      classes: ['btn', 'btn-secondary', 'btn-lg'],
      attrs: { href: '#/about' },
      text: 'En savoir plus'
    });

    heroCTA.appendChild(ctaButton);
    heroCTA.appendChild(secondaryButton);

    heroContent.appendChild(heroTitle);
    heroContent.appendChild(heroSubtitle);
    heroContent.appendChild(heroCTA);
    hero.appendChild(heroContent);
    container.appendChild(hero);

    // Features Section
    const features = dom.createElement('section', {
      classes: ['features']
    });

    const featuresTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Fonctionnalités principales'
    });

    features.appendChild(featuresTitle);

    const featuresGrid = dom.createElement('div', {
      classes: ['features-grid']
    });

    const featuresList = [
      {
        icon: '🔬',
        title: 'Analyse IA Avancée',
        description: 'Technologie de deep learning pour une analyse précise et fiable'
      },
      {
        icon: '📊',
        title: 'Résultats Détaillés',
        description: 'Rapports complets avec visualisations et recommandations'
      },
      {
        icon: '📱',
        title: 'Accès Mobile',
        description: 'Analysez vos ongles depuis n\'importe où, n\'importe quand'
      },
      {
        icon: '🔒',
        title: 'Sécurité des Données',
        description: 'Vos données sont chiffrées et protégées en permanence'
      },
      {
        icon: '👨‍⚕️',
        title: 'Support Médical',
        description: 'Accès à des conseils de professionnels de santé'
      },
      {
        icon: '📈',
        title: 'Historique Complet',
        description: 'Suivez l\'évolution de votre santé ungéale dans le temps'
      }
    ];

    featuresList.forEach(feature => {
      const card = dom.createElement('div', {
        classes: ['feature-card']
      });

      const icon = dom.createElement('div', {
        classes: ['feature-icon'],
        text: feature.icon
      });

      const title = dom.createElement('h3', {
        classes: ['feature-title'],
        text: feature.title
      });

      const description = dom.createElement('p', {
        classes: ['feature-description'],
        text: feature.description
      });

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(description);
      featuresGrid.appendChild(card);
    });

    features.appendChild(featuresGrid);
    container.appendChild(features);

    // How it works Section
    const howWorks = dom.createElement('section', {
      classes: ['how-works']
    });

    const howTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Comment ça marche'
    });

    howWorks.appendChild(howTitle);

    const steps = [
      {
        number: '1',
        title: 'Prenez une photo',
        description: 'Photographiez vos ongles dans une bonne lumière'
      },
      {
        number: '2',
        title: 'IA analyse',
        description: 'Notre système analyse l\'image en temps réel'
      },
      {
        number: '3',
        title: 'Résultats',
        description: 'Recevez un rapport détaillé et personnalisé'
      }
    ];

    const stepsGrid = dom.createElement('div', {
      classes: ['steps-grid']
    });

    steps.forEach(step => {
      const stepCard = dom.createElement('div', {
        classes: ['step-card']
      });

      const stepNumber = dom.createElement('div', {
        classes: ['step-number'],
        text: step.number
      });

      const stepTitle = dom.createElement('h3', {
        classes: ['step-title'],
        text: step.title
      });

      const stepDesc = dom.createElement('p', {
        classes: ['step-description'],
        text: step.description
      });

      stepCard.appendChild(stepNumber);
      stepCard.appendChild(stepTitle);
      stepCard.appendChild(stepDesc);
      stepsGrid.appendChild(stepCard);
    });

    howWorks.appendChild(stepsGrid);
    container.appendChild(howWorks);

    // CTA Section
    const ctaSection = dom.createElement('section', {
      classes: ['cta-section']
    });

    const ctaSectionContent = dom.createElement('div', {
      classes: ['cta-content']
    });

    const ctaSectionTitle = dom.createElement('h2', {
      classes: ['cta-title'],
      text: 'Prêt à prendre soin de vos ongles ?'
    });

    const ctaSectionText = dom.createElement('p', {
      classes: ['cta-text'],
      text: 'Inscrivez-vous dès maintenant et découvrez l\'état de votre santé ungéale'
    });

    const ctaSectionButton = dom.createElement('a', {
      classes: ['btn', 'btn-primary', 'btn-lg'],
      attrs: { href: '#/register' },
      text: 'S\'inscrire gratuitement'
    });

    ctaSectionContent.appendChild(ctaSectionTitle);
    ctaSectionContent.appendChild(ctaSectionText);
    ctaSectionContent.appendChild(ctaSectionButton);
    ctaSection.appendChild(ctaSectionContent);
    container.appendChild(ctaSection);

    // Footer
    const footer = dom.createElement('footer', {
      classes: ['footer']
    });

    const footerContent = dom.createElement('div', {
      classes: ['footer-content']
    });

    const footerText = dom.createElement('p', {
      text: '© 2024 UnguealHealth. Tous droits réservés.'
    });

    const footerLinks = dom.createElement('div', {
      classes: ['footer-links']
    });

    const links = [
      { href: '#/about', label: 'À propos' },
      { href: '#/contact', label: 'Contact' },
      { href: '#/privacy', label: 'Politique de confidentialité' },
      { href: '#/terms', label: 'Conditions d\'utilisation' }
    ];

    links.forEach(link => {
      const a = dom.createElement('a', {
        attrs: { href: link.href },
        text: link.label
      });
      footerLinks.appendChild(a);
    });

    footerContent.appendChild(footerText);
    footerContent.appendChild(footerLinks);
    footer.appendChild(footerContent);
    container.appendChild(footer);

    return container;
  }
};
