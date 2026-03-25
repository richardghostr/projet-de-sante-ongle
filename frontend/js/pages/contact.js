/**
 * Contact Page
 * Contact form and information
 */

import { dom } from '../utils/dom.js';
import { NavComponent } from '../components/nav.js';
import { FormComponents } from '../components/forms.js';
import { UIComponents } from '../components/ui.js';

export const ContactPage = {
  render() {
    const container = dom.createElement('div', {
      classes: ['page', 'contact-page']
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
      text: 'Nous Contacter'
    });

    const subtitle = dom.createElement('p', {
      classes: ['page-subtitle'],
      text: 'Des questions ? Nous sommes là pour vous aider'
    });

    headerContent.appendChild(title);
    headerContent.appendChild(subtitle);
    header.appendChild(headerContent);
    container.appendChild(header);

    // Contact content
    const content = dom.createElement('section', {
      classes: ['content-section']
    });

    const contentWrapper = dom.createElement('div', {
      classes: ['contact-wrapper']
    });

    // Contact info
    const infoColumn = dom.createElement('div', {
      classes: ['contact-info']
    });

    const infoTitle = dom.createElement('h2', {
      text: 'Informations de Contact'
    });

    const contactItems = [
      {
        icon: '📧',
        label: 'Email',
        value: 'contact@unguealhealth.com'
      },
      {
        icon: '📱',
        label: 'Téléphone',
        value: '+33 1 23 45 67 89'
      },
      {
        icon: '📍',
        label: 'Adresse',
        value: '123 Rue de la Santé, 75000 Paris'
      },
      {
        icon: '🕐',
        label: 'Horaires',
        value: 'Lun-Ven: 9h-17h | Sam-Dim: Fermé'
      }
    ];

    infoColumn.appendChild(infoTitle);

    contactItems.forEach(item => {
      const itemDiv = dom.createElement('div', {
        classes: ['contact-item']
      });

      const icon = dom.createElement('span', {
        classes: ['contact-icon'],
        text: item.icon
      });

      const details = dom.createElement('div', {
        classes: ['contact-details']
      });

      const label = dom.createElement('p', {
        classes: ['contact-label'],
        text: item.label
      });

      const value = dom.createElement('p', {
        classes: ['contact-value'],
        text: item.value
      });

      details.appendChild(label);
      details.appendChild(value);
      itemDiv.appendChild(icon);
      itemDiv.appendChild(details);
      infoColumn.appendChild(itemDiv);
    });

    contentWrapper.appendChild(infoColumn);

    // Contact form
    const formColumn = dom.createElement('div', {
      classes: ['contact-form-wrapper']
    });

    const formTitle = dom.createElement('h2', {
      text: 'Envoyez-nous un message'
    });

    const form = dom.createElement('form', {
      classes: ['contact-form'],
      attrs: { id: 'contact-form' }
    });

    // Name field
    const nameField = FormComponents.formGroup({
      id: 'name',
      label: 'Nom complet',
      placeholder: 'Jean Dupont',
      required: true
    });

    // Email field
    const emailField = FormComponents.formGroup({
      id: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'jean@example.com',
      required: true
    });

    // Subject field
    const subjectField = FormComponents.formGroup({
      id: 'subject',
      label: 'Sujet',
      placeholder: 'Votre sujet',
      required: true
    });

    // Message field
    const messageField = FormComponents.textarea({
      id: 'message',
      label: 'Message',
      placeholder: 'Écrivez votre message ici...',
      required: true,
      rows: 5
    });

    // Submit button
    const submitBtn = dom.createElement('button', {
      classes: ['btn', 'btn-primary', 'btn-block'],
      attrs: { type: 'submit' },
      text: 'Envoyer le message'
    });

    form.appendChild(nameField);
    form.appendChild(emailField);
    form.appendChild(subjectField);
    form.appendChild(messageField);
    form.appendChild(submitBtn);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // Handle form submission
      const nameValue = nameField.input.value;
      const emailValue = emailField.input.value;
      const subjectValue = subjectField.input.value;
      const messageValue = messageField.input.value;

      // Simulate API call
      console.log('[v0] Contact form submitted:', {
        name: nameValue,
        email: emailValue,
        subject: subjectValue,
        message: messageValue
      });

      UIComponents.toast('Message envoyé avec succès!', { type: 'success' });
      form.reset();
    });

    formColumn.appendChild(formTitle);
    formColumn.appendChild(form);
    contentWrapper.appendChild(formColumn);

    content.appendChild(contentWrapper);
    container.appendChild(content);

    // FAQ Section
    const faqSection = dom.createElement('section', {
      classes: ['faq-section']
    });

    const faqTitle = dom.createElement('h2', {
      classes: ['section-title'],
      text: 'Questions Fréquemment Posées'
    });

    faqSection.appendChild(faqTitle);

    const faqList = dom.createElement('div', {
      classes: ['faq-list']
    });

    const faqs = [
      {
        question: 'Combien de temps prend une analyse?',
        answer: 'Une analyse prend généralement 2-3 minutes après le téléchargement de la photo.'
      },
      {
        question: 'Mes données sont-elles sécurisées?',
        answer: 'Oui, toutes vos données sont chiffrées et stockées de manière sécurisée. Nous respectons les normes HIPAA et RGPD.'
      },
      {
        question: 'Puis-je analyser plusieurs photos?',
        answer: 'Oui, vous pouvez analyser autant de photos que vous le souhaitez. Votre historique sera conservé pour un suivi continu.'
      }
    ];

    faqs.forEach((faq, index) => {
      const faqItem = dom.createElement('div', {
        classes: ['faq-item']
      });

      const question = dom.createElement('button', {
        classes: ['faq-question'],
        attrs: { type: 'button' },
        text: faq.question
      });

      const answer = dom.createElement('div', {
        classes: ['faq-answer'],
        text: faq.answer
      });

      question.addEventListener('click', () => {
        answer.classList.toggle('show');
      });

      faqItem.appendChild(question);
      faqItem.appendChild(answer);
      faqList.appendChild(faqItem);
    });

    faqSection.appendChild(faqList);
    container.appendChild(faqSection);

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
