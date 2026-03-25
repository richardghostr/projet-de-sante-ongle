/**
 * Analyze Page
 * Nail analysis interface with image upload and results
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { UIComponents } from '../components/ui.js';
import { APIService } from '../services/api.js';

export const AnalyzePage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'analyze-page']
    });

    // Navigation
    const nav = NavComponent.createNav();
    container.appendChild(nav);

    // Main content
    const main = dom.createElement('main', {
      classes: ['analyze-main']
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
      text: 'Analysez vos ongles'
    });

    const subtitle = dom.createElement('p', {
      classes: ['page-subtitle'],
      text: 'Téléchargez une photo claire de vos ongles pour une analyse IA'
    });

    headerContent.appendChild(title);
    headerContent.appendChild(subtitle);
    header.appendChild(headerContent);
    main.appendChild(header);

    // Analysis container
    const analysisContainer = dom.createElement('section', {
      classes: ['analysis-container']
    });

    // Upload section
    const uploadSection = dom.createElement('div', {
      classes: ['upload-section']
    });

    const uploadBox = dom.createElement('div', {
      classes: ['upload-box'],
      attrs: { id: 'upload-box' }
    });

    const uploadIcon = dom.createElement('div', {
      classes: ['upload-icon'],
      text: '📸'
    });

    const uploadTitle = dom.createElement('p', {
      classes: ['upload-title'],
      text: 'Cliquez ou glissez-déposez une image'
    });

    const uploadHint = dom.createElement('p', {
      classes: ['upload-hint'],
      text: 'PNG, JPG ou GIF (max 10MB)'
    });

    const uploadInput = dom.createElement('input', {
      classes: ['upload-input'],
      attrs: {
        type: 'file',
        id: 'image-upload',
        accept: 'image/*',
        hidden: 'true'
      }
    });

    uploadBox.appendChild(uploadIcon);
    uploadBox.appendChild(uploadTitle);
    uploadBox.appendChild(uploadHint);
    uploadBox.appendChild(uploadInput);

    // Handle file selection
    uploadBox.addEventListener('click', () => uploadInput.click());

    uploadInput.addEventListener('change', (e) => {
      handleImageUpload(e.target.files[0]);
    });

    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
      uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadBox.classList.remove('dragover');
      handleImageUpload(e.dataTransfer.files[0]);
    });

    uploadSection.appendChild(uploadBox);
    analysisContainer.appendChild(uploadSection);

    // Preview section
    const previewSection = dom.createElement('div', {
      classes: ['preview-section', 'hidden']
    });

    const previewImage = dom.createElement('img', {
      classes: ['preview-image'],
      attrs: { id: 'preview-image', alt: 'Prévisualisation de l\'image' }
    });

    const previewControls = dom.createElement('div', {
      classes: ['preview-controls']
    });

    const changeImageBtn = dom.createElement('button', {
      classes: ['btn', 'btn-secondary'],
      attrs: { type: 'button' },
      text: 'Changer l\'image'
    });

    const analyzeBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary', 'btn-lg'],
      attrs: { type: 'button' },
      text: 'Analyser maintenant'
    });

    changeImageBtn.addEventListener('click', () => {
      uploadInput.click();
    });

    analyzeBtn.addEventListener('click', async () => {
      await performAnalysis();
    });

    previewControls.appendChild(changeImageBtn);
    previewControls.appendChild(analyzeBtn);
    previewSection.appendChild(previewImage);
    previewSection.appendChild(previewControls);

    analysisContainer.appendChild(previewSection);

    // Results section
    const resultsSection = dom.createElement('div', {
      classes: ['results-section', 'hidden']
    });

    const resultsContent = dom.createElement('div', {
      classes: ['results-content']
    });

    resultsSection.appendChild(resultsContent);
    analysisContainer.appendChild(resultsSection);

    main.appendChild(analysisContainer);
    container.appendChild(main);

    // Helper functions
    function handleImageUpload(file) {
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        UIComponents.toast('Veuillez sélectionner une image', { type: 'error' });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        UIComponents.toast('L\'image dépasse 10MB', { type: 'error' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    async function performAnalysis() {
      const imageData = previewImage.src;
      
      console.log('[v0] Starting analysis...');
      
      analyzeBtn.disabled = true;
      const spinner = UIComponents.spinner();
      previewControls.insertBefore(spinner, analyzeBtn);

      try {
        // Simulate API call to Python server
        const result = await APIService.analyzeImage(imageData);

        console.log('[v0] Analysis result:', result);

        // Display results
        displayResults(result);

        previewSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        UIComponents.toast('Analyse complétée!', { type: 'success' });
      } catch (error) {
        console.error('[v0] Analysis error:', error);
        UIComponents.toast('Erreur lors de l\'analyse', { type: 'error' });
      } finally {
        analyzeBtn.disabled = false;
        spinner.remove();
      }
    }

    function displayResults(result) {
      resultsContent.innerHTML = '';

      // Result summary
      const summary = dom.createElement('div', {
        classes: ['result-summary']
      });

      const diagnosis = dom.createElement('div', {
        classes: ['diagnosis']
      });

      const diagnosisIcon = dom.createElement('span', {
        classes: ['diagnosis-icon'],
        text: result.status === 'healthy' ? '✅' : result.status === 'warning' ? '⚠️' : '❌'
      });

      const diagnosisText = dom.createElement('div', {
        classes: ['diagnosis-text']
      });

      const diagnosisTitle = dom.createElement('h2', {
        text: result.diagnosis
      });

      const diagnosisDesc = dom.createElement('p', {
        text: result.description
      });

      diagnosisText.appendChild(diagnosisTitle);
      diagnosisText.appendChild(diagnosisDesc);
      diagnosis.appendChild(diagnosisIcon);
      diagnosis.appendChild(diagnosisText);
      summary.appendChild(diagnosis);

      // Confidence score
      const confidenceDiv = dom.createElement('div', {
        classes: ['confidence']
      });

      const confidenceLabel = dom.createElement('p', {
        text: 'Confiance du diagnostic'
      });

      const confidenceBar = UIComponents.progressBar(result.confidence, {
        label: `${result.confidence}%`
      });

      confidenceDiv.appendChild(confidenceLabel);
      confidenceDiv.appendChild(confidenceBar);
      summary.appendChild(confidenceDiv);

      resultsContent.appendChild(summary);

      // Detailed findings
      if (result.findings && result.findings.length > 0) {
        const findingsDiv = dom.createElement('div', {
          classes: ['findings']
        });

        const findingsTitle = dom.createElement('h3', {
          text: 'Résultats détaillés'
        });

        findingsDiv.appendChild(findingsTitle);

        result.findings.forEach(finding => {
          const findingCard = dom.createElement('div', {
            classes: ['finding-card']
          });

          const icon = dom.createElement('span', {
            classes: ['finding-icon'],
            text: finding.icon || '📌'
          });

          const content = dom.createElement('div', {
            classes: ['finding-content']
          });

          const name = dom.createElement('h4', {
            text: finding.name
          });

          const description = dom.createElement('p', {
            text: finding.description
          });

          content.appendChild(name);
          content.appendChild(description);
          findingCard.appendChild(icon);
          findingCard.appendChild(content);
          findingsDiv.appendChild(findingCard);
        });

        resultsContent.appendChild(findingsDiv);
      }

      // Recommendations
      if (result.recommendations && result.recommendations.length > 0) {
        const recommDiv = dom.createElement('div', {
          classes: ['recommendations']
        });

        const recommTitle = dom.createElement('h3', {
          text: 'Recommandations'
        });

        recommDiv.appendChild(recommTitle);

        result.recommendations.forEach(rec => {
          const recItem = dom.createElement('div', {
            classes: ['recommendation-item']
          });

          const icon = dom.createElement('span', {
            text: '💡'
          });

          const text = dom.createElement('p', {
            text: rec
          });

          recItem.appendChild(icon);
          recItem.appendChild(text);
          recommDiv.appendChild(recItem);
        });

        resultsContent.appendChild(recommDiv);
      }

      // Action buttons
      const actions = dom.createElement('div', {
        classes: ['result-actions']
      });

      const newAnalysisBtn = dom.createElement('button', {
        classes: ['btn', 'btn-secondary'],
        attrs: { type: 'button' },
        text: 'Nouvelle analyse'
      });

      const saveBtn = dom.createElement('button', {
        classes: ['btn', 'btn-primary'],
        attrs: { type: 'button' },
        text: 'Enregistrer le résultat'
      });

      newAnalysisBtn.addEventListener('click', () => {
        uploadSection.classList.remove('hidden');
        previewSection.classList.add('hidden');
        resultsSection.classList.add('hidden');
        previewImage.src = '';
      });

      saveBtn.addEventListener('click', () => {
        UIComponents.toast('Résultat enregistré!', { type: 'success' });
      });

      actions.appendChild(newAnalysisBtn);
      actions.appendChild(saveBtn);
      resultsContent.appendChild(actions);
    }

    return container;
  }
};
