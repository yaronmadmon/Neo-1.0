import type { LayoutConfig, PageType } from '../../types.js';

export class LayoutEngine {
  layoutForPage(type: PageType): LayoutConfig {
    if (type === 'dashboard') {
      return {
        type: 'dashboard-grid',
        sections: [
          { id: 'header', type: 'header', components: ['page-title'] },
          { id: 'main', type: 'grid', components: ['dashboard-widgets'] },
        ],
      };
    }

    if (type === 'form') {
      return {
        type: 'single-column',
        sections: [
          { id: 'header', type: 'header', components: ['page-title', 'back-button'] },
          { id: 'main', type: 'main', components: ['form-body'] },
        ],
      };
    }

    return {
      type: 'single-column',
      sections: [
        { id: 'header', type: 'header', components: ['page-title', 'primary-actions'] },
        { id: 'main', type: 'main', components: ['main-content'] },
      ],
    };
  }
}
