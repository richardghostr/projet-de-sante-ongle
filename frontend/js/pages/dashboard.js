/**
 * Dashboard Page
 * Main user dashboard with stats and recent analyses
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { UIComponents } from '../components/ui.js';
import { helpers } from '../utils/helpers.js';

export const DashboardPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'dashboard-page']
    });

    // Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Main content
    const main = dom.createElement('main', {
      classes: ['dashboard-main']
    });

    // Header section
    const headerSection = dom.createElement('section', {
      classes: ['dashboard-header']
    });

    const welcomeText = dom.createElement('div', {
      classes: ['welcome-text']
    });

    const greeting = dom.createElement('h1', {
      classes: ['welcome-title'],
      text: 'Bienvenue, Jean Dupont!'
    });

    const subtitle = dom.createElement('p', {
      classes: ['welcome-subtitle'],
      text: 'Voici votre tableau de bord de santé ungéale'
    });

    welcomeText.appendChild(greeting);
    welcomeText.appendChild(subtitle);
    headerSection.appendChild(welcomeText);

    // Quick action buttons
    const quickActions = dom.createElement('div', {
      classes: ['quick-actions']
    });

    const analyzeBtn = dom.createElement('a', {
      classes: ['btn', 'btn-primary'],
      attrs: { href: '#/analyze' },
      text: '📸 Nouvelle analyse'
    });

    const historyBtn = dom.createElement('a', {
      classes: ['btn', 'btn-secondary'],
      attrs: { href: '#/history' },
      text: '📜 Voir l\'historique'
    });

    quickActions.appendChild(analyzeBtn);
    quickActions.appendChild(historyBtn);
    headerSection.appendChild(quickActions);

    main.appendChild(headerSection);

    // Stats section
    const statsSection = dom.createElement('section', {
      classes: ['dashboard-stats']
    });

    const statsTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Vos statistiques'
    });

    statsSection.appendChild(statsTitle);

    const statsGrid = dom.createElement('div', {
      classes: ['stats-grid']
    });

    const stats = [
      {
        label: 'Analyses complétées',
        value: '12',
        icon: '📊',
        change: '+2 cette semaine'
      },
      {
        label: 'Santé générale',
        value: '95%',
        icon: '💚',
        change: 'Excellent'
      },
      {
        label: 'Dernière analyse',
        value: 'Il y a 3 jours',
        icon: '📅',
        change: 'Mardi 21 mars'
      },
      {
        label: 'Tendance',
        value: 'Stable',
        icon: '📈',
        change: 'Sans changement'
      }
    ];

    stats.forEach(stat => {
      const statCard = dom.createElement('div', {
        classes: ['stat-card']
      });

      const icon = dom.createElement('span', {
        classes: ['stat-icon'],
        text: stat.icon
      });

      const content = dom.createElement('div', {
        classes: ['stat-content']
      });

      const label = dom.createElement('p', {
        classes: ['stat-label'],
        text: stat.label
      });

      const value = dom.createElement('p', {
        classes: ['stat-value'],
        text: stat.value
      });

      const change = dom.createElement('p', {
        classes: ['stat-change'],
        text: stat.change
      });

      content.appendChild(label);
      content.appendChild(value);
      content.appendChild(change);
      statCard.appendChild(icon);
      statCard.appendChild(content);
      statsGrid.appendChild(statCard);
    });

    statsSection.appendChild(statsGrid);
    main.appendChild(statsSection);

    // Recent analyses section
    const recentSection = dom.createElement('section', {
      classes: ['dashboard-recent']
    });

    const recentTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Analyses récentes'
    });

    recentSection.appendChild(recentTitle);

    const analysisTable = dom.createElement('div', {
      classes: ['analysis-table']
    });

    // Table header
    const tableHeader = dom.createElement('div', {
      classes: ['table-header']
    });

    const headerCells = ['Date', 'Type', 'Résultat', 'Statut', 'Action'];
    headerCells.forEach(cell => {
      const th = dom.createElement('div', {
        classes: ['table-cell'],
        text: cell
      });
      tableHeader.appendChild(th);
    });

    analysisTable.appendChild(tableHeader);

    // Table rows
    const recentAnalyses = [
      {
        date: '21 Mars 2024',
        type: 'Analyse complète',
        result: 'Normal',
        status: 'Complétée'
      },
      {
        date: '18 Mars 2024',
        type: 'Suivi',
        result: 'Normal',
        status: 'Complétée'
      },
      {
        date: '15 Mars 2024',
        type: 'Analyse complète',
        result: 'Normal',
        status: 'Complétée'
      }
    ];

    recentAnalyses.forEach(analysis => {
      const row = dom.createElement('div', {
        classes: ['table-row']
      });

      const dateCell = dom.createElement('div', {
        classes: ['table-cell'],
        text: analysis.date
      });

      const typeCell = dom.createElement('div', {
        classes: ['table-cell'],
        text: analysis.type
      });

      const resultCell = dom.createElement('div', {
        classes: ['table-cell'],
        text: analysis.result
      });

      const statusCell = dom.createElement('div', {
        classes: ['table-cell']
      });

      const statusBadge = UIComponents.badge(analysis.status, { variant: 'success' });
      statusCell.appendChild(statusBadge);

      const actionCell = dom.createElement('div', {
        classes: ['table-cell']
      });

      const actionBtn = dom.createElement('a', {
        classes: ['btn', 'btn-sm', 'btn-tertiary'],
        attrs: { href: '#/analysis/1' },
        text: 'Voir'
      });

      actionCell.appendChild(actionBtn);

      row.appendChild(dateCell);
      row.appendChild(typeCell);
      row.appendChild(resultCell);
      row.appendChild(statusCell);
      row.appendChild(actionCell);
      analysisTable.appendChild(row);
    });

    recentSection.appendChild(analysisTable);

    // View all button
    const viewAllBtn = dom.createElement('a', {
      classes: ['btn', 'btn-secondary', 'btn-block'],
      attrs: { href: '#/history' },
      text: 'Voir toutes les analyses'
    });

    recentSection.appendChild(viewAllBtn);
    main.appendChild(recentSection);

    // Recommendations section
    const recommendSection = dom.createElement('section', {
      classes: ['dashboard-recommendations']
    });

    const recommendTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Recommandations'
    });

    recommendSection.appendChild(recommendTitle);

    const recommendations = [
      {
        icon: '✅',
        title: 'Maintenez votre routine',
        description: 'Vos ongles vont bien. Continuez votre routine de soins habituelle.'
      },
      {
        icon: '💡',
        title: 'Analysez régulièrement',
        description: 'Faites une analyse toutes les 2 semaines pour un suivi optimal.'
      }
    ];

    const recommendGrid = dom.createElement('div', {
      classes: ['recommend-grid']
    });

    recommendations.forEach(rec => {
      const card = dom.createElement('div', {
        classes: ['recommend-card']
      });

      const icon = dom.createElement('span', {
        classes: ['recommend-icon'],
        text: rec.icon
      });

      const title = dom.createElement('h3', {
        classes: ['recommend-title'],
        text: rec.title
      });

      const desc = dom.createElement('p', {
        classes: ['recommend-description'],
        text: rec.description
      });

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(desc);
      recommendGrid.appendChild(card);
    });

    recommendSection.appendChild(recommendGrid);
    main.appendChild(recommendSection);

    container.appendChild(main);

    return container;
  }
};
