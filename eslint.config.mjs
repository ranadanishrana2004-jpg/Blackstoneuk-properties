import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts', 'app/chatgpt-auth.ts', 'node_modules/**']),
  {
    rules: {
      // Property photos are served from our own database or arbitrary HTTPS hosts, so the
      // next/image optimiser (which needs an allow-list) is not used for them.
      '@next/next/no-img-element': 'off',
      // Typographic apostrophes in marketing copy are intentional.
      'react/no-unescaped-entities': 'off',
      // Syncing UI state from browser APIs on mount is deliberate in these components.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['components/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'react-hooks/purity': 'off',
    },
  },
]);
