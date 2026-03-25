/**
 * History Page
 * User's analysis history and past results
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { UIComponents } from '../components/ui.js';
import { helpers } from '../utils/helpers.js';

export const HistoryPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'history-page']
    });

    // Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Main content
    const main = dom.createElement('main', {
      classes: ['history-main']
    });

    // Header
    const header = dom.createElement('section', {
      classes: ['page-header']
    });

    const headerContent = dom.createElement('div', {
      classes: ['page-header-content']
    });

    const title = dom.createElement('h1', {
      classes: ['page-title'],
      text: 'Historique de vos analyses'
    });

    const subtitle = dom.createElement('p', {
      classes: ['page-subtitle'],
      text: 'Consultez tous vos résultats d\'analyse'
    });

    headerContent.appendChild(title);
    headerContent.appendChild(subtitle);
    header.appendChild(headerContent);
    main.appendChild(header);

    // Filters section
    const filtersSection = dom.createElement('section', {
      classes: ['filters-section']
    });

    const filterGroup = dom.createElement('div', {
      classes: ['filter-group']
    });

    // Status filter
    const statusLabel = dom.createElement('label', {
      text: 'Statut:'
    });

    const statusSelect = dom.createElement('select', {
      classes: ['filter-select']
    });

    const statusOptions = ['Tous', 'Normal', 'Attention requise', 'Critique'];
    statusOptions.forEach(opt => {
      const option = dom.createElement('option', {
        attrs: { value: opt },
        text: opt
      });
      statusSelect.appendChild(option);
    });

    filterGroup.appendChild(statusLabel);
    filterGroup.appendChild(statusSelect);

    // Date range filter
    const dateLabel = dom.createElement('label', {
      text: 'Période:'
    });

    const dateSelect = dom.createElement('select', {
      classes: ['filter-select']
    });

    const dateOptions = ['Tous', 'Cette semaine', 'Ce mois', 'Ces 3 mois', 'Cette année'];
    dateOptions.forEach(opt => {
      const option = dom.createElement('option', {
        attrs: { value: opt },
        text: opt
      });
      dateSelect.appendChild(option);
    });

    filterGroup.appendChild(dateLabel);
    filterGroup.appendChild(dateSelect);

    filtersSection.appendChild(filterGroup);
    main.appendChild(filtersSection);

    // Analysis list
    const listSection = dom.createElement('section', {
      classes: ['history-list']
    });

    const analyses = [
      {
        id: 1,
        date: '21 Mars 2024',
        time: '14:30',
        type: 'Analyse complète',
        diagnosis: 'Normal',
        confidence: 98,
        status: 'normal'
      },
      {
        id: 2,
        date: '18 Mars 2024',
        time: '10:15',
        type: 'Suivi',
        diagnosis: 'Normal',
        confidence: 95,
        status: 'normal'
      },
      {
        id: 3,
        date: '15 Mars 2024',
        time: '09:45',
        type: 'Analyse complète',
        diagnosis: 'Mycose légère',
        confidence: 87,
        status: 'warning'
      },
      {
        id: 4,
        date: '12 Mars 2024',
        time: '16:20',
        type: 'Suivi',
        diagnosis: 'Mycose légère',
        confidence: 85,
        status: 'warning'
      },
      {
        id: 5,
        date: '8 Mars 2024',
        time: '11:00',
        type: 'Analyse complète',
        diagnosis: 'Normal',
        confidence: 92,
        status: 'normal'
      }
    ];

    analyses.forEach(analysis => {
      const card = dom.createElement('div', {
        classes: ['history-card']
      });

      // Card header
      const header = dom.createElement('div', {
        classes: ['card-header']
      });

      const dateInfo = dom.createElement('div', {
        classes: ['date-info']
      });

      const date = dom.createElement('p', {
        classes: ['analysis-date'],
        text: analysis.date
      });

      const time = dom.createElement('p', {
        classes: ['analysis-time'],
        text: analysis.time
      });

      dateInfo.appendChild(date);
      dateInfo.appendChild(time);

      const typeAndDiag = dom.createElement('div', {
        classes: ['type-and-diag']
      });

      const type = dom.createElement('p', {
        classes: ['analysis-type'],
        text: analysis.type
      });

      const diagnosis = dom.createElement('p', {
        classes: ['analysis-diagnosis'],
        text: analysis.diagnosis
      });

      typeAndDiag.appendChild(type);
      typeAndDiag.appendChild(diagnosis);

      const statusBadge = UIComponents.badge(analysis.diagnosis, { 
        variant: analysis.status === 'normal' ? 'success' : 'warning'
      });

      header.appendChild(dateInfo);
      header.appendChild(typeAndDiag);
      header.appendChild(statusBadge);
      card.appendChild(header);

      // Card body
      const body = dom.createElement('div', {
        classes: ['card-body']
      });

      const confidenceLabel = dom.createElement('p', {
        classes: ['confidence-label'],
        text: 'Confiance du diagnostic'
      });

      const confidenceBar = UIComponents.progressBar(analysis.confidence);
      confidenceBar.style.marginBottom = '15px';

      body.appendChild(confidenceLabel);
      body.appendChild(confidenceBar);

      card.appendChild(body);

      // Card footer
      const footer = dom.createElement('div', {
        classes: ['card-footer']
      });

      const viewBtn = dom.createElement('a', {
        classes: ['btn', 'btn-sm', 'btn-primary'],
        attrs: { href: `#/analysis/${analysis.id}` },
        text: 'Voir les détails'
      });

      const downloadBtn = dom.createElement('button', {
        classes: ['btn', 'btn-sm', 'btn-secondary'],
        attrs: { type: 'button' },
        text: 'Télécharger'
      });

      downloadBtn.addEventListener('click', () => {
        console.log('[v0] Downloading analysis:', analysis.id);
        UIComponents.toast('Téléchargement en cours...', { type: 'info' });
      });

      footer.appendChild(viewBtn);
      footer.appendChild(downloadBtn);
      card.appendChild(footer);

      listSection.appendChild(card);
    });

    main.appendChild(listSection);

    // Pagination
    const pagination = dom.createElement('div', {
      classes: ['pagination']
    });

    const prevBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary'],
      attrs: { type: 'button' },
      text: '← Précédent'
    });

    const pageInfo = dom.createElement('span', {
      classes: ['page-info'],
      text: 'Page 1 sur 3'
    });

    const nextBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary'],
      attrs: { type: 'button' },
      text: 'Suivant →'
    });

    pagination.appendChild(prevBtn);
    pagination.appendChild(pageInfo);
    pagination.appendChild(nextBtn);
    main.appendChild(pagination);

    container.appendChild(main);

    return container;
  }
};
