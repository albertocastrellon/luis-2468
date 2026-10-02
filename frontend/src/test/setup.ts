import '@testing-library/jest-dom/vitest';
import * as React from 'react';

// Compatibilidad de pruebas para React 19.3.0 y Testing Library 16.
if (typeof React.act !== 'function') {
  Object.defineProperty(React, 'act', {
    configurable: true,
    value: async (callback: () => void | Promise<void>) => {
      await callback();
    },
  });
}
