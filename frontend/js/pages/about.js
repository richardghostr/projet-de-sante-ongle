/**
 * About Page
 * Information about the service and team
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';

export const AboutPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'about-page']
    });

    // Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Page header
    const header = dom.createElement('section', {
      classes: ['page-header']
    });

    const headerContent = dom.createElement('div', {
      classes: ['page-header-content']
    });

    const title = dom.createElement('h1', {
      classes: ['page-title'],
      text: 'À propos d\'UnguealHealth'
    });

    const subtitle = dom.createElement('p', {
      classes: ['page-subtitle'],
      text: 'Révolutionner la détection des maladies ungéales grâce à l\'IA'
    });

    headerContent.appendChild(title);
    headerContent.appendChild(subtitle);
    header.appendChild(headerContent);
    container.appendChild(header);

    // About content
    const content = dom.createElement('section', {
      classes: ['content-section']
    });

    const intro = dom.createElement('div', {
      classes: ['content-block']
    });

    const introTitle = dom.createElement('h2', {
      text: 'Notre Mission'
    });

    const introText = dom.createElement('p', {
      text: 'UnguealHealth a pour mission de rendre l\'analyse des ongles accessible à tous. Grâce à la technologie de deep learning, nous offrons une solution rapide, précise et non invasive pour détecter les anomalies ungéales.'
    });

    intro.appendChild(introTitle);
    intro.appendChild(introText);
    content.appendChild(intro);

    // Technology section
    const tech = dom.createElement('div', {
      classes: ['content-block']
    });

    const techTitle = dom.createElement('h2', {
      text: 'Notre Technologie'
    });

    const techText = dom.createElement('p', {
      text: 'Nos algorithmes de machine learning ont été entraînés sur des milliers d\'images d\'ongles sains et pathologiques. Cela nous permet d\'identifier les problèmes avec une précision exceptionnelle.'
    });

    const techList = dom.createElement('ul', {
      classes: ['tech-list']
    });

    const techItems = [
      'Modèles de deep learning avancés',
      'Algorithmes de traitement d\'image haute performance',
      'Infrastructure cloud sécurisée',
      'Analyses en temps réel'
    ];

    techItems.forEach(item => {
      const li = dom.createElement('li', {
        text: item
      });
      techList.appendChild(li);
    });

    tech.appendChild(techTitle);
    tech.appendChild(techText);
    tech.appendChild(techList);
    content.appendChild(tech);

    // Team section
    const team = dom.createElement('div', {
      classes: ['content-block']
    });

    const teamTitle = dom.createElement('h2', {
      text: 'Notre Équipe'
    });

    const teamText = dom.createElement('p', {
      text: 'Composée d\'experts en médecine, en intelligence artificielle et en développement logiciel, notre équipe travaille sans relâche pour améliorer la détection des maladies ungéales.'
    });

    team.appendChild(teamTitle);
    team.appendChild(teamText);
    content.appendChild(team);

    // Values section
    const values = dom.createElement('div', {
      classes: ['content-block']
    });

    const valuesTitle = dom.createElement('h2', {
      text: 'Nos Valeurs'
    });

    const valuesGrid = dom.createElement('div', {
      classes: ['values-grid']
    });

    const valuesList = [
      {
        icon: '🎯',
        title: 'Précision',
        description: 'Résultats fiables et vérifiés'
      },
      {
        icon: '🛡️',
        title: 'Confidentialité',
        description: 'Protection maximale de vos données'
      },
      {
        icon: '⚡',
        title: 'Rapidité',
        description: 'Analyses instantanées'
      },
      {
        icon: '♿',
        title: 'Accessibilité',
        description: 'Service pour tous'
      }
    ];

    valuesList.forEach(value => {
      const card = dom.createElement('div', {
        classes: ['value-card']
      });

      const icon = dom.createElement('div', {
        classes: ['value-icon'],
        text: value.icon
      });

      const titleEl = dom.createElement('h3', {
        text: value.title
      });

      const desc = dom.createElement('p', {
        text: value.description
      });

      card.appendChild(icon);
      card.appendChild(titleEl);
      card.appendChild(desc);
      valuesGrid.appendChild(card);
    });

    values.appendChild(valuesTitle);
    values.appendChild(valuesGrid);
    content.appendChild(values);

    container.appendChild(content);

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

    footerContent.appendChild(footerText);
    footer.appendChild(footerContent);
    container.appendChild(footer);

    return container;
  }
};
