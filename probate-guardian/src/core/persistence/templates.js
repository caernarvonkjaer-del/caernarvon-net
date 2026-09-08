// Embedded official court Excel templates (.xlsx base64 strings).
import annualTemplate from '../../../templates/annual-template.js';
import simplifiedTemplate from '../../../templates/simplified-template.js';
import guardianTemplate from '../../../templates/guardian-template.js';

const TEMPLATES = {
  annual: annualTemplate,
  simplified: simplifiedTemplate,
  guardian: guardianTemplate,
};

if (typeof window !== 'undefined') {
  window.EMBEDDED_TEMPLATES = window.EMBEDDED_TEMPLATES || {};
  window.EMBEDDED_TEMPLATES.annual = annualTemplate;
  window.EMBEDDED_TEMPLATES.simplified = simplifiedTemplate;
  window.EMBEDDED_TEMPLATES.guardian = guardianTemplate;
  window.embeddedTemplate = embeddedTemplate;
}

export function embeddedTemplate(type) {
  return (
    TEMPLATES[type] ||
    (typeof window !== 'undefined' && window.EMBEDDED_TEMPLATES && window.EMBEDDED_TEMPLATES[type]) ||
    null
  );
}

export { annualTemplate, simplifiedTemplate, guardianTemplate };
